/**
 * Appeler une fonction du projet sur d'autres noms que les siens.
 *
 * ## Ce qui a changé, et pourquoi
 *
 * `Couleur des volets` déclare lire `Nature des volets`. Tant qu'un nom ne
 * pouvait pas être **donné**, elle ne savait lire que celui-là : une seconde
 * série de volets, nommée autrement, demandait une seconde fonction qui dit la
 * même chose. À dix noms, le projet tient dix copies d'un même raisonnement,
 * dont neuf vieillissent sans qu'on s'en aperçoive.
 *
 * Une fonction détachée des noms sur lesquels on l'a écrite est une fonction ;
 * attachée, c'est un cas particulier. C'est le sens de cette ronde, et elle
 * revient sur la ronde d'avant, qui tenait l'absence d'appel pour un choix.
 *
 * **Ce qu'un appel ne fait pas** : il n'écrit rien, ne conclut sous aucun nom,
 * et ne verse rien. La fonction continue de conclure sous son seul nom dans la
 * mémoire (règle 10).
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  lireUnFichier, entreesDuBloc, fonctionsAppeleesParLeBloc, parametresDuBloc
} from "./memoire-en-lecture.js";
import { blocDeRegle, texteDesLignes } from "./memoire-en-texte.js";
import { lireUnCalcul, nomsDuCalcul } from "./mdall-calcul.js";
import { verifierLeBrouillon } from "./verification-du-brouillon.js";
import { lancerLeBrouillon } from "./bac-dessai.js";
import { nomsLus } from "./formulaire-du-brouillon.js";

const refusDe = (source) => lireUnFichier(source).refus.map((un) => un.raison);

const DEUX = `fonction Couleur des volets(zones, Nature des volets) {
   si (Nature des volets = "bois")
   alors ("violet");
   sinon ("blanc");
}

fonction Teinte du lot B(zones, Matériau) {
   calcule x = Couleur des volets(zones, Matériau);
   si (x = "violet")
   alors ("conforme au nuancier");
   sinon ("à valider");
}
`;

/* ── Ce que l'appel fait ─────────────────────────────────────────────────── */

test("une fonction répond sur les noms qu'on lui donne, pas sur les siens", () => {
  /**
   * **C'est toute la ronde.** `Couleur des volets` a été écrite sur
   * `Nature des volets` ; le lot B l'appelle sur `Matériau`, et elle répond.
   * Sans cela il fallait la réécrire, et le projet en tenait deux.
   */
  assert.deepEqual(refusDe(DEUX), []);

  const pourBois = lancerLeBrouillon([{ nom: "essai.ref", contenu: DEUX }],
    { "Matériau": "bois", "zones": "Bâtiment A" });
  assert.equal(pourBois.find((un) => un.sujet === "Teinte du lot B")?.valeur,
    "conforme au nuancier");

  const pourAlu = lancerLeBrouillon([{ nom: "essai.ref", contenu: DEUX }],
    { "Matériau": "alu", "zones": "Bâtiment A" });
  assert.equal(pourAlu.find((un) => un.sujet === "Teinte du lot B")?.valeur, "à valider");
});

test("l'appel ne conclut sous aucun nom : la fonction garde le sien", () => {
  /**
   * **Un appel répond à une question de passage.** S'il concluait, le projet
   * tiendrait « Couleur des volets » deux fois dans le même essai — une fois
   * sur sa propre lecture, une fois sur celle du lot B — et rien ne dirait
   * laquelle fait foi (règle 10).
   */
  const rendu = lancerLeBrouillon([{ nom: "essai.ref", contenu: DEUX }],
    { "Matériau": "bois", "zones": "Bâtiment A" });

  assert.equal(rendu.filter((un) => un.sujet === "Couleur des volets").length, 1);
  // Et elle, sur sa propre lecture, ne sait rien : personne n'a donné
  // « Nature des volets ». Le taire ferait croire qu'elle a répondu (règle 5).
  assert.equal(rendu.find((un) => un.sujet === "Couleur des volets")?.valeur, "");
});

test("une valeur reprise peut être un mot, et pas seulement une mesure", () => {
  /**
   * **« violet » n'est pas une mesure**, et l'arithmétique déclarait donc la
   * locale indécidable. Toute fonction qui conclut une couleur, un classement
   * ou un degré coupe-feu — la moitié d'un projet — était inutilisable dans un
   * `calcule`, sans qu'un mot le dise.
   */
  const rendu = lancerLeBrouillon([{ nom: "essai.ref", contenu: `fonction Degré(zones, Famille) {
   si (Famille = "3e")
   alors ("CF 1 h");
   sinon ("CF 1/2 h");
}

fonction Ce qu'on retient(zones, Famille du bâtiment) {
   calcule d = Degré(zones, Famille du bâtiment);
   si (d = "CF 1 h")
   alors ("renforcé");
   sinon ("courant");
}
` }], { "Famille du bâtiment": "3e", "zones": "Bâtiment A" });

  assert.equal(rendu.find((un) => un.sujet === "Ce qu'on retient")?.valeur, "renforcé");
});

test("ce qui n'est pas déclaré continue de se lire dehors", () => {
  /**
   * On ne substitue **que ce qui est déclaré**. Une fonction qui lit un nom
   * sans l'annoncer garde ce nom : il se lit dans l'environnement de
   * l'appelant, comme avant.
   */
  const rendu = lancerLeBrouillon([{ nom: "essai.ref", contenu: `fonction Prix pondéré(zones, Base) {
   calcule p = Base * Coefficient;
   si (p > 0 €)
   alors (p);
}

fonction Devis(zones, Montant) {
   calcule t = Prix pondéré(zones, Montant);
   si (t > 0 €)
   alors (t);
}
` }], { "Montant": "100 €", "Coefficient": "2", "zones": "Bâtiment A" });

  assert.equal(rendu.find((un) => un.sujet === "Devis")?.valeur, "200 €");
});

test("une fonction qui s'appelle elle-même ne boucle pas : elle ne sait pas", () => {
  // Un langage sans récursion n'a pas à en inventer une. On le dit en rendant
  // la ligne indécidable, plutôt qu'en tournant (règle 5).
  const rendu = lancerLeBrouillon([{ nom: "essai.ref", contenu: `fonction Boucle(zones, A) {
   calcule x = Boucle(zones, A);
   si (x > 0)
   alors (1);
}
` }], { "A": "1", "zones": "Bâtiment A" });

  assert.equal(rendu.find((un) => un.sujet === "Boucle")?.valeur, "");
});

/* ── Ce qu'il faut écrire, et ce que l'écran en dit ──────────────────────── */

test("la signature dit dans quel ordre on donne les valeurs", () => {
  const blocs = lireUnFichier(DEUX).blocs;

  assert.deepEqual(parametresDuBloc(blocs[0]), ["zones", "Nature des volets"]);
  // Une fonction versée ne garde pas sa ligne : on la reconstruit de ce qu'elle
  // lit, la portée devant.
  assert.deepEqual(parametresDuBloc({ ...blocs[0], signature: [] }),
    ["zones", "Nature des volets"]);
});

test("le mauvais nombre de valeurs se dit avec la signature attendue", () => {
  const rendu = lancerLeBrouillon([{ nom: "essai.ref", contenu: `fonction Couleur des volets(zones, Nature des volets) {
   si (Nature des volets = "bois")
   alors ("violet");
}

fonction Essai(zones, Matériau) {
   calcule x = Couleur des volets(Matériau);
   si (x = "violet")
   alors (1);
}
` }], { "Matériau": "bois", "zones": "B" });

  const dit = rendu.find((un) => un.sujet === "Essai");
  assert.equal(dit?.valeur, "");
  assert.match(JSON.stringify(dit), /s'écrit \(zones, Nature des volets\)/);
});

test("une fonction que le projet n'a pas se nomme, et se dit comme telle", () => {
  const rendu = lancerLeBrouillon([{ nom: "essai.ref", contenu: `fonction Essai(zones, A) {
   calcule x = Moyenne des charges(zones, A);
   si (x > 0)
   alors (1);
}
` }], { "A": "2" });

  const dit = rendu.find((un) => un.sujet === "Essai");
  assert.equal(dit?.valeur, "");
  // Le nom seul ne prouve rien : il paraît de toute façon dans la trace, comme
  // nom lu. C'est **le refus** qui doit le nommer.
  assert.match(JSON.stringify(dit), /pas de fonction de ce nom/);
});

test("la portée ne se tape pas : le bac n'a pas de zone", () => {
  /**
   * **`zones` est le premier argument de tout appel**, et le bac d'essai n'a
   * pas de zone — on y essaie une fonction, pas un ouvrage. Sans cela, l'appel
   * restait indécidable sur son **premier** argument, et le formulaire
   * réclamait qu'on tape « zones » à la main.
   */
  const source = `fonction Couleur des volets(zones, Nature des volets) {
   si (Nature des volets = "bois")
   alors ("violet");
   sinon ("blanc");
}

fonction Teinte du lot B(zones, Matériau) {
   calcule x = Couleur des volets(zones, Matériau);
   si (x = "violet")
   alors ("conforme");
   sinon ("à valider");
}
`;

  // Rien n'est donné pour « zones », et cela marche.
  const rendu = lancerLeBrouillon([{ nom: "essai.ref", contenu: source }], { "Matériau": "bois" });
  assert.equal(rendu.find((un) => un.sujet === "Teinte du lot B")?.valeur, "conforme");

  // Et l'écran ne le demande pas non plus — ni lui, ni la fonction appelée.
  assert.deepEqual(nomsLus([{ nom: "essai.ref", contenu: source }]),
    ["Nature des volets", "Matériau"]);
});

test("une fonction appelée mais écrite ailleurs ne se demande pas non plus", () => {
  /**
   * **Le cas qui compte vraiment** : la fonction appelée vit dans la **mémoire
   * du projet**, pas dans le brouillon. Rien d'autre ne l'écarte alors — aucun
   * bloc d'ici ne la conclut —, et le formulaire réclamait « Couleur des
   * volets » comme une valeur à taper à la main. On aurait tapé « violet »
   * pour faire taire le champ, et l'essai aurait répondu sur une valeur
   * inventée au lieu de la calculer (règle 5).
   */
  const brouillon = `fonction Teinte(zones, Matériau) {
   calcule x = Couleur des volets(zones, Matériau);
   si (x = "violet")
   alors (1);
}
`;

  assert.deepEqual(nomsLus([{ nom: "essai.ref", contenu: brouillon }]), ["Matériau"]);
});

test("un nom qui vaut un mot se reprend aussi, sans appel", () => {
  /**
   * La reprise ne tient pas à l'appel : `calcule x = Couleur des volets;` sur
   * une fonction qui conclut « violet » butait de la même façon. C'est
   * l'arithmétique qui ne portait pas les mots, pas l'appel qui manquait.
   */
  const rendu = lancerLeBrouillon([{ nom: "essai.ref", contenu: `fonction Couleur des volets(zones, Nature des volets) {
   si (Nature des volets = "bois")
   alors ("violet");
   sinon ("blanc");
}

fonction Contrôle(zones, Nature des volets) {
   calcule c = Couleur des volets;
   si (c = "violet")
   alors ("conforme");
   sinon ("à valider");
}
` }], { "Nature des volets": "bois" });

  assert.equal(rendu.find((un) => un.sujet === "Contrôle")?.valeur, "conforme");
});

test("un appel seul sur sa ligne ne conclut rien, et le dit", () => {
  const dit = refusDe(`fonction F(zones, Matériau) {
   Couleur des volets(Matériau);
   si (Matériau = "bois")
   alors (1);
}
`);

  assert.equal(dit.length, 1);
  assert.match(dit[0], /un appel ne conclut rien tout seul/);
  assert.match(dit[0], /calcule … = Couleur des volets\(…\);/);
});

test("une condition porte un appel, et le repose telle qu'elle a été écrite", () => {
  /**
   * **C'est la forme qu'on écrit naturellement**, et il fallait passer par une
   * locale : une ligne de plus que la langue n'exige pas.
   *
   * Le **sujet** reste le nom de la fonction, et l'appel voyage à côté : tout
   * ce qui lit un sujet comme un nom — le graphe, la recherche d'un nom jamais
   * déclaré — continue de lire un nom. Ranger la ligne entière dans `sujet`
   * aurait fait porter la moitié du projet sur un nom que personne n'a écrit.
   */
  const source = `fonction Teinte(zones, Matériau) {
   si (Couleur des volets(zones, Matériau) = "violet")
   alors ("conforme");
   sinon ("à valider");
}
`;

  assert.deepEqual(refusDe(source), []);

  const bloc = lireUnFichier(source).blocs[0];
  assert.equal(bloc.conditions[0].sujet, "Couleur des volets");
  assert.equal(bloc.conditions[0].appel.ecrit, "Couleur des volets(zones, Matériau)");
  assert.deepEqual(bloc.conditions[0].valeur, ["violet"]);

  // Et elle se réécrit au caractère près : un second écrivain d'expressions
  // finirait par ne plus poser les parenthèses comme le premier (règle 4).
  assert.match(texteDesLignes(blocDeRegle({
    sujet: bloc.sujet, conditions: bloc.conditions, alors: bloc.alors,
    sinon: bloc.sinon, signature: ["zones", "Matériau"]
  })), /^   si \(Couleur des volets\(zones, Matériau\) = "violet"\)$/m);
});

test("une condition qui porte un appel le joue vraiment", () => {
  const source = `fonction Couleur des volets(zones, Nature des volets) {
   si (Nature des volets = "bois")
   alors ("violet");
   sinon ("blanc");
}

fonction Teinte(zones, Matériau) {
   si (Couleur des volets(zones, Matériau) = "violet")
   alors ("conforme");
   sinon ("à valider");
}
`;

  assert.equal(lancerLeBrouillon([{ nom: "essai.ref", contenu: source }], { "Matériau": "bois" })
    .find((un) => un.sujet === "Teinte")?.valeur, "conforme");
  assert.equal(lancerLeBrouillon([{ nom: "essai.ref", contenu: source }], { "Matériau": "alu" })
    .find((un) => un.sujet === "Teinte")?.valeur, "à valider");
});

test("ce qu'une clause appelle se lit, et ne se demande pas", () => {
  /**
   * Une clause qui porte un appel lit **tout ce que l'appel nomme** : la
   * fonction, et ce qu'on lui donne. Ne retenir que le sujet ferait une
   * fonction dont on ne demande jamais les entrées de son propre appel.
   */
  const bloc = lireUnFichier(`fonction Teinte(zones, Matériau) {
   si (Couleur des volets(zones, Matériau) = "violet")
   alors ("conforme");
}
`).blocs[0];

  assert.deepEqual(fonctionsAppeleesParLeBloc(bloc), ["Couleur des volets"]);
  assert.deepEqual(entreesDuBloc(bloc), ["Matériau"]);
  assert.deepEqual(nomsLus([{ nom: "essai.ref", contenu: `fonction Teinte(zones, Matériau) {
   si (Couleur des volets(zones, Matériau) = "violet")
   alors ("conforme");
}
` }]), ["Matériau"]);
});

test("ce qui n'est pas un appel lisible garde son refus", () => {
  // Un nom ne porte pas de parenthèse : une condition acceptée sur un tel nom
  // resterait indécidable pour toujours (règle 5).
  const dit = refusDe(`fonction F(zones, Matériau) {
   si (Couleur des volets(Matériau = "gris")
   alors (1);
}
`);

  assert.equal(dit.length, 1);
  assert.match(dit[0], /cet appel ne se lit pas/);
});

/* ── Ce qu'une fonction annonce, et ce qu'elle réclame ───────────────────── */

test("une fonction appelée n'est pas une entrée à déclarer", () => {
  /**
   * **C'est l'écart que cette ronde a rendu nécessaire.** Un appel lit trois
   * noms — la fonction, la portée, la matière — et un seul est une entrée.
   * Sans cet écart, la vérification réclamait `Teinte du lot B(zones, Couleur
   * des volets, zones, Matériau)` : la portée deux fois, et une fonction du
   * projet déclarée comme une donnée à fournir.
   */
  const bloc = lireUnFichier(DEUX).blocs[1];

  assert.deepEqual(entreesDuBloc(bloc), ["Matériau"]);
  assert.deepEqual(fonctionsAppeleesParLeBloc(bloc), ["Couleur des volets"]);
  // Elle reste **lue** : le bac doit l'avoir pour répondre.
  assert.ok(nomsDuCalcul(lireUnCalcul("Couleur des volets(zones, M)").arbre)
    .includes("Couleur des volets"));

  assert.deepEqual(
    verifierLeBrouillon([{ nom: "essai.ref", contenu: DEUX }])
      .filter((une) => une.quoi === "signature"), []);
});

test("une fonction appelée dans une borne de boucle compte aussi", () => {
  // Les deux questions — quels noms, quelles fonctions — doivent voir les mêmes
  // endroits. Une borne de boucle en est un (règle 10).
  const bloc = lireUnFichier(`fonction F(zones, Hauteur) {
   pour chaque N de 0 m à Portée utile(zones, Hauteur) par pas de 1 m
      calcule C = N * 2 kN;
   si (Hauteur > 0 m)
   alors (C);
}
`).blocs[0];

  assert.deepEqual(fonctionsAppeleesParLeBloc(bloc), ["Portée utile"]);
  assert.ok(!entreesDuBloc(bloc).includes("Portée utile"));
});

/* ── Ce qui n'est pas un appel ───────────────────────────────────────────── */

test("les fonctions du langage ne sont à personne", () => {
  const arbre = lireUnCalcul("racine(Surface) + min(2; 3)").arbre;
  assert.deepEqual(fonctionsAppeleesParLeBloc(
    { calculs: [{ nom: "x", expression: "racine(Surface) + min(2; 3)" }] }), []);
  assert.deepEqual(nomsDuCalcul(arbre), ["Surface"]);
});

test("la virgule sépare, et la virgule décimale reste décimale", () => {
  /**
   * Une virgule décimale ne produit jamais un séparateur : `1,5` est avalé
   * entier par le lecteur de nombres. La signature s'écrivant `(zones, Nature
   * des volets)`, c'est la virgule qu'on écrit — le point-virgule des
   * fonctions du langage reste admis.
   */
  const avecVirgule = lireUnCalcul("Seuil(zones, 1,5)");
  assert.equal(avecVirgule.ok, true);
  assert.equal(avecVirgule.arbre.arguments.length, 2);
  assert.equal(avecVirgule.arbre.arguments[1].valeur, 1.5);

  assert.equal(lireUnCalcul("Seuil(zones; Hauteur)").ok, true);
  assert.deepEqual(lireUnCalcul("Seuil(zones; Hauteur)").arbre.arguments.map((un) => un.nom),
    ["zones", "Hauteur"]);
});

/* ── Ce que la ronde d'avant a corrigé, et qui reste vrai ────────────────── */

test("un mot de la langue collé à sa parenthèse se lit toujours", () => {
  const lu = lireUnFichier(`fonction Garde-corps(zones, Hauteur) {
   si(Hauteur > 1 m)
   alors("dû");
   sinon("non");
}
`);

  assert.deepEqual(lu.refus, []);
  assert.equal(lu.blocs[0].conditions[0].sujet, "Hauteur");
});

test("ce qu'une fonction se calcule n'est toujours pas « déclaré nulle part »", () => {
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

/* ── Ce qu'on donne, comparé à ce que la fonction sait lire ──────────────── */

const AVEC_DOMAINES = `const Nature des volets = {
   type: "texte",
   valeurs possibles: "bois" ou "pvc",
   description: "La matière du volet, au sens du fournisseur.",
};

const Matériau = {
   type: "texte",
   valeurs possibles: "bois" ou "alu" ou "pvc",
   description: "La matière retenue au lot B.",
};

fonction Couleur des volets(zones, Nature des volets) {
   si (Nature des volets = "bois")
   alors ("violet");
   sinon ("blanc");
}
`;

const donnees = (source) => verifierLeBrouillon([{ nom: "essai.ref", contenu: source }])
  .filter((une) => une.quoi === "donne-hors-du-domaine");

test("on prévient quand la fonction ne connaîtra jamais ce qu'on lui donne", () => {
  /**
   * **C'est la faute que l'appel rend possible.** Tant qu'une fonction ne
   * lisait que ses propres noms, son domaine et celui qu'elle lit étaient le
   * même. `Matériau` peut valoir « alu », que `Couleur des volets` ne connaît
   * pas : pour « alu », elle répondra son `sinon` — un résultat parfaitement
   * plausible, et faux, que rien ne signalait.
   */
  const dites = donnees(`${AVEC_DOMAINES}
fonction Teinte(zones, Matériau) {
   calcule x = Couleur des volets(zones, Matériau);
   si (x = "violet")
   alors ("conforme");
}
`);

  assert.equal(dites.length, 1);
  assert.match(dites[0].dit, /« Couleur des volets » lit « Nature des volets »/);
  assert.match(dites[0].dit, /ne vaut que « bois », « pvc »/);
  assert.match(dites[0].dit, /peut valoir « alu »/);
  assert.match(dites[0].dit, /répondra son « sinon »/);
  assert.equal(dites[0].texte, "Matériau");
});

test("une clause qui appelle est contrôlée comme un calcul qui appelle", () => {
  // Les deux formes existent : la faute ne dépend pas de l'endroit où on la
  // commet, et le contrôle ne doit pas non plus (règle 4).
  assert.equal(donnees(`${AVEC_DOMAINES}
fonction Teinte(zones, Matériau) {
   si (Couleur des volets(zones, Matériau) = "violet")
   alors ("conforme");
}
`).length, 1);
});

test("un domaine compris dans l'autre ne se reproche pas", () => {
  // Crier à tort apprend à ne plus lire l'écran, et c'est le défaut qu'on
  // corrige ailleurs, à l'envers.
  assert.deepEqual(donnees(`const Nature des volets = {
   type: "texte",
   valeurs possibles: "bois" ou "alu" ou "pvc",
   description: "La matière du volet.",
};

const Matériau = {
   type: "texte",
   valeurs possibles: "bois" ou "pvc",
   description: "La matière retenue au lot B.",
};

fonction Couleur des volets(zones, Nature des volets) {
   si (Nature des volets = "bois")
   alors ("violet");
   sinon ("blanc");
}

fonction Teinte(zones, Matériau) {
   calcule x = Couleur des volets(zones, Matériau);
   si (x = "violet")
   alors ("conforme");
}
`), []);
});

test("sans deux domaines fermés, on se tait", () => {
  /**
   * Il en faut **deux** pour qu'il y ait une comparaison à faire. Ne pas savoir
   * n'autorise pas à prétendre qu'il n'y a rien, ni l'inverse (règle 5).
   */
  assert.deepEqual(donnees(`const Nature des volets = {
   type: "texte",
   valeurs possibles: "bois" ou "pvc",
   description: "La matière du volet.",
};

fonction Couleur des volets(zones, Nature des volets) {
   si (Nature des volets = "bois")
   alors ("violet");
   sinon ("blanc");
}

fonction Teinte(zones, Matériau) {
   calcule x = Couleur des volets(zones, Matériau);
   si (x = "violet")
   alors ("conforme");
}
`), [], "« Matériau » n'a pas de domaine : il n'y a rien à comparer");
});

test("la portée n'est pas comparée : elle dit où, pas quoi", () => {
  /**
   * Sans cet écart, le premier paramètre — `zones` — se comparait au premier
   * argument, et l'on décalait tout le contrôle d'un rang : on reprochait à
   * « Matériau » ce que « Nature des volets » n'a jamais dit.
   */
  const dites = donnees(`${AVEC_DOMAINES}
fonction Teinte(zones, Matériau) {
   calcule x = Couleur des volets(zones, Matériau);
   si (x = "violet")
   alors ("conforme");
}
`);

  assert.equal(dites.length, 1, "une seule remarque, sur le bon paramètre");
  assert.match(dites[0].dit, /lit « Nature des volets »/);
  assert.doesNotMatch(dites[0].dit, /« zones »/);
});
