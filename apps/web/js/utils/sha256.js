/**
 * Condensé SHA-256 d'un texte, en hexadécimal.
 *
 * Deux usages aujourd'hui — l'empreinte d'un PDF extrait et l'identité d'un
 * document — qui n'ont aucune raison de dépendre l'un de l'autre.
 *
 * `crypto.subtle` manque dans certains contextes (une page servie sans TLS,
 * un environnement de test dépouillé). On rend alors `null` : ne pas savoir
 * calculer une empreinte est une chose, en inventer une en serait une autre,
 * et deux documents partageraient alors une identité qu'ils n'ont pas.
 */
export async function sha256Hex(text) {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text ?? "")));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
