import { escapeHtml } from "../../utils/escape-html.js";

export function renderOverlayChromeHead({
  eyebrow = "",
  headId = "",
  titleId = "",
  titleHtml = "—",
  metaId = "",
  metaHtml = "",
  closeId = "",
  closeLabel = "Fermer",
  headClassName = "",
  actionsHtml = ""
} = {}) {
  return `
    <div ${headId ? `id="${escapeHtml(headId)}"` : ""} class="overlay-chrome__head gh-panel__head gh-panel__head--tight details-head--expanded ${escapeHtml(headClassName)}">
      <div class="overlay-chrome__bar">
        <div class="overlay-chrome__context">
          ${eyebrow ? `<div class="overlay-chrome__eyebrow mono">${escapeHtml(eyebrow)}</div>` : ""}
          <div class="overlay-chrome__titlewrap" ${titleId ? `id="${escapeHtml(titleId)}"` : ""}>${titleHtml}</div>
        </div>

        <div class="overlay-chrome__actions">
          ${metaId ? `<div class="details-meta mono" id="${escapeHtml(metaId)}">${metaHtml || ""}</div>` : (metaHtml || "")}
          ${actionsHtml || ""}
          ${closeId ? `<button class="icon-btn icon-btn--sm overlay-chrome__close" id="${escapeHtml(closeId)}" aria-label="${escapeHtml(closeLabel)}">✕</button>` : ""}
        </div>
      </div>
    </div>
  `;
}

export function renderOverlayChrome({
  shellTag = "div",
  shellId = "",
  shellClassName = "",
  variant = "side",
  role = "dialog",
  ariaModal = "true",
  ariaLabel = "",
  headHtml = "",
  bodyId = "",
  bodyHtml = "",
  bodyClassName = ""
} = {}) {
  const safeTag = shellTag === "section" ? "section" : "div";

  return `
    <${safeTag}
      ${shellId ? `id="${escapeHtml(shellId)}"` : ""}
      class="overlay-chrome overlay-chrome--${escapeHtml(variant)} ${escapeHtml(shellClassName)}"
      role="${escapeHtml(role)}"
      aria-modal="${escapeHtml(ariaModal)}"
      ${ariaLabel ? `aria-label="${escapeHtml(ariaLabel)}"` : ""}
    >
      ${headHtml}
      <div class="overlay-chrome__body ${escapeHtml(bodyClassName)}" ${bodyId ? `id="${escapeHtml(bodyId)}"` : ""}>
        ${bodyHtml}
      </div>
    </${safeTag}>
  `;
}

export function setOverlayChromeOpenState(hostEl, isOpen) {
  if (!hostEl) return;
  hostEl.classList.toggle("is-open", !!isOpen);
  hostEl.classList.toggle("hidden", !isOpen);
  hostEl.setAttribute("aria-hidden", String(!isOpen));
}

export function bindOverlayChromeDismiss(hostEl, {
  closeSelector = "[data-overlay-close], .overlay-chrome__close",
  closeOnBackdrop = true,
  onClose = null
} = {}) {
  if (!hostEl || hostEl.dataset.overlayChromeDismissBound === "1") return;
  hostEl.dataset.overlayChromeDismissBound = "1";

  hostEl.addEventListener("click", (event) => {
    const closeBtn = event.target.closest(closeSelector);
    if (closeBtn) {
      onClose?.(event);
      return;
    }

    if (!closeOnBackdrop) return;
    if (event.target === hostEl) {
      onClose?.(event);
    }
  });
}

function getOverlayCompactHeads(chromeEl) {
  if (!chromeEl) return [];

  const heads = [];
  if (chromeEl.matches?.(".gh-panel__head--tight, .overlay-chrome__head, .modal__head, .drilldown__head")) {
    heads.push(chromeEl);
  }

  heads.push(...chromeEl.querySelectorAll(".gh-panel__head--tight, .overlay-chrome__head, .modal__head, .drilldown__head"));
  return heads;
}

/**
 * Les synchronisations en cours, par élément qui défile.
 *
 * Un seul écouteur est posé par cible, et il appelle **les fonctions du moment**
 * plutôt qu'une fermeture capturée le premier jour. C'est tout le correctif :
 * chaque rendu remplace l'en-tête dans le DOM, et un écouteur qui garderait la
 * référence du premier basculerait les classes sur un élément détaché — les
 * classes changent, l'écran ne bouge pas.
 *
 * La table est faible : quand l'élément qui défile disparaît, ses
 * synchronisations disparaissent avec lui.
 */
const COMPACT_SYNCS = new WeakMap();

/**
 * Compacte un en-tête quand son contenu défile.
 *
 * @param {Element|Document} scrollEl ce qui défile — `document`, sa racine, ou
 *   un conteneur qui a son propre ascenseur
 * @param {Element} chromeEl l'élément qui porte `overlay-chrome--compact`, et
 *   dans lequel on cherche les en-têtes à basculer
 * @param {string} key un nom par écran : deux écrans peuvent écouter le même
 *   défilement sans se remplacer l'un l'autre
 */
export function bindOverlayChromeCompact(scrollEl, chromeEl, key = "default", options = {}) {
  if (!scrollEl || !chromeEl) return;

  const { onCompactChange = null } = options || {};
  const isDocumentLike = scrollEl === document || scrollEl === document.documentElement || scrollEl === document.body;
  const eventTarget = isDocumentLike ? window : scrollEl;
  const stateTarget = isDocumentLike ? (document.scrollingElement || document.documentElement || document.body) : scrollEl;

  const sync = () => {
    const scrolled = (stateTarget?.scrollTop || 0) > 8;
    chromeEl.classList.toggle("overlay-chrome--compact", scrolled);

    getOverlayCompactHeads(chromeEl).forEach((head) => {
      head.classList.toggle("details-head--compact", scrolled);
      head.classList.toggle("details-head--expanded", !scrolled);
    });

    onCompactChange?.(scrolled);
  };

  // Conservé : plusieurs écrans appellent cette poignée pour se resynchroniser
  // après avoir restauré une position de défilement.
  scrollEl.__syncCondensedTitle = sync;

  let syncs = COMPACT_SYNCS.get(eventTarget);
  if (!syncs) {
    syncs = new Map();
    COMPACT_SYNCS.set(eventTarget, syncs);
    // Un seul écouteur, pour toujours. Il lit la table à chaque défilement, et
    // travaille donc sur les en-têtes réellement affichés.
    eventTarget.addEventListener(
      "scroll",
      () => {
        for (const run of syncs.values()) run();
      },
      { passive: true }
    );
  }

  // Le rendu suivant remplace la synchronisation de cet écran, il ne s'ajoute
  // pas à elle : sans quoi chaque rendu laisserait un écouteur de plus.
  syncs.set(String(key), sync);

  sync();
  setTimeout(sync, 0);
}
