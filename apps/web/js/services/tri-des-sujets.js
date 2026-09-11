/**
 * L'ordre des sujets dans le tableau.
 *
 * ## Pourquoi un tri, et pourquoi celui-là
 *
 * La question posée n'était pas « peut-on trier ? » mais : **est-ce que des
 * sujets continuent d'arriver ?** Le compteur restait à 73 d'un jour sur
 * l'autre, et rien à l'écran ne permettait de savoir si c'était parce que rien
 * n'entrait, ou parce que ce qui entrait se rangeait quelque part au milieu
 * d'une liste de soixante-treize lignes.
 *
 * Ranger par dernière activité répond à la question en un coup d'œil : ce qui
 * a bougé en dernier est en haut. Un chantier vivant le montre, un chantier
 * arrêté aussi.
 *
 * ## Ce que « dernière activité » veut dire, et ce qu'on refuse d'inventer
 *
 * On lit la date que le sujet porte : sa dernière modification, à défaut sa
 * création. **Quand il n'en porte aucune, on le dit** — `derniereActivite`
 * rend une chaîne vide, et le sujet se range à la fin.
 *
 * Ce détail n'est pas une précaution de style. L'écran a déjà, pour afficher
 * « ouvert il y a trois jours », une lecture qui retombe sur *maintenant*
 * quand elle ne trouve rien : acceptable pour une phrase, désastreux pour un
 * tri, où un sujet sans date remonterait en tête comme s'il venait de bouger.
 * Ne pas savoir n'autorise pas à prétendre le contraire (règle 5).
 *
 * ## Ce que le tri ne fait pas
 *
 * Il ne filtre pas, il ne compte pas, il ne pagine pas. Il reçoit la liste
 * déjà filtrée et rend la même, dans un autre ordre : le nombre de sujets ne
 * change jamais en triant, et c'est ce qui permet au compteur et à la liste de
 * rester d'accord.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Les ordres possibles. `PROJET` est l'ordre d'origine, qu'on ne touche pas. */
export const TRI = {
  PROJET: "",
  DERNIERE_ACTIVITE: "derniere-activite"
};

/** Un ordre lu depuis l'état, ramené à ce qui existe. */
export function normaliserLeTri(tri) {
  return texte(tri) === TRI.DERNIERE_ACTIVITE ? TRI.DERNIERE_ACTIVITE : TRI.PROJET;
}

/** Le bouton est une bascule : un clic met le tri, un autre le retire. */
export function triSuivant(tri) {
  return normaliserLeTri(tri) === TRI.DERNIERE_ACTIVITE ? TRI.PROJET : TRI.DERNIERE_ACTIVITE;
}

/**
 * Ce que dit l'info-bulle du bouton.
 *
 * Elle annonce **ce que le clic va faire**, pas l'état courant : un bouton qui
 * dit « trié par dernière activité » alors qu'il va défaire ce tri se lit à
 * l'envers une fois sur deux.
 */
export function motDuTri(tri) {
  return normaliserLeTri(tri) === TRI.DERNIERE_ACTIVITE
    ? "Revenir à l'ordre du projet"
    : "Trier par dernière activité";
}

/**
 * La date de la dernière activité d'un sujet, ou rien.
 *
 * @param {object} sujet
 * @returns {string} une date telle que le sujet la porte, ou `""` quand il
 *   n'en porte aucune — jamais la date du jour.
 */
export function derniereActivite(sujet = null) {
  if (!sujet) return "";

  const candidats = [
    sujet.updated_at, sujet.updatedAt,
    sujet.raw?.updated_at, sujet.raw?.updatedAt,
    sujet.created_at, sujet.createdAt,
    sujet.raw?.created_at, sujet.raw?.createdAt
  ];

  for (const candidat of candidats) {
    const dit = texte(candidat);
    if (dit) return dit;
  }

  return "";
}

/** La date en nombre, ou `null` quand elle est absente ou illisible. */
function instant(sujet) {
  const dit = derniereActivite(sujet);
  if (!dit) return null;
  const lu = Date.parse(dit);
  return Number.isFinite(lu) ? lu : null;
}

/**
 * Les sujets, rangés.
 *
 * La liste d'origine n'est jamais modifiée : elle est aussi celle que comptent
 * les compteurs, et un tri en place les ferait compter dans un ordre qu'ils
 * n'ont pas demandé.
 *
 * Les sujets sans date **restent derrière**, dans leur ordre d'origine — le tri
 * de JavaScript est stable, ce qui suffit à le garantir. Les mettre en tête
 * reviendrait à dire qu'ils viennent de bouger ; les entremêler reviendrait à
 * leur inventer une place.
 *
 * @param {object[]} sujets déjà filtrés
 * @param {string} [tri] une valeur de `TRI`
 * @returns {object[]} une nouvelle liste, de même longueur
 */
export function trierLesSujets(sujets = [], tri = TRI.PROJET) {
  const lus = Array.isArray(sujets) ? sujets : [];
  if (normaliserLeTri(tri) !== TRI.DERNIERE_ACTIVITE) return lus.slice();

  return lus.slice().sort((gauche, droite) => {
    const a = instant(gauche);
    const b = instant(droite);
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return b - a;
  });
}
