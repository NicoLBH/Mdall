/**
 * La vue qui range un chantier par lot.
 *
 * ## Ce qu'elle sert à faire
 *
 * Un maître d'œuvre ouvre un projet et voit quatre-vingt-treize sujets. Il ne
 * les parcourt pas. Ce qu'il veut est la quinzaine de lots, chacun avec le
 * compte de ce qu'il porte — et entrer dans celui qui l'intéresse.
 *
 * C'est exactement ce que `label:LOT` rend une fois les pères ouverts : les
 * contenants, et rien d'autre.
 *
 * ## Elle se propose, elle ne se crée pas
 *
 * Une vue est une décision d'écran : elle porte un nom, une icône, une place
 * dans le rail. En créer une d'office dans le projet de quelqu'un est une
 * écriture (règle 1) — et celle-là serait particulièrement mal venue, puisque
 * le rail est court et qu'une vue de plus y coûte une place.
 *
 * On la **propose** donc : un clic ouvre la recherche, et c'est la personne qui
 * décide de l'enregistrer. Rien ici n'appelle quoi que ce soit.
 *
 * ## Un nom vit à un seul endroit
 *
 * La requête est écrite ici, et nulle part ailleurs. Recopiée dans l'écran, dans
 * le rail et dans la proposition, elle finirait par exister en trois versions —
 * `label:LOT`, `label:Lot`, `label:"LOT"` — et deux d'entre elles ne
 * rendraient rien (règle 10).
 */

import { LABEL_DU_LOT } from "./label-du-cr.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** La recherche qui rend les lots d'un chantier, et rien d'autre. */
export const REQUETE_DES_LOTS = `label:${LABEL_DU_LOT}`;

/** Ce que la vue porterait si on l'enregistrait. */
export const VUE_DES_LOTS = {
  requete: REQUETE_DES_LOTS,
  nom: "Lots",
  description: "Les lots du chantier, chacun avec ses sujets.",
  icone: "list-unordered",
  couleur: "bleu"
};

/** Deux requêtes se comparent sans la casse ni les espaces qui traînent. */
function memeRequete(gauche, droite) {
  return texte(gauche).replace(/\s+/g, " ").toLowerCase()
    === texte(droite).replace(/\s+/g, " ").toLowerCase();
}

/**
 * Faut-il proposer la vue des lots ?
 *
 * **Trois refus, et le troisième est le plus important.**
 *
 * 1. Le projet la porte déjà — la reproposer ferait douter de celle qui existe.
 * 2. On n'a pas pu lire ses vues : ne pas savoir n'autorise pas à proposer d'en
 *    créer une qui est peut-être là (règle 5).
 * 3. **Aucun lot n'est encore ouvert.** Une vue qui ne rendrait rien ferait
 *    croire que le chantier n'a pas de lots, alors qu'il n'a pas encore été
 *    rangé. On ne propose que ce qui montrera quelque chose.
 *
 * @param {object[]|null} vues les vues du projet — `null` si on n'a pas pu lire
 * @param {number} lots combien de sujets portent le label des lots
 */
export function laVueDesLotsSePropose(vues = null, lots = 0) {
  if (!Array.isArray(vues)) return false;
  if (!(Number(lots) > 0)) return false;

  return !vues.some((vue) => memeRequete(vue?.requete ?? vue?.query, REQUETE_DES_LOTS));
}

/** Ce qu'on en dit à l'écran, en une phrase. */
export function phraseDeLaVueDesLots(lots = 0) {
  const combien = Number(lots) || 0;
  return `Ce projet porte ${combien} lot${combien > 1 ? "s" : ""}. `
    + "Une vue « Lots » les rassemble, chacun avec ses sujets.";
}
