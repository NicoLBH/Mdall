/**
 * La courbe, de bout en bout : lue, demandée, évaluée, dessinée, réécrite.
 *
 * **Ce fichier éprouve le câblage**, et c'est ce qui manque le plus souvent :
 * une fonction pure s'éprouve par son résultat, un câblage ne s'éprouve que par
 * le code qui le porte. Une courbe que la lecture range bien mais dont le bac
 * ne demande pas l'abscisse ne casse rien — elle rend une fonction qui ne
 * conclut jamais, devant un formulaire vide.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { jetonsDeLaLigne, lireUnFichier, nomsLusParLeBloc } from "./memoire-en-lecture.js";
import { blocDeRegle, texteDesLignes } from "./memoire-en-texte.js";
import { evaluerLaCourbe, DOUTE } from "./memoire-evaluateur.js";
import { lancerLeBrouillon, ISSUE } from "./bac-dessai.js";
import { champsDuBrouillon } from "./formulaire-du-brouillon.js";
import { contexteDuBrouillon } from "./mdall-completion.js";
import { ORIGINE } from "./catalogue-des-noms.js";
import { renderCourbe, renderPointsDeLaCourbe } from "../views/studio/dev/ecrire-en-mdall.js";

const SOURCE = [
  "courbe Coefficient de forme(zones, Pente du versant) {",
  "   // NF EN 1991-1-3, figure 5.1 — toiture à un versant.",
  "   texte: NF EN 1991-1-3, annexe nationale",
  "   entre les points: linéaire",
  "   hors bornes: refuse",
  "   |  0° | 0,8 |",
  "   | 30° | 0,8 |",
  "   | 60° | 0   |",
  "}",
  ""
].join("\n");

const FICHIERS = [{ nom: "essai.ref", contenu: SOURCE }];
const bloc = (source) => lireUnFichier(source).blocs[0];
const refusDe = (source) => lireUnFichier(source).refus.map((un) => un.raison);

const courbe = (corps) => [
  "courbe C(zones, P) {",
  ...corps,
  "}"
].join("\n");

/* ── Ce que la lecture range ─────────────────────────────────────────────── */

test("une courbe se range à part, avec son abscisse et ses deux déclarations", () => {
  /**
   * **`courbe` est une marque d'écriture, comme `selon`** : la fonction lit une
   * entrée et conclut sous son nom, exactement comme les autres. Ce qui change
   * est la façon dont sa loi est posée.
   */
  const lu = lireUnFichier(SOURCE);
  assert.deepEqual(lu.refus, []);

  assert.deepEqual(lu.blocs[0].courbe, {
    selon: "Pente du versant",
    entre: "linéaire",
    hors: "refuse",
    points: [{ x: "0°", y: "0,8" }, { x: "30°", y: "0,8" }, { x: "60°", y: "0" }]
  });

  // Et tout le reste d'une fonction reste ce qu'il est : sa provenance, son
  // commentaire, son sujet.
  assert.equal(lu.blocs[0].sujet, "Coefficient de forme");
  assert.deepEqual(lu.blocs[0].provenance, { type: "texte", quoi: "NF EN 1991-1-3, annexe nationale" });
});

test("les deux déclarations sont obligatoires : une interpolation se déclare", () => {
  /**
   * **Deux abaques dessinés pareil se lisent différemment**, et rien dans les
   * points ne le dit. Quant à `hors bornes`, c'est la faute classique : une
   * courbe donnée de 0 à 60° prolongée jusqu'à 75° rend un nombre parfaitement
   * plausible, qui ne vient d'aucun texte.
   */
  const sansRien = refusDe(courbe(["   | 0° | 1 |", "   | 1° | 2 |"]));
  assert.equal(sansRien.length, 1);
  assert.match(sansRien[0], /entre les points/);
  assert.match(sansRien[0], /hors bornes/);

  const sansHors = refusDe(courbe([
    "   entre les points: linéaire", "   | 0° | 1 |", "   | 1° | 2 |"
  ]));
  assert.match(sansHors[0], /hors bornes/);
  assert.doesNotMatch(sansHors[0], /entre les points/);
});

test("un mot qu'on n'a pas prévu se refuse en montrant ceux qui existent", () => {
  // Inventer une interpolation — une spline, une puissance — rendrait des
  // valeurs qu'aucun texte ne porte.
  const rendu = refusDe(courbe([
    "   entre les points: quadratique", "   hors bornes: refuse",
    "   | 0° | 1 |", "   | 1° | 2 |"
  ]));
  assert.match(rendu[0], /« linéaire » ou « en escalier »/);

  const hors = refusDe(courbe([
    "   entre les points: linéaire", "   hors bornes: prolonge",
    "   | 0° | 1 |", "   | 1° | 2 |"
  ]));
  assert.match(hors[0], /« refuse » ou « borne »/);
});

test("une courbe sans nom à lire se refuse : elle n'a rien à placer", () => {
  // Une fonction ordinaire déduit ses entrées de ses conditions ; une courbe
  // n'en a pas, et c'est sa signature qui dit ce qu'elle lit.
  const rendu = refusDe([
    "courbe C(zones) {",
    "   entre les points: linéaire",
    "   hors bornes: refuse",
    "   | 0° | 1 |",
    "   | 1° | 2 |",
    "}"
  ].join("\n"));
  assert.match(rendu[0], /le nom qu'elle lit, dans sa signature/);
});

test("une ligne de courbe a deux cases, et se distingue d'une ligne de barème", () => {
  /**
   * **Une seule notation pour les tableaux du langage**, et pas deux à
   * apprendre : c'est le mot de tête du bloc qui décide si `| … | … |` est un
   * point ou une ligne de barème.
   */
  const trois = refusDe(courbe([
    "   entre les points: linéaire", "   hors bornes: refuse", "   | 0° | 1 | 2 |"
  ]));
  assert.match(trois[0], /deux cases/);

  // Et une ligne de barème reste une ligne de barème là où elle vit.
  const bareme = lireUnFichier([
    "fonction F(zones, Famille) {",
    "   selon (Famille)",
    '      | 3e famille B | "CF 1 h" |',
    "}"
  ].join("\n"));
  assert.deepEqual(bareme.refus, []);
  assert.equal(bareme.blocs[0].courbe, undefined);
});

test("les deux déclarations ne se disent que d'une courbe", () => {
  const rendu = refusDe([
    "fonction F(zones, A) {",
    "   hors bornes: refuse",
    "   si (A > 0)",
    "   alors (A);",
    "}"
  ].join("\n"));
  assert.match(rendu[0], /ne se dit que d'une courbe/);
});

/* ── Ce que la fonction demande ──────────────────────────────────────────── */

test("une courbe lit son abscisse, et le formulaire la demande", () => {
  /**
   * **C'est le câblage qui compte ici.** La lecture range bien la courbe ; si
   * « ce qu'une fonction lit » ne la voit pas, le bac n'offre **aucun champ**
   * devant un abaque, et la fonction reste indécidable pour toujours sans qu'un
   * mot dise laquelle des valeurs manque.
   */
  assert.deepEqual(nomsLusParLeBloc(bloc(SOURCE)), ["Pente du versant"]);
  assert.deepEqual(champsDuBrouillon(FICHIERS).map((un) => un.nom), ["Pente du versant"]);
});

test("ce qu'une courbe conclut entre au catalogue, et dit ce qu'elle lit", () => {
  // Une courbe conclut sous son nom comme n'importe quelle fonction : c'est
  // ainsi qu'une autre l'enchaîne, et le catalogue doit le montrer.
  const { catalogue } = contexteDuBrouillon(FICHIERS, {});
  const trouve = catalogue.find((une) => une.nom === "Coefficient de forme");

  assert.equal(trouve.origine, ORIGINE.CONCLU);
  assert.deepEqual(trouve.lit, ["Pente du versant"]);
});

/* ── Ce que la courbe conclut ────────────────────────────────────────────── */

const lire = (valeurs) => (sujet) => (valeurs[sujet]
  ? { connu: true, valeur: valeurs[sujet] }
  : { connu: false, valeur: "" });

test("une courbe qui a lu tient, et rend la forme d'une fonction", () => {
  /**
   * **L'écran, la trace, le rejeu et le graphe n'ont pas à savoir qu'une courbe
   * existe.** Dire « indécidable » d'une lecture réussie ferait chercher un
   * défaut là où il n'y en a pas.
   */
  const rendu = evaluerLaCourbe(bloc(SOURCE).courbe, lire({ "Pente du versant": "45°" }));

  assert.equal(rendu.decidable, true);
  assert.equal(rendu.tient, true);
  assert.equal(rendu.valeur, "0,4");
  assert.deepEqual(rendu.lecture.entre, { de: "30°", a: "60°" });
  assert.deepEqual(rendu.manquants, []);
  assert.deepEqual(rendu.doutes, []);
  assert.equal(rendu.points.length, 3);
});

test("une abscisse qu'on n'a pas se demande, et ne se devine pas", () => {
  const rendu = evaluerLaCourbe(bloc(SOURCE).courbe, lire({}));
  assert.equal(rendu.tient, null);
  assert.deepEqual(rendu.manquants, ["Pente du versant"]);
  assert.ok(rendu.doutes.includes(DOUTE.ENTREE_ABSENTE));
});

test("une valeur hors de la courbe ne conclut pas, et dit jusqu'où la courbe va", () => {
  const rendu = evaluerLaCourbe(bloc(SOURCE).courbe, lire({ "Pente du versant": "75°" }));
  assert.equal(rendu.tient, null);
  assert.equal(rendu.valeur, "");
  assert.ok(rendu.doutes.includes(DOUTE.COURBE_MUETTE));
  assert.match(rendu.lecture.pourquoi, /la courbe va de 0° à 60°/);
  // Les points restent : c'est devant le dessin qu'on comprend qu'on est sorti.
  assert.equal(rendu.points.length, 3);
});

test("le bac d'essai conclut, et montre l'abaque qui l'a mené là", () => {
  /**
   * **Le câblage, encore.** La lecture range la courbe, l'évaluateur sait la
   * lire — et si le bac ne la lui passe pas, la fonction ne conclut rien sans
   * qu'un mot dise que c'est l'abaque qui manque.
   */
  const [rendu] = lancerLeBrouillon(FICHIERS, { "Pente du versant": "38°" });

  assert.equal(rendu.issue, ISSUE.TIENT);
  assert.equal(rendu.valeur, "0,586666666667");
  assert.equal(rendu.points.length, 3);
  assert.deepEqual(rendu.lecture.entre, { de: "30°", a: "60°" });
});

test("une fonction ordinaire n'a pas de points, et ne prétend pas le contraire", () => {
  const [rendu] = lancerLeBrouillon(
    [{ nom: "e.ref", contenu: "fonction F(zones, A) {\n   si (A > 0)\n   alors (A);\n}\n" }],
    { A: "1" }
  );
  assert.deepEqual(rendu.points, []);
  assert.equal(rendu.lecture, null);
});

test("une courbe enchaîne comme les autres : une fonction lit ce qu'elle conclut", () => {
  // C'est tout l'objet de la forme : l'abaque entre dans le langage sans que
  // rien d'autre ne change.
  const chaine = [
    SOURCE,
    "fonction Charge de neige(zones, Coefficient de forme, Neige au sol) {",
    "   calcule Charge de neige = Coefficient de forme * Neige au sol;",
    "   si (Neige au sol >= 0 kPa)",
    "   alors (Charge de neige);",
    "}",
    ""
  ].join("\n");

  const rendus = lancerLeBrouillon(
    [{ nom: "essai.ref", contenu: chaine }],
    { "Pente du versant": "45°", "Neige au sol": "0,9 kPa" }
  );

  assert.deepEqual(rendus.map((un) => [un.sujet, un.issue, un.valeur]), [
    ["Coefficient de forme", ISSUE.TIENT, "0,4"],
    ["Charge de neige", ISSUE.TIENT, "0,36 kPa"]
  ]);
});

/* ── Ce que l'écran dessine ──────────────────────────────────────────────── */

test("une lecture bornée se marque sur la courbe, et n'étire pas le tracé", () => {
  /**
   * **Le défaut se voyait, et seulement à l'écran.** Posée à sa vraie abscisse,
   * une lecture hors bornes étirait le cadre jusqu'à elle : les deux bornes
   * affichées sous le dessin cessaient d'être aux deux bouts, et le tracé
   * annonçait une courbe plus large que celle qui est écrite.
   *
   * Ce qui s'est passé se dit en mots ; le dessin montre ce que la courbe a
   * **conclu** — son extrémité.
   */
  const bornee = SOURCE.replace("hors bornes: refuse", "hors bornes: borne");
  const [rendu] = lancerLeBrouillon([{ nom: "e.ref", contenu: bornee }], { "Pente du versant": "75°" });

  assert.equal(rendu.valeur, "0");
  assert.equal(rendu.lecture.borne, "60°");

  const dessin = renderCourbe(rendu);
  const cercles = [...dessin.matchAll(/<circle cx="(\d+)"[^>]*class="graphique__(point|lu)[^"]*"/g)];
  const dernierPoint = cercles.filter(([, , quoi]) => quoi === "point").at(-1);
  const marque = cercles.find(([, , quoi]) => quoi === "lu");

  assert.ok(marque, "la lecture n'est pas marquée sur le dessin");
  assert.equal(marque[1], dernierPoint[1], "la marque n'est pas sur le dernier point");
  // Et la légende annonce les bornes de la courbe, pas celles de la lecture.
  assert.match(dessin, /<span>0°<\/span>\s*<span>60°<\/span>/);
});

test("la courbe se dessine dans le bon sens, et la lecture s'y pose", () => {
  /**
   * **Un canevas compte du haut, une courbe monte.** Dessinée sans retourner
   * l'ordonnée, elle est le miroir exact de sa figure — et c'est la seule
   * chose qu'on ne pardonne pas à un abaque : il sert à être comparé.
   */
  const [rendu] = lancerLeBrouillon(FICHIERS, { "Pente du versant": "30°" });
  const dessin = renderCourbe(rendu);

  const cercles = [...dessin.matchAll(/<circle cx="(\d+)" cy="(\d+)"[^>]*class="graphique__(point|lu)[^"]*"/g)]
    .map(([, x, y, quoi]) => ({ x: Number(x), y: Number(y), quoi }));
  const points = cercles.filter((un) => un.quoi === "point");

  // 0,8 est le haut de la courbe, 0 son bas : le premier point est **au-dessus**
  // du dernier, c'est-à-dire d'ordonnée plus petite sur le canevas.
  assert.ok(points[0].y < points.at(-1).y, "la courbe est dessinée à l'envers");
  assert.ok(points[0].x < points.at(-1).x, "les abscisses ne vont pas de gauche à droite");

  // La lecture tombe sur le deuxième point — 30° vaut 0,8 —, et s'y pose.
  const marque = cercles.find((un) => un.quoi === "lu");
  assert.deepEqual([marque.x, marque.y], [points[1].x, points[1].y]);
});

test("la légende dit où la lecture est tombée, et la ligne se met en évidence", () => {
  // C'est la ligne qu'on cherche, et la seule qui se compare au texte
  // d'origine : un abaque se vérifie en la retrouvant.
  const surUnPoint = renderPointsDeLaCourbe(lancerLeBrouillon(FICHIERS, { "Pente du versant": "30°" })[0]);
  assert.match(surUnPoint, /lu sur le point 30°/);
  assert.match(surUnPoint, /<tr class="bac-tableau__retenue">\s*<th scope="row">30°<\/th>/);

  const entreDeux = renderPointsDeLaCourbe(lancerLeBrouillon(FICHIERS, { "Pente du versant": "45°" })[0]);
  assert.match(entreDeux, /lu entre 30° et 60°/);
  assert.equal((entreDeux.match(/bac-tableau__retenue/g) ?? []).length, 2,
    "les deux points qui encadrent la lecture ne sont pas les deux mis en évidence");
});

test("une fonction sans points ne dessine rien", () => {
  // Un cadre vide se lirait comme un dessin qui n'a pas su s'afficher.
  assert.equal(renderCourbe(null), "");
  assert.equal(renderCourbe({ points: [] }), "");
  assert.equal(renderPointsDeLaCourbe({ points: [] }), "");
});

/* ── Aller et retour ─────────────────────────────────────────────────────── */

test("un abaque se réécrit comme un abaque, et se relit à l'identique", () => {
  /**
   * **Une règle versée se relit dans l'écran des fichiers**, et c'est par là
   * qu'on la compare à ce qu'on a signé. Une courbe réduite à la valeur qu'elle
   * a conclue deviendrait une affirmation, et l'on ne pourrait plus la comparer
   * à sa figure — ce pour quoi on l'a écrite ainsi.
   */
  const un = bloc(SOURCE);
  const ecrit = texteDesLignes(blocDeRegle({
    sujet: un.sujet, quoi: "Le coefficient de forme.", courbe: un.courbe, provenance: un.provenance
  }));

  assert.match(ecrit, /^courbe Coefficient de forme\(zones, Pente du versant\) \{$/m);
  assert.match(ecrit, /^ {3}entre les points: linéaire$/m);
  assert.match(ecrit, /^ {3}hors bornes: refuse$/m);
  // Les colonnes s'alignent : un abaque se compare à sa figure d'un coup d'œil,
  // et des cases qui dansent obligent à lire chiffre par chiffre.
  assert.match(ecrit, /^ {3}\| 0° {2}\| 0,8 \|$/m);
  assert.match(ecrit, /^ {3}\| 60° \| 0 {3}\|$/m);
  // Et pas de ligne vide juste avant l'accolade fermante.
  assert.doesNotMatch(ecrit, /\n\s*\n\}/);

  const relu = bloc(ecrit);
  assert.deepEqual(relu.courbe, un.courbe);
});

test("la ligne écrite et la ligne relue se colorent pareil, caractère par caractère", () => {
  /**
   * **Deux peintres, une seule ligne.** Le module d'écriture compose la tête
   * d'une courbe et ses déclarations jeton par jeton ; la lecture les recompose
   * de son côté. Rien ne les oblige à tomber d'accord — et le jour où ils
   * divergent, la même fonction change de couleur selon l'écran qui la montre,
   * sans qu'une seule épreuve ne tombe (règle 10).
   */
  const un = bloc(SOURCE);
  const lignes = blocDeRegle({ sujet: un.sujet, courbe: un.courbe });
  const couleurs = (jetons) => jetons.flatMap((quoi) => [...quoi.texte].map(() => quoi.type));

  for (const ecrite of lignes) {
    const ligne = ecrite.map((quoi) => quoi.texte).join("");
    if (!ligne.trim() || ligne.trim() === "}") continue;

    const relue = jetonsDeLaLigne(ligne);
    assert.equal(relue.map((quoi) => quoi.texte).join(""), ligne,
      `la ligne ne se recompose pas :\n${ligne}`);

    /**
     * **La comparaison se fait caractère par caractère**, et non jeton par
     * jeton : l'un peut rendre un mot d'un seul tenant et l'autre en deux, et
     * c'est sans importance — ce qui compte est que chaque caractère porte la
     * même couleur des deux côtés.
     */
    assert.deepEqual(couleurs(relue), couleurs(ecrite),
      `les deux peintres ne colorent pas pareil :\n${ligne}`);
  }
});
