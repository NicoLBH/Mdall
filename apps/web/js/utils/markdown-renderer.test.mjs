import test from 'node:test';
import assert from 'node:assert/strict';

import { renderMarkdownToHtml } from './markdown-renderer.js';

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
