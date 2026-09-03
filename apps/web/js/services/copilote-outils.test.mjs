import test from "node:test";
import assert from "node:assert/strict";

import {
  OUTILS,
  substitutionsNonJustifiees,
  valeurCiteePar,
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
  const declaration = declarationsPourModele().find((entree) => entree.name === "spectre_elastique_ec8");

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

test("la mémoire parle en phrases, les listes déroulantes attendent des jetons", () => {
  // Ce que les utilitaires écrivent vraiment, et sous les clés qu'ils dérivent
  // de leurs libellés. Attendre « zone-sismique » et « 4 » ne trouvait rien.
  const reelle = [
    donnee("zone-de-sismicite", "4 — Moyenne"),
    donnee("categorie-d-importance", "Catégorie d'importance III"),
    donnee("classe-de-sol", "Classe de sol B")
  ];
  const { valeurs, provenance } = prefillDepuisMemoire(SPECTRE, reelle);

  assert.deepEqual(valeurs, { zoneSismique: "4", importanceCategory: "III", soilClass: "B" });
  assert.equal(provenance.zoneSismique.cle, "zone-de-sismicite");
  assert.equal(provenance.zoneSismique.brut, "4 — Moyenne");
});

test("une clé portée sur une zone du projet parle du même sujet", () => {
  const porte = [donnee("classe-de-sol@batiment-a", "Classe de sol D")];
  assert.equal(prefillDepuisMemoire(SPECTRE, porte).valeurs.soilClass, "D");
});

test("une phrase où le jeton attendu ne figure pas ne pré-remplit rien", () => {
  // Mieux vaut un champ vide qu'une valeur inventée : le « D » de « à
  // déterminer » n'est pas une classe de sol.
  assert.deepEqual(prefillDepuisMemoire(SPECTRE, [donnee("classe-de-sol", "à déterminer")]).valeurs, {});
});

test("l'altitude et H0 se lisent aussi dans une phrase", () => {
  const gel = outilParId("profondeur_hors_gel");
  const memoire = [donnee("h0-hors-gel", "0,50 m"), donnee("altitude", "450 m NGF")];
  assert.deepEqual(prefillDepuisMemoire(gel, memoire).valeurs, { h0: "0.50", altitude: "450" });
});

test("une valeur remplacée ne pré-remplit rien", () => {
  // Calculer sur un état que le projet a quitté rendrait un résultat juste
  // pour un projet qui n'existe plus.
  const memoire = [donnee("zone-sismique", "2", { superseded_by: "autre", superseded_at: "2026-02-01" })];

  assert.deepEqual(prefillDepuisMemoire(SPECTRE, memoire).valeurs, {});
});

test("ce que le modèle propose l'emporte sur la mémoire — quand quelqu'un l'a dit", async () => {
  // C'est tout l'objet d'un « et si on passait en catégorie IV ? ». La valeur
  // figure dans la question : elle est justifiée.
  const resultat = await executerOutil({
    id: "spectre_elastique_ec8",
    entrees: { importanceCategory: "IV" },
    assertions: MEMOIRE,
    question: "et si on passait la catégorie d'importance de II à IV ?"
  });

  assert.equal(resultat.entrees.importanceCategory, "IV");
  assert.equal(resultat.entrees.zoneSismique, "4", "le reste vient toujours de la mémoire");
  assert.ok(!("importanceCategory" in resultat.venuesDeLaMemoire), "la provenance ne ment pas sur ce qui vient d'où");
  assert.ok("zoneSismique" in resultat.venuesDeLaMemoire);
});

/* ── Ce qui manque ───────────────────────────────────────────────────────── */

test("sans mémoire ni valeurs, l'outil ne calcule pas : il dit ce qu'il attend", async () => {
  const resultat = await executerOutil({ id: "spectre_elastique_ec8" });

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

test("une entrée facultative absente ne bloque rien : son défaut s'applique", async () => {
  const resultat = await executerOutil({ id: "spectre_elastique_ec8", assertions: MEMOIRE });

  assert.equal(resultat.statut, "fait");
  assert.equal(resultat.entrees.dampingRatio, 5);
});

test("un outil que personne ne connaît se dit inconnu, pas vide", async () => {
  const resultat = await executerOutil({ id: "calcul_imaginaire" });

  assert.equal(resultat.statut, "inconnu");
  assert.match(resultat.message, /calcul_imaginaire/);
});

/* ── Le calcul ───────────────────────────────────────────────────────────── */

test("le calcul rend les valeurs de l'utilitaire, avec leur source et leur version", async () => {
  const resultat = await executerOutil({ id: "spectre_elastique_ec8", assertions: MEMOIRE });

  assert.equal(resultat.statut, "fait");
  assert.equal(resultat.outil, "spectre_elastique_ec8_V1");
  assert.match(resultat.source, /1998/);
  assert.equal(typeof resultat.valeurs.ag, "number");
  assert.equal(resultat.unites.TB, "s");
});

test("changer la catégorie d'importance change l'accélération, et rien d'autre", async () => {
  // C'est la question de l'exemple : ce que le changement déplace, et ce qu'il
  // laisse en place.
  const avant = (await executerOutil({ id: "spectre_elastique_ec8", assertions: MEMOIRE })).valeurs;
  const apres = (await executerOutil({
    id: "spectre_elastique_ec8",
    entrees: { importanceCategory: "IV" },
    assertions: MEMOIRE,
    confirmees: ["importanceCategory"]
  })).valeurs;

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

/* ── Ce qui n'a pas été dit ne se devine pas ─────────────────────────────── */

test("une valeur d'une lettre ne se reconnaît pas dans n'importe quel mot", () => {
  // « A » dans « change la classe de sol » ferait passer le garde-fou pour
  // exactement ce qu'il surveille.
  assert.equal(valeurCiteePar("quelles conséquences si on change la classe de sol ?", "A"), false);
  assert.equal(valeurCiteePar("passer le sol en A", "A"), true);
  assert.equal(valeurCiteePar("et si le sol devient D ?", "D"), true);
});

test("une valeur de plus de deux caractères se reconnaît sans la casse", () => {
  // « Bâtiment A » et « batiment a » désignent la même chose : exiger la casse
  // ferait redemander une valeur que l'utilisateur vient d'écrire.
  assert.equal(valeurCiteePar("passer en batiment a", "Batiment A"), true);
  assert.equal(valeurCiteePar("passer sur le lot GROS-OEUVRE", "gros-oeuvre"), true);
  // Mais elle reste un mot entier : « III » ne se lit pas dans « II ».
  assert.equal(valeurCiteePar("catégorie II", "III"), false);
});

test("le modèle qui invente une valeur ne calcule pas : il demande", async () => {
  // Le cas réel : « quelles conséquences si on change la classe de sol ? »
  // répondu par « si elle passe de B à A… ». Personne n'avait dit A.
  const resultat = await executerOutil({
    id: "spectre_elastique_ec8",
    entrees: { soilClass: "A" },
    assertions: MEMOIRE,
    question: "quelles conséquences si on change la classe de sol ?"
  });

  assert.equal(resultat.statut, "aConfirmer");
  assert.deepEqual(resultat.champs.map((champ) => champ.cle), ["soilClass"]);
  assert.equal(resultat.proposeParLeModele.soilClass, "A");
  // La mémoire reste affichée : c'est elle qui vaut tant que personne n'a
  // tranché autrement.
  assert.equal(resultat.connues.soilClass, "C");
});

test("une valeur confirmée à l'écran passe sans discussion", async () => {
  const resultat = await executerOutil({
    id: "spectre_elastique_ec8",
    entrees: { soilClass: "A" },
    assertions: MEMOIRE,
    confirmees: ["soilClass"]
  });

  assert.equal(resultat.statut, "fait");
  assert.equal(resultat.entrees.soilClass, "A");
});

test("une valeur inventée passe aussi mal quand la mémoire ne sait rien", () => {
  // La première version ne surveillait que les **remplacements**. Elle laissait
  // donc passer le cas le plus dangereux : le projet ne sait rien, il n'y a
  // rien à remplacer, et une valeur inventée entre sans rencontrer personne.
  // C'est exactement là qu'un garde-fou sert.
  const substituees = substitutionsNonJustifiees(SPECTRE, {
    entrees: { soilClass: "A" },
    depuisMemoire: {},
    question: "calcule le spectre"
  });

  assert.deepEqual(substituees.map((champ) => champ.cle), ["soilClass"]);
});

test("mémoire vide et valeurs venues de nulle part : rien n'est calculé", async () => {
  const resultat = await executerOutil({
    id: "spectre_elastique_ec8",
    entrees: { zoneSismique: "4", importanceCategory: "II", soilClass: "A" },
    question: "calcule le spectre"
  });

  assert.equal(resultat.statut, "aConfirmer");
  assert.deepEqual(Object.keys(resultat.proposeParLeModele).sort(), ["importanceCategory", "soilClass", "zoneSismique"]);
});

test("une valeur écrite par l'utilisateur passe, même sans rien en mémoire", async () => {
  const resultat = await executerOutil({
    id: "profondeur_hors_gel",
    entrees: { h0: "0.5", altitude: "450" },
    question: "profondeur hors gel avec H0 = 0.5 et une altitude de 450 m ?"
  });

  assert.equal(resultat.statut, "fait");
  assert.equal(resultat.valeurs.H, 0.575);
});

test("reprendre la valeur de la mémoire n'est pas une substitution", () => {
  const substituees = substitutionsNonJustifiees(SPECTRE, {
    entrees: { soilClass: "C" },
    depuisMemoire: { soilClass: "C" },
    question: "calcule le spectre"
  });

  assert.deepEqual(substituees, []);
});

/* ── Le second utilitaire, et l'orchestration ────────────────────────────── */

const GEL = outilParId("profondeur_hors_gel");

const SITE = [
  donnee("h0-hors-gel", "0.5"),
  donnee("altitude", "450"),
  donnee("profondeur-hors-gel", "0.575")
];

test("la profondeur hors gel applique la formule du DTU, pas une autre", async () => {
  const resultat = await executerOutil({ id: "profondeur_hors_gel", assertions: SITE });

  // H = 0,5 + (450 − 150) / 4000 = 0,575
  assert.equal(resultat.statut, "fait");
  assert.equal(resultat.valeurs.H, 0.575);
  assert.equal(resultat.valeurs.correctionAltitude, 0.075);
  assert.match(resultat.source, /13\.1/);
});

test("une altitude absente ne devient pas zéro : le calcul refuse", () => {
  // `Number(null)` vaut zéro, et une cote calculée à 150 m par défaut n'est
  // vraie nulle part en particulier. Le même défaut a déjà coûté une
  // « Profondeur hors gel : 0,00 m » dans les déductions.
  assert.equal(GEL.executer({ h0: 0.5 }).ok, false);
  assert.equal(GEL.executer({ h0: 0.5, altitude: null }).ok, false);
  assert.equal(GEL.executer({ h0: 0.5, altitude: "" }).ok, false);
});

test("une altitude citée dans la question change la cote, et le conflit se voit", async () => {
  const resultat = await executerOutil({
    id: "profondeur_hors_gel",
    entrees: { altitude: "900" },
    assertions: SITE,
    question: "et si le projet montait à 900 m ?"
  });

  assert.equal(resultat.statut, "fait");
  assert.equal(resultat.valeurs.H, 0.688);
  assert.equal(resultat.ecarts.length, 1);
  assert.equal(resultat.ecarts[0].valeurTenue, 0.575);
  assert.equal(resultat.ecarts[0].valeurCalculee, 0.688);
});

test("chaque utilitaire est proposé au modèle avec son périmètre, et ses bornes", () => {
  // C'est là-dessus que porte l'aiguillage : des descriptions qui disent ce que
  // l'outil tranche **et** ce qu'il ne tranche pas. Sans la seconde moitié, le
  // modèle appelle l'outil le plus proche et rend une réponse hors sujet.
  const noms = declarationsPourModele().map((entree) => entree.name);

  assert.deepEqual(noms.sort(), ["incendie_habitation", "profondeur_hors_gel", "spectre_elastique_ec8"]);
  assert.match(GEL.aQuoiCaSert, /ne dimensionne pas la fondation/i);
  assert.match(SPECTRE.aQuoiCaSert, /ne dimensionne aucun élément/i);
  assert.match(outilParId("incendie_habitation").aQuoiCaSert, /ne traite ni les parcs de stationnement/i);
});

test("le référentiel incendie annonce ce qu'il ne traite pas, nommément", () => {
  const incendie = outilParId("incendie_habitation");
  for (const hors of [/parcs de stationnement/i, /établissements recevant du public/i,
                      /immeubles de grande hauteur/i, /articles 77 à 96/]) {
    assert.match(incendie.aQuoiCaSert, hors);
  }
  // Et il ne calcule rien sur place : son raisonnement vit au serveur.
  assert.equal(incendie.executer.constructor.name, "AsyncFunction");
});

test("les deux utilitaires lisent l'altitude et le sol dans des clés distinctes", () => {
  // Deux outils qui liraient la même clé pour deux choses différentes
  // finiraient par se pré-remplir l'un avec la valeur de l'autre.
  const clesGel = GEL.entrees.flatMap((entree) => entree.depuisMemoire ?? []);
  const clesSpectre = SPECTRE.entrees.flatMap((entree) => entree.depuisMemoire ?? []);

  assert.deepEqual(clesGel.filter((cle) => clesSpectre.includes(cle)), []);
});

/* ── Le référentiel incendie ─────────────────────────────────────────────── */

test("une entrée d'aiguillage échappe au garde-fou des valeurs fabriquées", () => {
  // « exigence: planchersCoupeFeu » dit ce que le modèle est allé chercher, pas
  // une cote du bâtiment. La réclamer dans la question de l'utilisateur
  // reviendrait à lui demander de nommer les clés internes de l'utilitaire.
  const incendie = outilParId("incendie_habitation");
  const suspectes = substitutionsNonJustifiees(incendie, {
    entrees: { exigence: "planchersCoupeFeu", etagesSurRdc: 3 },
    question: "un collectif de 3 étages sur rez-de-chaussée"
  }).map((entree) => entree.cle);
  assert.deepEqual(suspectes, []);
});

test("mais une cote inventée reste bloquée, même dans le référentiel incendie", () => {
  const incendie = outilParId("incendie_habitation");
  const suspectes = substitutionsNonJustifiees(incendie, {
    entrees: { exigence: "planchersCoupeFeu", hauteurPlancherBasLogementLePlusHaut: 22 },
    question: "quel est le degré coupe-feu des planchers ?"
  }).map((entree) => entree.cle);
  assert.deepEqual(suspectes, ["hauteurPlancherBasLogementLePlusHaut"]);
});

test("l'aiguillage nomme exactement les exigences que le référentiel sait rendre", () => {
  // Une valeur d'aiguillage que le corpus ne produirait pas ferait répondre
  // « ce référentiel ne porte pas … » à une question que le modèle croyait posée.
  const incendie = outilParId("incendie_habitation");
  const exigences = incendie.entrees.find((entree) => entree.cle === "exigence").valeurs;
  assert.ok(exigences.includes("planchersCoupeFeu"));
  assert.ok(exigences.includes("classement"));
  assert.equal(new Set(exigences).size, exigences.length);
});
