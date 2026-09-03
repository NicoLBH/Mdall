/**
 * Le corpus « Incendie — Habitation », et ce qu'on en montre.
 *
 * ## Ce qui descend dans le navigateur, et ce qui n'y descend pas
 *
 * L'écran reçoit : le **graphe** — quels modules existent, ce que chacun
 * produit, qui dépend de qui, quel article — ; les **questions qu'il reste à
 * poser**, une vague à la fois ; et, pour chaque module conclu, **sa valeur,
 * son article et la phrase du texte qui a décidé**. C'est ce qu'il faut pour
 * défendre un résultat en réunion.
 *
 * Ce qui reste ici : les **branches non prises**. La table entière des
 * conditions, l'ordre exact des règles, les seuils de celles qui n'ont pas
 * mordu. C'est là qu'est le travail de dépouillement du texte, et il ne sort
 * pas de la fonction.
 *
 * ## Pourquoi les questions elles-mêmes viennent du serveur
 *
 * Un catalogue de questions livré en bloc dirait déjà quels paramètres comptent
 * et dans quel ordre ils s'enchaînent — c'est-à-dire une bonne part du
 * raisonnement. L'écran ne sait donc pas quoi demander : il demande au moteur,
 * qui répond par ce qui manque **à cet instant**, pour ce cas-là.
 */

import { raisonner, grapheDu, faitsDemandes } from "./moteur.js";
import { MODULES_CLASSEMENT } from "./modules-classement.js";
import { MODULES_STRUCTURES } from "./modules-structures.js";
import { MODULES_DEGAGEMENTS } from "./modules-degagements.js";
import { MODULES_CONDUITS } from "./modules-conduits.js";
import { QUESTIONS, questionDe } from "./questions.js";

export const CORPUS = [...MODULES_CLASSEMENT, ...MODULES_STRUCTURES, ...MODULES_DEGAGEMENTS, ...MODULES_CONDUITS];

export const VERSION = "Incendie_Habitation_V1";

/**
 * Ce que le référentiel couvre à cette version, dit franchement.
 *
 * Un utilitaire qui laisse croire qu'il a tout lu est plus dangereux qu'un
 * utilitaire qui n'existe pas : on cesse de vérifier. La portée est donc
 * rendue avec chaque réponse, pas rangée dans une documentation.
 */
export const PORTEE = {
  couvert: [
    "Classement des bâtiments d'habitation (article 3, y compris le 5°) et le déclassement de 3ᵉ famille B)",
    "Champ d'application et limite IGH (article 1er)",
    "Voies-engins et voies-échelles (article 4)",
    "Structures et enveloppe : éléments porteurs verticaux, planchers, recoupement, parois, celliers, façades, couvertures (articles 5 à 15)",
    "Conduits et gaines : prescriptions générales, gaz, ventilation et vide-ordures (articles 44 à 64)",
    "Dégagements — escaliers, circulations horizontales et dégagements protégés (articles 17 à 43)"
  ],
  nonCouvert: [
    "Systèmes de façade des 3ᵉ et 4ᵉ familles (article 13) et isolation intérieure (article 16)",
    "Indice de propagation des couvertures (tableau de l'article 15)",
    "Chauffage, électricité, ascenseurs et moyens de secours (articles 65 à 99)",
    "Parcs de stationnement (articles 77 à 99), traités à part",
    "Bâtiments existants (titre VIII) et dispositions diverses (titres IX et X)"
  ]
};

/* ------------------------------------------------------------------ *
 * La consultation
 * ------------------------------------------------------------------ */

/** La part d'une source qu'on accepte de montrer : l'article, et la phrase citée. */
function sourceMontrable(source) {
  if (!source) return null;
  return {
    nature: source.nature ?? "reglement",
    texte: source.texte ?? null,
    article: source.article ?? null,
    paragraphe: source.paragraphe ?? null,
    citation: source.citation ?? null
  };
}

/**
 * Le raisonnement, mis en forme pour l'écran.
 *
 * @param {Record<string, unknown>} reponses ce qui a été répondu jusqu'ici
 */
export function consulter(reponses = {}) {
  const { faits, conclusions } = raisonner(CORPUS, reponses);

  const modules = conclusions.map((c) => ({
    id: c.module.id,
    titre: c.module.titre,
    repond: c.module.repond ?? null,
    produit: c.module.produit,
    article: c.module.source?.article ?? null,
    paragraphe: c.module.source?.paragraphe ?? null,
    statut: c.statut,
    valeur: c.valeur,
    mention: c.mention,
    sansObjet: c.sansObjet,
    // La branche empruntée, et elle seule. Les autres restent au serveur.
    pourquoi: c.regle ? sourceMontrable(c.regle.source) : null,
    // Quand plusieurs branches menaient au même endroit, on le dit : le lecteur
    // saurait sinon que des conditions n'ont pas été tranchées, sans savoir
    // pourquoi cela n'a pas empêché de conclure.
    convergent: c.convergent,
    sourcesConvergentes: c.convergent ? c.sources.map(sourceMontrable) : [],
    manque: c.manque
  }));

  // Ce qu'il reste à demander, par vagues, dans l'ordre où les modules en ont
  // besoin — la racine d'abord.
  //
  // Un module dont un amont n'a pas encore conclu ne pose pas ses questions :
  // demander la classe du système de façade avant de savoir de quelle famille
  // on parle donne l'impression de remplir un formulaire au hasard, et c'est
  // ainsi qu'on se fait abandonner en cours de route. La vague suivante
  // s'ouvrira d'elle-même quand l'amont aura conclu.
  const enAttente = new Set(modules.filter((m) => m.statut !== "conclu").map((m) => m.produit));
  const aDemander = [];
  for (const module of modules) {
    if (module.statut === "conclu") continue;
    if (module.manque.some((cle) => enAttente.has(cle))) continue;
    for (const cle of module.manque) {
      if (aDemander.some((q) => q.cle === cle)) continue;
      const question = questionDe(cle);
      if (question) aDemander.push({ ...question, pour: module.id, pourTitre: module.titre });
    }
  }

  const conclus = modules.filter((m) => m.statut === "conclu");
  return {
    version: VERSION,
    faits,
    modules,
    questions: aDemander,
    graphe: grapheDu(CORPUS),
    avancement: {
      modules: modules.length,
      conclus: conclus.length,
      enAttente: modules.length - conclus.length,
      questionsPosees: Object.keys(reponses).filter((c) => questionDe(c)).length,
      questionsSourceEnTout: grapheDu(CORPUS).questionsSource.length
    },
    portee: PORTEE
  };
}

/**
 * La réponse à une question précise : « quel est le degré coupe-feu des
 * planchers à respecter ? »
 *
 * C'est la porte du copilote. Elle rend la valeur, l'article, la phrase qui
 * décide, et — si le moteur n'a pas pu conclure — ce qui manque pour le faire.
 * Ne jamais rendre de valeur faute d'entrées est le comportement attendu :
 * « ne pas savoir n'autorise pas à prétendre qu'il n'y a rien ».
 */
export function demander(produit, reponses = {}) {
  const vue = consulter(reponses);
  const module = vue.modules.find((m) => m.produit === produit || m.id === produit);
  if (!module) {
    return { ok: false, raison: `Ce référentiel ne porte pas « ${produit} ».`, portee: PORTEE };
  }
  if (module.statut !== "conclu") {
    // Ce qui manque au module lui-même est souvent trompeur : il bute sur un
    // fait qu'un module amont n'a pas encore produit, et l'amont bute lui-même
    // sur une question. Répondre « il faut savoir s'il y a un sous-sol » quand
    // le vrai blocage est le nombre d'étages envoie chercher au mauvais endroit.
    // On rend donc les questions de la vague courante qui concernent ce module
    // et tout ce dont il dépend.
    const amont = sousGrapheDe(module.id, vue.graphe);
    const utiles = vue.questions.filter((q) => amont.has(q.pour));
    return {
      ok: false,
      raison: "Il manque des éléments pour se prononcer.",
      module: module.titre,
      manque: (utiles.length ? utiles : vue.questions).map((q) => questionDe(q.cle)).filter(Boolean),
      portee: PORTEE
    };
  }
  return {
    ok: true,
    version: VERSION,
    module: module.titre,
    repond: module.repond,
    valeur: module.valeur,
    mention: module.mention,
    sansObjet: module.sansObjet,
    pourquoi: module.pourquoi,
    // Le chemin complet : chaque module amont qui a servi, avec son article.
    chemin: cheminVers(module.id, vue),
    portee: PORTEE
  };
}

/** Ce module et tout ce dont il dépend, de proche en proche. */
export function sousGrapheDe(id, graphe) {
  const produitPar = new Map(graphe.noeuds.map((n) => [n.produit, n.id]));
  const vus = new Set();
  const descendre = (courant) => {
    if (vus.has(courant)) return;
    vus.add(courant);
    const noeud = graphe.noeuds.find((n) => n.id === courant);
    for (const fait of noeud?.demande ?? []) {
      const amont = produitPar.get(fait);
      if (amont) descendre(amont);
    }
  };
  descendre(id);
  return vus;
}

/** Les modules dont celui-ci dépend, de proche en proche, dans l'ordre du raisonnement. */
export function cheminVers(id, vue) {
  const parId = new Map(vue.modules.map((m) => [m.id, m]));
  const produitPar = new Map(vue.graphe.noeuds.map((n) => [n.produit, n.id]));
  const vus = new Set();
  const chemin = [];

  const descendre = (courant) => {
    if (vus.has(courant)) return;
    vus.add(courant);
    const noeud = vue.graphe.noeuds.find((n) => n.id === courant);
    for (const fait of noeud?.demande ?? []) {
      const amont = produitPar.get(fait);
      if (amont) descendre(amont);
    }
    const module = parId.get(courant);
    if (module && module.statut === "conclu") {
      chemin.push({ id: module.id, titre: module.titre, valeur: module.valeur,
        article: module.article, paragraphe: module.paragraphe, pourquoi: module.pourquoi });
    }
  };
  descendre(id);
  return chemin;
}

export { QUESTIONS, questionDe, faitsDemandes, grapheDu };
