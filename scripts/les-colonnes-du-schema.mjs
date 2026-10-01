/**
 * **Ce que le schéma déclare vraiment comme colonnes.**
 *
 * ## Le défaut que ce lecteur existe pour attraper
 *
 * La lecture des comptes rendus au serveur écrivait ses lignes de proposition
 * ainsi :
 *
 *     { proposition_id, project_id, ...item }
 *
 * `item` porte `itemType` et `itemKey` — des noms de JavaScript. Les colonnes
 * s'appellent `item_type` et `item_key`. Chaque insertion était refusée, en
 * silence : trois comptes rendus ont donné deux propositions **vides**.
 *
 * Et la liste des sujets d'un projet se demandait à `project_subjects`, une
 * table qui n'existe pas : la confrontation se faisait donc sur rien.
 *
 * Aucune épreuve de JavaScript ne pouvait le voir, parce qu'**aucune n'avait la
 * base**. Un bouchon écrit à la main aurait accepté `itemType` avec autant de
 * bonne volonté que PostgREST en a eu peu.
 *
 * ## Ce qu'il fait, et ce qui le rend utile
 *
 * Il lit les **migrations** — la seule déclaration qui fasse foi — et rend, par
 * table, l'ensemble de ses colonnes. Confronter à cela n'est pas confronter à
 * une copie de nos hypothèses : c'est confronter à ce que la base aura.
 *
 * Il tient compte des `alter table … add column`, parce que la moitié des
 * colonnes d'une table de huit mois arrive par là.
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS = path.join(RACINE, "supabase", "migrations");

/**
 * Les mots qui ouvrent une ligne de `create table` sans nommer de colonne.
 *
 * Sans eux, `constraint`, `primary` ou `unique` entreraient comme colonnes et le
 * banc accepterait n'importe quel nom qui leur ressemble.
 */
const PAS_UNE_COLONNE = new Set([
  "constraint", "primary", "unique", "foreign", "check", "exclude", "like"
]);

/** Le corps d'un `create table`, parenthèses équilibrées. */
function leCorps(texte, depart) {
  let profondeur = 0;
  for (let i = depart; i < texte.length; i += 1) {
    if (texte[i] === "(") profondeur += 1;
    else if (texte[i] === ")") {
      profondeur -= 1;
      if (profondeur === 0) return texte.slice(depart + 1, i);
    }
  }
  return "";
}

/** Découper un corps de table sur les virgules de premier niveau. */
function lesLignes(corps) {
  const lignes = [];
  let profondeur = 0;
  let courante = "";
  for (const caractere of corps) {
    if (caractere === "(") profondeur += 1;
    if (caractere === ")") profondeur -= 1;
    if (caractere === "," && profondeur === 0) { lignes.push(courante); courante = ""; continue; }
    courante += caractere;
  }
  lignes.push(courante);
  return lignes;
}

/** Une source SQL sans ses commentaires `--`, qui citent souvent des colonnes. */
function sansCommentaires(sql) {
  return String(sql ?? "").split("\n").map((ligne) => {
    const ou = ligne.indexOf("--");
    return ou === -1 ? ligne : ligne.slice(0, ou);
  }).join("\n");
}

/**
 * Les colonnes déclarées par un lot de migrations, par table.
 *
 * @returns {Map<string, Set<string>>} `{"proposition_items" => {"id", …}}`
 */
export function lesColonnesDeclarees(sources = []) {
  const tables = new Map();
  const poser = (table, colonne) => {
    if (!table || !colonne) return;
    if (!tables.has(table)) tables.set(table, new Set());
    tables.get(table).add(colonne);
  };

  for (const brut of sources) {
    const sql = sansCommentaires(brut);

    const creations = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z0-9_]+)\s*\(/gi;
    for (const trouve of sql.matchAll(creations)) {
      const corps = leCorps(sql, trouve.index + trouve[0].length - 1);
      for (const ligne of lesLignes(corps)) {
        const mot = ligne.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
        if (!mot || PAS_UNE_COLONNE.has(mot)) continue;
        poser(trouve[1].toLowerCase(), mot);
      }
    }

    // `alter table t add column if not exists a type, add column … b type;`
    // `if exists` et `only` sont des mots de PostgreSQL, pas des noms de table.
    // Les oublier faisait manquer `subject_number`, arrivé par un `alter table if
    // exists` — et le banc aurait alors accepté une colonne absente.
    const alterations =
      /alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?([a-z0-9_]+)([\s\S]*?);/gi;
    for (const trouve of sql.matchAll(alterations)) {
      const table = trouve[1].toLowerCase();
      const ajouts = /add\s+column\s+(?:if\s+not\s+exists\s+)?([a-z0-9_]+)/gi;
      for (const ajout of trouve[2].matchAll(ajouts)) poser(table, ajout[1].toLowerCase());
    }
  }

  return tables;
}

/** Les migrations du dépôt, dans l'ordre où elles s'appliquent. */
export function lesMigrations(dossier = MIGRATIONS) {
  return readdirSync(dossier)
    .filter((nom) => nom.endsWith(".sql"))
    .sort()
    .map((nom) => readFileSync(path.join(dossier, nom), "utf8"));
}

/** Le schéma du dépôt, tel que les migrations le déclarent. */
export function leSchema(dossier = MIGRATIONS) {
  return lesColonnesDeclarees(lesMigrations(dossier));
}
