import test from "node:test";
import assert from "node:assert/strict";

import {
  cleDuSujet, sujetsDeclares, roleDesJetons, resolutionDuSujet,
  renvoisSansDeclaration, variablesDeLaMemoire, ROLE, RESOLUTION, nomsDeclaresDeuxFois,
  naturesDesVariables, phraseDesNatures, definitionsDesVariables
} from "./memoire-identifiants.js";
import { blocDeRegle, blocDAffirmation, blocDeVariable, OPERATEUR, PROVENANCE } from "./memoire-en-texte.js";

const assertion = (sujet, extra = {}) => ({
  id: `a-${sujet}`, subject_key: sujet, status: "assumed", superseded_by: null,
  payload: { subject: sujet, value: "x" }, ...extra
});

test("deux écritures du même nom se rejoignent, sans deviner plus loin", () => {
  assert.equal(cleDuSujet("Hauteur du plancher  bas"), cleDuSujet("hauteur du plancher bas"));
  assert.equal(cleDuSujet("Élévation"), cleDuSujet("elevation"));
  // Pas de rapprochement au-delà : « hauteur » et « hauteurs » sont deux noms,
  // et les confondre ferait passer pour résolu un renvoi qui ne l'est pas.
  assert.notEqual(cleDuSujet("hauteur"), cleDuSujet("hauteurs"));
});

test("ce qui a été remplacé ne déclare plus rien", () => {
  const declares = sujetsDeclares([
    assertion("Hauteur du plancher bas"),
    assertion("Zone de neige", { superseded_by: "a-2" })
  ]);

  assert.equal(declares.has(cleDuSujet("Hauteur du plancher bas")), true);
  // Un renvoi vers elle renverrait vers ce que le projet ne tient plus pour vrai.
  assert.equal(declares.has(cleDuSujet("Zone de neige")), false);
});

test("c'est le premier mot qui dit si un nom se pose ou s'il renvoie", () => {
  const [tete, condition] = blocDeRegle({
    sujet: "Classement du bâtiment",
    conditions: [{ sujet: "Hauteur du plancher bas", operateur: OPERATEUR.AU_PLUS, valeur: "28", unite: "m" }],
    alors: "3e famille B"
  });

  assert.equal(roleDesJetons(tete), ROLE.DECLARATION);
  assert.equal(roleDesJetons(condition), ROLE.RENVOI);
});

test("une déclaration ne se résout pas : elle est la résolution", () => {
  const [tete] = blocDAffirmation({ sujet: "Zone de neige", valeur: "A2" });
  assert.equal(
    resolutionDuSujet("Zone de neige", { jetons: tete, declares: new Set() }),
    RESOLUTION.DECLARATION
  );
});

test("un renvoi se cherche, et son absence se dit", () => {
  const [, condition] = blocDeRegle({
    sujet: "Classement du bâtiment",
    conditions: [{ sujet: "Hauteur du plancher bas", operateur: OPERATEUR.AU_PLUS, valeur: "28", unite: "m" }],
    alors: "3e famille B"
  });

  const connus = sujetsDeclares([assertion("Hauteur du plancher bas")]);
  assert.equal(resolutionDuSujet("Hauteur du plancher bas", { jetons: condition, declares: connus }), RESOLUTION.CONNU);
  assert.equal(resolutionDuSujet("Hauteur du plancher bas", { jetons: condition, declares: new Set() }), RESOLUTION.INCONNU);

  // Sans table, on ne dit rien : un fichier rouge de bout en bout n'apprend
  // rien à personne.
  assert.equal(resolutionDuSujet("Hauteur du plancher bas", { jetons: condition }), "");
});

test("un fichier dit ce sur quoi il s'appuie sans que personne l'ait versé", () => {
  const lignes = blocDeRegle({
    sujet: "Colonne sèche",
    conditions: [
      { sujet: "Classement du bâtiment", operateur: OPERATEUR.EGAL, valeur: "3e famille B" },
      { sujet: "Hauteur du plancher bas", operateur: OPERATEUR.AU_PLUS, valeur: "28", unite: "m", joint: "et" }
    ],
    alors: "exigée",
    provenance: { type: PROVENANCE.TEXTE, quoi: "arrêté, article 98" }
  });

  const manquants = renvoisSansDeclaration(lignes, sujetsDeclares([assertion("Classement du bâtiment")]));
  assert.deepEqual(manquants, ["Hauteur du plancher bas"]);

  // Le sujet de la règle elle-même n'est pas un renvoi : il se pose.
  assert.equal(manquants.includes("Colonne sèche"), false);
});

test("les variables du projet se voient toutes, et avec elles qui s'en sert", () => {
  const declaration = blocDAffirmation({ sujet: "Hauteur du plancher bas", valeur: "26", unite: "m" });
  const regle = blocDeRegle({
    sujet: "Classement du bâtiment",
    conditions: [
      { sujet: "Hauteur du plancher bas", operateur: OPERATEUR.AU_PLUS, valeur: "28", unite: "m" },
      { sujet: "Logements superposés", operateur: OPERATEUR.EGAL, valeur: "oui", logique: true, joint: "et" }
    ],
    alors: "3e famille B"
  });

  const variables = variablesDeLaMemoire(
    [
      { fichier: "memoire/donnees-de-base.ddb", lignes: declaration },
      { fichier: "memoire/incendie.ref", lignes: regle }
    ],
    (f) => f.lignes.map((jetons) => ({ jetons }))
  );

  const parNom = new Map(variables.map((v) => [v.nom, v]));

  const hauteur = parNom.get("Hauteur du plancher bas");
  assert.equal(hauteur.declaree, true);
  assert.equal(hauteur.declarePar, "memoire/donnees-de-base.ddb");
  assert.equal(hauteur.valeur, "26 m");
  assert.deepEqual(hauteur.citeePar, ["memoire/incendie.ref"]);

  // La règle se déclare : elle produit un nom, elle n'en emprunte pas un. Et ce
  // qu'elle pose se lit sur sa ligne `alors` — sa tête ne dit pas ce qu'elle vaut.
  assert.equal(parNom.get("Classement du bâtiment").declaree, true);
  assert.equal(parNom.get("Classement du bâtiment").valeur, '"3e famille B"');

  // Et ce que personne n'a versé figure aussi : c'est le trou du raisonnement,
  // et le taire ne montrerait que ce qui va bien.
  const manquante = parNom.get("Logements superposés");
  assert.equal(manquante.declaree, false);
  assert.deepEqual(manquante.citeePar, ["memoire/incendie.ref"]);
});

test("un nom déclaré dans deux fichiers se compte, il ne se choisit pas en silence", () => {
  // Deux lignes du même nom vivent chacune de leur côté : une variante qui
  // change l'une laisse l'autre intacte, et l'écran annonce des conséquences
  // qui n'en sont pas. C'est ce qui a été observé sur « Profondeur hors gel ».
  const ligne = (nom) => ({
    jetons: [
      { type: "sujet", texte: nom },
      { type: "operateur", texte: "=" },
      { type: "valeur", texte: "0,47" },
      { type: "unite", texte: "m" }
    ]
  });

  const variables = variablesDeLaMemoire(
    [{ fichier: "memoire/sol.ctr" }, { fichier: "memoire/structure.ctr" }],
    (fichier) => (fichier.fichier === "memoire/sol.ctr"
      ? [ligne("Profondeur hors gel")]
      : [ligne("Profondeur hors gel"), ligne("Résultat du calcul")])
  );

  assert.deepEqual(nomsDeclaresDeuxFois(variables), [
    { nom: "Profondeur hors gel", fichiers: ["memoire/sol.ctr", "memoire/structure.ctr"] }
  ]);
});

test("un nom déclaré une seule fois ne se signale pas", () => {
  const variables = variablesDeLaMemoire(
    [{ fichier: "memoire/sol.ctr" }],
    () => [{ jetons: [{ type: "sujet", texte: "Altitude du site" }, { type: "valeur", texte: "13" }] }]
  );
  assert.deepEqual(nomsDeclaresDeuxFois(variables), []);
});

/* ── Ce que le projet dit d'une variable ─────────────────────────────────── */

/** Un fichier de la mémoire, tel que `fichiersDeLaMemoire` le rend. */
const fichierAvec = (lignes) => ({ fichier: "memoire/structure.ctr", lignes });

const porte = (sujet, nature, extra = {}) => ({
  id: `a-${sujet}-${nature}`, subject_key: sujet, status: "assumed", superseded_by: null,
  nature, payload: { subject: sujet, value: "x" }, ...extra
});

/**
 * La question à laquelle le fichier ne répondait pas. On l'ouvre pour décider
 * si l'on réutilise un nom ou si l'on en crée un autre — et c'est souvent
 * celle-là : ce nom porte-t-il une contrainte, un constat, une hypothèse, ou
 * rien ?
 */
test("une variable dit ce que le projet porte à son sujet, par nature", () => {
  const natures = naturesDesVariables([fichierAvec([
    porte("Zone de neige", "contrainte"),
    porte("Zone de neige", "constat", { id: "a-2" }),
    porte("Zone de neige", "constat", { id: "a-3" })
  ])]);

  assert.equal(phraseDesNatures(natures.get(cleDuSujet("Zone de neige"))), "1 contrainte · 2 constats");
});

test("la plus lourde se lit en premier", () => {
  // Une contrainte tranchée par un texte pèse autrement qu'une hypothèse que
  // personne n'a confirmée, et c'est la première qu'on veut lire.
  const natures = naturesDesVariables([fichierAvec([
    porte("Altitude du site", "hypothese"),
    porte("Altitude du site", "contrainte", { id: "a-2" })
  ])]);

  assert.match(phraseDesNatures(natures.get(cleDuSujet("Altitude du site"))), /^1 contrainte/);
});

/**
 * La réponse la plus utile du fichier. Un nom qu'une règle cite et qu'aucune
 * affirmation ne porte est un trou du raisonnement : la règle s'appuie sur ce
 * que personne n'a versé.
 */
test("un nom que rien ne porte le dit, et c'est ce qu'on vient chercher", () => {
  assert.match(phraseDesNatures(naturesDesVariables([]).get("x")), /aucune affirmation/);
  assert.match(phraseDesNatures(null), /aucune affirmation/);
});

test("ce qui a été remplacé ne compte plus", () => {
  // Ce que le projet **dit** est ce qu'il tient aujourd'hui.
  const natures = naturesDesVariables([fichierAvec([
    porte("Zone de vent", "contrainte", { superseded_by: "a-neuve" })
  ])]);

  assert.equal(natures.has(cleDuSujet("Zone de vent")), false);
});

/* ── Ce que la définition en fait ────────────────────────────────────────── */

test("la définition porte la phrase, et la distingue de « on n'a pas demandé »", () => {
  // `null` et « rien » ne disent pas la même chose : ne pas savoir n'est pas
  // savoir qu'il n'y a rien (règle 5).
  const variables = [{ cle: cleDuSujet("Zone de neige"), nom: "Zone de neige", valeur: "A1" }];

  const sansCarte = definitionsDesVariables(variables, null, null);
  assert.equal(sansCarte[0].ceQueLeProjetEnDit, null);

  const avecCarte = definitionsDesVariables(variables, null, naturesDesVariables([]));
  assert.match(avecCarte[0].ceQueLeProjetEnDit, /aucune affirmation/);
});

test("le bloc écrit le champ, et l'omet quand on ne l'a pas demandé", () => {
  const avec = blocDeVariable({ nom: "Zone de neige", ceQueLeProjetEnDit: "1 contrainte · 2 constats" })
    .flat().map((jeton) => jeton?.texte ?? "").join("");
  assert.match(avec, /ce que le projet en dit/);
  assert.match(avec, /1 contrainte · 2 constats/);

  const sans = blocDeVariable({ nom: "Zone de neige" })
    .flat().map((jeton) => jeton?.texte ?? "").join("");
  assert.doesNotMatch(sans, /ce que le projet en dit/);
});
