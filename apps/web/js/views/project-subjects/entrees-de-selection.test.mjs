import test from "node:test";
import assert from "node:assert/strict";

import {
  entreeDeSelection, iconsetDeSelection, ORDRE_DES_GROUPES,
  pastilleDeLabel, sectionsParGroupe
} from "./entrees-de-selection.js";
import { renderSelectMenuItems } from "../ui/select-menu.js";

/**
 * La forme d'une entrée de menu, et pourquoi elle est partagée.
 *
 * La colonne de droite d'un sujet et les filtres de l'en-tête du tableau posent
 * les mêmes questions — quels labels, quels assignés, quels objectifs. Les
 * seconds les posaient avec une liste nue : un titre, une coche à droite, et
 * rien pour distinguer une personne d'un label. Deux menus qui posent la même
 * question et ne se ressemblent pas obligent à réapprendre le second, et
 * divergent au premier réglage (règle 10).
 */

test("une entrée porte sa case, sa décoration, son titre et sa ligne de dessous", () => {
  const entree = entreeDeSelection({
    cle: "p-1",
    titre: "Camille ROUX",
    sousTitre: "Maire",
    choisie: true,
    decorHtml: '<img class="avatar">',
    attribut: "subject-assignee-toggle",
    valeur: "p-1"
  });

  assert.equal(entree.key, "p-1");
  assert.equal(entree.title, "Camille ROUX");
  assert.equal(entree.isSelected, true);
  assert.match(entree.iconHtml, /select-menu__checkbox is-checked/);
  assert.match(entree.iconHtml, /<img class="avatar">/);
  assert.equal(entree.metaHtml, "Maire");
  assert.deepEqual(entree.dataAttrs, { "subject-assignee-toggle": "p-1" });
});

/**
 * **La case d'abord, la décoration ensuite.** L'œil descend la colonne des
 * cases pour voir ce qui est pris ; une décoration qui la précéderait la
 * déplacerait d'une ligne à l'autre selon la largeur de l'avatar.
 */
test("la case précède toujours la décoration", () => {
  const html = iconsetDeSelection({ choisie: false, decorHtml: "<b>déco</b>" });

  assert.ok(html.indexOf("select-menu__checkbox") < html.indexOf("<b>déco</b>"));
});

test("une case non cochée ne porte pas la marque", () => {
  assert.doesNotMatch(iconsetDeSelection({ choisie: false }), /is-checked/);
  assert.match(iconsetDeSelection({ choisie: true }), /is-checked/);
});

/** Une valeur sans attribut ne déclenche rien : l'entrée ne ment pas dessus. */
test("une entrée sans attribut ne porte aucune donnée de clic", () => {
  assert.deepEqual(entreeDeSelection({ cle: "x", titre: "X" }).dataAttrs, {});
});

/** Ce qui entre dans la ligne de dessous est échappé : un nom peut tout porter. */
test("la ligne de dessous est échappée", () => {
  const entree = entreeDeSelection({ cle: "x", titre: "X", sousTitre: "<script>" });

  assert.equal(entree.metaHtml, "&lt;script&gt;");
});

test("la pastille d'un label prend sa couleur, et une par défaut", () => {
  assert.match(pastilleDeLabel("#ff0000"), /--select-menu-label-dot:#ff0000/);
  assert.match(pastilleDeLabel(""), /--select-menu-label-dot:#8b949e/);
});

/* ── Le rangement du trombinoscope ───────────────────────────────────────── */

/**
 * **Ce n'est pas l'alphabet.** On cherche d'abord qui décide, puis qui conçoit,
 * puis qui exécute : c'est l'ordre dans lequel on se pose la question, et celui
 * des comptes rendus.
 */
test("les groupes suivent l'ordre du chantier", () => {
  const sections = sectionsParGroupe([
    { key: "a", groupLabel: "Entreprises" },
    { key: "b", groupLabel: "Maîtrise d'ouvrage" },
    { key: "c", groupLabel: "Maîtrise d'œuvre" }
  ]);

  assert.deepEqual(sections.map((section) => section.title),
    ["Maîtrise d'ouvrage", "Maîtrise d'œuvre", "Entreprises"]);
});

test("un groupe inconnu passe après, par ordre alphabétique", () => {
  const sections = sectionsParGroupe([
    { key: "a", groupLabel: "Riverains" },
    { key: "b", groupLabel: "Entreprises" },
    { key: "c", groupLabel: "Concessionnaires" }
  ]);

  assert.deepEqual(sections.map((section) => section.title),
    ["Entreprises", "Concessionnaires", "Riverains"]);
});

test("une entrée sans groupe tombe dans « Divers »", () => {
  assert.deepEqual(sectionsParGroupe([{ key: "a" }]).map((section) => section.title), ["Divers"]);
  assert.ok(ORDRE_DES_GROUPES.includes("Divers"));
});

/**
 * Le contrat avec `select-menu.js` : une entrée doit s'y dessiner. Une clé
 * renommée d'un seul côté ne lèverait rien — l'entrée sortirait muette.
 */
test("une entrée se dessine par le menu partagé", () => {
  const html = renderSelectMenuItems([entreeDeSelection({
    cle: "l-cr", titre: "CR chantier", sousTitre: "Venus des comptes rendus",
    choisie: true, decorHtml: pastilleDeLabel("#ff0000"),
    attribut: "subject-label-toggle", valeur: "l-cr"
  })]);

  assert.match(html, /data-select-menu-item="l-cr"/);
  assert.match(html, /data-subject-label-toggle="l-cr"/);
  assert.match(html, /aria-selected="true"/);
  assert.match(html, /CR chantier/);
  assert.match(html, /Venus des comptes rendus/);
  assert.match(html, /select-menu__label-dot/);
});
