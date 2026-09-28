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
  MARQUE_DE_LABSCISSE, MARQUE_DE_LA_LECTURE, brancherLesLectures,
  renderGraphiqueDuTableau, renderLecturesDuTableau, renderResultats
} from "../views/studio/dev/ecrire-en-mdall.js";

/** Ce que l'écran retient d'un choix : une lecture, et l'abscisse d'un nuage. */
const vu = (lecture, abscisse = "") => ({ lecture, abscisse });

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

test("les lectures s'offrent, et une seule est pressée", () => {
  const html = renderLecturesDuTableau(lance(), vu(LECTURE.COURBE));

  for (const une of [LECTURE.TABLEAU, LECTURE.COURBE, LECTURE.BARRES]) {
    assert.match(html, new RegExp(`${MARQUE_DE_LA_LECTURE}="${une}"`), `lecture absente : ${une}`);
  }
  assert.equal((html.match(/est-actif/g) ?? []).length, 1);
  // Le bouton porte le sujet : c'est lui qui dit de quel tableau on parle quand
  // plusieurs fonctions en portent un.
  assert.match(html, /data-bac-sujet="Descente de charge"/);
});

test("la question du nuage ne s'ouvre qu'une fois le nuage choisi", () => {
  /**
   * **C'est la seule lecture qui en pose une**, parce que c'est la seule dont
   * l'abscisse n'est pas écrite dans la fonction. La poser d'avance
   * encombrerait les trois autres d'un choix qu'elles ne font pas.
   */
  const deux = lance(SOURCE.replace(
    "      calcule Charge cumulée = Charge par niveau * Niveau;",
    "      calcule Charge cumulée = Charge par niveau * Niveau;\n      calcule Moitié = Charge cumulée / 2;"
  ));

  const enCourbe = renderLecturesDuTableau(deux, vu(LECTURE.COURBE));
  assert.match(enCourbe, new RegExp(`${MARQUE_DE_LA_LECTURE}="${LECTURE.NUAGE}"`), "le nuage ne s'offre pas");
  assert.doesNotMatch(enCourbe, new RegExp(MARQUE_DE_LABSCISSE));

  const enNuage = renderLecturesDuTableau(deux, vu(LECTURE.NUAGE, "Moitié"));
  assert.match(enNuage, new RegExp(`${MARQUE_DE_LABSCISSE}="Moitié"[^>]*aria-pressed="true"`));
  assert.match(enNuage, new RegExp(`${MARQUE_DE_LABSCISSE}="Charge cumulée"[^>]*aria-pressed="false"`));
  assert.match(enNuage, /contre/);
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
  const dessin = renderGraphiqueDuTableau(tableau, vu(LECTURE.COURBE));

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
  const dessin = renderGraphiqueDuTableau(lance().tableau, vu(LECTURE.BARRES));
  const hauteurs = [...dessin.matchAll(/<rect[^>]*height="(\d+)"/g)].map(([, un]) => Number(un));

  assert.equal(hauteurs.length, 4);
  assert.ok(hauteurs[0] > 0, "la première barre a disparu");
  // 12, 24, 36, 48 : la dernière fait quatre fois la première.
  assert.ok(Math.abs(hauteurs[3] / hauteurs[0] - 4) < 0.15,
    `le rapport des barres est faux : ${hauteurs.join(", ")}`);
});

test("une lecture qui n'est pas un dessin ne dessine rien", () => {
  assert.equal(renderGraphiqueDuTableau(lance().tableau, vu(LECTURE.TABLEAU)), "");
  assert.equal(renderGraphiqueDuTableau(null, vu(LECTURE.COURBE)), "");
  assert.equal(renderGraphiqueDuTableau(lance().tableau, null), "");
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

test("deux grandeurs font deux cadres empilés, et l'écran dit pourquoi", () => {
  /**
   * **Jusqu'ici la seconde colonne disparaissait du dessin.** Les mettre sur
   * une grille les ferait se croiser là où elles ne se croisent pas ; un second
   * axe à droite reviendrait au même, en plus discret. Empilées, elles ne se
   * croisent jamais, et ce qu'on compare est la forme à la même abscisse.
   */
  const melange = SOURCE.replace(
    "      calcule Charge cumulée = Charge par niveau * Niveau;",
    "      calcule Charge cumulée = Charge par niveau * Niveau;\n      calcule Hauteur atteinte = Niveau * 1 m;"
  );
  const dessin = renderGraphiqueDuTableau(lance(melange).tableau, vu(LECTURE.COURBE));

  assert.equal((dessin.match(/<figure class="graphique">/g) ?? []).length, 2);

  /**
   * **Chaque cadre nomme sa colonne, et pas seulement sa grandeur.** La légende
   * ne paraît qu'à partir de deux séries, si bien qu'un cadre solitaire
   * n'aurait annoncé que « une force » — deux dessins empilés sans qu'on sache
   * laquelle des colonnes du tableau chacun montre.
   */
  assert.match(dessin, /Charge cumulée · une force/);
  assert.match(dessin, /Hauteur atteinte · une longueur/);
  assert.match(dessin, /un cadre par grandeur, la même abscisse pour tous/);

  // Les bornes de l'abscisse se disent **une fois**, sous le dernier cadre :
  // les répéter ferait croire que chaque cadre a la sienne.
  assert.equal((dessin.match(/graphique__bornes/g) ?? []).length, 1);
});

test("une colonne que rien n'a su calculer se dit sous le dessin", () => {
  // Les taire ferait un dessin qui a l'air complet : on compterait une courbe
  // là où le tableau a deux colonnes, sans qu'un mot dise laquelle manque.
  const muette = SOURCE.replace(
    "      calcule Charge cumulée = Charge par niveau * Niveau;",
    "      calcule Charge cumulée = Charge par niveau * Niveau;\n      calcule Introuvable = Niveau * Portée;"
  );
  const dessin = renderGraphiqueDuTableau(lance(muette).tableau, vu(LECTURE.COURBE));
  assert.match(dessin, /« Introuvable » n&#39;est pas dessinée/);
  assert.equal((dessin.match(/<figure class="graphique">/g) ?? []).length, 1);
});

test("un nuage dessine des points sans les relier, et l'écran le montre", () => {
  /**
   * **Le trait est justement ce qu'on retire.** Une ligne brisée dit un ordre ;
   * un nuage répond à une autre question — qu'est-ce qui va avec quoi. Le
   * relier ferait lire une progression là où l'on regarde une forme.
   */
  const deux = lance(SOURCE.replace(
    "      calcule Charge cumulée = Charge par niveau * Niveau;",
    "      calcule Charge cumulée = Charge par niveau * Niveau;\n      calcule Moitié = Charge cumulée / 2;"
  ));

  const dessin = renderGraphiqueDuTableau(deux.tableau, vu(LECTURE.NUAGE, "Charge cumulée"));
  assert.match(dessin, /class="graphique"/);
  assert.equal((dessin.match(/<path /g) ?? []).length, 0, "un nuage relie ses points");
  assert.equal((dessin.match(/<circle /g) ?? []).length, 4);

  // La colonne mise en abscisse ne se dessine pas contre elle-même, et la
  // variable de boucle dit d'où vient chaque point.
  assert.doesNotMatch(dessin, /<title>Charge cumulée ·/);
  assert.match(dessin, /Niveau 3/);
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
  const dessin = renderGraphiqueDuTableau(lance(deux).tableau, vu(LECTURE.COURBE));

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

  brancherLesLectures(hote, (sujet, quoi) => choisis.push([sujet, quoi]));
  assert.equal(ecoutes.length, 1, "l'écoute ne se pose pas une seule fois");

  /**
   * **Les deux boutons passent par la même écoute**, et c'est la même raison :
   * l'abscisse d'un nuage vit dans le même panneau remplacé. Une seconde écoute
   * posée ailleurs serait un second endroit à se rappeler de rebrancher.
   */
  const bouton = (marque, valeur) => ({
    dataset: { bacSujet: "Descente de charge" },
    getAttribute: (quoi) => (quoi === marque ? valeur : null),
    marque
  });
  const cliquer = (vise) => ecoutes[0].quoi({
    target: { closest: (quoi) => (vise && quoi.includes(vise.marque) ? vise : null) }
  });

  for (const lecture of Object.values(LECTURE)) cliquer(bouton(MARQUE_DE_LA_LECTURE, lecture));
  cliquer(bouton(MARQUE_DE_LABSCISSE, "Charge cumulée"));

  assert.deepEqual(choisis, [
    ...Object.values(LECTURE).map((une) => ["Descente de charge", { lecture: une }]),
    ["Descente de charge", { abscisse: "Charge cumulée" }]
  ]);

  // Un clic à côté d'un bouton ne choisit rien.
  cliquer(null);
  assert.equal(choisis.length, Object.values(LECTURE).length + 1);

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

test("le bac garde ce qu'on a choisi par la règle qui sait le garder", async () => {
  /**
   * **Cette épreuve relit le source, et c'est l'exception qui le justifie.**
   *
   * Ce que le bac retient d'un clic vit dans son état, qui ne sort pas du
   * module : aucune épreuve ne peut donc le lire. Et le défaut serait le plus
   * discret de tous — tout se dessine, chaque clic répond, et c'est seulement
   * au troisième qu'on s'aperçoit que le nuage est revenu contre une autre
   * colonne que celle qu'on avait choisie. On croit avoir mal cliqué.
   *
   * `choixGarde` porte la règle et s'éprouve seule ; il reste à vérifier que
   * c'est bien elle qu'on appelle, et non un écrasement écrit sur place.
   */
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const source = readFileSync(
    fileURLToPath(new URL("../views/studio/dev/ecrire-en-mdall.js", import.meta.url)), "utf8");

  const debut = source.indexOf("function choisirLaLecture(");
  assert.ok(debut > 0, "choisirLaLecture est introuvable");
  const corps = source.slice(debut, source.indexOf("\n}\n", debut));

  assert.match(corps, /choixGarde\(etat\.lectures\[[^\]]+\], quoi\)/,
    "le bac écrase ce qu'on avait choisi au lieu de le garder");
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
