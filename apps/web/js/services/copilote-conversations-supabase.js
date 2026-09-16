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
 * « par équipe » : les seules questions qu'on peut lui poser sont « les
 * miennes, sur ce projet », « les miennes, sur aucun projet » et « où et quand
 * ai-je discuté ». Toutes commencent par *les miennes*. Une fonction qui
 * rendrait celles des autres serait refusée par la base, mais elle n'aurait
 * rien à faire ici de toute façon.
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
 * Où j'ai discuté, et quand — **sans un seul message**.
 *
 * L'accueil classe mes projets par le nombre de jours où j'y ai fait quelque
 * chose, et une discussion en est une trace. Il lui faut donc le projet et la
 * date, plus le titre pour nommer la ligne de la timeline. **Pas le contenu** :
 * il n'en a aucun usage, et ce qui ne sort pas d'ici ne peut pas fuir.
 *
 * Passer par cette porte plutôt que d'interroger la table depuis l'accueil
 * n'est pas une politesse : la cloison le vérifie, et c'est elle qui garantit
 * qu'on sait, à un seul endroit, tout ce qui est lu de ces deux tables.
 *
 * **Celles qui portent un projet.** Une discussion « Tous les projets » n'en
 * désigne aucun : la compter quelque part reviendrait à lui inventer une place.
 *
 * @param {object} [options]
 * @param {number} [options.auPlus] de quoi classer, pas une archive
 * @returns {Promise<{projectId: string, title: string, updatedAt: string}[]>}
 */
export async function listerMesTracesDeDiscussion({ auPlus = 300 } = {}) {
  const { data, error } = await supabase
    .from("copilot_conversations")
    .select("project_id,title,updated_at")
    .not("project_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(Math.max(1, auPlus));

  if (error) throw new Error(error.message || "Lecture impossible.");

  return (Array.isArray(data) ? data : []).map((ligne) => ({
    projectId: texte(ligne?.project_id),
    title: texte(ligne?.title),
    updatedAt: texte(ligne?.updated_at)
  }));
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

  // **`null` demande celles qui ne sont d'aucun projet**, et `""` reste une
  // absence de réponse — on ne sait pas de quel projet on parle, on ne rend
  // rien. Les confondre ferait montrer les discussions transversales sur
  // l'écran d'un projet qui n'a pas fini de se résoudre.
  const sansProjet = projectId === null;
  if (!projet && !sansProjet) return [];

  const demande = supabase
    .from("copilot_conversations")
    .select("id,project_id,title,created_at,updated_at");

  const { data: conversations, error } = await (sansProjet
    ? demande.is("project_id", null)
    : demande.eq("project_id", projet))
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
  // Même règle qu'à la lecture : `null` est une demande, `""` est une ignorance.
  if (!projet && projectId !== null) throw new Error("Aucun projet.");

  const { data, error } = await supabase
    .from("copilot_conversations")
    .insert({ project_id: projet || null })
    .select("id,project_id,title,created_at,updated_at")
    .single();

  if (error) throw new Error(error.message);

  // Une insertion qui ne rend aucune ligne laisserait un identifiant vide, et
  // le message suivant échouerait sur « aucune discussion » — un symptôme qui
  // ne nomme pas sa cause. On s'arrête ici, en la nommant.
  const creee = versConversation(data, []);
  if (!creee.id) throw new Error("La discussion n'a pas pu être créée en base.");
  return creee;
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
