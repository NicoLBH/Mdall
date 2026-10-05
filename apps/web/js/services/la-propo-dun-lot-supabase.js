/**
 * Porter un lot de lectures dans **une seule** proposition.
 *
 * ## La mécanique, et pourquoi elle est déjà éprouvée
 *
 * `preparerUneProposition` ouvre une proposition quand on ne lui en donne
 * aucune, et **enrichit celle qu'on lui nomme** sinon. C'est exactement ce que
 * fait la fonction de bord qui lit dix-neuf comptes rendus : le premier ouvre,
 * les dix-huit suivants retrouvent. Un lot de douze lectures conservées est le
 * même geste, à ceci près que les lectures existent déjà.
 *
 * On ne réinvente donc rien : on boucle, et l'on passe à chaque tour
 * l'identifiant rendu au tour d'avant.
 *
 * ## En série, et jamais autrement
 *
 * Chaque appel lit ce que la proposition porte déjà avant d'y écrire — c'est
 * ainsi qu'elle refuse une ligne en double. Douze appels lancés ensemble
 * liraient tous le même état initial, et douze documents qui disent la même
 * chose du même sujet écriraient douze lignes au lieu d'une.
 *
 * ## La marque se pose au fur et à mesure, et non à la fin
 *
 * Dès qu'une lecture est passée, sa ligne reçoit `proposition_id`. Si la
 * septième échoue, les six premières sont déjà marquées : un second clic
 * reprend à la septième, au lieu de reverser les six (règle 6).
 *
 * L'inverse — marquer à la fin — a déjà coûté deux propositions vides à la
 * fonction de bord, et le commentaire qui le raconte est encore dans son code.
 *
 * ## Une lecture qui n'apporte rien est marquée quand même
 *
 * Elle est passée. Ne pas la marquer la ferait revenir dans chaque lot suivant,
 * pour n'y rien donner chaque fois, et le compteur de l'écran ne descendrait
 * jamais. `proposition_id` dit « passée par une proposition », pas « y a mis une
 * ligne » — et le bilan dit la différence.
 *
 * ## Rien n'est versé
 *
 * Une proposition **ouverte** sort d'ici. Personne n'a signé, la mémoire n'a
 * rien reçu, et c'est la fusion qui écrira — après une relecture humaine. C'est
 * le fondamental de Mdall, et ce module est précisément l'endroit où il serait
 * tentant de passer outre.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import { FAMILLE } from "./les-familles-de-document.js";
import { LE_SELECT_DUNE_LECTURE } from "./la-lecture-conservee.js";
import { LE_SELECT_DUN_RAPPORT } from "./la-lecture-dun-rapport.js";
import { leTitreDuLot } from "./ce-qui-attend-une-proposition.js";
import {
  leBilanDuLot, lesAffirmationsDuneLecture, lesEtapesDuLot, lintroDuLot
} from "./la-propo-dun-lot.js";

const SUPABASE_URL = getSupabaseUrl();

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/**
 * Où chaque famille garde ses lectures, et avec quelles colonnes.
 *
 * **Les colonnes viennent du produit**, et non d'une seconde liste : une colonne
 * ajoutée à la lecture et oubliée ici donnerait un lot composé sur moins que ce
 * que la lecture porte, sans que rien ne le dise (règle 10).
 */
const OU_LIRE = {
  [FAMILLE.CR]: { table: "cr_lectures", colonnes: LE_SELECT_DUNE_LECTURE },
  [FAMILLE.CONTROLE]: { table: "rapport_lectures", colonnes: LE_SELECT_DUN_RAPPORT }
};

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
 * Les lectures du lot, avec leur analyse gelée, retrouvées par leurs
 * identifiants.
 *
 * Le tableau de l'écran ne porte qu'un résumé : la composition a besoin de
 * l'analyse entière, qui est la plus grosse colonne et que la liste ne demande
 * jamais. On la demande donc ici, et seulement pour les lignes du lot.
 *
 * **Une famille illisible n'emporte pas les autres.** Ne pas savoir lire les
 * rapports n'est pas une raison de ne pas porter les comptes rendus ; ce qui
 * manque se dira dans le bilan, lecture par lecture.
 */
async function lesLecturesDuLot(lot) {
  const parId = new Map();

  for (const [famille, ou] of Object.entries(OU_LIRE)) {
    const ids = liste(lot)
      .filter((un) => texte(un?.famille) === famille)
      .map((un) => texte(un?.id))
      .filter(Boolean);
    if (!ids.length) continue;

    try {
      const lignes = await requete(ou.table, {
        params: { select: ou.colonnes, id: `in.(${ids.join(",")})` }
      });
      for (const ligne of liste(lignes)) {
        if (texte(ligne?.id)) parId.set(texte(ligne.id), ligne);
      }
    } catch (erreur) {
      console.warn(`[lot] ${ou.table} illisible`, erreur);
    }
  }

  return parId;
}

/**
 * Poser la marque sur une lecture.
 *
 * `null` quand la base a refusé — et l'appelant **continue**. Une marque qui ne
 * s'écrit pas fera revenir cette lecture dans un lot suivant : c'est un
 * désagrément, pas une perte. Arrêter le lot pour autant perdrait les lectures
 * qui restaient à porter, ce qui serait bien pire.
 */
async function marquerLaLecture(famille, id, propositionId) {
  const ou = OU_LIRE[texte(famille)];
  if (!ou || !texte(id) || !texte(propositionId)) return null;

  try {
    return await requete(ou.table, {
      method: "PATCH",
      params: { id: `eq.${texte(id)}` },
      body: { proposition_id: texte(propositionId) }
    });
  } catch (erreur) {
    console.warn(`[lot] marque non posée sur ${ou.table}/${id}`, erreur);
    return null;
  }
}

/**
 * Porter tout le lot dans une seule proposition.
 *
 * @param {object} options
 * @param {string} options.projectId le projet, côté base
 * @param {object[]} options.lot les lignes du tableau qui attendent, **dans
 *   l'ordre** où elles doivent entrer — c'est `leLotQuiAttend` qui le décide
 * @param {function} [options.surEtape] appelée avant chaque lecture, avec son
 *   étape. C'est ce qui fait avancer l'écran plutôt que de le figer.
 * @param {object[]|null} [options.assertions] la mémoire du projet, quand
 *   l'appelant l'a déjà. `null` : on la demande.
 * @returns {Promise<{ok, proposition, bilan, raison}>}
 */
export async function porterLeLotDansUneProposition({
  projectId = "", lot = [], surEtape = null, assertions = null
} = {}) {
  const projet = texte(projectId);
  if (!projet) return { ok: false, raison: "Ce projet n'est pas relié à la base.", bilan: null };

  const siens = liste(lot);
  if (!siens.length) return { ok: false, raison: "Il n'y a rien à porter.", bilan: null };

  const [{ preparerUneProposition }, memoire, lectures] = await Promise.all([
    import("./atelier-proposition.js"),
    /**
     * **La mémoire une seule fois, pour tout le lot.**
     *
     * Elle ne sert qu'à proposer la liaison des avis de bureau de contrôle. La
     * redemander à chaque lecture coûterait douze allers-retours pour une
     * réponse qui ne change pas : rien n'est versé pendant le lot, donc la
     * mémoire ne bouge pas.
     */
    Array.isArray(assertions) ? Promise.resolve(assertions) : laMemoire(projet),
    lesLecturesDuLot(siens)
  ]);

  const etapes = lesEtapesDuLot(siens);
  const portees = [];
  let propositionId = "";
  let proposition = null;

  for (const [rang, un] of siens.entries()) {
    const etape = etapes[rang];
    await surEtape?.(etape);

    const ligne = lectures.get(texte(un?.id)) ?? null;
    const famille = texte(un?.famille);
    const titre = texte(un?.titre);

    const porte = lesAffirmationsDuneLecture({ ligne, famille, assertions: memoire });

    if (!porte.affirmations.length) {
      /**
       * **Rien à porter, et la marque se pose quand même.**
       *
       * Elle est passée dans le lot. Sans la marque, elle reviendrait dans
       * chaque lot suivant pour ne rien donner chaque fois.
       *
       * Sauf s'il n'y a pas encore de proposition : il n'y a alors rien à quoi
       * la rattacher, et la marquer serait écrire un identifiant qui n'existe
       * pas. Elle reviendra au lot suivant, ce qui est exact — ce lot-ci n'a
       * rien ouvert.
       */
      if (propositionId) await marquerLaLecture(famille, texte(un?.id), propositionId);
      portees.push({ titre, affirmations: 0, ecartees: 0, motif: "", dit: porte.dit });
      continue;
    }

    const rendu = await preparerUneProposition({
      projectId: projet,
      propositionId,
      // Le titre et l'intro ne servent qu'à **l'ouverture** : les suivantes
      // enrichissent une proposition qui a déjà les siens.
      titre: propositionId ? "" : leTitreDuLot(siens),
      intro: propositionId ? "" : lintroDuLot(siens, porte),
      source: porte.source,
      affirmations: porte.affirmations
    });

    /**
     * **Un échec rend quand même la proposition qu'il a ouverte.**
     *
     * Sans cela, la lecture suivante en ouvrirait une deuxième, et un lot de
     * douze donnerait trois propositions à moitié remplies. C'est la leçon que
     * la fonction de bord porte dans son propre commentaire.
     */
    const neuf = texte(rendu?.proposition?.id);
    if (neuf) {
      propositionId = neuf;
      proposition = rendu.proposition;
    }

    if (!rendu?.ok) {
      portees.push({
        titre,
        affirmations: 0,
        ecartees: 0,
        motif: texte(rendu?.raison) || "la proposition n'a pas pu être préparée",
        dit: ""
      });
      continue;
    }

    await marquerLaLecture(famille, texte(un?.id), propositionId);
    portees.push({
      titre,
      affirmations: Number(rendu.items) || porte.affirmations.length,
      // Ce que la proposition portait déjà et a donc écarté. Deux rapports du
      // même chantier disent souvent la même chose du même point.
      ecartees: liste(rendu.tranches).length,
      motif: "",
      dit: ""
    });
  }

  const bilan = leBilanDuLot(portees);

  if (!proposition) {
    return {
      ok: false,
      // **Et non « il n'y avait rien ».** Le bilan dit lesquelles n'ont rien
      // donné et lesquelles ont échoué, et ce ne sont pas les mêmes suites.
      raison: "Aucune proposition n'a pu être ouverte.",
      bilan
    };
  }

  return { ok: true, proposition, bilan, raison: "" };
}

/** La mémoire du projet, ou `[]` si elle n'a pas pu être lue. */
async function laMemoire(projet) {
  try {
    const { listProjectAssertions } = await import("./project-memory-supabase.js");
    return liste(await listProjectAssertions(projet));
  } catch (erreur) {
    /**
     * **`[]` et non un refus.** La mémoire ne sert qu'à proposer la liaison d'un
     * avis — sur quelles lignes il porte. Sans elle, les avis entrent sans
     * liaison proposée, ce qui se voit et se corrige à la relecture. Refuser
     * tout le lot pour cela serait disproportionné.
     */
    console.warn("[lot] mémoire du projet illisible", erreur);
    return [];
  }
}

