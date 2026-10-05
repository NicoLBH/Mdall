/**
 * Une mesure qui ne tient pas dans un réveil, **découpée en morceaux.**
 *
 * ## Le mur
 *
 * Deux des quatre outils relisent des documents avec le modèle. La batterie de
 * perturbations relit deux documents sous six perturbations chacun : douze
 * épreuves, à trois appels au modèle chacune. Une quarantaine d'appels, et
 * plusieurs minutes.
 *
 * Une fonction de bord ne vit pas plusieurs minutes. Elle expirerait au milieu,
 * la ligne resterait `en_cours` pour toujours, et la console afficherait « ça
 * tourne » sur une mesure morte (règle 5). C'est pour cela que les deux outils
 * ne se lançaient pas depuis la console.
 *
 * ## Le découpage, et pourquoi il était déjà là
 *
 * `passerUneEpreuve` est **une unité** : un document, une perturbation, trois
 * appels, un verdict. `confronter` en est une autre : une annotation, une
 * lecture, une confrontation. Les deux outils étaient déjà écrits en morceaux
 * indépendants — il ne manquait que de les nommer, et de savoir les reprendre.
 *
 * La fonction de bord en fait **un seul** par réveil, range ce qu'elle a obtenu,
 * et se rappelle. Le bilan ne se compose qu'au dernier.
 *
 * ## Il est pur
 *
 * Un corpus entre, une liste de morceaux sort. Rien n'est lu, rien n'est appelé.
 */

import { LES_PERTURBATIONS } from "./les-perturbations.js";
import { leBilan } from "./passer-la-batterie.js";
import { leBilanDuJeu } from "./la-confrontation.js";
import { MESURE, leBilanAVerser } from "./le-depot-dun-bilan.js";

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/**
 * La famille qu'un document du corpus déclare en tête, ou `""`.
 *
 * **Elle est déclarée, jamais devinée.** Un compte rendu passé au lecteur de
 * rapports rendrait un résultat, et il serait faux — c'est exactement le défaut
 * que la batterie existe pour attraper, et le lui faire commettre dans son
 * propre corpus serait une plaisanterie.
 *
 * Elle vivait auprès de la lecture du disque ; elle est ici depuis que le
 * serveur lit le même corpus, descendu en module (règle 10).
 */
export function laFamilleDeclaree(doc = "") {
  const dit = String(doc ?? "").match(/<!--\s*famille:\s*([a-z_]+)\s*-->/i);
  return texte(dit?.[1]);
}

/**
 * Les morceaux d'une mesure, dans l'ordre où on les fait.
 *
 * **La clé est ce qui permet de reprendre.** Elle nomme le morceau sans
 * ambiguïté — le document et la perturbation — et c'est elle qu'on retrouve
 * dans l'avancement : reprendre par un rang serait juste tant que le corpus ne
 * bouge pas, et faux le jour où l'on ajoute un document au milieu.
 *
 * `[]` pour un outil qui ne se découpe pas, et c'est une réponse : les deux
 * outils qui lisent les analyses conservées se font d'un seul coup.
 */
export function lesMorceauxDeLaMesure(outil, { corpus = [], annotations = [] } = {}) {
  if (texte(outil) === MESURE.PERTURBATIONS) {
    return liste(corpus).flatMap((document) => LES_PERTURBATIONS.map((perturbation) => ({
      cle: `${texte(document?.nom)}|${texte(perturbation?.nom)}`,
      document,
      perturbation
    })));
  }

  if (texte(outil) === MESURE.JEU_DE_REFERENCE) {
    return liste(annotations).map((annotation) => ({
      cle: texte(annotation?.document),
      annotation
    }));
  }

  return [];
}

/**
 * Le prochain morceau à faire, ou `null` quand il n'en reste aucun.
 *
 * **On cherche par clé, et non par compte.** Un morceau qui a échoué et qu'on
 * reprend, un corpus auquel on ajoute un document : dans les deux cas le compte
 * ment, et la clé dit la vérité.
 */
export function leProchainMorceau(morceaux = [], faits = []) {
  const deja = new Set(liste(faits).map((un) => texte(un?.cle)));
  return liste(morceaux).find((un) => !deja.has(texte(un?.cle))) ?? null;
}

/**
 * Où en est la mesure, pour l'écran.
 *
 * **Jamais un taux sans son assiette** : « 7 épreuves sur 12 » dit où l'on en
 * est, « 58 % » ne dit pas combien il reste à payer.
 */
export function ouEnEstLaMesure(morceaux = [], faits = []) {
  const combien = liste(morceaux).length;
  const fini = liste(faits).length;

  return {
    combien,
    fini,
    reste: Math.max(0, combien - fini),
    /** `true` quand il n'y a plus rien à faire — y compris quand il n'y avait rien. */
    acheve: fini >= combien,
    dit: combien ? `${Math.min(fini, combien)} sur ${combien}` : ""
  };
}

/**
 * Le bilan d'une mesure découpée, composé de ses morceaux.
 *
 * `null` quand l'outil ne se découpe pas, ou quand rien n'a été fait : un bilan
 * de zéros se lirait « mesuré, rien trouvé » là où rien n'a été mesuré, qui est
 * exactement le mensonge que la règle 5 nomme.
 */
export function leBilanDesMorceaux(outil, faits = []) {
  const obtenus = liste(faits).map((un) => un?.obtenu).filter(Boolean);
  if (!obtenus.length) return null;

  if (texte(outil) === MESURE.PERTURBATIONS) {
    return leBilanAVerser(MESURE.PERTURBATIONS, leBilan(obtenus));
  }

  if (texte(outil) === MESURE.JEU_DE_REFERENCE) {
    return leBilanAVerser(MESURE.JEU_DE_REFERENCE, leBilanDuJeu(obtenus));
  }

  return null;
}

/**
 * Ce qu'un morceau coûte, dit avant le clic.
 *
 * Trois appels : la lecture de référence et la lecture perturbée se font chacune
 * en trois étapes, et seule la seconde est refaite à chaque épreuve — la
 * première est partagée. C'est le chiffre que l'écran multiplie.
 */
export const APPELS_PAR_MORCEAU = 3;
