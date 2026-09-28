/**
 * Ce qu'une fonction annonce — ses entrées, et ce qu'elle rend — comparé à ce
 * qu'elle fait.
 *
 * **La signature ne lie rien.** Une fonction dont le corps lit un nom qu'elle
 * n'annonce pas marche très bien, et c'est précisément pour cela qu'il faut la
 * vérifier : rien d'autre ne le fera, et c'est la première chose qu'un
 * relecteur regarde.
 *
 * **Nos lecteurs ne sont pas des professionnels du code.** Chaque refus doit
 * donc donner la ligne à écrire, pas seulement nommer la faute.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { lireUnFichier, entreesDuBloc } from "./memoire-en-lecture.js";
import { blocDeRegle, texteDesLignes } from "./memoire-en-texte.js";
import { ENNUI, verifierLeBrouillon } from "./verification-du-brouillon.js";
import { aProposerDuBrouillon } from "./proposition-du-brouillon.js";

/** Les remarques d'une sorte, pour ce texte. */
const ennuis = (contenu, quoi) => verifierLeBrouillon([{ nom: "essai.ref", contenu }])
  .filter((une) => une.quoi === quoi)
  .map((une) => une.dit);

/* ── Ce qu'une fonction lit vraiment ─────────────────────────────────────── */

test("les entrées d'une fonction sont ce qu'elle lit du dehors, et rien d'autre", () => {
  /**
   * **C'est la distinction dont tout dépend** : ce que le formulaire demande,
   * ce que l'aide annonce, ce qu'une signature doit déclarer. Écrite trois
   * fois, elle aurait donné trois réponses à la même question (règle 10).
   */
  const bloc = lireUnFichier(`fonction Prix TTC(zones, Prix HT, Taux de TVA) {
   calcule TVA = Prix HT * Taux de TVA;
   calcule Prix TTC = Prix HT + TVA;
   si (Prix TTC > 0 €)
   alors (Prix TTC);
}
`).blocs[0];

  // « TVA » et « Prix TTC » sont posés ici ; « Prix TTC » est elle-même.
  assert.deepEqual(entreesDuBloc(bloc), ["Prix HT", "Taux de TVA"]);
});

test("une fonction ne se compte jamais elle-même dans ses entrées", () => {
  /**
   * **Une fonction conclut sous son nom, elle ne se lit pas.** Se compter
   * ferait réclamer dans sa signature le nom qu'elle produit — et la ligne
   * qu'on proposerait d'écrire serait une circularité.
   *
   * Le cas n'est pas rare : `alors (Prix TTC)` nomme la conclusion, et c'est la
   * forme la plus courante du langage.
   */
  const bloc = lireUnFichier(`fonction Charge en pied(zones, Charge) {
   calcule Charge en pied = Charge * 3;
   si (Charge en pied > 0 kN)
   alors (Charge en pied);
}
`).blocs[0];

  assert.deepEqual(entreesDuBloc(bloc), ["Charge"]);

  // **Et même quand elle n'est pas une locale** : une fonction qui nomme son
  // propre sujet dans une condition ne se réclame pas dans sa signature — la
  // ligne qu'on proposerait d'écrire serait une circularité.
  const nue = lireUnFichier(
    `fonction Test(zones, A) {\n   si (Test > 0)\n   et (A > 0)\n   alors (1);\n}\n`).blocs[0];
  assert.deepEqual(entreesDuBloc(nue), ["A"], "« Test » se réclame elle-même");
  assert.deepEqual(ennuis(`fonction Charge en pied(zones, Charge) {
   calcule Charge en pied = Charge * 3;
   si (Charge en pied > 0 kN)
   alors (Charge en pied);
}
`, ENNUI.SIGNATURE), []);
});

test("une boucle pose sa variable et ses colonnes : elles ne se demandent pas", () => {
  const bloc = lireUnFichier(`fonction Descente(zones, Charge par niveau) {
   pour chaque Niveau de 1 à 4 par pas de 1
      calcule Cumul = Charge par niveau * Niveau;

   calcule Pied = le plus grand de Cumul;
   si (Pied > 0 kN)
   alors (Pied);
}
`).blocs[0];

  assert.deepEqual(entreesDuBloc(bloc), ["Charge par niveau"]);
});

/* ── La signature, et les deux sens qui comptent ─────────────────────────── */

test("une entrée que la signature n'annonce pas se refuse, et la phrase donne la ligne", () => {
  /**
   * **C'est le cas des captures** : `fonction Test(zones, Matériau)` dont le
   * corps lit autre chose. Le fichier versé annonce alors une fonction qui
   * n'existe pas, et personne ne peut le savoir sans relire tout son corps —
   * ce que la signature existe précisément pour éviter.
   */
  const dits = ennuis(`fonction F(zones) {
   si (Matériau = "bois")
   alors ("gris");
}
`, ENNUI.SIGNATURE);

  assert.equal(dits.length, 1);
  assert.match(dits[0], /« F » lit « Matériau », mais sa signature ne l'annonce pas/);
  // **La ligne à écrire**, pas seulement le nom de la faute.
  assert.match(dits[0], /Écrivez : F\(zones, Matériau\)\./);
});

test("une entrée annoncée dont rien ne se sert se refuse aussi", () => {
  // Elle fait relire le corps trois fois pour la chercher, et l'on finit par
  // douter de sa propre lecture.
  const dits = ennuis(`fonction F(zones, A, B) {
   si (A > 0)
   alors (1);
}
`, ENNUI.SIGNATURE);

  assert.equal(dits.length, 1);
  assert.match(dits[0], /annonce « B », dont elle ne se sert jamais/);
  assert.match(dits[0], /Écrivez : F\(zones, A\)\./);
});

test("une signature qui n'annonce pas sa portée se refuse", () => {
  // C'est sous ce nom qu'une fonction reçoit les parties d'ouvrage auxquelles
  // elle s'applique, et c'est la première question qu'on se pose devant une
  // parenthèse ouverte.
  const dits = ennuis(`fonction F(A) {
   si (A > 0)
   alors (1);
}
`, ENNUI.SIGNATURE);

  assert.equal(dits.length, 1);
  assert.match(dits[0], /n'annonce pas sa portée.*« zones ».*toujours en premier/s);
});

test("une signature juste ne dit rien, locales et boucles comprises", () => {
  for (const contenu of [
    `fonction F(zones, A) {\n   si (A > 0)\n   alors (1);\n}\n`,
    `fonction F(zones, A) {\n   calcule T = A * 2;\n   si (T > 0)\n   alors (T);\n}\n`,
    `fonction F(zones, A) {\n   pour chaque N de 1 à 3 par pas de 1\n      calcule C = A * N;\n\n   calcule P = la somme de C;\n   si (P > 0)\n   alors (P);\n}\n`
  ]) {
    assert.deepEqual(ennuis(contenu, ENNUI.SIGNATURE), []);
  }
});

test("une signature annonce ce qu'une autre fonction déduit, et c'est juste", () => {
  /**
   * **Ce qu'une fonction lit ne dépend pas de ce qu'on a écrit à côté.** Une
   * signature qui changerait de sens parce qu'on a ajouté une fonction
   * ailleurs ne voudrait plus rien dire — et c'est ainsi que le langage l'écrit
   * partout : `fonction Prix TTC(zones, Prix HT, Taux de TVA)`.
   */
  const contenu = `fonction Taux de TVA(zones, Type) {
   si (Type = "neuf")
   alors (20%);
}

fonction Prix TTC(zones, Prix HT, Taux de TVA) {
   calcule Prix TTC = Prix HT * Taux de TVA;
   si (Prix TTC > 0 €)
   alors (Prix TTC);
}
`;
  assert.deepEqual(ennuis(contenu, ENNUI.SIGNATURE), []);
});

test("une affirmation n'a pas de signature, et on ne lui en réclame pas", () => {
  assert.deepEqual(ennuis("Altitude du site = 890 m\n   texte: NF EN 1991-1-3\n", ENNUI.SIGNATURE), []);
});

/* ── `rend:` : ce qu'on obtient en la nommant ────────────────────────────── */

test("une fonction dit ce qu'elle rend : un domaine, ou une unité", () => {
  const domaine = lireUnFichier(`fonction F(zones, A) {
   rend: "gris" ou "blanc"
   si (A = "bois")
   alors ("gris");
}
`).blocs[0];
  assert.deepEqual(domaine.rend, { valeurs: ["gris", "blanc"], unite: "" });

  const mesure = lireUnFichier(`fonction F(zones, A) {
   rend: kN
   si (A > 0)
   alors (12 kN);
}
`).blocs[0];
  assert.deepEqual(mesure.rend, { valeurs: [], unite: "kN" });
});

test("un « rend: » vide se refuse, et dit les deux formes qui existent", () => {
  const lu = lireUnFichier(`fonction F(zones, A) {\n   rend:\n   si (A > 0)\n   alors (1);\n}\n`);
  assert.equal(lu.refus.length, 1);
  assert.match(lu.refus[0].raison, /une unité — « rend: kN » — ou les valeurs possibles/);
});

test("une conclusion hors du domaine annoncé se refuse", () => {
  /**
   * **Une déclaration qu'on ne vérifie pas est une intention** (règle 12). Une
   * fonction qui annonce deux couleurs et en conclut une troisième ment à
   * l'endroit exact où l'on décide de la nommer.
   */
  const dits = ennuis(`fonction F(zones, A) {
   rend: "gris" ou "blanc"
   si (A = "bois")
   alors ("gris");
   sinon ("rouge");
}
`, ENNUI.REND);

  assert.equal(dits.length, 1);
  assert.match(dits[0], /annonce rendre « gris » ou « blanc », et conclut « rouge »/);
  assert.match(dits[0], /Ajoutez-la au « rend: », ou corrigez la conclusion/);
});

test("une conclusion d'une autre grandeur que celle annoncée se refuse", () => {
  const dits = ennuis(`fonction F(zones, A) {\n   rend: kN\n   si (A > 0)\n   alors (12 m);\n}\n`, ENNUI.REND);
  assert.equal(dits.length, 1);
  assert.match(dits[0], /annonce rendre des kN, et conclut « 12 m »/);
});

test("un texte là où une mesure est annoncée se refuse, et dit comment s'écrit une mesure", () => {
  const dits = ennuis(`fonction F(zones, A) {\n   rend: kN\n   si (A > 0)\n   alors ("3e famille B");\n}\n`, ENNUI.REND);
  assert.equal(dits.length, 1);
  assert.match(dits[0], /qui n'est pas une mesure.*« 12 kN »/s);
});

test("une conclusion qui nomme une locale ne se compare pas", () => {
  /**
   * **Sa valeur dépend des réponses**, et l'on ne la connaît qu'au lancement.
   * La refuser ici interdirait `alors (Prix TTC)`, qui est la forme la plus
   * courante du langage.
   */
  assert.deepEqual(ennuis(`fonction F(zones, A) {
   rend: kN
   calcule Total = A * 2;
   si (Total > 0 kN)
   alors (Total);
}
`, ENNUI.REND), []);
});

test("une fonction qui n'annonce rien ne se fait rien dire", () => {
  // `rend:` est facultatif : l'exiger ferait crier sur toutes les fonctions
  // écrites avant qu'il existe.
  assert.deepEqual(ennuis(`fonction F(zones, A) {\n   si (A > 0)\n   alors (1);\n}\n`, ENNUI.REND), []);
});

/* ── Il voyage ───────────────────────────────────────────────────────────── */

test("« rend: » se réécrit, se relit, et se verse", () => {
  /**
   * **C'est la première chose qu'on lit avant de se servir d'une fonction.** La
   * perdre au versement ferait relire, dans la mémoire du projet, une fonction
   * qui ne promet plus rien.
   */
  const SRC = `fonction Couleur des volets(zones, Matériau) {
   rend: "gris" ou "blanc"

   si (Matériau = "bois")
   alors ("gris");
   sinon ("blanc");
}
`;
  const bloc = lireUnFichier(SRC).blocs[0];

  const ecrit = texteDesLignes(blocDeRegle({
    sujet: bloc.sujet, conditions: bloc.conditions, alors: bloc.alors,
    sinon: bloc.sinon, rend: bloc.rend
  }));
  assert.match(ecrit, /^ {3}rend: "gris" ou "blanc"$/m);
  assert.deepEqual(lireUnFichier(ecrit).blocs[0].rend, bloc.rend);

  const payload = aProposerDuBrouillon([{ nom: "essai.ref", contenu: SRC }]).affirmations[0];
  assert.deepEqual(payload.regle.rend, bloc.rend);
});

test("ce qu'on n'a pas écrit ne s'écrit pas", () => {
  const bloc = lireUnFichier(`fonction F(zones, A) {\n   si (A > 0)\n   alors (1);\n}\n`).blocs[0];
  assert.equal(bloc.rend, null);

  const payload = aProposerDuBrouillon([{
    nom: "essai.ref", contenu: `fonction F(zones, A) {\n   si (A > 0)\n   alors (1);\n}\n`
  }]).affirmations[0];
  assert.ok(!("rend" in payload.regle), "une fonction sans promesse en déclare une");
});
