/**
 * Le garde-fou des noms réexportés, et le dépôt qu'il parcourt.
 *
 * Les cas se posent à la main — c'est la seule façon de prouver que la lecture
 * attrape ce qu'elle prétend attraper, puisqu'un dépôt sain ne lui donne rien à
 * trouver. Le parcours, lui, est vérifié par ce qu'il visite.
 *
 * Il lit du texte, et c'est assumé : **c'est le cas que la règle de la maison
 * réserve à la lecture de source** — un défaut précisément invisible, dans des
 * fichiers qu'aucune épreuve ne peut charger. Exécuter le module serait mieux ;
 * on ne peut pas.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { lesReexportsNonLies, nomsDeLaListe, sansLesCommentaires } from "./reexports-non-lies.mjs";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dossiers = [
  path.join(racine, "apps", "web", "js"),
  path.join(racine, "supabase", "functions")
];

async function fichiers(dossier) {
  const entrees = await readdir(dossier, { withFileTypes: true }).catch(() => []);
  const trouves = [];
  for (const entree of entrees) {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) trouves.push(...await fichiers(chemin));
    else if (/\.(js|ts|mjs)$/.test(entree.name) && !entree.name.endsWith(".test.mjs")) {
      trouves.push(chemin);
    }
  }
  return trouves;
}

// ── Ce que la lecture attrape ──────────────────────────────────────────────

test("la faute livrée est attrapée", () => {
  // Le fichier tel qu'il est parti en production : le nom passe aux appelants
  // et n'existe pas ici. `node --check` accepte ce texte sans rien dire.
  const source = `import { auth } from "./auth.js";
export { messagesAEnvoyer } from "./le-fil-des-mails.js";
export function relever(messages) {
  return messagesAEnvoyer(messages);
}`;
  assert.deepEqual(lesReexportsNonLies(source), ["messagesAEnvoyer"]);
});

test("le nom importé puis réexporté ne dit rien", () => {
  // La correction : le même nom, importé au-dessus. C'est le cas sain, et il
  // doit le rester — un garde-fou qui accuse aussi le code correct s'éteint.
  const source = `import { messagesAEnvoyer } from "./le-fil-des-mails.js";
export { messagesAEnvoyer };
export function relever(messages) {
  return messagesAEnvoyer(messages);
}`;
  assert.deepEqual(lesReexportsNonLies(source), []);
});

test("un nom réexporté que le fichier n'emploie pas ne dit rien", () => {
  // C'est le rôle ordinaire d'un réexport : faire passer un nom vers les
  // appelants sans s'en servir. L'accuser interdirait la moitié des façades.
  const source = `export { QUE_FAIRE, phraseDuRefus } from "./le-releve-rendu.js";
export const ACCEPTE = ".eml";`;
  assert.deepEqual(lesReexportsNonLies(source), []);
});

test("la ligne de réexport ne compte pas comme un emploi", () => {
  // Sans cette coupe, tout nom réexporté serait accusé par la ligne même qui
  // le réexporte, et le garde-fou hurlerait sur un dépôt sain.
  assert.deepEqual(lesReexportsNonLies(`export { leReleveLu } from "./le-releve-rendu.js";`), []);
});

test("un nom que le fichier déclare lui-même ne dit rien", () => {
  // Il est local, même sans import : le réexport voisin ne le rend pas absent.
  const source = `export { autreChose } from "./ailleurs.js";
export function autreChose() { return autreChose; }`;
  assert.deepEqual(lesReexportsNonLies(source), []);
});

test("un nom renommé à la sortie est celui qu'on cherche", () => {
  // `export { a as b }` fait passer `b` ; c'est `b` qui manquera ici, pas `a`.
  const source = `export { interne as messagesAEnvoyer } from "./ailleurs.js";
const x = () => messagesAEnvoyer();`;
  assert.deepEqual(lesReexportsNonLies(source), ["messagesAEnvoyer"]);
});

test("un import par défaut lie le nom, lui aussi", () => {
  const source = `import messagesAEnvoyer from "./ailleurs.js";
export { messagesAEnvoyer } from "./ailleurs.js";
const x = () => messagesAEnvoyer();`;
  assert.deepEqual(lesReexportsNonLies(source), []);
});

test("un fichier sans aucun réexport ne se lit pas plus loin", () => {
  assert.deepEqual(lesReexportsNonLies(`const truc = 1; truc();`), []);
  assert.deepEqual(lesReexportsNonLies(""), []);
  assert.deepEqual(lesReexportsNonLies(null), []);
});

test("les noms d'une liste se lisent, renommages compris", () => {
  assert.deepEqual(nomsDeLaListe(" a, b as c , d "), ["a", "c", "d"]);
  assert.deepEqual(nomsDeLaListe(""), []);
});

// ── Ce que le parcours visite ──────────────────────────────────────────────

test("le parcours couvre le navigateur et le serveur", async () => {
  // Une lecture qui ne regarde nulle part passe toujours. Le compte le dit :
  // les deux racines doivent rendre des fichiers, et en nombre.
  const parRacine = await Promise.all(dossiers.map((dossier) => fichiers(dossier)));
  for (const [rang, trouves] of parRacine.entries()) {
    assert.ok(trouves.length > 10, `${dossiers[rang]} : ${trouves.length} fichiers`);
  }
  assert.ok(parRacine.flat().some((chemin) => chemin.includes("prises-par-le-modele.js")),
    "le fichier qui a porté la faute doit être parcouru");
});

test("aucun nom réexporté et employé n'est resté sans import", async () => {
  const coupables = [];
  for (const dossier of dossiers) {
    for (const chemin of await fichiers(dossier)) {
      for (const nom of lesReexportsNonLies(await readFile(chemin, "utf8"))) {
        coupables.push(`${path.relative(racine, chemin)} : ${nom}`);
      }
    }
  }

  assert.deepEqual(coupables, [],
    "réexporté depuis ailleurs, employé ici, jamais importé — « is not defined » au premier appel :\n"
    + coupables.join("\n"));
});

/* ── Un commentaire est du texte, et ce garde-fou lit du texte ───────────── */

test("un réexport cité dans un commentaire n'accuse personne", () => {
  // C'est le cas qui a fait tomber le garde-fou sur lui-même : le module qui
  // documente ce piège en cite forcément la forme. Un faux positif est pire
  // qu'un silence — celui qui le rencontre désarme le garde plutôt que de
  // distinguer l'alerte juste de l'alerte sur de la prose.
  const source = [
    '/**',
    ' * `export { machin } from "./ailleurs.js";` ne lie rien ici.',
    ' */',
    'export function faire() { return machin; }'
  ].join("\n");

  assert.deepEqual(lesReexportsNonLies(source), []);
});

test("un emploi caché dans un commentaire ne compte pas comme un emploi", () => {
  // L'autre sens : le nom est bien réexporté sans liaison, mais le seul endroit
  // qui le « nomme » est une phrase. Rien ne lèvera « n'est pas défini ».
  const source = [
    'import { autre } from "./autre.js";',
    'export { machin } from "./ailleurs.js";',
    'export const truc = autre;',
    '// on pourrait se servir de machin un jour'
  ].join("\n");

  assert.deepEqual(lesReexportsNonLies(source), []);
});

test("le `//` d'une adresse ne coupe pas la ligne qui la porte", () => {
  // Le piège de la correction elle-même : couper à chaque `//` emporterait la
  // fin d'un `import … from "https://…"`, donc l'import — et le garde-fou
  // accuserait un nom pourtant lié.
  const source = [
    'import { serve } from "https://deno.land/std@0.224.0/http/server.ts";',
    'export { serve } from "https://deno.land/std@0.224.0/http/server.ts";',
    'export const lancer = () => serve();'
  ].join("\n");

  assert.deepEqual(lesReexportsNonLies(source), []);
  assert.match(sansLesCommentaires(source), /https:\/\/deno\.land/);
});

test("la faute reste attrapée quand elle voisine un commentaire", () => {
  const source = [
    '// ce module parle à l\'authentification, aucune épreuve ne l\'importe',
    'export { messagesAEnvoyer } from "./le-fil-des-mails.js";',
    'export function relever() { return messagesAEnvoyer(); }'
  ].join("\n");

  assert.deepEqual(lesReexportsNonLies(source), ["messagesAEnvoyer"]);
});

test("les commentaires partent, le code reste à sa place", () => {
  // Les positions ne bougent pas : un motif ne doit pas se recoller par-dessus
  // le trou qu'on vient de faire.
  const source = 'const a = 1; /* ceci */ const b = 2;';
  const net = sansLesCommentaires(source);

  assert.equal(net.length, source.length);
  assert.doesNotMatch(net, /ceci/);
  assert.match(net, /^const a = 1;\s+const b = 2;$/);
});

test("une chaîne qui contient une contre-oblique ne referme pas trop tôt", () => {
  // `"il a dit \"non\""` : sans la contre-oblique, la chaîne se fermerait au
  // milieu et la suite se lirait comme du code.
  const source = 'const dit = "il a dit \\"// pas un commentaire\\"";';

  assert.equal(sansLesCommentaires(source), source);
});
