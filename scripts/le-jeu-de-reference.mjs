#!/usr/bin/env node
/**
 * Le jeu de référence — **le seul qui dise « juste ».**
 *
 *   node scripts/le-jeu-de-reference.mjs
 *     → **l'auto-épreuve** : deux lecteurs de carton, l'un qui lit, l'autre qui
 *       devine. Le premier doit faire un sans-faute, le second doit perdre sur
 *       les marques. Aucune de vos analyses n'est mesurée.
 *
 *   SUPABASE_URL=… SUPABASE_JETON=… MDALL_PROJET=… \
 *   node scripts/le-jeu-de-reference.mjs --serveur
 *     → la vraie lecture. Un document annoté coûte trois appels.
 *
 * ## Par étape, et jamais un score
 *
 * « Qualité : 87 % » ne dit pas quoi réparer. Structure, légende, rappel,
 * précision, marques, pièges : chacune dit où ça casse. Et chaque taux porte son
 * assiette — « 100 % » sur un relevé n'est pas « 100 % » sur quatre cents.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ETAPE } from "./le-jeu-de-reference/la-confrontation.js";
import { leJeuDeReference } from "./le-jeu-de-reference/lannotation.js";
import { passerLeJeu } from "./le-jeu-de-reference/passer-le-jeu.js";
import { OU_EST_LE_CORPUS } from "./la-batterie-des-perturbations/le-corpus.js";
import {
  unLecteurFidele, unLecteurQuiDevine
} from "./la-batterie-des-perturbations/un-lecteur-de-carton.js";
import {
  parLeReseau, unLecteurDuServeur
} from "./la-mesure-des-analyses/un-lecteur-du-serveur.js";

const texte = (valeur) => String(valeur ?? "").trim();
const enPourCent = (part) =>
  (part?.part === null ? "sans objet" : `${(part.part * 100).toFixed(1)} % (${part.combien}/${part.sur})`);

/**
 * Un lecteur qui prend le document du corpus et le passe au lecteur donné.
 *
 * **Le jeu annote des documents du corpus**, les mêmes que la batterie de
 * perturbations : un second corpus aurait demandé une seconde série
 * d'annotations, et les deux auraient divergé (règle 10).
 */
function surLeCorpus(lire) {
  return async ({ document, famille }) => lire({
    texte: readFileSync(join(OU_EST_LE_CORPUS, document), "utf8"), famille, nom: document
  });
}

const auServeur = process.argv.slice(2).includes("--serveur");
const url = texte(process.env.SUPABASE_URL);
const jeton = texte(process.env.SUPABASE_JETON);
const projet = texte(process.env.MDALL_PROJET);

const manque = auServeur
  ? [!url && "SUPABASE_URL", !jeton && "SUPABASE_JETON", !projet && "MDALL_PROJET"].filter(Boolean)
  : [];
if (manque.length) {
  console.error(`\n--serveur demande ${manque.join(", ")} dans l'environnement.\n`);
  process.exit(2);
}

const jeu = leJeuDeReference();

console.log(auServeur
  ? `\nLA VRAIE LECTURE — ${jeu.length} documents annotés, soit jusqu'à ${jeu.length * 3} appels.`
  : `\nAUTO-ÉPREUVE — ${jeu.length} documents annotés, deux lecteurs de carton.\n`
    + "Aucune de vos analyses n'est mesurée. Pour les mesurer : --serveur.");

/** Ce qu'une passe raconte, étape par étape. */
function raconter(bilan, nonPassees) {
  console.log(`\n  structure reconnue   ${enPourCent(bilan[ETAPE.STRUCTURE])}`);
  console.log(`  légende — rappel     ${enPourCent(bilan.legendeRappel)}`);
  console.log(`  légende — précision  ${enPourCent(bilan.legendePrecision)}`);
  console.log(`  relevés — rappel     ${enPourCent(bilan.rappel)}`);
  console.log(`  relevés — précision  ${enPourCent(bilan.precision)}`);
  console.log(`  marques justes       ${enPourCent(bilan[ETAPE.MARQUE])}`);
  console.log(`  pièges évités        ${enPourCent(bilan[ETAPE.PIEGES])}`);

  for (const un of bilan.piegesTombes) console.log(`   ! piège tombé — ${un}`);
  for (const une of nonPassees) console.log(`   · ${une.document} — ${une.dit}`);
}

if (auServeur) {
  const lire = unLecteurDuServeur({ appeler: parLeReseau({ url, jeton }), projectId: projet });
  const { bilan, nonPassees, confrontations } = await passerLeJeu({ jeu, lire: surLeCorpus(lire) });

  raconter(bilan, nonPassees);
  for (const une of confrontations) {
    for (const quoi of une[ETAPE.RELEVE].manques) console.log(`   ! ${une.document} a manqué « ${quoi} »`);
    for (const quoi of une[ETAPE.RELEVE].enTrop) console.log(`   ! ${une.document} a inventé « ${quoi} »`);
    for (const quoi of une[ETAPE.MARQUE].fausses) console.log(`   ! ${une.document} — ${quoi}`);
  }

  // Un rappel ou une précision qui n'est pas parfaite est un défaut réel, et
  // non une panne de l'outil : il sort en échec pour qu'un enchaînement le voie.
  const parfait = bilan.rappel.part === 1 && bilan.precision.part === 1
    && bilan[ETAPE.MARQUE].part === 1 && bilan[ETAPE.PIEGES].part === 1;
  process.exit(parfait ? 0 : 1);
}

/**
 * L'auto-épreuve : **le lecteur fidèle doit faire un sans-faute, celui qui
 * devine doit perdre sur les marques et nulle part ailleurs.**
 *
 * C'est la seule façon de savoir que le jeu mesure ce qu'il prétend mesurer. Un
 * jeu de référence que personne n'a vu tomber certifie tout ce qu'on lui montre.
 */
const fidele = await passerLeJeu({ jeu, lire: surLeCorpus(unLecteurFidele) });
const devine = await passerLeJeu({ jeu, lire: surLeCorpus(unLecteurQuiDevine("F")) });

console.log("\n── le lecteur qui lit");
raconter(fidele.bilan, fidele.nonPassees);
console.log("\n── le lecteur qui devine (on lui a fabriqué le défaut exprès)");
raconter(devine.bilan, devine.nonPassees);

/**
 * **Le sans-faute porte sur toutes les étapes, pas sur celles qui passent.**
 *
 * La légende n'y figurait pas au premier jet, et le lecteur fidèle y faisait
 * 4 sur 7 — il ne lisait pas les rubriques d'un compte rendu. L'auto-épreuve
 * passait quand même, parce qu'elle ne regardait pas cette étape-là. Une épreuve
 * qui exclut ce qu'elle échoue ne garde rien.
 */
const sansFaute = (bilan) => [ETAPE.STRUCTURE, ETAPE.MARQUE, ETAPE.PIEGES]
  .map((quoi) => bilan[quoi])
  .concat([bilan.legendeRappel, bilan.legendePrecision, bilan.rappel, bilan.precision])
  .every((part) => part.part === 1);

const mesure = sansFaute(fidele.bilan)
  && devine.bilan[ETAPE.MARQUE].part !== null && devine.bilan[ETAPE.MARQUE].part < 1;

console.log(mesure
  ? "\n═══ LE JEU MESURE : le lecteur fidèle fait un sans-faute, "
    + "celui qui devine perd sur les marques ═══"
  : "\n═══ LE JEU NE MESURE PLUS : le lecteur fidèle ne fait pas un sans-faute, "
    + "ou celui qui devine n'est pas repris ═══");
process.exit(mesure ? 0 : 1);
