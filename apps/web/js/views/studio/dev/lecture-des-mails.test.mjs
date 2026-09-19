import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ONGLET, leReleveDerive, renderLaLectureDesMails } from "./lecture-des-mails.js";
import { NATURE } from "../../../services/prises-de-position.js";
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

/**
 * Ce que l'écran **montre**, sans le bloc caché qui sert à emporter le texte.
 *
 * Ce bloc porte tout le fil et tout le relevé en Markdown : chercher un mot
 * dans le rendu entier le trouve donc toujours, même quand l'écran a cessé de
 * l'afficher. Six épreuves s'étaient tues ainsi d'un coup le jour où il est
 * apparu — elles vérifiaient un texte qui existait ailleurs.
 */
const CACHE = /<pre hidden data-copier-source="fil-en-texte">[\s\S]*?<\/pre>/;
const dessine = (vue) => renderLaLectureDesMails(vue).replace(CACHE, "");

const vue = (dessus = {}) => ({
  phase: "vide", fichiers: [], fil: null, onglet: ONGLET.FIL,
  motif: "", queFaire: "", rangement: null, ouverts: new Set(), releve: null, ...dessus
});

const prise = (dessus = {}) => ({
  nature: NATURE.CONSTAT, intitule: "le support est humide au droit de l'acrotère",
  message: 2, citation: "Le support est humide au droit de l'acrotère.",
  qui: "Ourdine Ferrand", quand: "12 mars 2026", pourQui: null, echeance: null,
  messageVerifie: true, ...dessus
});

const releve = (dessus = {}) => ({
  enCours: false, prises: [prise()], ecartees: 0, messagesCorriges: 0, coupee: false,
  modele: "gpt-4.1-mini", entree: 4200, sortie: 800, dureeMs: 3400, ...dessus
});

const lu = (...sources) => vue({ phase: "lu", fil: leFilDesMails(sources), fichiers: ["un.eml"] });

// ── L'écran se dessine dans chaque état ────────────────────────────────────

test("l'écran vide s'ouvre sur la zone de dépôt", () => {
  const html = dessine(vue());
  assert.ok(html.includes("Lecture d'un fil de mails"));
  assert.ok(html.includes("data-mails-zone"));
  assert.ok(html.includes("Déposez des mails"));
});

test("l'écran en lecture ferme la zone plutôt que d'en accepter une seconde", () => {
  const html = dessine(vue({ phase: "lecture" }));
  assert.ok(html.includes("is-occupee"));
  assert.equal(html.includes("Déposez des mails"), false);
});

test("l'écran d'un fil lu montre le fil, et non plus la zone", () => {
  const html = dessine(lu(PREMIER, SECOND));
  assert.equal(html.includes("data-mails-zone"), false);
  assert.ok(html.includes("Un autre fil"));
  assert.ok(html.includes("Étanchéité toiture · 2 messages du 3 au 12 mars 2026"));
});

test("un refus ne vide pas ce qui a été lu", () => {
  // Une alerte qui remplace le fil ferait perdre un dépliage qui a marché
  // pour un dépôt qui a raté.
  const html = dessine({ ...lu(PREMIER), motif: "le rangement a échoué" });
  assert.ok(html.includes("le rangement a échoué"));
  assert.ok(html.includes("Étanchéité toiture"));
  assert.ok(html.includes("Rien n&#39;a été relevé au droit de l&#39;acrotère à ce jour."));
});

test("une alerte porte toujours sa sortie", () => {
  // Une alerte qu'on ne peut pas fermer est un écran dont on ne sort pas :
  // c'est le défaut qui a bloqué le lecteur de CR jusqu'au rechargement.
  const html = dessine(vue({ motif: "aucun de ces fichiers n'est un mail" }));
  assert.ok(html.includes("data-mails-alerte-fermer"));
});

// ── Ce que le fil montre ───────────────────────────────────────────────────

test("chaque message porte qui, quand, à qui", () => {
  const html = dessine(lu(PREMIER));
  assert.ok(html.includes("3 mars 2026 à 08:30"));
  assert.ok(html.includes("BERTRAND &lt;contact@bertrand.example&gt;"));
  assert.ok(html.includes("Ourdine Ferrand"));
  assert.ok(html.includes("Bureau VERIFAS en copie"));
});

test("un message ne montre que ce qu'il ajoute", () => {
  // Déposer huit mails d'une discussion afficherait sinon huit fois le même
  // texte, et le lecteur ne saurait plus qui a dit quoi.
  const html = dessine(lu(PREMIER, SECOND));
  assert.ok(html.includes("Le support est humide au droit de l&#39;acrotère."));
  assert.equal(html.includes("a écrit :"), false);
  // Le texte de PREMIER n'apparaît qu'une fois dans le fil affiché : sur son
  // propre message, et pas une seconde fois dans celui qui le recopie. Le
  // compte se fait sur le fil seul — le bloc caché qui sert à emporter le
  // texte le porte aussi, et c'est son travail.
  const affiche = html.slice(html.indexOf("class=\"fil-mails\""));
  const recopie = "Rien n&#39;a été relevé au droit de l&#39;acrotère à ce jour.";
  assert.equal(affiche.split(recopie).length - 1, 1, "le texte cité apparaît deux fois");
});

test("ce qu'un message recopie reste accessible, replié", () => {
  const ferme = dessine(lu(SECOND));
  // Le libellé du bouton est écrit tel quel : son apostrophe reste brute.
  assert.ok(ferme.includes("Voir ce qu'il recopie"));
  // Le bloc de citation, pas son texte : ce message-ci a été reconstitué à
  // partir de cette citation, donc le texte est aussi celui de son propos.
  // C'est le bloc replié qu'on vérifie, sinon l'épreuve passerait toujours.
  assert.equal(ferme.includes("fil-mails__cite"), false);

  // Le rang 2 : c'est le message déposé qui recopie, pas celui qu'on a
  // reconstitué à partir de sa citation.
  const ouvert = dessine({ ...lu(SECOND), ouverts: new Set([2]) });
  assert.ok(ouvert.includes("Masquer ce qu'il recopie"));
  assert.ok(ouvert.includes("fil-mails__cite"));
  const bloc = ouvert.slice(ouvert.indexOf("fil-mails__cite"));
  assert.ok(bloc.includes("Rien n&#39;a été relevé au droit de l&#39;acrotère à ce jour."));
});

test("les pièces jointes sont nommées", () => {
  assert.ok(dessine(lu(SECOND)).includes("releve-humidite.pdf"));
});

test("un message reconstitué se distingue de celui qu'on a déposé", () => {
  const html = dessine(lu(SECOND));
  assert.ok(html.includes("est-reconstitue"));
  assert.ok(html.includes("reconstitué"));
});

test("les trous d'un message s'affichent sur ce message", () => {
  const html = dessine(lu(SECOND));
  assert.ok(html.includes("il a été reconstitué à partir d&#39;une citation"));
});

test("un fil ordonné par ses dates le dit", () => {
  const sansChaine = SECOND.replace("In-Reply-To: <a1@bertrand.example>\r\n", "");
  const html = dessine(lu(PREMIER, sansChaine));
  assert.ok(html.includes("ordonné par les dates"));
  assert.ok(html.includes("faute de chaîne de réponses"));
});

test("un fil ordonné par sa chaîne ne dit pas le contraire", () => {
  const html = dessine(lu(PREMIER, SECOND));
  assert.equal(html.includes("faute de chaîne de réponses"), false);
  assert.ok(html.includes("ordonné par la chaîne des réponses"));
});

test("les doublons se disent, au lieu de disparaître en silence", () => {
  const html = dessine(lu(PREMIER, SECOND, PREMIER));
  assert.ok(html.includes("1 message déposé deux fois — compté une seule."));
});

// ── Ce que l'écran promet, et ce qu'il coûte ───────────────────────────────

test("l'écran dit que le dépliage ne coûte rien", () => {
  // C'est ce qui distingue cet utilitaire de tous les autres : un mail est du
  // texte, pas une image de page.
  const html = dessine(vue());
  assert.ok(html.includes("ne coûte rien"));
  assert.ok(html.includes("aucun appel au modèle"));
});

test("l'écran dit où va le mail, et que ce dossier n'est pas partagé", () => {
  const html = dessine(vue());
  assert.ok(html.includes("Mails"));
  assert.ok(html.includes("pas partagé"));
});

const boutonTransformer = (html) =>
  html.slice(html.indexOf("lectureMailsTransformer"), html.indexOf("lectureMailsTransformer") + 600);

test("« Transformer » reste éteint tant qu'il n'y a rien à porter", () => {
  // Transformer un fil dont on n'a rien relevé proposerait une liste vide, et
  // il n'y a rien de plus difficile à comprendre qu'une proposition qui ne
  // propose rien.
  assert.ok(boutonTransformer(dessine(lu(PREMIER, SECOND))).includes("disabled"));
});

test("« Transformer » s'allume dès qu'un relevé a rendu quelque chose", () => {
  const html = dessine({ ...lu(PREMIER, SECOND), releve: releve() });
  assert.equal(boutonTransformer(html).includes("disabled"), false);
});

test("« Transformer » se rééteint pendant qu'une proposition s'écrit", () => {
  // Deux propositions demandées coup sur coup en feraient deux.
  const html = dessine({
    ...lu(PREMIER, SECOND), releve: releve(), versement: { enCours: true, dit: "Rédaction…" }
  });
  assert.ok(boutonTransformer(html).includes("disabled"));
});

test("un relevé qui n'a rien retenu ne rallume pas « Transformer »", () => {
  const html = dessine({ ...lu(PREMIER, SECOND), releve: releve({ prises: [] }) });
  assert.ok(boutonTransformer(html).includes("disabled"));
});

// ── Emporter le fil ────────────────────────────────────────────────────────

test("le fil s'emporte, et le texte à copier est écrit dans la page", () => {
  // Le recalculer au clic donnerait deux textes possibles — celui qu'on a
  // montré et celui qu'on emporte — et ils finiraient par différer.
  const html = renderLaLectureDesMails(lu(PREMIER, SECOND));
  assert.ok(html.includes("data-copier=\"fil-en-texte\""));
  assert.ok(html.includes("data-copier-source=\"fil-en-texte\""));
  assert.ok(html.includes("data-mails-telecharger"));
});

test("le texte emporté porte le fil, et le relevé quand il y en a un", () => {
  const sans = renderLaLectureDesMails(lu(PREMIER, SECOND));
  assert.ok(sans.includes("Aucun relevé n&#39;a été demandé"));

  const avec = renderLaLectureDesMails({ ...lu(PREMIER, SECOND), releve: releve() });
  const source = avec.slice(avec.indexOf("data-copier-source"));
  assert.ok(source.includes("prise de position"));
});

test("l'écran avertit que c'est de la correspondance qui sort", () => {
  // Un geste dont on ne mesure pas la portée est un geste qu'on regrette, et
  // la phrase qui le dit doit se lire au moment du geste.
  const html = dessine(lu(PREMIER));
  // Écrit tel quel dans le gabarit : l'apostrophe reste brute.
  assert.ok(html.includes("C'est de la correspondance"));
  assert.ok(html.includes("adresses, noms et contenu des messages"));
});

test("rien à emporter tant qu'il n'y a pas de fil", () => {
  const html = dessine(vue());
  assert.equal(html.includes("data-mails-telecharger"), false);
});

// ── L'analyse : avant, pendant, après ──────────────────────────────────────

const analyse = (dessus = {}) => ({ ...lu(PREMIER, SECOND), onglet: ONGLET.ANALYSE, ...dessus });

test("avant le relevé, l'onglet Analyse dit ce qu'il va demander et ce qu'il va coûter", () => {
  const html = dessine(analyse());
  assert.ok(html.includes("Relever ce que ce fil porte"));
  assert.ok(html.includes("C'est le premier appel au modèle de cet écran"));
  assert.ok(html.includes("data-mails-relever"));
});

test("avant le relevé, l'écran dit ce qui monte et ce qui ne monte pas", () => {
  // De la correspondance privée qui monte sans servir est de la correspondance
  // privée qui monte pour rien.
  const html = dessine(analyse());
  // Écrit tel quel dans le gabarit : l'apostrophe reste brute.
  assert.ok(html.includes("Pas les citations qu'ils recopient"));
  assert.ok(html.includes("pas les destinataires"));
});

test("pendant le relevé, le fil est dit intact", () => {
  const html = dessine(analyse({ releve: { enCours: true } }));
  assert.ok(html.includes("Le modèle relit le fil"));
  assert.ok(html.includes("il a été déplié sans appel"));
  assert.equal(html.includes("data-mails-relever"), false);
});

test("un relevé qui rate laisse le fil et propose de réessayer", () => {
  const html = dessine(analyse({
    releve: { enCours: false, motif: "le relevé a dépassé le temps imparti", queFaire: "Un fil plus court passe." }
  }));
  assert.ok(html.includes("le relevé a dépassé le temps imparti"));
  assert.ok(html.includes("Un fil plus court passe."));
  assert.ok(html.includes("Réessayer le relevé"));
  // Le fil, lui, n'a pas bougé : il n'a rien coûté.
  assert.ok(html.includes("Étanchéité toiture · 2 messages"));
});

test("après le relevé, chaque prise porte sa citation", () => {
  // Une prise sans sa citation demande de croire le modèle sur parole, et
  // c'est précisément ce qu'on refuse.
  const html = dessine(analyse({ releve: releve() }));
  assert.ok(html.includes("1 prise de position"));
  assert.ok(html.includes("Constat"));
  assert.ok(html.includes("fil-mails__cite"));
  const bloc = html.slice(html.indexOf("fil-mails__cite"));
  assert.ok(bloc.includes("Le support est humide au droit de l&#39;acrotère."));
});

test("chaque rubrique dit ce que sa nature deviendrait", () => {
  const html = dessine(analyse({
    releve: releve({ prises: [prise({ nature: NATURE.DEMANDE, pourQui: "BERTRAND", echeance: "avant vendredi" })] })
  }));
  assert.ok(html.includes("un sujet à ouvrir"));
  assert.ok(html.includes("avant vendredi"));
  assert.ok(html.includes("BERTRAND"));
});

test("ce qui manque à une prise s'affiche sur la prise", () => {
  const html = dessine(analyse({
    releve: releve({ prises: [prise({ nature: NATURE.DEMANDE })] })
  }));
  assert.ok(html.includes("elle ne dit pas à qui c&#39;est demandé"));
  assert.ok(html.includes("elle ne dit pas pour quand"));
});

test("ce que le relevé a coûté s'affiche à côté de son résultat", () => {
  // Un prix qu'il faut aller chercher dans un autre écran n'entre jamais dans
  // la décision.
  const html = dessine(analyse({ releve: releve() }));
  assert.ok(/\d[,.]\d+\s*€|€/.test(html), "aucun prix affiché");
  assert.ok(html.includes("3.4 s"));
});

test("un décompte absent n'est pas un relevé gratuit", () => {
  const html = dessine(analyse({ releve: releve({ entree: null, sortie: null }) }));
  assert.ok(html.includes("coût non annoncé"));
});

test("ce qui a été écarté se dit, et se compte", () => {
  const html = dessine(analyse({ releve: releve({ ecartees: 2 }) }));
  assert.ok(html.includes("2 écartées faute d&#39;une citation qu&#39;on retrouve"));
  assert.ok(html.includes("C&#39;est la mesure de ce que ce relevé n&#39;a pas su faire."));
});

test("un relevé qui ne retient rien ne se lit pas comme un fil vide", () => {
  const html = dessine(analyse({ releve: releve({ prises: [] }) }));
  assert.ok(html.includes("Ce n'est pas la même chose qu'un fil vide"));
});

test("les prises se montrent aussi sous le message d'où elles sortent", () => {
  // Aller chercher dans l'autre onglet de quelle phrase sort une prise, c'est
  // ce qui rendait les déceptions inexplicables chez le lecteur de CR.
  const html = dessine({ ...lu(PREMIER, SECOND), releve: releve() });
  assert.ok(html.includes("fil-mails__prises"));
  assert.ok(html.includes("fil-mails__prise-nature"));
});

// ── Ce qui se dérive ───────────────────────────────────────────────────────

const AFFIRME = prise({
  nature: NATURE.CONSTAT, qui: "Ourdine Ferrand", message: 2,
  intitule: "le support est humide au droit de l'acrotère",
  citation: "Le support est humide au droit de l'acrotère.",
  porteSur: "humidité de l'acrotère"
});
const NIE = prise({
  nature: NATURE.CONSTAT, qui: "BERTRAND", message: 1,
  intitule: "rien n'a été relevé au droit de l'acrotère",
  citation: "Rien n'a été relevé au droit de l'acrotère à ce jour.",
  porteSur: "humidité de l'acrotère"
});

test("une question sans réponse a sa propre rubrique, et vient en tête de la phrase", () => {
  // C'est l'apport principal du procédé : le ranger après ce qui a été écarté
  // le ferait lire en dernier, ou pas du tout.
  const html = dessine(analyse({
    releve: releve({ prises: [prise({ nature: NATURE.SANS_REPONSE, natureDeclaree: NATURE.DEMANDE })] })
  }));
  assert.ok(html.includes("1 question sans réponse"));
  assert.ok(html.includes("Question sans réponse"));
  assert.ok(html.includes("un sujet à ouvrir, et c&#39;est l&#39;apport principal"));
});

test("un désaccord montre les deux positions et leurs deux citations", () => {
  // Rien ne prouve que ces deux personnes sont en désaccord : c'est au lecteur
  // de trancher, et il ne peut le faire qu'en voyant les deux.
  const desaccord = {
    key: "desaccord:1", nature: NATURE.DESACCORD, intitule: "humidité de l'acrotère",
    positions: [AFFIRME, NIE], message: 2, qui: null, quand: null, citation: ""
  };
  const html = dessine(analyse({ releve: releve({ prises: [desaccord] }) }));
  assert.ok(html.includes("1 désaccord possible"));
  assert.ok(html.includes("est-desaccord"));
  // Écrit tel quel dans le gabarit : l'apostrophe reste brute.
  assert.ok(html.includes("deux constats s'opposent"));
  assert.ok(html.includes("Ourdine Ferrand"));
  assert.ok(html.includes("BERTRAND"));
  assert.ok(html.includes("Rien n&#39;a été relevé au droit de l&#39;acrotère à ce jour."));
  assert.ok(html.includes("Le support est humide au droit de l&#39;acrotère."));
});

test("une demande qu'on ne sait pas juger le dit", () => {
  const html = dessine(analyse({
    releve: releve({ prises: [prise({ nature: NATURE.DEMANDE, suite: "on-ne-sait-pas", pourQui: "BERTRAND", echeance: "jeudi" })] })
  }));
  assert.ok(html.includes("on ne sait pas si elle a reçu une réponse"));
});

test("ce que le modèle rend passe par la dérivation avant d'être affiché", () => {
  // Sans elle, une demande restée sans réponse resterait une demande ordinaire
  // — et l'apport principal du procédé disparaîtrait sans bruit.
  const question = prise({
    nature: NATURE.DEMANDE, message: 1, porteSur: "cote du seuil",
    intitule: "confirmer la cote", pourQui: "BERTRAND", echeance: "avant vendredi"
  });
  const derive = leReleveDerive({ ok: true, prises: [question, AFFIRME, NIE] }, {
    messages: [{ rang: 1 }, { rang: 2 }]
  });
  assert.equal(derive.derive.sansReponse, 1);
  assert.equal(derive.derive.desaccords, 1);
  assert.deepEqual(derive.prises.map((prise) => prise.nature),
    [NATURE.SANS_REPONSE, NATURE.CONSTAT, NATURE.CONSTAT, NATURE.DESACCORD]);

  const html = dessine(analyse({ releve: derive }));
  assert.ok(html.includes("1 question sans réponse"));
  assert.ok(html.includes("1 désaccord possible"));
});

test("la longueur du fil vient du fil, pas des prises qu'on en a tirées", () => {
  // Un fil de cinq messages dont les trois derniers n'ont rien donné : la
  // demande du premier a bien été suivie de quatre messages qui l'ont ignorée.
  // Compter sur les prises dirait qu'aucun ne la suit, ce qui est le contraire
  // de ce qu'on cherche à montrer.
  const question = prise({ nature: NATURE.DEMANDE, message: 1, porteSur: "cote du seuil" });
  const derive = leReleveDerive({ ok: true, prises: [question] }, {
    messages: [{ rang: 1 }, { rang: 2 }, { rang: 3 }, { rang: 4 }, { rang: 5 }]
  });
  assert.equal(derive.prises[0].apresElle, 4);
});

test("un relevé qui a raté ne se dérive pas", () => {
  assert.equal(leReleveDerive({ ok: false, motif: "refuse" }, { messages: [] }), null);
});

test("un message sans prise n'en affiche aucune", () => {
  const html = dessine({ ...lu(PREMIER), releve: releve({ prises: [] }) });
  assert.equal(html.includes("fil-mails__prises"), false);
});

test("le rangement se dit pendant qu'il se fait, et pas avant", () => {
  assert.equal(dessine(lu(PREMIER)).includes("lecture-cr__versement"), false);
  const html = dessine({ ...lu(PREMIER), rangement: { dit: "Rangement…", enCours: true } });
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
  const html = dessine({
    ...lu(PREMIER),
    fil: { ...leFilDesMails([PREMIER]), trous: [{ quoi: TROU.FIL_ORDONNE_PAR_DATES, ou: "le fil" }] }
  });
  assert.ok(html.includes("ce fil a été ordonné par ses dates"));
  assert.equal(html.includes("quelque chose n&#39;a pas pu être placé"), false);
});
