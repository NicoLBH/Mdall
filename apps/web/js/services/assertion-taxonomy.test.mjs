import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  DOMAIN,
  DOMAINS,
  NATURE,
  NATURES,
  SETTLED_BY,
  UNCLASSIFIED_LABEL,
  classifyAssertion,
  estUneRegle,
  domainLabel,
  filterByTaxonomy,
  natureFromKind,
  natureIndefinie,
  natureLabel,
  normalizeDomain,
  normalizeNature,
  isContestable,
  sansTranchantLabel,
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

test("rien ne tranche une intendance ni un raisonnement : ils n'affirment rien", () => {
  assert.equal(settledBy(NATURE.INTENDANCE), null);
  // Un raisonnement ne dit pas ce qui est vrai, il dit par où l'on y est
  // arrivé. Ce sont ses étapes qui se tranchent, chacune à sa façon.
  assert.equal(settledBy(NATURE.RAISONNEMENT), null);
});

test("les connaissances sont tranchées par des choses différentes", () => {
  // Deux natures qui se tranchent pareil seraient la même nature. La décision
  // en fait partie : ce qui la tranche est un humain, et rien d'autre ne l'est.
  const tranchants = [
    NATURE.CONSTAT, NATURE.HYPOTHESE, NATURE.CONTRAINTE, NATURE.DONNEE_BASE, NATURE.DECISION
  ].map(settledBy);
  assert.equal(new Set(tranchants).size, 5);
  assert.ok(tranchants.every(Boolean));
});

test("les deux natures neuves sont déclarées, et rien ne les remplit encore", () => {
  // Déclarées : le vocabulaire les connaît, un filtre les propose, l'écran peut
  // dire qu'il n'en a aucune. Vides : rien dans le code ne produit ces natures,
  // et le rattrapage par `kind` ne les invente pas non plus.
  assert.equal(normalizeNature("decision"), NATURE.DECISION);
  assert.equal(normalizeNature("raisonnement"), NATURE.RAISONNEMENT);
  assert.equal(natureLabel(NATURE.DECISION), "Décision");
  assert.equal(natureLabel(NATURE.RAISONNEMENT), "Raisonnement");

  for (const kind of ["hypothesis", "base-datum", "review", "document", "link", ""]) {
    const { nature } = classifyAssertion({ kind });
    assert.notEqual(nature, NATURE.DECISION, kind);
    assert.notEqual(nature, NATURE.RAISONNEMENT, kind);
  }
});

test("l'ordre des natures est celui de la barre latérale, et il n'y en a qu'un", () => {
  assert.deepEqual(NATURES, [
    "contrainte", "decision", "raisonnement", "constat", "hypothese", "donnee-de-base", "intendance"
  ]);
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

/* ── L'article vient avec le nom ─────────────────────────────────────────── */

test("chaque nature porte son article : deux sont masculines", () => {
  // « On ne se prononce pas sur une constat » se lisait ainsi avant que
  // l'article suive le nom. Le raisonnement aurait fait la deuxième faute.
  assert.equal(natureIndefinie(NATURE.CONSTAT), "un constat");
  assert.equal(natureIndefinie(NATURE.RAISONNEMENT), "un raisonnement");
  assert.equal(natureIndefinie(NATURE.DECISION), "une décision");
  assert.equal(natureIndefinie(NATURE.CONTRAINTE), "une contrainte");
  assert.equal(natureIndefinie(NATURE.DONNEE_BASE), "une donnée de base");

  // Une nature qu'on ne connaît pas se dit, elle ne se tait pas.
  assert.equal(natureIndefinie("supposition"), "une affirmation non classée");
});

test("une nature que rien ne tranche dit pourquoi, chacune à sa façon", () => {
  // Une seule phrase pour les deux était fausse deux fois sur le raisonnement :
  // le genre, et le fond — il n'est pas la matière dont on extrait.
  assert.match(sansTranchantLabel(NATURE.INTENDANCE), /^rien ne la tranche/);
  assert.match(sansTranchantLabel(NATURE.RAISONNEMENT), /^rien ne le tranche/);

  // Une nature qu'un tranchant désigne n'a rien à dire ici.
  assert.equal(sansTranchantLabel(NATURE.CONTRAINTE), "");
  assert.equal(sansTranchantLabel("supposition"), "");
});

/* ── Ce qu'est une règle ─────────────────────────────────────────────────── */

test("une règle se reconnaît à son instantané, et pas à une nature", () => {
  // **Elle n'en a pas, et c'est voulu.** Une règle n'affirme rien sur
  // l'ouvrage : c'est un texte qui dit comment une valeur se déduit. Lui donner
  // une nature ferait passer un raisonnement écrit pour un fait constaté.
  const regle = { payload: { subject: "Taux de TVA", value: "5,5 %", referentiel: true } };
  const valeur = { payload: { subject: "Profondeur hors gel", value: "0,47 m" } };

  assert.equal(estUneRegle(regle), true);
  assert.equal(estUneRegle(valeur), false);
  assert.equal(estUneRegle({}), false);
  assert.equal(estUneRegle(null), false);

  // Et elle n'en reçoit pas non plus par déduction.
  assert.equal(classifyAssertion(regle).nature, null);
});

test("« une règle » ne se redéfinit nulle part ailleurs", () => {
  // **Elle était écrite quatre fois**, dans quatre modules. Le jour où
  // l'instantané changerait de nom, trois d'entre eux chercheraient encore
  // l'ancien — sans rien casser, en rendant simplement des listes plus courtes.
  // C'est le mode de défaillance le plus cher : aucun écran ne tombe, tout est
  // un peu faux (règle 10).
  const dossier = dirname(fileURLToPath(import.meta.url));

  const copies = readdirSync(dossier)
    .filter((nom) => nom.endsWith(".js") && nom !== "assertion-taxonomy.js")
    .filter((nom) => /payload\?\.referentiel === true/.test(readFileSync(join(dossier, nom), "utf8")));

  assert.deepEqual(copies, [],
    `ces modules redéfinissent « une règle » au lieu de l'importer :\n  ${copies.join("\n  ")}`);
});
