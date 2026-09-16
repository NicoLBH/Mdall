/**
 * La note jointe : sa ligne, son aperçu, et les octets qu'ils retiennent.
 *
 * ## Ce que ces gardes attrapent
 *
 * Une **adresse d'objet fabriquée et jamais rendue** garde les octets de la
 * note en mémoire jusqu'à ce qu'on quitte la page. Six mégaoctets par
 * ouverture, et rien à l'écran ne le dit : c'est la classe de défaut qu'on ne
 * découvre qu'au bout d'une heure de travail, quand l'onglet rame.
 *
 * Et une **ligne qui promet un aperçu qu'elle n'a pas** : sans octets, le
 * bouton ouvrirait un cadre vide, et l'on croirait le PDF vide.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { renderApercuDeLaNoteHtml, renderLigneDeLaNoteHtml } from "./note-jointe.js";
import { adresseDeLaPiece, oublierLAdresse } from "../../../services/piece-jointe.js";

const PDF = Buffer.from("%PDF-1.4 une note").toString("base64");

/* ── La ligne ────────────────────────────────────────────────────────────── */

/**
 * **La ligne ouvre la note.** Elle ne disait que son nom, et deux versions
 * d'une note de calcul portent le même nom à un suffixe près : il fallait
 * sortir de l'écran pour s'assurer qu'on avait joint la bonne.
 */
test("la ligne d'une note est un bouton qui l'ouvre", () => {
  const html = renderLigneDeLaNoteHtml({ piece: { nom: "note.pdf", taille: 120000 } });

  assert.match(html, /data-copilote-apercu/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /note\.pdf/);
  assert.match(html, /117 ko/, "le poids reste lisible");
  assert.match(html, /id="copiloteRetirerPiece"/, "et la croix reste à part");
});

/** Ouvert, elle le dit — sinon on reclique pour ouvrir ce qui est déjà ouvert. */
test("la ligne dit si l'aperçu est déplié", () => {
  const html = renderLigneDeLaNoteHtml({ piece: { nom: "note.pdf" }, ouvert: true });

  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /Refermer l&#39;aperçu|Refermer l'aperçu/);
});

/**
 * **Sans octets, pas de bouton.** Une note dont on n'a plus le contenu — relue
 * d'une conversation enregistrée — ne s'ouvre pas : un bouton qui rendrait un
 * cadre vide ferait croire que le PDF l'est.
 */
test("une note qu'on ne peut pas montrer ne promet pas de l'être", () => {
  const html = renderLigneDeLaNoteHtml({ piece: { nom: "note.pdf" }, montrable: false });

  assert.ok(!html.includes("data-copilote-apercu"), "aucun bouton d'aperçu");
  assert.match(html, /note\.pdf/, "mais la note se nomme encore");
});

test("sans note, il n'y a pas de ligne", () => {
  assert.equal(renderLigneDeLaNoteHtml(), "");
  assert.equal(renderLigneDeLaNoteHtml({ piece: { taille: 12 } }), "", "un nom, au minimum");
});

/* ── L'aperçu ────────────────────────────────────────────────────────────── */

test("l'aperçu porte le lecteur du navigateur, et de quoi le refermer", () => {
  const html = renderApercuDeLaNoteHtml({ nom: "note.pdf", adresse: "blob:abc" });

  assert.match(html, /<iframe[^>]*src="blob:abc"/, "le cadre montre la note");
  assert.match(html, /data-copilote-apercu-fermer/, "et se referme");
  assert.match(html, /aria-label="Aperçu de note\.pdf"/);
});

/** Sans adresse, rien : un cadre vide se lirait comme un PDF vide. */
test("sans adresse, aucun aperçu", () => {
  assert.equal(renderApercuDeLaNoteHtml({ nom: "note.pdf" }), "");
  assert.equal(renderApercuDeLaNoteHtml(), "");
});

/* ── Les octets ──────────────────────────────────────────────────────────── */

test("une note en mémoire devient une adresse que le navigateur sait lire", () => {
  const adresse = adresseDeLaPiece({ donnees: PDF, mediaType: "application/pdf" });

  assert.match(adresse, /^blob:/);
  oublierLAdresse(adresse);
});

/**
 * **Un base64 illisible ne fait pas tomber l'écran.** On ne montre rien, et la
 * note reste jointe : c'est l'aperçu qui manque, pas la pièce.
 */
test("ce qu'on ne sait pas décoder ne rend pas d'adresse", () => {
  assert.equal(adresseDeLaPiece(null), "");
  assert.equal(adresseDeLaPiece({ donnees: "" }), "");
  assert.equal(adresseDeLaPiece({ donnees: "€ ce n'est pas du base64 €" }), "");
});

/**
 * **Rendre une adresse deux fois ne lève pas.** La note s'en va, le projet
 * change, l'écran se redessine : trois chemins mènent à la même fermeture, et
 * le premier arrivé l'a déjà rendue.
 */
test("rendre une adresse est sans risque, même deux fois", () => {
  const adresse = adresseDeLaPiece({ donnees: PDF });

  assert.doesNotThrow(() => oublierLAdresse(adresse));
  assert.doesNotThrow(() => oublierLAdresse(adresse));
  assert.doesNotThrow(() => oublierLAdresse(""));
});

/* ── L'écran s'en sert, et rend ce qu'il a pris ──────────────────────────── */

/**
 * **L'adresse se fabrique une fois, à l'ouverture, et se rend à la fermeture.**
 *
 * En fabriquer une à chaque rendu retiendrait les octets de la note à chaque
 * frappe — six mégaoctets par caractère tapé, jusqu'à quitter la page. Rien à
 * l'écran ne le dirait : c'est le défaut qu'on découvre au bout d'une heure,
 * quand l'onglet rame. Aucune exécution ne le montre ici — l'écran parle à la
 * base et ne s'importe pas.
 */
test("le Copilote rend les octets de l'aperçu qu'il referme", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("./copilote.js", import.meta.url), "utf8");

  assert.match(source, /adresseDeLaPiece\(piece\)/, "l'adresse se fabrique à l'ouverture");
  assert.match(
    source, /basculerLApercu[\s\S]{0,400}oublierLAdresse\(etat\.apercu\.adresse\)/,
    "et se rend quand on referme"
  );

  // **Trois chemins mènent à la même fermeture**, et les trois doivent rendre :
  // retirer la note, en joindre une autre, changer de projet.
  assert.match(source, /etat\.pieceJointe = null;[\s\S]{0,200}oublierLApercu\(etat\)/, "retirer");
  assert.match(source, /oublierLApercu\(etat\);\s*\n\s*etat\.pieceJointe = await lireLeFichier/, "rejoindre");
  assert.match(source, /oublierLApercu\(store\.ui\.assistant\)/, "changer de projet");

  // L'aperçu est posé entre le fil et la saisie : dans la saisie il mangerait
  // la place du texte, au-dessus du fil il pousserait la conversation dehors.
  assert.match(source, /renderCorps\(etat\)[\s\S]{0,400}renderApercu\(etat\)[\s\S]{0,200}copilote-composer/);
});
