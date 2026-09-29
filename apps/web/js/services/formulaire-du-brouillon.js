/**
 * Le formulaire d'un brouillon : il ne s'écrit pas, il se déduit.
 *
 * ## L'écart assumé avec la demande
 *
 * La demande décrivait « des inputs, labels, listes déroulantes » écrits dans
 * le code. Pris au mot, cela ajoute au langage un **vocabulaire d'affichage** à
 * côté de celui du raisonnement : « Zone de vent » serait déclaré une fois
 * comme variable et une fois comme étiquette, et le jour où la description
 * change, l'une des deux ne suivra pas (règle 10). Le langage cesserait aussi
 * d'être un langage de raisonnement — une liste déroulante n'est pas une
 * connaissance.
 *
 * Une variable porte déjà son type, son unité, sa description et son usage. Il
 * lui manquait le **domaine de ses valeurs**, et c'est le seul mot qu'on a
 * ajouté (lot 4). Le reste se déduit :
 *
 * | la déclaration porte | le formulaire en fait |
 * | --- | --- |
 * | le **nom** | l'étiquette |
 * | la **description** | l'aide au survol |
 * | `type: "mesure"` + `unité` | un champ, l'unité à droite |
 * | `type: "logique"` | oui / non |
 * | `valeurs possibles` | **une liste déroulante** |
 *
 * ## On ne demande pas ce que le brouillon dit déjà
 *
 * Une valeur écrite dans le `.ddb` est une réponse. La redemander en ferait
 * deux, et les deux divergeraient au premier essai — c'est la même valeur à
 * deux endroits (règle 4). Le formulaire ne porte donc que ce qui **manque**.
 *
 * ## Ni ce qu'une règle conclut
 *
 * C'est le même principe, et c'est le défaut qu'on a vu à l'écran : on écrit
 * « selon le cas, le taux de TVA vaut 5 % ou 20 % », une fonction le conclut —
 * et le formulaire offrait quand même un champ « taux », non déclaré, à
 * remplir à la main. On tapait donc la réponse qu'on venait chercher.
 *
 * Le graphe des blocs le disait déjà : **un sujet qu'aucun bloc ne produit est
 * une entrée**. C'est cette phrase-là, appliquée. Un nom que le brouillon
 * conclut est déduit ; il se lit, il ne se demande pas.
 *
 * ## Il est pur
 *
 * Des fichiers entrent, des champs sortent. Aucun DOM, aucun réseau.
 */

import {
  lireUnFichier, nomsConclusParLeBloc, nomsLusParLeBloc, fonctionsAppeleesParLeBloc
} from "./memoire-en-lecture.js";
import { PORTEE_DUNE_FONCTION } from "./memoire-en-texte.js";
import { valeursDeLaPortee, valeurDuVersement } from "./memoire-valeurs.js";
import { cleDuSujet } from "./memoire-identifiants.js";
import { reglesVerseesUtiles } from "./fonctions-du-projet.js";
import { couperLUnite, estMesuree } from "./memoire-en-texte.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Comment un champ se remplit. Quatre formes, et pas une de plus. */
export const SAISIE = {
  /** Un domaine fermé : `valeurs possibles`. */
  LISTE: "liste",
  /** Un nombre, avec son unité à côté. */
  MESURE: "mesure",
  /** Oui ou non. */
  LOGIQUE: "logique",
  /** Du texte libre — ce qu'on met quand la déclaration n'en dit pas plus. */
  TEXTE: "texte"
};

/** La forme d'un champ, d'après ce que sa déclaration dit — et rien d'autre. */
function saisieDe(declaration) {
  if ((declaration?.valeurs ?? []).length) return SAISIE.LISTE;
  const type = texte(declaration?.type).toLowerCase();
  if (type === "mesure") return SAISIE.MESURE;
  if (type === "logique") return SAISIE.LOGIQUE;
  return SAISIE.TEXTE;
}

/**
 * Tout ce que les fichiers d'un brouillon déclarent, par clé de nom.
 *
 * **Elle ne sort plus du module.** Ce que l'écran d'écriture propose passe
 * maintenant par le catalogue des noms, qui voit aussi ce que les fonctions
 * concluent ; garder une porte ouverte sur les seules déclarations inviterait un
 * second consommateur à contourner le catalogue, et les deux listes cesseraient
 * de dire la même chose (règle 10).
 */
function declarationsDuBrouillon(fichiers = []) {
  const table = new Map();

  for (const fichier of Array.isArray(fichiers) ? fichiers : []) {
    for (const declaration of lireUnFichier(fichier?.contenu ?? "").declarations ?? []) {
      const cle = cleDuSujet(texte(declaration?.nom));
      if (cle && !table.has(cle)) table.set(cle, declaration);
    }
  }

  return table;
}

/**
 * Ce que le brouillon **pose** déjà : `clé du nom → valeur`.
 *
 * Seules les affirmations comptent — une valeur, sans condition et sans appel.
 * Une règle ne pose rien : elle conclut, et sa conclusion est ce qu'on va
 * calculer.
 */
export function valeursPosees(fichiers = []) {
  const posees = new Map();

  for (const fichier of Array.isArray(fichiers) ? fichiers : []) {
    for (const bloc of lireUnFichier(fichier?.contenu ?? "").blocs ?? []) {
      if ((bloc?.conditions ?? []).length || bloc?.agent) continue;
      const cle = cleDuSujet(texte(bloc?.sujet));
      const valeur = [texte(bloc?.valeur), texte(bloc?.unite)].filter(Boolean).join(" ");
      if (cle && valeur && !posees.has(cle)) posees.set(cle, valeur);
    }
  }

  return posees;
}

/** Tous les noms que les règles d'un brouillon lisent, dans l'ordre de lecture. */
export function nomsLus(fichiers = [], { memoire = null } = {}) {
  const lus = [];
  const vus = new Set();
  /**
   * Les noms que les fonctions **posent** en les calculant.
   *
   * Ils se lisent comme les autres — une condition peut porter dessus — mais
   * ils ne se demandent pas : ils se calculent. Un champ « TVA » dans le
   * formulaire serait un champ qu'on ne sait pas remplir, et qui masquerait
   * l'entrée réellement absente.
   */
  const poses = new Set();

  /**
   * Les noms que le brouillon **produit** : le sujet de chaque bloc, et ceux
   * où il dit s'enregistrer.
   *
   * Ils ne se demandent pas : une affirmation les pose, une règle les conclut.
   * C'est la définition d'une entrée que `grapheDesBlocs` porte depuis
   * toujours — « un sujet qu'aucun bloc ne produit » —, lue au même endroit
   * que lui (règle 10).
   *
   * **Un agent n'en produit aucun ici.** Il range un résultat qu'il ne calcule
   * pas dans le fichier : le bac ne saurait pas le rendre, et l'on veut donc
   * pouvoir le taper à la main pour éprouver ce qui en dépend.
   */
  const produits = new Set();

  /**
   * **La portée ne se demande pas**, et les fonctions qu'on appelle non plus.
   *
   * `zones` est le premier argument de tout appel, et c'est une portée : le bac
   * d'essai n'en a pas, et un champ « zones » à remplir à la main ne veut rien
   * dire. Une fonction appelée, elle, est **lue** — il faut l'avoir pour
   * répondre — mais c'est le projet qui la porte : la demander serait demander
   * de taper à la main ce qu'on vient d'écrire trois lignes plus haut.
   */
  const jamais = new Set([cleDuSujet(PORTEE_DUNE_FONCTION)]);

  const retenir = (nom) => {
    const cle = cleDuSujet(nom);
    if (!cle || vus.has(cle) || jamais.has(cle)) return;
    vus.add(cle);
    lus.push(texte(nom));
  };

  for (const fichier of Array.isArray(fichiers) ? fichiers : []) {
    for (const bloc of lireUnFichier(fichier?.contenu ?? "").blocs ?? []) {
      for (const nom of nomsConclusParLeBloc(bloc)) produits.add(cleDuSujet(nom));

      for (const calcul of bloc?.calculs ?? []) poses.add(cleDuSujet(calcul?.nom));

      // Ce que le bloc **appelle** : lu, jamais demandé. Voir `jamais`.
      for (const nom of fonctionsAppeleesParLeBloc(bloc)) produits.add(cleDuSujet(nom));

      /**
       * **Une boucle pose sa variable et ses colonnes.**
       *
       * `pour chaque Hauteur de 2,5 m à 4 m par pas de 0,5 m` donne à `Hauteur`
       * une valeur par ligne : la demander à l'écran ferait un champ qui ne
       * veut rien dire, et qui masquerait l'entrée réellement absente. Ses
       * colonnes se calculent, exactement comme les autres locales.
       */
      if (bloc?.boucle) {
        poses.add(cleDuSujet(bloc.boucle.nom));
        for (const calcul of bloc.boucle.calculs ?? []) poses.add(cleDuSujet(calcul?.nom));
      }

      /**
       * **Ce qu'une fonction lit se lit à un seul endroit.**
       *
       * Ce qu'un calcul prend se demande comme ce qu'une condition compare, et
       * les branches enchaînées lisent elles aussi — un nom qui n'apparaît que
       * dans un `sinon si` n'était offert nulle part, et la règle répondait
       * « je ne sais pas » sans qu'un mot dise pourquoi.
       *
       * Le parcours vit dans le lecteur du langage, parce que le catalogue des
       * noms pose la même question par fonction : deux parcours cesseraient un
       * jour de voir la même chose (règle 10).
       */
      nomsLusParLeBloc(bloc).forEach(retenir);
    }
  }

  /**
   * **Ce que le projet déduit ne se demande pas ; ce qu'il lit, si.**
   *
   * Le brouillon qui nomme « Prix unitaire du volet » ne doit pas voir un champ
   * pour lui : une fonction versée le conclut, et le taper à la main
   * reviendrait à répondre soi-même la question qu'on avait signée. En
   * revanche, **la couleur des volets, qu'elle lit, est bien une entrée** — et
   * sans ce second temps le formulaire n'offrirait aucun moyen de faire varier
   * ce qu'on essaie.
   */
  for (const { bloc } of reglesVerseesUtiles(memoire ?? [], {
    lus, conclus: [...produits, ...poses]
  })) {
    for (const nom of nomsConclusParLeBloc(bloc)) produits.add(cleDuSujet(nom));
    for (const calcul of bloc?.calculs ?? []) poses.add(cleDuSujet(calcul?.nom));
    if (bloc?.boucle) {
      poses.add(cleDuSujet(bloc.boucle.nom));
      for (const calcul of bloc.boucle.calculs ?? []) poses.add(cleDuSujet(calcul?.nom));
    }
    nomsLusParLeBloc(bloc).forEach(retenir);
  }

  return lus.filter((nom) => {
    const cle = cleDuSujet(nom);
    return !poses.has(cle) && !produits.has(cle);
  });
}

/**
 * La réponse, avec l'unité que sa déclaration annonce.
 *
 * ## Le défaut que ça répare
 *
 * L'écran montre « € » à droite du champ, parce que la déclaration porte
 * `unité: "€"`. On tape donc « 120 », et c'est « 120 » qui partait : le calcul
 * travaillait en nombres nus, `Prix HT >= 0 €` devenait une comparaison entre
 * un nombre et une mesure, et le verdict annonçait « 250 » là où la mémoire
 * aurait écrit « 250 € ». L'unité était à l'écran et nulle part ailleurs.
 *
 * On ne touche à rien d'autre : un texte n'en prend pas, une valeur qui porte
 * déjà la sienne la garde — ce qu'on a tapé est ce qu'on a voulu dire, même
 * lorsque ce n'est pas l'unité déclarée. Le calcul, lui, sait déjà refuser
 * deux unités qui ne se composent pas, et c'est à lui de le dire.
 */
export function reponseAvecSonUnite(dite = "", declaration = null) {
  const valeur = texte(dite);
  const unite = texte(declaration?.unite);
  if (!valeur || !unite) return valeur;

  // « 3e famille B » n'est pas une mesure : lui coller « € » en ferait une, et
  // le calcul se mettrait à compter dessus (règle 5).
  if (!estMesuree(valeur)) return valeur;

  return couperLUnite(valeur).unite ? valeur : `${valeur} ${unite}`;
}

/**
 * Les champs à remplir pour lancer ce brouillon.
 *
 * @param {{nom: string, contenu: string}[]} fichiers
 * @returns {{nom, cle, saisie, unite, choix, aide, declare}[]}
 */
/**
 * Ce que le projet tient, pour cette zone : `clé du nom → valeur écrite`.
 *
 * **C'est ce qui rend le sélecteur de zone autre chose qu'un décor.** Sans lui,
 * choisir « bâtiment B » ne changeait rien : le bac ne lisait que ce qu'on
 * avait tapé, et « la même fonction, deux bâtiments, deux réponses » ne pouvait
 * se voir que dans le rejeu de la mémoire.
 *
 * `valeursDeLaPortee` décide **laquelle vaut** pour cette zone — la sienne
 * d'abord, celle qui vaut partout à défaut, jamais celle d'une autre zone. On
 * ne redécide rien ici (règle 10).
 */
export function valeursDuProjet(memoire = null, zone = "") {
  const lues = new Map();
  if (!Array.isArray(memoire) || !memoire.length) return lues;

  for (const [cle, assertion] of valeursDeLaPortee(memoire, zone)) {
    const dite = texte(valeurDuVersement(assertion));
    if (cle && dite) lues.set(cle, dite);
  }

  return lues;
}

export function champsDuBrouillon(fichiers = [], { memoire = null, zone = "" } = {}) {
  const declarations = declarationsDuBrouillon(fichiers);
  const posees = valeursPosees(fichiers);
  const duProjet = valeursDuProjet(memoire, zone);

  return nomsLus(fichiers, { memoire })
    // Ce que le brouillon dit déjà est une réponse. Le redemander en ferait
    // deux, et les deux divergeraient au premier essai (règle 4).
    .filter((nom) => !posees.has(cleDuSujet(nom)))
    .map((nom) => {
      const cle = cleDuSujet(nom);
      const declaration = declarations.get(cle) ?? null;

      return {
        nom,
        cle,
        saisie: saisieDe(declaration),
        unite: texte(declaration?.unite),
        choix: (declaration?.valeurs ?? []).map(texte).filter(Boolean),
        // La description sert d'aide au survol. Vide quand personne ne l'a
        // écrite : une aide inventée serait pire qu'une aide absente.
        aide: texte(declaration?.description),
        /**
         * Ce nom est-il déclaré quelque part ?
         *
         * **Un champ non déclaré se remplit quand même.** Le refuser rendrait
         * la règle indécidable pour toujours, et l'on ne saurait pas si elle
         * marche. Mais l'écran le dit : ce qu'on tape là ne tient sur rien.
         */
        declare: Boolean(declaration),
        /**
         * **Ce que le projet tient déjà pour ce nom, dans la zone choisie.**
         *
         * C'est la valeur qui servira si l'on ne tape rien — et l'écran la
         * montre, parce qu'un essai qui répond sur une valeur venue de nulle
         * part est un essai qu'on ne peut pas relire (règle 5). Vide quand le
         * projet ne dit rien : on ne l'invente pas.
         */
        duProjet: texte(duProjet.get(cle))
      };
    });
}

/**
 * Ce qu'on donnera à lire aux règles : le brouillon, puis les réponses.
 *
 * **Les réponses l'emportent**, parce que c'est ce qu'on vient d'essayer : le
 * formulaire est là pour varier ce qu'on ne veut pas écrire dans le fichier.
 * Une valeur du fichier qui gagnerait sur la réponse ferait un formulaire
 * décoratif.
 */
/**
 * Dans quel état se trouve un champ : vide, repris du projet, ou répondu.
 *
 * ## Pourquoi trois, et pas deux
 *
 * Le sélecteur de zone **éclairait** les champs sans les remplir : on lisait
 * « du projet : alu » sous un champ vide, et l'on ne pouvait pas partir de
 * cette valeur pour la corriger d'un caractère — il fallait la retaper. Poser
 * la valeur dans le champ sans rien dire aurait fait l'inverse : elle serait
 * devenue indiscernable d'une réponse, et l'écran n'aurait plus dit d'où elle
 * vient (règle 5).
 *
 * Il y a donc **trois** états, et le troisième est le plus utile : la valeur est
 * là, on peut l'éditer, et l'écran dit qu'elle n'est pas de nous.
 *
 * ## Ce qui n'en dépend pas
 *
 * **Rien de ce que l'essai calcule.** Un champ repris du projet reste une
 * valeur du projet : elle n'entre pas dans les réponses, et `valeursDuLancement`
 * la reprend de la mémoire comme avant. Voir le champ rempli ne vaut pas
 * l'avoir tapé — sans quoi le sélecteur de zone changerait de zone sans changer
 * de valeurs.
 *
 * @returns {{etat: string, valeur: string, duProjet: string, differe: boolean}}
 */
export const ETAT_DU_CHAMP = {
  /** Personne n'a répondu, et le projet ne dit rien : le champ est nu. */
  VIDE: "vide",
  /** Le projet tient une valeur, et personne ne l'a corrigée. */
  DU_PROJET: "du-projet",
  /** Quelqu'un a répondu : c'est sa réponse qui vaut. */
  REPONDU: "repondu"
};

export function etatDuChamp(champ = null, reponse = "") {
  const dite = texte(reponse);
  const duProjet = texte(champ?.duProjet);

  if (dite) {
    return {
      etat: ETAT_DU_CHAMP.REPONDU,
      valeur: dite,
      duProjet,
      /**
       * **A-t-on dit autre chose que le projet ?**
       *
       * C'est ce qui décide du retour : proposer « revenir au projet » quand on
       * a tapé exactement ce qu'il dit serait offrir de défaire quelque chose
       * qui n'a pas été fait.
       */
      differe: Boolean(duProjet) && dite !== duProjet
    };
  }

  return duProjet
    ? { etat: ETAT_DU_CHAMP.DU_PROJET, valeur: duProjet, duProjet, differe: false }
    : { etat: ETAT_DU_CHAMP.VIDE, valeur: "", duProjet: "", differe: false };
}

/**
 * D'où vient une valeur que l'essai a lue.
 *
 * **Toutes se relisaient pareil.** La trace du verdict disait « Nature des
 * volets = bois » — et « bois » pouvait venir du projet, d'une ligne du
 * brouillon, d'une réponse tapée, ou d'une autre fonction qui venait de le
 * conclure. Quatre choses très différentes, et la seule qui se corrige en
 * tapant ne se distinguait pas des trois autres.
 *
 * C'est le rappel sous le champ — « du projet » — porté jusque dans le verdict,
 * là où on lit vraiment ce que la fonction a fait.
 */
export const VENU = {
  /** Tapé dans le formulaire du bac. */
  REPONSE: "réponse",
  /** Versé au projet, pour la zone où l'on se place. */
  PROJET: "projet",
  /** Posé par une ligne du brouillon — un `.ddb`, une affirmation. */
  BROUILLON: "brouillon",
  /** Conclu par une autre fonction de l'essai, au tour d'avant. */
  DEDUIT: "déduit"
};

/**
 * Ce qu'on donne au lancement : les valeurs, **et d'où chacune vient**.
 *
 * ## Trois sources, et l'ordre compte
 *
 * Ce que le **projet** tient d'abord : c'est le fond, et c'est ce que la zone
 * choisie change. Ce que le **brouillon** pose ensuite — il est ce qu'on
 * essaie, et une ligne qu'on vient d'écrire l'emporte sur ce qui est versé. Ce
 * qu'on a **tapé** enfin : c'est la main sur le volant, et elle gagne partout,
 * y compris pour un appel qui nomme une autre zone.
 *
 * ## Pourquoi les deux se construisent ensemble
 *
 * La provenance **est** l'ordre : elle se lit dans le même empilement, et la
 * refaire ailleurs reviendrait à réécrire cet ordre-là une seconde fois. Le
 * jour où l'une des trois sources bougerait, l'autre copie continuerait de
 * dire l'ancien (règle 4).
 *
 * @returns {{valeurs: Map<string, string>, venues: Map<string, string>}}
 */
export function ceQuOnDonneAuLancement(fichiers = [], reponses = null, { memoire = null, zone = "" } = {}) {
  const valeurs = new Map();
  const venues = new Map();

  const poser = (cle, valeur, venu) => {
    if (!cle || !texte(valeur)) return;
    valeurs.set(cle, valeur);
    venues.set(cle, venu);
  };

  for (const [cle, valeur] of valeursDuProjet(memoire, zone)) poser(cle, valeur, VENU.PROJET);
  for (const [cle, valeur] of valeursPosees(fichiers)) poser(cle, valeur, VENU.BROUILLON);

  const declarations = declarationsDuBrouillon(fichiers);
  const dites = reponses instanceof Map ? reponses : new Map(Object.entries(reponses ?? {}));

  for (const [nom, valeur] of dites) {
    // L'unité est à l'écran, à droite du champ : elle doit partir avec ce
    // qu'on tape, sinon elle ne sert qu'à décorer.
    const cle = cleDuSujet(texte(nom));
    if (texte(valeur)) poser(cle, reponseAvecSonUnite(valeur, declarations.get(cle)), VENU.REPONSE);
  }

  return { valeurs, venues };
}

export function valeursDuLancement(fichiers = [], reponses = null, comment = {}) {
  return ceQuOnDonneAuLancement(fichiers, reponses, comment).valeurs;
}

/**
 * Ce qui a bougé au projet depuis qu'on l'a lu — parmi ce que ce brouillon lit.
 *
 * ## Le défaut
 *
 * La mémoire se lisait **une fois** par session. On reprenait « Nature des
 * volets : alu », on essayait une demi-heure, et pendant ce temps le projet
 * avait signé « bois » : l'essai continuait de répondre sur `alu` sans qu'un
 * mot le dise. Pire qu'une valeur absente — une valeur périmée se lit comme une
 * valeur juste.
 *
 * ## Pourquoi on compare les champs, et pas les mémoires
 *
 * Deux mémoires diffèrent de mille façons qui ne regardent pas ce brouillon :
 * une autre zone, un autre sujet, un versement éclipsé. Ce qui compte est ce
 * que **ce brouillon reprend**, dans **la zone où l'on se place** — et
 * `champsDuBrouillon` le sait déjà. On ne redécide donc rien ici : on lui pose
 * la même question deux fois, avec l'ancienne mémoire puis la neuve, et l'on
 * regarde ce qui n'a pas la même réponse (règle 10).
 *
 * Une valeur **partie** du projet en est un changement comme un autre : `apres`
 * vaut alors la chaîne vide, et l'écran doit le dire plutôt que de laisser
 * croire que rien n'a bougé (règle 5).
 *
 * @returns {{nom: string, cle: string, avant: string, apres: string}[]}
 */
export function ceQuiABougeAuProjet(fichiers = [], { avant = null, apres = null, zone = "" } = {}) {
  const vieux = new Map(
    champsDuBrouillon(fichiers, { memoire: avant, zone }).map((champ) => [champ.cle, champ.duProjet])
  );

  return champsDuBrouillon(fichiers, { memoire: apres, zone })
    .map((champ) => ({
      nom: champ.nom,
      cle: champ.cle,
      avant: texte(vieux.get(champ.cle)),
      apres: champ.duProjet
    }))
    .filter((un) => un.avant !== un.apres);
}

/**
 * Ce qui a bougé, en une phrase.
 *
 * **Elle nomme les valeurs**, parce que « le projet a changé » n'apprend rien :
 * ce qu'on veut savoir est s'il faut relancer, et cela se décide sur les noms.
 * Vide quand rien n'a bougé — une phrase rassurante à chaque relecture finirait
 * par ne plus se lire, et celle qui compte passerait avec elle.
 */
export function phraseDeCeQuiABouge(bouge = []) {
  const tous = (Array.isArray(bouge) ? bouge : []).filter((un) => texte(un?.nom));
  if (!tous.length) return "";

  const dit = tous.map((un) => (un.apres
    ? `« ${un.nom} » : ${un.avant || "rien"} → ${un.apres}`
    // Une valeur retirée du projet n'a pas de flèche : il n'y a plus de valeur
    // au bout. Écrire « → rien » laisserait croire que le projet tient « rien ».
    : `« ${un.nom} » n'est plus au projet (${un.avant})`));

  return `Le projet a bougé depuis la lecture — ${dit.join(" ; ")}.`;
}
