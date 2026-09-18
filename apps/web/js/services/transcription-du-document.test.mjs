import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  lignesDuFichier, nomDeLaTranscription, phraseDeLaTranscription, transcriptionDuDocument
} from "./transcription-du-document.js";
import { renderFichierDeCode } from "../views/ui/fichier-de-code.js";

/** Une ligne de document, telle que la base la rend. Aucun nom réel. */
const DOCUMENT = {
  id: "d-1",
  original_filename: "CR de chantier n12.pdf",
  filename: "cr-de-chantier-n12.pdf",
  transcription_markdown: "# Compte rendu n° 12\n\n## LOT 02 — GROS ŒUVRE\n\n- Ferraillage à reprendre\n",
  transcribed_at: "2026-03-12T10:00:00Z",
  content_fingerprint: "abc123"
};

/* ── Les lignes ──────────────────────────────────────────────────────────── */

test("les lignes sont numérotées à partir de 1", () => {
  assert.deepEqual(lignesDuFichier("un\ndeux"), [
    { rang: 1, lu: "un" }, { rang: 2, lu: "deux" }
  ]);
});

test("les lignes vides sont gardées", () => {
  // Elles séparent les blocs d'un Markdown, et les retirer décalerait tous les
  // numéros — un renvoi à « la ligne 214 » ne tomberait plus au même endroit
  // selon qui compte.
  assert.deepEqual(lignesDuFichier("a\n\nb").map((l) => l.rang), [1, 2, 3]);
  assert.equal(lignesDuFichier("a\n\nb")[1].lu, "");
});

test("les trois fins de ligne se valent", () => {
  // Un Markdown venu d'un modèle peut porter des retours Windows : couper sur
  // « \\n » seul laisserait un « \\r » en bout de chaque ligne, invisible, qui
  // décale l'affichage d'un caractère.
  assert.deepEqual(lignesDuFichier("a\r\nb").map((l) => l.lu), ["a", "b"]);
  assert.deepEqual(lignesDuFichier("a\rb").map((l) => l.lu), ["a", "b"]);
});

test("un fichier vide n'a aucune ligne", () => {
  assert.deepEqual(lignesDuFichier(""), []);
  assert.deepEqual(lignesDuFichier(null), []);
});

/* ── La transcription d'un document ──────────────────────────────────────── */

test("un document transcrit rend ses lignes, sa date et son empreinte", () => {
  const lue = transcriptionDuDocument(DOCUMENT);

  assert.equal(lue.lignes.length, 6);
  assert.equal(lue.lignes[0].lu, "# Compte rendu n° 12");
  assert.equal(lue.quand, "2026-03-12T10:00:00Z");
  assert.equal(lue.empreinte, "abc123");
});

test("un document jamais transcrit n'en a pas", () => {
  assert.equal(transcriptionDuDocument({ ...DOCUMENT, transcription_markdown: null }), null);
  assert.equal(transcriptionDuDocument({ ...DOCUMENT, transcription_markdown: "   " }), null);
  assert.equal(transcriptionDuDocument(null), null);
});

test("la phrase dit le nombre de lignes ET la date", () => {
  // Le nombre seul ne dit pas si elle est fraîche ; la date seule ne dit pas ce
  // qu'il y a à lire. Une transcription vieille de six mois sur un document
  // redéposé depuis ne dit plus ce que le PDF porte.
  assert.equal(phraseDeLaTranscription(transcriptionDuDocument(DOCUMENT)),
    "6 lignes, transcrit le 12 mars 2026");
});

test("une date illisible se dit inconnue, et ne s'invente pas", () => {
  const sansDate = transcriptionDuDocument({ ...DOCUMENT, transcribed_at: "bientôt" });

  assert.match(phraseDeLaTranscription(sansDate), /date inconnue/);
  assert.equal(phraseDeLaTranscription(null), "");
});

test("la transcription porte le nom du document, en .md", () => {
  assert.equal(nomDeLaTranscription(DOCUMENT), "CR de chantier n12.md");
  assert.equal(nomDeLaTranscription({ filename: "note.pdf" }), "note.md");
  assert.equal(nomDeLaTranscription(null), "document.md");
});

/* ── Le fichier de code ──────────────────────────────────────────────────── */

test("chaque ligne porte son numéro, et réutilise les classes de la Mémoire", () => {
  // Deux écrans dessinent déjà des lignes numérotées. En écrire un troisième
  // jeu de classes aurait fait trois calages à recaler ensemble, dont deux
  // finiraient en retard sur le premier.
  const html = renderFichierDeCode(lignesDuFichier("un\ndeux"));

  assert.match(html, /<span class="memoire-ligne__num">1<\/span>/);
  assert.match(html, /<span class="memoire-ligne__num">2<\/span>/);
  assert.equal((html.match(/class="memoire-ligne"/g) ?? []).length, 2);
});

test("le Markdown ne se rend pas, il se montre", () => {
  // C'est le point : une transcription est ce que le modèle a compris du PDF.
  // Rendue en HTML, elle se lit comme un document du projet et l'on ne voit plus
  // ce qui a été ajouté ou inventé — exactement ce qu'on vient vérifier.
  const html = renderFichierDeCode(lignesDuFichier("# Titre\n\n**gras**"));

  assert.equal(/<h1|<strong|<em\b/.test(html), false, "le Markdown a été rendu");
  assert.match(html, /# Titre/);
  assert.match(html, /\*\*gras\*\*/);
});

test("une ligne vide garde sa hauteur", () => {
  // Sans l'espace insécable, elle se replierait à zéro pixel et les numéros ne
  // tomberaient plus en face du texte du PDF qu'on compare.
  const html = renderFichierDeCode(lignesDuFichier("a\n\nb"));

  assert.match(html, /&nbsp;/);
});

test("ce qui vient du document est échappé", () => {
  // Un compte rendu qui parlerait de balises ne doit pas les voir exécutées.
  const html = renderFichierDeCode(lignesDuFichier("<script>alert(1)</script>"));

  assert.equal(html.includes("<script>"), false);
  assert.match(html, /&lt;script&gt;/);
});

test("sans lignes, on dit pourquoi plutôt que de ne rien montrer", () => {
  assert.match(renderFichierDeCode([], { vide: "Ce document n'a pas été transcrit." }),
    /Ce document n&#39;a pas été transcrit\./);
  assert.equal(renderFichierDeCode([]), "");
});

/* ── L'écran Documents la relit ──────────────────────────────────────────── */

test("le listing descend la date, jamais le Markdown", () => {
  // Quarante comptes rendus feraient quarante fichiers Markdown au chargement
  // d'un dossier qu'on ouvre pour en lire un seul. Une date dit qu'il y a
  // quelque chose à lire, sans le lire.
  const lecture = readFileSync(new URL("./project-supabase-sync.js", import.meta.url), "utf8");
  const select = lecture.match(/fileParams\.set\("select", "([^"]*)"\)/)[1];

  assert.ok(select.includes("transcribed_at"), "le listing ne dit pas si un document est transcrit");
  assert.equal(select.includes("transcription_markdown"), false,
    "le listing descend le Markdown de chaque fichier");
});

test("la transcription se lit à la demande, sur un seul document", () => {
  const transport = readFileSync(
    new URL("./transcription-du-document-supabase.js", import.meta.url), "utf8"
  );

  assert.match(transport, /\.eq\("id", id\)/, "la lecture n'est pas bornée à un document");
  assert.match(transport, /transcription_markdown/, "la lecture ne descend pas la transcription");
  // Une erreur rend `null`, jamais une ligne vide : « pas de transcription » et
  // « je n'ai pas su lire » demandent deux gestes différents (règle 5).
  assert.match(transport, /if \(error\) return null;/);
});

test("l'écran bascule entre la page et la transcription", () => {
  // C'est une lecture du même document, pas un second document : on passe de
  // l'un à l'autre pour les comparer.
  const ecran = readFileSync(new URL("../views/project-documents.js", import.meta.url), "utf8");

  assert.match(ecran, /action === "basculer-la-lecture"/, "le geste n'est pas branché");
  assert.match(
    ecran,
    /\$\{docsViewState\.pdfPreview\?\.lecture === "transcription"\s*\n\s*\? renderTranscriptionDuDocument\(documentItem\)\s*\n\s*: isLoadingPreview/,
    "le corps ne montre pas la transcription quand on la demande"
  );
});

test("on arrive sur la page, pas sur la transcription", () => {
  // Ouvrir sur ce que le modèle a lu ferait lire le modèle avant d'avoir
  // regardé le document.
  const ecran = readFileSync(new URL("../views/project-documents.js", import.meta.url), "utf8");
  const ouverture = ecran.slice(
    ecran.indexOf("async function openPdfPreview"), ecran.indexOf("async function basculerLaLecture")
  );

  assert.match(ouverture, /lecture: "pdf",/, "l'aperçu ne s'ouvre pas sur la page");
});

test("la transcription ne se relit pas à chaque bascule", () => {
  // Elle ne change pas tant qu'on n'a pas refait de restitution : la relire
  // ferait un aller-retour au réseau pour montrer ce qu'on a déjà.
  const ecran = readFileSync(new URL("../views/project-documents.js", import.meta.url), "utf8");
  const bascule = ecran.slice(
    ecran.indexOf("async function basculerLaLecture"), ecran.indexOf("function closePdfPreview")
  );

  assert.match(bascule, /apercu\.lecture !== "transcription" \|\| apercu\.transcriptionLue/,
    "la transcription se relit à chaque bascule");
  // Et l'écran a pu changer pendant la lecture : écrire dans un aperçu qu'on a
  // fermé ferait réapparaître une transcription sur le document suivant.
  assert.match(bascule, /if \(docsViewState\.pdfPreview !== apercu\) return;/,
    "une lecture tardive s'écrit dans l'aperçu suivant");
});

test("la bascule ne s'affiche que s'il y a quelque chose à voir", () => {
  // Un bouton qui mène à « pas de transcription » se clique une fois, et l'on
  // cesse de le regarder.
  const ecran = readFileSync(new URL("../views/project-documents.js", import.meta.url), "utf8");

  assert.match(ecran, /\$\{documentItem\?\.transcribedAt\s*\n?\s*\?/,
    "la bascule s'affiche sur un document jamais transcrit");
});

test("« lue et vide » ne se dit pas comme « pas lue »", () => {
  // La première envoie relancer une restitution, la seconde réessayer.
  const ecran = readFileSync(new URL("../views/project-documents.js", import.meta.url), "utf8");
  const rendu = ecran.slice(
    ecran.indexOf("function renderTranscriptionDuDocument"), ecran.indexOf("function renderPdfPreviewView")
  );

  assert.match(rendu, /if \(!apercu\.transcriptionLue\)/, "les deux silences se confondent");
  assert.match(rendu, /n'a pas pu être lue/);
  assert.match(rendu, /n'a pas de transcription/);
});
