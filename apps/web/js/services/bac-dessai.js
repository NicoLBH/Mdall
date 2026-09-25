/**
 * Lancer un brouillon de Mdall.
 *
 * ## Ce n'est pas exécuter du JavaScript
 *
 * Le langage y ressemble et n'en est pas. `memoire-evaluateur.js` existe depuis
 * l'étape 3 du rejeu : il est pur, et il interprète une règle **déjà lue** —
 * ses conditions, ses bornes, sa conclusion.
 *
 * ```
 * texte  →  lireUnFichier()  →  blocs  →  evaluerLaRegle()  →  verdict + trace
 * ```
 *
 * Ni `eval`, ni `Function`, ni bac à sable à construire. Un fichier qui
 * contiendrait `fetch(…)` ne serait pas dangereux : il serait **refusé à la
 * lecture**, comme une ligne qu'on ne sait pas lire. C'est le seul modèle de
 * sécurité dont on ait besoin, et il était déjà en place.
 *
 * ## Les trois valeurs de vérité sont l'intérêt de l'écran
 *
 * `vrai`, `faux`, et **`indécidable`**. Une condition dont l'entrée manque
 * n'est pas fausse. On écrit une règle, on ne remplit pas un champ, et l'écran
 * répond « je ne sais pas » au lieu de conclure `sinon`. C'est par cette
 * réponse-là qu'on apprend le langage, pas par une documentation.
 *
 * ## Rien ne s'écrit
 *
 * Un `enregistre` dit « ceci irait dans `vent.ctr` » et n'y va pas. Le même
 * fichier, versé au projet plus tard, écrira pour de bon — et il n'aura pas
 * changé d'un caractère.
 */

import { lireUnFichier } from "./memoire-en-lecture.js";
import { evaluerLaRegle, lecteurDeValeurs, phraseDuDoute } from "./memoire-evaluateur.js";
import { valeursDuLancement } from "./formulaire-du-brouillon.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'une fonction a répondu. */
export const ISSUE = {
  /** Ses conditions tiennent : elle conclut ce que `alors` dit. */
  TIENT: "tient",
  /** Elles ne tiennent pas : elle conclut son `sinon`, ou rien. */
  SINON: "sinon",
  /** Une entrée manque, une unité ne se compare pas. On ne tranche pas. */
  INDECIDABLE: "indecidable",
  /** Sa loi n'est pas dans le texte : elle appelle un agent (fondamental 9). */
  AU_SERVEUR: "au-serveur"
};

export const MOTS_DE_LISSUE = {
  [ISSUE.TIENT]: "conclut",
  [ISSUE.SINON]: "conclut, par défaut",
  [ISSUE.INDECIDABLE]: "ne sait pas",
  [ISSUE.AU_SERVEUR]: "appelle un agent"
};

/**
 * Le bloc lu, remis dans la forme que l'évaluateur attend.
 *
 * L'évaluateur lit une **affirmation de la mémoire** — `payload.regle`,
 * `payload.value` —, et la lecture d'un fichier rend un bloc à plat. Les deux
 * disent la même chose ; les rapprocher ici évite d'écrire un second évaluateur
 * pour le bac d'essai, qui divergerait de celui du projet au premier ajout
 * (règle 4).
 */
function commeUneRegle(bloc) {
  return {
    payload: {
      subject: texte(bloc?.sujet),
      value: texte(bloc?.alors),
      regle: {
        conditions: Array.isArray(bloc?.conditions) ? bloc.conditions : [],
        sinon: texte(bloc?.sinon),
        sauf: Array.isArray(bloc?.sauf) ? bloc.sauf : [],
        // Les valeurs que la fonction pose en les calculant. Sans elles,
        // l'évaluateur ne verrait ni ce que la règle calcule, ni ce que sa
        // conclusion nomme.
        calculs: Array.isArray(bloc?.calculs) ? bloc.calculs : []
      },
      ...(bloc?.agent ? { agent: { genre: texte(bloc.agent), utilitaire: texte(bloc.utilitaire) } } : {})
    }
  };
}

/** Les fonctions d'un brouillon : celles qui raisonnent, et elles seules. */
export function fonctionsDuBrouillon(fichiers = []) {
  const fonctions = [];

  for (const fichier of Array.isArray(fichiers) ? fichiers : []) {
    for (const bloc of lireUnFichier(fichier?.contenu ?? "").blocs ?? []) {
      // Une affirmation ne raisonne pas : elle pose. La lancer reviendrait à
      // évaluer une valeur contre elle-même.
      //
      // **Un calcul raisonne**, lui : une fonction sans condition qui pose
      // `calcule TVA = Prix HT * 20%` a quelque chose à rendre, et la laisser
      // dehors reviendrait à dire que l'arithmétique n'est pas du langage.
      if (!(bloc?.conditions ?? []).length && !(bloc?.calculs ?? []).length && !bloc?.agent) continue;
      fonctions.push({ fichier: texte(fichier?.nom), bloc });
    }
  }

  return fonctions;
}

/**
 * Ce que chaque fonction du brouillon conclut, et ce qu'elle a lu pour cela.
 *
 * @param {{nom: string, contenu: string}[]} fichiers
 * @param {Map|object} reponses ce que le formulaire a recueilli
 * @returns {{sujet, fichier, ligne, issue, valeur, ou, lectures, manquants, doutes}[]}
 */
export function lancerLeBrouillon(fichiers = [], reponses = null) {
  const lire = lecteurDeValeurs(valeursDuLancement(fichiers, reponses));

  return fonctionsDuBrouillon(fichiers).map(({ fichier, bloc }) => {
    const evaluation = evaluerLaRegle(commeUneRegle(bloc), lire);

    const issue = bloc?.agent
      ? ISSUE.AU_SERVEUR
      : evaluation.tient === null
        ? ISSUE.INDECIDABLE
        : evaluation.tient === true ? ISSUE.TIENT : ISSUE.SINON;

    return {
      sujet: texte(bloc?.sujet),
      fichier,
      ligne: Number(bloc?.ligne) || 0,
      issue,
      /**
       * Ce qu'elle conclut. **Vide quand elle ne sait pas** : rendre le `sinon`
       * d'une règle qu'on n'a pas pu évaluer serait indiscernable d'un résultat
       * calculé — c'est exactement ce que le bac d'essai existe pour empêcher.
       */
      valeur: texte(evaluation.valeur),
      /**
       * Où cela irait. Un `enregistre` dit « ceci irait dans `vent.ctr` » et n'y
       * va pas : le bac d'essai n'écrit nulle part.
       */
      ou: (bloc?.enregistre ?? []).map((sortie) => texte(sortie?.sujet)).filter(Boolean),
      // La trace : ce qu'elle a lu, et ce que chaque clause valait. Une règle
      // qui rend un verdict sans montrer sa lecture n'apprend rien.
      lectures: [...evaluation.conditions, ...evaluation.exceptions].map((trace) => ({
        sujet: texte(trace.sujet),
        operateur: texte(trace.operateur),
        attendu: (trace.attendu ?? []).map(texte).filter(Boolean),
        lu: texte(trace.lu),
        connu: Boolean(trace.connu),
        verite: trace.verite,
        pourquoi: trace.doute ? phraseDuDoute(trace.doute) : ""
      })),
      manquants: evaluation.manquants ?? [],
      /**
       * Ce que chaque `calcule` a donné, dans l'ordre où il est écrit.
       *
       * La trace du calcul, au même titre que celle des conditions : un nombre
       * sorti de nulle part est exactement ce qu'on refuse à un agent, et l'on
       * ne va pas l'accepter d'une règle sous prétexte qu'elle est écrite.
       */
      calculs: evaluation.calculs ?? [],
      // Un `et` et un `ou` sur la même règle se lisent de gauche à droite, sans
      // priorité. Le référentiel n'en produit pas ; une règle écrite à la main
      // qui en contient mérite d'être relue, et on le dit.
      melange: Boolean(evaluation.melange),
      doutes: (evaluation.doutes ?? []).map(phraseDuDoute).filter(Boolean)
    };
  });
}

/**
 * Ce que le lancement dit en une ligne.
 *
 * **Les indécidables passent devant.** Ce sont eux qu'on vient voir : une règle
 * qui conclut a fait son travail, une règle qui ne sait pas dit qu'il manque
 * quelque chose — et c'est cela qu'on veut corriger.
 */
export function phraseDuLancement(resultats = []) {
  const tous = Array.isArray(resultats) ? resultats : [];
  if (!tous.length) return "Aucune fonction à lancer : le brouillon ne raisonne pas encore.";

  const sansReponse = tous.filter((un) => un.issue === ISSUE.INDECIDABLE).length;
  const auServeur = tous.filter((un) => un.issue === ISSUE.AU_SERVEUR).length;
  const conclues = tous.length - sansReponse - auServeur;

  const dits = [];
  if (sansReponse) dits.push(`${sansReponse} ne ${sansReponse > 1 ? "savent" : "sait"} pas`);
  if (conclues) dits.push(`${conclues} ${conclues > 1 ? "concluent" : "conclut"}`);
  if (auServeur) dits.push(`${auServeur} ${auServeur > 1 ? "appellent" : "appelle"} un agent`);

  return `${tous.length} ${tous.length > 1 ? "fonctions" : "fonction"} — ${dits.join(", ")}.`;
}
