/**
 * L'identité d'un document ne tient pas à son nom de fichier.
 *
 * « 12_09-10-25 - 74LEREPOSOIR…-Rapport RICT-CT-13860-1025-0114.pdf » et
 * « RICT v4 (copie).pdf » sont le même rapport. Le premier repère est donc ce
 * que le document déclare de lui-même — sa référence, que le lecteur sait déjà
 * lire —, et le second son contenu.
 *
 * **Le contenu, jamais les octets.** La table `documents` porte depuis
 * l'origine un `sha256_hash` du fichier ; il ne peut pas servir ici. Un même
 * rapport ré-exporté, ré-imprimé en PDF ou passé par une autre chaîne d'outils
 * n'a pas les mêmes octets et passerait pour un document nouveau. C'est son
 * texte qui est stable, et c'est de lui qu'on prend l'empreinte.
 *
 * Trois situations, et une seule est un doublon :
 *
 *  - **même empreinte** : le même document, sous un autre nom ;
 *  - **même référence, contenu différent** : une réédition corrigée — une
 *    version 2 qui ne dit pas son nom. On ne tranche pas à la place de
 *    l'utilisateur : les deux sont conservés, et le lien entre eux est
 *    signalé ;
 *  - **le reste** : deux documents distincts.
 *
 * Rien n'est jamais écarté en silence. Un document mis de côté reste visible,
 * avec les deux noms de fichiers et la raison.
 */

import { sha256Hex } from "../utils/sha256.js";

export const IDENTITY = {
  /** Le même document, sous un autre nom. */
  DUPLICATE: "DUPLICATE",
  /** Même référence déclarée, contenu différent : une réédition. */
  REISSUE: "REISSUE",
  /** Rien ne les rapproche. */
  DISTINCT: "DISTINCT"
};

/**
 * Le texte d'un document, réduit à ce qui ne varie pas d'un export à l'autre.
 *
 * Deux exports du même rapport diffèrent par leurs blancs — un retour à la
 * ligne ici, une espace insécable là — sans que rien du fond n'ait bougé. Les
 * réduire à une espace unique suffit à les rapprocher, et ne rapproche rien
 * d'autre : sur un document entier, deux textes distincts ne se rejoignent pas
 * pour si peu.
 */
export function normalizeForFingerprint(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

/** Empreinte du contenu d'un document. `null` si le texte manque. */
export async function contentFingerprint(text) {
  const normalized = normalizeForFingerprint(text);
  if (normalized === "") return null;
  return sha256Hex(normalized);
}

/**
 * Compare un document à un autre, déjà connu.
 *
 * @param {{fingerprint?: string|null, reference?: string|null}} candidate
 * @param {{fingerprint?: string|null, reference?: string|null}} known
 * @returns {{verdict: string, reason: string}}
 */
export function compareDocuments(candidate = {}, known = {}) {
  const sameFingerprint =
    Boolean(candidate.fingerprint) && candidate.fingerprint === known.fingerprint;

  if (sameFingerprint) {
    return {
      verdict: IDENTITY.DUPLICATE,
      reason: "Contenu identique à un document déjà présent : c'est le même, sous un autre nom."
    };
  }

  const sameReference = Boolean(candidate.reference) && candidate.reference === known.reference;

  if (sameReference) {
    // Même référence sans pouvoir comparer les contenus : on ne conclut pas au
    // doublon, car s'y tromper effacerait une correction. On signale, et
    // l'utilisateur tranche.
    return {
      verdict: IDENTITY.REISSUE,
      reason:
        `Même référence qu'un document déjà présent (${candidate.reference}), mais un contenu ` +
        `différent : c'est probablement une réédition corrigée.`
    };
  }

  return { verdict: IDENTITY.DISTINCT, reason: "" };
}

/**
 * Cherche, parmi les documents connus, celui auquel un candidat se rapporte.
 *
 * Un doublon prime sur une réédition : si le même contenu figure déjà quelque
 * part, la question de la réédition ne se pose plus.
 */
export function findRelated(candidate, known = []) {
  let reissue = null;

  for (const document of known) {
    const { verdict, reason } = compareDocuments(candidate, document);
    if (verdict === IDENTITY.DUPLICATE) return { document, verdict, reason };
    if (verdict === IDENTITY.REISSUE && !reissue) reissue = { document, verdict, reason };
  }

  return reissue;
}
