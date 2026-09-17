import test from "node:test";
import assert from "node:assert/strict";

import {
  ATELIER,
  altitudeVersable,
  appelVersable,
  lignesVersables,
  ligneDeLaLocalisation,
  localisationVersable,
  phraseDeLaLocalisation,
  sortiesVersables,
  valeurDeLaSortie
} from "./climat-versement.js";
import {
  AGENT_D_PROFONDEUR_HORS_GEL_V1,
  AGENT_D_ZONES_CLIMATIQUES_COMMUNE_V1,
  SUJET_ALTITUDE,
  SUJET_H0,
  SUJET_LOCALISATION
} from "../utilitaires/agents-climatiques.js";
import { sortiesDeLAgent } from "../utilitaires/catalogue.js";

const LOCALISATION = {
  city: "Briançon",
  codeInsee: "05023",
  postalCode: "05100",
  address: "12 rue des Cordeliers",
  altitude: 1326
};

const RESULTATS = {
  snow: { result_payload: { snow_zone: "E", department_code: "05" } },
  wind: { result_payload: { wind_zone: "2", department_code: "05" } },
  frost: { result_payload: { frost_depth_m: 0.894, h0_selected_m: 0.6, department_code: "05" } }
};

/* ── La localisation, entrée de toute la chaîne ──────────────────────────── */

test("sans code INSEE, la localisation ne se verse pas", () => {
  // Deux communes françaises portent le même nom ; aucune ne partage son code
  // INSEE. Verser sans lui reviendrait à retenir le zonage d'une homonyme.
  assert.equal(ligneDeLaLocalisation({ city: "Sainte-Marie", postalCode: "97438" }), null);
  assert.equal(localisationVersable({ city: "Sainte-Marie" }, {}), null);
});

test("la localisation se verse en une ligne, pas en six sujets", () => {
  const ligne = localisationVersable(LOCALISATION, { zone: "batiment-a", ou: ATELIER });

  assert.equal(ligne.sujet, SUJET_LOCALISATION);
  assert.equal(ligne.tableau.length, 1);
  assert.deepEqual(ligne.tableau[0], {
    commune: "Briançon", codeInsee: "05023", codePostal: "05100", adresse: "12 rue des Cordeliers",
    // Le point vit dans la **même** ligne que l'adresse : c'est un endroit, pas
    // deux faits. Vide ici, parce que cette localisation-là n'en portait pas.
    latitude: "", longitude: ""
  });
  // Sa forme est déclarée : « type: tableau » n'apprend rien tant qu'on ignore
  // ce qu'il faut mettre dans une ligne.
  assert.ok(ligne.structure.some((champ) => champ.cle === "codeInsee"));
  assert.deepEqual(ligne.zones, ["batiment-a"]);
  assert.equal(ligne.atelier, ATELIER);
});

test("la phrase de la localisation nomme la commune et son code", () => {
  assert.equal(
    phraseDeLaLocalisation(ligneDeLaLocalisation(LOCALISATION)),
    "Briançon (05100, INSEE 05023)"
  );
});

test("un projet sans adresse se dit par son point : c'est ce qui le situe", () => {
  // Un projet qui n'est pas construit est dans un champ. Une phrase qui ne
  // dirait que « Briançon (INSEE 05023) » laisserait croire qu'on ne sait pas où
  // il est dans la commune — qui fait vingt-huit kilomètres carrés.
  const sansAdresse = ligneDeLaLocalisation({
    city: "Briançon", codeInsee: "05023", postalCode: "05100",
    latitude: 44.8964521, longitude: 6.6350873
  });
  assert.equal(sansAdresse.adresse, "");
  assert.equal(sansAdresse.latitude, "44.896452");
  assert.equal(phraseDeLaLocalisation(sansAdresse), "Briançon (05100, INSEE 05023) — 44.8965, 6.6351");
});

test("le point pointé donne quand même un code INSEE, donc une localisation versable", () => {
  // C'est ce qui rend le cas « champ au milieu de nulle part » possible : le
  // service d'adresses rend la commune à l'envers, depuis les coordonnées.
  const pointee = localisationVersable({
    city: "Briançon", codeInsee: "05023", latitude: 44.8964521, longitude: 6.6350873
  }, { ou: ATELIER });
  assert.ok(pointee);
  assert.equal(pointee.tableau[0].longitude, "6.635087");
});

test("l'altitude est une entrée, pas un produit des zonages", () => {
  // Elle se versait comme si les zonages l'avaient calculée. Le serveur ne la
  // calcule pas : il la reçoit et la rend telle quelle.
  const ligne = altitudeVersable(LOCALISATION, { ou: ATELIER });

  assert.equal(ligne.sujet, SUJET_ALTITUDE);
  assert.match(ligne.valeur, /^1\s326,00 m$/u);
  assert.equal(ligne.provenance.type, "décision");
  assert.equal(ligne.provenance.quoi, `saisie — ${ATELIER}`);
});

/* ── Les deux appels ─────────────────────────────────────────────────────── */

test("chaque agent pose ce qu'il déclare, et rien d'autre", () => {
  const zones = sortiesDeLAgent(AGENT_D_ZONES_CLIMATIQUES_COMMUNE_V1);
  assert.deepEqual(zones.map((sortie) => sortie.sujet), ["Zone de neige", "Zone de vent"]);
  // Le sujet vient de l'agent, jamais d'une copie faite dans l'agent.
  assert.equal(zones[0].utilitaire.nom, "deduction_zone_neige_commune");

  const gel = sortiesDeLAgent(AGENT_D_PROFONDEUR_HORS_GEL_V1);
  assert.deepEqual(gel.map((sortie) => sortie.sujet), ["Profondeur hors gel", SUJET_H0]);
  // Le H0 se lit dans le résultat du gel sans être la cote : il déclare son
  // propre sujet, et c'est ce qui empêche de les confondre.
  assert.equal(gel[1].outil, "frost");
  assert.equal(gel[1].utilitaire, null);
});

test("l'appel dit ce qu'il a lu et ce qu'il a posé", () => {
  const appel = appelVersable(AGENT_D_ZONES_CLIMATIQUES_COMMUNE_V1, {
    localisation: ligneDeLaLocalisation(LOCALISATION),
    altitude: "1 326,00 m",
    resultats: RESULTATS
  });

  // Une fonction, pas un fait : elle se range dans un `.ref`.
  assert.equal(appel.referentiel, true);
  assert.equal(appel.agent.genre, "agent-D");
  assert.equal(appel.agent.utilitaire, "agent_d_zones_climatiques_commune");
  assert.deepEqual(appel.agent.lit, [SUJET_LOCALISATION, SUJET_ALTITUDE]);
  assert.deepEqual(appel.agent.ecrit, [{ sujet: "Zone de neige" }, { sujet: "Zone de vent" }]);

  // Ce qu'il a lu, avec la valeur lue — à la date de l'appel, pas par renvoi
  // au catalogue.
  assert.deepEqual(appel.lectures, [
    { sujet: SUJET_LOCALISATION, valeur: "Briançon (05100, INSEE 05023)" },
    { sujet: SUJET_ALTITUDE, valeur: "1 326,00 m" }
  ]);
});

test("un appel qui n'a rien rendu ne se verse pas", () => {
  // Une ligne de raisonnement là où le serveur n'a pas répondu ferait croire
  // qu'un calcul a eu lieu.
  assert.equal(appelVersable(AGENT_D_ZONES_CLIMATIQUES_COMMUNE_V1, { resultats: {} }), null);
});

/* ── Ce que les appels posent ────────────────────────────────────────────── */

test("chaque valeur cite l'agent qui la déduit, pas l'agent", () => {
  // C'est ce qui permet de monter la version d'un seul zonage, et c'est ce que
  // le rejeu suit pour refaire cette valeur-là.
  const posees = sortiesVersables(AGENT_D_ZONES_CLIMATIQUES_COMMUNE_V1, {
    resultats: RESULTATS, localisation: ligneDeLaLocalisation(LOCALISATION), altitude: "1 326,00 m"
  });

  assert.deepEqual(posees.map((ligne) => ligne.sujet), ["Zone de neige", "Zone de vent"]);
  assert.equal(posees[0].utilitaire, "deduction_zone_neige_commune_V1");
  assert.equal(posees[1].utilitaire, "deduction_zone_vent_commune_V1");
  // Une zone est tranchée par un tiers : un texte la fixe.
  assert.equal(posees[0].nature, "contrainte");
  // Et elle dit ce que son utilitaire a lu, pour que la chaîne se referme : la
  // commune d'abord — c'est elle qui donne la zone —, l'altitude ensuite.
  assert.deepEqual(posees[0].lectures, [
    { sujet: SUJET_LOCALISATION, valeur: "05023" },
    { sujet: SUJET_ALTITUDE, valeur: "1 326,00 m" }
  ]);
});

test("la cote et son H0 sortent du même appel, chacun avec son sujet", () => {
  const posees = sortiesVersables(AGENT_D_PROFONDEUR_HORS_GEL_V1, {
    resultats: RESULTATS, localisation: ligneDeLaLocalisation(LOCALISATION), altitude: "1 326,00 m"
  });

  assert.deepEqual(posees.map((ligne) => ligne.sujet), ["Profondeur hors gel", SUJET_H0]);
  assert.equal(posees[0].valeur, "0,89 m");
  assert.equal(posees[1].valeur, "0,6 m");
  // Faute d'agent qui le déduise, le H0 cite l'agent — et le dit.
  assert.equal(posees[1].utilitaire, "agent_d_profondeur_hors_gel_V1");
});

test("une valeur que le serveur n'a pas rendue ne s'affirme pas", () => {
  // « — » n'est pas une zone de neige.
  assert.equal(valeurDeLaSortie(sortiesDeLAgent(AGENT_D_ZONES_CLIMATIQUES_COMMUNE_V1)[0], {}), "");

  const posees = sortiesVersables(AGENT_D_ZONES_CLIMATIQUES_COMMUNE_V1, {
    resultats: { snow: { result_payload: { snow_zone: "E" } } }
  });
  assert.deepEqual(posees.map((ligne) => ligne.sujet), ["Zone de neige"]);
});

/* ── L'ordre de la chaîne ────────────────────────────────────────────────── */

test("les lignes se lisent dans l'ordre où la chaîne les traverse", () => {
  const lignes = lignesVersables({ localisation: LOCALISATION, resultats: RESULTATS });

  assert.deepEqual(lignes.map((ligne) => ligne.sujet), [
    SUJET_LOCALISATION,
    SUJET_ALTITUDE,
    "Zones climatiques d'après la commune",
    "Zone de neige",
    "Zone de vent",
    "Profondeur hors gel d'après le département et l'altitude",
    "Profondeur hors gel",
    SUJET_H0
  ]);

  // Deux appels, et deux seulement : les zonages ne lisent qu'une commune, la
  // cote lit une altitude. Les tenir ensemble ferait rejouer les tables
  // communales à chaque mètre essayé.
  assert.equal(lignes.filter((ligne) => ligne.referentiel === true).length, 2);
});

test("sans localisation, rien ne se propose", () => {
  assert.deepEqual(lignesVersables({ localisation: {}, resultats: {} }), []);
});
