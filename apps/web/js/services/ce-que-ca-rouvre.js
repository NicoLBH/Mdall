/**
 * Ce qu'une valeur rouvre si elle change — **et c'est la définition de ce qui
 * compte**.
 *
 * ## La question à laquelle ce fichier répond
 *
 * La liste dit *ce qu'il y a*. Le cerveau dit *comment c'est relié*. Aucun des
 * deux ne dit **où regarder**. Un inventaire et une topologie ne sont pas des
 * jugements, et un projet de quatre cents affirmations ne se lit ni par l'un ni
 * par l'autre.
 *
 * Le réflexe serait un score : pondérer le nombre de liens, la fraîcheur, le
 * domaine. Ce serait arbitraire, donc faux, et invérifiable — le pire des trois.
 *
 * Il existe une définition qui se **dérive**, et elle sort du badge de rejeu :
 *
 * > **Est important ce qui, s'il change, oblige un humain à rouvrir un choix.**
 *
 * Pas « ce qui a beaucoup de liens » — c'est une topologie. Pas « ce qui est
 * récent » — c'est un journal. **Ce que ça coûte de se tromper.** Et le détail
 * est son exact inverse : ce qui ne rouvre rien. Si la machine peut le refaire
 * en silence, l'humain n'a pas à le voir — il se compte, il ne se liste pas.
 *
 * ## Où est écrit ce qu'un choix humain tenait pour acquis
 *
 * C'est le point dur, et la réponse existait déjà sans que personne la lise.
 *
 * Une **décision** seule est un cul-de-sac : elle ne déclare aucune dépendance,
 * et rien ne pourrait donc la rouvrir. Mais la fermeture d'un sujet verse trois
 * lignes, pas deux — la décision, la valeur, et le **raisonnement**. Et le
 * raisonnement porte `porteSur` : *sur quelles valeurs le débat portait*. C'est
 * exactement l'amont d'un choix humain, écrit au moment où quelqu'un a tranché.
 *
 * Un raisonnement qui ne le sait pas le **dit** — `raisonnement-du-point.js`
 * écrit « on ne sait pas sur quelles valeurs il portait ». Il ne rouvre alors
 * rien, et c'est la vérité : personne n'a noté sous quoi ce choix avait été
 * fait. Une lacune nommée vaut mieux qu'une absence silencieuse (règle 5).
 *
 * ## Comment le compte se propage
 *
 * On part des **choix**, jamais des valeurs. Un projet porte peu de choix
 * humains et beaucoup de valeurs : une remontée par choix coûte un parcours du
 * graphe, une descente par valeur en coûterait quatre cents.
 *
 * Pour chaque raisonnement, on prend les sujets de son `porteSur`, on retrouve
 * les affirmations qui les portent, et l'on **remonte** le graphe des
 * dépendances : tout ce dont ces valeurs découlent, de proche en proche, rouvre
 * ce choix-là. Changer la commune change la zone climatique, donc la valeur sur
 * laquelle on a débattu, donc le débat est à refaire.
 *
 * ## Ce que ce fichier ne fait pas
 *
 * **Il ne stocke rien.** Le graphe se dérive des règles (`memoire-raisonnement`)
 * ou se reçoit tel que la base le porte — c'est la même forme de lien dans les
 * deux cas. Ce qui est dérivé se recalcule tant qu'il sert à décider (règle 4).
 *
 * **Il ne pondère rien, et il ne classe rien.** Il rend un nombre et les choix
 * qui le composent. Ce que l'écran en fait — un mot, une couleur, un rang — lui
 * appartient : un score affiché ne se conteste pas, donc ne se corrige pas.
 */

import { cleDuSujet } from "./memoire-identifiants.js";
import { dependancesDeLaMemoire, sujetDe } from "./memoire-raisonnement.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qui vaut encore : une ligne remplacée ne décrit plus l'état du projet. */
const enVigueur = (assertion) => !texte(assertion?.superseded_by);

/**
 * Les choix humains que la mémoire porte, avec ce sur quoi ils reposaient.
 *
 * Un choix est un **raisonnement versé** : c'est la seule ligne qui dise à la
 * fois qu'un humain a tranché et sous quelles valeurs il l'a fait. La décision
 * dit ce qu'elle a écarté, la valeur dit ce qu'on retient ; ni l'une ni l'autre
 * ne dit ce qu'elles tenaient pour acquis.
 *
 * `porteSur` vide n'est pas une erreur : c'est un choix dont personne n'a noté
 * le contexte. Il est rendu quand même — on le compte pour dire qu'il existe,
 * et l'écran peut nommer ce qui lui manque.
 *
 * @returns {{id, question, par, quand, porteSur: string[]}[]}
 */
export function choixDeLaMemoire(assertions = []) {
  const choix = [];

  for (const assertion of Array.isArray(assertions) ? assertions : []) {
    if (!enVigueur(assertion)) continue;

    const dit = assertion?.payload?.raisonnement;
    if (!dit || typeof dit !== "object") continue;

    const question = texte(dit.question);
    if (!question) continue;

    choix.push({
      id: texte(assertion.id) || `choix:${question}`,
      question,
      par: texte(assertion?.payload?.provenance?.par),
      quand: texte(assertion?.payload?.provenance?.le),
      porteSur: [...new Set(
        (Array.isArray(dit.porteSur) ? dit.porteSur : [])
          .map((entree) => cleDuSujet(texte(entree?.sujet)))
          .filter(Boolean)
      )]
    });
  }

  return choix;
}

/** `assertion_id → [depends_on_assertion_id]` : ce dont chaque ligne découle. */
function amontParLigne(liens = []) {
  const amont = new Map();

  for (const lien of Array.isArray(liens) ? liens : []) {
    const cible = texte(lien?.assertion_id);
    const socle = texte(lien?.depends_on_assertion_id);
    if (!cible || !socle || cible === socle) continue;
    if (!amont.has(cible)) amont.set(cible, new Set());
    amont.get(cible).add(socle);
  }

  return amont;
}

/**
 * Ce que chaque affirmation rouvre si elle change.
 *
 * @param {object[]} assertions la mémoire du projet
 * @param {object} [options]
 * @param {object[]} [options.liens] le graphe des dépendances, tel que la base
 *   le porte — ou celui que l'écran dessine. **Vide ou absent, il se dérive des
 *   règles**, et c'est la même règle que `liensDuRaisonnement` : ce qui est
 *   enregistré l'emporte, le déduit prend le relais. Elle est écrite ici, une
 *   fois, plutôt qu'à chaque appelant (règle 4) — un écran qui aurait oublié le
 *   `?? dérivé` aurait annoncé « rien à rouvrir » sur toute une mémoire.
 * @returns {Map<string, {combien: number, choix: {question, par, quand}[]}>}
 *   une entrée par affirmation qui rouvre quelque chose. **Une affirmation
 *   absente ne rouvre rien** : c'est du détail, et le détail ne s'énumère pas.
 */
export function ceQueCaRouvre(assertions = [], { liens = null } = {}) {
  const lignes = (Array.isArray(assertions) ? assertions : []).filter(enVigueur);
  const choix = choixDeLaMemoire(lignes);
  if (!choix.length) return new Map();

  const amont = amontParLigne(
    Array.isArray(liens) && liens.length ? liens : dependancesDeLaMemoire(lignes)
  );

  // Les affirmations par sujet : `porteSur` nomme des **sujets**, le graphe
  // relie des **lignes**. Un sujet peut valoir différemment selon la zone, et
  // chacune de ses lignes a son propre amont.
  const parSujet = new Map();
  for (const assertion of lignes) {
    const cle = cleDuSujet(sujetDe(assertion));
    const id = texte(assertion.id);
    if (!cle || !id) continue;
    if (!parSujet.has(cle)) parSujet.set(cle, []);
    parSujet.get(cle).push(id);
  }

  const rouvert = new Map();

  for (const un of choix) {
    // On remonte **depuis** les valeurs débattues : tout ce dont elles
    // découlent rouvre ce choix. Le départ compte aussi — changer la valeur
    // même dont on a débattu rouvre le débat, évidemment.
    const vus = new Set();
    const front = un.porteSur.flatMap((cle) => parSujet.get(cle) ?? []);

    while (front.length) {
      const id = front.pop();
      if (!id || vus.has(id)) continue;
      vus.add(id);
      for (const parent of amont.get(id) ?? []) front.push(parent);
    }

    for (const id of vus) {
      if (!rouvert.has(id)) rouvert.set(id, []);
      rouvert.get(id).push({ question: un.question, par: un.par, quand: un.quand });
    }
  }

  return new Map([...rouvert].map(([id, dits]) => [id, { combien: dits.length, choix: dits }]));
}

/**
 * Ce que ça rouvre, en une phrase — **le mot de l'écran**.
 *
 * Vide quand rien n'est rouvert : « aucun choix à rouvrir » sur cent soixante-dix
 * lignes serait du bruit, et le bruit fait ignorer le reste. Ce qui ne rouvre
 * rien se compte ailleurs, il ne se répète pas ligne à ligne.
 */
export function phraseDeCeQueCaRouvre(rouvre = null) {
  const combien = Number(rouvre?.combien ?? 0);
  if (!combien) return "";

  return `${combien} choix ${combien > 1 ? "humains" : "humain"} à rouvrir`;
}
