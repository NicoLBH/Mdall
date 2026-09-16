/**
 * Ce que l'écran des situations fait quand on clique, **exécuté**.
 *
 * ## Pourquoi ce fichier existe
 *
 * Deux gestes levaient chez l'utilisateur, et pas chez nous : ouvrir une entrée
 * du rail, et enregistrer une situation. Même cause les deux fois —
 * `ReferenceError: safeArray is not defined`, un nom employé sans être ni
 * déclaré ni importé, recopié d'un module voisin où il est une dépendance.
 *
 * Un nom libre ne se voit pas dans une lecture de source : le mot est là, il
 * ressemble à un appel. `node --check` ne le voit pas non plus, la syntaxe est
 * correcte. **Seule l'exécution le voit.**
 *
 * Les gestes qui n'ont pas besoin d'un document s'exécutent donc ici, avec de
 * fausses portes. `bindEvents` en demande un et reste dehors ; ce qu'il appelle,
 * lui, est à portée.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { createProjectSituationsEvents } from "./project-situations-events.js";
import { champsDesSujets } from "../../services/champs-des-sujets.js";
import { compositionNeuve } from "../../services/situation-en-composition.js";

const MOI = "u-1";
const CHAMPS = champsDesSujets({ personnes: [{ id: MOI, name: "A. Martin" }] });

const MA_SITUATION = {
  id: "s-1", title: "Ma semaine", status: "open", requete: "priorité:haute"
};

/** Les portes sont fausses et comptées : on voit ce qui est appelé. */
function gestes({ situations = [MA_SITUATION], creation = { id: "neuve" } } = {}) {
  const appels = [];
  const store = {
    currentProjectId: null,
    user: { id: MOI },
    situationsView: { data: situations, selectedSituationId: null }
  };
  const uiState = { situationEnCours: null, situationEnCoursErreur: "", situationEnCoursGarde: "" };

  const portes = createProjectSituationsEvents({
    store,
    uiState,
    champsDeLEcran: () => CHAMPS,
    rerender: () => appels.push("rerender"),
    refreshSituationsData: async () => appels.push("refresh"),
    createSituationRecord: async (charge) => {
      appels.push(`creer:${charge.title}`);
      return creation;
    },
    updateSituationRecord: async (id, charge) => {
      appels.push(`modifier:${id}:${"au_rail" in charge ? `rail=${charge.au_rail}` : charge.title}`);
      return { id };
    },
    supprimerLaSituation: async (id) => appels.push(`effacer:${id}`),
    repriseDeLAncienFiltre: () => null,
    setSelectedSituationId: (id) => appels.push(`selection:${id}`),
    getSituationById: (id) => situations.find((situation) => situation.id === id) || null,
    loadSituationSelection: async () => [],
    loadSituationInsightsData: async () => ({})
  });

  return { portes, appels, store, uiState };
}

/* ── Cliquer une entrée du rail ──────────────────────────────────────────── */

/**
 * **C'est le geste qui levait.** Chaque entrée du rail porte la requête de ce
 * qu'elle ouvre ; on retrouve la situation par cette requête, et non par son
 * rang — le rail mêle les lectures et mes situations, et compter les entrées
 * ferait dépendre le clic de l'ordre d'affichage (règle 4).
 */
test("une entrée du rail retrouve la situation qu'elle porte", () => {
  const { portes } = gestes();

  assert.equal(portes.situationQuiPorte("priorité:haute")?.id, "s-1", "l'une des miennes");
  assert.equal(portes.situationQuiPorte("assigné:moi")?.title, "Assigné à moi", "ou une lecture");
  assert.equal(portes.situationQuiPorte("label:zoiseau"), null, "et rien quand rien ne répond");
});

/** Sans requête, c'est la première entrée : la liste, pas une situation. */
test("la première entrée du rail n'ouvre aucune situation", () => {
  const { portes } = gestes();

  assert.equal(portes.situationQuiPorte(""), null);
  assert.equal(portes.situationQuiPorte("   "), null);
});

/**
 * **Une liste de situations illisible ne fait pas lever le clic.** Elle vient
 * de la base ; une lecture ratée peut rendre autre chose qu'un tableau, et le
 * rail doit continuer de répondre (règle 5).
 */
test("une liste illisible ne fait pas lever le rail", () => {
  for (const illisible of [null, undefined, {}, "", { error: "boom" }]) {
    const { portes } = gestes({ situations: illisible });
    assert.equal(portes.situationQuiPorte("assigné:moi")?.title, "Assigné à moi");
  }
});

/* ── Enregistrer une situation ───────────────────────────────────────────── */

/** **Le second geste qui levait**, au moment de vérifier les homonymes. */
test("enregistrer une situation neuve la crée et l'ouvre", async () => {
  const { portes, appels, uiState } = gestes();
  uiState.situationEnCours = {
    ...compositionNeuve(), nom: "Les urgences", requete: "priorité:critique"
  };

  await portes.enregistrerLaComposition({});

  assert.ok(appels.includes("creer:Les urgences"), "elle part en base");
  assert.ok(appels.includes("selection:neuve"), "et on l'ouvre");
  assert.equal(uiState.situationEnCours, null, "le formulaire se referme");
});

/** Modifier passe par la même porte, avec l'identifiant en plus. */
test("modifier une situation écrit sur elle", async () => {
  const { portes, appels, uiState } = gestes();
  uiState.situationEnCours = {
    ...compositionNeuve(), id: "s-1", nom: "Ma semaine", requete: "priorité:haute"
  };

  await portes.enregistrerLaComposition({});

  assert.ok(appels.includes("modifier:s-1:Ma semaine"), "sur elle, et pas une de plus");
  assert.ok(!appels.some((appel) => appel.startsWith("creer:")));
});

/**
 * **Le refus se décide dans le service, l'écran le montre.** Un homonyme est
 * cherché parmi mes situations — celles-là mêmes que la liste illisible
 * pouvait faire lever.
 */
test("une situation qui porte un nom déjà pris est refusée", async () => {
  const { portes, appels, uiState } = gestes();
  uiState.situationEnCours = {
    ...compositionNeuve(), nom: "ma SEMAINE", requete: "label:x"
  };

  await portes.enregistrerLaComposition({});

  assert.equal(uiState.situationEnCoursErreur, "deja_la");
  assert.ok(!appels.some((appel) => appel.startsWith("creer:")), "rien n'est écrit");
  assert.ok(uiState.situationEnCours, "et ce qu'on a écrit reste");
});

/** Une requête vide ne s'enregistre pas : elle ne montrerait rien. */
test("une situation sans requête est refusée", async () => {
  const { portes, uiState } = gestes();
  uiState.situationEnCours = { ...compositionNeuve(), nom: "Sans rien" };

  await portes.enregistrerLaComposition({});

  assert.equal(uiState.situationEnCoursErreur, "sans_requete");
});

/* ── Épingler, et effacer ────────────────────────────────────────────────── */

/**
 * **Le rail est court.** Une situation y monte quand on l'y met, et pas parce
 * qu'elle existe : c'est la règle que les vues portent déjà, et un carnet de
 * vingt-six situations en montre l'utilité.
 */
test("épingler une situation la pose au rail, et re-cliquer l'en retire", async () => {
  const posee = gestes();
  await posee.portes.basculerLEpingle({}, "s-1");
  assert.ok(posee.appels.includes("modifier:s-1:rail=true"), "elle monte au rail");

  const retiree = gestes({ situations: [{ ...MA_SITUATION, au_rail: true }] });
  await retiree.portes.basculerLEpingle({}, "s-1");
  assert.ok(retiree.appels.includes("modifier:s-1:rail=false"), "et elle en redescend");
});

/** Le menu se referme : le laisser ouvert fait douter d'avoir cliqué. */
test("le menu se referme quand on épingle", async () => {
  const { portes, uiState } = gestes();
  uiState.menuDeLaSituation = "s-1";

  await portes.basculerLEpingle({}, "s-1");

  assert.equal(uiState.menuDeLaSituation, "");
});

/**
 * **On demande avant, en nommant ce qui part.** Une situation porte une façon
 * de travailler ; la perdre sans l'avoir dit serait pire que de la garder.
 */
test("effacer demande confirmation, et renonce si on dit non", async () => {
  const demandes = [];
  const avant = globalThis.window;
  globalThis.window = { confirm: (question) => { demandes.push(question); return false; } };

  try {
    const { portes, appels } = gestes();
    await portes.effacerLaSituation({}, "s-1");

    assert.equal(demandes.length, 1, "on demande");
    assert.match(demandes[0], /Ma semaine/, "en nommant ce qui part");
    assert.match(demandes[0], /sujets .* restent dans leurs projets/,
      "et en disant ce qui ne part pas");
    assert.ok(!appels.some((appel) => appel.startsWith("effacer:")), "et rien n'est effacé");
  } finally {
    globalThis.window = avant;
  }
});

/** Et si l'on dit oui, elle part — et l'on ne reste pas sur son détail. */
test("effacer retire la situation et quitte son détail", async () => {
  const avant = globalThis.window;
  globalThis.window = { confirm: () => true };

  try {
    const { portes, appels, store } = gestes();
    store.situationsView.selectedSituationId = "s-1";

    await portes.effacerLaSituation({}, "s-1");

    assert.ok(appels.includes("effacer:s-1"));
    assert.ok(appels.includes("selection:null"), "on ne reste pas sur ce qui n'existe plus");
    assert.ok(appels.includes("refresh"), "et la liste se relit");
  } finally {
    globalThis.window = avant;
  }
});

/** Une situation qu'on ne trouve pas ne fait rien lever, et ne demande rien. */
test("un geste sur une situation inconnue ne fait rien", async () => {
  const { portes, appels } = gestes();

  await portes.basculerLEpingle({}, "zoiseau");
  await portes.effacerLaSituation({}, "zoiseau");

  assert.deepEqual(appels, []);
});
