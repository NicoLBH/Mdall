/**
 * Les échéances, **converties ou refusées**.
 *
 * Une date fausse est pire qu'une date absente : un objectif daté du 30 mars
 * quand le document dit fin avril fait courir une alerte un mois trop tôt ;
 * daté de l'an prochain, il ne sonne jamais. Dans les deux cas personne ne
 * remontera jusqu'au compte rendu pour vérifier — on fera confiance au chiffre.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  PHRASES_DU_SUR, SUR, dateDeLEcheance, dateEnFrancais, jourEcrit, nomDeLObjectif,
  objectifsAProposer, objectifsDuCompteRendu, phraseDesObjectifs
} from "./echeances-du-cr.js";

const LE_JOUR = "2025-12-10";

/* ── Les dates qu'on sait lire ───────────────────────────────────────────── */

test("une date écrite en toutes lettres se lit, sous toutes ses formes", () => {
  for (const dit of ["30/04/2026", "Pour le 30/04/2026", "30-04-2026", "30.04.2026", "30 avril 2026"]) {
    assert.deepEqual(dateDeLEcheance(dit, { leJour: LE_JOUR }), { date: "2026-04-30", sur: SUR.ECRITE },
      `« ${dit} » n'a pas été lu`);
  }

  // Une année à deux chiffres est ce siècle-ci.
  assert.equal(dateDeLEcheance("30/04/26", { leJour: LE_JOUR })?.date, "2026-04-30");
});

/**
 * **Une échéance est postérieure à la réunion qui la fixe.** C'est ce
 * qu'échéance veut dire : « 15 janvier » dans un compte rendu de décembre est le
 * 15 janvier suivant.
 */
test("une date sans année prend celle du compte rendu, ou la suivante", () => {
  const enAvril = dateDeLEcheance("30/04", { leJour: LE_JOUR });
  assert.deepEqual(enAvril, { date: "2026-04-30", sur: SUR.COMPLETEE });

  // Après la réunion, dans la même année : on reste dans l'année.
  assert.equal(dateDeLEcheance("20/12", { leJour: LE_JOUR })?.date, "2025-12-20");
  // Le jour même en est une aussi.
  assert.equal(dateDeLEcheance("10/12", { leJour: LE_JOUR })?.date, "2025-12-10");
  // Avant la réunion : l'année suivante.
  assert.equal(dateDeLEcheance("15 janvier", { leJour: LE_JOUR })?.date, "2026-01-15");
});

test("un délai se compte depuis la réunion", () => {
  assert.deepEqual(dateDeLEcheance("sous 15 jours", { leJour: LE_JOUR }), { date: "2025-12-25", sur: SUR.COMPTEE });
  assert.equal(dateDeLEcheance("sous 48 h", { leJour: LE_JOUR })?.date, "2025-12-12");
  assert.equal(dateDeLEcheance("dans 3 semaines", { leJour: LE_JOUR })?.date, "2025-12-31");
  assert.equal(dateDeLEcheance("dans 2 mois", { leJour: LE_JOUR })?.date, "2026-02-08");
});

/* ── Ce qu'on refuse, et c'est le cœur ───────────────────────────────────── */

/**
 * « Avant la prochaine réunion » n'est pas une date : on ne sait pas quand elle
 * est. « S15 » non plus : la numérotation des semaines varie d'un bureau à
 * l'autre, et se tromper d'une semaine est le genre d'erreur qu'on ne remarque
 * pas.
 */
test("une échéance qui n'est pas une date ne devient pas une date", () => {
  for (const dit of ["avant la prochaine réunion", "S15", "semaine 15", "dès que possible", "urgent", ""]) {
    assert.equal(dateDeLEcheance(dit, { leJour: LE_JOUR }), null, `« ${dit} » a été converti`);
  }
});

/** Le 31 février existe en arithmétique, pas au calendrier. */
test("un jour qui n'existe pas ne se décale pas au mois suivant", () => {
  assert.equal(dateDeLEcheance("31/02/2026", { leJour: LE_JOUR }), null);
  assert.equal(dateDeLEcheance("31/04/2026", { leJour: LE_JOUR }), null);
  // Et une année bissextile reste une année bissextile.
  assert.equal(dateDeLEcheance("29/02/2028", { leJour: LE_JOUR })?.date, "2028-02-29");
});

/**
 * **Sans la date de la réunion, on ne compte pas depuis aujourd'hui.** La
 * lecture d'un compte rendu de mars faite en septembre daterait tout de six mois
 * trop tard.
 */
test("sans la date de la réunion, ni délai ni année ne se calculent", () => {
  assert.equal(dateDeLEcheance("sous 15 jours", { leJour: "" }), null);
  assert.equal(dateDeLEcheance("30/04", { leJour: "" }), null);
  // Une date complète, elle, se lit toujours : elle ne dépend de rien.
  assert.equal(dateDeLEcheance("30/04/2026", { leJour: "" })?.date, "2026-04-30");
});

test("la date du compte rendu se lit avec la même lecture que les échéances", () => {
  assert.equal(jourEcrit("25/06/2025"), "2025-06-25");
  assert.equal(jourEcrit("25 juin 2025"), "2025-06-25");
  assert.equal(jourEcrit("non lue"), "");
});

/* ── Des objectifs, un par date ──────────────────────────────────────────── */

const POINTS = [
  { titre: "Étanchéité", echeance: "30/04/2026" },
  { titre: "Linteaux", echeance: "Pour le 30/04/2026" },
  { titre: "Cloisons", echeance: "sous 15 jours" },
  { titre: "Peinture", echeance: "avant la prochaine réunion" },
  { titre: "Sans échéance", echeance: "" }
];

/**
 * **Un objectif par date, et non par point.** Quarante points font rarement
 * quarante dates : un chantier travaille par jalons.
 */
test("deux points à la même date ne font qu'un objectif", () => {
  const { objectifs, sansDate } = objectifsDuCompteRendu(POINTS, { tenueLe: "10/12/2025" });

  assert.deepEqual(objectifs.map((objectif) => objectif.date), ["2025-12-25", "2026-04-30"]);
  assert.equal(objectifs[1].points.length, 2);
  assert.equal(objectifs[1].nom, "Échéance du 30/04/2026");

  assert.deepEqual(sansDate.map((sans) => sans.echeance), ["avant la prochaine réunion"]);
});

/**
 * **La moins sûre des provenances l'emporte.** Un objectif dont une seule
 * échéance a été comptée n'est plus « écrit » : montrer la plus flatteuse ferait
 * passer un calcul pour une lecture.
 */
test("un objectif dit comment sa date a été obtenue, au plus prudent", () => {
  const { objectifs } = objectifsDuCompteRendu([
    { titre: "a", echeance: "30/04/2026" },
    { titre: "b", echeance: "30/04" }
  ], { tenueLe: "10/12/2025" });

  assert.equal(objectifs.length, 1);
  assert.equal(objectifs[0].sur, SUR.COMPLETEE);

  for (const sur of Object.values(SUR)) assert.ok(PHRASES_DU_SUR[sur], `« ${sur} » n'a pas de phrase`);
});

/* ── Ce que le projet a déjà ─────────────────────────────────────────────── */

test("un objectif déjà daté du même jour n'est pas proposé deux fois", () => {
  const proposition = objectifsAProposer(POINTS, {
    tenueLe: "10/12/2025",
    // **La date décide, pas le nom** : un jalon nommé autrement reste ce jalon.
    objectifsDuProjet: [{ id: "o-1", title: "Livraison lot 02", due_date: "2026-04-30" }]
  });

  const parDate = Object.fromEntries(proposition.objectifs.map((o) => [o.date, o.existe]));
  assert.equal(parDate["2026-04-30"], true);
  assert.equal(parDate["2025-12-25"], false);
  assert.match(phraseDesObjectifs(proposition), /1 objectif serait créé/);
});

/**
 * Ne pas avoir pu lire les objectifs du projet n'est pas « il n'y en a aucun » :
 * annoncer une création qui n'aura peut-être pas lieu serait promettre à tort.
 */
test("sans les objectifs du projet, aucune création n'est annoncée", () => {
  const proposition = objectifsAProposer(POINTS, { tenueLe: "10/12/2025", objectifsDuProjet: null });

  assert.equal(proposition.connu, false);
  assert.ok(proposition.objectifs.every((objectif) => objectif.existe === false));
  assert.match(phraseDesObjectifs(proposition), /n'ont pas pu être lus/);
});

test("chaque situation a sa phrase, et elles diffèrent", () => {
  const dites = [
    phraseDesObjectifs(objectifsAProposer([], { tenueLe: "10/12/2025", objectifsDuProjet: [] })),
    phraseDesObjectifs(objectifsAProposer(
      [{ titre: "a", echeance: "S15" }], { tenueLe: "10/12/2025", objectifsDuProjet: [] })),
    phraseDesObjectifs(objectifsAProposer(POINTS, { tenueLe: "10/12/2025", objectifsDuProjet: null })),
    phraseDesObjectifs(objectifsAProposer(POINTS, { tenueLe: "10/12/2025", objectifsDuProjet: [] }))
  ];

  assert.equal(new Set(dites).size, 4);
  assert.match(dites[0], /Aucun point .* ne porte d'échéance/);
  assert.match(dites[1], /sans date exploitable/);
});

test("une date se rend en français, et nomme son objectif", () => {
  assert.equal(dateEnFrancais("2026-04-30"), "30/04/2026");
  assert.equal(dateEnFrancais(""), "");
  assert.equal(nomDeLObjectif("2026-04-30"), "Échéance du 30/04/2026");
  assert.equal(nomDeLObjectif(""), "");
});

/** Créer un objectif est une écriture : elle passe par une proposition (règle 1). */
test("lire une échéance ne crée aucun objectif", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const source = readFileSync(fileURLToPath(new URL("./echeances-du-cr.js", import.meta.url)), "utf8");
  assert.doesNotMatch(source, /fetch\(|import\(|createObjective/);
});
