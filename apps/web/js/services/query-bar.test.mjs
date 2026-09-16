import test from "node:test";
import assert from "node:assert/strict";

import {
  describeFilters,
  queryPieces,
  renderQueryMirror,
  filterValue,
  formatQuery,
  onlyFilters,
  parseQuery,
  suggestAt,
  toggleFilter,
  withFilter
} from "./query-bar.js";

const CHAMPS = [
  { key: "nature", label: "Nature", values: [
    { value: "hypothese", label: "Hypothèse" },
    { value: "contrainte", label: "Contrainte" }
  ] },
  { key: "domaine", label: "Domaine", values: [
    { value: "structure", label: "Structure" },
    { value: "sol", label: "Sol" }
  ] }
];

/* ── Les filtres et les mots vivent au même endroit ──────────────────────── */

test("une requête se lit en filtres et en texte libre", () => {
  const lue = parseQuery("nature:hypothese neige domaine:structure", CHAMPS);

  assert.deepEqual(lue.filters, { nature: "hypothese", domaine: "structure" });
  assert.equal(lue.text, "neige");
});

test("un champ inconnu reste du texte, il n'est ni ignoré ni corrigé", () => {
  // Une recherche qui fait disparaître des lignes sans qu'on comprenne
  // pourquoi est pire qu'une recherche vide.
  const lue = parseQuery("auteur:moi nature:zoiseau neige", CHAMPS);

  assert.deepEqual(lue.filters, {});
  assert.equal(lue.text, "auteur:moi nature:zoiseau neige");
});

test("le libellé vaut la clé, mais rien d'approchant", () => {
  assert.deepEqual(parseQuery("Domaine:Structure", CHAMPS).filters, { domaine: "structure" });
  assert.deepEqual(parseQuery("dom:structure", CHAMPS).filters, {}, "« dom » ne vaut pas « domaine »");
});

test("le dernier jeton d'un même champ l'emporte", () => {
  // C'est ce qu'on attend en corrigeant sa propre requête au clavier.
  assert.deepEqual(parseQuery("nature:hypothese nature:contrainte", CHAMPS).filters, { nature: "contrainte" });
});

test("deux-points sans champ devant restent du texte", () => {
  assert.equal(parseQuery(":structure", CHAMPS).text, ":structure");
});

/* ── L'écriture est stable ───────────────────────────────────────────────── */

test("les filtres s'écrivent dans l'ordre des champs, pas dans celui de la frappe", () => {
  // Une barre dont l'ordre change à chaque frappe est illisible, et deux
  // requêtes équivalentes doivent s'écrire pareil.
  const ecrite = formatQuery({ filters: { domaine: "sol", nature: "hypothese" }, text: "neige" }, CHAMPS);

  assert.equal(ecrite, "nature:hypothese domaine:sol neige");
});

test("relire ce qu'on vient d'écrire redonne la même chose", () => {
  const depart = "nature:contrainte domaine:structure fissure";
  assert.equal(formatQuery(parseQuery(depart, CHAMPS), CHAMPS), depart);
});

/* ── Poser, remplacer, retirer un filtre ─────────────────────────────────── */

test("poser un filtre garde le texte et les autres filtres", () => {
  assert.equal(
    withFilter("nature:hypothese neige", CHAMPS, "domaine", "structure"),
    "nature:hypothese domaine:structure neige"
  );
});

test("une valeur vide retire le filtre", () => {
  // C'est ce que veut dire choisir « Domaine » dans une liste dont l'entrée
  // neutre porte le nom du champ.
  assert.equal(withFilter("nature:hypothese neige", CHAMPS, "nature", ""), "neige");
});

test("poser un filtre sur un champ inconnu ne touche à rien", () => {
  assert.equal(withFilter("neige", CHAMPS, "auteur", "moi"), "neige");
});

test("une lecture repart d'une question nette mais garde les mots", () => {
  assert.equal(
    onlyFilters("nature:contrainte domaine:sol neige", CHAMPS, { nature: "hypothese" }),
    "nature:hypothese neige"
  );
});

test("filterValue rend la valeur, ou rien", () => {
  assert.equal(filterValue("nature:hypothese", CHAMPS, "nature"), "hypothese");
  assert.equal(filterValue("neige", CHAMPS, "nature"), "");
});

/* ── Ce que la barre dit d'elle-même ─────────────────────────────────────── */

test("les filtres se disent en français", () => {
  const dits = describeFilters("domaine:sol nature:hypothese", CHAMPS);

  assert.deepEqual(dits.map((f) => `${f.label} : ${f.valueLabel}`), ["Nature : Hypothèse", "Domaine : Sol"]);
});

/* ── La complétion ne gêne pas la frappe ─────────────────────────────────── */

test("on propose les champs tant qu'on tape leur nom", () => {
  const propose = suggestAt("nat", CHAMPS, 3);

  assert.equal(propose.kind, "field");
  assert.deepEqual(propose.items.map((i) => i.insert), ["nature:"]);
});

test("on propose les valeurs une fois le champ nommé", () => {
  const propose = suggestAt("nature:hyp", CHAMPS, 10);

  assert.equal(propose.kind, "value");
  assert.deepEqual(propose.items.map((i) => i.label), ["Hypothèse"]);
});

test("on ne propose rien pour un champ inconnu", () => {
  assert.equal(suggestAt("auteur:m", CHAMPS, 8), null);
});

test("la complétion porte sur le mot du curseur, pas sur toute la requête", () => {
  const propose = suggestAt("neige nature:", CHAMPS, 13);

  assert.equal(propose.kind, "value");
  assert.equal(propose.start, 6);
  assert.equal(propose.end, 13);
});

test("une requête vide propose tous les champs", () => {
  assert.deepEqual(suggestAt("", CHAMPS, 0).items.map((i) => i.insert), ["nature:", "domaine:"]);
});

/* ── Le calque : seule la valeur se colore ───────────────────────────────── */

test("un filtre se découpe en étiquette et en valeur", () => {
  // Peindre « nature: » et « hypothese » de la même couleur ferait un pâté bleu
  // où l'œil ne distingue plus l'essentiel de son étiquette.
  const [jeton] = queryPieces("nature:hypothese", CHAMPS);

  assert.equal(jeton.isFilter, true);
  assert.equal(jeton.key, "nature:");
  assert.equal(jeton.value, "hypothese");
});

test("les espaces sont conservés tels quels", () => {
  // Le calque doit tomber au pixel près sur le texte qu'il double.
  assert.deepEqual(queryPieces("a  b", CHAMPS).map((p) => p.text), ["a", "  ", "b"]);
});

test("le calque n'habille que ce qui est reconnu", () => {
  const rendu = renderQueryMirror("nature:hypothese nature:zoiseau neige", CHAMPS);

  assert.match(rendu, /query-token__key">nature:</);
  assert.match(rendu, /query-token__value">hypothese</);
  assert.ok(rendu.includes("nature:zoiseau"), "le jeton non reconnu reste du texte");
  assert.doesNotMatch(rendu, /query-token__value">zoiseau</);
});

test("le calque échappe ce qu'on lui donne", () => {
  assert.match(renderQueryMirror("<script>", CHAMPS), /&lt;script&gt;/);
});

/* ── Une valeur inconnue sur un champ connu ──────────────────────────────── */

/**
 * **Le jeton reste du texte — la règle du fichier ne bouge pas.** Mais sans le
 * dire, rien ne distingue « ce filtre ne retient rien » de « ce filtre n'existe
 * pas » : dans les deux cas la liste est vide, et l'on cherche la panne dans
 * les données plutôt que dans sa propre frappe (règle 5).
 */
test("une valeur inconnue sur un champ connu est nommée", async () => {
  const { parseQuery, phraseDesValeursInconnues } = await import("./query-bar.js");
  const champs = [{ key: "projet", label: "Chantier", values: [{ value: "p-1", label: "Résidence Bertrand" }] }];

  const { filters, text, inconnus } = parseQuery("projet:Bertrnad", champs);

  assert.deepEqual(filters, {}, "aucun filtre posé");
  assert.equal(text, "projet:Bertrnad", "le jeton reste du texte, comme avant");
  assert.deepEqual(inconnus, [{ champ: "projet", valeur: "Bertrnad" }]);
  assert.match(phraseDesValeursInconnues(inconnus), /« Bertrnad » pour projet/);
});

/**
 * **Un champ inconnu n'est pas une faute.** `http://exemple.fr` porte deux
 * points sans être un filtre raté, et l'annoncer ferait crier l'écran sur une
 * adresse parfaitement valable.
 */
test("un champ inconnu ne se signale pas : ce n'est pas une faute de frappe", async () => {
  const { parseQuery } = await import("./query-bar.js");
  const champs = [{ key: "projet", label: "Chantier", values: [{ value: "p-1", label: "Résidence" }] }];

  assert.deepEqual(parseQuery("http://exemple.fr", champs).inconnus, []);
  assert.deepEqual(parseQuery("zoiseau:bleu", champs).inconnus, []);
});

/**
 * Une valeur reconnue ne se signale évidemment pas.
 *
 * **Un nom à espaces s'écrit avec des traits d'union.** La barre coupe sur les
 * espaces : c'est pour cela que chaque valeur porte un `token`, et que les
 * labels s'y écrivent déjà ainsi. Un chantier ne fait pas exception.
 */
test("ce qui est reconnu ne se signale pas", async () => {
  const { parseQuery, phraseDesValeursInconnues } = await import("./query-bar.js");
  const champs = [{
    key: "projet",
    label: "Chantier",
    values: [{ value: "p-1", token: "résidence-bertrand", label: "Résidence Bertrand" }]
  }];

  const { filters, inconnus } = parseQuery("projet:residence-bertrand", champs);

  assert.equal(filters.projet, "p-1", "l'accent n'est pas obligatoire");
  assert.deepEqual(inconnus, []);
  assert.equal(phraseDesValeursInconnues([]), "");
});

/** Et le même nom tapé avec ses espaces ne passe pas — il se dit. */
test("un nom tapé avec ses espaces se signale plutôt que de se taire", async () => {
  const { parseQuery } = await import("./query-bar.js");
  const champs = [{
    key: "projet",
    label: "Chantier",
    values: [{ value: "p-1", token: "résidence-bertrand", label: "Résidence Bertrand" }]
  }];

  const { filters, inconnus } = parseQuery("projet:Résidence Bertrand", champs);

  assert.deepEqual(filters, {});
  assert.deepEqual(inconnus.map((entree) => entree.valeur), ["Résidence"]);
});

/** La même faute tapée deux fois ne se dit qu'une. */
test("une faute répétée ne se dit qu'une fois", async () => {
  const { parseQuery } = await import("./query-bar.js");
  const champs = [{ key: "projet", label: "Chantier", values: [{ value: "p-1", label: "Résidence" }] }];

  assert.equal(parseQuery("projet:zz projet:zz", champs).inconnus.length, 1);
});

/* ── Un nom qui désigne plusieurs valeurs ────────────────────────────────── */

/**
 * **Deux projets, deux labels du même nom, un seul mot pour les écrire.**
 *
 * C'est le défaut qu'un écran qui traverse les projets révèle : « Critique »
 * existe dans quatre chantiers, sous quatre identifiants. La barre ne sait
 * écrire que le nom ; on n'en retenait que le **premier**, et les sujets des
 * trois autres chantiers disparaissaient sans un mot. Cocher « Critique »
 * rendait une liste vide, et l'on cherchait la faute dans la requête.
 */
const DEUX_CRITIQUES = [{
  key: "label",
  label: "Labels",
  multiple: true,
  values: [
    { value: "lab-a", token: "critique", label: "Critique" },
    { value: "lab-b", token: "critique", label: "Critique" },
    { value: "lab-c", token: "etancheite", label: "Étanchéité" }
  ]
}];

test("un jeton qui nomme deux valeurs les pose toutes les deux", () => {
  const { filters } = parseQuery("label:critique", DEUX_CRITIQUES);

  assert.deepEqual(filters.label, ["lab-a", "lab-b"]);
});

/** Et un jeton qui n'en nomme qu'une n'en pose qu'une. */
test("un jeton qui n'a pas d'homonyme reste seul", () => {
  assert.deepEqual(parseQuery("label:etancheite", DEUX_CRITIQUES).filters.label, ["lab-c"]);
});

/**
 * **La barre reste lisible.** Quatre identifiants pour un nom s'écrivent une
 * fois : les répéter ferait `label:critique label:critique` pour une seule
 * condition.
 */
test("deux valeurs du même nom ne s'écrivent qu'une fois", () => {
  assert.equal(
    formatQuery({ filters: { label: ["lab-a", "lab-b"] } }, DEUX_CRITIQUES),
    "label:critique"
  );
});

/**
 * **On coche un nom, pas un identifiant.** Ne retirer que celui qu'on a cliqué
 * laissait le jeton en place — un filtre qu'on ne peut plus décocher.
 */
test("cocher puis recocher un nom le pose puis le retire entièrement", () => {
  const pose = toggleFilter("", DEUX_CRITIQUES, "label", "lab-a");
  assert.equal(pose, "label:critique");
  assert.deepEqual(parseQuery(pose, DEUX_CRITIQUES).filters.label, ["lab-a", "lab-b"]);

  assert.equal(toggleFilter(pose, DEUX_CRITIQUES, "label", "lab-a"), "");
  assert.equal(
    toggleFilter(pose, DEUX_CRITIQUES, "label", "lab-b"), "",
    "depuis l'un ou depuis l'autre, c'est le même nom qu'on décoche"
  );
});

/**
 * **Une valeur réservée ne se confond avec aucune autre.**
 *
 * `@moi` s'écrit « moi », et quelqu'un peut s'appeler Moi. Les réunir ferait
 * appliquer le filtre sur cette personne-là quand on ne sait pas qui regarde,
 * au lieu de l'annoncer sans l'appliquer (règle 5).
 */
test("une valeur réservée ne se réunit pas avec son homonyme", () => {
  const champs = [{
    key: "assigné",
    label: "Assignés",
    multiple: true,
    values: [
      { value: "@moi", token: "moi", label: "Moi", seule: true },
      { value: "p-moi", token: "moi", label: "Moi" }
    ]
  }];

  assert.deepEqual(parseQuery("assigné:moi", champs).filters["assigné"], ["@moi"]);
});
