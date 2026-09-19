/**
 * Ce qu'un fil porte et que personne n'a écrit : les questions sans réponse,
 * les désaccords.
 *
 * ## Pourquoi on ne les demande pas au modèle
 *
 * Ce sont les deux apports qu'un compte rendu ne porte jamais — et ce sont
 * précisément les deux qu'il ne faut pas demander. Une question sans réponse
 * n'est pas quelque chose qu'un message **dit** : c'est quelque chose qui
 * **n'arrive pas** dans les messages suivants. Un modèle interrogé là-dessus ne
 * peut que le supposer, et il le supposera de façon plausible — c'est-à-dire
 * qu'il en inventera.
 *
 * Les calculer sur le fil déplié en fait des **observations** : on peut dire
 * exactement d'où chacune sort, et les refaire à la main pour vérifier.
 *
 * ## Une question sans réponse
 *
 * Une demande qu'aucun message postérieur ne reprend. « Reprendre » veut dire
 * ici : un constat, une décision ou un engagement, plus tard dans le fil, sur
 * **la même chose**.
 *
 * - Une autre demande sur la même chose n'est pas une réponse : c'est une
 *   relance, et elle prouve plutôt le contraire.
 * - Une source n'est pas une réponse non plus : elle fonde, elle ne tranche pas.
 *
 * **Deux signaux, et ils ne se valent pas.**
 *
 * Le premier est `porteSur` : deux prises qui portent le même sujet. Il vient
 * du modèle, qui écrit ce libellé librement, et deux fils réels ont montré ce
 * qu'il coûte — « rectification de la pose d'étanchéité » et « reprise de la
 * membrane » désignent la même chose et ne partagent aucun mot. Sur ce fil,
 * **trois des quatre « questions sans réponse » avaient reçu une réponse**.
 *
 * Le second est `repondA` : le modèle dit à quel message sa prise répond. On
 * ne le croit pas sur parole — le rang doit exister et être antérieur, sinon
 * il est écarté au serveur et compté. C'est le seul des deux qu'on puisse
 * vérifier.
 *
 * **On dit lequel a parlé** (`parQuel`). Un modèle qui déclarerait des renvois
 * à tort ferait taire des questions restées sans réponse — l'apport principal
 * du procédé —, et cela doit pouvoir se lire plutôt que de se deviner.
 *
 * Une demande sans sujet **et** sans renvoi ne se dérive pas : elle sort en
 * « on ne sait pas », qui n'est ni « répondue » ni « restée sans réponse ». Ne
 * pas savoir n'autorise pas à prétendre qu'il n'y a rien (règle 5).
 *
 * ## Un désaccord
 *
 * **Ce n'est pas deux constats qui divergent : c'est quelqu'un qui conteste.**
 *
 * La première version cherchait deux constats sur la même chose, de deux
 * auteurs, dont l'un niait ce que l'autre affirmait. Un fil réel l'a jugée :
 * sur six messages, elle a rendu **quatre-vingt-seize désaccords, et pas un
 * seul n'en était un**. La raison tient en une phrase : porter sur le même
 * sujet et contenir une négation ne fait pas se contredire. « Vitesse de
 * souffle 15 m : 120 km/h » et « le souffle ne concerne qu'une portion de la
 * façade » parlent du même rotor sans se contredire en rien.
 *
 * Resserrer le critère ne l'a pas sauvé : exiger du vocabulaire commun a fait
 * tomber le compte de 96 à 16, **sans en rendre un seul vrai**. Un mécanisme
 * dont la précision est nulle ne se règle pas, il se remplace.
 *
 * Ce qu'on cherche désormais est ce qu'un désaccord **est** : une prise dont
 * les mots prennent position **contre ce qui a été dit**. « Je ne partage pas
 * votre position », « cette justification n'est pas suffisante », « hypothèse
 * non conforme », « nous paraît disproportionné ». Sur le même fil, ce critère
 * a relevé **quatre prises sur quarante-six** — et ce sont les quatre du
 * litige.
 *
 * ## Ce qu'on ne prétend pas savoir
 *
 * **Quelle position exacte est contestée.** On a essayé de la désigner — le
 * dernier propos d'un autre auteur sur le même sujet — et le candidat le plus
 * proche était faux à chaque fois : ce que Cagnin conteste est un avis inscrit
 * dans un rapport, qui n'est dans aucun message. On rend donc la contestation
 * avec ses mots, et **les auteurs qui s'étaient exprimés avant elle sur le même
 * sujet**, sans désigner lequel. Nommer au jugé serait prêter à quelqu'un une
 * position qu'il n'a pas prise (règle 5).
 *
 * **Un désaccord exprimé sans aucune de ces marques ne se voit pas.** C'est le
 * prix, et il est assumé : une rubrique fausse aux quatre-vingt-seize
 * quatre-vingt-seizièmes coûte plus cher qu'une rubrique qui en manque.
 *
 * ## Il est pur
 *
 * Des prises entrent, des prises sortent. Aucun réseau, aucun modèle, aucune
 * horloge — et chaque ligne rendue dit de quelles prises elle sort.
 */

import { NATURE, lesPrisesEtLeursAuteurs } from "./prises-de-position.js";

/** Ce qu'on a pu établir d'une demande. */
export const SUITE = {
  /** Un message postérieur la reprend. */
  REPONDUE: "repondue",
  /** Aucun ne la reprend : c'est l'apport principal du fil. */
  SANS_REPONSE: "sans-reponse",
  /** On ne peut pas le dire — et c'est une troisième réponse, pas la deuxième. */
  ON_NE_SAIT_PAS: "on-ne-sait-pas"
};

/**
 * Par quel signal on a su qu'une demande avait reçu une réponse.
 *
 * **Les deux ne se valent pas**, et les confondre cacherait le seul qui se
 * vérifie. Un renvoi a été confronté au fil ; un sujet commun est un libellé
 * que le modèle a écrit deux fois de la même façon.
 */
export const PAR = {
  /** Le modèle a dit à quel message cette prise répond, et le rang tenait. */
  RENVOI: "renvoi",
  /** Les deux prises portent le même sujet. */
  SUJET: "sujet"
};

/** Ce qui compte comme une réponse à une demande. */
const REPONDENT = new Set([NATURE.CONSTAT, NATURE.DECISION, NATURE.ENGAGEMENT]);

/**
 * Les marques d'une contestation.
 *
 * Chacune vise **le dire de l'autre**, et non l'ouvrage : c'est ce qui les
 * distingue d'une négation ordinaire. « Le support n'est pas sec » nie un fait ;
 * « votre appréciation nous paraît disproportionnée » nie une position.
 *
 * Elles sont nommées une par une, et non repliées en une expression unique :
 * une marque qui se met à rendre n'importe quoi doit pouvoir être retirée
 * seule, et l'écran doit pouvoir dire **laquelle** a parlé.
 *
 * ## Deux familles, et un fil pour chacune
 *
 * Les cinq premières marques ont été réglées sur un échange formel entre un
 * bureau d'études et un bureau de contrôle, où l'on conteste en registre
 * juridique. **Un second fil a montré qu'elles ne voyaient rien d'un échange
 * de chantier** : quatre contestations réelles, zéro relevée. On y conteste
 * en français parlé — « le temps **ne va pas** la coller », « elle n'aurait
 * **rien à voir avec les creux dont vous parlez** ».
 *
 * Les trois dernières viennent de là, et chacune a été éprouvée **sur les deux
 * fils** : aucune ne parle à tort sur le premier. Une quatrième candidate,
 * « toutefois », a été écartée pour cette raison — elle ouvre une phrase
 * ordinaire dans l'échange formel.
 *
 * C'est un lexique, avec ce que cela suppose de fragile : deux mesures ne font
 * pas une garantie, et un troisième fil montrera sans doute une troisième
 * famille. Il est cherché dans la citation **et** dans l'intitulé : la citation
 * porte les mots de l'auteur, l'intitulé ceux du modèle, et la marque peut
 * tomber d'un côté comme de l'autre.
 */
export const MARQUE = {
  /** « je ne partage pas votre position », « nous ne souscrivons pas ». */
  NE_PARTAGE_PAS: "ne-partage-pas",
  /** La position de l'autre, nommée comme telle : « votre appréciation ». */
  VOTRE_POSITION: "votre-position",
  /** « non conforme », « n'est pas suffisant », « n'est pas recevable ». */
  PAS_RECEVABLE: "pas-recevable",
  /** « disproportionné », « nous paraît excessif ». */
  DISPROPORTIONNE: "disproportionne",
  /** « contrairement à », « vous indiquiez vous-même ». */
  RETOURNE_CONTRE: "retourne-contre",
  /** « les creux **dont vous parlez** » : on vise le dire de l'autre, nommément. */
  REPRISE_DU_DIRE: "reprise-du-dire",
  /** « le temps **ne va pas** la coller » : on dément ce qui vient d'être avancé. */
  NE_VA_PAS: "ne-va-pas",
  /** « **pour autant**, je demande que… » : on maintient malgré ce qui a été dit. */
  POUR_AUTANT: "pour-autant"
};

const MARQUES = [
  [MARQUE.NE_PARTAGE_PAS,
    /\b(?:je|nous|on)\s+ne\s+(?:partage\w*|souscri\w+|suis|sommes)\b|\bne\s+partage\w*\s+pas\b|\bpas\s+d['’]accord\b/],
  [MARQUE.VOTRE_POSITION,
    /\b(?:votre|vos)\s+(?:position|appreciation|avis|analyse|lecture|interpretation|conclusion|exigence)\w*/],
  [MARQUE.PAS_RECEVABLE,
    /\bnon[-\s]?conforme\w*|\bn['’]?\s?est\s+pas\s+(?:suffisant|justifi|recevable|fond|exact|correct|acceptable)\w*/],
  [MARQUE.DISPROPORTIONNE,
    /\bdisproportionne\w*|\b(?:nous|me)\s+para[iî]t\s+(?:excessi|disproportionne|infonde)\w*/],
  [MARQUE.RETOURNE_CONTRE,
    /\bcontrairement\s+a\b|\bvous\s+indiquiez\s+vous[-\s]?m[eê]me\b|\bvous[-\s]?m[eê]me\s+(?:indiquiez|ecriviez|reconnaissiez)\b/],
  [MARQUE.REPRISE_DU_DIRE,
    /\b(?:dont|que|desquels?)\s+vous\s+(?:parlez|evoquez|faites\s+etat|indiquez|mentionnez)\b|\bcomme\s+vous\s+l['’]indiquez\b|\brien\s+a\s+voir\b|\bsans\s+rapport\s+avec\b/],
  [MARQUE.NE_VA_PAS,
    /\bne\s+(?:va|vont|saurai?[et]?nt?)\s+pas\b/],
  [MARQUE.POUR_AUTANT,
    /\bpour\s+autant\b/]
];

const texte = (valeur) => String(valeur ?? "").trim();

/** Casse et accents effacés : le lexique s'écrit sans eux, une fois. */
function aplatiPourLeLexique(valeur) {
  return texte(valeur).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * La marque qu'une prise porte, s'il y en a une.
 *
 * Rend la première trouvée — un nom, pas un booléen : « pourquoi celle-ci est
 * rendue » doit pouvoir se lire sans rouvrir le code.
 */
export function laMarqueDeContestation(prise) {
  const lu = `${aplatiPourLeLexique(prise?.citation)} ${aplatiPourLeLexique(prise?.intitule)}`;
  for (const [nom, forme] of MARQUES) if (forme.test(lu)) return nom;
  return "";
}


/**
 * Les marques d'une offre conditionnelle.
 *
 * **« Si vous le souhaitez, nous pouvons… » n'est pas une question restée sans
 * réponse.** C'est une prestation proposée, qui attend une décision — et sur
 * un fil réel, l'une d'elles exigeait **une commande payante**. Les ranger
 * sous « question sans réponse » faisait chercher une relance là où il y avait
 * un devis, et c'est ce qui a le plus de conséquences dans tout le relevé.
 *
 * Le modèle les déclare en `demande`, ce qui se comprend : quelque chose est
 * bien attendu de quelqu'un. Mais ce qui est attendu est un **accord**, pas
 * une réponse.
 *
 * Mesuré sur un fil de 38 prises : deux relevées, et ce sont les deux offres.
 */
export const OFFRE = {
  /** Une commande est exigée : c'est la marque qui a un prix. */
  CONTRE_COMMANDE: "contre-commande",
  /** « pourra être réalisée à votre demande ». */
  SUR_DEMANDE: "sur-demande",
  /** « si le bureau X souhaite…, nous sommes en mesure de ». */
  SI_VOUS_SOUHAITEZ: "si-vous-souhaitez"
};

const OFFRES = [
  [OFFRE.CONTRE_COMMANDE,
    /\b(?:devra|devront)\s+faire\s+l['’e]objet\s+d['’e]une\s+commande\b|\bcommande\s+(?:complementaire|specifique|prealable)\w*|\bprestation\s+(?:complementaire|supplementaire)\w*/],
  [OFFRE.SUR_DEMANDE,
    /\bpourra?\s+(?:etre|faire)\s+\w+\s+a\s+(?:votre|sa|leur)\s+demande\b|\ba\s+votre\s+demande\b|\bsur\s+demande\b/],
  [OFFRE.SI_VOUS_SOUHAITEZ,
    /\bsi\s+(?:vous|le|la|les)\s+[\w\s'’]{0,30}?souhaite\w*\b|\bnous\s+sommes\s+en\s+mesure\s+de\b|\bnous\s+pouvons\s+(?:vous\s+)?(?:proposer|realiser|fournir)\b/]
];

/**
 * La marque d'offre qu'une prise porte, s'il y en a une.
 *
 * **La plus engageante d'abord** : une offre qui exige une commande est
 * d'abord cela, quelle que soit la politesse qui l'entoure.
 */
export function laMarqueDuneOffre(prise) {
  const lu = `${aplatiPourLeLexique(prise?.citation)} ${aplatiPourLeLexique(prise?.intitule)}`;
  for (const [nom, forme] of OFFRES) if (forme.test(lu)) return nom;
  return "";
}

/**
 * Les mots qui ne désignent rien.
 *
 * Ils ne servent qu'à lier, et deux libellés qui ne partagent qu'eux ne
 * partagent rien.
 */
const MOTS_VIDES = new Set(("de des du la le les un une et ou a au aux en dans sur sous pour par "
  + "avec sans ce cette ces son sa ses leur leurs est sont etre").split(" "));

/** Un libellé, réduit à ses mots pleins, accents et casse effacés. */
function motsDuSujet(valeur) {
  return String(valeur ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
    .split(" ")
    .filter((mot) => mot && !MOTS_VIDES.has(mot));
}

/** Le plancher sous lequel un libellé est trop court pour en désigner un autre. */
const ASSEZ_DE_MOTS = 2;

/** La suite de mots du plus court se lit-elle d'un tenant dans le plus long ? */
function seLitDedans(court, long) {
  if (court.length < ASSEZ_DE_MOTS || court.length > long.length) return false;
  for (let debut = 0; debut + court.length <= long.length; debut += 1) {
    if (court.every((mot, rang) => long[debut + rang] === mot)) return true;
  }
  return false;
}

/**
 * Deux libellés désignent-ils la même chose ?
 *
 * ## L'égalité exacte ne suffisait pas
 *
 * `porteSur` vient du modèle, à qui l'on demande les **mêmes mots** d'une prise
 * à l'autre quand c'est la même chose. Il ne le fait pas : sur un fil réel,
 * **28 libellés pour 39 prises**. Le désaccord portait « combinaison souffle et
 * vent **simultanée** » quand l'autre partie s'était exprimée deux fois sur
 * « combinaison souffle et vent ». L'écran affirmait alors que **personne**
 * n'avait parlé du sujet, ce qui était faux.
 *
 * ## Ce qu'on a essayé, et pourquoi on ne l'a pas retenu
 *
 * Compter les mots pleins communs rejoue la maladie des quatre-vingt-seize
 * désaccords : à deux mots, « prise en compte action souffle rotor » rejoint
 * « prise en compte composante verticale sismique » — deux points de rapport
 * différents, soudés par une locution vide. À trois, « nature souffle rotor et
 * vent » rejoint « pression vent comparée à souffle rotor ». Mesuré sur les 28
 * libellés : 41 rapprochements à deux mots, 5 à trois, dont la plupart faux.
 *
 * ## Ce qu'on retient : l'un se lit dans l'autre
 *
 * Un libellé en désigne un autre quand **sa suite de mots pleins se lit d'un
 * tenant** dans le sien. Quatre rapprochements sur les mêmes 28 libellés, et
 * les quatre tiennent.
 *
 * Deux garde-fous, et chacun répare un piège réel :
 *
 * - **sur les mots, pas sur les lettres** — « vent » ne se lit pas dans
 *   « ventilation » ;
 * - **deux mots pleins au moins** — un libellé d'un seul mot désignerait tout
 *   ce qui le contient.
 */
export function memeSujet(un, autre) {
  const gauche = motsDuSujet(un);
  const droite = motsDuSujet(autre);
  if (!gauche.length || !droite.length) return false;
  if (gauche.join(" ") === droite.join(" ")) return true;

  return gauche.length <= droite.length
    ? seLitDedans(gauche, droite)
    : seLitDedans(droite, gauche);
}

function rangDe(prise) {
  return Number(prise?.message) || 0;
}

/**
 * Ce qu'est devenue une demande dans la suite du fil.
 *
 * `apresElle` compte les messages qui la suivent : zéro veut dire que le fil
 * s'arrête là. Une demande dans le dernier message n'a pas été ignorée — elle
 * n'a pas encore eu le temps de l'être, et c'est un fait, pas un jugement.
 */
/**
 * Les autres sujets sur lesquels le fil a continué.
 *
 * ## Pourquoi cela se dit
 *
 * « Restée sans réponse » est l'apport principal du procédé, et il repose sur
 * **deux signaux seulement** : un renvoi que le modèle déclare, et un sujet
 * partagé. Quand aucun des deux ne parle, on écrit « sans réponse » — et l'on
 * n'a en réalité regardé que sous un seul sujet.
 *
 * Un fil réel l'a montré, aux trois passages. « Merci à l'entreprise de
 * rectifier ce défaut » est rangée sans réponse sous *qualité de la pose de
 * l'étanchéité* ; deux messages plus loin, « Nous envoyons tout de même
 * quelqu'un aujourd'hui pour reprendre la membrane » est un engagement sous
 * *reprise et essais d'étanchéité*. **Un lecteur y lit une réponse ; la liste
 * fermée des sujets les avait séparés.**
 *
 * ## Ce qu'on rend, et ce qu'on refuse de faire
 *
 * Les sujets, rien de plus. **On ne les fusionne pas** : souder deux sujets au
 * jugé ferait passer une question pour répondue par une prise qui n'y répond
 * pas — le pire résultat possible, et celui que toute cette étape sert à
 * éviter. On ne désigne pas non plus la prise : on ne sait pas laquelle.
 *
 * On dit **où l'on n'a pas regardé**, et le lecteur y va. Ne pas savoir
 * n'autorise pas à prétendre qu'il n'y a rien (règle 5) ; cela n'autorise pas
 * davantage à deviner.
 *
 * Une liste vide veut dire que le fil n'a rien porté d'autre : là, « sans
 * réponse » est tout ce qu'il y a à en dire.
 */
export function lesAutresSujets(prise, prises = [], { natures = null, apres = true } = {}) {
  const sien = texte(prise?.porteSur);
  const liste = Array.isArray(prises) ? prises : [];

  return [...new Set(liste
    .filter((autre) => autre !== prise)
    .filter((autre) => !natures || natures.has(texte(autre?.nature)))
    .filter((autre) => (apres ? rangDe(autre) > rangDe(prise) : rangDe(autre) <= rangDe(prise)))
    .map((autre) => texte(autre?.porteSur))
    .filter(Boolean)
    // **Pas le sien** : c'est justement celui sous lequel on a déjà cherché,
    // et le redire ferait croire qu'on a trouvé quelque chose.
    .filter((sujet) => !memeSujet(sujet, sien)))];
}

export function laSuiteDuneDemande(demande, prises = [], { dernierMessage = 0 } = {}) {
  const apresElle = Math.max(0, Number(dernierMessage) - rangDe(demande));
  const sujet = texte(demande?.porteSur);
  const liste = Array.isArray(prises) ? prises : [];

  // Une demande ne peut pas se répondre à elle-même, et rien ne l'écarte
  // explicitement : `REPONDENT` ne contient pas les demandes, et un message
  // n'est pas postérieur à lui-même. Une garde de plus a été essayée puis
  // retirée — aucune rupture ne la faisait parler (règle 12).
  const posterieures = liste.filter((autre) =>
    REPONDENT.has(texte(autre?.nature)) && rangDe(autre) > rangDe(demande));

  // **Le renvoi d'abord**, parce que c'est le seul des deux qu'on vérifie : le
  // rang qu'il porte a été confronté au fil avant d'arriver ici.
  const parRenvoi = posterieures.find((autre) => Number(autre?.repondA) === rangDe(demande));
  if (parRenvoi) {
    return { suite: SUITE.REPONDUE, parQuoi: parRenvoi, parQuel: PAR.RENVOI, apresElle, ailleurs: [] };
  }

  if (!sujet) {
    return { suite: SUITE.ON_NE_SAIT_PAS, parQuoi: null, parQuel: null, apresElle, ailleurs: [] };
  }

  const parLeSujet = posterieures.find((autre) => memeSujet(autre?.porteSur, sujet));
  if (parLeSujet) {
    return { suite: SUITE.REPONDUE, parQuoi: parLeSujet, parQuel: PAR.SUJET, apresElle, ailleurs: [] };
  }

  return {
    suite: SUITE.SANS_REPONSE,
    parQuoi: null,
    parQuel: null,
    apresElle,
    /**
     * Les sujets sur lesquels le fil a continué, et sous lesquels on n'a pas
     * cherché. C'est l'aveu de ce que les deux signaux ne couvrent pas.
     */
    ailleurs: lesAutresSujets(demande, liste, { natures: REPONDENT })
  };
}

/**
 * Deux constats qui semblent se contredire.
 *
 * Même sujet, deux auteurs, deux polarités opposées. Deux constats du même
 * auteur ne font pas un désaccord — c'est une précision, ou un changement
 * d'avis, et ce n'est pas la même chose.
 *
 * Une même paire ne sort qu'une fois : trois constats contraires deux à deux
 * donneraient sinon six lignes pour trois positions.
 */
export function lesContestations(prises = []) {
  const liste = (Array.isArray(prises) ? prises : []);

  const trouvees = [];
  for (const prise of liste) {
    const marque = laMarqueDeContestation(prise);
    if (!marque) continue;
    if (!texte(prise?.porteSur)) continue;

    // **Qui s'était exprimé avant, sur la même chose.** Pas « ce qui est
    // contesté » : on ne le sait pas, et le candidat le plus proche s'est
    // révélé faux à chaque essai. Des noms et un compte, rien de plus.
    //
    // Ce qu'on trouve ici dépend de `memeSujet`, donc des libellés que le
    // modèle a posés. **Une liste vide dit qu'on n'a trouvé personne sous le
    // même sujet — pas que personne n'a parlé** : la nuance est celle du
    // fil réel où l'écran affirmait « ce qui est contesté vient d'ailleurs »
    // alors que la position visée était deux messages plus haut, sous un
    // libellé voisin (règle 5).
    const avant = [...new Map(liste
      .filter((autre) => autre !== prise)
      .filter((autre) => memeSujet(autre?.porteSur, prise?.porteSur))
      .filter((autre) => cleDe(autre) !== cleDe(prise))
      .filter((autre) => rangDe(autre) <= rangDe(prise))
      .map((autre) => [cleDe(autre), texte(autre?.qui) || "auteur inconnu"])
    ).values()];

    // **Et quand on n'a trouvé personne, on dit où l'on n'a pas regardé.** Sur
    // un fil réel, la position contestée était sous un sujet voisin, déclaré à
    // part par le modèle : *origine de la fuite* d'un côté, *infiltration d'eau
    // sur toiture* de l'autre — le même litige vu des deux bouts. Les nommer ne
    // les fusionne pas ; cela dit au lecteur où aller (règle 5).
    const ailleurs = avant.length ? [] : lesAutresSujets(prise, liste, { apres: false });

    trouvees.push({ prise, marque, avant, ailleurs });
  }
  return trouvees;
}

/** L'auteur d'une prise, ramené à une clé. Voir `laCleDeLAuteur`. */
function cleDe(prise) {
  return texte(prise?.quiCle) || texte(prise?.qui).toLowerCase();
}

function uneQuestionSansReponse(demande, suite) {
  return {
    ...demande,
    key: `${demande.key}:sans-reponse`,
    nature: NATURE.SANS_REPONSE,
    /** Ce que le modèle avait déclaré. Rien n'est masqué : la nature a changé, pas le fait. */
    natureDeclaree: NATURE.DEMANDE,
    suite: suite.suite,
    apresElle: suite.apresElle,
    /** Les sujets sous lesquels le fil a continué, et où l'on n'a pas cherché. */
    ailleurs: suite.ailleurs ?? []
  };
}

function uneOffre(prise, marque) {
  return {
    ...prise,
    key: `${texte(prise?.key)}:offre`,
    nature: NATURE.OFFRE,
    /** Ce que le modèle avait déclaré : la nature a changé, pas le fait. */
    natureDeclaree: texte(prise?.nature),
    /** Laquelle des marques a parlé. De quoi juger la règle sur pièce. */
    marque
  };
}

function unDesaccord(contestation, rang) {
  const { prise, marque, avant } = contestation;
  return {
    ...prise,
    key: `desaccord:${texte(prise?.key) || rang + 1}`,
    nature: NATURE.DESACCORD,
    /** Ce que le modèle avait déclaré : la nature a changé, pas le fait. */
    natureDeclaree: texte(prise?.nature),
    /** La position prise, avec son auteur, sa date et sa citation. */
    positions: [prise],
    /** Laquelle des marques a parlé. De quoi juger la règle sur pièce. */
    marque,
    /**
     * Qui s'était exprimé avant, sur le même sujet.
     *
     * Des noms, pas une position désignée : on ne sait pas laquelle est
     * contestée, et la nommer au jugé prêterait à quelqu'un un propos qu'il
     * n'a pas tenu.
     */
    avant
  };
}

/**
 * Ce que le fil dit sans que personne l'ait écrit.
 *
 * Rend la liste complète des prises, les dérivées comprises :
 *
 * - **une demande restée sans réponse change de nature** et quitte la rubrique
 *   des demandes. Une seule ligne, dans la rubrique qui compte — la montrer
 *   deux fois ferait lire deux fois le même fait ;
 * - **les oppositions s'ajoutent**, sans retirer les constats dont elles
 *   sortent. Un constat reste vrai pour son auteur ; l'opposition est une
 *   observation sur la paire, pas un remplacement.
 *
 * `trous` dit ce qu'on n'a pas pu dériver, et pourquoi.
 */
export function ceQuonDerive(prises = [], { dernierMessage = 0, messages = [] } = {}) {
  const liste = Array.isArray(prises) ? prises : [];
  const fin = Number(dernierMessage) || liste.reduce((haut, prise) => Math.max(haut, rangDe(prise)), 0);

  // **Chaque prise sait de quelle personne elle vient**, et non seulement sous
  // quel affichage. La clé se recolle ici, depuis le fil : elle n'est jamais
  // montée au modèle, qui n'en a que faire. Elle sert au rapprochement et
  // **ne ressort pas** : ce qui traverse la dérivation sans rien déclencher
  // doit en ressortir tel quel.
  const avecLesCles = lesPrisesEtLeursAuteurs(liste, messages);

  // **Les contestations se relèvent sur la liste entière**, avant toute autre
  // dérivation : ce qui est contesté l'est quelle que soit la nature déclarée,
  // et une demande peut contester autant qu'un constat.
  const contestations = new Map(lesContestations(avecLesCles).map((c) => [c.prise, c]));

  let indecidables = 0;
  const derivees = liste.map((prise, rang) => {
    // **Une prise qui conteste change de nature, elle ne se dédouble pas.**
    // La laisser aussi dans sa rubrique d'origine ferait lire deux fois la même
    // phrase, et le lecteur chercherait en quoi les deux diffèrent.
    const contestation = contestations.get(avecLesCles[rang]);
    if (contestation) return unDesaccord({ ...contestation, prise }, rang);

    if (texte(prise?.nature) !== NATURE.DEMANDE) return prise;

    // **Une offre conditionnelle n'attend pas une réponse, mais un accord.**
    // La juger comme une demande ferait chercher une relance là où il y a un
    // devis — et l'une d'elles, sur un fil réel, exigeait une commande payante.
    const offre = laMarqueDuneOffre(prise);
    if (offre) return uneOffre(prise, offre);

    const suite = laSuiteDuneDemande(prise, liste, { dernierMessage: fin });
    if (suite.suite === SUITE.ON_NE_SAIT_PAS) {
      indecidables += 1;
      return { ...prise, suite: suite.suite, apresElle: suite.apresElle };
    }
    if (suite.suite === SUITE.REPONDUE) {
      return {
        ...prise, suite: suite.suite, apresElle: suite.apresElle,
        repondueParLaCle: suite.parQuoi?.key ?? null,
        /** Par quel signal : un renvoi vérifié, ou un sujet commun. */
        repondueParQuel: suite.parQuel
      };
    }
    return uneQuestionSansReponse(prise, suite);
  });

  return {
    prises: derivees,
    sansReponse: derivees.filter((prise) => texte(prise?.nature) === NATURE.SANS_REPONSE).length,
    desaccords: contestations.size,
    /** Combien de prestations proposées attendent une décision. */
    offres: derivees.filter((prise) => texte(prise?.nature) === NATURE.OFFRE).length,
    /**
     * Combien de demandes n'ont pas pu être jugées, faute de savoir sur quoi
     * elles portent. Elles restent des demandes, et l'écran ne prétend pas
     * qu'elles ont eu une réponse.
     */
    indecidables
  };
}
