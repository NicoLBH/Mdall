/**
 * Combien de temps cela a duré, **dit comme on le dirait**.
 *
 * ## Le défaut qu'on répare
 *
 * L'écran affichait « 681 ms ». Personne ne sait combien cela fait : ce n'est
 * pas une durée pour un lecteur, c'est une mesure pour une machine. Un
 * conducteur de travaux veut savoir si son dépôt a pris un instant, une minute
 * ou une heure — pas combien de millièmes de seconde.
 *
 * En dessous de la seconde, on dit donc « moins d'une seconde ». C'est ce qu'on
 * voulait savoir, et c'est tout ce qu'on voulait savoir.
 *
 * ## Elle vivait à deux endroits
 *
 * Mot pour mot, dans l'écran des Actions et dans celui des Indicateurs
 * (règle 4). Les deux affichaient donc « 681 ms », et corriger l'un aurait
 * laissé l'autre — avec une moyenne en millisecondes à côté d'une durée en
 * minutes, sans que rien ne le dise.
 *
 * ## Une durée absente n'est pas une durée nulle
 *
 * `null` n'est pas zéro. Sans ce test, `Number(null)` vaut 0 et une exécution
 * dont la durée n'a jamais été mesurée s'affiche « 0 ms » — instantanée. Elle
 * est absente, et le tiret le dit.
 */

/** Le tiret de ce qu'on ne sait pas. */
export const PAS_DE_DUREE = "—";

/**
 * @param {number|string|null|undefined} valeur des millisecondes
 * @returns {string} la durée telle qu'elle se lit
 */
export function dureeDite(valeur) {
  if (valeur === null || valeur === undefined || valeur === "") return PAS_DE_DUREE;

  const ms = Number(valeur);
  if (!Number.isFinite(ms)) return PAS_DE_DUREE;
  if (ms < 0) return PAS_DE_DUREE;

  // **Sous la seconde, le chiffre n'apprend rien.** « 681 ms » et « 12 ms » se
  // lisent pareil : c'est allé vite.
  if (ms < 1000) return "moins d'une seconde";

  const secondes = Math.round(ms / 1000);
  if (secondes < 60) return `${secondes} ${secondes > 1 ? "secondes" : "seconde"}`;

  const minutes = Math.floor(secondes / 60);
  const resteDesSecondes = secondes % 60;

  if (minutes < 60) {
    return resteDesSecondes > 0
      ? `${minutes} min ${resteDesSecondes} s`
      : `${minutes} ${minutes > 1 ? "minutes" : "minute"}`;
  }

  const heures = Math.floor(minutes / 60);
  const resteDesMinutes = minutes % 60;

  return resteDesMinutes > 0
    ? `${heures} h ${resteDesMinutes} min`
    : `${heures} ${heures > 1 ? "heures" : "heure"}`;
}
