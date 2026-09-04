/**
 * La porte vers la lecture d'une note de calcul.
 *
 * Le fichier part vers `extraire-note-de-calcul`, sous notre identité, et
 * revient en nombres. Rien n'est stocké nulle part : ni ici, ni là-bas. Une
 * note déposée pour un essai n'est pas une pièce du projet — c'est la même
 * règle que pour les conversations du copilote, et pour la même raison.
 *
 * Ce fichier ne lit ni ne calcule : il pose la question et rapporte la réponse,
 * normalisée par `note-de-calcul.js`.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import { CONSIGNE_EXTRACTION, SCHEMA_NOTE, normaliserLaNote } from "./note-de-calcul.js";

const URL_FONCTION = `${getSupabaseUrl()}/functions/v1/extraire-note-de-calcul`;

/**
 * Ce qu'on a déjà lu, gardé le temps de la page.
 *
 * Une même note est relue à chaque question qu'on lui pose — « et si le sol
 * faisait 2 bars ? », « reprends la file B en 2 × 2 ». La relire, c'est
 * renvoyer le PDF au modèle et payer la lecture une seconde fois pour obtenir
 * les mêmes nombres. La clé est le contenu du fichier : deux notes différentes
 * ne se confondent pas, et la même note redéposée se retrouve.
 *
 * Rien n'est écrit nulle part : c'est une variable de module, perdue au
 * rechargement de la page, comme le reste de la conversation.
 */
const dejaLues = new Map();
const LUES_MAX = 4;

/**
 * Le fichier en base64, sans son en-tête de données.
 *
 * `FileReader` rend « data:application/pdf;base64,… » ; ce qui part est ce qui
 * suit la virgule. Envoyer l'en-tête ferait échouer le décodage côté serveur
 * avec un message qui ne dirait pas pourquoi.
 */
export function base64Sans_Entete(dataUrl = "") {
  const rang = String(dataUrl).indexOf(",");
  return rang >= 0 ? String(dataUrl).slice(rang + 1) : String(dataUrl);
}

/** Un fichier du navigateur, prêt à partir. */
export function lireLeFichier(fichier) {
  return new Promise((suite, echec) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => echec(new Error("Le fichier n'a pas pu être lu."));
    lecteur.onload = () => suite({
      nom: fichier.name,
      mediaType: fichier.type || "application/pdf",
      taille: fichier.size,
      donnees: base64Sans_Entete(lecteur.result)
    });
    lecteur.readAsDataURL(fichier);
  });
}

/**
 * La note, lue.
 *
 * @param {{nom:string, mediaType:string, donnees:string}} fichier le PDF en base64
 * @returns {Promise<object>} la note normalisée
 */
export async function lireLaNoteDeCalcul(fichier, { signal, relire = false } = {}) {
  if (!fichier?.donnees) throw new Error("Aucun fichier à lire.");

  const clef = `${fichier.nom}|${fichier.donnees.length}|${fichier.donnees.slice(0, 64)}|${fichier.donnees.slice(-64)}`;
  if (!relire && dejaLues.has(clef)) return dejaLues.get(clef);

  const reponse = await fetch(URL_FONCTION, {
    method: "POST",
    headers: await buildSupabaseAuthHeaders({ "Content-Type": "application/json" }),
    signal,
    body: JSON.stringify({ fichier, schema: SCHEMA_NOTE, consigne: CONSIGNE_EXTRACTION })
  });

  const brut = await reponse.text().catch(() => "");
  let charge = null;
  try { charge = brut ? JSON.parse(brut) : null; } catch { charge = null; }

  if (!reponse.ok) throw new Error(charge?.error || `La lecture a échoué (HTTP ${reponse.status}).`);
  if (!charge?.note) throw new Error("La note a été lue, mais rien n'en est revenu.");

  const note = normaliserLaNote(charge.note);
  // Une poignée de notes suffit : au-delà, on garde en mémoire des documents
  // dont plus personne ne parle.
  if (dejaLues.size >= LUES_MAX) dejaLues.delete(dejaLues.keys().next().value);
  dejaLues.set(clef, note);
  return note;
}

/** Oublier ce qui a été lu — au changement de projet, ou pour relire. */
export function oublierLesNotesLues() {
  dejaLues.clear();
}
