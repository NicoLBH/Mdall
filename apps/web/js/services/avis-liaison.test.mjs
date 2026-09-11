import test from "node:test";
import assert from "node:assert/strict";

import {
  LIAISON, intituleDeLAvis, liaisonDeLAvis, liaisonsProposees, phraseDeLaLiaison
} from "./avis-liaison.js";

/** La mémoire d'un projet. Aucun nom réel, aucune commune réelle. */
const MEMOIRE = [
  { id: "neige", superseded_by: null, payload: { subject: "Zone de neige", value: "A1" } },
  { id: "vent", superseded_by: null, payload: { subject: "Zone de vent", value: "3" } },
  { id: "sol", superseded_by: null, payload: { subject: "Classe de sol EC8", value: "B" } },
  { id: "hg", superseded_by: null, payload: { subject: "Profondeur hors gel", value: "0,47 m" } }
];

const avis = (titre, reste = {}) => ({ title_raw: titre, ...reste });

/* ── Ce qu'on reconnaît ──────────────────────────────────────────────────── */

test("un intitulé qui nomme un sujet l'accroche", () => {
  const { assertion, motif } = liaisonDeLAvis({ avis: avis("Zone de neige"), assertions: MEMOIRE });

  assert.equal(assertion.id, "neige");
  assert.equal(motif, LIAISON.PAR_LE_SUJET);
  assert.match(phraseDeLaLiaison(motif), /nomme cette valeur/);
});

test("le nom peut être noyé dans une phrase, il reste reconnu", () => {
  const { assertion } = liaisonDeLAvis({
    avis: avis("Vérification de la Classe de sol EC8 retenue pour le projet"), assertions: MEMOIRE
  });
  assert.equal(assertion.id, "sol");
});

test("le sujet le plus long l'emporte", () => {
  // « Zone de neige » dit plus que « Zone » : c'est lui qu'on retient.
  const memoire = [...MEMOIRE, { id: "zone", superseded_by: null, payload: { subject: "Zone" } }];
  const { assertion } = liaisonDeLAvis({ avis: avis("Zone de neige du bâtiment"), assertions: memoire });
  assert.equal(assertion.id, "neige");
});

/* ── Ce qu'on refuse de reconnaître ──────────────────────────────────────── */

/**
 * Le cœur du fichier. Un avis mal accroché couvrirait une valeur que personne
 * n'a examinée, **en silence** : la variante dirait « couvert par un avis
 * favorable » sur une valeur que le bureau de contrôle n'a jamais regardée.
 */
test("un nom qui n'est pas dans la mémoire ne s'accroche à rien", () => {
  const { assertion, motif } = liaisonDeLAvis({ avis: avis("Zonage climatique"), assertions: MEMOIRE });

  assert.equal(assertion, null);
  assert.equal(motif, LIAISON.SANS_SUJET);
});

test("on ne reconnaît que des mots entiers", () => {
  // « sol » est dans « solive », « vent » dans « éventuel ». Un `includes` nu
  // accrocherait la classe de sol sur une solive de plancher.
  for (const titre of ["Solives du plancher haut", "Dispositions éventuelles de sécurité"]) {
    const { assertion } = liaisonDeLAvis({
      avis: avis(titre),
      assertions: [{ id: "x", superseded_by: null, payload: { subject: "sol" } },
        { id: "y", superseded_by: null, payload: { subject: "vent" } }]
    });
    assert.equal(assertion, null, `« ${titre} » ne doit rien accrocher`);
  }
});

test("un sujet porté par plusieurs zones ne se départage pas depuis un rapport", () => {
  // Rien dans « Zone de neige » ne dit s'il s'agit du bâtiment A ou du B. En
  // choisir un accrocherait l'avis sur la moitié du projet, au hasard.
  const memoire = [
    { id: "neige-a", superseded_by: null, payload: { subject: "Zone de neige" }, zones: ["batiment-a"] },
    { id: "neige-b", superseded_by: null, payload: { subject: "Zone de neige" }, zones: ["batiment-b"] }
  ];

  const { assertion, motif, candidats } = liaisonDeLAvis({ avis: avis("Zone de neige"), assertions: memoire });

  assert.equal(assertion, null);
  assert.equal(motif, LIAISON.PLUSIEURS);
  assert.deepEqual(candidats, ["neige-a", "neige-b"]);
});

test("une valeur remplacée ne s'accroche plus", () => {
  // On n'accroche que sur ce qui vaut aujourd'hui : accrocher sur une ligne
  // périmée écrirait un engagement mort-né.
  const memoire = [{ id: "vieux", superseded_by: "neuf", payload: { subject: "Zone de neige" } }];
  assert.equal(liaisonDeLAvis({ avis: avis("Zone de neige"), assertions: memoire }).motif, LIAISON.SANS_SUJET);
});

test("un avis sans intitulé ne s'accroche à rien, et le dit autrement", () => {
  const { motif } = liaisonDeLAvis({ avis: avis(""), assertions: MEMOIRE });
  assert.equal(motif, LIAISON.SANS_INTITULE);
});

/* ── Ce qu'on lit dans l'avis ────────────────────────────────────────────── */

test("le commentaire sert d'intitulé quand il n'y en a pas", () => {
  // Certains rapports se lisent ligne à ligne et ne portent pas de titre : la
  // phrase du commentaire est alors tout ce qu'on a.
  const { assertion } = liaisonDeLAvis({
    avis: { title_raw: "", description_raw: "La Zone de vent retenue appelle une remarque." },
    assertions: MEMOIRE
  });
  assert.equal(assertion.id, "vent");
});

test("la référence du rapport ne sert jamais à reconnaître", () => {
  // « 2.1.3 » numérote une place dans un rapport, il ne nomme rien du projet.
  assert.equal(intituleDeLAvis({ value: { external_reference_raw: "2.1.3" } }), "");
});

/* ── Le lot ──────────────────────────────────────────────────────────────── */

test("tous les avis sont rendus, y compris ceux qu'on n'accroche pas", () => {
  // Un avis escamoté parce qu'on ne savait pas quoi en faire est exactement ce
  // qu'on ne veut pas : il faut le voir, et voir qu'il n'est accroché à rien.
  const proposees = liaisonsProposees({
    avis: [avis("Zone de neige"), avis("Dispositions constructives générales")],
    assertions: MEMOIRE
  });

  assert.equal(proposees.length, 2);
  assert.deepEqual(proposees.map((p) => p.assertion?.id ?? null), ["neige", null]);
  assert.deepEqual(proposees.map((p) => p.motif), [LIAISON.PAR_LE_SUJET, LIAISON.SANS_SUJET]);
});

test("la teneur de l'avis n'entre jamais dans la reconnaissance", () => {
  // Un avis défavorable s'accroche exactement comme un favorable — c'est même
  // celui-là qu'on veut voir tomber quand la valeur change.
  const favorable = liaisonDeLAvis({
    avis: avis("Zone de neige", { value: { opinion_raw: "F" } }), assertions: MEMOIRE
  });
  const suspendu = liaisonDeLAvis({
    avis: avis("Zone de neige", { value: { opinion_raw: "S" } }), assertions: MEMOIRE
  });

  assert.equal(favorable.assertion.id, suspendu.assertion.id);
});
