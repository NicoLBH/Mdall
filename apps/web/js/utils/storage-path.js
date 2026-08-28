/**
 * Les deux règles qui font qu'un fichier se retrouve.
 *
 * Elles sont ici, séparées de tout accès réseau, parce que ce sont elles qui
 * cassent en silence : un nom mal assaini fait échouer un dépôt, un chemin mal
 * encodé fait déclarer introuvable un fichier qui est là. Dans les deux cas
 * l'erreur ne se voit qu'au bout de la chaîne, et n'accuse pas le bon coupable.
 */

/**
 * Le nom sous lequel un fichier est écrit dans le stockage.
 *
 * Les accents sont dépliés puis retirés, et tout ce qui n'est pas alphanumérique
 * devient un tiret. Le nom d'origine, lui, n'est pas perdu : il reste dans
 * `original_filename`, et c'est celui-là qu'on affiche.
 */
export function sanitizeFileName(fileName = "document.pdf") {
  const safe = String(fileName || "document.pdf")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return safe || "document.pdf";
}

/**
 * Un chemin de stockage, segment par segment, pour l'URL.
 *
 * Les séparateurs restent des séparateurs — encoder le chemin entier
 * transformerait `/` en `%2F` et désignerait un tout autre objet. Chaque segment
 * est encodé isolément.
 */
export function encodeStoragePath(path = "") {
  return String(path || "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}
