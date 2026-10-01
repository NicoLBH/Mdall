import assert from "node:assert/strict";
import test from "node:test";

import {
  DOSSIER_DES_MAILS, DOSSIER_DES_PIECES, EXTENSION_DUN_MAIL, LE_CADENAS,
  LAVERTISSEMENT_DUN_FICHIER, LE_CADENAS_DUN_FICHIER, NATURE_DUNE_PIECE,
  NATURE_DUN_MAIL, estLeDossierDesMails,
  laMarqueDuDossier, laMarqueDunFichier, leNomDeLaPieceDeposee, leNomDuMailDepose,
  phraseDuDossierDesMails
} from "./le-dossier-des-mails.js";

const message = (quand, objetNu, decalage = 60) => ({ quand, objetNu, decalage });

// ── Le dossier ─────────────────────────────────────────────────────────────

test("le dossier des mails se reconnaît sans égard à la casse", () => {
  assert.equal(estLeDossierDesMails(DOSSIER_DES_MAILS), true);
  assert.equal(estLeDossierDesMails("mails"), true);
  assert.equal(estLeDossierDesMails(" MAILS "), true);
  assert.equal(estLeDossierDesMails("Documents"), false);
  assert.equal(estLeDossierDesMails(""), false);
});

// ── Le cadenas ─────────────────────────────────────────────────────────────

test("un dossier privé porte le cadenas", () => {
  assert.deepEqual(laMarqueDuDossier({ name: "Mails", prive: true }), LE_CADENAS);
});

test("un dossier ordinaire ne porte rien", () => {
  assert.equal(laMarqueDuDossier({ name: "Documents", prive: false }), null);
  assert.equal(laMarqueDuDossier({ name: "Documents" }), null);
  assert.equal(laMarqueDuDossier(null), null);
});

test("le nom ne suffit pas à rendre un dossier privé", () => {
  // Un dossier peut s'appeler « Mails » sans l'être — et un autre pourra être
  // privé sans s'appeler ainsi. C'est la colonne de la base qui fait foi,
  // puisque c'est elle qui tient la garde.
  assert.equal(laMarqueDuDossier({ name: "Mails", prive: false }), null);
  assert.deepEqual(laMarqueDuDossier({ name: "Correspondance", prive: true }), LE_CADENAS);
});

test("la marque rendue ne partage pas son objet avec le module", () => {
  // Un écran qui écrirait dedans changerait le cadenas de tous les autres.
  const avant = LE_CADENAS.titre;
  const marque = laMarqueDuDossier({ prive: true });
  marque.titre = "n'importe quoi";
  assert.equal(LE_CADENAS.titre, avant);
});

/**
 * **Le cadenas d'un dossier ne promet plus que le dossier est caché.**
 *
 * Il disait « vous seul y avez accès ». C'était vrai du dossier, et cette
 * règle-là n'avait jamais été demandée : elle empêchait le second déposant d'un
 * projet de déposer. Le dossier est visible par l'équipe ; ce qu'il contient ne
 * l'est pas. Une promesse plus large que la garde est une promesse qu'on
 * tiendra mal.
 */
test("le cadenas d'un dossier parle de son contenu, pas de lui-même", () => {
  assert.match(LE_CADENAS.titre, /chacun n'y voit que ce qu'il y a déposé/);
  assert.doesNotMatch(LE_CADENAS.titre, /vous seul y avez accès/);
  assert.doesNotMatch(LE_CADENAS.mot, /^Privé$/);
});

/**
 * **Un document, lui, n'est vu que de son déposant**, et son cadenas le dit
 * toujours. Les deux marques ne disent donc pas la même chose, et c'est
 * délibéré : l'une porte sur un contenant, l'autre sur une pièce.
 */
test("le cadenas d'un fichier promet plus que celui de son dossier", () => {
  assert.match(LE_CADENAS_DUN_FICHIER.titre, /vous seul y avez accès/);
  assert.notEqual(LE_CADENAS_DUN_FICHIER.titre, LE_CADENAS.titre);
});

// ── Le nom d'un mail rangé ─────────────────────────────────────────────────

test("un mail se range sous sa date et son objet", () => {
  assert.equal(
    leNomDuMailDepose(message("2026-03-12T08:14:00.000Z", "Étanchéité toiture")),
    "2026-03-12 09h14 — Étanchéité toiture.eml"
  );
});

test("l'heure du nom est celle du fuseau d'envoi", () => {
  // Minuit et demi à Paris est la veille à Greenwich : le dossier se
  // rangerait un jour trop tôt.
  assert.equal(
    leNomDuMailDepose(message("2026-03-11T23:30:00.000Z", "Lot 3")).slice(0, 16),
    "2026-03-12 00h30"
  );
});

test("un mail sans date ne se voit pas attribuer celle du jour", () => {
  const nom = leNomDuMailDepose({ quand: "", objetNu: "Lot 3" });
  assert.equal(nom, "sans date — Lot 3.eml");
  assert.equal(/\d{4}-\d{2}-\d{2}/.test(nom), false);
});

test("un mail sans objet le dit", () => {
  assert.equal(leNomDuMailDepose(message("2026-03-12T08:14:00.000Z", "")), "2026-03-12 09h14 — sans objet.eml");
});

test("l'objet nu sert, pas l'objet avec ses Re: empilés", () => {
  // Quinze fichiers nommés « Re: Re: Étanchéité toiture » ne se distinguent
  // que par leur date, et le Re: n'apporte rien au nom.
  const nom = leNomDuMailDepose({
    quand: "2026-03-12T08:14:00.000Z", decalage: 60,
    objet: "Re: TR: Étanchéité toiture", objetNu: "Étanchéité toiture"
  });
  assert.equal(nom, "2026-03-12 09h14 — Étanchéité toiture.eml");
});

test("un objet qui ferait un chemin ne fait pas un chemin", () => {
  const nom = leNomDuMailDepose(message("2026-03-12T08:14:00.000Z", "Lot 3 / toiture : reprise"));
  assert.equal(nom.includes("/"), false);
  assert.equal(nom, "2026-03-12 09h14 — Lot 3 toiture reprise.eml");
});

test("un objet interminable se coupe", () => {
  const nom = leNomDuMailDepose(message("2026-03-12T08:14:00.000Z", "toiture ".repeat(40)));
  assert.ok(nom.length < 100, nom);
  assert.ok(nom.endsWith(EXTENSION_DUN_MAIL));
});

test("deux mails de la même minute et du même objet ne s'écrasent pas", () => {
  const premier = leNomDuMailDepose(message("2026-03-12T08:14:00.000Z", "Lot 3"));
  const second = leNomDuMailDepose(message("2026-03-12T08:14:00.000Z", "Lot 3"), { dejaLa: [premier] });
  const troisieme = leNomDuMailDepose(message("2026-03-12T08:14:00.000Z", "Lot 3"), { dejaLa: [premier, second] });
  assert.equal(second, "2026-03-12 09h14 — Lot 3 (2).eml");
  assert.equal(troisieme, "2026-03-12 09h14 — Lot 3 (3).eml");
});

test("l'homonyme se reconnaît sans égard à la casse", () => {
  const nom = leNomDuMailDepose(message("2026-03-12T08:14:00.000Z", "Lot 3"), {
    dejaLa: ["2026-03-12 09H14 — LOT 3.EML"]
  });
  assert.equal(nom, "2026-03-12 09h14 — Lot 3 (2).eml");
});

test("un mail se range en .eml par défaut, et se distingue d'un compte rendu", () => {
  assert.ok(leNomDuMailDepose(message("", "Lot 3")).endsWith(".eml"));
  assert.equal(EXTENSION_DUN_MAIL, ".eml");
  assert.notEqual(NATURE_DUN_MAIL, "source_texte");
});

/**
 * **L'extension suit les octets qu'on garde.** Un `.msg` déposé est un conteneur
 * Outlook : le nommer `.eml` ferait échouer son ouverture et mentirait sur ce
 * qu'il contient.
 */
test("un .msg gardé tel quel se range en .msg", () => {
  const nom = leNomDuMailDepose(message("2026-03-12T08:14:00Z", "Lot 3"), { extension: ".msg" });
  assert.ok(nom.endsWith(".msg"), nom);
  assert.doesNotMatch(nom, /\.eml/);
});

test("l'homonyme se distingue aussi quand l'extension n'est pas .eml", () => {
  const dejaLa = ["2026-03-12 09h14 — Lot 3.msg"];
  assert.equal(
    leNomDuMailDepose(message("2026-03-12T08:14:00Z", "Lot 3"), { dejaLa, extension: ".msg" }),
    "2026-03-12 09h14 — Lot 3 (2).msg"
  );
});

// ── Les pièces jointes ─────────────────────────────────────────────────────

/**
 * **Son nom d'origine, et rien d'autre.** Le renommer d'après le message qui le
 * portait rendrait le plan introuvable pour celui qui le cherche, et la même
 * pièce arrivée par deux fils porterait deux noms.
 */
test("une pièce jointe garde son nom", () => {
  assert.equal(leNomDeLaPieceDeposee("PLAN-FONDATIONS-A3.pdf"), "PLAN-FONDATIONS-A3.pdf");
});

test("une pièce sans nom en reçoit un, et il se lit", () => {
  assert.equal(leNomDeLaPieceDeposee(""), "pièce jointe");
  assert.equal(leNomDeLaPieceDeposee(null), "pièce jointe");
});

test("un nom de pièce qui ferait un chemin ne fait pas un chemin", () => {
  const nom = leNomDeLaPieceDeposee("dossiers/2024\\Plan:final?.pdf");
  assert.doesNotMatch(nom, /[/\\:?]/);
  assert.ok(nom.endsWith(".pdf"), nom);
});

/**
 * **Le rang se glisse avant l'extension.** « Plan (2).pdf » s'ouvre,
 * « Plan.pdf (2) » non — et deux « Plan.pdf » venus de deux bureaux d'études
 * sont le cas le plus courant de tous.
 */
test("deux pièces homonymes ne s'écrasent pas, et restent ouvrables", () => {
  const dejaLa = ["Plan.pdf"];
  assert.equal(leNomDeLaPieceDeposee("Plan.pdf", { dejaLa }), "Plan (2).pdf");

  dejaLa.push("Plan (2).pdf");
  assert.equal(leNomDeLaPieceDeposee("Plan.pdf", { dejaLa }), "Plan (3).pdf");
});

test("l'homonyme d'une pièce se reconnaît sans égard à la casse", () => {
  assert.equal(leNomDeLaPieceDeposee("Plan.PDF", { dejaLa: ["plan.pdf"] }), "Plan (2).PDF");
});

test("une pièce sans extension prend son rang à la fin", () => {
  assert.equal(leNomDeLaPieceDeposee("Notes", { dejaLa: ["Notes"] }), "Notes (2)");
});

test("une pièce n'est pas un mail, et sa nature le dit", () => {
  assert.notEqual(NATURE_DUNE_PIECE, NATURE_DUN_MAIL);
  assert.equal(DOSSIER_DES_PIECES, "Pièces jointes");
});

// ── Le cadenas d'un fichier ────────────────────────────────────────────────

/**
 * **Les trois mêmes faits que la politique de lecture.** Elle cache un document
 * quand son dossier est privé *et* que son déposant n'est pas vide *et* que ce
 * n'est pas moi. Un cadenas dessiné sur la seule appartenance au dossier
 * promettrait « vous seul y avez accès » sur un fichier que toute l'équipe voit.
 */
test("un fichier déposé dans un dossier privé porte le cadenas", () => {
  const marque = laMarqueDunFichier({ deposant: "moi" }, { prive: true });
  assert.deepEqual(marque, { ...LE_CADENAS_DUN_FICHIER });
});

test("un fichier d'un dossier ordinaire ne porte rien", () => {
  assert.equal(laMarqueDunFichier({ deposant: "moi" }, { prive: false }), null);
  assert.equal(laMarqueDunFichier({ deposant: "moi" }, null), null);
});

/**
 * **Le cas qui a motivé tout ceci.** Un document sans déposant n'est pas caché
 * par la base, même dans un dossier privé : lui mettre un cadenas ferait déposer
 * sans regarder. Et se taire ne suffit pas — un fichier sans marque au milieu de
 * fichiers marqués se lit comme une ligne qu'on n'a pas regardée.
 */
test("un fichier sans déposant est signalé visible, pas laissé muet", () => {
  for (const sans of [null, ""]) {
    const marque = laMarqueDunFichier({ deposant: sans }, { prive: true });
    assert.deepEqual(marque, { ...LAVERTISSEMENT_DUN_FICHIER }, String(sans));
    assert.notEqual(marque.icone, LE_CADENAS_DUN_FICHIER.icone);
    assert.match(marque.mot, /équipe/);
  }
});

/** L'avertissement dit **qui** voit, et il dit que le reste du dossier non. */
test("l'avertissement nomme l'équipe et le contraste avec le dossier", () => {
  assert.match(LAVERTISSEMENT_DUN_FICHIER.titre, /équipe du chantier le voit/);
  assert.match(LAVERTISSEMENT_DUN_FICHIER.titre, /contrairement au reste/);
});

/**
 * **Ne pas savoir n'est pas savoir que non** (règle 5). Une lecture qui n'a pas
 * demandé la colonne rend `undefined` : on ne dessine rien, plutôt que de dire
 * « visible par l'équipe » d'un fichier dont on n'a rien demandé.
 */
test("un fichier dont on n'a pas demandé le déposant ne dit rien", () => {
  assert.equal(laMarqueDunFichier({}, { prive: true }), null);
  assert.equal(laMarqueDunFichier({ deposant: undefined }, { prive: true }), null);
});

/**
 * **Les deux vides ne disent pas la même chose, et c'est tout l'objet de cette
 * garde.** `undefined` est une question qu'on n'a pas posée ; `null` est une
 * réponse. Les confondre ferait afficher « visible par l'équipe » sur des
 * fichiers dont on n'a rien demandé, et ferait crier au loup à chaque écran qui
 * ne descend pas la colonne.
 */
test("ne pas avoir demandé et ne pas avoir de déposant ne se disent pas pareil", () => {
  assert.equal(laMarqueDunFichier({ deposant: undefined }, { prive: true }), null);
  assert.notEqual(laMarqueDunFichier({ deposant: null }, { prive: true }), null);
});

test("la marque d'un fichier ne partage pas son objet avec le module", () => {
  const marque = laMarqueDunFichier({ deposant: "moi" }, { prive: true });
  marque.mot = "Public";
  assert.equal(LE_CADENAS_DUN_FICHIER.mot, "Privé");
});

/**
 * **Le cadenas dit l'inverse de l'habitude.** Partout ailleurs il veut dire
 * « vous ne pouvez pas » ; ici il veut dire « eux ne peuvent pas ». Le titre
 * doit donc nommer l'équipe — « privé » tout seul laisse deviner de qui.
 */
test("le titre du cadenas d'un fichier nomme l'équipe", () => {
  assert.match(LE_CADENAS_DUN_FICHIER.titre, /vous seul/);
  assert.match(LE_CADENAS_DUN_FICHIER.titre, /équipe/);
});

test("les deux cadenas portent la même icône", () => {
  assert.equal(LE_CADENAS_DUN_FICHIER.icone, LE_CADENAS.icone);
});

// ── Ce qu'on en dit ────────────────────────────────────────────────────────

test("la phrase du dossier nomme le dossier et dit qui voit quoi", () => {
  const phrase = phraseDuDossierDesMails();
  assert.ok(phrase.includes(DOSSIER_DES_MAILS));
  // Les deux moitiés, et il faut les deux : le dossier se voit, son contenu non.
  assert.match(phrase, /visible par l'équipe/);
  assert.match(phrase, /déposés lui-même/);
  assert.doesNotMatch(phrase, /n'est pas partagé/);
});

/**
 * **Entré en mémoire, il n'est plus privé — et la marque suit la politique.**
 *
 * Le cadenas se décide sur les mêmes faits que la règle de lecture : c'est tout
 * le contrat de cette fonction. Depuis `202611110001_...`, un document qui porte
 * une proposition signée se lit par toute l'équipe — son contenu est la
 * connaissance du projet, et le cacher empêcherait de vérifier ce qu'on vient
 * d'accepter.
 *
 * Oublier ce fait-là aurait dessiné « Privé » sur un document que l'équipe lit :
 * un marqueur sans équivoque qui se trompe est pire que pas de marqueur, il fait
 * déposer sans regarder.
 */
test("un fichier entré en mémoire ne porte plus de cadenas", () => {
  const prive = { prive: true };

  // Tant qu'il n'est pas entré : le cadenas.
  assert.notEqual(
    laMarqueDunFichier({ deposant: "u-1", propositionId: null }, prive), null);

  // Entré : plus rien, parce que l'équipe le lit vraiment.
  assert.equal(
    laMarqueDunFichier({ deposant: "u-1", propositionId: "prop-1" }, prive), null);
});

/**
 * **Ne pas savoir n'est pas savoir que oui.** Toutes les lectures de la table
 * ne demandent pas `proposition_id` ; le rabattre sur « partagé » promettrait
 * l'inverse de la vérité sur une question qu'on n'a pas posée (règle 5).
 */
test("une colonne non lue ne fait pas disparaître le cadenas", () => {
  const prive = { prive: true };
  assert.notEqual(laMarqueDunFichier({ deposant: "u-1" }, prive), null);
  assert.notEqual(
    laMarqueDunFichier({ deposant: "u-1", propositionId: undefined }, prive), null);
});
