/**
 * Le convoi : **absorber cent archives sans tenir cent archives**.
 *
 * ## Le mur qu'on ne contourne pas en optimisant
 *
 * Le versoir gardait les octets de tout ce qu'on lui donnait, dans deux
 * tableaux, jusqu'à la fermeture de l'onglet. C'est juste pour dix fichiers
 * qu'on veut regarder avant de décider. Pour cent historiques de chantier —
 * des dizaines de gigaoctets —, **l'onglet meurt**, et il meurt tard : après
 * vingt minutes de lecture, sans avoir rien versé.
 *
 * On ne règle pas cela en économisant : on le règle en **ne gardant pas**. Un
 * lot se lit, se verse, et **relâche ses octets** ; le lot suivant repart sur
 * une mémoire vide. Le dépôt peut alors durer des heures : ce n'est plus la
 * taille qui décide, c'est la patience.
 *
 * ## Le compte rendu remplace l'inspection
 *
 * À dix fichiers, on regarde avant de verser. À cent mille messages, **c'est
 * impossible et il faut le dire** : ce qu'on regarde n'est plus la matière,
 * c'est le compte rendu — combien sont passés, combien étaient déjà là,
 * combien ont résisté et **lesquels**.
 *
 * C'est pour cela que le journal n'est pas un ornement. « 3 refusés » sur cent
 * mille est une information qu'on ne peut pas exploiter ; « 3 refusés, et
 * voici leurs noms » se rejoue.
 *
 * ## Reprendre ne demande aucun registre d'avancement
 *
 * On aurait pu écrire où l'on s'est arrêté. C'était inutile : **l'archive est
 * son propre registre**. Ce qui y est n'y retourne pas, et le convoi redemande
 * à chaque lot ce que ce lot-là contient déjà. Une panne coûte un lot, jamais
 * le convoi.
 *
 * Et cette question est **bornée par nature** : on ne demande jamais plus que
 * ce qu'on s'apprête à verser. C'est ce qui la fait tenir à cent mille — là où
 * demander « que contient l'archive ? » se faisait plafonner à mille lignes en
 * silence.
 *
 * ## Il est pur
 *
 * Il ne lit aucun fichier, ne verse rien, ne dessine rien. Il découpe, il
 * compte, il tient le journal. Ce qui lit, verse et dessine lui est donné.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Combien de fichiers par lot.
 *
 * **Assez grand** pour que la question « lesquels connais-tu ? » ne soit pas
 * reposée à chaque fichier ; **assez petit** pour que la mémoire relâchée le
 * soit souvent, et qu'une panne ne coûte pas cher. Cinquante messages tiennent
 * dans quelques dizaines de mégaoctets, pièces comprises.
 */
export const PAR_LOT = 50;

/** Ce qui peut arriver à un fichier, nommé pour que le journal puisse le dire. */
export const SORT = {
  VERSE: "verse",
  DEJA_LA: "deja-la",
  ILLISIBLE: "illisible",
  REFUSE: "refuse"
};

/** Ce que chaque sort dit, en clair. */
export const MOTS_DU_SORT = {
  [SORT.VERSE]: "versé",
  [SORT.DEJA_LA]: "était déjà là",
  [SORT.ILLISIBLE]: "ne s'est pas laissé ouvrir",
  [SORT.REFUSE]: "n'a pas pu être versé"
};

/**
 * Découper une liste en lots.
 *
 * **Le dernier lot n'est pas complété.** Le remplir de vide ferait compter des
 * fichiers qui n'existent pas.
 */
export function enLots(fichiers = [], parLot = PAR_LOT) {
  const tous = Array.isArray(fichiers) ? fichiers : [];
  const combien = Math.max(1, Math.floor(Number(parLot) || PAR_LOT));
  const lots = [];
  for (let ou = 0; ou < tous.length; ou += combien) lots.push(tous.slice(ou, ou + combien));
  return lots;
}

/**
 * Ce qui, dans un dépôt, a l'allure d'un message Outlook.
 *
 * Un dossier de chantier porte des plans, des tableurs, des `.pst`, des
 * `Thumbs.db`. Les donner au lecteur de `.msg` les ferait tous compter comme
 * illisibles, et le compte rendu dirait « quatre-vingts pour cent ont résisté »
 * là où il faudrait lire « ce n'étaient pas des messages ».
 *
 * On les écarte donc **avant** de les compter, et l'on dit combien.
 */
export function lesMessagesDuDepot(fichiers = []) {
  const tous = Array.isArray(fichiers) ? fichiers : [];
  const messages = tous.filter((un) => /\.msg$/i.test(texte(un?.name)));
  return { messages, ecartes: tous.length - messages.length };
}

/** Un journal vide : ce qu'on tient d'un convoi avant qu'il ne parte. */
export function unJournalNeuf() {
  return {
    fichiers: 0,
    lots: 0,
    verses: 0,
    dejaLa: 0,
    illisibles: 0,
    refuses: 0,
    pieces: 0,
    piecesDejaLa: 0,
    // **Les noms de ce qui a résisté, et eux seuls.** Garder une ligne par
    // fichier ferait cent mille lignes en mémoire — exactement ce que le convoi
    // existe pour éviter. Ce qui est passé se compte ; ce qui a buté se nomme.
    accrocs: [],
    fini: false,
    arrete: false
  };
}

/**
 * Combien d'accrocs on garde le nom.
 *
 * Au-delà, on compte sans nommer : une liste de dix mille noms ne se lit pas,
 * et la garder referait le mur de mémoire qu'on vient d'abattre. Le compte,
 * lui, reste juste.
 */
export const ACCROCS_NOMMES = 200;

/** Noter ce qui est arrivé à un fichier. */
export function noter(journal, fichier, sort, detail = "") {
  const suite = { ...journal, accrocs: journal.accrocs };

  if (sort === SORT.VERSE) suite.verses += 1;
  else if (sort === SORT.DEJA_LA) suite.dejaLa += 1;
  else if (sort === SORT.ILLISIBLE) suite.illisibles += 1;
  else if (sort === SORT.REFUSE) suite.refuses += 1;

  if (sort === SORT.ILLISIBLE || sort === SORT.REFUSE) {
    if (suite.accrocs.length < ACCROCS_NOMMES) {
      suite.accrocs = [...suite.accrocs, { fichier: texte(fichier), sort, detail: texte(detail) }];
    }
  }

  return suite;
}

/** Ce qu'un lot de pièces a ajouté au convoi. */
export function noterLesPieces(journal, bilan = null) {
  return {
    ...journal,
    pieces: journal.pieces + (Number(bilan?.versees) || 0),
    piecesDejaLa: journal.piecesDejaLa + (Number(bilan?.dejaLa) || 0)
  };
}

/**
 * Le convoi en une phrase.
 *
 * **Ce qui vaut zéro ne s'écrit pas**, ici comme partout — sauf le nombre de
 * fichiers, qui dit l'ampleur et se lit même à zéro pendant que ça tourne.
 */
export function phraseDuConvoi(journal = null) {
  const fichiers = Number(journal?.fichiers) || 0;
  if (!fichiers) return "";

  const dits = [`${fichiers} ${fichiers > 1 ? "fichiers" : "fichier"}`];

  const dire = (combien, un, plusieurs) => {
    if (combien) dits.push(`${combien} ${combien > 1 ? plusieurs : un}`);
  };
  dire(Number(journal?.verses) || 0, "versé", "versés");
  dire(Number(journal?.dejaLa) || 0, "était déjà là", "étaient déjà là");
  dire(Number(journal?.pieces) || 0, "pièce versée", "pièces versées");
  dire(Number(journal?.illisibles) || 0,
    "ne s'est pas laissé ouvrir", "ne se sont pas laissé ouvrir");
  dire(Number(journal?.refuses) || 0,
    "n'a pas pu être versé", "n'ont pas pu être versés");

  return dits.join(" · ");
}

/**
 * Où en est le convoi, en fraction.
 *
 * `null` quand rien n'est parti : une barre à zéro pour cent ressemble à un
 * convoi bloqué, alors qu'il n'a pas commencé.
 */
export function avancement(journal = null) {
  const fichiers = Number(journal?.fichiers) || 0;
  if (!fichiers) return null;

  const faits = (Number(journal?.verses) || 0) + (Number(journal?.dejaLa) || 0)
    + (Number(journal?.illisibles) || 0) + (Number(journal?.refuses) || 0);
  return Math.min(1, faits / fichiers);
}
