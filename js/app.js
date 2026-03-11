import { initRouter } from "./router.js";
import { store } from "./store.js";
import { runAnalysis, resetAnalysisUi } from "./services/analysis-runner.js";

function initGlobalNav() {
  const menuBtn = document.getElementById("menuBtn");
  const globalNav = document.getElementById("globalNav");

  if (!menuBtn || !globalNav) return;

  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    globalNav.classList.toggle("hidden");
  });

  globalNav.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      globalNav.classList.add("hidden");
      return;
    }

    if (e.target === globalNav) {
      globalNav.classList.add("hidden");
    }
  });

  document.addEventListener("click", (e) => {
    if (
      !globalNav.classList.contains("hidden") &&
      !globalNav.contains(e.target) &&
      e.target !== menuBtn
    ) {
      globalNav.classList.add("hidden");
    }
  });

  window.addEventListener("hashchange", () => {
    globalNav.classList.add("hidden");
  });
}

function initTopActions() {
  const runBtn = document.getElementById("runBtnTop");
  const resetBtn = document.getElementById("resetBtnTop");

  if (runBtn) {
    runBtn.addEventListener("click", runAnalysis);
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", resetAnalysisUi);
  }
}

function ensureAssistantOverlay() {
  if (document.getElementById("assist-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "assist-overlay";
  overlay.className = "assist-overlay";
  overlay.innerHTML = `
    <div class="assist-panel" role="dialog" aria-modal="true" aria-label="Assistant privé Rapso">
      <div class="assist-panel__head">
        <div class="assist-head__left">
          <div class="assist-head__logo"><img src="logo.png" alt="Rapso" style="width:34px;height:34px;display:block;"></div>
          <div class="assist-head__title">
            <div class="assist-head__name">Assistant privé</div>
            <div class="assist-head__sub">Échanges non publics avec Rapso • Actions historisées</div>
          </div>
        </div>
        <button class="assist-close" type="button" aria-label="Fermer">✕</button>
      </div>

      <div class="assist-panel__body">
        <div class="assist-thread" id="assist-thread"></div>
        <div class="assist-compose">
          <textarea id="assist-input" class="assist-input" rows="3" placeholder="Ex: Synthétise la situation SIT-ATT, ou prépare une validation en masse sur le sujet PB-ATT-001."></textarea>
          <div class="assist-compose__actions">
            <div class="assist-compose__left">
              <button id="assist-help-toggle" class="assist-help-toggle" type="button">Help</button>
            </div>
            <button id="assist-send" class="assist-send" type="button" aria-label="Envoyer">↑</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    store.ui.assistant.isOpen = false;
    overlay.classList.remove("is-open");
  };

  overlay.querySelector(".assist-close")?.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });

  overlay.querySelector("#assist-send")?.addEventListener("click", () => {
    const input = overlay.querySelector("#assist-input");
    const text = String(input?.value || "").trim();
    if (!text) return;

    store.ui.assistant.messages.push({ role: "user", text, ts: Date.now() });
    store.ui.assistant.messages.push({
      role: "assistant",
      text: "Message reçu. L’overlay est rétabli dans le refacto. Le branchement LLM privé peut maintenant être reconnecté sur cette base.",
      ts: Date.now()
    });
    store.ui.assistant.draft = "";
    input.value = "";
    renderAssistantThread();
  });

  overlay.querySelector("#assist-input")?.addEventListener("input", (event) => {
    store.ui.assistant.draft = event.target.value;
  });

  overlay.querySelector("#assist-input")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      overlay.querySelector("#assist-send")?.click();
    }
  });

  overlay.querySelector("#assist-help-toggle")?.addEventListener("click", (event) => {
    event.currentTarget.classList.toggle("is-on");
  });
}

function renderAssistantThread() {
  const thread = document.getElementById("assist-thread");
  const input = document.getElementById("assist-input");
  if (!thread) return;

  const messages = store.ui.assistant.messages || [];
  if (!messages.length) {
    thread.innerHTML = `
      <div class="assist-empty">
        <div class="assist-empty__title">Aucun échange pour l’instant</div>
        <div class="assist-empty__sub">Vous pouvez piloter le projet et demander des synthèses contextualisées.</div>
      </div>
    `;
  } else {
    thread.innerHTML = messages.map((message) => `
      <div class="assist-msg assist-msg--${message.role}">
        <div class="assist-msg__meta">
          <span class="assist-msg__who">${message.role === "user" ? "Vous" : "Rapso"}</span>
        </div>
        <div class="assist-msg__body">${message.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</div>
      </div>
    `).join("");
    thread.scrollTop = thread.scrollHeight;
  }

  if (input) input.value = store.ui.assistant.draft || "";
}

function openAssistantOverlay() {
  ensureAssistantOverlay();
  store.ui.assistant.isOpen = true;
  const overlay = document.getElementById("assist-overlay");
  if (overlay) overlay.classList.add("is-open");
  renderAssistantThread();
}

function initAssistantOverlayTrigger() {
  document.addEventListener("click", (event) => {
    const brandHit = event.target.closest(".gh-brand__logo");
    if (!brandHit) return;
    event.preventDefault();
    event.stopPropagation();
    openAssistantOverlay();
  });
}

function bootstrap() {
  console.log("RAPSOBOT V2 boot");

  store.user = {
    name: "demo"
  };

  initGlobalNav();
  initTopActions();
  initAssistantOverlayTrigger();
  initRouter();

  if (!location.hash) {
    location.hash = "#project/demo/situations";
  }
}

bootstrap();
