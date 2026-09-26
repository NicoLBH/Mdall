/**
 * Ce que le Copilote sait de vous quand il ne parle d'aucun projet.
 *
 * ## Le problème, posé à l'envers
 *
 * Le Copilote d'un projet hérite d'une mémoire : des affirmations tranchées, des
 * zones, un périmètre. Il ne devine pas, il lit. Sorti du projet, il n'a plus
 * rien — et un assistant sans matière **répond quand même**. C'est là qu'il
 * invente.
 *
 * Le contexte transversal n'est donc pas une mémoire diluée : c'est une
 * **description de la façon de travailler**, et une consigne explicite sur ce
 * qu'il ne sait pas.
 *
 * ## Ce qu'il porte
 *
 *  - **qui regarde**, et ses projets — leur nom, où ils en sont ;
 *  - **où le travail a lieu en ce moment** : le nombre de jours travaillés par
 *    projet, tel que l'accueil le calcule (`projets-actifs.js`). C'est ce qui
 *    permet de répondre « sur Chamonix, vous avez surtout… » sans rien inventer ;
 *  - **ce qu'on y fait** : discussions, propositions, études d'utilitaire. Trois
 *    verbes, qui disent le métier mieux qu'une phrase de présentation ;
 *  - **ce qu'il n'a pas**, dit en toutes lettres.
 *
 * ## Ce qu'il ne porte pas, et pourquoi c'est écrit dedans
 *
 * Aucune valeur d'aucun projet. Pas une altitude, pas un classement, pas un
 * degré coupe-feu. Un contexte qui mêlerait deux ou trois mémoires ferait
 * répondre sur l'un avec les chiffres de l'autre — et rien à l'écran ne le
 * dirait.
 *
 * Le texte le dit au modèle plutôt que de compter sur sa retenue : une consigne
 * absente se remplace par une invention plausible, c'est la leçon du catalogue
 * des utilitaires.
 */

import { GENRE, phraseDesJours, projetsLesPlusActifs } from "./projets-actifs.js";
import { sectionDeLetabli } from "./etabli-du-copilote.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce que chaque genre de trace dit du travail, en un mot. */
const VERBES = {
  [GENRE.DISCUSSION]: "des discussions avec le Copilote",
  [GENRE.PROPOSITION]: "des propositions déposées",
  [GENRE.ETUDE]: "des études d'agent"
};

/** Le jour d'une date, tel qu'on l'écrit dans une phrase. */
function leJour(quand = "") {
  const lu = Date.parse(texte(quand));
  if (!Number.isFinite(lu)) return "";
  return new Date(lu).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Le contexte d'une discussion qui n'est d'aucun projet.
 *
 * @param {object} options
 * @param {string} [options.nom] comment s'appelle qui regarde
 * @param {{id: string, name?: string, city?: string, currentPhase?: string}[]} [options.projets]
 * @param {object[]} [options.traces] celles de `projets-actifs-supabase.js`
 * @param {number} [options.maintenant]
 * @returns {{texte: string, lue: boolean}} la même forme qu'une mémoire de
 *   projet : l'appelant n'a pas à savoir laquelle des deux il envoie.
 */
export function profilDeTravail({
  nom = "", projets = [], traces = [], etabli = [], maintenant = Date.now()
} = {}) {
  const tous = Array.isArray(projets) ? projets : [];
  const nomsDesProjets = Object.fromEntries(
    tous.map((projet) => [texte(projet?.id), texte(projet?.name)])
  );

  const actifs = projetsLesPlusActifs({
    traces, nomsDesProjets, maintenant, combien: 8
  });

  const genres = new Set();
  for (const projet of actifs) for (const genre of projet.genres) genres.add(genre);

  const lignes = [
    "# Façon de travailler",
    "",
    "Cette discussion ne porte sur **aucun projet en particulier**.",
    ""
  ];

  if (texte(nom)) lignes.push(`La personne qui écrit s'appelle ${texte(nom)}.`, "");

  lignes.push(
    tous.length
      ? `Elle suit ${tous.length} projet${tous.length > 1 ? "s" : ""} :`
      : "Aucun projet ne lui est rattaché pour l'instant.",
    ""
  );

  for (const projet of tous) {
    const dit = [
      `- **${texte(projet?.name) || texte(projet?.id)}**`,
      texte(projet?.city) ? `— ${texte(projet.city)}` : "",
      texte(projet?.currentPhase) ? `— phase : ${texte(projet.currentPhase)}` : ""
    ].filter(Boolean).join(" ");
    lignes.push(dit);
  }

  if (actifs.length) {
    lignes.push(
      "",
      "## Où le travail a lieu en ce moment",
      "",
      // **Des jours, pas un score.** Un nombre sans unité ne se vérifie pas, et
      // le modèle le citerait tel quel.
      "Le nombre de jours distincts où cette personne a fait quelque chose sur "
        + "chaque projet, ces trois derniers mois :",
      ""
    );

    for (const projet of actifs) {
      const quand = leJour(projet.dernier);
      lignes.push(
        `- ${projet.nom} : ${phraseDesJours(projet.jours)}${quand ? `, en dernier le ${quand}` : ""}`
      );
    }
  }

  if (genres.size) {
    lignes.push(
      "",
      "## Ce qu'elle y fait",
      "",
      [...genres].map((genre) => VERBES[genre]).filter(Boolean).join(", ") + "."
    );
  }

  /**
   * **L'établi, avant « ce que tu n'as pas ».**
   *
   * L'ordre compte : la section suivante dit qu'aucune mémoire de projet n'est
   * jointe, et l'établi n'en est pas une — c'est ce que la personne a écrit
   * elle-même, qui ne vaut pour aucun chantier. Rangé après, il se lirait comme
   * une exception à une interdiction, ce qui est la pire façon de la dire.
   */
  const leSien = sectionDeLetabli(etabli);
  if (leSien) lignes.push("", leSien);

  lignes.push(
    "",
    "## Ce que tu n'as pas",
    "",
    // C'est le cœur du fichier. Sans cette section, un assistant sans matière
    // répond quand même — et c'est là qu'il invente.
    "**Aucune mémoire de projet n'est jointe à cette discussion.** Tu ne connais "
      + "ni les valeurs tranchées, ni les zones, ni les documents d'aucun de ces "
      + "projets. N'en cite aucune, même plausible.",
    "",
    "Si la question demande une valeur d'un projet — une altitude, un classement, "
      + "un degré coupe-feu, le contenu d'un document —, dis lequel ouvrir et "
      + "propose de continuer là-bas. Le Copilote d'un projet, lui, lit sa mémoire.",
    "",
    "Ce sur quoi tu peux répondre ici : l'organisation du travail, la méthode, "
      + "ce que l'application sait faire, ce que les listes ci-dessus disent, et "
      + "ce que les utilitaires de son établi concluent quand tu les lances."
  );

  return { texte: lignes.join("\n"), lue: true };
}
