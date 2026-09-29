/**
 * Ce qui manque au constat se demande **une fois, par lot, et sous forme de clic**.
 *
 * ## Où l'on en est
 *
 * `ecarts-observes.js` a récolté les traces gratuites : ce que le projet a
 * écarté, sans rien demander à personne. Trois des quatre gisements ne disent
 * que **comment on l'a vu** — une valeur remplacée, un document arrivé après
 * coup, une ligne sortie du projet. Le *pourquoi* manque, et il ne se devine
 * pas (règle 5).
 *
 * C'est la moitié qu'il faut bien demander : elle s'est passée dans une
 * réunion, et aucun calcul ne la verra jamais.
 *
 * ## Les trois conditions pour que ça se remplisse
 *
 * **Par lot.** Une question à la fois, posée quinze fois dans la journée, est
 * un harcèlement. Cinq d'un coup, une fois, est une tâche — on la voit finir,
 * et l'on s'y met.
 *
 * **Au moment où l'on en souffre.** La prise est sur la ligne qui vient de dire
 * « écarté en chemin » sans dire pourquoi : c'est là, et nulle part ailleurs,
 * que quelqu'un a envie de le savoir. Un écran d'attente qu'on ouvrirait exprès
 * ne s'ouvre jamais.
 *
 * **Sous forme de clic.** La raison se choisit dans le domaine fermé du métier
 * (`RAISON`, dans `memoire-en-texte.js`). Écrire une phrase en fin de journée ne
 * se fait pas ; choisir « trop cher » se fait.
 *
 * ## « Une fois » : rien ne relance, donc rien n'insiste
 *
 * On aurait pu garder la trace des « je ne sais pas » pour ne pas reposer la
 * question. Ce n'est pas nécessaire, et c'est tant mieux : **rien ne pousse
 * cette demande**. Elle ne s'ouvre que si quelqu'un clique. Un écarté qu'on
 * laisse sans raison reste ce qu'il est — constaté, sans motif —, et personne
 * n'est relancé.
 *
 * Une case qu'on laisse vide est donc une réponse acceptable, et l'écran le
 * dit : une raison inventée pour se débarrasser d'un formulaire est pire qu'une
 * raison absente.
 *
 * ## Ce qui sort d'ici n'entre pas en mémoire
 *
 * Une raison donnée **complète une décision**, et une décision se verse par une
 * proposition que quelqu'un signe — règle 1, sans exception. Ce fichier rend
 * des affirmations prêtes à proposer ; il n'écrit rien.
 *
 * Et c'est la revue qui filtre : quelqu'un qui n'était pas là et qui invente
 * une raison se fait refuser. Ce refus devient à son tour un écart constaté,
 * signé et motivé. La boucle se referme.
 */

import { faceDe } from "./memoire-groupes.js";
import { ecartsObservesParSujet } from "./ecarts-observes.js";
import { decisionVersable } from "./decision-versement.js";
import { RAISONS_DITES } from "./memoire-en-texte.js";
import { valeurDuVersement, versementQuiVaut } from "./memoire-valeurs.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Combien de raisons on demande d'un coup.
 *
 * Cinq. Au-delà, on ne voit plus la fin de la liste, et une tâche dont on ne
 * voit pas la fin ne se commence pas — c'est la même raison qui fait qu'un
 * chiffre de trois cents constats décourage au lieu d'orienter.
 */
export const LOT_MAX = 5;

/** Les zones d'une affirmation, telles qu'une proposition les reprend. */
function zonesDe(assertion = {}) {
  const dites = Array.isArray(assertion?.payload?.zones) && assertion.payload.zones.length
    ? assertion.payload.zones
    : (Array.isArray(assertion?.zones) ? assertion.zones : []);
  return [...new Set(dites.map(texte).filter(Boolean))];
}

/** Un écart dont personne n'a écrit le motif. Un refus de revue en porte un. */
function sansRaison(ecart) {
  return !texte(ecart?.pourquoi);
}

/**
 * Le lot des raisons qui manquent, le sujet qu'on regardait en tête.
 *
 * **La ligne d'où l'on vient passe devant.** C'est celle qui a fait naître la
 * question ; la noyer au milieu de quatre autres ferait chercher, dans une
 * fenêtre qu'on vient d'ouvrir, ce sur quoi on avait cliqué.
 *
 * @param {object[]} assertions la mémoire du projet
 * @param {object} [options]
 * @param {string} [options.depuis] la clé du sujet d'où le clic est parti
 * @returns {{cle: string, sujet: string, question: string, motif: string,
 *   retenu: string, domaine: string, zones: string[], ecarts: object[]}[]}
 */
export function lotDesRaisonsManquantes(assertions = [], { depuis = "" } = {}) {
  const lignes = Array.isArray(assertions) ? assertions : [];
  const parSujet = ecartsObservesParSujet(lignes);

  // Les versements de chaque sujet, et sa décision s'il en a une. C'est le
  // versement qui **fait foi** qui portera le nom, la portée, le domaine et la
  // valeur retenue de la décision à venir — le premier venu serait le plus
  // souvent celui qu'on vient justement d'écarter, et la décision citerait la
  // valeur périmée. Le juge est `versementQuiVaut`, et il n'y en a qu'un
  // (règle 10).
  const candidats = new Map();
  const decisions = new Map();
  for (const assertion of lignes) {
    if (texte(assertion?.superseded_by)) continue;
    const { cle } = faceDe(assertion);
    if (!cle) continue;
    if (assertion?.payload?.decision) decisions.set(cle, assertion);
    else {
      if (!candidats.has(cle)) candidats.set(cle, []);
      candidats.get(cle).push(assertion);
    }
  }

  const lot = [];

  for (const [cle, ecarts] of parSujet.entries()) {
    const manquantes = ecarts.filter(sansRaison);
    if (!manquantes.length) continue;

    const decision = decisions.get(cle) ?? null;
    // **Une décision qui dit déjà ce qu'elle a écarté ne se redemande pas.**
    // Quelqu'un a écrit ce qui était sur la table ; y ajouter un constat de
    // machine ferait lire le second à la place du premier.
    if ((decision?.payload?.decision?.ecartes ?? []).some((un) => texte(un?.quoi))) continue;

    // Tous les versements d'un même sujet partagent sa portée — elle est dans
    // la clé —, donc n'importe lequel la dit.
    const siens = candidats.get(cle) ?? [];
    const porteur = versementQuiVaut(siens, zonesDe(siens[0] ?? {})[0] ?? "")
      // Une décision peut ne poser aucune valeur : « on ne fera pas de
      // sous-sol » est une décision entière. Elle se porte alors elle-même.
      ?? decision;
    if (!porteur) continue;

    const nom = texte(porteur?.payload?.subject) || texte(porteur?.subject_key);
    if (!nom) continue;

    lot.push({
      cle,
      sujet: nom,
      // La question de la décision quand il y en a une, le nom du sujet sinon —
      // c'est déjà ce que la fenêtre de fermeture pré-remplit, et inventer une
      // seconde façon de la trouver ferait deux questions pour un sujet.
      question: texte(decision?.payload?.decision?.question) || nom,
      motif: texte(decision?.payload?.decision?.motif),
      retenu: valeurDuVersement(porteur),
      domaine: texte(porteur?.domain) || texte(porteur?.payload?.domain),
      zones: zonesDe(porteur),
      ecarts: manquantes
    });
  }

  const voulue = texte(depuis);
  return lot
    .sort((gauche, droite) =>
      (droite.cle === voulue ? 1 : 0) - (gauche.cle === voulue ? 1 : 0))
    .slice(0, LOT_MAX);
}

/**
 * Ce qu'on propose quand des raisons ont été données.
 *
 * Une décision par sujet, qui **complète** ce qui existait : elle reprend la
 * question et le motif de la décision d'avant, et lui ajoute les possibles
 * écartés qu'on vient de nommer. Une décision versée sur la même clé prend la
 * place de la précédente — c'est la mécanique de la mémoire, et c'est
 * exactement ce qu'on veut : la décision muette cesse de l'être.
 *
 * **La valeur ne se repose pas** (`poseLaValeur: false`). Elle est déjà en
 * mémoire ; la reverser ferait un doublon dans le fichier et une ligne de plus
 * dans son histoire, pour rien.
 *
 * @param {object[]} lot ce que `lotDesRaisonsManquantes` a rendu
 * @param {Map<string, string>|object} reponses identifiant d'écart → clé de raison
 * @param {object} [signature] `par`, `quand`, `atelier`
 * @returns {object[]} des affirmations prêtes à proposer, vide si rien n'a été dit
 */
export function decisionsDesRaisonsDonnees(lot = [], reponses = new Map(), {
  par = "", quand = "", atelier = ""
} = {}) {
  const lue = (id) => texte(
    typeof reponses?.get === "function" ? reponses.get(id) : reponses?.[id]
  );

  const affirmations = [];

  for (const sujet of Array.isArray(lot) ? lot : []) {
    // **Seuls les écartés dont on a dit la raison entrent.** Verser les autres
    // ferait signer « ardoise, sans raison connue » alors que personne ne s'est
    // prononcé : la trace est constatée, et elle le reste.
    const ecartes = (sujet?.ecarts ?? [])
      .map((ecart) => ({ quoi: texte(ecart?.quoi), raison: lue(ecart?.id) }))
      // Un écarté sans valeur ne peut pas arriver ici — `ecartsObserves` les a
      // déjà écartés, et `ecarteRetenu` les refuserait ensuite. Une garde de
      // plus ici serait une troisième décision sur la même question (règle 4).
      .filter((ecarte) => RAISONS_DITES[ecarte.raison]);

    if (!ecartes.length) continue;

    affirmations.push(...decisionVersable({
      sujet: sujet.sujet,
      retenu: sujet.retenu,
      question: sujet.question,
      ecartes,
      motif: sujet.motif,
      par,
      quand,
      domaine: sujet.domaine,
      zones: sujet.zones,
      atelier,
      poseLaValeur: false
    }));
  }

  return affirmations;
}

/** Le titre de la proposition. Il dit ce qu'on signe, pas d'où l'on vient. */
export function titreDuLot(affirmations = []) {
  const combien = (Array.isArray(affirmations) ? affirmations : []).length;
  return combien > 1
    ? `Pourquoi ces possibles ont été écartés — ${combien} décisions`
    : "Pourquoi ce possible a été écarté";
}

/** Ce que la proposition explique d'elle-même à qui la relira dans six mois. */
export const INTRO_DU_LOT =
  "Mdall avait constaté ces écartés dans la mémoire — une valeur remplacée, un document "
  + "arrivé après coup, une ligne sortie du projet. Le constat disait comment on l'avait vu ; "
  + "il ne disait pas pourquoi. Quelqu'un vient de le dire, et chaque décision porte désormais "
  + "ce qui était sur la table.";
