/**
 * Le plan de recalcul : dans quel ordre le raisonnement du projet se refait.
 *
 * ## Pourquoi des strates, et pas une liste
 *
 * Un projet porte quatre cents affirmations dérivées. La liste de leur ordre
 * d'exécution ne se lit pas : quatre cents lignes ne disent rien à personne. Le
 * même ordre rangé par **niveaux** — ce qui ne dépend que du socle, puis ce qui
 * dépend de cela — tient en huit lignes, et l'on comprend la forme du
 * raisonnement d'un coup d'œil : « la plus longue chaîne fait huit pas ».
 *
 * ## Il se dérive, il ne se stocke pas
 *
 * Ce qui est dérivé se recalcule tant qu'il sert à décider
 * (`docs/fondamentaux.md`, règle 4). Un ordre tenu à la main divergerait dès la
 * règle suivante, et l'on ne saurait plus si l'on regarde le raisonnement du
 * projet ou le souvenir qu'on en a gardé.
 *
 * Pour la même raison, il n'y a pas de septième extension : les fichiers sont ce
 * que les gens écrivent et lisent ; ceci est une vue.
 *
 * ## La frontière se compte
 *
 * Trois natures de nœud, et la troisième est de plein droit :
 *
 * - **socle** — aucune entrée. On le change ; il ne se recalcule pas.
 * - **rejouable** — une règle du projet, dont on a le code et les entrées.
 * - **opaque** — un utilitaire qui calcule au serveur, une extraction. On sait
 *   qu'il dépend ; on ne sait pas le refaire.
 *
 * Le compte des deux derniers est la mesure honnête de la promesse : « sur 460
 * nœuds dérivés, 380 sont rejouables, 80 ne le sont pas — les voici ».
 *
 * ## Les cycles se nomment, ils ne bloquent pas
 *
 * Un graphe écrit par des humains en contiendra un. Ce qui reste après le tri
 * topologique n'a pas de rang : c'est une composante qui se lit elle-même, et
 * elle se **montre** plutôt que de faire tourner un calcul en rond.
 *
 * Voir `docs/rejouer-la-memoire.md`, étape 4.
 */

import { cleDuSujet } from "./memoire-identifiants.js";
import { zonesLisibles } from "./memoire-blame.js";
import { normalizeZoneKey } from "./project-zones.js";
import { sujetDe } from "./memoire-raisonnement.js";
import { lecturesDeLaRegle, agentDeLaFonction } from "./memoire-applications.js";
import { estUneRegle } from "./assertion-taxonomy.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'un nœud du plan peut être. */
export const NOEUD = {
  /** Aucune entrée : on le change, il ne se recalcule pas. */
  SOCLE: "socle",
  /** Une règle du projet : elle se rejoue. */
  REJOUABLE: "rejouable",
  /** Un utilitaire, une extraction : on sait qu'il dépend, pas le refaire. */
  OPAQUE: "opaque"
};

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

/**
 * Ce qu'une affirmation est, du point de vue du rejeu.
 *
 * Une valeur produite par une règle est **rejouable** ; une contrainte déduite
 * par un utilitaire est **opaque** ; tout le reste est le **socle** — ce que le
 * projet pose, constate ou décide.
 */
export function natureDuNoeud(assertion, { produites = new Set() } = {}) {
  if (produites.has(texte(assertion?.id))) return NOEUD.REJOUABLE;
  if (texte(assertion?.payload?.utilitaire) || assertion?.payload?.derived === true) return NOEUD.OPAQUE;
  return NOEUD.SOCLE;
}

/**
 * Le plan d'une zone : les affirmations dérivées, rangées par distance au socle.
 *
 * @returns {{strates: object[][], socle: object[], opaques: object[], cycles: object[]}}
 */
function planDeLaZone(assertions, zone) {
  const ici = assertions.filter((assertion) => vautDans(assertion, zone));

  // Les règles qui servent ici, par le sujet qu'elles produisent. Une fonction
  // native en produit plusieurs, et se range donc sous chacun : c'est le seul
  // moyen que les cotes qu'elle pose se sachent dérivées.
  const regles = new Map();
  for (const assertion of ici) {
    if (!estUneRegle(assertion)) continue;
    const portees = porteesDe(assertion);
    if (portees.length ? !portees.includes(zone) : zone !== "") continue;
    for (const cle of sujetsProduits(assertion)) {
      if (cle && !regles.has(cle)) regles.set(cle, assertion);
    }
  }

  // Les valeurs, par sujet. Une seule par sujet dans une zone : la plus
  // précise — c'est la règle que suit déjà toute la lecture de la mémoire.
  const valeurs = new Map();
  for (const assertion of ici) {
    if (estUneRegle(assertion)) continue;
    const cle = cleDuSujet(sujetDe(assertion));
    if (!cle) continue;
    if (!valeurs.has(cle) || porteesDe(assertion).length) valeurs.set(cle, assertion);
  }

  // Ce que chaque valeur attend : les sujets que sa règle lit, quand elle en a
  // une. Une valeur sans règle est du socle — ou une déduction opaque.
  const attend = new Map();
  const produites = new Set();
  for (const [cle, regle] of regles) {
    const sortie = valeurs.get(cle);
    if (!sortie) continue;
    produites.add(texte(sortie.id));
    attend.set(texte(sortie.id), [...new Set(
      lecturesDeLaRegle(regle)
        .map((nom) => texte(valeurs.get(cleDuSujet(nom))?.id))
        .filter(Boolean)
        // Une fonction native lit un sujet qu'elle pose aussi — l'arase, par
        // exemple, entre et ressort. Se déclarer sa propre entrée ferait un
        // cycle d'un pas, et la strate ne se placerait jamais.
        .filter((entree) => entree !== texte(sortie.id))
    )]);
  }

  const socle = [];
  const opaques = [];
  const derivees = [];

  for (const assertion of valeurs.values()) {
    const nature = natureDuNoeud(assertion, { produites });
    if (nature === NOEUD.REJOUABLE) derivees.push(assertion);
    else if (nature === NOEUD.OPAQUE) opaques.push(assertion);
    else socle.push(assertion);
  }

  // Le tri : une affirmation entre dans une strate quand tout ce qu'elle attend
  // — parmi les dérivées — est déjà placé. Ce qui n'entre jamais se lit en rond.
  const placees = new Set();
  const strates = [];
  const aPlacer = new Map(derivees.map((assertion) => [texte(assertion.id), assertion]));

  while (aPlacer.size) {
    const strate = [];

    for (const [id, assertion] of aPlacer) {
      const requis = (attend.get(id) ?? []).filter((entree) => aPlacer.has(entree) && entree !== id);
      if (requis.every((entree) => placees.has(entree))) strate.push(assertion);
    }

    // Plus rien ne peut être placé : ce qui reste se lit lui-même.
    if (!strate.length) break;

    for (const assertion of strate) {
      placees.add(texte(assertion.id));
      aPlacer.delete(texte(assertion.id));
    }
    strates.push(strate);
  }

  return {
    strates,
    socle,
    opaques,
    // Une composante qui n'a pas de rang : elle ne se rejoue pas, elle se
    // montre. Un cycle est une erreur de modèle.
    cycles: [...aPlacer.values()]
  };
}

/**
 * Le plan de recalcul de toute la mémoire.
 *
 * Une zone à la fois : le classement du bâtiment A et celui du bâtiment B ne se
 * mélangent pas, et une règle appliquée à trois zones est trois exécutions. Les
 * strates rendues sont celles de chaque zone, alignées sur le même rang — la
 * strate 2 est partout « ce qui dépend de la strate 1 ».
 *
 * @param {object[]} assertions la mémoire du projet
 * @returns {{zones: object[], profondeur: number, derivees: number,
 *   rejouables: number, opaques: number, socle: number, cycles: object[]}}
 */
export function planDeRecalcul(assertions = []) {
  const toutes = (Array.isArray(assertions) ? assertions : []).filter(enVigueur);

  const portees = new Set([""]);
  for (const assertion of toutes) {
    if (!estUneRegle(assertion)) continue;
    for (const zone of porteesDe(assertion)) portees.add(zone);
  }

  const zones = [];
  const cycles = [];
  let profondeur = 0;
  let rejouables = 0;
  let opaques = 0;

  for (const zone of portees) {
    const plan = planDeLaZone(toutes, zone);
    // Une zone sans rien de dérivé n'a pas de plan : l'afficher vide ferait
    // croire à un raisonnement qu'elle ne porte pas.
    if (!plan.strates.length && !plan.opaques.length && !plan.cycles.length) continue;

    zones.push({ zone, ...plan });
    profondeur = Math.max(profondeur, plan.strates.length);
    rejouables += plan.strates.reduce((somme, strate) => somme + strate.length, 0);
    opaques += plan.opaques.length;
    if (plan.cycles.length) cycles.push({ zone, noeuds: plan.cycles });
  }

  return {
    zones,
    /** La plus longue chaîne, en pas. C'est ce qui se dit d'un projet. */
    profondeur,
    derivees: rejouables + opaques,
    rejouables,
    opaques,
    // Le socle ne se compte qu'une fois, sur la mémoire entière : une donnée qui
    // vaut partout apparaît dans chaque zone, et la compter par zone la
    // multiplierait.
    socle: new Set(
      toutes
        .filter((assertion) => !estUneRegle(assertion))
        .filter((assertion) => natureDuNoeud(assertion, { produites: sortiesDesRegles(toutes) }) === NOEUD.SOCLE)
        .map((assertion) => texte(assertion.id))
    ).size,
    cycles
  };
}

/** Les affirmations qu'une règle du projet produit, toutes zones confondues. */
/**
 * Les sujets qu'une fonction pose.
 *
 * Une règle en pose un — le sien : « Classement du bâtiment » conclut le
 * classement. Une **fonction native** en pose autant qu'elle en a écrit, et
 * aucun ne porte son nom : un calcul qui dimensionne vingt massifs rend cent
 * quarante cotes et s'appelle « Prédimensionnement des fondations ».
 *
 * Sans cette distinction, les cent quarante cotes passaient pour du socle — ce
 * que le projet pose lui-même — alors qu'elles sont ce qu'il a **dérivé**. Une
 * variante ne les aurait jamais marquées à refaire.
 */
export function sujetsProduits(regle = {}) {
  const native = agentDeLaFonction(regle);
  if (!native) return [cleDuSujet(sujetDe(regle))];

  return (Array.isArray(native.ecrit) ? native.ecrit : [])
    .map((sortie) => cleDuSujet(texte(sortie?.sujet)))
    .filter(Boolean);
}

/**
 * Les affirmations qu'une règle du projet produit, toutes zones confondues.
 *
 * Exportée parce que trois écrans en ont besoin pour la même raison — savoir ce
 * qui est **dérivé d'une règle** avant de dire sa nature —, et qu'une seconde
 * définition finirait par ranger un nœud dans deux natures selon l'écran.
 */
export function sortiesDesRegles(assertions) {
  const sujets = new Set(
    assertions.filter(estUneRegle).flatMap(sujetsProduits).filter(Boolean)
  );

  return new Set(
    assertions
      .filter((assertion) => !estUneRegle(assertion) && sujets.has(cleDuSujet(sujetDe(assertion))))
      .map((assertion) => texte(assertion.id))
  );
}

/**
 * L'ordre dans lequel rejouer, pour une zone.
 *
 * Rendu comme une liste de clés de sujet : c'est ce dont le rejeu a besoin, et
 * lui passer des affirmations l'obligerait à les redéfaire en sujets.
 */
export function ordreDeLaZone(assertions = [], zone = "") {
  const plan = planDeLaZone((Array.isArray(assertions) ? assertions : []).filter(enVigueur), zone);
  return plan.strates.flat().map((assertion) => cleDuSujet(sujetDe(assertion))).filter(Boolean);
}
