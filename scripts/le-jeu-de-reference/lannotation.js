/**
 * L'annotation d'un document — **la bonne réponse, écrite une fois à la main.**
 *
 * ## Pourquoi il n'y a pas d'échappatoire
 *
 * Les invariants attrapent ce qui ne peut pas être juste. Les perturbations
 * attrapent une lecture qui devine. La dérive dit ce qui a changé. **Aucune des
 * trois ne dit si un constat est juste** — pour cela, il faut que quelqu'un ait
 * écrit une fois ce qu'était la bonne réponse.
 *
 * ## Et ce que cela demande est moins qu'il n'y paraît
 *
 * Une cinquantaine de documents bien choisis — **dont les cas difficiles, pas
 * les faciles** — suffisent à mesurer une précision et un rappel par étape. Un
 * million de documents sans réponse attendue ne mesure rien du tout ; cinquante
 * documents annotés mesurent beaucoup.
 *
 * ## La faute qui viderait l'exercice de son sens
 *
 * **Annoter en regardant ce que le modèle a rendu.** L'annotation certifierait
 * alors la lecture au lieu de la juger, et le jeu rendrait 100 % pour toujours.
 * Chaque annotation déclare donc d'où elle vient (`ecritePar`), et le jeu
 * **refuse** une annotation qui ne le dit pas — une déclaration qu'on peut
 * oublier ne protège de rien.
 *
 * ## Les pièges
 *
 * Ce que la lecture ne doit **pas** relever est aussi important que ce qu'elle
 * doit relever, et c'est la moitié qu'on oublie. Une observation générale n'est
 * pas un avis : la relever en fabrique un qui n'existe pas, et aucun compte de
 * rappel ne le verrait. Chaque piège dit **pourquoi** c'en est un, pour qu'un
 * lecteur de passage ne le prenne pas pour un oubli.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { LES_FAMILLES_PROJETEES } from "../../apps/web/js/services/lempreinte-dune-lecture.js";
import { laCleDunReleve } from "../../apps/web/js/services/lempreinte-dune-lecture.js";

const ICI = dirname(fileURLToPath(import.meta.url));
export const OU_SONT_LES_ANNOTATIONS = join(ICI, "les-annotations");

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/**
 * D'où une annotation vient. **Déclaré, et vérifié.**
 *
 * Une seule valeur est acceptée aujourd'hui, et c'est volontaire : la liste
 * nomme ce qui est permis, elle ne décrit pas ce qui existe. Le jour où l'on
 * acceptera une annotation relue par un second lecteur, elle s'allongera d'une
 * entrée — et l'on saura laquelle est laquelle.
 */
export const DOU_VIENT_UNE_ANNOTATION = {
  /** Écrite à la main depuis le document, sans avoir lu ce que le modèle rend. */
  DU_DOCUMENT: "du document, à la main, sans lire ce que le modèle rend"
};

/**
 * Une annotation lue et contrôlée.
 *
 * @throws si elle ne déclare pas d'où elle vient, ou si sa famille ne se projette
 *   pas. **Lever plutôt que sauter** : un jeu de référence qui rétrécit en
 *   silence rend un score sur moins de documents qu'on ne croit (règle 5).
 */
export function uneAnnotation(brute = null, nom = "") {
  const dou = texte(brute?.ecritePar);
  if (dou !== DOU_VIENT_UNE_ANNOTATION.DU_DOCUMENT) {
    throw new Error(`« ${nom} » ne déclare pas d'où vient son annotation. `
      + `Attendu « ${DOU_VIENT_UNE_ANNOTATION.DU_DOCUMENT} », lu « ${dou || "(rien)"} ».`);
  }

  const famille = texte(brute?.famille);
  if (!LES_FAMILLES_PROJETEES.includes(famille)) {
    throw new Error(`« ${nom} » annote la famille « ${famille || "(vide)"} », `
      + `que la mesure ne sait pas projeter (elle sait : ${LES_FAMILLES_PROJETEES.join(", ")}).`);
  }

  const document = texte(brute?.document);
  if (!document) throw new Error(`« ${nom} » ne dit pas quel document elle annote.`);

  return {
    nom,
    document,
    famille,
    ecritePar: dou,
    /** Ce que la lecture doit rendre : la référence, sa marque, son intitulé. */
    releve: liste(brute?.releve).map((un) => ({
      cle: laCleDunReleve(un),
      reference: texte(un?.reference),
      intitule: texte(un?.intitule),
      marque: texte(un?.marque)
    })).filter((un) => un.cle),
    /** Les marques que la légende déclare. */
    legende: liste(brute?.legende).map(texte).filter(Boolean),
    /** La structure doit-elle être reconnue ? */
    structureReconnue: brute?.structureReconnue !== false,
    /**
     * Ce qui ne doit **pas** être relevé, et pourquoi.
     *
     * Un piège sans raison est un piège qu'on retirera au premier désaccord,
     * faute de savoir pourquoi il était là.
     */
    pieges: liste(brute?.pieges).map((un) => ({
      quoi: texte(un?.quoi),
      pourquoi: texte(un?.pourquoi)
    })).filter((un) => un.quoi && un.pourquoi)
  };
}

/**
 * Le jeu de référence, lu du disque.
 *
 * @throws si une annotation est mal formée — voir `uneAnnotation`.
 */
export function leJeuDeReference(ou = OU_SONT_LES_ANNOTATIONS) {
  return readdirSync(ou)
    .filter((nom) => nom.endsWith(".json"))
    .sort()
    .map((nom) => uneAnnotation(JSON.parse(readFileSync(join(ou, nom), "utf8")), nom));
}
