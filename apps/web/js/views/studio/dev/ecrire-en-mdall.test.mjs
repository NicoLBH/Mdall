/**
 * L'écran du bac d'essai, tel qu'il se rend — sans DOM et sans appel.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  lignesDuFichier, renderOngletsDuBrouillon, renderVoletDuCode, renderEcrireEnMdall,
  renderFormulaire, renderResultats, renderBacDessai, renderConsole, renderProposer,
  renderVoletDeLaConsole, renderGestes, colorerDuMdall, POSE, poseDuPanneau,
  renderActionsDuTitre, hauteurDuCadre, HAUTEUR_MINIMALE, MARGE_DU_BAS, GESTE,
  renderTeteDeLaConsole, marquesDuChoixLogique, CLASSE_DU_CHOIX, leBacEstLa,
  renderTitreDuBrouillon, renderFicheDeLetabli, renderVerdictDeLetabli,
  renderDeduitDeLetabli, renderListeDeLetabli, GESTE_DE_LETABLI
} from "./ecrire-en-mdall.js";
import { ficheDuBrouillon, ceQueLenregistrementFait } from "../../../services/utilitaire-de-letabli.js";
import { renderLignesDeCode } from "../../ui/code-mdall.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
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
  assert.match(vide, /Écrivez d&#39;abord ce que vous voulez poser/);

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

test("l'écran dit que rien n'entre sans signature, au moment où cela compte", () => {
  // « On ne doit RIEN verser DIRECTEMENT dans la mémoire, JAMAIS. » Une phrase
  // permanente sous le titre le disait à un écran vide, c'est-à-dire à personne,
  // et elle se lisait une fois puis jamais. La console le dit **quand il y a
  // quelque chose à verser**, ce qui est le seul moment où on l'entend.
  const vide = renderEcrireEnMdall(brouillonNeuf(), {});
  assert.doesNotMatch(vide, /lecture-cr__mot/);

  const ecrit = renderEcrireEnMdall(
    avecLeFichier(brouillonNeuf(), "essai.ddb", "Altitude du site = 890 m"), {});
  assert.match(ecrit, /rien n(&#39;|')entre sans signature/);
});

test("« Tout effacer » vit dans le menu du titre, et s'éteint quand il n'y a rien", () => {
  // Un geste qui détruit tout le brouillon ne se range pas à côté du geste
  // qu'on répète : il se range où l'on va le chercher exprès.
  const vide = renderEcrireEnMdall(brouillonNeuf(), {});
  assert.match(vide, new RegExp(`data-menu-action="${GESTE.VIDER}"[^>]*\\n?\\s*disabled`));

  const avec = renderEcrireEnMdall(avecLeDit(brouillonNeuf(), "un essai"), {});
  assert.match(avec, new RegExp(`data-menu-action="${GESTE.VIDER}"`));
  assert.doesNotMatch(avec.slice(avec.indexOf(`data-menu-action="${GESTE.VIDER}"`)).slice(0, 200),
    /disabled/);
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

test("« Lancer » s'arme dès qu'il y a du Mdall, pas seulement une fonction", () => {
  // **Le défaut que ça répare : le bouton était inopérant.** Il ne s'armait que
  // si le brouillon portait une fonction — une règle avec des conditions. Un
  // brouillon qui ne pose que des affirmations, ce qui est le cas du premier
  // qu'on écrit, laissait donc un bouton éteint qu'on croyait cassé.
  assert.match(renderActionsDuTitre(brouillonNeuf(), {}), /data-brouillon-lancer disabled/);
  assert.doesNotMatch(renderActionsDuTitre(AVEC_UNE_DECLARATION, {}), /data-brouillon-lancer disabled/);

  // Une seule donnée, aucune fonction : il s'arme, et c'est le bac qui dira
  // qu'il n'y a rien à raisonner.
  const donnee = avecLeFichier(brouillonNeuf(), "essai.ddb", "Altitude du site = 890 m");
  assert.doesNotMatch(renderActionsDuTitre(donnee, {}), /data-brouillon-lancer disabled/);
  assert.equal(lancerLeBrouillon(fichiersRemplis(donnee)).length, 0);
});

test("« Lancer » a quitté la barre des onglets pour la ligne du titre", () => {
  // Il vivait dans la barre qui sert à choisir un fichier, c'est-à-dire au
  // milieu de l'écran. Les trois gestes se tiennent sur la même ligne.
  assert.doesNotMatch(renderVoletDuCode(AVEC_UNE_DECLARATION), /data-brouillon-lancer/);

  const html = renderEcrireEnMdall(AVEC_UNE_DECLARATION, {});
  assert.ok(html.indexOf("data-brouillon-lancer") > html.indexOf('class="lecture-cr__entete-actions"'),
    "« Lancer » n'est pas dans la ligne de titre");
  assert.ok(html.indexOf("data-brouillon-lancer") < html.indexOf("brouillon__corps"),
    "« Lancer » est passé sous les volets");
});

test("le bac dit ce qu'il trouve, même quand il ne trouve rien à lancer", () => {
  // Un écran muet laisse croire que le clic n'a pas pris. « Lancer » sur un
  // brouillon qui ne raisonne pas doit répondre, pas se taire (règle 5).
  const donnee = avecLeFichier(brouillonNeuf(), "essai.ddb", "Altitude du site = 890 m");
  const html = renderBacDessai(donnee, { reponses: {}, lance: true });

  assert.match(html, /ne raisonne pas encore/);
  assert.doesNotMatch(html, /class="bac-resultat /);
});

/* ── Une réponse se lit tout de suite, et sans perdre le curseur ─────────── */

test("le bloc des résultats porte le nom sous lequel on va le remplacer", () => {
  // **Le défaut que ça répare : on remplaçait tout le contenu de la fenêtre à
  // chaque frappe**, donc le champ où le doigt était posé. Le redessin ne
  // repose plus que `.bac-resultats` — ce qui suppose que les deux rendus
  // produisent exactement le même bloc. Écrit deux fois, il divergerait au
  // premier réglage, et l'on empilerait deux verdicts au lieu d'en remplacer un
  // (règle 4).
  const reponses = { "Zone de vent": "3" };
  const attendu = renderResultats(lancerLeBrouillon(fichiersRemplis(AVEC_UNE_DECLARATION), reponses));
  const html = renderBacDessai(AVEC_UNE_DECLARATION, { reponses, lance: true });

  assert.match(attendu, /^\s*<div class="bac-resultats">/);
  assert.ok(html.includes(attendu), "le bac ne montre pas le bloc que le redessin repose");
  assert.equal((html.match(/class="bac-resultats"/g) ?? []).length, 1);
});

test("le verdict ne se pose que dans une fenêtre qui montre bien le bac", () => {
  // La fenêtre est prêtée : le wiki du langage s'ouvre dans la même, à un clic
  // du bac dans le même menu. Y écrire un verdict le poserait au milieu d'un
  // article — et l'on ne s'en apercevrait qu'à l'écran.
  assert.equal(leBacEstLa({ querySelector: (quoi) => (quoi === ".bac" ? {} : null) }), true);
  assert.equal(leBacEstLa({ querySelector: () => null }), false);
  assert.equal(leBacEstLa(null), false);
  assert.equal(leBacEstLa(), false);
});

test("les marques du choix logique se nomment une seule fois", () => {
  // Cliquer « oui » ne redessine plus le formulaire — il emporterait le curseur
  // du champ d'à côté —, il marque les deux boutons en place. La classe et
  // l'attribut se posent donc au rendu et au clic : une seule fonction les dit.
  assert.deepEqual(marquesDuChoixLogique(true), { classe: CLASSE_DU_CHOIX, presse: "true" });
  assert.deepEqual(marquesDuChoixLogique(false), { classe: "", presse: "false" });
  assert.deepEqual(marquesDuChoixLogique(), { classe: "", presse: "false" });

  // Et c'est **la** classe de la feuille de style : renommée ici seulement, le
  // bouton se presserait sans que rien ne change à l'écran.
  const css = readFileSync(fileURLToPath(new URL("../../../../style.css", import.meta.url)), "utf8");
  assert.ok(css.includes(`.bac-formulaire__logique .${CLASSE_DU_CHOIX}`),
    `la feuille de style ne connaît pas « ${CLASSE_DU_CHOIX} »`);
});

test("le bouton répondu est pressé, l'autre ne l'est pas", () => {
  const champs = [
    { nom: "Zone inondable", cle: "zone-inondable", saisie: "logique", unite: "", choix: [], aide: "", declare: true }
  ];
  const html = renderFormulaire(champs, { "Zone inondable": "oui" });

  // Chaque bouton, de la balise ouvrante jusqu'à son mot.
  const boutons = [...html.matchAll(/<button[\s\S]*?<\/button>/g)].map((un) => un[0]);
  const oui = boutons.find((un) => un.includes('data-bac-valeur="oui"')) ?? "";
  const non = boutons.find((un) => un.includes('data-bac-valeur="non"')) ?? "";

  assert.match(oui, new RegExp(CLASSE_DU_CHOIX));
  assert.match(oui, /aria-pressed="true"/);
  assert.doesNotMatch(non, new RegExp(CLASSE_DU_CHOIX));
  assert.match(non, /aria-pressed="false"/);
});

/**
 * **Cette épreuve relit le source, et c'est l'exception qui le justifie.**
 *
 * Le défaut n'est pas dans ce qui se dessine : le formulaire était juste, les
 * résultats étaient justes. Il est dans **ce qu'on réécrit** — tout le contenu
 * de la fenêtre à chaque frappe. Le champ mourait avec, le curseur partait au
 * premier caractère, et le verdict était retiré de l'écran au lieu d'être
 * rejoué : il fallait refermer la fenêtre et relancer pour voir sa réponse
 * prise en compte. Aucune épreuve de rendu ne peut voir cela, et il est parti
 * en production.
 */
test("le formulaire du bac ne réécrit jamais tout le contenu de la fenêtre", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const source = readFileSync(fileURLToPath(new URL("./ecrire-en-mdall.js", import.meta.url)), "utf8");

  const branchement = source.match(/\nfunction brancherLeBac\([^)]*\) \{\n([\s\S]*?)\n\}\n/);
  assert.ok(branchement, "brancherLeBac est introuvable");

  assert.doesNotMatch(branchement[1], /renderBacDessai\(/,
    "brancherLeBac redessine tout le bac : le champ où le doigt est posé mourrait avec");
  assert.doesNotMatch(branchement[1], /majLaFenetreDeDetails\(/,
    "brancherLeBac remplace le contenu de la fenêtre : le curseur partirait à la frappe");
  assert.doesNotMatch(branchement[1], /etat\.lance = false/,
    "une réponse éteint le verdict : elle ne serait jamais lue");

  // Le redessin ciblé ne repose que le verdict, et il ne peut le faire que si
  // la fenêtre montre bien le bac — le wiki du langage s'ouvre dans la même.
  const resultats = source.match(/\nfunction redessinerLesResultats\([^)]*\) \{\n([\s\S]*?)\n\}\n/);
  assert.ok(resultats, "redessinerLesResultats est introuvable");
  assert.match(resultats[1], /"\.bac-resultats"/);
  assert.match(resultats[1], /corpsDuBac\(\)/);

  // **Ouvrir referme ce qui l'était, et la fermeture rend ce qu'elle retenait**
  // — `surFermeture` remet `lance` à faux. Le drapeau levé avant retombait
  // donc, et la fenêtre montrait un verdict que l'état disait n'avoir jamais
  // lancé : la première réponse tapée le retirait de l'écran.
  const ouverture = source.match(/\nfunction ouvrirLeBac\([^)]*\) \{\n([\s\S]*?)\n\}\n/);
  assert.ok(ouverture, "ouvrirLeBac est introuvable");
  assert.ok(ouverture[1].indexOf("fermerLaFenetreDeDetails()") >= 0
    && ouverture[1].indexOf("fermerLaFenetreDeDetails()") < ouverture[1].indexOf("etat.lance = true"),
  "ouvrirLeBac lève le drapeau avant de refermer : il retombera");
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
  // **Et le bouton de place reste là.** Il ne paraissait qu'avec un message :
  // on ne pouvait donc ranger la console à droite qu'au moment où elle avait
  // quelque chose à dire, c'est-à-dire au pire moment. C'est un réglage de
  // l'écran, pas une réaction à son contenu.
  assert.match(html, /data-brouillon-console-place/);
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

test("la troisième colonne se déclare sur le cadre, et ne dépend que du réglage", () => {
  assert.match(renderEcrireEnMdall(AVEC_UN_DEFAUT, { volet: true }), /data-console="volet"/);
  assert.match(renderEcrireEnMdall(AVEC_UN_DEFAUT, { volet: false }), /data-console="bas"/);
});

test("une console vide se range à droite quand on le demande", () => {
  // **Le défaut que ça répare.** Le volet ne paraissait qu'avec un message, et
  // le cadre ne déclarait sa colonne que dans ce cas : on ne pouvait donc
  // déplacer la console qu'au moment où elle avait quelque chose à dire,
  // c'est-à-dire au pire moment. Or on range son écran d'abord, et l'on écrit
  // ensuite — à l'ouverture, le bouton de place ne faisait rien du tout.
  assert.match(renderEcrireEnMdall(brouillonNeuf(), { volet: true }), /data-console="volet"/);

  const html = renderVoletDeLaConsole([], { volet: true });
  assert.match(html, /brouillon-volet--console/);
  assert.match(html, /Rien à signaler/);
  // Et jamais aux deux places : la liste du bas s'en va avec le volet.
  assert.equal((renderEcrireEnMdall(brouillonNeuf(), { volet: true })
    .match(/brouillon-console__liste/g) ?? []).length, 1);
});

test("hors du volet, le troisième panneau ne rend rien plutôt qu'un cadre vide", () => {
  assert.equal(renderVoletDeLaConsole([], { volet: false }), "");
  assert.equal(renderVoletDeLaConsole(laConsole({ fichiers: fichiersRemplis(AVEC_UN_DEFAUT) }), {}), "");
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

/* ── Une seule lecture, et elle est colorée ──────────────────────────────── */

test("le volet n'a plus qu'une lecture : celle où l'on écrit", () => {
  // « Code » et « Rendu » montraient le même fichier deux fois. On basculait
  // pour voir ce qu'on venait de taper, et l'on tapait en noir et blanc.
  const html = renderVoletDuCode(AVEC_UNE_REGLE);

  assert.doesNotMatch(html, /data-brouillon-lecture/);
  assert.match(html, /<textarea/);
  assert.match(html, /saisie-code--coloree/);
});

test("ce qu'on écrit prend les couleurs de la Mémoire, à la frappe", () => {
  // Une ligne qu'on écrit et la même ligne relue doivent prendre exactement les
  // mêmes couleurs, sinon écrire et relire ne se superposent pas.
  const peint = colorerDuMdall("   si (Zone de vent = 3)");
  const relu = renderLignesDeCode(lignesDuFichier("   si (Zone de vent = 3)"));

  for (const type of ["mot-condition", "sujet", "valeur", "operateur"]) {
    assert.match(peint, new RegExp(`mdall-${type}`), `${type} absent de la saisie`);
    assert.match(relu, new RegExp(`mdall-${type}`), `${type} absent du rendu`);
  }
});

test("une ligne du fichier occupe une ligne à l'écran, jamais deux", () => {
  // **Le défaut que ça répare.** Chaque ligne était un `<span>` en
  // `display:block`, et les spans étaient séparés par un `\n` : dans un `<pre>`,
  // cela fait deux lignes. Le code s'affichait à double interligne, et la
  // gouttière — qui compte les lignes du texte, elle — s'arrêtait au milieu.
  //
  // Les comptes sont écrits en dur : les déduire de `colorerDuMdall` ferait une
  // épreuve qui bouge avec ce qu'elle mesure.
  assert.equal(colorerDuMdall("a\n\nb").split("\n").length, 4);
  assert.equal(colorerDuMdall("a").split("\n").length, 2);
  assert.equal(colorerDuMdall("").split("\n").length, 2);

  // Le compte de la couche colorée est celui de la gouttière, sans quoi les
  // numéros cessent de désigner les lignes qu'ils montrent.
  const quatre = "fonction X(zones) {\n\n   si (A = 1)\n}";
  assert.equal(colorerDuMdall(quatre).split("\n").length - 1, lignesDuFichier(quatre).length);
});

test("une ligne vide ne porte aucun jeton, et n'en invente pas", () => {
  // Un `&nbsp;` de bourrage donnait sa hauteur à la ligne vide du temps où
  // chaque ligne était un bloc. Dans un `<pre>`, c'est le retour qui la fait —
  // et un espace insécable de plus décalerait la couche d'un caractère.
  const peint = colorerDuMdall("a\n\nb");

  assert.doesNotMatch(peint, /&nbsp;/);
  assert.equal(peint.split("\n")[1], "");
});

test("la couche finit par un retour, sans quoi elle remonte d'une ligne", () => {
  assert.ok(colorerDuMdall("a").endsWith("\n"), "la couche ne finit pas par un saut");
});

/* ── « Coder » se réarme à la frappe ─────────────────────────────────────── */

test("les gestes se dessinent seuls, et « Coder » suit ce qu'on tape", () => {
  // **Le défaut que ça répare.** Les boutons n'étaient redessinés qu'à un
  // redessin entier : après « Tout effacer », « Coder » restait éteint quoi
  // qu'on écrive, et le clic ne faisait rien — sans un mot pour le dire.
  assert.match(renderGestes(brouillonNeuf(), {}), /data-brouillon-coder disabled/);
  assert.doesNotMatch(renderGestes(avecLeDit(brouillonNeuf(), "un essai"), {}),
    /data-brouillon-coder disabled/);
});

test("la rangée de gestes ne porte plus que « Coder »", () => {
  // « Tout effacer » est monté dans le menu du titre : le laisser aussi ici
  // ferait deux chemins pour un geste, et deux libellés qui finiraient par ne
  // plus dire la même chose (règle 10).
  const html = renderGestes(avecLeDit(brouillonNeuf(), "un essai"), {});

  assert.match(html, /data-brouillon-coder/);
  assert.doesNotMatch(html, /Tout effacer/);
});

test("la rangée de gestes est un seul bloc, remplaçable d'un coup", () => {
  // C'est ce qui permet de la redessiner sans toucher à la zone d'à côté, où le
  // doigt est posé.
  const html = renderGestes(avecLeDit(brouillonNeuf(), "un essai"), {}).trim();

  assert.ok(html.startsWith('<div class="brouillon__gestes">'), html.slice(0, 40));
  assert.ok(html.endsWith("</div>"));
});

/* ── Le bac d'essai part en plein écran ──────────────────────────────────── */

test("l'écran ne porte plus le bac : « Lancer » l'ouvre en fenêtre", () => {
  // Posé en bas, il passait sous les volets : on faisait défiler pour voir la
  // réponse à la question qu'on venait de poser, en perdant de vue le code.
  const html = renderEcrireEnMdall(AVEC_UNE_REGLE, { lance: true });

  assert.doesNotMatch(html, /class="bac"/);
  assert.match(html, /data-brouillon-lancer/);
});

test("le bac se rend toujours, pour la fenêtre qui le porte", () => {
  const html = renderBacDessai(AVEC_UNE_REGLE, { reponses: { "Zone de vent": "3" }, lance: true });

  assert.match(html, /class="bac"/);
  assert.match(html, /bac-formulaire/);
});

/* ── La console reste sous les yeux ──────────────────────────────────────── */

test("la console emporte ses commandes, et ne laisse pas un moignon en bas", () => {
  // **Le défaut que ça répare.** Il restait en bas sa tête seule, pour qu'on
  // puisse la ramener : une bande de plus, qui répétait le compte que le volet
  // affichait déjà. Le bouton qui la ramène est dans sa tête à elle, là où elle
  // se trouve.
  const aDroite = renderEcrireEnMdall(AVEC_UN_DEFAUT, { volet: true });

  assert.doesNotMatch(aDroite, /class="brouillon-console"/);
  assert.equal((aDroite.match(/data-brouillon-console-place/g) ?? []).length, 1);
  assert.ok(aDroite.indexOf("data-brouillon-console-place") > aDroite.indexOf("brouillon-volet--console"),
    "le bouton de place n'est pas dans le volet");

  // Et en bas, elle est entière : sa tête et sa liste.
  const enBas = renderEcrireEnMdall(AVEC_UN_DEFAUT, { volet: false });
  assert.match(enBas, /class="brouillon-console"/);
  assert.equal((enBas.match(/data-brouillon-console-place/g) ?? []).length, 1);
});

test("la console porte son nom, à ses deux places", () => {
  // Une bande de messages sans titre en bas d'un écran se lit comme un pied de
  // page, et l'on n'y cherche rien.
  assert.match(renderConsole([], {}), /brouillon-console__nom">console</);
  assert.match(renderVoletDeLaConsole([], { volet: true }), /brouillon-console__nom">console</);
});

test("une seule tête pour les deux places, et un seul bouton dedans", () => {
  // Deux têtes écrites séparément auraient divergé à la première ligne
  // ajoutée, et le bouton qui ramène la console aurait fini par ne plus
  // ressembler à celui qui l'envoie (règle 10).
  //
  // **Le bouton montre la disposition, il ne nomme plus la manœuvre.** « À
  // droite » disait le geste ; l'icône dit vers quoi le clic emmène, et c'est
  // celle des panneaux, partagée avec les autres écrans qui en montrent.
  const enBas = renderTeteDeLaConsole([], { volet: false });
  const aDroite = renderTeteDeLaConsole([], { volet: true });

  assert.match(enBas, /#panneau-droite-masque/);
  assert.match(aDroite, /#panneaux-code-seul/);
  assert.match(aDroite, /aria-pressed="true"/);

  // Sans mot, il lui faut un nom : un bouton muet ne se lit pas au clavier.
  assert.match(enBas, /aria-label="[^"]+"/);
  assert.match(aDroite, /aria-label="[^"]+"/);
});

/* ── L'ordre des gestes, et la note qui s'en va ──────────────────────────── */

test("le menu porte les deux gestes qui engagent, et dit lequel attend encore", () => {
  // « Proposer au projet » reste sur la ligne du titre **et** se retrouve dans
  // le menu : c'est le même renvoi, appelé de deux endroits — pas une seconde
  // façon de proposer (règle 10).
  const html = renderActionsDuTitre(avecLeDit(AVEC_UNE_DONNEE, "un essai"), {});

  assert.match(html, /Proposer au projet/);
  assert.ok(html.includes(GESTE.PROPOSER), "le menu ne porte pas le geste de proposition");

  // L'établi n'existe pas encore (lot B). L'entrée est **éteinte et présente** :
  // un menu dont les entrées paraissent et disparaissent se rouvre pour
  // vérifier, et l'on finit par ne plus savoir ce qu'il contient.
  assert.ok(html.includes(GESTE.ETABLI), "le menu ne porte pas l'enregistrement sur l'établi");
  assert.match(html, /Enregistrer dans l&#39;Atelier|Enregistrer dans l'Atelier/);

  // Sur un brouillon vide, il n'y a rien à proposer et l'entrée le dit.
  const vide = renderActionsDuTitre(brouillonNeuf(), {});
  assert.match(vide, /Il n&#39;y a rien à proposer|Il n'y a rien à proposer/);
});

test("le kebab se pose à droite de « Lancer », et porte le menu", () => {
  // C'est ce que l'écran demande : les gestes d'abord, et ce qu'on va chercher
  // exprès au bout de la ligne.
  const html = renderActionsDuTitre(avecLeDit(AVEC_UNE_DONNEE, "un essai"), {});

  assert.ok(html.indexOf("data-brouillon-proposer") < html.indexOf("data-brouillon-lancer"),
    "« Lancer » passe avant « Proposer au projet »");
  assert.ok(html.indexOf("data-brouillon-lancer") < html.indexOf('data-action-id="brouillonKebab"'),
    "le kebab n'est pas à droite de « Lancer »");
  // Le composant mutualisé, pas un second menu écrit ici : un menu de plus
  // aurait son idée de l'ouverture et de la fermeture au clavier.
  assert.match(html, /class="gh-action gh-action--single"/);
  assert.match(html, /class="gh-menu" role="menu"/);
});

test("la rangée de gestes ne porte plus de leçon", () => {
  // Une phrase de trois lignes sous deux boutons se lit une fois, puis jamais —
  // et elle occupait la place que les boutons demandaient.
  const html = renderGestes(avecLeDit(brouillonNeuf(), "un essai"), {});

  assert.doesNotMatch(html, /brouillon__note/);
  assert.doesNotMatch(html, /seul chemin/);
});

test("le volet branche son coloreur, sans quoi l'on écrit en noir sur noir", () => {
  // **Cette épreuve relit le source, et c'est l'exception qui le justifie.** Le
  // défaut ne se voit pas dans le rendu — la couche est bien posée — mais dans
  // ce qui la repeint ensuite. Il ne se voit qu'avec un navigateur, ou ici, et
  // il est parti en production une fois.
  const source = readFileSync(fileURLToPath(new URL("./ecrire-en-mdall.js", import.meta.url)), "utf8");
  const branchement = source.slice(source.indexOf("brancherLaSaisieDeCode(zone"));

  assert.match(branchement.slice(0, 400), /colorer:\s*colorerDuMdall/,
    "le coloreur ne descend pas jusqu'au branchement : la couche ne se repeindra pas");
});

/* ── La hauteur du cadre : mesurée, ou pas posée ──────────────────────────── */

test("la hauteur se déduit de la position réelle du cadre", () => {
  // L'écran tient dans la fenêtre et ce sont ses zones qui défilent : une
  // hauteur calculée à l'avance se trompe dès que la chrome se replie.
  assert.equal(hauteurDuCadre({ haut: 200, fenetre: 900 }), 900 - 200 - MARGE_DU_BAS);
});

test("une mesure prise sur un panneau caché ne pose rien du tout", () => {
  // **Le défaut que ça répare, et c'en est deux.** L'Atelier dessine tous ses
  // panneaux au montage, y compris ceux qu'on ne regarde pas : le nôtre est
  // alors caché, et sa position vaut 0. On en tirait la hauteur de la fenêtre
  // entière, et le cadre, ouvert deux cents pixels plus bas, dépassait
  // d'autant : **la page entière défilait**, et **la zone de code ne défilait
  // plus du tout**, parce qu'elle était plus grande que son contenu.
  //
  // Ne pas savoir n'autorise pas à prétendre qu'on sait (règle 5) : on ne pose
  // rien, et le repli du CSS tient jusqu'à la venue.
  assert.equal(hauteurDuCadre({ haut: 0, fenetre: 900 }), null);
  assert.equal(hauteurDuCadre({ haut: -40, fenetre: 900 }), null);
  assert.equal(hauteurDuCadre({ haut: 200, fenetre: 0 }), null);
  assert.equal(hauteurDuCadre({}), null);
  assert.equal(hauteurDuCadre(), null);
});

test("le cadre ne descend jamais sous sa hauteur minimale", () => {
  // Sous ce plancher, les trois zones n'ont plus la place de montrer une ligne :
  // mieux vaut un cadre qui dépasse et défile qu'un cadre illisible.
  assert.equal(hauteurDuCadre({ haut: 700, fenetre: 800 }), HAUTEUR_MINIMALE);
});

/**
 * **Cette épreuve relit le source, et c'est l'exception qui le justifie.**
 *
 * Le défaut ne se voit pas dans le rendu : il est dans le fait qu'un écran déjà
 * monté ne remesurait jamais. On revenait sur l'onglet, le cadre gardait la
 * hauteur qu'il avait pris caché, et la page défilait pour toujours.
 */
test("un écran déjà monté remesure sa hauteur à la venue", () => {
  const source = readFileSync(fileURLToPath(new URL("./ecrire-en-mdall.js", import.meta.url)), "utf8");
  const depart = source.indexOf("export function renderEcrireEnMdallEcran");
  const garde = source.slice(depart, source.indexOf("racine.dataset.brouillonMonte = \"true\";", depart));

  assert.ok(garde.includes("mesurerLaHauteur(racine)"),
    "la sortie anticipée ne remesure pas : le cadre gardera la hauteur prise caché");
});

/* ── Ce qui est peint est ce qui est écrit ───────────────────────────────── */

/** Le texte que la couche colorée montre vraiment, balises ôtées. */
function texteDeLaCouche(html) {
  return String(html)
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

test("la couche colorée montre exactement les caractères de la zone", () => {
  // **Le défaut que ça répare, et il passait pour un défaut de clavier.** La
  // couche se pose sous un texte transparent : si elle ne peint pas les mêmes
  // caractères, le curseur va où le texte est et l'œil vise où la peinture est.
  // « On ne peut pas se déplacer avec les flèches », « des doubles guillemets
  // s'affichent », « impossible d'écrire entre les guillemets » : c'était cela.
  const tape = [
    "fonction Prix TTC(zones, Prix HT) {",
    '   si (Prix HT > 0 €)',
    '   alors ("Prix HT * 1,2");',
    "   importe (variable: Prix HT);",
    "   // un reste à écrire : \"",
    "}   "
  ].join("\n");

  assert.equal(texteDeLaCouche(colorerDuMdall(tape)), `${tape}\n`);
});

test("la couche suit la frappe, caractère par caractère", () => {
  // La saisie rejouée du premier au dernier caractère : c'est à mi-mot que la
  // recomposition inventait des guillemets.
  const ligne = '   si (Zone de vent = "3")';

  for (let jusqua = 0; jusqua <= ligne.length; jusqua += 1) {
    const tape = ligne.slice(0, jusqua);
    assert.equal(texteDeLaCouche(colorerDuMdall(tape)), `${tape}\n`,
      `désaligné après ${jusqua} caractères`);
  }
  assert.equal(ligne.length, 26);
});

/* ── L'établi : ce qu'on garde, et ce qu'on rouvre ───────────────────────── */

const POUR_LETABLI = avecLeFichier(brouillonNeuf(), "essai.ref", [
  "fonction Couleur du volet(zones, Matière du volet) {",
  '   si (Matière du volet = "bois")',
  '   alors ("violet");',
  "}"
].join("\n"));

test("le titre dit sur quel utilitaire on travaille, et dans quelle version", () => {
  // **Un brouillon anonyme et une v3 reprise ne se ressemblent pas.** Sans
  // cette ligne, on revient le lendemain et rien ne dit qu'on est en train de
  // réécrire un outil déjà posé : on en fabrique un second du même nom.
  assert.equal(renderTitreDuBrouillon(null), "Écrire en Mdall");
  assert.equal(renderTitreDuBrouillon({ nom: "" }), "Écrire en Mdall");

  const titre = renderTitreDuBrouillon({ id: "a", nom: "Volets en bois", version: 3 });
  assert.match(titre, /Volets en bois/);
  assert.match(titre, /v3/);
});

test("le titre d'un utilitaire est échappé comme le reste", () => {
  assert.doesNotMatch(renderTitreDuBrouillon({ id: "a", nom: "<script>alert(1)</script>", version: 1 }), /<script>/);
});

test("la fiche montre ce que le code dit, et que personne n'a tapé", () => {
  // Ce qu'il prend et ce qu'il rend se **déduisent** : les faire saisir les
  // ferait diverger du texte au premier ajout d'une condition (règle 4).
  const fiche = ficheDuBrouillon(POUR_LETABLI, { nom: "Volets en bois", resume: "Le violet obligatoire." });
  const html = renderFicheDeLetabli(fiche, { quoi: ceQueLenregistrementFait(null, fiche.fichiers) });

  assert.match(html, /data-etabli-nom/);
  assert.match(html, /data-etabli-resume/);
  assert.match(html, /data-etabli-rayon/);
  assert.match(html, /Il prend[\s\S]*Matière du volet/);
  assert.match(html, /Il rend[\s\S]*Couleur du volet/);
  assert.match(html, /v1/);
  assert.doesNotMatch(html, /disabled/, "rien ne manque : le bouton s'arme");
});

test("le bouton d'enregistrement reste éteint tant qu'il manque quelque chose", () => {
  // Un bouton éteint sans un mot laisse chercher ce qui cloche.
  const sansNom = ficheDuBrouillon(POUR_LETABLI, { nom: "", resume: "" });
  const html = renderVerdictDeLetabli(sansNom, { quoi: null });

  assert.match(html, /disabled/);
  assert.match(html, /nom/);
  assert.match(html, /six mois/, "la description dit pourquoi elle est demandée");
  assert.ok(html.includes(GESTE_DE_LETABLI.GARDER));
});

test("ce qui n'a rien à montrer le dit, plutôt que de laisser un vide", () => {
  // Une ligne vide se lit comme un écran cassé (règle 5).
  const html = renderDeduitDeLetabli(ficheDuBrouillon(brouillonNeuf(), {}));
  assert.equal((html.match(/etabli-deduit__rien/g) ?? []).length, 3);
});

test("un établi qu'on n'a pas su lire ne se lit pas comme un établi vide", () => {
  // La première phrase dit qu'on ne sait pas, la seconde qu'il n'y a rien.
  // Confondre les deux ferait réécrire un outil qu'on possède déjà.
  assert.match(renderListeDeLetabli(null), /n&#39;a pas pu être lu|n'a pas pu être lu/);
  assert.match(renderListeDeLetabli([]), /vide/);
  assert.doesNotMatch(renderListeDeLetabli([]), /pas pu être lu/);
});

test("chaque outil de l'établi dit son nom, sa version, ce qu'il prend et ce qu'il rend", () => {
  const html = renderListeDeLetabli([{
    id: "abc", nom: "Volets en bois", resume: "Le violet obligatoire.", version: "2",
    entrees: ["Matière du volet"], sorties: ["Couleur du volet"]
  }]);

  assert.match(html, /Volets en bois/);
  assert.match(html, /v2/);
  assert.match(html, /prend Matière du volet/);
  assert.match(html, /rend Couleur du volet/);
  assert.match(html, /data-etabli-id="abc"/);
  assert.ok(html.includes(GESTE_DE_LETABLI.REPRENDRE));
});

test("un outil qui ne prend rien et ne rend rien le dit", () => {
  const html = renderListeDeLetabli([{
    id: "abc", nom: "Vide", resume: "", version: "1", entrees: [], sorties: []
  }]);

  assert.match(html, /ne prend rien/);
  assert.match(html, /ne rend rien/);
});

test("ce qui vient de l'établi est échappé, nom comme description", () => {
  const html = renderListeDeLetabli([{
    id: '"><script>alert(1)</script>', nom: '<img src=x onerror=1>', resume: "<b>gras</b>",
    version: "1", entrees: [], sorties: []
  }]);

  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<img /);
  assert.match(html, /&lt;script&gt;/);
});

test("le menu propose de garder et de reprendre, et dit quand il n'y a rien à garder", () => {
  const avecDuMdall = renderActionsDuTitre(POUR_LETABLI, {});
  assert.ok(avecDuMdall.includes(GESTE.ETABLI));
  assert.ok(avecDuMdall.includes(GESTE.REPRENDRE));
  assert.doesNotMatch(avecDuMdall, /il n&#39;y a rien à garder/);

  const vide = renderActionsDuTitre(brouillonNeuf(), {});
  assert.match(vide, /il n&#39;y a rien à garder/);

  // Sur un utilitaire déjà posé, le geste dit qu'on le reprend.
  const repris = renderActionsDuTitre(POUR_LETABLI, { utilitaire: { id: "a", nom: "X", version: 2 } });
  assert.match(repris, /Enregistrer sur l&#39;établi|Enregistrer sur l'établi/);
});

/**
 * **Cette épreuve relit le source, et c'est l'exception qui le justifie.**
 *
 * Le défaut n'est pas dans ce qui se dessine : c'est le même que celui du bac
 * d'essai — réécrire toute la fenêtre à chaque frappe emporte le curseur du
 * champ où le doigt est posé. Aucune épreuve de rendu ne peut le voir, et il
 * est déjà parti en production une fois.
 */
test("la fiche de l'établi ne réécrit jamais toute la fenêtre à la frappe", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const source = readFileSync(fileURLToPath(new URL("./ecrire-en-mdall.js", import.meta.url)), "utf8");

  const branchement = source.match(/\nfunction brancherLaFiche\([^)]*\) \{\n([\s\S]*?)\n\}\n/);
  assert.ok(branchement, "brancherLaFiche est introuvable");

  assert.doesNotMatch(branchement[1], /renderFicheDeLetabli\(/,
    "la fiche se redessine entière : le curseur partirait à chaque frappe");
  assert.doesNotMatch(branchement[1], /majLaFenetreDeDetails\(/,
    "la fiche remplace le contenu de la fenêtre : le curseur partirait");

  const verdict = source.match(/\nfunction redessinerLeVerdictDeLaFiche\([^)]*\) \{\n([\s\S]*?)\n\}\n/);
  assert.ok(verdict, "redessinerLeVerdictDeLaFiche est introuvable");
  assert.match(verdict[1], /"\.etabli-fiche__verdict"/);
  assert.match(verdict[1], /corpsDeLaFiche\(\)/);
});

/**
 * **Celle-ci aussi relit le source.** L'établi parle à la base ; l'écran doit
 * rester éprouvable hors navigateur. `auth.js` va chercher Supabase sur un
 * CDN : importé en tête, il rendrait ce fichier impossible à charger ici, et
 * les soixante-quinze épreuves au-dessus tomberaient d'un coup.
 */
test("l'établi se charge à l'usage, jamais en tête de fichier", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const source = readFileSync(fileURLToPath(new URL("./ecrire-en-mdall.js", import.meta.url)), "utf8");

  const tete = source.slice(0, source.indexOf("const texte ="));
  assert.doesNotMatch(tete, /^import .*etabli-supabase/m,
    "l'établi est importé en tête : l'écran n'est plus éprouvable hors navigateur");
  assert.match(source, /await import\("\.\.\/\.\.\/\.\.\/services\/etabli-supabase\.js"\)/);
});
