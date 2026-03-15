let ghAlertBound = false;
import { svgIcon } from "../../ui/icons.js";
import { escapeHtml } from "../../utils/escape-html.js";

export function renderGhAlert({
  id = "",
  variant = "",
  message = "",
  dismissible = true,
  hidden = false
}) {
  const classes = [
    "gh-alert",
    variant ? `gh-alert--${variant}` : "",
    hidden ? "hidden" : ""
  ].filter(Boolean).join(" ");

  return `
    <div id="${id}" class="${classes}" role="status" aria-live="polite">
      ${dismissible ? `
        <button
          type="button"
          class="gh-alert__close"
          data-gh-alert-close
          aria-label="Fermer"
        >
          ${svgIcon("x")}
        </button>
      ` : ""}

      <div class="gh-alert__body">${escapeHtml(message)}</div>
    </div>
  `;
}

export function bindGhAlerts() {
  if (ghAlertBound) return;
  ghAlertBound = true;

  document.addEventListener("click", (event) => {
    const closeBtn = event.target.closest?.("[data-gh-alert-close]");
    if (!closeBtn) return;

    const alert = closeBtn.closest(".gh-alert");
    if (!alert) return;

    alert.classList.add("hidden");
  });
}

export function setGhAlertState(alertEl, {
  variant = "",
  message = "",
  hidden = false
} = {}) {
  if (!alertEl) return;

  alertEl.className = [
    "gh-alert",
    variant ? `gh-alert--${variant}` : "",
    hidden ? "hidden" : ""
  ].filter(Boolean).join(" ");

  const body = alertEl.querySelector(".gh-alert__body");
  if (body) body.textContent = String(message || "");
}
