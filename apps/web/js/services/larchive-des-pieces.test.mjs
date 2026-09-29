import test from "node:test";
import assert from "node:assert/strict";

import {
  AU_PLUS, CASIER, ceQuiResteAVerser, cheminDeLaPiece, lesPiecesArchivees,
  ligneDuRegistre, phraseDuVersement, unePieceArchivee
} from "./larchive-des-pieces.js";

const EMPREINTE = "a".repeat(64);
const AUTRE = "b".repeat(64);

const piece = (empreinte, quoi = {}) => ({
  empreinte,
  nom: "plan-r+1.pdf",
  type: "application/pdf",
  taille: 5000,
  octets: Uint8Array.from([1, 2, 3]),
  ...quoi
});

test("le casier se nomme à un seul endroit", () => {
  assert.equal(CASIER, "archives");
});

/**
 * **Le nom d'une pièce est son empreinte.** C'est ce qui rend le dédoublonnage
 * définitif : le même plan attaché à quinze réponses écrit quinze fois au même
 * endroit le même contenu, donc une fois.
 */
test("le chemin d'une pièce est son empreinte, et rien d'autre", () => {
  assert.equal(cheminDeLaPiece(EMPREINTE), `pieces/${EMPREINTE}`);
  // Le chemin ne porte ni nom de fichier, ni chantier, ni personne.
  assert.equal(cheminDeLaPiece(EMPREINTE).includes("plan"), false);
  // La casse ne fait pas deux objets d'un seul.
  assert.equal(cheminDeLaPiece("A".repeat(64)), `pieces/${EMPREINTE}`);
});

/**
 * **Sans empreinte, il n'y a pas de nom sous lequel écrire.** En inventer un —
 * un compteur, un hasard — ferait perdre la propriété qui justifie tout le
 * reste : deux versements du même fichier deviendraient deux objets.
 */
test("ce qui n'est pas une empreinte n'a pas de chemin", () => {
  assert.equal(cheminDeLaPiece(""), "");
  assert.equal(cheminDeLaPiece(null), "");
  assert.equal(cheminDeLaPiece("a".repeat(63)), "");
  assert.equal(cheminDeLaPiece("a".repeat(65)), "");
  assert.equal(cheminDeLaPiece(`${"a".repeat(63)}z`), "");
  assert.equal(cheminDeLaPiece("../../etc/passwd"), "");
});

test("ce qui est déjà dans l'archive ne remonte pas", () => {
  const reste = ceQuiResteAVerser([piece(EMPREINTE), piece(AUTRE)], [EMPREINTE]);
  assert.deepEqual(reste.aVerser.map((une) => une.empreinte), [AUTRE]);
  assert.equal(reste.dejaLa, 1);
});

/**
 * Le même plan revient à chaque réponse d'un fil : sans ce repli, on
 * téléverserait dix fois le même objet à la même adresse.
 */
test("la même pièce déposée deux fois ne monte qu'une fois", () => {
  const reste = ceQuiResteAVerser([piece(EMPREINTE), piece(EMPREINTE), piece(EMPREINTE)], []);
  assert.equal(reste.aVerser.length, 1);
  assert.equal(reste.dejaLa, 2);
});

test("ce qu'on ne sait pas empreindre ne se verse pas, et se compte", () => {
  const reste = ceQuiResteAVerser([piece(""), piece("pas-une-empreinte"), piece(EMPREINTE)], []);
  assert.deepEqual(reste.aVerser.map((une) => une.empreinte), [EMPREINTE]);
  assert.equal(reste.sansEmpreinte, 2);
  assert.equal(reste.dejaLa, 0);
});

test("chaque pièce à verser porte son chemin et ses octets", () => {
  const [une] = ceQuiResteAVerser([piece(EMPREINTE)], []).aVerser;
  assert.equal(une.chemin, `pieces/${EMPREINTE}`);
  assert.deepEqual([...une.octets], [1, 2, 3]);
  assert.equal(une.nom, "plan-r+1.pdf");
});

test("rien à verser ne verse rien", () => {
  assert.deepEqual(ceQuiResteAVerser([], []).aVerser, []);
  assert.deepEqual(ceQuiResteAVerser(null, null).aVerser, []);
});

/**
 * **`versee_par` ne se déclare pas.** La base le pose elle-même ; un appelant
 * qui l'écrirait ferait porter un versement à quelqu'un d'autre.
 */
test("la ligne de registre ne dit pas qui verse", () => {
  const ligne = ligneDuRegistre(piece(EMPREINTE));
  assert.deepEqual(ligne, {
    empreinte: EMPREINTE, nom: "plan-r+1.pdf", type_mime: "application/pdf", taille: 5000
  });
  assert.equal("versee_par" in ligne, false);
});

test("une ligne de registre devient une pièce lisible à l'écran", () => {
  const une = unePieceArchivee({
    empreinte: EMPREINTE, nom: "plan.pdf", type_mime: "application/pdf",
    taille: 5000, versee_le: "2026-05-12T07:41:00.000Z"
  });
  assert.equal(une.nom, "plan.pdf");
  assert.equal(une.taille, 5000);
  assert.equal(une.versee, "2026-05-12T07:41:00.000Z");
  assert.equal(une.seLit, true);
});

/**
 * **Le lecteur de la console est celui des Documents, et il lit des PDF.** Lui
 * donner un ZIP afficherait un cadre vide sans dire pourquoi.
 */
test("ce que la console ne sait pas ouvrir ne se dit pas lisible", () => {
  for (const type of ["image/png", "application/zip", "", "application/pdf; charset=binary"]) {
    assert.equal(unePieceArchivee({ empreinte: EMPREINTE, type_mime: type }).seLit, false, type);
  }
});

test("l'archive se lit du plus récent au plus ancien", () => {
  const { pieces } = lesPiecesArchivees([
    { empreinte: EMPREINTE, versee_le: "2026-05-12T07:41:00.000Z", nom: "vieux.pdf" },
    { empreinte: AUTRE, versee_le: "2026-06-01T09:00:00.000Z", nom: "recent.pdf" }
  ]);
  assert.deepEqual(pieces.map((une) => une.nom), ["recent.pdf", "vieux.pdf"]);
});

test("une ligne sans empreinte n'entre pas dans l'archive", () => {
  assert.deepEqual(lesPiecesArchivees([{ nom: "orpheline.pdf" }]).pieces, []);
  assert.deepEqual(lesPiecesArchivees(null).pieces, []);
});

/**
 * **Une liste tronquée en silence est pire qu'une liste courte.**
 *
 * Sur cent mille pièces, « voici l'archive » serait faux — et rien à l'écran ne
 * le dirait (règle 5). On en demande une de plus qu'on n'en montre : c'est ce
 * qui permet de savoir qu'il y en a davantage sans compter toute la table.
 */
test("une archive plus longue que ce qu'on montre le dit", () => {
  const beaucoup = Array.from({ length: AU_PLUS + 1 }, (un, rang) => ({
    empreinte: String(rang).padStart(64, "0"),
    versee_le: `2026-06-${String((rang % 28) + 1).padStart(2, "0")}T09:00:00.000Z`
  }));

  const lu = lesPiecesArchivees(beaucoup);
  assert.equal(lu.pieces.length, AU_PLUS);
  assert.equal(lu.reste, true);

  // Tout juste à la limite : rien ne manque, et on ne le prétend pas.
  const juste = lesPiecesArchivees(beaucoup.slice(0, AU_PLUS));
  assert.equal(juste.pieces.length, AU_PLUS);
  assert.equal(juste.reste, false);
});

/**
 * **Le nombre est écrit en clair ici.** Le comparer à `AU_PLUS` reviendrait à le
 * comparer à lui-même : l'épreuve passerait quelle que soit sa valeur, et
 * changer le plafond ne casserait rien — alors que cela change ce que l'écran
 * montre, et l'accord avec la requête qui en demande une de plus.
 */
test("le plafond de l'archive vaut deux cents", () => {
  assert.equal(AU_PLUS, 200);
});

test("le nombre qu'on montre vit à un seul endroit", () => {
  const trois = lesPiecesArchivees(
    Array.from({ length: 5 }, (un, rang) => ({ empreinte: String(rang).padStart(64, "0") })),
    3
  );
  assert.equal(trois.pieces.length, 3);
  assert.equal(trois.reste, true);
});

test("un versement dit ce qu'il a fait, et ce qu'il n'a pas pu faire", () => {
  assert.equal(phraseDuVersement({ versees: 3, dejaLa: 12, refusees: 1 }),
    "3 pièces versées · 12 étaient déjà là · 1 n'a pas pu être versée");
  assert.equal(phraseDuVersement({ versees: 1 }), "1 pièce versée");
});

test("un versement qui n'avait rien à verser ne dit rien", () => {
  assert.equal(phraseDuVersement({ versees: 0, dejaLa: 0, refusees: 0 }), "");
  assert.equal(phraseDuVersement(null), "");
});

/**
 * **Un échec ne se tait pas.** Celui qui dépose cent archives et en voit
 * trois refusées sans qu'on le dise croira tout versé, et ne reviendra pas.
 */
test("ce qui n'a pas pu être versé se dit, même si le reste a réussi", () => {
  assert.match(phraseDuVersement({ versees: 99, refusees: 1 }), /1 n'a pas pu être versée/);
});
