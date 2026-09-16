/**
 * La courbe d'activité, dessinée.
 *
 * ## Ce que ces gardes attrapent
 *
 * **Une ligne plate là où l'on n'a rien lu.** Elle dirait « ce projet n'a rien
 * vécu de l'année » : c'est une information, et on ne l'a pas (règle 5). C'est
 * le seul défaut de ce fichier qui ment à l'écran — les autres se voient.
 *
 * **Une courbe qui sort de son cadre** : un sommet collé au bord est coupé de
 * moitié par l'épaisseur du trait, et l'on croit la courbe écrêtée.
 *
 * **Un projet mis à l'échelle d'un autre** : chaque courbe monte jusqu'à son
 * propre maximum, sinon un chantier calme à côté d'un chantier très actif est
 * une ligne plate — et l'on ne voit pas qu'il a repris le mois dernier.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { renderCourbeDactivite, titreDeLaCourbe } from "./courbe-dactivite.js";

/** Les points du tracé, lus dans le balisage. */
function pointsDe(html) {
  const trouve = html.match(/points="([^"]+)"/);
  if (!trouve) return [];
  return trouve[1].split(" ").map((point) => point.split(",").map(Number));
}

/**
 * **Rien plutôt qu'une ligne à zéro.** `null` veut dire « on n'a pas regardé »,
 * et une courbe plate répondrait à une question qu'on n'a pas posée.
 */
test("sans lecture, aucune courbe n'est dessinée", () => {
  const html = renderCourbeDactivite({ valeurs: null });

  assert.match(html, /courbe-activite--inconnue/);
  assert.doesNotMatch(html, /<svg/, "pas de tracé du tout");
  assert.doesNotMatch(html, /polyline/);
});

/** Lu et vide, c'est une autre phrase : le projet n'a rien vécu, et ça se dit. */
test("lue et vide, la courbe est plate et en bas", () => {
  const points = pointsDe(renderCourbeDactivite({ valeurs: [0, 0, 0, 0] }));

  assert.equal(points.length, 4);
  const hauteurs = new Set(points.map(([, y]) => y));
  assert.equal(hauteurs.size, 1, "une seule hauteur");
  assert.ok(points[0][1] > 20, "et c'est le bas du cadre");
});

/**
 * **Chaque projet à son propre maximum.** Deux courbes de volumes très
 * différents ont la même forme quand elles ont le même dessin ; c'est ce qu'on
 * veut d'une liste, où l'on cherche « celui-ci a repris ».
 */
test("le sommet d'une courbe touche le haut du cadre, quel que soit son volume", () => {
  const petite = pointsDe(renderCourbeDactivite({ valeurs: [0, 1, 0] }));
  const grande = pointsDe(renderCourbeDactivite({ valeurs: [0, 400, 0] }));

  assert.deepEqual(petite, grande, "la forme ne dépend pas du volume");
  assert.ok(petite[1][1] < petite[0][1], "le sommet est plus haut que le creux");
});

/**
 * Un sommet posé sur le bord serait coupé de moitié par l'épaisseur du trait :
 * on croirait la courbe écrêtée là où elle est simplement au maximum.
 */
test("la courbe garde une marge en haut et en bas", () => {
  const points = pointsDe(renderCourbeDactivite({ valeurs: [0, 5, 2, 5, 0] }));

  for (const [x, y] of points) {
    assert.ok(y >= 1 && y <= 27, `la hauteur ${y} reste dans le cadre`);
    assert.ok(x >= 0 && x <= 100, `l'abscisse ${x} reste dans le cadre`);
  }
});

/** Les points couvrent toute la largeur : une courbe serrée à gauche se lit mal. */
test("la courbe occupe toute la largeur, du premier au dernier point", () => {
  const points = pointsDe(renderCourbeDactivite({ valeurs: [1, 2, 3, 4, 5] }));

  assert.equal(points[0][0], 0);
  assert.equal(points.at(-1)[0], 100);
});

/** Une seule semaine ne fait pas une ligne : on la pose au milieu. */
test("une seule valeur se pose au centre", () => {
  const points = pointsDe(renderCourbeDactivite({ valeurs: [7] }));

  assert.equal(points.length, 1);
  assert.equal(points[0][0], 50);
});

/**
 * **La couleur se décide dans la feuille de style.** Les deux teintes du
 * dégradé sont lues par variable CSS : un vert écrit dans le SVG serait un
 * second vert à retoucher le jour où celui de l'application change (règle 4).
 */
test("les teintes viennent de la feuille de style, pas du dessin", () => {
  const html = renderCourbeDactivite({ valeurs: [1, 2] });

  assert.match(html, /stop-color="var\(--courbe-activite-bas\)"/);
  assert.match(html, /stop-color="var\(--courbe-activite-haut\)"/);
  assert.doesNotMatch(html, /#[0-9a-fA-F]{3,6}"/, "aucune couleur écrite en dur");
});

/** Sombre en bas, clair en haut : le dégradé monte, il ne descend pas. */
test("le dégradé va du bas vers le haut du cadre", () => {
  const html = renderCourbeDactivite({ valeurs: [1, 2] });
  const degrade = html.slice(html.indexOf("<linearGradient"), html.indexOf("</linearGradient>"));

  assert.match(degrade, /gradientUnits="userSpaceOnUse"/,
    "calé sur le cadre : en unités de boîte, une courbe plate n'aurait aucune hauteur");
  assert.match(degrade, /y1="28"/, "le bas du cadre");
  assert.match(degrade, /y2="0"/, "le haut");

  const bas = degrade.indexOf("--courbe-activite-bas");
  const haut = degrade.indexOf("--courbe-activite-haut");
  assert.ok(bas < haut, "la teinte sombre est au départ du dégradé");
});

/**
 * **Un identifiant par courbe.** Un `id` répété dans une page fait que toutes
 * les courbes pointent vers le premier dégradé rencontré : rien ne se verrait
 * tant qu'elles se ressemblent, et le jour où l'une change de teinte les autres
 * suivraient sans qu'on comprenne.
 */
test("deux courbes voisines ne partagent pas leur dégradé", () => {
  const une = renderCourbeDactivite({ valeurs: [1, 2], cle: "p-a" });
  const autre = renderCourbeDactivite({ valeurs: [1, 2], cle: "p-b" });

  const nomDe = (html) => html.match(/<linearGradient id="([^"]+)"/)?.[1];

  assert.equal(nomDe(une), "courbe-activite-p-a");
  assert.notEqual(nomDe(une), nomDe(autre));
  assert.match(une, new RegExp(`stroke="url\\(#${nomDe(une)}\\)"`), "et le trait pointe vers le sien");
});

/** Une clé qui n'est pas un identifiant valide ne casse pas le dessin. */
test("une clé douteuse est nettoyée", () => {
  const html = renderCourbeDactivite({ valeurs: [1], cle: 'p"><script>' });

  assert.match(html, /<linearGradient id="courbe-activite-pscript"/);
  assert.doesNotMatch(html, /<script>/);
});

/** Une forme sans chiffre laisse deviner un ordre de grandeur qu'elle n'a pas. */
test("le survol dit le total et la fenêtre", () => {
  assert.equal(titreDeLaCourbe(1), "1 mouvement sur les douze derniers mois");
  assert.equal(titreDeLaCourbe(34), "34 mouvements sur les douze derniers mois");
  assert.equal(titreDeLaCourbe(0), "Aucun mouvement sur les douze derniers mois");

  assert.match(renderCourbeDactivite({ valeurs: [2], titre: titreDeLaCourbe(2) }), /title="2 mouvements/);
});
