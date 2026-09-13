import test from "node:test";
import assert from "node:assert/strict";

import { personnesMentionnees, personnesMentionneesDans, poigneesDunePersonne } from "./mentions-du-texte.js";

/**
 * Qui est nommé avec un `@`, et pourquoi la table ne suffit pas.
 *
 * `subject_message_mentions` ne porte que les mentions **choisies dans la
 * liste** de complétion. Quelqu'un qui écrit `@nicolas LE BIHAN` au clavier dans
 * la description d'un sujet n'écrit aucune ligne — et « Mentions » ne le voyait
 * pas, alors que la personne est nommée. C'est le cas courant, pas le cas
 * limite : un texte collé depuis un compte rendu ne passe jamais par la liste.
 */

const PERSONNES = [
  { id: "p-nico", name: "Nicolas LE BIHAN", email: "nicolas.lebihan@exemple.fr" },
  { id: "p-benoit", name: "Benoît GUYOT", email: "bguyot@exemple.fr" },
  { id: "p-sans-nom", name: "", email: "" }
];

test("un nom complet tapé au clavier est une mention", () => {
  assert.deepEqual(
    personnesMentionnees("à voir avec @nicolas LE BIHAN avant jeudi", PERSONNES),
    ["p-nico"]
  );
});

test("le prénom seul, le nom seul et l'adresse désignent aussi", () => {
  assert.deepEqual(personnesMentionnees("@nicolas tu confirmes ?", PERSONNES), ["p-nico"]);
  assert.deepEqual(personnesMentionnees("relance @guyot", PERSONNES), ["p-benoit"]);
  assert.deepEqual(personnesMentionnees("@bguyot@exemple.fr", PERSONNES), ["p-benoit"]);
  assert.deepEqual(personnesMentionnees("@nicolas.lebihan", PERSONNES), ["p-nico"]);
});

/** Les accents et la casse ne se tapent pas dans un `@`. */
test("l'écriture est repliée des deux côtés", () => {
  assert.deepEqual(personnesMentionnees("@BENOIT GUYOT a relancé", PERSONNES), ["p-benoit"]);
});

/**
 * **L'arobase est exigée.** Chercher le nom seul retiendrait tout sujet qui
 * parle de quelqu'un — « voir avec Benoît » n'est pas une mention, et une
 * lecture qui remonte cela ne se distingue plus de la recherche par mot.
 */
test("un nom sans arobase n'est pas une mention", () => {
  assert.deepEqual(personnesMentionnees("voir avec Benoît GUYOT", PERSONNES), []);
  assert.deepEqual(personnesMentionnees("synthèse Nicolas LE BIHAN", PERSONNES), []);
});

/**
 * On n'ouvre pas un nom au plus proche : une mention fausse fait répondre
 * quelqu'un à la place d'un autre (règle 5).
 */
test("un @ qui ne désigne personne du projet ne rend rien", () => {
  assert.deepEqual(personnesMentionnees("@vergori doit passer", PERSONNES), []);
});

/** Une personne sans nom ni adresse n'a aucune écriture : elle ne se mentionne pas. */
test("une personne qu'on ne sait pas écrire ne se trouve jamais", () => {
  assert.deepEqual(poigneesDunePersonne({ id: "p-sans-nom" }), []);
  assert.deepEqual(personnesMentionnees("@ @@ @a", PERSONNES), []);
});

/** Le titre, la description et les commentaires : le même geste à trois endroits. */
test("les trois textes d'un sujet comptent ensemble", () => {
  const trouvees = personnesMentionneesDans([
    "Cloison CF1H",
    "après implantation des nourrices par @benoit guyot",
    "@nicolas peux-tu confirmer ?",
    null
  ], PERSONNES);

  assert.deepEqual(trouvees.sort(), ["p-benoit", "p-nico"]);
});

test("une même personne nommée deux fois ne compte qu'une", () => {
  assert.deepEqual(
    personnesMentionneesDans(["@nicolas", "@nicolas le bihan"], PERSONNES),
    ["p-nico"]
  );
});
