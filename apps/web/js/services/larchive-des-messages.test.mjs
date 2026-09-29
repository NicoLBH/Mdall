import test from "node:test";
import assert from "node:assert/strict";

import {
  AU_PLUS, avecLeursPieces, ceQuiResteAVerserDesMessages, cheminDuMessage,
  lesMessagesArchives, liensDesPieces, ligneDunMessage, phraseDuVersementDesMessages,
  unMessageArchive
} from "./larchive-des-messages.js";

const EMPREINTE = "a".repeat(64);
const AUTRE = "b".repeat(64);
const PLAN = "c".repeat(64);
const LOGO = "d".repeat(64);

const unMessage = (quoi = {}) => ({
  identite: "<m-1200@novaclim.example.com>",
  qui: { nom: "Ourdine Ferrand", adresse: "o.ferrand@novaclim.example.com" },
  quand: "2026-05-12T07:41:00.000Z",
  objet: "Montholon : désenfumage du hall",
  corps: "Bonjour,\nle plan du R+1 est en pièce jointe.\n",
  enReponseA: "<m-1100@verifas.example.org>",
  chaine: ["<m-1000@bertrand.example.fr>", "<m-1100@verifas.example.org>"],
  a: [{ adresse: "controle@verifas.example.org" }, { adresse: "atelier@bertrand.example.fr" }],
  copie: [{ adresse: "secretariat@novaclim.example.com" }],
  trous: [],
  ...quoi
});

test("le chemin du fichier d'origine est son empreinte, et rien d'autre", () => {
  assert.equal(cheminDuMessage(EMPREINTE), `messages/${EMPREINTE}`);
  assert.equal(cheminDuMessage("A".repeat(64)), `messages/${EMPREINTE}`);
  assert.equal(cheminDuMessage("pas-une-empreinte"), "");
  assert.equal(cheminDuMessage(""), "");
  assert.equal(cheminDuMessage("../../etc/passwd"), "");
});

/**
 * **Les messages ne se rangent pas où les pièces se rangent.** Deux dossiers,
 * parce qu'un fichier `.msg` et un plan qu'il portait ne sont pas la même
 * chose, et qu'on veut pouvoir lister l'un sans l'autre.
 */
test("les messages et les pièces n'habitent pas le même dossier", () => {
  assert.match(cheminDuMessage(EMPREINTE), /^messages\//);
  assert.equal(cheminDuMessage(EMPREINTE).startsWith("pieces/"), false);
});

test("la ligne d'un message porte ce qui se lit, et pas qui l'a versé", () => {
  const ligne = ligneDunMessage(unMessage(),
    { empreinte: EMPREINTE, octets: AUTRE, fichier: "reunion-04.msg" });

  assert.equal(ligne.empreinte, EMPREINTE);
  assert.equal(ligne.octets, AUTRE);
  assert.equal(ligne.fichier, "reunion-04.msg");
  assert.equal(ligne.identite, "<m-1200@novaclim.example.com>");
  assert.equal(ligne.objet, "Montholon : désenfumage du hall");
  assert.equal(ligne.qui_adresse, "o.ferrand@novaclim.example.com");
  assert.equal(ligne.quand, "2026-05-12T07:41:00.000Z");
  assert.equal(ligne.corps, "Bonjour,\nle plan du R+1 est en pièce jointe.");
  assert.equal(ligne.en_reponse_a, "<m-1100@verifas.example.org>");
  assert.deepEqual(ligne.chaine, [
    "<m-1000@bertrand.example.fr>", "<m-1100@verifas.example.org>"
  ]);
  assert.equal("versee_par" in ligne, false);
});

/**
 * **Le nombre, pas les adresses.** Rien, aujourd'hui, ne sait se servir des
 * destinataires : le contexte raisonne sur des rôles, l'épisode sur des dates.
 * Une colonne qu'aucun code ne lit finit par fuir sans avoir jamais servi — et
 * le fichier d'origine, lui, les porte toujours.
 */
test("la ligne d'un message compte ses destinataires et ne les nomme pas", () => {
  const ligne = ligneDunMessage(unMessage(), { empreinte: EMPREINTE });
  assert.equal(ligne.combien_de_destinataires, 3);
  assert.equal(JSON.stringify(ligne).includes("controle@verifas.example.org"), false);
  assert.equal(JSON.stringify(ligne).includes("secretariat@novaclim.example.com"), false);
});

/**
 * **On n'invente pas une date.** `null` place le message hors de la suite, ce
 * qui est exact ; une date choisie l'y placerait à un moment qu'il n'a pas eu.
 */
test("un message sans date lisible n'en reçoit pas une", () => {
  assert.equal(ligneDunMessage(unMessage({ quand: "" }), { empreinte: EMPREINTE }).quand, null);
  assert.equal(ligneDunMessage(unMessage({ quand: "hier matin" }), { empreinte: EMPREINTE }).quand, null);
});

/**
 * **Les noms des trous, pas leurs phrases.** La phrase vit dans
 * `trous-dun-mail.js` ; la recopier ici la ferait diverger (règle 10).
 */
test("la ligne d'un message garde ce que la lecture n'a pas su placer", () => {
  const ligne = ligneDunMessage(unMessage({
    trous: [{ quoi: "cheminement-reconstitue", ou: "le message" }, { quoi: "piece-sans-nom" },
      { quoi: "piece-sans-nom" }]
  }), { empreinte: EMPREINTE });

  assert.deepEqual(ligne.trous, ["cheminement-reconstitue", "piece-sans-nom"]);
  assert.equal(JSON.stringify(ligne.trous).includes("ce message Outlook"), false);
});

/* ── Les liens ───────────────────────────────────────────────────────────── */

/**
 * **Ce que le message déclarait d'une pièce appartient au message.** La même
 * image est une signature ici et un document ailleurs : cela s'écrit sur le
 * lien, jamais sur la pièce.
 */
test("un lien porte le nom et le rôle que ce message-là donnait à la pièce", () => {
  const [lien] = liensDesPieces(EMPREINTE, [
    { empreinte: PLAN, nom: "plan-r+1-indice-C.pdf", dansLeTexte: false }
  ]);
  assert.deepEqual(lien, {
    message: EMPREINTE, piece: PLAN, nom: "plan-r+1-indice-C.pdf", dans_le_texte: false
  });
});

test("une pièce sans empreinte n'a pas de lien", () => {
  assert.deepEqual(liensDesPieces(EMPREINTE, [{ empreinte: "", nom: "perdue.pdf" }]), []);
  assert.deepEqual(liensDesPieces("", [{ empreinte: PLAN }]), []);
  assert.deepEqual(liensDesPieces(EMPREINTE, null), []);
});

/**
 * La clé primaire refuserait tout le lot : un doublon dans un seul message
 * ferait perdre ses autres liens.
 */
test("la même pièce deux fois dans un message ne fait qu'un lien", () => {
  const liens = liensDesPieces(EMPREINTE, [
    { empreinte: PLAN, nom: "plan.pdf" },
    { empreinte: PLAN, nom: "plan-copie.pdf" },
    { empreinte: LOGO, nom: "logo.png", dansLeTexte: true }
  ]);
  assert.deepEqual(liens.map((un) => un.piece), [PLAN, LOGO]);
  assert.equal(liens[0].nom, "plan.pdf");
  assert.equal(liens[1].dans_le_texte, true);
});

/* ── Ce qui reste à verser ───────────────────────────────────────────────── */

test("un message déjà dans l'archive ne remonte pas", () => {
  const reste = ceQuiResteAVerserDesMessages(
    [{ empreinte: EMPREINTE }, { empreinte: AUTRE }], [EMPREINTE]);
  assert.deepEqual(reste.aVerser.map((un) => un.empreinte), [AUTRE]);
  assert.equal(reste.dejaLa, 1);
});

test("le même message déposé deux fois ne monte qu'une fois", () => {
  const reste = ceQuiResteAVerserDesMessages(
    [{ empreinte: EMPREINTE }, { empreinte: EMPREINTE }], []);
  assert.equal(reste.aVerser.length, 1);
  assert.equal(reste.dejaLa, 1);
});

test("un message sans identité ne se verse pas, et se compte", () => {
  const reste = ceQuiResteAVerserDesMessages([{ empreinte: "" }, { empreinte: EMPREINTE }], []);
  assert.deepEqual(reste.aVerser.map((un) => un.empreinte), [EMPREINTE]);
  assert.equal(reste.sansEmpreinte, 1);
});

test("chaque message à verser garde ce qu'il portait", () => {
  const [un] = ceQuiResteAVerserDesMessages(
    [{ empreinte: EMPREINTE, fichier: "a.msg", pieces: [{ empreinte: PLAN }] }], []).aVerser;
  assert.equal(un.fichier, "a.msg");
  assert.deepEqual(un.pieces, [{ empreinte: PLAN }]);
});

/* ── La lecture ──────────────────────────────────────────────────────────── */

const ligne = (empreinte, quand, quoi = {}) =>
  ({ empreinte, quand, objet: `objet ${empreinte[0]}`, ...quoi });

test("les messages se lisent du plus récent au plus ancien", () => {
  const { messages } = lesMessagesArchives([
    ligne(EMPREINTE, "2026-05-12T07:41:00.000Z"),
    ligne(AUTRE, "2026-06-01T09:00:00.000Z")
  ]);
  assert.deepEqual(messages.map((un) => un.empreinte), [AUTRE, EMPREINTE]);
});

/**
 * **Ce qui n'a pas de date se range après ce qui en a.** Le glisser au milieu
 * lui inventerait un moment ; le cacher perdrait un message (règle 5).
 */
test("un message sans date se range après, et ne disparaît pas", () => {
  const { messages } = lesMessagesArchives([
    ligne(PLAN, null),
    ligne(EMPREINTE, "2026-05-12T07:41:00.000Z"),
    ligne(AUTRE, "2026-06-01T09:00:00.000Z")
  ]);
  assert.deepEqual(messages.map((un) => un.empreinte), [AUTRE, EMPREINTE, PLAN]);
});

/**
 * **Et une date ancienne reste une date.**
 *
 * Le rangement se faisait par une soustraction, où `null` se transformait en
 * zéro : tout ce qui date d'après 1970 se rangeait correctement, **par
 * accident**. Un message de 1969 — une horloge déréglée, un export abîmé —
 * serait passé derrière ce qui n'a pas de date du tout.
 */
test("un message antérieur à 1970 se range avant ce qui n'a pas de date", () => {
  const { messages } = lesMessagesArchives([
    ligne(PLAN, null),
    ligne(EMPREINTE, "1969-07-20T20:17:00.000Z"),
    ligne(AUTRE, "2026-06-01T09:00:00.000Z")
  ]);
  assert.deepEqual(messages.map((un) => un.empreinte), [AUTRE, EMPREINTE, PLAN]);
});

test("une ligne sans empreinte n'entre pas dans l'archive", () => {
  assert.deepEqual(lesMessagesArchives([{ objet: "orpheline" }]).messages, []);
  assert.deepEqual(lesMessagesArchives(null).messages, []);
});

test("le plafond des messages vaut deux cents", () => {
  assert.equal(AU_PLUS, 200);
});

test("une archive plus longue que ce qu'on montre le dit", () => {
  const beaucoup = Array.from({ length: 6 },
    (un, rang) => ligne(String(rang).padStart(64, "0"), `2026-06-0${rang + 1}T09:00:00.000Z`));
  const lu = lesMessagesArchives(beaucoup, 4);
  assert.equal(lu.messages.length, 4);
  assert.equal(lu.reste, true);
  assert.equal(lesMessagesArchives(beaucoup.slice(0, 4), 4).reste, false);
});

test("un message lu porte ses comptes, pas son propos entier", () => {
  const un = unMessageArchive({
    empreinte: EMPREINTE, objet: "Montholon", qui_adresse: "o.ferrand@novaclim.example.com",
    combien_de_destinataires: 3, corps: "douze signes", trous: ["piece-sans-nom"]
  });
  assert.equal(un.qui, "o.ferrand@novaclim.example.com");
  assert.equal(un.combienDeDestinataires, 3);
  assert.equal(un.signesDuCorps, 12);
  assert.deepEqual(un.trous, ["piece-sans-nom"]);
  assert.deepEqual(un.pieces, []);
});

/* ── Le rattachement ─────────────────────────────────────────────────────── */

const messagesLus = () => lesMessagesArchives([
  ligne(EMPREINTE, "2026-05-12T07:41:00.000Z"),
  ligne(AUTRE, "2026-06-01T09:00:00.000Z")
]).messages;

test("chaque message reçoit les pièces que ses liens lui donnent", () => {
  const avec = avecLeursPieces(
    messagesLus(),
    [{ message: EMPREINTE, piece: PLAN, nom: "plan.pdf" },
      { message: AUTRE, piece: LOGO, nom: "logo.png" }],
    [{ empreinte: PLAN, nom: "autre-nom.pdf", taille: 5000 },
      { empreinte: LOGO, nom: "logo.png", taille: 300 }]
  );

  const un = avec.find((celui) => celui.empreinte === EMPREINTE);
  assert.deepEqual(un.pieces.map((une) => une.empreinte), [PLAN]);
  assert.equal(un.pieces[0].taille, 5000);
});

/**
 * **Le nom vient du lien, pas du registre.** Le même fichier voyage sous trois
 * noms selon qui le renvoie, et c'est parfois le nom qui date la révision d'un
 * plan.
 */
test("le nom d'une pièce est celui que ce message-là lui donnait", () => {
  const [un] = avecLeursPieces(
    [{ empreinte: EMPREINTE, pieces: [] }],
    [{ message: EMPREINTE, piece: PLAN, nom: "plan-r+1-indice-C.pdf" }],
    [{ empreinte: PLAN, nom: "document1.pdf" }]
  );
  assert.equal(un.pieces[0].nom, "plan-r+1-indice-C.pdf");
});

/**
 * **Le rôle vient du lien, comme le nom.** La même image est une signature ici
 * et un document ailleurs : sans cela, l'écran de l'archive listerait huit
 * logos un par un — ce qu'il a fait jusqu'à ce qu'on le regarde.
 */
test("ce que ce message-là déclarait de la pièce arrive jusqu'à l'écran", () => {
  const [un] = avecLeursPieces(
    [{ empreinte: EMPREINTE, pieces: [] }],
    [{ message: EMPREINTE, piece: PLAN, dans_le_texte: true },
      { message: EMPREINTE, piece: LOGO, dans_le_texte: false }],
    [{ empreinte: PLAN }, { empreinte: LOGO }]
  );
  assert.deepEqual(un.pieces.map((une) => une.dansLeTexte), [true, false]);
});

test("un lien sans nom laisse celui du registre", () => {
  const [un] = avecLeursPieces(
    [{ empreinte: EMPREINTE, pieces: [] }],
    [{ message: EMPREINTE, piece: PLAN, nom: "" }],
    [{ empreinte: PLAN, nom: "document1.pdf" }]
  );
  assert.equal(un.pieces[0].nom, "document1.pdf");
});

/**
 * Un lien en avance sur son registre ne dessine rien : il n'y a rien à ouvrir,
 * et une ligne vide se lirait comme une pièce perdue.
 */
test("un lien vers une pièce inconnue ne dessine rien", () => {
  const [un] = avecLeursPieces(
    [{ empreinte: EMPREINTE, pieces: [] }],
    [{ message: EMPREINTE, piece: PLAN }],
    []
  );
  assert.deepEqual(un.pieces, []);
});

test("un message sans lien garde une liste vide, il ne disparaît pas", () => {
  const avec = avecLeursPieces(messagesLus(), [], []);
  assert.equal(avec.length, 2);
  assert.deepEqual(avec[0].pieces, []);
});

test("le versement des messages dit ce qu'il a fait", () => {
  assert.equal(phraseDuVersementDesMessages({ verses: 3, dejaLa: 12, refuses: 1 }),
    "3 messages versés · 12 étaient déjà là · 1 n'a pas pu être versé");
  assert.equal(phraseDuVersementDesMessages({ verses: 1 }), "1 message versé");
  assert.equal(phraseDuVersementDesMessages({ verses: 0, dejaLa: 0 }), "");
  assert.equal(phraseDuVersementDesMessages(null), "");
});
