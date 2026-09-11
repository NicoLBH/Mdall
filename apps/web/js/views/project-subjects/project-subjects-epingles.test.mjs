import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { renderSujetsEpinglesHtml } from "./project-subjects-table.js";

const lis = (chemin) => readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), "utf8");

/* ── Le bandeau ──────────────────────────────────────────────────────────── */

/**
 * Le bandeau **ne dessine rien quand il n'y a rien** : un cadre vide au-dessus
 * du tableau ferait croire à une liste qui n'a pas fini de charger.
 */
test("sans sujet épinglé, le bandeau n'existe pas dans la page", () => {
  assert.equal(renderSujetsEpinglesHtml({ sujets: [], deps: { renderIssuesTable: () => "<table>" } }), "");
  assert.equal(renderSujetsEpinglesHtml(), "");
});

/**
 * Il n'a **pas de tête** : les colonnes sont celles du tableau deux lignes plus
 * bas. Les nommer deux fois de suite ferait lire le bandeau comme un autre
 * tableau, et l'on chercherait ce qui les distingue.
 */
test("le bandeau reprend le tableau, sans sa tête", () => {
  let recu = null;
  const html = renderSujetsEpinglesHtml({
    sujets: [{ id: "s-1", title: "Étanchéité" }],
    deps: {
      renderIssuesTable: (options) => {
        recu = options;
        return "<div data-tableau></div>";
      },
      escapeHtml: (valeur) => String(valeur ?? ""),
      svgIcon: () => "",
      issueIcon: () => "",
      getEffectiveSujetStatus: () => "open",
      getEntityReviewMeta: () => ({}),
      getReviewTitleStateClass: () => "",
      getEntityDisplayRef: () => "#1",
      getEntityDescriptionState: () => ({}),
      formatRelativeTimeLabel: () => "",
      getEntityListTimestamp: () => "",
      getSubjectSidebarMeta: () => ({ labels: [], objectiveIds: [], assignees: [] }),
      getSubjectLabelDefinition: () => null,
      renderSubjectLabelBadge: () => "",
      getObjectiveById: () => null,
      getChildSubjects: () => [],
      getBlockedBySubjects: () => [],
      getHeadVisibleBlockedBySubjects: () => [],
      firstNonEmpty: (...valeurs) => valeurs.find(Boolean) ?? ""
    }
  });

  assert.match(html, /subjects-pinned/);
  assert.equal(recu.headHtml, undefined);
  // Le même gabarit de colonnes que le tableau : sinon les deux ne s'alignent pas.
  assert.ok(recu.gridTemplate);
  assert.ok(recu.rowsHtml.length > 0);
});

/**
 * Sans de quoi dessiner une ligne, on ne dessine rien plutôt qu'un cadre vide :
 * un bandeau présent mais muet ferait chercher les sujets qu'il annonce.
 */
test("sans le rendu du tableau, le bandeau se tait", () => {
  assert.equal(renderSujetsEpinglesHtml({ sujets: [{ id: "s-1" }], deps: {} }), "");
});

/* ── Ce que le défaut des six tours a appris ─────────────────────────────── */

/**
 * **Les aides de l'épingle vivent dans leur fabrique.**
 *
 * `resetSubjectsPaginationPage` vivait après l'accolade fermante de la sienne,
 * là où `store` n'existe pas : chaque clic levait un `ReferenceError`, tu par
 * l'écouteur, et le redessin n'arrivait jamais. Le bouton paraissait sourd
 * alors qu'il entendait très bien.
 *
 * `basculerLEpingle` lit `store` et appelle `rerenderPanels` : le même piège
 * l'attend, et il coûterait les mêmes tours à trouver.
 */
test("les aides de l'épingle sont dans la fabrique qui leur donne store", () => {
  const vue = lis("./project-subjects-view.js");

  const debut = vue.indexOf("export function createProjectSubjectsView(deps) {");
  assert.ok(debut >= 0, "la fabrique a changé de nom");

  for (const nom of ["function basculerLEpingle", "function assurerLesEpingles", "function ecouterLEpingle"]) {
    const ou = vue.indexOf(nom);
    assert.ok(ou > debut, `${nom} a été sortie de sa fabrique`);
  }

  // L'écoute se pose au montage, pas au premier rendu du bouton : un bouton
  // dessiné avant elle resterait muet jusqu'au rendu suivant.
  assert.match(vue, /ecouterLEpingle\(\);\s*\n\s*return \{/);
});

/**
 * Le bandeau ne se dessine que si la vue le reçoit. Un rendu importé mais
 * jamais passé à la fabrique laisserait le code juste et l'écran vide — c'est
 * exactement le genre de silence qui coûte des tours.
 */
test("le bandeau est branché de bout en bout", () => {
  const racine = lis("../project-subjects.js");
  const vue = lis("./project-subjects-view.js");

  // Importé, puis passé à la fabrique : deux occurrences, pas une.
  assert.ok(
    racine.split("renderSujetsEpinglesHtml").length - 1 >= 2,
    "le rendu du bandeau est importé mais jamais passé à la vue"
  );
  assert.match(vue, /renderSujetsEpinglesHtml\(\{/);
});
