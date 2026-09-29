import test from "node:test";
import assert from "node:assert/strict";

import {
  episodeDuneArchive, lesConstatsDeLarchive, lesFilsDeLarchive, phraseDeCeQuOnNaPasSuLire
} from "./episode-dune-archive.js";
import { episodeDuProjet } from "./episode-du-projet.js";
import { LIGNES_DE_BASE, lesDomainesVenus } from "./ligne-de-base.js";
import { mesureDuPredicteur } from "./mesure-du-passe.js";

const jour = (quel) => `2026-${String(quel).padStart(2, "0")}-01T09:00:00.000Z`;

const message = (objet, quand, corps = "", empreinte = "") =>
  ({ objet, quand, corps, empreinte });

/* ── Les fils ────────────────────────────────────────────────────────────── */

test("les messages d'un même objet font un fil, quels que soient les RE et TR", () => {
  const { fils } = lesFilsDeLarchive([
    message("Montholon : désenfumage", jour(1)),
    message("RE: Montholon : désenfumage", jour(2)),
    message("TR: RE: Montholon : désenfumage", jour(3)),
    message("Autre chose", jour(2))
  ]);

  assert.equal(fils.length, 2);
  const un = fils.find((celui) => celui.titre.includes("Montholon"));
  assert.equal(un.combien, 3);
  // Le fil commence au premier message, et s'arrête au dernier.
  assert.equal(un.quand, jour(1));
  assert.equal(un.jusqua, jour(3));
});

/**
 * **Un fil ne se ferme pas.** Son dernier message dit où il s'est arrêté.
 * Écrire `fermeLe` avec cette date ferait lire « tranché le 12 mai » là où il
 * faut lire « plus rien après le 12 mai » (règle 5).
 */
test("un fil ne se dit jamais fermé", () => {
  const { fils } = lesFilsDeLarchive([
    message("Montholon", jour(1)), message("RE: Montholon", jour(5))
  ]);
  assert.equal(fils[0].fermeLe, null);
  assert.equal(fils[0].jusqua, jour(5));
});

/**
 * **Une archive n'arrive pas dans l'ordre.** Le convoi lit les fichiers dans
 * l'ordre du dossier, et la base les rend du plus récent au plus ancien : le
 * premier message *vu* d'un fil n'est presque jamais le premier *écrit*.
 */
test("un fil commence à son premier message, quel que soit l'ordre d'arrivée", () => {
  const { fils } = lesFilsDeLarchive([
    message("RE: Montholon", jour(9)),
    message("Montholon", jour(2)),
    message("RE: Montholon", jour(5))
  ]);
  assert.equal(fils[0].quand, jour(2));
  assert.equal(fils[0].jusqua, jour(9));
});

test("les fils se rangent du plus ancien au plus récent", () => {
  const { fils } = lesFilsDeLarchive([
    message("Tardif", jour(6)), message("Précoce", jour(2)), message("Milieu", jour(4))
  ]);
  assert.deepEqual(fils.map((un) => un.titre), ["Précoce", "Milieu", "Tardif"]);
});

/**
 * **Ce qui n'a pas de date n'entre pas dans la suite.** Le placer au début ou à
 * la fin inventerait un moment ; il se compte à part.
 */
test("un message sans date lisible ne tient pas dans la suite, et se compte", () => {
  const { fils, sansDate } = lesFilsDeLarchive([
    message("Montholon", jour(1)),
    message("Montholon", ""),
    message("Montholon", "hier matin")
  ]);
  assert.equal(fils[0].combien, 1);
  assert.equal(sansDate, 2);
});

test("un message sans objet ne fait pas un fil", () => {
  const { fils } = lesFilsDeLarchive([message("", jour(1)), message("  ", jour(2))]);
  assert.deepEqual(fils, []);
  assert.deepEqual(lesFilsDeLarchive(null).fils, []);
});

/* ── Les constats ────────────────────────────────────────────────────────── */

const filAvec = (...messages) => lesFilsDeLarchive(messages).fils;

/**
 * **C'est la première fois qui compte.** Un indice revient à chaque réponse
 * d'un fil — il est recopié avec la citation. Le dater de la dernière ferait
 * croire qu'on l'a rencontré des mois plus tard.
 */
test("un indice cité dans un fil est daté de sa première rencontre", () => {
  const { constats } = lesConstatsDeLarchive(filAvec(
    message("Montholon", jour(1), "voir l'IT 246"),
    message("RE: Montholon", jour(3), "oui, l'IT 246 s'applique"),
    message("RE: Montholon", jour(5), "d'accord pour l'IT 246")
  ));

  assert.equal(constats.length, 1);
  assert.equal(constats[0].quand, jour(1));
  assert.equal(constats[0].domaine, "incendie");
});

/**
 * **La clé porte le fil.** Le même DTU cité dans deux chantiers est deux
 * rencontres ; dans un seul fil, c'est une.
 */
test("le même indice dans deux fils fait deux constats", () => {
  const { constats } = lesConstatsDeLarchive(filAvec(
    message("Montholon", jour(1), "voir l'IT 246"),
    message("Bertrand", jour(2), "voir l'IT 246")
  ));
  assert.equal(constats.length, 2);
  assert.ok(constats[0].cle !== constats[1].cle);
});

test("l'objet compte autant que le corps", () => {
  const { constats } = lesConstatsDeLarchive(filAvec(
    message("Question désenfumage", jour(1), "Bonjour, merci d'avance.")
  ));
  assert.equal(constats.length, 1);
  assert.equal(constats[0].domaine, "incendie");
});

/**
 * **Un mail ne dit pas qu'un sujet est levé**, et l'inventer ferait compter des
 * issues qu'on n'a pas.
 */
test("aucun constat d'archive ne se dit levé", () => {
  const { constats } = lesConstatsDeLarchive(filAvec(
    message("Montholon", jour(1), "voir l'IT 246"),
    message("RE: Montholon", jour(9), "c'est réglé, sujet clos, IT 246 respectée")
  ));
  assert.equal(constats[0].leveLe, null);
});

/**
 * **Ce qui ne cite rien ne devient pas un constat sans domaine** : il se
 * compte. C'est la colonne qui dit où la lecture est aveugle.
 */
test("un message qui ne cite rien se compte, il n'invente pas un constat", () => {
  const { constats, sansIndice } = lesConstatsDeLarchive(filAvec(
    message("Montholon", jour(1), "Bonjour, je vous renvoie les plans."),
    message("RE: Montholon", jour(2), "Merci.")
  ));
  assert.deepEqual(constats, []);
  assert.equal(sansIndice, 2);
});

/**
 * **L'ordre des constats n'est pas décoratif.** `ceQuiSuitHabituellement` lit la
 * suite des domaines **dans l'ordre du tableau** pour compter les couples :
 * « après structure, il est venu incendie ». Un tableau mal rangé lui ferait
 * apprendre des enchaînements qui n'ont jamais eu lieu, sans que rien ne le
 * dise.
 */
test("les constats se rangent dans l'ordre du temps, pas dans celui des fils", () => {
  const { constats } = lesConstatsDeLarchive(lesFilsDeLarchive([
    // Le fil le plus ancien porte son indice tard ; le plus récent, tôt.
    message("Ancien fil", jour(1), "Bonjour."),
    message("RE: Ancien fil", jour(8), "voir l'IT 246"),
    message("Fil récent", jour(4), "cf. DTU 13.2")
  ]).fils);

  assert.deepEqual(constats.map((un) => un.domaine), ["sol", "incendie"]);
  assert.deepEqual(constats.map((un) => un.quand), [jour(4), jour(8)]);
});

test("chaque constat montre pourquoi il existe", () => {
  const [un] = lesConstatsDeLarchive(filAvec(
    message("Montholon", jour(1), "voir art. CO 24")
  )).constats;
  // De quoi le refuser : le texte trouvé, le genre de l'indice, et où il est.
  assert.match(un.trouve, /CO\s*24/);
  assert.equal(un.genre, "reference");
  assert.ok(un.dansLeFil.length > 0);
});

/* ── L'épisode, et la mesure ─────────────────────────────────────────────── */

/**
 * **La même forme, et c'est tout l'enjeu.** Deux formes auraient voulu dire
 * deux mesures, et l'on n'aurait plus su laquelle comparer à l'autre
 * (règle 10).
 */
test("un épisode d'archive a la forme d'un épisode de projet", () => {
  const dune = episodeDuneArchive({ messages: [message("Montholon", jour(1), "IT 246")] });
  const dun = episodeDuProjet({ sujets: [], assertions: [] });

  for (const champ of Object.keys(dun)) {
    assert.ok(champ in dune, `il manque « ${champ} »`);
  }
  for (const champ of Object.keys(dun.combien)) {
    assert.ok(champ in dune.combien, `il manque « combien.${champ} »`);
  }
});

test("les bornes du temps viennent des fils et des constats", () => {
  const episode = episodeDuneArchive({ messages: [
    message("Montholon", jour(2), "IT 246"),
    message("Bertrand", jour(7), "DTU 13.2")
  ] });
  assert.equal(episode.depuis, jour(2));
  assert.equal(episode.jusqua, jour(7));
  assert.equal(episode.combien.messages, 2);
});

test("une archive vide donne un épisode vide, pas une erreur", () => {
  const episode = episodeDuneArchive();
  assert.deepEqual(episode.ouvertures, []);
  assert.deepEqual(episode.constats, []);
  assert.equal(episode.depuis, "");
});

test("le contexte traverse, il ne se recalcule pas", () => {
  const contexte = { axes: [] };
  assert.equal(episodeDuneArchive({ contexte }).contexte, contexte);
});

/**
 * **C'est le point de tout l'exercice** : la mesure existante, sans une ligne
 * de changement, tourne sur un épisode tiré d'une archive.
 */
test("la mesure tourne sur un épisode d'archive sans rien savoir de sa source", () => {
  const messages = [];
  // Un passé assez long pour que la mesure ait des points : des fils qui
  // alternent, espacés de façon à ce qu'une fenêtre ne les avale pas tous.
  const suite = ["IT 246", "DTU 13.2", "IT 246", "Eurocode 2", "DTU 13.2", "IT 246", "Eurocode 2"];
  suite.forEach((quoi, rang) => messages.push(
    message(`Sujet ${rang}`, `2026-01-${String(rang * 3 + 1).padStart(2, "0")}T09:00:00.000Z`, quoi)
  ));

  const episode = episodeDuneArchive({ messages });
  assert.ok(episode.constats.length >= 5, "assez de constats pour mesurer");

  for (const ligne of LIGNES_DE_BASE) {
    const mesure = mesureDuPredicteur(episode, {
      predire: ligne.predire, arrive: lesDomainesVenus
    });
    assert.equal(typeof mesure.sur, "number", ligne.cle);
    assert.equal(typeof mesure.froid, "boolean", ligne.cle);
  }
});

/* ── Ce qu'on n'a pas su lire ────────────────────────────────────────────── */

test("ce qu'on n'a pas su lire se dit", () => {
  const episode = episodeDuneArchive({ messages: [
    message("Montholon", jour(1), "Bonjour, je vous renvoie les plans."),
    message("Bertrand", "", "IT 246")
  ] });

  const dite = phraseDeCeQuOnNaPasSuLire(episode);
  assert.match(dite, /1 message ne cite rien/);
  assert.match(dite, /1 n'a pas de date/);
});

test("une lecture qui a tout lu ne dit rien", () => {
  const episode = episodeDuneArchive({ messages: [message("Montholon", jour(1), "IT 246")] });
  assert.equal(phraseDeCeQuOnNaPasSuLire(episode), "");
  assert.equal(phraseDeCeQuOnNaPasSuLire(null), "");
});

/**
 * **Ne garder que les références est un seul argument.** C'est ce qui permet de
 * mesurer deux fois — avec et sans les termes — et de voir ce que les seconds
 * apportent vraiment.
 */
test("on peut ne compter que les références citées", () => {
  const messages = [message("Montholon", jour(1), "Le désenfumage reste à trancher.")];

  assert.equal(episodeDuneArchive({ messages }).constats.length, 1);
  const strict = episodeDuneArchive({ messages, sansLesTermes: true });
  assert.equal(strict.constats.length, 0);
  assert.equal(strict.combien.sansIndice, 1);
});
