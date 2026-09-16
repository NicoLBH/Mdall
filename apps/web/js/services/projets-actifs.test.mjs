/**
 * Les projets où l'on travaille vraiment.
 *
 * ## Ce que ces gardes attrapent
 *
 * Un classement **par nombre d'événements** : un versement de deux cents pièces
 * un mardi matin ferait passer devant un projet qu'on n'a pas rouvert depuis.
 * Le nombre dirait « très actif » là où il s'est passé une seule chose, une
 * seule fois — et rien à l'écran ne le démentirait.
 *
 * Et un classement qui compte des traces **sans date ou sans projet** : il leur
 * inventerait une place.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  FENETRE_EN_JOURS, GENRE, actualitesRecentes, jourDe, phraseDesJours, projetsLesPlusActifs
} from "./projets-actifs.js";

const MAINTENANT = Date.parse("2026-06-01T12:00:00Z");

const jour = (rang) => new Date(MAINTENANT - rang * 24 * 60 * 60 * 1000).toISOString();

/**
 * Le même jour, à une heure différente.
 *
 * **C'est le cœur de la garde** : dix traces du même jour doivent compter pour
 * un. Les écrire toutes à la même seconde ne prouverait rien — un compte qui
 * additionne les instants les dédoublonnerait par accident.
 */
const memeJour = (rang, heure) => new Date(
  MAINTENANT - rang * 24 * 60 * 60 * 1000 + heure * 60 * 60 * 1000
).toISOString();

const NOMS = { "p-a": "NOVACLIM", "p-b": "VERIFAS", "p-c": "BERTRAND" };

/* ── Le classement ───────────────────────────────────────────────────────── */

/**
 * **Vingt gestes en un jour ne font pas un projet actif.** C'est tout l'objet du
 * compte par jours : trois matins valent mieux qu'un versement en masse.
 */
test("un projet où l'on revient passe devant un projet où l'on a tout fait d'un coup", () => {
  const traces = [
    // Le même jour, dix fois. Un versement.
    ...Array.from({ length: 10 }, (_, rang) => ({
      projet: "p-a", genre: GENRE.PROPOSITION, quoi: `Lot ${rang}`, quand: memeJour(20, rang - 5)
    })),
    // Trois matins différents.
    { projet: "p-b", genre: GENRE.DISCUSSION, quoi: "Coupe-feu", quand: jour(3) },
    { projet: "p-b", genre: GENRE.DISCUSSION, quoi: "Escaliers", quand: jour(2) },
    { projet: "p-b", genre: GENRE.ETUDE, quoi: "Incendie", quand: jour(1) }
  ];

  const [premier, second] = projetsLesPlusActifs({ traces, nomsDesProjets: NOMS, maintenant: MAINTENANT });

  assert.equal(premier.id, "p-b");
  assert.equal(premier.jours, 3);
  assert.equal(premier.nom, "VERIFAS");
  assert.equal(second.id, "p-a");
  assert.equal(second.jours, 1, "dix gestes le même jour font un jour");
});

/** À égalité, celui d'hier est celui qu'on a dans les mains. */
test("à nombre de jours égal, le plus récent passe devant", () => {
  const traces = [
    { projet: "p-a", genre: GENRE.DISCUSSION, quand: jour(30) },
    { projet: "p-b", genre: GENRE.DISCUSSION, quand: jour(2) }
  ];

  const [premier] = projetsLesPlusActifs({ traces, maintenant: MAINTENANT });
  assert.equal(premier.id, "p-b");
});

/** Ce qui est hors de la fenêtre n'est plus « en ce moment ». */
test("au-delà de la fenêtre, une trace ne compte plus", () => {
  const traces = [
    { projet: "p-a", genre: GENRE.DISCUSSION, quand: jour(FENETRE_EN_JOURS + 5) },
    { projet: "p-b", genre: GENRE.DISCUSSION, quand: jour(5) }
  ];

  const classees = projetsLesPlusActifs({ traces, maintenant: MAINTENANT });
  assert.deepEqual(classees.map((sien) => sien.id), ["p-b"]);
});

/**
 * **Une trace sans projet ou sans date ne se range nulle part.** La compter
 * reviendrait à lui inventer une place — et c'est la place de quelqu'un.
 */
test("ce qui ne dit ni où ni quand ne compte pas", () => {
  const traces = [
    { projet: "", genre: GENRE.DISCUSSION, quand: jour(1) },
    { projet: "p-a", genre: GENRE.DISCUSSION, quand: "" },
    { projet: "p-a", genre: GENRE.DISCUSSION, quand: "avant-hier" },
    { projet: "p-b", genre: GENRE.DISCUSSION, quand: jour(1) }
  ];

  const classees = projetsLesPlusActifs({ traces, maintenant: MAINTENANT });
  assert.deepEqual(classees.map((sien) => sien.id), ["p-b"]);
});

/** Cinq à l'écran, et pas un de plus — même quand on travaille partout. */
test("le classement s'arrête au nombre demandé", () => {
  const traces = Array.from({ length: 12 }, (_, rang) => ({
    projet: `p-${rang}`, genre: GENRE.DISCUSSION, quand: jour(rang + 1)
  }));

  assert.equal(projetsLesPlusActifs({ traces, maintenant: MAINTENANT }).length, 5);
  assert.equal(projetsLesPlusActifs({ traces, maintenant: MAINTENANT, combien: 3 }).length, 3);
});

/** Un projet qu'on ne sait pas nommer montre son identifiant, pas une ligne vide. */
test("un projet sans nom connu se dit quand même", () => {
  const traces = [{ projet: "p-z", genre: GENRE.DISCUSSION, quand: jour(1) }];

  assert.equal(projetsLesPlusActifs({ traces, nomsDesProjets: NOMS, maintenant: MAINTENANT })[0].nom, "p-z");
});

/** Sans trace, le classement est vide — et ce n'est pas une erreur. */
test("sans trace, aucun classement", () => {
  assert.deepEqual(projetsLesPlusActifs({ maintenant: MAINTENANT }), []);
  assert.deepEqual(projetsLesPlusActifs(), []);
});

/* ── Les actualités ──────────────────────────────────────────────────────── */

test("les actualités montrent les dernières traces, la plus récente en tête", () => {
  const traces = [
    { projet: "p-a", genre: GENRE.PROPOSITION, quoi: "Reprise des fondations", quand: jour(9) },
    { projet: "p-b", genre: GENRE.DISCUSSION, quoi: "Coupe-feu", quand: jour(1) },
    { projet: "p-a", genre: GENRE.ETUDE, quoi: "Incendie", quand: jour(4) },
    { projet: "p-c", genre: GENRE.PROPOSITION, quoi: "Calepinage", quand: jour(20) },
    { projet: "p-c", genre: GENRE.DISCUSSION, quoi: "Toiture", quand: jour(30) }
  ];

  const dernieres = actualitesRecentes({ traces, nomsDesProjets: NOMS, maintenant: MAINTENANT });

  assert.equal(dernieres.length, 4);
  assert.deepEqual(dernieres.map((sienne) => sienne.quoi), [
    "Coupe-feu", "Incendie", "Reprise des fondations", "Calepinage"
  ]);
  assert.equal(dernieres[0].nomDuProjet, "VERIFAS", "et l'on sait où");
});

/**
 * **Les actualités regardent plus loin que le classement.** Un mois sans rien
 * faire ne doit pas rendre l'accueil muet : on montre ce qu'il y a, même vieux,
 * et la date le dit.
 */
test("un mois creux ne vide pas les actualités", () => {
  const traces = [{ projet: "p-a", genre: GENRE.DISCUSSION, quoi: "Vieille question", quand: jour(200) }];

  assert.deepEqual(projetsLesPlusActifs({ traces, maintenant: MAINTENANT }), [], "le classement, lui, se tait");
  assert.equal(actualitesRecentes({ traces, maintenant: MAINTENANT }).length, 1);
});

/* ── Les petites choses ──────────────────────────────────────────────────── */

test("le jour d'un instant, et rien quand la date est illisible", () => {
  assert.equal(jourDe("2026-06-01T12:00:00Z"), "2026-06-01");
  assert.equal(jourDe("hier"), "");
  assert.equal(jourDe(""), "");
});

/** Le compte s'affiche avec son unité : un score sans unité ne se vérifie pas. */
test("le nombre de jours se dit en toutes lettres", () => {
  assert.equal(phraseDesJours(1), "1 jour");
  assert.equal(phraseDesJours(12), "12 jours");
  assert.equal(phraseDesJours(0), "");
});
