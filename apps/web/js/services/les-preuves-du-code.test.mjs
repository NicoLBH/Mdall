/**
 * L'épreuve des preuves du code.
 *
 * ## Les fixtures passent par le vrai écrivain
 *
 * Les blocs viennent de `blocsAProposer`, et les cas sont rejoués par
 * `evaluerLaRegle` — celui du rejeu de la mémoire et du bac d'essai. Une fixture
 * qui recopierait la forme d'un bloc à la main cesserait de tomber le jour où
 * l'écrivain la change, et ces preuves-ci se mettraient à juger du vide en
 * silence.
 *
 * ## Les trois choses qu'elle cherche
 *
 * 1. **Une borne montre, elle ne juge pas.** C'est la correction la plus
 *    importante de ce module : le premier jet dérivait l'attente d'une borne de
 *    l'opérateur qu'elle prétendait éprouver, donc elle passait toujours. Une
 *    épreuve qui vérifiait « la borne est conforme » confirmait le défaut au
 *    lieu de le voir.
 * 2. **Un indécidable ne compte ni pour ni contre.** Au dénominateur il ferait
 *    baisser le taux quand il manque une entrée ; tu, il le ferait monter quand
 *    la fonction cesse de pouvoir répondre.
 * 3. **Et un cas qui montre non plus**, et il se dit autrement : rien ne manque,
 *    la fonction a répondu, personne n'a d'attente à confronter.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  CE_QUE_LES_PREUVES_NE_DISENT_PAS, DOU, PREUVE, ceQueLeDocumentDit,
  ceQueLesPreuvesDisent, laSomme, lePasDuSeuil, lesBornesDeLaCondition, lesPreuvesDuBloc,
  memeReponse
} from "./les-preuves-du-code.js";
import { blocsAProposer, blocsDeLaProposition } from "../views/ui/mdall-de-la-proposition.js";
import { NATURE } from "./assertion-taxonomy.js";
import { OPERATEUR, PROVENANCE, STATUT } from "./memoire-en-texte.js";

/** Une valeur du projet, telle qu'un producteur la rend. */
const uneValeur = (sujet, valeur, nature = NATURE.DONNEE_BASE) => ({
  sujet, valeur, nature, quoi: `Ce que le projet dit de « ${sujet} ».`,
  provenance: { type: PROVENANCE.DOCUMENT, quoi: "relevé du 12 mars 2026" },
  citation: `${sujet} : ${valeur}`, statut: STATUT.RETENU, zones: []
});

/** Une fonction, avec ses conditions. */
const uneRegle = (sujet, valeur, conditions, { sauf = [], sinon = "", sinonSi = [] } = {}) => ({
  sujet, valeur, referentiel: true, domaine: "incendie",
  regle: { conditions, sauf, sinon, ...(sinonSi.length ? { sinonSi } : {}) },
  provenance: { type: PROVENANCE.TEXTE, quoi: "arrêté du 31 janvier 1986" },
  statut: STATUT.RETENU, zones: []
});

const si = (sujet, operateur, valeur, { unite = "", joint = "" } = {}) =>
  ({ sujet, operateur, valeur: [String(valeur)], ...(unite ? { unite } : {}),
    ...(joint ? { joint } : {}) });

/** Les blocs, et les preuves d'un seul d'entre eux. */
const preuves = (producteurs, sujetDeLaRegle) => {
  const blocs = blocsAProposer(producteurs, {});
  const dit = ceQueLeDocumentDit(blocs);
  const bloc = blocs.find((un) => un.sujet === sujetDeLaRegle);
  assert.ok(bloc, `aucun bloc pour « ${sujetDeLaRegle} »`);
  return lesPreuvesDuBloc(bloc, { dit });
};

/* ── Le pas d'un seuil ────────────────────────────────────────────────────── */

test("le pas d'un seuil est une unité à la précision où il est écrit", () => {
  // Un pas plus fin éprouverait une précision que l'auteur du seuil n'a pas
  // écrite ; un pas plus gros laisserait passer la comparaison stricte.
  assert.equal(lePasDuSeuil("28"), 1);
  assert.equal(lePasDuSeuil("28,5"), 0.1);
  assert.equal(lePasDuSeuil("28.05"), 0.01);
  assert.equal(lePasDuSeuil(""), 1);
});

test("les deux bornes d'un seuil encadrent le basculement", () => {
  const auPlus = lesBornesDeLaCondition(si("Hauteur", OPERATEUR.AU_PLUS, "28", { unite: "m" }));
  assert.equal(auPlus.dedans, 28, "« au plus 28 » doit s'appliquer à 28");
  assert.equal(auPlus.dehors, 29);

  const moinsDe = lesBornesDeLaCondition(si("Hauteur", OPERATEUR.MOINS_DE, "28"));
  assert.equal(moinsDe.dedans, 27, "« moins de 28 » ne doit pas s'appliquer à 28");
  assert.equal(moinsDe.dehors, 28);

  const auMoins = lesBornesDeLaCondition(si("Hauteur", OPERATEUR.AU_MOINS, "28"));
  assert.equal(auMoins.dedans, 28);
  assert.equal(auMoins.dehors, 27);

  const plusDe = lesBornesDeLaCondition(si("Hauteur", OPERATEUR.PLUS_DE, "28"));
  assert.equal(plusDe.dedans, 29);
  assert.equal(plusDe.dehors, 28);
});

test("on ne fabrique pas de borne sur ce qu'on ne sait pas faire varier", () => {
  for (const condition of [
    si("Usage", OPERATEUR.EGAL, "habitation"),
    // **Une égalité numérique non plus**, et c'est la batterie de mutations qui
    // l'a demandé : `= 28` porte bien un nombre, et une borne fabriquée dessus
    // essaierait 28 et 29 d'une condition qui ne connaît pas de « juste
    // au-dessus » — on montrerait un basculement là où il y a un point.
    si("Hauteur", OPERATEUR.EGAL, "28", { unite: "m" }),
    si("Hauteur", OPERATEUR.PARMI, "28"),
    si("Usage", OPERATEUR.PARMI, "habitation"),
    { sujet: "Usage", operateur: OPERATEUR.RENSEIGNE, valeur: [] },
    si("Hauteur", OPERATEUR.AU_PLUS, "vingt-huit"),
    si("", OPERATEUR.AU_PLUS, "28")
  ]) {
    assert.equal(lesBornesDeLaCondition(condition), null,
      `une borne a été fabriquée sur ${JSON.stringify(condition)}`);
  }
  assert.equal(lesBornesDeLaCondition(null), null);
});

/* ── Le cas qui vient du document ─────────────────────────────────────────── */

test("une fonction retrouve la réponse du document dont elle sort", () => {
  const { cas, assiette } = preuves([
    uneValeur("Hauteur du dernier plancher", "26 m"),
    uneRegle("Classement du bâtiment", "3e famille B",
      [si("Hauteur du dernier plancher", OPERATEUR.AU_PLUS, "28", { unite: "m" })])
  ], "Classement du bâtiment");

  const duDocument = cas.find((un) => un.dou === DOU.DOCUMENT);
  assert.ok(duDocument, "aucun cas construit depuis le document");
  assert.equal(duDocument.verdict, PREUVE.CONFORME, JSON.stringify(duDocument));
  assert.equal(duDocument.attendu, "3e famille B");
  // Les entrées du cas sont nommées : sans elles, un écart ne se diagnostique pas.
  assert.deepEqual(duDocument.entrees,
    [{ sujet: "Hauteur du dernier plancher", valeur: "26 m" }]);

  assert.ok(assiette.conformes >= 1);
  assert.equal(assiette.ecarts, 0);
});

test("une règle qui ne retrouve pas la réponse du document est un écart", () => {
  // La règle conclut « 3e famille B » si la hauteur est au plus 28 m. Le
  // document dit 51 m : la règle ne s'applique donc pas, et elle ne retrouve
  // pas la valeur portée sur sa ligne.
  const { cas } = preuves([
    uneValeur("Hauteur du dernier plancher", "51 m"),
    uneRegle("Classement du bâtiment", "3e famille B",
      [si("Hauteur du dernier plancher", OPERATEUR.AU_PLUS, "28", { unite: "m" })])
  ], "Classement du bâtiment");

  const duDocument = cas.find((un) => un.dou === DOU.DOCUMENT);
  assert.notEqual(duDocument.verdict, PREUVE.CONFORME,
    "une fonction qui ne retrouve pas la réponse du document passe pour conforme");
});

test("la casse et la virgule décimale ne font pas un écart", () => {
  // Sinon la liste d'écarts deviendrait du bruit qu'on cesse de lire, à chaque
  // fois qu'un document écrit autrement qu'un autre.
  const { cas } = preuves([
    uneValeur("Hauteur", "26 m"),
    uneRegle("Épaisseur", "0,5 m", [si("Hauteur", OPERATEUR.AU_PLUS, "28", { unite: "m" })],
      { sinon: "" })
  ], "Épaisseur");

  const duDocument = cas.find((un) => un.dou === DOU.DOCUMENT);
  assert.equal(duDocument.verdict, PREUVE.CONFORME, JSON.stringify(duDocument));
});

/* ── Les bornes : le test qui justifie le module ──────────────────────────── */

/**
 * **Un seuil montre où la fonction bascule, et ne se juge pas.**
 *
 * C'est la correction qui compte. Le premier jet attendait, d'une règle écrite
 * `<= 28`, qu'elle s'applique à 28 et pas à 29 — une attente **dérivée de
 * l'opérateur lui-même**. Une règle écrite `< 28` s'essayait alors à 27 et 28,
 * et passait aussi : la borne se donnait raison toute seule.
 *
 * Ce qu'elle fait vraiment est plus utile : elle donne les deux nombres, et la
 * question va au lecteur, qui sait, lui, si 28 doit être dedans.
 */
test("un seuil donne ses deux côtés, et ne se compte pas comme un succès", () => {
  const { cas, assiette } = preuves([
    uneValeur("Hauteur", "26 m"),
    uneRegle("Classement", "3e famille B",
      [si("Hauteur", OPERATEUR.AU_PLUS, "28", { unite: "m" })])
  ], "Classement");

  const bornes = cas.filter((un) => un.dou === DOU.BORNE);
  assert.equal(bornes.length, 1, "les deux côtés d'un seuil vont dans un seul cas");

  const borne = bornes[0];
  assert.equal(borne.verdict, PREUVE.MONTRE,
    "une borne porte un verdict de conformité : elle se donne raison toute seule");
  assert.equal(borne.seuil, "Hauteur <= 28 m");
  assert.equal(borne.bascule, true);

  assert.deepEqual(borne.cotes.map((un) => un.essaye), ["28 m", "29 m"]);
  assert.equal(borne.cotes[0].rendu, "la fonction rend « 3e famille B »");
  assert.equal(borne.cotes[1].rendu, "la fonction ne s'applique pas");

  // La question est posée, et elle est posée au lecteur.
  assert.match(borne.question, /Le seuil est écrit à 28 m\. Est-ce le bon \?/);

  // Et elle n'entre ni dans les conformes ni au dénominateur.
  assert.equal(assiette.montres, 1);
  assert.equal(assiette.juges, 1, "le seuil est entré au dénominateur");
  assert.equal(assiette.conformes, 1, "seul le cas du document est jugé");
});

test("un seuil écrit avec un autre opérateur montre d'autres nombres", () => {
  // `< 28` bascule entre 27 et 28, `<= 28` entre 28 et 29. Les deux sont
  // « conformes à ce qu'elles disent » — c'est bien pour cela qu'on ne les juge
  // pas, et qu'on montre les nombres : eux seuls distinguent les deux écritures.
  const strict = preuves([
    uneValeur("Hauteur", "26 m"),
    uneRegle("Classement", "3e famille B",
      [si("Hauteur", OPERATEUR.MOINS_DE, "28", { unite: "m" })])
  ], "Classement").cas.find((un) => un.dou === DOU.BORNE);

  assert.equal(strict.seuil, "Hauteur < 28 m");
  assert.deepEqual(strict.cotes.map((un) => un.essaye), ["27 m", "28 m"]);
  assert.equal(strict.cotes[1].rendu, "la fonction ne s'applique pas",
    "à 28, une règle écrite « moins de 28 » ne doit pas s'appliquer");
});

test("les branches ont leurs bornes aussi", () => {
  // Une règle à trois cas a trois seuils. N'éprouver que le premier laisserait
  // deux tiers de la fonction sans preuve.
  const { cas } = preuves([
    uneValeur("Hauteur", "26 m"),
    uneRegle("Classement", "3e famille B",
      [si("Hauteur", OPERATEUR.AU_PLUS, "28", { unite: "m" })],
      { sinonSi: [{ conditions: [si("Hauteur", OPERATEUR.AU_PLUS, "50", { unite: "m" })], alors: "4e famille" }] })
  ], "Classement");

  const seuils = new Set(cas.filter((un) => un.dou === DOU.BORNE)
    .map((un) => un.seuil.match(/<= (\d+)/)?.[1]));
  assert.deepEqual([...seuils].sort(), ["28", "50"],
    "la branche « sinon si » n'a pas été éprouvée");
});

/**
 * **Un seuil lu en « ou » ne décide pas seul, et la phrase le dit.**
 *
 * En « et », pousser une entrée dehors écarte la règle entière. En « ou », une
 * autre condition peut la retenir : poser la question « est-ce le bon seuil ? »
 * serait alors trompeur, puisque ce seuil ne tranche rien à lui seul.
 */
test("un seuil en « ou » dit qu'il ne décide pas seul", () => {
  const { cas } = preuves([
    uneValeur("Hauteur", "26 m"),
    uneValeur("Usage", "habitation"),
    uneRegle("Classement", "3e famille B", [
      si("Hauteur", OPERATEUR.AU_PLUS, "28", { unite: "m" }),
      si("Usage", OPERATEUR.EGAL, "habitation", { joint: "ou" })
    ])
  ], "Classement");

  const borne = cas.find((un) => un.dou === DOU.BORNE);
  assert.equal(borne.verdict, PREUVE.MONTRE);
  assert.match(borne.question, /se lit en « ou »/);
  assert.match(borne.question, /ne décide donc pas seul/);
  // Et les deux côtés répondent pareil, puisque l'autre condition la retient.
  assert.equal(borne.bascule, false,
    "un seuil retenu par un « ou » paraît basculer : on lirait qu'il décide");
});

/**
 * **Une règle sans valeur n'a rien à retrouver, et on ne la déclare pas conforme.**
 *
 * Le compter conforme serait se donner raison tout seul : personne n'a dit la
 * réponse. C'est `MONTRE` — la fonction a répondu, rien ne manque, il n'y a
 * simplement pas d'attendu.
 */
test("une fonction dont la ligne ne porte pas de valeur montre, sans se juger", () => {
  /**
   * **Par `blocsDeLaProposition`, et non par `blocsAProposer`.**
   *
   * L'Atelier écarte une affirmation sans valeur : elle n'arrive donc jamais
   * ici par la voie d'un producteur. Elle arrive par l'onglet Changements, qui
   * dessine les lignes du tableau telles qu'elles sont — et une ligne de règle
   * dont la valeur a été vidée en est une.
   */
  const [bloc] = blocsDeLaProposition([{
    cle: "classement", sujet: "Classement", changement: "nouveau",
    porteur: {
      item_key: "Classement",
      payload: {
        subject: "Classement", value: "", referentiel: true,
        regle: { conditions: [{ sujet: "Hauteur", operateur: OPERATEUR.AU_PLUS,
          valeur: ["28"], unite: "m" }], sauf: [], sinon: "" }
      }
    }
  }]);

  const { cas } = lesPreuvesDuBloc(bloc, { dit: new Map([["Hauteur", "26 m"]]) });
  const duDocument = cas.find((un) => un.dou === DOU.DOCUMENT);

  assert.ok(duDocument, "aucun cas construit depuis le document");
  assert.equal(duDocument.verdict, PREUVE.MONTRE,
    "un cas sans attendu se compte conforme : on se donne raison tout seul");
  assert.equal(duDocument.attendu, "");
  assert.equal(duDocument.rendu, "la fonction s'applique");
});

/* ── La tolérance de comparaison, éprouvée seule ──────────────────────────── */

/**
 * **Elle ne s'exerce pas par le chemin du document**, et la batterie de
 * mutations l'a montré : `evaluation.valeur` y est l'`alors` de la règle, donc
 * identique octet pour octet à ce que sa ligne porte.
 *
 * Elle sert pour de vrai — un document écrit « 0.5 m » là où un autre écrit
 * « 0,5 m » —, et elle s'éprouve donc ici, seule.
 */
test("deux réponses qui ne diffèrent que par la forme sont la même", () => {
  assert.equal(memeReponse("3e famille B", "3E Famille  B"), true);
  assert.equal(memeReponse("0.5 m", "0,5 m"), true);
  assert.equal(memeReponse(" CF 1 h ", "cf 1 h"), true);

  // Et ce qui diffère vraiment diffère : sans quoi la tolérance rendrait tout
  // conforme, et la liste d'écarts serait toujours vide.
  assert.equal(memeReponse("3e famille A", "3e famille B"), false);
  assert.equal(memeReponse("0,5 m", "0,6 m"), false);
  assert.equal(memeReponse("", "CF 1 h"), false);
});

/* ── Les indécidables ─────────────────────────────────────────────────────── */

test("un indécidable ne compte ni pour ni contre", () => {
  // Au dénominateur il ferait baisser le taux quand il manque une entrée ; tu,
  // il le ferait monter quand la fonction cesse de pouvoir répondre.
  const somme = laSomme([
    { verdict: PREUVE.CONFORME }, { verdict: PREUVE.CONFORME },
    { verdict: PREUVE.ECART },
    { verdict: PREUVE.INDECIDABLE }, { verdict: PREUVE.INDECIDABLE }
  ]);

  assert.equal(somme.cas, 5);
  assert.equal(somme.juges, 3, "les indécidables sont entrés au dénominateur");
  assert.equal(somme.indecidables, 2);
  assert.equal(somme.pourcent, 67);
  assert.equal(somme.dit, "2/3 cas conformes");
});

test("un cas qui montre ne compte pas non plus, et se dit autrement", () => {
  const somme = laSomme([
    { verdict: PREUVE.CONFORME },
    { verdict: PREUVE.MONTRE }, { verdict: PREUVE.MONTRE }
  ]);

  assert.equal(somme.juges, 1, "un seuil est entré au dénominateur");
  assert.equal(somme.montres, 2);
  assert.equal(somme.indecidables, 0,
    "un cas qui montre est compté comme indécidable : l'écran dirait qu'il manque une entrée");

  const dit = ceQueLesPreuvesDisent(somme);
  assert.match(dit, /2 seuils montrent où la fonction bascule/);
  assert.match(dit, /à vous de dire si c&#39;est le bon|à vous de dire si c'est le bon/);
});

test("aucun cas jugé ne se dit pas « 0 % »", () => {
  const somme = laSomme([{ verdict: PREUVE.INDECIDABLE }]);
  // « 0 % » se lit « tout est faux », là où c'est « rien n'a été jugé ».
  assert.equal(somme.pourcent, null);
  assert.equal(somme.dit, "aucun cas jugé");
});

test("une entrée que le document ne dit pas rend le cas indécidable, et la nomme", () => {
  const { cas } = preuves([
    uneRegle("Classement", "3e famille B",
      [si("Hauteur du dernier plancher", OPERATEUR.AU_PLUS, "28", { unite: "m" })])
  ], "Classement");

  const duDocument = cas.find((un) => un.dou === DOU.DOCUMENT);
  assert.equal(duDocument.verdict, PREUVE.INDECIDABLE);
  // Nommément : « indécidable » tout court envoie chercher, et ce sont les noms
  // manquants qu'on cherche.
  assert.deepEqual(duDocument.manquants, ["Hauteur du dernier plancher"]);
});

/* ── Ce qui ne s'éprouve pas, et qui le dit ───────────────────────────────── */

test("une fonction qui appelle un utilitaire dit pourquoi elle ne se rejoue pas", () => {
  const blocs = blocsAProposer([{
    sujet: "Spectre de calcul", valeur: "0,8 g", referentiel: true, domaine: "structure",
    agent: { genre: "agent-D", utilitaire: "spectre", version: "1", lit: [], ecrit: [] },
    provenance: { type: PROVENANCE.TEXTE, quoi: "EC8" }, statut: STATUT.RETENU, zones: []
  }], {});

  const rendu = lesPreuvesDuBloc(blocs[0], { dit: new Map() });
  assert.deepEqual(rendu.cas, [], "des cas ont été fabriqués sur une loi qu'on n'a pas");
  assert.match(rendu.pourquoiRien, /sa loi n&#39;est pas écrite|sa loi n'est pas écrite/);
  assert.match(rendu.pourquoiRien, /au serveur/);
});

test("un bloc qui n'est pas une règle n'a pas de preuves", () => {
  const blocs = blocsAProposer([uneValeur("Hauteur", "26 m")], {});
  const rendu = lesPreuvesDuBloc(blocs[0], { dit: new Map() });
  assert.deepEqual(rendu.cas, []);
  assert.equal(rendu.pourquoiRien, "");
});

test("rien d'illisible ne fait tomber les preuves", () => {
  for (const rien of [null, undefined, "", 0, [], { regle: true }]) {
    const rendu = lesPreuvesDuBloc(rien, {});
    assert.ok(Array.isArray(rendu.cas));
    assert.equal(rendu.cas.length, 0);
  }
});

/* ── Ce que le document dit ───────────────────────────────────────────────── */

test("la table des valeurs ne porte pas les conclusions des règles", () => {
  // Sinon une autre règle lirait la conclusion écrite sur la ligne au lieu de
  // la recalculer, et la preuve serait circulaire.
  const blocs = blocsAProposer([
    uneValeur("Hauteur", "26 m"),
    uneRegle("Classement", "3e famille B", [si("Hauteur", OPERATEUR.AU_PLUS, "28", { unite: "m" })])
  ], {});

  const dit = ceQueLeDocumentDit(blocs);
  assert.equal(dit.get("Hauteur"), "26 m");
  assert.equal(dit.has("Classement"), false,
    "la conclusion d'une règle est entrée dans la table : la preuve est circulaire");
});

/* ── Les phrases ──────────────────────────────────────────────────────────── */

test("la phrase commence par les écarts, jamais par ce qui marche", () => {
  // Une phrase qui commence par ce qui marche se lit comme un succès, et l'on
  // ne retient pas la fin.
  const avecEcart = ceQueLesPreuvesDisent(laSomme([
    { verdict: PREUVE.CONFORME }, { verdict: PREUVE.ECART }
  ]));
  assert.match(avecEcart, /^1 cas sur 2 ne rend pas ce qu&#39;on attendait|^1 cas sur 2 ne rend pas/);

  const sans = ceQueLesPreuvesDisent(laSomme([{ verdict: PREUVE.CONFORME }]));
  assert.match(sans, /^1\/1 cas conformes/);
});

test("les indécidables se disent dans la phrase, et comptent pour rien", () => {
  const dit = ceQueLesPreuvesDisent(laSomme([
    { verdict: PREUVE.CONFORME }, { verdict: PREUVE.INDECIDABLE }
  ]));
  assert.match(dit, /1 cas reste indécidable/);
  assert.match(dit, /ni pour ni contre/);
});

test("aucun cas se dit, et ne se tait pas", () => {
  assert.match(ceQueLesPreuvesDisent(laSomme([])), /Aucun cas n&#39;a pu être construit|Aucun cas n'a pu être construit/);
  assert.equal(typeof ceQueLesPreuvesDisent(null), "string");
});

test("le premier non-dit est celui qui gêne", () => {
  const premier = CE_QUE_LES_PREUVES_NE_DISENT_PAS[0];
  // Une fonction fausse recopiée fidèlement d'un document faux passe tous ces
  // cas. C'est la phrase qu'on serait tenté de ne pas écrire.
  assert.match(premier.quoi, /la fonction soit juste/);
  assert.match(premier.pourquoi, /recopiée fidèlement/);

  // Et le non-dit du seuil est écrit, parce que c'est le défaut qu'on a eu :
  // l'attente d'une borne venait de l'opérateur qu'elle éprouvait.
  const seuil = CE_QUE_LES_PREUVES_NE_DISENT_PAS.find((un) => un.quoi.includes("seuil"));
  assert.ok(seuil, "le non-dit du seuil n'est pas écrit");
  assert.match(seuil.pourquoi, /viendrait de l&#39;opérateur lui-même|viendrait de l'opérateur lui-même/);
});
