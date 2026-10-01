/**
 * Ce qu'on vérifie ici est **ce qui ne sort pas**.
 *
 * La console d'administration regarde des comptes, jamais leur contenu. Un
 * export est le seul endroit où ce contenu pourrait quitter le produit en
 * silence, dans un fichier qu'on relira ailleurs sans l'écran qui l'explique.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  leNomDuCorpus, leNomDuFichier, lexportDesIdees, lexportDuCorpus,
  lexportEnJson, phraseDeLexport, phraseDuCorpus
} from "./lexport-des-idees.js";

const UNE = { avant: "terrain argileux", lien: "cause", apres: "plancher beton",
  affirmations: 46, chantiers: 4 };

const TOUT = {
  idees: [UNE],
  mesure: { montrees: 7, cachees: 412, affirmations: 9285, liantes: 61, lisibles: 61 },
  forme: { affirmations: 9285, mots_moyens: 4.2, au_moins_dix_mots: 310, sans_liaison: 9100 },
  liaisons: [{ mot: "donc", lien: "cause", contenues: 180, premieres: 120,
    entieres: 40, sans_terme: 75, tautologies: 5, chantiers: 4 }],
  raisonnements: [{
    idees: [UNE, { avant: "plancher beton", lien: "obligation", apres: "delai chantier" }],
    pas: 2, chantiers: 3, affirmations: 18, boucle: false, tronquee: false
  }],
  quand: new Date("2026-10-01T09:00:00Z")
};

test("l'export porte la mesure, la forme, les liaisons, les idées et les chaînes", () => {
  const porte = lexportDesIdees(TOUT);

  assert.equal(porte.mesure.affirmations, 9285);
  assert.equal(porte.mesure.cachees, 412);
  assert.equal(porte.forme.auMoinsDixMots, 310);
  assert.equal(porte.forme.motsMoyens, 4.2);
  assert.equal(porte.liaisons[0].sansTerme, 75);
  assert.equal(porte.idees[0].avant, "terrain argileux");
  assert.match(porte.raisonnements[0].dit, /terrain argileux entraîne plancher beton/);
  assert.equal(porte.le, "2026-10-01T09:00:00.000Z");
});

/**
 * **La porte est fermée par défaut.**
 *
 * Elle recopie les champs qu'elle connaît, un par un. Une colonne ajoutée
 * demain à une fonction de base — une citation, un extrait, un nom de chantier
 * — ne sortira pas parce que personne n'y aura pensé : elle ne sortira pas
 * parce qu'elle n'est pas dans la liste.
 */
test("un champ que la porte ne connaît pas ne sort pas", () => {
  const porte = lexportDesIdees({
    ...TOUT,
    idees: [{ ...UNE, phrase: "Le terrain argileux du bâtiment A est confirmé",
      projet: "Montholon — Médiathèque" }],
    mesure: { ...TOUT.mesure, exemple: "Le plancher du R+2 sera repris" },
    forme: { ...TOUT.forme, premiere: "Menuiseries du hall d'accueil" },
    liaisons: [{ ...TOUT.liaisons[0], citation: "…donc le plancher sera repris" }]
  });

  // Aucun contenu de chantier, nulle part dans le fichier.
  const dit = JSON.stringify(porte);
  for (const fuite of ["bâtiment A", "Montholon", "R+2", "hall d'accueil",
    "sera repris", "du hall"]) {
    assert.equal(dit.includes(fuite), false,
      `« ${fuite} » est sorti de la console : la porte laisse passer ce qu'elle ne connaît pas`);
  }

  // **Et les champs eux-mêmes sont exactement ceux qu'on a écrits ici.** Le
  // texte seul ne suffirait pas : une clé inconnue au contenu anodin
  // aujourd'hui portera autre chose demain.
  assert.deepEqual(Object.keys(porte.idees[0]).sort(),
    ["affirmations", "apres", "avant", "chantiers", "lien"]);
  assert.deepEqual(Object.keys(porte.mesure).sort(),
    ["affirmations", "cachees", "liantes", "lisibles", "montrees"]);
  assert.deepEqual(Object.keys(porte.forme).sort(),
    ["affirmations", "auMoinsDixMots", "motsMoyens", "sansLiaison"]);
  assert.deepEqual(Object.keys(porte.liaisons[0]).sort(),
    ["chantiers", "contenues", "entieres", "lien", "mot", "premieres",
      "sansTerme", "tautologies"]);
  assert.deepEqual(Object.keys(porte.raisonnements[0]).sort(),
    ["affirmations", "boucle", "chantiers", "dit", "pas", "tronquee"]);
  assert.deepEqual(Object.keys(porte).sort(),
    ["forme", "idees", "le", "liaisons", "manques", "mesure", "note", "quoi",
      "raisonnements"]);
});

/* ── Ce qu'on n'a pas su lire se nomme ───────────────────────────────────── */

/**
 * **Le défaut, tel qu'il s'est vu.**
 *
 * L'écran annonçait « 64 affirmations énoncent un lien », et le bouton
 * d'export, deux cartes plus bas : « 0 idée, 0 mot de liaison détaillé ». Le
 * second zéro n'était pas un compte — c'était une lecture qui n'était pas
 * revenue, recopiée en liste vide.
 *
 * Relu trois semaines plus tard, loin de l'écran, rien ne permettait de faire
 * la différence entre « le corpus ne porte aucun mot de liaison » et « on n'a
 * pas su les compter » (règle 5).
 */
test("une lecture qui n'est pas revenue se nomme dans le fichier", () => {
  const porte = lexportDesIdees({ ...TOUT, liaisons: null, forme: null });

  assert.deepEqual(porte.manques, ["la forme des affirmations", "le détail des liaisons"]);
  assert.deepEqual(porte.liaisons, [], "et le fichier reste lisible");
  assert.equal(porte.forme, null);
});

/** Tout revenu : rien à dire, et rien n'est dit. */
test("un export complet ne se commente pas", () => {
  assert.deepEqual(lexportDesIdees(TOUT).manques, []);
});

/**
 * **Et la phrase du bouton explique son zéro.** « 0 idée » est vrai et
 * déroutant : ce qui manque n'est pas le découpage, c'est le **second
 * chantier** — la console ne montre que ce que deux chantiers partagent.
 */
test("la phrase du bouton dit pourquoi zéro, et ce qui manque", () => {
  const dite = phraseDeLexport({ ...TOUT, idees: [], liaisons: null });

  assert.match(dite, /Aucune idée n'est encore partagée par deux chantiers/);
  assert.match(dite, /Non lu : le détail des liaisons\./);
});

/** Avec des idées et tout lu, elle ne porte ni l'une ni l'autre. */
test("la phrase ne s'excuse pas quand il n'y a rien à expliquer", () => {
  const dite = phraseDeLexport(TOUT);

  assert.doesNotMatch(dite, /Aucune idée/);
  assert.doesNotMatch(dite, /Non lu/);
});

test("une non-idée ne s'exporte pas, et une chaîne sans verbe non plus", () => {
  const porte = lexportDesIdees({
    idees: [{ avant: "a", lien: "concession", apres: "b" }, { ...UNE, apres: "" }],
    raisonnements: [{ idees: [{ avant: "a", lien: "concession", apres: "b" }] }]
  });
  assert.deepEqual(porte.idees, []);
  assert.deepEqual(porte.raisonnements, []);
});

/** Ne pas savoir n'est pas savoir qu'il n'y a rien : `null`, et non des zéros. */
test("une mesure absente sort nulle, pas à zéro", () => {
  const porte = lexportDesIdees({ idees: [UNE] });
  assert.equal(porte.mesure, null);
  assert.equal(porte.forme, null);
  assert.deepEqual(porte.liaisons, []);
});

test("l'export dit lui-même ce qu'il n'est pas", () => {
  const porte = lexportDesIdees(TOUT);
  assert.match(porte.note, /Aucun contenu de projet/);
  assert.match(porte.quoi, /console/);
});

test("le fichier porte sa date, pour qu'on sache lequel est lequel", () => {
  assert.equal(leNomDuFichier(new Date("2026-10-01T09:00:00Z")),
    "mdall-les-idees-2026-10-01.json");
  // Une date qui n'en est pas une ne fait pas tomber le nom.
  assert.match(leNomDuFichier("pas une date"), /^mdall-les-idees-\d{4}-\d{2}-\d{2}\.json$/);
  assert.match(leNomDuFichier(), /^mdall-les-idees-\d{4}-\d{2}-\d{2}\.json$/);
});

test("le json se relit", () => {
  const relu = JSON.parse(lexportEnJson(TOUT));
  assert.equal(relu.idees[0].apres, "plancher beton");
  assert.equal(relu.liaisons[0].mot, "donc");
});

test("le bouton dit ce qu'il emporte avant qu'on clique", () => {
  const dite = phraseDeLexport(TOUT);
  assert.match(dite, /1 idée/);
  assert.match(dite, /1 mot de liaison/);
  assert.match(dite, /aucun contenu de projet/);
});

test("un export vide ne tombe pas", () => {
  const porte = lexportDesIdees();
  assert.deepEqual(porte.idees, []);
  assert.deepEqual(porte.liaisons, []);
  assert.equal(porte.mesure, null);
  assert.ok(porte.le);
});

/* ── Le corpus en clair, et sa porte à lui ───────────────────────────────── */

/**
 * **Celle-ci laisse sortir du contenu de chantier**, et c'est assumé : on ne
 * peut pas améliorer le découpage sans voir ce qu'il n'a pas su lire. Elle
 * reste pourtant fermée par défaut comme l'autre — les champs connus, recopiés
 * un par un. Une colonne ajoutée demain à la fonction de base ne sortira pas
 * parce qu'elle n'est pas dans la liste.
 */
test("le corpus laisse sortir le texte, et rien qui désigne un chantier", () => {
  const porte = lexportDuCorpus({
    lignes: [{
      chantier: 2,
      dit: "Le terrain argileux est confirmé donc le plancher beton sera repris",
      avant: "terrain argileux", lien: "cause", apres: "plancher beton", mot: "donc",
      // Ce que la base pourrait porter demain, et qui ne doit pas sortir.
      project_id: "11111111-1111-4111-8111-111111111111",
      document: "1824_CR_12.pdf",
      auteur: "ourdine.ferrand@novaclim.example"
    }],
    quand: new Date("2026-10-01T09:00:00Z")
  });

  assert.deepEqual(Object.keys(porte.corpus[0]).sort(),
    ["apres", "avant", "chantier", "dit", "lien", "mot"]);

  const texte = JSON.stringify(porte);
  for (const fuite of ["11111111", "1824_CR_12", "ourdine", "novaclim"]) {
    assert.equal(texte.includes(fuite), false,
      `« ${fuite} » est sorti : la porte laisse passer ce qu'elle ne connaît pas`);
  }
});

/**
 * **« La coupe n'a rien tiré » n'est pas « elle a tiré un terme vide ».**
 * Relu dans un tableur, le second se compterait comme une idée (règle 5).
 */
test("une affirmation que la coupe ne lit pas sort avec des nuls", () => {
  const porte = lexportDuCorpus({
    lignes: [{ chantier: 1, dit: "Menuiseries extérieures", avant: "", lien: "", apres: "" }]
  });

  assert.deepEqual(porte.corpus[0],
    { chantier: 1, dit: "Menuiseries extérieures", avant: null, lien: null, apres: null, mot: null });
  assert.equal(porte.sansIdee, 1, "c'est le chiffre qu'on vient chercher");
});

/**
 * **Le fichier dit ce qu'il est, dedans.** Il sera relu ailleurs, sans l'écran
 * qui l'explique, et peut-être par quelqu'un d'autre.
 */
test("le fichier du corpus porte son avertissement et son nom", () => {
  const porte = lexportDuCorpus({ lignes: [] });

  assert.match(porte.attention, /CONTENU DE CHANTIER/);
  assert.match(porte.attention, /ne se partage pas/);
  assert.match(porte.note, /Aucun chantier n'est nommé/);
  assert.match(leNomDuCorpus(new Date("2026-10-01T09:00:00Z")), /NE-PAS-PARTAGER/);
});

/**
 * **Rien n'est pas « le corpus est vide ».** On ne l'a pas demandé, ou on n'a
 * pas su (règle 5) — et les deux mènent à des gestes opposés.
 */
test("un corpus vide ne se dit pas comme un constat", () => {
  assert.match(phraseDuCorpus({ lignes: [] }), /on ne l'a pas demandé, ou on n'a pas su/);
  assert.match(
    phraseDuCorpus({ lignes: [{ chantier: 1, dit: "Menuiseries", avant: "" }] }),
    /1 affirmation, dont 1 dont le découpage ne tire rien/);
});

/**
 * **Un fichier tronqué le dit, dedans et à l'écran.**
 *
 * Le premier fichier emporté portait mille affirmations sur neuf mille quatre
 * cent quatre-vingt-huit — `db-max-rows`, le plafond que PostgREST applique au
 * transport — et annonçait « 1 000 affirmations, dont 998 dont le découpage ne
 * tire rien ». Une phrase juste sur un corpus faux, et l'ordre du tri faisait
 * que les mille venaient toutes du premier chantier : de quoi conclure qu'un
 * seul chantier écrit.
 *
 * Le défaut n'était pas la troncature, c'était son silence (règle 12).
 */
test("un corpus tronqué dit ce qui lui manque", () => {
  const porte = lexportDuCorpus({
    lignes: [{ chantier: 1, dit: "Menuiseries extérieures" }],
    attendues: 9488
  });

  assert.equal(porte.attendues, 9488, "ce que la base porte n'est pas écrit");
  assert.equal(porte.manque, 9487, "l'écart n'est pas calculé");
  assert.match(phraseDuCorpus({
    lignes: [{ chantier: 1, dit: "Menuiseries extérieures" }], attendues: 9488
  }), /9487 manquent sur les 9488/);
});

/**
 * **Et un fichier entier ne crie pas au manque.**
 *
 * Une phrase d'alerte qui s'affiche toujours ne se lit plus. Quand le compte
 * annoncé par la base est celui du fichier, il n'y a rien à dire.
 */
test("un corpus entier ne dit pas qu'il manque quelque chose", () => {
  const porte = lexportDuCorpus({
    lignes: [{ chantier: 1, dit: "Menuiseries extérieures" }],
    attendues: 1
  });

  assert.equal(porte.manque, 0, "un fichier complet s'annonce tronqué");
  assert.doesNotMatch(phraseDuCorpus({
    lignes: [{ chantier: 1, dit: "Menuiseries extérieures" }], attendues: 1
  }), /manquent/);
});

/**
 * **« On ne sait pas combien la base en porte » n'est pas « elle n'en porte
 * aucune ».**
 *
 * `Number(null)` et `Number("")` valent zéro, et zéro est fini. Converti sans
 * garde, `attendues` tomberait à zéro et `manque` resterait muet pour une
 * raison fausse : le fichier se dirait complet parce qu'on n'a rien su (règle
 * 5). Le piège est d'autant plus sûr qu'il ne se voit pas — les deux chemins
 * donnent `manque: 0`.
 */
test("un corpus dont on ignore la taille ne se dit pas complet", () => {
  for (const rien of [null, undefined, "", "deux-mille", {}]) {
    const porte = lexportDuCorpus({
      lignes: [{ chantier: 1, dit: "Menuiseries extérieures" }],
      attendues: rien
    });
    assert.equal(porte.attendues, null,
      `« ${String(rien)} » est devenu un compte : l'écart se lira à l'envers`);
    assert.equal(porte.manque, 0, "on ne peut pas chiffrer un manque qu'on ne connaît pas");
  }

  // Et zéro reste zéro : la base peut vraiment ne rien porter.
  assert.equal(lexportDuCorpus({ lignes: [], attendues: 0 }).attendues, 0,
    "un corpus réellement vide est devenu « on ne sait pas »");
});
