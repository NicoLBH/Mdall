/**
 * Le découpage rendu, confronté au découpage annoncé.
 *
 * **« Le modèle n'obéit pas » est une conjecture, pas un diagnostic.** Deux
 * causes très différentes donnent le même écran vide, et se corrigent à deux
 * endroits opposés. Ces tests portent sur la capacité à les distinguer.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  A_REPRENDRE, DECOUPAGE, PHRASES_DU_DECOUPAGE, decoupageAnnonce,
  decoupageDeLaRestitution, decoupageRendu
} from "./decoupage-de-la-restitution.js";

const UN_CHAPITRE = { chapitres: [{ motif: "Lot XX – ENTREPRISE", niveau: 3 }] };

/* ── Ce qui a été rendu ──────────────────────────────────────────────────── */

test("les titres se comptent par niveau", () => {
  const rendu = decoupageRendu("# Un\n## Deux\n### Trois\n### Trois bis\n#### Quatre\n");

  assert.equal(rendu.titres, 5);
  assert.deepEqual(rendu.parNiveau, [1, 1, 2, 1, 0, 0]);
  // Seuls les trois premiers niveaux découpent : les autres se rangent dessous.
  assert.equal(rendu.titresDecoupants, 4);
});

/** Un `#` collé à son texte est un mot-dièse, pas un titre. */
test("un dièse collé au texte n'est pas un titre", () => {
  assert.equal(decoupageRendu("#chantier et #lot3\n").titres, 0);
});

/**
 * **La ligne de séparation d'un tableau ressemble à un trait.** La compter
 * ferait croire le document découpé par ses tableaux — et sur un compte rendu
 * qui en porte quarante, le chiffre dirait quarante traits pour zéro découpage.
 */
test("la ligne de séparation d'un tableau n'est pas un trait", () => {
  const rendu = decoupageRendu("| a | b |\n|---|---|\n| 1 | 2 |\n| c | d |\n| :--- | ---: |\n");

  assert.equal(rendu.traits, 0);
  assert.equal(rendu.traitsDevantUnTitre, 0);
});

/**
 * **Seul le trait qui précède un titre découpe.** Un trait perdu entre deux
 * paragraphes ne sépare rien, et le compter ferait croire la consigne suivie.
 */
test("seul le trait devant un titre compte comme découpage", () => {
  const rendu = decoupageRendu("---\n\n### Lot 03\n\ntexte\n\n---\n\nautre texte\n");

  assert.equal(rendu.traits, 2);
  assert.equal(rendu.traitsDevantUnTitre, 1);
});

/** Les trois écritures du trait se lisent. */
test("les trois écritures du trait se lisent", () => {
  for (const trait of ["---", "***", "___", "-----"]) {
    assert.equal(decoupageRendu(`${trait}\n\n# Titre\n`).traitsDevantUnTitre, 1, `« ${trait} »`);
  }
});

/* ── Ce qui avait été annoncé ────────────────────────────────────────────── */

test("les chapitres annoncés se comptent, et ceux qui découpent se distinguent", () => {
  const annonce = decoupageAnnonce({
    chapitres: [
      { motif: "Lot XX", niveau: 3 }, { motif: "ARCHITECTES", niveau: 4 },
      { motif: "", niveau: 2 }
    ]
  });

  assert.equal(annonce.chapitres, 2);
  assert.equal(annonce.decoupants, 1);
  assert.deepEqual(decoupageAnnonce(null), { chapitres: 0, decoupants: 0 });
});

/* ── Le diagnostic ───────────────────────────────────────────────────────── */

/**
 * **C'est la moitié du service.** Se tromper de cause coûte un appel et un
 * aller-retour : la première se corrige dans l'échantillon de structure, la
 * seconde dans la consigne de transcription.
 */
test("une structure sans chapitre innocente la transcription", () => {
  const { verdict } = decoupageDeLaRestitution({
    markdown: "Lot 01 – Désamiantage – VALGO\n- Avancement : fait\n",
    structure: { chapitres: [] }
  });

  assert.equal(verdict, DECOUPAGE.RIEN_DEMANDE);
  assert.match(A_REPRENDRE[verdict], /reconnaissance de structure/);
  assert.doesNotMatch(A_REPRENDRE[verdict], /consigne de transcription qu'il faut reprendre/);
});

test("des chapitres annoncés sans titre rendu accusent la transcription", () => {
  const { verdict } = decoupageDeLaRestitution({
    markdown: "Lot 01 – Désamiantage – VALGO\n- Avancement : fait\n",
    structure: UN_CHAPITRE
  });

  assert.equal(verdict, DECOUPAGE.IGNORE);
  assert.match(A_REPRENDRE[verdict], /consigne de transcription/);
});

/** Les titres sans les traits : la moitié de la consigne a passé. */
test("les titres sans les traits se distinguent des deux autres cas", () => {
  const { verdict } = decoupageDeLaRestitution({
    markdown: "### Lot 03\n\ntexte\n", structure: UN_CHAPITRE
  });

  assert.equal(verdict, DECOUPAGE.SANS_TRAIT);
});

test("le découpage tenu se dit tenu", () => {
  const { verdict, rendu } = decoupageDeLaRestitution({
    markdown: "---\n\n### Lot 03\n\ntexte\n\n---\n\n### Lot 04\n", structure: UN_CHAPITRE
  });

  assert.equal(verdict, DECOUPAGE.TENU);
  assert.equal(rendu.traitsDevantUnTitre, 2);
  assert.equal(A_REPRENDRE[verdict], "");
});

/**
 * **Ne pas savoir n'autorise pas à accuser** (règle 5). Sans squelette, on ne
 * peut pas dire que le modèle a désobéi : on ne sait pas ce qu'on lui a demandé.
 */
test("sans squelette, aucun verdict n'est rendu", () => {
  for (const entree of [
    { markdown: "### Lot 03", structure: null },
    { markdown: "", structure: UN_CHAPITRE },
    {}
  ]) {
    assert.equal(decoupageDeLaRestitution(entree).verdict, DECOUPAGE.INCONNU);
  }
});

/** Un document dont tous les chapitres sont profonds n'attend pas de trait. */
test("des chapitres trop profonds ne font pas reprocher un trait manquant", () => {
  const { verdict } = decoupageDeLaRestitution({
    markdown: "#### ARCHITECTES\n\ntexte\n",
    structure: { chapitres: [{ motif: "ARCHITECTES", niveau: 4 }] }
  });

  assert.equal(verdict, DECOUPAGE.TENU);
});

test("chaque verdict a sa phrase, et elles diffèrent", () => {
  const dites = Object.values(DECOUPAGE).map((verdict) => PHRASES_DU_DECOUPAGE[verdict]);

  assert.equal(dites.filter(Boolean).length, Object.values(DECOUPAGE).length);
  assert.equal(new Set(dites).size, dites.length);
  // Et chacun dit ce qu'il faut reprendre, ou rien quand il n'y a rien à reprendre.
  for (const verdict of Object.values(DECOUPAGE)) {
    assert.equal(typeof A_REPRENDRE[verdict], "string", `« ${verdict} » ne dit pas quoi reprendre`);
  }
});
