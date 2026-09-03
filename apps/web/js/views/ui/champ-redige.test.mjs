/**
 * Le champ rédigé : titre, cases, éditeur.
 *
 * Ce qu'on vérifie ici, ce n'est pas la mise en page — c'est la promesse du
 * composant : l'éditeur porte le texte **entier**, la barre de mise en forme
 * n'offre pas de geste qui ne mène nulle part, et la pièce jointe ne s'invite
 * pas là où rien ne sait la recevoir.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { dessinerChampRedige } from "./champ-redige.js";
import { renderSubjectMarkdownToolbar } from "./subject-rich-editor.js";

const icone = (nom) => `<svg data-icone="${nom}"></svg>`;

const CHAMP = {
  cle: "planchers.nature",
  titre: "Nature des planchers",
  propositions: [{ libelle: "béton armé", poids: 12 }, { libelle: "bois", poids: 0 }],
  retenues: ["béton armé"],
  texte: "Les planchers seront **CF 1/2 h**, en béton armé."
};

test("fermé, le champ montre ses cases et pas d'éditeur", () => {
  const html = dessinerChampRedige(CHAMP);
  assert.match(html, /Nature des planchers/);
  assert.match(html, /data-champ-valeur="béton armé"/);
  assert.match(html, /aria-checked="true"/);
  assert.doesNotMatch(html, /data-champ-texte/);
});

test("ouvert, l'éditeur porte le texte entier", () => {
  // C'est la promesse du composant : notre aide sert à remplir vite, elle ne
  // doit pas empêcher de reprendre. Un éditeur qui ne porterait que le
  // complément obligerait à finir la phrase ailleurs.
  const html = dessinerChampRedige({ ...CHAMP, ouvert: true });
  assert.match(html, /data-champ-texte="planchers\.nature"/);
  assert.match(html, /Les planchers seront \*\*CF 1\/2 h\*\*, en béton armé\./);
});

test("la barre de mise en forme n'offre pas de geste sans suite", () => {
  // Ni mention ni référence sujet : une phrase de notice n'a personne à
  // mentionner, et une note sur un plan n'a pas de sujet à référencer.
  const html = dessinerChampRedige({ ...CHAMP, ouvert: true });
  assert.match(html, /data-format="bold"/);
  assert.doesNotMatch(html, /data-format="mention"/);
  assert.doesNotMatch(html, /data-format="subject-ref"/);
  assert.doesNotMatch(html, /attachments-pick/);
});

test("un texte repris peut rendre la main", () => {
  const html = dessinerChampRedige({ ...CHAMP, repris: true });
  assert.match(html, /data-champ-rendre="planchers\.nature"/);
  assert.doesNotMatch(dessinerChampRedige(CHAMP), /data-champ-rendre/);
});

test("ce qui a été tapé à la main se distingue de ce qui a été coché", () => {
  const html = dessinerChampRedige({ ...CHAMP, retenues: ["béton armé", "dalle alvéolaire"] });
  assert.match(html, /Ajouté à la main : dalle alvéolaire/);
});

test("les onglets et la barre portent la clé du champ", () => {
  // Deux champs ouverts au même moment ne doivent pas se répondre : l'écran
  // saurait qu'on a cliqué, pas où.
  const html = dessinerChampRedige({ ...CHAMP, ouvert: true });
  assert.match(html, /data-action="champ-apercu:planchers\.nature"/);
  assert.match(html, /data-champ-cle="planchers\.nature"/);
  assert.match(html, /id="champ-planchers\.nature"/);
});

test("la barre restreinte ne rend que ce qu'on lui a demandé", () => {
  const html = renderSubjectMarkdownToolbar({
    buttonAction: "champ-format", svgIcon: icone, boutons: ["bold", "link"],
    pieceJointe: false, dispositionGroupee: true
  });
  assert.match(html, /data-format="bold"/);
  assert.match(html, /data-format="link"/);
  assert.doesNotMatch(html, /data-format="heading"/);
  assert.doesNotMatch(html, /paperclip/);
});

test("sans restriction, la barre complète est intacte", () => {
  // Le composeur de commentaire s'en sert tel quel : une option ajoutée pour
  // la notice ne doit rien lui retirer.
  const html = renderSubjectMarkdownToolbar({ buttonAction: "composer-format", svgIcon: icone });
  for (const format of ["heading", "bold", "mention", "subject-ref", "checklist"]) {
    assert.match(html, new RegExp(`data-format="${format}"`));
  }
  assert.match(html, /composer-attachments-pick/);
});
