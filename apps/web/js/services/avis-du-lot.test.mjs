import test from "node:test";
import assert from "node:assert/strict";

import { avisDuLot, titreDuLot } from "./avis-du-lot.js";

/** La mémoire d'un projet. Aucun nom réel, aucune commune réelle. */
const MEMOIRE = [
  { id: "neige", superseded_by: null, payload: { subject: "Zone de neige", value: "A1" } },
  { id: "vent", superseded_by: null, payload: { subject: "Zone de vent", value: "3" } }
];

const avis = (reference, titre, opinion, sourceId, page = 8) => ({
  title_raw: titre,
  value: { external_reference_raw: reference, external_reference_normalized: reference, opinion_raw: opinion },
  opinion_label: opinion,
  provenance: { source_id: sourceId, page }
});

/** Un rapport, tel que le moteur le rend : des pages, un nom, une date. */
const rapport = (sourceId, nom, lignes, issuedAt = "2026-03-12") => ({
  source_id: sourceId,
  issued_at: issuedAt,
  metadata: { filename: nom },
  pages: [{ page: 1, text: lignes.join("\n") }]
});

const ENTETE_SOCOTEC = [
  "Email : responsable@socotec.com",
  "SOCOTEC Construction - S.A.S. au capital de 9 116 700 euros - 834 157 513 RCS Versailles"
];

/* ── Un document, un émetteur ────────────────────────────────────────────── */

/**
 * Le cœur du fichier. Reconnaître l'organisme sur le lot entier attribuerait
 * les avis de l'un à l'autre — en silence, et pour toujours.
 */
test("chaque document porte son propre émetteur", () => {
  const lot = avisDuLot({
    sources: [
      rapport("doc-1", "rapport-initial.pdf", ENTETE_SOCOTEC),
      rapport("doc-2", "rapport-confrere.pdf", ["Contact : bureau@apave.fr"])
    ],
    avis: [avis("2.1.3", "Zone de neige", "Favorable", "doc-1"),
      avis("4.2", "Zone de vent", "Suspendu", "doc-2")],
    assertions: MEMOIRE
  });

  assert.deepEqual(lot.documents.map((document) => document.emetteur.organisme.label), ["SOCOTEC", "APAVE"]);
  assert.equal(lot.versables[0].emisPar, "SOCOTEC");
  assert.equal(lot.versables[1].emisPar, "APAVE");
});

test("un document dont l'émetteur n'est pas certain se compte, et ses avis entrent quand même", () => {
  // Un avis est un fait du projet : le retenir parce qu'on ne sait pas qui l'a
  // signé perdrait le fait **et** la question.
  const lot = avisDuLot({
    sources: [rapport("doc-1", "compte-rendu.pdf", ["Compte rendu de réunion de chantier n° 4."])],
    avis: [avis("2.1.3", "Zone de neige", "Favorable", "doc-1")],
    assertions: MEMOIRE
  });

  assert.equal(lot.sansEmetteur, 1);
  assert.equal(lot.versables.length, 1);
  assert.equal(lot.versables[0].emisPar, "");
});

/* ── Ce qui ne revient pas une deuxième fois ─────────────────────────────── */

/**
 * Sans cela, relancer l'analyse reproposerait les quarante mêmes lignes, et
 * la mémoire finirait par porter quarante versions identiques d'un même avis.
 */
test("un avis déjà en mémoire à l'identique ne se repropose pas", () => {
  const memoire = [...MEMOIRE, {
    id: "avis-1", superseded_by: null,
    payload: { subject: "Avis de contrôle technique n° 2.1.3", value: "Favorable — Zone de neige" }
  }];

  const lot = avisDuLot({
    sources: [rapport("doc-1", "rapport.pdf", ENTETE_SOCOTEC)],
    avis: [avis("2.1.3", "Zone de neige", "Favorable", "doc-1")],
    assertions: memoire
  });

  assert.deepEqual(lot.versables, []);
  assert.equal(lot.dejaVerses, 1, "et ça se compte : le taire ferait croire que le rapport était vide");
});

test("un avis dont la teneur a changé revient, lui", () => {
  // Suspendu devenu favorable : c'est une valeur nouvelle, elle se verse
  // par-dessus (règle 11), et la mémoire garde les deux à leurs dates.
  const memoire = [...MEMOIRE, {
    id: "avis-1", superseded_by: null,
    payload: { subject: "Avis de contrôle technique n° 2.1.3", value: "Suspendu — Zone de neige" }
  }];

  const lot = avisDuLot({
    sources: [rapport("doc-1", "rapport.pdf", ENTETE_SOCOTEC)],
    avis: [avis("2.1.3", "Zone de neige", "Favorable", "doc-1")],
    assertions: memoire
  });

  assert.equal(lot.versables.length, 1);
  assert.match(lot.versables[0].valeur, /^Favorable/);
});

test("une ligne périmée ne fait pas écran à son remplaçant", () => {
  const memoire = [{
    id: "vieux", superseded_by: "neuf",
    payload: { subject: "Avis de contrôle technique n° 2.1.3", value: "Favorable — Zone de neige" }
  }];

  const lot = avisDuLot({
    sources: [rapport("doc-1", "rapport.pdf", ENTETE_SOCOTEC)],
    avis: [avis("2.1.3", "Zone de neige", "Favorable", "doc-1")],
    assertions: memoire
  });

  assert.equal(lot.versables.length, 1);
});

/* ── Ce que le lot rend, et qu'il ne cache pas ───────────────────────────── */

test("ce qui n'est pas accroché entre, et se compte", () => {
  const lot = avisDuLot({
    sources: [rapport("doc-1", "rapport.pdf", ENTETE_SOCOTEC)],
    avis: [
      avis("2.1.3", "Zone de neige", "Favorable", "doc-1"),
      avis("2.1.4", "Dispositions constructives", "Suspendu", "doc-1")
    ],
    assertions: MEMOIRE
  });

  assert.equal(lot.versables.length, 2);
  assert.equal(lot.accroches, 1);
  assert.equal(lot.sansLiaison, 1);
});

test("un avis n'est rattaché qu'au document dont il sort", () => {
  // Sa provenance le dit. S'en remettre à l'ordre des avis rattacherait la
  // moitié du lot au mauvais rapport, et donc au mauvais organisme.
  const lot = avisDuLot({
    sources: [rapport("doc-1", "un.pdf", ENTETE_SOCOTEC), rapport("doc-2", "deux.pdf", ENTETE_SOCOTEC)],
    avis: [avis("2.1.3", "Zone de neige", "Favorable", "doc-2")],
    assertions: MEMOIRE
  });

  assert.deepEqual(lot.documents.map((document) => document.versables.length), [0, 1]);
  assert.equal(lot.versables[0].documentId, "doc-2");
  assert.match(lot.versables[0].provenance.quoi, /deux\.pdf/);
});

test("un lot vide ne propose rien, et ne casse pas", () => {
  const lot = avisDuLot({});
  assert.deepEqual(lot.versables, []);
  assert.equal(lot.accroches, 0);
});

/* ── Ce que la proposition dira d'elle-même ──────────────────────────────── */

test("le titre nomme le lot, jamais un avis", () => {
  const lot = avisDuLot({
    sources: [rapport("doc-1", "rapport.pdf", ENTETE_SOCOTEC)],
    avis: [avis("2.1.3", "Zone de neige", "Favorable", "doc-1"),
      avis("2.1.4", "Dispositions constructives", "Suspendu", "doc-1")],
    assertions: MEMOIRE
  });

  const { titre, description } = titreDuLot(lot, { le: "2026-03-12" });

  assert.match(titre, /Avis SOCOTEC/);
  assert.match(titre, /2 avis/);
  // Ce qui n'a pas été accroché se lit **avant** la signature : c'est cela
  // qu'on relit, et c'est la seule occasion de le voir.
  assert.match(description, /1 n'ont pas été accrochés|1 n'a pas/);
});

test("deux organismes dans le lot ne se laissent pas résumer en un nom", () => {
  const lot = avisDuLot({
    sources: [rapport("doc-1", "un.pdf", ENTETE_SOCOTEC),
      rapport("doc-2", "deux.pdf", ["Contact : bureau@apave.fr"])],
    avis: [avis("2.1.3", "Zone de neige", "Favorable", "doc-1"),
      avis("4.2", "Zone de vent", "Suspendu", "doc-2")],
    assertions: MEMOIRE
  });

  assert.match(titreDuLot(lot).titre, /^Avis de contrôle technique/);
});
