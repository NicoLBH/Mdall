/**
 * La consigne, le schéma, et ce qui revient du modèle.
 *
 * Un modèle qui écrit du code écrit du code **plausible** : rien dans sa
 * réponse ne distingue une fonction juste d'une fonction dont la condition
 * porte sur un nom que personne n'a déclaré. Ce fichier éprouve ce qui se
 * vérifie sans appeler personne — la forme de la réponse, et ce que la consigne
 * dit vraiment.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  CE_QUE_PORTE,
  CONSIGNES,
  FICHIERS_PERMIS,
  SCHEMA_DU_MDALL,
  fichiersDuModele,
  lacunesDuModele
} from "./mdall-du-modele.js";

import { lireUnFichier } from "../../../apps/web/js/services/memoire-en-lecture.js";
import { lancerLeBrouillon, ISSUE } from "../../../apps/web/js/services/bac-dessai.js";
import { champsDuBrouillon } from "../../../apps/web/js/services/formulaire-du-brouillon.js";
import { FICHIERS_DU_BROUILLON } from "../../../apps/web/js/services/brouillon-mdall.js";
import { EXTENSIONS, EXTENSION_REGLE } from "../../../apps/web/js/services/memoire-rangement.js";

/* ── La liste des fichiers est fermée, et elle est celle du projet ───────── */

test("chaque fichier permis porte une extension que le projet sait lire", () => {
  // Un nom inventé — `raisonnement.mdall` — ne serait pas un fichier de trop :
  // ce serait un fichier que le projet ne sait pas ranger, et dont le contenu
  // ne se verserait jamais.
  const connues = new Set([...Object.values(EXTENSIONS), EXTENSION_REGLE]);

  for (const nom of FICHIERS_PERMIS) {
    const extension = nom.slice(nom.lastIndexOf(".") + 1);
    assert.ok(connues.has(extension), `${nom} : extension ${extension} inconnue du projet`);
  }
});

test("le modèle a le droit d'écrire exactement les fichiers du brouillon", () => {
  // Deux listes qui disent la même chose divergent (règle 4), et celle-ci
  // divergerait en silence : un quatrième fichier ajouté au brouillon serait un
  // fichier que le modèle ne remplirait jamais, sans que rien ne le dise.
  assert.deepEqual(FICHIERS_PERMIS, FICHIERS_DU_BROUILLON.map((un) => un.nom));
});

test("le schéma ferme la liste des noms sur la même liste", () => {
  // Deux listes qui disent la même chose finissent par diverger (règle 4).
  assert.deepEqual(SCHEMA_DU_MDALL.schema.properties.fichiers.items.properties.nom.enum, FICHIERS_PERMIS);
});

test("chaque fichier permis dit ce qu'il porte", () => {
  for (const nom of FICHIERS_PERMIS) {
    assert.equal(typeof CE_QUE_PORTE[nom], "string", nom);
    assert.ok(CE_QUE_PORTE[nom].length > 10, nom);
  }
});

/* ── La forme de la réponse ──────────────────────────────────────────────── */

test("les lacunes sont exigées, pas facultatives", () => {
  // Le silence est le mode de défaillance le plus coûteux : une phrase du
  // français qui disparaît sans un mot laisse croire qu'elle a été codée. Un
  // champ facultatif serait omis, et la moitié de ce qu'on vient chercher
  // n'arriverait jamais.
  assert.ok(SCHEMA_DU_MDALL.schema.required.includes("ce_que_je_nai_pas_su_ecrire"));
  assert.ok(SCHEMA_DU_MDALL.schema.required.includes("fichiers"));
  assert.equal(SCHEMA_DU_MDALL.strict, true);
});

test("une lacune porte sa raison, et un fichier son contenu entier", () => {
  const lacune = SCHEMA_DU_MDALL.schema.properties.ce_que_je_nai_pas_su_ecrire.items;
  assert.deepEqual(lacune.required, ["phrase", "pourquoi"]);
  assert.equal(lacune.additionalProperties, false);

  const fichier = SCHEMA_DU_MDALL.schema.properties.fichiers.items;
  assert.deepEqual(fichier.required, ["nom", "contenu"]);
  assert.equal(fichier.additionalProperties, false);
});

/* ── Ce que la consigne enseigne vraiment ────────────────────────────────── */

test("la consigne nomme les trois fichiers, et dit ce que chacun porte", () => {
  for (const nom of FICHIERS_PERMIS) {
    assert.ok(CONSIGNES.includes(nom), `la consigne ne nomme pas ${nom}`);
    assert.ok(CONSIGNES.includes(CE_QUE_PORTE[nom]), `la consigne ne dit pas ce que porte ${nom}`);
  }
});

test("la consigne enseigne l'arithmétique que le langage sait lire", () => {
  // Elle l'interdisait mot pour mot ; le langage sait maintenant calculer, et
  // une consigne qui dirait encore le contraire ferait mettre une TVA à 20 %
  // dans « ce que je n'ai pas su écrire ».
  assert.match(CONSIGNES, /calcule <Nom> = <expression>;/);
  assert.match(CONSIGNES, /Prix HT \* 20%/);
  for (const fonction of ["racine", "abs", "arrondi", "plafond", "plancher", "min", "max"]) {
    assert.ok(CONSIGNES.includes(fonction), `la consigne ne nomme pas ${fonction}`);
  }
  // Et les deux pièges que le langage refuse, dits au modèle plutôt que
  // découverts au lancement : le point-virgule, et les unités.
  assert.match(CONSIGNES, /point-virgule/);
  assert.match(CONSIGNES, /3 m \+ 2. est refusé/);
});

test("la consigne interdit toujours d'inventer ce qu'elle ne sait pas écrire", () => {
  // Une arithmétique inventée reste indiscernable d'une arithmétique juste :
  // ce qui a changé, c'est la frontière, pas la règle.
  assert.match(CONSIGNES, /ne l'invente pas/i);
  assert.match(CONSIGNES, /ce_que_je_nai_pas_su_ecrire/);
  assert.match(CONSIGNES, /boucle/);
});

test("la consigne interdit d'inventer une provenance", () => {
  // Une provenance inventée est le pire : elle sera citée six mois plus tard
  // comme si elle existait.
  assert.match(CONSIGNES, /provenance inventée/i);
});

test("la consigne interdit d'inventer une liste fermée de valeurs", () => {
  // Une liste fermée qu'on suppose signalerait comme une faute la première
  // valeur nouvelle et légitime.
  assert.match(CONSIGNES, /valeurs possibles/);
  assert.match(CONSIGNES, /Ne l'invente jamais/i);
});

test("la consigne enseigne les trois espaces, et refuse les caractères qu'on ne tape pas", () => {
  assert.match(CONSIGNES, /trois espaces/);
  assert.match(CONSIGNES, /jamais une tabulation/);
});

test("la consigne n'enseigne aucun comparateur que le lecteur ne sait pas lire", () => {
  // Une consigne qu'on ne vérifie pas est une intention (règle 12). Celle-ci se
  // vérifie contre le lecteur lui-même, et non contre une seconde liste.
  const enseignes = (CONSIGNES.match(/comparateurs :([^\n]*(?:\n[^\n#]*)*)/) ?? [])[1] ?? "";
  assert.ok(enseignes, "la consigne n'énumère plus ses comparateurs");

  for (const mot of ["parmi", "renseigné", "non renseigné", "!=", "<=", ">="]) {
    assert.ok(enseignes.includes(mot), `comparateur absent de la consigne : ${mot}`);
  }
});

/* ── Ce qui revient ──────────────────────────────────────────────────────── */

test("un nom hors de la liste est écarté, même si le schéma l'a laissé passer", () => {
  // Le schéma ferme déjà la liste ; on la referme ici, parce qu'un schéma se
  // relâche le jour où quelqu'un le change.
  const fichiers = fichiersDuModele({
    fichiers: [
      { nom: "raisonnement.mdall", contenu: "quelque chose" },
      { nom: "essai.ref", contenu: "fonction A() {\n}\n" }
    ]
  });

  assert.deepEqual(fichiers, [{ nom: "essai.ref", contenu: "fonction A() {\n}\n" }]);
});

test("un fichier vide est écarté : il écraserait celui qu'on a écrit à la main", () => {
  assert.equal(fichiersDuModele({ fichiers: [{ nom: "essai.ref", contenu: "  \n " }] }), null);
});

test("sans aucun fichier lisible, on rend null plutôt qu'un brouillon vide", () => {
  // Un tableau vide se lirait comme « le modèle n'a rien trouvé à dire », ce
  // qui est une conclusion ; `null` dit qu'on n'a rien pu lire (règle 5).
  assert.equal(fichiersDuModele({ fichiers: [] }), null);
  assert.equal(fichiersDuModele(null), null);
  assert.equal(fichiersDuModele({ fichiers: "essai.ref" }), null);
});

test("l'indentation du modèle se garde : trois espaces font partie du langage", () => {
  const [fichier] = fichiersDuModele({
    fichiers: [{ nom: "essai.ref", contenu: "fonction A(zones) {\n   si (x = \"1\")\n   alors (\"2\");\n}\n" }]
  });

  assert.equal(fichier.contenu, "fonction A(zones) {\n   si (x = \"1\")\n   alors (\"2\");\n}\n");
});

test("les lacunes remontent nettoyées, et celle qui n'a pas de phrase tombe", () => {
  assert.deepEqual(
    lacunesDuModele({
      ce_que_je_nai_pas_su_ecrire: [
        { phrase: "  multiplie la surface par 0,7 ", pourquoi: " Mdall ne calcule pas. " },
        { phrase: "   ", pourquoi: "sans phrase" },
        { phrase: "fais la moyenne" }
      ]
    }),
    [
      { phrase: "multiplie la surface par 0,7", pourquoi: "Mdall ne calcule pas." },
      { phrase: "fais la moyenne", pourquoi: "" }
    ]
  );
});

test("un modèle qui ne déclare aucune lacune rend une liste vide, pas une panne", () => {
  assert.deepEqual(lacunesDuModele({ fichiers: [] }), []);
  assert.deepEqual(lacunesDuModele(null), []);
});

/* ── Ce que la consigne montre est du Mdall que la lecture accepte ───────── */

/** Les exemples encadrés de la consigne, tels qu'on les donne à lire au modèle. */
const EXEMPLES = [...CONSIGNES.matchAll(/```\n([\s\S]*?)```/g)].map((une) => une[1]);

test("chaque exemple de la consigne se lit sans un refus", () => {
  // **Un exemple faux est pire qu'une consigne absente** : le modèle le copie,
  // et l'on passe la journée à chercher pourquoi le langage refuse ce que sa
  // propre documentation lui a montré. C'est arrivé au wiki ; la même épreuve
  // tient ici, et c'est la seule façon de ne pas se fier à la relecture.
  assert.ok(EXEMPLES.length >= 5, `trop peu d'exemples trouvés : ${EXEMPLES.length}`);

  for (const [rang, exemple] of EXEMPLES.entries()) {
    assert.deepEqual(lireUnFichier(exemple).refus, [],
      `l'exemple ${rang + 1} de la consigne ne se lit pas :\n${exemple}`);
  }
});

test("la consigne interdit l'appel de fonction, et montre le chaînage à la place", () => {
  // **C'est le défaut qu'on a vu à l'écran.** Faute de savoir enchaîner, le
  // modèle inventait `Taux de TVA(zones, Type de TVA)` : la ligne ne se lisait
  // pas, et le formulaire demandait alors « taux » à la main — c'est-à-dire la
  // réponse que la phrase demandait de déduire.
  assert.match(CONSIGNES, /pas d'appel de fonction/i);
  assert.match(CONSIGNES, /conclut \*\*sous son propre nom\*\*/);
  // Et il dit de ne pas déclarer en entrée ce qu'une fonction conclut.
  assert.match(CONSIGNES, /ne déclare pas\*\*/i);
});

test("l'exemple de chaînage de la consigne conclut vraiment, sans rien demander de trop", () => {
  // La consigne montre deux fonctions dont la seconde lit la première. Si le
  // langage ne savait pas le faire, on enseignerait au modèle une syntaxe qui
  // ne marche pas — ce qui est exactement ce qu'on vient de corriger.
  const chaine = EXEMPLES.find((un) => un.includes("Taux de TVA") && un.includes("Prix TTC"));
  assert.ok(chaine, "la consigne ne montre pas d'exemple de chaînage");

  const fichiers = [{ nom: "essai.ref", contenu: chaine }];

  // Le taux est déduit : il ne fait pas partie de ce qu'on demande.
  const demandes = champsDuBrouillon(fichiers).map((un) => un.nom);
  assert.deepEqual(demandes.includes("Taux de TVA"), false, `demandé à tort : ${demandes.join(", ")}`);

  const lance = lancerLeBrouillon(fichiers, { "Prix HT": "120 €", "Type de TVA": "neuf" });
  const prix = lance.find((un) => un.sujet === "Prix TTC");
  assert.equal(prix.issue, ISSUE.TIENT);
  assert.equal(prix.valeur, "144 €");
});
