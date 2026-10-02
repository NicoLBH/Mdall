/**
 * Ce qu'un fichier déposé porte comme messages.
 *
 * ## Un seul endroit qui décide ce qu'il y a dans un fichier
 *
 * Deux écrans posent la même question : le dépouillement de **Fichiers**, qui
 * en reçoit deux cents, et la **lecture des mails** de l'Atelier, qui en lit
 * un fil. Elle vivait dans le premier ; le second ne savait lire que des `.eml`
 * et écartait tout le reste sans le dire vraiment.
 *
 * Deux réponses à « qu'y a-t-il dans ce fichier ? » auraient fini par ne plus
 * dire la même chose, et c'est celle qu'on relit le moins qui serait restée
 * fausse (règle 10).
 *
 * ## Il ne parle à rien
 *
 * Des octets entrent, des messages sortent. Aucun réseau, aucun rangement :
 * ce qui range vit ailleurs.
 */

import {
  CE_QUI_PORTE_DES_MAILS, EXTENSION_DUN_MAIL
} from "./le-dossier-des-mails.js";
import { unMsgDeplie } from "./un-msg-deplie.js";
import { unMailDeplie } from "./un-mail-deplie.js";
import { lesMessagesDeLarchive, lireLannuaire, octetsDeLentree } from "./un-zip-deplie.js";

const texte = (valeur) => String(valeur ?? "").trim();

// La liste des porteurs vit dans le dossier des mails, et se relaie ici : les
// écrans qui demandent « qu'y a-t-il dans ce fichier ? » n'ont pas à connaître
// deux modules pour obtenir la question et sa réponse.
export { CE_QUI_PORTE_DES_MAILS };

/** Ce nom a-t-il l'allure d'un porteur de mails ? */
export function estUnPorteurDeMails(nom) {
  const bas = texte(nom).toLowerCase();
  return CE_QUI_PORTE_DES_MAILS.some((quoi) => bas.endsWith(quoi));
}

/**
 * Ce qu'un message déposé déclare être, **selon les octets qu'on garde**.
 *
 * Un `.msg` est un conteneur Outlook, pas du `message/rfc822` : le déclarer
 * ainsi ferait échouer son ouverture par tout ce qui croit le type annoncé. On
 * garde les octets d'origine, donc on déclare ce qu'ils sont.
 */
export const LE_TYPE_DUN_MESSAGE = {
  ".msg": "application/vnd.ms-outlook",
  [EXTENSION_DUN_MAIL]: "message/rfc822"
};

/** L'extension d'un nom, en minuscules, avec son point. */
export function lExtension(nom) {
  const bas = texte(nom).toLowerCase();
  const point = bas.lastIndexOf(".");
  return point > 0 ? bas.slice(point) : "";
}

/**
 * Ce qu'un fichier déposé porte comme messages.
 *
 * Un `.msg` ou un `.eml` en porte un ; un `.zip` en porte autant qu'il en
 * contient. **Chacun garde ses octets d'origine** : on ne recompose pas un
 * `.eml` à partir d'un `.msg` pour le ranger, parce que ce qu'on garde doit
 * pouvoir être relu par autre chose que Mdall.
 *
 * @returns {Promise<{messages: object[], motif: string}>}
 */
export async function lesMessagesDunFichier(fichier) {
  const nom = texte(fichier?.name);
  const bout = lExtension(nom);

  let octets;
  try {
    octets = new Uint8Array(await fichier.arrayBuffer());
  } catch {
    return { messages: [], motif: "le fichier n'a pas pu être lu" };
  }

  if (bout === ".msg" || bout === EXTENSION_DUN_MAIL) {
    const lu = bout === ".msg" ? unMsgDeplie(octets) : unMailDeplie(octets);
    return { messages: [{ nom, octets, extension: bout, lu }], motif: "" };
  }

  if (bout !== ".zip") return { messages: [], motif: "ce n'est pas un porteur de mails" };

  const annuaire = lireLannuaire(octets);
  if (!annuaire.ok) return { messages: [], motif: annuaire.motif };

  const dedans = lesMessagesDeLarchive(annuaire.entrees);
  if (!dedans.length) return { messages: [], motif: "cette archive ne contient aucun message" };

  const messages = [];
  for (const entree of dedans) {
    const siens = await octetsDeLentree(octets, entree);
    // **Une entrée qu'on n'a pas su sortir ne fait pas tomber l'archive.** Elle
    // se compte, et son nom se garde : une archive laissée derrière soi sans
    // qu'on le sache est pire qu'une archive qu'on sait avoir manquée (règle 5).
    if (!siens) {
      messages.push({ nom: entree.nom, octets: null, extension: lExtension(entree.nom), lu: null });
      continue;
    }
    const bout2 = lExtension(entree.nom);
    messages.push({
      nom: entree.nom,
      octets: siens,
      extension: bout2,
      lu: bout2 === ".msg" ? unMsgDeplie(siens) : unMailDeplie(siens)
    });
  }

  return { messages, motif: "" };
}
