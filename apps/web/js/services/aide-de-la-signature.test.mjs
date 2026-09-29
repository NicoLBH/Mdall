/**
 * Ce qu'une fonction attend, dit pendant qu'on l'écrit.
 *
 * **On nomme une fonction, et l'on ne sait plus ce qu'elle lit.** La réponse est
 * au catalogue, à trois clics — trois clics au milieu d'une ligne qu'on tape,
 * c'est une réponse qu'on ne va pas chercher. On tape un nom plausible, et la
 * règle reste indécidable sans qu'un mot dise pourquoi.
 *
 * **Les catalogues viennent d'un vrai brouillon lu**, jamais d'objets façonnés
 * ici : une entrée écrite à la main prendrait les hypothèses du code pour des
 * faits.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { aideDeLaSignature, contexteDuBrouillon } from "./mdall-completion.js";
import { renderAideDeLaSignature } from "../views/ui/propositions-de-saisie.js";

const VARIABLES = `const Matière du volet = {
   type: "texte",
   valeurs possibles: "bois" ou "pvc" ou "alu",
   description: "Ce dont les volets sont faits.",
};

const Hauteur sous plafond = {
   type: "mesure",
   unité: "m",
   description: "La hauteur libre.",
};
`;

const BROUILLON = `fonction Couleur des volets(zones, Matière du volet) {
   rend: "gris" ou "blanc"

   selon (Matière du volet)
   | bois | "gris"  |
   | pvc  | "blanc" |
}

fonction Volume(zones, Surface) {
   calcule Cubage = Surface * Hauteur sous plafond;
   si (Cubage > 0 m³)
   alors (Cubage);
}
`;

/**
 * Le catalogue que l'écran d'écriture tient vraiment.
 *
 * **Le curseur se pose à la fin, hors de toute fonction.** Posé dedans, la
 * fonction qui l'entoure est retirée du catalogue — elle ne peut pas se lire
 * elle-même —, et l'épreuve chercherait un nom que l'écran a raison de cacher.
 */
const catalogue = (contenu = BROUILLON) => contexteDuBrouillon(
  [{ nom: "essai.ref", contenu }, { nom: "variables-du-projet.ref", contenu: VARIABLES }],
  { contenu, position: contenu.length }
).catalogue;

/* ── Sur un nom : de quoi cette fonction a-t-elle besoin ? ───────────────── */

test("nommer une fonction dit ce qu'elle lit, et ce que ses entrées valent", () => {
  /**
   * **Savoir qu'il faut la matière du volet ne sert à rien si l'on ignore
   * qu'elle vaut « bois », « pvc » ou « alu ».** C'est justement le moment où
   * l'on s'apprête à taper l'une des trois.
   */
  const ligne = "   si (Couleur des volets";
  const aide = aideDeLaSignature(ligne, ligne.length, catalogue());

  assert.equal(aide.quoi, "nom");
  assert.equal(aide.nom, "Couleur des volets");
  assert.deepEqual(aide.lit.map((une) => une.nom), ["Matière du volet"]);
  assert.deepEqual(aide.lit[0].valeurs, ["bois", "pvc", "alu"]);
  assert.equal(aide.appel, false);
});

test("une entrée mesurée dit son unité plutôt qu'un domaine qu'elle n'a pas", () => {
  const ligne = "   calcule X = Volume";
  const aide = aideDeLaSignature(ligne, ligne.length, catalogue());

  const hauteur = aide?.lit?.find((une) => une.nom === "Hauteur sous plafond");
  assert.ok(hauteur, "Volume ne dit plus ce qu'il lit");
  assert.deepEqual(hauteur.valeurs, []);
  assert.equal(hauteur.unite, "m");

  // **Et elle se lit à l'écran** : une unité connue du catalogue et tue par le
  // rendu ne sert à personne.
  assert.match(renderAideDeLaSignature(aide), /Hauteur sous plafond<\/b><span>en m<\/span>/);
});

test("une entrée qu'une autre fonction conclut se dit déduite", () => {
  /**
   * **Sinon on cherche un champ qui ne paraîtra jamais.** Le formulaire ne la
   * demandera pas — c'est une fonction qui la pose —, et l'on croit l'écran
   * cassé.
   */
  const enchaine = `${BROUILLON}
fonction Peinture(zones, Prix au litre) {
   calcule Coût = Prix au litre * Couleur des volets;
   si (Coût > 0 €)
   alors (Coût);
}
`;
  const ligne = "   calcule Y = Peinture";
  const aide = aideDeLaSignature(ligne, ligne.length, catalogue(enchaine));

  const deduite = aide.lit.find((une) => une.nom === "Couleur des volets");
  assert.equal(deduite?.deduite, true);
});

test("un nom qui n'est pas une fonction ne dit rien", () => {
  // Une aide qui paraîtrait sur chaque nom du projet serait un panneau qui
  // clignote à chaque frappe, et l'on apprendrait à ne plus le lire.
  const ligne = "   si (Matière du volet";
  assert.equal(aideDeLaSignature(ligne, ligne.length, catalogue()), null);
  assert.equal(aideDeLaSignature("   si (", 7, catalogue()), null);
  assert.equal(aideDeLaSignature("", 0, catalogue()), null);
  assert.equal(aideDeLaSignature("   si (Couleur des volets", 25, []), null);
});

test("un commentaire ne dit rien : le langage n'a rien à y faire", () => {
  // **Le nom y est écrit tel quel**, et c'est ce qu'il faut pour éprouver la
  // garde : « // voir Couleur des volets » ne se serait pas lu comme un nom de
  // toute façon, et l'épreuve aurait tenu sans que la garde existe.
  const ligne = "   // Couleur des volets";
  assert.equal(aideDeLaSignature(ligne, ligne.length, catalogue()), null);

  // Hors du commentaire, le même nom parle.
  const nu = "   si (Couleur des volets";
  assert.ok(aideDeLaSignature(nu, nu.length, catalogue()));
});

/* ── Dans la signature : qu'est-ce que j'écris entre les parenthèses ? ───── */

test("la signature dit zones en premier, puis ce que le corps lit", () => {
  /**
   * **`zones` d'abord et toujours** : c'est la portée, et une fonction qui
   * l'oublie ne s'applique à rien de nommé. C'est la première question qu'on se
   * pose devant une parenthèse ouverte, et elle n'avait aucune réponse à
   * l'écran.
   */
  const ligne = "fonction Couleur des volets(";
  const aide = aideDeLaSignature(ligne, ligne.length, catalogue());

  assert.equal(aide.quoi, "signature");
  assert.deepEqual(aide.lit.map((une) => une.nom), ["zones", "Matière du volet"]);
  assert.equal(aide.rang, 0, "on est sur la première case");
});

test("la case où l'on écrit se marque, et elle avance avec les virgules", () => {
  const apres = "fonction Couleur des volets(zones, ";
  assert.equal(aideDeLaSignature(apres, apres.length, catalogue()).rang, 1);

  const encore = "fonction Couleur des volets(zones, Matière du volet, ";
  assert.equal(aideDeLaSignature(encore, encore.length, catalogue()).rang, 2);
});

test("un abaque a une signature comme une fonction", () => {
  const ligne = "courbe Couleur des volets(";
  assert.equal(aideDeLaSignature(ligne, ligne.length, catalogue()).quoi, "signature");
});

test("une signature refermée n'est plus une signature", () => {
  // Au-delà de la parenthèse fermante on écrit autre chose, et l'aide doit se
  // taire plutôt que de rester collée en haut de l'écran.
  const ligne = "fonction Couleur des volets(zones, Matière du volet) {";
  assert.equal(aideDeLaSignature(ligne, ligne.length, catalogue()), null);
});

/* ── La faute que la forme appelle ───────────────────────────────────────── */

test("une parenthèse après un nom de fonction montre l'ordre de l'appel", () => {
  /**
   * **C'est la question qu'on se pose la parenthèse ouverte**, et l'aide ne
   * répondait pas à celle-là : elle disait *ce que* la fonction lit, jamais
   * **dans quel ordre**. Depuis qu'on lui donne des valeurs, l'ordre est
   * l'information — et c'est sa signature qui le dit, portée comprise.
   */
  const ligne = "   calcule X = Couleur des volets(";
  const aide = aideDeLaSignature(ligne, ligne.length, catalogue());

  assert.equal(aide.quoi, "appel");
  assert.equal(aide.appel, true);
  // **La portée d'abord** : c'est ce que `lit` n'a jamais dit, et ce qu'on
  // oublie de donner.
  assert.deepEqual(aide.lit.map((une) => une.nom), ["zones", "Matière du volet"]);
  assert.equal(aide.rang, 0, "on écrit la première valeur");

  const dessinee = renderAideDeLaSignature(aide);
  assert.match(dessinee, /s'appelle avec, dans cet ordre/);
  assert.match(dessinee, /la portée d'abord, puis 1 valeur/);
  assert.doesNotMatch(dessinee, /pas d'appel de fonction/);
});

test("le rang suit la virgule qu'on vient de passer", () => {
  // C'est ce qui surligne la valeur qu'on est en train d'écrire : sans lui, la
  // liste est un rappel, pas une aide.
  const ligne = "   calcule X = Couleur des volets(zones, ";
  const aide = aideDeLaSignature(ligne, ligne.length, catalogue());

  assert.equal(aide.rang, 1);
  assert.match(renderAideDeLaSignature(aide), /est-actif[^]*Matière du volet/);
});

test("la portée se décrit, et d'un seul endroit", () => {
  /**
   * **Aucun projet ne déclare `zones`** — c'est un mot de la langue —, et sans
   * une phrase elle paraissait nue dans la liste : le premier paramètre de
   * toute signature, sans rien pour dire ce qu'on y met.
   *
   * La phrase était écrite dans la branche de la signature ; l'appel en aurait
   * eu une seconde, et l'une des deux aurait fini par dire autre chose
   * (règle 10). Les deux la lisent donc au même endroit, et c'est ce que ce
   * test tient.
   */
  const dansUnAppel = aideDeLaSignature(
    "   calcule X = Couleur des volets(", "   calcule X = Couleur des volets(".length, catalogue());

  const dansUneSignature = aideDeLaSignature(
    "fonction Essai(", "fonction Essai(".length, catalogue());

  assert.match(dansUnAppel.lit[0].dit, /la portée/);
  assert.equal(dansUnAppel.lit[0].nom, dansUneSignature.lit[0].nom);
  assert.equal(dansUnAppel.lit[0].dit, dansUneSignature.lit[0].dit,
    "deux phrases pour la portée finiraient par ne plus dire la même chose");
});

test("nommée sans parenthèse, elle dit ce qu'elle lit, sans ordre", () => {
  // Les deux formes existent, et ne répondent pas à la même question : nommée,
  // elle lit ses propres noms ; appelée, ceux qu'on lui donne.
  const ligne = "   calcule X = Couleur des volets";
  const aide = aideDeLaSignature(ligne, ligne.length, catalogue());

  assert.equal(aide.quoi, "nom");
  assert.equal(aide.appel, false);
  assert.deepEqual(aide.lit.map((une) => une.nom), ["Matière du volet"]);
  assert.equal(aide.rang, -1, "il n'y a pas de rang hors d'un appel");
});

test("une parenthèse ordinaire ne se prend pas pour un appel", () => {
  // `si (` et `alors (` ouvrent des parenthèses toute la journée : les
  // dénoncer ferait un écran qui crie à tort, et l'on cesserait de le lire.
  for (const ligne of ["   si (", "   alors (", "   calcule X = 2 * ("]) {
    const aide = aideDeLaSignature(ligne, ligne.length, catalogue());
    assert.ok(!aide?.appel, `« ${ligne} » passe pour un appel`);
  }
});

/* ── Ce que l'écran en fait ──────────────────────────────────────────────── */

test("l'aide se dessine, et se tait quand il n'y a rien à dire", () => {
  const ligne = "   si (Couleur des volets";
  const html = renderAideDeLaSignature(aideDeLaSignature(ligne, ligne.length, catalogue()));

  assert.match(html, /Couleur des volets/);
  assert.match(html, /bois, pvc, alu/);

  /**
   * **La tête dit à laquelle des deux questions elle répond.**
   *
   * « lit » devant un nom : voilà ce dont cette fonction a besoin. « s'écrit
   * avec » dans une signature : voilà ce qu'on tape entre les parenthèses. Les
   * dire pareil ferait lire « Couleur des volets lit zones », qui est faux.
   */
  assert.match(html, /<span>lit<\/span>/);
  assert.doesNotMatch(html, /s&#39;écrit avec|s'écrit avec/);

  const dansLaSignature = "fonction Couleur des volets(";
  const signature = renderAideDeLaSignature(
    aideDeLaSignature(dansLaSignature, dansLaSignature.length, catalogue()));
  assert.match(signature, /s&#39;écrit avec|s'écrit avec/);
  assert.doesNotMatch(signature, /<span>lit<\/span>/);
  assert.doesNotMatch(html, /pas d'appel/);

  assert.equal(renderAideDeLaSignature(null), "");
  assert.equal(renderAideDeLaSignature({ nom: "X", lit: [] }), "");
  assert.equal(renderAideDeLaSignature(), "");
});

test("la case où l'on écrit se voit dans le rendu", () => {
  const ligne = "fonction Couleur des volets(zones, ";
  const html = renderAideDeLaSignature(aideDeLaSignature(ligne, ligne.length, catalogue()));

  // Une seule, et c'est la seconde : `zones` est derrière nous.
  assert.equal((html.match(/est-actif/g) ?? []).length, 1);
  assert.match(html, /est-actif[^>]*>\s*<b>Matière du volet<\/b>/);
});

test("l'éditeur pose bien l'aide, et par la même écoute que la liste", async () => {
  /**
   * **Cette épreuve relit le source, et c'est l'exception qui le justifie.**
   *
   * Une aide parfaitement écrite que rien ne montre laisse exactement l'écran
   * d'avant, et une aide posée par une **seconde** écoute serait un second
   * endroit à se rappeler de rebrancher — le panneau des résultats a déjà coûté
   * ce défaut-là une fois.
   */
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const vue = readFileSync(
    fileURLToPath(new URL("../views/ui/propositions-de-saisie.js", import.meta.url)), "utf8");
  const saisie = readFileSync(
    fileURLToPath(new URL("../views/ui/saisie-de-code.js", import.meta.url)), "utf8");

  assert.match(saisie, /data-saisie-signature/, "la zone de code n'a nulle part où poser l'aide");
  assert.match(vue, /renderAideDeLaSignature\(aideDeLaSignature\(ligne, colonne, catalogue\)\)/,
    "l'aide n'est jamais calculée : rien ne paraîtrait");

  // Une seule écoute sur la frappe, et l'aide passe dedans.
  const debut = vue.indexOf("const montrer = () => {");
  assert.ok(debut > 0, "montrer est introuvable");
  assert.match(vue.slice(debut, vue.indexOf("\n  };", debut)), /signature\.hidden = !aide;/,
    "l'aide ne suit pas la frappe");
  assert.equal((vue.match(/zone\.addEventListener\("input"/g) ?? []).length, 1,
    "une seconde écoute sur la frappe : il y aurait deux endroits à rebrancher");
});

/* ── Ce qu'on obtient en la nommant ──────────────────────────────────────── */

test("l'aide dit ce que la fonction rend, et le dessine", () => {
  /**
   * **C'est l'autre moitié de la question.** Savoir qu'une fonction lit la
   * matière du volet ne dit pas si l'on obtient une couleur, une épaisseur en
   * centimètres ou un vrai/faux — et c'est ce qu'on veut savoir avant de la
   * nommer.
   */
  const ligne = "   si (Couleur des volets";
  const aide = aideDeLaSignature(ligne, ligne.length, catalogue());

  // `deduit: false` : c'est écrit, et l'écrite gagne toujours.
  assert.deepEqual(aide.rend, { valeurs: ["gris", "blanc"], unite: "", deduit: false });
  assert.match(renderAideDeLaSignature(aide), /rend\s*<span>gris, blanc<\/span>/);
  assert.doesNotMatch(renderAideDeLaSignature(aide), /déduit/);
});

test("une unité annoncée se dit comme une mesure", () => {
  const avecUnite = BROUILLON.replace('rend: "gris" ou "blanc"', "rend: kN");
  const ligne = "   si (Couleur des volets";
  const aide = aideDeLaSignature(ligne, ligne.length, catalogue(avecUnite));

  assert.deepEqual(aide.rend, { valeurs: [], unite: "kN", deduit: false });
  assert.match(renderAideDeLaSignature(aide), /une mesure en kN/);
});

test("sans `rend:`, ce qu'elle conclut se déduit — et se dit déduit", () => {
  /**
   * **On le déduisait pas du tout, et c'était un excès de prudence.** Une
   * fonction dont toutes les branches concluent « gris » ou « blanc » rend
   * visiblement l'un des deux, et le taire laissait l'écran muet là où il sait.
   *
   * Ce qu'on refusait vraiment était de **confondre les deux** : une promesse
   * déduite d'un texte qu'on est en train d'écrire change à chaque frappe, et
   * la présenter comme une promesse ferait compter sur un engagement que
   * personne n'a pris. Elle se dit donc « déduit », et l'écrite gagne toujours.
   */
  const sansRend = BROUILLON.replace('   rend: "gris" ou "blanc"\n\n', "");
  const ligne = "   si (Couleur des volets";
  const aide = aideDeLaSignature(ligne, ligne.length, catalogue(sansRend));

  assert.deepEqual(aide.rend, { valeurs: ["gris", "blanc"], unite: "", deduit: true });
  assert.match(renderAideDeLaSignature(aide), /gris, blanc \(déduit\)/);
});

test("ce qu'on ne peut pas déduire reste tu", () => {
  /**
   * `alors (Cubage)` nomme une locale : sa valeur dépend des réponses, et l'on
   * ne la connaît qu'au lancement. Deviner ferait annoncer des mètres sur une
   * fonction qui rend des euros (règle 5).
   */
  const ligne = "   si (Volume";
  const aide = aideDeLaSignature(ligne, ligne.length, catalogue());

  assert.equal(aide.rend, null);
  assert.doesNotMatch(renderAideDeLaSignature(aide), /rend/);
});
