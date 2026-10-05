/**
 * La relation entre deux lectures — **ce qui doit tenir, et non ce qui est vrai.**
 *
 * ## Le principe
 *
 * On ne sait pas quelle est la bonne lecture d'un document : il faudrait que
 * quelqu'un l'ait écrite, et c'est le jeu de référence, qui coûte cher. Mais on
 * sait, sans oracle, ce qui doit tenir **entre** la lecture d'un document et
 * celle du même document perturbé. C'est tout ce que ce module vérifie.
 *
 * ## Le piège qu'il ferme : la relation qui ne peut pas tomber
 *
 * Deux relevés vides sont identiques. Une lecture qui ne trouve rien passe donc
 * « rien ne change » sans avoir rien lu, et la batterie rend du vert sur une
 * analyse muette — exactement le contraire de ce qu'on lui demande.
 *
 * `SANS_OBJET` est donc un verdict à part entière, et il se compte à part. Une
 * batterie dont la moitié des épreuves sont sans objet n'est pas une batterie
 * qui passe : c'est une batterie qui n'a pas eu lieu, et il faut le voir.
 */

const texte = (valeur) => String(valeur ?? "").trim();

import { RELATION } from "./les-perturbations.js";
import { combienDeReleves } from "../la-mesure-des-analyses/lempreinte-dune-lecture.js";
import { ceQuiSepare } from "../la-mesure-des-analyses/ce-qui-separe.js";

/** Ce qu'une épreuve rend. */
export const VERDICT = {
  /** La relation tient. */
  TIENT: "tient",
  /** Elle ne tient pas : c'est un défaut de lecture. */
  TOMBE: "tombe",
  /**
   * Il n'y avait rien à vérifier. **Ce n'est pas une réussite** : c'est une
   * épreuve qui n'a pas eu lieu, et la compter avec les réussites ferait passer
   * une lecture muette pour une lecture juste (règle 5).
   */
  SANS_OBJET: "sans_objet"
};

const sansObjet = (dit) => ({ verdict: VERDICT.SANS_OBJET, dit });
const tient = (dit) => ({ verdict: VERDICT.TIENT, dit });
const tombe = (dit) => ({ verdict: VERDICT.TOMBE, dit });

/**
 * La relation tient-elle ?
 *
 * @param {string} relation l'une de `RELATION`
 * @param {object} avant l'empreinte de la lecture du document d'origine
 * @param {object} apres l'empreinte de la lecture du document perturbé
 * @param {object} fait ce que la perturbation a rendu : `{porte, substitution, bascule}`
 */
export function laRelationTient(relation = "", avant = null, apres = null, fait = null) {
  /**
   * **Rien à comparer n'est pas « tout va bien ».** Une lecture qui ne relève
   * rien rend deux empreintes vides, et toute relation y tient par construction.
   */
  if (!combienDeReleves(avant)) {
    return sansObjet("la lecture d'origine ne relève rien : il n'y a rien à comparer");
  }

  if (relation === RELATION.RIEN_NE_CHANGE || relation === RELATION.TOUT_SUIT) {
    const substitution = relation === RELATION.TOUT_SUIT ? (fait?.substitution ?? null) : null;
    if (relation === RELATION.TOUT_SUIT && !substitution) {
      return sansObjet("la perturbation ne dit pas quelle référence elle a renommée");
    }

    const ecarts = ceQuiSepare(avant, apres, { substitution });
    return ecarts.length
      ? tombe(ecarts.join(" · "))
      : tient(`${avant.parCle.size} relevés identiques`);
  }

  if (relation === RELATION.LE_CONSTAT_SINVERSE) {
    const porte = texte(fait?.porte);
    const de = texte(fait?.bascule?.de);
    const vers = texte(fait?.bascule?.vers);
    if (!porte || !de || !vers) {
      return sansObjet("la perturbation ne dit pas quel relevé elle a nié");
    }

    // La clé est normalisée dans l'empreinte ; la référence du document ne l'est
    // pas. On cherche donc le relevé dont la référence est celle qu'on a touchée.
    const trouve = [...avant.parCle.values()].find((un) => texte(un.reference) === porte);
    if (!trouve) {
      return sansObjet(`la lecture d'origine ne relève pas « ${porte} » : rien à inverser`);
    }

    const apresLui = apres?.parCle?.get(trouve.cle);
    if (!apresLui) return tombe(`« ${porte} » a disparu de la lecture du document nié`);

    if (texte(trouve.marque) !== de) {
      return sansObjet(`la lecture d'origine donne « ${texte(trouve.marque) || "(vide)"} » `
        + `à « ${porte} », là où le document écrit « ${de} » : la bascule ne se juge pas`);
    }

    if (texte(apresLui.marque) !== vers) {
      return tombe(`« ${porte} » : le document dit maintenant « ${vers} », `
        + `la lecture dit toujours « ${texte(apresLui.marque) || "(vide)"} » — `
        + "elle ne lit pas la ligne, elle la devine");
    }

    /**
     * **Et le reste n'a pas bougé.** Sans cela, une lecture qui recompose tout
     * le relevé passerait parce qu'une marque, au milieu du désordre, se trouve
     * être la bonne.
     */
    const autres = ceQuiSepare(avant, apres)
      .filter((un) => !un.includes(`« ${trouve.cle} » : marque`));
    return autres.length
      ? tombe(`la marque a bien basculé, mais le reste a bougé : ${autres.join(" · ")}`)
      : tient(`« ${porte} » : ${de} → ${vers}, et rien d'autre n'a bougé`);
  }

  if (relation === RELATION.LES_MARQUES_NE_SE_RESOLVENT_PLUS) {
    if (!avant.legende.length) {
      return sansObjet("la lecture d'origine ne lit aucune légende : son retrait ne se mesure pas");
    }
    if (apres?.sansStructure === true) {
      return tient("la lecture dit que la structure n'a pas été reconnue");
    }
    return apres?.legende?.length
      ? tombe(`la légende a été retirée du document, et la lecture en rend `
        + `${apres.legende.length} marques : elle les prend ailleurs que dans le document`)
      : tient("la lecture ne rend aucune marque résolue, et ne prétend donc pas en savoir");
  }

  /**
   * **Une relation inconnue est un refus, pas un passage.** Ajouter une
   * perturbation sans dire ce qui doit tenir rendrait du vert silencieux sur une
   * épreuve que personne n'a écrite.
   */
  return tombe(`relation inconnue : « ${texte(relation) || "(vide)"} »`);
}
