import assert from "node:assert/strict";
import test from "node:test";

import { ECART, aplati, verifierLesCitations } from "./citation-verifiee.js";

// Aucun document réel : les phrases et les noms sont inventés.

// ── Ce que l'aplatissement efface ──────────────────────────────────────────

test("les accents, la casse et les espaces ne font pas deux phrases", () => {
  assert.equal(aplati("  Le SUPPORT   est humide  "), aplati("le support est humide"));
});

test("l'apostrophe d'un traitement de texte s'efface", () => {
  assert.equal(aplati("l’acrotère"), aplati("l'acrotère"));
  assert.equal(aplati("“W”"), aplati('"W"'));
});

// ── Une puce ne fait plus échouer une citation ─────────────────────────────

test("une énumération recollée en une phrase se retrouve", () => {
  // Le cas réel : le modèle recopie deux lignes d'une liste et laisse tomber le
  // tiret du milieu. Les deux moitiés sont là, mot pour mot, et la citation
  // était pourtant écartée — c'était la citation pivot d'un litige.
  const source = aplati("- K = 2 * R / d avec :\n  - R = 10,8 m\n  - d = 20,5 m\n- M = 3800 kg");
  assert.ok(source.includes(aplati("K = 2 * R / d avec : - R = 10,8 m - d = 20,5 m M = 3800 kg")));
});

test("une puce se lit de la même façon quel que soit son signe", () => {
  assert.equal(aplati("- le support est humide"), aplati("• le support est humide"));
  assert.equal(aplati("*   le support est humide"), aplati("le support est humide"));
});

test("un mot manquant reste écarté : la porte ne se desserre pas sur le fond", () => {
  // C'est la limite de ce relâchement : la ponctuation se pardonne, pas les
  // mots. Sur le fil réel, un « pas » sauté avait — à raison — fait écarter.
  assert.equal(
    aplati("il ne faut pas non plus additionner").includes(aplati("il ne faut non plus additionner")),
    false
  );
});

test("un tiret dans un mot ou un nombre n'est pas une puce", () => {
  // « au-delà » et « 2021-2022 » ne sont pas des listes : les couper
  // rapprocherait des textes qui diffèrent.
  assert.ok(aplati("au-delà des exigences").includes("au-dela"));
  assert.ok(aplati("l'arrêté 2021-2022").includes("2021-2022"));
});

// ── La porte ───────────────────────────────────────────────────────────────

test("une citation qui se retrouve dans sa page passe, et le dit", () => {
  const { retenus, ecartes } = verifierLesCitations({
    lignes: [{ page: 2, citation: "Le support est humide.", intitule: "humidité" }],
    pages: [{ page: 2, text: "Au droit de l'acrotère : Le support est humide. Rien d'autre." }],
    estVide: (ligne) => !ligne.intitule
  });
  assert.equal(ecartes.length, 0);
  assert.equal(retenus[0].pageVerifiee, true);
});

test("une citation qu'on ne retrouve nulle part est écartée", () => {
  const { retenus, ecartes } = verifierLesCitations({
    lignes: [{ page: 2, citation: "Le chantier est arrêté.", intitule: "arrêt" }],
    pages: [{ page: 2, text: "Le support est humide." }],
    estVide: (ligne) => !ligne.intitule
  });
  assert.equal(retenus.length, 0);
  assert.equal(ecartes[0].motif, ECART.INTROUVABLE);
});

test("une citation trouvée ailleurs est gardée, mais change de page, et cela se compte", () => {
  const { retenus, pagesCorrigees } = verifierLesCitations({
    lignes: [{ page: 1, citation: "Le support est humide.", intitule: "humidité" }],
    pages: [{ page: 1, text: "Rien à signaler." }, { page: 2, text: "Le support est humide." }],
    estVide: (ligne) => !ligne.intitule
  });
  assert.equal(retenus[0].page, 2);
  assert.equal(retenus[0].pageVerifiee, false);
  assert.equal(pagesCorrigees, 1);
});

test("une ligne sans citation ne se croit pas sur parole", () => {
  const { ecartes } = verifierLesCitations({
    lignes: [{ page: 1, citation: "", intitule: "humidité" }],
    pages: [{ page: 1, text: "Le support est humide." }],
    estVide: (ligne) => !ligne.intitule
  });
  assert.equal(ecartes[0].motif, ECART.SANS_CITATION);
});
