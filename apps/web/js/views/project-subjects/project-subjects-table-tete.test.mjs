import test from "node:test";
import assert from "node:assert/strict";

import {
  CLASSE_DE_LA_TETE_DES_SUJETS, getSituationsTableGridTemplate, renderProjectSubjectsTable
} from "./project-subjects-table.js";
import { renderIssuesTable } from "../ui/issues-table.js";
import { renderDataTableHead } from "../ui/data-table-shell.js";

/**
 * **L'en-tête du tableau des sujets fait toujours la même hauteur.**
 *
 * Cette ligne change de contenu selon qu'on filtre ou qu'on range : des
 * intitulés discrets d'un côté, des boutons bordés de l'autre. Les deux ne font
 * pas la même hauteur naturelle, et cocher une case faisait sauter le tableau
 * de quelques pixels sous le curseur — ce qui est laid, et ce qui fait rater la
 * case suivante.
 *
 * La hauteur est posée en CSS, sur une classe. Ce que ce fichier surveille,
 * c'est que **la classe soit là dans tous les états du tableau** : chargement,
 * accueil, vide, liste. Elle l'était à quatre appels séparés qui répétaient la
 * grille et l'en-tête ; un cinquième écrit sans elle donnerait un tableau dont
 * la tête saute, et rien ne le dirait (règle 10).
 */

function deps(store, ajouts = {}) {
  return {
    store,
    renderIssuesTable,
    renderDataTableHead,
    getFilteredFlatSubjects: () => [],
    getSubjectsPaginationState: () => ({ pageSize: 25, currentPage: 1 }),
    getCurrentSubjectsStatusFilter: () => "open",
    getCurrentSubjectsPriorityFilter: () => "",
    sujetMatchesStatusFilter: () => true,
    sujetMatchesPriorityFilter: () => true,
    getSubjectsStatusCounts: () => ({ open: 0, closed: 0 }),
    renderCaseDeTeteDesSujetsHtml: () => "<input>",
    renderSubjectsStatusHeadHtml: () => "Ouverts",
    renderSubjectsAssigneesHeadHtml: () => "Filtres",
    // Ce qu'il faut pour dessiner une ligne : le tableau ne les invente pas.
    escapeHtml: (valeur) => String(valeur ?? ""),
    svgIcon: () => "",
    issueIcon: () => "",
    getEffectiveSujetStatus: () => "open",
    getEntityReviewMeta: () => ({ review_state: "", is_seen: true }),
    getReviewTitleStateClass: () => "",
    getEntityDisplayRef: () => "S-1",
    getEntityDescriptionState: () => ({ author: "System", agent: "system" }),
    formatRelativeTimeLabel: () => "opened now",
    getEntityListTimestamp: () => 0,
    getSubjectSidebarMeta: () => ({ labels: [], objectiveIds: [] }),
    getSubjectLabelDefinition: () => null,
    renderSubjectLabelBadge: () => "",
    getObjectiveById: () => null,
    getChildSubjects: () => [],
    getBlockedBySubjects: () => [],
    getHeadVisibleBlockedBySubjects: () => [],
    firstNonEmpty: (...valeurs) => valeurs.find((valeur) => valeur) || "",
    ...ajouts
  };
}

const UN_SUJET = { id: "s-1", title: "La cloison du hall", status: "open" };

/**
 * Les quatre états dans lesquels ce tableau se dessine. Ils venaient de quatre
 * appels séparés qui répétaient la grille, l'en-tête et ses colonnes.
 */
const ETATS = {
  "en chargement": [{ projectSubjectsView: { loading: true } }, {}],
  "à l'accueil": [{ projectSubjectsView: {} }, {}],
  "vide sous un filtre": [
    { projectSubjectsView: { rawSubjectsResult: { subjectsById: { "s-1": UN_SUJET } } } },
    { sujetMatchesStatusFilter: () => false }
  ],
  "plein de sujets": [
    { projectSubjectsView: {} },
    { getFilteredFlatSubjects: () => [UN_SUJET] }
  ]
};

for (const [quand, [store, ajouts]] of Object.entries(ETATS)) {
  test(`la tête porte sa classe de hauteur, ${quand}`, () => {
    const html = renderProjectSubjectsTable({ filteredSituations: [], deps: deps(store, ajouts) });

    assert.match(
      html,
      new RegExp(`data-table-shell__head\\s+${CLASSE_DE_LA_TETE_DES_SUJETS}`),
      `la tête n'a pas sa classe de hauteur quand le tableau est ${quand}`
    );
  });

  test(`la grille des colonnes est la même, ${quand}`, () => {
    const html = renderProjectSubjectsTable({ filteredSituations: [], deps: deps(store, ajouts) });

    assert.ok(html.includes(getSituationsTableGridTemplate()),
      `les colonnes ne sont pas celles des autres états quand le tableau est ${quand}`);
  });
}
