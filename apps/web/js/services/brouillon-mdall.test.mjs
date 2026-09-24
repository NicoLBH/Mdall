/**
 * Un brouillon de Mdall : ce qu'il porte, et ce qu'il ne porte pas.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  FICHIERS_DU_BROUILLON, brouillonNeuf, extensionDuNom, langageDuFichier,
  fichierOuvert, avecLeFichier, avecLeDit, ouvertSur, brouillonEcrit, fichiersRemplis,
  VERSION_DU_BROUILLON, brouillonRange, brouillonRelu
} from "./brouillon-mdall.js";

test("un brouillon neuf ouvre trois fichiers, tous vides", () => {
  // Un brouillon qui s'ouvrirait sur un exemple ferait verser l'exemple le jour
  // où quelqu'un oublie de l'effacer ; un brouillon d'un seul fichier ferait
  // croire que le langage n'en a qu'un.
  const neuf = brouillonNeuf();

  assert.equal(neuf.dit, "");
  assert.equal(neuf.fichiers.length, 3);
  assert.deepEqual(neuf.fichiers.map((fichier) => fichier.contenu), ["", "", ""]);
  assert.equal(neuf.fichiers.every((fichier) => fichier.quoi), true, "chaque fichier dit ce qu'il porte");
});

test("les onglets sont les fichiers : il n'y en a pas un de plus", () => {
  // Règle 10 : pas d'onglet sans fichier, pas de fichier sans onglet.
  assert.deepEqual(
    brouillonNeuf().fichiers.map((fichier) => fichier.nom),
    FICHIERS_DU_BROUILLON.map((fichier) => fichier.nom)
  );
});

test("l'extension se reconnaît sur la liste du rangement, et pas ailleurs", () => {
  // Elle se **dérive** du rangement : une quatrième liste écrite ici oublierait
  // celle qu'on ajoute demain (règle 4).
  assert.equal(extensionDuNom("essai.ref"), "ref");
  assert.equal(extensionDuNom("essai.ddb"), "ddb");
  assert.equal(extensionDuNom("essai.ctr"), "ctr");
  assert.equal(extensionDuNom("Mémoire/variables-du-projet.ref"), "ref");

  // On ne devine pas : `essai.txt` n'est pas du Mdall, et le colorer comme tel
  // ferait croire qu'il se versera.
  assert.equal(extensionDuNom("essai.txt"), "");
  assert.equal(extensionDuNom("essai"), "");
  assert.equal(extensionDuNom(""), "");
});

test("chaque fichier se colore dans la langue de son extension", () => {
  assert.equal(langageDuFichier("essai.ref"), "regle");
  assert.equal(langageDuFichier("essai.ddb"), "declaration");
  assert.equal(langageDuFichier("essai.ctr"), "enonce");
});

test("un fichier est toujours ouvert, même quand le nom retenu n'existe plus", () => {
  // Un écran sans fichier ouvert n'aurait rien à montrer à droite, et l'on
  // chercherait longtemps pourquoi la moitié de l'écran est vide.
  const brouillon = { ...brouillonNeuf(), ouvert: "disparu.ref" };

  assert.equal(fichierOuvert(brouillon).nom, "variables-du-projet.ref");
  assert.equal(fichierOuvert({ fichiers: [] }), null);
  assert.equal(fichierOuvert(null), null);
});

test("écrire dans un fichier rend un brouillon neuf, sans toucher à l'ancien", () => {
  // L'état d'un écran se remplace, il ne se bricole pas : un objet modifié en
  // place se compare mal à celui d'avant, ce qui est exactement ce qu'on veut
  // faire pour savoir si quelque chose a bougé.
  const avant = brouillonNeuf();
  const apres = avecLeFichier(avant, "essai.ref", "fonction X(zones) { }");

  assert.equal(apres.fichiers.find((fichier) => fichier.nom === "essai.ref").contenu, "fonction X(zones) { }");
  assert.equal(avant.fichiers.find((fichier) => fichier.nom === "essai.ref").contenu, "");
  assert.notEqual(apres, avant);
});

test("écrire dans un fichier ne touche pas aux autres", () => {
  const brouillon = avecLeFichier(brouillonNeuf(), "essai.ref", "du code");

  assert.equal(brouillon.fichiers.find((fichier) => fichier.nom === "essai.ddb").contenu, "");
  assert.equal(brouillon.fichiers.length, 3);
});

test("un nom de fichier inconnu n'écrit nulle part", () => {
  // Plutôt que de créer un quatrième fichier en silence : un onglet
  // apparaîtrait sans que rien ne dise d'où il vient.
  const brouillon = avecLeFichier(brouillonNeuf(), "inventé.ref", "du code");

  assert.equal(brouillon.fichiers.length, 3);
  assert.equal(brouillonEcrit(brouillon), false);
});

test("on n'ouvre que ce qui existe", () => {
  const brouillon = brouillonNeuf();

  assert.equal(ouvertSur(brouillon, "essai.ddb").ouvert, "essai.ddb");
  assert.equal(ouvertSur(brouillon, "disparu.ref").ouvert, brouillon.ouvert);
});

test("un brouillon vide se distingue d'un brouillon écrit", () => {
  // La question qui compte : y a-t-il quelque chose à perdre ? Un écran qui
  // proposerait d'effacer du vide poserait une question pour rien ; un écran
  // qui effacerait sans demander ferait perdre une demi-heure.
  assert.equal(brouillonEcrit(brouillonNeuf()), false);
  assert.equal(brouillonEcrit(avecLeDit(brouillonNeuf(), "la zone de vent vaut 3")), true);
  assert.equal(brouillonEcrit(avecLeFichier(brouillonNeuf(), "essai.ref", "fonction X(zones) { }")), true);

  // Des espaces ne sont pas du travail.
  assert.equal(brouillonEcrit(avecLeDit(brouillonNeuf(), "   \n  ")), false);
});

test("seuls les fichiers qui portent quelque chose entrent dans ce qu'on vérifie", () => {
  // Un fichier vide n'a rien à dire, et le faire entrer ferait compter des
  // refus sur du néant.
  const brouillon = avecLeFichier(brouillonNeuf(), "essai.ref", "fonction X(zones) { }");

  assert.deepEqual(fichiersRemplis(brouillon).map((fichier) => fichier.nom), ["essai.ref"]);
  assert.deepEqual(fichiersRemplis(brouillonNeuf()), []);
  assert.deepEqual(fichiersRemplis(null), []);
});

/* ── Le brouillon se garde ───────────────────────────────────────────────── */

test("ce qu'on range se relit à l'identique", () => {
  const brouillon = ouvertSur(
    avecLeDit(avecLeFichier(brouillonNeuf(), "essai.ddb", "Altitude du site = 890 m"), "un essai"),
    "essai.ddb"
  );

  assert.deepEqual(brouillonRelu(brouillonRange(brouillon)), brouillon);
});

test("l'indentation du langage survit au rangement", () => {
  // Trois espaces, et le lecteur s'en sert. Un `trim` sur le contenu casserait
  // la première ligne de chaque bloc, et l'on ne le verrait qu'en rechargeant.
  const code = "fonction A(zones) {\n   si (x = \"1\")\n   alors (\"2\");\n}\n";
  const relu = brouillonRelu(brouillonRange(avecLeFichier(brouillonNeuf(), "essai.ref", code)));

  assert.equal(relu.fichiers.find((un) => un.nom === "essai.ref").contenu, code);
});

test("ce qui explique un fichier ne voyage pas : il vit à un seul endroit", () => {
  // `quoi` est dans `FICHIERS_DU_BROUILLON`. Le ranger ici ferait deux
  // explications du même fichier, et celle gardée l'an dernier aurait raison.
  const range = JSON.parse(brouillonRange(avecLeFichier(brouillonNeuf(), "essai.ddb", "x = 1")));

  assert.deepEqual(Object.keys(range.fichiers[0]).sort(), ["contenu", "nom"]);
  // Et il revient quand même, pris à la source.
  assert.equal(brouillonRelu(brouillonRange(avecLeFichier(brouillonNeuf(), "essai.ddb", "x = 1")))
    .fichiers[0].quoi, FICHIERS_DU_BROUILLON[0].quoi);
});

test("un fichier arrivé depuis existe quand même, vide", () => {
  // Un brouillon gardé avant que le langage gagne un fichier ne casse pas
  // l'écran : c'est un onglet de plus, pas une lecture impossible.
  const relu = brouillonRelu(JSON.stringify({
    version: 1, dit: "", ouvert: "essai.ref",
    fichiers: [{ nom: "essai.ref", contenu: "fonction A(zones) {\n}" }]
  }));

  assert.deepEqual(relu.fichiers.map((un) => un.nom), FICHIERS_DU_BROUILLON.map((un) => un.nom));
  assert.equal(relu.fichiers.find((un) => un.nom === "essai.ddb").contenu, "");
});

test("un fichier que le brouillon ne connaît pas n'entre pas par cette porte", () => {
  const relu = brouillonRelu(JSON.stringify({
    version: 1, dit: "un essai", ouvert: "notes.txt",
    fichiers: [{ nom: "notes.txt", contenu: "quelque chose" }, { nom: "essai.ddb", contenu: "x = 1" }]
  }));

  assert.deepEqual(relu.fichiers.map((un) => un.nom), FICHIERS_DU_BROUILLON.map((un) => un.nom));
  // Et l'onglet ouvert reste un onglet qui existe.
  assert.ok(FICHIERS_DU_BROUILLON.some((un) => un.nom === relu.ouvert));
});

test("ce qui ne se relit pas rend null, plutôt qu'un brouillon vide", () => {
  // Rendre un brouillon neuf écraserait celui qu'on a peut-être en cours par du
  // vide — et personne ne saurait que quelque chose avait été gardé (règle 5).
  assert.equal(brouillonRelu("{pas du json"), null);
  assert.equal(brouillonRelu(""), null);
  assert.equal(brouillonRelu(null), null);
  assert.equal(brouillonRelu("[]"), null);
  // `JSON.parse("null")` rend `null` sans lever : tout ce qui suit lirait dedans.
  assert.equal(brouillonRelu("null"), null);
  assert.equal(brouillonRelu("\"une chaîne\""), null);
});

test("un brouillon où rien n'est écrit ne se garde pas", () => {
  assert.equal(brouillonRelu(brouillonRange(brouillonNeuf())), null);
  assert.equal(brouillonRelu(brouillonRange(null)), null);
});

test("la version est écrite : un brouillon relu sans savoir de quand il date s'interprète", () => {
  assert.equal(JSON.parse(brouillonRange(brouillonNeuf())).version, VERSION_DU_BROUILLON);
});
