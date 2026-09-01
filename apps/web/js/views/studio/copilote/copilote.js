/**
 * Le Copilote du projet.
 *
 * L'assistant vivait dans un calque posé au-dessus de toute l'application, et
 * son ambition était d'agir sur l'ensemble des projets. Il n'avait donc de
 * domicile nulle part : ni un projet auquel se rattacher, ni un vocabulaire, ni
 * une mémoire. Ce qu'il savait de vous, c'était l'**état de l'écran** — filtres,
 * pagination, sélection — et les réponses s'en ressentaient.
 *
 * Il s'installe ici, dans l'Atelier, à l'intérieur d'un projet. Ce n'est pas un
 * repli : c'est un ancrage. Un copilote de projet hérite d'un périmètre, d'un
 * découpage en zones et — c'est la suite — de la mémoire du projet.
 *
 * **Ce déplacement ne change pas encore ce qu'il sait.** Le contexte envoyé
 * reste celui d'avant. Injecter la mémoire hiérarchisée est le pas suivant, et
 * le faire en même temps que le déménagement aurait mêlé deux changements dont
 * l'un se juge à l'écran et l'autre à la qualité des réponses.
 *
 * ## L'état de la conversation ne vit pas ici
 *
 * Il reste dans `store.ui.assistant`, comme avant : c'est ce qui permet de
 * changer d'onglet et de retrouver l'échange en cours. Une conversation qu'un
 * changement d'écran efface n'est pas une conversation.
 */

import { store } from "../../../store.js";
import { escapeHtml } from "../../../utils/escape-html.js";
import { svgIcon } from "../../../ui/icons.js";
import { sendAssistMessage } from "../../../services/assist-service.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";

/**
 * Le peu de Markdown que le modèle nous renvoie.
 *
 * On échappe **avant** de reconnaître quoi que ce soit : une réponse est du
 * texte venu d'ailleurs, et l'interpréter comme du HTML ouvrirait la porte à
 * n'importe quoi.
 */
function mdToHtml(text) {
  return escapeHtml(text || "")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
}

function ensureState() {
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
  return store.ui.assistant;
}

function renderMessage(msg) {
  const role = msg.role === "user" ? "user" : "assistant";
  const auteur = role === "user" ? "Vous" : "Copilote";
  const quand = msg.ts ? new Date(msg.ts).toLocaleString("fr-FR") : "";

  return `
    <article class="assist-msg assist-msg--${role}">
      <div class="assist-msg__meta">
        <span class="assist-msg__author">${escapeHtml(auteur)}</span>
        <span class="assist-msg__time mono">${escapeHtml(quand)}</span>
      </div>
      <div class="assist-msg__body">${mdToHtml(msg.content || "")}</div>
    </article>
  `;
}

/**
 * L'accueil, quand rien n'a encore été dit.
 *
 * Il annonce **ce que le copilote sait**, et pas seulement ce qu'il sait faire.
 * Une invite qui promet « demandez-moi n'importe quoi » se fait juger sur la
 * première réponse ; celle-ci dit d'où elle parle, donc sur quoi la juger.
 */
function renderAccueil() {
  return `
    <div class="copilote-empty">
      <span class="copilote-empty__mark" aria-hidden="true">${svgIcon("copilot", { width: 32, height: 32 })}</span>
      <p class="copilote-empty__title">Le copilote de ce projet</p>
      <p class="copilote-empty__sub">
        Il travaille dans le périmètre de ce projet. Demandez-lui une synthèse, l'aide sur un sujet
        technique, ou la préparation d'un sujet à verser.
      </p>
    </div>
  `;
}

function renderCorps(etat) {
  const messages = Array.isArray(etat.messages) ? etat.messages : [];
  if (messages.length === 0) return renderAccueil();
  return `<div class="assist-thread copilote-thread" id="copiloteThread">${messages.map(renderMessage).join("")}</div>`;
}

function render(root) {
  const etat = ensureState();
  const vide = (etat.messages ?? []).length === 0;

  root.innerHTML = `
    <section class="settings-section is-active">
      <div class="copilote${vide ? " copilote--empty" : ""}">
        ${renderCorps(etat)}

        <div class="copilote-compose gh-field-focus">
          <textarea
            id="copiloteInput"
            class="copilote-input"
            rows="3"
            ${etat.isSending ? "disabled" : ""}
            placeholder="Posez une question sur ce projet…"
          >${escapeHtml(etat.draft || "")}</textarea>

          <div class="copilote-compose__actions">
            <div class="copilote-compose__left">
              <button type="button" class="assist-help-toggle" data-copilote-mode="auto"
                aria-pressed="${etat.mode !== "help" ? "true" : "false"}">Auto</button>
              <button type="button" class="assist-help-toggle" data-copilote-mode="help"
                aria-pressed="${etat.mode === "help" ? "true" : "false"}">Aide</button>
            </div>
            <button type="button" class="assist-send" id="copiloteSend" aria-label="Envoyer"
              ${etat.isSending ? "disabled" : ""}>${svgIcon("arrow-up")}</button>
          </div>
        </div>

        ${
          etat.lastError
            ? `<p class="copilote-error">${escapeHtml(etat.lastError)}</p>`
            : ""
        }
      </div>
    </section>
  `;

  const fil = root.querySelector("#copiloteThread");
  if (fil) fil.scrollTop = fil.scrollHeight;

  bind(root);
}

async function envoyer(root) {
  const etat = ensureState();
  const champ = root.querySelector("#copiloteInput");
  const contenu = String(champ?.value || "").trim();
  if (!contenu || etat.isSending) return;

  etat.draft = "";
  etat.messages.push({ role: "user", content: contenu, ts: new Date().toISOString() });
  etat.isSending = true;
  etat.lastError = "";
  render(root);

  try {
    const { reply } = await sendAssistMessage(contenu, { mode: etat.mode || "auto" });
    etat.messages.push({ role: "assistant", content: reply || "Réponse vide.", ts: new Date().toISOString() });
  } catch (error) {
    // L'erreur se dit à part, pas dans le fil : une panne de réseau n'est pas
    // une réponse du copilote, et la ranger parmi ses messages ferait croire
    // qu'il a répondu cela.
    etat.lastError = error?.message || "Le copilote n'a pas répondu.";
  } finally {
    etat.isSending = false;
    render(root);
    root.querySelector("#copiloteInput")?.focus();
  }
}

function bind(root) {
  const etat = ensureState();
  const champ = root.querySelector("#copiloteInput");

  champ?.addEventListener("input", (event) => {
    etat.draft = String(event.target.value || "");
  });

  champ?.addEventListener("keydown", (event) => {
    // Entrée envoie, Maj+Entrée passe à la ligne : c'est ce que fait toute
    // conversation, et demander Ctrl+Entrée pour la chose la plus fréquente
    // était un obstacle de plus.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void envoyer(root);
    }
  });

  root.querySelector("#copiloteSend")?.addEventListener("click", () => void envoyer(root));

  for (const bouton of root.querySelectorAll("[data-copilote-mode]")) {
    bouton.addEventListener("click", () => {
      etat.mode = bouton.getAttribute("data-copilote-mode") || "auto";
      render(root);
    });
  }
}

export function renderCopilote(root) {
  if (!root) return;
  render(root);
  registerProjectPrimaryScrollSource(
    root.closest("#projectStudioRouterScroll") || document.getElementById("projectStudioRouterScroll")
  );
}
