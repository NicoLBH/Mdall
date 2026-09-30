import test from "node:test";
import assert from "node:assert/strict";

import {
  cestUnMailIndexe, laLigneDunMail, leFilRange, lindexDunMail, phraseDuFilRange,
  quandDit, quiEcrit
} from "./la-ligne-dun-mail.js";

// Aucun mail réel : les noms, les sociétés et les domaines sont inventés.
const lu = (dessus = {}) => ({
  qui: { nom: "Ourdine Ferrand", adresse: "o.ferrand@novaclim.example" },
  objet: "RE: Étanchéité toiture — Montholon",
  quand: "2026-03-12T08:14:00Z",
  pieces: [],
  ...dessus
});

test("qui écrit se lit par son nom, avec son adresse pour lever le doute", () => {
  assert.equal(quiEcrit({ nom: "Ourdine Ferrand", adresse: "o.ferrand@novaclim.example" }),
    "Ourdine Ferrand (o.ferrand@novaclim.example)");
  assert.equal(quiEcrit({ adresse: "controle@verifas.example" }), "controle@verifas.example");
  assert.equal(quiEcrit({ nom: "Bureau VERIFAS" }), "Bureau VERIFAS");
});

/** Une messagerie qui met l'adresse en nom d'affichage ne la dit pas deux fois. */
test("un nom qui n'est que l'adresse ne se répète pas", () => {
  assert.equal(quiEcrit({ nom: "a@b.example", adresse: "a@b.example" }), "a@b.example");
  assert.equal(quiEcrit({ nom: "A@B.EXAMPLE", adresse: "a@b.example" }), "A@B.EXAMPLE");
});

test("sans expéditeur lisible, rien ne s'invente", () => {
  assert.equal(quiEcrit(null), "");
  assert.equal(quiEcrit({}), "");
});

/**
 * **`0` et « ce n'est pas un mail » ne se disent pas pareil.** Le premier est un
 * compte, le second une absence de question posée (règle 5) — et c'est ce qui
 * décide si la ligne se dessine comme un mail ou comme un fichier.
 */
test("l'index compte les pièces, et zéro est une réponse", () => {
  assert.equal(lindexDunMail(lu({ pieces: [] })).mail_pieces, 0);
  assert.equal(lindexDunMail(lu({ pieces: [{ nom: "a.pdf" }, { nom: "b.pdf" }] })).mail_pieces, 2);
});

test("le fil est l'objet débarrassé de ses RE: et TR:", () => {
  assert.equal(lindexDunMail(lu()).mail_fil, "Étanchéité toiture — Montholon");
  assert.equal(lindexDunMail(lu({ objet: "TR: RE: Fondations" })).mail_fil, "Fondations");
});

/**
 * **Sans objet, pas de fil.** Mettre tous les messages sans objet dans le même
 * échange les mélangerait — et ils n'ont aucun rapport entre eux.
 */
test("un message sans objet n'appartient à aucun fil", () => {
  assert.equal(lindexDunMail(lu({ objet: "" })).mail_fil, null);
  assert.equal(lindexDunMail(lu({ objet: "   " })).mail_fil, null);
});

test("une date illisible ne se voit pas attribuer celle du jour", () => {
  assert.equal(lindexDunMail(lu({ quand: "" })).mail_quand, null);
});

test("un document ordinaire n'est pas un mail indexé", () => {
  assert.equal(cestUnMailIndexe({ mailPieces: 0 }), true);
  assert.equal(cestUnMailIndexe({ mailPieces: 3 }), true);
  assert.equal(cestUnMailIndexe({ mailPieces: null }), false);
  assert.equal(cestUnMailIndexe({}), false);
  assert.equal(cestUnMailIndexe(null), false);
});

/**
 * **Aucune case vide.** Un mail dont l'expéditeur n'a pas été lu afficherait une
 * colonne blanche, qu'on prendrait pour un défaut d'affichage plutôt que pour
 * un mail sans expéditeur lisible (règle 5).
 */
test("une ligne sans expéditeur le dit, au lieu de laisser un blanc", () => {
  const ligne = laLigneDunMail({ mailDe: null, mailObjet: null, mailPieces: 0 });
  assert.equal(ligne.de, "expéditeur non lu");
  assert.equal(ligne.objet, "(sans objet)");
});

test("le trombone ne se dessine qu'au-dessus de zéro", () => {
  assert.equal(laLigneDunMail({ mailPieces: 0 }).avecPieces, false);
  assert.equal(laLigneDunMail({ mailPieces: 0 }).titreDesPieces, "");
  assert.equal(laLigneDunMail({ mailPieces: 1 }).avecPieces, true);
  assert.equal(laLigneDunMail({ mailPieces: 1 }).titreDesPieces, "1 pièce jointe");
  assert.equal(laLigneDunMail({ mailPieces: 4 }).titreDesPieces, "4 pièces jointes");
});

/**
 * **Aujourd'hui se dit par l'heure, le reste par la date.** Dans une liste
 * d'aujourd'hui, la date est la même partout et ne distingue rien.
 */
test("la date d'un mail se dit comme dans une messagerie", () => {
  const maintenant = new Date("2026-03-12T18:00:00Z");
  assert.match(quandDit("2026-03-12T08:14:00Z", maintenant), /^\d{2}:\d{2}$/);
  assert.match(quandDit("2026-02-03T08:14:00Z", maintenant), /^03 févr\.?$/);
  assert.match(quandDit("2024-02-03T08:14:00Z", maintenant), /2024/);
  assert.equal(quandDit("", maintenant), "");
  assert.equal(quandDit("pas une date", maintenant), "");
});

/**
 * **Ce qui n'a pas de date passe à la fin**, et non au début : le placer avant
 * inventerait un moment antérieur à tout, et ferait lire une réponse avant sa
 * question.
 */
test("un fil se range dans l'ordre du temps, les sans-date à la fin", () => {
  const range = leFilRange([
    { id: "c", mailQuand: "2026-03-12T08:14:00Z" },
    { id: "sans", mailQuand: "" },
    { id: "a", mailQuand: "2026-02-03T09:00:00Z" },
    { id: "b", mailQuand: "2026-02-05T14:30:00Z" }
  ]);
  assert.deepEqual(range.map((un) => un.id), ["a", "b", "c", "sans"]);
});

test("un fil d'un seul message ne se compte pas", () => {
  assert.equal(phraseDuFilRange([{ id: "a" }]), "");
  assert.equal(phraseDuFilRange([]), "");
  assert.equal(phraseDuFilRange([{ id: "a" }, { id: "b" }]), "2 messages dans cet échange");
});
