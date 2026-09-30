/**
 * Un PostgreSQL jetable, le temps d'une épreuve.
 *
 * ## Pourquoi il a fallu en arriver là
 *
 * Deux migrations de suite ont été refusées **au déploiement**, c'est-à-dire au
 * seul moment où l'on ne peut plus rien corriger tranquillement :
 *
 *   * `delete from storage.objects` — Supabase l'interdit (SQLSTATE 42501) ;
 *   * `min(uuid)` — cette fonction n'existe pas (SQLSTATE 42883).
 *
 * Aucune épreuve ne pouvait les voir : nos épreuves lisent le SQL **comme du
 * texte**. Un texte ne dit pas si une fonction existe. Il n'y a qu'une façon de
 * savoir si du SQL tient : le donner à un PostgreSQL.
 *
 * Et il y a plus grave que la syntaxe. Une politique de sécurité est une
 * **affirmation sur qui voit quoi** ; la relire ne la vérifie pas. C'est
 * exactement ce qui s'est passé : `projects_owner_only` était écrite, juste, et
 * n'a jamais rien restreint pendant cinq mois parce qu'une porte ouverte vivait
 * à côté. Personne ne pouvait le voir en lisant — il fallait *essayer d'entrer*.
 *
 * ## Ce que ce module fait, et ce qu'il refuse de faire
 *
 * Il démarre un serveur dans un dossier temporaire, rend de quoi lui parler, et
 * l'efface. Il n'y a **rien à installer** : si PostgreSQL n'est pas là, il le
 * dit et l'épreuve se saute — une épreuve qui échoue faute d'outil apprend à
 * ignorer les échecs.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readdirSync } from "node:fs";

/** Où Debian et Ubuntu rangent les binaires, une version par dossier. */
function lesBinairesDePostgres() {
  const racine = "/usr/lib/postgresql";
  if (!existsSync(racine)) return "";
  const versions = readdirSync(racine)
    .filter((une) => /^\d+$/.test(une))
    .sort((gauche, droite) => Number(droite) - Number(gauche));
  for (const version of versions) {
    const bin = join(racine, version, "bin");
    if (existsSync(join(bin, "initdb"))) return bin;
  }
  return "";
}

/**
 * **Un serveur ne tourne pas en root, et il a raison.**
 *
 * Le conteneur où ces épreuves passent est en root ; la machine d'un
 * développeur ne l'est pas. On emprunte donc le compte `postgres` quand il le
 * faut, et l'on reste soi-même sinon.
 */
function commentLancer(bin, commande, arguments_ = []) {
  const enRoot = typeof process.getuid === "function" && process.getuid() === 0;
  if (!enRoot) return { fichier: join(bin, commande), arguments_ };

  const ligne = [join(bin, commande), ...arguments_]
    .map((un) => `'${String(un).replace(/'/g, "'\\''")}'`).join(" ");
  return { fichier: "su", arguments_: ["postgres", "-c", ligne] };
}

/**
 * Un serveur prêt à recevoir du SQL, ou `null` si la machine n'en a pas.
 *
 * @returns {{sql: Function, fermer: Function}|null}
 */
export function unPostgresJetable() {
  const bin = lesBinairesDePostgres();
  if (!bin) return null;

  const port = 5400 + (process.pid % 150);
  const dossier = mkdtempSync(join(tmpdir(), "banc-politiques-"));
  const donnees = join(dossier, "donnees");

  const lancer = ({ fichier, arguments_ }) =>
    spawnSync(fichier, arguments_, { encoding: "utf8" });

  try {
    if (typeof process.getuid === "function" && process.getuid() === 0) {
      execFileSync("chown", ["-R", "postgres:postgres", dossier]);
    }
    execFileSync("chmod", ["700", dossier]);

    const pose = lancer(commentLancer(bin, "initdb",
      ["-D", donnees, "-U", "postgres", "--auth=trust"]));
    if (pose.status !== 0) { rmSync(dossier, { recursive: true, force: true }); return null; }

    const demarre = lancer(commentLancer(bin, "pg_ctl", [
      "-D", donnees,
      "-o", `-k ${dossier} -p ${port} -c listen_addresses=`,
      "-l", join(donnees, "journal"),
      "-w", "start"
    ]));
    if (demarre.status !== 0) { rmSync(dossier, { recursive: true, force: true }); return null; }

    /**
     * Donner du SQL au serveur.
     *
     * **Il s'arrête à la première erreur** (`ON_ERROR_STOP`) : sans cela, une
     * instruction refusée au milieu d'une migration passerait inaperçue et la
     * suite mentirait sur ce qui a été posé.
     */
    const sql = (texte, { doitTenir = true } = {}) => {
      const rendu = spawnSync("psql", [
        "-h", dossier, "-p", String(port), "-U", "postgres",
        "-v", "ON_ERROR_STOP=1", "-q", "-A", "-t", "-f", "-"
      ], { input: texte, encoding: "utf8" });

      if (doitTenir && rendu.status !== 0) {
        throw new Error(`SQL refusé :\n${rendu.stderr || rendu.stdout}`);
      }
      return { ok: rendu.status === 0, sortie: (rendu.stdout || "").trim(), motif: (rendu.stderr || "").trim() };
    };

    /**
     * Éteindre et effacer, **une seule fois**, quoi qu'il arrive.
     *
     * ## Le défaut qu'on vient de voir
     *
     * Le serveur était éteint par `test.after`. Or l'épreuve pose le banc
     * **avant** ses tests — elle applique la migration au chargement du
     * module —, et une migration refusée fait tomber le fichier entier avant
     * qu'aucun `after` ne soit enregistré. Le serveur restait donc allumé, avec
     * son dossier, précisément dans le cas où l'on se sert du banc : quand
     * quelque chose ne va pas. Deux essais de suite en laissaient deux.
     *
     * Le départ du processus est le seul moment dont on soit sûr. `exit`
     * n'accepte que du synchrone : arrêter un serveur et effacer un dossier le
     * sont tous les deux.
     */
    let dejaFerme = false;
    const fermer = () => {
      if (dejaFerme) return;
      dejaFerme = true;
      lancer(commentLancer(bin, "pg_ctl", ["-D", donnees, "-m", "immediate", "stop"]));
      rmSync(dossier, { recursive: true, force: true });
    };

    process.on("exit", fermer);
    for (const signal of ["SIGINT", "SIGTERM"]) {
      // Un Ctrl-C ne doit pas laisser un serveur derrière lui non plus. On
      // repasse la main au comportement normal : couper court ici masquerait
      // l'interruption.
      process.once(signal, () => { fermer(); process.exit(130); });
    }

    return { sql, fermer };
  } catch {
    rmSync(dossier, { recursive: true, force: true });
    return null;
  }
}
