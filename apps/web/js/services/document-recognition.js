/**
 * Reconnaître ce qu'est un document, sans savoir ce qu'il peut y en avoir.
 *
 * Mdall recevra demain des comptes rendus de chantier, des notices de
 * sécurité et d'accessibilité, des notices de vente, des plans d'architecte,
 * des plans de béton armé — et l'ambition est qu'un simple courriel suffise à
 * les y faire entrer. Si chaque nature de document impose son cas particulier
 * dans la gestion documentaire, celle-ci devient ingérable au troisième type.
 *
 * Ce module ne connaît donc aucune nature de document. Il interroge des
 * reconnaisseurs, et chacun se déclare. Ajouter les comptes rendus de chantier
 * n'obligera pas à toucher une ligne d'ici.
 *
 * Trois refus, parce qu'ils n'appellent pas la même action :
 *
 *  - **aucun texte** : le PDF est une image, il faudrait une reconnaissance
 *    optique. C'est une impossibilité technique, pas un jugement sur le
 *    document ;
 *  - **aucun émetteur reconnu** : personne ne réclame ce document ;
 *  - **reconnu, sans contenu exploitable** : on sait ce que c'est, et il n'y
 *    a simplement rien à en tirer. Une attestation ou une fiche de
 *    correspondance sont dans ce cas — ce n'est pas un défaut, et le
 *    confondre avec un rejet ferait écarter des pièces légitimes du dossier.
 */

export const RECOGNITION = {
  /** Reconnu, et il y a de quoi l'exploiter. */
  RECOGNIZED: "RECOGNIZED",
  /** Reconnu, mais ce livrable ne porte rien d'exploitable. */
  RECOGNIZED_WITHOUT_CONTENT: "RECOGNIZED_WITHOUT_CONTENT",
  /** Du texte, mais aucun reconnaisseur ne le réclame. */
  UNRECOGNIZED: "UNRECOGNIZED",
  /** Pas de couche de texte : rien à lire. */
  NO_TEXT_LAYER: "NO_TEXT_LAYER"
};

export const CONFIDENCE = {
  /** L'émetteur est nommé et le livrable identifié : il n'y a pas de doute. */
  CERTAIN: "certain",
  /** Assez d'indices pour le dire, pas assez pour l'affirmer. */
  PROBABLE: "probable"
};

const RANK = { [CONFIDENCE.CERTAIN]: 2, [CONFIDENCE.PROBABLE]: 1 };

const NO_TEXT_REASON =
  "Ce PDF ne contient aucun texte : il a probablement été numérisé. " +
  "Une reconnaissance optique serait nécessaire pour le lire.";

const UNRECOGNIZED_REASON =
  "Aucun émetteur reconnu dans ce document. Il ne semble pas être un livrable " +
  "que Mdall sache exploiter aujourd'hui.";

/** Le texte du document, qu'on le donne d'un bloc ou page par page. */
function joinText({ text = "", pages = [] }) {
  if (String(text).trim() !== "") return String(text);
  return pages.map((page) => String(page?.text ?? "")).join("\n");
}

/**
 * Soumet un document à des reconnaisseurs et rend un verdict unique.
 *
 * Un reconnaisseur rend `null` quand il ne réclame pas le document : c'est le
 * cas courant, et il ne doit pas avoir à s'en justifier. Quand plusieurs le
 * réclament, la certitude tranche, puis l'ordre d'enregistrement — jamais le
 * hasard.
 *
 * @param {{pages?: object[], text?: string, filename?: string, mimeType?: string}} document
 * @param {{recognizers?: object[]}} options
 */
export function recognizeDocument(document = {}, { recognizers = [] } = {}) {
  const text = joinText(document);
  const filename = String(document.filename ?? "");
  const mimeType = String(document.mimeType ?? "");
  const pages = Array.isArray(document.pages) ? document.pages : [];

  if (text.trim() === "") {
    return verdict({ status: RECOGNITION.NO_TEXT_LAYER, reason: NO_TEXT_REASON });
  }

  const claims = [];
  for (const recognizer of recognizers) {
    // Un reconnaisseur qui échoue ne doit pas emporter les autres avec lui :
    // le document reste lisible par quelqu'un d'autre.
    let claim = null;
    try {
      claim = recognizer.recognize({ text, pages, filename, mimeType });
    } catch {
      claim = null;
    }
    if (claim) claims.push({ ...claim, recognizer });
  }

  if (claims.length === 0) {
    return verdict({ status: RECOGNITION.UNRECOGNIZED, reason: UNRECOGNIZED_REASON });
  }

  claims.sort((a, b) => (RANK[b.confidence] ?? 0) - (RANK[a.confidence] ?? 0));
  const best = claims[0];

  return verdict({
    status: best.exploitable === false ? RECOGNITION.RECOGNIZED_WITHOUT_CONTENT : RECOGNITION.RECOGNIZED,
    reason: best.note ?? "",
    kind: best.kind ?? null,
    kindLabel: best.kindLabel ?? null,
    kindLabelPlural: best.kindLabelPlural ?? best.kindLabel ?? null,
    author: best.author ?? null,
    authorLabel: best.authorLabel ?? null,
    confidence: best.confidence ?? null,
    evidence: best.evidence ?? null,
    declaredReference: best.declaredReference ?? null,
    issuedAt: best.issuedAt ?? null,
    markers: best.markers ?? [],
    recognizer: best.recognizer.id,
    recognizerVersion: best.recognizer.version ?? null
  });
}

function verdict(fields) {
  return {
    status: null,
    kind: null,
    kindLabel: null,
    kindLabelPlural: null,
    author: null,
    authorLabel: null,
    confidence: null,
    reason: "",
    // Ce qui a permis de l'affirmer : la ligne, et la page où elle se trouve.
    // Un verdict sans preuve ne vaut pas mieux qu'une intuition.
    evidence: null,
    declaredReference: null,
    issuedAt: null,
    // Ce que le document dit de son appartenance — un numéro d'affaire, demain
    // un nom d'opération. Le registre ne les interprète pas : il les transporte,
    // et c'est `project-identity.js` qui les confronte à la mémoire du projet.
    markers: [],
    recognizer: null,
    recognizerVersion: null,
    ...fields
  };
}

/** Vrai si le document a de quoi être exploité par un atelier. */
export function isExploitable(recognition) {
  return recognition?.status === RECOGNITION.RECOGNIZED;
}
