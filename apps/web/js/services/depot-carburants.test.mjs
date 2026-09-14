/**
 * Le diff d'une proposition dit la même chose que le fichier.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { champsDuBloc, reperesDAffirmations } from "./depot-carburants.js";
import { fonctionAEcrire } from "./memoire-domiciles.js";



test("le diff écrit une fonction à agent comme le fichier l'écrit", () => {
  // Le défaut, vu dans une proposition fusionnée : le diff rendait
  // `fonction Prédimensionnement des fondations superficielles()` — pas de
  // signature, pas d'appel, pas d'`enregistre` — puis un `alors (11 massifs);`
  // que le fichier ne porte nulle part. Deux grammaires pour la même ligne.
  const champs = champsDuBloc({
    sujet: "Prédimensionnement des fondations superficielles",
    valeur: "11 massifs",
    referentiel: true,
    fonction: fonctionAEcrire({
      sujet: "Prédimensionnement des fondations superficielles",
      quoi: "Dimensionne les massifs superficiels d'une zone.",
      agent: {
        genre: "agent-D", utilitaire: "dimensionnement_fondations_superficielles", version: "V1",
        lit: ["Profondeur hors gel"],
        ecrit: [{ sujet: "Résultat du calcul des fondations superficielles" }]
      }
    }, new Map([["resultat du calcul des fondations superficielles", "memoire/structure.ctr"]]))
  });

  const texte = Object.values(champs).join("\n");
  assert.match(texte, /^fonction Prédimensionnement des fondations superficielles\(zones, Profondeur hors gel\)/m);
  assert.match(texte, /^ {3}résultat = agent-D \($/m);
  assert.match(texte, /^ {6}utilitaire: dimensionnement_fondations_superficielles,$/m);
  assert.match(texte, /^ {6}dans: memoire\/structure\.ctr,$/m);
  // Et surtout, plus la tête sans signature ni la conclusion d'une règle. Le
  // `alors` qui reste est celui du corps — « alors (X à retenir = X) » —, que
  // le fichier écrit aussi.
  assert.doesNotMatch(texte, /fondations superficielles\(\)/);
  assert.doesNotMatch(texte, /alors \(11 massifs\)/);
  assert.match(texte, /^ {3}alors \(Profondeur hors gel à retenir = Profondeur hors gel\)$/m);
});

test("le diff nomme le fichier que la mémoire crée, pas un autre", () => {
  // Il le recalculait depuis le seul `{nature, domaine}` de la ligne. Deux
  // réponses à la même question, et le diff pouvait annoncer un fichier que la
  // mémoire ne crée pas — jusqu'à `.mdall`, qui n'est l'extension de rien.
  const [repere] = reperesDAffirmations({ lignes: [{
    cle: "resultat", sujet: "Résultat du calcul des fondations superficielles",
    nature: "contrainte", domaine: "structure", avant: "", apres: "11 massifs",
    rangement: { chemin: ["Mémoire", "Structure"], extension: "ctr", fichier: "memoire/structure.ctr" }
  }] }).apres;

  assert.deepEqual(repere.chemin, ["Mémoire", "Structure"]);
  assert.equal(repere.extension, "ctr");
});

/* ── Le document au corpus ───────────────────────────────────────────────── */

/**
 * **Un fichier de mémoire se nomme comme la mémoire le nomme.**
 *
 * Sans extension, `cheminDeFichier` retombe sur `.mdall` — « personne ne s'est
 * prononcé » —, et le corpus s'annonçait `memoire/corpus.mdall` d'un fichier que
 * la mémoire appelle `.crp`.
 */
test("le corpus s'annonce sous le nom que la mémoire lui donne", async () => {
  const { reperesDeDocuments } = await import("./depot-carburants.js");
  const { apres } = reperesDeDocuments([
    { itemType: "document", itemKey: "doc-1", status: "accepted", payload: { name: "1824_CR_10.pdf" } }
  ]);

  assert.deepEqual(apres[0].chemin, ["Mémoire", "Corpus"]);
  assert.equal(apres[0].extension, "crp");
});

/**
 * **Le document se nomme, et dit ce qu'on en fait.**
 *
 * Sa seule ligne était « Nature = non reconnue » : un compte rendu de chantier
 * n'a pas de nature détectée, et le diff annonçait donc une absence au lieu
 * d'un document. On ne savait même pas duquel il s'agissait.
 */
test("le document au corpus se lit, et ce qu'on ignore ne s'écrit pas", async () => {
  const { reperesDeDocuments } = await import("./depot-carburants.js");
  const { apres } = reperesDeDocuments([
    { itemType: "document", itemKey: "doc-1", status: "accepted", payload: { name: "1824_CR_10.pdf" } }
  ]);

  assert.equal(apres[0].titre, "Document au corpus : 1824_CR_10.pdf");
  assert.match(apres[0].champs[""], /1824_CR_10\.pdf/);
  assert.match(apres[0].champs["statut"], /retenu/);
  // Ce qu'on ne sait pas ne s'écrit pas : pas de « non reconnue » (règle 5).
  assert.equal("nature" in apres[0].champs, false);
  assert.doesNotMatch(Object.values(apres[0].champs).join(" "), /non reconnue/);
});

/** Un livrable refusé sort au lieu d'entrer, et sa ligne le dit. */
test("un document écarté le dit dans son statut", async () => {
  const { reperesDeDocuments } = await import("./depot-carburants.js");
  const { avant } = reperesDeDocuments([
    { itemType: "document", itemKey: "doc-1", status: "refused", payload: { name: "R.pdf" } }
  ]);

  assert.match(avant[0].champs["statut"], /écarté/);
});
