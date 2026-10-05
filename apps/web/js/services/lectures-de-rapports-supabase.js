/**
 * Les lectures de rapports de contrôle, conservées pour être rouvertes.
 *
 * Ce module ne décide de rien : ce qu'une lecture garde, et comment elle se
 * rouvre, vit dans `la-lecture-dun-rapport.js`, qui est pur et éprouvé. Ici, des
 * allers-retours avec la base, et rien d'autre.
 *
 * ## Elles sont privées, et ce n'est pas ce fichier qui le tient
 *
 * La règle de lecture de `rapport_lectures` ne rend que les lectures de qui
 * demande. Ce module ne filtre rien — s'il filtrait, la discrétion ne serait
 * qu'une politesse d'affichage, et un écran qui oublierait de le faire montrerait
 * le verdict d'un tiers sur l'ouvrage de quelqu'un d'autre.
 *
 * ## Ce qu'un échec d'écriture coûte
 *
 * Rien de la lecture. Elle a eu lieu, elle est à l'écran : ce qu'on en garde
 * n'est que le confort de la rouvrir. On rend `null`, et l'on continue.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import {
  LE_SELECT_DES_AVIS_DUN_RAPPORT, LE_SELECT_DUNE_LIGNE_DE_RAPPORT, LE_SELECT_DUN_RAPPORT
} from "./la-lecture-dun-rapport.js";

const SUPABASE_URL = getSupabaseUrl();

/** La table, nommée une fois : trois chaînes recopiées finiraient par diverger. */
const LA_TABLE = "rapport_lectures";

const texte = (valeur) => String(valeur ?? "").trim();

async function requete(chemin, { method = "GET", body = null, params = {} } = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${chemin}`);
  for (const [cle, valeur] of Object.entries(params)) url.searchParams.set(cle, valeur);

  const reponse = await fetch(url.toString(), {
    method,
    headers: await buildSupabaseAuthHeaders({
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json", Prefer: "return=representation" } : {})
    }),
    cache: "no-store",
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  if (!reponse.ok) {
    throw new Error(`${chemin} (${reponse.status}) : ${await reponse.text().catch(() => "")}`);
  }
  return reponse.status === 204 ? null : reponse.json().catch(() => null);
}

/**
 * Conserve une lecture de rapport.
 *
 * **On écrit une fois, et on ne met jamais à jour.** Relire le même rapport est
 * une seconde lecture, avec sa propre ligne (règle 6) — et c'est précisément ce
 * qu'on veut comparer quand on ajuste une consigne.
 */
export async function conserverUneLectureDeRapport(ligne = null) {
  if (!ligne?.project_id) return null;

  try {
    const lignes = await requete(LA_TABLE, { method: "POST", body: [ligne] });
    return Array.isArray(lignes) ? lignes[0] ?? null : null;
  } catch {
    return null;
  }
}

/**
 * Les lectures de rapports de ce projet, la plus récente d'abord.
 *
 * **`null` sur une erreur, jamais `[]`.** « Aucun rapport n'a été lu » et « on
 * n'a pas su demander » n'appellent pas la même phrase, et la seconde ne doit
 * pas se dire comme la première (règle 5).
 *
 * L'analyse gelée n'est pas chargée : c'est la plus grosse colonne — elle porte
 * le Markdown entier —, et le tableau n'en montre rien.
 */
/**
 * **`avecLanalyse` : la liste ne la charge pas, l'export si.**
 *
 * La colonne porte la transcription entière. La charger pour cinquante lignes
 * afin d'en ouvrir une ferait passer cinquante analyses sur le réseau pour en
 * regarder une — c'est pour cela que la liste s'en passe.
 *
 * Mais l'export de diagnostic, lui, n'existe que pour **cela** : sans les
 * analyses, il dit que la lecture a eu lieu et ne dit pas ce qu'elle a rendu,
 * c'est-à-dire précisément ce qu'on cherche quand rien ne s'affiche. Il la
 * demande donc, une fois, au moment du clic.
 */
export async function listerLesLecturesDeRapports(projectId, {
  limite = 300, avecLanalyse = false
} = {}) {
  if (!texte(projectId)) return [];

  try {
    const lignes = await requete(LA_TABLE, {
      params: {
        select: avecLanalyse ? LE_SELECT_DUN_RAPPORT : LE_SELECT_DUNE_LIGNE_DE_RAPPORT,
        project_id: `eq.${texte(projectId)}`,
        order: "created_at.desc",
        limit: String(Math.max(1, Number(limite) || 300))
      }
    });
    return Array.isArray(lignes) ? lignes : null;
  } catch {
    return null;
  }
}

/**
 * Une lecture de rapport, **entière** — son analyse comprise.
 *
 * `null` quand on n'a pas pu lire, **et aussi** quand la ligne n'existe plus.
 * L'écran dit « cette lecture ne s'ouvre pas » dans les deux cas : deviner lequel
 * des deux serait une affirmation de plus que ce qu'on sait (règle 5).
 */
export async function lireUneLectureDeRapport(id = "") {
  if (!texte(id)) return null;

  try {
    const lignes = await requete(LA_TABLE, {
      params: { select: LE_SELECT_DUN_RAPPORT, id: `eq.${texte(id)}`, limit: "1" }
    });
    return Array.isArray(lignes) ? lignes[0] ?? null : null;
  } catch {
    return null;
  }
}

/**
 * Les lectures précédentes **d'un même rapport**, la plus récente d'abord.
 *
 * C'est ce que le détail d'un rapport montre sous son analyse : on relit pour
 * ajuster une consigne, et comparer deux lectures du même document est le geste
 * qui fait monter la qualité par paliers (fondamental 13).
 *
 * Le regroupement se fait sur le **nom du fichier**, comme dans le tableau : un
 * rapport dont la reconnaissance n'a pas trouvé le numéro n'est pas le même
 * document que tous les autres sans numéro.
 */
export async function lesLecturesDunMemeRapport(projectId, document = "", { limite = 50 } = {}) {
  if (!texte(projectId) || !texte(document)) return [];

  try {
    const lignes = await requete(LA_TABLE, {
      params: {
        select: LE_SELECT_DUNE_LIGNE_DE_RAPPORT,
        project_id: `eq.${texte(projectId)}`,
        document: `eq.${texte(document)}`,
        order: "created_at.desc",
        limit: String(Math.max(1, Number(limite) || 50))
      }
    });
    return Array.isArray(lignes) ? lignes : null;
  } catch {
    return null;
  }
}

/**
 * Les avis de **tous** les rapports lus d'un chantier, pour en suivre la trace.
 *
 * C'est ce que le détail d'un rapport pose sous ses propres avis : ce que chacun
 * est devenu d'un rapport au suivant. La suite elle-même se calcule dans
 * `le-devenir-dun-avis.js`, qui est pur ; ici, un aller-retour, et rien d'autre.
 *
 * **`null` sur une erreur, jamais `[]`.** Une frise vide parce qu'on n'a pas su
 * demander se lirait comme un chantier sans aucun avis (règle 5).
 *
 * **Une seule lecture par rapport.** On relit le même document pour ajuster une
 * consigne, et deux lectures du même rapport donneraient deux fois ses avis dans
 * la frise — un rappel inventé, et une levée qui paraîtrait double. On garde la
 * plus récente, qui est celle qu'on a voulue.
 */
export async function lesAvisDesRapports(projectId, { limite = 300 } = {}) {
  if (!texte(projectId)) return [];

  try {
    const lignes = await requete(LA_TABLE, {
      params: {
        select: LE_SELECT_DES_AVIS_DUN_RAPPORT,
        project_id: `eq.${texte(projectId)}`,
        order: "created_at.desc",
        limit: String(Math.max(1, Number(limite) || 300))
      }
    });
    if (!Array.isArray(lignes)) return null;

    // La plus récente d'abord : la première vue de chaque document est donc
    // celle qu'on garde.
    const vues = new Set();
    return lignes.filter((une) => {
      const cle = texte(une?.document) || texte(une?.id);
      if (vues.has(cle)) return false;
      vues.add(cle);
      return true;
    });
  } catch {
    return null;
  }
}
