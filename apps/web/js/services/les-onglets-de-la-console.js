/**
 * Les onglets de la console d'administration.
 *
 * ## Pourquoi un seul, et pourquoi quand même une barre
 *
 * La console n'a qu'un écran : **le carburant**. Une barre d'onglets pour un
 * onglet paraît de trop, et c'est pourtant le bon moment pour la poser : elle
 * dit, avant qu'on ait cliqué nulle part, que cet écran est *un* écran parmi
 * d'autres à venir. Sans elle, la page se lit comme un tableau de bord complet,
 * et l'on croit voir tout ce que la console sait.
 *
 * C'est la **même barre que côté utilisateur** — `project-tabs` —, avec les
 * mêmes classes. La console n'a aucune classe à elle : un écran d'administration
 * recalibré à la main se verrait comme une greffe.
 *
 * ## Il est pur
 *
 * Une clé entre, un onglet sort.
 */

export const ONGLETS_DE_LA_CONSOLE = [
  { cle: "carburant", dit: "Carburant", icone: "fire" }
];

export const ONGLET_PAR_DEFAUT = ONGLETS_DE_LA_CONSOLE[0].cle;

/**
 * L'onglet demandé, ramené à l'un de ceux qui existent.
 *
 * **Une clé inconnue ouvre le premier**, elle ne laisse pas la page vide : une
 * adresse gardée en favori vers un onglet retiré doit mener quelque part,
 * plutôt que sur un blanc qu'on prendrait pour une panne.
 */
export function ongletDeLaConsoleValide(cle) {
  const dit = String(cle ?? "").trim();
  return ONGLETS_DE_LA_CONSOLE.some((un) => un.cle === dit) ? dit : ONGLET_PAR_DEFAUT;
}
