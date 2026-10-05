/**
 * **La ligne du temps, et les deux pièges qu'elle porte.**
 *
 * Ce qui est gardé ici n'est pas qu'elle trie — un tri se voit. C'est qu'elle
 * **refuse d'élire une des deux lignes**, qu'elle ne date pas ce qu'elle ne sait
 * pas dater, et qu'elle ne laisse pas une déduction remonter le temps.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  CE_QUE_DIT_LA_NATURE, LES_FAMILLES_DATEES, NATURE, lesFaitsDatesDuneLecture, unFaitDate
} from "./les-faits-dates.js";
import {
  ceQuiSepareLesDeuxLignes, laLigneDuTemps, laPlaceDesLectures, leBilanDeLaLigne
} from "./la-ligne-du-temps.js";
import { PLACE, REVISION } from "./la-chronologie-des-sources.js";
import { FAMILLE } from "./les-familles-de-document.js";

const unCr = ({ document = "CR_14.pdf", quand = "2026-04-30", deposeLe = "2026-05-02",
  points = [] } = {}) => ({ document, famille: FAMILLE.CR, quand, deposeLe, lecture: { points } });

const unRapport = ({ document = "RICT-03.pdf", quand = "2026-04-18", deposeLe = "2026-04-20",
  avis = [] } = {}) =>
  ({ document, famille: FAMILLE.CONTROLE, quand, deposeLe, lecture: { avis } });

/* ── Le fait daté ────────────────────────────────────────────────────────── */

/**
 * **`quand` et `dou.quand` sont deux choses, et c'est tout l'intérêt.**
 *
 * Un fait du 22 avril rapporté le 30 entre dans l'histoire à sa place, et l'on
 * sait aussi quand on l'a appris. La seconde date explique pourquoi personne n'a
 * réagi avant le 30 — ce qui est souvent la vraie question.
 */
test("un fait porte sa date et celle du document qui le rapporte", () => {
  const un = unFaitDate({
    quand: "2026-04-22", dit: "ferraillage coulé", nature: NATURE.CONSTAT, reference: "02.3",
    dou: { document: "CR_14.pdf", famille: FAMILLE.CR, quand: "2026-04-30" }
  });

  assert.equal(un.quand, "2026-04-22");
  assert.equal(un.dou.quand, "2026-04-30");
  assert.notEqual(un.quand, un.dou.quand,
    "les deux dates se confondent : la ligne du temps perd ce qu'elle existe pour voir");
});

test("les deux écritures de date se lisent, et une date fausse ne se date pas", () => {
  const faire = (quand) => unFaitDate({ quand, dit: "x", nature: NATURE.CONSTAT });
  assert.equal(faire("2026-04-22").quand, "2026-04-22");
  assert.equal(faire("22/04/2026").quand, "2026-04-22");
  assert.equal(faire("22 avril 2026").quand, "2026-04-22");
  assert.equal(faire("2026-02-31"), null, "le 31 février existe en arithmétique, pas au calendrier");
});

/**
 * **Ce qu'on ne sait pas dater se dit, et ne s'insère pas.** Une suite fausse
 * est pire qu'une suite incomplète (règle 5). La règle se tient à la source, et
 * non à l'affichage : un fait sans date ne doit pas pouvoir circuler.
 */
test("un fait qu'on ne sait pas dater n'est pas un fait", () => {
  for (const manque of [
    { quand: "", dit: "x", nature: NATURE.CONSTAT },
    { quand: "pas une date", dit: "x", nature: NATURE.CONSTAT },
    { quand: "2026-04-22", dit: "", nature: NATURE.CONSTAT },
    { quand: "2026-04-22", dit: "x", nature: "" },
    { quand: "2026-04-22", dit: "x", nature: "une_nature_quon_na_pas_ecrite" }
  ]) {
    assert.equal(unFaitDate(manque), null, JSON.stringify(manque));
  }
  assert.equal(unFaitDate(), null);
});

test("chaque nature a son mot, et aucune n'en est dépourvue", () => {
  for (const nature of Object.values(NATURE)) {
    assert.ok(CE_QUE_DIT_LA_NATURE[nature], `« ${nature} » n'a pas de mot`);
  }
});

/**
 * **Un point de compte rendu produit jusqu'à deux faits.** Sa colonne de
 * fermeture est un constat daté du jour où la chose a eu lieu ; son échéance est
 * un engagement daté du futur. Les fondre à la date de la réunion perdrait
 * exactement ce qu'on vient chercher.
 */
test("un point de compte rendu rend son constat et son engagement, à leurs dates", () => {
  const { faits } = lesFaitsDatesDuneLecture({ points: [{
    reference: "02.3", titre: "Dalle du préau", description: "Ferraillage coulé",
    faitLe: "2026-04-22", echeance: "2026-05-15"
  }] }, { document: "CR_14.pdf", famille: FAMILLE.CR, quand: "2026-04-30" });

  assert.equal(faits.length, 2);
  const [constat, engagement] = faits;
  assert.deepEqual([constat.nature, constat.quand], [NATURE.CONSTAT, "2026-04-22"]);
  assert.deepEqual([engagement.nature, engagement.quand], [NATURE.ENGAGEMENT, "2026-05-15"]);
  assert.equal(constat.dou.quand, "2026-04-30");
  assert.equal(engagement.dou.quand, "2026-04-30");
});

test("un point sans date propre est daté de la réunion, et n'en produit qu'un", () => {
  const { faits } = lesFaitsDatesDuneLecture(
    { points: [{ reference: "02.7", titre: "Réservations", description: "non implantées" }] },
    { document: "CR_14.pdf", famille: FAMILLE.CR, quand: "2026-04-30" });

  assert.equal(faits.length, 1);
  assert.equal(faits[0].quand, "2026-04-30");
  assert.equal(faits[0].nature, NATURE.CONSTAT);
});

/**
 * **Un avis est daté du rapport qui le porte.** Le bureau se prononce le jour de
 * son rapport ; lui prêter la date de l'ouvrage examiné ferait remonter un avis
 * d'avril au mois de la coulée.
 */
test("un avis de contrôle est daté du rapport", () => {
  const { faits } = lesFaitsDatesDuneLecture(
    { avis: [{ reference: "A-12", intitule: "Source auxiliaire", marque: "D", constat: "45 min" }] },
    { document: "RICT-03.pdf", famille: FAMILLE.CONTROLE, quand: "2026-04-18" });

  assert.equal(faits.length, 1);
  assert.equal(faits[0].nature, NATURE.AVIS);
  assert.equal(faits[0].quand, "2026-04-18");
  assert.match(faits[0].dit, /Source auxiliaire — D 45 min/);
});

test("ce qui n'a pas pu être daté se compte, et n'entre pas dans la ligne", () => {
  const { faits, sansDate } = lesFaitsDatesDuneLecture({ points: [
    { reference: "02.3", titre: "Dalle", faitLe: "2026-04-22" },
    { reference: "02.9", titre: "Sans titre ni date", echeance: "pas une date" }
  ] }, { document: "CR_14.pdf", famille: FAMILLE.CR, quand: "2026-04-30" });

  assert.equal(faits.length, 2, "le point sans échéance lisible garde son constat");
  assert.equal(sansDate, 1, "l'échéance illisible ne se compte pas");
});

/**
 * **Une famille absente lève.** Un moteur qui saute en silence ce qu'il ne sait
 * pas lire rend une chronologie sur un corpus qu'il n'a pas lu (règle 5).
 */
test("une famille que la ligne du temps ne sait pas dater fait lever", () => {
  assert.throws(() => lesFaitsDatesDuneLecture({}, { famille: FAMILLE.MAIL }),
    /ne sait pas dater/);
  assert.throws(() => lesFaitsDatesDuneLecture({}, {}), /\(vide\)/);
  assert.deepEqual(LES_FAMILLES_DATEES.sort(), [FAMILLE.CR, FAMILLE.CONTROLE].sort());
});

/* ── La place d'une lecture ──────────────────────────────────────────────── */

/**
 * **Chaque famille se place dans la sienne.** Un rapport de contrôle ne recule
 * pas parce qu'un compte rendu plus récent existe : ils ne révisent pas les
 * mêmes sujets, et les mêler ferait reculer tout ce qui n'est pas de la famille
 * la plus bavarde.
 */
test("une lecture se place parmi celles de sa propre famille", () => {
  const placees = laPlaceDesLectures([
    unCr({ quand: "2026-09-10", deposeLe: "2026-09-12" }),
    unRapport({ document: "RICT-03.pdf", quand: "2026-04-18", deposeLe: "2026-09-20" })
  ]);

  const leRapport = placees.find((une) => une.famille === FAMILLE.CONTROLE);
  assert.equal(leRapport.placement.place, PLACE.EN_TETE,
    "un rapport recule à cause d'un compte rendu : les familles sont mêlées");
});

/**
 * **L'ordre du dépôt est la vérité de ce qu'on savait.** « Ce qui était déjà
 * connu » est ce qu'on avait **lu**, pas ce qui existait : une archive déposée
 * aujourd'hui n'était pas connue hier.
 */
test("une archive déposée après plus récent qu'elle est rétrospective", () => {
  const placees = laPlaceDesLectures([
    unRapport({ document: "RICT-03.pdf", quand: "2026-04-18", deposeLe: "2026-04-20" }),
    unRapport({ document: "RICT-01.pdf", quand: "2025-11-06", deposeLe: "2026-09-01" })
  ]);

  const parDocument = new Map(placees.map((une) => [une.document, une.placement.place]));
  assert.equal(parDocument.get("RICT-03.pdf"), PLACE.EN_TETE);
  assert.equal(parDocument.get("RICT-01.pdf"), PLACE.RETROSPECTIVE);
});

/**
 * **« Ce qui était déjà connu » est ce qu'on avait lu, pas ce qui existait.**
 *
 * C'est la première règle de la ligne du temps, et elle se voit ici : un rapport
 * ancien **déposé en premier** est en tête, parce qu'à l'instant où on l'a lu,
 * rien de plus récent n'était connu. Le juger sur l'état d'aujourd'hui le ferait
 * reculer rétroactivement — et lui retirerait le droit de fermer un sujet qu'il
 * avait pourtant le droit de fermer le jour où on l'a lu.
 */
test("une lecture se place parmi celles déjà lues, et non parmi celles qui existent", () => {
  /**
   * **Trois documents, et c'est le minimum.** Avec deux, le premier ne voit rien
   * et le second voit le premier : la règle tient par accident. Il faut un
   * document du **milieu** pour que « ce qui suit » puisse le faire reculer à
   * tort — et c'est la batterie de mutations qui l'a montré, en cassant la règle
   * sans faire tomber une épreuve à deux documents.
   */
  const placees = laPlaceDesLectures([
    unRapport({ document: "RICT-01.pdf", quand: "2025-11-06", deposeLe: "2025-11-08" }),
    unRapport({ document: "RICT-02.pdf", quand: "2026-02-13", deposeLe: "2026-02-15" }),
    unRapport({ document: "RICT-03.pdf", quand: "2026-04-18", deposeLe: "2026-04-20" })
  ]);

  for (const une of placees) {
    assert.equal(une.placement.place, PLACE.EN_TETE,
      `« ${une.document} » recule alors qu'il est arrivé dans l'ordre : `
      + "il est jugé sur ce qu'on sait aujourd'hui, et non sur ce qu'on savait alors");
  }
});

/* ── Les deux lignes ─────────────────────────────────────────────────────── */

/**
 * **Deux lignes, et jamais une seule.**
 *
 * La vécue explique les décisions prises ; la reconstituée dit ce qui s'est
 * passé. Élire l'une ferait perdre l'autre, et elles ne répondent pas à la même
 * question.
 */
test("la ligne vécue suit le dépôt, la reconstituée suit les faits", () => {
  const { vecue, reconstituee } = laLigneDuTemps([
    unCr({ quand: "2026-04-30", deposeLe: "2026-05-02", points: [
      { reference: "02.3", titre: "Dalle", faitLe: "2026-04-22" }] }),
    unRapport({ document: "RICT-01.pdf", quand: "2025-11-06", deposeLe: "2026-09-01",
      avis: [{ reference: "A-55", intitule: "Trappe", marque: "SO" }] })
  ]);

  // Le rapport de 2025 est déposé en dernier : il arrive en fin de ligne vécue…
  assert.deepEqual(vecue.map((un) => un.reference), ["02.3", "A-55"]);
  // …et en tête de la reconstituée, parce que c'est là qu'il a eu lieu.
  assert.deepEqual(reconstituee.map((un) => un.reference), ["A-55", "02.3"]);
});

test("un corpus arrivé dans l'ordre donne deux lignes identiques", () => {
  const { vecue, reconstituee } = laLigneDuTemps([
    unRapport({ document: "RICT-01.pdf", quand: "2025-11-06", deposeLe: "2025-11-08",
      avis: [{ reference: "A-55", intitule: "Trappe", marque: "SO" }] }),
    unRapport({ document: "RICT-03.pdf", quand: "2026-04-18", deposeLe: "2026-04-20",
      avis: [{ reference: "A-12", intitule: "Source", marque: "D" }] })
  ]);

  const ecart = ceQuiSepareLesDeuxLignes(vecue, reconstituee);
  assert.equal(ecart.deplaces, 0,
    "les deux lignes diffèrent sur un corpus arrivé dans l'ordre");
  assert.equal(ecart.combien, 2);
});

/**
 * **C'est l'écart qui dit si la distinction sert.** Sur un chantier dont tout
 * est arrivé dans l'ordre, il n'y a rien à arbitrer. Le jour où une archive est
 * déposée, l'écart saute — et c'est ce jour-là qu'il faut savoir laquelle des
 * deux lignes on interroge.
 */
test("l'écart entre les deux lignes se chiffre", () => {
  const { vecue, reconstituee } = laLigneDuTemps([
    unRapport({ document: "RICT-03.pdf", quand: "2026-04-18", deposeLe: "2026-04-20",
      avis: [{ reference: "A-12", intitule: "Source", marque: "D" }] }),
    unRapport({ document: "RICT-01.pdf", quand: "2025-11-06", deposeLe: "2026-09-01",
      avis: [{ reference: "A-55", intitule: "Trappe", marque: "SO" }] })
  ]);

  assert.equal(ceQuiSepareLesDeuxLignes(vecue, reconstituee).deplaces, 2);
});

/**
 * **Un fait daté traverse, une déduction non.** La règle vient de
 * `la-chronologie-des-sources.js`, et elle monte ici d'un étage : un document
 * rétrospectif peut ouvrir un sujet et le fermer sur une phrase, jamais le
 * fermer sur son silence.
 */
/**
 * **Deux faits du même jour ne sont pas le même fait.**
 *
 * L'écart se mesure fait par fait, et non date par date : deux documents qui
 * rapportent le même événement daté — l'un sur le moment, l'autre bien après —
 * occupent des rangs différents dans les deux lignes, et une comparaison qui ne
 * regarderait que la date les croirait immobiles.
 */
test("deux faits du même jour, rapportés par deux documents, se distinguent", () => {
  const { vecue, reconstituee } = laLigneDuTemps([
    // L'archive : réunion de janvier, déposée en septembre.
    unCr({ document: "CR_02.pdf", quand: "2026-01-15", deposeLe: "2026-09-01", points: [
      { reference: "02.3", titre: "Dalle", faitLe: "2026-01-10" }] }),
    // Et une réunion de juin, déposée à temps, qui reparle du même jour.
    unCr({ document: "CR_09.pdf", quand: "2026-06-10", deposeLe: "2026-06-12", points: [
      { reference: "09.1", titre: "Reprise de la dalle", faitLe: "2026-01-10" }] })
  ]);

  // Le même jour pour les deux faits : seule la date du document les sépare.
  assert.deepEqual(vecue.map((un) => un.quand), ["2026-01-10", "2026-01-10"]);
  assert.deepEqual(vecue.map((un) => un.reference), ["09.1", "02.3"]);
  assert.deepEqual(reconstituee.map((un) => un.reference), ["02.3", "09.1"]);

  assert.equal(ceQuiSepareLesDeuxLignes(vecue, reconstituee).deplaces, 2,
    "l'écart ne compare que les dates : deux faits du même jour passent pour immobiles");
});

test("un fait venu d'un document rétrospectif ne ferme pas par absence", () => {
  const { reconstituee } = laLigneDuTemps([
    unRapport({ document: "RICT-03.pdf", quand: "2026-04-18", deposeLe: "2026-04-20",
      avis: [{ reference: "A-12", intitule: "Source", marque: "D" }] }),
    unRapport({ document: "RICT-01.pdf", quand: "2025-11-06", deposeLe: "2026-09-01",
      avis: [{ reference: "A-55", intitule: "Trappe", marque: "SO" }] })
  ]);

  const duPasse = reconstituee.find((un) => un.reference === "A-55");
  const duPresent = reconstituee.find((un) => un.reference === "A-12");

  assert.equal(duPasse.place, PLACE.RETROSPECTIVE);
  assert.ok(duPasse.revise.includes(REVISION.OUVRIR));
  assert.ok(duPasse.revise.includes(REVISION.FERMER_SUR_UNE_PHRASE));
  assert.ok(!duPasse.revise.includes(REVISION.FERMER_PAR_ABSENCE),
    "un document du passé ferme sur son silence : il ne sait rien de maintenant");

  assert.ok(duPresent.revise.includes(REVISION.FERMER_PAR_ABSENCE));
});

/**
 * **Les engagements sont des promesses, pas des observations.** Les compter à
 * part est ce qui empêche de lire « 14 faits en mai » quand il s'agit de
 * quatorze choses promises pour mai.
 */
test("le bilan compte les promesses à part des constats", () => {
  const { bilan } = laLigneDuTemps([unCr({ points: [
    { reference: "02.3", titre: "Dalle", faitLe: "2026-04-22", echeance: "2026-05-15" },
    { reference: "02.7", titre: "Réservations", echeance: "2026-05-09" }
  ] })]);

  assert.equal(bilan.faits, 4);
  assert.equal(bilan.aVenir, 2);
  assert.deepEqual(bilan.parNature, { constat: 2, engagement: 2 });
  assert.equal(bilan.documents, 1);
});

test("le bilan compte les documents rétrospectifs et ceux qu'on ne sait pas dater", () => {
  const bilan = leBilanDeLaLigne([], [
    { placement: { place: PLACE.EN_TETE } },
    { placement: { place: PLACE.RETROSPECTIVE } },
    { placement: { place: PLACE.SANS_DATE } },
    { placement: { place: PLACE.SANS_REPERE } }
  ], 3);

  assert.equal(bilan.documents, 4);
  assert.equal(bilan.retrospectifs, 1);
  assert.equal(bilan.sansRepere, 2, "« sans date » et « sans repère » comptent tous deux");
  assert.equal(bilan.sansDate, 3);
});

test("une ligne du temps sans aucune lecture ne rend pas un bilan vert", () => {
  const { vecue, reconstituee, bilan } = laLigneDuTemps([]);
  assert.deepEqual(vecue, []);
  assert.deepEqual(reconstituee, []);
  assert.equal(bilan.faits, 0);
  assert.equal(bilan.documents, 0);
});
