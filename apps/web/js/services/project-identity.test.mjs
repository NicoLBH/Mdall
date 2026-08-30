import test from "node:test";
import assert from "node:assert/strict";

import {
  ATTACHMENT,
  MARKER,
  assessAttachment,
  batchConsensus,
  declaredMarkers,
  findEchoes,
  markersToRemember,
  normalizeMarkerValue,
  selfMarkers
} from "./project-identity.js";

const PROJET = {
  projectName: "Résidence Les Terrasses du Lac",
  address: "12 avenue de la Plage",
  city: "Annecy",
  postalCode: "74000"
};

/** Un marqueur tel que la reconnaissance le rendrait. */
const affaire = (value) => ({ type: MARKER.CHRONO_AFFAIRE, value });

test("la comparaison ignore accents, casse et espaces multiples", () => {
  assert.equal(normalizeMarkerValue("Montée  de l'Escalier"), "montee de l'escalier");
  assert.equal(normalizeMarkerValue("  "), "");
  assert.equal(normalizeMarkerValue(null), "");
});

test("un projet ne propose comme preuve que ce qui est assez distinctif", () => {
  const markers = selfMarkers(PROJET);
  const types = markers.map((entry) => entry.type);

  assert.deepEqual(types, [MARKER.PROJECT_NAME, MARKER.ADDRESS, MARKER.CITY, MARKER.POSTAL_CODE]);
  // Le nom et l'adresse prouvent ; la ville et le code postal, non : deux
  // chantiers d'une même commune les partagent.
  assert.deepEqual(
    markers.filter((entry) => entry.strong).map((entry) => entry.type),
    [MARKER.PROJECT_NAME, MARKER.ADDRESS]
  );

  // Une valeur trop courte se retrouverait par hasard dans n'importe quel
  // rapport : une preuve qui se trouve partout n'est pas une preuve.
  assert.deepEqual(selfMarkers({ projectName: "ZAC", city: "" }), []);
  assert.deepEqual(selfMarkers(null), []);
});

test("un écho est une recherche dans le document, pas une extraction", () => {
  const texte = "RAPPORT D'ÉTAPE\nOpération : RESIDENCE LES TERRASSES DU LAC\nANNECY (74)";

  const echoes = findEchoes(texte, selfMarkers(PROJET)).map((entry) => entry.type);

  // Le nom est écrit en majuscules et sans accents dans le document : il est
  // reconnu quand même, sans qu'aucun format n'ait été supposé.
  assert.deepEqual(echoes, [MARKER.PROJECT_NAME, MARKER.CITY]);
  assert.deepEqual(findEchoes("", selfMarkers(PROJET)), []);
});

test("seuls les marqueurs déclarables sont retenus d'une reconnaissance", () => {
  const declared = declaredMarkers({
    markers: [
      { type: MARKER.CHRONO_AFFAIRE, value: "13860" },
      { type: MARKER.AFFAIRE, value: "230113860000087" },
      // Un type qu'un document ne peut pas déclarer de lui-même : ignoré.
      { type: MARKER.CITY, value: "Annecy" }
    ]
  });

  assert.deepEqual(declared.map((entry) => entry.type), [MARKER.CHRONO_AFFAIRE, MARKER.AFFAIRE]);
  assert.deepEqual(declaredMarkers(null), []);
  assert.deepEqual(declaredMarkers({ markers: [] }), []);
});

test("une affaire déjà rattachée au projet suffit, et rien n'est demandé", () => {
  const bilan = assessAttachment({
    declared: declaredMarkers({ markers: [affaire("13860")] }),
    echoes: [],
    known: [{ type: MARKER.CHRONO_AFFAIRE, value: "13860" }]
  });

  assert.equal(bilan.verdict, ATTACHMENT.BELONGS);
  assert.equal(bilan.matched.length, 1);
});

test("montée d'escalier C : une autre affaire, mais le nom du projet y figure", () => {
  // Le cas qui interdisait de comparer bêtement un numéro d'affaire. Deux
  // tranches d'un même chantier peuvent porter deux affaires distinctes ;
  // rejeter la seconde en silence serait un dégât pire que celui qu'on répare.
  const texte = "RICT — RESIDENCE LES TERRASSES DU LAC — Montée d'escalier C";

  const bilan = assessAttachment({
    declared: declaredMarkers({ markers: [affaire("13861")] }),
    echoes: findEchoes(texte, selfMarkers(PROJET)),
    known: [{ type: MARKER.CHRONO_AFFAIRE, value: "13860" }]
  });

  assert.equal(bilan.verdict, ATTACHMENT.BELONGS, "une preuve positive l'emporte sur le désaccord");
  assert.equal(bilan.conflicting.length, 1, "le désaccord est constaté, il ne décide simplement pas");
});

test("le rapport d'un autre projet est signalé, avec sa raison", () => {
  const bilan = assessAttachment({
    declared: declaredMarkers({ markers: [affaire("99999")] }),
    echoes: [],
    known: [{ type: MARKER.CHRONO_AFFAIRE, value: "13860" }]
  });

  assert.equal(bilan.verdict, ATTACHMENT.FOREIGN);
  assert.match(bilan.reason, /99999/);
});

test("le rapport du voisin — même ville, autre affaire — n'est pas tranché", () => {
  // La ville ne prouve rien : trop pour rejeter, trop peu pour accepter. On
  // demande plutôt que de choisir à la place de l'utilisateur.
  const bilan = assessAttachment({
    declared: declaredMarkers({ markers: [affaire("99999")] }),
    echoes: findEchoes("CHANTIER À ANNECY", selfMarkers(PROJET)),
    known: [{ type: MARKER.CHRONO_AFFAIRE, value: "13860" }]
  });

  assert.equal(bilan.verdict, ATTACHMENT.UNCERTAIN);
});

test("une ville seule ne suffit jamais à rattacher un document", () => {
  // Sans mémoire à contredire, l'écho faible ne doit pas non plus faire
  // conclure : sinon tout rapport annécien serait de ce projet.
  const bilan = assessAttachment({
    declared: [],
    echoes: findEchoes("CHANTIER À ANNECY", selfMarkers(PROJET)),
    known: []
  });

  assert.equal(bilan.verdict, ATTACHMENT.UNCERTAIN);
});

test("un projet sans mémoire ne contredit personne", () => {
  // Les premiers documents : il n'y a rien à quoi les comparer, et l'absence de
  // mémoire n'est pas un reproche à leur faire.
  const bilan = assessAttachment({
    declared: declaredMarkers({ markers: [affaire("13860")] }),
    echoes: [],
    known: []
  });

  assert.equal(bilan.verdict, ATTACHMENT.UNCERTAIN);
  assert.match(bilan.reason, /aucune affaire enregistrée/);
});

test("un document muet ne prétend rien, et n'est pas accusé", () => {
  const bilan = assessAttachment({ declared: [], echoes: [], known: [{ type: MARKER.CHRONO_AFFAIRE, value: "13860" }] });

  assert.equal(bilan.verdict, ATTACHMENT.UNCERTAIN);
  assert.deepEqual(bilan.conflicting, []);
});

test("confirmer verse à la mémoire ce qu'elle ignorait, et rien d'autre", () => {
  const known = [{ type: MARKER.CHRONO_AFFAIRE, value: "13860" }];
  const declared = declaredMarkers({
    markers: [affaire("13860"), { type: MARKER.AFFAIRE, value: "230113861000042" }]
  });

  const retenus = markersToRemember(declared, known);

  assert.deepEqual(retenus.map((entry) => entry.value), ["230113861000042"]);
  assert.deepEqual(markersToRemember(declared, [...known, ...retenus]), [], "rien à réécrire");
});

test("une fois l'escalier C confirmé, ses livrables passent sans qu'on redemande", () => {
  // Le tout du mécanisme, en une scène : la question posée une fois, la réponse
  // conservée, et la mémoire qui discrimine mieux qu'avant.
  let memoire = [{ type: MARKER.CHRONO_AFFAIRE, value: "13860" }];
  const escalierC = declaredMarkers({ markers: [affaire("13861")] });

  assert.equal(assessAttachment({ declared: escalierC, known: memoire }).verdict, ATTACHMENT.FOREIGN);

  memoire = [...memoire, ...markersToRemember(escalierC, memoire)];

  assert.equal(assessAttachment({ declared: escalierC, known: memoire }).verdict, ATTACHMENT.BELONGS);
  // Et le vrai intrus reste signalé : la mémoire s'est étoffée, pas relâchée.
  assert.equal(
    assessAttachment({ declared: declaredMarkers({ markers: [affaire("99999")] }), known: memoire }).verdict,
    ATTACHMENT.FOREIGN
  );
});

/** Le lot tel qu'il arrive : les marqueurs déclarés, document par document. */
const lot = (...affaires) => affaires.map((value) => declaredMarkers({ markers: [affaire(value)] }));

test("un lot où huit livrables s'accordent et un seul détonne désigne le solitaire", () => {
  // Le cas réel : huit livrables du Reposoir (affaire 13860) et une fiche de
  // l'Altima (affaire 12440), déposés ensemble sur un projet neuf.
  const consensus = batchConsensus(lot("13860", "13860", "13860", "13860", "13860", "13860", "13860", "13860", "12440"));

  assert.equal(consensus.get(MARKER.CHRONO_AFFAIRE).value, "13860");
  assert.equal(consensus.get(MARKER.CHRONO_AFFAIRE).count, 8);
});

test("l'intrus déjà dans le lot est signalé même sans aucune mémoire", () => {
  // C'est le seul filet qui fonctionne au premier dépôt — là où un intrus a le
  // plus de chances de se glisser, puisqu'il n'y a rien à quoi le comparer.
  const consensus = batchConsensus(lot("13860", "13860", "13860", "13860", "12440"));

  const intrus = assessAttachment({
    declared: declaredMarkers({ markers: [affaire("12440")] }),
    known: [],
    consensus
  });

  assert.equal(intrus.verdict, ATTACHMENT.FOREIGN);
  assert.match(intrus.reason, /12440/);
  assert.match(intrus.reason, /4 autre\(s\) livrable\(s\)/);
  assert.match(intrus.reason, /13860/);
});

test("la majorité du lot ne condamne pas ceux qui la composent", () => {
  const consensus = batchConsensus(lot("13860", "13860", "13860", "13860", "12440"));

  const legitime = assessAttachment({
    declared: declaredMarkers({ markers: [affaire("13860")] }),
    known: [],
    consensus
  });

  assert.equal(legitime.verdict, ATTACHMENT.UNCERTAIN, "rien à leur reprocher, et rien à confirmer d'eux");
});

test("à égalité, le lot n'accuse personne", () => {
  // Quatre contre quatre : rien ne dit qui est l'intrus, et accuser au hasard
  // vaudrait moins que se taire.
  const consensus = batchConsensus(lot("13860", "13860", "12440", "12440"));

  assert.equal(consensus.size, 0);
  assert.equal(
    assessAttachment({ declared: declaredMarkers({ markers: [affaire("12440")] }), known: [], consensus }).verdict,
    ATTACHMENT.UNCERTAIN
  );
});

test("un lot homogène ne se contredit pas", () => {
  assert.equal(batchConsensus(lot("13860", "13860", "13860")).size, 0);
  assert.equal(batchConsensus(lot("13860")).size, 0, "un document seul ne fait pas majorité contre lui-même");
  assert.equal(batchConsensus([]).size, 0);
});

test("la mémoire du projet l'emporte sur la majorité du lot", () => {
  // Une réponse humaine conservée vaut mieux qu'un décompte : si l'affaire a
  // été rattachée, le livrable passe, fût-il seul de son espèce dans le lot.
  const consensus = batchConsensus(lot("13860", "13860", "13860", "12440"));

  const bilan = assessAttachment({
    declared: declaredMarkers({ markers: [affaire("12440")] }),
    known: [{ type: MARKER.CHRONO_AFFAIRE, value: "12440" }],
    consensus
  });

  assert.equal(bilan.verdict, ATTACHMENT.BELONGS);
});

test("un écho suspend aussi le jugement du lot", () => {
  const consensus = batchConsensus(lot("13860", "13860", "13860", "12440"));

  const bilan = assessAttachment({
    declared: declaredMarkers({ markers: [affaire("12440")] }),
    echoes: findEchoes("CHANTIER À ANNECY", selfMarkers(PROJET)),
    known: [],
    consensus
  });

  assert.equal(bilan.verdict, ATTACHMENT.UNCERTAIN);
});
