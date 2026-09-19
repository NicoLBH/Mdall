import assert from "node:assert/strict";
import test from "node:test";

import {
  ENCODAGE_PAR_DEFAUT, ENCODAGES_CONNUS, JEU_DE_SECOURS, JEU_PAR_DEFAUT, PANNE,
  decoderBase64, decoderLesMotsEncodes, decoderQuotedPrintable, defaireLesEntites,
  leTexteDuCorps, lireLesOctets, octetsDuCorps, octetsDuTexteBrut, texteBrutDe, texteDuHtml
} from "./decoder-un-mail.js";

// Les chaînes encodées de ce fichier ont été produites hors du dépôt (base64 et
// quoted-printable de référence), pas par le module qu'elles vérifient : un
// témoin fabriqué par le code testé ne prouverait que sa cohérence avec lui-même.
const PHRASE = "Le support est humide au droit de l'acrotère.";
const PHRASE_B64_UTF8 = "TGUgc3VwcG9ydCBlc3QgaHVtaWRlIGF1IGRyb2l0IGRlIGwnYWNyb3TDqHJlLg==";
const PHRASE_B64_1252 = "TGUgc3VwcG9ydCBlc3QgaHVtaWRlIGF1IGRyb2l0IGRlIGwnYWNyb3TocmUu";
const PHRASE_QP_UTF8 = "Le support est humide au droit de l'acrot=C3=A8re.";
const PHRASE_QP_1252 = "Le support est humide au droit de l'acrot=E8re.";

const octets = (...valeurs) => Uint8Array.from(valeurs);

// ── La source entre en octets, ou n'entre pas ──────────────────────────────

test("des octets deviennent une chaîne d'un caractère par octet", () => {
  const lu = texteBrutDe(octets(0xc3, 0xa9, 0x74));
  assert.equal(lu.texte, "Ã©t");
  assert.equal(lu.texte.length, 3);
});

test("un ArrayBuffer entre comme des octets", () => {
  const tampon = new ArrayBuffer(2);
  new Uint8Array(tampon).set([0x68, 0x69]);
  assert.equal(texteBrutDe(tampon).texte, "hi");
});

test("une chaîne déjà brute passe telle quelle", () => {
  assert.equal(texteBrutDe("From: a@b.example").texte, "From: a@b.example");
});

test("une chaîne déjà décodée est refusée, au lieu d'être lue de travers", () => {
  // « € » vaut le point 8364 : aucun octet ne porte cela, et poursuivre
  // rendrait du texte abîmé qui a l'air d'aller.
  const lu = texteBrutDe("un devis à 12 000 €");
  assert.equal(lu.panne, PANNE.PAS_DES_OCTETS);
  assert.equal(lu.texte, undefined);
  assert.equal(lu.rang, 18);
});

test("un texte décodé qui tient dans latin-1 passe, et se relit juste", () => {
  // La garde ne voit pas ce cas-là, et n'a pas à le voir : « è » vaut le point
  // 232, donc un octet, que le secours windows-1252 relira en « è ». Le
  // détour est invisible parce qu'il est exact.
  const brut = texteBrutDe("acrotère");
  assert.equal(brut.panne, undefined);
  assert.equal(lireLesOctets(octetsDuTexteBrut(brut.texte).octets, "utf-8").texte, "acrotère");
});

test("une source qui n'est ni octets ni chaîne est refusée", () => {
  assert.equal(texteBrutDe(null).panne, PANNE.PAS_DES_OCTETS);
  assert.equal(texteBrutDe({ texte: "bonjour" }).panne, PANNE.PAS_DES_OCTETS);
});

test("une longue suite d'octets ne fait pas déborder la pile", () => {
  const longue = new Uint8Array(200000).fill(0x61);
  assert.equal(texteBrutDe(longue).texte.length, 200000);
});

test("les octets et la chaîne brute se répondent", () => {
  assert.deepEqual(octetsDuTexteBrut("Ã©").octets, octets(0xc3, 0xa9));
});

// ── quoted-printable ───────────────────────────────────────────────────────

test("=XX rend l'octet qu'il écrit", () => {
  assert.deepEqual(decoderQuotedPrintable("acrot=C3=A8re"), octetsDuTexteBrut("acrotÃ¨re").octets);
});

test("un = en fin de ligne est une coupure, et disparaît", () => {
  const recolle = decoderQuotedPrintable("le support est=\r\n humide");
  assert.equal(texteBrutDe(recolle).texte, "le support est humide");
});

test("une ligne non coupée garde son retour", () => {
  assert.equal(texteBrutDe(decoderQuotedPrintable("un\r\ndeux")).texte, "un\ndeux");
});

test("les espaces en fin de ligne ne comptent pas", () => {
  // Un relais a pu en ajouter : les garder changerait le texte de l'auteur.
  assert.equal(texteBrutDe(decoderQuotedPrintable("humide   \r\nsuite")).texte, "humide\nsuite");
});

test("un espace écrit =20 en fin de ligne est gardé, lui", () => {
  assert.equal(texteBrutDe(decoderQuotedPrintable("humide=20\r\nsuite")).texte, "humide \nsuite");
});

test("un = mal formé reste tel quel plutôt que de perdre le message", () => {
  assert.equal(texteBrutDe(decoderQuotedPrintable("50 =m2 de support")).texte, "50 =m2 de support");
});

// ── base64 ─────────────────────────────────────────────────────────────────

test("le base64 d'un corps se défait", () => {
  assert.equal(lireLesOctets(decoderBase64(PHRASE_B64_UTF8).octets, "utf-8").texte, PHRASE);
});

test("les retours à la ligne d'un corps encodé ne sont pas des données", () => {
  const coupe = `${PHRASE_B64_UTF8.slice(0, 24)}\r\n${PHRASE_B64_UTF8.slice(24)}`;
  assert.deepEqual(decoderBase64(coupe).octets, decoderBase64(PHRASE_B64_UTF8).octets);
});

test("un base64 hors alphabet ne se devine pas : il se dit illisible", () => {
  const lu = decoderBase64("TGUgc3Vw*Ln0=");
  assert.equal(lu.panne, PANNE.BASE64_ILLISIBLE);
  assert.equal(lu.octets, undefined);
});

test("du base64url n'est pas du base64", () => {
  assert.equal(decoderBase64("TGUg-3Vw_g==").panne, PANNE.BASE64_ILLISIBLE);
});

// ── L'encodage de transfert ────────────────────────────────────────────────

test("sans en-tête, l'encodage est 7bit", () => {
  assert.ok(ENCODAGES_CONNUS.includes(ENCODAGE_PAR_DEFAUT));
  assert.equal(texteBrutDe(octetsDuCorps({ texte: "bonjour" }).octets).texte, "bonjour");
});

test("un encodage inconnu se dit, au lieu de passer pour du texte", () => {
  const lu = octetsDuCorps({ texte: "bonjour", encodage: "uuencode" });
  assert.equal(lu.panne, PANNE.ENCODAGE_INCONNU);
  assert.equal(lu.encodage, "uuencode");
});

test("l'encodage se lit sans égard à la casse ni aux blancs", () => {
  assert.ok(octetsDuCorps({ texte: PHRASE_B64_UTF8, encodage: " Base64 " }).octets);
});

// ── Les jeux de caractères ─────────────────────────────────────────────────

test("le jeu par défaut est celui de la norme", () => {
  assert.equal(JEU_PAR_DEFAUT, "us-ascii");
});

test("des octets utf-8 annoncés utf-8 se lisent", () => {
  const lu = lireLesOctets(decoderBase64(PHRASE_B64_UTF8).octets, "utf-8");
  assert.equal(lu.texte, PHRASE);
  assert.equal(lu.deSecours, false);
});

test("des octets windows-1252 annoncés windows-1252 se lisent", () => {
  assert.equal(lireLesOctets(decoderBase64(PHRASE_B64_1252).octets, "windows-1252").texte, PHRASE);
});

test("le nom rendu est le nom canonique, pas l'étiquette reçue", () => {
  const lu = lireLesOctets(octets(0x61), "ISO-8859-1");
  assert.equal(lu.jeuAnnonce, "iso-8859-1");
  assert.equal(lu.jeu, JEU_DE_SECOURS);
});

test("un jeu inconnu se dit, au lieu de rendre du vide", () => {
  const lu = lireLesOctets(octets(0x61), "ebcdic-fr");
  assert.equal(lu.panne, PANNE.JEU_INCONNU);
  assert.equal(lu.texte, undefined);
});

test("des octets qui démentent le jeu annoncé sont lus autrement, et ça se dit", () => {
  // Du windows-1252 étiqueté utf-8 : la lecture stricte échoue, le secours
  // rend le texte — et « deSecours » empêche de le croire sur parole.
  const lu = lireLesOctets(decoderBase64(PHRASE_B64_1252).octets, "utf-8");
  assert.equal(lu.deSecours, true);
  assert.equal(lu.jeuAnnonce, "utf-8");
  assert.equal(lu.jeu, JEU_DE_SECOURS);
  assert.equal(lu.texte, PHRASE);
});

test("du texte conforme ne passe jamais par le secours", () => {
  assert.equal(lireLesOctets(decoderBase64(PHRASE_B64_UTF8).octets, "utf-8").deSecours, false);
});

// ── Les deux bouts ensemble ────────────────────────────────────────────────

test("base64 puis utf-8", () => {
  assert.equal(leTexteDuCorps({ texte: PHRASE_B64_UTF8, encodage: "base64", jeu: "utf-8" }).texte, PHRASE);
});

test("quoted-printable puis utf-8", () => {
  assert.equal(leTexteDuCorps({ texte: PHRASE_QP_UTF8, encodage: "quoted-printable", jeu: "utf-8" }).texte, PHRASE);
});

test("quoted-printable puis windows-1252", () => {
  const lu = leTexteDuCorps({ texte: PHRASE_QP_1252, encodage: "quoted-printable", jeu: "windows-1252" });
  assert.equal(lu.texte, PHRASE);
});

test("une panne d'encodage n'est pas rattrapée par le jeu", () => {
  assert.equal(leTexteDuCorps({ texte: "??", encodage: "base64", jeu: "utf-8" }).panne, PANNE.BASE64_ILLISIBLE);
});

// ── Les mots encodés d'un en-tête (RFC 2047) ───────────────────────────────

test("un objet encodé en Q se lit", () => {
  assert.equal(decoderLesMotsEncodes("=?UTF-8?Q?=C3=89tanch=C3=A9it=C3=A9?=").texte, "Étanchéité");
});

test("un objet encodé en B se lit", () => {
  assert.equal(decoderLesMotsEncodes("=?UTF-8?B?w4l0YW5jaMOpaXTDqSB0b2l0dXJl?=").texte, "Étanchéité toiture");
});

test("dans la forme Q, _ vaut une espace", () => {
  // C'est la seule différence avec le quoted-printable d'un corps, et
  // l'oublier colle les mots d'un objet les uns aux autres.
  assert.equal(decoderLesMotsEncodes("=?UTF-8?Q?toiture_humide?=").texte, "toiture humide");
});

test("deux mots encodés voisins se recollent sans le blanc qui les sépare", () => {
  // Le blanc ne sert qu'à tenir la longueur de ligne ; le garder couperait un
  // mot accentué en deux.
  const lu = decoderLesMotsEncodes("=?UTF-8?Q?=C3=89tanch?= =?UTF-8?Q?=C3=A9it=C3=A9?=");
  assert.equal(lu.texte, "Étanchéité");
});

test("le texte qui entoure un mot encodé garde ses espaces", () => {
  assert.equal(decoderLesMotsEncodes("Re: =?UTF-8?Q?toiture?= du lot 3").texte, "Re: toiture du lot 3");
});

test("un en-tête sans mot encodé ne bouge pas", () => {
  assert.equal(decoderLesMotsEncodes("Re: toiture du lot 3").texte, "Re: toiture du lot 3");
  assert.equal(decoderLesMotsEncodes("Re: toiture du lot 3").motsIndechiffrables, 0);
});

test("un mot encodé qu'on n'a pas su lire reste visible, et se compte", () => {
  const lu = decoderLesMotsEncodes("Objet : =?EBCDIC-FR?Q?abc?= suite");
  assert.equal(lu.motsIndechiffrables, 1);
  assert.equal(lu.texte, "Objet : =?EBCDIC-FR?Q?abc?= suite");
});

test("un en-tête vide ne casse rien", () => {
  assert.equal(decoderLesMotsEncodes("").texte, "");
  assert.equal(decoderLesMotsEncodes(null).texte, "");
});

// ── Le HTML réduit en texte ────────────────────────────────────────────────

test("les entités se défont, nommées comme numériques", () => {
  assert.equal(defaireLesEntites("50&nbsp;m&#178; &amp; plus &#x27;a&#39;"), "50 m² & plus 'a'");
});

test("une entité inconnue reste lisible telle quelle", () => {
  assert.equal(defaireLesEntites("&pasunentite; fin"), "&pasunentite; fin");
});

test("un <br> coupe la ligne", () => {
  assert.equal(texteDuHtml("humide<br/>au droit"), "humide\nau droit");
});

test("le style part avec son contenu, et pas seulement ses balises", () => {
  // Une feuille de style privée de ses balises ne serait pas du propos : ce
  // serait du bruit qu'on ferait passer pour du propos.
  const reduit = texteDuHtml("<style>p{color:red}</style><p>Le support</p>");
  assert.equal(reduit, "Le support");
});

test("un script part de même", () => {
  assert.equal(texteDuHtml("<script>var a = 1;</script><p>humide</p>"), "humide");
});

test("les lignes vides en série se réduisent à une", () => {
  assert.equal(texteDuHtml("<p>a</p><div></div><div></div><p>b</p>"), "a\n\nb");
});

test("un tableau HTML garde ses lignes, et ne les espace pas", () => {
  // Un relevé de quinze lignes séparées par des lignes vides se lit deux fois
  // plus long, et cesse de ressembler à un tableau.
  const reduit = texteDuHtml("<table><tr><td>lot 3</td></tr><tr><td>lot 4</td></tr></table>");
  assert.equal(reduit, "lot 3\nlot 4");
});

test("deux cellules d'une même ligne restent sur une ligne", () => {
  assert.equal(texteDuHtml("<tr><td>lot 3</td><td>humide</td></tr>"), "lot 3 humide");
});

test("deux paragraphes gardent la ligne vide qui les sépare", () => {
  assert.equal(texteDuHtml("<p>Le support</p><p>est humide</p>"), "Le support\n\nest humide");
});

test("les éléments d'une liste tiennent chacun une ligne", () => {
  assert.equal(texteDuHtml("<ul><li>lot 3</li><li>lot 4</li></ul>"), "lot 3\nlot 4");
});
