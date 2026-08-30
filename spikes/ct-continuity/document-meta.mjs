/**
 * Spike 1 — identité et date d'un document.
 *
 * L'ordre chronologique ne peut pas venir du nom du fichier : déposer
 * 120 rapports d'un coup les trie alphabétiquement, et « 10_… » passe alors
 * avant « 2_… ». Toute la continuité en dépendrait.
 *
 * Les documents, eux, déclarent leur date d'émission et leur référence chrono.
 * On les lit — comme la légende, comme les numéros d'avis.
 */

import { normalizeWhitespace } from "../lib/normalize.mjs";
import { DEFAULT_PACK } from "./packs/index.mjs";

/**
 * Ce qui suit ne dépend d'aucun organisme : n'importe quelle date écrite dans
 * un document français a cette forme. Le reste — le format de la référence
 * chrono, les mots « Date d'émission », la liste des livrables — est du
 * vocabulaire d'émetteur, et vit dans son pack.
 */
const ANY_DATE = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/;

function toIsoDate(day, month, year) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * @returns {{issued_at: string|null, issued_at_source: string, chrono_reference: string|null,
 *            chrono_affaire: string|null, affaire_reference: string|null,
 *            document_type: string|null, document_type_label: string|null,
 *            sheet_number: number|null, version: number|null}}
 */
export function readDocumentMeta(source, { pack = DEFAULT_PACK } = {}) {
  const text = source?.content_available ? source.content : "";
  const head = text.split(/\r?\n/).slice(0, 60).map(normalizeWhitespace).join("\n");

  const emission = pack.emissionDate.exec(text);
  const fallback = emission ? null : ANY_DATE.exec(head);

  const chrono = pack.chrono.exec(text);
  // Cherché dans tout le document, pas seulement dans l'en-tête : une fiche
  // d'examen porte son numéro d'affaire au bas de la centième ligne, quand un
  // rapport l'imprime à la onzième. Le chercher dans les soixante premières
  // faisait qu'un livrable entier ne déclarait rien — et un document qui ne
  // déclare rien ne peut être contredit par personne.
  const affaire = pack.affaireNumber ? pack.affaireNumber.exec(text) : null;
  const sheet = pack.sheetNumber.exec(head);
  const version = pack.documentVersion.exec(head);
  // Le type se lit dans le titre, pas dans le corps : une fiche qui mentionne
  // « notre Rapport Final de Contrôle technique » n'est pas un rapport final.
  const title = text.split(/\r?\n/).map(normalizeWhitespace).filter(Boolean).slice(0, 4).join("\n");
  const type = pack.documentTypes.find((entry) => entry.pattern.test(title)) ?? null;

  return {
    issued_at: emission
      ? toIsoDate(emission[1], emission[2], emission[3])
      : fallback
        ? toIsoDate(fallback[1], fallback[2], fallback[3])
        : null,
    // D'où vient la date : une date déclarée vaut mieux qu'une date devinée,
    // et l'écran doit pouvoir le dire.
    issued_at_source: emission ? "declared" : fallback ? "first_date_found" : "none",
    chrono_reference: chrono ? chrono[1] : null,
    // L'affaire, sous ses deux formes. Elles ne se déduisent pas l'une de
    // l'autre — le segment de la chrono est court, le numéro déclaré est long —
    // et c'est ce qui rattachera un livrable à un projet, sous confirmation
    // d'un humain. Aucune des deux n'est requise : un marqueur absent ne fait
    // jamais rejeter un document.
    chrono_affaire: chrono ? (chrono[1].split("/")[pack.chronoAffairePart ?? 1] ?? null) : null,
    affaire_reference: affaire ? affaire[1] : null,
    document_type: type?.id ?? null,
    document_type_label: type?.label ?? null,
    // Un type inconnu n'est pas présumé récapitulatif : on ne fait pas d'un
    // document qu'on n'a pas su lire un point de contrôle.
    recapitulative: type?.recapitulative === true,
    sheet_number: sheet ? Number(sheet[1]) : null,
    version: version ? Number(version[1]) : null
  };
}

/**
 * Trie les sources par date déclarée.
 *
 * Un document sans date lisible ne peut pas être placé : il est rejeté en fin
 * de liste et signalé, plutôt que d'être glissé n'importe où dans la série.
 */
export function orderChronologically(sources, { pack = DEFAULT_PACK } = {}) {
  const withMeta = sources.map((source, index) => ({
    source,
    index,
    meta: readDocumentMeta(source, { pack })
  }));

  const dated = withMeta.filter((entry) => entry.meta.issued_at !== null);
  const undated = withMeta.filter((entry) => entry.meta.issued_at === null);

  dated.sort((a, b) => {
    if (a.meta.issued_at === b.meta.issued_at) {
      // À date égale, la référence chrono départage : sa séquence est croissante.
      const byChrono = String(a.meta.chrono_reference ?? "").localeCompare(String(b.meta.chrono_reference ?? ""));
      return byChrono !== 0 ? byChrono : a.index - b.index;
    }
    return a.meta.issued_at < b.meta.issued_at ? -1 : 1;
  });

  return {
    ordered: [...dated, ...undated].map((entry, position) => ({
      ...entry.source,
      order: position + 1,
      issued_at: entry.meta.issued_at,
      meta: entry.meta
    })),
    undatedSourceIds: undated.map((entry) => entry.source.source_id)
  };
}
