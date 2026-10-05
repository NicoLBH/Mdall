/**
 * L'empreinte d'une lecture — **ce qu'on compare quand on compare deux lectures.**
 *
 * ## Pourquoi une empreinte, et non la lecture entière
 *
 * Deux lectures du même document ne sont jamais identiques octet pour octet :
 * la transcription reformule, l'ordre des phrases d'un constat bouge, le modèle
 * change de mot. Comparer les objets bruts rendrait « ça a changé » à chaque
 * fois, et la batterie n'apprendrait rien.
 *
 * Il faut donc décider **ce qui a le droit de varier**, et l'écrire une fois.
 * C'est tout le contenu de ce module, et c'est la décision la plus lourde de la
 * batterie : trop permissive, elle laisse passer de vrais défauts ; trop
 * stricte, elle crie à chaque lecture et l'on cesse de la regarder.
 *
 * ## Ce qui ne varie pas
 *
 *   * **l'ensemble des références relevées** — un avis qui disparaît est un avis
 *     perdu, quelle que soit la perturbation ;
 *   * **la marque de chacun** — c'est le verdict, et c'est lui qu'on cherche ;
 *   * **la citation** — elle doit se retrouver mot pour mot dans le document.
 *
 * ## Ce qui a le droit de varier
 *
 *   * **l'ordre**, qui n'est pas comparé du tout aujourd'hui : une perturbation
 *     qui réordonne deux paragraphes indépendants doit laisser le relevé
 *     identique **en contenu**, et son ordre peut suivre le document. Qu'il le
 *     suive bien est une seconde question, qu'aucune relation ne pose encore ;
 *   * **le numéro de page**, que presque toute perturbation déplace ;
 *   * **les mots du constat**, dont seule la présence est contrôlée.
 *
 * ## La clé d'un relevé
 *
 * La référence quand il y en a une, l'intitulé sinon. Un relevé sans l'un ni
 * l'autre n'a pas de clé : il ne se compare à rien et se compte à part, parce
 * qu'un relevé qu'on ne sait pas rapprocher n'est pas un relevé qui a disparu.
 */

import { FAMILLE } from "../../apps/web/js/services/les-familles-de-document.js";

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/**
 * Comment chaque famille se projette sur la forme commune.
 *
 * **Une famille absente d'ici n'est pas une famille qu'on saute en silence** :
 * `lempreinteDuneLecture` lève, et le lanceur le dit. Une batterie qui ignore
 * poliment ce qu'elle ne sait pas faire rend un résultat vert sur un corpus
 * qu'elle n'a pas lu (règle 5).
 */
const LA_PROJECTION = {
  /**
   * Un avis de bureau de contrôle. `marque` est la lettre de la colonne — « F »,
   * « SO », « D » —, c'est-à-dire exactement le verdict qu'une négation doit
   * faire basculer.
   */
  [FAMILLE.CONTROLE]: (lecture) => ({
    releve: liste(lecture?.avis).map((un) => ({
      reference: texte(un?.reference),
      intitule: texte(un?.intitule),
      marque: texte(un?.marque),
      constat: texte(un?.constat),
      citation: texte(un?.citation)
    })),
    legende: liste(lecture?.legende).map((une) => texte(une?.marque)).filter(Boolean),
    sansStructure: lecture?.sansStructure === true,
    ecartes: Number(lecture?.avisEcartes) || 0
  }),

  /**
   * Un point de compte rendu. C'est `etat` qui porte le verdict — « en cours »,
   * « soldé ».
   *
   * ## Et **aucune légende**, ce qui est le vrai énoncé
   *
   * Les libellés de rubrique y tenaient lieu de légende. C'était faux, et le jeu
   * de référence l'a fait apparaître : une **légende** est la table qui déclare
   * le sens des marques, et l'invariant « toute marque employée est déclarée »
   * s'appuie dessus. Les rubriques d'un compte rendu ne déclarent rien de ses
   * états — ce sont deux classements sans rapport, et les confondre faisait
   * tomber l'invariant sur chaque point d'un compte rendu parfaitement lu.
   *
   * **Un compte rendu ne déclare pas le sens de ses états.** C'est un fait du
   * document, pas un manque de la lecture : l'invariant ne se pose donc pas, et
   * `les-invariants.js` sait déjà le dire.
   */
  [FAMILLE.CR]: (lecture) => ({
    releve: liste(lecture?.points).map((un) => ({
      reference: texte(un?.reference),
      intitule: texte(un?.titre),
      marque: texte(un?.etat),
      constat: texte(un?.description),
      citation: texte(un?.citation)
    })),
    legende: [],
    sansStructure: lecture?.sansStructure === true,
    ecartes: Number(lecture?.ecartes) || 0
  })
};

/** Les familles que la batterie sait projeter. Les autres se refusent. */
export const LES_FAMILLES_PROJETEES = Object.keys(LA_PROJECTION);

/**
 * La clé d'un relevé : sa référence, ou son intitulé à défaut.
 *
 * **Normalisée**, parce que `A-12` et `a‑12` désignent le même avis et qu'une
 * perturbation qui change une casse ferait sinon disparaître un relevé et en
 * apparaître un autre — deux défauts annoncés là où il n'y en a aucun.
 */
export function laCleDunReleve(un = null) {
  const brut = texte(un?.reference) || texte(un?.intitule);
  return brut
    .toLocaleLowerCase("fr")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * L'empreinte d'une lecture d'une famille donnée.
 *
 * @throws si la famille n'a pas de projection — voir `LA_PROJECTION`.
 */
export function lempreinteDuneLecture(lecture = null, famille = "") {
  const projeter = LA_PROJECTION[texte(famille)];
  if (!projeter) {
    throw new Error(`La batterie ne sait pas projeter la famille « ${texte(famille) || "(vide)"} ».`);
  }

  const brute = projeter(lecture);
  const parCle = new Map();
  const sansCle = [];

  for (const un of brute.releve) {
    const cle = laCleDunReleve(un);
    if (!cle) { sansCle.push(un); continue; }

    /**
     * **Le premier gardé, et les suivants comptés.** Deux relevés de même clé
     * dans un seul document sont eux-mêmes un défaut ; écraser le premier le
     * cacherait, et lever ici ferait perdre toute la lecture pour un doublon.
     */
    if (parCle.has(cle)) { parCle.get(cle).doubles += 1; continue; }
    parCle.set(cle, { ...un, cle, doubles: 0 });
  }

  return {
    /**
     * Les relevés rapprochables, par clé.
     *
     * **Et l'ordre n'est pas gardé.** Une première version portait la liste des
     * clés « pour comparer l'ordre à part » — et rien ne la lisait. Un champ
     * livré avec la promesse d'une comparaison qui n'existe pas se lit comme une
     * comparaison faite. Toutes les relations sont donc, aujourd'hui, **à
     * l'ordre près** ; c'est une limite, et elle est dite dans la notice.
     */
    parCle,
    /** Ceux qu'on ne sait pas rapprocher : comptés, jamais confondus avec une perte. */
    sansCle,
    legende: brute.legende,
    sansStructure: brute.sansStructure,
    ecartes: brute.ecartes
  };
}

/** Combien de relevés cette empreinte porte, rapprochables ou non. */
export function combienDeReleves(empreinte = null) {
  return (empreinte?.parCle?.size ?? 0) + liste(empreinte?.sansCle).length;
}
