/**
 * L'épreuve de l'export des analyses.
 *
 * ## Ce qu'elle cherche
 *
 * **Ce qui sert à diagnostiquer.** Un export qui ne distingue pas « on n'a pas
 * su demander » de « il n'y en a aucun », ou qui ne dit pas qu'un filtre était
 * allumé, égare celui qui le relit — et il est fait pour être relu loin de
 * l'écran qui l'explique.
 *
 * Les fixtures ont la forme que `lesDocumentsDuTableau` rend et celle d'une
 * ligne de `rapport_lectures` : une fixture inventée aurait exporté des champs
 * que personne ne produit.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  CE_QUE_LEXPORT_PORTE, SANS_ANALYSE_DEMANDEE, leNomDeLexportDesAnalyses,
  lexportDesAnalyses, lexportDesAnalysesEnJson, phraseDeLexportDesAnalyses
} from "./lexport-des-analyses.js";
import { OU_EN_EST } from "./les-documents-analyses.js";
import { FAMILLE } from "./les-familles-de-document.js";

const LE_JOUR = new Date("2026-10-05T14:32:17Z");

/** Une ligne du tableau, telle que `lesDocumentsDuTableau` la rend. */
const unDocument = (titre, { famille = FAMILLE.CONTROLE, ou = OU_EN_EST.ANALYSE,
  quand = "2026-04-18", lueLe = "2026-10-05T12:00:00Z", motif = "" } = {}) => ({
  id: `l-${titre}`, famille, titre, repere: "n° RICT-03", quand, lueLe,
  dit: "12 avis", luPar: "modèle A · lecture de rapport v2", ou, motif,
  combien: 1, documentId: `d-${titre}`, propositionId: ""
});

/** Une ligne de `rapport_lectures`, avec son analyse gelée. */
const uneLecture = (id, lecture) => ({
  id, document_id: `d-${id}`, proposition_id: null,
  created_at: "2026-10-05T12:00:00Z",
  analyse_gelee: lecture ? { lecture } : null
});

/* ── Le nom du fichier ────────────────────────────────────────────────────── */

test("le nom porte l'heure, parce qu'on en prend trois dans la même heure", () => {
  // L'export des idées se contente du jour : on en prend un par semaine.
  // Celui-ci se prend trois fois pendant un essai, et trois fichiers du même
  // nom se recouvrent.
  assert.equal(leNomDeLexportDesAnalyses(LE_JOUR), "mdall-analyses-2026-10-05T14-32.json");
  // Pas de deux-points : des systèmes de fichiers les refusent.
  assert.doesNotMatch(leNomDeLexportDesAnalyses(LE_JOUR), /:/);
  assert.match(leNomDeLexportDesAnalyses("pas une date"), /^mdall-analyses-\d{4}-\d{2}-\d{2}/);
});

/* ── Ce que l'écran montrait au moment du clic ───────────────────────────── */

/**
 * **Un filtre allumé change ce que l'export porte**, et le taire égare.
 *
 * Trois documents exportés se liraient « ce chantier n'en a que trois » là où
 * une pastille en cachait quarante. C'est la première chose qui trompe quand on
 * relit un export (règle 5).
 */
test("un filtre allumé se dit, avec son avertissement", () => {
  const avec = lexportDesAnalyses({
    documents: [unDocument("RICT-03.pdf")], famille: FAMILLE.CONTROLE,
    filtre: OU_EN_EST.ECHOUE, quand: LE_JOUR
  });

  assert.equal(avec.regarde.filtre, OU_EN_EST.ECHOUE);
  assert.match(avec.regarde.attention, /pas tous ceux du chantier/);

  const sans = lexportDesAnalyses({ documents: [unDocument("RICT-03.pdf")], quand: LE_JOUR });
  assert.equal(sans.regarde.attention, undefined,
    "l'avertissement s'affiche sans filtre : on le lirait toujours, donc jamais");
});

/* ── Ce qui n'a pas pu être lu ────────────────────────────────────────────── */

test("« on n'a pas su demander » ne se dit pas comme « il n'y en a aucun »", () => {
  // Les deux mènent à des décisions opposées, et c'est exactement ce qu'on
  // cherche quand un essai ne donne rien.
  const rate = lexportDesAnalyses({ documents: null, analyses: null, quand: LE_JOUR });
  assert.deepEqual(rate.manques, ["les documents du tableau", "les analyses conservées"]);

  const vide = lexportDesAnalyses({ documents: [], analyses: [], quand: LE_JOUR });
  assert.deepEqual(vide.manques, []);
  assert.equal(vide.comptes.documents, 0);
});

/* ── Les comptes ──────────────────────────────────────────────────────────── */

test("les comptes disent par famille et par état, et les états à zéro restent", () => {
  const porte = lexportDesAnalyses({
    documents: [
      unDocument("RICT-03.pdf"),
      unDocument("RICT-04.pdf", { ou: OU_EN_EST.ECHOUE, motif: "le serveur a répondu 500" }),
      unDocument("CR-12.pdf", { famille: FAMILLE.CR, ou: OU_EN_EST.ATTENTE })
    ],
    quand: LE_JOUR
  });

  assert.equal(porte.comptes.documents, 3);
  assert.equal(porte.comptes.parFamille[FAMILLE.CONTROLE], 2);
  assert.equal(porte.comptes.parFamille[FAMILLE.CR], 1);
  // **Une famille à zéro garde sa clé** : relue dans un fichier, une famille
  // absente se lit « cette famille n'existe pas » et non « il n'y en a aucun ».
  assert.equal(porte.comptes.parFamille[FAMILLE.MAIL], 0);
  // Et le total ne s'y mêle pas : posé à côté de ses parts, il fait compter
  // deux fois celui qui additionne la colonne.
  assert.equal(Object.hasOwn(porte.comptes.parFamille, "toutes"), false);

  assert.equal(porte.comptes.parEtat[OU_EN_EST.ECHOUE], 1);
  assert.equal(porte.comptes.parEtat[OU_EN_EST.ANALYSE], 1);
  assert.equal(porte.comptes.parEtat[OU_EN_EST.ATTENTE], 1);
});

/**
 * **Les états exportés sont ceux que le tableau compte**, et non ceux que
 * `OU_EN_EST` déclare.
 *
 * La batterie de mutations a trouvé ici une normalisation qui ne pouvait pas
 * tomber — et qui faisait pire que rien : elle parcourait `OU_EN_EST`, qui porte
 * un quatrième état, `jamais`. `lesComptesParEtat` l'omet volontairement — « le
 * tableau ne liste que ce qui a une trace » —, et l'export ajoutait donc un
 * `jamais: 0` perpétuel : un état que le produit ne compte pas, présenté comme
 * toujours vide.
 */
test("l'export n'invente pas un état que le tableau ne compte pas", () => {
  const porte = lexportDesAnalyses({ documents: [unDocument("RICT-03.pdf")], quand: LE_JOUR });

  assert.deepEqual(Object.keys(porte.comptes.parEtat).sort(),
    [OU_EN_EST.ANALYSE, OU_EN_EST.ATTENTE, OU_EN_EST.ECHOUE].sort());
  assert.equal(Object.hasOwn(porte.comptes.parEtat, OU_EN_EST.JAMAIS), false,
    "« jamais » est exporté : un état que le produit ne compte pas, toujours vide");
});

/* ── Un document exporté ──────────────────────────────────────────────────── */

test("les deux dates restent séparées", () => {
  // Les confondre rendrait impossible de dire si un document récent a été lu
  // anciennement, ou l'inverse.
  const [un] = lexportDesAnalyses({
    documents: [unDocument("RICT-03.pdf", { quand: "2026-04-18", lueLe: "2026-10-05T12:00:00Z" })],
    quand: LE_JOUR
  }).documents;

  assert.equal(un.duDocumentLe, "2026-04-18");
  assert.equal(un.analyseLe, "2026-10-05T12:00:00Z");
});

test("le motif d'un échec est exporté, et c'est la ligne qu'on cherche", () => {
  // À l'écran, il ne vit que dans l'infobulle d'un badge.
  const [un] = lexportDesAnalyses({
    documents: [unDocument("RICT-04.pdf",
      { ou: OU_EN_EST.ECHOUE, motif: "le serveur a répondu 500" })],
    quand: LE_JOUR
  }).documents;

  assert.equal(un.ou, OU_EN_EST.ECHOUE);
  assert.equal(un.motif, "le serveur a répondu 500");
  assert.equal(un.familleDite, "Bureau de Contrôle");
});

/* ── Une analyse exportée ─────────────────────────────────────────────────── */

/**
 * **Le cas le plus fréquent d'un essai qui « ne donne rien » : une analyse vide.**
 *
 * Le reconnaître dans un JSON de trois cents lignes demande de savoir où
 * regarder. `vide` le calcule, et `sansAnalyse` dit l'autre cas — une lecture
 * enregistrée qui n'a rien rendu du tout.
 */
test("une analyse vide se dit vide, et une lecture sans analyse le dit aussi", () => {
  const porte = lexportDesAnalyses({
    analyses: [
      uneLecture("l-1", { structure: null, avis: [], markdown: "", legende: [] }),
      uneLecture("l-2", null),
      uneLecture("l-3", {
        structure: { nature: "rapport initial" },
        avis: [{ reference: "A-07" }, { reference: "A-12" }],
        avisEcartes: 3, markdown: "## Avis\n", legende: [{ marque: "F" }],
        luPar: "modèle A · v2"
      })
    ],
    quand: LE_JOUR
  });

  const [vide, sans, pleine] = porte.analyses;

  assert.equal(vide.ceQuOnEnLit.vide, true);
  assert.equal(vide.ceQuOnEnLit.releves, 0);

  /**
   * **Et la phrase ne dit plus que la lecture n'a rien rendu.**
   *
   * Elle disait « cette ligne de lecture ne porte aucune analyse gelée ». Le
   * premier export réel l'a posée sur les quinze lignes du chantier, analyses
   * comprises — parce que le tableau **ne demande pas** cette colonne, qui porte
   * la transcription entière. L'outil fait pour diagnostiquer fabriquait la
   * panne qu'il cherchait (règle 5).
   */
  assert.equal(sans.sansAnalyse, SANS_ANALYSE_DEMANDEE);
  assert.match(sans.sansAnalyse, /n'a pas été emportée/);
  assert.match(sans.sansAnalyse, /le tableau ne charge pas la colonne/);
  assert.doesNotMatch(sans.sansAnalyse, /ne porte aucune analyse/);
  assert.equal(sans.ceQuOnEnLit, null);

  assert.equal(pleine.ceQuOnEnLit.vide, false);
  assert.equal(pleine.ceQuOnEnLit.releves, 2);
  // Ce que la porte a jeté : il dit si la lecture a relevé et perdu, ou n'a
  // rien relevé.
  assert.equal(pleine.ceQuOnEnLit.ecartes, 3);
  assert.equal(pleine.ceQuOnEnLit.marquesDeLaLegende, 1);
  assert.equal(pleine.ceQuOnEnLit.luPar, "modèle A · v2");
  // L'analyse entière voyage en dernier : c'est le volume.
  assert.equal(pleine.analyse.lecture.structure.nature, "rapport initial");
});

test("les points d'un compte rendu se comptent comme les avis d'un rapport", () => {
  const [un] = lexportDesAnalyses({
    analyses: [uneLecture("l-1", { points: [{ numero: "1" }, { numero: "2" }, { numero: "3" }] })],
    quand: LE_JOUR
  }).analyses;

  assert.equal(un.ceQuOnEnLit.releves, 3);
});

test("rien d'illisible ne fait tomber l'export", () => {
  for (const rien of [null, undefined, "", 0, "des documents"]) {
    const porte = lexportDesAnalyses({ documents: rien, analyses: rien, quand: LE_JOUR });
    assert.ok(Array.isArray(porte.documents));
    assert.ok(Array.isArray(porte.analyses));
  }
  // Et une ligne illisible dans une liste lisible ne jette pas les autres.
  const porte = lexportDesAnalyses({
    documents: [null, unDocument("RICT-03.pdf"), "x"], quand: LE_JOUR
  });
  assert.equal(porte.documents.length, 1);
});

/* ── Ce que le fichier dit de lui-même ────────────────────────────────────── */

test("le fichier dit qu'il porte du contenu de chantier", () => {
  // On le relira loin de l'écran qui l'explique.
  const porte = lexportDesAnalyses({ documents: [], quand: LE_JOUR });
  assert.equal(porte.note, CE_QUE_LEXPORT_PORTE);
  assert.match(porte.note, /contenu de votre chantier/);
  assert.match(porte.note, /ne traverse aucun réseau/);
  assert.match(porte.note, /Ne le déposez pas/);
});

test("le JSON se relit, et l'ordre met le diagnostic devant le volume", () => {
  const json = lexportDesAnalysesEnJson({
    documents: [unDocument("RICT-03.pdf")],
    analyses: [uneLecture("l-1", { avis: [{ reference: "A-07" }] })],
    quand: LE_JOUR
  });

  const relu = JSON.parse(json);
  assert.equal(relu.documents.length, 1);

  // Celui qui ouvre ce fichier cherche ce qui ne va pas : il ne doit pas
  // parcourir trois cents lignes d'analyses pour le trouver.
  const ou = (clef) => json.indexOf(`"${clef}"`);
  assert.ok(ou("manques") < ou("comptes"));
  assert.ok(ou("comptes") < ou("documents"));
  assert.ok(ou("documents") < ou("analyses"));
});

/* ── La phrase du bouton ──────────────────────────────────────────────────── */

test("la phrase dit ce qu'on emporte, et ce qui ne va pas", () => {
  const dit = phraseDeLexportDesAnalyses({
    documents: [
      unDocument("RICT-03.pdf"),
      unDocument("RICT-04.pdf", { ou: OU_EN_EST.ECHOUE }),
      unDocument("CR-12.pdf", { ou: OU_EN_EST.ATTENTE })
    ],
    analyses: [uneLecture("l-1", { avis: [] })],
    quand: LE_JOUR
  });

  assert.match(dit, /3 documents et 1 analyse conservée/);
  // Ce qui ne va pas, dans la phrase du bouton : on exporte pour le montrer.
  assert.match(dit, /dont 1 en échec et 1 en attente/);
  assert.match(dit, /contenu de votre chantier/);
});

test("rien à exporter se dit, et ne se tait pas", () => {
  const dit = phraseDeLexportDesAnalyses({ documents: [], analyses: [], quand: LE_JOUR });
  assert.match(dit, /rien à exporter/);
  assert.match(dit, /aucun document analysé/);
});
