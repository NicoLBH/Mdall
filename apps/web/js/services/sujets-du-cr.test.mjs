import test from "node:test";
import assert from "node:assert/strict";

import { DEJA, phraseDuDeja, phraseDuPoint, sujetsDuCompteRendu, titreAplati } from "./sujets-du-cr.js";

/** Un point vérifié, tel que le serveur le rend. Aucune entreprise réelle. */
const point = (reste = {}) => ({
  key: "cr:12.02.1",
  titre: "Le ferraillage du voile V12 ne suit pas le plan BA-102",
  description: "Le ferraillage du voile V12 ne suit pas le plan BA-102.",
  lot: "02 — GROS ŒUVRE", reference: "12.02.1",
  qui: "Entreprise du lot 02", echeance: "10/09", etat: "nouveau",
  provenance: { source_id: "doc-1", page: 3, excerpt: "12.02.1  Le ferraillage…" },
  ...reste
});

/* ── Ce qui se propose ───────────────────────────────────────────────────── */

test("un point neuf se propose", () => {
  const { proposes, deja } = sujetsDuCompteRendu({ lus: [point()] });

  assert.equal(proposes.length, 1);
  assert.equal(proposes[0].key, "cr:12.02.1");
  assert.deepEqual(deja, []);
});

/* ── Le report, et c'est tout le problème ────────────────────────────────── */

/**
 * Un compte rendu **reporte** : la douzième réunion reprend les points de la
 * onzième, qui reprenait ceux de la dixième. C'est sa raison d'être — un point
 * reste écrit tant qu'il n'est pas soldé. Verser tout ce qu'il porte ouvrirait
 * douze fois le même sujet.
 */
test("un point déjà versé sous son numéro ne se rouvre pas", () => {
  const { proposes, deja } = sujetsDuCompteRendu({
    lus: [point()],
    connus: [{ kind: "sujet", subject_key: "cr:12.02.1" }]
  });

  assert.deepEqual(proposes, []);
  assert.equal(deja[0].motif, DEJA.MEME_NUMERO);
});

/**
 * « Déjà versé » et « déjà écarté » n'appellent pas la même réaction. Le premier
 * se vérifie dans les sujets ; le second demande de savoir **pourquoi** on a dit
 * non — et l'annoncer comme un versement ferait chercher un sujet qui n'existe
 * pas.
 */
test("un point déjà écarté ne se repose pas, et ne se dit pas « versé »", () => {
  const { proposes, deja } = sujetsDuCompteRendu({
    lus: [point()],
    connus: [{ kind: "sujet", subject_key: "cr:12.02.1", status: "rejected" }]
  });

  assert.deepEqual(proposes, [], "on ne repose pas une question tranchée");
  assert.equal(deja[0].motif, DEJA.DEJA_ECARTE);
  assert.match(phraseDuDeja(deja[0].motif), /écarté/);
});

test("un sujet du projet qui porte le même titre arrête le point", () => {
  const { proposes, deja } = sujetsDuCompteRendu({
    lus: [point()],
    sujetsDuProjet: [{ id: "s-9", title: "Le ferraillage du voile V12 ne suit pas le plan BA-102." }]
  });

  assert.deepEqual(proposes, []);
  assert.equal(deja[0].motif, DEJA.MEME_TITRE);
  // « Déjà suivi » sans dire lequel est une affirmation qu'on ne peut pas
  // vérifier : le sujet voyage avec le motif.
  assert.equal(deja[0].sujet.id, "s-9");
});

test("un point final, une majuscule ou une apostrophe courbe ne font pas un point nouveau", () => {
  assert.equal(
    titreAplati("L\u2019enrobage du voile V12 est insuffisant en pied."),
    titreAplati("L'ENROBAGE DU VOILE V12 EST INSUFFISANT EN PIED")
  );
});

/**
 * Ce qui, en revanche, ne doit surtout pas se confondre : un trait d'union
 * porte un sens dans une référence de plan. « BA-102 » et « BA 102 » peuvent
 * être deux plans, et les fondre ferait taire un point sur le second.
 */
test("le trait d'union d'une référence de plan est gardé", () => {
  assert.notEqual(
    titreAplati("Le plan BA-102 n'est pas suivi"),
    titreAplati("Le plan BA 102 n'est pas suivi")
  );
});

test("deux comptes rendus du même dépôt qui se recouvrent ne proposent qu'une fois", () => {
  const { proposes, deja } = sujetsDuCompteRendu({
    lus: [point(), point({ provenance: { source_id: "doc-2", page: 3, excerpt: "…" } })]
  });

  assert.equal(proposes.length, 1);
  assert.equal(deja[0].motif, DEJA.DANS_LE_LOT);
});

/**
 * L'erreur inverse, et elle est pire. Écarter un point parce qu'il ressemble à
 * un autre ferait taire une observation nouvelle sur un ouvrage déjà discuté.
 */
test("une observation nouvelle sur le même ouvrage se propose quand même", () => {
  const autre = point({
    key: "cr:12.02.7",
    titre: "L'enrobage du voile V12 est insuffisant en pied",
    reference: "12.02.7"
  });

  const { proposes } = sujetsDuCompteRendu({
    lus: [autre],
    connus: [{ kind: "sujet", subject_key: "cr:12.02.1" }]
  });

  assert.equal(proposes.length, 1);
});

/* ── Ce qu'on ne prend pas pour un doublon ───────────────────────────────── */

test("une affirmation de la mémoire qui n'est pas un sujet n'arrête rien", () => {
  // Un avis et un point de chantier peuvent porter la même clé par accident ;
  // seules les lignes de nature « sujet » disent qu'un point a été versé.
  const { proposes } = sujetsDuCompteRendu({
    lus: [point()],
    connus: [{ kind: "avis", subject_key: "cr:12.02.1" }]
  });

  assert.equal(proposes.length, 1);
});

test("un point sans titre n'est ni proposé ni compté comme écarté", () => {
  const { proposes, deja } = sujetsDuCompteRendu({ lus: [point({ titre: "" })] });
  assert.deepEqual(proposes, []);
  assert.deepEqual(deja, []);
});

test("sans numéro, la clé se fait sur le titre", () => {
  const { proposes } = sujetsDuCompteRendu({ lus: [point({ key: "", reference: null })] });
  assert.match(proposes[0].key, /^cr:le ferraillage/);
});

/* ── Ce que ça se dit ────────────────────────────────────────────────────── */

test("un point se lit par son lot, ce qu'il dit, et à qui il est demandé", () => {
  assert.equal(
    phraseDuPoint(point()),
    "02 — GROS ŒUVRE · 12.02.1 — Le ferraillage du voile V12 ne suit pas le plan BA-102"
      + " — pour Entreprise du lot 02, échéance 10/09"
  );
});

test("ce qui n'est pas écrit ne s'invente pas", () => {
  // Un point sans échéance se lit sans échéance : il ne devient pas urgent.
  const nu = phraseDuPoint(point({ lot: null, reference: null, qui: null, echeance: null }));
  assert.equal(nu, "Le ferraillage du voile V12 ne suit pas le plan BA-102");
});

test("la phrase d'un point ne parle jamais comme un outil de visa", () => {
  const dit = phraseDuPoint(point());
  for (const interdit of [/visa/i, /à valider/i, /approbation/i]) {
    assert.doesNotMatch(dit, interdit);
  }
});
