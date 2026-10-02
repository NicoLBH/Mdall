/**
 * Le rail des familles, et le tableau qu'il filtre.
 *
 * Les documents sont inventés.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  CHOISIR_UNE_FAMILLE, OUVRIR_UN_DOCUMENT, laFamilleDesignee, leDocumentDesigne,
  renderLeRailDesFamilles, renderLeTableauDesDocuments
} from "./les-documents-analyses.js";
import { FAMILLE, TOUTES, lesDocumentsAnalyses } from "../../services/les-documents-analyses.js";

const TOUS = lesDocumentsAnalyses({
  mails: [{
    id: "f-1", objet: "Reprise des enduits", finit_le: "2026-03-02",
    created_at: "2026-10-01T10:00:00Z", mesures: { messages: 7, prises: 3 }, relectures: 2
  }],
  controles: [{
    id: "r-1", document: "RICT-03.pdf", numero_de_rapport: "RICT-03", etabli_le: "2026-04-18",
    created_at: "2026-09-28T10:00:00Z", mesures: { avis: 12, marques: 4 }
  }],
  crs: [{
    id: "c-1", document: "CR_16.pdf", numero_de_reunion: "16", tenue_le: "2026-04-16",
    created_at: "2026-09-30T10:00:00Z", mesures: { points: 11 }
  }]
});

/* ── Le rail ──────────────────────────────────────────────────────────────── */

test("le rail porte les quatre entrées, et leur compte", () => {
  const html = renderLeRailDesFamilles({ actif: TOUTES, documents: TOUS });

  for (const quoi of [TOUTES, FAMILLE.MAIL, FAMILLE.CONTROLE, FAMILLE.CR]) {
    assert.match(html, new RegExp(`${CHOISIR_UNE_FAMILLE}="${quoi}"`), quoi);
  }
  assert.match(html, /Tous les documents/);
  assert.match(html, /Bureau de Contrôle/);
  // Le compte va avec le nom : il dit, **avant** le clic, s'il y a quelque chose
  // à voir derrière.
  assert.match(html, />\s*3\s*</);
});

test("une famille vide porte zéro, et non rien", () => {
  // « Mails 0 » dit qu'il n'y a rien ; une entrée sans compte laisse chercher.
  const html = renderLeRailDesFamilles({ documents: [] });
  assert.match(html, />\s*0\s*</);
});

test("l'entrée ouverte est marquée, et une seule", () => {
  const html = renderLeRailDesFamilles({ actif: FAMILLE.CONTROLE, documents: TOUS });
  const actives = html.match(/aria-current="page"/g) ?? [];
  assert.equal(actives.length, 1);
});

/* ── Le tableau ───────────────────────────────────────────────────────────── */

test("le tableau filtre sur la famille ouverte", () => {
  const mails = renderLeTableauDesDocuments({ documents: TOUS, famille: FAMILLE.MAIL });
  assert.match(mails, /Reprise des enduits/);
  assert.doesNotMatch(mails, /RICT-03\.pdf/);
  assert.match(mails, /1 fil analysé/);

  const toutes = renderLeTableauDesDocuments({ documents: TOUS, famille: TOUTES });
  assert.match(toutes, /Reprise des enduits/);
  assert.match(toutes, /RICT-03\.pdf/);
  assert.match(toutes, /3 documents analysés/);
});

test("trois états, et non deux", () => {
  // On n'a pas encore demandé : rien du tout, pas même une panne.
  assert.equal(renderLeTableauDesDocuments({ documents: null }), "");

  // On attend la réponse.
  assert.match(renderLeTableauDesDocuments({ documents: null, enCours: true }),
    /Lecture de ce qui a déjà été analysé/);

  // On n'a pas su lire. Ce n'est pas « rien n'a été analysé » : on recommencerait
  // une lecture déjà payée (règle 5).
  const rate = renderLeTableauDesDocuments({ documents: null, rate: true });
  assert.match(rate, /n'a pas pu/);
  assert.match(rate, /on ne sait pas quoi/);
});

test("une famille vide dit laquelle, et quoi faire", () => {
  const html = renderLeTableauDesDocuments({ documents: [], famille: FAMILLE.CONTROLE });

  assert.match(html, /Aucun rapport de contrôle analysé/);
  assert.match(html, /structure et sa légende/);
  // Et surtout pas « Aucun résultat », qui n'apprend rien.
  assert.doesNotMatch(html, /Aucun résultat/);
});

test("l'icône de famille ne s'affiche que dans la vue d'ensemble", () => {
  // Sous « Mails », une colonne d'enveloppes identiques ne distingue rien et prend
  // la place du titre.
  const toutes = renderLeTableauDesDocuments({ documents: TOUS, famille: TOUTES });
  assert.match(toutes, /title="Mails"/);

  const mails = renderLeTableauDesDocuments({ documents: TOUS, famille: FAMILLE.MAIL });
  assert.doesNotMatch(mails, /title="Mails"/);
});

test("la ligne ouverte est marquée", () => {
  const html = renderLeTableauDesDocuments({
    documents: TOUS, famille: TOUTES, ouverte: "r-1"
  });
  assert.equal((html.match(/est-ouverte/g) ?? []).length, 1);
});

/* ── Ce qu'un clic désigne ────────────────────────────────────────────────── */

test("une ligne porte sa famille avec son identifiant", () => {
  const html = renderLeTableauDesDocuments({ documents: TOUS, famille: TOUTES });
  assert.match(html, new RegExp(`${OUVRIR_UN_DOCUMENT}="rapports:r-1"`));
  assert.match(html, new RegExp(`${OUVRIR_UN_DOCUMENT}="mails:f-1"`));
});

test("une marque à moitié ne désigne rien", () => {
  // Deux tables peuvent rendre le même identifiant : sans la famille on ne sait
  // pas où aller le chercher, ni quel détail dessiner (règle 5).
  assert.deepEqual(leDocumentDesigne("comptes_rendus:c-1"), { famille: "comptes_rendus", id: "c-1" });
  assert.equal(leDocumentDesigne("c-1"), null);
  assert.equal(leDocumentDesigne("comptes_rendus:"), null);
  assert.equal(leDocumentDesigne("inconnue:c-1"), null);
  // `toutes` n'est pas une famille : c'est leur réunion.
  assert.equal(leDocumentDesigne("toutes:c-1"), null);
});

test("une entrée de rail inconnue ne change pas la vue", () => {
  assert.equal(laFamilleDesignee(FAMILLE.MAIL), FAMILLE.MAIL);
  assert.equal(laFamilleDesignee(TOUTES), TOUTES);
  assert.equal(laFamilleDesignee("autre"), null);
});
