/**
 * Le rendu Markdown d'une réponse : ce qu'il reconnaît, et ce qu'il neutralise.
 *
 * La règle qui gouverne tout le fichier — **échapper d'abord, reconnaître
 * ensuite** — se vérifie ici et nulle part ailleurs : une réponse est du texte
 * venu d'un modèle, donc du texte venu d'ailleurs.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { rendreLeMarkdown } from "./markdown-leger.js";

test("un tableau devient un tableau", () => {
  // C'est la forme qu'une descente de charges appelle. Rendue en texte, elle
  // demande à l'ingénieur de faire le travail de l'écran.
  const rendu = rendreLeMarkdown([
    "| Appui | Cotes | Gouverné par |",
    "|-------|------:|:------------:|",
    "| File A | 0,8 × 0,8 | basculement |",
    "| File B | 1,2 × 1,2 | contrainte |"
  ].join("\n"));

  assert.match(rendu, /<table class="md-tableau">/);
  assert.equal((rendu.match(/<th /g) ?? []).length, 3);
  assert.equal((rendu.match(/<tr>/g) ?? []).length, 3, "un en-tête et deux lignes");
  assert.match(rendu, /<td style="text-align:right">0,8 × 0,8<\/td>/);
  assert.match(rendu, /<th scope="col" style="text-align:center">Gouverné par<\/th>/);
  // Et il défile dans son propre cadre : un tableau large ne pousse pas la
  // conversation hors de l'écran.
  assert.match(rendu, /<div class="md-tableau__cadre">/);
});

test("des barres verticales dans une phrase ne font pas un tableau", () => {
  // Sans la ligne de séparation, ce sont des barres verticales, pas des colonnes.
  const rendu = rendreLeMarkdown("La combinaison ELU | Gmin + 1,5W1 gouverne.");
  assert.doesNotMatch(rendu, /<table/);
  assert.match(rendu, /<p>/);
});

test("une ligne manquante ne décale pas les colonnes", () => {
  const rendu = rendreLeMarkdown("| A | B | C |\n|---|---|---|\n| 1 | 2 |");
  assert.equal((rendu.match(/<td/g) ?? []).length, 3, "la cellule absente reste vide, elle ne disparaît pas");
});

test("titres, listes et blocs de code se reconnaissent", () => {
  const rendu = rendreLeMarkdown([
    "## Massifs", "", "- File A", "- File B", "", "1. Lire la note", "2. Calculer", "",
    "```", "const a = 1 * 2;", "```"
  ].join("\n"));

  assert.match(rendu, /<h4 class="md-titre">Massifs<\/h4>/);
  assert.match(rendu, /<ul class="md-liste"><li>File A<\/li><li>File B<\/li><\/ul>/);
  assert.match(rendu, /<ol class="md-liste">/);
  // Dans un bloc de code, rien n'est reconnu : l'astérisque reste un astérisque.
  assert.match(rendu, /<pre class="md-code"><code>const a = 1 \* 2;<\/code><\/pre>/);
});

test("le HTML d'une réponse est neutralisé avant toute reconnaissance", () => {
  // Une réponse vient d'ailleurs. L'interpréter comme du HTML ouvrirait la porte
  // à n'importe quoi — et l'ordre inverse laisse passer ce qu'on croyait avoir
  // neutralisé.
  const rendu = rendreLeMarkdown('<img src=x onerror="alert(1)"> et **gras**');
  assert.doesNotMatch(rendu, /<img/);
  assert.match(rendu, /&lt;img/);
  assert.match(rendu, /<strong>gras<\/strong>/);

  // Y compris dans un tableau, où le texte passe par les cellules.
  const tableau = rendreLeMarkdown("| A |\n|---|\n| <script>x</script> |");
  assert.doesNotMatch(tableau, /<script>/);
});

test("un lien ne s'ouvre que sur http et https", () => {
  assert.match(rendreLeMarkdown("[la note](https://exemple.fr/a)"),
    /<a href="https:\/\/exemple\.fr\/a" target="_blank" rel="noopener noreferrer">la note<\/a>/);
  // Une adresse qui porte du code n'est pas un lien : elle reste du texte.
  const rendu = rendreLeMarkdown("[clic](javascript:alert(1))");
  assert.doesNotMatch(rendu, /<a /);
});

test("un astérisque dans du code en ligne reste un astérisque", () => {
  // Sans la mise à l'abri, l'extrait ne dirait plus ce qu'il montre.
  const rendu = rendreLeMarkdown("La formule `a * b * c` et un *mot* en italique.");
  assert.match(rendu, /<code>a \* b \* c<\/code>/);
  assert.match(rendu, /<em>mot<\/em>/);
});

test("un texte vide ne rend rien", () => {
  assert.equal(rendreLeMarkdown(""), "");
  assert.equal(rendreLeMarkdown(null), "");
});
