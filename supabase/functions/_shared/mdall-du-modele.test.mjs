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

import { lireUnFichier, lireUneCondition } from "../../../apps/web/js/services/memoire-en-lecture.js";
import { aProposerDuBrouillon } from "../../../apps/web/js/services/proposition-du-brouillon.js";
import { ENNUI, verifierLeBrouillon } from "../../../apps/web/js/services/verification-du-brouillon.js";
import { PHRASE_DE_LAGREGAT } from "../../../apps/web/js/services/memoire-en-texte.js";
import { ENTRE, HORS } from "../../../apps/web/js/services/courbe-du-mdall.js";
import { LECTURE, SUGGESTIBLES, lectureDite, lectureSuggeree } from "../../../apps/web/js/services/graphique-dune-table.js";
import { evaluerLaCourbe } from "../../../apps/web/js/services/memoire-evaluateur.js";
import { evaluerLaCondition } from "../../../apps/web/js/services/memoire-evaluateur.js";
import { lancerLeBrouillon, ISSUE } from "../../../apps/web/js/services/bac-dessai.js";
import { calculer, ecrireLeCalcul } from "../../../apps/web/js/services/mdall-calcul.js";
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

test("chaque exemple de calcul de la consigne se vérifie contre le calculateur", () => {
  // Une consigne qu'on ne vérifie pas est une intention (règle 12). Les
  // exemples ne sont pas relus contre une seconde liste — ils sont **calculés**,
  // si bien qu'un exemple faux, ou une règle de conversion qu'on changerait
  // sans rouvrir la consigne, tombe ici.
  const section = (CONSIGNES.match(/# Un calcul, dans une fonction([\s\S]*?)\n# /) ?? [])[1] ?? "";
  assert.ok(section, "la consigne n'a plus de section « Un calcul »");

  const vaut = [...section.matchAll(/`([^`]+)`\s+(?:qui\s+)?vaut\s+`([^`]+)`/g)];
  assert.ok(vaut.length >= 4, `la consigne n'enseigne plus que ${vaut.length} calculs`);
  for (const [, expression, annonce] of vaut) {
    assert.equal(
      ecrireLeCalcul(calculer(expression)),
      annonce,
      `la consigne annonce ${expression} = ${annonce}`
    );
  }

  const refuses = [...section.matchAll(/`([^`]+)` est refusé/g)];
  assert.ok(refuses.length >= 2, "la consigne ne montre plus les calculs refusés");
  for (const [, expression] of refuses) {
    assert.equal(calculer(expression).connu, false, `${expression} n'est plus refusé`);
  }

  // La conversion vaut aussi dans une condition, et la consigne le dit : c'est
  // le lecteur puis l'évaluateur qui le confirment, pas une relecture.
  const [, clause, mesure] = section.match(/`si \(([^`]+)\)` tient pour [^`]+ de `([^`]+)`/) ?? [];
  assert.ok(clause, "la consigne ne montre plus la conversion dans une condition");
  assert.equal(
    evaluerLaCondition(lireUneCondition(clause), { connu: true, valeur: mesure }).verite,
    true,
    `la consigne annonce que « ${clause} » tient pour ${mesure}`
  );
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

test("chaque boucle de la consigne produit les colonnes que ses agrégats lisent", () => {
  /**
   * **Un agrégat qui nomme une colonne que la boucle ne produit pas est muet**,
   * et la fonction ne conclut rien. Montré au modèle, l'exemple lui enseigne
   * une incohérence qu'il recopiera — et l'on passera la journée à chercher
   * pourquoi une fonction qui « a l'air juste » ne rend rien.
   *
   * La vérification se fait contre le **lecteur du langage**, et non contre une
   * relecture : c'est la règle 12 appliquée à ce qu'on enseigne.
   */
  const avecUneBoucle = EXEMPLES
    .flatMap((exemple) => lireUnFichier(exemple).blocs)
    .filter((bloc) => bloc.boucle);

  assert.ok(avecUneBoucle.length >= 2, `la consigne n'enseigne plus que ${avecUneBoucle.length} boucles`);

  for (const bloc of avecUneBoucle) {
    const colonnes = bloc.boucle.calculs.map((un) => un.nom);
    assert.ok(colonnes.length, `la boucle de « ${bloc.sujet} » ne calcule rien`);

    const agregats = (bloc.calculs ?? []).filter((un) => un.agregat);
    assert.ok(agregats.length, `« ${bloc.sujet} » déroule un tableau que personne ne lit`);

    for (const { agregat } of agregats) {
      assert.ok(colonnes.includes(agregat.colonne),
        `« ${bloc.sujet} » lit une colonne « ${agregat.colonne} » que sa boucle ne produit pas`);
    }
  }
});

test("la consigne dit les cinq agrégats, et pas un de plus", () => {
  // Une phrase enseignée que le langage ne lit pas est pire qu'une absence : le
  // modèle l'écrit, et la ligne est refusée par la documentation elle-même.
  for (const [phrase] of PHRASE_DE_LAGREGAT) {
    assert.ok(CONSIGNES.includes(phrase), `la consigne ne nomme pas « ${phrase} »`);
  }
  assert.match(CONSIGNES, /pour chaque <nom> de <début> à <fin>\s*\n?\s*par pas de <pas>/);
  // Et les gardes, dits avant le lancement plutôt que découverts après.
  assert.match(CONSIGNES, /pas de zéro/);
  assert.match(CONSIGNES, /200 lignes/);
});

test("chaque abaque de la consigne se lit, et se lit vraiment quelque part", () => {
  /**
   * **Un exemple faux est pire qu'une consigne absente** : le modèle le copie,
   * et l'on passe la journée à chercher pourquoi le langage refuse ce que sa
   * propre documentation lui a montré. Une courbe dont les points seraient dans
   * le désordre, ou dont une déclaration manquerait, passerait la relecture
   * humaine sans un mot — mais pas celle du lecteur du langage (règle 12).
   */
  const courbes = EXEMPLES
    .flatMap((exemple) => lireUnFichier(exemple).blocs)
    .filter((bloc) => bloc.courbe);

  assert.ok(courbes.length >= 1, "la consigne n'enseigne plus d'abaque");

  for (const bloc of courbes) {
    assert.ok(bloc.courbe.selon, `« ${bloc.sujet} » ne dit pas ce qu'elle lit`);
    assert.ok(bloc.courbe.entre, `« ${bloc.sujet} » ne déclare pas son interpolation`);
    assert.ok(bloc.courbe.hors, `« ${bloc.sujet} » ne déclare pas ce qu'elle fait hors bornes`);

    // Et elle conclut vraiment : une courbe qu'on montre sans pouvoir la lire
    // enseignerait une forme qui ne sert à rien.
    const lu = evaluerLaCourbe(bloc.courbe, (sujet) => (sujet === bloc.courbe.selon
      ? { connu: true, valeur: bloc.courbe.points[0].x }
      : { connu: false, valeur: "" }));
    assert.equal(lu.valeur, bloc.courbe.points[0].y,
      `« ${bloc.sujet} » ne rend pas son premier point`);
  }
});

test("chaque signature de la consigne annonce ce que sa fonction lit", () => {
  /**
   * **Un exemple faux est pire qu'une consigne absente** : le modèle le copie,
   * et le brouillon est refusé par la documentation qui le lui a montré. La
   * signature est la seule chose du langage qui ne se vérifie pas d'elle-même
   * au lancement — elle ne lie rien —, et c'est donc la seule qui dérive sans
   * bruit (règle 12).
   */
  for (const [rang, exemple] of EXEMPLES.entries()) {
    const ennuis = verifierLeBrouillon([{ nom: "essai.ref", contenu: exemple }])
      .filter((une) => une.quoi === ENNUI.SIGNATURE || une.quoi === ENNUI.REND);
    assert.deepEqual(ennuis.map((une) => une.dit), [], `exemple ${rang + 1}`);
  }
});

test("la consigne enseigne la signature et « rend: », et le langage les lit", () => {
  // Un mot enseigné que le langage ne lit pas est pire qu'une absence.
  assert.match(CONSIGNES, /`zones` en premier et toujours/);
  assert.match(CONSIGNES, /annonce tout ce que la fonction lit/);
  assert.match(CONSIGNES, /rend: "gris" ou "blanc"/);
  assert.match(CONSIGNES, /rend: kN/);

  // Et l'exemple qui les porte se lit, avec sa promesse.
  const avecRend = EXEMPLES.find((un) => un.includes("rend:"));
  assert.ok(avecRend, "la consigne n'enseigne plus « rend: »");

  const lu = lireUnFichier(avecRend);
  assert.deepEqual(lu.refus, []);
  assert.deepEqual(lu.blocs[0].rend, { valeurs: ["gris", "blanc"], unite: "" });
});

test("la consigne dit qu'un abaque se verse, et le versement l'accepte", () => {
  /**
   * **Une consigne qui dirait le contraire de ce que le code fait est pire
   * qu'une absence** : le modèle convertirait ses abaques en barèmes « pour
   * qu'ils puissent être enregistrés », et l'on perdrait l'interpolation —
   * c'est-à-dire tout ce pour quoi cette forme existe (règle 12).
   */
  assert.match(CONSIGNES, /une loi que le projet tient/);
  // La consigne est repliée à quatre-vingts colonnes : la phrase traverse une
  // fin de ligne, et une épreuve qui l'ignorerait tomberait au premier retour.
  assert.match(CONSIGNES, /convertir en barème/);
  assert.match(CONSIGNES, /tu perdrais\s+l['’]interpolation/);

  // Et c'est vrai : l'abaque de la consigne se verse vraiment.
  const abaque = EXEMPLES.find((un) => un.trim().startsWith("courbe "));
  assert.ok(abaque, "la consigne n'enseigne plus d'abaque");

  const rendu = aProposerDuBrouillon([{ nom: "essai.ref", contenu: abaque }]);
  assert.deepEqual(rendu.sansRetour, []);
  assert.equal(rendu.affirmations[0]?.referentiel, true);
  assert.ok(rendu.affirmations[0]?.regle?.courbe?.points?.length >= 2);
});

test("la consigne dit les quatre mots d'une courbe, et la faute qu'ils évitent", () => {
  // Un mot enseigné que le langage ne lit pas est pire qu'une absence : le
  // modèle l'écrit, et la ligne est refusée par la documentation elle-même.
  for (const mot of [...Object.values(ENTRE), ...Object.values(HORS)]) {
    assert.ok(CONSIGNES.includes(mot), `la consigne ne nomme pas « ${mot} »`);
  }
  assert.match(CONSIGNES, /entre les points:/);
  assert.match(CONSIGNES, /hors bornes:/);
  // Et la raison, dite plutôt que supposée : c'est la faute la plus chère.
  assert.match(CONSIGNES, /plausible/);
});

test("la consigne dit les lectures qui se suggèrent, et le lecteur les accepte", () => {
  /**
   * **Un mot enseigné que le langage ne lit pas est pire qu'une absence** : le
   * modèle l'écrit, et la ligne est refusée par la documentation elle-même. Ici
   * la faute serait muette dans l'autre sens aussi — une lecture que le lecteur
   * accepte et que la consigne ne nomme pas ne sera jamais écrite (règle 12).
   */
  for (const une of SUGGESTIBLES) {
    assert.ok(CONSIGNES.includes(`\`${une}\``), `la consigne ne nomme pas « ${une} »`);
    assert.equal(lectureSuggeree(une).dite, une, `le lecteur refuse « ${une} »`);
  }
  assert.match(CONSIGNES, /se lit en:/);

  // Et la consigne interdit le verbe d'affichage, qui est la forme que le modèle
  // proposerait de lui-même : c'est tout le parti pris de cet objet.
  assert.match(CONSIGNES, /n['’]est pas une construction du langage/);
});

test("la consigne interdit de suggérer un nuage, et le lecteur le refuse aussi", () => {
  /**
   * **C'est la seule lecture qui existe et qui ne se suggère pas.** Le modèle
   * l'écrirait de lui-même — c'est une lecture, elle a un nom —, et chaque
   * fonction portant la ligne serait refusée au lancement. L'interdire d'un
   * côté sans le refuser de l'autre laisserait l'un des deux dériver (règle 12).
   */
  assert.ok(CONSIGNES.includes("se lit en: nuage"), "la consigne ne met pas en garde");
  assert.match(CONSIGNES, /ne se suggère pas/);

  assert.equal(lectureDite("nuage"), LECTURE.NUAGE, "le nuage n'est plus une lecture");
  assert.equal(lectureSuggeree("nuage").dite, "", "le lecteur accepte une suggestion interdite");
  assert.ok(!SUGGESTIBLES.includes(LECTURE.NUAGE));

  // Et la consigne dit ce qu'il ne faut surtout pas faire à la place : ramener
  // deux grandeurs à une seule unité change ce que la fonction conclut.
  assert.match(CONSIGNES, /deux cadres empilés/);
});

test("l'exemple de lecture de la consigne se range vraiment, et son tableau se dessine", () => {
  /**
   * **Un exemple faux est pire qu'une consigne absente.** Une ligne `se lit en:`
   * mal placée — après la boucle, ou sur une fonction qui n'en porte pas —
   * passerait la relecture humaine sans un mot, et le modèle la recopierait.
   */
  const exemple = EXEMPLES.find((un) => un.includes("se lit en:"));
  assert.ok(exemple, "la consigne n'enseigne plus de lecture");

  const lu = lireUnFichier(exemple);
  assert.deepEqual(lu.refus, []);

  const bloc = lu.blocs.find((un) => un.seLitEn);
  assert.ok(bloc, "la ligne enseignée ne se range sur aucune fonction");
  assert.equal(lectureDite(bloc.seLitEn), bloc.seLitEn);

  // Et elle porte bien une boucle : une suggestion sans tableau ne dessinerait
  // rien, et l'on enseignerait une ligne qui ne sert à rien.
  assert.ok(bloc.boucle, `« ${bloc.sujet} » suggère une lecture sans porter de boucle`);
});

test("la consigne montre les deux façons de se servir d'une fonction", () => {
  /**
   * **Le chaînage d'abord**, parce qu'il se lit sans rien connaître : chaque
   * ligne se lit seule. L'appel ensuite, pour le cas où le nom qu'on a n'est
   * pas celui que la fonction a déclaré — sans lui, on réécrit la fonction, et
   * le projet en tient deux.
   */
  assert.match(CONSIGNES, /conclut \*\*sous son propre nom\*\*/);
  assert.match(CONSIGNES, /\*\*L'appeler\.\*\*/);
  assert.match(CONSIGNES, /Couleur des volets\(zones, Matériau\)/);

  // Ce qu'un appel exige, et ce qu'il n'est pas.
  assert.match(CONSIGNES, /l'ordre est celui de la \*\*signature\*\*/);
  assert.match(CONSIGNES, /jamais\*\* seul sur sa ligne/);
  assert.match(CONSIGNES, /ne s'appelle pas elle-même/);

  // Et il dit de ne pas déclarer en entrée ce qu'une fonction conclut.
  assert.match(CONSIGNES, /ne déclare pas\*\*/i);

  // **Plus aucune phrase n'interdit l'appel.** La consigne enseignerait sinon
  // une langue qui n'est plus la nôtre, et c'est la faute la plus chère : on ne
  // la voit pas tomber, on voit seulement le modèle écrire faux.
  assert.doesNotMatch(CONSIGNES, /pas d'appel/i);
});

test("l'exemple de chaînage de la consigne conclut vraiment, sans rien demander de trop", () => {
  // La consigne montre deux fonctions dont la seconde lit la première. Si le
  // langage ne savait pas le faire, on enseignerait au modèle une syntaxe qui
  // ne marche pas — ce qui est exactement ce qu'on vient de corriger.
  /**
   * **Deux fonctions, et c'est ce qui fait le chaînage.** Chercher les deux
   * noms suffisait tant qu'un seul exemple les portait ; la consigne en montre
   * un autre où « Taux de TVA » est une entrée, et l'épreuve s'est mise à
   * l'éprouver lui — en exigeant qu'un nom qu'il faut vraiment saisir ne soit
   * pas demandé.
   */
  const chaine = EXEMPLES.find((un) =>
    (un.match(/^fonction /gm) ?? []).length === 2
    && un.includes("Taux de TVA") && un.includes("Prix TTC"));
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

test("la consigne dit, avant toute grammaire, qu'une règle devient une fonction", () => {
  // **Le défaut vu à l'écran, et il est resté après deux rondes.** « Si nature
  // des volets = bois alors couleur des volets = violet » rendait les deux
  // déclarations et aucune règle. Le modèle avait déclaré la conclusion comme
  // une entrée : il n'avait pas vu qu'il y avait une fonction à écrire.
  //
  // La phrase est donc dans la section des fichiers, avant la grammaire — pas
  // dans une puce au milieu de dix autres.
  const fichiers = CONSIGNES.indexOf("# Les trois fichiers");
  const grammaire = CONSIGNES.indexOf("# Une déclaration de nom");
  assert.ok(fichiers > 0 && grammaire > fichiers);

  const section = CONSIGNES.slice(fichiers, grammaire);
  assert.match(section, /une règle devient une\s*\n?\s*fonction dans `essai\.ref`/);
  // Et elle dit l'autre moitié : ce qu'une règle conclut ne se déclare pas.
  assert.match(section, /ne se déclare pas dans/);
  // Sur l'exemple même qui a échoué, pour qu'on ne le relise pas en diagonale.
  assert.match(section, /nature\s*\n?\s*des volets/i);
});

test("la consigne interdit la conclusion qui affecte, que la lecture refuse", () => {
  // `alors (Couleur des volets = "violet")` est la transcription la plus
  // littérale de la phrase française — et elle était avalée sans un mot.
  assert.match(CONSIGNES, /une conclusion pose une valeur, pas une affectation/);

  const lu = lireUnFichier([
    "fonction Couleur des volets(zones, Nature des volets) {",
    '   si (Nature des volets = "bois")',
    '   alors (Couleur des volets = "violet");',
    "}"
  ].join("\n"));
  assert.ok(lu.refus.some((un) => /conclut sous son nom/.test(un.raison)),
    "la consigne l'interdit et la lecture l'accepte");
});

test("l'exemple à plusieurs cas conclut les trois, et n'en demande aucun à la main", () => {
  // **`sinon si` est entré dans le langage**, et la consigne le montre. Un
  // exemple qu'on ne lance pas est une intention : celui-ci tourne ici, sur les
  // trois cas, et vérifie qu'aucun taux n'est demandé à la main.
  const chaine = EXEMPLES.find((un) => un.includes("sinon si"));
  assert.ok(chaine, "la consigne ne montre pas comment écrire plusieurs cas");

  const fichiers = [{ nom: "essai.ref", contenu: chaine }];
  assert.deepEqual(lireUnFichier(chaine).refus, [], "l'exemple ne se lit pas");
  assert.deepEqual(champsDuBrouillon(fichiers).map((un) => un.nom), ["Type de TVA"]);

  const conclut = (type) => {
    const taux = lancerLeBrouillon(fichiers, { "Type de TVA": type })
      .find((un) => un.sujet === "Taux de TVA");
    return { issue: taux.issue, valeur: taux.valeur };
  };

  assert.deepEqual(conclut("existant"), { issue: ISSUE.TIENT, valeur: "5,5 %" });
  assert.deepEqual(conclut("rénovation"), { issue: ISSUE.TIENT, valeur: "10 %" });
  assert.deepEqual(conclut("neuf"), { issue: ISSUE.TIENT, valeur: "20 %" });
});

test("la consigne enseigne l'enchaînement, et dit que l'ordre fait le sens", () => {
  // Sans l'ordre, une chaîne dont la branche la plus générale vient en premier
  // ne donne jamais la main aux suivantes — et rien ne le dirait.
  assert.match(CONSIGNES, /autant qu'il en faut/);
  assert.match(CONSIGNES, /première branche qui tient l'emporte/);
  assert.match(CONSIGNES, /n'abandonne jamais une règle parce\s*\n?\s*qu'elle a beaucoup de cas/i);
  // Et elle ne dit plus le contraire.
  assert.doesNotMatch(CONSIGNES, /ni branche enchaînée/);
});
