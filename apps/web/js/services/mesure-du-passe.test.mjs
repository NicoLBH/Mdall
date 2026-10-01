/**
 * Prédire dans le passé — l'instrument, avant tout moteur.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  FENETRE_EN_JOURS, LE_FROID,
  ceQuOnSavaitLe, ceQuiEstArriveApres, rejouerLePasse,
  precisionA, tauxDeFausseAlerte, delaiDAvance, mesureDuPredicteur, enPourCent
} from "./mesure-du-passe.js";
import { episodeDuProjet } from "./episode-du-projet.js";

const jour = (rang) => new Date(Date.UTC(2026, 0, rang, 9)).toISOString();

const sujet = (id, titre, le, ferme = null) => ({
  id, title: titre, created_at: le, closed_at: ferme
});

const constat = (id, quoi, le, domaine, statut = "REPORTED") => ({
  id, project_id: "p1", subject_key: id, kind: "avis", nature: "constat", domain: domaine,
  status: "assumed", superseded_by: null, decided_at: le,
  payload: { subject: quoi, value: "à traiter", status: statut }
});

/* ── La coupe est stricte, et c'est la garde de tout l'édifice ───────────── */

test("ce qui porte la date de la coupe n'était pas encore su", () => {
  /**
   * **C'est l'épreuve la plus importante du fichier.** Une seule ligne du futur
   * qui fuit dans le passé gonfle tous les chiffres, et rien ne le signale : un
   * moteur qui a vu la réponse a l'air excellent.
   */
  const episode = episodeDuProjet({
    sujets: [sujet("s1", "A", jour(1)), sujet("s2", "B", jour(10))],
    assertions: [
      constat("c1", "Fissure", jour(5), "structure"),
      constat("c2", "Porte", jour(10), "incendie")
    ]
  });

  const su = ceQuOnSavaitLe(episode, jour(10));

  assert.deepEqual(su.ouvertures.map((une) => une.titre), ["A"], "un sujet du jour même est entré");
  assert.deepEqual(su.constats.map((un) => un.quoi), ["Fissure"], "un constat du jour même est entré");
});

test("une fermeture postérieure n'était pas connue non plus", () => {
  // Garder `fermeLe` ferait savoir en mars qu'un sujet se fermerait en juin —
  // et un prédicteur mesuré là-dessus se noterait sur sa propre réponse.
  const episode = episodeDuProjet({
    sujets: [sujet("s1", "A", jour(1), jour(20)), sujet("s2", "B", jour(2), jour(3))]
  });

  const su = ceQuOnSavaitLe(episode, jour(10));
  assert.equal(su.ouvertures.find((une) => une.titre === "A").fermeLe, null);
  assert.equal(su.ouvertures.find((une) => une.titre === "B").fermeLe, jour(3));
  assert.equal(su.combien.enCours, 1);
});

test("un constat levé après la coupe se relit comme ouvert", () => {
  const episode = episodeDuProjet({
    assertions: [
      constat("c1", "Fissure", jour(1), "structure"),
      constat("c1", "Fissure", jour(20), "structure", "RESOLVED")
    ]
  });

  assert.equal(episodeDuProjet({ assertions: [] }).combien.leves, 0);
  assert.equal(ceQuOnSavaitLe(episode, jour(10)).combien.leves, 0);
  assert.equal(ceQuOnSavaitLe(episode, jour(25)).combien.leves, 1);
});

test("la coupe garde la forme du chantier et déplace la borne du temps", () => {
  // Ce qu'on savait à T s'arrête à T : garder la borne de fin ferait dire
  // qu'on connaissait déjà l'étendue de l'épisode.
  const episode = episodeDuProjet({
    contexte: { axes: [{ axe: "phase", valeur: "EXE" }], manques: [] },
    assertions: [constat("c1", "Fissure", jour(1), "structure"), constat("c2", "Porte", jour(20), "incendie")]
  });

  const su = ceQuOnSavaitLe(episode, jour(10));
  assert.equal(su.contexte, episode.contexte);
  assert.equal(su.jusqua, jour(10));
  assert.equal(su.depuis, episode.depuis);
});

/* ── La fenêtre ──────────────────────────────────────────────────────────── */

test("ce qui arrive hors de la fenêtre n'a pas été annoncé", () => {
  // Un moteur qui annonce en mars un problème de novembre n'a rien annoncé :
  // il a énuméré.
  const episode = episodeDuProjet({
    assertions: [
      constat("c1", "Fissure", jour(1), "structure"),
      constat("c2", "Porte", jour(5), "incendie"),
      constat("c3", "Bruit", jour(25), "acoustique")
    ]
  });

  const dedans = ceQuiEstArriveApres(episode, jour(1), { jours: 10 });
  assert.deepEqual(dedans.constats.map((un) => un.quoi), ["Fissure", "Porte"]);

  const large = ceQuiEstArriveApres(episode, jour(1), { jours: 30 });
  assert.equal(large.constats.length, 3);
});

test("la fenêtre par défaut est d'un mois, et se dit", () => {
  assert.equal(FENETRE_EN_JOURS, 30);
});

/* ── Le rejeu ────────────────────────────────────────────────────────────── */

/** Un épisode de neuf constats, assez long pour sortir du froid. */
const NEUF = episodeDuProjet({
  assertions: [
    constat("c1", "Un", jour(1), "structure"),
    constat("c2", "Deux", jour(3), "structure"),
    constat("c3", "Trois", jour(5), "incendie"),
    constat("c4", "Quatre", jour(7), "structure"),
    constat("c5", "Cinq", jour(9), "structure"),
    constat("c6", "Six", jour(11), "acoustique"),
    constat("c7", "Sept", jour(13), "structure"),
    constat("c8", "Huit", jour(15), "structure"),
    constat("c9", "Neuf", jour(17), "incendie")
  ]
});

const venus = (suite) => (suite?.constats ?? [])
  .map((un) => ({ quoi: un.domaine, quand: un.quand }));

test("le premier moment ne se rejoue pas : on ne savait rien", () => {
  // Mesurer une prédiction faite sans rien mesure la chance.
  const { rendus } = rejouerLePasse(NEUF, { predire: () => ["structure"], arrive: venus });

  assert.equal(rendus.length, 8, "le premier moment a été rejoué, ou un moment manque");
  assert.equal(rendus[0].quand, jour(3));
});

test("deux moments du même jour ne font qu'un point", () => {
  // Ce sont les mêmes conditions : les compter deux fois donnerait du poids à
  // une journée chargée.
  const meme = episodeDuProjet({
    assertions: [
      constat("c1", "Un", jour(1), "structure"),
      constat("c2", "Deux", jour(3), "structure"),
      constat("c3", "Trois", jour(3), "incendie")
    ]
  });

  const { rendus } = rejouerLePasse(meme, { predire: () => ["structure"], arrive: venus });
  assert.equal(rendus.length, 1);
});

test("ce que le prédicteur voit est ce qu'on savait, jamais la suite", () => {
  // La garde de la coupe, vue depuis le rejeu : si elle lâchait, le prédicteur
  // aurait la réponse sous les yeux.
  const vus = [];
  rejouerLePasse(NEUF, {
    predire: (su) => { vus.push(su.constats.map((un) => un.quoi)); return []; },
    arrive: venus
  });

  assert.deepEqual(vus[0], ["Un"]);
  assert.deepEqual(vus[vus.length - 1], ["Un", "Deux", "Trois", "Quatre", "Cinq", "Six", "Sept", "Huit"]);
});

test("un moment où rien n'arrive ne se note pas — ni juste, ni faux", () => {
  // Le compter comme un échec punirait un moteur pour un mois calme.
  // Un sujet ouvert loin de tout constat : la suite rejoue ce moment, et rien
  // n'arrive dans la fenêtre.
  const espace = episodeDuProjet({
    sujets: [sujet("s1", "A", jour(1)), sujet("s2", "B", jour(50))],
    assertions: [
      constat("c1", "Un", jour(1), "structure"),
      constat("c2", "Deux", jour(2), "structure")
    ]
  });

  const { rendus, sur } = rejouerLePasse(espace, {
    predire: () => ["structure"], arrive: venus, jours: 5
  });

  assert.deepEqual(rendus.map((un) => [un.quand, un.notable]), [
    [jour(2), true],
    [jour(50), false]
  ]);
  assert.equal(sur, 1);
});

test("sans prédicteur, il n'y a rien à mesurer", () => {
  assert.deepEqual(rejouerLePasse(NEUF, {}), { rendus: [], sur: 0 });
  assert.deepEqual(rejouerLePasse(NEUF, { predire: () => [] }), { rendus: [], sur: 0 });
});

/* ── Les chiffres ────────────────────────────────────────────────────────── */

test("trop peu de points ne rend pas un taux, mais rien", () => {
  /**
   * Un taux calculé sur deux points est une opinion déguisée en mesure. « 100 %
   * sur 2 points » n'est pas « 100 % sur 40 », et les afficher de la même façon
   * détruirait la confiance qu'on met trois ans à bâtir (règle 5).
   */
  const court = episodeDuProjet({
    assertions: [
      constat("c1", "Un", jour(1), "structure"),
      constat("c2", "Deux", jour(2), "structure"),
      constat("c3", "Trois", jour(3), "structure")
    ]
  });

  const mesure = mesureDuPredicteur(court, { predire: () => ["structure"], arrive: venus });

  assert.equal(mesure.froid, true);
  assert.equal(mesure.precision1, null, "un taux s'est affiché sur trop peu de points");
  assert.equal(mesure.precision3, null);
  assert.equal(mesure.fausseAlerte, null);
  assert.equal(mesure.avance, null);
  // Zéro voudrait dire « il s'est trompé partout » : on n'en sait rien.
  assert.notEqual(mesure.precision1, 0);
});

test("le seuil du froid se dit, et il vaut cinq", () => {
  assert.equal(LE_FROID, 5);
});

test("un prédicteur toujours juste fait cent pour cent, et aucune fausse alerte", () => {
  const mesure = mesureDuPredicteur(NEUF, {
    // Il triche : il rend le domaine du prochain constat. C'est le plafond de
    // l'instrument, et il doit le rendre exactement.
    predire: (su) => {
      const rang = su.constats.length;
      return [NEUF.constats[rang]?.domaine].filter(Boolean);
    },
    arrive: venus,
    jours: 3
  });

  assert.equal(mesure.froid, false);
  assert.equal(mesure.precision1, 1);
  assert.equal(mesure.fausseAlerte, 0);
});

test("un prédicteur toujours faux fait zéro, et cent pour cent de fausses alertes", () => {
  // Zéro est ici une mesure, pas une absence : le prédicteur a parlé, et il
  // s'est trompé à chaque fois.
  const mesure = mesureDuPredicteur(NEUF, {
    predire: () => ["urbanisme"], arrive: venus, jours: 3
  });

  assert.equal(mesure.precision1, 0);
  assert.equal(mesure.fausseAlerte, 1);
});

test("la précision à trois ne descend jamais en dessous de celle à un", () => {
  const rendus = rejouerLePasse(NEUF, {
    predire: () => ["urbanisme", "sol", "structure"], arrive: venus, jours: 3
  }).rendus;

  const un = precisionA(rendus, 1);
  const trois = precisionA(rendus, 3);
  assert.equal(un, 0, "le premier choix n'est jamais venu");
  assert.ok(trois > 0, "le bon choix, en troisième position, n'a pas compté");
  assert.ok(trois >= un);
});

test("la fausse alerte compte ce qu'on a annoncé, pas ce qu'on a manqué", () => {
  // Trois recommandations fausses, et plus personne ne les lit. C'est le vrai
  // coût, et c'est celui que tout le monde cache.
  const rendus = rejouerLePasse(NEUF, {
    predire: () => ["structure", "urbanisme", "sol"], arrive: venus, jours: 3
  }).rendus;

  const notes = rendus.filter((un) => un.notable);
  const taux = tauxDeFausseAlerte(rendus, 3);

  // Trois annonces par point ; au mieux une seule vient.
  assert.ok(taux >= 2 / 3, `taux trop bas : ${taux}`);
  assert.ok(notes.length >= LE_FROID);
});

test("ce qui arrive le jour même n'a pas été anticipé", () => {
  /**
   * Les moments du rejeu **sont** ceux de la suite : à chaque pas, quelque
   * chose vient de se produire. Le compter donnerait « 0 j d'avance » à chaque
   * coup — un chiffre juste et parfaitement inutile, qu'on lirait comme un
   * échec alors que c'est la mécanique du rejeu.
   */
  const serres = rejouerLePasse(NEUF, {
    // Une fenêtre d'un jour ne contient que le constat du moment : rien n'a
    // été anticipé, et l'on ne se prononce pas.
    predire: () => ["structure"], arrive: venus, jours: 1
  }).rendus;

  assert.equal(delaiDAvance(serres, 1), null, "une avance de zéro jour s'est affichée");

  // Avec une fenêtre plus large, l'avance est celle du prochain constat qui
  // vient **après** — les constats de `NEUF` sont espacés de deux jours.
  const larges = rejouerLePasse(NEUF, {
    predire: () => ["structure"], arrive: venus, jours: 10
  }).rendus;

  const avance = delaiDAvance(larges, 1);
  assert.ok(Number.isFinite(avance), "aucun délai d'avance n'a été calculé");

  /**
   * **C'est le premier venu qui date l'avance**, pas le dernier de la fenêtre.
   * Prendre le dernier ferait croire qu'on a prévu dix jours à l'avance ce
   * qu'on a en réalité vu arriver deux jours après. Les constats de `NEUF`
   * sont espacés de deux jours : la moyenne reste basse.
   */
  assert.ok(avance >= 2 && avance <= 3, `l'avance ne part pas du premier venu : ${avance}`);
});

test("un taux se lit en pour cent, et l'absence ne se lit pas zéro", () => {
  assert.equal(enPourCent(0.44), "44 %");
  assert.equal(enPourCent(1), "100 %");
  assert.equal(enPourCent(0), "0 %");
  assert.equal(enPourCent(null), "");
  assert.equal(enPourCent(undefined), "");
});

/* ════════════════════════════════════════════════════════════════════════════
 * Le câblage : seul le code qui le porte en témoigne
 * ════════════════════════════════════════════════════════════════════════════ */

const source = async (chemin) => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  return readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), "utf8");
};

test("l'écran mesure les deux lignes de base, et les montre", async () => {
  const ecran = await source("../views/project-insights.js");

  assert.match(ecran, /LIGNES_DE_BASE\.map/, "les lignes de base ne sont pas mesurées");
  assert.match(ecran, /mesureDuPredicteur\(episode, \{ predire: ligne\.predire, arrive: lesDomainesVenus \}\)/,
    "la mesure ne porte pas sur l'épisode de ce chantier");
  assert.match(ecran, /renderLaForme\(vecteur, episode, mesures, surLesSujets\)/,
    "les mesures ne sont jamais dessinées");

  // **Le même instrument, sur l'autre liste.** C'est tout le portage : si la
  // mesure sur les sujets n'était pas prise par `mesureDuPredicteur`, elle
  // n'aurait ni la coupe stricte, ni le froid, ni la fenêtre — et son chiffre
  // ne se comparerait à rien.
  assert.match(ecran, /LIGNES_DE_BASE_DES_SUJETS\.map/,
    "les prédicteurs sur les sujets ne sont pas mesurés");
  assert.match(ecran,
    /mesureDuPredicteur\(episode, \{ predire: ligne\.predire, arrive: lesSujetsVenus \}\)/,
    "la mesure sur les sujets passe par un autre chemin que celle sur les domaines");
});

test("le froid se dit en clair, et jamais en pourcentage", async () => {
  /**
   * « 100 % sur 2 points » est un mensonge par omission. Sous le seuil, l'écran
   * dit combien il manque de points, et rien d'autre.
   */
  const bloc = await source("../views/ui/forme-du-chantier.js");
  const rendu = bloc.slice(bloc.indexOf("function renderLaReference"), bloc.indexOf("export function renderLaForme"));

  assert.ok(rendu, "renderLaReference est introuvable");
  assert.match(rendu, /mesure\?\.froid/, "le froid n'est pas distingué");
  assert.match(rendu, /il en faut au moins \$\{LE_FROID\}/, "le seuil ne se dit pas");
  assert.match(rendu, /sur \$\{\s*escapeHtml\(String\(une\.mesure\.sur\)\)/,
    "un taux s'affiche sans dire sur combien il repose");
  assert.match(rendu, /n'a rien appris/, "rien ne dit à quoi sert cette référence");

  // Et la forme la dessine : une fonction que personne n'appelle ne montre
  // rien, et rien ne tombe.
  assert.match(bloc, /\$\{renderLaReference\(mesures\)\}/,
    "la référence n'est dessinée nulle part");
});
