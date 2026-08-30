/**
 * La minuscule initiale, sauf sur un sigle.
 *
 * « Rapport RICT » devient « rapport RICT » au fil d'une phrase ; « RVRAT » reste
 * « RVRAT ». D'où la garde sur deux majuscules initiales — et d'où, surtout, le
 * fait qu'on ne touche qu'au premier caractère : minusculiser tout le libellé
 * transformerait « Rapport initial (RICT) » en « rapport initial (rict) ».
 */
export function lowerFirst(value) {
  const text = String(value ?? "");
  if (text === "" || /^\p{Lu}\p{Lu}/u.test(text)) return text;
  return `${text.charAt(0).toLocaleLowerCase("fr")}${text.slice(1)}`;
}
