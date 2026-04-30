import { escapeHtml } from "../../utils/escape-html.js";
import { renderSpinnerHtml } from "../ui/spinner.js";

export function renderProjectLocationMapCard({
  latitude = null,
  longitude = null,
  embedUrl = "",
  isLoading = false,
  showSpinner = false,
  iframeTitle = "Carte Google Maps de la localisation projet",
  height = "",
  containerClassName = "settings-location-map-card"
} = {}) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const isValidLocation = Number.isFinite(lat) && Number.isFinite(lng);

  const wrapperStyle = String(height || "").trim() ? ` style="height:${escapeHtml(String(height))};"` : "";
  const wrapperClass = escapeHtml(String(containerClassName || "settings-location-map-card"));

  if (!isValidLocation) {
    return `
      <div class="${wrapperClass} is-blurred"${wrapperStyle}>
        <div class="studio-map studio-map--placeholder is-empty" aria-hidden="true">
          <div class="studio-map__placeholder-surface"></div>
          <div class="studio-map__placeholder-blur"></div>
        </div>
      </div>
    `;
  }

  if (!embedUrl) {
    return `
      <div class="${wrapperClass} is-blurred"${wrapperStyle}>
        <div class="studio-map studio-map--placeholder" aria-hidden="true">
          <div class="studio-map__placeholder-surface"></div>
          <div class="studio-map__placeholder-blur"></div>
          ${isLoading && showSpinner ? `<div class="settings-location-map__spinner">${renderSpinnerHtml({ label: "Chargement de la carte", size: "md" })}</div>` : ""}
        </div>
      </div>
    `;
  }

  return `
    <div class="${wrapperClass}"${wrapperStyle}>
      <div class="studio-map">
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
