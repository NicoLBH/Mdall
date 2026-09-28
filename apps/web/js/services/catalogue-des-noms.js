/**
 * Ce qu'on peut nommer en écrivant du Mdall, et d'où chaque nom vient.
 *
 * ## Le verrou que ça lève
 *
 * Mdall n'a **pas d'appel de fonction** : une fonction conclut sous son propre
 * nom, et les autres la lisent comme n'importe quel nom. Composer, c'est donc
 * exactement une chose — **nommer ce qu'une autre fonction conclut**.
 *
 * D'où le verrou, et il n'est pas grammatical : on ne compose pas avec ce
 * qu'on ne sait pas nommer. L'écran d'écriture proposait les mots du langage et
 * les noms déclarés ; il ne proposait ni ce que les fonctions du brouillon
 * concluent, ni ce que l'établi contient. Écrire `Prix TTC` en lisant
 * `Taux de TVA` demandait donc de se souvenir qu'on avait écrit `Taux de TVA`
 * trente lignes plus haut — et rien à l'écran ne le disait.
 *
 * ## Il se **déduit**, il ne se déclare pas
 *
 * Aucune liste tenue à la main : les noms sortent du texte qu'on a écrit, des
 * fonctions que le langage porte, et des utilitaires qu'on a gardés. Un nom
 * qu'on ajoute paraît au catalogue sans qu'on y pense, et un nom qu'on efface
 * en disparaît — une liste recopiée aurait vieilli au premier renommage
 * (règle 4).
 *
 * ## Une seule liste, deux lectures
 *
 * La complétion à la frappe et le catalogue qu'on parcourt répondent à la
 * **même** question, posée à deux moments : « que puis-je nommer ici ? ». Elles
 * lisent donc la même liste. Deux réponses finiraient par différer, et c'est la
 * pire des divergences : celle où l'écran propose un nom que le parcours ne
 * montre pas, ou l'inverse (règle 10).
 *
 * ## Ce qu'il ne fait pas
 *
 * **Il n'invente aucun nom.** Ce qui n'est écrit nulle part ne se propose pas :
 * une complétion inventée se tape plus vite qu'elle ne se vérifie, et l'on
 * écrirait des renvois vers rien.
 *
 * **Il ne lit pas la mémoire du projet.** Ce que le projet a signé est une
 * quatrième source, et elle demande d'aller la chercher en base : l'écran
 * d'écriture n'en tient aucune aujourd'hui, et le bac d'essai demande à la main
 * ce qu'aucune fonction ne conclut. C'est dit dans `à traiter plus tard` plutôt
 * que deviné ici.
 *
 * **Il ne rend pas un nom de l'établi utilisable.** Un utilitaire gardé vit
 * dans un autre brouillon : son nom se voit, et il faut le **reprendre** pour
 * s'en servir. Le dire est tout l'intérêt — le taire ferait écrire une fonction
 * qui lit un nom que personne ne conclut, et la règle resterait indécidable.
 */

import { lireUnFichier, nomsConclusParLeBloc, nomsLusParLeBloc } from "./memoire-en-lecture.js";
import { cleDuSujet } from "./memoire-identifiants.js";
import { valeursPosees } from "./formulaire-du-brouillon.js";
import { FONCTIONS } from "./mdall-calcul.js";
import { DIT_DE_LAGREGAT, PHRASE_DE_LAGREGAT } from "./memoire-en-texte.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * D'où un nom vient, et c'est la seule chose qui décide de ce qu'on en fait.
 *
 * L'ordre est celui du parcours : **ce qui est le plus à portée de main
 * d'abord**. Une locale est sous le curseur, un nom déclaré est dans le
 * fichier, un utilitaire est ailleurs et demande un geste.
 */
export const ORIGINE = {
  /** Un `calcule` de la fonction où l'on écrit. */
  LOCALE: "locale",
  /** Un `const` du brouillon : son type, son unité, son domaine. */
  DECLARE: "declare",
  /** Une fonction du brouillon le conclut : c'est là que la composition se fait. */
  CONCLU: "conclu",
  /** Une affirmation du brouillon le pose, sans condition. */
  POSE: "pose",
  /** Une fonction du langage : `racine`, `arrondi`, `min`. */
  FONCTION: "fonction",
  /** Un agrégat : `le plus grand de`, `la somme de`. */
  AGREGAT: "agregat",
  /** Un utilitaire de l'établi le conclut. À reprendre pour s'en servir. */
  ETABLI: "etabli",
  /**
   * Une fonction **versée dans la mémoire de ce projet** le conclut.
   *
   * C'était la quatrième source, et la seule qui manquait. Elle se lit d'ici —
   * contrairement à l'établi : la règle est dans ce projet, sur les valeurs de
   * ce projet, et le bac d'essai la rejoue pour le montrer.
   */
  PROJET: "projet"
};

/** Le titre de chaque rayon du catalogue, à l'écran. */
export const NOM_DE_LORIGINE = {
  [ORIGINE.LOCALE]: "Calculé dans cette fonction",
  [ORIGINE.DECLARE]: "Déclaré dans ce brouillon",
  [ORIGINE.CONCLU]: "Conclu par une fonction d'ici",
  [ORIGINE.POSE]: "Posé par ce brouillon",
  [ORIGINE.FONCTION]: "Les fonctions du langage",
  [ORIGINE.AGREGAT]: "Lire le tableau d'un « pour chaque »",
  [ORIGINE.ETABLI]: "Sur votre établi",
  [ORIGINE.PROJET]: "Versé dans la mémoire du projet"
};

/**
 * Ce que chaque rayon dit de lui-même, sous son titre.
 *
 * **Celui de l'établi porte la seule réserve du catalogue**, et elle compte :
 * ces noms-là ne se lisent pas d'ici. L'écrire sous le titre plutôt que sur
 * chaque fiche le dit une fois, à l'endroit où l'on décide de descendre ou non.
 */
export const DIT_DE_LORIGINE = {
  [ORIGINE.LOCALE]: "Posé au-dessus du curseur, et lisible jusqu'à la fin de la fonction.",
  [ORIGINE.DECLARE]: "Ce que l'écran saura demander, et dans quelle unité.",
  [ORIGINE.CONCLU]: "Nommez-le dans une autre fonction : c'est ainsi qu'on enchaîne.",
  [ORIGINE.POSE]: "Une valeur posée sans condition : elle se lit comme les autres.",
  [ORIGINE.FONCTION]: "Elles s'écrivent dans un calcul, et leurs arguments se séparent d'un point-virgule.",
  [ORIGINE.AGREGAT]: "Une boucle rend un tableau ; ces phrases en lisent une colonne.",
  [ORIGINE.ETABLI]: "Ces noms-là vivent ailleurs : reprenez l'utilitaire pour vous en servir.",
  [ORIGINE.PROJET]: "Le projet les a signés : nommez-les, l'essai les rejoue sur vos réponses."
};

/** L'ordre des rayons : ce qui est à portée de main d'abord. */
export const ORDRE_DES_ORIGINES = [
  ORIGINE.LOCALE, ORIGINE.DECLARE, ORIGINE.CONCLU, ORIGINE.POSE,
  ORIGINE.PROJET, ORIGINE.FONCTION, ORIGINE.AGREGAT, ORIGINE.ETABLI
];

/** Une entrée du catalogue, avec tous ses champs à leur place. */
function entree({ nom, origine, dit = "", lit = [], unite = "", valeurs = [], ou = "", comme = "", rend = null }) {
  return {
    nom: texte(nom),
    origine,
    dit: texte(dit),
    /**
     * Ce qu'une fonction annonce **rendre** : `{valeurs, unite}`, ou `null`.
     *
     * `unite` et `valeurs`, au-dessus, disent ce qu'un **nom déclaré** vaut ;
     * celui-ci dit ce qu'une **fonction conclut**. Les confondre ferait
     * annoncer qu'on peut saisir ce qui se déduit.
     */
    rend: rend ?? null,
    lit: (Array.isArray(lit) ? lit : []).map(texte).filter(Boolean),
    unite: texte(unite),
    valeurs: (Array.isArray(valeurs) ? valeurs : []).map(texte).filter(Boolean),
    /** Le fichier du brouillon, ou l'utilitaire de l'établi : d'où ça vient. */
    ou: texte(ou),
    /** Ce qu'on écrit pour s'en servir, quand l'écrire n'est pas évident. */
    comme: texte(comme)
  };
}

/**
 * Les noms du brouillon : ce qu'il déclare, ce qu'il conclut, ce qu'il pose.
 *
 * **Une fonction dit ce qu'elle lit**, et c'est ce qui rend le rayon utile :
 * devant `Prix TTC`, on veut savoir qu'il faudra `Prix HT` avant de l'écrire
 * dans une condition.
 */
export function nomsDuBrouillon(fichiers = []) {
  const trouves = [];
  const vus = new Set();

  /**
   * **Ce que le brouillon pose vraiment**, demandé là où le bac d'essai le
   * demande. Une affirmation porte une valeur ; une fonction, même à moitié
   * écrite, n'en porte pas — et la ranger parmi les valeurs posées ferait
   * écrire « Posé par ce brouillon » sous le nom d'une fonction qu'on est en
   * train de taper.
   */
  const posees = valeursPosees(fichiers);

  const poser = (une) => {
    const cle = cleDuSujet(une.nom);
    if (!cle || vus.has(cle)) return;
    vus.add(cle);
    trouves.push(une);
  };

  for (const fichier of Array.isArray(fichiers) ? fichiers : []) {
    const ou = texte(fichier?.nom);
    const lu = lireUnFichier(fichier?.contenu ?? "");

    for (const declaration of lu.declarations ?? []) {
      poser(entree({
        nom: declaration?.nom,
        origine: ORIGINE.DECLARE,
        // La description d'une déclaration est écrite pour cela : dire ce que
        // le nom désigne. La reformuler ici la ferait diverger de ce qui se lit
        // dans le fichier.
        dit: declaration?.description,
        unite: declaration?.unite,
        valeurs: declaration?.valeurs,
        ou
      }));
    }

    for (const bloc of lu.blocs ?? []) {
      const lit = sansLesSiennes(bloc, nomsLusParLeBloc(bloc));

      for (const nom of nomsConclusParLeBloc(bloc)) {
        const pose = posees.get(cleDuSujet(nom));

        poser(entree({
          nom,
          origine: pose ? ORIGINE.POSE : ORIGINE.CONCLU,
          // Une valeur posée se dit **par sa valeur** : « 12 m » répond à la
          // question qu'on se pose en la voyant, et aucune phrase ne le ferait
          // mieux.
          dit: pose || texte(bloc?.dit),
          // Un bloc qui pose une valeur n'a ni condition ni calcul — c'est ce
          // qui fait de lui une affirmation —, et `lit` y est donc vide de
          // lui-même : l'y forcer serait une seconde façon de dire la même
          // chose, qui cesserait un jour de dire pareil.
          lit,
          unite: texte(bloc?.unite),
          // Ce que la fonction annonce rendre : l'aide à la signature le
          // montre, et c'est la question qu'on se pose juste avant de la nommer.
          rend: bloc?.rend ?? null,
          ou
        }));
      }
    }
  }

  return trouves;
}

/**
 * Ce qu'une fonction lit **hors d'elle-même**.
 *
 * Un `calcule` qui reprend le `calcule` d'au-dessus ne lit rien de nouveau, et
 * une fonction ne se lit pas elle-même. Les garder ferait dire à `Prix TTC`
 * qu'il lui faut `TVA`, alors que c'est lui qui la pose — et l'on partirait
 * chercher une valeur qui n'existe pas.
 */
function sansLesSiennes(bloc, lus) {
  const siennes = new Set([
    ...nomsConclusParLeBloc(bloc).map(cleDuSujet),
    ...(Array.isArray(bloc?.calculs) ? bloc.calculs : []).map((un) => cleDuSujet(un?.nom))
  ].filter(Boolean));

  return lus.filter((nom) => !siennes.has(cleDuSujet(nom)));
}

/**
 * Les fonctions du langage, prises au langage.
 *
 * `FONCTIONS` les déclare une fois, avec ce qu'elles font et comment on les
 * écrit. Les recopier ici ferait un catalogue qui ne montre pas la fonction
 * qu'on vient d'ajouter — et personne ne verrait pourquoi (règle 10).
 */
export function nomsDuLangage() {
  return Object.entries(FONCTIONS).map(([nom, quoi]) => entree({
    nom,
    origine: ORIGINE.FONCTION,
    dit: quoi?.dit,
    comme: quoi?.comme
  }));
}

/**
 * Les agrégats, pris au langage.
 *
 * **Ils ne se proposent pas comme des noms** — on ne les *nomme* pas, on les
 * écrit —, et ils paraissent quand même au catalogue : c'est là qu'on cherche
 * ce que le langage sait faire d'un tableau, et personne ne devinera « le plus
 * grand de » sans l'avoir vu une fois.
 */
export function agregatsDuLangage() {
  return PHRASE_DE_LAGREGAT.map(([phrase, quoi]) => entree({
    nom: phrase,
    origine: ORIGINE.AGREGAT,
    dit: DIT_DE_LAGREGAT[quoi],
    comme: `calcule Le plus fort = ${phrase} Moment;`
  }));
}

/**
 * Les noms que les utilitaires de l'établi concluent.
 *
 * **Ce qu'ils lisent est dit aussi**, parce que c'est la première question
 * qu'on se pose devant un outil qu'on n'a pas écrit soi-même : qu'est-ce qu'il
 * me demandera ? L'établi porte déjà les deux, déduits de son texte.
 */
export function nomsDeLetabli(etabli = null) {
  const trouves = [];

  for (const un of Array.isArray(etabli) ? etabli : []) {
    const ou = texte(un?.nom);
    const lit = (un?.entrees ?? []).map(texte).filter(Boolean);

    for (const sortie of un?.sorties ?? []) {
      if (!texte(sortie)) continue;
      trouves.push(entree({
        nom: sortie,
        origine: ORIGINE.ETABLI,
        dit: un?.resume,
        lit,
        // La version fait partie de l'adresse : deux versions d'un utilitaire
        // ne concluent pas forcément la même chose.
        ou: un?.version ? `${ou} v${texte(un.version)}` : ou
      }));
    }
  }

  return trouves;
}

/**
 * Tout ce qu'on peut nommer, là où l'on écrit.
 *
 * **Le brouillon gagne sur l'établi** quand un nom est des deux côtés : celui
 * du brouillon est celui qui se lit, l'autre demanderait un geste. Montrer les
 * deux ferait choisir entre deux fiches identiques dont une seule marche.
 *
 * Les fonctions du langage, elles, ne rivalisent avec personne : `min` n'est
 * pas un nom qu'on lit, c'est un mot qu'on écrit. Un nom de brouillon qui
 * s'appellerait `min` ne l'effacerait donc pas du catalogue.
 */
export function catalogueDesNoms({ fichiers = [], etabli = null, locales = [], projet = null } = {}) {
  const posees = (Array.isArray(locales) ? locales : [])
    .map((nom) => entree({ nom, origine: ORIGINE.LOCALE }))
    .filter((une) => une.nom);

  const ici = new Set(posees.map((une) => cleDuSujet(une.nom)));
  const duBrouillon = nomsDuBrouillon(fichiers).filter((une) => !ici.has(cleDuSujet(une.nom)));
  const connus = new Set([...ici, ...duBrouillon.map((une) => cleDuSujet(une.nom))]);

  return [
    ...posees,
    ...duBrouillon,
    /**
     * **Ce que le projet a signé, juste après le brouillon.**
     *
     * Devant le langage, parce que c'est ce qu'on cherche ; derrière le
     * brouillon, parce qu'une fonction qu'on est en train de réécrire doit
     * répondre par la version qu'on essaie, pas par celle d'hier.
     */
    ...nomsDuProjet(projet).filter((une) => !connus.has(cleDuSujet(une.nom))),
    ...nomsDuLangage(),
    ...agregatsDuLangage(),
    ...nomsDeLetabli(etabli).filter((une) => !connus.has(cleDuSujet(une.nom)))
  ];
}

/**
 * Ce que la mémoire du projet conclut.
 *
 * `null` tant qu'on ne l'a pas demandée : un projet dont la mémoire n'est pas
 * lue et un projet qui ne conclut rien n'appellent pas la même phrase, et le
 * rayon ne paraît que lorsqu'il a quelque chose à montrer (règle 5).
 */
function nomsDuProjet(projet) {
  return (Array.isArray(projet) ? projet : []).map((une) => entree({
    nom: texte(une?.nom),
    origine: ORIGINE.PROJET,
    lit: Array.isArray(une?.lit) ? une.lit : [],
    rend: une?.rend ?? null,
    // Ce qu'elle est, en un mot : on ne relit pas un abaque comme une cascade
    // de « si », et la fiche le dit avant qu'on l'ouvre.
    dit: texte(une?.forme) ? `un ${texte(une.forme)} du projet` : ""
  })).filter((une) => une.nom);
}

/**
 * Ce qui se **nomme ici**, et donc ce qui se propose sous le curseur.
 *
 * Deux rayons se parcourent sans se proposer, et pour deux raisons différentes :
 *
 *  - **un nom de l'établi ne se lit pas d'ici.** L'utilitaire vit dans un autre
 *    brouillon ; le proposer à la frappe ferait écrire une fonction qui lit un
 *    nom que personne ne conclut — une règle indécidable pour toujours, sans
 *    qu'un mot dise pourquoi.
 *  - **un agrégat n'est pas un nom.** « le plus grand de » est une phrase qu'on
 *    écrit dans un calcul ; la proposer là où une condition attend un sujet
 *    donnerait `si (le plus grand de = …)`, qui ne veut rien dire.
 *
 * **Une fonction versée, elle, se propose** — et c'est toute la différence avec
 * l'établi : elle conclut dans ce projet, sur les valeurs de ce projet, et le
 * bac d'essai la rejoue.
 *
 * C'est toute la différence entre les deux lectures du catalogue, et elle est
 * dite ici, une fois.
 */
export function nomsLisiblesDIci(catalogue = []) {
  return (Array.isArray(catalogue) ? catalogue : [])
    .filter((une) => une.origine !== ORIGINE.ETABLI && une.origine !== ORIGINE.AGREGAT);
}

/** Une chaîne repliée pour chercher : casse, accents et espaces pliés. */
const repli = (valeur) => cleDuSujet(valeur);

/**
 * Chercher dans le catalogue, comme on cherche dans l'Atelier.
 *
 * **On cherche rarement par le nom exact.** On cherche par un mot qu'on a en
 * tête — « TVA », « portée » —, et il peut être dans ce que l'entrée dit, ou
 * dans ce qu'elle lit : « qu'est-ce qui me sort un prix à partir du prix HT ? »
 * est une question qu'on se pose vraiment.
 *
 * Ce qui **commence** par ce qu'on tape passe devant : un « contient » seul
 * remonterait « Hauteur du plancher bas » avant « bas ». À rang égal, l'ordre
 * du catalogue tient — ce qui est le plus près du curseur reste le plus haut.
 */
export function chercherUnNom(catalogue = [], recherche = "") {
  const cherche = repli(recherche);
  const liste = Array.isArray(catalogue) ? catalogue : [];
  if (!cherche) return liste;

  return liste
    .map((une, rangDansLeCatalogue) => ({ une, rangDansLeCatalogue, rang: rangDe(une, cherche) }))
    .filter(({ rang }) => rang >= 0)
    .sort((un, autre) => un.rang - autre.rang
      || un.rangDansLeCatalogue - autre.rangDansLeCatalogue)
    .map(({ une }) => une);
}

/** Le rang d'une entrée pour ce qu'on cherche, ou `-1` si elle ne répond pas. */
function rangDe(une, cherche) {
  const ou = repli(une?.nom).indexOf(cherche);
  if (ou === 0) return 0;
  if (ou > 0) return 1;
  if (repli(une?.dit).includes(cherche)) return 2;
  if ((une?.lit ?? []).some((nom) => repli(nom).includes(cherche))) return 3;
  // Le domaine fermé d'un nom cherche aussi : « qu'est-ce qui parle de
  // rénovation ? » se pose devant un écran où l'on ne connaît pas les noms.
  if ((une?.valeurs ?? []).some((valeur) => repli(valeur).includes(cherche))) return 4;
  if (repli(une?.ou).includes(cherche)) return 5;
  return -1;
}

/**
 * Le catalogue rangé par rayon, dans l'ordre du parcours.
 *
 * **Un rayon vide ne paraît pas.** Un brouillon neuf n'a ni locale ni
 * conclusion : six titres dont quatre ne disent rien apprendraient à ne plus
 * lire les titres.
 */
export function rayonsDesNoms(catalogue = []) {
  const liste = Array.isArray(catalogue) ? catalogue : [];

  return ORDRE_DES_ORIGINES
    .map((origine) => ({
      origine,
      titre: NOM_DE_LORIGINE[origine] ?? "",
      dit: DIT_DE_LORIGINE[origine] ?? "",
      noms: liste.filter((une) => une.origine === origine)
    }))
    .filter((rayon) => rayon.noms.length > 0);
}

/**
 * Combien de noms, dit en français.
 *
 * Zéro ne se compte pas : « 0 nom » se lit comme une panne, alors que c'est un
 * brouillon vide — et l'on n'en dit donc rien, comme partout ailleurs.
 */
export function phraseDuCatalogue(catalogue = []) {
  const combien = (Array.isArray(catalogue) ? catalogue : []).length;
  if (!combien) return "";
  return combien === 1 ? "1 nom" : `${combien} noms`;
}
