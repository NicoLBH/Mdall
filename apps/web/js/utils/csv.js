/**
 * Un tableau, écrit pour être relu ailleurs.
 *
 * Le CSV n'est pas un format d'affichage, c'est un format de **transport** :
 * l'utilisateur l'ouvre dans un tableur, le colle dans un ticket, l'envoie à
 * quelqu'un qui n'a pas Mdall. Trois décisions le rendent lisible là-bas :
 *
 *  - **le point-virgule** sépare les colonnes. La virgule est le séparateur
 *    décimal en français : un tableur français lirait « 0,85 » comme deux
 *    colonnes, et couperait toutes les lignes au mauvais endroit.
 *  - **la BOM** ouvre le fichier. Sans elle, Excel lit l'UTF-8 comme du
 *    latin-1 et affiche « rÃ©serve » — les accents sont dans presque toutes
 *    nos phrases.
 *  - **le guillemet en tête** neutralise ce qu'un tableur prendrait pour une
 *    formule. Une observation qui commence par « = » n'est pas un calcul, et
 *    un fichier exporté ne doit pas pouvoir exécuter quoi que ce soit chez
 *    celui qui l'ouvre.
 */

/** Ce qui dit à un tableur que le fichier est en UTF-8. */
export const CSV_BOM = "﻿";

const SEPARATOR = ";";

/**
 * Ce qu'un tableur pourrait prendre pour une formule.
 *
 * Le signe moins est exclu quand il ouvre un nombre : « -3 » est une valeur,
 * pas une injection, et le préfixer transformerait un compte en texte.
 */
function ressembleAUneFormule(texte) {
  if (/^[=+@\t\r]/.test(texte)) return true;
  return texte.startsWith("-") && !/^-\d/.test(texte);
}

/** Une cellule, échappée pour ce que le CSV interdit. */
export function csvCell(value) {
  if (value === null || value === undefined) return "";

  const brut = value instanceof Date ? value.toISOString() : String(value);
  const texte = ressembleAUneFormule(brut) ? `'${brut}` : brut;

  if (!/[";\r\n]/.test(texte)) return texte;
  return `"${texte.replace(/"/g, '""')}"`;
}

/**
 * Un tableau de lignes, en CSV.
 *
 * @param {{key: string, label: string}[]} columns les colonnes, dans l'ordre
 * @param {object[]} rows les lignes, lues par la clé des colonnes
 * @returns {string} le fichier, BOM comprise
 */
export function toCsv(columns = [], rows = []) {
  const colonnes = (Array.isArray(columns) ? columns : []).map((column) =>
    typeof column === "string" ? { key: column, label: column } : { key: String(column?.key ?? ""), label: String(column?.label ?? column?.key ?? "") }
  );

  const entete = colonnes.map((column) => csvCell(column.label)).join(SEPARATOR);
  const lignes = (Array.isArray(rows) ? rows : []).map((row) =>
    colonnes.map((column) => csvCell(row?.[column.key])).join(SEPARATOR)
  );

  // La ligne finale se termine par un saut : certains outils avalent la
  // dernière ligne d'un fichier qui n'en a pas.
  return `${CSV_BOM}${[entete, ...lignes].join("\r\n")}\r\n`;
}
