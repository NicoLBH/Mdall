import test from "node:test";
import assert from "node:assert/strict";

import {
  AU_PLUS_DE_CRANS, leFilALecran, leMomentCourt, objetADire, unMessageALecran
} from "./le-fil-a-lecran.js";

const X500 = "/O=EXCHANGELABS/OU=EXCHANGE ADMINISTRATIVE GROUP"
  + " (FYDIBOHF23SPDLT)/CN=RECIPIENTS/CN=2130423FA9EF43C6B5B78421F4C7D6A2-NICOLAS.LEB";

const unMessage = (des = {}) => ({
  identite: "<m1@exemple.example>",
  qui: { nom: "Ourdine Ferrand", adresse: "ourdine.ferrand@socotec.example" },
  a: [{ nom: "Nicolas Lebihan", adresse: "nicolas@novaclim.example" }],
  copie: [],
  quand: "2025-02-20T14:27:00.000Z",
  objet: "TR: Bon de commande",
  corps: "Bonjour,\n\nLe chantier démarre en mai.\n\nCordialement\n\nOurdine\nSOCOTEC",
  pieces: [],
  ...des
});

test("un échange vide se dit", () => {
  assert.match(leFilALecran([]), /Rien à lire dans cet échange/);
  assert.match(leFilALecran(null), /Rien à lire/);
});

test("le propos est montré, la signature repliée", () => {
  const dessine = unMessageALecran(unMessage());
  assert.match(dessine, /Le chantier démarre en mai/);
  assert.match(dessine, /<details/);
  assert.match(dessine, /Signature/);
  // Repliée, pas coupée : elle est dans la page, dans son bloc.
  assert.match(dessine, /SOCOTEC/);
  // Et le bloc n'est pas ouvert : c'est le propos qu'on veut voir en premier.
  assert.doesNotMatch(dessine, /<details class="fil-mail__repli fil-mail__repli--signature" open/);
});

test("une adresse d'annuaire ne s'affiche pas dans l'en-tête", () => {
  const dessine = unMessageALecran(unMessage({ qui: { nom: "Nicolas Lebihan", adresse: X500 } }));
  assert.match(dessine, /Nicolas Lebihan/);
  assert.doesNotMatch(dessine, /EXCHANGELABS/);
});

test("les adresses portent la classe qui les met en bleu", () => {
  const dessine = unMessageALecran(unMessage());
  assert.match(dessine, /fil-mail__adresse">ourdine\.ferrand@socotec\.example/);
});

/**
 * **Onze noms dont neuf sont des morceaux de logo.** C'est ce que l'écran
 * affichait, et les deux qu'on cherchait s'y noyaient.
 */
test("seules les pièces qui comptent sont nommées", () => {
  const dessine = unMessageALecran(unMessage({
    pieces: [
      { nom: "image001.png", taille: 1200, dansLeTexte: true },
      { nom: "image002.png", taille: 900, dansLeTexte: true },
      { nom: "bon de commande.pdf", taille: 221_000 }
    ]
  }));
  assert.match(dessine, /bon de commande\.pdf/);
  assert.doesNotMatch(dessine, /image001/);
  // Comptées et dites : les faire disparaître en silence ferait douter d'une
  // pièce perdue le jour où le compte ne tombe pas juste.
  assert.match(dessine, /2 images de mise en page/);
});

test("un message sans pièce n'a pas de rangée de pastilles", () => {
  assert.doesNotMatch(unMessageALecran(unMessage()), /fil-mail__pieces/);
});

test("un message sans corps se dit plutôt que de laisser une page blanche", () => {
  const dessine = unMessageALecran(unMessage({ corps: "" }));
  assert.match(dessine, /n'a pas de texte lisible/);
});

test("l'escalier pose un cran par message, et il est plafonné", () => {
  const barres = (html) => (html.match(/fil-mail__barre/g) ?? []).length;
  assert.equal(barres(unMessageALecran(unMessage(), { cran: 0 })), 0);
  assert.equal(barres(unMessageALecran(unMessage(), { cran: 3 })), 3);
  // Au-delà, un fil de vingt messages finirait au bord de l'écran.
  assert.equal(barres(unMessageALecran(unMessage(), { cran: 40 })), AU_PLUS_DE_CRANS);
});

test("le message demandé porte une marque, et lui seul", () => {
  const fil = leFilALecran(
    [unMessage({ identite: "<a@x.example>" }), unMessage({ identite: "<b@x.example>" })],
    { marque: "<b@x.example>" }
  );
  assert.equal((fil.match(/est-demande/g) ?? []).length, 1);
});

test("l'objet ne se répète pas, il se signale quand il change", () => {
  const premier = unMessage({ objet: "Bon de commande" });
  assert.equal(objetADire(unMessage({ objet: "RE: Bon de commande" }), premier), "");
  assert.equal(objetADire(unMessage({ objet: "TR: Bon de commande" }), premier), "");
  assert.equal(
    objetADire(unMessage({ objet: "RE: Planning du lot 3" }), premier),
    "RE: Planning du lot 3"
  );
  // Le premier message n'a rien à quoi se comparer : le fil d'Ariane porte
  // déjà l'objet de l'échange.
  assert.equal(objetADire(premier, null), "");
});

test("une date illisible ne devient pas celle du jour", () => {
  assert.equal(leMomentCourt("pas une date"), "date non lue");
  assert.equal(leMomentCourt(null), "date non lue");
  assert.match(leMomentCourt("2025-02-20T14:27:00.000Z"), /20 févr\. 2025/);
});

test("un échange de plusieurs messages dit combien et dans quel ordre", () => {
  const fil = leFilALecran([unMessage(), unMessage(), unMessage()]);
  assert.match(fil, /3 messages dans cet échange, du plus ancien au plus récent/);
});

test("un seul message ne dit pas qu'il est un échange", () => {
  assert.doesNotMatch(leFilALecran([unMessage()]), /messages dans cet échange/);
});

test("ce qui vient du message est échappé", () => {
  // Un objet ou un nom porte ce que l'expéditeur a écrit, et un mail est du
  // contenu venu de l'extérieur.
  const dessine = unMessageALecran(unMessage({
    qui: { nom: "<script>alert(1)</script>", adresse: "x@y.example" },
    corps: "<img src=x onerror=alert(1)>"
  }));
  assert.doesNotMatch(dessine, /<script>/);
  assert.doesNotMatch(dessine, /<img src=x/);
  assert.match(dessine, /&lt;script&gt;/);
});
