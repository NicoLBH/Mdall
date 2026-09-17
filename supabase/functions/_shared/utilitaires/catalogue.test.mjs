import test from "node:test";
import assert from "node:assert/strict";

import {
  aRetenirDeLaConversation,
  OUTILS,
  substitutionsNonJustifiees,
  valeurCiteePar,
  comparerALaMemoire,
  declarationsPourModele,
  entreesManquantes,
  executerOutil,
  deduireLesEntrees,
  outilParId,
  phraseDesSubstitutions,
  provenancesDesEntrees,
  prefillDepuisMemoire,
  phraseDesContradictions,
  surQuoiCaRepose,
  aVerserAuProjet,
  prefillDepuisLEtude,
  referenceOutil,
  regimeDeLAgent,
  regimeQuiNeCorrespondPas,
  agentsIncendie,
  sansFigure
} from "./catalogue.js";
import {
  CLES_REGIME_INCENDIE, CLE_REGIME_INCENDIE, SUJET_REGIME_INCENDIE
} from "./regime-incendie.js";

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

test("un outil se retrouve aussi par la référence que porte son résultat", async () => {
  // L'écran ne connaît plus le catalogue : quand on répond à une question, il
  // renvoie la référence qu'il avait sous les yeux — « profondeur_hors_gel_V1 ».
  // La refuser rendait « aucun utilitaire ne porte ce nom » au moment précis où
  // l'on venait de fournir ce qui manquait.
  assert.equal(outilParId("profondeur_hors_gel_V1")?.id, "profondeur_hors_gel");
  assert.equal(outilParId("profondeur_hors_gel_V9"), null, "une version qui n'existe pas n'est pas un outil");

  const resultat = await executerOutil({
    id: "profondeur_hors_gel_V1",
    entrees: { h0: "0.45", altitude: "450" },
    question: "profondeur hors gel avec H0 = 0.45 et une altitude de 450 m ?"
  });
  assert.equal(resultat.statut, "fait");
  assert.equal(resultat.valeurs.H, 0.525);
});

test("un résultat dit ce que la conversation doit en retenir", async () => {
  // L'écran ne peut plus faire ce tri : il ne connaît plus les déclarations
  // d'entrées. C'est donc le résultat qui le porte — sans quoi la contrainte de
  // sol se redemanderait à chaque question sur la même note.
  const resultat = await executerOutil({
    id: "profondeur_hors_gel",
    entrees: { h0: "0.45", altitude: "450" },
    question: "hors gel avec H0 = 0.45 et une altitude de 450 m ?"
  });

  assert.equal(resultat.statut, "fait");
  assert.deepEqual(resultat.aRetenir, { h0: "0.45", altitude: "450" });
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

test("le calcul rend les valeurs de l'agent, avec leur source et leur version", async () => {
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

test("chaque agent est proposé au modèle avec son périmètre, et ses bornes", () => {
  // C'est là-dessus que porte l'aiguillage : des descriptions qui disent ce que
  // l'outil tranche **et** ce qu'il ne tranche pas. Sans la seconde moitié, le
  // modèle appelle l'outil le plus proche et rend une réponse hors sujet.
  const noms = declarationsPourModele().map((entree) => entree.name);

  assert.deepEqual(noms.sort(), ["fondations_predimensionnement", "incendie_habitation",
    "profondeur_hors_gel", "spectre_elastique_ec8"]);
  assert.match(GEL.aQuoiCaSert, /ne dimensionne pas la fondation/i);
  assert.match(SPECTRE.aQuoiCaSert, /ne dimensionne aucun élément/i);
  assert.match(outilParId("incendie_habitation").aQuoiCaSert, /ne traite ni les parcs de plus de 6 000 m²/i);
  assert.match(outilParId("fondations_predimensionnement").aQuoiCaSert, /ne ferraille pas la semelle/i);
});

test("une question de parc n'exige pas qu'on décrive le bâtiment", () => {
  // Le titre VI se juge sur le parc lui-même : sa surface, ses niveaux, sa
  // contiguïté. Réclamer le nombre d'étages du bâtiment avant de dire à quel
  // degré le parc doit être stable, ce serait refuser de répondre à une
  // question qui a pourtant tout ce qu'il faut.
  const incendie = outilParId("incendie_habitation");
  //
  // Le régime de sécurité incendie, lui, reste exigé : il ne décrit pas le
  // bâtiment, il dit sous quel texte on calcule. Un degré de stabilité juste
  // tiré du mauvais référentiel reste un degré faux.
  const duParc = { exigence: "stabiliteParc", regimeIncendie: "habitation",
    parcDeStationnement: "oui", surfaceParc: 2000,
    niveauxParcAuDessus: 1, niveauxParcAuDessous: 2 };
  assert.deepEqual(entreesManquantes(incendie, duParc).map((e) => e.cle), []);
  // Pour tout le reste, décrire le bâtiment reste le préalable : c'est le
  // classement qui commande, et il ne se devine pas.
  assert.deepEqual(entreesManquantes(incendie, { exigence: "planchersCoupeFeu" }).map((e) => e.cle),
    ["regimeIncendie", "logementsSuperposes", "etagesSurRdc",
     "hauteurPlancherBasLogementLePlusHaut", "duplexOuTriplexAuDernierEtage"]);
  // La liste des exigences que l'outil propose au modèle porte bien celles du
  // titre VI : sans elles, il ne saurait pas qu'il peut les demander.
  const exigence = incendie.entrees.find((e) => e.cle === "exigence");
  for (const produit of ["stabiliteParc", "recoupementParc", "detectionParc", "colonneSecheParc"]) {
    assert.equal(exigence.valeurs.includes(produit), true, produit);
  }
});

test("le référentiel incendie annonce ce qu'il ne traite pas, nommément", () => {
  const incendie = outilParId("incendie_habitation");
  // Depuis que le titre VI est couvert, la borne des parcs n'est plus « pas de
  // parcs » mais « pas au-delà de 6 000 m² » : la borne a bougé, elle n'a pas
  // disparu, et c'est elle qu'on vérifie.
  for (const hors of [/parcs de plus de 6 000 m²/i, /établissements recevant du public/i,
                      /immeubles de grande hauteur/i, /articles 77 à 96/]) {
    assert.match(incendie.aQuoiCaSert, hors);
  }
  // Et il ne calcule rien sur place : son raisonnement vit au serveur.
  assert.equal(incendie.executer.constructor.name, "AsyncFunction");
});

test("les deux agents lisent l'altitude et le sol dans des clés distinctes", () => {
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

/* ── Ce que la conversation a déjà fait confirmer ────────────────────────── */

test("une confirmation ne vaut que pour la valeur confirmée", () => {
  // Sans la valeur, une clé confirmée une fois resterait libre pour toujours,
  // et le modèle pourrait y glisser 3 bars au tour suivant sans que personne ne
  // le voie.
  const outil = outilParId("fondations_predimensionnement");
  const memes = substitutionsNonJustifiees(outil, {
    entrees: { contrainteLimite: 1.5, h0: 0.5 },
    confirmees: ["contrainteLimite=1.5", "h0=0.5"]
  });
  assert.deepEqual(memes.map((e) => e.cle), []);

  const autres = substitutionsNonJustifiees(outil, {
    entrees: { contrainteLimite: 3, h0: 0.5 },
    confirmees: ["contrainteLimite=1.5", "h0=0.5"]
  });
  assert.deepEqual(autres.map((e) => e.cle), ["contrainteLimite"]);
});

test("une clé nue reste ce qu'on vient de cliquer", () => {
  // Le formulaire rend la valeur qu'il a saisie : il n'y a rien à comparer.
  const outil = outilParId("fondations_predimensionnement");
  assert.deepEqual(substitutionsNonJustifiees(outil, {
    entrees: { contrainteLimite: 2.2 }, confirmees: ["contrainteLimite"]
  }).map((e) => e.cle), []);
});

test("le nom d'un appui n'est pas une valeur du projet", () => {
  // Le réclamer dans la question reviendrait à demander de recopier une ligne
  // du tableau que l'outil vient d'écrire.
  const outil = outilParId("fondations_predimensionnement");
  assert.deepEqual(substitutionsNonJustifiees(outil, {
    entrees: { imposerPour: "Portique courant — file B" }, question: "reprends la file B"
  }).map((e) => e.cle), []);
  // Les cotes, elles, restent gardées : ce sont des valeurs.
  assert.deepEqual(substitutionsNonJustifiees(outil, {
    entrees: { imposerLx: 2 }, question: "reprends la file B"
  }).map((e) => e.cle), ["imposerLx"]);
});

test("le pré-dimensionnement demande le sol et le hors gel, et rien d'autre", () => {
  // La note porte les charges ; elle ne porte jamais la contrainte admissible
  // du sol ni la valeur départementale du hors gel. Ce sont deux décisions.
  const outil = outilParId("fondations_predimensionnement");
  assert.deepEqual(entreesManquantes(outil, {}).map((e) => e.cle), ["contrainteLimite", "h0"]);
  assert.deepEqual(entreesManquantes(outil, { contrainteLimite: 1.5, h0: 0.5 }).map((e) => e.cle), []);
});

/* ── Ce que la conversation établit une fois pour toutes ─────────────────── */

test("une valeur déjà établie pré-remplit l'outil au tour suivant", async () => {
  // Le modèle n'invente jamais de valeur — c'est la règle — donc il rappelle
  // l'outil sans arguments. Sans cette couche, l'outil redemandait la
  // contrainte de sol à chaque question sur la même note, et le formulaire
  // revenait en boucle.
  const sans = await executerOutil({ id: "profondeur_hors_gel", entrees: {} });
  assert.equal(sans.statut, "manquant");

  const avec = await executerOutil({
    id: "profondeur_hors_gel",
    entrees: {},
    acquises: { h0: "0.5", altitude: "241" }
  });
  assert.equal(avec.statut, "fait");
  assert.equal(avec.valeurs.H, 0.523);
});

test("ce que le modèle propose l'emporte sur ce qui était établi", async () => {
  // « Et si l'altitude était de 800 m ? » doit recalculer, pas répéter.
  const repris = await executerOutil({
    id: "profondeur_hors_gel",
    entrees: { altitude: 800 },
    acquises: { h0: "0.5", altitude: "241" },
    question: "et à 800 m d'altitude ?"
  });
  assert.equal(repris.statut, "fait");
  assert.equal(repris.entrees.altitude, 800);
});

test("la conversation ne retient que les décisions, pas les gestes", () => {
  // La contrainte de sol vaut pour tous les massifs et pour toute la
  // discussion ; une cote imposée à un massif ne doit pas se réimposer à la
  // question suivante.
  const outil = outilParId("fondations_predimensionnement");
  const garde = aRetenirDeLaConversation(outil, {
    contrainteLimite: 1.5, h0: 0.5, altitude: 241,
    imposerPour: "Portique courant — file B", imposerLx: 2, imposerLy: 2
  });
  assert.deepEqual(garde, { contrainteLimite: "1.5", h0: "0.5", altitude: "241" });
});

test("une entrée d'aiguillage ne s'établit jamais", () => {
  // Elle dit ce que le modèle est allé chercher, pas ce que le projet vaut :
  // la garder ferait répondre la question précédente à la suivante.
  const incendie = outilParId("incendie_habitation");
  const garde = aRetenirDeLaConversation(incendie, {
    exigence: "planchersCoupeFeu", etagesSurRdc: 3
  });
  assert.equal(garde.exigence, undefined);
  assert.equal(garde.etagesSurRdc, "3");
});

/* ── Ce qu'une demande de précision ne doit pas perdre ───────────────────── */

test("une valeur écrite dans la question survit à la demande de précision", async () => {
  // « avec une contrainte de sol à 1 bar » : la valeur est citée, donc
  // légitime. Ne rendre que la mémoire la faisait disparaître, et le tour
  // suivant la redemandait — deux questions au lieu d'une, sur une valeur déjà
  // donnée.
  const resultat = await executerOutil({
    id: "profondeur_hors_gel",
    entrees: { h0: 0.45, altitude: 220 },
    question: "quelle profondeur hors gel avec H0 = 0,45 m ?"
  });
  assert.equal(resultat.statut, "aConfirmer");
  assert.deepEqual(resultat.champs.map((c) => c.cle), ["altitude"]);
  // Le H0 cité reste acquis : le formulaire le renverra sans le redemander.
  assert.equal(resultat.connues.h0, 0.45);
});

test("ce qui est suspect reste à la valeur de la mémoire, pas à celle du modèle", () => {
  const outil = outilParId("profondeur_hors_gel");
  assert.deepEqual(substitutionsNonJustifiees(outil, {
    entrees: { h0: 0.45, altitude: 220 },
    question: "quelle profondeur hors gel avec H0 = 0,45 m ?"
  }).map((e) => e.cle), ["altitude"]);
});

test("le détail d'un massif reste à l'écran, il ne part pas au modèle", () => {
  // Les charges cas par cas et les quatre ratios n'apprennent rien à un modèle
  // qui a déjà les cotes et ce qui gouverne ; ils lui feraient courir le risque
  // de les recopier, c'est-à-dire de réécrire à la main ce que le calcul rend.
  const allege = sansFigure({
    statut: "fait",
    valeurs: {
      horsGel: 0.5,
      appuis: [{
        nom: "Appui A", tenue: false, ratio: 3.2, gouverne: "glissement",
        charges: { G: { V: 4.078, Hx: 0.416 } },
        ratios: [{ quoi: "glissement", ratio: 3.2 }],
        correspondances: [{ libelle: "CHARGE PERMANENTE", cas: "G" }]
      }]
    }
  });
  const appui = allege.valeurs.appuis[0];
  assert.equal(appui.charges, undefined);
  assert.equal(appui.ratios, undefined);
  assert.equal(appui.correspondances, undefined);
  assert.equal(appui.detail_disponible, true);
  // Ce qui décide reste : les cotes, le ratio, ce qui gouverne.
  assert.equal(appui.gouverne, "glissement");
  assert.equal(appui.ratio, 3.2);
  assert.equal(allege.valeurs.horsGel, 0.5);
});

test("une valeur écrite à la française est la même valeur", () => {
  // Personne n'écrit « 0.45 » en français. Ne pas la reconnaître faisait passer
  // pour inventé ce que l'utilisateur venait de taper, et l'écran le lui
  // redemandait.
  assert.equal(valeurCiteePar("avec H0 = 0,45 m", "0.45"), true);
  assert.equal(valeurCiteePar("une contrainte de sol à 1,5 bar", "1.5"), true);
  assert.equal(valeurCiteePar("une contrainte de sol à 1 bar", "1"), true);
  // « 1 » se dit aussi « 1,0 » — et l'utilitaire rend parfois « 1.0 ».
  assert.equal(valeurCiteePar("une contrainte de sol à 1 bar", "1.0"), true);
  // Ce qui n'a pas été dit reste non dit.
  assert.equal(valeurCiteePar("une contrainte de sol à 1 bar", "1.5"), false);
  assert.equal(valeurCiteePar("R+3", "0.45"), false);
});


test("ce que le calcul trouve ailleurs s'écarte, il ne se demande pas", async () => {
  // Le cas réel, et il coûtait six questions pour une : la note de calcul est
  // jointe, l'utilisateur a dit « 1 bar », et le modèle remplit consciencieusement
  // les huit champs déclarés — altitude, arase, trois cotes imposées. Chaque
  // valeur fabriquée devenait une question, l'écran en posait six, et l'on
  // comprenait que la note n'était pas arrivée.
  //
  // Seul H0 est vraiment en jeu : le département le décide, la note ne le porte
  // pas. Le reste, le calcul le trouve — l'altitude sur la note, l'arase dans sa
  // valeur par défaut, les cotes imposées nulle part parce que personne n'a rien
  // imposé.
  const resultat = await executerOutil({
    id: "fondations_predimensionnement",
    entrees: {
      contrainteLimite: 1, h0: 0.99, altitude: 980, araseSuperieure: -0.1,
      imposerLx: 1.2, imposerLy: 1.2, imposerLz: 0.5
    },
    question: "fais un dimensionnement des massifs de cette descente de charges, avec une contrainte de sol à 1 bar"
  });

  assert.equal(resultat.statut, "aConfirmer");
  assert.deepEqual(resultat.champs.map((champ) => champ.cle), ["h0"]);
  // Ce qui a été écarté n'entre pas dans le calcul : ni l'altitude inventée,
  // ni les cotes que personne n'a imposées.
  assert.equal(resultat.connues.altitude, undefined);
  assert.equal(resultat.connues.imposerLx, undefined);
  // L'arase revient par sa valeur déclarée, pas par la proposition du modèle.
  assert.equal(resultat.connues.araseSuperieure, -0.1);
  // Et la contrainte citée par l'utilisateur reste acquise.
  assert.equal(resultat.connues.contrainteLimite, 1);
  // On le dit, plutôt que de laisser croire que le chiffre du modèle a servi.
  assert.deepEqual(resultat.ecartees, [
    "Altitude du site", "Arase supérieure du massif",
    "Largeur imposée", "Longueur imposée", "Hauteur imposée"
  ]);
});

test("écarter n'est pas laisser passer : la valeur inventée n'entre pas", async () => {
  // Rien ne manque plus — H0 et l'altitude sont dans la question —, donc le
  // calcul a lieu. Les cotes imposées, elles, n'ont été dites par personne :
  // elles s'en vont, et l'utilitaire cherche ses cotes lui-même.
  const resultat = await executerOutil({
    id: "profondeur_hors_gel",
    entrees: { h0: "0.5", altitude: "450" },
    question: "profondeur hors gel avec H0 = 0.5 et une altitude de 450 m ?"
  });

  assert.equal(resultat.statut, "fait");
  assert.deepEqual(resultat.ecartees, []);
});

test("rien à demander, mais des valeurs à écarter : le calcul part quand même", async () => {
  // H0 et la contrainte sont dans la question : plus rien à demander. Les trois
  // cotes imposées, elles, n'ont été dites par personne — elles s'en vont, et
  // l'utilitaire cherche ses cotes lui-même au lieu de reprendre celles que le
  // modèle avait trouvées plausibles.
  //
  // Ici l'agent s'arrête faute de note jointe, et c'est la bonne réponse :
  // ce qui compte est qu'il ait été appelé, et avec quoi.
  const resultat = await executerOutil({
    id: "fondations_predimensionnement",
    entrees: { contrainteLimite: 1, h0: 0.45, imposerLx: 1.2, imposerLy: 1.2, imposerLz: 0.5 },
    question: "dimensionne les massifs avec H0 = 0,45 m et une contrainte de sol à 1 bar"
  });

  assert.equal(resultat.statut, "refus");
  assert.match(resultat.message, /Aucune note de calcul n'est jointe/);
  assert.deepEqual(resultat.ecartees, ["Largeur imposée", "Longueur imposée", "Hauteur imposée"]);
  assert.equal(resultat.entrees.imposerLx, undefined);
  assert.equal(resultat.entrees.h0, 0.45);
});

test("la phrase dit les deux choses : ce qu'on demande, ce qu'on écarte", () => {
  const seule = phraseDesSubstitutions([{ libelle: "H0 retenu pour le département" }], []);
  assert.match(seule, /H0 retenu pour le département a été proposé/);
  assert.doesNotMatch(seule, /Écarté/);

  const avec = phraseDesSubstitutions(
    [{ libelle: "H0 retenu pour le département" }],
    ["Altitude du site", "Arase supérieure du massif"]
  );
  assert.match(avec, /Écarté sans être demandé/);
  assert.match(avec, /Altitude du site, Arase supérieure du massif/);
});


/* ── L'enchaînement des utilitaires ──────────────────────────────────────── */

/** La contrainte du site telle que la mémoire l'écrit : une valeur, et ses entrées. */
function contrainteDuSite(cle, valeur, inputs = null) {
  return {
    id: `c-${cle}`,
    kind: "derived-constraint",
    nature: "contrainte",
    subject_key: `site:${cle}`,
    statement: `Profondeur hors gel : ${valeur}`,
    status: "assumed",
    decided_at: "2026-08-31T00:00:00.000Z",
    payload: { subject: "Profondeur hors gel", value: valeur, factKey: cle, derived: true, inputs }
  };
}

test("la cote hors gel du projet dispense de redemander H0", async () => {
  // Le cas réel, et il était insultant : le copilote annonce qu'il lit la
  // mémoire du projet, la mémoire porte « Profondeur hors gel : 0,99 m », et
  // l'écran demande quand même le H0 départemental — que personne ne connaît
  // par cœur, et qui ne sert qu'à recalculer ce que le projet a déjà tranché.
  const resultat = await executerOutil({
    id: "fondations_predimensionnement",
    entrees: { contrainteLimite: 1 },
    assertions: [contrainteDuSite("frost_depth", "0.99 m", { code_insee: "31555", altitude: 250 })],
    question: "dimensionne les massifs avec une contrainte de sol à 1 bar"
  });

  // Plus de question : l'agent est allé jusqu'à la note, et c'est elle qui
  // manque — pas une valeur qu'on aurait dû taper.
  assert.equal(resultat.statut, "refus");
  assert.match(resultat.message, /Aucune note de calcul n'est jointe/);
  assert.equal(resultat.entrees.horsGel, "0.99");
  assert.equal(resultat.provenances.horsGel.origine, "memoire");
});

test("l'altitude se lit dans les entrées de la cote hors gel, pas dans sa valeur", () => {
  // Le piège : « Profondeur hors gel : 0,99 m » porte l'altitude dans son
  // payload. Lire la valeur de l'affirmation pour n'importe laquelle de ses
  // entrées ferait une altitude de 0,99 m — un calcul juste sur une donnée
  // absurde, ce qui est la pire des deux erreurs.
  const gel = outilParId("profondeur_hors_gel");
  const { valeurs } = prefillDepuisMemoire(gel, [
    contrainteDuSite("frost_depth", "0.99 m", { code_insee: "31555", altitude: 250 })
  ]);

  assert.equal(valeurs.altitude, "250");
  assert.equal(valeurs.h0, undefined);
});

test("ce qui manque et qu'un autre agent sait produire se produit", async () => {
  // L'enchaînement demandé : « il me manque la cote hors gel » → « qui sait la
  // produire ? » → « l'agent gel » → « qu'attend-il ? » → « H0 et
  // l'altitude, que la conversation et la mémoire donnent » → « je l'exécute et
  // j'injecte ». Personne n'a rien tapé de plus.
  const fondations = outilParId("fondations_predimensionnement");
  const { obtenues, chaine } = await deduireLesEntrees(fondations, {
    fournies: { contrainteLimite: 1, h0: 0.45 },
    assertions: [contrainteDuSite("frost_depth", "0.9 m", { altitude: 250 })],
    dejaVus: new Set([fondations.id])
  });

  assert.equal(obtenues.horsGel, 0.475);
  assert.equal(chaine.length, 1);
  assert.equal(chaine[0].pour, "horsGel");
  assert.equal(chaine[0].outil, "profondeur_hors_gel_V1");
  // Ce qui a servi à produire la valeur voyage avec elle : sans cela on ne
  // saurait pas si c'est l'altitude ou le H0 qu'il faut corriger.
  assert.equal(chaine[0].entrees.altitude, "250");
  assert.equal(chaine[0].entrees.h0, 0.45);
});

test("on ne pose pas une question pour en éviter une", async () => {
  // L'agent gel manque d'altitude : le déduire demanderait une valeur de
  // plus, et l'on aurait échangé une question contre une autre, moins
  // compréhensible. On renonce, et c'est la cote hors gel qui se demande.
  const fondations = outilParId("fondations_predimensionnement");
  const { obtenues, chaine } = await deduireLesEntrees(fondations, {
    fournies: { contrainteLimite: 1, h0: 0.45 },
    assertions: [],
    dejaVus: new Set([fondations.id])
  });

  assert.deepEqual(obtenues, {});
  assert.deepEqual(chaine, []);
});

test("un agent ne s'appelle pas lui-même", async () => {
  const fondations = outilParId("fondations_predimensionnement");
  const { obtenues } = await deduireLesEntrees(fondations, {
    fournies: { h0: 0.45, altitude: 250 },
    assertions: [],
    dejaVus: new Set([fondations.id, "profondeur_hors_gel"])
  });

  assert.deepEqual(obtenues, {});
});

test("chaque entrée du calcul dit d'où elle vient", () => {
  const fondations = outilParId("fondations_predimensionnement");
  const rendu = provenancesDesEntrees(fondations, {
    fournies: { contrainteLimite: 1, horsGel: 0.9, araseSuperieure: -0.1, altitude: 250 },
    depuisMemoire: { altitude: { enonce: "Altitude : 250 m", trancheeLe: "2026-08-31" } },
    entrees: { contrainteLimite: 1 },
    chaine: [{ pour: "horsGel", titre: "Profondeur hors gel des fondations", outil: "profondeur_hors_gel_V1" }]
  });

  assert.equal(rendu.contrainteLimite.origine, "dite");
  assert.equal(rendu.horsGel.origine, "utilitaire");
  assert.equal(rendu.altitude.origine, "memoire");
  assert.equal(rendu.araseSuperieure.origine, "defaut");
});


test("une entrée que le projet rend inutile ne se demande pas, même inventée", async () => {
  // Le cas réel, et il annulait tout le bénéfice du tour précédent : la mémoire
  // porte « Profondeur hors gel : 0,99 m », le modèle invente quand même un H0,
  // et l'écran le demandait — parce qu'on triait les valeurs fabriquées sur le
  // drapeau `requis` **avant** d'avoir lu la mémoire. On saisissait alors 0,99
  // sous deux noms, et le copilote passait pour un outil qui n'écoute pas.
  //
  // L'ordre compte : on écarte d'abord tout ce qui a été fabriqué, on lit la
  // mémoire et l'enchaînement, et c'est seulement ensuite qu'on regarde ce qui
  // manque vraiment.
  const resultat = await executerOutil({
    id: "fondations_predimensionnement",
    entrees: { contrainteLimite: 1, h0: 0.99, altitude: 980 },
    assertions: [contrainteDuSite("frost_depth", "0.99 m", { code_insee: "31555", altitude: 250 })],
    question: "fais le dimensionnement des fondations de cette descente de charge, avec qels = 1bar"
  });

  // Aucune question : l'agent est allé jusqu'à la note, et c'est elle qui
  // manque.
  assert.equal(resultat.statut, "refus");
  assert.match(resultat.message, /Aucune note de calcul n'est jointe/);
  assert.equal(resultat.entrees.h0, undefined);
  assert.equal(resultat.entrees.horsGel, "0.99");
  assert.ok(resultat.ecartees.includes("H0 retenu pour le département"));
});

test("une entrée requise sans condition se demande toujours", async () => {
  // Le garde-fou ne se relâche pas : sans cote hors gel connue, H0 reste une
  // décision que personne n'a prise, et le modèle ne la prend pas à sa place.
  const resultat = await executerOutil({
    id: "fondations_predimensionnement",
    entrees: { contrainteLimite: 1, h0: 0.99 },
    assertions: [],
    question: "dimensionne les massifs avec une contrainte de sol à 1 bar"
  });

  assert.equal(resultat.statut, "aConfirmer");
  assert.deepEqual(resultat.champs.map((champ) => champ.cle), ["h0"]);
});


test("un nombre collé à son unité reste un nombre cité", () => {
  // « qels = 1bar » est ce que les gens écrivent. Exiger l'espace faisait
  // passer pour inventée une valeur que l'utilisateur venait de donner, et
  // l'écran la lui redemandait — précisément ce que ce garde-fou évite.
  assert.equal(valeurCiteePar("avec qels = 1bar", "1"), true);
  assert.equal(valeurCiteePar("une altitude de 250m", "250"), true);
  assert.equal(valeurCiteePar("H0 = 0,45m", "0.45"), true);
  assert.equal(valeurCiteePar("contrainte 1.5bar", "1.5"), true);

  // Ce qu'un nombre ne tolère pas, c'est un chiffre de part et d'autre.
  assert.equal(valeurCiteePar("12 massifs", "1"), false);
  assert.equal(valeurCiteePar("une contrainte de 1,5 bar", "1"), false);
  assert.equal(valeurCiteePar("H0 = 0,45 m", "45"), false);
  assert.equal(valeurCiteePar("R+3", "0.45"), false);

  // Une fin de phrase reste une borne.
  assert.equal(valeurCiteePar("la contrainte vaut 1.", "1"), true);

  // Et un mot se borne toujours comme un mot : « III » ne se lit pas dans « II ».
  assert.equal(valeurCiteePar("catégorie II", "III"), false);
  assert.equal(valeurCiteePar("classe de sol C", "C"), true);
});


test("un cas rangé à la demande rend l'appui calculable", async () => {
  // Le rangement n'est pas une donnée du projet : c'est une décision de lecture
  // qu'on vient de prendre à l'écran. Elle voyage donc avec l'appel de l'outil,
  // comme un aiguillage — et le garde-fou des valeurs fabriquées ne s'y oppose
  // pas, sans quoi il faudrait justifier auprès du copilote un choix qu'on
  // vient de lui donner.
  const fondations = outilParId("fondations_predimensionnement");
  const rangement = fondations.entrees.find((entree) => entree.cle === "rangementDesCas");

  assert.ok(rangement, "l'agent déclare où ranger les cas qu'il n'a pas su nommer");
  assert.equal(rangement.aiguillage, true);

  // Sans note jointe l'utilitaire refuse, mais le rangement a bien traversé le
  // garde-fou : il figure dans les entrées retenues, pas dans les écartées.
  const resultat = await executerOutil({
    id: "fondations_predimensionnement",
    entrees: { contrainteLimite: 1, horsGel: 0.99, rangementDesCas: "Effort normal = G" },
    question: "range l'effort normal en permanente, contrainte 1 bar et hors gel 0,99 m"
  });

  assert.equal(resultat.statut, "refus");
  assert.equal(resultat.entrees.rangementDesCas, "Effort normal = G");
  assert.equal(resultat.ecartees.includes("Rangement des cas de charge"), false);
});


/* ------------------------------------------------------------------ *
 * L'étude du projet pré-remplit ce qu'elle sait
 * ------------------------------------------------------------------ */

/**
 * Le référentiel incendie, joué sur place.
 *
 * L'agent l'appelle par le réseau — c'est une fonction voisine. Ici on
 * court-circuite le transport et l'on branche le **vrai** raisonnement : sans
 * cela on vérifierait que l'on a bien composé un numéro, pas que la réponse
 * tient.
 */
const { demander } = await import("../../incendie-habitation/corpus.js");
globalThis.Deno = globalThis.Deno ?? { env: { get: () => "" } };
const vraiFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  if (String(url).includes("incendie-habitation")) {
    const corps = JSON.parse(options?.body ?? "{}");
    return new Response(JSON.stringify({ reponse: demander(corps.produit, corps.reponses ?? {}) }),
      { status: 200, headers: { "Content-Type": "application/json" } });
  }
  return vraiFetch(url, options);
};

/** Une étude telle que l'écran l'enregistre : des booléens, pas des « oui ». */
const ETUDE = {
  id: "e1",
  titre: "Bâtiment A — collectif",
  reponses: {
    logementsSuperposes: true,
    etagesSurRdc: 3,
    duplexOuTriplexAuDernierEtage: false,
    hauteurPlancherBasNiveauLePlusHaut: 9.4,
    // L'article 1er tranche sur **deux** hauteurs : sans la seconde, le
    // référentiel ne conclut pas son champ d'application, et l'étude ne répond
    // donc pas à tout ce qu'on lui demande. Une étude complète les porte toutes
    // les deux.
    hauteurPlancherBasLogementLePlusHaut: 9.4,
    niveauxEnSousSol: 2,
    parcDeStationnement: true,
    surfaceParc: 480,
    // Une question que l'utilitaire ne déclare pas : elle ne pré-remplit rien,
    // et elle part quand même au référentiel.
    typeEscalierRetenu: "encloisonne"
  }
};

test("une case cochée dans l'étude devient un « oui » pour l'agent", () => {
  const outil = outilParId("incendie_habitation");
  const { valeurs, provenance } = prefillDepuisLEtude(outil, ETUDE);

  assert.equal(valeurs.logementsSuperposes, "oui");
  assert.equal(valeurs.duplexOuTriplexAuDernierEtage, "non");
  assert.equal(valeurs.etagesSurRdc, "3");
  assert.equal(valeurs.hauteurPlancherBasNiveauLePlusHaut, "9.4");
  assert.equal(provenance.etagesSurRdc.etude, "Bâtiment A — collectif");
});

test("un compte de niveaux enterrés devient un sous-sol, et zéro veut dire non", () => {
  const outil = outilParId("incendie_habitation");
  assert.equal(prefillDepuisLEtude(outil, ETUDE).valeurs.sousSol, "oui");
  assert.equal(
    prefillDepuisLEtude(outil, { ...ETUDE, reponses: { niveauxEnSousSol: 0 } }).valeurs.sousSol,
    "non");
  // Ne pas savoir n'est pas répondre « non » : sans la question, pas de valeur.
  assert.equal(prefillDepuisLEtude(outil, { reponses: {} }).valeurs.sousSol, undefined);
});

test("sans étude, rien n'est pré-rempli — et ce n'est pas une erreur", () => {
  const outil = outilParId("incendie_habitation");
  assert.deepEqual(prefillDepuisLEtude(outil, null), { valeurs: {}, provenance: {} });
  assert.deepEqual(prefillDepuisLEtude(outil, { reponses: "pas un objet" }), { valeurs: {}, provenance: {} });
});

test("l'étude répond aux questions requises : le formulaire ne s'ouvre plus", async () => {
  // Sans étude, l'utilitaire réclame ce qui lui manque.
  const sans = await executerOutil({ id: "incendie_habitation", entrees: { exigence: "classement" } });
  assert.equal(sans.statut, "manquant");
  assert.ok(sans.champs.some((champ) => champ.cle === "etagesSurRdc"));

  // Avec elle, il n'a plus rien à demander — et il dit d'où il le tient.
  const avec = await executerOutil({
    id: "incendie_habitation", entrees: { exigence: "classement" }, etudeIncendie: ETUDE
  });
  assert.notEqual(avec.statut, "manquant");
  assert.notEqual(avec.statut, "aConfirmer");
  assert.equal(avec.provenances.etagesSurRdc.origine, "etude");
  assert.match(avec.provenances.etagesSurRdc.detail, /Bâtiment A/);
});

test("ce que la conversation dit passe devant l'étude", async () => {
  // « Et si c'était une 2e famille ? » doit pouvoir contredire l'étude, sinon
  // on ne peut plus rien explorer.
  const resultat = await executerOutil({
    id: "incendie_habitation",
    entrees: { exigence: "classement", etagesSurRdc: "1" },
    question: "et avec 1 étage sur rez-de-chaussée ?",
    confirmees: ["etagesSurRdc"],
    etudeIncendie: ETUDE
  });

  assert.equal(resultat.entrees.etagesSurRdc, "1");
  assert.equal(resultat.provenances.etagesSurRdc.origine, "dite");
});

test("une valeur inventée se demande encore, mais le champ porte celle de l'étude", async () => {
  // Le modèle propose douze étages que personne n'a dits, et l'étude en dit
  // trois. On demande — c'est précisément le cas où il faut demander : une
  // contradiction entre ce que le modèle avance et ce que le projet sait ne se
  // tranche pas en silence.
  //
  // Mais le champ ne revient pas vide. Il porte la réponse de l'étude, pas la
  // proposition du modèle : sans cela on retaperait le nombre d'étages qu'on
  // vient de saisir dans l'onglet voisin.
  const resultat = await executerOutil({
    id: "incendie_habitation",
    entrees: { exigence: "classement", etagesSurRdc: "12" },
    question: "quel est le classement de ce bâtiment ?",
    etudeIncendie: ETUDE
  });

  assert.equal(resultat.statut, "aConfirmer");
  assert.equal(resultat.proposeParLeModele.etagesSurRdc, "12");
  assert.equal(resultat.connues.etagesSurRdc, "3");
});


test("les exigences du copilote et celles du référentiel sont la même liste", async () => {
  // Ce qu'on peut demander au référentiel est exactement ce qu'il exige. Les
  // deux listes vivent dans des fonctions différentes et ne peuvent pas
  // s'importer l'une l'autre : ce test est ce qui les empêche de diverger.
  //
  // Le jour où l'une gagne une valeur que l'autre n'a pas, c'est ici que ça se
  // voit — plutôt que six mois plus tard, sur un degré qu'on ne peut plus
  // demander ou qui ne se verse plus en mémoire.
  const { EXIGENCES } = await import("../../incendie-habitation/corpus.js");
  const outil = outilParId("incendie_habitation");
  const declarees = outil.entrees.find((entree) => entree.cle === "exigence").valeurs;

  assert.deepEqual([...declarees].sort(), [...EXIGENCES].sort());
});

test("chaque exigence déclarée correspond à un module du référentiel", async () => {
  // Une exigence qui ne mène à aucun module est une porte qui n'ouvre sur rien :
  // le modèle l'appellerait, et le référentiel répondrait « ce référentiel ne
  // porte pas ça ».
  const { CORPUS, EXIGENCES } = await import("../../incendie-habitation/corpus.js");
  const produits = new Set(CORPUS.map((module) => module.produit));

  const orphelines = [...EXIGENCES].filter((exigence) => !produits.has(exigence));
  assert.deepEqual(orphelines, []);
});

/* ── Le régime que chaque agent sert ─────────────────────────────────────── */

/** Ce qu'un agent dit de lui-même, sans regarder ce qu'il déclare. */
const parleDIncendie = (outil) =>
  /sécurité incendie|arrêté du 31 janvier 1986|coupe-feu/i.test(
    `${outil.titre ?? ""} ${outil.aQuoiCaSert ?? ""}`
  );

test("un agent qui parle de sécurité incendie déclare le régime qu'il sert", () => {
  // La garde qui tient tout le routage. Un agent incendie sans régime est un
  // agent qu'aucun projet ne saura choisir — ou que tous choisiront, ce qui
  // revient à tirer au sort sur la formulation de la question.
  //
  // Les deux listes se calculent séparément : l'une sur ce que l'agent raconte,
  // l'autre sur ce qu'il déclare. Les faire diverger fait tomber ce test.
  const racontent = OUTILS.filter(parleDIncendie).map((outil) => outil.id);
  const declarent = agentsIncendie().map((outil) => outil.id);

  assert.ok(racontent.length > 0, "aucun agent incendie : la garde ne garderait rien");
  assert.deepEqual(declarent, racontent);
});

test("deux agents ne servent pas le même régime", () => {
  // Sinon le filtre en rend deux, et l'on retombe exactement sur le choix à la
  // formulation que tout ce mécanisme existe pour supprimer.
  const regimes = agentsIncendie().map((outil) => regimeDeLAgent(outil));
  assert.deepEqual([...new Set(regimes)], regimes);
  // Et chacun est un régime que le vocabulaire connaît : `regimeIncendie: "ERP"`
  // sortirait l'agent de la liste sans que rien ne le dise.
  assert.deepEqual(regimes.filter((regime) => !CLES_REGIME_INCENDIE.includes(regime)), []);
});

test("les agents qui ne servent aucun régime ne sont jamais concernés", () => {
  // Le spectre sismique, les fondations : le routage incendie ne doit ni les
  // offrir ni les écarter.
  assert.equal(regimeDeLAgent(outilParId("spectre_elastique_ec8")), "");
  assert.equal(regimeDeLAgent(outilParId("fondations_predimensionnement")), "");
  assert.equal(regimeDeLAgent(outilParId("profondeur_hors_gel")), "");
  assert.equal(regimeDeLAgent(null), "");
  assert.equal(agentsIncendie().some((outil) => outil.id === "spectre_elastique_ec8"), false);
});

test("filtrer sur un régime rend exactement les agents qui le déclarent", () => {
  // Le test d'acceptation du plan : ajouter l'ERP doit se réduire à un agent de
  // plus portant `regimeIncendie: "erp"`. Rien ici ne nomme d'identifiant — la
  // liste se déduit des déclarations, pour chacun des régimes du vocabulaire.
  for (const regime of CLES_REGIME_INCENDIE) {
    assert.deepEqual(
      agentsIncendie(regime).map((outil) => outil.id),
      agentsIncendie().filter((outil) => regimeDeLAgent(outil) === regime).map((outil) => outil.id),
      `le filtre « ${regime} » ne rend pas ce que les agents déclarent`
    );
  }
});

test("un régime qu'on ne sait pas lire n'écarte rien", () => {
  // Règle 5, appliquée au routage : une valeur illisible en mémoire ferait un
  // Copilote muet sur l'incendie, sans que rien ne dise pourquoi. On ne sait
  // pas — donc on offre tout, et le premier agent appelé posera la question.
  // La liste attendue se calcule ici, sur les déclarations, et non en
  // rappelant la fonction qu'on teste : sinon un filtre qui rendrait
  // n'importe quoi le rendrait pareil des deux côtés.
  const tous = OUTILS.filter((outil) => regimeDeLAgent(outil)).map((outil) => outil.id);
  assert.deepEqual(agentsIncendie("ERP").map((outil) => outil.id), tous);
  assert.deepEqual(agentsIncendie("bâtiment agricole").map((outil) => outil.id), tous);
  assert.deepEqual(agentsIncendie("").map((outil) => outil.id), tous);
});

/* ── Le régime décide quels agents le modèle voit ────────────────────────── */

test("filtré sur un régime, le modèle voit exactement un agent incendie", () => {
  // La garde du routage. Le modèle ne choisit plus sur la formulation de la
  // question : il n'a qu'un agent incendie sous la main, et c'est celui du
  // texte dont ce bâtiment relève. Une consigne se contourne, une absence non.
  for (const regime of CLES_REGIME_INCENDIE) {
    const offerts = declarationsPourModele({ regimeIncendie: regime }).map((d) => d.name);
    const incendie = offerts.filter((nom) => regimeDeLAgent(outilParId(nom)));

    assert.ok(incendie.length <= 1, `${regime} en offre ${incendie.length}`);
    // Et celui qu'on voit est bien celui du régime visé, jamais un autre.
    for (const nom of incendie) assert.equal(regimeDeLAgent(outilParId(nom)), regime);
  }
});

test("les agents qui ne servent aucun régime ne sont jamais écartés", () => {
  // Le spectre sismique, les fondations, le hors gel : le routage incendie ne
  // les concerne pas, et les perdre rendrait le Copilote muet sur tout le reste.
  const sansRegime = OUTILS.filter((outil) => !regimeDeLAgent(outil)).map((outil) => outil.id);
  assert.ok(sansRegime.length, "il existe des agents sans régime");

  for (const regime of [...CLES_REGIME_INCENDIE, "", "ERP", "bâtiment agricole"]) {
    const offerts = declarationsPourModele({ regimeIncendie: regime }).map((d) => d.name);
    assert.deepEqual(sansRegime.filter((id) => !offerts.includes(id)), [], regime);
  }
});

test("sans régime en mémoire, on n'écarte rien : on ne choisit pas à la place de quelqu'un", () => {
  // Un projet qui ne porte pas la variable, deux zones qui se contredisent, une
  // valeur qu'on ne sait pas lire : les trois rendent `""`, et les trois
  // appellent la même suite (règle 5).
  const tous = declarationsPourModele().map((d) => d.name);
  assert.deepEqual(declarationsPourModele({ regimeIncendie: "" }).map((d) => d.name), tous);
  assert.deepEqual(declarationsPourModele({ regimeIncendie: "ERP" }).map((d) => d.name), tous);
  assert.deepEqual(OUTILS.map((outil) => outil.id), tous, "sans argument, tout est offert");
});

test("aucun identifiant d'agent n'est écrit dans l'orchestration", async () => {
  // La garde qui empêche le raccourci de revenir : une liste d'identifiants
  // dans l'orchestration serait juste le jour où on l'écrit, et fausse au
  // troisième agent. Le routage se déduit des déclarations, ou il ne se déduit
  // de rien.
  const { readFileSync } = await import("node:fs");
  const fichiers = ["project-copilot/index.ts", "executer-utilitaire/index.ts"];

  for (const nom of fichiers) {
    // **Lu, et pas supposé.** Un chemin qui ne résout plus ferait passer cette
    // garde sans rien vérifier — un test vert qui ne regarde rien est pire
    // qu'un test absent.
    const source = readFileSync(new URL(`../../${nom}`, import.meta.url), "utf8");
    assert.ok(source.length > 500, `${nom} n'a pas été lue`);

    for (const outil of OUTILS) {
      assert.ok(!source.includes(outil.id), `${nom} nomme ${outil.id}`);
    }
  }
});

/* ── Le bon référentiel, ou rien ─────────────────────────────────────────── */

test("un agent refuse de calculer pour un bâtiment d'un autre régime", async () => {
  // Le calcul aurait lieu et rendrait une exigence juste, vérifiable, tirée du
  // mauvais texte. Rien à l'écran ne dirait qu'on a répondu avec l'arrêté
  // habitation à une question qui portait sur un ERP.
  const resultat = await executerOutil({
    id: "incendie_habitation",
    entrees: { exigence: "classement", regimeIncendie: "erp" },
    question: "quel classement pour ce bâtiment, qui relève du régime erp ?",
    confirmees: ["regimeIncendie=erp"],
    etudeIncendie: ETUDE
  });

  assert.equal(resultat.statut, "refus");
  assert.match(resultat.message, /Établissement recevant du public/);
  assert.match(resultat.message, /aucun calcul n'a eu lieu/i);
});

test("le régime qu'il sert ne l'empêche pas de calculer", async () => {
  const resultat = await executerOutil({
    id: "incendie_habitation",
    entrees: { exigence: "classement", regimeIncendie: "habitation" },
    question: "quel classement, en régime habitation ?",
    confirmees: ["regimeIncendie=habitation"],
    etudeIncendie: ETUDE
  });

  assert.notEqual(resultat.statut, "refus");
});

test("un agent sans régime ne refuse jamais sur ce motif", () => {
  // Et un régime qu'on n'a pas su lire non plus : ne pas savoir n'autorise pas
  // à conclure que c'est le mauvais.
  assert.equal(regimeQuiNeCorrespondPas(outilParId("spectre_elastique_ec8"), { regimeIncendie: "erp" }), "");
  assert.equal(regimeQuiNeCorrespondPas(outilParId("incendie_habitation"), { regimeIncendie: "ERP" }), "");
  assert.equal(regimeQuiNeCorrespondPas(outilParId("incendie_habitation"), {}), "");
  assert.equal(regimeQuiNeCorrespondPas(null, { regimeIncendie: "erp" }), "");
});

/* ── L'entrée qui porte le régime ────────────────────────────────────────── */

test("chaque agent incendie sait recevoir le régime, et le lit dans la mémoire", () => {
  // Sans cette entrée, la réponse ne saurait pas nommer la qualification sur
  // laquelle elle repose — et le refus ci-dessus n'aurait rien à comparer.
  for (const outil of agentsIncendie()) {
    const entree = outil.entrees.find((champ) => champ.cle === "regimeIncendie");
    assert.ok(entree, `${outil.id} ne porte pas l'entrée`);
    assert.deepEqual(entree.valeurs, CLES_REGIME_INCENDIE);
    assert.equal(entree.depuisMemoire, CLE_REGIME_INCENDIE);
    // **Pas une entrée d'aiguillage** : le régime est une donnée du bâtiment,
    // pas ce que le modèle est allé chercher. Le garde-fou des valeurs
    // fabriquées doit donc s'y appliquer.
    assert.notEqual(entree.aiguillage, true);
  }
});

test("un régime que le modèle fabrique ne s'applique jamais : il se demande", async () => {
  // « Réponds-moi pour ce bâtiment » suivi d'un « erp » venu de nulle part. La
  // valeur n'entre pas dans le calcul — et depuis qu'elle est requise, elle ne
  // s'écarte plus en silence : l'écran la demande, et quelqu'un tranche.
  //
  // C'est plus fort qu'avant. Écartée, elle laissait le calcul se faire sur le
  // régime de l'étude sans que personne ne voie qu'on avait proposé un autre
  // texte ; demandée, la contradiction se pose à l'écran.
  const resultat = await executerOutil({
    id: "incendie_habitation",
    entrees: { exigence: "classement", regimeIncendie: "erp" },
    question: "quel est le classement de ce bâtiment ?",
    etudeIncendie: ETUDE
  });

  assert.equal(resultat.statut, "aConfirmer");
  assert.ok(resultat.champs.some((champ) => champ.cle === "regimeIncendie"), "elle n'est pas demandée");
  // Et ce qu'on montre à côté de la proposition du modèle, c'est ce que le
  // projet dit : l'étude a conclu le champ d'application, et c'est elle qui
  // doit rester affichée tant que personne n'a tranché.
  assert.equal(resultat.connues.regimeIncendie, "habitation");
  assert.equal(resultat.proposeParLeModele.regimeIncendie, "erp");
});

/* ── La portée d'une valeur, et ce qu'on fait quand elles se contredisent ── */

/** La même affirmation, posée sur une zone. */
function surLaZone(cle, valeur, zone = "") {
  return donnee(zone ? `${cle}@${zone}` : cle, valeur);
}

test("la portée remonte avec la valeur", () => {
  // Sans elle, une réponse ne peut pas dire de quelle zone elle parle — et une
  // réponse qu'on ne peut pas situer ne se conteste pas.
  const { valeurs, provenance } = prefillDepuisMemoire(
    SPECTRE, [surLaZone("classe-de-sol", "Classe de sol D", "Bâtiment A")]
  );

  assert.equal(valeurs.soilClass, "D");
  assert.equal(provenance.soilClass.portee, "Bâtiment A");
});

test("deux portées qui se contredisent ne pré-remplissent rien", () => {
  // **Le défaut que l'étape répare.** On rangeait par sujet en écartant la
  // portée, et la première écrite gagnait : deux classes de sol en mémoire, et
  // l'agent calculait sur celle qui se trouvait être arrivée d'abord. Rien à
  // l'écran ne disait qu'il y en avait une autre.
  const deux = [
    surLaZone("classe-de-sol", "Classe de sol C", "Bâtiment A"),
    surLaZone("classe-de-sol", "Classe de sol D", "Escalier B")
  ];
  const { valeurs, provenance, contradictions } = prefillDepuisMemoire(SPECTRE, deux);

  assert.equal(valeurs.soilClass, undefined);
  assert.equal(provenance.soilClass, undefined);

  // Et ce n'est **pas** « je n'ai pas trouvé » : le projet sait deux choses, et
  // le taire ferait passer une contradiction pour une lacune (règle 5).
  assert.deepEqual(contradictions.soilClass.valeurs, ["C", "D"]);
  assert.deepEqual(contradictions.soilClass.portees, ["Bâtiment A", "Escalier B"]);
});

test("deux portées d'accord ne sont pas une contradiction", () => {
  // Refuser là aussi reposerait une question à laquelle le projet a répondu
  // deux fois pareil.
  const accord = [
    surLaZone("classe-de-sol", "Classe de sol C", "Bâtiment A"),
    surLaZone("classe-de-sol", "Classe de sol C", "Escalier B")
  ];
  const { valeurs, provenance, contradictions } = prefillDepuisMemoire(SPECTRE, accord);

  assert.equal(valeurs.soilClass, "C");
  assert.deepEqual(contradictions, {});
  // Les deux sont nommées : lire une seule portée ferait croire qu'on n'a lu
  // qu'une affirmation.
  assert.deepEqual(provenance.soilClass.portees, ["Bâtiment A", "Escalier B"]);
});

test("la question qui nomme une zone écarte les autres", () => {
  // « Et pour l'escalier B ? » ne parle pas des mêmes affirmations que la
  // question d'avant. Les autres zones ne répondent pas à celle-là.
  const deux = [
    surLaZone("classe-de-sol", "Classe de sol C", "Bâtiment A"),
    surLaZone("classe-de-sol", "Classe de sol D", "Escalier B")
  ];
  const vise = prefillDepuisMemoire(SPECTRE, deux, { question: "et pour l'escalier B, ça donne quoi ?" });

  assert.equal(vise.valeurs.soilClass, "D");
  assert.equal(vise.provenance.soilClass.portee, "Escalier B");
  assert.deepEqual(vise.contradictions, {});

  // Les accents et la casse ne comptent pas : personne ne retape « Bâtiment A »
  // à l'identique.
  const autre = prefillDepuisMemoire(SPECTRE, deux, { question: "et sur le batiment a ?" });
  assert.equal(autre.valeurs.soilClass, "C");
});

test("l'ouvrage entier répond toujours, et ne l'emporte pas pour autant", () => {
  // Il n'exclut aucune zone : il est donc retenu même quand la question en
  // nomme une. Mais le plus spécifique ne gagne pas — sur un chantier, deux
  // affirmations qui se contredisent sont une question à poser, pas une
  // priorité à appliquer.
  const mixte = [
    surLaZone("classe-de-sol", "Classe de sol C"),
    surLaZone("classe-de-sol", "Classe de sol D", "Escalier B")
  ];
  const rendu = prefillDepuisMemoire(SPECTRE, mixte, { question: "pour l'escalier B ?" });

  assert.equal(rendu.valeurs.soilClass, undefined);
  assert.ok(rendu.contradictions.soilClass.portees.includes("l'ouvrage entier"));

  // D'accord, ils tranchent — et c'est la portée de la zone visée qu'on montre.
  const daccord = [
    surLaZone("classe-de-sol", "Classe de sol D"),
    surLaZone("classe-de-sol", "Classe de sol D", "Escalier B")
  ];
  const dit = prefillDepuisMemoire(SPECTRE, daccord, { question: "pour l'escalier B ?" });
  assert.equal(dit.valeurs.soilClass, "D");
  assert.equal(dit.provenance.soilClass.portee, "Escalier B");
});

test("une portée de deux lettres ne désigne rien", () => {
  // Une zone « A » se retrouverait dans la moitié des phrases, et l'on
  // écarterait les autres sur une coïncidence.
  const deux = [
    surLaZone("classe-de-sol", "Classe de sol C", "A"),
    surLaZone("classe-de-sol", "Classe de sol D", "B")
  ];
  const rendu = prefillDepuisMemoire(SPECTRE, deux, { question: "quelle classe de sol a-t-on ?" });

  assert.equal(rendu.valeurs.soilClass, undefined);
  assert.ok(rendu.contradictions.soilClass);
});

test("une valeur sans portée continue de répondre comme avant", () => {
  // La grande majorité des affirmations n'en portent aucune : l'étape ne doit
  // rien changer pour elles.
  const { valeurs, provenance, contradictions } = prefillDepuisMemoire(SPECTRE, MEMOIRE);

  assert.deepEqual(valeurs, { zoneSismique: "4", importanceCategory: "II", soilClass: "C" });
  assert.equal(provenance.soilClass.portee, "");
  assert.deepEqual(contradictions, {});
});

test("ce qui manque dit pourquoi la mémoire n'a pas répondu", async () => {
  // Se taire ferait passer une contradiction pour une lacune : on ressaisirait
  // une valeur que le projet porte déjà, sans savoir qu'on tranche.
  const resultat = await executerOutil({
    id: "spectre_elastique_ec8",
    entrees: {},
    question: "quel spectre pour ce projet ?",
    assertions: [
      donnee("zone-sismique", "4"),
      donnee("categorie-importance", "II"),
      surLaZone("classe-de-sol", "Classe de sol C", "Bâtiment A"),
      surLaZone("classe-de-sol", "Classe de sol D", "Escalier B")
    ]
  });

  assert.equal(resultat.statut, "manquant");
  assert.ok(resultat.champs.some((champ) => champ.cle === "soilClass"));
  assert.match(resultat.message, /répond plusieurs choses/);
  assert.match(resultat.message, /Bâtiment A/);
  assert.match(resultat.message, /Escalier B/);
  assert.deepEqual(resultat.contradictions.soilClass.valeurs, ["C", "D"]);
});

test("une contradiction sur une entrée qui ne manque pas ne se dit pas", () => {
  // Le message ne parle que de ce qui bloque : nommer une contradiction sur une
  // valeur que la conversation a déjà tranchée ferait chercher un problème
  // résolu.
  assert.equal(phraseDesContradictions({}), "");
  assert.match(
    phraseDesContradictions({
      soilClass: { libelle: "Classe de sol", valeurs: ["C", "D"], portees: ["A", "B"] }
    }),
    /Classe de sol : C ou D/
  );
});

/* ── Sur quoi la réponse repose, écrit une fois pour toutes ──────────────── */

test("la phrase nomme la valeur, sa portée et le jour où elle a été tranchée", () => {
  // Sans elle, on lit « CF 1 h » sans savoir sur quel classement, pour quelle
  // zone, tranché quand. La réponse a l'air juste, elle l'est peut-être, et
  // personne ne peut le vérifier.
  const dit = surQuoiCaRepose(SPECTRE, {
    fournies: { soilClass: "C" },
    provenances: { soilClass: { origine: "memoire", portee: "Escalier B", trancheeLe: "2026-02-20T09:00:00Z" } }
  });

  assert.match(dit, /Classe de sol : C/);
  assert.match(dit, /Escalier B/);
  assert.match(dit, /tranché le 20 février 2026/);
});

test("la qualification vient en tête, parce qu'elle décide de tout le reste", () => {
  // Le régime dit quel texte s'applique : le lire en troisième position le
  // ferait lire en dernier.
  const incendie = outilParId("incendie_habitation");
  const dit = surQuoiCaRepose(incendie, {
    fournies: { regimeIncendie: "habitation", etagesSurRdc: "3" },
    provenances: {
      etagesSurRdc: { origine: "memoire", trancheeLe: "2026-01-02T09:00:00Z" },
      regimeIncendie: { origine: "memoire", portee: "Étages", trancheeLe: "2026-03-01T09:00:00Z" }
    }
  });

  assert.ok(
    dit.indexOf(SUJET_REGIME_INCENDIE) < dit.indexOf("étages sur rez-de-chaussée"),
    dit
  );
  // Et « le 1 mars » ne se dit pas : une date mal écrite au milieu d'une
  // provenance fait douter du reste de la phrase.
  assert.match(dit, /tranché le 1er mars 2026/);
});

test("ce qui ne vient pas du projet n'y figure pas", () => {
  // Une valeur dite dans la conversation est sous les yeux ; une valeur par
  // défaut est déclarée ; une valeur calculée en chemin est déjà dans `chaine`.
  // Les nommer ici ferait passer pour une affirmation du projet ce qui n'en est
  // pas une — exactement l'inverse du but.
  const dit = surQuoiCaRepose(SPECTRE, {
    fournies: { soilClass: "C", zoneSismique: "4", importanceCategory: "II" },
    provenances: {
      soilClass: { origine: "dite" },
      zoneSismique: { origine: "defaut" },
      importanceCategory: { origine: "utilitaire", detail: "Zonage sismique" }
    }
  });

  assert.equal(dit, "");
});

test("l'étude se dit comme une étude, et sans date", () => {
  // Une réponse d'étude n'a été tranchée par personne : lui donner une date la
  // hausserait au rang de décision.
  const dit = surQuoiCaRepose(SPECTRE, {
    fournies: { soilClass: "C" },
    provenances: { soilClass: { origine: "etude", detail: "étude « Bâtiment A »", trancheeLe: "2026-02-20" } }
  });

  assert.match(dit, /d'après l'étude du projet/);
  assert.doesNotMatch(dit, /tranché/);
});

test("une valeur absente ou une date illisible ne s'inventent pas", () => {
  // Règle 5 : une provenance qui nomme une valeur que le calcul n'a pas reçue
  // serait une provenance fausse, et elle a l'air aussi vraie que les autres.
  assert.equal(surQuoiCaRepose(SPECTRE, {
    fournies: {}, provenances: { soilClass: { origine: "memoire" } }
  }), "");

  const sansDate = surQuoiCaRepose(SPECTRE, {
    fournies: { soilClass: "C" },
    provenances: { soilClass: { origine: "memoire", trancheeLe: "jamais" } }
  });
  assert.match(sansDate, /Classe de sol : C$|Classe de sol : C\./);
  assert.doesNotMatch(sansDate, /tranché/);

  assert.equal(surQuoiCaRepose(null, {}), "");
  assert.equal(surQuoiCaRepose(SPECTRE, {}), "");
});

test("le résultat la porte, et elle part au modèle", async () => {
  // Elle ne sert à rien si elle reste au serveur : c'est le modèle qui rédige
  // la réponse, et c'est lui qui doit la reprendre telle quelle.
  const resultat = await executerOutil({
    id: "spectre_elastique_ec8",
    entrees: {},
    question: "quel spectre pour ce projet ?",
    assertions: [
      donnee("zone-sismique", "4", { decided_at: "2026-03-12T09:00:00Z" }),
      donnee("categorie-importance", "II", { decided_at: "2026-01-05T09:00:00Z" }),
      surLaZone("classe-de-sol", "Classe de sol C", "Escalier B")
    ]
  });

  assert.equal(resultat.statut, "fait");
  assert.match(resultat.surQuoiCaRepose, /Zone de sismicité : 4/);
  assert.match(resultat.surQuoiCaRepose, /Escalier B/);

  // `sansFigure` allège ce qui ne sert qu'à l'écran. La provenance, elle, sert
  // au modèle : l'alléger la ferait disparaître de la réponse rédigée.
  assert.equal(sansFigure(resultat).surQuoiCaRepose, resultat.surQuoiCaRepose);
});

test("la consigne nomme exactement le champ que le résultat porte", async () => {
  // Deux endroits écrivent ce nom : le résultat qui le remplit, et la consigne
  // qui dit de le reprendre tel quel. Un champ renommé d'un côté seulement ne
  // se voit nulle part — le modèle chercherait une clé absente et rédigerait la
  // provenance de mémoire, c'est-à-dire de travers.
  const { readFileSync } = await import("node:fs");
  const consignes = readFileSync(
    new URL("../../project-copilot/index.ts", import.meta.url), "utf8"
  );

  const resultat = await executerOutil({
    id: "spectre_elastique_ec8",
    entrees: {},
    question: "quel spectre ?",
    assertions: [donnee("zone-sismique", "4"), donnee("categorie-importance", "II"), donnee("classe-de-sol", "C")]
  });

  assert.equal(resultat.statut, "fait");
  const nommes = [...consignes.matchAll(/`(surQuoiCaRepose|[a-zA-Z]+CaRepose)`/g)].map((t) => t[1]);
  assert.ok(nommes.length, "la consigne ne nomme aucun champ de provenance");

  for (const nom of new Set(nommes)) {
    assert.ok(nom in resultat, `la consigne nomme « ${nom} », que le résultat ne porte pas`);
  }
});

/* ── Ce que le projet pourrait retenir de la conversation ────────────────── */

test("ce que quelqu'un a dit et que le projet sait ranger se propose", () => {
  // Sans cela, la valeur repart avec la discussion : on la retape à la suivante.
  const versables = aVerserAuProjet(SPECTRE, {
    fournies: { soilClass: "C" },
    provenances: { soilClass: { origine: "dite" } }
  });

  assert.equal(versables.length, 1);
  assert.equal(versables[0].sujet, "Classe de sol");
  // La clé sous laquelle l'agent relira : le navigateur vérifie que le nom y
  // mène, il est seul à savoir normaliser un sujet.
  assert.deepEqual(versables[0].cles, ["classe-de-sol", "type-de-sol", "categorie-de-sol", "sol-ec8"]);
  assert.equal(versables[0].valeur, "C");
});

test("ce qui ne vient pas de quelqu'un ne se propose pas", () => {
  // La mémoire le porte déjà ; l'étude et l'enchaînement ont leur propre chemin ;
  // une valeur par défaut, personne ne l'a choisie.
  for (const origine of ["memoire", "etude", "utilitaire", "defaut"]) {
    assert.deepEqual(aVerserAuProjet(SPECTRE, {
      fournies: { soilClass: "C" },
      provenances: { soilClass: { origine } }
    }), [], origine);
  }
});

test("une entrée d'aiguillage ne se propose jamais", () => {
  // Elle dit ce que le modèle cherchait, pas ce que le bâtiment vaut. Versée,
  // elle ferait entrer en mémoire la question au lieu de la réponse.
  //
  // L'agent est construit ici, et non pris dans le catalogue : aucune entrée
  // d'aiguillage n'y déclare aujourd'hui de clé de mémoire, si bien que la règle
  // ne s'exercerait pas. Le plan en prévoyait pourtant une — le régime devait
  // être les deux à la fois —, et c'est ce jour-là qu'elle doit tenir.
  const invente = {
    id: "invente",
    entrees: [
      { cle: "cherchee", libelle: "Ce que le modèle cherchait", aiguillage: true, depuisMemoire: "ce-que-le-modele-cherchait" },
      { cle: "tenue", libelle: "Ce que le bâtiment vaut", depuisMemoire: "ce-que-le-batiment-vaut" }
    ]
  };

  const versables = aVerserAuProjet(invente, {
    fournies: { cherchee: "classement", tenue: "3e famille B" },
    provenances: { cherchee: { origine: "dite" }, tenue: { origine: "dite" } }
  });

  assert.deepEqual(versables.map((v) => v.cles[0]), ["ce-que-le-batiment-vaut"]);

  // Et le catalogue d'aujourd'hui ne propose rien d'un aiguillage non plus.
  const incendie = outilParId("incendie_habitation");
  const reels = aVerserAuProjet(incendie, {
    fournies: { exigence: "classement", regimeIncendie: "habitation" },
    provenances: { exigence: { origine: "dite" }, regimeIncendie: { origine: "dite" } }
  });
  assert.deepEqual(reels.map((v) => v.cles[0]), ["regime-de-securite-incendie"]);
});

test("ce que le projet ne sait pas ranger ne se propose pas", () => {
  // Sans clé de mémoire, le sujet atterrirait au hasard — et la question se
  // reposerait quand même, sur une mémoire pourtant enrichie.
  const incendie = outilParId("incendie_habitation");
  const sansCle = incendie.entrees.find((entree) => !entree.depuisMemoire && !entree.aiguillage);
  assert.ok(sansCle, "toutes les entrées déclarent une clé : le cas n'existe plus");

  const versables = aVerserAuProjet(incendie, {
    fournies: { [sansCle.cle]: "3" },
    provenances: { [sansCle.cle]: { origine: "dite" } }
  });
  assert.deepEqual(versables, []);
});

test("le résultat porte ce qu'il y aurait à proposer", async () => {
  // Le tri appartient à la déclaration des entrées, donc au serveur : l'écran ne
  // connaît plus les agents et ne saurait pas quelles valeurs sont des valeurs
  // de projet.
  const resultat = await executerOutil({
    id: "spectre_elastique_ec8",
    entrees: { soilClass: "D" },
    question: "et avec une classe de sol D ?",
    confirmees: ["soilClass"],
    assertions: [donnee("zone-sismique", "4"), donnee("categorie-importance", "II")]
  });

  assert.equal(resultat.statut, "fait");
  assert.deepEqual(resultat.aVerser.map((v) => v.cles[0]), ["classe-de-sol"]);
  assert.equal(resultat.aVerser[0].valeur, "D");

  // Elle part au navigateur : c'est lui qui montre le bouton et prépare la
  // proposition.
  assert.deepEqual(sansFigure(resultat).aVerser, resultat.aVerser);
});

test("rien de ce que la mémoire porte déjà ne se repropose", async () => {
  // Le projet le sait : lui reproposer sa propre valeur ferait une proposition
  // vide de sens, et une deuxième affirmation pour un seul fait.
  const resultat = await executerOutil({
    id: "spectre_elastique_ec8",
    entrees: {},
    question: "quel spectre ?",
    assertions: [donnee("zone-sismique", "4"), donnee("categorie-importance", "II"), donnee("classe-de-sol", "C")]
  });

  assert.equal(resultat.statut, "fait");
  assert.deepEqual(resultat.aVerser, []);
});

/* ── Le régime se demande, et trois chemins le remplissent avant ─────────── */

test("le régime est requis : on ne calcule pas sous une qualification qu'on ignore", () => {
  // Une exigence juste tirée du mauvais texte reste une exigence fausse, et rien
  // à l'écran ne le dirait.
  const incendie = outilParId("incendie_habitation");
  const manquantes = entreesManquantes(incendie, { exigence: "classement" }).map((e) => e.cle);
  assert.ok(manquantes.includes("regimeIncendie"), manquantes.join(", "));
});

test("l'étude conclut le champ d'application, et le régime s'en déduit", async () => {
  // La question ne se pose donc pas pour un bâtiment déjà décrit dans l'Atelier.
  // Le seuil n'est pas recopié ici : on rejoue le module du référentiel, qui
  // porte la règle et son article.
  const incendie = outilParId("incendie_habitation");
  const lu = (reponses) => prefillDepuisLEtude(incendie, { titre: "B", reponses }).valeurs.regimeIncendie;

  assert.equal(lu({ hauteurPlancherBasLogementLePlusHaut: 9.4, hauteurPlancherBasNiveauLePlusHaut: 9.4 }),
    "habitation");
  // Au-delà de 50 m, l'arrêté cesse de s'appliquer : c'est un immeuble de grande
  // hauteur, et ce sont d'autres textes.
  assert.equal(lu({ hauteurPlancherBasLogementLePlusHaut: 9.4, hauteurPlancherBasNiveauLePlusHaut: 60 }),
    "igh");

  // Et quand le référentiel ne conclut pas — une des deux hauteurs manque —, on
  // ne devine pas : la question se pose (règle 5).
  assert.equal(lu({ hauteurPlancherBasNiveauLePlusHaut: 9.4 }), undefined);
  assert.equal(lu({}), undefined);

  // Le seuil vient bien du référentiel, et non d'une copie : le module qu'on
  // rejoue est celui que l'étude de l'Atelier utilise.
  const { champApplication } = await import("../../incendie-habitation/modules-classement.js");
  assert.equal(champApplication.produit, "dansLeChampDeLArrete");
  assert.equal(champApplication.source.article, "1er");
});

test("la mémoire du projet remplit le régime avant qu'on le demande", () => {
  // Le troisième chemin : une fois la réponse proposée et signée, la question ne
  // revient plus.
  const incendie = outilParId("incendie_habitation");
  const { valeurs } = prefillDepuisMemoire(incendie, [donnee(CLE_REGIME_INCENDIE, "habitation")]);
  assert.equal(valeurs.regimeIncendie, "habitation");
});

test("chaque valeur qu'un agent relit se propose sous un nom qu'il relit", () => {
  // **La garde du retour.** Une valeur donnée dans une discussion se propose
  // sous son nom lisible, et la proposition la range sous ce nom normalisé.
  // Quand ce nom n'est aucune des clés que l'agent déclare, la valeur entre en
  // mémoire et la question se repose quand même — le projet s'enrichit d'un
  // sujet que personne ne relit.
  //
  // Deux entrées étaient dans ce cas : « H0 retenu pour le département » se
  // rangeait sous `h0-retenu-pour-le-departement`, et l'agent relisait
  // `h0-hors-gel`.
  const boiteuses = [];

  for (const outil of OUTILS) {
    for (const entree of outil.entrees) {
      if (entree.aiguillage) continue;
      const cles = [].concat(entree.depuisMemoire ?? [])
        .map((declaree) => (typeof declaree === "string" ? declaree : declaree?.cle))
        .filter(Boolean);
      if (!cles.length) continue;

      // La normalisation vit au navigateur — la cloison interdit de l'importer
      // ici. On la rejoue sur la seule forme qui compte : minuscules, sans
      // accents, tout ce qui n'est ni lettre ni chiffre devient un tiret.
      const nom = String(entree.libelle ?? "")
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      if (!cles.includes(nom)) boiteuses.push(`${outil.id}.${entree.cle} → ${nom}`);
    }
  }

  assert.deepEqual(boiteuses, []);
});
