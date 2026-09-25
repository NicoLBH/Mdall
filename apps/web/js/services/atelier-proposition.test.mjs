import test from "node:test";
import assert from "node:assert/strict";

import {
  cleDAffirmation, etabliRetenu, itemsDeProposition, descriptionDeLaProposition,
  provenanceRetenue, sansDoublonDItems } from "./atelier-proposition.js";

const DEGRE = {
  sujet: "Degré coupe-feu des planchers",
  valeur: "CF 1/2 h",
  nature: "contrainte",
  domaine: "incendie",
  source: "arrêté du 31 janvier 1986 modifié",
  article: "article 6, premier alinéa",
  citation: "…coupe-feu de degré une demi-heure…",
  reference: "planchers",
  atelier: "Incendie — Habitation"
};

test("la clé est le sujet, jamais la valeur", () => {
  // C'est ce qui fait qu'une valeur nouvelle remplace l'ancienne au lieu de
  // coexister avec elle.
  assert.equal(cleDAffirmation(DEGRE), "degre-coupe-feu-des-planchers");
  assert.equal(cleDAffirmation({ ...DEGRE, valeur: "CF 1 h" }), "degre-coupe-feu-des-planchers");
});

test("la portée fait partie de la clé", () => {
  assert.equal(cleDAffirmation({ ...DEGRE, zones: ["Bâtiment B"] }),
    "degre-coupe-feu-des-planchers@batiment-b");
  // Le même découpage écrit dans un autre ordre reste le même découpage.
  assert.equal(cleDAffirmation({ ...DEGRE, zones: ["B", "A"] }),
    cleDAffirmation({ ...DEGRE, zones: ["A", "B"] }));
});

test("un item porte sa nature et son domaine, sans les deviner", () => {
  const [item] = itemsDeProposition([DEGRE]);

  assert.equal(item.itemType, "base-datum");
  assert.equal(item.itemKey, "degre-coupe-feu-des-planchers");
  assert.equal(item.payload.nature, "contrainte");
  assert.equal(item.payload.domain, "incendie");
  assert.equal(item.payload.article, "article 6, premier alinéa");
  assert.equal(item.payload.atelier, "Incendie — Habitation");
});

test("ce qui n'affirme rien n'entre pas dans une proposition", () => {
  assert.deepEqual(itemsDeProposition([{ sujet: "Sans valeur", valeur: "" }]), []);
  assert.deepEqual(itemsDeProposition([{ sujet: "", valeur: "CF 1 h" }]), []);
  assert.deepEqual(itemsDeProposition(null), []);
});

test("une nature absente reste absente : rien ne la devine", () => {
  const [item] = itemsDeProposition([{ sujet: "Zone de neige", valeur: "A1" }]);
  assert.equal(item.payload.nature, null);
  assert.equal(item.payload.domain, null);
});

test("la description se lit avant de signer", () => {
  const texte = descriptionDeLaProposition({
    intro: "Conclusions de l'étude incendie.",
    affirmations: [DEGRE, { ...DEGRE, sujet: "Classement", valeur: "3e famille B", article: "article 3" }],
    source: "arrêté du 31 janvier 1986 modifié"
  });

  assert.match(texte, /Conclusions de l'étude incendie\./);
  assert.match(texte, /- \*\*Degré coupe-feu des planchers\*\* : CF 1\/2 h — article 6, premier alinéa/);
  assert.match(texte, /- \*\*Classement\*\* : 3e famille B — article 3/);
  // Elle dit ce qui n'a pas eu lieu : rien n'est entré en mémoire.
  assert.match(texte, /Rien n'est encore entré dans la mémoire du projet/);
});


test("la provenance voyage avec l'affirmation, son type compris", () => {
  const [item] = itemsDeProposition([{
    sujet: "Profondeur hors gel",
    valeur: "0,935 m",
    provenance: { type: "calcul", quoi: "hors gel (H0 du département = 0,850 m)" },
    statut: "supposé"
  }]);

  assert.deepEqual(item.payload.provenance, { type: "calcul", quoi: "hors gel (H0 du département = 0,850 m)" });
  assert.equal(item.payload.statut, "supposé");
});

test("un type de provenance inventé n'entre pas", () => {
  assert.equal(provenanceRetenue({ type: "oracle", quoi: "une boule de cristal" }), null);
  assert.equal(provenanceRetenue({ type: "texte", quoi: "" }), null);
  assert.equal(provenanceRetenue(null), null);
  assert.deepEqual(provenanceRetenue({ type: "règle", quoi: "Classement du bâtiment" }),
    { type: "règle", quoi: "Classement du bâtiment" });
});

test("un statut inconnu n'entre pas non plus", () => {
  const [item] = itemsDeProposition([{ sujet: "Zone de neige", valeur: "E", statut: "peut-être" }]);
  assert.equal(item.payload.statut, null);
});

test("deux fois le même sujet ne perd pas la proposition entière", () => {
  // La base tient (proposition, type, clé) pour unique et écrit en un seul
  // INSERT … ON CONFLICT : deux lignes de même clé font refuser l'envoi entier,
  // pas seulement la seconde. La proposition s'ouvrait vide, et l'écran disait
  // « Rien à comparer » sans que rien ne dise pourquoi.
  const items = itemsDeProposition([
    { sujet: "Classement du bâtiment", valeur: "3e famille B", nature: "donnee-de-base" },
    { sujet: "Classement du bâtiment", valeur: "3e famille B", nature: "contrainte" },
    { sujet: "Colonne sèche", valeur: "exigée", nature: "contrainte" }
  ]);

  assert.deepEqual(items.map((item) => item.itemKey), ["classement-du-batiment", "colonne-seche"]);
  // La première écriture gagne : c'est celle que l'appelant a mise en tête.
  assert.equal(items[0].payload.nature, "donnee-de-base");
});

test("une règle et la valeur qu'elle produit ne sont pas un doublon", () => {
  // Elles portent le même sujet, et c'est exactement pour cela que la clé d'une
  // règle est préfixée : verser l'une périmerait l'autre.
  const items = itemsDeProposition([
    { sujet: "Colonne sèche", valeur: "exigée", referentiel: true, regle: { conditions: [] } },
    { sujet: "Colonne sèche", valeur: "exigée", nature: "contrainte" }
  ]);

  assert.deepEqual(items.map((item) => item.itemKey), ["regle:colonne-seche", "colonne-seche"]);
});

test("des items déjà construits se dédoublonnent aussi", () => {
  const items = sansDoublonDItems([
    { itemType: "base-datum", itemKey: "a", payload: { value: "1" } },
    { itemType: "base-datum", itemKey: "a", payload: { value: "2" } },
    { itemType: "document", itemKey: "a", payload: {} }
  ]);

  // Le type fait partie de la clé : un document et une affirmation peuvent
  // porter le même nom sans se gêner.
  assert.equal(items.length, 2);
  assert.equal(items[0].payload.value, "1");
});

test("la clé range, le libellé se lit — et l'item porte les deux", () => {
  // « batiment-a » et « Bâtiment A » désignent la même partie de l'ouvrage : la
  // clé compare, le libellé s'affiche. Écrire la clé des deux côtés perdait le
  // libellé pour toujours — rien d'autre ne le porte, et on ne le reconstruit
  // pas : « batiment-a » ne dit pas si l'auteur avait écrit « Bâtiment A ».
  const [item] = itemsDeProposition([{ ...DEGRE, zones: ["Bâtiment A"] }]);

  assert.equal(item.itemKey, "degre-coupe-feu-des-planchers@batiment-a");
  assert.deepEqual(item.payload.zones, ["Bâtiment A"]);
});

test("deux écritures d'une même zone n'en font qu'une", () => {
  // Deux libellés pour une clé donneraient deux portées là où il n'y en a
  // qu'une, et la seconde périmerait la première.
  const [item] = itemsDeProposition([{ ...DEGRE, zones: ["Bâtiment A", "bâtiment a"] }]);
  assert.deepEqual(item.payload.zones, ["Bâtiment A"]);
});

/* ── La marque d'un outil personnel voyage avec la ligne ─────────────────── */

test("la marque de l'établi entre dans la charge, filtrée plutôt que recopiée", () => {
  // Comme la règle, la décision et l'agent : ce qu'on n'a pas déclaré ne
  // voyage pas. Une marque sans identifiant ne retrouve rien, et une marque
  // sans version ne se compare à rien.
  assert.deepEqual(etabliRetenu({ id: "abc", version: "2", nom: "Volets en bois" }),
    { id: "abc", version: "2", nom: "Volets en bois" });

  assert.equal(etabliRetenu(null), null);
  assert.equal(etabliRetenu({ version: "2" }), null);
  assert.equal(etabliRetenu({ id: "abc" }), null);
  // Le nom peut manquer — l'outil a pu être renommé ou retiré — mais il ne
  // s'invente pas.
  assert.deepEqual(etabliRetenu({ id: "abc", version: "2" }), { id: "abc", version: "2", nom: null });
});

test("elle arrive jusqu'à l'item qu'on versera", () => {
  const [item] = itemsDeProposition([{
    sujet: "Couleur du volet", valeur: "violet",
    etabli: { id: "abc", version: "2", nom: "Volets en bois" }
  }]);

  assert.deepEqual(item.payload.etabli, { id: "abc", version: "2", nom: "Volets en bois" });
});

test("une ligne qui ne vient d'aucun outil personnel n'en invente pas un", () => {
  const [item] = itemsDeProposition([{ sujet: "Altitude du site", valeur: "890 m" }]);
  assert.equal(item.payload.etabli, null);
});
