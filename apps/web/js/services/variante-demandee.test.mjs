import test from "node:test";
import assert from "node:assert/strict";

import {
  REFUS_DE_LA_DEMANDE, cibleDeLaVariante, substitutionsDeLaDemande,
  testerUneVariante, resumeDeLaVariante, phraseDuRefusDemande
} from "./variante-demandee.js";

const at = "2026-01-10T09:00:00Z";

/**
 * La localisation, versée comme la mémoire l'écrit : **une ligne, six colonnes,
 * toutes marquées `enBloc`**. Aucun nom réel : ni la commune, ni l'adresse de ce
 * fichier n'existent.
 */
const COLONNES = ["commune", "codeInsee", "codePostal", "adresse", "latitude", "longitude"];

const localisation = () => ({
  id: "loc", kind: "base-datum", subject_key: "localisation-du-projet",
  nature: "donnee-de-base", status: "assumed", superseded_by: null, decided_at: at,
  statement: "Localisation du projet",
  payload: {
    subject: "Localisation du projet",
    value: "Commune-Amont (00100, INSEE 00001)",
    tableau: [{
      commune: "Commune-Amont", codeInsee: "00001", codePostal: "00100",
      adresse: "1 voie d'Essai 00100 Commune-Amont", latitude: "40.000000", longitude: "1.000000"
    }],
    structure: COLONNES.map((cle) => ({ cle, nom: cle, type: "texte", enBloc: true }))
  }
});

const altitude = () => ({
  id: "alt", kind: "base-datum", subject_key: "altitude-du-site",
  nature: "donnee-de-base", status: "assumed", superseded_by: null, decided_at: at,
  statement: "Altitude du site : 13 m",
  payload: { subject: "Altitude du site", value: "13 m", declared: true }
});

const neige = (zone) => ({
  id: "snow", kind: "site-constraint", subject_key: "site:snow_zone",
  nature: "contrainte", status: "assumed", superseded_by: null, decided_at: at,
  statement: `Zone de neige : ${zone}`,
  payload: {
    subject: "Zone de neige", value: zone, derived: true,
    utilitaire: "deduction_zone_neige_commune_V1",
    lectures: [{ sujet: "Localisation du projet", valeur: "00001" }]
  }
});

/** Le service d'adresses, joué. Il rend une localisation résolue, ou rien. */
const resoudre = async (question) => {
  if (!/aval/i.test(question)) return null;
  return {
    address: "2 voie d'Aval 00200 Commune-Aval", city: "Commune-Aval",
    postalCode: "00200", codeInsee: "00002", lat: 41, lon: 2
  };
};

/* ── Ce que la demande désigne ───────────────────────────────────────────── */

test("une demande en français trouve la ligne entière, pas une de ses colonnes", () => {
  // C'est tout l'objet du module : « change l'adresse du projet » est une
  // phrase, pas un mot-clé, et elle désigne un endroit, pas une colonne.
  for (const demande of ["l'adresse du projet", "la localisation", "la commune", "où est le projet"]) {
    const cible = cibleDeLaVariante({ assertions: [localisation(), neige("A1")], sujet: demande });
    assert.equal(cible.refus, undefined, `« ${demande} » n'a rien trouvé`);
    assert.equal(cible.entree.enBloc, true, `« ${demande} » a trouvé une colonne, pas la ligne`);
    assert.equal(cible.entree.sujet, "Localisation du projet");
  }
});

test("une demande qui ne désigne rien se refuse, elle ne choisit pas au hasard", () => {
  const cible = cibleDeLaVariante({
    assertions: [localisation(), altitude()], sujet: "le coefficient de machin"
  });
  assert.equal(cible.refus, REFUS_DE_LA_DEMANDE.INTROUVABLE);
  assert.match(phraseDuRefusDemande(cible.refus), /aucune valeur/);
});

test("une demande sans sujet se refuse aussi", () => {
  assert.equal(cibleDeLaVariante({ assertions: [localisation()], sujet: "  " }).refus,
    REFUS_DE_LA_DEMANDE.SANS_SUJET);
});

/* ── Ce qu'elle substitue ────────────────────────────────────────────────── */

test("une adresse se résout avant de se substituer, et remplace la ligne entière", async () => {
  const cible = cibleDeLaVariante({ assertions: [localisation()], sujet: "l'adresse" });
  const demande = await substitutionsDeLaDemande({ entree: cible.entree, valeur: "voie d'Aval", resoudre });

  // Six colonnes d'un coup : changer l'adresse d'un projet, c'est le déplacer.
  assert.deepEqual([...demande.substitutions.entries()].map(([id, valeur]) => [id.split("#")[1], valeur]), [
    ["commune", "Commune-Aval"],
    ["codeInsee", "00002"],
    ["codePostal", "00200"],
    ["adresse", "2 voie d'Aval 00200 Commune-Aval"],
    ["latitude", "41.000000"],
    ["longitude", "2.000000"]
  ]);
  assert.equal(demande.essaye, "2 voie d'Aval 00200 Commune-Aval");
});

test("une adresse introuvable se dit, elle ne se substitue pas à moitié", async () => {
  // Sans code INSEE, aucun zonage ne se lit. Substituer quand même rejouerait
  // trois tables sur une commune qu'on n'a pas identifiée (règle 5).
  const cible = cibleDeLaVariante({ assertions: [localisation()], sujet: "l'adresse" });
  const demande = await substitutionsDeLaDemande({
    entree: cible.entree, valeur: "un lieu qui n'existe pas", resoudre
  });
  assert.equal(demande.refus, REFUS_DE_LA_DEMANDE.ADRESSE_INTROUVABLE);
});

test("ailleurs, la valeur essayée est le texte tel quel", async () => {
  const cible = cibleDeLaVariante({ assertions: [localisation(), altitude()], sujet: "altitude" });
  const demande = await substitutionsDeLaDemande({ entree: cible.entree, valeur: "1200 m" });
  assert.deepEqual([...demande.substitutions.entries()], [["alt", "1200 m"]]);
});

test("sans valeur, rien ne part : on ne devine pas un endroit", async () => {
  const cible = cibleDeLaVariante({ assertions: [localisation()], sujet: "l'adresse" });
  const demande = await substitutionsDeLaDemande({ entree: cible.entree, valeur: "" });
  assert.equal(demande.refus, REFUS_DE_LA_DEMANDE.SANS_VALEUR);
});

/* ── La variante entière, telle qu'elle se raconte ───────────────────────── */

test("la demande se teste, et se résume en ce qui bouge", async () => {
  // Le rejeu est injecté : ce test porte sur l'enchaînement et le résumé, pas
  // sur les tables de zonage — celles-ci ont leurs propres tests.
  const rejouer = async ({ substitutions }) => {
    assert.equal(substitutions.get("loc#codeInsee"), "00002", "le code INSEE essayé doit partir");
    return {
      recalculees: [{
        assertion: neige("A1"), sujet: "Zone de neige", utilitaire: "deduction_zone_neige_commune_V1",
        avant: "A1", apres: "E", valeurABouge: true,
        reservesAvant: [], reservesApres: [], reservesOntBouge: false
      }],
      refusees: []
    };
  };

  const rendu = await testerUneVariante({
    projectId: "p1", assertions: [localisation(), neige("A1")],
    sujet: "l'adresse du projet", valeur: "voie d'Aval", resoudre, rejouer
  });

  assert.equal(rendu.ok, true);

  const resume = resumeDeLaVariante(rendu);
  assert.deepEqual(resume.change, {
    sujet: "Localisation du projet",
    de: "Commune-Amont (00100, INSEE 00001)",
    vers: "2 voie d'Aval 00200 Commune-Aval"
  });
  assert.deepEqual(resume.recalculees, [{
    sujet: "Zone de neige", avant: "A1", apres: "E",
    utilitaire: "deduction_zone_neige_commune_V1"
  }]);
  assert.equal(resume.ontBouge, 1);
});

test("ce qui n'a pas pu se recalculer figure dans le résumé, avec sa raison", async () => {
  // Le seul vrai danger de cet outil : présenter une variante partielle comme
  // complète. Un refus tu est un refus qui devient une conclusion.
  const rejouer = async () => ({
    recalculees: [],
    refusees: [{
      assertion: neige("A1"), sujet: "Zone de neige",
      utilitaire: "deduction_zone_neige_commune_V1", refus: "injoignable"
    }]
  });

  const rendu = await testerUneVariante({
    projectId: "p1", assertions: [localisation(), neige("A1")],
    sujet: "l'adresse", valeur: "voie d'Aval", resoudre, rejouer
  });

  const resume = resumeDeLaVariante(rendu);
  const dite = resume.aRevoir.find((ligne) => ligne.sujet === "Zone de neige");
  assert.ok(dite, "la ligne refusée doit être dite");
  assert.ok(dite.pourquoi, "et elle doit dire pourquoi");
});

test("une valeur identique n'est pas une variante, et se refuse sans rien appeler", async () => {
  let appele = false;
  const rendu = await testerUneVariante({
    projectId: "p1", assertions: [localisation(), altitude()],
    sujet: "altitude", valeur: "13 m",
    rejouer: async () => { appele = true; return null; }
  });

  assert.equal(rendu.ok, false);
  assert.equal(appele, false, "inutile de déranger les services pour une variante qui n'en est pas une");
});
