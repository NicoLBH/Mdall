import assert from "node:assert/strict";
import test from "node:test";

import { renderChoisirUnFichier, renderLeChemin } from "./choisir-un-fichier.js";
import { ENTREE, PAS_CHOISISSABLE, entreesDuDossier } from "../../services/choisir-depuis-fichiers.js";

const DOSSIER = entreesDuDossier({
  folders: [{ id: "f1", name: "Incendie" }],
  files: [
    { id: "d1", name: "notice.md", storage_bucket: "documents", storage_path: "p/notice.md" },
    { id: "d2", name: "cr.pdf", storage_bucket: "documents", storage_path: "p/cr.pdf" }
  ]
});

test("un document de texte se clique, un PDF non", () => {
  const html = renderChoisirUnFichier({ entrees: DOSSIER });

  assert.match(html, /data-choisir-document="d1"/);
  // Il est là — on ne masque pas ce qu'on refuse (règle 5) — mais rien ne le
  // prend : un clic qui n'aboutit pas ne se distingue pas d'une panne.
  assert.match(html, /cr\.pdf/);
  assert.equal(html.includes('data-choisir-document="d2"'), false);
});

test("un PDF dit pourquoi il ne se choisit pas", () => {
  const html = renderChoisirUnFichier({ entrees: DOSSIER });
  assert.match(html, /il faut l&#39;extraire/);
  assert.match(html, /choisir-fichier__ligne--eteinte/);
});

test("un dossier s'ouvre", () => {
  assert.match(renderChoisirUnFichier({ entrees: DOSSIER }), /data-choisir-dossier="f1"/);
});

test("on peut toujours sortir du choix", () => {
  // Un écran sans sortie oblige à changer d'onglet, et l'on perd la lecture en
  // cours.
  for (const vue of [{}, { enCours: true }, { motif: "panne" }, { entrees: DOSSIER }]) {
    assert.match(renderChoisirUnFichier(vue), /data-choisir-fermer/);
  }
});

test("le chemin remonte, sauf là où l'on est", () => {
  const html = renderLeChemin([{ id: "f1", name: "Incendie" }]);

  assert.match(html, /data-choisir-dossier=""/, "la racine ne se clique plus");
  // Un lien vers l'endroit où l'on est déjà ne mène nulle part.
  assert.equal(html.includes('data-choisir-dossier="f1"'), false);
  assert.match(html, /documents-breadcrumb__current">Incendie/);
});

test("à la racine, il n'y a rien à remonter", () => {
  const html = renderLeChemin([]);
  assert.match(html, /documents-breadcrumb__current">Fichiers/);
  assert.equal(html.includes("data-choisir-dossier"), false);
});

test("une lecture en cours ne montre pas un dossier vide", () => {
  // « Ce dossier est vide » pendant qu'on le lit serait faux, et l'on
  // rebrousserait chemin avant la réponse.
  const html = renderChoisirUnFichier({ enCours: true });
  assert.match(html, /Lecture du dossier/);
  assert.equal(html.includes("Ce dossier est vide"), false);
});

test("un dossier qu'on n'a pas pu lire ne se dit pas vide", () => {
  const html = renderChoisirUnFichier({ motif: "Ce dossier n'a pas pu être lu." });
  assert.match(html, /pas pu être lu/);
  assert.equal(html.includes("Ce dossier est vide"), false);
});

test("un dossier réellement vide le dit", () => {
  assert.match(renderChoisirUnFichier({ entrees: [] }), /Ce dossier est vide/);
});

test("les lignes sont celles de Fichiers", () => {
  // Une seconde arborescence aurait fait deux jeux de classes à recaler
  // ensemble, et l'on ne reconnaîtrait pas ici le rangement fait là-bas.
  const html = renderChoisirUnFichier({ entrees: DOSSIER });
  assert.match(html, /documents-repo__row/);
  assert.match(html, /documents-repo__cell--name/);
});

test("un nom qui porte du balisage ne s'exécute pas", () => {
  const html = renderChoisirUnFichier({
    entrees: entreesDuDossier({ folders: [{ id: "f1", name: "<img src=x onerror=1>" }] })
  });
  assert.equal(html.includes("<img"), false);
  assert.match(html, /&lt;img/);
});

test("chaque entrée porte son type", () => {
  const types = DOSSIER.map((entree) => entree.type);
  assert.deepEqual(types, [ENTREE.DOSSIER, ENTREE.FICHIER, ENTREE.FICHIER]);
  // Cherché par son nom, et non par son rang : la liste est triée, et un test
  // qui compte les places se casserait au premier fichier renommé.
  const pdf = DOSSIER.find((entree) => entree.nom === "cr.pdf");
  assert.equal(pdf.pourquoi, PAS_CHOISISSABLE.PAS_DU_TEXTE);
});
