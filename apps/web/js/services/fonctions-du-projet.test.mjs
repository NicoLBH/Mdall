/**
 * Se servir, en écrivant, d'une fonction que le projet a déjà signée.
 *
 * **C'était la seule chose du projet qu'on ne pouvait pas réutiliser.** On relit
 * sa règle dans l'écran des fichiers, on la voit conclure — et en ouvrant
 * « Écrire du Mdall » pour s'en servir, elle n'existait plus. Il fallait la
 * recopier, c'est-à-dire lui donner un second domicile.
 *
 * **Les fonctions versées viennent d'un vrai versement**, jamais d'objets
 * façonnés ici : une charge écrite à la main prendrait les hypothèses du code
 * pour des faits — et c'est précisément ce qui masquerait qu'un champ du
 * versement ne voyage pas.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { aProposerDuBrouillon } from "./proposition-du-brouillon.js";
import {
  blocDeLaRegleVersee, nomsConclusParLeProjet, reglesVerseesUtiles
} from "./fonctions-du-projet.js";
import { catalogueDesNoms, nomsLisiblesDIci, ORIGINE } from "./catalogue-des-noms.js";
import { contexteDuBrouillon, propositionsDeSaisie, QUOI } from "./mdall-completion.js";
import { champsDuBrouillon } from "./formulaire-du-brouillon.js";
import { lancerLeBrouillon, FICHIER_DU_PROJET } from "./bac-dessai.js";

const PRIX_UNITAIRE = `fonction Prix unitaire du volet(zones, Couleur des volets) {
   // Le tarif du fournisseur, par couleur.
   selon (Couleur des volets)
   | gris  | 120 € |
   | blanc | 90 €  |
}
`;

const ABAQUE = `courbe Coefficient de forme(zones, Pente du versant) {
   entre les points: linéaire
   hors bornes: refuse
   |  0° | 0,8 |
   | 60° | 0   |
}
`;

/** La mémoire du projet, telle qu'un vrai versement l'écrit. */
const memoireDe = (...sources) => sources.map((source, rang) => {
  const payload = aProposerDuBrouillon([{ nom: "essai.ref", contenu: source }]).affirmations[0];
  return {
    id: `r-${rang}`, subject_key: `regle:${payload.sujet}`,
    status: "assumed", superseded_by: null, zones: null,
    payload: { ...payload, subject: payload.sujet, value: payload.valeur }
  };
});

/** Un brouillon qui lit ce que le projet conclut. */
const BROUILLON = `fonction Prix des volets(zones, Nombre de volets) {
   calcule Prix des volets = Nombre de volets * Prix unitaire du volet;
   si (Prix des volets > 0 €)
   alors (Prix des volets);
}
`;
const FICHIERS = [{ nom: "essai.ref", contenu: BROUILLON }];

/* ── Ce que la mémoire rend du raisonnement versé ────────────────────────── */

test("une règle versée se remonte en bloc, entière", () => {
  /**
   * **C'est l'exacte réciproque du versement** : la proposition avait démonté
   * le bloc, on le remonte. Tant qu'un seul champ manque des deux côtés, une
   * fonction versée se rejoue **plus simple qu'elle n'est** — et rien ne le
   * dit, puisque ce qui reste est juste.
   */
  const [assertion] = memoireDe(PRIX_UNITAIRE);
  const bloc = blocDeLaRegleVersee(assertion);

  assert.equal(bloc.sujet, "Prix unitaire du volet");
  assert.deepEqual(bloc.selon, ["Couleur des volets"]);
  assert.equal(bloc.alors, "120 €", "l'unité de ce qu'un barème conclut est perdue");
  assert.equal(bloc.sinonSi[0].alors, "90 €");
  assert.deepEqual(bloc.conditions[0].valeur, ["gris"]);
});

test("un abaque versé se remonte avec ses points et ses déclarations", () => {
  const bloc = blocDeLaRegleVersee(memoireDe(ABAQUE)[0]);
  assert.equal(bloc.courbe?.entre, "linéaire");
  assert.equal(bloc.courbe?.hors, "refuse");
  assert.equal(bloc.courbe?.points?.length, 2);
});

test("le projet dit ce qu'il conclut, et sous quelle forme", () => {
  const noms = nomsConclusParLeProjet(memoireDe(PRIX_UNITAIRE, ABAQUE));

  assert.deepEqual(noms.map((une) => une.nom), ["Prix unitaire du volet", "Coefficient de forme"]);
  assert.deepEqual(noms[0].lit, ["Couleur des volets"]);
  // On ne relit pas un abaque comme une cascade de « si » : la fiche le dit
  // avant qu'on l'ouvre.
  assert.deepEqual(noms.map((une) => une.forme), ["barème", "courbe"]);
});

test("on ne prend que les règles dont le brouillon a besoin", () => {
  /**
   * **Trois cents règles versées rendraient trois cents verdicts**, et celui
   * qu'on cherchait serait quelque part au milieu. On part de ce que le
   * brouillon lit, et l'on suit la chaîne.
   */
  const memoire = memoireDe(PRIX_UNITAIRE, ABAQUE);

  const utiles = reglesVerseesUtiles(memoire, { lus: ["Prix unitaire du volet"], conclus: [] });
  assert.deepEqual(utiles.map((une) => une.bloc.sujet), ["Prix unitaire du volet"]);

  // Rien de lu, rien à rejouer.
  assert.deepEqual(reglesVerseesUtiles(memoire, { lus: [], conclus: [] }), []);
  assert.deepEqual(reglesVerseesUtiles([], { lus: ["Prix unitaire du volet"] }), []);
});

test("une chaîne versée se suit de proche en proche", () => {
  // Une règle versée lit ce qu'une autre règle versée conclut : la chaîne se
  // rejoue entière, ou elle ne se rejoue pas.
  const memoire = memoireDe(PRIX_UNITAIRE, `fonction Couleur des volets(zones, Matière du volet) {
   selon (Matière du volet)
   | bois | "gris"  |
   | pvc  | "blanc" |
}
`);

  const utiles = reglesVerseesUtiles(memoire, { lus: ["Prix unitaire du volet"], conclus: [] });
  assert.deepEqual(utiles.map((une) => une.bloc.sujet),
    ["Prix unitaire du volet", "Couleur des volets"]);
});

test("ce que le brouillon conclut lui-même gagne, et n'est pas repris du projet", () => {
  /**
   * **On écrit peut-être une nouvelle version de cette fonction-là**, et c'est
   * celle qu'on essaie qui doit répondre. Reprendre celle d'hier ferait un bac
   * d'essai qui ignore ce qu'on vient de taper — et l'on chercherait longtemps
   * pourquoi le verdict ne bouge pas.
   */
  const utiles = reglesVerseesUtiles(memoireDe(PRIX_UNITAIRE), {
    lus: ["Prix unitaire du volet"], conclus: ["Prix unitaire du volet"]
  });
  assert.deepEqual(utiles, []);
});

test("une règle remplacée ne revient pas", () => {
  /**
   * **C'est le pire retour possible.** Une fonction qu'on a corrigée par une
   * proposition signée reviendrait proposer sa version d'avant, sous le même
   * nom, dans la liste où l'on choisit sans relire. Le projet tiendrait une
   * règle et l'écran d'écriture en rejouerait une autre.
   */
  const [ancienne] = memoireDe(PRIX_UNITAIRE);
  const [nouvelle] = memoireDe(`fonction Prix unitaire du volet(zones, Couleur des volets) {
   selon (Couleur des volets)
   | gris  | 150 € |
   | blanc | 100 € |
}
`);

  const memoire = [
    { ...ancienne, id: "r-ancienne", superseded_by: "r-nouvelle" },
    { ...nouvelle, id: "r-nouvelle" }
  ];

  assert.deepEqual(nomsConclusParLeProjet(memoire).map((une) => une.nom),
    ["Prix unitaire du volet"]);

  // Et c'est bien la nouvelle qu'on rejoue.
  const utiles = reglesVerseesUtiles(memoire, { lus: ["Prix unitaire du volet"] });
  assert.equal(utiles.length, 1);
  assert.equal(utiles[0].bloc.alors, "150 €", "la version remplacée est revenue");
});

test("deux règles du même sujet ne se proposent qu'une fois", () => {
  /**
   * **Un projet conclut « Couleur des volets » par bâtiment**, et sa mémoire
   * porte donc plusieurs règles pour ce nom. L'écran d'écriture n'a pas de
   * zone — on y essaie une fonction, pas un ouvrage —, et il ne peut donc pas
   * choisir. Il en prend **une**, et une seule : deux fiches du même nom dans
   * le catalogue se choisiraient au hasard, et deux verdicts du même sujet dans
   * l'essai ne diraient pas lequel fait foi.
   *
   * Ce que cela laisse dehors est dit dans `à traiter plus tard`, plutôt que
   * deviné ici.
   */
  const [pourA] = memoireDe(PRIX_UNITAIRE);
  const [pourB] = memoireDe(`fonction Prix unitaire du volet(zones, Couleur des volets) {
   selon (Couleur des volets)
   | gris  | 200 € |
   | blanc | 180 € |
}
`);
  const memoire = [
    { ...pourA, id: "r-a", zones: ["batiment-a"] },
    { ...pourB, id: "r-b", zones: ["batiment-b"] }
  ];

  assert.equal(nomsConclusParLeProjet(memoire).length, 1);

  const utiles = reglesVerseesUtiles(memoire, { lus: ["Prix unitaire du volet"] });
  assert.equal(utiles.length, 1);

  /**
   * **C'est la plus récente qui répond, et c'est un choix, pas un hasard.**
   *
   * Entre deux **zones**, il n'y a pas de bon choix : sans zone, rien ne les
   * distingue. Ce qui compte est que ce soit **stable** — un essai dont le
   * verdict change d'une frappe à l'autre selon l'ordre où la base a rendu ses
   * lignes serait pire qu'un essai qui se trompe toujours pareil.
   *
   * Entre deux **versions du même sujet**, en revanche, il y en a un seul : la
   * dernière. C'est elle qu'on reprend pour corriger, et c'est pour elle que
   * ce départage a cessé d'être « la première rendue » — voir `reglesParSujet`.
   * Le même juge répond aux deux questions, parce qu'il n'y en a qu'une :
   * laquelle fait foi (règle 4).
   */
  assert.equal(utiles[0].bloc.alors, "200 €", "ce n'est plus la plus récente qui répond");

  // Et l'essai ne rend qu'un verdict pour ce sujet : deux ne diraient pas
  // lequel fait foi.
  const rendu = lancerLeBrouillon(FICHIERS,
    { "Nombre de volets": "4", "Couleur des volets": "gris" }, { memoire });
  assert.equal(rendu.filter((un) => un.sujet === "Prix unitaire du volet").length, 1);
  assert.equal(rendu.find((un) => un.sujet === "Prix des volets")?.valeur, "800 €");
});

/* ── Ce que l'écriture en fait ───────────────────────────────────────────── */

test("une fonction versée paraît au catalogue, et se propose sous le curseur", () => {
  /**
   * **C'est toute la différence avec l'établi** : un utilitaire de l'établi se
   * parcourt et ne se propose pas, parce qu'il ne se lit pas d'ici. Une
   * fonction versée conclut vraiment, dans ce projet.
   */
  const projet = nomsConclusParLeProjet(memoireDe(PRIX_UNITAIRE));
  const catalogue = catalogueDesNoms({ fichiers: FICHIERS, projet });

  const sienne = catalogue.find((une) => une.nom === "Prix unitaire du volet");
  assert.equal(sienne?.origine, ORIGINE.PROJET);
  assert.deepEqual(sienne.lit, ["Couleur des volets"]);

  // Elle se lit d'ici — contrairement à l'établi.
  assert.ok(nomsLisiblesDIci(catalogue).some((une) => une.origine === ORIGINE.PROJET));

  // Et sous le curseur, elle dit ce qu'elle est : pas « nom du projet », qui se
  // lirait comme une valeur versée.
  const trouvees = propositionsDeSaisie({
    ligne: "   si (Prix unit", colonne: 16, catalogue
  });
  assert.equal(trouvees[0].texte, "Prix unitaire du volet");
  assert.equal(trouvees[0].quoi, QUOI.VERSE);
});

test("une fonction du brouillon qui porte le même nom passe devant celle du projet", () => {
  // Le catalogue ne doit pas offrir deux fois le même nom, et c'est la version
  // qu'on écrit qui répond.
  const meme = [{ nom: "essai.ref", contenu: PRIX_UNITAIRE }];
  const catalogue = catalogueDesNoms({
    fichiers: meme, projet: nomsConclusParLeProjet(memoireDe(PRIX_UNITAIRE))
  });

  const siennes = catalogue.filter((une) => une.nom === "Prix unitaire du volet");
  assert.equal(siennes.length, 1);
  assert.equal(siennes[0].origine, ORIGINE.CONCLU);
});

test("le contexte du brouillon transporte ce que le projet conclut", () => {
  // Le câblage : un service qui sait lire la mémoire et un contexte qui ne la
  // lui demande pas rendent exactement l'écran d'avant.
  const contexte = contexteDuBrouillon(FICHIERS, {
    contenu: BROUILLON, position: BROUILLON.length,
    projet: nomsConclusParLeProjet(memoireDe(PRIX_UNITAIRE))
  });
  assert.ok(contexte.catalogue.some((une) => une.origine === ORIGINE.PROJET));

  // Sans projet, le rayon ne paraît pas : il se tait plutôt que d'annoncer un
  // projet vide.
  const sans = contexteDuBrouillon(FICHIERS, { contenu: BROUILLON, position: BROUILLON.length });
  assert.ok(!sans.catalogue.some((une) => une.origine === ORIGINE.PROJET));
});

/* ── Ce que l'essai en fait ──────────────────────────────────────────────── */

test("le formulaire cesse de demander ce que le projet déduit, et demande ce qu'il lit", () => {
  /**
   * **Les deux moitiés comptent.** Sans la première, on tape à la main la
   * réponse qu'on avait signée ; sans la seconde, le formulaire n'offre aucun
   * moyen de faire varier ce qu'on essaie, et le verdict ne bouge jamais.
   */
  const memoire = memoireDe(PRIX_UNITAIRE);

  assert.deepEqual(champsDuBrouillon(FICHIERS).map((un) => un.nom),
    ["Nombre de volets", "Prix unitaire du volet"]);
  assert.deepEqual(champsDuBrouillon(FICHIERS, { memoire }).map((un) => un.nom),
    ["Nombre de volets", "Couleur des volets"]);
});

test("l'essai rejoue la fonction versée sur les réponses qu'on donne", () => {
  /**
   * **Et non sur ce que le projet tient déjà.** Une valeur versée pour
   * « Prix unitaire du volet » serait celle d'une autre couleur que celle qu'on
   * essaie : on lirait un résultat qui ne correspond pas à ce qu'on a tapé.
   */
  const memoire = memoireDe(PRIX_UNITAIRE);

  const gris = lancerLeBrouillon(FICHIERS,
    { "Nombre de volets": "4", "Couleur des volets": "gris" }, { memoire });
  assert.equal(gris.find((un) => un.sujet === "Prix des volets")?.valeur, "480 €");

  const blanc = lancerLeBrouillon(FICHIERS,
    { "Nombre de volets": "4", "Couleur des volets": "blanc" }, { memoire });
  assert.equal(blanc.find((un) => un.sujet === "Prix des volets")?.valeur, "360 €");
});

test("un verdict qu'on n'a pas écrit dit d'où il vient", () => {
  // Présenté comme les siens, il ferait chercher dans son propre texte une
  // ligne qui n'y est pas.
  const rendu = lancerLeBrouillon(FICHIERS,
    { "Nombre de volets": "4", "Couleur des volets": "gris" }, { memoire: memoireDe(PRIX_UNITAIRE) });

  const versee = rendu.find((un) => un.sujet === "Prix unitaire du volet");
  assert.equal(versee.versee, true);
  assert.equal(versee.fichier, FICHIER_DU_PROJET);

  // Et les siennes ne le disent pas.
  assert.equal(rendu.find((un) => un.sujet === "Prix des volets")?.versee, false);
});

test("sans mémoire, l'essai est celui d'avant, et il le dit", () => {
  // Un projet dont la mémoire n'est pas lue ne doit pas faire croire que le
  // brouillon est faux : il manque une entrée, et c'est nommé.
  const rendu = lancerLeBrouillon(FICHIERS, { "Nombre de volets": "4" });
  const sien = rendu.find((un) => un.sujet === "Prix des volets");

  assert.equal(rendu.length, 1, "une fonction versée est rejouée sans mémoire");
  assert.deepEqual(sien.manquants, ["Prix unitaire du volet"]);
});

test("l'écran d'écriture lit bien la mémoire, et la donne aux deux qui en ont besoin", async () => {
  /**
   * **Cette épreuve relit le source, et c'est l'exception qui le justifie.**
   *
   * Un service parfait que personne n'appelle rend exactement l'écran d'avant :
   * le formulaire redemande ce que le projet déduit, le catalogue ne montre
   * rien de plus, et il n'y a pas un caractère de différence à l'écran. Aucune
   * épreuve de rendu ne peut voir cela.
   */
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const source = readFileSync(
    fileURLToPath(new URL("../views/studio/dev/ecrire-en-mdall.js", import.meta.url)), "utf8");

  assert.match(source, /^\s*assurerLaMemoire\(\);$/m,
    "la mémoire du projet n'est jamais lue : le rayon resterait vide pour toujours");
  assert.match(source, /projet: nomsConclusParLeProjet\(etat\.memoire \?\? \[\]\)/,
    "le catalogue ne reçoit pas ce que le projet conclut");
  assert.match(source, /lancerLeBrouillon\([\s\S]{0,160}?memoire: etat\.memoire/,
    "l'essai ne rejoue pas les fonctions versées");
  assert.match(source, /champsDuBrouillon\(remplis, \{ memoire, zone \}\)/,
    "le formulaire redemande ce que le projet déduit");

  /**
   * **Et la zone doit atteindre les deux, pour la même raison.**
   *
   * Un sélecteur qui ne descend nulle part rend exactement l'écran d'avant : on
   * change de bâtiment, rien ne bouge, et il n'y a pas un caractère de
   * différence à voir. C'est le même défaut invisible, une ronde plus tard.
   */
  assert.match(source, /lancerLeBrouillon\([\s\S]{0,160}?zone: etat\.zone/,
    "l'essai ne se rejoue pas là où l'on se place");
  assert.match(source, /renderBacDessai\(etat\.brouillon, \{[\s\S]{0,160}?memoire: etat\.memoire, zone: etat\.zone/,
    "la fenêtre du bac ouvre sans la mémoire ni la zone : son formulaire dirait "
      + "autre chose que ses résultats");
});
