/**
 * Découverte du vocabulaire d'avis dans le document lui-même.
 *
 * Les rapports de contrôle technique portent leur propre légende, répétée en
 * bas des tableaux :
 *
 *   * F: Favorable , D: Défavorable , S: Suspendu , HM: Hors Mission ,
 *     PM: Pour Mémoire , SO: Sans Objet
 *
 * La lire plutôt que la présumer répond directement au §13 : Mdall exploite
 * d'abord les identités créées par le métier avant d'inventer les siennes.
 * C'est aussi la seule protection sérieuse contre l'invention d'un code : un
 * code absent de la légende du document n'est pas un avis.
 */

import { normalizeWhitespace, stripDiacritics } from "../lib/normalize.mjs";

/** `F: Favorable`, `HM : Hors Mission`, `NC: Non conforme`… */
const PAIR = /\b(?<code>[A-Z]{1,4})\s*:\s*(?<label>[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’\- ]{2,40}?)(?=\s*[,;.]|\s{2,}|$)/g;

/** Une légende contient au moins trois couples : deux, c'est une phrase ordinaire. */
const MIN_PAIRS = 3;

function slugify(label) {
  return stripDiacritics(normalizeWhitespace(label))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * @returns {{codes: {code: string, label: string, id: string}[], lines: string[]}}
 */
export function discoverLegend(text) {
  const byCode = new Map();
  const lines = [];

  for (const rawLine of String(text ?? "").split(/\r?\n/)) {
    const line = normalizeWhitespace(rawLine);
    if (line === "") continue;

    const pairs = [...line.matchAll(PAIR)];
    if (pairs.length < MIN_PAIRS) continue;

    lines.push(line);
    for (const pair of pairs) {
      const code = pair.groups.code;
      const label = normalizeWhitespace(pair.groups.label);
      if (!byCode.has(code)) byCode.set(code, { code, label, id: slugify(label) });
    }
  }

  return { codes: [...byCode.values()], lines };
}

/** Une ligne de légende n'est pas une observation : elle ne doit rien produire. */
export function isLegendLine(line, legendLines) {
  const normalized = normalizeWhitespace(line);
  return legendLines.some((legend) => legend === normalized);
}

/** Convertit la légende découverte en lexique utilisable par le moteur. */
export function legendToLexicon(codes) {
  return codes.map((entry) => ({ id: entry.id, labels: [entry.label, entry.code] }));
}
