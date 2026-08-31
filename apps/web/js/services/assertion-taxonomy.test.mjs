import test from "node:test";
import assert from "node:assert/strict";

import {
  DOMAIN,
  DOMAINS,
  NATURE,
  NATURES,
  SETTLED_BY,
  UNCLASSIFIED_LABEL,
  classifyAssertion,
  domainLabel,
  filterByTaxonomy,
  natureFromKind,
  natureLabel,
  normalizeDomain,
  normalizeNature,
  isContestable,
  settledBy,
  settledByLabel,
  summarizeTaxonomy
} from "./assertion-taxonomy.js";

const assertion = (patch = {}) => ({ kind: "avis", subject_key: "166", ...patch });

/* ── La nature se déduit, le domaine jamais ──────────────────────────────── */

test("un avis est un constat", () => {
  assert.equal(natureFromKind("avis"), NATURE.CONSTAT);
});

test("un document et un rattachement relèvent de l'intendance", () => {
  assert.equal(natureFromKind("document"), NATURE.INTENDANCE);
  assert.equal(natureFromKind("attachment"), NATURE.INTENDANCE);
});

test("une provenance inconnue ne donne aucune nature", () => {
  // Les hypothèses et les contraintes viendront d'une extraction qui les
  // nomme : aucune provenance ne permet de les deviner.
  assert.equal(natureFromKind("autre chose"), null);
  assert.equal(natureFromKind(""), null);
});

test("le domaine n'est jamais déduit d'une provenance", () => {
  assert.equal(classifyAssertion(assertion()).domain, null);
  assert.equal(classifyAssertion(assertion({ kind: "document" })).domain, null);
});

test("le domaine n'est jamais deviné d'un intitulé", () => {
  // Le piège nommé d'avance : « Sécurité contre l'incendie » dans le titre ne
  // classe pas l'affirmation en incendie. Une lecture filtrée aurait l'air
  // complète en étant fausse.
  const trompeur = assertion({ statement: "Avis 39 — SECURITE CONTRE L'INCENDIE:", detail: "structure béton" });
  assert.equal(classifyAssertion(trompeur).domain, null);
});

/* ── Ce qui est écrit prime sur ce qui se déduit ─────────────────────────── */

test("une nature écrite prime sur celle qu'on déduirait", () => {
  const classe = classifyAssertion(assertion({ nature: "hypothese" }));

  assert.equal(classe.nature, NATURE.HYPOTHESE);
  assert.equal(classe.natureDerived, false);
});

test("une nature déduite se signale comme telle", () => {
  const classe = classifyAssertion(assertion());

  assert.equal(classe.nature, NATURE.CONSTAT);
  assert.equal(classe.natureDerived, true, "l'écran doit pouvoir distinguer une déduction d'une affirmation");
});

test("un domaine écrit est retenu tel quel", () => {
  assert.equal(classifyAssertion(assertion({ domain: "incendie" })).domain, DOMAIN.INCENDIE);
});

test("un domaine accentué se reconnaît", () => {
  assert.equal(normalizeDomain("accessibilité"), DOMAIN.ACCESSIBILITE);
  assert.equal(normalizeDomain("Accessibilite"), DOMAIN.ACCESSIBILITE);
});

test("une valeur inconnue est refusée, jamais rapprochée de la plus proche", () => {
  // Accepter « constats » pour « constat » ouvrirait la porte à l'orthographe
  // libre, et deux graphies feraient deux colonnes dans un filtre.
  assert.equal(normalizeNature("constats"), null);
  assert.equal(normalizeDomain("feu"), null);
  assert.equal(normalizeDomain("structures"), null);
});

test("ce qu'on ne sait pas porte une seule formulation", () => {
  assert.equal(natureLabel(null), UNCLASSIFIED_LABEL);
  assert.equal(domainLabel("n'importe quoi"), UNCLASSIFIED_LABEL);
});

test("chaque nature et chaque domaine porte un libellé français", () => {
  for (const nature of NATURES) assert.notEqual(natureLabel(nature), UNCLASSIFIED_LABEL);
  for (const domaine of DOMAINS) assert.notEqual(domainLabel(domaine), UNCLASSIFIED_LABEL);
  assert.equal(DOMAINS.length, 8, "huit domaines, et ils viennent du métier");
});

/* ── Les compteurs ───────────────────────────────────────────────────────── */

test("les non classés se comptent, ils ne se soustraient pas", () => {
  const resume = summarizeTaxonomy([
    assertion(),
    assertion({ kind: "document" }),
    assertion({ domain: "structure" }),
    assertion({ kind: "inconnu" })
  ]);

  assert.equal(resume.total, 4);
  assert.equal(resume.unclassifiedDomain, 3);
  assert.equal(resume.unclassifiedNature, 1, "la provenance inconnue n'a pas de nature");
});

test("le résumé nomme toutes les natures, y compris celles à zéro", () => {
  // Savoir qu'aucune hypothèse n'a encore été versée est une information ; un
  // tableau qui les cache laisse croire qu'elles n'existent pas.
  const resume = summarizeTaxonomy([assertion()]);

  assert.equal(resume.natures.length, NATURES.length);
  assert.equal(resume.natures.find((entry) => entry.id === NATURE.HYPOTHESE).count, 0);
  assert.equal(resume.domains.length, DOMAINS.length);
});

/* ── Les filtres ─────────────────────────────────────────────────────────── */

test("filtrer par nature ne garde que celle-là", () => {
  const lignes = [assertion(), assertion({ kind: "document" })];

  assert.equal(filterByTaxonomy(lignes, { nature: NATURE.CONSTAT }).length, 1);
  assert.equal(filterByTaxonomy(lignes, { nature: NATURE.INTENDANCE }).length, 1);
});

test("« non classé » est un filtre à part entière", () => {
  // C'est ainsi qu'on va voir ce qui manque, plutôt que de le déduire d'un
  // compteur.
  const lignes = [assertion({ domain: "structure" }), assertion(), assertion({ kind: "document" })];

  assert.equal(filterByTaxonomy(lignes, { domain: "none" }).length, 2);
  assert.equal(filterByTaxonomy(lignes, { domain: DOMAIN.STRUCTURE }).length, 1);
});

test("sans filtre, rien n'est retiré", () => {
  const lignes = [assertion(), assertion({ kind: "document" })];
  assert.equal(filterByTaxonomy(lignes, {}).length, 2);
  assert.equal(filterByTaxonomy(lignes).length, 2);
});

test("les deux filtres se combinent", () => {
  const lignes = [
    assertion({ domain: "structure" }),
    assertion({ kind: "document", domain: "structure" }),
    assertion()
  ];

  const trie = filterByTaxonomy(lignes, { nature: NATURE.CONSTAT, domain: DOMAIN.STRUCTURE });
  assert.equal(trie.length, 1);
});

/* ── Le discriminant : ce qui tranche ────────────────────────────────────── */

test("une contrainte est tranchée par un tiers, jamais par une mesure", () => {
  // C'est tout le débat : une zone de neige se déduit d'une commune, et cette
  // déduction est sa définition. Aucun essai ne la tranche.
  assert.equal(settledBy(NATURE.CONTRAINTE), SETTLED_BY.TIERS);
  assert.notEqual(settledBy(NATURE.CONTRAINTE), SETTLED_BY.MESURE);
});

test("une hypothèse est tranchée par une mesure", () => {
  assert.equal(settledBy(NATURE.HYPOTHESE), SETTLED_BY.MESURE);
});

test("un constat est tranché par une observation déjà faite", () => {
  assert.equal(settledBy(NATURE.CONSTAT), SETTLED_BY.OBSERVATION);
});

test("rien ne tranche une intendance : elle n'affirme rien", () => {
  assert.equal(settledBy(NATURE.INTENDANCE), null);
});

test("les trois connaissances sont tranchées par trois choses différentes", () => {
  // Deux natures qui se tranchent pareil seraient la même nature.
  const tranchants = [NATURE.CONSTAT, NATURE.HYPOTHESE, NATURE.CONTRAINTE].map(settledBy);
  assert.equal(new Set(tranchants).size, 3);
  assert.ok(tranchants.every(Boolean));
});

test("une nature inconnue ne se rapproche d'aucune", () => {
  assert.equal(settledBy("supposition"), null);
  assert.equal(settledByLabel("supposition"), "");
});

/* ── On ne se prononce que sur une hypothèse ─────────────────────────────── */

test("seule une hypothèse se valide ou se conteste", () => {
  assert.equal(isContestable(NATURE.HYPOTHESE), true);
  assert.equal(isContestable(NATURE.CONTRAINTE), false);
  assert.equal(isContestable(NATURE.CONSTAT), false);
  assert.equal(isContestable(NATURE.INTENDANCE), false);
});

test("ce qui n'est pas classé ne se conteste pas non plus", () => {
  // Ne pas savoir de quoi il s'agit n'autorise pas à s'y prononcer.
  assert.equal(isContestable(null), false);
  assert.equal(isContestable(""), false);
});
