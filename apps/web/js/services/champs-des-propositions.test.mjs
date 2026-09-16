/**
 * La grammaire des propositions.
 *
 * ## Ce que ces gardes attrapent
 *
 * Un champ déclaré sans valeurs propose un filtre qui ne retient jamais rien :
 * on cherche alors ce qu'on a mal tapé plutôt que ce qui n'existe pas. Et un
 * filtre qu'on ne peut pas appliquer — « moi » sans savoir qui regarde — doit
 * s'**annoncer**, pas vider la liste : une liste vide fait croire qu'on n'a
 * aucune proposition.
 *
 * Les deux défauts sont muets. Ils s'exécutent ici.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  ETATS, champsDesPropositions, etatRegarde, propositionsFiltrees,
  requeteAvecLEtat, requeteDeDepartDesPropositions
} from "./champs-des-propositions.js";
import { PROPOSITION } from "./proposition-state.js";

const MOI = "u-1";

const PERSONNES = [
  { id: MOI, name: "Ourdine Ferrand" },
  { id: "u-2", name: "A. Martin" }
];

const PROJETS = [{ id: "p-a", name: "NOVACLIM" }, { id: "p-b", name: "VERIFAS" }];

const NOMS = { "p-a": "NOVACLIM", "p-b": "VERIFAS" };

const PROPOSITIONS = [
  {
    id: "pr-1", title: "Reprise des fondations", project_id: "p-a",
    status: PROPOSITION.OPEN, created_by: MOI, documentCount: 4
  },
  {
    id: "pr-2", title: "Calepinage façade", project_id: "p-b",
    status: PROPOSITION.MERGED, created_by: "u-2", merged_by: MOI, documentCount: 0
  },
  {
    id: "pr-3", title: "Variante toiture", project_id: "p-b",
    status: PROPOSITION.CLOSED, created_by: "u-2", closed_by: "u-2", documentCount: 2
  }
];

const champs = champsDesPropositions({ personnes: PERSONNES, projets: PROJETS });

const titres = (requete, reste = {}) => propositionsFiltrees({
  propositions: PROPOSITIONS, requete, champs, moi: MOI, nomsDesProjets: NOMS, ...reste
}).propositions.map((proposition) => proposition.title);

/* ── Ce qui se déclare, et ce qui ne se déclare pas ──────────────────────── */

/**
 * **Une proposition n'a ni label, ni assigné, ni objectif, ni jalon.** Les
 * déclarer ferait proposer des filtres qui ne retiendraient jamais rien.
 */
test("seuls les champs qu'une proposition porte se déclarent", () => {
  const cles = champs.map((champ) => champ.key);

  assert.deepEqual(cles, ["statut", "documents", "auteur", "décideur", "projet"]);
  for (const absent of ["label", "assigné", "objectif", "lot", "mention"]) {
    assert.ok(!cles.includes(absent), `« ${absent} » n'existe pas sur une proposition`);
  }
});

/**
 * **Sans personne connue, ni « auteur » ni « décidée par » ne se déclarent.**
 * Un menu vide fait chercher ce qu'on a mal réglé.
 */
test("un champ sans vocabulaire ne se déclare pas", () => {
  const nues = champsDesPropositions().map((champ) => champ.key);

  assert.deepEqual(nues, ["statut", "documents"]);

  // Et le projet ne se déclare qu'à partir de deux : sur l'écran d'un seul, il
  // n'aurait qu'une valeur et ne retirerait jamais rien.
  const unSeul = champsDesPropositions({ projets: [PROJETS[0]] }).map((champ) => champ.key);
  assert.ok(!unSeul.includes("projet"));
});

/* ── Ce que la requête retient ───────────────────────────────────────────── */

test("les trois états se demandent, un par un ou ensemble", () => {
  assert.deepEqual(titres("statut:ouverte"), ["Reprise des fondations"]);
  assert.deepEqual(titres("statut:fusionnée"), ["Calepinage façade"]);
  assert.deepEqual(titres("statut:refusée"), ["Variante toiture"]);
  assert.deepEqual(
    titres("statut:fusionnée statut:refusée"),
    ["Calepinage façade", "Variante toiture"],
    "deux cochées veulent dire « ou »"
  );
});

test("l'auteur et le décideur ne sont pas la même personne", () => {
  assert.deepEqual(titres("auteur:moi"), ["Reprise des fondations"]);
  // **Celle que j'ai fusionnée n'est pas celle que j'ai ouverte.** Les deux se
  // confondent souvent et divergent toujours au moment où ça compte.
  assert.deepEqual(titres("décideur:moi"), ["Calepinage façade"]);
  assert.deepEqual(titres("auteur:a.-martin"), ["Calepinage façade", "Variante toiture"]);
});

test("« y a-t-il quelque chose dedans » se demande", () => {
  assert.deepEqual(titres("documents:non"), ["Calepinage façade"]);
  assert.deepEqual(titres("documents:oui"), ["Reprise des fondations", "Variante toiture"]);
});

test("le projet se demande, et le texte libre le cherche aussi", () => {
  assert.deepEqual(titres("projet:verifas"), ["Calepinage façade", "Variante toiture"]);
  assert.deepEqual(titres("novaclim"), ["Reprise des fondations"], "le nom du projet est à l'écran");
  assert.deepEqual(titres("toiture"), ["Variante toiture"]);
});

/**
 * **Un filtre qu'on ne peut pas appliquer s'annonce**, il n'est pas appliqué de
 * travers. `auteur:moi` sans savoir qui regarde rendrait une liste vide, et
 * l'on croirait n'avoir aucune proposition (règle 5).
 */
test("« moi » sans savoir qui regarde s'annonce, et ne vide rien", () => {
  const { propositions, ignores } = propositionsFiltrees({
    propositions: PROPOSITIONS, requete: "auteur:moi", champs, moi: "", nomsDesProjets: NOMS
  });

  assert.equal(propositions.length, 3, "la liste n'est pas restreinte là-dessus");
  assert.deepEqual(ignores, ["auteur"]);
});

/** Un jeton qu'aucun champ ne reconnaît reste du texte : rien n'est deviné. */
test("un jeton inconnu cherche le mot", () => {
  assert.deepEqual(titres("statut:zoiseau"), [], "le mot ne se trouve dans aucun titre");
  assert.deepEqual(titres("auteur:moi toiture"), [], "et le texte s'ajoute au filtre");
});

/* ── Le filtre de l'en-tête, et la requête de départ ─────────────────────── */

/**
 * **On part des ouvertes, et le jeton est dans la barre.** Un filtre par défaut
 * qu'on ne voit nulle part est un écran qui ment sur ce qu'il montre — et il
 * vient de la grammaire, sans quoi le renommer un jour le désactiverait en
 * silence (règle 10).
 */
test("la requête de départ retient les ouvertes, et s'écrit", () => {
  const depart = requeteDeDepartDesPropositions();

  assert.equal(depart, "statut:ouverte");
  assert.equal(depart, `statut:${ETATS[0].token}`, "le jeton vient de la grammaire");
  assert.deepEqual(titres(depart), ["Reprise des fondations"]);
});

/**
 * **Deux boutons pour trois valeurs.** « Closes » en pose deux ; `statut:
 * fusionnée` seul n'allume **aucun** des deux, parce qu'allumer « Closes »
 * ferait croire qu'on voit aussi les refusées.
 */
test("l'en-tête ne s'allume que sur ce qu'il sait dire", () => {
  assert.equal(etatRegarde("statut:ouverte", champs), "open");
  assert.equal(etatRegarde("statut:fusionnée statut:refusée", champs), "closed");
  assert.equal(etatRegarde("statut:fusionnée", champs), "");
  assert.equal(etatRegarde("", champs), "");
  assert.equal(etatRegarde("toiture", champs), "");
});

test("le clic pose l'état dans la barre, et le reclic l'enlève", () => {
  const ouvertes = requeteAvecLEtat("", champs, "open");
  assert.equal(ouvertes, "statut:ouverte");

  const closes = requeteAvecLEtat(ouvertes, champs, "closed");
  assert.equal(closes, "statut:fusionnée statut:refusée");
  assert.ok(!closes.includes("ouverte"), "un seul des deux à la fois");

  assert.equal(requeteAvecLEtat(closes, champs, "closed"), "", "recliquer l'éteint");

  // **Le reste de la requête survit** : on cherchait quelque chose, on cherche
  // toujours la même chose.
  const avecDuTexte = requeteAvecLEtat("auteur:moi toiture", champs, "open");
  assert.match(avecDuTexte, /auteur:moi/);
  assert.match(avecDuTexte, /toiture/);
  assert.match(avecDuTexte, /statut:ouverte/);
});
