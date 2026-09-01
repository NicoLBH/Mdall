/**
 * Les discussions avec le copilote : leur nom, leur ordre, leur forme.
 *
 * Un fil unique qu'on écrase à chaque nouvelle question n'est pas une
 * conversation : c'est un bloc-notes. La valeur d'un copilote de projet tient
 * beaucoup à ce qu'on puisse revenir sur ce qu'il a dit la semaine dernière —
 * « il avait proposé quoi, pour la reprise en sous-œuvre ? ».
 *
 * ## Où elles vivent, et ce qui les protège
 *
 * **En base**, désormais, et plus dans le navigateur. Le stockage local avait
 * une qualité rare — ce qui n'est jamais écrit ne fuit pas — mais il perdait la
 * discussion à chaque changement de poste, et une mémoire de travail qui ne
 * survit pas à la nuit n'en est pas une.
 *
 * La garantie change donc de nature, et il faut le dire franchement : elle ne
 * repose plus sur l'absence d'écriture mais sur **la politique de sécurité des
 * tables**, propriétaire seul dans les deux sens — on ne lit que les siennes,
 * on n'en écrit que pour soi. C'est maintenant la seule chose qui se tient
 * entre une conversation privée et le reste de l'équipe. Le projet rattaché
 * **range** les discussions ; il n'y donne aucun droit.
 *
 * Ce qui n'a pas changé : aucun écran partagé ne les lit, la fonction serveur
 * n'en garde rien, et `copilote-cloison.test.mjs` casse la construction si une
 * porte s'ouvre. Une règle écrite dans un commentaire se perd ; une règle qui
 * casse la construction, non.
 *
 * ## Ce que ce fichier fait
 *
 * Les règles qui ne dépendent ni du réseau ni de l'écran : comment une
 * discussion se nomme, comment la liste s'ordonne, ce qu'on accepte de relire.
 * Les allers-retours avec la base sont dans `copilote-conversations-supabase.js`.
 *
 * Il ne titre pas les discussions à l'aide du modèle : un titre inventé par le
 * copilote serait joli et invérifiable ; la première question posée, elle, est
 * ce que l'utilisateur reconnaîtra.
 */

/**
 * Les préfixes du stockage local — l'ancien logement.
 *
 * Plus rien n'y est écrit. Ils ne subsistent que pour savoir **quoi effacer** :
 * les discussions d'avant la base dorment encore dans les navigateurs qui les
 * ont écrites, et les laisser là serait garder une copie hors de toute
 * politique de sécurité.
 */
export const CONVERSATIONS_KEY_PREFIX = "mdall.copiloteConversations.v2";

/** La toute première forme, sans utilisateur. Elle aussi doit disparaître. */
export const CONVERSATIONS_LEGACY_PREFIX = "mdall.copiloteConversations.v1";

/** Au-delà, la liste ne se lit plus. Les plus anciennes s'effacent d'abord. */
export const CONVERSATIONS_MAX = 30;

/** Ce qu'on affiche tant que rien n'a été demandé. */
export const TITRE_VIDE = "Nouvelle discussion";

const TITRE_LONGUEUR = 52;

function texte(valeur) {
  return String(valeur ?? "").trim();
}

/** Un identifiant qui ne dépend pas de l'horloge seule : deux clics rapides. */
function nouvelIdentifiant(now) {
  const alea = Math.random().toString(36).slice(2, 8);
  return `c${now}-${alea}`;
}

/** Une discussion vide, prête à recevoir la première question. */
export function newConversation({ now = Date.now() } = {}) {
  const quand = new Date(now).toISOString();
  return {
    id: nouvelIdentifiant(now),
    startedAt: quand,
    updatedAt: quand,
    messages: []
  };
}

/**
 * Le titre d'une discussion : le nom qu'on lui a donné, sinon sa première
 * question.
 *
 * Pas la première réponse — une réponse commence rarement par ce dont elle
 * parle. Coupé, il l'est sur un mot entier quand c'est possible : un titre
 * tranché au milieu d'un mot se lit deux fois.
 */
export function conversationTitle(conversation) {
  // Un nom donné l'emporte : c'est une décision, et une décision se conserve.
  const donne = texte(conversation?.title);
  if (donne) return donne;

  const premiere = (Array.isArray(conversation?.messages) ? conversation.messages : [])
    .find((message) => message?.role === "user");

  const brut = texte(premiere?.content).replace(/\s+/g, " ");
  if (!brut) return TITRE_VIDE;
  if (brut.length <= TITRE_LONGUEUR) return brut;

  const coupe = brut.slice(0, TITRE_LONGUEUR);
  const espace = coupe.lastIndexOf(" ");
  return `${espace > TITRE_LONGUEUR / 2 ? coupe.slice(0, espace) : coupe}…`;
}

/** Une discussion sans message n'a rien à retenir : elle ne s'archive pas. */
export function hasContent(conversation) {
  return (Array.isArray(conversation?.messages) ? conversation.messages : []).length > 0;
}

/**
 * La liste après passage de la discussion courante.
 *
 * Elle **remplace** celle du même identifiant plutôt que de s'ajouter : c'est
 * ce qui permet d'appeler cette fonction à chaque message sans empiler trente
 * copies d'un même échange. La plus récemment touchée passe en tête, parce que
 * c'est celle qu'on rouvre.
 */
export function rememberConversation(conversations, conversation, { max = CONVERSATIONS_MAX } = {}) {
  const liste = Array.isArray(conversations) ? conversations : [];
  if (!conversation?.id || !hasContent(conversation)) return liste.slice(0, max);

  const autres = liste.filter((entree) => entree?.id !== conversation.id);
  return [conversation, ...autres].slice(0, max);
}

/** Retirer une discussion, par son identifiant. */
export function forgetConversation(conversations, id) {
  const cle = texte(id);
  return (Array.isArray(conversations) ? conversations : []).filter((entree) => entree?.id !== cle);
}

/** Retrouver une discussion, ou rien — jamais une discussion approchante. */
export function findConversation(conversations, id) {
  const cle = texte(id);
  if (!cle) return null;
  return (Array.isArray(conversations) ? conversations : []).find((entree) => entree?.id === cle) || null;
}

/**
 * Ce qu'on accepte de relire depuis le stockage.
 *
 * Le contenu d'un `localStorage` n'est pas une source sûre : il a pu être écrit
 * par une version précédente, ou à la main. Tout ce qui n'a pas la forme
 * attendue est écarté sans bruit — une liste amputée vaut mieux qu'un écran qui
 * casse au chargement.
 */
export function parseConversations(raw) {
  let brut = null;
  try {
    brut = JSON.parse(String(raw || ""));
  } catch {
    return [];
  }

  if (!Array.isArray(brut)) return [];

  return brut
    .filter((entree) => entree && typeof entree === "object" && texte(entree.id))
    .map((entree) => ({
      id: texte(entree.id),
      startedAt: texte(entree.startedAt) || texte(entree.updatedAt),
      updatedAt: texte(entree.updatedAt) || texte(entree.startedAt),
      messages: (Array.isArray(entree.messages) ? entree.messages : [])
        .filter((message) => message && typeof message === "object" && texte(message.content))
        .map((message) => ({
          role: message.role === "user" ? "user" : "assistant",
          content: String(message.content),
          ts: texte(message.ts)
        }))
    }))
    .filter(hasContent)
    .slice(0, CONVERSATIONS_MAX);
}

/**
 * Les clés à effacer dans un stockage donné.
 *
 * Séparée de l'effacement lui-même pour être vérifiable : c'est la fonction qui
 * décide ce qui part, et on tient à ce qu'elle emporte **toutes** les
 * discussions — celles de tous les comptes et de tous les projets, l'ancienne
 * forme comprise — sans toucher au reste des réglages.
 */
export function conversationKeysIn(keys = []) {
  return (Array.isArray(keys) ? keys : [])
    .map((key) => String(key ?? ""))
    .filter((key) =>
      key.startsWith(`${CONVERSATIONS_KEY_PREFIX}.`)
      || key === CONVERSATIONS_KEY_PREFIX
      || key.startsWith(`${CONVERSATIONS_LEGACY_PREFIX}.`)
      || key === CONVERSATIONS_LEGACY_PREFIX);
}

/**
 * Effacer ce qui reste dans le navigateur. Appelé à la déconnexion.
 *
 * Deux raisons, et la seconde a survécu au passage en base : sortir de
 * l'application ne doit pas laisser ses questions au suivant sur le même poste,
 * et les discussions écrites avant la base doivent finir par disparaître d'un
 * endroit qu'aucune politique de sécurité ne couvre.
 */
export function purgeConversations() {
  try {
    const toutes = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      toutes.push(window.localStorage.key(index));
    }
    for (const cle of conversationKeysIn(toutes)) {
      window.localStorage.removeItem(cle);
    }
  } catch {
    // Sans stockage accessible, il n'y a rien à effacer.
  }
}
