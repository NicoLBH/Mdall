import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ONGLET, renderLaLectureDesMails } from "./lecture-des-mails.js";
import { leFilDesMails } from "../../../services/le-fil-des-mails.js";
import { TROU } from "../../../services/trous-dun-mail.js";

// Aucun mail réel : les noms, les sociétés et les domaines sont inventés.
const mail = (...lignes) => lignes.join("\r\n");

const PREMIER = mail(
  "From: BERTRAND <contact@bertrand.example>",
  "To: Ourdine Ferrand <o.ferrand@novaclim.example>",
  "Cc: Bureau VERIFAS <controle@verifas.example>",
  "Date: Tue, 3 Mar 2026 08:30:00 +0100",
  "Subject: Étanchéité toiture",
  "Message-ID: <a1@bertrand.example>",
  "", "Rien n'a été relevé au droit de l'acrotère à ce jour.", ""
);

const SECOND = mail(
  "From: Ourdine Ferrand <o.ferrand@novaclim.example>",
  "To: BERTRAND <contact@bertrand.example>",
  "Date: Thu, 12 Mar 2026 09:14:00 +0100",
  "Subject: Re: Étanchéité toiture",
  "Message-ID: <b2@novaclim.example>",
  "In-Reply-To: <a1@bertrand.example>",
  "Content-Type: multipart/mixed; boundary=\"limite-1\"",
  "",
  "--limite-1",
  "Content-Type: text/plain; charset=utf-8",
  "Content-Transfer-Encoding: quoted-printable",
  "",
  // Le corps est écrit comme une messagerie l'écrit : en quoted-printable,
  // donc en ASCII pur. La citation recopie PREMIER mot pour mot, accents
  // compris — c'est ce qui permet de reconnaître le doublon.
  "Le support est humide au droit de l'acrot=C3=A8re.",
  "",
  "Le 3 mars 2026 =C3=A0 08:30, BERTRAND a =C3=A9crit :",
  "> Rien n'a =C3=A9t=C3=A9 relev=C3=A9 au droit de l'acrot=C3=A8re =C3=A0 ce =",
  "jour.",
  "--limite-1",
  "Content-Type: application/pdf",
  "Content-Disposition: attachment; filename=\"releve-humidite.pdf\"",
  "",
  "JVBERi0=",
  "--limite-1--",
  ""
);

const vue = (dessus = {}) => ({
  phase: "vide", fichiers: [], fil: null, onglet: ONGLET.FIL,
  motif: "", queFaire: "", rangement: null, ouverts: new Set(), ...dessus
});

const lu = (...sources) => vue({ phase: "lu", fil: leFilDesMails(sources), fichiers: ["un.eml"] });

// ── L'écran se dessine dans chaque état ────────────────────────────────────

test("l'écran vide s'ouvre sur la zone de dépôt", () => {
  const html = renderLaLectureDesMails(vue());
  assert.ok(html.includes("Lecture d'un fil de mails"));
  assert.ok(html.includes("data-mails-zone"));
  assert.ok(html.includes("Déposez des mails"));
});

test("l'écran en lecture ferme la zone plutôt que d'en accepter une seconde", () => {
  const html = renderLaLectureDesMails(vue({ phase: "lecture" }));
  assert.ok(html.includes("is-occupee"));
  assert.equal(html.includes("Déposez des mails"), false);
});

test("l'écran d'un fil lu montre le fil, et non plus la zone", () => {
  const html = renderLaLectureDesMails(lu(PREMIER, SECOND));
  assert.equal(html.includes("data-mails-zone"), false);
  assert.ok(html.includes("Un autre fil"));
  assert.ok(html.includes("Étanchéité toiture · 2 messages du 3 au 12 mars 2026"));
});

test("un refus ne vide pas ce qui a été lu", () => {
  // Une alerte qui remplace le fil ferait perdre un dépliage qui a marché
  // pour un dépôt qui a raté.
  const html = renderLaLectureDesMails({ ...lu(PREMIER), motif: "le rangement a échoué" });
  assert.ok(html.includes("le rangement a échoué"));
  assert.ok(html.includes("Étanchéité toiture"));
  assert.ok(html.includes("Rien n&#39;a été relevé au droit de l&#39;acrotère à ce jour."));
});

test("une alerte porte toujours sa sortie", () => {
  // Une alerte qu'on ne peut pas fermer est un écran dont on ne sort pas :
  // c'est le défaut qui a bloqué le lecteur de CR jusqu'au rechargement.
  const html = renderLaLectureDesMails(vue({ motif: "aucun de ces fichiers n'est un mail" }));
  assert.ok(html.includes("data-mails-alerte-fermer"));
});

// ── Ce que le fil montre ───────────────────────────────────────────────────

test("chaque message porte qui, quand, à qui", () => {
  const html = renderLaLectureDesMails(lu(PREMIER));
  assert.ok(html.includes("3 mars 2026 à 08:30"));
  assert.ok(html.includes("BERTRAND &lt;contact@bertrand.example&gt;"));
  assert.ok(html.includes("Ourdine Ferrand"));
  assert.ok(html.includes("Bureau VERIFAS en copie"));
});

test("un message ne montre que ce qu'il ajoute", () => {
  // Déposer huit mails d'une discussion afficherait sinon huit fois le même
  // texte, et le lecteur ne saurait plus qui a dit quoi.
  const html = renderLaLectureDesMails(lu(PREMIER, SECOND));
  assert.ok(html.includes("Le support est humide au droit de l&#39;acrotère."));
  assert.equal(html.includes("a écrit :"), false);
  // Le texte de PREMIER n'apparaît qu'une fois : sur son propre message, et
  // pas une seconde fois dans celui qui le recopie.
  const recopie = "Rien n&#39;a été relevé au droit de l&#39;acrotère à ce jour.";
  assert.equal(html.split(recopie).length - 1, 1, "le texte cité apparaît deux fois");
});

test("ce qu'un message recopie reste accessible, replié", () => {
  const ferme = renderLaLectureDesMails(lu(SECOND));
  // Le libellé du bouton est écrit tel quel : son apostrophe reste brute.
  assert.ok(ferme.includes("Voir ce qu'il recopie"));
  // Le bloc de citation, pas son texte : ce message-ci a été reconstitué à
  // partir de cette citation, donc le texte est aussi celui de son propos.
  // C'est le bloc replié qu'on vérifie, sinon l'épreuve passerait toujours.
  assert.equal(ferme.includes("fil-mails__cite"), false);

  // Le rang 2 : c'est le message déposé qui recopie, pas celui qu'on a
  // reconstitué à partir de sa citation.
  const ouvert = renderLaLectureDesMails({ ...lu(SECOND), ouverts: new Set([2]) });
  assert.ok(ouvert.includes("Masquer ce qu'il recopie"));
  assert.ok(ouvert.includes("fil-mails__cite"));
  const bloc = ouvert.slice(ouvert.indexOf("fil-mails__cite"));
  assert.ok(bloc.includes("Rien n&#39;a été relevé au droit de l&#39;acrotère à ce jour."));
});

test("les pièces jointes sont nommées", () => {
  assert.ok(renderLaLectureDesMails(lu(SECOND)).includes("releve-humidite.pdf"));
});

test("un message reconstitué se distingue de celui qu'on a déposé", () => {
  const html = renderLaLectureDesMails(lu(SECOND));
  assert.ok(html.includes("est-reconstitue"));
  assert.ok(html.includes("reconstitué"));
});

test("les trous d'un message s'affichent sur ce message", () => {
  const html = renderLaLectureDesMails(lu(SECOND));
  assert.ok(html.includes("il a été reconstitué à partir d&#39;une citation"));
});

test("un fil ordonné par ses dates le dit", () => {
  const sansChaine = SECOND.replace("In-Reply-To: <a1@bertrand.example>\r\n", "");
  const html = renderLaLectureDesMails(lu(PREMIER, sansChaine));
  assert.ok(html.includes("ordonné par les dates"));
  assert.ok(html.includes("faute de chaîne de réponses"));
});

test("un fil ordonné par sa chaîne ne dit pas le contraire", () => {
  const html = renderLaLectureDesMails(lu(PREMIER, SECOND));
  assert.equal(html.includes("faute de chaîne de réponses"), false);
  assert.ok(html.includes("ordonné par la chaîne des réponses"));
});

test("les doublons se disent, au lieu de disparaître en silence", () => {
  const html = renderLaLectureDesMails(lu(PREMIER, SECOND, PREMIER));
  assert.ok(html.includes("1 message déposé deux fois — compté une seule."));
});

// ── Ce que l'écran promet, et ce qu'il coûte ───────────────────────────────

test("l'écran dit que le dépliage ne coûte rien", () => {
  // C'est ce qui distingue cet utilitaire de tous les autres : un mail est du
  // texte, pas une image de page.
  const html = renderLaLectureDesMails(vue());
  assert.ok(html.includes("ne coûte rien"));
  assert.ok(html.includes("aucun appel au modèle"));
});

test("l'écran dit où va le mail, et que ce dossier n'est pas partagé", () => {
  const html = renderLaLectureDesMails(vue());
  assert.ok(html.includes("Mails"));
  assert.ok(html.includes("pas partagé"));
});

test("« Transformer » reste éteint tant que le relevé n'existe pas", () => {
  // Un menu qui s'ouvre sur une liste vide est plus difficile à comprendre
  // qu'un bouton qui ne s'ouvre pas.
  const html = renderLaLectureDesMails(lu(PREMIER, SECOND));
  const bouton = html.slice(html.indexOf("lectureMailsTransformer"), html.indexOf("lectureMailsTransformer") + 600);
  assert.ok(bouton.includes("disabled"), bouton);
});

test("l'onglet Analyse dit ce qui n'est pas encore écrit, et que rien n'a été payé", () => {
  const html = renderLaLectureDesMails({ ...lu(PREMIER), onglet: ONGLET.ANALYSE });
  // Ce titre est écrit tel quel dans le gabarit : son apostrophe n'est pas
  // échappée, parce qu'elle n'est jamais passée par escapeHtml.
  assert.ok(html.includes("Le relevé n'est pas encore écrit"));
  assert.ok(html.includes("rien n'a été payé"));
  assert.equal(html.includes("fil-mails__message"), false);
});

test("le rangement se dit pendant qu'il se fait, et pas avant", () => {
  assert.equal(renderLaLectureDesMails(lu(PREMIER)).includes("lecture-cr__versement"), false);
  const html = renderLaLectureDesMails({ ...lu(PREMIER), rangement: { dit: "Rangement…", enCours: true } });
  assert.ok(html.includes("lecture-cr__versement"));
  assert.ok(html.includes("est-en-cours"));
});

// ── Les défauts qui ne se voient pas à l'écran ─────────────────────────────

test("chaque icône nommée par l'écran existe dans la planche", () => {
  // Défaut précisément invisible : une icône absente ne lève rien et ne
  // s'affiche pas. L'écran paraît juste un peu nu, et personne ne sait
  // pourquoi.
  const source = readFileSync(new URL("./lecture-des-mails.js", import.meta.url), "utf8");
  const planche = readFileSync(new URL("../../../../assets/icons.svg", import.meta.url), "utf8");
  const nommees = [...source.matchAll(/svgIcon\(\s*"([a-z0-9-]+)"/g)].map((trouve) => trouve[1]);
  assert.ok(nommees.length >= 5, `seulement ${nommees.length} icônes trouvées`);
  for (const nom of new Set(nommees)) {
    assert.ok(planche.includes(`id="${nom}"`), `icône absente de la planche : ${nom}`);
  }
});

test("chaque trou possible du fil a sa phrase à l'écran", () => {
  // L'écran affiche `phraseDuTrou` sans le filtrer : un trou sans phrase
  // s'afficherait « quelque chose n'a pas pu être placé ».
  const html = renderLaLectureDesMails({
    ...lu(PREMIER),
    fil: { ...leFilDesMails([PREMIER]), trous: [{ quoi: TROU.FIL_ORDONNE_PAR_DATES, ou: "le fil" }] }
  });
  assert.ok(html.includes("ce fil a été ordonné par ses dates"));
  assert.equal(html.includes("quelque chose n&#39;a pas pu être placé"), false);
});
