import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { EXTENSIONS_ECRITES } from "./fichier-a-la-main.js";
import {
  EXTENSIONS_LISIBLES, LECTURE_DU_TEXTE, estUnFichierTexte, laRestitutionDunTexte, leFichierLu,
  lectureParDefaut, lecturesDuFichier, nomDuFichier, pagesDuTexte, pagesLuesDuTexte,
  phraseDuFichier, seRendEnMarkdown
} from "./lire-un-fichier-texte.js";

// ── Ce qu'on sait écrire, on sait le relire ────────────────────────────────

test("on relit exactement les extensions qu'on sait écrire", () => {
  // Deux listes tenues à part auraient divergé à la première extension
  // ajoutée : on aurait pu créer un fichier qu'on ne pourrait pas rouvrir.
  assert.deepEqual([...EXTENSIONS_LISIBLES].sort(), [...EXTENSIONS_ECRITES].sort());
});

test("chaque extension écrite se relit", () => {
  for (const extension of EXTENSIONS_ECRITES) {
    assert.equal(estUnFichierTexte(`notice${extension}`), true, extension);
  }
});

test("un PDF n'est pas un fichier de texte", () => {
  assert.equal(estUnFichierTexte("compte-rendu.pdf"), false);
});

test("une extension inconnue ne se lit pas comme du texte", () => {
  assert.equal(estUnFichierTexte("plan.dwg"), false);
  assert.equal(estUnFichierTexte("photo.png"), false);
});

test("un fichier sans nom ne se lit pas", () => {
  assert.equal(estUnFichierTexte(""), false);
  assert.equal(estUnFichierTexte(null), false);
});

test("le nom se lit sur toutes les formes de ligne", () => {
  assert.equal(nomDuFichier("notice.md"), "notice.md");
  assert.equal(nomDuFichier({ name: "notice.md" }), "notice.md");
  assert.equal(nomDuFichier({ original_filename: "notice.md" }), "notice.md");
  assert.equal(nomDuFichier({ filename: "notice.md" }), "notice.md");
  assert.equal(nomDuFichier({}), "");
});

// ── Seul le Markdown se rend ───────────────────────────────────────────────

test("seul le Markdown se rend", () => {
  assert.equal(seRendEnMarkdown("notice.md"), true);
  // `.txt` n'est pas du Markdown : rendu, il perdrait ses retours à la ligne.
  assert.equal(seRendEnMarkdown("notice.txt"), false);
  assert.equal(seRendEnMarkdown("variables.ref"), false);
  assert.equal(seRendEnMarkdown("valeurs.json"), false);
});

test("un fichier qui se rend offre deux lectures, les autres une", () => {
  assert.deepEqual(lecturesDuFichier("notice.md"),
    [LECTURE_DU_TEXTE.APERCU, LECTURE_DU_TEXTE.CODE]);
  assert.deepEqual(lecturesDuFichier("variables.ref"), [LECTURE_DU_TEXTE.CODE]);
});

test("un Markdown s'ouvre rendu, un fichier de code s'ouvre en code", () => {
  assert.equal(lectureParDefaut("notice.md"), LECTURE_DU_TEXTE.APERCU);
  assert.equal(lectureParDefaut("variables.ref"), LECTURE_DU_TEXTE.CODE);
});

// ── Les pages ──────────────────────────────────────────────────────────────

const COLLE = "# Notice incendie\n\nType M, 3e famille B.\n\n## Désenfumage\n\n1/200e.";

const RANGE = [
  "<!-- page 1 -->",
  "",
  "# Compte rendu du 3 mars",
  "",
  "<!-- page 2 -->",
  "",
  "## Lot 4 — gros oeuvre"
].join("\n");

test("un fichier écrit à la main est un seul bloc", () => {
  const pages = pagesDuTexte(COLLE);
  assert.equal(pages.length, 1);
  assert.equal(pages[0].page, 1);
  assert.match(pages[0].markdown, /Désenfumage/);
  // Tout le document, et non son premier paragraphe.
  assert.match(pages[0].markdown, /1\/200e\./);
});

test("un fichier qui porte ses marqueurs garde sa pagination", () => {
  const pages = pagesDuTexte(RANGE);
  assert.deepEqual(pages.map((page) => page.page), [1, 2]);
  assert.match(pages[0].markdown, /3 mars/);
  assert.match(pages[1].markdown, /gros oeuvre/);
  // Le marqueur ne fait pas partie du document.
  assert.equal(pages[0].markdown.includes("<!-- page"), false);
});

test("un fichier vide n'a aucune page", () => {
  assert.deepEqual(pagesDuTexte(""), []);
  assert.deepEqual(pagesDuTexte("   \n  \n"), []);
});

test("paginé et d'un seul tenant ne se confondent pas", () => {
  assert.equal(leFichierLu(RANGE).pagine, true);
  assert.equal(leFichierLu(COLLE).pagine, false);
});

test("les pages lues portent le même texte, sous l'autre nom", () => {
  const lues = pagesLuesDuTexte(RANGE);
  const pages = pagesDuTexte(RANGE);
  assert.deepEqual(lues.map((page) => page.page), pages.map((page) => page.page));
  assert.deepEqual(lues.map((page) => page.text), pages.map((page) => page.markdown));
});

// ── Les lignes ─────────────────────────────────────────────────────────────

test("les lignes vides sont gardées, et numérotées", () => {
  const lu = leFichierLu(COLLE);
  assert.equal(lu.lignes.length, 7);
  assert.deepEqual(lu.lignes.map((ligne) => ligne.rang), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(lu.lignes[1].lu, "");
  assert.equal(lu.lignes[0].lu, "# Notice incendie");
});

test("les fins de ligne de Windows ne décalent rien", () => {
  const lu = leFichierLu("un\r\ndeux\rtrois");
  assert.deepEqual(lu.lignes.map((ligne) => ligne.lu), ["un", "deux", "trois"]);
});

test("les caractères comptent le fichier entier", () => {
  assert.equal(leFichierLu(COLLE).caracteres, COLLE.length);
});

// ── Ce qu'on en dit ────────────────────────────────────────────────────────

test("un fichier d'un seul tenant ne prétend pas avoir une page", () => {
  const dit = phraseDuFichier(leFichierLu(COLLE));
  // « 1 page » se lirait comme une mesure, alors que c'est une absence.
  assert.equal(dit.includes("page"), false);
  assert.match(dit, /7 lignes/);
});

test("un fichier paginé dit ses pages", () => {
  assert.match(phraseDuFichier(leFichierLu(RANGE)), /2 pages/);
});

test("une ligne seule ne se dit pas au pluriel", () => {
  assert.match(phraseDuFichier(leFichierLu("seul")), /^1 ligne /);
});

test("sans fichier lu, on ne dit rien", () => {
  assert.equal(phraseDuFichier(null), "");
});

// ── Ce que l'Atelier reçoit, sans appel ────────────────────────────────────

test("la restitution d'un texte est le texte, entier", () => {
  const refait = laRestitutionDunTexte(COLLE);

  // Le document entier, et non son premier bloc : un fichier tronqué à la
  // première ligne passerait toute autre vérification.
  assert.match(refait.texte, /# Notice incendie/);
  assert.match(refait.texte, /1\/200e\./);
});

test("les lignes de la restitution sont numérotées sans trou", () => {
  const refait = laRestitutionDunTexte(RANGE);
  assert.deepEqual(
    refait.lignes.map((ligne) => ligne.rang),
    refait.lignes.map((_, rang) => rang + 1)
  );
});

test("chaque ligne sait de quelle page elle sort", () => {
  const refait = laRestitutionDunTexte(RANGE);
  const pages = new Set(refait.lignes.map((ligne) => ligne.page));
  // Deux pages dans le fichier, donc deux pages sur les lignes : une lecture
  // « Origine » qui renverrait tout à la page 1 ne renverrait à rien.
  assert.deepEqual([...pages].sort(), [1, 2]);
});

test("les marqueurs de page ne se retrouvent pas dans le document", () => {
  const refait = laRestitutionDunTexte(RANGE);
  assert.equal(refait.texte.includes("<!-- page"), false);
});

test("les pages lues accompagnent la restitution", () => {
  const refait = laRestitutionDunTexte(RANGE);
  assert.deepEqual(refait.pagesLues, pagesLuesDuTexte(RANGE));
});

test("un fichier vide ne donne aucune restitution", () => {
  // `null`, et non un document vide : l'écran doit pouvoir dire « ce fichier ne
  // porte aucun texte » plutôt qu'afficher un document blanc (règle 5).
  assert.equal(laRestitutionDunTexte(""), null);
  assert.equal(laRestitutionDunTexte("  \n "), null);
});

/* ── Trois défauts qu'on ne voit pas autrement ─────────────────────────────
 *
 * Relire du code comme du texte ne prouve rien la plupart du temps : un fichier
 * peut contenir tous les bons mots et lever à la première seconde. Il y a trois
 * exceptions, et ce sont exactement celles-là : un **attribut manquant**, un
 * **écouteur absent**, un **aiguillage dans le mauvais ordre**. Aucun des trois
 * ne lève, aucun n'affiche quoi que ce soit — le geste ne fait simplement rien.
 */

const ATELIER = readFileSync(
  new URL("../views/studio/dev/lecture-des-cr.js", import.meta.url), "utf8");
const FICHIERS = readFileSync(new URL("../views/project-documents.js", import.meta.url), "utf8");

test("les deux champs de fichier de l'Atelier acceptent ce que l'écran accepte", () => {
  // Un `accept="application/pdf"` resté en place n'empêche pas de déposer un
  // `.md` : il l'empêche seulement d'apparaître dans le sélecteur de fichiers.
  // Le bouton s'ouvre, le dossier est vide, et l'on croit n'avoir rien.
  const champs = ATELIER.match(/accept="[^"]*"/g) ?? [];
  assert.equal(champs.length, 3, "la zone de dépôt, l'en-tête, et l'écran en panne");
  for (const champ of champs) assert.equal(champ, 'accept="${escapeHtml(ACCEPTE)}"');
});

test("un document de texte déposé dans l'Atelier n'est pas écarté", () => {
  // Filtré sur `EST_UN_PDF` seul, un `.md` glissé sur la zone serait rangé
  // parmi les écartés : rien ne se passerait, et rien ne le dirait.
  assert.match(ATELIER, /trierLesFichiers\(fichiers, \(candidat\) => estUnDocumentAccepte\(/);
});

test("les trois gestes du lecteur de texte sont branchés", () => {
  for (const marque of ["data-texte-lecture", "data-texte-fermer", "data-texte-lire-un-cr"]) {
    assert.match(FICHIERS, new RegExp(`${marque}[\\s>=]`), `${marque} posé dans le gabarit`);

    // **Cherché, et écouté.** Un sélecteur qui trouve le bouton sans y poser
    // d'écouteur fait exactement la même chose qu'un bouton absent : rien, sans
    // erreur. On exige donc les deux à portée l'un de l'autre.
    const ou = FICHIERS.indexOf(`[${marque}]`);
    assert.notEqual(ou, -1, `${marque} cherché`);
    assert.match(FICHIERS.slice(ou, ou + 220), /addEventListener\("click"/, `${marque} écouté`);
  }
});

test("un fichier de texte ouvre son lecteur avant d'être refusé", () => {
  const ouvre = FICHIERS.indexOf("await ouvrirLeTexte(root, documentItem);");
  const refuse = FICHIERS.indexOf("ne s'ouvre pas ici");

  // **`indexOf` rend -1**, et `-1 < n` est vrai : comparer sans vérifier
  // d'abord que les deux existent ferait passer le test une fois l'aiguillage
  // supprimé.
  assert.notEqual(ouvre, -1, "l'aiguillage existe");
  assert.notEqual(refuse, -1, "le refus existe");
  assert.ok(ouvre < refuse, "et il passe avant le refus");
});

test("le lecteur de texte est atteignable depuis le rendu de l'onglet", () => {
  assert.match(FICHIERS, /docsViewState\.texte\s*\?\s*renderLectureDuTexte\(\)/);
});
