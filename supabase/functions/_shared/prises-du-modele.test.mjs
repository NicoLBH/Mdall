import assert from "node:assert/strict";
import test from "node:test";

import {
  CONSIGNES, ECART, ECART_DE_NATURE, NATURE, SCHEMA_DES_PRISES,
  filEnTexte, messagesEnPages, prisesAuFormatDuMoteur, verifierLesPrises
} from "./prises-du-modele.js";

// Aucun mail réel : les noms, les sociétés et les domaines sont inventés.
const MESSAGES = [
  {
    rang: 1, qui: "BERTRAND", quand: "2026-03-03T07:30:00.000Z",
    propos: "Rien n'a été relevé au droit de l'acrotère à ce jour."
  },
  {
    rang: 2, qui: "Ourdine Ferrand", quand: "2026-03-12T08:14:00.000Z",
    propos: "Le support est humide au droit de l'acrotère. Pouvez-vous confirmer la cote avant vendredi ?"
  },
  { rang: 3, qui: "Bureau VERIFAS", quand: "", propos: "" }
];

const prise = (dessus = {}) => ({
  nature: NATURE.CONSTAT,
  intitule: "le support est humide au droit de l'acrotère",
  message: 2,
  citation: "Le support est humide au droit de l'acrotère.",
  porte_sur: "humidité de l'acrotère",
  pour_qui: null,
  echeance: null,
  ...dessus
});

// ── Le fil tel qu'on le donne à lire ───────────────────────────────────────

test("chaque message porte son numéro, son auteur et sa date", () => {
  const lu = filEnTexte(MESSAGES);
  assert.ok(lu.includes("=== MESSAGE 1 — BERTRAND — 2026-03-03T07:30:00.000Z ==="));
  assert.ok(lu.includes("=== MESSAGE 2 — Ourdine Ferrand —"));
});

test("un message sans propos ne monte pas", () => {
  // Il n'a rien à relever, et l'envoyer ferait payer un jeton pour un en-tête.
  assert.equal(filEnTexte(MESSAGES).includes("MESSAGE 3"), false);
});

test("un message sans auteur ni date le dit, plutôt que de laisser un blanc", () => {
  const lu = filEnTexte([{ rang: 1, propos: "Le support est humide." }]);
  assert.ok(lu.includes("auteur inconnu"));
  assert.ok(lu.includes("date inconnue"));
});

test("le fil s'arrête au plafond de caractères", () => {
  const long = Array.from({ length: 50 }, (rien, rang) => ({
    rang: rang + 1, qui: "A", quand: "", propos: "x".repeat(100)
  }));
  assert.ok(filEnTexte(long, { maxCaracteres: 500 }).length < 700);
});

test("le fil devient des pages numérotées par le rang des messages", () => {
  assert.deepEqual(messagesEnPages(MESSAGES).map((page) => page.page), [1, 2]);
});

// ── La consigne ────────────────────────────────────────────────────────────

test("la consigne dit les cinq natures, et pas les deux qui se dérivent", () => {
  for (const nature of Object.values(NATURE)) assert.ok(CONSIGNES.includes(nature), nature);
  // Les faire déclarer par le modèle en ferait des inventions ; elles se
  // calculent sur le fil déplié, à l'étape 6.
  assert.equal(CONSIGNES.includes("sans-reponse"), false);
  assert.equal(CONSIGNES.includes("désaccord"), false);
});

test("la consigne interdit d'inventer l'auteur et la date", () => {
  // Ils sont lus dans les en-têtes du .eml. Une seconde source finirait par
  // contredire la première, et l'on croirait la mauvaise.
  assert.ok(CONSIGNES.includes("N'invente JAMAIS l'auteur ni la date"));
});

test("la consigne dit que la citation sera vérifiée", () => {
  assert.ok(CONSIGNES.includes("RECOPIÉE MOT POUR MOT"));
  assert.ok(CONSIGNES.includes("sera écartée"));
});

test("le schéma ne demande ni l'auteur ni la date", () => {
  const champs = Object.keys(SCHEMA_DES_PRISES.schema.properties.prises.items.properties);
  assert.equal(champs.includes("qui"), false);
  assert.equal(champs.includes("quand"), false);
  assert.deepEqual([...champs].sort(),
    ["citation", "echeance", "intitule", "message", "nature", "porte_sur", "pour_qui"]);
});

test("le schéma ferme la liste des natures", () => {
  const permises = SCHEMA_DES_PRISES.schema.properties.prises.items.properties.nature.enum;
  assert.deepEqual([...permises].sort(), [...Object.values(NATURE)].sort());
});

// ── La porte : la nature ───────────────────────────────────────────────────

test("une nature hors de la liste n'entre pas", () => {
  // Une nature inventée est une colonne de plus à l'écran, sous laquelle des
  // prises réelles iraient se ranger sans qu'on sache d'où elle sort.
  const lu = verifierLesPrises({ prises: [prise({ nature: "remarque" })], messages: MESSAGES });
  assert.deepEqual(lu.retenues, []);
  assert.equal(lu.ecartees[0].motif, ECART_DE_NATURE);
});

test("les cinq natures entrent", () => {
  for (const nature of Object.values(NATURE)) {
    const lu = verifierLesPrises({ prises: [prise({ nature })], messages: MESSAGES });
    assert.equal(lu.retenues.length, 1, nature);
  }
});

// ── La porte : la citation ─────────────────────────────────────────────────

test("une citation qu'on retrouve dans son message passe", () => {
  const lu = verifierLesPrises({ prises: [prise()], messages: MESSAGES });
  assert.equal(lu.retenues.length, 1);
  assert.equal(lu.retenues[0].pageVerifiee, true);
  assert.deepEqual(lu.ecartees, []);
});

test("une citation inventée ne passe pas", () => {
  // Une prise inventée est plausible : « il faut reprendre le relevé » pourrait
  // figurer dans n'importe quel fil. Ce qui l'en distingue, c'est le message.
  const lu = verifierLesPrises({
    prises: [prise({ citation: "Il faut reprendre le relevé sur toute la longueur." })],
    messages: MESSAGES
  });
  assert.deepEqual(lu.retenues, []);
  assert.equal(lu.ecartees[0].motif, ECART.INTROUVABLE);
});

test("une prise sans citation ne passe pas non plus", () => {
  const lu = verifierLesPrises({ prises: [prise({ citation: "" })], messages: MESSAGES });
  assert.equal(lu.ecartees[0].motif, ECART.SANS_CITATION);
});

test("une prise sans intitulé ne porte rien à lire", () => {
  const lu = verifierLesPrises({ prises: [prise({ intitule: "  " })], messages: MESSAGES });
  assert.equal(lu.ecartees[0].motif, ECART.VIDE);
});

test("la typographie ne fait pas jeter une vraie citation", () => {
  // Une apostrophe courbe, une espace insécable, un accent : la citation est
  // exacte, et la rejeter ferait perdre une lecture juste.
  const lu = verifierLesPrises({
    prises: [prise({ citation: "Le support est humide au droit de l’acrotere." })],
    messages: MESSAGES
  });
  assert.equal(lu.retenues.length, 1);
});

test("une prise attribuée au mauvais message se rattache, et ça se compte", () => {
  // La prise est réelle — mais son auteur change, et c'est ce qui compte ici :
  // « BERTRAND affirme » et « Ourdine Ferrand affirme » ne sont pas la même
  // information.
  const lu = verifierLesPrises({ prises: [prise({ message: 1 })], messages: MESSAGES });
  assert.equal(lu.retenues.length, 1);
  assert.equal(lu.retenues[0].pageVerifiee, false);
  assert.equal(lu.retenues[0].page, 2);
  assert.equal(lu.messagesCorriges, 1);
});

test("un fil sans message ne retient rien", () => {
  assert.deepEqual(verifierLesPrises({ prises: [prise()], messages: [] }).retenues, []);
  assert.deepEqual(verifierLesPrises({}).retenues, []);
});

// ── La forme que l'écran attend ────────────────────────────────────────────

test("l'auteur et la date viennent du message, pas du modèle", () => {
  const { retenues } = verifierLesPrises({ prises: [prise()], messages: MESSAGES });
  const [rendue] = prisesAuFormatDuMoteur(retenues, { filId: "toiture", messages: MESSAGES });
  assert.equal(rendue.qui, "Ourdine Ferrand");
  assert.equal(rendue.quand, "2026-03-12T08:14:00.000Z");
});

test("une prise rattachée ailleurs prend l'auteur du message où elle est vraiment", () => {
  const { retenues } = verifierLesPrises({ prises: [prise({ message: 1 })], messages: MESSAGES });
  const [rendue] = prisesAuFormatDuMoteur(retenues, { messages: MESSAGES });
  assert.equal(rendue.qui, "Ourdine Ferrand");
  assert.equal(rendue.messageVerifie, false);
});

test("un message sans date rend une prise sans date, et non une date inventée", () => {
  const sansDate = [{ rang: 1, qui: "BERTRAND", quand: "", propos: "Le support est humide." }];
  const { retenues } = verifierLesPrises({
    prises: [prise({ message: 1, citation: "Le support est humide." })], messages: sansDate
  });
  const [rendue] = prisesAuFormatDuMoteur(retenues, { messages: sansDate });
  assert.equal(rendue.quand, null);
});

test("la clé distingue deux prises d'un même message, et se refait à l'identique", () => {
  const deux = [prise(), prise({ nature: NATURE.DEMANDE, intitule: "confirmer la cote" })];
  const { retenues } = verifierLesPrises({ prises: deux, messages: MESSAGES });
  const cles = prisesAuFormatDuMoteur(retenues, { filId: "toiture", messages: MESSAGES })
    .map((rendue) => rendue.key);
  assert.equal(new Set(cles).size, 2);
  assert.deepEqual(
    prisesAuFormatDuMoteur(retenues, { filId: "toiture", messages: MESSAGES }).map((r) => r.key),
    cles
  );
});

test("deux prises identiques d'un même message portent la même empreinte", () => {
  const { retenues } = verifierLesPrises({ prises: [prise(), prise()], messages: MESSAGES });
  const rendues = prisesAuFormatDuMoteur(retenues, { messages: MESSAGES });
  assert.equal(rendues[0].empreinte, rendues[1].empreinte);
  assert.notEqual(rendues[0].key, rendues[1].key);
});

test("les champs vides sortent à null, et non en chaîne vide", () => {
  const { retenues } = verifierLesPrises({ prises: [prise()], messages: MESSAGES });
  const [rendue] = prisesAuFormatDuMoteur(retenues, { messages: MESSAGES });
  assert.equal(rendue.pourQui, null);
  assert.equal(rendue.echeance, null);
  assert.equal(rendue.porteSur, "humidité de l'acrotère");
});
