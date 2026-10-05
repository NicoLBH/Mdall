/**
 * **La batterie de perturbations s'éprouve avec des lecteurs de carton.**
 *
 * ## Ce que ces épreuves gardent
 *
 * Un instrument de mesure qu'on n'a jamais vu tomber ne mesure rien. Ce qui
 * compte ici n'est donc pas que la batterie « marche » : c'est qu'elle
 * **attrape** ce qu'elle prétend attraper, et qu'elle refuse de compter ce
 * qu'elle n'a pas éprouvé.
 *
 * Deux lecteurs servent de sujets : l'un lit vraiment le tableau, l'autre rend
 * toujours la même marque sans regarder la colonne du verdict. La batterie doit
 * les distinguer — et c'est exactement ce que la perturbation « une phrase
 * niée » existe pour faire.
 *
 * ## Les trois pièges, chacun gardé ici
 *
 *   1. une perturbation qui rend le document inchangé ;
 *   2. une relation qui tient parce qu'il n'y avait rien à comparer ;
 *   3. un bilan qui mêle les épreuves qui n'ont pas eu lieu aux réussites.
 *
 * Chacun rendrait du vert sur un travail qui n'a pas été fait, et c'est la
 * seule façon dont un outil de mesure peut mentir.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  LES_MARQUES_OPPOSEES, LES_PERTURBATIONS, LA_COUPURE, RELATION,
  laDateEnToutesLettres, lesCellules, lesLignesDeTableau
} from "./la-batterie-des-perturbations/les-perturbations.js";
import {
  LES_FAMILLES_PROJETEES, combienDeReleves, laCleDunReleve, lempreinteDuneLecture
} from "../apps/web/js/services/lempreinte-dune-lecture.js";
import {
  VERDICT, laRelationTient
} from "./la-batterie-des-perturbations/la-relation.js";
import { ceQuiSepare } from "../apps/web/js/services/ce-qui-separe.js";
import {
  lesCitationsSeRetrouvent, lesMarquesSontDeclarees, pourChercherUneCitation
} from "../apps/web/js/services/les-invariants-dune-lecture.js";
import {
  POURQUOI_PAS, leBilan, passerLaBatterie, passerUneEpreuve
} from "./la-batterie-des-perturbations/passer-la-batterie.js";
import { laFamilleDeclaree, leCorpus } from "./la-batterie-des-perturbations/le-corpus.js";
import {
  unLecteurFidele, unLecteurQuiDevine
} from "./la-batterie-des-perturbations/un-lecteur-de-carton.js";
import {
  lesPagesDuDocument, unLecteurDuServeur
} from "./la-mesure-des-analyses/un-lecteur-du-serveur.js";
import { FAMILLE } from "../apps/web/js/services/les-familles-de-document.js";

const LE_RICT = leCorpus().find((un) => un.famille === FAMILLE.CONTROLE);
const LE_CR = leCorpus().find((un) => un.famille === FAMILLE.CR);

const unAvis = (reference, marque, reste = {}) => ({
  reference, intitule: `Ouvrage ${reference}`, marque,
  constat: "", citation: "", ...reste
});
const uneLectureDeRapport = (avis = [], reste = {}) => ({
  avis, legende: [{ marque: "F", signification: "Favorable" },
    { marque: "D", signification: "Défavorable" }],
  sansStructure: false, avisEcartes: 0, ...reste
});
const uneEmpreinte = (avis = [], reste = {}) =>
  lempreinteDuneLecture(uneLectureDeRapport(avis, reste), FAMILLE.CONTROLE);

/* ── Le corpus ───────────────────────────────────────────────────────────── */

/**
 * **Aucune matière de chantier n'entre dans le dépôt.** Un corpus de mesure se
 * lit, se copie, se cite dans un rapport ; un document réel qui y entre en sort.
 */
test("le corpus ne porte que des noms inventés", () => {
  for (const document of leCorpus()) {
    assert.match(document.texte, /inventé de bout en bout/,
      `« ${document.nom} » ne porte pas la mention qui dit qu'il est inventé`);
    // Les quatre noms de la convention du projet, et aucun domaine réel.
    assert.doesNotMatch(document.texte, /@(?!exemple\.|example\.)[a-z0-9-]+\.[a-z]{2,}/i,
      `« ${document.nom} » porte une adresse qui n'est pas en .example`);
  }
});

test("chaque document du corpus déclare une famille que la batterie sait projeter", () => {
  const tous = leCorpus();
  assert.ok(tous.length >= 2, "le corpus tient en moins de deux documents");
  for (const document of tous) {
    assert.ok(LES_FAMILLES_PROJETEES.includes(document.famille),
      `« ${document.nom} » : famille « ${document.famille} »`);
  }
});

/**
 * **Un corpus qui rétrécit en silence rend un bilan sur moins de documents
 * qu'on ne croit.** Sauter un fichier mal formé serait le plus sûr moyen de
 * mesurer la moitié du corpus en croyant le mesurer tout entier (règle 5).
 */
test("un document sans famille déclarée fait lever la lecture du corpus", () => {
  const ou = mkdtempSync(join(tmpdir(), "corpus-"));
  writeFileSync(join(ou, "sans-famille.md"), "# Un document\n\nDu texte.\n", "utf8");
  assert.throws(() => leCorpus(ou), /ne déclare pas sa famille/);
});

test("un document d'une famille que la batterie ne projette pas fait lever", () => {
  const ou = mkdtempSync(join(tmpdir(), "corpus-"));
  writeFileSync(join(ou, "un-fil.md"), `<!-- famille: ${FAMILLE.MAIL} -->\n# Un fil\n`, "utf8");
  assert.throws(() => leCorpus(ou), /ne sait pas projeter/);
});

test("la famille se lit dans le commentaire de tête, et nulle part ailleurs", () => {
  assert.equal(laFamilleDeclaree("<!-- famille: rapports -->\n# Titre"), "rapports");
  assert.equal(laFamilleDeclaree("# famille: rapports"), "");
  assert.equal(laFamilleDeclaree(""), "");
});

/* ── L'empreinte ─────────────────────────────────────────────────────────── */

/**
 * **Une famille qu'on ne sait pas projeter est un refus, pas un saut.** Une
 * batterie qui ignore poliment ce qu'elle ne sait pas faire rend un résultat
 * vert sur un corpus qu'elle n'a pas lu.
 */
test("projeter une famille inconnue lève, au lieu de rendre une empreinte vide", () => {
  assert.throws(() => lempreinteDuneLecture({}, FAMILLE.MAIL), /ne sait pas projeter/);
  assert.throws(() => lempreinteDuneLecture({}, ""), /\(vide\)/);
});

/**
 * **La clé normalise, parce qu'une casse n'est pas une disparition.** Sans
 * cela, une perturbation qui change « A-12 » en « a‑12 » ferait disparaître un
 * relevé et en apparaître un autre : deux défauts annoncés là où il n'y en a
 * aucun.
 */
test("la clé d'un relevé ignore la casse, les accents et la ponctuation", () => {
  assert.equal(laCleDunReleve({ reference: "A-12" }), laCleDunReleve({ reference: "a.12" }));
  assert.equal(laCleDunReleve({ reference: "Réf É" }), laCleDunReleve({ reference: "ref e" }));
  assert.equal(laCleDunReleve({ reference: "", intitule: "Le préau" }), "le preau");
  assert.equal(laCleDunReleve({}), "");
});

/**
 * **Un relevé qu'on ne sait pas rapprocher n'est pas un relevé perdu.** Les
 * confondre ferait compter comme disparition ce qui est une absence
 * d'identifiant (règle 5).
 */
test("un relevé sans référence ni intitulé se compte à part", () => {
  const empreinte = uneEmpreinte([
    unAvis("A-07", "F"),
    { reference: "", intitule: "", marque: "D", constat: "", citation: "" }
  ]);
  assert.equal(empreinte.parCle.size, 1);
  assert.equal(empreinte.sansCle.length, 1);
  assert.equal(combienDeReleves(empreinte), 2);
});

/**
 * **Deux relevés de même clé sont un défaut du document, pas de la comparaison.**
 * Écraser le premier le cacherait ; lever ferait perdre toute la lecture.
 */
test("deux relevés de même clé : le premier est gardé, les suivants comptés", () => {
  const empreinte = uneEmpreinte([unAvis("A-07", "F"), unAvis("A-07", "D")]);
  assert.equal(empreinte.parCle.size, 1);
  assert.equal(empreinte.parCle.get("a 07").marque, "F");
  assert.equal(empreinte.parCle.get("a 07").doubles, 1);
});

/**
 * **Un compte rendu ne déclare aucune légende, et c'est le vrai énoncé.**
 *
 * Les libellés de rubrique y tenaient lieu de légende. C'était faux, et il a
 * fallu deux outils de mesure qui se contredisent pour le voir : le jeu de
 * référence trouvait une légende manquée là où le lecteur lisait tout, puis
 * l'auto-épreuve de cette batterie s'est mise à compter six invariants tombés
 * sur un corpus qu'elle lisait parfaitement la veille.
 *
 * Une **légende** est la table qui déclare le sens des marques, et c'est sur
 * elle que s'appuie l'invariant « toute marque employée est déclarée ». Les
 * rubriques d'un compte rendu ne déclarent rien de ses états : ce sont deux
 * classements sans rapport. Un compte rendu ne déclare pas le sens de ses états
 * — c'est un fait du document, pas un manque de la lecture, et l'invariant sait
 * déjà dire qu'il ne se pose pas.
 */
test("un compte rendu se projette sur la même forme, et sans légende", () => {
  const empreinte = lempreinteDuneLecture({
    points: [{ reference: "02.3", titre: "Dalle du préau", etat: "En cours",
      description: "Coulée", citation: "Coulée le 22/04/26" }],
    rubriques: [{ titre: "02 — GROS ŒUVRE" }]
  }, FAMILLE.CR);

  const un = empreinte.parCle.get("02 3");
  assert.equal(un.marque, "En cours", "l'état d'un point n'est pas sa marque");
  assert.equal(un.intitule, "Dalle du préau");

  assert.deepEqual(empreinte.legende, [],
    "les rubriques passent pour une légende : l'invariant des marques tomberait "
    + "sur chaque point d'un compte rendu parfaitement lu");

  // Et l'invariant le dit comme tel : il ne se pose pas, il n'échoue pas.
  const dit = lesMarquesSontDeclarees(empreinte);
  assert.equal(dit.tient, true);
  assert.match(dit.dit, /ne se pose pas/);
});

/* ── Les perturbations ───────────────────────────────────────────────────── */

/**
 * **Une perturbation qui ne perturbe rien est le piège central de cet outil.**
 * La lecture serait identique par construction, la relation tiendrait toujours,
 * et la batterie rendrait du vert sur un travail qu'elle n'a pas fait. Elles se
 * déclarent donc inapplicables, et ne rendent jamais le texte tel quel.
 */
test("aucune perturbation ne rend le document inchangé", () => {
  for (const perturbation of LES_PERTURBATIONS) {
    for (const document of [LE_RICT, LE_CR, { texte: "" }, { texte: "# Rien\n" }]) {
      const fait = perturbation.applique(document.texte);
      if (fait === null) continue;
      assert.notEqual(fait.texte, document.texte,
        `« ${perturbation.nom} » dit avoir agi et rend le document inchangé`);
    }
  }
});

test("chaque perturbation déclare une relation connue", () => {
  const connues = new Set(Object.values(RELATION));
  for (const perturbation of LES_PERTURBATIONS) {
    assert.ok(connues.has(perturbation.relation),
      `« ${perturbation.nom} » déclare la relation « ${perturbation.relation} »`);
    assert.ok(perturbation.pourquoi.length > 40,
      `« ${perturbation.nom} » ne dit pas ce qu'elle cherche à attraper`);
  }
});

test("les six perturbations s'appliquent au rapport de contrôle", () => {
  const faites = LES_PERTURBATIONS.map((une) => [une.nom, une.applique(LE_RICT.texte)]);
  for (const [nom, fait] of faites) {
    assert.ok(fait, `« ${nom} » ne s'applique pas au rapport du corpus`);
  }
});

/**
 * **Une perturbation ne compte pas une réécriture qu'elle n'a pas faite.**
 *
 * Le compteur était incrémenté avant de savoir si la date se lisait. Un document
 * dont toutes les dates sont impossibles rendait donc un `{texte}` identique au
 * document reçu, en prétendant l'avoir réécrit : l'épreuve aurait tenu par
 * construction. Le refus général de `passerUneEpreuve` l'attrape, mais après
 * avoir payé deux lectures — autant ne pas mentir à la source.
 */
test("un document dont aucune date ne se lit ne se perturbe pas", () => {
  const perturbation = LES_PERTURBATIONS.find((une) => une.nom === "le format des dates");
  assert.equal(perturbation.applique("Réunion du 32/01/26, reportée au 15/13/26."), null,
    "la perturbation dit avoir réécrit des dates qu'elle n'a pas su lire");

  // Et une seule date lisible parmi des impossibles suffit à l'appliquer.
  const fait = perturbation.applique("Le 32/01/26 n'existe pas ; le 18/04/26, si.");
  assert.match(fait.texte, /18 avril 2026/);
  assert.match(fait.texte, /32\/01\/26/, "une date impossible a été réécrite");
  assert.match(fait.dit, /^1 dates?/, `le compte est faux : « ${fait.dit} »`);
});

test("une date courte s'écrit en toutes lettres, et une date fausse ne s'écrit pas", () => {
  assert.equal(laDateEnToutesLettres("18", "04", "26"), "18 avril 2026");
  assert.equal(laDateEnToutesLettres("1", "1", "2026"), "1 janvier 2026");
  assert.equal(laDateEnToutesLettres("31", "12", "99"), "31 décembre 2099");

  // **Le 32 du mois, le treizième mois.** Les réécrire fabriquerait une date qui
  // n'existe pas, et l'on mesurerait la lecture d'un document impossible.
  assert.equal(laDateEnToutesLettres("32", "01", "26"), "");
  assert.equal(laDateEnToutesLettres("01", "13", "26"), "");
  assert.equal(laDateEnToutesLettres("", "", ""), "");
});

/**
 * **La permutation ne touche que de la prose.**
 *
 * Le premier jet ne regardait que le début du bloc et a échangé le cartouche
 * d'en-tête — `**Établi le :** 18/04/26` — avec le paragraphe d'introduction.
 * Déplacer la date d'émission **est** un changement de structure : la relation
 * « rien ne change » n'aurait plus été vraie, et l'on aurait compté comme défaut
 * de lecture ce qui était un défaut de perturbation.
 */
test("la permutation ne déplace ni le cartouche d'en-tête, ni un titre, ni un tableau", () => {
  const perturbation = LES_PERTURBATIONS.find((une) => une.nom === "l'ordre de deux paragraphes");
  const fait = perturbation.applique(LE_RICT.texte);

  for (const marqueur of ["**Organisme :** VERIFAS", "**Établi le :** 18/04/26"]) {
    assert.equal(LE_RICT.texte.indexOf(marqueur) > 0, true);
    assert.ok(fait.texte.includes(marqueur), `« ${marqueur} » a disparu`);
  }

  const titres = (doc) => doc.split("\n").filter((une) => une.startsWith("#"));
  assert.deepEqual(titres(fait.texte), titres(LE_RICT.texte),
    "les titres ont bougé : ce n'est plus une permutation de prose");

  const lignes = (doc) => lesLignesDeTableau(doc).map(({ ligne }) => ligne);
  assert.deepEqual(lignes(fait.texte), lignes(LE_RICT.texte),
    "les lignes de tableau ont bougé");

  // Et le cartouche reste au-dessus de l'introduction, comme dans tout rapport.
  assert.ok(fait.texte.indexOf("**Organisme :**") < fait.texte.indexOf("Le présent rapport"));
});

test("un document sans deux paragraphes de prose voisins ne se permute pas", () => {
  const perturbation = LES_PERTURBATIONS.find((une) => une.nom === "l'ordre de deux paragraphes");
  assert.equal(perturbation.applique("# Titre\n\n| a | b |\n| --- | --- |\n"), null);
  assert.equal(perturbation.applique(LE_CR.texte), null,
    "le compte rendu n'a pas deux paragraphes voisins : la perturbation doit se refuser");
});

/**
 * **La négation rend un document cohérent.** Nier la seule prose laisserait la
 * colonne qui dit « F » et le texte qui dit « non conforme » : un document qui
 * se contredit n'a pas de bonne lecture, et l'on ne peut déclarer aucune
 * relation à son sujet.
 */
test("la négation retourne la prose et le verdict de la même ligne", () => {
  const perturbation = LES_PERTURBATIONS.find((une) => une.nom === "une phrase niée");
  const fait = perturbation.applique(LE_RICT.texte);

  assert.equal(fait.porte, "A-07");
  assert.deepEqual(fait.bascule, { de: "F", vers: "D" });

  const ligne = fait.texte.split("\n").find((une) => une.includes("A-07"));
  assert.match(ligne, /non conforme/, "la prose n'a pas été niée");
  assert.match(ligne, /\|\s*D\s*\|/, "le verdict n'a pas basculé");

  // Et une seule ligne a bougé : nier tout le document ne mesurerait plus rien.
  const bougees = LE_RICT.texte.split("\n")
    .filter((une, rang) => une !== fait.texte.split("\n")[rang]);
  assert.equal(bougees.length, 1);
});

/**
 * **« non conforme » devient « conforme », et non « non non conforme ».** Dans
 * l'autre ordre de remplacement, la négation produisait une phrase que personne
 * n'écrit, sur laquelle aucune lecture ne se juge.
 */
test("nier une ligne déjà négative la rend positive", () => {
  const perturbation = LES_PERTURBATIONS.find((une) => une.nom === "une phrase niée");
  const doc = "| Réf. | Ouvrage | Avis | Observation |\n| --- | --- | --- | --- |\n"
    + "| A-12 | Source auxiliaire | D | Le dimensionnement est non conforme. |\n";
  const fait = perturbation.applique(doc);

  assert.match(fait.texte, /est conforme/);
  assert.doesNotMatch(fait.texte, /non non/);
  assert.deepEqual(fait.bascule, { de: "D", vers: "F" });
});

/**
 * **Là où rien ne s'oppose, la perturbation ne s'applique pas.** Un compte rendu
 * porte des états qui se suivent — « à faire », « en cours », « soldé » — et non
 * des verdicts qui s'opposent. Inventer un contraire mesurerait une lecture
 * contre une question qui n'a pas de réponse.
 */
test("la négation ne s'applique pas là où le verdict n'a pas de contraire déclaré", () => {
  const perturbation = LES_PERTURBATIONS.find((une) => une.nom === "une phrase niée");
  assert.equal(perturbation.applique(LE_CR.texte), null);

  // Et la table des contraires est bien une table, pas une devinette.
  assert.equal(LES_MARQUES_OPPOSEES.F, "D");
  assert.equal(LES_MARQUES_OPPOSEES.D, "F");
  assert.equal(LES_MARQUES_OPPOSEES.SO, undefined,
    "« sans objet » a un contraire : on nierait ce qui ne se nie pas");
});

test("la légende retirée ne mange pas la section suivante", () => {
  const perturbation = LES_PERTURBATIONS.find((une) => une.nom === "la légende retirée");
  const fait = perturbation.applique(LE_RICT.texte);

  assert.doesNotMatch(fait.texte, /Légende des avis/);
  assert.doesNotMatch(fait.texte, /\|\s*SO\s*\|\s*Sans objet/);
  assert.match(fait.texte, /Avis sur les documents de conception/,
    "la section suivante est partie avec la légende");
  assert.match(fait.texte, /A-55/, "les avis sont partis avec la légende");
});

test("la coupure de page tombe au milieu d'un tableau, et pas ailleurs", () => {
  const perturbation = LES_PERTURBATIONS.find((une) => une.nom.startsWith("une coupure"));
  const fait = perturbation.applique(LE_RICT.texte);

  const combien = (doc) => doc.split(LA_COUPURE).length - 1;
  assert.equal(combien(fait.texte), combien(LE_RICT.texte) + 1);

  /**
   * **Dans un tableau, et jamais avant son en-tête.**
   *
   * Le premier jet prenait le milieu de **toutes** les lignes de tableau du
   * document. Sur ce rapport, qui en porte deux — la légende, puis les avis —,
   * ce milieu tombait pile sur l'en-tête du second : la coupure le précédait au
   * lieu de le couper. Un tableau qui enjambe deux pages perd son en-tête à la
   * seconde, et c'est **ça** qu'on vient éprouver.
   */
  const bouts = fait.texte.split(LA_COUPURE);
  const neuf = bouts.findIndex((un, rang) =>
    un !== LE_RICT.texte.split(LA_COUPURE)[rang]);
  assert.ok(lesLignesDeTableau(bouts[neuf]).length >= 2,
    "la coupure laisse moins de deux lignes de tableau au-dessus : elle le précède");
  assert.ok(lesLignesDeTableau(bouts[neuf + 1]).length >= 1,
    "la coupure ne laisse aucune ligne de tableau en dessous");
  assert.match(fait.dit, /dans un tableau de \d+ lignes/);

  // Un document sans tableau assez long n'en reçoit pas : une coupure posée au
  // hasard ne mesurerait pas ce que cette perturbation prétend mesurer.
  assert.equal(perturbation.applique("# Titre\n\nDu texte.\n"), null);
  assert.equal(perturbation.applique("| a | b |\n| --- | --- |\n| 1 | 2 |\n"), null,
    "un tableau d'une seule ligne de données se « coupe » : on le précède");

  // Et deux tableaux courts ne valent pas un tableau long : couper entre eux ne
  // coupe rien du tout.
  assert.equal(perturbation.applique(
    "| a |\n| --- |\n| 1 |\n\n## Suite\n\n| b |\n| --- |\n| 2 |\n"), null);
});

/**
 * **C'est le plus long tableau qu'on coupe, pas le premier venu.**
 *
 * Un rapport commence par sa légende, qui est un tableau elle aussi. Couper le
 * premier venu couperait donc la légende, et non le tableau des avis — alors
 * que ce que cette perturbation existe pour éprouver est précisément qu'« un
 * tableau d'avis qui enjambe deux pages perd son en-tête à la seconde, et la
 * moitié des avis part avec ».
 */
test("la coupure vise le plus long tableau, et non le premier", () => {
  const perturbation = LES_PERTURBATIONS.find((une) => une.nom.startsWith("une coupure"));
  const doc = [
    "## Légende", "", "| M | Sens |", "| --- | --- |", "| F | Favorable |",
    "| D | Défavorable |", "",
    "## Avis", "", "| Réf. | Ouvrage | Avis | Observation |", "| --- | --- | --- | --- |",
    "| A-01 | Un | F | Rien |", "| A-02 | Deux | F | Rien |",
    "| A-03 | Trois | D | Rien |", "| A-04 | Quatre | F | Rien |", ""
  ].join("\n");

  const fait = perturbation.applique(doc);
  const [avant] = fait.texte.split(LA_COUPURE);

  // La ligne de séparation n'en est pas une : la légende compte 3 lignes
  // (en-tête et deux marques), le tableau des avis 5.
  assert.match(fait.dit, /dans un tableau de 5 lignes/,
    "la coupure a visé la légende (3 lignes) au lieu du tableau des avis (5)");
  assert.ok(avant.includes("| A-01 |"), "la coupure est tombée avant le tableau des avis");
  assert.ok(!avant.includes("| A-04 |"), "la coupure est tombée après le tableau des avis");
});

test("les cellules d'une ligne se lisent sans les barres des bords", () => {
  assert.deepEqual(lesCellules("| A-07 | Hall | F |"), ["A-07", "Hall", "F"]);
  assert.deepEqual(lesCellules("A-07 | Hall"), ["A-07", "Hall"]);
  // La ligne de séparation n'est pas une donnée.
  assert.equal(lesLignesDeTableau("| a |\n| --- |\n| 1 |").length, 2);
});

/* ── La relation ─────────────────────────────────────────────────────────── */

/**
 * **Le second piège.** Deux relevés vides sont identiques : une lecture qui ne
 * trouve rien passerait « rien ne change » sans avoir rien lu, et la batterie
 * rendrait du vert sur une analyse muette.
 */
test("une lecture qui ne relève rien rend « sans objet », et non « ça tient »", () => {
  for (const relation of Object.values(RELATION)) {
    const dit = laRelationTient(relation, uneEmpreinte([]), uneEmpreinte([]), {});
    assert.equal(dit.verdict, VERDICT.SANS_OBJET,
      `« ${relation} » tient sur deux relevés vides : elle ne peut pas tomber`);
  }
});

test("« rien ne change » tient quand rien ne change, et tombe quand quelque chose bouge", () => {
  const avant = uneEmpreinte([unAvis("A-07", "F"), unAvis("A-12", "D")]);

  assert.equal(laRelationTient(RELATION.RIEN_NE_CHANGE, avant, uneEmpreinte([
    unAvis("A-12", "D"), unAvis("A-07", "F")
  ]), {}).verdict, VERDICT.TIENT, "l'ordre seul fait tomber la relation");

  const perdu = laRelationTient(RELATION.RIEN_NE_CHANGE, avant, uneEmpreinte([unAvis("A-07", "F")]), {});
  assert.equal(perdu.verdict, VERDICT.TOMBE);
  assert.match(perdu.dit, /« a 12 » a disparu/);

  const change = laRelationTient(RELATION.RIEN_NE_CHANGE, avant, uneEmpreinte([
    unAvis("A-07", "D"), unAvis("A-12", "D")
  ]), {});
  assert.equal(change.verdict, VERDICT.TOMBE);
  assert.match(change.dit, /marque F → D/);

  const apparu = laRelationTient(RELATION.RIEN_NE_CHANGE, avant, uneEmpreinte([
    unAvis("A-07", "F"), unAvis("A-12", "D"), unAvis("A-99", "F")
  ]), {});
  assert.equal(apparu.verdict, VERDICT.TOMBE);
  assert.match(apparu.dit, /« a 99 » est apparu/);
});

/**
 * **La substitution se normalise comme les clés.** La relation comparait une
 * clé normalisée — « a 23 » — à la référence brute de la perturbation —
 * « A-23 ». Elle ne rapprochait donc jamais rien : sur une lecture parfaitement
 * juste, la batterie annonçait une disparition et une apparition. Un instrument
 * qui accuse la lecture de son propre défaut est pire qu'un instrument absent.
 */
test("« tout suit » rapproche la référence renommée malgré la normalisation", () => {
  const avant = uneEmpreinte([unAvis("A-23", "S"), unAvis("A-07", "F")]);
  const apres = uneEmpreinte([unAvis("ZX-90", "S"), unAvis("A-07", "F")]);

  const dit = laRelationTient(RELATION.TOUT_SUIT, avant, apres,
    { substitution: { de: "A-23", vers: "ZX-90" } });
  assert.equal(dit.verdict, VERDICT.TIENT, dit.dit);

  // Et la marque doit suivre elle aussi : renommer n'est pas requalifier.
  const requalifie = laRelationTient(RELATION.TOUT_SUIT, avant,
    uneEmpreinte([unAvis("ZX-90", "D"), unAvis("A-07", "F")]),
    { substitution: { de: "A-23", vers: "ZX-90" } });
  assert.equal(requalifie.verdict, VERDICT.TOMBE);
});

test("« tout suit » sans substitution ne se juge pas", () => {
  const avant = uneEmpreinte([unAvis("A-23", "S")]);
  assert.equal(laRelationTient(RELATION.TOUT_SUIT, avant, avant, {}).verdict,
    VERDICT.SANS_OBJET);
});

/**
 * **La perturbation la plus précieuse de la liste.** Une analyse qui rend le
 * même constat sur un document et sur sa négation ne lit pas : elle devine.
 */
test("« le constat s'inverse » attrape la lecture qui ne regarde pas le verdict", () => {
  const avant = uneEmpreinte([unAvis("A-07", "F"), unAvis("A-12", "D")]);
  const fait = { porte: "A-07", bascule: { de: "F", vers: "D" } };

  const bascule = laRelationTient(RELATION.LE_CONSTAT_SINVERSE, avant,
    uneEmpreinte([unAvis("A-07", "D"), unAvis("A-12", "D")]), fait);
  assert.equal(bascule.verdict, VERDICT.TIENT, bascule.dit);

  const devine = laRelationTient(RELATION.LE_CONSTAT_SINVERSE, avant,
    uneEmpreinte([unAvis("A-07", "F"), unAvis("A-12", "D")]), fait);
  assert.equal(devine.verdict, VERDICT.TOMBE);
  assert.match(devine.dit, /elle ne lit pas la ligne, elle la devine/);
});

/**
 * **Et le reste n'a pas bougé.** Sans cela, une lecture qui recompose tout le
 * relevé passerait parce qu'une marque, au milieu du désordre, se trouve être
 * la bonne.
 */
test("« le constat s'inverse » tombe si le reste du relevé a bougé aussi", () => {
  const avant = uneEmpreinte([unAvis("A-07", "F"), unAvis("A-12", "D")]);
  const dit = laRelationTient(RELATION.LE_CONSTAT_SINVERSE, avant,
    uneEmpreinte([unAvis("A-07", "D"), unAvis("A-12", "F")]),
    { porte: "A-07", bascule: { de: "F", vers: "D" } });

  assert.equal(dit.verdict, VERDICT.TOMBE);
  assert.match(dit.dit, /le reste a bougé/);
});

test("« le constat s'inverse » sans relevé à inverser ne se juge pas", () => {
  const avant = uneEmpreinte([unAvis("A-07", "F")]);

  // Le relevé touché n'est pas dans la lecture d'origine.
  assert.equal(laRelationTient(RELATION.LE_CONSTAT_SINVERSE, avant, avant,
    { porte: "A-99", bascule: { de: "F", vers: "D" } }).verdict, VERDICT.SANS_OBJET);

  // La lecture d'origine ne donne pas la marque que le document écrivait : la
  // bascule ne se juge pas, et accuser la lecture serait accuser à côté.
  assert.equal(laRelationTient(RELATION.LE_CONSTAT_SINVERSE,
    uneEmpreinte([unAvis("A-07", "SO")]), avant,
    { porte: "A-07", bascule: { de: "F", vers: "D" } }).verdict, VERDICT.SANS_OBJET);

  // Et la perturbation qui ne dit pas ce qu'elle a touché.
  assert.equal(laRelationTient(RELATION.LE_CONSTAT_SINVERSE, avant, avant, {}).verdict,
    VERDICT.SANS_OBJET);
});

test("« le constat s'inverse » tombe si le relevé nié a disparu", () => {
  const dit = laRelationTient(RELATION.LE_CONSTAT_SINVERSE,
    uneEmpreinte([unAvis("A-07", "F"), unAvis("A-12", "D")]),
    uneEmpreinte([unAvis("A-12", "D")]),
    { porte: "A-07", bascule: { de: "F", vers: "D" } });
  assert.equal(dit.verdict, VERDICT.TOMBE);
  assert.match(dit.dit, /a disparu/);
});

/**
 * **Une lecture qui résout les marques sans la table les prend ailleurs que
 * dans le document** — et le fera donc aussi quand la table dira autre chose.
 */
test("« les marques ne se résolvent plus » attrape la lecture qui garde sa légende", () => {
  const avant = uneEmpreinte([unAvis("A-07", "F")]);

  const dit = laRelationTient(RELATION.LES_MARQUES_NE_SE_RESOLVENT_PLUS, avant,
    lempreinteDuneLecture({ avis: [unAvis("A-07", "F")], legende: [], sansStructure: true },
      FAMILLE.CONTROLE), {});
  assert.equal(dit.verdict, VERDICT.TIENT);

  const garde = laRelationTient(RELATION.LES_MARQUES_NE_SE_RESOLVENT_PLUS, avant, avant, {});
  assert.equal(garde.verdict, VERDICT.TOMBE);
  assert.match(garde.dit, /elle les prend ailleurs que dans le document/);
});

test("« les marques ne se résolvent plus » ne se juge pas sans légende d'origine", () => {
  const sansLegende = lempreinteDuneLecture(
    { avis: [unAvis("A-07", "F")], legende: [] }, FAMILLE.CONTROLE);
  assert.equal(laRelationTient(RELATION.LES_MARQUES_NE_SE_RESOLVENT_PLUS,
    sansLegende, sansLegende, {}).verdict, VERDICT.SANS_OBJET);
});

/**
 * **Une relation inconnue est un refus, pas un passage.** Ajouter une
 * perturbation sans dire ce qui doit tenir rendrait du vert silencieux sur une
 * épreuve que personne n'a écrite.
 */
test("une relation que la batterie ne connaît pas tombe", () => {
  const avant = uneEmpreinte([unAvis("A-07", "F")]);
  const dit = laRelationTient("une_chose_quon_na_pas_ecrite", avant, avant, {});
  assert.equal(dit.verdict, VERDICT.TOMBE);
  assert.match(dit.dit, /relation inconnue/);
});

test("ce qui sépare deux empreintes se dit en mots, et non en booléen", () => {
  const ecarts = ceQuiSepare(uneEmpreinte([unAvis("A-07", "F")]),
    uneEmpreinte([unAvis("A-07", "D")]));
  assert.equal(ecarts.length, 1);
  assert.match(ecarts[0], /« a 07 » : marque F → D/);
});

/* ── Les invariants ──────────────────────────────────────────────────────── */

/**
 * **Le meilleur indicateur du produit, et il ne coûte rien.** Une citation qui
 * ne figure pas dans le document est une phrase que personne n'a écrite,
 * présentée avec l'aplomb d'une phrase lue.
 */
test("une citation qui ne figure pas dans le document est attrapée", () => {
  const document = "Le dispositif est conforme à l'instruction technique.";

  const juste = lesCitationsSeRetrouvent(
    uneEmpreinte([unAvis("A-07", "F", { citation: "est conforme à l'instruction" })]), document);
  assert.equal(juste.tient, true);
  assert.equal(juste.citees, 1);

  const inventee = lesCitationsSeRetrouvent(
    uneEmpreinte([unAvis("A-07", "F", { citation: "le dispositif a été réceptionné" })]), document);
  assert.equal(inventee.tient, false);
  assert.deepEqual(inventee.manquantes, ["a 07"]);
});

/**
 * **Trois normalisations, et pas une de plus.** Une liste qu'on allonge sans y
 * penser finit par rendre vraie n'importe quelle citation.
 */
test("la recherche d'une citation ne normalise que l'apostrophe, le tiret et l'espace", () => {
  assert.equal(pourChercherUneCitation("l’avis"), "l'avis");
  assert.equal(pourChercherUneCitation("A—B"), "A-B");
  assert.equal(pourChercherUneCitation("a  \n b"), "a b");

  // Ni la casse, ni les accents, ni la ponctuation : ils portent du sens.
  assert.notEqual(pourChercherUneCitation("Conforme"), pourChercherUneCitation("conforme"));
  assert.notEqual(pourChercherUneCitation("décembre"), pourChercherUneCitation("decembre"));
  assert.notEqual(pourChercherUneCitation("conforme."), pourChercherUneCitation("conforme"));
});

/**
 * **Un relevé sans citation n'est pas une faute, c'est une couverture.**
 * Exiger une citation de chacun ferait tomber l'invariant sur les lectures qui
 * n'en rendent pas du tout, et l'on cesserait de le regarder.
 */
test("un relevé sans citation ne fait pas tomber l'invariant, il ne compte pas", () => {
  const dit = lesCitationsSeRetrouvent(uneEmpreinte([unAvis("A-07", "F")]), "n'importe quoi");
  assert.equal(dit.tient, true);
  assert.equal(dit.citees, 0);
  assert.match(dit.dit, /ne se pose pas/);
});

test("une marque employée hors de la légende est attrapée", () => {
  const juste = lesMarquesSontDeclarees(uneEmpreinte([unAvis("A-07", "F")]));
  assert.equal(juste.tient, true);

  const hors = lesMarquesSontDeclarees(uneEmpreinte([unAvis("A-07", "ZZ")]));
  assert.equal(hors.tient, false);
  assert.match(hors.dit, /ne figurent pas dans la légende/);
});

test("sans légende lue, l'invariant des marques ne se pose pas", () => {
  const dit = lesMarquesSontDeclarees(lempreinteDuneLecture(
    { avis: [unAvis("A-07", "ZZ")], legende: [] }, FAMILLE.CONTROLE));
  assert.equal(dit.tient, true);
  assert.match(dit.dit, /ne se pose pas/);
});

/* ── L'orchestration ─────────────────────────────────────────────────────── */

const uneLectureQuiRate = async () => ({ ok: false, motif: "le modèle n'a pas répondu" });

/**
 * **Le premier piège, et le plus dangereux.** Une perturbation qui rend le
 * document inchangé ferait tenir toute relation par construction.
 */
test("une perturbation sans effet est refusée, et non comptée comme une réussite", async () => {
  const sansEffet = {
    nom: "celle qui ne fait rien", relation: RELATION.RIEN_NE_CHANGE,
    pourquoi: "", applique: (doc) => ({ texte: doc, porte: "", dit: "j'ai agi" })
  };

  const faite = await passerUneEpreuve(LE_RICT, sansEffet, unLecteurFidele);
  assert.equal(faite.verdict, VERDICT.SANS_OBJET);
  assert.equal(faite.pourquoiPas, POURQUOI_PAS.SANS_EFFET);
  assert.match(faite.dit, /tiendrait par construction/);
});

test("une perturbation inapplicable se dit telle, et ne lit rien", async () => {
  let appels = 0;
  const compte = async (demande) => { appels += 1; return unLecteurFidele(demande); };
  const jamais = { nom: "celle qui ne s'applique pas", relation: RELATION.RIEN_NE_CHANGE,
    pourquoi: "", applique: () => null };

  const faite = await passerUneEpreuve(LE_RICT, jamais, compte);
  assert.equal(faite.pourquoiPas, POURQUOI_PAS.INAPPLICABLE);
  assert.equal(appels, 0, "une épreuve qui n'a pas lieu a quand même payé deux lectures");
});

/**
 * **Une lecture qui n'aboutit pas n'est pas un défaut de l'analyse.** On ne sait
 * rien de sa justesse si elle n'a pas eu lieu : la compter comme un échec ferait
 * baisser la courbe sur une panne de réseau.
 */
test("une lecture qui n'aboutit pas se compte à part, sous son motif", async () => {
  const faite = await passerUneEpreuve(LE_RICT, LES_PERTURBATIONS[0], uneLectureQuiRate);
  assert.equal(faite.verdict, VERDICT.SANS_OBJET);
  assert.equal(faite.pourquoiPas, POURQUOI_PAS.LECTURE_MANQUEE);
  assert.match(faite.dit, /le modèle n'a pas répondu/);
});

test("la lecture du document perturbé qui rate se dit aussi", async () => {
  let combien = 0;
  const laSeconde = async (demande) => {
    combien += 1;
    return combien > 1 ? { ok: false, motif: "délai dépassé" } : unLecteurFidele(demande);
  };

  const faite = await passerUneEpreuve(LE_RICT, LES_PERTURBATIONS[0], laSeconde);
  assert.equal(faite.pourquoiPas, POURQUOI_PAS.LECTURE_MANQUEE);
  assert.match(faite.dit, /du document perturbé/);
});

/**
 * **C'est l'épreuve qui justifie tout l'outil.** Un lecteur qui rend toujours la
 * même marque sans regarder la colonne du verdict est plausible sur le document
 * d'origine ; c'est sur le document nié qu'il se trahit.
 */
test("la batterie distingue un lecteur qui lit d'un lecteur qui devine", async () => {
  const corpus = leCorpus();

  const fidele = await passerLaBatterie({ corpus, lire: unLecteurFidele });
  assert.equal(fidele.bilan.tombees, 0,
    `le lecteur fidèle tombe : ${fidele.epreuves.filter((une) => une.verdict === VERDICT.TOMBE)
      .map((une) => `${une.perturbation} — ${une.dit}`).join(" | ")}`);
  assert.ok(fidele.bilan.eues >= 8, "la batterie ne pose presque aucune épreuve");

  const devine = await passerLaBatterie({ corpus, lire: unLecteurQuiDevine("F") });
  assert.equal(devine.bilan.tombees, 1);

  const tombee = devine.epreuves.find((une) => une.verdict === VERDICT.TOMBE);
  assert.equal(tombee.perturbation, "une phrase niée");
  assert.match(tombee.dit, /elle ne lit pas la ligne, elle la devine/);
});

/**
 * **Le troisième piège.** Un taux de réussite qui mêle les sans-objet aux
 * réussites monterait quand la batterie cesse de fonctionner — la pire propriété
 * possible pour un indicateur.
 */
test("le bilan ne mêle jamais les épreuves qui n'ont pas eu lieu aux réussites", () => {
  const bilan = leBilan([
    { verdict: VERDICT.TIENT },
    { verdict: VERDICT.TOMBE },
    { verdict: VERDICT.SANS_OBJET, pourquoiPas: POURQUOI_PAS.INAPPLICABLE },
    { verdict: VERDICT.SANS_OBJET, pourquoiPas: POURQUOI_PAS.INAPPLICABLE },
    { verdict: VERDICT.SANS_OBJET, pourquoiPas: POURQUOI_PAS.SANS_EFFET }
  ]);

  assert.equal(bilan.posees, 5);
  assert.equal(bilan.tiennent, 1);
  assert.equal(bilan.tombees, 1);
  assert.equal(bilan.sansObjet, 3);
  assert.equal(bilan.eues, 2, "le dénominateur compte des épreuves qui n'ont pas eu lieu");
  assert.deepEqual(bilan.pourquoiPas, { inapplicable: 2, sans_effet: 1 });
});

test("le bilan compte les invariants tombés des deux lectures", async () => {
  const quiInvente = async (demande) => {
    const lu = await unLecteurFidele(demande);
    return { ok: true, lecture: { ...lu.lecture,
      avis: lu.lecture.avis.map((un) => ({ ...un, citation: "une phrase que personne n'a écrite" })) } };
  };

  const { bilan } = await passerLaBatterie({
    corpus: [LE_RICT], lire: quiInvente, perturbations: [LES_PERTURBATIONS[0]]
  });
  assert.equal(bilan.invariantsTombes, 2,
    "les citations inventées des deux lectures ne sont pas comptées");
});

/**
 * **Chaque lecture se juge contre le document qu'elle a lu.**
 *
 * Les invariants du document perturbé se posaient contre le document d'origine,
 * et rien ne le disait : les citations du lecteur de carton existent dans les
 * deux, la plupart du temps. La négation est le cas où elles diffèrent — « est
 * non conforme » ne figure que dans le document nié — et c'est donc là que le
 * mélange se voit. Un invariant posé contre le mauvais texte accuse la lecture
 * d'avoir inventé ce qu'elle a correctement cité.
 */
test("les invariants de chaque lecture se posent contre son propre document", async () => {
  const negation = LES_PERTURBATIONS.find((une) => une.nom === "une phrase niée");
  const faite = await passerUneEpreuve(LE_RICT, negation, unLecteurFidele);

  assert.equal(faite.verdict, VERDICT.TIENT, faite.dit);
  for (const quand of ["avant", "apres"]) {
    for (const invariant of faite.invariants[quand]) {
      assert.equal(invariant.tient, true,
        `invariant « ${invariant.quoi} » (${quand}) : ${invariant.dit}`);
    }
  }

  // Et la citation qui n'existe que dans le document nié est bien celle qu'on
  // vient de vérifier : sans elle, l'épreuve ne distinguerait pas les deux.
  const nie = negation.applique(LE_RICT.texte).texte;
  assert.ok(nie.includes("est non conforme à l'instruction"));
  assert.ok(!LE_RICT.texte.includes("est non conforme à l'instruction"));
});

test("chaque épreuve dit ce que la perturbation a fait au document", async () => {
  const { epreuves } = await passerLaBatterie({
    corpus: [LE_RICT], lire: unLecteurFidele, perturbations: LES_PERTURBATIONS
  });
  for (const une of epreuves) {
    assert.ok(une.perturbe, `« ${une.perturbation} » ne dit pas ce qu'elle a fait`);
  }
});

test("la batterie passe chaque perturbation sur chaque document", async () => {
  const { epreuves } = await passerLaBatterie({ corpus: leCorpus(), lire: unLecteurFidele });
  assert.equal(epreuves.length, leCorpus().length * LES_PERTURBATIONS.length);
});

test("une batterie sans corpus ne rend pas un bilan vert", async () => {
  const { bilan } = await passerLaBatterie({ corpus: [], lire: unLecteurFidele });
  assert.equal(bilan.posees, 0);
  assert.equal(bilan.eues, 0);
});

/* ── Le lecteur du serveur ───────────────────────────────────────────────── */

/**
 * **Ce qui s'éprouve ici est le câblage, pas l'aller-retour.**
 *
 * Les trois appels demandent-ils la bonne chose, et traduisent-ils la réponse
 * comme la fonction de bord le fait ? Un appelant de carton répond, et rien ne
 * sort sur le réseau. L'aller-retour lui-même demande une URL et un jeton que
 * les épreuves n'ont pas : il reste non éprouvé, et c'est dit.
 */
test("le lecteur du serveur passe par l'orchestrateur du produit", async () => {
  const demandes = [];
  const appeler = async (fonction, corps) => {
    demandes.push({ fonction, pages: corps.pages?.length ?? 0 });
    if (fonction === "structure-du-document") return { structure: { titres: [] }, modele: "m" };
    if (fonction === "reconstituer-en-markdown") {
      // **Le numéro de page est requis**, et c'est l'orchestrateur du produit
      // qui l'exige : une page sans numéro se rangerait en tête du document, à
      // une place qu'elle n'a pas. Le premier jeu d'essai l'oubliait, et la
      // lecture a refusé — c'est exactement ce qu'on attend d'elle.
      return { pages: corps.pages.map((une) => ({ page: une.page, markdown: une.text })),
        modele: "m" };
    }
    return {
      avis: [{ intitule: "Désenfumage du hall", reference: "A-07", teneur: "F",
        constat: "conforme", citation: "est conforme", page: 1 }],
      ecartes: [], reference_du_rapport: "RICT-03", emis_le: "2026-04-18",
      organisme: "VERIFAS", legende: [{ marque: "F", signification: "Favorable" }]
    };
  };

  const lire = unLecteurDuServeur({ appeler, projectId: "p-1" });
  const lu = await lire({ texte: LE_RICT.texte, famille: FAMILLE.CONTROLE, nom: "RICT-03.pdf" });

  assert.equal(lu.ok, true, lu.motif);
  assert.deepEqual(demandes.map((une) => une.fonction),
    ["structure-du-document", "reconstituer-en-markdown", "extract-avis"]);

  // La traduction du serveur : `teneur` devient `marque`, et l'identité est lue.
  const empreinte = lempreinteDuneLecture(lu.lecture, FAMILLE.CONTROLE);
  assert.equal(empreinte.parCle.get("a 07").marque, "F");
  assert.deepEqual(empreinte.legende, ["F"]);
});

/**
 * **Un relevé où tout a été écarté n'est pas un relevé vide.** La batterie doit
 * compter l'épreuve comme n'ayant pas eu lieu, et non comme une lecture muette
 * dont on conclurait que le rapport ne porte aucun avis (règle 5).
 */
test("un relevé entièrement écarté fait une lecture qui n'aboutit pas", async () => {
  const appeler = async (fonction, corps) => {
    if (fonction === "structure-du-document") return { structure: { titres: [] } };
    if (fonction === "reconstituer-en-markdown") {
      return { pages: corps.pages.map((une) => ({ page: une.page, markdown: une.text })) };
    }
    return { avis: [], ecartes: [1, 2, 3] };
  };

  const lu = await unLecteurDuServeur({ appeler })(
    { texte: LE_RICT.texte, famille: FAMILLE.CONTROLE });
  assert.equal(lu.ok, true, "la lecture doit aboutir : c'est le relevé qui n'a pas eu lieu");
  assert.equal(lu.lecture.avis, null,
    "des avis non relevés se disent `null`, et non `[]` — sinon on prête le silence au document");
});

test("le lecteur du serveur refuse une famille qu'il ne lit pas", async () => {
  const jamais = async () => { throw new Error("il ne doit rien appeler"); };
  const lu = await unLecteurDuServeur({ appeler: jamais })(
    { texte: LE_CR.texte, famille: FAMILLE.CR });

  assert.equal(lu.ok, false);
  assert.match(lu.motif, /ne lit que/);
});

test("les pages d'un document se séparent sur la coupure déclarée", () => {
  const pages = lesPagesDuDocument(`un\n${LA_COUPURE}\ndeux\n${LA_COUPURE}\n\n`);
  assert.deepEqual(pages, [{ page: 1, text: "un" }, { page: 2, text: "deux" }]);
  assert.deepEqual(lesPagesDuDocument(""), [], "un document vide rend une page vide");
});

/**
 * **Les deux copies du câblage se confrontent.**
 *
 * `lesAppelsDeLaBatterie` recopie `lesAppelsDuServeur` de la fonction de bord,
 * parce que l'original est du TypeScript Deno que Node ne charge pas. Une copie
 * qui diverge en silence ferait mesurer une lecture qui n'est plus celle du
 * produit — et rien ne le dirait, puisque les deux marcheraient.
 *
 * C'est le cas exact où lire la source comme du texte se justifie : le défaut
 * est invisible autrement, et aucune exécution ne le révèle.
 */
test("le câblage de la batterie nomme les mêmes fonctions et les mêmes champs que le serveur", () => {
  const ici = readFileSync(
    new URL("./la-mesure-des-analyses/un-lecteur-du-serveur.js", import.meta.url), "utf8");
  const laBas = readFileSync(
    new URL("../supabase/functions/lire-les-rapports/index.ts", import.meta.url), "utf8");

  for (const quoi of [
    "structure-du-document", "reconstituer-en-markdown", "extract-avis",
    "reference_du_rapport", "emis_le", "organisme", "legende",
    "rien-rendu", "rien-de-verifie", "aucune structure rendue"
  ]) {
    assert.ok(ici.includes(quoi), `la batterie ne nomme pas « ${quoi} »`);
    assert.ok(laBas.includes(quoi),
      `le serveur ne nomme plus « ${quoi} » : la copie de la batterie a divergé`);
  }
});

/**
 * **Un invariant tombé n'a de sens qu'avec son assiette.**
 *
 * `invariantsTombes` vivait seul dans le bilan. « 0 invariant tombé » se lit
 * comme un succès, et c'est indiscernable de « aucun invariant posé » — qui est
 * le cas d'une lecture muette, dont tout invariant tient par construction. Le
 * défaut que cet outil existe pour attraper, dans l'outil lui-même.
 */
test("le bilan rend combien d'invariants ont été posés, et pas seulement combien sont tombés", () => {
  const vide = leBilan([{ verdict: VERDICT.TIENT, invariants: { avant: [], apres: [] } }]);
  assert.equal(vide.invariants, 0);
  assert.equal(vide.invariantsTombes, 0,
    "aucun invariant posé et aucun tombé se confondent : sans l'assiette, "
    + "une lecture muette rend un bilan vert");

  const pose = leBilan([
    { verdict: VERDICT.TIENT,
      invariants: { avant: [{ tient: true }, { tient: false }], apres: [{ tient: true }] } },
    { verdict: VERDICT.TOMBE, invariants: { avant: [{ tient: true }], apres: [] } }
  ]);
  assert.equal(pose.invariants, 4);
  assert.equal(pose.invariantsTombes, 1);
});
