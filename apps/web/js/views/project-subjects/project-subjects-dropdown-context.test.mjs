import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const eventsSource = fs.readFileSync(path.resolve(__dirname, "./project-subjects-events.js"), "utf8");
const stateSource = fs.readFileSync(path.resolve(__dirname, "./project-subjects-state.js"), "utf8");
const dropdownControllerSource = fs.readFileSync(path.resolve(__dirname, "../ui/select-dropdown-controller.js"), "utf8");
const actionsSource = fs.readFileSync(path.resolve(__dirname, "./project-subjects-actions.js"), "utf8");
const subjectsIndexSource = fs.readFileSync(path.resolve(__dirname, "../project-subjects.js"), "utf8");

test("subjectMetaDropdown stocke un contexte explicite (scope + subjectId)", () => {
  assert.match(stateSource, /scope:\s*""/);
  assert.match(stateSource, /scopeHost:\s*"main"/);
  assert.match(stateSource, /subjectId:\s*""/);
  assert.match(stateSource, /anchorKey:\s*""/);
  assert.match(stateSource, /instanceKey:\s*""/);
});

test("les ouvertures de dropdown méta fournissent scope et subjectId explicites", () => {
  assert.match(eventsSource, /openMeta\(\{\s*field,\s*scope,\s*scopeHost,\s*subjectId:\s*targetSubjectId,[\s\S]*anchorKey,[\s\S]*instanceKey/s);
  assert.match(eventsSource, /openMeta\(\{\s*field:\s*"subissue-actions",\s*scope,\s*scopeHost,\s*subjectId:\s*targetSubjectId,[\s\S]*anchorKey,[\s\S]*instanceKey/s);
});

test("les actions dropdown utilisent le sujet du contexte explicite", () => {
  assert.match(eventsSource, /function getDropdownContextSubject\(root, options = \{\}\)/);
  assert.match(eventsSource, /const targetSubject = getDropdownContextSubject\(root\);/);
  assert.doesNotMatch(eventsSource, /toggleSubjectObjective\(subjectSelection\.item\.id/);
  assert.doesNotMatch(eventsSource, /toggleSubjectSituation\(subjectSelection\.item\.id/);
  assert.doesNotMatch(eventsSource, /toggleSubjectLabel\(subjectSelection\.item\.id/);
  assert.doesNotMatch(eventsSource, /toggleSubjectAssignee\(subjectSelection\.item\.id/);
});

test("le contrôleur dropdown conserve le subjectId explicite pendant la session", () => {
  assert.match(dropdownControllerSource, /dropdown\.subjectId = String\(subjectId \|\| ""\);/);
  assert.match(dropdownControllerSource, /dropdown\.subjectId = "";/);
  assert.match(dropdownControllerSource, /dropdown\.anchorKey = String\(anchorKey \|\| ""\)\.trim\(\)/);
  assert.match(dropdownControllerSource, /dropdown\.anchorKey = "";/);
  assert.match(dropdownControllerSource, /const explicitSubjectId = String\(viewState\.subjectMetaDropdown\?\.subjectId \|\| ""\)\.trim\(\);/);
});

test("setSubjectLabels écrit aussi pour un sujet persistant", () => {
  assert.match(actionsSource, /if \(subjectKey !== DRAFT_SUBJECT_ID\) \{/);
  assert.match(actionsSource, /bucket\.subjectMeta\.sujet\[subjectKey\] = \{/);
  assert.match(actionsSource, /labels:\s*nextLabels/);
});

/**
 * **Un garde-fou faible, et qui s'assume.**
 *
 * `DRAFT_SUBJECT_ID` ne sert que dans `getDropdownContextSubject`, qui n'est pas
 * exportée : rien, depuis l'extérieur du module, ne permet de vérifier qu'il est
 * employé. Ce test lit donc la source — ce qu'on s'interdit partout ailleurs,
 * parce qu'un test qui lit du texte passe alors même que la valeur ne sert à
 * rien.
 *
 * Il est gardé parce qu'un appel qui perdrait cette clé ferait écrire des labels
 * sur un sujet qui n'existe pas encore, et que le remplacer par un test qui
 * n'assert rien serait pire que le garder tel quel. La cherchant **n'importe où**
 * dans l'appel, il ne se casse plus sur l'ordre des clés — ce qu'il faisait.
 *
 * Ce qui le remplacerait vraiment : exporter la résolution du contexte, et
 * l'exécuter. Noté dans `docs/a-traiter-plus-tard.md`.
 */
test("l'écran passe son DRAFT_SUBJECT_ID aux événements", () => {
  const appel = subjectsIndexSource.slice(subjectsIndexSource.indexOf("createProjectSubjectsEvents({"));
  assert.match(appel.slice(0, appel.indexOf("\n});")), /^\s*DRAFT_SUBJECT_ID,\s*$/m);
});
