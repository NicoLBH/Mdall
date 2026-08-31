import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdownToHtml } from './markdown-renderer.js';

globalThis.katex = {
  renderToString(latex, options = {}) {
    if (latex.trim().endsWith('{')) throw new Error('invalid latex');
    return `<span class="katex${options.displayMode ? ' katex-display' : ''}">${latex}</span>`;
  }
};

test('renderer garde le découpage en paragraphes par défaut', () => {
  const html = renderMarkdownToHtml('ligne 1\n\nligne 2');
  assert.match(html, /<p>ligne 1<\/p><p>ligne 2<\/p>/);
});

test('renderer peut préserver les retours à la ligne des messages', () => {
  const html = renderMarkdownToHtml('ligne 1\n\nligne 2', { preserveMessageLineBreaks: true });
  assert.match(html, /<p>ligne 1<br><br>ligne 2<\/p>/);
});

test('renderer en mode message reste sécurisé sur le HTML brut', () => {
  const html = renderMarkdownToHtml('bonjour <br> test', { preserveMessageLineBreaks: true });
  assert.match(html, /bonjour &lt;br&gt; test/);
  assert.doesNotMatch(html, /bonjour <br> test/);
});

test('renderer en mode message conserve titres, citations et listes markdown', () => {
  const markdown = '# Titre\n\n> Citation\n\n- élément';
  const html = renderMarkdownToHtml(markdown, { preserveMessageLineBreaks: true });
  assert.match(html, /<h1>Titre<\/h1>/);
  assert.match(html, /<blockquote>Citation<\/blockquote>/);
  assert.match(html, /<ul><li>élément<\/li><\/ul>/);
});

test('renderer rend les maths inline avec \\( ... \\)', () => {
  const html = renderMarkdownToHtml('Pythagore: \\(a^2 + b^2 = c^2\\)');
  assert.match(html, /md-math md-math--inline/);
  assert.match(html, /katex/);
});

test('renderer rend les blocs $$...$$', () => {
  const html = renderMarkdownToHtml('$$\\int_0^1 x^2 dx$$');
  assert.match(html, /md-math md-math--block/);
  assert.match(html, /katex-display/);
});

test('renderer rend les blocs \\[ ... \\]', () => {
  const html = renderMarkdownToHtml('\\[E = mc^2\\]');
  assert.match(html, /md-math md-math--block/);
  assert.match(html, /katex-display/);
});

test('renderer conserve markdown gras et liens avec les maths', () => {
  const html = renderMarkdownToHtml('**important** [lien](https://example.com) \\(x\\)');
  assert.match(html, /<strong>important<\/strong>/);
  assert.match(html, /<a href="https:\/\/example.com" target="_blank" rel="noopener noreferrer">lien<\/a>/);
  assert.match(html, /md-math--inline/);
});

test('renderer ne rend pas latex dans le code inline', () => {
  const html = renderMarkdownToHtml('`\\(x\\)`');
  assert.match(html, /<code>\\\(x\\\)<\/code>/);
  assert.doesNotMatch(html, /md-math/);
});

test('renderer garde preserveMessageLineBreaks avec math inline', () => {
  const html = renderMarkdownToHtml('a\n\n\\(x\\)', { preserveMessageLineBreaks: true });
  assert.match(html, /<p>a<br><br><span class="md-math md-math--inline">/);
});

test('renderer garde le message lisible en cas de formule invalide', () => {
  const html = renderMarkdownToHtml('\\(\\frac{1}{\\)');
  assert.match(html, /md-math--error/);
  assert.match(html, /\\frac/);
});

test('renderer laisse postProcessHtml traiter les références sujet', () => {
  const html = renderMarkdownToHtml('Voir #123', {
    postProcessHtml: (raw) => raw.replace('#123', '<a class="md-subject-link" href="#123">#123</a>')
  });
  assert.match(html, /md-subject-link/);
});

test("un tableau se lit en tableau", () => {
  // Un « avant / après » se lit en tableau et se perd en phrases : c'est
  // exactement ce qu'une note de dépôt a à dire.
  const html = renderMarkdownToHtml([
    "| Avis | Avant | Après |",
    "| --- | --- | ---: |",
    "| A12 | émis | levé |",
    "| A13 | levé | émis |"
  ].join("\n"));

  assert.match(html, /<table class="md-table">/);
  assert.match(html, /<th>Avis<\/th>/);
  assert.match(html, /<td style="text-align:right">levé<\/td>/);
  assert.equal((html.match(/<tr>/g) || []).length, 3, "un en-tête et deux lignes");
});

test("une phrase avec une barre verticale reste une phrase", () => {
  // Sans la ligne de tirets, ce n'est pas un tableau : deviner en ferait un de
  // la moitié des lignes de commande citées dans une discussion.
  const html = renderMarkdownToHtml("le lot A | le lot B");

  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<p>le lot A \| le lot B<\/p>/);
});

test("une ligne incomplète ne décale pas le tableau", () => {
  const html = renderMarkdownToHtml([
    "| A | B | C |",
    "| --- | --- | --- |",
    "| 1 | 2 |"
  ].join("\n"));

  assert.equal((html.match(/<td/g) || []).length, 3, "la cellule manquante est vide, pas absente");
});

test("le texte qui suit un tableau redevient du texte", () => {
  const html = renderMarkdownToHtml([
    "| A |",
    "| --- |",
    "| 1 |",
    "",
    "Et la suite."
  ].join("\n"));

  assert.match(html, /<\/table><\/div><p>Et la suite\.<\/p>/);
});

test("une image devient une image", () => {
  // Une photo de rapport porte souvent ce que le texte ne dit pas.
  const html = renderMarkdownToHtml('![Fissure en pied de voile](https://exemple.test/f.png "RICT p. 12")');

  assert.match(html, /<img class="md-image" src="https:\/\/exemple\.test\/f\.png"/);
  assert.match(html, /alt="Fissure en pied de voile"/);
  assert.match(html, /title="RICT p\. 12"/);
});

test("une image en ligne ne s'exécute pas", () => {
  // `data:` peut porter du SVG, donc du script. Une note écrite par une machine
  // est précisément le texte dont on ne veut pas qu'il exécute quoi que ce soit.
  const html = renderMarkdownToHtml("![x](data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=)");

  assert.doesNotMatch(html, /<img/);
  assert.match(html, /image non autorisée/);
});

test("un lien reste un lien à côté d'une image", () => {
  const html = renderMarkdownToHtml("![vue](/a.png) et [le rapport](https://exemple.test/r.pdf)");

  assert.match(html, /<img class="md-image" src="\/a\.png"/);
  assert.match(html, /<a href="https:\/\/exemple\.test\/r\.pdf"/);
});
