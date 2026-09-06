/**
 * Le contenu d'un fichier de mémoire, et qui l'a écrit.
 *
 * ## Deux lectures d'un même fichier
 *
 * GitHub pose la question qu'il fallait poser : « Code » ou « Blame ». Ce n'est
 * pas un réglage d'affichage, ce sont deux questions différentes.
 *
 * - **Code** — qu'est-ce que le projet tient pour vrai aujourd'hui ? On ne
 *   montre que ce qui vaut : ce qui a été remplacé n'est plus l'état, et le
 *   mêler ferait répondre « CF 1/2 h » et « CF 1 h » à la même question.
 * - **Blame** — qui a décidé cela, et quand ? Chaque ligne porte la proposition
 *   qui l'a versée, sa date et son signataire ; on clique, on arrive sur la
 *   proposition, on lit la discussion qui a mené là.
 *
 * La seconde est la raison d'être de cette mémoire. Une valeur sans son auteur
 * ni sa date n'est qu'un chiffre dans un tableur ; c'est la ligne de blâme qui
 * en fait une décision de projet.
 *
 * ## Ce qui n'apparaît pas dans le code, et pourquoi
 *
 * Une affirmation **remplacée** — elle a eu son heure, elle ne décrit plus
 * l'état. Elle reste lisible dans l'histoire de sa ligne, qui est l'endroit où
 * on la cherche : « depuis quand ne croit-on plus cela ? ».
 *
 * Une affirmation **écartée** — un refus est une information, mais ce n'est pas
 * une valeur du projet. Elle a sa section, à part, sous le code : la ranger avec
 * le reste ferait lire comme acquis ce que quelqu'un a refusé.
 */

import { cheminDeRangement } from "./memoire-rangement.js";
import { cheminDeFichier } from "./memoire-en-texte.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'une affirmation vaut aujourd'hui. */
const VAUT = { ASSUMED: "assumed", REJECTED: "rejected" };

/**
 * Les fichiers d'un projet, tels que sa mémoire les dessine.
 *
 * Rien n'est inventé : un fichier existe parce qu'une affirmation s'y range. Un
 * dossier vide ne s'affiche pas — un projet neuf n'a pas encore de contraintes,
 * et lui montrer douze dossiers vides lui ferait croire à une perte.
 *
 * @returns {{chemin: string[], fichier: string, lignes: object[], ecartees: object[]}[]}
 */
export function fichiersDeLaMemoire(assertions = []) {
  const parFichier = new Map();

  for (const assertion of Array.isArray(assertions) ? assertions : []) {
    // Ce qui a été remplacé n'est plus l'état. Il reste dans l'histoire de sa
    // ligne, qui est l'endroit où on le cherche.
    if (texte(assertion?.superseded_by)) continue;

    const chemin = cheminDeRangement({ nature: assertion?.nature, domain: assertion?.domain });
    const cle = chemin.join(" / ");
    if (!parFichier.has(cle)) {
      parFichier.set(cle, { chemin, fichier: cheminDeFichier(chemin), lignes: [], ecartees: [] });
    }

    const entree = parFichier.get(cle);
    if (texte(assertion?.status) === VAUT.REJECTED) entree.ecartees.push(assertion);
    else entree.lignes.push(assertion);
  }

  return [...parFichier.values()].map((fichier) => ({
    ...fichier,
    lignes: fichier.lignes.sort(parSujet),
    ecartees: fichier.ecartees.sort(parSujet)
  }));
}

/** L'ordre d'un fichier : par sujet, pour qu'on retrouve une ligne au même endroit. */
function parSujet(gauche, droite) {
  return texte(gauche?.subject_key).localeCompare(texte(droite?.subject_key), "fr", { numeric: true });
}

/**
 * Les dossiers, avec ce qu'ils contiennent.
 *
 * C'est l'écran racine de la Mémoire : ce que le projet a relevé, ce qui
 * s'impose, ce qu'il suppose. Un dossier sans fichier n'y figure pas.
 */
export function dossiersDeLaMemoire(assertions = []) {
  const dossiers = new Map();

  for (const fichier of fichiersDeLaMemoire(assertions)) {
    const nom = fichier.chemin[0];
    if (!dossiers.has(nom)) dossiers.set(nom, { nom, fichiers: [], lignes: 0 });
    const dossier = dossiers.get(nom);
    dossier.fichiers.push(fichier);
    dossier.lignes += fichier.lignes.length;
  }

  return [...dossiers.values()];
}

/**
 * Qui a écrit une ligne, et quand.
 *
 * La proposition, son numéro, sa date, son signataire. C'est ce sur quoi on
 * clique pour arriver à la discussion qui a mené là — et c'est la question à
 * laquelle cette mémoire existe pour répondre.
 *
 * Une affirmation sans proposition vient d'une déclaration à la main, dans
 * l'écran Mémoire. Elle le dit plutôt que d'afficher un numéro vide.
 */
export function blameDeLaLigne(assertion = {}, auteurs = new Map()) {
  const numero = Number(assertion?.proposition_number) || null;
  const quand = texte(assertion?.decided_at);

  return {
    propositionId: texte(assertion?.proposition_id) || null,
    numero,
    // « déclarée à la main » plutôt qu'un numéro absent : une ligne sans
    // proposition n'est pas une ligne sans origine, c'est une ligne dont
    // l'origine est quelqu'un.
    intitule: numero ? `#P${numero}` : "déclarée à la main",
    quand: quand || null,
    qui: texte(auteurs.get?.(texte(assertion?.decided_by))) || ""
  };
}

/**
 * Le dernier versement qui a touché un ensemble de lignes.
 *
 * ## Pourquoi il s'affiche en haut
 *
 * GitHub met en tête de chaque dossier le dernier commit : qui, quoi, quand.
 * C'est la question qu'on se pose en arrivant — « qu'est-ce qui a bougé ? » —
 * et y répondre avant qu'on la pose évite d'ouvrir trois fichiers pour le
 * découvrir.
 *
 * Le message est le **titre de la proposition**, pas une phrase fabriquée : ce
 * qu'on lit ici doit être exactement ce qu'on relira sur la proposition, sinon
 * on cherche deux fois.
 *
 * @param {object[]} lignes les affirmations d'un fichier, d'un dossier, ou de tout
 * @param {object} [contexte]
 * @param {Map} [contexte.auteurs] identifiant → nom
 * @param {Map} [contexte.propositions] identifiant → la proposition
 * @returns {object|null} `null` quand rien n'a de date
 */
export function dernierVersementDe(lignes = [], { auteurs = new Map(), propositions = new Map() } = {}) {
  let derniere = null;
  for (const ligne of Array.isArray(lignes) ? lignes : []) {
    const quand = Date.parse(texte(ligne?.decided_at));
    if (!Number.isFinite(quand)) continue;
    if (!derniere || quand > Date.parse(texte(derniere.decided_at))) derniere = ligne;
  }
  if (!derniere) return null;

  const blame = blameDeLaLigne(derniere, auteurs);
  const proposition = propositions.get?.(texte(derniere.proposition_id)) ?? null;

  return {
    ...blame,
    // Le titre de la proposition tient lieu de message. À défaut — une
    // déclaration à la main —, on dit le sujet qu'elle portait : c'est ce
    // qu'un message aurait dit.
    message: texte(proposition?.title) || texte(derniere?.statement) || texte(derniere?.subject_key)
  };
}

/**
 * Ce que la mémoire a reçu, en chiffres.
 *
 * Le nombre de **versements**, pas de lignes : une proposition qui verse trente
 * contraintes est un acte, pas trente. C'est l'acte qu'on compte, comme on
 * compte des commits.
 */
export function versementsDeLaMemoire(assertions = []) {
  const actes = new Set();
  let plusRecent = null;

  for (const assertion of Array.isArray(assertions) ? assertions : []) {
    // Une déclaration à la main est un acte aussi : elle a un auteur et une
    // date. Elle se compte par sa ligne, faute de proposition qui la porte.
    actes.add(texte(assertion?.proposition_id) || `main:${texte(assertion?.id)}`);
    const quand = Date.parse(texte(assertion?.decided_at));
    if (Number.isFinite(quand) && (plusRecent === null || quand > plusRecent)) plusRecent = quand;
  }

  return { versements: actes.size, plusRecent: plusRecent === null ? null : new Date(plusRecent).toISOString() };
}

/**
 * L'histoire d'une ligne : ce qu'elle a valu, de la plus récente à la première.
 *
 * On remonte par `supersedes`, qui est écrit dans les deux sens au moment du
 * remplacement. Une histoire qui se reconstruirait par la date confondrait deux
 * affirmations versées le même jour sur le même sujet.
 */
export function histoireDeLaLigne(assertions = [], depuis = null) {
  const parId = new Map((Array.isArray(assertions) ? assertions : []).map((row) => [texte(row?.id), row]));
  const histoire = [];

  let courante = depuis;
  const vues = new Set();
  while (courante && !vues.has(texte(courante.id))) {
    vues.add(texte(courante.id));
    histoire.push(courante);
    courante = parId.get(texte(courante.supersedes)) ?? null;
  }

  return histoire;
}

/**
 * L'âge d'une ligne, en parts.
 *
 * GitHub colore la marge par ancienneté : ce qui vient d'être écrit est vif, ce
 * qui n'a pas bougé depuis des mois s'efface. C'est une information gratuite et
 * elle se lit sans y penser — sur une mémoire de projet, elle dit « ceci a été
 * décidé la semaine dernière, ceci tient depuis le début ».
 *
 * @returns {number} de 0 (le plus ancien du fichier) à 4 (le plus récent)
 */
export function chaleurDeLaLigne(assertion, { plusAncien = 0, plusRecent = 0 } = {}) {
  const quand = Date.parse(texte(assertion?.decided_at));
  if (!Number.isFinite(quand) || plusRecent <= plusAncien) return 4;
  const part = (quand - plusAncien) / (plusRecent - plusAncien);
  return Math.max(0, Math.min(4, Math.round(part * 4)));
}

/** Les bornes de temps d'un fichier, pour en colorer la marge. */
export function bornesDuFichier(lignes = []) {
  const dates = (Array.isArray(lignes) ? lignes : [])
    .map((ligne) => Date.parse(texte(ligne?.decided_at)))
    .filter((date) => Number.isFinite(date));

  if (!dates.length) return { plusAncien: 0, plusRecent: 0 };
  return { plusAncien: Math.min(...dates), plusRecent: Math.max(...dates) };
}
