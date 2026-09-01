/**
 * L'unique porte vers le copilote.
 *
 * ## Le webhook n8n est parti
 *
 * La question partait vers un webhook n8n public. Deux
 * choses qu'aucun code servi au navigateur ne pouvait corriger :
 *
 *  - n'importe qui connaissant l'URL pouvait déclencher un appel payant ;
 *  - rien ne vérifiait que le demandeur avait le droit de lire le projet dont
 *    il envoyait la mémoire.
 *
 * L'appel passe désormais par notre propre fonction, `project-copilot`, à côté
 * des autres fonctions de Mdall. Elle exige un jeton porteur qui désigne un
 * utilisateur réel, puis **relit le projet avec ce jeton** : c'est RLS qui
 * décide, pas nous. Un jeton envoyé à un tiers ne prouvait rien tant que le
 * tiers ne le vérifiait pas ; maintenant, le destinataire est à nous.
 *
 * ## Ce qui part avec la question
 *
 * La mémoire du projet, mise en ordre par `memory-briefing.js`, et l'état de
 * l'écran — séparés, et étiquetés comme tels : le second dit ce qu'on regarde,
 * jamais ce qui est vrai.
 *
 * ## Ce qui ne revient jamais
 *
 * Rien n'est enregistré, ni ici ni côté serveur. Une conversation avec le
 * copilote est privée, et « privée » ne peut pas être une intention : c'est une
 * propriété de la construction. Voir `copilote-conversations.js`.
 */

import { store } from "../store.js";
import { buildAssistContext } from "./copilote-context.js";
import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import { resolveCurrentBackendProjectId } from "./project-supabase-sync.js";

const COPILOTE_FN_URL = `${getSupabaseUrl()}/functions/v1/project-copilot`;

function normalizeMessage(message) {
  return String(message || "").trim();
}

/**
 * Combien d'échanges repartent avec la question.
 *
 * Douze au départ, sans raison mesurée — et une conversation un peu longue
 * perdait son début : le copilote redemandait ce qu'on venait de lui dire. La
 * fonction en accepte quarante, et c'est elle qui tient la limite réelle contre
 * la fenêtre du modèle. Ici on s'aligne, on ne raccourcit pas une deuxième fois.
 */
const HISTORIQUE_MAX = 40;

function historyForPayload() {
  const all = Array.isArray(store.ui?.assistant?.messages)
    ? store.ui.assistant.messages
    : [];

  return all.slice(-HISTORIQUE_MAX).map((msg) => ({
    role: msg.role,
    content: msg.content
  }));
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * La réponse, quelle que soit la forme qu'elle prenne.
 *
 * Notre fonction rend `reply_markdown` ; les autres formes restent acceptées
 * pour qu'un changement de format côté serveur n'affiche pas un objet JSON à la
 * place d'une réponse.
 */
function parseAssistantReply(data) {
  if (!data) return "";
  if (typeof data === "string") return data.trim();
  if (typeof data.reply_markdown === "string" && data.reply_markdown.trim()) return data.reply_markdown.trim();
  if (typeof data.reply === "string" && data.reply.trim()) return data.reply.trim();
  if (typeof data.message === "string" && data.message.trim()) return data.message.trim();
  return "";
}

/**
 * Le décompte de jetons, tel que le modèle l'a rendu.
 *
 * Rien n'est estimé à partir de la longueur du texte : une estimation
 * ressemblerait à une mesure, et on lit un compteur pour décider. Absent quand
 * le modèle ne l'a pas dit.
 */
function parseUsage(data) {
  const nombre = (valeur) => (typeof valeur === "number" && Number.isFinite(valeur) ? valeur : null);
  const usage = data?.usage ?? null;

  return {
    inputTokens: nombre(usage?.input_tokens),
    outputTokens: nombre(usage?.output_tokens),
    totalTokens: nombre(usage?.total_tokens)
  };
}

export async function sendAssistMessage(message, { signal = null } = {}) {
  const content = normalizeMessage(message);
  if (!content) {
    throw new Error("Message vide.");
  }

  // Les en-têtes se construisent **avant** le contexte : rien de ce que sait le
  // projet n'est même assemblé tant qu'on n'a pas de quoi signer l'envoi.
  // `buildSupabaseAuthHeaders` jette quand la session manque — un envoi anonyme
  // n'est pas un repli acceptable, c'est une erreur.
  const headers = await buildSupabaseAuthHeaders({
    Accept: "application/json",
    "Content-Type": "application/json"
  });

  // L'identifiant de route n'est pas celui de la base : les confondre ferait
  // refuser l'appel côté serveur, ce qui est au moins visible.
  const projectId = (await resolveCurrentBackendProjectId().catch(() => "")) || "";
  if (!projectId) {
    throw new Error("Ce projet n'est pas encore relié à la base : le copilote ne peut pas savoir de quoi vous parlez.");
  }

  // La mémoire se lit à chaque envoi : gardée en cache, elle répondrait avec la
  // valeur d'avant la correction qu'on vient justement de verser.
  const context = await buildAssistContext();

  const response = await fetch(COPILOTE_FN_URL, {
    method: "POST",
    headers,
    cache: "no-store",
    // Renoncer à une réponse doit couper l'appel, pas seulement cesser de
    // l'attendre : un bouton d'arrêt qui laisse la requête vivre sa vie ment
    // sur ce qu'il fait, et la réponse arriverait dans le fil suivant.
    signal,
    body: JSON.stringify({
      project_id: projectId,
      question: content,
      history: historyForPayload(),
      memory: { lue: context.memoire?.lue === true, texte: context.memoire?.texte || "" },
      // L'écran part à part de la mémoire, et sous son propre nom : les mêler
      // ferait passer un filtre pour une vérité du projet.
      screen: { app: context.app, subjects: context.subjects, project_form: context.project_form }
    })
  });

  const text = await response.text().catch(() => "");
  const data = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    const detail = typeof data?.error === "string" && data.error.trim()
      ? data.error.trim()
      : text || `HTTP ${response.status}`;
    throw new Error(`Le copilote n'a pas répondu. ${detail}`.trim());
  }

  const reply = parseAssistantReply(data);
  if (!reply) {
    throw new Error("Le copilote a répondu, mais sans contenu.");
  }

  return { raw: data, reply, context, usage: parseUsage(data) };
}
