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

import {
  apercuDeLaNote, CRANS_DE_ZOOM, cranSuivant, renderLigneDeLaNoteHtml,
  renderNoteDuMessageHtml, rotationValide, zoomValide
} from "./note-jointe.js";
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
  assert.match(html, /data-copilote-retirer-piece/, "et la croix reste à part");
});

/**
 * **Une pastille, pas un bandeau.**
 *
 * La note prenait toute la largeur de la zone de saisie : une seule faisait une
 * barre, et deux n'auraient pas pu tenir côte à côte. La rangée qui la porte
 * saura en aligner plusieurs le jour où l'on en joindra deux.
 */
test("la note est une pastille, dans une rangée qui peut en porter plusieurs", () => {
  const html = renderLigneDeLaNoteHtml({ piece: { nom: "note.pdf", taille: 1200 } });

  assert.match(html, /class="copilote-pieces"/);
  assert.ok(
    html.indexOf("copilote-pieces") < html.indexOf("copilote-piece\""),
    "la rangée enveloppe la pastille"
  );
});

/**
 * **Un repère, et non un identifiant.** La barre d'outils porte une seconde
 * croix qui retire la même note ; les deux s'appelaient `copiloteRetirerPiece`,
 * et un identifiant écrit deux fois dans une page n'en désigne plus qu'un — le
 * premier. Elles sont exclusives aujourd'hui, ce qui rendait le défaut invisible
 * en attendant qu'il cesse de l'être.
 */
test("la croix ne porte plus d'identifiant, mais un repère", () => {
  const html = renderLigneDeLaNoteHtml({ piece: { nom: "note.pdf" } });

  assert.doesNotMatch(html, /id="copiloteRetirerPiece"/);
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

/**
 * **Les pages sont dessinées par l'application, pas par le navigateur.**
 *
 * Le cadre laissait le navigateur s'en charger. Il sait le faire — mais il peut
 * aussi refuser : « toujours télécharger les PDF » est un réglage courant, et le
 * cadre montrait alors un bouton « Ouvrir » à la place du document.
 */
test("l'aperçu porte le lecteur de l'application, et rien du navigateur", () => {
  const { corpsHtml } = apercuDeLaNote({ nom: "note.pdf", adresse: "blob:abc" });

  assert.doesNotMatch(corpsHtml, /<iframe|<object|<embed/, "aucun lecteur du navigateur");
  assert.match(corpsHtml, /data-copilote-apercu-pages/, "les pages se peignent ici");
  assert.match(corpsHtml, /documents-pdf-viewer__pages/, "avec les classes du lecteur des Documents");
});

/**
 * **La fenêtre est celle de l'application.**
 *
 * `#detailsModal` attend dans le document : sa coque, son voile, son en-tête, sa
 * croix et sa fermeture sont réglés. Ce module ne rend que les trois morceaux
 * qu'on y met — en dessiner une seconde revenait à recalibrer un voile et une
 * ombre contre ceux d'à côté (règle 10).
 */
test("l'aperçu se range dans les trois morceaux d'une fenêtre", () => {
  const rendu = apercuDeLaNote({ nom: "note.pdf", adresse: "blob:abc" });

  assert.deepEqual(Object.keys(rendu).sort(), ["corpsHtml", "metaHtml", "titreHtml"]);
  assert.match(rendu.titreHtml, /note\.pdf/, "le nom est le titre de la fenêtre");
  // Aucune coque : elle est déjà dans le document, et une seconde divergerait.
  assert.doesNotMatch(rendu.corpsHtml, /role="dialog"|copilote-apercu-voile|__fermer/);
});

/**
 * **Le recours reste à portée de main.** Le lecteur de l'application dessine ;
 * ce lien rend la note au navigateur — pour l'imprimer, ou la garder ouverte à
 * côté. Il se pose à droite de l'en-tête, avant la croix.
 */
test("l'aperçu offre d'ouvrir la note dans un onglet", () => {
  const avec = apercuDeLaNote({ nom: "note.pdf", adresse: "blob:abc" });
  assert.match(avec.metaHtml, /href="blob:abc"[\s\S]{0,80}target="_blank"/);
  assert.match(avec.metaHtml, /Ouvrir dans un onglet/);

  // Sans adresse, pas de lien mort : l'aperçu se dessine quand même, puisqu'il
  // ne dépend plus d'elle. La barre d'outils reste, elle ne dépendait de rien.
  const sans = apercuDeLaNote({ nom: "note.pdf" });
  assert.doesNotMatch(sans.metaHtml, /Ouvrir dans un onglet|<a /);
  assert.match(sans.metaHtml, /data-geste="zoom:plus"/);
  assert.match(sans.corpsHtml, /data-copilote-apercu-pages/);
});

/**
 * **Trois états, et non deux.** Un cadre vide, un cadre en cours de lecture et
 * un cadre en panne se regardent exactement pareil : l'écran dit lequel des
 * trois, sans quoi on rejoint la note pour rien (règle 5).
 */
test("l'aperçu dit où en est le dessin", () => {
  assert.match(apercuDeLaNote({ nom: "n.pdf" }).corpsHtml, /Lecture de la note…/);
  assert.match(apercuDeLaNote({ nom: "n.pdf", etat: "lecture" }).corpsHtml, /aria-busy="true"/);

  const lue = apercuDeLaNote({ nom: "n.pdf", etat: "lue" }).corpsHtml;
  assert.doesNotMatch(lue, /Lecture de la note/);
  assert.match(lue, /aria-busy="false"/);

  const panne = apercuDeLaNote({ nom: "n.pdf", etat: "panne", adresse: "blob:abc" }).corpsHtml;
  assert.match(panne, /n'a pas pu être dessinée/);
  assert.match(panne, /ouvrable dans un onglet/, "et le recours est rappelé");
});

/* ── La note dans le fil ─────────────────────────────────────────────────── */

/**
 * **Une fois la question partie, la note s'ouvre encore.**
 *
 * Elle se voit dans la bulle où elle a servi, mais son nom n'y était qu'un
 * texte : on relit une réponse, on veut revoir la note sur laquelle elle
 * s'appuie, et il fallait rouvrir le fichier ailleurs — sortir de l'écran pour
 * vérifier ce que l'écran vient d'affirmer. Elle porte le même repère que la
 * pastille de la zone de saisie : un seul geste les ouvre toutes les deux.
 */
test("le nom de la note reste cliquable dans le fil", () => {
  const html = renderNoteDuMessageHtml({ nom: "descente-de-charge.pdf", montrable: true });

  assert.match(html, /<button[^>]*data-copilote-apercu/);
  assert.match(html, /descente-de-charge\.pdf/);
  assert.match(html, /title="Voir descente-de-charge\.pdf"/);
});

/**
 * **Sans octets, pas de bouton.** Ce qu'une discussion enregistre, ce sont le
 * rôle et le texte : la note relue d'une session d'avant n'a plus de contenu, et
 * un bouton qui rendrait un cadre vide ferait croire que le PDF l'est (règle 5).
 * Le nom reste, puisqu'il dit toujours sur quoi la réponse s'appuyait.
 */
test("la note d'une session d'avant se lit, mais ne s'ouvre pas", () => {
  const html = renderNoteDuMessageHtml({ nom: "note.pdf", montrable: false });

  assert.doesNotMatch(html, /<button|data-copilote-apercu/);
  assert.match(html, /note\.pdf/);

  // Et un message sans note ne laisse pas de rangée vide dans la bulle.
  assert.equal(renderNoteDuMessageHtml({ nom: "" }), "");
  assert.equal(renderNoteDuMessageHtml(), "");
});

/**
 * **Un nom venu d'un fichier déposé n'est pas du HTML.** Il vient du disque de
 * quelqu'un : il peut contenir n'importe quoi, et il est écrit deux fois — dans
 * le titre de survol et dans le corps du bouton.
 */
test("le nom de la note est échappé, dans le titre comme dans le texte", () => {
  const html = renderNoteDuMessageHtml({ nom: '<img src=x onerror=1>"', montrable: true });

  assert.doesNotMatch(html, /<img/);
  assert.equal(html.match(/&lt;img/g)?.length, 2, "le corps et le titre de survol");
});

/* ── Grossir, et pivoter ─────────────────────────────────────────────────── */

/**
 * **Une page ramenée à la largeur d'une fenêtre ne se lit pas toujours.**
 *
 * On reconnaît un plan, une note — mais pas ce qu'ils *disent* : une cote au
 * huitième de la taille imprimée est un trait. Le grossissement est donc là,
 * par crans : on veut « un peu plus grand », pas régler un curseur au centième.
 */
test("le grossissement avance par crans, et s'arrête aux bornes", () => {
  assert.equal(cranSuivant(1, 1), 1.5);
  assert.equal(cranSuivant(1, -1), 0.75);

  const plusGrand = CRANS_DE_ZOOM[CRANS_DE_ZOOM.length - 1];
  assert.equal(cranSuivant(plusGrand, 1), plusGrand, "au bout, on n'avance plus");
  assert.equal(cranSuivant(CRANS_DE_ZOOM[0], -1), CRANS_DE_ZOOM[0]);

  // **1 est la largeur de la fenêtre**, et c'est le repos : c'est ce que « 100 % »
  // veut dire ici, et non la taille imprimée — une A4 à sa taille réelle serait
  // plus étroite que la fenêtre sur un grand écran.
  assert.ok(CRANS_DE_ZOOM.includes(1));
});

/**
 * **Une valeur qu'aucun bouton ne rend n'existe pas.** Un état gardé d'une
 * version d'avant, ou un 0 venu d'un calcul de largeur raté, sortirait la barre
 * de ses bornes et afficherait un pourcentage qu'on ne saurait plus quitter.
 */
test("un grossissement inconnu retombe sur un cran", () => {
  assert.equal(zoomValide(1.2), 1);
  assert.equal(zoomValide(99), CRANS_DE_ZOOM[CRANS_DE_ZOOM.length - 1]);
  assert.equal(zoomValide(0), CRANS_DE_ZOOM[0]);
  assert.equal(zoomValide(undefined), 1);
  assert.equal(zoomValide("beaucoup"), 1);
});

/**
 * **Le quart de tour reste entre 0 et 270.**
 *
 * Le reste d'un nombre négatif est négatif en JavaScript : sans second tour,
 * pivoter en arrière depuis le haut rendrait −90, que pdf.js prend pour un
 * angle valide et qu'aucun clic ne sait ramener à zéro — la note resterait de
 * travers, et seule sa fermeture la remettrait droite.
 */
test("pivoter reste dans le tour, dans les deux sens", () => {
  assert.equal(rotationValide(0), 0);
  assert.equal(rotationValide(90), 90);
  assert.equal(rotationValide(360), 0);
  assert.equal(rotationValide(450), 90);
  assert.equal(rotationValide(-90), 270);
  assert.equal(rotationValide(-450), 270);
  assert.equal(rotationValide("nulle part"), 0);
});

/**
 * **La barre dit où l'on en est, et ce qu'on ne peut plus faire.** Un bouton
 * qui répond en ne faisant rien se lit comme un bouton cassé ; aux bornes, il
 * s'éteint.
 */
test("la barre d'outils porte le taux, et s'éteint aux bornes", () => {
  const cent = apercuDeLaNote({ nom: "n.pdf", etat: "lue" }).metaHtml;
  assert.match(cent, /data-geste="zoom:ajuste"[\s\S]{0,120}100 %/);
  assert.doesNotMatch(cent, /data-geste="zoom:moins"[^>]*disabled/);
  assert.doesNotMatch(cent, /data-geste="zoom:plus"[^>]*disabled/);

  const plusPetit = apercuDeLaNote({ nom: "n.pdf", etat: "lue", zoom: CRANS_DE_ZOOM[0] }).metaHtml;
  assert.match(plusPetit, /data-geste="zoom:moins"[^>]*disabled/);
  assert.doesNotMatch(plusPetit, /data-geste="zoom:plus"[^>]*disabled/);

  const dernier = CRANS_DE_ZOOM[CRANS_DE_ZOOM.length - 1];
  const plusGrand = apercuDeLaNote({ nom: "n.pdf", etat: "lue", zoom: dernier }).metaHtml;
  assert.match(plusGrand, new RegExp(`${dernier * 100} %`));
  assert.match(plusGrand, /data-geste="zoom:plus"[^>]*disabled/);
});

/**
 * **Une note qu'on n'a pas su dessiner n'offre pas de la grossir.** Il n'y a
 * rien à grossir : les boutons resteraient cliquables sur un cadre vide, et
 * chaque clic redemanderait un dessin qui échoue.
 */
test("la barre s'éteint quand le dessin est en panne", () => {
  const panne = apercuDeLaNote({ nom: "n.pdf", etat: "panne", adresse: "blob:a" }).metaHtml;

  for (const geste of ["zoom:moins", "zoom:plus", "zoom:ajuste", "pivoter"]) {
    assert.match(panne, new RegExp(`data-geste="${geste}"[^>]*disabled`), geste);
  }
  // Le recours, lui, reste : c'est tout ce qui marche encore.
  assert.match(panne, /Ouvrir dans un onglet/);
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
 * **Ce que l'aperçu retient se rend à la fermeture** : le document du lecteur,
 * et l'adresse d'objet du recours.
 *
 * Les garder retiendrait les pages et les octets de la note jusqu'à ce qu'on
 * quitte l'application. Rien à l'écran ne le dirait : c'est le défaut qu'on
 * découvre au bout d'une heure, quand l'onglet rame. Aucune exécution ne le
 * montre ici — l'écran parle à la base et ne s'importe pas.
 */
test("le Copilote rend ce que l'aperçu retenait quand il referme", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("./copilote.js", import.meta.url), "utf8");

  assert.match(source, /adresseDeLaPiece\(piece\)/, "l'adresse se fabrique à l'ouverture");

  // **La fermeture rend tout, et par un seul chemin** : celui de la fenêtre.
  // Deux nettoyages mèneraient à deux états différents de la mémoire (règle 4).
  assert.match(
    source, /surFermeture:[\s\S]{0,300}dispose\?\.\(\)[\s\S]{0,200}oublierLAdresse/,
    "le document du lecteur et l'adresse partent ensemble"
  );
  assert.match(
    source, /function oublierLApercu[\s\S]{0,400}fermerLaFenetreDeDetails\(\)/,
    "et tout passe par la fenêtre"
  );

  // **Trois chemins mènent à la même fermeture**, et les trois doivent rendre :
  // retirer la note, en joindre une autre, changer de projet.
  assert.match(source, /etat\.pieceJointe = null;[\s\S]{0,200}oublierLApercu\(etat\)/, "retirer");
  assert.match(source, /oublierLApercu\(etat\);\s*\n\s*etat\.pieceJointe = await lireLeFichier/, "rejoindre");
  assert.match(source, /oublierLApercu\(store\.ui\.assistant\)/, "changer de projet");
});

/**
 * **L'aperçu est une fenêtre, pas un morceau d'écran.**
 *
 * Il tenait dans le flux, entre le fil et la saisie : chaque rendu du Copilote —
 * à chaque message, à chaque étape d'outil, à chaque conversation qui arrive —
 * effaçait les pages peintes pour les repeindre. Il est désormais posé
 * impérativement, et le rendu de l'écran ne le connaît plus.
 */
test("l'aperçu ne se redessine plus avec l'écran", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("./copilote.js", import.meta.url), "utf8");

  assert.match(source, /ouvrirLaFenetreDeDetails\(/, "il passe par la fenêtre de l'application");
  assert.doesNotMatch(
    source, /\$\{renderApercu\(etat\)\}/,
    "et le gabarit de l'écran ne le contient plus"
  );
});

/**
 * **Une note qu'on n'a pas su dessiner ne referme pas sa fenêtre.**
 *
 * Elle reste ouverte, et dit la panne : le recours — l'ouvrir dans un onglet —
 * est dans son en-tête. Le dire en rouvrant la fenêtre la refermait d'abord :
 * `surFermeture` partait, l'aperçu était oublié, et la fenêtre restait ouverte
 * sur une note dont plus personne ne se savait propriétaire. La croix ne rendait
 * plus les octets, et le clic suivant rouvrait au lieu de fermer.
 */
test("l'état du dessin se dit sans rouvrir la fenêtre", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("./copilote.js", import.meta.url), "utf8");

  assert.match(
    source, /function direLetatDeLApercu[\s\S]{0,300}majLaFenetreDeDetails\(apercuDeLaNote/,
    "elle se rafraîchit"
  );
  assert.doesNotMatch(
    source, /etat\.apercu\.etat = "panne";\s*\n\s*poserLaFenetre/,
    "et ne se rouvre pas"
  );

  // Et l'écran ne referme plus par lui-même : la fenêtre porte sa croix, son
  // voile et son Échap, et c'est son `surFermeture` qui rend les octets.
  assert.doesNotMatch(source, /data-copilote-apercu-voile|data-copilote-apercu-fermer/);
});

/**
 * **Le fil compacte les onglets.**
 *
 * On lui désignait `null` : la coque ne défilant pas, le bandeau du projet ne
 * voyait aucun mouvement et restait déplié. Sur un écran de conversation, ces
 * quarante-quatre pixels sont pris sur la seule chose qu'on y fait — lire.
 */
test("le fil déclare qu'il est l'ascenseur de son écran", async () => {
  const { readFile } = await import("node:fs/promises");
  const [copilote, atelier] = await Promise.all([
    readFile(new URL("./copilote.js", import.meta.url), "utf8"),
    readFile(new URL("../../project-studio.js", import.meta.url), "utf8")
  ]);

  // Le fil le dit dans son HTML…
  assert.match(copilote, /id="copiloteThread" data-defilement-du-panneau/);
  // …et l'Atelier le lit, au lieu de ne désigner que sa propre coque.
  assert.match(atelier, /\[data-side-nav-panel\]\.is-active \[data-defilement-du-panneau\]/);
  assert.match(atelier, /registerProjectScrollSources\(ascenseursDuRouteur\(\)\)/);

  // **Et l'Atelier ne désigne plus la coque seule** : c'est ce qui écrasait la
  // déclaration du fil selon le chemin par lequel on entrait (règle 4).
  assert.doesNotMatch(atelier, /registerProjectPrimaryScrollSource/);
  assert.doesNotMatch(copilote, /registerProjectPrimaryScrollSource\(null\)/);
});
