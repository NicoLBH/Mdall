import test from "node:test";
import assert from "node:assert/strict";

import { renderPageDuReferentiel } from "./le-referentiel-page.js";

/**
 * Ce qu'on cherche dans le rendu, sans apostrophe.
 *
 * `escapeHtml` écrit `&#39;` : une garde qui chercherait la phrase telle qu'elle
 * est écrite dans le code ne la trouverait jamais, et l'on croirait à un défaut
 * du rendu. On cherche donc un fragment qui n'en porte pas — ce qui a
 * l'avantage de ne rien recopier des constantes du fichier éprouvé.
 */
const PAS_LU = "pas pu être lu";
const VIDE = "est vide";
const RIEN_TROUVE = "Aucune forme ne porte ce nom";

/** Une ligne du référentiel, telle que la base la rend. Aucun nom réel. */
const forme = (id, entrees, conclusions, domaine = "gros-oeuvre") => ({
  id, entrees, conclusions, domaine,
  empreinte: `${entrees.join(" + ")} > ${conclusions.join(" + ")}`,
  created_at: "2026-01-04T09:00:00Z"
});

const REFERENTIEL = [
  forme("f-1", ["altitude", "nature du sol"], ["profondeur hors gel"]),
  forme("f-2", ["nature du sol", "pente du terrain"], ["profondeur hors gel"]),
  forme("f-3", ["exposition", "zone de neige"], ["charge de neige"], "charpente")
];

/* ── Ce qu'on vient y chercher ───────────────────────────────────────────── */

test("la page range par ce qu'on sait trancher", () => {
  // Une liste brute de formes est un fichier, pas un savoir.
  const html = renderPageDuReferentiel({ formes: REFERENTIEL });

  const rangs = ["profondeur hors gel", "charge de neige"].map((nom) => html.indexOf(nom));
  assert.ok(rangs.every((rang) => rang > 0), "une conclusion manque à la page");
  assert.ok(rangs[0] < rangs[1], "le plus su ne vient pas en premier");
});

test("le compte des manières se dit à part des départs", () => {
  // « 4 manières » se lit ; réuni aux départs, il ferait croire qu'un départ
  // vaut une manière.
  const html = renderPageDuReferentiel({ formes: REFERENTIEL });

  assert.match(html, /2 manières/);
  assert.match(html, /1 manière</);
});

test("les départs d'une même conclusion se réunissent", () => {
  const html = renderPageDuReferentiel({ formes: REFERENTIEL });
  const horsGel = html.slice(html.indexOf("profondeur hors gel"), html.indexOf("charge de neige"));

  for (const nom of ["altitude", "nature du sol", "pente du terrain"]) {
    assert.ok(horsGel.includes(nom), `« ${nom} » manque au départ de la profondeur hors gel`);
  }
});

/* ── Ce que la page ne peut pas montrer ──────────────────────────────────── */

test("rien du projet n'est à l'écran, parce que rien du projet n'est dans la table", () => {
  // Ce n'est pas un filtrage : les lignes n'ont pas ces colonnes. Une page qui
  // afficherait « versée par… » dirait ce que la table ne sait pas.
  const html = renderPageDuReferentiel({ formes: REFERENTIEL });

  for (const interdit of ["f-1", "f-2", "f-3", "2026", "versée par", "project_id"]) {
    assert.equal(html.includes(interdit), false, `« ${interdit} » est à l'écran`);
  }
});

/* ── Chercher ────────────────────────────────────────────────────────────── */

test("la recherche restreint l'index, et sur un morceau de nom", () => {
  // Quelqu'un tape ce dont il se souvient : exiger le mot entier fait une
  // recherche qui ne trouve rien.
  const html = renderPageDuReferentiel({ formes: REFERENTIEL, cherche: "neige" });

  assert.match(html, /charge de neige/);
  assert.equal(html.includes("profondeur hors gel"), false);
});

test("les domaines se comptent sur ce qui est montré", () => {
  // Laisser « charpente · 2 » au-dessus d'une liste qui n'en porte aucune ferait
  // chercher une ligne qui n'y est pas.
  const html = renderPageDuReferentiel({ formes: REFERENTIEL, cherche: "neige" });

  assert.match(html, /charpente · 1/);
  assert.equal(/gros-oeuvre/.test(html), false);
});

test("ce qu'on a tapé reste dans le champ", () => {
  // Une recherche qui s'efface à chaque frappe se retape à chaque frappe.
  const html = renderPageDuReferentiel({ formes: REFERENTIEL, cherche: "neige" });

  assert.match(html, /data-referentiel-cherche[^>]*value="neige"/);
});

test("une recherche sans résultat le dit, et dit où elle a cherché", () => {
  const html = renderPageDuReferentiel({ formes: REFERENTIEL, cherche: "acoustique" });

  assert.match(html, new RegExp(RIEN_TROUVE));
  assert.match(html, /des départs, des conclusions et des domaines/);
});

test("la recherche reste à l'écran quand elle ne trouve rien", () => {
  // C'est par elle qu'on sort d'une recherche vide. La retirer là où elle sert
  // le plus serait une farce.
  const html = renderPageDuReferentiel({ formes: REFERENTIEL, cherche: "acoustique" });

  assert.match(html, /data-referentiel-cherche/);
});

/* ── Ne pas savoir, et n'avoir rien ──────────────────────────────────────── */

test("un référentiel non lu ne se dit pas vide", () => {
  // « On n'a pas su lire » et « personne n'a rien versé » envoient faire deux
  // choses différentes (règle 5).
  const html = renderPageDuReferentiel({ formes: null });

  assert.match(html, new RegExp(PAS_LU));
  assert.equal(html.includes(VIDE), false);
  assert.match(html, /Ce n&#39;est pas qu&#39;il soit vide/);
});

test("un référentiel vide se dit vide, et dit pourquoi il l'est", () => {
  const html = renderPageDuReferentiel({ formes: [] });

  assert.match(html, new RegExp(VIDE));
  assert.equal(html.includes(PAS_LU), false);
});

/* ── Les domaines ────────────────────────────────────────────────────────── */

test("les domaines se comptent, et réutilisent la pastille de la mémoire", () => {
  // Ne pas inventer une largeur : c'est la classe des pastilles de la Mémoire,
  // et en refaire une obligerait à recalibrer les deux à chaque retouche.
  const html = renderPageDuReferentiel({ formes: REFERENTIEL });

  assert.match(html, /<span class="memory-tag">gros-oeuvre · 2<\/span>/);
  assert.match(html, /<span class="memory-tag">charpente · 1<\/span>/);
});
