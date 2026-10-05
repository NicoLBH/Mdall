/**
 * La justesse des analyses, mise en forme.
 *
 * ## La question à laquelle cet écran répond
 *
 * > « Toute la valeur du moteur prédictif commence par des analyses les plus
 * >   justes possibles. Comment vérifier que ce travail est bien fait ? »
 *
 * Quatre outils y répondent, chacun sur un angle, et **aucun des quatre ne
 * suffit seul** (`docs/ou-lire-les-mesures.md`). Leurs bilans se déposent dans
 * `mesures_de_justesse` ; ce module les met en forme, et rien d'autre.
 *
 * ## Les quatre règles de l'écran, portées ici et non dans le HTML
 *
 * 1. **Jamais un score unique.** « La justesse est de 94 % » ne dit pas sur
 *    quoi l'on se trompe, et c'est tout ce qu'on voudrait savoir. Chaque outil
 *    rend ses propres chiffres, étape par étape.
 * 2. **Jamais un taux sans son assiette.** « 100 % » sur une épreuve et
 *    « 100 % » sur quatre cents sont deux phrases différentes. `unTaux` refuse
 *    de rendre un pourcentage sans le couple qui le produit.
 * 3. **Ce qui n'a pas été mesuré, aussi fort que ce qui l'a été.** Un outil
 *    sans aucun bilan ne disparaît pas de la liste : il s'y affiche « jamais
 *    lancé ». Trois lignes vertes quand il y a quatre outils se lisent « tout
 *    va bien » (règle 12).
 * 4. **La date à côté du chiffre.** Une mesure de mars sur un procédé changé en
 *    juin n'est pas une mesure du système d'aujourd'hui, et `lageDeLaMesure` le
 *    dit en clair plutôt que de laisser compter les jours.
 *
 * ## Il ne parle à rien
 *
 * Des lignes entrent, des nombres et des phrases sortent. La lecture est dans
 * `lexploitation-de-mdall-supabase.js`, l'écran dans `apps/console/js`.
 */

import { laVirgule, lePluriel } from "./lexploitation-de-mdall.js";

const texte = (valeur) => String(valeur ?? "").trim();
const nombre = (valeur) => (Number.isFinite(Number(valeur)) ? Number(valeur) : 0);

/* ── Les quatre outils, déclarés une fois ─────────────────────────────────── */

export const OUTIL = {
  PERTURBATIONS: "perturbations",
  DERIVE: "derive",
  JEU_DE_REFERENCE: "jeu_de_reference",
  INVARIANTS: "invariants"
};

/**
 * Les quatre outils, **et ce que chacun ne sait pas voir**.
 *
 * Le champ `aveugle` n'est pas une précaution de forme : c'est ce qui empêche de
 * lire un bilan vert comme « les analyses sont justes ». La batterie de
 * perturbations ne sait rien dire d'une lecture qui se trompe *de la même façon*
 * à chaque fois, et le jeu de référence ne dit rien de ce qui n'y est pas.
 *
 * L'ordre suit la chaîne : d'abord l'outil qui ne demande rien (les
 * perturbations tournent sur un corpus inventé), puis celui qui demande des
 * lectures conservées, puis celui qui demande une annotation à la main.
 */
export const LES_OUTILS = [
  {
    cle: OUTIL.PERTURBATIONS,
    libelle: "La batterie de perturbations",
    question: "Si je dérange le document, la lecture bouge-t-elle comme il faut ?",
    comment: "Six perturbations du document — jamais du code. Un relevé déplacé "
      + "doit suivre ; une ligne retirée doit disparaître ; un paragraphe "
      + "intercalé ne doit rien changer.",
    attrape: "Une lecture qui devine au lieu de lire : elle rend la même chose "
      + "quoi qu'on lui donne, et seule une perturbation le montre.",
    aveugle: "Une lecture qui se trompe de la même façon à chaque fois. Elle "
      + "suit toutes les perturbations, et elle a tort depuis le début."
  },
  {
    cle: OUTIL.DERIVE,
    libelle: "La dérive des analyses",
    question: "Le même document, relu, donne-t-il la même chose ?",
    comment: "Lue dans les analyses déjà conservées, sans rien relancer. Elle "
      + "distingue la dérive (le procédé a changé) de l'instabilité (le même "
      + "procédé ne se répète pas).",
    attrape: "Un changement de modèle ou de prompt qui déplace les lectures "
      + "sans que personne l'ait voulu.",
    aveugle: "Si l'on n'a relu aucun document deux fois, elle n'a rien à dire — "
      + "et « aucune dérive » veut alors dire « aucune comparaison »."
  },
  {
    cle: OUTIL.JEU_DE_REFERENCE,
    libelle: "Le jeu de référence",
    question: "Sur des documents dont je connais la réponse, combien en trouve-t-on ?",
    comment: "Un corpus annoté à la main, étape par étape. Il porte aussi des "
      + "pièges : ce qui ne doit PAS être relevé, et qu'une lecture trop "
      + "généreuse ramasse.",
    attrape: "Ce qui manque et ce qui est inventé, séparément — un seul taux "
      + "les confondrait.",
    aveugle: "Tout ce qui n'y est pas. Il mesure la justesse sur ses documents, "
      + "et sur eux seuls ; l'élargir est un travail à la main."
  },
  {
    cle: OUTIL.INVARIANTS,
    libelle: "Les invariants",
    question: "Y a-t-il des choses qui doivent être vraies de toute lecture ?",
    comment: "Les propriétés qu'aucune lecture ne peut violer, quel que soit le "
      + "document : une date relevée existe dans le document, un relevé a une "
      + "page, un compte rendu n'a pas de légende d'états.",
    attrape: "Les lectures impossibles, sans avoir besoin de connaître la "
      + "bonne réponse.",
    aveugle: "Une lecture parfaitement possible et parfaitement fausse."
  }
];

/**
 * **Ce que ces quatre outils sont**, et ce qu'ils ne sont pas.
 *
 * ## Ce que ce paragraphe a d'abord essayé de faire, et pourquoi c'était faux
 *
 * L'écran montrait « jamais lancé » sur les quatre outils. On y a donc écrit la
 * commande à taper pour les remplir — un bloc de terminal sous chaque carte.
 *
 * C'était répondre à côté. Une console d'exploitation **ne demande pas qu'on
 * ouvre une invite de commandes** : ce qu'on vient y chercher — est-ce que ça
 * marche ? — doit s'y lire, compté sur nos propres tables. C'est ce que fait
 * maintenant « Ce que les lectures ont donné », en haut de la page.
 *
 * ## Ce qui reste à dire, et qui n'est pas un mode d'emploi
 *
 * Ces quatre-là mesurent autre chose, et la différence est ce qu'il faut
 * comprendre pour lire la page : **les comptages disent ce qui est arrivé, le
 * banc dit si c'est juste**. L'un se lit en ligne, l'autre demande un corpus
 * dont on connaît déjà la réponse.
 */
export const COMMENT_UN_BILAN_ARRIVE = [
  {
    quoi: "Les comptages du haut disent ce qui est arrivé",
    pourquoi: "ils lisent les lectures conservées : combien ont rendu une "
      + "analyse, combien ont relevé quelque chose, par quel procédé. C'est la "
      + "santé du système, et elle se remplit toute seule dès qu'un document est "
      + "lu."
  },
  {
    quoi: "Ces quatre-là disent si c'est juste",
    pourquoi: "et c'est une tout autre question : une lecture qui invente vingt "
      + "points compte, en haut, exactement comme une lecture qui en relève "
      + "vingt vrais. Pour les distinguer il faut un document dont on connaît "
      + "déjà la réponse, ou le même document relu deux fois."
  },
  {
    quoi: "Ils mesurent un procédé, jamais une analyse",
    pourquoi: "« ce document a-t-il été bien lu ? » se répond dans le détail du "
      + "document, à l'Atelier. Ici, c'est « le procédé tient-il ? » — et cela "
      + "se mesure sur un corpus, pas sur une lecture."
  },
  {
    quoi: "Leurs bilans sont des nombres, et rien d'autre",
    pourquoi: "la base refuse un bilan qui nomme un document, et jette toute "
      + "valeur qui n'est pas un nombre. C'est ce qui permet à cette page "
      + "d'exister : une console qui lirait le chantier de quelqu'un n'aurait "
      + "pas le droit d'être ouverte."
  }
];

/** Un outil par sa clé, ou `null` : une ligne d'un outil inconnu ne se dessine pas. */
export function loutilDit(cle) {
  return LES_OUTILS.find((un) => un.cle === texte(cle)) ?? null;
}

/* ── Un taux, et son assiette ─────────────────────────────────────────────── */

/**
 * Un taux, **ou rien**.
 *
 * `null` quand l'assiette est nulle ou absente, et c'est la règle 2 de l'écran
 * rendue impossible à contourner : `0/0` vaut `NaN`, que `toFixed` rend
 * « NaN % », et une case qui porte « NaN % » finit par être lue comme un
 * mauvais chiffre plutôt que comme une absence de mesure.
 *
 * Le rendu porte **toujours** le couple : « 5/6 (83 %) ». Le pourcentage seul
 * cache que l'assiette est de six.
 */
export function unTaux(combien, surCombien) {
  const sur = nombre(surCombien);
  if (sur <= 0) return null;

  const part = nombre(combien);
  return {
    part,
    sur,
    // Arrondi à l'entier : une batterie de six épreuves n'a pas la précision
    // d'une décimale, et « 83,3 % » la laisserait croire.
    pourcent: Math.round((part / sur) * 100),
    dit: `${laVirgule(part)}/${laVirgule(sur)} (${Math.round((part / sur) * 100)} %)`
  };
}

/* ── L'âge d'une mesure ───────────────────────────────────────────────────── */

/** Au-delà, une mesure ne dit plus l'état du système : elle dit son passé. */
export const UNE_MESURE_VIEILLIT_EN_JOURS = 30;

/**
 * Depuis combien de temps, dit en clair.
 *
 * **`maintenant` est passé, et non lu de l'horloge.** Une fonction qui lirait
 * `Date.now()` ne s'éprouverait qu'à l'instant où elle tourne : l'épreuve
 * passerait aujourd'hui et tomberait le mois prochain, ou l'inverse — et c'est
 * le genre d'épreuve qu'on finit par désactiver.
 */
export function lageDeLaMesure(quand, maintenant = null) {
  const date = new Date(texte(quand));
  if (!texte(quand) || Number.isNaN(date.getTime())) {
    return { jours: null, dit: "jamais lancé", vieille: false, jamais: true };
  }

  const repere = maintenant instanceof Date ? maintenant : new Date(maintenant ?? Date.now());
  if (Number.isNaN(repere.getTime())) {
    return { jours: null, dit: "date illisible", vieille: false, jamais: false };
  }

  const jours = Math.floor((repere.getTime() - date.getTime()) / 86400000);
  const vieille = jours >= UNE_MESURE_VIEILLIT_EN_JOURS;

  // **« Dans le futur » se dit**, et ne se replie pas sur « aujourd'hui ». Une
  // horloge de machine en avance, ou une date mal écrite, est une information
  // sur la mesure — la masquer ferait chercher longtemps.
  if (jours < 0) return { jours, dit: "daté dans le futur", vieille: false, jamais: false };
  if (jours === 0) return { jours, dit: "aujourd'hui", vieille: false, jamais: false };
  if (jours === 1) return { jours, dit: "hier", vieille: false, jamais: false };

  return { jours, dit: `il y a ${lePluriel(jours, "jour")}`, vieille, jamais: false };
}

/* ── Les lignes, rangées par outil ────────────────────────────────────────── */

/**
 * L'état des quatre outils : **les quatre, toujours**.
 *
 * Un outil dont aucune ligne ne porte le nom reste dans la liste, avec
 * `jamais: true`. C'est la règle 3 : une liste à trois entrées quand il y a
 * quatre outils se lit « le quatrième va bien ».
 *
 * `dernier` est le bilan le plus récent du procédé le plus récent ; `procedes`
 * porte un dernier bilan par procédé, parce que deux procédés donnent deux
 * états et non une moyenne. `histoire` est tout le reste, du plus récent.
 */
export function letatDesOutils(lignes = null, maintenant = null) {
  const toutes = Array.isArray(lignes) ? lignes : [];

  return LES_OUTILS.map((outil) => {
    const siennes = toutes
      .filter((une) => texte(une?.quoi) === outil.cle)
      .slice()
      // Du plus récent. On ne suppose pas l'ordre de la base : un `order by`
      // changé ailleurs renverserait l'histoire sans que rien ne le dise.
      .sort((a, b) => new Date(texte(b?.quand)).getTime() - new Date(texte(a?.quand)).getTime());

    const dernier = siennes[0] ?? null;
    // Un dernier bilan par procédé : le rang 1 posé par la base.
    const procedes = siennes.filter((une) => nombre(une?.rang) === 1);

    return {
      ...outil,
      jamais: !dernier,
      dernier,
      age: lageDeLaMesure(dernier?.quand, maintenant),
      procedes,
      histoire: siennes,
      // **Plusieurs procédés au rang 1 est une information, pas un détail.**
      // Deux états coexistent, et le plus récent n'est pas « l'état du système »
      // tant qu'on n'a pas dit lequel est en service.
      plusieursProcedes: procedes.length > 1
    };
  });
}

/* ── Ce qu'un bilan dit, outil par outil ──────────────────────────────────── */

/**
 * Les chiffres d'un bilan, **nommés et avec leur assiette**.
 *
 * Chaque entrée est `{quoi, dit, sous}` : ce qu'on mesure, le chiffre avec son
 * couple, et la phrase qui dit ce qu'il veut dire. Aucun outil ne rend un
 * nombre seul.
 *
 * Une clé absente **ne se remplace pas par zéro**. `Number(null)` vaut 0, et
 * « 0 perturbation tombée » se lirait comme un succès alors que c'est une
 * absence de mesure — la distinction la plus coûteuse de tout cet écran
 * (règle 5).
 */
export function ceQueLeBilanDit(ligne = null) {
  const quoi = texte(ligne?.quoi);
  const bilan = (ligne?.bilan && typeof ligne.bilan === "object") ? ligne.bilan : {};
  const combien = nombre(ligne?.combien);
  const un = (cle) => (Object.hasOwn(bilan, cle) ? nombre(bilan[cle]) : null);

  if (quoi === OUTIL.PERTURBATIONS) return lesChiffresDesPerturbations(un, combien);
  if (quoi === OUTIL.DERIVE) return lesChiffresDeLaDerive(un, combien);
  if (quoi === OUTIL.JEU_DE_REFERENCE) return lesChiffresDuJeu(un, bilan, combien);
  if (quoi === OUTIL.INVARIANTS) return lesChiffresDesInvariants(un, combien);
  return [];
}

function lesChiffresDesPerturbations(un, combien) {
  const epreuves = un("epreuves") ?? combien;
  const tombees = un("tombees");
  const sansEffet = un("sansEffet");
  const chiffres = [];

  if (tombees !== null) {
    const taux = unTaux(epreuves - tombees, epreuves);
    chiffres.push({
      quoi: "Épreuves passées",
      dit: taux ? taux.dit : "aucune épreuve",
      sous: taux
        ? "une épreuve qui tombe veut dire que la lecture n'a pas suivi la "
          + "perturbation comme elle le devait"
        : "la batterie n'a lancé aucune épreuve : ce n'est pas « tout passe »"
    });
  }

  if (sansEffet !== null) {
    chiffres.push({
      quoi: "Perturbations sans effet",
      dit: laVirgule(sansEffet),
      // **Le chiffre le plus important de la batterie, et le moins intuitif.**
      sous: sansEffet > 0
        ? "une perturbation qui ne change rien au document ne mesure rien : "
          + "l'épreuve qu'elle porte rend vert sans avoir rien essayé"
        : "chaque perturbation a bien dérangé le document"
    });
  }

  return chiffres;
}

function lesChiffresDeLaDerive(un, combien) {
  const lectures = un("lectures") ?? combien;
  const derives = un("derives");
  const instabilites = un("instabilites");
  const inconnus = un("procedesInconnus");
  const sansProcede = un("sansProcede");
  const chiffres = [];

  if (derives !== null) {
    chiffres.push({
      quoi: "Dérives",
      dit: unTaux(derives, lectures)?.dit ?? "aucune comparaison",
      sous: "le procédé a changé entre deux lectures du même document. C'est "
        + "attendu après un changement de modèle, et à lire autrement sinon"
    });
  }

  if (instabilites !== null) {
    chiffres.push({
      quoi: "Instabilités",
      dit: unTaux(instabilites, lectures)?.dit ?? "aucune comparaison",
      // Celui-ci est le mauvais.
      sous: "le même procédé a donné deux lectures différentes du même "
        + "document. Rien ne l'explique, et c'est le chiffre qui doit rester bas"
    });
  }

  if (inconnus !== null && inconnus > 0) {
    chiffres.push({
      quoi: "Procédés inconnus",
      dit: laVirgule(inconnus),
      sous: "des lectures dont on ne sait pas par quel procédé elles ont été "
        + "faites. Elles ne sont comptées ni comme dérive ni comme instabilité"
    });
  }

  if (sansProcede !== null && sansProcede > 0) {
    chiffres.push({
      quoi: "Lectures sans procédé noté",
      dit: laVirgule(sansProcede),
      sous: "ces lectures ne se comparent pas : les juger d'un côté ou de "
        + "l'autre serait inventer la moitié du fait"
    });
  }

  return chiffres;
}

/**
 * Le jeu de référence : **jamais un score, toujours des étapes**.
 *
 * `etapes` porte un taux par étape de la lecture. Les fondre en un seul chiffre
 * ferait disparaître exactement ce qu'on cherche : une lecture qui reconnaît
 * parfaitement la forme et manque un relevé sur sept n'est pas « à 93 % » — elle
 * est juste sur la forme et fausse sur les relevés, et ce sont deux travaux.
 */
function lesChiffresDuJeu(un, bilan, combien) {
  const attendus = un("attendus");
  const trouves = un("trouves");
  const inventes = un("inventes");
  const pieges = un("pieges");
  const piegesEvites = un("piegesEvites");
  const chiffres = [];

  if (trouves !== null && attendus !== null) {
    chiffres.push({
      quoi: "Relevés retrouvés",
      dit: unTaux(trouves, attendus)?.dit ?? "aucun attendu",
      sous: `sur ${lePluriel(combien, "document annoté", "documents annotés")} — `
        + "ce taux ne vaut que pour eux, et pour aucun autre"
    });
  }

  if (inventes !== null) {
    chiffres.push({
      quoi: "Relevés inventés",
      dit: laVirgule(inventes),
      // **Séparé de ce qui manque, et c'est tout le point.** Un seul taux les
      // confondrait, et les deux appellent des corrections opposées.
      sous: "relevés que la lecture a produits et que le document ne porte "
        + "pas. Compté à part de ce qui manque : l'un se corrige en lisant "
        + "mieux, l'autre en lisant moins"
    });
  }

  if (piegesEvites !== null && pieges !== null) {
    chiffres.push({
      quoi: "Pièges évités",
      dit: unTaux(piegesEvites, pieges)?.dit ?? "aucun piège posé",
      sous: "ce qui ne doit PAS être relevé, et qu'une lecture trop généreuse "
        + "ramasse. C'est la moitié oubliée d'un jeu de référence"
    });
  }

  const etapes = (bilan?.etapes && typeof bilan.etapes === "object") ? bilan.etapes : {};
  for (const [etape, valeur] of Object.entries(etapes)) {
    if (!Number.isFinite(Number(valeur))) continue;
    chiffres.push({
      quoi: `Étape « ${etape} »`,
      // Les étapes arrivent en part de 1 : c'est la forme que le jeu de
      // référence rend, et la convertir ici évite de la convertir deux fois.
      dit: `${Math.round(nombre(valeur) * 100)} %`,
      sous: "une étape juste et une étape fausse ne se moyennent pas : elles "
        + "désignent deux travaux différents"
    });
  }

  return chiffres;
}

function lesChiffresDesInvariants(un, combien) {
  const invariants = un("invariants") ?? combien;
  const tombes = un("invariantsTombes");
  if (tombes === null) return [];

  return [{
    quoi: "Invariants tenus",
    dit: unTaux(invariants - tombes, invariants)?.dit ?? "aucun invariant posé",
    sous: tombes > 0
      ? "un invariant tombé est une lecture impossible — une date qui n'est pas "
        + "dans le document, un relevé sans page. Cela se corrige avant tout le reste"
      : "aucune lecture impossible. Cela ne dit pas qu'elles sont justes"
  }];
}

/* ── La phrase du haut ────────────────────────────────────────────────────── */

/**
 * Ce que l'écran dit en une phrase, **sans jamais fondre les quatre outils**.
 *
 * Elle compte les outils lancés et les outils muets, et c'est tout. « La
 * justesse est bonne » serait le score unique que la règle 1 interdit : il
 * faudrait pondérer quatre mesures qui ne mesurent pas la même chose, et la
 * pondération serait inventée.
 */
export function ceQueLaJustesseDit(lignes = null, maintenant = null) {
  const etat = letatDesOutils(lignes, maintenant);
  const lances = etat.filter((un) => !un.jamais);
  const vieilles = lances.filter((un) => un.age.vieille);

  if (!lances.length) {
    return "Aucun des quatre outils n'a encore déposé de bilan. Ce n'est pas "
      + "« les analyses sont justes » : c'est qu'on ne l'a pas mesuré.";
  }

  const debut = `${lePluriel(lances.length, "outil")} sur ${laVirgule(etat.length)} `
    + `${lances.length > 1 ? "ont" : "a"} déposé un bilan`;

  const muets = etat.length - lances.length;
  const suite = muets
    ? `. ${lePluriel(muets, "outil n'a jamais tourné", "outils n'ont jamais tourné")} : `
      + "ce qu'ils mesurent n'est pas mesuré"
    : ".";

  const age = vieilles.length
    ? ` ${lePluriel(vieilles.length, "bilan a", "bilans ont")} plus de `
      + `${lePluriel(UNE_MESURE_VIEILLIT_EN_JOURS, "jour")} : ils disent le passé du système.`
    : "";

  return `${debut}${suite}${age}`;
}

/**
 * Ce que cet écran ne dit pas, **nommé et non laissé en blanc**.
 *
 * Le premier est le plus important, et il est désagréable : aucun de ces
 * chiffres ne dit si une analyse donnée est juste. Ils disent si le procédé
 * tient. C'est utile et ce n'est pas la même chose.
 */
export const CE_QUE_LA_JUSTESSE_NE_DIT_PAS = [
  {
    quoi: "Si une analyse donnée est juste",
    pourquoi: "ces quatre outils mesurent le procédé, pas une lecture. Pour "
      + "savoir si celle-ci est juste, il faut la regarder — et c'est pour cela "
      + "que chaque proposition montre ce qu'elle va écrire avant qu'on signe."
  },
  {
    quoi: "Quel document s'est mal lu",
    pourquoi: "la console ne lit aucun contenu de chantier, et la table qu'elle "
      + "lit ne peut pas en porter : la base refuse un bilan qui nomme un "
      + "document. Le détail se retrouve en relançant l'outil, là où le chantier "
      + "appartient à quelqu'un."
  },
  {
    quoi: "Une tendance, pour l'instant",
    pourquoi: "une courbe demande des points réguliers, pris par le même "
      + "procédé. Tant que les bilans arrivent quand on y pense, deux points "
      + "voisins peuvent différer parce que le procédé a changé — et la courbe "
      + "le montrerait comme une amélioration."
  },
  {
    quoi: "La conservation",
    pourquoi: "vingt-six mois, pour comparer une année à la précédente. La "
      + "fonction qui efface au-delà existe ; rien ne l'appelle encore, donc les "
      + "mesures plus anciennes sont toujours là."
  }
];
