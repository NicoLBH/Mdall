/**
 * Spike 1 — complétude du lot de documents.
 *
 * La mémoire d'un projet dépend de ce qu'on lui donne. Le devoir de l'outil
 * n'est pas de combler les trous, c'est de dire où ils sont.
 *
 * Trois signaux, tous lus dans les documents eux-mêmes :
 *
 *  1. **L'inventaire déclaré.** Un rapport d'étape énumère les livrables déjà
 *     adressés au maître d'ouvrage, avec leur référence chrono et leur date.
 *     C'est la source la plus sûre : l'organisme dit lui-même ce qu'il a émis.
 *  2. **La séquence des fiches.** Les fiches sont numérotées par affaire ; un
 *     trou dans la suite est un document absent.
 *  3. **Les renvois.** Un avis cite « ( Fiche avis travaux N°9 ) » : si cette
 *     fiche n'est pas dans le lot, la provenance de l'avis est hors de portée.
 *
 * Rien n'est déduit d'une absence : chaque manquement cite le document qui le
 * révèle.
 */

import { normalizeWhitespace } from "../lib/normalize.mjs";

const CHRONO = "[A-Z]{1,4}\\/\\d{3,6}\\/\\d{4}\\/\\d{3,5}";

/** `CT/13860/0525/0179 Fiche avis travaux N°2 20/05/2025` */
const INVENTORY_LINE = new RegExp(
  `^(?<chrono>${CHRONO})\\s+(?<designation>.+?)\\s+(?<day>\\d{1,2})\\/(?<month>\\d{1,2})\\/(?<year>\\d{4})$`,
  "u"
);

/** `( Fiche avis travaux N°9 )`, `( Rapport RICT N°4 )` */
const CROSS_REFERENCE = /\(\s*(?<label>(?:fiche|rapport)[^()]{0,60}?n[°o]\s*(?<number>\d{1,3}))\s*\)/giu;

function toIsoDate(day, month, year) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Livrables énumérés par un document — typiquement un rapport d'étape. */
export function readDeclaredInventory(source) {
  if (!source?.content_available) return [];

  const entries = [];
  const seen = new Set();

  for (const rawLine of source.content.split(/\r?\n/)) {
    const match = INVENTORY_LINE.exec(normalizeWhitespace(rawLine));
    if (!match) continue;

    const chrono = match.groups.chrono;
    if (seen.has(chrono)) continue;
    seen.add(chrono);

    entries.push({
      chrono_reference: chrono,
      // La désignation se termine souvent par le numéro de version du livrable.
      designation: normalizeWhitespace(match.groups.designation),
      issued_at: toIsoDate(match.groups.day, match.groups.month, match.groups.year),
      declared_in: source.source_id
    });
  }

  return entries;
}

/** Renvois d'un document vers un autre livrable. */
export function findCrossReferences(source) {
  if (!source?.content_available) return [];

  const references = new Map();
  for (const match of source.content.matchAll(CROSS_REFERENCE)) {
    const label = normalizeWhitespace(match.groups.label);
    if (!references.has(label)) {
      references.set(label, { label, number: Number(match.groups.number), cited_in: source.source_id });
    }
  }
  return [...references.values()];
}

/** Trous dans la numérotation des fiches. */
export function findSequenceGaps(metas) {
  const numbers = metas
    .map((meta) => meta.sheet_number)
    .filter((number) => Number.isInteger(number))
    .sort((a, b) => a - b);

  if (numbers.length < 2) return [];

  const present = new Set(numbers);
  const gaps = [];
  for (let number = numbers[0]; number < numbers[numbers.length - 1]; number += 1) {
    if (!present.has(number)) gaps.push(number);
  }
  return gaps;
}

/**
 * Confronte le lot chargé à ce que les documents déclarent.
 *
 * @param {{source_id: string, meta: object}[]} documents sources ordonnées, avec leur `meta`
 * @returns {{declared: object[], missing: object[], sequenceGaps: number[],
 *            unresolvedReferences: object[], duplicates: object[]}}
 */
export function assessCompleteness(documents) {
  const declared = documents.flatMap((document) => readDeclaredInventory(document));

  const loadedChronos = new Set(
    documents.map((document) => document.meta?.chrono_reference).filter(Boolean)
  );

  const missing = declared.filter((entry) => !loadedChronos.has(entry.chrono_reference));

  // Un renvoi ne se résout que si une fiche de ce numéro est présente.
  const loadedSheetNumbers = new Set(
    documents.map((document) => document.meta?.sheet_number).filter(Number.isInteger)
  );
  const unresolvedReferences = documents
    .flatMap((document) => findCrossReferences(document))
    .filter((reference) => !loadedSheetNumbers.has(reference.number));

  // Le même document chargé deux fois : l'empreinte du contenu le dit.
  const byHash = new Map();
  for (const document of documents) {
    const hash = document.content_sha256;
    if (!hash) continue;
    byHash.set(hash, [...(byHash.get(hash) ?? []), document.source_id]);
  }
  const duplicates = [...byHash.values()]
    .filter((ids) => ids.length > 1)
    .map((source_ids) => ({ source_ids }));

  return {
    declared,
    missing,
    sequenceGaps: findSequenceGaps(documents.map((document) => document.meta ?? {})),
    unresolvedReferences,
    duplicates
  };
}
