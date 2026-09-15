/**
 * La coquille du carnet : elle réutilise celle du projet, ou elle ne vaut rien.
 *
 * Le rendu s'exécute ici pour de vrai. Une classe qui s'en irait ne se verrait
 * nulle part ailleurs — l'écran s'afficherait, de travers, et l'on recalibrerait
 * à la main ce qui était déjà calibré.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { renderCarnetHeader, renderCarnetShell } from "./mon-carnet-coquille.js";
import { NOM_DU_CARNET, ROUTE_DU_CARNET } from "../services/mon-carnet.js";
import { PROJECT_TABS } from "../constants.js";

const VUES = dirname(fileURLToPath(import.meta.url));
const JS = join(VUES, "..");

/* ── Elle n'invente aucune largeur ───────────────────────────────────────── */

/**
 * **Les classes de la coquille d'un projet, pas d'autres.**
 *
 * En refaire une pour cet écran obligerait à recalibrer les deux à chaque
 * retouche, et l'une des deux finirait en retard sur l'autre. Ce test nomme
 * celles dont le reste du code dépend — l'hôte du contenu porte l'identifiant
 * que l'écran des situations va chercher, et l'hôte de la barre d'outils celui
 * qu'elle remplit.
 */
test("la coquille du carnet est celle du projet", () => {
  const html = renderCarnetShell();

  for (const classe of [
    "project-shell",
    "project-shell__body",
    "project-shell__body--situations",
    "project-shell__content",
    "project-situations-toolbar-host"
  ]) {
    assert.ok(html.includes(classe), `${classe} manque : l'écran se dessinerait de travers`);
  }

  assert.match(html, /id="project-content"/, "l'écran des situations se monte là");
  assert.match(html, /id="situationsToolbarHost"/, "la barre d'outils s'écrit là");
});

/**
 * Le bandeau vient d'ailleurs — d'un module qui parle à la base. La coquille
 * sait où le poser, pas comment le fabriquer.
 */
test("le bandeau se pose sans que la coquille sache d'où il vient", () => {
  const html = renderCarnetShell({ banniere: "<div id=\"essai-banniere\"></div>" });

  assert.match(html, /id="essai-banniere"/);
  // Avant le contenu, comme dans la coquille d'un projet.
  assert.ok(html.indexOf("essai-banniere") < html.indexOf("project-content"));
});

/* ── L'en-tête ───────────────────────────────────────────────────────────── */

/**
 * Mêmes classes que la barre d'onglets d'un projet : même hauteur, même
 * calibrage, même repère pour l'œil. Un seul onglet, parce qu'un carnet n'a
 * rien à côté de quoi se ranger.
 */
test("l'en-tête reprend la barre d'onglets, avec une seule entrée", () => {
  const html = renderCarnetHeader();

  assert.ok(html.includes("project-context-header"));
  assert.ok(html.includes("project-tabs"));
  assert.ok(html.includes("project-tabs__label"));
  assert.equal(html.match(/<a\s/g)?.length, 1, "un carnet n'a qu'un onglet");
  assert.ok(html.includes(`href="${ROUTE_DU_CARNET}"`));
  assert.ok(html.includes(NOM_DU_CARNET));
});

/* ── Le déménagement a bien eu lieu ──────────────────────────────────────── */

/**
 * **Un écran qui existe à deux endroits finit par différer d'un des deux.**
 *
 * Si l'onglet du projet restait, on aurait deux listes des situations : celle
 * du projet, qui filtre, et le carnet, qui ne filtre pas. C'est exactement ce
 * que l'étape 3 défait.
 */
test("les situations ne sont plus un onglet du projet", () => {
  const situations = PROJECT_TABS.filter((onglet) => onglet.id === "situations");

  assert.deepEqual(situations, [], "l'onglet doit avoir déménagé, pas être dupliqué");
});

/**
 * Cette vérification-ci lit du texte, et c'est assumé : **un écran qu'aucun
 * lien ne désigne n'existe pas**, et rien à l'exécution ne le dit. On ne peut
 * pas non plus monter le menu ici — il écrit dans le document.
 */
test("le carnet est atteignable : une route, et une entrée de menu", () => {
  const routeur = readFileSync(join(JS, "router.js"), "utf8");
  assert.match(routeur, /parts\[0\] === "situations"/, "la route du carnet doit exister");
  assert.match(routeur, /renderMonCarnet\(root\)/, "et mener à l'écran");
  assert.match(routeur, /adresseDunAncienLien\(parts\)/, "les anciens liens doivent être repris");

  // Le lien lui-même, pas la ligne d'import : importer une adresse sans jamais
  // la poser ferait un menu où le carnet n'apparaît pas, et rien ne lèverait.
  const menu = readFileSync(join(VUES, "global-nav.js"), "utf8");
  assert.match(
    menu,
    // `.` ne franchit pas les lignes : un href pris sur un lien et un label pris
    // sur le suivant ne feraient pas une preuve.
    /renderNavLink\(\{.*href:\s*ROUTE_DU_CARNET.*label:\s*NOM_DU_CARNET.*\}\)/,
    "le menu doit porter un lien vers le carnet, nommé d'après le seul endroit où il est écrit"
  );
});
