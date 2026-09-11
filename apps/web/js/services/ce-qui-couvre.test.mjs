import test from "node:test";
import assert from "node:assert/strict";

import {
  ORDRE_DES_RANGS, RANG, ceQuiCouvre, couvertureDuProjet, organismeNomme,
  phraseDeLaCouvertureDe, phraseDuRang, rangDeLActe, rangEstAuMoins, rangLePlusHaut
} from "./ce-qui-couvre.js";

const acte = (reste = {}) => ({
  id: "acte-1", assertion_id: "neige", verdict: "covers",
  created_at: "2026-03-12T09:00:00Z", declared_by: "u-1", ...reste
});

/* ── Le rang vient de qui s'est engagé ───────────────────────────────────── */

test("un avis de bureau de contrôle pèse plus qu'une relecture interne", () => {
  const bureau = rangDeLActe(acte({ note: "SOCOTEC — Favorable" }));
  const interne = rangDeLActe(acte({ note: "Vérifié sur plan" }));

  assert.equal(bureau, RANG.CONTROLE_TECHNIQUE);
  assert.equal(interne, RANG.INTERNE);
  assert.ok(rangEstAuMoins(bureau, interne));
  assert.ok(!rangEstAuMoins(interne, bureau));
});

test("ce qui n'engage personne ne pèse rien", () => {
  // Un acte qui valide dit qu'on **croit** la valeur ; il ne dit pas qu'on l'a
  // examinée. Les confondre ferait passer une opinion pour un engagement.
  assert.equal(rangDeLActe(acte({ verdict: "validated", note: "SOCOTEC" })), RANG.RIEN);
  assert.equal(rangDeLActe(null), RANG.RIEN);
});

/**
 * Le point le plus contre-intuitif du fichier, et il est délibéré : un rang qui
 * reposerait sur une pièce qu'on n'a pas su attribuer dirait « bureau de
 * contrôle » sans pouvoir nommer lequel.
 */
test("une pièce dont l'organisme n'est pas reconnu ne monte pas le rang", () => {
  const sansNom = acte({ note: "Favorable — Zone de neige", source_document_id: "doc-1" });
  assert.equal(rangDeLActe(sansNom), RANG.INTERNE);
});

test("on ne reconnaît un organisme que sur des mots entiers", () => {
  assert.equal(organismeNomme("Rapport SOCOTEC du 12 mars")?.id, "socotec");
  assert.equal(organismeNomme("Bureau Véritas")?.id, "bureau-veritas");
  assert.equal(organismeNomme("apaverie du chantier"), null);
});

test("c'est l'engagement le plus coûteux qui compte", () => {
  assert.equal(rangLePlusHaut([RANG.INTERNE, RANG.CONTROLE_TECHNIQUE, RANG.RIEN]), RANG.CONTROLE_TECHNIQUE);
  assert.equal(rangLePlusHaut([]), RANG.RIEN);
});

/* ── Le vocabulaire, et ce qu'il ne sait pas encore ──────────────────────── */

/**
 * L'ordre **est** le sens du rang : un rang isolé ne veut rien dire, c'est sa
 * place qui dit ce qu'il coûte de casser ce qu'il couvre.
 */
test("le vocabulaire est ordonné, du plus léger au plus lourd", () => {
  assert.deepEqual(ORDRE_DES_RANGS, [
    RANG.RIEN, RANG.INTERNE, RANG.MAITRISE_DOEUVRE, RANG.CONTROLE_TECHNIQUE, RANG.CONTRACTUEL
  ]);
});

test("deux rangs sont déclarés que rien n'atteint encore, et c'est dit", () => {
  // Mdall ne connaît pas le rôle d'un signataire, ni la nature contractuelle
  // d'une pièce. Les déclarer sans les atteindre vaut mieux que de faire croire
  // qu'ils ne se rencontrent jamais (règle 5) — et le jour où l'un devient
  // dérivable, une ligne suffit.
  const atteints = new Set([
    rangDeLActe(acte({ note: "SOCOTEC" })),
    rangDeLActe(acte({ note: "relu" })),
    rangDeLActe(null)
  ]);

  assert.ok(!atteints.has(RANG.MAITRISE_DOEUVRE));
  assert.ok(!atteints.has(RANG.CONTRACTUEL));
  assert.equal(atteints.size, 3);
});

/**
 * Règle 12 : le mot du métier reste dans le code et ne monte pas à l'écran.
 * Ce qu'on lit est ce qui a été fait, jamais le nom du mécanisme.
 */
test("aucun rang ne se dit avec le vocabulaire d'un outil de visa", () => {
  for (const rang of ORDRE_DES_RANGS) {
    const phrase = phraseDuRang(rang);
    assert.ok(phrase, `${rang} doit avoir une phrase`);
    assert.doesNotMatch(phrase, /vis[ae]|valid|approu|en attente|à faire/i, phrase);
  }
});

/* ── La liste ────────────────────────────────────────────────────────────── */

test("la liste porte de quoi y retourner", () => {
  // Une liste qu'on ne peut pas vérifier est à croire sur parole : l'écran doit
  // pouvoir rouvrir le PDF à sa page.
  const { lignes } = ceQuiCouvre("neige", {
    actes: [acte({ note: "SOCOTEC — Favorable", source_document_id: "doc-1", source_page: 8,
      source_assertion_id: "avis-1" })]
  });

  assert.equal(lignes[0].organisme, "SOCOTEC");
  assert.equal(lignes[0].documentId, "doc-1");
  assert.equal(lignes[0].page, 8);
  assert.equal(lignes[0].avisId, "avis-1");
});

test("qui a signé ne se confond pas avec qui a rendu l'avis", () => {
  const { lignes } = ceQuiCouvre("neige", {
    actes: [acte({ note: "SOCOTEC — Favorable", declared_by: "u-42" })],
    nommer: (id) => (id === "u-42" ? "Le signataire" : id)
  });

  assert.equal(lignes[0].qui, "Le signataire");
  assert.equal(lignes[0].organisme, "SOCOTEC", "et l'organisme reste à part");
});

test("le plus récent examen se lit en premier", () => {
  const { lignes } = ceQuiCouvre("neige", {
    actes: [
      acte({ id: "vieux", created_at: "2025-01-04T09:00:00Z", note: "relu" }),
      acte({ id: "neuf", created_at: "2026-03-12T09:00:00Z", note: "SOCOTEC" })
    ]
  });

  assert.deepEqual(lignes.map((ligne) => ligne.acteId), ["neuf", "vieux"]);
  assert.equal(lignes.length, 2);
});

test("on ne couvre qu'une version, jamais un sujet", () => {
  // C'est ce qui fait qu'un engagement tombe tout seul quand la valeur est
  // remplacée : il portait sur celle d'avant.
  const { couverte } = ceQuiCouvre("vent", { actes: [acte({ assertion_id: "neige", note: "SOCOTEC" })] });
  assert.equal(couverte, false);
});

test("une valeur que personne n'a examinée ne dit rien du tout", () => {
  // Pas « non examinée » sur chaque ligne de la mémoire : un écran qui le
  // répéterait partout aurait l'air de réclamer quelque chose (règle 12).
  const rien = ceQuiCouvre("neige", { actes: [] });

  assert.equal(rien.rang, RANG.RIEN);
  assert.equal(phraseDeLaCouvertureDe(rien), "");
});

/* ── La phrase ───────────────────────────────────────────────────────────── */

test("la phrase nomme l'organisme, la date, et compte s'il y en a plusieurs", () => {
  const une = ceQuiCouvre("neige", { actes: [acte({ note: "SOCOTEC — Favorable" })] });
  assert.equal(phraseDeLaCouvertureDe(une), "Examinée par SOCOTEC le 2026-03-12");

  const deux = ceQuiCouvre("neige", {
    actes: [acte({ note: "SOCOTEC — Favorable" }),
      acte({ id: "acte-2", created_at: "2025-06-01T09:00:00Z", note: "relu" })]
  });
  assert.match(phraseDeLaCouvertureDe(deux), /2 examens/);
});

test("sans organisme, c'est la personne qui se lit", () => {
  const interne = ceQuiCouvre("neige", {
    actes: [acte({ note: "Vérifié sur plan" })], nommer: () => "Le signataire"
  });
  assert.match(phraseDeLaCouvertureDe(interne), /par Le signataire/);
});

/* ── Tout le projet, en une passe ────────────────────────────────────────── */

test("la couverture du projet se calcule en une passe", () => {
  // Un appel par ligne ferait un carré sur une mémoire de milliers
  // d'affirmations.
  const couvertures = couvertureDuProjet({
    actes: [
      acte({ assertion_id: "neige", note: "SOCOTEC" }),
      acte({ id: "acte-2", assertion_id: "vent", note: "relu" }),
      acte({ id: "acte-3", assertion_id: "vent", note: "APAVE" }),
      acte({ id: "acte-4", assertion_id: "sol", verdict: "validated", note: "SOCOTEC" })
    ]
  });

  assert.equal(couvertures.get("neige").rang, RANG.CONTROLE_TECHNIQUE);
  assert.equal(couvertures.get("vent").lignes.length, 2);
  assert.equal(couvertures.get("vent").rang, RANG.CONTROLE_TECHNIQUE, "le plus coûteux l'emporte");
  assert.equal(couvertures.has("sol"), false, "valider n'est pas examiner");
});

test("la date se met en français à l'écran, jamais dans le service", () => {
  // Un service qui formate une locale décide de l'affichage à la place de celui
  // qui affiche — et l'export, lui, veut la date brute.
  const couverture = ceQuiCouvre("neige", { actes: [acte({ note: "SOCOTEC — Favorable" })] });

  assert.match(phraseDeLaCouvertureDe(couverture), /le 2026-03-12$/);
  assert.match(phraseDeLaCouvertureDe(couverture, { dater: () => "12 mars 2026" }), /le 12 mars 2026$/);
});
