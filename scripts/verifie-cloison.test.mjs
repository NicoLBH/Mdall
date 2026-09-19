/**
 * La cloison : ce que le navigateur peut lire, et ce qu'il ne peut pas.
 *
 * ## Pourquoi ce test existe
 *
 * L'orchestration du copilote a vécu mille sept cents lignes dans le navigateur.
 * On protégeait le moteur de calcul — l'arithmétique — et l'on publiait la
 * méthode : quels utilitaires existent, quelles phrases décident de les appeler,
 * comment ils s'enchaînent, ce qu'on refuse de laisser inventer au modèle.
 *
 * Rien n'empêche de l'y remettre par distraction : un `import` qui remonte d'un
 * dossier, un module ajouté à la liste des copies publiques. Ce test tient la
 * frontière, et il casse la construction plutôt que la découvrir en lisant un
 * bundle en production.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.join(rootDir, "apps", "web");
const utilitairesDir = path.join(rootDir, "supabase", "functions", "_shared", "utilitaires");

/**
 * Ce qui ne doit jamais être servi par le site.
 *
 * La comparaison porte sur le **contenu**, pas sur le nom : `catalogue.js`
 * existe aussi du côté des déductions, et il n'a rien à voir. Ce qu'on cherche,
 * c'est une copie — où qu'elle soit et quel que soit son nom.
 */
const SECRETS = ["catalogue.js", "note-de-calcul.js", "predimensionnement.js", "lire-la-note.js", "moteurs.js"];

/** Une empreinte insensible à la mise en forme, pour reconnaître une copie. */
function empreinte(source) {
  return source.replace(/\s+/g, " ").trim();
}

async function fichiersDe(dossier, filtre = () => true) {
  const trouves = [];
  for (const entree of await readdir(dossier, { withFileTypes: true })) {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) trouves.push(...await fichiersDe(chemin, filtre));
    else if (filtre(chemin)) trouves.push(chemin);
  }
  return trouves;
}

/**
 * Les consignes qui ne doivent pas quitter le serveur.
 *
 * Une consigne dit ce qu'on demande à un modèle, ce qu'on lui interdit, et par
 * quels exemples on le corrige. La publier, c'est publier la méthode — et
 * donner de quoi la contourner à qui sait lire un bundle.
 *
 * **La note de dépôt n'est pas dans cette liste, et c'est délibéré :** son plan
 * est écrit dans `apps/web/js/services/deposit-note.js`, dupliqué à la main dans
 * la fonction, et un test compare les deux. C'était le choix d'alors. Les
 * consignes écrites depuis restent au serveur, et celle-ci vérifie qu'elles y
 * restent.
 */
/**
 * Les phrases d'une consigne, où qu'elle soit déclarée.
 *
 * **La liste des fonctions à surveiller a disparu, et c'est le correctif.**
 * Elle n'en portait qu'une, tenue à la main, et deux consignes écrites depuis
 * — celle des comptes rendus, celle des fils de mails — vivaient dans
 * `_shared/` sans que rien ne les regarde. Une liste qu'il faut penser à
 * allonger est une liste qui cesse de couvrir à la première distraction : on
 * cherche donc les consignes elles-mêmes, partout sous `supabase/functions`.
 */
function phrasesDeLaConsigne(source) {
  const phrases = [];
  for (const bloc of source.matchAll(/const CONSIGNES? = \[([\s\S]*?)\]\.join/g)) {
    phrases.push(...[...bloc[1].matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g)]
      .map((trouve) => (trouve[1] ?? trouve[2] ?? "").trim())
      // Les lignes courtes se retrouveraient par hasard dans du code sans
      // rapport. Ce qu'on cherche est une phrase, pas un mot.
      .filter((phrase) => phrase.length >= 40));
  }
  return phrases;
}

test("aucune consigne donnée à un modèle n'est servie par le site", async () => {
  const servis = await fichiersDe(webDir, (f) => f.endsWith(".js") || f.endsWith(".mjs"));
  const sources = new Map();
  for (const fichier of servis) sources.set(fichier, await readFile(fichier, "utf8"));

  const cotesServeur = await fichiersDe(
    path.join(rootDir, "supabase", "functions"),
    (f) => f.endsWith(".ts") || f.endsWith(".js")
  );

  let consignesTrouvees = 0;
  for (const fonction of cotesServeur) {
    const phrases = phrasesDeLaConsigne(await readFile(fonction, "utf8"));
    if (!phrases.length) continue;
    consignesTrouvees += 1;

    for (const [fichier, source] of sources) {
      for (const phrase of phrases) {
        assert.ok(
          !source.includes(phrase),
          `${path.relative(rootDir, fichier)} porte une phrase de la consigne de `
            + `${path.relative(rootDir, fonction)} : elle serait lisible avec F12 — `
            + `« ${phrase.slice(0, 60)}… »`
        );
      }
    }
  }

  // Une consigne qu'on ne sait plus lire ne prouve rien, et un test qui passe
  // sans rien vérifier est pire qu'un test absent.
  assert.ok(consignesTrouvees >= 3, `seulement ${consignesTrouvees} consignes retrouvées côté serveur`);
});

test("aucun module d'orchestration n'est servi par le site", async () => {
  const interdits = new Map();
  for (const nom of SECRETS) {
    interdits.set(empreinte(await readFile(path.join(utilitairesDir, nom), "utf8")), nom);
  }

  const servis = await fichiersDe(webDir, (f) => f.endsWith(".js") || f.endsWith(".mjs"));
  const fautifs = [];

  for (const fichier of servis) {
    const copie = interdits.get(empreinte(await readFile(fichier, "utf8")));
    if (copie) fautifs.push(`${path.relative(rootDir, fichier)} est une copie de ${copie}`);
  }

  assert.deepEqual(fautifs, [], "ces modules seraient lisibles avec F12");
});

/**
 * Ce qu'une page peut charger, par opposition à ce qui traîne dans le dossier.
 *
 * Un fichier de test n'est chargé par aucune page : il n'est dans le graphe
 * d'imports d'aucun écran, et le chemin qu'il nomme —
 * `../../../../supabase/functions/...` — pointe **hors** de ce que le site sert.
 * Le suivre depuis un navigateur ne mène nulle part.
 *
 * Confondre les deux obligerait à écrire les tests de couplage en imports
 * dynamiques multilignes, pour passer sous la garde plutôt que devant elle —
 * c'est-à-dire à garder son angle mort en croyant la respecter.
 *
 * Le test suivant ferme la porte que celui-ci laisse entrouverte : **rien de ce
 * que le site sert n'importe un fichier de test.**
 */
const estUnTest = (fichier) => fichier.endsWith(".test.mjs");

/**
 * Est-ce que ce fichier va chercher ce chemin-là ?
 *
 * **Les trois formes, et pas deux.** On ne regardait que `from "…"` et
 * `import("…")` ; l'import à effet de bord — `import "…"`, sans rien en tirer —
 * passait à travers. C'est pourtant celui qu'on écrit quand on veut juste que le
 * module soit chargé, et il emporte tout autant ce qu'il nomme.
 *
 * Trouvé en cassant la garde pour la voir tomber : elle n'est pas tombée.
 */
function vaChercher(source, motif) {
  return new RegExp(`(?:from|import)\\s*\\(?\\s*["'][^"']*${motif}`).test(source);
}

test("aucun fichier du site ne remonte vers les utilitaires du serveur", async () => {
  // Un `import "../../../supabase/functions/..."` serait suivi par le
  // navigateur : le module partirait avec la page.
  const servis = await fichiersDe(
    webDir, (f) => (f.endsWith(".js") || f.endsWith(".mjs")) && !estUnTest(f)
  );
  const fautifs = [];

  for (const fichier of servis) {
    const source = await readFile(fichier, "utf8");
    if (vaChercher(source, "supabase\\/functions")) fautifs.push(path.relative(rootDir, fichier));
  }

  assert.deepEqual(fautifs, []);
});

test("rien de ce que le site charge n'importe un fichier de test", async () => {
  // Sans celui-ci, l'exception ci-dessus serait une porte : un module d'écran
  // importerait un `.test.mjs`, qui lui-même remonte au serveur, et le module
  // d'orchestration partirait avec la page par un chemin que personne ne
  // regarde.
  const servis = await fichiersDe(
    webDir, (f) => (f.endsWith(".js") || f.endsWith(".mjs")) && !estUnTest(f)
  );
  const fautifs = [];

  for (const fichier of servis) {
    const source = await readFile(fichier, "utf8");
    if (vaChercher(source, "\\.test\\.mjs")) fautifs.push(path.relative(rootDir, fichier));
  }

  assert.deepEqual(fautifs, []);
});

test("les modules d'orchestration ne dépendent de rien qui vienne du navigateur", async () => {
  // L'inverse compte aussi : un utilitaire qui importerait un service du site
  // ne se déploierait pas, et l'on ne s'en apercevrait qu'en production.
  const modules = await fichiersDe(utilitairesDir, (f) => f.endsWith(".js"));
  const fautifs = [];

  for (const fichier of modules) {
    const source = await readFile(fichier, "utf8");
    if (vaChercher(source, "apps\\/web")) fautifs.push(path.relative(rootDir, fichier));
  }

  assert.deepEqual(fautifs, []);
});
