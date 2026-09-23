import assert from "node:assert/strict";
import test from "node:test";

import {
  PLACE, REVISION, cequElleRevise, fermeParAbsence, laPlaceDeLaSource, leJourDeLaSource,
  lesJoursDesSources, phraseDeCeQuelleNeFeraPas, phraseDeLaPlace
} from "./la-chronologie-des-sources.js";

// ── Lire une date, quelle que soit sa forme ────────────────────────────────

test("une date ISO se lit telle quelle", () => {
  assert.equal(leJourDeLaSource("2026-09-11"), "2026-09-11");
  assert.equal(leJourDeLaSource("2026-09-11T08:14:00.000Z"), "2026-09-11");
});

test("une date ISO ne se lit pas comme une date française", () => {
  // **Le piège qui coûte quinze ans.** La lecture française retient `26-09-11`
  // dans `2026-09-11` et rend `2011-09-26`, sans rien signaler : le compte rendu
  // le plus récent du projet passerait pour le plus ancien, et son silence
  // fermerait tout. La base range en ISO, le document est lu à la française :
  // les deux formes circulent, et c'est l'ancrage au début qui les sépare.
  assert.notEqual(leJourDeLaSource("2026-09-11"), "2011-09-26");
});

test("une date à la française se lit aussi", () => {
  assert.equal(leJourDeLaSource("11/09/2026"), "2026-09-11");
  assert.equal(leJourDeLaSource("11 septembre 2026"), "2026-09-11");
});

test("un jour qui n'existe pas ne se lit pas", () => {
  // Le 31 février existe en arithmétique, pas au calendrier : le rendre
  // décalerait au 3 mars une date que personne n'a écrite.
  assert.equal(leJourDeLaSource("2026-02-31"), "");
  assert.equal(leJourDeLaSource("31/02/2026"), "");
});

test("ce qui n'est pas une date ne devient pas une date", () => {
  for (const rien of ["", null, undefined, "CR n° 57", "à venir"]) {
    assert.equal(leJourDeLaSource(rien), "", JSON.stringify(rien));
  }
});

// ── Où une source se place ─────────────────────────────────────────────────

test("la première source d'un projet est en tête", () => {
  const place = laPlaceDeLaSource({ date: "2026-03-12", connues: [] });
  assert.equal(place.place, PLACE.EN_TETE);
  assert.equal(place.laPlusRecente, null);
  assert.equal(place.combien, 0);
});

test("une source plus récente que tout ce qu'on sait est en tête", () => {
  const place = laPlaceDeLaSource({ date: "2026-09-11", connues: ["2026-03-12", "2026-06-01"] });
  assert.equal(place.place, PLACE.EN_TETE);
  assert.equal(place.laPlusRecente, "2026-06-01");
});

test("le compte rendu 20 déposé après le 57 est rétrospectif", () => {
  // Le défaut rapporté, tel quel : les sujets nés entre les deux sont absents
  // du n° 20 parce qu'ils n'existaient pas encore, et la règle les fermait tous.
  const place = laPlaceDeLaSource({
    date: "12 mars 2026", connues: ["2026-06-01", "2026-09-03"]
  });
  assert.equal(place.place, PLACE.RETROSPECTIVE);
  assert.equal(place.laPlusRecente, "2026-09-03");
  assert.equal(place.combien, 2);
});

test("à égalité de date, la source est en tête et non derrière", () => {
  // Deux comptes rendus du même jour ne s'annulent pas : le second complète le
  // premier, il ne vient pas d'avant.
  assert.equal(laPlaceDeLaSource({ date: "2026-06-01", connues: ["2026-06-01"] }).place,
    PLACE.EN_TETE);
});

test("une source qu'on ne sait pas dater n'est pas en tête pour autant", () => {
  // Ne pas savoir où placer un document n'autorise pas à le traiter comme le
  // dernier (règle 5) — ce serait le cas le plus dangereux, puisqu'il
  // fermerait.
  const place = laPlaceDeLaSource({ date: "", connues: ["2026-06-01"] });
  assert.equal(place.place, PLACE.SANS_DATE);
  assert.equal(place.jour, "");
});

test("une source sans date reste sans date même quand rien n'est connu", () => {
  assert.equal(laPlaceDeLaSource({ date: "", connues: [] }).place, PLACE.SANS_DATE);
});

test("les dates illisibles des sources connues ne comptent pas", () => {
  // Une source déjà lue qu'on ne sait pas dater ne doit pas faire reculer
  // celle-ci : elle n'établit aucune borne.
  const place = laPlaceDeLaSource({ date: "2026-03-12", connues: ["", "CR n° 20", null] });
  assert.equal(place.place, PLACE.EN_TETE);
  assert.equal(place.combien, 0);
});

// ── Ce qu'une source a le droit de réviser ─────────────────────────────────

test("une source en tête peut tout, y compris fermer sur son silence", () => {
  const peut = cequElleRevise(PLACE.EN_TETE);
  assert.equal(peut.has(REVISION.OUVRIR), true);
  assert.equal(peut.has(REVISION.FERMER_SUR_UNE_PHRASE), true);
  assert.equal(peut.has(REVISION.FERMER_PAR_ABSENCE), true);
});

test("une source rétrospective garde son fait daté et perd sa déduction", () => {
  // **La ligne de partage de tout ce module.** « Fait » est vrai au jour du
  // document, et le lecteur le signe avec cette date sous les yeux. Le silence,
  // lui, n'énonce rien : sa fermeture est un raisonnement sur le présent, et un
  // document du passé ne connaît pas le présent.
  const peut = cequElleRevise(PLACE.RETROSPECTIVE);
  assert.equal(peut.has(REVISION.OUVRIR), true);
  assert.equal(peut.has(REVISION.FERMER_SUR_UNE_PHRASE), true);
  assert.equal(peut.has(REVISION.FERMER_PAR_ABSENCE), false);
});

test("une source qu'on ne sait pas dater ne déduit pas non plus", () => {
  assert.equal(fermeParAbsence(PLACE.SANS_DATE), false);
  assert.equal(fermeParAbsence(PLACE.RETROSPECTIVE), false);
  assert.equal(fermeParAbsence(PLACE.EN_TETE), true);
});

test("une place inconnue ne donne pas le droit de déduire", () => {
  // Le sens de l'erreur est choisi : un mot qu'on n'attendait pas ne doit pas
  // ouvrir la seule révision qui efface des sujets.
  assert.equal(fermeParAbsence(""), false);
  assert.equal(fermeParAbsence("autre chose"), false);
});

// ── Ce que l'écran en dit ──────────────────────────────────────────────────

test("une source en tête n'a rien à expliquer", () => {
  assert.equal(phraseDeLaPlace(laPlaceDeLaSource({ date: "2026-09-11", connues: [] })), "");
  assert.equal(phraseDeCeQuelleNeFeraPas({ place: PLACE.EN_TETE }), "");
});

test("la phrase nomme la date qui a fait reculer le document", () => {
  // « antérieure » sans dire à quoi laisse chercher, et un lecteur qui cherche
  // finit par ne plus lire.
  const dit = phraseDeLaPlace(laPlaceDeLaSource({
    date: "12 mars 2026", connues: ["2026-06-01", "2026-09-03"]
  }));
  assert.match(dit, /daté du 2026-03-12/);
  assert.match(dit, /jusqu'au 2026-09-03/);
  assert.match(dit, /2 documents déjà lus/);
});

test("un seul document déjà lu s'accorde au singulier", () => {
  const dit = phraseDeLaPlace(laPlaceDeLaSource({ date: "2026-03-12", connues: ["2026-09-03"] }));
  assert.match(dit, /un document déjà lu va jusqu'au/);
});

test("un document non daté le dit, plutôt que de se taire", () => {
  const dit = phraseDeLaPlace(laPlaceDeLaSource({ date: "", connues: ["2026-09-03"] }));
  assert.match(dit, /n'est pas daté/);
  assert.equal(/antérieur/.test(dit), false, dit);
});

test("la seconde phrase dit ce qui ne se fera pas, et ce qui reste", () => {
  const dit = phraseDeCeQuelleNeFeraPas({ place: PLACE.RETROSPECTIVE });
  assert.match(dit, /ne ferme donc aucun sujet/);
  // Ce qu'il affirme reste : sans cela, on croirait le document entier écarté.
  assert.match(dit, /reste lisible/);
});

// ── Les jours des sources déjà lues ────────────────────────────────────────

test("les lignes de la base se lisent par leur colonne", () => {
  assert.deepEqual(
    lesJoursDesSources([{ tenue_le: "2026-06-01" }, { tenueLe: "12 mars 2026" }]),
    ["2026-06-01", "2026-03-12"]
  );
});

test("une ligne qu'on ne sait pas dater ne pèse pas dans la comparaison", () => {
  // Une borne qu'on n'a pas ne doit pas faire reculer un document : une chaîne
  // vide se trierait avant tout, et rendrait toute source « en tête ».
  assert.deepEqual(lesJoursDesSources([{ tenue_le: "" }, { tenue_le: null }, {}]), []);
});

test("une liste de dates nues se lit aussi", () => {
  // Le même lecteur sert aux lignes de la base et à une liste de jours déjà
  // tirée : deux lectures finiraient par ne plus s'accorder.
  assert.deepEqual(lesJoursDesSources(["2026-06-01", "11/09/2026"]),
    ["2026-06-01", "2026-09-11"]);
});

test("rien ne donne rien, et jamais une liste devinée", () => {
  assert.deepEqual(lesJoursDesSources(null), []);
  assert.deepEqual(lesJoursDesSources([]), []);
});

test("une date ISO ne se ramasse pas au milieu d'un texte", () => {
  // **L'ancrage au début n'est pas une précaution de style.** La date d'un
  // compte rendu est souvent lue dans une phrase — « réunion du 11/09/2026,
  // réf. 2024-03-01 » — et sans l'ancrage, la référence l'emporterait sur la
  // date : le document reculerait de deux ans, et son silence cesserait de
  // fermer quoi que ce soit. Une rupture muette l'a montré : aucun cas ne
  // mettait de suite ISO ailleurs qu'en tête.
  assert.equal(leJourDeLaSource("réunion du 11/09/2026 — réf. 2024-03-01"), "2026-09-11");
});
