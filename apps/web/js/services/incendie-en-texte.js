/**
 * L'étude incendie, écrite — en deux fichiers, parce qu'il y a deux choses.
 *
 * ## Le partage, et pourquoi il est le point de tout ce fichier
 *
 * Une étude produit deux objets de natures très différentes :
 *
 * - **les règles appliquées** — « si le classement est 3e famille B, alors une
 *   colonne sèche de 65 mm par escalier ». Cela vaut pour mille bâtiments, ne
 *   change que si l'arrêté change, et c'est le capital de Mdall ;
 * - **ce que ce projet retient** — « Colonne sèche = exigée ». Cela vaut pour
 *   un bâtiment, change à chaque projet, et c'est la mémoire du client.
 *
 * Les écrire ensemble produisait des règles fausses. Faute de conditions, le
 * fichier les fabriquait à partir des valeurs conclues en amont et écrivait
 * `si Hauteur du plancher bas = 26` là où l'arrêté dit `≤ 28 m`. Une règle vraie
 * d'un seul bâtiment ne capitalise rien, et le diff mentait dans les deux sens :
 * il annonçait un changement de règle quand une cote du projet bougeait, et
 * n'annonçait rien quand l'arrêté était modifié.
 *
 * Le corpus publie donc maintenant les conditions de la branche empruntée
 * (voir `supabase/functions/incendie-habitation/conditions.js`), et ce fichier
 * les range là où elles valent :
 *
 * ```
 * escalier-b/incendie.ref   les règles appliquées, sans aucune valeur de projet
 * escalier-b/incendie.ctr   ce que le projet retient, et de quelle règle
 * ```
 *
 * ## Ce qui s'écrit, et ce qui s'écrit aussi
 *
 * Un module conclu qui exige quelque chose donne une affirmation. Mais deux
 * autres états comptent autant, et l'écran les faisait disparaître :
 *
 * - **sans objet** — le référentiel a examiné le cas et n'exige rien. Ce n'est
 *   pas une valeur manquante, c'est une conclusion, et c'est celle qu'on
 *   cherchera le jour où quelqu'un demandera « et pour la circulation
 *   horizontale ? » ;
 * - **en attente** — il manque une réponse. Ne pas savoir n'autorise pas à
 *   prétendre qu'il n'y a rien.
 *
 * Les **reformulations du cas** — « le bâtiment comporte un sous-sol » — n'ont
 * pas leur place dans un fichier d'exigences : elles décrivent l'entrée, pas la
 * sortie. Elles vivent dans l'en-tête du questionnaire, où on les a saisies.
 *
 * ## Ce n'est pas le moteur
 *
 * Le fichier ressemblera à un programme, et quelqu'un finira par croire qu'en
 * changeant une ligne il change le calcul. L'en-tête dit donc toujours ce qui
 * l'a produit — le référentiel, sa version, la date. C'est une transcription
 * d'une décision, pas la décision.
 */

import {
  enTeteDeFichier, blocDAffirmation, blocDeRegle, corpsDuFichier,
  nomDeFichier, cheminDeFichier, couperLUnite, estMesuree,
  PROVENANCE, STATUT, TOUTES_ZONES
} from "./memoire-en-texte.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Ce qu'une ligne déjà écrite est, pour qui la colore.
 *
 * On ne relit pas le texte : on regarde le **type du premier jeton**, que
 * l'écriture a posé. Relire ferait deux vérités pour une même ligne.
 */
function natureDeLaLigneEcrite(jetons = []) {
  const premier = jetons.find((jeton) => jeton.type !== "neutre");
  if (!premier) return "vide";
  if (premier.type === "mot-zone") return "zone";
  if (premier.type === "accolade") return "accolade";
  if (premier.type === "sujet") return "tete";
  return "detail";
}

/** Le texte qui fonde une conclusion, tel qu'on le cite. */
export function sourceDuModule(module = {}, referentiel = "") {
  const pourquoi = module.pourquoi ?? {};
  const article = texte(pourquoi.article)
    ? `article ${texte(pourquoi.article)}${texte(pourquoi.paragraphe) ? `, ${texte(pourquoi.paragraphe)}` : ""}`
    : texte(module.article) ? `article ${texte(module.article)}` : "";

  return [texte(referentiel), article].filter(Boolean).join(", ");
}

/**
 * Les conditions publiées par le corpus, mises dans la forme du langage.
 *
 * Rien n'est traduit : le serveur envoie déjà le sujet, l'opérateur, le seuil
 * et l'unité. On ne fait que joindre les conditions entre elles — la première
 * ouvre le `si`, les suivantes s'y ajoutent par un `et`.
 */
export function conditionsDuModule(module = {}) {
  const brutes = Array.isArray(module?.conditions) ? module.conditions : [];

  return brutes
    .filter((condition) => texte(condition?.sujet))
    .map((condition, rang) => ({
      sujet: texte(condition.sujet),
      operateur: texte(condition.operateur) || "=",
      valeur: (Array.isArray(condition.valeur) ? condition.valeur : [condition.valeur])
        .map(texte).filter(Boolean),
      unite: texte(condition.unite),
      logique: condition.logique === true,
      ...(rang === 0 ? {} : { joint: "et" })
    }));
}

/**
 * Un module conclu, en règle : ce que le texte exige, sans ce projet-ci.
 *
 * `null` quand le module n'a pas conclu, ou quand il ne pose aucune exigence :
 * une reformulation du cas n'est pas une règle du référentiel, c'est une
 * lecture de l'entrée.
 */
export function regleDuModule(module = {}, referentiel = "") {
  if (module?.exigence !== true) return null;
  if (texte(module.statut) !== "conclu") return null;

  const sujet = texte(module.titre);
  const valeur = texte(module.valeur);
  if (!sujet || !valeur) return null;

  const conditions = conditionsDuModule(module);
  const source = sourceDuModule(module, referentiel);
  // Une règle sans condition **et** sans source ne dit rien qu'on puisse
  // rejouer : elle n'a pas sa place dans un référentiel.
  if (!conditions.length && !source) return null;

  return {
    sujet,
    conditions,
    alors: valeur,
    provenance: source ? { type: PROVENANCE.TEXTE, quoi: source } : null,
    preuve: texte(module.pourquoi?.citation)
  };
}

/**
 * Un module, en affirmation de projet : ce que celui-ci retient.
 *
 * La règle n'est pas recopiée. La ligne dit de quelle règle la valeur sort, et
 * la règle vit dans le référentiel — une seule fois, pour tous les projets.
 *
 * ## La valeur s'écrit même quand rien n'est exigé
 *
 * Un module peut conclure une valeur **et** ne rien exiger : « Voie-engins =
 * non décrite », et les deux premières familles ne sont soumises à aucune
 * prescription d'accès. L'écriture posait alors « sans objet » **à la place**
 * de la valeur, et le graphe se cassait : « Voie-échelles » dépend de
 * « Voie-engins », dont le fichier ne disait plus rien.
 *
 * La valeur s'écrit donc toujours, et l'absence d'exigence est un **statut**.
 * C'est la seule façon de garder un fichier dont les règles se rejouent.
 */
export function affirmationDuModule(module = {}, referentiel = "", profondeur = 1) {
  const sujet = texte(module.titre);
  if (!sujet) return null;

  // Ce qui ne pose aucune exigence décrit l'entrée, pas la sortie.
  if (module.exigence !== true) return null;

  const valeur = texte(module.valeur);
  const sansObjet = texte(module.sansObjet);
  const enAttente = texte(module.statut) === "enAttente";
  const conclu = texte(module.statut) === "conclu";

  if (!conclu && !enAttente) return null;
  if (conclu && !valeur && !sansObjet) return null;

  const source = sourceDuModule(module, referentiel);
  const coupe = valeur && estMesuree(valeur) ? couperLUnite(valeur) : { nombre: valeur, unite: "" };

  const nature = enAttente ? "attente" : sansObjet ? "sans-objet" : "affirmation";
  const statut = enAttente ? STATUT.EN_ATTENTE : sansObjet ? STATUT.SANS_OBJET : STATUT.RETENU;

  // Ce qui retient une conclusion, ou ce qui fonde l'absence d'exigence : dans
  // les deux cas, c'est ce qu'on cherchera d'abord.
  const manque = (Array.isArray(module.manque) ? module.manque : []).map(texte).filter(Boolean);
  const preuve = enAttente
    ? (manque.length ? `Il manque : ${manque.join(", ")}.` : "")
    : sansObjet;

  return {
    nature,
    lignes: blocDAffirmation({
      sujet,
      valeur: coupe.nombre,
      unite: coupe.unite,
      // La provenance est la **règle** quand il y en a une : c'est elle qui a
      // produit la valeur, et c'est par elle qu'on remonte au texte. Un seul
      // chaînon par ligne, sinon on ne sait plus lequel suivre.
      //
      // Quand le module n'a rien conclu, aucune règle ne figure au référentiel
      // et pointer vers elle mènerait nulle part. La ligne renvoie alors
      // directement au texte, ce qu'elle fait honnêtement : c'est une lecture,
      // pas une déduction.
      provenance: source
        ? { type: valeur ? PROVENANCE.REGLE : PROVENANCE.TEXTE,
            quoi: valeur ? `${sujet} — ${source}` : source }
        : null,
      preuve,
      statut
    }, profondeur)
  };
}

/**
 * Le référentiel appliqué, en un fichier.
 *
 * Aucune valeur de ce projet n'y figure. C'est ce qui le rend réutilisable, et
 * c'est aussi ce qui fait qu'un changement de l'arrêté s'y voit — alors qu'il
 * ne se voyait nulle part quand la règle était fondue dans le fichier du
 * projet.
 */
export function fichierDesRegles(vue, {
  chemin = ["Mémoire", "Incendie"],
  extension = "ref",
  zone = TOUTES_ZONES,
  referentiel = "arrêté du 31 janvier 1986 modifié",
  produitPar = "l'agent incendie — habitation",
  le = ""
} = {}) {
  const modules = Array.isArray(vue?.modules) ? vue.modules : [];

  const blocs = modules
    .map((module) => regleDuModule(module, referentiel))
    .filter(Boolean)
    .map((regle) => blocDeRegle(regle, 1));

  const corps = corpsDuFichier([{ zone, blocs }])
    .map((jetons) => ({ nature: natureDeLaLigneEcrite(jetons), jetons }));

  return {
    nom: nomDeFichier(chemin, extension),
    chemin: cheminDeFichier(chemin, extension),
    enTete: enTeteDeFichier({ chemin, extension, produitPar, le }),
    lignes: corps,
    compte: { regles: blocs.length }
  };
}

/**
 * L'étude entière, en un fichier de projet.
 *
 * L'ordre est celui du référentiel : il a posé ses questions dans l'ordre où
 * elles s'enchaînent, et relire le fichier dans un autre ordre ferait perdre le
 * fil du raisonnement.
 *
 * @param {object} vue ce que le référentiel a rendu
 * @param {object} options
 * @param {string[]} options.chemin où le fichier se range
 * @param {string} options.referentiel le texte appliqué
 * @param {string} options.produitPar l'utilitaire et sa version
 * @param {string} options.le la date, en clair
 */
export function fichierDeLEtude(vue, {
  chemin = ["Mémoire", "Incendie"],
  extension = "ctr",
  zone = TOUTES_ZONES,
  referentiel = "arrêté du 31 janvier 1986 modifié",
  produitPar = "l'agent incendie — habitation",
  le = ""
} = {}) {
  const modules = Array.isArray(vue?.modules) ? vue.modules : [];

  const entrees = modules
    .map((module) => affirmationDuModule(module, referentiel))
    .filter(Boolean);

  const corps = corpsDuFichier([{ zone, blocs: entrees.map((entree) => entree.lignes) }])
    .map((jetons) => ({ nature: natureDeLaLigneEcrite(jetons), jetons }));

  return {
    nom: nomDeFichier(chemin, extension),
    chemin: cheminDeFichier(chemin, extension),
    enTete: enTeteDeFichier({ chemin, extension, produitPar, le }),
    lignes: corps,
    // Ce que le fichier porte, en chiffres. Rien n'est estimé : ce sont des
    // comptes, et ils disent ce qu'on lira avant d'ouvrir.
    compte: {
      affirmations: entrees.filter((entree) => entree.nature === "affirmation").length,
      sansObjet: entrees.filter((entree) => entree.nature === "sans-objet").length,
      attente: entrees.filter((entree) => entree.nature === "attente").length
    }
  };
}
