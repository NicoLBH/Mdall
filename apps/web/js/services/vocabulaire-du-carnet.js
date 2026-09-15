/**
 * Le vocabulaire du carnet : de quoi parler des sujets de tous mes chantiers.
 *
 * ## Ce que c'est
 *
 * `champsDesSujets` construit la grammaire d'un écran à partir de ce qu'il a
 * sous la main : les labels, les objectifs, les personnes. Le carnet a les
 * mêmes besoins qu'un projet, mais sa matière vient d'ailleurs — la charge de
 * tous mes chantiers, montée à l'étape 3 bis du plan précédent.
 *
 * Ce fichier fait la jointure, et rien d'autre. Il ne déclare aucun champ :
 * c'est `champsDesSujets` qui les déclare, ici comme sur l'écran d'un projet
 * (règle 10).
 *
 * Voir `docs/le-carnet-prend-la-forme-des-sujets.md`, étape 2.
 *
 * ## Pourquoi les personnes comptent autant
 *
 * « Assigné à moi », « Créé par moi » et « Mentions » sont des champs, et
 * `champsDesSujets` ne déclare un champ **que s'il a des valeurs**. Sans
 * personne connue, ces trois lectures disparaissent — un rail qui ne montre
 * qu'une entrée sur quatre, sans que rien ne dise pourquoi.
 *
 * C'est une règle juste : un filtre qui ne rendrait jamais rien fait chercher
 * ce qu'on a mal tapé. Mais elle rend la charge des personnes indispensable, et
 * c'est pour cela qu'elle se demande.
 */

import { champsDesSujets } from "./champs-des-sujets.js";
import { personnesDuProjet } from "./meta-des-sujets.js";
import { chantiersDeCesSujets } from "./projets-du-filtre.js";
import { CLES_DE_LA_CHARGE } from "./charge-des-sujets.js";

const tableau = (valeur) => (Array.isArray(valeur) ? valeur : []);

/**
 * Les champs interrogeables du carnet.
 *
 * @param {object} options
 * @param {object} options.charge la charge des sujets de mes chantiers
 * @param {object[]} options.personnes qui travaille sur ces chantiers
 * @param {object} options.nomsDesProjets les chantiers qu'on sait nommer
 */
export function champsDuCarnet({ charge = {}, personnes = [], nomsDesProjets = {} } = {}) {
  const sujets = tableau(charge?.subjects);

  return champsDesSujets({
    labels: tableau(charge?.labels)
      .map((label) => ({ key: String(label?.id ?? "").trim(), name: String(label?.name ?? "").trim() })),
    objectifs: tableau(charge?.objectives)
      .map((objectif) => ({ id: String(objectif?.id ?? "").trim(), title: String(objectif?.title ?? "").trim() })),
    // **Les personnes de tous mes chantiers**, et non celles d'un projet : le
    // carnet n'en a pas. Sans elles, trois lectures du rail disparaissent.
    personnes: personnesDuProjet(personnes),
    // Les chantiers réellement présents dans la liste, comme ailleurs : en
    // proposer un qui n'y est pas promettrait un résultat vide (étape 4 du plan
    // précédent).
    projets: chantiersDeCesSujets(sujets, nomsDesProjets),
    // **Ce que la base n'a pas su lire ne se propose pas.** `false` n'est pas
    // « aucun signal » : c'est « on ne sait pas », et « Mentions » comme
    // « Activité récente » ne rendraient jamais rien (règle 5).
    signauxLus: charge?.[CLES_DE_LA_CHARGE.signauxLus] !== false
  });
}
