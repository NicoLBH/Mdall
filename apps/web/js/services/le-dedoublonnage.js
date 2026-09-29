/**
 * L'étage 0 : **dédoublonner**, et c'est le plus gros gain de tous.
 *
 * ## Pourquoi c'est le premier geste, et pas le dernier
 *
 * Dans une boîte de messagerie, le même message existe quinze fois : il a été
 * répondu, transféré, remis en copie, et chaque exemplaire porte le précédent
 * en citation. Le même plan est attaché à toutes les réponses du fil. Sur cent
 * historiques de chantier, **le volume réel est une fraction du volume
 * apparent** (`docs/nourrir-mdall.md`, § 3).
 *
 * Et cela ne coûte rien : une empreinte, une comparaison. Pas un appel, pas un
 * jeton. Tout ce qu'on dédoublonne ici est ce qu'on ne paiera nulle part
 * ensuite — ni en lecture, ni en rangement, ni en modèle.
 *
 * ## Ce qui donne son identité à un message
 *
 * **Son `Message-ID`, quand il en a un.** C'est une identité que le message
 * porte lui-même, posée par la messagerie qui l'a émis, et qui survit aux
 * transferts. L'inventer alors qu'elle est là reviendrait à en avoir deux, et
 * elles finiraient par ne plus désigner le même message (règle 10).
 *
 * Sans lui — un brouillon, un message reconstitué —, une clé calculée : qui,
 * quand, l'objet, et le propos ramené à ce qui le distingue. Quatre choses,
 * parce qu'aucune ne suffit : deux personnes écrivent « OK » la même minute,
 * et le même objet couvre tout un fil.
 *
 * ## Ce qui donne son identité à une pièce jointe
 *
 * **Ses octets, et rien d'autre.** Le nom ne vaut rien : « Plan.pdf » désigne
 * quinze plans différents sur un chantier, et le même plan voyage sous trois
 * noms. La taille non plus : deux révisions d'un même plan pèsent souvent le
 * même nombre d'octets à l'octet près.
 *
 * ## Ne pas savoir n'est pas savoir que non
 *
 * Une empreinte qu'on n'a pas su calculer — `crypto.subtle` absent d'une page
 * servie sans TLS — **n'est jamais rapprochée de quoi que ce soit**. Elle se
 * compte à part, et se dit. Traiter « je ne sais pas » comme « ce n'est pas le
 * même » gonflerait le compte ; comme « c'est le même » ferait disparaître des
 * pièces. On ne fait ni l'un ni l'autre (règle 5).
 *
 * ## Il ne jette rien
 *
 * Il **compte** ce qui se répète. Rien n'est supprimé ici : ce qui se garde et
 * ce qui s'écarte est une décision d'un autre étage, et elle viendra avec un
 * endroit où écrire.
 *
 * ## Il est pur, sauf là où il faut l'être
 *
 * Les empreintes de pièces passent par `crypto.subtle`, qui est asynchrone —
 * c'est la seule fonction de ce module qui le soit. Tout le comptage est pur.
 */

import { empreinteDuTexte } from "./le-fil-des-mails.js";
import { sha256HexBytes } from "../utils/sha256.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * L'identité d'un message.
 *
 * @param {object} lu ce que rend `unMsgDeplie` ou `unMailDeplie`
 * @returns {string} vide quand rien ne permet de le reconnaître
 */
export function empreinteDunMessage(lu = null) {
  const identite = texte(lu?.identite);
  if (identite) return identite;

  const propos = empreinteDuTexte(lu?.corps);
  const qui = texte(lu?.qui?.adresse) || texte(lu?.qui?.nom);
  const parts = [qui, texte(lu?.quand), texte(lu?.objet), propos];

  // **Tout vide ne fait pas une identité.** Quatre chaînes vides jointes
  // donnent la même clé pour deux messages illisibles, et l'un effacerait
  // l'autre.
  return parts.some(Boolean) ? parts.join("|") : "";
}

/**
 * Les empreintes d'un message et de ses pièces, dans l'ordre des pièces.
 *
 * @returns {Promise<{message: string, pieces: (string|null)[]}>}
 */
export async function lesEmpreintes(lu = null) {
  const pieces = Array.isArray(lu?.pieces) ? lu.pieces : [];
  return {
    message: empreinteDunMessage(lu),
    pieces: await Promise.all(pieces.map((une) => sha256HexBytes(une?.octets)))
  };
}

/**
 * Compter ce qui se répète dans une pile d'inventaires.
 *
 * Le premier exemplaire est celui qu'on garde — c'est le plus ancien dépôt,
 * et l'ordre dans lequel ils arrivent est celui du temps. Les suivants sont
 * des répétitions, et **leur poids est ce qu'on évite**.
 */
function marquer(choses) {
  const vues = new Set();

  return choses.map((une) => {
    const empreinte = texte(une?.empreinte);
    // **Sans empreinte, jamais « déjà vu ».** On ne sait pas, et ne pas savoir
    // n'est pas savoir que non (règle 5).
    if (!empreinte) return { chose: une, dejaVu: false, connue: false };
    if (vues.has(empreinte)) return { chose: une, dejaVu: true, connue: true };
    vues.add(empreinte);
    return { chose: une, dejaVu: false, connue: true };
  });
}

/**
 * Le compte, dérivé du marquage.
 *
 * **Une seule décision, à un seul endroit** : ce que l'écran marque « déjà vu »
 * et ce que le compte appelle une répétition ne peuvent pas diverger, parce que
 * c'est le même passage (règle 4).
 */
function compter(marquees) {
  const repetees = marquees.filter((une) => une.dejaVu);
  const sansEmpreinte = marquees.filter((une) => !une.connue).length;

  return {
    tous: marquees.length,
    // Ce qu'on n'a pas su empreindre compte pour une chacune : ne pas savoir
    // ne les fait pas fusionner.
    distincts: marquees.length - repetees.length,
    repetes: repetees.length,
    poidsEvite: repetees.reduce((somme, une) => somme + (Number(une.chose?.taille) || 0), 0),
    sansEmpreinte
  };
}

/**
 * Ce qui se répète, dans ce qui a été déposé.
 *
 * @param {object[]} inventaires ce que rend `inventaireDunMessage`
 * @returns {{messages: object, documents: object, vignettes: object}}
 */
export function ceQuiSeRepete(inventaires = []) {
  const lus = Array.isArray(inventaires) ? inventaires : [];
  const toutes = (quoi) => lus.flatMap((un) => (Array.isArray(un?.[quoi]) ? un[quoi] : []));

  return {
    messages: compter(marquer(lus)),
    documents: compter(marquer(toutes("documents"))),
    vignettes: compter(marquer(toutes("vignettes")))
  };
}

/**
 * Les mêmes inventaires, chacun sachant s'il a **déjà été vu**.
 *
 * L'écran en a besoin autant que le compte : dire « 1 message déjà vu » en haut
 * et dessiner deux fois le même message en dessous, c'est faire lire deux plans
 * là où il y en a un. Et c'est le même passage qui décide des deux.
 */
export function marquerLesRepetitions(inventaires = []) {
  const lus = Array.isArray(inventaires) ? inventaires : [];
  return marquer(lus).map(({ chose, dejaVu }) => ({ ...chose, dejaVu }));
}
