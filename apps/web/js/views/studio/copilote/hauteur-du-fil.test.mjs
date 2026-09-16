/**
 * La chaîne de hauteurs qui donne au fil du Copilote sa barre de défilement.
 *
 * ## Le défaut, et pourquoi il est muet
 *
 * Sur cet écran, **la coque ne défile pas** : `overflow:hidden`, délibérément,
 * pour qu'il n'y ait qu'un seul ascenseur — celui du fil. Le fil, lui, prend
 * `height:100%`, et un pourcentage ne vaut que si **chacun** de ses ancêtres a
 * une hauteur définie.
 *
 * La feuille de style les nommait un par un. Le jour où un conteneur de plus
 * s'est glissé entre deux d'entre eux, la chaîne s'est rompue sans un mot :
 * plus de hauteur, donc plus de `overflow` utile, donc **plus rien ne défilait
 * du tout** — ni le fil, ni la page. On ne pouvait plus remonter lire ce qui
 * venait d'être répondu.
 *
 * ## Ce que cette garde exécute
 *
 * Elle lit **la vraie structure** que l'Atelier écrit, et **la vraie règle** de
 * la feuille de style, et vérifie que chaque conteneur du chemin est couvert.
 * C'est la relation entre deux fichiers qui est en cause, et aucun des deux ne
 * la porte seul : c'est pourquoi on ne peut pas s'en remettre à la lecture.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const atelier = await readFile(new URL("../../project-studio.js", import.meta.url), "utf8");
const css = await readFile(new URL("../../../../style.css", import.meta.url), "utf8");

/**
 * Les conteneurs que l'Atelier pose entre la page et le Copilote.
 *
 * On part de la coque et l'on descend jusqu'à l'hôte du Copilote, en relevant
 * chaque `class` et chaque `id` ouverts en chemin. Les balises qui se referment
 * avant l'hôte ne sont pas des ancêtres et ne comptent pas — c'est le cas du
 * rail, qui est un frère.
 */
function conteneursDuChemin() {
  const debut = atelier.indexOf('<section class="project-simple-page');
  const fin = atelier.indexOf('id="projectStudioCopilotePanel"');
  assert.ok(debut >= 0 && fin > debut, "la coque de l'Atelier et l'hôte du Copilote");

  const chemin = [];
  const pile = [];
  const balises = atelier.slice(debut, fin).matchAll(/<(\/?)(\w+)([^>]*)>/g);

  for (const [, fermante, , attributs] of balises) {
    if (fermante) { pile.pop(); continue; }
    // Une balise auto-fermante n'ouvre rien : elle ne peut pas être un ancêtre.
    if (attributs.trim().endsWith("/")) continue;

    const noms = [];
    for (const classe of (attributs.match(/class="([^"]*)"/)?.[1] ?? "").split(/\s+/)) {
      if (classe) noms.push(`.${classe}`);
    }
    const identifiant = attributs.match(/id="([^"]*)"/)?.[1] ?? "";
    if (identifiant) noms.push(`#${identifiant}`);

    pile.push(noms);
    chemin.push(noms);
  }

  // Ce qui est encore ouvert quand on arrive à l'hôte : les ancêtres.
  return pile;
}

/**
 * La règle qui fait de ces conteneurs des colonnes de pleine hauteur.
 *
 * On la trouve par **ce qu'elle habille en dernier** — la section du Copilote
 * elle-même —, et non par la forme de son premier sélecteur : une garde qui
 * cherchait `:has(` ne tomberait qu'en constatant qu'on a changé d'écriture,
 * pas en constatant qu'un conteneur est resté dehors. C'est le second défaut
 * qu'on veut voir.
 */
function regleDeLaColonne() {
  const fin = css.indexOf(".project-simple-page--copilote .copilote-section{");
  assert.ok(fin >= 0, "la règle des colonnes du Copilote");

  // Le début de la liste de sélecteurs : ce qui suit la déclaration précédente
  // ou le commentaire qui l'introduit.
  const avant = Math.max(css.lastIndexOf("}", fin), css.lastIndexOf("*/", fin));
  const solution = css.indexOf("{", fin);

  return {
    selecteurs: css.slice(avant + 1, solution),
    declarations: css.slice(solution, css.indexOf("}", solution))
  };
}

/**
 * Tout ce à quoi la feuille de style donne une hauteur **sur cet écran**.
 *
 * On ne regarde pas une règle en particulier : la coque a la sienne, les
 * conteneurs en ont une autre, et demain il y en aura peut-être une troisième.
 * Ce qui compte est qu'aucun maillon ne reste sans hauteur.
 */
function selecteursQuiDonnentUneHauteur() {
  const dits = [];

  for (const [, selecteurs, declarations] of css.matchAll(/([^{}]*\.project-simple-page--copilote[^{}]*)\{([^}]*)\}/g)) {
    if (declarations.includes("height:100%")) dits.push(selecteurs);
  }

  assert.ok(dits.length > 0, "quelque chose donne une hauteur au Copilote");
  return dits.join("\n");
}

test("chaque conteneur du chemin reçoit sa hauteur", () => {
  const donnent = selecteursQuiDonnentUneHauteur();
  const ancetres = conteneursDuChemin();

  assert.ok(ancetres.length >= 4, "le chemin traverse plusieurs conteneurs");

  // **La règle des ancêtres, ou le nom du conteneur** : l'un ou l'autre suffit.
  // La première se règle toute seule quand un conteneur s'ajoute ; la seconde
  // est une liste, et c'est une liste qui s'est trouvée fausse.
  const parLaRegle = donnent.includes(":has(.copilote-section)");

  for (const noms of ancetres) {
    assert.ok(
      parLaRegle || noms.some((nom) => donnent.includes(nom)),
      `${noms.join("") || "<sans nom>"} n'a pas de hauteur : la chaîne se rompt là, `
        + "et le fil cesse de défiler"
    );
  }
});

/** Et ce qu'elle pose est bien une colonne bornée, pas seulement une hauteur. */
test("la règle fait une colonne, et lui interdit de grandir", () => {
  const { declarations } = regleDeLaColonne();

  assert.match(declarations, /display:flex/);
  assert.match(declarations, /flex-direction:column/);
  assert.match(declarations, /height:100%/);
  // **`min-height:0` n'est pas décoratif** : sans lui, un enfant de flex refuse
  // de descendre sous la hauteur de son contenu, et le fil repousse la colonne
  // au lieu de défiler dedans.
  assert.match(declarations, /min-height:0/);
});

/**
 * **Le seul ascenseur est celui du fil**, et c'est ce qui rend la chaîne
 * obligatoire : si la coque défilait aussi, une chaîne rompue se serait vue
 * tout de suite au lieu de tout figer.
 */
test("la coque ne défile pas, et le fil défile", () => {
  assert.match(
    css,
    /\.project-simple-page--copilote \.project-simple-scroll--parametres\{[^}]*overflow:hidden/,
    "la coque"
  );
  assert.match(css, /\.copilote-thread\{[^}]*overflow-y:auto/, "le fil");
  assert.match(css, /\.copilote-thread-wrap\{[^}]*min-height:0/, "et rien ne l'empêche de se borner");
});
