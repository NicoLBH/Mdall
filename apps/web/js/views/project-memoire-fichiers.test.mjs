import test from "node:test";
import assert from "node:assert/strict";

import {
  lignesDeLAssertion, provenanceDeLAssertion, statutDeLAssertion,
  jetonsDeLAssertion, octets, ilYA, lignesAffichables, ligneCachee, grouperParVersement,
  preparerLaMemoire, fichierDesVariables, adresseDuFichier, nomDuFichier, contexteDuSujet,
  fonctionsSansDoublon, ouChaqueValeurEstEcrite, ouChaqueLigneEstEcrite,
  fichierDuChemin, FICHIER_DES_VARIABLES, renderFichier, LECTURE
} from "./project-memoire-fichiers.js";
import { enClair, texteDesLignes, PROVENANCE, STATUT } from "../services/memoire-en-texte.js";
import { lireUnFichier } from "../services/memoire-en-lecture.js";

const clair = (ligne) => enClair(ligne.jetons);
const enTexte = (assertion) => texteDesLignes(lignesDeLAssertion(assertion).map((ligne) => ligne.jetons));

test("une valeur mesurée s'écrit nue, avec sa provenance dessous", () => {
  const lignes = lignesDeLAssertion({
    nature: "donnee-de-base",
    payload: { subject: "Altitude du site", value: "490,03 m", source: "Zonages réglementaires" }
  });

  assert.deepEqual(lignes.map(clair), [
    "Altitude du site = 490,03 m {",
    "   document: Zonages réglementaires",
    "   statut: retenu",
    "}"
  ]);
  assert.equal(lignes[0].nature, "affirmation");
  assert.equal(lignes[1].nature, "detail");
});

test("le type de la provenance est l'origine : rien de plus à déclarer", () => {
  // Un calcul l'emporte : une valeur calculée se refait en refaisant le calcul.
  assert.deepEqual(
    provenanceDeLAssertion({ payload: { deduitDe: { calcul: "hors gel", entrees: [{ sujet: "altitude", valeur: "490 m" }] } } }),
    { type: PROVENANCE.CALCUL, quoi: "hors gel (altitude = 490 m)" }
  );
  // Une contrainte sort d'un texte appliqué…
  assert.deepEqual(
    provenanceDeLAssertion({ nature: "contrainte", payload: { source: "arrêté du 31 janvier 1986", article: "article 6" } }),
    { type: PROVENANCE.TEXTE, quoi: "arrêté du 31 janvier 1986, article 6" }
  );
  // …une donnée de base est relevée dans une pièce du projet.
  assert.equal(provenanceDeLAssertion({ nature: "donnee-de-base", payload: { source: "plan R+3" } }).type, PROVENANCE.DOCUMENT);
  // Ce que l'agent a déclaré l'emporte sur tout le reste.
  assert.deepEqual(
    provenanceDeLAssertion({ nature: "contrainte", payload: { provenance: { type: "règle", quoi: "Colonne sèche" }, source: "arrêté" } }),
    { type: PROVENANCE.REGLE, quoi: "Colonne sèche" }
  );
  assert.equal(provenanceDeLAssertion({ payload: {} }), null);
});

test("le statut se lit sur ce que la mémoire sait déjà, faute d'être déclaré", () => {
  assert.equal(statutDeLAssertion({ payload: { statut: STATUT.CONTESTE } }), STATUT.CONTESTE);
  assert.equal(statutDeLAssertion({ status: "rejected" }), STATUT.ECARTE);
  assert.equal(statutDeLAssertion({ superseded_by: "a-1" }), STATUT.REMPLACE);
  assert.equal(statutDeLAssertion({ nature: "hypothese" }), STATUT.SUPPOSE);
  assert.equal(statutDeLAssertion({ nature: "contrainte" }), STATUT.RETENU);
});

test("une hypothèse se dit supposée, et sa provenance dit qui doit la confirmer", () => {
  const texte = enTexte({
    nature: "hypothese",
    payload: {
      subject: "Portance du sol", value: "0,2 MPa",
      provenance: { type: PROVENANCE.HYPOTHESE, quoi: "à confirmer par le G2" }
    }
  });

  assert.equal(texte, [
    "Portance du sol = 0,2 MPa {",
    "   hypothèse: à confirmer par le G2",
    "   statut: supposé",
    "}"
  ].join("\n"));
});

test("la mémoire ne recopie plus la règle, et n'écrit plus de dépendances", () => {
  const texte = enTexte({
    nature: "contrainte",
    payload: {
      subject: "Colonne sèche", value: "exigée",
      provenance: { type: PROVENANCE.REGLE, quoi: "Colonne sèche — arrêté du 31 janvier 1986, article 98" },
      citation: "Les habitations de la 3ème famille B doivent comporter une colonne sèche."
    }
  });

  assert.equal(texte.includes("si "), false);
  assert.equal(texte.includes("dépend de"), false);
  assert.match(texte, /parce que: "Les habitations de la 3ème famille B/);
});

test("ce que la mémoire écrit se relit sans perte", () => {
  const assertion = {
    nature: "contrainte",
    payload: {
      subject: "Degré coupe-feu des planchers", value: "CF 1 h",
      provenance: { type: PROVENANCE.REGLE, quoi: "Degré coupe-feu des planchers — article 6" },
      citation: "habitations de la 3ème famille : 1 heure ;",
      statut: STATUT.RETENU
    }
  };

  const { blocs, refus } = lireUnFichier(enTexte(assertion));
  assert.deepEqual(refus, []);
  assert.equal(blocs.length, 1);
  assert.equal(blocs[0].sujet, "Degré coupe-feu des planchers");
  assert.equal(blocs[0].valeur, "CF 1 h");
  assert.deepEqual(blocs[0].provenance, assertion.payload.provenance);
  assert.equal(blocs[0].preuve, assertion.payload.citation);
  assert.equal(blocs[0].statut, STATUT.RETENU);
});

test("jetonsDeLAssertion rend la ligne de valeur, pas son détail", () => {
  const jetons = jetonsDeLAssertion({
    payload: { subject: "Zone de vent", value: "2", provenance: { type: PROVENANCE.DOCUMENT, quoi: "carte" } }
  });
  // Sans accolade : elle borne un bloc, et il n'y a pas de bloc hors contexte.
  assert.equal(enClair(jetons), "Zone de vent = 2");
});

test("replier une variable emporte toutes ses zones, pas seulement leurs têtes", () => {
  // Le défaut : replier ne cachait que les têtes de bloc — leurs détails
  // restaient à l'écran, orphelins, sous un bloc fermé.
  const valeur = (zone, valeur) => ({
    nature: "contrainte",
    payload: { subject: "Degré coupe-feu", value: valeur, source: "arrêté", zones: [zone] }
  });

  const lignes = lignesAffichables({
    lignes: [valeur("Bâtiment A", "CF 1 h"), valeur("Bâtiment B", "CF 1/2 h")],
    ecartees: []
  });

  const variable = lignes[0].ouvre;
  assert.ok(variable, "la variable ouvre un tableau");

  const visibles = lignes.filter((ligne) => !ligneCachee(ligne, new Set([variable])));

  // La tête du tableau et sa seule fermeture : rien d'autre.
  assert.deepEqual(visibles.map((ligne) => enClair(ligne.jetons)), ["Degré coupe-feu = [", "];"]);

  // Replier une zone ne touche pas au reste du tableau.
  const zone = lignes.find((ligne) => ligne.ouvre && ligne.ouvre !== variable).ouvre;
  const apres = lignes.filter((ligne) => !ligneCachee(ligne, new Set([zone])));
  assert.ok(apres.length < lignes.length, "les détails de cette zone se cachent");
  assert.ok(apres.some((ligne) => enClair(ligne.jetons).includes("Bâtiment B")), "l'autre zone reste");
  // Sa fermeture reste : un bloc replié garde ses deux bornes.
  assert.ok(apres.some((ligne) => ligne.ferme === zone));
});

test("une variable ne s'écrit qu'une fois, avec ses valeurs par zone", () => {
  // Le nom se répétait dans chaque section de zone : trois fois le même nom à
  // trois endroits, pour une seule chose. Chercher « Degré coupe-feu » donnait
  // trois réponses sans dire qu'il s'agissait de la même variable.
  const valeur = (zone, valeur) => ({
    nature: "contrainte", payload: { subject: "Degré coupe-feu", value: valeur, zones: [zone] }
  });

  const texte = texteDesLignes(lignesAffichables({
    lignes: [valeur("Bâtiment B", "CF 1/2 h"), valeur("Bâtiment A", "CF 1 h")],
    ecartees: []
  }).map((ligne) => ligne.jetons));

  assert.equal((texte.match(/Degré coupe-feu/g) ?? []).length, 1);
  assert.match(texte, /Degré coupe-feu = \[/);
  assert.match(texte, /Bâtiment A: "CF 1 h" \{/);
  assert.match(texte, /Bâtiment B: "CF 1\/2 h" \{/);
  // La virgule sépare les entrées : c'est un tableau, et la dernière n'en a pas.
  assert.match(texte, /\},\n/);
  assert.match(texte, /\];/);
});

test("une valeur qui vaut partout n'ouvre pas de tableau", () => {
  // Une paire de crochets autour d'une seule entrée serait du bruit.
  const texte = texteDesLignes(lignesAffichables({
    lignes: [{ nature: "contrainte", payload: { subject: "Colonne sèche", value: "exigée" } }],
    ecartees: []
  }).map((ligne) => ligne.jetons));

  assert.match(texte, /^Colonne sèche = "exigée" \{$/m);
  assert.equal(texte.includes("["), false);
});

test("l'origine s'écrit une fois par versement, pas devant chaque bloc", () => {
  const bloc = (sujet, proposition) => ({
    id: `a-${sujet}`, proposition_id: proposition, decided_at: "2026-09-01T10:00:00Z",
    nature: "contrainte", payload: { subject: sujet, value: "x", source: "arrêté" }
  });

  const lignes = grouperParVersement(lignesAffichables({
    lignes: [bloc("A", "p1"), bloc("B", "p1"), bloc("C", "p2")], ecartees: []
  }));

  // Un seul début de groupe par versement : le premier bloc de p1, puis le
  // passage à p2 — et non trois, un par bloc.
  const debuts = lignes.filter((ligne) => ligne.debutDeGroupe);
  assert.deepEqual(debuts.map((ligne) => ligne.versement), ["p1", "p2"]);

  // La ligne vide appartient au bloc qu'elle précède : elle est née avec lui.
  const vides = lignes.filter((ligne) => ligne.nature === "vide");
  assert.deepEqual(vides.map((ligne) => ligne.versement), ["p1", "p2"]);
  // Celle qui précède le premier bloc de p2 ouvre donc le groupe.
  assert.equal(vides[1].debutDeGroupe, true);
});

test("le poids d'un fichier se dit en octets, accents compris", () => {
  assert.equal(octets("abc"), "3 octets");
  assert.equal(octets("é"), "2 octets");
  assert.match(octets("x".repeat(2048)), /^2\.0 Ko$/);
});

test("une date se lit en durée, pas en calendrier", () => {
  const jours = (n) => new Date(Date.now() - n * 86400000).toISOString();
  assert.equal(ilYA(jours(0)), "aujourd'hui");
  assert.equal(ilYA(jours(1)), "hier");
  assert.equal(ilYA(jours(10)), "il y a 10 jours");
  assert.equal(ilYA(jours(150)), "il y a 5 mois");
  assert.equal(ilYA("n'importe quoi"), "date inconnue");
});

test("une règle appliquée s'écrit comme une règle, pas comme un fait du projet", () => {
  const texte = enTexte({
    domain: "incendie",
    payload: {
      subject: "Classement du bâtiment", value: "3e famille B", referentiel: true,
      regle: {
        conditions: [
          { sujet: "Logements superposés", operateur: "=", valeur: ["oui"], unite: "", logique: true },
          { sujet: "Hauteur du plancher bas du logement le plus haut", operateur: "<=", valeur: ["28"], unite: "m", joint: "et" }
        ],
        sinon: "3e famille A",
        sauf: []
      },
      provenance: { type: PROVENANCE.TEXTE, quoi: "arrêté du 31 janvier 1986 modifié, article 3, 3°)" },
      citation: "Troisième famille B : habitations ne satisfaisant pas à l'une des conditions précédentes."
    }
  });

  // Auto-portée : ce qu'elle fait, d'où viennent ses entrées, ce qui la fonde,
  // ce qu'elle conclut. La portée est son premier paramètre.
  assert.equal(texte, [
    "fonction Classement du bâtiment(zones, Logements superposés, Hauteur du plancher bas du logement le plus haut) {",
    "   // À DÉCRIRE — à quoi sert « Classement du bâtiment » ? Ce que la fonction établit, et dans quel cas on l\'applique.",
    "",
    "   importe (variable: Logements superposés, depuis: variables-du-projet.ref, zones: zones);",
    "   importe (variable: Hauteur du plancher bas du logement le plus haut, depuis: variables-du-projet.ref, zones: zones);",
    "",
    '   soit texte = "arrêté du 31 janvier 1986 modifié, article 3, 3°)";',
    '   soit parce que = "Troisième famille B : habitations ne satisfaisant pas à l\'une des conditions précédentes.";',
    "",
    "   si (Logements superposés = oui)",
    "   et (Hauteur du plancher bas du logement le plus haut <= 28 m)",
    '   alors ("3e famille B");',
    '   sinon ("3e famille A");',
    "}"
  ].join("\n"));

  // Pas de `=` sur la tête : la règle ne dit pas ce que vaut la donnée ici.
  assert.equal(texte.split("\n")[0].includes(" = "), false);
  // Et pas de statut : un référentiel n'a pas d'état dans un projet.
  assert.equal(texte.includes("statut"), false);
});

test("ce que la mémoire écrit d'une règle se relit sans perte", () => {
  const assertion = {
    domain: "incendie",
    payload: {
      subject: "Colonne sèche", value: "exigée", referentiel: true,
      regle: {
        conditions: [{ sujet: "Classement du bâtiment", operateur: "parmi", valeur: ["3e famille B", "4e famille"], unite: "", logique: false }],
        sinon: "", sauf: []
      },
      provenance: { type: PROVENANCE.TEXTE, quoi: "arrêté du 31 janvier 1986 modifié, article 98" }
    }
  };

  const { blocs, refus } = lireUnFichier(enTexte(assertion));
  assert.deepEqual(refus, []);
  assert.equal(blocs[0].sujet, "Colonne sèche");
  assert.equal(blocs[0].valeur, "");
  assert.equal(blocs[0].alors, "exigée");
  assert.deepEqual(blocs[0].conditions[0].valeur, ["3e famille B", "4e famille"]);
});

/** Une affirmation de mémoire, telle que la base la rend. */
const ligneDeMemoire = (sujet, valeur, extra = {}) => ({
  id: `a-${sujet}`, subject_key: sujet, status: "assumed", superseded_by: null,
  nature: "donnee-de-base", domain: null,
  payload: { subject: sujet, value: valeur }, ...extra
});

test("la racine de la Mémoire porte le dictionnaire du projet", () => {
  const memoire = preparerLaMemoire([
    ligneDeMemoire("Hauteur du plancher bas", "26 m"),
    ligneDeMemoire("Classement du bâtiment", "3e famille B", {
      nature: null, domain: "incendie",
      payload: {
        subject: "Classement du bâtiment", value: "3e famille B", referentiel: true,
        regle: { conditions: [{ sujet: "Hauteur du plancher bas", operateur: "<=", valeur: ["28"], unite: "m" }], sauf: [] }
      }
    })
  ]);

  const [variables] = memoire.racine;
  assert.equal(nomDuFichier(variables), FICHIER_DES_VARIABLES);
  // À la racine, pas dans un dossier : il ne relève d'aucune discipline, et son
  // adresse n'a donc pas de dossier devant elle — sinon le fil d'Ariane
  // affichait « Fichiers / Mémoire / Mémoire / variables-du-projet.ref ».
  assert.equal(adresseDuFichier(variables), FICHIER_DES_VARIABLES);

  const texte = texteDesLignes(lignesAffichables(variables).map((ligne) => ligne.jetons));
  assert.match(texte, /const Hauteur du plancher bas = \{/);
  assert.match(texte, /type: "mesure",/);
  assert.match(texte, /unité: "m",/);
  // Une déclaration doit suffire à décider si l'on réutilise ce nom : le type
  // seul ne suffit pas, et ce qui manque s'appelle par son nom.
  assert.match(texte, /description: "À DÉCRIRE/);
  assert.match(texte, /utilisation: "À DÉCRIRE/);
  // Et où il sert déjà — c'est cette liste qui empêche d'en recréer un voisin.
  assert.match(texte, /déjà utilisé dans: \[/);
  assert.match(texte, /Classement du bâtiment \(memoire\/incendie\.ref\)/);

  // Ce qu'une variable vaut n'y est pas : elle en prend plusieurs au fil d'un
  // projet, et une définition qui en porterait une cesserait d'être vraie.
  assert.equal(texte.includes("26 m"), false);
});

test("le dictionnaire ne se déclare pas lui-même", () => {
  const memoire = preparerLaMemoire([ligneDeMemoire("Hauteur du plancher bas", "26 m")]);
  const [variables] = memoire.racine;

  // Il s'engendre depuis les autres fichiers : s'il entrait dans son propre
  // calcul, chaque variable se déclarerait dans le fichier qui la liste.
  assert.equal(memoire.dossiers.some((d) => d.fichiers.includes(variables)), false);
});

test("un projet sans mémoire n'a pas de dictionnaire", () => {
  // Un fichier vide se lirait comme « ce projet n'a aucun nom », ce qui est
  // vrai — mais un fichier pour le dire est du bruit.
  assert.equal(fichierDesVariables([]), null);
  assert.deepEqual(preparerLaMemoire([]).racine, []);
});

test("le survol d'un nom dit ce qu'il faut pour ne pas le confondre", () => {
  const variables = new Map([["hauteur du plancher bas", {
    nom: "Hauteur du plancher bas", valeur: "26 m", declaree: true,
    declarePar: "memoire/donnees-de-base.ddb", citeePar: ["memoire/incendie.ref"],
    usages: [{ fonction: "Classement du bâtiment", fichier: "memoire/incendie.ref" }]
  }]]);

  const dit = contexteDuSujet("Hauteur du plancher bas", { resolution: "connu", variables });
  assert.match(dit, /mesure · m/);
  assert.match(dit, /vaut 26 m/);
  assert.match(dit, /déclarée dans memoire\/donnees-de-base\.ddb/);
  // La fonction qui l'emploie, nommément : savoir dans quel fichier chercher ne
  // dit pas quoi y lire.
  assert.match(dit, /1 usage — Classement du bâtiment \(memoire\/incendie\.ref\)/);

  // Sans table, on ne dit rien plutôt que d'inventer : une info-bulle vide vaut
  // mieux qu'une info-bulle fausse.
  assert.equal(contexteDuSujet("Hauteur du plancher bas", { resolution: "connu" }), "");
  assert.match(contexteDuSujet("Autre chose", { resolution: "inconnu" }), /ne mène nulle part/);
});

test("une même règle versée pour trois zones ne s'écrit qu'une fois", () => {
  // Une règle est le capital de raisonnement du projet. Recopiée par zone, elle
  // ferait trois versions à corriger le jour où l'arrêté bouge, et deux
  // resteraient en arrière.
  const regle = (zone) => ({
    id: `r-${zone}`, subject_key: `regle:colonne-seche@${zone}`, status: "assumed", superseded_by: null,
    domain: "incendie",
    payload: {
      subject: "Colonne sèche", value: "exigée", referentiel: true, zones: [zone],
      regle: { conditions: [{ sujet: "Classement du bâtiment", operateur: "=", valeur: ["3e famille B"] }], sauf: [] }
    }
  });

  const memoire = preparerLaMemoire([regle("batiment-a"), regle("batiment-b"), regle("batiment-c")]);
  const ref = memoire.fichiers.find((fichier) => fichier.extension === "ref" && !fichier.nom);
  const texte = texteDesLignes(lignesAffichables(ref).map((ligne) => ligne.jetons));

  assert.equal((texte.match(/fonction Colonne sèche/g) ?? []).length, 1);
  // Et pas de section de zone : la portée est un paramètre, pas un rangement.
  assert.equal(texte.includes("zone:"), false);
  assert.match(texte, /fonction Colonne sèche\(zones, Classement du bâtiment\)/);
});

test("une règle dit d'où viennent ses entrées et où va son résultat", () => {
  const memoire = preparerLaMemoire([
    ligneDeMemoire("Classement du bâtiment", "3e famille B"),
    {
      id: "r1", subject_key: "regle:colonne-seche", status: "assumed", superseded_by: null,
      nature: null, domain: "incendie",
      payload: {
        subject: "Colonne sèche", value: "exigée", referentiel: true,
        regle: { conditions: [{ sujet: "Classement du bâtiment", operateur: "=", valeur: ["3e famille B"] }], sauf: [] }
      }
    },
    {
      id: "c1", subject_key: "colonne-seche", status: "assumed", superseded_by: null,
      nature: "contrainte", domain: "incendie",
      payload: { subject: "Colonne sèche", value: "exigée" }
    }
  ]);

  const ref = memoire.fichiers.find((fichier) => fichier.extension === "ref" && !fichier.nom);
  const texte = texteDesLignes(lignesAffichables(ref, { ouEcrit: memoire.ouEcrit }).map((ligne) => ligne.jetons));

  // L'entrée vient du fichier qui la déclare, le résultat va où il est écrit.
  assert.match(texte, /importe \(variable: Classement du bâtiment, depuis: memoire\/donnees-de-base\.ddb, zones: zones\);/);
  assert.match(texte, /dans: memoire\/incendie\.ctr,/);
});

test("une règle ne s'enregistre pas elle-même", () => {
  // Elle produit la valeur, elle ne la porte pas. Sans cette distinction, une
  // règle dirait qu'elle écrit son résultat dans le fichier où elle vit.
  const ou = ouChaqueValeurEstEcrite([
    { fichier: "memoire/incendie.ref", lignes: [{ subject_key: "colonne-seche", payload: { subject: "Colonne sèche", referentiel: true } }] },
    { fichier: "memoire/incendie.ctr", lignes: [{ subject_key: "colonne-seche", payload: { subject: "Colonne sèche" } }] }
  ]);

  assert.equal(ou.get("colonne seche"), "memoire/incendie.ctr");
});

test("un doublon de fonction garde la première", () => {
  const gardees = fonctionsSansDoublon([
    { payload: { subject: "Colonne sèche", value: "exigée" } },
    { payload: { subject: "colonne  Sèche", value: "autre chose" } },
    { payload: { subject: "Classement du bâtiment" } }
  ]);

  assert.deepEqual(gardees.map((a) => a.payload.subject), ["Colonne sèche", "Classement du bâtiment"]);
});

test("un fichier de la racine se retrouve par son seul nom", () => {
  // Son adresse tient en un morceau. Exiger deux morceaux pour reconnaître un
  // fichier faisait lire `variables-du-projet.ref` comme un **dossier** : on
  // entrait dedans, et l'écran montrait la liste des fichiers d'un dossier qui
  // n'existe pas. Le fichier le plus important du projet ne s'affichait pas.
  const memoire = preparerLaMemoire([
    ligneDeMemoire("Hauteur du plancher bas", "26 m")
  ]);

  const trouve = fichierDuChemin(memoire, [FICHIER_DES_VARIABLES]);
  assert.equal(nomDuFichier(trouve), FICHIER_DES_VARIABLES);

  // Et un dossier ne se confond pas avec lui : il n'a pas d'extension, donc
  // aucune adresse de fichier ne lui répond.
  assert.equal(fichierDuChemin(memoire, ["Données de base"]), null);
});

test("où vit une ligne n'est pas où va sa valeur", () => {
  // Le classement se conclut dans `incendie.ref` et s'écrit dans
  // `donnees-de-base.ddb`. Confondre les deux envoie relire une règle dans un
  // fichier qui ne la porte pas.
  const regle = ligneDeMemoire("Classement du bâtiment", "3e famille B", {
    id: "a-regle-classement", nature: null, domain: "incendie",
    payload: {
      subject: "Classement du bâtiment", value: "3e famille B", referentiel: true,
      regle: { conditions: [{ sujet: "Hauteur du plancher bas", operateur: "<=", valeur: ["28"], unite: "m" }], sauf: [] }
    }
  });
  const valeur = ligneDeMemoire("Classement du bâtiment", "3e famille B", {
    id: "a-valeur-classement", nature: "donnee-de-base", domain: "incendie"
  });

  const memoire = preparerLaMemoire([regle, valeur]);
  const fichiers = (memoire.dossiers ?? []).flatMap((dossier) => dossier.fichiers ?? []);

  assert.match(ouChaqueLigneEstEcrite(fichiers).get(regle.id), /incendie\.ref$/);
  assert.match(ouChaqueValeurEstEcrite(fichiers).get("classement du batiment"), /\.ddb$/);
});


/** Une donnée de base du projet, telle qu'un versement l'écrit. */
const donnee = (id, sujet, valeur) => ({
  id, project_id: "p1", kind: "base-datum", subject_key: id, nature: "donnee-de-base", domain: "sol",
  status: "assumed", superseded_by: null, decided_at: "2026-01-10T09:00:00Z",
  statement: `${sujet} : ${valeur}`,
  payload: { subject: sujet, value: valeur, declared: true }
});

/** Le fichier des données de base de cette mémoire. */
const premierFichier = (assertions) => {
  const memoire = preparerLaMemoire(assertions);
  return (memoire.dossiers ?? []).flatMap((dossier) => dossier.fichiers ?? [])[0];
};

test("la lecture « Emplois » dit qui se sert de chaque valeur, et qui ne s'en sert pas", () => {
  // La lacune que cette lecture comble : on savait ce que le projet pose, jamais
  // qui s'en sert. Une donnée qu'on croit inutile est une donnée qu'on change
  // sans regarder.
  const assertions = [donnee("altitude", "Altitude du site", "13 m"), donnee("parcelle", "Parcelle", "AB 214")];

  const html = renderFichier(premierFichier(assertions), {
    lecture: LECTURE.EMPLOIS,
    emplois: new Map([["altitude", { lectures: 3, sorties: new Map([["horsgel", 1], ["neige", 2]]), zones: new Set([""]) }]]),
    sujets: new Map([["horsgel", "Profondeur hors gel"], ["neige", "Zone de neige"]])
  });

  assert.match(html, /<b>3<\/b> emplois/);
  assert.match(html, /2 fonctions/);
  // « Personne ne s'en sert » est une information, pas un vide.
  assert.match(html, /aucun emploi/);
  // Et le compte ne se répète pas sur les lignes du bloc : trois « 3 emplois »
  // feraient croire à neuf.
  assert.equal((html.match(/<b>3<\/b> emplois/g) ?? []).length, 1);
});

test("sans lectures lisibles, la gouttière se tait plutôt que de dire « aucun emploi »", () => {
  // Ne pas savoir qui s'en sert et savoir que personne ne s'en sert sont deux
  // phrases différentes.
  const html = renderFichier(premierFichier([donnee("altitude", "Altitude du site", "13 m")]), {
    lecture: LECTURE.EMPLOIS,
    emplois: null
  });

  assert.doesNotMatch(html, /aucun emploi/);
  assert.match(html, /memoire-emploi--suite/);
});

test("le champ de recherche garde l'espace qu'on vient de taper", () => {
  // Le défaut : la valeur du champ était rognée à chaque redessin, et cette vue
  // se redessine à la frappe. L'espace disparaissait donc aussitôt tapé — il
  // fallait écrire « profondeurhors » puis revenir en arrière pour l'insérer.
  const html = renderFichier(premierFichier([donnee("altitude", "Altitude du site", "13 m")]), {
    recherche: { ouverte: true, mot: "profondeur hors ", rang: null }
  });

  assert.match(html, /value="profondeur hors "/);
});

test("la ligne trouvée porte bien sa marque", () => {
  // Le défaut : `memoire-ligne--trouvee` s'écrivait **après** la fermeture de
  // `class`, donc comme un attribut nu — `<div memoire-ligne--trouvee>`. Le
  // compte disait « 1 sur 6 » et pas une ligne n'était marquée ; les flèches,
  // qui cherchent `.memoire-ligne--trouvee`, ne menaient nulle part.
  const html = renderFichier(premierFichier([donnee("altitude", "Altitude du site", "13 m")]), {
    recherche: { ouverte: true, mot: "Altitude", rang: null }
  });

  assert.match(html, /class="[^"]*memoire-ligne--trouvee/);
  assert.match(html, /class="[^"]*is-courante/);
  assert.doesNotMatch(html, /"\s+memoire-ligne--trouvee/, "jamais hors de l'attribut class");
});

test("la provenance d'un calcul écrit ses mesures à la française", () => {
  // « calcul: hors gel (H0 du département = 0.5 m) » se lisait sous une valeur
  // écrite « 0,47 m » : deux façons pour la même cote.
  const lignes = lignesDeLAssertion({
    nature: "contrainte",
    payload: {
      subject: "Profondeur hors gel", value: "0.466 m",
      deduitDe: { calcul: "hors gel", entrees: [
        { sujet: "H0 du département", valeur: "0.5 m" },
        { sujet: "altitude du site", valeur: "13.22 m" }
      ] }
    }
  });

  const texte = lignes.map(clair).join("\n");
  assert.match(texte, /Profondeur hors gel = 0,466 m/);
  assert.match(texte, /H0 du département = 0,5 m ; altitude du site = 13,22 m/);
  assert.doesNotMatch(texte, /\d\.\d/, "plus un seul point décimal");
});

test("un nom versé hors de son domicile se dit des deux côtés", () => {
  // Règle 10, temps 3. Le taire ferait chercher longtemps pourquoi une valeur
  // n'est pas là où l'utilitaire a cru l'écrire.
  const fichier = premierFichier([donnee("altitude", "Altitude du site", "13 m")]);
  const conflit = {
    id: "x1", nom: "Profondeur hors gel",
    vise: "memoire/structure.ctr", domicile: "memoire/donnees-de-base.ddb"
  };

  const recu = renderFichier(fichier, { conflits: [{ ...conflit, domicile: fichier.fichier }] });
  assert.match(recu, /vers un autre fichier est arrivé ici/);
  assert.match(recu, /visait memoire\/structure\.ctr/);

  const attendu = renderFichier(fichier, { conflits: [{ ...conflit, vise: fichier.fichier }] });
  assert.match(attendu, /visait ce fichier et vit ailleurs/);
  assert.match(attendu, /dans memoire\/donnees-de-base\.ddb/);

  // Sans conflit, aucun bandeau : un écran qui crie pour rien cesse d'être lu.
  assert.doesNotMatch(renderFichier(fichier, {}), /vit ailleurs|arrivé ici/);
});

test("les trois lectures d'un fichier sont offertes", () => {
  const html = renderFichier(premierFichier([donnee("altitude", "Altitude du site", "13 m")]), {});
  for (const libelle of ["Code", "Origine", "Emplois"]) assert.match(html, new RegExp(`>${libelle}<`));
});

/* ── Une valeur venue d'un document antérieur à celui qui fait foi ───────── */

/** La même donnée, mais qui dit de quel document elle sort. */
const dune = (id, sujet, valeur, { du, saisiLe }) => ({
  ...donnee(id, sujet, valeur),
  decided_at: saisiLe,
  payload: {
    subject: sujet, value: valeur, declared: true,
    provenance: { type: "document", quoi: `rapport ${id}`, le: du }
  }
});

test("le fichier distingue une valeur corrigée d'une valeur arrivée après coup", () => {
  // Le défaut : « 0,50 m → 0,80 m, une valeur a été refaite » envoyait chercher
  // qui avait tranché. Personne n'avait tranché : quelqu'un avait saisi en
  // septembre un relevé de mars, et la mémoire s'était mise à dire le passé.
  const assertions = [
    dune("alt", "Altitude du site", "0,80 m", { du: "2026-06-12", saisiLe: "2026-07-01T08:00:00Z" }),
    dune("alt2", "Altitude du site", "0,50 m", { du: "2026-03-04", saisiLe: "2026-09-20T08:00:00Z" })
  ];
  const memoire = preparerLaMemoire(assertions);

  const html = renderFichier(premierFichier(assertions), {
    corrections: memoire.corrections,
    apresCoup: memoire.apresCoup
  });

  assert.match(html, /vient d'un document antérieur à celui qui fait foi/);
  assert.match(html, /Altitude du site/);
  assert.match(html, /c'est la date du document qui ordonne, pas celle de la saisie/);
});

test("sans date de document, le fichier parle encore de correction et non de décalage", () => {
  // La dégradation est choisie : deux valeurs qu'on ne sait dater que par leur
  // saisie n'ont pas de décalage chronologique à montrer.
  const assertions = [
    donnee("alt", "Altitude du site", "0,50 m"),
    { ...donnee("alt2", "Altitude du site", "0,80 m"), decided_at: "2026-09-20T08:00:00Z" }
  ];
  const memoire = preparerLaMemoire(assertions);

  const html = renderFichier(premierFichier(assertions), {
    corrections: memoire.corrections,
    apresCoup: memoire.apresCoup
  });

  assert.doesNotMatch(html, /document antérieur/);
  assert.match(html, /a été refaite par un versement plus récent/);
});
