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
