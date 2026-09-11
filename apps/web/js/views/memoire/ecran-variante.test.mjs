/**
 * L'écran d'une variante : ce qu'on essaie et ce que cela change, ensemble.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { renderEcranDeVariante, varianteEnJson, ETAPE } from "./ecran-variante.js";

const VALEURS = [
  { id: "hg", sujet: "Profondeur hors gel", valeur: "0,47 m", zones: ["batiment-a"], lectures: 3 },
  { id: "alt", sujet: "Altitude du site", valeur: "13,22 m", zones: [], lectures: 0 }
];

test("l'écran pose la question et la réponse sur le même écran", () => {
  // C'est tout l'objet du changement : les fenêtres empilées ne laissaient
  // jamais voir la valeur essayée et ses conséquences en même temps.
  const html = renderEcranDeVariante({ valeurs: VALEURS, etape: ETAPE.CHOIX });

  assert.match(html, /Quelle valeur essaie-t-on/);
  assert.match(html, /Tester une variante/);
  // Et rien de modal : plus de `role="dialog"`, plus de croix de fermeture.
  assert.doesNotMatch(html, /aria-modal/);
  // Ni de bandeau de tête : le panneau de l'Atelier porte le titre et l'export.
  // Deux boutons « Exporter » à trois centimètres l'un de l'autre se liraient
  // comme deux exports différents.
  assert.doesNotMatch(html, /variante-ecran__tete|data-variante-exporter/);
});

test("la portée s'affiche sur la valeur choisie", () => {
  // Quatre « Altitude du site » ne diffèrent que par elle.
  const html = renderEcranDeVariante({ valeurs: VALEURS, etape: ETAPE.SAISIE, choisie: VALEURS[0] });
  assert.match(html, /batiment-a/);
  assert.match(html, /0,47 m/);
});

test("le champ porte l'unité du projet, et le dit", () => {
  // On tapait « 8 » là où la mémoire porte « 0,47 m », et l'écran affichait
  // `0,47 m → 8`. L'unité s'impose désormais, et le champ l'annonce avant la
  // première frappe.
  const mesure = renderEcranDeVariante({ valeurs: VALEURS, etape: ETAPE.SAISIE, choisie: VALEURS[0] });
  assert.match(mesure, /data-variante-unite="m"/);
  assert.match(mesure, /Seul le nombre se tape/);

  // Une valeur qui n'est pas une mesure n'impose rien : coller « m » derrière
  // une catégorie serait absurde.
  const categorie = { id: "cl", sujet: "Classement", valeur: "3e famille B", zones: [], lectures: 1 };
  const texte = renderEcranDeVariante({ valeurs: [categorie], etape: ETAPE.SAISIE, choisie: categorie });
  assert.match(texte, /data-variante-unite=""/);
  assert.doesNotMatch(texte, /Seul le nombre se tape/);
});

test("tant qu'on n'a pas calculé, le tableau dit ce qu'il attend", () => {
  // Un cadre vide se lit comme un écran cassé.
  const vide = renderEcranDeVariante({ valeurs: VALEURS, etape: ETAPE.CHOIX });
  assert.match(vide, /Choisissez une valeur du socle/);

  const attend = renderEcranDeVariante({ valeurs: VALEURS, etape: ETAPE.ATTENTE, choisie: VALEURS[0], saisie: "8 m" });
  assert.match(attend, /Rien n'y est écrit/);
  assert.match(attend, /Calcul en cours/);
});

const massif = (nom, arase, ratio, verdict = "vérifiée") => ({
  "désignation": nom, "arase supérieure": arase, "ratio déterminant": ratio, "vérification": verdict,
  // Les quarante champs qui ont servi au calcul voyagent avec la ligne ; ils
  // n'ont pas à se lire ici.
  "entrées": { araseSuperieure: arase }
});

const fondations = (avant, apres) => ({
  ok: true, rejouees: [], cycles: [], inchangees: 12, confirmees: 0, aRevoir: [], depart: [],
  recalculees: [{
    sujet: "Résultat du calcul des fondations superficielles",
    utilitaire: "dimensionnement_fondations_superficielles_V1",
    avant: "12 massifs — 12 vérifiées", apres: "12 massifs — 12 vérifiées",
    valeurABouge: true, reservesAvant: [], reservesApres: [],
    assertion: { payload: { tableau: avant } },
    tableau: apres
  }]
});

const ecran = (rendu) => renderEcranDeVariante({
  valeurs: VALEURS, etape: ETAPE.RESULTAT, choisie: VALEURS[0], saisie: "800 m", rendu
});

test("le tableau d'une fonction native est ouvert, pas replié", () => {
  // Le défaut vécu : « 12 vérifiées » avant comme après, dix arases qui ont
  // bougé, et un détail replié qui se lisait comme une option. C'est ce qu'on
  // est venu voir.
  const html = ecran(fondations(
    [massif("Semelle 1", "-0,10 m", "0,667")],
    [massif("Semelle 1", "-0,16 m", "0,640")]
  ));

  assert.match(html, /<details class="variante-tableau" open>/);
  assert.match(html, /1<\/b> ligne du tableau a bougé sur 1/);
});

test("ce qui change à l'identique partout se dit une fois", () => {
  // Dix massifs qui descendent tous de six centimètres, ce n'est pas dix
  // informations : c'en est une, et l'écrire dix fois noie la ligne qui fait
  // autre chose.
  const html = ecran(fondations(
    [massif("A", "-0,10 m", "0,888"), massif("B", "-0,10 m", "0,929"), massif("C", "-0,10 m", "0,667")],
    [massif("A", "-0,16 m", "0,846"), massif("B", "-0,16 m", "0,890"), massif("C", "-0,16 m", "0,667")]
  ));

  // L'arase, en tête, une fois, avec le nombre de lignes qu'elle emporte.
  assert.match(html, /variante-tableau__partout/);
  assert.match(html, /-0,10 m[\s\S]*?-0,16 m[\s\S]*?sur 3 lignes/);
  // Le ratio varie : il se lit ligne à ligne, et seulement lui.
  assert.match(html, /variante-tableau__nom">A<[\s\S]*?ratio déterminant/);
  assert.doesNotMatch(html, /variante-tableau__nom">C</, "C ne change que par l'arase, déjà dite");
  assert.match(html, /1 ligne ne change que par ce qui précède : C\./);
});

test("les lignes qui n'ont pas bougé sont nommées, jamais escamotées", () => {
  // Deux massifs assez profonds pour que la nouvelle cote hors gel ne les
  // concerne pas : c'est une information, pas un silence.
  const html = ecran(fondations(
    [massif("Semelle 1", "-0,10 m", "0,667"), massif("Portique A", "-0,10 m", "0,888")],
    [massif("Semelle 1", "-0,10 m", "0,667"), massif("Portique A", "-0,16 m", "0,846")]
  ));

  assert.match(html, /1 ligne n'a pas bougé : Semelle 1\./);
});

test("un tableau qui ne bouge pas reste replié et le dit", () => {
  const html = ecran(fondations(
    [massif("Semelle 1", "-0,10 m", "0,667")],
    [massif("Semelle 1", "-0,10 m", "0,667")]
  ));

  assert.doesNotMatch(html, /<details class="variante-tableau" open>/);
  assert.match(html, /1 ligne — aucune n'a bougé/);
});

const STRUCTURE = [
  { nom: "désignation", type: "texte" },
  { nom: "arase supérieure", type: "nombre, en m" },
  { nom: "vérification", valeurs: [
    { nom: "vérifiée", sens: "tenu" },
    { nom: "en défaut", sens: "rompu" }
  ] },
  { nom: "ratio déterminant", type: "nombre", marge: { limite: 1, comparaison: "au plus" } }
];

const avecStructure = (rendu, structure) => {
  rendu.recalculees[0].assertion.payload.structure = structure;
  // La déclaration se cherche **par le sujet** : pour éprouver une structure
  // donnée, la ligne ne doit porter aucun sujet que le catalogue déclare.
  rendu.recalculees[0].sujet = "Résultat d'un utilitaire d'essai";
  rendu.recalculees[0].utilitaire = "utilitaire_d_essai_V1";
  return rendu;
};

test("la couleur d'un verdict vient de ce que l'utilitaire a déclaré", () => {
  // « 12 vérifiées → 12 en défaut » s'écrivait en vert. Aucun écran ne peut le
  // savoir sans qu'on le lui dise, et le lui apprendre par un dictionnaire de
  // mots français serait une machine à deviner.
  const rendu = avecStructure(fondations(
    [massif("Semelle 1", "-0,10 m", "0,667", "vérifiée")],
    [massif("Semelle 1", "-79,00 m", "16,050", "en défaut")]
  ), STRUCTURE);

  assert.match(ecran(rendu), /variante-tableau__apres--rompu">en défaut/);

  // Le même tableau sans structure déclarée : neutre, et c'est exact.
  const muet = avecStructure(fondations(
    [massif("Semelle 1", "-0,10 m", "0,667", "vérifiée")],
    [massif("Semelle 1", "-79,00 m", "16,050", "en défaut")]
  ), null);
  assert.doesNotMatch(ecran(muet), /variante-tableau__apres--/);
});

test("une marge déclarée donne son échelle au nombre", () => {
  // « 16,050 » est un nombre sans échelle : seize fois trop, ou seize fois la
  // marge restante ? Seule la limite déclarée le dit.
  const rendu = avecStructure(fondations(
    [massif("A", "-0,10 m", "0,667"), massif("B", "-0,10 m", "0,888")],
    [massif("A", "-79,00 m", "16,050"), massif("B", "-79,50 m", "8,191")]
  ), STRUCTURE);

  const html = ecran(rendu);
  assert.match(html, /variante-tableau__marge--depasse/);
  assert.match(html, /au plus 1/);
  // La pire valeur, et elle seule : les autres ne décident de rien.
  assert.match(html, /atteint <b>16,050<\/b>/);
  assert.match(html, /16 fois la limite/);
  assert.doesNotMatch(html, /atteint <b>8,191<\/b>/);
});

test("sans marge déclarée, aucune phrase d'échelle", () => {
  const rendu = avecStructure(fondations(
    [massif("A", "-0,10 m", "0,667")],
    [massif("A", "-79,00 m", "16,050")]
  ), [{ nom: "ratio déterminant", type: "nombre" }]);

  assert.doesNotMatch(ecran(rendu), /variante-tableau__marge/);
});

test("la liste des valeurs dit ce que chacune est, quand le projet le dit", () => {
  // « Altitude du site » se comprend seul ; « H0 retenu pour le département »,
  // non, et l'on choisissait au jugé.
  const decrite = {
    id: "hg", sujet: "Profondeur hors gel", valeur: "0,47 m", zones: [], lectures: 3,
    quoi: "Profondeur hors gel d'après le département et l'altitude"
  };
  const muette = { id: "x", sujet: "Chose obscure", valeur: "2", zones: [], lectures: 0, quoi: "" };

  const html = renderEcranDeVariante({ valeurs: [decrite, muette], etape: ETAPE.CHOIX });
  assert.match(html, /impact-choix__quoi">Profondeur hors gel d&#39;après/);
  // Rien d'inventé pour celle qui ne dit rien : une phrase fabriquée ici serait
  // indiscernable d'une phrase versée.
  assert.equal((html.match(/impact-choix__quoi/g) ?? []).length, 1);
});

test("la déclaration d'aujourd'hui l'emporte sur la copie figée au versement", () => {
  // `sens` et `marge` sont des légendes, pas des données : les figer voudrait
  // dire qu'un projet versé hier ne profitera jamais d'une légende écrite
  // demain. La ligne ci-dessous porte une structure ancienne, sans sens ; le
  // catalogue, lui, en a une.
  const rendu = fondations(
    [massif("Semelle 1", "-0,10 m", "0,667", "vérifiée")],
    [massif("Semelle 1", "-79,00 m", "16,050", "en défaut")]
  );
  rendu.recalculees[0].assertion.payload.structure = [
    { nom: "vérification", valeurs: ["vérifiée", "en défaut"] }
  ];

  const html = ecran(rendu);
  assert.match(html, /variante-tableau__apres--rompu">en défaut/);
  assert.match(html, /16 fois la limite/);
});

test("un champ de tableau porte son groupe, et se cherche par lui", () => {
  // Le défaut vécu : la contrainte de sol ne se trouvait pas sans connaître son
  // nom exact. Elle se cherche maintenant par « sol », par son groupe ou par sa
  // description.
  const sol = {
    id: "x#entrees.contrainteLimite", sujet: "contrainte limite à l'ELS", valeur: "2",
    zones: ["batiment-a"], lectures: 0, partagee: true,
    champ: { groupe: "sol et matériaux", cle: "entrees.contrainteLimite" },
    quoi: "La contrainte que le sol admet à l'état-limite de service."
  };
  const autre = { id: "y", sujet: "Altitude du site", valeur: "13,22 m", zones: [], lectures: 0, quoi: "" };

  const tout = renderEcranDeVariante({ valeurs: [sol, autre], etape: ETAPE.CHOIX });
  assert.match(tout, /<i>sol et matériaux<\/i> · contrainte limite/);

  const cherche = renderEcranDeVariante({ valeurs: [sol, autre], etape: ETAPE.CHOIX, cherche: "sol" });
  assert.match(cherche, /contrainte limite à l&#39;ELS/);
  assert.doesNotMatch(cherche, /Altitude du site : /);
});

test("un champ dont les lignes ne s'accordent pas le dit", () => {
  const arase = {
    id: "x#entrees.araseSuperieure", sujet: "arase supérieure", valeur: "",
    zones: [], lectures: 0, partagee: false, lignes: 12,
    champ: { groupe: "géométrie", cle: "entrees.araseSuperieure" }, quoi: ""
  };

  const html = renderEcranDeVariante({ valeurs: [arase], etape: ETAPE.CHOIX });
  assert.match(html, /12 valeurs différentes/);
  // Surtout pas un tiret : « — » se lit comme « pas de valeur », alors qu'il y
  // en a douze.
  assert.doesNotMatch(html, /arase supérieure : —/);
});

test("le nom passe devant la description dans les résultats de recherche", () => {
  // Chercher « vent » doit ramener le cas de vent avant « c'est souvent ce
  // décalage qui décide ». Chercher dans la description reste utile — c'est ce
  // qui permet de trouver sans connaître le nom exact —, elle ne doit pas
  // passer devant.
  const parLaDescription = {
    id: "x#a", sujet: "excentrement charge/fût", valeur: "0", zones: [], lectures: 0,
    partagee: true, champ: { groupe: "géométrie", cle: "a" },
    quoi: "C'est souvent ce décalage qui décide la taille d'une semelle."
  };
  const parLeNom = {
    id: "x#b", sujet: "vent 1 (W1)", valeur: "0", zones: [], lectures: 0,
    partagee: true, champ: { groupe: "charges", cle: "b" }, quoi: "Le vent, première direction."
  };

  const html = renderEcranDeVariante({
    valeurs: [parLaDescription, parLeNom], etape: ETAPE.CHOIX, cherche: "vent"
  });

  assert.ok(html.indexOf("vent 1 (W1)") < html.indexOf("excentrement charge"));
  // Les deux restent : la description a trouvé quelque chose, et le cacher
  // ferait chercher une valeur qui est là.
  assert.match(html, /excentrement charge/);
});

test("les champs des tableaux se séparent de ce que le projet pose", () => {
  // Un seul tableau de fondations offre soixante-deux champs. Mélangés, ils
  // noieraient les quelques valeurs qu'on vient chercher en premier.
  const socle = { id: "a", sujet: "Altitude du site", valeur: "13,22 m", zones: [], lectures: 2, quoi: "" };
  const champ = {
    id: "b#c", sujet: "drainage", valeur: "Sol drainé", zones: [], lectures: 0, partagee: true,
    champ: { groupe: "hypothèses réglementaires", cle: "c" }, quoi: ""
  };

  const html = renderEcranDeVariante({ valeurs: [socle, champ], etape: ETAPE.CHOIX });
  assert.match(html, /impact-liste__titre">Dans les tableaux/);
  assert.ok(html.indexOf("Altitude du site") < html.indexOf("impact-liste__titre"));

  // Rien à séparer quand il n'y a que du socle.
  assert.doesNotMatch(renderEcranDeVariante({ valeurs: [socle], etape: ETAPE.CHOIX }), /impact-liste__titre/);
});

test("le résultat porte ses deux gestes, et le second se refuse s'il ne dit rien", () => {
  const rendu = (bouge) => ({
    ok: true, recalculees: [], cycles: [], inchangees: 12, confirmees: 0, aRevoir: [], depart: [],
    rejouees: bouge ? [{ sujet: "Résultat", avant: "1 m", apres: "2 m", trace: [] }] : []
  });

  const avec = renderEcranDeVariante({
    valeurs: VALEURS, etape: ETAPE.RESULTAT, choisie: VALEURS[0], saisie: "8 m", rendu: rendu(true)
  });
  assert.match(avec, /data-variante-abandonner/);
  assert.match(avec, /data-variante-lire(?![^>]*disabled)/);

  const sans = renderEcranDeVariante({
    valeurs: VALEURS, etape: ETAPE.RESULTAT, choisie: VALEURS[0], saisie: "8 m", rendu: rendu(false)
  });
  assert.match(sans, /data-variante-lire disabled/);
});

test("l'export emporte de quoi refaire le raisonnement sans l'écran", () => {
  const json = varianteEnJson({
    projet: "p1", choisie: VALEURS[0], saisie: "8 m",
    rendu: {
      ok: true, recalculees: [], rejouees: [], cycles: [], inchangees: 12, confirmees: 0,
      aRevoir: [{ sujet: "Résultat du calcul", valeur: "11 massifs", motif: "utilitaire" }],
      depart: [{ id: "hg", vers: "8 m" }]
    }
  });

  assert.equal(json.format, "mdall.variante/1");
  assert.equal(json.depart.sujet, "Profondeur hors gel");
  assert.deepEqual(json.depart.zones, ["batiment-a"]);
  assert.equal(json.essaye, "8 m");
  assert.equal(json.resultat.aRevoir.length, 1);
  assert.equal(json.refus, null);
});

test("un refus s'exporte aussi : c'est une réponse", () => {
  const json = varianteEnJson({ choisie: VALEURS[0], saisie: "0,47 m", rendu: { ok: false, raison: "C'est déjà ce que le projet dit." } });
  assert.equal(json.resultat, null);
  assert.match(json.refus, /déjà ce que le projet dit/);
});

/* ── Ce qui ne couvre plus ───────────────────────────────────────────────── */

const at = "2026-03-12T09:00:00Z";

const zone = {
  id: "neige", project_id: "p1", superseded_by: null, decided_at: at,
  statement: "Zone de neige : A1",
  payload: { subject: "Zone de neige", value: "A1" }
};

const RENDU = {
  ok: true, depart: [], rejouees: [], aRevoir: [], cycles: [],
  recalculees: [{
    assertion: zone, sujet: "Zone de neige", avant: "A1", apres: "E",
    valeurABouge: true, reservesAvant: [], reservesApres: [], reservesOntBouge: false,
    utilitaire: "deduction_zone_neige_commune_V1"
  }],
  inchangees: 4, confirmees: 0
};

const COUVERTURE = {
  engagements: 1,
  tombees: [{
    acte: { created_at: at, note: "avis du bureau de contrôle", declared_by: "u1" },
    examinee: zone,
    courante: { ...zone, payload: { subject: "Zone de neige", value: "E" } },
    etat: "ne-couvre-plus",
    pourquoi: "directe",
    deviendrait: "E"
  }],
  aRevoir: []
};

/**
 * La moitié de la réponse que les chiffres ne donnent pas. Un zonage se
 * recalcule en une seconde ; un avis de bureau de contrôle se redemande en six
 * semaines — c'est donc lui qui se lit en premier.
 */
test("ce qui ne couvre plus se dit, et avant le reste", () => {
  const html = renderEcranDeVariante({
    valeurs: VALEURS, etape: ETAPE.RESULTAT, choisie: VALEURS[0], saisie: "E",
    rendu: RENDU, couverture: COUVERTURE
  });

  assert.match(html, /Ce qui ne couvre plus/);
  // Une phrase, pas des morceaux juxtaposés : qui a dit quoi, sur quoi, quand.
  assert.match(html, /avis du bureau de contrôle sur Zone de neige/);
  assert.match(html, /12\/03\/2026/, "la date se lit en français, pas en ISO");
  assert.match(html, /ne couvre plus : la valeur passerait à E/);
  // En tête des rangs : avant « Recalculé ».
  assert.ok(html.indexOf("Ce qui ne couvre plus") < html.indexOf("Recalculé"),
    "ce qui coûte se lit avant ce qui se recalcule");
});

/**
 * **Règle 12.** Mdall n'est pas un outil de gestion de visas, et l'écran ne doit
 * jamais en avoir l'air. Le mot du métier reste dans le code ; ce qui se lit est
 * ce qui a été fait, par qui, et quand.
 */
test("l'écran ne parle jamais comme un outil de visa", () => {
  const html = renderEcranDeVariante({
    valeurs: VALEURS, etape: ETAPE.RESULTAT, choisie: VALEURS[0], saisie: "E",
    rendu: RENDU, couverture: COUVERTURE
  });

  for (const interdit of [/\bvisas?\b/i, /\bviser\b/i, /\bvisée?s?\b/i,
    /en attente de/i, /à valider/i, /approbation/i, /circuit/i]) {
    assert.doesNotMatch(html, interdit, `l'écran emploie « ${interdit} »`);
  }
});

test("sans engagement touché, la section n'existe pas", () => {
  // Une alarme qui rassure apprend à ne plus la regarder : même raison que pour
  // « À revérifier ».
  const html = renderEcranDeVariante({
    valeurs: VALEURS, etape: ETAPE.RESULTAT, choisie: VALEURS[0], saisie: "E",
    rendu: RENDU, couverture: { engagements: 0, tombees: [], aRevoir: [] }
  });

  assert.doesNotMatch(html, /Ce qui ne couvre plus/);
});
