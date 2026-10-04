/**
 * Les onglets de la console d'administration.
 *
 * ## Deux onglets, et ce que la barre dit avant qu'on clique
 *
 * La console n'en a eu qu'un pendant plusieurs tours — le carburant —, et la
 * barre était quand même posée : elle disait, avant qu'on ait cliqué nulle part,
 * que cet écran est *un* écran parmi d'autres à venir. Sans elle, la page se lit
 * comme un tableau de bord complet, et l'on croit voir tout ce que la console
 * sait.
 *
 * **Les utilisateurs passent en premier**, et c'est un ordre, pas un rangement :
 * la première question d'exploitation est « qui est là », et tout le reste —
 * combien de matière, ce qui se reconnaît, ce qui se prédit — porte sur ce que
 * ces gens ont versé. Un onglet de comptes placé après les comptes du carburant
 * se lirait comme une annexe.
 *
 * ## Les onglets ne connaissent pas leurs rubriques
 *
 * C'est l'inverse : **chaque rubrique déclare son onglet**
 * (`les-rubriques-de-la-console.js`). Écrire la liste des rubriques ici *et*
 * là-bas en aurait fait deux, et celle qu'on ne relit jamais aurait fini par
 * ignorer une rubrique neuve — un onglet qui ne mène nulle part (règle 10).
 *
 * C'est aussi ce qui tient **une seule adresse pour un seul écran** : le fragment
 * nomme la rubrique, l'onglet s'en déduit. Un signet sur une rubrique ouvre donc
 * son onglet, et il n'y a pas d'état à accorder entre la barre et le rail.
 *
 * C'est la **même barre que côté utilisateur** — `project-tabs` —, avec les
 * mêmes classes. La console n'a aucune classe à elle : un écran d'administration
 * recalibré à la main se verrait comme une greffe.
 *
 * ## Il est pur
 *
 * Une clé entre, un onglet sort.
 */

/** Les onglets, nommés une fois, pour que personne n'écrive la clé à la main. */
export const ONGLET = {
  /** Qui est là : les comptes, et ce que chacun a fait. */
  UTILISATEURS: "utilisateurs",
  /** Ce que Mdall a reçu, et ce que cela permet. */
  CARBURANT: "carburant"
};

export const ONGLETS_DE_LA_CONSOLE = [
  { cle: ONGLET.UTILISATEURS, dit: "Utilisateurs", icone: "people" },
  { cle: ONGLET.CARBURANT, dit: "Carburant", icone: "fire" }
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

/** Un onglet entier — sa clé, son nom, son icône. */
export function longletDit(cle) {
  const valide = ongletDeLaConsoleValide(cle);
  return ONGLETS_DE_LA_CONSOLE.find((un) => un.cle === valide) ?? ONGLETS_DE_LA_CONSOLE[0];
}
