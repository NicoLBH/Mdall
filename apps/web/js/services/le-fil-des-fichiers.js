/**
 * Le chemin qu'affiche l'onglet Fichiers, et les branches qu'il traverse.
 *
 * ## Le défaut qu'il répare
 *
 * Fichiers porte trois racines, et deux d'entre elles sont des arborescences
 * **séparées** : *Documents*, ce qui se partage, et *Mails*, qui pend à la
 * racine précisément parce que son contenu ne se partage pas.
 *
 * Le fil d'Ariane le disait bien à l'aller — « Fichiers / Mails / objet du
 * message ». Au retour, non : cliquer « Mails » dans le fil rendait la bonne
 * liste sous un chemin faux, « Fichiers / Documents / Mails ». Le clic du fil
 * rouvrait le dossier **en repartant de Documents**, parce que c'était la
 * valeur par défaut du geste commun ; la branche était perdue, et le fil, qui
 * la lit pour se composer, décrivait alors un chemin qui n'existe pas.
 *
 * Ce n'est pas un détail d'affichage. Un chemin est ce à quoi on se fie pour
 * savoir **où une pièce est rangée**, et donc qui la voit.
 *
 * ## Ce que ce module décide
 *
 * Les morceaux du chemin, et rien d'autre : leur libellé, le dossier que
 * chacun rouvre, et le fait qu'on soit au bout. Le dessin — les séparateurs,
 * le champ de saisie, le dernier morceau qui ne se clique pas — reste dans
 * l'écran. Il était écrit là, et il y est resté ; ce qui en sort est la
 * **règle**, qui se vérifie sans navigateur.
 *
 * ## Il est pur
 *
 * Un état entre, une liste sort.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les trois racines de l'onglet.
 *
 * Elles vivaient dans l'écran, en constante privée. Le fil en dépend, et le
 * fil se vérifie : elles descendent donc avec lui (règle 10).
 */
export const BRANCHE = { MEMOIRE: "memoire", DOCUMENTS: "documents", MAILS: "mails" };

/**
 * Les morceaux du chemin, de la racine jusqu'où l'on se trouve.
 *
 * @param {object} quoi
 * @param {string} [quoi.branche] la branche où l'on est — voir `BRANCHE`
 * @param {string} [quoi.racineDesDocuments] le mot qui nomme *Documents*
 * @param {string} [quoi.racineDesMails] le mot qui nomme *Mails*
 * @param {string} [quoi.idDesMails] l'identifiant du dossier des mails
 * @param {object[]} [quoi.chemin] les dossiers traversés, de haut en bas
 * @param {string} [quoi.fichier] le nom du fichier ouvert, s'il y en a un
 * @returns {{libelle: string, dossierId: string|null, racine: boolean}[]}
 *   `dossierId` nul désigne la racine de l'onglet ; chaîne vide, la racine des
 *   documents. Un morceau `racine` ne rouvre pas un dossier : il change de
 *   branche, et c'est le seul qui le fasse.
 */
export function lesMorceauxDuFil({
  branche = BRANCHE.DOCUMENTS, racineDesDocuments = "Documents", racineDesMails = "Mails",
  idDesMails = "", chemin = [], fichier = ""
} = {}) {
  const dansLesMails = texte(branche) === BRANCHE.MAILS;
  const sonId = texte(idDesMails);

  return [
    { libelle: "Fichiers", dossierId: null, racine: true },
    dansLesMails
      ? { libelle: texte(racineDesMails) || "Mails", dossierId: sonId, racine: false }
      : { libelle: texte(racineDesDocuments) || "Documents", dossierId: "", racine: false },
    // **Le dossier des mails ne se dit pas deux fois.** Dans cette branche il
    // *est* la racine ; le laisser aussi dans la suite donnerait
    // « Fichiers / Mails / Mails ».
    ...(Array.isArray(chemin) ? chemin : [])
      .filter((dossier) => !(dansLesMails && texte(dossier?.id) === sonId))
      .map((dossier) => ({
        libelle: texte(dossier?.name) || "Dossier",
        dossierId: texte(dossier?.id),
        racine: false
      })),
    ...(texte(fichier) ? [{ libelle: texte(fichier), dossierId: null, racine: false }] : [])
  ];
}
