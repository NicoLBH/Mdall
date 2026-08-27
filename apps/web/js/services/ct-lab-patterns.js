/**
 * Motifs d'extraction éditables depuis le laboratoire.
 *
 * Le cadrage l'exige : aucune nomenclature d'organisme ne doit être présumée.
 * Les motifs par défaut ont été écrits contre une fixture synthétique — ils ne
 * valent donc rien tant qu'ils n'ont pas rencontré de vrais rapports. Cette
 * couche permet de les corriger dans la page, sans redéploiement, en regardant
 * le texte réellement extrait.
 *
 * Format volontairement simple à taper à la main :
 *  - un motif par ligne, expression régulière brute ;
 *  - une entrée de lexique par ligne : `identifiant = libellé | autre libellé`.
 */

/** Groupes nommés que tout motif doit fournir. */
const REQUIRED_GROUP = "reference";
const VALUE_GROUPS = ["rest", "opinion"];

export const DEFAULT_PATTERN_TEXT = [
  "# Un motif par ligne. Groupes nommés attendus : (?<reference>…) et (?<rest>…) ou (?<opinion>…).",
  "# Les lignes vides et celles commençant par # sont ignorées.",
  "^(?<label>avis|observation|obs\\.?|remarque|point|item)\\s*(?:n°|nº|n\\s?o|#)?\\s*(?<reference>[0-9A-Za-z]+(?:[.\\-/][0-9A-Za-z]+)*)\\s*[:\\-–—]\\s*(?<rest>.+)$",
  "^\\|?\\s*(?<reference>[0-9A-Za-z]+(?:[.\\-/][0-9A-Za-z]+)*)\\s*\\|\\s*(?<opinion>[^|]+?)\\s*\\|\\s*(?<rest>[^|]+?)\\s*\\|?\\s*$",
  "# Tableau sans séparateur : « 2.1.3 Défavorable texte ». L'avis doit être une formulation connue,",
  "# sinon toute ligne commençant par un nombre deviendrait un faux avis.",
  "# Les codes courts (F, D, S…) ne figurent pas ici : un code n'est un avis que si la légende du",
  "# document le déclare. La lecture en blocs s'en charge — voir spikes/ct-continuity/legend.mjs.",
  "^(?<reference>[0-9]+(?:[.\\-][0-9A-Za-z]+)+)\\s+(?<opinion>avis favorable|avis défavorable|défavorable|favorable|à préciser|suspendu|sans objet|non levée|non levé|levée|levé|maintenue|maintenu|SO)\\b\\s*[-–—:.]?\\s*(?<rest>.+)$"
].join("\n");

export const DEFAULT_LEXICON_TEXT = [
  "# Un avis par ligne : identifiant = libellé | autre libellé",
  "# L'identifiant sert au rapprochement ; la graphie source est toujours conservée telle quelle.",
  "favorable = avis favorable | favorable",
  "defavorable = avis défavorable | défavorable",
  "a_preciser = à préciser | avis à préciser",
  "suspendu = avis suspendu | suspendu",
  "sans_objet = sans objet",
  "en_attente = dans l'attente | en attente",
  "non_leve = non levée | non levé",
  "leve = levée | levé",
  "maintenu = maintenue | maintenu"
].join("\n");

function meaningfulLines(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), number: index + 1 }))
    .filter((entry) => entry.line !== "" && !entry.line.startsWith("#"));
}

/**
 * @returns {{patterns: {id: string, source: string, flags: string}[], errors: string[]}}
 */
export function parsePatterns(text) {
  const patterns = [];
  const errors = [];

  for (const { line, number } of meaningfulLines(text)) {
    let compiled;
    try {
      compiled = new RegExp(line, "iu");
    } catch (error) {
      errors.push(`ligne ${number} : expression régulière invalide (${error.message})`);
      continue;
    }

    const groups = [...line.matchAll(/\(\?<([A-Za-z][A-Za-z0-9]*)>/g)].map((match) => match[1]);

    if (!groups.includes(REQUIRED_GROUP)) {
      errors.push(`ligne ${number} : il manque le groupe (?<${REQUIRED_GROUP}>…)`);
      continue;
    }
    if (!VALUE_GROUPS.some((group) => groups.includes(group))) {
      errors.push(`ligne ${number} : il manque (?<rest>…) ou (?<opinion>…)`);
      continue;
    }

    patterns.push({ id: `motif-${patterns.length + 1}`, source: compiled.source, flags: "iu" });
  }

  if (patterns.length === 0 && errors.length === 0) {
    errors.push("aucun motif : l'extraction ne peut rien reconnaître.");
  }

  return { patterns, errors };
}

/**
 * @returns {{lexicon: {id: string, labels: string[]}[], errors: string[]}}
 */
export function parseLexicon(text) {
  const lexicon = [];
  const errors = [];
  const seen = new Set();

  for (const { line, number } of meaningfulLines(text)) {
    const separator = line.indexOf("=");
    if (separator === -1) {
      errors.push(`ligne ${number} : format attendu « identifiant = libellé | autre libellé »`);
      continue;
    }

    const id = line.slice(0, separator).trim();
    const labels = line
      .slice(separator + 1)
      .split("|")
      .map((label) => label.trim())
      .filter(Boolean);

    if (id === "") {
      errors.push(`ligne ${number} : identifiant vide`);
      continue;
    }
    if (labels.length === 0) {
      errors.push(`ligne ${number} : aucun libellé pour « ${id} »`);
      continue;
    }
    if (seen.has(id)) {
      errors.push(`ligne ${number} : identifiant « ${id} » déjà défini`);
      continue;
    }

    seen.add(id);
    lexicon.push({ id, labels });
  }

  return { lexicon, errors };
}

/**
 * Construit les paramètres d'extraction du moteur à partir des deux zones de
 * texte. Un lexique vide est accepté : aucun avis ne sera reconnu, et
 * `opinion_raw` restera null — ce qui reste une réponse honnête.
 */
export function buildExtractionParams(patternText, lexiconText) {
  const { patterns, errors: patternErrors } = parsePatterns(patternText);
  const { lexicon, errors: lexiconErrors } = parseLexicon(lexiconText);

  return {
    params: { extraction: { patterns, lexicon } },
    errors: [
      ...patternErrors.map((error) => `Motifs — ${error}`),
      ...lexiconErrors.map((error) => `Lexique — ${error}`)
    ]
  };
}

/**
 * Compte, ligne par ligne, ce que les motifs reconnaissent dans une source.
 * Sert à répondre à la seule question qui compte quand rien ne sort :
 * « mes motifs voient-ils quoi que ce soit dans ce document ? »
 */
export function previewMatches(text, patterns, { limit = 20 } = {}) {
  const compiled = patterns.map((pattern) => ({
    id: pattern.id,
    regex: new RegExp(pattern.source, pattern.flags ?? "iu")
  }));

  const lines = String(text ?? "").split(/\r?\n/);
  const matches = [];
  let matchedCount = 0;

  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (line === "") continue;

    for (const pattern of compiled) {
      const match = pattern.regex.exec(line);
      if (!match?.groups) continue;

      matchedCount += 1;
      if (matches.length < limit) {
        matches.push({
          lineNumber: index + 1,
          line,
          patternId: pattern.id,
          reference: match.groups.reference ?? null
        });
      }
      break;
    }
  }

  return {
    matchedCount,
    nonEmptyLineCount: lines.filter((line) => line.trim() !== "").length,
    samples: matches
  };
}
