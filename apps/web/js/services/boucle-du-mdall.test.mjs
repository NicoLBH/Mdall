/**
 * `pour chaque` : la suite des valeurs, et ce qu'une colonne vaut.
 *
 * **Ce qui se prouve ici est ce qui se décide sans rien évaluer.** Le
 * déroulement du corps, lui, vit dans l'évaluateur avec le reste, et s'éprouve
 * là-bas.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  PLUS_LONG_TABLEAU, REFUS_DE_LA_BOUCLE,
  agregerUneColonne, bornesLitterales, lireUnAgregat, lireUnePourChaque,
  phraseDuRefusDeLaBoucle, valeursDeLaBoucle
} from "./boucle-du-mdall.js";
import { AGREGAT, DIT_DE_LAGREGAT, PHRASE_DE_LAGREGAT, phraseDeLAgregat } from "./memoire-en-texte.js";

const dites = (boucle) => valeursDeLaBoucle(boucle).valeurs.map((une) => une.dite);

/* ── Lire une tête de boucle ─────────────────────────────────────────────── */

test("une tête de boucle se lit en toutes lettres, dans l'ordre où on la dit", () => {
  // « de 2 à 90 pas 2 » se taperait plus vite et se relirait moins bien — et
  // c'est une note de calcul qu'on relit des années après.
  assert.deepEqual(lireUnePourChaque("Portée de 2 m à 90 m par pas de 2 m"),
    { nom: "Portée", de: "2 m", a: "90 m", pas: "2 m" });

  // Un nom à plusieurs mots, comme partout ailleurs dans le langage.
  assert.deepEqual(lireUnePourChaque("Hauteur du plancher de 2,5 m à 4 m par pas de 0,5 m"),
    { nom: "Hauteur du plancher", de: "2,5 m", a: "4 m", pas: "0,5 m" });

  // **Une borne peut être un nom** : `Portée` vient du projet, et la boucle ne
  // sait jusqu'où aller qu'au lancement.
  assert.deepEqual(lireUnePourChaque("Point de 0 m à Portée par pas de 0,5 m"),
    { nom: "Point", de: "0 m", a: "Portée", pas: "0,5 m" });

  // Le « à » s'accepte sans son accent : on tape au clavier français, mais pas
  // toujours.
  assert.equal(lireUnePourChaque("Rang de 1 a 5 par pas de 1")?.a, "5");
});

test("une tête qu'on ne sait pas lire rend rien, plutôt qu'une boucle vide", () => {
  // L'appelant la refuse en la nommant ; une boucle vide se déroulerait sans
  // rien faire, et personne ne saurait pourquoi.
  assert.equal(lireUnePourChaque("Portée de 2 m à 90 m"), null);
  assert.equal(lireUnePourChaque("Portée par pas de 2 m"), null);
  assert.equal(lireUnePourChaque(""), null);
  assert.equal(lireUnePourChaque(), null);
});

test("les bornes écrites en clair se distinguent de celles qui viennent du projet", () => {
  // Ce qui est écrit en clair se vérifie **à la lecture**, et c'est là qu'une
  // faute de frappe se corrige le moins cher.
  assert.equal(bornesLitterales({ de: "2 m", a: "90 m", pas: "2 m" }), true);
  assert.equal(bornesLitterales({ de: "0 m", a: "Portée", pas: "0,5 m" }), false);
  assert.equal(bornesLitterales({}), false);
});

/* ── La suite des valeurs ────────────────────────────────────────────────── */

test("la suite va du départ à la fin, et la fin en fait partie quand le pas tombe juste", () => {
  assert.deepEqual(dites({ de: "2 m", a: "10 m", pas: "2 m" }), ["2 m", "4 m", "6 m", "8 m", "10 m"]);
  // **Jamais au-delà de la fin annoncée** : dépasser serait un piège silencieux.
  assert.deepEqual(dites({ de: "0", a: "10", pas: "3" }), ["0", "3", "6", "9"]);
  // Un départ égal à la fin fait une ligne : la suite est parcourue, elle ne
  // tient qu'en un point.
  assert.deepEqual(dites({ de: "5 m", a: "5 m", pas: "1 m" }), ["5 m"]);
});

test("les trois bornes se ramènent à l'unité de départ, comme partout ailleurs", () => {
  // `de 20 cm à 2 m par pas de 20 cm` est une suite de centimètres : c'est
  // l'unité qu'on a écrite en premier qui décide.
  const suite = dites({ de: "20 cm", a: "1 m", pas: "20 cm" });
  assert.deepEqual(suite, ["20 cm", "40 cm", "60 cm", "80 cm", "100 cm"]);
});

test("le bruit du binaire ne s'accumule pas d'un pas à l'autre", () => {
  /**
   * **Une boucle qui s'arrête « quand on dépasse » accumule l'erreur** : `0,1`
   * ajouté dix fois ne vaut pas `1`, et la dernière ligne manquerait. Le compte
   * se calcule une fois, et chaque valeur se pose par multiplication depuis le
   * départ.
   */
  const suite = dites({ de: "0", a: "1", pas: "0,1" });
  assert.equal(suite.length, 11);
  assert.equal(suite.at(-1), "1");
  assert.deepEqual(suite.slice(0, 4), ["0", "0,1", "0,2", "0,3"]);

  /**
   * **Et le compte lui-même se calcule au juste nécessaire.** `0,3 / 0,1` vaut
   * `2,9999999999999996` en binaire : arrondi vers le bas sans précaution, il
   * fait trois lignes au lieu de quatre — la dernière, celle qu'on cherche,
   * manque, et le tableau a l'air complet.
   */
  assert.deepEqual(dites({ de: "0", a: "0,3", pas: "0,1" }), ["0", "0,1", "0,2", "0,3"]);
});

test("une suite qui ne finirait jamais se refuse, et dit laquelle", () => {
  const refus = (boucle) => valeursDeLaBoucle(boucle).refus;

  assert.equal(refus({ de: "2 m", a: "10 m", pas: "0 m" }), REFUS_DE_LA_BOUCLE.PAS_NUL);
  // Le pas s'éloigne de la fin : la suite s'en irait à l'infini.
  assert.equal(refus({ de: "10 m", a: "2 m", pas: "2 m" }), REFUS_DE_LA_BOUCLE.SENS);
  // Écrit dans l'autre sens, elle descend — et c'est parfaitement normal.
  assert.deepEqual(dites({ de: "10 m", a: "8 m", pas: "-1 m" }), ["10 m", "9 m", "8 m"]);
});

test("des bornes qui ne mesurent pas la même chose se refusent, et nomment les grandeurs", () => {
  const rendu = valeursDeLaBoucle({ de: "2 m", a: "10 kN", pas: "2 m" });
  assert.equal(rendu.refus, REFUS_DE_LA_BOUCLE.UNITES);
  assert.match(phraseDuRefusDeLaBoucle(rendu.refus, rendu.ou), /une longueur et une force — m et kN/);

  /**
   * **C'est le pas qui est étranger ici**, et c'est lui qu'il faut nommer. Sans
   * ce contrôle, le refus tombait sur la conversion et citait le départ contre
   * la fin — deux mètres, qui vont très bien ensemble : on aurait cherché la
   * faute là où elle n'est pas.
   */
  const parLePas = valeursDeLaBoucle({ de: "1 m", a: "10 m", pas: "1 kN" });
  assert.equal(parLePas.refus, REFUS_DE_LA_BOUCLE.UNITES);
  assert.match(phraseDuRefusDeLaBoucle(parLePas.refus, parLePas.ou), /m et kN/);
});

test("une borne qui n'est pas un nombre se refuse en la citant", () => {
  const rendu = valeursDeLaBoucle({ de: "2 m", a: "Portée", pas: "2 m" });
  assert.equal(rendu.refus, REFUS_DE_LA_BOUCLE.PAS_UN_NOMBRE);
  assert.match(phraseDuRefusDeLaBoucle(rendu.refus, rendu.ou), /« Portée » n'est pas un nombre/);
});

test("un tableau plus long qu'on ne relit se refuse, et dit combien il ferait", () => {
  /**
   * **Ce n'est pas une limite technique, c'est une limite de lecture.** Le gain
   * de cette forme est qu'on relit les lignes une à une contre l'original ; un
   * tableau de dix mille lignes ne se relit pas, et l'on aurait rendu le langage
   * aussi opaque que le tableur qu'il remplace.
   */
  const juste = valeursDeLaBoucle({ de: "1", a: String(PLUS_LONG_TABLEAU), pas: "1" });
  assert.equal(juste.valeurs.length, PLUS_LONG_TABLEAU);

  const trop = valeursDeLaBoucle({ de: "1", a: String(PLUS_LONG_TABLEAU + 1), pas: "1" });
  assert.equal(trop.refus, REFUS_DE_LA_BOUCLE.TROP_LONG);
  // **On refuse, on ne tronque pas** : un tableau coupé rendrait un total faux
  // sans un mot.
  assert.deepEqual(trop.valeurs, []);
  assert.match(phraseDuRefusDeLaBoucle(trop.refus, trop.ou),
    new RegExp(`${PLUS_LONG_TABLEAU + 1} lignes`));
});

/* ── Lire un agrégat ─────────────────────────────────────────────────────── */

test("un agrégat se lit à sa phrase, et une expression ordinaire n'en est pas un", () => {
  assert.deepEqual(lireUnAgregat("le plus grand de Moment"),
    { quoi: AGREGAT.PLUS_GRAND, colonne: "Moment" });
  assert.deepEqual(lireUnAgregat("la somme de Charge en pied"),
    { quoi: AGREGAT.SOMME, colonne: "Charge en pied" });

  // Ce qui n'est pas un agrégat est un calcul ordinaire, et le calculateur s'en
  // charge : ne pas rendre `null` ici lui volerait ses expressions.
  assert.equal(lireUnAgregat("Prix HT * 20%"), null);
  assert.equal(lireUnAgregat("la somme de"), null);
  assert.equal(lireUnAgregat(""), null);

  /**
   * **La phrase s'arrête sur un blanc**, et c'est ce qui la distingue du
   * français. « la somme des charges » n'est pas un agrégat : sans ce blanc,
   * elle se lirait comme la somme d'une colonne nommée « s charges », qui
   * n'existe nulle part — et la fonction resterait muette sans qu'un mot dise
   * pourquoi.
   */
  assert.equal(lireUnAgregat("la somme des charges"), null);
  assert.equal(lireUnAgregat("le nombre demandé"), null);
});

test("chaque agrégat se relit tel qu'il se tape, et dit ce qu'il fait", () => {
  for (const [phrase, quoi] of PHRASE_DE_LAGREGAT) {
    assert.equal(phraseDeLAgregat({ quoi, colonne: "Moment" }), `${phrase} Moment`);
    assert.ok(DIT_DE_LAGREGAT[quoi], `${quoi} ne dit pas ce qu'il fait`);
    // Et la phrase se relit : l'aller-retour doit être exact, sinon une règle
    // versée se réécrirait autrement qu'elle n'a été signée.
    assert.deepEqual(lireUnAgregat(`${phrase} Moment`), { quoi, colonne: "Moment" });
  }
});

/* ── Agréger une colonne ─────────────────────────────────────────────────── */

const colonne = (...valeurs) => valeurs.map((valeur) => ({ valeur }));

test("les cinq agrégats disent ce qu'ils annoncent", () => {
  const cases = colonne("1 m", "2 m", "3 m");
  assert.equal(agregerUneColonne(AGREGAT.SOMME, cases).valeur, "6 m");
  assert.equal(agregerUneColonne(AGREGAT.PLUS_GRAND, cases).valeur, "3 m");
  assert.equal(agregerUneColonne(AGREGAT.PLUS_PETIT, cases).valeur, "1 m");
  assert.equal(agregerUneColonne(AGREGAT.MOYENNE, cases).valeur, "2 m");
  assert.equal(agregerUneColonne(AGREGAT.COMBIEN, cases).valeur, "3");
});

test("toutes les valeurs se ramènent à l'unité de la première", () => {
  // C'est la règle des unités, appliquée à une colonne : sans elle, une cote en
  // centimètres au milieu d'une colonne en mètres ferait un total faux.
  assert.equal(agregerUneColonne(AGREGAT.SOMME, colonne("1 m", "50 cm")).valeur, "1,5 m");
  assert.equal(agregerUneColonne(AGREGAT.SOMME, colonne("50 cm", "1 m")).valeur, "150 cm");
  assert.equal(agregerUneColonne(AGREGAT.PLUS_GRAND, colonne("50 cm", "1 m")).valeur, "100 cm");
});

test("une ligne qu'on n'a pas su calculer ne compte pas, et ne vaut pas zéro", () => {
  /**
   * **Un total qui compterait les trous comme des zéros serait plus petit que
   * la réalité**, et rien ne le dirait. Le nombre de lignes retenues se lit
   * d'ailleurs, par « le nombre de ».
   */
  const cases = colonne("1 m", "", "3 m");
  assert.equal(agregerUneColonne(AGREGAT.SOMME, cases).valeur, "4 m");
  assert.equal(agregerUneColonne(AGREGAT.MOYENNE, cases).valeur, "2 m");
  assert.equal(agregerUneColonne(AGREGAT.COMBIEN, cases).valeur, "2");
});

test("une colonne qui mélange deux grandeurs ne s'agrège pas", () => {
  // Une longueur et une force ne s'additionnent pas : on ne rend rien plutôt
  // qu'un total faux.
  const rendu = agregerUneColonne(AGREGAT.SOMME, colonne("1 m", "2 kN"));
  assert.equal(rendu.connu, false);
  assert.equal(rendu.valeur, "");
});

test("une colonne vide ne rend rien, sauf qu'elle est vide", () => {
  assert.equal(agregerUneColonne(AGREGAT.SOMME, []).connu, false);
  assert.equal(agregerUneColonne(AGREGAT.PLUS_GRAND, colonne("", "")).connu, false);
  // Zéro ligne est une réponse, et une réponse juste.
  assert.equal(agregerUneColonne(AGREGAT.COMBIEN, []).valeur, "0");
});
