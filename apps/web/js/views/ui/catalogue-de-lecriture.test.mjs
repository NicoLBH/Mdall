/**
 * Le catalogue qu'on parcourt en écrivant du Mdall.
 *
 * ## Ce que ces gardes attrapent
 *
 * **Une pose qui tombe à côté.** Le nom se pose là où le curseur était, dans un
 * texte à plusieurs lignes, en remplaçant le mot en cours. Une arithmétique de
 * décalage fausse ne casse rien bruyamment : elle écrit le nom au mauvais
 * endroit, et l'on croit avoir mal cliqué.
 *
 * **Une fenêtre qui ne se referme pas.** On vient chercher un nom pour l'écrire.
 * Poser sans refermer ferait deux gestes pour un, et l'on taperait derrière un
 * voile.
 *
 * **Un établi qui arrive trop tard.** Il se lit après l'ouverture ; si le rendu
 * ne se refait pas quand il revient, ses noms ne paraissent jamais et rien ne
 * dit pourquoi.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  ETABLI, ICONE_DE_LORIGINE, MARQUE_DE_LA_RECHERCHE, MARQUE_DU_NOM, PHRASE_DE_LETABLI,
  ligneDuNom, ouvrirLeCatalogueDeLecriture, poserLeNom, renderCatalogueDesNoms, renderRayonDesNoms
} from "./catalogue-de-lecriture.js";
import { fermerLaFenetreDeDetails, laFenetreDeDetailsEstOuverte } from "./fenetre-de-details.js";
import { ORIGINE, catalogueDesNoms, rayonsDesNoms } from "../../services/catalogue-des-noms.js";
import { escapeHtml } from "../../utils/escape-html.js";

const BROUILLON = [{
  nom: "essai.ref",
  contenu: [
    "const Prix HT = {",
    '   type: "mesure",',
    '   unité: "€",',
    '   description: "Le prix hors taxes.",',
    "};",
    "",
    "fonction Prix TTC(zones, Prix HT) {",
    "   si (Prix HT >= 0 €)",
    "   alors (Prix HT);",
    "}"
  ].join("\n")
}];

const GARDES = [{
  id: "u1", nom: "Descente de charge", version: "3",
  resume: "La charge en pied de poteau.",
  entrees: ["Portée (m)"], sorties: ["Charge en pied"]
}];

const CATALOGUE = catalogueDesNoms({ fichiers: BROUILLON, etabli: GARDES, locales: [] });

/* ── Ce qu'une entrée dit sous son nom ───────────────────────────────────── */

test("ce qu'une fonction lit passe avant ce qu'elle dit", () => {
  // La première question devant une fonction qu'on n'a pas écrite soi-même est
  // « de quoi a-t-elle besoin ? » : on a déjà son nom pour la seconde.
  assert.equal(
    ligneDuNom({ nom: "Prix TTC", lit: ["Prix HT"], dit: "Le prix toutes taxes." }),
    "lit Prix HT · Le prix toutes taxes."
  );
  assert.equal(ligneDuNom({ nom: "Zone", valeurs: ["1", "2"] }), "vaut 1, 2");
  assert.equal(ligneDuNom({ nom: "arrondi", dit: "Arrondir", comme: "arrondi(Cote ; 2)" }),
    "Arrondir · s'écrit arrondi(Cote ; 2)");
  // Une entrée qui n'a rien à ajouter n'ajoute rien : une ligne vide sous un
  // nom se lit comme une information manquante.
  assert.equal(ligneDuNom({ nom: "Seul" }), "");
  assert.equal(ligneDuNom(), "");
});

/* ── Le rendu ────────────────────────────────────────────────────────────── */

test("chaque rayon porte son titre, sa phrase, et un bouton par nom", () => {
  const html = renderCatalogueDesNoms(CATALOGUE);

  for (const rayon of rayonsDesNoms(CATALOGUE)) {
    assert.ok(html.includes(escapeHtml(rayon.titre)), `titre absent : ${rayon.titre}`);
    assert.ok(html.includes(escapeHtml(rayon.dit)), `phrase absente : ${rayon.origine}`);
  }

  for (const une of CATALOGUE) {
    assert.ok(html.includes(`${MARQUE_DU_NOM}="${une.nom}"`), `nom absent : ${une.nom}`);
  }
});

test("chaque origine a son pictogramme, et il existe dans la planche", async () => {
  // Une icône manquante ne casse rien : elle laisse un bouton **vide**, et l'on
  // croit l'écran cassé. Celle du rail l'a été pendant tout un lot.
  const planche = await import("node:fs")
    .then(({ readFileSync }) => readFileSync("apps/web/assets/icons.svg", "utf8"));

  for (const origine of Object.values(ORIGINE)) {
    const icone = ICONE_DE_LORIGINE[origine];
    assert.ok(icone, `pas de pictogramme : ${origine}`);
    assert.ok(planche.includes(`id="${icone}"`), `pictogramme absent de la planche : ${icone}`);
  }
});

test("le champ de recherche reste quand rien ne répond", () => {
  /**
   * Le retirer emporterait ce qu'on vient de taper, et l'on ne pourrait plus
   * corriger une faute de frappe sans rouvrir la fenêtre.
   */
  const html = renderCatalogueDesNoms(CATALOGUE, { recherche: "zzz" });
  assert.ok(html.includes(MARQUE_DE_LA_RECHERCHE));
  assert.ok(html.includes('value="zzz"'));
  assert.ok(html.includes("Aucun nom ne répond"));
});

test("un brouillon vide le dit, et ne montre pas une fenêtre muette", () => {
  assert.ok(renderCatalogueDesNoms([]).includes("Rien à nommer"));
});

test("un établi qu'on attend et un établi qu'on n'a pas pu lire se distinguent", () => {
  /**
   * **Trois états, et non deux.** Un établi qu'on n'a pas pu lire n'est pas un
   * établi vide : le taire ferait croire qu'on n'a rien gardé, et l'on
   * réécrirait un utilitaire qu'on a déjà (règle 5).
   */
  const dit = (etabli) => renderCatalogueDesNoms(CATALOGUE, { etabli });

  assert.ok(dit(ETABLI.ATTENTE).includes(escapeHtml(PHRASE_DE_LETABLI[ETABLI.ATTENTE])));
  assert.ok(dit(ETABLI.REFUS).includes(escapeHtml(PHRASE_DE_LETABLI[ETABLI.REFUS])));
  assert.notEqual(PHRASE_DE_LETABLI[ETABLI.ATTENTE], PHRASE_DE_LETABLI[ETABLI.REFUS]);
  // Lu, il ne dit rien : c'est l'état normal, et une phrase de plus à chaque
  // ouverture apprendrait à ne plus les lire.
  assert.ok(!PHRASE_DE_LETABLI[ETABLI.LU]);
  assert.ok(!dit(ETABLI.LU).includes("review-empty-note"));
});

test("le compte dit ce que la recherche a laissé, pas le total", () => {
  // « 3 noms » après une frappe répond à « est-ce que j'ai trop filtré ? ».
  assert.ok(renderCatalogueDesNoms(CATALOGUE, { recherche: "Prix" }).includes("2 noms"));
  assert.ok(renderCatalogueDesNoms(CATALOGUE).includes(`${CATALOGUE.length} noms`));
});

test("un rayon sans nom ne dessine aucun bouton", () => {
  const html = renderRayonDesNoms({ origine: ORIGINE.DECLARE, titre: "T", dit: "D", noms: [] });
  assert.ok(html.includes("T") && html.includes("D"));
  assert.ok(!html.includes(MARQUE_DU_NOM));
});

/* ── Poser un nom ────────────────────────────────────────────────────────── */

/** Une zone de saisie de papier : ce que la pose touche, et rien de plus. */
function fausseZone(valeur, position) {
  const evenements = [];
  return {
    value: valeur,
    selectionStart: position,
    selectionEnd: position,
    evenements,
    dispatchEvent: (evenement) => { evenements.push(evenement.type); return true; }
  };
}

test("le nom se pose là où le curseur était, en remplaçant le mot en cours", () => {
  /**
   * On a pu taper « Prix » pour trouver « Prix HT » : coller derrière aurait
   * donné « PrixPrix HT ». C'est la pose de la complétion, et pas une seconde.
   */
  const zone = fausseZone("fonction A(zones) {\n   si (Prix\n}", 31);
  assert.equal(poserLeNom(zone, "Prix HT"), true);
  assert.equal(zone.value, "fonction A(zones) {\n   si (Prix HT\n}");
  // Le curseur suit le nom posé, et non la fin de la ligne : on continue à
  // écrire derrière.
  assert.equal(zone.value.slice(0, zone.selectionStart), "fonction A(zones) {\n   si (Prix HT");
  assert.equal(zone.selectionEnd, zone.selectionStart);
  // La gouttière et la couche colorée suivent l'événement, comme à la frappe.
  assert.deepEqual(zone.evenements, ["input"]);
});

test("le nom se pose sur la première ligne aussi, sans décalage d'un caractère", () => {
  // Le décalage d'une ligne se compte avec le saut de ligne ; l'appliquer à la
  // première ligne poserait tout un caractère trop loin.
  const zone = fausseZone("si (Pri", 7);
  assert.equal(poserLeNom(zone, "Prix HT"), true);
  assert.equal(zone.value, "si (Prix HT");
  assert.equal(zone.selectionStart, 11);
});

test("ce qui suit le curseur reste", () => {
  const zone = fausseZone("   si (Prix >= 0 €)", 11);
  assert.equal(poserLeNom(zone, "Prix HT"), true);
  assert.equal(zone.value, "   si (Prix HT >= 0 €)");
});

test("poser rien ne touche à rien, et le dit", () => {
  const zone = fausseZone("si (", 4);
  assert.equal(poserLeNom(zone, "   "), false);
  assert.equal(poserLeNom(null, "Prix HT"), false);
  assert.equal(zone.value, "si (");
  assert.deepEqual(zone.evenements, []);
});

/* ── La fenêtre, et ses trois gestes ─────────────────────────────────────── */

function fausseClassList() {
  const set = new Set();
  return {
    add: (nom) => set.add(nom), remove: (nom) => set.delete(nom),
    toggle: (nom, on) => (on ? set.add(nom) : set.delete(nom)),
    contains: (nom) => set.has(nom)
  };
}

function fauxElement() {
  const ecoutes = [];
  const element = {
    innerHTML: "", dataset: {}, classList: fausseClassList(), ecoutes,
    setAttribute() {}, contains: () => true,
    addEventListener: (type, handler) => ecoutes.push({ type, handler }),
    removeEventListener: () => {},
    querySelector: () => null,
    declencher(type, evenement) {
      for (const ecoute of [...ecoutes]) if (ecoute.type === type) ecoute.handler(evenement);
    }
  };
  return element;
}

function poserLeDocument() {
  const hote = fauxElement();
  const corps = fauxElement();
  const parNom = {
    detailsModal: hote, detailsTitleModal: fauxElement(),
    detailsMetaModal: fauxElement(), detailsBodyModal: corps
  };

  globalThis.document = {
    body: fauxElement(),
    getElementById: (id) => parNom[id] || null,
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  return { hote, corps };
}

/** Un clic sur un nom du catalogue, tel que l'écoute le voit. */
const clicSurLeNom = (nom) => ({
  target: {
    closest: (selecteur) => (selecteur.includes(MARQUE_DU_NOM)
      ? { getAttribute: () => nom }
      : null)
  }
});

/** Une frappe dans le champ de recherche. */
const frappe = (valeur) => ({
  target: {
    closest: (selecteur) => (selecteur.includes(MARQUE_DE_LA_RECHERCHE)
      ? { value: valeur }
      : null)
  }
});

test.afterEach(() => {
  fermerLaFenetreDeDetails();
  delete globalThis.document;
});

test("la fenêtre s'ouvre sur ce qu'on peut nommer, et le dit en titre", () => {
  const dom = poserLeDocument();
  ouvrirLeCatalogueDeLecriture({ catalogue: () => CATALOGUE, zone: () => null });

  assert.ok(laFenetreDeDetailsEstOuverte());
  assert.ok(dom.corps.innerHTML.includes(`${MARQUE_DU_NOM}="Prix TTC"`));
});

test("un clic pose le nom et referme : on vient le chercher pour l'écrire", () => {
  const dom = poserLeDocument();
  const zone = fausseZone("   si (Pri", 10);
  ouvrirLeCatalogueDeLecriture({ catalogue: () => CATALOGUE, zone: () => zone });

  dom.corps.declencher("click", clicSurLeNom("Prix HT"));

  assert.equal(zone.value, "   si (Prix HT");
  assert.equal(laFenetreDeDetailsEstOuverte(), false, "poser referme");
});

test("un clic à côté d'un nom ne pose rien et ne referme rien", () => {
  const dom = poserLeDocument();
  const zone = fausseZone("   si (", 7);
  ouvrirLeCatalogueDeLecriture({ catalogue: () => CATALOGUE, zone: () => zone });

  dom.corps.declencher("click", { target: { closest: () => null } });

  assert.equal(zone.value, "   si (");
  assert.ok(laFenetreDeDetailsEstOuverte());
});

test("une frappe refiltre la liste, sans refermer", () => {
  const dom = poserLeDocument();
  ouvrirLeCatalogueDeLecriture({ catalogue: () => CATALOGUE, zone: () => null });

  dom.corps.declencher("input", frappe("Charge"));

  assert.ok(dom.corps.innerHTML.includes(`${MARQUE_DU_NOM}="Charge en pied"`));
  assert.ok(!dom.corps.innerHTML.includes(`${MARQUE_DU_NOM}="Prix TTC"`));
  // Et ce qu'on a tapé revient dans le champ : sinon la frappe suivante repart
  // de rien, et l'on ne peut plus corriger une lettre.
  assert.ok(dom.corps.innerHTML.includes('value="Charge"'));
  assert.ok(laFenetreDeDetailsEstOuverte());
});

test("le catalogue est redemandé à chaque frappe, jamais retenu", () => {
  // On vient peut-être d'écrire la fonction qu'on veut voir : une liste prise à
  // l'ouverture daterait d'avant.
  const dom = poserLeDocument();
  let combien = 0;
  ouvrirLeCatalogueDeLecriture({
    catalogue: () => { combien += 1; return CATALOGUE; },
    zone: () => null
  });

  const aLouverture = combien;
  dom.corps.declencher("input", frappe("P"));
  assert.ok(combien > aLouverture, "la liste n'a pas été redemandée");
});

/** Laisser la chaîne de promesses de l'ouverture se dérouler entièrement. */
const laisserTourner = async () => { for (let tour = 0; tour < 6; tour += 1) await Promise.resolve(); };

test("l'établi arrive après l'ouverture, et ses noms paraissent alors", async () => {
  /**
   * **Il se lit après, et c'est voulu** : tout ce qui vient du brouillon et du
   * langage est déjà là, et c'est ce qu'on cherche neuf fois sur dix. Mais si
   * le rendu ne se refait pas quand l'établi revient, ses noms ne paraissent
   * jamais — et rien à l'écran ne dit pourquoi.
   */
  const dom = poserLeDocument();
  let gardes = null;

  ouvrirLeCatalogueDeLecriture({
    catalogue: () => catalogueDesNoms({ fichiers: BROUILLON, etabli: gardes }),
    zone: () => null,
    lireLetabli: () => { gardes = GARDES; }
  });

  assert.ok(dom.corps.innerHTML.includes(escapeHtml(PHRASE_DE_LETABLI[ETABLI.ATTENTE])));
  assert.ok(!dom.corps.innerHTML.includes("Charge en pied"));

  await laisserTourner();

  assert.ok(dom.corps.innerHTML.includes(`${MARQUE_DU_NOM}="Charge en pied"`));
  assert.ok(!dom.corps.innerHTML.includes(escapeHtml(PHRASE_DE_LETABLI[ETABLI.ATTENTE])));
});

test("un établi qui ne répond pas le dit, et ne s'échappe pas", async () => {
  /**
   * **Deux défauts d'un coup, et aucun ne casse bruyamment.** Une promesse
   * rejetée qu'on laisse remonter fait une erreur non rattrapée dans la console
   * du navigateur ; l'avaler ferait un catalogue qui prétend que l'établi est
   * vide, et l'on réécrirait un utilitaire qu'on a déjà.
   */
  const dom = poserLeDocument();
  ouvrirLeCatalogueDeLecriture({
    catalogue: () => CATALOGUE,
    zone: () => null,
    lireLetabli: () => Promise.reject(new Error("la base ne répond pas"))
  });

  await laisserTourner();

  assert.ok(dom.corps.innerHTML.includes(escapeHtml(PHRASE_DE_LETABLI[ETABLI.REFUS])));
  assert.ok(dom.corps.innerHTML.includes(`${MARQUE_DU_NOM}="Prix TTC"`));
  assert.ok(laFenetreDeDetailsEstOuverte());
});
