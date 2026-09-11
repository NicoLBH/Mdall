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
  const { assertions, motif } = liaisonDeLAvis({ avis: avis("Zone de neige"), assertions: MEMOIRE });

  assert.deepEqual(assertions.map((a) => a.id), ["neige"]);
  assert.equal(motif, LIAISON.PAR_LE_SUJET);
  assert.match(phraseDeLaLiaison(motif), /nomme cette valeur/);
});

test("le nom peut être noyé dans une phrase, il reste reconnu", () => {
  const { assertions } = liaisonDeLAvis({
    avis: avis("Vérification de la Classe de sol EC8 retenue pour le projet"), assertions: MEMOIRE
  });
  assert.deepEqual(assertions.map((a) => a.id), ["sol"]);
});

test("le sujet le plus long l'emporte", () => {
  // « Zone de neige » dit plus que « Zone » : c'est lui qu'on retient.
  const memoire = [...MEMOIRE, { id: "zone", superseded_by: null, payload: { subject: "Zone" } }];
  const { assertions } = liaisonDeLAvis({ avis: avis("Zone de neige du bâtiment"), assertions: memoire });
  assert.deepEqual(assertions.map((a) => a.id), ["neige"]);
});

/**
 * Le défaut qui rendait tout le mécanisme muet sur un projet réel, et le plus
 * difficile à voir : un rapport de bureau de contrôle intitule ses lignes
 * « Neige », « Vent » — des mots de tableau, pas des noms de valeur. La mémoire
 * dit « Zone de neige ». Le contenant et le contenu sont **inversés**, et ne
 * chercher que dans un sens laissait dehors exactement les avis qui couvrent
 * quelque chose.
 */
test("un intitulé plus court que le sujet l'accroche aussi", () => {
  const { assertions, motif } = liaisonDeLAvis({ avis: avis("Neige"), assertions: MEMOIRE });

  assert.deepEqual(assertions.map((a) => a.id), ["neige"]);
  assert.equal(motif, LIAISON.PAR_LE_SUJET);
});

test("le sens direct l'emporte sur le sens inverse", () => {
  // « Zone de neige » nomme le sujet en entier : cela dit plus que d'en être un
  // morceau, et c'est ce qu'on retient.
  const memoire = [...MEMOIRE, { id: "zone", superseded_by: null, payload: { subject: "Zone" } }];
  const { assertions } = liaisonDeLAvis({ avis: avis("Zone de neige"), assertions: memoire });

  assert.deepEqual(assertions.map((a) => a.id), ["neige"]);
});

/* ── Ce qu'on refuse de reconnaître ──────────────────────────────────────── */

test("un intitulé contenu dans plusieurs sujets différents n'accroche rien", () => {
  // « Zone » est dans « Zone de neige », « Zone de vent » et « Zone de
  // sismicité ». Trois sujets **différents**, et rien ne les départage : c'est
  // une vraie ambiguïté, pas la même chose que plusieurs portées d'un sujet.
  const { assertions, motif } = liaisonDeLAvis({ avis: avis("Zone"), assertions: MEMOIRE });

  assert.deepEqual(assertions, []);
  assert.equal(motif, LIAISON.SANS_SUJET);
});

test("un intitulé trop court ne sert pas à reconnaître", () => {
  // « CF », « L », « S » sont des codes de mission ou de degré, pas des noms :
  // ils se retrouveraient dans la moitié de la mémoire.
  const memoire = [{ id: "cf", superseded_by: null, payload: { subject: "Degré CF du plancher" } }];

  assert.deepEqual(liaisonDeLAvis({ avis: avis("CF"), assertions: memoire }).assertions, []);
});

/**
 * Le cœur du fichier. Un avis mal accroché couvrirait une valeur que personne
 * n'a examinée, **en silence** : la variante dirait « couvert par un avis
 * favorable » sur une valeur que le bureau de contrôle n'a jamais regardée.
 */
test("un nom qui n'est pas dans la mémoire ne s'accroche à rien", () => {
  const { assertions, motif } = liaisonDeLAvis({ avis: avis("Zonage climatique"), assertions: MEMOIRE });

  assert.deepEqual(assertions, []);
  assert.equal(motif, LIAISON.SANS_SUJET);
});

test("on ne reconnaît que des mots entiers", () => {
  // « sol » est dans « solive », « vent » dans « éventuel ». Un `includes` nu
  // accrocherait la classe de sol sur une solive de plancher.
  for (const titre of ["Solives du plancher haut", "Dispositions éventuelles de sécurité"]) {
    const { assertions } = liaisonDeLAvis({
      avis: avis(titre),
      assertions: [{ id: "x", superseded_by: null, payload: { subject: "sol" } },
        { id: "y", superseded_by: null, payload: { subject: "vent" } }]
    });
    assert.deepEqual(assertions, [], `« ${titre} » ne doit rien accrocher`);
  }
});

/**
 * Le défaut trouvé sur un projet réel. Ce module **refusait** d'accrocher quand
 * plusieurs portées partageaient le sujet, au motif que rien dans « Zone de
 * neige » ne dit s'il s'agit du bâtiment A ou du B. Prudent dans l'abstrait,
 * stérilisant dans le réel : quatre portées sur « Neige » et « Vent », donc
 * aucun avis accroché, donc aucun engagement, donc tout le mécanisme inerte.
 *
 * En choisir une serait deviner ; n'en choisir aucune perdait l'information.
 * Toutes est exactement ce que le rapport dit.
 */
test("un sujet porté par plusieurs zones s'accroche à toutes", () => {
  const memoire = [
    { id: "neige-a", superseded_by: null, payload: { subject: "Zone de neige" }, zones: ["batiment-a"] },
    { id: "neige-b", superseded_by: null, payload: { subject: "Zone de neige" }, zones: ["batiment-b"] }
  ];

  const { assertions, motif } = liaisonDeLAvis({ avis: avis("Zone de neige"), assertions: memoire });

  assert.deepEqual(assertions.map((a) => a.id), ["neige-a", "neige-b"]);
  assert.equal(motif, LIAISON.TOUTES_LES_PORTEES);
  // Et l'écran doit pouvoir le dire : personne ne doit découvrir après coup que
  // l'avis couvrait quatre lignes.
  assert.match(phraseDeLaLiaison(motif), /plusieurs parties de l'ouvrage/);
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
  const { assertions } = liaisonDeLAvis({
    avis: { title_raw: "", description_raw: "La Zone de vent retenue appelle une remarque." },
    assertions: MEMOIRE
  });
  assert.deepEqual(assertions.map((a) => a.id), ["vent"]);
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
  assert.deepEqual(proposees.map((p) => p.assertions.map((a) => a.id)), [["neige"], []]);
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

  assert.deepEqual(favorable.assertions.map((a) => a.id), suspendu.assertions.map((a) => a.id));
});
