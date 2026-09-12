import test from "node:test";
import assert from "node:assert/strict";

import {
  LECTURE, NOMS_DE_LECTURE, QUOI_DE_LA_LECTURE, assemblerLeMarkdown, enPourcent,
  fideliteDeLaPage, fideliteDeLaReconstitution, motsSignificatifs, pagesALire, tonDeLaPart
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
