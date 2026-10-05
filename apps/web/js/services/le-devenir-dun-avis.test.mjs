/**
 * Le devenir d'un avis, éprouvé sur des rapports inventés.
 *
 * Les deux défauts qu'on cherche ici ne lèvent jamais et ne s'affichent pas de
 * travers : ils **concluent trop**. Un avis que plus personne ne mentionne passé
 * pour levé, et un rapport dont les avis n'ont pas été relevés pris pour un
 * rapport qui n'en parle plus. Dans les deux cas l'écran dit « 0 avis ouvert »,
 * et c'est faux.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  CE_QUE_LE_RAPPORT_APPORTE, LA_VIE_DUN_AVIS, ceQueVautLappreciation, laSuiteDesAvis,
  laVieDunAvis, lesRapportsEnOrdre, phraseDeLaSuite
} from "./le-devenir-dun-avis.js";

/** La légende d'un bureau de contrôle ordinaire. */
const LEGENDE = [
  { marque: "F", signification: "Favorable" },
  { marque: "S", signification: "Suspendu" },
  { marque: "D", signification: "Défavorable" },
  { marque: "SO", signification: "Sans objet" }
];

function unRapport(numero, etabliLe, avis, reste = {}) {
  return {
    /**
     * **L'identifiant ne suit pas l'ordre des dates.** Il le suivait — `l-1`,
     * `l-2`, `l-3` —, et l'épreuve de l'ordre passait encore quand on triait par
     * identifiant : un jeu d'essai qui recopie l'hypothèse du code n'éprouve rien.
     */
    id: `l-${[...numero].reverse().join("")}9`,
    document: `RICT-${numero}.pdf`,
    numero_de_rapport: numero,
    etabli_le: etabliLe,
    legende: LEGENDE,
    analyse_gelee: { lecture: { avis } },
    ...reste
  };
}

const unAvis = (reference, marque, reste = {}) => ({
  reference, marque, intitule: `Point ${reference}`, ...reste
});

/* ── Ce qu'une appréciation implique ───────────────────────────────────────── */

test("une appréciation se lit par son code, ou par son libellé", () => {
  assert.equal(ceQueVautLappreciation("F"), "ok");
  assert.equal(ceQueVautLappreciation("S"), "pending");
  assert.equal(ceQueVautLappreciation("NC"), "danger");
  // Un rapport lu ligne à ligne écrit le mot entier, sans code.
  assert.equal(ceQueVautLappreciation("", "Défavorable"), "danger");
  assert.equal(ceQueVautLappreciation("", "Sans objet"), "neutral");
});

test("les accents et la casse ne changent pas ce qu'une appréciation vaut", () => {
  assert.equal(ceQueVautLappreciation("", "défavorable"), "danger");
  assert.equal(ceQueVautLappreciation("", "POUR MÉMOIRE"), "info");
  assert.equal(ceQueVautLappreciation("f"), "ok");
});

test("une marque inconnue reste inconnue, et n'est pas rangée du côté rassurant", () => {
  // La ranger en « ok » parce qu'il fallait bien la ranger quelque part
  // refermerait un avis que personne n'a refermé (règle 5).
  assert.equal(ceQueVautLappreciation("Z"), "unknown");
  assert.equal(ceQueVautLappreciation("", "réservé"), "unknown");
  assert.equal(ceQueVautLappreciation(null), "unknown");
});

/* ── La vie d'un avis ──────────────────────────────────────────────────────── */

test("seules les appréciations qui attendent quelque chose laissent un avis ouvert", () => {
  for (const [code, libelle] of [["F", "Favorable"], ["SO", "Sans objet"],
    ["PM", "Pour mémoire"], ["HM", "Hors mission"]]) {
    assert.equal(laVieDunAvis(code, libelle), LA_VIE_DUN_AVIS.FERME, code);
  }
  for (const [code, libelle] of [["S", "Suspendu"], ["D", "Défavorable"], ["NC", "Non conforme"]]) {
    assert.equal(laVieDunAvis(code, libelle), LA_VIE_DUN_AVIS.OUVERT, code);
  }
});

test("une marque qu'aucune légende ne déclare laisse l'avis ouvert", () => {
  // Ne pas savoir ce que « Z » veut dire n'autorise pas à le tenir pour levé.
  assert.equal(laVieDunAvis("Z", null), LA_VIE_DUN_AVIS.OUVERT);
});

test("un avis sans nouvelles n'est pas un avis levé", () => {
  assert.equal(laVieDunAvis("F", "Favorable", "NO_NEWS"), LA_VIE_DUN_AVIS.OUVERT);
  assert.equal(laVieDunAvis("S", "Suspendu", "NO_NEWS"), LA_VIE_DUN_AVIS.OUVERT);
});

test("un avis rouvert se dit rouvert tant qu'il est ouvert, et fermé une fois levé", () => {
  assert.equal(laVieDunAvis("D", "Défavorable", "OPEN", true), LA_VIE_DUN_AVIS.ROUVERT);
  assert.equal(laVieDunAvis("D", "Défavorable", "RESOLVED", true), LA_VIE_DUN_AVIS.FERME);
});

/* ── L'ordre des rapports ──────────────────────────────────────────────────── */

test("les rapports se rangent par date d'émission, et non par date de lecture", () => {
  // On relit un vieux rapport après un récent tous les jours : suivre l'ordre
  // des lectures ferait lever un avis par un rapport antérieur à celui qui
  // l'avait soulevé.
  const { dates } = lesRapportsEnOrdre([
    unRapport("c", "2025-09-10", [], { created_at: "2026-01-01" }),
    unRapport("b", "2025-03-04", [], { created_at: "2026-02-01" }),
    unRapport("a", "2025-06-18", [], { created_at: "2026-03-01" })
  ]);
  // Ni l'ordre d'arrivée, ni celui des identifiants, ni celui des numéros.
  assert.deepEqual(dates.map((un) => un.numero), ["b", "a", "c"]);
});

test("une lecture sans date d'émission est mise à part, et non placée au hasard", () => {
  const { dates, sansDate } = lesRapportsEnOrdre([
    unRapport("1", "2025-03-04", []),
    unRapport("?", "", [])
  ]);
  assert.deepEqual(dates.map((un) => un.numero), ["1"]);
  assert.deepEqual(sansDate.map((un) => un.numero), ["?"]);
});

/* ── La suite d'un avis ────────────────────────────────────────────────────── */

test("un avis suspendu puis favorable est levé, et sa frise le dit étape par étape", () => {
  const suite = laSuiteDesAvis([
    unRapport("1", "2025-03-04", [unAvis("A-12", "S")]),
    unRapport("2", "2025-06-18", [unAvis("A-12", "F")])
  ]);

  assert.equal(suite.avis.length, 1);
  const [un] = suite.avis;
  assert.equal(un.vie, LA_VIE_DUN_AVIS.FERME);
  assert.deepEqual(un.etapes.map((une) => une.apporte),
    [CE_QUE_LE_RAPPORT_APPORTE.NEUF, CE_QUE_LE_RAPPORT_APPORTE.LEVE]);
  // La marque est résolue dans la légende **de son rapport**, pas d'un voisin.
  assert.deepEqual(un.etapes.map((une) => une.sens), ["Suspendu", "Favorable"]);
});

test("le même avis redit suspendu est un rappel, et non un avis neuf", () => {
  const suite = laSuiteDesAvis([
    unRapport("1", "2025-03-04", [unAvis("A-12", "S")]),
    unRapport("2", "2025-06-18", [unAvis("A-12", "S")])
  ]);
  assert.deepEqual(suite.avis[0].etapes.map((une) => une.apporte),
    [CE_QUE_LE_RAPPORT_APPORTE.NEUF, CE_QUE_LE_RAPPORT_APPORTE.RAPPEL]);
  assert.equal(suite.avis[0].vie, LA_VIE_DUN_AVIS.OUVERT);
});

test("un avis levé puis redevenu défavorable est rouvert", () => {
  const suite = laSuiteDesAvis([
    unRapport("1", "2025-03-04", [unAvis("A-12", "S")]),
    unRapport("2", "2025-06-18", [unAvis("A-12", "F")]),
    unRapport("3", "2025-09-10", [unAvis("A-12", "D")])
  ]);

  assert.deepEqual(suite.avis[0].etapes.map((une) => une.apporte), [
    CE_QUE_LE_RAPPORT_APPORTE.NEUF,
    CE_QUE_LE_RAPPORT_APPORTE.LEVE,
    CE_QUE_LE_RAPPORT_APPORTE.ROUVERT
  ]);
  assert.equal(suite.avis[0].vie, LA_VIE_DUN_AVIS.ROUVERT);
});

test("un avis rouvert puis levé est fermé, et non rouvert", () => {
  const suite = laSuiteDesAvis([
    unRapport("1", "2025-03-04", [unAvis("A-12", "F")]),
    unRapport("2", "2025-06-18", [unAvis("A-12", "D")]),
    unRapport("3", "2025-09-10", [unAvis("A-12", "F")])
  ]);
  assert.equal(suite.avis[0].vie, LA_VIE_DUN_AVIS.FERME);
});

test("un avis dont le dernier rapport ne parle plus est sans nouvelles, pas levé", () => {
  // **Le défaut que ce module existe pour empêcher.** Le tenir pour levé donnerait
  // un dossier « 0 avis ouvert » obtenu par oubli (règle 5).
  const suite = laSuiteDesAvis([
    unRapport("1", "2025-03-04", [unAvis("A-12", "S")]),
    unRapport("2", "2025-06-18", [unAvis("B-01", "F")])
  ]);

  const perdu = suite.avis.find((un) => un.reference === "A-12");
  assert.equal(perdu.sansNouvelles, true);
  assert.equal(perdu.depuis, "2025-03-04");
  assert.equal(perdu.vie, LA_VIE_DUN_AVIS.OUVERT);
});

test("un avis déjà levé que le dernier rapport ne reprend pas n'est pas « sans nouvelles »", () => {
  // Il n'y a rien à en dire : il est clos, et le dernier rapport n'a aucune
  // raison de le reprendre.
  const suite = laSuiteDesAvis([
    unRapport("1", "2025-03-04", [unAvis("A-12", "F")]),
    unRapport("2", "2025-06-18", [unAvis("B-01", "S")])
  ]);
  assert.equal(suite.avis.find((un) => un.reference === "A-12").sansNouvelles, false);
});

test("un rapport dont les avis n'ont pas été relevés ne fait taire personne", () => {
  // **La seconde conclusion de trop.** Une étape qui n'a pas eu lieu n'est pas un
  // rapport qui n'en parle plus : sans cette distinction, chaque lecture
  // interrompue effacerait le suivi de tout le dossier.
  const suite = laSuiteDesAvis([
    unRapport("1", "2025-03-04", [unAvis("A-12", "S")]),
    unRapport("2", "2025-06-18", null)
  ]);

  const un = suite.avis.find((avis) => avis.reference === "A-12");
  assert.equal(un.sansNouvelles, false, "le rapport muet n'a pas été interrogé");
  assert.equal(un.vie, LA_VIE_DUN_AVIS.OUVERT);
  assert.deepEqual(suite.muets.map((rapport) => rapport.numero), ["2"]);
});

test("un avis sans référence ne se suit pas, et se compte", () => {
  // Le suivre par son intitulé confondrait deux lignes qui se ressemblent dans
  // deux rapports, et inventerait une levée.
  const suite = laSuiteDesAvis([
    unRapport("1", "2025-03-04", [unAvis("", "S"), unAvis("A-12", "S")])
  ]);
  assert.equal(suite.sansReference, 1);
  assert.deepEqual(suite.avis.map((un) => un.reference), ["A-12"]);
});

test("ce qui reste ouvert se lit en premier", () => {
  const suite = laSuiteDesAvis([
    unRapport("1", "2025-03-04", [unAvis("A-01", "F"), unAvis("A-02", "S"), unAvis("A-03", "F")])
  ]);
  assert.deepEqual(suite.avis.map((un) => un.reference), ["A-02", "A-01", "A-03"]);
});

test("les références se classent par leur nombre, et non par leur écriture", () => {
  const suite = laSuiteDesAvis([
    unRapport("1", "2025-03-04", [unAvis("A-10", "F"), unAvis("A-2", "F")])
  ]);
  assert.deepEqual(suite.avis.map((un) => un.reference), ["A-2", "A-10"]);
});

test("l'intitulé le plus récent gagne : c'est lui qu'on retrouvera dans le document", () => {
  const suite = laSuiteDesAvis([
    unRapport("1", "2025-03-04", [unAvis("A-12", "S", { intitule: "Ancrages du bardage" })]),
    unRapport("2", "2025-06-18", [unAvis("A-12", "S", { intitule: "Ancrages du bardage ouest" })])
  ]);
  assert.equal(suite.avis[0].intitule, "Ancrages du bardage ouest");
});

test("la frise porte le constat et la page de chaque étape", () => {
  // C'est ce qu'on vient vérifier dans le PDF : sans la page, il faut relire
  // soixante pages pour retrouver la ligne.
  const suite = laSuiteDesAvis([
    unRapport("1", "2025-03-04",
      [unAvis("A-12", "S", { constat: "Plan 04-B non fourni", ou: "page 12" })])
  ]);
  assert.equal(suite.avis[0].etapes[0].constat, "Plan 04-B non fourni");
  assert.equal(suite.avis[0].etapes[0].ou, "page 12");
});

test("une lecture sans date d'émission ne compte pas dans la frise, et se dit", () => {
  const suite = laSuiteDesAvis([
    unRapport("1", "2025-03-04", [unAvis("A-12", "S")]),
    unRapport("?", "", [unAvis("A-12", "F")])
  ]);
  assert.equal(suite.avis[0].vie, LA_VIE_DUN_AVIS.OUVERT, "la levée non datée ne se place pas");
  assert.deepEqual(suite.sansDate.map((un) => un.document), ["RICT-?.pdf"]);
});

test("aucune lecture ne donne une suite vide, et non une erreur", () => {
  const suite = laSuiteDesAvis([]);
  assert.deepEqual(suite.avis, []);
  assert.deepEqual(suite.rapports, []);
  assert.equal(phraseDeLaSuite(suite), "");
  assert.equal(phraseDeLaSuite(null), "");
});

/* ── La phrase ─────────────────────────────────────────────────────────────── */

test("la phrase compte les suivis, les ouverts, et nomme les perdus de vue", () => {
  const suite = laSuiteDesAvis([
    unRapport("1", "2025-03-04", [unAvis("A-01", "S"), unAvis("A-02", "S"), unAvis("A-03", "F")]),
    unRapport("2", "2025-06-18", [unAvis("A-01", "S")])
  ]);
  assert.equal(phraseDeLaSuite(suite), "3 avis suivis sur 2 rapports · 2 encore ouverts · 1 sans nouvelles");
});

test("la phrase ne parle pas des perdus de vue quand il n'y en a pas", () => {
  const suite = laSuiteDesAvis([unRapport("1", "2025-03-04", [unAvis("A-01", "F")])]);
  assert.equal(phraseDeLaSuite(suite), "1 avis suivi sur 1 rapport · 0 encore ouvert");
});

test("une lecture tirée de la base se lit comme une lecture gelée", () => {
  // Le tableau charge les avis à part, sans l'analyse entière : les deux formes
  // doivent donner la même frise, faute de quoi l'écran dirait une chose et le
  // détail une autre (règle 4).
  const parLaColonne = laSuiteDesAvis([{
    id: "l-19", document: "RICT-1.pdf", numero_de_rapport: "1", etabli_le: "2025-03-04",
    legende: LEGENDE, avis: [unAvis("A-12", "S")]
  }]);
  const parLanalyse = laSuiteDesAvis([unRapport("1", "2025-03-04", [unAvis("A-12", "S")])]);

  assert.deepEqual(parLaColonne.avis, parLanalyse.avis);
});

/* ── La date d'émission est écrite dans les mots du document ────────────────── */

test("les rapports se rangent par chronologie, et non par le jour du mois", () => {
  /**
   * **Le défaut qu'on cherche ici ne se voit sur aucun écran.** Chaque date
   * s'affiche juste ; c'est leur *ordre* qui était faux, parce qu'on comparait
   * « 28/03/2025 » à « 16/04/2025 » comme du texte — c'est-à-dire par le jour
   * du mois d'abord.
   *
   * Les six dates sont celles d'un chantier réel, et elles sont choisies pour
   * que l'ordre textuel ne ressemble en rien à l'ordre du calendrier.
   */
  const { dates, sansDate } = lesRapportsEnOrdre([
    unRapport("A", "28/03/2025", []),
    unRapport("B", "16/04/2025", []),
    unRapport("C", "20/12/2024", []),
    unRapport("D", "23/01/2025", []),
    unRapport("E", "24/01/2025", []),
    unRapport("F", "25/11/2024", [])
  ]);

  assert.deepEqual(
    dates.map((un) => un.numero),
    ["F", "C", "D", "E", "A", "B"],
    "25/11/2024 → 20/12/2024 → 23/01/2025 → 24/01/2025 → 28/03/2025 → 16/04/2025"
  );
  assert.deepEqual(sansDate, [], "ces six dates se lisent toutes");
});

test("la frise garde les mots du document, et range sur le jour", () => {
  // La date affichée reste celle qu'on retrouvera en ouvrant le PDF. Rendre
  // « 2025-03-28 » ferait chercher dans le document une date qu'il n'écrit pas.
  const { dates } = lesRapportsEnOrdre([unRapport("A", "28/03/2025", [])]);
  assert.equal(dates[0].etabliLe, "28/03/2025");
  assert.equal(dates[0].jour, "2025-03-28");
});

test("les deux écritures se mélangent sans se déclasser", () => {
  // La base range en ISO, le document parle français : les deux arrivent dans
  // la même colonne, et il n'y a aucune raison de les séparer.
  const { dates } = lesRapportsEnOrdre([
    unRapport("A", "28/03/2025", []),
    unRapport("B", "2024-12-20", []),
    unRapport("C", "16/04/2025", [])
  ]);
  assert.deepEqual(dates.map((un) => un.numero), ["B", "A", "C"]);
});

test("un avis levé ne se rouvre pas par un rapport plus ancien", () => {
  /**
   * **C'est le défaut tel qu'il se montrait.** Trois rapports : l'avis est
   * suspendu en novembre, encore suspendu en mars, levé en avril. En ordre
   * textuel, avril passait **avant** novembre — l'avis se levait d'abord, puis
   * se « rouvrait » par le rapport le plus ancien du dossier, et la frise
   * annonçait un point rouvert que personne n'avait rouvert.
   */
  const suite = laSuiteDesAvis([
    unRapport("A", "25/11/2024", [unAvis("A-12", "S")]),
    unRapport("B", "28/03/2025", [unAvis("A-12", "S")]),
    unRapport("C", "16/04/2025", [unAvis("A-12", "F")])
  ]);

  const [avis] = suite.avis;
  assert.equal(avis.vie, LA_VIE_DUN_AVIS.FERME, "le dernier mot est celui d'avril");
  assert.deepEqual(
    avis.etapes.map((une) => une.apporte),
    [
      CE_QUE_LE_RAPPORT_APPORTE.NEUF,
      CE_QUE_LE_RAPPORT_APPORTE.RAPPEL,
      CE_QUE_LE_RAPPORT_APPORTE.LEVE
    ],
    "neuf en novembre, rappelé en mars, levé en avril — et rien de rouvert"
  );
});

test("une date écrite d'une façon qu'on ne sait pas lire se compte à part", () => {
  // Et non rangée au hasard : « on ne sait pas quand » tombe du même côté que
  // « il n'y a pas de date », ce qui est exactement ce qu'on sait (règle 5).
  const { dates, sansDate } = lesRapportsEnOrdre([
    unRapport("A", "mars 2025", []),
    unRapport("B", "16/04/2025", [])
  ]);
  assert.deepEqual(dates.map((un) => un.numero), ["B"]);
  assert.deepEqual(sansDate.map((un) => un.numero), ["A"]);
});
