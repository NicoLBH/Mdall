import test from "node:test";
import assert from "node:assert/strict";

import {
  DOSSIER_DES_CR, PHRASES_DU_RANGEMENT, RANGEE, sourceRangee, transcriptionRangee
} from "./restitution-rangee.js";
import {
  empreinteDesPages, rangerLaRestitution, relireLaRestitution
} from "./ranger-la-restitution.js";

/* ── Où les comptes rendus se rangent ───────────────────────────────────── */

/**
 * **Un dossier par nature, et non un dossier par document.** Chaque compte
 * rendu ouvrait le sien, nommé comme son PDF : sur un chantier qui tient deux
 * ans, quarante dossiers à la racine de Documents, un par réunion, deux
 * fichiers dedans. On ne retrouvait plus un compte rendu qu'en connaissant déjà
 * le nom de son fichier.
 */
test("les comptes rendus se rangent tous au même endroit", () => {
  assert.equal(DOSSIER_DES_CR, "CR de chantier");
});

/* ── Trois états, et non deux ────────────────────────────────────────────── */

const SIGNE = "a".repeat(64);
const AUTRE = "b".repeat(64);

const unDocument = (surcharge = {}) => ({
  id: "d-1", filename: "CR_07.pdf", content_fingerprint: SIGNE, ...surcharge
});

test("rien de rangé : il faut transcrire", () => {
  assert.deepEqual(
    transcriptionRangee(unDocument(), { empreinte: SIGNE }),
    { etat: RANGEE.ABSENTE, markdown: "" }
  );
  assert.equal(transcriptionRangee(null, { empreinte: SIGNE }).etat, RANGEE.ABSENTE);
});

/**
 * **C'est ce qui évite de repayer.** Le second dépôt du même document relit ce
 * qui est rangé au lieu de rappeler le modèle.
 */
test("une transcription du même texte se relit", () => {
  const trouvee = transcriptionRangee(
    unDocument({ transcription_markdown: "# Réunion n° 7" }), { empreinte: SIGNE }
  );

  assert.equal(trouvee.etat, RANGEE.A_JOUR);
  assert.equal(trouvee.markdown, "# Réunion n° 7");
});

/**
 * **Le piège.** Le fichier a pu être remplacé depuis. Confondu avec « à jour »,
 * on afficherait la transcription d'un document en croyant lire celle d'un
 * autre — sans rien pour s'en apercevoir (règle 5). Confondu avec « absente »,
 * on écraserait silencieusement du travail rangé.
 */
test("une transcription d'un autre texte n'est ni à jour ni absente", () => {
  const trouvee = transcriptionRangee(
    unDocument({ content_fingerprint: AUTRE, transcription_markdown: "# Autre" }),
    { empreinte: SIGNE }
  );

  assert.equal(trouvee.etat, RANGEE.PERIMEE);
  assert.equal(trouvee.markdown, "", "une transcription périmée ne se sert pas");
});

/**
 * Ne pas savoir de quel texte vient une transcription n'autorise pas à la
 * servir comme si elle venait de celui-ci.
 */
test("sans empreinte, on ne conclut pas qu'elle est à jour", () => {
  assert.equal(
    transcriptionRangee(
      unDocument({ content_fingerprint: null, transcription_markdown: "# x" }),
      { empreinte: SIGNE }
    ).etat,
    RANGEE.PERIMEE
  );
  assert.equal(
    transcriptionRangee(unDocument({ transcription_markdown: "# x" }), { empreinte: "" }).etat,
    RANGEE.PERIMEE
  );
});

test("chaque état a sa phrase", () => {
  for (const etat of Object.values(RANGEE)) {
    assert.ok(PHRASES_DU_RANGEMENT[etat], `l'état « ${etat} » n'a pas de phrase`);
  }
  // Celle qui compte : elle dit que rien n'a été payé.
  assert.match(PHRASES_DU_RANGEMENT[RANGEE.A_JOUR], /aucun appel au modèle/);
});

/* ── Le document, déposé une seule fois ──────────────────────────────────── */

/**
 * **C'est l'empreinte qui retrouve le document, pas son nom.** Le même compte
 * rendu s'appelle `CR_07.pdf` chez l'un et `07 - CR.pdf` chez l'autre ; deux
 * comptes rendus différents s'appellent tous deux `CR.pdf`.
 */
test("le document déjà rangé se retrouve par son empreinte", () => {
  const fichiers = [
    { id: "p-1", filename: "CR_07.pdf", content_fingerprint: SIGNE },
    { id: "p-2", filename: "CR_08.pdf", content_fingerprint: AUTRE }
  ];

  assert.equal(sourceRangee(fichiers, { empreinte: SIGNE })?.id, "p-1");
  assert.equal(sourceRangee(fichiers, { empreinte: "c".repeat(64) }), null);
  // Sans empreinte, on ne réemploie rien : on ne saurait pas quoi.
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
function baseEnMemoire({ dossiers = [], fichiers = [], chemins = [] } = {}) {
  const journal = { deposes: [], modifies: [], dossiersCrees: [], chemins };
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
    poserLaTranscription: async (id, patch) => {
      const ligne = fichiers.find((fichier) => fichier.id === id);
      if (!ligne) return null;
      Object.assign(ligne, patch);
      journal.modifies.push({ id, ...patch });
      return ligne;
    },
    qui: async () => "moi"
  };

  return { portes, journal, dossiers, fichiers };
}

const unPdf = (nom = "CR_07.pdf") => new File(["%PDF"], nom, { type: "application/pdf" });

/**
 * **Un document, un endroit.** La transcription n'est plus un second fichier à
 * côté du PDF : l'arbre des Fichiers montrait deux entrées pour un seul
 * document, et il fallait savoir laquelle ouvrir.
 */
test("ranger dépose le seul PDF, sa transcription sur sa ligne", async () => {
  const { portes, journal } = baseEnMemoire();

  const range = await rangerLaRestitution({
    projectId: "projet", fichier: unPdf(), markdown: "# Réunion n° 7", empreinte: "abc", portes
  });

  assert.equal(range.range, true);
  assert.deepEqual(journal.dossiersCrees, [DOSSIER_DES_CR]);
  assert.deepEqual(journal.deposes.map((ligne) => ligne.filename), ["CR_07.pdf"]);
  assert.deepEqual(journal.deposes.map((ligne) => ligne.document_kind), ["source_pdf"]);
  assert.equal(journal.deposes[0].transcription_markdown, "# Réunion n° 7");
  assert.equal(journal.deposes[0].content_fingerprint, "abc");
  assert.ok(journal.deposes[0].transcribed_at, "la transcription n'est pas datée");
  // Et le document rendu est celui sur lequel la suite s'appuiera.
  assert.equal(range.document.id, journal.deposes[0].id);
});

/**
 * **C'est la raison d'être de l'étape.** Redéposer le même compte rendu ne doit
 * plus refaire la transcription — donc ne plus la payer.
 */
test("le même document relu ne rappelle pas le modèle", async () => {
  const base = baseEnMemoire();
  await rangerLaRestitution({
    projectId: "projet", fichier: unPdf(), markdown: "# Réunion n° 7", empreinte: "abc",
    portes: base.portes
  });

  const relecture = baseEnMemoire({ dossiers: base.dossiers, fichiers: base.fichiers });
  const relue = await relireLaRestitution({
    projectId: "projet", fichier: unPdf(), empreinte: "abc", portes: relecture.portes
  });

  assert.equal(relue.etat, RANGEE.A_JOUR);
  assert.equal(relue.markdown, "# Réunion n° 7");
  assert.equal(relecture.journal.deposes.length, 0, "relire ne dépose rien");
});

/**
 * Le piège de l'étape. Le fichier a été remplacé depuis : servir la
 * transcription rangée afficherait un compte rendu en croyant lire l'autre.
 */
test("un autre texte ne rend pas la transcription rangée", async () => {
  const base = baseEnMemoire();
  await rangerLaRestitution({
    projectId: "projet", fichier: unPdf(), markdown: "# Réunion n° 7", empreinte: "abc",
    portes: base.portes
  });

  const suite = baseEnMemoire({ dossiers: base.dossiers, fichiers: base.fichiers });
  const relue = await relireLaRestitution({
    projectId: "projet", fichier: unPdf(), empreinte: "zzz", portes: suite.portes
  });

  // L'empreinte ne retrouve aucun document : celui qui est là vient d'un autre
  // texte, et ce n'est donc pas le même compte rendu.
  assert.equal(relue.etat, RANGEE.ABSENTE);
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
  // précisément le conflit qu'on cherche ici : le nom `CR_07.pdf` est déjà pris.
  const suite = baseEnMemoire({
    dossiers: base.dossiers, fichiers: base.fichiers, chemins: base.journal.chemins
  });
  const range = await rangerLaRestitution({
    projectId: "projet", fichier: unPdf(), markdown: "# Réunion n° 8", empreinte: "zzz",
    portes: suite.portes
  });

  assert.equal(range.range, true, "la seconde version n'a pas pu se ranger");
  assert.equal(suite.journal.deposes.length, 1);
  assert.equal(suite.journal.deposes[0].transcription_markdown, "# Réunion n° 8");
});

/**
 * Le document est là, sa transcription manque : c'est **sa ligne** qu'on
 * complète. Un second dépôt en ferait un doublon du même PDF dans le dossier.
 */
test("un document déjà déposé reçoit sa transcription sans se dédoubler", async () => {
  const base = baseEnMemoire({
    dossiers: [{ id: "dossier-cr", name: DOSSIER_DES_CR }],
    fichiers: [{
      id: "p-1", folder_id: "dossier-cr", filename: "CR_07.pdf", content_fingerprint: "abc"
    }]
  });

  const range = await rangerLaRestitution({
    projectId: "projet", fichier: unPdf(), markdown: "# Réunion n° 7", empreinte: "abc",
    portes: base.portes
  });

  assert.equal(range.range, true);
  assert.equal(base.journal.deposes.length, 0, "le PDF a été redéposé");
  assert.deepEqual(base.journal.modifies.map((patch) => patch.id), ["p-1"]);
  assert.equal(base.journal.modifies[0].transcription_markdown, "# Réunion n° 7");
});

/**
 * **Le dossier ne se crée qu'une fois.** Deux comptes rendus, un dossier, deux
 * fichiers : c'est tout l'objet du changement. Un second dossier créé au second
 * dépôt remettrait la racine de Documents dans l'état qu'on vient de quitter.
 */
test("deux comptes rendus partagent le dossier", async () => {
  const base = baseEnMemoire();

  await rangerLaRestitution({
    projectId: "projet", fichier: unPdf("CR_07.pdf"), markdown: "# Réunion 7",
    empreinte: "abc", portes: base.portes
  });
  await rangerLaRestitution({
    projectId: "projet", fichier: unPdf("CR_08.pdf"), markdown: "# Réunion 8",
    empreinte: "def", portes: base.portes
  });

  assert.deepEqual(base.journal.dossiersCrees, [DOSSIER_DES_CR]);
  assert.deepEqual(base.journal.deposes.map((ligne) => ligne.filename), ["CR_07.pdf", "CR_08.pdf"]);
  assert.equal(new Set(base.journal.deposes.map((ligne) => ligne.folder_id)).size, 1);
});

/**
 * Et le second se relit sans rappeler le modèle, alors qu'il voisine avec le
 * premier : c'est l'empreinte qui le retrouve, pas le dossier.
 */
test("le second compte rendu se relit sans rappeler le modèle", async () => {
  const base = baseEnMemoire();

  for (const [nom, markdown, empreinte] of [
    ["CR_07.pdf", "# Réunion 7", "abc"], ["CR_08.pdf", "# Réunion 8", "def"]
  ]) {
    await rangerLaRestitution({
      projectId: "projet", fichier: unPdf(nom), markdown, empreinte, portes: base.portes
    });
  }

  const relue = await relireLaRestitution({
    projectId: "projet", fichier: unPdf("CR_08.pdf"), empreinte: "def", portes: base.portes
  });

  assert.equal(relue.etat, RANGEE.A_JOUR);
  assert.equal(relue.markdown, "# Réunion 8");
});
