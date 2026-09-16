import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const situationsPath = path.resolve(__dirname, "./project-situations.js");
const situationsSource = fs.readFileSync(situationsPath, "utf8");

/**
 * **Le compactage du bandeau d'onglets a quitté cet écran.**
 *
 * Sur un onglet d'un projet, faire défiler escamote l'en-tête et réduit la barre
 * d'onglets. Cela demandait de savoir **quelle boîte** défile parmi les colonnes
 * d'un kanban : un résolveur, une source active, des écoutes de molette et de
 * doigt posées avant le défilement.
 *
 * Les situations sont sorties du giron d'un projet : cet écran n'a plus de barre
 * d'onglets à compacter. Il restait la machinerie, et **elle se voyait quand
 * même** — on faisait défiler le kanban ou le tableau, et le haut de l'écran
 * sautait pour réduire une barre qui n'était plus là.
 *
 * Ces garde-fous gardaient la machinerie. Ils gardent maintenant son absence :
 * une machinerie qu'on remet sans le vouloir est précisément ce qui arrive quand
 * on recopie le montage d'un écran voisin.
 */
test("la vue Situations ne compacte rien", () => {
  assert.match(
    situationsSource, /setProjectCompactEnabled\(false\)/,
    "le compactage est désactivé, et non piloté"
  );
  assert.doesNotMatch(
    situationsSource, /setProjectCompactEnabled\(true\)/,
    "et rien ne le rallume"
  );
});

/**
 * **Rien ne déclare plus de source de défilement.** C'était le seul rôle de ces
 * portes : dire au compactage quelle boîte regarder. Sans lui, elles posent un
 * état que personne ne lit — et la première qui reviendrait rallumerait le tout.
 */
test("la vue Situations ne déclare plus de source de défilement", () => {
  for (const porte of [
    "registerProjectScrollSources",
    "setProjectActiveScrollSource",
    "clearProjectActiveScrollSource",
    "syncProjectShellCompactFromScrollSource",
    "resolveKanbanScrollableSource"
  ]) {
    assert.doesNotMatch(situationsSource, new RegExp(porte), `${porte} a quitté l'écran`);
  }
});

/**
 * **Ce qui reste est autre chose** : les colonnes du kanban doivent savoir
 * jusqu'où descendre. La hauteur disponible se recalcule au défilement d'une
 * colonne, et c'est la seule raison d'écouter encore.
 */
test("la hauteur disponible se recalcule encore au défilement", () => {
  assert.match(
    situationsSource,
    /addEventListener\("scroll", onKanbanScroll[\s\S]{0,80}/,
    "le défilement d'une colonne est écouté"
  );
  assert.match(
    situationsSource, /const onKanbanScroll = \(\) => syncSituationsAvailableHeight\(root\);/,
    "et il ne fait plus que recalculer la hauteur"
  );
});

test("la vue Situations transmet les dépendances sous-sujet partagées aux events", () => {
  assert.match(situationsSource, /openSharedCreateSubissueModal:\s*\(\.\.\.args\)\s*=>\s*openSharedCreateSubissueModal\(\.\.\.args\)/);
  assert.match(situationsSource, /linkExistingSubjectAsSubissueFromSharedDropdown:\s*\(\.\.\.args\)\s*=>\s*linkExistingSubjectAsSubissueFromSharedDropdown\(\.\.\.args\)/);
});
