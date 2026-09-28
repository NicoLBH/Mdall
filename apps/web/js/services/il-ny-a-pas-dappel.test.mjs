/**
 * La faute qui vient d'ailleurs : `Couleur des volets(Matériau)`.
 *
 * **Le cas rapporté, au troisième tour.** On demande au modèle de se servir
 * d'une fonction versée ; il écrit un appel. On lit la console, et elle dit
 * « ce qui suit ne se rattache à rien — ( » puis « aucun mot de la langue
 * n'ouvre cette ligne ». Les deux sont vraies et n'apprennent rien : on relit
 * sa ligne en cherchant l'opérateur qui manque, alors que c'est la **forme
 * entière** qui n'existe pas dans ce langage.
 *
 * Quatre défauts, tous vus sur cette capture d'écran.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { lireUnFichier, nomAppeleDans } from "./memoire-en-lecture.js";
import { lireUnCalcul, phraseDuRefus, REFUS_DU_CALCUL } from "./mdall-calcul.js";
import { verifierLeBrouillon } from "./verification-du-brouillon.js";

const refusDe = (source) => lireUnFichier(source).refus.map((un) => un.raison);

/* ── 1. L'appel, dans les trois formes où on l'écrit ─────────────────────── */

test("un appel dans un « calcule » se nomme, au lieu d'un refus de grammaire", () => {
  /**
   * **C'est la ligne exacte du modèle.** Elle se refusait par « ce qui suit ne
   * se rattache à rien — ( » : un message qui envoie chercher un opérateur
   * manquant, là où rien ne manque et où tout est de trop.
   */
  const dit = refusDe(`fonction F(zones, Matériau) {
   calcule x = Couleur des volets(zones, Matériau);
   si (x = "gris")
   alors (1);
}
`);

  assert.equal(dit.length, 1);
  assert.match(dit[0], /il n'y a pas d'appel de fonction/);
  assert.match(dit[0], /Écrivez « Couleur des volets » seul/);
  assert.doesNotMatch(dit[0], /ne se rattache à rien/);
});

test("un appel dans une condition se nomme aussi", () => {
  const dit = refusDe(`fonction F(zones, Matériau) {
   si (Couleur des volets(Matériau) = "gris")
   alors (1);
}
`);

  assert.equal(dit.length, 1);
  assert.match(dit[0], /il n'y a pas d'appel de fonction/);
  assert.match(dit[0], /Écrivez « Couleur des volets » seul/);
  // « cette condition ne compare rien » envoyait chercher un « = » qui est là.
  assert.doesNotMatch(dit[0], /ne compare rien/);
});

test("un appel seul sur sa ligne se nomme, comme avant", () => {
  const dit = refusDe(`fonction F(zones, Matériau) {
   Couleur des volets(Matériau);
   si (Matériau = "bois")
   alors (1);
}
`);

  assert.equal(dit.length, 1);
  assert.match(dit[0], /il n'y a pas d'appel de fonction/);
});

test("la phrase nomme les seules fonctions qui prennent des parenthèses", () => {
  /**
   * **Et elle les prend à leur définition.** Une fonction ajoutée au langage
   * manquerait sinon dans la phrase, sans que rien ne le dise : la consigne
   * enseignerait une langue qui n'est plus la nôtre (règle 10).
   */
  const dite = phraseDuRefus(REFUS_DU_CALCUL.APPEL, "Couleur des volets");

  for (const une of ["racine", "abs", "arrondi", "plafond", "plancher", "min", "max"]) {
    assert.match(dite, new RegExp(une), `${une} manque à la phrase`);
  }
  assert.match(dite, /lit les noms qui existent autour d'elle/);
});

test("ce qui n'est pas un appel ne se fait pas dénoncer", () => {
  /**
   * **Un écran qui crie à tort cesse d'être lu**, et c'est le défaut qu'on
   * corrige, à l'envers. Le nom doit être **collé** à sa parenthèse : c'est ce
   * qui distingue un appel d'une ligne qui porte une parenthèse.
   */
  assert.equal(nomAppeleDans("truc (A) machin"), "", "l'espace dit que ce n'est pas un appel");
  assert.equal(nomAppeleDans("(A + B)"), "");
  assert.equal(nomAppeleDans("si (A > 0)"), "", "un mot de la langue n'est pas un nom");
  assert.equal(nomAppeleDans("calcule X = racine(4)"), "", "racine s'appelle vraiment");
  assert.equal(nomAppeleDans("A + B * 2"), "");

  assert.equal(nomAppeleDans("calcule x = Couleur des volets(zones, M);"), "Couleur des volets");
  // Deux parenthèses collées : celle du mot de la langue ne doit pas manger
  // celle qui ouvre le nom suivant.
  assert.equal(nomAppeleDans(`si(Couleur des volets(M) = "gris")`), "Couleur des volets");

  // Et rien de tout cela ne refuse une fonction juste.
  assert.deepEqual(refusDe(`fonction F(zones, A) {
   calcule X = racine(A);
   si (X > 0 m)
   alors (X);
}
`), []);
});

/* ── 2. L'espace qui manque devant la parenthèse ─────────────────────────── */

test("un mot de la langue collé à sa parenthèse se lit", () => {
  /**
   * **`si(A > 0)` se refusait par « aucun mot de la langue n'ouvre cette
   * ligne ».** C'est faux : le mot est là, il manque une espace. La phrase
   * envoyait relire la grammaire pour une touche non frappée, et la ligne
   * entière disparaissait du raisonnement.
   *
   * Un espace de moins n'est pas un autre sens : il n'y a rien à trancher,
   * donc rien à refuser.
   */
  const lu = lireUnFichier(`fonction Garde-corps(zones, Hauteur) {
   si(Hauteur > 1 m)
   alors("dû");
   sinon("non");
}
`);

  assert.deepEqual(lu.refus, []);
  assert.equal(lu.blocs[0].conditions[0].sujet, "Hauteur");
  assert.equal(lu.blocs[0].alors, "dû");
  assert.equal(lu.blocs[0].sinon, "non");
});

test("seuls les mots qui portent une parenthèse l'acceptent collée", () => {
  // `calcule(` ou `fonction(` ne veut rien dire, et l'accepter ferait lire une
  // ligne que personne n'a voulu écrire.
  const dit = refusDe(`fonction F(zones, A) {
   calcule(X) = 2;
   si (A > 0)
   alors (1);
}
`);

  assert.equal(dit.length, 1);
  assert.doesNotMatch(dit[0], /^$/);
});

test("une condition ne porte jamais un nom à parenthèses", () => {
  /**
   * **C'est ce que l'espace toléré a failli laisser passer.** `si(Couleur des
   * volets(M) = "gris")` se lisait alors comme une condition portant sur un
   * sujet nommé « (Couleur des volets(M) » : une condition acceptée sur un nom
   * que personne n'a écrit, indécidable pour toujours.
   */
  const lu = lireUnFichier(`fonction F(zones, M) {
   si(Couleur des volets(M) = "gris")
   alors (1);
}
`);

  assert.equal(lu.blocs.length ? lu.blocs[0].conditions.length : 0, 0);
  assert.equal(lu.refus.length, 1);
  assert.match(lu.refus[0].raison, /il n'y a pas d'appel de fonction/);
});

/* ── 3. Une locale n'est pas un nom inconnu ──────────────────────────────── */

test("ce qu'une fonction se calcule n'est pas « déclaré nulle part »", () => {
  /**
   * **`calcule x = …;` puis `si (x …)` est la forme la plus courante de toute
   * la langue**, et elle portait « x n'est déclaré nulle part » à chaque fois.
   * Une console qui crie à tort cesse d'être lue, et les vraies remarques se
   * perdent avec les fausses.
   */
  const dites = verifierLeBrouillon([{ nom: "essai.ref", contenu: `const Prix HT = {
   type: "mesure",
   unité: "€",
   description: "Le prix hors taxes.",
};

fonction Prix TTC(zones, Prix HT) {
   calcule TVA = Prix HT * 20%;
   si (TVA > 0 €)
   alors (Prix HT + TVA);
}
` }]);

  assert.deepEqual(dites.filter((une) => une.quoi === "nom-inconnu"), []);
});

test("la variable d'une boucle non plus", () => {
  const dites = verifierLeBrouillon([{ nom: "essai.ref", contenu: `fonction Charges(zones, Portée) {
   pour chaque Niveau de 0 m à Portée par pas de 1 m
      calcule Charge = Niveau * 2 kN;
   si (Niveau > 0 m)
   alors (Charge);
}
` }]);

  assert.deepEqual(dites.filter((une) => une.quoi === "nom-inconnu"), []);
});

test("une locale reste locale : la fonction d'à côté ne la lit pas", () => {
  /**
   * **Sinon on aurait échangé une remarque fausse contre un silence faux.**
   * Verser les locales dans les noms déclarés du brouillon laisserait la
   * fonction suivante lire un `x` qui n'existe pas chez elle — et celle-là
   * resterait indécidable sans qu'un mot le dise (règle 5).
   */
  const dites = verifierLeBrouillon([{ nom: "essai.ref", contenu: `fonction A(zones, Prix HT) {
   calcule x = Prix HT * 2;
   si (x > 0)
   alors (x);
}

fonction B(zones) {
   si (x > 0)
   alors (1);
}
` }]);

  const inconnus = dites.filter((une) => une.quoi === "nom-inconnu").map((une) => une.texte);
  assert.deepEqual(inconnus, ["x"], "la locale de A ne doit pas exister pour B");
});
