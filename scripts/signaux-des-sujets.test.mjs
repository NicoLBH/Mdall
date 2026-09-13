import test, { after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync, chmodSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * `project_subject_signals`, **rejouée sur un vrai Postgres**.
 *
 * ## Pourquoi ce test existe sous cette forme
 *
 * Le calcul des signaux d'un sujet — quand il a bougé, et qui y est nommé avec
 * un `@` — vit en base, parce que le faire dans le navigateur obligeait à
 * rapatrier le corps de tous les messages du projet. Une règle qui déménage
 * n'emporte pas ses tests toute seule : écrite en SQL, elle échapperait à la
 * suite, et l'on retomberait exactement dans ce qui a coûté deux tours sur cet
 * écran — un filtre qui ne rend rien, et rien qui échoue.
 *
 * Le dépôt n'a pas de base, mais la machine qui exécute les tests a un
 * PostgreSQL. On en démarre donc un **jetable**, on y pose un décor minimal, on
 * y applique la migration telle quelle, et l'on appelle la fonction. C'est la
 * vraie fonction, sur un vrai moteur, avec les vrais accents.
 *
 * ## Quand il ne peut pas s'exécuter
 *
 * Sans binaire PostgreSQL, il **se saute en le disant**. Un test qui prétendrait
 * passer sans avoir rien exécuté serait pire que pas de test du tout — c'est la
 * leçon des tours précédents. Le nom du saut porte la raison.
 */

const ICI = fileURLToPath(new URL(".", import.meta.url));
const MIGRATION = join(ICI, "../supabase/migrations/202609290001_signaux_des_sujets.sql");
const DECOR = join(ICI, "fixtures/signaux-des-sujets.sql");

const PROJET = "11111111-1111-1111-1111-111111111111";
const SUJET = {
  CLOISON: "33333333-0000-0000-0000-000000000001",
  CHAPE: "33333333-0000-0000-0000-000000000002",
  CARRELAGE: "33333333-0000-0000-0000-000000000003",
  ETANCHEITE: "33333333-0000-0000-0000-000000000004"
};
const PERSONNE = {
  CAMILLE: "22222222-0000-0000-0000-000000000001",
  DOMINIQUE: "22222222-0000-0000-0000-000000000002"
};

/** Le dossier des binaires du serveur, ou `""`. */
function binairesDePostgres() {
  const racine = "/usr/lib/postgresql";
  if (existsSync(racine)) {
    const versions = readdirSync(racine).sort().reverse();
    for (const version of versions) {
      const bin = join(racine, version, "bin");
      if (existsSync(join(bin, "initdb"))) return bin;
    }
  }

  try {
    const bin = execFileSync("pg_config", ["--bindir"], { encoding: "utf8" }).trim();
    if (bin && existsSync(join(bin, "initdb"))) return bin;
  } catch {
    // Pas de `pg_config` : il n'y a pas de serveur ici, et c'est une réponse.
  }

  return "";
}

/**
 * `initdb` refuse de tourner en root — et il a raison. Là où l'on est root, on
 * passe par le compte `postgres`, qui existe avec le paquet.
 */
const EN_ROOT = typeof process.getuid === "function" && process.getuid() === 0;

function lancer(commande, args, options = {}) {
  if (!EN_ROOT) return execFileSync(commande, args, { encoding: "utf8", ...options });

  const ligne = [commande, ...args].map((morceau) => `'${String(morceau).replace(/'/g, "'\\''")}'`).join(" ");
  return execFileSync("su", ["postgres", "-c", ligne], { encoding: "utf8", ...options });
}

let socle = null;
let saut = "";

try {
  const bin = binairesDePostgres();
  if (!bin) throw new Error("aucun binaire PostgreSQL sur cette machine");

  const base = mkdtempSync(join(tmpdir(), "mdall-signaux-"));
  // Le compte `postgres` doit pouvoir y écrire, et lire les deux fichiers SQL.
  if (EN_ROOT) execFileSync("chown", ["-R", "postgres:postgres", base]);

  const donnees = join(base, "data");
  // Un port improbable plutôt que 5432 : on ne veut ni gêner un serveur déjà
  // là, ni lui parler par mégarde.
  const port = String(54000 + (process.pid % 1000));

  lancer(join(bin, "initdb"), ["-D", donnees, "-U", "postgres", "--auth=trust"], { stdio: "ignore" });
  lancer(join(bin, "pg_ctl"), [
    "-D", donnees, "-l", join(base, "journal"), "-w", "start",
    // Uniquement une prise locale : ce serveur n'écoute personne d'autre.
    "-o", `-k ${base} -h "" -p ${port}`
  ], { stdio: "ignore" });

  socle = { bin, base, port };

  const psql = (args) => lancer(join(bin, "psql"), [
    "-h", base, "-p", port, "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-q", ...args
  ], { stdio: "pipe" });

  psql(["-c", "create database essai;"]);

  // Les deux fichiers sont copiés dans le dossier du serveur : `postgres` n'a
  // pas de raison de pouvoir lire le dépôt.
  for (const source of [DECOR, MIGRATION]) {
    const cible = join(base, source.split("/").pop());
    copyFileSync(source, cible);
    chmodSync(cible, 0o644);
    psql(["-d", "essai", "-f", cible]);
  }
} catch (erreur) {
  saut = `pas de PostgreSQL utilisable ici : ${String(erreur?.message || erreur).split("\n")[0]}`;
  socle = null;
}

after(() => {
  if (!socle) return;
  try {
    lancer(join(socle.bin, "pg_ctl"), ["-D", join(socle.base, "data"), "-m", "immediate", "stop"], { stdio: "ignore" });
  } catch {
    // Le serveur est déjà tombé : il n'y a rien à arrêter.
  }
  rmSync(socle.base, { recursive: true, force: true });
});

/** Les signaux du projet du décor, par sujet. */
function signaux() {
  const sortie = lancer(join(socle.bin, "psql"), [
    "-h", socle.base, "-p", socle.port, "-U", "postgres", "-d", "essai",
    "-A", "-F", "|", "-t", "-c",
    `select subject_id, last_activity_at, mention_person_ids
     from public.project_subject_signals('${PROJET}') order by subject_id;`
  ], { stdio: "pipe" });

  const par = {};
  for (const ligne of sortie.split("\n").map((dite) => dite.trim()).filter(Boolean)) {
    const [sujet, quand, nommees] = ligne.split("|");
    par[sujet] = {
      quand,
      nommees: nommees.replace(/^\{|\}$/g, "").split(",").map((dit) => dit.trim()).filter(Boolean)
    };
  }
  return par;
}

const options = () => (saut ? { skip: saut } : {});

/**
 * **Le `@` tapé au clavier, sans l'accent que porte le nom.** La table des
 * mentions ne porte que celles choisies dans la liste de complétion ; c'est le
 * cas propre, et ce n'est pas le cas courant.
 *
 * Ici seul le nom de famille est écrit, et il est écrit sans son accent : rien
 * d'autre ne peut désigner cette personne, et c'est ce qui met le pli à
 * l'épreuve des deux côtés.
 */
test("un nom de famille écrit sans son accent est trouvé", options(), () => {
  assert.deepEqual(signaux()[SUJET.CLOISON].nommees, [PERSONNE.DOMINIQUE]);
});

/** Le nom complet en capitales : on ne tape jamais deux fois la même casse. */
test("un nom complet écrit en capitales est trouvé", options(), () => {
  assert.deepEqual(signaux()[SUJET.ETANCHEITE].nommees, [PERSONNE.CAMILLE]);
});

/**
 * Le prénom seul est accepté : sur un projet, « @camille » désigne quelqu'un
 * pour tout le monde, et le refuser ne trouverait rien dans neuf textes sur dix.
 */
test("une mention écrite dans un commentaire, par le prénom, est trouvée", options(), () => {
  assert.deepEqual(signaux()[SUJET.CHAPE].nommees, [PERSONNE.CAMILLE]);
});

/**
 * **L'arobase est exigée.** Chercher le nom seul retiendrait tout sujet qui
 * parle de quelqu'un, et une lecture qui remonte cela ne se distingue plus de
 * la recherche par mot.
 */
test("un nom sans arobase n'est pas une mention", options(), () => {
  assert.deepEqual(signaux()[SUJET.CARRELAGE].nommees, []);
});

/**
 * Les échanges avec le copilote sont privés par construction, et un message
 * effacé n'existe plus. Ni l'un ni l'autre ne doit dater un sujet ni y nommer
 * quelqu'un — le décor en porte un de chaque sur le même sujet.
 */
test("ni l'éphémère ni l'effacé ne comptent", options(), () => {
  const sien = signaux()[SUJET.CARRELAGE];

  assert.deepEqual(sien.nommees, [], "un message effacé ou éphémère a nommé quelqu'un");
  assert.match(sien.quand, /^2026-01-03/, "un message effacé ou éphémère a daté le sujet");
});

/** Un commentaire fait bouger un sujet dont la ligne n'a pas changé. */
test("un commentaire date le sujet", options(), () => {
  assert.match(signaux()[SUJET.CHAPE].quand, /^2026-03-10/);
});

/** Un événement métier aussi : c'est arrivé au sujet, donc il a bougé. */
test("un événement métier date le sujet", options(), () => {
  assert.match(signaux()[SUJET.CLOISON].quand, /^2026-04-20/);
});

/** Un projet ne voit pas les sujets d'un autre, ni ses personnes. */
test("la fonction ne sort pas de son projet", options(), () => {
  const par = signaux();

  assert.deepEqual(Object.keys(par).sort(),
    [SUJET.CLOISON, SUJET.CHAPE, SUJET.CARRELAGE, SUJET.ETANCHEITE].sort());
});
