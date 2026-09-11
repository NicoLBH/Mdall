/**
 * Ce qu'une ligne de l'arborescence dit du rapport d'un document à la mémoire.
 *
 * ## La porte est fermée, l'étiquette reste
 *
 * Le dépôt direct laissait entrer un fichier **sans qu'il passe par l'analyse**.
 * Il a été retiré : ce qui entre passe désormais par une proposition, sans
 * exception — la raison qui emporte les autres étant qu'un dépôt venu du dehors
 * (un courriel, un dossier surveillé) ne peut pas choisir entre deux portes.
 *
 * **Ce fichier reste malgré tout**, et ce n'est pas une hésitation : les
 * documents déposés directement avant ce jour existent, et rien de ce qu'ils
 * disent n'est en mémoire. Le taire maintenant que la porte est fermée ferait
 * mentir l'arborescence sur ce qui y est déjà. L'étiquette ne se posera
 * simplement plus sur rien de nouveau.
 *
 * ## Pourquoi elle doit se lire
 *
 * Un fichier qui ressemble à tous les autres dans l'arborescence laisse croire
 * qu'il compte comme les autres. Quelqu'un ouvrira un rapport déposé l'an
 * dernier, verra son nom dans la liste, et croira le projet au courant. Le
 * silence de l'écran aurait fabriqué cette croyance.
 *
 * ## Ce que ce fichier refuse de dire
 *
 * **Il ne devine pas.** Quand la requête n'a pas demandé le rattachement — il y
 * a plusieurs lectures de la table des documents, et toutes ne le portent pas —
 * la ligne reste **muette** plutôt que d'annoncer « hors mémoire ». Prétendre
 * qu'un document n'est rattaché à rien parce qu'on n'a pas posé la question est
 * exactement ce que la règle 5 interdit : ne pas savoir n'autorise pas à
 * prétendre qu'il n'y a rien.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'une ligne peut porter comme mot, et rien d'autre. */
export const ETIQUETTE = {
  /** Le document est sorti du corpus : les analyses ne le lisent plus. */
  HORS_CORPUS: "hors-corpus",
  /**
   * Déposé directement : il n'est passé par aucune proposition, donc rien de
   * ce qu'il dit n'est en mémoire.
   */
  HORS_MEMOIRE: "hors-memoire",
  /** Rien à dire : il est entré par une proposition, comme le reste. */
  AUCUNE: ""
};

export const MOTS = {
  [ETIQUETTE.HORS_CORPUS]: "hors corpus",
  [ETIQUETTE.HORS_MEMOIRE]: "hors mémoire"
};

export const EXPLICATIONS = {
  [ETIQUETTE.HORS_CORPUS]:
    "Ce document ne fait plus partie du corpus : il n'est plus lu par les analyses. "
    + "Il reste en base, et l'histoire dit quand il en est sorti.",
  [ETIQUETTE.HORS_MEMOIRE]:
    "Ce document a été déposé directement, avant que tout dépôt ne passe par une "
    + "proposition : il se range, se lit et se partage, mais rien de ce qu'il dit "
    + "n'est entré dans la mémoire du projet."
};

/**
 * L'étiquette d'un document, d'après ce que la ligne en dit.
 *
 * L'ordre compte : « hors corpus » l'emporte. Un document écarté du corpus
 * n'est évidemment pas en mémoire non plus, et afficher les deux mots ferait
 * lire deux fois la même absence — alors que sortir du corpus est la
 * circonstance la plus lourde des deux, et celle qu'on veut voir.
 *
 * @param {object} document tel que l'arborescence le porte
 * @returns {string} une clé de `ETIQUETTE`
 */
export function etiquetteDuDocument(document = null) {
  if (!document) return ETIQUETTE.AUCUNE;

  if (texte(document.corpusState) === "refused") return ETIQUETTE.HORS_CORPUS;

  // `undefined` veut dire « la requête n'a pas posé la question » ; `null` veut
  // dire « la base a répondu : aucun rattachement ». Les confondre ferait
  // étiqueter tout un dossier sur une colonne qu'on n'a pas lue.
  if (document.propositionId === undefined) return ETIQUETTE.AUCUNE;

  return texte(document.propositionId) ? ETIQUETTE.AUCUNE : ETIQUETTE.HORS_MEMOIRE;
}

/** Le mot qui se lit sur la ligne, et l'explication au survol. */
export function motDeLEtiquette(cle) {
  return MOTS[texte(cle)] ?? "";
}

export function explicationDeLEtiquette(cle) {
  return EXPLICATIONS[texte(cle)] ?? "";
}
