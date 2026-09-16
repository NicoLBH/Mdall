/**
 * Le Copilote qui n'est d'aucun projet : sa coque, et sa hauteur.
 *
 * ## Ce que ces gardes attrapent
 *
 * **Une coque qui ne porte pas la classe du Copilote.** C'est elle qui donne au
 * fil son unique ascenseur : sans elle, la coque défile *et* le fil défile, on
 * ne sait plus lequel pousser, et le bouton « aller en bas » regarde le mauvais.
 * Rien à l'écran ne le dit — on s'en aperçoit en essayant de remonter.
 *
 * **Une hauteur qui n'est écrite nulle part.** `caler()` cherche la coque par
 * une classe et y écrit `--copilote-hauteur`. Cette ligne nommait la coque de
 * l'Atelier : reprise telle quelle, le Copilote transverse n'aurait jamais reçu
 * de hauteur, `height:100%` ne se serait rapporté à rien, et le fil aurait
 * poussé la page. La garde lit **la vraie ligne** du Copilote et vérifie que
 * les deux écrans la satisfont — c'est la relation entre trois fichiers qui est
 * en cause, et aucun ne la porte seul.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  HOTE_DU_COPILOTE, RAIL_DU_COPILOTE, renderPageDuCopiloteTransversal
} from "./copilote-transversal-page.js";

const copilote = await readFile(new URL("./studio/copilote/copilote.js", import.meta.url), "utf8");
const atelier = await readFile(new URL("./project-studio.js", import.meta.url), "utf8");
const css = await readFile(new URL("../../style.css", import.meta.url), "utf8");

const html = renderPageDuCopiloteTransversal({ navHtml: "<em>les fils</em>", railLargeur: 260 });

test("la page porte le rail, son contenu et l'hôte du Copilote", () => {
  assert.match(html, new RegExp(`data-project-rail="${RAIL_DU_COPILOTE}"`));
  assert.match(html, new RegExp(`id="${HOTE_DU_COPILOTE}"`));
  assert.match(html, /<em>les fils<\/em>/, "le rail reçoit ce que l'appelant lui donne");
  assert.match(html, /--project-rail-width:260px/);
});

/**
 * **La classe qui donne au fil son unique ascenseur.** L'Atelier la pose au
 * moment où l'on ouvre le panneau du Copilote ; ici l'écran *est* le Copilote,
 * et elle est donc écrite d'emblée.
 */
test("la coque porte la classe du Copilote, et la feuille de style lui donne sa hauteur", () => {
  assert.match(html, /project-simple-page--copilote/);

  assert.match(
    css,
    /\.project-simple-page--copilote\{[^}]*height:var\(--copilote-hauteur/,
    "c'est cette classe qui reçoit la hauteur mesurée"
  );
});

/**
 * **La ligne de `caler()`, lue pour de vrai.**
 *
 * On ne vérifie pas qu'elle dit tel mot : on prend le sélecteur qu'elle emploie
 * et l'on regarde s'il attrape les deux coques. Une garde qui aurait comparé le
 * texte à `.project-simple-page` n'aurait constaté qu'une réécriture, pas un
 * écran laissé dehors.
 */
test("la hauteur du fil se mesure sur une coque que les deux écrans portent", () => {
  const trouve = copilote.match(/root\.closest\("([^"]+)"\)/);
  assert.ok(trouve, "la ligne qui cherche la coque, dans caler()");

  const selecteur = trouve[1];
  const classes = selecteur.split(".").filter(Boolean);
  assert.ok(classes.length, "un sélecteur de classes");

  for (const [nom, source] of [["le Copilote transverse", html], ["l'Atelier", atelier]]) {
    for (const classe of classes) {
      assert.match(
        source, new RegExp(`class="[^"]*\\b${classe}\\b`),
        `${nom} porte ${classe} : sans elle, le fil n'a pas de hauteur et pousse la page`
      );
    }
  }
});

/**
 * **La règle des colonnes couvre les ancêtres, quel qu'en soit le nombre.**
 *
 * Elle les nommait un par un ; le jour où un conteneur de plus s'est glissé au
 * milieu, la chaîne s'est rompue sans un mot. Ce Copilote-ci ajoute justement
 * des conteneurs que l'Atelier n'a pas — c'est le cas qu'on veut couvert.
 */
test("les ancêtres du Copilote sont couverts par la règle, sans être énumérés", () => {
  const regle = css.slice(
    css.lastIndexOf("\n.project-simple-page--copilote :has("),
    css.indexOf("}", css.indexOf(".project-simple-page--copilote .copilote-section{"))
  );

  assert.match(regle, /:has\(\.copilote-section\)/, "les ancêtres se disent par ce qu'ils contiennent");
  assert.match(regle, /height:100%/);
});
