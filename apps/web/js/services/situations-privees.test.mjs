import test from "node:test";
import assert from "node:assert/strict";

import {
  APPARTENANCE,
  appartenanceDe,
  motDeLAppartenance,
  peutEtreModifiee,
  pourquoiPasModifiable,
  proprietaireDe
} from "./situations-privees.js";

const MIENNE = { id: "s-1", name: "Ma semaine", owner_id: "11111111-1111-4111-8111-111111111111" };
const DAVANT = { id: "s-2", name: "Réunion de chantier", owner_id: null };

/* ── Lire le propriétaire ────────────────────────────────────────────────── */

/**
 * La base écrit `owner_id`, le store range en `ownerId`, et les deux formes se
 * croisent — une ligne fraîchement lue n'est pas passée par la même main qu'une
 * ligne du store. Lire une seule des deux ferait passer la moitié des
 * situations pour orphelines : l'écran dirait « créée avant le cloisonnement »
 * sur une situation d'hier.
 */
test("le propriétaire se lit sous ses deux noms", () => {
  assert.equal(proprietaireDe({ owner_id: "abc" }), "abc");
  assert.equal(proprietaireDe({ ownerId: "abc" }), "abc");
});

/**
 * **Une chaîne vide n'est pas un propriétaire.** Un `select` qui rend `""`
 * plutôt que `null` pour une colonne absente ferait passer une situation
 * orpheline pour appropriée — et l'écran proposerait de la modifier alors que
 * la base refusera l'écriture.
 */
test("un propriétaire blanc n'est pas un propriétaire", () => {
  assert.equal(proprietaireDe({ owner_id: "" }), "");
  assert.equal(proprietaireDe({ owner_id: "   " }), "");
  assert.equal(appartenanceDe({ owner_id: "   " }), APPARTENANCE.AVANT_LE_CLOISONNEMENT);
});

/** Rien à lire ne lève pas : la table peut être vide, l'écran se dessine quand même. */
test("sans situation, on ne devine rien et on ne casse rien", () => {
  assert.equal(proprietaireDe(), "");
  assert.equal(proprietaireDe(null), "");
  assert.equal(appartenanceDe(null), APPARTENANCE.AVANT_LE_CLOISONNEMENT);
});

/* ── Ce qu'on en dit ─────────────────────────────────────────────────────── */

test("une situation qui a un propriétaire est la mienne", () => {
  // La base ne rend pas celles des autres : celle que je lis avec un
  // propriétaire est nécessairement la mienne.
  assert.equal(appartenanceDe(MIENNE), APPARTENANCE.MIENNE);
  assert.equal(appartenanceDe(DAVANT), APPARTENANCE.AVANT_LE_CLOISONNEMENT);
});

/**
 * **Le cas normal ne se commente pas.** Écrire « la vôtre » sur chacune des
 * quinze lignes de l'écran ferait un bruit qu'on cesse de lire au bout de
 * trois — et la seule mention qui compte, celle de l'exception, se noierait
 * dedans.
 */
test("les miennes ne portent aucune mention, l'exception en porte une", () => {
  assert.equal(motDeLAppartenance(MIENNE), "");
  assert.equal(motDeLAppartenance(DAVANT), "créée avant le cloisonnement");
});

/* ── Avant le clic ───────────────────────────────────────────────────────── */

/**
 * **La question se pose avant le clic.** La base refuse d'écrire sur une
 * situation qui n'appartient à personne. Laisser le bouton actif ferait
 * cliquer sur un geste qui échoue en silence, et l'on chercherait la panne
 * dans le réseau.
 */
test("une situation d'avant le cloisonnement se lit mais ne se modifie pas", () => {
  assert.equal(peutEtreModifiee(MIENNE), true);
  assert.equal(peutEtreModifiee(DAVANT), false);
  assert.equal(peutEtreModifiee(null), false);
});

/**
 * Un refus qui ne dit pas quoi faire laisse devant un bouton gris. La phrase
 * nomme l'empêchement **et la suite** — sinon on la relit trois fois sans
 * savoir quoi en faire.
 */
test("le refus nomme l'empêchement et la suite", () => {
  assert.equal(pourquoiPasModifiable(MIENNE), "", "ce qui marche ne s'explique pas");

  const phrase = pourquoiPasModifiable(DAVANT);
  assert.match(phrase, /n'appartient à personne/, "l'empêchement");
  assert.match(phrase, /[Rr]eprenez-la/, "la suite");
});

/* ── Le garde-fou, là où il tient vraiment ───────────────────────────────── */

/**
 * Les trois vérifications qui suivent lisent du texte, et c'est assumé.
 *
 * Elles ne remplacent pas les précédentes : elles couvrent le seul défaut
 * qu'aucune exécution ne révèle — **une chose absente**. Une colonne oubliée
 * dans une chaîne de `select`, une règle de base restée ouverte, une clé
 * glissée dans un corps de requête : rien ne lève, rien ne rougit, et l'on
 * découvre la fuite le jour où quelqu'un lit le carnet d'un autre.
 *
 * Voir `docs/les-situations-traversent-les-projets.md`, § 3.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SERVICES = dirname(fileURLToPath(import.meta.url));
const RACINE = join(SERVICES, "..", "..", "..", "..");
const MIGRATIONS = join(RACINE, "supabase", "migrations");

const lire = (chemin) => readFileSync(chemin, "utf8");

/** La migration qui ferme la porte. Ce qui vient après elle doit la respecter. */
const CLOISONNEMENT = "202610040001_situations_privees.sql";

/**
 * **`owner_id` doit être demandé pour arriver.**
 *
 * PostgREST ne rend que les colonnes nommées. Absente de la chaîne, la colonne
 * ne lève rien : chaque situation revient sans propriétaire, et l'écran
 * annonce « créée avant le cloisonnement » sur celle qu'on vient d'écrire —
 * en désactivant son bouton de modification par-dessus le marché.
 */
test("la lecture demande le propriétaire", () => {
  const source = lire(join(SERVICES, "project-situations-supabase.js"));
  const clause = source.match(/function getSituationsSelectClause\(\) \{\s*return "([^"]+)"/);

  assert.ok(clause, "la chaîne des colonnes doit rester écrite à un seul endroit");
  assert.ok(
    clause[1].split(",").includes("owner_id"),
    `owner_id manque dans « ${clause?.[1]} » : tout reviendrait sans propriétaire`
  );
});

/**
 * **Le propriétaire est posé par la base, jamais envoyé.**
 *
 * Un client qui l'envoie est un client qui peut envoyer celui d'un autre. La
 * règle d'écriture le refuserait — mais elle ne serait plus la seule vérité, et
 * c'est déjà trop. Une seule ligne du module nomme `owner_id` en clé : celle
 * qui range ce que la base a rendu.
 */
test("le client ne pose jamais le propriétaire lui-même", () => {
  const lignes = lire(join(SERVICES, "project-situations-supabase.js"))
    .split("\n")
    .filter((ligne) => /\bowner_id\s*:/.test(ligne) || /\bbody\.owner_id\b/.test(ligne));

  assert.deepEqual(
    lignes.map((ligne) => ligne.trim()),
    ["owner_id: normalizeUuid(row.owner_id),"],
    "owner_id ne s'écrit que dans la normalisation d'une ligne lue"
  );
});

/**
 * **Personne ne rouvre la porte sans le voir.**
 *
 * `using (true)` sur `situations` rendrait tous les carnets à tout le monde, et
 * sur `situation_subjects` les raconterait ligne par ligne sans jamais lire la
 * situation elle-même — c'est celle-là qu'on oublie. Une migration postérieure
 * qui n'appuie pas sa règle sur `auth.uid()` casse la construction : on peut
 * toujours décider de le faire, on ne peut plus le faire distraitement.
 */
test("aucune migration postérieure ne rouvre les situations", () => {
  const cloisonnees = new Set(["situations", "situation_subjects"]);
  const fautes = [];

  for (const nom of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    if (nom < CLOISONNEMENT) continue;

    const sql = lire(join(MIGRATIONS, nom));
    // Une règle va de `create policy` jusqu'au `;` qui la termine.
    for (const [, corps] of sql.matchAll(/create policy\b([\s\S]*?);/gi)) {
      const table = corps.match(/\bon\s+public\.(\w+)/i)?.[1];
      if (!cloisonnees.has(table)) continue;
      if (!/auth\.uid\(\)/.test(corps)) fautes.push(`${nom} → ${table}`);
    }
  }

  assert.deepEqual(fautes, [], "une règle sans auth.uid() rend le carnet de quelqu'un");
});

/** Et la règle d'avant, celle qui laissait tout passer, doit être retirée. */
test("l'ancienne règle ouverte est retirée, pas contournée", () => {
  const sql = lire(join(MIGRATIONS, CLOISONNEMENT));

  assert.match(sql, /drop policy if exists "situations_open_all"/);
  assert.match(sql, /alter table public\.situation_subjects enable row level security/);
});
