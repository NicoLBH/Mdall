import test from "node:test";
import assert from "node:assert/strict";

import {
  leFilEnMarkdown, leMomentDit, leNomDuMailOuvert, lesPiecesDuFil, unMessageEnMarkdown
} from "./le-mail-en-markdown.js";

// Aucun mail réel : les noms, les sociétés et les domaines sont inventés.
const lu = (dessus = {}) => ({
  qui: { nom: "Ourdine Ferrand", adresse: "o.ferrand@novaclim.example" },
  a: [{ adresse: "controle@verifas.example", nom: "Bureau VERIFAS" }],
  copie: [],
  objet: "RE: Étanchéité toiture",
  objetNu: "Étanchéité toiture",
  quand: "2026-03-12T08:14:00Z",
  corps: "Le DTU 43.1 impose un relevé de 15 cm.",
  pieces: [],
  identite: "<m-1200@novaclim.example>",
  ...dessus
});

test("le nom de l'écran est l'objet sans ses RE:", () => {
  assert.equal(leNomDuMailOuvert(lu()), "Étanchéité toiture");
  assert.equal(leNomDuMailOuvert(lu({ objetNu: "", objet: "Fondations" })), "Fondations");
  assert.equal(leNomDuMailOuvert(null), "(sans objet)");
});

test("un moment illisible se dit, il ne s'invente pas", () => {
  assert.equal(leMomentDit(""), "date non lue");
  assert.equal(leMomentDit("pas une date"), "date non lue");
  assert.match(leMomentDit("2026-03-12T08:14:00Z"), /mars 2026/);
});

test("un message porte son en-tête et son corps tel quel", () => {
  const dit = unMessageEnMarkdown(lu());
  assert.match(dit, /^## RE: Étanchéité toiture/m);
  assert.match(dit, /\*\*De\*\* : Ourdine Ferrand <o\.ferrand@novaclim\.example>/);
  assert.match(dit, /\*\*À\*\* : Bureau VERIFAS <controle@verifas\.example>/);
  assert.match(dit, /Le DTU 43\.1 impose un relevé de 15 cm\./);
  // Rien sur la copie : ce qui vaut zéro ne s'écrit pas.
  assert.doesNotMatch(dit, /Copie/);
});

/**
 * **Le corps est recopié tel quel.** Ce qui est cité dans un mail est déjà
 * marqué par des chevrons ; les remplacer par des citations Markdown ferait
 * dire au rendu ce que l'expéditeur n'a pas écrit.
 */
test("le corps n'est pas reformaté", () => {
  const corps = "> Vous écriviez :\n> profondeur hors gel ?\n\n0,80 m.";
  assert.ok(unMessageEnMarkdown(lu({ corps })).includes(corps));
});

/** **Un message sans corps se dit.** Une page blanche ne se distingue pas d'une panne. */
test("un message sans texte lisible le dit", () => {
  assert.match(unMessageEnMarkdown(lu({ corps: "" })), /n'a pas de texte lisible/);
});

test("les pièces jointes sont nommées dans l'en-tête", () => {
  const dit = unMessageEnMarkdown(lu({ pieces: [{ nom: "PLAN-A3.pdf" }, { nom: "note.docx" }] }));
  assert.match(dit, /\*\*Pièces jointes\*\* : PLAN-A3\.pdf, note\.docx/);
});

/**
 * **Le message demandé est marqué.** Ouvrir une réponse au milieu d'un échange
 * de dix doit montrer laquelle on a cliquée, sinon on la cherche.
 */
test("le message qu'on a ouvert se distingue dans son fil", () => {
  const fil = leFilEnMarkdown(
    [lu({ identite: "<un@a.example>" }), lu({ identite: "<deux@a.example>" })],
    { marque: "<deux@a.example>" }
  );
  assert.equal((fil.match(/## ▸ /g) ?? []).length, 1);
});

test("un fil de plusieurs messages annonce son ampleur", () => {
  const fil = leFilEnMarkdown([lu(), lu({ identite: "<autre@a.example>" })]);
  assert.match(fil, /2 messages dans cet échange/);
  // Un seul message n'annonce rien : « 1 message dans cet échange » est du bruit.
  assert.doesNotMatch(leFilEnMarkdown([lu()]), /messages dans cet échange/);
});

test("un fil vide se dit plutôt que de rendre une page blanche", () => {
  assert.match(leFilEnMarkdown([]), /Rien à lire/);
  assert.match(leFilEnMarkdown(null), /Rien à lire/);
});

/**
 * **Quinze fois le même plan dans un fil de quinze réponses.** Les octets ne
 * sont pas en main ici : le nom et la taille sont ce qu'on a, et ce
 * rapprochement est faux une fois sur mille contre quinze fois sur quinze.
 */
test("les pièces d'un fil se dédoublonnent, et les vignettes ne comptent pas", () => {
  const pieces = lesPiecesDuFil([
    lu({ pieces: [{ nom: "PLAN.pdf", taille: 1000 }, { nom: "logo.png", taille: 12, dansLeTexte: true }] }),
    lu({ pieces: [{ nom: "PLAN.pdf", taille: 1000 }, { nom: "PLAN.pdf", taille: 2000 }] })
  ]);
  assert.deepEqual(pieces.map((une) => `${une.nom}|${une.taille}`), ["PLAN.pdf|1000", "PLAN.pdf|2000"]);
});

test("une pièce sans nom en reçoit un, et garde la date de son message", () => {
  const [piece] = lesPiecesDuFil([lu({ pieces: [{ taille: 10 }] })]);
  assert.equal(piece.nom, "sans nom");
  assert.equal(piece.quand, "2026-03-12T08:14:00Z");
});
