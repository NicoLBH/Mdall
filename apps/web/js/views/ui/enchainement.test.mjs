/**
 * L'enchaînement partagé : un seul dessin, deux sens de lecture.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { renderEnchainement, SENS } from "./enchainement.js";

const ETAPES = [
  { id: "a", label: "Première", detail: "ce qu'elle a fait", tone: "neutral", icon: "beaker",
    sorties: ["Altitude du site"] },
  { id: "b", label: "Seconde", detail: "", tone: "warn", icon: "alert",
    entrees: ["Altitude du site", "H0 retenu"], sorties: ["Profondeur hors gel"] }
];

test("les étapes se relient, une liaison de moins que de boîtes", () => {
  const html = renderEnchainement(ETAPES);
  assert.equal((html.match(/run-graph__node /g) ?? []).length, 2);
  assert.equal((html.match(/run-graph__link/g) ?? []).length, 1);
});

test("une étape dit ce qu'elle lit et ce qu'elle écrit, et rien quand elle ne le dit pas", () => {
  const html = renderEnchainement(ETAPES);
  assert.match(html, /<i>lit<\/i>\s*<span>Altitude du site · H0 retenu<\/span>/);
  assert.match(html, /<i>écrit<\/i>\s*<span>Profondeur hors gel<\/span>/);
  // La première ne lit rien : pas de rubrique vide.
  assert.equal((html.match(/<i>lit<\/i>/g) ?? []).length, 1);
});

test("le même dessin tourne dans les deux sens", () => {
  assert.doesNotMatch(renderEnchainement(ETAPES), /run-graph__canvas--vertical/);
  assert.match(renderEnchainement(ETAPES, { sens: SENS.VERTICAL }), /run-graph__canvas--vertical/);
});

test("un titre n'est un bouton que si l'appelant nomme l'attribut qui l'écoute", () => {
  // Rendre cliquable un titre qui n'ouvre rien, ce serait promettre un détail
  // qu'on n'a pas.
  assert.doesNotMatch(renderEnchainement(ETAPES), /<button/);

  const avecLien = renderEnchainement(ETAPES, {
    attributDuLien: "data-run-step", consultables: new Set(["a"])
  });
  assert.match(avecLien, /<button[^>]*data-run-step="a"/);
  // La seconde n'a rien enregistré : elle reste un texte, et le dit au survol.
  assert.doesNotMatch(avecLien, /data-run-step="b"/);
  assert.match(avecLien, /title="Aucun détail n'a été enregistré/);
});

test("un enchaînement vide ne rend rien", () => {
  assert.equal(renderEnchainement([]), "");
  assert.equal(renderEnchainement(null), "");
});

/* ── Une file, ou un arbre ───────────────────────────────────────────────── */

const BRANCHES = [
  { id: "depart", rang: 0, label: "Ce que vous essayez", sorties: ["Localisation du projet"] },
  { id: "neige", rang: 1, label: "Zone de neige" },
  { id: "gel", rang: 1, label: "Profondeur hors gel" },
  { id: "fondations", rang: 2, label: "Fondations" }
];

test("des rangs qui diffèrent dessinent un arbre, et le rang décale la boîte", () => {
  const html = renderEnchainement(BRANCHES, { sens: SENS.VERTICAL });
  assert.match(html, /run-graph__canvas--arbre/);
  assert.match(html, /data-run-graph-rang="0"[^>]*--run-graph-rang:0/);
  assert.match(html, /data-run-graph-rang="2"[^>]*--run-graph-rang:2/);
});

test("dans un arbre, aucun trait ne relie deux boîtes qui se suivent", () => {
  // C'est tout l'objet : la boîte suivante n'est pas forcément la suite de la
  // précédente — la cote hors gel ne découle pas de la zone de neige —, et un
  // trait entre elles dirait exactement le contraire de ce qui s'est passé.
  assert.doesNotMatch(renderEnchainement(BRANCHES, { sens: SENS.VERTICAL }), /run-graph__link/);
});

test("un enchaînement sans rang reste une file, et garde ses liaisons", () => {
  // Le chemin d'une exécution — décision, corpus, lecture, avis — se suit
  // vraiment : c'est une file, et la file est le bon dessin pour lui.
  const html = renderEnchainement(ETAPES, { sens: SENS.VERTICAL });
  assert.doesNotMatch(html, /run-graph__canvas--arbre/);
  assert.equal((html.match(/run-graph__link/g) ?? []).length, 1);
  assert.doesNotMatch(html, /data-run-graph-rang/);
});

test("des étapes toutes du même rang n'ont pas fourché : c'est encore une file", () => {
  const html = renderEnchainement(
    BRANCHES.map((etape) => ({ ...etape, rang: 1 })), { sens: SENS.VERTICAL }
  );
  assert.doesNotMatch(html, /run-graph__canvas--arbre/);
  assert.equal((html.match(/run-graph__link/g) ?? []).length, 3);
});

test("l'arbre ne se dessine qu'à la verticale, où l'indentation a un sens", () => {
  // À l'horizontale, les boîtes vont de gauche à droite : les décaler vers la
  // droite les mettrait dans le sens de la lecture, pas dans celui de la
  // profondeur, et l'on croirait lire une file plus longue.
  const html = renderEnchainement(BRANCHES);
  assert.doesNotMatch(html, /run-graph__canvas--arbre/);
  assert.equal((html.match(/run-graph__link/g) ?? []).length, 3);
});

test("une étape qui déclare `rang: null` n'est pas rangée au tronc", () => {
  // `Number(null)` vaut 0 : lu sans précaution, un rang absent devenait le rang
  // du tronc, et deux étapes sans rang suffisaient à faire passer une file pour
  // un arbre. Elles n'ont rien déclaré, et le dessin ne leur prête rien.
  const html = renderEnchainement(
    [{ id: "a", label: "Première", rang: null }, { id: "b", label: "Seconde", rang: 2 }],
    { sens: SENS.VERTICAL }
  );
  assert.doesNotMatch(html, /run-graph__canvas--arbre/);
  assert.doesNotMatch(html, /data-run-graph-rang="0"/);
  assert.equal((html.match(/run-graph__link/g) ?? []).length, 1);
});

/* ── Ce qui a tourné ensemble se dessine ensemble ────────────────────────── */

/**
 * **Trois comptes rendus lus de front ne sont pas trois étapes à la suite.**
 *
 * Le chemin les alignait de gauche à droite, chacun avec sa durée : on
 * additionnait de l'œil, et l'on lisait une heure là où le serveur avait mis
 * vingt minutes.
 */
test("deux étapes de la même colonne s'empilent", () => {
  const html = renderEnchainement([
    { id: "a", label: "Un", colonne: 0 },
    { id: "b", label: "Deux", colonne: 0 },
    { id: "c", label: "Trois", colonne: 1 }
  ]);

  assert.match(html, /run-graph__canvas--colonnes/);
  assert.equal((html.match(/run-graph__colonne/g) ?? []).length, 2, "deux colonnes, pas trois");
  // Et un seul trait : il relie les colonnes, pas les boîtes.
  assert.equal((html.match(/run-graph__link/g) ?? []).length, 1);
});

/**
 * **Une file reste une file.** Envelopper chaque boîte d'une colonne d'une
 * seule poserait un étage de balises sur tous les chemins du produit, et la
 * feuille de style aurait deux cas à tenir pour le même dessin.
 */
test("un chemin sans rien de parallèle ne gagne pas de colonnes", () => {
  const html = renderEnchainement([
    { id: "a", label: "Un", colonne: 0 },
    { id: "b", label: "Deux", colonne: 1 }
  ]);

  assert.doesNotMatch(html, /run-graph__canvas--colonnes/);
  assert.doesNotMatch(html, /run-graph__colonne/);
});

/**
 * **Une étape sans colonne ne rejoint pas sa voisine.** Ne pas savoir quand
 * elle a tourné n'autorise pas à l'empiler avec celle d'à côté (règle 5).
 */
test("une étape sans colonne fait colonne seule", () => {
  const html = renderEnchainement([
    { id: "a", label: "Un", colonne: 0 },
    { id: "b", label: "Deux", colonne: 0 },
    { id: "c", label: "Trois" },
    { id: "d", label: "Quatre" }
  ]);

  assert.equal((html.match(/run-graph__colonne/g) ?? []).length, 3);
});

/* ── L'ancrage est sur la boîte ──────────────────────────────────────────── */

/**
 * **Chaque boîte montre par où elle entre et par où elle sort.**
 *
 * Les ancrages étaient aux deux bouts du trait : dans une colonne de trois
 * boîtes, une seule des trois en recevait un, et les deux autres semblaient ne
 * tenir à rien.
 */
test("chaque boîte porte ses deux ancrages", () => {
  const html = renderEnchainement([{ id: "a", label: "Un" }, { id: "b", label: "Deux" }]);

  assert.equal((html.match(/run-graph__port--entree/g) ?? []).length, 2);
  assert.equal((html.match(/run-graph__port--sortie/g) ?? []).length, 2);
  // Décoratifs : un lecteur d'écran n'a rien à en entendre. Quatre ancrages
  // pour deux boîtes, et chacun muet.
  assert.equal((html.match(/run-graph__port[^"]*" aria-hidden="true"/g) ?? []).length, 4);
});
