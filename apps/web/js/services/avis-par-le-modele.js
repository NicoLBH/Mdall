/**
 * Demander au serveur de relire un rapport, et n'en garder que ce qui est vérifié.
 *
 * ## Ce que ce fichier ne fait pas, et c'est le principal
 *
 * Il ne lit rien. Il ne porte ni consigne d'extraction, ni clé, ni modèle : la
 * lecture se passe entièrement au serveur (`supabase/functions/extract-avis`),
 * et le navigateur n'envoie que des pages. Ce qui revient a déjà été confronté
 * au document — un avis dont la citation ne s'y retrouve pas n'a jamais quitté
 * le serveur.
 *
 * ## Pourquoi il refuse plutôt que de se rabattre en silence
 *
 * Quand l'appel échoue, ce fichier rend un motif nommé et **rien d'autre**.
 * Retomber sur l'extraction en dur sans le dire ferait qu'on ne saurait jamais
 * quelle lecture on regarde — et les deux ne rendent pas les mêmes choses : la
 * lecture en dur perd le constat, celui qui dit ce que le bureau a examiné.
 * C'est à l'écran de proposer l'autre, en le nommant.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

const URL_DE_LA_FONCTION = `${getSupabaseUrl()}/functions/v1/extract-avis`;

const texte = (valeur) => String(valeur ?? "").trim();

/** Pourquoi la relecture n'a pas eu lieu. Nommés : un écran doit pouvoir le dire. */
export const REFUS = {
  /** Le document ne porte aucun texte à lire. */
  SANS_TEXTE: "sans-texte",
  /** Le serveur n'a pas répondu. */
  INJOIGNABLE: "injoignable",
  /** Le serveur a répondu qu'il ne pouvait pas. */
  REFUSE: "refuse",
  /** Il a répondu, et n'a rien trouvé qui se vérifie. */
  RIEN_DE_VERIFIE: "rien-de-verifie"
};

export const PHRASES_DU_REFUS = {
  [REFUS.SANS_TEXTE]: "ce document ne porte aucun texte à relire",
  [REFUS.INJOIGNABLE]: "la relecture n'a pas pu être demandée",
  [REFUS.REFUSE]: "la relecture a été refusée",
  [REFUS.RIEN_DE_VERIFIE]: "rien de ce qui a été lu ne se retrouve dans le document"
};

export function phraseDuRefus(motif) {
  return PHRASES_DU_REFUS[texte(motif)] ?? "";
}

/**
 * Relire un document, une fois.
 *
 * @param {object} options
 * @param {string} options.sourceId le document du lot
 * @param {object[]} options.pages `{page, text}` — ce qu'on lui donne à lire
 * @returns {Promise<{ok: true, avis: object[], organisme: string, legende: object[],
 *   ecartes: number, pagesCorrigees: number}|{ok: false, motif: string}>}
 */
export async function relireLesAvis({ sourceId = "", pages = [] } = {}) {
  const lisibles = (Array.isArray(pages) ? pages : []).filter((page) => texte(page?.text ?? page?.texte));
  if (!lisibles.length) return { ok: false, motif: REFUS.SANS_TEXTE };

  let reponse = null;
  try {
    reponse = await fetch(URL_DE_LA_FONCTION, {
      method: "POST",
      headers: await buildSupabaseAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        source_id: texte(sourceId),
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
  const avis = Array.isArray(rendu?.avis) ? rendu.avis : [];
  if (!avis.length) return { ok: false, motif: REFUS.RIEN_DE_VERIFIE };

  return {
    ok: true,
    avis,
    organisme: texte(rendu?.organisme),
    typeDeRapport: texte(rendu?.type_de_rapport),
    referenceDuRapport: texte(rendu?.reference_du_rapport),
    emisLe: texte(rendu?.emis_le),
    // La légende **du document** : c'est elle qui rend la lecture indépendante
    // de l'émetteur, et l'écran doit pouvoir la montrer.
    legende: Array.isArray(rendu?.legende) ? rendu.legende : [],
    // Ce que le serveur a jeté faute de citation vérifiable. Se dit, se compte.
    ecartes: Array.isArray(rendu?.ecartes) ? rendu.ecartes.length : 0,
    pagesCorrigees: Number(rendu?.pages_corrigees) || 0,
    modele: texte(rendu?.modele)
  };
}

/**
 * Relire tous les documents d'un lot, un par un.
 *
 * **Un appel par document, jamais un pour tout le lot.** Les rapports d'un même
 * lot viennent parfois de bureaux différents, et fondre leurs textes ferait
 * attribuer les avis de l'un à l'autre — c'est déjà la règle de
 * `services/avis-du-lot.js`, et elle vaut ici pour la même raison.
 *
 * Les documents se relisent **en série** : un lot de trente rapports lancé d'un
 * coup se ferait limiter, et l'on perdrait tout le lot pour avoir voulu aller
 * vite.
 */
export async function relireLeLot({ sources = [], onEtape = null } = {}) {
  const lectures = new Map();
  const refus = [];

  for (const source of Array.isArray(sources) ? sources : []) {
    const sourceId = texte(source?.source_id);
    if (!sourceId) continue;

    onEtape?.({ sourceId, nom: texte(source?.metadata?.filename) || sourceId });

    const lu = await relireLesAvis({ sourceId, pages: source?.pages ?? [] });
    if (lu.ok) lectures.set(sourceId, lu);
    else refus.push({ sourceId, motif: lu.motif });
  }

  return { lectures, refus };
}
