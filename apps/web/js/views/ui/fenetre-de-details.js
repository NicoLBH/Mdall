/**
 * La fenêtre de détails de l'application, prêtée à qui en a besoin.
 *
 * ## Pourquoi celle-là, et pas une autre
 *
 * Elle attend dans le document depuis toujours (`#detailsModal`) : sa coque, son
 * voile, son en-tête, sa croix, son ombre et son comportement de fermeture sont
 * déjà réglés, et c'est **la** fenêtre de Mdall. En dessiner une seconde pour
 * l'aperçu d'une note revenait à recalibrer un voile, un retrait et une ombre
 * contre ceux d'à côté — et à les faire diverger au premier réglage (règle 10).
 *
 * Le détail d'un sujet la remplit avec son propre contenu ; ce module fait la
 * même chose pour tout le reste, sans rien connaître de ce qu'on y met.
 *
 * ## Elle ne touche pas au magasin
 *
 * Le détail d'un sujet retient son ouverture dans `store.*.detailsModalOpen`,
 * parce que son écran se redessine et doit la rouvrir. Ici, non : l'ouverture
 * est un geste, elle ne survit pas au changement d'écran, et écrire ce drapeau
 * ferait croire à l'écran des sujets que **sa** fenêtre est ouverte — il la
 * remplirait de son contenu au premier rendu.
 *
 * ## Ce qu'elle rend
 *
 * Le corps, pour que l'appelant y peigne ce qu'il veut, et de quoi refermer.
 */

import { bindOverlayChromeDismiss, setOverlayChromeOpenState } from "./overlay-chrome.js";

/** Ce qu'on referme quand on en rouvre une autre, ou qu'on quitte l'écran. */
let fermetureEnCours = null;

/** Ce qui écoute les gestes du contenu en place — un seul à la fois. */
let gesteEnCours = null;

/** Les morceaux de la fenêtre, tels que le document les porte. */
function morceaux() {
  const hote = document.getElementById("detailsModal");
  if (!hote) return null;

  return {
    hote,
    titre: document.getElementById("detailsTitleModal"),
    meta: document.getElementById("detailsMetaModal"),
    corps: document.getElementById("detailsBodyModal")
  };
}

/**
 * Les gestes que le contenu porte, écoutés une fois pour toutes.
 *
 * Le contenu se réécrit — une barre d'outils dont un bouton change d'état, un
 * corps repeint —, et des écouteurs posés sur ses nœuds mourraient avec eux :
 * le bouton cesserait de répondre sans rien dire. L'écoute est donc sur la
 * coque, qui ne bouge pas, et elle appelle **celui du moment** plutôt qu'une
 * fermeture capturée à la première ouverture.
 */
function brancherLesGestes(hote) {
  if (hote.dataset.fenetreGestesBranches === "1") return;
  hote.dataset.fenetreGestesBranches = "1";

  hote.addEventListener("click", (evenement) => {
    const bouton = evenement.target.closest?.("[data-geste]");
    if (!bouton || !hote.contains(bouton)) return;
    gesteEnCours?.(String(bouton.dataset.geste || ""), evenement);
  });
}

/**
 * Ouvrir la fenêtre sur un contenu.
 *
 * @param {object} options
 * @param {string} [options.titreHtml] à gauche de l'en-tête
 * @param {string} [options.metaHtml] à droite, avant la croix
 * @param {string} [options.corpsHtml] le contenu
 * @param {string} [options.className] une classe posée sur la coque, pour les
 *   quelques réglages qui ne valent que pour ce contenu-là
 * @param {() => void} [options.surFermeture] appelé par la croix, le voile et
 *   Échap : c'est à l'appelant de rendre ce qu'il retenait.
 * @param {(geste: string, evenement: Event) => void} [options.surGeste] appelé
 *   quand on clique un `[data-geste]` du contenu, avec le nom qu'il porte.
 * @returns {Element|null} le corps, où peindre
 */
export function ouvrirLaFenetreDeDetails({
  titreHtml = "", metaHtml = "", corpsHtml = "", className = "",
  surFermeture = null, surGeste = null
} = {}) {
  const parts = morceaux();
  if (!parts?.corps) return null;

  // Une fenêtre à la fois : deux contenus superposés se recouvrent, et l'on
  // clique dans celui qu'on ne regarde pas.
  fermetureEnCours?.();

  if (parts.titre) parts.titre.innerHTML = titreHtml;
  if (parts.meta) parts.meta.innerHTML = metaHtml;
  parts.corps.innerHTML = corpsHtml;
  if (className) parts.hote.classList.add(className);

  setOverlayChromeOpenState(parts.hote, true);
  document.body.classList.add("modal-open");

  // La croix et le voile referment : le composant sait déjà le faire, et son
  // écoute ne se pose qu'une fois — c'est pourquoi elle délègue à un renvoi
  // qu'on remplace, plutôt que d'en empiler une par ouverture.
  bindOverlayChromeDismiss(parts.hote, { onClose: () => fermetureEnCours?.() });
  brancherLesGestes(parts.hote);
  gesteEnCours = typeof surGeste === "function" ? surGeste : null;

  const auClavier = (evenement) => {
    if (evenement.key === "Escape") fermetureEnCours?.();
  };
  document.addEventListener("keydown", auClavier);

  fermetureEnCours = () => {
    fermetureEnCours = null;
    gesteEnCours = null;
    document.removeEventListener("keydown", auClavier);
    if (className) parts.hote.classList.remove(className);
    setOverlayChromeOpenState(parts.hote, false);
    document.body.classList.remove("modal-open");
    parts.corps.innerHTML = "";
    if (parts.titre) parts.titre.innerHTML = "";
    if (parts.meta) parts.meta.innerHTML = "";
    surFermeture?.();
  };

  return parts.corps;
}

/**
 * Changer ce que la fenêtre montre, **sans la refermer**.
 *
 * ## Le défaut que ça répare
 *
 * Un contenu qui change d'état — une note qu'on lit, puis qu'on n'a pas su
 * dessiner — était réaffiché en rouvrant la fenêtre. Or rouvrir referme d'abord
 * celle d'avant : `surFermeture` partait, l'appelant rendait ce qu'il retenait
 * et remettait son état à zéro, et la fenêtre se retrouvait ouverte sur un
 * contenu dont plus personne ne se savait propriétaire. La croix ne rendait
 * plus rien, le second clic rouvrait au lieu de fermer.
 *
 * On ne remplace donc que les trois morceaux. La fermeture reste celle qu'on a
 * confiée à l'ouverture : elle ne se joue qu'une fois, à la fin.
 *
 * @returns {Element|null} le corps, ou `null` si rien n'est ouvert
 */
export function majLaFenetreDeDetails({ titreHtml = "", metaHtml = "", corpsHtml = "" } = {}) {
  if (!fermetureEnCours) return null;

  const parts = morceaux();
  if (!parts?.corps) return null;

  if (parts.titre) parts.titre.innerHTML = titreHtml;
  if (parts.meta) parts.meta.innerHTML = metaHtml;
  parts.corps.innerHTML = corpsHtml;
  return parts.corps;
}

/** Refermer, s'il y a quelque chose à refermer. */
export function fermerLaFenetreDeDetails() {
  fermetureEnCours?.();
}

/** Y a-t-il une fenêtre ouverte par ce module ? */
export function laFenetreDeDetailsEstOuverte() {
  return Boolean(fermetureEnCours);
}
