/**
 * Chercher une situation dans son carnet.
 *
 * ## Pourquoi c'est ici et pas dans l'écran
 *
 * La recherche des sujets a la sienne, celle de la mémoire aussi. Écrite une
 * troisième fois dans l'écran des situations, elle aurait eu son propre repli
 * d'accents, sa propre façon de couper les mots, et l'on aurait fini avec trois
 * recherches qui ne trouvent pas les mêmes choses (règle 10).
 *
 * ## Ce qu'elle cherche
 *
 * **Le titre, et la description.** Un carnet se range par intentions — « la
 * semaine », « avant la réunion » — et l'on s'en souvient par un mot de la
 * phrase qu'on a écrite, pas nécessairement du titre.
 *
 * **Tous les mots, dans n'importe quel ordre.** « réunion semaine » trouve
 * « Ma semaine avant réunion » : on tape ce dont on se souvient, pas ce qu'on a
 * écrit.
 *
 * ## Une recherche vide n'est pas un filtre
 *
 * Elle rend la liste entière. Rendre zéro ferait croire à un carnet vide au
 * premier affichage, avant même qu'on ait tapé quoi que ce soit (règle 5).
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Sans accent ni casse : on tape rarement les accents, et jamais deux fois la même casse. */
function pli(valeur) {
  return texte(valeur).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Les situations que cette recherche retient.
 *
 * @param {object[]} situations
 * @param {string} requete ce qui est écrit dans le champ
 */
export function situationsQuiRepondent(situations = [], requete = "") {
  const toutes = Array.isArray(situations) ? situations : [];
  const mots = pli(requete).split(/\s+/).filter(Boolean);
  if (!mots.length) return toutes;

  return toutes.filter((situation) => {
    const dans = `${pli(situation?.title)} ${pli(situation?.description)}`;
    return mots.every((mot) => dans.includes(mot));
  });
}

/**
 * Ce qu'on dit quand la recherche ne trouve rien.
 *
 * **Nommer ce qu'on a cherché.** « Aucun résultat » laisse se demander si le
 * carnet est vide ou si l'on a mal tapé — et c'est presque toujours la seconde
 * (règle 5).
 */
export function phraseSansResultat(requete = "") {
  const cherche = texte(requete);
  if (!cherche) return "";

  return `Aucune situation ne répond à « ${cherche} ».`;
}
