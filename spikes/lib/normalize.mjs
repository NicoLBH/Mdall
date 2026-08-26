/**
 * Normalisations partagées par les spikes.
 *
 * Règle non négociable : toute normalisation est *dérivée*. La valeur brute
 * doit toujours rester conservée à côté (principe SOURCE / INTERPRÉTATION).
 *
 * Toutes les fonctions de ce module sont idempotentes : f(f(x)) === f(x).
 * Cette propriété est vérifiée par normalize.test.mjs.
 */

/** Retire les espaces de bord et réduit toute suite d'espaces à un espace. */
export function normalizeWhitespace(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

/** Retire les diacritiques (é -> e) sans changer la casse. */
export function stripDiacritics(value) {
  if (value === null || value === undefined) return "";
  return String(value).normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Clé de comparaison pour un texte libre : espaces réduits, sans accent,
 * en minuscules. Sert au rapprochement, jamais à l'affichage.
 */
export function normalizeTextKey(value) {
  return stripDiacritics(normalizeWhitespace(value)).toLowerCase();
}

/**
 * Clé de comparaison pour une référence métier ("Avis n° 65", "OBS-65").
 * Volontairement conservatrice : elle n'essaie pas de deviner le numéro,
 * elle se contente d'unifier casse, accents et séparateurs.
 */
export function normalizeReferenceKey(value) {
  const base = stripDiacritics(normalizeWhitespace(value)).toUpperCase();
  return base
    .replace(/[\s._/\\]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Confiance normalisée dans [0, 1].
 * Une confiance inconnue vaut `null` — jamais 0 : « je ne sais pas »
 * n'est pas « je suis certain que non ».
 */
export function normalizeConfidence(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (numeric < 0) return 0;
  if (numeric > 1) return 1;
  return numeric;
}

/** Horodatage compact et triable, utilisé pour les identifiants de run. */
export function slugifyTimestamp(date) {
  const iso = (date instanceof Date ? date : new Date(date)).toISOString();
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** Slug de système de fichiers sûr pour un identifiant de cas. */
export function slugifyIdentifier(value) {
  const base = stripDiacritics(normalizeWhitespace(value)).toLowerCase();
  return base
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "sans-id";
}
