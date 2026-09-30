/**
 * L'épisode d'une archive — **le pont qui manquait**.
 *
 * ## Ce qui existait, et ce qui n'existait pas
 *
 * `episodeDuProjet` sait bâtir une suite depuis les **sujets d'un projet** et
 * les **affirmations signées** de sa mémoire. Il n'a jamais vu un mail.
 * L'archive, elle, ne porte que des messages. Rien ne reliait les deux, et la
 * mesure attendait donc de la matière qu'aucun chemin ne lui apportait.
 *
 * ## La même forme, et c'est tout l'enjeu
 *
 * Ce module rend **exactement ce que rend `episodeDuProjet`** : un contexte,
 * des ouvertures, des constats datés portant un domaine, et des comptes. Donc
 * `mesureDuPredicteur` et `LIGNES_DE_BASE` marchent dessus **sans une ligne de
 * changement** — un épisode est un épisode, quelle que soit sa source
 * (règle 10).
 *
 * Deux formes auraient voulu dire deux mesures, et l'on n'aurait plus su
 * laquelle comparer à l'autre.
 *
 * ## Ce qu'est une ouverture, ici
 *
 * **Un fil.** Les messages qui partagent un même objet, une fois retirés les
 * « RE: » et « TR: » empilés. Ce regroupement vaut ce que vaut l'habitude des
 * gens à ne pas changer l'objet en cours de route — et c'est, en pratique, ce
 * qu'un lecteur humain fait aussi.
 *
 * **Un fil ne se ferme pas.** Son dernier message dit seulement où il s'est
 * arrêté. Écrire `fermeLe` avec cette date ferait lire « tranché le 12 mai » là
 * où il faut lire « plus rien après le 12 mai » — et ce n'est pas la même
 * chose (règle 5).
 *
 * ## Ce qu'est un constat, ici
 *
 * **Un indice rencontré dans un fil** : une référence citée, ou un terme qui ne
 * désigne qu'un domaine (`les-references-citees.js`). Le premier message du fil
 * qui le porte dit **quand on l'a rencontré**.
 *
 * Et rien d'autre. Ce qui ne cite rien ne devient pas un constat sans domaine :
 * il se **compte**, et c'est la colonne qui dit où la lecture est aveugle.
 *
 * ## Ce n'est pas une mémoire
 *
 * Rien de ceci n'est signé, rien n'est versé, rien n'entre dans un projet.
 * C'est une **lecture** d'une archive, refaite à chaque affichage, faite pour
 * être mesurée et pour être refusée. La porte de la mémoire reste une
 * proposition signée (règle 1).
 *
 * ## Il est pur
 *
 * Des messages entrent, un épisode sort. Aucun réseau, aucun écran, aucune
 * horloge, aucun modèle.
 */

import { cleDuSujet } from "./memoire-identifiants.js";
import { objetNu } from "./un-mail-deplie.js";
import { lesIndicesDuTexte } from "./les-references-citees.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Un instant comparable, ou `null`. Une date illisible n'est pas une date. */
function instant(valeur) {
  const quand = Date.parse(texte(valeur));
  return Number.isFinite(quand) ? quand : null;
}

/** Du plus ancien au plus récent — c'est une suite, pas un classement. */
function parLeTemps(gauche, droite) {
  return instant(gauche.quand) - instant(droite.quand);
}

/**
 * Les fils d'une archive.
 *
 * **Ce qui n'a pas de date n'entre pas dans la suite.** Le placer au début ou à
 * la fin inventerait un moment ; il se compte à part, et se dit — c'est la même
 * règle que dans `episodeDuProjet`, et elle vaut pour la même raison.
 */
export function lesFilsDeLarchive(messages = []) {
  const parNom = new Map();
  let sansDate = 0;

  for (const un of Array.isArray(messages) ? messages : []) {
    const quand = texte(un?.quand);
    if (instant(quand) === null) {
      sansDate += 1;
      continue;
    }

    const titre = objetNu(texte(un?.objet));
    const cle = cleDuSujet(titre);
    if (!cle) continue;

    const vu = parNom.get(cle);
    if (!vu) {
      parNom.set(cle, {
        cle,
        titre,
        quand,
        // **Un fil ne se ferme pas.** On ne sait pas s'il a été tranché.
        fermeLe: null,
        // Là où il s'est arrêté, ce qui n'est pas la même chose.
        jusqua: quand,
        combien: 1,
        messages: [un]
      });
      continue;
    }

    if (instant(quand) < instant(vu.quand)) vu.quand = quand;
    if (instant(quand) > instant(vu.jusqua)) vu.jusqua = quand;
    vu.combien += 1;
    vu.messages.push(un);
  }

  const fils = [...parNom.values()].sort(parLeTemps);
  for (const un of fils) un.messages.sort(parLeTemps);
  return { fils, sansDate };
}

/**
 * Les constats d'une archive : ce que ses fils citent.
 *
 * Un même indice revient à chaque réponse d'un fil — il est recopié avec la
 * citation. **C'est la première fois qui compte** : c'est là qu'on l'a
 * rencontré.
 *
 * `leveLe` reste toujours vide. Un mail ne dit pas qu'un sujet est levé, et
 * l'inventer ferait compter des issues qu'on n'a pas.
 */
export function lesConstatsDeLarchive(fils = [], comment) {
  const parCle = new Map();
  let sansIndice = 0;

  for (const fil of Array.isArray(fils) ? fils : []) {
    for (const message of fil.messages ?? []) {
      const indices = lesIndicesDuTexte(
        `${texte(message?.objet)}\n${texte(message?.corps)}`, comment);
      if (!indices.length) {
        sansIndice += 1;
        continue;
      }

      for (const indice of indices) {
        // **La clé porte le fil.** Le même DTU cité dans deux chantiers est
        // deux rencontres ; dans un seul fil, c'est une.
        const cle = `${fil.cle}·${indice.cle}`;
        if (parCle.has(cle)) continue;

        parCle.set(cle, {
          cle,
          quoi: indice.dit,
          domaine: indice.domaine,
          quand: texte(message?.quand),
          leveLe: null,
          // De quoi montrer pourquoi ce constat existe, et le refuser : le
          // texte trouvé, le genre de l'indice, et le message d'où il vient.
          genre: indice.genre,
          trouve: indice.trouve,
          dansLeFil: fil.cle,
          dansLeMessage: texte(message?.empreinte)
        });
      }
    }
  }

  return { constats: [...parCle.values()].sort(parLeTemps), sansIndice };
}

/**
 * L'épisode d'une archive, dans la forme que la mesure attend.
 *
 * @param {object} options
 * @param {object[]} [options.messages] ce que rend `lesMessagesArchives`, avec leur corps
 * @param {object} [options.contexte] la forme du chantier, quand on la connaît
 * @param {boolean} [options.sansLesTermes] pour ne compter que les références citées
 * @returns {object} la forme de `episodeDuProjet`, avec ce qu'on n'a pas su lire en plus
 */
export function episodeDuneArchive({ messages = [], contexte = null, sansLesTermes = false } = {}) {
  const { fils, sansDate } = lesFilsDeLarchive(messages);
  const { constats, sansIndice } = lesConstatsDeLarchive(fils, { sansLesTermes });

  // Les bornes du temps : c'est par elles que la mesure rejouera l'épisode.
  const moments = [...fils, ...constats]
    .map((pas) => instant(pas.quand))
    .filter((quand) => quand !== null);

  return {
    contexte,
    depuis: moments.length ? new Date(Math.min(...moments)).toISOString() : "",
    jusqua: moments.length ? new Date(Math.max(...moments)).toISOString() : "",
    // Le nom que `episodeDuProjet` leur donne : un fil d'archive tient la même
    // place qu'un sujet ouvert, et la mesure ne doit pas avoir à le savoir.
    ouvertures: fils,
    constats,
    combien: {
      ouvertures: fils.length,
      // Aucun fil n'est dit fermé : on ne sait pas s'il a été tranché.
      enCours: fils.length,
      constats: constats.length,
      leves: 0,
      sansDate,
      // **La colonne la plus utile.** Combien de messages n'ont rien cité qu'on
      // sache lire : c'est là que se décide ce qu'on écrit ensuite (règle 5).
      sansIndice,
      messages: Array.isArray(messages) ? messages.length : 0
    }
  };
}

/**
 * Ce que la lecture n'a pas su faire, en une phrase.
 *
 * Vide quand elle a tout lu. « 0 message muet » apprend à ne plus lire les
 * lignes.
 */
export function phraseDeCeQuOnNaPasSuLire(episode = null) {
  const combien = episode?.combien ?? {};
  const dits = [];

  const muets = Number(combien.sansIndice) || 0;
  if (muets) {
    dits.push(`${muets} ${muets > 1 ? "messages ne citent rien" : "message ne cite rien"} qu'on sache lire`);
  }

  const sansDate = Number(combien.sansDate) || 0;
  if (sansDate) {
    dits.push(`${sansDate} ${sansDate > 1 ? "n'ont pas de date" : "n'a pas de date"} et ne tiennent pas dans la suite`);
  }

  return dits.join(" · ");
}
