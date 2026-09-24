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

import { blocsAProposer } from "./mdall-de-la-proposition.js";
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
