/**
 * Ce qu'une valeur rouvre, et ce qui ne rouvre rien.
 *
 * Les fixtures portent des **chaînes**, pas des lignes isolées : un compte qui
 * ne se propage pas rendrait les mêmes chiffres qu'un compte qui se propage sur
 * une mémoire à plat. Chaque cas porte donc sa moitié inverse — la même mémoire
 * sans le choix, la même chaîne sans son maillon, le même raisonnement sans son
 * `porteSur`.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { ceQueCaRouvre, choixDeLaMemoire, phraseDeCeQueCaRouvre } from "./ce-que-ca-rouvre.js";
import { NATURE } from "./assertion-taxonomy.js";

/** Une fonction versée : elle relie ce qu'elle lit à ce qu'elle conclut. */
const fonction = (sujet, valeur, entrees = []) => ({
  id: `r-${sujet}`, subject_key: `regle:${sujet}`, superseded_by: null,
  payload: {
    subject: sujet, value: valeur, referentiel: true,
    regle: {
      conditions: entrees.map((nom) => ({ sujet: nom, operateur: "=", valeur: ["x"] })),
      sauf: []
    }
  }
});

/** Une valeur du projet. */
const valeur = (sujet, dite) => ({
  id: `a-${sujet}`, subject_key: sujet, superseded_by: null,
  payload: { subject: sujet, value: dite }
});

/**
 * Un raisonnement versé — la troisième ligne que la fermeture d'un sujet pose.
 *
 * C'est la **seule** qui dise sous quelles valeurs on a tranché. Sans elle, une
 * décision est un cul-de-sac : rien ne peut la rouvrir, faute de savoir ce
 * qu'elle tenait pour acquis.
 */
const choix = (question, porteSur = [], { par = "Ourdine Ferrand", quand = "12/03" } = {}) => ({
  id: `c-${question}`, subject_key: question, superseded_by: null, nature: NATURE.RAISONNEMENT,
  payload: {
    subject: question, value: question,
    provenance: { type: "décision", quoi: question, par, le: quand },
    raisonnement: {
      question,
      porteSur: porteSur.map((nom) => ({ sujet: nom, valeur: "" })),
      examine: [], decision: null, produit: []
    }
  }
});

/**
 * La mémoire d'épreuve : une chaîne de trois niveaux, et un choix humain posé
 * au milieu.
 *
 * ```
 * Commune → Zone climatique → Épaisseur d'isolant
 *                  ↑
 *          le débat portait là
 * ```
 */
const MEMOIRE = [
  valeur("Commune", "Montholon (89110)"),
  fonction("Zone climatique", "H1a", ["Commune"]),
  valeur("Zone climatique", "H1a"),
  fonction("Épaisseur d'isolant", "160 mm", ["Zone climatique"]),
  valeur("Épaisseur d'isolant", "160 mm"),
  choix("Quelle zone retient-on ?", ["Zone climatique"])
];

test("un choix humain se lit dans le raisonnement, pas dans la décision", () => {
  // Une décision seule ne dit pas sous quelles valeurs elle a été prise : c'est
  // le raisonnement qui porte `porteSur`, et c'est pour cela qu'on le lit.
  const dits = choixDeLaMemoire(MEMOIRE);

  assert.equal(dits.length, 1);
  assert.equal(dits[0].question, "Quelle zone retient-on ?");
  assert.equal(dits[0].par, "Ourdine Ferrand");
  assert.deepEqual(dits[0].porteSur, ["zone climatique"]);

  // Une ligne remplacée ne décrit plus l'état du projet : son choix non plus.
  assert.deepEqual(choixDeLaMemoire([{ ...choix("Périmée", ["Commune"]), superseded_by: "autre" }]), []);

  // **Une décision seule n'est pas un choix situé.** Elle dit ce qu'elle a
  // écarté ; elle ne dit pas sous quelles valeurs on a tranché. La lire ici
  // ferait entrer un choix qu'aucune valeur ne peut rouvrir, et le compte
  // annoncerait un projet plus tenu qu'il ne l'est.
  const decisionSeule = {
    id: "d1", subject_key: "decision:Quelle couleur ?", superseded_by: null,
    payload: {
      subject: "Quelle couleur ?", value: "violet", nature: NATURE.DECISION,
      decision: { question: "Quelle couleur ?", ecartes: [{ quoi: "bleu" }], motif: "" },
      provenance: { type: "décision", quoi: "…", par: "Ourdine Ferrand", le: "12/03" }
    }
  };
  assert.deepEqual(choixDeLaMemoire([decisionSeule]), []);
  assert.equal(ceQueCaRouvre([...MEMOIRE.filter((l) => !l.id.startsWith("c-")), decisionSeule]).size, 0);
});

test("ce dont une valeur débattue découle rouvre le débat, de proche en proche", () => {
  // **C'est la propagation, et c'est tout l'objet du fichier.** On a débattu de
  // la zone climatique ; la commune la détermine. Changer la commune oblige donc
  // à reprendre le débat — personne ne tient cette chaîne de tête.
  const rouvert = ceQueCaRouvre(MEMOIRE);

  assert.equal(rouvert.get("a-Commune")?.combien, 1);
  assert.equal(rouvert.get("a-Zone climatique")?.combien, 1);
  assert.equal(rouvert.get("a-Commune")?.choix[0].question, "Quelle zone retient-on ?");

  // **Et l'aval ne rouvre rien.** L'épaisseur d'isolant découle du débat, elle
  // ne le fonde pas : la changer ne redemande rien à personne. Sans cette
  // moitié, un compte qui marquerait toute la mémoire passerait l'épreuve.
  assert.equal(rouvert.has("a-Épaisseur d'isolant"), false);

  // **La fonction qui conclut la valeur débattue rouvre le choix, elle aussi**,
  // et c'est exact : on a débattu de « H1a » ; changer la règle qui le conclut
  // change la conclusion, donc le débat est à refaire. C'est précisément ce
  // qu'un humain ne tient pas de tête en modifiant un référentiel.
  assert.equal(rouvert.get("r-Zone climatique")?.combien, 1);

  // Six lignes, trois qui rouvrent : le reste est du détail, et ne s'énumère pas.
  assert.equal(rouvert.size, 3);
});

test("un maillon retiré coupe la propagation, et le compte le dit", () => {
  // La fixture doit **varier ce qu'elle mesure** : sans la fonction qui relie
  // la commune à la zone, la commune cesse d'être en amont du débat.
  const sansMaillon = MEMOIRE.filter((ligne) => ligne.id !== "r-Zone climatique");
  const rouvert = ceQueCaRouvre(sansMaillon);

  assert.equal(rouvert.has("a-Commune"), false);
  assert.equal(rouvert.get("a-Zone climatique")?.combien, 1);
});

test("un choix dont personne n'a noté le contexte ne rouvre rien, et c'est exact", () => {
  // `raisonnement-du-point.js` écrit déjà « on ne sait pas sur quelles valeurs
  // il portait ». Lui inventer un amont plausible serait pire que le vide : on
  // croirait savoir ce qu'on ne sait pas (règle 5).
  const rouvert = ceQueCaRouvre([
    ...MEMOIRE.filter((ligne) => !ligne.id.startsWith("c-")),
    choix("Quelle teinte de façade ?", [])
  ]);

  assert.equal(rouvert.size, 0);

  // Et une mémoire sans le moindre choix ne rouvre rien non plus — pour une
  // autre raison, et les deux se distinguent à la lecture du projet.
  assert.equal(ceQueCaRouvre(MEMOIRE.filter((ligne) => !ligne.id.startsWith("c-"))).size, 0);
});

test("deux choix sur la même chaîne se cumulent, et se nomment tous les deux", () => {
  // En cacher un ferait croire la chaîne moins tenue qu'elle n'est.
  const rouvert = ceQueCaRouvre([
    ...MEMOIRE,
    choix("Faut-il isoler par l'extérieur ?", ["Commune"], { par: "Bertrand", quand: "04/04" })
  ]);

  assert.equal(rouvert.get("a-Commune")?.combien, 2);
  assert.deepEqual(
    rouvert.get("a-Commune").choix.map((un) => un.par).sort(),
    ["Bertrand", "Ourdine Ferrand"]
  );

  // La zone climatique n'en rouvre qu'un : le second débat portait sur la
  // commune, qui est en amont d'elle, pas en aval.
  assert.equal(rouvert.get("a-Zone climatique")?.combien, 1);
});

test("le graphe de la base remplace celui qu'on dérive, et ne s'y ajoute pas", () => {
  // Les deux ont la même forme, et c'est voulu : un écran qui a lu les
  // dépendances en base doit pouvoir les passer telles quelles, sans qu'un
  // second graphe dérivé vienne s'y mêler et compter deux fois.
  const rouvert = ceQueCaRouvre(MEMOIRE, {
    liens: [{ assertion_id: "a-Zone climatique", depends_on_assertion_id: "a-Épaisseur d'isolant" }]
  });

  // Avec ce graphe-là, c'est l'isolant qui est en amont — et la commune n'y est
  // plus du tout. Le résultat suit le graphe qu'on donne, jamais l'autre.
  assert.equal(rouvert.has("a-Épaisseur d'isolant"), true);
  assert.equal(rouvert.has("a-Commune"), false);

  // **Un graphe vide n'est pas un graphe.** C'est le cas de tous les appelants :
  // l'écran passe ce qu'il a lu en base, et il a souvent lu `[]` — avant que la
  // requête revienne, ou quand rien n'est déclaré. Sans le repli, la mémoire
  // entière annoncerait « rien à rouvrir » sans que rien ne le dise. La règle est
  // écrite ici, une fois, plutôt qu'à chaque appelant (règle 4).
  assert.deepEqual(
    [...ceQueCaRouvre(MEMOIRE, { liens: [] }).keys()].sort(),
    [...ceQueCaRouvre(MEMOIRE).keys()].sort()
  );
  assert.equal(ceQueCaRouvre(MEMOIRE, { liens: [] }).size, 3);
});

test("un graphe qui se lit en rond ne fige pas le compte", () => {
  /**
   * Un graphe écrit par des humains en contiendra un. Il doit se voir, pas
   * bloquer l'écran.
   *
   * **Ce cas-là s'éprouve par sa terminaison, et c'est sa limite** : sans le
   * garde, la remontée ne rend pas un mauvais compte — elle ne rend rien du
   * tout, et la boucle est synchrone, donc aucun délai d'épreuve ne peut
   * l'interrompre. La mutation qui retire le garde ne fait donc pas tomber ce
   * cas : elle le fait pendre. C'est écrit ici pour qu'on ne le prenne pas un
   * jour pour un cas qui garde quelque chose.
   */
  const rouvert = ceQueCaRouvre([valeur("A", "1"), valeur("B", "2"), choix("Alors ?", ["A"])], {
    liens: [
      { assertion_id: "a-A", depends_on_assertion_id: "a-B" },
      { assertion_id: "a-B", depends_on_assertion_id: "a-A" }
    ]
  });

  assert.deepEqual([...rouvert.keys()].sort(), ["a-A", "a-B"]);
});

test("la phrase s'accorde, et se tait quand il n'y a rien à dire", () => {
  assert.equal(phraseDeCeQueCaRouvre({ combien: 1 }), "1 choix humain à rouvrir");
  assert.equal(phraseDeCeQueCaRouvre({ combien: 3 }), "3 choix humains à rouvrir");

  // « Aucun choix à rouvrir » sur cent soixante-dix lignes serait du bruit, et
  // le bruit fait ignorer le reste.
  assert.equal(phraseDeCeQueCaRouvre({ combien: 0 }), "");
  assert.equal(phraseDeCeQueCaRouvre(null), "");
});
