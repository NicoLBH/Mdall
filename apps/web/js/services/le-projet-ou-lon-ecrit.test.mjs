import test from "node:test";
import assert from "node:assert/strict";

import {
  cestUnIdDeProjet,
  laConcordanceSansCeProjet,
  leMotDunRefus,
  leProjetDeLaConcordance,
  leProjetOuLonEcrit
} from "./le-projet-ou-lon-ecrit.js";

const UN = "11111111-1111-4111-8111-111111111111";
const DEUX = "22222222-2222-4222-8222-222222222222";

/**
 * Des portes qui comptent ce qu'on leur demande.
 *
 * `lisibles` est ce que la base rend : tout le reste est refusé, exactement
 * comme `projects_owner_only` refuse un projet dont on n'est pas propriétaire.
 */
function portesDeBanc({ lisibles = [], parLeNom = null, muette = false } = {}) {
  const vues = { relues: [], noms: [] };
  return {
    vues,
    portes: {
      relire: async (id) => {
        vues.relues.push(id);
        if (muette) return null;
        return lisibles.includes(id) ? id : "";
      },
      parLeNom: parLeNom
        ? async (nom) => { vues.noms.push(nom); return parLeNom(nom); }
        : undefined
    }
  };
}

test("un identifiant d'écran n'est pas un identifiant de projet", () => {
  assert.equal(cestUnIdDeProjet(UN), true);
  assert.equal(cestUnIdDeProjet("projet-3"), false);
  assert.equal(cestUnIdDeProjet(""), false);
  assert.equal(cestUnIdDeProjet(null), false);
  // Un UUID de version 8 n'est pas ce que `gen_random_uuid()` produit.
  assert.equal(cestUnIdDeProjet("11111111-1111-8111-8111-111111111111"), false);
});

test("la concordance ne rend une piste que si elle a la forme d'un identifiant", () => {
  assert.equal(leProjetDeLaConcordance({ "projet-3": UN }, "projet-3"), UN);
  assert.equal(leProjetDeLaConcordance({ "projet-3": "autre-chose" }, "projet-3"), "");
  assert.equal(leProjetDeLaConcordance({}, "projet-3"), "");
  assert.equal(leProjetDeLaConcordance({ "projet-3": UN }, ""), "");
});

test("oublier une entrée ne touche pas la concordance qu'on a reçu", () => {
  const concordance = { "projet-3": UN, "projet-4": DEUX };
  const suite = laConcordanceSansCeProjet(concordance, "projet-3");
  assert.deepEqual(suite, { "projet-4": DEUX });
  assert.deepEqual(concordance, { "projet-3": UN, "projet-4": DEUX });
});

test("une piste de la concordance que la base accorde est rendue, et rien n'est oublié", async () => {
  const { portes, vues } = portesDeBanc({ lisibles: [UN] });
  const ou = await leProjetOuLonEcrit({
    frontendId: "projet-3", concordance: { "projet-3": UN }, portes
  });
  assert.deepEqual(ou, { id: UN, source: "concordance", aOublier: false, injoignable: false });
  assert.deepEqual(vues.relues, [UN]);
});

test("LE DÉFAUT : une piste de la concordance que la base refuse n'est jamais rendue", async () => {
  // C'est le 403 : la concordance désigne un projet que cette session ne peut pas
  // lire, donc dans lequel elle ne peut pas écrire.
  const { portes } = portesDeBanc({ lisibles: [] });
  const ou = await leProjetOuLonEcrit({
    frontendId: "projet-3", concordance: { "projet-3": UN }, portes
  });
  assert.equal(ou.id, "");
  assert.equal(ou.aOublier, true, "une entrée refusée doit être oubliée");
});

test("une concordance refusé n'empêche pas de trouver par une autre piste, et s'oublie quand même", async () => {
  const { portes } = portesDeBanc({ lisibles: [DEUX] });
  const ou = await leProjetOuLonEcrit({
    frontendId: "projet-3", concordance: { "projet-3": UN }, pistes: [DEUX], portes
  });
  assert.deepEqual(ou, { id: DEUX, source: "ecran", aOublier: true, injoignable: false });
});

test("ce que l'écran porte est relu, lui aussi", async () => {
  const { portes, vues } = portesDeBanc({ lisibles: [] });
  const ou = await leProjetOuLonEcrit({ pistes: [UN, DEUX], portes });
  assert.equal(ou.id, "");
  assert.deepEqual(vues.relues, [UN, DEUX], "les deux pistes doivent être éprouvées");
});

test("la recherche par le nom est la dernière piste, et son résultat est relu", async () => {
  const { portes, vues } = portesDeBanc({
    lisibles: [DEUX], parLeNom: () => DEUX
  });
  const ou = await leProjetOuLonEcrit({ nom: "Montholon", portes });
  assert.deepEqual(ou, { id: DEUX, source: "nom", aOublier: false, injoignable: false });
  assert.deepEqual(vues.noms, ["Montholon"]);
});

test("un nom qui ne mène à rien de lisible ne rend rien", async () => {
  const { portes } = portesDeBanc({ lisibles: [], parLeNom: () => UN });
  const ou = await leProjetOuLonEcrit({ nom: "Montholon", portes });
  assert.equal(ou.id, "");
});

test("on ne cherche pas par le nom quand une piste a déjà été accordée", async () => {
  const { portes, vues } = portesDeBanc({ lisibles: [UN], parLeNom: () => DEUX });
  const ou = await leProjetOuLonEcrit({ pistes: [UN], nom: "Montholon", portes });
  assert.equal(ou.id, UN);
  assert.deepEqual(vues.noms, [], "un nom cherché pour rien est une requête pour rien");
});

test("sans portes, on ne rend pas un identifiant qu'on n'a pas pu relire", async () => {
  const ou = await leProjetOuLonEcrit({
    frontendId: "projet-3", concordance: { "projet-3": UN }, pistes: [DEUX], nom: "Montholon"
  });
  assert.deepEqual(ou, { id: "", source: "", aOublier: false, injoignable: false });
});

test("une piste mal formée n'est pas même présentée à la base", async () => {
  const { portes, vues } = portesDeBanc({ lisibles: [] });
  const ou = await leProjetOuLonEcrit({ pistes: ["projet-3", ""], portes });
  assert.equal(ou.id, "");
  assert.deepEqual(vues.relues, [], "une adresse qui n'en est pas une ne se demande pas");
});

test("une base qui ne répond pas n'efface pas la concordance", async () => {
  // Un instant sans réseau ne prouve rien contre la concordance. L'oublier ferait
  // payer une panne de réseau par la perte du seul lien vers le projet.
  const { portes } = portesDeBanc({ muette: true });
  const ou = await leProjetOuLonEcrit({
    frontendId: "projet-3", concordance: { "projet-3": UN }, portes
  });
  assert.deepEqual(ou, { id: "", source: "", aOublier: false, injoignable: true });
});

test("une base qui ne répond pas arrête la recherche au lieu de descendre les pistes", async () => {
  const { portes, vues } = portesDeBanc({ muette: true });
  const ou = await leProjetOuLonEcrit({ pistes: [UN, DEUX], nom: "Montholon", portes });
  assert.equal(ou.injoignable, true);
  assert.deepEqual(vues.relues, [UN], "insister sur une base muette ne rend pas de réponse");
});

test("un refus de droit se dit en français, et dit que rien n'a été rangé", () => {
  const dit = leMotDunRefus(new Error(
    'project_document_folders insert failed (403): {"code":"42501","details":null,'
    + '"hint":null,"message":"new row violates row-level security policy for table '
    + '\\"project_document_folders\\""}'
  ));
  assert.match(dit, /votre session/);
  assert.match(dit, /rien n'a été rangé/);
  assert.doesNotMatch(dit, /42501/);
  assert.doesNotMatch(dit, /row-level/);
});

test("un identifiant que la base ne sait pas lire se dit aussi", () => {
  const dit = leMotDunRefus(new Error('invalid input syntax for type uuid: "projet-3"'));
  assert.match(dit, /n'a pas été reconnu/);
  assert.doesNotMatch(dit, /uuid/);
});

test("un refus qu'on ne connaît pas garde son texte", () => {
  // Le traduire en « cause inconnue » effacerait la seule trace de la panne.
  assert.equal(leMotDunRefus(new Error("Failed to fetch")), "Failed to fetch");
  assert.equal(leMotDunRefus(""), "cause inconnue");
  assert.equal(leMotDunRefus(null), "cause inconnue");
});
