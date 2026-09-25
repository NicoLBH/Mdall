/**
 * Ce que l'écran des arêtes fait de l'établi.
 *
 * ## Pourquoi cette épreuve relit le source
 *
 * Ce module parle à la base : on ne peut pas le charger ici, et rien de ce
 * qu'il décide ne se voit dans un rendu. Or trois choses s'y perdent en
 * silence, et chacune se découvre à l'usage plutôt qu'à la lecture :
 *
 *  - l'établi lu et **pas passé** à l'histoire — la phrase n'apparaît jamais,
 *    et l'on cherche pourquoi du côté du service, qui est juste ;
 *  - l'établi relu **à chaque dépliage** — une requête par ligne ouverte pour
 *    rendre à chaque fois la même réponse ;
 *  - une lecture ratée qui **empêche d'ouvrir un sujet** — on aurait échangé
 *    une phrase d'agrément contre l'écran entier.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE = readFileSync(fileURLToPath(new URL("./aretes-du-sujet.js", import.meta.url)), "utf8");

test("l'établi lu est passé à l'histoire de chaque valeur", () => {
  // Sans cela, la marque est là, le service sait comparer, et l'écran ne dit
  // rien — le plus difficile des défauts à chercher.
  const debut = SOURCE.indexOf("const raconter = (assertion) => histoireDeLaValeur(assertion, {");
  assert.ok(debut > 0, "l'appel à histoireDeLaValeur est introuvable");

  const appel = SOURCE.slice(debut, SOURCE.indexOf("});", debut));
  assert.match(appel, /^\s*etabli,$/m, "l'histoire est racontée sans savoir où en est l'établi");
});

test("il se lit avant de raconter, et non après", () => {
  // Lu après, la première ouverture d'un sujet ne dirait rien, et la seconde
  // si : l'écran aurait deux comportements pour une seule question.
  assert.ok(SOURCE.indexOf("await assurerLetabli();")
    < SOURCE.indexOf("const raconter = (assertion) => histoireDeLaValeur"));
});

test("il se lit une fois, pas à chaque dépliage", () => {
  // Il ne dépend d'aucun sujet : une requête par ligne ouverte rendrait à
  // chaque fois la même réponse.
  const debut = SOURCE.indexOf("async function assurerLetabli()");
  assert.ok(debut > 0, "assurerLetabli est introuvable");
  const corps = SOURCE.slice(debut, SOURCE.indexOf("\n}\n", debut));

  assert.match(corps, /if \(etabli !== null \|\| etabliEnCours\) return;/,
    "l'établi se relit à chaque venue, ou deux lectures peuvent se croiser");
  assert.match(corps, /await import\("\.\.\/\.\.\/services\/etabli-supabase\.js"\)/,
    "l'établi doit se charger à l'usage : importé en tête, ce module deviendrait impossible à éprouver");
});

test("une lecture ratée n'empêche pas d'ouvrir un sujet", () => {
  // On aurait échangé une phrase d'agrément contre l'écran entier (règle 5) :
  // une valeur se lit très bien sans savoir où en est l'outil qui l'a écrite.
  const debut = SOURCE.indexOf("async function assurerLetabli()");
  const corps = SOURCE.slice(debut, SOURCE.indexOf("\n}\n", debut));

  assert.match(corps, /try \{/);
  assert.match(corps, /\} catch \{/);
  assert.match(corps, /finally \{[\s\S]*etabliEnCours = false;/,
    "un échec doit rendre la main, sinon plus aucune lecture ne repartira");
});

test("repartir de zéro oublie aussi l'établi", () => {
  // On a pu enregistrer une v4 entre-temps, dans l'onglet d'à côté. Le garder
  // ferait annoncer une avance d'hier.
  const debut = SOURCE.indexOf("export function oublierLesAretes()");
  assert.ok(debut > 0, "oublierLesAretes est introuvable");
  const corps = SOURCE.slice(debut, SOURCE.indexOf("\n}\n", debut));

  assert.match(corps, /etabli = null;/);
});
