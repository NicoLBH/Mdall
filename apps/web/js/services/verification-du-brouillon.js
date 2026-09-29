/**
 * Ce qui ne va pas dans un brouillon de Mdall, nommé ligne par ligne.
 *
 * ## Pourquoi c'est le lot qui compte le plus
 *
 * Un modèle qui écrit du code écrit du code **plausible**. Rien dans sa réponse
 * ne distingue une fonction juste d'une fonction dont le `importe` nomme un
 * fichier qui n'existe pas, ou dont la condition porte sur un nom que personne
 * n'a jamais déclaré. C'est le même problème que les citations d'un compte
 * rendu — « le support est humide au droit de l'acrotère » pourrait figurer
 * dans n'importe quel fil d'étanchéité —, et il a la même réponse : **on relit
 * ce qui a été écrit, avec le lecteur du projet**.
 *
 * Et ce n'est pas seulement pour le modèle. Quelqu'un qui apprend le langage se
 * trompe, et un écran qui se tait le laisse se tromper deux fois.
 *
 * ## Ce qui ne bloque pas
 *
 * Rien. Un brouillon à demi juste se corrige ; un brouillon refusé en bloc se
 * rejette, et l'on recommence à zéro. Chaque remarque porte donc **son numéro de
 * ligne**, et l'écran la pose à côté d'elle.
 *
 * ## Il est pur, et c'est indispensable
 *
 * Du texte entre, des remarques sortent. Aucun réseau, aucun DOM. C'est ce qui
 * permettra au **serveur** de s'en servir pour relire ce qu'un modèle aura
 * écrit, avant même de répondre au navigateur.
 */

import {
  entreesDuBloc, lireUnFichier, nomsPosesParLeBloc, parametresDuBloc,
  clausesDeLaRegle, appelsDesExpressions, ceQuElleAnnonce
} from "./memoire-en-lecture.js";
import {
  PORTEE_DUNE_FONCTION, couperLUnite, estMesuree, OPERATEUR
} from "./memoire-en-texte.js";
import { memeGrandeur } from "./unites-du-metier.js";
import { cleDuSujet } from "./memoire-identifiants.js";
import { EXTENSIONS, EXTENSION_REGLE } from "./memoire-rangement.js";
import { blocsDesFonctionsVersees } from "./fonctions-du-projet.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'une remarque reproche. Nommé, jamais tu. */
export const ENNUI = {
  /** La lecture du projet n'a pas su lire cette ligne. */
  ILLISIBLE: "illisible",
  /** Une condition porte sur un nom que rien ne déclare. */
  NOM_INCONNU: "nom-inconnu",
  /** Une conclusion ne dit pas dans quel fichier elle range son résultat. */
  SANS_DESTINATION: "sans-destination",
  /** Une valeur sort du domaine que sa déclaration a fermé. */
  HORS_DU_DOMAINE: "hors-du-domaine",
  /** Ce que le fichier contient ne correspond pas à son extension. */
  MAUVAISE_EXTENSION: "mauvaise-extension",
  /**
   * Une ligne nomme quelque chose et ne dit rien de plus.
   *
   * **C'est aussi ce que devient une phrase en français.** La lecture est
   * permissive par choix — un architecte qui tape à la main n'écrit pas toujours
   * ses bornes —, donc « la zone de vent vaut trois » ne se refuse pas : elle se
   * lit comme un nom, et ce nom entre dans la mémoire du brouillon.
   *
   * Le taire laisserait croire qu'on a écrit du Mdall. On ne sait pas distinguer
   * une phrase d'un nom nu, et l'on n'a pas à le savoir : les deux sont
   * incomplets, et c'est cela qu'on dit.
   */
  SANS_VALEUR: "sans-valeur",
  /**
   * La signature d'une fonction n'annonce pas ce qu'elle lit — ou l'inverse.
   *
   * **La signature est la première chose qu'un relecteur regarde**, et elle ne
   * liait rien : une fonction dont le corps lit « Matériau » alors que sa
   * signature n'annonce que `zones` marchait très bien. Le fichier versé
   * annonçait donc une fonction qui n'existe pas, et personne ne pouvait le
   * savoir sans relire tout son corps — ce que la signature existe précisément
   * pour éviter.
   *
   * L'autre sens compte autant : une signature qui annonce une entrée dont la
   * fonction ne se sert jamais fait chercher où elle sert.
   */
  SIGNATURE: "signature",
  /**
   * **Une fonction appelée sur un nom dont elle ne connaît pas les valeurs.**
   *
   * `Couleur des volets` lit `Nature des volets`, qui vaut « bois » ou « pvc ».
   * On l'appelle sur `Matériau`, qui vaut « bois », « alu » ou « pvc ». Pour
   * « alu », la fonction répondra son `sinon` — un résultat parfaitement
   * plausible, et faux, que rien ne signale.
   *
   * C'est la faute que l'appel rend possible : tant qu'une fonction ne lisait
   * que ses propres noms, son domaine et celui qu'elle lit étaient le même.
   * C'est le même contrôle que `hors-du-domaine`, porté sur un appel.
   */
  DONNE_HORS_DU_DOMAINE: "donne-hors-du-domaine",
  /**
   * Une fonction conclut autre chose que ce qu'elle annonce rendre.
   *
   * **`rend:` est la seule chose qu'on lit avant de se servir d'une fonction**,
   * et une déclaration qu'on ne vérifie pas est une intention (règle 12). Une
   * fonction qui annonce `rend: kN` et conclut « 3e famille B » ment à
   * l'endroit exact où l'on décide de la nommer.
   */
  REND: "rend",
  /**
   * **Ce qu'une fonction rend ne peut pas être ce qu'on attend d'elle.**
   *
   * `rend:` dit ce qu'une fonction conclut, et personne ne le comparait à ce
   * qu'un appelant en attend. `si (Couleur des volets(zones, M) = "violet")`
   * sur une fonction qui annonce `rend: "gris" ou "blanc"` est une condition
   * qui ne tiendra **jamais** — et rien ne le disait : elle répond « faux »
   * tranquillement, et l'on cherche l'erreur dans les valeurs.
   *
   * C'est le même contrôle que `donne-hors-du-domaine`, de l'autre côté de
   * l'appel.
   */
  REND_HORS_DU_DOMAINE: "rend-hors-du-domaine"
};

/** Ce qu'on en dit, en tête de remarque. */
export const MOTS_DE_LENNUI = {
  [ENNUI.ILLISIBLE]: "ne se lit pas",
  [ENNUI.NOM_INCONNU]: "nom jamais déclaré",
  [ENNUI.SANS_DESTINATION]: "sans destination",
  [ENNUI.HORS_DU_DOMAINE]: "hors du domaine",
  [ENNUI.MAUVAISE_EXTENSION]: "mauvais fichier",
  [ENNUI.SANS_VALEUR]: "ne dit rien",
  [ENNUI.SIGNATURE]: "signature",
  [ENNUI.REND]: "ne rend pas ce qu'elle annonce",
  [ENNUI.DONNE_HORS_DU_DOMAINE]: "valeur que la fonction ne connaît pas",
  [ENNUI.REND_HORS_DU_DOMAINE]: "ne rendra jamais cette valeur"
};

/** L'extension d'un nom de fichier, ou `""`. La liste se dérive du rangement. */
function extensionDe(nom = "") {
  const morceau = texte(nom).split(".").pop()?.toLowerCase() ?? "";
  const connues = new Set([...Object.values(EXTENSIONS), EXTENSION_REGLE]);
  return connues.has(morceau) ? morceau : "";
}

/**
 * Tous les noms qu'un brouillon déclare, toutes formes confondues.
 *
 * **Deux façons de déclarer un nom, et les deux comptent** : une affirmation
 * qui le pose (`Altitude du site = 890 m`) et une déclaration de variable
 * (`const Altitude du site = { … }`). N'en retenir qu'une ferait crier au nom
 * inconnu sur un brouillon qui le déclare juste au-dessus.
 */
export function nomsDeclares(fichiers = []) {
  const noms = new Set();

  for (const fichier of Array.isArray(fichiers) ? fichiers : []) {
    const { blocs, declarations } = lireUnFichier(fichier?.contenu ?? "");
    for (const bloc of blocs) {
      const sujet = cleDuSujet(texte(bloc?.sujet));
      if (sujet) noms.add(sujet);
      // Ce qu'une fonction native enregistre est posé par elle : le nom existe
      // dès qu'elle est écrite, même si rien ne le porte encore.
      for (const sortie of bloc?.enregistre ?? []) {
        const pose = cleDuSujet(texte(sortie?.sujet));
        if (pose) noms.add(pose);
      }
    }
    for (const declaration of declarations ?? []) {
      const nom = cleDuSujet(texte(declaration?.nom));
      if (nom) noms.add(nom);
    }
  }

  return noms;
}

/**
 * Ce qu'on donne à une fonction, comparé à ce qu'elle sait lire.
 *
 * **La faute que l'appel rend possible.** Tant qu'une fonction ne lisait que
 * ses propres noms, son domaine et celui qu'elle lit étaient le même. Depuis
 * qu'on lui donne un autre nom, les deux peuvent diverger — et la fonction
 * répond alors son `sinon` sur les valeurs qu'elle ne connaît pas, sans que
 * rien ne le dise. Un résultat plausible et faux est la seule faute que cette
 * langue ne pardonne pas.
 *
 * **On ne parle que de ce qu'on sait.** Il faut deux domaines fermés — celui du
 * paramètre et celui de ce qu'on donne — pour qu'il y ait une comparaison à
 * faire. À défaut on se tait : ne pas savoir n'autorise pas à prétendre qu'il
 * n'y a rien, ni l'inverse (règle 5).
 *
 * **Les fonctions de la mémoire comptent**, depuis que la vérification les
 * reçoit : c'est le cas le plus courant une fois qu'on verse, et il échappait
 * entièrement au contrôle. Sans mémoire, on se tait sur elles — une remarque ne
 * disparaît jamais parce qu'on en sait plus, elle s'ajoute.
 */
function ceQuOnDonneAuxAppels(bloc, { fichier, blocs, domaines }) {
  const dites = [];
  const ligne = Number(bloc?.ligne) || 0;

  const arbres = [
    ...appelsDesExpressions(bloc),
    ...clausesDeLaRegle(bloc).map((condition) => condition?.appel?.arbre).filter(Boolean)
  ];

  /** Ce qu'un argument peut valoir : un nom a son domaine, un appel a son `rend:`. */
  const cePeutValoir = (donne) => {
    if (donne?.quoi === "nom") return domaines.get(cleDuSujet(donne.nom)) ?? null;
    /**
     * **Un argument calculé n'a pas de domaine — sauf quand c'est un appel.**
     *
     * On l'avait noté comme une limite assumée : un calcul n'a pas de domaine
     * fermé, et lui en inventer un serait affirmer ce qu'on ignore. Mais
     * `F(zones, G(zones, X))` n'est pas un calcul : `G` dit ce qu'elle rend, et
     * c'est exactement le domaine qu'on cherchait.
     */
    if (donne?.quoi !== "appel-du-projet") return null;
    const rendue = blocs.get(cleDuSujet(texte(donne?.nom)));
    return rendue ? (ceQuElleAnnonce(rendue)?.valeurs ?? null) : null;
  };

  const nommerLArgument = (donne) => donne?.quoi === "appel-du-projet"
    ? `${texte(donne.nom)}(…)`
    : texte(donne?.nom);

  for (const arbre of arbres) {
    const appelee = blocs.get(cleDuSujet(texte(arbre?.nom)));
    if (!appelee) continue;

    // La portée ne porte pas de domaine : elle dit où, pas quoi.
    const parametres = parametresDuBloc(appelee).slice(1);
    const donnes = (Array.isArray(arbre?.arguments) ? arbre.arguments : []).slice(1);

    parametres.forEach((parametre, rang) => {
      const donne = donnes[rang];

      const attendues = domaines.get(cleDuSujet(parametre));
      const offertes = cePeutValoir(donne);
      if (!attendues?.length || !offertes?.length) return;

      const jamais = offertes.filter((une) => !attendues.includes(une));
      if (!jamais.length) return;

      dites.push({
        fichier, ligne, quoi: ENNUI.DONNE_HORS_DU_DOMAINE, texte: nommerLArgument(donne),
        dit: `« ${texte(arbre.nom)} » lit « ${parametre} », qui ne vaut que `
          + `${attendues.map((une) => `« ${une} »`).join(", ")}. `
          + `« ${nommerLArgument(donne)} » peut valoir ${jamais.map((une) => `« ${une} »`).join(", ")} : `
          + `pour ces valeurs-là, elle répondra son « sinon » sans rien en dire.`
      });
    });
  }

  dites.push(...ceQuUnAppelNeRendraJamais(bloc, { fichier, blocs }));

  return dites;
}

/**
 * Ce qu'on attend d'un appel, comparé à ce qu'il peut rendre.
 *
 * ## Le défaut
 *
 * `si (Couleur des volets(zones, Matériau) = "violet")`, sur une fonction qui
 * annonce `rend: "gris" ou "blanc"`, est une condition qui ne tiendra
 * **jamais**. Rien ne le disait : elle répond « faux » tranquillement, et l'on
 * cherche l'erreur dans les valeurs pendant une demi-heure.
 *
 * C'est le contrôle des domaines, de l'autre côté de l'appel : `rend:` disait
 * déjà ce qu'une fonction conclut, et personne ne le comparait à ce qu'un
 * appelant en attend.
 *
 * ## Ce qu'on ne dit pas
 *
 * **Rien sur une promesse déduite.** Une fonction sans `rend:` écrit rend ce
 * que ses branches concluent, et comparer une attente à cette déduction
 * refuserait un texte qu'on est en train d'écrire — la branche qui manque est
 * peut-être la prochaine ligne. On n'éprouve que ce qui est **promis**.
 *
 * **Rien sur une mesure.** `> 3 m` contre `rend: kN` est une faute d'unité, et
 * c'est le doute de l'évaluateur qui la dit, au bon endroit. Un second contrôle
 * ici rendrait deux phrases pour une faute (règle 10).
 */
function ceQuUnAppelNeRendraJamais(bloc, { fichier, blocs }) {
  const dites = [];
  const ligne = Number(bloc?.ligne) || 0;

  for (const condition of clausesDeLaRegle(bloc)) {
    const nom = texte(condition?.appel?.arbre?.nom);
    if (!nom || condition?.operateur !== OPERATEUR.EGAL) continue;

    const appelee = blocs.get(cleDuSujet(nom));
    const promet = appelee?.rend;
    if (!promet?.valeurs?.length) continue;

    const attendues = (condition?.valeur ?? []).map(texte).filter(Boolean);
    if (!attendues.length) continue;

    const jamais = attendues.filter((une) =>
      !promet.valeurs.some((rendue) => cleDuSujet(rendue) === cleDuSujet(une)));
    // Une seule attente possible suffit : la clause peut tenir, et l'on n'a
    // rien à dire de celles qui l'accompagnent.
    if (jamais.length !== attendues.length) continue;

    dites.push({
      fichier, ligne, quoi: ENNUI.REND_HORS_DU_DOMAINE, texte: nom,
      dit: `« ${nom} » annonce rendre ${promet.valeurs.map((une) => `« ${une} »`).join(" ou ")}. `
        + `Cette clause attend ${jamais.map((une) => `« ${une} »`).join(" ou ")} : `
        + `elle ne tiendra jamais.`
    });
  }

  return dites;
}

/** Les domaines fermés déclarés par le brouillon : `clé du nom → valeurs`. */
export function domainesDeclares(fichiers = []) {
  const domaines = new Map();

  for (const fichier of Array.isArray(fichiers) ? fichiers : []) {
    for (const declaration of lireUnFichier(fichier?.contenu ?? "").declarations ?? []) {
      const nom = cleDuSujet(texte(declaration?.nom));
      const valeurs = (Array.isArray(declaration?.valeurs) ? declaration.valeurs : []).map(texte).filter(Boolean);
      if (nom && valeurs.length) domaines.set(nom, valeurs);
    }
  }

  return domaines;
}

/**
 * Ce qu'une extension accepte comme contenu.
 *
 * `.ref` porte du raisonnement — des fonctions, des déclarations. Les autres
 * portent des affirmations. Écrire une contrainte dans un `.ref` ou une règle
 * dans un `.ctr` ne casse rien aujourd'hui : cela se verra le jour où l'on
 * versera, quand le rangement enverra la ligne ailleurs que là où on l'a
 * écrite — et l'on cherchera longtemps.
 */
function ennuiDExtension(fichier, { blocs, declarations }) {
  const extension = extensionDe(fichier?.nom);
  if (!extension) {
    return {
      quoi: ENNUI.MAUVAISE_EXTENSION,
      ligne: 1,
      dit: `« ${texte(fichier?.nom)} » n'a pas une extension du langage : rien ici ne se versera.`
    };
  }

  const raisonne = blocs.some((bloc) => (bloc?.conditions ?? []).length || bloc?.agent) || declarations.length;
  const affirme = blocs.some((bloc) => texte(bloc?.valeur) && !(bloc?.conditions ?? []).length && !bloc?.agent);

  if (extension !== EXTENSION_REGLE && raisonne) {
    return {
      quoi: ENNUI.MAUVAISE_EXTENSION,
      ligne: 1,
      dit: `Un raisonnement s'écrit dans un « .${EXTENSION_REGLE} », pas dans un « .${extension} ».`
    };
  }
  if (extension === EXTENSION_REGLE && affirme && !raisonne) {
    return {
      quoi: ENNUI.MAUVAISE_EXTENSION,
      ligne: 1,
      dit: `Un « .${EXTENSION_REGLE} } » ne porte aucune valeur de ce projet : ce qu'il y a ici irait dans un « .${EXTENSIONS["donnee-de-base"]} » ou un « .${EXTENSIONS.contrainte} ».`
    };
  }

  return null;
}

/**
 * Ce qui ne va pas dans un brouillon.
 *
 * @param {{nom: string, contenu: string}[]} fichiers ceux qui portent quelque chose
 * @returns {{fichier: string, ligne: number, quoi: string, dit: string, texte: string}[]}
 */
/**
 * Ce qu'une signature annonce, et ce que la fonction lit vraiment.
 *
 * ## Pourquoi on refuse plutôt que de laisser passer
 *
 * La signature ne **lie** rien : une fonction dont le corps lit un nom qu'elle
 * n'annonce pas marche très bien. C'est précisément pour cela qu'il faut la
 * vérifier — rien d'autre ne le fera, et c'est la première chose qu'un
 * relecteur regarde. Un fichier versé qui annonce une fonction qui n'existe pas
 * est exactement ce que cette langue existe pour empêcher.
 *
 * ## Les deux sens comptent
 *
 * **Ce qui manque** fait lire une fonction plus simple qu'elle n'est : on croit
 * savoir ce qu'il faut lui donner, et il faut autre chose.
 *
 * **Ce qui est en trop** fait chercher où l'entrée sert. On relit le corps
 * trois fois, on ne la trouve pas, et l'on finit par douter de sa propre
 * lecture.
 *
 * ## Et la phrase dit quoi faire
 *
 * Nos lecteurs ne sont pas des professionnels du code : « signature invalide »
 * n'apprend rien. La remarque donne donc **la ligne à écrire**.
 */
/**
 * Ce qu'une fonction annonce rendre, comparé à ce qu'elle conclut.
 *
 * **On ne la lance pas pour le savoir** : on regarde les conclusions écrites —
 * le `alors`, le `sinon`, et chaque branche. Ce sont elles qu'on relit, et ce
 * sont elles qui doivent tenir la promesse. Une fonction dont une seule branche
 * sort du domaine annoncé est déjà fausse, même si les autres tiennent.
 *
 * Une conclusion qui **nomme une locale** ne se compare pas : sa valeur dépend
 * des réponses, et l'on ne la connaît qu'au lancement. La refuser ici
 * interdirait `alors (Prix TTC)`, qui est la forme la plus courante du langage.
 */
function ennuisDeCeQuElleRend(bloc = {}) {
  const rend = bloc?.rend;
  if (!rend) return [];

  const sujet = texte(bloc?.sujet);
  const locales = new Set([
    ...(bloc?.calculs ?? []).map((un) => cleDuSujet(un?.nom)),
    cleDuSujet(bloc?.boucle?.nom)
  ].filter(Boolean));

  const conclusions = [
    texte(bloc?.alors),
    texte(bloc?.sinon),
    ...(bloc?.sinonSi ?? []).map((branche) => texte(branche?.alors))
  ].filter(Boolean).filter((une) => !locales.has(cleDuSujet(une)));

  const ennuis = [];

  for (const dite of conclusions) {
    if (rend.valeurs.length) {
      if (rend.valeurs.some((une) => cleDuSujet(une) === cleDuSujet(dite))) continue;
      ennuis.push({
        texte: sujet,
        dit: `« ${sujet} » annonce rendre ${rend.valeurs.map((une) => `« ${une} »`).join(" ou ")}, `
          + `et conclut « ${dite} ». Ajoutez-la au « rend: », ou corrigez la conclusion.`
      });
      continue;
    }

    // Une unité annoncée : la conclusion doit porter la même grandeur.
    const { unite } = couperLUnite(dite);
    if (!estMesuree(dite)) {
      ennuis.push({
        texte: sujet,
        dit: `« ${sujet} » annonce rendre une mesure en ${rend.unite}, et conclut `
          + `« ${dite} », qui n'est pas une mesure. Une mesure s'écrit nue — « 12 ${rend.unite} ».`
      });
      continue;
    }
    if (!memeGrandeur(unite, rend.unite)) {
      ennuis.push({
        texte: sujet,
        dit: `« ${sujet} » annonce rendre des ${rend.unite}, et conclut « ${dite} ». `
          + `Ces deux unités ne mesurent pas la même chose.`
      });
    }
  }

  return ennuis;
}

function ennuisDeLaSignature(bloc = {}) {
  // Une affirmation n'a pas de signature, et un bloc sans parenthèses n'en
  // déclare aucune : il n'y a rien à comparer, et exiger d'en écrire une
  // ferait crier sur chaque ligne de données.
  if (!Array.isArray(bloc?.signature) || !bloc.signature.length) return [];

  const dites = bloc.signature.map(texte).filter((une) => une !== PORTEE_DUNE_FONCTION);
  /**
   * **Une signature annonce tout ce que la fonction lit**, qu'un autre le
   * déduise ou non.
   *
   * On avait d'abord écarté les noms qu'une autre fonction conclut, au motif
   * qu'ils ne se saisissent pas. C'était une invention : le langage écrit
   * `fonction Prix TTC(zones, Prix HT, Taux de TVA)` partout, et il a raison —
   * ce qu'une fonction lit ne dépend pas de ce que quelqu'un a écrit à côté.
   * Une signature qui changerait de sens parce qu'on a ajouté une fonction
   * ailleurs ne voudrait plus rien dire.
   *
   * Ce qui se saisit, c'est une autre question, et c'est le formulaire qui y
   * répond — jamais la signature.
   */
  const attendues = entreesDuBloc(bloc);

  const cles = (noms) => new Set(noms.map(cleDuSujet));
  const manquantes = attendues.filter((une) => !cles(dites).has(cleDuSujet(une)));
  const enTrop = dites.filter((une) => !cles(attendues).has(cleDuSujet(une)));

  const ennuis = [];
  const sujet = texte(bloc?.sujet);
  const juste = [PORTEE_DUNE_FONCTION, ...attendues].join(", ");

  /**
   * **La portée s'écrit en premier, et elle s'écrit.**
   *
   * C'est sous ce nom qu'une fonction reçoit les parties d'ouvrage auxquelles
   * elle s'applique — la signature, l'`importe`, l'appel d'un agent et
   * l'`enregistre` écrivent tous le même mot. Une fonction qui l'omet se lit
   * comme si elle valait partout, ce qui n'est presque jamais ce qu'on veut,
   * et c'est la première question qu'on se pose devant une parenthèse ouverte.
   */
  if (!bloc.signature.map(texte).includes(PORTEE_DUNE_FONCTION)) {
    ennuis.push({
      texte: sujet,
      dit: `« ${sujet} » n'annonce pas sa portée. Elle s'écrit « ${
        PORTEE_DUNE_FONCTION} », et toujours en premier — `
        + `écrivez : ${sujet}(${juste}).`
    });
  }

  if (manquantes.length) {
    ennuis.push({
      texte: sujet,
      dit: `« ${sujet} » lit ${manquantes.map((une) => `« ${une} »`).join(", ")}, `
        + `mais sa signature ne ${manquantes.length > 1 ? "les annonce" : "l'annonce"} pas. `
        + `Écrivez : ${sujet}(${juste}).`
    });
  }

  if (enTrop.length) {
    ennuis.push({
      texte: sujet,
      dit: `la signature de « ${sujet} » annonce ${
        enTrop.map((une) => `« ${une} »`).join(", ")}, `
        + `${enTrop.length > 1 ? "dont elle ne se sert" : "dont elle ne se sert"} jamais. `
        + `Écrivez : ${sujet}(${juste}).`
    });
  }

  return ennuis;
}

export function verifierLeBrouillon(fichiers = [], { memoire = null } = {}) {
  const tous = (Array.isArray(fichiers) ? fichiers : []).filter((fichier) => texte(fichier?.contenu));
  if (!tous.length) return [];


  // **Tous les fichiers d'abord.** Une règle du `.ref` lit un nom déclaré dans
  // le `.ddb` : vérifier fichier par fichier ferait crier au nom inconnu sur
  // chaque entrée d'à côté, et l'écran serait rouge de bout en bout.
  const declares = nomsDeclares(tous);
  const domaines = domainesDeclares(tous);

  /**
   * Les fonctions qu'un appel peut nommer, par sujet : c'est chez elles qu'on
   * lit ce qu'il devrait recevoir, et ce qu'on en obtiendra.
   *
   * ## Celles de la mémoire comptent, et c'était le trou
   *
   * « Cette fonction ne saura jamais répondre pour ce nom-là » ne se disait que
   * d'une fonction **écrite dans les fichiers qu'on vérifie**. Appelée depuis la
   * mémoire du projet — le cas le plus courant une fois qu'on verse — elle
   * échappait au contrôle : on obtenait le silence, qui se lit comme « tout va
   * bien ».
   *
   * ## Sans mémoire, on se tait — et le verdict ne se renverse jamais
   *
   * Une page vérifiée sans mémoire ne dit rien de ces appels-là ; avec, elle en
   * dit davantage. **Aucune remarque ne disparaît parce qu'on en sait plus** :
   * elles s'ajoutent, jamais ne se retirent. C'est ce qui empêche la même page
   * de rendre deux verdicts contraires selon qu'on a lu la base ou non.
   *
   * **Le brouillon gagne** sur la mémoire : c'est la version qu'on est en train
   * d'écrire, et une fonction reprise pour être corrigée doit être lue telle
   * qu'on vient de la corriger.
   */
  const parBloc = new Map(blocsDesFonctionsVersees(Array.isArray(memoire) ? memoire : []));
  const siennes = new Set();
  for (const fichier of tous) {
    for (const bloc of lireUnFichier(fichier?.contenu ?? "").blocs ?? []) {
      const cle = cleDuSujet(texte(bloc?.sujet));
      if (!cle) continue;
      if (!siennes.has(cle)) { siennes.add(cle); parBloc.set(cle, bloc); }
    }
  }

  const remarques = [];

  for (const fichier of tous) {
    const lu = lireUnFichier(fichier.contenu);
    const nom = texte(fichier.nom);

    for (const refuse of lu.refus) {
      remarques.push({
        fichier: nom, ligne: Number(refuse.ligne) || 0, quoi: ENNUI.ILLISIBLE,
        dit: texte(refuse.raison), texte: texte(refuse.texte)
      });
    }

    const ennui = ennuiDExtension(fichier, lu);
    if (ennui) remarques.push({ fichier: nom, texte: "", ...ennui });

    for (const bloc of lu.blocs ?? []) {
      remarques.push(...ceQuOnDonneAuxAppels(bloc, { fichier: nom, blocs: parBloc, domaines }));
    }

    for (const bloc of lu.blocs) {
      remarques.push(...ennuisDeLaSignature(bloc).map((ennui) => ({
        fichier: nom, ligne: Number(bloc?.ligne) || 0, quoi: ENNUI.SIGNATURE, ...ennui
      })));
      remarques.push(...ennuisDeCeQuElleRend(bloc).map((ennui) => ({
        fichier: nom, ligne: Number(bloc?.ligne) || 0, quoi: ENNUI.REND, ...ennui
      })));

      // Les conditions des branches enchaînées comptent comme les autres : un
      // nom cité seulement dans un `sinon si` et déclaré nulle part passerait
      // sans un mot, et la règle « ne saurait pas » sans dire pourquoi.
      const clauses = [
        ...(bloc?.conditions ?? []),
        ...(bloc?.sinonSi ?? []).flatMap((branche) => branche?.conditions ?? []),
        ...(bloc?.sauf ?? [])
      ];
      /**
       * **Ce que la fonction se donne elle-même n'est déclaré nulle part, et
       * c'est normal.** `calcule x = Prix HT * 1,2;` puis `si (x > 0)` est la
       * forme la plus courante de toute la langue, et elle portait « x n'est
       * déclaré nulle part » à chaque fois. Une console qui crie à tort cesse
       * d'être lue, et les vraies remarques se perdent avec les fausses.
       *
       * Elles restent **locales** : elles ne rejoignent pas les noms déclarés
       * du brouillon, sans quoi la fonction d'à côté pourrait lire un `x` qui
       * n'existe pas chez elle.
       */
      const siennes = nomsPosesParLeBloc(bloc);

      for (const condition of clauses) {
        const cite = texte(condition?.sujet);
        const cle = cleDuSujet(cite);
        if (!cle) continue;
        if (siennes.has(cle)) continue;

        if (!declares.has(cle)) {
          remarques.push({
            fichier: nom, ligne: Number(bloc?.ligne) || 0, quoi: ENNUI.NOM_INCONNU, texte: cite,
            dit: `« ${cite} » n'est déclaré nulle part : cette condition porte sur un nom qui n'existe pas.`
          });
          continue;
        }

        // **Une valeur hors du domaine qu'on a soi-même fermé.** Une zone de
        // vent comparée à « 7 » est une condition qui ne sera jamais vraie, et
        // rien ne le dirait : la règle conclurait toujours `sinon`.
        const admises = domaines.get(cle);
        const compare = texte(condition?.valeur);
        if (admises && compare && !admises.includes(compare)) {
          remarques.push({
            fichier: nom, ligne: Number(bloc?.ligne) || 0, quoi: ENNUI.HORS_DU_DOMAINE, texte: compare,
            dit: `« ${cite} » ne vaut que ${admises.map((une) => `« ${une} »`).join(", ")}`
              + ` : cette condition ne sera jamais vraie.`
          });
        }
      }

      // **Une ligne qui nomme et ne dit rien.** Ni valeur, ni condition, ni
      // appel, ni conclusion : c'est un nom nu — ou une phrase en français que
      // la lecture a prise pour un nom.
      const nu = !texte(bloc?.valeur) && !(bloc?.conditions ?? []).length
        && !bloc?.agent && !texte(bloc?.alors) && !texte(bloc?.sinon)
        && !(bloc?.enregistre ?? []).length
        // **Un abaque n'a rien de tout cela et dit beaucoup** : ses points sont
        // sa loi. Le ranger ici le faisait annoncer « ne dit rien » sous une
        // courbe de onze points relevés dans une norme.
        && !bloc?.courbe;
      if (nu) {
        remarques.push({
          fichier: nom, ligne: Number(bloc?.ligne) || 0, quoi: ENNUI.SANS_VALEUR,
          texte: texte(bloc?.sujet),
          dit: `« ${texte(bloc?.sujet)} » est nommé et ne dit rien : ni valeur, ni condition, ni appel.`
        });
      }

      // Une fonction native range un résultat. Sans destination, elle calcule
      // et n'écrit nulle part — ce qui se voit au versement, jamais avant.
      if (bloc?.agent && !(bloc?.enregistre ?? []).length) {
        remarques.push({
          fichier: nom, ligne: Number(bloc?.ligne) || 0, quoi: ENNUI.SANS_DESTINATION, texte: texte(bloc?.sujet),
          dit: `« ${texte(bloc?.sujet)} » appelle un agent et ne dit pas où va son résultat.`
        });
      }
    }
  }

  // Par fichier puis par ligne : c'est l'ordre où on les lira, et une liste
  // rangée autrement oblige à chercher chaque remarque sur l'écran.
  return remarques.sort((gauche, droite) =>
    gauche.fichier.localeCompare(droite.fichier, "fr") || gauche.ligne - droite.ligne);
}

/**
 * Ce que la vérification dit en une ligne.
 *
 * **Le silence est une information**, et il se dit : un écran qui n'affiche
 * rien quand tout va bien laisse croire qu'il n'a pas regardé.
 */
export function phraseDeLaVerification(remarques = [], { fichiers = 0 } = {}) {
  const toutes = Array.isArray(remarques) ? remarques : [];
  if (!fichiers) return "Rien à vérifier : le brouillon est vide.";
  if (!toutes.length) return "Tout se lit. Rien à signaler.";

  const plusieurs = toutes.length > 1;
  return plusieurs
    ? `${toutes.length} remarques — elles ne bloquent rien, elles se corrigent dans le volet.`
    : "1 remarque — elle ne bloque rien, elle se corrige dans le volet.";
}
