/**
 * Copie dans `apps/web/vendor/utilitaires` les modules d'utilitaire que
 * l'Atelier a besoin d'exécuter dans le navigateur.
 *
 * ## Pourquoi la source de vérité est côté serveur
 *
 * L'orchestration du copilote — quels utilitaires existent, quand les appeler,
 * comment ils s'enchaînent, les consignes qui décident — ne doit pas être
 * lisible dans le navigateur. Elle vit donc sous
 * `supabase/functions/_shared/utilitaires/`, servie par personne.
 *
 * Deux modules de ce dossier n'ont pourtant rien de secret : la **déclaration
 * des entrées de l'utilitaire fondations**, que l'écran affiche champ par champ,
 * et le **spectre élastique EC8**, dont l'écran Spectre trace la courbe. Les
 * cacher n'aurait aucun sens — on les lit à l'écran — et les dupliquer les
 * ferait diverger. Ils sont donc copiés d'un seul endroit vers l'autre, au
 * moment du build, comme le moteur de spike l'est déjà.
 *
 * ## Le garde-fou
 *
 * Le script refuse de copier un module qui n'est pas dans la liste, et refuse
 * la liste elle-même si l'on y glisse un module d'orchestration. Mieux vaut
 * casser le build que publier par mégarde le catalogue dans une page.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(rootDir, "supabase", "functions", "_shared", "utilitaires");
const targetDir = path.join(rootDir, "apps", "web", "vendor", "utilitaires");

/** Ce qui se lit déjà à l'écran, et n'a donc rien à cacher. */
const PUBLICS = [
  "fondations-declaration.js",
  "seismic-spectrum.js"
];

/**
 * Ce qui ne doit jamais partir au navigateur.
 *
 * La liste n'est pas décorative : elle est vérifiée à chaque build. Un module
 * d'orchestration ajouté aux publics par distraction casse la construction
 * plutôt que de se retrouver en ligne.
 */
const JAMAIS = [
  "catalogue.js",
  "note-de-calcul.js",
  "predimensionnement.js",
  "lire-la-note.js",
  "moteurs.js",
  "memoire.js"
];

async function main() {
  const fautif = PUBLICS.find((nom) => JAMAIS.includes(nom));
  if (fautif) {
    throw new Error(
      `« ${fautif} » est un module d'orchestration : il ne se copie pas dans le navigateur.`
    );
  }

  await mkdir(targetDir, { recursive: true });

  for (const nom of PUBLICS) {
    const source = await readFile(path.join(sourceDir, nom), "utf8");

    // Un module public qui se met à importer un module d'orchestration
    // emporterait celui-ci avec lui. On refuse plutôt que de le découvrir en
    // lisant le bundle.
    for (const interdit of JAMAIS) {
      if (source.includes(`"./${interdit}"`) || source.includes(`'./${interdit}'`)) {
        throw new Error(`« ${nom} » importe « ${interdit} » : il ne peut plus être public.`);
      }
    }

    await writeFile(path.join(targetDir, nom), source, "utf8");
    console.log(`utilitaires: ${nom}`);
  }
}

main().catch((erreur) => {
  console.error(erreur.message);
  process.exitCode = 1;
});
