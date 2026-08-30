import test from "node:test";
import assert from "node:assert/strict";

import {
  ENGINE_VERSION,
  corpusEntries,
  corpusFingerprint,
  diffCorpus,
  isRunCurrent,
  reconcileAvis,
  toAvisRows,
  toRunRow
} from "./ct-analysis-store.js";

test("l'empreinte d'un lot ne dépend ni de l'ordre ni des noms de fichiers", async () => {
  const lot = [{ fingerprint: "bbb" }, { fingerprint: "aaa" }];
  const memeLotAutreOrdre = [{ fingerprint: "aaa" }, { fingerprint: "bbb" }];

  assert.equal(await corpusFingerprint(lot), await corpusFingerprint(memeLotAutreOrdre));
});

test("ajouter un document change l'empreinte, fût-il plus ancien que tous les autres", async () => {
  // C'est le cas qui compte : un rapport oublié qui arrive après coup réécrit
  // l'histoire, et rien dans son contenu ne dit qu'il est plus ancien.
  const avant = await corpusFingerprint([{ fingerprint: "aaa" }, { fingerprint: "bbb" }]);
  const apres = await corpusFingerprint([{ fingerprint: "aaa" }, { fingerprint: "bbb" }, { fingerprint: "000" }]);

  assert.notEqual(avant, apres);
});

test("un lot sans empreinte lisible n'en reçoit pas une par défaut", async () => {
  assert.equal(await corpusFingerprint([]), null);
  assert.equal(await corpusFingerprint([{ fingerprint: null }]), null);
});

/** Un résultat de moteur, réduit à ce que la persistance en retient. */
const RESULT = {
  avisStatus: [
    {
      reference: "234",
      status: "OPEN",
      opinion_raw: "S",
      raised_at: "2025-05-20",
      raised_in: "doc-15",
      last_seen_document_id: "doc-9",
      resolution_reason: null,
      resolved_at: null,
      evidence: { sentence: "L'avis 234 est levé.", source_page: 2 }
    }
  ],
  predictions: [
    {
      kind: "extraction",
      value: { external_reference_raw: "234", external_reference_normalized: "234", opinion_raw: "S" },
      title_raw: "Couche de fondation du dallage",
      opinion_label: "Suspendu",
      pack_id: "socotec",
      pack_version: 1
    }
  ],
  indicators: { guardViolations: [] },
  packsUsed: { "doc-15": { pack_id: "socotec", pack_version: 1 } }
};

test("un avis conservé porte son identité métier et la preuve d'alors", () => {
  const [row] = toAvisRows(RESULT, {
    projectId: "p-1",
    documentIds: { "doc-15": "u-15", "doc-9": "u-9" }
  });

  assert.equal(row.project_id, "p-1");
  assert.equal(row.external_reference, "234", "le numéro que le bureau de contrôle a lui-même attribué");
  assert.equal(row.title, "Couche de fondation du dallage");
  assert.equal(row.opinion_raw, "S");
  assert.equal(row.status, "OPEN");
  assert.equal(row.raised_in_document_id, "u-15");
  assert.equal(row.last_seen_document_id, "u-9");
  assert.equal(row.evidence.sentence, "L'avis 234 est levé.");
  // Quel vocabulaire l'a lu : sans cela, face à un écart, on ne saurait pas si
  // la cause est le document ou une correction du pack.
  assert.equal(row.pack_id, "socotec");
  assert.equal(row.pack_version, 1);
  assert.equal(row.absent_from_corpus, false);
});

test("un avis qui ne ressort plus du lot est marqué absent, jamais supprimé", () => {
  const connus = [
    { id: "a-1", external_reference: "234", absent_from_corpus: false },
    { id: "a-2", external_reference: "249", absent_from_corpus: false }
  ];
  const calcules = [{ external_reference: "234", status: "OPEN" }];

  const { upserts, missing } = reconcileAvis(connus, calcules);

  assert.deepEqual(upserts, calcules, "ce qui a été calculé est écrit tel quel");
  assert.equal(missing.length, 1);
  assert.deepEqual(missing[0], { id: "a-2", external_reference: "249", absent_from_corpus: true });
});

test("un avis déjà marqué absent ne se remarque pas à chaque exécution", () => {
  const connus = [{ id: "a-2", external_reference: "249", absent_from_corpus: true }];

  assert.deepEqual(reconcileAvis(connus, []).missing, [], "réécrire la même ligne n'apprend rien");
});

test("un avis qui reparaît redevient présent", () => {
  // Un document écarté par erreur, puis rétabli : l'avis doit revivre, avec
  // tout ce qu'on en sait, sans qu'on ait eu à le recréer.
  const connus = [{ id: "a-2", external_reference: "249", absent_from_corpus: true }];
  const { upserts } = reconcileAvis(connus, [{ external_reference: "249", absent_from_corpus: false }]);

  assert.equal(upserts[0].absent_from_corpus, false);
});

test("une exécution consigne le lot, le moteur et ce qu'on en a tiré", () => {
  const run = toRunRow(RESULT, { projectId: "p-1", corpusFingerprint: "abc", documentCount: 17 });

  assert.equal(run.corpus_fingerprint, "abc");
  assert.equal(run.document_count, 17);
  assert.equal(run.tracked_avis_count, 1);
  assert.equal(run.guard_violation_count, 0);
  assert.equal(run.engine_version, ENGINE_VERSION);
  assert.deepEqual(run.packs_used, { "doc-15": { pack_id: "socotec", pack_version: 1 } });
});

test("l'état conservé cesse de valoir dès que le lot, le moteur ou le pack change", () => {
  const run = {
    corpus_fingerprint: "abc",
    engine_version: ENGINE_VERSION,
    packs_used: { "doc-1": { pack_id: "socotec", pack_version: 1 } }
  };
  const inchange = { corpusFingerprint: "abc", packsUsed: run.packs_used };

  assert.equal(isRunCurrent(run, inchange), true);

  // Le lot a changé.
  assert.equal(isRunCurrent(run, { ...inchange, corpusFingerprint: "def" }), false);
  // Le moteur a changé.
  assert.equal(isRunCurrent({ ...run, engine_version: "autre" }, inchange), false);
  // Le vocabulaire a changé — une correction du pack, et tout est à relire.
  assert.equal(
    isRunCurrent(run, { ...inchange, packsUsed: { "doc-1": { pack_id: "socotec", pack_version: 2 } } }),
    false
  );
  // Rien de conservé, ou aucun lot : il n'y a rien à réutiliser.
  assert.equal(isRunCurrent(null, inchange), false);
  assert.equal(isRunCurrent(run, { corpusFingerprint: null }), false);
});

test("la liste du lot se lit aussi bien d'un document relu que d'un document analysé", () => {
  // Deux formes, une seule entrée : ce que l'atelier vient de lire, et la ligne
  // `documents` que le projet a gardée.
  const analyse = corpusEntries([{ documentId: "u-1", fingerprint: "aaa", filename: "RICT.pdf" }]);
  const relu = corpusEntries([{ id: "u-1", content_fingerprint: "aaa", original_filename: "RICT.pdf" }]);

  assert.deepEqual(analyse, relu);
  assert.deepEqual(analyse, [{ document_id: "u-1", fingerprint: "aaa", name: "RICT.pdf" }]);
});

test("un document sans empreinte n'entre pas dans la liste du lot", () => {
  // Il n'entre pas non plus dans l'empreinte du lot, et n'a pas pu être
  // analysé : l'y faire figurer le montrerait « nouveau » indéfiniment.
  assert.deepEqual(corpusEntries([{ id: "u-1", content_fingerprint: null }]), []);
});

test("la liste du lot ne dépend pas de l'ordre de dépôt", () => {
  const ordre = corpusEntries([{ fingerprint: "bbb" }, { fingerprint: "aaa" }]);
  assert.deepEqual(ordre.map((entry) => entry.fingerprint), ["aaa", "bbb"]);
});

test("l'écart nomme ce qui est arrivé et ce qui a disparu", () => {
  const run = {
    corpus_documents: [
      { document_id: "u-1", fingerprint: "aaa", name: "RICT.pdf" },
      { document_id: "u-2", fingerprint: "bbb", name: "Fiche 2.pdf" }
    ]
  };
  const projet = [
    { id: "u-1", content_fingerprint: "aaa", original_filename: "RICT.pdf" },
    { id: "u-3", content_fingerprint: "ccc", original_filename: "RVRAT.pdf" }
  ];

  const ecart = diffCorpus(run, projet);

  assert.equal(ecart.known, true);
  assert.deepEqual(ecart.added.map((entry) => entry.name), ["RVRAT.pdf"]);
  assert.deepEqual(ecart.removed.map((entry) => entry.name), ["Fiche 2.pdf"]);
});

test("un rapport redéposé sous un autre nom n'est pas un nouveau document", () => {
  // Le faux positif qui ferait relancer une analyse pour rien : la comparaison
  // porte sur le contenu, jamais sur le nom ni sur l'identifiant.
  const run = { corpus_documents: [{ document_id: "u-1", fingerprint: "aaa", name: "RICT.pdf" }] };
  const projet = [{ id: "u-9", content_fingerprint: "aaa", original_filename: "RICT v4 (copie).pdf" }];

  const ecart = diffCorpus(run, projet);

  assert.deepEqual(ecart.added, []);
  assert.deepEqual(ecart.removed, []);
});

test("une exécution d'avant la liste avoue ne pas savoir nommer l'écart", () => {
  // Le dire vaut mieux que de laisser croire qu'il n'y a rien de nouveau.
  const ecart = diffCorpus({ corpus_fingerprint: "abc" }, [{ content_fingerprint: "zzz" }]);

  assert.equal(ecart.known, false);
  assert.deepEqual(ecart.added, []);
  assert.deepEqual(ecart.removed, []);
  assert.deepEqual(diffCorpus(null, []).known, false);
});

test("une exécution consigne la liste de ce qu'elle a lu", () => {
  const run = toRunRow(RESULT, {
    projectId: "p-1",
    corpusFingerprint: "abc",
    documentCount: 1,
    corpusDocuments: corpusEntries([{ documentId: "u-15", fingerprint: "aaa", filename: "RICT.pdf" }])
  });

  assert.deepEqual(run.corpus_documents, [{ document_id: "u-15", fingerprint: "aaa", name: "RICT.pdf" }]);
  assert.equal(
    toRunRow(RESULT, { projectId: "p-1" }).corpus_documents,
    null,
    "sans liste, on n'en invente pas une"
  );
});

test("une exécution porte la proposition qui l'a causée", () => {
  // Deux fusions différentes peuvent aboutir au même corpus : l'empreinte ne
  // les distinguera jamais. Sans cette colonne, on ne peut pas remonter d'un
  // chiffre du suivi à la décision qui l'a produit.
  const run = toRunRow(RESULT, { projectId: "p-1", propositionId: "prop-7" });

  assert.equal(run.proposition_id, "prop-7");
  assert.equal(run.trigger_source, "proposition");
});

test("une exécution lancée à la main ne s'invente pas une cause", () => {
  const run = toRunRow(RESULT, { projectId: "p-1" });

  assert.equal(run.proposition_id, null);
  assert.equal(run.trigger_source, "manual");
});
