/**
 * Les colonnes d'un document : ce qu'aucun des deux écrans ne doit oublier.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  LES_COLONNES_DUN_DOCUMENT, LE_SELECT_DUN_DOCUMENT
} from "./les-colonnes-dun-document.js";

/**
 * **Le défaut que cette liste répare.** La lecture du projet entier avait perdu
 * `piece_du_message` : l'appariement des pièces d'un fil ne trouvait plus rien,
 * et chaque pastille sortait sans identifiant — c'est-à-dire en simple libellé,
 * qu'on clique sans effet.
 */
test("ce qui relie une pièce à son message est demandé", () => {
  for (const colonne of ["piece_du_message", "piece_dans_le_texte", "mail_quand"]) {
    assert.equal(LES_COLONNES_DUN_DOCUMENT.includes(colonne), true, colonne);
  }
});

test("les colonnes d'un mail sont toutes là", () => {
  for (const colonne of ["mail_de", "mail_objet", "mail_quand", "mail_pieces", "mail_fil"]) {
    assert.equal(LES_COLONNES_DUN_DOCUMENT.includes(colonne), true, colonne);
  }
});

/**
 * **Une colonne demandée deux fois est une colonne qu'on a ajoutée sans
 * regarder.** Elle ne casse rien, et elle dit que la liste n'est plus relue.
 */
test("aucune colonne n'est demandée deux fois", () => {
  assert.equal(new Set(LES_COLONNES_DUN_DOCUMENT).size, LES_COLONNES_DUN_DOCUMENT.length);
});

test("le select est la liste, séparée par des virgules", () => {
  assert.equal(LE_SELECT_DUN_DOCUMENT, LES_COLONNES_DUN_DOCUMENT.join(","));
  assert.doesNotMatch(LE_SELECT_DUN_DOCUMENT, /\s/, "PostgREST n'accepte pas d'espace");
});

/**
 * **Les trois lectures de `documents` demandent la même chose.**
 *
 * Elles écrivent toutes dans le même magasin. Elles écrivaient chacune leur
 * liste à la main, et la plus courte gagnait selon l'ordre d'arrivée : les
 * pièces jointes retrouvaient leur message, ou non, selon l'écran par lequel on
 * était passé. C'est le défaut précis et invisible pour lequel lire la source
 * en épreuve se justifie.
 */
test("aucune lecture de documents n'écrit sa liste de colonnes à la main", () => {
  const services = join(dirname(fileURLToPath(import.meta.url)));
  const aLaMain = [];

  for (const fichier of readdirSync(services).filter((un) => un.endsWith(".js"))) {
    const source = readFileSync(join(services, fichier), "utf8");
    for (const trouve of source.matchAll(/set\("select",\s*"([^"]*)"\)/g)) {
      // On ne regarde que les **lectures de la table** `documents`. Une liste
      // qui porte `documents(...)` est une jointure — les colonnes y sont entre
      // parenthèses, et c'est une autre table qu'on lit.
      if (/documents\(/.test(trouve[1])) continue;
      // `document_kind` n'appartient qu'à cette table, et toute lecture qui
      // remplit le magasin en a besoin : c'est ce qui distingue un vrai
      // `select` sur `documents` de celui d'une pièce de sujet, qui porte
      // `subject_id` et le même `storage_bucket`.
      if (!/(^|,)document_kind(,|$)/.test(trouve[1])) continue;
      aLaMain.push(`${fichier} : ${trouve[1].slice(0, 60)}…`);
    }
  }

  assert.deepEqual(aLaMain, [],
    "ces lectures nomment leurs colonnes au lieu de prendre LE_SELECT_DUN_DOCUMENT :\n"
    + aLaMain.join("\n"));
});
