/**
 * La porte de la console d'administration.
 *
 * ## Une porte, pas un rôle
 *
 * Mdall ne porte pas de rôles. Il n'y a pas d'« administrateur » qui verrait
 * plus de choses dans l'application : la mémoire d'un chantier appartient à
 * ceux qui y travaillent, et cela ne change pas.
 *
 * Ce que cette porte ouvre est **un autre bâtiment** : une console qui lit des
 * comptes — combien de comptes, combien de sujets, quelles fonctions tombent en
 * panne, où en est la prédiction — et jamais des contenus
 * (`docs/la-console-de-ladministrateur.md`). Elle se construit à part, se sert
 * à part, et ne sait pas ouvrir un projet.
 *
 * ## Pourquoi la question se pose ainsi, et pas autrement
 *
 * On ne demande **jamais** « qui sont les administrateurs ? ». La question est
 * « **suis-je** administrateur ? », et la base ne sait répondre qu'à celle-là :
 * sa politique de lecture ne rend que la ligne de celui qui demande
 * (`migrations/202610200001_qui_tient_la_console.sql`).
 *
 * Écrire ici la liste des adresses, ou la lire en entier pour y chercher la
 * sienne, publierait dans le navigateur de chacun le nom des gens qui tiennent
 * Mdall — donc qui démarcher et qui hameçonner. Le garde-fou n'est pas dans
 * cet écran : il est dans la forme de la table. Cet écran se contente de ne
 * jamais poser l'autre question.
 *
 * ## Fermée par défaut
 *
 * Une lecture qui échoue — réseau coupé, session expirée — laisse la porte
 * **fermée**. C'est le sens le moins coûteux de l'erreur : un administrateur
 * qui ne voit pas son entrée recharge la page ; l'inverse montrerait une porte
 * à tout le monde le jour où la base ne répond plus.
 *
 * ## Il est pur
 *
 * Aucune requête, aucun écran. Ce qui parle à la base vit dans
 * `la-porte-de-la-console-supabase.js`.
 */

/**
 * L'entrée de la console, telle que le menu la nomme et l'adresse.
 *
 * **Le nom vit ici, à un seul endroit** (règle 10) : il est écrit par la barre
 * du haut, et il sera écrit par la console elle-même. Recopié, il finirait par
 * différer de la porte qui y mène.
 *
 * L'adresse est **relative**, et c'est ce qui la rend juste aussi bien sur le
 * site servi à la racine que sur une copie servie dans un sous-dossier : la
 * console est déposée à côté de l'application, par `scripts/prepare-console.mjs`.
 */
export const LA_CONSOLE = Object.freeze({
  nom: "Console administrateur",
  adresse: "console/",
  icone: "shield-lock"
});

/**
 * La porte est-elle ouverte, au vu de ce que la base a rendu ?
 *
 * @param {{data: unknown, error: unknown}|null} reponse ce que la lecture a rendu
 * @returns {boolean}
 */
export function laPorteEstOuverte(reponse = null) {
  // **Une erreur ferme.** Et elle ferme sans distinguer laquelle : une session
  // expirée, un réseau coupé et une table absente ne se ressemblent pas, mais
  // aucune n'est une raison d'ouvrir.
  if (!reponse || reponse.error) return false;

  const lignes = reponse.data;
  // La politique ne rend que la ligne de celui qui demande : une seule suffit,
  // et l'on ne regarde pas ce qu'elle contient. Comparer l'adresse ici
  // reviendrait à refaire dans le navigateur le travail que la base a fait —
  // et à se tromper le jour où l'une des deux écrit une majuscule.
  return Array.isArray(lignes) ? lignes.length > 0 : Boolean(lignes);
}
