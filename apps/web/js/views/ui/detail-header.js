import { renderOverlayChromeHead } from "./overlay-chrome.js";

function renderCompactTitleBody({ variant = "grid", leftHtml = "", topHtml = "", bottomHtml = "", idHtml = "", wrapClass = "", bodyClass = "" } = {}) {
  const safeWrapClass = wrapClass ? ` ${wrapClass}` : "";
  const safeBodyClass = bodyClass ? ` ${bodyClass}` : "";

  if (variant === "inline") {
    return `
      <div class="details-title-wrap details-title--compact${safeWrapClass}">
        <div class="details-title-compact details-title-compact--inline${safeBodyClass}">
          ${leftHtml}
          ${topHtml}
          ${idHtml}
        </div>
      </div>
    `;
  }

  return `
    <div class="details-title-wrap details-title--compact${safeWrapClass}">
      <div class="details-title-compact${safeBodyClass}">
        <div class="details-title-compact-col1">${leftHtml}</div>
        <div class="details-title-compact-col2">
          <div class="details-title-compact-top">${topHtml}</div>
          <div class="details-title-compact-bottom">${bottomHtml}</div>
        </div>
      </div>
    </div>
  `;
}

export function renderSharedDetailsTitleWrap(selection, options = {}) {
  const {
    emptyText = "Sélectionner un élément",
    buildTitleTextHtml,
    buildIdHtml,
    buildExpandedBottomHtml,
    buildCompactConfig,
    /**
     * Ce qui suit le titre et son numéro, sur la même ligne.
     *
     * Le crayon qui corrige le titre y vit : posé à l'autre bout de la barre, il
     * se lisait comme une action sur l'écran alors qu'il ne touche que le titre.
     * La barre compacte ne le porte pas — elle n'a plus la place, et l'on ne
     * corrige pas un titre qu'on est en train de dépasser au défilement.
     */
    buildTrailingHtml = null
  } = options;

  if (!selection) {
    return `<span class="details-title-text">${emptyText}</span>`;
  }

  const titleTextHtml = buildTitleTextHtml(selection) || "";
  const idHtml = buildIdHtml(selection) || "";
  const expandedBottomHtml = buildExpandedBottomHtml(selection) || "";
  const compactConfig = buildCompactConfig(selection, { titleTextHtml, idHtml }) || {};
  const trailingHtml = typeof buildTrailingHtml === "function" ? (buildTrailingHtml(selection) || "") : "";

  return `
    <div class="details-title-wrap details-title--expanded">
      <div class="details-title-row details-title-row--main">
        <div class="details-title-maincol">
          <div class="details-title-topline">
            ${titleTextHtml}
            ${idHtml ? `<span class="details-title-id mono">${idHtml}</span>` : ""}
            ${trailingHtml}
          </div>
          <div class="details-title-bottomline">
            ${expandedBottomHtml}
          </div>
        </div>
      </div>
    </div>

    ${renderCompactTitleBody({
      variant: compactConfig.variant,
      leftHtml: compactConfig.leftHtml,
      topHtml: compactConfig.topHtml ?? titleTextHtml,
      bottomHtml: compactConfig.bottomHtml,
      idHtml: compactConfig.idHtml ? `<span class="details-title-id mono">${compactConfig.idHtml}</span>` : "",
      wrapClass: compactConfig.wrapClass,
      bodyClass: compactConfig.bodyClass
    })}
  `;
}



export function renderSharedDetailsChromeHeadHtml(selection, options = {}) {
  const {
    headId = "",
    headClassName = "",
    closeId = "",
    closeLabel = "Fermer",
    actionsHtml = "",
    titleWrapHtml = "",
    emptyPanelTitle = "Sélectionner un élément",
    buildMetaHtml = (currentSelection) => currentSelection?.item?.id || "—"
  } = options;

  return renderOverlayChromeHead({
    headId,
    titleId: "",
    titleHtml: selection ? titleWrapHtml : `<span class="details-title-text">${emptyPanelTitle}</span>`,
    metaId: "detailsMeta",
    metaHtml: buildMetaHtml(selection),
    closeId,
    closeLabel,
    headClassName,
    actionsHtml
  });
}

export function renderSharedDetailsTitleHtml(selection, options = {}) {
  const {
    showExpand = true,
    titleWrapHtml = "",
    emptyPanelTitle = "Sélectionner un élément",
    buildKickerText = () => "DÉTAILS",
    buildMetaHtml = (currentSelection) => currentSelection?.item?.id || "—"
  } = options;

  if (!selection) {
    const kickerText = buildKickerText(null) || "";
    return `
      <div class="details-head">
        <div class="details-head-left">
          <div class="details-kicker mono">${kickerText}</div>
          <div class="gh-panel__title">${emptyPanelTitle}</div>
        </div>
        <div class="details-head-right">
          <div class="details-meta mono" id="detailsMeta">—</div>
          ${showExpand ? `<button id="detailsExpand" class="icon-btn icon-btn--sm" aria-label="Agrandir" title="Agrandir">⤢</button>` : ``}
        </div>
      </div>
    `;
  }

  const kickerText = buildKickerText(selection) || "";
  return `
    <div class="details-head details-head--expanded">
      <div class="details-head-left">
        <div class="details-kicker mono">${kickerText}</div>
        <div class="gh-panel__title">
          ${titleWrapHtml}
        </div>
      </div>

      <div class="details-head-right">
        <div class="details-meta mono" id="detailsMeta">${buildMetaHtml(selection)}</div>
        ${showExpand ? `<button id="detailsExpand" class="icon-btn icon-btn--sm" aria-label="Agrandir" title="Agrandir">⤢</button>` : ``}
      </div>
    </div>
  `;
}
