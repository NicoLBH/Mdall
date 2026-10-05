/**
 * Les analyses gelées — **ce qui est déjà en base, et qu'on n'a pas à repayer.**
 *
 * ## Ce que la migration avait prévu
 *
 * « Une ligne par lecture, jamais mise à jour. Relire le même rapport est une
 * seconde lecture, avec sa propre ligne — et c'est précisément ce qu'on veut
 * comparer quand on ajuste une consigne. » C'est écrit dans
 * `202611210001_une_lecture_de_rapport_se_garde.sql`, et c'est la raison d'être
 * de ce module : **la dérive est déjà écrite**, il suffit de la lire.
 *
 * Relire tout le corpus pour la mesurer aurait coûté trois appels par document
 * pour retrouver ce que la base porte déjà. On ne relit donc que ce qu'on veut
 * comparer à une consigne qui n'a **pas encore** tourné, et c'est un geste à
 * part (`--relire`).
 *
 * ## Les trois tables, et pourquoi on les range pareil
 *
 * `cr_lectures`, `rapport_lectures` et `fil_lectures` gardent la même chose sous
 * des noms différents, parce que les trois familles n'appellent pas une date du
 * même mot. Ce module les ramène à une forme commune — c'est la condition pour
 * que la dérive ait **une** façon de se mesurer, et non trois (règle 10).
 *
 * ## Ce qu'il ne fait pas
 *
 * Il ne juge rien. Il range, groupe et ordonne ; la comparaison est ailleurs.
 * Un module qui lit la base **et** décide ce qui est une régression aurait mêlé
 * une question d'accès à une question de sens.
 */

import { FAMILLE } from "./les-familles-de-document.js";
import { LE_SELECT_DUNE_LECTURE } from "./la-lecture-conservee.js";
import { LE_SELECT_DUN_RAPPORT } from "./la-lecture-dun-rapport.js";

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/**
 * Où chaque famille garde ses lectures, et sous quels noms.
 *
 * **Dérivé du registre des familles**, et non écrit à côté : une famille ajoutée
 * là-bas et oubliée ici serait une famille qu'on croit mesurer.
 */
export const OU_SONT_LES_GELEES = {
  [FAMILLE.CONTROLE]: {
    table: "rapport_lectures",
    /**
     * **Les colonnes du produit, et non une seconde liste.**
     *
     * Une colonne ajoutée là-bas et oubliée ici donnerait une dérive mesurée sur
     * moins que ce que la lecture porte, sans que rien ne le dise (règle 10).
     */
    colonnes: LE_SELECT_DUN_RAPPORT,
    /** Ce que le document déclare de lui-même, et qui le reconnaît d'une lecture à l'autre. */
    repere: (ligne) => texte(ligne?.numero_de_rapport),
    quand: (ligne) => texte(ligne?.etabli_le)
  },
  [FAMILLE.CR]: {
    table: "cr_lectures",
    colonnes: LE_SELECT_DUNE_LECTURE,
    repere: (ligne) => texte(ligne?.numero_de_reunion),
    quand: (ligne) => texte(ligne?.tenue_le)
  }
};

/**
 * Une ligne de lecture conservée, ramenée à la forme commune.
 *
 * **`null` quand la ligne ne porte pas d'analyse.** Une lecture dont
 * `analyse_gelee` est vide existe — elle a été écrite avant que la colonne soit
 * remplie, ou la lecture n'a rien rendu. La compter comme une analyse vide ferait
 * dire « tous les avis ont disparu » d'une ligne qui n'en a jamais porté
 * (règle 5).
 */
export function uneGelee(ligne = null, famille = "") {
  const ou = OU_SONT_LES_GELEES[texte(famille)];
  if (!ou) return null;

  const analyse = ligne?.analyse_gelee?.lecture ?? null;
  if (!analyse) return null;

  return {
    id: texte(ligne?.id),
    famille: texte(famille),
    /** Le document lu, par son identifiant de Fichiers quand il en a un. */
    documentId: texte(ligne?.document_id),
    document: texte(ligne?.document),
    /** Ce que le document déclare : c'est par là qu'on le reconnaît sans identifiant. */
    repere: ou.repere(ligne),
    quand: ou.quand(ligne),
    /** **Par quoi elle a été lue.** Sans lui, une différence ne se nomme pas. */
    luPar: texte(ligne?.lu_par),
    lueLe: texte(ligne?.created_at),
    /** La lecture entière, telle qu'elle a été gelée. */
    lecture: analyse
  };
}

/**
 * La clé d'un document, pour rapprocher ses lectures successives.
 *
 * **L'identifiant de Fichiers d'abord**, parce que c'est le seul qui ne mente
 * jamais. À défaut — un document déposé à la main, jamais rangé — le repère que
 * le document déclare et sa date : deux rapports du même numéro à la même date
 * sont le même rapport.
 *
 * Et `""` quand il n'y a ni l'un ni l'autre : **on ne devine pas sur le nom de
 * fichier**. « RICT-03.pdf » et « RICT-03 (1).pdf » peuvent être deux documents
 * différents, et les confondre fabriquerait une dérive entre deux rapports qui
 * n'ont rien à voir.
 */
export function laCleDuDocument(gelee = null) {
  const id = texte(gelee?.documentId);
  if (id) return `id:${id}`;

  const repere = texte(gelee?.repere);
  const quand = texte(gelee?.quand);
  return repere && quand ? `dit:${repere}|${quand}` : "";
}

/**
 * Les lectures d'un même document, dans l'ordre où elles ont eu lieu.
 *
 * **L'ordre est celui des lectures, pas celui des documents.** C'est une suite
 * dans le temps du procédé, et non dans le temps du chantier : ce qu'on regarde
 * est l'évolution de notre façon de lire.
 *
 * Un document lu **une seule fois** n'a pas de suite, et il est rendu quand même,
 * à part : c'est lui qui dit combien du corpus échappe encore à la mesure.
 */
export function lesSuitesDeLecture(gelees = []) {
  const parDocument = new Map();
  const sansCle = [];

  for (const une of liste(gelees)) {
    const cle = laCleDuDocument(une);
    if (!cle) { sansCle.push(une); continue; }
    if (!parDocument.has(cle)) parDocument.set(cle, []);
    parDocument.get(cle).push(une);
  }

  const suites = [];
  const seules = [];

  for (const [cle, lectures] of parDocument) {
    // **Par date de lecture, croissante.** `localeCompare` sur un horodatage
    // ISO est un tri chronologique, et il ne dépend d'aucun fuseau.
    const rangees = [...lectures].sort((a, b) => a.lueLe.localeCompare(b.lueLe));
    (rangees.length > 1 ? suites : seules).push({ cle, lectures: rangees });
  }

  return { suites, seules, sansCle };
}
