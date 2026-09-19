import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { TROU } from "./trous-dun-mail.js";
import {
  FORME_DU_CORPS, decouperLeMultipart, laDateRfc5322, lesAdresses, objetNu,
  separerLesEnTetes, uneAdresse, unMailDeplie, valeurDe, valeurEtParametres
} from "./un-mail-deplie.js";

// Aucun mail réel n'entre ici : les noms, les sociétés et la commune sont
// inventés, et les domaines sont en « .example », que rien ne résout.
const mail = (...lignes) => lignes.join("\r\n");
const aBien = (deplie, quoi) => deplie.trous.some((trou) => trou.quoi === quoi);

const B64_PHRASE = "TGUgc3VwcG9ydCBlc3QgaHVtaWRlIGF1IGRyb2l0IGRlIGwnYWNyb3TDqHJlLg==";
const QP_PHRASE = "Le support est humide au droit de l'acrot=C3=A8re.";
const QP_PHRASE_1252 = "Le support est humide au droit de l'acrot=E8re.";
const PHRASE = "Le support est humide au droit de l'acrotère.";

const SIMPLE = mail(
  "From: Ourdine Ferrand <o.ferrand@novaclim.example>",
  "To: Bureau VERIFAS <controle@verifas.example>",
  "Date: Thu, 12 Mar 2026 09:14:00 +0100",
  "Subject: Toiture du lot 3",
  "Message-ID: <a1@novaclim.example>",
  "",
  "Le support est humide au droit de l'acrotere.",
  ""
);

// ── Les en-têtes ───────────────────────────────────────────────────────────

test("un en-tête replié se recolle avec le blanc qui le coupe", () => {
  const lu = separerLesEnTetes(mail(
    "Subject: Étanchéité de la toiture",
    "  du bâtiment B",
    "",
    "corps"
  ));
  assert.equal(valeurDe(lu.enTetes, "subject"), "Étanchéité de la toiture  du bâtiment B");
});

test("le nom d'un en-tête se lit sans égard à la casse", () => {
  const lu = separerLesEnTetes(mail("MESSAGE-ID: <a1@novaclim.example>", "", ""));
  assert.equal(valeurDe(lu.enTetes, "message-id"), "<a1@novaclim.example>");
});

test("la ligne « From » d'une boîte mbox n'est pas un en-tête", () => {
  const lu = separerLesEnTetes(mail("From o.ferrand@novaclim.example Thu Mar 12", "Subject: Lot 3", "", "corps"));
  assert.equal(valeurDe(lu.enTetes, "subject"), "Lot 3");
  assert.equal(lu.egare, false);
});

test("le corps commence après la première ligne vide", () => {
  const lu = separerLesEnTetes(mail("Subject: Lot 3", "", "un", "", "deux"));
  assert.equal(lu.corps, "un\n\ndeux");
});

test("un mail sans ligne vide n'a pas de corps, et ce n'est pas une erreur", () => {
  const lu = separerLesEnTetes("Subject: Lot 3");
  assert.equal(lu.corps, "");
  assert.equal(lu.reconnu, true);
});

test("une ligne qui n'est pas un en-tête se signale au lieu de tout faire échouer", () => {
  const deplie = unMailDeplie(mail("Subject: Lot 3", "ceci n'est pas un en-tete", "", "corps"));
  assert.equal(deplie.objet, "Lot 3");
  assert.ok(aBien(deplie, TROU.LIGNE_EGAREE));
});

test("un fichier sans le moindre en-tête se dit tel quel", () => {
  const deplie = unMailDeplie("bonjour, ceci est un fichier de notes");
  assert.ok(aBien(deplie, TROU.PAS_UN_MAIL));
});

test("une chaîne déjà décodée n'est pas dépliée de travers", () => {
  const deplie = unMailDeplie("Subject: un devis à 12 000 €\r\n\r\ncorps");
  assert.ok(aBien(deplie, TROU.PAS_UN_MAIL));
  assert.equal(deplie.corps, null);
});

// ── Qui, à qui ─────────────────────────────────────────────────────────────

test("un nom devant une adresse se sépare de l'adresse", () => {
  assert.deepEqual(uneAdresse("Ourdine Ferrand <o.ferrand@novaclim.example>"), {
    nom: "Ourdine Ferrand", adresse: "o.ferrand@novaclim.example"
  });
});

test("une adresse nue ne se voit pas inventer un nom", () => {
  // « o.ferrand » n'est pas un nom : le prendre pour tel afficherait dans le
  // fil quelqu'un qui ne s'appelle pas ainsi.
  assert.deepEqual(uneAdresse("o.ferrand@novaclim.example"), {
    nom: "", adresse: "o.ferrand@novaclim.example"
  });
});

test("une virgule dans un nom entre guillemets ne coupe pas la liste", () => {
  const liste = lesAdresses("\"BERTRAND, SARL\" <contact@bertrand.example>, controle@verifas.example");
  assert.equal(liste.length, 2);
  assert.equal(liste[0].nom, "BERTRAND, SARL");
  assert.equal(liste[1].adresse, "controle@verifas.example");
});

test("un nom encodé se lit dans la liste des destinataires", () => {
  const liste = lesAdresses("=?UTF-8?Q?Bureau_de_contr=C3=B4le?= <controle@verifas.example>");
  assert.equal(liste[0].nom, "Bureau de contrôle");
});

test("un en-tête de destinataires vide ne fait pas une adresse vide", () => {
  assert.deepEqual(lesAdresses(""), []);
  assert.deepEqual(unMailDeplie(SIMPLE).copie, []);
});

test("un mail sans expéditeur le dit", () => {
  const deplie = unMailDeplie(mail("Subject: Lot 3", "Date: Thu, 12 Mar 2026 09:14:00 +0100", "", "corps"));
  assert.equal(deplie.qui, null);
  assert.ok(aBien(deplie, TROU.SANS_EXPEDITEUR));
});

// ── La date : ce qui ne s'invente pas ──────────────────────────────────────

test("une date complète se lit, fuseau compris", () => {
  const lue = laDateRfc5322("Thu, 12 Mar 2026 09:14:00 +0100");
  assert.equal(lue.quand, "2026-03-12T08:14:00.000Z");
  assert.equal(lue.fuseauConnu, true);
});

test("un commentaire de fuseau ne gêne pas la lecture", () => {
  assert.equal(laDateRfc5322("Thu, 12 Mar 2026 09:14:00 +0100 (CET)").quand, "2026-03-12T08:14:00.000Z");
});

test("un fuseau nommé de la norme obsolète se lit", () => {
  assert.equal(laDateRfc5322("12 Mar 2026 09:14:00 GMT").quand, "2026-03-12T09:14:00.000Z");
});

test("les secondes sont facultatives", () => {
  assert.equal(laDateRfc5322("Thu, 12 Mar 2026 09:14 +0000").quand, "2026-03-12T09:14:00.000Z");
});

test("une année sur deux chiffres suit la règle de la norme", () => {
  assert.equal(laDateRfc5322("12 Mar 26 09:14:00 +0000").quand.slice(0, 4), "2026");
  assert.equal(laDateRfc5322("12 Mar 98 09:14:00 +0000").quand.slice(0, 4), "1998");
});

test("un 31 février ne glisse pas au 3 mars : il ne se lit pas", () => {
  // C'est ce que ferait un moteur laissé seul, et le fil (étape 3) se
  // rangerait alors autour d'une date que personne n'a écrite.
  assert.equal(laDateRfc5322("31 Feb 2026 09:14:00 +0100").panne, TROU.DATE_ILLISIBLE);
});

test("une heure impossible ne se lit pas", () => {
  assert.equal(laDateRfc5322("12 Mar 2026 25:14:00 +0100").panne, TROU.DATE_ILLISIBLE);
  assert.equal(laDateRfc5322("12 Mar 2026 09:74:00 +0100").panne, TROU.DATE_ILLISIBLE);
});

test("une lettre de fuseau militaire ne se devine pas", () => {
  // La norme dit elle-même qu'elles ont été si souvent écrites à l'envers
  // qu'il faut les tenir pour inconnues : les lire décalerait le message
  // d'une demi-journée sans le dire.
  assert.equal(laDateRfc5322("12 Mar 2026 09:14:00 K").panne, TROU.DATE_ILLISIBLE);
});

test("une date qui n'en est pas une ne se lit pas", () => {
  assert.equal(laDateRfc5322("hier matin").panne, TROU.DATE_ILLISIBLE);
  assert.equal(laDateRfc5322("").panne, TROU.DATE_ILLISIBLE);
});

test("-0000 garde l'instant mais dit que le fuseau est inconnu", () => {
  const lue = laDateRfc5322("12 Mar 2026 09:14:00 -0000");
  assert.equal(lue.quand, "2026-03-12T09:14:00.000Z");
  assert.equal(lue.fuseauConnu, false);
});

test("un mail sans Date n'invente pas la date du jour", () => {
  // Le garde-fou central de l'étape 1 : une date inventée ordonnerait le fil
  // et personne ne saurait qu'elle est fausse.
  const deplie = unMailDeplie(mail("From: o.ferrand@novaclim.example", "Subject: Lot 3", "", "corps"));
  assert.equal(deplie.quand, "");
  assert.equal(deplie.quandBrut, "");
  assert.ok(aBien(deplie, TROU.SANS_DATE));
});

test("une date illisible laisse « quand » vide, et garde ce qui était écrit", () => {
  const deplie = unMailDeplie(mail("From: o.ferrand@novaclim.example", "Date: hier matin", "", "corps"));
  assert.equal(deplie.quand, "");
  assert.equal(deplie.quandBrut, "hier matin");
  assert.ok(aBien(deplie, TROU.DATE_ILLISIBLE));
});

test("un fuseau absent se signale sur le mail entier", () => {
  const deplie = unMailDeplie(mail("From: o.ferrand@novaclim.example", "Date: 12 Mar 2026 09:14:00 -0000", "", "x"));
  assert.equal(deplie.quand, "2026-03-12T09:14:00.000Z");
  assert.ok(aBien(deplie, TROU.FUSEAU_ABSENT));
});

test("le dépliage n'a pas d'horloge", () => {
  // Défaut invisible de l'extérieur : un recours à l'heure courante ailleurs
  // dans le module ne se verrait sur aucun mail d'épreuve, et ferait mentir
  // le fil le jour où il servirait.
  const source = readFileSync(new URL("./un-mail-deplie.js", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  assert.equal(/Date\.now\(\)|new Date\(\s*\)/.test(source), false);
});

// ── L'objet ────────────────────────────────────────────────────────────────

test("un objet encodé se lit", () => {
  const deplie = unMailDeplie(mail(
    "From: o.ferrand@novaclim.example",
    "Subject: =?UTF-8?Q?=C3=89tanch=C3=A9it=C3=A9_toiture?=",
    "", "corps"
  ));
  assert.equal(deplie.objet, "Étanchéité toiture");
});

test("l'objet nu perd ses préfixes empilés", () => {
  assert.equal(objetNu("Re: TR: Re: Étanchéité toiture"), "Étanchéité toiture");
  assert.equal(objetNu("RE : Fwd: Lot 3"), "Lot 3");
  assert.equal(objetNu("Re[2]: Lot 3"), "Lot 3");
});

test("l'objet nu ne mange pas un objet qui commence par un mot voisin", () => {
  assert.equal(objetNu("Relevé : humidité acrotère"), "Relevé : humidité acrotère");
  assert.equal(objetNu("Étanchéité toiture"), "Étanchéité toiture");
});

test("l'objet complet reste à côté de l'objet nu", () => {
  const deplie = unMailDeplie(mail("From: a@b.example", "Subject: Re: Lot 3", "", "corps"));
  assert.equal(deplie.objet, "Re: Lot 3");
  assert.equal(deplie.objetNu, "Lot 3");
});

// ── Le fil ─────────────────────────────────────────────────────────────────

test("l'identité, la réponse et la chaîne se lisent", () => {
  const deplie = unMailDeplie(mail(
    "From: a@b.example",
    "Message-ID: <c3@novaclim.example>",
    "In-Reply-To: <b2@verifas.example>",
    "References: <a1@novaclim.example>",
    "  <b2@verifas.example>",
    "", "corps"
  ));
  assert.equal(deplie.identite, "<c3@novaclim.example>");
  assert.equal(deplie.enReponseA, "<b2@verifas.example>");
  assert.deepEqual(deplie.chaine, ["<a1@novaclim.example>", "<b2@verifas.example>"]);
});

test("un mail sans Message-ID le dit, parce que son rang se devinera", () => {
  const deplie = unMailDeplie(mail("From: a@b.example", "Subject: Lot 3", "", "corps"));
  assert.equal(deplie.identite, "");
  assert.ok(aBien(deplie, TROU.SANS_IDENTITE));
});

// ── Les paramètres d'un en-tête de contenu ─────────────────────────────────

test("le type et ses paramètres se séparent", () => {
  const lu = valeurEtParametres("text/plain; charset=\"utf-8\"; format=flowed");
  assert.equal(lu.valeur, "text/plain");
  assert.equal(lu.parametres.charset, "utf-8");
  assert.equal(lu.parametres.format, "flowed");
});

test("un point-virgule entre guillemets ne coupe pas les paramètres", () => {
  const lu = valeurEtParametres("attachment; filename=\"lot 3 ; annexe.pdf\"");
  assert.equal(lu.parametres.filename, "lot 3 ; annexe.pdf");
});

test("la forme étendue rend un nom accentué", () => {
  const lu = valeurEtParametres("attachment; filename*=utf-8''%C3%A9tude-humidit%C3%A9.pdf");
  assert.equal(lu.parametres.filename, "étude-humidité.pdf");
});

// ── Le corps : le choix du texte ───────────────────────────────────────────

test("un mail simple rend son corps", () => {
  const deplie = unMailDeplie(SIMPLE);
  assert.equal(deplie.corps, "Le support est humide au droit de l'acrotere.");
  assert.equal(deplie.formeDuCorps, FORME_DU_CORPS.TEXTE);
});

test("un corps en base64 se décode", () => {
  const deplie = unMailDeplie(mail(
    "From: a@b.example",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "", B64_PHRASE, ""
  ));
  assert.equal(deplie.corps, PHRASE);
});

test("un corps en quoted-printable se décode", () => {
  const deplie = unMailDeplie(mail(
    "From: a@b.example",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: quoted-printable",
    "", QP_PHRASE, ""
  ));
  assert.equal(deplie.corps, PHRASE);
});

test("un corps non décodé ne s'affiche pas vide", () => {
  // « ce message est vide » et « je n'ai pas su le lire » appellent deux
  // gestes différents : le premier se classe, le second se rouvre.
  const deplie = unMailDeplie(mail(
    "From: a@b.example",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "", "TGUgc3Vw*Ln0=", ""
  ));
  assert.equal(deplie.corps, null);
  assert.notEqual(deplie.corps, "");
  assert.ok(aBien(deplie, TROU.CORPS_NON_DECODE));
});

test("un encodage qu'on ne sait pas défaire ne passe pas pour du texte", () => {
  const deplie = unMailDeplie(mail(
    "From: a@b.example",
    "Content-Transfer-Encoding: uuencode",
    "", "begin 644 x", ""
  ));
  assert.equal(deplie.corps, null);
  assert.ok(aBien(deplie, TROU.CORPS_NON_DECODE));
});

test("un corps en 8bit porte ses octets, pas ses caractères", () => {
  // Le « è » est écrit ici comme les deux octets que l'UTF-8 lui donne, parce
  // que c'est ce qu'un .eml transporte. L'écrire en un seul caractère ferait
  // une épreuve qui passe sur un fichier que personne ne recevra jamais.
  const deplie = unMailDeplie(mail(
    "From: a@b.example",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "", "Le support est humide au droit de l'acrot\u00c3\u00a8re.", ""
  ));
  assert.equal(deplie.corps, PHRASE);
  assert.deepEqual(deplie.trous.filter((trou) => trou.ou === "le corps"), []);
});

test("un jeu de caractères démenti par les octets se dit", () => {
  const deplie = unMailDeplie(mail(
    "From: a@b.example",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: quoted-printable",
    "", QP_PHRASE_1252, ""
  ));
  assert.equal(deplie.corps, PHRASE);
  assert.ok(aBien(deplie, TROU.JEU_DE_SECOURS));
});

test("un mail sans aucune partie de texte le dit", () => {
  const deplie = unMailDeplie(mail(
    "From: a@b.example",
    "Content-Type: application/pdf; name=\"releve.pdf\"",
    "", "JVBERi0=", ""
  ));
  assert.equal(deplie.corps, null);
  assert.ok(aBien(deplie, TROU.SANS_CORPS));
});

// ── multipart : le texte l'emporte sur le HTML ─────────────────────────────

const ALTERNATIF = mail(
  "From: Ourdine Ferrand <o.ferrand@novaclim.example>",
  "Date: Thu, 12 Mar 2026 09:14:00 +0100",
  "Subject: Lot 3",
  "Message-ID: <a1@novaclim.example>",
  "Content-Type: multipart/alternative; boundary=\"limite-1\"",
  "",
  "Ce message est en plusieurs morceaux.",
  "--limite-1",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "Le support est humide.",
  "--limite-1",
  "Content-Type: text/html; charset=utf-8",
  "",
  "<p><b>Le support</b> est <i>humide</i>.</p>",
  "--limite-1--",
  ""
);

test("quand le texte existe, c'est lui qu'on prend", () => {
  // Prendre le HTML ferait passer de la mise en forme pour du propos.
  const deplie = unMailDeplie(ALTERNATIF);
  assert.equal(deplie.corps, "Le support est humide.");
  assert.equal(deplie.formeDuCorps, FORME_DU_CORPS.TEXTE);
});

test("le HTML d'un message qui a du texte ne se mélange pas au corps", () => {
  assert.equal(unMailDeplie(ALTERNATIF).corps.includes("<b>"), false);
  assert.equal(unMailDeplie(ALTERNATIF).corps.includes("Le support est humide.\n"), false);
});

test("prendre le texte quand il existe ne dépend pas de l'ordre des morceaux", () => {
  const inverse = ALTERNATIF
    .replace("Content-Type: text/plain; charset=utf-8\r\n\r\nLe support est humide.", "@@TEXTE@@")
    .replace("Content-Type: text/html; charset=utf-8\r\n\r\n<p><b>Le support</b> est <i>humide</i>.</p>",
      "Content-Type: text/plain; charset=utf-8\r\n\r\nLe support est humide.")
    .replace("@@TEXTE@@", "Content-Type: text/html; charset=utf-8\r\n\r\n<p><b>Le support</b> est <i>humide</i>.</p>");
  assert.equal(unMailDeplie(inverse).corps, "Le support est humide.");
});

test("le préambule d'un multipart n'est pas du propos", () => {
  assert.equal(unMailDeplie(ALTERNATIF).corps.includes("plusieurs morceaux"), false);
});

test("un message qui n'existe qu'en HTML se réduit, et le dit", () => {
  const deplie = unMailDeplie(mail(
    "From: a@b.example",
    "Content-Type: multipart/alternative; boundary=\"limite-1\"",
    "",
    "--limite-1",
    "Content-Type: text/html; charset=utf-8",
    "",
    "<p><b>Le support</b> est humide.</p><p>Merci.</p>",
    "--limite-1--",
    ""
  ));
  assert.equal(deplie.formeDuCorps, FORME_DU_CORPS.HTML);
  assert.equal(deplie.corps, "Le support est humide.\n\nMerci.");
  assert.ok(aBien(deplie, TROU.CORPS_EN_HTML));
});

test("un corps de texte ne porte jamais la marque du HTML", () => {
  assert.equal(aBien(unMailDeplie(ALTERNATIF), TROU.CORPS_EN_HTML), false);
});

// ── multipart : les pièces jointes, nommées et rien de plus ────────────────

const AVEC_PIECE = mail(
  "From: Ourdine Ferrand <o.ferrand@novaclim.example>",
  "Date: Thu, 12 Mar 2026 09:14:00 +0100",
  "Subject: Relevé du 12 mars",
  "Message-ID: <a1@novaclim.example>",
  "Content-Type: multipart/mixed; boundary=\"limite-2\"",
  "",
  "--limite-2",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "Le releve est joint.",
  "--limite-2",
  "Content-Type: application/pdf",
  "Content-Disposition: attachment; filename=\"releve-humidite.pdf\"",
  "Content-Transfer-Encoding: base64",
  "",
  "JVBERi0xLjQK",
  "--limite-2--",
  ""
);

test("une pièce jointe est nommée, et le corps reste le texte", () => {
  const deplie = unMailDeplie(AVEC_PIECE);
  assert.equal(deplie.corps, "Le releve est joint.");
  assert.deepEqual(deplie.pieces, [
    { nom: "releve-humidite.pdf", type: "application/pdf", jointeAuTexte: false }
  ]);
});

test("une pièce jointe n'est pas lue : rien de son contenu ne sort", () => {
  // Les lire est un autre procédé — pour un PDF, c'est le lecteur de CR.
  assert.equal(JSON.stringify(unMailDeplie(AVEC_PIECE)).includes("JVBERi0"), false);
});

test("un nom de pièce accentué se lit dans ses deux écritures", () => {
  const etendu = AVEC_PIECE.replace("filename=\"releve-humidite.pdf\"", "filename*=utf-8''%C3%A9tude.pdf");
  assert.equal(unMailDeplie(etendu).pieces[0].nom, "étude.pdf");
  const encode = AVEC_PIECE.replace("filename=\"releve-humidite.pdf\"", "filename=\"=?UTF-8?Q?=C3=A9tude.pdf?=\"");
  assert.equal(unMailDeplie(encode).pieces[0].nom, "étude.pdf");
});

test("une pièce jointe sans nom se compte quand même, et se signale", () => {
  const anonyme = AVEC_PIECE.replace("Content-Disposition: attachment; filename=\"releve-humidite.pdf\"\r\n", "");
  const deplie = unMailDeplie(anonyme);
  assert.equal(deplie.pieces.length, 1);
  assert.equal(deplie.pieces[0].nom, "");
  assert.ok(aBien(deplie, TROU.PIECE_SANS_NOM));
});

test("un texte joint en pièce n'est pas le corps du message", () => {
  const joint = mail(
    "From: a@b.example",
    "Content-Type: multipart/mixed; boundary=\"limite-3\"",
    "",
    "--limite-3",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Disposition: attachment; filename=\"notes.txt\"",
    "",
    "des notes qui ne sont pas le message",
    "--limite-3",
    "Content-Type: text/plain; charset=utf-8",
    "",
    "Le support est humide.",
    "--limite-3--",
    ""
  );
  const deplie = unMailDeplie(joint);
  assert.equal(deplie.corps, "Le support est humide.");
  assert.equal(deplie.pieces[0].nom, "notes.txt");
});

test("un texte joint sans nom n'est pas non plus le corps du message", () => {
  // Le nom n'est pas ce qui fait une pièce jointe : c'est la disposition. Une
  // pièce anonyme prise pour le message afficherait à la place du propos un
  // fichier que personne n'a écrit là.
  const anonyme = mail(
    "From: a@b.example",
    "Content-Type: multipart/mixed; boundary=\"limite-5\"",
    "",
    "--limite-5",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Disposition: attachment",
    "",
    "des notes qui ne sont pas le message",
    "--limite-5",
    "Content-Type: text/plain; charset=utf-8",
    "",
    "Le support est humide.",
    "--limite-5--",
    ""
  );
  const deplie = unMailDeplie(anonyme);
  assert.equal(deplie.corps, "Le support est humide.");
  assert.equal(deplie.pieces.length, 1);
  assert.ok(aBien(deplie, TROU.PIECE_SANS_NOM));
});

test("une image glissée dans le texte se distingue d'une pièce jointe", () => {
  const inline = AVEC_PIECE
    .replace("Content-Type: application/pdf", "Content-Type: image/png")
    .replace("attachment; filename=\"releve-humidite.pdf\"", "inline; filename=\"photo.png\"");
  assert.equal(unMailDeplie(inline).pieces[0].jointeAuTexte, true);
});

test("un multipart imbriqué se déplie jusqu'au texte", () => {
  const imbrique = mail(
    "From: a@b.example",
    "Content-Type: multipart/mixed; boundary=\"dehors\"",
    "",
    "--dehors",
    "Content-Type: multipart/alternative; boundary=\"dedans\"",
    "",
    "--dedans",
    "Content-Type: text/plain; charset=utf-8",
    "",
    "Le support est humide.",
    "--dedans",
    "Content-Type: text/html; charset=utf-8",
    "",
    "<p>Le support est humide.</p>",
    "--dedans--",
    "--dehors",
    "Content-Type: application/pdf",
    "Content-Disposition: attachment; filename=\"releve.pdf\"",
    "",
    "JVBERi0=",
    "--dehors--",
    ""
  );
  const deplie = unMailDeplie(imbrique);
  assert.equal(deplie.corps, "Le support est humide.");
  assert.equal(deplie.formeDuCorps, FORME_DU_CORPS.TEXTE);
  assert.equal(deplie.pieces[0].nom, "releve.pdf");
});

// ── Les frontières manquantes ──────────────────────────────────────────────

test("une frontière annoncée mais absente se signale", () => {
  const deplie = unMailDeplie(mail(
    "From: a@b.example",
    "Content-Type: multipart/mixed; boundary=\"limite-4\"",
    "",
    "un corps posé là sans aucune frontière",
    ""
  ));
  assert.ok(aBien(deplie, TROU.FRONTIERE_ABSENTE));
});

test("un message tronqué se dit tronqué", () => {
  const coupe = AVEC_PIECE.replace("--limite-2--\r\n", "");
  assert.ok(aBien(unMailDeplie(coupe), TROU.FRONTIERE_NON_FERMEE));
});

test("un message entier ne se dit pas tronqué", () => {
  assert.equal(aBien(unMailDeplie(AVEC_PIECE), TROU.FRONTIERE_NON_FERMEE), false);
});

test("le découpage rend les morceaux, sans le préambule ni l'épilogue", () => {
  const decoupe = decouperLeMultipart("preambule\n--x\nun\n--x\ndeux\n--x--\nepilogue", "x");
  assert.deepEqual(decoupe.parties, ["un", "deux"]);
  assert.equal(decoupe.fermee, true);
});

test("une frontière sans nom ne découpe rien", () => {
  assert.equal(decouperLeMultipart("un\n--\ndeux", "").trouvee, false);
});

// ── Un mail sans trou n'en invente pas ─────────────────────────────────────

test("un mail complet ne porte aucun trou", () => {
  // Le pendant des épreuves précédentes : une liste de trous qui se remplit
  // toujours vaudrait autant qu'une liste qui reste toujours vide.
  assert.deepEqual(unMailDeplie(SIMPLE).trous, []);
  assert.deepEqual(unMailDeplie(ALTERNATIF).trous, []);
  assert.deepEqual(unMailDeplie(AVEC_PIECE).trous, []);
});

test("les octets d'un fichier se déplient comme sa chaîne brute", () => {
  const octets = Uint8Array.from(SIMPLE, (caractere) => caractere.charCodeAt(0));
  assert.deepEqual(unMailDeplie(octets), unMailDeplie(SIMPLE));
});

// ── Le propos est nettoyé une fois, et là ──────────────────────────────────

const BRUITE = mail(
  "From: BERTRAND <contact@bertrand.example>",
  "To: Ourdine Ferrand <o.ferrand@novaclim.example>",
  "Date: Tue, 3 Mar 2026 08:30:00 +0100",
  "Subject: Étanchéité toiture",
  "Message-ID: <c3@bertrand.example>",
  "",
  "EXTERNAL SENDER: prudence avec les pièces jointes.",
  "",
  "La notice est ici : https://eur03.safelinks.protection.outlook.com/?url="
    + "https%3A%2F%2Fwww.novaclim.example%2Fnotices%2Fcvc-12.pdf&data=05%7C02%7C",
  "Le détail en coupe [cid:image018.png@01DD1B52.8A52BFD0] est joint.",
  ""
);

test("une redirection est dépliée dans le propos, pas seulement raccourcie", () => {
  // Le nettoyage vit ici, une fois : l'écran et le modèle lisent le même texte,
  // et il n'y a pas deux versions du propos qui finiraient par diverger
  // (règle 4).
  const deplie = unMailDeplie(BRUITE);
  assert.ok(deplie.corps.includes("https://www.novaclim.example/notices/cvc-12.pdf"));
  assert.equal(deplie.corps.includes("safelinks"), false);
  assert.equal(deplie.nettoyage.redirections, 1);
});

test("le bandeau d'une passerelle ne descend pas dans le propos", () => {
  const deplie = unMailDeplie(BRUITE);
  assert.equal(deplie.corps.includes("EXTERNAL SENDER"), false);
  assert.equal(deplie.nettoyage.bandeaux, 1);
});

test("une image collée se compte, et devient un trou", () => {
  // Dans un échange technique, une formule ou un extrait de norme vit souvent
  // dans l'image : un relevé qui l'ignore en silence est pire qu'un relevé qui
  // dit qu'il y a là quelque chose qu'il n'a pas lu (règle 5).
  const deplie = unMailDeplie(BRUITE);
  assert.equal(deplie.nettoyage.images, 1);
  assert.ok(deplie.corps.includes("(image)"));
  assert.ok(aBien(deplie, TROU.IMAGES_NON_LUES));
  assert.equal(deplie.trous.find((trou) => trou.quoi === TROU.IMAGES_NON_LUES).detail, "1");
});

test("un mail sans image ne signale pas d'image non lue", () => {
  // Le pendant : un trou qui se pose toujours ne dit plus rien.
  assert.equal(aBien(unMailDeplie(SIMPLE), TROU.IMAGES_NON_LUES), false);
  assert.equal(unMailDeplie(SIMPLE).nettoyage.images, 0);
});
