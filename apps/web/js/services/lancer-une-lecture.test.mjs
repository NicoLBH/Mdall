/**
 * Lancer une lecture de comptes rendus, et rendre la main.
 *
 * Le contrat est en tête de `lancer-une-lecture.js`. Ce qu'on éprouve ici
 * est le seul point qui compte : **l'écran ne doit rien attendre**.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  GESTE_DES_CR, lancerUneLecture, leMotDuDepart, lesDocumentsAEnvoyer
} from "./lancer-une-lecture.js";
import { FAMILLE, TOUTES } from "./les-familles-de-document.js";

const DES_ENTREES = [
  { type: "dossier", id: "f1", nom: "Archives", choisissable: false },
  { type: "fichier", id: "d3", nom: "CR 03.pdf", choisissable: true },
  { type: "fichier", id: "d1", nom: "CR 01.pdf", choisissable: true },
  { type: "fichier", id: "d2", nom: "scan.tiff", choisissable: false }
];

/**
 * **L'identifiant et le nom, rien d'autre.** Le nom sert à dire lequel a
 * résisté ; le seau, le chemin et le type se relisent depuis la ligne du
 * document, qui est la seule vérité sur l'endroit où il vit (règle 10).
 */
test("on envoie des identifiants, jamais des chemins", () => {
  const envoyes = lesDocumentsAEnvoyer(new Set(["d1", "d3"]), DES_ENTREES);

  assert.deepEqual(envoyes, [
    { id: "d1", nom: "CR 01.pdf" },
    { id: "d3", nom: "CR 03.pdf" }
  ]);
});

test("ce qui ne se lit pas ne s'envoie pas", () => {
  assert.deepEqual(lesDocumentsAEnvoyer(new Set(["d2", "f1"]), DES_ENTREES), []);
  assert.deepEqual(lesDocumentsAEnvoyer(null, DES_ENTREES), []);
});

/**
 * **Le seul point qui compte : l'écran n'attend pas.**
 *
 * La file tournait dans l'onglet et le bloquait une heure. Le réveil se lance
 * sans être attendu — et pour l'éprouver, on en pose un qui ne se résout
 * jamais : si quelqu'un l'attendait, cette épreuve ne finirait pas.
 */
test("le lancement n'attend pas le serveur", async () => {
  let reveille = false;
  const parti = await lancerUneLecture([{ id: "d1", nom: "CR 01.pdf" }], {
    projectId: "p1",
    portes: {
      poserLaLigne: async () => "v1",
      reveiller: () => { reveille = true; return new Promise(() => {}); }
    }
  });

  assert.deepEqual(parti, { parti: true, versementId: "v1", motif: "" });
  assert.equal(reveille, true, "le serveur n'a pas été réveillé");
});

/**
 * **Un réveil qui ne part pas n'est pas un échec.**
 *
 * La ligne est posée : c'est elle qui compte, et le prochain réveil la prendra.
 * Rendre `parti: false` ferait croire que rien n'est demandé, et l'on
 * relancerait — deux lectures des mêmes dix-neuf comptes rendus, et deux
 * factures.
 */
test("un réveil qui échoue ne défait pas la demande", async () => {
  const parti = await lancerUneLecture([{ id: "d1", nom: "CR 01.pdf" }], {
    projectId: "p1",
    portes: {
      poserLaLigne: async () => "v1",
      reveiller: () => { throw new Error("réseau coupé"); }
    }
  });

  assert.equal(parti.parti, true, "une demande posée est annoncée perdue");
  assert.equal(parti.versementId, "v1");
});

/** La ligne, elle, doit porter le geste : sans lui, c'est un dépôt de mails. */
test("la ligne posée dit ce qu'elle demande", async () => {
  let posee = null;
  await lancerUneLecture([{ id: "d1", nom: "CR 01.pdf" }], {
    projectId: "p1",
    portes: { poserLaLigne: async (quoi) => { posee = quoi; return "v1"; }, reveiller: () => {} }
  });

  assert.equal(posee.geste, GESTE_DES_CR);
  assert.equal(posee.projectId, "p1");
  assert.deepEqual(posee.documents, [{ id: "d1", nom: "CR 01.pdf" }]);
});

test("sans ligne posée, rien n'est parti", async () => {
  const sansId = await lancerUneLecture([{ id: "d1", nom: "a" }], {
    projectId: "p1", portes: { poserLaLigne: async () => "", reveiller: () => {} }
  });
  assert.equal(sansId.parti, false);

  const casse = await lancerUneLecture([{ id: "d1", nom: "a" }], {
    projectId: "p1",
    portes: { poserLaLigne: async () => { throw new Error("refusé"); }, reveiller: () => {} }
  });
  assert.equal(casse.parti, false);
  assert.match(casse.motif, /refusé/);
});

test("rien à lire, aucun projet, aucune porte : on ne pose rien", async () => {
  assert.equal((await lancerUneLecture([], { projectId: "p1", portes: {} })).parti, false);
  assert.equal((await lancerUneLecture([{ id: "d1" }], { portes: {} })).parti, false);
  assert.equal((await lancerUneLecture([{ id: "d1" }], { projectId: "p1" })).parti, false);
});

/**
 * **Elle ne dit pas « c'est lu »**, parce que ce n'est pas lu : c'est parti.
 * Annoncer la fin au moment du départ ferait chercher une proposition qui
 * n'existe pas encore.
 */
test("le mot du départ renvoie vers Actions, et annonce une seule proposition", () => {
  const dit = leMotDuDepart(19);
  assert.match(dit, /19 comptes rendus envoyés/);
  assert.match(dit, /suivez-la dans Actions/);
  assert.match(dit, /une seule proposition/);
  assert.doesNotMatch(dit, /lus|terminé/i);

  assert.equal(leMotDuDepart(0), "");
  assert.match(leMotDuDepart(1), /1 compte rendu envoyé/);
});

/* ── Une lecture, quelle que soit la famille ──────────────────────────────── */

test("le geste posé est la clé de la famille", async () => {
  const posees = [];
  const portes = {
    poserLaLigne: async (quoi) => { posees.push(quoi); return "v-1"; },
    reveiller: () => {}
  };

  for (const famille of [FAMILLE.MAIL, FAMILLE.CONTROLE, FAMILLE.CR]) {
    await lancerUneLecture([{ id: "d-1", nom: "Un.pdf" }], {
      projectId: "p-1", portes, famille
    });
  }

  // C'est tout l'intérêt : la fonction de bord déclarée dans le registre cherche
  // exactement ce mot-là.
  assert.deepEqual(posees.map((une) => une.geste),
    [FAMILLE.MAIL, FAMILLE.CONTROLE, FAMILLE.CR]);
});

test("une famille qui ne se lit pas ne pose pas de ligne", async () => {
  // La vue d'ensemble n'a ni fonction de bord ni table : poser sa ligne ferait
  // une file qu'aucun serveur ne prendrait, en attente pour toujours (règle 5).
  let posee = false;
  const parti = await lancerUneLecture([{ id: "d-1", nom: "Un.pdf" }], {
    projectId: "p-1", famille: TOUTES,
    portes: { poserLaLigne: async () => { posee = true; return "v-1"; } }
  });

  assert.equal(parti.parti, false);
  assert.match(parti.motif, /ne se lit pas/);
  assert.equal(posee, false);
});

test("ce qui attend à la fin n'est pas le même pour toutes les familles", () => {
  // Un compte rendu donne une proposition à signer ; un rapport donne une lecture
  // conservée. Annoncer une proposition qui n'existera pas la ferait chercher.
  assert.match(leMotDuDepart(19, FAMILLE.CR), /19 comptes rendus envoyés/);
  assert.match(leMotDuDepart(19, FAMILLE.CR), /une seule proposition/);

  assert.match(leMotDuDepart(2, FAMILLE.CONTROLE), /2 rapports envoyés/);
  assert.match(leMotDuDepart(2, FAMILLE.CONTROLE), /Rien n'entrera en mémoire/);
  assert.doesNotMatch(leMotDuDepart(2, FAMILLE.CONTROLE), /proposition/);

  assert.match(leMotDuDepart(1, FAMILLE.MAIL), /1 fil envoyé/);
  assert.equal(leMotDuDepart(0, FAMILLE.MAIL), "");
});
