/**
 * **Le jeu de référence, éprouvé sur les deux lecteurs de carton.**
 *
 * ## Ce que ces épreuves gardent
 *
 * Un jeu de référence ne peut mentir que de deux façons : **certifier ce qu'on
 * lui montre** — c'est ce qui arrive quand l'annotation a été écrite en lisant
 * la sortie du modèle —, et **résumer en un chiffre** ce qui demande d'être dit
 * par étape.
 *
 * La première se ferme par un refus (`ecritePar`), la seconde par l'absence de
 * tout score unique. Les deux sont gardées ici.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  DOU_VIENT_UNE_ANNOTATION, uneAnnotation
} from "../apps/web/js/services/lannotation.js";
import { leJeuDeReference } from "./le-jeu-de-reference/le-jeu-du-disque.js";
import {
  ETAPE, confronter, laPart, leBilanDuJeu
} from "../apps/web/js/services/la-confrontation.js";
import { POURQUOI_PAS, passerLeJeu } from "../apps/web/js/services/passer-le-jeu.js";
import { OU_EST_LE_CORPUS, leCorpus } from "./la-batterie-des-perturbations/le-corpus.js";
import {
  unLecteurFidele, unLecteurQuiDevine
} from "./la-batterie-des-perturbations/un-lecteur-de-carton.js";
import { FAMILLE } from "../apps/web/js/services/les-familles-de-document.js";

const LE_JEU = leJeuDeReference();
const surLeCorpus = (lire) => async ({ document, famille }) => lire({
  texte: readFileSync(join(OU_EST_LE_CORPUS, document), "utf8"), famille, nom: document });

const uneBrute = (surcharge = {}) => ({
  document: "rict-03-verifas.md",
  famille: FAMILLE.CONTROLE,
  ecritePar: DOU_VIENT_UNE_ANNOTATION.DU_DOCUMENT,
  legende: ["F", "D"],
  releve: [{ reference: "A-07", marque: "F", intitule: "Désenfumage" }],
  pieges: [],
  ...surcharge
});

/* ── L'annotation ────────────────────────────────────────────────────────── */

/**
 * **La faute qui viderait l'exercice de son sens** : annoter en regardant ce que
 * le modèle a rendu. L'annotation certifierait la lecture au lieu de la juger,
 * et le jeu rendrait 100 % pour toujours. Une déclaration qu'on peut oublier ne
 * protège de rien : elle est donc exigée, pas suggérée.
 */
test("une annotation qui ne dit pas d'où elle vient est refusée", () => {
  assert.throws(() => uneAnnotation(uneBrute({ ecritePar: "" }), "x.json"),
    /ne déclare pas d'où vient son annotation/);
  assert.throws(() => uneAnnotation(uneBrute({ ecritePar: "en relisant la lecture" }), "x.json"),
    /ne déclare pas d'où vient son annotation/);
  assert.throws(() => uneAnnotation(undefined, "x.json"), /\(rien\)/);
});

test("une annotation d'une famille que la mesure ne projette pas est refusée", () => {
  assert.throws(() => uneAnnotation(uneBrute({ famille: FAMILLE.MAIL }), "x.json"),
    /ne sait pas projeter/);
  assert.throws(() => uneAnnotation(uneBrute({ famille: "" }), "x.json"), /\(vide\)/);
});

test("une annotation qui ne dit pas quel document elle annote est refusée", () => {
  assert.throws(() => uneAnnotation(uneBrute({ document: "" }), "x.json"),
    /ne dit pas quel document/);
});

/**
 * **Un jeu de référence qui rétrécit en silence rend un score sur moins de
 * documents qu'on ne croit** (règle 5). Il lève, il ne saute pas.
 */
test("une annotation mal formée fait lever la lecture du jeu entier", () => {
  const ou = mkdtempSync(join(tmpdir(), "jeu-"));
  writeFileSync(join(ou, "sans-origine.json"),
    JSON.stringify(uneBrute({ ecritePar: "" })), "utf8");
  assert.throws(() => leJeuDeReference(ou), /ne déclare pas d'où vient/);
});

/**
 * **Un piège sans raison est un piège qu'on retirera au premier désaccord**,
 * faute de savoir pourquoi il était là.
 */
test("un piège sans raison n'entre pas dans l'annotation", () => {
  const lue = uneAnnotation(uneBrute({ pieges: [
    { quoi: "une observation générale", pourquoi: "elle n'a ni référence ni marque" },
    { quoi: "autre chose", pourquoi: "" },
    { quoi: "", pourquoi: "une raison sans objet" }
  ] }), "x.json");
  assert.equal(lue.pieges.length, 1);
});

/* ── Le jeu livré ────────────────────────────────────────────────────────── */

test("chaque document annoté existe dans le corpus, et chaque annotation porte des pièges", () => {
  const duCorpus = new Set(leCorpus().map((un) => un.nom));
  assert.ok(LE_JEU.length >= 2, "le jeu tient en moins de deux documents");

  for (const une of LE_JEU) {
    assert.ok(duCorpus.has(une.document),
      `« ${une.document} » est annoté et n'est pas dans le corpus`);
    assert.ok(une.releve.length, `« ${une.document} » n'attend aucun relevé`);
    /**
     * **Ce que la lecture ne doit pas relever est la moitié qu'on oublie.** Une
     * annotation sans pièges ne mesure que le rappel, et tout relever donne un
     * rappel parfait.
     */
    assert.ok(une.pieges.length, `« ${une.document} » ne porte aucun piège`);
  }
});

/* ── La confrontation ────────────────────────────────────────────────────── */

/**
 * **Jamais un taux sans son assiette.** « 100 % » sur un relevé est la même
 * phrase que « 100 % » sur quatre cents, et ce n'est pas la même information.
 */
test("une part porte son assiette, et rien sur rien n'est pas zéro", () => {
  assert.deepEqual(laPart(3, 4), { combien: 3, sur: 4, part: 0.75 });
  assert.equal(laPart(0, 0).part, null,
    "zéro sur zéro vaut 0 % : on lirait un échec là où il n'y a pas d'épreuve");
  assert.equal(laPart(0, 2).part, 0);
});

/**
 * **Le rappel et la précision ne se résument pas l'un l'autre.** Tout relever
 * donne un rappel parfait ; ne rien relever donne une précision parfaite. Les
 * deux sont donc rendus, et aucun score ne les mélange.
 */
test("le rappel et la précision se séparent", () => {
  const annotation = uneAnnotation(uneBrute({ releve: [
    { reference: "A-07", marque: "F", intitule: "Désenfumage" },
    { reference: "A-12", marque: "D", intitule: "Source" }
  ] }), "x.json");

  // Elle en trouve un sur deux, et n'invente rien : rappel 1/2, précision 1/1.
  const prudente = confronter(annotation,
    { avis: [{ reference: "A-07", marque: "F" }], legende: [], sansStructure: false });
  assert.deepEqual(prudente[ETAPE.RELEVE].rappel, { combien: 1, sur: 2, part: 0.5 });
  assert.deepEqual(prudente[ETAPE.RELEVE].precision, { combien: 1, sur: 1, part: 1 });
  assert.deepEqual(prudente[ETAPE.RELEVE].manques, ["a 12"]);

  // Elle trouve les deux et en invente un : rappel 2/2, précision 2/3.
  const bavarde = confronter(annotation, { avis: [
    { reference: "A-07", marque: "F" }, { reference: "A-12", marque: "D" },
    { reference: "A-99", marque: "F" }
  ], legende: [], sansStructure: false });
  assert.equal(bavarde[ETAPE.RELEVE].rappel.part, 1);
  assert.deepEqual(bavarde[ETAPE.RELEVE].precision, { combien: 2, sur: 3, part: 2 / 3 });
  assert.deepEqual(bavarde[ETAPE.RELEVE].enTrop, ["a 99"]);
});

/**
 * **La marque ne se juge que sur ce qui a été trouvé.** La compter fausse sur un
 * relevé manqué compterait deux fois le même défaut, et ferait croire à deux
 * problèmes là où il n'y en a qu'un.
 */
test("une marque ne se juge pas sur un relevé qu'on n'a pas trouvé", () => {
  const annotation = uneAnnotation(uneBrute({ releve: [
    { reference: "A-07", marque: "F", intitule: "Désenfumage" },
    { reference: "A-12", marque: "D", intitule: "Source" }
  ] }), "x.json");

  const une = confronter(annotation,
    { avis: [{ reference: "A-07", marque: "D" }], legende: [], sansStructure: false });

  assert.deepEqual(une[ETAPE.MARQUE].justesse, { combien: 0, sur: 1, part: 0 },
    "l'assiette des marques compte un relevé manqué");
  assert.equal(une[ETAPE.MARQUE].fausses.length, 1);
  assert.match(une[ETAPE.MARQUE].fausses[0], /attendu « F », lu « D »/);
});

/**
 * **Un piège tombé se nomme.** « Quatre faux positifs » est moins utile que
 * « elle a pris la légende pour quatre avis ».
 */
test("un piège tombé dit lequel, et pourquoi c'en était un", () => {
  const annotation = uneAnnotation(uneBrute({ pieges: [
    { quoi: "RICT-02", pourquoi: "c'est une référence de document, pas un avis" }
  ] }), "x.json");

  const evite = confronter(annotation,
    { avis: [{ reference: "A-07", marque: "F" }], legende: [], sansStructure: false });
  assert.deepEqual(evite[ETAPE.PIEGES].evites, { combien: 1, sur: 1, part: 1 });

  const tombe = confronter(annotation, { avis: [
    { reference: "A-07", marque: "F" }, { reference: "", intitule: "RICT-02", marque: "F" }
  ], legende: [], sansStructure: false });
  assert.deepEqual(tombe[ETAPE.PIEGES].evites, { combien: 0, sur: 1, part: 0 });
  assert.match(tombe[ETAPE.PIEGES].tombes[0], /RICT-02 — c'est une référence de document/);
});

test("une structure non reconnue se dit, et une légende manquée se chiffre", () => {
  const annotation = uneAnnotation(uneBrute({ legende: ["F", "D", "SO"] }), "x.json");

  const une = confronter(annotation, {
    avis: [{ reference: "A-07", marque: "F" }],
    legende: [{ marque: "F" }, { marque: "D" }],
    sansStructure: true
  });

  assert.equal(une[ETAPE.STRUCTURE].tient, false);
  assert.equal(une[ETAPE.STRUCTURE].rendue, false);
  assert.deepEqual(une[ETAPE.LEGENDE].rappel, { combien: 2, sur: 3, part: 2 / 3 });
});

/**
 * **La légende aussi se truque par le rappel seul**, et la batterie de mutations
 * l'a montré sans équivoque : une lecture qui ajoutait la section « Divers » aux
 * rubriques d'un compte rendu gardait 100 %, parce que rien ne regardait ce
 * qu'elle rendait en trop. Tout rendre rend n'importe quel rappel parfait.
 */
test("une légende qui rend plus que ce qu'on attend perd en précision", () => {
  const annotation = uneAnnotation(uneBrute({ legende: ["F", "D"] }), "x.json");

  const juste = confronter(annotation, {
    avis: [{ reference: "A-07", marque: "F" }],
    legende: [{ marque: "F" }, { marque: "D" }], sansStructure: false });
  assert.equal(juste[ETAPE.LEGENDE].precision.part, 1);
  assert.deepEqual(juste[ETAPE.LEGENDE].enTrop, []);

  const bavarde = confronter(annotation, {
    avis: [{ reference: "A-07", marque: "F" }],
    legende: [{ marque: "F" }, { marque: "D" }, { marque: "Divers" }], sansStructure: false });
  assert.equal(bavarde[ETAPE.LEGENDE].rappel.part, 1, "le rappel reste parfait, et c'est le piège");
  assert.deepEqual(bavarde[ETAPE.LEGENDE].precision, { combien: 2, sur: 3, part: 2 / 3 });
  assert.deepEqual(bavarde[ETAPE.LEGENDE].enTrop, ["Divers"]);
});

/**
 * **Un relevé attendu sans référence ni intitulé n'est pas un relevé.** Il n'a
 * pas de clé, rien ne pourra jamais le rapprocher, et le compter dans l'assiette
 * du rappel ferait baisser la mesure d'une annotation mal tapée.
 */
test("une ligne d'annotation sans référence ni intitulé ne gonfle pas l'attendu", () => {
  const annotation = uneAnnotation(uneBrute({ releve: [
    { reference: "A-07", marque: "F", intitule: "Désenfumage" },
    { marque: "D" }
  ] }), "x.json");

  assert.equal(annotation.releve.length, 1);
  const une = confronter(annotation,
    { avis: [{ reference: "A-07", marque: "F" }], legende: [], sansStructure: false });
  assert.deepEqual(une[ETAPE.RELEVE].rappel, { combien: 1, sur: 1, part: 1 });
});

/**
 * **Les parts s'additionnent sur leurs assiettes, et non entre elles.** La
 * moyenne de deux taux pèse autant un document de deux avis qu'un de quarante,
 * et le jeu n'a pas assez de documents pour s'offrir ça.
 */
test("le bilan additionne les assiettes, et ne moyenne pas les taux", () => {
  const bilan = leBilanDuJeu([
    { [ETAPE.STRUCTURE]: { tient: true },
      [ETAPE.LEGENDE]: { rappel: laPart(1, 1), precision: laPart(1, 1) },
      [ETAPE.RELEVE]: { rappel: laPart(1, 1), precision: laPart(1, 1) },
      [ETAPE.MARQUE]: { justesse: laPart(1, 1) },
      [ETAPE.PIEGES]: { evites: laPart(1, 1), tombes: [] } },
    { [ETAPE.STRUCTURE]: { tient: false },
      [ETAPE.LEGENDE]: { rappel: laPart(0, 1), precision: laPart(0, 1) },
      [ETAPE.RELEVE]: { rappel: laPart(10, 40), precision: laPart(10, 10) },
      [ETAPE.MARQUE]: { justesse: laPart(5, 10) },
      [ETAPE.PIEGES]: { evites: laPart(0, 2), tombes: ["la légende prise pour des avis — …"] } }
  ]);

  assert.equal(bilan.documents, 2);
  // 11 sur 41, et non la moyenne de 100 % et 25 %.
  assert.deepEqual(bilan.rappel, { combien: 11, sur: 41, part: 11 / 41 });
  assert.deepEqual(bilan[ETAPE.STRUCTURE], { combien: 1, sur: 2, part: 0.5 });
  assert.deepEqual(bilan[ETAPE.PIEGES], { combien: 1, sur: 3, part: 1 / 3 });
  assert.equal(bilan.piegesTombes.length, 1);
});

/* ── L'orchestration ─────────────────────────────────────────────────────── */

/**
 * **C'est l'épreuve qui justifie le jeu.** Le lecteur qui lit doit faire un
 * sans-faute sur chaque étape ; celui qui devine doit perdre **sur les marques,
 * et là seulement** — il relève les mêmes lignes, il se trompe sur le verdict.
 */
test("le jeu distingue un lecteur qui lit d'un lecteur qui devine", async () => {
  const fidele = await passerLeJeu({ jeu: LE_JEU, lire: surLeCorpus(unLecteurFidele) });

  for (const quoi of [ETAPE.STRUCTURE, ETAPE.MARQUE, ETAPE.PIEGES,
    "legendeRappel", "legendePrecision", "rappel", "precision"]) {
    assert.equal(fidele.bilan[quoi].part, 1,
      `le lecteur fidèle échoue sur « ${quoi} » : ${JSON.stringify(fidele.bilan[quoi])}`);
  }
  assert.equal(fidele.bilan.nonPassees, 0);

  const devine = await passerLeJeu({ jeu: LE_JEU, lire: surLeCorpus(unLecteurQuiDevine("F")) });
  assert.ok(devine.bilan[ETAPE.MARQUE].part < 1,
    "le lecteur qui devine passe les marques : le jeu ne mesure rien");
  assert.equal(devine.bilan.rappel.part, 1,
    "il relève les mêmes lignes : seul le verdict doit bouger");
  assert.equal(devine.bilan.precision.part, 1);
});

/**
 * **Une lecture qui n'aboutit pas n'est pas une lecture fausse.** On ne sait
 * rien de sa justesse si elle n'a pas eu lieu : la compter ferait baisser la
 * courbe sur une panne de réseau.
 */
test("un document qu'on ne sait pas lire se compte à part, sous son motif", async () => {
  const quiRate = async () => ({ ok: false, motif: "le modèle n'a pas répondu" });
  const { confrontations, nonPassees, bilan } = await passerLeJeu({ jeu: LE_JEU, lire: quiRate });

  assert.equal(confrontations.length, 0);
  assert.equal(nonPassees.length, LE_JEU.length);
  assert.equal(nonPassees[0].pourquoiPas, POURQUOI_PAS.LECTURE_MANQUEE);
  assert.match(nonPassees[0].dit, /le modèle n'a pas répondu/);
  assert.equal(bilan.nonPassees, LE_JEU.length);
  assert.equal(bilan.rappel.part, null, "un jeu qui n'a rien lu rend un taux");
  assert.equal(bilan.legendePrecision.part, null);
});

/**
 * **Un document dont on n'attend rien n'est pas un document facile**, c'est une
 * annotation qui n'a pas été écrite. Le confronter donnerait une précision nulle
 * sur tout ce qui est rendu, et un rappel sans objet.
 */
test("une annotation sans relevé attendu ne se confronte pas, et ne lit rien", async () => {
  let appels = 0;
  const compte = async (quoi) => { appels += 1; return surLeCorpus(unLecteurFidele)(quoi); };
  const vide = uneAnnotation(uneBrute({ releve: [] }), "vide.json");

  const { confrontations, nonPassees } = await passerLeJeu({ jeu: [vide], lire: compte });
  assert.equal(confrontations.length, 0);
  assert.equal(nonPassees[0].pourquoiPas, POURQUOI_PAS.RIEN_ATTENDU);
  assert.equal(appels, 0, "un document qu'on ne confronte pas a quand même payé une lecture");
});

test("un jeu vide ne rend pas un bilan vert", async () => {
  const { bilan } = await passerLeJeu({ jeu: [], lire: surLeCorpus(unLecteurFidele) });
  assert.equal(bilan.documents, 0);
  assert.equal(bilan.rappel.part, null);
  assert.equal(bilan[ETAPE.STRUCTURE].part, null);
});
