/**
 * Lever un blocage, et en garder la trace.
 *
 * ## Le mur
 *
 * Un contrôle **requis** qui n'est pas tenu retient la fusion. C'est juste, et
 * c'est incomplet : il n'existait aucun geste pour le lever. Une proposition
 * signée, relue, cochée ligne à ligne se heurtait à une phrase rouge et à un
 * bouton inerte — sans rien pour répondre. Un blocage qu'on ne sait pas lever
 * n'est pas une vérification, c'est un mur.
 *
 * ## Deux issues, selon ce que le contrôle met en cause
 *
 * **Quand il nomme des lignes qu'on peut trancher une à une** — les
 * contradictions avec la mémoire —, on répond ligne par ligne : **garder** ce
 * que le projet retenait, ou **prendre** ce que la proposition apporte. Deux
 * boutons d'ensemble font le même geste sur tout ce qui reste ; ils n'ouvrent
 * aucune voie de plus, ils épargnent vingt-neuf clics.
 *
 * Un « Écarter / Passer outre » global vivait à côté de ces deux-là et faisait
 * exactement la même chose sur les mêmes lignes. Deux vocabulaires pour un seul
 * geste : on ne savait plus lequel était lequel, et rien ne disait qu'ils se
 * recouvraient.
 *
 * **Quand il ne nomme rien à trancher** — une provenance qui manque, un
 * référentiel inconnu —, il n'y a pas de ligne à choisir : on écarte ce qu'il
 * met en cause, ou l'on **passe outre en disant pourquoi**. On a le droit de
 * fusionner sans tout savoir ; ce qu'on n'a plus le droit de faire, c'est de le
 * faire **sans le dire** — le motif est donc obligatoire, et il s'écrit dans la
 * proposition comme une ligne de plus.
 *
 * Pas de croix qui ferme, pas de « ignorer » qui ne laisse rien : c'est
 * précisément ce qui ferait qu'on ne saurait plus, six mois après, ce qui avait
 * été vérifié et ce qui avait été cru (`docs/fondamentaux.md`, règle 12).
 *
 * ## Et la séance se signe
 *
 * Trancher n'est pas fusionner. La série de choix se clôt par un
 * **procès-verbal** — « Marquer comme résolus » —, et c'est lui qui ouvre la
 * fusion. Sans cet acte, l'écran passait à « Prêt à fusionner » au clic qui
 * réglait la dernière ligne : on fusionnait sans avoir relu l'ensemble.
 *
 * ## Pourquoi un arbitrage est une ligne de proposition
 *
 * Parce que tout le reste l'est. Une ligne porte un auteur, une date, un motif ;
 * elle se gèle avec la proposition, entre au procès-verbal, se relit dans
 * l'export. Un drapeau posé ailleurs — dans le store, dans une colonne à part —
 * se serait perdu au premier rechargement, et n'aurait rien appris à personne.
 *
 * Sa clé est **l'identifiant du contrôle** : un contrôle, un arbitrage. Le
 * second remplace le premier plutôt que de s'ajouter, et l'on peut donc revenir
 * sur ce qu'on a écrit tant que la proposition est ouverte.
 *
 * ## Ce que ce module ne fait pas
 *
 * Il n'écrit rien et ne lit ni la base ni le store : des lignes entrent, des
 * décisions sortent. C'est l'écran qui les porte à `decidePropositionItems`,
 * par la même porte que toutes les autres décisions.
 */

import { TRANCHE, comptesDeLArbitrage, resteAArbitrer } from "./depot-controles.js";
import { ITEM_TYPE } from "./proposition-review.js";
import { ITEM } from "./proposition-state.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'on peut répondre à un contrôle qui retient la fusion. */
export const VERDICT = {
  /** Les lignes qu'il met en cause sortent de la proposition. */
  ECARTER: "ecarter",
  /** On fusionne en l'assumant, et l'on écrit pourquoi. */
  PASSER_OUTRE: "passer-outre"
};

/**
 * La longueur minimale d'un motif.
 *
 * **Pas pour faire écrire, pour empêcher de ne rien dire.** « ok », « oui »,
 * « rien » ne sont pas des motifs : ils passent la porte sans rien laisser, et
 * six mois plus tard on lit « passé outre — ok » sans savoir ce qu'on avait en
 * tête. Un seuil bas suffit à écarter le réflexe ; il n'empêchera jamais
 * quelqu'un de mal écrire, et ce n'est pas son rôle.
 */
export const MOTIF_MIN = 12;

/**
 * Ce motif peut-il être enregistré ?
 *
 * @returns {{ok: boolean, pourquoi: string}} — la phrase est écrite pour être
 *   montrée sous le champ, pas pour être lue dans un journal.
 */
export function motifRecevable(motif = "") {
  const dit = texte(motif);
  if (!dit) {
    return {
      ok: false,
      pourquoi: "Dites pourquoi vous passez outre : c'est ce qui distinguera, plus tard, "
        + "ce qui a été vérifié de ce qui a été assumé."
    };
  }

  if (dit.length < MOTIF_MIN) {
    return {
      ok: false,
      pourquoi: `Encore ${MOTIF_MIN - dit.length} caractère${MOTIF_MIN - dit.length > 1 ? "s" : ""} : `
        + "une phrase, pas un mot — celui qui relira ce projet ne vous aura pas au téléphone."
    };
  }

  return { ok: true, pourquoi: "" };
}

/**
 * Ce que la proposition a déjà assumé, par contrôle.
 *
 * **Un arbitrage refusé ne compte pas.** On peut revenir sur ce qu'on a assumé
 * tant que la proposition est ouverte : la ligne reste, avec son motif et sa
 * date, et c'est son statut qui dit si elle vaut encore. L'effacer ferait
 * disparaître une décision qui a eu lieu.
 *
 * @param {object[]} items les lignes de la proposition, telles que la base les rend
 * @returns {Map<string, {motif: string, quand: string|null, qui: string|null}>}
 */
export function arbitragesEnregistres(items = []) {
  const rendus = new Map();

  for (const item of Array.isArray(items) ? items : []) {
    const type = texte(item?.itemType ?? item?.item_type);
    if (type !== ITEM_TYPE.ARBITRAGE) continue;
    if (texte(item?.status) === ITEM.REFUSED) continue;

    const controle = texte(item?.itemKey ?? item?.item_key);
    const motif = texte(item?.payload?.motif);
    if (!controle || !motif) continue;

    rendus.set(controle, {
      motif,
      quand: item?.decided_at ?? item?.decidedAt ?? null,
      qui: item?.decided_by ?? item?.decidedBy ?? null
    });
  }

  return rendus;
}

/**
 * La décision à écrire pour passer outre un contrôle.
 *
 * Elle passe par la même porte que toutes les autres — `decidePropositionItems`
 * fait un `upsert` sur `(proposition, type, clé)` —, ce qui donne la reprise
 * pour rien : réécrire un motif remplace le précédent au lieu d'en empiler un
 * second.
 *
 * @returns {{item: object, status: string, reason: string}|null} `null` quand
 *   le motif ne tient pas : on ne fabrique pas une décision qu'on refuserait.
 */
export function arbitrageAEcrire({ controle = null, motif = "" } = {}) {
  const id = texte(controle?.id);
  if (!id || !motifRecevable(motif).ok) return null;

  return {
    item: {
      itemType: ITEM_TYPE.ARBITRAGE,
      itemKey: id,
      payload: {
        // Ce que le contrôle disait **au moment où on est passé outre**. Il se
        // recalculera autrement demain — un PDF finit par arriver —, et un
        // procès-verbal qui rejouerait le contrôle d'aujourd'hui décrirait une
        // décision que personne n'a prise.
        controle: texte(controle?.label),
        constat: [texte(controle?.phrase), texte(controle?.detail)].filter(Boolean).join(" "),
        concerne: (controle?.concerne ?? []).length,
        motif: texte(motif)
      }
    },
    status: ITEM.ACCEPTED,
    reason: texte(motif)
  };
}

/**
 * Ce qu'il faut trancher pour que « passer outre » lève vraiment le blocage.
 *
 * ## Un écran qui disait oui, un bouton qui disait non
 *
 * Écrire l'arbitrage suffisait à ce que le contrôle cesse de bloquer : la
 * pastille passait à « Prêt à fusionner ». Mais les contradictions qu'il mettait
 * en cause restaient au statut « proposé », et la fusion refusait ensuite **sans
 * un mot** — le bouton « Confirmer la fusion » paraissait cassé.
 *
 * Le motif n'était donc pas une décision : c'était une phrase à côté d'un état
 * inchangé.
 *
 * ## Assumer, c'est retenir
 *
 * Passer outre une contradiction avec la mémoire veut dire : je sais que cette
 * ligne contredit une décision passée, et je retiens quand même ce que cette
 * proposition apporte. Les lignes passent donc en **acceptées** — et le motif de
 * l'arbitrage dit pourquoi, une fois pour toutes.
 *
 * Les lignes déjà tranchées, dans un sens ou dans l'autre, ne sont pas
 * retouchées : quelqu'un s'est déjà prononcé sur elles.
 */
function decisionsEnBloc({ controle = null, items = [], tranche = TRANCHE.PRIS } = {}) {
  const enCause = new Set(
    (controle?.concerne ?? [])
      .filter((entree) => entree?.conflit)
      .map((entree) => `${texte(entree?.itemType)}|${texte(entree?.itemKey)}`)
  );
  if (enCause.size === 0) return [];

  const garde = tranche === TRANCHE.GARDE;

  return (Array.isArray(items) ? items : [])
    .filter((item) => {
      const cle = `${texte(item?.itemType ?? item?.item_type)}|${texte(item?.itemKey ?? item?.item_key)}`;
      // **Une ligne déjà tranchée ne se retouche pas.** Quelqu'un s'est
      // prononcé sur elle ; un geste d'ensemble n'a pas à revenir dessus.
      return enCause.has(cle) && texte(item?.status) === ITEM.PROPOSED;
    })
    .map((item) => ({
      item: garde
        ? {
            // Refuser est un `upsert` : écraser le payload à `null` perdrait ce
            // que la ligne disait.
            itemType: texte(item?.itemType ?? item?.item_type),
            itemKey: texte(item?.itemKey ?? item?.item_key),
            payload: item?.payload ?? null
          }
        : item,
      status: garde ? ITEM.REFUSED : ITEM.ACCEPTED,
      reason: garde ? "Ce que le projet retenait a été gardé." : null
    }));
}

/**
 * Tout prendre, c'est ce que « passer outre » fait des lignes en cause.
 *
 * **C'est le seul geste d'ensemble qui reste.** Deux boutons « Tout garder » /
 * « Tout prendre » vivaient à côté du choix ligne à ligne et faisaient
 * exactement la même chose sur les mêmes lignes : dans le même cadre, ils se
 * lisaient comme un second mécanisme. Ils sont partis. Passer outre, lui, n'est
 * pas un raccourci : c'est une décision motivée sur un contrôle entier.
 */
export function decisionsDuPasserOutre({ controle = null, items = [] } = {}) {
  return decisionsEnBloc({ controle, items, tranche: TRANCHE.PRIS });
}

/* ────────────────────────────────────────────────────────────────────────────
 * Un conflit se lit comme Git l'écrit
 *
 * ## Deux étiquettes ne suffisaient pas
 *
 * La ligne disait « Garder » et « Prendre » à côté d'un titre et d'une flèche.
 * Personne ne pouvait savoir ce qu'il gardait : les deux côtés tenaient sur une
 * ligne, l'un barré, l'autre pas, sans dire d'où ils sortaient.
 *
 * Git a résolu ce problème une fois pour toutes, et tout le monde sait le lire :
 * les deux versions **en entier**, l'une après l'autre, séparées par des
 * marqueurs, dans un fichier numéroté. On n'arbitre pas sur une étiquette, on
 * arbitre sur deux textes qu'on a sous les yeux.
 *
 * ## Ce que chaque côté porte
 *
 * Le côté proposé : ce que ce compte rendu affirme, et **la phrase du document**
 * quand elle a été conservée — c'est elle qui prouve, et sans elle on croit.
 * Le côté actuel : ce que le projet retenait, et le jour où il l'a décidé.
 *
 * ## Ce qui reste après le choix
 *
 * Les lignes qu'on ne retient pas disparaissent, marqueurs compris — exactement
 * ce qu'on fait dans un fichier en conflit. Ce qui reste à l'écran est ce qui
 * entrera, et rien d'autre.
 * ──────────────────────────────────────────────────────────────────────────── */

/** De quel côté d'un conflit une ligne se trouve. */
export const COTE = {
  /** Ce que ce compte rendu apporte. */
  PROPOSE: "propose",
  /** Ce que le projet retient aujourd'hui. */
  ACTUEL: "actuel",
  /** `<<<<<<<`, `=======`, `>>>>>>>`. */
  MARQUEUR: "marqueur"
};

/**
 * Les deux réponses, dites en toutes lettres.
 *
 * « Garder » et « Prendre » demandaient de deviner ce qu'on gardait et ce qu'on
 * prenait. Les verbes nomment donc leur objet, et ils vivent ici : trois écrans
 * qui les écriraient chacun de leur côté finiraient par ne plus dire la même
 * chose (règle 10).
 */
export const MOTS_DU_VERDICT = {
  [TRANCHE.PRIS]: "Accepter le changement",
  [TRANCHE.GARDE]: "Garder la version actuelle"
};

/**
 * Remettre un conflit en question.
 *
 * Ce n'est pas un troisième verdict : c'est l'absence de verdict, retrouvée.
 * Sans elle, un clic de trop serait sans retour jusqu'à la signature — et la
 * séance qu'on signe est précisément celle qu'on a pu relire et corriger.
 */
export const REPRENDRE = "reprendre";

/** Ce qu'on relit une fois le choix fait. */
export const MOTS_DU_VERDICT_PASSE = {
  [TRANCHE.PRIS]: "Changement accepté",
  [TRANCHE.GARDE]: "Version actuelle gardée"
};

/**
 * Les lignes d'un conflit, telles qu'un fichier les porterait.
 *
 * @param {object} entree la ligne mise en cause, telle que le contrôle la rend
 * @param {{dater?: function}} options `dater` met une date en clair ; sans lui,
 *   la date s'écrit telle qu'elle est stockée plutôt que de disparaître.
 * @returns {{cote: string, texte: string}[]}
 */
export function lignesDuConflit(entree = {}, { dater = null } = {}) {
  const enClair = (valeur) => {
    const dit = texte(valeur);
    if (!dit) return "";
    const mis = typeof dater === "function" ? texte(dater(dit)) : "";
    return mis || dit;
  };

  const nature = texte(entree?.nature) || texte(entree?.itemType);
  const nom = texte(entree?.sujet) || texte(entree?.itemKey);

  const propose = [texte(entree?.apres)].filter(Boolean);
  // La phrase du document, telle qu'elle a été lue. C'est la matière de la
  // décision : sans elle on arbitre entre deux résumés.
  const extrait = texte(entree?.extrait);
  if (extrait) propose.push(`« ${extrait} »`);

  const actuel = [texte(entree?.avant)].filter(Boolean);
  const quand = enClair(entree?.quand);
  if (quand) actuel.push(`Décidé le ${quand}`);

  // Un côté vide se dit plutôt que de laisser un blanc : ne pas savoir n'est
  // pas la même chose que ne rien avoir à dire (règle 5).
  if (propose.length === 0) propose.push("Ce compte rendu le propose à nouveau.");
  if (actuel.length === 0) actuel.push("Le projet n'en disait rien d'autre.");

  return [
    { cote: COTE.MARQUEUR, texte: `<<<<<<< ${[nature, nom].filter(Boolean).join(" — ")}` },
    ...propose.map((ligne) => ({ cote: COTE.PROPOSE, texte: ligne })),
    { cote: COTE.MARQUEUR, texte: "=======" },
    ...actuel.map((ligne) => ({ cote: COTE.ACTUEL, texte: ligne })),
    { cote: COTE.MARQUEUR, texte: ">>>>>>> version actuelle du projet" }
  ];
}

/**
 * Ce qui reste d'un conflit une fois tranché.
 *
 * Les marqueurs s'en vont avec le côté écarté : ce qui reste à l'écran est ce
 * qui entrera. Tant que rien n'est tranché, tout est là — c'est en lisant les
 * deux qu'on décide.
 */
export function lignesRetenues(lignes = [], tranche = null) {
  const toutes = Array.isArray(lignes) ? lignes : [];
  if (!tranche) return toutes;

  const garde = tranche === TRANCHE.GARDE ? COTE.ACTUEL : COTE.PROPOSE;
  return toutes.filter((ligne) => ligne?.cote === garde);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Le procès-verbal : signer la série de choix
 *
 * ## Trancher et fusionner sont deux gestes
 *
 * On passait outre un contrôle, la dernière ligne basculait, et l'écran
 * annonçait « Prêt à fusionner » sans que personne ait rien arrêté. La fusion
 * se jouait donc sur le clic qui suivait la dernière décision — au moment exact
 * où l'on n'a pas encore relu l'ensemble.
 *
 * Le procès-verbal clôt la série : on garde, on prend, on relit, **puis** on
 * signe. La fusion vient après, et c'est une autre décision — qu'on peut très
 * bien ne pas prendre.
 *
 * ## Pourquoi il s'écrit plutôt que de se cocher
 *
 * Un drapeau d'écran se serait perdu au premier rechargement, et six mois plus
 * tard rien n'aurait dit qui avait arrêté quoi. C'est une ligne de proposition
 * comme les autres : auteur, date, et le compte de ce qui a été gardé, pris,
 * assumé (règle 12).
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * La clé du procès-verbal.
 *
 * Fixe : il n'y en a qu'un par proposition, et le second remplace le premier.
 * Revenir sur une décision le fait retirer, pas empiler.
 */
export const CLE_DU_PROCES_VERBAL = "arbitrage";

/**
 * Le procès-verbal signé de cette proposition, s'il l'a été.
 *
 * Retiré, il reste en base — une signature qui a eu lieu ne s'efface pas — et
 * son statut dit qu'elle ne vaut plus.
 */
export function procesVerbalEnregistre(items = []) {
  for (const item of Array.isArray(items) ? items : []) {
    if (texte(item?.itemType ?? item?.item_type) !== ITEM_TYPE.PROCES_VERBAL) continue;
    if (texte(item?.itemKey ?? item?.item_key) !== CLE_DU_PROCES_VERBAL) continue;
    if (texte(item?.status) === ITEM.REFUSED) continue;

    return {
      quand: item?.decided_at ?? item?.decidedAt ?? null,
      qui: item?.decided_by ?? item?.decidedBy ?? null,
      gardees: Number(item?.payload?.gardees) || 0,
      prises: Number(item?.payload?.prises) || 0,
      assumes: Number(item?.payload?.assumes) || 0
    };
  }

  return null;
}

/**
 * Ce que la signature enregistre : le compte de ce qui a été tranché.
 *
 * **Pas l'état d'aujourd'hui : ce qui a été arrêté ce jour-là.** Le rejouer à la
 * relecture décrirait un arbitrage que personne n'a pris — c'est la même raison
 * qui fait qu'un passer-outre garde le constat du contrôle au moment où il a
 * été signé.
 *
 * @returns {{item: object, status: string, reason: string}|null} `null` tant
 *   qu'il reste quelque chose à trancher : on ne signe pas un procès-verbal
 *   d'une séance qui n'est pas finie.
 */
export function procesVerbalAEcrire({ arbitrages = [] } = {}) {
  const lignes = Array.isArray(arbitrages) ? arbitrages : [];
  if (lignes.length === 0) return null;
  if (lignes.some((ligne) => resteAArbitrer(ligne) > 0)) return null;

  // Les mêmes comptes que ceux qui disent, à la relecture, si cette signature
  // vaut encore. Les recompter ici autrement les ferait diverger (règle 4).
  const { gardees, prises, assumes } = comptesDeLArbitrage(lignes);

  return {
    item: {
      itemType: ITEM_TYPE.PROCES_VERBAL,
      itemKey: CLE_DU_PROCES_VERBAL,
      payload: {
        gardees,
        prises,
        assumes,
        // Sur quoi la séance a porté. Le contrôle peut se repasser autrement
        // demain ; ce qui a été arrêté, non.
        controles: lignes.map((ligne) => texte(ligne?.label)).filter(Boolean)
      }
    },
    status: ITEM.ACCEPTED,
    reason: phraseDuProcesVerbal({ gardees, prises, assumes })
  };
}

/** La décision qui retire la signature : la ligne reste, elle ne vaut plus. */
export function procesVerbalARetirer() {
  return {
    item: { itemType: ITEM_TYPE.PROCES_VERBAL, itemKey: CLE_DU_PROCES_VERBAL, payload: null },
    status: ITEM.REFUSED,
    reason: "Le procès-verbal a été rouvert."
  };
}

/** Ce qu'un procès-verbal dit, en une phrase — celle qu'on relira. */
export function phraseDuProcesVerbal({ gardees = 0, prises = 0, assumes = 0 } = {}) {
  const morceaux = [];
  if (gardees > 0) morceaux.push(`${gardees} gardée${gardees > 1 ? "s" : ""}`);
  if (prises > 0) morceaux.push(`${prises} prise${prises > 1 ? "s" : ""}`);
  if (assumes > 0) morceaux.push(`${assumes} assumé${assumes > 1 ? "s" : ""}`);

  return morceaux.length === 0 ? "Rien ne retenait la fusion." : `Arbitrage : ${morceaux.join(", ")}.`;
}

/** La décision qui annule un arbitrage : la ligne reste, elle ne vaut plus. */
export function arbitrageARetirer({ controle = null } = {}) {
  const id = texte(controle?.id);
  if (!id) return null;

  return {
    item: { itemType: ITEM_TYPE.ARBITRAGE, itemKey: id, payload: null },
    status: ITEM.REFUSED,
    reason: "L'arbitrage a été retiré."
  };
}

/**
 * Les décisions à écrire pour écarter ce qu'un contrôle met en cause.
 *
 * Les lignes sont retrouvées **dans la proposition**, par leur nature et leur
 * clé : le contrôle ne rend qu'une désignation, et refuser une ligne demande de
 * porter son `payload` — c'est un `upsert`, et l'écraser à `null` perdrait ce
 * qu'elle disait.
 */
export function refusDesLignesMisesEnCause({ controle = null, items = [] } = {}) {
  const cherches = new Set(
    (controle?.concerne ?? [])
      .map((ligne) => `${texte(ligne?.itemType)}|${texte(ligne?.itemKey)}`)
      .filter((cle) => cle !== "|")
  );
  if (cherches.size === 0) return [];

  return (Array.isArray(items) ? items : [])
    .filter((item) => {
      const cle = `${texte(item?.itemType ?? item?.item_type)}|${texte(item?.itemKey ?? item?.item_key)}`;
      return cherches.has(cle) && texte(item?.status) !== ITEM.REFUSED;
    })
    .map((item) => ({
      item: {
        itemType: texte(item?.itemType ?? item?.item_type),
        itemKey: texte(item?.itemKey ?? item?.item_key),
        payload: item?.payload ?? null
      },
      status: ITEM.REFUSED,
      reason: `Écartée pour lever : ${texte(controle?.label)}`
    }));
}

/**
 * Où en est la séance, en une phrase.
 *
 * **Le silence quand il n'y a rien à trancher.** Un bloc qui annonce « 0
 * arbitrage » à chaque proposition finit par ne plus être lu, et celui qui
 * compte se perd avec lui.
 *
 * Trois états, et ils ne se confondent pas : il reste des décisions à prendre ·
 * tout est tranché mais rien n'est signé · le procès-verbal est signé. Le
 * deuxième était dit comme le troisième — « la fusion est possible » — alors
 * qu'elle ne l'était pas encore.
 */
export function phraseDesArbitrages({ arbitrages = [], restants = null, signe = false } = {}) {
  const tous = Array.isArray(arbitrages) ? arbitrages : [];
  if (tous.length === 0) return "";

  const reste = Number.isFinite(restants)
    ? restants
    : tous.reduce((compte, ligne) => compte + resteAArbitrer(ligne), 0);

  if (reste > 0) return `${reste} à trancher`;
  if (!signe) return "Tout est tranché — il reste à signer.";

  return "Procès-verbal signé — la fusion est possible.";
}
