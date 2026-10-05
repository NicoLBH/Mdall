/**
 * L'épreuve du parcours de démonstration.
 *
 * **Les deux défauts qu'on cherche ici ne se voient pas à l'écran : ils
 * concluent trop.**
 *
 * Le premier est un parcours qui annonce des étapes franchies sur un projet qui
 * ne les a pas franchies — ce serait exactement le tour de magie que ce tour
 * existe pour défaire. Le second est un parcours qui dit « pas encore » d'une
 * étape dont la base n'a rien répondu : il affirmerait une absence qu'il n'a
 * pas lue (règle 5).
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  CE_QUE_LETAT_DIT, CE_QUE_LE_PARCOURS_NE_RACONTE_PAS, LES_ETAPES_DU_PARCOURS,
  LES_FAITS_DU_PARCOURS, OU_EN_EST_LETAPE, OU_SE_RANGENT_LES_LECTURES, RIEN_NEST_ECRIT,
  leCranDeLetape, lesCransDuParcours, letapeDite, ouEnEstLeParcours, phraseDuParcours,
  unBlocDeLaMemoire
} from "./le-parcours-de-la-demonstration.js";
import { LES_CRANS, lesCheminsEntreBlocs } from "./les-crans-de-la-traduction.js";
import { CE_QUE_DIT_LA_FAMILLE } from "./les-familles-de-document.js";

/** Un chantier où tout a eu lieu. */
const TOUT_FAIT = Object.fromEntries(
  Object.values(LES_FAITS_DU_PARCOURS).map((fait) => [fait, 3])
);

/** Un chantier neuf : la base a répondu, et elle a répondu zéro partout. */
const RIEN_FAIT = Object.fromEntries(
  Object.values(LES_FAITS_DU_PARCOURS).map((fait) => [fait, 0])
);

/* ── Les sept étapes ──────────────────────────────────────────────────────── */

test("chaque étape porte son rang, son écran, et ce qu'elle ne montre pas", () => {
  /**
   * **`ceQuElleNeMontrePas` est obligatoire**, et c'est la propriété la plus
   * importante de ce module. Une étape sans elle se lirait comme une étape qui
   * couvre tout son sujet, et sept étapes vertes diraient « tout est vérifié »
   * (règle 3).
   */
  for (const une of LES_ETAPES_DU_PARCOURS) {
    assert.ok(une.cle, "une étape sans clé ne se retrouve pas");
    assert.ok(une.titre, `${une.cle} : sans titre`);
    assert.ok(une.question, `${une.cle} : sans question`);
    assert.ok(une.ou, `${une.cle} : sans écran`);
    assert.ok(une.cible, `${une.cle} : sans cible de navigation`);
    assert.ok(une.ceQuOnVoit, `${une.cle} : sans ce qu'on y voit`);
    assert.ok(une.ceQuElleProuve, `${une.cle} : sans ce qu'elle prouve`);
    assert.ok(une.ceQuElleNeMontrePas, `${une.cle} : sans ce qu'elle ne montre pas`);
    assert.ok(une.leFait, `${une.cle} : sans fait à lire dans le projet`);
  }
});

test("les rangs se suivent, et aucune clé ne se répète", () => {
  // Un rang qui saute ferait dire « étape 5 sur 7 » d'une quatrième.
  assert.deepEqual(
    LES_ETAPES_DU_PARCOURS.map((une) => une.rang),
    LES_ETAPES_DU_PARCOURS.map((_, rang) => rang + 1)
  );
  const cles = LES_ETAPES_DU_PARCOURS.map((une) => une.cle);
  assert.equal(new Set(cles).size, cles.length);
});

test("chaque étape lit un fait que le parcours sait nommer", () => {
  // Une étape qui s'appuierait sur un fait absent du registre serait une étape
  // que personne ne peut renseigner : elle resterait inconnue pour toujours,
  // sans que rien ne dise pourquoi (règle 1).
  const connus = new Set(Object.values(LES_FAITS_DU_PARCOURS));
  for (const une of LES_ETAPES_DU_PARCOURS) {
    assert.equal(connus.has(une.leFait), true, `${une.cle} lit « ${une.leFait} »`);
  }
});

test("chaque fait nommé sert à une étape", () => {
  // L'autre sens : un fait que l'écran irait chercher en base pour personne
  // serait une requête payée pour rien (règle 1).
  const employes = new Set(LES_ETAPES_DU_PARCOURS.map((une) => une.leFait));
  for (const fait of Object.values(LES_FAITS_DU_PARCOURS)) {
    assert.equal(employes.has(fait), true, `« ${fait} » ne sert à aucune étape`);
  }
});

test("une étape se retrouve par sa clé, et une clé inconnue ne rend rien", () => {
  assert.equal(letapeDite("signer").rang, 5);
  assert.equal(letapeDite("inconnue"), null);
  assert.equal(letapeDite(""), null);
  assert.equal(letapeDite(null), null);
});

test("les quatre états ont chacun leur mot et leur ton", () => {
  for (const etat of Object.values(OU_EN_EST_LETAPE)) {
    const dit = CE_QUE_LETAT_DIT[etat];
    assert.ok(dit?.mot && dit?.vaut && dit?.dit, etat);
  }
  // Quatre mots distincts : deux états qui se lisent pareil n'en font qu'un.
  const mots = Object.values(CE_QUE_LETAT_DIT).map((un) => un.mot);
  assert.equal(new Set(mots).size, mots.length);
});

/* ── L'ordre porte le sens ────────────────────────────────────────────────── */

test("sur un chantier neuf, seule la première étape est franchissable", () => {
  /**
   * **C'est la propriété centrale.** Les six autres ne sont pas « à faire » :
   * elles n'auraient rien à montrer, et les présenter comme la première ferait
   * cliquer sur six écrans vides.
   */
  const { etapes, prochaine, franchies, dit } = ouEnEstLeParcours(RIEN_FAIT);

  assert.equal(etapes[0].ou, OU_EN_EST_LETAPE.FRANCHISSABLE);
  assert.deepEqual(
    etapes.slice(1).map((une) => une.ou),
    Array(6).fill(OU_EN_EST_LETAPE.HORS_DATTEINTE)
  );
  assert.equal(prochaine.cle, "verser");
  assert.equal(franchies, 0);
  assert.equal(dit, "0 étape franchie sur 7");
});

test("l'étape qui suit une étape franchie devient la prochaine", () => {
  const { etapes, prochaine } = ouEnEstLeParcours({
    ...RIEN_FAIT,
    [LES_FAITS_DU_PARCOURS.DOCUMENTS_VERSES]: 18,
    [LES_FAITS_DU_PARCOURS.DOCUMENTS_ANALYSES]: 18
  });

  assert.equal(etapes[0].ou, OU_EN_EST_LETAPE.FRANCHIE);
  assert.equal(etapes[1].ou, OU_EN_EST_LETAPE.FRANCHIE);
  assert.equal(etapes[2].ou, OU_EN_EST_LETAPE.FRANCHISSABLE);
  assert.equal(prochaine.cle, "mdall");
});

test("une étape franchie plus loin ne rend pas franchissable celle d'avant", () => {
  /**
   * **Le cas tordu, et il arrive.** Un chantier peut porter des affirmations en
   * mémoire — versées par un autre chemin, à la main, ou par un import — sans
   * qu'aucun document n'ait été lu. L'étape 6 est alors franchie *et* l'étape 3
   * reste hors d'atteinte : c'est la vérité, et le parcours ne doit pas la
   * lisser pour avoir l'air cohérent.
   */
  const { etapes, franchies, prochaine } = ouEnEstLeParcours({
    ...RIEN_FAIT,
    [LES_FAITS_DU_PARCOURS.AFFIRMATIONS_EN_MEMOIRE]: 40
  });

  assert.equal(etapes[5].ou, OU_EN_EST_LETAPE.FRANCHIE, "la mémoire porte 40 affirmations");
  assert.equal(etapes[2].ou, OU_EN_EST_LETAPE.HORS_DATTEINTE, "aucun document lu");
  assert.equal(franchies, 1);
  // La prochaine reste la première : c'est par là qu'on reprend la chaîne.
  assert.equal(prochaine.cle, "verser");
});

test("un parcours entier n'a plus de prochaine étape", () => {
  const { franchies, combien, prochaine, dit } = ouEnEstLeParcours(TOUT_FAIT);
  assert.equal(franchies, 7);
  assert.equal(combien, 7);
  assert.equal(prochaine, null);
  assert.equal(dit, "7 étapes franchies sur 7");
});

/* ── Ce qu'on ne sait pas ─────────────────────────────────────────────────── */

test("une base muette rend une étape sans réponse, et non une étape à faire", () => {
  /**
   * **« On n'a pas su demander » n'est pas « il n'y en a aucun ».** Sans cette
   * distinction, une requête refusée afficherait un chantier vierge, et l'on
   * irait reverser des documents déjà versés (règle 5).
   */
  const { etapes, franchies, inconnues, dit } = ouEnEstLeParcours({});

  assert.deepEqual(
    etapes.map((une) => une.ou),
    Array(7).fill(OU_EN_EST_LETAPE.INCONNUE)
  );
  assert.equal(franchies, 0);
  assert.equal(inconnues, 7);
  assert.equal(dit, "0 étape franchie sur 7 · 7 étapes sont restées sans réponse");
});

test("l'ignorance se propage aux suivantes, et ne devient pas une absence", () => {
  // La deuxième n'a pas répondu : on ne peut dire ni que la troisième est hors
  // d'atteinte — ce serait affirmer que la deuxième n'a pas eu lieu — ni
  // qu'elle est à faire.
  const { etapes } = ouEnEstLeParcours({
    ...RIEN_FAIT,
    [LES_FAITS_DU_PARCOURS.DOCUMENTS_VERSES]: 2,
    [LES_FAITS_DU_PARCOURS.DOCUMENTS_ANALYSES]: null
  });

  assert.equal(etapes[0].ou, OU_EN_EST_LETAPE.FRANCHIE);
  assert.equal(etapes[1].ou, OU_EN_EST_LETAPE.INCONNUE);
  assert.equal(etapes[2].ou, OU_EN_EST_LETAPE.INCONNUE, "l'ignorance se propage");
});

test("un compte qui n'est pas un nombre ne devient pas zéro", () => {
  // `Number("")` vaut 0 et `Number("douze")` vaut NaN : les laisser passer
  // inventerait une absence là où il n'y a qu'une lecture ratée.
  for (const valeur of ["", "douze", {}, NaN, undefined]) {
    const { etapes } = ouEnEstLeParcours({ [LES_FAITS_DU_PARCOURS.DOCUMENTS_VERSES]: valeur });
    assert.equal(etapes[0].ou, OU_EN_EST_LETAPE.INCONNUE, `« ${String(valeur)} »`);
  }
});

test("un compte lisible écrit en texte se lit quand même", () => {
  // La base rend parfois un compte en chaîne : « 18 » est un compte.
  const { etapes } = ouEnEstLeParcours({ [LES_FAITS_DU_PARCOURS.DOCUMENTS_VERSES]: "18" });
  assert.equal(etapes[0].ou, OU_EN_EST_LETAPE.FRANCHIE);
  assert.equal(etapes[0].combien, 18);
});

test("aucun fait du tout ne casse rien", () => {
  for (const rien of [null, undefined, "pas un objet", 3]) {
    const { combien, inconnues } = ouEnEstLeParcours(rien);
    assert.equal(combien, 7);
    assert.equal(inconnues, 7);
  }
});

/* ── La phrase ────────────────────────────────────────────────────────────── */

test("la phrase porte toujours son dénominateur", () => {
  // « 4 étapes » ne veut rien dire : sur sept, c'est plus de la moitié ; sur
  // vingt, c'est le début (règle 2).
  assert.equal(phraseDuParcours({ franchies: 4, combien: 7 }), "4 étapes franchies sur 7");
  assert.equal(phraseDuParcours({ franchies: 1, combien: 7 }), "1 étape franchie sur 7");
});

test("la phrase accorde le nom et le verbe des sans-réponse", () => {
  assert.equal(
    phraseDuParcours({ franchies: 2, inconnues: 1, combien: 7 }),
    "2 étapes franchies sur 7 · 1 étape est restée sans réponse"
  );
  assert.equal(
    phraseDuParcours({ franchies: 2, inconnues: 3, combien: 7 }),
    "2 étapes franchies sur 7 · 3 étapes sont restées sans réponse"
  );
});

test("sans étapes, il n'y a rien à dire", () => {
  assert.equal(phraseDuParcours({}), "");
  assert.equal(phraseDuParcours(), "");
});

/* ── Les crans, et les trous ──────────────────────────────────────────────── */

test("les crans du parcours viennent du registre des crans", () => {
  /**
   * **Et non des étapes.** Un cran qu'aucune étape ne met en lumière est un
   * trou du parcours ; le déduire des étapes le rendrait invisible, puisqu'il
   * n'y figurerait pas du tout (règle 3).
   */
  const crans = lesCransDuParcours();
  assert.deepEqual(crans.map((un) => un.cle), LES_CRANS.map((un) => un.cle));
  for (const un of crans) assert.ok(Array.isArray(un.etapes));
});

test("les quatre crans sont tous traversés par au moins une étape", () => {
  // Si cette épreuve tombe, ce n'est pas elle qu'il faut changer : c'est qu'un
  // cran a cessé d'être montré, et le parcours ne raconte plus la chaîne entière.
  for (const un of lesCransDuParcours()) {
    assert.notEqual(un.etapes.length, 0, `le cran « ${un.libelle} » n'est montré nulle part`);
  }
});

test("un cran que personne ne montre apparaît quand même, et vide", () => {
  /**
   * **La garde que les quatre crans d'aujourd'hui rendaient invisible.**
   *
   * Les quatre étant tous traversés, déduire la liste des étapes donnait le même
   * résultat : la batterie a coupé la garde et rien n'est tombé. On passe donc
   * un cinquième cran que nulle étape ne met en lumière, et c'est le seul moyen
   * de voir que le trou se montre plutôt que de disparaître (règle 3).
   */
  const avecUnCranDeTrop = lesCransDuParcours(
    [...LES_CRANS, { cle: "la-preuve", rang: 5, libelle: "Les preuves" }]
  );

  const trou = avecUnCranDeTrop.find((un) => un.cle === "la-preuve");
  assert.ok(trou, "le cran non montré a disparu de la liste au lieu de s'y voir vide");
  assert.deepEqual(trou.etapes, []);
  assert.equal(avecUnCranDeTrop.length, LES_CRANS.length + 1);
});

test("une étape qui nomme un cran inconnu ne rejoint aucun cran", () => {
  // Et ne tombe pas dans le premier : un bloc rangé sous un cran qui n'est pas
  // le sien ferait annoncer d'une étape ce qu'elle ne montre pas.
  const crans = lesCransDuParcours(LES_CRANS, [
    { cle: "egaree", cran: "un-cran-qui-nexiste-pas" }
  ]);
  for (const un of crans) assert.deepEqual(un.etapes, [], un.cle);
});

test("le cran d'une étape se lit dans le registre, et non chez nous", () => {
  // Les libellés des crans vivent dans `les-crans-de-la-traduction.js`. Les
  // recopier ici en ferait deux, qui finiraient par ne plus dire pareil.
  assert.equal(leCranDeLetape(letapeDite("crans")).libelle, "Les données");
  assert.equal(leCranDeLetape(letapeDite("verser")), null, "verser n'est pas un cran");
  assert.equal(leCranDeLetape(null), null);
});

/* ── Le cadre, et les trous dits ──────────────────────────────────────────── */

test("le cadre dit que rien n'est écrit, et nomme l'étape qui écrit", () => {
  // La cinquième règle de ces écrans : plus on montre, plus on risque de
  // laisser croire que c'est déjà fait.
  assert.match(RIEN_NEST_ECRIT, /ne verse rien/);
  assert.match(RIEN_NEST_ECRIT, /cinquième/);
  assert.match(RIEN_NEST_ECRIT, /signature/);
});

test("ce que le parcours ne raconte pas est dit, et non laissé dans un fichier", () => {
  assert.notEqual(CE_QUE_LE_PARCOURS_NE_RACONTE_PAS.length, 0);
  for (const un of CE_QUE_LE_PARCOURS_NE_RACONTE_PAS) {
    assert.equal(typeof un, "string");
    assert.notEqual(un.trim(), "");
  }
});

test("l'étape de la signature est la seule à dire que quelque chose entre", () => {
  /**
   * **Le fondamental de Mdall, éprouvé sur les mots de l'écran** : « on ne doit
   * rien verser directement dans la mémoire, jamais ». Si une autre étape se
   * mettait à annoncer une écriture, ce serait soit une erreur de phrase, soit
   * — bien pire — une écriture qu'on aurait laissée passer ailleurs.
   */
  const quiEcrivent = LES_ETAPES_DU_PARCOURS
    .filter((une) => /entre dans la mémoire/.test(une.ceQuElleProuve))
    .map((une) => une.cle);

  assert.deepEqual(quiEcrivent, ["signer"]);
});

/* ── Ce que la base porte, et où ──────────────────────────────────────────── */

test("les tables des lectures viennent du registre des familles", () => {
  /**
   * **Et non d'une liste écrite ici.** Une famille ajoutée au registre et
   * oubliée dans cette liste ferait un parcours qui compte moins de documents
   * lus qu'il n'y en a — et comme un compte plus petit reste un compte, rien ne
   * le dirait (règle 10).
   */
  const attendues = [...new Set(
    Object.values(CE_QUE_DIT_LA_FAMILLE)
      .map((famille) => famille?.laLectureEstGardeeDans)
      .filter(Boolean)
  )];

  assert.deepEqual([...OU_SE_RANGENT_LES_LECTURES].sort(), attendues.sort());
  assert.notEqual(OU_SE_RANGENT_LES_LECTURES.length, 0, "aucune table : rien ne se compterait");
});

test("une règle de la mémoire devient une fonction, pas une donnée", () => {
  /**
   * C'est ce qui décide du cran 4, donc du septième et dernier point du
   * parcours : sans fonctions, aucun chemin entre fonctions, et aucune
   * prédiction. Lire la nature ailleurs que dans la charge ferait compter comme
   * données les fonctions que la Mémoire montre comme fonctions (règle 4).
   */
  const bloc = unBlocDeLaMemoire({
    id: "aff-1",
    subject_key: "Classement du bâtiment",
    payload: {
      referentiel: true,
      nature: "raisonnement",
      regle: { conditions: [{ sujet: "Hauteur du plancher bas" }] }
    }
  });

  assert.equal(bloc.regle, true);
  assert.equal(bloc.nature, "raisonnement");
  assert.deepEqual(bloc.lit, ["Hauteur du plancher bas"]);
  assert.deepEqual(bloc.produit, ["Classement du bâtiment"]);
});

test("une affirmation ordinaire n'est pas une règle", () => {
  const bloc = unBlocDeLaMemoire({
    id: "aff-2", subject_key: "Classe de sol", payload: { nature: "constat" }
  });
  assert.equal(bloc.regle, false);
  assert.equal(bloc.nature, "constat");
  assert.deepEqual(bloc.lit, []);
});

test("une affirmation sans sujet garde son identifiant comme sujet", () => {
  // Sans lui, deux affirmations sans clé métier porteraient le même sujet vide,
  // et `lesCheminsEntreBlocs` en ferait un chemin de l'une vers l'autre.
  const bloc = unBlocDeLaMemoire({ id: "aff-3", payload: {} });
  assert.equal(bloc.sujet, "aff-3");
});

test("une ligne vide ne casse rien, et ne devient pas une fonction", () => {
  for (const rien of [null, undefined, {}]) {
    const bloc = unBlocDeLaMemoire(rien);
    assert.equal(bloc.regle, false);
    assert.deepEqual(bloc.lit, []);
  }
});

test("deux fonctions qui s'enchaînent font un chemin, et deux données aucun", () => {
  /**
   * **Le fait de la septième étape, éprouvé de bout en bout.** C'est la seule
   * du parcours qui ne se compte pas : elle se calcule en regardant les
   * fonctions deux à deux, et un parcours qui l'annoncerait franchie sur deux
   * données sans règle promettrait une prédiction impossible.
   */
  const enchainees = [
    unBlocDeLaMemoire({
      id: "amont", subject_key: "Hauteur",
      payload: { referentiel: true, regle: { conditions: [{ sujet: "Niveaux" }] } }
    }),
    unBlocDeLaMemoire({
      id: "aval", subject_key: "Classement",
      payload: { referentiel: true, regle: { conditions: [{ sujet: "Hauteur" }] } }
    })
  ];
  assert.equal(lesCheminsEntreBlocs(enchainees).length, 1);

  const posees = [
    unBlocDeLaMemoire({ id: "a", subject_key: "Hauteur", payload: { nature: "constat" } }),
    unBlocDeLaMemoire({ id: "b", subject_key: "Classement", payload: { nature: "constat" } })
  ];
  assert.equal(lesCheminsEntreBlocs(posees).length, 0);
});
