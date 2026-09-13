/**
 * Cocher des sujets, et agir sur tous à la fois.
 *
 * ## Pourquoi c'est un besoin, et pas un confort
 *
 * Un compte rendu versé ouvre quarante sujets d'un coup. Les ranger un par un —
 * un label, un assigné, une situation — se paie quarante fois trois clics, et
 * personne ne le fait : on laisse les quarante sans label, et la recherche par
 * label ne sert plus à rien. Ce qui manque n'est pas un raccourci, c'est ce qui
 * rend le rangement possible du tout.
 *
 * ## La sélection ne survit pas à ce qu'on ne voit plus
 *
 * On coche trois sujets, on change de filtre, ils sortent de la liste. Agir sur
 * eux ensuite modifierait des sujets **qu'on n'a pas sous les yeux**, sur la foi
 * d'un clic d'il y a une minute — et l'on ne saurait même pas lesquels. La
 * sélection est donc ramenée à ce que la liste montre, à chaque rendu. Ce qui
 * disparaît de la liste sort de la sélection, en silence et sans dommage : on
 * n'a rien perdu qu'un coche.
 *
 * ## « Tout » veut dire la sélection filtrée, pas la page
 *
 * Cocher la case de tête prend **tout ce que la requête retient**, pas les
 * vingt-cinq lignes de la page affichée. C'est ce qu'on demande en cochant après
 * avoir filtré : « ces sujets-là ». Se limiter à la page ferait ranger un
 * cinquième du lot sans que rien ne le dise.
 *
 * ## Ce que ce module ne fait pas
 *
 * Il n'écrit rien, ne lit ni la base ni le store, et ne connaît aucun écran :
 * on lui donne une sélection et ce qui est visible, il rend la sélection
 * suivante. C'est l'écran qui applique.
 */

const texte = (valeur) => String(valeur ?? "").trim();

const liste = (valeurs) => [...new Set(
  (Array.isArray(valeurs) ? valeurs : []).map(texte).filter(Boolean)
)];

/**
 * Ce qu'on peut faire d'un lot de sujets.
 *
 * **Les cinq qui rangent, et rien d'autre.** Supprimer, fusionner, réassigner
 * un parent sont des gestes qui se regardent un par un : les offrir sur
 * quarante lignes d'un coup ferait un dommage qu'aucune annulation ne répare.
 */
export const GROUPE = {
  MARQUAGE: "marquage",
  LABELS: "labels",
  ASSIGNES: "assignes",
  SITUATIONS: "situations",
  OBJECTIFS: "objectifs"
};

export const NOMS_DU_GROUPE = {
  [GROUPE.MARQUAGE]: "Marquer comme",
  [GROUPE.LABELS]: "Labels",
  [GROUPE.ASSIGNES]: "Assigné à",
  [GROUPE.SITUATIONS]: "Situations",
  [GROUPE.OBJECTIFS]: "Objectifs"
};

/**
 * Les trois marquages, et l'action de l'écran qui leur répond.
 *
 * Ce sont **celles qui existent déjà** pour un sujet seul : un lot n'a pas ses
 * propres verbes, sans quoi fermer quarante sujets ne ferait pas la même chose
 * que fermer quarante fois un sujet (règle 10).
 *
 * « Non planifié » ferme sans rien conclure sur l'ouvrage : le fil n'avait pas
 * lieu d'être. « Fermé » dit que c'est fait. La différence compte à la
 * relecture, six mois plus tard, quand on cherche ce qui a été réglé.
 */
export const MARQUAGES = [
  { cle: "ouvert", nom: "Ouvert", action: "issue:reopen", icone: "issue-opened" },
  { cle: "ferme", nom: "Fermé", action: "issue:close:realized", icone: "check-circle" },
  { cle: "non-planifie", nom: "Non planifié", action: "issue:close:dismissed", icone: "skip" }
];

/** L'action d'un marquage, ou `""` si ce n'en est pas un. */
export function actionDuMarquage(cle) {
  return MARQUAGES.find((marquage) => marquage.cle === texte(cle))?.action ?? "";
}

/**
 * La sélection après un clic sur une ligne : cochée si elle ne l'était pas.
 */
export function selectionApresUnClic({ selection = [], id = "" } = {}) {
  const cle = texte(id);
  if (!cle) return liste(selection);

  const cochees = liste(selection);
  return cochees.includes(cle)
    ? cochees.filter((cochee) => cochee !== cle)
    : [...cochees, cle];
}

/**
 * La sélection après un clic sur la case de tête.
 *
 * Tout coché → on décoche tout. Sinon → on coche **tout ce que la requête
 * retient**, y compris ce qui est sur les pages suivantes.
 */
export function selectionApresLeTout({ selection = [], visibles = [] } = {}) {
  const tous = liste(visibles);
  return etatDeLaCaseDeTete({ selection, visibles }) === "toutes" ? [] : tous;
}

/**
 * Ce que la case de tête doit montrer : `aucune`, `partielle` ou `toutes`.
 *
 * La partielle n'est pas un détail : sans elle, une case vide sur une liste où
 * trois sujets sont cochés dirait que rien ne l'est, et l'on cliquerait pour
 * tout cocher en croyant ne rien défaire.
 */
export function etatDeLaCaseDeTete({ selection = [], visibles = [] } = {}) {
  const tous = liste(visibles);
  const cochees = selectionVisible({ selection, visibles });

  if (tous.length === 0 || cochees.length === 0) return "aucune";
  return cochees.length === tous.length ? "toutes" : "partielle";
}

/**
 * La sélection ramenée à ce que la liste montre.
 *
 * À appeler **à chaque rendu** : un sujet sorti de la liste par un changement
 * de filtre ne doit pas rester coché, sinon l'action de groupe le modifierait
 * sans qu'on l'ait sous les yeux.
 */
export function selectionVisible({ selection = [], visibles = [] } = {}) {
  const vus = new Set(liste(visibles));
  return liste(selection).filter((cochee) => vus.has(cochee));
}

/**
 * Ce qu'on dit d'une sélection, en une phrase.
 *
 * Le nombre est **ce qui va être modifié** : c'est la seule chose qu'on
 * regarde avant de cliquer une action de groupe.
 */
export function phraseDeLaSelection(combien = 0) {
  const nombre = Math.max(0, Number(combien) || 0);
  if (nombre === 0) return "";
  return `${nombre} sujet${nombre > 1 ? "s" : ""} sélectionné${nombre > 1 ? "s" : ""}`;
}
