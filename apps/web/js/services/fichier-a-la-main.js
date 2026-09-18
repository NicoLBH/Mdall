/**
 * Écrire un fichier à la main, dans Fichiers.
 *
 * ## Pourquoi cela existe, et ce que cela protège
 *
 * **On doit pouvoir se passer du modèle.** L'IA rend la vie plus confortable —
 * elle relit un compte rendu de onze pages en deux centimes — mais rien de ce
 * que Mdall sait faire ne doit *dépendre* d'elle. Une notice incendie qu'on a
 * déjà sous les yeux dans Word ou dans un PDF sélectionnable n'a aucune raison
 * de repasser par une transcription payante : on la sélectionne, on la colle, et
 * elle est dans le projet.
 *
 * C'est aussi la seule porte qui reste ouverte le jour où le fournisseur tombe,
 * change ses prix, ou refuse un document. Un outil dont la seule entrée passe
 * par un modèle est un outil qui s'arrête quand le modèle s'arrête.
 *
 * ## Un fichier écrit à la main est un fichier comme un autre
 *
 * Même table, même stockage, même dossier, même chemin que les PDF déposés. Il
 * ne se range pas à part : ce qui le lira plus tard — la lecture d'un compte
 * rendu depuis Fichiers — n'aura pas à savoir d'où il vient.
 *
 * Et **ce n'est pas une écriture en mémoire**. Un fichier est de la matière
 * première ; ce qu'on en tirera passera par une proposition, comme le reste
 * (règle 1).
 *
 * ## Le nom, et les quatre refus
 *
 * Il se tape dans le fil d'Ariane, au bout du chemin — là où le fichier va
 * exister. `.md` par défaut, parce que c'est ce qu'on colle : du texte qu'on
 * veut relire, pas un format d'échange.
 *
 * ## Il est pur
 *
 * Il décide du nom et de ce qu'on écrit ; il ne parle à rien. C'est ce qui
 * permet d'éprouver les refus sans réseau.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** L'extension d'un fichier écrit à la main, quand on n'en donne pas. */
export const EXTENSION_PAR_DEFAUT = ".md";

/**
 * Ce qu'on accepte d'écrire à la main.
 *
 * Du texte, et seulement du texte : ce sont les formats qu'on relit dans un
 * fichier de code, et ceux qu'on peut coller depuis ailleurs. Un `.pdf` écrit à
 * la main ne serait pas un PDF, et un `.png` encore moins.
 */
export const EXTENSIONS_ECRITES = [".md", ".txt", ".csv", ".ref", ".ddb", ".ctr", ".json"];

/** Pourquoi un nom est refusé. */
export const REFUS = {
  SANS_NOM: "sans-nom",
  UN_CHEMIN: "un-chemin",
  DEJA_PRIS: "deja-pris",
  PAS_DU_TEXTE: "pas-du-texte"
};

/** Ce qu'on dit de chaque refus. Écrit une fois (règle 10). */
export const REFUS_DITS = {
  [REFUS.SANS_NOM]: "Donnez un nom à ce fichier.",
  [REFUS.UN_CHEMIN]: "Un nom de fichier, pas un chemin : ni « / », ni « \\ », ni « .. ».",
  [REFUS.DEJA_PRIS]: "Ce dossier porte déjà un fichier de ce nom.",
  [REFUS.PAS_DU_TEXTE]:
    `On n'écrit à la main que du texte : ${EXTENSIONS_ECRITES.join(", ")}.`
};

/** L'extension d'un nom, point compris, en minuscules — `""` s'il n'en a pas. */
export function extensionDe(nom = "") {
  const trouve = texte(nom).match(/\.[a-z0-9]{1,6}$/i);
  return trouve ? trouve[0].toLowerCase() : "";
}

/**
 * Le nom tel qu'il sera écrit.
 *
 * **L'extension se complète, elle ne se remplace pas.** Quelqu'un qui tape
 * « notice.txt » veut un `.txt` ; lui imposer `.md` ferait un fichier qui ne
 * s'appelle pas comme ce qu'il a demandé.
 */
export function nomComplet(saisi = "") {
  const nom = texte(saisi);
  if (!nom) return "";

  return extensionDe(nom) ? nom : `${nom}${EXTENSION_PAR_DEFAUT}`;
}

/**
 * Ce qui empêche d'écrire ce fichier — vide quand rien n'empêche.
 *
 * @param {string} saisi le nom tapé
 * @param {object} [options]
 * @param {object[]} [options.dejaLa] les fichiers du dossier où l'on écrit
 * @returns {string[]}
 */
export function pourquoiOnNePeutPasLEcrire(saisi = "", { dejaLa = [] } = {}) {
  const nom = texte(saisi);
  if (!nom) return [REFUS.SANS_NOM];

  // Un chemin d'abord : « ../secret.md » n'est pas un nom refusé parce qu'il est
  // pris, il est refusé parce que ce n'est pas un nom. Le dire dans cet ordre
  // évite un message qui envoie chercher au mauvais endroit.
  //
  // Le séparateur écarte toute traversée — elle en demande un. Le « .. » seul,
  // lui, n'écarte qu'un cas, et c'en est un : « .. » et « . » ne sont pas des
  // noms de fichier, et sans ce refus ils deviendraient « ...md » et « ..md ».
  if (/[/\\]/.test(nom) || /^\.+$/.test(nom)) return [REFUS.UN_CHEMIN];

  const complet = nomComplet(nom);
  if (!EXTENSIONS_ECRITES.includes(extensionDe(complet))) return [REFUS.PAS_DU_TEXTE];

  // Le même nom, à la casse près : deux fichiers « Notice.md » et « notice.md »
  // dans un dossier se confondent à l'œil, et l'on ouvre le mauvais.
  const pris = (Array.isArray(dejaLa) ? dejaLa : []).some((fichier) =>
    texte(fichier?.name ?? fichier?.original_filename ?? fichier?.filename).toLowerCase()
      === complet.toLowerCase());

  return pris ? [REFUS.DEJA_PRIS] : [];
}

/** Ce qu'on dit des refus, en une phrase. Vide quand il n'y en a pas. */
export function phraseDesRefus(refus = []) {
  const dits = (Array.isArray(refus) ? refus : []).map((quoi) => REFUS_DITS[quoi]).filter(Boolean);
  return dits.join(" ");
}

/** Le type d'un fichier écrit à la main, d'après son extension. */
export function typeDuFichier(nom = "") {
  const extensions = {
    ".md": "text/markdown", ".txt": "text/plain", ".csv": "text/csv", ".json": "application/json"
  };
  // Les extensions de Mdall — `.ref`, `.ddb`, `.ctr` — sont du texte : leur
  // donner un type inventé ferait télécharger un fichier que rien n'ouvre.
  return extensions[extensionDe(nom)] ?? "text/plain";
}

/**
 * Ce qu'il faut écrire pour créer ce fichier — ou `null` si on ne le peut pas.
 *
 * Il rend **le fichier et la ligne**, parce que les deux se déduisent du même
 * nom : les composer à deux endroits ferait un jour un fichier qui ne s'appelle
 * pas comme sa ligne.
 *
 * @returns {{nom: string, type: string, contenu: string, ligne: object}|null}
 */
export function leFichierAEcrire(saisi = "", {
  contenu = "", projectId = "", folderId = null, parQui = "", dejaLa = []
} = {}) {
  if (pourquoiOnNePeutPasLEcrire(saisi, { dejaLa }).length) return null;
  if (!texte(projectId)) return null;

  const nom = nomComplet(saisi);
  const corps = String(contenu ?? "");

  return {
    nom,
    type: typeDuFichier(nom),
    contenu: corps,
    ligne: {
      project_id: texte(projectId),
      folder_id: folderId || null,
      created_by: texte(parQui) || null,
      filename: nom,
      original_filename: nom,
      mime_type: typeDuFichier(nom),
      upload_status: "uploaded",
      // **Écrit à la main**, et la ligne le dit. Un fichier dont on ne sait plus
      // s'il vient d'un dépôt ou d'un collage ne se relit pas de la même façon :
      // l'un a un original ailleurs, l'autre est l'original.
      document_kind: "ecrit_a_la_main"
    }
  };
}
