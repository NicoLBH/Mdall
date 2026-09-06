/**
 * Ce qu'on donne à lire au moteur.
 *
 * Le moteur (`depot-reperes.js`) ne sait rien des avis, des articles ni des
 * comptes rendus : il compare des repères. Ce fichier est la liste des matières
 * qu'on sait aujourd'hui transformer en repères — et **c'est le seul endroit à
 * toucher** pour en ajouter une.
 *
 * ## Ajouter un carburant
 *
 * Une entrée dans `CARBURANTS`, avec une fonction qui rend `{ avant, apres }`.
 * Rien d'autre : ni écran à écrire, ni cas à ajouter dans le rendu. C'est la
 * raison d'être de la séparation — un CCTP de trois cents pages, un compte
 * rendu de chantier, une notice de vente entrent par la même porte que le
 * rapport de bureau de contrôle.
 *
 * Ce qu'un nouveau carburant doit fournir, et c'est tout ce qui compte :
 *
 * - une **identité stable** par unité. Le numéro d'article, le rang du point à
 *   l'ordre du jour, la référence du lot. Sans elle, il n'y a pas de
 *   comparaison possible — seulement une juxtaposition, et il vaut mieux le
 *   dire que de fabriquer un écart entre deux choses qui ne se correspondent
 *   pas ;
 * - un **chemin**, qui devient sa place dans l'arborescence ;
 * - des **champs nommés**, qui sont ce qu'on relit quand quelque chose bouge.
 *
 * ## Ce qui n'a pas d'identité
 *
 * Un document qui entre au corpus n'a pas d'état antérieur : il n'existait pas.
 * Il apparaît donc en ajout, jamais en modification — et c'est exact. On ne
 * fabrique pas un « avant » pour faire joli.
 */

import { ETAT } from "./depot-reperes.js";
import { ITEM_TYPE, STATUS_LABELS } from "./proposition-review.js";
import { cheminDeRangement } from "./memoire-rangement.js";

const texte = (valeur) => String(valeur ?? "").trim();
const lisible = (valeur) => STATUS_LABELS[texte(valeur)] ?? texte(valeur);

/**
 * Les avis d'un rapport de bureau de contrôle.
 *
 * L'avis porte une référence — c'est son identité, et elle traverse les
 * rapports. Un avis « ajouté » n'a pas d'avant ; un avis « modifié » en a un,
 * que le lot a lu dans le suivi.
 */
export function reperesDAvis(items = []) {
  const avis = (Array.isArray(items) ? items : []).filter((item) => item?.itemType === ITEM_TYPE.AVIS);

  const avant = [];
  const apres = [];

  for (const item of avis) {
    const payload = item.payload ?? {};
    // Un avis est un constat : observé, à une date, par quelqu'un. Il suit la
    // même politique de rangement que le reste.
    const chemin = cheminDeRangement({ nature: "constat", domain: payload.domain });
    const titre = texte(payload.reference)
      ? `Avis ${texte(payload.reference)}${texte(payload.title) ? ` — ${texte(payload.title)}` : ""}`
      : texte(payload.title) || "Avis relevé sur une fiche";

    const commun = {
      id: `avis:${texte(item.itemKey)}`,
      famille: "avis",
      chemin,
      titre,
      provenance: {
        documentId: payload.sourceId ?? null,
        page: payload.page ?? null,
        extrait: typeof payload.evidence === "string" ? payload.evidence : payload.evidence?.text ?? null
      }
    };

    // Un avis « ajouté » n'avait pas d'état : ne pas lui en inventer un est ce
    // qui fait que le signe « + » veut dire quelque chose.
    if (texte(payload.change) === "changed") {
      avant.push({
        ...commun,
        champs: { "État": lisible(payload.previousStatus), "Appréciation": texte(payload.previousOpinion) }
      });
    }

    apres.push({
      ...commun,
      champs: { "État": lisible(payload.status), "Appréciation": texte(payload.opinion) }
    });
  }

  return { avant, apres };
}

/**
 * Les affirmations que la proposition porte.
 *
 * Elles arrivent déjà comparées — le tableau avant / après les a mises face à
 * face, et il connaît le point délicat : sur une proposition fusionnée,
 * « avant » n'est pas l'état d'aujourd'hui mais ce que l'écriture a remplacé.
 * Refaire ce calcul ici le ferait diverger de là-bas.
 */
export function reperesDAffirmations(tableau = null) {
  const lignes = tableau?.lignes ?? [];
  const avant = [];
  const apres = [];

  for (const ligne of lignes) {
    const commun = {
      id: `affirmation:${texte(ligne.cle)}`,
      famille: "affirmation",
      // Le rangement suit la **nature**, pas le domaine : les conclusions d'une
      // étude incendie atterrissaient dans « données de base » alors que ce
      // sont des contraintes. Voir `memoire-rangement.js`.
      chemin: cheminDeRangement({ nature: ligne.nature, domain: ligne.domaine }),
      titre: texte(ligne.sujet) || texte(ligne.cle),
      provenance: {
        source: texte(ligne.source) || null,
        article: texte(ligne.article) || null,
        zones: Array.isArray(ligne.zones) ? ligne.zones : [],
        deduitDe: ligne.deduitDe ?? null
      }
    };

    if (texte(ligne.avant)) avant.push({ ...commun, champs: { "Valeur": texte(ligne.avant) } });
    if (texte(ligne.apres)) apres.push({ ...commun, champs: { "Valeur": texte(ligne.apres) } });
  }

  return { avant, apres };
}

/**
 * Les livrables qui entrent au corpus.
 *
 * Un document n'a pas d'avant : il n'existait pas dans le projet. Il apparaît
 * donc toujours en ajout — et un document refusé, lui, en retrait.
 */
export function reperesDeDocuments(items = []) {
  const documents = (Array.isArray(items) ? items : [])
    .filter((item) => item?.itemType === ITEM_TYPE.DOCUMENT);

  const avant = [];
  const apres = [];

  for (const item of documents) {
    const payload = item.payload ?? {};
    const repere = {
      id: `document:${texte(item.itemKey)}`,
      famille: "document",
      chemin: cheminDeRangement({ nature: "intendance", domain: "" }),
      titre: texte(payload.name) || texte(item.itemKey) || "Document",
      champs: {
        "Nature": texte(payload.kindLabel) || "non reconnue",
        "Auteur": texte(payload.author),
        "Émis le": texte(payload.issuedAt)
      },
      provenance: { documentId: texte(item.itemKey) || null }
    };

    // Un livrable refusé sort au lieu d'entrer : le côté gauche le porte, et le
    // diff le lit comme un retrait.
    if (texte(item.status) === "refused") avant.push(repere);
    else apres.push(repere);
  }

  return { avant, apres };
}

/**
 * Les affaires rattachées au projet, ou écartées.
 *
 * Un rattachement est un verdict sur une affaire : il n'a pas d'histoire à
 * comparer, il s'ajoute. Le verdict lui-même est le champ qu'on relit.
 */
export function reperesDeRattachements(items = []) {
  const apres = (Array.isArray(items) ? items : [])
    .filter((item) => item?.itemType === ITEM_TYPE.ATTACHMENT)
    .map((item) => {
      const payload = item.payload ?? {};
      return {
        id: `rattachement:${texte(item.itemKey)}`,
        famille: "rattachement",
        chemin: cheminDeRangement({ nature: "intendance", domain: "" }),
        titre: texte(payload.label) || texte(item.itemKey) || "Affaire",
        champs: { "Verdict": texte(payload.verdict), "Raison": texte(payload.reason) },
        provenance: null
      };
    });

  return { avant: [], apres };
}

/**
 * Les matières qu'on sait lire aujourd'hui.
 *
 * L'ordre est celui de la lecture : ce que le projet retient d'abord — les
 * valeurs qu'il tiendra pour vraies —, puis les constats, puis l'intendance.
 */
export const CARBURANTS = [
  {
    famille: "affirmation",
    label: "Données de base",
    icone: "table",
    lire: (source) => reperesDAffirmations(source.avantApres)
  },
  {
    famille: "avis",
    label: "Avis",
    icone: "issue-opened",
    lire: (source) => reperesDAvis(source.items)
  },
  {
    famille: "document",
    label: "Documents",
    icone: "file",
    lire: (source) => reperesDeDocuments(source.items)
  },
  {
    famille: "rattachement",
    label: "Rattachements",
    icone: "stack",
    lire: (source) => reperesDeRattachements(source.items)
  }
];

/**
 * Tous les repères d'un dépôt, quels qu'en soient les carburants.
 *
 * @param {{items: object[], avantApres: object}} source
 * @returns {{avant: object[], apres: object[]}}
 */
export function reperesDuDepot(source = {}) {
  const avant = [];
  const apres = [];

  for (const carburant of CARBURANTS) {
    const lu = carburant.lire(source) ?? {};
    avant.push(...(lu.avant ?? []));
    apres.push(...(lu.apres ?? []));
  }

  return { avant, apres };
}

/** Ce qui a bougé, tous carburants confondus. */
export function aChange(ligne) {
  return ligne?.etat !== ETAT.INCHANGE;
}
