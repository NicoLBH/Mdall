import test from "node:test";
import assert from "node:assert/strict";

import {
  CLES_REGIME_INCENDIE,
  DECLARATION_REGIME_INCENDIE,
  REFERENCE_REGIME_INCENDIE,
  REGIMES_INCENDIE,
  SUJET_REGIME_INCENDIE,
  regimeDuChampDeLArrete,
  regimeIncendieDe,
  regimeValide
} from "./regime-incendie.js";

/* ── Le vocabulaire ──────────────────────────────────────────────────────── */

test("un régime inconnu n'est pas rapproché du plus proche : il est refusé", () => {
  // C'est tout l'enjeu du routage. Si « habitations » devenait « habitation »,
  // un agent mal orthographié serait offert à un projet qui ne relève pas de
  // son texte — et personne ne verrait d'où vient la réponse.
  assert.equal(regimeValide("habitation"), "habitation");
  assert.equal(regimeValide("habitations"), "");
  assert.equal(regimeValide("Habitation"), "");
  assert.equal(regimeValide("ERP"), "");
  assert.equal(regimeValide(""), "");
  assert.equal(regimeValide(null), "");
  assert.equal(regimeValide(undefined), "");
});

test("tout régime nommé sait dire de quel texte il relève — sauf celui qui n'en a pas", () => {
  // `regimeVersable` écrit « renvoie à <texte> » : un régime sans texte
  // produirait une phrase qui s'arrête au milieu. Et « hors champ » est le seul
  // qui n'en ait pas, parce que c'est précisément ce qu'il dit — aucun des
  // référentiels qu'on sait traiter.
  const sansTexte = REGIMES_INCENDIE.filter((regime) => !regime.texte).map((regime) => regime.cle);
  assert.deepEqual(sansTexte, ["hors-champ"]);

  // Et chacun sait dire ce qu'il désigne : une clé sans définition se fait
  // redécrire à chaque écran, et deux descriptions d'une même chose divergent.
  const muets = REGIMES_INCENDIE.filter((regime) => !regime.quoi || !regime.libelle);
  assert.deepEqual(muets, []);
});

test("la déclaration ne recopie pas la liste des valeurs, elle la porte", () => {
  // Une liste de choix écrite deux fois — ici et dans le formulaire — finirait
  // par offrir un régime que le code ne sait pas lire (règle 4).
  assert.equal(DECLARATION_REGIME_INCENDIE.sujet, SUJET_REGIME_INCENDIE);
  assert.equal(DECLARATION_REGIME_INCENDIE.reference, REFERENCE_REGIME_INCENDIE);
  assert.deepEqual(DECLARATION_REGIME_INCENDIE.valeurs, CLES_REGIME_INCENDIE);
  assert.deepEqual(CLES_REGIME_INCENDIE, REGIMES_INCENDIE.map((regime) => regime.cle));

  // Chaque valeur offerte est une valeur que `regimeValide` accepte : sinon on
  // proposerait à l'écran un choix que le routage écarterait en silence.
  assert.deepEqual(
    DECLARATION_REGIME_INCENDIE.valeurs.filter((valeur) => !regimeValide(valeur)), []
  );
});

test("ce qu'un régime est se lit au même endroit que son nom", () => {
  assert.equal(regimeIncendieDe("igh")?.texte,
    "articles R.122-1 à R.122-29 du CCH et arrêté du 30 décembre 2011");
  assert.equal(regimeIncendieDe("Igh"), null);
  assert.equal(regimeIncendieDe(""), null);
});

/* ── Le champ d'application, lu sur le référentiel lui-même ──────────────── */

test("toute conclusion du champ d'application se traduit en régime", async () => {
  // Le point de couplage réel : les valeurs ne sont pas recopiées ici, elles
  // sont lues sur le module qui les produit. Le jour où l'article 1er sortira
  // une troisième conclusion — ou dira « dans le champ » autrement —, ce test
  // tombe, plutôt que le versement de se taire sans rien dire.
  const { champApplication } = await import("../../incendie-habitation/modules-classement.js");
  assert.equal(champApplication.produit, "dansLeChampDeLArrete");

  const conclusions = [...new Set(champApplication.regles.map((regle) => regle.alors?.valeur))];
  assert.ok(conclusions.length >= 2, "le champ d'application tranche dans les deux sens");

  const illisibles = conclusions.filter((valeur) => !regimeDuChampDeLArrete(valeur));
  assert.deepEqual(illisibles, [], "une conclusion de l'article 1er qu'on ne sait pas traduire");

  // Et elles ne se traduisent pas toutes pareil : deux conclusions opposées qui
  // rendraient le même régime seraient une lecture qui ne lit rien.
  const regimes = new Set(conclusions.map((valeur) => regimeDuChampDeLArrete(valeur)));
  assert.equal(regimes.size, conclusions.length);
});

test("dans le champ, c'est l'habitation ; au-delà de 50 m, c'est l'IGH", () => {
  assert.equal(regimeDuChampDeLArrete("dans le champ"), "habitation");
  assert.equal(regimeDuChampDeLArrete("hors champ — IGH"), "igh");
  assert.equal(regimeDuChampDeLArrete("  Dans le champ  "), "habitation");
});

test("un champ qu'on ne sait pas lire ne se range pas au plus proche", () => {
  // Règle 5 : ne pas savoir n'autorise pas à prétendre. Un « hors champ » dont
  // on ignore la raison n'est pas un IGH — ce pourrait être un ERP, un lieu de
  // travail, ou une lecture qu'on n'a pas encore écrite.
  assert.equal(regimeDuChampDeLArrete("hors champ"), "");
  assert.equal(regimeDuChampDeLArrete("hors champ — à reprendre avec le service instructeur"), "");
  assert.equal(regimeDuChampDeLArrete(""), "");
  assert.equal(regimeDuChampDeLArrete(null), "");
});
