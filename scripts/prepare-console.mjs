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
  // Les icônes de Mdall, pour l'avatar du retour. Le même passage que la barre
  // du haut, et la même feuille de sprites.
  "js/ui/icons.js",
  // Les comptes du carburant : des nombres, jamais un contenu. La fonction de
  // base ne rend ni objet, ni adresse, ni nom de chantier.
  "js/services/les-comptes-du-carburant-supabase.js",
  // Ce que ces nombres veulent dire : les tranches, le seuil, les phrases. Pur,
  // et il n'entraîne qu'un formatage de poids — c'est pour cela que `poidsDit`
  // a quitté l'inventaire du versoir, que la console ne doit pas emporter.
  "js/services/les-comptes-du-carburant.js",
  // Les domaines que le système reconnaît, sur l'ensemble des chantiers. Un mot
  // d'un vocabulaire fermé de huit et des nombres — pas le contenu d'où il a
  // été tiré. C'est ce qui permet de dire si la classification progresse, ce
  // qu'aucun taux de précision ne dit.
  "js/services/les-domaines-du-systeme-supabase.js",
  "js/services/les-domaines-du-systeme.js",
  // Le vocabulaire lui-même, pour nommer les domaines comme partout ailleurs et
  // pour savoir lesquels n'ont jamais été reconnus. Il ne classe rien ici : on
  // ne lui donne aucun texte, seulement des clés déjà écrites en base.
  "js/services/assertion-taxonomy.js",
  // Les onglets de la console : la même barre que côté utilisateur, nommée une
  // seule fois. Pur, et il n'entraîne rien.
  "js/services/les-onglets-de-la-console.js",
  // Ce que fait la prédiction : quels domaines en suivent d'autres, combien de
  // fois, avec quelle probabilité. Le mécanisme de `ceQuiSuitHabituellement`,
  // compté sur l'ensemble des chantiers — ce qu'aucun écran de projet ne peut
  // montrer, puisqu'un chantier ne voit que lui-même.
  "js/services/les-enchainements-du-systeme-supabase.js",
  "js/services/les-enchainements-du-systeme.js",
  // Les sujets techniques que les chantiers emploient vraiment : des milliers
  // de termes trouvés dans ce qu'ils écrivent, là où la taxonomie n'a que huit
  // cases. Rien n'en sort qui ne soit partagé par plusieurs chantiers.
  "js/services/les-sujets-du-systeme-supabase.js",
  "js/services/les-sujets-du-systeme.js",
  // Les idées que les chantiers énoncent : ce qui entraîne quoi. Le découpage
  // se fait en base, sur les mots de liaison ; ce qui vient ici est la forme
  // d'une idée — deux termes partagés et une sorte de lien —, et la composition
  // de deux idées qui se touchent, qu'aucune requête ne saurait faire.
  "js/services/les-idees-du-systeme-supabase.js",
  "js/services/une-idee.js",
  "js/services/un-raisonnement.js",
  // Combien de phrases distinctes dans les affirmations, et d'où viennent les
  // copies. C'est le dénominateur de tout ce que la console annonce : mille
  // affirmations lues, quatre-vingt-quatorze textes distincts.
  "js/services/la-repetition-du-corpus.js",
  // ── L'onglet Utilisateurs ───────────────────────────────────────────────
  //
  // Les comptes de Mdall : un nom, une adresse, des noms de chantier, des
  // nombres et des dates. **Le premier écran de la console qui nomme des
  // personnes** — et le premier qui se journalise, parce que la base journalise
  // chacune de ses trois lectures avant de répondre.
  //
  // Il n'emporte aucun contenu : la fonction de base ne rend ni conversation du
  // copilote, ni message de sujet, ni affirmation, ni texte de document. Une
  // épreuve lit ces modules et refuse ces noms.
  "js/services/les-comptes-de-mdall-supabase.js",
  "js/services/les-comptes-de-mdall.js",
  // Ce que l'IA a coûté à un compte, mis en euros par **le même** module que
  // l'écran de l'utilisateur. Un second barème pour la console aurait divergé de
  // la facture au premier tarif relevé (règle 4) — et c'est précisément le
  // chiffre qu'on vient vérifier ici.
  "js/views/consommation/ecran-de-consommation.js",
  "js/views/ui/le-choix-de-la-periode.js",
  // ── L'onglet Exploitation ───────────────────────────────────────────────
  //
  // La santé des systèmes, lue dans **nos propres traces** : le dernier appel
  // abouti, le dernier octet rangé, la dernière ligne de file prise, et les
  // refus par genre. Pas une page d'état de fournisseur — celle-ci est verte
  // quand notre clé est révoquée.
  //
  // Le verdict est pur, et c'est ce qui permet d'écrire « aucune trace » à
  // l'envers dans une épreuve : une absence ne doit jamais se lire
  // « tout va bien ».
  "js/services/la-sante-des-systemes.js",
  // Le stockage, les documents par chantier, les venues, et le journal des
  // consultations. Des octets, des comptes, des dates, des noms de casier et de
  // page de console — **jamais un nom de fichier**. La cloison le vérifie.
  "js/services/lexploitation-de-mdall.js",
  "js/services/lexploitation-de-mdall-supabase.js",
  // Les genres de panne et leurs remèdes, pris là où l'écran de l'utilisateur
  // les prend déjà : deux listes auraient fini par conseiller deux gestes
  // différents pour la même panne (règle 4).
  "js/services/journal-des-refus.js",
  // Le tableau de partout, sa pagination et sa barre d'outils : rien n'est
  // dessiné pour la console.
  "js/views/ui/data-table-shell.js",
  "js/views/ui/pagination.js",
  "js/views/ui/spinner.js",
  // La porte par laquelle les idées sortent de la console : des comptes et des
  // termes, jamais une phrase de chantier. Elle est fermée par défaut.
  "js/services/lexport-des-idees.js",
  "js/services/la-porte-du-developpement.js",
  // Le bouton de copie commun, avec son retour — sans lui, on reclique trois
  // fois sans savoir si la copie a eu lieu.
  "js/views/ui/bouton-copier.js",
  // Les rubriques de la console : une question par rubrique, et l'ordre de la
  // chaîne. Pur, et il n'entraîne rien.
  "js/services/les-rubriques-de-la-console.js",
  // Le rail commun, celui des Sujets, de la Mémoire et des Actions. La console
  // posait sept blocs à la suite sur une seule page ; elle emploie maintenant
  // la même coque que les écrans de projet, plutôt qu'une navigation à elle qui
  // divergerait au premier réglage (règle 4).
  "js/views/ui/project-rail.js",
  "js/views/ui/nav-list.js",
  "js/views/ui/titre-decran.js"
];

/**
 * Cette liste a perdu dix lignes d'un coup, et c'est la mesure de ce tour.
 *
 * Elle portait `un-msg-deplie`, `un-zip-deplie`, `le-convoi`,
 * `linventaire-du-versoir`, `episode-dune-archive`, les deux archives, la ligne
 * de base, la mesure du passé, le tableau de la forme et **le lecteur de PDF**.
 * Autrement dit : la moitié des services de l'application, dans une page dont
 * tout l'intérêt était de ne rien pouvoir atteindre.
 *
 * Personne ne l'avait décidé. Chaque ligne s'était ajoutée pour une bonne
 * raison, et l'ensemble avait fini par faire une seconde application. C'est
 * exactement ce que cette liste devait rendre visible, et elle l'a rendu
 * visible — un tour trop tard.
 */

/**
 * Ce qui part tel quel, sans être suivi : ni import ni dépendance.
 *
 * `vendor/unpdf` n'y est plus : il n'y était que pour le lecteur de PDF de
 * l'archive, et pdf.js pèse à lui seul plus que tout le reste de la console.
 */
export const TELS_QUELS = ["style.css", "assets/icons.svg", "assets/favicon.svg"];

/**
 * Ce qui doit atterrir **à la racine de la console**, et pas dans `partage/`.
 *
 * `svgIcon` résout la feuille de sprites contre la page (`assets/icons.svg`,
 * dans `js/ui/icons.js`), pas contre son propre module : depuis
 * `apps/console/index.html`, elle est donc attendue à côté de la page. La
 * corriger dans `icons.js` aurait cassé l'application, où le chemin est juste.
 *
 * Une copie, donc, et une seule source : le fichier de `apps/web`. Deux
 * sprites entretenus à la main auraient fini par ne plus porter les mêmes
 * icônes (règle 4).
 */
export const A_LA_RACINE = ["assets/icons.svg", "assets/images/260093543.png"];

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
  await rm(path.join(consoleDir, "assets"), { recursive: true, force: true });

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

  for (const relatif of A_LA_RACINE) {
    const destination = path.join(consoleDir, relatif);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(webDir, relatif), destination, { recursive: true });
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
