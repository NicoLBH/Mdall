/**
 * Prépare la console d'administration : un **autre site**, construit à part.
 *
 * ## Pourquoi un build séparé
 *
 * La console lit des comptes d'exploitation — combien de comptes, quelles
 * fonctions tombent en panne, où en est la prédiction. Rien de tout cela n'a
 * sa place dans la page que les utilisateurs chargent, pour trois raisons qui
 * tiennent chacune toute seule :
 *
 * 1. **Ce qui n'est pas servi ne fuit pas.** Un écran d'administration caché
 *    derrière une condition reste téléchargé par tout le monde, et se lit dans
 *    le code de la page. Ici, il n'est pas dans la page du tout.
 * 2. **Les deux ne changent pas au même rythme.** Une correction de console ne
 *    doit pas obliger à redéployer l'application des chantiers.
 * 3. **Ils ne parlent pas de la même chose.** L'application connaît des
 *    projets ; la console ne connaît que des nombres.
 *
 * ## Ce qui se partage, et comment
 *
 * Tout ce qui est écrit deux fois finit par diverger (règle 4). La console ne
 * recopie donc rien : ce script **emporte** depuis `apps/web` les modules
 * qu'elle nomme, et tout ce qu'ils importent, en gardant la disposition des
 * dossiers pour que les chemins relatifs continuent de tomber juste.
 *
 * La feuille de style part entière : les classes de Mdall sont les classes de
 * la console. Un écran d'administration recalibré à la main se verrait comme
 * une greffe, et il faudrait tout retoucher deux fois.
 *
 * ## Le garde-fou
 *
 * Le parcours ne sort **jamais** de `apps/web`. Un import qui remonterait plus
 * haut — vers `supabase/functions`, où vivent le catalogue et les consignes —
 * casse la construction. Le même principe que `prepare-utilitaires.mjs` :
 * mieux vaut un build rouge qu'une méthode publiée.
 */

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.join(rootDir, "apps", "web");
const consoleDir = path.join(rootDir, "apps", "console");
const partageDir = path.join(consoleDir, "partage");

/**
 * Ce que la console nomme. Le reste vient tout seul, par les imports.
 *
 * Une liste courte, et tenue : elle dit en clair de quoi la console dépend, et
 * grossir sans s'en rendre compte devient visible dans un diff.
 */
export const RACINES = [
  "js/services/la-porte-de-la-console-supabase.js",
  "js/services/un-msg-deplie.js",
  "js/services/linventaire-du-versoir.js",
  "js/services/larchive-des-pieces-supabase.js",
  // **Le lecteur de PDF de Mdall, tel quel.** Celui de l'onglet Documents et du
  // copilote. Il ne dépend de rien et dessine dans les classes que la feuille
  // de style porte déjà : un second lecteur écrit pour la console aurait
  // divergé du premier au premier correctif (règle 4).
  "js/services/ct-lab-pdf-view.js"
];

/**
 * Ce qui part tel quel, sans être suivi : ni import ni dépendance.
 *
 * `vendor/unpdf` est un dossier, et il est produit par `npm run build:web` —
 * c'est pdf.js, que le lecteur charge à la demande par un chemin calculé. Le
 * parcours des imports ne peut pas le voir : il est nommé ici.
 */
export const TELS_QUELS = ["style.css", "assets/icons.svg", "assets/favicon.svg", "vendor/unpdf"];

/**
 * Les chemins qu'un module importe, tels qu'ils sont écrits.
 *
 * Seuls les chemins **relatifs** comptent : un import qui commence par `http`
 * est chargé par le navigateur, et n'a rien à emporter.
 */
export function cheminsImportes(source = "") {
  const trouves = [];
  const formes = [
    /(?:^|\n)\s*(?:import|export)[\s\S]*?\sfrom\s*["']([^"']+)["']/g,
    /(?:^|\n)\s*import\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g
  ];

  for (const forme of formes) {
    for (const trouve of String(source).matchAll(forme)) {
      if (trouve[1].startsWith(".")) trouves.push(trouve[1]);
    }
  }

  return [...new Set(trouves)];
}

/**
 * Ce chemin sort-il de `apps/web` ?
 *
 * La comparaison se fait sur le chemin **résolu**, et non sur ce qui est
 * écrit : `../../../supabase/functions/...` et une suite de `..` habilement
 * repliée mènent au même endroit, et seule la résolution le voit.
 */
export function horsDuSite(relatif = "") {
  const normalise = path.normalize(relatif).split(path.sep).join("/");
  return normalise.startsWith("..") || path.isAbsolute(relatif);
}

/** Tous les modules à emporter, racines comprises, sans doublon. */
export async function lesModulesAEmporter(lire, racines = RACINES) {
  const aEmporter = [];
  const vus = new Set();
  const aFaire = [...racines];

  while (aFaire.length) {
    const relatif = aFaire.shift();
    if (vus.has(relatif)) continue;
    if (horsDuSite(relatif)) {
      throw new Error(`« ${relatif} » sort de apps/web : la console ne l'emporte pas.`);
    }
    vus.add(relatif);
    aEmporter.push(relatif);

    const source = await lire(relatif);
    for (const importe of cheminsImportes(source)) {
      aFaire.push(path.normalize(path.join(path.dirname(relatif), importe))
        .split(path.sep).join("/"));
    }
  }

  return aEmporter;
}

async function main() {
  const lire = (relatif) => readFile(path.join(webDir, relatif), "utf8");
  const modules = await lesModulesAEmporter(lire);

  await rm(partageDir, { recursive: true, force: true });

  for (const relatif of [...modules, ...TELS_QUELS]) {
    const source = path.join(webDir, relatif);
    if (!existsSync(source)) {
      throw new Error(
        `« ${relatif} » manque dans apps/web. Lancer « npm run build:web » avant la console.`
      );
    }
    const destination = path.join(partageDir, relatif);
    await mkdir(path.dirname(destination), { recursive: true });
    // `recursive` : certains emportés sont des dossiers (pdf.js et ses fichiers).
    await cp(source, destination, { recursive: true });
  }

  // De quoi lire, dans un diff, ce que la console a fini par emporter. Une
  // dépendance qui enfle sans qu'on la voie est une dépendance qu'on ne
  // rediscute jamais.
  await writeFile(
    path.join(partageDir, "ce-qui-est-emporte.txt"),
    `${modules.sort().join("\n")}\n`,
    "utf8"
  );

  console.log(`console: ${modules.length} modules emportés depuis apps/web`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((erreur) => {
    console.error(erreur.message);
    process.exitCode = 1;
  });
}
