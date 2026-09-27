/**
 * La courbe : ses points, et la règle entre eux.
 *
 * **Ce qui se prouve ici est ce qui se décide sans rien lire d'un fichier.** La
 * lecture du bloc, son évaluation et sa réécriture vivent ailleurs, et
 * s'éprouvent là-bas.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  DIT_DE_LENTRE, DIT_DU_HORS, ENTRE, HORS, REFUS_DE_LA_COURBE,
  interpoler, lireUnPoint, phraseDeLaLecture, phraseDuRefusDeLaCourbe,
  pointsDeLaCourbe, traceDeLaCourbe
} from "./courbe-du-mdall.js";

/** L'abaque du coefficient de forme : deux paliers, puis une pente. */
const FORME = pointsDeLaCourbe([
  { x: "0°", y: "0,8" },
  { x: "30°", y: "0,8" },
  { x: "60°", y: "0" }
]);

const lit = (valeur, comment = {}) => interpoler(FORME, valeur, {
  entre: ENTRE.LINEAIRE, hors: HORS.REFUSE, ...comment
});

/* ── Lire les points ─────────────────────────────────────────────────────── */

test("un point a deux cases, et rien d'autre", () => {
  assert.deepEqual(lireUnPoint(["30°", "0,80"]), { x: "30°", y: "0,80" });
  // Trois cases seraient un barème, une seule ne dit rien : l'appelant refuse
  // en nommant la ligne plutôt que d'inventer un point.
  assert.equal(lireUnPoint(["30°", "0,80", "de plus"]), null);
  assert.equal(lireUnPoint(["30°"]), null);
  assert.equal(lireUnPoint(["30°", ""]), null);
  assert.equal(lireUnPoint(), null);
});

test("les points gardent leur écriture, et portent leur unité", () => {
  assert.equal(FORME.uniteX, "°");
  assert.equal(FORME.uniteY, "");
  assert.deepEqual(FORME.points.map((un) => [un.x, un.y, un.dit, un.vaut]), [
    [0, 0.8, "0°", "0,8"],
    [30, 0.8, "30°", "0,8"],
    [60, 0, "60°", "0"]
  ]);
});

test("une courbe d'un seul point se refuse : elle ne dit rien de ce qu'il y a entre", () => {
  const rendu = pointsDeLaCourbe([{ x: "0°", y: "0,8" }]);
  assert.equal(rendu.refus, REFUS_DE_LA_COURBE.TROP_COURTE);
  assert.match(phraseDuRefusDeLaCourbe(rendu.refus), /au moins deux points/);
});

test("des abscisses qui ne montent pas se refusent, et la ligne se nomme", () => {
  /**
   * **Les trier en silence ferait passer pour juste un tableau qui ne l'est
   * pas.** Une abscisse qui redescend est une ligne recopiée dans le désordre,
   * et c'est exactement la faute qu'on veut voir en recopiant un abaque.
   */
  const desordre = pointsDeLaCourbe([{ x: "30°", y: "1" }, { x: "10°", y: "2" }]);
  assert.equal(desordre.refus, REFUS_DE_LA_COURBE.DESORDRE);
  assert.match(phraseDuRefusDeLaCourbe(desordre.refus, desordre.ou), /« 10° » vient après/);

  // Deux points au même x donneraient deux valeurs pour une lecture.
  assert.equal(pointsDeLaCourbe([{ x: "30°", y: "1" }, { x: "30°", y: "2" }]).refus,
    REFUS_DE_LA_COURBE.DESORDRE);
});

test("une case qui n'est pas un nombre se refuse en la citant", () => {
  const rendu = pointsDeLaCourbe([{ x: "0°", y: "0,8" }, { x: "trente", y: "1" }]);
  assert.equal(rendu.refus, REFUS_DE_LA_COURBE.PAS_UN_NOMBRE);
  assert.match(phraseDuRefusDeLaCourbe(rendu.refus, rendu.ou), /« trente » n'est pas un nombre/);
});

test("chaque colonne mesure une seule chose, et les unités se ramènent", () => {
  // Une abscisse en kilonewtons au milieu d'abscisses en degrés n'est pas une
  // faute de frappe qu'on rattrape : c'est une courbe dont on ne sait plus ce
  // qu'elle trace.
  const melange = pointsDeLaCourbe([{ x: "0 m", y: "1" }, { x: "10 kN", y: "2" }]);
  assert.equal(melange.refus, REFUS_DE_LA_COURBE.UNITES);
  assert.match(phraseDuRefusDeLaCourbe(melange.refus, melange.ou), /une longueur et une force/);

  /**
   * **Et chaque côté se refuse avec ses deux unités à lui.** Une ordonnée
   * étrangère nommée avec les unités de l'abscisse ferait chercher la faute
   * dans la colonne de gauche, qui va très bien.
   */
  const ordonnee = pointsDeLaCourbe([{ x: "0 m", y: "1 kPa" }, { x: "10 m", y: "2 kN" }]);
  assert.equal(ordonnee.refus, REFUS_DE_LA_COURBE.UNITES);
  assert.match(phraseDuRefusDeLaCourbe(ordonnee.refus, ordonnee.ou), /kPa et kN/);

  // Deux longueurs, elles, se ramènent à celle du premier point.
  const ramenee = pointsDeLaCourbe([{ x: "0 m", y: "1" }, { x: "200 cm", y: "2" }]);
  assert.equal(ramenee.refus, "");
  assert.deepEqual(ramenee.points.map((un) => un.x), [0, 2]);
});

/* ── Lire entre les points ───────────────────────────────────────────────── */

test("une lecture sur un point écrit se dit comme telle, et non entre deux", () => {
  // C'est le cas qu'on veut voir en premier — la ligne du tableau se retrouve
  // telle quelle —, et dire « entre 60° et 60° » ferait douter d'une lecture
  // exacte.
  assert.equal(lit("0°").valeur, "0,8");
  assert.equal(lit("0°").sur, "0°");
  assert.equal(lit("60°").sur, "60°");
  assert.equal(lit("60°").entre, null);
});

test("entre deux points, la droite — et la trace dit lesquels", () => {
  assert.equal(lit("45°").valeur, "0,4");
  assert.deepEqual(lit("45°").entre, { de: "30°", a: "60°" });
  assert.equal(lit("15°").valeur, "0,8");
  assert.deepEqual(lit("15°").entre, { de: "0°", a: "30°" });
});

test("en escalier, la valeur du point atteint : c'est un palier", () => {
  // Deux abaques dessinés pareil se lisent différemment, et rien dans les
  // points ne le dit : il faut l'écrire.
  assert.equal(lit("45°", { entre: ENTRE.ESCALIER }).valeur, "0,8");
  assert.equal(lit("59°", { entre: ENTRE.ESCALIER }).valeur, "0,8");
  assert.equal(lit("60°", { entre: ENTRE.ESCALIER }).valeur, "0");
});

test("hors des points écrits, la courbe refuse — et dit jusqu'où elle va", () => {
  /**
   * **C'est la faute classique, et la plus chère.** Une courbe donnée de 0 à
   * 60° prolongée jusqu'à 75° rend un nombre parfaitement plausible, qui ne
   * vient d'aucun texte — et personne ne pourrait dire d'où il sort.
   */
  const trop = lit("75°");
  assert.equal(trop.connu, false);
  assert.equal(trop.refus, REFUS_DE_LA_COURBE.HORS_BORNES);
  assert.match(trop.pourquoi, /la courbe va de 0° à 60°/);

  assert.equal(lit("-10°").connu, false);
});

test("hors bornes: borne prend la valeur de l'extrémité, et le dit", () => {
  // Une valeur rendue sans un mot ferait croire qu'elle vient de la courbe,
  // alors qu'elle vient de son extrémité.
  const bornee = lit("75°", { hors: HORS.BORNE });
  assert.equal(bornee.valeur, "0");
  assert.equal(bornee.borne, "60°");

  const enDessous = lit("-10°", { hors: HORS.BORNE });
  assert.equal(enDessous.valeur, "0,8");
  assert.equal(enDessous.borne, "0°");
});

test("une valeur qui ne mesure pas ce que la courbe trace ne se place pas", () => {
  // Un angle en radians contre une courbe en degrés : `rad` n'est pas au
  // tableau des unités, et deviner ferait pire que refuser.
  const ailleurs = lit("0,5 rad");
  assert.equal(ailleurs.connu, false);
  assert.equal(ailleurs.refus, REFUS_DE_LA_COURBE.UNITES);

  /**
   * **Et un libellé n'est pas une mesure**, même s'il commence par un chiffre.
   * `lireUnNombre` gratte les chiffres de ce qu'on lui donne : elle tirait 3 de
   * « 3e famille B » et 1 de « CF 1 h », et la courbe plaçait un classement
   * coupe-feu sur un axe d'angles pour en rendre un coefficient — un nombre
   * plausible, sorti de nulle part. C'est `estMesuree` qui tranche, le même
   * jugement que la mémoire porte sur ses propres valeurs.
   */
  assert.equal(lit("3e famille B").refus, REFUS_DE_LA_COURBE.LECTURE);
  assert.equal(lit("CF 1 h").refus, REFUS_DE_LA_COURBE.LECTURE);
  assert.equal(lit("").refus, REFUS_DE_LA_COURBE.LECTURE);
});

test("un point dont une case est un libellé se refuse aussi", () => {
  // La même faute, du côté de l'abaque : « | 3e famille B | 0,8 | » n'est pas
  // un point, et le lire comme l'abscisse 3 ferait une courbe qui a l'air juste.
  const libelle = pointsDeLaCourbe([{ x: "3e famille B", y: "0,8" }, { x: "60°", y: "0" }]);
  assert.equal(libelle.refus, REFUS_DE_LA_COURBE.PAS_UN_NOMBRE);
  assert.match(phraseDuRefusDeLaCourbe(libelle.refus, libelle.ou), /« 3e famille B »/);

  const ordonnee = pointsDeLaCourbe([{ x: "0°", y: "CF 1 h" }, { x: "60°", y: "0" }]);
  assert.equal(ordonnee.refus, REFUS_DE_LA_COURBE.PAS_UN_NOMBRE);
});

test("les unités de la lecture se ramènent à celles de la courbe", () => {
  const enMetres = pointsDeLaCourbe([{ x: "0 m", y: "1" }, { x: "10 m", y: "2" }]);
  // 500 cm valent 5 m : la moitié de la courbe, donc 1,5.
  assert.equal(interpoler(enMetres, "500 cm", { entre: ENTRE.LINEAIRE, hors: HORS.REFUSE }).valeur, "1,5");
});

test("l'ordonnée porte son unité, et le résultat avec", () => {
  const pressions = pointsDeLaCourbe([{ x: "0 m", y: "0 kPa" }, { x: "10 m", y: "1 kPa" }]);
  assert.equal(interpoler(pressions, "5 m", { entre: ENTRE.LINEAIRE, hors: HORS.REFUSE }).valeur, "0,5 kPa");
});

test("chaque mot des deux déclarations dit ce qu'il fait", () => {
  // Un mot ajouté sans phrase paraîtrait à l'écran sans qu'on sache ce qu'il
  // change — et c'est précisément ce que ces deux déclarations existent pour
  // rendre explicite.
  for (const mot of Object.values(ENTRE)) assert.ok(DIT_DE_LENTRE[mot], mot);
  for (const mot of Object.values(HORS)) assert.ok(DIT_DU_HORS[mot], mot);
  assert.equal(Object.keys(DIT_DE_LENTRE).length, Object.values(ENTRE).length);
  assert.equal(Object.keys(DIT_DU_HORS).length, Object.values(HORS).length);
});

/* ── Ce que l'écran en dit, et ce qu'il dessine ──────────────────────────── */

test("où la lecture est tombée se dit en français", () => {
  assert.equal(phraseDeLaLecture(lit("30°")), "lu sur le point 30°");
  assert.equal(phraseDeLaLecture(lit("45°")), "lu entre 30° et 60°");
  assert.equal(phraseDeLaLecture(lit("75°", { hors: HORS.BORNE })),
    "hors de la courbe : la valeur de 60°");
  // Une lecture qui n'a rien trouvé ne dit rien : la phrase du refus la dit
  // déjà, et la redire en ferait deux versions du même fait.
  assert.equal(phraseDeLaLecture(lit("75°")), "");
  assert.equal(phraseDeLaLecture(), "");
});

test("le tracé ramène les points entre 0 et 1, et place la lecture dessus", () => {
  /**
   * **Le dessin est la vérification** : un abaque se compare à sa figure d'un
   * coup d'œil. Ce qui décide de la forme est donc ici, pur et éprouvable, et
   * l'écran n'a qu'à poser les points sur sa grille.
   */
  const trace = traceDeLaCourbe(FORME, { x: 45, y: 0.4 });
  assert.deepEqual(trace.points.map((un) => [un.x, un.y]), [[0, 1], [0.5, 1], [1, 0]]);
  assert.deepEqual(trace.lu, { x: 0.75, y: 0.5 });
  assert.deepEqual(trace.bornes, { x: [0, 60], y: [0, 0.8] });
});

test("une courbe plate se dessine au milieu, et non sur un bord", () => {
  // Divisée par une hauteur nulle, elle sortirait du cadre ou n'apparaîtrait
  // pas du tout.
  const plate = pointsDeLaCourbe([{ x: "0", y: "5" }, { x: "10", y: "5" }]);
  assert.deepEqual(traceDeLaCourbe(plate).points.map((un) => un.y), [0.5, 0.5]);
});

test("un tracé sans lecture n'invente pas de point, et deux points suffisent", () => {
  assert.equal(traceDeLaCourbe(FORME).lu, null);
  assert.deepEqual(traceDeLaCourbe(null).points, []);
  assert.deepEqual(traceDeLaCourbe({ points: [{ x: 0, y: 0 }] }).points, []);
});
