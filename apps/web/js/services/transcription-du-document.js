/**
 * La transcription d'un document, telle qu'on la relit.
 *
 * ## Ce qui existait, et ce qui manquait
 *
 * Un compte rendu rangé par l'Atelier porte déjà sa transcription : la colonne
 * `transcription_markdown` est écrite au moment où le PDF entre dans Fichiers.
 * **Rien ne la relisait.** Elle était en base, et nulle part à l'écran : on
 * repayait une restitution pour revoir ce qu'on avait déjà.
 *
 * ## Pourquoi un fichier de code, et non du Markdown rendu
 *
 * Parce que ce n'est **pas** un document à lire : c'est **ce que le modèle a
 * compris du PDF**, et on l'ouvre pour le comparer à la page. Rendu en HTML, il
 * se lit comme un document du projet — un titre devient un titre, un tableau
 * devient un tableau — et l'on ne voit plus ce qui a été ajouté, déplacé ou
 * inventé. C'est exactement ce qu'on vient vérifier.
 *
 * Numéroté, il se cite aussi : « ligne 214 » désigne un endroit, ce qu'une page
 * rendue ne permet pas.
 *
 * ## Une transcription qu'on n'a pas lue n'est pas une absence
 *
 * `null` quand la lecture n'a pas abouti, `""` quand le document n'en a pas.
 * « Ce document n'a jamais été transcrit » et « je n'ai pas su lire » demandent
 * deux gestes différents (règle 5).
 *
 * ## Il est pur
 *
 * Il reçoit une ligne de document et rend une lecture. Aucun réseau.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les lignes d'un fichier, numérotées à partir de 1.
 *
 * **Les lignes vides sont gardées.** Elles séparent les blocs d'un Markdown, et
 * les retirer décalerait tous les numéros — un renvoi à « la ligne 214 » ne
 * tomberait plus au même endroit selon qui compte.
 *
 * Les trois fins de ligne se valent : un Markdown venu d'un modèle peut porter
 * des `\r\n`, et couper sur `\n` seul laisserait un `\r` en bout de chaque
 * ligne, invisible et qui décale l'affichage d'un caractère.
 */
export function lignesDuFichier(contenu = "") {
  const tout = String(contenu ?? "");
  if (!tout) return [];

  return tout.replace(/\r\n?/g, "\n").split("\n")
    .map((lu, rang) => ({ rang: rang + 1, lu }));
}

/**
 * La transcription d'un document — ou `null` s'il n'y en a pas.
 *
 * @param {object|null} document la ligne du document, telle que la base la rend
 * @returns {{markdown: string, lignes: object[], quand: string, empreinte: string}|null}
 */
export function transcriptionDuDocument(document = null) {
  const markdown = String(document?.transcription_markdown ?? "");
  if (!texte(markdown)) return null;

  return {
    markdown,
    lignes: lignesDuFichier(markdown),
    // Quand elle a été faite : une transcription vieille de six mois sur un
    // document redéposé depuis ne dit plus ce que le PDF porte, et la date est
    // la seule chose qui permette de s'en apercevoir.
    quand: texte(document?.transcribed_at),
    // L'empreinte du texte d'où elle vient : c'est elle qui dit si elle
    // correspond encore au document, et non la date.
    empreinte: texte(document?.content_fingerprint)
  };
}

/**
 * Ce qu'on dit en tête de la transcription.
 *
 * Le nombre de lignes **et** la date. Le nombre seul ne dit pas si elle est
 * fraîche ; la date seule ne dit pas ce qu'il y a à lire.
 */
export function phraseDeLaTranscription(transcription = null) {
  if (!transcription) return "";

  const combien = transcription.lignes.length;
  const lignes = combien === 1 ? "1 ligne" : `${combien} lignes`;
  if (!transcription.quand) return `${lignes}, date inconnue`;

  const lu = Date.parse(transcription.quand);
  if (!Number.isFinite(lu)) return `${lignes}, date inconnue`;

  const quand = new Date(lu)
    .toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return `${lignes}, transcrit le ${quand}`;
}

/** Le nom qu'on donne à la transcription d'un fichier. */
export function nomDeLaTranscription(document = null) {
  const nom = texte(document?.original_filename) || texte(document?.filename) || "document";
  return `${nom.replace(/\.[a-z0-9]{1,6}$/i, "")}.md`;
}
