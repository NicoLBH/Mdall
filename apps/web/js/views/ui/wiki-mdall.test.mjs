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
import { lancerLeBrouillon } from "../../services/bac-dessai.js";

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

test("les exemples entiers du wiki concluent ce que le wiki annonce", () => {
  // **On lance les règles du wiki pour de vrai.** Il promet 1 440 € pour
  // 1 200 € hors taxes, et 109,2 m pour un sol à 108,2 m. Une promesse écrite
  // dans une prose que rien ne relit vieillit toute seule.
  const essais = [
    {
      section: "exemple-tva",
      reponses: { "Prix HT": "1200 €" },
      attendu: "1440 €",
      etapes: ["240 €", "1440 €"],
      annonce: ["1 440 €", "TVA = 240 €", "Prix TTC = 1440 €"]
    },
    {
      section: "exemple-inondable",
      reponses: { "Zone inondable": "oui", "Niveau du sol": "108,2 m" },
      attendu: "109,2 m",
      etapes: ["109,2 m"],
      annonce: ["109,2 m", "108,2 m"]
    }
  ];

  for (const { section, reponses, attendu, etapes, annonce } of essais) {
    const regles = exemplesDuWiki()
      .filter((un) => un.section === section && un.code.startsWith("fonction"));
    assert.equal(regles.length, 1, `§${section} : une règle et une seule`);

    const [resultat] = lancerLeBrouillon([{ nom: "essai.ref", contenu: regles[0].code }], reponses);
    assert.equal(resultat.valeur, attendu, `§${section} ne conclut pas ${attendu}`);
    assert.deepEqual(resultat.calculs.map((un) => un.valeur), etapes);

    // **Et la prose annonce chacun de ces chiffres, écrits en dur des deux
    // côtés.** Les déduire du lancement ferait une épreuve qui bouge avec ce
    // qu'elle mesure : la prose et le calcul se vérifieraient l'un l'autre en
    // rond, et personne ne dirait lequel a tort.
    const dit = WIKI_DU_LANGAGE.find((une) => une.id === section).blocs
      .filter((bloc) => bloc.quoi === "texte").map((bloc) => bloc.texte).join(" ");

    for (const chiffre of annonce) {
      assert.ok(dit.includes(chiffre), `§${section} n'annonce plus « ${chiffre} »`);
    }
  }
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
  assert.ok(noms.filter((un) => un.startsWith("exemple-")).length >= 2,
    "il faut des exemples d'application entiers, et plus d'un");
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

test("le wiki enseigne l'enchaînement, et la lecture le lit", () => {
  // **La limite qu'on a fini par lever.** Un utilitaire de TVA ne marchait que
  // pour un cas sur deux : `sinon si (…)` était lu comme une conclusion valant
  // le texte « si (…) ». On l'a d'abord refusé — ce qui laissait devant un mur,
  // puisque c'est la forme que tout le monde écrit. Il est de la langue.
  const limites = WIKI_DU_LANGAGE.find((une) => une.id === "limites");
  assert.doesNotMatch(JSON.stringify(limites), /pas de `sinon si`/,
    "le wiki annonce une limite qui n'en est plus une");

  const fonction = WIKI_DU_LANGAGE.find((une) => une.id === "fonction");
  const dit = JSON.stringify(fonction);
  assert.match(dit, /sinon si/, "le wiki n'enseigne pas l'enchaînement");
  assert.match(dit, /première branche qui tient l'emporte/,
    "sans l'ordre, une chaîne mal rangée ne donne jamais la main aux suivantes");

  // Et ce que le wiki montre, le langage le lit et le conclut — les exemples du
  // wiki sont relus et lancés par les épreuves d'au-dessus, celle-ci vérifie
  // que celui de l'enchaînement en fait partie.
  const chaine = exemplesDuWiki().find(({ code }) => code.includes("sinon si"));
  assert.ok(chaine, "l'exemple d'enchaînement n'est pas un exemple encadré");
  assert.deepEqual(lireUnFichier(chaine.code).refus, []);

  // Et il conclut les trois cas : un exemple qu'on ne lance pas est une
  // intention, et c'est exactement ce qui nous a coûté deux rondes.
  const fichiers = [{ nom: "essai.ref", contenu: chaine.code }];
  const taux = (type) => lancerLeBrouillon(fichiers, { "Type de TVA": type })
    .find((un) => un.sujet === "Taux de TVA")?.valeur;
  assert.equal(taux("existant"), "5,5 %");
  assert.equal(taux("rénovation"), "10 %");
  assert.equal(taux("neuf"), "20 %");
});
