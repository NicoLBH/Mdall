/**
 * La mémoire du projet, hors de l'écran.
 *
 * L'onglet Mémoire montre ce que le projet tient pour vrai, filtré et paginé.
 * C'est ce qu'il faut pour lire ; ce n'est pas ce qu'il faut pour **comparer**.
 * Comparer demande deux fichiers du même format : l'export d'une proposition
 * et celui de la mémoire, ouverts côte à côte, disent d'un coup d'œil ce que la
 * proposition ajouterait et ce que la mémoire dit déjà.
 *
 * Ce fichier suit donc les mêmes règles que `proposition-export.js` : rien
 * n'est recalculé, l'ordre est déterministe, et ce qui a été remplacé reste —
 * une mémoire qui n'exporterait que l'état courant ferait disparaître son
 * histoire, c'est-à-dire la seule chose qui permette de la contester.
 */

import { MEMORY, currentAssertions, describeAssertionFacts, kindLabel, summarizeMemory } from "./project-memory.js";
import { classifyAssertion, domainLabel, natureLabel, summarizeTaxonomy } from "./assertion-taxonomy.js";
import { toCsv } from "../utils/csv.js";

export const MEMORY_EXPORT_FORMAT = "mdall.memoire/1";

function texte(value) {
  return String(value ?? "").trim();
}

/**
 * L'ordre de lecture : par nature, puis par clé métier, puis par date.
 *
 * Un ordre stable est ce qui rend deux exports comparables : sans lui, un
 * `diff` entre deux fichiers montrerait des déplacements qui ne sont pas des
 * changements.
 */
function ordonner(assertions) {
  return [...assertions].sort((gauche, droite) => {
    if (gauche.kind !== droite.kind) return String(gauche.kind).localeCompare(String(droite.kind));
    const cle = String(gauche.subject_key ?? "").localeCompare(String(droite.subject_key ?? ""), "fr", { numeric: true });
    if (cle !== 0) return cle;
    return String(gauche.decided_at ?? "").localeCompare(String(droite.decided_at ?? ""));
  });
}

function assertionLigne(assertion) {
  const { nature, domain, natureDerived } = classifyAssertion(assertion ?? {});

  return {
    id: texte(assertion?.id) || null,
    // `nature` désignait la provenance depuis le début de cet export : elle
    // garde son nom pour ne pas casser les fichiers déjà produits, et le
    // vocabulaire arrive sous le sien.
    nature: texte(assertion?.kind) || null,
    natureLabel: kindLabel(assertion?.kind),
    vocabulaire: {
      nature,
      natureLabel: nature ? natureLabel(nature) : null,
      // Déduite de la provenance, ou écrite par une extraction qui la savait :
      // un export qui ne le dirait pas ferait passer une déduction pour une
      // affirmation du projet.
      natureDeduite: natureDerived,
      domaine: domain,
      domaineLabel: domain ? domainLabel(domain) : null
    },
    cle: texte(assertion?.subject_key) || null,
    enonce: texte(assertion?.statement) || null,
    detail: texte(assertion?.detail) || null,
    statut: texte(assertion?.status) || null,
    statutLabel: assertion?.status === MEMORY.REJECTED ? "écartée" : "assumée",
    // Une affirmation remplacée n'est pas fausse : elle a été vraie. La date du
    // remplacement le dit sans la supprimer.
    enVigueur: !assertion?.superseded_by,
    remplaceeLe: texte(assertion?.superseded_at) || null,
    trancheeLe: texte(assertion?.decided_at) || null,
    proposition: Number(assertion?.proposition_number) || null,
    propositionId: texte(assertion?.proposition_id) || null,
    documentSource: texte(assertion?.source_document_id) || null,
    faits: Object.fromEntries(describeAssertionFacts(assertion ?? {})),
    payload: assertion?.payload ?? null
  };
}

/**
 * Toute la mémoire d'un projet, en un objet.
 *
 * @param {{project: object, assertions: object[]|null, generatedAt: string}} entree
 *   `assertions` vaut `null` quand la lecture a échoué : l'export le dit, il
 *   n'écrit pas une mémoire vide qu'on prendrait pour un projet sans histoire.
 */
export function buildMemoryExport({ project = {}, assertions = null, generatedAt = "" } = {}) {
  const lues = Array.isArray(assertions) ? assertions : null;
  const ordonnees = lues ? ordonner(lues) : null;

  return {
    format: MEMORY_EXPORT_FORMAT,
    generatedAt: texte(generatedAt) || new Date().toISOString(),
    projet: {
      id: texte(project?.id ?? project?.project_id) || null,
      nom: texte(project?.name ?? project?.projectName) || null,
      reference: texte(project?.reference ?? project?.code) || null
    },
    lecture: {
      aboutie: lues !== null,
      // « Rien » et « je n'ai pas pu lire » sont deux phrases différentes, et
      // les confondre a déjà coûté une soirée.
      message: lues === null ? "La mémoire n'a pas pu être lue." : null
    },
    resume: lues ? summarizeMemory(lues) : null,
    // Le vocabulaire de ce qui vaut aujourd'hui, avec ce qui n'est pas classé :
    // c'est ce qu'on compare d'un export à l'autre pour voir le classement
    // avancer.
    vocabulaire: ordonnees ? summarizeTaxonomy(currentAssertions(ordonnees)) : null,
    affirmations: ordonnees ? ordonnees.map(assertionLigne) : null,
    // L'état courant, isolé : c'est ce qu'on compare à une proposition.
    enVigueur: ordonnees ? currentAssertions(ordonnees).map(assertionLigne) : null
  };
}

const CSV_COLUMNS = [
  { key: "nature", label: "Provenance" },
  { key: "vocabulaire", label: "Nature" },
  { key: "domaine", label: "Domaine" },
  { key: "cle", label: "Clé" },
  { key: "enonce", label: "Affirmation" },
  { key: "statut", label: "Statut" },
  { key: "vigueur", label: "En vigueur" },
  { key: "detail", label: "Détail" },
  { key: "faits", label: "Ce sur quoi elle s'appuie" },
  { key: "trancheeLe", label: "Tranchée le" },
  { key: "remplaceeLe", label: "Remplacée le" },
  { key: "proposition", label: "Proposition" }
];

/** La mémoire mise à plat : une ligne par affirmation, l'histoire comprise. */
export function memoryExportRows(exported = null) {
  if (!exported?.affirmations) return { columns: CSV_COLUMNS, rows: [] };

  const rows = exported.affirmations.map((assertion) => ({
    nature: assertion.natureLabel ?? "",
    vocabulaire: assertion.vocabulaire?.natureLabel ?? "non classée",
    // « non classé » s'écrit, il ne se laisse pas vide : une cellule vide se
    // lit comme une donnée manquante dans le fichier, pas comme un fait.
    domaine: assertion.vocabulaire?.domaineLabel ?? "non classé",
    cle: assertion.cle ?? "",
    enonce: assertion.enonce ?? "",
    statut: assertion.statutLabel ?? "",
    vigueur: assertion.enVigueur ? "oui" : "non",
    detail: assertion.detail ?? "",
    faits: Object.entries(assertion.faits ?? {})
      .map(([label, valeur]) => `${label} : ${valeur}`)
      .join(" | "),
    trancheeLe: assertion.trancheeLe ?? "",
    remplaceeLe: assertion.remplaceeLe ?? "",
    proposition: assertion.proposition ? `#P${assertion.proposition}` : ""
  }));

  return { columns: CSV_COLUMNS, rows };
}

/** La mémoire en CSV, prête à écrire. */
export function memoryExportCsv(exported = null) {
  const { columns, rows } = memoryExportRows(exported);
  return toCsv(columns, rows);
}

export function memoryExportFilename(exported = null, extension = "json") {
  const jour = texte(exported?.generatedAt).slice(0, 10) || "sans-date";
  const projet = texte(exported?.projet?.reference ?? exported?.projet?.nom)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `memoire-${projet || "projet"}-${jour}.${extension}`;
}
