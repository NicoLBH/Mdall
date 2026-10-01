/**
 * **Un seul rail, et tous les écrans qui en ont un l'emploient.**
 *
 * ## Le défaut que cette épreuve existe pour attraper
 *
 * Le journal des Actions avait le sien : les classes que la Mémoire employait
 * **avant** de passer à la coque commune, une poignée branchée à part, une
 * largeur bornée autrement. La Mémoire a déménagé ; la copie est restée.
 *
 * Conséquences, toutes visibles à l'écran et toutes déjà réglées ailleurs : le
 * rail ne se calait pas sous la barre des onglets, ne descendait pas jusqu'en
 * bas, et replié il laissait le tableau glisser sous lui. Il a fallu les régler
 * **une fois de plus**.
 *
 * > « Je pensais que les composants étaient vraiment mutualisés ; si ce n'est
 * > pas encore complètement le cas, il faut s'en occuper maintenant. »
 *
 * ## Pourquoi on relit la source
 *
 * Une coque dessinée deux fois ne lève pas : elle s'affiche, de travers. Ce
 * n'est ni un rendu qu'on peut comparer — les deux produisent du HTML — ni un
 * service pur. Ce qu'on peut tenir, c'est qu'aucun écran ne dessine un
 * `<aside>` de navigation en propre.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const VUES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Tous les écrans, sauf les composants partagés qui ont le droit de dessiner. */
function lesEcrans(dossier = VUES, trouves = []) {
  for (const nom of readdirSync(dossier).sort()) {
    const complet = path.join(dossier, nom);
    if (statSync(complet).isDirectory()) { lesEcrans(complet, trouves); continue; }
    if (!nom.endsWith(".js")) continue;
    trouves.push(complet);
  }
  return trouves;
}

/**
 * Les deux modules qui ont le droit de dessiner une coque de rail.
 *
 * `project-rail.js` est la coque elle-même ; `side-nav-layout.js` est l'autre
 * disposition — une navigation **dans** la page, sans rail fixe, que les
 * Paramètres et les Indicateurs emploient. Les deux sont des composants, pas
 * des écrans.
 */
const LES_DESSINATEURS = ["ui/project-rail.js", "ui/side-nav-layout.js"];

/**
 * **Celle qui reste, nommée — et pourquoi elle reste.**
 *
 * L'arborescence de Fichiers dessine encore la sienne. Ce n'est pas un oubli :
 * elle porte **une recherche dans sa tête**, que `renderProjectRail` n'a pas de
 * fente pour accueillir. La migrer demande d'ouvrir la coque commune à un
 * en-tête — ce qui est la bonne chose à faire, et une chose à faire exprès.
 *
 * **Elle est écrite ici plutôt que tue.** Une épreuve qui exclut en silence ment
 * sur ce qu'elle garantit ; celle-ci dit exactement ce qui reste, et tombe le
 * jour où une **quatrième** apparaît. C'est tout ce qu'on lui demande : que la
 * liste ne s'allonge pas pendant qu'on regarde ailleurs.
 */
const CELLE_QUI_RESTE = ["project-memoire-fichiers.js"];

test("il ne naît pas de nouvelle coque de rail", () => {
  const fautes = [];

  for (const chemin of lesEcrans()) {
    const relatif = path.relative(VUES, chemin).split(path.sep).join("/");
    if (LES_DESSINATEURS.includes(relatif) || relatif.endsWith(".test.mjs")) continue;
    if (CELLE_QUI_RESTE.includes(relatif)) continue;

    const source = readFileSync(chemin, "utf8");
    /**
     * **`memoire-tree`, et elle seule.**
     *
     * C'est le nom de la coque que la Mémoire employait avant de passer à la
     * commune : un écran qui la porte en a fait une copie.
     *
     * Le premier jet attrapait aussi `documents-tree`, et refusait l'arbre des
     * différences d'une proposition — qui n'est pas un rail : il vit **dans** la
     * page, pas contre le bord de la fenêtre. Une garde qui refuse ce qu'elle ne
     * vise pas se fait désarmer au premier faux positif.
     */
    if (/<aside[^>]*class="[^"]*memoire-tree/.test(source)) {
      fautes.push(`${relatif} dessine son propre rail`);
    }
  }

  assert.deepEqual(fautes, [],
    `ces écrans ont leur coque à eux, qui divergera de la commune :\n${fautes.join("\n")}`);
});

/**
 * **Et celle qui reste est encore là.**
 *
 * Sans cette épreuve, le jour où l'arborescence de Fichiers passerait enfin à la
 * coque commune, son nom resterait dans la liste des exceptions — et la liste
 * couvrirait un écran qui n'en a plus besoin, prête à laisser passer le
 * suivant qui porterait ce nom.
 */
test("la liste des exceptions ne couvre rien qui n'existe plus", () => {
  for (const relatif of CELLE_QUI_RESTE) {
    const source = readFileSync(path.join(VUES, relatif), "utf8");
    assert.match(source, /<aside[^>]*class="[^"]*memoire-tree/,
      `« ${relatif} » n'a plus sa coque à lui : retirez-le des exceptions`);
  }
});

/**
 * **Le journal des Actions emploie la coque commune**, nommément.
 *
 * L'épreuve d'au-dessus dit qu'il n'en dessine pas une seconde ; celle-ci dit
 * qu'il emploie la première. Sans elle, un écran qui n'afficherait **aucun**
 * rail passerait les deux.
 */
test("le journal des Actions emploie le rail commun", () => {
  const source = readFileSync(path.join(VUES, "project-actions.js"), "utf8");

  assert.match(source, /renderProjectRail\(\{/, "il ne dessine pas le rail commun");
  assert.match(source, /project-rail-layout/, "il n'emploie pas la disposition commune");
  assert.match(source, /followRailScroll\(/,
    "son rail ne se cale pas sous la barre des onglets au défilement");
  assert.match(source, /bindRailResizer\(\{/, "sa poignée est branchée à part");
  assert.match(source, /railWidth\(/, "sa largeur est bornée autrement");

  // Et le bandeau de vue est masqué : il ne portait qu'un libellé, et sa bande
  // vide empêchait le rail de se caler sous les onglets.
  assert.match(source, /hideBar: true/, "le bandeau de vue vide est encore là");
});

/**
 * **Les entrées d'un rail se dessinent toutes avec le même gabarit.**
 *
 * Le journal des Actions employait `side-nav-layout`, celui des pages de
 * réglages — qui ne se replient pas. Les règles qui masquent le texte d'un rail
 * replié sont écrites pour `nav-list`, le gabarit que la Mémoire, les Sujets,
 * l'Accueil et le Copilote emploient tous.
 *
 * Rien ne levait : **le rail des Actions replié gardait ses libellés et ses
 * compteurs**, à cheval sur la colonne d'icônes. Un composant employé à moitié
 * ne se voit qu'à l'écran, et seulement dans l'état où on ne regarde pas.
 */
test("un écran à rail dessine ses entrées avec nav-list, jamais side-nav-layout", () => {
  const fautes = [];

  for (const chemin of lesEcrans()) {
    const relatif = path.relative(VUES, chemin).split(path.sep).join("/");
    if (LES_DESSINATEURS.includes(relatif)) continue;

    const source = readFileSync(chemin, "utf8");
    if (!/renderProjectRail\(\{/.test(source)) continue;

    if (/\brenderSideNav(Item|Group)\(/.test(source)) {
      fautes.push(
        `${relatif} remplit un rail avec « side-nav-layout » : replié, `
        + "il gardera ses libellés et ses compteurs"
      );
    }
  }

  assert.deepEqual(fautes, [], fautes.join("\n"));

  // **Sans ce compte, un dépôt sans rail passerait** en n'ayant rien relu
  // (règle 12).
  const aRail = lesEcrans().filter((un) =>
    /renderProjectRail\(\{/.test(readFileSync(un, "utf8")));
  assert.ok(aRail.length >= 5, `trop peu d'écrans à rail relus : ${aRail.length}`);
});
