/**
 * De la matière d'Atelier à une proposition.
 *
 * ## Ce que ce fichier est, et ce qu'il n'est pas
 *
 * Il **prépare**. Il n'écrit rien dans la mémoire du projet, et aucun chemin
 * d'ici n'y mène — voir `docs/fondamentaux.md`, règle 1. Il assemble ce qu'un
 * utilitaire a produit en une proposition **ouverte**, que quelqu'un relira,
 * confrontera à ce que le projet a déjà décidé, et signera. Ou pas.
 *
 * C'est cette étape qui donne à la mémoire ce qu'une écriture directe lui
 * enlèverait : une histoire, un signataire, des conflits arbitrés avant l'entrée
 * plutôt que découverts après, et — le jour où on le construira — un retour en
 * arrière qui défait un acte au lieu d'effacer une ligne.
 *
 * ## La forme d'un item
 *
 * `item_type` est un texte libre en base ; on y met la **provenance** de
 * l'affirmation, comme les autres chemins de la mémoire : `base-datum`. La
 * nature réelle — contrainte, donnée de base — voyage dans le `payload`, et
 * c'est elle qui prime à la lecture (`classifyAssertion`).
 *
 * `item_key` est l'identité métier : le sujet, jamais la valeur. C'est ce qui
 * fait qu'une valeur nouvelle **remplace** l'ancienne au lieu de coexister avec
 * elle. La portée en fait partie — le degré du bâtiment A ne périme pas celui
 * du bâtiment B.
 */

import { normalizeSubjectKey } from "./project-memory.js";
import { normalizeZoneKey } from "./project-zones.js";
import { BASE_DATUM_KIND } from "./assertion-taxonomy.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Une affirmation prête à être proposée.
 *
 * @typedef {object} AffirmationDAtelier
 * @property {string} sujet     « Degré coupe-feu des planchers »
 * @property {string} valeur    « CF 1/2 h »
 * @property {string} [nature]  contrainte, donnée de base…
 * @property {string} [domaine] incendie, structure…
 * @property {string} [source]  « arrêté du 31 janvier 1986 modifié »
 * @property {string} [article] « article 6, premier alinéa »
 * @property {string} [citation] la phrase du texte qui décide
 * @property {string} [reference] l'identifiant stable côté utilitaire
 * @property {string[]} [zones] la portée, vide pour l'ensemble
 */

/** La clé métier d'une affirmation, portée comprise. */
export function cleDAffirmation(affirmation) {
  const base = normalizeSubjectKey(affirmation?.sujet ?? "");
  const portees = [...new Set((affirmation?.zones ?? []).map(normalizeZoneKey).filter(Boolean))].sort();
  return portees.length ? `${base}@${portees.join("+")}` : base;
}

/**
 * Les items d'une proposition, à partir de ce que l'Atelier a produit.
 *
 * Une affirmation sans sujet ou sans valeur n'entre pas : elle n'affirmerait
 * rien, et une proposition qui porte des lignes vides ne se relit pas.
 */
export function itemsDeProposition(affirmations = []) {
  return (Array.isArray(affirmations) ? affirmations : [])
    .filter((affirmation) => texte(affirmation?.sujet) && texte(affirmation?.valeur))
    .map((affirmation) => {
      const portees = [...new Set((affirmation.zones ?? []).map(normalizeZoneKey).filter(Boolean))].sort();

      return {
        itemType: BASE_DATUM_KIND,
        itemKey: cleDAffirmation(affirmation),
        payload: {
          subject: texte(affirmation.sujet),
          value: texte(affirmation.valeur),
          // La nature et le domaine ne se devinent pas : c'est l'utilitaire qui
          // sait de quoi il parle, et il le dit.
          nature: texte(affirmation.nature) || null,
          domain: texte(affirmation.domaine) || null,
          zones: portees.length ? portees : null,
          // De quoi rouvrir le texte à la bonne ligne devant qui conteste.
          source: texte(affirmation.source) || null,
          article: texte(affirmation.article) || null,
          citation: texte(affirmation.citation) || null,
          reference: texte(affirmation.reference) || null,
          // D'où elle vient. Six mois plus tard, personne ne saura si une cote a
          // été dimensionnée à la main ou proposée par un calcul.
          atelier: texte(affirmation.atelier) || null
        }
      };
    });
}

/**
 * Le corps d'une proposition, écrit pour être relu.
 *
 * Une proposition dont la description dit « 12 affirmations » demande d'ouvrir
 * chaque ligne pour savoir de quoi il s'agit. Celle-ci les liste, avec leur
 * article : c'est ce qu'on lit avant de signer.
 */
export function descriptionDeLaProposition({ intro = "", affirmations = [], source = "" } = {}) {
  const lignes = [];
  if (texte(intro)) lignes.push(texte(intro), "");

  for (const affirmation of affirmations) {
    if (!texte(affirmation?.sujet) || !texte(affirmation?.valeur)) continue;
    const suite = [texte(affirmation.article), (affirmation.zones ?? []).join(", ")]
      .filter(Boolean).join(" · ");
    lignes.push(`- **${texte(affirmation.sujet)}** : ${texte(affirmation.valeur)}${suite ? ` — ${suite}` : ""}`);
  }

  if (texte(source)) lignes.push("", `_${texte(source)}_`);
  lignes.push("", "_Rien n'est encore entré dans la mémoire du projet : cette proposition attend d'être signée._");
  return lignes.join("\n");
}

/**
 * Ouvrir une proposition à partir d'un résultat d'Atelier.
 *
 * **Elle reste ouverte.** Rien ici ne la fusionne, et c'est le point de tout ce
 * fichier : le système prépare, l'humain signe.
 *
 * `affirmations` accepte aussi des **items déjà formés** — c'est ce que fait un
 * retrait, qui ne décrit pas une valeur mais un document à sortir du corpus.
 *
 * @returns {Promise<{ok: true, proposition: object, items: number}|{ok: false, raison: string}>}
 */
export async function preparerUneProposition({
  projectId = "",
  titre = "",
  intro = "",
  source = "",
  affirmations = [],
  // Une description écrite par l'appelant. Elle sert quand ce qu'il y a à dire
  // n'est pas une liste de valeurs — défaire une proposition raconte ce qu'on
  // remet, ce qu'on écarte et ce qu'on laisse.
  description = ""
} = {}) {
  const projet = texte(projectId);
  if (!projet) return { ok: false, raison: "Ce projet n'est pas relié à la base." };

  const items = Array.isArray(affirmations) && affirmations.length && affirmations[0]?.itemType
    ? affirmations
    : itemsDeProposition(affirmations);
  if (!items.length) return { ok: false, raison: "Il n'y a rien à proposer." };

  const { createProposition, soumettreDesItems } = await import("./propositions-supabase.js");

  const proposition = await createProposition({
    projectId: projet,
    title: texte(titre) || "Proposition depuis l'Atelier",
    description: texte(description) || descriptionDeLaProposition({ intro, affirmations, source })
  });
  if (!proposition?.id) return { ok: false, raison: "La proposition n'a pas pu être ouverte." };

  const soumis = await soumettreDesItems({ propositionId: proposition.id, projectId: projet, items });
  if (!soumis) {
    // La proposition existe et elle est vide : le dire vaut mieux que de laisser
    // croire qu'elle porte ce qu'on vient de préparer.
    return { ok: false, raison: "La proposition a été ouverte, mais ses lignes n'ont pas pu y être portées." };
  }

  return { ok: true, proposition, items: items.length };
}
