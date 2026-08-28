/**
 * Le premier reconnaisseur : un livrable de bureau de contrôle.
 *
 * Il ne réécrit rien. Le moteur de l'atelier sait déjà lire ce qu'un tel
 * document déclare de lui-même — son type, sa date d'émission, sa référence
 * chrono, et la légende des codes d'avis qu'il emploie. Ce module se contente
 * de poser la question qui manquait : est-ce bien de cela qu'il s'agit, et
 * qui l'a émis ?
 *
 * Les deux fonctions du moteur lui sont **injectées** plutôt qu'importées :
 * elles vivent dans `spikes/ct-continuity`, copiées vers `apps/web/vendor` au
 * moment du build, et le chemin diffère entre le navigateur et les tests.
 * L'injection évite d'avoir à le savoir ici.
 *
 * Une seule règle vraiment propre à cet organisme y figure : son nom, imprimé
 * en pied de chaque page. Les autres — types de livrables, format de chrono —
 * viennent du moteur, où elles seront regroupées en pack versionné lors d'une
 * étape ultérieure.
 */

import { CONFIDENCE } from "./document-recognition.js";
import { MARKER } from "./project-identity.js";

/**
 * Les émetteurs que nous savons nommer.
 *
 * Il n'y en a qu'un, et c'est volontaire : nous ne disposons d'aucun rapport
 * APAVE, Véritas ou Qualiconsult. Écrire leurs motifs au jugé produirait des
 * règles fausses, qui ne se découvriraient que le jour où elles feraient taire
 * un vrai document. On les ajoutera avec un corpus sous les yeux.
 */
const AUTHORS = [{ id: "socotec", label: "SOCOTEC", pattern: /\bSOCOTEC\b/i }];

const FAMILY = "ct_report";
const FAMILY_LABEL = "Livrable de bureau de contrôle";

/** La ligne qui prouve l'émetteur, et la page où elle se trouve. */
function findEvidence(pattern, { text, pages }) {
  for (const page of pages) {
    for (const line of String(page?.text ?? "").split(/\r?\n/)) {
      if (pattern.test(line)) return { text: line.trim().slice(0, 200), page: page.page ?? null };
    }
  }
  for (const line of text.split(/\r?\n/)) {
    if (pattern.test(line)) return { text: line.trim().slice(0, 200), page: null };
  }
  return null;
}

export function createCtReportRecognizer({ readDocumentMeta, discoverLegend }) {
  return {
    id: "ct-report",
    version: 1,

    recognize({ text, pages }) {
      const meta = readDocumentMeta({ content_available: true, content: text });
      const legend = discoverLegend(text);

      const author = AUTHORS.find((entry) => entry.pattern.test(text)) ?? null;
      const hasType = Boolean(meta.document_type);
      const hasChrono = Boolean(meta.chrono_reference);
      const hasLegend = legend.codes.length > 0;

      // Un émetteur nommé et un livrable identifié : il n'y a pas de doute.
      // Sans nom d'émetteur, il en faut davantage — une référence chrono seule
      // ne suffit pas, et un document qui prononce le mot « attestation » n'est
      // pas pour autant une attestation de bureau de contrôle.
      let confidence = null;
      if (author && (hasType || hasChrono)) confidence = CONFIDENCE.CERTAIN;
      else if (hasChrono && (hasType || hasLegend)) confidence = CONFIDENCE.PROBABLE;

      if (!confidence) return null;

      const kindLabel = meta.document_type_label ?? FAMILY_LABEL;

      return {
        kind: FAMILY,
        kindLabel,
        author: author?.id ?? null,
        authorLabel: author?.label ?? null,
        confidence,
        declaredReference: meta.chrono_reference,
        issuedAt: meta.issued_at,
        // Ce que le document dit de l'affaire dont il relève. Ces marqueurs ne
        // rattachent rien à eux seuls : ils seront confrontés à la mémoire du
        // projet, et c'est un humain qui tranchera. Un livrable qui n'en porte
        // aucun n'est pas suspect pour autant.
        markers: [
          meta.chrono_affaire ? { type: MARKER.CHRONO_AFFAIRE, value: meta.chrono_affaire } : null,
          meta.affaire_reference ? { type: MARKER.AFFAIRE, value: meta.affaire_reference } : null
        ].filter(Boolean),
        evidence: author ? findEvidence(author.pattern, { text, pages }) : null,
        // La légende est ce que le moteur de lecture exige : sans elle, aucun
        // avis ne peut être reconnu. Son absence n'est pas un défaut — une
        // attestation ou une fiche de correspondance n'en portent pas, et ce
        // sont des pièces légitimes du dossier.
        exploitable: hasLegend,
        note: hasLegend
          ? `Reconnu comme ${lowerFirst(kindLabel)}${author ? ` émis par ${author.label}` : ""}.`
          : `Reconnu comme ${lowerFirst(kindLabel)}, mais ce livrable ne déclare aucune ` +
            `légende d'avis : il n'y a pas de tableau à en tirer.`
      };
    }
  };
}

/** « Rapport RICT » devient « rapport RICT » au fil d'une phrase ; un sigle non. */
function lowerFirst(value) {
  const text = String(value ?? "");
  if (text === "" || /^\p{Lu}\p{Lu}/u.test(text)) return text;
  return `${text.charAt(0).toLocaleLowerCase("fr")}${text.slice(1)}`;
}
