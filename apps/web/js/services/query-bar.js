/**
 * Une barre de recherche à la GitHub : des filtres écrits dans le texte.
 *
 * `nature:hypothese domaine:structure neige` — les filtres et les mots vivent
 * au même endroit, et cet endroit est **le champ de saisie**. C'est ce qui rend
 * une recherche confortable : on lit ce qu'on cherche, on le corrige au clavier,
 * on le copie, on le colle. Des filtres cachés dans des menus obligent à
 * ouvrir quatre listes pour savoir ce qu'on regarde.
 *
 * ## Rien n'est deviné
 *
 * Un jeton n'est un filtre que si **son champ est déclaré** et **sa valeur
 * connue**. `auteur:moi` sur un écran qui n'a pas d'auteur reste du texte
 * ordinaire, et `nature:zoiseau` aussi. Interpréter au plus proche ferait
 * disparaître des lignes sans que personne comprenne pourquoi — et une
 * recherche qui ment est pire qu'une recherche vide.
 *
 * ## Le module ne connaît aucun écran
 *
 * Il reçoit la liste des champs et rend un objet ; c'est l'écran qui sait ce
 * qu'il en fait. La Mémoire s'en sert aujourd'hui ; les sujets, les
 * propositions et les projets s'en serviront demain sans le modifier.
 */

/**
 * Un champ interrogeable.
 *
 * @typedef {object} QueryField
 * @property {string} key le mot avant les deux-points, tel qu'on le tape
 * @property {string} label son nom pour l'écran
 * @property {{value: string, label: string}[]} values les valeurs admises
 */

function texte(value) {
  return String(value ?? "").trim();
}

/** Sans accent ni casse : « Hypothèse » et « hypothese » désignent la même chose. */
function pli(value) {
  return texte(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Le champ déclaré qui répond à ce mot, ou `null`.
 *
 * On accepte la clé et le libellé — on tape « domaine » comme « Domaine » —
 * mais rien d'approchant : « dom » ne vaut pas « domaine ».
 */
function champPour(fields, mot) {
  const cherche = pli(mot);
  return (fields ?? []).find((champ) => pli(champ.key) === cherche || pli(champ.label) === cherche) ?? null;
}

/** La valeur admise qui répond à ce mot, ou `null`. Même règle. */
function valeurPour(champ, mot) {
  const cherche = pli(mot);
  return (champ?.values ?? []).find(
    (valeur) => pli(valeur.value) === cherche || pli(valeur.label) === cherche
  ) ?? null;
}

/**
 * Découpe une requête en filtres reconnus et en texte libre.
 *
 * Un jeton non reconnu **reste du texte** : il n'est ni ignoré, ni corrigé. On
 * le retrouve donc dans la barre, et la recherche porte dessus comme sur
 * n'importe quel mot.
 *
 * @returns {{filters: Record<string,string>, text: string}}
 */
export function parseQuery(query = "", fields = []) {
  const filtres = {};
  const mots = [];

  for (const morceau of texte(query).split(/\s+/).filter(Boolean)) {
    const coupure = morceau.indexOf(":");
    if (coupure <= 0) {
      mots.push(morceau);
      continue;
    }

    const champ = champPour(fields, morceau.slice(0, coupure));
    const valeur = champ ? valeurPour(champ, morceau.slice(coupure + 1)) : null;

    if (!champ || !valeur) {
      mots.push(morceau);
      continue;
    }

    // Le dernier gagne : retaper un filtre le remplace, ce qui est ce qu'on
    // attend en corrigeant sa propre requête.
    filtres[champ.key] = valeur.value;
  }

  return { filters: filtres, text: mots.join(" ") };
}

/**
 * Réécrit une requête depuis ses filtres et son texte.
 *
 * Les filtres viennent en tête, dans l'ordre des champs déclarés — pas dans
 * celui où l'utilisateur les a tapés. Une barre dont l'ordre change à chaque
 * frappe est illisible, et deux requêtes équivalentes doivent s'écrire pareil.
 */
export function formatQuery({ filters = {}, text = "" } = {}, fields = []) {
  const jetons = (fields ?? [])
    .filter((champ) => texte(filters[champ.key]))
    .map((champ) => `${champ.key}:${texte(filters[champ.key])}`);

  return [...jetons, texte(text)].filter(Boolean).join(" ");
}

/**
 * La même requête, avec un filtre posé, remplacé ou retiré.
 *
 * Une valeur vide **retire** le filtre : c'est ce que veut dire choisir
 * « Domaine » dans une liste dont l'entrée neutre porte le nom du champ.
 */
export function withFilter(query = "", fields = [], key = "", value = "") {
  const { filters, text } = parseQuery(query, fields);
  const champ = champPour(fields, key);
  if (!champ) return texte(query);

  const suivant = { ...filters };
  if (texte(value)) suivant[champ.key] = texte(value);
  else delete suivant[champ.key];

  return formatQuery({ filters: suivant, text }, fields);
}

/** La valeur d'un filtre dans une requête, ou `""`. */
export function filterValue(query = "", fields = [], key = "") {
  return parseQuery(query, fields).filters[texte(key)] ?? "";
}

/**
 * Une requête qui ne porte **que** ces filtres.
 *
 * C'est ce que fait le choix d'une lecture dans le rail : on repart d'une
 * question nette plutôt que d'empiler sur la précédente. Le texte libre est
 * conservé — on cherchait quelque chose, on cherche toujours la même chose.
 */
export function onlyFilters(query = "", fields = [], filters = {}) {
  const { text } = parseQuery(query, fields);
  return formatQuery({ filters, text }, fields);
}

/**
 * Les filtres de cette requête, dits en français.
 *
 * @returns {{key: string, label: string, value: string, valueLabel: string}[]}
 */
export function describeFilters(query = "", fields = []) {
  const { filters } = parseQuery(query, fields);

  return (fields ?? [])
    .filter((champ) => texte(filters[champ.key]))
    .map((champ) => {
      const valeur = valeurPour(champ, filters[champ.key]);
      return {
        key: champ.key,
        label: champ.label,
        value: filters[champ.key],
        valueLabel: valeur?.label ?? filters[champ.key]
      };
    });
}

/**
 * Les propositions de complétion, pour la position du curseur.
 *
 * Deux moments seulement : on tape le nom d'un champ, ou on tape la valeur d'un
 * champ déjà nommé. Ailleurs on écrit du texte, et proposer quoi que ce soit
 * gênerait la frappe.
 *
 * @returns {{kind: "field"|"value", token: string, start: number, end: number,
 *   items: {insert: string, label: string, hint: string}[]}|null}
 */
export function suggestAt(query = "", fields = [], caret = 0) {
  const brut = String(query ?? "");
  const position = Math.max(0, Math.min(brut.length, Number(caret) || 0));

  const debut = brut.lastIndexOf(" ", position - 1) + 1;
  const finBrute = brut.indexOf(" ", position);
  const fin = finBrute === -1 ? brut.length : finBrute;
  const jeton = brut.slice(debut, fin);

  const coupure = jeton.indexOf(":");

  if (coupure === -1) {
    const cherche = pli(jeton);
    const items = (fields ?? [])
      .filter((champ) => !cherche || pli(champ.key).startsWith(cherche))
      .map((champ) => ({ insert: `${champ.key}:`, label: `${champ.key}:`, hint: champ.label }));
    return items.length ? { kind: "field", token: jeton, start: debut, end: fin, items } : null;
  }

  const champ = champPour(fields, jeton.slice(0, coupure));
  if (!champ) return null;

  const cherche = pli(jeton.slice(coupure + 1));
  const items = (champ.values ?? [])
    .filter((valeur) => !cherche || pli(valeur.label).includes(cherche) || pli(valeur.value).startsWith(cherche))
    .map((valeur) => ({
      insert: `${champ.key}:${valeur.value} `,
      label: valeur.label,
      hint: champ.label
    }));

  return items.length ? { kind: "value", token: jeton, start: debut, end: fin, items } : null;
}
