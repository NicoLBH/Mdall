/**
 * Le Mdall coloré, et le fait qu'il le soit partout pareil.
 *
 * **Les jetons viennent d'une ligne, jamais d'une main.** Écrire ici
 * `{ type: "mot-condition", texte: "si" }` reviendrait à recopier les
 * hypothèses du code dans son épreuve : le jour où la grammaire change, la
 * fixture resterait verte sur une forme que plus rien ne produit. On tape donc
 * du Mdall, et `jetonsDeLaLigne` le rend comme il le rendrait à l'écran.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { renderJetons, renderSurligne, contexteDuSujet } from "./code-mdall.js";
import { contexteDuSujet as celuiDeLaMemoire } from "../project-memoire-fichiers.js";
import { jetonsDeLaLigne } from "../../services/memoire-en-lecture.js";

/* ── La grammaire se voit ────────────────────────────────────────────────── */

test("chaque jeton porte la classe de sa nature", () => {
  const html = renderJetons(jetonsDeLaLigne("   si (Hauteur du plancher bas <= 28 m)"));

  assert.match(html, /<span class="mdall-mot-condition">si<\/span>/);
  assert.match(html, /<span class="mdall-sujet[^"]*">Hauteur du plancher bas<\/span>/);
  assert.match(html, /<span class="mdall-operateur">&lt;=<\/span>/);
  assert.match(html, /<span class="mdall-valeur">28<\/span>/);
  assert.match(html, /<span class="mdall-unite">m<\/span>/);
});

test("un sujet que rien ne déclare se colore autrement qu'un sujet connu", () => {
  // C'est cette couleur-là qui fait qu'une mémoire se vérifie en la lisant :
  // une condition posée sur une donnée jamais versée se voit sans la chercher.
  const jetons = jetonsDeLaLigne("   si (Portance du sol >= 0,2 MPa)");

  assert.match(renderJetons(jetons, { declares: new Set(["portance du sol"]) }), /mdall-sujet--connu/);
  assert.match(renderJetons(jetons, { declares: new Set() }), /mdall-sujet--inconnu/);
});

test("une tête d'affirmation pose le nom : elle ne se cherche pas", () => {
  // `Altitude du site = 742,30 m` **est** la déclaration. La résoudre contre
  // une table reviendrait à demander à un nom de se prouver lui-même — et la
  // ligne se peindrait en rouge sur le fichier qui la définit.
  const html = renderJetons(jetonsDeLaLigne("Altitude du site = 742,30 m {"), { declares: new Set() });

  assert.match(html, /mdall-sujet--declaration/);
  assert.doesNotMatch(html, /mdall-sujet--inconnu/);
});

test("sans rien savoir des déclarations, un renvoi ne se dit ni connu ni inconnu", () => {
  // Le bac d'essai n'a pas de mémoire sous la main. Annoncer « inconnu » faute
  // de savoir ferait passer une ignorance pour un constat (règle 5), et le
  // fichier serait rouge de bout en bout sans rien apprendre à personne.
  const html = renderJetons(jetonsDeLaLigne("   si (Portance du sol >= 0,2 MPa)"), { declares: null });

  assert.match(html, /class="mdall-sujet"/);
  assert.doesNotMatch(html, /mdall-sujet--/);
});

test("un commentaire se rend tel quel, sans qu'on y cherche une grammaire", () => {
  const html = renderJetons(jetonsDeLaLigne("// la cote hors gel vient de l'altitude"));

  assert.match(html, /<span class="mdall-commentaire">/);
  assert.doesNotMatch(html, /mdall-sujet/);
});

/* ── Le surlignage se pose par-dessus, il n'efface pas ───────────────────── */

test("le mot cherché se surligne dans son jeton, sans effacer la grammaire", () => {
  const html = renderJetons(jetonsDeLaLigne("   si (Hauteur du plancher bas <= 28 m)"), { mot: "Hauteur" });

  // La marque est **dedans**, et le jeton garde sa classe.
  assert.match(html, /class="mdall-sujet[^"]*"><mark class="memoire-trouve">Hauteur<\/mark>/);
  assert.match(html, /<span class="mdall-mot-condition">si<\/span>/);
});

test("un texte sans le mot cherché ressort entier", () => {
  assert.equal(renderSurligne("Altitude du site", "portance"), "Altitude du site");
});

/* ── Rien de ce qui vient d'un fichier n'est du balisage ─────────────────── */

test("un sujet qui contient du balisage est échappé, jamais injecté", () => {
  // Un nom de sujet est du texte que quelqu'un a écrit, et un fichier de
  // mémoire se colle depuis n'importe où.
  const html = renderJetons(jetonsDeLaLigne('<script>alert(1)</script> = "x"'));

  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("le mot cherché échappe aussi, des deux côtés de la marque", () => {
  const html = renderJetons(jetonsDeLaLigne('<b>Hauteur</b> = "26 m"'), { mot: "Hauteur" });

  assert.doesNotMatch(html, /<b>/);
  assert.match(html, /&lt;b&gt;<mark class="memoire-trouve">Hauteur<\/mark>&lt;\/b&gt;/);
});

/* ── Et c'est bien le même rendu des deux côtés ──────────────────────────── */

test("la Mémoire n'a pas sa copie : elle exporte ce qu'elle a importé", () => {
  // Le défaut qu'on ferme : deux colorations recopiées qui divergent au premier
  // mot-clé ajouté, et c'est celle qu'on ne regarde pas qui a raison le jour où
  // l'on cherche pourquoi deux écrans ne colorent pas pareil (règle 4).
  //
  // L'égalité de référence est ce qui le prouve : deux fonctions au même
  // comportement mais à deux endroits passeraient toutes les épreuves du
  // dessus, et divergeraient ensuite.
  assert.equal(celuiDeLaMemoire, contexteDuSujet);
});

test("le survol d'un nom dit ce qu'il vaut, où il est déclaré, et qui s'en sert", () => {
  const variables = new Map([["altitude du site", {
    valeur: "742,30 m", declaree: true, declarePar: "donnees-de-base.ddb",
    usages: [{ fonction: "Profondeur hors gel", fichier: "fondations.ref" }], citeePar: []
  }]]);

  const dit = contexteDuSujet("Altitude du site", { resolution: "connu", variables });

  assert.match(dit, /vaut 742,30 m/);
  assert.match(dit, /déclarée dans donnees-de-base\.ddb/);
  assert.match(dit, /1 usage — Profondeur hors gel \(fondations\.ref\)/);
});

test("un renvoi qui ne mène nulle part le dit ; un nom qu'on ne sait pas juger se tait", () => {
  assert.match(contexteDuSujet("Autre chose", { resolution: "inconnu" }), /ne mène nulle part/);
  assert.equal(contexteDuSujet("Altitude du site", { resolution: "connu" }), "");
  assert.equal(contexteDuSujet("", { resolution: "inconnu" }), "");
});

test("le survol se pose sur le sujet, et sur rien d'autre", () => {
  // Un titre sur chaque jeton ferait un nuage au moindre passage de souris, et
  // l'on ne saurait plus de quel mot il parle.
  const variables = new Map([["hauteur du plancher bas", {
    valeur: "26 m", declaree: true, declarePar: "donnees-de-base.ddb", usages: [], citeePar: []
  }]]);
  const html = renderJetons(jetonsDeLaLigne("   si (Hauteur du plancher bas <= 28 m)"), {
    declares: new Set(["hauteur du plancher bas"]), variables
  });

  assert.equal((html.match(/ title="/g) ?? []).length, 1);
  assert.match(html, /class="mdall-sujet mdall-sujet--connu" title="Hauteur du plancher bas/);
});

test("un mot qui porte le nom d'une variable sans en être un ne prend pas son survol", () => {
  // `écarté: Bardage bois` nomme **l'option qu'on a refusée**, et « Bardage
  // bois » est très souvent aussi une variable du projet, déclarée ailleurs.
  // Poser dessus le survol de la variable ferait lire « vaut 742,30 m » sous un
  // mot qui, ici, veut dire le contraire : ce qu'on n'a pas retenu.
  const variables = new Map([["bardage bois", {
    valeur: "oui", declaree: true, declarePar: "façades.ctr", usages: [], citeePar: []
  }]]);

  const html = renderJetons(jetonsDeLaLigne("   écarté: Bardage bois"), {
    declares: new Set(["bardage bois"]), variables
  });

  assert.match(html, /<span class="mdall-nom-local">Bardage bois<\/span>/);

  // Au passage : `écarté:` est lu comme un sujet par `jetonsDeLaLigne`, alors
  // que l'écriture a `mot-ecarte` pour lui — il porte donc son propre survol,
  // et c'est un défaut de la lecture, pas de la coloration. On vérifie ici que
  // **le nom écarté** n'en prend pas, ce qui est la question posée.
  const nomLocal = html.slice(html.indexOf('mdall-nom-local'));
  assert.doesNotMatch(nomLocal, /title="/);
});

test("un nom qui porte un guillemet ne sort pas de son attribut", () => {
  // Un sujet vient d'un document : « Hauteur "hors tout" » est une écriture
  // ordinaire. Rendue telle quelle dans `title="…"`, elle referme l'attribut et
  // le reste de la phrase devient du balisage.
  const variables = new Map([['hauteur "hors tout"', {
    valeur: "26 m", declaree: true, declarePar: 'relevé "A".ddb', usages: [], citeePar: []
  }]]);

  const html = renderJetons(jetonsDeLaLigne('   si (Hauteur "hors tout" <= 28 m)'), {
    declares: new Set(['hauteur "hors tout"']), variables
  });

  assert.doesNotMatch(html, /title="[^"]*"[a-zA-Zéè]/);
  assert.match(html, /&quot;hors tout&quot;/);
});
