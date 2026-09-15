/**
 * Un ancien filtre de situation, dit en requête.
 *
 * ## Ce qu'on démonte
 *
 * Une situation « automatique » retenait ses sujets par un `filter_definition` :
 * un objet jsonb avec des listes d'identifiants, lu par une fonction de
 * correspondance écrite pour lui seul. À côté, l'onglet Sujets avait une
 * grammaire de requête qu'on lit, qu'on corrige et qu'on voit s'appliquer.
 *
 * **Ce sont deux fois la même chose**, et c'est la seconde qu'on garde : elle
 * s'écrit, elle se relit, et elle est la même sur les deux écrans (règle 10).
 *
 * Voir `docs/le-carnet-prend-la-forme-des-sujets.md`, étape 4.
 *
 * ## On ne prétend pas : on relit
 *
 * Traduire un filtre en requête, c'est affirmer que les deux retiennent les
 * mêmes sujets. Une affirmation pareille ne se fait pas sur parole — un champ
 * que le vocabulaire de l'écran ne déclare pas, un identifiant de label qui
 * n'existe plus, une priorité partielle que la barre ne sait pas écrire, et la
 * situation changerait de contenu sans que personne l'ait demandé.
 *
 * On écrit donc la requête, **puis on la relit avec le même analyseur que la
 * barre**, et l'on compare. Ce qui ne revient pas identique est nommé. Aucune
 * règle de correspondance n'est réécrite ici : c'est `parseQuery` qui juge, et
 * c'est lui qui filtrera ensuite (règle 4).
 *
 * ## Ce que « perdu » veut dire, et ce qu'il ne veut pas dire
 *
 * Perdu ne veut pas dire faux : cela veut dire **que cette requête-là ne dit
 * pas tout ce que le filtre disait**. L'appelant garde alors l'ancienne porte.
 * Se taire et livrer une requête incomplète ferait disparaître des sujets d'une
 * liste sans que rien ne l'explique (règle 5).
 */

import { formatQuery, parseQuery } from "./query-bar.js";

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => [...new Set((Array.isArray(valeur) ? valeur : [])
  .map(texte).filter(Boolean))];

/**
 * Chaque condition d'un ancien filtre, et le champ qui la dit aujourd'hui.
 *
 * `total` est le nombre de valeurs que le champ admet : **toutes cochées, ce
 * n'est pas une condition**, c'est l'absence de condition. Le filtre des
 * situations proposait quatre cases de priorité ; les quatre cochées ne
 * retiraient rien, et écrire `priorité:basse priorité:moyenne …` aurait
 * transformé un « tout » en une énumération que la barre ne sait pas porter.
 */
export const CONDITIONS = [
  { champ: "statut", cle: "status", nom: "le statut", total: 2 },
  { champ: "priorité", cle: "priorities", nom: "la priorité", total: 4 },
  { champ: "label", cle: "labelIds", nom: "les labels" },
  { champ: "objectif", cle: "objectiveIds", nom: "les objectifs" },
  { champ: "assigné", cle: "assigneeIds", nom: "les assignés" },
  { champ: "projet", cle: "projectIds", nom: "les chantiers" }
];

/** Ce que « bloqué » vaut dans la barre : la valeur du champ, pas un booléen. */
export const BLOQUES = "bloques";

/**
 * Comment chaque condition se nomme quand on doit dire qu'elle n'est pas passée.
 *
 * **Le blocage en fait partie sans être dans `CONDITIONS`** : il ne vient pas
 * d'une liste d'identifiants, mais d'un booléen. Il se perd pourtant de la même
 * façon — un écran qui ne déclare pas `bloqué:` ne sait pas l'écrire —, et un
 * refus anonyme fait chercher quoi corriger.
 */
export const NOMS_DES_CONDITIONS = {
  ...Object.fromEntries(CONDITIONS.map((condition) => [condition.champ, condition.nom])),
  "bloqué": "le blocage"
};

/**
 * Les filtres qu'on voudrait écrire, dans le vocabulaire de la barre.
 *
 * Rien n'est traduit ici : les valeurs d'un `filter_definition` sont déjà
 * celles des champs — `open`/`closed`, `high`, une clé de label, un
 * identifiant de personne. C'est le **nom du champ** qui change, et c'est tout
 * ce que cette fonction fait.
 */
export function filtresVoulus(filtre = null) {
  if (!filtre || typeof filtre !== "object" || Array.isArray(filtre)) return {};

  const voulus = {};

  for (const condition of CONDITIONS) {
    const valeurs = liste(filtre[condition.cle]);
    if (!valeurs.length) continue;
    // Toutes les valeurs d'un champ fermé : rien n'est retiré, rien ne s'écrit.
    if (condition.total && valeurs.length >= condition.total) continue;
    voulus[condition.champ] = valeurs;
  }

  // **Seul `true` est une condition.** `blockedOnly: false` ne demandait pas
  // les sujets non bloqués : il ne demandait rien.
  if (filtre.blockedOnly === true) voulus["bloqué"] = [BLOQUES];

  return voulus;
}

/** Deux jeux de valeurs disent-ils la même chose ? L'ordre ne compte pas. */
function memeChose(voulues, relues) {
  const a = liste(Array.isArray(voulues) ? voulues : [voulues]).sort();
  const b = liste(Array.isArray(relues) ? relues : [relues]).sort();
  return a.length === b.length && a.every((valeur, rang) => valeur === b[rang]);
}

/**
 * La requête qui dit ce que ce filtre disait, et ce qu'elle n'a pas su dire.
 *
 * @param {object|null} filtre un `filter_definition`, tel qu'il est en base
 * @param {object[]} champs le vocabulaire de l'écran — c'est lui qui décide ce
 *   qui se dit : un champ non déclaré ne s'écrit pas, et une valeur inconnue
 *   ne se relit pas
 * @returns {{requete: string, perdus: {champ: string, nom: string,
 *   valeurs: string[]}[]}} `perdus` vide veut dire que la requête suffit
 */
export function requeteDunFiltre(filtre = null, champs = []) {
  const voulus = filtresVoulus(filtre);
  const requete = formatQuery({ filters: voulus }, champs);
  const relus = parseQuery(requete, champs).filters;

  const perdus = [];
  for (const [champ, valeurs] of Object.entries(voulus)) {
    if (memeChose(valeurs, relus[champ])) continue;
    perdus.push({ champ, nom: NOMS_DES_CONDITIONS[champ] ?? champ, valeurs });
  }

  return { requete, perdus };
}

/**
 * Cette requête dit-elle tout ce que le filtre disait ?
 *
 * La question se pose **avant** de remplacer l'une par l'autre. Un filtre à
 * moitié traduit fait disparaître des sujets d'une liste que quelqu'un regarde
 * tous les jours, et rien à l'écran ne dirait pourquoi.
 */
export function laRequeteSuffit(filtre = null, champs = []) {
  return requeteDunFiltre(filtre, champs).perdus.length === 0;
}

/**
 * Ce qu'on dit quand elle ne suffit pas. `""` quand tout est passé.
 *
 * On nomme **les conditions**, pas les identifiants : « les labels » se
 * comprend, `b3f1…` ne se comprend pas — et c'est le vocabulaire de l'écran qui
 * manque, pas la valeur.
 */
export function phraseDesPerdus(perdus = []) {
  const noms = [...new Set((Array.isArray(perdus) ? perdus : [])
    .map((perdu) => texte(perdu?.nom)).filter(Boolean))];
  if (!noms.length) return "";

  const dits = noms.length > 1
    ? `${noms.slice(0, -1).join(", ")} et ${noms[noms.length - 1]}`
    : noms[0];

  return `Cette situation retient encore un filtre que la recherche ne sait pas dire : ${dits}. `
    + "Elle continue donc de s'appliquer tel quel, et la requête ne le remplace pas.";
}
