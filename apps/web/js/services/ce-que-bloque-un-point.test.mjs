import test from "node:test";
import assert from "node:assert/strict";

import {
  ORDRE_DES_PRIORITES, ceQueBloqueUnPoint, conclusionsEnAval, ordreDesPointsOuverts,
  phraseDeCeQueBloque, prioriteSaisie, rangDeLaVersion
} from "./ce-que-bloque-un-point.js";
import { RANG } from "./ce-qui-couvre.js";
import { referenceDuPoint } from "./point-a-tranche.js";

/** Une affirmation de la mémoire, telle que la base la rend. */
function valeur(id, sujet, dite, charge = {}) {
  return { id, subject_key: sujet, payload: { subject: sujet, value: dite, ...charge } };
}

/** Une dépendance : `cible` repose sur `socle`. */
const repose = (cible, socle) => ({ assertion_id: cible, depends_on_assertion_id: socle });

const MEMOIRE = [
  valeur("v-alt", "Altitude", "742,30"),
  valeur("v-hg", "Profondeur hors gel", "0,80 m"),
  valeur("v-assise", "Assise minimale", "1,05 m"),
  valeur("v-semelle", "Largeur de semelle", "0,60 m"),
  valeur("v-neige", "Zone de neige", "A2")
];

const DEPENDANCES = [
  repose("v-hg", "v-alt"),
  repose("v-assise", "v-hg"),
  repose("v-semelle", "v-assise")
];

const LIENS = [{ subject_id: "p-altitude", assertion_id: "v-alt" }];

const UN_POINT = { id: "p-altitude", title: "L'altitude du seuil est-elle bien 742,30 ?", status: "open" };

/* ── La marche en aval ───────────────────────────────────────────────────── */

test("ce qu'un point bloque descend de proche en proche", () => {
  assert.deepEqual(conclusionsEnAval(["v-alt"], DEPENDANCES), ["v-hg", "v-assise", "v-semelle"]);
});

test("la valeur de départ n'est pas ce qu'elle bloque", () => {
  // Ce qu'un point bloque est ce qui **découle** de la valeur, pas la valeur
  // elle-même : celle-ci est déjà nommée à part, et la compter deux fois
  // gonflerait la portée de tous les points d'un cran.
  assert.ok(!conclusionsEnAval(["v-alt"], DEPENDANCES).includes("v-alt"));
  assert.deepEqual(conclusionsEnAval(["v-semelle"], DEPENDANCES), []);
  assert.deepEqual(conclusionsEnAval([], DEPENDANCES), []);
});

test("un cycle ne fige pas la marche", () => {
  // Un référentiel mal versé ne doit pas bloquer un écran, il doit se voir.
  const boucle = [repose("a", "b"), repose("b", "c"), repose("c", "a")];
  assert.deepEqual(conclusionsEnAval(["a"], boucle).sort(), ["b", "c"]);
});

/* ── La profondeur n'est pas l'importance ────────────────────────────────── */

test("un avis sur une seule conclusion pèse plus que quatorze conclusions nues", () => {
  // C'est la réserve qui commande tout le tri. Un ordre par nombre d'aval
  // mettrait en tête exactement ce qu'il ne faut pas regarder en premier.
  const profond = { id: "p-profond", title: "Quatorze en aval", status: "open" };
  const engage = { id: "p-engage", title: "Une seule, mais couverte", status: "open" };

  const memoire = [valeur("v-source", "Source", "x"), valeur("v-seule", "Seule", "y")];
  const dependances = [];
  for (let rang = 0; rang < 14; rang += 1) {
    memoire.push(valeur(`v-${rang}`, `Conclusion ${rang}`, "z"));
    dependances.push(repose(`v-${rang}`, "v-source"));
  }
  dependances.push(repose("v-seule-aval", "v-seule"));
  memoire.push(valeur("v-seule-aval", "Conclusion couverte", "z"));

  const liens = [
    { subject_id: "p-profond", assertion_id: "v-source" },
    { subject_id: "p-engage", assertion_id: "v-seule" }
  ];
  const couvertures = new Map([["v-seule-aval", { rang: RANG.CONTROLE_TECHNIQUE }]]);

  const ordre = ordreDesPointsOuverts([profond, engage], {
    liens, assertions: memoire, dependances: dependances, couvertures
  });

  assert.deepEqual(ordre.map((ligne) => ligne.point.id), ["p-engage", "p-profond"]);
  assert.equal(ordre[0].bilan.conclusions.length, 1);
  assert.equal(ordre[1].bilan.conclusions.length, 14);
});

test("à engagement égal, la portée départage", () => {
  const large = { id: "p-large", status: "open" };
  const etroit = { id: "p-etroit", status: "open" };

  const ordre = ordreDesPointsOuverts([etroit, large], {
    liens: [
      { subject_id: "p-large", assertion_id: "v-alt" },
      { subject_id: "p-etroit", assertion_id: "v-assise" }
    ],
    assertions: MEMOIRE,
    dependances: DEPENDANCES
  });

  assert.deepEqual(ordre.map((ligne) => ligne.point.id), ["p-large", "p-etroit"]);
});

/* ── Un point sans arête n'est pas un point qui ne bloque rien ───────────── */

test("un point qu'on n'a pas pesé ne se range pas parmi les pesés", () => {
  // Il n'a pas un coût nul : il n'a pas de coût **mesuré**. Le mêler aux autres
  // ferait croire qu'on l'a regardé (règle 5).
  const nu = { id: "p-nu", status: "open", priority: "critical" };
  const pese = { id: "p-pese", status: "open", priority: "low" };

  const ordre = ordreDesPointsOuverts([nu, pese], {
    liens: [{ subject_id: "p-pese", assertion_id: "v-semelle" }],
    assertions: MEMOIRE,
    dependances: DEPENDANCES
  });

  assert.deepEqual(ordre.map((ligne) => ligne.point.id), ["p-pese", "p-nu"]);
  assert.equal(ordre[1].bilan.mesure, false);
});

test("l'écran n'écrit pas « ne bloque rien » d'un point qu'on n'a pas pesé", () => {
  const bilan = ceQueBloqueUnPoint({ id: "p-nu", status: "open" }, {
    liens: [], assertions: MEMOIRE, dependances: DEPENDANCES
  });

  assert.equal(bilan.mesure, false);
  assert.equal(bilan.phrase, "");
  assert.equal(bilan.rang, RANG.RIEN);
});

test("entre points non pesés, le champ saisi départage encore", () => {
  // Quelqu'un l'a écrit, et un constat ne devient pas faux (règle 6).
  const ordre = ordreDesPointsOuverts([
    { id: "p-bas", status: "open", priority: "low" },
    { id: "p-haut", status: "open", priority: "critical" },
    { id: "p-moyen", status: "open", priority: "medium" }
  ], { liens: [], assertions: MEMOIRE, dependances: DEPENDANCES });

  assert.deepEqual(ordre.map((ligne) => ligne.point.id), ["p-haut", "p-moyen", "p-bas"]);
});

test("à tout égal, le point qui traîne depuis le plus longtemps passe devant", () => {
  // Un ordre qui dépendrait de celui où la base a rendu ses lignes se relirait
  // différemment à chaque chargement.
  const ordre = ordreDesPointsOuverts([
    { id: "p-recent", status: "open", created_at: "2026-09-01" },
    { id: "p-ancien", status: "open", created_at: "2026-03-01" }
  ], { liens: [], assertions: MEMOIRE, dependances: DEPENDANCES });

  assert.deepEqual(ordre.map((ligne) => ligne.point.id), ["p-ancien", "p-recent"]);
});

/* ── L'échelon que les points apportent ──────────────────────────────────── */

test("une valeur produite par un point fermé a été tranchée avec l'équipe", () => {
  const tranchee = valeur("v-hg", "Profondeur hors gel", "0,80 m", {
    reference: referenceDuPoint("p-ferme")
  });
  const points = [{ id: "p-ferme", status: "closed" }];

  assert.equal(rangDeLaVersion(tranchee, { points }), RANG.EQUIPE);
});

test("un point encore ouvert n'a rien tranché, et un point inconnu non plus", () => {
  // Le supposer fermé ferait dire « tranché avec l'équipe » d'un débat en cours,
  // et le supposer tout court ferait dire d'un point qu'on n'a pas lu (règle 5).
  const tranchee = valeur("v-hg", "Profondeur hors gel", "0,80 m", {
    reference: referenceDuPoint("p-x")
  });

  assert.equal(rangDeLaVersion(tranchee, { points: [{ id: "p-x", status: "open" }] }), RANG.RIEN);
  assert.equal(rangDeLaVersion(tranchee, { points: [] }), RANG.RIEN);
});

test("l'acte et le débat se croisent, et le plus coûteux l'emporte", () => {
  const tranchee = valeur("v-hg", "Profondeur hors gel", "0,80 m", {
    reference: referenceDuPoint("p-ferme")
  });
  const points = [{ id: "p-ferme", status: "closed" }];

  const parLeBureau = new Map([["v-hg", { rang: RANG.CONTROLE_TECHNIQUE }]]);
  const parUneRelecture = new Map([["v-hg", { rang: RANG.INTERNE }]]);

  assert.equal(rangDeLaVersion(tranchee, { couvertures: parLeBureau, points }), RANG.CONTROLE_TECHNIQUE);
  assert.equal(rangDeLaVersion(tranchee, { couvertures: parUneRelecture, points }), RANG.EQUIPE);
});

test("c'est l'aval qui peut porter l'engagement, pas seulement la valeur visée", () => {
  // Une valeur nue dont dépend une conclusion couverte par un avis coûte cher à
  // casser. Ne regarder que ce sur quoi le point porte manquerait tout le prix.
  const couvertures = new Map([["v-semelle", { rang: RANG.CONTROLE_TECHNIQUE }]]);

  const bilan = ceQueBloqueUnPoint(UN_POINT, {
    liens: LIENS, assertions: MEMOIRE, dependances: DEPENDANCES, couvertures
  });

  assert.equal(bilan.rang, RANG.CONTROLE_TECHNIQUE);
  assert.equal(bilan.engagee.id, "v-semelle");
});

/* ── Ce que l'écran dit, et ce qu'il ne dit jamais ───────────────────────── */

test("la phrase dit ce qu'on peut aller vérifier, jamais un chiffre d'importance", () => {
  const couvertures = new Map([["v-semelle", { rang: RANG.CONTROLE_TECHNIQUE }]]);

  const bilan = ceQueBloqueUnPoint(UN_POINT, {
    liens: LIENS, assertions: MEMOIRE, dependances: DEPENDANCES, couvertures
  });

  assert.equal(
    bilan.phrase,
    "ce sujet porte sur une valeur dont dépendent 3 conclusions, "
    + "dont l'une est examinée par un bureau de contrôle"
  );
});

test("le mot de l'écran est « sujet », et aucun rang ne dit le mot d'un outil de visa", () => {
  // Règle 12 : le mot du métier reste dans le code et ne monte pas à l'écran.
  const couvertures = new Map([["v-alt", { rang: RANG.MAITRISE_DOEUVRE }]]);
  const bilan = ceQueBloqueUnPoint(UN_POINT, {
    liens: LIENS, assertions: MEMOIRE, dependances: DEPENDANCES, couvertures
  });

  assert.match(bilan.phrase, /^ce sujet /);
  assert.doesNotMatch(bilan.phrase, /\bpoints?\b/i);
  assert.doesNotMatch(bilan.phrase, /vis[ae]|valid|approu|importance|poids/i);
});

test("ce que personne n'a examiné se dit, au lieu de se taire", () => {
  const bilan = ceQueBloqueUnPoint(UN_POINT, {
    liens: LIENS, assertions: MEMOIRE, dependances: DEPENDANCES
  });

  assert.equal(
    bilan.phrase,
    "ce sujet porte sur une valeur dont dépendent 3 conclusions, et personne ne s'est prononcé dessus"
  );
});

test("une valeur dont rien ne dépend le dit aussi", () => {
  const bilan = ceQueBloqueUnPoint({ id: "p-bout", status: "open" }, {
    liens: [{ subject_id: "p-bout", assertion_id: "v-neige" }],
    assertions: MEMOIRE,
    dependances: DEPENDANCES
  });

  assert.equal(
    bilan.phrase,
    "ce sujet porte sur une valeur dont aucune conclusion ne dépend, et personne ne s'est prononcé dessus"
  );
});

test("l'engagement se dit au singulier, quel qu'en soit le nombre", () => {
  // En annoncer deux ferait croire qu'ils s'additionnent — et c'est justement ce
  // que le rang refuse de faire.
  const deux = new Map([
    ["v-assise", { rang: RANG.CONTROLE_TECHNIQUE }],
    ["v-semelle", { rang: RANG.CONTROLE_TECHNIQUE }]
  ]);
  const bilan = ceQueBloqueUnPoint(UN_POINT, {
    liens: LIENS, assertions: MEMOIRE, dependances: DEPENDANCES, couvertures: deux
  });

  assert.match(bilan.phrase, /dont l'une est examinée par un bureau de contrôle$/);
});

test("le pluriel de la portée est juste", () => {
  assert.match(
    phraseDeCeQueBloque({ mesure: true, valeurs: [1], conclusions: [1], rang: RANG.RIEN }),
    /une valeur dont dépend une conclusion,/
  );
  assert.match(
    phraseDeCeQueBloque({ mesure: true, valeurs: [1, 2], conclusions: [], rang: RANG.RIEN }),
    /^ce sujet porte sur 2 valeurs dont aucune conclusion ne dépend/
  );
});

/* ── Les fermés n'y sont pas, et le champ saisi survit ───────────────────── */

test("un point fermé ne se trie pas : il a fait son travail", () => {
  const ordre = ordreDesPointsOuverts([
    { id: "p-ferme", status: "closed" },
    { id: "p-double", status: "closed_duplicate" },
    { id: "p-ouvert", status: "open" }
  ], { liens: [], assertions: MEMOIRE, dependances: DEPENDANCES });

  assert.deepEqual(ordre.map((ligne) => ligne.point.id), ["p-ouvert"]);
});

test("les graphies anciennes du champ saisi restent reconnues", () => {
  // Elles sont écrites en base, et on ne réécrit pas ce que des gens ont posé.
  assert.equal(prioriteSaisie("p1"), "critical");
  assert.equal(prioriteSaisie("hight"), "high");
  assert.equal(prioriteSaisie("HIGH"), "high");
  assert.equal(prioriteSaisie(""), "");
  assert.deepEqual(ORDRE_DES_PRIORITES, ["low", "medium", "high", "critical"]);
});
