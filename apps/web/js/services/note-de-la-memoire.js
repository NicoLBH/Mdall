/**
 * Ce qu'il faut savoir d'une mémoire avant de la lire — **en cinq phrases**.
 *
 * ## Le défaut que ça répare
 *
 * La liste dit *ce qu'il y a* : c'est un inventaire, et c'est son métier — on y
 * vérifie, on y corrige. Le cerveau dit *comment c'est relié* : c'est une
 * topologie. Aucun des deux ne dit **où regarder**, et un projet de quatre cents
 * affirmations ne se lit ni par l'un ni par l'autre.
 *
 * Il manquait l'objet qui transforme un contenu en attention. Ce fichier le
 * rend, et ce n'est **pas une quatrième vue** : c'est la porte d'entrée. La
 * liste et le cerveau redeviennent ce qu'ils sont — des instruments qu'on ouvre
 * *depuis une phrase*.
 *
 * ## Trois parties, et aucun poids choisi par personne
 *
 * 1. **Ce qui tient le projet** — ce qui, s'il change, oblige un humain à
 *    rouvrir un choix. C'est la définition de l'important, et elle se dérive
 *    (`services/ce-que-ca-rouvre.js`).
 * 2. **Ce qui demande quelque chose** — les trous, et ce qui attend un geste.
 * 3. **Le détail** — ce qui se refait tout seul. Il se **compte**, il ne
 *    s'énumère pas : si la machine peut le refaire en silence, l'humain n'a pas
 *    à le voir.
 *
 * ## Chaque chiffre se clique, ou dit pourquoi il ne se clique pas
 *
 * Une phrase qui donne un nombre sans permettre d'aller voir est un cul-de-sac :
 * on la lit, on la croit, et l'on ne peut rien en faire. Chaque ligne porte donc
 * la **requête** qui ouvre la liste déjà filtrée dessus.
 *
 * **Sauf une, et c'est important.** Les noms qu'une fonction lit et que personne
 * n'a versés ne sont dans aucune liste — ils n'existent pas en mémoire, c'est
 * tout le problème. Cette ligne-là n'a pas de requête, et elle le dit plutôt que
 * de renvoyer vers un écran vide (règle 5).
 *
 * ## Ce que ce fichier ne fait pas
 *
 * **Il ne pondère pas, il ne classe pas, il ne note pas.** Aucun « importance
 * 7/10 » : un score affiché ne se conteste pas, donc ne se corrige pas. Il rend
 * des phrases et des nombres, tous dérivés de ce que la mémoire porte.
 *
 * **Il n'appelle aucun modèle.** Ces chiffres doivent tenir sans lui — l'IA
 * accélère, elle n'est jamais le seul chemin (fondamental 13). Un modèle pourra
 * reformuler cette note ; il ne doit jamais la produire.
 *
 * **Il ne rend pas de HTML.** L'écran décide de la forme ; une épreuve lit les
 * phrases sans traverser un rendu.
 */

import { NATURE, classifyAssertion, domainLabel, estUneRegle } from "./assertion-taxonomy.js";
import { ceQueCaRouvre } from "./ce-que-ca-rouvre.js";
import { LACUNE, lacunes } from "./decision-versement.js";
import { cleDuSujet } from "./memoire-identifiants.js";
import { lecturesDeLaRegle } from "./memoire-applications.js";
import { sujetDe } from "./memoire-raisonnement.js";
import { isOpenFinding } from "./memory-readers.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qui vaut encore : une ligne remplacée ne décrit plus l'état du projet. */
const enVigueur = (assertion) => !texte(assertion?.superseded_by);

/** Les trois parties de la note, dans l'ordre où on les lit. */
export const PARTIE = {
  TIENT: "tient",
  DEMANDE: "demande",
  DETAIL: "detail"
};

const TITRES = {
  [PARTIE.TIENT]: "Ce qui tient le projet",
  [PARTIE.DEMANDE]: "Ce qui demande quelque chose",
  [PARTIE.DETAIL]: "Le détail"
};

const CHAPEAUX = {
  [PARTIE.TIENT]: "Ce qui, s'il change, oblige quelqu'un à reprendre un choix.",
  [PARTIE.DEMANDE]: "Ce qui attend un geste, ou ce que personne n'a encore versé.",
  [PARTIE.DETAIL]: "Ce qui se refait tout seul. Se compte, ne se lit pas."
};

/** Le nom d'une partie, et sa phrase de tête. L'objet rendu les porte déjà. */
const titreDeLaPartie = (partie) => TITRES[texte(partie)] ?? "";
const chapeauDeLaPartie = (partie) => CHAPEAUX[texte(partie)] ?? "";

/** « 1 hypothèse », « 3 hypothèses » — le nombre et son mot, accordés. */
function accorde(combien, singulier, pluriel) {
  return `${combien} ${combien > 1 ? pluriel : singulier}`;
}

/**
 * Les noms qu'une fonction lit et que personne n'a versés.
 *
 * **Le trou du raisonnement, à l'échelle du projet.** Une fonction qui lit
 * « Classement du bâtiment » alors qu'aucune ligne ne le porte ne conclut rien,
 * et l'écran ne dit nulle part qu'il manque un nom — on voit une fonction qui ne
 * produit pas, sans savoir pourquoi.
 *
 * Comptés en **noms**, pas en lectures : trois fonctions qui lisent le même nom
 * absent, c'est un nom à verser, pas trois.
 *
 * @returns {string[]} les noms, tels qu'ils sont écrits dans les fonctions
 */
export function nomsQueRienNePorte(assertions = []) {
  const lignes = (Array.isArray(assertions) ? assertions : []).filter(enVigueur);

  const portes = new Set(
    lignes.filter((assertion) => !estUneRegle(assertion))
      .map((assertion) => cleDuSujet(sujetDe(assertion)))
      .filter(Boolean)
  );

  // Une fonction conclut sous son propre nom : ce nom-là est porté par elle, et
  // le compter comme manquant ferait passer chaque déduction pour un trou.
  for (const assertion of lignes) {
    if (estUneRegle(assertion)) portes.add(cleDuSujet(sujetDe(assertion)));
  }

  const manquants = new Map();

  for (const regle of lignes) {
    if (!estUneRegle(regle)) continue;
    for (const nom of lecturesDeLaRegle(regle)) {
      const cle = cleDuSujet(nom);
      if (!cle || portes.has(cle) || manquants.has(cle)) continue;
      manquants.set(cle, texte(nom));
    }
  }

  return [...manquants.values()];
}

/**
 * Les décisions dont il manque ce qui fait leur valeur.
 *
 * Ce sont les **possibles écartés** qui font l'intérêt d'une décision, et c'est
 * exactement ce que personne ne retrouve six mois plus tard. Une décision sans
 * écartés notés n'est pas une décision sans écartés : c'est une décision dont on
 * n'a pas noté les écartés, et les deux ne se relisent pas pareil.
 */
export function decisionsMuettes(assertions = []) {
  return (Array.isArray(assertions) ? assertions : [])
    .filter(enVigueur)
    .filter((assertion) => classifyAssertion(assertion).nature === NATURE.DECISION)
    .filter((assertion) => lacunes(assertion?.payload?.decision, {
      par: texte(assertion?.payload?.provenance?.par)
    }).includes(LACUNE.ECARTES));
}

/**
 * Un chiffre, découpé par domaine — et chaque morceau s'ouvre.
 *
 * ## Le défaut
 *
 * « 380 constats attendent d'être levés » est un nombre qui décourage, pas qui
 * oriente. On le lit, on se dit qu'on n'y arrivera jamais, et l'on passe. Un
 * chiffre qui ne donne pas de prise est un chiffre qu'on cesse de regarder —
 * et c'est exactement ce que la note existe pour éviter.
 *
 * Découpé, il rend la main : « 180 en structure » se traite, et
 * « 90 sans domaine » dit autre chose encore — ce sont des constats qu'on ne
 * peut même pas ranger, et c'est un travail à part.
 *
 * ## Trois, et le reste
 *
 * Les trois plus gros, puis « le reste ». Dix lignes de détail sous un chiffre
 * refont exactement le mur qu'on vient d'abattre.
 */
function parDomaine(lignes = []) {
  const parts = new Map();

  for (const assertion of Array.isArray(lignes) ? lignes : []) {
    const domaine = classifyAssertion(assertion).domain || "";
    parts.set(domaine, (parts.get(domaine) ?? 0) + 1);
  }

  const tous = [...parts.entries()]
    .map(([domaine, combien]) => ({
      cle: domaine || "none",
      combien,
      // **Sans domaine se dit, et se cherche.** Un constat qu'on ne peut pas
      // ranger n'est pas un constat de moins : c'est un travail de plus.
      phrase: domaine ? domainLabel(domaine) : "sans domaine",
      requete: `ouverts:oui domaine:${domaine || "non-classé"}`
    }))
    .sort((gauche, droite) => (droite.combien - gauche.combien)
      || gauche.phrase.localeCompare(droite.phrase, "fr"));

  // Un seul domaine ne se découpe pas : la part vaudrait le total, et la
  // répéter ferait lire deux fois le même chiffre.
  if (tous.length < 2) return [];

  const gros = tous.slice(0, 3);
  const reste = tous.slice(3).reduce((total, une) => total + une.combien, 0);

  /**
   * **Le reste n'ouvre rien, et c'est honnête.** « Ailleurs » n'est pas un
   * domaine : lui donner la requête du total ferait cliquer sur « 2 ailleurs »
   * pour en obtenir 380. Le chiffre se lit, et l'on descend dans la liste par
   * les trois qui précèdent.
   */
  return reste > 0
    ? [...gros, {
      cle: "reste",
      combien: reste,
      phrase: accorde(tous.length - 3, "autre domaine", "autres domaines"),
      requete: ""
    }]
    : gros;
}

/**
 * La note d'une mémoire : ce qu'il faut en savoir avant de la lire.
 *
 * @param {object[]} assertions la mémoire du projet
 * @param {object} [options]
 * @param {object[]} [options.liens] le graphe des dépendances, tel que la base
 *   le porte. Le module de `ceQueCaRouvre` tranche : enregistré d'abord, déduit
 *   sinon.
 * @returns {{total: number, parties: object[], vide: boolean}}
 */
export function noteDeLaMemoire(assertions = [], { liens = null } = {}) {
  const lignes = (Array.isArray(assertions) ? assertions : []).filter(enVigueur);

  const rouvert = ceQueCaRouvre(lignes, { liens });
  const valeurs = lignes.filter((assertion) => !estUneRegle(assertion));

  const hypotheses = valeurs.filter(
    (assertion) => classifyAssertion(assertion).nature === NATURE.HYPOTHESE
  ).length;
  const decisions = valeurs.filter(
    (assertion) => classifyAssertion(assertion).nature === NATURE.DECISION
  ).length;
  const muettes = decisionsMuettes(lignes).length;
  const manquants = nomsQueRienNePorte(lignes);
  const constats = lignes.filter(isOpenFinding);
  const ouverts = constats.length;

  /**
   * Une ligne de la note. **Zéro ne s'écrit pas.**
   *
   * « 0 hypothèse » se lit comme une mesure, alors que c'est le plus souvent
   * l'absence de versement. Une note faite de zéros apprend à ne plus la
   * regarder, et c'est exactement ce qu'on cherche à éviter.
   */
  const ligne = (cle, combien, phrase, { requete = "", pourquoi = "", detail = [] } = {}) =>
    (combien > 0 ? [{ cle, combien, phrase, requete, pourquoi, detail }] : []);

  const parties = [
    {
      id: PARTIE.TIENT,
      lignes: [
        ...ligne("rouvre", rouvert.size,
          `${accorde(rouvert.size, "affirmation rouvre", "affirmations rouvrent")} un choix humain`
          + ` ${rouvert.size > 1 ? "si elles changent" : "si elle change"}`,
          { requete: "rouvre:oui" }),
        ...ligne("hypotheses", hypotheses,
          `${accorde(hypotheses, "hypothèse", "hypothèses")} : le projet bâtit dessus, et une mesure`
          + ` ${hypotheses > 1 ? "les" : "la"} tranchera`,
          { requete: "nature:hypothèse" }),
        ...ligne("decisions", decisions,
          `${accorde(decisions, "décision enregistrée", "décisions enregistrées")}`
          + (muettes
            ? ` — ${muettes > 1 ? `${muettes} ne disent pas` : "une ne dit pas"} ce ${
              muettes > 1 ? "qu'elles ont écarté" : "qu'elle a écarté"}`
            : ""),
          { requete: "nature:décision" })
      ]
    },
    {
      id: PARTIE.DEMANDE,
      lignes: [
        ...ligne("manquants", manquants.length,
          `${accorde(manquants.length, "nom", "noms")} qu'une fonction lit et que personne n'a`
          + ` ${manquants.length > 1 ? "versés" : "versé"}`,
          {
            // **Pas de requête, et ce n'est pas un oubli.** Ces noms ne sont
            // dans aucune liste — ils n'existent pas en mémoire, c'est tout le
            // problème. La raison vit ici, avec la phrase qu'elle explique, et
            // s'accorde avec elle : écrite à l'écran, elle y serait au pluriel
            // sous une phrase au singulier (règle 10).
            pourquoi: `aucune liste ne peut ${manquants.length > 1 ? "les" : "le"} montrer :`
              + ` ${manquants.length > 1 ? "ils ne sont" : "il n'est"} pas en mémoire`
          }),
        ...ligne("ouverts", ouverts,
          `${accorde(ouverts, "constat attend", "constats attendent")} d'être`
          + ` ${ouverts > 1 ? "levés" : "levé"}`,
          { requete: "ouverts:oui", detail: parDomaine(constats) })
      ]
    }
  ].map((partie) => ({
    ...partie,
    titre: titreDeLaPartie(partie.id),
    chapeau: chapeauDeLaPartie(partie.id)
  })).filter((partie) => partie.lignes.length > 0);

  /**
   * Le détail : ce que la note ne montre pas, et qui se compte quand même.
   *
   * Sur **toute** la mémoire, fonctions comprises, et non sur les seules
   * valeurs : `rouvre:oui` et `rouvre:non` doivent partager la liste en deux
   * sans reste. Compté sur les valeurs, le détail retranchait des fonctions
   * d'un total qui n'en contenait pas, et les deux chiffres ne se rejoignaient
   * plus — un lecteur qui les additionne doit retrouver la mémoire.
   */
  const detail = lignes.length - rouvert.size;

  return {
    total: lignes.length,
    parties: [
      ...parties,
      ...(detail > 0
        ? [{
            id: PARTIE.DETAIL,
            titre: titreDeLaPartie(PARTIE.DETAIL),
            chapeau: chapeauDeLaPartie(PARTIE.DETAIL),
            lignes: [{
              cle: "detail",
              combien: detail,
              phrase: `${accorde(detail, "affirmation ne rouvre", "affirmations ne rouvrent")} rien :`
                + ` ${detail > 1 ? "elles se refont" : "elle se refait"} sans redemander à personne`,
              requete: "rouvre:non",
              pourquoi: ""
            }]
          }]
        : [])
    ],
    // Une mémoire dont la note n'a rien à dire n'est pas forcément vide : elle
    // peut n'avoir rien qui tienne et rien qui manque. L'écran distingue les deux.
    vide: lignes.length === 0
  };
}
