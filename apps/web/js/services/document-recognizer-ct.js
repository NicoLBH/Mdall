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
 * Qui l'a émis ne se lit plus ici : `services/emetteur-du-document.js` le dit,
 * pour tous les documents et pas seulement pour ceux-là. Un nom vit à un seul
 * endroit (règle 10), et un courriel de bureau de contrôle doit se reconnaître
 * comme son rapport.
 */

import { CONFIDENCE } from "./document-recognition.js";
import { MARKER } from "./project-identity.js";
import { lowerFirst } from "../utils/lower-first.js";
import { emetteurDuDocument } from "./emetteur-du-document.js";

const FAMILY = "ct_report";
const FAMILY_LABEL = "Livrable de bureau de contrôle";

export function createCtReportRecognizer({ readDocumentMeta, discoverLegend }) {
  return {
    id: "ct-report",
    version: 1,

    recognize({ text, pages }) {
      const meta = readDocumentMeta({ content_available: true, content: text });
      const legend = discoverLegend(text);

      // La preuve vient avec l'émetteur : la ligne qui le nomme, et sa page.
      const emetteur = emetteurDuDocument({ texte: text, pages });
      const author = emetteur.organisme;
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
      const kindLabelPlural = meta.document_type_label_plural ?? `${FAMILY_LABEL}s`;

      return {
        kind: FAMILY,
        kindLabel,
        kindLabelPlural,
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
        evidence: author
          ? { text: emetteur.preuves[0]?.extrait ?? "", page: emetteur.preuves[0]?.page ?? null }
          : null,
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
