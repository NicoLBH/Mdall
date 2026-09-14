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
 * ## Deux issues, jamais trois
 *
 * **Écarter les lignes concernées.** Le contrôle met en cause des lignes
 * précises ; on les refuse, et il passe sur ce qui reste. Rien de neuf à
 * inventer : refuser une ligne est le geste ordinaire de cet écran, et le refus
 * est déjà une décision datée et signée.
 *
 * **Passer outre, en disant pourquoi.** On a le droit de fusionner sans tout
 * savoir : un chantier n'attend pas qu'un rapport arrive pour avancer. Ce qu'on
 * n'a plus le droit de faire, c'est de le faire **sans le dire** — le motif est
 * donc obligatoire, et il s'écrit dans la proposition comme une ligne de plus.
 *
 * Il n'y a pas de troisième issue. Pas de croix qui ferme, pas de « ignorer »
 * qui ne laisse rien : c'est précisément ce qui ferait qu'on ne saurait plus,
 * six mois après, ce qui avait été vérifié et ce qui avait été cru
 * (`docs/fondamentaux.md`, règle 12).
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
 * Ce qu'il faut dire des arbitrages, en une phrase.
 *
 * **Le silence quand il n'y a rien à trancher.** Un bloc qui annonce « 0
 * arbitrage » à chaque proposition finit par ne plus être lu, et celui qui
 * compte se perd avec lui.
 */
export function phraseDesArbitrages(arbitrages = []) {
  const tous = Array.isArray(arbitrages) ? arbitrages : [];
  if (tous.length === 0) return "";

  const restants = tous.filter((ligne) => !ligne.arbitre).length;
  if (restants === 0) {
    return tous.length === 1
      ? "Arbitré — la fusion est possible, et ce qui a été assumé est écrit."
      : `${tous.length} arbitrés — la fusion est possible, et ce qui a été assumé est écrit.`;
  }

  return `${restants} à arbitrer`;
}
