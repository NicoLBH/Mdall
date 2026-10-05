/**
 * L'épreuve de l'ordre des documents.
 *
 * **La propriété qui compte : un document sans date ne remonte pas en tête.**
 * C'est le défaut que `tri-des-sujets.js` a déjà payé une fois — une lecture de
 * date qui retombe sur *maintenant* est acceptable pour une phrase et
 * désastreuse pour un tri.
 *
 * Et ici elle vaut doublement : beaucoup de documents n'ont pas de date de
 * document — un fil en cours, un rapport sans cartouche, un document en attente.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  LES_TRIS_DES_DOCUMENTS, LE_TRI_PAR_DEFAUT, SENS, TRI_DES_DOCUMENTS, ceQueLeTriDit,
  combienSansLaDate, laCleDuTri, leTriDesDocumentsValide, leTriDit, linstantDuDocument,
  trierLesDocuments
} from "./le-tri-des-documents.js";

/**
 * **Les quatre ordres, composés comme l'écran les compose.**
 *
 * Les écrire à la main — `"analyse:recent"` — ferait une épreuve qui tient
 * encore le jour où le séparateur change dans le service : elle vérifierait un
 * ordre inconnu, qui retombe sur celui d'arrivée, et passerait au vert sur un
 * menu cassé.
 */
const PAR_ANALYSE = laCleDuTri(TRI_DES_DOCUMENTS.ANALYSE, SENS.RECENT);
const PAR_ANALYSE_A_LENVERS = laCleDuTri(TRI_DES_DOCUMENTS.ANALYSE, SENS.ANCIEN);
const PAR_DOCUMENT = laCleDuTri(TRI_DES_DOCUMENTS.DOCUMENT, SENS.RECENT);
const PAR_DOCUMENT_A_LENVERS = laCleDuTri(TRI_DES_DOCUMENTS.DOCUMENT, SENS.ANCIEN);

const un = (id, { quand = "", lueLe = "" } = {}) => ({ id, titre: id, quand, lueLe });

const LES_TROIS = [
  un("vieux-lu-hier", { quand: "2026-01-10", lueLe: "2026-10-04T10:00:00Z" }),
  un("recent-lu-avant", { quand: "2026-09-30", lueLe: "2026-10-01T10:00:00Z" }),
  un("sans-date-du-document", { quand: "", lueLe: "2026-10-05T10:00:00Z" })
];

/* ── Les deux ordres ──────────────────────────────────────────────────────── */

test("l'ordre d'analyse met en tête ce qui vient d'être lu", () => {
  // La question d'un essai : on vient de lancer une lecture et on la cherche.
  const ranges = trierLesDocuments(LES_TROIS, PAR_ANALYSE);
  assert.deepEqual(ranges.map((document) => document.id),
    ["sans-date-du-document", "vieux-lu-hier", "recent-lu-avant"]);
});

test("l'ordre du document met en tête le plus récent du chantier", () => {
  // La question du chantier : « le compte rendu du 16 avril », pas « celui que
  // j'ai lu mardi ».
  const ranges = trierLesDocuments(LES_TROIS, PAR_DOCUMENT);
  assert.deepEqual(ranges.map((document) => document.id),
    ["recent-lu-avant", "vieux-lu-hier", "sans-date-du-document"]);
});

test("les deux ordres ne rendent pas la même liste", () => {
  // Sinon le menu serait une décoration.
  const parAnalyse = trierLesDocuments(LES_TROIS, PAR_ANALYSE);
  const parDocument = trierLesDocuments(LES_TROIS, PAR_DOCUMENT);
  assert.notDeepEqual(parAnalyse.map((a) => a.id), parDocument.map((a) => a.id));
});

/* ── Un document sans date ────────────────────────────────────────────────── */

test("un document sans date reste derrière, et ne passe pas pour le plus récent", () => {
  const ranges = trierLesDocuments([
    un("sans"), un("date", { quand: "2026-01-10" })
  ], PAR_DOCUMENT);

  assert.deepEqual(ranges.map((document) => document.id), ["date", "sans"]);
});

test("une date illisible ne devient pas aujourd'hui", () => {
  assert.equal(linstantDuDocument(un("x", { quand: "le 18 avril" }),
    PAR_DOCUMENT), null);
  assert.equal(linstantDuDocument(un("x"), PAR_DOCUMENT), null);
  assert.equal(linstantDuDocument(null, PAR_DOCUMENT), null);
});

test("les documents sans date gardent leur ordre d'arrivée", () => {
  // Le tri de JavaScript est stable : les entremêler leur inventerait une place.
  const ranges = trierLesDocuments([
    un("a"), un("b"), un("c"), un("date", { quand: "2026-01-10" })
  ], PAR_DOCUMENT);

  assert.deepEqual(ranges.map((document) => document.id), ["date", "a", "b", "c"]);
});

/* ── Le tri ne change pas le nombre ───────────────────────────────────────── */

test("trier ne retire ni n'ajoute rien, et ne touche pas la liste d'origine", () => {
  // C'est ce qui permet au compteur et à la liste de rester d'accord.
  const origine = [...LES_TROIS];
  const ranges = trierLesDocuments(LES_TROIS, PAR_DOCUMENT);

  assert.equal(ranges.length, LES_TROIS.length);
  assert.deepEqual(LES_TROIS.map((document) => document.id),
    origine.map((document) => document.id), "la liste d'origine a été triée en place");
});

test("rien d'illisible ne fait tomber le tri", () => {
  for (const rien of [null, undefined, "", 0, "des documents"]) {
    assert.deepEqual(trierLesDocuments(rien), []);
  }
  assert.equal(trierLesDocuments(LES_TROIS, "un-tri-quon-na-pas-ecrit").length, 3);
});

/* ── Les ordres déclarés ──────────────────────────────────────────────────── */

test("un ordre inconnu ramène à celui d'origine", () => {
  assert.equal(leTriDesDocumentsValide("un-tri-quon-na-pas-ecrit"), LE_TRI_PAR_DEFAUT);
  assert.equal(leTriDesDocumentsValide(""), LE_TRI_PAR_DEFAUT);
  assert.equal(leTriDesDocumentsValide(null), LE_TRI_PAR_DEFAUT);
  // **Un écran ouvert avant les deux sens** gardait l'axe seul, sans son sens.
  // Il doit s'ouvrir sur ce qu'il montrait hier, et non sur un tableau non rangé.
  assert.equal(leTriDesDocumentsValide(TRI_DES_DOCUMENTS.ANALYSE), LE_TRI_PAR_DEFAUT);
  assert.equal(LE_TRI_PAR_DEFAUT, PAR_ANALYSE);
});

test("chaque ordre porte son libellé, sa question et son champ", () => {
  for (const ordre of LES_TRIS_DES_DOCUMENTS) {
    assert.ok(ordre.libelle?.length > 3, `${ordre.cle} n'a pas de libellé`);
    assert.ok(ordre.question?.endsWith("?"), `${ordre.cle} ne porte pas de question`);
    assert.ok(["quand", "lueLe"].includes(ordre.champ), `${ordre.cle} range sur quoi ?`);
  }
  // L'ordre d'arrivée est en tête : c'est celui sur lequel on atterrit.
  assert.equal(LES_TRIS_DES_DOCUMENTS[0].cle, PAR_ANALYSE);
  assert.equal(leTriDit("n'importe quoi").cle, PAR_ANALYSE);

  // **Quatre, et deux par axe.** Trois voudrait dire qu'un axe ne se renverse
  // pas, et l'écran offrirait un sens qui n'existe que d'un côté.
  assert.equal(LES_TRIS_DES_DOCUMENTS.length, 4);
  for (const axe of Object.values(TRI_DES_DOCUMENTS)) {
    assert.deepEqual(
      LES_TRIS_DES_DOCUMENTS.filter((un) => un.axe === axe).map((un) => un.sens),
      [SENS.RECENT, SENS.ANCIEN], `l'axe ${axe} ne se parcourt pas dans les deux sens`);
  }

  // **Quatre libellés distincts.** Deux ordres du même nom se choisiraient au
  // hasard dans le menu.
  assert.equal(new Set(LES_TRIS_DES_DOCUMENTS.map((un) => un.libelle)).size, 4);
  assert.equal(new Set(LES_TRIS_DES_DOCUMENTS.map((un) => un.cle)).size, 4);
});

/* ── Les deux sens ────────────────────────────────────────────────────────── */

test("chaque axe se renverse, et rend la liste exactement à l'envers", () => {
  const dates = [
    un("a", { quand: "2026-01-10", lueLe: "2026-10-01T10:00:00Z" }),
    un("b", { quand: "2026-03-10", lueLe: "2026-10-02T10:00:00Z" }),
    un("c", { quand: "2026-05-10", lueLe: "2026-10-03T10:00:00Z" })
  ];

  for (const [recent, ancien] of [
    [PAR_ANALYSE, PAR_ANALYSE_A_LENVERS], [PAR_DOCUMENT, PAR_DOCUMENT_A_LENVERS]
  ]) {
    const devant = trierLesDocuments(dates, recent).map((une) => une.id);
    const derriere = trierLesDocuments(dates, ancien).map((une) => une.id);
    assert.deepEqual(derriere, [...devant].reverse(), `${recent} et ${ancien}`);
  }
});

/**
 * **Le piège du sens inverse.**
 *
 * « Le plus ancien d'abord » tenterait de mettre en tête ce qui n'a pas de date
 * — après tout, il pourrait être très vieux. C'est exactement l'invention de
 * place que le tri existe pour empêcher : on ne sait pas quand il date (règle 5).
 */
test("un document sans date reste derrière dans les deux sens", () => {
  for (const ordre of [PAR_DOCUMENT, PAR_DOCUMENT_A_LENVERS]) {
    const ranges = trierLesDocuments([
      un("sans"), un("date", { quand: "2026-01-10" })
    ], ordre);
    assert.deepEqual(ranges.map((une) => une.id), ["date", "sans"], ordre);
  }
});

/* ── Ce que l'écran dit de l'ordre ────────────────────────────────────────── */

/**
 * **Sans cette phrase, un tri par date du document paraîtrait n'avoir rien
 * trié** : la moitié de la liste serait restée en place, et rien ne dirait
 * pourquoi.
 */
test("l'écran dit combien de documents n'ont pas la date sur laquelle on range", () => {
  const dit = ceQueLeTriDit(LES_TROIS, PAR_DOCUMENT);
  assert.match(dit, /1 document ne porte pas de date de document/);
  assert.match(dit, /il reste à la fin, dans l'ordre d'arrivée/);

  assert.equal(combienSansLaDate(LES_TROIS, PAR_DOCUMENT), 1);
  assert.equal(combienSansLaDate(LES_TROIS, PAR_ANALYSE), 0);
});

test("la phrase accorde son pluriel", () => {
  const dit = ceQueLeTriDit([un("a"), un("b")], PAR_DOCUMENT);
  assert.match(dit, /2 documents ne portent pas/);
  assert.match(dit, /ils restent à la fin/);
});

test("rien à expliquer ne s'explique pas", () => {
  // Une phrase qui s'affiche toujours ne se lit jamais.
  assert.equal(ceQueLeTriDit([un("a", { quand: "2026-01-10" })],
    PAR_DOCUMENT), "");
  assert.equal(ceQueLeTriDit([], PAR_DOCUMENT), "");
});

test("un document en attente d'analyse se dit autrement", () => {
  // « ne porte pas de date de document » serait faux : il n'a pas encore été lu.
  const seul = ceQueLeTriDit([un("a", { quand: "2026-01-10" })], PAR_ANALYSE);
  assert.match(seul, /1 document n'a pas encore été analysé :/);

  // Et le pluriel s'accorde des deux côtés : « 1 document ne portent pas » est
  // le défaut que cette épreuve a trouvé au premier passage.
  const deux = ceQueLeTriDit([un("a"), un("b")], PAR_ANALYSE);
  assert.match(deux, /2 documents n'ont pas encore été analysés :/);
});
