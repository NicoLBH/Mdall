import test from "node:test";
import assert from "node:assert/strict";

import { buildDepositFacts, buildDepositNotePrompt, depositFingerprint } from "./deposit-note.js";

const PROPOSITION = { number: 3, title: "Rapports d'étape SOCOTEC", created_at: "2026-08-28T09:00:00Z" };

const DOCUMENTS = [
  { id: "d1", original_filename: "RICT.pdf", created_at: "2026-08-28T09:00:00Z", detected_kind: "ct_report" },
  { id: "d2", original_filename: "RVRAT.pdf", created_at: "2026-08-28T09:01:00Z" }
];

const REPORTS = [
  { documentId: "d1", file: { name: "RICT.pdf" }, pages: [{ text: "Rapport initial de contrôle technique — lot 3" }] }
];

test("chaque chiffre est un compte, jamais une estimation", () => {
  const faits = buildDepositFacts({
    proposition: PROPOSITION,
    documents: DOCUMENTS,
    reports: REPORTS,
    knownAvis: [{ external_reference: "A1" }, { external_reference: "A2" }],
    diff: { added: [{ reference: "A3" }], changed: [], unchanged: 2 }
  });

  assert.equal(faits.documents.total, 2);
  assert.equal(faits.before.trackedAvis, 2);
  assert.equal(faits.after.trackedAvis, 3, "les avis d'avant, plus ceux qui apparaissent");
  assert.equal(faits.movements.unchanged, 2);
});

test("un extrait porte ce que le document dit de lui-même", () => {
  const faits = buildDepositFacts({ proposition: PROPOSITION, documents: DOCUMENTS, reports: REPORTS });

  assert.match(faits.documents.items[0].excerpt, /Rapport initial de contrôle technique/);
  assert.equal(faits.documents.items[1].excerpt, "", "aucun rapport lu pour ce document : pas d'extrait inventé");
});

test("un type non reconnu reste nul, il ne se devine pas", () => {
  // « type inconnu » est une information ; « rapport » inventé n'en est pas une.
  const faits = buildDepositFacts({ proposition: PROPOSITION, documents: DOCUMENTS, reports: [] });

  assert.equal(faits.documents.items[0].kind, "ct_report");
  assert.equal(faits.documents.items[1].kind, null);
});

test("une liste tronquée le dit", () => {
  // Taire la troncature ferait passer une liste partielle pour la liste
  // complète — le genre de silence que ce projet refuse.
  const beaucoup = Array.from({ length: 30 }, (_, rang) => ({ id: `d${rang}`, original_filename: `f${rang}.pdf` }));
  const faits = buildDepositFacts({ proposition: PROPOSITION, documents: beaucoup });

  assert.equal(faits.documents.total, 30);
  assert.equal(faits.documents.items.length, 24);
  assert.equal(faits.documents.omitted, 6);
});

test("un avis modifié emporte son état d'avant", () => {
  const faits = buildDepositFacts({
    proposition: PROPOSITION,
    diff: {
      added: [],
      changed: [{ reference: "A7", status: "closed", previousStatus: "open", opinion_raw: "levé", previousOpinion: "émis" }],
      unchanged: 0
    }
  });

  assert.deepEqual(faits.movements.changed[0], {
    reference: "A7",
    title: "",
    status: "closed",
    opinion: "levé",
    previousStatus: "open",
    previousOpinion: "émis"
  });
});

test("les documents illisibles figurent dans les faits", () => {
  // L'analyse a porté sur moins que le lot : le taire ferait passer une lecture
  // partielle pour une lecture entière.
  const faits = buildDepositFacts({
    proposition: PROPOSITION,
    unreachable: [{ original_filename: "plan.pdf" }]
  });

  assert.deepEqual(faits.unreachable, ["plan.pdf"]);
});

test("sans rien, les faits sont vides — pas absents", () => {
  const faits = buildDepositFacts();

  assert.equal(faits.documents.total, 0);
  assert.equal(faits.movements.addedTotal, 0);
  assert.equal(faits.movements.unchanged, null, "non calculé n'est pas zéro");
});

test("la demande impose le plan et interdit d'inventer", () => {
  const { system, user } = buildDepositNotePrompt(buildDepositFacts({ proposition: PROPOSITION }));

  assert.match(system, /RÈGLE ABSOLUE : tu n'ajoutes aucun fait/);
  assert.match(system, /## L'état avant/);
  assert.match(system, /## Ce qui reste à trancher/);
  assert.match(user, /aucun fait ajouté/i, "la règle est répétée en queue, c'est celle qu'on relâche en dernier");
  assert.match(user, /Rapports d'étape SOCOTEC/, "les faits partent avec la demande");
});

test("l'empreinte ne change pas quand l'ordre change", () => {
  // Elle répond à une seule question : les documents ont-ils changé ?
  assert.equal(
    depositFingerprint([{ id: "b" }, { id: "a" }]),
    depositFingerprint([{ id: "a" }, { id: "b" }])
  );
  assert.notEqual(depositFingerprint([{ id: "a" }]), depositFingerprint([{ id: "a" }, { id: "b" }]));
});

test("l'instruction du navigateur et celle du serveur ne divergent pas", async () => {
  // L'instruction vit dans la fonction — avec la clé, et pour qu'un client ne
  // puisse pas en faire un relais ouvert vers un modèle payant. Elle est donc
  // écrite deux fois, et deux copies d'une même règle finissent toujours par
  // diverger : ce test est le seul lien entre elles.
  const fs = await import("node:fs/promises");
  const url = new URL("../../../../supabase/functions/generate-deposit-note/index.ts", import.meta.url);
  const fonction = await fs.readFile(url, "utf8");

  const { system } = buildDepositNotePrompt(buildDepositFacts());

  for (const titre of system.split("\n").filter((ligne) => ligne.startsWith("## "))) {
    assert.ok(fonction.includes(titre), `le plan du serveur a perdu « ${titre} »`);
  }

  assert.ok(
    fonction.includes("RÈGLE ABSOLUE : tu n'ajoutes aucun fait"),
    "la règle absolue a disparu du serveur"
  );
});
