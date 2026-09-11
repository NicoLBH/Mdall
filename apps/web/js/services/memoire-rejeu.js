/**
 * Rejouer les règles du projet, sur les valeurs qu'on lui donne.
 *
 * ## Ce que ça permet enfin
 *
 * Jusqu'ici, changer une valeur ne rendait que des **noms** : on savait *quoi*
 * devenait suspect, jamais *ce que ça devenait*. Avec un évaluateur, une règle
 * dont les entrées bougent se rejoue, et l'on obtient une vraie valeur — ou un
 * refus nommé, ce qui est aussi une réponse.
 *
 * Voir `docs/rejouer-la-memoire.md`, étape 3.
 *
 * ## Une zone à la fois
 *
 * Une variable n'a pas *une* valeur, elle en a une par partie d'ouvrage. Le
 * classement du bâtiment A et celui du bâtiment B ne se mélangent pas, et une
 * règle appliquée à trois zones est trois exécutions. On rejoue donc **par
 * zone** : la valeur de la zone d'abord, celle qui vaut partout à défaut, et
 * jamais celle d'une autre zone.
 *
 * ## Un point fixe, pas encore un plan
 *
 * Les règles s'enchaînent : le classement produit le degré coupe-feu, qui produit
 * autre chose. On repasse donc sur toutes les règles tant qu'une valeur change,
 * et l'on s'arrête quand plus rien ne bouge.
 *
 * Ce n'est pas le plan de recalcul en strates — c'est l'étape 4, et elle
 * apportera l'ordre, le parallélisme et l'affichage. Un point fixe rend le même
 * résultat sans savoir l'ordre ; il coûte quelques tours de plus, et il est
 * juste. Il est **borné** : au-delà, on cesse et l'on dit qu'on a cessé, plutôt
 * que de tourner sur un cycle que personne n'a vu.
 */

import { cleDuSujet } from "./memoire-identifiants.js";
import { zonesLisibles } from "./memoire-blame.js";
import { normalizeZoneKey } from "./project-zones.js";
import { valeursDeLaPortee } from "./memoire-valeurs.js";
import { sujetDe, valeurDuSujet } from "./memoire-raisonnement.js";
import { VERDICT, lecteurDeValeurs, rejouerLaRegle } from "./memoire-evaluateur.js";
import { ordreDeLaZone } from "./memoire-plan.js";
import { jalonsDuRejeu } from "./raisonnement-jalonne.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Le nombre de tours au-delà duquel on cesse.
 *
 * Une mémoire dont les règles s'enchaînent sur plus de trente pas est soit
 * extraordinaire, soit cyclique. Dans les deux cas, mieux vaut s'arrêter et le
 * dire que rendre un résultat qu'on ne sait pas justifier.
 */
export const TOURS_MAX = 30;

const estUneRegle = (assertion) => assertion?.payload?.referentiel === true;
const enVigueur = (assertion) => !texte(assertion?.superseded_by);

/** Les zones d'une affirmation, en clés, ou `[]` pour « partout ». */
function porteesDe(assertion) {
  return [...new Set(zonesLisibles(assertion).map(normalizeZoneKey).filter(Boolean))];
}

/**
 * Toutes les portées où il faut rejouer.
 *
 * Celles que les règles déclarent, plus `""` — ce qui vaut partout, et qui est
 * une portée à part entière, pas un défaut.
 */
export function porteesDuRejeu(assertions = []) {
  const zones = new Set([""]);
  for (const assertion of assertions) {
    if (!estUneRegle(assertion) || !enVigueur(assertion)) continue;
    for (const zone of porteesDe(assertion)) zones.add(zone);
  }
  return [...zones];
}

/**
 * Les règles qui s'appliquent dans cette zone, **dans l'ordre du plan**.
 *
 * Rejouées dans cet ordre, chacune lit des valeurs déjà refaites, et un seul
 * tour suffit. Celles que le plan n'a pas su placer — une sortie qu'aucune
 * affirmation ne porte, une composante cyclique — viennent après, dans l'ordre
 * du fichier : la boucle les rattrape.
 */
function reglesDeLaZone(assertions, zone) {
  const regles = assertions.filter((assertion) => {
    if (!estUneRegle(assertion) || !enVigueur(assertion)) return false;
    const portees = porteesDe(assertion);
    return portees.length ? portees.includes(zone) : zone === "";
  });

  const rang = new Map(ordreDeLaZone(assertions, zone).map((cle, index) => [cle, index]));
  const place = (regle) => rang.get(cleDuSujet(sujetDe(regle))) ?? Number.MAX_SAFE_INTEGER;

  return [...regles].sort((gauche, droite) => place(gauche) - place(droite));
}

/**
 * Ce que le projet dit, dans cette zone, avant qu'on rejoue.
 *
 * Le choix de la ligne qui vaut est délégué à `valeursDeLaPortee` : la plus
 * spécifique l'emporte, et à portée égale la plus récente. C'est le même juge
 * que l'écran et que `valeurDuSujet`. Cette fonction avait le sien — « la
 * première du tableau, sauf si une portée arrive ensuite » —, qui dépendait de
 * l'ordre où la base rendait ses lignes : le rejeu pouvait tourner sur une
 * valeur que le fichier ne montrait plus.
 *
 * Les substitutions s'appliquent **par affirmation**, pas par sujet : c'est la
 * ligne qu'on fait bouger qui a un identifiant, et deux valeurs successives d'un
 * même sujet ne sont pas la même chose.
 */
function valeursDeLaZone(assertions, zone, substitutions) {
  const table = new Map();

  for (const [cle, assertion] of valeursDeLaPortee(assertions, zone)) {
    const substituee = substitutions.get(texte(assertion.id));
    table.set(cle, substituee !== undefined ? texte(substituee) : texte(assertion?.payload?.value));
  }

  return table;
}

/** L'affirmation qui porte la conclusion d'une règle, dans cette zone. */
function sortieDeLaRegle(regle, assertions, zone) {
  const lue = valeurDuSujet(sujetDe(regle), assertions, zone);
  // `deduite` veut dire « lue sur la ligne de la règle » : il n'y a alors pas
  // d'affirmation à faire bouger, et la conclusion ne vit que dans la règle.
  return lue && !lue.deduite ? lue.assertion : null;
}

/**
 * Rejouer toutes les règles, jusqu'à ce que plus rien ne bouge.
 *
 * @param {object[]} assertions la mémoire du projet
 * @param {object} [options]
 * @param {Map<string, string>} [options.substitutions] affirmation → valeur
 *   qu'on lui impose. Vide, c'est un **rejeu à blanc** : on rejoue sur ce que le
 *   projet dit aujourd'hui, et toute différence est un défaut de la mémoire.
 * @returns {{conclusions: object[], indecidables: object[], sansObjet: object[],
 *   cycles: object[], tours: number, borne: boolean}}
 */
export function rejouerLesRegles(assertions = [], { substitutions = new Map(), actes = null } = {}) {
  const toutes = (Array.isArray(assertions) ? assertions : []).filter(enVigueur);
  const imposees = substitutions instanceof Map ? substitutions : new Map(Object.entries(substitutions ?? {}));

  const conclusions = new Map();
  const tenues = new Map();
  const indecidables = [];
  const sansObjet = [];
  const cycles = [];
  let tours = 0;
  let borne = false;

  for (const zone of porteesDuRejeu(toutes)) {
    const regles = reglesDeLaZone(toutes, zone);
    if (!regles.length) continue;

    const valeurs = valeursDeLaZone(toutes, zone, imposees);
    const doutes = new Map();
    const inapplicables = new Map();
    const trouvees = new Map();
    const confirmees = new Map();
    let bouge = true;
    let toursDeLaZone = 0;
    let tourne = false;

    while (bouge) {
      bouge = false;
      toursDeLaZone += 1;
      if (toursDeLaZone > TOURS_MAX) { borne = true; tourne = true; break; }

      for (const regle of regles) {
        const rendu = rejouerLaRegle(regle, lecteurDeValeurs(valeurs));
        const sortie = sortieDeLaRegle(regle, toutes, zone);

        if (rendu.verdict === VERDICT.INDECIDABLE) {
          doutes.set(texte(regle.id), {
            regle, zone, sortie, motif: VERDICT.INDECIDABLE,
            manquants: rendu.evaluation.manquants,
            doutes: rendu.evaluation.doutes
          });
          continue;
        }
        doutes.delete(texte(regle.id));

        // La règle ne s'applique plus et n'a rien à dire à la place. Elle ne
        // produit pas une valeur vide : ce que le projet tient reste écrit, et
        // c'est son fondement qui a disparu. Une autre nouvelle, dite autrement.
        if (rendu.verdict === VERDICT.SANS_OBJET) {
          inapplicables.set(texte(regle.id), {
            regle, zone, sortie, motif: VERDICT.SANS_OBJET,
            sujet: sujetDe(regle),
            avant: texte(sortie?.payload?.value),
            trace: rendu.evaluation.conditions
          });
          continue;
        }
        inapplicables.delete(texte(regle.id));

        const cle = cleDuSujet(sujetDe(regle));
        const avant = valeurs.get(cle) ?? "";
        const marque = `${texte(sortie?.id) || texte(regle.id)}|${zone}`;

        if (texte(rendu.apres) === texte(avant)) {
          // **Rejouée, et elle tient.** Ce n'est pas rien : sans cette liste, une
          // règle que le moteur venait d'évaluer avec succès était indiscernable
          // d'une règle qu'il n'avait pas regardée — et la variante la rangeait
          // dans « à revérifier » du seul fait qu'une de ses entrées avait bougé.
          // C'est le faux signal qu'on refuse ailleurs : on a regardé, la
          // conclusion tient, et le dire suspect apprend à ignorer l'écran.
          confirmees.set(marque, {
            regle, zone, sortie,
            sujet: sujetDe(regle),
            valeur: texte(rendu.apres),
            trace: rendu.evaluation.conditions
          });
          continue;
        }
        confirmees.delete(marque);

        // Une valeur nouvelle : on la pose, et l'on refait un tour — ce qui la
        // lit doit être rejoué avec elle.
        valeurs.set(cle, texte(rendu.apres));
        bouge = true;

        trouvees.set(marque, {
          regle, zone, sortie,
          sujet: sujetDe(regle),
          avant: texte(sortie?.payload?.value) || avant,
          apres: texte(rendu.apres),
          // Ce que la règle a lu pour conclure : sans la trace, une valeur
          // nouvelle est une affirmation de plus qu'il faut croire sur parole.
          trace: rendu.evaluation.conditions
        });
      }
    }

    tours = Math.max(tours, toursDeLaZone);

    if (tourne) {
      // Rien de cette zone n'est une conclusion : ce sont des états de passage
      // d'un calcul qui ne s'arrête pas, et les montrer ferait passer l'un
      // d'eux pour le résultat.
      cycles.push({ zone, regles: regles.map((regle) => texte(regle.id)) });
      continue;
    }

    for (const [cle, conclusion] of trouvees) conclusions.set(cle, conclusion);
    // Une règle qui a fini par bouger n'est plus tenue : c'est son dernier tour
    // qui compte, pas le premier.
    for (const cle of trouvees.keys()) confirmees.delete(cle);
    for (const [cle, tenue] of confirmees) tenues.set(cle, tenue);
    indecidables.push(...doutes.values());
    sansObjet.push(...inapplicables.values());
  }

  const trouvailles = [...conclusions.values()];

  return {
    conclusions: trouvailles,
    /** Rejouées, et elles rendent ce que le projet affirme déjà. On a regardé. */
    tenues: [...tenues.values()],
    /**
     * Ce que le rejeu **réécrit alors que quelqu'un l'avait examiné**.
     *
     * C'est la seule question que le moteur pose à chaque nœud : *ce nœud
     * est-il couvert ?* Il ne s'arrête pas pour autant — arrêter la chaîne
     * perdrait les conséquences, qui sont tout l'intérêt du rejeu. Il cesse de
     * se **taire**, ce qui n'est pas la même chose
     * (`services/raisonnement-jalonne.js`).
     *
     * `null` quand les actes n'ont pas été donnés — **pas** une liste vide :
     * ne pas savoir n'autorise pas à répondre « aucun » (règle 5).
     */
    jalons: Array.isArray(actes) ? jalonsDuRejeu({ conclusions: trouvailles, actes }) : null,
    indecidables, sansObjet, cycles, tours, borne
  };
}
