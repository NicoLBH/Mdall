import test from "node:test";
import assert from "node:assert/strict";

import {
  ceQuiSeRepete, empreinteDunMessage, lesEmpreintes, marquerLesRepetitions
} from "./le-dedoublonnage.js";

const unMessage = (quoi = {}) => ({
  identite: "<m-1200@novaclim.example.com>",
  qui: { nom: "Ourdine Ferrand", adresse: "o.ferrand@novaclim.example.com" },
  quand: "2026-05-12T07:41:00.000Z",
  objet: "Montholon : désenfumage du hall",
  corps: "Bonjour,\nle plan du R+1 est en pièce jointe.\n",
  pieces: [],
  ...quoi
});

/**
 * **Le `Message-ID` est une identité que le message porte.** En calculer une
 * autre alors qu'elle est là reviendrait à en avoir deux, et elles finiraient
 * par ne plus désigner le même message (règle 10).
 */
test("l'identité d'un message est son Message-ID quand il en a un", () => {
  assert.equal(empreinteDunMessage(unMessage()), "<m-1200@novaclim.example.com>");

  // Et elle ne dépend alors de rien d'autre : le même message transféré, dont
  // l'objet a gagné un « TR: », reste le même message.
  assert.equal(
    empreinteDunMessage(unMessage({ objet: "TR: Montholon", corps: "autre chose" })),
    "<m-1200@novaclim.example.com>"
  );
});

test("sans Message-ID, l'identité se calcule sur quatre choses", () => {
  const nu = unMessage({ identite: "" });
  const calculee = empreinteDunMessage(nu);

  assert.notEqual(calculee, "");
  assert.equal(calculee, empreinteDunMessage(unMessage({ identite: "" })));

  // Chacune des quatre compte : deux personnes écrivent « OK » la même minute,
  // et le même objet couvre tout un fil.
  for (const [quoi, valeur] of [
    ["qui", { adresse: "autre@novaclim.example.com" }],
    ["quand", "2026-05-13T07:41:00.000Z"],
    ["objet", "Montholon : autre chose"],
    ["corps", "Bonjour,\nle plan du R+2 est en pièce jointe.\n"]
  ]) {
    assert.notEqual(empreinteDunMessage(unMessage({ identite: "", [quoi]: valeur })),
      calculee, quoi);
  }
});

/**
 * **La mise en page d'une citation varie, pas son propos.** Le même message
 * recopié avec d'autres espaces et d'autres majuscules reste le même.
 */
test("le propos se compare sur ce qui le distingue, pas sur sa mise en page", () => {
  const nu = unMessage({ identite: "" });
  const recopie = unMessage({
    identite: "",
    corps: "  BONJOUR,\r\n\r\n   LE PLAN DU R+1 EST EN PIÈCE JOINTE.   "
  });
  assert.equal(empreinteDunMessage(recopie), empreinteDunMessage(nu));
});

test("un message dont rien ne se lit n'a pas d'identité", () => {
  assert.equal(empreinteDunMessage({}), "");
  assert.equal(empreinteDunMessage(null), "");
  assert.equal(empreinteDunMessage({ identite: "", qui: {}, quand: "", objet: "", corps: "" }), "");
});

/**
 * **Ses octets, et rien d'autre.** Le nom ne vaut rien — « Plan.pdf » désigne
 * quinze plans sur un chantier —, la taille non plus : deux révisions d'un même
 * plan pèsent souvent le même nombre d'octets.
 */
test("l'identité d'une pièce jointe est celle de ses octets", async () => {
  const octets = Uint8Array.from({ length: 300 }, (un, rang) => (rang * 7) % 256);
  const autres = Uint8Array.from({ length: 300 }, (un, rang) => (rang * 7 + 1) % 256);

  const un = await lesEmpreintes(unMessage({
    pieces: [{ nom: "plan.pdf", octets }, { nom: "tout-autre-nom.pdf", octets }]
  }));
  // Deux noms, les mêmes octets : la même pièce.
  assert.equal(un.pieces[0], un.pieces[1]);

  const deux = await lesEmpreintes(unMessage({
    pieces: [{ nom: "plan.pdf", octets }, { nom: "plan.pdf", octets: autres }]
  }));
  // Le même nom, la même taille, d'autres octets : deux pièces.
  assert.notEqual(deux.pieces[0], deux.pieces[1]);
});

test("les empreintes suivent l'ordre des pièces, et le message garde la sienne", async () => {
  const lues = await lesEmpreintes(unMessage({
    pieces: [{ octets: Uint8Array.from([1, 2, 3]) }, { octets: Uint8Array.from([4, 5, 6]) }]
  }));
  assert.equal(lues.message, "<m-1200@novaclim.example.com>");
  assert.equal(lues.pieces.length, 2);
  assert.notEqual(lues.pieces[0], lues.pieces[1]);
});

/* ── Le comptage ─────────────────────────────────────────────────────────── */

const inventaire = (empreinte, documents = [], vignettes = []) =>
  ({ empreinte, documents, vignettes });

const piece = (empreinte, taille) => ({ empreinte, taille });

test("le premier exemplaire se garde, les suivants se comptent comme répétés", () => {
  const compte = ceQuiSeRepete([
    inventaire("<a@x>"), inventaire("<b@x>"), inventaire("<a@x>"), inventaire("<a@x>")
  ]);
  assert.equal(compte.messages.tous, 4);
  assert.equal(compte.messages.distincts, 2);
  assert.equal(compte.messages.repetes, 2);
});

test("le poids évité est celui des répétitions, jamais celui du premier", () => {
  const compte = ceQuiSeRepete([
    inventaire("<a@x>", [piece("abc", 5000)]),
    inventaire("<b@x>", [piece("abc", 5000), piece("def", 700)]),
    inventaire("<c@x>", [piece("abc", 5000)])
  ]);
  assert.equal(compte.documents.tous, 4);
  assert.equal(compte.documents.distincts, 2);
  assert.equal(compte.documents.repetes, 2);
  assert.equal(compte.documents.poidsEvite, 10000);
});

test("les documents et les images de signature se comptent séparément", () => {
  const compte = ceQuiSeRepete([
    inventaire("<a@x>", [piece("abc", 5000)], [piece("logo", 300)]),
    inventaire("<b@x>", [piece("abc", 5000)], [piece("logo", 300)])
  ]);
  assert.equal(compte.documents.repetes, 1);
  assert.equal(compte.documents.poidsEvite, 5000);
  assert.equal(compte.vignettes.repetes, 1);
  assert.equal(compte.vignettes.poidsEvite, 300);
});

/**
 * **Ne pas savoir n'est pas savoir que non.** Une pièce dont l'empreinte n'a
 * pas pu se calculer n'est rapprochée de rien — ni pour dire qu'elle se
 * répète, ni pour dire qu'elle est unique. Elle se compte à part (règle 5).
 */
test("une pièce sans empreinte n'est jamais rapprochée d'une autre", () => {
  const compte = ceQuiSeRepete([
    inventaire("<a@x>", [piece("", 5000), piece("", 5000)])
  ]);
  assert.equal(compte.documents.tous, 2);
  assert.equal(compte.documents.repetes, 0);
  assert.equal(compte.documents.sansEmpreinte, 2);
  assert.equal(compte.documents.poidsEvite, 0);
  // Elles comptent chacune pour une : ne pas savoir ne les fait pas fusionner.
  assert.equal(compte.documents.distincts, 2);
});

test("un message sans identité ne se confond pas avec un autre", () => {
  const compte = ceQuiSeRepete([inventaire(""), inventaire(""), inventaire("<a@x>")]);
  assert.equal(compte.messages.distincts, 3);
  assert.equal(compte.messages.repetes, 0);
  assert.equal(compte.messages.sansEmpreinte, 2);
});

test("rien de déposé ne se répète", () => {
  const compte = ceQuiSeRepete([]);
  assert.equal(compte.messages.tous, 0);
  assert.equal(compte.documents.repetes, 0);
  assert.equal(ceQuiSeRepete(null).messages.tous, 0);
});

/* ── Le marquage, dont le compte est tiré ────────────────────────────────── */

/**
 * **L'écran et le compte décident au même endroit.** Dire « 1 message déjà vu »
 * en haut et dessiner deux fois le même message en dessous ferait lire deux
 * plans là où il y en a un (règle 4).
 */
test("chaque message sait s'il a déjà été vu, et le compte en découle", () => {
  const lus = [inventaire("<a@x>"), inventaire("<b@x>"), inventaire("<a@x>")];
  const marques = marquerLesRepetitions(lus);

  assert.deepEqual(marques.map((un) => un.dejaVu), [false, false, true]);
  // Le premier exemplaire est celui qu'on garde : c'est le plus ancien dépôt.
  assert.equal(ceQuiSeRepete(lus).messages.repetes,
    marques.filter((un) => un.dejaVu).length);
});

test("le marquage garde ce que l'inventaire portait", () => {
  const marque = marquerLesRepetitions([inventaire("<a@x>", [piece("abc", 5000)])])[0];
  assert.equal(marque.empreinte, "<a@x>");
  assert.deepEqual(marque.documents, [piece("abc", 5000)]);
});

test("sans empreinte, jamais « déjà vu »", () => {
  assert.deepEqual(
    marquerLesRepetitions([inventaire(""), inventaire("")]).map((un) => un.dejaVu),
    [false, false]
  );
});

test("rien à marquer ne marque rien", () => {
  assert.deepEqual(marquerLesRepetitions([]), []);
  assert.deepEqual(marquerLesRepetitions(null), []);
});
