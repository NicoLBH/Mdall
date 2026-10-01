/**
 * **Les mots que PostgreSQL ne laisse pas servir de nom.**
 *
 * ## Le défaut, et il a refusé un déploiement
 *
 * Une migration ajoutait une colonne `analyse`. Elle a été refusée :
 *
 *     ERROR: syntax error at or near "analyse" (SQLSTATE 42601)
 *
 * `ANALYSE` est un mot **réservé** — l'orthographe britannique d'`ANALYZE` —, et
 * un mot réservé ne peut pas nommer une colonne sans guillemets. Rien ne le
 * disait : le mot est français, il est ordinaire, et le banc qui relit les
 * migrations lisait du **texte**, pas du SQL.
 *
 * Le prix se paie au déploiement, c'est-à-dire au pire moment : la migration
 * s'arrête à mi-chemin, et il faut une nouvelle livraison pour un nom.
 *
 * ## Pourquoi une liste ici, et pas une question à PostgreSQL
 *
 * La question se pose **dans l'intégration continue**, qui n'a pas de serveur
 * PostgreSQL. Une épreuve qui en demanderait un s'ignorerait là où elle sert :
 * juste avant le déploiement.
 *
 * La liste est donc écrite, et **confrontée au serveur quand il y en a un** —
 * `le-banc-des-politiques` le fait, avec `pg_get_keywords()`. Une liste écrite
 * et jamais vérifiée dérive (règle 4) ; celle-ci ne peut pas.
 *
 * ## Les deux catégories, et pourquoi les deux
 *
 * `R` — réservé. `T` — réservé, mais utilisable comme nom de fonction ou de
 * type. Ni l'un ni l'autre ne peut nommer une colonne : ne garder que `R`
 * laisserait passer la moitié du problème.
 *
 * Relevés sur PostgreSQL 16.
 */

/** Les mots réservés de PostgreSQL 16 — catégories `R` et `T`. */
export const LES_MOTS_RESERVES = new Set([
  "all", "analyse", "analyze", "and", "any", "array",
  "as", "asc", "asymmetric", "authorization", "binary", "both",
  "case", "cast", "check", "collate", "collation", "column",
  "concurrently", "constraint", "create", "cross", "current_catalog", "current_date",
  "current_role", "current_schema", "current_time", "current_timestamp", "current_user", "default",
  "deferrable", "desc", "distinct", "do", "else", "end",
  "except", "false", "fetch", "for", "foreign", "freeze",
  "from", "full", "grant", "group", "having", "ilike",
  "in", "initially", "inner", "intersect", "into", "is",
  "isnull", "join", "lateral", "leading", "left", "like",
  "limit", "localtime", "localtimestamp", "natural", "not", "notnull",
  "null", "offset", "on", "only", "or", "order",
  "outer", "overlaps", "placing", "primary", "references", "returning",
  "right", "select", "session_user", "similar", "some", "symmetric",
  "system_user", "table", "tablesample", "then", "to", "trailing",
  "true", "union", "unique", "user", "using", "variadic",
  "verbose", "when", "where", "window", "with"
]);

/**
 * Ce mot peut-il nommer une colonne ou une table ?
 *
 * La comparaison est **insensible à la casse** : PostgreSQL replie les
 * identifiants non guillemetés en minuscules, et `ANALYSE` est refusé comme
 * `analyse`.
 */
export function cestUnMotReserve(mot = "") {
  return LES_MOTS_RESERVES.has(String(mot ?? "").trim().toLowerCase());
}
