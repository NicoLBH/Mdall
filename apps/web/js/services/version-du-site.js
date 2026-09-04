/**
 * Quelle version de l'application est servie.
 *
 * ## Pourquoi ce fichier existe
 *
 * Un défaut corrigé et un défaut persistant se ressemblent parfaitement quand
 * la page servie n'est pas celle qu'on croit : le correctif est en ligne, le
 * navigateur sert l'ancien script, et l'on conclut que rien n'a changé. Cette
 * confusion coûte un aller-retour entier — un test refait, un rapport écrit,
 * une correction cherchée là où il n'y a rien à corriger.
 *
 * Le déploiement écrit `build.json` à la racine du site. Ce fichier le lit une
 * fois, sans jamais faire échouer quoi que ce soit : en développement local il
 * n'existe pas, et « développement local » est une réponse aussi utile qu'un
 * numéro de version.
 */

let promesse = null;

/** La version servie, ou une description de son absence. */
export function versionDuSite() {
  if (!promesse) {
    promesse = fetch("build.json", { cache: "no-store" })
      .then((reponse) => (reponse.ok ? reponse.json() : null))
      .then((lu) => (lu?.court
        ? { court: String(lu.court), commit: String(lu.commit ?? ""), le: String(lu.le ?? "") }
        : null))
      .catch(() => null);
  }
  return promesse;
}

/** La même chose, en une ligne lisible. */
export async function versionLisible() {
  const lu = await versionDuSite();
  if (!lu) return "développement local (pas de build.json)";
  return `${lu.court}${lu.le ? ` — déployé le ${new Date(lu.le).toLocaleString("fr-FR")}` : ""}`;
}
