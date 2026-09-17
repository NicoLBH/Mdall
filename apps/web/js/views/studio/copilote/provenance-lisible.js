/**
 * D'où sort une entrée, en toutes lettres.
 *
 * ## Pourquoi la portée s'écrit là
 *
 * Une valeur de projet peut valoir par zone : deux escaliers d'un même ouvrage
 * ne sont pas classés pareil, un rez-de-chaussée commercial sous des logements
 * relève d'un autre régime que les étages. Jusqu'ici la réponse disait
 * « mémoire du projet » et s'arrêtait là — on lisait « 3e famille B » sans
 * savoir si c'était l'ouvrage entier ou l'escalier dont on venait de parler.
 *
 * **Une réponse qu'on ne peut pas situer ne se conteste pas.** Elle a l'air
 * juste, elle est peut-être juste, et personne ne peut le vérifier. La portée
 * s'écrit donc à côté de l'origine, du même mouvement.
 *
 * ## Pourquoi un fichier à part
 *
 * L'écran du Copilote parle à la base, et un module qui parle à la base ne
 * s'importe pas dans un test. Ce texte-ci n'a besoin que d'un objet.
 */

/** Ce que chaque origine se dit, en français. */
export const MOTS_DE_PROVENANCE = {
  memoire: "mémoire du projet",
  // Une réponse d'étude n'a pas été tranchée — personne ne l'a versée à la
  // mémoire, rien ne s'y appuie encore. Elle a pourtant un auteur : quelqu'un
  // l'a saisie dans l'Atelier pour ce bâtiment. Le mot le dit tel quel, sans la
  // hausser au rang de vérité du projet.
  etude: "étude du projet",
  dite: "dite ici",
  defaut: "valeur par défaut",
  utilitaire: "calculée par"
};

/**
 * La phrase d'une provenance : l'origine, ce qu'elle nomme, et sa portée.
 *
 * @param {object} source ce que rend `provenancesDesEntrees`
 * @returns {string} la phrase, ou `""` quand il n'y a rien à dire
 */
export function phraseDeLaProvenance(source = null) {
  const origine = String(source?.origine ?? "").trim();
  if (!origine) return "";

  const mot = MOTS_DE_PROVENANCE[origine] || origine;
  // « calculée par » appelle un complément : sans le nom de l'agent, la phrase
  // s'arrête au milieu.
  const suite = origine === "utilitaire" ? String(source?.detail ?? "").trim() : "";
  const portee = String(source?.portee ?? "").trim();

  // Le point médian sépare deux faits de nature différente — d'où elle vient,
  // et de quoi elle parle —, là où une virgule les aurait mis sur le même plan.
  return [[mot, suite].filter(Boolean).join(" "), portee].filter(Boolean).join(" · ");
}
