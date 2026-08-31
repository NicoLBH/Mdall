/**
 * Condensé SHA-256 d'un texte, en hexadécimal.
 *
 * Deux usages aujourd'hui — l'empreinte d'un PDF extrait et l'identité d'un
 * document — qui n'ont aucune raison de dépendre l'un de l'autre. Un troisième
 * s'ajoute avec les figures découpées dans les rapports, et il porte sur des
 * octets et non sur du texte : d'où les deux fonctions.
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

/**
 * Condensé SHA-256 d'une suite d'octets.
 *
 * Le pendant du précédent pour ce qui n'est pas du texte — l'image découpée
 * dans une page de rapport. Encoder ces octets comme une chaîne les abîmerait :
 * deux découpes différentes finiraient avec la même empreinte, et l'une
 * effacerait l'autre.
 */
export async function sha256HexBytes(bytes) {
  if (!globalThis.crypto?.subtle) return null;
  const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes ?? []);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", source);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
