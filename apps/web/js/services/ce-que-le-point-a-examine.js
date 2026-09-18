/**
 * Ce qu'un point a **regardé** : les documents versés dans sa discussion.
 *
 * ## L'étape qui restait creuse
 *
 * Le chemin d'un raisonnement porte cinq étapes. Quatre se remplissent ; celle
 * qui dit **ce qui a été examiné** partait vide, et le graphe l'avouait — « on
 * ne sait pas ce qui a été examiné ». C'était exact, et c'était dommage : quand
 * on débat d'une profondeur de fondation, l'étude géotechnique est jointe au fil,
 * et c'est précisément ce qu'on est allé regarder.
 *
 * ## Trois refus, et le premier est celui qui compte
 *
 * **Une pièce jointe à un échange avec le copilote ne se montre jamais.** Ces
 * conversations sont privées par construction (`visibility = 'ephemeral'`), et
 * le **seul nom de fichier** d'un document qu'on y a déposé suffirait à trahir
 * ce qui s'y est dit. La règle est celle de `ce-que-le-point-nomme.js`, et c'est
 * la même fonction qui la tient : une seconde lecture de la confidentialité
 * finirait par ne pas refuser la même chose (règle 10).
 *
 * **Un dépôt que personne n'a posté ne compte pas.** Une pièce jointe sans
 * `message_id` est un envoi en cours : le fichier existe, personne ne l'a mis
 * dans la discussion. Dire « on a examiné ceci » d'un brouillon serait faux.
 *
 * **Un message qu'on n'a pas lu ne se juge pas.** Si les messages manquent, on
 * ne peut pas savoir lesquels étaient privés — et montrer dans le doute est
 * exactement ce qu'on ne fait pas. L'étape reste alors creuse et le dit (règle 5).
 *
 * ## Ce qu'on cite sans le joindre
 *
 * Un document du corpus n'est presque jamais joint au fil : il y est **nommé**.
 * « Cf. l'étude géotechnique G2 » est la phrase ordinaire, et l'étape restait
 * vide. On lit donc aussi les noms du corpus dans les textes du point.
 *
 * ### Un nom d'un seul mot ne se reconnaît pas
 *
 * « Notes.pdf » a pour racine « notes », qui est un mot de la langue : le
 * reconnaître dans « les notes de calcul de l'entreprise » produirait un
 * « examiné » que personne n'a fait — et un faux « on a regardé ceci » couvre en
 * silence. Un nom d'un seul mot ne se cherche donc **qu'avec son extension** :
 * personne n'écrit « .pdf » par hasard.
 *
 * Deux mots suffisent à faire un nom : « étude géotechnique » ne se rencontre
 * pas par accident dans une phrase.
 *
 * ### Et deux documents du même nom ne se reconnaissent pas
 *
 * Deux « CR de chantier.pdf » dans deux dossiers : le texte en cite un, on ne
 * sait pas lequel, et en désigner un serait un rapprochement faux. Le même refus
 * qu'ailleurs pour une valeur que deux noms portent.
 *
 * ### Sur des mots entiers
 *
 * « plan » ne se reconnaît pas dans « planning ». C'est la règle de toute
 * reconnaissance de nom dans un texte ici, et elle ne se desserre pas : c'est la
 * recherche d'un référentiel qui cherche sur un morceau, pas la lecture d'un
 * compte rendu.
 *
 * ## Le nom du fichier, et rien d'autre
 *
 * Ni le chemin de stockage — qui n'est pas une information de projet —, ni le
 * texte du message auquel il était joint : citer un commentaire ici le sortirait
 * de la conversation où il a été écrit.
 *
 * ## Il est pur
 *
 * Il reçoit les messages et les pièces jointes, et rend une lecture.
 */

import { OU_DIT, messageLisible, textesDuPoint } from "./ce-que-le-point-nomme.js";
import { LONGUEUR_MINIMALE } from "./avis-liaison.js";
import { cleDuSujet } from "./memoire-identifiants.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les noms sous lesquels un document se laisse reconnaître dans un texte.
 *
 * Le nom complet — extension comprise — toujours : personne n'écrit « .pdf » par
 * hasard. La racine **seulement si elle porte au moins deux mots** : un mot seul
 * ne se distingue pas d'un mot de la langue.
 */
export function nomsCherchablesDunDocument(document = null) {
  const complet = texte(document?.original_filename) || texte(document?.filename);
  if (!complet) return [];

  const noms = new Set();
  const replie = cleDuSujet(complet);
  if (replie.length >= LONGUEUR_MINIMALE) noms.add(replie);

  // La racine : le nom sans son extension, les tirets et les blancs soulignés
  // rendus aux espaces — « etude-geotechnique.pdf » se cite « étude
  // géotechnique ».
  const racine = cleDuSujet(complet.replace(/\.[a-z0-9]{1,6}$/i, "").replace(/[-_]+/g, " "));
  if (racine.split(" ").filter(Boolean).length >= 2 && racine.length >= LONGUEUR_MINIMALE) {
    noms.add(racine);
  }

  return [...noms];
}

/** Ce nom apparaît-il dans ce texte, sur des mots entiers ? */
function citeDans(nom, texteReplie) {
  const rang = texteReplie.indexOf(nom);
  if (rang < 0) return false;

  const avant = texteReplie[rang - 1];
  const apres = texteReplie[rang + nom.length];
  const colle = (caractere) => caractere !== undefined && /[a-z0-9]/.test(caractere);

  return !colle(avant) && !colle(apres);
}

/**
 * Les documents du corpus que les textes de ce point citent.
 *
 * Un nom porté par deux documents ne se reconnaît pas : le texte en cite un, on
 * ne sait pas lequel, et en désigner un serait un rapprochement faux.
 */
export function documentsCitesParLePoint({ point = null, messages = [], documents = [] } = {}) {
  const lus = textesDuPoint(point, messages);
  if (!lus.length) return [];

  // Combien de documents portent chaque nom. Un nom ambigu est retiré, pas
  // arbitré.
  const porteurs = new Map();
  for (const document of Array.isArray(documents) ? documents : []) {
    if (texte(document?.deleted_at)) continue;
    for (const nom of nomsCherchablesDunDocument(document)) {
      porteurs.set(nom, [...(porteurs.get(nom) ?? []), document]);
    }
  }

  const vus = new Set();
  const cites = [];

  for (const { ou, lu } of lus) {
    const replie = cleDuSujet(lu);
    if (!replie) continue;

    for (const [nom, documentsDuNom] of porteurs) {
      if (documentsDuNom.length > 1) continue;
      if (!citeDans(nom, replie)) continue;

      const quoi = texte(documentsDuNom[0]?.original_filename)
        || texte(documentsDuNom[0]?.filename);
      if (!quoi || vus.has(quoi)) continue;

      vus.add(quoi);
      // `ou` dit **où il a été cité**, et non où le retrouver : c'est ce qui
      // permet de vérifier la reconnaissance d'un coup d'œil, en allant relire
      // la phrase. Un document du corpus se retrouve au corpus, ce que personne
      // n'a besoin qu'on lui dise.
      cites.push({ quoi, ou: `cité dans ${OU_DIT[ou] ?? ou}` });
    }
  }

  return cites;
}

/**
 * Ce que ce point a regardé, dans l'ordre où cela est entré dans la discussion.
 *
 * @param {object} options
 * @param {object} [options.point] le point
 * @param {object[]} [options.messages] ses commentaires, bruts
 * @param {object[]} [options.piecesJointes] les pièces jointes, brutes
 * @param {object[]} [options.documents] le corpus du projet, pour les citations
 * @returns {{quoi: string, ou: string}[]} prêt pour `raisonnementDuPoint`
 */
export function ceQueLePointAExamine({
  point = null, messages = [], piecesJointes = [], documents = []
} = {}) {
  const pointId = texte(point?.id);

  // Les messages qu'on a le droit de lire, par identifiant. Ce qui n'y est pas
  // n'est pas « absent » : c'est « on ne sait pas », et les deux se refusent
  // pareil ici.
  const lisibles = new Set(
    (Array.isArray(messages) ? messages : [])
      .filter((message) => messageLisible(message))
      .map((message) => texte(message?.id))
      .filter(Boolean)
  );

  const vus = new Set();
  const regardes = [];

  for (const piece of trierParArrivee(piecesJointes)) {
    // Les pièces d'un autre point n'ont rien à faire ici : l'appelant peut
    // passer celles d'un projet entier.
    if (pointId && texte(piece?.subject_id) && texte(piece.subject_id) !== pointId) continue;

    // Retirée par celui qui l'avait déposée. La faire parler encore reviendrait
    // à ne pas l'avoir retirée.
    if (texte(piece?.deleted_at)) continue;

    // Sans message, c'est un envoi en cours : personne ne l'a mis dans la
    // discussion, et « on a examiné ceci » serait faux.
    const message = texte(piece?.message_id);
    if (!message || !lisibles.has(message)) continue;

    const nom = texte(piece?.file_name);
    // Le même document joint deux fois n'a été regardé qu'une fois.
    if (!nom || vus.has(nom)) continue;

    vus.add(nom);
    // `ou` reste vide : il dit *où retrouver* ce qu'on a examiné — une page, un
    // article. Un document joint à la discussion du point est déjà là, et
    // écrire « dans la discussion » n'apprendrait rien.
    regardes.push({ quoi: nom, ou: "" });
  }

  // Puis ce que les textes citent sans l'avoir joint. Les pièces d'abord, parce
  // qu'un document réellement déposé dans le fil est une preuve plus forte
  // qu'un nom écrit dans une phrase — et qu'il porte alors sa vraie place.
  for (const cite of documentsCitesParLePoint({ point, messages, documents })) {
    if (vus.has(cite.quoi)) continue;
    vus.add(cite.quoi);
    regardes.push(cite);
  }

  return regardes;
}

/** Dans l'ordre où elles sont entrées dans la discussion. */
function trierParArrivee(piecesJointes) {
  return [...(Array.isArray(piecesJointes) ? piecesJointes : [])]
    .sort((gauche, droite) => texte(gauche?.created_at).localeCompare(texte(droite?.created_at)));
}
