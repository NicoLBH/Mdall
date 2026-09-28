/**
 * Ce qu'une fonction versée garde, et ce que la mémoire en refait.
 *
 * **Ce fichier éprouve un aller-retour, et c'est le seul moyen de le voir.**
 * Une fonction écrite au bac, versée, puis relue à l'écran des fichiers passe
 * par trois modules qui ne se connaissent pas. Chacun se tient très bien tout
 * seul ; c'est entre eux que le raisonnement se perd, et il se perd en silence
 * — la condition reste juste, le `alors` reste juste, et les quinze lignes qui
 * les produisent ont disparu.
 *
 * Les fonctions viennent donc de **vrai Mdall lu**, jamais d'objets façonnés
 * ici : une charge écrite à la main porterait les hypothèses du code pour des
 * faits.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { lireUnFichier } from "./memoire-en-lecture.js";
import { blocDeRegle, texteDesLignes } from "./memoire-en-texte.js";
import { aProposerDuBrouillon } from "./proposition-du-brouillon.js";
import { tableauxDUneRegle } from "./memoire-rejeu.js";
import { LECTURE } from "./graphique-dune-table.js";
import { preparerLaMemoire, renderFichier, renderRejeuDesFonctions } from "../views/project-memoire-fichiers.js";

const DESCENTE = `fonction Descente de charge(zones, Charge par niveau) {
   // Ce qui arrive en pied de poteau, niveau par niveau.
   se lit en: barres

   pour chaque Niveau de 1 à 4 par pas de 1
      calcule Charge cumulée = Charge par niveau * Niveau;

   calcule Charge en pied = le plus grand de Charge cumulée;
   si (Charge en pied > 0 kN)
   alors (Charge en pied);
}
`;

/** Ce qu'une proposition verserait, pour ce brouillon. */
const versee = (source = DESCENTE) =>
  aProposerDuBrouillon([{ nom: "essai.ref", contenu: source }]).affirmations[0];

/** Une affirmation du projet, telle que la mémoire la porte. */
const dit = (sujet, valeur, { zones = null } = {}) => ({
  id: `a-${sujet}${zones ? `@${zones.join("+")}` : ""}`,
  subject_key: sujet, status: "assumed", superseded_by: null, zones,
  payload: { subject: sujet, value: valeur, ...(zones ? { zones } : {}) }
});

/** La règle telle que la mémoire la porte, une fois versée. */
const regleVersee = (source = DESCENTE, { zones = null } = {}) => {
  const payload = versee(source);
  return {
    id: "r-descente", subject_key: `regle:${payload.sujet}`,
    status: "assumed", superseded_by: null, zones,
    payload: { ...payload, subject: payload.sujet, value: payload.valeur, ...(zones ? { zones } : {}) }
  };
};

/* ── Ce que le versement emporte ─────────────────────────────────────────── */

test("une fonction versée garde sa boucle, ses calculs et sa suggestion", () => {
  /**
   * **Le défaut était muet des deux côtés.** L'écran des fichiers sait réécrire
   * une boucle, ses agrégats et un `se lit en:` — il lisait des champs que rien
   * n'écrivait jamais. Une fonction versée y paraissait **plus simple qu'elle
   * n'est**, et la mémoire ne pouvait plus rejouer ce qu'elle tient, puisqu'elle
   * ne le tenait plus.
   */
  const payload = versee();

  assert.equal(payload.regle.boucle?.nom, "Niveau");
  assert.equal(payload.regle.boucle?.calculs?.length, 1);
  assert.equal(payload.regle.calculs?.length, 1);
  assert.equal(payload.regle.calculs[0].agregat?.colonne, "Charge cumulée");
  assert.equal(payload.regle.seLitEn, "barres");
});

test("un barème versé garde la forme sous laquelle il a été écrit", () => {
  /**
   * **Ses lignes voyageaient déjà** — un barème se lit en branches, et les
   * branches étaient portées. Ce qui manquait est la **forme** : versé sans son
   * `selon`, il se réécrivait en une chaîne de `si / sinon si`, et l'on perdait
   * exactement ce pour quoi cette écriture existe — une loi qui est un tableau
   * se relit comme un tableau, ligne à ligne contre le texte d'origine.
   */
  const BAREME = `fonction Taux(zones, Type) {
   selon (Type)
   | normal | 20% |
   | réduit | 10% |
}
`;
  const payload = versee(BAREME);

  assert.deepEqual(payload.regle.selon, ["Type"]);
  // Les lignes, elles, sont bien là : la première en condition, les autres en
  // branches.
  assert.deepEqual(payload.regle.conditions[0].valeur, ["normal"]);
  assert.deepEqual(payload.regle.sinonSi[0].conditions[0].valeur, ["réduit"]);

  // Et réécrit, c'est de nouveau un barème, pas une cascade de « si ».
  const ecrit = texteDesLignes(blocDeRegle({
    sujet: payload.sujet, conditions: payload.regle.conditions, alors: payload.valeur,
    sinonSi: payload.regle.sinonSi, selon: payload.regle.selon
  }));
  assert.match(ecrit, /selon \(Type\)/);
  assert.match(ecrit, /\| normal \|/);
  assert.doesNotMatch(ecrit, /sinon si/);
});

test("ce qu'on n'a pas écrit ne s'écrit pas dans la mémoire", () => {
  // Une fonction sans boucle ne doit pas porter un champ vide : la mémoire
  // dirait qu'elle en a une, et l'écran chercherait un tableau qui n'existe pas.
  const payload = versee(`fonction Prix TTC(zones, Prix HT) {
   calcule TVA = Prix HT * 20%;
   si (TVA > 0 €)
   alors (TVA);
}
`);

  assert.ok(!("boucle" in payload.regle), "une fonction sans boucle en déclare une");
  assert.ok(!("seLitEn" in payload.regle), "une fonction sans suggestion en déclare une");
  assert.ok(!("selon" in payload.regle));
  assert.equal(payload.regle.calculs.length, 1);
});

test("écrite, versée, puis réécrite, c'est la même fonction", () => {
  /**
   * **C'est l'aller-retour entier**, et c'est lui qui compte : le versement et
   * la réécriture sont deux modules qui ne se connaissent pas, et il suffit
   * qu'un champ manque à l'un des deux pour qu'une ligne disparaisse sans que
   * rien ne le dise.
   */
  const payload = versee();
  const ecrit = texteDesLignes(blocDeRegle({
    sujet: payload.sujet, conditions: payload.regle.conditions, alors: payload.valeur,
    calculs: payload.regle.calculs, boucle: payload.regle.boucle, seLitEn: payload.regle.seLitEn
  }));

  const relu = lireUnFichier(ecrit).blocs[0];
  assert.equal(relu.boucle?.nom, "Niveau");
  assert.equal(relu.seLitEn, "barres");
  assert.equal(relu.calculs[0].agregat?.colonne, "Charge cumulée");
  assert.match(ecrit, /pour chaque Niveau de 1 à 4 par pas de 1/);
});

/* ── Ce que la mémoire en refait ─────────────────────────────────────────── */

test("une fonction versée se déroule sur ce que le projet tient", () => {
  const memoire = [regleVersee(), dit("Charge par niveau", "12 kN")];
  const rejeux = tableauxDUneRegle(regleVersee(), memoire);

  assert.equal(rejeux.length, 1);
  assert.equal(rejeux[0].zone, "", "« partout » est une portée, pas une absence");
  assert.equal(rejeux[0].tableau.lignes.length, 4);
  assert.deepEqual(rejeux[0].tableau.lignes.map((une) => une.cases[0].valeur),
    ["12 kN", "24 kN", "36 kN", "48 kN"]);
});

test("chaque zone déroule son propre tableau", () => {
  /**
   * **Une variable n'a pas une valeur, elle en a une par partie d'ouvrage.** Ne
   * montrer que le premier tableau ferait lire la descente de charge d'un
   * bâtiment sous le nom de l'autre.
   */
  const regle = regleVersee(DESCENTE, { zones: ["batiment-a", "batiment-b"] });
  const memoire = [
    regle,
    dit("Charge par niveau", "12 kN", { zones: ["batiment-a"] }),
    dit("Charge par niveau", "20 kN", { zones: ["batiment-b"] })
  ];

  const rejeux = tableauxDUneRegle(regle, memoire);
  assert.deepEqual(rejeux.map((un) => un.zone), ["batiment-a", "batiment-b"]);
  assert.deepEqual(rejeux.map((un) => un.tableau.lignes[0].cases[0].valeur), ["12 kN", "20 kN"]);
});

test("une zone dont les entrées ne sont pas versées dit ce qui manque", () => {
  // Rendre un tableau vide ferait lire « cette fonction ne produit rien » là où
  // la vérité est « le projet ne sait pas encore » (règle 5).
  const rejeux = tableauxDUneRegle(regleVersee(), [regleVersee()]);

  assert.equal(rejeux.length, 1);
  assert.deepEqual(rejeux[0].manquants, ["Charge par niveau"]);

  /**
   * **La boucle a tourné quand même**, et chaque ligne porte sa case vide :
   * ses bornes sont écrites dans la fonction, pas dans la mémoire. C'est
   * l'écran qui décide de ne pas montrer quatre lignes de tirets — elles se
   * liraient comme « cette fonction ne produit rien ».
   */
  assert.equal(rejeux[0].tableau.lignes.length, 4);
  assert.ok(rejeux[0].tableau.lignes.every((une) => une.cases.every((quoi) => !quoi.connu)));
});

test("une fonction sans boucle n'a rien à dérouler, et ne fait rien tomber", () => {
  const sansBoucle = regleVersee(`fonction Prix TTC(zones, Prix HT) {
   calcule TVA = Prix HT * 20%;
   si (TVA > 0 €)
   alors (TVA);
}
`);
  assert.deepEqual(tableauxDUneRegle(sansBoucle, [sansBoucle]), []);
  assert.deepEqual(tableauxDUneRegle(null, []), []);
  assert.deepEqual(tableauxDUneRegle({ payload: {} }, []), []);

  /**
   * **Une mémoire vide ne supprime pas la boucle**, et c'est juste : ses bornes
   * sont écrites dans la fonction. Elle déroule donc ses quatre lignes, toutes
   * vides, et c'est `manquants` qui dit pourquoi — jamais un tableau absent.
   */
  const orpheline = tableauxDUneRegle(regleVersee(), []);
  assert.equal(orpheline.length, 1);
  assert.equal(orpheline[0].tableau.lignes.length, 4);
  assert.deepEqual(orpheline[0].manquants, ["Charge par niveau"]);
});

/* ── Ce que l'écran en montre ────────────────────────────────────────────── */

/** Le fichier de la mémoire qui porte la fonction. */
const fichierDe = (memoire) => preparerLaMemoire(memoire).fichiers
  .find((un) => (un.lignes ?? []).some((ligne) => ligne?.payload?.regle?.boucle));

test("l'écran des fichiers déroule la fonction, et suit la lecture qu'elle suggère", () => {
  /**
   * **C'est le câblage, et il est invisible s'il casse.** Un service qui sait
   * dérouler et un écran qui ne le lui demande pas ne cassent rien : ils
   * rendent quinze lignes de grammaire, exactement comme avant.
   */
  const memoire = [regleVersee(), dit("Charge par niveau", "12 kN")];
  const fichier = fichierDe(memoire);
  assert.ok(fichier, "la fonction versée ne se range dans aucun fichier");

  const html = renderRejeuDesFonctions(fichier, memoire);
  assert.match(html, /Descente de charge/);

  // « se lit en: barres » : un dessin, et non quarante-cinq lignes de chiffres.
  assert.match(html, /class="graphique"/);
  assert.match(html, /<rect /);
  assert.doesNotMatch(html, /<table class="bac-tableau"/);
});

test("sans suggestion, ce sont les lignes qui paraissent", () => {
  // C'est le tableau qui se compare au texte d'origine, et c'est la
  // vérification : un dessin qui s'ouvrirait tout seul ferait croire qu'on a
  // vérifié parce qu'on a regardé.
  const nu = regleVersee(DESCENTE.replace("   se lit en: barres\n", ""));
  const memoire = [nu, dit("Charge par niveau", "12 kN")];

  const html = renderRejeuDesFonctions(fichierDe(memoire), memoire);
  assert.match(html, /<table class="bac-tableau"/);
  assert.match(html, /48 kN/);
  assert.doesNotMatch(html, /class="graphique"/);
});

test("le fichier porte le tableau sous son texte, et jamais à sa place", () => {
  /**
   * **Le fichier est ce qui est versé ; le tableau est ce qu'il produit.** Les
   * intervertir ferait lire un résultat avant la règle qui le produit — et
   * c'est le texte qui se signe, pas le tableau.
   */
  const memoire = [regleVersee(), dit("Charge par niveau", "12 kN")];
  const html = renderFichier(fichierDe(memoire), { assertions: memoire });

  assert.match(html, /memoire-rejeu/);
  assert.ok(html.indexOf("memoire-fichier__corps") < html.indexOf("memoire-rejeu"),
    "le tableau passe devant le texte de la fonction");

  // Et le texte réécrit porte bien la boucle : c'est ce qu'on relit et qu'on
  // signe. Un écran qui dessinerait un tableau sans montrer la boucle qui le
  // produit ferait croire un résultat sur parole.
  assert.match(html, /pour chaque/);
});

test("sans la mémoire, le fichier se lit comme avant et ne ment pas", () => {
  // Les entrées d'une fonction vivent dans d'autres fichiers que celui qu'on
  // regarde : sans elles on ne déroule rien, et l'on n'annonce rien.
  const memoire = [regleVersee(), dit("Charge par niveau", "12 kN")];
  const html = renderFichier(fichierDe(memoire), {});

  assert.doesNotMatch(html, /memoire-rejeu/);
  assert.match(html, /pour chaque/);
});

test("une fonction qu'on ne peut pas dérouler le dit plutôt que de se taire", () => {
  const memoire = [regleVersee()];
  const html = renderRejeuDesFonctions(fichierDe(memoire), memoire);

  assert.match(html, /Rien à dérouler/);
  assert.match(html, /« Charge par niveau »/);
});

test("l'écran des fichiers reçoit bien la mémoire entière", async () => {
  /**
   * **Cette épreuve relit le source, et c'est l'exception qui le justifie.**
   *
   * Le panneau peut être parfaitement écrit et n'être jamais nourri : le
   * fichier se rendrait alors exactement comme avant, sans un mot. Aucune
   * épreuve de rendu ne peut voir cela — un rendu qu'on appelle soi-même
   * reçoit ce qu'on lui donne.
   */
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const source = readFileSync(
    fileURLToPath(new URL("../views/project-documents.js", import.meta.url)), "utf8");

  assert.match(source, /assertions: docsViewState\.memoireAssertions \?\? \[\]/,
    "l'écran des fichiers ne reçoit pas la mémoire : il ne déroulerait rien");
});
