/**
 * La couleur et les colonnes, **sur un vrai PDF**.
 *
 * ## Pourquoi ce fichier ne se contente pas de fragments inventés
 *
 * `page-en-grille.test.mjs` vérifie ce qu'on fait de la géométrie. Il ne
 * vérifie pas qu'on l'obtient : entre le fichier et les fragments il y a
 * pdf.js, sa liste d'opérations, son découpage du texte, et la correspondance
 * fragile qu'on établit entre les deux. Tout cela peut se rompre sans qu'une
 * seule assertion sur des objets écrits à la main ne bouge.
 *
 * Le PDF est donc **écrit ici, octet par octet**, et relu par le vrai moteur.
 * Deux colonnes, une mention rouge, une mention bleue, une flèche indentée :
 * de quoi tenir la promesse faite à la consigne.
 *
 * ## Pourquoi il est écrit et non déposé
 *
 * Aucun document de chantier réel n'entre dans le dépôt : ils portent des noms
 * d'entreprises et de personnes. Celui-ci n'a ni l'un ni l'autre — il est
 * fabriqué pour ce test, et il ne ressemble à rien d'existant.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const CHEMIN_PDFJS = fileURLToPath(new URL("../../vendor/unpdf/pdfjs.mjs", import.meta.url));

/** Un PDF minimal, écrit à la main. Deux colonnes, deux couleurs, une flèche. */
function ecrireLePdf() {
  const contenu = [
    "BT /F1 11 Tf 1 0 0 1 56 750 Tm (LOT 02 - GROS OEUVRE) Tj ET",
    "BT /F1 10 Tf 1 0 0 1 56 730 Tm (Reprise d etancheite en toiture, angle) Tj ET",
    "BT /F1 10 Tf 1 0 0 1 400 730 Tm (12/03/2026) Tj ET",
    "BT /F1 10 Tf 1 0 0 1 470 730 Tm (30/04/2026) Tj ET",
    "BT /F1 10 Tf 1 0 0 1 56 716 Tm (nord-ouest, avant reception) Tj ET",
    "BT 1 0 0 rg /F1 10 Tf 1 0 0 1 56 690 Tm (Presence obligatoire au prochain rendez-vous) Tj ET",
    "BT 0 0 1 rg /F1 10 Tf 1 0 0 1 56 674 Tm (a faire) Tj ET",
    "BT 0 g /F1 10 Tf 1 0 0 1 86 658 Tm (-> depend du lot 05) Tj ET"
  ].join("\n");

  const objets = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
      + "/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${contenu.length} >>\nstream\n${contenu}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  ];

  let pdf = "%PDF-1.4\n";
  const positions = [];
  objets.forEach((corps, rang) => {
    positions.push(pdf.length);
    pdf += `${rang + 1} 0 obj\n${corps}\nendobj\n`;
  });

  const xref = pdf.length;
  pdf += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`;
  for (const position of positions) pdf += `${String(position).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  const fichier = join(mkdtempSync(join(tmpdir(), "mdall-pdf-")), "essai.pdf");
  writeFileSync(fichier, pdf, "latin1");
  return fichier;
}

async function lireLaPage() {
  const { readFileSync } = await import("node:fs");
  const { extractPositionedPages } = await import("./pdf-extraction.js");
  const pdfjs = await import(CHEMIN_PDFJS);

  const bytes = new Uint8Array(readFileSync(ecrireLePdf()));
  const pages = await extractPositionedPages(bytes, { pdfjs });
  return pages[0];
}

/**
 * **Sans le moteur vendu, on ne conclut pas.** Un test qui passerait faute de
 * pouvoir échouer vaut moins que pas de test : il ferait croire que la chaîne
 * tient alors que personne ne l'a exercée (règle 5).
 */
const sansMoteur = !existsSync(CHEMIN_PDFJS);
const siLeMoteurEstLa = {
  skip: sansMoteur ? "moteur PDF absent — lancer « npm run build:web »" : false
};

test("un PDF rend la couleur de son texte", siLeMoteurEstLa, async () => {
  const { nomDeLaCouleur } = await import("./couleurs-du-pdf.js");
  const page = await lireLaPage();

  const couleurDe = (debut) =>
    nomDeLaCouleur(page.items.find((item) => item.text.startsWith(debut))?.couleur);

  assert.equal(couleurDe("Presence obligatoire"), "rouge");
  assert.equal(couleurDe("a faire"), "bleu");
  // Le texte ordinaire ne se colore pas : l'annoncer noierait les deux autres.
  assert.equal(couleurDe("Reprise"), "");
  assert.equal(couleurDe("-> depend"), "");
});

/**
 * Le défaut que toute cette étape corrige : dans le texte aplati, les deux
 * dates de droite tombent entre « angle » et « nord-ouest ».
 */
test("un PDF à deux colonnes se repose sans mélanger ses cellules", siLeMoteurEstLa, async () => {
  const { pageEnMiseEnPage } = await import("./page-en-grille.js");
  const page = await lireLaPage();

  const rendu = pageEnMiseEnPage(page.items);
  const lignes = rendu.split("\n");

  assert.match(lignes[1], /^Reprise d.etancheite en toiture, angle\s+12\/03\/2026\s+30\/04\/2026$/);
  assert.equal(lignes[2], "nord-ouest, avant reception");

  // La flèche reste sur sa ligne, et son cran avec elle.
  const flechee = lignes.find((ligne) => ligne.includes("->"));
  assert.ok(flechee.startsWith(" "), "le cran de la flèche a disparu");

  // Et les couleurs se disent, nommées.
  assert.match(rendu, /ROUGE : « Presence obligatoire au prochain rendez-vous »/);
  assert.match(rendu, /BLEU : « a faire »/);
});
