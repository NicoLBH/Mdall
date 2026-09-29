/**
 * Ce qu'est une décision, et ce qu'il faut en écrire.
 *
 * ## Ce qu'une décision n'est pas
 *
 * **Ce n'est pas une proposition fusionnée.** Une proposition est l'acte
 * d'enregistrement ; la décision a eu lieu avant, dans une réunion, et personne
 * ne l'a écrite. Confondre les deux revient à ne connaître que les décisions que
 * Mdall a lui-même provoquées — une fraction minuscule de celles qui font le
 * projet.
 *
 * **Ce n'est pas une valeur.** « Toiture en bac acier » est une valeur. Elle ne
 * devient une décision que si l'ardoise et la membrane étaient sur la table.
 *
 * ## Une ligne à part, et la valeur la cite
 *
 * On aurait pu marquer l'affirmation — « cette valeur a été choisie par un
 * humain ». La question et les écartés n'y tiennent pas : ce ne sont pas des
 * attributs d'une valeur, c'est le **contenu même** de la décision.
 *
 * La décision est donc sa propre ligne, et la valeur la cite — exactement comme
 * une règle et sa conclusion. Même forme, même lien, même écran de raisonnement.
 * On ne réinvente rien, on étend :
 *
 * | la règle | la décision |
 * | --- | --- |
 * | `referentiel: true` | `nature: "decision"` |
 * | `regle: { conditions, sinon, sauf }` | `decision: { question, ecartes, motif }` |
 * | clé préfixée `regle:` | clé préfixée `decision:` |
 * | range en `.ref` | range en `.dec` |
 * | la conclusion cite `provenance: règle` | la valeur cite `provenance: décision` |
 * | ne fixe pas le domicile du nom | ne fixe pas le domicile du nom |
 *
 * Le préfixe de clé n'est pas cosmétique : la décision porte **le même sujet**
 * que la valeur qu'elle fixe — c'est ce qui permet de les relier par le nom —,
 * et sans préfixe elles partageraient un `item_key`, donc verser l'une
 * supprimerait l'autre.
 *
 * ## Ce qu'une décision doit dire, et ce qu'on fait de ce qui manque
 *
 * Quatre parties, et l'une manque partout :
 *
 * 1. **une question** — ce sur quoi on a tranché. Sans elle il reste une
 *    valeur, et une valeur n'engage personne ;
 * 2. **les possibles écartés** — c'est ce qui distingue une décision de tout le
 *    reste, et c'est exactement ce que personne ne retrouve six mois plus tard.
 *    Le plus grand service que Mdall peut rendre est de garder ce qui a été
 *    écarté ;
 * 3. **un auteur et une date** — déjà là, pour tout ce que Mdall garde ;
 * 4. **un motif, ou l'aveu qu'il n'y en a pas.** Certaines décisions sont
 *    arbitraires : une couleur, une trame, un nom. Écrire « choix du maître
 *    d'œuvre, sans justification technique » est plus honnête, et plus utile,
 *    qu'une justification fabriquée après coup.
 *
 * **Ce qui manque se nomme, il ne se devine pas** (règle 5). Une décision sans
 * écartés notés n'est pas une décision sans écartés : c'est une décision dont on
 * n'a pas noté les écartés, et les deux ne se relisent pas pareil. `lacunes()`
 * dit lesquelles, et l'écran les montre au lieu de laisser croire à une
 * réponse complète.
 *
 * ## Ce qu'elle ne fait pas
 *
 * Elle n'écrit rien. Comme tout le reste, elle sort par une proposition qu'un
 * humain signe — règle 1, sans exception.
 */

import { NATURE } from "./assertion-taxonomy.js";
import { PROVENANCE, STATUT, RAISONS_DITES } from "./memoire-en-texte.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qui manque à une décision pour être relisible dans six mois. */
export const LACUNE = {
  ECARTES: "ecartes",
  MOTIF: "motif",
  AUTEUR: "auteur"
};

/** Ce qu'on affiche d'une lacune. Nommer le manque, jamais le combler. */
export const LACUNES_DITES = {
  [LACUNE.ECARTES]: "les possibles écartés n'ont pas été notés",
  [LACUNE.MOTIF]: "le motif n'a pas été écrit",
  [LACUNE.AUTEUR]: "on ne sait pas qui a tranché"
};

/**
 * Un possible écarté, et pourquoi.
 *
 * `pourquoi` peut manquer — on se rappelle souvent qu'on a écarté l'ardoise
 * sans se rappeler l'argument. L'écarté sans son motif vaut mieux que rien :
 * c'est déjà la moitié de la réponse à « pourquoi pas de l'ardoise ? ».
 *
 * **Une raison hors du domaine ne se garde pas.** Elle ne se compterait avec
 * rien, et la garder ferait croire à un classement qui n'en est pas un — on
 * croirait pouvoir additionner ce qui ne s'additionne pas (règle 5). Le texte
 * libre est là pour ce qui n'entre dans aucune case.
 */
function ecarteRetenu(ecarte) {
  const quoi = texte(ecarte?.quoi);
  if (!quoi) return null;
  const raison = texte(ecarte?.raison);
  return {
    quoi,
    pourquoi: texte(ecarte?.pourquoi),
    raison: RAISONS_DITES[raison] ? raison : ""
  };
}

/**
 * La charge d'une décision, ou `null` si ce n'en est pas une.
 *
 * Le pendant exact de `regleRetenue` : elle garde ce qui fait la décision, et
 * rien de ce qui se retrouve ailleurs. La valeur retenue n'y figure pas — elle
 * vit dans `payload.value`, comme le `alors` d'une règle.
 *
 * **Sans question, rien.** Une décision sans question est une valeur, et la
 * traiter comme une décision ferait entrer dans le `.dec` des lignes qui n'y
 * ont rien à faire.
 */
export function decisionRetenue(decision) {
  if (!decision || typeof decision !== "object") return null;

  const question = texte(decision.question);
  if (!question) return null;

  return {
    question,
    ecartes: (Array.isArray(decision.ecartes) ? decision.ecartes : []).map(ecarteRetenu).filter(Boolean),
    motif: texte(decision.motif)
  };
}

/**
 * Ce qu'une décision ne dit pas.
 *
 * Rendues dans l'ordre où elles comptent : les écartés d'abord, parce que c'est
 * pour eux que la ligne existe.
 *
 * @returns {string[]} des clés de `LACUNE`, vide quand la décision est complète
 */
export function lacunes(decision = null, { par = "" } = {}) {
  const dite = decisionRetenue(decision);
  if (!dite) return [];

  const manque = [];
  if (!dite.ecartes.length) manque.push(LACUNE.ECARTES);
  if (!dite.motif) manque.push(LACUNE.MOTIF);
  if (!texte(par)) manque.push(LACUNE.AUTEUR);
  return manque;
}

/** Les lacunes, en une phrase. Vide quand il n'y en a pas. */
export function phraseDesLacunes(manques = []) {
  const dits = (Array.isArray(manques) ? manques : [])
    .map((clef) => LACUNES_DITES[clef])
    .filter(Boolean);
  if (!dits.length) return "";

  return `Cette décision ne dit pas tout : ${dits.join(", ")}.`;
}

/**
 * Comment la valeur nomme la décision qui l'a fixée.
 *
 * Le pendant de ce qu'une conclusion écrit d'une règle : le nom de ce qui l'a
 * produite, suivi de sa provenance humaine. Le lien se résout par le **sujet**
 * — c'est ainsi que `reglesQuiProduisent` retrouve une règle —, et cette phrase
 * est ce qui se lit, pas ce qui résout.
 */
export function citationDeLaDecision({ sujet = "", par = "", quand = "" } = {}) {
  const qui = texte(par);
  const date = texte(quand);
  const signature = [qui, date].filter(Boolean).join(", le ");

  return signature ? `${texte(sujet)} — tranché par ${signature}` : texte(sujet);
}

/**
 * Une décision et la valeur qu'elle fixe, prêtes pour une proposition.
 *
 * Deux affirmations, comme une règle et sa conclusion — jamais une seule. La
 * décision porte la question et les écartés ; la valeur porte ce qu'on retient,
 * et cite la décision.
 *
 * **La valeur est facultative.** « On ne fera pas de sous-sol » est une décision
 * entière qui ne pose aucune valeur : elle a une question, des écartés, un
 * motif, et rien à écrire dans un `.ddb`. Lui inventer une valeur pour respecter
 * une symétrie ferait entrer en mémoire une affirmation que personne n'a prise.
 *
 * @param {object} options
 * @param {string} options.sujet ce sur quoi on tranche — le même nom que la valeur
 * @param {string} [options.retenu] ce qu'on retient, s'il y a quelque chose à poser
 * @param {string} options.question ce sur quoi on a tranché, en toutes lettres
 * @param {{quoi: string, raison?: string, pourquoi?: string}[]} [options.ecartes] les possibles écartés
 * @param {string} [options.motif] pourquoi — ou l'aveu qu'il n'y en a pas
 * @param {string} [options.par] qui a tranché
 * @param {string} [options.quand] quand
 * @param {string} [options.domaine] la discipline sur laquelle on tranche
 * @param {string} [options.natureDeLaValeur] ce qu'est la valeur produite
 * @param {string[]} [options.zones] la portée
 * @param {string} [options.atelier] d'où vient le geste
 * @param {string} [options.reference] de quoi retrouver l'origine
 * @param {boolean} [options.poseLaValeur] `false` pour **compléter** une décision
 *   sur une valeur qui est déjà en mémoire : la décision porte ce qui a été
 *   retenu, et aucune seconde ligne ne repose la valeur. Reposer une valeur que
 *   le projet tient déjà ferait un second versement du même nom — un doublon
 *   dans le fichier, et une ligne de plus dans l'histoire pour rien.
 * @returns {object[]} une ou deux affirmations, vide si ce n'est pas une décision
 */
export function decisionVersable({
  sujet = "",
  retenu = "",
  question = "",
  ecartes = [],
  motif = "",
  par = "",
  quand = "",
  domaine = "",
  natureDeLaValeur = NATURE.DONNEE_BASE,
  zones = [],
  atelier = "",
  reference = "",
  poseLaValeur = true
} = {}) {
  const nom = texte(sujet);
  const dite = decisionRetenue({ question, ecartes, motif });
  if (!nom || !dite) return [];

  const portee = Array.isArray(zones) ? zones : [];
  const signature = citationDeLaDecision({ sujet: nom, par, quand });

  // Qui et quand, **structurés** et pas seulement dans la phrase : c'est ce qui
  // permettra, le jour où une donnée bouge, d'aller demander à quelqu'un de
  // nommé si son choix tient encore. Une phrase qu'il faudrait redécouper pour
  // en extraire un nom serait une deuxième écriture du même fait (règle 4).
  const depuis = { type: PROVENANCE.DECISION, quoi: signature, par: texte(par), le: texte(quand) };

  const lignes = [{
    sujet: nom,
    // Ce que la décision **vaut** est ce qu'elle a retenu ; sans rien de retenu,
    // c'est la question elle-même qui se lit, parce qu'une ligne sans valeur ne
    // s'affiche nulle part.
    valeur: texte(retenu) || dite.question,
    nature: NATURE.DECISION,
    domaine: texte(domaine),
    decision: dite,
    quoi: dite.question,
    provenance: depuis,
    citation: dite.motif,
    statut: STATUT.RETENU,
    zones: portee,
    atelier: texte(atelier),
    reference: texte(reference)
  }];

  // La valeur, si la décision en pose une. Elle cite la décision, comme une
  // conclusion cite sa règle.
  if (texte(retenu) && poseLaValeur) {
    lignes.push({
      sujet: nom,
      valeur: texte(retenu),
      nature: texte(natureDeLaValeur) || NATURE.DONNEE_BASE,
      domaine: texte(domaine),
      quoi: dite.question,
      provenance: depuis,
      citation: dite.motif,
      statut: STATUT.RETENU,
      zones: portee,
      atelier: texte(atelier),
      reference: texte(reference)
    });
  }

  return lignes;
}
