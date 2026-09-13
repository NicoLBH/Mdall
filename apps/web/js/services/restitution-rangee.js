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
 * Le nom du dossier qui abrite un document et sa restitution.
 *
 * Celui du PDF, sans son extension. Le dossier est donc reconnaissable d'un
 * coup d'œil dans l'arbre des fichiers, et un second dépôt du même document
 * retombe dessus au lieu d'en créer un jumeau.
 */
export function nomDuDossier(nomDuFichier = "") {
  const nom = texte(nomDuFichier).replace(/\.[^.]+$/, "");
  // Un nom vide ferait un dossier sans nom, que la base refuse. Mieux vaut un
  // nom générique qu'un dépôt qui échoue.
  return nom || "document";
}

/** Le nom du fichier de restitution — `CR_07.md`. */
export function nomDeLaRestitution(nomDuFichier = "") {
  return `${nomDuDossier(nomDuFichier)}.md`;
}

/** Reconnaît-on ce fichier comme une restitution ? */
export function estUneRestitution(document = {}) {
  const nom = texte(document?.filename ?? document?.original_filename);
  return /\.md$/i.test(nom);
}

/**
 * La restitution rangée pour ce texte, si elle existe.
 *
 * **L'empreinte décide, pas le nom.** Le nom dit seulement où chercher.
 *
 * @param {object[]} documents les fichiers du dossier
 * @param {object} options
 * @param {string} options.nom le nom attendu — `CR_07.md`
 * @param {string} options.empreinte l'empreinte du texte du PDF déposé
 * @returns {{etat: string, document: object|null}}
 */
export function restitutionRangee(documents = [], { nom = "", empreinte = "" } = {}) {
  const attendu = texte(nom).toLowerCase();
  const signe = texte(empreinte);

  const trouvee = (Array.isArray(documents) ? documents : []).find((document) =>
    estUneRestitution(document)
    && texte(document?.filename ?? document?.original_filename).toLowerCase() === attendu);

  if (!trouvee) return { etat: RANGEE.ABSENTE, document: null };

  // **Sans empreinte, on ne conclut pas qu'elle est à jour.** Ne pas savoir de
  // quel texte vient une restitution n'autorise pas à la servir comme si elle
  // venait de celui-ci (règle 5).
  const rangee = texte(trouvee?.content_fingerprint);
  if (!signe || !rangee || rangee !== signe) {
    return { etat: RANGEE.PERIMEE, document: trouvee };
  }

  return { etat: RANGEE.A_JOUR, document: trouvee };
}

/**
 * Le PDF déjà rangé dans ce dossier, si c'est le même.
 *
 * Le redéposer en ferait un second exemplaire du même document, dans le dossier
 * qui porte son nom. On réemploie donc celui qui est là — mais seulement si son
 * texte est le même, pour la raison ci-dessus.
 */
export function sourceRangee(documents = [], { empreinte = "" } = {}) {
  const signe = texte(empreinte);
  if (!signe) return null;

  return (Array.isArray(documents) ? documents : []).find((document) =>
    !estUneRestitution(document)
    && texte(document?.content_fingerprint) === signe) ?? null;
}
