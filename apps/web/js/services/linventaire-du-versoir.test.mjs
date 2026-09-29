import test from "node:test";
import assert from "node:assert/strict";

import {
  PIECE, inventaireDunMessage, inventaireDuVersoir, phraseDuVersoir, poidsDit
} from "./linventaire-du-versoir.js";

const piece = (nom, taille, dansLeTexte, type = "application/pdf") =>
  ({ nom, taille, dansLeTexte, type });

const unMessage = (quoi = {}) => ({
  objet: "Montholon : désenfumage du hall",
  qui: { nom: "Ourdine Ferrand", adresse: "o.ferrand@novaclim.example.com" },
  quand: "2026-05-12T07:41:00.000Z",
  a: [{ adresse: "controle@verifas.example.org" }, { adresse: "atelier@bertrand.example.fr" }],
  copie: [{ adresse: "secretariat@novaclim.example.com" }],
  corps: "Bonjour,\nle plan du R+1 est en pièce jointe.\n",
  pieces: [],
  trous: [],
  ...quoi
});

test("un message déposé se compte sans que ses destinataires se listent", () => {
  const un = inventaireDunMessage(unMessage(), "reunion-04.msg");
  assert.equal(un.fichier, "reunion-04.msg");
  assert.equal(un.objet, "Montholon : désenfumage du hall");
  assert.equal(un.qui, "o.ferrand@novaclim.example.com");
  assert.equal(un.combienDeDestinataires, 3);
  assert.equal(un.signesDuCorps, 44);
  // L'inventaire répond à « qu'est-ce qu'il y a », pas à « qui est dedans » :
  // aucune adresse de destinataire n'en ressort.
  assert.equal(JSON.stringify(un).includes("controle@verifas.example.org"), false);
});

/**
 * **Ce qui sépare un plan d'un logo de signature est structurel.** Une image
 * collée dans le texte porte un identifiant de contenu ; un document n'en a
 * pas. Le nom et la taille ne décident de rien : un « plan.png » reste un
 * document, et une vignette de deux mégaoctets reste une vignette.
 */
test("un document et une image de signature se distinguent par leur place, pas par leur nom", () => {
  const un = inventaireDunMessage(unMessage({
    pieces: [
      piece("plan.png", 2000, false, "image/png"),
      piece("logo.png", 2000000, true, "image/png")
    ]
  }));

  assert.deepEqual(un.documents.map((une) => une.nom), ["plan.png"]);
  assert.deepEqual(un.vignettes.map((une) => une.nom), ["logo.png"]);
  assert.equal(un.documents[0].quoi, PIECE.DOCUMENT);
  assert.equal(un.vignettes[0].quoi, PIECE.VIGNETTE);
  assert.equal(un.poidsDesDocuments, 2000);
  assert.equal(un.poidsDesVignettes, 2000000);
});

test("un message dont rien ne se lit se compte et garde son nom de fichier", () => {
  const un = inventaireDunMessage({ trous: [{ quoi: "pas-un-msg" }] }, "abime.msg");
  assert.equal(un.illisible, true);
  assert.equal(un.fichier, "abime.msg");
  assert.equal(un.trous.length, 1);
});

test("un message qui n'a qu'un objet se lit quand même", () => {
  assert.equal(inventaireDunMessage({ objet: "Sans corps" }, "x.msg").illisible, false);
});

test("l'inventaire additionne les poids et compte les illisibles", () => {
  const lus = [
    inventaireDunMessage(unMessage({ pieces: [piece("plan-a.pdf", 5000, false)] }), "a.msg"),
    inventaireDunMessage(unMessage({
      quand: "2026-06-01T09:00:00.000Z",
      pieces: [piece("plan-b.pdf", 7000, false), piece("logo.png", 300, true)]
    }), "b.msg"),
    inventaireDunMessage({}, "c.msg")
  ];

  const tout = inventaireDuVersoir(lus);
  assert.equal(tout.messages, 3);
  assert.equal(tout.illisibles, 1);
  assert.equal(tout.documents, 2);
  assert.equal(tout.vignettes, 1);
  assert.equal(tout.poidsDesDocuments, 12000);
  assert.equal(tout.poidsDesVignettes, 300);
  assert.equal(tout.depuis, "2026-05-12T07:41:00.000Z");
  assert.equal(tout.jusqua, "2026-06-01T09:00:00.000Z");
});

/**
 * **Ce qu'on ne sait pas dater se compte à part.** Une période qui n'engloberait
 * que les messages datés se lirait comme la période de l'archive, et elle ne
 * l'est pas (règle 5).
 */
test("un message sans date ne rétrécit pas la période en silence", () => {
  const tout = inventaireDuVersoir([
    inventaireDunMessage(unMessage(), "a.msg"),
    inventaireDunMessage(unMessage({ quand: "" }), "b.msg")
  ]);
  assert.equal(tout.sansDate, 1);
  assert.equal(tout.depuis, "2026-05-12T07:41:00.000Z");
  assert.equal(tout.jusqua, "2026-05-12T07:41:00.000Z");
});

test("une date illisible n'est pas une date", () => {
  const tout = inventaireDuVersoir([inventaireDunMessage(unMessage({ quand: "hier matin" }), "a.msg")]);
  assert.equal(tout.sansDate, 1);
  assert.equal(tout.depuis, "");
});

test("un versoir vide ne dit rien", () => {
  assert.equal(phraseDuVersoir(inventaireDuVersoir([])), "");
  assert.equal(phraseDuVersoir(null), "");
});

test("la phrase dit les messages, les documents, les images écartées et les manques", () => {
  const dite = phraseDuVersoir(inventaireDuVersoir([
    inventaireDunMessage(unMessage({
      pieces: [piece("plan-a.pdf", 5000, false), piece("logo.png", 300, true)]
    }), "a.msg"),
    inventaireDunMessage({}, "b.msg")
  ]));

  assert.match(dite, /2 messages/);
  assert.match(dite, /1 document \(5,0 ko\)/);
  // « Écartée » serait faux : rien n'est jeté, et la ligne dit seulement que
  // ce poids n'est pas celui des documents.
  assert.match(dite, /1 image de signature \(300 o\)/);
  assert.doesNotMatch(dite, /écart/);
  assert.match(dite, /1 ne se lit pas/);
});

test("ce qui vaut zéro ne s'écrit pas", () => {
  const dite = phraseDuVersoir(inventaireDuVersoir([inventaireDunMessage(unMessage(), "a.msg")]));
  assert.equal(dite, "1 message");
  assert.equal(/document/.test(dite), false);
  assert.equal(/image/.test(dite), false);
});

/**
 * **En base mille, comme l'explorateur de Windows.** Celui qui dépose ses
 * archives compare avec ce qu'il voit chez lui : un écart de sept pour cent
 * sans explication ferait douter du reste.
 */
test("un poids s'écrit comme on le lit", () => {
  assert.equal(poidsDit(0), "0 o");
  assert.equal(poidsDit(999), "999 o");
  assert.equal(poidsDit(1000), "1,0 ko");
  assert.equal(poidsDit(1024), "1,0 ko");
  assert.equal(poidsDit(45500), "46 ko");
  assert.equal(poidsDit(1035588), "1,0 Mo");
  assert.equal(poidsDit(24000000), "24 Mo");
  assert.equal(poidsDit(-1), "");
  assert.equal(poidsDit("plein"), "");
});
