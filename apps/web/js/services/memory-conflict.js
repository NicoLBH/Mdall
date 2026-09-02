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
/**
 * Cette lecture affirme-t-elle quelque chose ?
 *
 * `NO_NEWS` n'est pas un état de l'avis : c'est l'aveu qu'aucun document du lot
 * n'en parle. Le comparer à un état antérieur revenait à opposer un silence à
 * une parole, et l'écran demandait d'arbitrer entre les deux — vingt fois sur
 * un lot de deux fiches, sans qu'un seul document ait rien dit de nouveau.
 *
 * Un rapport d'étape ne rappelle que les avis qui bougent ; un avis absent
 * bascule donc en `NO_NEWS` d'un lot à l'autre et redevient `OPEN` au suivant,
 * au gré du corpus lu. **Ces bascules ne sont pas des contradictions** : ce sont
 * deux lectures du même silence.
 *
 * Un silence ne se tranche pas. Il ne contredit rien, et rien ne le contredit.
 */
/** Le nom d'un avis : son numéro quand il en a un, sa rubrique sinon. */
function avisTitle(payload = {}, item = {}) {
  const numero = String(payload.reference ?? "").trim();
  if (numero) return `Avis n° ${numero}`;
  const titre = String(payload.title ?? "").trim();
  return titre ? `Avis — ${titre}` : `Avis ${String(item.itemKey ?? "")}`;
}

function affirmeQuelqueChose(itemType, payload = {}) {
  if (itemType !== ITEM_TYPE.AVIS) return true;
  return String(payload?.status ?? "") !== "NO_NEWS";
}

export function findMemoryConflicts(items = [], decisions = []) {
  const memoire = new Map(decisions.map((row) => [`${row.item_type}|${row.item_key}`, row]));

  const conflicts = [];
  for (const item of items) {
    const passe = memoire.get(`${item.itemType}|${item.itemKey}`);
    if (!passe) continue;

    // Ni la lecture d'aujourd'hui ni la décision d'hier ne peuvent porter un
    // conflit si l'une des deux ne dit rien.
    if (!affirmeQuelqueChose(item.itemType, item.payload)) continue;
    if (!affirmeQuelqueChose(passe.item_type, passe.payload)) continue;

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
 * Ce qu'un conflit oppose, et de quoi le trancher.
 *
 * **Le système détecte une contradiction ; l'humain retient l'une ou l'autre
 * lecture.** Les deux boutons disaient « Je garde ce qui était retenu » et
 * « J'assume le changement » — des postures, pas des choix : on ne sait pas ce
 * qu'on garde, et « assumer » laisse entendre qu'on prend un risque alors qu'on
 * choisit une lecture. Chaque côté porte donc désormais son propre bouton, et
 * il dit la même chose des deux côtés : retenir **celle-ci**.
 *
 * **Et surtout : chaque côté porte son extrait.** Sans la phrase du rapport
 * d'où sort l'affirmation, on demandait d'arbitrer entre deux étiquettes —
 * « Ouvert · avis S » contre « Levé » — sans montrer sur quoi elles reposent.
 * Personne ne peut trancher là-dessus, et celui qui tranche quand même ne
 * décide pas : il devine. Ce qui manque se dit, plutôt que de laisser un blanc
 * qu'on prendrait pour l'absence de preuve.
 *
 * `keep` et `take` restent, pour la phrase qui rappelle ce qui a été tranché.
 *
 * @returns {{title: string, before: object, after: object, keep: string, take: string}}
 */

/**
 * L'extrait d'une lecture, tel qu'il a été conservé.
 *
 * ## Pourquoi cette fonction lit cinq noms différents
 *
 * Ce n'est pas de la tolérance décorative : l'extrait arrive sous quatre formes
 * selon d'où il vient, et n'en lire qu'une revenait à n'en lire aucune.
 *
 * - une **chaîne**, quand il vient d'un tableau ou d'une fiche d'avis ;
 * - `{ excerpt, source_id, page }` — la provenance d'une lecture du moteur ;
 * - `{ sentence, source_document_id, source_page }` — une levée déclarée ;
 * - `{ text, page }` — la forme qu'attendait la première version.
 *
 * On lisait `.text` et rien d'autre. Aucune des trois premières ne le porte :
 * le panneau d'arbitrage annonçait donc « aucun extrait conservé » y compris
 * quand l'extrait était là, sous un autre nom, et l'on tranchait à l'aveugle.
 */
function excerptOf(payload = {}) {
  const brut = payload?.evidence;
  if (typeof brut === "string") return brut.trim() || null;
  const texte = brut?.excerpt ?? brut?.sentence ?? brut?.text;
  return String(texte ?? "").trim() || null;
}

/**
 * D'où vient une lecture : son document, et la page où on peut la vérifier.
 *
 * Mêmes quatre formes, mêmes noms à reconnaître. Sans cela le lien « Voir dans
 * le document » ne s'affichait jamais — on montrait un extrait sans dire d'où
 * il sortait, ce qui n'est qu'une affirmation de plus.
 */
function sourceOf(payload = {}) {
  const evidence = typeof payload?.evidence === "object" && payload.evidence ? payload.evidence : null;
  const page = Number(payload?.page ?? evidence?.page ?? evidence?.source_page);
  const document_ = payload?.sourceId ?? evidence?.sourceId ?? evidence?.source_id ?? evidence?.source_document_id;

  return {
    documentId: String(document_ ?? "").trim() || null,
    page: Number.isFinite(page) && page > 0 ? page : null
  };
}

/**
 * Un côté de la contradiction, complété par le suivi des avis si besoin.
 *
 * La lecture retenue par le projet est figée en base au moment où elle a été
 * décidée. Celles décidées avant que l'extrait ne soit conservé n'en portent
 * donc pas, et corriger le producteur ne les répare pas rétroactivement.
 *
 * Le suivi des avis, lui, garde l'extrait pour chaque référence. On l'emprunte
 * — et on le **dit**, parce que ce n'est pas la même source : c'est ce que le
 * document porte, retrouvé après coup, pas ce qui a été inscrit le jour de la
 * décision.
 */
function side(heading, statement, payload, secours = null) {
  const direct = excerptOf(payload);
  if (direct) return { heading, statement, excerpt: direct, ...sourceOf(payload) };

  const repli = secours ? excerptOf(secours) : null;
  if (!repli) return { heading, statement, excerpt: null, ...sourceOf(payload) };

  return {
    heading, statement, excerpt: repli, retrouve: true,
    ...sourceOf({ ...sourceOf(payload), ...secours, evidence: secours.evidence })
  };
}

/**
 * L'avis du suivi qui porte la même référence, quand on l'a.
 *
 * `memoire` accepte une `Map` comme un objet : les appelants n'ont pas à
 * s'accorder sur une forme pour que le secours joue.
 */
function avisDuSuivi(memoire, reference) {
  const cle = String(reference ?? "").trim();
  if (!cle || !memoire) return null;
  if (typeof memoire.get === "function") return memoire.get(cle) ?? null;
  return memoire[cle] ?? null;
}

export function describeConflict(conflict = {}, { memoire = null } = {}) {
  const { kind, item = {}, beforePayload = {} } = conflict;
  const payload = item.payload ?? {};
  const secours = avisDuSuivi(memoire, payload.reference ?? beforePayload.reference ?? item.itemKey);

  if (item.itemType === ITEM_TYPE.AVIS) {
    const avant = `${statusLabel(beforePayload.status)}${
      beforePayload.opinion ? ` · avis ${beforePayload.opinion}` : ""
    }`;
    const apres = `${statusLabel(payload.status)}${payload.opinion ? ` · avis ${payload.opinion}` : ""}`;

    if (kind === CONFLICT.REFUSED_REAFFIRMED) {
      return {
        title: avisTitle(payload, item),
        before: side("Ce que vous aviez écarté", avant, beforePayload, secours),
        after: side("Ce que ce lot réaffirme", apres, payload, secours),
        keep: "le refus a été maintenu",
        take: "la lecture de ce lot a été retenue"
      };
    }

    return {
      title: avisTitle(payload, item),
      before: side("Ce que le projet retient", avant, beforePayload, secours),
      after: side("Ce que ce lot affirme", apres, payload, secours),
      keep: "la lecture précédente a été retenue",
      take: "la lecture de ce lot a été retenue"
    };
  }

  if (item.itemType === ITEM_TYPE.ATTACHMENT) {
    const ecarte = kind === CONFLICT.REFUSED_REAFFIRMED;

    return {
      title: `Affaire ${payload.label ?? item.itemKey}`,
      before: {
        heading: ecarte ? "Ce que vous aviez écarté" : "Ce que le projet retient",
        statement: ecarte
          ? `Cette affaire n'est pas celle du projet${conflict.reason ? ` : ${conflict.reason}` : ""}`
          : "Cette affaire est rattachée au projet",
        excerpt: excerptOf(beforePayload),
        ...sourceOf(beforePayload)
      },
      after: {
        heading: ecarte ? "Ce que ce lot réaffirme" : "Ce que ce lot affirme",
        statement: payload.reason ?? "L'analyse la remet en cause.",
        excerpt: excerptOf(payload),
        ...sourceOf(payload)
      },
      keep: ecarte ? "le refus a été maintenu" : "le rattachement a été conservé",
      take: ecarte ? "l'affaire a finalement été rattachée" : "la lecture de ce lot a été retenue"
    };
  }

  return {
    title: payload.name ?? String(item.itemKey ?? ""),
    before: {
      heading: "Ce que vous aviez écarté",
      statement: `Ce document avait été écarté${conflict.reason ? ` : ${conflict.reason}` : ""}`,
      excerpt: excerptOf(beforePayload),
      ...sourceOf(beforePayload)
    },
    after: {
      heading: "Ce que ce lot propose",
      statement: "Il est proposé à nouveau.",
      excerpt: excerptOf(payload),
      ...sourceOf(payload)
    },
    keep: "le refus a été maintenu",
    take: "le document a finalement été accepté"
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
    ? "Une contradiction avec la mémoire du projet doit être arbitrée avant de fusionner."
    : `${restants} contradictions avec la mémoire du projet doivent être arbitrées avant de fusionner.`;
}
