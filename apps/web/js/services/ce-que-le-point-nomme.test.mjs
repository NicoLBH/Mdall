import test from "node:test";
import assert from "node:assert/strict";

import {
  OU, PAR, ceQueLePointNomme, messageLisible, phraseDOuOnLaVu,
  phraseDeLaReconnaissance, textesDuPoint
} from "./ce-que-le-point-nomme.js";

/** Une affirmation de la mémoire. Aucun nom réel nulle part. */
const valeur = (id, sujet, dite) => ({
  id, subject_key: sujet, statement: `${sujet} : ${dite}`,
  payload: { subject: sujet, value: dite }, kind: "base-datum", superseded_by: null
});

const MEMOIRE = [
  valeur("v-loc", "Localisation", "Chamonix"),
  valeur("v-hg", "Profondeur hors gel", "0,69 m"),
  valeur("v-sol", "Classe de sol", "C")
];

const message = (corps, plus = {}) => ({
  id: "m-1", subject_id: "p-1", body_markdown: corps,
  created_at: "2026-03-12T10:00:00Z", visibility: "normal", deleted_at: null, ...plus
});

/* ── Ce que la reconnaissance a le droit de lire ─────────────────────────── */

test("un échange avec le copilote n'est jamais lu", () => {
  // `visibility = 'ephemeral'` marque les conversations avec le copilote. Elles
  // sont privées par construction, et ne doivent jamais reparaître devant les
  // collaborateurs du projet — pas même sous la forme « ce nom a été reconnu
  // dans un commentaire ».
  const prive = message("La classe de sol est C", { visibility: "ephemeral" });

  assert.equal(messageLisible(prive), false);
  assert.deepEqual(textesDuPoint({ id: "p-1" }, [prive]), []);
  assert.deepEqual(ceQueLePointNomme({ point: { id: "p-1" }, messages: [prive], assertions: MEMOIRE }).noms, []);
});

test("la marque du copilote se reconnaît quelle que soit sa casse", () => {
  // La base contraint la colonne à « normal » ou « ephemeral », et c'est
  // pourquoi cette garde a l'air inutile. Elle ne l'est pas : `messageLisible`
  // est exportée, et une ligne peut lui venir d'ailleurs — un export relu, un
  // jeu d'essai, une future fonction du serveur. Sur la règle la plus grave du
  // produit, on ne fait pas dépendre la protection de qui appelle.
  assert.equal(messageLisible(message("classe de sol", { visibility: "Ephemeral" })), false);
  assert.equal(messageLisible(message("classe de sol", { visibility: " EPHEMERAL " })), false);
});

test("un message effacé ne parle plus", () => {
  // Son auteur l'a retiré. Le faire parler encore reviendrait à ne pas l'avoir
  // retiré.
  const efface = message("La classe de sol est C", { deleted_at: "2026-03-13T10:00:00Z" });

  assert.equal(messageLisible(efface), false);
  assert.deepEqual(ceQueLePointNomme({ point: { id: "p-1" }, messages: [efface], assertions: MEMOIRE }).noms, []);
});

test("un message vide ne se lit pas comme un silence de la mémoire", () => {
  assert.equal(messageLisible(message("")), false);
  assert.equal(messageLisible(message("   ")), false);
  assert.equal(messageLisible(null), false);
});

test("les commentaires d'un autre point ne se mêlent pas à celui-ci", () => {
  // L'appelant peut passer le fil entier d'un projet. Les mélanger ferait
  // reconnaître dans l'un ce qui s'est dit dans l'autre.
  const ailleurs = message("La classe de sol est C", { subject_id: "p-autre" });

  assert.deepEqual(textesDuPoint({ id: "p-1" }, [ailleurs]), []);
});

/* ── Les trois endroits ──────────────────────────────────────────────────── */

test("la description est lue, même quand le titre existe", () => {
  // C'était le défaut de fond : `title || titre || description` ne lisait la
  // description qu'à défaut de titre, donc jamais.
  const lus = textesDuPoint({ id: "p-1", title: "CR chantier n°25", description: "à Chamonix" });

  assert.deepEqual(lus.map((entree) => entree.ou), [OU.TITRE, OU.DESCRIPTION]);
});

test("les commentaires sont lus, et ils ne l'étaient pas du tout", () => {
  const lus = textesDuPoint({ id: "p-1", title: "CR chantier n°25" }, [message("classe de sol")]);

  assert.deepEqual(lus.map((entree) => entree.ou), [OU.TITRE, OU.COMMENTAIRE]);
  assert.equal(lus[1].quand, "2026-03-12T10:00:00Z");
});

/* ── Tous les noms, pas un seul ──────────────────────────────────────────── */

test("une description qui cite deux noms les rend tous les deux", () => {
  // Le cas de fond : un titre qui ne nomme rien, une description qui en nomme
  // deux. Avant, la description n'était pas lue du tout et un seul nom aurait
  // survécu de toute façon.
  const dit = ceQueLePointNomme({
    point: { id: "p-1", title: "CR chantier n°25",
      description: "la localisation du projet impose une profondeur hors gel de 0,69 m" },
    assertions: MEMOIRE
  });

  assert.deepEqual(dit.noms.map((entree) => entree.nom).sort(), ["localisation", "profondeur hors gel"]);
});

test("une valeur écrite dans le texte désigne son nom", () => {
  // La limite est levée : « à Chamonix » nomme la **valeur** de la
  // localisation, et c'est la manière la plus naturelle d'écrire un compte
  // rendu. Elle l'était depuis toujours, et la reconnaissance passait à côté.
  const dit = ceQueLePointNomme({
    point: { id: "p-1", description: "à Chamonix, les fondations descendent à 0,69 m" },
    assertions: MEMOIRE
  });

  assert.deepEqual(dit.noms.map((e) => e.nom).sort(), ["localisation", "profondeur hors gel"]);
  assert.deepEqual(dit.noms.map((e) => e.par), [PAR.VALEUR, PAR.VALEUR]);

  // Et « C » — la classe de sol — ne remonte pas : trop courte pour désigner
  // quoi que ce soit. C'est le refus qui rend cette porte utilisable.
  assert.ok(!dit.noms.some((e) => e.nom === "classe de sol"));
});

test("le nom l'emporte sur sa propre valeur", () => {
  // « Localisation : Chamonix » nomme deux fois la même chose. Le proposer deux
  // fois ferait répondre deux fois à une seule question — et le nom est la
  // reconnaissance la plus sûre.
  const dit = ceQueLePointNomme({
    point: { id: "p-1", description: "Localisation : Chamonix" },
    assertions: MEMOIRE
  });

  assert.equal(dit.noms.length, 1);
  assert.equal(dit.noms[0].par, PAR.NOM);
});

test("la phrase dit par où on a reconnu, parce que cela change tout", () => {
  // « Sa valeur apparaît » se relit tout autrement que « son nom apparaît » :
  // une valeur peut être un mot ordinaire, et c'est ce qui permet de juger.
  const parLaValeur = ceQueLePointNomme({
    point: { id: "p-1", description: "à Chamonix" }, assertions: MEMOIRE
  }).noms[0];
  const parLeNom = ceQueLePointNomme({
    point: { id: "p-1", title: "La localisation du projet" }, assertions: MEMOIRE
  }).noms[0];

  assert.equal(phraseDeLaReconnaissance(parLaValeur),
    "Sa valeur « Chamonix » apparaît dans la description de ce sujet.");
  assert.equal(phraseDeLaReconnaissance(parLeNom),
    "Son nom apparaît dans le titre de ce sujet.");
  assert.equal(phraseDeLaReconnaissance(null), "");
});

test("un titre qui ne nomme rien ne fait pas taire la description", () => {
  // « CR chantier n°25 » ne nomme rien, et c'est le cas le plus fréquent.
  const dit = ceQueLePointNomme({
    point: { id: "p-1", title: "CR chantier n°25", description: "la classe de sol est C" },
    assertions: MEMOIRE
  });

  assert.deepEqual(dit.versions.map((version) => version.id), ["v-sol"]);
});

test("un nom vu à trois endroits ne compte qu'une fois, et les garde tous", () => {
  const dit = ceQueLePointNomme({
    point: { id: "p-1", title: "La classe de sol", description: "la classe de sol est-elle C ?" },
    messages: [message("je confirme la classe de sol")],
    assertions: MEMOIRE
  });

  assert.equal(dit.noms.length, 1);
  assert.deepEqual(dit.noms[0].vu.map((trace) => trace.ou),
    [OU.TITRE, OU.DESCRIPTION, OU.COMMENTAIRE]);
});

test("un nom contenu dans un autre ne se propose pas à côté de lui", () => {
  // Proposer « Profondeur » sur un texte qui parle de la cote hors gel est
  // exactement le faux rapprochement que cette reconnaissance existe pour
  // éviter. Un rapprochement manqué se voit ; un faux couvre en silence.
  const dit = ceQueLePointNomme({
    point: { id: "p-1", title: "la profondeur hors gel" },
    assertions: [...MEMOIRE, valeur("v-p", "Profondeur", "1,20 m")]
  });

  assert.deepEqual(dit.noms.map((entree) => entree.nom), ["profondeur hors gel"]);
});

test("les versions de tous les noms remontent, sans doublon", () => {
  const dit = ceQueLePointNomme({
    point: { id: "p-1", description: "classe de sol et localisation" },
    messages: [message("encore la classe de sol")],
    assertions: MEMOIRE
  });

  assert.deepEqual(dit.versions.map((version) => version.id).sort(), ["v-loc", "v-sol"]);
});

/* ── Où on l'a vu, dit à l'écran ─────────────────────────────────────────── */

test("la phrase dit l'endroit, et jamais le texte", () => {
  // Citer un commentaire ici recopierait une conversation dans un écran qui
  // n'est pas la conversation.
  const dit = phraseDOuOnLaVu([{ ou: OU.DESCRIPTION }, { ou: OU.COMMENTAIRE }]);

  assert.equal(dit, "dans la description et un commentaire");
  assert.equal(phraseDOuOnLaVu([{ ou: OU.TITRE }]), "dans le titre");
});

test("un même endroit vu deux fois ne se dit pas deux fois", () => {
  // « dans un commentaire et un commentaire » ne veut rien dire.
  assert.equal(
    phraseDOuOnLaVu([{ ou: OU.COMMENTAIRE }, { ou: OU.COMMENTAIRE }]),
    "dans un commentaire"
  );
});

test("sans trace, la phrase se tait", () => {
  assert.equal(phraseDOuOnLaVu([]), "");
  assert.equal(phraseDOuOnLaVu(null), "");
});
