/**
 * Ce que le copilote doit prouver avant de parler.
 *
 * La requête partait sans en-tête d'authentification : un `POST` anonyme vers
 * un webhook public. Tant que le contexte envoyé se réduisait à l'état d'un
 * écran — un onglet, un filtre, un numéro de page — la fuite restait mince.
 * Elle cesse de l'être au moment où l'on y attache la mémoire d'un projet :
 * des hypothèses, des contraintes réglementaires, des constats datés, tous
 * rattachés à un chantier réel et à un client.
 *
 * ## Ce que ce fichier règle, et ce qu'il ne règle pas
 *
 * Il règle le **départ** : le navigateur ne parle plus sans dire qui il est, et
 * refuse d'envoyer quoi que ce soit s'il ne peut pas le dire. Une session
 * absente ou périmée n'est pas une requête anonyme de plus, c'est une erreur.
 *
 * Il ne règle pas l'**arrivée** : un webhook public reste joignable par
 * n'importe qui, et aucune ligne de code servie au navigateur ne peut
 * l'empêcher — un secret embarqué dans du JavaScript n'est pas un secret. Le
 * jeton envoyé ici n'a de valeur que si le workflow n8n le vérifie et refuse ce
 * qui n'est pas signé. Le dire est plus utile que de l'oublier : la moitié
 * client d'une authentification donne un sentiment de sûreté, pas la sûreté.
 *
 * ## Pourquoi le jeton Supabase, et rien d'autre
 *
 * C'est le seul élément que le porteur ne peut pas fabriquer et que le
 * destinataire peut vérifier seul, contre les clés publiques du projet. Écrire
 * l'identité dans le corps du message — un nom, un courriel — reviendrait à
 * laisser le client se présenter lui-même : une affirmation, pas une preuve.
 * L'identité se lit dans le jeton, côté serveur.
 *
 * Ce fichier ne connaît ni Supabase ni le réseau : il reçoit une session et
 * rend des en-têtes. C'est ce qui permet de vérifier par un test qu'un jeton
 * vide ne passe jamais.
 */

/** Ce qu'on dit à qui n'a plus de session. Une phrase, et la marche à suivre. */
export const ASSIST_AUTH_MISSING =
  "Session expirée : reconnectez-vous avant de parler au copilote.";

/** La marge avant expiration : un jeton qui meurt en vol vaut un jeton absent. */
export const ASSIST_TOKEN_MARGIN_MS = 60_000;

/**
 * Le jeton est-il trop vieux pour partir ?
 *
 * `expires_at` est en secondes — la confusion avec des millisecondes rendrait
 * tout jeton éternel, ce qui est exactement la panne qu'on ne verrait jamais.
 * Une session sans échéance connue n'est pas déclarée périmée : on ne sait pas,
 * et prétendre le contraire ferait renouveler à chaque message.
 */
export function isTokenStale(session, { now = Date.now(), marginMs = ASSIST_TOKEN_MARGIN_MS } = {}) {
  const secondes = Number(session?.expires_at || 0);
  if (!secondes) return false;
  return (secondes * 1000) - now <= marginMs;
}

/**
 * Les en-têtes de la requête, ou rien.
 *
 * La fonction **jette** au lieu de rendre des en-têtes incomplets : c'est le
 * seul moyen d'être sûr qu'aucun appelant ne parte sans jeton par distraction.
 * Un `Authorization` vide serait accepté par `fetch` et refusé par personne.
 */
export function assistHeaders(accessToken) {
  const jeton = String(accessToken || "").trim();
  if (!jeton) throw new Error(ASSIST_AUTH_MISSING);

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${jeton}`
  };
}
