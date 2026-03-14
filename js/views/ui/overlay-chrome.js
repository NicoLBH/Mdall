function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

export function renderOverlayChromeHead({
  eyebrow = "",
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
    <div class="overlay-chrome__head gh-panel__head gh-panel__head--tight details-head--expanded ${escapeHtml(headClassName)}">
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

export function bindOverlayChromeCompact(scrollEl, chromeEl, key = "default") {
  if (!scrollEl || !chromeEl) return;

  const attr = `overlayChromeBound${String(key).replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const sync = () => {
    const scrolled = (scrollEl.scrollTop || 0) > 8;
    chromeEl.classList.toggle("overlay-chrome--compact", scrolled);

    chromeEl.querySelectorAll(".gh-panel__head--tight, .overlay-chrome__head").forEach((head) => {
      head.classList.toggle("details-head--compact", scrolled);
      head.classList.toggle("details-head--expanded", !scrolled);
    });
  };

  scrollEl.__syncCondensedTitle = sync;

  if (scrollEl.dataset[attr] === "1") {
    sync();
    return;
  }

  scrollEl.dataset[attr] = "1";
  scrollEl.addEventListener("scroll", sync, { passive: true });

  sync();
  setTimeout(sync, 0);
}
