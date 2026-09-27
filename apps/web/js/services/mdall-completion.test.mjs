/**
 * Ce que l'écran propose pendant qu'on écrit : où, quoi, et surtout quand rien.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  propositionsDeSaisie, motEnCours, ceQuAttendLaLigne, sujetCompare,
  appliquerLaProposition, ouEstLeCurseur, localesAuDessus, contexteDuBrouillon,
  ATTEND, QUOI
} from "./mdall-completion.js";
import { ORIGINE, catalogueDesNoms, nomsLisiblesDIci } from "./catalogue-des-noms.js";

/**
 * **Le catalogue se déduit d'un vrai brouillon**, et non d'objets écrits à la
 * main : une liste façonnée ici prendrait les hypothèses du code pour des faits,
 * et cesserait d'éprouver la lecture du langage le jour où elle change.
 */
const VARIABLES = [
  "const Zone de vent = {",
  '   type: "texte",',
  '   valeurs possibles: "1" ou "2" ou "3" ou "4",',
  '   description: "Zone de vent de la commune.",',
  "};",
  "",
  "const Prix HT = {",
  '   type: "mesure",',
  '   unité: "€",',
  '   description: "Prix hors taxes.",',
  "};",
  "",
  "const Niveau du sol = {",
  '   type: "mesure",',
  '   unité: "m",',
  '   description: "Cote NGF du terrain.",',
  "};"
].join("\n");

const CATALOGUE = catalogueDesNoms({
  fichiers: [{ nom: "variables-du-projet.ref", contenu: VARIABLES }],
  locales: ["TVA"]
});

const propose = (ligne, colonne = ligne.length, reste = {}) =>
  propositionsDeSaisie({
    ligne, colonne, catalogue: CATALOGUE, fichiers: ["essai.ref", "prix.ddb"], ...reste
  }).map((une) => une.texte);

/** Un catalogue de noms nus, pour les épreuves qui ne parlent que du rangement. */
const nomsNus = (...noms) => noms.map((nom) => ({ nom, origine: ORIGINE.DECLARE }));

/* ── Ce que la ligne attend ──────────────────────────────────────────────── */

test("le début d'une ligne attend un mot du langage", () => {
  assert.equal(ceQuAttendLaLigne("   fonc", 7), ATTEND.MOT);
  assert.equal(ceQuAttendLaLigne("", 0), ATTEND.MOT);
  assert.equal(ceQuAttendLaLigne("   ", 3), ATTEND.MOT);
});

test("une condition ouverte attend un nom, un comparateur une valeur", () => {
  assert.equal(ceQuAttendLaLigne("   si (Zone", 11), ATTEND.NOM);
  assert.equal(ceQuAttendLaLigne("   si (Zone de vent = ", 22), ATTEND.VALEUR);
  assert.equal(ceQuAttendLaLigne("   si (Hauteur <= ", 18), ATTEND.VALEUR);
});

test("un fichier, un statut : chacun a sa place", () => {
  assert.equal(ceQuAttendLaLigne("   importe (depuis: ", 20), ATTEND.FICHIER);
  assert.equal(ceQuAttendLaLigne("   statut: ret", 14), ATTEND.STATUT);
});

test("dans une chaîne, dans un commentaire, sur une provenance : rien", () => {
  // Ce qu'on écrit là est du texte, et le langage n'a rien à y dire.
  assert.equal(ceQuAttendLaLigne("   // fonc", 10), ATTEND.RIEN);
  assert.equal(ceQuAttendLaLigne('   alors ("fonc', 15), ATTEND.RIEN);
  assert.equal(ceQuAttendLaLigne("   texte: NF EN 1991", 20), ATTEND.RIEN);
  // La chaîne refermée rend la parole au langage.
  assert.notEqual(ceQuAttendLaLigne('   alors ("120 km/h") ', 22), ATTEND.RIEN);
});

/* ── Le mot en cours ─────────────────────────────────────────────────────── */

test("le mot en cours traverse les espaces, parce qu'un nom en porte", () => {
  // Le couper au premier espace ne proposerait jamais rien au-delà du premier
  // mot, ce qui est précisément le moment où l'on a besoin d'aide.
  assert.deepEqual(motEnCours("   si (Zone de v", 16), { debut: 7, mot: "Zone de v" });
  assert.equal(motEnCours("   fonc", 7).mot, "fonc");
  assert.equal(motEnCours("   si (", 7).mot, "");
  assert.equal(motEnCours("   calcule TVA = Prix", 21).mot, "Prix");
});

test("le nom comparé se lit à gauche du signe", () => {
  assert.equal(sujetCompare("   si (Zone de vent = ", 22), "Zone de vent");
  assert.equal(sujetCompare("   si (Hauteur du plancher bas <= 8", 35), "Hauteur du plancher bas");
  assert.equal(sujetCompare("   si (", 7), "");
});

/* ── Ce qu'on propose ────────────────────────────────────────────────────── */

test("un mot du langage se propose sur ce qu'on a commencé à taper", () => {
  assert.ok(propose("   fonc").includes("fonction"));
  assert.ok(propose("   calcu").includes("calcule"));
  assert.ok(propose("   sauf").includes("sauf si"));
});

test("les noms déclarés se proposent dans une condition, et les locales avec", () => {
  assert.deepEqual(propose("   si (Prix"), ["Prix HT"]);
  assert.deepEqual(propose("   alors (TV"), ["TVA"]);
  // Le nom du projet et la locale se distinguent, parce qu'ils ne se cherchent
  // pas au même endroit.
  const [une] = propositionsDeSaisie({ ligne: "   alors (TV", colonne: 12, catalogue: CATALOGUE });
  assert.equal(une.quoi, QUOI.LOCALE);
});

test("derrière un comparateur, on ne propose que le domaine du nom comparé", () => {
  // Proposer toutes les valeurs du projet ferait une liste où l'on ne trouve
  // rien, et où l'on choisirait la mauvaise.
  assert.deepEqual(propose("   si (Zone de vent = "), ['"1"', '"2"', '"3"', '"4"']);
  // Un nom sans domaine fermé n'a rien à proposer : inventer une valeur se
  // taperait plus vite qu'elle ne se vérifie.
  assert.deepEqual(propose("   si (Prix HT > "), []);
});

test("chaque origine lisible sait quelle sorte elle est sous le curseur", () => {
  /**
   * La liste sous le curseur dit la **sorte** de ce qu'elle propose — « nom du
   * projet », « calculé ici ». Une origine ajoutée au catalogue sans sorte
   * tomberait sur le défaut et se dirait « nom du projet » : c'est plausible, et
   * donc indiscernable d'un vrai nom du projet.
   */
  const catalogue = catalogueDesNoms({
    fichiers: [{ nom: "variables-du-projet.ref", contenu: VARIABLES }],
    locales: ["TVA"]
  });
  const origines = new Set(nomsLisiblesDIci(catalogue).map((une) => une.origine));

  // Le brouillon d'épreuve ne porte pas toutes les origines : on éprouve la
  // carte sur celles qu'il porte, et l'on vérifie qu'aucune lisible n'y manque.
  // Deux rayons se parcourent sans se proposer : l'établi, qui ne se lit pas
  // d'ici, et les agrégats, qui ne sont pas des noms.
  for (const origine of Object.values(ORIGINE)) {
    if (origine === ORIGINE.ETABLI || origine === ORIGINE.AGREGAT) continue;
    const dessus = propositionsDeSaisie({
      ligne: "   si (X", colonne: 8, catalogue: [{ nom: "Xavier", origine }]
    });
    assert.equal(dessus.length, 1, `${origine} ne se propose plus`);
    assert.notEqual(dessus[0].quoi, undefined, `pas de sorte : ${origine}`);
  }
  assert.ok(origines.size >= 2, "l'épreuve ne porte plus qu'une seule origine");

  // Et une origine que ce module ne connaît pas ne prend pas la sorte d'une
  // autre : l'écran ne dit rien plutôt que de dire faux.
  const inconnue = propositionsDeSaisie({
    ligne: "   si (X", colonne: 8, catalogue: [{ nom: "Xavier", origine: "venue-dailleurs" }]
  });
  assert.equal(inconnue[0].quoi, undefined);
});

test("un nom de l'établi ne se propose pas : il ne se lit pas d'ici", () => {
  /**
   * **C'est la seule différence entre le catalogue qu'on parcourt et la liste
   * sous le curseur**, et elle n'est pas cosmétique : un utilitaire gardé vit
   * dans un autre brouillon. Proposer son nom ferait écrire une fonction qui
   * lit un nom que personne ne conclut ici, et la règle resterait indécidable
   * pour toujours sans qu'un mot dise pourquoi.
   */
  const catalogue = catalogueDesNoms({
    fichiers: [{ nom: "variables-du-projet.ref", contenu: VARIABLES }],
    etabli: [{
      id: "u1", nom: "Descente de charge", version: "3", resume: "La charge en pied.",
      entrees: ["Portée (m)"], sorties: ["Charge en pied"]
    }]
  });

  // Il est bien au catalogue — c'est pour cela qu'on peut le parcourir.
  assert.ok(catalogue.some((une) => une.nom === "Charge en pied"));
  // Et il ne se propose pas, alors que le nom déclaré juste à côté se propose.
  assert.deepEqual(
    propositionsDeSaisie({ ligne: "   si (Charge", colonne: 13, catalogue }).map((u) => u.texte),
    []
  );
  assert.deepEqual(
    propositionsDeSaisie({ ligne: "   si (Prix", colonne: 11, catalogue }).map((u) => u.texte),
    ["Prix HT"]
  );
});

test("un nom qui n'existe nulle part ne se propose jamais", () => {
  assert.deepEqual(propose("   si (Zzz"), []);
  assert.deepEqual(propose("   si (Hauteur", 13, { catalogue: [] }), []);
});

test("rien ne se propose dans un commentaire ni dans une chaîne", () => {
  assert.deepEqual(propose("   // fonc"), []);
  assert.deepEqual(propose('   alors ("Prix'), []);
});

test("ce qui commence par ce qu'on tape passe devant ce qui le contient", () => {
  // **L'ordre alphabétique dirait le contraire**, et c'est ce qui rend cette
  // épreuve utile : on cherche d'abord ce qu'on a commencé à écrire.
  const catalogue = nomsNus("Altitude du bas", "bas de pente");
  assert.deepEqual(
    propositionsDeSaisie({ ligne: "   si (bas", colonne: 10, catalogue }).map((u) => u.texte),
    ["bas de pente", "Altitude du bas"]
  );
});

test("la casse et les accents ne comptent pas", () => {
  assert.deepEqual(propose("   si (zone de VENT"), ["Zone de vent"]);
  assert.deepEqual(propose("   si (Niveau du SOL"), ["Niveau du sol"]);
});

test("on ne propose jamais plus que ce qui se lit d'un coup d'œil", () => {
  const beaucoup = nomsNus(...Array.from({ length: 40 }, (_, rang) => `Nom ${rang}`));
  assert.equal(propositionsDeSaisie({ ligne: "   si (Nom", colonne: 10, catalogue: beaucoup }).length, 8);
  assert.equal(
    propositionsDeSaisie({ ligne: "   si (Nom", colonne: 10, catalogue: beaucoup, combien: 3 }).length, 3
  );
});

/* ── Poser une proposition ───────────────────────────────────────────────── */

test("la proposition remplace le mot en cours, elle ne s'y ajoute pas", () => {
  // On a pu taper « vent » pour trouver « Zone de vent » : coller derrière
  // aurait donné « ventZone de vent ».
  assert.deepEqual(appliquerLaProposition("   si (Zone de v", 16, "Zone de vent"),
    { ligne: "   si (Zone de vent", colonne: 19 });
  assert.deepEqual(appliquerLaProposition("   fonc", 7, "fonction"),
    { ligne: "   fonction", colonne: 11 });
  // Ce qui suit le curseur reste.
  assert.deepEqual(appliquerLaProposition("   si (Zone)", 11, "Zone de vent"),
    { ligne: "   si (Zone de vent)", colonne: 19 });
});

test("poser rien ne touche à rien", () => {
  assert.deepEqual(appliquerLaProposition("   si (", 7, ""), { ligne: "   si (", colonne: 7 });
  assert.deepEqual(appliquerLaProposition("", 0, "si"), { ligne: "si", colonne: 2 });
});

test("le curseur se dit en ligne et en colonne", () => {
  assert.deepEqual(ouEstLeCurseur("ab\ncde\nf", 0), { rang: 0, colonne: 0 });
  assert.deepEqual(ouEstLeCurseur("ab\ncde\nf", 5), { rang: 1, colonne: 2 });
  assert.deepEqual(ouEstLeCurseur("ab\ncde\nf", 8), { rang: 2, colonne: 1 });
});

/* ── Le contexte d'un brouillon ──────────────────────────────────────────── */

const FONCTIONS = [
  "fonction Prix TTC(zones, Prix HT) {",
  "   calcule TVA = Prix HT * 20%;",
  "   calcule Prix TTC = Prix HT + TVA;",
  "   si (",
  "}",
  "",
  "fonction Autre(zones) {",
  "   si ("
].join("\n");

test("une locale ne se propose que dans sa fonction", () => {
  // Elle ne vit que là : la proposer ailleurs ferait écrire un renvoi vers rien.
  assert.deepEqual(localesAuDessus(FONCTIONS, FONCTIONS.indexOf("   si (") + 7), ["TVA", "Prix TTC"]);
  assert.deepEqual(localesAuDessus(FONCTIONS, FONCTIONS.length), []);
  assert.deepEqual(localesAuDessus("si (A = 1)", 5), []);

  // **Hors de toute fonction, rien.** Un `calcule` qui n'est dans aucune
  // fonction est refusé à la lecture ; le proposer ferait écrire une ligne dont
  // on sait déjà qu'elle ne se lira pas.
  assert.deepEqual(localesAuDessus("calcule Orphelin = 2;\n   si (", 30), []);
});

test("une locale écrite plus bas ne se propose pas plus haut", () => {
  // On lit un fichier de haut en bas ; proposer ce qui n'est pas encore posé
  // ferait écrire une ligne qui ne se lit pas.
  const tot = FONCTIONS.indexOf("   calcule TVA") + 5;
  assert.deepEqual(localesAuDessus(FONCTIONS, tot), []);
});

test("le contexte assemble le catalogue, déclarations et locales comprises", () => {
  /**
   * **C'est le seul endroit où la liste s'assemble.** Le panneau qu'on parcourt
   * et la liste sous le curseur sortent tous les deux d'ici : deux assemblages
   * voisins montreraient un jour deux choses différentes (règle 10).
   */
  const variables = [
    "const Zone de vent = {",
    '   type: "texte",',
    '   valeurs possibles: "1" ou "2",',
    '   description: "La zone de vent.",',
    "};"
  ].join("\n");
  const contexte = contexteDuBrouillon(
    [{ nom: "variables-du-projet.ref", contenu: variables }, { nom: "essai.ref", contenu: FONCTIONS }],
    { contenu: FONCTIONS, position: FONCTIONS.indexOf("   si (") + 7 }
  );

  const trouve = (nom) => contexte.catalogue.find((une) => une.nom === nom);

  assert.deepEqual(trouve("Zone de vent"), {
    nom: "Zone de vent", origine: ORIGINE.DECLARE, dit: "La zone de vent.",
    lit: [], unite: "", valeurs: ["1", "2"], ou: "variables-du-projet.ref", comme: ""
  });
  // Les locales de la fonction où l'on écrit, et elles passent devant : ce qui
  // est sous le curseur est ce qu'on cherche le plus souvent.
  assert.deepEqual(
    contexte.catalogue.filter((une) => une.origine === ORIGINE.LOCALE).map((une) => une.nom),
    ["TVA", "Prix TTC"]
  );
  // **Et ce qu'une autre fonction conclut**, qui est tout l'objet du catalogue :
  // sans lui, enchaîner demande de se souvenir de ce qu'on a écrit plus haut.
  assert.equal(trouve("Autre")?.origine, ORIGINE.CONCLU);
  assert.equal(trouve("Autre")?.ou, "essai.ref");
  assert.deepEqual(contexte.fichiers, ["variables-du-projet.ref", "essai.ref"]);
});

test("un brouillon vide ne propose rien, et ne casse rien", () => {
  const contexte = contexteDuBrouillon([], {});
  // Le langage reste : ses fonctions et ses agrégats ne dépendent d'aucun
  // brouillon.
  assert.deepEqual([...new Set(contexte.catalogue.map((une) => une.origine))],
    [ORIGINE.FONCTION, ORIGINE.AGREGAT]);
  assert.deepEqual(contexte.fichiers, []);
  assert.deepEqual(propositionsDeSaisie({ ligne: "   si (A", colonne: 8 }), []);
});

test("une ligne vide ne déplie pas les quarante mots du langage", () => {
  // La liste est demandée à chaque frappe, donc à chaque retour à la ligne :
  // une liste qui se déplie toute seule se referme à l'aveugle, et l'on
  // apprend à l'ignorer. Il faut une lettre.
  assert.deepEqual(propositionsDeSaisie({}), []);
  assert.deepEqual(propose("   "), []);
  assert.ok(propose("   s").length > 0);

  // Les autres contextes proposent sans rien attendre : c'est tout l'intérêt.
  assert.deepEqual(propose("   si (Zone de vent = "), ['"1"', '"2"', '"3"', '"4"']);
  assert.ok(propose("   importe (depuis: ").length > 0);
});
