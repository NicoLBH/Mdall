/**
 * Demander au serveur de lire un compte rendu de chantier, et n'en garder que
 * ce qui est vérifié.
 *
 * ## Ce que ce fichier ne fait pas, et c'est le principal
 *
 * Il ne lit rien. Il ne porte ni consigne de lecture, ni clé, ni modèle : la
 * lecture se passe entièrement au serveur (`supabase/functions/extract-sujets`),
 * et le navigateur n'envoie que des pages. Ce qui revient a déjà été confronté
 * au document — un point dont la citation ne s'y retrouve pas n'a jamais quitté
 * le serveur.
 *
 * ## Il ne crée aucun sujet, et il ne le fera jamais
 *
 * Ce qu'il rend est une **proposition** de sujets. Ouvrir un sujet engage
 * quelqu'un à le traiter : c'est une décision, et une décision se prend par une
 * proposition, jamais par un dépôt de fichier (règle 1). C'est précisément ce
 * que l'ancienne pipeline faisait et ce pour quoi elle s'en va.
 *
 * ## Pourquoi il refuse plutôt que de se rabattre en silence
 *
 * Quand l'appel échoue, ce fichier rend un motif nommé et **rien d'autre**. Il
 * n'existe pas de lecture en dur d'un compte rendu vers laquelle se rabattre, et
 * rendre une liste vide ferait croire qu'un compte rendu ne porte aucun point —
 * ce qui n'est jamais vrai (règle 5).
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

/**
 * Le projet où l'on se trouve, pour le compteur de consommation.
 *
 * Résolu ici plutôt que passé de main en main : il traverserait sinon quatre
 * signatures qui n'en ont aucun usage, et chacune pourrait l'oublier en chemin
 * sans que rien ne le dise.
 *
 * **L'identifiant de la base, pas celui de la route.** Passer le second
 * rattacherait la consommation à un projet qui n'existe pas côté base.
 */
async function projetCourant() {
  try {
    const { resolveCurrentBackendProjectId } = await import("./project-supabase-sync.js");
    return (await resolveCurrentBackendProjectId()) || null;
  } catch {
    // Une lecture reste possible sans savoir où l'on est.
    return null;
  }
}

const URL_DE_LA_FONCTION = `${getSupabaseUrl()}/functions/v1/extract-sujets`;

const texte = (valeur) => String(valeur ?? "").trim();

/** Pourquoi la lecture n'a pas eu lieu. Nommés : un écran doit pouvoir le dire. */
export const REFUS = {
  /** Le document ne porte aucun texte à lire. */
  SANS_TEXTE: "sans-texte",
  /** Le serveur n'a pas répondu. */
  INJOIGNABLE: "injoignable",
  /** Le serveur a répondu qu'il ne pouvait pas. */
  REFUSE: "refuse",
  /** Il a répondu, et rien de ce qu'il a lu ne se retrouve dans le document. */
  RIEN_DE_VERIFIE: "rien-de-verifie"
};

export const PHRASES_DU_REFUS = {
  [REFUS.SANS_TEXTE]: "ce compte rendu ne porte aucun texte à lire",
  [REFUS.INJOIGNABLE]: "la lecture n'a pas pu être demandée",
  [REFUS.REFUSE]: "la lecture a été refusée",
  [REFUS.RIEN_DE_VERIFIE]: "rien de ce qui a été lu ne se retrouve dans le compte rendu"
};

export function phraseDuRefus(motif) {
  return PHRASES_DU_REFUS[texte(motif)] ?? "";
}

/**
 * Lire un compte rendu, une fois.
 *
 * @param {object} options
 * @param {string} options.sourceId le document du lot
 * @param {object[]} options.pages `{page, text}` — ce qu'on lui donne à lire
 * @returns {Promise<{ok: true, sujets: object[], ecartes: number}|{ok: false, motif: string}>}
 */
export async function lireLesSujets({ sourceId = "", pages = [], sujetsDuProjet = null } = {}) {
  const lisibles = (Array.isArray(pages) ? pages : []).filter((page) => texte(page?.text ?? page?.texte));
  if (!lisibles.length) return { ok: false, motif: REFUS.SANS_TEXTE };

  let reponse = null;
  try {
    reponse = await fetch(URL_DE_LA_FONCTION, {
      method: "POST",
      headers: await buildSupabaseAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        // **Le projet ne sert qu'au compteur de consommation**, jamais à la
        // lecture : le serveur ne voit que des pages. On l'envoie donc quand on
        // le connaît, et son absence range l'appel hors projet plutôt que de
        // l'attribuer au hasard.
        project_id: await projetCourant(),
        source_id: texte(sourceId),
        /**
         * Ce que le projet suit déjà, pour que le modèle reconnaisse un point
         * reporté.
         *
         * **`null` n'est pas une liste vide.** Ne pas avoir pu lire les sujets
         * du projet n'autorise pas à dire au modèle que le projet ne suit rien
         * (règle 5) : on ne lui envoie alors rien, il ne rapproche rien, et
         * tous les points repartent neufs — l'erreur la moins coûteuse.
         */
        ...(Array.isArray(sujetsDuProjet) ? { sujets_du_projet: sujetsDuProjet } : {}),
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
  const sujets = Array.isArray(rendu?.sujets) ? rendu.sujets : [];
  if (!sujets.length) return { ok: false, motif: REFUS.RIEN_DE_VERIFIE };

  return {
    ok: true,
    sujets,
    // Qui le compte rendu nomme. Une liste vide est une réponse : un compte
    // rendu qui ne nomme personne existe, et il ne faut pas le confondre avec
    // un serveur qui n'aurait rien rendu.
    intervenants: Array.isArray(rendu?.intervenants) ? rendu.intervenants : [],
    numeroDeReunion: texte(rendu?.numero_de_reunion),
    tenueLe: texte(rendu?.tenue_le),
    redigePar: texte(rendu?.redige_par),
    // Ce que le serveur a jeté faute de citation vérifiable. Se dit, se compte.
    ecartes: Array.isArray(rendu?.ecartes) ? rendu.ecartes.length : 0,
    /** Les rapprochements qui pointaient vers un sujet qu'on n'avait pas envoyé. */
    rapprochementsEcartes: Number(rendu?.rapprochements_ecartes) || 0,
    /** A-t-on dit au modèle ce que le projet suit ? Sans cela, tout repart neuf. */
    rapprochementDemande: Boolean(rendu?.rapprochement_demande),
    pagesCorrigees: Number(rendu?.pages_corrigees) || 0,
    modele: texte(rendu?.modele)
  };
}

/**
 * Lire tous les comptes rendus d'un lot, un par un.
 *
 * **Un appel par document, jamais un pour tout le lot.** Deux comptes rendus
 * d'un même dépôt sont deux réunions différentes, et fondre leurs textes ferait
 * attribuer les points de l'une à l'autre — donc rouvrir à la douzième réunion
 * ce qui a été soldé à la onzième.
 *
 * Les documents se lisent **en série** : un lot de trente comptes rendus lancé
 * d'un coup se ferait limiter, et l'on perdrait tout le lot pour avoir voulu
 * aller vite.
 */
export async function lireLeLotDeComptesRendus({ sources = [], onEtape = null } = {}) {
  const lectures = new Map();
  const refus = [];

  for (const source of Array.isArray(sources) ? sources : []) {
    const sourceId = texte(source?.sourceId ?? source?.source_id);
    if (!sourceId) continue;

    onEtape?.({ sourceId, nom: texte(source?.nom) || sourceId });

    const lu = await lireLesSujets({ sourceId, pages: source?.pages ?? [] });
    if (lu.ok) lectures.set(sourceId, lu);
    else refus.push({ sourceId, motif: lu.motif });
  }

  return { lectures, refus };
}
