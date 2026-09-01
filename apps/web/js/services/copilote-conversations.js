/**
 * Les discussions avec le copilote, et leur suite.
 *
 * Un fil unique qu'on écrase à chaque nouvelle question n'est pas une
 * conversation : c'est un bloc-notes. Or la valeur d'un copilote de projet
 * tient beaucoup à ce qu'on puisse revenir sur ce qu'il a dit la semaine
 * dernière — « il avait proposé quoi, pour la reprise en sous-œuvre ? ». D'où
 * une liste : la discussion en cours, et celles d'avant.
 *
 * ## Où elles vivent, et ce que cela vaut
 *
 * Dans le navigateur, pour l'instant. Ce n'est pas la mémoire du projet et
 * cela ne prétend pas l'être : ce qu'un copilote a répondu n'a **pas été
 * tranché** — personne ne l'a décidé, rien ne s'y appuie. Le verser dans la
 * mémoire du projet reviendrait à ranger une conversation à côté d'une
 * contrainte réglementaire, et la doctrine dit le contraire : ce qui a été
 * décidé se conserve, le reste est de la matière.
 *
 * La conséquence se dit franchement : ces discussions ne suivent pas d'un poste
 * à l'autre, et un vidage du navigateur les emporte. C'est un choix réversible
 * — les rendre partagées demandera une table et une décision sur qui les lit —
 * et non un oubli.
 *
 * ## Ce que ce fichier ne fait pas
 *
 * Il ne titre pas les discussions à l'aide du modèle. Un titre inventé par le
 * copilote lui-même serait joli et invérifiable ; la première question posée,
 * elle, est ce que l'utilisateur reconnaîtra.
 */

/** Une clé par projet : deux chantiers ne partagent pas leurs conversations. */
export const CONVERSATIONS_KEY_PREFIX = "mdall.copiloteConversations.v1";

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

function cleDe(projectKey) {
  return `${CONVERSATIONS_KEY_PREFIX}.${texte(projectKey) || "sans-projet"}`;
}

/** Les discussions d'un projet, ou une liste vide si le stockage se refuse. */
export function loadConversations(projectKey) {
  try {
    return parseConversations(window.localStorage.getItem(cleDe(projectKey)));
  } catch {
    return [];
  }
}

/** Les enregistrer. Un stockage indisponible ne fait pas échouer l'écran. */
export function saveConversations(projectKey, conversations) {
  try {
    window.localStorage.setItem(cleDe(projectKey), JSON.stringify(conversations ?? []));
  } catch {
    // Navigation privée, quota atteint : la discussion se poursuit, elle ne se
    // retrouvera simplement pas demain.
  }
}
