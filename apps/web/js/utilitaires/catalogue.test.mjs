import test from "node:test";
import assert from "node:assert/strict";

import {
  PRODUIT,
  UTILITAIRES,
  deductionsDeContrainte,
  derniereVersion,
  describeProvenance,
  numeroDeVersion,
  referenceOf,
  AGENTS,
  agentByReference,
  agentDuSujet,
  declarationDuSujet,
  sortiesDeLAgent,
  utilitaireByReference
} from "./catalogue.js";
import { RESERVE, RESERVES, phraseDeReserve } from "./reserves.js";

/* ── Le catalogue se tient ───────────────────────────────────────────────── */

test("chaque agent porte un nom, une version et une source", () => {
  for (const outil of UTILITAIRES) {
    assert.ok(outil.nom, "un agent sans nom est introuvable");
    assert.match(outil.version, /^V\d+$/, `version illisible : ${outil.nom}`);
    assert.ok(outil.source, `sans source, on ne sait pas quoi vérifier : ${outil.nom}`);
    assert.ok(outil.libelle, `sans libellé, l'écran ne peut rien dire : ${outil.nom}`);
  }
});

test("deux agents ne partagent pas une référence", () => {
  // Deux fois la même référence, et la provenance d'une contrainte devient
  // ambiguë : on ne saurait plus quel code l'a produite.
  const references = UTILITAIRES.map(referenceOf);
  assert.equal(new Set(references).size, references.length);
});

test("le nom dit ce que fait l'agent, pas seulement d'où il vient", () => {
  // « socotec_V1 » ne dit rien. « extraction_avis_rapports_socotec_V1 » si.
  //
  // Trois verbes, parce qu'il y a trois choses qu'un utilitaire fait : il
  // **déduit** une règle du site, il **extrait** un constat d'un document, ou
  // il **dimensionne** un ouvrage. Un quatrième verbe s'ajoutera le jour où
  // quelque chose de vraiment autre arrivera — pas pour ranger une variante.
  for (const outil of UTILITAIRES) {
    assert.match(outil.nom, /^(deduction|extraction|dimensionnement)_/, `nom peu parlant : ${outil.nom}`);
    assert.ok(outil.nom.split("_").length >= 3, `nom trop court pour être clair : ${outil.nom}`);
  }
});

test("une référence inconnue ne se rapproche pas de la plus proche", () => {
  assert.equal(utilitaireByReference("deduction_zone_neige_commune"), null, "sans version, ce n'est pas une référence");
  assert.equal(utilitaireByReference("deduction_zone_neige_commune_V9"), null);
  assert.ok(utilitaireByReference("deduction_zone_neige_commune_V1"));
});

test("V10 est postérieur à V2, et pas l'inverse", () => {
  // Comparer les textes ferait passer une montée de version pour un retour en
  // arrière, silencieusement.
  assert.ok(numeroDeVersion({ version: "V10" }) > numeroDeVersion({ version: "V2" }));
  assert.equal(numeroDeVersion({ version: "bientôt" }), 0);
});

test("la dernière version d'une lignée est celle de plus haut numéro", () => {
  const dernier = derniereVersion("deduction_zone_neige_commune");
  assert.equal(referenceOf(dernier), "deduction_zone_neige_commune_V1");
  assert.equal(derniereVersion("deduction_inexistante"), null);
});

test("la provenance nomme la source avant l'agent", () => {
  // C'est la source qu'on va vérifier ; l'agent dit comment on l'a lue.
  const dit = describeProvenance(utilitaireByReference("deduction_zone_sismique_georisques_V1"));
  assert.match(dit, /^Géorisques/);
  assert.match(dit, /deduction_zone_sismique_georisques_V1$/);
});

test("seules les déductions de contrainte sont parcourues au versement", () => {
  const contraintes = deductionsDeContrainte();
  assert.ok(contraintes.every((outil) => outil.produit === PRODUIT.CONTRAINTE));
  assert.ok(contraintes.every((outil) => outil.cleDonnee), "une déduction lit une donnée de base nommée");
  assert.ok(!contraintes.some((outil) => outil.nom.startsWith("extraction_")));
});

/* ── Chaque déduction s'abstient plutôt que d'inventer ───────────────────── */

test("aucune déduction ne rend de valeur sur un fait vide", () => {
  for (const outil of deductionsDeContrainte()) {
    assert.equal(outil.deduire({}), null, `${outil.nom} invente une valeur`);
    assert.equal(outil.deduire({ fact_value: {} }), null, `${outil.nom} invente une valeur`);
  }
});

test("aucune déduction n'émet une réserve hors vocabulaire", () => {
  // Un code inventé n'atteindrait l'écran sous aucune phrase, et le lecteur
  // verrait une réserve muette.
  const faits = {
    snow_zone: { fact_value: { zone: "A2", inputs: { altitude: 1200 } } },
    wind_zone: { fact_value: { zone: "2", inputs: {} } },
    frost_depth: { fact_value: { frost_depth_m: 0.81, inputs: {} } },
    seismic_zone: { fact_value: { value: "4 - Moyenne" } },
    argiles: { fact_value: { niveau: "Fort" } }
  };

  for (const outil of deductionsDeContrainte()) {
    const rendu = outil.deduire(faits[outil.cleDonnee] ?? {});
    assert.ok(rendu, `${outil.nom} n'a rien rendu sur son fait type`);
    for (const code of rendu.reserves) {
      assert.ok(RESERVES.includes(code), `${outil.nom} émet une réserve inconnue : ${code}`);
      assert.ok(phraseDeReserve(code), `${code} n'a pas de phrase`);
    }
  }
});

/* ── Ce que chaque déduction lit, et ce qu'elle refuse ───────────────────── */

test("une zone de neige au-dessus de 900 m ne suffit plus, sans être fausse", () => {
  const outil = utilitaireByReference("deduction_zone_neige_commune_V1");
  const rendu = outil.deduire({ fact_value: { zone: "C2", inputs: { altitude: 1240 } } });

  assert.equal(rendu.valeur, "C2", "on ne dilue pas l'énoncé sous prétexte de réserve");
  assert.ok(rendu.reserves.includes(RESERVE.ALTITUDE_HORS_TABLE));
});

test("une profondeur hors gel absente n'entre pas comme zéro", () => {
  // `Number(null)` vaut zéro : ce serait une cote de fondation au niveau du sol,
  // énoncée comme une règle.
  const outil = utilitaireByReference("deduction_profondeur_hors_gel_altitude_V1");

  assert.equal(outil.deduire({ fact_value: { frost_depth_m: null, inputs: {} } }), null);
  assert.equal(outil.deduire({ fact_value: { frost_depth_m: "", inputs: {} } }), null);
  // La virgule décimale, comme partout ailleurs dans la mémoire : « 0.81 m » ne
  // se rapproche pas de « 0,81 m », et la même cote s'écrivait de deux façons
  // selon qu'un humain l'avait tranchée ou qu'un agent l'avait déduite.
  assert.equal(outil.deduire({ fact_value: { frost_depth_m: 0.8125, inputs: {} } }).valeur, "0,81 m");
});

test("la zone sismique se lit quelle que soit la forme de la réponse", () => {
  const outil = utilitaireByReference("deduction_zone_sismique_georisques_V1");

  assert.match(outil.deduire({ fact_value: { value: "4 - Moyenne" } }).valeur, /^4 — Moyenne$/);
  assert.match(outil.deduire({ fact_value: { data: { data: [{ code_zone: "3", libelle: "Modérée" }] } } }).valeur, /^3 — Modérée$/);
  assert.match(outil.deduire({ fact_value: { data: { results: [{ zone_sismicite: "2" }] } } }).valeur, /^2$/);
});

test("la zone sismique s'abstient plutôt que de prendre un chiffre au hasard", () => {
  // Une population de 12 000 habitants n'est pas une zone de sismicité.
  const outil = utilitaireByReference("deduction_zone_sismique_georisques_V1");

  assert.equal(outil.deduire({ fact_value: { data: { data: [{ population: "12000" }] } } }), null);
  assert.equal(outil.deduire({ fact_value: { data: { data: [{ code_zone: "9" }] } } }), null, "hors de 1 à 5");
});

test("la zone sismique dit que sa portée est communale, et c'est la bonne portée", () => {
  // Le zonage sismique est réglementairement communal : la réserve informe, elle
  // n'accuse pas.
  const outil = utilitaireByReference("deduction_zone_sismique_georisques_V1");
  const rendu = outil.deduire({ fact_value: { value: "4 - Moyenne", codeInsee: "74010" } });

  assert.deepEqual(rendu.reserves, [RESERVE.PORTEE_COMMUNALE]);
});

test("l'argile retient le niveau le plus fort quand la réponse en porte plusieurs", () => {
  // Sur une parcelle à cheval, retenir le plus faible serait choisir
  // l'hypothèse la plus confortable.
  const outil = utilitaireByReference("deduction_retrait_gonflement_argiles_georisques_V1");
  const rendu = outil.deduire({
    fact_value: { data: { data: [{ exposition: "Faible" }, { exposition: "Fort" }] } }
  });

  assert.equal(rendu.valeur, "Fort");
});

test("l'argile n'invente pas un niveau hors du zonage", () => {
  // « Modéré » n'est pas « Moyen » : décider que si reviendrait à trancher à la
  // place de la carte.
  const outil = utilitaireByReference("deduction_retrait_gonflement_argiles_georisques_V1");

  assert.equal(outil.deduire({ fact_value: { data: { data: [{ exposition: "Modéré" }] } } }), null);
  assert.equal(outil.deduire({ fact_value: { data: { data: [{ commune: "Annecy" }] } } }), null);
  assert.equal(outil.deduire({ fact_value: { niveau: "A priori nul" } }).valeur, "Nul");
});

test("l'argile se lit au point du projet, et le dit", () => {
  const outil = utilitaireByReference("deduction_retrait_gonflement_argiles_georisques_V1");
  const rendu = outil.deduire({ fact_value: { niveau: "Moyen", latitude: 45.9, longitude: 6.1 } });

  assert.deepEqual(rendu.reserves, [RESERVE.PORTEE_PONCTUELLE]);
  assert.equal(rendu.entrees.latitude, 45.9);
});

/* ── Un fait sans entrées est déclaré inconnu, pas sûr ───────────────────── */

test("un fait écrit avant qu'on conserve les entrées se dit inconnu", () => {
  const outil = utilitaireByReference("deduction_zone_neige_commune_V1");
  const rendu = outil.deduire({ fact_value: { zone: "A2", department_code: "74" } });

  assert.deepEqual(rendu.reserves, [RESERVE.ENTREES_INCONNUES]);
});

/* ── Les agents : ce qu'ils lisent, ce qu'ils posent ─────────────────────── */

test("chaque agent porte un nom, une version, une source et ce qu'il lit", () => {
  for (const agent of AGENTS) {
    assert.ok(agent.nom.length > 0);
    assert.match(agent.version, /^V\d+$/);
    assert.ok(agent.source.length > 0, agent.nom);
    // Un agent qui ne dit pas ce qu'il lit ne se rejoue pas, et sa chaîne
    // s'arrête à lui sans qu'on sache pourquoi.
    assert.ok(agent.lit.length > 0, agent.nom);
    assert.ok(agent.quoi.length > 20, agent.nom);
  }
});

test("deux agents ne partagent pas une référence", () => {
  const references = AGENTS.map(referenceOf);
  assert.equal(new Set(references).size, references.length);
  assert.equal(agentByReference("agent_d_zones_climatiques_commune_V1").nom, "agent_d_zones_climatiques_commune");
  // Rien n'est approché : un agent qu'on ne connaît pas n'existe pas.
  assert.equal(agentByReference("agent_d_zones_climatiques"), null);
});

test("une sortie qui renvoie à un outil prend le sujet de son agent", () => {
  // Le sujet n'est écrit qu'à un endroit : le jour où un zonage change de nom,
  // il n'y a qu'un fichier à toucher.
  const [neige, vent] = sortiesDeLAgent(agentByReference("agent_d_zones_climatiques_commune_V1"));

  assert.equal(neige.sujet, "Zone de neige");
  assert.equal(neige.utilitaire.nom, "deduction_zone_neige_commune");
  assert.equal(vent.sujet, "Zone de vent");
});

test("une sortie que nul agent ne déduit se déclare en entier", () => {
  // Le H0 se lit dans le résultat du gel, mais ce n'est pas la cote hors gel :
  // il déclare son propre sujet, et c'est ce qui empêche de les confondre.
  const [cote, h0] = sortiesDeLAgent(agentByReference("agent_d_profondeur_hors_gel_V1"));

  assert.equal(cote.sujet, "Profondeur hors gel");
  assert.equal(cote.cle, "frost_depth_m");
  assert.equal(h0.sujet, "H0 retenu pour le département");
  assert.equal(h0.outil, "frost");
  assert.equal(h0.utilitaire, null);
});

test("chaque sortie dit où elle se lit, ou quelle forme elle a", () => {
  // Deux formes, et une seule règle par forme.
  //
  // Une **valeur** déclare la clé du résultat où elle se lit : celle du fait de
  // contexte (`frost_depth`) n'est pas celle du résultat (`frost_depth_m`), et
  // retomber de l'une sur l'autre lirait un champ absent sans un mot.
  //
  // Une **ligne** — le spectre, huit colonnes d'une seule courbe — déclare sa
  // structure : « type: tableau » n'apprend rien tant qu'on ignore ce qu'il
  // faut mettre dedans.
  for (const agent of AGENTS) {
    for (const sortie of sortiesDeLAgent(agent)) {
      const ou = `${agent.nom} → ${sortie.sujet}`;
      assert.ok(sortie.outil.length > 0, ou);
      if (sortie.tableau) assert.ok(sortie.structure?.length > 0, ou);
      else assert.ok(sortie.cle.length > 0, ou);
    }
  }
});

test("on remonte d'une valeur à l'appel qui l'a posée", () => {
  assert.equal(agentDuSujet("Zone de vent").nom, "agent_d_zones_climatiques_commune");
  assert.equal(agentDuSujet("Profondeur hors gel").nom, "agent_d_profondeur_hors_gel");
  assert.equal(agentDuSujet("Altitude du site"), null);
});

test("la localisation se déclare une fois, et les deux agents la partagent", () => {
  const declaration = declarationDuSujet("Localisation du projet");

  assert.ok(declaration.quoi.length > 20);
  assert.ok(declaration.structure.some((champ) => champ.cle === "codeInsee"));

  // Le même objet dans les deux `lit` : ce que ce sujet est ne change pas selon
  // qui le lit.
  const [zones, gel] = AGENTS;
  assert.equal(
    zones.lit.find((lue) => lue.sujet === "Localisation du projet"),
    gel.lit.find((lue) => lue.sujet === "Localisation du projet")
  );
});
