/**
 * Le rangement des exécutions, et ce qu'il refuse d'affirmer.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  ORIGINE, ONGLETS, decrireVisibilite, longletDit, ongletValide, partitionnerActions
} from "./run-partition.js";

const PROJET = { id: "a", origine: "projet", privee: false };
const ATELIER = { id: "b", origine: "atelier", privee: true };
const ATELIER_ANCIEN = { id: "c", origine: "atelier", privee: false };

test("les exécutions se rangent par origine, sans en perdre", () => {
  const range = partitionnerActions([PROJET, ATELIER, ATELIER_ANCIEN]);
  assert.deepEqual(range[ORIGINE.PROJET].map((e) => e.id), ["a"]);
  assert.deepEqual(range[ORIGINE.ATELIER].map((e) => e.id), ["b", "c"]);
});

test("une exécution sans origine déclarée est un acte du projet", () => {
  // C'est le cas sûr : ranger dans l'Atelier ce dont on ne sait rien
  // reviendrait à masquer une action que tout le monde devrait voir.
  const range = partitionnerActions([{ id: "x" }, { id: "y", origine: "n'importe quoi" }]);
  assert.deepEqual(range[ORIGINE.PROJET].map((e) => e.id), ["x", "y"]);
  assert.equal(range[ORIGINE.ATELIER].length, 0);
});

test("l'ordre d'arrivée est conservé dans chaque pile", () => {
  const range = partitionnerActions([ATELIER_ANCIEN, PROJET, ATELIER]);
  assert.deepEqual(range[ORIGINE.ATELIER].map((e) => e.id), ["c", "b"]);
});

test("un onglet inconnu retombe sur les actions partagées", () => {
  assert.equal(ongletValide("atelier"), ORIGINE.ATELIER);
  assert.equal(ongletValide("projet"), ORIGINE.PROJET);
  assert.equal(ongletValide(""), ORIGINE.PROJET);
  assert.equal(ongletValide(undefined), ORIGINE.PROJET);
  assert.equal(ongletValide("brouillon"), ORIGINE.PROJET);
});

test("une action du projet ne porte aucune marque de visibilité", () => {
  assert.equal(decrireVisibilite(PROJET), null);
  assert.equal(decrireVisibilite({}), null);
});

test("une exécution d'Atelier qui a un propriétaire est marquée comme vôtre", () => {
  const v = decrireVisibilite(ATELIER);
  assert.equal(v.marque, true);
  assert.match(v.titre, /visible par vous seul/);
});

test("une exécution d'Atelier sans propriétaire ne se prétend pas privée", () => {
  // Elle date d'avant le cloisonnement : tout le monde la lit encore, et
  // l'écran doit le dire plutôt que promettre une confidentialité inexistante.
  const v = decrireVisibilite(ATELIER_ANCIEN);
  assert.equal(v.marque, false);
  assert.match(v.titre, /encore visible par le projet/);
  assert.equal(v.note, "antérieure au cloisonnement");
});

test("chaque onglet porte un libellé et une explication", () => {
  assert.equal(ONGLETS.length, 3);
  const cles = ONGLETS.map((onglet) => onglet.cle);
  assert.deepEqual(cles, [ORIGINE.PROJET, ORIGINE.ATELIER, ORIGINE.VERSEMENT]);
  assert.equal(new Set(cles).size, 3, "deux onglets de même clé rangeraient au même endroit");
  for (const onglet of ONGLETS) {
    assert.ok(onglet.libelle, "un onglet sans libellé ne se clique pas");
    assert.ok(onglet.explication.length > 20, "l'onglet doit dire ce qu'il change pour le lecteur");
  }
});

test("un versement ne tombe pas dans « Partagées »", () => {
  // La base ne rend un versement qu'à son auteur. Le ranger sous « ce qui est
  // arrivé au projet, tous les collaborateurs le lisent » annoncerait
  // l'inverse de ce qu'elle fait.
  const piles = partitionnerActions([
    { id: "a", origine: ORIGINE.VERSEMENT },
    { id: "b", origine: ORIGINE.PROJET },
    { id: "c", origine: ORIGINE.ATELIER }
  ]);
  assert.deepEqual(piles[ORIGINE.VERSEMENT].map((un) => un.id), ["a"]);
  assert.deepEqual(piles[ORIGINE.PROJET].map((un) => un.id), ["b"]);
  assert.deepEqual(piles[ORIGINE.ATELIER].map((un) => un.id), ["c"]);
});

test("les trois piles existent même vides, pour que les compteurs disent zéro", () => {
  const piles = partitionnerActions([]);
  for (const onglet of ONGLETS) {
    assert.deepEqual(piles[onglet.cle], [], `la pile ${onglet.cle} doit exister`);
  }
});

test("l'onglet des versements se garde quand on le demande", () => {
  assert.equal(ongletValide(ORIGINE.VERSEMENT), ORIGINE.VERSEMENT);
  assert.equal(ongletValide("autre-chose"), ORIGINE.PROJET);
  assert.equal(ongletValide(""), ORIGINE.PROJET);
});

/**
 * La séparation est-elle vraiment tenue, ou seulement affichée ?
 *
 * Un onglet qui range bien ne protège rien : il suffirait d'un écran qui
 * oublie de filtrer. Ce test lit la migration pour vérifier que la règle est
 * posée là où elle ne peut pas être contournée — dans la base.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const MIGRATION = readFileSync(
  join(RACINE, "supabase", "migrations", "202609110001_ct_analysis_runs_atelier.sql"), "utf8"
);

test("la base connaît le propriétaire d'une exécution, et le pose elle-même", () => {
  assert.match(MIGRATION, /add column if not exists owner_id uuid/);
  // Demander au client d'envoyer le propriétaire, ce serait accepter qu'il
  // envoie celui d'un autre.
  assert.match(MIGRATION, /alter column owner_id set default auth\.uid\(\)/);
});

test("la lecture des exécutions d'Atelier est restreinte par la base, pas par l'écran", () => {
  assert.match(MIGRATION, /drop policy if exists ct_analysis_runs_open_all/);
  assert.match(MIGRATION, /for select/);
  assert.match(MIGRATION, /owner_id = auth\.uid\(\)/);
  assert.match(MIGRATION, /trigger_source is distinct from 'atelier'/);
});

test("les exécutions déjà écrites ne disparaissent pas du journal", () => {
  // Les cacher rétroactivement ferait s'évanouir des lignes que des gens ont
  // vues hier, sans que personne l'ait demandé.
  assert.match(MIGRATION, /owner_id is null/);
});

/* ── Une fusion en cours ne disparaît pas quand on va la regarder ────────── */

/**
 * **Le défaut qui a fait croire que le journal ne marchait pas.**
 *
 * On cliquait « Fusionner », la ligne apparaissait avec son sablier — et elle
 * disparaissait dès qu'on ouvrait l'onglet Actions. L'onglet relit la base à
 * chaque venue, et la relecture remplaçait la liste entière : une fusion qui
 * dure une minute et demie n'est écrite en base qu'à la fin.
 */
test("une exécution en cours survit à la relecture de la base", async () => {
  const { executionsAGarder } = await import("./run-partition.js");

  const vivantes = [
    { id: "vive-1", status: "running" },
    { id: "finie-1", status: "completed" }
  ];
  const lues = [{ id: "ancienne-1", status: "completed" }];

  assert.deepEqual(executionsAGarder(vivantes, lues).map((e) => e.id), ["vive-1"]);
});

/**
 * **La version écrite l'emporte dès qu'elle existe.** Elle est complète ;
 * garder la vive à côté ferait deux lignes pour un seul geste (règle 4).
 */
test("une exécution que la base porte déjà ne se double pas", async () => {
  const { executionsAGarder } = await import("./run-partition.js");

  const gardees = executionsAGarder(
    [{ id: "vive-1", status: "running" }],
    [{ id: "vive-1", status: "completed" }]
  );

  assert.deepEqual(gardees, []);
});

/** Rien en mémoire, rien à garder — et aucune exception sur des listes absentes. */
test("sans exécution vive, il n'y a rien à garder", async () => {
  const { executionsAGarder } = await import("./run-partition.js");

  assert.deepEqual(executionsAGarder([], []), []);
  assert.deepEqual(executionsAGarder(null, null), []);
  assert.deepEqual(executionsAGarder(), []);
  // Une exécution finie n'est pas vive : elle vient de la base ou elle n'existe pas.
  assert.deepEqual(executionsAGarder([{ id: "x", status: "completed" }], []), []);
});

/* ── Un versement est tenu privé par la base, pas par l'onglet ───────────── */

const MIGRATION_DU_VERSEMENT = readFileSync(
  join(RACINE, "supabase", "migrations", "202610280001_le_journal_dun_versement.sql"), "utf8"
);

test("le journal des exécutions n'est plus ouvert aux visiteurs", () => {
  // Il l'était : `to anon, authenticated using (true)`. Tout le journal de tous
  // les chantiers se lisait avec la seule clé publique.
  assert.match(MIGRATION_DU_VERSEMENT, /drop policy if exists project_runs_open_all/);
  assert.doesNotMatch(
    MIGRATION_DU_VERSEMENT.replace(/^\s*--.*$/gm, ""),
    /to anon/,
    "une politique rendue aux visiteurs n'a pas de propriétaire à vérifier"
  );
});

test("un versement ne se lit que par son auteur, et une absence d'auteur ferme", () => {
  const sql = MIGRATION_DU_VERSEMENT.replace(/^\s*--.*$/gm, "");
  assert.match(sql, /personnelle boolean not null default false/);
  assert.match(sql, /personnelle = false or owner_id = auth\.uid\(\)/);
  // Deux fois déjà une absence a ouvert au lieu de fermer. Pas une troisième.
  assert.doesNotMatch(
    sql,
    /owner_id is null/,
    "une exécution personnelle sans auteur ne doit être lue par personne"
  );
});

test("la règle du versement est posée sur la lecture comme sur l'écriture", () => {
  const sql = MIGRATION_DU_VERSEMENT.replace(/^\s*--.*$/gm, "");
  const clauses = sql.match(/personnelle = false or owner_id = auth\.uid\(\)/g) ?? [];
  assert.equal(clauses.length, 2, "il faut la même règle dans `using` et dans `with check`");
});

test("un versement porte un cadenas, et l'Atelier sa puce", () => {
  // La marque de l'Atelier dit « essai ». Un dépôt de mails est un acte : lui
  // donner cette marque-là dirait le contraire de ce qu'il est.
  const versement = decrireVisibilite({ origine: ORIGINE.VERSEMENT, privee: true });
  assert.equal(versement.marque, true);
  assert.match(versement.titre, /vous seul/);

  assert.notEqual(versement.icone, decrireVisibilite({ origine: ORIGINE.ATELIER, privee: true }).icone);
  assert.equal(decrireVisibilite({ origine: ORIGINE.ATELIER, privee: true }).icone, "cpu");
  assert.equal(decrireVisibilite({ origine: ORIGINE.PROJET }), null);
});

/**
 * **Un nom d'icône absent du jeu ne se voit pas : il ne dessine rien.**
 *
 * C'est arrivé dans le tour même où cette marque est née : le cadenas avait été
 * écrit `lock`, qui n'existe pas dans `assets/icons.svg`. La page ne dit rien,
 * la console ne dit rien, et l'on obtient une case vide à côté du titre — un
 * défaut précis et invisible, exactement ce pour quoi lire un fichier de
 * ressources en épreuve se justifie.
 */
test("les marques du journal existent dans le jeu d'icônes", () => {
  const sprite = readFileSync(join(RACINE, "apps", "web", "assets", "icons.svg"), "utf8");
  const marques = [
    decrireVisibilite({ origine: ORIGINE.VERSEMENT, privee: true }),
    decrireVisibilite({ origine: ORIGINE.ATELIER, privee: true }),
    decrireVisibilite({ origine: ORIGINE.ATELIER })
  ];

  for (const marque of marques) {
    assert.ok(marque.icone, "une marque sans icône ne dessine rien");
    assert.ok(
      sprite.includes(`id="${marque.icone}"`),
      `l'icône « ${marque.icone} » n'est pas dans assets/icons.svg`
    );
  }
});

test("une exécution d'Atelier d'avant le cloisonnement garde son icône et sa mention", () => {
  const ancienne = decrireVisibilite({ origine: ORIGINE.ATELIER });
  assert.equal(ancienne.marque, false);
  assert.equal(ancienne.icone, "cpu");
  assert.match(ancienne.note, /antérieure/);
});

/* ── Ce qu'on réécrit, et ce qu'on préfère perdre ────────────────────────── */

test("une fusion se réécrit sans la colonne trop neuve", async () => {
  const { laCourseDeRepli } = await import("./run-partition.js");
  const repli = laCourseDeRepli({ geste: "fusion", titre: "Lot 3", personnelle: false });
  assert.deepEqual(repli, { geste: "fusion", titre: "Lot 3" });
  assert.equal("personnelle" in repli, false);
});

test("un versement ne se réécrit jamais sans sa marque", async () => {
  // La réécrire sans `personnelle` le rendrait partagé : ce serait publier la
  // correspondance de quelqu'un pour sauver une ligne de journal.
  const { laCourseDeRepli } = await import("./run-partition.js");
  assert.equal(laCourseDeRepli({ geste: "versement", personnelle: true }), null);
  assert.equal(laCourseDeRepli(null), null);
  assert.equal(laCourseDeRepli("bonjour"), null);
});

/* ── Le journal parle français ───────────────────────────────────────────── */

test("une exécution se compte en français, et s'accorde", async () => {
  const { lesExecutionsDites, UNE_EXECUTION } = await import("./run-partition.js");
  assert.equal(lesExecutionsDites(0), "0 exécution");
  assert.equal(lesExecutionsDites(1), "1 exécution");
  assert.equal(lesExecutionsDites(12), "12 exécutions");
  assert.equal(UNE_EXECUTION, "Exécution");
});

/**
 * **Le mot « run » ne s'écrit plus à l'écran.** Il était le mot du code, et il
 * s'était installé dans l'en-tête du journal — « 1 run », « 3 runs » — et dans
 * le titre d'une ligne sans nom. Ce garde lit les textes affichés de l'écran des
 * Actions, et eux seuls : les classes, les attributs et les chemins d'import
 * gardent le mot, qui est du vocabulaire de fabrication.
 */
test("aucun texte affiché du journal ne dit « run »", async () => {
  const { readFileSync: lire } = await import("node:fs");
  const source = lire(
    join(RACINE, "apps", "web", "js", "views", "project-actions.js"), "utf8"
  );

  // **Le mot isolé, et lui seul.** `run-detail`, `workflow-runs__head`,
  // `data-run-open`, `totalRuns` portent le mot **collé** à un tiret, un
  // souligné ou une lettre : c'est du vocabulaire de fabrication, il ne monte
  // pas à l'écran. Un mot qui se lit vraiment est entouré d'espace, de
  // guillemets ou de balises — c'était le cas des trois qu'on vient de traduire.
  const ISOLE = /(^|[\s>"'`])(runs?)(?=[\s<"'`$.,;:)]|$)/gi;

  const coupables = [...source.matchAll(ISOLE)].map((trouve) => trouve[2]);

  assert.deepEqual(
    coupables, [],
    `le mot est encore affiché : ${coupables.join(", ")}`
  );
});

/**
 * **Le rail des Actions nomme ces trois vues, et le titre du tableau aussi.**
 * Deux endroits qui choisiraient chacun leur libellé finiraient par annoncer
 * « Versements » dans le rail et « Dépôts » au-dessus du tableau (règle 10).
 */
test("chaque vue porte un nom, une icône et ce qu'elle explique", () => {
  for (const un of ONGLETS) {
    assert.equal(Boolean(un.cle && un.libelle && un.icone && un.explication), true, un.cle);
  }
  const cles = ONGLETS.map((un) => un.cle);
  assert.equal(new Set(cles).size, cles.length);
});

test("la vue entière se retrouve par sa clé, et une clé inconnue ouvre la première", () => {
  assert.equal(longletDit(ORIGINE.VERSEMENT).libelle, "Versements");
  assert.equal(longletDit("inconnue").cle, ORIGINE.PROJET);
  assert.equal(longletDit("").cle, ORIGINE.PROJET);
  assert.equal(longletDit(null).cle, ORIGINE.PROJET);
});
