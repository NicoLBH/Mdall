let ghAlertBound = false;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

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
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="currentColor">
            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 1 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path>
          </svg>
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
