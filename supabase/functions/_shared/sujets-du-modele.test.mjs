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

/* ── Les labels : une liste fermée, et une porte ─────────────────────────── */

/**
 * **Un label inventé n'est pas une étiquette de trop.** C'est une étiquette que
 * le projet portera pour toujours, à côté de celle qui disait déjà la même
 * chose — et personne ne nettoiera.
 */
test("un label hors de la liste est écarté, et se compte", async () => {
  const { verifierLesLabels } = await import("./sujets-du-modele.js");

  const { sujets, ecartes } = verifierLesLabels({
    sujets: [
      { titre: "a", labels: ["Urgent", "Prioritaire"] },
      { titre: "b", labels: ["À traiter vite"] },
      { titre: "c", labels: [] },
      { titre: "d" }
    ]
  });

  assert.deepEqual(sujets[0].labels, ["Urgent"]);
  assert.deepEqual(sujets[1].labels, []);
  assert.deepEqual(sujets[2].labels, []);
  assert.deepEqual(sujets[3].labels, []);
  assert.deepEqual(ecartes, ["Prioritaire", "À traiter vite"]);
});

/**
 * La casse et les accents ne comptent pas — mais le label retenu porte
 * l'écriture officielle : sans quoi le projet finirait avec « Urgent » et
 * « urgent », que la base compte pour deux.
 */
test("un label mal capitalisé est retenu dans son écriture officielle", async () => {
  const { verifierLesLabels } = await import("./sujets-du-modele.js");

  const { sujets, ecartes } = verifierLesLabels({
    sujets: [{ labels: ["urgent", "INFORMATION GENERALE", "rappel"] }]
  });

  assert.deepEqual(sujets[0].labels, ["Urgent", "Information générale", "Rappel"]);
  assert.deepEqual(ecartes, []);
});

/** Un point qui porte deux fois le même label ne le porte qu'une fois. */
test("un label répété ne se pose qu'une fois", async () => {
  const { verifierLesLabels } = await import("./sujets-du-modele.js");

  const { sujets } = verifierLesLabels({ sujets: [{ labels: ["Urgent", "urgent", "URGENT"] }] });
  assert.deepEqual(sujets[0].labels, ["Urgent"]);
});

/** La consigne dit de ne pas juger : on relève ce qui est écrit. */
test("la consigne interdit de qualifier au jugé", async () => {
  const { CONSIGNES } = await import("./sujets-du-modele.js");

  assert.match(CONSIGNES, /Ne pose jamais `Urgent` parce que le sujet te semble grave/);
  assert.match(CONSIGNES, /Un point peut n'en porter aucun/);
});

/**
 * **La liste est fermée, et ce n'est pas une limitation, c'est le point.** Un
 * modèle libre d'inventer des labels en produit quinze en trois comptes rendus :
 * « Urgent », « Très urgent », « Prioritaire », « À traiter vite ». Aucun filtre
 * ne trouve plus rien, et personne ne nettoiera.
 *
 * Une fonction Edge ne peut pas importer hors de `supabase/functions/` : la
 * liste y est donc écrite deux fois. Ce test est ce qui empêche les deux
 * écritures de diverger — la seule façon, ici, d'avoir un nom qui vit à un seul
 * endroit (règle 10).
 *
 * Il est de ce côté-ci, et pas de l'autre : aucun fichier servi au navigateur
 * ne remonte vers le serveur, tests compris.
 */
test("les labels du serveur et ceux du navigateur sont les mêmes", async () => {
  const { LABELS_DE_QUALIFICATION } = await import("./sujets-du-modele.js");
  const site = await import("../../../apps/web/js/services/label-du-cr.js");

  assert.deepEqual(LABELS_DE_QUALIFICATION, site.LABELS_DE_QUALIFICATION);

  // Et la consigne explique chacun au modèle : une liste fermée dont un membre
  // n'est pas défini est une liste que le modèle remplira au jugé.
  const { CONSIGNES } = await import("./sujets-du-modele.js");
  for (const nom of LABELS_DE_QUALIFICATION) {
    assert.match(CONSIGNES, new RegExp(nom), `« ${nom} » n'est pas expliqué au modèle`);
    assert.ok(site.QUOI_DU_LABEL[nom], `« ${nom} » n'a pas de définition à l'écran`);
  }
  assert.match(CONSIGNES, /N'invente AUCUN autre label/);
});

/* ── Nommer la panne, sans recopier la consigne ──────────────────────────── */

/**
 * **« La lecture a été refusée » ne dit rien** : ni à qui la lit, ni à qui doit
 * la réparer. Le document était-il trop long, le modèle absent, la clé expirée,
 * le schéma invalide ? Quatre pannes, une seule phrase, et chacune se corrige
 * autrement.
 */
test("une panne du fournisseur se nomme en trois champs", async () => {
  const { panneDuFournisseur } = await import("./sujets-du-modele.js");

  const nommee = panneDuFournisseur(JSON.stringify({
    error: { type: "invalid_request_error", code: "model_not_found", message: "The model does not exist" }
  }), 404);

  assert.deepEqual(nommee, {
    status: 404,
    type: "invalid_request_error",
    code: "model_not_found",
    message: "The model does not exist"
  });
});

/**
 * **On ne renvoie pas le corps de l'erreur.** Il peut contenir un écho de ce
 * qu'on a envoyé — c'est-à-dire la consigne, qui décrit ce que Mdall sait lire
 * d'un document de chantier et ne descend pas dans le navigateur.
 */
test("le corps de l'erreur ne remonte jamais tel quel", async () => {
  const { panneDuFournisseur } = await import("./sujets-du-modele.js");

  const corps = JSON.stringify({
    error: { message: "Invalid value", type: "invalid_request_error" },
    input: "Tu lis un compte rendu de réunion de chantier et tu en extrais les points à traiter."
  });

  const nommee = panneDuFournisseur(corps, 400);
  const dit = Object.values(nommee).join(" ");

  assert.doesNotMatch(dit, /compte rendu de réunion de chantier/);
  assert.equal(nommee.message, "Invalid value");

  // Et ce qui remonte reste court : une panne se nomme, elle ne se raconte pas.
  for (const champ of ["type", "code", "message"]) {
    assert.ok(nommee[champ].length <= 300, `« ${champ} » n'est pas coupé court`);
  }
});

/**
 * Ne pas savoir se dit. Inventer une explication vraisemblable serait pire que
 * de n'en donner aucune (règle 5).
 */
test("une panne que le fournisseur n'a pas nommée se dit telle quelle", async () => {
  const { panneDuFournisseur } = await import("./sujets-du-modele.js");

  assert.equal(panneDuFournisseur("<html>502 Bad Gateway</html>", 502).message,
    "le fournisseur n'a pas nommé la panne");
  assert.deepEqual(panneDuFournisseur("", 0), { status: 0, type: "", code: "", message: "" });
});

/**
 * **Coupée n'est pas refusée.** Une réponse tronquée au milieu du JSON ne se
 * relit pas, et l'écran annonçait « la lecture a été refusée » : c'était faux,
 * elle avait eu lieu et elle avait été payée. C'est cette panne-là qui a rendu
 * tout ce diagnostic nécessaire.
 */
test("le plafond de sortie tient compte de ce qu'un point porte maintenant", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const source = readFileSync(
    fileURLToPath(new URL("../extract-sujets/index.ts", import.meta.url)), "utf8"
  );

  const plafond = Number(source.match(/const MAX_JETONS = (\d+)/)?.[1]);
  assert.ok(plafond >= 24000, `le plafond de sortie est retombé à ${plafond}`);

  // Et une réponse coupée se reconnaît, au lieu de passer pour un refus.
  assert.match(source, /incomplete/);
  assert.match(source, /reponse_coupee/);
});

/**
 * **Le vocabulaire des liens est fermé par la base**, pas par la consigne :
 * `subject_links` contraint `link_type`, et la hiérarchie vit dans
 * `subjects.parent_subject_id`. Un type que la consigne proposerait sans que la
 * base l'accepte produirait un lien qui disparaît à la fusion, sans trace ; un
 * type accepté que la consigne ne nomme pas ne serait jamais rendu.
 *
 * Comme pour les labels, la liste est écrite des deux côtés de la cloison — une
 * fonction Edge ne peut pas importer hors de `supabase/functions/`. Ce test est
 * ce qui empêche les deux écritures de diverger (règle 10), et il est de ce
 * côté-ci : aucun fichier servi au navigateur ne remonte vers le serveur.
 */
test("les types de lien du serveur et ceux du navigateur sont les mêmes", async () => {
  const { CONSIGNES } = await import("./sujets-du-modele.js");
  const { LIEN, QUOI_DU_LIEN } = await import("../../../apps/web/js/services/liens-du-cr.js");

  for (const type of Object.values(LIEN)) {
    assert.match(CONSIGNES, new RegExp(`\`${type}\``), `« ${type} » n'est pas expliqué au modèle`);
    assert.ok(QUOI_DU_LIEN[type], `« ${type} » ne dit pas ce qu'il faut avoir lu`);
  }

  // Et la consigne n'en propose aucun de plus : chaque `x` en liste à puces
  // sous les dépendances doit être un type que la base accepte.
  const bloc = CONSIGNES.slice(CONSIGNES.indexOf("LES DÉPENDANCES ENTRE POINTS"));
  const proposes = [...bloc.slice(0, bloc.indexOf("Chaque lien porte UNE cible")).matchAll(/^- `([a-z_]+)`/gm)]
    .map(([, type]) => type);

  assert.deepEqual(proposes.sort(), Object.values(LIEN).sort());
});

/**
 * **Un lien inventé sera cru.** C'est le genre d'affirmation que personne ne
 * vérifie : deux lignes reliées à l'écran ont l'air d'un fait. La consigne doit
 * donc dire que la liste vide est le cas normal — sinon le modèle, cherchant à
 * bien faire, remplit.
 */
test("la consigne interdit d'inventer une dépendance, et normalise la liste vide", async () => {
  const { CONSIGNES } = await import("./sujets-du-modele.js");

  assert.match(CONSIGNES, /N'invente AUCUNE dépendance/);
  assert.match(CONSIGNES, /le cas le plus fréquent/);
  assert.match(CONSIGNES, /Un point ne se lie jamais à lui-même/);
  // Une cible, et une seule : les deux se résolvent différemment à la fusion.
  assert.match(CONSIGNES, /Remplis l'un OU l'autre, jamais les deux/);
  // Et la raison est recopiée du document, pas rédigée par le modèle.
  assert.match(CONSIGNES, /la phrase du document qui établit la dépendance, recopiée/);
});
