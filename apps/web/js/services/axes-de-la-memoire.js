/**
 * Les trois axes d'une affirmation, et **lequel des trois parle à l'écran**.
 *
 * ## L'ambiguïté qu'on vient corriger
 *
 * Le même objet portait trois noms selon l'endroit où on le regardait :
 *
 * | où | ce que l'écran disait | la question à laquelle il répondait |
 * | --- | --- | --- |
 * | le rail, filtre « Règles » | règle | **d'où ça tient son autorité** |
 * | la puce de la ligne | Donnée de base | **d'où vient l'information** |
 * | le panneau de détail | Le raisonnement | **quelle forme ça a** |
 *
 * Les trois étaient vraies. Aucune ne contredisait les autres. Mais comme elles
 * s'affichaient dans le même costume graphique, le lecteur croyait qu'elles se
 * disputaient la même case — et il avait raison de le croire : `nature`
 * mélangeait effectivement des choses qui ne sont pas du même ordre.
 * `donnee-de-base` est une **provenance** ; `raisonnement` est une **forme**.
 * Elles n'auraient jamais dû être deux valeurs d'un même champ.
 *
 * ## Les trois axes
 *
 * **L'autorité** — qui tranche. L'ouvrage, un texte, un humain, une mesure, le
 * projet. Ça ne se voit pas dans l'objet : c'est ce qui mérite l'unique puce de
 * l'écran. **Cet axe existait déjà en base**, sous le nom de `SETTLED_BY` dans
 * `assertion-taxonomy.js` : il n'était simplement jamais affiché. On ne le
 * recopie donc pas ici (règle 10) — on le projette.
 *
 * **La forme** — combien de conditions, combien de branches, combien de
 * niveaux. Zéro condition : une valeur posée. Des conditions : une valeur
 * déduite. Des niveaux qui se déduisent les uns des autres : c'est le seul vrai
 * axe de complexité, et il **se voit** — personne n'a besoin qu'on lui écrive
 * « ceci est une fonction » sous une fonction qu'il est en train de lire.
 *
 * **La rejouabilité** — est-ce que ça se recalcule tout seul, ou est-ce que ça
 * s'arrête et redemande à quelqu'un. C'est la seule chose vraiment opératoire
 * de tout ce vocabulaire, et elle était **cachée à l'intérieur d'un mot** : la
 * nature « raisonnement » portait, dans sa définition, « un raisonnement qui
 * traverse une décision ne se rejoue pas tout seul ». Or cela ne se déclare
 * pas : cela se **déduit** de la chaîne. Ce n'est pas une catégorie, c'est un
 * diagnostic — et un diagnostic s'affiche.
 *
 * ## La règle qui gouverne ce fichier
 *
 * **Un seul mot par ligne, et c'est l'axe qui a quelque chose à dire.** Quand
 * une affirmation est tranchée par quelque chose, l'autorité répond. Quand rien
 * ne la tranche — un raisonnement, une intendance —, l'autorité n'a rien à dire
 * et c'est la forme qui prend la parole. Afficher les deux ferait revenir
 * exactement la confusion qu'on corrige.
 *
 * ## Ce que ce fichier ne fait pas
 *
 * **Il ne change rien en base.** `nature` reste la colonne, `estUneRegle` reste
 * le test, et le rejeu se recalcule à la lecture. Reprendre trois cents lignes
 * pour y réécrire ce qu'on sait déjà déduire serait une occasion de se tromper
 * sans retour (`docs/fondamentaux.md`, règle 4).
 *
 * **Il n'invente pas un mot pour ce qu'il ne sait pas.** Une affirmation dont
 * on ne connaît ni la nature ni l'instantané rend `null`, et l'écran écrit
 * « Non classé » — le même mot que partout ailleurs (règle 5).
 */

import {
  NATURE,
  SETTLED_BY,
  UNCLASSIFIED_LABEL,
  classifyAssertion,
  estUneRegle,
  settledBy
} from "./assertion-taxonomy.js";
import { clausesDeLaRegle } from "./memoire-en-lecture.js";
import { decisionPortee } from "./decision-remise-en-question.js";
import { chaineDuRaisonnement, sujetDe, valeurDuSujet } from "./memoire-raisonnement.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Les trois axes, nommés. Un écran dit toujours de quel axe il parle. */
export const AXE = {
  AUTORITE: "autorite",
  FORME: "forme",
  REJEU: "rejeu"
};

/**
 * Ce que l'autorité dit, en un mot — **pour la puce**.
 *
 * `SETTLED_BY_LABELS`, dans `assertion-taxonomy.js`, en dit une phrase : « un
 * tiers — règlement, norme, marché ». C'est ce qu'il faut sous une définition,
 * jamais dans une puce de trois centimètres. Les deux vivent donc côte à côte,
 * sur la même table, et aucun des deux ne devine l'autre.
 *
 * « D'un texte » couvre la contrainte **et** la règle appliquée, et c'est exact :
 * les deux sont tranchées par un texte que personne ici ne négocie. C'est
 * précisément ce que l'ancien écran n'arrivait pas à dire — il appelait l'une
 * « Contrainte » et l'autre « Donnée de base ».
 */
const AUTORITE_COURTE = {
  [SETTLED_BY.TIERS]: "D'un texte",
  [SETTLED_BY.MESURE]: "Supposé",
  [SETTLED_BY.OBSERVATION]: "Constaté",
  [SETTLED_BY.PROJET]: "Du projet",
  [SETTLED_BY.ARBITRAGE]: "Décidé"
};

/** L'ordre de lecture des autorités : ce qui s'impose, puis ce qu'on a choisi. */
export const AUTORITES = [
  SETTLED_BY.TIERS,
  SETTLED_BY.ARBITRAGE,
  SETTLED_BY.OBSERVATION,
  SETTLED_BY.MESURE,
  SETTLED_BY.PROJET
];

/**
 * D'où une affirmation tient son autorité, ou `null` si rien ne la tranche.
 *
 * ## Trois sources, et la nature vient en dernier
 *
 * C'est l'inverse de ce qu'on croirait, et c'est le cœur du défaut qu'on
 * corrige : **la colonne `nature` sous-dit l'autorité**, parce qu'elle est
 * souvent déduite du `kind` par lequel la ligne est entrée en mémoire. Le
 * `payload`, lui, sait.
 *
 * 1. **Une fonction versée** — `referentiel: true`. Elle n'a pas de nature, et
 *    son `kind` est celui d'une donnée de base : `classifyAssertion` en
 *    déduisait donc « donnée de base », et l'écran chipait « Donnée de base »
 *    une ligne que le rail annonçait sous « Règles ».
 * 2. **Une valeur qu'un humain a tranchée** — elle cite sa décision par sa
 *    provenance. Sa nature est celle de la valeur produite, `donnee-de-base` par
 *    défaut : elle se lisait donc « Du projet », alors qu'un humain l'a choisie
 *    entre des possibles. C'est précisément ce que Mdall existe pour garder, et
 *    c'était le mot qui l'effaçait. `decisionPortee` connaît les deux lignes —
 *    la décision et la valeur —, et c'est elle qu'on interroge.
 * 3. **La nature**, pour tout le reste.
 */
export function autoriteDe(assertion = {}) {
  if (estUneRegle(assertion)) return SETTLED_BY.TIERS;
  if (decisionPortee(assertion)) return SETTLED_BY.ARBITRAGE;
  return settledBy(classifyAssertion(assertion).nature);
}

/** L'autorité, en un mot. Vide quand rien ne tranche l'affirmation. */
export function autoriteCourte(autorite) {
  return AUTORITE_COURTE[texte(autorite)] ?? "";
}

/**
 * La forme d'une affirmation : ce qu'il a fallu pour arriver à sa valeur.
 *
 * Deux valeurs seulement, et c'est délibéré : la **profondeur** — six niveaux
 * qui se déduisent les uns des autres — ne se lit pas sur une ligne, elle se
 * lit sur la chaîne. C'est `rejeuDuSujet` qui la donne, avec la mémoire entière
 * sous les yeux. Une forme qui prétendrait la dire d'une seule ligne
 * mentirait.
 */
export const FORME = {
  /** Aucune condition : quelqu'un a posé cette valeur, ou l'a tranchée. */
  POSEE: "posee",
  /** Des conditions : une fonction a conclu cette valeur. */
  DEDUITE: "deduite"
};

const FORME_COURTE = {
  [FORME.POSEE]: "Posée",
  [FORME.DEDUITE]: "Déduite"
};

/** Les deux formes, dans l'ordre où on les lit : ce qu'on pose, ce qu'on déduit. */
export const FORMES = [FORME.POSEE, FORME.DEDUITE];

/** La forme, en un mot. */
export function formeCourte(forme) {
  return FORME_COURTE[texte(forme)] ?? "";
}

/**
 * La forme d'une affirmation, lue sur elle seule.
 *
 * Trois façons d'être déduite, et il faut les trois : une **fonction** qui porte
 * des conditions, une **valeur** qu'une fonction a conclue — sa provenance le
 * dit —, et un **raisonnement** versé, qui est un chemin par définition. Ne
 * regarder que la première aurait rangé sous « Posée » toutes les valeurs que le
 * projet déduit, c'est-à-dire l'essentiel de ce qu'il porte.
 *
 * Une décision est **posée**, et c'est tout l'objet de cet axe : « je décide que
 * les volets seront violets » est une fonction sans condition, arbitraire, et
 * elle se lit comme telle.
 */
export function formeDe(assertion = {}) {
  if (estUneRegle(assertion)) {
    return clausesDeLaRegle(assertion?.payload?.regle).length ? FORME.DEDUITE : FORME.POSEE;
  }

  if (classifyAssertion(assertion).nature === NATURE.RAISONNEMENT) return FORME.DEDUITE;

  // « règle » : la valeur cite la fonction qui l'a conclue. C'est le seul mot
  // qui distingue une valeur déduite d'une valeur relevée, et il est écrit.
  return texte(assertion?.payload?.provenance?.type) === "règle" ? FORME.DEDUITE : FORME.POSEE;
}

/**
 * **Le** mot de la ligne, et l'axe qui le dit.
 *
 * L'autorité d'abord : c'est ce qu'on vient chercher devant une valeur. À
 * défaut — un raisonnement, une intendance, que rien ne tranche —, la forme,
 * qui a toujours quelque chose à dire. Et si l'on ne sait ni l'un ni l'autre,
 * le mot de partout : « Non classé ».
 *
 * @returns {{mot: string, axe: string, connu: boolean}}
 */
export function motDeLaLigne(assertion = {}) {
  const autorite = autoriteDe(assertion);
  if (autorite) return { mot: autoriteCourte(autorite), axe: AXE.AUTORITE, connu: true };

  const { nature } = classifyAssertion(assertion);
  if (nature) return { mot: formeCourte(formeDe(assertion)), axe: AXE.FORME, connu: true };

  return { mot: UNCLASSIFIED_LABEL, axe: AXE.AUTORITE, connu: false };
}

/**
 * Est-ce que cette valeur se recalcule toute seule, et sinon, où s'arrête-t-elle ?
 *
 * ## Ce que la chaîne sait déjà, et que personne n'affichait
 *
 * `chaineDuRaisonnement` rend les fonctions qui mènent à un sujet et les
 * entrées dont elles partent. Tout est là : il suffit de regarder, sur chaque
 * maillon, si un humain a tranché. `decisionPortee` le dit — la ligne de
 * décision porte sa charge, la valeur qu'elle a fixée la cite.
 *
 * ## Deux façons de ne pas se rejouer, et elles ne se disent pas pareil
 *
 * Un **arrêt** est un choix humain : la chaîne se rejoue jusque-là, puis
 * s'arrête et demande si le choix d'alors tient encore — avec un nom, une date
 * et les possibles d'origine, au lieu d'un doute général.
 *
 * Un **manquant** est autre chose : personne n'a versé cette entrée, et la
 * chaîne ne peut pas se rejouer du tout. Les confondre ferait passer un trou
 * pour un arbitrage.
 *
 * @param {string} sujet ce dont on veut savoir s'il se recalcule
 * @param {object[]} assertions la mémoire du projet
 * @param {object} [options]
 * @param {string} [options.zone] la portée qu'on lit
 * @returns {{profondeur: number, seule: boolean, arrets: object[], manquants: string[]}}
 */
export function rejeuDuSujet(sujet, assertions = [], { zone = "" } = {}) {
  const lignes = Array.isArray(assertions) ? assertions : [];
  const { fonctions, entrees, manquants } = chaineDuRaisonnement(sujet, lignes, { zone });

  const arrets = [];
  const vus = new Set();

  // Les maillons, puis les entrées : un humain peut avoir tranché à n'importe
  // quel étage, y compris tout en haut de la chaîne.
  const noms = [...fonctions.map(sujetDe), ...entrees].map(texte).filter(Boolean);

  for (const nom of noms) {
    const dite = valeurDuSujet(nom, lignes, zone);
    const portee = decisionPortee(dite?.assertion ?? null);
    if (!portee) continue;

    const cle = `${nom}|${portee.par}|${portee.quand}`;
    if (vus.has(cle)) continue;
    vus.add(cle);

    arrets.push({
      sujet: nom,
      question: portee.question,
      par: portee.par,
      quand: portee.quand,
      ecartes: portee.ecartes
    });
  }

  return {
    // La profondeur est le nombre de fonctions enchaînées, et c'est le seul vrai
    // axe de complexité : un niveau est moins complexe que six qui se déduisent
    // les uns des autres.
    profondeur: fonctions.length,
    seule: arrets.length === 0 && manquants.length === 0,
    arrets,
    manquants
  };
}

/** « Ourdine Ferrand », « 12/03 » → « une décision d'Ourdine Ferrand, le 12/03 ». */
function ditLArret(arret = {}) {
  const qui = texte(arret.par);
  const quand = texte(arret.quand);
  const signature = [qui ? `d'${qui}` : "", quand ? `le ${quand}` : ""].filter(Boolean).join(", ");

  return signature ? `une décision ${signature}` : "une décision dont on ne sait ni qui ni quand";
}

/**
 * Ce que le rejeu dit, en une phrase — **le badge**.
 *
 * C'est la seule chose de tout ce vocabulaire qu'aucun autre outil ne sait
 * dire, et elle était écrite en langue morte, sous la forme d'un mot de
 * taxonomie. Elle s'affiche maintenant.
 *
 * Une valeur que rien ne déduit ne rend rien : « se recalcule seule » d'un
 * constat relevé à la main serait un mensonge poli — il ne se recalcule pas, il
 * a été vu.
 */
export function phraseDuRejeu(rejeu = null) {
  const profondeur = Number(rejeu?.profondeur ?? 0);
  if (!profondeur) return "";

  const niveaux = `${profondeur} niveau${profondeur > 1 ? "x" : ""}`;
  const arrets = Array.isArray(rejeu?.arrets) ? rejeu.arrets : [];
  const manquants = Array.isArray(rejeu?.manquants) ? rejeu.manquants : [];

  if (arrets.length) {
    // Le premier arrêt suffit à la phrase : c'est celui qu'on va aller voir. Le
    // nombre des autres se dit, parce qu'en cacher un ferait croire la chaîne
    // plus simple qu'elle n'est.
    const reste = arrets.length > 1 ? ` (et ${arrets.length - 1} autre${arrets.length > 2 ? "s" : ""})` : "";
    return `s'arrête sur ${ditLArret(arrets[0])}${reste} — ${niveaux}`;
  }

  if (manquants.length) {
    return `ne se recalcule pas : ${manquants.length} entrée${
      manquants.length > 1 ? "s" : ""} que personne n'a versée${manquants.length > 1 ? "s" : ""} — ${niveaux}`;
  }

  return `se recalcule seule — ${niveaux}`;
}
