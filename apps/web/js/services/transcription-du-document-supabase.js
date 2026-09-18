/**
 * La transcription d'un document, lue en base.
 *
 * ## Une lecture à part, et à la demande
 *
 * Le listing d'un dossier ne la descend pas : quarante comptes rendus feraient
 * quarante fichiers Markdown au chargement d'un dossier qu'on ouvre pour en
 * lire un seul. Il descend seulement `transcribed_at` — une date dit qu'il y a
 * quelque chose à lire, sans le lire.
 *
 * Le texte se lit quand on ouvre le document, et une seule fois.
 *
 * ## `null` n'est pas « pas de transcription »
 *
 * `null` quand la lecture a échoué, la ligne quand elle a abouti — même si sa
 * transcription est vide. L'écran ne dit pas la même chose dans les deux cas
 * (règle 5).
 */

import { supabase } from "../../assets/js/auth.js";

/**
 * La transcription d'un document.
 *
 * @returns {Promise<object|null>} la ligne, ou `null` si la lecture a échoué.
 */
export async function lireLaTranscription(documentId) {
  const id = String(documentId ?? "").trim();
  if (!id) return null;

  const { data, error } = await supabase
    .from("documents")
    .select("id,original_filename,filename,transcription_markdown,transcribed_at,content_fingerprint")
    .eq("id", id)
    .maybeSingle();

  if (error) return null;
  return data ?? null;
}
