/**
 * Demander au serveur de lire un compte rendu de chantier, et n'en garder que
 * ce qui est vérifié.
 *
 * ## Ce que ce fichier ne fait pas, et c'est le principal
 *
 * Il ne lit rien. Il ne porte ni consigne de lecture, ni clé, ni modèle : la
 * lecture se passe entièrement au serveur (`supabase/functions/extract-sujets`),
 * et le navigateur n'envoie que des pages. Ce qui revient a déjà été confronté
 * au document — un point dont la citation ne s'y retrouve pas n'a jamais quitté
 * le serveur.
 *
 * ## Il ne crée aucun sujet, et il ne le fera jamais
 *
 * Ce qu'il rend est une **proposition** de sujets. Ouvrir un sujet engage
 * quelqu'un à le traiter : c'est une décision, et une décision se prend par une
 * proposition, jamais par un dépôt de fichier (règle 1). C'est précisément ce
 * que l'ancienne pipeline faisait et ce pour quoi elle s'en va.
 *
 * ## Pourquoi il refuse plutôt que de se rabattre en silence
 *
 * Quand l'appel échoue, ce fichier rend un motif nommé et **rien d'autre**. Il
 * n'existe pas de lecture en dur d'un compte rendu vers laquelle se rabattre, et
 * rendre une liste vide ferait croire qu'un compte rendu ne porte aucun point —
 * ce qui n'est jamais vrai (règle 5).
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

/**
 * Le projet où l'on se trouve, pour le compteur de consommation.
 *
 * Résolu ici plutôt que passé de main en main : il traverserait sinon quatre
 * signatures qui n'en ont aucun usage, et chacune pourrait l'oublier en chemin
 * sans que rien ne le dise.
 *
 * **L'identifiant de la base, pas celui de la route.** Passer le second
 * rattacherait la consommation à un projet qui n'existe pas côté base.
 */
async function projetCourant() {
  try {
    const { resolveCurrentBackendProjectId } = await import("./project-supabase-sync.js");
    return (await resolveCurrentBackendProjectId()) || null;
  } catch {
    // Une lecture reste possible sans savoir où l'on est.
    return null;
  }
}

const URL_DE_LA_FONCTION = `${getSupabaseUrl()}/functions/v1/extract-sujets`;

const texte = (valeur) => String(valeur ?? "").trim();

/** Pourquoi la lecture n'a pas eu lieu. Nommés : un écran doit pouvoir le dire. */
export const REFUS = {
  /** Le document ne porte aucun texte à lire. */
  SANS_TEXTE: "sans-texte",
  /** Le serveur n'a pas répondu. */
  INJOIGNABLE: "injoignable",
  /** Le serveur a répondu qu'il ne pouvait pas. */
  REFUSE: "refuse",
  /**
   * La lecture n'a pas tenu dans le temps imparti.
   *
   * **Ce n'est pas un refus, et les confondre envoie chercher ce qui n'existe
   * pas.** Un refus a une cause nommée — une clé expirée, un schéma invalide —
   * et l'écran affichait « le serveur n'a rien nommé de cette panne » sur une
   * passerelle qui n'a rien à nommer : elle a simplement cessé d'attendre.
   *
   * Un dépassement se corrige autrement : un document plus court, ou une
   * lecture qui rend moins. Le dire permet de le savoir.
   */
  TROP_LONG: "trop-long",
  /** Il a répondu, et rien de ce qu'il a lu ne se retrouve dans le document. */
  RIEN_DE_VERIFIE: "rien-de-verifie"
};

/**
 * Ce que le serveur a nommé de la panne, s'il l'a nommée.
 *
 * **Pour qu'on puisse la coller quelque part.** « La lecture a été refusée » ne
 * dit rien : ni à qui la lit, ni à qui doit la réparer. Le document était-il
 * trop long, le modèle absent, la clé expirée, le schéma invalide ? Quatre
 * pannes, une seule phrase, et chacune se corrige autrement.
 *
 * Trois champs nommés, coupés court — jamais le corps de l'erreur, qui peut
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

export const PHRASES_DU_REFUS = {
  [REFUS.SANS_TEXTE]: "ce compte rendu ne porte aucun texte à lire",
  [REFUS.INJOIGNABLE]: "la lecture n'a pas pu être demandée",
  [REFUS.REFUSE]: "la lecture a été refusée",
  [REFUS.TROP_LONG]: "la lecture a dépassé le temps imparti",
  [REFUS.RIEN_DE_VERIFIE]: "rien de ce qui a été lu ne se retrouve dans le compte rendu"
};

export function phraseDuRefus(motif) {
  return PHRASES_DU_REFUS[texte(motif)] ?? "";
}

/**
 * Ce qu'il y a à faire, quand il y a quelque chose à faire.
 *
 * **Deux phrases, pas une.** La première dit ce qui s'est passé, la seconde ce
 * qu'on peut en faire. Les mêler donnerait un paragraphe qu'on ne relit pas ; et
 * une panne sans suite à donner n'en reçoit pas d'inventée (règle 5).
 */
export const QUE_FAIRE = {
  [REFUS.TROP_LONG]:
    "Le modèle n'a pas fini dans le temps imparti. Un compte rendu plus court passe ; "
    + "le même, relu, peut passer aussi — la durée d'une lecture n'est pas la même deux fois.",
  [REFUS.INJOIGNABLE]:
    "La fonction de lecture n'a pas répondu. Elle est peut-être en cours de déploiement.",
  [REFUS.SANS_TEXTE]:
    "Ce PDF ne porte que des images. Il faut d'abord le passer par la reconnaissance."
};

export function queFaire(motif) {
  return QUE_FAIRE[texte(motif)] ?? "";
}

/**
 * Les codes qui disent « on a cessé d'attendre », et non « je refuse ».
 *
 * `408` vient du serveur lui-même, `504` et `524` d'une passerelle entre les
 * deux. Aucun des trois ne porte de cause : il n'y a rien à nommer, et
 * l'afficher comme un refus muet fait chercher un problème ailleurs.
 */
const DELAIS_DEPASSES = new Set([408, 504, 524]);

/** Ce qu'un code de réponse dit de la lecture. */
export function motifDuStatut(statut = 0) {
  const code = Number(statut) || 0;
  if (code === 404) return REFUS.INJOIGNABLE;
  if (DELAIS_DEPASSES.has(code)) return REFUS.TROP_LONG;
  return REFUS.REFUSE;
}

/**
 * Lire un compte rendu, une fois.
 *
 * @param {object} options
 * @param {string} options.sourceId le document du lot
 * @param {object[]} options.pages `{page, text}` — ce qu'on lui donne à lire
 * @returns {Promise<{ok: true, sujets: object[], ecartes: number}|{ok: false, motif: string}>}
 */
export async function lireLesSujets({ sourceId = "", pages = [], sujetsDuProjet = null } = {}) {
  const lisibles = (Array.isArray(pages) ? pages : []).filter((page) => texte(page?.text ?? page?.texte));
  if (!lisibles.length) return { ok: false, motif: REFUS.SANS_TEXTE };

  let reponse = null;
  try {
    reponse = await fetch(URL_DE_LA_FONCTION, {
      method: "POST",
      headers: await buildSupabaseAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        // **Le projet ne sert qu'au compteur de consommation**, jamais à la
        // lecture : le serveur ne voit que des pages. On l'envoie donc quand on
        // le connaît, et son absence range l'appel hors projet plutôt que de
        // l'attribuer au hasard.
        project_id: await projetCourant(),
        source_id: texte(sourceId),
        /**
         * Ce que le projet suit déjà, pour que le modèle reconnaisse un point
         * reporté.
         *
         * **`null` n'est pas une liste vide.** Ne pas avoir pu lire les sujets
         * du projet n'autorise pas à dire au modèle que le projet ne suit rien
         * (règle 5) : on ne lui envoie alors rien, il ne rapproche rien, et
         * tous les points repartent neufs — l'erreur la moins coûteuse.
         */
        ...(Array.isArray(sujetsDuProjet) ? { sujets_du_projet: sujetsDuProjet } : {}),
        pages: lisibles.map((page) => ({ page: Number(page?.page), text: texte(page?.text ?? page?.texte) }))
      })
    });
  } catch {
    return { ok: false, motif: REFUS.INJOIGNABLE };
  }

  if (!reponse.ok) {
    const refuse = await reponse.json().catch(() => null);
    return {
      ok: false,
      motif: motifDuStatut(reponse.status),
      // Ce que le serveur a nommé de la panne. Vide quand il n'a rien nommé :
      // on n'invente pas une explication vraisemblable (règle 5).
      panne: panneLue(refuse, reponse.status),
      coupee: Boolean(refuse?.coupee)
    };
  }

  const rendu = await reponse.json().catch(() => null);
  const sujets = Array.isArray(rendu?.sujets) ? rendu.sujets : [];
  if (!sujets.length) return { ok: false, motif: REFUS.RIEN_DE_VERIFIE, panne: "", coupee: false };

  return {
    ok: true,
    sujets,
    // Qui le compte rendu nomme. Une liste vide est une réponse : un compte
    // rendu qui ne nomme personne existe, et il ne faut pas le confondre avec
    // un serveur qui n'aurait rien rendu.
    intervenants: Array.isArray(rendu?.intervenants) ? rendu.intervenants : [],
    /**
     * Sous quels titres le document range ses points.
     *
     * Une liste vide est une réponse : un compte rendu écrit d'un seul tenant
     * existe, et il ne faut pas le confondre avec un serveur qui n'aurait rien
     * rendu — le second se répare, le premier se lit tel quel.
     */
    rubriques: Array.isArray(rendu?.rubriques) ? rendu.rubriques : [],
    /** Combien de points visaient une rubrique qui n'a pas franchi la porte. */
    rattachementsDetaches: Number(rendu?.rattachements_detaches) || 0,
    numeroDeReunion: texte(rendu?.numero_de_reunion),
    tenueLe: texte(rendu?.tenue_le),
    redigePar: texte(rendu?.redige_par),
    // Ce que le serveur a jeté faute de citation vérifiable. Se dit, se compte.
    ecartes: Array.isArray(rendu?.ecartes) ? rendu.ecartes.length : 0,
    /** Les labels proposés hors de la liste fermée, et donc écartés. */
    labelsEcartes: Array.isArray(rendu?.labels_ecartes) ? rendu.labels_ecartes : [],
    /** Les rapprochements qui pointaient vers un sujet qu'on n'avait pas envoyé. */
    rapprochementsEcartes: Number(rendu?.rapprochements_ecartes) || 0,
    /** A-t-on dit au modèle ce que le projet suit ? Sans cela, tout repart neuf. */
    rapprochementDemande: Boolean(rendu?.rapprochement_demande),
    pagesCorrigees: Number(rendu?.pages_corrigees) || 0,
    modele: texte(rendu?.modele),
    /**
     * Ce que la lecture a pris au serveur, en millisecondes.
     *
     * **Mesurée là-bas, pas ici.** Le temps du réseau et celui d'un onglet en
     * arrière-plan s'ajouteraient à la mesure, et l'on comparerait deux modèles
     * sur le débit de la connexion.
     */
    dureeMs: Number.isFinite(Number(rendu?.duree_ms)) ? Number(rendu.duree_ms) : null,
    /** La réponse a-t-elle été coupée ? Des points manquent alors, en silence. */
    coupee: Boolean(rendu?.coupee)
  };
}

/**
 * Lire tous les comptes rendus d'un lot, un par un.
 *
 * **Un appel par document, jamais un pour tout le lot.** Deux comptes rendus
 * d'un même dépôt sont deux réunions différentes, et fondre leurs textes ferait
 * attribuer les points de l'une à l'autre — donc rouvrir à la douzième réunion
 * ce qui a été soldé à la onzième.
 *
 * Les documents se lisent **en série** : un lot de trente comptes rendus lancé
 * d'un coup se ferait limiter, et l'on perdrait tout le lot pour avoir voulu
 * aller vite.
 */
export async function lireLeLotDeComptesRendus({ sources = [], onEtape = null } = {}) {
  const lectures = new Map();
  const refus = [];

  for (const source of Array.isArray(sources) ? sources : []) {
    const sourceId = texte(source?.sourceId ?? source?.source_id);
    if (!sourceId) continue;

    onEtape?.({ sourceId, nom: texte(source?.nom) || sourceId });

    const lu = await lireLesSujets({ sourceId, pages: source?.pages ?? [] });
    if (lu.ok) lectures.set(sourceId, lu);
    else refus.push({ sourceId, motif: lu.motif });
  }

  return { lectures, refus };
}
