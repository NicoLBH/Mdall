import test from "node:test";
import assert from "node:assert/strict";

import {
  OUTILS,
  comparerALaMemoire,
  declarationsPourModele,
  entreesManquantes,
  executerOutil,
  outilParId,
  prefillDepuisMemoire,
  referenceOutil
} from "./copilote-outils.js";

function donnee(cle, valeur, extra = {}) {
  return {
    id: `d-${cle}`,
    kind: "base-datum",
    nature: "donnee-de-base",
    subject_key: cle,
    statement: `${cle} : ${valeur}`,
    status: "assumed",
    decided_at: "2026-01-01T00:00:00.000Z",
    payload: { subject: cle, value: String(valeur) },
    ...extra
  };
}

const MEMOIRE = [
  donnee("zone-sismique", "4"),
  donnee("categorie-importance", "II"),
  donnee("classe-de-sol", "C")
];

const SPECTRE = outilParId("spectre_elastique_ec8");

/* ── Le catalogue ────────────────────────────────────────────────────────── */

test("un outil se retrouve par son identifiant, jamais par approximation", () => {
  assert.equal(outilParId("spectre_elastique_ec8")?.id, "spectre_elastique_ec8");
  assert.equal(outilParId("spectre"), null);
  assert.equal(outilParId(""), null);
});

test("la référence d'un outil porte sa version", () => {
  // Comme les déductions : deux versions d'un même calcul ne rendent pas les
  // mêmes valeurs, et une réponse qui ne dit pas laquelle a servi est
  // invérifiable.
  assert.equal(referenceOutil(SPECTRE), "spectre_elastique_ec8_V1");
});

test("chaque outil déclare ce qu'il tranche, ses entrées et ses sorties", () => {
  for (const outil of OUTILS) {
    assert.ok(outil.titre, "un titre");
    assert.ok(outil.aQuoiCaSert.length > 40, "une phrase que le modèle puisse lire pour décider");
    assert.ok(outil.source, "une source réglementaire");
    assert.ok(outil.entrees.length > 0 && outil.sorties.length > 0);
    assert.equal(typeof outil.executer, "function");
  }
});

/* ── Ce que lit le modèle ────────────────────────────────────────────────── */

test("la déclaration au modèle se dérive du même endroit que le formulaire", () => {
  // Décrire l'outil deux fois — une fois pour le modèle, une fois pour l'écran
  // — c'est s'assurer qu'un jour le modèle demandera un champ que l'écran ne
  // montre pas.
  const declaration = declarationsPourModele().find((entree) => entree.name === "spectre_elastique_ec8");

  assert.deepEqual(Object.keys(declaration.parameters.properties).sort(), SPECTRE.entrees.map((e) => e.cle).sort());
  assert.deepEqual(
    declaration.parameters.required.sort(),
    SPECTRE.entrees.filter((e) => e.requis).map((e) => e.cle).sort()
  );
});

test("les choix fermés voyagent avec la déclaration", () => {
  const declaration = declarationsPourModele()[0];

  assert.deepEqual(declaration.parameters.properties.importanceCategory.enum, ["I", "II", "III", "IV"]);
  assert.equal(declaration.parameters.properties.dampingRatio.type, "number");
});

/* ── Ce que la mémoire remplit ───────────────────────────────────────────── */

test("la mémoire pré-remplit ce que le projet a déjà tranché", () => {
  const { valeurs, provenance } = prefillDepuisMemoire(SPECTRE, MEMOIRE);

  assert.deepEqual(valeurs, { zoneSismique: "4", importanceCategory: "II", soilClass: "C" });
  assert.equal(provenance.zoneSismique.cle, "zone-sismique");
  assert.equal(provenance.zoneSismique.enonce, "zone-sismique : 4");
});

test("une valeur remplacée ne pré-remplit rien", () => {
  // Calculer sur un état que le projet a quitté rendrait un résultat juste
  // pour un projet qui n'existe plus.
  const memoire = [donnee("zone-sismique", "2", { superseded_by: "autre", superseded_at: "2026-02-01" })];

  assert.deepEqual(prefillDepuisMemoire(SPECTRE, memoire).valeurs, {});
});

test("ce que le modèle propose l'emporte sur la mémoire", () => {
  // C'est tout l'objet d'un « et si on passait en catégorie IV ? ».
  const resultat = executerOutil({
    id: "spectre_elastique_ec8",
    entrees: { importanceCategory: "IV" },
    assertions: MEMOIRE
  });

  assert.equal(resultat.entrees.importanceCategory, "IV");
  assert.equal(resultat.entrees.zoneSismique, "4", "le reste vient toujours de la mémoire");
  assert.ok(!("importanceCategory" in resultat.venuesDeLaMemoire), "la provenance ne ment pas sur ce qui vient d'où");
  assert.ok("zoneSismique" in resultat.venuesDeLaMemoire);
});

/* ── Ce qui manque ───────────────────────────────────────────────────────── */

test("sans mémoire ni valeurs, l'outil ne calcule pas : il dit ce qu'il attend", () => {
  const resultat = executerOutil({ id: "spectre_elastique_ec8" });

  assert.equal(resultat.statut, "manquant");
  assert.deepEqual(resultat.champs.map((champ) => champ.cle).sort(), ["importanceCategory", "soilClass", "zoneSismique"]);
  assert.ok(resultat.champs.every((champ) => champ.libelle));
});

test("une valeur hors des choix déclarés compte comme manquante", () => {
  // L'accepter ferait calculer sur autre chose que ce qui a été demandé, et le
  // résultat aurait l'air d'un résultat.
  const manquantes = entreesManquantes(SPECTRE, { zoneSismique: "2b", importanceCategory: "II", soilClass: "C" });

  assert.deepEqual(manquantes.map((champ) => champ.cle), ["zoneSismique"]);
});

test("une entrée facultative absente ne bloque rien : son défaut s'applique", () => {
  const resultat = executerOutil({ id: "spectre_elastique_ec8", assertions: MEMOIRE });

  assert.equal(resultat.statut, "fait");
  assert.equal(resultat.entrees.dampingRatio, 5);
});

test("un outil que personne ne connaît se dit inconnu, pas vide", () => {
  const resultat = executerOutil({ id: "calcul_imaginaire" });

  assert.equal(resultat.statut, "inconnu");
  assert.match(resultat.message, /calcul_imaginaire/);
});

/* ── Le calcul ───────────────────────────────────────────────────────────── */

test("le calcul rend les valeurs de l'utilitaire, avec leur source et leur version", () => {
  const resultat = executerOutil({ id: "spectre_elastique_ec8", assertions: MEMOIRE });

  assert.equal(resultat.statut, "fait");
  assert.equal(resultat.outil, "spectre_elastique_ec8_V1");
  assert.match(resultat.source, /1998/);
  assert.equal(typeof resultat.valeurs.ag, "number");
  assert.equal(resultat.unites.TB, "s");
});

test("changer la catégorie d'importance change l'accélération, et rien d'autre", () => {
  // C'est la question de l'exemple : ce que le changement déplace, et ce qu'il
  // laisse en place.
  const avant = executerOutil({ id: "spectre_elastique_ec8", assertions: MEMOIRE }).valeurs;
  const apres = executerOutil({
    id: "spectre_elastique_ec8",
    entrees: { importanceCategory: "IV" },
    assertions: MEMOIRE
  }).valeurs;

  assert.ok(apres.ag > avant.ag, "le coefficient d'importance monte");
  assert.equal(apres.agr, avant.agr, "l'accélération de référence tient à la zone, pas à l'importance");
  assert.equal(apres.TB, avant.TB, "les périodes tiennent au sol");
});

test("les choix déclarés sont exactement ceux que le calcul sait traiter", () => {
  // C'est la vraie protection : tant que les deux listes coïncident, aucune
  // valeur acceptée par le formulaire ne peut tomber hors du catalogue.
  const zones = SPECTRE.entrees.find((entree) => entree.cle === "zoneSismique").valeurs;
  const categories = SPECTRE.entrees.find((entree) => entree.cle === "importanceCategory").valeurs;

  for (const zone of zones) {
    for (const categorie of categories) {
      const resultat = SPECTRE.executer({ zoneSismique: zone, importanceCategory: categorie, soilClass: "A" });
      assert.equal(resultat.ok, true, `zone ${zone} / catégorie ${categorie}`);
      assert.ok(Number.isFinite(resultat.valeurs.ag));
    }
  }
});

test("un couple hors catalogue ne rend pas un spectre approximatif : il refuse", () => {
  // Le garde-fou ne se déclenche que si la liste des choix et la table
  // réglementaire divergent un jour. Il se vérifie donc par la porte de
  // derrière — mais il se vérifie, sans quoi il finirait par ne plus marcher.
  const resultat = SPECTRE.executer({ zoneSismique: "6", importanceCategory: "II", soilClass: "A" });

  assert.equal(resultat.ok, false);
  assert.match(resultat.raison, /catalogue/);
});

/* ── L'écart avec ce que le projet tient pour vrai ───────────────────────── */

test("une sortie sans clé de mémoire ne se compare à rien", () => {
  // Rapprocher « TB » d'une affirmation qui parle d'autre chose fabriquerait un
  // conflit qui n'existe pas, et un conflit inventé coûte plus cher qu'un
  // conflit manqué.
  const outil = { sorties: [{ cle: "TB", libelle: "TB" }] };

  assert.deepEqual(comparerALaMemoire(outil, { TB: 0.1 }, [donnee("periode-tb", "0.5")]), []);
});

test("une valeur calculée qui contredit la mémoire est signalée, sans désigner de fautif", () => {
  const outil = { sorties: [{ cle: "ag", libelle: "Accélération de calcul", unite: "m/s²", depuisMemoire: "acceleration-ag" }] };
  const ecarts = comparerALaMemoire(outil, { ag: 2.4 }, [donnee("acceleration-ag", "1.6")]);

  assert.equal(ecarts.length, 1);
  assert.equal(ecarts[0].valeurTenue, 1.6);
  assert.equal(ecarts[0].valeurCalculee, 2.4);
  assert.equal(ecarts[0].unite, "m/s²");
});

test("deux valeurs identiques ne font pas un écart, même en arithmétique binaire", () => {
  const outil = { sorties: [{ cle: "S", libelle: "S", depuisMemoire: "parametre-s" }] };

  assert.deepEqual(comparerALaMemoire(outil, { S: 0.1 + 0.2 }, [donnee("parametre-s", "0.3")]), []);
});
