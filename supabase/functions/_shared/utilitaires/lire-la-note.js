/**
 * Lire une note de calcul de charpente, et n'en rendre que des nombres.
 *
 * ## Pourquoi un modèle, et pourquoi ici
 *
 * Deux notes de calcul ne se ressemblent pas : celle-ci met les descentes en
 * tonnes dans un tableau à deux colonnes par file, la suivante les mettra en
 * daN, en lignes, avec des noms de files différents. Écrire un analyseur par
 * bureau d'études est un travail sans fin ; un analyseur générique se
 * tromperait en silence sur la troisième note.
 *
 * Le modèle lit un tableau comme on le lit. C'est **la seule chose** qu'on lui
 * demande : recopier des nombres et les nommer. Il ne pondère pas, ne combine
 * pas, ne dimensionne pas — tout cela est du calcul, et le calcul appartient à
 * l'utilitaire fondations.
 *
 * ## Le PDF part tel quel, il n'est pas d'abord mis à plat
 *
 * Une extraction de texte rend les nombres dans l'ordre du flux, pas dans
 * l'ordre du tableau : « 0,228 1,709 0,416 4,078 » sans dire quelle valeur va à
 * quelle file. Le modèle, lui, voit les pages. Un tableau lu de travers donnerait
 * des semelles justes pour un poteau et fausses pour son voisin, sans que rien
 * ne le signale.
 *
 * ## Rien n'est écrit
 *
 * Comme le copilote, et pour la même raison : une note déposée pour un essai
 * n'est pas une pièce du projet. Aucune table, aucun `insert`. Le fichier
 * arrive, il est lu, il repart en nombres. Les journaux comptent des octets, ils
 * ne recopient rien.
 *
 * ## Ce qui a déjà été lu ne se relit pas
 *
 * Une même note est relue à chaque question qu'on lui pose — « et si le sol
 * faisait 2 bars ? », « reprends la file B en 2 × 2 ». La relire, c'est renvoyer
 * le PDF au modèle et payer la lecture une seconde fois pour obtenir les mêmes
 * nombres. La clé est le contenu du fichier : deux notes différentes ne se
 * confondent pas, et la même note redéposée se retrouve.
 *
 * Rien n'est écrit nulle part : c'est une variable de module, perdue au premier
 * redémarrage de la fonction — comme le reste de la conversation.
 */

import { CONSIGNE_EXTRACTION, SCHEMA_NOTE, normaliserLaNote } from "./note-de-calcul.js";

const MODEL = "gpt-4.1-mini";

/**
 * Ce qu'on accepte de lire.
 *
 * Huit mégaoctets en base64 font six mégaoctets de PDF : une note de calcul de
 * charpente en pèse quelques centaines de kilo-octets. Le plafond n'est pas une
 * politesse — sans lui, un fichier de deux cents pages occuperait la fonction et
 * le modèle pendant que les autres attendent.
 */
export const TAILLE_MAX = 8 * 1024 * 1024;

const dejaLues = new Map();
const LUES_MAX = 8;

/** De quoi reconnaître une note déjà lue, sans en garder le contenu. */
function clefDe(fichier) {
  const donnees = String(fichier?.donnees ?? "");
  return `${String(fichier?.nom ?? "")}|${donnees.length}|${donnees.slice(0, 64)}|${donnees.slice(-64)}`;
}

/**
 * Le texte que le modèle a rendu, quelle que soit la forme de l'enveloppe.
 *
 * L'API des réponses range le contenu dans un tableau de messages ; les
 * anciennes formes restent acceptées pour qu'un changement de format ne rende
 * pas une extraction vide sans rien dire.
 */
function lireLeTexte(brut) {
  if (typeof brut?.output_text === "string") return brut.output_text;

  const morceaux = [];
  for (const item of brut?.output ?? []) {
    for (const part of item?.content ?? []) {
      if (typeof part?.text === "string") morceaux.push(part.text);
    }
  }
  return morceaux.join("");
}

/**
 * La note, lue.
 *
 * @param {{nom:string, mediaType:string, donnees:string}} fichier le PDF en base64
 * @param {{cle:string}} options la clé du modèle
 * @returns {Promise<object>} la note normalisée
 */
export async function lireLaNoteDeCalcul(fichier, { cle = "", relire = false } = {}) {
  const donnees = String(fichier?.donnees ?? "").trim();
  if (!donnees) throw new Error("Aucun fichier à lire.");
  if (donnees.length > TAILLE_MAX) {
    throw new Error("Le fichier dépasse ce que la lecture accepte (6 Mo environ).");
  }
  const mediaType = String(fichier?.mediaType ?? "application/pdf");
  if (mediaType !== "application/pdf") throw new Error("Seuls les PDF se lisent pour le moment.");
  if (!cle) throw new Error("La lecture de notes n'est pas configurée sur ce serveur.");

  const clef = clefDe(fichier);
  if (!relire && dejaLues.has(clef)) return dejaLues.get(clef);

  const reponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      instructions: CONSIGNE_EXTRACTION,
      input: [{
        role: "user",
        content: [
          {
            type: "input_file",
            filename: String(fichier?.nom ?? "note.pdf"),
            file_data: `data:${mediaType};base64,${donnees}`
          },
          { type: "input_text", text: "Extrais les descentes de charges aux appuis de cette note." }
        ]
      }],
      // Le format est imposé, pas suggéré : un modèle à qui l'on demande « du
      // JSON » rend du JSON différent à chaque fois, et ce qui n'entre pas dans
      // le schéma n'entre pas dans le calcul.
      text: { format: { type: "json_schema", name: "note_de_calcul", strict: true, schema: SCHEMA_NOTE } }
    })
  });

  if (!reponse.ok) {
    throw new Error(`La lecture de la note a échoué (${reponse.status}).`);
  }

  const brut = await reponse.json();
  const contenu = lireLeTexte(brut).trim();
  if (!contenu) throw new Error("La note a été lue, mais rien n'en est revenu.");

  let lu;
  try {
    lu = JSON.parse(contenu);
  } catch {
    throw new Error("La lecture n'a pas rendu une extraction exploitable.");
  }

  const note = normaliserLaNote(lu);
  // Une poignée de notes suffit : au-delà, on garde en mémoire des documents
  // dont plus personne ne parle.
  if (dejaLues.size >= LUES_MAX) dejaLues.delete(dejaLues.keys().next().value);
  dejaLues.set(clef, note);
  return note;
}

/** Oublier ce qui a été lu — pour relire, ou pour les tests. */
export function oublierLesNotesLues() {
  dejaLues.clear();
}
