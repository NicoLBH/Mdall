/**
 * L'épreuve du découpage d'un nom.
 *
 * **La propriété qui compte : la fin ne se perd jamais.** C'est elle qui
 * distingue deux documents du même chantier — l'indice, le numéro, l'extension
 * —, et c'est exactement ce que `text-overflow: ellipsis` coupe.
 *
 * **Et le module ne coupe plus.** Il découpe, et c'est le navigateur qui décide
 * s'il faut rogner : un compte de caractères rendait un nom abrégé à côté de
 * trente centimètres de vide dès que la colonne était large.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { LA_FIN_QUON_GARDE, ceQuUnNomMontre } from "./un-nom-trop-long.js";

/** Deux rapports du même chantier, qui ne diffèrent que par leur indice. */
const TROIS = "1824_RICT_03_VERIFAS_Montholon_Mediatheque_phase_EXE_indice_C.pdf";
const QUATRE = "1824_RICT_04_VERIFAS_Montholon_Mediatheque_phase_EXE_indice_D.pdf";

/* ── Rien ne se perd ──────────────────────────────────────────────────────── */

test("les deux morceaux recomposent le nom entier, sans rien ajouter", () => {
  for (const nom of [TROIS, QUATRE, "CR_16.pdf", "a", ""]) {
    const ce = ceQuUnNomMontre(nom);
    assert.equal(`${ce.debut}${ce.fin}`, nom.trim(),
      `« ${nom} » ne se recompose pas : le découpage perd ou ajoute du texte`);
  }
});

/**
 * **Le défaut que ce module existe pour empêcher.**
 *
 * Coupés par la fin, ces deux rapports sont le même nom. La fin doit donc
 * rester entière dans les deux cas, et les distinguer.
 */
test("deux rapports qui ne diffèrent que par leur indice restent distincts", () => {
  const trois = ceQuUnNomMontre(TROIS);
  const quatre = ceQuUnNomMontre(QUATRE);

  assert.notEqual(trois.fin, quatre.fin,
    "les deux fins sont identiques : l'indice est perdu");
  assert.ok(trois.fin.endsWith("_C.pdf"));
  assert.ok(quatre.fin.endsWith("_D.pdf"));
});

test("la fin garde exactement ce qu'on a demandé de garder", () => {
  const ce = ceQuUnNomMontre(TROIS);
  assert.equal(ce.fin.length, LA_FIN_QUON_GARDE);
  assert.equal(ce.fin, TROIS.slice(-LA_FIN_QUON_GARDE));

  // Et une autre longueur se demande, pour une colonne plus étroite.
  assert.equal(ceQuUnNomMontre(TROIS, 4).fin, ".pdf".slice(-4));
});

/* ── Rien n'est coupé ici ─────────────────────────────────────────────────── */

/**
 * **Aucun point de suspension nulle part**, et c'est le changement : les mettre
 * ici reviendrait à décider de couper sans savoir si le nom tient. C'est la
 * feuille de style qui les pose, et seulement quand le début déborde vraiment.
 */
test("le module ne pose aucun caractère de coupe", () => {
  for (const nom of [TROIS, "CR_16.pdf", "x".repeat(400)]) {
    const ce = ceQuUnNomMontre(nom);
    assert.ok(!`${ce.debut}${ce.fin}`.includes("…"),
      "le module coupe encore lui-même, au lieu de laisser le navigateur mesurer");
  }
});

/** Et il ne raccourcit rien : un nom de quatre cents caractères passe entier. */
test("un nom très long n'est pas raccourci", () => {
  const long = `${"x".repeat(400)}.pdf`;
  const ce = ceQuUnNomMontre(long);
  assert.equal(`${ce.debut}${ce.fin}`.length, long.length);
});

/* ── Les cas courts ───────────────────────────────────────────────────────── */

/**
 * **Un nom court passe entier dans la fin.** Le découper donnerait un début vide
 * et un morceau de balisage creux sur chaque ligne courte.
 */
test("un nom plus court que la fin gardée ne se découpe pas", () => {
  const ce = ceQuUnNomMontre("CR_16.pdf");
  assert.equal(ce.debut, "");
  assert.equal(ce.fin, "CR_16.pdf");
});

test("rien d'illisible ne fait tomber le découpage", () => {
  for (const rien of [null, undefined, 0, false, {}]) {
    const ce = ceQuUnNomMontre(rien);
    assert.equal(typeof ce.debut, "string");
    assert.equal(typeof ce.fin, "string");
    assert.equal(typeof ce.titre, "string");
  }
});

/* ── L'infobulle ──────────────────────────────────────────────────────────── */

/**
 * **Le nom entier est toujours là**, et c'est assumé. La version qui comptait
 * les caractères savait si elle avait coupé ; celle-ci ne peut pas le savoir,
 * puisque c'est le navigateur qui coupe. Entre une infobulle parfois redondante
 * et un nom qu'on ne peut plus retrouver, on garde l'infobulle.
 */
test("l'infobulle porte le nom entier, long ou court", () => {
  assert.equal(ceQuUnNomMontre(TROIS).titre, TROIS);
  assert.equal(ceQuUnNomMontre("CR_16.pdf").titre, "CR_16.pdf");
  assert.equal(ceQuUnNomMontre("  CR_16.pdf  ").titre, "CR_16.pdf");
});
