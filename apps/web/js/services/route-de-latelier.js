/**
 * Ce que la route de l'Atelier demande d'ouvrir.
 *
 * ## Pourquoi ici, et pas dans l'écran
 *
 * Deux endroits en ont besoin : la barre du haut, qui **compose** le lien du
 * raccourci Copilote, et l'Atelier, qui le **lit** au montage. Si chacun écrivait
 * son morceau, le jour où le nom change, l'un des deux le raterait — et le
 * raccourci mènerait à l'accueil sans que rien ne le signale (règle 10).
 *
 * C'est aussi du raisonnement pur : aucun DOM, aucun réseau. Il se vérifie.
 */

import { PROJECT_TAB_IDS } from "../constants.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Le Copilote, tel que la route le nomme.
 *
 * Le raccourci de la barre du haut mène **au Copilote**, pas à la vitrine :
 * déposer sur l'accueil laisserait un second geste à faire, c'est-à-dire la
 * moitié du péage qu'on voulait supprimer.
 */
export const ATELIER_COPILOTE = "copilote";

/**
 * Ce que le quatrième segment de la route désigne.
 *
 * Un nom court et lisible dans la barre d'adresse d'un côté, l'identifiant du
 * panneau de l'autre. On ne met dans cette table que ce à quoi un lien doit
 * pouvoir mener directement : tout ouvrir par la route ferait treize adresses à
 * maintenir pour des écrans qu'on atteint très bien par la vitrine.
 */
const PANNEAU_DE_LA_ROUTE = { [ATELIER_COPILOTE]: "studio-copilote" };

/**
 * Le panneau à ouvrir d'après la route.
 *
 * `#project/<id>/atelier/copilote` ouvre le Copilote ; sans quatrième segment,
 * l'Atelier ouvre sa vitrine.
 *
 * **Un segment inconnu ne fait pas d'erreur** : il rend une chaîne vide, donc
 * l'accueil. Une adresse mal tapée ou datée d'une version d'avant doit mener
 * quelque part de valable, pas à un écran vide qu'on ne sait pas expliquer.
 *
 * @param {string} hash le `location.hash`, avec ou sans son `#`
 * @returns {string} l'identifiant du panneau, ou `""`
 */
export function panneauDemandeParLaRoute(hash = "") {
  const segments = texte(hash).replace(/^#/, "").split("/");
  return PANNEAU_DE_LA_ROUTE[texte(segments[3])] ?? "";
}

/** Le segment de route d'un panneau, ou `""` quand aucun lien n'y mène. */
function segmentDuPanneau(panneau = "") {
  const vise = texte(panneau);
  return Object.keys(PANNEAU_DE_LA_ROUTE).find((nom) => PANNEAU_DE_LA_ROUTE[nom] === vise) ?? "";
}

/**
 * L'adresse qui dit ce qu'on regarde, d'après le panneau ouvert.
 *
 * ## Le défaut que ça répare
 *
 * L'adresse ne se mettait à jour qu'en entrant par un lien. Le Copilote
 * dimensionnait des fondations, on cliquait « Ouvrir dans l'Atelier », le
 * panneau basculait — et la barre d'adresse continuait de dire
 * `…/atelier/copilote`. On cliquait alors l'icône Copilote de la barre du haut :
 * elle pointe sur cette adresse-là, **exactement celle qui y est déjà**. Aucun
 * `hashchange`, donc rien. Le même geste par l'onglet Atelier puis le rail
 * marchait, ce qui rendait le défaut incompréhensible.
 *
 * L'adresse suit donc le panneau, toujours : c'est le même fait dit à un seul
 * endroit (règle 4).
 *
 * ## Ce qui n'est pas dans la table n'est pas dans l'adresse
 *
 * Seul le Copilote a un segment — c'est le seul vers lequel un lien pointe.
 * Ouvrir un agent laisse donc `#project/<id>/atelier`, sans quatrième segment :
 * treize adresses à maintenir pour des écrans qu'on atteint très bien par la
 * vitrine ne vaudraient pas leur coût.
 *
 * @param {string} hash le `location.hash`, avec ou sans son `#`
 * @param {string} panneau l'identifiant du panneau ouvert
 * @returns {string} l'adresse à écrire, avec son `#`, ou `""` s'il n'y a rien à
 *   changer — l'appelant n'écrit alors pas d'entrée d'historique pour rien.
 */
export function routeDuPanneau(hash = "", panneau = "") {
  const segments = texte(hash).replace(/^#/, "").split("/").filter(Boolean);
  // **Hors de l'Atelier, on n'écrit rien.** Une adresse de projet ne suffit pas :
  // composer `#project/<id>/sujets/copilote` ferait une route qui n'existe pas,
  // et le jour où quelqu'un la partagerait elle mènerait à l'onglet Sujets.
  if (segments.length < 3) return "";
  if (segments[0] !== "project" || segments[2] !== PROJECT_TAB_IDS.STUDIO) return "";

  const garde = segments.slice(0, 3);
  const segment = segmentDuPanneau(panneau);
  const voulue = `#${segment ? [...garde, segment].join("/") : garde.join("/")}`;

  return voulue === `#${segments.join("/")}` ? "" : voulue;
}
