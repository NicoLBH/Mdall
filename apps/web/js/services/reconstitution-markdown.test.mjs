import test from "node:test";
import assert from "node:assert/strict";

import {
  LECTURE, NOMS_DE_LECTURE, QUOI_DE_LA_LECTURE, assemblerLeMarkdown, enFichierMarkdown,
  enPourcent, fideliteDeLaPage, fideliteDeLaReconstitution, motsSignificatifs,
  pagesALire, pagesDuFichierMarkdown, tonDeLaPart
} from "./reconstitution-markdown.js";

/* ── L'assemblage ────────────────────────────────────────────────────────── */

/**
 * **L'ordre vient des numéros de page, pas de l'ordre de la réponse.** Un
 * modèle qui rendrait ses pages en désordre reconstruirait un document dans
 * lequel on ne retrouverait rien, et la cause en serait indevinable.
 */
test("les pages se remettent dans l'ordre du document", () => {
  const { texte, pages } = assemblerLeMarkdown([
    { page: 3, markdown: "# Trois" },
    { page: 1, markdown: "# Un" },
    { page: 2, markdown: "# Deux" }
  ]);

  assert.equal(pages, 3);
  assert.match(texte, /# Un[\s\S]*# Deux[\s\S]*# Trois/);
});

/**
 * **La provenance est dérivée, jamais demandée.** Une page déclarée par celui
 * qu'on vérifie ne vérifie rien : chaque ligne porte la page du bloc d'où elle
 * a été découpée.
 */
test("chaque ligne garde la page dont elle a été découpée", () => {
  const { lignes } = assemblerLeMarkdown([
    { page: 1, markdown: "# Un\ndeux lignes" },
    { page: 2, markdown: "# Deux" }
  ]);

  assert.deepEqual(lignes.map((ligne) => ligne.page), [1, 1, 1, 2]);
  assert.deepEqual(lignes.map((ligne) => ligne.rang), [1, 2, 3, 4]);
  assert.deepEqual(lignes.map((ligne) => ligne.texte), ["# Un", "deux lignes", "", "# Deux"]);
});

test("une page sans numéro ne s'invente pas une place", () => {
  const { pages } = assemblerLeMarkdown([
    { page: null, markdown: "# Sans numéro" },
    { page: 1, markdown: "# Un" }
  ]);
  assert.equal(pages, 1);
});

/* ── Les mots qu'on compare ──────────────────────────────────────────────── */

test("les mots courts ne comptent pas, les nombres si", () => {
  const mots = motsSignificatifs("Le lot 02 pose 3 linteaux bois le 25/06/2025");

  assert.ok(mots.has("linteaux"));
  assert.ok(mots.has("bois"));
  assert.ok(mots.has("2025"));
  assert.ok(mots.has("02"), "un numéro de lot doit compter");
  // « le », « 3 » : du bruit qu'on retrouve toujours et qui ne prouve rien.
  assert.ok(!mots.has("le"));
  assert.ok(!mots.has("3"));
});

/* ── Ce qui a survécu, et ce qui a été ajouté ────────────────────────────── */

test("une reconstitution parfaite ne perd ni n'ajoute rien", () => {
  const dit = "Reprise d'étanchéité en toiture terrasse, lot 02.";
  const mesure = fideliteDeLaPage(dit, `## Lot 02\n\n${dit}`);

  assert.equal(mesure.part, 1);
  assert.equal(mesure.motsAjoutes, 0);
});

/**
 * **Le chiffre qui compte vraiment.** Un modèle qui reformule invente, et un
 * document inventé se lit parfaitement : les mots ajoutés sont le seul signal
 * qui le dise.
 */
test("les mots que le document ne portait pas se comptent", () => {
  const mesure = fideliteDeLaPage(
    "Sondage réalisé sur linteaux bois.",
    "Sondage réalisé sur linteaux bois. **Conclusion : reprise nécessaire.**"
  );

  assert.equal(mesure.part, 1, "rien n'a été perdu");
  assert.ok(mesure.motsAjoutes >= 2, "ce que le modèle a ajouté doit se voir");
});

test("une page d'origine vide n'a rien perdu", () => {
  assert.equal(fideliteDeLaPage("", "").part, 1);
  assert.equal(fideliteDeLaPage("   ", "quoi que ce soit").part, 1);
});

/**
 * **Une page absente n'est pas une page vide.** Confondues, une reconstitution
 * qui aurait sauté la moitié du document afficherait une fidélité parfaite sur
 * ce qu'il en reste (règle 5).
 */
test("une page dont rien n'est revenu se nomme et pèse", () => {
  const origine = [
    { page: 1, text: "Reprise étanchéité toiture terrasse" },
    { page: 2, text: "Sondage linteaux bois appui suffisant" }
  ];
  const mesure = fideliteDeLaReconstitution(origine, [
    { page: 1, markdown: "Reprise étanchéité toiture terrasse" }
  ]);

  assert.deepEqual(mesure.absentes, [2]);
  assert.equal(mesure.pages.find((page) => page.page === 2).rendue, false);
  assert.ok(mesure.part < 1, "une page perdue doit faire baisser la mesure");
  // Et ses mots comptent dans le total : sans cela, sauter une page
  // améliorerait le score.
  assert.ok(mesure.motsOrigine > mesure.motsRetrouves);
});

test("un document entièrement refait vaut la perfection, et se dit page par page", () => {
  const origine = [
    { page: 1, text: "Reprise étanchéité toiture" },
    { page: 2, text: "Sondage linteaux bois" }
  ];
  const mesure = fideliteDeLaReconstitution(origine, [
    { page: 1, markdown: "# Page un\n\nReprise étanchéité toiture" },
    { page: 2, markdown: "# Page deux\n\nSondage linteaux bois" }
  ]);

  assert.equal(mesure.part, 1);
  assert.deepEqual(mesure.absentes, []);
  assert.equal(mesure.pages.length, 2);
  assert.ok(mesure.pages.every((page) => page.rendue));
});

/* ── Les seuils, et les mots de l'écran ──────────────────────────────────── */

test("les tons rangent sans rien décider", () => {
  assert.equal(tonDeLaPart(1), "est-bon");
  assert.equal(tonDeLaPart(0.8), "est-douteux");
  assert.equal(tonDeLaPart(0.4), "est-mauvais");
});

test("une part s'écrit en pourcentage entier", () => {
  assert.equal(enPourcent(1), "100 %");
  assert.equal(enPourcent(0.876), "88 %");
  assert.equal(enPourcent(0), "0 %");
});

/**
 * Les trois lectures portent les mêmes noms que celles de la Mémoire. Un même
 * geste ne s'appelle pas de deux façons selon l'écran où l'on se trouve.
 */
test("chaque lecture a son nom et ce qu'elle montre", () => {
  for (const cle of Object.values(LECTURE)) {
    assert.ok(NOMS_DE_LECTURE[cle], `la lecture « ${cle} » n'a pas de nom`);
    assert.ok(QUOI_DE_LA_LECTURE[cle], `la lecture « ${cle} » ne dit pas ce qu'elle montre`);
  }
  assert.equal(NOMS_DE_LECTURE[LECTURE.APERCU], "Aperçu");
  assert.equal(NOMS_DE_LECTURE[LECTURE.CODE], "Code");
  assert.equal(NOMS_DE_LECTURE[LECTURE.ORIGINE], "Origine");
});

/* ── Sur quoi le relevé se fait ──────────────────────────────────────────── */

/**
 * **C'est la décision qui donne son sens à tout l'écran.** Le modèle relit un
 * document qu'on a sous les yeux : on sait donc exactement sur quoi il s'est
 * fondé. Lire les points sur le texte brut laisserait la question ouverte à
 * chaque déception — mal lu, ou bien lu et mal exploité ?
 */
test("les points se relèvent sur la restitution, pas sur le texte brut", () => {
  const brutes = [{ page: 1, text: "du texte de PDF" }];
  const restitution = { phase: "fait", pages: [{ page: 1, markdown: "# Un titre" }] };

  const { pages, lueSur } = pagesALire(brutes, restitution);

  assert.equal(lueSur, "modele");
  assert.deepEqual(pages, [{ page: 1, text: "# Un titre" }]);
});

/**
 * Et quand elle n'a pas abouti, on lit sur le texte brut **plutôt que de ne
 * rien lire** — mais l'appelant reçoit de quoi le dire. Se rabattre en silence
 * rendrait la source du relevé indevinable (règle 5).
 */
test("sans restitution, on lit le texte brut et on le sait", () => {
  const brutes = [{ page: 1, text: "du texte de PDF" }];

  for (const restitution of [
    null,
    undefined,
    { phase: "echec", pages: [] },
    { phase: "fait", pages: [] },
    { phase: "demande", pages: [{ page: 1, markdown: "pas encore" }] }
  ]) {
    const { pages, lueSur } = pagesALire(brutes, restitution);
    assert.equal(lueSur, "brut", `restitution ${JSON.stringify(restitution)}`);
    assert.deepEqual(pages, brutes);
  }
});

/* ── Le fichier rangé, et ce qu'on en relit ──────────────────────────────── */

/**
 * **Sans les marqueurs, la pagination serait perdue au rangement.** Le document
 * relu depuis Fichiers n'aurait plus de lecture « Origine », plus de mesure par
 * page, et plus rien à quoi confronter le PDF ouvert à côté.
 */
test("ranger puis relire rend exactement les mêmes pages", () => {
  const pages = [
    { page: 1, markdown: "# Réunion n° 7\n\n|N|Lot|\n|---|---|\n|1|Gros œuvre|" },
    { page: 2, markdown: "## Lot 05\n\nSondage réalisé." }
  ];

  assert.deepEqual(pagesDuFichierMarkdown(enFichierMarkdown(pages)), pages);
});

/**
 * **Un commentaire, et non un titre.** Le fichier est fait pour être ouvert par
 * un humain dans Fichiers : un marqueur visible s'ajouterait au document toutes
 * les deux pages, alors qu'il n'appartient pas au document.
 */
test("le marqueur de page ne s'affiche pas dans le document", async () => {
  const fichier = enFichierMarkdown([{ page: 1, markdown: "# Un titre" }]);
  assert.match(fichier, /<!-- page 1 -->/);

  const { renderMarkdownToHtml } = await import("../utils/markdown-renderer.js");
  const rendu = renderMarkdownToHtml(fichier);
  assert.doesNotMatch(rendu, /page 1/, "le marqueur ne doit pas se voir à l'aperçu");
  assert.match(rendu, /Un titre/);
});

test("les pages se rangent dans l'ordre, quelles qu'elles soient à l'entrée", () => {
  const fichier = enFichierMarkdown([
    { page: 3, markdown: "trois" }, { page: 1, markdown: "un" }
  ]);
  assert.deepEqual(pagesDuFichierMarkdown(fichier).map((page) => page.page), [1, 3]);
});

/**
 * Un fichier dont on ne sait pas comment il est paginé ne peut pas être
 * confronté au PDF. Le présenter comme une page unique ferait croire à un
 * document d'une page (règle 5).
 */
test("un fichier sans marqueur ne s'invente pas une page", () => {
  assert.deepEqual(pagesDuFichierMarkdown("# Un document sans marqueur"), []);
  assert.deepEqual(pagesDuFichierMarkdown(""), []);
  assert.deepEqual(enFichierMarkdown([{ page: 0, markdown: "sans place" }]), "");
});
