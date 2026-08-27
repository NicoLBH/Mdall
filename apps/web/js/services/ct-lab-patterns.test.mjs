import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_LEXICON_TEXT,
  DEFAULT_PATTERN_TEXT,
  buildExtractionParams,
  parseLexicon,
  parsePatterns,
  previewMatches
} from "./ct-lab-patterns.js";

test("les motifs par défaut se compilent tous", () => {
  const { patterns, errors } = parsePatterns(DEFAULT_PATTERN_TEXT);

  assert.deepEqual(errors, []);
  assert.equal(patterns.length, 3);
  for (const pattern of patterns) {
    assert.doesNotThrow(() => new RegExp(pattern.source, pattern.flags));
  }
});

test("le lexique par défaut se parse et garde ses variantes", () => {
  const { lexicon, errors } = parseLexicon(DEFAULT_LEXICON_TEXT);

  assert.deepEqual(errors, []);
  const favorable = lexicon.find((entry) => entry.id === "favorable");
  assert.deepEqual(favorable.labels, ["avis favorable", "favorable"]);
});

test("commentaires et lignes vides sont ignorés", () => {
  const { patterns } = parsePatterns("# rien\n\n   \n^(?<reference>\\d+) (?<rest>.+)$");
  assert.equal(patterns.length, 1);

  const { lexicon } = parseLexicon("# rien\n\nok = conforme");
  assert.equal(lexicon.length, 1);
});

test("une expression régulière invalide est signalée avec son numéro de ligne", () => {
  const { patterns, errors } = parsePatterns("^(?<reference>\\d+ (?<rest>.+$");

  assert.deepEqual(patterns, []);
  assert.match(errors[0], /^ligne 1 : expression régulière invalide/);
});

test("un motif sans groupe reference est refusé", () => {
  const { errors } = parsePatterns("^(?<rest>.+)$");
  assert.match(errors[0], /il manque le groupe \(\?<reference>/);
});

test("un motif sans rest ni opinion est refusé", () => {
  const { errors } = parsePatterns("^(?<reference>\\d+)$");
  assert.match(errors[0], /il manque \(\?<rest>…\) ou \(\?<opinion>…\)/);
});

test("un lexique mal formé est signalé ligne par ligne", () => {
  const { lexicon, errors } = parseLexicon("favorable\n= vide\nok =\nok2 = a\nok2 = b");

  assert.equal(lexicon.length, 1);
  assert.equal(errors.length, 4);
  assert.match(errors[0], /ligne 1 .*identifiant = libellé/);
  assert.match(errors[1], /ligne 2 : identifiant vide/);
  assert.match(errors[2], /ligne 3 : aucun libellé/);
  assert.match(errors[3], /ligne 5 .*déjà défini/);
});

test("aucun motif utilisable est une erreur explicite, pas un silence", () => {
  const { errors } = parsePatterns("# que des commentaires");
  assert.match(errors[0], /aucun motif/);
});

test("un lexique vide reste accepté : aucun avis reconnu est une réponse honnête", () => {
  const { params, errors } = buildExtractionParams(DEFAULT_PATTERN_TEXT, "# rien");

  assert.deepEqual(errors, []);
  assert.deepEqual(params.extraction.lexicon, []);
  assert.equal(params.extraction.patterns.length, 3);
});

test("buildExtractionParams préfixe les erreurs par leur origine", () => {
  const { errors } = buildExtractionParams("(((", "favorable");

  assert.match(errors[0], /^Motifs — /);
  assert.match(errors[1], /^Lexique — /);
});

test("previewMatches compte ce que les motifs voient réellement", () => {
  const { patterns } = parsePatterns(DEFAULT_PATTERN_TEXT);
  const text = [
    "RAPPORT DE CONTRÔLE",
    "",
    "Avis n° 65 : Défavorable — note de calcul absente.",
    "Avis n° 66 : Favorable — rien à signaler."
  ].join("\n");

  const preview = previewMatches(text, patterns);

  assert.equal(preview.matchedCount, 2);
  assert.equal(preview.nonEmptyLineCount, 3);
  assert.deepEqual(preview.samples.map((sample) => sample.reference), ["65", "66"]);
  assert.equal(preview.samples[0].lineNumber, 3);
});

test("previewMatches signale zéro sur une mise en page en colonnes", () => {
  const { patterns } = parsePatterns(DEFAULT_PATTERN_TEXT);
  // Un tableau extrait d'un PDF ressort souvent cellule par cellule.
  const text = ["2.1.3", "Défavorable", "Stabilité au feu non justifiée", "2.1.4", "Favorable"].join("\n");

  const preview = previewMatches(text, patterns);

  assert.equal(preview.matchedCount, 0);
  assert.equal(preview.nonEmptyLineCount, 5);
  assert.deepEqual(preview.samples, []);
});

test("previewMatches borne ses exemples sans fausser le compte", () => {
  const { patterns } = parsePatterns(DEFAULT_PATTERN_TEXT);
  const text = Array.from({ length: 30 }, (_, index) => `Avis n° ${index + 1} : Favorable — texte.`).join("\n");

  const preview = previewMatches(text, patterns, { limit: 5 });

  assert.equal(preview.matchedCount, 30);
  assert.equal(preview.samples.length, 5);
});

test("un motif personnalisé remplace les motifs par défaut", () => {
  const { patterns, errors } = parsePatterns("^(?<reference>\\d+\\.\\d+)\\s+(?<opinion>F|D|S)\\s+(?<rest>.+)$");

  assert.deepEqual(errors, []);
  const preview = previewMatches("2.13 D Stabilité au feu non justifiée", patterns);
  assert.equal(preview.matchedCount, 1);
  assert.equal(preview.samples[0].reference, "2.13");
});

test("le motif tableau reconnaît « 2.1.3 Défavorable texte »", () => {
  const { patterns, errors } = parsePatterns(DEFAULT_PATTERN_TEXT);
  assert.deepEqual(errors, []);

  const preview = previewMatches(
    [
      "2.1.3 Défavorable Stabilité au feu de la charpente non justifiée",
      "2.1.4 Favorable Étanchéité de toiture conforme"
    ].join("\n"),
    patterns
  );

  assert.equal(preview.matchedCount, 2);
  assert.deepEqual(preview.samples.map((sample) => sample.reference), ["2.1.3", "2.1.4"]);
});

test("un code isolé n'est pas un avis pour les motifs de ligne", () => {
  const { patterns } = parsePatterns(DEFAULT_PATTERN_TEXT);

  // « D » n'est un avis que si la légende du document le déclare : c'est la
  // lecture en blocs qui s'en charge. Le reconnaître ici reviendrait à inventer
  // un vocabulaire — c'est ainsi qu'un avis « R » était apparu.
  const preview = previewMatches("3.2.1 D Désenfumage : PV non transmis\n4.1 R Texte quelconque", patterns);

  assert.equal(preview.matchedCount, 0);
});

test("le motif tableau ne transforme pas n'importe quelle ligne numérotée en avis", () => {
  const { patterns } = parsePatterns(DEFAULT_PATTERN_TEXT);

  const preview = previewMatches(
    [
      "12.5 m de hauteur sous plafond",
      "3.1 Le présent rapport porte sur la phase APD",
      "2026.03 Date d'émission du document",
      "1.2 Conditions générales d'intervention"
    ].join("\n"),
    patterns
  );

  assert.equal(preview.matchedCount, 0, "seule une formulation d'avis connue peut déclencher le motif tableau");
});
