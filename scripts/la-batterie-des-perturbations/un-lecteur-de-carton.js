/**
 * Deux lecteurs de carton — **pour éprouver la batterie sans dépenser un appel.**
 *
 * ## Pourquoi ils ne « recopient pas les hypothèses du code »
 *
 * Un jeu d'essai qui reprend les suppositions de ce qu'il éprouve ne teste rien.
 * Ce n'est pas le cas ici : la batterie ne lit pas de documents, elle **compare
 * deux lectures**. Ces deux lecteurs sont donc des sujets d'épreuve, pas des
 * miroirs — l'un lit vraiment le tableau, l'autre fait semblant, et la batterie
 * doit distinguer les deux. C'est la seule façon de savoir qu'elle attrape ce
 * qu'elle prétend attraper : un instrument de mesure qu'on n'a jamais vu tomber
 * ne mesure rien.
 *
 * Ils ne servent qu'aux épreuves. Le vrai lecteur est le serveur, et il
 * s'injecte par le même paramètre.
 */

import { lesCellules, lesLignesDeTableau } from "./les-perturbations.js";
import { FAMILLE } from "../../apps/web/js/services/les-familles-de-document.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Les lignes du tableau d'une section, repérée par son titre. */
function leTableauDeLaSection(doc = "", motDuTitre = "") {
  const lignes = String(doc ?? "").split("\n");
  const debut = lignes.findIndex((une) =>
    new RegExp(`^#{1,6}\\s.*${motDuTitre}`, "i").test(une));
  if (debut < 0) return [];

  const rang = (lignes[debut].match(/^#+/) ?? ["#"])[0].length;
  let fin = debut + 1;
  while (fin < lignes.length) {
    const estUnTitre = /^#{1,6}\s/.test(lignes[fin]);
    if (estUnTitre && (lignes[fin].match(/^#+/) ?? ["#"])[0].length <= rang) break;
    fin += 1;
  }

  return lesLignesDeTableau(lignes.slice(debut, fin).join("\n"))
    .map(({ ligne }) => lesCellules(ligne))
    // La première ligne d'un tableau est son en-tête, et n'est pas une donnée.
    .slice(1);
}

/** La légende d'un rapport, telle que le document la déclare. */
function laLegende(doc = "") {
  return leTableauDeLaSection(doc, "l[ée]gende")
    .map(([marque, signification]) => ({ marque: texte(marque), signification: texte(signification) }))
    .filter((une) => une.marque);
}

/** Les lignes de tous les tableaux qui ne sont pas la légende. */
function lesLignesDeReleve(doc = "") {
  const deLaLegende = new Set(laLegende(doc).map((une) => une.marque));
  return lesLignesDeTableau(doc)
    .map(({ ligne }) => lesCellules(ligne))
    .filter((cellules) => cellules.length >= 4)
    // L'en-tête d'un tableau porte des intitulés de colonne, pas une référence.
    .filter(([premiere]) => !/^(r[ée]f\.?|r[ée]f[ée]rence|marque)$/i.test(texte(premiere)))
    // Les lignes de la légende elle-même : deux colonnes, déjà exclues par la
    // longueur, mais on s'en assure — une légende lue comme un relevé
    // fabriquerait quatre avis qui n'existent pas.
    .filter((cellules) => !(cellules.length === 2 && deLaLegende.has(texte(cellules[0]))));
}

/**
 * **Le lecteur qui lit.** Il prend la marque dans sa colonne et la citation dans
 * la ligne. C'est la lecture de référence de ces documents inventés.
 */
export async function unLecteurFidele({ texte: doc = "", famille = "" } = {}) {
  const lignes = lesLignesDeReleve(doc);
  const legende = laLegende(doc);

  if (famille === FAMILLE.CONTROLE) {
    return {
      ok: true,
      lecture: {
        avis: lignes.map(([reference, intitule, marque, observation]) => ({
          reference: texte(reference),
          intitule: texte(intitule),
          marque: texte(marque),
          constat: texte(observation),
          citation: texte(observation)
        })),
        legende,
        sansStructure: legende.length === 0,
        avisEcartes: 0
      }
    };
  }

  return {
    ok: true,
    lecture: {
      points: lignes.map(([reference, titre, etat, qui, echeance, observation]) => ({
        reference: texte(reference),
        titre: texte(titre),
        etat: texte(etat),
        qui: texte(qui),
        echeance: texte(echeance),
        description: texte(observation),
        citation: texte(observation)
      })),
      rubriques: [],
      sansStructure: false,
      ecartes: 0
    }
  };
}

/**
 * **Le lecteur qui devine.** Il relève les mêmes lignes, et rend la marque que
 * `quoiQuilArrive` lui dit — sans jamais regarder la colonne du verdict.
 *
 * C'est exactement le défaut qu'une batterie de perturbations existe pour
 * attraper : sur le document d'origine, sa lecture est plausible ; sur le
 * document nié, elle est identique, et c'est là qu'il se trahit.
 */
export function unLecteurQuiDevine(quoiQuilArrive = "F") {
  return async (demande) => {
    const lu = await unLecteurFidele(demande);
    const marque = texte(quoiQuilArrive);

    if (demande?.famille === FAMILLE.CONTROLE) {
      return { ok: true, lecture: { ...lu.lecture,
        avis: lu.lecture.avis.map((un) => ({ ...un, marque })) } };
    }
    return { ok: true, lecture: { ...lu.lecture,
      points: lu.lecture.points.map((un) => ({ ...un, etat: marque })) } };
  };
}
