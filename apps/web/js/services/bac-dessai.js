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
 * ## Une fonction lit ce qu'une autre conclut
 *
 * C'est ce qui manquait, et cela se voyait à l'écran : on écrivait « selon le
 * cas, le taux de TVA vaut 5 % ou 20 % », une règle le concluait — et le bac
 * demandait quand même un « taux » à taper à la main. Le modèle, lui, inventait
 * un appel de fonction que le langage ne connaît pas.
 *
 * Le langage n'avait besoin d'aucun mot de plus : **la conclusion d'une règle
 * vaut pour son sujet**, exactement comme dans la mémoire du projet, où elle
 * est versée et relue par les autres. Le bac ne faisait pas ce que la mémoire
 * fait ; il le fait maintenant, et c'est la même valeur au même nom (règle 4).
 *
 * ## Rien ne s'écrit
 *
 * Un `enregistre` dit « ceci irait dans `vent.ctr` » et n'y va pas. Le même
 * fichier, versé au projet plus tard, écrira pour de bon — et il n'aura pas
 * changé d'un caractère.
 */

import { lireUnFichier, nomsConclusParLeBloc, nomsLusParLeBloc } from "./memoire-en-lecture.js";
import { reglesVerseesUtiles } from "./fonctions-du-projet.js";
import { cleDuSujet } from "./memoire-identifiants.js";
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
        /**
         * **Les branches enchaînées descendent avec le reste.**
         *
         * Sans elles, l'évaluateur ne voyait que la première : « existant »
         * concluait, et « neuf » tombait sur le `sinon` — c'est-à-dire sur
         * rien. La règle avait deux cas sur trois qui ne servaient à rien, et
         * l'écran n'en disait pas un mot.
         */
        sinonSi: Array.isArray(bloc?.sinonSi) ? bloc.sinonSi : [],
        sinon: texte(bloc?.sinon),
        sauf: Array.isArray(bloc?.sauf) ? bloc.sauf : [],
        // Les valeurs que la fonction pose en les calculant. Sans elles,
        // l'évaluateur ne verrait ni ce que la règle calcule, ni ce que sa
        // conclusion nomme.
        calculs: Array.isArray(bloc?.calculs) ? bloc.calculs : [],
        // Et sa boucle, quand elle en a une : sans elle, les agrégats qui la
        // lisent restent muets et la fonction ne conclut rien — sans qu'un mot
        // dise que c'est le tableau qui manque.
        boucle: bloc?.boucle ?? null,
        // Et son abaque, quand elle est écrite en courbe : sans lui, la
        // fonction n'a plus ni loi ni points, et elle ne conclut rien.
        courbe: bloc?.courbe ?? null,
        // La lecture suggérée voyage avec la règle : versée, elle se relit
        // telle qu'elle a été signée.
        seLitEn: texte(bloc?.seLitEn)
      },
      ...(bloc?.agent ? { agent: { genre: texte(bloc.agent), utilitaire: texte(bloc.utilitaire) } } : {})
    }
  };
}

/** Les fonctions d'un brouillon : celles qui raisonnent, et elles seules. */
/**
 * Les fonctions versées que ce brouillon a besoin de rejouer.
 *
 * **Elles portent le nom du projet pour fichier**, et non celui d'un fichier du
 * brouillon : l'écran doit pouvoir dire d'où vient un verdict qu'on n'a pas
 * écrit. Les confondre ferait chercher dans son propre texte une ligne qui n'y
 * est pas.
 */
function fonctionsVerseesUtiles(fichiers, siennes, memoire) {
  if (!Array.isArray(memoire) || !memoire.length) return [];

  const lus = [];
  const conclus = [];
  for (const { bloc } of siennes) {
    lus.push(...nomsLusParLeBloc(bloc));
    conclus.push(...nomsConclusParLeBloc(bloc));
  }
  // Ce que les affirmations du brouillon posent compte aussi comme « sien » :
  // une valeur écrite à la main l'emporte sur ce que le projet déduit.
  for (const fichier of Array.isArray(fichiers) ? fichiers : []) {
    for (const bloc of lireUnFichier(fichier?.contenu ?? "").blocs ?? []) {
      conclus.push(...nomsConclusParLeBloc(bloc));
    }
  }

  return reglesVerseesUtiles(memoire, { lus, conclus })
    .map(({ bloc }) => ({ fichier: FICHIER_DU_PROJET, bloc, versee: true }));
}

/** D'où vient un verdict que le brouillon n'a pas écrit. */
export const FICHIER_DU_PROJET = "mémoire du projet";

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
      // **Une courbe raisonne**, elle aussi : sa loi est dans ses points, et
      // elle rend une valeur pour une autre. La laisser dehors reviendrait à
      // dire qu'un abaque n'est pas un raisonnement.
      if (!(bloc?.conditions ?? []).length && !(bloc?.calculs ?? []).length
        && !bloc?.agent && !bloc?.courbe) continue;
      fonctions.push({ fichier: texte(fichier?.nom), bloc });
    }
  }

  return fonctions;
}

/**
 * Ce que chaque fonction du brouillon conclut, et ce qu'elle a lu pour cela.
 *
 * ## Les fonctions versées jouent avec
 *
 * **Une fonction versée est une fonction.** Le brouillon qui nomme
 * « Couleur des volets » ne doit pas demander la couleur des volets à la main :
 * le projet sait la déduire, et c'est tout l'objet de l'avoir signée. Les
 * règles versées dont le brouillon a besoin sont donc jouées **avec** lui, dans
 * les mêmes passes — une chaîne mi-brouillon mi-mémoire se résout comme une
 * chaîne entière, parce que c'en est une.
 *
 * Elles ne sont pas **toutes** jouées : voir `reglesVerseesUtiles`. Et ce que
 * le brouillon conclut lui-même gagne toujours — on écrit peut-être une
 * nouvelle version de cette fonction-là, et c'est celle qu'on essaie qui doit
 * répondre.
 *
 * @param {{nom: string, contenu: string}[]} fichiers
 * @param {Map|object} reponses ce que le formulaire a recueilli
 * @param {object} [comment]
 * @param {object[]} [comment.memoire] les assertions du projet, quand on les a
 * @returns {{sujet, fichier, ligne, issue, valeur, ou, lectures, manquants, doutes}[]}
 */
export function lancerLeBrouillon(fichiers = [], reponses = null, { memoire = null } = {}) {
  const siennes = fonctionsDuBrouillon(fichiers);
  const fonctions = [...siennes, ...fonctionsVerseesUtiles(fichiers, siennes, memoire)];
  const valeurs = new Map(valeursDuLancement(fichiers, reponses));

  let resultats = [];

  /**
   * On rejoue tant qu'une conclusion neuve paraît.
   *
   * ## Pourquoi des passes, et pas un tri des dépendances
   *
   * Un tri demanderait de décider ce qu'un fichier signifie **avant** de le
   * lire de haut en bas, et de trancher les cycles qu'un humain finira par
   * écrire. Une passe ne décide rien : elle évalue tout le monde avec ce qu'on
   * sait, et recommence si l'on sait quelque chose de plus.
   *
   * **Elle s'arrête d'elle-même** : on ne remplace jamais une valeur, on n'en
   * ajoute que de nouvelles, et il y a un nombre fini de noms. La borne à une
   * passe par fonction ne fait que le dire à l'œil — une chaîne de `n`
   * fonctions se résout en `n` passes au pire, chaque passe en achevant au
   * moins une. Un cycle s'arrête là : ce qui reste indécidable le reste, et le
   * dit (règle 5).
   */
  for (let passe = 0; passe < Math.max(1, fonctions.length); passe += 1) {
    resultats = unePasse(fonctions, valeurs);

    const neuves = conclusionsNeuves(fonctions, resultats, valeurs);
    if (!neuves.size) break;
    for (const [cle, valeur] of neuves) valeurs.set(cle, valeur);
  }

  return resultats;
}

/**
 * Ce que les conclusions de cette passe apprennent — et rien qu'elles.
 *
 * **Une réponse du formulaire gagne toujours.** C'est ce qu'on vient
 * d'essayer : une conclusion qui l'écraserait ferait un formulaire décoratif,
 * et l'on ne comprendrait pas pourquoi changer un champ ne change rien.
 *
 * Une fonction qui ne sait pas n'apprend rien non plus : **une conclusion vide
 * n'est pas une valeur**. La poser quand même ferait lire « rien » comme une
 * réponse connue, et la règle d'en face conclurait sur du vide — ce que le bac
 * d'essai existe précisément pour empêcher (règle 5). Une seule garde le dit :
 * une règle qui ne sait pas rend une conclusion vide, et un agent aussi.
 */
function conclusionsNeuves(fonctions, resultats, valeurs) {
  const neuves = new Map();

  resultats.forEach((resultat, rang) => {
    if (!resultat.valeur) return;

    for (const nom of nomsConclusParLeBloc(fonctions[rang]?.bloc ?? {})) {
      const cle = cleDuSujet(nom);
      if (!cle || valeurs.has(cle) || neuves.has(cle)) continue;
      neuves.set(cle, resultat.valeur);
    }
  });

  return neuves;
}

/** Toutes les fonctions, évaluées avec ce qu'on sait à cet instant. */
function unePasse(fonctions, valeurs) {
  const lire = lecteurDeValeurs(valeurs);

  return fonctions.map(({ fichier, bloc, versee = false }) => {
    const evaluation = evaluerLaRegle(commeUneRegle(bloc), lire);

    const issue = bloc?.agent
      ? ISSUE.AU_SERVEUR
      : evaluation.tient === null
        ? ISSUE.INDECIDABLE
        : evaluation.tient === true ? ISSUE.TIENT : ISSUE.SINON;

    return {
      sujet: texte(bloc?.sujet),
      fichier,
      /**
       * **Vient-elle de la mémoire du projet ?**
       *
       * L'écran doit pouvoir le dire : un verdict qu'on n'a pas écrit, présenté
       * comme les siens, ferait chercher dans son propre texte une ligne qui
       * n'y est pas. Et c'est aussi une bonne nouvelle à montrer — le projet
       * sait déjà faire cela, on n'a pas à le réécrire.
       */
      versee,
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
      /**
       * Les branches enchaînées y sont **dans l'ordre où elles ont été lues**.
       *
       * Sans elles, une règle à trois cas concluait « 20 % » et ne montrait que
       * la lecture du premier cas, qui est faux : on voyait une condition
       * fausse au-dessus d'une conclusion juste, sans rien pour les relier.
       *
       * Celles qu'on n'a pas atteintes n'y sont pas : la règle ne les a pas
       * lues, et les afficher ferait croire qu'elle les a pesées.
       */
      lectures: [
        ...evaluation.conditions,
        ...(evaluation.sinonSi ?? []).flatMap((branche) => branche.conditions ?? []),
        ...evaluation.exceptions
      ].map((trace) => ({
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
      // Le tableau que la boucle a déroulé, quand la fonction en porte une :
      // c'est le **travail** de la fonction, et l'écran le montre.
      tableau: evaluation.tableau ?? null,
      // Les points d'une courbe et où la lecture est tombée : c'est ce qu'on
      // compare à la figure d'origine, et l'écran les dessine.
      points: evaluation.points ?? [],
      lecture: evaluation.lecture ?? null,
      // La lecture du tableau que la fonction **suggère**. Elle ne dessine
      // rien : elle dit ce qui s'ouvre en premier, et le lecteur change d'avis
      // d'un clic.
      seLitEn: texte(bloc?.seLitEn),
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
export function phraseDuLancement(resultats = [], { refus = [] } = {}) {
  const tous = Array.isArray(resultats) ? resultats : [];
  const rates = (Array.isArray(refus) ? refus : []).filter(Boolean);

  /**
   * **« Le brouillon ne raisonne pas encore » était faux, et c'est le pire.**
   *
   * Il raisonnait : il portait une ligne que la lecture a refusée. On lisait
   * donc « il n'y a rien » là où il fallait lire « il y a quelque chose, et je
   * ne l'ai pas compris » — et l'on cherchait ce qu'on avait oublié d'écrire au
   * lieu de regarder la ligne qui clochait (règle 5).
   */
  if (!tous.length && rates.length) {
    return `Rien ne se lance : ${rates.length} ${
      rates.length > 1 ? "lignes n'ont pas été comprises" : "ligne n'a pas été comprise"}.`;
  }

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
