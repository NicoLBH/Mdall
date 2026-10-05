/**
 * Les quatre crans entre un PDF et du Mdall.
 *
 * ## La question posée
 *
 * > « Je vois comment il a transcrit le contenu pour isoler les données, les
 * >   contraintes, les fonctions implicites, puis les chemins entre les
 * >   fonctions pour mettre en lumière les raisonnements. »
 *
 * On voyait le PDF, puis on voyait du Mdall. Les quatre crans entre les deux
 * n'étaient nommés nulle part à l'écran — et ce sont précisément eux qu'il faut
 * comprendre pour que la transcription cesse d'avoir l'air d'un tour de magie.
 * Un tour de magie n'est pas rassurant : il est inquiétant
 * (`docs/montrer-le-raisonnement.md`, D2).
 *
 * ## Il n'invente rien, et c'est tout son intérêt
 *
 * Les quatre crans **ne sont pas une classification neuve**. Ils sont une
 * lecture de celle que la mémoire porte déjà :
 *
 *   cran 1, la donnée      ← `constat`, `donnee-de-base`, `hypothese`, `decision`
 *   cran 2, la contrainte  ← `contrainte`
 *   cran 3, la fonction    ← `estUneRegle()`, `raisonnement`
 *   cran 4, le chemin      ← `lecturesDeLaRegle()` × `sortiesDeLaFonction()`
 *
 * Une seconde taxonomie aurait fini par classer la même ligne autrement que la
 * Mémoire, et l'écran de la proposition aurait dit d'un avis ce que l'écran des
 * fichiers en nie (règle 4). Ce module **traduit** ; il ne tranche pas.
 *
 * La frontière cran 1 / cran 2 est celle que le métier trace déjà, et elle est
 * nette : *si je ne suis pas d'accord, ai-je un recours ?* Non → une contrainte
 * s'impose du dehors. Oui → le projet la pose lui-même.
 *
 * ## Le cran 4 ne vit pas dans un bloc
 *
 * Les trois premiers se lisent sur une ligne. Le quatrième demande **deux**
 * blocs : une fonction qui lit un nom qu'une autre produit. C'est pour cela
 * qu'il se rend à part, et en **liste** — « cette règle emploie la valeur que
 * celle-là conclut » — plutôt qu'en graphe : une liste se lit sans avoir appris
 * à lire un graphe, et c'est le lecteur qu'on vise.
 *
 * ## Il ne parle à rien
 *
 * Des blocs entrent, des groupes et des phrases sortent. Le rendu est dans
 * `views/ui/mdall-a-proposer.js`.
 */

import { NATURE, estUneRegle, normalizeNature } from "./assertion-taxonomy.js";
import { lecturesDeLaRegle, sortiesDeLaFonction } from "./memoire-applications.js";

const texte = (valeur) => String(valeur ?? "").trim();

/* ── Les quatre crans ─────────────────────────────────────────────────────── */

export const CRAN = {
  DONNEE: "donnee",
  CONTRAINTE: "contrainte",
  FONCTION: "fonction",
  CHEMIN: "chemin"
};

/**
 * Les quatre crans, dans l'ordre de la chaîne.
 *
 * L'ordre n'est pas décoratif : **sans donnée, rien à contraindre ; sans
 * contrainte, aucune fonction à écrire ; sans fonctions, aucun chemin entre
 * elles.** Un cran lu avant le précédent ne veut rien dire, exactement comme
 * les rubriques du carburant.
 *
 * `vide` est obligatoire, et c'est la règle la plus importante de ce module :
 * un cran sans aucun bloc **se nomme**. Un écran qui montre trois crans sur
 * quatre se lit « le quatrième va de soi », alors qu'il dit « ce document n'en
 * porte pas » — ce qui est une information sur le document (règle 12).
 */
export const LES_CRANS = [
  {
    cle: CRAN.DONNEE,
    rang: 1,
    libelle: "Les données",
    question: "Qu'est-ce que ce document affirme ?",
    produit: "un sujet et sa valeur, avec la citation d'où elle sort",
    // Le projet les pose ou les constate de lui-même, et peut les corriger
    // sans que personne n'ait rien imposé.
    dou: "Ce que le chantier a observé, ce que le projet est, ce qu'on suppose "
      + "faute de mesure, et ce qu'un humain a tranché.",
    vide: "Ce document n'affirme aucune valeur. Il peut être entièrement fait de "
      + "contraintes, ou n'avoir rien de relevable."
  },
  {
    cle: CRAN.CONTRAINTE,
    rang: 2,
    libelle: "Les contraintes",
    question: "Qu'est-ce qui limite ces valeurs, et que le projet ne choisit pas ?",
    produit: "un seuil, une exigence, l'article qui la fixe",
    dou: "Ce qui s'impose du dehors, tranché par un tiers : un texte, un arrêté, "
      + "une clause de marché. Le test tient en une question — si je ne suis pas "
      + "d'accord, ai-je un recours ? Non : c'est une contrainte.",
    vide: "Ce document n'apporte aucune contrainte. Ce n'est pas « le projet est "
      + "libre » : c'est que rien ici n'en fixe."
  },
  {
    cle: CRAN.FONCTION,
    rang: 3,
    libelle: "Les fonctions",
    question: "Quelle règle, souvent implicite, relie une contrainte à une donnée ?",
    produit: "fonction … si … alors — ce qui s'exécute et se rejoue",
    dou: "Le cran que personne n'écrit jamais, parce qu'il va de soi pour celui "
      + "qui le sait. C'est exactement ce que la mémoire doit garder : « 26 m et "
      + "plus de deux logements » n'est une 3e famille B que par une règle, et "
      + "cette règle doit pouvoir se relire.",
    vide: "Aucune règle n'a été relevée ici. Le document porte alors des valeurs "
      + "et des seuils, mais rien qui dise ce qui se déduit de leur rencontre — "
      + "et c'est là que la prédiction s'arrête."
  },
  {
    cle: CRAN.CHEMIN,
    rang: 4,
    libelle: "Les chemins entre fonctions",
    question: "Quelle fonction emploie ce qu'une autre a conclu ?",
    produit: "le raisonnement — une conséquence que personne n'a écrite",
    dou: "Il ne se lit pas dans un bloc : il demande deux fonctions, l'une lisant "
      + "le nom que l'autre produit. C'est pour cela qu'il se rend à part.",
    vide: "Aucune fonction n'emploie ce qu'une autre conclut. Chacune se tient "
      + "seule, et aucun raisonnement ne traverse ce document."
  }
];

/** Un cran par sa clé, ou `null` : on ne dessine pas un cran qui n'existe pas. */
export function leCranDit(cle) {
  return LES_CRANS.find((un) => un.cle === texte(cle)) ?? null;
}

/* ── Le cran d'un bloc ────────────────────────────────────────────────────── */

/**
 * Le cran d'un bloc Mdall, ou `""` quand on ne sait pas.
 *
 * **`""` et non un cran par défaut.** Ranger l'inconnu dans « les données »
 * donnerait un écran complet et faux : on lirait « ce document affirme ceci »
 * d'une ligne dont personne ne sait ce qu'elle est. L'inconnu se montre comme
 * inconnu (règle 5).
 *
 * L'ordre des tests n'est pas indifférent. **La règle passe avant la nature**,
 * parce qu'une fonction versée n'a pas de nature et porte le `kind` d'une
 * donnée de base : classée par sa nature, elle se rangerait au cran 1 — ce qui
 * est le défaut exact que `estUneRegle` a été écrite pour réparer ailleurs.
 *
 * @param {object} bloc un bloc de `blocsDeLaProposition`
 */
export function leCranDunBloc(bloc = null) {
  if (!bloc || typeof bloc !== "object") return "";

  // Un bloc sans code n'a pas de cran : un retrait retire, un refus ne verse
  // pas. Leur donner un cran les ferait compter dans un groupe qui annonce ce
  // que la mémoire écrira.
  if (texte(bloc.sansBloc)) return "";

  // D'abord la règle, telle que la mémoire la reconnaît.
  if (bloc.regle === true) return CRAN.FONCTION;

  const nature = normalizeNature(bloc.nature);
  if (nature === NATURE.RAISONNEMENT) return CRAN.FONCTION;
  if (nature === NATURE.CONTRAINTE) return CRAN.CONTRAINTE;
  if ([NATURE.CONSTAT, NATURE.DONNEE_BASE, NATURE.HYPOTHESE, NATURE.DECISION]
    .includes(nature)) return CRAN.DONNEE;

  // **L'intendance n'a pas de cran, et n'en veut pas.** Un document qui entre au
  // corpus, un lot ouvert : ce sont des mouvements du suivi, pas des valeurs du
  // projet. L'écrivain ne leur fait déjà aucun bloc.
  if (nature === NATURE.INTENDANCE) return "";

  // Rien ne dit la nature. Reste le code lui-même : une ligne `regle` dans le
  // rendu est une fonction, quoi qu'on ignore par ailleurs. C'est le même
  // critère que `blocsAOuvrir`, et il est volontairement le dernier — il lit le
  // rendu, là où les autres lisent la charge.
  const lignes = Array.isArray(bloc.lignes) ? bloc.lignes : [];
  if (lignes.some((une) => texte(une?.nature) === "regle")) return CRAN.FONCTION;

  return "";
}

/**
 * Ce qu'un bloc **lit** et ce qu'il **produit**, pour que les chemins se tracent.
 *
 * Les deux viennent de `memoire-applications.js`, qui les calcule déjà pour le
 * graphe des dépendances de la mémoire. Un second calcul ici aurait dessiné,
 * sur l'écran de la proposition, une chaîne que la Mémoire ne montre pas
 * (règle 4) — et c'est la plus mauvaise des divergences, parce qu'elle porte
 * sur ce qui entraîne quoi.
 *
 * @param {object} affirmation l'affirmation portée par la ligne
 */
export function ceQuUnBlocRelie(affirmation = null) {
  if (!affirmation || typeof affirmation !== "object") return { lit: [], produit: [] };
  return {
    lit: lecturesDeLaRegle(affirmation).map(texte).filter(Boolean),
    produit: sortiesDeLaFonction(affirmation).map(texte).filter(Boolean)
  };
}

/* ── Les blocs, groupés par cran ──────────────────────────────────────────── */

/**
 * Les trois premiers crans, chacun avec ses blocs — **les trois, toujours**.
 *
 * Un cran sans bloc reste dans la liste, avec `vide: true` et la phrase qui dit
 * ce que son absence veut dire. C'est la règle 3 de ces écrans, et elle est la
 * raison d'être du groupement : sans elle, grouper ne ferait que déplacer des
 * cartes.
 *
 * Les blocs **sans cran** sortent à part, dans `sansCran`, et l'écran les
 * montre. Les fondre dans un cran les ferait compter dans un groupe qui annonce
 * autre chose qu'eux.
 */
export function lesBlocsParCran(blocs = []) {
  const tous = (Array.isArray(blocs) ? blocs : []).filter((un) => un && typeof un === "object");
  const avecCran = tous.map((bloc) => ({ bloc, cran: leCranDunBloc(bloc) }));

  const groupes = LES_CRANS
    // Le cran 4 ne groupe aucun bloc : il se lit entre eux.
    .filter((cran) => cran.cle !== CRAN.CHEMIN)
    .map((cran) => {
      const siens = avecCran.filter((un) => un.cran === cran.cle).map((un) => un.bloc);
      // **`estVide` et non `vide`.** `vide` porte déjà *la phrase* qui dit ce
      // que l'absence du cran veut dire ; y écrire un booléen l'écrasait, et
      // l'écran affichait « true » à la place de la phrase. Le défaut était
      // invisible au module — il rendait bien un objet — et visible au premier
      // rendu, où l'épreuve du panneau l'a trouvé.
      return { ...cran, blocs: siens, estVide: siens.length === 0 };
    });

  return {
    groupes,
    sansCran: avecCran.filter((un) => !un.cran).map((un) => un.bloc)
  };
}

/* ── Le cran 4 : les chemins ──────────────────────────────────────────────── */

/**
 * Les chemins entre fonctions, **en liste**.
 *
 * Un chemin est une paire : une fonction `aval` qui lit un nom que la fonction
 * `amont` produit. C'est le raisonnement, et c'est la seule chose de cet écran
 * qu'aucun document n'écrit — elle naît de la rencontre de deux fonctions.
 *
 * **Seules les fonctions amont comptent.** Un bloc de donnée produit aussi son
 * sujet, et une fonction qui le lit n'en fait pas un raisonnement : elle lit une
 * entrée. Un chemin va d'une conclusion à une autre, sinon toute fonction en
 * aurait autant qu'elle a d'entrées, et la liste dirait « tout dépend de tout ».
 *
 * **Jamais une fonction avec elle-même** : un nom qu'une fonction lit et produit
 * à la fois est une boucle, qui se lirait comme un raisonnement circulaire là où
 * c'est presque toujours une homonymie de sujets.
 */
export function lesCheminsEntreBlocs(blocs = []) {
  const fonctions = (Array.isArray(blocs) ? blocs : [])
    .filter((un) => un && typeof un === "object" && leCranDunBloc(un) === CRAN.FONCTION);

  const chemins = [];
  const vus = new Set();

  for (const aval of fonctions) {
    for (const nom of (Array.isArray(aval.lit) ? aval.lit : [])) {
      const voulu = texte(nom);
      if (!voulu) continue;

      for (const amont of fonctions) {
        if (amont === aval) continue;
        if (!(Array.isArray(amont.produit) ? amont.produit : []).some((un) => texte(un) === voulu)) {
          continue;
        }

        const marque = `${texte(amont.cle)}→${texte(aval.cle)}@${voulu}`;
        if (vus.has(marque)) continue;
        vus.add(marque);

        chemins.push({
          par: voulu,
          amont: { cle: texte(amont.cle), sujet: texte(amont.sujet) },
          aval: { cle: texte(aval.cle), sujet: texte(aval.sujet) },
          // La phrase est ici, et non dans le HTML : c'est elle qui fait du
          // chemin un raisonnement lisible plutôt qu'une flèche.
          dit: `« ${texte(aval.sujet)} » emploie « ${voulu} », que « ${texte(amont.sujet)} » conclut.`
        });
      }
    }
  }

  return chemins;
}

/* ── Ce que l'écran dit du tout ───────────────────────────────────────────── */

/**
 * La phrase de la traduction, **sans jamais fondre les crans**.
 *
 * Elle compte, par cran, et nomme ceux qui sont vides. « 12 blocs » seul ne dit
 * pas ce qui a été compris : douze données sans une seule fonction et quatre
 * fonctions enchaînées sont deux lectures opposées du même document.
 */
export function ceQueLaTraductionDit(blocs = []) {
  const { groupes, sansCran } = lesBlocsParCran(blocs);
  const chemins = lesCheminsEntreBlocs(blocs);

  const portes = groupes.filter((un) => !un.estVide);
  if (!portes.length && !sansCran.length) {
    return "Rien n'a été transcrit : ce document ne porte aucune valeur, aucune "
      + "contrainte et aucune règle que la lecture ait su isoler.";
  }

  const dits = portes.map((un) => `${un.blocs.length} ${lePetitMot(un, un.blocs.length)}`);
  const manques = groupes.filter((un) => un.estVide)
    .map((un) => lePetitMot(un, 0));

  const debut = dits.length ? dits.join(" · ") : "aucun cran rempli";
  const suite = manques.length
    ? ` Aucune ${manques.join(", aucune ")} : ce document n'en porte pas.`
    : "";
  const lien = chemins.length
    ? ` ${chemins.length} chemin${chemins.length > 1 ? "s" : ""} entre fonctions — `
      + "c'est là que se lisent les raisonnements."
    : " Aucun chemin entre fonctions : chacune se tient seule.";
  const pluriel = sansCran.length > 1 ? "s" : "";
  const reste = sansCran.length
    ? ` ${sansCran.length} bloc${pluriel} dont le cran n'est pas déterminé, `
      + `montré${pluriel} à part.`
    : "";

  return `${debut}.${suite}${lien}${reste}`;
}

/** Le mot d'un cran, au singulier ou au pluriel. */
function lePetitMot(cran, combien) {
  const seul = { donnee: "donnée", contrainte: "contrainte", fonction: "fonction" }[cran.cle]
    ?? texte(cran.cle);
  return Math.abs(combien) >= 2 ? `${seul}s` : seul;
}
