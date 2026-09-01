/**
 * Les discussions avec le copilote, et leur suite.
 *
 * Un fil unique qu'on écrase à chaque nouvelle question n'est pas une
 * conversation : c'est un bloc-notes. Or la valeur d'un copilote de projet
 * tient beaucoup à ce qu'on puisse revenir sur ce qu'il a dit la semaine
 * dernière — « il avait proposé quoi, pour la reprise en sous-œuvre ? ». D'où
 * une liste : la discussion en cours, et celles d'avant.
 *
 * ## Elles sont privées, et ce n'est pas une intention
 *
 * Une conversation avec le copilote n'est **jamais** partagée avec les autres
 * intervenants du projet. On y essaie des questions, on y dit ce qu'on ne sait
 * pas, on y prépare ce qu'on n'assume pas encore : un produit qui laisserait
 * fuir cela une seule fois serait discrédité, et à juste titre.
 *
 * « Privé » ne peut donc pas être une intention — ce doit être une propriété de
 * la construction. Trois choses la tiennent :
 *
 *  1. **Rien n'est envoyé à une table.** Ni ici, ni dans la fonction
 *     `project-copilot`, qui n'a ni client de service, ni `insert`. Ce qui n'est
 *     jamais écrit ne peut pas fuir par une politique RLS mal posée, ni
 *     apparaître dans un fil de sujet, ni sortir avec un export de projet.
 *  2. **La clé de stockage porte l'utilisateur autant que le projet.** Deux
 *     comptes sur le même navigateur ne se lisent pas l'un l'autre — et c'est un
 *     cas ordinaire : un poste partagé sur un chantier.
 *  3. **La déconnexion efface.** Sortir de l'application ne doit pas laisser ses
 *     questions derrière soi pour le suivant.
 *
 * Un test (`copilote-cloison.test.mjs`) vérifie qu'aucun module du copilote
 * n'importe une porte de partage, et réciproquement. Une règle qu'on écrit dans
 * un commentaire se perd ; une règle qui casse la construction, non.
 *
 * ## Ce que cela coûte
 *
 * Ces discussions ne suivent pas d'un poste à l'autre, et un vidage du
 * navigateur les emporte. C'est le prix d'une conversation qui ne fuit pas, et
 * il est assumé. Ce qu'un copilote a répondu n'a d'ailleurs **pas été tranché**
 * — personne ne l'a décidé, rien ne s'y appuie ; le ranger à côté d'une
 * contrainte réglementaire serait une faute de nature autant qu'un risque.
 *
 * ## Ce que ce fichier ne fait pas
 *
 * Il ne titre pas les discussions à l'aide du modèle. Un titre inventé par le
 * copilote lui-même serait joli et invérifiable ; la première question posée,
 * elle, est ce que l'utilisateur reconnaîtra.
 */

/**
 * Le préfixe des clés de stockage.
 *
 * La version est passée à `v2` parce que la clé a changé de forme : elle porte
 * maintenant l'utilisateur. Les entrées `v1`, écrites sans lui, ne sont pas
 * relues — elles pourraient appartenir à quelqu'un d'autre, et rien dans leur
 * contenu ne permettrait de le dire. `purgeConversations` les efface.
 */
export const CONVERSATIONS_KEY_PREFIX = "mdall.copiloteConversations.v2";

/** L'ancienne forme, sans utilisateur. Conservée pour savoir quoi effacer. */
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
 * Le titre d'une discussion : sa première question.
 *
 * Pas la première réponse — une réponse commence rarement par ce dont elle
 * parle. Coupé, il l'est sur un mot entier quand c'est possible : un titre
 * tranché au milieu d'un mot se lit deux fois.
 */
export function conversationTitle(conversation) {
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
 * La clé d'un stockage : l'utilisateur **et** le projet.
 *
 * L'utilisateur d'abord, parce que c'est lui qui rend la conversation privée.
 * Une clé sans lui laisserait le compte suivant, sur le même navigateur, relire
 * les questions du précédent — un poste partagé sur un chantier est la règle,
 * pas l'exception.
 *
 * Sans utilisateur connu, on écrit sous `anonyme` : c'est un compartiment de
 * plus, jamais un fourre-tout commun.
 */
export function conversationsKey(userKey, projectKey) {
  const utilisateur = texte(userKey) || "anonyme";
  const projet = texte(projectKey) || "sans-projet";
  return `${CONVERSATIONS_KEY_PREFIX}.${utilisateur}.${projet}`;
}

/** Les discussions d'un utilisateur sur un projet, ou une liste vide. */
export function loadConversations(userKey, projectKey) {
  try {
    return parseConversations(window.localStorage.getItem(conversationsKey(userKey, projectKey)));
  } catch {
    return [];
  }
}

/** Les enregistrer. Un stockage indisponible ne fait pas échouer l'écran. */
export function saveConversations(userKey, projectKey, conversations) {
  try {
    window.localStorage.setItem(conversationsKey(userKey, projectKey), JSON.stringify(conversations ?? []));
  } catch {
    // Navigation privée, quota atteint : la discussion se poursuit, elle ne se
    // retrouvera simplement pas demain.
  }
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
 * Tout effacer. Appelé à la déconnexion.
 *
 * Sortir de l'application ne doit pas laisser ses questions derrière soi pour
 * le suivant. On efface tout, pas seulement les siennes : à ce moment-là, on ne
 * sait déjà plus de façon sûre qui était là.
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
