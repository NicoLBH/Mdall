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
 * **La même chose**, c'est `porteSur` — le seul rapprochement dont on dispose,
 * et il vient du modèle. Une demande qui n'en porte pas ne se dérive donc pas :
 * elle sort en « on ne sait pas », qui n'est ni « répondue » ni « restée sans
 * réponse ». Ne pas savoir n'autorise pas à prétendre qu'il n'y a rien
 * (règle 5).
 *
 * ## Un désaccord
 *
 * Deux constats sur la même chose, de deux auteurs différents, dont **l'un nie
 * ce que l'autre affirme**. La polarité se lit sur les marques de négation du
 * français — et c'est tout ce qu'on sait faire sans deviner.
 *
 * Ce qui échappe à cette règle est écrit ici franchement : **un désaccord sans
 * négation ne se voit pas**. « Le support est sec » contre « le support est
 * humide » affirment tous les deux, et rien dans les mots ne dit qu'ils se
 * contredisent. Il faudrait des contraires par le sens, ce qui n'est plus de la
 * dérivation.
 *
 * Et ce qu'on rend n'est pas un verdict : **deux constats qui semblent se
 * contredire**, avec les deux citations. C'est au lecteur de trancher —
 * l'affirmer serait prêter à deux personnes un désaccord qu'elles n'ont
 * peut-être pas.
 *
 * ## Il est pur
 *
 * Des prises entrent, des prises sortent. Aucun réseau, aucun modèle, aucune
 * horloge — et chaque ligne rendue dit de quelles prises elle sort.
 */

import { NATURE } from "./prises-de-position.js";

/** Ce qu'on a pu établir d'une demande. */
export const SUITE = {
  /** Un message postérieur la reprend. */
  REPONDUE: "repondue",
  /** Aucun ne la reprend : c'est l'apport principal du fil. */
  SANS_REPONSE: "sans-reponse",
  /** On ne peut pas le dire — et c'est une troisième réponse, pas la deuxième. */
  ON_NE_SAIT_PAS: "on-ne-sait-pas"
};

/** Ce qu'une phrase fait de ce qu'elle énonce. */
export const POLARITE = { AFFIRME: "affirme", NIE: "nie" };

/** Ce qui compte comme une réponse à une demande. */
const REPONDENT = new Set([NATURE.CONSTAT, NATURE.DECISION, NATURE.ENGAGEMENT]);

/**
 * La négation en deux morceaux — « ne … pas », « n'a jamais ».
 *
 * Exigée en deux morceaux parce que « pas » tout seul n'est pas une négation :
 * « le pas de vis », « un pas de plus ». La première moitié lève le doute.
 */
const NEGATION_EN_DEUX = /(^|[^a-zà-ÿ])(n['’]|ne\s)[^.!?]*?\s(pas|plus|jamais|rien|aucune?|personne)(\W|$)/i;

/**
 * Les mots qui nient à eux seuls.
 *
 * `sans` est le plus discutable — « sans tarder » ne nie rien de ce qui est
 * constaté. Il est gardé parce que dans un constat de chantier il nie presque
 * toujours quelque chose (« sans reprise », « sans étanchéité »), et parce que
 * le prix d'une opposition montrée à tort est un coup d'œil, là où celui d'une
 * opposition manquée est un désaccord qui passe inaperçu.
 */
const NIE_SEUL = /(^|[^a-zà-ÿ])(aucune?|rien|n[ée]ant|absence|sans|non)(\W|$)/i;

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Deux libellés désignent-ils la même chose ?
 *
 * Accents, casse et espaces effacés. Rien de plus : `porteSur` vient du modèle,
 * à qui l'on a demandé les **mêmes mots** d'une prise à l'autre quand c'est la
 * même chose. Chercher plus loin — des synonymes, une racine commune —
 * rapprocherait des sujets voisins et rendrait des désaccords qui n'en sont pas.
 */
export function memeSujet(un, autre) {
  const plat = (valeur) => String(valeur ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/\s+/g, " ").trim();

  const gauche = plat(un);
  return gauche !== "" && gauche === plat(autre);
}

/** Ce qu'une phrase fait : elle affirme, ou elle nie. */
export function polariteDe(phrase) {
  const lu = texte(phrase);
  if (!lu) return POLARITE.AFFIRME;
  return NEGATION_EN_DEUX.test(lu) || NIE_SEUL.test(lu) ? POLARITE.NIE : POLARITE.AFFIRME;
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
export function laSuiteDuneDemande(demande, prises = [], { dernierMessage = 0 } = {}) {
  const apresElle = Math.max(0, Number(dernierMessage) - rangDe(demande));
  const sujet = texte(demande?.porteSur);
  if (!sujet) return { suite: SUITE.ON_NE_SAIT_PAS, parQuoi: null, apresElle };

  // Une demande ne peut pas se répondre à elle-même, et rien ne l'écarte
  // explicitement : `REPONDENT` ne contient pas les demandes, et un message
  // n'est pas postérieur à lui-même. Une garde de plus a été essayée puis
  // retirée — aucune rupture ne la faisait parler (règle 12).
  const reprise = (Array.isArray(prises) ? prises : []).find((autre) =>
    REPONDENT.has(texte(autre?.nature))
    && rangDe(autre) > rangDe(demande)
    && memeSujet(autre?.porteSur, sujet));

  return reprise
    ? { suite: SUITE.REPONDUE, parQuoi: reprise, apresElle }
    : { suite: SUITE.SANS_REPONSE, parQuoi: null, apresElle };
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
export function lesOppositions(prises = []) {
  // Le sujet n'est pas filtré ici : `memeSujet` refuse déjà deux sujets vides
  // de se ressembler, et un constat sans sujet ne peut donc s'apparier avec
  // rien. Le filtre avait été écrit, puis retiré : aucune rupture ne le
  // faisait parler (règle 12).
  const constats = (Array.isArray(prises) ? prises : [])
    .filter((prise) => texte(prise?.nature) === NATURE.CONSTAT);

  const trouvees = [];
  for (let gauche = 0; gauche < constats.length; gauche += 1) {
    for (let droite = gauche + 1; droite < constats.length; droite += 1) {
      const un = constats[gauche];
      const autre = constats[droite];
      if (!memeSujet(un.porteSur, autre.porteSur)) continue;
      if (texte(un.qui) === texte(autre.qui)) continue;
      if (polariteDe(un.intitule) === polariteDe(autre.intitule)) continue;
      trouvees.push({ porteSur: texte(un.porteSur), positions: [un, autre] });
    }
  }
  return trouvees;
}

function uneQuestionSansReponse(demande, suite) {
  return {
    ...demande,
    key: `${demande.key}:sans-reponse`,
    nature: NATURE.SANS_REPONSE,
    /** Ce que le modèle avait déclaré. Rien n'est masqué : la nature a changé, pas le fait. */
    natureDeclaree: NATURE.DEMANDE,
    suite: suite.suite,
    apresElle: suite.apresElle
  };
}

function unDesaccord(opposition, rang) {
  const [un, autre] = opposition.positions;
  return {
    key: `desaccord:${opposition.porteSur}:${rang + 1}`,
    nature: NATURE.DESACCORD,
    intitule: opposition.porteSur,
    porteSur: opposition.porteSur,
    pourQui: null,
    echeance: null,
    /** Les deux positions, avec leurs auteurs et leurs citations. */
    positions: [un, autre],
    /** Le désaccord se date du plus tardif des deux : c'est là qu'il apparaît. */
    message: Math.max(rangDe(un), rangDe(autre)),
    qui: null,
    quand: null,
    citation: "",
    messageVerifie: true
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
export function ceQuonDerive(prises = [], { dernierMessage = 0 } = {}) {
  const liste = Array.isArray(prises) ? prises : [];
  const fin = Number(dernierMessage) || liste.reduce((haut, prise) => Math.max(haut, rangDe(prise)), 0);

  let indecidables = 0;
  const avecLesQuestions = liste.map((prise) => {
    if (texte(prise?.nature) !== NATURE.DEMANDE) return prise;
    const suite = laSuiteDuneDemande(prise, liste, { dernierMessage: fin });
    if (suite.suite === SUITE.ON_NE_SAIT_PAS) {
      indecidables += 1;
      return { ...prise, suite: suite.suite, apresElle: suite.apresElle };
    }
    if (suite.suite === SUITE.REPONDUE) {
      return { ...prise, suite: suite.suite, apresElle: suite.apresElle, repondueParLaCle: suite.parQuoi?.key ?? null };
    }
    return uneQuestionSansReponse(prise, suite);
  });

  const oppositions = lesOppositions(liste);

  return {
    prises: [...avecLesQuestions, ...oppositions.map(unDesaccord)],
    sansReponse: avecLesQuestions.filter((prise) => texte(prise?.nature) === NATURE.SANS_REPONSE).length,
    desaccords: oppositions.length,
    /**
     * Combien de demandes n'ont pas pu être jugées, faute de savoir sur quoi
     * elles portent. Elles restent des demandes, et l'écran ne prétend pas
     * qu'elles ont eu une réponse.
     */
    indecidables
  };
}
