/**
 * Ce qu'un dépôt sait vérifier sur lui-même.
 *
 * ## Le modèle, et d'où il vient
 *
 * GitHub tient une liste de **checks** sur une pull request, et il ne sait rien
 * de ce qu'ils vérifient. N'importe quel service s'annonce sur un commit, rend
 * un verdict, et le dépôt décide lesquels bloquent la fusion. C'est ce qui a
 * permis à GitHub de n'avoir jamais eu à savoir ce qu'est un test unitaire.
 *
 * L'onglet « Vérifications » était l'inverse : un écran écrit pour le rapport de
 * bureau de contrôle. « Avis en mouvement », « Livrables non rapatriés », « Lu
 * par ». Le jour où l'on dépose une note de calcul ou une étude incendie, il
 * n'avait rien à dire.
 *
 * On reprend donc le modèle : **un contrôle est ce qu'un déposant sait vérifier
 * sur ce qu'il apporte.** Le moteur tient la liste, il ne connaît aucun métier.
 *
 * ## Quatre issues, pas trois
 *
 * GitHub en a trois — `success`, `failure`, `neutral` — plus l'attente. Il nous
 * en faut une quatrième, et c'est la plus importante :
 *
 * | issue | ce qu'elle dit |
 * | --- | --- |
 * | **tenu** | le contrôle est passé |
 * | **non tenu** | il a échoué, et l'on sait pourquoi |
 * | **sans objet** | il ne s'applique pas à ce dépôt |
 * | **non vérifiable** | on n'a pas pu le vérifier |
 *
 * Chez GitHub, un check qui ne tourne pas reste en attente et bloque : une CI
 * finit toujours par répondre. Ici, « le stockage n'a pas rendu ce PDF » n'est
 * ni un succès ni un échec — c'est une **ignorance**, et elle doit se dire comme
 * telle (fondamentaux, règle 5). Un contrôle non vérifiable ne compte jamais
 * comme tenu, et il ne bloque pas éternellement : il s'affiche.
 *
 * ## Ce qui bloque
 *
 * Comme sur GitHub, ce n'est pas le contrôle qui décide : c'est celui qui
 * fusionne. Un contrôle porte `bloquant: true` quand ce qu'il vérifie engage la
 * mémoire du projet — une contradiction, une provenance manquante. Les autres
 * informent.
 *
 * ## Ajouter un contrôle
 *
 * Une entrée dans `CONTROLES`, avec une fonction qui rend une issue et une
 * phrase. Rien d'autre : ni écran à écrire, ni cas à ajouter dans le rendu.
 * C'est la même séparation que pour les carburants du diff, et pour la même
 * raison — on fabrique le moteur, pas un écran de plus par type de dépôt.
 */

import { describeConflict } from "./memory-conflict.js";
import { ITEM } from "./proposition-state.js";
import { motDeLaNature, nomDeLaLigne } from "./proposition-review.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Ce qu'on a répondu à une ligne mise en cause.
 *
 * Deux réponses, et elles disent la même chose des deux côtés : on retient
 * **celle-ci**. Garder, c'est refuser la ligne que la proposition apporte ;
 * prendre, c'est l'accepter. Le vocabulaire est celui de l'écran, et il vit
 * ici parce que c'est ici qu'on sait ce qu'une ligne porte.
 */
export const TRANCHE = {
  /** Ce que le projet retenait a été gardé. */
  GARDE: "garde",
  /** Ce que cette proposition apporte a été pris. */
  PRIS: "pris"
};

/** Ce qui a été répondu à une ligne, ou `null` si personne ne s'est prononcé. */
function trancheDe(item) {
  const statut = texte(item?.status);
  if (statut === ITEM.REFUSED) return TRANCHE.GARDE;
  if (statut === ITEM.ACCEPTED) return TRANCHE.PRIS;
  return null;
}

/** L'issue d'un contrôle. */
export const ISSUE = {
  TENU: "tenu",
  NON_TENU: "non-tenu",
  SANS_OBJET: "sans-objet",
  NON_VERIFIABLE: "non-verifiable",
  /** Il tourne encore. */
  EN_COURS: "en-cours"
};

export const ISSUE_LABELS = {
  [ISSUE.TENU]: "Tenu",
  [ISSUE.NON_TENU]: "Non tenu",
  [ISSUE.SANS_OBJET]: "Sans objet",
  [ISSUE.NON_VERIFIABLE]: "Non vérifiable",
  [ISSUE.EN_COURS]: "En cours"
};

/**
 * Le **ton** d'un contrôle : ce que sa couleur promet à qui la lit.
 *
 * ## Pourquoi il ne se déduit pas de l'issue seule
 *
 * Une couleur est une phrase. L'orange dit « ce n'est pas parfait, et ça
 * passe » ; le rouge dit « ça ne passe pas ». Le tiroir de fusion peignait en
 * orange un contrôle **requis** qui n'était pas tenu, pendant que l'onglet
 * Vérifications lui mettait une croix rouge : deux écrans, deux promesses
 * contraires sur le même fait, et l'utilisateur croyait pouvoir fusionner
 * jusqu'à ce que le bouton refuse.
 *
 * Le ton dépend donc de **deux** choses — l'issue, et le fait que le contrôle
 * retienne la fusion. Le même « non tenu » vaut rouge sur un contrôle requis et
 * orange sur un contrôle qui se contente d'informer.
 *
 * ## Un seul endroit, comme les icônes
 *
 * Il vit ici, à côté de `ISSUE_ICONES`, et pour la même raison : trois écrans
 * qui choisiraient chacun leur couleur finiraient par ne plus dire la même
 * chose, et c'est celui qu'on ne regarde pas qui aurait raison (règle 4).
 * L'écran ne décide d'aucune couleur — il lit `ligne.ton`.
 */
export const TON = {
  /** Vert. C'est fait, ou ça n'avait pas lieu d'être fait. */
  BON: "bon",
  /** Rouge. Ça ne passe pas : un contrôle requis n'est pas tenu. */
  MAUVAIS: "mauvais",
  /** Orange. On ne sait pas, ou c'est imparfait — mais ça n'empêche pas. */
  DOUTE: "doute",
  /** Bleu. Ça ne se vérifie pas, et quelqu'un a signé pour l'assumer. */
  ASSUME: "assume",
  /** Gris. Ça ne s'applique pas ici. */
  NEUTRE: "neutre",
  /** Ça tourne encore. */
  ATTENTE: "attente"
};

/**
 * Le ton d'un contrôle passé.
 *
 * @param {{issue: string, bloquant: boolean}} ligne
 */
export function tonDuControle({ issue = "", bloquant = false, arbitre = null } = {}) {
  // **Ni vert ni rouge : bleu.** Un contrôle passé outre n'est pas tenu — le
  // fait qu'il constate n'a pas changé —, et il ne retient plus la fusion. Lui
  // donner le vert ferait passer une décision pour une vérification, et c'est
  // exactement la distinction que le procès-verbal existe pour garder
  // (règle 12).
  if (arbitre) return TON.ASSUME;

  if (issue === ISSUE.TENU) return TON.BON;
  if (issue === ISSUE.SANS_OBJET) return TON.NEUTRE;
  if (issue === ISSUE.EN_COURS) return TON.ATTENTE;

  // **Le seul rouge de la table**, et il dit exactement une chose : la fusion
  // est retenue. Un contrôle non tenu qui n'empêche rien reste orange — le
  // peindre en rouge ferait chercher un blocage qui n'existe pas, et
  // l'utilisateur cesserait de croire au rouge le jour où il en aurait besoin.
  if (issue === ISSUE.NON_TENU) return bloquant === true ? TON.MAUVAIS : TON.DOUTE;

  // Non vérifiable : ne pas savoir n'est ni un succès ni un échec, et cela ne
  // bloque pas — c'est à l'humain de décider s'il signe sans savoir.
  return TON.DOUTE;
}

export const ISSUE_ICONES = {
  [ISSUE.TENU]: "check",
  [ISSUE.NON_TENU]: "x",
  [ISSUE.SANS_OBJET]: "skip",
  // « Non vérifiable » porte l'icône d'alerte, jamais celle du succès ni celle
  // de l'échec : ne pas savoir n'est ni l'un ni l'autre, et lui donner l'un des
  // deux visages ferait mentir la colonne d'un coup d'œil.
  [ISSUE.NON_VERIFIABLE]: "alert",
  [ISSUE.EN_COURS]: "sync"
};

const tenu = (phrase, detail = "") => ({ issue: ISSUE.TENU, phrase, detail });
const nonTenu = (phrase, detail = "") => ({ issue: ISSUE.NON_TENU, phrase, detail });
const sansObjet = (phrase, detail = "") => ({ issue: ISSUE.SANS_OBJET, phrase, detail });
const nonVerifiable = (phrase, detail = "") => ({ issue: ISSUE.NON_VERIFIABLE, phrase, detail });

/**
 * Les contrôles qu'on sait faire aujourd'hui.
 *
 * Trois sont **transversaux** — ils valent pour n'importe quel dépôt, et c'est
 * pour eux que ce fichier existe. Les autres appartiennent à une matière : ils
 * se déclarent `sans objet` quand elle n'est pas là, plutôt que d'échouer ou de
 * mentir.
 */
export const CONTROLES = [
  {
    id: "provenance",
    label: "Chaque affirmation dit d'où elle vient",
    bloquant: true,
    // Ce que ce contrôle met en cause, ligne par ligne. On ne décide pas sur un
    // nombre : « 27 affirmations » ne se corrige pas, et ne s'arbitre pas
    // davantage, tant qu'on ne sait pas lesquelles.
    concerne: ({ depot }) => depot?.sansProvenance ?? [],
    verifier: ({ depot }) => {
      if (!depot || depot.affirmations === 0) return sansObjet("Ce dépôt ne porte aucune affirmation.");
      if (depot.provenance === "verifie") {
        return tenu(`${depot.affirmations} affirmation${depot.affirmations > 1 ? "s citent" : " cite"} sa source.`);
      }
      return nonTenu("La provenance de ce dépôt n'est pas établie.", depot.pourquoi);
    }
  },
  {
    id: "memoire",
    label: "Rien ne contredit la mémoire du projet",
    bloquant: true,
    // **Elles se nomment, et se tranchent ici.** Le bloc qui les détaillait vit
    // dans l'onglet Dépôts ; l'arbitrage, dans les Changements. On lisait donc
    // « 29 contradictions doivent être arbitrées » sans en voir une seule, avec
    // pour seule issue un « Passer outre » global — c'est-à-dire assumer en bloc
    // vingt-neuf décisions qu'on n'avait pas lues.
    //
    // **Elles restent listées une fois tranchées.** Elles disparaissaient au
    // clic, si bien qu'on ne voyait pas ce qu'on venait de décider : la liste
    // raccourcissait, et c'est tout. On garde donc chaque ligne avec sa réponse,
    // et le compte dit où l'on en est.
    concerne: ({ conflits = [] }) => (Array.isArray(conflits) ? conflits : []).map((conflit) => {
      // **La même description que le panneau des Dépôts.** Elle sait nommer
      // chaque nature et dire ce que chaque côté affirme ; la recopier ici en
      // plus court aurait fait deux lectures du même conflit, et c'est celle
      // qu'on ne regarde pas qui aurait eu raison (règle 4).
      const dit = safe(() => describeConflict(conflit)) ?? {};

      return {
        itemType: texte(conflit?.item?.itemType),
        itemKey: texte(conflit?.item?.itemKey),
        nature: motDeLaNature(conflit?.item?.itemType, 1),
        // Le nom, pas l'identifiant : on lisait « fermeture c0700a98-c591… » et
        // l'on demandait de trancher là-dessus.
        sujet: texte(dit.title) || nomDeLaLigne(conflit?.item ?? {}),
        // Ce que le projet retenait, et ce que ce lot en dit : c'est l'écart
        // qu'on tranche, pas une ligne de plus à cocher.
        //
        // **La valeur quand il y en a une, la phrase sinon.** Une altitude qui
        // passe de 300 à 320 se lit d'un coup d'œil ; un sujet à fermer, lui,
        // n'affirme aucune valeur — sa contradiction est qu'il avait été écarté
        // et que ce rapport le redit, et cela ne se dit qu'en toutes lettres.
        avant: texte(conflit?.before) || texte(dit.before?.statement),
        apres: texte(conflit?.after) || texte(dit.after?.statement),
        // La phrase du document, quand elle a été conservée. Sans elle, on
        // arbitre entre deux étiquettes.
        extrait: texte(dit.after?.excerpt) || texte(dit.before?.excerpt),
        quand: conflit?.decidedAt ?? null,
        conflit: true,
        tranche: trancheDe(conflit?.item)
      };
    }),
    verifier: ({ conflits = [], blocage = "" }) => {
      if (texte(blocage)) return nonTenu("La mémoire du projet est contredite.", blocage);
      if (conflits.length === 0) return tenu("Aucune décision passée n'est remise en cause par ce dépôt.");
      return tenu(`${conflits.length} contradiction${conflits.length > 1 ? "s ont été tranchées" : " a été tranchée"}.`);
    }
  },
  {
    id: "lecture",
    label: "Tout ce qui est déposé a été lu",
    bloquant: false,
    verifier: ({ documents = [], unreachable = [], analyseFaite }) => {
      if (documents.length === 0) return sansObjet("Ce dépôt n'apporte aucun livrable.");
      if (!analyseFaite) return nonVerifiable("La lecture des livrables n'a pas abouti.");
      if (unreachable.length === 0) return tenu(`${documents.length} livrable${documents.length > 1 ? "s lus" : " lu"}.`);
      return nonVerifiable(
        `${unreachable.length} livrable${unreachable.length > 1 ? "s n'ont" : " n'a"} pas été rapatrié${unreachable.length > 1 ? "s" : ""}.`,
        "L'analyse a porté sur le reste : ce qu'ils contiennent n'est ni confirmé ni infirmé."
      );
    }
  },
  {
    id: "referentiel",
    label: "Le référentiel de lecture est connu",
    bloquant: false,
    verifier: ({ pile = "" }) => {
      if (!texte(pile)) return nonVerifiable("On ne sait pas avec quel vocabulaire ce dépôt a été lu.");
      return tenu(texte(pile));
    }
  },
  {
    id: "avis",
    label: "Les avis relevés sont rattachés à leur livrable",
    bloquant: false,
    verifier: ({ avis = 0, avisHorsDepot = 0, documents = [] }) => {
      if (documents.length === 0) return sansObjet("Aucun livrable, donc aucun avis à rattacher.");
      if (avis === 0 && avisHorsDepot === 0) return tenu("Aucun avis en mouvement dans ce dépôt.");
      if (avisHorsDepot > 0) {
        return tenu(
          `${avis} avis viennent des livrables de ce dépôt.`,
          `${avisHorsDepot} avis du corpus ne lui sont pas attribués : ils appartiennent aux dépôts qui les ont apportés.`
        );
      }
      return tenu(`${avis} avis rattaché${avis > 1 ? "s" : ""} aux livrables de ce dépôt.`);
    }
  }
];

/**
 * Passer les contrôles sur un dépôt.
 *
 * Tant que l'analyse tourne, tout ce qui en dépend est **en cours** — pas tenu,
 * pas échoué. Annoncer « tenu » sur un contrôle qu'on n'a pas encore passé est
 * la seule faute qu'un tableau de contrôles ne peut pas se permettre.
 *
 * @returns {{lignes: object[], bilan: object, bloque: boolean}}
 */
export function passerLesControles(contexte = {}) {
  const enCours = contexte.enCours === true;
  // Ce qui a déjà été assumé, par contrôle. Lu ici plutôt que plaqué après
  // coup : un contrôle passé outre ne doit à aucun moment se présenter comme
  // bloquant, sous peine que l'écran et la fusion ne lisent pas le même état.
  const assumes = contexte.arbitrages instanceof Map
    ? contexte.arbitrages
    : new Map(Object.entries(contexte.arbitrages ?? {}));

  const lignes = CONTROLES.map((controle) => {
    const rendu = enCours
      ? { issue: ISSUE.EN_COURS, phrase: "En attente de la lecture des livrables.", detail: "" }
      : (safe(() => controle.verifier(contexte)) ?? nonVerifiable("Ce contrôle n'a pas pu être passé."));

    const bloquant = controle.bloquant === true;

    // **Un arbitrage ne s'applique qu'à un contrôle qui bloque vraiment.** Un
    // arbitrage resté en base après que la cause a disparu — le PDF est
    // finalement arrivé, la valeur cite enfin son texte — ne doit pas peindre
    // en bleu un contrôle redevenu tenu : on lirait « assumé » sur ce qui a été
    // vérifié.
    const arbitre = bloquant && rendu.issue === ISSUE.NON_TENU
      ? (assumes.get(controle.id) ?? null)
      : null;

    return {
      id: controle.id,
      label: controle.label,
      bloquant,
      issue: rendu.issue,
      issueLabel: arbitre ? "Passé outre" : (ISSUE_LABELS[rendu.issue] ?? rendu.issue),
      icone: arbitre ? "shield" : (ISSUE_ICONES[rendu.issue] ?? "question"),
      // La couleur se décide ici, et l'écran la lit. Trois écrans qui la
      // choisiraient chacun de leur côté finiraient par se contredire — c'est
      // ce qui s'est passé.
      ton: tonDuControle({ issue: rendu.issue, bloquant, arbitre }),
      phrase: texte(rendu.phrase),
      detail: texte(rendu.detail),
      // Ce que ce contrôle met en cause — **tenu ou non**, dès lors qu'il
      // bloque. Ne le calculer que sur un contrôle non tenu faisait disparaître
      // le bloc d'arbitrage à la seconde où la dernière ligne basculait : on ne
      // pouvait plus relire ce qu'on venait de trancher, ni le signer.
      concerne: bloquant ? (safe(() => controle.concerne?.(contexte)) ?? []) : [],
      // Qui a assumé, quand, et pourquoi — ou `null`.
      arbitre
    };
  });

  const bilan = { tenu: 0, "non-tenu": 0, "sans-objet": 0, "non-verifiable": 0, "en-cours": 0 };
  for (const ligne of lignes) bilan[ligne.issue] += 1;

  // Ce sur quoi il y a eu, ou il y a encore, quelque chose à trancher. Un
  // contrôle redevenu tenu y reste tant qu'il porte des lignes qu'on a
  // tranchées une à une : c'est là qu'on les relit avant de signer.
  const arbitrages = lignes.filter(
    (ligne) => estAArbitrer(ligne) || (ligne.bloquant && ligne.concerne.some((entree) => entree?.conflit))
  );

  const restants = arbitrages.reduce((compte, ligne) => compte + resteAArbitrer(ligne), 0);
  // Il n'y a de procès-verbal à signer que s'il y a eu quelque chose à arbitrer.
  // Faire signer une proposition que rien ne retenait ajouterait un clic à
  // chaque fusion pour n'attester de rien.
  const aSigner = arbitrages.length > 0;

  // **Une signature vaut pour ce qu'elle a signé.** Revenir sur une décision
  // après coup — depuis l'autre onglet, depuis la liste des contradictions — ne
  // doit pas laisser courir un procès-verbal qui décrit autre chose. Les
  // comptes sont dans la ligne signée : il suffit de les comparer.
  const compte = comptesDeLArbitrage(arbitrages);
  const signature = contexte.signature ?? null;
  const signe = Boolean(signature)
    && signature.gardees === compte.gardees
    && signature.prises === compte.prises
    && signature.assumes === compte.assumes;

  return {
    lignes,
    bilan,
    arbitrages,
    /** Combien de décisions restent à prendre, lignes comprises. */
    restants,
    aSigner,
    signe,
    /** Le procès-verbal tel qu'il a été signé, s'il vaut encore. */
    signature: signe ? signature : null,
    /**
     * Ce qui retient la fusion.
     *
     * **Trancher n'est pas signer.** La dernière ligne basculée, l'écran passait
     * à « Prêt à fusionner » sans qu'on ait rien arrêté : on fusionnait au clic
     * qui suivait, sans avoir relu l'ensemble. Le procès-verbal est l'acte qui
     * clôt la série de choix ; la fusion vient après, et c'est un autre geste.
     *
     * Un contrôle non vérifiable, lui, ne bloque toujours pas : ne pas savoir
     * n'est pas un échec, et c'est à l'humain de décider s'il signe sans savoir.
     */
    bloque: restants > 0 || (aSigner && !signe)
  };
}

/**
 * Ce qui a été tranché, par verdict.
 *
 * C'est ce que le procès-verbal enregistre, et c'est aussi ce qui permet de
 * savoir s'il vaut encore : une signature qui annonce douze gardées sur un
 * arbitrage qui en compte onze ne décrit plus la séance qu'elle a close.
 */
export function comptesDeLArbitrage(arbitrages = []) {
  const lignes = Array.isArray(arbitrages) ? arbitrages : [];
  const enConflit = lignes.flatMap((ligne) => (ligne?.concerne ?? []).filter((entree) => entree?.conflit));

  return {
    gardees: enConflit.filter((entree) => entree.tranche === TRANCHE.GARDE).length,
    prises: enConflit.filter((entree) => entree.tranche === TRANCHE.PRIS).length,
    assumes: lignes.filter((ligne) => ligne?.arbitre).length
  };
}

/**
 * Combien de décisions un contrôle attend encore.
 *
 * Zéro quand il a été passé outre : quelqu'un a signé pour l'assumer, et c'est
 * une décision. Zéro aussi quand toutes ses lignes ont été tranchées. Sinon :
 * le nombre de lignes en attente, ou une seule décision quand il n'y a rien à
 * trancher ligne à ligne — on ne peut alors que l'écarter ou passer outre.
 */
export function resteAArbitrer(ligne = {}) {
  if (ligne?.arbitre) return 0;

  const enConflit = (ligne?.concerne ?? []).filter((entree) => entree?.conflit);
  if (enConflit.length > 0) return enConflit.filter((entree) => !entree.tranche).length;

  return estAArbitrer(ligne) ? 1 : 0;
}

/**
 * Un contrôle qui appelle une décision.
 *
 * Requis, pas tenu. Passé outre, il reste dans la liste — c'est même tout
 * l'objet : on doit pouvoir relire ce qu'on a assumé, et revenir dessus tant
 * que la proposition est ouverte.
 */
export function estAArbitrer(ligne = {}) {
  return ligne?.bloquant === true && ligne?.issue === ISSUE.NON_TENU;
}

/** Ce que le tableau dit en une phrase. */
export function resumeDesControles({ lignes = [], bilan = {} } = {}) {
  if (bilan["en-cours"] === lignes.length && lignes.length > 0) return "Contrôles en attente de l'analyse.";

  const morceaux = [];
  const ajouter = (nombre, mot) => { if (nombre > 0) morceaux.push(`${nombre} ${mot}`); };
  ajouter(bilan["non-tenu"], bilan["non-tenu"] > 1 ? "non tenus" : "non tenu");
  ajouter(bilan["non-verifiable"], bilan["non-verifiable"] > 1 ? "non vérifiables" : "non vérifiable");
  ajouter(bilan.tenu, bilan.tenu > 1 ? "tenus" : "tenu");
  ajouter(bilan["sans-objet"], "sans objet");

  return morceaux.length ? morceaux.join(" · ") : "Aucun contrôle.";
}

/** Un contrôle qui jette n'emporte pas les autres avec lui. */
function safe(travail) {
  try { return travail(); } catch { return null; }
}
