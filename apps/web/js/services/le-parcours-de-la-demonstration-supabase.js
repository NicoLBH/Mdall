/**
 * Les faits du parcours, demandés à la base.
 *
 * ## Pourquoi un fichier à part
 *
 * `le-parcours-de-la-demonstration.js` est pur : des faits entrent, un état
 * sort, et il s'éprouve sans réseau. C'est lui qui porte les règles — l'ordre
 * de la chaîne, ce qu'une étape ne montre pas, la différence entre zéro et « on
 * ne sait pas ». Ici, il n'y a que des allers-retours.
 *
 * Et il y a une seconde raison, qui compte autant : **ce fichier nomme des
 * tables de contenu de projet** — les lectures conservées, les affirmations de
 * la mémoire. `la-cloison-de-la-console` refuse qu'un module nommant l'une de
 * ces tables soit emporté dans la console d'administration. Garder le module
 * pur à l'écart de ces noms est ce qui lui permet d'être lu partout.
 *
 * ## Sept comptes, et aucun contenu
 *
 * On ne demande que des nombres : `head: true` et `count: "exact"` ne ramènent
 * aucune ligne. Le parcours n'a pas besoin de savoir ce que les documents
 * disent — seulement s'il y en a. C'est aussi la requête la moins chère.
 *
 * Les affirmations sont la seule exception, et elle est nécessaire : le cran 4
 * — « quelle fonction emploie ce qu'une autre conclut » — ne se compte pas, il
 * se calcule en regardant les fonctions deux à deux. On demande donc leur
 * nature et leur charge, et rien de leur texte.
 *
 * ## `null` partout où l'on n'a pas su
 *
 * Chaque compte vaut `null` quand sa requête n'a pas abouti, et le parcours
 * affiche alors « sans réponse ». Rendre `0` ferait dire « ce chantier n'a
 * aucun document » d'un chantier dont on n'a pas pu lire les documents, et
 * l'on irait tout reverser (règle 5).
 *
 * **Un refus n'emporte pas les autres.** Les sept demandes partent ensemble et
 * se rendent une par une : ne pas savoir lire les propositions n'autorise pas à
 * taire les documents.
 */

import { supabase } from "../../assets/js/auth.js";
import {
  LES_FAITS_DU_PARCOURS, OU_SE_RANGENT_LES_LECTURES, unBlocDeLaMemoire
} from "./le-parcours-de-la-demonstration.js";
import { lesCheminsEntreBlocs } from "./les-crans-de-la-traduction.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Un compte, ou `null`.
 *
 * `count` peut revenir `null` sans erreur quand PostgREST n'a pas calculé
 * l'en-tête : c'est indiscernable d'un refus, et c'est donc traité comme tel.
 */
async function combien(table, serre) {
  try {
    const requete = serre(supabase.from(table).select("id", { count: "exact", head: true }));
    const { count, error } = await requete;
    if (error) return null;
    return Number.isFinite(Number(count)) ? Number(count) : null;
  } catch {
    return null;
  }
}

/**
 * La somme de plusieurs comptes, ou `null` **dès qu'un seul manque**.
 *
 * C'est le choix prudent, et c'est le bon : « 12 documents lus » sur deux
 * familles lues et une famille refusée est un chiffre faux présenté comme vrai.
 * Mieux vaut « sans réponse », qui envoie regarder, que douze qui envoient
 * conclure (règle 5).
 */
function laSomme(comptes) {
  if (comptes.some((un) => un === null)) return null;
  return comptes.reduce((total, un) => total + un, 0);
}

/**
 * Tout ce que le parcours a besoin de savoir d'un chantier.
 *
 * @param {string} projectId l'identifiant du projet, côté base
 * @returns {Promise<object>} les faits, nommés par `LES_FAITS_DU_PARCOURS`
 */
export async function lesFaitsDuParcours(projectId = "") {
  const projet = texte(projectId);
  if (!projet) {
    /**
     * **Sans projet, on ne sait rien — et surtout pas « rien ».**
     *
     * Un objet vide se lit « aucune réponse » dans le module pur, ce qui est
     * exactement juste : on n'a pas demandé. Rendre des zéros afficherait un
     * chantier vierge sur un projet qu'on n'a pas su résoudre.
     */
    return {};
  }

  const duProjet = (requete) => requete.eq("project_id", projet);

  const [documents, lectures, avecMdall, avecMesures, signees, memoire] = await Promise.all([
    // 1. Ce qui est versé : les documents du projet, sauf ceux qu'on a retirés.
    combien("documents", (q) => duProjet(q).is("deleted_at", null)),

    // 2. Ce qui est lu : une lecture conservée par famille.
    Promise.all(OU_SE_RANGENT_LES_LECTURES.map((table) => combien(table, duProjet)))
      .then(laSomme),

    /**
     * 3. Ce dont le Mdall se relit : les lectures qui portent leur analyse
     *    gelée. Une lecture sans elle existe — elle a été écrite avant que la
     *    colonne soit remplie — et l'onglet « Ce que nous avons compris » n'a
     *    alors rien à montrer. Les compter avec les autres promettrait un écran
     *    qui s'ouvrirait vide.
     */
    Promise.all(OU_SE_RANGENT_LES_LECTURES.map(
      (table) => combien(table, (q) => duProjet(q).not("analyse_gelee", "is", null))
    )).then(laSomme),

    /**
     * 4. Ce dont les preuves se lisent : les lectures qui portent leurs
     *    mesures. C'est ce que l'onglet Vérifications affiche — les citations
     *    retrouvées, les marques déclarées, la structure reconnue.
     */
    Promise.all(OU_SE_RANGENT_LES_LECTURES.map(
      (table) => combien(table, (q) => duProjet(q).not("mesures", "is", null))
    )).then(laSomme),

    // 5. Ce qui a été signé : une proposition fusionnée. `open` ne compte pas —
    //    c'est précisément l'étape qui n'a pas encore eu lieu.
    combien("propositions", (q) => duProjet(q).eq("status", "merged")),

    // 6 et 7. La mémoire, et les chemins qu'elle porte entre ses fonctions.
    lesAffirmationsDeLaMemoire(projet)
  ]);

  return {
    [LES_FAITS_DU_PARCOURS.DOCUMENTS_VERSES]: documents,
    [LES_FAITS_DU_PARCOURS.DOCUMENTS_ANALYSES]: lectures,
    [LES_FAITS_DU_PARCOURS.BLOCS_MDALL]: avecMdall,
    [LES_FAITS_DU_PARCOURS.PREUVES_POSEES]: avecMesures,
    [LES_FAITS_DU_PARCOURS.PROPOSITIONS_SIGNEES]: signees,
    [LES_FAITS_DU_PARCOURS.AFFIRMATIONS_EN_MEMOIRE]: memoire.affirmations,
    [LES_FAITS_DU_PARCOURS.PREDICTIONS_RENDUES]: memoire.chemins
  };
}

/**
 * Combien la mémoire porte d'affirmations, et combien de chemins entre
 * fonctions — **les deux de la même lecture**.
 *
 * Le second est le cran 4, et c'est ce qui rend une prédiction possible : une
 * fonction qui emploie ce qu'une autre conclut. Le calculer ici avec
 * `lesCheminsEntreBlocs` est ce qui garantit que le parcours compte les mêmes
 * chemins que ceux que l'écran de la Mémoire dessine (règle 4).
 */
async function lesAffirmationsDeLaMemoire(projet) {
  try {
    const { data, error } = await supabase
      .from("project_assertions")
      .select("id,subject_key,nature,payload")
      .eq("project_id", projet);

    if (error || !Array.isArray(data)) return { affirmations: null, chemins: null };

    const blocs = data.map(unBlocDeLaMemoire);
    return {
      affirmations: blocs.length,
      chemins: lesCheminsEntreBlocs(blocs).length
    };
  } catch {
    // Les deux ensemble : un compte d'affirmations sans ses chemins ferait dire
    // « la mémoire est là, elle ne prédit rien », ce qu'on ne sait pas.
    return { affirmations: null, chemins: null };
  }
}
