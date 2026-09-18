/**
 * Tout ce qu'un point nomme : dans son titre, sa description, ses commentaires.
 *
 * ## Ce que la reconnaissance lisait, et pourquoi c'était presque rien
 *
 * Elle lisait `title || titre || description` — c'est-à-dire **le titre seul**,
 * la description ne venant qu'à défaut de titre, donc jamais. Et dans ce titre
 * elle gardait **un** nom, le plus long, et jetait les autres.
 *
 * Or les variables d'un projet ne sont presque jamais dans le titre. Un compte
 * rendu s'appelle « CR chantier n°25 » : il ne nomme rien. Ce qu'il nomme est
 * dans la description — « à Chamonix, les fondations ont une profondeur hors gel
 * de… », qui en cite deux — et dans les commentaires, où la discussion se fait.
 *
 * Pour le cas le plus fréquent, la reconnaissance rendait donc **zéro**.
 *
 * ## Elle lit maintenant les trois, et dit où
 *
 * « Ce nom apparaît dans le titre » et « ce nom apparaît dans un commentaire du
 * 12 mars » ne se relisent pas pareil : le premier est ce dont le point parle,
 * le second est ce qui est venu dans la discussion. Chaque nom porte donc **où
 * on l'a vu**, et l'écran le montre — on ne confirme pas un rapprochement dont
 * on ignore d'où il sort.
 *
 * ## Les échanges avec le copilote ne sont jamais lus
 *
 * `visibility = 'ephemeral'` marque les conversations avec le copilote. Elles
 * sont **privées par construction** et ne doivent jamais reparaître devant les
 * collaborateurs du projet, sous aucune forme — pas même « ce nom a été reconnu
 * dans un commentaire ». Un rapprochement qui trahirait d'où il sort suffirait à
 * discréditer le produit entier.
 *
 * Un message effacé ne se lit pas non plus : `deleted_at` dit que son auteur
 * l'a retiré, et le faire parler encore reviendrait à ne pas l'avoir retiré.
 *
 * ## Il est pur
 *
 * Il reçoit le point et ses messages, et rend une lecture. La base est ailleurs.
 */

import { nomsDunTexte } from "./avis-liaison.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Les endroits d'un point où un nom peut apparaître. */
export const OU = {
  TITRE: "titre",
  DESCRIPTION: "description",
  COMMENTAIRE: "commentaire"
};

/**
 * Ce qu'on dit de chaque endroit, à l'écran.
 *
 * Nommés une fois : deux formulations du même endroit finiraient par ne pas
 * dire la même chose (règle 10).
 */
export const OU_DIT = {
  [OU.TITRE]: "le titre",
  [OU.DESCRIPTION]: "la description",
  [OU.COMMENTAIRE]: "un commentaire"
};

/**
 * Un message que la reconnaissance a le droit de lire.
 *
 * Deux refus, et aucun des deux n'est négociable : un échange avec le copilote
 * est privé, un message effacé a été retiré. Écrit ici plutôt qu'à la requête,
 * pour qu'un appelant qui passerait des lignes brutes soit protégé quand même —
 * une garde qui dépend de qui appelle n'est pas une garde.
 */
export function messageLisible(message = null) {
  if (texte(message?.deleted_at)) return false;
  if (texte(message?.visibility).toLowerCase() === "ephemeral") return false;

  return Boolean(texte(message?.body_markdown));
}

/**
 * Les textes d'un point, dans l'ordre où on les lit.
 *
 * Le titre, la description, puis les commentaires du plus ancien au plus
 * récent. Chacun dit **d'où il vient** : c'est la seule façon, ensuite, de dire
 * où un nom a été reconnu.
 *
 * @param {object} point le point
 * @param {object[]} [messages] ses commentaires, bruts
 * @returns {{ou: string, lu: string, quand: string}[]}
 */
export function textesDuPoint(point = null, messages = []) {
  const lus = [];

  const titre = texte(point?.title) || texte(point?.titre);
  if (titre) lus.push({ ou: OU.TITRE, lu: titre, quand: "" });

  const description = texte(point?.description);
  // Le titre ne vaut plus description : c'était le repli d'avant, et il faisait
  // qu'une description n'était jamais lue quand un titre existait.
  if (description) lus.push({ ou: OU.DESCRIPTION, lu: description, quand: "" });

  const pointId = texte(point?.id);
  for (const message of Array.isArray(messages) ? messages : []) {
    // Les messages d'un autre point n'ont rien à faire ici : l'appelant peut
    // passer le fil entier d'un projet, et les mélanger ferait reconnaître dans
    // l'un ce qui s'est dit dans l'autre.
    if (pointId && texte(message?.subject_id) && texte(message.subject_id) !== pointId) continue;
    if (!messageLisible(message)) continue;

    lus.push({ ou: OU.COMMENTAIRE, lu: texte(message.body_markdown), quand: texte(message?.created_at) });
  }

  return lus;
}

/**
 * Tous les noms de la mémoire que ce point cite, avec **où** chacun a été vu.
 *
 * Un nom cité à trois endroits ne compte qu'une fois — c'est le même nom — mais
 * il garde les trois endroits : « dans le titre et dans deux commentaires » se
 * lit autrement que « dans un commentaire ».
 *
 * @param {object} options
 * @param {object} options.point le point
 * @param {object[]} [options.messages] ses commentaires
 * @param {object[]} [options.assertions] la mémoire du projet
 * @returns {{noms: object[], versions: object[]}}
 *   `noms` : `{nom, versions, vu: [{ou, quand}]}` ; `versions` : tout, à plat.
 */
export function ceQueLePointNomme({ point = null, messages = [], assertions = [] } = {}) {
  const parNom = new Map();

  for (const { ou, lu, quand } of textesDuPoint(point, messages)) {
    for (const { nom, versions } of nomsDunTexte(lu, assertions)) {
      if (!parNom.has(nom)) parNom.set(nom, { nom, versions, vu: [] });
      parNom.get(nom).vu.push({ ou, quand });
    }
  }

  const noms = [...parNom.values()];

  return { noms, versions: sansDoublon(noms.flatMap((entree) => entree.versions)) };
}

/** Des versions sans répétition : un même nom vu deux fois porte les mêmes. */
function sansDoublon(versions) {
  const vues = new Set();
  return versions.filter((version) => {
    const id = texte(version?.id);
    if (!id || vues.has(id)) return false;
    vues.add(id);
    return true;
  });
}

/**
 * Où ce nom a été vu, en une phrase.
 *
 * Elle dit l'endroit, jamais le texte : citer un commentaire ici reviendrait à
 * recopier une conversation dans un écran qui n'est pas la conversation.
 */
export function phraseDOuOnLaVu(vu = []) {
  const endroits = [...new Set((Array.isArray(vu) ? vu : []).map((trace) => texte(trace?.ou)))]
    .map((ou) => OU_DIT[ou])
    .filter(Boolean);

  if (!endroits.length) return "";
  if (endroits.length === 1) return `dans ${endroits[0]}`;

  return `dans ${endroits.slice(0, -1).join(", ")} et ${endroits[endroits.length - 1]}`;
}
