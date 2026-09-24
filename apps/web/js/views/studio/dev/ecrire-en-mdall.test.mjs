/**
 * L'écran du bac d'essai, tel qu'il se rend — sans DOM et sans appel.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  lignesDuFichier, renderOngletsDuBrouillon, renderVoletDuCode, renderEcrireEnMdall,
  renderFormulaire, renderResultats, renderBacDessai, renderConsole, renderProposer,
  renderVoletDeLaConsole, POSE, poseDuPanneau
} from "./ecrire-en-mdall.js";
import { laConsole } from "../../../services/console-du-brouillon.js";
import { REFUS, laTranscriptionLue } from "../../../services/le-mdall-rendu.js";
import { champsDuBrouillon } from "../../../services/formulaire-du-brouillon.js";
import { lancerLeBrouillon } from "../../../services/bac-dessai.js";
import {
  brouillonNeuf, avecLeFichier, avecLeDit, ouvertSur, fichiersRemplis
} from "../../../services/brouillon-mdall.js";

const AVEC_UNE_REGLE = ouvertSur(avecLeFichier(brouillonNeuf(), "essai.ref", [
  "fonction Vitesse de référence(zones, Zone de vent) {",
  "   si (Zone de vent = 3)",
  "   alors (\"120 km/h\");",
  "}"
].join("\n")), "essai.ref");

/* ── Les lignes se colorent comme dans la Mémoire ────────────────────────── */

test("une ligne tapée à la main rend les jetons du langage", () => {
  // C'est tout l'intérêt : le brouillon n'a pas d'affirmations, il a du texte —
  // et `jetonsDeLaLigne` le rend comme la Mémoire rendrait la même ligne.
  const lignes = lignesDuFichier("   si (Zone de vent = 3)");

  assert.equal(lignes.length, 1);
  assert.equal(lignes[0].rang, 1);
  assert.equal(lignes[0].jetons.some((jeton) => jeton.type === "mot-condition"), true);
  assert.equal(lignes[0].jetons.some((jeton) => jeton.type === "sujet"), true);
});

test("les lignes sont numérotées à partir de 1, et une ligne vide garde sa place", () => {
  const lignes = lignesDuFichier("fonction X(zones) {\n\n}");

  assert.deepEqual(lignes.map((ligne) => ligne.rang), [1, 2, 3]);
  assert.deepEqual(lignes[1].jetons, []);
});

test("les retours chariot de Windows ne comptent pas pour des lignes", () => {
  // Un collage depuis un traitement de texte en porte, et doubler le compte
  // ferait désigner d'autres lignes que celles qu'on montre.
  assert.equal(lignesDuFichier("a\r\nb\r\nc").length, 3);
});

test("un fichier vide n'a aucune ligne — et pas une ligne vide", () => {
  assert.deepEqual(lignesDuFichier(""), []);
  assert.deepEqual(lignesDuFichier(null), []);
});

/* ── Les onglets ─────────────────────────────────────────────────────────── */

test("il y a un onglet par fichier, et celui qui est ouvert se voit", () => {
  const html = renderOngletsDuBrouillon(AVEC_UNE_REGLE);

  assert.equal((html.match(/data-brouillon-onglet=/g) ?? []).length, 3);
  assert.match(html, /data-brouillon-onglet="essai\.ref"[^>]*aria-pressed="true"/);
  assert.match(html, /data-brouillon-onglet="essai\.ddb"[^>]*aria-pressed="false"/);
});

test("un onglet qui porte du texte dit combien de lignes, les autres se taisent", () => {
  // Trois onglets identiques ne disent pas lequel porte le travail.
  const html = renderOngletsDuBrouillon(AVEC_UNE_REGLE);

  assert.match(html, /essai\.ref\s*<span class="brouillon-onglet__compte">4<\/span>/);
  assert.equal((html.match(/brouillon-onglet__compte/g) ?? []).length, 1);
});

/* ── Le volet de droite ──────────────────────────────────────────────────── */

test("en lecture « Code », le volet offre une zone de saisie modifiable", () => {
  // C'est la porte sans modèle : on écrit directement, sans jamais cliquer
  // « Coder » (fondamental 13).
  const html = renderVoletDuCode(AVEC_UNE_REGLE, { lecture: "code" });

  assert.match(html, /<textarea[^>]*data-brouillon-code/);
  assert.match(html, /fonction Vitesse de référence/);
});

test("en lecture « Rendu », le volet colore au lieu de laisser écrire", () => {
  const html = renderVoletDuCode(AVEC_UNE_REGLE, { lecture: "rendu" });

  assert.doesNotMatch(html, /<textarea/);
  assert.match(html, /class="mdall-mot-condition">si<\/span>/);
  assert.match(html, /class="memoire-ligne__num">1<\/span>/);
});

test("un fichier vide en « Rendu » dit qu'il est vide, et par où le remplir", () => {
  // Un cadre blanc se lit « panne ».
  const html = renderVoletDuCode(brouillonNeuf(), { lecture: "rendu" });

  assert.match(html, /Ce fichier est vide/);
  assert.match(html, /Coder/);
});

test("le volet dit ce que porte le fichier ouvert, et dans quelle langue", () => {
  assert.match(renderVoletDuCode(AVEC_UNE_REGLE, {}), /Les règles — ce qui se raisonne/);
  assert.match(renderVoletDuCode(AVEC_UNE_REGLE, {}), /brouillon-volet__langue">regle/);
  assert.match(renderVoletDuCode(ouvertSur(brouillonNeuf(), "essai.ddb"), {}),
    /brouillon-volet__langue">declaration/);
});

test("sans fichier, le volet ne rend rien plutôt que de rendre un cadre", () => {
  assert.equal(renderVoletDuCode({ fichiers: [] }, {}), "");
  assert.equal(renderVoletDuCode(null, {}), "");
});

/* ── L'écran entier ──────────────────────────────────────────────────────── */

test("« Coder » ne s'arme que lorsqu'il y a une phrase à transcrire", () => {
  // Un bouton qui ne fait rien en silence se clique deux fois avant qu'on
  // comprenne. Désactivé, il dit pourquoi dans son infobulle.
  const vide = renderEcrireEnMdall(brouillonNeuf(), {});
  assert.match(vide, /data-brouillon-coder disabled/);
  assert.match(vide, /title="Écrivez d'abord ce que vous voulez poser"/);

  const avec = renderEcrireEnMdall(avecLeDit(brouillonNeuf(), "la zone de vent vaut 3"), {});
  assert.doesNotMatch(avec, /data-brouillon-coder disabled/);
});

test("pendant la transcription, « Coder » se désarme", () => {
  // Deux clics feraient deux appels payés, dont le second écraserait le premier
  // sans que rien ne le dise.
  const html = renderEcrireEnMdall(avecLeDit(brouillonNeuf(), "un essai"), { transcrit: true });

  assert.match(html, /data-brouillon-coder disabled/);
  assert.match(html, /Transcription en cours/);
});

test("l'écran rappelle que l'IA n'est pas le seul chemin", () => {
  // Fondamental 13, à l'écran et pas seulement dans le code : l'autre porte est
  // à côté, et il faut qu'on la voie.
  assert.match(renderEcrireEnMdall(brouillonNeuf(), {}), /jamais le seul chemin/);
  assert.match(renderEcrireEnMdall(brouillonNeuf(), {}), /écrire\s+directement à droite/);
});

test("l'écran dit que rien ne s'écrit dans le projet", () => {
  // « On ne doit RIEN verser DIRECTEMENT dans la mémoire, JAMAIS. » Le bac
  // d'essai doit le porter à l'écran, pas seulement dans son code.
  assert.match(renderEcrireEnMdall(brouillonNeuf(), {}), /rien ne s'écrit dans le projet/);
});

test("« Tout effacer » ne paraît que lorsqu'il y a quelque chose à perdre", () => {
  assert.doesNotMatch(renderEcrireEnMdall(brouillonNeuf(), {}), /data-brouillon-vider/);
  assert.match(renderEcrireEnMdall(avecLeDit(brouillonNeuf(), "un essai"), {}), /data-brouillon-vider/);
});

test("la largeur du volet gauche se pose par une variable, pas en dur", () => {
  // Elle se tire à la poignée, et une largeur écrite dans le balisage ne se
  // tirerait pas.
  assert.match(renderEcrireEnMdall(brouillonNeuf(), { largeur: 512 }), /--brouillon-dit-width:512px/);
});

test("ce qui est tapé dans la zone de français est échappé, jamais injecté", () => {
  const html = renderEcrireEnMdall(avecLeDit(brouillonNeuf(), "</textarea><script>alert(1)</script>"), {});

  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;\/textarea&gt;/);
});

test("ce qui est tapé dans un fichier est échappé aussi, dans les deux lectures", () => {
  const brouillon = ouvertSur(avecLeFichier(brouillonNeuf(), "essai.ref", '<img src=x onerror="x">'), "essai.ref");

  assert.doesNotMatch(renderVoletDuCode(brouillon, { lecture: "code" }), /<img /);
  assert.doesNotMatch(renderVoletDuCode(brouillon, { lecture: "rendu" }), /<img /);
});

/* ── Les cas que la batterie a trouvés muets ─────────────────────────────── */

test("un retour chariot seul sépare des lignes, il n'en fait pas une seule", () => {
  // Une zone de saisie ne rend jamais de `\r` — le navigateur normalise. Mais
  // le lot qui transcrira posera du texte **par programme**, depuis le JSON
  // d'un modèle, et rien ne garantit ses fins de ligne. Un fichier de quarante
  // lignes deviendrait alors une seule ligne numérotée 1, illisible et
  // impossible à désigner.
  assert.equal(lignesDuFichier("fonction X(zones) {\r   si (A = 1)\r}").length, 3);
  assert.equal(lignesDuFichier("a\r\nb\r\nc").length, 3);
});

test("un fichier qui ne porte que des espaces ne compte pas de lignes", () => {
  // Le même jugement que « ce fichier porte quelque chose » : deux réponses
  // feraient un onglet qui annonce une ligne dans un fichier qu'on tient par
  // ailleurs pour vide (règle 4).
  const brouillon = ouvertSur(avecLeFichier(brouillonNeuf(), "essai.ref", "   \n  "), "essai.ref");

  assert.doesNotMatch(renderOngletsDuBrouillon(brouillon), /brouillon-onglet__compte/);
});

test("un nom de fichier est échappé dans son onglet", () => {
  // Ils sont à nous aujourd'hui. Le lot qui garde un brouillon dans
  // `Documents/` les fera venir d'ailleurs, et un onglet est l'endroit où l'on
  // s'en apercevrait le plus tard.
  const html = renderOngletsDuBrouillon({
    fichiers: [{ nom: '"><script>alert(1)</script>', quoi: "un essai", contenu: "" }],
    ouvert: '"><script>alert(1)</script>'
  });

  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("ce qu'un fichier dit de lui-même est échappé aussi", () => {
  const html = renderOngletsDuBrouillon({
    fichiers: [{ nom: "essai.ref", quoi: '" onmouseover="x', contenu: "" }],
    ouvert: "essai.ref"
  });

  assert.doesNotMatch(html, /onmouseover="x/);
  assert.match(html, /&quot; onmouseover=/);
});

/* ── Le correcteur, et le bac d'essai ────────────────────────────────────── */

const AVEC_UNE_DECLARATION = ouvertSur(avecLeFichier(
  avecLeFichier(brouillonNeuf(), "variables-du-projet.ref", [
    "const Zone de vent = {",
    '   type: "texte",',
    '   valeurs possibles: "1" ou "2" ou "3" ou "4",',
    '   description: "Zone de vent de la commune.",',
    "};"
  ].join("\n")),
  "essai.ref", [
    "fonction Vitesse de référence(zones, Zone de vent) {",
    '   si (Zone de vent = "3")',
    '   alors ("120 km/h");',
    '   sinon ("100 km/h");',
    "}"
  ].join("\n")
), "essai.ref");

test("un domaine fermé devient une vraie liste déroulante", () => {
  // Sans un mot d'affichage dans le langage : le nom est l'étiquette, la
  // description est l'aide, le domaine est la liste.
  const champs = champsDuBrouillon(AVEC_UNE_DECLARATION.fichiers.filter((un) => un.contenu));
  const html = renderFormulaire(champs, {});

  assert.match(html, /<select[^>]*data-bac-champ="Zone de vent"/);
  assert.equal((html.match(/<option value="[1-4]"/g) ?? []).length, 4);
  assert.match(html, /title="Zone de vent de la commune\."/);
});

test("un nom non déclaré se remplit quand même, et le dit", () => {
  const champs = champsDuBrouillon([{ nom: "essai.ref", contenu: [
    "fonction Fondations(zones, Portance du sol) {",
    "   si (Portance du sol >= 0,2 MPa)",
    '   alors ("superficielles");',
    "}"
  ].join("\n") }]);

  assert.match(renderFormulaire(champs, {}), /non déclaré/);
  assert.match(renderFormulaire(champs, {}), /<input type="text"[^>]*data-bac-champ="Portance du sol"/);
});

test("« indécidable » s'écrit comme tel, jamais comme « faux »", () => {
  // C'est l'intérêt de l'écran : une entrée qui manque n'est pas une entrée
  // fausse, et c'est par cette réponse-là qu'on apprend le langage.
  const remplis = AVEC_UNE_DECLARATION.fichiers.filter((un) => un.contenu);
  const html = renderResultats(lancerLeBrouillon(remplis));

  assert.match(html, /bac-trace__verite--indécidable/);
  assert.doesNotMatch(html, /bac-trace__verite--faux/);
  assert.match(html, /ne sait pas/);
});

test("avec la réponse, la fonction conclut et montre ce qu'elle a lu", () => {
  const remplis = AVEC_UNE_DECLARATION.fichiers.filter((un) => un.contenu);
  const html = renderResultats(lancerLeBrouillon(remplis, { "Zone de vent": "3" }));

  assert.match(html, /120 km\/h/);
  assert.match(html, /bac-trace__verite--vrai/);
  assert.match(html, /Zone de vent = 3/);
});

test("le bac ne montre aucun verdict tant qu'on n'a pas lancé", () => {
  // Un verdict affiché sans qu'on l'ait demandé décrirait un essai qu'on n'a
  // pas fait.
  const avant = renderBacDessai(AVEC_UNE_DECLARATION, { reponses: {}, lance: false });

  assert.match(avant, /data-bac-champ/);
  assert.doesNotMatch(avant, /bac-resultat/);
});

test("le bouton « Lancer » ne s'active que s'il y a une fonction à lancer", () => {
  // Un bouton qui lancerait le vide ne dirait rien ; désactivé, il dit
  // pourquoi.
  assert.match(renderVoletDuCode(brouillonNeuf(), {}), /data-brouillon-lancer disabled/);
  assert.doesNotMatch(renderVoletDuCode(AVEC_UNE_DECLARATION, {}), /data-brouillon-lancer disabled/);
});

test("ce qu'on répond est échappé, dans une liste comme dans un champ", () => {
  const champs = [
    { nom: "A", cle: "a", saisie: "texte", unite: "", choix: [], aide: "", declare: true },
    { nom: "B", cle: "b", saisie: "liste", unite: "", choix: ['"><script>alert(1)</script>'], aide: "", declare: true }
  ];
  const html = renderFormulaire(champs, { A: '"><script>alert(1)</script>' });

  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

/* ── Ce que la transcription a rendu ─────────────────────────────────────── */

const AVEC_UNE_DONNEE = avecLeFichier(brouillonNeuf(), "essai.ddb", "Altitude du site = 890 m");

test("l'écran dit que rien n'entre sans signature, et pas seulement dans son code", () => {
  // « On ne doit RIEN verser DIRECTEMENT dans la mémoire, JAMAIS. »
  const html = renderEcrireEnMdall(AVEC_UNE_DONNEE, {});

  assert.match(html, /data-brouillon-proposer/);
  assert.match(html, /signature|signée|signer/);
});

test("sans panneau et sans rien à écrire, on ne fait rien — surtout pas tout redessiner", () => {
  assert.equal(poseDuPanneau({ present: false, aEcrire: false }), POSE.RIEN);
});

test("le panneau naît avec la première ligne, et meurt avec la dernière effacée", () => {
  assert.equal(poseDuPanneau({ present: false, aEcrire: true }), POSE.POSER);
  assert.equal(poseDuPanneau({ present: true, aEcrire: false }), POSE.RETIRER);
  assert.equal(poseDuPanneau({ present: true, aEcrire: true }), POSE.REMPLACER);
});

test("sans rien qu'on lui dise, la pose ne fait rien", () => {
  // L'appelant qui oublie ses deux arguments ne doit pas déclencher le seul cas
  // qui touche au DOM sans qu'on le lui ait demandé.
  assert.equal(poseDuPanneau(), POSE.RIEN);
  assert.equal(poseDuPanneau({}), POSE.RIEN);
});

/**
 * **Cette épreuve relit le source, et c'est l'exception qui le justifie.**
 *
 * Une épreuve de rendu ne peut pas voir ce défaut : il n'est pas dans ce qui se
 * dessine, il est dans **quand ça se rebranche**. Il ne se voit qu'avec un
 * navigateur, ou ici — et il est parti en production une fois.
 *
 * La règle qu'elle tient : un redessin ciblé pose, remplace, retire, ou ne fait
 * rien. Il n'appelle jamais `dessiner`, qui rebranche et rappellerait le
 * redessin ciblé.
 */
test("aucun redessin ciblé n'appelle le redessin entier", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const source = readFileSync(fileURLToPath(new URL("./ecrire-en-mdall.js", import.meta.url)), "utf8");

  // Le corps de chaque `function redessinerX(...)`, jusqu'à l'accolade de fin
  // posée en première colonne — la convention du fichier, et celle du projet.
  const cibles = [...source.matchAll(/\nfunction (redessiner\w+)\([^)]*\) \{\n([\s\S]*?)\n\}\n/g)];

  assert.ok(cibles.length >= 3, `trop peu de redessins ciblés trouvés : ${cibles.length}`);

  for (const [, nom, corps] of cibles) {
    assert.doesNotMatch(corps, /\bdessiner\(/, `${nom} appelle dessiner : l'écran se rappellera sans fin`);
  }
});

test("le bac d'essai se lit avant la console, et le rendu en décide", () => {
  // Les deux blocs se posent à des moments différents — le bac à « Lancer », la
  // console à la frappe — et chacun s'insère en DOM. Sans un ordre écrit
  // quelque part, il dépendrait de celui des clics. C'est le rendu qui le dit,
  // et les poses s'y rangent.
  const html = renderEcrireEnMdall(AVEC_UNE_DONNEE, { bac: true });

  assert.ok(html.includes('class="bac"'), "le bac n'est pas dessiné");
  assert.ok(html.includes("brouillon-console"), "la console n'est pas dessinée");
  assert.ok(html.indexOf('class="bac"') < html.indexOf('class="brouillon-console'),
    "la console passe avant le bac d'essai");
});

/* ── Le titre, et le geste qui engage ────────────────────────────────────── */

test("le titre prend le format des autres écrans de l'Atelier", () => {
  // « Il faut mutualiser ces classes, c'est pénible sinon de toujours tout
  //   recalibrer entre les différents écrans. »
  const html = renderEcrireEnMdall(AVEC_UNE_DONNEE, {});

  for (const classe of ["lecture-cr__entete", "lecture-cr__entete-ligne", "lecture-cr__titre",
    "lecture-cr__entete-actions"]) {
    assert.ok(new RegExp(`class="${classe}[ "]`).test(html), `classe absente : ${classe}`);
  }
  assert.match(html, /<h2 class="lecture-cr__titre">Écrire en Mdall<\/h2>/);
});

test("« Proposer au projet » se tient sur la ligne du titre, à droite", () => {
  // C'est le geste qui engage. Le chercher en bas de page après trois volets
  // ferait manquer la seule porte vers la mémoire.
  const html = renderEcrireEnMdall(AVEC_UNE_DONNEE, {});
  const actions = html.indexOf('class="lecture-cr__entete-actions"');

  assert.ok(actions > 0, "la ligne de titre n'a pas ses actions");
  assert.ok(html.indexOf("data-brouillon-proposer") > actions, "le bouton n'est pas dans la ligne de titre");
  assert.ok(html.indexOf("data-brouillon-proposer") < html.indexOf("brouillon__corps"),
    "le bouton est passé sous les volets");
});

test("rien à proposer : le bouton ne paraît pas plutôt que de s'éteindre", () => {
  // Un bouton éteint en permanence dans l'en-tête devient un décor qu'on cesse
  // de voir.
  assert.equal(renderProposer(brouillonNeuf(), {}), "");
  assert.match(renderProposer(AVEC_UNE_DONNEE, {}), /data-brouillon-proposer/);
});

test("pendant la proposition, le bouton se désarme et tourne", () => {
  // Deux clics ouvriraient deux propositions portant les mêmes lignes.
  const html = renderProposer(AVEC_UNE_DONNEE, { depose: true });

  assert.match(html, /data-brouillon-proposer disabled/);
  assert.match(html, /ui-spinner/);
});

/* ── Le bouton vert tourne ───────────────────────────────────────────────── */

test("« Coder » montre un vrai rouet pendant la transcription, pas trois points", () => {
  // Un bouton qui change de libellé sans rien montrer laisse croire qu'il n'a
  // pas pris le clic — et l'on clique une seconde fois.
  const html = renderEcrireEnMdall(avecLeDit(brouillonNeuf(), "un essai"), { transcrit: true });

  assert.match(html, /data-brouillon-coder disabled/);
  assert.match(html, /ui-spinner/);
  assert.match(html, /Transcription…/);
});

/* ── La console ──────────────────────────────────────────────────────────── */

const AVEC_UN_DEFAUT = avecLeFichier(brouillonNeuf(), "essai.ref", [
  "fonction vitesse de reference(zones, région de vent) {",
  "   si (région de vent = 1)",
  "   renvoyer vitesse vent",
  "}"
].join("\n"));

test("la console rassemble tout ce que l'écran a à dire", () => {
  const html = renderEcrireEnMdall(AVEC_UN_DEFAUT, {});

  assert.match(html, /brouillon-console__liste/);
  assert.match(html, /nom jamais déclaré/);
  assert.match(html, /essai\.ref:3/);
});

test("une ligne de console porte d'où elle vient, où c'est, et ce qui se dit", () => {
  const [ligne] = laConsole({ fichiers: [{ nom: "essai.ref", contenu: "   si (x = 1)" }] });
  const html = renderConsole([ligne], {});

  assert.match(html, /brouillon-console__source">\s*lecture/);
  assert.match(html, /data-brouillon-aller="essai\.ref"/);
  assert.match(html, new RegExp(`brouillon-console__ligne--${ligne.niveau}`));
});

test("un brouillon sans rien à dire garde sa console, et dit qu'il n'a rien à dire", () => {
  // Un écran muet laisse croire qu'il n'a pas regardé — et l'on apprend alors à
  // ne plus lui faire confiance quand il parle.
  const html = renderConsole([], {});

  assert.match(html, /brouillon-console/);
  assert.match(html, /Rien à signaler/);
  // Rien à déplacer : le bouton de place ne paraît pas.
  assert.doesNotMatch(html, /data-brouillon-console-place/);
});

test("la console se déplace à droite, et ne s'affiche jamais aux deux places", () => {
  // Deux fois la même liste serait exactement l'éparpillement qu'on répare, en
  // pire.
  const lignes = laConsole({ fichiers: fichiersRemplis(AVEC_UN_DEFAUT) });

  const enBas = renderEcrireEnMdall(AVEC_UN_DEFAUT, { volet: false });
  assert.equal((enBas.match(/brouillon-console__liste/g) ?? []).length, 1);
  assert.doesNotMatch(enBas, /brouillon-volet--console/);

  const aDroite = renderEcrireEnMdall(AVEC_UN_DEFAUT, { volet: true });
  assert.equal((aDroite.match(/brouillon-console__liste/g) ?? []).length, 1);
  assert.match(aDroite, /brouillon-volet--console/);
  assert.ok(lignes.length > 0);
});

test("la troisième colonne se déclare sur le cadre, et seulement quand elle sert", () => {
  // Une colonne vide laisserait un vide à droite du code, qu'on prendrait pour
  // un défaut.
  assert.match(renderEcrireEnMdall(AVEC_UN_DEFAUT, { volet: true }), /data-console="volet"/);
  assert.match(renderEcrireEnMdall(AVEC_UN_DEFAUT, { volet: false }), /data-console="bas"/);
  // Rien à montrer : la console reste en bas, quoi qu'on ait demandé.
  assert.match(renderEcrireEnMdall(brouillonNeuf(), { volet: true }), /data-console="bas"/);
  assert.equal(renderVoletDeLaConsole([], { volet: true }), "");
});

test("la largeur du troisième volet se pose par une variable, pas en dur", () => {
  assert.match(renderEcrireEnMdall(AVEC_UN_DEFAUT, { volet: true, largeurConsole: 512 }),
    /--brouillon-console-width:512px/);
});

test("ce qu'un message rapporte est échappé, jamais injecté", () => {
  // Une ligne de console porte du texte venu d'un fichier tapé à la main, et
  // d'un modèle.
  const html = renderConsole(laConsole({
    fichiers: [{ nom: "essai.ddb", contenu: "Altitude = 890 m\n<img src=x onerror=\"x\">" }],
    rendu: { ok: false, motif: "en-panne", panne: "<script>alert(1)</script>" }
  }), {});

  assert.doesNotMatch(html, /<img /);
  assert.doesNotMatch(html, /<script>/);
});
