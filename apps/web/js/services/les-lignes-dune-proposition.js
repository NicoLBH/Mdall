/**
 * Ce qu'une proposition et ses lignes valent **en colonnes de base**.
 *
 * ## Le défaut que ce module ferme, et il est parti en production
 *
 * La lecture des comptes rendus au serveur écrit les mêmes propositions que
 * l'Atelier, par la même fonction (`preparerUneProposition`) — mais avec **ses
 * propres accès à la base**, écrits à la main dans la fonction de bord.
 *
 * Ils ont été écrits de mémoire. L'un d'eux posait les lignes ainsi :
 *
 *     { proposition_id, project_id, ...item }
 *
 * `item` porte `itemType`, `itemKey`, `payload` — des noms de **JavaScript**.
 * Les colonnes s'appellent `item_type` et `item_key`. L'insertion était donc
 * refusée à chaque fois, en silence : `soumettreDesItems` rend `false`, et
 * `preparerUneProposition` rend « les lignes n'ont pas pu être portées ».
 *
 * Mais la proposition, elle, est créée **avant**. Trois comptes rendus ont donc
 * donné deux propositions **entièrement vides**, et le journal a marqué la
 * lecture en échec sans dire pourquoi.
 *
 * ## Pourquoi ce n'est pas un défaut de frappe
 *
 * C'est une valeur écrite à deux endroits (règle 4), et la seconde était fausse
 * avant d'être finie. Corriger la copie aurait laissé la **prochaine** copie
 * arriver de la même façon.
 *
 * La traduction vit donc ici, et les deux côtés l'appellent : le client du
 * navigateur comme la fonction de bord. Il n'y a plus de second endroit où
 * nommer une colonne.
 *
 * ## Il est pur
 *
 * Des objets de JavaScript entrent, des lignes de base sortent. C'est ce qui
 * permet de l'éprouver sans base, et de le descendre au serveur.
 *
 * Les **mots d'état** ne sont pas écrits ici : ils viennent de
 * `proposition-state.js`, qui porte déjà les transitions. Les recopier ferait
 * exactement ce que ce module est censé empêcher.
 */

import { ITEM, PROPOSITION } from "./proposition-state.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Les colonnes d'une proposition qu'on relit. Écrites une fois (règle 10). */
export const LE_SELECT_DUNE_PROPOSITION =
  "id,number,project_id,title,description,status,created_by,created_at,updated_at,"
  + "merged_at,merged_by,merge_title,merge_note,closed_at,closed_by,snapshot";

/** Les colonnes d'une ligne de proposition qu'on relit. */
export const LE_SELECT_DUN_ITEM =
  "id,item_type,item_key,payload,status,reason,decided_by,decided_at";

/**
 * La table des sujets d'un projet, et ce qu'on en lit.
 *
 * **`subjects`, et non `project_subjects`.** La fonction de bord lisait la
 * seconde, qui n'existe pas : la confrontation au projet se faisait donc sur une
 * liste vide, et chaque point d'un compte rendu repartait neuf — un sujet déjà
 * suivi était reproposé comme s'il n'existait pas.
 */
export const LA_TABLE_DES_SUJETS = "subjects";
export const LE_SELECT_DES_SUJETS = "id,subject_number,title,status,parent_subject_id";

/**
 * La ligne d'une proposition neuve.
 *
 * `null` quand il manque de quoi l'écrire : une proposition sans projet ou sans
 * titre n'est pas une proposition, et l'écrire quand même donnerait une ligne
 * que personne ne retrouve.
 */
export function laLigneDuneProposition({
  projectId = "", title = "", description = "", createdBy = null
} = {}) {
  if (!texte(projectId) || !texte(title)) return null;

  return {
    project_id: texte(projectId),
    title: texte(title),
    // `null` et non `""` : une description vide est une absence, et la colonne
    // le dit mieux qu'une chaîne qui ressemble à une réponse.
    description: texte(description) || null,
    status: PROPOSITION.OPEN,
    created_by: createdBy ?? null
  };
}

/**
 * La ligne d'un item de proposition.
 *
 * **« proposé » d'ordinaire. « refusé » est un retrait** : c'est ainsi qu'on
 * sort un document du corpus ou qu'on écarte une affirmation, et c'est déjà ce
 * que la fusion sait appliquer. Le mot dit ce que le projet en fait, pas ce
 * qu'on pense d'elle.
 *
 * **Ni signataire ni date** : rien n'a encore été décidé. La fusion signe.
 */
export function laLigneDunItem(item = null, { propositionId = "", projectId = "" } = {}) {
  return {
    proposition_id: texte(propositionId),
    project_id: texte(projectId),
    item_type: item?.itemType,
    item_key: item?.itemKey,
    payload: item?.payload ?? null,
    status: item?.status ?? ITEM.PROPOSED,
    decided_by: null,
    decided_at: null
  };
}

/**
 * Les lignes d'un lot d'items.
 *
 * Une liste vide reste une liste vide : c'est à l'appelant de décider qu'il n'y
 * a rien à écrire, et d'inventer ici une ligne de remplacement ferait entrer du
 * vide dans une proposition.
 */
export function lesLignesDesItems(items = [], ou = {}) {
  return (Array.isArray(items) ? items : []).map((un) => laLigneDunItem(un, ou));
}
