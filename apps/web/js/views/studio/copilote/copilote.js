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
 * découpage en zones et — depuis `memory-briefing.js` — de la mémoire du
 * projet, hiérarchisée par ce qui fonde quoi. Il ne devine plus : il lit.
 *
 * ## Ce que l'écran promet, et ce qu'il ne promet pas encore
 *
 * Sous la saisie, trois boutons : résoudre les conflits, créer un sujet,
 * préparer une proposition. Ils sont **inactifs**, et c'est délibéré : ils
 * disent où va ce copilote sans prétendre y être déjà. Un bouton qui ferait
 * semblable de fonctionner coûterait plus cher qu'un bouton éteint.
 *
 * Ce qu'ils ne feront jamais, même actifs : agir seuls. « L'Atelier propose, la
 * Mémoire enregistre — une seule porte. » Créer un sujet voudra dire le
 * **préparer**, et laisser quelqu'un le verser.
 *
 * ## L'état de la conversation ne vit pas ici
 *
 * Il reste dans `store.ui.assistant`, comme avant : c'est ce qui permet de
 * changer d'onglet et de retrouver l'échange en cours. Une conversation qu'un
 * changement d'écran efface n'est pas une conversation. Les discussions
 * passées, elles, sont dans `copilote-conversations.js`.
 */

import { store } from "../../../store.js";
import { escapeHtml } from "../../../utils/escape-html.js";
import { svgIcon } from "../../../ui/icons.js";
import { sendAssistMessage } from "../../../services/assist-service.js";
import {
  findConversation,
  loadConversations,
  newConversation,
  rememberConversation,
  saveConversations
} from "../../../services/copilote-conversations.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";

/**
 * Ce que le copilote saura faire, et ne sait pas encore.
 *
 * Le libellé et l'icône sont posés maintenant pour que la place soit prise et
 * que la suite ne soit pas une surprise. `disabled` porte la vérité : ces
 * boutons ne cliquent pas.
 */
const ACTIONS_A_VENIR = [
  { id: "conflits", label: "Résoudre conflits", icon: "bug" },
  { id: "sujet", label: "Créer un sujet", icon: "issue-draft" },
  { id: "proposition", label: "Proposition", icon: "git-pull-request" }
];

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

/** Sous quelle clé les discussions de ce projet se rangent. */
function cleProjet() {
  return String(store.currentProjectId || "");
}

function ensureState() {
  if (!store.ui) store.ui = {};

  if (!store.ui.assistant) {
    const courante = newConversation();
    store.ui.assistant = {
      isSending: false,
      draft: "",
      lastError: "",
      conversationId: courante.id,
      messages: [],
      conversations: loadConversations(cleProjet()),
      projectKey: cleProjet()
    };
  }

  // Changer de projet ne doit pas montrer les discussions du précédent : la
  // confusion serait invisible et les réponses, relues hors de leur chantier,
  // fausses.
  if (store.ui.assistant.projectKey !== cleProjet()) {
    const courante = newConversation();
    store.ui.assistant.projectKey = cleProjet();
    store.ui.assistant.conversations = loadConversations(cleProjet());
    store.ui.assistant.conversationId = courante.id;
    store.ui.assistant.messages = [];
    store.ui.assistant.draft = "";
    store.ui.assistant.lastError = "";
  }

  return store.ui.assistant;
}

/** Ce que l'échange en cours vaut, sous la forme qu'on archive. */
function conversationCourante(etat) {
  const connue = findConversation(etat.conversations, etat.conversationId);
  const quand = new Date().toISOString();

  return {
    id: etat.conversationId,
    startedAt: connue?.startedAt || etat.messages[0]?.ts || quand,
    updatedAt: quand,
    messages: etat.messages
  };
}

/** L'archivage : une seule écriture, à chaque fois que le fil bouge. */
function archiver(etat) {
  etat.conversations = rememberConversation(etat.conversations, conversationCourante(etat));
  saveConversations(etat.projectKey, etat.conversations);
  document.dispatchEvent(new CustomEvent("copilote:conversations"));
}

/** Ouvrir une discussion neuve. L'ancienne reste, elle a déjà été archivée. */
export function startNewConversation() {
  const etat = ensureState();
  const courante = newConversation();

  etat.conversationId = courante.id;
  etat.messages = [];
  etat.draft = "";
  etat.lastError = "";

  document.dispatchEvent(new CustomEvent("copilote:conversations"));
}

/** Rouvrir une discussion passée, telle qu'elle a été laissée. */
export function openConversation(id) {
  const etat = ensureState();
  const conversation = findConversation(etat.conversations, id);
  if (!conversation) return false;

  etat.conversationId = conversation.id;
  etat.messages = conversation.messages.map((message) => ({ ...message }));
  etat.draft = "";
  etat.lastError = "";
  return true;
}

/** Les discussions du projet, la plus récente en tête. */
export function copiloteConversations() {
  return ensureState().conversations;
}

/** L'identifiant de la discussion affichée — celui que le rail met en avant. */
export function copiloteConversationId() {
  return ensureState().conversationId;
}

function renderMessage(msg) {
  const role = msg.role === "user" ? "user" : "assistant";
  const auteur = role === "user" ? "Vous" : "Copilote";
  const quand = msg.ts ? new Date(msg.ts).toLocaleString("fr-FR") : "";

  return `
    <article class="copilote-msg copilote-msg--${role}">
      <div class="copilote-msg__meta">
        <span class="copilote-msg__author">${escapeHtml(auteur)}</span>
        <span class="copilote-msg__time mono">${escapeHtml(quand)}</span>
      </div>
      <div class="copilote-msg__body">${mdToHtml(msg.content || "")}</div>
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
        Il lit la mémoire de ce projet — données de base, contraintes, hypothèses, constats —
        avant de répondre. Ce qui n'y figure pas, il le dira plutôt que de l'inventer.
      </p>
    </div>
  `;
}

function renderCorps(etat) {
  const messages = Array.isArray(etat.messages) ? etat.messages : [];
  if (messages.length === 0) return renderAccueil();
  return `<div class="copilote-thread" id="copiloteThread">${messages.map(renderMessage).join("")}</div>`;
}

function renderActions() {
  return ACTIONS_A_VENIR.map((action) => `
    <button type="button" class="copilote-action" data-copilote-action="${escapeHtml(action.id)}" disabled
      title="Bientôt : ${escapeHtml(action.label.toLowerCase())}">
      ${svgIcon(action.icon)}
      <span>${escapeHtml(action.label)}</span>
    </button>
  `).join("");
}

function render(root) {
  const etat = ensureState();
  const vide = (etat.messages ?? []).length === 0;

  root.innerHTML = `
    <section class="settings-section is-active">
      <div class="copilote${vide ? " copilote--empty" : ""}">
        ${renderCorps(etat)}

        <div class="copilote-composer">
          <div class="copilote-compose gh-field-focus">
            <textarea
              id="copiloteInput"
              class="copilote-input"
              rows="3"
              ${etat.isSending ? "disabled" : ""}
              placeholder="Posez une question sur ce projet…"
            >${escapeHtml(etat.draft || "")}</textarea>

            <button type="button" class="copilote-send" id="copiloteSend" aria-label="Envoyer"
              ${etat.isSending ? "disabled" : ""}>${svgIcon("paper-airplane")}</button>
          </div>

          <div class="copilote-actions" role="group" aria-label="Ce que le copilote saura faire">
            ${renderActions()}
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
  // La question est archivée avant la réponse : si le réseau tombe, ce qui a
  // été demandé ne disparaît pas de l'historique pour autant.
  archiver(etat);
  render(root);

  try {
    const { reply } = await sendAssistMessage(contenu);
    etat.messages.push({ role: "assistant", content: reply || "Réponse vide.", ts: new Date().toISOString() });
  } catch (error) {
    // L'erreur se dit à part, pas dans le fil : une panne de réseau n'est pas
    // une réponse du copilote, et la ranger parmi ses messages ferait croire
    // qu'il a répondu cela.
    etat.lastError = error?.message || "Le copilote n'a pas répondu.";
  } finally {
    etat.isSending = false;
    archiver(etat);
    render(root);
    root.querySelector("#copiloteInput")?.focus();
  }
}

/** Le champ prend la hauteur de ce qu'on y écrit, sans dépasser sa limite. */
function ajusterHauteur(champ) {
  if (!champ) return;
  champ.style.height = "auto";
  champ.style.height = `${champ.scrollHeight}px`;
}

function bind(root) {
  const etat = ensureState();
  const champ = root.querySelector("#copiloteInput");

  ajusterHauteur(champ);

  champ?.addEventListener("input", (event) => {
    etat.draft = String(event.target.value || "");
    ajusterHauteur(event.target);
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
}

export function renderCopilote(root) {
  if (!root) return;
  render(root);
  registerProjectPrimaryScrollSource(
    root.closest("#projectStudioRouterScroll") || document.getElementById("projectStudioRouterScroll")
  );
}
