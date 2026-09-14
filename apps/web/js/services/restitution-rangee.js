/**
 * Où se range la restitution d'un document, et comment on la retrouve.
 *
 * ## Pourquoi la ranger
 *
 * La restitution vivait le temps de l'écran : redéposer le même compte rendu la
 * refaisait, et la **repayait**. Rangée dans Fichiers à côté de son PDF, elle
 * devient trois choses qu'elle n'était pas.
 *
 * - **Durable** : le second dépôt du même document ne coûte rien.
 * - **Relisible par un humain**, dans l'onglet Fichiers, le PDF à côté.
 * - **Relisible par la suite du procédé** : les appels suivants lisent un
 *   fichier, et non une variable d'écran — ils se rejouent donc sans le PDF.
 *
 * ## L'identité d'une restitution, c'est le texte — pas le nom du fichier
 *
 * Deux comptes rendus peuvent s'appeler `CR.pdf`. Le même compte rendu peut
 * s'appeler `CR_07.pdf` chez l'un et `07 - CR.pdf` chez l'autre. **C'est
 * l'empreinte du texte qui dit si deux documents sont le même**, et c'est elle
 * qu'on range avec la restitution.
 *
 * D'où trois états, et non deux :
 *
 * - `ABSENTE` — rien n'a été rangé : il faut restituer ;
 * - `A_JOUR` — une restitution existe pour **ce texte-là** : on la relit ;
 * - `PERIMEE` — une restitution existe, mais d'un autre texte. Le dossier porte
 *   le même nom et le document a changé.
 *
 * Le troisième cas est le piège. Confondu avec le deuxième, on afficherait la
 * restitution d'un compte rendu en croyant lire celle d'un autre — sans rien
 * pour s'en apercevoir (règle 5). Confondu avec le premier, on écraserait
 * silencieusement du travail rangé.
 *
 * Rien ici n'appelle quoi que ce soit : des noms entrent, des noms sortent.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'on sait d'une restitution déjà rangée. */
export const RANGEE = {
  ABSENTE: "absente",
  A_JOUR: "a-jour",
  PERIMEE: "perimee"
};

export const PHRASES_DU_RANGEMENT = {
  [RANGEE.ABSENTE]: "Aucune restitution rangée pour ce document.",
  [RANGEE.A_JOUR]: "Restitution relue depuis Fichiers — aucun appel au modèle.",
  [RANGEE.PERIMEE]: "Une restitution est rangée sous ce nom, mais elle vient d'un autre texte."
};

/**
 * Le dossier des comptes rendus de chantier, dans Documents.
 *
 * ## Un dossier par nature, et non un dossier par document
 *
 * Chaque compte rendu ouvrait **son propre dossier**, nommé comme son PDF. Sur
 * un chantier qui tient deux ans, cela fait quarante dossiers à la racine de
 * Documents, un par réunion, chacun contenant deux fichiers. L'arbre devient
 * illisible au vingtième, et l'on ne retrouve plus un compte rendu qu'en
 * connaissant déjà le nom de son fichier.
 *
 * Ils se rangent donc **là où on les cherche** : un dossier, celui de leur
 * nature, et quarante fichiers dedans — qui portent des dates dans leur nom et
 * se trient donc tout seuls.
 */
export const DOSSIER_DES_CR = "CR de chantier";

/**
 * Le document déjà rangé pour ce texte, s'il y en a un.
 *
 * **L'empreinte décide, pas le nom.** Deux comptes rendus peuvent s'appeler
 * `CR.pdf`, et le même compte rendu s'appeler `CR_07.pdf` chez l'un et
 * `07 - CR.pdf` chez l'autre. Le redéposer en ferait un second exemplaire du
 * même document dans le dossier des comptes rendus.
 */
export function sourceRangee(documents = [], { empreinte = "" } = {}) {
  const signe = texte(empreinte);
  if (!signe) return null;

  return (Array.isArray(documents) ? documents : [])
    .find((document) => texte(document?.content_fingerprint) === signe) ?? null;
}

/**
 * L'état de la transcription rangée avec un document.
 *
 * ## Elle est **sur la ligne du document**, et non à côté
 *
 * Elle était déposée comme un second fichier — `CR_07.md` à côté de
 * `CR_07.pdf`. L'arbre des Fichiers montrait alors deux entrées pour un seul
 * document, et il fallait savoir laquelle ouvrir. Il n'y a plus qu'un endroit :
 * le document lui-même.
 *
 * ## Trois états, et le troisième est le piège
 *
 * - `ABSENTE` — rien n'est rangé : il faut transcrire ;
 * - `A_JOUR` — une transcription de **ce texte-là** est rangée : on la relit ;
 * - `PERIMEE` — le document porte une transcription, mais elle vient d'un autre
 *   texte. Le fichier a été remplacé depuis.
 *
 * Confondre le troisième avec le deuxième afficherait la transcription d'un
 * compte rendu en croyant lire celle d'un autre — sans rien pour s'en
 * apercevoir (règle 5). Le confondre avec le premier écraserait du travail
 * rangé.
 *
 * @param {object|null} document la ligne du document, ou `null`
 * @param {object} options
 * @param {string} options.empreinte l'empreinte du texte du PDF déposé
 * @returns {{etat: string, markdown: string}}
 */
export function transcriptionRangee(document = null, { empreinte = "" } = {}) {
  const markdown = texte(document?.transcription_markdown);
  if (!document || !markdown) return { etat: RANGEE.ABSENTE, markdown: "" };

  // **Sans empreinte, on ne conclut pas qu'elle est à jour.** Ne pas savoir de
  // quel texte vient une transcription n'autorise pas à la servir comme si elle
  // venait de celui-ci (règle 5).
  const signe = texte(empreinte);
  const rangee = texte(document?.content_fingerprint);
  if (!signe || !rangee || rangee !== signe) return { etat: RANGEE.PERIMEE, markdown: "" };

  return { etat: RANGEE.A_JOUR, markdown };
}
