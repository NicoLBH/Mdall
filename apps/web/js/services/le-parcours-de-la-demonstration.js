/**
 * Le parcours de démonstration — **la chaîne entière, dans l'ordre, sur les
 * écrans réels.**
 *
 * ## La question posée
 *
 * C'est le tour 6 de `docs/montrer-le-raisonnement.md`, et il vient en dernier
 * parce qu'il ne construit rien : il **raconte ce qui existe**. Les cinq tours
 * précédents ont posé les quatre crans, le Mdall devant le diff, le Mdall au
 * moment de l'analyse et les preuves. Chacun se visite déjà ; aucun ne dit où
 * il se situe dans la chaîne, ni ce qui vient avant, ni ce qui vient après.
 *
 * Or c'est la question difficile : « montre-moi comment un PDF devient une
 * mémoire qui prédit ». Elle ne se gagne pas en argumentant, elle se gagne en
 * montrant — à condition qu'on puisse suivre le chemin sans se perdre.
 *
 * ## Ce n'est pas une démonstration scriptée
 *
 * C'est la décision qui tient tout le reste. Une démonstration scriptée montre
 * ce qu'on a préparé ; elle est donc **inattaquable et sans valeur** — celui
 * qui la regarde sait bien qu'on ne lui a pas montré les cas difficiles.
 *
 * Ce parcours mène aux **écrans réels**, sur le chantier ouvert, et il lit
 * **l'état réel du projet** pour dire où l'on en est. Ce qui n'a pas eu lieu
 * s'affiche comme n'ayant pas eu lieu. Un parcours qui annoncerait sept étapes
 * franchies sur un projet vide serait exactement le tour de magie que les tours
 * 1 à 4 ont passé leur temps à défaire.
 *
 * ## L'ordre porte le sens, comme celui des crans
 *
 * Sans document versé, rien à transcrire ; sans transcription, aucun Mdall à
 * lire ; sans Mdall, aucune preuve à produire ; sans signature, rien dans la
 * mémoire ; sans mémoire, aucune prédiction. Une étape **ne peut pas** se
 * franchir avant la précédente, et le parcours refuse donc de la dire
 * franchissable — c'est la même règle que `LES_CRANS`, et pour la même raison :
 * une étape lue hors de son rang ne veut rien dire.
 *
 * ## Les cinq règles de ces écrans, portées ici aussi
 *
 * Elles sont dans `docs/montrer-le-raisonnement.md` § 6, et elles valent pour
 * ce parcours comme pour *Console › La justesse* :
 *
 *  1. **Jamais un score unique.** Il n'y a pas de « parcours à 71 % » : sept
 *     étapes nommées, chacune avec son état. Un pourcentage mêlerait « le
 *     document n'est pas versé » et « la prédiction n'a rien trouvé », qui
 *     n'appellent ni le même geste ni la même conclusion ;
 *  2. **jamais un compte sans son assiette** — « 4 étapes sur 7 », et non « 4
 *     étapes » ;
 *  3. **ce qui n'a pas eu lieu, aussi lisible que ce qui a eu lieu.** Chaque
 *     étape porte `ceQuElleNeMontrePas`, qui n'est pas une précaution mais la
 *     moitié de son information ;
 *  4. **la date et le procédé à côté du chiffre** — l'étape qui s'appuie sur
 *     une lecture dit par quoi elle a été lue ;
 *  5. **rien n'est écrit tant qu'on n'a pas signé, et le parcours le dit en
 *     toutes lettres** — à l'étape 5, qui est la seule où quelque chose entre.
 *
 * ## Il ne parle à rien
 *
 * Des faits entrent — combien de documents, combien de propositions, combien de
 * sujets —, un état sort. Aucune requête, aucune horloge : le même projet rend
 * le même parcours deux fois de suite. Ce qui lit la base est dans l'écran.
 */

import { estUneRegle } from "./assertion-taxonomy.js";
import { CE_QUE_DIT_LA_FAMILLE } from "./les-familles-de-document.js";
import { CRAN, LES_CRANS, ceQuUnBlocRelie, leCranDit } from "./les-crans-de-la-traduction.js";
import { lePluriel } from "./lexploitation-de-mdall.js";

const texte = (valeur) => String(valeur ?? "").trim();

/* ── Où en est une étape ──────────────────────────────────────────────────── */

/**
 * Les quatre états d'une étape, et pourquoi quatre et pas deux.
 *
 * `FRANCHIE` / `A_FAIRE` suffiraient à dessiner une case à cocher, et c'est
 * précisément ce qu'il ne faut pas : une étape à faire **dont la précédente
 * n'est pas faite** n'est pas à faire, elle est hors d'atteinte. Les présenter
 * pareil ferait cliquer sur un écran qui n'aurait rien à montrer, et le
 * parcours passerait pour cassé.
 *
 * `INCONNUE` est le quatrième, et c'est celui qu'on oublie : la base peut ne
 * pas avoir répondu. « On n'a pas su demander » n'est pas « il n'y en a
 * aucun » (règle 5).
 */
export const OU_EN_EST_LETAPE = {
  FRANCHIE: "franchie",
  FRANCHISSABLE: "franchissable",
  HORS_DATTEINTE: "hors_datteinte",
  INCONNUE: "inconnue"
};

/** Ce que l'écran dit de chaque état, et le ton qu'il prend. */
export const CE_QUE_LETAT_DIT = {
  [OU_EN_EST_LETAPE.FRANCHIE]: {
    mot: "franchie",
    vaut: "ok",
    dit: "cette étape a eu lieu sur ce chantier"
  },
  [OU_EN_EST_LETAPE.FRANCHISSABLE]: {
    mot: "à faire",
    vaut: "pending",
    dit: "tout ce qu'il faut est là : c'est la prochaine"
  },
  [OU_EN_EST_LETAPE.HORS_DATTEINTE]: {
    mot: "pas encore",
    vaut: "neutral",
    dit: "l'étape d'avant n'a pas eu lieu, et celle-ci n'aurait rien à montrer"
  },
  [OU_EN_EST_LETAPE.INCONNUE]: {
    mot: "sans réponse",
    vaut: "unknown",
    dit: "la base n'a pas répondu : on ne sait pas si cette étape a eu lieu"
  }
};

/* ── Les sept étapes ──────────────────────────────────────────────────────── */

/**
 * Ce que chaque étape lit dans le projet pour savoir si elle a eu lieu.
 *
 * Ce sont les noms des faits que l'écran rapporte. Les nommer ici plutôt que
 * dans l'écran permet à l'épreuve de vérifier qu'aucune étape ne s'appuie sur
 * un fait que personne ne fournit (règle 1).
 */
export const LES_FAITS_DU_PARCOURS = {
  DOCUMENTS_VERSES: "documentsVerses",
  DOCUMENTS_ANALYSES: "documentsAnalyses",
  BLOCS_MDALL: "blocsMdall",
  PREUVES_POSEES: "preuvesPosees",
  PROPOSITIONS_SIGNEES: "propositionsSignees",
  AFFIRMATIONS_EN_MEMOIRE: "affirmationsEnMemoire",
  PREDICTIONS_RENDUES: "predictionsRendues"
};

/**
 * Le parcours, dans l'ordre de la chaîne.
 *
 * Chaque étape porte :
 *
 *  - **`ou` et `cible`** — l'écran réel où elle se joue, et ce que la
 *    navigation connaît. Une étape sans cible serait une étape dont on parle
 *    sans pouvoir y aller ;
 *  - **`ceQuOnVoit`** — ce qu'on y lit, en une phrase ;
 *  - **`ceQuElleProuve`** — ce qu'elle établit, et qui n'est pas la même chose :
 *    on voit un tableau d'avis, cela prouve que la lecture a retrouvé les mots
 *    du document ;
 *  - **`ceQuElleNeMontrePas`** — la moitié qu'on oublie. Sans elle, un parcours
 *    de sept étapes vertes se lit « tout est vérifié » ;
 *  - **`leFait`** — ce qu'on lit dans le projet pour savoir si elle a eu lieu ;
 *  - **`cran`** — le cran de la traduction qu'elle met en lumière, quand elle en
 *    met un. `""` pour les étapes qui n'en montrent aucun : verser un document
 *    n'est pas un cran, et la signature non plus.
 */
export const LES_ETAPES_DU_PARCOURS = [
  {
    cle: "verser",
    rang: 1,
    titre: "Verser un document",
    question: "Qu'est-ce qui entre, et sous quelle nature ?",
    ou: "Atelier › Analyse de documents",
    cible: "dev-lecture-cr",
    cran: "",
    leFait: LES_FAITS_DU_PARCOURS.DOCUMENTS_VERSES,
    ceQuOnVoit: "La zone de dépôt, et la nature qu'on déclare : compte rendu de "
      + "chantier, rapport de bureau de contrôle, fil de messagerie.",
    ceQuElleProuve: "Que la nature est déclarée par vous, et non devinée. C'est ce "
      + "qui décide du lecteur, et une lecture de rapport passée au lecteur de "
      + "comptes rendus rendrait un résultat faux sans rien dire.",
    ceQuElleNeMontrePas: "Rien n'est encore lu à cette étape. Un document versé "
      + "est un fichier rangé, pas une connaissance."
  },
  {
    cle: "crans",
    rang: 2,
    titre: "Voir les quatre crans",
    question: "Comment ce document se range-t-il en données, contraintes, "
      + "fonctions et chemins ?",
    ou: "Atelier › Analyse de documents › le document lu",
    cible: "dev-lecture-cr",
    cran: CRAN.DONNEE,
    leFait: LES_FAITS_DU_PARCOURS.DOCUMENTS_ANALYSES,
    ceQuOnVoit: "La lecture, rangée par cran : ce que le document affirme, ce qui "
      + "limite ces valeurs, les règles qui les relient, et les chemins entre ces "
      + "règles. Un cran vide se nomme.",
    ceQuElleProuve: "Que la transcription suit une classification lisible, et la "
      + "même que celle de la Mémoire. Ce ne sont pas quatre mots posés sur un "
      + "résultat : chaque bloc dit de quel cran il relève et d'où il sort.",
    ceQuElleNeMontrePas: "Qu'un cran rempli soit juste. On voit ce que la lecture "
      + "a rangé, pas si elle a bien lu — c'est l'étape 4 qui s'en occupe."
  },
  {
    cle: "mdall",
    rang: 3,
    titre: "Lire le Mdall",
    question: "Qu'est-ce qui serait écrit, mot pour mot ?",
    ou: "Atelier › Analyse de documents › Ce que nous avons compris",
    cible: "dev-lecture-cr",
    cran: CRAN.FONCTION,
    leFait: LES_FAITS_DU_PARCOURS.BLOCS_MDALL,
    ceQuOnVoit: "Le Mdall que la lecture produit — les mêmes blocs que ceux qu'une "
      + "signature verserait, dans le langage du projet.",
    ceQuElleProuve: "Qu'il n'y a pas de couche cachée entre ce qu'on montre et ce "
      + "qui serait écrit. La transcription en Mdall est déterministe : elle ne "
      + "coûte aucun appel au modèle, et deux lectures du même document rendent "
      + "le même Mdall.",
    ceQuElleNeMontrePas: "Ce que le projet en fera. Un bloc Mdall lu ici n'est "
      + "entré nulle part, et le cadre de l'écran le dit en toutes lettres."
  },
  {
    cle: "preuves",
    rang: 4,
    titre: "Lire les preuves",
    question: "Qu'est-ce qui a été vérifié, et sur quelle assiette ?",
    ou: "Atelier › Analyse de documents › Vérifications",
    cible: "dev-lecture-cr",
    cran: CRAN.CHEMIN,
    leFait: LES_FAITS_DU_PARCOURS.PREUVES_POSEES,
    ceQuOnVoit: "Les preuves de la lecture — chaque citation retrouvée dans le "
      + "document, chaque référence qui se recoupe — et les preuves du code : "
      + "chaque règle passée sur ses cas.",
    ceQuElleProuve: "Que les vérifications portent sur **les données de ce "
      + "chantier**, et non sur nos propres tests. C'est le seul genre de preuve "
      + "que celui qui signe puisse juger.",
    ceQuElleNeMontrePas: "Les batteries de mutations, les bancs et le corpus "
      + "annoté. Ce sont des preuves *sur Mdall*, pas *sur votre chantier* : "
      + "elles vivent dans Console › La justesse, et nulle part ici."
  },
  {
    cle: "signer",
    rang: 5,
    titre: "Signer",
    question: "Qu'est-ce que j'accepte d'écrire, ligne par ligne ?",
    ou: "Projet › Propositions",
    cible: "propositions",
    cran: "",
    leFait: LES_FAITS_DU_PARCOURS.PROPOSITIONS_SIGNEES,
    ceQuOnVoit: "La proposition, ses lignes, et ce que chacune ferait. Un refus "
      + "ligne à ligne est possible, et une ligne refusée ne fait rien — ni en "
      + "creux, ni « pour la cohérence ».",
    ceQuElleProuve: "C'est **la seule étape où quelque chose entre dans la "
      + "mémoire**, et elle demande un geste humain. Rien ne se verse "
      + "directement ; aucune lecture, aussi sûre soit-elle, n'écrit d'elle-même.",
    ceQuElleNeMontrePas: "Que ce qui entre soit vrai. La signature engage celui "
      + "qui signe, elle ne valide rien à sa place — et c'est pour cela que les "
      + "étapes 2 à 4 passent avant."
  },
  {
    cle: "memoire",
    rang: 6,
    titre: "Retrouver dans la mémoire",
    question: "Où cette valeur vit-elle maintenant, et d'où vient-elle ?",
    ou: "Projet › Mémoire",
    cible: "memoire",
    cran: CRAN.CONTRAINTE,
    leFait: LES_FAITS_DU_PARCOURS.AFFIRMATIONS_EN_MEMOIRE,
    ceQuOnVoit: "L'affirmation en mémoire, sa valeur, et la chaîne qui remonte "
      + "jusqu'à la page du document d'où elle sort.",
    ceQuElleProuve: "Que rien n'est orphelin. Toute valeur de la mémoire nomme la "
      + "proposition qui l'a fait entrer, qui nomme le document, qui nomme la "
      + "page — et le chemin se parcourt dans les deux sens.",
    ceQuElleNeMontrePas: "Ce qui n'a pas été versé. La mémoire montre ce qui est "
      + "entré ; ce qu'une lecture a laissé dehors se lit à l'étape 4, et nulle "
      + "part ici."
  },
  {
    cle: "prediction",
    rang: 7,
    titre: "Voir la prédiction qui en découle",
    question: "Qu'est-ce que le projet sait maintenant que personne n'a écrit ?",
    ou: "Projet › Indicateurs",
    cible: "insights",
    cran: CRAN.CHEMIN,
    leFait: LES_FAITS_DU_PARCOURS.PREDICTIONS_RENDUES,
    ceQuOnVoit: "Ce que les fonctions de la mémoire concluent en se lisant les "
      + "unes les autres, et le chemin de fonctions qui y mène.",
    ceQuElleProuve: "Que la chaîne sert à quelque chose. Une mémoire qui ne "
      + "prédit rien est un classeur ; c'est le cran 4 — une fonction qui emploie "
      + "ce qu'une autre conclut — qui fait la différence.",
    ceQuElleNeMontrePas: "Qu'une prédiction soit juste. Elle se vérifie contre ce "
      + "qui arrive, et ce tour ne traite pas cette question."
  }
];

/** Une étape par sa clé, ou `null` : on ne dessine pas une étape qui n'existe pas. */
export function letapeDite(cle) {
  return LES_ETAPES_DU_PARCOURS.find((une) => une.cle === texte(cle)) ?? null;
}

/**
 * Le cran que cette étape met en lumière, ou `null`.
 *
 * **Lu dans `les-crans-de-la-traduction.js`**, et non recopié : les libellés et
 * les questions des crans vivent là-bas, et deux listes auraient fini par
 * nommer « Les données » autrement d'un écran à l'autre (règle 10).
 */
export function leCranDeLetape(etape) {
  return etape?.cran ? leCranDit(etape.cran) : null;
}

/* ── Ce que la base porte, et où ──────────────────────────────────────────── */

/**
 * Les tables où une lecture conservée se range, une par famille.
 *
 * **Dérivées du registre des familles**, et non écrites ici : c'est lui qui sait
 * où chaque famille garde ses lectures, et une famille ajoutée là-bas puis
 * oubliée ici ferait un parcours qui compte moins de documents lus qu'il n'y en
 * a — sans que rien ne le dise (règle 10).
 */
export const OU_SE_RANGENT_LES_LECTURES = [...new Set(
  Object.values(CE_QUE_DIT_LA_FAMILLE)
    .map((famille) => texte(famille?.laLectureEstGardeeDans))
    .filter(Boolean)
)];

/**
 * Les affirmations de la mémoire, ramenées à ce qu'un bloc a besoin de dire.
 *
 * On ne garde que le sujet, la nature et la charge : ce sont les seules choses
 * dont `leCranDunBloc` et `ceQuUnBlocRelie` ont besoin. Le reste — les
 * citations, les valeurs, les provenances — ne sert pas au parcours, et ne pas
 * le demander est ce qui garde cette page légère sur un chantier à deux mille
 * affirmations.
 *
 * **La nature se lit dans la charge, et la règle par `referentiel`.** C'est la
 * même lecture que celle de l'écran de la Mémoire (`project-memory.js`) et que
 * celle d'`estUneRegle` : une affirmation ne porte pas sa nature en colonne,
 * elle la porte dans ce que la revue a signé. La relire autrement ici ferait
 * compter comme données des fonctions que la Mémoire montre comme fonctions
 * (règle 4).
 */
export function unBlocDeLaMemoire(ligne) {
  const affirmation = {
    ...ligne,
    nature: texte(ligne?.payload?.nature) || texte(ligne?.nature),
    payload: ligne?.payload ?? null
  };

  return {
    cle: texte(ligne?.id),
    sujet: texte(ligne?.subject_key) || texte(ligne?.id),
    nature: affirmation.nature,
    // `leCranDunBloc` lit `regle` avant la nature : une règle du référentiel est
    // une fonction, quelle que soit la nature que sa charge déclare par ailleurs.
    regle: estUneRegle(affirmation),
    ...ceQuUnBlocRelie(affirmation)
  };
}

/* ── Où en est le parcours, sur ce chantier ───────────────────────────────── */

/**
 * Un fait du projet, ramené à l'une de trois réponses : un nombre, `0`, ou
 * `null` quand on ne sait pas.
 *
 * **`null` et `0` ne se confondent pas, et c'est tout l'intérêt.** Une base qui
 * n'a pas répondu rend `null` ; un projet qui n'a aucun document rend `0`. Les
 * fondre ferait dire « cette étape n'a pas eu lieu » d'une étape dont on ignore
 * tout, ce qui est exactement la faute que la règle 5 nomme.
 */
function leCompte(valeur) {
  if (valeur === null || valeur === undefined) return null;

  /**
   * **La chaîne vide est le piège, et il est silencieux.** `Number("")` vaut
   * `0` — pas `NaN` —, de sorte qu'une colonne rendue vide par la base se
   * lirait « aucun document » au lieu de « on ne sait pas », et le parcours
   * afficherait un chantier vierge sur un chantier plein.
   *
   * Une chaîne qui ne porte que des espaces tombe du même côté, pour la même
   * raison : `Number("  ")` vaut `0` aussi.
   */
  if (typeof valeur === "string" && !valeur.trim()) return null;

  const lu = Number(valeur);
  // `Number("douze")` vaut NaN, `Number({})` aussi : ni l'un ni l'autre n'est
  // un compte, et les laisser passer inventerait un zéro.
  if (!Number.isFinite(lu)) return null;
  return Math.max(0, Math.trunc(lu));
}

/**
 * Où en est chaque étape, et où en est le parcours.
 *
 * @param {object} faits les comptes lus dans le projet, nommés par
 *   `LES_FAITS_DU_PARCOURS`. Une clé absente, ou `null`, vaut « on ne sait
 *   pas » — et non zéro.
 * @returns {{etapes, franchies, combien, dit, prochaine, inconnues}}
 */
export function ouEnEstLeParcours(faits = null) {
  const lus = faits && typeof faits === "object" ? faits : {};

  const etapes = [];
  /**
   * **Une étape ne devient franchissable que si la précédente est franchie.**
   *
   * Et une étape dont la précédente est *inconnue* est inconnue à son tour : on
   * ne peut pas dire qu'elle est hors d'atteinte — ce serait affirmer que la
   * précédente n'a pas eu lieu — ni qu'elle est franchissable. L'ignorance se
   * propage, et c'est correct : elle est réelle.
   */
  let laPrecedenteEstFranchie = true;
  let laPrecedenteEstInconnue = false;

  for (const etape of LES_ETAPES_DU_PARCOURS) {
    const combien = leCompte(lus[etape.leFait]);

    let ou;
    if (combien === null) ou = OU_EN_EST_LETAPE.INCONNUE;
    else if (combien > 0) ou = OU_EN_EST_LETAPE.FRANCHIE;
    else if (laPrecedenteEstInconnue) ou = OU_EN_EST_LETAPE.INCONNUE;
    else if (laPrecedenteEstFranchie) ou = OU_EN_EST_LETAPE.FRANCHISSABLE;
    else ou = OU_EN_EST_LETAPE.HORS_DATTEINTE;

    etapes.push({ ...etape, ou, combien });

    laPrecedenteEstFranchie = ou === OU_EN_EST_LETAPE.FRANCHIE;
    laPrecedenteEstInconnue = ou === OU_EN_EST_LETAPE.INCONNUE;
  }

  const franchies = etapes.filter((une) => une.ou === OU_EN_EST_LETAPE.FRANCHIE).length;
  const inconnues = etapes.filter((une) => une.ou === OU_EN_EST_LETAPE.INCONNUE).length;

  return {
    etapes,
    franchies,
    inconnues,
    combien: LES_ETAPES_DU_PARCOURS.length,
    /**
     * La prochaine étape à franchir, ou `null` quand il n'y en a pas.
     *
     * **Il n'y en a qu'une**, et c'est ce qui fait du parcours un chemin plutôt
     * qu'une liste de courses.
     */
    prochaine: etapes.find((une) => une.ou === OU_EN_EST_LETAPE.FRANCHISSABLE) ?? null,
    dit: phraseDuParcours({ franchies, inconnues, combien: LES_ETAPES_DU_PARCOURS.length })
  };
}

/**
 * Ce que l'écran dit du parcours en une ligne.
 *
 * **Le dénominateur y est toujours**, et les sans-réponse se comptent à part :
 * « 4 étapes sur 7 » dit autre chose que « 4 étapes sur 7 · 2 sans réponse »,
 * et la seconde est la seule des deux qui soit honnête quand la base s'est
 * tue (règles 2 et 3).
 */
export function phraseDuParcours({ franchies = 0, inconnues = 0, combien = 0 } = {}) {
  if (!combien) return "";

  const debut = `${lePluriel(franchies, "étape franchie", "étapes franchies")} sur ${combien}`;
  if (!inconnues) return debut;

  // `lePluriel` accorde les noms, pas les verbes : les deux formes s'écrivent
  // côte à côte, c'est la seule façon de ne pas en oublier une.
  const verbe = inconnues > 1 ? "sont restées sans réponse" : "est restée sans réponse";
  return `${debut} · ${lePluriel(inconnues, "étape", "étapes")} ${verbe}`;
}

/**
 * La phrase du cadre, posée en tête du parcours.
 *
 * Elle est la cinquième règle de ces écrans, et elle s'écrit ici parce que le
 * parcours est le seul endroit où l'on voit les sept étapes d'un coup : plus on
 * montre, plus on risque de laisser croire que c'est fait.
 */
export const RIEN_NEST_ECRIT = "Ce parcours ne verse rien et ne signe rien : il mène "
  + "aux écrans du chantier, dans l'ordre de la chaîne. La seule étape où quelque "
  + "chose entre dans la mémoire est la cinquième, et elle demande une signature.";

/**
 * Ce que le parcours ne raconte pas, dit d'un bloc.
 *
 * **Nommé, parce qu'un parcours dont on ignore les trous se présente comme
 * complet** — c'est le § 7 du plan, porté à l'écran plutôt que laissé dans un
 * fichier que personne n'ouvre.
 */
export const CE_QUE_LE_PARCOURS_NE_RACONTE_PAS = [
  "Il ne rend pas le Mdall modifiable : on voit, on signe ou on refuse.",
  "Il ne montre pas les épreuves du produit — mutations, bancs, corpus annoté. "
    + "Ce sont des preuves sur Mdall, pas sur votre chantier.",
  "Il ne dit pas comment la traduction s'améliore quand elle se trompe. On verra "
    + "qu'elle se trompe, et ce sera déjà beaucoup."
];

/**
 * Les crans que le parcours traverse, dans l'ordre des crans.
 *
 * **Et ceux qu'il ne traverse pas se voient**, parce que la liste vient des
 * crans et non des étapes : un cran qu'aucune étape ne met en lumière est un
 * trou du parcours, et le déduire des étapes le rendrait invisible — il n'y
 * figurerait pas du tout (règle 3).
 *
 * ## Pourquoi les crans entrent en paramètre
 *
 * Parce que les quatre crans sont **tous** traversés aujourd'hui : déduire la
 * liste des étapes donnerait donc exactement le même résultat, et la batterie de
 * mutations l'a montré — on a coupé la garde, et rien n'est tombé. Un garde
 * qu'on ne peut pas casser exprès n'est pas un garde (règle 4).
 *
 * L'épreuve passe donc un cinquième cran que personne ne montre, et voit le trou
 * apparaître. C'est la même injection que partout ailleurs — un lecteur pour la
 * batterie, des perturbations pour les épreuves : ce qui se remplace s'éprouve.
 */
export function lesCransDuParcours(crans = LES_CRANS, etapes = LES_ETAPES_DU_PARCOURS) {
  return (Array.isArray(crans) ? crans : []).map((cran) => ({
    ...cran,
    etapes: (Array.isArray(etapes) ? etapes : [])
      .filter((une) => une?.cran === cran?.cle)
      .map((une) => une.cle)
  }));
}
