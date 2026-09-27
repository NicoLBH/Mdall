/**
 * Regarder un tableau autrement : en courbe, en barres.
 *
 * ## Le parti pris, et il décide de tout
 *
 * > **Un graphique n'est pas une construction du langage, c'est une façon de
 * > regarder un tableau.**
 *
 * Rien ne s'écrit dans la fonction pour obtenir un dessin. Tout tableau qu'une
 * boucle déroule se regarde en courbe, en barres ou en lignes, **choisi à la
 * lecture** — et c'est ce qui fait que *tous* les tableaux gagnent le dessin
 * d'un coup, y compris ceux écrits avant que cela n'existe.
 *
 * L'alternative aurait été un verbe d'affichage — `trace la courbe de Moment` —
 * et elle était mauvaise pour deux raisons. La fonction aurait cessé d'être
 * pure : elle aurait porté, en plus de son raisonnement, une intention de mise
 * en page que le rejeu doit ignorer. Et chaque nouvelle façon de regarder
 * aurait demandé de rouvrir les fonctions déjà écrites.
 *
 * ## La seule concession : la fonction peut **suggérer**
 *
 * `se lit en: courbe` ne dessine rien ; il dit quelle lecture s'ouvre en
 * premier. L'auteur sait ce que son tableau veut dire — une descente de charge
 * se regarde en barres, une portée en courbe —, et l'ignorer ferait ouvrir
 * quarante-cinq lignes de chiffres là où un dessin répondait.
 *
 * Ce n'est qu'un défaut : le lecteur change d'avis d'un clic, et c'est
 * précisément le sens de « choisi à la lecture ».
 *
 * ## Ce que ce fichier ne fait pas
 *
 * **Il ne dessine pas.** Il rend des séries de nombres ; la géométrie vit dans
 * `trace-dun-graphique.js`, et le dessin dans la vue.
 *
 * **Il ne mélange pas deux grandeurs sur une grille.** Une colonne en mètres et
 * une colonne en kilonewtons dessinées ensemble se croisent là où elles ne se
 * croisent pas, et l'on lit un rapport qui n'existe pas. Les colonnes d'une
 * autre grandeur que la première sont **écartées**, et l'écran le dit.
 */

import { couperLUnite, estMesuree, lireUnNombre } from "./memoire-en-texte.js";
import { convertir } from "./unites-du-metier.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les façons de regarder un tableau.
 *
 * Trois, et elles suffisent. Une quatrième — un nuage, une matrice — est une
 * question qu'on se pose devant un tableau qu'on a, et non d'avance.
 */
export const LECTURE = {
  /** Les lignes, en clair. C'est ce qui se vérifie, et jamais ce qui s'invente. */
  TABLEAU: "tableau",
  /** Une ligne brisée par colonne : ce qui **varie** se voit. */
  COURBE: "courbe",
  /** Une barre par ligne : ce qui se **compare** se voit. */
  BARRES: "barres"
};

/** Ce que chaque lecture montre, dit à celui qui choisit. */
export const DIT_DE_LA_LECTURE = {
  [LECTURE.TABLEAU]: "les lignes en clair, pour les comparer au texte d'origine",
  [LECTURE.COURBE]: "une ligne brisée par colonne : ce qui varie se voit",
  [LECTURE.BARRES]: "une barre par ligne : ce qui se compare se voit"
};

/** Le mot qui déclare la lecture qu'une fonction suggère. */
export const SE_LIT_EN = "se lit en";

/** La lecture demandée, ramenée à celles qui existent. */
export function lectureDite(valeur = "") {
  const dite = texte(valeur).toLowerCase();
  return Object.values(LECTURE).includes(dite) ? dite : "";
}

/** Une mesure lue d'une case : son nombre, son unité, et ce qui était écrit. */
function mesureDe(dite) {
  const dit = texte(dite);
  const coupe = couperLUnite(dit);
  return {
    nombre: estMesuree(dit) ? lireUnNombre(coupe.nombre) : NaN,
    unite: texte(coupe.unite),
    dite: dit
  };
}

/**
 * Les séries d'un tableau : une par colonne, avec l'abscisse en commun.
 *
 * **L'abscisse est la variable de boucle**, et il n'y a pas de choix à faire :
 * c'est ce qui change d'une ligne à l'autre, et tout le reste en découle. Une
 * abscisse qu'on choisirait à l'écran ferait dessiner une colonne contre une
 * autre, ce qui est un nuage de points — une autre question.
 *
 * **Les colonnes d'une autre grandeur que la première sont écartées**, et
 * nommées : une colonne en mètres et une en kilonewtons sur la même grille se
 * croisent là où elles ne se croisent pas.
 *
 * @param {{nom, colonnes, lignes}} tableau tel que `deroulerLaBoucle` le rend
 * @returns {{abscisse: string, unite: string, series: object[],
 *   ecartees: string[], dessinable: boolean}}
 */
export function seriesDuTableau(tableau = null) {
  const abscisse = texte(tableau?.nom);
  const colonnes = (tableau?.colonnes ?? []).map(texte).filter(Boolean);
  const lignes = Array.isArray(tableau?.lignes) ? tableau.lignes : [];

  const rien = { abscisse, unite: "", series: [], ecartees: [], dessinable: false };
  if (!abscisse || !colonnes.length || !lignes.length) return rien;

  // L'abscisse doit être une suite de nombres : une boucle en produit toujours
  // une, mais un tableau qui viendrait d'ailleurs, non.
  const abscisses = lignes.map((une) => mesureDe(une?.valeur));
  if (abscisses.some((une) => !Number.isFinite(une.nombre))) return rien;

  const uniteX = abscisses[0].unite;
  const xs = abscisses.map((une) => convertir(une.nombre, une.unite, uniteX));
  if (xs.some((un) => un === null)) return rien;

  const series = [];
  const ecartees = [];
  let uniteY = null;

  for (const colonne of colonnes) {
    const cases = lignes.map((ligne) => (ligne?.cases ?? [])
      .find((une) => texte(une?.nom) === colonne));

    const mesures = cases.map((une) => (une?.connu ? mesureDe(une.valeur) : null));
    const tenues = mesures.filter(Boolean).filter((une) => Number.isFinite(une.nombre));
    // Une colonne qu'aucune ligne n'a su calculer n'a rien à dessiner. Elle
    // reste au tableau, avec ses cases vides : c'est là qu'on la lit.
    if (!tenues.length) { ecartees.push(colonne); continue; }

    /**
     * **L'unité de la première colonne décide pour toutes.**
     *
     * Une colonne d'une autre grandeur ne se ramène pas — `convertir` rend
     * `null` —, aucun de ses points ne se pose, et elle est écartée plus bas
     * comme une colonne vide. C'est la règle des unités qui tranche, et elle
     * tranche une fois : un second contrôle écrit ici dirait la même chose
     * jusqu'au jour où l'un des deux changerait (règle 10).
     */
    if (uniteY === null) uniteY = tenues[0].unite;

    const points = [];
    for (const [rang, mesure] of mesures.entries()) {
      if (!mesure || !Number.isFinite(mesure.nombre)) continue;
      const y = convertir(mesure.nombre, mesure.unite, uniteY);
      if (y === null) continue;
      points.push({ x: xs[rang], y, dit: abscisses[rang].dite, vaut: mesure.dite });
    }

    if (points.length) series.push({ nom: colonne, points, unite: uniteY });
    else ecartees.push(colonne);
  }

  return {
    abscisse,
    unite: uniteX,
    series,
    ecartees,
    // **Deux points au moins**, sur au moins une colonne : un dessin d'un seul
    // point n'est pas un dessin, c'est une ligne du tableau.
    dessinable: series.some((une) => une.points.length >= 2)
  };
}

/**
 * La lecture qui va de soi pour ce tableau, quand la fonction n'en suggère pas.
 *
 * **Le tableau reste le défaut**, et ce n'est pas de la timidité : c'est lui
 * qui se compare au texte d'origine, et c'est la vérification. Un dessin qui
 * s'ouvrirait tout seul ferait croire qu'on a vérifié parce qu'on a regardé.
 */
export function lectureQuiVaDeSoi(tableau = null, suggeree = "") {
  const dite = lectureDite(suggeree);
  if (!dite) return LECTURE.TABLEAU;

  // Une lecture suggérée qu'on ne peut pas dessiner retombe sur le tableau :
  // un cadre vide se lirait comme un dessin qui n'a pas su s'afficher.
  if (dite === LECTURE.TABLEAU) return LECTURE.TABLEAU;
  return seriesDuTableau(tableau).dessinable ? dite : LECTURE.TABLEAU;
}

/**
 * La lecture retenue : ce qu'on a choisi, ce que la fonction suggère, le tableau.
 *
 * **Ce qu'on a choisi à la main gagne, et ne se perd pas à la frappe
 * suivante.** Un dessin qui se refermerait à chaque caractère tapé dans le
 * formulaire ne se regarderait jamais — et c'est précisément quand on tape
 * qu'on veut voir la courbe bouger.
 *
 * Un choix devenu impossible — la fonction a changé, le tableau n'a plus qu'une
 * ligne — retombe sur ce qui va de soi, plutôt que d'ouvrir un cadre vide.
 */
export function lectureRetenue(tableau = null, { choisie = "", suggeree = "" } = {}) {
  const dite = lectureDite(choisie);
  if (dite && lecturesPossibles(tableau).includes(dite)) return dite;
  return lectureQuiVaDeSoi(tableau, suggeree);
}

/**
 * Les lectures qu'on peut offrir devant ce tableau.
 *
 * **On n'offre pas un dessin impossible.** Un bouton qui ouvre un cadre vide
 * apprend à ne plus cliquer sur les boutons.
 */
export function lecturesPossibles(tableau = null) {
  return seriesDuTableau(tableau).dessinable
    ? Object.values(LECTURE)
    : [LECTURE.TABLEAU];
}

/**
 * Ce que l'écran dit des colonnes qu'il n'a pas dessinées.
 *
 * Les taire ferait un dessin qui a l'air complet : on compterait trois courbes
 * là où le tableau a quatre colonnes, sans qu'un mot dise laquelle manque
 * (règle 5).
 */
export function phraseDesEcartees(ecartees = []) {
  const tues = (Array.isArray(ecartees) ? ecartees : []).map(texte).filter(Boolean);
  if (!tues.length) return "";

  return tues.length === 1
    ? `« ${tues[0]} » n'est pas dessinée : elle ne mesure pas la même chose que les autres, ou n'a rien à montrer.`
    : `${tues.map((un) => `« ${un} »`).join(", ")} ne sont pas dessinées : elles ne mesurent pas la même chose que les autres, ou n'ont rien à montrer.`;
}
