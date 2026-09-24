/**
 * Ce que la transcription a rendu, lu sans réseau.
 *
 * ## Pourquoi cette moitié existe
 *
 * Le module qui **appelle** parle à l'authentification, donc au réseau, donc à
 * un module qu'aucune épreuve de Node ne peut importer. Tout ce qui se lit sans
 * réseau vit donc ici, et s'éprouve : une consigne qu'on ne vérifie pas est une
 * intention (règle 12).
 *
 * Ce découpage a déjà servi une fois, et pour une mauvaise raison — un
 * « n'est pas défini » parti en production dans un module que rien ne pouvait
 * charger hors du navigateur.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Pourquoi une transcription n'a pas eu lieu. Nommé, jamais tu. */
export const REFUS = {
  /** Rien à transcrire : la zone de gauche est vide. */
  SANS_TEXTE: "sans-texte",
  /** Le serveur n'a pas répondu du tout. */
  INJOIGNABLE: "injoignable",
  /** Il a répondu qu'on n'a pas le droit. */
  REFUSE: "refuse",
  /** Il a répondu qu'il n'y arrivait pas. */
  EN_PANNE: "en-panne",
  /** Il a répondu, et sa réponse ne porte aucun fichier. */
  SANS_FICHIER: "sans-fichier"
};

export const PHRASES_DU_REFUS = {
  [REFUS.SANS_TEXTE]: "Écrivez d'abord ce que vous voulez poser, à gauche.",
  [REFUS.INJOIGNABLE]: "Le serveur n'a pas répondu. Rien n'a été transcrit, et rien n'a été facturé.",
  [REFUS.REFUSE]: "La transcription a été refusée : il faut être connecté au projet.",
  [REFUS.EN_PANNE]: "La transcription n'a pas abouti.",
  [REFUS.SANS_FICHIER]: "Le modèle n'a rendu aucun fichier. Reformulez, ou écrivez directement à droite."
};

/**
 * Ce que dit un statut HTTP.
 *
 * **Refusé et en panne ne se corrigent pas pareil** : l'un demande de se
 * reconnecter, l'autre de réessayer. Les confondre ferait réessayer trente fois
 * une porte fermée.
 */
export function motifDuStatut(statut) {
  const code = Number(statut) || 0;
  if (code === 401 || code === 403) return REFUS.REFUSE;
  return REFUS.EN_PANNE;
}

/**
 * Ce que le serveur a nommé de sa panne.
 *
 * Vide quand il n'a rien nommé : on n'invente pas une explication
 * vraisemblable, qui se lirait comme un diagnostic (règle 5).
 */
export function panneLue(corps) {
  const dite = corps?.panne ?? null;
  if (!dite) return "";
  return texte(dite.message) || texte(dite.type);
}

/**
 * Les fichiers rendus, prêts à entrer dans un brouillon.
 *
 * **On ne garde que ce qui porte du texte.** Un fichier vide rendu par le
 * modèle écraserait celui qu'on a déjà écrit à la main — et c'est justement ce
 * qu'on ne veut pas perdre.
 */
export function fichiersLus(corps) {
  return (Array.isArray(corps?.fichiers) ? corps.fichiers : [])
    .map((fichier) => ({ nom: texte(fichier?.nom), contenu: String(fichier?.contenu ?? "") }))
    .filter((fichier) => fichier.nom && fichier.contenu.trim());
}

/**
 * Ce que le modèle déclare ne pas avoir su écrire.
 *
 * **C'est la moitié de ce qu'on est venu chercher.** Une phrase du français qui
 * disparaît sans un mot laisse croire qu'elle a été codée — et l'on ne s'en
 * aperçoit qu'au moment où le raisonnement manque, six mois plus tard.
 */
export function lacunesLues(corps) {
  return (Array.isArray(corps?.lacunes) ? corps.lacunes : [])
    .map((lacune) => ({ phrase: texte(lacune?.phrase), pourquoi: texte(lacune?.pourquoi) }))
    .filter((lacune) => lacune.phrase);
}

/**
 * La transcription rendue, telle que l'écran la lira.
 *
 * `temperature` descend telle quelle : une transcription qu'on n'a pas pu
 * rendre reproductible ne doit pas se présenter comme si elle l'était.
 */
export function laTranscriptionLue(corps) {
  const fichiers = fichiersLus(corps);
  if (!fichiers.length) {
    return { ok: false, motif: REFUS.SANS_FICHIER, panne: panneLue(corps), coupee: Boolean(corps?.coupee) };
  }

  return {
    ok: true,
    fichiers,
    lacunes: lacunesLues(corps),
    /**
     * `null` quand le modèle a refusé qu'on lui fixe une température : le
     * résultat n'est alors pas reproductible, et il faut que ça se voie.
     */
    temperature: corps?.temperature === null ? null : Number(corps?.temperature),
    modele: texte(corps?.modele),
    /**
     * **Coupée n'est pas refusée.** Une réponse tronquée a eu lieu et a été
     * payée ; ce qui en est arrivé se garde, et l'on dit qu'il en manque.
     */
    coupee: Boolean(corps?.coupee)
  };
}

/** Ce qu'on dit d'une transcription qui a abouti. */
export function phraseDeLaTranscription(rendu) {
  if (!rendu?.ok) return PHRASES_DU_REFUS[rendu?.motif] ?? PHRASES_DU_REFUS[REFUS.EN_PANNE];

  const fichiers = rendu.fichiers.length;
  const dits = [`${fichiers} ${fichiers > 1 ? "fichiers écrits" : "fichier écrit"}`];

  if (rendu.coupee) dits.push("la réponse a été coupée : il en manque");
  if (rendu.temperature === null) dits.push("sans température fixée : le résultat n'est pas reproductible");

  return `${dits.join(" — ")}. Relisez : rien n'est encore versé.`;
}
