/**
 * L'établi offert au Copilote de tous les projets.
 *
 * Deux choses s'y jouent, et elles ne se vérifient pas au même endroit :
 * **ce qu'un utilitaire répond**, qui est du calcul pur et s'éprouve ici, et
 * **à qui il est offert**, qui est une cloison et s'éprouve en lisant le code
 * des deux côtés (`copilote-cloison.test.mjs`).
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  PREFIXE_DE_LOUTIL, declarationsDeLetabli, nomDeLoutil,
  reponseDeLutilitaire, sectionDeLetabli, utilitaireDeLoutil
} from "./etabli-du-copilote.js";
import { executerUnUtilitaireDeLetabli } from "./copilote-etabli.js";

const DECLARATIONS = [
  "const Type de TVA = {",
  '   type: "texte",',
  '   valeurs possibles: "existant" ou "rénovation" ou "neuf",',
  '   description: "Le type de travaux.",',
  "};",
  "",
  "const Prix HT = {",
  '   type: "mesure",',
  '   unité: "€",',
  '   description: "Le prix hors taxes.",',
  "};"
].join("\n");

const REGLES = [
  "fonction Taux de TVA(zones, Type de TVA) {",
  "   importe (variable: Type de TVA, depuis: variables-du-projet.ref, zones: zones);",
  '   si (Type de TVA = "existant")',
  "   alors (5,5 %);",
  '   sinon si (Type de TVA = "rénovation")',
  "   alors (10 %);",
  '   sinon si (Type de TVA = "neuf")',
  "   alors (20 %);",
  "}",
  "",
  "fonction Prix TTC(zones, Prix HT, Taux de TVA) {",
  "   importe (variable: Prix HT, depuis: variables-du-projet.ref, zones: zones);",
  "   importe (variable: Taux de TVA, depuis: essai.ref, zones: zones);",
  "   calcule TVA = Prix HT * Taux de TVA;",
  "   calcule Prix TTC = Prix HT + TVA;",
  "   si (Prix HT >= 0 €)",
  "   alors (Prix TTC);",
  "}"
].join("\n");

const OUTIL = {
  id: "11111111-1111-4111-8111-111111111111",
  nom: "Calcul de TVA",
  version: "3",
  resume: "Le prix TTC selon la nature des travaux.",
  entrees: ["Type de TVA", "Prix HT"],
  sorties: ["Taux de TVA", "Prix TTC"],
  fichiers: [
    { nom: "variables-du-projet.ref", contenu: DECLARATIONS },
    { nom: "essai.ref", contenu: REGLES }
  ]
};

/* ── Ce qu'un utilitaire répond ──────────────────────────────────────────── */

test("un utilitaire de l'établi répond à la question qu'on lui pose", () => {
  // **La question telle qu'elle a été posée au Copilote** : « si mon prix de
  // travaux dans l'existant est de 3 200 €, combien en TTC ? ». Il répondait
  // qu'il ne savait pas — et il avait raison, l'établi n'est dans la mémoire
  // d'aucun projet. Il sait maintenant le lancer.
  const rendu = reponseDeLutilitaire(OUTIL, { "type de tva": "existant", "prix ht": 3200 });

  assert.deepEqual(rendu.utilitaire, { nom: "Calcul de TVA", version: "3" });
  assert.deepEqual(rendu.manque, []);

  const dit = Object.fromEntries(rendu.conclusions.map((une) => [une.sujet, une.valeur]));
  assert.equal(dit["Taux de TVA"], "5,5 %");
  assert.equal(dit["Prix TTC"], "3376 €");
});

test("il rend la trace de ce qu'il a lu, pas seulement le chiffre", () => {
  // Une réponse sans sa trace n'apprend rien, et c'est exactement ce qu'on
  // refuse à un agent : on ne va pas l'accepter d'une règle écrite à la main.
  const rendu = reponseDeLutilitaire(OUTIL, { "type de tva": "neuf", "prix ht": 1000 });
  const taux = rendu.conclusions.find((une) => une.sujet === "Taux de TVA");

  assert.equal(taux.valeur, "20 %");
  assert.deepEqual(taux.lu.map((une) => [une.sujet, une.verite]),
    [["Type de TVA", false], ["Type de TVA", false], ["Type de TVA", true]]);

  const prix = rendu.conclusions.find((une) => une.sujet === "Prix TTC");
  assert.deepEqual(prix.calculs.map((un) => [un.nom, un.valeur]),
    [["TVA", "200 €"], ["Prix TTC", "1200 €"]]);
});

test("ce qui manque se dit, et ne s'invente pas", () => {
  // **Le mode de défaillance qui coûte le plus cher.** Un modèle à qui il
  // manque un prix en met un plausible, et le chiffre rendu est indiscernable
  // d'un chiffre juste (règle 5).
  const rendu = reponseDeLutilitaire(OUTIL, { "type de tva": "existant" });

  assert.deepEqual(rendu.manque, ["Prix HT"]);
  assert.equal(rendu.conclusions.find((une) => une.sujet === "Prix TTC").valeur, "");
});

test("le nom de la personne peut se donner à la place de la clé", () => {
  // Le modèle lit « Prix HT — en € » dans la description : qu'il renvoie la
  // clé ou le nom, la réponse doit être la même.
  const parLeNom = reponseDeLutilitaire(OUTIL, { "Type de TVA": "neuf", "Prix HT": "1000" });

  assert.equal(parLeNom.conclusions.find((une) => une.sujet === "Prix TTC").valeur, "1200 €");
});

/* ── Ce que le modèle se voit offrir ─────────────────────────────────────── */

test("chaque utilitaire devient un outil, nommé par son identifiant", () => {
  // **Jamais par son nom** : « Calcul de TVA » porte des espaces, se renomme,
  // et deux outils peuvent se ressembler. L'identifiant ne bouge jamais.
  const [declaration] = declarationsDeLetabli([OUTIL]);

  assert.ok(declaration.name.startsWith(PREFIXE_DE_LOUTIL));
  assert.match(declaration.name, /^[A-Za-z0-9_-]+$/, "un nom d'outil ne prend pas ce caractère");
  assert.equal(utilitaireDeLoutil(declaration.name, [OUTIL]), OUTIL);

  // La description porte le nom lisible, la version, et ce qu'il fait.
  assert.match(declaration.description, /Calcul de TVA \(utilitaire personnel, v3\)/);
  assert.match(declaration.description, /Le prix TTC selon la nature des travaux/);
});

test("les entrées de l'outil sont celles que le formulaire demande", () => {
  const [{ parameters }] = declarationsDeLetabli([OUTIL]);

  assert.deepEqual(Object.keys(parameters.properties), ["type de tva", "prix ht"]);
  // Un domaine fermé se ferme aussi pour le modèle : sans l'énumération, il
  // écrirait « ancien » ou « rénovation lourde », et rien ne conclurait.
  assert.deepEqual(parameters.properties["type de tva"].enum, ["existant", "rénovation", "neuf"]);
  assert.equal(parameters.properties["prix ht"].type, "number");
  assert.match(parameters.properties["prix ht"].description, /en €/);
});

test("aucune entrée n'est requise, pour qu'aucune ne s'invente", () => {
  // **Un schéma qui exige tout fait remplir tout.** Le modèle doit pouvoir
  // appeler avec ce qu'il a, recevoir « il manque le prix », et poser la
  // question — plutôt que d'y répondre à la place de la personne.
  const [{ parameters }] = declarationsDeLetabli([OUTIL]);

  assert.deepEqual(parameters.required, []);
});

test("un utilitaire sans texte ne devient pas un outil", () => {
  // Il n'aurait ni entrée ni conclusion : l'offrir ferait un outil qui ne
  // répond jamais, et le modèle l'appellerait quand même.
  assert.deepEqual(declarationsDeLetabli([{ ...OUTIL, fichiers: [] }]), []);
  assert.deepEqual(declarationsDeLetabli([{ ...OUTIL, id: "" }]), []);
  assert.deepEqual(declarationsDeLetabli(null), []);
});

test("un nom d'outil qui n'est pas de l'établi ne désigne rien", () => {
  assert.equal(utilitaireDeLoutil("dimensionnement_fondations", [OUTIL]), null);
  assert.equal(utilitaireDeLoutil("", [OUTIL]), null);
  assert.equal(nomDeLoutil(null), "");
});

/* ── Ce que le profil en dit ─────────────────────────────────────────────── */

test("le profil liste l'établi, et demande qu'on cite l'outil employé", () => {
  // **C'est la consigne qui rend la réponse vérifiable.** Sans elle, on ne sait
  // pas si le chiffre vient d'une règle écrite à la main ou du modèle, et les
  // deux ne se vérifient pas de la même façon (fondamental 13).
  const dit = sectionDeLetabli([OUTIL]);

  assert.match(dit, /## Votre établi/);
  assert.match(dit, /\*\*Calcul de TVA\*\* \(v3\)/);
  assert.match(dit, /prend : Type de TVA, Prix HT/);
  assert.match(dit, /rend : Taux de TVA, Prix TTC/);
  assert.match(dit, /dis-le\*\* : son nom et sa version/);
  // Et il rappelle ce qu'ils ne sont pas : la garantie que l'utilisateur a
  // demandée, dite au modèle plutôt que supposée.
  assert.match(dit, /ne valent pour aucun projet tant qu'ils n'y ont pas\s*\n?\s*été versés/);
});

test("un établi vide ne dit rien, plutôt que de dire qu'il est vide", () => {
  // On ne sait pas si la lecture a échoué. « Votre établi est vide » à
  // quelqu'un qui y a posé douze outils lui en ferait réécrire un treizième.
  assert.equal(sectionDeLetabli([]), "");
  assert.equal(sectionDeLetabli(null), "");
});

/* ── L'exécution, telle que le fil la montre ─────────────────────────────── */

test("l'exécution annonce l'utilitaire et sa version avant de lancer", async () => {
  const etapes = [];
  const { resultat, pourLeModele } = await executerUnUtilitaireDeLetabli({
    nom: nomDeLoutil(OUTIL),
    entrees: { "type de tva": "existant", "prix ht": 3200 },
    etabli: [OUTIL],
    onEtape: (etape) => etapes.push(etape)
  });

  assert.match(etapes[0].texte, /Calcul de TVA v3/);
  assert.equal(resultat.statut, "fait");
  assert.match(resultat.titre, /Calcul de TVA v3/);
  assert.match(resultat.message, /Prix TTC : 3376 €/);

  // Ce que le modèle lit porte le nom sous la main, et le rappel de le citer.
  assert.deepEqual(pourLeModele.utilitaire, { nom: "Calcul de TVA", version: "3" });
  assert.match(pourLeModele.rappel, /Cite cet utilitaire/);
});

test("une entrée qui manque n'est pas une panne, c'est une question", async () => {
  const { resultat, pourLeModele } = await executerUnUtilitaireDeLetabli({
    nom: nomDeLoutil(OUTIL), entrees: { "type de tva": "neuf" }, etabli: [OUTIL]
  });

  // « Refus » ferait annoncer une panne là où il suffit de demander un prix.
  assert.equal(resultat.statut, "fait");
  assert.match(resultat.message, /Il manque : Prix HT/);
  assert.deepEqual(pourLeModele.manque, ["Prix HT"]);
});

test("un utilitaire retiré de l'établi ne se remplace pas par le voisin", async () => {
  // Le cas existe : on retire un utilitaire dans un onglet pendant qu'une
  // conversation est ouverte dans l'autre. Lancer « le plus proche » rendrait
  // un chiffre calculé par une règle que personne n'a demandée.
  const { resultat, pourLeModele } = await executerUnUtilitaireDeLetabli({
    nom: nomDeLoutil(OUTIL), entrees: {}, etabli: []
  });

  assert.equal(resultat.statut, "refus");
  assert.equal(pourLeModele.lance, false);
  assert.equal(pourLeModele.raison, "utilitaire-introuvable");
});
