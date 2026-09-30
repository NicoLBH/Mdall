/**
 * **Les portes de la base, et ce qu'il en reste d'ouvert.**
 *
 * ## Le défaut que ce compte existe pour empêcher
 *
 * L'initialisation a posé, table par table, une politique qui dit « vrai » :
 *
 *     create policy "projects_open_all" on public.projects
 *     for all to anon, authenticated using (true) with check (true);
 *
 * Les migrations suivantes ont posé les vraies règles — `projects_owner_only`,
 * `documents_by_project` — **à côté**, sans supprimer la porte. Or PostgreSQL
 * combine les politiques permissives par un OU : une règle juste à côté d'une
 * porte ouverte ne restreint rien.
 *
 * Pendant cinq mois, tout projet, tout document, tout sujet s'est donc lu et
 * écrit avec la seule clé publique du navigateur, pendant que trois migrations
 * successives écrivaient des règles de confidentialité qui ne s'appliquaient
 * pas. Et c'est ce qui a produit le 403 du dépôt de mails : les tables filles
 * récentes n'ont pas de jumelle ouverte, elles seules mordaient.
 *
 * ## Pourquoi lire les migrations, et non un écran
 *
 * Aucune page ne montre cela, aucune console ne le signale, et l'on ne s'en
 * aperçoit qu'en lisant le SQL ligne à ligne — c'est le défaut précis et
 * invisible pour lequel lire la source en épreuve se justifie.
 *
 * ## Ce que ce compte fait
 *
 * Il énumère les portes encore ouvertes et **refuse que la liste s'allonge**.
 * Elle ne peut que raccourcir : fermer une table dont c'est la seule politique
 * la rendrait muette, il faut donc lui écrire sa règle d'abord, une à une.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATIONS = join(
  dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "supabase", "migrations"
);

/** Le SQL seul : une politique citée dans un commentaire n'est pas posée. */
function leSqlSeul(source) {
  return source.replace(/^\s*--.*$/gm, "");
}

/**
 * Les politiques « tout ouvert » encore en vie.
 *
 * Une politique est vivante si elle est créée quelque part et supprimée nulle
 * part **après** sa création. Le `drop ... if exists` qui précède immédiatement
 * son `create` ne la supprime pas : il rend la migration rejouable.
 */
function lesPortesEncoreOuvertes() {
  const fichiers = readdirSync(MIGRATIONS).filter((un) => un.endsWith(".sql")).sort();
  const creees = new Map();
  const fermees = new Map();

  for (const fichier of fichiers) {
    const sql = leSqlSeul(readFileSync(join(MIGRATIONS, fichier), "utf8"));
    for (const trouve of sql.matchAll(
      /create\s+policy\s+"?([a-zA-Z0-9_]+_open_all)"?\s*\n?\s*on\s+(?:public\.)?"?([a-zA-Z0-9_]+)"?/g
    )) {
      creees.set(trouve[1], { table: trouve[2], quand: fichier });
    }
    for (const trouve of sql.matchAll(
      /drop\s+policy\s+if\s+exists\s+"?([a-zA-Z0-9_]+_open_all)"?/g
    )) {
      const dansLaMemeMigration = new RegExp(
        `drop\\s+policy\\s+if\\s+exists\\s+"?${trouve[1]}"?[^;]*;\\s*create\\s+policy`
      ).test(sql);
      if (dansLaMemeMigration) continue;
      fermees.set(trouve[1], fichier);
    }
  }

  return [...creees.entries()]
    .filter(([nom, ou]) => !(fermees.has(nom) && fermees.get(nom) > ou.quand))
    .map(([nom, ou]) => ou.table)
    .sort();
}

/**
 * Ce qui reste ouvert, nommément.
 *
 * **Plus rien.** Les huit premières sont tombées en octobre ; les vingt-six
 * autres avec `202611040001_les_vingt_six_portes.sql`, qui leur a écrit une
 * règle chacune avant de fermer — une table fermée sans règle serait muette,
 * c'est-à-dire un écran cassé sans que rien dise pourquoi.
 *
 * La liste reste, vide, et l'épreuve avec elle : c'est ce qui empêche la
 * prochaine table de rouvrir la même porte sans que personne le voie.
 */
const ENCORE_OUVERTES = [];

test("la liste des portes ouvertes ne s'allonge pas", () => {
  const restantes = lesPortesEncoreOuvertes();
  const nouvelles = restantes.filter((table) => !ENCORE_OUVERTES.includes(table));

  assert.deepEqual(
    nouvelles, [],
    "une table vient d'être laissée ouverte à tout le monde :\n" + nouvelles.join("\n")
  );
});

test("ce qui a été fermé reste fermé", () => {
  const restantes = new Set(lesPortesEncoreOuvertes());
  // Les huit du 202610290001 — celles qui portaient déjà une règle complète —
  // et les vingt-six du 202611040001, qui ont reçu la leur.
  const fermees = [
    "projects", "documents", "subjects", "subject_history",
    "ct_analysis_runs", "situations", "situation_subjects", "project_runs",
    "analysis_runs", "assertion_acts", "assertion_applications", "assertion_dependencies",
    "avis_figures", "ct_avis", "directory_people", "lot_catalog", "milestone_subjects",
    "milestones", "project_assertions", "project_collaborators", "project_identity_markers",
    "project_labels", "project_lots", "proposition_comments", "proposition_items",
    "proposition_notes", "propositions", "subject_assertion_links", "subject_assignees",
    "subject_cr_mentions", "subject_evidence", "subject_labels", "subject_links",
    "subject_observations"
  ];

  for (const table of fermees) {
    assert.equal(
      restantes.has(table), false,
      `« ${table} » est de nouveau ouverte à tout le monde`
    );
  }
});

test("le compte de ce qui reste est dit, et il ne peut que descendre", () => {
  const restantes = lesPortesEncoreOuvertes();
  assert.ok(
    restantes.length <= ENCORE_OUVERTES.length,
    `${restantes.length} portes ouvertes, alors qu'on en attendait au plus ${ENCORE_OUVERTES.length}`
  );
  // La liste écrite ici doit rester vraie : une table qu'on ferme s'en retire,
  // sans quoi elle promettrait un travail déjà fait.
  const fermees = ENCORE_OUVERTES.filter((table) => !restantes.includes(table));
  assert.deepEqual(
    fermees, [],
    "ces tables sont fermées : retirez-les de la liste\n" + fermees.join("\n")
  );
});

test("le projet sans propriétaire est rendu à son auteur, et seulement s'il n'y en a qu'un", () => {
  const sql = leSqlSeul(readFileSync(
    join(MIGRATIONS, "202610290001_les_portes_restees_ouvertes.sql"), "utf8"
  ));

  assert.match(sql, /update public\.projects/);
  assert.match(sql, /where p\.id = seul\.project_id\s*\n\s*and p\.owner_id is null/);
  // **Un seul candidat, sinon rien.** Donner un chantier à quelqu'un d'autre
  // serait pire que de le laisser sans propriétaire.
  assert.match(sql, /having count\(distinct agi\.qui\) = 1/);
});

test("la règle de l'histoire des sujets peut écrire", () => {
  // Elle n'avait qu'un `using` : sans `with check`, aucune ligne ne s'écrit. La
  // porte ouverte à côté l'acceptait, et la fermer sans cela casserait
  // l'historique.
  const sql = leSqlSeul(readFileSync(
    join(MIGRATIONS, "202610290001_les_portes_restees_ouvertes.sql"), "utf8"
  ));
  const regle = sql.slice(sql.indexOf("create policy history_by_project"));
  assert.match(regle.slice(0, 400), /with check \(/);
});

/**
 * **Une vue ne porte pas de politique, et ce compte ne la voyait pas.**
 *
 * `project_collaborators_view` était donnée en lecture à `anon`. Une vue
 * PostgreSQL ordinaire lit ses tables de base avec les droits de son
 * propriétaire, sans consulter leurs politiques : fermer
 * `project_collaborators` et `directory_people` sans toucher à la vue n'aurait
 * donc rien fermé du tout.
 *
 * C'est exactement le genre de trou que compter des politiques ne peut pas
 * montrer — d'où cette épreuve à côté, qui lit les vues.
 */
test("aucune vue n'est plus lisible avec la clé publique", () => {
  const fichiers = readdirSync(MIGRATIONS).filter((un) => un.endsWith(".sql")).sort();
  const donnees = new Map();
  const reprises = new Map();

  for (const fichier of fichiers) {
    const sql = leSqlSeul(readFileSync(join(MIGRATIONS, fichier), "utf8"));
    for (const trouve of sql.matchAll(
      /grant\s+[a-z, ]+\s+on\s+(?:public\.)?"?([a-zA-Z0-9_]+)"?\s+to\s+([^;]*anon[^;]*);/g
    )) {
      donnees.set(trouve[1], fichier);
    }
    for (const trouve of sql.matchAll(
      /revoke\s+[a-z, ]+\s+on\s+(?:public\.)?"?([a-zA-Z0-9_]+)"?\s+from\s+([^;]*anon[^;]*);/g
    )) {
      reprises.set(trouve[1], fichier);
    }
  }

  const encore = [...donnees.entries()]
    .filter(([objet, quand]) => !(reprises.has(objet) && reprises.get(objet) > quand))
    .map(([objet]) => objet);

  assert.deepEqual(encore, [],
    "ces objets se lisent encore avec la clé publique du navigateur :\n" + encore.join("\n"));
});

/**
 * **Et la vue lit désormais sous les règles de celui qui interroge.** La lui
 * retirer à `anon` sans `security_invoker` ne suffirait pas : tout compte
 * connecté y verrait les collaborateurs de tous les chantiers.
 */
test("la vue des collaborateurs lit avec les droits de celui qui interroge", () => {
  const sql = leSqlSeul(readFileSync(
    join(MIGRATIONS, "202611040001_les_vingt_six_portes.sql"), "utf8"
  ));
  assert.match(sql,
    /alter view public\.project_collaborators_view set \(security_invoker = true\)/);
});

/**
 * **Chaque table fermée a bien reçu sa règle**, et la même partout : une
 * seconde formulation pour dire la même chose finirait par ne pas dire la même
 * chose (règle 4).
 */
test("les vingt-six ont chacune une règle, et aucune ne s'ouvre à anon", () => {
  const sql = leSqlSeul(readFileSync(
    join(MIGRATIONS, "202611040001_les_vingt_six_portes.sql"), "utf8"
  ));

  const posees = [...sql.matchAll(/create\s+policy\s+([a-zA-Z0-9_]+)\s*\n\s*on\s+public\.([a-zA-Z0-9_]+)/g)]
    .map((un) => un[2]);
  const fermees = [...sql.matchAll(/drop\s+policy\s+if\s+exists\s+"([a-zA-Z0-9_]+)_open_all"/g)]
    .map((un) => un[1]);

  assert.equal(fermees.length, 26, `${fermees.length} portes fermées au lieu de 26`);
  for (const table of fermees) {
    assert.equal(posees.includes(table), true,
      `« ${table} » est fermée sans règle : elle sera muette`);
  }
  // Aucune des nouvelles règles ne redonne la main à la clé publique.
  assert.doesNotMatch(sql, /create policy[\s\S]*?to\s+anon/);
});

/**
 * **`with check` autant que `using`.** Sans lui, une table se lit correctement
 * et refuse toute écriture — le défaut trouvé sur `subject_history` en octobre,
 * qui ne s'était jamais vu parce que la porte ouverte acceptait tout à côté.
 */
test("chaque règle posée sait aussi écrire", () => {
  const sql = leSqlSeul(readFileSync(
    join(MIGRATIONS, "202611040001_les_vingt_six_portes.sql"), "utf8"
  ));

  // Le catalogue est en lecture seule, et c'est voulu : il n'a pas de `with
  // check` parce qu'il n'a pas d'écriture du tout.
  const morceaux = sql.split(/create\s+policy\s+/).slice(1);
  for (const morceau of morceaux) {
    const nom = morceau.slice(0, morceau.indexOf("\n")).trim();
    if (/for\s+select/.test(morceau.slice(0, 200))) continue;
    assert.match(morceau.slice(0, 900), /with check \(/, `« ${nom} » ne peut rien écrire`);
  }
});
