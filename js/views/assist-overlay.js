import { store } from "../store.js";
import { sendAssistMessage } from "../services/assist-service.js";
import { closeGlobalNav } from "./global-nav.js";

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
  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");

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
  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
}

export function mountAssistOverlay() {
  ensureAssistantState();
  if (getOverlay()) return;

  const overlay = document.createElement("div");
  overlay.id = "assist-overlay";
  overlay.className = "assist-overlay";
  overlay.setAttribute("aria-hidden", "true");

  overlay.innerHTML = `
    <div class="assist-panel" role="dialog" aria-modal="true" aria-label="Assistant privé Rapso">
      <div class="assist-panel__head">
        <div class="assist-head__left">
          <div class="assist-head__logo" aria-hidden="true"></div>
          <div class="assist-head__title">
            <div class="assist-head__name">Assistant privé</div>
            <div class="assist-head__sub">Contexte global ou projet courant • actions préparées • aide contextualisée</div>
          </div>
        </div>
        <button class="assist-close" type="button" aria-label="Fermer">✕</button>
      </div>

      <div class="assist-panel__body">
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
              <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                <path d="M8.53 1.22a.75.75 0 0 0-1.06 0L3.22 5.47a.75.75 0 0 0 1.06 1.06L7.25 3.56V14a.75.75 0 0 0 1.5 0V3.56l2.97 2.97a.75.75 0 1 0 1.06-1.06L8.53 1.22Z"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

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

  overlay.querySelector(".assist-close")?.addEventListener("click", closeAssistOverlay);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeAssistOverlay();
  });

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
