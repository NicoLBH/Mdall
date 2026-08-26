/**
 * Pipeline de démonstration du harness — PAS un spike.
 *
 * Il extrait les lignes `ITEM <n> : <texte>` d'une fixture synthétique et
 * illustre les trois comportements attendus de tout pipeline de spike :
 *  - affirmer avec provenance quand la source est claire ;
 *  - s'abstenir (AMBIGUOUS) quand plusieurs candidats se disputent la même clé ;
 *  - ne rien affirmer quand l'information est absente (jamais de conclusion
 *    déduite d'une absence).
 */

import { normalizeReferenceKey, normalizeWhitespace } from "../../lib/normalize.mjs";

const ITEM_LINE = /^ITEM\s+([\wÀ-ÿ]+)\s*:\s*(.+)$/u;

export const demoPipeline = {
  id: "harness-selfcheck-demo",
  version: "0.1.0",
  description: "Extraction naïve de lignes ITEM, utilisée uniquement pour valider le harness.",

  async run({ sources }) {
    const predictions = [];

    for (const source of sources) {
      if (!source.content_available) continue;

      const groups = new Map();

      source.content.split(/\r?\n/).forEach((rawLine) => {
        const match = ITEM_LINE.exec(normalizeWhitespace(rawLine));
        if (!match) return;
        const reference = match[1];
        const key = `${source.source_id}:item-${normalizeReferenceKey(reference).toLowerCase()}`;
        const group = groups.get(key) ?? { reference, excerpts: [], statuses: [] };
        group.excerpts.push(normalizeWhitespace(rawLine));
        group.statuses.push(normalizeWhitespace(match[2]));
        groups.set(key, group);
      });

      for (const [key, group] of groups) {
        if (group.statuses.length > 1) {
          predictions.push({
            key,
            kind: "demo_extraction",
            state: "AMBIGUOUS",
            confidence: null,
            value: null,
            candidates: group.statuses.map((status, index) => ({
              status_raw: status,
              excerpt: group.excerpts[index]
            })),
            provenance: { source_id: source.source_id, page: null, excerpt: group.excerpts[0] },
            rationale: `${group.statuses.length} lignes portent la référence ${group.reference} dans ${source.source_id}`
          });
          continue;
        }

        predictions.push({
          key,
          kind: "demo_extraction",
          state: "PREDICTED",
          confidence: 0.9,
          value: { status_raw: group.statuses[0] },
          provenance: { source_id: source.source_id, page: null, excerpt: group.excerpts[0] },
          rationale: "ligne unique portant cette référence"
        });
      }
    }

    return {
      predictions,
      notes: "Pipeline de démonstration : aucune inférence sur l'absence d'un ITEM dans une source ultérieure."
    };
  }
};

export default demoPipeline;
