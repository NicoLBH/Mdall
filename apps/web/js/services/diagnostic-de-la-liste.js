/**
 * L'état de la liste des sujets, copiable d'un clic.
 *
 * ## Pourquoi ceci existe
 *
 * Le filtre « Fermés » annonce trois sujets et n'en montre aucun. Trois tours
 * y ont été consacrés, et chaque maillon a été vérifié **isolément** : l'état
 * se met à jour et survit aux relectures, le bouton porte son attribut, le
 * tableau applique le filtre et compte exactement comme il liste. Chacun est
 * juste ; ensemble, ils rendent une liste vide.
 *
 * Ce qui manque n'est pas une idée de plus : ce sont **les nombres du moment**.
 * Combien de sujets sont chargés, combien passent chaque filtre, ce que la
 * pagination en garde, et — la question qui tranche — ce que les trois sujets
 * comptés comme fermés portent réellement comme statut.
 *
 * ## Ce que ce fichier fait, et ne fait pas
 *
 * Il **met en forme**. Il ne mesure rien : les nombres lui sont donnés par
 * l'écran, qui seul peut les prendre au moment où il dessine. C'est ce qui le
 * rend testable, et ce qui fait qu'il ne peut pas mentir — il ne sait rien.
 *
 * Il ne sort **aucun nom de personne**, aucune adresse, aucun contenu de sujet
 * au-delà de son titre : ce texte part dans un presse-papiers, puis dans un
 * message, et un diagnostic qui emporte le contenu d'un chantier au passage
 * serait un diagnostic qu'on ne peut pas envoyer.
 *
 * ## Il reste après le diagnostic
 *
 * Une liste qui ne montre pas ce qu'elle compte est le genre de défaut qui
 * revient. Le bouton reste donc : c'est ce qui permet, la prochaine fois, de
 * dire en une fois ce qu'il a fallu trois tours à deviner.
 */

const texte = (valeur) => String(valeur ?? "").trim();
/**
 * Un nombre, ou `null`.
 *
 * `Number(null)` vaut `0`, et `Number.isFinite(0)` vaut `true` : une mesure
 * absente ressortait donc « 0 ». Dans un diagnostic, c'est la pire confusion
 * possible — « je n'ai pas pu mesurer » et « il y en a zéro » envoient chercher
 * à deux endroits différents (règle 5).
 */
const nombre = (valeur) => {
  if (valeur === null || valeur === undefined || valeur === "") return null;
  const lu = Number(valeur);
  return Number.isFinite(lu) ? lu : null;
};

/** Un nombre, ou l'aveu qu'on ne l'a pas. Ne pas savoir se dit (règle 5). */
const dit = (valeur) => (nombre(valeur) === null ? "?" : String(nombre(valeur)));

/**
 * Ce qu'un sujet dit de lui-même, réduit à ce qui sert au diagnostic.
 *
 * Le titre est tronqué : il sert à reconnaître la ligne, pas à la lire. Et il
 * n'y a que le titre — pas la description, pas les assignés, pas les
 * commentaires.
 */
function ligneDeSujet(sujet = {}) {
  return [
    `  · ${texte(sujet.id).slice(0, 8) || "sans-id"}`,
    `status=${texte(sujet.status) || "∅"}`,
    `effectif=${texte(sujet.effectif) || "∅"}`,
    `« ${texte(sujet.titre).slice(0, 60)} »`
  ].join(" ");
}

/**
 * L'état de la liste, en texte.
 *
 * @param {object} etat ce que l'écran a mesuré en dessinant
 * @returns {string} de quoi coller dans un message
 */
export function diagnosticDeLaListeDesSujets(etat = {}) {
  const {
    statut = "", priorite = "", recherche = "", tri = "",
    comptes = {}, charges = null, apresFiltres = null, affiches = null, lignes = null,
    pagination = {}, sousVue = "", tableSeule = null,
    etatBrut = {}, fermes = []
  } = etat;

  const lignesDuTexte = [
    "Mdall — état de la liste des sujets",
    `relevé le ${new Date().toISOString()}`,
    "",
    `filtre statut    : ${texte(statut) || "?"}`,
    `filtre priorité  : ${texte(priorite) || "—"}`,
    `recherche        : ${texte(recherche) ? `« ${texte(recherche)} »` : "—"}`,
    `tri              : ${texte(tri) || "ordre du projet"}`,
    `sous-vue         : ${texte(sousVue) || "?"} · tableSeule=${tableSeule === null ? "?" : String(!!tableSeule)}`,
    "",
    `comptés          : ${dit(comptes.open)} ouverts, ${dit(comptes.closed)} fermés`,
    `sujets chargés   : ${dit(charges)}`,
    `après filtres    : ${dit(apresFiltres)}`,
    `après pagination : ${dit(affiches)}`,
    `lignes rendues   : ${dit(lignes)}`,
    "",
    `pagination       : page ${dit(pagination.currentPage)}/${dit(pagination.totalPages)}`
      + ` · ${dit(pagination.pageSize)} par page`
      + ` · [${dit(pagination.startIndex)}, ${dit(pagination.endIndex)}[`,
    "",
    "où le filtre est écrit :",
    ...Object.entries(etatBrut).map(([cle, valeur]) => `  ${cle} = ${texte(valeur) || "∅"}`)
  ];

  // La question qui tranche : ce que portent les sujets que le compteur trouve
  // fermés. Si la liste est vide alors qu'ils sont là, le défaut est dans le
  // rendu ; s'ils n'y sont pas, il est dans la lecture du statut.
  if (Array.isArray(fermes) && fermes.length) {
    lignesDuTexte.push("", `les ${fermes.length} sujets comptés fermés :`, ...fermes.map(ligneDeSujet));
  } else {
    lignesDuTexte.push("", "aucun sujet compté fermé n'a pu être relevé.");
  }

  return lignesDuTexte.join("\n");
}
