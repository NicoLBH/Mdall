import test from "node:test";
import assert from "node:assert/strict";

import {
  PHRASES_DU_RANGEMENT, RANGEE, estUneRestitution, nomDeLaRestitution, nomDuDossier,
  restitutionRangee, sourceRangee
} from "./restitution-rangee.js";
import {
  empreinteDesPages, rangerLaRestitution, relireLaRestitution
} from "./ranger-la-restitution.js";

/* ── Les noms ────────────────────────────────────────────────────────────── */

test("le dossier porte le nom du PDF, sans son extension", () => {
  assert.equal(nomDuDossier("CR_07.pdf"), "CR_07");
  assert.equal(nomDuDossier("1824_CR_09.PDF"), "1824_CR_09");
  assert.equal(nomDuDossier("compte rendu n° 12.pdf"), "compte rendu n° 12");
  // Un nom vide ferait un dossier sans nom, que la base refuse.
  assert.equal(nomDuDossier(""), "document");
  assert.equal(nomDuDossier(".pdf"), "document");
});

test("la restitution porte le même nom, en .md", () => {
  assert.equal(nomDeLaRestitution("CR_07.pdf"), "CR_07.md");
  assert.equal(nomDeLaRestitution("CR_07"), "CR_07.md");
});

test("une restitution se reconnaît à son extension", () => {
  assert.equal(estUneRestitution({ filename: "CR_07.md" }), true);
  assert.equal(estUneRestitution({ original_filename: "CR_07.MD" }), true);
  assert.equal(estUneRestitution({ filename: "CR_07.pdf" }), false);
  assert.equal(estUneRestitution({}), false);
});

/* ── Trois états, et non deux ────────────────────────────────────────────── */

const SIGNE = "a".repeat(64);
const AUTRE = "b".repeat(64);

test("rien de rangé : il faut restituer", () => {
  assert.deepEqual(
    restitutionRangee([{ filename: "CR_07.pdf", content_fingerprint: SIGNE }],
      { nom: "CR_07.md", empreinte: SIGNE }),
    { etat: RANGEE.ABSENTE, document: null }
  );
  assert.equal(restitutionRangee([], { nom: "CR_07.md", empreinte: SIGNE }).etat, RANGEE.ABSENTE);
});

/**
 * **C'est ce qui évite de repayer.** Le second dépôt du même document relit ce
 * qui est rangé au lieu de rappeler le modèle.
 */
test("une restitution du même texte se relit", () => {
  const trouvee = restitutionRangee(
    [{ id: "d-1", filename: "CR_07.md", content_fingerprint: SIGNE }],
    { nom: "CR_07.md", empreinte: SIGNE }
  );

  assert.equal(trouvee.etat, RANGEE.A_JOUR);
  assert.equal(trouvee.document.id, "d-1");
});

/**
 * **Le piège.** Deux comptes rendus peuvent s'appeler `CR.pdf`. Confondu avec
 * « à jour », on afficherait la restitution d'un document en croyant lire celle
 * d'un autre — sans rien pour s'en apercevoir (règle 5). Confondu avec
 * « absente », on écraserait silencieusement du travail rangé.
 */
test("une restitution d'un autre texte n'est ni à jour ni absente", () => {
  const trouvee = restitutionRangee(
    [{ id: "d-1", filename: "CR_07.md", content_fingerprint: AUTRE }],
    { nom: "CR_07.md", empreinte: SIGNE }
  );

  assert.equal(trouvee.etat, RANGEE.PERIMEE);
  assert.equal(trouvee.document.id, "d-1", "le fichier en cause se nomme");
});

/**
 * Ne pas savoir de quel texte vient une restitution n'autorise pas à la servir
 * comme si elle venait de celui-ci.
 */
test("sans empreinte, on ne conclut pas qu'elle est à jour", () => {
  const sansSigne = restitutionRangee(
    [{ filename: "CR_07.md", content_fingerprint: null }],
    { nom: "CR_07.md", empreinte: SIGNE }
  );
  assert.equal(sansSigne.etat, RANGEE.PERIMEE);

  const sansRien = restitutionRangee(
    [{ filename: "CR_07.md", content_fingerprint: SIGNE }],
    { nom: "CR_07.md", empreinte: "" }
  );
  assert.equal(sansRien.etat, RANGEE.PERIMEE);
});

test("chaque état a sa phrase", () => {
  for (const etat of Object.values(RANGEE)) {
    assert.ok(PHRASES_DU_RANGEMENT[etat], `l'état « ${etat} » n'a pas de phrase`);
  }
  // Celle qui compte : elle dit que rien n'a été payé.
  assert.match(PHRASES_DU_RANGEMENT[RANGEE.A_JOUR], /aucun appel au modèle/);
});

/* ── Le PDF, déposé une seule fois ───────────────────────────────────────── */

/**
 * Redéposer le PDF en ferait un second exemplaire du même document, dans le
 * dossier qui porte son nom.
 */
test("le PDF déjà rangé se réemploie, s'il porte le même texte", () => {
  const fichiers = [
    { id: "p-1", filename: "CR_07.pdf", content_fingerprint: SIGNE },
    { id: "m-1", filename: "CR_07.md", content_fingerprint: SIGNE }
  ];

  assert.equal(sourceRangee(fichiers, { empreinte: SIGNE })?.id, "p-1");
  // Un autre texte sous le même nom n'est pas le même document.
  assert.equal(sourceRangee(fichiers, { empreinte: AUTRE }), null);
  // Et sans empreinte, on ne réemploie rien : on ne saurait pas quoi.
  assert.equal(sourceRangee(fichiers, { empreinte: "" }), null);
});

/* ── Ce que le rangement ne fait pas ─────────────────────────────────────── */

/**
 * **Un fichier n'est pas la mémoire.** La règle 1 interdit de verser dans la
 * mémoire du projet sans proposition ; déposer un document est autre chose —
 * c'est la matière première, et l'onglet Documents en dépose déjà directement.
 * Ce qui sortira de ce document passera, lui, par une proposition.
 */
test("ranger un document n'écrit ni sujet, ni affirmation", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  for (const chemin of ["./restitution-rangee.js", "./ranger-la-restitution.js"]) {
    const source = readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), "utf8");
    assert.doesNotMatch(source, /createManualSubject|createSubject|subjects|assertions/,
      `${chemin} touche à la mémoire`);
  }
});

/**
 * Le module pur ne doit rien appeler : c'est ce qui permet de vérifier les
 * trois états sans réseau, et donc de les vérifier du tout.
 */
test("les règles de rangement se vérifient sans réseau", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const pur = readFileSync(fileURLToPath(new URL("./restitution-rangee.js", import.meta.url)), "utf8");
  assert.doesNotMatch(pur, /fetch\(|import\(|from "\.\//);
});

/* ── Le rangement, exécuté ───────────────────────────────────────────────── */

/**
 * Une base de fichiers en mémoire.
 *
 * **Le parcours s'exécute**, il ne se relit pas. Un module qui contient les
 * bons mots peut lever à la première seconde, et c'est exactement ce que cet
 * écran a livré deux fois. Ce qui compte ici n'est pas ce que le fichier dit,
 * c'est ce qu'il fait : combien de dépôts, sous quel nom, à quel chemin — et
 * dans quel cas il ne rappelle pas le modèle.
 */
function baseEnMemoire({ dossiers = [], fichiers = [], contenus = new Map(), chemins = [] } = {}) {
  const journal = { deposes: [], dossiersCrees: [], chemins };
  let suivant = 1;

  const portes = {
    listerLesDossiers: async () => dossiers,
    creerLeDossier: async (_projectId, _parent, name) => {
      const cree = { id: `dossier-${suivant++}`, name };
      dossiers.push(cree);
      journal.dossiersCrees.push(name);
      return cree;
    },
    listerLeDossier: async (_projectId, folderId) => ({
      files: fichiers.filter((fichier) => fichier.folder_id === folderId)
    }),
    televerser: async (fichier, { scope }) => {
      const storage_path = `moi/projet/${scope}/${fichier.name}`;
      // Le stockage refuse d'écraser : deux fois le même chemin est un conflit,
      // et c'est précisément ce qu'on veut voir échouer ici.
      if (journal.chemins.includes(storage_path)) throw new Error("storage upload failed (409)");
      journal.chemins.push(storage_path);
      return { storage_bucket: "documents", storage_path };
    },
    ecrireLaLigne: async (row) => {
      const ligne = { id: `doc-${suivant++}`, ...row };
      fichiers.push(ligne);
      journal.deposes.push(ligne);
      return ligne;
    },
    telecharger: async (row) => new File([contenus.get(row.id) ?? ""], row.filename, {
      type: "text/markdown"
    }),
    qui: async () => "moi"
  };

  return { portes, journal, dossiers, fichiers };
}

const unPdf = (nom = "CR_07.pdf") => new File(["%PDF"], nom, { type: "application/pdf" });

test("ranger dépose le PDF et sa restitution dans un dossier à son nom", async () => {
  const { portes, journal } = baseEnMemoire();

  const range = await rangerLaRestitution({
    projectId: "projet", fichier: unPdf(), markdown: "# Réunion n° 7", empreinte: "abc", portes
  });

  assert.equal(range.range, true);
  assert.deepEqual(journal.dossiersCrees, ["CR_07"]);
  assert.deepEqual(journal.deposes.map((ligne) => ligne.filename), ["CR_07.pdf", "CR_07.md"]);
  assert.deepEqual(journal.deposes.map((ligne) => ligne.document_kind),
    ["source_pdf", "restitution_markdown"]);
  // L'empreinte du texte voyage sur les deux : c'est elle qui les réunit.
  assert.deepEqual(new Set(journal.deposes.map((ligne) => ligne.content_fingerprint)), new Set(["abc"]));
});

/**
 * **C'est la raison d'être de l'étape.** Redéposer le même compte rendu ne doit
 * plus refaire la restitution — donc ne plus la payer.
 */
test("le même document relu ne rappelle pas le modèle", async () => {
  const base = baseEnMemoire();
  await rangerLaRestitution({
    projectId: "projet", fichier: unPdf(), markdown: "# Réunion n° 7", empreinte: "abc",
    portes: base.portes
  });

  const md = base.journal.deposes.find((ligne) => ligne.filename === "CR_07.md");
  const contenus = new Map([[md.id, "# Réunion n° 7"]]);
  const relecture = baseEnMemoire({ dossiers: base.dossiers, fichiers: base.fichiers, contenus });

  const relue = await relireLaRestitution({
    projectId: "projet", fichier: unPdf(), empreinte: "abc", portes: relecture.portes
  });

  assert.equal(relue.etat, RANGEE.A_JOUR);
  assert.equal(relue.markdown, "# Réunion n° 7");
  assert.equal(relecture.journal.deposes.length, 0, "relire ne dépose rien");
});

/**
 * Le piège de l'étape. Même nom de fichier, texte différent : servir la
 * restitution rangée afficherait un compte rendu en croyant lire l'autre.
 */
test("le même nom sur un autre texte ne rend pas la restitution rangée", async () => {
  const base = baseEnMemoire();
  await rangerLaRestitution({
    projectId: "projet", fichier: unPdf(), markdown: "# Réunion n° 7", empreinte: "abc",
    portes: base.portes
  });

  const suite = baseEnMemoire({ dossiers: base.dossiers, fichiers: base.fichiers });
  const relue = await relireLaRestitution({
    projectId: "projet", fichier: unPdf(), empreinte: "zzz", portes: suite.portes
  });

  assert.equal(relue.etat, RANGEE.PERIMEE);
  assert.equal(relue.markdown, "");
});

/**
 * Et la version suivante se range quand même : le chemin de stockage porte
 * l'empreinte, sans quoi le dépôt buterait sur un nom déjà pris.
 */
test("une seconde version du même nom se range sans conflit", async () => {
  const base = baseEnMemoire();
  await rangerLaRestitution({
    projectId: "projet", fichier: unPdf(), markdown: "# Réunion n° 7", empreinte: "abc",
    portes: base.portes
  });

  // **Le stockage est celui d'avant.** Repartir d'un stockage vide cacherait
  // précisément le conflit qu'on cherche ici : le nom `CR_07.md` est déjà pris.
  const suite = baseEnMemoire({
    dossiers: base.dossiers, fichiers: base.fichiers, chemins: base.journal.chemins
  });
  const range = await rangerLaRestitution({
    projectId: "projet", fichier: unPdf(), markdown: "# Réunion n° 8", empreinte: "zzz",
    portes: suite.portes
  });

  assert.equal(range.motif, "");
  assert.equal(range.range, true);
  // Le même dossier, pas un jumeau.
  assert.deepEqual(suite.journal.dossiersCrees, []);
  assert.equal(suite.journal.deposes.length, 2);
});

/** Ranger deux fois le même texte n'ajoute pas un doublon. */
test("ranger deux fois le même texte ne dépose rien la seconde fois", async () => {
  const base = baseEnMemoire();
  await rangerLaRestitution({
    projectId: "projet", fichier: unPdf(), markdown: "# Réunion n° 7", empreinte: "abc",
    portes: base.portes
  });

  const suite = baseEnMemoire({ dossiers: base.dossiers, fichiers: base.fichiers });
  const range = await rangerLaRestitution({
    projectId: "projet", fichier: unPdf(), markdown: "# Réunion n° 7", empreinte: "abc",
    portes: suite.portes
  });

  assert.equal(range.range, true);
  assert.deepEqual(suite.journal.deposes, []);
});

/**
 * Un rangement qui échoue ne fait pas échouer la lecture : la restitution est
 * faite, elle est à l'écran. On la repaiera au prochain dépôt — ennuyeux, pas
 * grave — et l'écran le dit plutôt que de le taire.
 */
test("un rangement qui échoue rend son motif, sans lever", async () => {
  const { portes } = baseEnMemoire();
  portes.televerser = async () => { throw new Error("storage upload failed (403)"); };

  const range = await rangerLaRestitution({
    projectId: "projet", fichier: unPdf(), markdown: "# Réunion", empreinte: "abc", portes
  });

  assert.equal(range.range, false);
  assert.match(range.motif, /403/);
});

test("sans projet, on ne range rien et on le dit", async () => {
  const sansProjet = await rangerLaRestitution({ fichier: unPdf(), markdown: "# R" });
  assert.equal(sansProjet.range, false);
  assert.equal(sansProjet.motif, "aucun projet");

  const relue = await relireLaRestitution({ fichier: unPdf(), empreinte: "abc" });
  assert.equal(relue.etat, RANGEE.ABSENTE);
});

/** L'empreinte porte sur le texte des pages, et pas sur le nom du fichier. */
test("l'empreinte suit le texte, pas le nom du document", async () => {
  const pages = [{ page: 1, text: "Réunion n° 7" }, { page: 2, text: "Lot 05" }];

  assert.equal(await empreinteDesPages(pages), await empreinteDesPages(pages));
  assert.notEqual(await empreinteDesPages(pages), await empreinteDesPages([{ page: 1, text: "Autre" }]));
  assert.equal(await empreinteDesPages([]), "");
  assert.equal(await empreinteDesPages([{ page: 1, text: "" }]), "");
});

/**
 * **C'est la décision qui économise l'appel.** Pure, donc vérifiée en
 * l'exécutant — et non en relisant l'écran comme du texte.
 */
test("on ne reprend une restitution rangée que si elle est à jour et paginée", async () => {
  const { enFichierMarkdown } = await import("./reconstitution-markdown.js");
  const { restitutionReutilisable } = await import("./ranger-la-restitution.js");

  const pages = [{ page: 1, markdown: "# Réunion" }, { page: 2, markdown: "## Lot 05" }];
  const aJour = restitutionReutilisable({ etat: RANGEE.A_JOUR, markdown: enFichierMarkdown(pages) });
  assert.equal(aJour.reutilisable, true);
  assert.deepEqual(aJour.pages, pages);

  for (const etat of [RANGEE.ABSENTE, RANGEE.PERIMEE]) {
    const refus = restitutionReutilisable({ etat, markdown: enFichierMarkdown(pages) });
    assert.equal(refus.reutilisable, false, `${etat} ne doit pas se reprendre`);
  }

  // Rangé sans marqueur : plus de lecture « Origine », plus de mesure par page.
  // Le servir donnerait un document d'une seule page, ce qu'il n'est pas.
  assert.equal(restitutionReutilisable({ etat: RANGEE.A_JOUR, markdown: "# Réunion" }).reutilisable, false);
  assert.equal(restitutionReutilisable().reutilisable, false);
});
