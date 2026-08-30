/**
 * Quand un recalcul contredit une décision déjà prise.
 *
 * C'est le conflit le plus profond du système, et la raison d'être de Mdall :
 *
 * > « On a le droit de faire évoluer le projet même si ça contredit des
 * > décisions passées, mais grâce à Mdall on ne peut plus le faire par
 * > ignorance : on en est informé, on décide et on assume. »
 *
 * Tout le reste de l'architecture existe pour rendre ce moment possible.
 * L'analyse est refaite à chaque ouverture, parce qu'elle est dérivée ; les
 * réponses humaines, elles, ne se recalculent jamais. **C'est cette asymétrie
 * qui permet la confrontation** : sans réponses conservées, un recalcul
 * n'écraserait rien, il remplacerait tout, en silence.
 *
 * Deux formes de contradiction, et une seule règle pour les deux :
 *
 *  1. **Un refus réaffirmé.** Quelqu'un a écarté une affirmation, et l'analyse
 *     la reformule à l'identique. Il ne s'est rien passé de nouveau : c'est la
 *     machine qui insiste.
 *  2. **Une acceptation contredite.** Quelqu'un a retenu que l'avis 234 était
 *     levé ; l'analyse dit maintenant qu'il est ouvert. Le corpus a peut-être
 *     changé — et c'est justement pour cela qu'il faut le dire.
 *
 * La règle : **le silence ne vaut plus acceptation.** Ailleurs dans la revue,
 * ne rien dire d'une affirmation qu'on a sous les yeux, c'est ne pas s'y
 * opposer, et la fusion l'accepte. Ici non : une affirmation qui contredit une
 * décision assumée bloque la fusion tant que personne n'a tranché. C'est le
 * seul endroit du système où l'on refuse d'avancer sans réponse, et c'est
 * exactement l'endroit où il le faut.
 *
 * Ne font mémoire que les décisions **fusionnées**. Une réponse donnée dans une
 * proposition encore ouverte est une intention, pas un engagement : la
 * confronter reviendrait à opposer à quelqu'un ce qu'il n'a pas fini de dire.
 */

import { ITEM } from "./proposition-state.js";
import { ITEM_TYPE, STATUS_LABELS } from "./proposition-review.js";

/** Les deux formes de contradiction. */
export const CONFLICT = {
  /** On avait écarté cette affirmation, elle revient identique. */
  REFUSED_REAFFIRMED: "refused_reaffirmed",
  /** On avait retenu autre chose que ce que l'analyse dit maintenant. */
  ACCEPTED_CONTRADICTED: "accepted_contradicted"
};

function statusLabel(status) {
  return STATUS_LABELS[String(status ?? "")] ?? String(status ?? "");
}

/**
 * Ce qu'une affirmation affirme, réduit à ce qui peut se contredire.
 *
 * Ni le rang dans le lot, ni le nom du fichier, ni la façon dont le diff
 * qualifie le mouvement — « added », « changed » décrivent la comparaison, pas
 * le fait. Deux lectures d'un même avis dans le même état doivent produire la
 * même chaîne, sans quoi tout recalcul passerait pour une contradiction.
 */
export function affirmationOf(item = {}) {
  const payload = item.payload ?? {};

  if (item.itemType === ITEM_TYPE.AVIS) {
    return `${payload.status ?? ""}|${payload.opinion ?? ""}`;
  }

  if (item.itemType === ITEM_TYPE.ATTACHMENT) {
    // L'affaire est déjà dans la clé ; ce qui s'affirme, c'est qu'elle est
    // étrangère au projet.
    return String(payload.verdict ?? "");
  }

  // Un document affirme qu'il entre au corpus, et rien d'autre. Redéposé, il
  // porte un nouvel identifiant : ce n'est plus la mémoire qui le rattrape,
  // c'est la détection de doublon, qui travaille sur le contenu.
  return "";
}

/**
 * Les contradictions entre ce que l'analyse affirme et ce qui a été assumé.
 *
 * @param {object[]} items les affirmations de la proposition en cours
 * @param {object[]} decisions les décisions fusionnées du projet, telles que la
 *   base les rend : `item_type`, `item_key`, `payload`, `status`, `decided_at`
 * @returns {object[]} un conflit par affirmation contredite, dans l'ordre des
 *   affirmations — l'écran n'a pas à réordonner ce qu'il montre.
 */
export function findMemoryConflicts(items = [], decisions = []) {
  const memoire = new Map(decisions.map((row) => [`${row.item_type}|${row.item_key}`, row]));

  const conflicts = [];
  for (const item of items) {
    const passe = memoire.get(`${item.itemType}|${item.itemKey}`);
    if (!passe) continue;

    const maintenant = affirmationOf(item);
    const avant = affirmationOf({ itemType: passe.item_type, payload: passe.payload ?? {} });

    if (passe.status === ITEM.REFUSED) {
      // Un refus ne se périme pas de lui-même : tant que l'analyse reformule la
      // même chose, c'est la même question qu'on repose.
      conflicts.push({
        kind: CONFLICT.REFUSED_REAFFIRMED,
        item,
        decidedAt: passe.decided_at ?? null,
        reason: passe.reason ?? null,
        before: avant,
        after: maintenant,
        beforePayload: passe.payload ?? {}
      });
      continue;
    }

    if (passe.status === ITEM.ACCEPTED && avant !== maintenant) {
      conflicts.push({
        kind: CONFLICT.ACCEPTED_CONTRADICTED,
        item,
        decidedAt: passe.decided_at ?? null,
        reason: passe.reason ?? null,
        before: avant,
        after: maintenant,
        beforePayload: passe.payload ?? {}
      });
    }
  }

  return conflicts;
}

/**
 * Les contradictions auxquelles personne n'a encore répondu.
 *
 * Une affirmation restée « proposée » n'a pas été tranchée. Ailleurs cela
 * vaudrait acceptation ; ici, cela bloque.
 */
export function unresolvedConflicts(conflicts = []) {
  return conflicts.filter((conflict) => conflict.item?.status === ITEM.PROPOSED);
}

/**
 * Ce qu'un conflit dit, et ce que les deux réponses feraient.
 *
 * Les deux boutons nomment leur conséquence, pas leur mécanisme : « je
 * maintiens » et « j'assume » sont des positions, « accepter » et « refuser »
 * seraient des cases à cocher de plus.
 *
 * @returns {{title: string, memory: string, now: string, keep: string, take: string}}
 */
export function describeConflict(conflict = {}) {
  const { kind, item = {}, beforePayload = {} } = conflict;
  const payload = item.payload ?? {};

  if (item.itemType === ITEM_TYPE.AVIS) {
    const avant = `${statusLabel(beforePayload.status)}${
      beforePayload.opinion ? ` · avis ${beforePayload.opinion}` : ""
    }`;
    const apres = `${statusLabel(payload.status)}${payload.opinion ? ` · avis ${payload.opinion}` : ""}`;

    if (kind === CONFLICT.REFUSED_REAFFIRMED) {
      return {
        title: `Avis n° ${payload.reference ?? item.itemKey}`,
        memory: `Vous aviez écarté cette lecture : ${avant}`,
        now: `L'analyse l'affirme à nouveau : ${apres}`,
        keep: "Je maintiens mon refus",
        take: "Je l'accepte finalement"
      };
    }

    return {
      title: `Avis n° ${payload.reference ?? item.itemKey}`,
      memory: `Vous aviez retenu : ${avant}`,
      now: `L'analyse dit maintenant : ${apres}`,
      keep: "Je garde ce qui était retenu",
      take: "J'assume le changement"
    };
  }

  if (item.itemType === ITEM_TYPE.ATTACHMENT) {
    return {
      title: `Affaire ${payload.label ?? item.itemKey}`,
      memory:
        kind === CONFLICT.REFUSED_REAFFIRMED
          ? `Vous aviez écarté cette affaire du projet${conflict.reason ? ` : ${conflict.reason}` : ""}`
          : `Vous aviez rattaché cette affaire au projet`,
      now: payload.reason ?? "L'analyse la remet en cause.",
      keep: kind === CONFLICT.REFUSED_REAFFIRMED ? "Je maintiens : ce n'est pas ce projet" : "Je garde le rattachement",
      take: kind === CONFLICT.REFUSED_REAFFIRMED ? "Je la rattache finalement" : "J'assume le changement"
    };
  }

  return {
    title: payload.name ?? String(item.itemKey ?? ""),
    memory: `Vous aviez écarté ce document${conflict.reason ? ` : ${conflict.reason}` : ""}`,
    now: "Il est proposé à nouveau.",
    keep: "Je maintiens mon refus",
    take: "Je l'accepte finalement"
  };
}

/**
 * Ce qui empêche de fusionner, dit en une phrase.
 *
 * Elle nomme le nombre plutôt que de dire « des conflits » : celui qui lit doit
 * savoir combien de fois il va devoir se prononcer avant d'en avoir fini.
 */
export function describeBlocking(conflicts = []) {
  const restants = unresolvedConflicts(conflicts).length;
  if (restants === 0) return "";

  return restants === 1
    ? "Une contradiction avec la mémoire du projet doit être tranchée avant de fusionner."
    : `${restants} contradictions avec la mémoire du projet doivent être tranchées avant de fusionner.`;
}
