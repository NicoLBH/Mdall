/**
 * Se servir de ce que le projet a signé — et pouvoir le changer.
 *
 * **Le cas rapporté**, tel qu'il s'est produit : on demande au modèle
 * « d'utiliser la fonction existante dans la mémoire du projet », et il écrit
 * un appel de fonction — la seule chose qu'on puisse écrire quand on ne sait
 * pas qu'elle existe. Il ne le savait pas : **seule la phrase lui montait.**
 *
 * Et une fois qu'on la nomme, on voudrait la corriger. Une fonction versée se
 * relisait, se rejouait, se nommait — et ne se modifiait pas.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { lireUnFichier } from "./memoire-en-lecture.js";
import { aProposerDuBrouillon } from "./proposition-du-brouillon.js";
import { verifierLeBrouillon } from "./verification-du-brouillon.js";
import { texteDeLaFonctionVersee, laFonctionVersee } from "./fonctions-du-projet.js";
import { COMBIEN_AU_PLUS, ceQueLeProjetSait, leProjetSaitQuelqueChose } from "./ce-que-le-projet-sait.js";
import { ceQueLeProjetSaitLu, phraseDeCeQuiEstConnu } from "../../../../supabase/functions/_shared/mdall-du-modele.js";
import { renderLesFonctionsDuProjet } from "../views/studio/dev/ecrire-en-mdall.js";

const COULEUR = `fonction Couleur des volets(zones, Matériau) {
   // La couleur imposée par le fournisseur, selon la matière.
   rend: "gris" ou "blanc"

   selon (Matériau)
   | bois | gris  |
   | pvc  | blanc |
}
`;

const PRIX = `fonction Prix TTC(zones, Prix HT, Taux de TVA) {
   calcule TVA = Prix HT * Taux de TVA;
   calcule Prix TTC = Prix HT + TVA;
   si (Prix TTC > 0 €)
   alors (Prix TTC);
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

/* ── Ce qui monte avec la phrase ─────────────────────────────────────────── */

test("le modèle reçoit ce que le projet conclut, avec ce que chaque fonction lit et rend", () => {
  /**
   * **C'était la cause.** « Lance la fonction existante dans la mémoire du
   * projet » ne peut pas s'écrire par un modèle qui ne sait pas qu'elle
   * existe : il écrit un appel de fonction, et le langage n'en a pas.
   */
  const su = ceQueLeProjetSait(memoireDe(COULEUR));

  assert.deepEqual(su.fonctions, [{
    nom: "Couleur des volets", lit: ["Matériau"], rend: "gris ou blanc", forme: "barème"
  }]);
  assert.equal(leProjetSaitQuelqueChose(su), true);
});

test("une fonction annonce ce qu'elle lit dehors, pas ses propres calculs", () => {
  /**
   * **Vu à l'écran, pas par un test.** La fiche de `Prix TTC` annonçait « lit
   * Prix HT, Taux de TVA, TVA, Prix TTC » : `TVA` est son `calcule`, et
   * `Prix TTC` est elle-même. C'est ce qui montait au modèle, et c'est ce que
   * l'aide à la signature montrait à l'écrivain — deux entrées à remplir qui
   * n'existent nulle part, et qu'on serait parti chercher.
   *
   * Le catalogue écartait déjà les siennes pour une fonction du **brouillon**
   * (`sansLesSiennes`) ; une fonction **versée** passait à côté. La même
   * question doit recevoir la même réponse, et c'est `entreesDuBloc` qui la
   * donne — celle que la vérification de la signature exige déjà (règle 4).
   */
  const su = ceQueLeProjetSait(memoireDe(PRIX));

  assert.deepEqual(su.fonctions[0].lit, ["Prix HT", "Taux de TVA"]);
  // Et la phrase qui monte ne demande donc plus ce que la fonction se donne.
  assert.doesNotMatch(phraseDeCeQuiEstConnu(ceQueLeProjetSaitLu(su)), /lit.*TVA,/);
});

test("aucune valeur ne monte, et un projet neuf se tait", () => {
  /**
   * **Le modèle a besoin de savoir qu'un nom existe**, jamais de ce que ce
   * projet-ci a répondu. Envoyer les valeurs ferait sortir du projet des
   * choses que personne n'a demandé de faire sortir, pour un gain nul.
   */
  const su = ceQueLeProjetSait(memoireDe(COULEUR));
  const dit = JSON.stringify(su);

  assert.doesNotMatch(dit, /citation|provenance|auteur|statut/i);
  // La valeur d'une fonction versée est sa conclusion : elle ne monte pas non
  // plus.
  assert.doesNotMatch(dit, /"value"/);

  assert.deepEqual(ceQueLeProjetSait([]), { fonctions: [], deplus: 0 });
  assert.equal(leProjetSaitQuelqueChose(ceQueLeProjetSait([])), false);
  assert.equal(leProjetSaitQuelqueChose(null), false);
});

test("une mémoire trop longue se coupe, et dit combien il en reste", () => {
  // Trois cents noms feraient une consigne où la phrase se perd. Le taire
  // ferait croire que le projet ne contient que cela (règle 5).
  const beaucoup = Array.from({ length: COMBIEN_AU_PLUS + 5 }, (une, rang) =>
    memoireDe(COULEUR.replace("Couleur des volets", `Couleur ${rang}`))[0]);

  const su = ceQueLeProjetSait(beaucoup);
  assert.equal(su.fonctions.length, COMBIEN_AU_PLUS);
  assert.equal(su.deplus, 5);
});

test("le serveur relit ce qui monte plutôt que de le croire", () => {
  // Ce qui monte d'un navigateur n'est jamais ce qu'on suppose : un objet mal
  // formé ferait tomber la transcription sur un champ qu'on n'avait pas prévu.
  assert.deepEqual(ceQueLeProjetSaitLu(null), { fonctions: [], deplus: 0 });
  assert.deepEqual(ceQueLeProjetSaitLu({ fonctions: "beaucoup" }), { fonctions: [], deplus: 0 });
  assert.deepEqual(ceQueLeProjetSaitLu({ fonctions: [{ nom: "" }], deplus: -3 }),
    { fonctions: [], deplus: 0 });

  const trop = ceQueLeProjetSaitLu({
    fonctions: Array.from({ length: 300 }, (une, rang) => ({ nom: `F${rang}` }))
  });
  assert.ok(trop.fonctions.length <= COMBIEN_AU_PLUS);
});

test("la phrase dit ce qui existe, et comment s'en servir", () => {
  /**
   * **C'est là que la faute se commet** : on demande de « lancer » une
   * fonction existante, et un modèle qui connaît d'autres langages écrit un
   * appel. Lui montrer la liste sans dire comment la nommer ne corrigerait
   * rien.
   */
  const dit = phraseDeCeQuiEstConnu(ceQueLeProjetSaitLu(ceQueLeProjetSait(memoireDe(COULEUR))));

  assert.match(dit, /Couleur des volets — lit Matériau — rend gris ou blanc/);

  /**
   * **Les deux façons de s'en servir**, parce qu'elles ne disent pas la même
   * chose : nommée, elle lit ses propres noms ; appelée, elle lit ceux qu'on
   * lui donne. C'est la seconde qui manquait, et son absence faisait réécrire
   * la fonction dès que le nom qu'on avait n'était pas le sien.
   */
  assert.match(dit, /calcule X = Couleur des volets;/);
  assert.match(dit, /calcule X = Couleur des volets\(zones, Autre nom\);/);
  // Elle nomme ce que la fonction lit : c'est cela qu'on remplace.
  assert.match(dit, /lit `Matériau`/);
  // Et ce qu'un appel exige.
  assert.match(dit, /La portée d'abord, toujours/);
  assert.match(dit, /se pose dans un `calcule`/);

  // Un projet qui ne conclut rien n'ajoute rien à la phrase.
  assert.equal(phraseDeCeQuiEstConnu(null), "");
  assert.equal(phraseDeCeQuiEstConnu({ fonctions: [] }), "");
});

test("ce qu'on a laissé dehors se dit dans la phrase", () => {
  const dit = phraseDeCeQuiEstConnu({ fonctions: [{ nom: "F", lit: [], rend: "" }], deplus: 12 });
  assert.match(dit, /et 12 autres que cette liste ne montre pas/);
});

/* ── Reprendre une fonction versée pour la modifier ──────────────────────── */

test("une fonction versée revient en Mdall, et se relit sans refus", () => {
  /**
   * **Une fonction qu'on ne peut pas changer est une fonction qu'on remplace
   * par une autre qui lui ressemble**, et le projet en tient deux (règle 10).
   * Y ajouter un `rend:` demandait de la réécrire de mémoire.
   */
  const ecrit = texteDeLaFonctionVersee(memoireDe(COULEUR)[0]);

  assert.deepEqual(lireUnFichier(ecrit).refus, []);
  const relu = lireUnFichier(ecrit).blocs[0];

  assert.equal(relu.sujet, "Couleur des volets");
  assert.deepEqual(relu.selon, ["Matériau"]);
  assert.deepEqual(relu.rend, { valeurs: ["gris", "blanc"], unite: "" });
  assert.equal(relu.alors, "gris");
  assert.equal(relu.sinonSi[0].alors, "blanc");
});

test("la signature reprise annonce ce que la fonction lit, même par un calcul", () => {
  /**
   * **C'est le défaut que la vérification de la signature a rendu visible.**
   * La signature se déduisait des conditions, et une fonction qui lit par un
   * `calcule` les perdait toutes : reprise, elle aurait été refusée dès la
   * relecture, et l'on aurait passé le premier quart d'heure à réparer ce
   * qu'on venait de reprendre.
   */
  const ecrit = texteDeLaFonctionVersee(memoireDe(PRIX)[0]);

  assert.match(ecrit, /^fonction Prix TTC\(zones, Prix HT, Taux de TVA\) \{$/m);
  assert.deepEqual(verifierLeBrouillon([{ nom: "essai.ref", contenu: ecrit }])
    .filter((une) => une.quoi === "signature"), []);
});

test("le commentaire de la fonction revient avec elle", () => {
  // C'est ce qui dit à quoi elle sert : le perdre en reprenant ferait relire
  // une fonction nue, et l'on réécrirait la phrase qu'on avait déjà écrite.
  assert.match(texteDeLaFonctionVersee(memoireDe(COULEUR)[0]),
    /La couleur imposée par le fournisseur/);
});

test("le premier commentaire décrit la fonction, les suivants restent pour soi", () => {
  /**
   * **Les deux ne disent pas la même chose.** Le premier dit à quoi la
   * fonction sert — c'est ce qui la décrit dans la mémoire, et ce que l'écran
   * des fichiers montre. Ceux qui suivent disent **pourquoi telle condition
   * existe**, ce qui n'a de sens qu'à côté de cette condition-là.
   *
   * Prendre le dernier ferait décrire « Prix unitaire du volet » par la phrase
   * « le seuil vient de l'arrêté » : une description fausse est pire qu'une
   * description absente.
   */
  const DEUX = `fonction Seuil(zones, Hauteur) {
   // Le seuil au-delà duquel un garde-corps est dû.
   si (Hauteur > 1 m)
   // Un mètre : c'est ce que dit le texte, pas un arrondi de notre part.
   alors ("dû");
}
`;
  const [versee] = memoireDe(DEUX);

  assert.equal(versee.payload.quoi, "Le seuil au-delà duquel un garde-corps est dû.");

  // Et le second reste où il est utile : dans le fichier, pas dans la fiche.
  assert.doesNotMatch(versee.payload.quoi, /arrondi/);
});

test("ce qui n'est pas une règle ne se reprend pas", () => {
  assert.equal(texteDeLaFonctionVersee(null), "");
  assert.equal(texteDeLaFonctionVersee({ payload: {} }), "");
});

test("un nom lu deux fois ne paraît qu'une fois dans la signature", () => {
  /**
   * **Un encadrement lit deux fois le même nom** — `si (Hauteur > 1 m) et
   * (Hauteur < 3 m)`. Écrite telle quelle, la fonction reprise dirait
   * `fonction Garde-corps(zones, Hauteur, Hauteur)` : un paramètre qu'on croit
   * devoir remplir deux fois, dans un langage dont la promesse est qu'il se
   * lit. Et à la relecture, la vérification de la signature ne parlerait plus
   * de la même fonction.
   *
   * **Ce test tient le résultat, et non un garde en particulier** — et c'est
   * ce qu'il a appris. La question « cette liste de paramètres se
   * dédoublonne-t-elle ? » reçoit **trois** réponses sur le chemin :
   * `nomsLusParLeBloc`, puis `blocDeRegle`, puis `ligneDeDonnee`. Il faut les
   * casser toutes les trois pour le voir tomber — c'est-à-dire qu'en casser
   * une ne se voit jamais. C'est la règle 4 sous une autre forme, et c'est
   * noté dans `à traiter plus tard` : deux de ces gardes ne défendent rien,
   * et on ne saura laquelle compte que le jour où la troisième partira.
   */
  const ENCADRE = `fonction Garde-corps(zones, Hauteur) {
   si (Hauteur > 1 m)
   et (Hauteur < 3 m)
   alors ("dû");
}
`;
  const ecrit = texteDeLaFonctionVersee(memoireDe(ENCADRE)[0]);

  assert.match(ecrit, /^fonction Garde-corps\(zones, Hauteur\) \{$/m);
  assert.deepEqual(lireUnFichier(ecrit).refus, []);
  assert.deepEqual(lireUnFichier(ecrit).blocs[0].signature, ["zones", "Hauteur"]);
});

/* ── Corriger une fonction, et que la correction vaille ──────────────────── */

/** Le même sujet versé deux fois, la seconde fois corrigée. */
const DEUX_FOIS = () => {
  const sans = memoireDe(COULEUR.replace('   rend: "gris" ou "blanc"\n', ""))[0];
  const avec = memoireDe(COULEUR)[0];
  return [
    { ...sans, id: "r-1", created_at: "2026-09-01T10:00:00Z" },
    { ...avec, id: "r-2", created_at: "2026-09-02T10:00:00Z" }
  ];
};

test("une fonction corrigée vaut par sa dernière version, quel que soit l'ordre lu", () => {
  /**
   * **C'était le défaut de la reprise.** Une règle par sujet était prise « la
   * première en vigueur » — ce qui suffisait pour dire qu'un nom existe, et
   * plus du tout dès qu'on reprend son texte : on corrigeait une fonction, on
   * la reprenait, et c'est la version d'avant la correction qui revenait. On
   * l'aurait corrigée deux fois sans jamais voir la correction.
   *
   * L'ordre du tableau lu n'est pas une réponse : ce qui tranche est le même
   * juge que partout ailleurs (`laValeurQuiFaitFoi`).
   */
  const [vieille, neuve] = DEUX_FOIS();

  for (const memoire of [[vieille, neuve], [neuve, vieille]]) {
    assert.deepEqual(ceQueLeProjetSait(memoire).fonctions, [{
      nom: "Couleur des volets", lit: ["Matériau"], rend: "gris ou blanc", forme: "barème"
    }], "la version corrigée est celle qui monte");

    assert.match(texteDeLaFonctionVersee(laFonctionVersee(memoire, "Couleur des volets")),
      /rend: "gris" ou "blanc"/, "reprendre rend le texte corrigé");
  }
});

test("une fonction reprise, corrigée et reversée ne fait pas deux fonctions", () => {
  // Règle 10 : un nom vit à un seul endroit. Le catalogue en montrant deux, on
  // ne saurait plus laquelle le projet tient pour vraie.
  const html = renderLesFonctionsDuProjet(DEUX_FOIS());

  assert.equal(html.match(/data-projet-sujet="Couleur des volets"/g).length, 1);
});

/* ── Ce que l'écran en montre ────────────────────────────────────────────── */

test("les fonctions du projet se listent, avec ce qu'elles lisent et rendent", () => {
  const html = renderLesFonctionsDuProjet(memoireDe(COULEUR, PRIX));

  assert.match(html, /Couleur des volets/);
  assert.match(html, /lit Matériau/);
  assert.match(html, /rend gris, blanc/);
  assert.match(html, /barème/);
  // Chacune porte son sujet : c'est lui qui dit laquelle on reprend.
  assert.match(html, /data-projet-sujet="Couleur des volets"/);
  assert.match(html, /data-projet-sujet="Prix TTC"/);
  // Et ce qu'elle dit d'elle-même, qui est ce qui la distingue d'une autre.
  assert.match(html, /La couleur imposée par le fournisseur/);
});

test("ce que la fonction dit d'elle-même reste à l'écran, et ne monte pas", () => {
  /**
   * **C'est de la prose de ce projet.** Elle peut nommer un fournisseur, un
   * site, quelqu'un. Ce qui sort d'un projet se décide ; « ça aiderait le
   * modèle » n'est pas une décision.
   */
  const memoire = memoireDe(COULEUR);

  assert.match(renderLesFonctionsDuProjet(memoire), /imposée par le fournisseur/);
  assert.doesNotMatch(JSON.stringify(ceQueLeProjetSait(memoire)), /fournisseur/);
  assert.doesNotMatch(
    phraseDeCeQuiEstConnu(ceQueLeProjetSaitLu(ceQueLeProjetSait(memoire))), /fournisseur/);
});

test("une mémoire qu'on n'a pas lue ne se lit pas comme un projet sans fonction", () => {
  /**
   * **La première dit qu'on ne sait pas, la seconde qu'il n'y a rien.**
   * Confondre les deux ferait réécrire une fonction que le projet possède
   * déjà (règle 5).
   */
  assert.match(renderLesFonctionsDuProjet(null), /n'a pas pu être lue/);
  assert.match(renderLesFonctionsDuProjet([]), /n'a encore signé aucune fonction/);
});
