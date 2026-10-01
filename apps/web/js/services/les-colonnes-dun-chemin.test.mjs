import test from "node:test";
import assert from "node:assert/strict";

import {
  lesColonnesDunChemin, lesEtapesEnColonnes, phraseDesColonnes
} from "./les-colonnes-dun-chemin.js";

const nomsDesColonnes = (etapes) =>
  lesColonnesDunChemin(etapes).map((colonne) => colonne.map((une) => une.id));

/** Un pas de file : son identifiant, quand il a commencé, combien il a duré. */
const pas = (id, debut, ms) => ({ id, debut, ms });

/* ── Ce qui a tourné ensemble ────────────────────────────────────────────── */

/**
 * **Le défaut, dit par celui qui regarde.**
 *
 * « On voit bien que 3 tâches ont été lancées en même temps, mais le chemin les
 * dessine toujours les unes après les autres, de gauche à droite. »
 *
 * Dix-neuf comptes rendus lus trois par trois donnaient dix-neuf boîtes à la
 * suite — un dessin qui dit que le quatrième a attendu le troisième, et qui le
 * dit d'autant mieux que chaque boîte porte sa vraie durée.
 */
test("trois lectures lancées ensemble font une colonne", () => {
  assert.deepEqual(
    nomsDesColonnes([
      pas("a", 1000, 5000), pas("b", 1000, 4000), pas("c", 1000, 6000),
      pas("d", 7000, 3000), pas("e", 7000, 3000), pas("f", 7000, 2000)
    ]),
    [["a", "b", "c"], ["d", "e", "f"]]
  );
});

/** Ce qui se suit vraiment reste une file : une boîte par colonne. */
test("ce qui se suit ne s'empile pas", () => {
  assert.deepEqual(
    nomsDesColonnes([pas("a", 0, 1000), pas("b", 1000, 1000), pas("c", 2000, 1000)]),
    [["a"], ["b"], ["c"]]
  );
});

/**
 * **Le recouvrement se vérifie avec toute la colonne**, pas seulement avec la
 * dernière entrée. Sans cela, une chaîne d'étapes qui se chevauchent deux à
 * deux — a recouvre b, b recouvre c, mais a et c ne se sont jamais croisées —
 * se serait empilée tout entière, et le dessin aurait affirmé que trois choses
 * ont tourné ensemble alors que deux seulement l'ont fait à chaque instant.
 */
test("une colonne n'accueille que ce qui recouvre tout le monde", () => {
  assert.deepEqual(
    nomsDesColonnes([pas("a", 0, 100), pas("b", 90, 100), pas("c", 150, 100)]),
    [["a", "b"], ["c"]]
  );
});

/**
 * **Une étape qui tourne encore n'a pas de fin.** Elle recouvre donc tout ce
 * qui commence après elle, et c'est la vérité de l'instant où l'on regarde :
 * lui donner une fin immédiate la détacherait de ce qui tourne avec elle.
 */
test("ce qui tourne encore recouvre ce qui démarre", () => {
  assert.deepEqual(
    nomsDesColonnes([pas("a", 0, null), pas("b", 10, null), pas("c", 20, null)]),
    [["a", "b", "c"]]
  );
});

/**
 * **Une étape qui n'a pas commencé n'a pas de temps**, et n'est dans aucune
 * colonne. La ranger avec ses voisines affirmerait qu'elles partiront ensemble
 * — ce que personne ne sait, et ce qui est faux dès qu'une lecture déborde
 * (règle 5).
 */
test("ce qui attend reste seul, à sa place", () => {
  assert.deepEqual(
    nomsDesColonnes([
      pas("a", 1000, 2000), pas("b", 1000, 2000),
      pas("c", null, null), pas("d", null, null)
    ]),
    [["a", "b"], ["c"], ["d"]]
  );
});

/**
 * `Number(null)` vaut **0**, qui est un instant fini. Sans la question posée
 * avant la conversion, une étape en attente se rangerait au tout début de
 * l'exécution — avec celles qui ont réellement démarré à zéro.
 */
test("une attente ne se range pas à l'instant zéro", () => {
  assert.deepEqual(
    nomsDesColonnes([pas("attend", null, null), pas("partie", 0, 1000)]),
    [["attend"], ["partie"]]
  );
  assert.deepEqual(nomsDesColonnes([{ id: "vide", debut: "" }, pas("partie", 0, 1000)]),
    [["vide"], ["partie"]]);
  assert.deepEqual(nomsDesColonnes([{ id: "flou", debut: "plus tard" }, pas("partie", 0, 1000)]),
    [["flou"], ["partie"]]);
});

/** Rien à ranger : aucune colonne, et pas une colonne vide. */
test("un chemin sans étape n'a pas de colonne", () => {
  assert.deepEqual(lesColonnesDunChemin([]), []);
  assert.deepEqual(lesColonnesDunChemin(null), []);
  assert.deepEqual(lesColonnesDunChemin(), []);
});

/* ── Ce que le dessin consomme ───────────────────────────────────────────── */

/**
 * Le numéro est posé **sur l'étape** : le dessin n'a pas à refaire le
 * regroupement, et deux regroupements — un pour décider, un pour dessiner —
 * auraient fini par ne plus s'accorder (règle 4).
 */
test("chaque étape repart avec le numéro de sa colonne", () => {
  const etapes = lesEtapesEnColonnes([
    pas("a", 0, 100), pas("b", 10, 100), pas("c", 500, 100)
  ]);

  assert.deepEqual(etapes.map((une) => [une.id, une.colonne]),
    [["a", 0], ["b", 0], ["c", 1]]);
  // L'ordre donné est celui de la file : le relire autrement la lirait à
  // l'envers.
  assert.deepEqual(etapes.map((une) => une.id), ["a", "b", "c"]);
});

/** Et ce qui entrait ressort entier : la durée sert encore au dessin. */
test("l'étape garde ce qu'elle portait", () => {
  assert.deepEqual(lesEtapesEnColonnes([pas("a", 7, 42)])[0], { id: "a", debut: 7, ms: 42, colonne: 0 });
});

/* ── Ce que le chemin en dit ─────────────────────────────────────────────── */

/**
 * **Rien quand rien n'a été mené de front**, et c'est le cas le plus fréquent.
 * Une phrase sur chaque exécution ferait un gabarit qu'on apprend à ignorer, et
 * l'œil cesserait de la voir le jour où elle compte.
 */
test("une file ne dit rien de ses colonnes", () => {
  assert.equal(phraseDesColonnes([pas("a", 0, 100), pas("b", 200, 100)]), "");
  assert.equal(phraseDesColonnes([]), "");
});

/** Et quand il y en a, elle dit combien, et jusqu'à combien à la fois. */
test("le chemin dit ce qui a été mené de front", () => {
  const dit = phraseDesColonnes([
    pas("a", 0, 100), pas("b", 0, 100), pas("c", 0, 100),
    pas("d", 500, 100), pas("e", 500, 100)
  ]);

  assert.match(dit, /2 étapes du chemin ont été menées de front/);
  assert.match(dit, /jusqu'à 3 à la fois/);
});

/** Une seule colonne de front se dit au singulier. */
test("une seule colonne se dit au singulier", () => {
  const dit = phraseDesColonnes([pas("a", 0, 100), pas("b", 0, 100), pas("c", 500, 100)]);
  assert.match(dit, /1 étape du chemin a été menée de front/);
});
