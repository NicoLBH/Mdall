/**
 * Ce qu'une ligne de `memory_pinned_searches` devient à l'écran.
 *
 * ## Pourquoi c'est un fichier à part
 *
 * Cette conversion vivait dans le module qui parle à la base. Elle est pure —
 * une ligne entre, un objet sort —, mais elle était enfermée derrière un import
 * de réseau : aucun test ne pouvait l'exécuter, et **rien ne vérifiait ce qui
 * arrivait de l'autre côté**.
 *
 * Ce qui est arrivé de l'autre côté : le titre ne passait pas. La conversion
 * rend `titre`, l'écran des vues lisait `title`, et la vue prenait donc sa
 * requête pour nom — la liste affichait `objectif:permis-de-construire` là où
 * le rail, qui lit l'autre graphie, affichait « Les urgences du lot 03 ». Deux
 * vocabulaires pour la même ligne, et le raccord qui perd ce qu'ils ne
 * partagent pas (`docs/fondamentaux.md`, règle 10).
 *
 * **Il n'y a plus qu'une forme**, elle est écrite ici, et le raccord s'exécute
 * en test.
 *
 * ## Ce que ce module ne fait pas
 *
 * Il ne lit ni la base ni le store, et n'appelle rien.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * L'écran d'où vient une épingle.
 *
 * **La Mémoire et les sujets partagent la table, pas les requêtes.** Les deux
 * barres ont la même grammaire mais pas le même vocabulaire : `nature:hypothese`
 * ne veut rien dire sur les sujets, et `label:cr-chantier` rien dans la Mémoire.
 * Mélanger les épingles ferait un rail dont la moitié ne rend jamais rien.
 *
 * La surface range ; elle n'autorise pas. C'est `owner_id` qui autorise, et la
 * politique de la table n'a pas changé d'un caractère.
 */
export const SURFACE = { MEMOIRE: "memoire", SUJETS: "sujets" };

/**
 * La surface demandée, ramenée à celles qui existent.
 *
 * **La Mémoire par défaut, et ce n'est pas arbitraire** : c'est la valeur que
 * la base pose sur les lignes déjà écrites, qui viennent toutes de là.
 */
export function surfaceDe(valeur) {
  const dite = texte(valeur).toLowerCase();
  return Object.values(SURFACE).includes(dite) ? dite : SURFACE.MEMOIRE;
}

/**
 * Ce qu'une ligne de la base devient à l'écran.
 *
 * Le titre se recalcule quand il est vide : la requête fait office de nom, et
 * c'est elle qu'on reconnaît. La recopier en base à la création la laisserait
 * diverger de la requête qu'elle résume (règle 4).
 *
 * **C'est la seule traduction de cette table.** Tout ce qui la lit part de là,
 * et personne ne relit les colonnes de la base une seconde fois.
 */
export function recherchePourLEcran(ligne = {}) {
  const requete = texte(ligne.query);
  return {
    id: texte(ligne.id),
    titre: texte(ligne.title) || requete,
    requete,
    surface: surfaceDe(ligne.surface),
    // Ce qui habille une vue voyage tel quel : c'est `vues-des-sujets.js` qui
    // le ramène à ce que le jeu d'icônes connaît, et lui seul.
    description: texte(ligne.description),
    icone: texte(ligne.icon),
    couleur: texte(ligne.color),
    // **Enregistrée et épinglée sont deux choses.** Une vue vit sur son écran ;
    // elle ne monte au rail que lorsqu'on l'y met, parce que le rail est court
    // et qu'une vue de plus y coûte une place à celles qu'on regarde tous les
    // jours.
    auRail: ligne.rail === true,
    // Le compte qui l'a écrite et la dernière fois qu'elle a bougé, tels quels :
    // c'est l'écran qui met un nom sur un compte, lui seul connaissant le
    // trombinoscope du projet.
    creePar: texte(ligne.owner_id),
    miseAJour: texte(ligne.updated_at)
  };
}
