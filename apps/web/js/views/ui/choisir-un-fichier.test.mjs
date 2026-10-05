import assert from "node:assert/strict";
import test from "node:test";

import { renderChoisirUnFichier, renderLeChemin } from "./choisir-un-fichier.js";
import { CE_QUE_DIT_LETAT_DUN, OU_EN_EST } from "../../services/les-documents-analyses.js";
import {
  ENTREE, LECTURE_DU_CHOIX, entreesDuDossier
} from "../../services/choisir-depuis-fichiers.js";

const DOSSIER = entreesDuDossier({
  folders: [{ id: "f1", name: "Incendie" }],
  files: [
    { id: "d1", name: "notice.md", storage_bucket: "documents", storage_path: "p/notice.md" },
    { id: "d2", name: "cr.pdf", storage_bucket: "documents", storage_path: "p/cr.pdf" }
  ]
});

test("un texte et un PDF se cliquent tous les deux", () => {
  const html = renderChoisirUnFichier({ entrees: DOSSIER });
  assert.match(html, /data-choisir-document="d1"/);
  assert.match(html, /data-choisir-document="d2"/);
});

/**
 * **Le coût ne s'écrit plus ligne par ligne.**
 *
 * Il y avait une colonne, et elle répétait « ce document sera extrait puis
 * restitué par le modèle » sur chaque PDF : elle mangeait la moitié de la
 * largeur et coupait les noms exactement là où l'on reconnaît un compte rendu
 * de chantier — on choisissait à l'aveugle.
 *
 * Le prix se dit toujours **avant le clic**, et mieux : dans la barre de
 * lancement, pour toute la file et en une fois (« 2 PDF à extraire puis
 * restituer par le modèle »). Sur la ligne, il reste en infobulle, où il ne
 * coûte aucune place.
 */
test("le coût se dit dans la barre, et en infobulle sur la ligne", () => {
  const html = renderChoisirUnFichier({
    entrees: DOSSIER,
    choisis: new Set(["d2"]),
    connues: DOSSIER
  });

  // Plus de colonne : le nom prend toute la largeur.
  assert.doesNotMatch(html, /documents-repo__cell--message/,
    "la colonne du coût est encore là, et elle coupe les noms");
  // L'infobulle, elle, reste.
  assert.match(html, /title="Ce document sera extrait puis restitué par le modèle\."/);
  // Et la barre l'annonce pour toute la file, avant le clic.
  assert.match(html, /1 PDF à extraire puis restituer par le modèle/);
});

test("un format illisible ne se clique pas, et dit pourquoi", () => {
  const html = renderChoisirUnFichier({
    entrees: entreesDuDossier({ files: [{ id: "d9", name: "plan.dwg", storage_bucket: "b", storage_path: "p" }] })
  });

  // Il est là — on ne masque pas ce qu'on refuse (règle 5) — mais rien ne le
  // prend : un clic qui n'aboutit pas ne se distingue pas d'une panne.
  assert.match(html, /plan\.dwg/);
  assert.equal(html.includes('data-choisir-document="d9"'), false);
  assert.match(html, /ne sait pas lire ce format/);
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
  assert.equal(pdf.lecture, LECTURE_DU_CHOIX.PDF);
  assert.equal(pdf.pourquoi, "");
});

/* ── Où en est l'analyse, dans la liste ──────────────────────────────────── */

/** Un dossier de quatre documents, un par état. */
const QUATRE_ETATS = [
  { type: ENTREE.FICHIER, id: "a", nom: "CR_16.pdf", choisissable: true, pourquoi: "",
    lecture: "pdf", ou: OU_EN_EST.ANALYSE, motif: "" },
  { type: ENTREE.FICHIER, id: "b", nom: "CR_17.pdf", choisissable: true, pourquoi: "",
    lecture: "pdf", ou: OU_EN_EST.ECHOUE, motif: "ce document ne porte aucun texte" },
  { type: ENTREE.FICHIER, id: "c", nom: "CR_18.pdf", choisissable: true, pourquoi: "",
    lecture: "pdf", ou: OU_EN_EST.ATTENTE, motif: "" },
  { type: ENTREE.FICHIER, id: "z", nom: "CR_19.pdf", choisissable: true, pourquoi: "",
    lecture: "pdf", ou: OU_EN_EST.JAMAIS, motif: "" }
];

/**
 * **C'est ici qu'on décide de dépenser.**
 *
 * Relancer ce qui est déjà analysé est un appel payé deux fois ; laisser de côté
 * ce qui a échoué est un document qu'on croit lu. Ni l'un ni l'autre ne se
 * voyait dans cette liste — il fallait sortir, aller au tableau, et revenir.
 */
test("chaque ligne dit où en est son analyse", () => {
  const html = renderChoisirUnFichier({ entrees: QUATRE_ETATS });

  assert.match(html, /choisir-fichier__etat--analyse/);
  assert.match(html, /choisir-fichier__etat--echoue/);
  assert.match(html, /choisir-fichier__etat--attente/);

  assert.match(html, /déjà analysé/);
  assert.match(html, /la lecture a échoué/);
  assert.match(html, /lecture en cours/);

  // Le motif de l'échec est l'infobulle : c'est lui qui dit s'il faut relancer.
  assert.match(html, /ce document ne porte aucun texte/);
});

/**
 * **Rien sur ce qui n'a jamais été analysé.**
 *
 * C'est le cas ordinaire dans un dossier qu'on ouvre pour la première fois : un
 * badge sur chaque ligne n'apprendrait rien et cacherait les trois qui comptent.
 * Le silence est l'état neutre, et le badge l'exception — l'inverse de la règle
 * habituelle, parce qu'ici c'est l'absence d'analyse qui est la norme.
 */
test("un document jamais analysé ne porte aucun badge", () => {
  const html = renderChoisirUnFichier({
    entrees: [QUATRE_ETATS[3]]
  });

  assert.match(html, /CR_19\.pdf/);
  assert.doesNotMatch(html, /choisir-fichier__etat/,
    "le cas ordinaire porte un badge : les trois qui comptent s'y noieraient");
});

/** Et une entrée sans état connu ne lève pas, ni n'invente. */
test("une entrée sans état connu ne porte rien", () => {
  const html = renderChoisirUnFichier({
    entrees: [{ type: ENTREE.FICHIER, id: "x", nom: "CR.pdf", choisissable: true, pourquoi: "" }]
  });
  assert.match(html, /CR\.pdf/);
  assert.doesNotMatch(html, /choisir-fichier__etat/);
});

/**
 * **Un état que le serveur nommerait demain se tait, il ne casse pas l'écran.**
 *
 * L'état vient de la file, c'est-à-dire d'une colonne du serveur. Qu'on y ajoute
 * un jour un `en_cours` ou un `abandonne` est une question de quand, pas de si —
 * et ce jour-là, le choix des documents doit rester lisible. C'est le manque dans
 * la table qui le garantit : ce qui n'y figure pas ne s'écrit pas.
 */
test("un état inconnu ne se dessine pas, et la liste tient", () => {
  const html = renderChoisirUnFichier({
    entrees: [{ type: ENTREE.FICHIER, id: "x", nom: "CR.pdf", choisissable: true,
      pourquoi: "", lecture: "pdf", ou: "une_chose_du_serveur", motif: "" }]
  });
  assert.match(html, /CR\.pdf/);
  assert.doesNotMatch(html, /choisir-fichier__etat/,
    "un état que l'écran ne connaît pas se dessine : il écrirait son nom brut");
  assert.doesNotMatch(html, /undefined/);
});

/**
 * **Les deux tables se suivent.**
 *
 * Le mot de chaque état vit dans le domaine (`CE_QUE_DIT_LETAT_DUN`), son ton et
 * son icône dans cet écran. Un état ajouté d'un côté et oublié de l'autre donne
 * soit un badge muet, soit `undefined` écrit à côté d'un nom de fichier — et rien
 * ne l'aurait dit avant l'écran.
 */
test("chaque état qui a un mot a aussi un badge", () => {
  for (const [ou, mot] of Object.entries(CE_QUE_DIT_LETAT_DUN)) {
    const html = renderChoisirUnFichier({
      entrees: [{ type: ENTREE.FICHIER, id: "x", nom: "CR.pdf", choisissable: true,
        pourquoi: "", lecture: "pdf", ou, motif: "" }]
    });
    assert.match(html, /choisir-fichier__etat--/,
      `« ${ou} » a un mot mais aucun badge : le mot ne s'écrirait nulle part`);
    assert.ok(html.includes(mot), `« ${ou} » n'écrit pas son mot « ${mot} »`);
    assert.doesNotMatch(html, /undefined/);
  }
});

/**
 * **Ce qui est déjà analysé reste choisissable.**
 *
 * On relit en ajustant une consigne, et c'est un geste légitime. L'éteindre
 * aurait transformé une information en interdiction — et il aurait fallu sortir
 * de l'écran pour relancer une lecture qu'on veut refaire (règle 12).
 */
test("un document déjà analysé se coche quand même", () => {
  const html = renderChoisirUnFichier({ entrees: QUATRE_ETATS });

  // Quatre cases, une par document : aucun état n'en retire.
  assert.equal((html.match(/data-choisir-coche=/g) ?? []).length, 4,
    "un état d'analyse empêche de cocher");
});
