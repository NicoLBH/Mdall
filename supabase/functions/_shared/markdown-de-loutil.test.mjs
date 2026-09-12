import test from "node:test";
import assert from "node:assert/strict";

import { lireLaReponseDeLoutil, pagesDuMarkdown } from "./markdown-de-loutil.js";

/* ── Le découpage en pages ───────────────────────────────────────────────── */

test("un document d'un bloc se découpe à ses marqueurs de page", () => {
  const pages = pagesDuMarkdown([
    "=== PAGE 1 ===",
    "# Réunion n° 7",
    "",
    "Reprise d'étanchéité.",
    "=== PAGE 2 ===",
    "## Lot 05"
  ].join("\n"));

  assert.deepEqual(pages.map((page) => page.page), [1, 2]);
  assert.match(pages[0].markdown, /# Réunion n° 7/);
  assert.match(pages[0].markdown, /Reprise d'étanchéité\./);
  assert.equal(pages[1].markdown, "## Lot 05");
});

/**
 * **Un texte sans marqueur ne devient pas une page 1.** Un document sans pages
 * ne peut pas être aligné contre l'autre restitution, et le présenter comme une
 * page unique ferait tout diverger contre un document identique (règle 5).
 */
test("un texte sans marqueur ne s'invente pas une page", () => {
  assert.deepEqual(pagesDuMarkdown("# Un document sans pages"), []);
  assert.deepEqual(pagesDuMarkdown(""), []);
});

test("ce qui précède le premier marqueur n'appartient à aucune page", () => {
  const pages = pagesDuMarkdown("un en-tête perdu\n=== PAGE 1 ===\n# Un");

  assert.equal(pages.length, 1);
  assert.doesNotMatch(pages[0].markdown, /en-tête perdu/);
});

/* ── Les deux formes de réponse ──────────────────────────────────────────── */

test("la forme JSON est prise telle quelle, et rangée", () => {
  const pages = lireLaReponseDeLoutil({ pages: [
    { page: 3, markdown: "trois" }, { page: 1, markdown: "un" }
  ] });

  assert.deepEqual(pages.map((page) => page.page), [1, 3]);
});

test("la forme Markdown passe par le découpage", () => {
  const pages = lireLaReponseDeLoutil({ markdown: "=== PAGE 2 ===\ndeux\n=== PAGE 1 ===\nun" });

  assert.deepEqual(pages.map((page) => page.page), [1, 2]);
  assert.equal(pages[0].markdown, "un");
});

test("une chaîne toute nue est du Markdown", () => {
  assert.deepEqual(lireLaReponseDeLoutil("=== PAGE 1 ===\nun").map((page) => page.page), [1]);
});

/**
 * Une page sans numéro n'a pas de place dans le document, et une page rendue
 * deux fois le doublerait.
 */
test("une page sans numéro ou rendue deux fois ne passe pas", () => {
  const pages = lireLaReponseDeLoutil({ pages: [
    { page: null, markdown: "sans place" },
    { page: 0, markdown: "page zéro" },
    { page: 1, markdown: "le bon" },
    { page: 1, markdown: "le second" }
  ] });

  assert.equal(pages.length, 1);
  assert.equal(pages[0].markdown, "le bon");
});

test("une page rendue vide est une réponse, pas une absence", () => {
  const pages = lireLaReponseDeLoutil({ pages: [{ page: 1, markdown: "" }] });

  assert.equal(pages.length, 1);
  assert.equal(pages[0].markdown, "");
});

test("une réponse qu'on ne sait pas lire ne rend rien", () => {
  assert.deepEqual(lireLaReponseDeLoutil(null), []);
  assert.deepEqual(lireLaReponseDeLoutil({}), []);
  assert.deepEqual(lireLaReponseDeLoutil({ pages: "pas une liste" }), []);
});

/* ── Le relais ───────────────────────────────────────────────────────────── */

/**
 * **Aucune adresse par défaut, et il n'y en aura pas.** Un défaut enverrait le
 * PDF d'un chantier à une adresse que personne n'a choisie.
 */
test("le relais n'a pas d'adresse par défaut, et le dit quand elle manque", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const fonction = readFileSync(
    fileURLToPath(new URL("../reconstituer-par-loutil/index.ts", import.meta.url)), "utf8"
  );

  assert.match(fonction, /Deno\.env\.get\("OPENDATALOADER_URL"\) \?\? ""/);
  assert.match(fonction, /motif: "outil-non-branche"/);
  // La porte : un jeton présent n'est pas quelqu'un de connu.
  assert.match(fonction, /const garde = await requireUser\(req, corsHeaders\)/);
});

/**
 * **Cette restitution ne coûte aucun jeton**, et c'est tout son intérêt : elle
 * n'a donc rien à déposer au compteur. Un dépôt ici ferait apparaître une
 * consommation qui n'a pas eu lieu.
 */
test("le relais ne dépose aucune consommation, parce qu'il n'y en a pas", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const fonction = readFileSync(
    fileURLToPath(new URL("../reconstituer-par-loutil/index.ts", import.meta.url)), "utf8"
  );

  assert.doesNotMatch(fonction, /deposerLaConsommation/);
  assert.doesNotMatch(fonction, /api\.openai\.com|OPENAI/);
});

/**
 * L'adresse de l'outil vit au serveur. Descendue dans le navigateur, elle serait
 * lisible par quiconque ouvre les outils de développement — et le PDF d'un
 * chantier partirait vers une adresse visible de tous.
 */
test("l'adresse de l'outil ne descend pas dans le navigateur", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const service = readFileSync(
    fileURLToPath(new URL("../../../apps/web/js/services/markdown-par-loutil.js", import.meta.url)),
    "utf8"
  );

  assert.doesNotMatch(service, /OPENDATALOADER_URL/);
  assert.match(service, /functions\/v1\/reconstituer-par-loutil/);
});

/* ── Le service, de l'autre côté du contrat ──────────────────────────────── */

/**
 * **Le marqueur traverse une frontière de processus.** Le service le passe à
 * la ligne de commande, cet analyseur le relit ; les deux vivent dans des
 * conteneurs différents et ne peuvent pas partager une constante. Ce test est
 * donc le seul endroit où les deux se regardent — sans lui, changer l'un
 * laisserait l'autre muet, et l'écran dirait « l'outil n'a rendu aucune page »
 * sans qu'on devine pourquoi (règle 4).
 */
test("le séparateur du service est celui que cet analyseur sait relire", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const serveur = readFileSync(
    fileURLToPath(new URL("../../../services/opendataloader/serveur.mjs", import.meta.url)), "utf8"
  );

  const declare = serveur.match(/const MARQUEUR = "([^"]+)"/);
  assert.ok(declare, "le service ne déclare plus de marqueur de page");

  // Ce que la ligne de commande écrira pour la page 7, relu par l'analyseur.
  const ecrit = declare[1].replace("%page-number%", "7");
  const pages = pagesDuMarkdown(`${ecrit}\nle contenu de la page`);

  assert.deepEqual(pages, [{ page: 7, markdown: "le contenu de la page" }]);
});

/**
 * Le service rend le Markdown tel quel : c'est ici, et nulle part ailleurs,
 * qu'il se découpe. Deux analyseurs pour une même convention finiraient par ne
 * plus dire la même chose.
 */
test("le service ne découpe pas les pages lui-même", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const serveur = readFileSync(
    fileURLToPath(new URL("../../../services/opendataloader/serveur.mjs", import.meta.url)), "utf8"
  );

  assert.doesNotMatch(serveur, /function pagesDuMarkdown/);
  assert.match(serveur, /json\(reponse, \{ markdown \}\)/);
});

/**
 * **Le service n'authentifie personne**, et c'est écrit là où on le lit : dans
 * son en-tête, dans son Dockerfile, et dans son mode d'emploi. Exposé sur
 * l'internet public, il serait une conversion de PDF gratuite offerte au monde
 * entier, sur la facture de celui qui l'a déployé.
 */
test("le service dit partout qu'il n'authentifie personne par lui-même", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  for (const chemin of [
    "../../../services/opendataloader/serveur.mjs",
    "../../../services/opendataloader/Dockerfile",
    "../../../services/opendataloader/README.md"
  ]) {
    const source = readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), "utf8");
    assert.match(source, /n.authentifie personne/i, `${chemin} ne prévient pas`);
  }

  const serveur = readFileSync(
    fileURLToPath(new URL("../../../services/opendataloader/serveur.mjs", import.meta.url)), "utf8"
  );
  // Et il ne consomme rien : aucun modèle, aucune clé.
  assert.doesNotMatch(serveur, /api\.openai\.com|OPENAI|API_KEY/);
});

/* ── Le mot de passe partagé ─────────────────────────────────────────────── */

/**
 * **L'obscurité d'une adresse n'est pas une protection.** Hébergé gratuitement,
 * le service a une adresse publique : sans mot de passe, n'importe qui pourrait
 * y faire convertir ses PDF.
 *
 * Il n'en a **aucun par défaut** : un mot de passe écrit dans le dépôt n'en est
 * pas un, et celui qui l'y trouverait passerait la porte comme s'il n'y en
 * avait pas.
 */
test("le service exige le mot de passe quand il en a un, et n'en invente aucun", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const serveur = readFileSync(
    fileURLToPath(new URL("../../../services/opendataloader/serveur.mjs", import.meta.url)), "utf8"
  );

  assert.match(serveur, /process\.env\.JETON_PARTAGE \?\? ""/);
  assert.match(serveur, /if \(JETON && requete\.headers\[EN_TETE_DU_JETON\] !== JETON\)/);
  assert.match(serveur, /401/);
  // Et sans mot de passe, il le crie plutôt que de laisser croire à une porte.
  assert.match(serveur, /AUCUN MOT DE PASSE/);
});

/**
 * **Le même en-tête des deux côtés.** Il traverse une frontière de processus et
 * ne peut pas être une constante partagée : sans ce test, en renommer un
 * laisserait l'autre muet, et l'écran dirait « l'outil a refusé le mot de
 * passe » sur un mot de passe parfaitement bon (règle 4).
 */
test("le relais et le service emploient le même en-tête", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const serveur = readFileSync(
    fileURLToPath(new URL("../../../services/opendataloader/serveur.mjs", import.meta.url)), "utf8"
  );
  const relais = readFileSync(
    fileURLToPath(new URL("../reconstituer-par-loutil/index.ts", import.meta.url)), "utf8"
  );

  const chezLui = serveur.match(/const EN_TETE_DU_JETON = "([^"]+)"/);
  const chezNous = relais.match(/const EN_TETE_DU_JETON = "([^"]+)"/);

  assert.ok(chezLui && chezNous, "l'en-tête n'est plus déclaré des deux côtés");
  // Node met les en-têtes reçus en minuscules : c'est sous cette forme que le
  // service les lit, et c'est donc elle qui doit correspondre.
  assert.equal(chezLui[1], chezNous[1].toLowerCase());
});

/**
 * Un mot de passe refusé ne se corrige pas comme une panne : les confondre
 * ferait chercher longtemps une adresse qui est bonne.
 */
test("un mot de passe refusé porte son propre motif", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const relais = readFileSync(
    fileURLToPath(new URL("../reconstituer-par-loutil/index.ts", import.meta.url)), "utf8"
  );
  assert.match(relais, /appel\.status === 401 \? "outil-refuse-le-jeton"/);

  const { PHRASES_DU_REFUS_DE_LOUTIL, REFUS_DE_LOUTIL } = await import(
    "../../../apps/web/js/services/reconstitution-markdown.js"
  );
  assert.equal(REFUS_DE_LOUTIL.JETON_REFUSE, "outil-refuse-le-jeton");
  assert.match(PHRASES_DU_REFUS_DE_LOUTIL[REFUS_DE_LOUTIL.JETON_REFUSE], /OPENDATALOADER_TOKEN/);
});

/* ── Le Space Hugging Face ───────────────────────────────────────────────── */

/**
 * **Le port se déclare, sinon rien ne répond.** Un Space Docker cherche le 7860
 * par défaut ; le nôtre écoute le 8080. Sans `app_port` dans l'entête du mode
 * d'emploi, le Space se construit, démarre, et ne répond jamais — sans la
 * moindre erreur dans ses journaux.
 */
test("le mode d'emploi porte l'entête d'un Space, et le port qu'écoute le service", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const mode = readFileSync(
    fileURLToPath(new URL("../../../services/opendataloader/README.md", import.meta.url)), "utf8"
  );
  const serveur = readFileSync(
    fileURLToPath(new URL("../../../services/opendataloader/serveur.mjs", import.meta.url)), "utf8"
  );
  const image = readFileSync(
    fileURLToPath(new URL("../../../services/opendataloader/Dockerfile", import.meta.url)), "utf8"
  );

  assert.match(mode, /^---\ntitle:/, "l'entête du Space doit être la toute première chose");
  assert.match(mode, /sdk: docker/);

  const declare = mode.match(/app_port: (\d+)/);
  const parDefaut = serveur.match(/Number\(process\.env\.PORT\) \|\| (\d+)/);
  assert.ok(declare && parDefaut, "le port n'est plus déclaré des deux côtés");
  assert.equal(declare[1], parDefaut[1], "le Space écoute un port que le service n'ouvre pas");
  assert.match(image, new RegExp(`EXPOSE ${parDefaut[1]}`));
});
