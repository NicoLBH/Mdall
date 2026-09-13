import test from "node:test";
import assert from "node:assert/strict";

import { ECART, SCHEMA_DES_SUJETS, sujetsAuFormatDuMoteur, verifierLesSujets } from "./sujets-du-modele.js";

/** Un compte rendu, dans la forme qu'une extraction de PDF rend. Aucun nom réel. */
const PAGES = [
  {
    page: 3,
    text: "LOT 02 — GROS ŒUVRE\n12.02.1  Le ferraillage du voile V12 ne suit pas le plan BA-102. Entreprise du lot 02 — pour le 10/09"
  },
  {
    page: 4,
    text: "LOT 05 — ÉTANCHÉITÉ\n12.05.2  Les relevés d'étanchéité en toiture terrasse restent à reprendre."
  }
];

const lu = (reste = {}) => ({
  lot: "02 — GROS ŒUVRE", reference: "12.02.1",
  titre: "Le ferraillage du voile V12 ne suit pas le plan BA-102",
  description: "Le ferraillage du voile V12 ne suit pas le plan BA-102.",
  qui: "Entreprise du lot 02", echeance: "10/09", etat: "nouveau", page: 3,
  citation: "12.02.1  Le ferraillage du voile V12 ne suit pas le plan BA-102.",
  ...reste
});

/* ── Le garde-fou : la citation ──────────────────────────────────────────── */

/**
 * Le garde-fou pèse plus lourd ici que pour un avis. Un avis inventé porte un
 * code que la légende ne connaît pas ; un point à traiter inventé est
 * **plausible**. Sans la citation, rien ne le distinguerait d'un vrai — et l'on
 * ouvrirait un sujet sur un chantier réel pour une phrase que personne n'a
 * écrite.
 */
test("un point dont la citation se retrouve dans le compte rendu entre", () => {
  const { retenus, ecartes } = verifierLesSujets({ sujets: [lu()], pages: PAGES });

  assert.equal(retenus.length, 1);
  assert.equal(retenus[0].citationVerifiee, true);
  assert.deepEqual(ecartes, []);
});

test("un point plausible que personne n'a écrit n'entre pas", () => {
  const invente = lu({
    reference: "12.09.3",
    titre: "Reprise d'étanchéité en toiture terrasse du bâtiment B",
    citation: "12.09.3  Reprise d'étanchéité en toiture terrasse du bâtiment B."
  });

  const { retenus, ecartes } = verifierLesSujets({ sujets: [invente], pages: PAGES });

  assert.deepEqual(retenus, []);
  assert.equal(ecartes[0].motif, ECART.INTROUVABLE);
});

test("un point sans citation n'entre pas non plus", () => {
  const { ecartes } = verifierLesSujets({ sujets: [lu({ citation: "" })], pages: PAGES });
  assert.equal(ecartes[0].motif, ECART.SANS_CITATION);
});

/**
 * Ce qui fait qu'une ligne n'est pas un point à traiter est **le titre**, et
 * lui seul. Beaucoup de comptes rendus ne numérotent rien : exiger une
 * référence ferait perdre l'essentiel de ce qu'ils portent.
 */
test("une ligne sans titre n'est pas un point à traiter", () => {
  const { ecartes } = verifierLesSujets({ sujets: [lu({ titre: "" })], pages: PAGES });
  assert.equal(ecartes[0].motif, ECART.VIDE);
});

test("un point sans numéro entre quand même", () => {
  const sansNumero = lu({ reference: null, lot: null, echeance: null, qui: null, etat: null });
  assert.equal(verifierLesSujets({ sujets: [sansNumero], pages: PAGES }).retenus.length, 1);
});

test("une page annoncée fausse se corrige, elle ne fait pas perdre le point", () => {
  const { retenus, pagesCorrigees } = verifierLesSujets({
    sujets: [lu({ page: 9 })], pages: PAGES
  });

  assert.equal(retenus.length, 1);
  assert.equal(retenus[0].page, 3, "la vraie page");
  assert.equal(retenus[0].pageVerifiee, false);
  assert.equal(pagesCorrigees, 1);
});

/* ── La forme qu'une proposition attend ──────────────────────────────────── */

test("un point lu prend la forme d'une proposition de sujet", () => {
  const [sujet] = sujetsAuFormatDuMoteur(
    verifierLesSujets({ sujets: [lu()], pages: PAGES }).retenus,
    { sourceId: "doc-1" }
  );

  assert.equal(sujet.titre, "Le ferraillage du voile V12 ne suit pas le plan BA-102");
  assert.equal(sujet.lot, "02 — GROS ŒUVRE");
  assert.equal(sujet.qui, "Entreprise du lot 02");
  assert.equal(sujet.echeance, "10/09");
  assert.equal(sujet.provenance.source_id, "doc-1");
  assert.equal(sujet.provenance.page, 3);
  assert.match(sujet.provenance.excerpt, /12\.02\.1/);
});

/**
 * Un compte rendu reporte ses points d'une réunion à la suivante. Si la clé
 * changeait à chaque lecture, la douzième réunion rouvrirait douze fois le même
 * point — c'est le numéro du document qui la fait, quand il en donne un.
 */
test("le numéro du compte rendu fait la clé, pour que le report se reconnaisse", () => {
  const [depuisLe12] = sujetsAuFormatDuMoteur([lu()], { sourceId: "doc-12" });
  const [depuisLe13] = sujetsAuFormatDuMoteur([lu()], { sourceId: "doc-13" });

  assert.equal(depuisLe12.key, "cr:12.02.1");
  assert.equal(depuisLe13.key, depuisLe12.key, "le même point, lu deux fois, a la même clé");
});

test("sans numéro, la clé se rabat sur le document et le rang", () => {
  const rendus = sujetsAuFormatDuMoteur(
    [lu({ reference: null }), lu({ reference: null, titre: "Un autre point" })],
    { sourceId: "doc-1" }
  );

  assert.deepEqual(rendus.map((sujet) => sujet.key), ["cr:doc-1:1", "cr:doc-1:2"]);
});

/* ── Ce qu'on ne demande pas au modèle ───────────────────────────────────── */

/**
 * Ni priorité, ni gravité, ni urgence : un compte rendu ne les écrit pas, et
 * les deviner ferait classer un chantier sur une intuition.
 */
test("le schéma ne demande aucun jugement", () => {
  const champs = Object.keys(SCHEMA_DES_SUJETS.schema.properties.sujets.items.properties);

  for (const interdit of ["priorite", "priority", "gravite", "urgence", "criticite"]) {
    assert.ok(!champs.includes(interdit), `le schéma demande « ${interdit} »`);
  }
  assert.ok(champs.includes("citation"), "sans quoi rien n'est vérifiable");
  assert.ok(champs.includes("lot"), "le lot, tel qu'écrit");
  assert.equal(SCHEMA_DES_SUJETS.strict, true);
});

/* ── Le rapprochement avec ce que le projet suit déjà ────────────────────── */

/**
 * **Un identifiant inventé égare un point, il ne le perd pas.** Rattaché à la
 * discussion d'un sujet qui n'a rien à voir, personne n'ira le chercher — et
 * rien ne le signalera. Le point n'est pas perdu, il est égaré, ce qui ne se
 * voit jamais (règle 5).
 */
test("un rapprochement vers un sujet qu'on n'a pas envoyé est écarté", async () => {
  const { verifierLesRapprochements } = await import("./sujets-du-modele.js");

  const { sujets, ecartes } = verifierLesRapprochements({
    sujets: [
      { titre: "Étanchéité", sujet_existant: "s-1", raison_du_rapprochement: "même numéro" },
      { titre: "Linteaux", sujet_existant: "s-inventé", raison_du_rapprochement: "au feeling" },
      { titre: "Neuf", sujet_existant: null, raison_du_rapprochement: null }
    ],
    connus: [{ id: "s-1" }, { id: "s-2" }]
  });

  assert.equal(ecartes, 1);
  assert.equal(sujets[0].sujet_existant, "s-1");
  assert.equal(sujets[0].raison_du_rapprochement, "même numéro");

  // Écarté, pas corrigé : le point reste, et il repart comme un point neuf.
  assert.equal(sujets[1].titre, "Linteaux");
  assert.equal(sujets[1].sujet_existant, null);
  assert.equal(sujets[1].raison_du_rapprochement, null, "la raison d'un rapprochement faux resterait affichée");

  assert.equal(sujets[2].sujet_existant, null);
});

/** Sans liste envoyée, aucun rapprochement ne peut être permis. */
test("sans sujets envoyés, aucun rapprochement ne passe", async () => {
  const { verifierLesRapprochements } = await import("./sujets-du-modele.js");

  const { sujets, ecartes } = verifierLesRapprochements({
    sujets: [{ titre: "x", sujet_existant: "s-1" }],
    connus: []
  });

  assert.equal(ecartes, 1);
  assert.equal(sujets[0].sujet_existant, null);
});

/**
 * **Maigre, et c'est voulu.** Un identifiant, un numéro, un titre, un état : de
 * quoi reconnaître, pas de quoi raisonner sur autre chose.
 */
test("ce que le projet suit se dit en une ligne par sujet", async () => {
  const { sujetsDuProjetEnTexte } = await import("./sujets-du-modele.js");

  const dit = sujetsDuProjetEnTexte([
    { id: "s-1", subject_number: 12, title: "Étanchéité toiture", status: "open" },
    { id: "s-2", title: "Linteaux bois" },
    { id: "", title: "sans identifiant" },
    { id: "s-3", title: "" }
  ]);

  assert.match(dit, /- s-1 #12 \[open\] : Étanchéité toiture/);
  assert.match(dit, /- s-2 : Linteaux bois/);
  // Un sujet sans identifiant ne peut pas être rapproché : l'envoyer ferait
  // rendre au modèle un identifiant vide, donc écarté, sans qu'on sache pourquoi.
  assert.doesNotMatch(dit, /sans identifiant/);
  assert.doesNotMatch(dit, /s-3/);
});

/**
 * **L'absence de liste n'est pas une liste vide.** Rendre un bloc vide dirait
 * au modèle que le projet ne suit rien, ce qui n'est pas la même chose que de
 * ne pas savoir (règle 5).
 */
test("sans sujets, on n'annonce pas que le projet n'en a aucun", async () => {
  const { sujetsDuProjetEnTexte } = await import("./sujets-du-modele.js");

  assert.equal(sujetsDuProjetEnTexte([]), "");
  assert.equal(sujetsDuProjetEnTexte(null), "");
});

/** La consigne dit ce qu'il faut faire du rapprochement, et ce qu'il ne faut pas. */
test("la consigne demande le rapprochement et interdit de l'inventer", async () => {
  const { CONSIGNES } = await import("./sujets-du-modele.js");

  assert.match(CONSIGNES, /sujet_existant/);
  assert.match(CONSIGNES, /RECOPIÉ CARACTÈRE POUR CARACTÈRE/);
  assert.match(CONSIGNES, /N'invente JAMAIS un identifiant/);
  // Le cas que la comparaison de titres ne sait pas voir, nommé dans la consigne.
  assert.match(CONSIGNES, /pose prévue demain/);
  // Et le doute, qui penche du côté le moins coûteux.
  assert.match(CONSIGNES, /Dans le doute, laisse null/);
});
