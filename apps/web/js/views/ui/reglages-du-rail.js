/**
 * Le repli et la largeur d'un rail : des **réglages**, et un seul endroit.
 *
 * ## Pourquoi ils ne sont pas dans le magasin
 *
 * Replier le rail et le rétrécir ne sont pas des états de navigation : ce sont
 * des préférences, et elles suivent la personne d'une session à l'autre. Un
 * magasin qui s'efface au rechargement rouvrirait chaque fois un rail qu'on
 * avait replié — et l'on referait le geste tous les matins.
 *
 * ## Et pourquoi un par écran
 *
 * Replier le rail des Sujets d'un projet n'a aucune raison de replier celui du
 * carnet : ils ne montrent pas les mêmes choses, et l'on ne les regarde pas
 * dans la même intention. Chaque écran nomme donc le sien, et ce nom entre dans
 * la clé.
 *
 * ## Ce que ce module évite
 *
 * Le carnet portait ces quatre fonctions écrites à la main, plus le branchement
 * de la poignée et du bouton de repli. Deux écrans de plus en auraient fait
 * trois copies — et une copie qui oublie de ramener la largeur dans ses bornes,
 * ou qui oublie le `try` autour du stockage, se découvre dans un navigateur qui
 * refuse les cookies, c'est-à-dire jamais chez celui qui l'écrit (règle 10).
 */

import { bindRailResizer, followRailScroll, railWidth } from "./project-rail.js";

/** La largeur d'un rail qu'on n'a jamais réglé. Celle de tous les écrans. */
const LARGEUR_PAR_DEFAUT = 248;

/**
 * Les réglages du rail d'un écran.
 *
 * @param {string} nom le nom de l'écran, tel qu'il entre dans la clé de
 *   stockage — `"situations"`, `"tousLesSujets"`…
 * @returns {{replie: () => boolean, largeur: () => number,
 *   retenirLaLargeur: (largeur: number) => void, basculerLeRepli: () => void}}
 */
export function reglagesDuRail(nom = "") {
  const sien = String(nom || "rail").trim() || "rail";
  const CLE_DU_REPLI = `mdall.${sien}RailReplie.v1`;
  const CLE_DE_LA_LARGEUR = `mdall.${sien}RailLargeur.v1`;

  /**
   * Un navigateur qui refuse le stockage ne doit pas faire tomber l'écran : on
   * retombe sur le réglage par défaut, et le geste continue de marcher — c'est
   * sa mémoire qui manque, pas lui.
   */
  const lu = (cle) => {
    try { return window.localStorage.getItem(cle); } catch { return null; }
  };

  const ecrit = (cle, valeur) => {
    try { window.localStorage.setItem(cle, valeur); } catch { /* voir ci-dessus */ }
  };

  const replie = () => lu(CLE_DU_REPLI) === "1";

  return {
    replie,

    largeur() {
      const brut = Number(lu(CLE_DE_LA_LARGEUR));
      // **Bornée à la lecture, et pas seulement à l'écriture.** Une largeur
      // écrite par une version d'avant, ou par une main dans la console, ne doit
      // pas pouvoir manger la page.
      return Number.isFinite(brut) && brut > 0 ? railWidth(brut) : LARGEUR_PAR_DEFAUT;
    },

    retenirLaLargeur(largeur) {
      ecrit(CLE_DE_LA_LARGEUR, String(largeur));
    },

    basculerLeRepli() {
      ecrit(CLE_DU_REPLI, replie() ? "0" : "1");
    }
  };
}

/**
 * Branche un rail : son calage au défilement, sa poignée, son bouton de repli.
 *
 * **Elle rend de quoi débrancher**, et il faut s'en servir : `followRailScroll`
 * pose des écouteurs sur le document, qui survivraient à l'écran. Chaque rendu
 * en ajouterait une paire de plus, et elles continueraient de mesurer un rail
 * qui n'est plus là.
 *
 * @param {object} options
 * @param {Element} options.racine l'élément qui contient le rail
 * @param {string} options.id celui donné à `renderProjectRail`
 * @param {string} options.pageSelector l'élément qui porte `--project-rail-width`
 * @param {object} options.reglages ce que rend `reglagesDuRail`
 * @param {() => void} options.redessiner ce qu'il faut refaire après un repli
 * @returns {() => void}
 */
export function brancherLeRail({
  racine, id = "projectRail", pageSelector = "", reglages, redessiner = () => {}
} = {}) {
  if (!racine || !reglages) return () => {};

  const detacherLeCalage = followRailScroll(racine.querySelector(".project-rail"));
  const detacherLaPoignee = bindRailResizer({
    root: racine,
    id,
    pageSelector,
    getWidth: () => reglages.largeur(),
    onEnd: (largeur) => reglages.retenirLaLargeur(largeur)
  });

  const bouton = racine.querySelector("[data-project-rail-collapse]");
  const auRepli = (evenement) => {
    evenement.preventDefault();
    reglages.basculerLeRepli();
    redessiner();
  };
  bouton?.addEventListener("click", auRepli);

  return () => {
    detacherLeCalage?.();
    detacherLaPoignee?.();
    bouton?.removeEventListener("click", auRepli);
  };
}
