/**
 * Le graphique, de bout en bout : suggéré, choisi, dessiné.
 *
 * **Ce fichier éprouve le câblage.** Un service qui sait faire des séries et un
 * écran qui ne les lui demande pas ne cassent rien : ils rendent un tableau de
 * chiffres devant un bouton qui ne fait rien.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { lireUnFichier } from "./memoire-en-lecture.js";
import { blocDeRegle, texteDesLignes } from "./memoire-en-texte.js";
import { lancerLeBrouillon } from "./bac-dessai.js";
import { LECTURE } from "./graphique-dune-table.js";
import {
  MARQUE_DE_LA_LECTURE, brancherLesLectures,
  renderGraphiqueDuTableau, renderLecturesDuTableau, renderResultats
} from "../views/studio/dev/ecrire-en-mdall.js";

const SOURCE = [
  "fonction Descente de charge(zones, Charge par niveau) {",
  "   // Ce qui arrive en pied de poteau, niveau par niveau.",
  "   se lit en: barres",
  "",
  "   pour chaque Niveau de 1 à 4 par pas de 1",
  "      calcule Charge cumulée = Charge par niveau * Niveau;",
  "",
  "   calcule Charge en pied = le plus grand de Charge cumulée;",
  "   si (Charge en pied > 0 kN)",
  "   alors (Charge en pied);",
  "}",
  ""
].join("\n");

const FICHIERS = [{ nom: "essai.ref", contenu: SOURCE }];
const REPONSES = { "Charge par niveau": "12 kN" };
const lance = (source = SOURCE) => lancerLeBrouillon([{ nom: "essai.ref", contenu: source }], REPONSES)[0];

/* ── Ce que la fonction suggère ──────────────────────────────────────────── */

test("`se lit en:` se range sur la fonction, et ne dessine rien", () => {
  /**
   * **C'est tout le parti pris** : un graphique n'est pas une construction du
   * langage, c'est une façon de regarder un tableau. Cette ligne dit seulement
   * laquelle s'ouvre en premier.
   */
  const lu = lireUnFichier(SOURCE);
  assert.deepEqual(lu.refus, []);
  assert.equal(lu.blocs[0].seLitEn, "barres");

  // Et la fonction reste ce qu'elle est : sa boucle, ses agrégats, sa condition.
  assert.equal(lu.blocs[0].boucle.nom, "Niveau");
  assert.equal(lu.blocs[0].calculs[0].agregat.colonne, "Charge cumulée");
});

test("un mot qu'on n'a pas prévu se refuse en montrant ceux qui existent", () => {
  const lu = lireUnFichier(SOURCE.replace("se lit en: barres", "se lit en: camembert"));
  assert.equal(lu.refus.length, 1);
  assert.match(lu.refus[0].raison, /« tableau », « courbe », « barres »/);
});

test("la suggestion voyage jusqu'au bac, et jusqu'à l'écran", () => {
  /**
   * **Le câblage, et il est invisible s'il casse.** La lecture range bien la
   * suggestion ; si le bac ne la transporte pas, l'écran ouvre le tableau et
   * personne ne sait que la fonction disait autre chose.
   */
  assert.equal(lance().seLitEn, "barres");

  const html = renderResultats([lance()]);
  assert.match(html, new RegExp(`${MARQUE_DE_LA_LECTURE}="barres"[^>]*aria-pressed="true"`));
  assert.match(html, new RegExp(`${MARQUE_DE_LA_LECTURE}="tableau"[^>]*aria-pressed="false"`));
});

test("sans suggestion, c'est le tableau qui s'ouvre", () => {
  // C'est lui qui se compare au texte d'origine, et c'est la vérification. Un
  // dessin qui s'ouvrirait tout seul ferait croire qu'on a vérifié parce qu'on
  // a regardé.
  const html = renderResultats([lance(SOURCE.replace("   se lit en: barres\n", ""))]);
  assert.match(html, new RegExp(`${MARQUE_DE_LA_LECTURE}="tableau"[^>]*aria-pressed="true"`));
  assert.match(html, /<table class="bac-tableau"/);
  assert.doesNotMatch(html, /class="graphique"/);
});

/* ── Ce qu'on choisit à la lecture ───────────────────────────────────────── */

test("les trois lectures s'offrent, et une seule est pressée", () => {
  const html = renderLecturesDuTableau(lance(), LECTURE.COURBE);

  for (const une of Object.values(LECTURE)) {
    assert.match(html, new RegExp(`${MARQUE_DE_LA_LECTURE}="${une}"`), `lecture absente : ${une}`);
  }
  assert.equal((html.match(/est-actif/g) ?? []).length, 1);
  // Le bouton porte le sujet : c'est lui qui dit de quel tableau on parle quand
  // plusieurs fonctions en portent un.
  assert.match(html, /data-bac-sujet="Descente de charge"/);
});

test("un tableau qu'on ne peut pas dessiner n'offre aucun bouton", () => {
  // Un bouton qui ouvre un cadre vide apprend à ne plus cliquer sur les
  // boutons.
  const sansBoucle = lancerLeBrouillon(
    [{ nom: "e.ref", contenu: "fonction F(zones, A) {\n   si (A > 0)\n   alors (A);\n}\n" }],
    { A: "1" }
  )[0];
  assert.equal(renderLecturesDuTableau(sansBoucle, LECTURE.TABLEAU), "");
});

/* ── Ce que l'écran dessine ──────────────────────────────────────────────── */

test("la courbe trace une ligne par colonne, et les nomme", () => {
  const tableau = lance().tableau;
  const dessin = renderGraphiqueDuTableau(tableau, LECTURE.COURBE);

  assert.match(dessin, /class="graphique"/);
  assert.equal((dessin.match(/<path /g) ?? []).length, 1);
  // Quatre niveaux, quatre points.
  assert.equal((dessin.match(/<circle /g) ?? []).length, 4);
  // Les bornes de l'abscisse, sous le dessin.
  assert.match(dessin, /<span>1<\/span>\s*<span>4<\/span>/);
});

test("les barres partent de zéro, et la plus petite se voit", () => {
  /**
   * **C'est la faute classique du graphique.** 12 kN sur une échelle qui
   * commence à 12 se dessine d'une hauteur nulle : la première barre disparaît,
   * et l'on lit un rapport de l'infini pour un.
   */
  const dessin = renderGraphiqueDuTableau(lance().tableau, LECTURE.BARRES);
  const hauteurs = [...dessin.matchAll(/<rect[^>]*height="(\d+)"/g)].map(([, un]) => Number(un));

  assert.equal(hauteurs.length, 4);
  assert.ok(hauteurs[0] > 0, "la première barre a disparu");
  // 12, 24, 36, 48 : la dernière fait quatre fois la première.
  assert.ok(Math.abs(hauteurs[3] / hauteurs[0] - 4) < 0.15,
    `le rapport des barres est faux : ${hauteurs.join(", ")}`);
});

test("une lecture qui n'est pas un dessin ne dessine rien", () => {
  assert.equal(renderGraphiqueDuTableau(lance().tableau, LECTURE.TABLEAU), "");
  assert.equal(renderGraphiqueDuTableau(null, LECTURE.COURBE), "");
});

test("le dessin remplace le tableau, il ne s'y ajoute pas", () => {
  /**
   * **Les deux ensemble feraient deux lectures du même fait**, et l'on
   * lirait celle du haut. Le bouton dit qu'on choisit ; montrer les deux
   * dirait qu'on ne choisit pas.
   */
  const enBarres = renderResultats([lance()]);
  assert.match(enBarres, /class="graphique"/);
  assert.doesNotMatch(enBarres, /<table class="bac-tableau"/);
});

test("les colonnes écartées se disent sous le dessin", () => {
  // Les taire ferait un dessin qui a l'air complet : on compterait une courbe
  // là où le tableau a deux colonnes, sans qu'un mot dise laquelle manque.
  const melange = SOURCE.replace(
    "      calcule Charge cumulée = Charge par niveau * Niveau;",
    "      calcule Charge cumulée = Charge par niveau * Niveau;\n      calcule Rang = Niveau * 1 m;"
  );
  const dessin = renderGraphiqueDuTableau(lance(melange).tableau, LECTURE.COURBE);
  assert.match(dessin, /« Rang » n&#39;est pas dessinée/);
});

test("deux séries prennent deux teintes, et le dessin le dit sous lui", () => {
  /**
   * **Deux courbes de la même couleur ne se lisent pas.** La légende nomme les
   * séries, et la teinte les relie au dessin : sans l'une des deux, on compte
   * les lignes sans savoir laquelle est laquelle.
   */
  const deux = SOURCE.replace(
    "      calcule Charge cumulée = Charge par niveau * Niveau;",
    "      calcule Charge cumulée = Charge par niveau * Niveau;\n      calcule Moitié = Charge cumulée / 2;"
  );
  const dessin = renderGraphiqueDuTableau(lance(deux).tableau, LECTURE.COURBE);

  const teintes = [...dessin.matchAll(/graphique__ligne--(\w+)/g)].map(([, une]) => une);
  assert.equal(teintes.length, 2);
  assert.notEqual(teintes[0], teintes[1], "les deux courbes ont la même teinte");

  // Et la légende les nomme, avec la même teinte que leur trait.
  assert.match(dessin, /graphique__nom--une[^>]*>Charge cumulée</);
  assert.match(dessin, /graphique__nom--deux[^>]*>Moitié</);
});

test("une seule écoute sur le bac, et elle survit au redessin du panneau", () => {
  /**
   * **Les boutons vivent dans le panneau des résultats**, et ce panneau est
   * remplacé à chaque frappe du formulaire. Des écoutes posées sur eux
   * partiraient avec lui, et le second clic ne ferait rien — le pire des
   * défauts, parce qu'on croit avoir mal visé et qu'on reclique.
   *
   * Une écoute posée **une fois sur le bac** n'a rien à se rappeler : le
   * panneau peut être remplacé autant de fois qu'on veut.
   */
  const choisis = [];
  const ecoutes = [];
  const hote = { addEventListener: (type, quoi) => ecoutes.push({ type, quoi }) };

  brancherLesLectures(hote, (sujet, lecture) => choisis.push([sujet, lecture]));
  assert.equal(ecoutes.length, 1, "l'écoute ne se pose pas une seule fois");

  const cliquer = (bouton) => ecoutes[0].quoi({ target: { closest: () => bouton } });
  for (const lecture of Object.values(LECTURE)) {
    cliquer({
      dataset: { bacSujet: "Descente de charge" },
      getAttribute: (quoi) => (quoi === MARQUE_DE_LA_LECTURE ? lecture : null)
    });
  }

  assert.deepEqual(choisis, Object.values(LECTURE).map((une) => ["Descente de charge", une]));

  // Un clic à côté d'un bouton ne choisit rien.
  cliquer(null);
  assert.equal(choisis.length, Object.values(LECTURE).length);

  // Sans rien à écouter, rien ne tombe : le bac peut ne pas être là.
  brancherLesLectures(null, () => { throw new Error("rien à brancher"); });
  brancherLesLectures({}, () => { throw new Error("rien à brancher"); });
});

test("le bac pose bien cette écoute, et pas seulement la fonction qui sait la poser", async () => {
  /**
   * **Cette épreuve relit le source, et c'est l'exception qui le justifie.**
   *
   * Une écoute déléguée parfaitement écrite, et que personne n'appelle, rend un
   * écran où tout se dessine : les trois boutons sont là, l'un est pressé, les
   * intitulés sont justes. Seul le clic ne fait rien. Aucune épreuve de rendu ne
   * peut voir cela — un rendu ne clique pas —, et l'épreuve d'au-dessus ne voit
   * que la fonction qu'on lui donne.
   */
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const source = readFileSync(
    fileURLToPath(new URL("../views/studio/dev/ecrire-en-mdall.js", import.meta.url)), "utf8");

  const debut = source.indexOf("function brancherLeBac(hote, racine) {");
  assert.ok(debut > 0, "brancherLeBac est introuvable");
  const corps = source.slice(debut, source.indexOf("\n}\n", debut));

  assert.match(corps, /brancherLesLectures\(hote, choisirLaLecture\);/,
    "les boutons de lecture ne sont écoutés par personne : le clic ne ferait rien");
});

/* ── Aller et retour ─────────────────────────────────────────────────────── */

test("`se lit en:` se réécrit, et se relit à l'identique", () => {
  // Une règle versée se relit dans l'écran des fichiers : perdre la suggestion
  // ferait rouvrir un tableau de chiffres là où l'auteur avait dit « en barres ».
  const un = lireUnFichier(SOURCE).blocs[0];
  const ecrit = texteDesLignes(blocDeRegle({
    sujet: un.sujet, conditions: un.conditions, alors: un.alors,
    calculs: un.calculs, boucle: un.boucle, seLitEn: un.seLitEn
  }));

  assert.match(ecrit, /^ {3}se lit en: barres$/m);
  assert.equal(lireUnFichier(ecrit).blocs[0].seLitEn, "barres");
});
