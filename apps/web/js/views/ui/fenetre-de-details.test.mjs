/**
 * La fenêtre de détails prêtée : ce qu'elle ouvre, et ce qu'elle rend.
 *
 * ## Ce que ces gardes attrapent
 *
 * **Une fermeture qui ne rend rien.** L'appelant lui confie de quoi défaire ce
 * qu'il retenait — un document de lecteur PDF, une adresse d'objet qui tient
 * les octets d'une note en mémoire. Si un des trois chemins de fermeture (la
 * croix, le voile, Échap) l'oublie, les octets restent jusqu'à ce qu'on quitte
 * l'onglet, et rien à l'écran ne le dit.
 *
 * **Une écoute qui s'empile.** `bindOverlayChromeDismiss` ne se pose qu'une
 * fois par élément — la coque est la même à chaque ouverture. Le renvoi qu'elle
 * appelle doit donc être celui du moment, et non celui du premier jour : sinon
 * la croix referme une fenêtre qui n'est plus là, et l'écran reste couvert.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  fermerLaFenetreDeDetails,
  laFenetreDeDetailsEstOuverte,
  majLaFenetreDeDetails,
  ouvrirLaFenetreDeDetails
} from "./fenetre-de-details.js";

/** Un DOM de papier : des classes, des écoutes qu'on compte, et du HTML posé. */
function fausseClassList() {
  const set = new Set();
  return {
    set,
    add: (nom) => set.add(nom),
    remove: (nom) => set.delete(nom),
    toggle: (nom, on) => (on ? set.add(nom) : set.delete(nom)),
    contains: (nom) => set.has(nom)
  };
}

function fauxElement() {
  const ecoutes = [];
  return {
    innerHTML: "",
    dataset: {},
    classList: fausseClassList(),
    ecoutes,
    attributs: {},
    setAttribute(nom, valeur) { this.attributs[nom] = valeur; },
    addEventListener: (type, handler) => ecoutes.push({ type, handler }),
    removeEventListener: () => {},
    declencher(type, evenement) {
      for (const ecoute of ecoutes) if (ecoute.type === type) ecoute.handler(evenement);
    }
  };
}

function poserLeDocument() {
  const hote = fauxElement();
  const titre = fauxElement();
  const meta = fauxElement();
  const corps = fauxElement();
  const body = fauxElement();
  const ecoutes = [];
  const parNom = { detailsModal: hote, detailsTitleModal: titre, detailsMetaModal: meta, detailsBodyModal: corps };

  globalThis.document = {
    body,
    getElementById: (id) => parNom[id] || null,
    addEventListener: (type, handler) => ecoutes.push({ type, handler }),
    removeEventListener: (type, handler) => {
      const i = ecoutes.findIndex((e) => e.type === type && e.handler === handler);
      if (i >= 0) ecoutes.splice(i, 1);
    }
  };

  return {
    hote, titre, meta, corps, body, ecoutes,
    frapper: (key) => { for (const e of [...ecoutes]) if (e.type === "keydown") e.handler({ key }); }
  };
}

test.afterEach(() => {
  fermerLaFenetreDeDetails();
  delete globalThis.document;
});

/**
 * **Les trois morceaux vont aux trois endroits**, et le corps revient à
 * l'appelant : c'est là qu'il peindra. Sans ce retour, il devrait aller
 * rechercher `#detailsBodyModal` lui-même, et connaître la fenêtre qu'on lui
 * prête (règle 10).
 */
test("la fenêtre reçoit le titre, ce qui se pose à droite, et le corps", () => {
  const dom = poserLeDocument();

  const corps = ouvrirLaFenetreDeDetails({
    titreHtml: "<span>note.pdf</span>",
    metaHtml: "<a>Ouvrir dans un onglet</a>",
    corpsHtml: "<div data-pages></div>",
    className: "modal--apercu-note"
  });

  assert.equal(corps, dom.corps, "le corps revient, pour y peindre");
  assert.equal(dom.titre.innerHTML, "<span>note.pdf</span>");
  assert.equal(dom.meta.innerHTML, "<a>Ouvrir dans un onglet</a>");
  assert.equal(dom.corps.innerHTML, "<div data-pages></div>");
  assert.ok(dom.hote.classList.contains("modal--apercu-note"));
  assert.ok(dom.hote.classList.contains("is-open"));
  assert.ok(!dom.hote.classList.contains("hidden"));
  assert.ok(dom.body.classList.contains("modal-open"), "l'arrière-plan ne défile plus");
  assert.ok(laFenetreDeDetailsEstOuverte());
});

/**
 * **Les trois chemins de fermeture rendent ce qui était retenu.** La croix, le
 * voile et Échap mènent au même endroit : trois nettoyages différents, c'est
 * trois états différents de la mémoire (règle 4).
 */
for (const [nom, fermer] of [
  ["la croix", (dom) => dom.hote.declencher("click", {
    target: { closest: () => ({}) }
  })],
  ["le voile", (dom) => dom.hote.declencher("click", {
    target: Object.assign(dom.hote, { closest: () => null })
  })],
  ["Échap", (dom) => dom.frapper("Escape")],
  ["l'appel direct", () => fermerLaFenetreDeDetails()]
]) {
  test(`${nom} referme, et rend ce que l'appelant retenait`, () => {
    const dom = poserLeDocument();
    let rendus = 0;

    ouvrirLaFenetreDeDetails({
      titreHtml: "t", metaHtml: "m", corpsHtml: "c",
      className: "modal--apercu-note",
      surFermeture: () => { rendus += 1; }
    });

    fermer(dom);

    assert.equal(rendus, 1, "l'appelant a pu rendre ce qu'il retenait");
    assert.ok(!laFenetreDeDetailsEstOuverte());
    assert.ok(dom.hote.classList.contains("hidden"));
    assert.ok(!dom.hote.classList.contains("modal--apercu-note"), "la classe du contenu s'en va");
    assert.ok(!dom.body.classList.contains("modal-open"));
    assert.equal(dom.corps.innerHTML, "", "le contenu ne reste pas derrière le voile");
    assert.equal(dom.titre.innerHTML, "");
    assert.equal(dom.meta.innerHTML, "");
    assert.equal(dom.ecoutes.filter((e) => e.type === "keydown").length, 0, "et l'écoute du clavier part");
  });
}

/**
 * **Refermer deux fois ne rend pas deux fois.** Échap suivi de la croix, ou la
 * croix pendant que l'écran se redessine : le second appel rendrait une adresse
 * déjà rendue, et referait le nettoyage de l'appelant sur un état qui n'existe
 * plus.
 */
test("refermer une fenêtre déjà refermée ne fait rien", () => {
  poserLeDocument();
  let rendus = 0;
  ouvrirLaFenetreDeDetails({ corpsHtml: "c", surFermeture: () => { rendus += 1; } });

  fermerLaFenetreDeDetails();
  fermerLaFenetreDeDetails();

  assert.equal(rendus, 1);
  assert.doesNotThrow(() => fermerLaFenetreDeDetails());
});

/**
 * **Une fenêtre à la fois.** Deux contenus superposés se recouvrent, et l'on
 * clique dans celui qu'on ne regarde pas ; surtout, le premier n'aurait jamais
 * rendu ce qu'il retenait.
 */
test("en ouvrir une seconde referme la première, qui rend son dû", () => {
  const dom = poserLeDocument();
  let premierRendu = 0;

  ouvrirLaFenetreDeDetails({
    corpsHtml: "première", className: "modal--une", surFermeture: () => { premierRendu += 1; }
  });
  ouvrirLaFenetreDeDetails({ corpsHtml: "seconde", className: "modal--deux" });

  assert.equal(premierRendu, 1, "la première a rendu ce qu'elle retenait");
  assert.equal(dom.corps.innerHTML, "seconde");
  assert.ok(!dom.hote.classList.contains("modal--une"));
  assert.ok(dom.hote.classList.contains("modal--deux"));
  assert.ok(dom.hote.classList.contains("is-open"), "et la fenêtre reste ouverte");
  assert.equal(dom.ecoutes.filter((e) => e.type === "keydown").length, 1, "une seule écoute du clavier");
});

/**
 * **La croix referme encore à la deuxième ouverture.**
 *
 * `bindOverlayChromeDismiss` ne pose son écoute qu'une fois par élément, et la
 * coque est la même à chaque ouverture : le renvoi qu'elle appelle doit donc
 * être celui du moment. Capturé à la première ouverture, il refermerait une
 * fenêtre qui n'est plus là — l'écran resterait couvert, et la croix sans
 * effet. C'est le défaut qu'on ne voit qu'à la deuxième note.
 */
test("la croix referme la fenêtre du moment, et non celle d'avant", () => {
  const dom = poserLeDocument();

  ouvrirLaFenetreDeDetails({ corpsHtml: "première" });
  fermerLaFenetreDeDetails();

  let secondRendu = 0;
  ouvrirLaFenetreDeDetails({ corpsHtml: "seconde", surFermeture: () => { secondRendu += 1; } });
  dom.hote.declencher("click", { target: { closest: () => ({}) } });

  assert.equal(secondRendu, 1, "c'est la seconde qui s'est refermée");
  assert.ok(!laFenetreDeDetailsEstOuverte());
  assert.ok(dom.hote.classList.contains("hidden"));
});

/**
 * **Changer ce qu'elle montre ne la referme pas.**
 *
 * Un contenu qui change d'état — une note qu'on lit, puis qu'on n'a pas su
 * dessiner — était réaffiché en rouvrant la fenêtre. Rouvrir referme d'abord :
 * l'appelant rendait ce qu'il retenait et remettait son état à zéro, et la
 * fenêtre restait ouverte sur un contenu dont plus personne ne se savait
 * propriétaire. La croix ne rendait alors plus rien, et le clic suivant
 * rouvrait au lieu de fermer. Rien à l'écran ne le disait.
 */
test("changer le contenu ne referme pas, et ne rend rien", () => {
  const dom = poserLeDocument();
  let rendus = 0;

  ouvrirLaFenetreDeDetails({
    titreHtml: "note.pdf", metaHtml: "onglet", corpsHtml: "Lecture de la note…",
    className: "modal--apercu-note",
    surFermeture: () => { rendus += 1; }
  });

  const corps = majLaFenetreDeDetails({
    titreHtml: "note.pdf", metaHtml: "onglet", corpsHtml: "Cette note n'a pas pu être dessinée."
  });

  assert.equal(corps, dom.corps);
  assert.equal(rendus, 0, "personne n'a rendu ce qu'il retenait");
  assert.ok(laFenetreDeDetailsEstOuverte());
  assert.equal(dom.corps.innerHTML, "Cette note n'a pas pu être dessinée.");
  assert.ok(dom.hote.classList.contains("modal--apercu-note"), "la classe du contenu reste");
  assert.equal(dom.ecoutes.filter((e) => e.type === "keydown").length, 1, "une seule écoute du clavier");

  // Et la fermeture confiée à l'ouverture joue encore, une fois.
  fermerLaFenetreDeDetails();
  assert.equal(rendus, 1);
});

/**
 * **Rien d'ouvert, rien à changer.** Un rafraîchissement qui poserait du contenu
 * dans une fenêtre fermée le laisserait derrière le voile, prêt à réapparaître à
 * l'ouverture suivante — celle d'un tout autre écran.
 */
test("changer le contenu d'une fenêtre fermée ne pose rien", () => {
  const dom = poserLeDocument();

  assert.equal(majLaFenetreDeDetails({ corpsHtml: "perdu" }), null);
  assert.equal(dom.corps.innerHTML, "");
  assert.ok(!laFenetreDeDetailsEstOuverte());
});

/**
 * **Sans fenêtre dans le document, on ne prétend pas en avoir ouvert une.**
 * L'appelant peint dans ce qu'on lui rend : `null` lui dit de ne rien faire,
 * là où un objet vide l'aurait laissé peindre dans le vide (règle 5).
 */
test("un document sans fenêtre ne rend pas de corps", () => {
  globalThis.document = { body: fauxElement(), getElementById: () => null, addEventListener() {}, removeEventListener() {} };

  assert.equal(ouvrirLaFenetreDeDetails({ corpsHtml: "c" }), null);
  assert.ok(!laFenetreDeDetailsEstOuverte());
});

/**
 * **Une autre touche ne referme pas.** On écrit dans la fenêtre — une note
 * annotée, un champ de recherche : seule Échap ferme.
 */
test("taper autre chose qu'Échap laisse la fenêtre ouverte", () => {
  const dom = poserLeDocument();
  let rendus = 0;
  ouvrirLaFenetreDeDetails({ corpsHtml: "c", surFermeture: () => { rendus += 1; } });

  dom.frapper("Enter");
  dom.frapper("a");

  assert.equal(rendus, 0);
  assert.ok(laFenetreDeDetailsEstOuverte());
});
