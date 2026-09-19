/**
 * Ce que le serveur rend d'un relevé, lu une fois.
 *
 * ## Pourquoi c'est un module à part
 *
 * Demander le relevé demande une clé et un réseau ; **comprendre la réponse
 * n'en demande aucun**. Tant que les deux vivaient ensemble, ce contrat entre
 * le serveur et l'écran — une douzaine de champs, chacun avec sa règle pour ne
 * pas mentir quand il manque — ne pouvait pas s'éprouver du tout : le module
 * qui l'abritait importe la couche d'authentification, qui ne s'importe pas
 * hors d'un navigateur.
 *
 * Une rupture muette l'a montré : on pouvait retirer un champ entier sans
 * qu'une seule épreuve ne tombe. Une consigne qu'on ne vérifie pas est une
 * intention (règle 12).
 *
 * ## Ce qu'il fait, et ce qu'il refuse de faire
 *
 * Il lit, il ne complète pas. Un compte absent ne devient pas zéro, une liste
 * absente ne devient pas vide quand le vide voudrait dire autre chose : ne pas
 * savoir se distingue de savoir qu'il n'y a rien (règle 5).
 *
 * ## Il est pur
 *
 * Un objet entre, un état d'écran sort. Aucun réseau, aucune horloge.
 */

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
export function panneLue(rendu, statutHttp) {
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
 * Lire la réponse d'un relevé.
 *
 * @returns {{ok: true, prises: object[], ecartees: number}|{ok: false, motif: string}}
 */
export function leReleveLu(rendu) {
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
    /**
     * Quelle part de chaque message une citation reprend.
     *
     * Un message peu relevé n'est pas un message muet, et rien ne le disait.
     * Ce n'est pas un taux à faire monter — la politesse et la signature ne
     * doivent être reprises par personne — mais un écart à regarder entre les
     * messages d'un même fil.
     */
    couverture: Array.isArray(rendu?.couverture) ? rendu.couverture : [],
    /** Combien de renvois du modèle ne tenaient pas devant le fil. */
    renvoisEcartes: Number(rendu?.renvois_ecartes) || 0,
    /** Combien de prises ont changé de message — donc d'auteur. */
    messagesCorriges: Number(rendu?.messages_corriges) || 0,
    /** La réponse a-t-elle été coupée ? Des prises manquent alors, en silence. */
    coupee: Boolean(rendu?.coupee),
    modele: texte(rendu?.modele),
    /**
     * La température que l'appel a tenue, ou `null` si le modèle l'a refusée.
     *
     * C'est ce qui dit si deux lectures du même fil se ressemblent, et l'écran
     * comme l'export doivent pouvoir le dire : une preuve qui change alors que
     * le document n'a pas changé n'est plus une preuve.
     */
    temperature: Number.isFinite(rendu?.temperature) ? rendu.temperature : null,
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
