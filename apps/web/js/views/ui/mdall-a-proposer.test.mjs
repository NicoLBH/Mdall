/**
 * L'écrivain partagé : ce que trois producteurs écriront, avant de proposer.
 *
 * **La boucle se ferme ici.** Ce que la voie déterministe écrit est relu par le
 * lecteur du projet, et ce qui en ressort est ce qu'on avait mis. Une épreuve
 * qui se contenterait de comparer des chaînes ne prouverait que ma propre idée
 * du langage ; celle-ci passe par `lireUnFichier`, qui est celui du projet.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { blocsAProposer, blocsDeLaProposition } from "./mdall-de-la-proposition.js";
import {
  SOUS_LE_TITRE, partDeLaProposition, phraseDeLaPart, renderBlocsMdall, renderMdallAProposer
} from "./mdall-a-proposer.js";
import { texteDeLaLigne, texteDesLignes } from "./code-mdall.js";
import { lireUnFichier } from "../../services/memoire-en-lecture.js";
import { domicilesDesNoms } from "../../services/memoire-domiciles.js";
import { NATURE } from "../../services/assertion-taxonomy.js";
import { PROVENANCE, STATUT } from "../../services/memoire-en-texte.js";

/** Ce qu'un producteur rend : des structures, jamais de la prose. */
const UNE_VALEUR = {
  sujet: "Altitude du site",
  valeur: "890 m",
  nature: NATURE.DONNEE_BASE,
  quoi: "La cote du terrain naturel au droit du bâtiment.",
  provenance: { type: PROVENANCE.DOCUMENT, quoi: "relevé topographique du 12 mars 2026" },
  citation: "cote NGF au droit du bâtiment A : 890,00 m",
  statut: STATUT.RETENU,
  zones: []
};

const UNE_REGLE = {
  sujet: "Classement du bâtiment",
  valeur: "3ᵉ famille B",
  referentiel: true,
  domaine: "incendie",
  regle: {
    conditions: [{ sujet: "Hauteur du dernier plancher", operateur: "<=", valeur: ["28"], unite: "m" }],
    sinon: "",
    sauf: []
  },
  provenance: { type: PROVENANCE.TEXTE, quoi: "arrêté du 31 janvier 1986" },
  statut: STATUT.RETENU,
  zones: []
};

/* ── Le même écrivain, une porte plus tôt ────────────────────────────────── */

test("une valeur s'écrit avec sa provenance et sa citation, pas seulement son chiffre", () => {
  // C'est tout l'objet du lot : « Proposer 3 valeurs au projet » ne disait ni
  // sous quel nom, ni d'où elles viennent, ni dans quel fichier elles iront.
  const [bloc] = blocsAProposer([UNE_VALEUR], {});
  const dit = texteDesLignes(bloc.lignes);

  assert.match(dit, /Altitude du site = 890 m \{/);
  assert.match(dit, /document: relevé topographique du 12 mars 2026/);
  assert.match(dit, /parce que: "cote NGF au droit du bâtiment A : 890,00 m"/);
  assert.match(dit, /statut: retenu/);
});

test("une règle s'écrit comme une fonction, avec ce qu'elle lit et ce qu'elle conclut", () => {
  const [bloc] = blocsAProposer([UNE_REGLE], {});
  const dit = texteDesLignes(bloc.lignes);

  assert.match(dit, /^fonction Classement du bâtiment\(zones, Hauteur du dernier plancher\) \{/);
  assert.match(dit, /importe \(variable: Hauteur du dernier plancher/);
  assert.match(dit, /si \(Hauteur du dernier plancher <= 28 m\)/);
  assert.match(dit, /alors \("3ᵉ famille B"\)/);
});

test("chaque bloc dit dans quel fichier il ira", () => {
  const [valeur] = blocsAProposer([UNE_VALEUR], {});
  const [regle] = blocsAProposer([UNE_REGLE], {});

  assert.match(valeur.fichier, /\.ddb$/);
  // Une règle vit dans le `.ref` de son domaine : elle explique la valeur, elle
  // ne la porte pas.
  assert.match(regle.fichier, /incendie\.ref$/);
});

test("un nom déjà versé garde son domicile : il ne déménage pas au second versement", () => {
  // Sans le registre, l'aperçu annoncerait le fichier que la ligne vise, et non
  // celui où elle vit — et l'on verrait une valeur changer de fichier (règle 10).
  const domiciles = domicilesDesNoms([{
    subject_key: "altitude-du-site",
    nature: NATURE.HYPOTHESE,
    payload: { subject: "Altitude du site", value: "490 m" }
  }]);

  const [chezLui] = blocsAProposer([UNE_VALEUR], { ouEcrit: domiciles });
  const [sansRegistre] = blocsAProposer([UNE_VALEUR], {});

  assert.match(chezLui.fichier, /\.hyp$/);
  assert.notEqual(chezLui.fichier, sansRegistre.fichier);
});

test("le « importe » d'une règle nomme le fichier où le nom vit vraiment", () => {
  // C'est ce que le registre sert à dire. Sans lui, la fonction déclare lire
  // dans `variables-du-projet.ref` un nom qui habite un `.ddb` : la ligne se
  // lit, elle est fausse, et rien ne le signale (règle 10).
  const domiciles = domicilesDesNoms([{
    subject_key: "hauteur-du-dernier-plancher",
    nature: NATURE.DONNEE_BASE,
    payload: { subject: "Hauteur du dernier plancher", value: "24 m" }
  }]);

  const avec = texteDesLignes(blocsAProposer([UNE_REGLE], { ouEcrit: domiciles })[0].lignes);
  const sans = texteDesLignes(blocsAProposer([UNE_REGLE], {})[0].lignes);

  assert.match(avec, /importe \(variable: Hauteur du dernier plancher, depuis: [^,]*\.ddb,/);
  // Et sans registre, la fonction ne sait pas : elle renvoie au fichier des
  // noms, qui est la réponse par défaut — pas une invention.
  assert.match(sans, /depuis: variables-du-projet\.ref,/);
});

test("rien n'est comparé à la mémoire, et l'aperçu ne prétend pas le contraire", () => {
  // Dire « Nouveau » affirmerait que le projet ne porte pas déjà ce sujet, ce
  // que personne n'a vérifié (règle 5). Le tableau le dira, après.
  for (const bloc of blocsAProposer([UNE_VALEUR, UNE_REGLE], {})) {
    assert.equal(bloc.changement, "inconnu", bloc.sujet);
    assert.equal(bloc.sansBloc, "", bloc.sujet);
  }
});

test("une affirmation sans valeur n'écrit rien : l'atelier l'écarte, et l'aperçu aussi", () => {
  // L'aperçu passe par `itemsDeProposition`, l'appel même que le clic fera :
  // montrer une ligne que la proposition ne porterait pas serait pire que de ne
  // rien montrer.
  assert.deepEqual(blocsAProposer([{ sujet: "Un nom nu", valeur: "" }], {}), []);
  assert.deepEqual(blocsAProposer([], {}), []);
  assert.deepEqual(blocsAProposer(null, {}), []);
});

test("deux affirmations de même clé ne font qu'un bloc", () => {
  // La base tient `(proposition_id, item_type, item_key)` pour unique : montrer
  // deux blocs là où une seule ligne partira ferait un aperçu qui ment.
  const blocs = blocsAProposer([UNE_VALEUR, { ...UNE_VALEUR, valeur: "900 m" }], {});
  assert.equal(blocs.length, 1);
  assert.match(texteDesLignes(blocs[0].lignes), /890 m/);
});

/* ── La boucle : lire(écrire(G)) = G ─────────────────────────────────────── */

test("ce que la voie déterministe écrit se relit, sans un seul refus", () => {
  // C'est ce que les deux voies partagent, et c'est l'essentiel : rien ne
  // s'affiche comme du Mdall valable sans avoir été relu par le lecteur du
  // projet. Pour la voie A, c'est gratuit — et voici la preuve.
  for (const bloc of blocsAProposer([UNE_VALEUR, UNE_REGLE], {})) {
    const lu = lireUnFichier(texteDesLignes(bloc.lignes));
    assert.deepEqual(lu.refus, [], `${bloc.sujet} : ${JSON.stringify(lu.refus)}`);
    assert.equal(lu.blocs.length, 1, bloc.sujet);
  }
});

test("et ce qui se relit est ce qu'on avait mis", () => {
  const [valeur, regle] = blocsAProposer([UNE_VALEUR, UNE_REGLE], {});

  const [relue] = lireUnFichier(texteDesLignes(valeur.lignes)).blocs;
  assert.equal(relue.sujet, "Altitude du site");
  assert.equal(relue.valeur, "890");
  assert.equal(relue.unite, "m");
  assert.equal(relue.statut, STATUT.RETENU);
  assert.equal(relue.provenance.type, PROVENANCE.DOCUMENT);
  assert.equal(relue.preuve, "cote NGF au droit du bâtiment A : 890,00 m");

  const [relit] = lireUnFichier(texteDesLignes(regle.lignes)).blocs;
  assert.equal(relit.sujet, "Classement du bâtiment");
  assert.equal(relit.alors, "3ᵉ famille B");
  assert.deepEqual(relit.conditions.map((une) => une.sujet), ["Hauteur du dernier plancher"]);
  assert.equal(relit.conditions[0].operateur, "<=");
  assert.equal(relit.conditions[0].unite, "m");
});

/* ── Les jetons remis en texte ───────────────────────────────────────────── */

test("une ligne en texte nu est la ligne telle qu'elle se tape", () => {
  const [bloc] = blocsAProposer([UNE_VALEUR], {});
  assert.equal(texteDeLaLigne(bloc.lignes[0]), "Altitude du site = 890 m {");
  // L'indentation fait partie du langage : trois espaces, et le lecteur s'en sert.
  assert.match(texteDeLaLigne(bloc.lignes[1]), /^ {3}\S/);
});

test("ce qui n'a pas de jetons rend une ligne vide, pas une exception", () => {
  assert.equal(texteDeLaLigne(null), "");
  assert.equal(texteDeLaLigne({}), "");
  assert.equal(texteDesLignes(null), "");
});

/* ── Le panneau : quatre écrans, un seul ─────────────────────────────────── */

test("sans bloc, le panneau n'existe pas plutôt que d'être un cadre vide", () => {
  // Un cadre vide sous « ce que la mémoire écrira » laisserait croire qu'elle
  // n'écrira rien, alors qu'on n'a simplement rien à montrer.
  assert.equal(renderMdallAProposer([], {}), "");
  assert.equal(renderBlocsMdall([]), "");
  assert.equal(renderBlocsMdall(null), "");
});

test("les règles s'ouvrent, les valeurs restent repliées", () => {
  // Quarante blocs dépliés feraient une page qu'on fait défiler sans la lire.
  // Une valeur se lit ailleurs ; un raisonnement ne se lit nulle part.
  const html = renderBlocsMdall(blocsAProposer([UNE_VALEUR, UNE_REGLE], {}));
  const details = html.match(/<details class="mdall-bloc"[^>]*>/g);

  assert.equal(details.length, 2);
  assert.equal(details.filter((un) => un.includes(" open")).length, 1);
});

test("le panneau reprend les classes qui existent, et n'en invente pas", () => {
  // « Il faut mutualiser ces classes, c'est pénible sinon de toujours tout
  //   recalibrer entre les différents écrans. »
  const html = renderMdallAProposer(blocsAProposer([UNE_VALEUR], {}), {});

  // Comparées **entières** : `"review-block` passerait sur
  // `"review-block__head`, et une classe inventée pour le cadre ne se verrait
  // pas — c'est exactement le genre d'épreuve muette qu'on ne veut pas.
  for (const classe of ["review-block", "review-panel", "mdall-blocs", "mdall-bloc"]) {
    assert.ok(new RegExp(`class="${classe}[ "]`).test(html), `classe absente : ${classe}`);
  }
});

test("le compte est celui des blocs, et le sous-titre dit si quelque chose est déjà proposé", () => {
  const blocs = blocsAProposer([UNE_VALEUR, UNE_REGLE], {});

  const avant = renderMdallAProposer(blocs, {});
  assert.match(avant, /review-block__count">2</);
  assert.match(avant, /Rien n&#39;est demandé tant qu&#39;on n&#39;a pas cliqué/);

  const proposee = renderMdallAProposer(blocs, { quoi: SOUS_LE_TITRE.PROPOSEE });
  assert.match(proposee, /rien n&#39;est encore écrit/);
});

test("ce qu'un producteur a nommé est échappé, jamais injecté", () => {
  // Un sujet vient d'un compte rendu, d'un mail, d'une réponse de formulaire :
  // c'est du texte que personne n'a relu.
  const html = renderMdallAProposer(
    blocsAProposer([{ ...UNE_VALEUR, sujet: "<img src=x onerror=\"x\">" }], {}),
    { titre: "<script>alert(1)</script>" }
  );

  assert.doesNotMatch(html, /<img /);
  assert.doesNotMatch(html, /<script>/);
});

/* ── Ce qu'une proposition porte : la mémoire d'un côté, le suivi de l'autre ── */

/** Ce qu'une lecture de compte rendu rend : de l'intendance, et rien d'autre. */
const DU_SUIVI = [
  { itemType: "document", itemKey: "d-1", payload: { filename: "CR12.pdf" } },
  { itemType: "sujet", itemKey: "p-1", payload: { titre: "Reprendre l'acrotère" } },
  { itemType: "sujet", itemKey: "p-2", payload: { titre: "Reprise en sous-œuvre" } },
  { itemType: "lot", itemKey: "3", payload: { intitule: "Charpente" } }
];

test("le suivi se compte par nature, et n'entre pas dans la mémoire", () => {
  const part = partDeLaProposition(DU_SUIVI);

  assert.deepEqual(part.memoire, []);
  assert.deepEqual(part.suivi, [
    { nature: "document", combien: 1 },
    { nature: "sujet", combien: 2 },
    { nature: "lot", combien: 1 }
  ]);
});

test("zéro valeur se dit, et ne se tait pas", () => {
  // C'est l'information : ce dépôt ne touche pas à la mémoire du projet, et
  // rien d'autre ne le dirait. Celui qui vient de voir le Copilote écrire du
  // Mdall croirait sinon que le compte rendu en écrit aussi.
  const dit = phraseDeLaPart(partDeLaProposition(DU_SUIVI));

  assert.match(dit, /1 document/);
  assert.match(dit, /2 sujets à ouvrir/);
  assert.match(dit, /Rien n'entre dans la mémoire du projet/);
});

test("des valeurs se comptent à part, et se disent au singulier comme au pluriel", () => {
  const une = phraseDeLaPart(partDeLaProposition([UNE_VALEUR]));
  assert.match(une, /1 ligne entrera dans la mémoire du projet/);
  assert.doesNotMatch(une, /lignes entreront/);

  const deux = phraseDeLaPart(partDeLaProposition([UNE_VALEUR, UNE_REGLE]));
  assert.match(deux, /2 lignes entreront dans la mémoire du projet/);
});

test("mémoire et suivi se lisent ensemble quand une proposition porte les deux", () => {
  const dit = phraseDeLaPart(partDeLaProposition([...DU_SUIVI, {
    itemType: "base_datum", itemKey: "altitude-du-site",
    payload: { subject: "Altitude du site", value: "890 m", nature: NATURE.DONNEE_BASE }
  }]));

  assert.match(dit, /1 document/);
  assert.match(dit, /1 ligne entrera dans la mémoire/);
  assert.doesNotMatch(dit, /ne porte que du suivi/);
  // Et la valeur ne se compte **qu'une fois** : la voir passer aussi dans le
  // suivi ferait lire « 1 donnée de base » à côté de « 1 ligne entrera ».
  assert.deepEqual(
    partDeLaProposition([...DU_SUIVI, {
      itemType: "base_datum", itemKey: "altitude-du-site",
      payload: { subject: "Altitude du site", value: "890 m", nature: NATURE.DONNEE_BASE }
    }]).suivi.map((un) => un.nature).sort(),
    ["document", "lot", "sujet"]
  );
});

test("le compte part des lignes qui partiront, pas d'une liste tenue à côté", () => {
  // Deux comptes pour la même question : on promet une chose et l'on en propose
  // une autre, et c'est celui qu'on ne regarde pas qui a raison (règle 4).
  // Deux affirmations de même clé ne font qu'une ligne — et donc qu'une.
  const part = partDeLaProposition([UNE_VALEUR, { ...UNE_VALEUR, valeur: "900 m" }]);
  assert.equal(part.memoire.length, 1);
});

test("rien à porter ne compte pas des zéros", () => {
  assert.deepEqual(partDeLaProposition([]), { memoire: [], suivi: [] });
  assert.deepEqual(partDeLaProposition(null), { memoire: [], suivi: [] });
  assert.equal(phraseDeLaPart(partDeLaProposition([])), "");
});

test("l'intendance ne passe pas par l'écrivain : elle n'a pas de Mdall", () => {
  // Un sujet ouvert, un lot, un label : des mouvements du suivi, pas des
  // valeurs du projet. Leur écrire un bloc rendrait des blocs sans nom ni
  // valeur, qui se liraient comme une mémoire qu'on s'apprête à écrire.
  assert.deepEqual(blocsAProposer(DU_SUIVI, {}), []);

  // Et ce qui affirme quelque chose passe, même mêlé à du suivi.
  const blocs = blocsAProposer([...DU_SUIVI, {
    itemType: "base_datum", itemKey: "altitude-du-site",
    payload: { subject: "Altitude du site", value: "890 m", nature: NATURE.DONNEE_BASE }
  }], {});
  assert.deepEqual(blocs.map((un) => un.sujet), ["Altitude du site"]);
});

/* ── Les quatre crans de la traduction ───────────────────────────────────── */

/**
 * **Le panneau montre la chaîne, et non une pile de blocs.**
 *
 * C'est le défaut D2 du plan : on voyait le PDF, puis du Mdall, et les quatre
 * crans entre les deux n'étaient nommés nulle part. La transcription avait
 * l'air d'un tour de magie — et un tour de magie n'est pas rassurant.
 */
test("les blocs se rangent sous les quatre crans, nommés et numérotés", () => {
  const html = renderBlocsMdall(blocsAProposer([UNE_VALEUR, UNE_REGLE], {}));

  for (const [rang, libelle] of [
    [1, "Les données"], [2, "Les contraintes"],
    [3, "Les fonctions"], [4, "Les chemins entre fonctions"]
  ]) {
    assert.ok(html.includes(`${rang}. ${libelle}`), `le cran « ${libelle} » n'est pas nommé`);
  }

  // Chaque cran porte sa question : sans elle, un titre n'explique rien.
  assert.match(html, /Qu&#39;est-ce que ce document affirme/);
  assert.match(html, /Quelle règle, souvent implicite/);
});

test("une règle va au cran des fonctions, une valeur à celui des données", () => {
  const html = renderBlocsMdall(blocsAProposer([UNE_VALEUR, UNE_REGLE], {}));

  // Le sujet de la règle doit apparaître **après** le titre du cran 3, et celui
  // de la valeur après le titre du cran 1. Comparer les positions est la seule
  // façon de vérifier un rangement sur du HTML.
  const ou = (quoi) => html.indexOf(quoi);
  assert.ok(ou("1. Les données") < ou("Altitude du site"));
  assert.ok(ou("Altitude du site") < ou("3. Les fonctions"));
  assert.ok(ou("3. Les fonctions") < ou("Classement du bâtiment"));
});

/**
 * **Un cran vide se nomme**, et c'est la règle qui fait tout l'intérêt du
 * groupement : sans elle, grouper ne déplacerait que des cartes.
 */
test("un cran sans bloc dit ce que son absence veut dire", () => {
  const html = renderBlocsMdall(blocsAProposer([UNE_VALEUR], {}));

  // Ni contrainte ni fonction dans ce dépôt : les deux crans restent, avec leur
  // phrase. Un groupe absent se lirait « cela va de soi ».
  assert.match(html, /Ce document n&#39;apporte aucune contrainte/);
  assert.match(html, /Aucune règle n&#39;a été relevée ici/);
  assert.match(html, /Aucune fonction n&#39;emploie ce qu&#39;une autre conclut/);
});

test("un chemin entre deux fonctions se lit en une phrase", () => {
  // La règle d'incendie lit « Hauteur du dernier plancher ». On en ajoute une
  // seconde qui conclut ce nom-là : le chemin apparaît, et c'est le cran 4.
  const amont = {
    sujet: "Hauteur du dernier plancher",
    valeur: "26 m",
    referentiel: true,
    domaine: "incendie",
    regle: {
      conditions: [{ sujet: "Altitude du site", operateur: ">", valeur: ["0"], unite: "m" }],
      sinon: "", sauf: []
    },
    provenance: { type: PROVENANCE.TEXTE, quoi: "arrêté du 31 janvier 1986" },
    statut: STATUT.RETENU,
    zones: []
  };

  const html = renderBlocsMdall(blocsAProposer([amont, UNE_REGLE], {}));

  assert.match(html, /4\. Les chemins entre fonctions/);
  assert.match(html,
    /« Classement du bâtiment » emploie « Hauteur du dernier plancher »/);
  assert.match(html, /que « Hauteur du dernier plancher » conclut/);
});

/**
 * **Les blocs sans cran se montrent, et sous leur propre titre.**
 *
 * Une ligne refusée en revue, une affirmation retirée, une ligne dont la mémoire
 * n'a pas pu être lue : elles portent `sansBloc`, donc aucun code, donc aucun
 * cran. Les fondre dans « les données » les ferait compter dans un groupe qui
 * annonce ce que la mémoire écrira — alors qu'elles sont exactement ce qu'elle
 * n'écrira pas.
 *
 * La batterie de mutations a trouvé le trou : faire disparaître cette section
 * ne faisait tomber aucune épreuve, parce qu'aucune n'en rendait une.
 */
test("un bloc sans code se montre sous « Le reste », et non dans un cran", () => {
  const refusee = blocsDeLaProposition([{
    cle: "type-de-couverture",
    sujet: "Type de couverture",
    changement: "nouveau",
    refusee: true,
    porteur: {
      item_key: "Type de couverture", nature: "constat",
      payload: { subject: "Type de couverture", value: "tuiles", nature: "constat" }
    }
  }]);

  const html = renderBlocsMdall(refusee);

  assert.match(html, /Le reste/, "un bloc sans code disparaît de l'écran");
  assert.match(html, /Qu&#39;est-ce que la lecture n&#39;a pas su ranger/);
  // Et il ne compte pas dans les données : le cran 1 reste vide et le dit.
  assert.match(html, /Ce document n&#39;affirme aucune valeur/);
  assert.match(html, /1 bloc dont le cran n&#39;est pas déterminé/);
  // La phrase du refus vient du registre partagé, pas d'ici.
  assert.match(html, /Refusée pendant la revue/);
});

test("la phrase du haut compte par cran, et ne fond rien", () => {
  const html = renderBlocsMdall(blocsAProposer([UNE_VALEUR, UNE_REGLE], {}));
  // « 2 blocs » seul ne dirait pas ce qui a été compris : une donnée et une
  // fonction, ce n'est pas deux données.
  assert.match(html, /1 donnée · 1 fonction/);
  assert.doesNotMatch(html, /2 blocs/);
});

/**
 * **Aucune classe neuve.**
 *
 * > « Il faut mutualiser ces classes, c'est pénible sinon de toujours tout
 * >   recalibrer entre les différents écrans. »
 *
 * Les crans reprennent `forme-suite`, qui donne déjà la forme — une colonne, un
 * filet en haut, un titre. L'épreuve relève **toutes** les classes du rendu et
 * les confronte à celles de la feuille de style : une classe inventée pour un
 * cran ne se verrait autrement qu'à l'œil, sur un écran qu'on n'ouvre pas tous
 * les jours.
 */
test("les crans n'inventent aucune classe", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const style = readFileSync(
    fileURLToPath(new URL("../../../style.css", import.meta.url)), "utf8");

  const html = renderBlocsMdall(blocsAProposer([UNE_VALEUR, UNE_REGLE], {}));
  const classes = new Set([...html.matchAll(/class="([^"]+)"/g)]
    .flatMap((un) => un[1].split(/\s+/))
    .filter(Boolean));

  assert.ok(classes.size >= 8, `trop peu de classes relevées : ${[...classes].join(" ")}`);
  for (const classe of classes) {
    assert.ok(style.includes(`.${classe}`),
      `« ${classe} » n'est pas dans la feuille de style : il faudrait la recalibrer à la main`);
  }
});
