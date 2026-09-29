/**
 * La forme d'un chantier — courte, structurée, et sans rien du projet.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  AXE, MOT_DE_LAXE, MOT_DU_ROLE, PHASES, ROLES_QUI_COMPTENT, TRANCHES_DE_NIVEAUX,
  ZONES_DE_NEIGE, ZONES_DE_SISME, ZONES_DE_VENT, CE_QUI_NE_TRAVERSE_JAMAIS,
  ceQuiDiffere, distanceEntreContextes, phraseDuContexte, trancheDesNiveaux,
  valeurDuFait, vecteurDeContexte
} from "./vecteur-de-contexte.js";

/**
 * Un fait de contexte tel que Géorisques le laisse : la zone, **et le nom de la
 * commune à côté**. C'est précisément ce dont il faut extraire l'une sans
 * l'autre.
 */
const faitDeGeorisques = (zone) => ({
  data: { zone },
  commune: "Montholon",
  codeInsee: "89110",
  url: "https://exemple.invalide/zonage",
  requestedAt: "2026-09-01T08:00:00Z"
});

/* ── Rien du projet n'entre ──────────────────────────────────────────────── */

test("une valeur hors du domaine n'entre pas, et l'axe se dit inconnu", () => {
  // La règle ne tient pas par une relecture attentive : elle tient par
  // construction. Un domaine fermé ne peut rien porter qu'il n'ait prévu.
  const vecteur = vecteurDeContexte({
    phase: "Chantier de Montholon",
    sismique: "la commune est en zone modérée",
    neige: { data: { zone: "Z9" } },
    vent: 12,
    niveaux: "beaucoup"
  });

  assert.deepEqual(vecteur.axes, []);
  assert.deepEqual(vecteur.manques.sort(), Object.values(AXE).sort());
});

test("le nom de la commune ne sort jamais d'un fait de contexte", () => {
  // Les faits viennent sales : la zone est à côté du nom de la commune, de son
  // code INSEE et d'une adresse de service. On lit la zone, et rien d'autre.
  const vecteur = vecteurDeContexte({
    sismique: faitDeGeorisques("3"),
    neige: faitDeGeorisques("B1")
  });

  const dit = JSON.stringify(vecteur);
  assert.doesNotMatch(dit, /Montholon/);
  assert.doesNotMatch(dit, /89110/);
  assert.doesNotMatch(dit, /exemple\.invalide/);

  assert.deepEqual(vecteur.axes.map((un) => [un.axe, un.valeur]), [
    [AXE.SISME, "3"], [AXE.NEIGE, "B1"]
  ]);
});

test("on ne descend pas dans un objet inconnu à la recherche d'une zone", () => {
  // Chercher partout finirait par ramener un nom de commune le jour où une
  // source changerait de forme. On regarde aux endroits connus, d'un cran.
  assert.equal(valeurDuFait({ resultat: { detail: { zone: "3" } } }), "");
  assert.equal(valeurDuFait({ data: { detail: { zone: "3" } } }), "");

  // Et aux endroits connus, on lit.
  assert.equal(valeurDuFait("3"), "3");
  assert.equal(valeurDuFait(4), "4");
  assert.equal(valeurDuFait({ zone: "B1" }), "B1");
  assert.equal(valeurDuFait({ data: "2" }), "2");
  assert.equal(valeurDuFait({ data: { code: "C2" } }), "C2");
  assert.equal(valeurDuFait(null), "");
});

test("un rôle sur mesure ne compte pas : il pourrait porter un nom propre", () => {
  // Le catalogue des lots est une donnée, et il s'étend : un projet peut créer
  // son lot et l'appeler comme il veut.
  const vecteur = vecteurDeContexte({
    roles: ["geotechnicien", "lot-ourdine-ferrand", "controle-technique", ""]
  });

  const roles = vecteur.axes.find((un) => un.axe === AXE.ROLES);
  assert.equal(roles.valeur, "controle-technique+geotechnicien");
  assert.doesNotMatch(JSON.stringify(vecteur), /ourdine/i);
});

test("les rôles se rangent comme la liste les range, jamais comme ils sont arrivés", () => {
  // Deux projets qui ont les mêmes rôles doivent porter la même chaîne, sans
  // quoi ils ne se compareraient jamais.
  const un = vecteurDeContexte({ roles: ["bet-structure", "controle-technique"] });
  const autre = vecteurDeContexte({ roles: ["controle-technique", "bet-structure"] });

  assert.equal(
    un.axes.find((axe) => axe.axe === AXE.ROLES).valeur,
    autre.axes.find((axe) => axe.axe === AXE.ROLES).valeur
  );
});

/* ── Les ordres de grandeur, jamais les cotes ────────────────────────────── */

test("un nombre de niveaux se range dans une tranche, et ne s'en retrouve pas", () => {
  // « 4 à 7 niveaux » se compare ; « R+5 » identifie.
  assert.equal(trancheDesNiveaux(1), "1");
  assert.equal(trancheDesNiveaux(2), "2-3");
  assert.equal(trancheDesNiveaux(3), "2-3");
  assert.equal(trancheDesNiveaux(4), "4-7");
  assert.equal(trancheDesNiveaux(7), "4-7");
  assert.equal(trancheDesNiveaux(8), "8-15");
  assert.equal(trancheDesNiveaux(30), "16 et plus");

  // **La tranche est irréversible** : cinq et six se lisent pareil.
  assert.equal(trancheDesNiveaux(5), trancheDesNiveaux(6));

  // Ce qui n'est pas un nombre d'étages ne se range pas.
  assert.equal(trancheDesNiveaux(0), "");
  assert.equal(trancheDesNiveaux(-2), "");
  assert.equal(trancheDesNiveaux("R+3"), "");
  assert.equal(trancheDesNiveaux(null), "");
});

/* ── Ce qui entre, et comment ────────────────────────────────────────────── */

test("la graphie est indulgente, le fond ne l'est pas", () => {
  // « a1 », « A1 » et « Zone A1 » ne sont pas trois zones. « Montholon » n'en
  // est aucune.
  assert.equal(
    vecteurDeContexte({ neige: "a1" }).axes.find((un) => un.axe === AXE.NEIGE).valeur, "A1");
  assert.equal(
    vecteurDeContexte({ neige: " A 1 " }).axes.find((un) => un.axe === AXE.NEIGE).valeur, "A1");
  assert.equal(vecteurDeContexte({ neige: "A3" }).axes.length, 0);
});

test("chaque domaine est celui du métier, et il est fermé", () => {
  // Une seconde liste finirait par ne plus dire la même chose que la base, et
  // une phase valide passerait pour inconnue (règle 4).
  assert.deepEqual(PHASES, ["PC", "AT", "APS", "APD", "PRO", "DCE", "MARCHE", "EXE", "DOE", "GPA", "EXPLOIT"]);
  assert.equal(ZONES_DE_SISME.length, 5);
  assert.equal(ZONES_DE_NEIGE.length, 8);
  assert.equal(ZONES_DE_VENT.length, 4);
  assert.equal(TRANCHES_DE_NIVEAUX.length, 5);

  // Chaque axe se dit, et chaque rôle aussi : un code affiché tel quel
  // (« bet-energie-fluide ») ne se lit pas.
  for (const axe of Object.values(AXE)) assert.ok(MOT_DE_LAXE[axe], `« ${axe} » n'a pas de libellé`);
  for (const role of ROLES_QUI_COMPTENT) assert.ok(MOT_DU_ROLE[role], `« ${role} » n'a pas de libellé`);
  assert.equal(Object.keys(MOT_DU_ROLE).length, ROLES_QUI_COMPTENT.length);
});

test("la phase de la base est bien celle que le domaine accepte", async () => {
  /**
   * La contrainte vit dans la migration ; la reprendre de mémoire ferait
   * refuser une phase valide, et la forme du chantier resterait muette sur son
   * premier discriminant.
   */
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const migration = readFileSync(fileURLToPath(new URL(
    "../../../../supabase/migrations/202605030003_projects_phases_and_create_rpc.sql", import.meta.url
  )), "utf8");

  const debut = migration.indexOf("check (current_phase_code in (");
  const dites = migration
    .slice(debut, migration.indexOf(")", debut))
    .match(/'[A-Z]+'/g)
    ?.map((un) => un.slice(1, -1)) ?? [];

  assert.deepEqual(dites.slice().sort(), PHASES.slice().sort());
});

test("ce qui ne traverse jamais se nomme, et se montre", () => {
  // Une règle de confidentialité qui ne s'affiche nulle part ne rassure
  // personne : elle se découvre le jour où elle a déjà été enfreinte.
  assert.ok(CE_QUI_NE_TRAVERSE_JAMAIS.length >= 5);
  const dit = CE_QUI_NE_TRAVERSE_JAMAIS.join(" ");
  for (const attendu of ["nom du projet", "commune", "copilote", "intervenants"]) {
    assert.match(dit, new RegExp(attendu), `« ${attendu} » n'est pas nommé`);
  }
});

test("une forme complète se lit en français", () => {
  const vecteur = vecteurDeContexte({
    phase: "EXE", sismique: "3", neige: "B1", vent: "2", niveaux: 5,
    roles: ["controle-technique", "geotechnicien"]
  });

  assert.equal(vecteur.manques.length, 0);
  const dit = phraseDuContexte(vecteur);
  assert.match(dit, /phase EXE/);
  assert.match(dit, /zone sismique 3/);
  assert.match(dit, /niveaux 4-7/);
  // Les rôles en toutes lettres : « controle-technique » ne se lit pas.
  assert.match(dit, /contrôle technique, géotechnicien/);
  assert.equal(phraseDuContexte(null), "");
});

/* ── Ce qui sépare deux formes ───────────────────────────────────────────── */

const forme = (lu) => vecteurDeContexte(lu);

test("ne pas savoir n'est pas être différent", () => {
  // Compter un axe inconnu comme un écart ferait passer un projet mal
  // renseigné pour un projet dissemblable, et l'on chercherait des voisins là
  // où il n'y a qu'un formulaire vide.
  const complet = forme({ phase: "EXE", sismique: "3", neige: "B1", vent: "2", niveaux: 5, roles: ["opc"] });
  const maigre = forme({ phase: "EXE" });

  const ecart = distanceEntreContextes(complet, maigre);
  assert.equal(ecart.distance, 0, "un axe inconnu a compté comme un écart");
  assert.deepEqual(ecart.communs, [AXE.PHASE]);
  assert.equal(ecart.inconnus.length, Object.values(AXE).length - 1);
});

test("rien de comparable ne se dit pas « identiques »", () => {
  // « On ne sait pas » ne s'écrit jamais 0, qui voudrait dire le contraire.
  assert.equal(distanceEntreContextes(forme({}), forme({})).distance, null);
  assert.equal(distanceEntreContextes(null, null).distance, null);
});

test("la distance se dit, et l'on peut demander lesquels", () => {
  // C'est la différence entre un moteur qu'on subit et un moteur à qui l'on
  // peut demander « lesquels ? ».
  const ici = forme({ phase: "EXE", sismique: "3", neige: "B1", vent: "2" });
  const la = forme({ phase: "APS", sismique: "3", neige: "C1", vent: "2" });

  const ecart = distanceEntreContextes(ici, la);
  assert.equal(ecart.communs.length, 4);
  assert.deepEqual(ecart.ecarts.sort(), [AXE.NEIGE, AXE.PHASE].sort());
  assert.equal(ecart.distance, 0.5);

  assert.deepEqual(ceQuiDiffere(ici, la).sort(), ["phase", "zone de neige"].sort());
  assert.deepEqual(ceQuiDiffere(ici, ici), []);
});

test("deux formes identiques sont à distance nulle", () => {
  const lu = { phase: "PRO", sismique: "2", roles: ["bet-structure"] };
  assert.equal(distanceEntreContextes(forme(lu), forme(lu)).distance, 0);
});
