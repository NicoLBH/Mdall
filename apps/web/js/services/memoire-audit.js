/**
 * Le rejeu à blanc : ce que le projet affirme est-il encore ce que ses règles
 * concluent ?
 *
 * ## La question pour laquelle le produit existe
 *
 * Une mémoire dérive sans que personne le voie. Une hauteur corrigée sans que
 * l'aval suive, une règle passée en `V2`, une valeur retouchée à la main : rien
 * ne casse, rien ne s'affiche, et l'écran continue de montrer une chaîne de
 * raisonnement qui ne tient plus. On lit alors une conclusion en croyant lire un
 * calcul.
 *
 * Cet audit rejoue chaque règle sur **ce que la mémoire dit aujourd'hui**, et
 * compare sa conclusion à ce que le projet affirme. Il n'écrit rien.
 *
 * Voir `docs/rejouer-la-memoire.md`, étape 5.
 *
 * ## Local, et pas en cascade — c'est le choix qui rend l'audit utile
 *
 * Chaque règle est évaluée contre les valeurs **stockées** de ses entrées, pas
 * contre celles qu'un rejeu en chaîne aurait recalculées.
 *
 * L'exemple qui tranche : la hauteur a été corrigée à 31 m, le classement dit
 * encore « 3ᵉ famille B », et le degré coupe-feu dit « CF 1 h » — ce qui est
 * juste **pour une 3ᵉ famille B**.
 *
 * - En cascade, on signalerait deux défauts : le classement, puis le degré. Le
 *   second n'en est pas un ; c'est une conséquence du premier.
 * - Localement, on en signale **un**, exactement là où il est. Et ce qui en
 *   découlerait se lit dans l'étude d'impact, qui est faite pour ça.
 *
 * Un audit qui multiplie les signalements s'apprend à être ignoré, et un écran
 * qui signale tout ne signale plus rien.
 *
 * ## Les entrées périmées : ce que l'audit ne savait pas voir
 *
 * Une règle se rejoue ; une déduction d'utilitaire, non — elle calcule au serveur,
 * et l'audit la rangeait parmi les opaques, comptée et tue. Sur un projet dont le
 * raisonnement passe surtout par des utilitaires, « rien à signaler » voulait donc
 * dire « je n'ai presque rien regardé ».
 *
 * Depuis que les utilitaires **déclarent ce qu'ils lisent**, il reste une chose
 * qu'on peut dire sans savoir recalculer, et c'est la plus utile : *cette
 * contrainte a été calculée sur une altitude de 13 m, et le projet dit aujourd'hui
 * 890 m*. On ne prétend pas connaître la nouvelle cote — la table est au serveur —,
 * on dit que celle qui est affichée ne vaut plus. C'est exactement le défaut qui
 * gangrenait tout : une valeur d'apparence normale, dont l'entrée a bougé sous
 * elle, et que rien ne signalait.
 *
 * Ce contrôle est local lui aussi : il compare une entrée déclarée à ce que le
 * projet affirme aujourd'hui, sans rien remonter.
 */

import { cleDuSujet } from "./memoire-identifiants.js";
import { zonesLisibles } from "./memoire-blame.js";
import { normalizeZoneKey } from "./project-zones.js";
import { sujetDe, valeurDuSujet } from "./memoire-raisonnement.js";
import { VERDICT, lecteurDeValeurs, rejouerLaRegle } from "./memoire-evaluateur.js";
import { planDeRecalcul } from "./memoire-plan.js";
import { lireUnNombre } from "./memoire-en-texte.js";
import { estUneRegle } from "./assertion-taxonomy.js";

const texte = (valeur) => String(valeur ?? "").trim();

export { VERDICT };

const enVigueur = (assertion) => !texte(assertion?.superseded_by);

/** Les zones d'une affirmation, en clés, ou `[]` pour « partout ». */
function porteesDe(assertion) {
  return [...new Set(zonesLisibles(assertion).map(normalizeZoneKey).filter(Boolean))];
}

/** Cette affirmation vaut-elle dans cette zone ? Vide vaut partout. */
function vautDans(assertion, zone) {
  const portees = porteesDe(assertion);
  if (!portees.length) return true;
  return Boolean(zone) && portees.includes(zone);
}

/** Ce que le projet dit dans cette zone, tel qu'il l'a écrit. */
function valeursDeLaZone(assertions, zone) {
  const table = new Map();

  for (const assertion of assertions) {
    if (estUneRegle(assertion) || !vautDans(assertion, zone)) continue;
    const cle = cleDuSujet(sujetDe(assertion));
    if (!cle) continue;
    // La valeur portée l'emporte sur celle qui vaut partout : elle est plus
    // précise, et c'est la règle que suit toute la lecture de la mémoire.
    if (!table.has(cle) || porteesDe(assertion).length) table.set(cle, texte(assertion?.payload?.value));
  }

  return table;
}

/** Toutes les portées où des règles s'appliquent, plus « partout ». */
function porteesDesRegles(assertions) {
  const zones = new Set([""]);
  for (const assertion of assertions) {
    if (!estUneRegle(assertion)) continue;
    for (const zone of porteesDe(assertion)) zones.add(zone);
  }
  return [...zones];
}

/** Une contrainte déduite porte l'agent qui l'a produite. */
const estDeduite = (assertion) => texte(assertion?.payload?.utilitaire) !== "";

/**
 * Deux valeurs disent-elles la même chose ?
 *
 * Les nombres se comparent en nombres — `13` et « 13 m » sont la même altitude,
 * et signaler une dérive sur une unité écrite ferait crier au défaut sur une
 * mémoire saine. Le reste se compare comme un sujet : casse et accents mis à
 * part, rien de plus.
 */
function memeValeur(gauche, droite) {
  const a = lireUnNombre(gauche);
  const b = lireUnNombre(droite);
  if (Number.isFinite(a) && Number.isFinite(b)) return a === b;
  return cleDuSujet(gauche) === cleDuSujet(droite);
}

/**
 * Les calculs faits sur une entrée que le projet a changée depuis.
 *
 * On ne signale que ce qu'on sait : une entrée déclarée, **avec** la valeur lue au
 * moment du calcul, et un sujet que la mémoire porte encore aujourd'hui. Une
 * contrainte versée avant que les utilitaires déclarent quoi que ce soit ne dit pas
 * sur quoi elle a été calculée ; elle reste opaque, et l'écran le dit là.
 */
function entreesPerimees(assertions) {
  const lignes = [];

  for (const assertion of assertions) {
    if (estUneRegle(assertion) || !estDeduite(assertion)) continue;
    const declarees = Array.isArray(assertion?.payload?.lectures) ? assertion.payload.lectures : [];
    if (!declarees.length) continue;

    const zone = porteesDe(assertion)[0] ?? "";
    const valeurs = valeursDeLaZone(assertions, zone);

    for (const lecture of declarees) {
      const sujet = texte(lecture?.sujet);
      const lue = texte(lecture?.valeur);
      // Sans la valeur lue, il n'y a rien à comparer ; sans le sujet en mémoire,
      // il n'y a rien à quoi la comparer. Ni l'un ni l'autre n'est une dérive.
      if (!sujet || !lue) continue;
      const dite = valeurs.get(cleDuSujet(sujet));
      if (dite === undefined || !texte(dite) || memeValeur(lue, dite)) continue;

      lignes.push({
        assertion,
        sujet: sujetDe(assertion),
        valeur: texte(assertion?.payload?.value),
        entree: sujet,
        calculeeSur: lue,
        aujourdhui: texte(dite),
        utilitaire: texte(assertion?.payload?.utilitaire),
        zone
      });
    }
  }

  return lignes;
}

/** L'affirmation qui porte la conclusion d'une règle, dans cette zone. */
function sortieDeLaRegle(regle, assertions, zone) {
  const lue = valeurDuSujet(sujetDe(regle), assertions, zone);
  // `deduite` veut dire « lue sur la ligne de la règle » : la conclusion ne vit
  // alors que dans la règle, et il n'y a rien à comparer d'autre.
  return lue && !lue.deduite ? lue.assertion : null;
}

/**
 * Auditer la mémoire.
 *
 * @param {object[]} assertions la mémoire du projet
 * @returns {{verdicts: object[], compte: object, opaques: object[],
 *   cycles: object[], regles: number, tient: boolean}}
 */
export function auditerLaMemoire(assertions = []) {
  const toutes = (Array.isArray(assertions) ? assertions : []).filter(enVigueur);
  const verdicts = [];

  for (const zone of porteesDesRegles(toutes)) {
    const valeurs = valeursDeLaZone(toutes, zone);
    const lire = lecteurDeValeurs(valeurs);

    for (const regle of toutes) {
      if (!estUneRegle(regle)) continue;
      const portees = porteesDe(regle);
      if (portees.length ? !portees.includes(zone) : zone !== "") continue;

      const sortie = sortieDeLaRegle(regle, toutes, zone);
      const rendu = rejouerLaRegle(regle, lire);

      // Ce que le projet **affirme** — pas ce que la règle avait conclu. C'est
      // la comparaison qui répond à la question : une valeur retouchée à la main
      // sur la ligne, sans que la règle bouge, est exactement le défaut qu'on
      // cherche, et comparer la règle à elle-même le manquerait.
      const affirmee = texte(sortie?.payload?.value) || texte(regle?.payload?.value);
      const conclue = rendu.evaluation.decidable && rendu.evaluation.applique !== false
        ? texte(rendu.evaluation.valeur)
        : "";

      const verdict = !rendu.evaluation.decidable
        ? VERDICT.INDECIDABLE
        : rendu.evaluation.applique === false
          ? VERDICT.SANS_OBJET
          : cleDuSujet(conclue) === cleDuSujet(affirmee)
            ? VERDICT.IDENTIQUE
            : VERDICT.DIFFERENTE;

      verdicts.push({
        regle, sortie, zone,
        sujet: sujetDe(regle),
        verdict,
        affirmee,
        conclue,
        manquants: rendu.evaluation.manquants,
        doutes: rendu.evaluation.doutes,
        melange: rendu.evaluation.melange,
        // Ce que la règle a lu : sans la trace, un verdict est un jugement sans
        // motif, et personne ne sait par quel bout le reprendre.
        trace: rendu.evaluation.conditions
      });
    }
  }

  const plan = planDeRecalcul(toutes);
  const perimees = entreesPerimees(toutes);
  const compte = (quoi) => verdicts.filter((ligne) => ligne.verdict === quoi).length;

  const differentes = compte(VERDICT.DIFFERENTE);
  const sansObjet = compte(VERDICT.SANS_OBJET);
  const indecidables = compte(VERDICT.INDECIDABLE);

  return {
    verdicts,
    compte: {
      identiques: compte(VERDICT.IDENTIQUE),
      differentes,
      indecidables,
      sansObjet,
      opaques: plan.opaques,
      perimees: perimees.length,
      cycles: plan.cycles.reduce((somme, cycle) => somme + cycle.noeuds.length, 0)
    },
    /**
     * Les calculs d'utilitaire faits sur une entrée qui a bougé depuis.
     *
     * On ne les recalcule pas — la table est au serveur —, on dit que la valeur
     * affichée ne vaut plus. C'est tout ce qu'on peut dire honnêtement, et c'est
     * beaucoup plus que le silence d'avant.
     */
    perimees,
    // Ce que l'audit n'a pas pu regarder : les déductions d'un utilitaire. Les
    // taire ferait passer « rien à signaler » pour « tout a été vérifié ».
    opaques: plan.zones.flatMap((zone) => zone.opaques),
    cycles: plan.cycles,
    regles: verdicts.length,
    /**
     * La mémoire tient-elle ?
     *
     * Vrai quand aucune règle ne conclut autre chose que ce que le projet
     * affirme, qu'aucune n'a perdu son objet, et qu'aucun calcul d'utilitaire ne
     * repose sur une entrée que le projet a changée depuis. L'indécidable ne
     * compte pas comme une dérive : c'est une lacune d'entrée, pas une
     * contradiction — et les confondre ferait crier au défaut sur un projet
     * simplement incomplet.
     */
    tient: differentes === 0 && sansObjet === 0 && perimees.length === 0
  };
}

/** Les verdicts qui appellent un geste, les plus graves d'abord. */
export function cequiAppelleUnGeste(audit = {}) {
  const ordre = [VERDICT.DIFFERENTE, VERDICT.SANS_OBJET, VERDICT.INDECIDABLE];
  return (audit?.verdicts ?? [])
    .filter((ligne) => ordre.includes(ligne.verdict))
    .sort((gauche, droite) => ordre.indexOf(gauche.verdict) - ordre.indexOf(droite.verdict));
}
