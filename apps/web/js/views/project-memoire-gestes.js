/**
 * Ce que les deux menus de la Mémoire proposent.
 *
 * ## Pourquoi un fichier à part
 *
 * L'écran de la Mémoire parle à la base, et un module qui parle à la base ne
 * s'importe pas dans un test : l'import lève avant la première ligne. Ces deux
 * listes, elles, n'ont besoin de rien — séparées, elles s'exécutent, et l'on
 * regarde ce qui sort.
 *
 * Et il y a de quoi regarder : une entrée qui disparaît d'un menu ne laisse
 * aucune trace. L'écran se dessine, le menu s'ouvre, il a l'air complet — et
 * « Reconstruire les liens du raisonnement », qu'on utilise trois fois par an,
 * n'existe plus. C'est le genre de perte qu'on ne découvre que le jour où l'on
 * en a besoin.
 *
 * ## Deux menus, et la frontière entre eux
 *
 * **« Ajouter » écrit ou sort la mémoire** : déclarer, verser, reconstruire,
 * exporter, copier. **« Affichage » ne fait que regarder** : la liste, ou le
 * cerveau. La ligne du titre porte le premier, celle de la recherche le second
 * — on cherche, on filtre, et l'on choisit sous quelle forme lire ce qui reste.
 *
 * Ils étaient quatre boutons sur la ligne du titre, et le titre d'une lecture
 * filtrée peut faire trente caractères : le rang débordait sur le rail, et rien
 * ne s'alignait avec le tableau en dessous.
 */

/**
 * Les gestes du menu « Ajouter », dans l'ordre où il les propose.
 *
 * L'export est éteint quand il n'y a rien à sortir : un fichier vide se
 * comprend mal, et l'on cherche longtemps ce qu'on a mal filtré.
 *
 * @param {object} options
 * @param {number} [options.total] ce que la mémoire tient en tout
 * @param {boolean} [options.busy] un écrit est en cours
 */
export function gestesDAjout({ total = 0, busy = false } = {}) {
  const rienASortir = total === 0 || busy;

  return [
    { action: "declarer", label: "Déclarer une hypothèse", disabled: busy },
    { separator: true },
    { action: "verser:site", label: "Verser les contraintes du site", disabled: busy },
    { separator: true },
    {
      action: "verser:lectures",
      label: "Reconstruire les liens du raisonnement",
      disabled: busy,
      // **Ce n'est pas un versement** : rien n'entre en mémoire. C'est une
      // relecture de ce que les règles disent déjà, écrite là où elle se
      // compte. Elle est dans ce menu parce que c'est le même geste — rendre
      // explicite ce qui était implicite — et parce qu'elle écrit.
      title: "Relit ce que chaque règle a lu, et l'enregistre avec son rang et sa zone. "
        + "Les liens résolus après coup sont marqués comme tels."
    },
    { separator: true },
    { action: "export:json", label: "Exporter en JSON", disabled: rienASortir },
    { action: "export:csv", label: "Exporter en CSV", disabled: rienASortir },
    // Copier le dossier de contexte est un export lui aussi : un fichier qu'on
    // relit d'un côté, une prose qu'on colle de l'autre, mais le même geste —
    // sortir la mémoire.
    { action: "export:contexte", label: "Copier le dossier de contexte", disabled: rienASortir }
  ];
}

/**
 * Les deux façons de regarder la même sélection.
 *
 * **« Liste » est éteinte** : c'est ce qu'on regarde déjà. Elle est là pour
 * dire qu'il y en a deux et laquelle est ouverte — le cerveau s'ouvre
 * par-dessus la liste et se referme sur elle, il n'y a pas de troisième écran.
 *
 * L'usage vient de `services/usages-du-rejeu.js` plutôt que d'être écrit ici :
 * la liste des usages dit déjà lequel vit dans la Mémoire, et le récrire ferait
 * deux vérités à tenir (règle 4). Un usage que le moteur ne sert pas encore
 * s'éteint, plutôt que de promettre ce qu'il ne fait pas (règle 5).
 *
 * @param {object} options
 * @param {{quoi?: string}|null} options.usage l'usage du cerveau, ou `null`
 * @param {string} options.libelle son nom, tel que les usages le disent
 * @param {boolean} [options.servi] le moteur le sert-il déjà
 * @param {boolean} [options.busy]
 */
export function gestesDAffichage({ usage = null, libelle = "", servi = false, busy = false } = {}) {
  if (!usage) return [];

  return [
    {
      action: "affichage:liste",
      label: "Liste",
      disabled: true,
      title: "Ce que vous regardez : la sélection, ligne par ligne."
    },
    {
      action: "affichage:cerveau",
      label: libelle,
      disabled: busy || !servi,
      title: String(usage.quoi ?? "")
    }
  ];
}
