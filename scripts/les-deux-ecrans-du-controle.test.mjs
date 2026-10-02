/**
 * **Les deux écrans du bureau de contrôle, et ce qu'ils se doivent.**
 *
 * ## Les deux défauts que ce banc existe pour attraper
 *
 * Aucun des deux ne lève, aucun ne s'affiche de travers. Tous deux rendent un
 * écran **vide**, et un écran vide se lit « ce chantier n'a rien ».
 *
 * 1. **Le relevé des avis partait dans la mauvaise forme.** `extract-avis`
 *    rendait `title_raw` et `value.opinion_raw` ; la lecture cherchait
 *    `intitule`, `reference` et `teneur`. Tous les avis d'un rapport étaient
 *    jetés en silence — et le rapport y perdait aussi sa référence et sa date
 *    d'émission, donc sa place dans la chronologie.
 * 2. **Le suivi composait son corpus avant d'avoir lu les lectures.** Elles
 *    étaient relues juste après, et le corpus se faisait donc sans aucun des
 *    rapports entrés par Analyse de documents : chronologie, retour arrière,
 *    jalons, complétude et indicateurs ne se dessinaient jamais.
 *
 * ## Pourquoi on relit la source
 *
 * Le premier se joue — `apps/web/js/services/les-avis-du-serveur.test.mjs` branche
 * la sortie du serveur sur l'entrée de la lecture. Le second est **un ordre
 * d'instructions dans une fonction asynchrone d'un écran de 5 500 lignes** :
 * l'inverser ne change aucune signature, ne lève pas, et ne se voit qu'en
 * production, sur un chantier qui a des lectures. Il n'y a pas d'autre prise que
 * le texte, et c'est le cas précis où cela se justifie.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lire = (chemin) => readFileSync(path.join(RACINE, chemin), "utf8");

const LE_SUIVI = lire("apps/web/js/views/studio/dev/ct-continuity-lab.js");
const EXTRACTION = lire("supabase/functions/extract-avis/index.ts");

/* ── Le relevé des avis sort dans la forme du document ────────────────────── */

test("extract-avis rend les avis tels qu'ils ont été lus", () => {
  // `retenus` est ce que la porte a vérifié, dans les mots du document. La forme
  // du moteur part à côté, sous son propre nom, pour ceux qui la lisent.
  assert.match(EXTRACTION, /\n\s*avis: retenus,/,
    "les avis repartent dans une forme que la lecture ne sait pas lire");
  assert.match(EXTRACTION, /avis_moteur: avisAuFormatDuMoteur\(retenus, \{ sourceId \}\)/,
    "le versement du suivi perd sa forme : les deux doivent sortir du même relevé");
});

test("la lecture d'un rapport reçoit ce que la porte a écarté", () => {
  const fonction = lire("supabase/functions/lire-les-rapports/index.ts");

  // Sans ce nombre, un rapport dont tous les avis ont été écartés s'affiche
  // « Aucun avis relevé » : on prête le silence au document (règle 5).
  assert.match(fonction, /const ecartes = Array\.isArray\(rendu\?\.ecartes\) \? rendu\.ecartes\.length : 0;/);
  assert.match(fonction, /return \{ ok: false, motif: "rien-de-verifie", ecartes \};/,
    "un relevé dont tout a été écarté passe pour un relevé vide");
});

/* ── Le suivi compose son corpus après avoir lu les lectures ──────────────── */

test("le suivi lit les lectures avant de composer son corpus", () => {
  const ouLectures = LE_SUIVI.indexOf("await relireLesLectures(projectId);");
  const ouCorpus = LE_SUIVI.indexOf("await refreshStoredDocuments(projectId);");

  assert.ok(ouLectures !== -1 && ouCorpus !== -1, "la séquence de démarrage est introuvable");
  assert.ok(ouLectures < ouCorpus,
    "le corpus se compose sans les lectures : aucun rapport d'Analyse de documents n'y entrera");
});

test("le corpus du suivi vient du module qui le décide, et des deux portes", () => {
  assert.match(LE_SUIVI, /import \{ leCorpusDuSuivi, phraseDuCorpus \} from "\.\.\/\.\.\/\.\.\/services\/le-corpus-du-suivi\.js"/);
  assert.match(LE_SUIVI, /leCorpusDuSuivi\(\{\s*\n?\s*parLaFamille, lectures: state\.lectures \?\? \[\], documentsDuProjet\s*\n?\s*\}\)/,
    "le corpus ne reçoit pas les lectures : il ne verra que l'ancienne porte");

  // Et les deux requêtes partent : celle de la famille, et celle de tous les
  // documents du projet où retrouver ceux qu'une lecture nomme.
  assert.match(LE_SUIVI, /listProjectDocuments\(projectId, \{ kind: CT_REPORT_KIND, corpusState: "accepted" \}\)/);
  assert.match(LE_SUIVI, /listProjectDocuments\(projectId, \{ corpusState: "accepted" \}\)/);
});

test("le suivi dit d'où vient son lot", () => {
  // « 7 rapports » ne dit pas s'il en manque ; savoir par quelle porte chacun
  // est entré permet d'aller chercher les autres.
  assert.match(LE_SUIVI, /phraseDuCorpus\(state\.stored\?\.corpus\)/);
});

/* ── Les deux écrans se renvoient l'un à l'autre ──────────────────────────── */

test("chaque écran sait mener à l'autre", () => {
  const detail = lire("apps/web/js/views/ui/les-rapports-lus.js");

  assert.match(detail, /data-side-nav-target="dev-ct-continuity-lab"/,
    "depuis un rapport lu, on n'atteint pas le suivi du dossier");
  assert.match(LE_SUIVI, /data-side-nav-target="dev-lecture-cr"/,
    "depuis le suivi, on n'atteint pas la lecture d'un rapport");
});

test("les deux cibles existent au catalogue de l'Atelier", () => {
  // **Un `data-side-nav-target` qui ne désigne aucun panneau ne fait rien**, sans
  // lever ni le dire : le bouton paraît cassé, et l'on ne sait pas pourquoi.
  const studio = lire("apps/web/js/views/project-studio.js");

  for (const cible of ["dev-ct-continuity-lab", "dev-lecture-cr"]) {
    assert.match(studio, new RegExp(`data-side-nav-panel="${cible}"`), `${cible} n'a pas de panneau`);
  }
});
