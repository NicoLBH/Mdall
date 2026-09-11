import test from "node:test";
import assert from "node:assert/strict";

import {
  ETIQUETTE, etiquetteDuDocument, explicationDeLEtiquette, motDeLEtiquette
} from "./etiquette-du-document.js";

/* ── Le dépôt direct se voit ─────────────────────────────────────────────── */

/**
 * Le dépôt direct est un usage légitime — Mdall comme simple gestion
 * documentaire, ou l'échange d'une pièce sans l'engager. Mais un fichier qui
 * ressemble à tous les autres laisse croire qu'il compte comme les autres :
 * quelqu'un déposera son rapport de contrôle directement et croira le projet au
 * courant.
 */
test("un document déposé directement se dit hors mémoire", () => {
  const etiquette = etiquetteDuDocument({ corpusState: "accepted", propositionId: null });

  assert.equal(etiquette, ETIQUETTE.HORS_MEMOIRE);
  assert.equal(motDeLEtiquette(etiquette), "hors mémoire");
  assert.match(explicationDeLEtiquette(etiquette), /sans passer par une proposition/);
});

test("un document entré par une proposition ne porte aucun mot", () => {
  // Il est comme les autres : le dire serait du bruit sur chaque ligne.
  assert.equal(
    etiquetteDuDocument({ corpusState: "accepted", propositionId: "prop-1" }),
    ETIQUETTE.AUCUNE
  );
});

/* ── Deux absences, qui ne se lisent pas pareil ──────────────────────────── */

/**
 * « Hors corpus » l'emporte. Un document écarté n'est évidemment pas en mémoire
 * non plus ; afficher les deux ferait lire deux fois la même absence, alors que
 * sortir du corpus est la circonstance la plus lourde — et celle qu'on veut
 * voir.
 */
test("un document écarté du corpus le dit, et cela prime", () => {
  const etiquette = etiquetteDuDocument({ corpusState: "refused", propositionId: null });

  assert.equal(etiquette, ETIQUETTE.HORS_CORPUS);
  assert.equal(motDeLEtiquette(etiquette), "hors corpus");
});

test("un document écarté qui venait d'une proposition le dit aussi", () => {
  assert.equal(
    etiquetteDuDocument({ corpusState: "refused", propositionId: "prop-1" }),
    ETIQUETTE.HORS_CORPUS
  );
});

/* ── Ne pas savoir n'est pas « il n'y a rien » ───────────────────────────── */

/**
 * **Règle 5.** Il y a plusieurs lectures de la table des documents, et toutes ne
 * demandent pas la colonne du rattachement. Rabattre `undefined` sur « aucune
 * proposition » ferait étiqueter un dossier entier sur une colonne qu'on n'a pas
 * lue — et le mot serait faux sur chaque ligne.
 */
test("une lecture qui n'a pas demandé le rattachement reste muette", () => {
  assert.equal(etiquetteDuDocument({ corpusState: "accepted" }), ETIQUETTE.AUCUNE);
});

test("null et undefined ne disent pas la même chose", () => {
  assert.equal(etiquetteDuDocument({ propositionId: null }), ETIQUETTE.HORS_MEMOIRE);
  assert.equal(etiquetteDuDocument({ propositionId: undefined }), ETIQUETTE.AUCUNE);
});

test("sans document, rien à dire", () => {
  assert.equal(etiquetteDuDocument(null), ETIQUETTE.AUCUNE);
  assert.equal(motDeLEtiquette(ETIQUETTE.AUCUNE), "");
});

/* ── Le vocabulaire ──────────────────────────────────────────────────────── */

test("aucun mot de l'arborescence ne parle comme un outil de visa", () => {
  // Règle 12 : le mot du métier reste dans le code, jamais à l'écran.
  for (const cle of Object.values(ETIQUETTE)) {
    const dit = `${motDeLEtiquette(cle)} ${explicationDeLEtiquette(cle)}`;
    for (const interdit of [/visa/i, /à valider/i, /approbation/i, /en attente de/i]) {
      assert.doesNotMatch(dit, interdit, `« ${dit.trim()} » emploie ${interdit}`);
    }
  }
});

/**
 * « Hors mémoire » ne doit pas se lire comme un reproche : c'est un choix fait
 * au dépôt, et il a deux bonnes raisons. L'explication le dit.
 */
test("l'explication d'un dépôt direct ne le présente pas comme un défaut", () => {
  const dit = explicationDeLEtiquette(ETIQUETTE.HORS_MEMOIRE);

  assert.match(dit, /se range, se lit et se partage/);
  for (const interdit of [/erreur/i, /oubli/i, /il faudrait/i, /manque/i]) {
    assert.doesNotMatch(dit, interdit);
  }
});
