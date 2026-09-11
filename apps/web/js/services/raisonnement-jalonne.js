/**
 * Le raisonnement, et les endroits où quelqu'un a mis son nom.
 *
 * ## Ce qui distingue un raisonnement d'une suite de calculs
 *
 * Un tableur recalcule tout, toujours, sans rien savoir. Une mémoire de projet
 * fait autre chose : elle sait que **certaines étapes ont été actées**. Un
 * bureau de contrôle a regardé la zone de neige et a mis son nom en face ;
 * quelqu'un a vérifié la cote hors gel le 3 avril. Ces étapes ne sont pas des
 * cases d'un tableur, ce sont des **jalons**.
 *
 * Le moteur n'a donc qu'une question à poser à chaque nœud — *ce nœud est-il
 * couvert ?* —, et ce fichier est le seul endroit où elle se pose.
 *
 * ## La décision qui commande tout le reste : il ne s'arrête pas, il cesse de se taire
 *
 * Le plan écrivait : *« il sait s'il a le droit de le refaire en silence, ou
 * s'il doit s'arrêter et le dire »*. Lu au pied de la lettre, cela voudrait dire
 * interrompre la chaîne au premier jalon. **On ne le fait pas**, et la raison
 * est forte :
 *
 * Arrêter la chaîne perdrait les conséquences. Si le calcul s'arrête sur « zone
 * de neige », on ne saura jamais que les fondations changeaient aussi — et c'est
 * exactement, et uniquement, ce pour quoi une variante existe. On remplacerait
 * un moteur qui traverse sans rien dire par un moteur qui ne dit rien du tout.
 *
 * Ce qui s'arrête, c'est le **silence**. Le moteur calcule tout, et il nomme
 * chaque jalon qu'il traverse : ce qui a été examiné, par qui, et ce que l'étape
 * en ferait. La chaîne se lit alors pour ce qu'elle est — une suite d'étapes
 * dont certaines ont été actées.
 *
 * Un vrai arrêt reste possible un jour, et il coûtera une chose : savoir
 * distinguer « je recalcule pour voir » d'un « je recalcule pour écrire ». La
 * variante n'écrit rien ; le jour où quelque chose écrit, c'est là qu'un arrêt
 * aura un sens.
 *
 * ## Ce que ce fichier ne fait pas
 *
 * **Il ne pondère rien.** Un jalon ne rend pas une valeur plus vraie et n'entre
 * dans aucun arbitrage : il dit ce que ça coûte de passer outre. Le rang vient
 * de `services/ce-qui-couvre.js` et sert à l'affichage, jamais au calcul.
 *
 * **Il ne réclame rien.** Un jalon traversé n'ouvre aucune file, n'attend aucune
 * réponse et ne bloque personne (règle 12). Il se dit, une fois, là où il se
 * produit.
 */

import { ceQuiCouvre } from "./ce-qui-couvre.js";
import { cleDuSujet } from "./memoire-identifiants.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Ce qu'une étape du raisonnement rencontre.
 *
 * Deux façons de croiser un engagement, et elles ne se disent pas pareil — c'est
 * la même distinction que `services/couverture.js`, et la confondre ferait
 * crier au loup sur ce qui n'a peut-être pas bougé.
 */
export const JALON = {
  /** Rien n'a été examiné ici. Le moteur refait en silence, et il en a le droit. */
  AUCUN: "aucun",
  /** L'étape réécrit une valeur que quelqu'un a examinée. */
  TRAVERSE: "traverse",
  /** L'étape touche à ce dont dépend une valeur examinée. */
  A_REVOIR: "a-revoir"
};

const PHRASES = {
  [JALON.TRAVERSE]: "réécrit une valeur que quelqu'un a examinée",
  [JALON.A_REVOIR]: "touche à ce dont dépend une valeur examinée"
};

/** Ce qu'un jalon dit, en français. Jamais le nom du mécanisme (règle 12). */
export function phraseDuJalon(jalon = null) {
  return PHRASES[texte(jalon?.sorte)] ?? "";
}

/**
 * **La** question du moteur, et elle ne se pose qu'ici.
 *
 * `peut` est vrai quand personne n'a rien examiné : le moteur refait, et
 * personne n'a besoin de le savoir. Faux quand il y a un jalon : le calcul a
 * lieu quand même — voir l'en-tête —, mais il ne se fait plus en silence.
 *
 * @param {string} assertionId la valeur que l'étape réécrirait
 * @param {object} options
 * @param {object[]} options.actes les actes du projet
 * @returns {{peut: boolean, rang: string, lignes: object[], pourquoi: string}}
 */
export function leMoteurPeutRefaireEnSilence(assertionId, { actes = [], nommer = null } = {}) {
  const couverture = ceQuiCouvre(assertionId, { actes, nommer });

  return {
    peut: !couverture.couverte,
    rang: couverture.rang,
    lignes: couverture.lignes,
    pourquoi: couverture.couverte
      ? `${couverture.lignes.length} ${couverture.lignes.length > 1 ? "personnes ou organismes l'ont" : "personne ou organisme l'a"} examinée.`
      : ""
  };
}

/**
 * Les jalons qu'un rejeu traverse.
 *
 * Sur les **conclusions** seulement — ce que le rejeu réécrit. Une règle rejouée
 * qui rend ce que le projet affirme déjà ne traverse rien : elle confirme, et
 * signaler cela apprendrait à ignorer l'écran.
 *
 * @param {object} options
 * @param {object[]} options.conclusions ce que `rejouerLesRegles` a réécrit
 * @param {object[]} options.actes les actes du projet
 * @returns {object[]} un jalon par conclusion couverte
 */
export function jalonsDuRejeu({ conclusions = [], actes = [], nommer = null } = {}) {
  const jalons = [];

  for (const conclusion of Array.isArray(conclusions) ? conclusions : []) {
    const cible = texte(conclusion?.sortie?.id);
    if (!cible) continue;

    const verdict = leMoteurPeutRefaireEnSilence(cible, { actes, nommer });
    if (verdict.peut) continue;

    jalons.push({
      sorte: JALON.TRAVERSE,
      assertionId: cible,
      sujet: texte(conclusion?.sujet),
      zone: texte(conclusion?.zone),
      avant: texte(conclusion?.avant),
      apres: texte(conclusion?.apres),
      rang: verdict.rang,
      lignes: verdict.lignes
    });
  }

  return jalons;
}

/**
 * Les engagements qu'une étape de la chaîne croise, par ce qu'elle écrit.
 *
 * On rapproche par **sujet** et non par identifiant : une étape de chaîne dit
 * « j'ai écrit la zone de neige », elle ne porte pas la version qu'elle a
 * remplacée. Le sujet suffit — et c'est aussi ce que l'utilisateur lit.
 */
function jalonsDeLEtape(etape, parSujet) {
  const sorties = Array.isArray(etape?.sorties) ? etape.sorties : [];

  return sorties
    .flatMap((sujet) => parSujet.get(cleDuSujet(texte(sujet))) ?? [])
    .filter(Boolean);
}

/**
 * L'enchaînement d'une variante, avec ses jalons.
 *
 * Rien de neuf n'est calculé : `couvertureDeLaVariante` a déjà dit ce qui tombe
 * et ce qui est à revérifier. Ce qui manquait, c'est que ces engagements se
 * lisent **là où ils se produisent** — sur l'étape qui les traverse — et non
 * seulement dans une liste à côté. C'est toute la différence entre un rapport
 * et un raisonnement jalonné.
 *
 * @param {object[]} etapes ce que `enchainementDeLaVariante` a rendu
 * @param {object} couverture ce que `couvertureDeLaVariante` a rendu
 * @returns {object[]} les mêmes étapes, celles qui traversent portant `jalon`
 */
export function jalonnerLEnchainement(etapes = [], couverture = null) {
  const parSujet = new Map();

  const ranger = (engagements, sorte) => {
    for (const engagement of Array.isArray(engagements) ? engagements : []) {
      const sujet = cleDuSujet(texte(engagement?.examinee?.payload?.subject));
      if (!sujet) continue;

      if (!parSujet.has(sujet)) parSujet.set(sujet, []);
      parSujet.get(sujet).push({ sorte, engagement });
    }
  };

  // Ce qui tombe d'abord : quand une étape traverse les deux, c'est le plus
  // dur qu'on veut lire en premier.
  ranger(couverture?.tombees, JALON.TRAVERSE);
  ranger(couverture?.aRevoir, JALON.A_REVOIR);

  return (Array.isArray(etapes) ? etapes : []).map((etape) => {
    const croises = jalonsDeLEtape(etape, parSujet);
    if (!croises.length) return etape;

    return {
      ...etape,
      jalon: {
        sorte: croises[0].sorte,
        combien: croises.length,
        engagements: croises.map((croise) => croise.engagement)
      }
    };
  });
}

/**
 * Ce que la chaîne entière traverse, en une phrase.
 *
 * Vide quand elle ne traverse rien — et c'est le cas le plus fréquent. Une
 * phrase qui dirait « 0 jalon traversé » à chaque variante ferait un compteur
 * qu'on apprend à ignorer, et donnerait à l'écran l'air de tenir un registre.
 */
export function phraseDuRaisonnementJalonne(etapes = []) {
  const jalonnees = (Array.isArray(etapes) ? etapes : []).filter((etape) => etape?.jalon);
  if (!jalonnees.length) return "";

  const traversees = jalonnees.filter((etape) => etape.jalon.sorte === JALON.TRAVERSE).length;
  const aRevoir = jalonnees.length - traversees;

  return [
    traversees
      ? `${traversees} ${traversees > 1 ? "étapes réécrivent des valeurs" : "étape réécrit une valeur"} `
        + "que quelqu'un a examinées."
      : "",
    aRevoir
      ? `${aRevoir} ${aRevoir > 1 ? "autres touchent" : "autre touche"} à ce dont dépend `
        + "une valeur examinée."
      : ""
  ].filter(Boolean).join(" ");
}
