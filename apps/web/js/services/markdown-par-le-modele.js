/**
 * Demander au serveur de refaire un document en Markdown.
 *
 * ## Ce fichier ne lit rien
 *
 * Il ne porte ni consigne, ni clé, ni modèle : la relecture se passe
 * entièrement au serveur (`supabase/functions/reconstituer-en-markdown`), et le
 * navigateur n'envoie que des pages. Une consigne de lecture descendue ici
 * serait lisible par n'importe qui ouvrant les outils du navigateur.
 *
 * ## Ce qu'il rend ne s'exploite pas
 *
 * Le document refait sert à **être regardé**. Il n'alimente aucune extraction,
 * ne devient aucun sujet et n'entre nulle part : la chaîne qui écrit passe par
 * une proposition, et celle-ci ne passe pas par ici (règle 1).
 *
 * ## Il refuse plutôt que de se rabattre
 *
 * Un document refait à moitié ressemble exactement à un document à moitié
 * vide. Quand l'appel n'aboutit pas, ce fichier rend un motif nommé et rien
 * d'autre — jamais un document partiel présenté comme entier (règle 5).
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

/**
 * Le projet où l'on se trouve, pour le compteur de consommation.
 *
 * **L'identifiant de la base, pas celui de la route** : le second rattacherait
 * la consommation à un projet qui n'existe pas côté base.
 */
async function projetCourant() {
  try {
    const { resolveCurrentBackendProjectId } = await import("./project-supabase-sync.js");
    return (await resolveCurrentBackendProjectId()) || null;
  } catch {
    // Une relecture reste possible sans savoir où l'on est.
    return null;
  }
}

const URL_DE_LA_FONCTION = `${getSupabaseUrl()}/functions/v1/reconstituer-en-markdown`;

const texte = (valeur) => String(valeur ?? "").trim();

/** Pourquoi la reconstitution n'a pas eu lieu. Nommés : un écran doit pouvoir le dire. */
export const REFUS = {
  SANS_TEXTE: "sans-texte",
  INJOIGNABLE: "injoignable",
  REFUSE: "refuse",
  RIEN_RENDU: "rien-rendu"
};

export const PHRASES_DU_REFUS = {
  [REFUS.SANS_TEXTE]: "ce document ne porte aucun texte à refaire",
  [REFUS.INJOIGNABLE]: "la reconstitution n'a pas pu être demandée",
  [REFUS.REFUSE]: "la reconstitution a été refusée",
  [REFUS.RIEN_RENDU]: "le modèle n'a rendu aucune page"
};

export function phraseDuRefus(motif) {
  return PHRASES_DU_REFUS[texte(motif)] ?? "";
}

/**
 * Refaire un document, une fois.
 *
 * @param {object} options
 * @param {object[]} options.pages `{page, text}` — ce qu'on lui donne à refaire
 * @returns {Promise<{ok: true, pages: object[], horsPlafond: number[], absentes: number[],
 *   inconnues: number[], coupee: boolean, modele: string}|{ok: false, motif: string}>}
 */
export async function refaireLeDocument({ pages = [] } = {}) {
  const lisibles = (Array.isArray(pages) ? pages : []).filter((page) => texte(page?.text ?? page?.texte));
  if (!lisibles.length) return { ok: false, motif: REFUS.SANS_TEXTE };

  let reponse = null;
  try {
    reponse = await fetch(URL_DE_LA_FONCTION, {
      method: "POST",
      headers: await buildSupabaseAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        project_id: await projetCourant(),
        pages: lisibles.map((page) => ({ page: Number(page?.page), text: texte(page?.text ?? page?.texte) }))
      })
    });
  } catch {
    return { ok: false, motif: REFUS.INJOIGNABLE };
  }

  if (!reponse.ok) {
    return { ok: false, motif: reponse.status === 404 ? REFUS.INJOIGNABLE : REFUS.REFUSE };
  }

  const rendu = await reponse.json().catch(() => null);
  const refaites = Array.isArray(rendu?.pages) ? rendu.pages : [];
  if (!refaites.length) return { ok: false, motif: REFUS.RIEN_RENDU };

  return {
    ok: true,
    pages: refaites,
    // Ce que le plafond du serveur a laissé dehors, ce dont rien n'est revenu,
    // et ce que le modèle a rendu sans qu'on le lui demande. Les trois se
    // disent : un document amputé qui s'afficherait entier serait pire que pas
    // de document du tout.
    horsPlafond: Array.isArray(rendu?.hors_plafond) ? rendu.hors_plafond : [],
    absentes: Array.isArray(rendu?.absentes) ? rendu.absentes : [],
    inconnues: Array.isArray(rendu?.inconnues) ? rendu.inconnues : [],
    coupee: Boolean(rendu?.coupee),
    modele: texte(rendu?.modele)
  };
}
