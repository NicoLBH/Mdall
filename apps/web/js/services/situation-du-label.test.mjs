/**
 * La situation qui suit un label — et surtout, ce qui l'empêche d'en faire deux.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSEZ_POUR_UNE_SITUATION, CE_QUE_LA_SITUATION_FAIT, PHRASES_DE_LA_SITUATION, SITUATION,
  couvreLeLabel, filtreDuLabel, phraseDeLaSituation, situationDuLabel
} from "./situation-du-label.js";

const pour = (surcharge = {}) => situationDuLabel({
  labelCle: "cr chantier", labelNom: "CR chantier", ...surcharge
});

/* ── Quand il y a de quoi ────────────────────────────────────────────────── */

/**
 * **Deux, et pas un.** Une situation qui ne rassemble qu'un sujet ne rassemble
 * rien : c'est un sujet avec une page de plus.
 */
test("une situation se propose à partir de deux sujets", () => {
  assert.equal(pour({ sujetsDuLabel: [], situations: [] }).verdict, SITUATION.TROP_TOT);
  assert.equal(pour({ sujetsDuLabel: ["s-1"], situations: [] }).verdict, SITUATION.TROP_TOT);
  assert.equal(pour({ sujetsDuLabel: ["s-1", "s-2"], situations: [] }).verdict, SITUATION.A_PROPOSER);
  assert.equal(ASSEZ_POUR_UNE_SITUATION, 2);
});

/**
 * Le filtre a la forme que la base attend. **Le recopier approximativement
 * ferait une situation qui ne rassemble rien**, et l'erreur ne se verrait qu'à
 * l'usage — pas au moment où on l'accepte.
 */
test("la situation proposée porte le filtre que la base sait lire", () => {
  const { situation } = pour({ sujetsDuLabel: ["s-1", "s-2"], situations: [] });

  assert.equal(situation.mode, "automatic");
  assert.deepEqual(situation.filter_definition, {
    status: ["open"], priorities: [], objectiveIds: [],
    labelIds: ["cr chantier"], assigneeIds: [], blockedOnly: false
  });
  // Le titre est celui du label, et rien d'inventé.
  assert.equal(situation.title, "CR chantier");
});

/** La clé se compare en minuscules, des deux côtés. */
test("la clé du label se compare sans casse", () => {
  assert.deepEqual(filtreDuLabel("CR Chantier").labelIds, ["cr chantier"]);
  assert.deepEqual(filtreDuLabel("").labelIds, []);
});

/* ── Ce qui empêche la seconde ───────────────────────────────────────────── */

/**
 * **Une seconde situation sur le même label serait une seconde vérité sur le
 * même ensemble**, et l'on ne saurait plus laquelle regarder (règle 10).
 */
test("une situation qui couvre déjà le label en interdit une seconde", () => {
  const deja = [{ mode: "automatic", filter_definition: { labelIds: ["CR Chantier"] } }];
  const verdict = pour({ sujetsDuLabel: ["s-1", "s-2", "s-3"], situations: deja });

  assert.equal(verdict.verdict, SITUATION.DEJA_LA);
  assert.equal(verdict.situation, null);
  // Elle compte quand même les sujets : c'est ce que l'écran affiche.
  assert.equal(verdict.combien, 3);
});

/** Elle couvre même refermée, même renommée : c'est le filtre qui compte. */
test("une situation fermée ou renommée couvre toujours le label", () => {
  for (const situation of [
    { mode: "automatic", status: "closed", filter_definition: { labelIds: ["cr chantier"] } },
    { mode: "automatic", title: "Autre chose", filter_definition: { labelIds: ["cr chantier", "urgent"] } }
  ]) {
    assert.equal(couvreLeLabel(situation, "cr chantier"), true);
  }
});

/**
 * Une situation manuelle **ne couvre rien**, même si elle porte le même nom :
 * son contenu est une liste figée, pas un filtre. Croire qu'elle couvre priverait
 * le projet de la seule qui se tient à jour.
 */
test("une situation manuelle du même nom ne couvre pas le label", () => {
  const manuelle = [{ mode: "manual", title: "CR chantier", filter_definition: { labelIds: ["cr chantier"] } }];

  assert.equal(couvreLeLabel(manuelle[0], "cr chantier"), false);
  assert.equal(pour({ sujetsDuLabel: ["s-1", "s-2"], situations: manuelle }).verdict, SITUATION.A_PROPOSER);
});

/** Une automatique qui filtre autre chose ne couvre pas non plus. */
test("une situation automatique sur un autre label ne couvre pas", () => {
  const autre = [{ mode: "automatic", filter_definition: { labelIds: ["urgent"] } }];
  assert.equal(couvreLeLabel(autre[0], "cr chantier"), false);
  assert.equal(couvreLeLabel({ mode: "automatic" }, "cr chantier"), false);
});

/* ── Ce qu'on ne sait pas ────────────────────────────────────────────────── */

/**
 * **Ne pas savoir n'autorise pas à créer** (règle 5). Sans la liste des
 * situations, on ne peut pas affirmer qu'aucune ne couvre le label — et l'on en
 * ferait une seconde.
 */
test("sans les situations du projet, aucune n'est proposée", () => {
  for (const options of [
    { sujetsDuLabel: ["s-1", "s-2"], situations: null },
    { sujetsDuLabel: null, situations: [] },
    { sujetsDuLabel: ["s-1", "s-2"], situations: [], labelCle: "" },
    {}
  ]) {
    const verdict = pour(options);
    assert.equal(verdict.verdict, SITUATION.INCONNU);
    assert.equal(verdict.situation, null);
  }
});

/* ── Ce qu'on en dit ─────────────────────────────────────────────────────── */

/**
 * **« Toute seule » ne veut pas dire « sans personne ».** La phrase dit ce que
 * la situation fera d'elle-même une fois acceptée — pas qu'elle existe déjà.
 */
test("la phrase dit ce que la situation ferait, pas ce qu'elle a fait", () => {
  const dite = phraseDeLaSituation(pour({ sujetsDuLabel: ["s-1", "s-2"], situations: [] }));

  assert.match(dite, /2 sujets ouverts viennent des comptes rendus/);
  assert.match(dite, /Elle se tient à jour seule/);
  assert.match(CE_QUE_LA_SITUATION_FAIT, /Personne n'a à la remplir/);
  // Jamais un passé : rien n'est créé à ce stade.
  assert.doesNotMatch(dite, /a été créée|créée le|situation créée/i);
});

test("chaque situation a sa phrase, et elles diffèrent", () => {
  const dites = Object.values(SITUATION).map((verdict) => PHRASES_DE_LA_SITUATION[verdict]);

  assert.equal(dites.filter(Boolean).length, Object.values(SITUATION).length);
  assert.equal(new Set(dites).size, dites.length);
});

/**
 * **Rien ne se verse directement.** Ce service décide et décrit ; il n'écrit
 * pas. Une situation créée dans le dos de quelqu'un serait la première chose du
 * produit que personne n'a signée.
 *
 * Ce qui se vérifie en l'exécutant : il ne touche pas ce qu'on lui donne, et il
 * rend deux fois la même chose. Un service qui écrirait quelque part ne
 * rendrait pas deux fois le même verdict sur la même entrée.
 */
test("le service décide sans rien écrire, ni au-dehors ni dans ce qu'on lui donne", () => {
  const sujets = ["s-1", "s-2"];
  const situations = [{ mode: "manual", title: "Autre" }];
  const avant = JSON.stringify({ sujets, situations });

  const premier = pour({ sujetsDuLabel: sujets, situations });
  const second = pour({ sujetsDuLabel: sujets, situations });

  assert.deepEqual(premier, second);
  assert.equal(JSON.stringify({ sujets, situations }), avant);

  // **Et rien n'est partagé d'un appel à l'autre.** Un objet retenu au niveau du
  // module serait modifié par le premier écran qui l'affiche, et le second
  // verrait la modification sans l'avoir demandée.
  assert.notEqual(premier.situation, second.situation);
  assert.notEqual(premier.situation.filter_definition, second.situation.filter_definition);
  assert.notEqual(premier.situation.filter_definition.labelIds,
    second.situation.filter_definition.labelIds);

  premier.situation.filter_definition.labelIds.push("volé");
  premier.situation.title = "renommée";
  const apres = pour({ sujetsDuLabel: sujets, situations }).situation;
  assert.deepEqual(apres.filter_definition.labelIds, ["cr chantier"]);
  assert.equal(apres.title, "CR chantier");
});
