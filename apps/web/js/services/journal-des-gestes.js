/**
 * Le journal des gestes : ce qui est arrivé, dans l'ordre, écrit au moment où
 * c'est arrivé.
 *
 * ## Pourquoi il existe
 *
 * Cinq tours ont été dépensés sur des boutons muets, chacun avec une théorie
 * neuve et aucune mesure. La sixième observation a tout renversé, et elle
 * venait de l'utilisateur, pas du code :
 *
 *     je clique « Fermés » → rien
 *     je vais sur un autre onglet, je reviens → la liste des fermés s'affiche
 *
 * Ce qui veut dire que **le clic arrive et que l'état est écrit**. Les cinq
 * théories précédentes portaient toutes sur l'écoute, et toutes étaient
 * hors sujet : ce qui manque, c'est le rendu qui devrait suivre.
 *
 * On ne le trouvera pas en relisant le code une sixième fois. Il faut la suite
 * réelle des événements — geste reçu, état écrit, rendu entré, branche prise,
 * lignes écrites, rendu sorti — et savoir lequel de ces maillons n'arrive
 * jamais. C'est exactement ce que ce journal écrit, dans la console, où il se
 * copie d'un geste.
 *
 * ## Ce qu'il ne porte pas
 *
 * Aucun titre de sujet, aucun nom de personne, aucun contenu. Il ne porte que
 * des noms de gestes, des nombres et des identifiants tronqués : il est fait
 * pour être collé dans un message, et un journal qui emporte le contenu d'un
 * chantier au passage est un journal qu'on ne peut pas envoyer.
 *
 * ## Il s'en ira
 *
 * Ce journal est là pour un défaut précis. Quand il sera compris, il partira —
 * ou il restera réduit à ce qui mérite d'être vu tous les jours. Le laisser
 * tel quel serait du bruit permanent sur la console de tout le monde.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Assez pour la suite d'un geste, pas assez pour emporter une phrase. */
const ASSEZ_LONG = 120;

/** De quoi tenir plusieurs gestes de suite sans jamais grandir sans fin. */
const CE_QU_ON_GARDE = 240;

const ENTREES = [];

/** Le préfixe qui rend le journal repérable dans une console pleine. */
export const MARQUE = "[mdall]";

/**
 * Un fait, réduit à ce qui se dit.
 *
 * Les chaînes sont tronquées, les objets ramenés à leurs clés simples. Rien de
 * ce qui passe ici ne doit pouvoir emporter un titre ou un nom.
 */
export function faitLisible(valeur) {
  if (valeur === null || valeur === undefined) return "—";
  if (typeof valeur === "number" || typeof valeur === "boolean") return String(valeur);
  if (Array.isArray(valeur)) return valeur.map(faitLisible).join(", ").slice(0, ASSEZ_LONG);
  if (typeof valeur === "object") {
    return Object.entries(valeur)
      .map(([cle, valeurDeLaCle]) => `${cle}=${faitLisible(valeurDeLaCle)}`)
      .join(" · ")
      .slice(0, ASSEZ_LONG);
  }
  return texte(valeur).slice(0, ASSEZ_LONG);
}

/**
 * Une ligne du journal, en texte.
 *
 * Le temps est **relatif au premier fait** : ce qu'on cherche à lire est
 * l'écart entre le geste et ce qui aurait dû le suivre, pas l'heure qu'il
 * était.
 */
export function ligneDuJournal(entree = {}, { depuis = 0 } = {}) {
  const ms = Math.max(0, Number(entree.quand || 0) - Number(depuis || 0));
  const faits = entree.faits && Object.keys(entree.faits).length ? ` · ${faitLisible(entree.faits)}` : "";
  return `+${String(ms).padStart(5, " ")} ms  ${texte(entree.quoi) || "?"}${faits}`;
}

/**
 * Noter un fait, et le dire tout de suite.
 *
 * La console d'abord : un fait gardé pour plus tard ne sert à rien si le rendu
 * qui suit fait tomber la page.
 *
 * @param {string} quoi le nom du fait, court et stable
 * @param {object} [faits] des nombres, des états, jamais du contenu
 */
export function noter(quoi, faits = {}) {
  const entree = { quand: Date.now(), quoi: texte(quoi), faits: faits && typeof faits === "object" ? faits : {} };

  ENTREES.push(entree);
  if (ENTREES.length > CE_QU_ON_GARDE) ENTREES.splice(0, ENTREES.length - CE_QU_ON_GARDE);

  try {
    // eslint-disable-next-line no-console
    console.info(MARQUE, entree.quoi, entree.faits);
  } catch {
    // Une console absente n'est pas une raison de faire tomber un écran.
  }

  return entree;
}

/**
 * Noter ce qui a échoué, sans laisser l'échec se perdre.
 *
 * Une exception dans un écouteur ne fait rien tomber : elle s'écrit dans la
 * console et la page continue, l'air de rien. C'est ainsi qu'un rendu qui ne
 * s'est jamais produit peut passer pour un bouton sans écoute.
 */
export function noterLEchec(quoi, erreur) {
  return noter(quoi, {
    echec: texte(erreur?.name) || "Error",
    dit: texte(erreur?.message).slice(0, ASSEZ_LONG) || "sans message"
  });
}

/** Ce que le journal a retenu. */
export function journal() {
  return ENTREES.map((entree) => ({ ...entree }));
}

/** Le journal en texte, prêt à coller dans un message. */
export function journalEnTexte() {
  if (!ENTREES.length) return "journal des gestes : vide.";
  const depuis = Number(ENTREES[0]?.quand || 0);
  return ["journal des gestes :", ...ENTREES.map((entree) => `  ${ligneDuJournal(entree, { depuis })}`)].join("\n");
}

/** Pour les tests, et pour repartir d'une page propre. */
export function oublierLeJournal() {
  ENTREES.length = 0;
}
