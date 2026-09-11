import test from "node:test";
import assert from "node:assert/strict";

import { diagnosticDuSuivi, estUnCompteRendu } from "./diagnostic-du-suivi.js";
import { CR_CHANTIER_KIND } from "./document-recognizer-cr.js";

const cr = (reste = {}) => ({
  id: "doc-1", original_filename: "reunion-6.pdf",
  detected_kind: CR_CHANTIER_KIND,
  declared_reference: "6", issued_at: "2025-06-25", created_at: "2025-06-26",
  ...reste
});

const SUJETS = [{ id: "s-1", title: "Étanchéité" }, { id: "s-2", title: "Garde-corps" }];

const reprise = (reste = {}) => ({
  subject_id: "s-1", numero: "6", tenue_le: "2025-06-25", a_change: true, ...reste
});

/* ── Ce que le constat sert à distinguer ─────────────────────────────────── */

/**
 * **Les quatre pannes se ressemblent à l'écran : rien.** Le constat existe
 * pour qu'elles ne se ressemblent plus ici.
 */
test("sans compte rendu, il le dit et s'arrête là", () => {
  const dit = diagnosticDuSuivi({ documents: [{ id: "d", detected_kind: "ct_rapport" }], sujets: SUJETS, reprises: [] });

  assert.match(dit, /COMPTES RENDUS : 0 sur 1/);
  assert.match(dit, /AUCUN\./);
});

/**
 * La distinction qui compte le plus : **rien n'a jamais été écrit** est une
 * réponse, pas une absence de réponse. Et quand les comptes rendus sont plus
 * vieux que le suivi lui-même, il n'y avait rien à écrire — aucune relecture du
 * code ne le dira.
 */
test("aucune reprise : il nomme les deux causes possibles, et les date", () => {
  const dit = diagnosticDuSuivi({
    documents: [cr({ created_at: "2025-06-26" })],
    sujets: SUJETS,
    reprises: [],
    migrationLe: "2026-09-21"
  });

  assert.match(dit, /AUCUNE\. La chaîne s'arrête ici/);
  assert.match(dit, /1 des 1 compte\(s\) rendu\(s\) ont été déposés avant cette date/);
});

/**
 * Et quand la base n'a pas répondu, on ne conclut pas : une table muette et une
 * table vide ne disent pas la même chose (règle 5).
 */
test("une base qui ne répond pas ne devient pas « rien n'a été écrit »", () => {
  const dit = diagnosticDuSuivi({ documents: [cr()], sujets: SUJETS, reprises: null });

  assert.match(dit, /LA BASE N'A PAS RÉPONDU/);
  assert.doesNotMatch(dit, /AUCUNE\./);
});

/* ── Ce qu'un compte rendu mal lu coûte ──────────────────────────────────── */

test("un compte rendu sans numéro ni date se signale, et dit ce qu'on y perd", () => {
  const dit = diagnosticDuSuivi({
    documents: [cr({ declared_reference: "", issued_at: "" })],
    sujets: SUJETS,
    reprises: []
  });

  assert.match(dit, /sans numéro/);
  assert.match(dit, /sans date de réunion/);
  assert.match(dit, /perdra son « depuis le … »/);
});

/* ── Quand la chaîne marche, il montre la phrase ─────────────────────────── */

/**
 * Le constat ne se contente pas de compter les lignes : il **calcule la phrase**
 * avec le même service que l'écran. Compter sans calculer laisserait entière la
 * dernière question — « il y a des lignes, alors pourquoi rien ne s'affiche ? ».
 */
test("il affiche la phrase que chaque sujet devrait montrer", () => {
  const dit = diagnosticDuSuivi({
    documents: [cr()],
    sujets: SUJETS,
    reprises: [
      reprise({ numero: "6", tenue_le: "2025-06-25", a_change: true }),
      reprise({ numero: "7", tenue_le: "2025-07-02", a_change: false })
    ]
  });

  assert.match(dit, /Étanchéité/);
  assert.match(dit, /n°6\* n°7/);
  assert.match(dit, /Pas de modification au compte rendu n° 7 du 02\/07\/2025\./);
});

/**
 * Les sujets que rien n'a repris se comptent et se nomment : c'est là qu'on
 * verra si le suivi n'accroche qu'une partie des sujets.
 */
test("les sujets sans aucune reprise se comptent", () => {
  const dit = diagnosticDuSuivi({ documents: [cr()], sujets: SUJETS, reprises: [reprise()] });

  assert.match(dit, /SUJETS SANS AUCUNE REPRISE : 1 sur 2/);
  assert.match(dit, /Garde-corps/);
});

/* ── Ce qui compte comme compte rendu ────────────────────────────────────── */

/**
 * La nature se lit telle que la reconnaissance l'a écrite. Deviner d'après le
 * nom du fichier ferait passer pour un compte rendu tout ce qui s'appelle
 * « CR », et raterait ceux qui ne s'appellent pas ainsi.
 */
test("un compte rendu se reconnaît à sa nature, pas à son nom de fichier", () => {
  assert.equal(estUnCompteRendu({ detected_kind: CR_CHANTIER_KIND }), true);
  assert.equal(estUnCompteRendu({ original_filename: "CR_07.pdf", detected_kind: "" }), false);
  assert.equal(estUnCompteRendu({}), false);
});

/* ── Il constate, il ne répare pas ───────────────────────────────────────── */

/**
 * Un diagnostic qui écrit masquerait la cause en la supprimant : on ne saurait
 * plus si la chaîne marche ou si le diagnostic l'a rattrapée.
 */
test("le constat n'écrit rien", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const source = readFileSync(fileURLToPath(new URL("./diagnostic-du-suivi.js", import.meta.url)), "utf8");

  assert.doesNotMatch(source, /\bmethod:\s*"(POST|PATCH|PUT|DELETE)"/);
  assert.doesNotMatch(source, /record[A-Z]|insert[A-Z]|\bfetch\(/);
});
