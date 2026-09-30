import test from "node:test";
import assert from "node:assert/strict";

import { envoyerLesMails, leCheminDunDepot, leMotDuDepart } from "./la-file-des-versements.js";

const MOI = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const unFichier = (nom, octets = 12) =>
  new File([new Uint8Array(octets)], nom, { type: "message/rfc822" });

/** Une file et un casier en mémoire, qui refusent comme les vrais. */
function unBanc({ monteeRate = [] } = {}) {
  const etat = { lignes: [], casier: [], reveils: 0 };
  let compteur = 0;

  return {
    etat,
    portes: {
      quiDepose: async () => MOI,
      poserLaLigne: async ({ projectId }) => {
        compteur += 1;
        const id = `versement-${compteur}`;
        etat.lignes.push({ id, projectId, statut: "en_attente", fichiers: [] });
        return id;
      },
      monter: async (chemin, fichier) => {
        if (monteeRate.includes(fichier?.name)) throw new Error("casier plein");
        etat.casier.push(chemin);
      },
      completerLaLigne: async (id, fichiers) => {
        const ligne = etat.lignes.find((une) => une.id === id);
        if (ligne) ligne.fichiers = fichiers;
      },
      reveiller: () => { etat.reveils += 1; }
    }
  };
}

test("le chemin commence par celui qui dépose", () => {
  // La politique d'écriture du casier l'exige : `(storage.foldername(name))[1]`
  // doit être l'identifiant de la session.
  const chemin = leCheminDunDepot({
    quiDepose: MOI, projectId: "p-1", versementId: "v-1", nom: "RE_ Lot 3.msg"
  });
  assert.ok(chemin.startsWith(`${MOI}/`), chemin);
  assert.match(chemin, /\/versements\/v-1\//);
  // Le nom est assaini : un chemin porte mal les espaces et les accents.
  assert.match(chemin, /RE__Lot_3\.msg$/);
});

test("deux dépôts du même fichier ne s'écrasent pas", () => {
  const un = leCheminDunDepot({ quiDepose: MOI, projectId: "p", versementId: "v-1", nom: "a.eml" });
  const deux = leCheminDunDepot({ quiDepose: MOI, projectId: "p", versementId: "v-2", nom: "a.eml" });
  assert.notEqual(un, deux);
});

test("le mot du départ ne dit pas que c'est rangé", () => {
  // Annoncer la fin au moment du départ ferait chercher dans « Mails » des
  // messages qui arrivent encore.
  const dit = leMotDuDepart(24);
  assert.match(dit, /24 fichiers envoyés/);
  assert.match(dit, /Actions/);
  assert.doesNotMatch(dit, /rangé/);
  assert.equal(leMotDuDepart(1), "1 fichier envoyé — le rangement se fait sur le serveur, suivez-le dans Actions.");
  assert.equal(leMotDuDepart(0), "");
});

test("un dépôt monte les octets, complète la ligne et réveille le serveur", async () => {
  const { etat, portes } = unBanc();
  const parti = await envoyerLesMails([unFichier("un.eml"), unFichier("deux.eml")],
    { projectId: "p-1", portes });

  assert.equal(parti.parti, true, parti.motif);
  assert.equal(etat.casier.length, 2);
  assert.equal(etat.lignes[0].fichiers.length, 2);
  assert.equal(etat.lignes[0].statut, "en_attente");
  assert.equal(etat.reveils, 1);
});

test("la ligne naît vide : une montée coupée ne laisse pas un demi-dépôt", async () => {
  // Si la montée s'arrête à mi-chemin, le serveur ne doit pas trouver la moitié
  // d'un dépôt à verser.
  const { etat, portes } = unBanc();
  const vues = [];
  await envoyerLesMails([unFichier("un.eml")], {
    projectId: "p-1",
    portes: { ...portes, completerLaLigne: async (id, f) => { vues.push(etat.lignes[0].fichiers.length); await portes.completerLaLigne(id, f); } }
  });
  assert.deepEqual(vues, [0], "la ligne portait déjà des fichiers avant la montée");
});

test("un fichier qui ne monte pas ne fait pas tomber les autres", async () => {
  const { etat, portes } = unBanc({ monteeRate: ["deux.eml"] });
  const parti = await envoyerLesMails(
    [unFichier("un.eml"), unFichier("deux.eml"), unFichier("trois.eml")],
    { projectId: "p-1", portes }
  );
  assert.equal(parti.parti, true);
  assert.equal(etat.lignes[0].fichiers.length, 2);
  assert.deepEqual(etat.lignes[0].fichiers.map((un) => un.nom), ["un.eml", "trois.eml"]);
});

test("si rien ne monte, le dépôt n'est pas dit parti", async () => {
  const { portes } = unBanc({ monteeRate: ["un.eml"] });
  const parti = await envoyerLesMails([unFichier("un.eml")], { projectId: "p-1", portes });
  assert.equal(parti.parti, false);
  assert.match(parti.motif, /aucun fichier/);
});

test("sans déposant connu, rien ne part", async () => {
  // Le serveur écrit le déposant sur chaque document, et c'est lui qui garde la
  // correspondance : partir sans le savoir publierait ce qu'on croit ranger.
  const { etat, portes } = unBanc();
  const parti = await envoyerLesMails([unFichier("un.eml")], {
    projectId: "p-1", portes: { ...portes, quiDepose: async () => "" }
  });
  assert.equal(parti.parti, false);
  assert.match(parti.motif, /session/);
  assert.equal(etat.lignes.length, 0, "une ligne a été posée sans déposant");
  assert.equal(etat.casier.length, 0);
});

test("sans projet, sans portes, sans fichier : rien ne part", async () => {
  const { portes } = unBanc();
  assert.equal((await envoyerLesMails([], { projectId: "p-1", portes })).parti, false);
  assert.equal((await envoyerLesMails([unFichier("a.eml")], { portes })).parti, false);
  assert.equal((await envoyerLesMails([unFichier("a.eml")], { projectId: "p-1" })).parti, false);
});

test("un réveil qui échoue ne fait pas échouer le dépôt", async () => {
  // La ligne reste en attente : le prochain réveil prendra la plus ancienne.
  const { etat, portes } = unBanc();
  const parti = await envoyerLesMails([unFichier("un.eml")], {
    projectId: "p-1",
    portes: { ...portes, reveiller: () => { throw new Error("fonction non déployée"); } }
  });
  assert.equal(parti.parti, true, "le dépôt a échoué pour un réveil raté");
  assert.equal(etat.lignes[0].fichiers.length, 1);
});

test("l'avancement se dit fichier par fichier pendant la montée", async () => {
  const vus = [];
  const { portes } = unBanc();
  await envoyerLesMails([unFichier("a.eml"), unFichier("b.eml"), unFichier("c.eml")],
    { projectId: "p-1", portes, avance: (combien) => vus.push(combien) });
  assert.deepEqual(vus, [1, 2, 3]);
});
