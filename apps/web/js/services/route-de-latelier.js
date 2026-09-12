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
