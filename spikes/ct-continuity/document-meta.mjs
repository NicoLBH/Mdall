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

/** `CT/13860/0923/0222` — organisme / affaire / MMAA / séquence. */
const CHRONO = /\b([A-Z]{1,4}\/\d{3,6}\/\d{4}\/\d{3,5})\b/;

const EMISSION_DATE = /date\s+d[’']\s*émission\s*:?\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i;
const ANY_DATE = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/;

/** `FICHE N° : 2` — numéro de fiche propre à l'affaire. */
const SHEET_NUMBER = /fiche\s*n[°o]\s*:?\s*(\d{1,3})\b/i;

const VERSION = /\bversion\s*:?\s*(\d{1,2})\b/i;

/**
 * Types rencontrés, reconnus sur les premières lignes du document.
 * La liste est ouverte : un type inconnu reste `null` plutôt que d'être forcé.
 *
 * `recapitulative` distingue deux natures de livrable, et cette distinction
 * décide de tout le suivi :
 *
 *  - un **récapitulatif** (RICT, rapport d'étape, rapport final, APD) reprend
 *    l'état complet des avis à sa date. Un avis qui n'y figure plus a vraiment
 *    disparu : le document avait vocation à le porter.
 *  - une **fiche** traite son sujet et ne répète pas les avis des fiches
 *    précédentes. Qu'un numéro n'y figure pas ne dit rien du tout.
 *
 * Confondre les deux fait déclarer « sans nouvelles » des avis que personne
 * n'a jamais eu l'intention de reconduire.
 */
const TYPES = [
  { id: "rapport_etape", label: "Rapport d'étape", recapitulative: true, pattern: /rapport\s+d['’]?\s*etape|rapport\s+d['’]?\s*étape/i },
  // L'APS et l'APD sont deux phases distinctes de la conception, et le même
  // rapport préalable les couvre l'une après l'autre : les confondre sous un
  // seul nom faisait passer un avant-projet sommaire pour un définitif.
  { id: "rapport_prealable_aps", label: "Rapport préalable / APS", recapitulative: true, pattern: /rapport\s+pr[ée]alable[^\n]{0,12}\bAPS\b/i },
  { id: "rapport_prealable", label: "Rapport préalable / APD", recapitulative: true, pattern: /rapport\s+pr[ée]alable/i },
  { id: "rapport_initial", label: "Rapport initial (RICT)", recapitulative: true, pattern: /rapport\s+initial|\bRICT\b/i },
  { id: "rapport_final", label: "Rapport final", recapitulative: true, pattern: /rapport\s+final|\bRFCT\b/i },
  // Une vérification réglementaire après travaux constate la conformité des
  // installations ; elle ne reprend pas l'état des avis du contrôle technique.
  // Ce n'est donc pas un point de contrôle : une absence n'y prouve rien.
  {
    id: "rvrat",
    label: "Rapport de vérification après travaux (RVRAT)",
    recapitulative: false,
    pattern: /\bRVRAT\b|v[ée]rifications?\s+r[ée]glementaires?\s+apr[èe]s\s+travaux/i
  },
  { id: "fiche_avis_travaux", label: "Fiche avis travaux", recapitulative: false, pattern: /avis\s+en\s+phase\s+de\s+r[ée]alisation/i },
  { id: "fiche_examen_document", label: "Fiche examen de document", recapitulative: false, pattern: /avis\s+suite\s+a\s+examen\s+de\s+documents?/i },
  { id: "fiche_correspondance", label: "Fiche de correspondance", recapitulative: false, pattern: /fiche\s+de\s+correspondance/i },
  { id: "attestation", label: "Attestation", recapitulative: false, pattern: /attestation/i }
];

function toIsoDate(day, month, year) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * @returns {{issued_at: string|null, issued_at_source: string, chrono_reference: string|null,
 *            document_type: string|null, document_type_label: string|null,
 *            sheet_number: number|null, version: number|null}}
 */
export function readDocumentMeta(source) {
  const text = source?.content_available ? source.content : "";
  const head = text.split(/\r?\n/).slice(0, 60).map(normalizeWhitespace).join("\n");

  const emission = EMISSION_DATE.exec(text);
  const fallback = emission ? null : ANY_DATE.exec(head);

  const chrono = CHRONO.exec(text);
  const sheet = SHEET_NUMBER.exec(head);
  const version = VERSION.exec(head);
  // Le type se lit dans le titre, pas dans le corps : une fiche qui mentionne
  // « notre Rapport Final de Contrôle technique » n'est pas un rapport final.
  const title = text.split(/\r?\n/).map(normalizeWhitespace).filter(Boolean).slice(0, 4).join("\n");
  const type = TYPES.find((entry) => entry.pattern.test(title)) ?? null;

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
export function orderChronologically(sources) {
  const withMeta = sources.map((source, index) => ({
    source,
    index,
    meta: readDocumentMeta(source)
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
