import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const chromePath = path.resolve(__dirname, "./project-shell-chrome.js");
const chromeSource = fs.readFileSync(chromePath, "utf8");

const { seReplie } = await import("./project-shell-chrome.js");

/**
 * **Le repli se décide sur ce qui défile**, et ces deux gardes s'exécutent
 * plutôt que de relire la forme du code : elles tenaient sur la présence d'une
 * expression ternaire, qu'un correctif réécrit sans rien changer au
 * comportement — et qui, réécrite, ne disait plus rien.
 */
test("sans source locale, le repli se lit sur le document", () => {
  globalThis.window = { scrollY: 0 };
  globalThis.document = { documentElement: { scrollTop: 0 }, body: { scrollTop: 0 } };
  assert.equal(seReplie(null), false);

  globalThis.window = { scrollY: 400 };
  assert.equal(seReplie(null), true);
  delete globalThis.window;
  delete globalThis.document;
});

test("avec une source locale, c'est elle qui décide, pas le document", () => {
  globalThis.window = { scrollY: 900 };
  globalThis.document = { documentElement: { scrollTop: 900 }, body: { scrollTop: 900 } };

  assert.equal(seReplie({ scrollTop: 0 }), false, "la page est en bas, le panneau en haut");
  assert.equal(seReplie({ scrollTop: 300 }), true);
  delete globalThis.window;
  delete globalThis.document;
});

/**
 * **Une conversation est toujours défilée.**
 *
 * Le fil du Copilote est calé en bas — c'est le dernier message qu'on veut voir
 * en arrivant. Replié en permanence, le bandeau n'a plus d'onglets : pour en
 * changer il fallait remonter toute la discussion. Ces écrans-là posent
 * `data-compactage-directionnel`, et c'est le **sens** qui décide.
 */
test("un ascenseur directionnel replie en descendant, et rend le bandeau en remontant", () => {
  const fil = { scrollTop: 1200, dataset: { compactageDirectionnel: "" } };

  // Première lecture : on ne sait pas d'où l'on vient, et on ne replie pas sur
  // une supposition — un fil qui arrive calé en bas garde ses onglets.
  assert.equal(seReplie(fil), false);

  fil.scrollTop = 1400;
  assert.equal(seReplie(fil), true, "on descend");

  fil.scrollTop = 1200;
  assert.equal(seReplie(fil), false, "on remonte d'un cran : le bandeau revient");

  fil.scrollTop = 1201;
  assert.equal(seReplie(fil), false, "un pixel d'inertie ne fait pas clignoter le bandeau");

  fil.scrollTop = 8;
  assert.equal(seReplie(fil), false, "tout en haut, le bandeau est là");
});

/** Sans le repère, on retombe sur la règle de position : le reste de l'application. */
test("un ascenseur ordinaire se lit sur sa position", () => {
  assert.equal(seReplie({ scrollTop: 0, dataset: {} }), false);
  assert.equal(seReplie({ scrollTop: 900, dataset: {} }), true);
  assert.equal(seReplie({ scrollTop: 900, dataset: {} }), true, "et ne dépend pas du sens");
});

test("clearProjectActiveScrollSource revient à document/window", () => {
  assert.match(chromeSource, /export function clearProjectActiveScrollSource\(el = null\) \{[\s\S]*?shellState\.activeScrollSourceEl = null;[\s\S]*?shellState\.activeScrollSourceResolver = null;[\s\S]*?syncCompactState\(\);/);
});

test("mountProjectShellChrome applique immédiatement le contexte route--project", () => {
  assert.match(chromeSource, /export function mountProjectShellChrome\(\{ projectId, tab \}\) \{[\s\S]*?refreshProjectShellChromeRefs\(\);[\s\S]*?ensureProjectRouteClass\(\);/);
});

test("applyCompactState garantit route--project avant le early return", () => {
  assert.match(chromeSource, /function applyCompactState\(isCompact\) \{[\s\S]*?ensureProjectRouteClass\(\);[\s\S]*?if \(!didChange\) \{/);
});

test("instrumentation project scroll policy loggue body, scrollingElement et appLayout", () => {
  assert.match(chromeSource, /bodyClassName:\s*document\.body\?\.className\s*\|\|\s*""/);
  assert.match(chromeSource, /scrollingElementTag:\s*scrollingElement\?\.tagName\s*\|\|\s*null/);
  assert.match(chromeSource, /appLayout:\s*readAppLayout\(\)/);
  assert.match(chromeSource, /function readAppLayout\(\)\s*\{[\s\S]*?position:[\s\S]*?overflow:[\s\S]*?scrollTop:[\s\S]*?scrollHeight:[\s\S]*?clientHeight:/);
});

/**
 * **Changer de panneau ramène en haut.**
 *
 * Le routeur des panneaux le faisait pour ses propres entrées, pas pour les
 * raccourcis qui passent par `afficherPanneau` — celui du Copilote en
 * particulier. On descendait dans une étude de fondations, le bandeau se
 * repliait, on cliquait « Copilote » : le panneau changeait, la coque gardait
 * ses huit cents pixels, le bandeau restait replié — et replié, il n'a plus
 * d'onglets. Le Copilote tenant dans la hauteur, plus rien ne pouvait ramener la
 * coque en haut : on était coincé sur l'écran.
 *
 * Une garde de texte, faute de pouvoir importer l'Atelier — il monte le Copilote,
 * qui parle à la base. Elle attrape exactement le défaut : un retour en haut
 * qu'on retire.
 */
test("l'Atelier ramène sa coque en haut quand il change de panneau", async () => {
  const { readFile } = await import("node:fs/promises");
  const atelier = await readFile(new URL("./project-studio.js", import.meta.url), "utf8");

  assert.match(
    atelier,
    /function afficherPanneau\(root, targetId\) \{[\s\S]{0,1400}?#projectStudioRouterScroll"\)\?\.scrollTo\?\.\(\{ top: 0/
  );
});
