import { escapeHtml } from "../../utils/escape-html.js";
import { renderSpinnerHtml } from "../ui/spinner.js";

export function renderProjectLocationMapCard({
  latitude = null,
  longitude = null,
  embedUrl = "",
  isLoading = false,
  showSpinner = false,
  iframeTitle = "Carte Google Maps de la localisation projet"
} = {}) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const isValidLocation = Number.isFinite(lat) && Number.isFinite(lng);

  if (!isValidLocation) {
    return `
      <div class="settings-location-map-card is-blurred">
        <div class="arkolia-map arkolia-map--placeholder is-empty" aria-hidden="true">
          <div class="arkolia-map__placeholder-surface"></div>
          <div class="arkolia-map__placeholder-blur"></div>
        </div>
      </div>
    `;
  }

  if (!embedUrl) {
    return `
      <div class="settings-location-map-card is-blurred">
        <div class="arkolia-map arkolia-map--placeholder" aria-hidden="true">
          <div class="arkolia-map__placeholder-surface"></div>
          <div class="arkolia-map__placeholder-blur"></div>
          ${isLoading && showSpinner ? `<div class="settings-location-map__spinner">${renderSpinnerHtml({ label: "Chargement de la carte", size: "md" })}</div>` : ""}
        </div>
      </div>
    `;
  }

  return `
    <div class="settings-location-map-card">
      <div class="arkolia-map">
        <iframe
          title="${escapeHtml(iframeTitle)}"
          src="${escapeHtml(embedUrl)}"
          loading="lazy"
          allowfullscreen
          referrerpolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>
    </div>
  `;
}
