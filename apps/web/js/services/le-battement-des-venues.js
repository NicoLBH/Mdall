/**
 * Le minuteur qui fait battre une venue.
 *
 * ## Tout ce qui décide est ailleurs
 *
 * `les-venues.js` dit **quand** battre, et il est pur : l'onglet est-il au
 * premier plan, y a-t-il eu un geste, la venue en cours est-elle close. Ce
 * fichier-ci n'a que ce qu'on ne peut pas éprouver sans navigateur — un
 * `setInterval`, trois écoutes, et la visibilité de l'onglet.
 *
 * ## Ce qu'il ne fait jamais
 *
 * Il ne retient **rien** de ce qu'on fait : l'écoute des gestes ne regarde ni la
 * cible du clic, ni la touche frappée, ni l'adresse de la page. Elle note une
 * heure, et c'est tout. Un écouteur qui saurait *quoi* a été cliqué serait un
 * journal de navigation, c'est-à-dire la promesse du produit défaite par la
 * bande.
 *
 * ## Et il ne gêne jamais
 *
 * Une mesure qui empêcherait de travailler serait une mesure retirée le
 * lendemain. Rien n'est attendu, rien ne lève : si la base ne répond pas, cette
 * minute n'est pas comptée.
 */

import {
  CE_QUIL_FAUT_FAIRE, PAS_DU_BATTEMENT_MS, ceQuilFautFaire, lesSecondesDuBattement
} from "./les-venues.js";

/** La venue en cours, et le dernier geste. */
const etat = { venue: null, derniereInteraction: 0, enRoute: false, minuteur: null };

/**
 * Les gestes qui comptent comme une présence.
 *
 * **Aucun ne porte ce qui a été fait.** `pointerdown` et non `click` : on veut
 * savoir que quelqu'un a touché l'écran, pas sur quoi. `keydown` sans la touche.
 * Et le défilement, parce que lire est aussi être là.
 */
const LES_GESTES = ["pointerdown", "keydown", "scroll", "wheel", "touchstart"];

/** Ce que le navigateur dit de l'onglet. */
function cestAuPremierPlan() {
  return typeof document !== "undefined" && document.visibilityState === "visible";
}

/**
 * Un battement.
 *
 * **Jamais deux à la fois.** Un onglet qui reprend après une veille déclenche
 * un battement et un changement de visibilité dans la même milliseconde : sans
 * ce verrou, deux venues s'ouvriraient pour une seule reprise.
 */
async function battre({
  commencerUneVenue, prolongerUneVenue, pasMs = PAS_DU_BATTEMENT_MS, maintenant = Date.now()
} = {}) {
  if (etat.enRoute) return;

  /**
   * **Le pas du minuteur est celui de la décision.**
   *
   * Il ne l'était pas : le minuteur prenait celui qu'on lui donnait, et la
   * décision reprenait la constante du module. Deux endroits tenaient la
   * cadence, et régler l'un sans l'autre donnait un battement qui ne battait
   * jamais — c'est ce qu'un banc a montré en réglant le pas à cent vingt
   * millisecondes et en n'obtenant rien (règle 4).
   */
  const quoi = ceQuilFautFaire({
    maintenant,
    pasMs,
    visible: cestAuPremierPlan(),
    derniereInteraction: etat.derniereInteraction,
    venue: etat.venue
  });
  if (quoi === CE_QUIL_FAUT_FAIRE.RIEN) return;

  etat.enRoute = true;
  try {
    if (quoi === CE_QUIL_FAUT_FAIRE.COMMENCER) {
      etat.venue = await commencerUneVenue();
      return;
    }

    const secondes = lesSecondesDuBattement({ maintenant, venue: etat.venue });
    const vueLe = await prolongerUneVenue(etat.venue.id, secondes);

    // **La venue n'est plus à nous, ou n'existe plus.** On en ouvrira une neuve
    // au battement suivant, plutôt que de battre indéfiniment dans le vide.
    etat.venue = vueLe ? { ...etat.venue, vueLe } : null;
  } finally {
    etat.enRoute = false;
  }
}

/**
 * Mettre le battement en route.
 *
 * Appelé une fois, au démarrage de l'application. Rend de quoi l'arrêter — ce
 * dont la page n'a pas l'usage, mais qu'un banc exige pour ne pas laisser un
 * minuteur derrière lui.
 */
export function fairebattreLesVenues({
  commencerUneVenue, prolongerUneVenue, pasMs = PAS_DU_BATTEMENT_MS
} = {}) {
  if (etat.minuteur || typeof document === "undefined") return () => {};
  if (!commencerUneVenue || !prolongerUneVenue) return () => {};

  const noter = () => { etat.derniereInteraction = Date.now(); };
  for (const geste of LES_GESTES) {
    document.addEventListener(geste, noter, { passive: true, capture: true });
  }

  /**
   * **Revenir sur l'onglet compte comme un geste.**
   *
   * Sans cela, on revient d'un autre onglet, on lit une minute sans rien toucher,
   * et rien n'est compté : le premier battement d'un retour tomberait toujours
   * dans « personne ne touche à rien ».
   */
  const auRetour = () => { if (cestAuPremierPlan()) noter(); };
  document.addEventListener("visibilitychange", auRetour);

  // Le premier battement part tout de suite : l'ouverture de l'application est
  // elle-même une présence, et attendre une minute perdrait toutes les visites
  // plus courtes que le pas.
  noter();
  void battre({ commencerUneVenue, prolongerUneVenue, pasMs });

  etat.minuteur = setInterval(
    () => void battre({ commencerUneVenue, prolongerUneVenue, pasMs }), pasMs);

  return () => {
    clearInterval(etat.minuteur);
    etat.minuteur = null;
    for (const geste of LES_GESTES) {
      document.removeEventListener(geste, noter, { capture: true });
    }
    document.removeEventListener("visibilitychange", auRetour);
  };
}

/** Ce que le battement sait de lui-même — pour les bancs, et rien d'autre. */
export function ceQueLeBattementSait() {
  return { ...etat };
}
