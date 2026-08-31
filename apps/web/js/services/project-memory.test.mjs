import test from "node:test";
import assert from "node:assert/strict";

import { ITEM } from "./proposition-state.js";

import {
  MEMORY,
  assertionHistory,
  assertionsFromProposition,
  buildContextExport,
  currentAssertions,
  declaredHypothesis,
  describeAssertionFacts,
  planSupersessions,
  searchAssertions,
  summarizeMemory
} from "./project-memory.js";

const PROPOSITION = {
  id: "p-1",
  project_id: "proj-1",
  number: 4,
  merged_at: "2026-08-30T10:00:00Z",
  merged_by: "u-1"
};

const ITEMS = [
  {
    itemType: "avis",
    itemKey: "A12",
    status: "proposed",
    payload: { reference: "A12", title: "Étanchéité", status: "RESOLVED", previousStatus: "OPEN", opinion: "levé" }
  },
  {
    itemType: "avis",
    itemKey: "A41",
    status: "refused",
    reason: "le rapport ne concerne pas ce lot",
    payload: { reference: "A41", title: "Ventilation", status: "OPEN" }
  }
];

test("le silence verse comme assumé", () => {
  // C'est la règle de la revue : ce qu'on laisse tel quel est ce à quoi on ne
  // s'oppose pas. Le laisser « proposé » conserverait une question à laquelle on
  // a répondu en fusionnant.
  const lignes = assertionsFromProposition({ proposition: PROPOSITION, items: ITEMS });

  assert.equal(lignes[0].status, MEMORY.ASSUMED);
  assert.equal(lignes[1].status, MEMORY.REJECTED);
});

test("une affirmation écartée est versée elle aussi", () => {
  // Un refus est une information, et souvent la plus sûre : celui qui a ouvert
  // le PDF sait mieux que le moteur que ce rapport n'est pas de ce chantier.
  const lignes = assertionsFromProposition({ proposition: PROPOSITION, items: ITEMS });
  const ecartee = lignes.find((entry) => entry.subject_key === "A41");

  assert.equal(ecartee.status, MEMORY.REJECTED);
  assert.equal(ecartee.detail, "le rapport ne concerne pas ce lot", "la raison du refus survit");
});

test("chaque affirmation porte sa source et sa signature", () => {
  // Une mémoire sans provenance est une rumeur.
  const [premiere] = assertionsFromProposition({ proposition: PROPOSITION, items: ITEMS });

  assert.equal(premiere.proposition_id, "p-1");
  assert.equal(premiere.proposition_number, 4);
  assert.equal(premiere.decided_by, "u-1");
  assert.equal(premiere.decided_at, "2026-08-30T10:00:00Z", "la date est celle de la fusion, pas celle de l'écriture");
});

test("la phrase est écrite au moment où l'on tranche", () => {
  const [premiere] = assertionsFromProposition({ proposition: PROPOSITION, items: ITEMS });

  assert.equal(premiere.statement, "Avis A12 — Étanchéité");
  assert.match(premiere.detail, /levé/);
  assert.match(premiere.detail, /OPEN → RESOLVED/);
});

test("sans projet, rien n'est versé", () => {
  assert.deepEqual(assertionsFromProposition({ proposition: { id: "p-1" }, items: ITEMS }), []);
});

test("une affirmation nouvelle remplace celle qui portait la même clé", () => {
  // Un avis levé remplace le même avis émis. Sans cela, la mémoire devient un
  // tas de contradictions qui se valent.
  const existantes = [
    { id: "a-1", kind: "avis", subject_key: "A12", proposition_id: "p-0", superseded_by: null },
    { id: "a-2", kind: "avis", subject_key: "A99", proposition_id: "p-0", superseded_by: null }
  ];
  const nouvelles = assertionsFromProposition({ proposition: PROPOSITION, items: ITEMS });

  const plan = planSupersessions(existantes, nouvelles);

  assert.deepEqual(plan.map((entry) => entry.id), ["a-1"]);
});

test("une affirmation déjà remplacée ne l'est pas deux fois", () => {
  const existantes = [{ id: "a-1", kind: "avis", subject_key: "A12", proposition_id: "p-0", superseded_by: "a-9" }];
  const nouvelles = assertionsFromProposition({ proposition: PROPOSITION, items: ITEMS });

  assert.deepEqual(planSupersessions(existantes, nouvelles), []);
});

test("une proposition ne se remplace pas elle-même", () => {
  // Rejouer un versement ne doit pas transformer une affirmation en son propre
  // antécédent : le rattrapage des propositions déjà fusionnées se rejoue.
  const existantes = [{ id: "a-1", kind: "avis", subject_key: "A12", proposition_id: "p-1", superseded_by: null }];
  const nouvelles = assertionsFromProposition({ proposition: PROPOSITION, items: ITEMS });

  assert.deepEqual(planSupersessions(existantes, nouvelles), []);
});

test("l'état courant est ce qui n'a pas été remplacé", () => {
  const memoire = [
    { id: "a-1", kind: "avis", subject_key: "A12", status: MEMORY.ASSUMED, superseded_by: "a-2" },
    { id: "a-2", kind: "avis", subject_key: "A12", status: MEMORY.ASSUMED, superseded_by: null },
    { id: "a-3", kind: "avis", subject_key: "A41", status: MEMORY.REJECTED, superseded_by: null }
  ];

  assert.deepEqual(currentAssertions(memoire).map((entry) => entry.id), ["a-2", "a-3"]);
  assert.deepEqual(summarizeMemory(memoire), {
    total: 3,
    current: 2,
    assumed: 1,
    rejected: 1,
    superseded: 1
  });
});

test("la recherche porte sur ce qui se retient", () => {
  const memoire = [
    { kind: "avis", subject_key: "A12", statement: "Avis A12 — Étanchéité", detail: "levé", status: MEMORY.ASSUMED },
    { kind: "avis", subject_key: "A41", statement: "Avis A41 — Ventilation", detail: "", status: MEMORY.REJECTED },
    { kind: "document", subject_key: "d-1", statement: "Document au corpus : RICT.pdf", status: MEMORY.ASSUMED }
  ];

  assert.deepEqual(searchAssertions(memoire, { query: "etancheite" }).map((e) => e.subject_key), ["A12"]);
  assert.deepEqual(searchAssertions(memoire, { kind: "document" }).map((e) => e.subject_key), ["d-1"]);
  assert.deepEqual(searchAssertions(memoire, { status: MEMORY.REJECTED }).map((e) => e.subject_key), ["A41"]);
  assert.equal(searchAssertions(memoire, {}).length, 3);
});

test("ce qui a été remplacé ne se cherche que si on le demande", () => {
  const memoire = [{ kind: "avis", subject_key: "A12", statement: "Avis A12", superseded_by: "a-9" }];

  assert.equal(searchAssertions(memoire, {}).length, 0);
  assert.equal(searchAssertions(memoire, { includeSuperseded: true }).length, 1);
});

test("le dossier de contexte est déterministe", () => {
  // Même mémoire, même texte, à l'octet près : c'est ce qui permet de mettre un
  // préfixe en cache au lieu de le refacturer à chaque question.
  const memoire = [
    { kind: "avis", subject_key: "A41", statement: "Avis A41", status: MEMORY.ASSUMED, decided_at: "2026-08-30T10:00:00Z", proposition_number: 4 },
    { kind: "avis", subject_key: "A12", statement: "Avis A12", status: MEMORY.ASSUMED, decided_at: "2026-08-30T10:00:00Z", proposition_number: 4 }
  ];

  const premier = buildContextExport({ project: { name: "Aurora" }, assertions: memoire });
  const second = buildContextExport({ project: { name: "Aurora" }, assertions: [...memoire].reverse() });

  assert.equal(premier, second);
  assert.ok(premier.indexOf("A12") < premier.indexOf("A41"), "l'ordre est celui des clés, pas celui de la base");
});

test("le dossier dit ce qui a été remplacé, il ne le cache pas", () => {
  // Le taire ferait répondre comme si un CCTP périmé valait encore.
  const memoire = [
    { kind: "avis", subject_key: "A12", statement: "Avis A12", status: MEMORY.ASSUMED, decided_at: "2026-07-01T10:00:00Z", superseded_by: "a-2", superseded_at: "2026-08-30T10:00:00Z" },
    { kind: "avis", subject_key: "A12", statement: "Avis A12", status: MEMORY.ASSUMED, decided_at: "2026-08-30T10:00:00Z" }
  ];

  const dossier = buildContextExport({ project: { name: "Aurora" }, assertions: memoire });

  assert.match(dossier, /## Ce qui vaut aujourd'hui/);
  assert.match(dossier, /## Ce qui a été remplacé/);
  assert.match(dossier, /remplacée le 2026-08-30/);
});

test("une mémoire vide se dit vide", () => {
  // Zéro affirmation est une information ; une page blanche n'en est pas une.
  const dossier = buildContextExport({ project: { name: "Aurora" }, assertions: [] });

  assert.match(dossier, /Rien n'a encore été versé à la mémoire/);
});

test("chaque ligne porte sa date, son état et sa proposition", () => {
  const dossier = buildContextExport({
    project: { name: "Aurora" },
    assertions: [
      { kind: "avis", subject_key: "A12", statement: "Avis A12 — Étanchéité", detail: "levé", status: MEMORY.ASSUMED, decided_at: "2026-08-30T10:00:00Z", proposition_number: 4 }
    ]
  });

  assert.match(dossier, /\*\*A12\*\* · Avis A12 — Étanchéité — levé · assumée le 2026-08-30 · proposition #P4/);
});

test("l'histoire d'une même chose se lit du plus ancien au plus récent", () => {
  // « Depuis quand ? » est la question qu'on pose à une mémoire ; y répondre
  // demande la suite, pas la dernière ligne.
  const memoire = [
    { kind: "avis", subject_key: "A12", decided_at: "2026-08-30T10:00:00Z", statement: "levé" },
    { kind: "avis", subject_key: "A12", decided_at: "2026-07-01T10:00:00Z", statement: "émis" },
    { kind: "avis", subject_key: "A41", decided_at: "2026-07-01T10:00:00Z", statement: "autre" }
  ];

  const suite = assertionHistory(memoire, { kind: "avis", subjectKey: "A12" });

  assert.deepEqual(suite.map((entry) => entry.statement), ["émis", "levé"]);
});

test("un avis dit sur quoi il s'appuie", () => {
  const faits = describeAssertionFacts({
    kind: "avis",
    subject_key: "A12",
    payload: {
      reference: "A12",
      title: "Étanchéité",
      status: "RESOLVED",
      previousStatus: "OPEN",
      opinion: "levé au vu du rapport corrigé",
      change: "changed",
      evidence: "RICT p. 14"
    }
  });

  assert.deepEqual(faits, [
    ["Référence", "A12"],
    ["Intitulé", "Étanchéité"],
    ["État", "Levé"],
    ["État précédent", "Ouvert"],
    ["Appréciation", "levé au vu du rapport corrigé"],
    ["Mouvement", "modifié"],
    ["Extrait", "RICT p. 14"]
  ]);
});

test("ce qui manque n'apparaît pas, plutôt que d'apparaître vide", () => {
  const faits = describeAssertionFacts({ kind: "document", subject_key: "d-1", payload: { name: "RICT.pdf" } });

  assert.deepEqual(faits, [["Fichier", "RICT.pdf"]]);
});

/* ── Le vocabulaire arrive avec l'affirmation ────────────────────────────── */

test("une affirmation versée porte sa nature, déduite de sa provenance", () => {
  const lignes = assertionsFromProposition({
    proposition: { id: "p-1", project_id: "x", number: 4, merged_at: "2026-03-01T00:00:00.000Z" },
    items: [
      { itemType: "avis", itemKey: "166", status: ITEM.ACCEPTED, payload: { reference: "166", title: "Réserve" } },
      { itemType: "document", itemKey: "doc-1", status: ITEM.ACCEPTED, payload: { name: "a.pdf" } }
    ]
  });

  assert.equal(lignes.find((row) => row.kind === "avis").nature, "constat");
  assert.equal(lignes.find((row) => row.kind === "document").nature, "intendance");
});

test("aucun domaine n'est inventé au versement", () => {
  const lignes = assertionsFromProposition({
    proposition: { id: "p-1", project_id: "x", number: 4, merged_at: "2026-03-01T00:00:00.000Z" },
    items: [
      {
        itemType: "avis",
        itemKey: "39",
        status: ITEM.ACCEPTED,
        payload: { reference: "39", title: "SECURITE CONTRE L'INCENDIE:" }
      }
    ]
  });

  assert.equal(lignes[0].domain, null, "un domaine deviné est pire qu'un domaine absent");
});

test("un domaine porté par la revue est versé tel quel", () => {
  const lignes = assertionsFromProposition({
    proposition: { id: "p-1", project_id: "x", number: 4, merged_at: "2026-03-01T00:00:00.000Z" },
    items: [
      {
        itemType: "avis",
        itemKey: "12",
        status: ITEM.ACCEPTED,
        payload: { reference: "12", domain: "structure", nature: "hypothese" }
      }
    ]
  });

  assert.equal(lignes[0].domain, "structure");
  assert.equal(lignes[0].nature, "hypothese", "ce qui est su prime sur ce qui se déduit");
});

/* ── Une hypothèse posée à la main ───────────────────────────────────────── */

test("une hypothèse déclarée porte son sujet comme clé, pas sa valeur", () => {
  // C'est ce qui fait qu'une nouvelle valeur remplace l'ancienne au lieu de
  // coexister avec elle. Une clé qui porterait la valeur donnerait deux
  // hypothèses vraies en même temps.
  const plan = declaredHypothesis({ projectId: "p", subject: "Zone de neige", value: "A2" });

  assert.equal(plan.ok, true);
  assert.equal(plan.row.subject_key, "zone-de-neige");
  assert.equal(plan.row.statement, "Zone de neige : A2");
});

test("deux graphies d'un même sujet donnent la même clé", () => {
  // Deux clés pour un même sujet donneraient deux hypothèses en vigueur, ce que
  // « une seule valeur à la fois » interdit.
  const premiere = declaredHypothesis({ projectId: "p", subject: "Zone de neige", value: "A2" });
  const seconde = declaredHypothesis({ projectId: "p", subject: "zone de NEIGE", value: "E" });

  assert.equal(premiere.row.subject_key, seconde.row.subject_key);
});

test("une hypothèse déclarée est de nature hypothèse, sans qu'on ait à le dire", () => {
  const plan = declaredHypothesis({ projectId: "p", subject: "Portance du sol", value: "0,2 MPa" });

  assert.equal(plan.row.nature, "hypothese");
  assert.equal(plan.row.kind, "hypothesis");
  assert.equal(plan.row.proposition_id, null, "un geste humain, pas une proposition");
});

test("un sujet ou une valeur manquants sont refusés, et le refus est nommé", () => {
  assert.equal(declaredHypothesis({ projectId: "p", value: "A2" }).ok, false);
  assert.match(declaredHypothesis({ projectId: "p", value: "A2" }).reason, /sujet/);
  assert.match(declaredHypothesis({ projectId: "p", subject: "Zone" }).reason, /valeur/);
  assert.equal(declaredHypothesis({ subject: "Zone", value: "A2" }).ok, false);
});

test("le domaine reste nul quand il n'est pas choisi", () => {
  const plan = declaredHypothesis({ projectId: "p", subject: "Zone de neige", value: "A2" });
  assert.equal(plan.row.domain, null);

  const classee = declaredHypothesis({ projectId: "p", subject: "Zone de neige", value: "A2", domain: "structure" });
  assert.equal(classee.row.domain, "structure");
});

test("un domaine inconnu n'est pas rapproché du plus proche", () => {
  const plan = declaredHypothesis({ projectId: "p", subject: "Zone", value: "A2", domain: "neige" });
  assert.equal(plan.row.domain, null);
});

test("une hypothèse s'appuie sur son sujet et sa valeur, pas sur un fichier", () => {
  const faits = Object.fromEntries(
    describeAssertionFacts({
      kind: "hypothesis",
      subject_key: "zone-de-neige",
      domain: "structure",
      payload: { subject: "Zone de neige", value: "A2" }
    })
  );

  assert.equal(faits["Sujet"], "Zone de neige");
  assert.equal(faits["Valeur"], "A2");
  assert.equal(faits["Domaine"], "Structure");
  assert.equal(faits["Fichier"], undefined);
});
