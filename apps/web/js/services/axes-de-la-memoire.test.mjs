/**
 * Les trois axes, et **un seul mot par ligne**.
 *
 * Ce qui se teste ici est ce qu'on a vu à l'écran : le même objet portait trois
 * noms — « Règles » dans le rail, « Donnée de base » sur sa puce, « Le
 * raisonnement » sur son panneau. Les fixtures reproduisent donc la ligne de
 * production telle qu'elle est en base, `kind: "base-datum"` compris : c'est ce
 * `kind` qui faisait dire « donnée de base » d'une fonction, et une fixture qui
 * ne le porterait pas ne mesurerait rien.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  AUTORITES,
  AXE,
  FORME,
  FORMES,
  autoriteCourte,
  autoriteDe,
  formeCourte,
  formeDe,
  motDeLaLigne,
  phraseDuRejeu,
  rejeuDuSujet
} from "./axes-de-la-memoire.js";
import { BASE_DATUM_KIND, NATURE, SETTLED_BY, UNCLASSIFIED_LABEL } from "./assertion-taxonomy.js";

/**
 * Une fonction versée, **telle que la base la porte**.
 *
 * `kind: "base-datum"` n'est pas un détail de fixture : c'est par là qu'une
 * fonction entre en mémoire, et c'est de là que `classifyAssertion` déduisait
 * « donnée de base ». Sans lui, l'épreuve passerait sans rien éprouver.
 */
const fonction = (sujet, valeur, entrees = []) => ({
  id: `r-${sujet}`, subject_key: `regle:${sujet}`, kind: BASE_DATUM_KIND,
  status: "assumed", superseded_by: null,
  payload: {
    subject: sujet, value: valeur, referentiel: true,
    regle: { conditions: entrees.map((nom) => ({ sujet: nom, operateur: "=", valeur: ["x"] })), sauf: [] }
  }
});

/** Une valeur du projet, posée par personne en particulier. */
const valeur = (sujet, dite, dessus = {}) => ({
  id: `a-${sujet}`, subject_key: sujet, kind: BASE_DATUM_KIND,
  status: "assumed", superseded_by: null,
  payload: { subject: sujet, value: dite, ...dessus }
});

/** Une valeur qu'un humain a tranchée, avec son nom et sa date. */
const tranchee = (sujet, dite, { par = "Ourdine Ferrand", quand = "12/03" } = {}) => valeur(sujet, dite, {
  provenance: { type: "décision", quoi: `${sujet} — tranché par ${par}`, par, le: quand },
  decision: { question: `Quelle ${sujet} ?`, ecartes: [{ quoi: "bleu" }], motif: "" }
});

test("une fonction versée tient son autorité d'un texte, pas du projet", () => {
  // **C'est le défaut vu à l'écran.** La ligne portait « Donnée de base » sous un
  // rail qui annonçait « Règles » : deux mots pour un objet, et l'un des deux
  // venait d'un `kind` qui ne dit rien de son autorité.
  const regle = fonction("Zones climatiques d'après la commune", "H1a", ["Commune"]);

  assert.equal(autoriteDe(regle), SETTLED_BY.TIERS);
  assert.equal(motDeLaLigne(regle).mot, "D'un texte");

  // Et une donnée de base **qui n'est pas une fonction** garde la sienne : sans
  // cela, l'épreuve ci-dessus passerait parce que tout dirait « D'un texte ».
  assert.equal(autoriteDe(valeur("Commune", "Montholon (89110)")), SETTLED_BY.PROJET);
  assert.equal(motDeLaLigne(valeur("Commune", "Montholon (89110)")).mot, "Du projet");
});

test("une valeur qu'un humain a tranchée se lit « Décidé », pas « Du projet »", () => {
  // **Même défaut que la fonction, un cran plus grave.** La valeur qu'une
  // décision fixe porte la nature de la valeur produite — `donnee-de-base` par
  // défaut —, et se lisait donc « Du projet ». Or quelqu'un l'a choisie entre des
  // possibles : c'est exactement ce que Mdall existe pour garder, et le mot
  // l'effaçait.
  const dite = tranchee("Couleur des volets", "violet");

  assert.equal(dite.payload.provenance.type, "décision");
  assert.equal(autoriteDe(dite), SETTLED_BY.ARBITRAGE);
  assert.equal(motDeLaLigne(dite).mot, "Décidé");

  // La même valeur sans sa décision reste du projet : sans cette moitié,
  // l'épreuve passerait sur un module qui dirait « Décidé » de tout.
  assert.equal(autoriteDe(valeur("Couleur des volets", "violet")), SETTLED_BY.PROJET);
});

test("chaque nature qu'un tranchant désigne a son mot, et ils diffèrent tous", () => {
  const mots = [
    NATURE.CONTRAINTE, NATURE.DECISION, NATURE.CONSTAT, NATURE.HYPOTHESE, NATURE.DONNEE_BASE
  ].map((nature) => motDeLaLigne({ nature, payload: {} }).mot);

  assert.deepEqual(mots, ["D'un texte", "Décidé", "Constaté", "Supposé", "Du projet"]);

  // Cinq natures, cinq mots : deux natures qui s'écriraient pareil se
  // confondraient à l'écran, et le filtre en rendrait les deux.
  assert.equal(new Set(mots).size, 5);

  // Et chaque autorité déclarée a le sien : une valeur d'`AUTORITES` sans mot
  // s'afficherait vide, et l'on croirait la ligne non classée.
  for (const autorite of AUTORITES) assert.notEqual(autoriteCourte(autorite), "");
});

test("ce que rien ne tranche parle par sa forme, jamais par son autorité", () => {
  // Un raisonnement et une intendance n'affirment rien sur l'ouvrage : leur
  // autorité n'a rien à dire, et l'écran doit quand même écrire un mot.
  const chemin = { nature: NATURE.RAISONNEMENT, payload: {} };

  assert.equal(autoriteDe(chemin), null);
  assert.deepEqual(motDeLaLigne(chemin), { mot: "Déduite", axe: AXE.FORME, connu: true });

  // Ce qu'on ne sait pas se dit avec le mot de partout (règle 5), et sur l'axe
  // de l'autorité : c'est celui qu'on interrogeait.
  assert.deepEqual(motDeLaLigne({ payload: {} }), {
    mot: UNCLASSIFIED_LABEL, axe: AXE.AUTORITE, connu: false
  });
});

test("une décision est une fonction sans condition, et se lit « Posée »", () => {
  // « Je décide que les volets seront violets » est une fonction, arbitraire,
  // sans logique. C'est tout l'objet de cet axe : la forme ne juge pas
  // l'autorité, elle compte les conditions.
  assert.equal(formeDe(tranchee("Couleur des volets", "violet")), FORME.POSEE);
  assert.equal(motDeLaLigne(tranchee("Couleur des volets", "violet")).mot, "Décidé");

  // Une fonction sans condition aussi — `alors (X = Y)` sans `si` ne déduit rien.
  assert.equal(formeDe(fonction("Couleur des volets", "violet")), FORME.POSEE);

  // Avec une condition, elle déduit. C'est la variation qui fait l'épreuve : sans
  // elle, `formeDe` pourrait rendre « Posée » partout et passer.
  assert.equal(formeDe(fonction("Couleur des volets", "violet", ["Nature des volets"])), FORME.DEDUITE);

  // Et une valeur qui **cite** la fonction qui l'a conclue est déduite, elle
  // aussi : sinon l'essentiel de ce que le projet porte se lirait « Posée ».
  assert.equal(formeDe(valeur("Couleur des volets", "violet", {
    provenance: { type: "règle", quoi: "Couleur des volets" }
  })), FORME.DEDUITE);

  // Chaque forme déclarée a son mot.
  for (const forme of FORMES) assert.notEqual(formeCourte(forme), "");
});

test("une chaîne que rien n'arrête se recalcule seule, et dit sa profondeur", () => {
  // Trois niveaux qui se déduisent les uns des autres : c'est le seul vrai axe
  // de complexité, et il se compte.
  const memoire = [
    fonction("Colonne sèche", "exigée", ["Classement du bâtiment"]),
    fonction("Classement du bâtiment", "3e famille B", ["Hauteur du plancher bas"]),
    fonction("Hauteur du plancher bas", "26 m", ["Nombre de niveaux"]),
    valeur("Nombre de niveaux", "8")
  ];

  const rejeu = rejeuDuSujet("Colonne sèche", memoire);

  assert.equal(rejeu.seule, true);
  assert.equal(rejeu.profondeur, 3);
  assert.deepEqual(rejeu.arrets, []);
  assert.equal(phraseDuRejeu(rejeu), "se recalcule seule — 3 niveaux");

  // **La profondeur varie avec la chaîne**, sinon elle ne mesure rien : une
  // fonction qui lit directement sa donnée n'a qu'un niveau, et le singulier
  // s'écrit.
  const courte = rejeuDuSujet("Hauteur du plancher bas", memoire);
  assert.equal(courte.profondeur, 1);
  assert.equal(phraseDuRejeu(courte), "se recalcule seule — 1 niveau");
});

test("une chaîne qui traverse une décision s'arrête, et dit qui appeler", () => {
  // **C'est la seule chose de tout ce vocabulaire qu'aucun autre outil ne sait
  // dire**, et elle vivait cachée dans la définition du mot « raisonnement ».
  const memoire = [
    fonction("Teinte de façade", "RAL 5003", ["Couleur des volets"]),
    fonction("Couleur des volets", "violet", ["Nature des volets"]),
    tranchee("Nature des volets", "bois", { par: "Ourdine Ferrand", quand: "12/03" })
  ];

  const rejeu = rejeuDuSujet("Teinte de façade", memoire);

  assert.equal(rejeu.seule, false);
  assert.equal(rejeu.profondeur, 2);
  assert.deepEqual(rejeu.arrets.map((un) => un.sujet), ["Nature des volets"]);
  assert.equal(rejeu.arrets[0].par, "Ourdine Ferrand");
  assert.deepEqual(rejeu.arrets[0].ecartes, [{ quoi: "bleu" }]);

  assert.equal(
    phraseDuRejeu(rejeu),
    "s'arrête sur une décision d'Ourdine Ferrand, le 12/03 — 2 niveaux"
  );

  // **La même chaîne sans la décision se rejoue.** Sans cette moitié, l'épreuve
  // passerait sur une chaîne qui s'arrête toujours, quoi qu'on y mette.
  const sansArret = rejeuDuSujet("Teinte de façade", [
    memoire[0], memoire[1], valeur("Nature des volets", "bois")
  ]);
  assert.equal(sansArret.seule, true);
  assert.equal(phraseDuRejeu(sansArret), "se recalcule seule — 2 niveaux");
});

test("plusieurs arrêts se comptent, et le premier se nomme", () => {
  // En cacher un ferait croire la chaîne plus simple qu'elle n'est.
  const memoire = [
    fonction("Teinte de façade", "RAL 5003", ["Couleur des volets", "Enduit"]),
    fonction("Couleur des volets", "violet", ["Nature des volets"]),
    tranchee("Nature des volets", "bois", { par: "Ourdine Ferrand", quand: "12/03" }),
    tranchee("Enduit", "gratté", { par: "Bertrand", quand: "04/04" })
  ];

  const rejeu = rejeuDuSujet("Teinte de façade", memoire);

  assert.equal(rejeu.arrets.length, 2);
  assert.match(phraseDuRejeu(rejeu), /\(et 1 autre\)/);
});

test("un arrêt sans nom ni date se dit quand même, et ne s'invente pas", () => {
  // Une décision sans auteur ne se voit pas attribuer le dernier connecté
  // (règle 5) : la phrase est plus courte, et c'est tout.
  const rejeu = rejeuDuSujet("Couleur des volets", [
    fonction("Couleur des volets", "violet", ["Nature des volets"]),
    tranchee("Nature des volets", "bois", { par: "", quand: "" })
  ]);

  assert.equal(rejeu.seule, false);
  assert.equal(
    phraseDuRejeu(rejeu),
    "s'arrête sur une décision dont on ne sait ni qui ni quand — 1 niveau"
  );
});

test("une entrée que personne n'a versée n'est pas un arbitrage", () => {
  // Les confondre ferait passer un trou pour un choix humain. Une chaîne qui
  // manque une entrée ne se rejoue pas du tout — elle ne s'arrête pas pour
  // demander à quelqu'un.
  const rejeu = rejeuDuSujet("Couleur des volets", [
    fonction("Couleur des volets", "violet", ["Nature des volets"])
  ]);

  assert.equal(rejeu.seule, false);
  assert.deepEqual(rejeu.arrets, []);
  assert.deepEqual(rejeu.manquants, ["Nature des volets"]);
  assert.equal(
    phraseDuRejeu(rejeu),
    "ne se recalcule pas : 1 entrée que personne n'a versée — 1 niveau"
  );
});

test("une valeur que rien ne déduit ne prétend pas se recalculer", () => {
  // « Se recalcule seule » d'un constat relevé à la main serait un mensonge
  // poli : il ne se recalcule pas, il a été vu.
  const rejeu = rejeuDuSujet("Fissure en pignon", [valeur("Fissure en pignon", "traversante")]);

  assert.equal(rejeu.profondeur, 0);
  assert.equal(phraseDuRejeu(rejeu), "");
  assert.equal(phraseDuRejeu(null), "");
});
