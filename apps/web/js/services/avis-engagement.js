/**
 * Ce qu'une fusion transforme en engagement.
 *
 * ## Où la confirmation a lieu
 *
 * `services/avis-liaison.js` **propose** qu'un avis porte sur une valeur. Ce
 * fichier dit ce qu'il advient de cette proposition : elle ne devient un
 * engagement qu'après la fusion, c'est-à-dire **après qu'un humain a signé la
 * proposition qui la portait**.
 *
 * La signature est donc la confirmation, et il n'y a pas de second geste : ni
 * file d'attente, ni écran de validation, ni relance (`docs/fondamentaux.md`,
 * règle 12). Quelqu'un lit la liste avant de signer, et ce qu'il signe entre.
 *
 * ## Ce qui n'entre pas
 *
 * Un avis qu'on n'a pas su accrocher entre **quand même** en mémoire — c'est un
 * fait du projet —, mais il n'écrit aucun engagement. On le voit alors dans la
 * mémoire sans qu'il couvre quoi que ce soit, ce qui est la vérité.
 *
 * Un avis **refusé** à la revue n'écrit rien non plus : ce que quelqu'un a
 * écarté ne couvre rien.
 */

import { ACT } from "./memoire-actes.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les actes à écrire après une fusion, d'après ce qu'elle vient d'écrire.
 *
 * Pure : elle ne parle à personne. On lui passe les lignes écrites, elle rend
 * les actes.
 *
 * @param {object} options
 * @param {object[]} options.ecrites les affirmations que la fusion a écrites
 * @param {string} [options.par] qui a signé la proposition — **pas** qui a émis
 *   l'avis : l'un a cliqué, l'autre engage sa responsabilité
 * @param {string} [options.le] la date de la fusion
 * @returns {object[]} les actes, prêts à être écrits
 */
export function engagementsDeLaFusion({ ecrites = [], par = "", le = "" } = {}) {
  const quand = texte(le) || new Date().toISOString();

  return (Array.isArray(ecrites) ? ecrites : [])
    .map((ligne) => {
      const porteSur = texte(ligne?.payload?.porteSur);
      if (!porteSur) return null;

      // Une ligne écartée ne couvre rien : ce que quelqu'un a refusé ne peut pas
      // engager qui que ce soit.
      if (texte(ligne?.status) === "rejected") return null;

      return {
        project_id: texte(ligne?.project_id) || null,
        // La valeur examinée — donc **cette version-là** de la valeur. C'est ce
        // qui fait qu'un engagement tombe tout seul quand elle est remplacée.
        assertion_id: porteSur,
        verdict: ACT.COUVRE,
        proposed_value: null,
        // Ce qu'on lit dans la liste des engagements : la teneur de l'avis et
        // l'organisme qui l'a rendu. Jamais « visa n° 4 », qui ne dit rien.
        note: noteDeLAvis(ligne),
        // L'avis lui-même : c'est par lui qu'on remonte au rapport et à sa page.
        source_assertion_id: texte(ligne?.id) || null,
        source_document_id: texte(ligne?.payload?.documentId) || null,
        source_page: Number.isFinite(Number(ligne?.payload?.page)) ? Number(ligne.payload.page) : null,
        declared_by: texte(par) || null,
        created_at: quand
      };
    })
    .filter(Boolean);
}

/**
 * Ce qu'un engagement dit de lui-même, en une ligne.
 *
 * L'organisme d'abord : c'est lui qui engage sa responsabilité, et c'est la
 * première chose qu'on cherche en relisant. `emisPar` n'est **pas**
 * `declared_by` — l'un a rendu l'avis, l'autre a cliqué.
 */
function noteDeLAvis(ligne) {
  const organisme = texte(ligne?.payload?.emisPar);
  const teneur = texte(ligne?.payload?.value ?? ligne?.payload?.valeur);
  return [organisme, teneur].filter(Boolean).join(" — ") || null;
}
