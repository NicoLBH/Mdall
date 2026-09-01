/**
 * L'unique porte vers le copilote.
 *
 * Deux choses ont changé ici, et elles vont ensemble.
 *
 * **La requête est signée.** Elle partait anonyme ; elle porte désormais le
 * jeton de la session, et elle ne part plus du tout s'il n'y en a pas. Le
 * détail de ce choix — et de ce qu'il ne suffit pas à garantir — est dans
 * `assist-auth.js`.
 *
 * **Le mode a disparu.** L'assistant avait deux boutons, « Auto » et « Aide »,
 * hérités d'un temps où il devait servir tous les projets. Personne ne savait
 * dire ce que le second changeait, et un réglage dont l'effet ne s'énonce pas
 * n'est pas un réglage : c'est une case qu'on coche au hasard. Le copilote de
 * projet n'en a qu'un, sa manière de répondre.
 */

import { ASSIST_LLM_URL_PROD } from "../constants.js";
import { store } from "../store.js";
import { buildAssistContext } from "./assist-context.js";
import { assistHeaders, isTokenStale } from "./assist-auth.js";
import { getSessionSafe, refreshUserSession } from "../../assets/js/auth.js";

function normalizeMessage(message) {
  return String(message || "").trim();
}

function historyForPayload() {
  const all = Array.isArray(store.ui?.assistant?.messages)
    ? store.ui.assistant.messages
    : [];

  return all.slice(-12).map((msg) => ({
    role: msg.role,
    content: msg.content,
    ts: msg.ts || new Date().toISOString()
  }));
}

/**
 * Le jeton du moment, renouvelé s'il est sur le point de mourir.
 *
 * Le renouvellement se tente avant l'envoi, pas après un refus : un message
 * perdu parce que la session a expiré pendant la frappe se rattrape mal, et
 * l'utilisateur ne comprendrait pas pourquoi sa question a disparu.
 */
async function resolveAccessToken() {
  let session = await getSessionSafe().catch(() => null);

  if (session?.refresh_token && isTokenStale(session)) {
    session = await refreshUserSession().catch(() => session);
  }

  return session?.access_token || "";
}

function parseAssistantReply(data) {
  if (!data) return "Je n’ai pas reçu de réponse exploitable.";
  if (typeof data === "string") return data.trim() || "Réponse vide.";
  if (typeof data.reply_markdown === "string" && data.reply_markdown.trim()) return data.reply_markdown.trim();
  if (typeof data.reply === "string" && data.reply.trim()) return data.reply.trim();
  if (typeof data.message === "string" && data.message.trim()) return data.message.trim();
  if (Array.isArray(data.messages) && data.messages.length) {
    const last = data.messages[data.messages.length - 1];
    if (typeof last?.content === "string" && last.content.trim()) return last.content.trim();
  }
  return JSON.stringify(data, null, 2);
}

export async function sendAssistMessage(message) {
  const content = normalizeMessage(message);
  if (!content) {
    throw new Error("Message vide.");
  }

  // Les en-têtes se construisent **avant** le contexte : rien de ce que sait le
  // projet n'est même assemblé tant qu'on n'a pas de quoi signer l'envoi.
  const headers = assistHeaders(await resolveAccessToken());

  // La mémoire se lit ici, à chaque envoi : une mémoire lue une fois puis
  // gardée en cache répondrait avec la valeur d'avant la correction qu'on vient
  // justement de verser.
  const context = await buildAssistContext();
  const payload = {
    channel: "project_copilot",
    user_message: content,
    history: historyForPayload(),
    context
  };

  const response = await fetch(ASSIST_LLM_URL_PROD, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Webhook assistant en erreur (${response.status})${text ? ` — ${text.slice(0, 220)}` : ""}`);
  }

  const data = await response.json().catch(() => null);
  return {
    raw: data,
    reply: parseAssistantReply(data),
    context
  };
}
