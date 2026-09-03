/**
 * Le texte de l'arrêté, et ce qu'on lui fait dire.
 *
 * ## Pourquoi ce test est le plus utile du lot
 *
 * Le référentiel repose entièrement sur un dépouillement à la main : quelqu'un
 * a lu l'arrêté et en a tiré des règles. Rien, jusqu'ici, ne vérifiait que la
 * phrase citée par une règle existe vraiment dans l'article qu'elle nomme. Une
 * citation recopiée de mémoire, un mot changé, un alinéa attribué au mauvais
 * article — tout cela produit un résultat qui a l'air d'un résultat, et se
 * défend en réunion jusqu'au jour où quelqu'un ouvre le texte.
 *
 * Maintenant que le texte est là, on peut le demander : chaque citation
 * réglementaire doit se retrouver **mot pour mot** dans son article.
 *
 * ## Et ce qui n'est pas une citation
 *
 * Certaines règles ne citent pas : elles **lisent**. « Le régime appliqué est
 * celui du classement, à défaut de décision municipale de déclassement » ne
 * figure nulle part dans l'article 3 — c'est ce que l'article veut dire, pas ce
 * qu'il dit. Ces sources-là se déclarent `nature: "lecture"`, et l'écran ne les
 * met pas entre guillemets. Faire passer une lecture pour une citation est
 * exactement la faute que ce test existe pour empêcher.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { ARTICLES, articleDe } from "./articles.js";
import { CORPUS } from "./corpus.js";
import { QUESTIONS } from "./questions.js";

/**
 * Deux textes se comparent sur ce qu'ils disent, pas sur leur typographie.
 *
 * L'apostrophe droite et l'apostrophe courbe, les guillemets, les espaces
 * insécables, « 600 m3 /h » et « 600 m3/h » : rien de tout cela ne change le
 * sens, et tout cela diverge entre une saisie à la main et un PDF.
 */
const nu = (texte) => String(texte ?? "")
  .toLowerCase()
  // Les accents se comparent à plat : l'arrêté imprime « A l'exclusion des
  // façades » sans accent sur la capitale, une saisie à la main écrit « À ».
  // C'est une convention typographique, pas un mot différent.
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[«»"'’‘]/g, " ")
  .replace(/\s+\//g, "/")
  .replace(/[^a-z0-9°²³/]+/g, " ")
  .trim();

/** Les morceaux d'une citation, de part et d'autre de ses coupures. */
const morceaux = (citation) => String(citation ?? "")
  .split(/\[…\]|\[\.\.\.\]|…|\.\.\./)
  .map(nu)
  .filter((f) => f.split(" ").length >= 5);

const sourcesDuCorpus = () => CORPUS.flatMap((module) =>
  module.regles.map((regle) => ({ module, source: regle.source })).filter((s) => s.source));

test("chaque citation réglementaire se retrouve mot pour mot dans son article", () => {
  const perdues = [];
  for (const { module, source } of sourcesDuCorpus()) {
    if (source.nature !== "reglement" || !source.citation) continue;
    const article = articleDe(source.article);
    if (!article) { perdues.push(`${module.id} — article ${source.article} absent du texte`); continue; }
    const texte = nu(`${article.texte} ${article.commentaire ?? ""}`);
    const absent = morceaux(source.citation).find((f) => !texte.includes(f));
    if (absent) perdues.push(`${module.id} — art. ${source.article} : « ${absent.slice(0, 90)} »`);
  }
  assert.deepEqual(perdues, []);
});

test("ce qui n'est pas une citation ne se donne pas pour une citation", () => {
  // Une lecture dit ce que l'article veut dire ; une citation dit ce qu'il dit.
  // L'écran ne les présente pas de la même façon, donc elles se déclarent.
  const natures = new Set(sourcesDuCorpus().map(({ source }) => source.nature));
  for (const nature of natures) {
    assert.ok(["reglement", "lecture", "commentaire"].includes(nature), `nature inconnue : ${nature}`);
  }
  // Et une lecture porte toujours son article : c'est ce qui permet d'aller
  // vérifier qu'elle le lit bien.
  for (const { module, source } of sourcesDuCorpus()) {
    if (source.nature !== "lecture") continue;
    assert.ok(source.article, `${module.id} : une lecture doit nommer son article`);
    assert.ok(articleDe(source.article), `${module.id} : article ${source.article} inconnu`);
  }
});

test("chaque question renvoie à un article qui existe", () => {
  // Une question qui cite un article introuvable laisse celui qui répond sans
  // rien pour trancher — c'est-à-dire exactement là où on ne veut pas le mettre.
  const sansArticle = QUESTIONS.filter((q) => !articleDe(q.article)).map((q) => `${q.cle} → ${q.article}`);
  assert.deepEqual(sansArticle, []);
  // Et le second article, quand une question en nomme un : « les planchers
  // répondent-ils aux caractéristiques de l'article 6 ? » sort du 5°) de
  // l'article 3, mais c'est l'article 6 qu'il faut lire pour y répondre.
  const secondIntrouvable = QUESTIONS.filter((q) => q.articleAussi && !articleDe(q.articleAussi))
    .map((q) => `${q.cle} → ${q.articleAussi}`);
  assert.deepEqual(secondIntrouvable, []);
});

test("le texte porté est celui de l'arrêté, pas l'appareil du fascicule", () => {
  // Les renvois de bibliothèque et les appels de figure du fascicule rendaient
  // les phrases incitables : « conformes aux dispositions des articles 27 à 29
  // ci-avant [Cf.34.13.04.03#Article27] ».
  for (const [numero, article] of Object.entries(ARTICLES)) {
    const tout = `${article.texte} ${article.commentaire ?? ""}`;
    assert.doesNotMatch(tout, /\[Cf\./i, `article ${numero}`);
    assert.doesNotMatch(tout, /\(voir FIG\./i, `article ${numero}`);
    // Et les glyphes que le PDF encode hors table ont été rétablis : « une
    // surface de 0,25 m? » n'est pas une phrase de loi.
    assert.doesNotMatch(tout, /\b(m|cm|dm)\?/, `article ${numero}`);
  }
});

test("les articles que les modules citent sont tous portés", () => {
  const cites = new Set(sourcesDuCorpus().map(({ source }) => source.article).filter(Boolean));
  const absents = [...cites].filter((a) => !articleDe(a));
  assert.deepEqual(absents, []);
});
