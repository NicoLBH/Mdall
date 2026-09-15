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

import { renderCarnetShell } from "./mon-carnet-coquille.js";
import { ROUTE_DU_CARNET } from "../services/mon-carnet.js";
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

/**
 * **Le carnet n'a pas de barre d'onglets.**
 *
 * Une barre qui ne porterait qu'une seule entrée, toujours active, n'offre
 * aucun choix : elle répète le nom de l'écran qu'on regarde déjà, et prend la
 * place d'une ligne de contenu pour le dire.
 */
test("le carnet ne porte pas de barre d'onglets à une seule entrée", () => {
  const html = renderCarnetShell();

  assert.ok(!html.includes("project-tabs"), "aucune barre d'onglets");
  assert.ok(!html.includes("project-context-header"), "ni son en-tête");
});

/* ── Le déménagement a bien eu lieu ──────────────────────────────────────── */

/**
 * **Les situations ne sont pas un onglet du projet, et n'y reviennent pas.**
 *
 * Une situation est au-dessus des projets : la ranger parmi leurs onglets
 * brouille exactement ce que tout ce plan installe. Un onglet qui menait dehors
 * avait été essayé — il disait la bonne adresse et le mauvais rang.
 *
 * On y va par la barre du haut, qui ne dit rien sur l'endroit où l'on se trouve.
 */
test("les situations ne sont pas un onglet du projet", () => {
  assert.deepEqual(PROJECT_TABS.filter((onglet) => onglet.id === "situations"), []);
});

/** Et la barre du haut y mène, à côté des projets. */
test("la barre du haut mène au carnet et aux projets", () => {
  const entete = readFileSync(join(VUES, "global-header.js"), "utf8");

  assert.match(entete, /href:\s*ROUTE_DU_CARNET/, "le raccourci du carnet");
  assert.match(entete, /href:\s*"#projects"/, "et celui des projets");
  // Le même bouton pour les trois : en dessiner un par raccourci les ferait
  // diverger de taille.
  assert.equal(entete.match(/gh-raccourci/g)?.length >= 2, true);
});

/**
 * **Le projet ne se rend pas sur cette adresse.** Une porte qui rendrait aussi
 * une vue de projet ramènerait la duplication par l'autre bout : `project-layout`
 * ne connaît plus les situations, et c'est ce qui le garantit.
 */
test("la mise en page d'un projet ne sait plus dessiner les situations", () => {
  const layout = readFileSync(join(VUES, "project-layout.js"), "utf8");

  assert.ok(
    !/renderProjectSituations\s*\(/.test(layout),
    "le projet ne doit plus monter cet écran : il a déménagé"
  );
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

/**
 * **Le raccourci ramène à la liste, même quand on y est déjà.**
 *
 * C'est le défaut relevé à l'écran : dans une situation, recliquer sur
 * « Situations » ne faisait rien. L'adresse ne change pas — on est déjà sur
 * `#situations` —, donc le navigateur ne prévient personne, et rien ne se
 * redessine. Le clic doit refermer la sélection lui-même.
 *
 * Cette vérification lit du texte, et c'est assumé : **une écoute absente ne
 * lève pas.** On ne peut pas non plus cliquer ici — il n'y a pas de document.
 */
test("le raccourci des situations referme la situation ouverte", () => {
  const entete = readFileSync(join(VUES, "global-header.js"), "utf8");

  assert.match(entete, /marque:\s*"situations"/, "le raccourci doit se laisser reconnaître");
  assert.match(
    entete,
    /closest\?\.\('\[data-raccourci="situations"\]'\)/,
    "et l'écoute doit le reconnaître"
  );
  // Le même geste que le fil d'Ariane, au même endroit : deux façons de revenir
  // à la liste finiraient par ne plus se ressembler (règle 10).
  assert.match(entete, /globalHeaderSituationsBack[\s\S]{0,200}data-raccourci="situations"/);
});
