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

import { renderCoquilleTransversale } from "./mon-carnet-coquille.js";
import { ROUTE_DU_CARNET } from "../services/mon-carnet.js";
import { MARQUE_DES_SITUATIONS, RACCOURCIS_GLOBAUX } from "../services/raccourcis-de-la-barre.js";
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
  const html = renderCoquilleTransversale();

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
  const html = renderCoquilleTransversale({ banniere: "<div id=\"essai-banniere\"></div>" });

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
  const html = renderCoquilleTransversale();

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

/**
 * Et la barre du haut y mène, à côté des projets.
 *
 * **La liste ne se lit plus dans le texte de l'en-tête**, et c'est un progrès :
 * elle vit dans `raccourcis-de-la-barre.js`, qui s'importe. On l'interroge donc
 * au lieu de la relire, et le dessin seul reste à lire ici.
 */
test("la barre du haut mène aux situations et aux projets", () => {
  const adresses = RACCOURCIS_GLOBAUX.map((un) => un.href);
  assert.ok(adresses.includes(ROUTE_DU_CARNET), "le raccourci des situations");
  assert.ok(adresses.includes("#projects"), "et celui des projets");

  // Le même bouton pour tous : en dessiner un par raccourci les ferait diverger
  // de taille. Cela, seul le gabarit de l'en-tête peut le dire.
  const entete = readFileSync(join(VUES, "global-header.js"), "utf8");
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
  // La marque s'interroge, elle ne se relit plus : c'est le seul raccourci qui
  // en porte une, et la liste le dit.
  const marques = RACCOURCIS_GLOBAUX.filter((un) => un.marque);
  assert.deepEqual(marques.map((un) => un.href), [ROUTE_DU_CARNET],
    "seul le raccourci des situations porte un geste");
  assert.equal(marques[0].marque, MARQUE_DES_SITUATIONS);

  const entete = readFileSync(join(VUES, "global-header.js"), "utf8");
  assert.match(
    entete,
    /closest\?\.\(`\[data-raccourci="\$\{MARQUE_DES_SITUATIONS\}"\]`\)/,
    "et l'écoute doit le reconnaître, par la marque elle-même et non par une copie"
  );
  // Le même geste que le fil d'Ariane, au même endroit : deux façons de revenir
  // à la liste finiraient par ne plus se ressembler (règle 10).
  assert.match(entete, /globalHeaderSituationsBack[\s\S]{0,200}MARQUE_DES_SITUATIONS/);
});
