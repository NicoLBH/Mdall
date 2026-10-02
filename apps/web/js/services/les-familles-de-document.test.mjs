/**
 * Le registre des familles : la clé est le geste, et tout en découle.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  CE_QUE_DIT_LA_FAMILLE, FAMILLE, LA_FONCTION_DU_GESTE, LES_FAMILLES, TOUTES,
  ceQueDitLaFamille, laFamilleQuiSeLit, leCompteDit, leGesteDeLaLigne
} from "./les-familles-de-document.js";

test("la clé d'une famille est son geste, celui de la file", () => {
  // `mails` est le défaut que la base pose depuis le premier jour, et
  // `comptes_rendus` celui que la file des CR emploie. Les renommer pour faire
  // joli aurait rendu muettes les lignes déjà posées.
  assert.equal(FAMILLE.MAIL, "mails");
  assert.equal(FAMILLE.CR, "comptes_rendus");
  assert.equal(FAMILLE.CONTROLE, "rapports");
});

test("chaque famille déclare ce qu'il faut pour la lire", () => {
  for (const famille of LES_FAMILLES) {
    const ce = CE_QUE_DIT_LA_FAMILLE[famille];
    assert.ok(ce.nom && ce.titre && ce.icone, famille);
    assert.ok(ce.quoi?.un && ce.quoi?.plusieurs, famille);
    assert.ok(ce.vide?.titre && ce.vide?.quoi, famille);
    // Les trois pièces sans lesquelles une famille ne se lit pas.
    assert.ok(ce.fonction, `${famille} : aucune fonction de bord`);
    assert.ok(ce.accepte, `${famille} : rien d'accepté au choix`);
    assert.ok(ce.laLectureEstGardeeDans, `${famille} : aucune table`);
  }
});

test("la vue d'ensemble n'est pas une famille qui se lit", () => {
  // Elle n'a ni fonction de bord ni table : lui demander une lecture poserait une
  // ligne de file qu'aucun serveur ne prendrait (règle 5).
  assert.equal(laFamilleQuiSeLit(TOUTES), null);
  assert.ok(ceQueDitLaFamille(TOUTES));
  for (const famille of LES_FAMILLES) assert.ok(laFamilleQuiSeLit(famille), famille);
});

test("la table des fonctions vient du registre, et chacune existe", () => {
  assert.deepEqual(Object.keys(LA_FONCTION_DU_GESTE).sort(), [...LES_FAMILLES].sort());

  for (const [geste, fonction] of Object.entries(LA_FONCTION_DU_GESTE)) {
    const ou = fileURLToPath(
      new URL(`../../../../supabase/functions/${fonction}/index.ts`, import.meta.url));
    assert.ok(existsSync(ou), `${geste} : la fonction « ${fonction} » n'existe pas`);
  }
});

test("chaque famille compte dans ses propres mots", () => {
  // « 2 tous les documents analysés » ne se dit pas, et « 2 comptes rendus »
  // serait faux dès qu'un mail s'y ajoute.
  assert.equal(leCompteDit(TOUTES, 2), "2 documents analysés");
  assert.equal(leCompteDit(FAMILLE.MAIL, 1), "1 fil analysé");
  assert.equal(leCompteDit(FAMILLE.CONTROLE, 3), "3 rapports analysés");
  assert.equal(leCompteDit(FAMILLE.CR, 1), "1 compte rendu analysé");
  assert.equal(leCompteDit(FAMILLE.CR, 0), "0 compte rendu analysé");
  assert.equal(leCompteDit("inconnue", 2), "");
});

test("un geste absent vaut les mails, un geste inconnu reste lui-même", () => {
  // Les lignes posées avant que la colonne existe sont des dépôts de messagerie :
  // c'est ce que son défaut déclare. Mais une ligne d'un geste qu'on ne sert pas
  // encore ne doit pas être traitée comme un dépôt de mails (règle 5).
  assert.equal(leGesteDeLaLigne({}), FAMILLE.MAIL);
  assert.equal(leGesteDeLaLigne(null), FAMILLE.MAIL);
  assert.equal(leGesteDeLaLigne({ geste: FAMILLE.CONTROLE }), FAMILLE.CONTROLE);
  assert.equal(leGesteDeLaLigne({ geste: "plans" }), "plans");
});

test("une famille inconnue n'est pas inventée", () => {
  assert.equal(ceQueDitLaFamille("plans"), null);
  assert.equal(ceQueDitLaFamille(""), null);
});

/**
 * **Les icônes existent dans la planche.**
 *
 * Une icône absente ne lève pas : elle laisse un vide à la place, et le rail garde
 * son alignement. Rien ne le signale.
 */
test("chaque famille porte une icône qui existe", async () => {
  const { readFileSync } = await import("node:fs");
  const planche = readFileSync(
    fileURLToPath(new URL("../../assets/icons.svg", import.meta.url)), "utf8");

  for (const famille of [TOUTES, ...LES_FAMILLES]) {
    const nom = CE_QUE_DIT_LA_FAMILLE[famille].icone;
    assert.ok(planche.includes(`id="${nom}"`), `${famille} : l'icône « ${nom} » n'existe pas`);
  }
});
