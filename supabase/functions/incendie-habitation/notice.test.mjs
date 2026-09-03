/**
 * La notice : ce qu'elle rédige, et ce qu'elle refuse d'affirmer.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { TRAME, redigerLaNotice, noticeEnTexte, rubriquesDe, CHAMPS_ENTETE } from "./notice.js";
import { consulter, ecrireLaNotice } from "./corpus.js";

const COLLECTIF = { logementsSuperposes: true, duplexOuTriplexAuDernierEtage: false };
const DEUXIEME = { ...COLLECTIF, etagesSurRdc: 3, hauteurPlancherBasNiveauLePlusHaut: 7.5, niveauxEnSousSol: 1 };

test("le résultat du questionnaire devient une phrase de notice", () => {
  // C'est tout le travail : « CF 1/2 h » d'un côté, « Les planchers seront
  // CF 1/2 h » de l'autre. Ce passage se faisait à la main, projet par projet.
  const notice = redigerLaNotice(consulter(DEUXIEME));
  const phrases = notice.sections.flatMap((s) =>
    [...s.paragraphes, ...s.sousSections.flatMap((ss) => ss.paragraphes)]).map((p) => p.texte);
  assert.ok(phrases.some((p) => /Les planchers seront CF 1\/2 h/.test(p)), phrases.join(" | ").slice(0, 300));
  assert.ok(phrases.some((p) => /Le bâtiment est classé en 2e famille/.test(p)));
});

test("une phrase qui ne sait rien ne s'écrit pas", () => {
  // Une notice qui affirme sans savoir est pire qu'une notice incomplète : on
  // la dépose en mairie, et personne ne relit ce qui a l'air d'être écrit.
  const vide = redigerLaNotice(consulter({}));
  const phrases = vide.sections.flatMap((s) => s.paragraphes).map((p) => p.texte);
  assert.equal(phrases.some((p) => /planchers seront/.test(p)), false);
  // Le paragraphe d'ouverture, lui, ne dépend d'aucune réponse : il s'écrit.
  assert.ok(phrases.some((p) => /analyse réglementaire incendie/.test(p)));
});

test("les sections vides ne sont pas numérotées", () => {
  // La trame est complète ; ce qui n'a rien à dire ne prend pas de numéro, et
  // la numérotation reste continue de 1 à n.
  const notice = redigerLaNotice(consulter(DEUXIEME));
  assert.deepEqual(notice.sections.map((s) => s.numero), notice.sections.map((_, i) => i + 1));
  assert.equal(notice.sections.some((s) => s.cle === "parc"), false, "pas de parc déclaré");
});

test("le parc apparaît dès qu'il y en a un", () => {
  const avecParc = redigerLaNotice(consulter({ ...DEUXIEME, parcDeStationnement: true, surfaceParc: 2000,
    niveauxParcAuDessous: 1, niveauxParcAuDessus: 0 }));
  const parc = avecParc.sections.find((s) => s.cle === "parc");
  assert.ok(parc, "la section parc doit exister");
  assert.ok(parc.sousSections.length >= 2);
});

test("ce que l'utilisateur ajoute entre dans la phrase, à sa place", () => {
  // L'arrêté exige un degré ; il ne dit pas « en béton armé ».
  const sans = redigerLaNotice(consulter(DEUXIEME));
  const avec = redigerLaNotice(consulter(DEUXIEME), { "structure.planchers": { materiau: "béton armé" } });
  const phrase = (n) => n.sections.flatMap((s) => s.sousSections.flatMap((ss) => ss.paragraphes))
    .find((p) => p.cle === "structure.planchers")?.texte;
  assert.match(phrase(sans), /Les planchers seront CF 1\/2 h\.$/);
  assert.match(phrase(avec), /réalisés en béton armé\.$/);
});

test("chaque champ nomme la rubrique sous laquelle il se compte", () => {
  // C'est cette clé, et elle seule, qui voyage hors du projet.
  const rubriques = rubriquesDe();
  assert.ok(rubriques.length > 8);
  for (const rubrique of rubriques) assert.match(rubrique, /^[a-zA-Z]+\.[a-zA-Z]+$/, rubrique);
  // Et aucune amorce n'est vide : partir d'une liste vide le premier jour
  // n'apprend rien à personne.
  const champs = TRAME.flatMap((s) => [...(s.paragraphes ?? []),
    ...(s.sousSections ?? []).flatMap((ss) => ss.paragraphes)]).map((p) => p.champ).filter(Boolean);
  for (const champ of champs) {
    assert.ok(champ.options.length >= 2, champ.rubrique);
    assert.ok(champ.libelle, champ.rubrique);
  }
});

test("le texte à coller se relit tel quel, sans markdown", () => {
  const notice = redigerLaNotice(consulter(DEUXIEME));
  const texte = noticeEnTexte(notice, { denomination: "Chalet Le Pelloux", adresse: "74920 Combloux" });
  assert.match(texte, /^NOTICE DESCRIPTIVE DE SÉCURITÉ/);
  assert.match(texte, /Dénomination du projet :\nChalet Le Pelloux/);
  assert.match(texte, /\n1\. DESCRIPTIF SYNTHÉTIQUE/i);
  // Ce qui part dans Word ne porte ni astérisque ni dièse.
  assert.doesNotMatch(texte, /\*\*|^#/m);
});

test("l'en-tête administratif est celui du modèle, dans son ordre", () => {
  assert.deepEqual(CHAMPS_ENTETE.map(([cle]) => cle),
    ["denomination", "adresse", "maitriseOuvrage", "maitriseOeuvre", "controle", "contact"]);
});

test("la porte du serveur rend la notice, son texte et son en-tête", () => {
  const rendu = ecrireLaNotice(DEUXIEME, { "structure.planchers": { materiau: "bois" } },
    { denomination: "Résidence des Aravis" });
  assert.equal(rendu.ok, true);
  assert.ok(rendu.sections.length >= 4);
  assert.equal(rendu.entete.find((c) => c.cle === "denomination").valeur, "Résidence des Aravis");
  assert.match(rendu.texte, /Résidence des Aravis/);
  assert.match(rendu.texte, /réalisés en bois/);
  // La notice ne fait pas sortir la table des règles, comme le reste.
  const serialise = JSON.stringify(rendu);
  assert.equal(serialise.includes('"regles"'), false);
  assert.equal(serialise.includes('"si"'), false);
});
