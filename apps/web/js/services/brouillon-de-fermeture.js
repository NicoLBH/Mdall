/**
 * Le fil d'un sujet mis sous les yeux du copilote — et rien d'autre.
 *
 * ## Ce que ce fichier décide, et ce qu'il ne décide pas
 *
 * Il compose **la matière** : le titre, la description, les commentaires, dans
 * l'ordre où on les lit. Ce qu'on demande au modèle n'est pas ici — la consigne
 * vit dans `supabase/functions/brouillon-de-fermeture/`, au serveur, et ne se
 * lit pas avec F12. Le client envoie du texte, il ne compose aucune instruction.
 *
 * ## La conversation avec le copilote ne part jamais
 *
 * C'est l'interdit qui compte le plus dans tout ce fichier. Un échange avec le
 * copilote est **privé** : il ne se montre pas aux collaborateurs du projet, et
 * il ne s'envoie pas davantage à un modèle pour qu'il en fasse un brouillon
 * qu'ils liront.
 *
 * La garde n'est pas réécrite ici : c'est `textesDuPoint` qui refuse, par
 * `messageLisible`, et il refuse aussi les messages effacés. Une seconde copie
 * de la règle finirait par ne plus dire la même chose que la première
 * (règle 10) — et c'est la copie oubliée qui laisserait fuir.
 *
 * ## Pur, et c'est ce qui permet d'éprouver la garde
 *
 * Ce fichier ne parle à rien : il compose du texte. Le transport vit dans
 * `brouillon-de-fermeture-supabase.js`. C'est ce qui permet d'exécuter en Node
 * la seule chose qui compte ici — casser la garde de confidentialité et la voir
 * tomber.
 *
 * ## Il n'écrit rien, et ne conclut rien
 *
 * Ce qui revient est un **brouillon** : il tombe dans les champs d'une fenêtre
 * qu'un humain relit, et ce qui en sort est une proposition que quelqu'un
 * signera. Deux portes humaines avant la mémoire, et la règle 1 tient.
 */

import { textesDuPoint, OU_DIT } from "./ce-que-le-point-nomme.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Le fil d'un sujet, tel qu'on l'envoie.
 *
 * Étiqueté endroit par endroit — « Le titre : … », « Un commentaire : … ». Sans
 * ces étiquettes, le modèle reçoit un bloc de prose où la description et les
 * commentaires se confondent, et il attribue à l'un ce que l'autre a dit.
 *
 * @returns {string} vide quand il n'y a rien à lire.
 */
export function matiereDuPoint(point = null, messages = []) {
  return textesDuPoint(point, messages)
    .map(({ ou, lu }) => `${OU_DIT[ou] ?? ou} : ${texte(lu)}`)
    .filter((ligne) => texte(ligne).length > 3)
    .join("\n\n");
}
