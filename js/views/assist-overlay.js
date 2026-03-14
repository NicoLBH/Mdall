import { store } from "../store.js";
import { sendAssistMessage } from "../services/assist-service.js";
import { closeGlobalNav } from "./global-nav.js";
import { svgIcon } from "../ui/icons.js";
import {
  renderOverlayChrome,
  renderOverlayChromeHead,
  setOverlayChromeOpenState,
  bindOverlayChromeDismiss
} from "./ui/overlay-chrome.js";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

function mdToHtml(text) {
  const safe = escapeHtml(text || "");
  return safe
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
}

function ensureAssistantState() {
  if (!store.ui) store.ui = {};
  if (!store.ui.assistant) {
    store.ui.assistant = {
      isOpen: false,
      isSending: false,
      mode: "auto",
      messages: [],
      draft: "",
      lastContext: null,
      lastError: ""
    };
  }
}

function getOverlay() {
  return document.getElementById("assist-overlay");
}

function getThread() {
  return document.getElementById("assist-thread");
}

function getInput() {
  return document.getElementById("assist-input");
}

function renderEmptyState() {
  const scope = store.currentProjectId ? "projet" : "global";
  return `
    <div class="assist-empty">
      <div class="assist-empty__title">Aucun échange pour l’instant</div>
      <div class="assist-empty__sub">
        ${
          scope === "project"
            ? "Vous pouvez demander une synthèse du projet, préparer des actions groupées, ou obtenir de l’aide sur la sélection courante."
            : "Vous pouvez demander une synthèse portefeuille, résumer les notifications ou prioriser les projets les plus urgents."
        }
      </div>
    </div>
  `;
}

function renderMessage(msg) {
  const role = msg.role === "user" ? "user" : "assistant";
  const roleLabel = role === "user" ? "Vous" : "Rapso";
  const ts = msg.ts ? new Date(msg.ts).toLocaleString("fr-FR") : "";

  return `
    <article class="assist-msg assist-msg--${role}">
      <div class="assist-msg__meta">
        <span class="assist-msg__author">${escapeHtml(roleLabel)}</span>
        <span class="assist-msg__time mono">${escapeHtml(ts)}</span>
      </div>
      <div class="assist-msg__body">${mdToHtml(msg.content || "")}</div>
    </article>
  `;
}

export function renderAssistOverlayMessages() {
  ensureAssistantState();
  const thread = getThread();
  if (!thread) return;

  const messages = Array.isArray(store.ui.assistant.messages)
    ? store.ui.assistant.messages
    : [];

  if (!messages.length) {
    thread.innerHTML = renderEmptyState();
    return;
  }

  thread.innerHTML = messages.map(renderMessage).join("");
  thread.scrollTop = thread.scrollHeight;
}

function syncInputFromStore() {
  const input = getInput();
  if (!input) return;
  input.value = store.ui.assistant?.draft || "";
}

function pushMessage(role, content) {
  ensureAssistantState();
  store.ui.assistant.messages.push({
    role,
    content,
    ts: new Date().toISOString()
  });
}

function setSendingState(isSending) {
  ensureAssistantState();
  store.ui.assistant.isSending = !!isSending;

  const sendBtn = document.getElementById("assist-send");
  const input = getInput();
  const overlay = getOverlay();

  if (sendBtn) sendBtn.disabled = !!isSending;
  if (input) input.disabled = !!isSending;
  if (overlay) overlay.classList.toggle("is-loading", !!isSending);
}

async function handleSend() {
  ensureAssistantState();

  const input = getInput();
  const content = String(input?.value || "").trim();
  if (!content || store.ui.assistant.isSending) return;

  store.ui.assistant.draft = "";
  if (input) input.value = "";

  pushMessage("user", content);
  renderAssistOverlayMessages();

  setSendingState(true);

  try {
    const { reply } = await sendAssistMessage(content, {
      mode: store.ui.assistant.mode || "auto"
    });

    pushMessage("assistant", reply || "Réponse vide.");
    store.ui.assistant.lastError = "";
  } catch (error) {
    const message = error?.message || "Erreur inconnue.";
    store.ui.assistant.lastError = message;
    pushMessage("assistant", `_(error: ${message})_`);
  } finally {
    setSendingState(false);
    renderAssistOverlayMessages();
    input?.focus();
  }
}

export function openAssistOverlay() {
  ensureAssistantState();
  const overlay = getOverlay();
  if (!overlay) return;

  closeGlobalNav();
  
  store.ui.assistant.isOpen = true;
  setOverlayChromeOpenState(overlay, true);

  syncInputFromStore();
  renderAssistOverlayMessages();

  setTimeout(() => {
    getInput()?.focus();
  }, 0);
}

export function closeAssistOverlay() {
  ensureAssistantState();
  const overlay = getOverlay();
  if (!overlay) return;

  store.ui.assistant.isOpen = false;
  setOverlayChromeOpenState(overlay, false);
}

export function mountAssistOverlay() {
  ensureAssistantState();
  if (getOverlay()) return;

  const overlay = document.createElement("div");
  overlay.id = "assist-overlay";
  overlay.className = "assist-overlay overlay-host overlay-host--assist hidden";
  overlay.setAttribute("aria-hidden", "true");

  overlay.innerHTML = renderOverlayChrome({
    shellClassName: "assist-panel",
    variant: "assist",
    ariaLabel: "Assistant privé Rapso",
    headHtml: renderOverlayChromeHead({
      titleHtml: `
        <div class="assist-head__left">
          <div class="assist-head__logo" aria-hidden="true"></div>
          <div class="assist-head__title">
            <div class="assist-head__name">Assistant privé</div>
            <div class="assist-head__sub">Contexte global ou projet courant • actions préparées • aide contextualisée</div>
          </div>
        </div>
      `,
      closeId: "assistClose",
      closeLabel: "Fermer",
      headClassName: "assist-panel__head"
    }),
    bodyClassName: "assist-panel__body",
    bodyHtml: `
      <div class="assist-thread" id="assist-thread"></div>

      <div class="assist-compose">
        <textarea
          id="assist-input"
          class="assist-input"
          rows="3"
          placeholder="Ex : résume les notifications importantes, priorise les projets urgents, ou prépare une synthèse du sujet sélectionné…"
        ></textarea>

        <div class="assist-compose__actions">
          <div class="assist-compose__left">
            <button id="assist-mode-auto" class="assist-help-toggle" type="button" aria-pressed="true">Auto</button>
            <button id="assist-mode-help" class="assist-help-toggle" type="button" aria-pressed="false">Help</button>
          </div>

          <button id="assist-send" class="assist-send" type="button" aria-label="Envoyer">
            ${svgIcon("arrow-up")}
          </button>
        </div>
      </div>
    `
  });

  document.body.appendChild(overlay);

  try {
    const src = document.querySelector(".gh-brand__logo");
    const slot = overlay.querySelector(".assist-head__logo");
    if (src && slot) {
      const clone = src.cloneNode(true);
      clone.classList.remove("gh-brand__logo");
      slot.appendChild(clone);
    }
  } catch {}

  bindOverlayChromeDismiss(overlay, {
    onClose: closeAssistOverlay
  });

  overlay.querySelector("#assistClose")?.addEventListener("click", closeAssistOverlay);

  const input = getInput();
  input?.addEventListener("input", (event) => {
    store.ui.assistant.draft = String(event.target.value || "");
  });

  input?.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      handleSend();
    }
  });

  overlay.querySelector("#assist-send")?.addEventListener("click", handleSend);

  overlay.querySelector("#assist-mode-auto")?.addEventListener("click", () => {
    store.ui.assistant.mode = "auto";
    overlay.querySelector("#assist-mode-auto")?.setAttribute("aria-pressed", "true");
    overlay.querySelector("#assist-mode-help")?.setAttribute("aria-pressed", "false");
  });

  overlay.querySelector("#assist-mode-help")?.addEventListener("click", () => {
    store.ui.assistant.mode = "help";
    overlay.querySelector("#assist-mode-auto")?.setAttribute("aria-pressed", "false");
    overlay.querySelector("#assist-mode-help")?.setAttribute("aria-pressed", "true");
  });

  renderAssistOverlayMessages();
}

export function bindGlobalAssistLauncher() {
  document.addEventListener("click", (event) => {
    const hit = event.target?.closest?.(
      "img.gh-brand__logo, .gh-brand__logo, .gh-brand__name, .gh-brand__sep, .gh-brand__repo"
    );
    if (!hit) return;

    event.preventDefault();
    openAssistOverlay();
  });
}
