import test from "node:test";
import assert from "node:assert/strict";

import {
  conclusionsVersables, cleDuVersement, etatDuVersement, retenuesParDefaut, phraseDuVersement, reglesVersables,
  donneesDeBaseVersables, deductionsVersables, conclusionsDesDeductions,
  reponsesVersables, regimeVersable } from "./incendie-versement.js";
import { PROVENANCE } from "./memoire-en-texte.js";
import { SUJET_REGIME_INCENDIE, regimeValide } from "../../vendor/utilitaires/regime-incendie.js";

const VUE = {
  modules: [
    {
      id: "classement", titre: "Classement du bâtiment", statut: "conclu", exigence: true, valeur: "3e famille B",
      pourquoi: { article: "3", paragraphe: "3°", citation: "Troisième famille B : habitations…" }
    },
    {
      id: "planchersCoupeFeu", titre: "Degré coupe-feu des planchers", statut: "conclu", exigence: true, valeur: "CF 1 h",
      pourquoi: { article: "6", citation: "…coupe-feu de degré une heure…" }
    },
    // Sans objet : elle a conclu, et elle n'affirme rien à respecter.
    {
      id: "circulationProtegeeExigee", titre: "Circulation horizontale protégée", statut: "conclu",
      exigence: true, valeur: null, sansObjet: "aucune circulation protégée n'est exigée"
    },
    // En attente : rien à verser.
    { id: "conduitsExigence", titre: "Conduits", statut: "enAttente", exigence: true, valeur: null, manque: ["diametreConduit"] },
    // Une reformulation du cas : elle a conclu, elle dit quelque chose, et elle
    // n'exige rien de personne.
    { id: "sousSol", titre: "Sous-sol du bâtiment", statut: "conclu", exigence: false, valeur: "avec sous-sol" }
  ]
};

function assertion(cle, valeur, { zones = null } = {}) {
  return {
    id: `a-${cle}`, subject_key: cle, kind: "base-datum", nature: "contrainte",
    statement: `x : ${valeur}`, payload: { value: valeur }, zones, superseded_by: null
  };
}

test("on ne verse que ce qui a conclu et qui dit quelque chose", () => {
  const versables = conclusionsVersables(VUE);
  assert.deepEqual(versables.map((c) => c.id), ["classement", "planchersCoupeFeu"]);
  assert.equal(versables[0].valeur, "3e famille B");
  assert.equal(versables[0].article, "article 3, 3°");
  assert.equal(versables[1].article, "article 6");
  assert.match(versables[1].citation, /coupe-feu de degré une heure/);
});

test("une vue vide ne verse rien, et ne casse rien", () => {
  assert.deepEqual(conclusionsVersables(null), []);
  assert.deepEqual(conclusionsVersables({ modules: "pas un tableau" }), []);
});

test("la clé porte la zone quand il y en a une", () => {
  const conclusion = { sujet: "Degré coupe-feu des planchers" };
  assert.equal(cleDuVersement(conclusion), "degre-coupe-feu-des-planchers");
  assert.equal(cleDuVersement(conclusion, "batiment-b"), "degre-coupe-feu-des-planchers@batiment-b");
});

test("trois états, et ils n'appellent pas le même geste", () => {
  const lignes = etatDuVersement(conclusionsVersables(VUE), [
    assertion("classement-du-batiment", "3e famille B"),
    assertion("degre-coupe-feu-des-planchers", "CF 1/2 h")
  ]);

  assert.equal(lignes[0].etat, "identique");
  assert.equal(lignes[1].etat, "differente");
  assert.equal(lignes[1].valeurConnue, "CF 1/2 h");
});

test("une conclusion que la mémoire ignore est absente", () => {
  const lignes = etatDuVersement(conclusionsVersables(VUE), []);
  assert.deepEqual(lignes.map((l) => l.etat), ["absente", "absente"]);
  assert.equal(lignes[0].deja, null);
});

test("le degré du bâtiment A ne dit rien de celui du bâtiment B", () => {
  // La mémoire porte une valeur sur une zone ; on verse sur l'ensemble. Les
  // confondre ferait périmer l'un par l'autre alors que les deux sont vrais.
  const memoire = [assertion("degre-coupe-feu-des-planchers@batiment-b", "CF 1 h", { zones: ["batiment-b"] })];

  assert.equal(etatDuVersement(conclusionsVersables(VUE), memoire)[1].etat, "absente");
  assert.equal(etatDuVersement(conclusionsVersables(VUE), memoire, "batiment-b")[1].etat, "identique");
});

test("une affirmation périmée ne compte pas", () => {
  const perimee = { ...assertion("degre-coupe-feu-des-planchers", "CF 2 h"), superseded_by: "autre" };
  assert.equal(etatDuVersement(conclusionsVersables(VUE), [perimee])[1].etat, "absente");
});

test("ce que la mémoire porte déjà à l'identique n'est pas coché", () => {
  const lignes = etatDuVersement(conclusionsVersables(VUE), [
    assertion("classement-du-batiment", "3e famille B")
  ]);
  const retenues = retenuesParDefaut(lignes);

  assert.equal(retenues.has("classement"), false);
  assert.equal(retenues.has("planchersCoupeFeu"), true);
});

test("la phrase dit ce qui partira", () => {
  const lignes = etatDuVersement(conclusionsVersables(VUE), [
    assertion("degre-coupe-feu-des-planchers", "CF 1/2 h")
  ]);

  assert.equal(phraseDuVersement(lignes, retenuesParDefaut(lignes)),
    "2 contraintes partiront — 1 nouvelle, 1 qui corrige la mémoire.");
  assert.equal(phraseDuVersement(lignes, new Set()), "Rien à proposer : aucune conclusion retenue.");
});

test("les règles appliquées partent avec les valeurs qu'elles produisent", () => {
  const vue = {
    texteDeReference: { source: "arrêté du 31 janvier 1986 modifié" },
    modules: [{
      id: "classement", titre: "Classement du bâtiment", statut: "conclu",
      valeur: "3e famille B", exigence: true,
      conditions: [
        { sujet: "Logements superposés", operateur: "=", valeur: "oui", unite: null, logique: true },
        { sujet: "Hauteur du plancher bas du logement le plus haut", operateur: "<=", valeur: 28, unite: "m", logique: false }
      ],
      pourquoi: { article: "3", paragraphe: "3°)", citation: "Troisième famille B : …" }
    }]
  };

  const conclusions = conclusionsVersables(vue);
  const regles = reglesVersables(conclusions, "");

  assert.equal(regles.length, 1);
  const [regle] = regles;
  assert.equal(regle.referentiel, true);
  assert.equal(regle.sujet, "Classement du bâtiment");
  // Ce que la règle conclut. `alors` n'est pas stocké deux fois : l'écriture le
  // remet depuis la valeur.
  assert.equal(regle.valeur, "3e famille B");
  assert.deepEqual(regle.regle.conditions.map((c) => [c.sujet, c.operateur]), [
    ["Logements superposés", "="],
    ["Hauteur du plancher bas du logement le plus haut", "<="]
  ]);
  // Le seuil du texte, jamais la cote du projet.
  assert.deepEqual(regle.regle.conditions[1].valeur, ["28"]);
  assert.equal(regle.regle.conditions[1].unite, "m");
  assert.equal(regle.provenance.type, "texte");
});

test("une règle appliquée porte sa zone : deux escaliers, deux classements", () => {
  const vue = {
    modules: [{
      id: "m", titre: "Colonne sèche", statut: "conclu", valeur: "exigée", exigence: true,
      conditions: [{ sujet: "Classement du bâtiment", operateur: "=", valeur: "3e famille B", unite: null, logique: false }],
      pourquoi: { article: "98" }
    }]
  };

  const [regle] = reglesVersables(conclusionsVersables(vue), "Escalier B");
  // Le texte de l'arrêté est universel ; les règles appliquées ne le sont pas.
  assert.deepEqual(regle.zones, ["Escalier B"]);

  const [partout] = reglesVersables(conclusionsVersables(vue), "");
  assert.deepEqual(partout.zones, []);
});

test("une règle sans condition reste une règle : elle s'applique toujours", () => {
  const vue = {
    modules: [{
      id: "m", titre: "Conduit mettant en communication des niveaux différents",
      statut: "conclu", valeur: "coffrage admis", exigence: true, conditions: [],
      pourquoi: { article: "47" }
    }]
  };

  const [regle] = reglesVersables(conclusionsVersables(vue), "");
  assert.equal(regle.sujet, "Conduit mettant en communication des niveaux différents");
  assert.deepEqual(regle.regle.conditions, []);
  assert.match(regle.provenance.quoi, /article 47/);
});

test("le classement part avec l'étude : sans lui, les règles renvoient à rien", () => {
  const [classement] = donneesDeBaseVersables(
    { faits: { classement: "3e famille B" }, texteDeReference: { source: "arrêté du 31 janvier 1986 modifié" } },
    "Escalier B"
  );

  assert.equal(classement.sujet, "Classement du bâtiment");
  assert.equal(classement.valeur, "3e famille B");
  // Une déclaration, pas une exigence : c'est le nom que les règles citent.
  assert.equal(classement.nature, "donnee-de-base");
  // Deux escaliers peuvent être classés différemment ; sans la portée, l'un
  // périmerait l'autre.
  assert.deepEqual(classement.zones, ["Escalier B"]);
});

test("hors champ n'est pas une famille, et n'entre donc pas en mémoire", () => {
  // « hors champ — IGH » dit que ce référentiel ne s'applique pas. Versé comme
  // une valeur, il se lirait comme un classement décidé.
  const sujets = donneesDeBaseVersables({ faits: { classement: "hors champ — IGH" } }, "")
    .map((donnee) => donnee.sujet);
  assert.equal(sujets.includes("Classement du bâtiment"), false);
  assert.deepEqual(donneesDeBaseVersables({ faits: {} }, ""), []);
});

/* ── Le régime de sécurité incendie ──────────────────────────────────────── */

test("le régime part même quand le classement ne part pas", () => {
  // C'est le cas qui compte le plus : « hors champ — IGH » ne dit rien d'une
  // famille, mais il dit tout d'un référentiel. Taire le régime là où il est le
  // plus utile laisserait le projet sans la seule valeur qui désigne le texte
  // applicable — et l'agent incendie se choisirait de nouveau à la formulation
  // de la question.
  const versees = donneesDeBaseVersables(
    { faits: { classement: "hors champ — IGH", dansLeChampDeLArrete: "hors champ — IGH" } },
    "Bâtiment A"
  );

  assert.deepEqual(versees.map((donnee) => donnee.sujet), [SUJET_REGIME_INCENDIE]);
  const [regime] = versees;
  assert.equal(regime.valeur, "igh");
  // Une valeur que le routage ne saurait pas lire serait une valeur morte.
  assert.equal(regimeValide(regime.valeur), regime.valeur);
  // Par zone, comme le classement : un rez-de-chaussée commercial sous des
  // logements relève de deux régimes dans un seul ouvrage.
  assert.deepEqual(regime.zones, ["Bâtiment A"]);
  assert.equal(regime.nature, "donnee-de-base");
  assert.equal(regime.provenance.type, PROVENANCE.REGLE);
  // L'article qui tranche, et non celui du classement : c'est ce qui permet de
  // contester la qualification sans rouvrir l'étude.
  assert.equal(regime.article, "article 1er");
});

test("le régime se lit sur le champ d'application, jamais sur la famille", () => {
  // La tentation serait de déduire « habitation » d'un classement en 3e famille.
  // Ce serait demander à la conclusion de désigner la prémisse : la famille est
  // la *sortie* du référentiel habitation, elle le présuppose. Un classement
  // sans champ d'application ne verse donc aucun régime.
  const sansChamp = donneesDeBaseVersables({ faits: { classement: "3e famille B" } }, "");
  assert.deepEqual(sansChamp.map((donnee) => donnee.sujet), ["Classement du bâtiment"]);

  assert.deepEqual(regimeVersable({ faits: { classement: "1re famille" } }, ""), []);
  // Un champ qu'on n'a pas su lire ne verse rien non plus : ne pas savoir
  // n'autorise pas à ranger au plus proche (règle 5).
  assert.deepEqual(regimeVersable({ faits: { dansLeChampDeLArrete: "hors champ" } }, ""), []);
});

test("le régime versé dit vers quel texte il renvoie", () => {
  // « igh » est un mot ; « renvoie à articles R.122-1 à R.122-29 du CCH » est
  // une porte. Sans elle, la mémoire porterait une qualification que personne ne
  // saurait vérifier.
  const [regime] = regimeVersable(
    { faits: { dansLeChampDeLArrete: "dans le champ" },
      texteDeReference: { source: "arrêté du 31 janvier 1986 modifié" } },
    ""
  );

  assert.equal(regime.valeur, "habitation");
  assert.equal(regime.reference, "regimeIncendie");
  assert.match(regime.source, /renvoie à arrêté du 31 janvier 1986 modifié/);
  assert.deepEqual(regime.zones, []);
});

/* ────────────────────────────────────────────────────────────────────────────
 * Ce qui permet de remonter la chaîne
 * ──────────────────────────────────────────────────────────────────────────── */

const VUE_DEDUITE = {
  texteDeReference: { source: "arrêté du 31 janvier 1986 modifié" },
  faits: { logementsSuperposes: true, etagesSurRdc: 4, hauteurPlancherBas: 24.5, natureHabitation: "collective" },
  questionsRepondues: [
    { cle: "logementsSuperposes", sujet: "Logements superposés",
      libelle: "Le bâtiment comporte-t-il des logements superposés ?" },
    { cle: "etagesSurRdc", libelle: "Nombre d'étages sur rez-de-chaussée" },
    { cle: "hauteurPlancherBas", libelle: "Hauteur du plancher bas du dernier niveau", unite: "m" },
    // Un fait produit par un module n'est pas une question : rien ne le porte ici.
    { cle: "inconnue", libelle: "Sans réponse" }
  ],
  modules: [
    {
      id: "nature-habitation", titre: "Habitation individuelle ou collective", statut: "conclu",
      exigence: false, valeur: "collective",
      conditions: [{ fait: "logementsSuperposes", sujet: "Logements superposés", operateur: "=", valeur: "oui", logique: true }],
      pourquoi: { article: "3", citation: "…logements superposés…" }
    },
    // Sans condition : la valeur est une lecture directe de la réponse, et la
    // réponse part de son côté. Une carte « si rien alors x » n'apprendrait rien.
    { id: "sous-sol", titre: "Sous-sol du bâtiment", statut: "conclu", exigence: false, valeur: "avec sous-sol", conditions: [] },
    // Un « sans objet » n'affirme rien : il n'a pas d'étape à montrer.
    { id: "duplex", titre: "Duplex au dernier étage", statut: "conclu", exigence: false, valeur: "non",
      sansObjet: "aucun duplex", conditions: [{ fait: "x", sujet: "X", operateur: "=", valeur: "oui" }] },
    // Une exigence part par `reglesVersables`, avec sa valeur : la reprendre ici
    // la verserait deux fois.
    { id: "classement", titre: "Classement du bâtiment", statut: "conclu", exigence: true, valeur: "3e famille B",
      conditions: [{ fait: "natureHabitation", sujet: "Habitation individuelle ou collective", operateur: "=", valeur: "collective" }] }
  ]
};

test("les déductions du référentiel partent comme des règles, pour que la chaîne se remonte", () => {
  const regles = deductionsVersables(VUE_DEDUITE, "Bâtiment A");

  // Seule la déduction qui raisonne : ni le « sans objet », ni celle qui n'a
  // aucune condition, ni l'exigence qui part déjà ailleurs.
  assert.deepEqual(regles.map((r) => r.sujet), ["Habitation individuelle ou collective"]);

  const [nature] = regles;
  assert.equal(nature.referentiel, true);
  assert.equal(nature.valeur, "collective");
  assert.deepEqual(nature.regle.conditions.map((c) => c.sujet), ["Logements superposés"]);
  // Une règle appliquée dépend de la zone : sans portée, celle du bâtiment B
  // périmerait celle du bâtiment A.
  assert.deepEqual(nature.zones, ["Bâtiment A"]);
});

test("les réponses de l'étude partent en données de base : c'est là que la chaîne s'arrête", () => {
  const donnees = reponsesVersables(VUE_DEDUITE, "Bâtiment A");

  // Le nom court quand la question en déclare un — « si Le bâtiment
  // comporte-t-il des logements superposés ? = oui » ne se lit pas.
  assert.deepEqual(donnees.map((d) => d.sujet), [
    "Logements superposés", "Nombre d'étages sur rez-de-chaussée", "Hauteur du plancher bas du dernier niveau"
  ]);

  // Oui / non plutôt que true / false : ce langage s'adresse à des architectes.
  assert.equal(donnees[0].valeur, "oui");
  // Et l'unité colle au nombre : « 24,5 » et « 24,5 m » ne se relisent pas pareil.
  assert.equal(donnees[1].valeur, "4");
  assert.equal(donnees[2].valeur, "24.5 m");
  assert.equal(donnees[0].nature, "donnee-de-base");
});

/* ── Ce que chaque déduction conclut ─────────────────────────────────────── */

test("une déduction verse aussi la valeur qu'elle conclut", () => {
  // Sans elle, « Habitation : collective » n'existe que dans le bloc de sa règle :
  // l'audit ne la relit pas, aucun document ne s'y rattache, et les règles qui la
  // citent ne trouvent aucune affirmation de ce nom.
  const valeurs = conclusionsDesDeductions(VUE_DEDUITE, "Bâtiment A");

  assert.deepEqual(valeurs.map((v) => v.sujet), ["Habitation individuelle ou collective"]);
  const [nature] = valeurs;
  assert.equal(nature.valeur, "collective");
  assert.equal(nature.referentiel, undefined, "une valeur n'est pas une règle");
  assert.deepEqual(nature.zones, ["Bâtiment A"]);
  // La portée en fait partie : deux bâtiments peuvent conclure différemment, et
  // une conclusion posée sans zone périmerait l'autre.
  assert.equal(nature.provenance.type, PROVENANCE.REGLE);
});

test("la règle et sa conclusion sortent du même module, jamais de deux lectures", () => {
  // Une valeur écrite à deux endroits finit par diverger — sauf quand les deux
  // écritures lisent la même source au même instant, ce qui est le cas ici.
  const regles = deductionsVersables(VUE_DEDUITE, "Bâtiment A");
  const valeurs = conclusionsDesDeductions(VUE_DEDUITE, "Bâtiment A");

  assert.deepEqual(regles.map((r) => [r.sujet, r.valeur]), valeurs.map((v) => [v.sujet, v.valeur]));
});

test("une conclusion sans règle versée n'existe pas", () => {
  // Une valeur sans raisonnement remplacerait un trou par un autre : on ne verse
  // que ce que `deductionsVersables` retient — ni le « sans objet », ni la
  // lecture directe sans condition, ni l'exigence qui part déjà ailleurs.
  const sujets = conclusionsDesDeductions(VUE_DEDUITE, "").map((v) => v.sujet);
  assert.equal(sujets.includes("Sous-sol du bâtiment"), false);
  assert.equal(sujets.includes("Duplex au dernier étage"), false);
  assert.equal(sujets.includes("Classement du bâtiment"), false);
});
