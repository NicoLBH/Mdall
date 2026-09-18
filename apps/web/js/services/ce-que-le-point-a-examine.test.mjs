import test from "node:test";
import assert from "node:assert/strict";

import { ceQueLePointAExamine, nomsCherchablesDunDocument } from "./ce-que-le-point-a-examine.js";

const POINT = { id: "p-1" };

const message = (id, plus = {}) => ({
  id, subject_id: "p-1", body_markdown: "voici la note",
  created_at: "2026-03-12T10:00:00Z", visibility: "normal", deleted_at: null, ...plus
});

const jointe = (id, nom, messageId, plus = {}) => ({
  id, subject_id: "p-1", message_id: messageId, file_name: nom,
  created_at: "2026-03-12T10:00:00Z", deleted_at: null, ...plus
});

/* ── Ce qu'on a regardé ──────────────────────────────────────────────────── */

test("un document versé dans la discussion a été examiné", () => {
  // Quand on débat d'une profondeur de fondation, l'étude géotechnique est
  // jointe au fil : c'est précisément ce qu'on est allé regarder.
  const dit = ceQueLePointAExamine({
    point: POINT,
    messages: [message("m-1")],
    piecesJointes: [jointe("a-1", "etude-geotechnique.pdf", "m-1")]
  });

  assert.deepEqual(dit, [{ quoi: "etude-geotechnique.pdf", ou: "" }]);
});

test("ils se lisent dans l'ordre où ils sont entrés dans la discussion", () => {
  const dit = ceQueLePointAExamine({
    point: POINT,
    messages: [message("m-1"), message("m-2", { created_at: "2026-04-02T10:00:00Z" })],
    piecesJointes: [
      jointe("a-2", "releve-topo.pdf", "m-2", { created_at: "2026-04-02T10:00:00Z" }),
      jointe("a-1", "etude-geotechnique.pdf", "m-1")
    ]
  });

  assert.deepEqual(dit.map((e) => e.quoi), ["etude-geotechnique.pdf", "releve-topo.pdf"]);
});

test("le même document joint deux fois n'a été regardé qu'une fois", () => {
  const dit = ceQueLePointAExamine({
    point: POINT,
    messages: [message("m-1"), message("m-2")],
    piecesJointes: [
      jointe("a-1", "etude-geotechnique.pdf", "m-1"),
      jointe("a-2", "etude-geotechnique.pdf", "m-2")
    ]
  });

  assert.equal(dit.length, 1);
});

/* ── Les trois refus ─────────────────────────────────────────────────────── */

test("une pièce jointe à un échange avec le copilote ne se montre jamais", () => {
  // Ces conversations sont privées par construction, et le seul nom de fichier
  // d'un document qu'on y a déposé suffirait à trahir ce qui s'y est dit.
  const dit = ceQueLePointAExamine({
    point: POINT,
    messages: [message("m-prive", { visibility: "ephemeral" })],
    piecesJointes: [jointe("a-1", "note-confidentielle.pdf", "m-prive")]
  });

  assert.deepEqual(dit, []);
});

test("une pièce jointe à un message effacé ne se montre pas non plus", () => {
  const dit = ceQueLePointAExamine({
    point: POINT,
    messages: [message("m-1", { deleted_at: "2026-03-13T10:00:00Z" })],
    piecesJointes: [jointe("a-1", "brouillon.pdf", "m-1")]
  });

  assert.deepEqual(dit, []);
});

test("un dépôt que personne n'a posté ne compte pas", () => {
  // Une pièce sans `message_id` est un envoi en cours : le fichier existe,
  // personne ne l'a mis dans la discussion. Dire « on a examiné ceci » d'un
  // brouillon serait faux.
  const dit = ceQueLePointAExamine({
    point: POINT,
    messages: [message("m-1")],
    piecesJointes: [jointe("a-1", "en-cours.pdf", null, { upload_session_id: "u-1" })]
  });

  assert.deepEqual(dit, []);
});

test("un message qu'on n'a pas lu ne se juge pas", () => {
  // Sans les messages, on ne peut pas savoir lesquels étaient privés. Montrer
  // dans le doute est exactement ce qu'on ne fait pas : l'étape reste creuse et
  // le dit (règle 5).
  //
  // `null` autant que `[]` : c'est la forme qu'une lecture ratée rend, et c'est
  // **ici** que la ligne tient — l'appelant qui vérifierait de son côté ajoute
  // une ceinture, il ne la remplace pas.
  const pieces = [jointe("a-1", "etude-geotechnique.pdf", "m-1")];

  assert.deepEqual(ceQueLePointAExamine({ point: POINT, messages: [], piecesJointes: pieces }), []);
  assert.deepEqual(ceQueLePointAExamine({ point: POINT, messages: null, piecesJointes: pieces }), []);
});

test("une pièce retirée ne parle plus", () => {
  const dit = ceQueLePointAExamine({
    point: POINT,
    messages: [message("m-1")],
    piecesJointes: [jointe("a-1", "retire.pdf", "m-1", { deleted_at: "2026-03-14T10:00:00Z" })]
  });

  assert.deepEqual(dit, []);
});

test("les pièces d'un autre point ne remontent pas", () => {
  const dit = ceQueLePointAExamine({
    point: POINT,
    messages: [message("m-1")],
    piecesJointes: [jointe("a-1", "ailleurs.pdf", "m-1", { subject_id: "p-autre" })]
  });

  assert.deepEqual(dit, []);
});

test("une pièce sans nom de fichier ne se dit pas", () => {
  // Une ligne vide dans « Examine » se lirait comme un document dont on aurait
  // perdu le nom : c'est moins qu'un trou nommé.
  const dit = ceQueLePointAExamine({
    point: POINT,
    messages: [message("m-1")],
    piecesJointes: [jointe("a-1", "   ", "m-1")]
  });

  assert.deepEqual(dit, []);
});

test("sans rien, rien ne se dit — et sans casser", () => {
  assert.deepEqual(ceQueLePointAExamine(), []);
  assert.deepEqual(ceQueLePointAExamine({ point: POINT }), []);
});

/* ── Ce qu'on cite sans le joindre ───────────────────────────────────────── */

/** Le corpus d'un projet. Aucun nom réel : rien ici ne désigne personne. */
const CORPUS = [
  { id: "d-1", original_filename: "Etude geotechnique G2.pdf", deleted_at: null },
  { id: "d-2", original_filename: "Notes.pdf", deleted_at: null },
  { id: "d-3", original_filename: "Plan.pdf", deleted_at: null }
];

const CITANT = { id: "p-1", title: "Quelle profondeur hors gel ?", description: "" };

const ecrit = (id, corps, plus = {}) => ({
  id, subject_id: "p-1", body_markdown: corps,
  created_at: "2026-03-01T09:00:00Z", visibility: "normal", deleted_at: null, ...plus
});

test("un document du corpus cité dans un commentaire est examiné", () => {
  // « Cf. l'étude géotechnique » est la phrase ordinaire : le document n'est
  // presque jamais joint au fil, il y est nommé, et l'étape restait vide.
  const regardes = ceQueLePointAExamine({
    point: CITANT, documents: CORPUS,
    messages: [ecrit("m-1", "On se cale sur l'étude géotechnique G2, page 12.")]
  });

  assert.deepEqual(regardes, [{ quoi: "Etude geotechnique G2.pdf", ou: "cité dans un commentaire" }]);
});

test("il dit où il a été cité, pour qu'on aille relire la phrase", () => {
  // C'est ce qui permet de vérifier la reconnaissance d'un coup d'œil. « Au
  // corpus » n'apprendrait rien : on sait où est le corpus.
  const dansLaDescription = ceQueLePointAExamine({
    point: { ...CITANT, description: "Voir l'étude géotechnique G2." },
    documents: CORPUS, messages: []
  });

  assert.equal(dansLaDescription[0].ou, "cité dans la description");
});

test("un nom d'un seul mot ne se reconnaît pas sans son extension", () => {
  // « Notes.pdf » a pour racine « notes », qui est un mot de la langue.
  // Le reconnaître dans « les notes de calcul » produirait un « examiné » que
  // personne n'a fait — et un faux « on a regardé ceci » couvre en silence.
  const sansExtension = ceQueLePointAExamine({
    point: CITANT, documents: CORPUS,
    messages: [ecrit("m-1", "Les notes de calcul de l'entreprise sont arrivées.")]
  });

  assert.deepEqual(sansExtension, []);

  // Écrit avec son extension, il redevient un nom : personne n'écrit « .pdf »
  // par hasard.
  const avecExtension = ceQueLePointAExamine({
    point: CITANT, documents: CORPUS,
    messages: [ecrit("m-1", "Voir Notes.pdf.")]
  });

  assert.deepEqual(avecExtension.map((r) => r.quoi), ["Notes.pdf"]);
});

test("un nom ne se reconnaît que sur des mots entiers", () => {
  // « étude de sol » ne se reconnaît pas dans « étude de solidité ». C'est la
  // règle de toute reconnaissance de nom dans un texte ici, et le piège est
  // celui-là : un nom de document est souvent le début d'un autre.
  const sol = [{ id: "d-7", original_filename: "Etude de sol.pdf", deleted_at: null }];

  assert.deepEqual(ceQueLePointAExamine({
    point: CITANT, documents: sol,
    messages: [ecrit("m-1", "On attend l'étude de solidité de l'entreprise.")]
  }), []);

  // Et le même nom, écrit entier, se reconnaît.
  assert.deepEqual(ceQueLePointAExamine({
    point: CITANT, documents: sol,
    messages: [ecrit("m-1", "On se cale sur l'étude de sol.")]
  }).map((r) => r.quoi), ["Etude de sol.pdf"]);

  // Et « plan » ne se reconnaît pas davantage dans « planning » — celui-là ne
  // se cherche de toute façon que par son nom complet.
  assert.deepEqual(ceQueLePointAExamine({
    point: CITANT, documents: CORPUS,
    messages: [ecrit("m-1", "Le planning de l'entreprise décale tout.")]
  }), []);
});

test("deux documents du même nom ne se reconnaissent pas", () => {
  // Le texte en cite un, on ne sait pas lequel, et en désigner un serait un
  // rapprochement faux.
  const deux = [
    { id: "d-4", original_filename: "CR de chantier.pdf", deleted_at: null },
    { id: "d-5", original_filename: "CR de chantier.pdf", deleted_at: null }
  ];

  const regardes = ceQueLePointAExamine({
    point: CITANT, documents: deux,
    messages: [ecrit("m-1", "Repris au CR de chantier.")]
  });

  assert.deepEqual(regardes, []);
});

test("un document retiré du corpus ne se reconnaît plus", () => {
  const retire = [{ id: "d-6", original_filename: "Etude thermique RE2020.pdf", deleted_at: "2026-02-01T00:00:00Z" }];

  assert.deepEqual(ceQueLePointAExamine({
    point: CITANT, documents: retire,
    messages: [ecrit("m-1", "Voir l'étude thermique RE2020.")]
  }), []);
});

test("un échange avec le copilote ne cite rien", () => {
  // Le refus qui compte le plus, et il n'est pas réécrit ici : la lecture des
  // textes passe par `textesDuPoint`, qui l'applique.
  const regardes = ceQueLePointAExamine({
    point: CITANT, documents: CORPUS,
    messages: [ecrit("m-1", "L'étude géotechnique G2 dit 0,69 m.", { visibility: "ephemeral" })]
  });

  assert.deepEqual(regardes, []);
});

test("un message effacé ne cite rien non plus", () => {
  const regardes = ceQueLePointAExamine({
    point: CITANT, documents: CORPUS,
    messages: [ecrit("m-1", "Voir l'étude géotechnique G2.", { deleted_at: "2026-03-02T08:00:00Z" })]
  });

  assert.deepEqual(regardes, []);
});

test("un document joint ET cité ne compte qu'une fois, et garde sa place", () => {
  // Joint, il est là : c'est une preuve plus forte qu'un nom dans une phrase.
  const regardes = ceQueLePointAExamine({
    point: CITANT, documents: CORPUS,
    messages: [ecrit("m-1", "Voir l'étude géotechnique G2.")],
    piecesJointes: [{
      id: "a-1", subject_id: "p-1", message_id: "m-1",
      file_name: "Etude geotechnique G2.pdf", created_at: "2026-03-01T09:00:00Z", deleted_at: null
    }]
  });

  assert.deepEqual(regardes, [{ quoi: "Etude geotechnique G2.pdf", ou: "" }]);
});

test("les noms cherchables d'un document se disent", () => {
  // Le nom complet toujours ; la racine seulement si elle porte deux mots.
  assert.deepEqual(nomsCherchablesDunDocument({ original_filename: "Etude geotechnique G2.pdf" }),
    ["etude geotechnique g2.pdf", "etude geotechnique g2"]);
  assert.deepEqual(nomsCherchablesDunDocument({ original_filename: "Notes.pdf" }), ["notes.pdf"]);
  // Trop court pour être cherché du tout : « EG » est partout.
  assert.deepEqual(nomsCherchablesDunDocument({ original_filename: "EG" }), []);
  assert.deepEqual(nomsCherchablesDunDocument(null), []);
});

test("sans corpus lu, on ne prétend pas qu'il n'y a rien à citer", () => {
  // L'appelant qui n'a pas su lire le corpus passe une liste vide, et l'étape
  // dit ce qu'elle sait : les pièces jointes. Elle ne dit pas « rien d'autre
  // n'a été regardé ».
  const regardes = ceQueLePointAExamine({
    point: CITANT, messages: [ecrit("m-1", "Voir l'étude géotechnique G2.")]
  });

  assert.deepEqual(regardes, []);
});
