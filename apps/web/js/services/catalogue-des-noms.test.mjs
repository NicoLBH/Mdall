/**
 * Ce qu'on peut nommer en écrivant du Mdall.
 *
 * **Tout se déduit d'un vrai brouillon**, et jamais d'objets façonnés ici : une
 * liste écrite à la main prendrait les hypothèses du code pour des faits, et
 * cesserait d'éprouver la lecture du langage le jour où elle change.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  ORIGINE, NOM_DE_LORIGINE, DIT_DE_LORIGINE, ORDRE_DES_ORIGINES,
  catalogueDesNoms, chercherUnNom, nomsDeLetabli, nomsDuBrouillon, nomsDuLangage,
  nomsLisiblesDIci, phraseDuCatalogue, rayonsDesNoms
} from "./catalogue-des-noms.js";
import { FONCTIONS } from "./mdall-calcul.js";

const VARIABLES = [
  "const Type de TVA = {",
  '   type: "texte",',
  '   valeurs possibles: "neuf" ou "rénovation" ou "existant",',
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
  "   // Le taux applicable, selon le type de travaux.",
  "   importe (variable: Type de TVA, depuis: variables-du-projet.ref, zones: zones);",
  '   si (Type de TVA = "neuf")',
  "   alors (20 %);",
  "   sinon (5,5 %);",
  "}",
  "",
  "fonction Prix TTC(zones, Prix HT) {",
  "   calcule TVA = Prix HT * Taux de TVA;",
  "   calcule Prix TTC = Prix HT + TVA;",
  "   si (Prix HT >= 0 €)",
  "   alors (Prix TTC);",
  "}",
  "",
  "Hauteur de référence = 28 m",
  "   texte: Arrêté du 31 janvier 1986"
].join("\n");

const FICHIERS = [
  { nom: "variables-du-projet.ref", contenu: VARIABLES },
  { nom: "essai.ref", contenu: REGLES }
];

const ETABLI = [{
  id: "u1",
  nom: "Descente de charge",
  version: "3",
  resume: "La charge en pied de poteau.",
  entrees: ["Portée (m)", "Charge d'exploitation (kN/m²)"],
  sorties: ["Charge en pied"]
}];

const trouve = (catalogue, nom) => catalogue.find((une) => une.nom === nom);

/* ── Ce que le brouillon met à portée ────────────────────────────────────── */

test("une déclaration entre au catalogue avec ce qu'elle dit d'elle-même", () => {
  // La description d'une déclaration est écrite pour cela. La reformuler ici la
  // ferait diverger de ce qui se lit dans le fichier.
  assert.deepEqual(trouve(nomsDuBrouillon(FICHIERS), "Type de TVA"), {
    nom: "Type de TVA",
    origine: ORIGINE.DECLARE,
    dit: "Le type de travaux.",
    lit: [],
    unite: "",
    valeurs: ["neuf", "rénovation", "existant"],
    ou: "variables-du-projet.ref",
    comme: ""
  });
  assert.equal(trouve(nomsDuBrouillon(FICHIERS), "Prix HT").unite, "€");
});

test("ce qu'une fonction conclut entre au catalogue, avec ce qu'elle lit", () => {
  /**
   * **C'est tout l'objet du catalogue.** Mdall n'a pas d'appel de fonction : une
   * fonction conclut sous son nom, et enchaîner, c'est nommer ce qu'une autre
   * conclut. Sans ce rayon, composer demande de se souvenir de ce qu'on a écrit
   * trente lignes plus haut, et rien à l'écran ne le dit.
   */
  const taux = trouve(nomsDuBrouillon(FICHIERS), "Taux de TVA");
  assert.equal(taux.origine, ORIGINE.CONCLU);
  assert.deepEqual(taux.lit, ["Type de TVA"]);
  assert.equal(taux.ou, "essai.ref");

  /**
   * **Ce qu'un calcul prend compte comme ce qu'une condition compare.**
   * `Prix TTC` lit `Taux de TVA` dans son arithmétique et nulle part ailleurs :
   * le taire ferait croire qu'il suffit d'avoir `Prix HT`.
   */
  assert.deepEqual(trouve(nomsDuBrouillon(FICHIERS), "Prix TTC").lit, ["Prix HT", "Taux de TVA"]);
});

test("une fonction ne dit pas qu'elle a besoin de ce qu'elle pose elle-même", () => {
  // `Prix TTC` pose `TVA` puis la relit : dire qu'il lui faut `TVA` enverrait
  // chercher une valeur que personne n'a, et que la fonction calcule.
  const ttc = trouve(nomsDuBrouillon(FICHIERS), "Prix TTC");
  assert.ok(!ttc.lit.includes("TVA"), "une locale n'est pas une entrée");
  assert.ok(!ttc.lit.includes("Prix TTC"), "une fonction ne se lit pas elle-même");
});

test("une affirmation se range comme posée, et se dit par sa valeur", () => {
  // « 28 m » répond à la question qu'on se pose en la voyant ; aucune phrase ne
  // le ferait mieux.
  const hauteur = trouve(nomsDuBrouillon(FICHIERS), "Hauteur de référence");
  assert.equal(hauteur.origine, ORIGINE.POSE);
  assert.equal(hauteur.dit, "28 m");
  assert.deepEqual(hauteur.lit, []);
  // Et son unité se porte à côté du nom, comme pour une déclaration : « 28 » et
  // « 28 m » ne s'écrivent pas de la même façon dans une condition.
  assert.equal(hauteur.unite, "m");
});

test("une fonction qu'on est en train de taper reste une fonction", () => {
  /**
   * **Le défaut qu'on a vu à l'écran.** Un corps encore vide — `fonction X() {`
   * suivi d'un `si (` qu'on n'a pas fini — n'a ni condition ni calcul, et se
   * rangeait parmi les valeurs posées : l'écran disait « Posé par ce brouillon »
   * sous le nom d'une fonction qu'on écrivait. Ce qui tranche est la valeur, et
   * une fonction n'en porte pas.
   */
  const aMoitie = [{ nom: "essai.ref", contenu: "fonction En cours(zones) {\n   si (\n}\n" }];
  assert.equal(trouve(nomsDuBrouillon(aMoitie), "En cours").origine, ORIGINE.CONCLU);
});

/* ── Le langage, et l'établi ─────────────────────────────────────────────── */

test("les fonctions du langage viennent du langage, et disent ce qu'elles font", () => {
  // Les recopier ici ferait un catalogue qui ne montre pas la fonction qu'on
  // vient d'ajouter au langage, et personne ne verrait pourquoi (règle 10).
  const dites = nomsDuLangage();
  assert.deepEqual(dites.map((une) => une.nom), Object.keys(FONCTIONS));

  for (const une of dites) {
    assert.equal(une.origine, ORIGINE.FONCTION);
    assert.ok(une.dit, `${une.nom} n'a pas de phrase`);
    assert.ok(une.comme.startsWith(`${une.nom}(`), `${une.nom} ne montre pas comment on l'écrit`);
  }
});

test("un utilitaire de l'établi entre par ce qu'il conclut, version comprise", () => {
  // Deux versions d'un utilitaire ne concluent pas forcément la même chose : la
  // version fait partie de l'adresse.
  assert.deepEqual(nomsDeLetabli(ETABLI), [{
    nom: "Charge en pied",
    origine: ORIGINE.ETABLI,
    dit: "La charge en pied de poteau.",
    lit: ["Portée (m)", "Charge d'exploitation (kN/m²)"],
    unite: "",
    valeurs: [],
    ou: "Descente de charge v3",
    comme: ""
  }]);
});

test("un établi qu'on n'a pas lu ne fait pas tomber le catalogue", () => {
  assert.deepEqual(nomsDeLetabli(null), []);
  assert.deepEqual(nomsDeLetabli("des utilitaires"), []);
});

/* ── Le catalogue entier ─────────────────────────────────────────────────── */

test("le catalogue met à portée ce qui est le plus proche d'abord", () => {
  const catalogue = catalogueDesNoms({ fichiers: FICHIERS, etabli: ETABLI, locales: ["TVA"] });
  const origines = [...new Set(catalogue.map((une) => une.origine))];

  // L'ordre est celui du parcours, et il n'est pas alphabétique : une locale est
  // sous le curseur, un utilitaire est ailleurs et demande un geste.
  assert.deepEqual(origines, origines.slice().sort(
    (une, autre) => ORDRE_DES_ORIGINES.indexOf(une) - ORDRE_DES_ORIGINES.indexOf(autre)
  ));
  assert.equal(catalogue[0].nom, "TVA");
  assert.equal(catalogue[0].origine, ORIGINE.LOCALE);
});

test("un nom du brouillon efface celui de l'établi, et la locale gagne sur les deux", () => {
  /**
   * Montrer les deux ferait choisir entre deux fiches identiques dont une seule
   * marche : celle du brouillon se lit d'ici, celle de l'établi demande de
   * reprendre l'utilitaire.
   */
  const memeNom = [{ nom: "essai.ref", contenu: "Charge en pied = 120 kN\n   texte: note\n" }];
  const catalogue = catalogueDesNoms({ fichiers: memeNom, etabli: ETABLI });

  assert.deepEqual(
    catalogue.filter((une) => une.nom === "Charge en pied").map((une) => une.origine),
    [ORIGINE.POSE]
  );

  // Et la locale prend la place du même nom déclaré : c'est elle qu'on lit ici.
  const avecLocale = catalogueDesNoms({ fichiers: FICHIERS, locales: ["Prix HT"] });
  assert.deepEqual(
    avecLocale.filter((une) => une.nom === "Prix HT").map((une) => une.origine),
    [ORIGINE.LOCALE]
  );
});

test("les fonctions du langage ne rivalisent avec personne", () => {
  // `min` n'est pas un nom qu'on lit, c'est un mot qu'on écrit : un brouillon
  // qui déclare « min » ne doit pas effacer la fonction du catalogue.
  const homonyme = [{ nom: "essai.ref", contenu: "min = 3 m\n   texte: note\n" }];
  const catalogue = catalogueDesNoms({ fichiers: homonyme });

  assert.deepEqual(
    catalogue.filter((une) => une.nom === "min").map((une) => une.origine),
    [ORIGINE.POSE, ORIGINE.FONCTION]
  );
});

test("un nom de l'établi se parcourt, et ne se propose pas sous le curseur", () => {
  /**
   * **C'est la seule différence entre les deux lectures du catalogue.** Un
   * utilitaire gardé vit dans un autre brouillon : proposer son nom à la frappe
   * ferait écrire une fonction qui lit un nom que personne ne conclut ici, et la
   * règle resterait indécidable pour toujours sans qu'un mot dise pourquoi.
   */
  const catalogue = catalogueDesNoms({ fichiers: FICHIERS, etabli: ETABLI });
  assert.ok(catalogue.some((une) => une.origine === ORIGINE.ETABLI));
  assert.ok(!nomsLisiblesDIci(catalogue).some((une) => une.origine === ORIGINE.ETABLI));
  // Tout le reste se lit d'ici, et passe.
  assert.equal(
    nomsLisiblesDIci(catalogue).length,
    catalogue.filter((une) => une.origine !== ORIGINE.ETABLI).length
  );
});

test("un brouillon vide laisse le langage, et rien d'autre", () => {
  const catalogue = catalogueDesNoms({});
  assert.deepEqual(catalogue.map((une) => une.origine), catalogue.map(() => ORIGINE.FONCTION));
  assert.deepEqual(catalogueDesNoms(), catalogue);
});

/* ── Chercher, et ranger ─────────────────────────────────────────────────── */

test("on cherche par le nom, par ce qu'une entrée dit, et par ce qu'elle lit", () => {
  /**
   * **On cherche rarement par le nom exact.** « qu'est-ce qui me sort quelque
   * chose à partir du prix HT ? » est une question qu'on se pose vraiment, et le
   * nom cherché n'est alors dans aucun intitulé.
   */
  const catalogue = catalogueDesNoms({ fichiers: FICHIERS, etabli: ETABLI });
  const noms = (quoi) => chercherUnNom(catalogue, quoi).map((une) => une.nom);

  // À rang égal, l'ordre du catalogue tient : ce qui est le plus près du
  // curseur reste le plus haut, et la recherche ne le réordonne pas.
  assert.deepEqual(noms("TVA"), ["Type de TVA", "Taux de TVA", "Prix TTC"]);
  // « travaux » n'est dans aucun nom : il est dans ce que la déclaration dit.
  assert.deepEqual(noms("travaux"), ["Type de TVA"]);
  // « Prix HT » n'est pas le nom de `Prix TTC` : c'est ce qu'il lit.
  assert.ok(noms("prix ht").includes("Prix TTC"));
  // Et l'on retrouve un utilitaire par son propre nom, qui est son « d'où ».
  assert.deepEqual(noms("Descente"), ["Charge en pied"]);
});

test("ce qui commence par ce qu'on tape passe devant ce qui le contient", () => {
  // Un « contient » seul remonterait « Taux de TVA » avant « TVA ».
  const catalogue = catalogueDesNoms({ fichiers: FICHIERS, locales: ["TVA"] });
  assert.deepEqual(chercherUnNom(catalogue, "TVA").map((une) => une.nom),
    ["TVA", "Type de TVA", "Taux de TVA", "Prix TTC"]);

  /**
   * **Et il passe devant même quand il vient après**, ce qui est le seul cas
   * où le rang décide vraiment : `Altitude du bas` est déclaré en premier, et
   * pourtant c'est `bas de pente` qu'on cherchait en tapant « bas ».
   */
  const deuxNoms = [{
    nom: "essai.ref",
    contenu: [
      "Altitude du bas = 3 m", "   texte: plan", "",
      "bas de pente = 1 m", "   texte: plan"
    ].join("\n")
  }];
  assert.deepEqual(
    chercherUnNom(catalogueDesNoms({ fichiers: deuxNoms }), "bas").map((une) => une.nom),
    ["bas de pente", "Altitude du bas"]
  );
});

test("une recherche vide rend tout, et une recherche sans réponse rend rien", () => {
  const catalogue = catalogueDesNoms({ fichiers: FICHIERS });
  assert.equal(chercherUnNom(catalogue, "").length, catalogue.length);
  assert.equal(chercherUnNom(catalogue, "   ").length, catalogue.length);
  // Ce qui n'est écrit nulle part ne se propose pas : on ne devine pas.
  assert.deepEqual(chercherUnNom(catalogue, "zzz"), []);
});

test("la casse et les accents ne comptent pas, comme partout dans le projet", () => {
  const catalogue = catalogueDesNoms({ fichiers: FICHIERS });
  // Et l'on cherche aussi dans le domaine fermé d'un nom : « qu'est-ce qui
  // parle de rénovation ? » se pose devant un écran dont on ignore les noms.
  assert.deepEqual(chercherUnNom(catalogue, "RÉNOVATION").map((une) => une.nom), ["Type de TVA"]);
  // Et `Taux de TVA` répond aussi, parce qu'il **lit** « Type de TVA » : c'est
  // exactement ce qu'on cherche quand on tape le nom d'une entrée qu'on a.
  assert.deepEqual(chercherUnNom(catalogue, "type de tva").map((une) => une.nom),
    ["Type de TVA", "Taux de TVA"]);
  assert.deepEqual(chercherUnNom(catalogue, "HAUTEUR DE RÉFÉRENCE").map((une) => une.nom),
    ["Hauteur de référence"]);
});

test("un rayon vide ne paraît pas, et chacun porte son titre", () => {
  // Six titres dont quatre ne disent rien apprendraient à ne plus lire les
  // titres.
  const rayons = rayonsDesNoms(catalogueDesNoms({ fichiers: FICHIERS, etabli: ETABLI }));
  assert.deepEqual(rayons.map((un) => un.origine),
    [ORIGINE.DECLARE, ORIGINE.CONCLU, ORIGINE.POSE, ORIGINE.FONCTION, ORIGINE.ETABLI]);

  for (const rayon of rayons) {
    assert.ok(rayon.titre, `${rayon.origine} n'a pas de titre`);
    assert.ok(rayon.dit, `${rayon.origine} ne dit pas ce qu'il est`);
    assert.ok(rayon.noms.length);
  }

  assert.deepEqual(rayonsDesNoms([]), []);
});

test("chaque origine a son titre et sa phrase, sans qu'aucune se perde", () => {
  // Une origine ajoutée sans titre paraîtrait sous un intitulé vide, et sans
  // phrase elle ne dirait pas ce qu'elle est.
  for (const origine of Object.values(ORIGINE)) {
    assert.ok(NOM_DE_LORIGINE[origine], `pas de titre : ${origine}`);
    assert.ok(DIT_DE_LORIGINE[origine], `pas de phrase : ${origine}`);
    assert.ok(ORDRE_DES_ORIGINES.includes(origine), `hors du parcours : ${origine}`);
  }
  assert.equal(ORDRE_DES_ORIGINES.length, Object.values(ORIGINE).length);
});

test("le compte se dit en français, et zéro ne se dit pas", () => {
  // « 0 nom » se lit comme une panne, alors que c'est un brouillon vide.
  assert.equal(phraseDuCatalogue([]), "");
  assert.equal(phraseDuCatalogue([{ nom: "A" }]), "1 nom");
  assert.equal(phraseDuCatalogue([{ nom: "A" }, { nom: "B" }]), "2 noms");
});
