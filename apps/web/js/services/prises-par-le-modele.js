/**
 * Demander le relevé d'un fil, et rendre ce qui a franchi la porte.
 *
 * ## Ce module ne lit rien
 *
 * Le relevé se passe entièrement au serveur
 * (`supabase/functions/relever-un-fil`). Ce module **demande** et **reçoit** :
 * il ne porte pas la consigne, il ne voit pas la clé du modèle, et il ne
 * refait pas la vérification des citations — ce qui n'a pas été cité n'est
 * jamais descendu jusqu'ici.
 *
 * ## Ce qui monte, et ce qui ne monte pas
 *
 * **Le propos de chaque message, une fois.** Pas les citations qu'il recopie
 * (étape 2), pas les messages en double (étape 3), pas les en-têtes, pas les
 * adresses des destinataires, pas les pièces jointes. Un fil de correspondance
 * privée ne monte que réduit à ce qu'on veut en relever.
 *
 * L'auteur et la date montent, eux : sans eux le modèle ne comprend pas qui
 * répond à qui. Mais on ne les lui **demande** pas en retour — ils sont déjà
 * connus, et une seconde source finirait par contredire la première (règle 4).
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

const URL_DE_LA_FONCTION = `${getSupabaseUrl()}/functions/v1/relever-un-fil`;

const texte = (valeur) => String(valeur ?? "").trim();

/** Pourquoi le relevé n'a pas eu lieu. Nommés : un écran doit pouvoir le dire. */
export const REFUS = {
  /** Le fil ne porte aucun texte à relever. */
  SANS_TEXTE: "sans-texte",
  /** Le serveur n'a pas répondu. */
  INJOIGNABLE: "injoignable",
  /** Le serveur a répondu qu'il ne pouvait pas. */
  REFUSE: "refuse",
  /**
   * Le relevé n'a pas tenu dans le temps imparti.
   *
   * Ce n'est pas un refus, et les confondre envoie chercher ce qui n'existe
   * pas : un refus a une cause nommée, un dépassement n'en a aucune.
   */
  TROP_LONG: "trop-long",
  /** Il a répondu, et rien de ce qu'il a relevé ne se retrouve dans le fil. */
  RIEN_DE_VERIFIE: "rien-de-verifie"
};

export const PHRASES_DU_REFUS = {
  [REFUS.SANS_TEXTE]: "ce fil ne porte aucun texte à relever",
  [REFUS.INJOIGNABLE]: "le relevé n'a pas pu être demandé",
  [REFUS.REFUSE]: "le relevé a été refusé",
  [REFUS.TROP_LONG]: "le relevé a dépassé le temps imparti",
  [REFUS.RIEN_DE_VERIFIE]: "rien de ce qui a été relevé ne se retrouve dans le fil"
};

export function phraseDuRefus(motif) {
  return PHRASES_DU_REFUS[texte(motif)] ?? "";
}

/**
 * Ce qu'il y a à faire, quand il y a quelque chose à faire.
 *
 * Deux phrases, pas une : la première dit ce qui s'est passé, la seconde ce
 * qu'on peut en faire. Une panne sans suite à donner n'en reçoit pas
 * d'inventée (règle 5).
 */
export const QUE_FAIRE = {
  [REFUS.TROP_LONG]:
    "Le modèle n'a pas fini dans le temps imparti. Un fil plus court passe ; le même, "
    + "relu, peut passer aussi — la durée d'un relevé n'est pas la même deux fois.",
  [REFUS.INJOIGNABLE]:
    "La fonction de relevé n'a pas répondu. Elle est peut-être en cours de déploiement.",
  [REFUS.RIEN_DE_VERIFIE]:
    "Le modèle a répondu, mais aucune de ses citations ne se retrouve dans les messages. "
    + "Le fil affiché, lui, reste juste : il n'a rien coûté et il ne dépend pas de ce relevé.",
  [REFUS.SANS_TEXTE]:
    "Les messages de ce fil ne portent que des citations, ou rien du tout. Il n'y a pas de "
    + "propos à relever."
};

export function queFaire(motif) {
  return QUE_FAIRE[texte(motif)] ?? "";
}

/**
 * Ce que le serveur a nommé de la panne, s'il l'a nommée.
 *
 * Trois champs nommés, coupés court — **jamais le corps de l'erreur**, qui peut
 * contenir un écho de la consigne.
 */
function panneLue(rendu, statutHttp) {
  const panne = rendu?.panne ?? null;
  const morceaux = [
    `HTTP ${Number(statutHttp) || panne?.status || 0}`,
    texte(panne?.type),
    texte(panne?.code),
    texte(panne?.message)
  ].filter(Boolean);

  return morceaux.length > 1 ? morceaux.join(" · ") : "";
}

/**
 * Les codes qui disent « on a cessé d'attendre », et non « je refuse ».
 *
 * `408` vient du serveur, `504` et `524` d'une passerelle. Aucun ne porte de
 * cause : l'afficher comme un refus muet fait chercher un problème ailleurs.
 */
const DELAIS_DEPASSES = new Set([408, 504, 524]);

/** Ce qu'un code de réponse dit du relevé. */
export function motifDuStatut(statut = 0) {
  const code = Number(statut) || 0;
  if (code === 404) return REFUS.INJOIGNABLE;
  if (DELAIS_DEPASSES.has(code)) return REFUS.TROP_LONG;
  return REFUS.REFUSE;
}

/**
 * Ce qu'un message devient pour le relevé : son rang, son propos, son auteur.
 *
 * **Et rien de plus.** Les destinataires, les adresses, les pièces jointes et
 * les citations restent au navigateur : le relevé n'en a pas besoin, et de la
 * correspondance privée qui monte sans servir est de la correspondance privée
 * qui monte pour rien.
 */
export function messagesAEnvoyer(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .filter((message) => texte(message?.propos))
    .map((message) => ({
      rang: Number(message?.rang) || 0,
      propos: texte(message.propos),
      qui: texte(message?.qui?.nom) || texte(message?.qui?.adresse) || "",
      quand: texte(message?.quand) || texte(message?.quandTexte) || ""
    }));
}

async function projetCourant() {
  try {
    const { resolveCurrentBackendProjectId } = await import("./project-supabase-sync.js");
    return (await resolveCurrentBackendProjectId()) || null;
  } catch {
    // Un relevé reste possible sans savoir où l'on est : sa consommation se
    // range alors hors projet plutôt que d'être attribuée au hasard.
    return null;
  }
}

/**
 * Relever un fil, une fois.
 *
 * @returns {Promise<{ok: true, prises: object[], ecartees: number,
 *   lesEcartees: object[], muets: number[]|null, oublies: number[]|null}
 *   |{ok: false, motif: string}>}
 */
export async function releverLeFil({ filId = "", messages = [] } = {}) {
  const aEnvoyer = messagesAEnvoyer(messages);
  if (!aEnvoyer.length) return { ok: false, motif: REFUS.SANS_TEXTE, panne: "", coupee: false };

  let reponse = null;
  try {
    reponse = await fetch(URL_DE_LA_FONCTION, {
      method: "POST",
      headers: await buildSupabaseAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        project_id: await projetCourant(),
        fil_id: texte(filId),
        messages: aEnvoyer
      })
    });
  } catch {
    return { ok: false, motif: REFUS.INJOIGNABLE, panne: "", coupee: false };
  }

  if (!reponse.ok) {
    const refuse = await reponse.json().catch(() => null);
    return {
      ok: false,
      motif: motifDuStatut(reponse.status),
      // Ce que le serveur a nommé. Vide quand il n'a rien nommé : on n'invente
      // pas une explication vraisemblable (règle 5).
      panne: panneLue(refuse, reponse.status),
      coupee: Boolean(refuse?.coupee)
    };
  }

  const rendu = await reponse.json().catch(() => null);
  const prises = Array.isArray(rendu?.prises) ? rendu.prises : [];

  // **Le compte se dérive de la liste, il ne s'écrit pas à côté d'elle.** Deux
  // nombres qui disent la même chose finissent par ne plus la dire (règle 4).
  const lesEcartees = Array.isArray(rendu?.ecartees) ? rendu.ecartees : [];
  const ecartees = lesEcartees.length;

  // **Aucune prise retenue, alors que le modèle en a rendu, n'est pas « rien à
  // relever ».** C'est un relevé qui n'a rien su citer, et cela se répare
  // autrement qu'un fil qui ne porte rien.
  if (!prises.length && ecartees > 0) {
    return { ok: false, motif: REFUS.RIEN_DE_VERIFIE, panne: "", coupee: Boolean(rendu?.coupee) };
  }

  return {
    ok: true,
    prises,
    /** Ce que le serveur a jeté faute de citation vérifiable. Se dit, se compte. */
    ecartees,
    /**
     * Et **ce que c'était** : intitulé, citation refusée, message visé.
     *
     * Sans cela, un compte seul ne dit pas si la porte a protégé — des
     * inventions jetées — ou si elle a jeté des prises réelles mal recopiées.
     * Ce sont deux défauts opposés, qui ne se règlent pas dans le même sens.
     */
    lesEcartees,
    /**
     * Les messages dont le modèle déclare ne rien tirer, et ceux dont il n'a
     * rien dit du tout.
     *
     * `null` quand sa réponse n'a pas rendu compte message par message : on ne
     * transforme pas une ignorance en zéro (règle 5).
     */
    muets: Array.isArray(rendu?.messages_muets) ? rendu.messages_muets : null,
    oublies: Array.isArray(rendu?.messages_oublies) ? rendu.messages_oublies : null,
    /** Combien de prises ont changé de message — donc d'auteur. */
    messagesCorriges: Number(rendu?.messages_corriges) || 0,
    /** La réponse a-t-elle été coupée ? Des prises manquent alors, en silence. */
    coupee: Boolean(rendu?.coupee),
    modele: texte(rendu?.modele),
    /**
     * Ce que ce relevé-ci a consommé, pour que son prix s'affiche à côté de
     * lui. `null` quand le fournisseur n'a rien décompté : « coût non annoncé »
     * n'est pas « gratuit » (règle 5).
     */
    entree: Number.isFinite(rendu?.jetons?.entree) ? rendu.jetons.entree : null,
    sortie: Number.isFinite(rendu?.jetons?.sortie) ? rendu.jetons.sortie : null,
    dureeMs: Number(rendu?.duree_ms) || 0
  };
}
