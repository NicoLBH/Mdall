/**
 * Le domicile d'un nom : le seul fichier où il se déclare.
 *
 * Voir `docs/fondamentaux.md`, règle 10 — *un nom vit à un seul endroit*. Ce
 * fichier en écrit les temps 2 et 3.
 *
 * ## Le défaut qu'on ferme
 *
 * Jusqu'ici le fichier d'une affirmation se déduisait de `{nature, domaine}`, et
 * le domaine était choisi par l'utilitaire qui verse. Deux utilitaires donnaient
 * donc deux domaines au même nom, et « Profondeur hors gel » atterrissait dans
 * `sol.ctr` **et** dans `structure.ctr` sans que personne l'ait voulu. Les deux
 * lignes vivaient, chacune avec ses héritiers, et rien ne disait qu'elles
 * parlaient de la même chose.
 *
 * ## Temps 2 — le registre fait autorité
 *
 * Le **premier versement** qui déclare un nom fixe son domicile. Tout versement
 * ultérieur du même nom écrit là, quel que soit le domaine qu'il s'était donné.
 * Un nom ne choisit plus son fichier à chaque écriture : il en a un, une fois
 * pour toutes.
 *
 * « Premier » se lit dans le temps — la date de versement —, et à date égale par
 * l'identifiant. Il faut que deux lecteurs, deux écrans, deux exports trouvent
 * le même premier : un ordre qui dépendrait de la façon dont les affirmations
 * arrivent ferait déménager les noms d'un rendu à l'autre.
 *
 * ## Temps 3 — verser ailleurs ouvre un conflit, jamais une seconde ligne
 *
 * Un versement qui visait un autre fichier n'y crée rien : il rejoint le
 * domicile, et le désaccord se **dit**. `versementsHorsDomicile` les nomme, un
 * par un, avec le fichier visé et le fichier réel. Ce qui est interdit, c'est le
 * silence — pas le désaccord, qui se règle comme les autres, devant quelqu'un.
 *
 * ## Ce que ce fichier ne fait pas
 *
 * Il ne stocke rien. Le registre se **déduit** des affirmations à chaque
 * lecture, comme `variables-du-projet.ref` se déduit des fichiers : un registre
 * versé serait une seconde vérité, et elle divergerait au premier versement
 * (règle 4).
 */

import { cheminDeRangement, extensionDeRangement } from "./memoire-rangement.js";
import { NATURE, classifyAssertion, estUneRegle } from "./assertion-taxonomy.js";
import { cheminDeFichier } from "./memoire-en-texte.js";
import { cleDuSujet } from "./memoire-identifiants.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Le rangement qu'une affirmation se donne à elle-même, sans registre. */
export function rangementVise(assertion = {}) {
  const referentiel = estUneRegle(assertion);
  const chemin = cheminDeRangement({
    nature: assertion?.nature, domain: assertion?.domain, referentiel
  });
  const extension = extensionDeRangement({ nature: assertion?.nature, referentiel });
  return { chemin, extension, fichier: cheminDeFichier(chemin, extension) };
}

/** Le nom que porte une affirmation, réduit à sa clé. */
export function nomDeLAffirmation(assertion = {}) {
  return cleDuSujet(texte(assertion?.payload?.subject) || texte(assertion?.subject_key));
}

/**
 * Ce qui compte comme **déclaration** d'un nom.
 *
 * Une règle n'en est pas une : elle produit la valeur, elle ne la porte pas.
 * Lui laisser fixer le domicile enverrait toutes les valeurs du projet dans les
 * `.ref`, c'est-à-dire dans le fichier qui explique plutôt que dans celui qui
 * garde. Une affirmation remplacée non plus : elle a eu son heure, et faire
 * dépendre le domicile d'une ligne qui ne vaut plus ferait déménager un nom le
 * jour où l'on corrige son ancienne valeur.
 */
function declareUnNom(assertion) {
  if (!assertion || neePorteLaValeur(assertion)) return false;
  if (texte(assertion?.superseded_by)) return false;
  return Boolean(nomDeLAffirmation(assertion));
}

/**
 * Vrai d'une ligne qui **produit** une valeur sans la porter.
 *
 * Une règle et une décision partagent le sujet de la valeur qu'elles fixent, et
 * ce n'est pas un accident : c'est ce qui permet de les relier par le nom. Mais
 * ni l'une ni l'autre n'est cette valeur — la laisser fixer le domicile du nom
 * emmènerait toutes ses valeurs dans le `.ref` ou le `.dec` de son domaine.
 */
function neePorteLaValeur(assertion) {
  return estUneRegle(assertion)
    || classifyAssertion(assertion).nature === NATURE.DECISION;
}

/**
 * L'ordre des versements : le plus ancien d'abord.
 *
 * À date égale — deux lignes du même versement — l'identifiant tranche. Il faut
 * un ordre **total** : sans lui, deux lectures des mêmes affirmations
 * pourraient élire deux premiers, et le nom changerait de fichier entre deux
 * rendus.
 */
function parAnciennete(gauche, droite) {
  const quand = (assertion) => {
    const dit = texte(assertion?.created_at) || texte(assertion?.inserted_at);
    const date = dit ? Date.parse(dit) : Number.NaN;
    return Number.isFinite(date) ? date : Number.POSITIVE_INFINITY;
  };

  return quand(gauche) - quand(droite)
    || texte(gauche?.id).localeCompare(texte(droite?.id), "en", { numeric: true });
}

/**
 * Le domicile de chaque nom du projet : `clé → {chemin, extension, fichier}`.
 *
 * @param {object[]} assertions toutes les affirmations du projet
 * @returns {Map<string, {chemin: string[], extension: string, fichier: string, depuis: string}>}
 */
export function domicilesDesNoms(assertions = []) {
  const domiciles = new Map();

  for (const assertion of (Array.isArray(assertions) ? assertions : []).filter(declareUnNom).sort(parAnciennete)) {
    const cle = nomDeLAffirmation(assertion);
    if (domiciles.has(cle)) continue;
    domiciles.set(cle, { ...rangementVise(assertion), depuis: texte(assertion?.id) });
  }

  return domiciles;
}

/**
 * Où une affirmation se range, registre consulté.
 *
 * Le domicile du nom quand il en a un ; à défaut ce qu'elle visait — c'est
 * alors elle qui vient de le fixer.
 *
 * Une règle garde son propre rangement : elle n'est pas la valeur, elle en
 * explique une, et elle vit dans le `.ref` de son domaine. Une décision de
 * même, dans son `.dec` — elle tranche la valeur, elle ne la porte pas.
 */
export function rangementDuVersement(assertion = {}, domiciles = null) {
  const vise = rangementVise(assertion);
  if (!(domiciles instanceof Map) || neePorteLaValeur(assertion)) return vise;

  const cle = nomDeLAffirmation(assertion);
  const chezLui = cle ? domiciles.get(cle) : null;
  return chezLui ? { chemin: chezLui.chemin, extension: chezLui.extension, fichier: chezLui.fichier } : vise;
}

/**
 * Les versements qui visaient un autre fichier que le domicile de leur nom.
 *
 * C'est le temps 3 : ils ne créent pas de seconde ligne, ils sont **dits**. Un
 * écran les affiche comme il affiche une contradiction — parce que c'en est
 * une, et que la trancher demande quelqu'un.
 *
 * @returns {{id: string, nom: string, vise: string, domicile: string}[]}
 */
export function versementsHorsDomicile(assertions = [], domiciles = null) {
  const registre = domiciles instanceof Map ? domiciles : domicilesDesNoms(assertions);
  const dits = new Map();

  for (const assertion of (Array.isArray(assertions) ? assertions : []).filter(declareUnNom)) {
    const cle = nomDeLAffirmation(assertion);
    const chezLui = registre.get(cle);
    const vise = rangementVise(assertion).fichier;
    if (!chezLui || chezLui.fichier === vise) continue;

    // Un nom par ligne de conflit, pas un versement : ce qui se règle, c'est
    // « où vit ce nom », et le répéter pour chaque valeur versée depuis
    // ferait lire trente conflits là où il y en a un.
    if (dits.has(cle)) continue;
    dits.set(cle, {
      id: texte(assertion?.id),
      nom: texte(assertion?.payload?.subject) || texte(assertion?.subject_key),
      vise,
      domicile: chezLui.fichier
    });
  }

  return [...dits.values()];
}


/**
 * Le fichier des noms que le projet partage. Il est à la racine, et unique.
 *
 * Ici plutôt que dans un écran : c'est une adresse de la mémoire, et deux
 * écrans qui la déclareraient chacun finiraient par renvoyer ailleurs.
 */
export const FICHIER_DES_VARIABLES = "variables-du-projet.ref";

/**
 * Où une variable est déclarée, pour un `importe`.
 *
 * À défaut, le dictionnaire : il les liste toutes, y compris celles que
 * personne n'a versées. Renvoyer vers lui n'est pas un pis-aller — c'est
 * exactement l'endroit où l'on verra qu'elle manque.
 */
export function fichierQuiDeclare(nom, domiciles) {
  const cle = cleDuSujet(nom);
  const chez = domiciles instanceof Map ? domiciles.get(cle) : null;
  // La carte peut porter le fichier lui-même — c'est ce que l'écran passe — ou
  // le domicile entier. Les deux disent la même chose.
  const dit = texte(typeof chez === "string" ? chez : chez?.fichier);
  return dit || FICHIER_DES_VARIABLES;
}

/**
 * Où une fonction range ce qu'elle conclut, quand la mémoire le sait.
 *
 * `""` quand elle ne le sait pas : la fonction conclut alors sans dire où, ce
 * qui est la vérité du moment. Deviner un fichier ferait lire « écrit dans
 * incendie.ctr » là où rien n'est écrit.
 */
export function fichierOuEcrire(sujet, domiciles) {
  const cle = cleDuSujet(sujet);
  const chez = domiciles instanceof Map ? domiciles.get(cle) : null;
  return texte(typeof chez === "string" ? chez : chez?.fichier);
}

/**
 * Une fonction qui appelle un agent, prête à s'écrire — où qu'on l'écrive.
 *
 * La mémoire et le **diff d'une proposition** doivent en donner le même texte.
 * Le diff avait le sien : il rendait `fonction Prédimensionnement…()`, sans
 * signature, sans appel et sans `enregistre`, là où le fichier montre la
 * fonction entière. Deux grammaires pour la même ligne, et c'est celle qu'on
 * ne relit pas qui a raison le jour où l'on cherche.
 *
 * @param {{sujet: string, quoi?: string, agent: object}} ligne
 * @param {Map} [domiciles] où vit chaque nom, quand on le sait
 */
export function fonctionAEcrire({ sujet = "", quoi = "", agent = null } = {}, domiciles = null) {
  if (!agent || !texte(sujet)) return null;

  return {
    nom: texte(sujet),
    quoi: texte(quoi),
    entrees: (agent.lit ?? []).map(texte).filter(Boolean)
      .map((nom) => ({ nom, depuis: fichierQuiDeclare(nom, domiciles) })),
    agent: texte(agent.genre),
    utilitaire: texte(agent.utilitaire),
    version: texte(agent.version),
    enregistre: (agent.ecrit ?? [])
      .map((sortie) => texte(sortie?.sujet))
      .filter(Boolean)
      .map((nom) => ({ sujet: nom, dans: fichierOuEcrire(nom, domiciles) }))
  };
}
