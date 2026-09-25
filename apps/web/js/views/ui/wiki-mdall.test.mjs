/**
 * Le wiki du langage : ce qu'il enseigne doit être ce que le langage lit.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  renderTexteDuWiki, renderExempleDuWiki, renderBlocDuWiki, renderSommaireDuWiki, renderWikiMdall
} from "./wiki-mdall.js";
import { WIKI_DU_LANGAGE, sommaireDuWiki, exemplesDuWiki } from "../../contenus/wiki-du-langage-mdall.js";
import { lireUnFichier } from "../../services/memoire-en-lecture.js";
import { calculer } from "../../services/mdall-calcul.js";
import { lecteurDeValeurs } from "../../services/memoire-evaluateur.js";

/* ── Ce qu'il enseigne, le langage le lit ────────────────────────────────── */

test("chaque exemple du wiki est du Mdall que la lecture accepte", () => {
  // **C'est l'épreuve qui fait la valeur de ce fichier.** Une documentation qui
  // enseigne une syntaxe que le langage ne connaît pas est pire que pas de
  // documentation : on recopie l'exemple, il est refusé, et l'on cesse de
  // croire l'écran. La relecture humaine ne l'attrape pas (règle 12).
  for (const { section, code } of exemplesDuWiki()) {
    const lu = lireUnFichier(code);
    assert.deepEqual(lu.refus, [],
      `§${section} enseigne du Mdall que la lecture refuse :\n${
        lu.refus.map((un) => `  ligne ${un.ligne} — ${un.raison}`).join("\n")}`);
  }
});

test("les calculs que le wiki montre sont ceux que le calcul rend", () => {
  // Le wiki annonce 1 440 € pour 1 200 € de prix hors taxes : la promesse se
  // vérifie ici, sinon elle vieillit toute seule.
  const lire = lecteurDeValeurs({ "Prix HT": "1200 €", "Niveau du sol": "108,2 m" });

  assert.equal(calculer("Prix HT * 20%", lire).nombre, 240);
  assert.equal(calculer("Prix HT + Prix HT * 20%", lire).nombre, 1440);
  assert.equal(calculer("Niveau du sol + 1 m", lire).nombre, 109.2);

  // Et le tableau du wiki annonce bien ces nombres-là : une promesse écrite
  // dans une prose que rien ne relit vieillit toute seule.
  const calcul = WIKI_DU_LANGAGE.find((une) => une.id === "calcul");
  const annonces = calcul.blocs
    .filter((bloc) => bloc.quoi === "table")
    .flatMap((bloc) => bloc.lignes.flat()).join(" ");

  assert.match(annonces, /1440 €/);
  assert.match(annonces, /240 €/);
});

test("les refus que le wiki montre sont ceux que le calcul refuse", () => {
  for (const source of ["3 m + 2", "2 m * 3 €", "10 / 0"]) {
    assert.ok(calculer(source).refus, `${source} devrait être refusé`);
  }
  assert.equal(calculer("3 m * 2 m").unite, "m²");
  assert.equal(calculer("6 m² / 2 m").unite, "m");
});

/* ── Le contenu, et sa mise en page ──────────────────────────────────────── */

test("le wiki dit ce qu'est Mdall, à quoi il sert et comment il marche", () => {
  // C'est la commande : « une description du langage Mdall, ce qu'il fait, à
  // quoi il sert, comment il fonctionne », puis la syntaxe et des exemples.
  const noms = sommaireDuWiki().map((une) => une.id);

  for (const attendu of ["quoi", "pourquoi", "comment", "affirmation", "nom", "fonction", "calcul"]) {
    assert.ok(noms.includes(attendu), `section absente : ${attendu}`);
  }
  assert.ok(noms.some((un) => un.startsWith("exemple-")),
    "il faut au moins un exemple d'application entier");
  // **Et il dit aussi ce qu'il ne sait pas faire.** Une documentation qui ne
  // montre que ce qui marche apprend à se méfier d'elle.
  assert.ok(noms.includes("limites"), "le wiki ne dit pas où le langage s'arrête");
});

test("chaque section porte un titre, un nom et au moins un bloc", () => {
  for (const une of WIKI_DU_LANGAGE) {
    assert.ok(une.id, "une section sans nom ne se met pas au sommaire");
    assert.ok(une.titre.length > 3, `titre trop court : ${une.id}`);
    assert.ok(une.blocs.length > 0, `section vide : ${une.id}`);
  }
  assert.equal(new Set(WIKI_DU_LANGAGE.map((une) => une.id)).size, WIKI_DU_LANGAGE.length,
    "deux sections portent le même nom : le sommaire en perdrait une");
});

test("le sommaire mène à chaque section, et chaque section a son ancre", () => {
  const html = renderWikiMdall();

  for (const { id, titre } of sommaireDuWiki()) {
    assert.match(html, new RegExp(`data-wiki-vers="${id}"`), `lien absent : ${id}`);
    assert.match(html, new RegExp(`id="wiki-${id}"`), `ancre absente : ${id}`);
    assert.ok(html.includes(titre.replace(/'/g, "&#39;")), `titre absent : ${titre}`);
  }
  assert.equal((renderSommaireDuWiki().match(/data-wiki-vers=/g) ?? []).length,
    WIKI_DU_LANGAGE.length);
});

test("les exemples sont colorés, et numérotés ligne à ligne", () => {
  const html = renderExempleDuWiki("fonction X(zones) {\n   si (A = 1)\n}");

  assert.equal((html.match(/memoire-ligne__num/g) ?? []).length, 3);
  assert.match(html, /mdall-mot-fonction/);
  assert.match(html, /mdall-mot-condition/);
});

test("un exemple se relit caractère pour caractère, comme dans l'éditeur", () => {
  // Le peintre de la saisie, et non celui de la mémoire : on recopie un exemple
  // du wiki, il doit garder exactement le même aspect sous les doigts.
  const code = '   si (A = "3")   ';
  const nu = renderExempleDuWiki(code)
    .replace(/<span class="memoire-ligne__num">\d+<\/span>/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();

  assert.equal(nu, code.trim());
});

test("le gras et le code se marquent, et rien d'autre ne s'interprète", () => {
  assert.equal(renderTexteDuWiki("un mot **en gras**"), "un mot <b>en gras</b>");
  assert.match(renderTexteDuWiki("le mot `si`"), /<code class="wiki-mdall__mot">si<\/code>/);
});

test("ce que le contenu porte est échappé avant d'être marqué", () => {
  // Le contenu est à nous aujourd'hui ; il vit dans un fichier qu'on corrige
  // sans relire cet écran, et c'est là qu'une balise entrerait sans qu'on y
  // pense.
  const html = renderTexteDuWiki('<img src=x onerror="x"> et **<script>alert(1)</script>**');

  assert.doesNotMatch(html, /<img /);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  // Le gras, lui, est bien posé : l'échappement n'empêche pas le marquage.
  assert.match(html, /<b>/);
});

test("un bloc d'un genre inconnu ne rend rien plutôt qu'un cadre vide", () => {
  assert.equal(renderBlocDuWiki({ quoi: "vidéo" }), "");
  assert.equal(renderBlocDuWiki(null), "");
  assert.equal(renderBlocDuWiki(), "");
});

test("un tableau rend son en-tête et ses lignes", () => {
  const html = renderBlocDuWiki({ quoi: "table", entetes: ["a", "b"], lignes: [["1", "2"], ["3", "4"]] });

  assert.equal((html.match(/<th>/g) ?? []).length, 2);
  assert.equal((html.match(/<td>/g) ?? []).length, 4);
});
