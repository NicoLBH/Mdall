/**
 * L'écran du bac d'essai, tel qu'il se rend — sans DOM et sans appel.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  lignesDuFichier, renderOngletsDuBrouillon, renderVoletDuCode, renderEcrireEnMdall,
  renderVerification, renderFormulaire, renderResultats, renderBacDessai, renderTranscription,
  renderProposition, POSE, poseDuPanneau
} from "./ecrire-en-mdall.js";
import { REFUS, laTranscriptionLue } from "../../../services/le-mdall-rendu.js";
import { champsDuBrouillon } from "../../../services/formulaire-du-brouillon.js";
import { lancerLeBrouillon } from "../../../services/bac-dessai.js";
import { brouillonNeuf, avecLeFichier, avecLeDit, ouvertSur } from "../../../services/brouillon-mdall.js";

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

test("le correcteur dit son silence plutôt que de ne rien afficher", () => {
  // Un écran muet quand tout va bien laisse croire qu'il n'a pas regardé — et
  // l'on apprend alors à ne plus le croire quand il parle.
  assert.match(renderVerification(brouillonNeuf()), /Rien à vérifier/);
  assert.match(renderVerification(AVEC_UNE_DECLARATION), /Tout se lit/);
});

test("une remarque porte son fichier et sa ligne, et ils emmènent", () => {
  const casse = ouvertSur(avecLeFichier(brouillonNeuf(), "essai.ref", "du français ici"), "essai.ref");
  const html = renderVerification(casse);

  assert.match(html, /data-brouillon-aller="essai\.ref"/);
  assert.match(html, />\s*essai\.ref:1\s*</);
});

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

test("avant toute transcription, l'écran n'annonce rien", () => {
  // Une ligne vide sous le bouton se lirait comme un résultat.
  assert.equal(renderTranscription(null), "");
});

test("ce que le modèle n'a pas su écrire s'affiche, phrase et raison", () => {
  // C'est la moitié de ce qu'on vient chercher : une phrase du français qui
  // disparaît sans un mot laisse croire qu'elle a été codée, et l'on ne s'en
  // aperçoit qu'au moment où le raisonnement manque.
  const html = renderTranscription(laTranscriptionLue({
    fichiers: [{ nom: "essai.ref", contenu: "fonction A(zones) {\n}\n" }],
    lacunes: [{ phrase: "multiplie la surface par 0,7", pourquoi: "Mdall ne calcule pas." }],
    temperature: 0
  }));

  assert.match(html, /multiplie la surface par 0,7/);
  assert.match(html, /Mdall ne calcule pas\./);
  assert.match(html, /1 fichier écrit/);
});

test("un refus dit sa phrase et la panne nommée, sans les confondre", () => {
  const html = renderTranscription({ ok: false, motif: REFUS.REFUSE, panne: "delai_depasse" });

  assert.match(html, /il faut être connecté au projet/);
  assert.match(html, /brouillon-transcrit__panne">delai_depasse/);
});

test("ce que le modèle a rendu est échappé, jamais injecté", () => {
  // Le modèle écrit du texte libre : sa lacune passe par l'écran comme
  // n'importe quelle saisie.
  const html = renderTranscription(laTranscriptionLue({
    fichiers: [{ nom: "essai.ref", contenu: "fonction A(zones) {\n}\n" }],
    lacunes: [{ phrase: "<img src=x onerror=\"x\">", pourquoi: "<script>alert(1)</script>" }],
    temperature: 0
  }));

  assert.doesNotMatch(html, /<img /);
  assert.doesNotMatch(html, /<script>/);
});

/* ── « Proposer au projet » : la seule porte ─────────────────────────────── */

const AVEC_UNE_DONNEE = avecLeFichier(brouillonNeuf(), "essai.ddb", "Altitude du site = 890 m");

test("sans rien d'écrit, le panneau n'existe pas", () => {
  // Un bouton « Proposer » sur un brouillon vide se clique une fois pour rien.
  assert.equal(renderProposition(brouillonNeuf(), {}), "");
  assert.equal(renderProposition(null, {}), "");
});

test("le bouton s'arme dès qu'une ligne affirme quelque chose", () => {
  const html = renderProposition(AVEC_UNE_DONNEE, {});

  assert.match(html, /data-brouillon-proposer/);
  assert.doesNotMatch(html, /data-brouillon-proposer disabled/);
  assert.match(html, /1 ligne à proposer/);
  assert.match(html, /Rien n&#39;entre sans signature|Rien n'entre sans signature/);
});

test("un brouillon qui n'affirme rien ne s'arme pas, et dit pourquoi", () => {
  // Une phrase du français qu'on a oublié de coder se lit comme un nom nu : le
  // proposer porterait une ligne que personne ne peut relire.
  const html = renderProposition(avecLeFichier(brouillonNeuf(), "essai.ddb", "la zone de vent vaut trois"), {});

  assert.match(html, /data-brouillon-proposer disabled/);
  assert.match(html, /aucune ligne du brouillon n&#39;affirme|aucune ligne du brouillon n'affirme/);
});

test("ce qui reste dehors se lit à côté du bouton, pas après le clic", () => {
  // L'apprendre une fois la proposition ouverte reviendrait à l'apprendre trop
  // tard, et à croire qu'on a proposé le brouillon entier.
  const brouillon = avecLeFichier(
    avecLeFichier(brouillonNeuf(), "essai.ddb", "Altitude du site = 890 m"),
    "variables-du-projet.ref",
    "const Zone de vent = {\n   type: \"texte\",\n};"
  );

  const html = renderProposition(brouillon, {});
  assert.match(html, /brouillon-propose__dehors/);
  assert.match(html, /Zone de vent/);
  assert.match(html, /1 reste dehors/);
});

test("pendant l'ouverture, le bouton se désarme", () => {
  // Deux clics ouvriraient deux propositions portant les mêmes lignes.
  const html = renderProposition(AVEC_UNE_DONNEE, { depose: true });

  assert.match(html, /data-brouillon-proposer disabled/);
  assert.match(html, /Proposition en cours/);
});

test("ce que la proposition a donné se dit, dans un sens comme dans l'autre", () => {
  const fait = renderProposition(AVEC_UNE_DONNEE, { depot: { ok: true, dit: "Proposition n° 12 ouverte." } });
  assert.match(fait, /Proposition n° 12 ouverte\./);
  assert.doesNotMatch(fait, /brouillon-propose__depot--refus/);

  const refus = renderProposition(AVEC_UNE_DONNEE, { depot: { ok: false, dit: "Ce projet n'est pas relié à la base." } });
  assert.match(refus, /brouillon-propose__depot--refus/);
  assert.match(refus, /pas relié à la base/);
});

test("l'écran dit que rien n'entre sans signature, et pas seulement dans son code", () => {
  // « On ne doit RIEN verser DIRECTEMENT dans la mémoire, JAMAIS. »
  const html = renderEcrireEnMdall(AVEC_UNE_DONNEE, {});

  assert.match(html, /data-brouillon-proposer/);
  assert.match(html, /signature|signée|signer/);
});

test("ce qui reste dehors est échappé, jamais injecté", () => {
  const html = renderProposition(
    avecLeFichier(brouillonNeuf(), "essai.ddb", "Altitude = 890 m\n<img src=x onerror=\"x\">"),
    {}
  );

  assert.doesNotMatch(html, /<img /);
});

/* ── Le redessin ciblé, et le défaut qui fermait l'écran ─────────────────── */

/**
 * **« Maximum call stack size exceeded » au chargement, sur un brouillon
 * vide.** Le panneau de proposition n'existait pas encore, et il n'y avait rien
 * à écrire non plus ; le redessin ciblé se rabattait alors sur un redessin
 * entier. Or redessiner rebranche, et brancher **déclenche un changement** —
 * `brancherLaSaisieDeCode` appelle `surChangement` une fois à la pose, pour que
 * la gouttière parte avec le bon nombre de lignes. L'écran s'appelait donc
 * lui-même jusqu'à épuiser la pile, et ne s'ouvrait pas du tout.
 *
 * Le cas fautif est le plus banal de tous : celui de l'écran à l'ouverture.
 */
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

test("le bac d'essai se lit avant « Proposer au projet », et le rendu en décide", () => {
  // Les deux blocs se posent à des moments différents — le bac à « Lancer »,
  // le panneau à la frappe — et chacun s'insère en DOM. Sans un ordre écrit
  // quelque part, il dépendrait de celui des clics. C'est le rendu qui le dit,
  // et les poses s'y rangent.
  const html = renderEcrireEnMdall(
    avecLeFichier(brouillonNeuf(), "essai.ddb", "Altitude du site = 890 m"),
    { bac: true }
  );

  assert.ok(html.includes("bac"), "le bac n'est pas dessiné");
  assert.ok(html.includes("brouillon-propose"), "le panneau n'est pas dessiné");
  assert.ok(html.indexOf('class="bac"') < html.indexOf('class="brouillon-propose"'),
    "le panneau de proposition passe avant le bac d'essai");
});
