/**
 * La console du bac d'essai : tout ce que l'écran a à dire, au même endroit.
 *
 * **Les fixtures sont du Mdall**, lu par le lecteur du projet. Fabriquer ici
 * les remarques que la vérification est censée produire ne vérifierait que ma
 * propre idée de la vérification.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  MOTS_DE_LA_SOURCE, NIVEAU, SOURCE, laConsole, phraseDeLaConsole
} from "./console-du-brouillon.js";
import { REFUS } from "./le-mdall-rendu.js";

/** Le brouillon de la capture : un nom jamais déclaré, une ligne illisible. */
const BROUILLON = [{ nom: "essai.ref", contenu: [
  "fonction vitesse de reference(zones, région de vent) {",
  "   si (région de vent = 1)",
  "   renvoyer vitesse vent",
  "}"
].join("\n") }];

const UNE_DONNEE = [{ nom: "essai.ddb", contenu: "Altitude du site = 890 m" }];

const deSource = (lignes, source) => lignes.filter((une) => une.source === source);

/* ── Quatre blocs deviennent une liste ───────────────────────────────────── */

test("les remarques de la lecture entrent dans la console, avec leur place", () => {
  const lignes = deSource(laConsole({ fichiers: BROUILLON }), SOURCE.VERIFICATION);

  assert.equal(lignes.length, 2, JSON.stringify(lignes));
  assert.deepEqual(lignes.map((une) => `${une.fichier}:${une.ligne}`), ["essai.ref:1", "essai.ref:3"]);
  // En clair, jamais en code : personne ne lit un code.
  assert.equal(lignes[0].quoi, "nom jamais déclaré");
  assert.match(lignes[0].dit, /« région de vent »/);
});

test("une remarque de la lecture ne bloque rien", () => {
  // Un brouillon à demi juste se corrige ; un brouillon refusé en bloc se
  // rejette, et l'on recommence à zéro.
  for (const ligne of deSource(laConsole({ fichiers: BROUILLON }), SOURCE.VERIFICATION)) {
    assert.equal(ligne.niveau, NIVEAU.REMARQUE, ligne.dit);
  }
});

test("une ligne illisible ne se dit qu'une fois, et c'est la lecture qui la dit", () => {
  // La proposition l'écarte aussi, au même endroit et moins bien. La redire
  // ferait deux lignes pour un seul défaut — l'éparpillement aurait seulement
  // changé de place.
  const lignes = laConsole({ fichiers: BROUILLON });
  const surLaLigne3 = lignes.filter((une) => une.fichier === "essai.ref" && une.ligne === 3);

  assert.equal(surLaLigne3.length, 1, JSON.stringify(surLaLigne3));
  assert.equal(surLaLigne3[0].source, SOURCE.VERIFICATION);
});

/* ── Ce que la transcription a donné ─────────────────────────────────────── */

test("un refus de transcription est un refus, et porte la panne nommée", () => {
  const [ligne] = laConsole({
    fichiers: [],
    rendu: { ok: false, motif: REFUS.INJOIGNABLE, panne: "Failed to fetch" }
  });

  assert.equal(ligne.niveau, NIVEAU.REFUS);
  assert.equal(ligne.source, SOURCE.TRANSCRIPTION);
  assert.match(ligne.dit, /rien n'a été facturé/);
  assert.match(ligne.dit, /Failed to fetch/);
});

test("ce que le modèle n'a pas su écrire est une remarque, pas un silence", () => {
  const lignes = laConsole({
    fichiers: [],
    rendu: {
      ok: true, fichiers: [{ nom: "essai.ref", contenu: "x" }], temperature: 0, coupee: false,
      lacunes: [{ phrase: "multiplie la surface par 0,7", pourquoi: "Mdall ne calcule pas." }]
    }
  });

  const lacune = lignes.find((une) => une.quoi === "pas su écrire");
  assert.ok(lacune, JSON.stringify(lignes));
  assert.equal(lacune.niveau, NIVEAU.REMARQUE);
  assert.match(lacune.dit, /multiplie la surface par 0,7/);
  assert.match(lacune.dit, /Mdall ne calcule pas\./);
});

test("une réponse coupée et une température refusée se disent, chacune pour soi", () => {
  const lignes = laConsole({
    fichiers: [],
    rendu: { ok: true, fichiers: [{ nom: "essai.ref" }], lacunes: [], coupee: true, temperature: null }
  });

  assert.ok(lignes.some((une) => une.quoi === "réponse coupée"), "la coupure se tait");
  assert.ok(lignes.some((une) => une.quoi === "pas reproductible"), "la température se tait");
});

test("une transcription qui a abouti laisse une trace, et c'est un fait", () => {
  const lignes = laConsole({
    fichiers: [],
    rendu: { ok: true, fichiers: [{ nom: "essai.ref" }], lacunes: [], coupee: false, temperature: 0 }
  });

  const fait = lignes.find((une) => une.quoi === "transcrit");
  assert.equal(fait.niveau, NIVEAU.FAIT);
  assert.match(fait.dit, /1 fichier écrit/);
});

/* ── Ce que le lancement a répondu ───────────────────────────────────────── */

test("rien du lancement tant qu'on n'a pas lancé", () => {
  // Annoncer qu'une fonction ne sait pas avant qu'on le lui ait demandé serait
  // reprocher une réponse qu'on n'a pas demandée.
  assert.deepEqual(deSource(laConsole({ fichiers: BROUILLON }), SOURCE.LANCEMENT), []);
});

test("une fonction qui ne sait pas dit ce qui lui manque, nommément", () => {
  // « Ne sait pas » sans dire de quoi renverrait à relire la règle pour trouver
  // l'entrée vide.
  const [ligne] = deSource(laConsole({ fichiers: BROUILLON, lance: true }), SOURCE.LANCEMENT);

  assert.equal(ligne.niveau, NIVEAU.REMARQUE);
  assert.equal(ligne.quoi, "ne sait pas");
  assert.match(ligne.dit, /région de vent/);
  assert.equal(ligne.fichier, "essai.ref");
});

test("une fonction qui conclut est un fait, avec ce qu'elle conclut", () => {
  const fichiers = [{ nom: "essai.ref", contenu: [
    "fonction Vitesse de référence(zones, Zone de vent) {",
    "   si (Zone de vent = \"3\")",
    "   alors (\"120 km/h\");",
    "}"
  ].join("\n") }];

  const [ligne] = deSource(
    laConsole({ fichiers, lance: true, reponses: { "Zone de vent": "3" } }),
    SOURCE.LANCEMENT
  );

  assert.equal(ligne.niveau, NIVEAU.FAIT);
  assert.equal(ligne.quoi, "conclut");
  assert.match(ligne.dit, /120 km\/h/);
});

/* ── Ce que la proposition emporterait ───────────────────────────────────── */

test("ce qui reste dehors se dit, et ce qui est prêt aussi", () => {
  const lignes = deSource(laConsole({ fichiers: UNE_DONNEE }), SOURCE.PROPOSITION);
  const pret = lignes.find((une) => une.quoi === "prêt");

  assert.ok(pret, JSON.stringify(lignes));
  assert.equal(pret.niveau, NIVEAU.FAIT);
  assert.match(pret.dit, /rien n'entre sans signature/);
});

test("une proposition refusée est un refus, une proposition ouverte un fait", () => {
  const refuse = laConsole({ fichiers: UNE_DONNEE, depot: { ok: false, dit: "pas relié à la base" } });
  const fait = laConsole({ fichiers: UNE_DONNEE, depot: { ok: true, dit: "Proposition n° 12 ouverte." } });

  assert.equal(refuse[0].niveau, NIVEAU.REFUS);
  assert.equal(refuse[0].quoi, "pas proposé");
  assert.ok(fait.some((une) => une.niveau === NIVEAU.FAIT && une.quoi === "proposé"));
  // Une fois la proposition faite, « prêt » ne se redit pas : elle l'est.
  assert.equal(fait.some((une) => une.quoi === "prêt"), false);
});

/* ── L'ordre, et la phrase ───────────────────────────────────────────────── */

test("le plus grave passe devant, et l'ordre est stable à gravité égale", () => {
  // Un tri qui remonterait un message à chaque frappe ferait perdre celui
  // qu'on lisait.
  const lignes = laConsole({
    fichiers: BROUILLON,
    lance: true,
    rendu: { ok: false, motif: REFUS.EN_PANNE, panne: "" },
    depot: { ok: false, dit: "pas relié" }
  });

  const rangs = lignes.map((une) => une.niveau);
  const attendu = [...rangs].sort((a, b) => {
    const poids = { [NIVEAU.REFUS]: 0, [NIVEAU.REMARQUE]: 1, [NIVEAU.FAIT]: 2 };
    return poids[a] - poids[b];
  });
  assert.deepEqual(rangs, attendu);

  // Et les deux remarques de la lecture gardent l'ordre des lignes du fichier.
  const lues = deSource(lignes, SOURCE.VERIFICATION).map((une) => une.ligne);
  assert.deepEqual(lues, [...lues].sort((a, b) => a - b));
});

test("un brouillon vide n'a rien à signaler, et le dit", () => {
  assert.deepEqual(laConsole({}), []);
  assert.deepEqual(laConsole(), []);
  assert.equal(phraseDeLaConsole([]), "Rien à signaler.");
});

test("la phrase compte ce qui compte, et dit s'il y a quelque chose à faire", () => {
  const avecRefus = phraseDeLaConsole(laConsole({
    fichiers: BROUILLON, rendu: { ok: false, motif: REFUS.EN_PANNE, panne: "" }
  }));
  assert.match(avecRefus, /1 refus/);
  assert.match(avecRefus, /il y a quelque chose à faire/);

  const sansRefus = phraseDeLaConsole(laConsole({ fichiers: BROUILLON }));
  assert.match(sansRefus, /remarques/);
  assert.match(sansRefus, /rien ne bloque/);
});

test("des faits seuls ne se lisent pas comme une liste d'erreurs", () => {
  const dit = phraseDeLaConsole(laConsole({ fichiers: UNE_DONNEE }));

  assert.match(dit, /rien à corriger/);
  assert.doesNotMatch(dit, /remarque/);
});

test("chaque source a son mot, et aucun ne s'affiche en code", () => {
  for (const source of Object.values(SOURCE)) {
    assert.equal(typeof MOTS_DE_LA_SOURCE[source], "string", source);
    assert.notEqual(MOTS_DE_LA_SOURCE[source], source, source);
  }
});
