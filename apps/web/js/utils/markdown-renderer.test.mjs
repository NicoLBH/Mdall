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

test("un bloc de code clôturé se rend, ligne par ligne", () => {
  const html = renderMarkdownToHtml("avant\n```\nune ligne\ndeux\n```\naprès");

  assert.match(html, /<pre class="md-code"><code>/);
  assert.match(html, /<span class="md-code__line">une ligne<\/span>/);
  assert.ok(!html.includes("```"), "les clôtures ne s'affichent pas");
});

test("un extrait de l'écriture Mdall porte la nature de chaque ligne", () => {
  const html = renderMarkdownToHtml("```mdall\nfichier: escalier-b/structure.ddb\n- Zone de neige = \"A1\"\n+ Zone de neige = \"A2\"\n```");

  assert.match(html, /md-code--mdall/);
  assert.match(html, /md-code__line--section/);
  assert.match(html, /md-code__line--retire/);
  assert.match(html, /md-code__line--ajoute/);
});

test("un bloc ouvert sans être refermé se rend quand même", () => {
  const html = renderMarkdownToHtml("```\nune ligne");
  assert.match(html, /md-code__line">une ligne</);
});

test("l'ancre rangée après la langue n'empêche pas de reconnaître la langue", () => {
  const html = renderMarkdownToHtml("```mdall affirmation:zone-neige|Valeur|apres\n+ zone de neige  A2\n```");

  assert.match(html, /md-code--mdall"/);
  assert.match(html, /md-code__line--ajoute/);
});

/* ── Les commentaires ────────────────────────────────────────────────────── */

/**
 * Échapper un commentaire revient à l'afficher. Le fichier `.md` rangé sous un
 * PDF porte un `<!-- page 3 -->` entre deux pages : il se lisait tel quel au
 * milieu du document, alors qu'un commentaire est ce qu'on écrit pour ne pas
 * être lu.
 */
test("une ligne qui n'est qu'un commentaire ne s'affiche pas", () => {
  const html = renderMarkdownToHtml("<!-- page 1 -->\n\n# Réunion\n\nUn point.");

  assert.doesNotMatch(html, /page 1/);
  assert.match(html, /<h1>Réunion<\/h1>/);
  assert.match(html, /<p>Un point\.<\/p>/);
});

/** Le supprimer ailleurs changerait le texte que quelqu'un a écrit. */
test("un commentaire au milieu d'une phrase reste échappé", () => {
  assert.match(renderMarkdownToHtml("avant <!-- x --> après"), /&lt;!-- x --&gt;/);
  assert.match(renderMarkdownToHtml("```\n<!-- x -->\n```"), /&lt;!-- x --&gt;/);
});

/** Un commentaire n'interrompt pas la liste qu'il traverse. */
test("un commentaire ne coupe pas une liste en deux", () => {
  const html = renderMarkdownToHtml("- un\n<!-- page 2 -->\n- deux");

  assert.equal(html.match(/<ul>/g)?.length, 1);
  assert.match(html, /<li>un<\/li><li>deux<\/li>/);
});

/* ── Les encadrés nommés par leur couleur ────────────────────────────────── */

/**
 * Un compte rendu de chantier hiérarchise à la couleur : « à faire » en bleu,
 * « présence obligatoire » en rouge. Sans elle, tout se vaut.
 *
 * **Le nom est la couleur, pas la gravité.** Traduire le rouge en « important »
 * serait une lecture, faite au moment de transcrire, et plus personne en aval
 * ne pourrait la défaire.
 */
test("un encadré nommé par sa couleur se rend dans cette couleur", () => {
  const html = renderMarkdownToHtml("> [!ROUGE]\n> Présence **obligatoire** au rendez-vous\n> et au suivant\n\nSuite.");

  assert.match(html, /md-alerte md-alerte--rouge/);
  assert.match(html, /md-alerte__nom">ROUGE</);
  // Les deux lignes tiennent dans le même encadré, pas dans deux.
  assert.equal((html.match(/blockquote/g) ?? []).length, 2);
  assert.match(html, /<strong>obligatoire<\/strong>/);
  assert.match(html, /et au suivant/);
  // Ce qui suit l'encadré n'y est pas entré.
  assert.match(html, /<\/blockquote><p>Suite\.<\/p>/);
});

/** Les cinq noms de GitHub s'affichent aussi, pour un texte venu d'ailleurs. */
test("un encadré GitHub prend une couleur", () => {
  assert.match(renderMarkdownToHtml("> [!WARNING]\n> attention"), /md-alerte--orange/);
  assert.match(renderMarkdownToHtml("> [!NOTE]\n> pour information"), /md-alerte--bleu/);
});

/** Une citation ordinaire reste une citation : rien ne change pour elle. */
test("une citation qui n'est pas un encadré ne bouge pas", () => {
  const html = renderMarkdownToHtml("> une citation ordinaire");
  assert.match(html, /<blockquote>une citation ordinaire<\/blockquote>/);
  assert.doesNotMatch(html, /md-alerte/);

  // Un nom qu'on ne connaît pas n'invente pas de couleur.
  assert.doesNotMatch(renderMarkdownToHtml("> [!TURQUOISE]\n> texte"), /md-alerte/);
});

/* ── Les adresses électroniques ──────────────────────────────────────────── */

/**
 * Un compte rendu de chantier porte trente adresses. Recopiées telles quelles,
 * elles se lisent en noir au milieu du texte et l'on ne voit plus lesquelles en
 * sont — alors que la liste de diffusion est précisément ce qu'on vient
 * chercher.
 */
test("une adresse nue devient un lien", () => {
  const html = renderMarkdownToHtml("Écrire à mp.pernat@gmail.com avant lundi.");

  assert.match(html, /<a class="md-courriel" href="mailto:mp\.pernat@gmail\.com">mp\.pernat@gmail\.com<\/a>/);
  // Y compris dans une cellule de tableau, où elles vivent le plus souvent.
  assert.match(renderMarkdownToHtml("| Mail |\n|---|\n| a.b@c-d.fr |"), /md-courriel/);
});

/** Une adresse déjà écrite en lien n'en reçoit pas un second à l'intérieur. */
test("un lien existant ne reçoit pas de lien dans son lien", () => {
  const html = renderMarkdownToHtml("[déjà un lien](mailto:x@y.fr)");

  assert.equal((html.match(/<a /g) ?? []).length, 1);
  assert.doesNotMatch(html, /md-courriel/);
});

/** Ce qui est du code reste du code : une adresse citée n'est pas cliquable. */
test("une adresse dans du code n'est pas transformée", () => {
  assert.doesNotMatch(renderMarkdownToHtml("`code@exemple.fr`"), /md-courriel/);
});

/* ── Le retour à la ligne dans une cellule ───────────────────────────────── */

/**
 * **Une cellule de tableau ne peut pas contenir de vraie ligne :** le pipe
 * refermerait la ligne du tableau. Un compte rendu, lui, met couramment deux
 * choses dans la même case — une adresse et un téléphone, un nom et une
 * société. Le modèle écrit alors `\n` littéral, faute de mieux ; sans cette
 * lecture, la case affiche « a@b.fr\n0629500461 » d'un seul tenant.
 */
test("un \\n littéral devient un retour à la ligne, dans une cellule", () => {
  const html = renderMarkdownToHtml("| Contact |\n|---|\n| a@b.fr\\n0629500461 |");

  assert.match(html, /<br>/);
  assert.doesNotMatch(html, /\\n/);
  // Ce qui est autour du retour reste lu comme du markdown.
  assert.match(html, /<a class="md-courriel" href="mailto:a@b\.fr">a@b\.fr<\/a><br>0629500461/);
});

/** L'en-tête a le même droit que le corps : une colonne se nomme sur deux lignes. */
test("l'en-tête d'une colonne se coupe aussi", () => {
  const html = renderMarkdownToHtml("| Tél.\\nMail |\n|---|\n| x |");
  assert.match(html, /<th[^>]*>Tél\.<br>Mail<\/th>/);
});

/**
 * **Et nulle part ailleurs.** Hors d'un tableau, `\n` est un antislash suivi
 * d'un n — dans un chemin Windows, dans une consigne, dans du texte cité. Le
 * transformer partout abîmerait du texte que personne n'a demandé de couper.
 */
test("hors d'une cellule, un antislash-n reste ce qu'il est", () => {
  assert.match(renderMarkdownToHtml("Chemin : C:\\nouveau\\dossier"), /C:\\nouveau/);
  assert.doesNotMatch(renderMarkdownToHtml("Hors cellule : a\\nb"), /<br>/);
});
