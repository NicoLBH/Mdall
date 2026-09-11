import test from "node:test";
import assert from "node:assert/strict";

import { analyzeProposition } from "./proposition-analysis.js";

/**
 * L'aiguillage, et rien d'autre.
 *
 * Ce qu'on vérifie ici n'est pas la lecture — elle se passe au serveur et elle a
 * ses propres tests — mais **le chemin** : un compte rendu de chantier part vers
 * les points à traiter, un livrable de bureau de contrôle vers les avis, et un
 * document qu'aucun des deux ne réclame est **nommé** plutôt que passé sous
 * silence.
 *
 * Le cas décisif est celui d'un dépôt qui n'apporte qu'un compte rendu : la
 * garde de portée s'arrêtait avant, le dépôt ressortait vide, et l'utilisateur
 * ne voyait aucun sujet ajouté.
 */

const PROPOSITION = { id: "prop-1", project_id: "p1" };

/** Des lignes de la table des documents, telles que la reconnaissance les a laissées. */
const CR = { id: "doc-cr", original_filename: "cr-12.pdf", detected_kind: "cr_chantier" };
const RAPPORT = { id: "doc-ct", original_filename: "rict.pdf", detected_kind: "ct_report" };
const DEVIS = { id: "doc-x", original_filename: "devis.pdf", detected_kind: null };

/** Un point vérifié, tel que le serveur le rend. Aucune entreprise réelle. */
const POINT = {
  key: "cr:12.02.1",
  titre: "Le ferraillage du voile V12 ne suit pas le plan BA-102",
  description: "Le ferraillage du voile V12 ne suit pas le plan BA-102.",
  lot: "02 — GROS ŒUVRE", reference: "12.02.1", qui: null, echeance: null, etat: null,
  provenance: { source_id: "cr-1", page: 3, excerpt: "12.02.1  Le ferraillage…" }
};

/** Les entrées/sorties, remplacées : un test d'aiguillage n'ouvre rien. */
function entreesDe({ soumis = [], acceptes = [], sujets = [POINT], refus = [] } = {}) {
  const appels = { lectures: 0, documentsLus: [] };

  return {
    appels,
    entrees: {
      listProjectDocuments: async () => acceptes,
      listPropositionDocuments: async () => soumis,
      downloadDocumentFile: async () => ({ name: "x.pdf", type: "application/pdf" }),
      readDocument: async (row, _telecharger, sourceId) => {
        appels.documentsLus.push(row.id);
        return { sourceId, documentId: row.id, pages: [{ page: 1, text: "…" }], recognition: null, file: { name: row.original_filename } };
      },
      lireLeLotDeComptesRendus: async ({ sources }) => {
        appels.lectures += 1;
        return {
          lectures: new Map(sources.map((source) => [source.sourceId, { ok: true, sujets, ecartes: 0 }])),
          refus
        };
      }
    }
  };
}

/* ── Le cas qui ne marchait pas ──────────────────────────────────────────── */

test("un dépôt qui n'apporte qu'un compte rendu rend ses points", async () => {
  const { entrees, appels } = entreesDe({ soumis: [CR] });

  const rendu = await analyzeProposition({ projectId: "p1", proposition: PROPOSITION, entrees });

  assert.equal(appels.lectures, 1, "le compte rendu a bien été lu");
  assert.equal(rendu.sujets.length, 1);
  assert.equal(rendu.sujets[0].titre, POINT.titre);
  assert.equal(rendu.error, null);
});

/**
 * La garde de portée existe pour une bonne raison — une proposition venue de
 * l'Atelier n'apporte aucun livrable, et relire le corpus lui attribuait
 * quatre cent quatre-vingt-neuf avis qu'elle n'avait pas déposés. Elle ne doit
 * pas pour autant arrêter un dépôt qui a bien quelque chose à lire.
 */
test("la garde de portée ne s'applique que si les deux chemins sont vides", async () => {
  const vide = await analyzeProposition({
    projectId: "p1", proposition: PROPOSITION, ...entreesDe({ soumis: [DEVIS] })
  });
  assert.deepEqual(vide.sujets, [], "aucun compte rendu : rien à proposer");

  const avecCr = await analyzeProposition({
    projectId: "p1", proposition: PROPOSITION, ...entreesDe({ soumis: [DEVIS, CR] })
  });
  assert.equal(avecCr.sujets.length, 1, "un compte rendu suffit à ce que le dépôt ait quelque chose à lire");
});

/* ── Les deux chemins ne se mélangent pas ────────────────────────────────── */

test("un compte rendu ne part pas vers les avis, et un rapport pas vers les points", async () => {
  const { entrees, appels } = entreesDe({ soumis: [CR, RAPPORT] });

  await analyzeProposition({ projectId: "p1", proposition: PROPOSITION, entrees });

  // Le compte rendu est lu une fois par le chemin des points ; le rapport une
  // fois par celui des avis. Aucun ne fait les deux.
  assert.deepEqual(appels.documentsLus, ["doc-cr", "doc-ct"]);
  assert.equal(appels.lectures, 1, "une seule campagne de lecture de comptes rendus");
});

test("un document qu'aucun atelier ne lit est nommé, pas passé sous silence", async () => {
  const rendu = await analyzeProposition({
    projectId: "p1", proposition: PROPOSITION, ...entreesDe({ soumis: [CR, DEVIS] })
  });

  const corpus = rendu.steps.find((step) => step.id === "corpus");
  const dit = (corpus?.lignes ?? []).map((ligne) => String(ligne?.texte ?? ligne?.text ?? ligne)).join(" ");

  assert.match(dit, /devis\.pdf/, "le document écarté est nommé");
  assert.doesNotMatch(dit, /cr-12\.pdf.*écarté/, "le compte rendu, lui, n'est pas écarté");
});

/**
 * Le piège de la réécriture. Après une fusion, l'analyse repasse ici avec
 * `PORTEE.PROJET` pour réécrire le suivi des avis — et les comptes rendus sont
 * toujours attachés à la proposition. Les relire appellerait le modèle une
 * seconde fois sur chaque pièce, pour reproposer des points qu'on vient
 * d'ouvrir : un appel payant pour un résultat qu'on jetterait.
 */
test("la réécriture du suivi ne relit pas les comptes rendus", async () => {
  const { PORTEE } = await import("./depot-portee.js");
  const { entrees, appels } = entreesDe({ soumis: [CR, RAPPORT] });

  await analyzeProposition({
    projectId: "p1", proposition: PROPOSITION, portee: PORTEE.PROJET, entrees
  });

  assert.equal(appels.lectures, 0, "le modèle n'a pas été rappelé");
  assert.ok(!appels.documentsLus.includes("doc-cr"), "et le compte rendu n'a pas été rapatrié");
});

/* ── Le report, jusque dans l'analyse ────────────────────────────────────── */

test("un point déjà versé ne revient pas dans les points proposés", async () => {
  const rendu = await analyzeProposition({
    projectId: "p1",
    proposition: PROPOSITION,
    knownAssertions: [{ kind: "sujet", subject_key: "cr:12.02.1" }],
    ...entreesDe({ soumis: [CR] })
  });

  assert.deepEqual(rendu.sujets, []);
  assert.equal(rendu.sujetsDeja.length, 1, "et il se dit, plutôt que de disparaître");
});

test("un sujet déjà ouvert dans le projet arrête le point", async () => {
  const rendu = await analyzeProposition({
    projectId: "p1",
    proposition: PROPOSITION,
    sujetsDuProjet: [{ id: "s-9", title: POINT.titre }],
    ...entreesDe({ soumis: [CR] })
  });

  assert.deepEqual(rendu.sujets, []);
  assert.equal(rendu.sujetsDeja.length, 1);
});

/* ── Ce qu'on n'a pas su lire ────────────────────────────────────────────── */

test("un compte rendu refusé par le serveur se dit, il ne disparaît pas", async () => {
  const rendu = await analyzeProposition({
    projectId: "p1",
    proposition: PROPOSITION,
    ...entreesDe({ soumis: [CR], sujets: [], refus: [{ sourceId: "cr-1", motif: "injoignable" }] })
  });

  const etape = rendu.steps.find((step) => step.id === "sujets");
  const dit = (etape?.lignes ?? []).map((ligne) => String(ligne?.texte ?? ligne?.text ?? ligne)).join(" ");
  assert.match(dit, /injoignable/);
});

/* ── Le contrat, toujours le même ────────────────────────────────────────── */

test("l'analyse rend toujours les deux listes de points, même vides", async () => {
  const rendu = await analyzeProposition({ projectId: "", proposition: null });

  assert.deepEqual(rendu.sujets, [], "aucun compte rendu soumis : aucun point, et ce n'est pas une lacune");
  assert.deepEqual(rendu.sujetsDeja, []);
  assert.equal(rendu.computedAvis, null, "là, en revanche, on ne sait pas : ce n'est pas zéro avis");
});
