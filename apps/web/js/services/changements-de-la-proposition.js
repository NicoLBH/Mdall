/**
 * Ce qu'une proposition change vraiment — avant de la signer.
 *
 * ## Une proposition de trente lignes ne se relit pas
 *
 * Un compte rendu de douze pages produit quarante lignes : des points, des
 * entreprises, un document, des fermetures, des labels. Présentées à plat, on
 * les fait défiler, on regarde les trois premières, et on signe. **C'est
 * exactement ce que le produit ne doit pas obtenir** : la proposition existe
 * pour qu'une décision soit prise, pas pour qu'elle soit ratifiée.
 *
 * Elle doit donc dire, en une ligne, **ce qui bouge** : tant de sujets
 * ouverts, tant fermés, tant de labels posés, un lot ajouté, deux objectifs
 * datés. Le détail reste derrière, et on l'ouvre quand le résumé surprend.
 *
 * ## Les natures ne se valent pas, et l'ordre le dit
 *
 * Ouvrir un sujet engage quelqu'un à le traiter. Ajouter une entreprise fait
 * entrer une personne réelle dans un projet. Poser un label ne fait que ranger.
 * Le résumé est donc **ordonné par ce que ça engage**, pas par le nombre de
 * lignes : douze labels posés passent après un seul intervenant ajouté.
 *
 * ## Ce qui est refusé ne change rien
 *
 * Une ligne refusée reste visible dans la proposition — c'est une décision, et
 * elle se lit. Mais elle n'entre pas au résumé : compter ce qu'on a refusé
 * parmi ce qui va changer serait exactement le contraire de ce qu'on cherche.
 *
 * Ce qui n'est **pas encore décidé**, en revanche, y entre : c'est ce que la
 * fusion écrira si l'on signe maintenant. Le taire ferait annoncer « rien ne
 * change » sur une proposition entière qu'on n'a pas encore parcourue.
 *
 * Rien ici n'appelle quoi que ce soit : des lignes entrent, un résumé sort.
 */

import { ITEM } from "./proposition-state.js";
import { ITEM_TYPE } from "./proposition-review.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les natures de changement, **dans l'ordre de ce qu'elles engagent**.
 *
 * Cet ordre est la moitié du service : un résumé qui rangerait par nombre
 * mettrait douze labels devant une entreprise ajoutée, et l'on signerait sans
 * avoir vu la seule ligne qui compte.
 */
export const CHANGE = {
  SUJET_OUVERT: "sujet_ouvert",
  SUJET_FERME: "sujet_ferme",
  SUJET_ROUVERT: "sujet_rouvert",
  INTERVENANT: "intervenant",
  AVIS: "avis",
  AFFIRMATION: "affirmation",
  DOCUMENT: "document",
  ATTACHMENT: "attachment",
  LOT: "lot",
  OBJECTIF: "objectif",
  LABEL: "label",
  LIEN: "lien",
  SITUATION: "situation",
  /**
   * Un sujet déjà ouvert que le compte rendu reporte.
   *
   * **Ce n'est pas rien, et ce n'est pas un sujet de plus.** Un point reporté
   * de la onzième réunion à la douzième dit que la question tient toujours :
   * le fil du sujet le reçoit, daté et cité. Le compter parmi les sujets
   * ouverts ferait annoncer douze ouvertures pour douze rappels.
   */
  SUJET_RELANCE: "sujet_relance"
};

/** L'ordre de lecture. Ce qui engage le plus vient en premier. */
const ORDRE = [
  CHANGE.SUJET_OUVERT, CHANGE.SUJET_FERME, CHANGE.SUJET_ROUVERT,
  CHANGE.INTERVENANT, CHANGE.AVIS, CHANGE.AFFIRMATION,
  CHANGE.SUJET_RELANCE,
  CHANGE.DOCUMENT, CHANGE.ATTACHMENT,
  CHANGE.SITUATION, CHANGE.LOT, CHANGE.OBJECTIF, CHANGE.LABEL, CHANGE.LIEN
];

/**
 * Comment chaque nature se dit, au singulier et au pluriel.
 *
 * **Des verbes au conditionnel.** « Ouvrirait » et non « ouvre » : rien n'est
 * écrit tant que personne n'a signé, et un présent ferait croire que c'est
 * fait.
 */
export const MOTS_DU_CHANGE = {
  [CHANGE.SUJET_OUVERT]: ["sujet ouvert", "sujets ouverts"],
  [CHANGE.SUJET_FERME]: ["sujet fermé", "sujets fermés"],
  [CHANGE.SUJET_ROUVERT]: ["sujet rouvert", "sujets rouverts"],
  [CHANGE.SUJET_RELANCE]: ["sujet relancé", "sujets relancés"],
  [CHANGE.INTERVENANT]: ["entreprise ajoutée", "entreprises ajoutées"],
  [CHANGE.AVIS]: ["avis", "avis"],
  [CHANGE.AFFIRMATION]: ["valeur en mémoire", "valeurs en mémoire"],
  [CHANGE.DOCUMENT]: ["document rangé", "documents rangés"],
  [CHANGE.ATTACHMENT]: ["affaire rattachée", "affaires rattachées"],
  [CHANGE.SITUATION]: ["situation de suivi", "situations de suivi"],
  [CHANGE.LOT]: ["lot ajouté", "lots ajoutés"],
  [CHANGE.OBJECTIF]: ["objectif daté", "objectifs datés"],
  [CHANGE.LABEL]: ["label posé", "labels posés"],
  [CHANGE.LIEN]: ["dépendance", "dépendances"]
};

/**
 * Ce que chaque nature engage, dit en clair.
 *
 * C'est ce qui s'affiche au survol du compte : un chiffre sans conséquence se
 * lit comme une statistique, et l'on ne se demande pas s'il est juste.
 */
export const CE_QUE_CA_ENGAGE = {
  [CHANGE.SUJET_OUVERT]: "Un sujet ouvert engage quelqu'un à le traiter, et apparaît dans les listes de tout le monde.",
  [CHANGE.SUJET_FERME]: "Un sujet fermé sort des listes. Il se rouvrira si un prochain compte rendu en reparle.",
  [CHANGE.SUJET_ROUVERT]: "Un sujet fermé qui revient reprend son histoire, plutôt qu'un second sujet au même titre.",
  [CHANGE.SUJET_RELANCE]: "Un sujet relancé reçoit dans son fil ce que le compte rendu en redit, daté et cité. Il ne se rouvre pas : il n'était pas fermé.",
  [CHANGE.INTERVENANT]: "Une entreprise ajoutée fait entrer des personnes réelles dans le projet, à qui du travail sera assigné.",
  [CHANGE.AVIS]: "Un avis change l'état d'un point de contrôle.",
  [CHANGE.AFFIRMATION]: "Une valeur en mémoire sert de base à tous les calculs qui la lisent.",
  [CHANGE.DOCUMENT]: "Un document rangé devient consultable par tout le projet.",
  [CHANGE.ATTACHMENT]: "Une affaire rattachée relie ce projet à un autre dossier.",
  [CHANGE.SITUATION]: "Une situation de suivi rassemble des sujets et se tient à jour seule.",
  [CHANGE.LOT]: "Un lot ajouté devient un rangement pour tout le projet.",
  [CHANGE.OBJECTIF]: "Un objectif daté apparaît dans les échéances du projet.",
  [CHANGE.LABEL]: "Un label posé range un sujet ; il ne change rien d'autre.",
  [CHANGE.LIEN]: "Une dépendance relie deux sujets : débloquer l'un débloquera l'autre."
};

/** De quelle nature de changement relève une ligne de proposition. */
const NATURE_DE_LITEM = {
  [ITEM_TYPE.DOCUMENT]: CHANGE.DOCUMENT,
  [ITEM_TYPE.ATTACHMENT]: CHANGE.ATTACHMENT,
  [ITEM_TYPE.AVIS]: CHANGE.AVIS,
  [ITEM_TYPE.INTERVENANT]: CHANGE.INTERVENANT,
  // **Ils ont maintenant une ligne à eux.** Ils passaient par `apports`, un
  // canal parallèle où l'écran de lecture annonçait ce qu'il avait relevé sans
  // que rien ne puisse être refusé ligne à ligne. Ce sont des écritures : elles
  // se cochent comme le reste (règle 1).
  [ITEM_TYPE.RELANCE]: CHANGE.SUJET_RELANCE,
  [ITEM_TYPE.FERMETURE]: CHANGE.SUJET_FERME,
  [ITEM_TYPE.LABEL]: CHANGE.LABEL,
  [ITEM_TYPE.LOT]: CHANGE.LOT,
  [ITEM_TYPE.OBJECTIF]: CHANGE.OBJECTIF
};

/**
 * Un point de compte rendu ouvre, ferme ou rouvre — c'est son `sort` qui
 * décide, celui que la confrontation a établi. Sans sort, il ouvre : c'est ce
 * que fait un point qu'aucun sujet ne rapproche.
 */
function natureDuSujet(payload = {}) {
  const sort = texte(payload?.sort).toLowerCase();
  if (sort === "reouvre") return CHANGE.SUJET_ROUVERT;
  if (sort === "ferme" || texte(payload?.fermeture)) return CHANGE.SUJET_FERME;
  return CHANGE.SUJET_OUVERT;
}

/** La nature d'une ligne, ou `""` si on ne sait pas la ranger. */
export function natureDuChangement(item = {}) {
  const type = texte(item?.itemType ?? item?.item_type);
  if (type === ITEM_TYPE.SUJET) return natureDuSujet(item?.payload ?? {});

  // **Un arbitrage ne change rien au projet.** C'est une décision sur la
  // proposition — passer outre un contrôle qui la retenait —, et la compter
  // parmi ce qui changerait annoncerait « 1 valeur en mémoire » là où rien
  // n'entre. Elle se lit dans son propre bloc, et dans le procès-verbal.
  if (type === ITEM_TYPE.ARBITRAGE) return "";

  const connue = NATURE_DE_LITEM[type];
  if (connue) return connue;

  // Tout le reste est une affirmation sur le projet : c'est ce que le tableau
  // avant/après compare. Une nature inconnue n'est pas écartée — la taire
  // ferait annoncer moins de changements qu'il n'y en a (règle 5).
  return type ? CHANGE.AFFIRMATION : "";
}

/**
 * Ce que cette proposition changerait, par nature.
 *
 * @param {object} options
 * @param {object[]} options.items les lignes de la proposition
 * @param {object} [options.apports] ce que l'écran de lecture a relevé et qui
 *   n'a **toujours pas** de ligne à soi : les liens et la situation. Ils
 *   entreront à la fusion avec le reste ; les taire ferait annoncer moins que
 *   ce qui va être écrit.
 *
 *   Labels, lots et objectifs n'y sont plus : ils ont maintenant leurs propres
 *   lignes, et les compter une seconde fois ici annoncerait le double de ce qui
 *   sera écrit. C'est exactement le défaut qu'une valeur portée à deux endroits
 *   finit par produire (règle 4) — et il aurait été invisible, puisque les deux
 *   comptes sont justes séparément.
 * @returns {{par: object, total: number, refuses: number, indecis: number,
 *   lignes: {cle: string, combien: number, mot: string, engage: string}[]}}
 */
export function changementsDeLaProposition({ items = [], apports = {} } = {}) {
  const lus = Array.isArray(items) ? items : [];

  // **Refusé ne change rien.** La ligne reste visible — c'est une décision —
  // mais compter ce qu'on a refusé parmi ce qui va changer serait le contraire
  // de ce qu'on cherche.
  const retenus = lus.filter((item) => texte(item?.status) !== ITEM.REFUSED);

  const par = {};
  const ajouter = (cle, combien = 1) => {
    if (!cle || combien <= 0) return;
    par[cle] = (par[cle] ?? 0) + combien;
  };

  for (const item of retenus) ajouter(natureDuChangement(item));

  // Ce qui n'a **toujours pas** de ligne à soi. Les labels, les lots et les
  // objectifs en ont une depuis qu'ils sont des affirmations : les rajouter ici
  // les compterait deux fois.
  ajouter(CHANGE.LIEN, Number(apports?.liens) || 0);
  ajouter(CHANGE.SITUATION, Number(apports?.situations) || 0);

  const lignes = ORDRE
    .filter((cle) => (par[cle] ?? 0) > 0)
    .map((cle) => {
      const combien = par[cle];
      const [singulier, pluriel] = MOTS_DU_CHANGE[cle];
      return {
        cle,
        combien,
        mot: `${combien} ${combien > 1 ? pluriel : singulier}`,
        engage: CE_QUE_CA_ENGAGE[cle] ?? ""
      };
    });

  return {
    par,
    total: lignes.reduce((somme, ligne) => somme + ligne.combien, 0),
    refuses: lus.length - retenus.length,
    // Ce qui n'a pas encore été regardé. Il entre au résumé — c'est ce que la
    // fusion écrira si l'on signe maintenant — mais il se compte à part, parce
    // que signer sans avoir lu n'est pas la même chose que signer.
    indecis: retenus.filter((item) => texte(item?.status) === ITEM.PROPOSED).length,
    lignes
  };
}

/**
 * Le résumé en une phrase.
 *
 * **Au conditionnel, toujours.** Rien n'est écrit tant que personne n'a signé,
 * et un présent ferait croire que c'est fait.
 */
export function phraseDesChangements(changements = {}) {
  const lignes = Array.isArray(changements?.lignes) ? changements.lignes : [];

  if (lignes.length === 0) {
    return (changements?.refuses ?? 0) > 0
      ? "Tout a été refusé : cette proposition ne changerait rien."
      : "Cette proposition ne changerait rien.";
  }

  // « Porterait », et non « porte » : rien n'est écrit tant que personne n'a
  // signé, et un présent ferait croire que c'est fait.
  return `Cette proposition porterait : ${lignes.map((ligne) => ligne.mot).join(", ")}.`;
}

/**
 * Ce qu'il reste à regarder, dit à part. `""` quand tout a été décidé.
 *
 * **Signer sans avoir lu n'est pas signer.** La phrase ne bloque rien — c'est
 * une décision, pas une règle — mais elle empêche de le faire sans le savoir.
 */
export function phraseDesIndecis(changements = {}) {
  const combien = Number(changements?.indecis) || 0;
  if (combien === 0) return "";

  return `${combien} ligne${combien > 1 ? "s n'ont" : " n'a"} pas encore été regardée${
    combien > 1 ? "s" : ""} : elle${combien > 1 ? "s entreront" : " entrera"} telle${
    combien > 1 ? "s quelles" : " quelle"} à la fusion.`;
}
