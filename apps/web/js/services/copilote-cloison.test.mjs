/**
 * La cloison autour des conversations du copilote.
 *
 * On y essaie des questions, on y dit ce qu'on ne sait pas, on y prépare ce
 * qu'on n'assume pas encore. Qu'une seule de ces conversations apparaisse dans
 * le fil d'un sujet, dans un export ou sous les yeux d'un autre intervenant, et
 * plus personne n'écrira rien de vrai au copilote. Le produit serait
 * discrédité, et il l'aurait mérité.
 *
 * « Privé » ne peut donc pas être une intention écrite dans un commentaire :
 * un commentaire ne s'oppose à rien. Ce fichier lit le code source et casse la
 * construction quand une porte s'ouvre. Il n'empêche pas d'ouvrir cette
 * porte — il empêche de l'ouvrir **sans le voir**.
 *
 * ## Ce qui a changé quand les discussions sont passées en base
 *
 * La garantie ne repose plus sur l'absence d'écriture. Elle repose sur trois
 * choses, et ce fichier les vérifie une par une :
 *
 *  1. **une seule porte** — un seul module parle à la base, et il ne touche que
 *     les deux tables du copilote ;
 *  2. **propriétaire seul** — la migration active RLS sur les deux tables et
 *     n'accorde rien à la clé anonyme ;
 *  3. **rien ailleurs** — aucun écran partagé, aucune fonction serveur, aucun
 *     autre module ne lit ces discussions.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SERVICES = dirname(fileURLToPath(import.meta.url));
const WEB = join(SERVICES, "..", "..");
const RACINE = join(WEB, "..", "..");

function lire(chemin) {
  return readFileSync(chemin, "utf8");
}

function fichiersJs(dossier, acc = []) {
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) fichiersJs(chemin, acc);
    else if (entree.name.endsWith(".js")) acc.push(chemin);
  }
  return acc;
}

/**
 * Qui a le droit de lire les conversations, et pour quoi faire.
 *
 * La liste est courte et exhaustive **exprès** : ajouter un lecteur doit
 * obliger à modifier ce fichier, donc à se poser la question. C'est tout ce
 * qu'on demande — pas une interdiction, une décision consciente.
 */
const LECTEURS_AUTORISES = new Map([
  ["apps/web/assets/js/auth.js", "efface tout à la déconnexion"],
  ["apps/web/js/views/project-studio.js", "affiche les titres dans le rail"],
  ["apps/web/js/views/studio/copilote/copilote.js", "l'écran du copilote lui-même"]
]);

function cheminRelatif(chemin) {
  return chemin.slice(RACINE.length + 1).split("\\").join("/");
}

/** Le code sans ses commentaires : une prose qui parle de la base n'est pas une porte. */
function code(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

test("le module des règles n'a aucun moyen de faire sortir une discussion", () => {
  // Il n'importe rien : ni réseau, ni Supabase, ni store. Les allers-retours
  // avec la base sont ailleurs, dans un module qu'on surveille à part.
  const source = code(lire(join(SERVICES, "copilote-conversations.js")));

  assert.doesNotMatch(source, /^\s*import\s/m, "aucun import");
  assert.doesNotMatch(source, /\bfetch\s*\(/, "aucun appel réseau");
  assert.doesNotMatch(source, /supabase/i, "aucun accès à la base");
  assert.doesNotMatch(source, /functions\/v1/, "aucun appel de fonction distante");
});

test("une seule porte parle à la base, et seulement aux deux tables du copilote", () => {
  const source = code(lire(join(SERVICES, "copilote-conversations-supabase.js")));
  const tables = [...source.matchAll(/\.from\("([^"]+)"\)/g)].map((trouve) => trouve[1]);

  assert.ok(tables.length > 0, "ce module parle bien à la base");
  assert.deepEqual(
    [...new Set(tables)].sort(),
    ["copilot_conversations", "copilot_messages"],
    "aucune autre table n'est touchée par la porte des conversations"
  );
});

test("aucun autre module de l'application ne touche aux tables du copilote", () => {
  for (const chemin of [...fichiersJs(join(WEB, "js")), ...fichiersJs(join(WEB, "assets", "js"))]) {
    if (chemin.endsWith("copilote-conversations-supabase.js") || chemin.endsWith(".test.mjs")) continue;
    assert.doesNotMatch(
      code(lire(chemin)),
      /copilot_conversations|copilot_messages/,
      `${cheminRelatif(chemin)} touche aux tables des discussions : cela doit passer par la porte unique`
    );
  }
});

test("les deux tables sont fermées à tout le monde sauf à leur propriétaire", () => {
  // C'est désormais la seule chose qui se tient entre une conversation privée
  // et le reste de l'équipe : les autres tables de Mdall sont ouvertes à tout
  // le projet, celles-ci ne doivent surtout pas l'être.
  const migration = lire(join(RACINE, "supabase", "migrations", "202609100001_copilot_conversations.sql"));

  for (const table of ["copilot_conversations", "copilot_messages"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`), `RLS actif sur ${table}`);
  }

  // Deux sens : `using` empêche de lire celles des autres, `with check`
  // empêche de leur en fabriquer. Sans le second, on ne verrait rien mais on
  // pourrait écrire chez eux.
  assert.equal((migration.match(/using \(\s*owner_id = auth\.uid\(\)/g) || []).length, 2);
  assert.equal((migration.match(/with check \(\s*owner_id = auth\.uid\(\)/g) || []).length, 2);

  // La clé anonyme ne désigne personne : aucune politique ne doit la nommer.
  const politiques = migration.slice(migration.indexOf("create policy"));
  assert.doesNotMatch(politiques, /\bto\s+anon\b/, "rien n'est accordé à la clé anonyme");
  assert.doesNotMatch(politiques, /using \(true\)/, "aucune politique ouverte");
});

test("seuls les lecteurs déclarés importent les conversations", () => {
  const lecteurs = [];

  for (const chemin of [...fichiersJs(join(WEB, "js")), ...fichiersJs(join(WEB, "assets", "js"))]) {
    if (chemin.endsWith("copilote-conversations.js") || chemin.endsWith(".test.mjs")) continue;
    if (/^\s*import[^;]*copilote-conversations\.js/m.test(lire(chemin))) lecteurs.push(cheminRelatif(chemin));
  }

  assert.deepEqual(
    lecteurs.sort(),
    [...LECTEURS_AUTORISES.keys()].sort(),
    "un nouveau lecteur des conversations : est-il légitime ? s'il l'est, ajoute-le à LECTEURS_AUTORISES"
  );
});

test("aucun écran partagé ne lit les conversations", () => {
  // Les sujets, les propositions et la mémoire sont vus par toute l'équipe.
  // Aucun d'eux ne doit pouvoir afficher ce qu'un copilote a répondu à
  // quelqu'un.
  const partages = [
    join(WEB, "js", "views", "project-subjects"),
    join(WEB, "js", "views", "project-propositions.js"),
    join(WEB, "js", "views", "project-memory.js")
  ];

  for (const cible of partages) {
    const fichiers = cible.endsWith(".js") ? [cible] : fichiersJs(cible);
    for (const chemin of fichiers) {
      assert.doesNotMatch(
        lire(chemin),
        /copilote-conversations|ui\.assistant/,
        `${cheminRelatif(chemin)} ne doit rien connaître des conversations du copilote`
      );
    }
  }
});

test("la fonction serveur du copilote n'écrit nulle part", () => {
  // Le navigateur écrit sous sa propre identité, dans des tables dont la
  // politique est propriétaire seul. La fonction, elle, n'écrit rien : une
  // écriture faite là passerait par un client de service, donc hors RLS.
  const source = lire(join(RACINE, "supabase", "functions", "project-copilot", "index.ts"));

  assert.doesNotMatch(source, /\.insert\s*\(/, "aucun insert");
  assert.doesNotMatch(source, /\.upsert\s*\(/, "aucun upsert");
  assert.doesNotMatch(source, /\.update\s*\(/, "aucun update");
  assert.doesNotMatch(source, /\.rpc\s*\(/, "aucun appel de procédure");
  assert.doesNotMatch(source, /SERVICE_ROLE/, "aucun client de service : la vérification serait décorative");
});

test("la fonction serveur ne recopie ni la question ni la réponse dans ses journaux", () => {
  // Un journal partagé par l'équipe qui contiendrait les questions de chacun
  // serait la fuite même qu'on refuse. On y compte des caractères.
  const source = lire(join(RACINE, "supabase", "functions", "project-copilot", "index.ts"));

  for (const [, journal] of source.matchAll(/console\.(log|error)\(([\s\S]*?)\n  \}\);/g)) {
    assert.doesNotMatch(journal, /\bquestion\b(?!_)/, "la question ne se journalise pas");
    assert.doesNotMatch(journal, /\breply\b(?!_chars)/, "la réponse ne se journalise pas");
    assert.doesNotMatch(journal, /\bmemoire\b(?!_)/, "la mémoire ne se journalise pas");
  }
});

test("la fonction serveur exige un utilisateur, puis un droit de lecture sur le projet", () => {
  const source = lire(join(RACINE, "supabase", "functions", "project-copilot", "index.ts"));

  const garde = source.indexOf("requireUser(req");
  const droit = source.indexOf('.from("projects")');
  const depense = source.indexOf("api.openai.com");

  assert.ok(garde > 0, "un jeton porteur est exigé");
  assert.ok(droit > garde, "le droit de lire le projet se vérifie après l'identité");
  assert.ok(depense > droit, "rien n'est dépensé avant que les deux questions soient tranchées");
});

test("plus rien ne pointe vers le webhook n8n", () => {
  // Il était public : n'importe qui connaissant l'URL déclenchait un appel
  // payant, et rien ne vérifiait le droit de lire le projet dont la mémoire
  // partait.
  for (const chemin of [...fichiersJs(join(WEB, "js")), ...fichiersJs(join(WEB, "assets", "js"))]) {
    const source = lire(chemin);
    assert.doesNotMatch(source, /n8n\.cloud/, `${cheminRelatif(chemin)} appelle encore n8n`);
  }
});
