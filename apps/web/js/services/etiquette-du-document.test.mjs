import test from "node:test";
import assert from "node:assert/strict";

import {
  ETIQUETTE, etiquetteDuDocument, explicationDeLEtiquette, motDeLEtiquette
} from "./etiquette-du-document.js";

/* ── Le dépôt direct se voit ─────────────────────────────────────────────── */

/**
 * La porte du dépôt direct est fermée, mais les documents qui sont entrés par
 * là existent. Le taire ferait mentir l'arborescence sur ce qui y est déjà :
 * quelqu'un ouvrirait un rapport déposé l'an dernier et croirait le projet au
 * courant.
 */
test("un document déposé directement se dit hors mémoire", () => {
  const etiquette = etiquetteDuDocument({ corpusState: "accepted", propositionId: null });

  assert.equal(etiquette, ETIQUETTE.HORS_MEMOIRE);
  assert.equal(motDeLEtiquette(etiquette), "hors mémoire");
  assert.match(explicationDeLEtiquette(etiquette), /rien de ce qu'il dit\s+n'est entré/);
});

/**
 * **Un document entré par une proposition le dit maintenant.**
 *
 * Il se taisait : il était comme les autres, et le dire aurait fait du bruit sur
 * chaque ligne. Le raisonnement ne tient plus depuis que cette ligne **décide
 * aussi de la visibilité** — un document entré en mémoire cesse d'être privé
 * (`202611110001_...`).
 *
 * Quelqu'un qui voit « Privé » disparaître d'une ligne doit pouvoir lire
 * pourquoi, sur cette ligne. Un changement de régime qui ne s'annonce pas est un
 * changement qu'on découvre en s'apercevant que l'équipe a vu.
 */
test("un document entré par une proposition dit qu'il est dans la mémoire", () => {
  assert.equal(
    etiquetteDuDocument({ corpusState: "accepted", propositionId: "prop-1" }),
    ETIQUETTE.EN_MEMOIRE
  );
  assert.equal(motDeLEtiquette(ETIQUETTE.EN_MEMOIRE), "dans la mémoire");
  // L'explication dit pourquoi il se partage : sans elle, le mot se lirait
  // comme un simple rangement.
  assert.match(explicationDeLEtiquette(ETIQUETTE.EN_MEMOIRE), /toute l'équipe/);
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
  // Ces documents sont entrés par une porte qui existait : ce n'est pas leur
  // faute qu'elle ait été fermée depuis.
  const dit = explicationDeLEtiquette(ETIQUETTE.HORS_MEMOIRE);

  assert.match(dit, /se range, se lit et se partage/);
  for (const interdit of [/erreur/i, /oubli/i, /il faudrait/i, /manque/i]) {
    assert.doesNotMatch(dit, interdit);
  }
});

/**
 * La porte est fermée : plus aucun nouveau document ne peut être « hors
 * mémoire ». Ce test garde l'écran de dépôt, pas l'étiquette.
 */
test("l'écran de dépôt ne propose plus le dépôt direct", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const source = readFileSync(
    fileURLToPath(new URL("../views/project-documents.js", import.meta.url)), "utf8"
  );

  assert.doesNotMatch(source, /Déposer directement dans le projet/);
  assert.doesNotMatch(source, /choix\("direct"/);
});
