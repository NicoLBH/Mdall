/**
 * Ranger sous leur lot les sujets qui étaient déjà à plat.
 *
 * Les sujets sont donnés dans la forme que la base rend, avec la description
 * que `descriptionDuPoint` a écrite — recopiée, pas reconstruite : un jeu
 * d'essai qui inventerait sa propre forme testerait l'accord du lecteur avec
 * lui-même, et le jour où la description changerait, tout resterait vert.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { lotDuSujet, phraseDuRattrapage, rattrapageAProposer } from "./rattrapage-des-sujets.js";
import { descriptionDuPoint } from "./sujets-du-cr.js";

/** Un sujet tel qu'une fusion l'a ouvert, description comprise. */
const unSujet = (id, point, reste = {}) => ({
  id,
  title: point.titre,
  description: descriptionDuPoint(point, { document: "1824_CR_12.pdf" }),
  status: "open",
  parent_subject_id: null,
  ...reste
});

const UN_POINT = {
  titre: "Le ferraillage du voile V12 ne suit pas le plan",
  description: "Le ferraillage du voile V12 ne suit pas le plan BA-102.",
  lot: "02 — GROS ŒUVRE",
  reference: "12.02.1",
  provenance: { page: 3, excerpt: "12.02.1 Le ferraillage du voile V12" }
};

/* ── Lire le lot dans ce qui a été écrit ─────────────────────────────────── */

/**
 * **La description d'abord.** C'est Mdall qui l'a écrite, dans une forme qu'il
 * connaît : « Relevé dans 1824_CR_12.pdf · lot 02 — GROS ŒUVRE · point n° … ».
 */
test("le lot se relit dans la provenance qu'un sujet porte", () => {
  assert.equal(lotDuSujet(unSujet("s-1", UN_POINT)), "Lot 02 — GROS ŒUVRE");
});

/** À défaut, le titre — quelques sujets s'appellent « Lot n° 3 : … ». */
test("un titre qui nomme un lot suffit", () => {
  assert.equal(
    lotDuSujet({ id: "s-2", title: "Lot n° 3 : Charpente", description: "" }),
    "Lot n° 3 : Charpente"
  );
});

/**
 * **On ne cherche pas le nom d'une entreprise dans le corps d'un sujet.** Un
 * point qui *mentionne* une entreprise n'est pas un point qui lui *revient* :
 * « Contacter BERTRAND pour la dépose » est écrit sous le lot charpente.
 */
test("un sujet qui ne dit pas son lot n'en reçoit pas un", () => {
  assert.equal(
    lotDuSujet({ id: "s-3", title: "Contacter BERTRAND pour la dépose", description: "Rien de plus." }),
    ""
  );
  assert.equal(lotDuSujet(null), "");
  assert.equal(lotDuSujet({}), "");
});

/* ── Ce qui se range, et ce qui ne se range pas ──────────────────────────── */

const LES_SUJETS = [
  unSujet("s-1", UN_POINT),
  unSujet("s-2", { ...UN_POINT, titre: "Reprise embrasure RDC" }),
  unSujet("s-3", { ...UN_POINT, titre: "Pose de la charpente", lot: "05 — CHARPENTE" }),
  { id: "s-4", title: "Un sujet ouvert à la main", description: "Sans provenance.", parent_subject_id: null },
  // Déjà rangé : le reproposer demanderait de confirmer un déplacement fait.
  { ...unSujet("s-5", UN_POINT), parent_subject_id: "pere-1" }
];

test("les sujets se groupent par lot, chacun sous le sien", () => {
  const { rubriques, rangements, orphelins } = rattrapageAProposer(LES_SUJETS);

  assert.deepEqual(rubriques, [
    { ordre: 1, intitule: "Lot 02 — GROS ŒUVRE" },
    { ordre: 2, intitule: "Lot 05 — CHARPENTE" }
  ]);
  assert.deepEqual(rangements.map(({ subjectId, rubrique }) => [subjectId, rubrique]),
    [["s-1", 1], ["s-2", 1], ["s-3", 2]]);

  // **Ce qui ne se rattrape pas se dit.** Savoir qu'un sujet ne se range pas est
  // une information ; croire qu'il n'y en a aucun n'en est pas une (règle 5).
  assert.deepEqual(orphelins.map((sujet) => sujet.id), ["s-4"]);
});

/**
 * **Un sujet qui a déjà un père n'est pas à rattraper.** Le reproposer
 * demanderait de confirmer un rangement déjà fait, et ferait douter de tous les
 * autres.
 */
test("un sujet déjà rangé ne se repropose pas", () => {
  const { rangements } = rattrapageAProposer(LES_SUJETS);
  assert.equal(rangements.some((rangement) => rangement.subjectId === "s-5"), false);
});

/**
 * **Une rubrique par lot reconnu, même si le père existe déjà.** C'est la fusion
 * qui le retrouve par son identité, et elle seule sait ce que le projet porte au
 * moment où elle s'exécute — le décider ici sur une liste lue dix minutes plus
 * tôt ferait deux vérités du même fait (règle 4).
 */
test("deux écritures d'un même lot ne font qu'une rubrique", () => {
  const { rubriques, rangements } = rattrapageAProposer([
    unSujet("s-1", { ...UN_POINT, lot: "02 — GROS ŒUVRE" }),
    unSujet("s-2", { ...UN_POINT, lot: "Lot n° 2 - Gros oeuvre" })
  ]);

  assert.equal(rubriques.length, 1);
  assert.deepEqual(rangements.map((rangement) => rangement.rubrique), [1, 1]);
});

test("la phrase dit ce qui se range, et ce qui ne se range pas", () => {
  const rattrapage = rattrapageAProposer(LES_SUJETS);

  assert.match(phraseDuRattrapage(rattrapage), /3 sujets à ranger sous 2 lots/);
  assert.match(phraseDuRattrapage(rattrapage), /1 dont le lot ne se lit pas/);

  // Rien à ranger se dit aussi : une phrase vide se lirait comme une panne.
  assert.match(phraseDuRattrapage(rattrapageAProposer([])), /Aucun sujet à ranger/);
  assert.match(phraseDuRattrapage(), /Aucun sujet à ranger/);
});

/** Un sujet sans identifiant n'est pas un sujet : il ne se range ni ne se compte. */
test("une ligne sans identifiant ne compte pas", () => {
  const { rangements, orphelins } = rattrapageAProposer([{ title: "Sans id" }, null]);
  assert.deepEqual(rangements, []);
  assert.deepEqual(orphelins, []);
});
