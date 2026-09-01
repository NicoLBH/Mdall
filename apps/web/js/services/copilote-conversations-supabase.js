/**
 * Les discussions du copilote, en base.
 *
 * Elles vivaient dans le navigateur. La garantie était simple — ce qui n'est
 * jamais écrit ne fuit pas — mais elle se payait d'une discussion perdue à
 * chaque changement de poste. Elles passent en base, et la garantie change de
 * nature : elle repose désormais sur la politique de sécurité des tables, qui
 * est **propriétaire seul** dans les deux sens (on ne lit que les siennes, on
 * n'en écrit que pour soi). Le détail est dans la migration.
 *
 * Ce fichier est la seule porte. Il n'expose aucune lecture « par projet » ni
 * « par équipe » : la seule question qu'on peut lui poser est « les miennes,
 * sur ce projet ». Une fonction qui rendrait celles des autres serait refusée
 * par la base, mais elle n'aurait rien à faire ici de toute façon.
 *
 * ## Une écriture qui échoue se dit
 *
 * Le fil reste à l'écran — la conversation continue — mais l'appelant reçoit un
 * refus, et l'écran le signale. Une sauvegarde silencieusement perdue est pire
 * qu'une sauvegarde refusée : on découvre l'absence le lendemain.
 */

import { supabase } from "../../assets/js/auth.js";

function texte(valeur) {
  return String(valeur ?? "").trim();
}

/** Ce que la base rend, dans la forme que l'écran attend. */
function versConversation(ligne, messages = []) {
  return {
    id: texte(ligne?.id),
    projectId: texte(ligne?.project_id),
    title: texte(ligne?.title),
    startedAt: texte(ligne?.created_at),
    updatedAt: texte(ligne?.updated_at) || texte(ligne?.created_at),
    messages
  };
}

function versMessage(ligne) {
  return {
    id: texte(ligne?.id),
    role: ligne?.role === "user" ? "user" : "assistant",
    content: String(ligne?.content ?? ""),
    ts: texte(ligne?.created_at),
    tokensIn: Number.isFinite(ligne?.tokens_in) ? ligne.tokens_in : null,
    tokensOut: Number.isFinite(ligne?.tokens_out) ? ligne.tokens_out : null
  };
}

/**
 * Mes discussions sur ce projet, la plus récemment touchée en tête.
 *
 * Les messages viennent avec : le rail affiche un titre tiré de la première
 * question, et une seconde requête par discussion pour l'obtenir coûterait plus
 * cher que de tout lire d'un coup.
 */
export async function listConversations(projectId) {
  const projet = texte(projectId);
  if (!projet) return [];

  const { data: conversations, error } = await supabase
    .from("copilot_conversations")
    .select("id,project_id,title,created_at,updated_at")
    .eq("project_id", projet)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  const lignes = Array.isArray(conversations) ? conversations : [];
  if (lignes.length === 0) return [];

  const { data: messages, error: erreurMessages } = await supabase
    .from("copilot_messages")
    .select("id,conversation_id,role,content,tokens_in,tokens_out,created_at")
    .in("conversation_id", lignes.map((ligne) => ligne.id))
    .order("created_at", { ascending: true });

  if (erreurMessages) throw new Error(erreurMessages.message);

  const parConversation = new Map(lignes.map((ligne) => [texte(ligne.id), []]));
  for (const message of Array.isArray(messages) ? messages : []) {
    parConversation.get(texte(message.conversation_id))?.push(versMessage(message));
  }

  return lignes.map((ligne) => versConversation(ligne, parConversation.get(texte(ligne.id)) ?? []));
}

/**
 * Ouvrir une discussion.
 *
 * Elle n'est créée qu'au premier message : une discussion vide n'a rien à
 * conserver, et le rail se remplirait de lignes sans titre à chaque fois qu'on
 * clique sur « nouvelle discussion » sans rien demander.
 */
export async function createConversation(projectId) {
  const projet = texte(projectId);
  if (!projet) throw new Error("Aucun projet.");

  const { data, error } = await supabase
    .from("copilot_conversations")
    .insert({ project_id: projet })
    .select("id,project_id,title,created_at,updated_at")
    .single();

  if (error) throw new Error(error.message);
  return versConversation(data, []);
}

/** Ajouter un message, et marquer la discussion comme touchée. */
export async function appendMessage(conversationId, message) {
  const conversation = texte(conversationId);
  if (!conversation) throw new Error("Aucune discussion.");

  const { data, error } = await supabase
    .from("copilot_messages")
    .insert({
      conversation_id: conversation,
      role: message?.role === "user" ? "user" : "assistant",
      content: String(message?.content ?? ""),
      // Nul quand le modèle ne l'a pas dit. Zéro serait un chiffre, et on ne
      // fabrique pas les chiffres d'un compteur.
      tokens_in: Number.isFinite(message?.tokensIn) ? message.tokensIn : null,
      tokens_out: Number.isFinite(message?.tokensOut) ? message.tokensOut : null
    })
    .select("id,conversation_id,role,content,tokens_in,tokens_out,created_at")
    .single();

  if (error) throw new Error(error.message);

  // La date de dernière touche fait l'ordre du rail : sans elle, une discussion
  // reprise ce matin resterait au fond de la liste.
  await supabase
    .from("copilot_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation);

  return versMessage(data);
}

/**
 * Renommer.
 *
 * Un nom vide **efface** le nom au lieu d'enregistrer une chaîne vide : la
 * discussion reprend alors son titre naturel, sa première question. Une ligne
 * sans nom vaut mieux qu'une ligne nommée « ».
 */
export async function renameConversation(conversationId, title) {
  const conversation = texte(conversationId);
  if (!conversation) throw new Error("Aucune discussion.");

  const nom = texte(title).slice(0, 120);
  const { error } = await supabase
    .from("copilot_conversations")
    .update({ title: nom || null, updated_at: new Date().toISOString() })
    .eq("id", conversation);

  if (error) throw new Error(error.message);
  return nom;
}

/**
 * Effacer, pour de bon.
 *
 * Les messages partent avec la discussion — c'est la cascade déclarée dans la
 * migration. Effacer la ligne en laissant les messages derrière donnerait une
 * suppression de façade, ce qui est exactement le contraire de ce qu'on promet
 * à quelqu'un qui efface une conversation privée.
 */
export async function deleteConversation(conversationId) {
  const conversation = texte(conversationId);
  if (!conversation) throw new Error("Aucune discussion.");

  const { error } = await supabase
    .from("copilot_conversations")
    .delete()
    .eq("id", conversation);

  if (error) throw new Error(error.message);
}
