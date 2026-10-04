/**
 * **La console ne peut pas lire un contenu.** On le vérifie sur le texte.
 *
 * ## Pourquoi une épreuve sur la source, ici et pratiquement nulle part ailleurs
 *
 * Les épreuves qui relisent du code comme du texte ne valent en général rien :
 * un fichier peut contenir tous les bons mots et lever à l'exécution. Il y a une
 * exception, et `docs/la-console-de-ladministrateur.md` (§ 3) la nomme :
 *
 * > « Cela se vérifie par une épreuve qui lit la source et **refuse ces noms de
 * >   tables**. C'est le cas précis où une épreuve sur le texte du code vaut
 * >   quelque chose : un défaut invisible, qu'aucun résultat ne trahit. »
 *
 * Et il est vraiment invisible : une console qui lirait une conversation privée
 * marcherait parfaitement. Aucun test de comportement ne tomberait, aucune page
 * ne s'afficherait de travers. Le seul moment où l'on s'en apercevrait est le
 * jour où quelqu'un le découvre — et ce jour-là, le produit est discrédité.
 *
 * ## Ce qu'elle lit
 *
 * La migration des comptes, les deux modules que la console emporte pour eux, et
 * le parcours réel de ses imports. Pas une liste écrite à la main : ce que le
 * build emporte pour de bon.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { RACINES, lesModulesAEmporter } from "../../../../scripts/prepare-console.mjs";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..", "..", "..", "..");
const WEB = join(RACINE, "apps", "web");
const CONSOLE = join(RACINE, "apps", "console");

const lire = (chemin) => readFileSync(chemin, "utf8");

/**
 * Les tables et colonnes de **contenu**, que la console ne lit jamais.
 *
 * Elles sont nommées ici, une fois : la liste de § 3 recopiée dans deux épreuves
 * aurait fini par en oublier une du côté qu'on ne relit pas (règle 10).
 */
const CE_QUI_NE_TRAVERSE_PAS = [
  // La promesse absolue du produit : interdiction totale de partager une
  // conversation avec le copilote. Un administrateur n'est pas une exception,
  // c'est le cas le plus dangereux.
  "copilot_conversations",
  "copilot_messages",
  // Les échanges entre collaborateurs sur un sujet.
  "subject_messages",
  // Le contenu de la mémoire : ce qu'une affirmation énonce, son détail, sa
  // charge. Les comptes d'affirmations, eux, traversent — pas leur texte.
  "project_assertions",
  // Les lectures conservées : un compte rendu entier, un fil de mails avec qui
  // a écrit quoi à qui, le verdict d'un bureau de contrôle.
  "cr_lectures",
  "fil_lectures",
  "rapport_lectures",
  // Le dossier des mails, privé par construction.
  "mail_depose",
  "piece_de_mail"
];

/**
 * **L'exception, nommée.**
 *
 * `le_corpus_en_clair` **est** du contenu de chantier, et la console le lit.
 * C'est une exception explicitement autorisée, pour la mise au point du
 * découpage des idées : on ne peut pas régler une coupe sans voir les phrases
 * qu'elle coupe. Elle a sa règle à elle — une porte de développement, ouverte dix
 * secondes — et c'est la raison pour laquelle elle ne figure pas dans la liste
 * ci-dessus.
 *
 * **Elle y est nommée quand même, et c'est le point** : une exception qu'on
 * oublie de nommer n'en est plus une — c'est un trou. Si une seconde apparaissait
 * sans être écrite ici, l'épreuve tomberait, et c'est exactement ce qu'on veut.
 */
const LEXCEPTION_AUTORISEE = ["le_corpus_en_clair"];

/** Ce que la migration des comptes a le droit de nommer, et elle seule. */
const LA_MIGRATION = join(RACINE, "supabase", "migrations", "202611220001_les_comptes_de_mdall.sql");

/**
 * Le SQL sans ses commentaires.
 *
 * **Les commentaires doivent pouvoir nommer ces tables**, et c'est même
 * nécessaire : une migration qui ne dirait pas ce qu'elle refuse de lire ne se
 * relit pas. Ce qui compte est ce que PostgreSQL exécute.
 */
function duSqlSansCommentaires(texte) {
  return texte
    .split("\n")
    .map((ligne) => ligne.replace(/--.*$/, ""))
    .join("\n");
}

/** Le JavaScript sans ses commentaires, par la même raison. */
function duCodeSansCommentaires(texte) {
  return texte
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .map((ligne) => ligne.replace(/(^|[^:])\/\/.*$/, "$1"))
    .join("\n");
}

/* ── La migration ─────────────────────────────────────────────────────────── */

test("les fonctions des comptes ne nomment aucune table de contenu", () => {
  const sql = duSqlSansCommentaires(lire(LA_MIGRATION));

  for (const interdit of CE_QUI_NE_TRAVERSE_PAS) {
    assert.doesNotMatch(sql, new RegExp(`\\b${interdit}\\b`),
      `la migration des comptes touche à « ${interdit} » : la console lirait un contenu`);
  }

  // Les colonnes de contenu de la mémoire, nommément : `project_assertions` est
  // déjà refusée, mais un jour une vue portera ces noms.
  for (const colonne of ["statement", "payload"]) {
    assert.doesNotMatch(sql, new RegExp(`\\b${colonne}\\b`),
      `la migration lit « ${colonne} » : c'est du contenu de mémoire`);
  }
});

/**
 * **Chaque fonction vérifie la porte, et chacune journalise.**
 *
 * Une fonction `security definer` sans sa porte rend l'annuaire des comptes à
 * toute session authentifiée. Et une fonction qui ne journalise pas laisse un
 * trou dans le journal — le seul document qu'un client, ou son délégué à la
 * protection des données, demandera.
 */
test("chaque fonction de la console passe par la porte qui journalise", () => {
  const sql = lire(LA_MIGRATION);

  const fonctions = [...sql.matchAll(/create or replace function public\.(\w+)/g)]
    .map((un) => un[1]);
  assert.deepEqual(fonctions, [
    "la_porte_de_la_console",
    "les_comptes_de_mdall",
    "le_compte_de_mdall",
    "la_consommation_dun_compte"
  ]);

  // La porte elle-même vérifie `est_administrateur()` ; les trois autres
  // l'appellent, et c'est elle qui refuse et qui écrit.
  const appels = (sql.match(/perform public\.la_porte_de_la_console\(/g) ?? []).length;
  assert.equal(appels, 3, "une fonction de la console ne journalise pas son accès");

  // **Aucune n'est `stable`.** Déclarée ainsi, elle tournerait en lecture seule
  // et Postgres refuserait l'insertion du journal : l'écran marcherait, le
  // journal serait vide. C'est la panne silencieuse que ce journal existe pour
  // ne pas avoir.
  const apresLaPorte = sql.slice(sql.indexOf("les_comptes_de_mdall"));
  assert.doesNotMatch(apresLaPorte, /^stable$/m,
    "une fonction qui journalise est déclarée stable : son journal restera vide");

  // **Et aucune n'est ouverte à la clé anonyme.** Celle qui est dans le code de
  // la page, lisible par quiconque ouvre les outils de développement.
  //
  // Chercher « to anon » ne suffisait pas : « to authenticated, anon » passait
  // à travers, et c'est précisément la forme qu'on écrit sans y penser. On
  // regarde donc chaque octroi, et ce qu'il nomme.
  for (const octroi of sql.match(/grant execute on function[^;]*/g) ?? []) {
    const aQui = octroi.slice(octroi.lastIndexOf(" to ") + 4).split(",").map((un) => un.trim());
    assert.deepEqual(aQui, ["authenticated"],
      `une fonction de la console est accordée à ${aQui.join(", ")}`);
  }
});

/**
 * **Le journal ne se lit pas depuis un navigateur.**
 *
 * Un journal des accès que son sujet peut relire est un journal qu'il peut
 * vérifier avant d'effacer. La table n'a donc aucune politique — ni de lecture,
 * ni d'écriture : la base y écrit par une fonction `security definer`, et on la
 * consulte avec les clés.
 */
test("le journal des accès n'a aucune politique", () => {
  const sql = lire(LA_MIGRATION);

  assert.match(sql, /alter table public\.acces_administrateurs enable row level security/);
  const politiques = [...sql.matchAll(/create policy[^;]*on public\.(\w+)/g)].map((un) => un[1]);
  assert.deepEqual(politiques, [],
    "la migration pose une politique : le journal deviendrait lisible, ou falsifiable");
});

/* ── Ce que la console emporte ────────────────────────────────────────────── */

test("les deux modules des comptes ne nomment aucune table de contenu", () => {
  for (const nom of ["les-comptes-de-mdall.js", "les-comptes-de-mdall-supabase.js"]) {
    const source = duCodeSansCommentaires(lire(join(WEB, "js", "services", nom)));
    for (const interdit of CE_QUI_NE_TRAVERSE_PAS) {
      assert.doesNotMatch(source, new RegExp(`\\b${interdit}\\b`),
        `${nom} touche à « ${interdit} »`);
    }
  }
});

/**
 * **Le module pur ne parle pas à la base, et celui qui lui parle ne décide
 * rien.**
 *
 * C'est le découpage de tout le projet, et il a une conséquence précise ici :
 * ce qui est éprouvé sans réseau est tout ce qui décide, et ce qui n'est pas
 * éprouvable ne fait que des allers-retours.
 */
test("le module des comptes ne lit rien, et sa porte ne décide rien", () => {
  const pur = duCodeSansCommentaires(lire(join(WEB, "js", "services", "les-comptes-de-mdall.js")));
  assert.doesNotMatch(pur, /\bfetch\s*\(/, "aucun appel réseau");
  assert.doesNotMatch(pur, /supabase/i, "aucun accès à la base");

  const porte = lire(join(WEB, "js", "services", "les-comptes-de-mdall-supabase.js"));
  const appels = [...porte.matchAll(/supabase\.rpc\("([^"]+)"/g)].map((un) => un[1]);
  assert.deepEqual([...appels].sort(),
    ["la_consommation_dun_compte", "le_compte_de_mdall", "les_comptes_de_mdall"],
    "la porte des comptes appelle autre chose que ses trois fonctions");

  // **Elle ne touche aucune table en direct.** Les trois fonctions vérifient la
  // porte et journalisent ; une lecture par `.from()` les contournerait toutes
  // les deux.
  assert.doesNotMatch(porte, /\.from\(/,
    "la porte des comptes lit une table en direct : ni porte, ni journal");
});

/**
 * **Et le parcours réel des imports, pas une liste écrite à la main.**
 *
 * C'est ce que le build emporte pour de bon. Un module de contenu qui entrerait
 * par un import transitif ne se verrait nulle part ailleurs.
 */
test("rien de ce que la console emporte ne nomme une table de contenu", async () => {
  const lireDuSite = (relatif) => readFileSync(join(WEB, relatif), "utf8");
  const emportes = await lesModulesAEmporter(lireDuSite, RACINES);

  for (const relatif of emportes) {
    const source = duCodeSansCommentaires(lire(join(WEB, relatif)));
    for (const interdit of CE_QUI_NE_TRAVERSE_PAS) {
      assert.doesNotMatch(source, new RegExp(`\\b${interdit}\\b`),
        `la console emporte ${relatif}, qui touche à « ${interdit} »`);
    }
  }
});

/**
 * **L'exception reste une exception : une seule, et nommée.**
 *
 * Le corpus en clair est du contenu, et la console le lit — pour la mise au
 * point du découpage des idées, derrière une porte de développement ouverte dix
 * secondes. Ce qui la rend tenable est qu'elle soit **la seule**, et qu'on
 * sache où elle est. Une seconde exception qui s'ajouterait sans être écrite
 * ici ferait tomber cette épreuve, et c'est tout l'intérêt.
 */
test("le contenu que la console lit se compte sur les doigts, et il est nommé", async () => {
  const lireDuSite = (relatif) => readFileSync(join(WEB, relatif), "utf8");
  const emportes = await lesModulesAEmporter(lireDuSite, RACINES);

  const ou = new Map();
  for (const relatif of emportes) {
    const source = duCodeSansCommentaires(lire(join(WEB, relatif)));
    for (const exception of LEXCEPTION_AUTORISEE) {
      if (new RegExp(`\\b${exception}\\b`).test(source)) {
        ou.set(exception, [...(ou.get(exception) ?? []), relatif]);
      }
    }
  }

  // Elle est bien là : une épreuve qui ne la trouverait plus dirait que la
  // porte a été retirée, ce qui se décide, pas se constate.
  assert.deepEqual([...ou.keys()], LEXCEPTION_AUTORISEE,
    "l'exception nommée n'est plus emportée : l'a-t-on retirée exprès ?");
  assert.deepEqual(ou.get("le_corpus_en_clair"), ["js/services/les-idees-du-systeme-supabase.js"],
    "le corpus en clair est lu depuis un autre module que celui qu'on surveille");
});

/**
 * **Et le site construit non plus.**
 *
 * Le parcours des imports dit ce qui *devrait* être emporté ; le dossier dit ce
 * qui *l'est*. Un fichier resté là d'un tour précédent ne se verrait que là.
 */
test("le site construit de la console ne nomme aucune table de contenu", () => {
  const fichiers = [];
  const descendre = (ou) => {
    for (const nom of readdirSync(ou)) {
      const chemin = join(ou, nom);
      if (statSync(chemin).isDirectory()) descendre(chemin);
      else if (/\.(js|mjs|html)$/.test(nom)) fichiers.push(chemin);
    }
  };
  descendre(CONSOLE);

  // **Le build dépose `partage/`, et `pretest` le fait tourner.** Sans lui,
  // cette épreuve ne regarderait que cinq fichiers et passerait pour verte —
  // c'est pour cela qu'elle compte d'abord ce qu'elle a sous les yeux.
  //
  // C'est aussi ce qui l'a fait tomber en intégration continue : les épreuves y
  // tournent **avant** les constructions, et `npm run build:console` n'avait
  // donc pas eu lieu. Le dossier étant un produit de construction (il n'est pas
  // dans le dépôt), c'est à `pretest` de le poser, comme il pose déjà les
  // utilitaires et les modules descendus dont d'autres épreuves dépendent.
  assert.ok(fichiers.length > 20,
    `le site de la console n'a que ${fichiers.length} fichiers : « npm run build:console » n'a pas tourné`);

  for (const chemin of fichiers) {
    const source = duCodeSansCommentaires(lire(chemin));
    for (const interdit of CE_QUI_NE_TRAVERSE_PAS) {
      assert.doesNotMatch(source, new RegExp(`\\b${interdit}\\b`),
        `${chemin.slice(RACINE.length + 1)} touche à « ${interdit} »`);
    }
  }
});
