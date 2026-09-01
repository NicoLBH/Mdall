import test from "node:test";
import assert from "node:assert/strict";

import { BRIEFING_CHAR_BUDGET, BRIEFING_DROP_ORDER, BRIEFING_NATURES, buildMemoryBriefing } from "./memory-briefing.js";

const PROJET = { name: "Aurora Campus" };

function donneeDeBase(extra = {}) {
  return {
    id: "b1",
    kind: "base-datum",
    nature: "donnee-de-base",
    domain: "incendie",
    subject_key: "usage-du-niveau",
    statement: "Usage du niveau : ERP catégorie 4",
    status: "assumed",
    decided_at: "2026-02-01T00:00:00.000Z",
    payload: { subject: "Usage du niveau", value: "ERP catégorie 4" },
    ...extra
  };
}

function contrainte(extra = {}) {
  return {
    id: "c1",
    kind: "site-constraint",
    nature: "contrainte",
    domain: "structure",
    subject_key: "zone-de-neige",
    statement: "Zone de neige A2",
    status: "assumed",
    decided_at: "2026-02-02T00:00:00.000Z",
    proposition_number: 4,
    payload: {},
    ...extra
  };
}

function hypothese(extra = {}) {
  return {
    id: "h1",
    kind: "hypothesis",
    subject_key: "portance-du-sol",
    statement: "Portance du sol : 0,15 MPa",
    status: "assumed",
    decided_at: "2026-02-03T00:00:00.000Z",
    payload: { subject: "Portance du sol", value: "0,15 MPa" },
    ...extra
  };
}

function constat(extra = {}) {
  return {
    id: "a1",
    kind: "avis",
    subject_key: "A12",
    statement: "Réserve A12 émise",
    status: "assumed",
    decided_at: "2026-02-04T00:00:00.000Z",
    payload: { reference: "A12", title: "Étanchéité" },
    ...extra
  };
}

/* ── Ce qu'on ne sait pas ────────────────────────────────────────────────── */

test("une mémoire illisible le dit, et interdit de répondre à sa place", () => {
  // Le pire mensonge possible porte sur l'absence : « ce projet n'a aucune
  // contrainte » alors qu'on n'a simplement pas pu lire.
  const brief = buildMemoryBriefing({ project: PROJET, assertions: null });

  assert.equal(brief.lue, false);
  assert.equal(brief.resume, null);
  assert.match(brief.texte, /n'a pas pu être lue/);
  assert.doesNotMatch(brief.texte, /Rien n'a encore été versé/);
});

test("une mémoire vide n'est pas une mémoire illisible", () => {
  const brief = buildMemoryBriefing({ project: PROJET, assertions: [] });

  assert.equal(brief.lue, true);
  assert.match(brief.texte, /Rien n'a encore été versé/);
  assert.match(brief.texte, /vide constaté, pas une lecture manquée/);
  assert.doesNotMatch(brief.texte, /n'a pas pu être lue/);
});

/* ── La hiérarchie ───────────────────────────────────────────────────────── */

test("les natures viennent dans l'ordre de ce qui fonde quoi", () => {
  const brief = buildMemoryBriefing({
    project: PROJET,
    // Versées dans le désordre : c'est le classement qui doit trancher, pas
    // l'ordre d'arrivée.
    assertions: [constat(), hypothese(), contrainte(), donneeDeBase()]
  });

  const positions = ["Donnée de base", "Contrainte", "Hypothèse", "Constat"]
    .map((label) => brief.texte.indexOf(`## ${label}`));

  assert.ok(positions.every((position) => position > 0), "chaque nature a son bloc");
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test("l'ordre annoncé du module est bien celui des blocs", () => {
  assert.deepEqual(BRIEFING_NATURES, ["donnee-de-base", "contrainte", "hypothese", "constat", "intendance"]);
});

test("une nature absente n'a pas de bloc vide", () => {
  const brief = buildMemoryBriefing({ project: PROJET, assertions: [contrainte()] });

  assert.match(brief.texte, /## Contrainte/);
  assert.doesNotMatch(brief.texte, /## Hypothèse/);
  assert.doesNotMatch(brief.texte, /## Constat/);
});

test("chaque nature dit ce qui la trancherait", () => {
  const brief = buildMemoryBriefing({ project: PROJET, assertions: [contrainte(), hypothese()] });

  assert.match(brief.texte, /## Contrainte — tranchée par un tiers/);
  assert.match(brief.texte, /## Hypothèse — tranchée par une mesure qui n'a pas encore eu lieu/);
});

test("dans une nature, les affirmations se rangent par domaine", () => {
  const brief = buildMemoryBriefing({
    project: PROJET,
    assertions: [
      contrainte({ id: "c1", subject_key: "zone-de-neige", domain: "structure" }),
      contrainte({ id: "c2", subject_key: "isolement-de-facade", domain: "acoustique" })
    ]
  });

  const acoustique = brief.texte.indexOf("### Acoustique");
  const structure = brief.texte.indexOf("### Structure");

  assert.ok(acoustique > 0 && structure > 0);
  assert.ok(acoustique < structure, "l'ordre des domaines est alphabétique et stable");
});

test("ce qui n'a pas de domaine passe en dernier, et le dit", () => {
  const brief = buildMemoryBriefing({
    project: PROJET,
    assertions: [contrainte({ id: "c1", domain: null }), contrainte({ id: "c2", domain: "structure" })]
  });

  assert.ok(brief.texte.indexOf("### Structure") < brief.texte.indexOf("### Non classé"));
});

test("une affirmation sans nature n'est pas perdue : elle a son bloc", () => {
  // La faire disparaître ferait croire à une mémoire plus courte qu'elle
  // n'est, et une lecture filtrée se prendrait pour une lecture complète.
  const brief = buildMemoryBriefing({
    project: PROJET,
    assertions: [{ id: "x", kind: "chose-inconnue", subject_key: "x1", statement: "Quelque chose", decided_at: "2026-01-01", payload: {} }]
  });

  assert.match(brief.texte, /## Non classé/);
  assert.match(brief.texte, /Quelque chose/);
  assert.equal(brief.resume.nonClasse, 1);
});

/* ── Ce que porte une ligne ──────────────────────────────────────────────── */

test("une ligne porte sa clé, son énoncé, sa date et sa proposition", () => {
  const brief = buildMemoryBriefing({ project: PROJET, assertions: [contrainte()] });

  assert.match(brief.texte, /\*\*zone-de-neige\*\* · Zone de neige A2/);
  assert.match(brief.texte, /tranchée le 02\/02\/2026/);
  assert.match(brief.texte, /proposition #P4/);
});

test("une hypothèse dit son état, et « candidate » ne se lit pas « validée »", () => {
  const brief = buildMemoryBriefing({ project: PROJET, assertions: [hypothese()] });

  assert.match(brief.texte, /état : candidate, personne ne s'est prononcé/);
});

test("une hypothèse validée le dit", () => {
  const brief = buildMemoryBriefing({
    project: PROJET,
    assertions: [hypothese()],
    acts: [{ assertion_id: "h1", verdict: "validated", created_at: "2026-03-01T00:00:00.000Z" }]
  });

  assert.match(brief.texte, /état : validée/);
});

test("une affirmation dit sur quoi elle repose, par la clé qu'on lira plus haut", () => {
  const brief = buildMemoryBriefing({
    project: PROJET,
    assertions: [contrainte(), hypothese()],
    dependencies: [{ assertion_id: "c1", depends_on_assertion_id: "h1" }]
  });

  assert.match(brief.texte, /repose sur : portance-du-sol/);
});

test("une valeur devenue suspecte est signalée comme telle", () => {
  // Répondre à partir d'une valeur suspecte sans le dire est pire que de ne
  // pas répondre.
  const brief = buildMemoryBriefing({
    project: PROJET,
    assertions: [contrainte({ needs_review_since: "2026-03-01T00:00:00.000Z" })]
  });

  assert.match(brief.texte, /à revérifier/);
  assert.equal(brief.resume.aRevoir, 1);
});

test("une revérification postérieure à la suspicion lève le signalement", () => {
  const brief = buildMemoryBriefing({
    project: PROJET,
    assertions: [contrainte({ needs_review_since: "2026-03-01T00:00:00.000Z", reviewed_at: "2026-03-02T00:00:00.000Z" })]
  });

  assert.doesNotMatch(brief.texte, /à revérifier/);
  assert.equal(brief.resume.aRevoir, 0);
});

test("une affirmation écartée par le projet le dit, elle ne disparaît pas", () => {
  const brief = buildMemoryBriefing({ project: PROJET, assertions: [contrainte({ status: "rejected" })] });

  assert.match(brief.texte, /écartée par le projet/);
});

test("la provenance d'une donnée de base n'est pas un fichier", () => {
  const brief = buildMemoryBriefing({ project: PROJET, assertions: [donneeDeBase()] });

  assert.match(brief.texte, /Sujet : Usage du niveau · Valeur : ERP catégorie 4/);
  assert.doesNotMatch(brief.texte, /Fichier/);
});

test("les zones ne sont dites que lorsqu'elles restreignent", () => {
  const partout = buildMemoryBriefing({ project: PROJET, assertions: [contrainte()] });
  const restreinte = buildMemoryBriefing({
    project: PROJET,
    assertions: [
      contrainte({ zones: ["batiment-a"] }),
      { id: "z1", kind: "base-datum", nature: "donnee-de-base", subject_key: "zone:batiment-a", statement: "Bâtiment A", status: "assumed", decided_at: "2026-01-01", payload: { zoneDefinition: true, label: "Bâtiment A" } }
    ]
  });

  assert.doesNotMatch(partout.texte, /zones :/);
  assert.match(restreinte.texte, /zones :/);
  assert.match(partout.texte, /vaut pour l'ouvrage entier/);
});

/* ── Ce qui a été remplacé ───────────────────────────────────────────────── */

test("ce qui a été remplacé reste, à part, avec la date du remplacement", () => {
  const brief = buildMemoryBriefing({
    project: PROJET,
    assertions: [
      hypothese(),
      hypothese({ id: "h0", statement: "Portance du sol : 0,10 MPa", superseded_by: "h1", superseded_at: "2026-02-03T00:00:00.000Z" })
    ]
  });

  assert.match(brief.texte, /## Ce qui a été remplacé/);
  assert.match(brief.texte, /0,10 MPa.*remplacée le 03\/02\/2026/);
  assert.ok(brief.texte.indexOf("0,15 MPa") < brief.texte.indexOf("## Ce qui a été remplacé"));
});

test("une mémoire sans passé n'a pas de section « remplacé » vide", () => {
  const brief = buildMemoryBriefing({ project: PROJET, assertions: [hypothese()] });

  assert.doesNotMatch(brief.texte, /Ce qui a été remplacé/);
});

/* ── Le mode d'emploi ────────────────────────────────────────────────────── */

test("le texte explique ce que les mots veulent dire, avant de les employer", () => {
  const brief = buildMemoryBriefing({ project: PROJET, assertions: [contrainte()] });

  assert.ok(brief.texte.indexOf("## Comment lire") < brief.texte.indexOf("## Contrainte"));
  assert.match(brief.texte, /Seule une hypothèse se conteste/);
  assert.match(brief.texte, /Ce qui ne figure pas ici n'est pas connu de ce projet/);
});

test("le texte est déterministe : deux fois les mêmes entrées, deux fois le même texte", () => {
  const entrees = { project: PROJET, assertions: [constat(), hypothese(), contrainte(), donneeDeBase()], generatedAt: "2026-09-01T00:00:00.000Z" };

  assert.equal(buildMemoryBriefing(entrees).texte, buildMemoryBriefing(entrees).texte);
});

test("le résumé compte par nature, et le non classé n'est pas un reste caché", () => {
  const brief = buildMemoryBriefing({
    project: PROJET,
    assertions: [contrainte(), hypothese(), { id: "x", kind: "?", subject_key: "x", statement: "?", decided_at: "2026-01-01", payload: {} }]
  });

  const parNature = Object.fromEntries(brief.resume.parNature.map((entree) => [entree.nature, entree.count]));

  assert.equal(parNature.contrainte, 1);
  assert.equal(parNature.hypothese, 1);
  assert.equal(brief.resume.nonClasse, 1);
});

/* ── Le découpage, les désaccords, et la coupe ───────────────────────────── */

function zone(label, definition) {
  return {
    id: `z-${label}`,
    kind: "base-datum",
    nature: "donnee-de-base",
    subject_key: `zone:${label}`,
    statement: label,
    status: "assumed",
    decided_at: "2026-01-01T00:00:00.000Z",
    payload: { zoneDefinition: true, subject: label, value: definition }
  };
}

test("le découpage en zones voyage avec la mémoire, définitions comprises", () => {
  // Sans lui, « zones : Bâtiment A » est une étiquette que rien n'explique.
  const brief = buildMemoryBriefing({
    project: PROJET,
    assertions: [zone("Bâtiment A", "Le corps principal, du RDC au R+3."), contrainte({ zones: ["batiment-a"] })]
  });

  assert.match(brief.texte, /## Le découpage du projet/);
  assert.match(brief.texte, /\*\*Bâtiment A\*\* — Le corps principal/);
  assert.ok(brief.texte.indexOf("## Le découpage du projet") < brief.texte.indexOf("## Contrainte"));
});

test("une zone sans définition le dit, plutôt que de laisser deviner", () => {
  const brief = buildMemoryBriefing({ project: PROJET, assertions: [zone("Zone B", "")] });

  assert.match(brief.texte, /aucune définition écrite/);
});

test("un projet sans zones n'a pas de section de découpage vide", () => {
  const brief = buildMemoryBriefing({ project: PROJET, assertions: [contrainte()] });

  assert.doesNotMatch(brief.texte, /## Le découpage du projet/);
});

test("deux valeurs pour une même chose sont montrées, pas départagées", () => {
  // Un copilote qui répondrait « A2 » alors que la mémoire en tient deux ferait
  // disparaître le désaccord au lieu de le montrer.
  const brief = buildMemoryBriefing({
    project: PROJET,
    assertions: [
      hypothese({ id: "v1", subject_key: "zone-de-neige", statement: "Zone de neige : A2", payload: { subject: "Zone de neige", value: "A2" } }),
      hypothese({ id: "v2", subject_key: "zone-de-neige-bis", statement: "Zone de neige : E", payload: { subject: "Zone de neige", value: "E" } })
    ]
  });

  assert.match(brief.texte, /## Ce qui ne s'accorde pas/);
  assert.match(brief.texte, /Ne choisis pas à leur place/);
});

test("une mémoire qui s'accorde n'a pas de section de désaccords", () => {
  const brief = buildMemoryBriefing({ project: PROJET, assertions: [contrainte(), hypothese()] });

  assert.doesNotMatch(brief.texte, /Ce qui ne s'accorde pas/);
});

test("une mémoire ordinaire n'est pas coupée du tout", () => {
  // Le budget est calé sur ce que le modèle peut lire : trois cents
  // affirmations pèsent un sixième de ce qu'il accepte.
  const beaucoup = Array.from({ length: 300 }, (_, index) =>
    contrainte({ id: `c${index}`, subject_key: `contrainte-${String(index).padStart(3, "0")}` })
  );

  const brief = buildMemoryBriefing({ project: PROJET, assertions: beaucoup });

  assert.doesNotMatch(brief.texte, /trop longue pour tenir ici/);
  assert.deepEqual(brief.resume.manque, { remplacees: 0, intendance: 0, constats: 0, socle: 0 });
  assert.ok(brief.texte.length < BRIEFING_CHAR_BUDGET);
  assert.match(brief.texte, /contrainte-299/);
});

test("quand il faut renoncer, on lâche le passé avant le présent", () => {
  const socle = Array.from({ length: 4 }, (_, index) =>
    contrainte({ id: `c${index}`, subject_key: `contrainte-${index}`, decided_at: `2026-02-0${index + 1}T00:00:00.000Z` })
  );
  const passe = Array.from({ length: 20 }, (_, index) =>
    contrainte({ id: `v${index}`, subject_key: `ancienne-${index}`, superseded_by: "c0", superseded_at: "2026-03-01T00:00:00.000Z" })
  );

  const brief = buildMemoryBriefing({ project: PROJET, assertions: [...socle, ...passe], charBudget: 3600 });

  assert.ok(brief.resume.manque.remplacees > 0, "le passé part d'abord");
  assert.equal(brief.resume.manque.socle, 0, "ce sur quoi le projet calcule reste");
  assert.match(brief.texte, /contrainte-3/);
});

test("l'ordre du renoncement suit ce qui fonde quoi, à l'envers", () => {
  assert.deepEqual(BRIEFING_DROP_ORDER, ["remplacees", "intendance", "constats", "socle"]);
});

test("un constat part avant une contrainte, jamais l'inverse", () => {
  const constats = Array.from({ length: 30 }, (_, index) =>
    constat({ id: `a${index}`, subject_key: `A${String(index).padStart(2, "0")}`, decided_at: `2026-01-${String((index % 28) + 1).padStart(2, "0")}T00:00:00.000Z` })
  );
  const regles = [contrainte({ id: "c1", subject_key: "zone-de-neige" })];

  const brief = buildMemoryBriefing({ project: PROJET, assertions: [...constats, ...regles], charBudget: 3400 });

  assert.ok(brief.resume.manque.constats > 0);
  assert.equal(brief.resume.manque.socle, 0);
  assert.match(brief.texte, /zone-de-neige/);
});

test("ce qui manque est dit par catégorie, pas par un total muet", () => {
  // « 12 constats absents » se lit et se corrige ; « 12 lignes absentes » ne dit
  // pas si c'est une contrainte qui manque ou un avis levé l'an dernier.
  const constats = Array.from({ length: 30 }, (_, index) =>
    constat({ id: `a${index}`, subject_key: `A${String(index).padStart(2, "0")}` })
  );

  const brief = buildMemoryBriefing({ project: PROJET, assertions: constats, charBudget: 3400 });

  assert.match(brief.texte, /N'y figurent pas : \d+ constat\(s\)/);
  assert.match(brief.texte, /Ne conclus donc jamais qu'une chose est absente/);
});

test("le compte annoncé reste celui de la mémoire entière, pas celui de la part reçue", () => {
  const constats = Array.from({ length: 30 }, (_, index) =>
    constat({ id: `a${index}`, subject_key: `A${String(index).padStart(2, "0")}` })
  );

  const brief = buildMemoryBriefing({ project: PROJET, assertions: constats, charBudget: 3400 });
  const parNature = Object.fromEntries(brief.resume.parNature.map((entree) => [entree.nature, entree.count]));

  assert.match(brief.texte, /30 affirmation\(s\) en vigueur/);
  assert.equal(parNature.constat, 30);
});

test("la coupe est déterministe : deux fois la même mémoire, deux fois le même texte", () => {
  const constats = Array.from({ length: 30 }, (_, index) =>
    constat({ id: `a${index}`, subject_key: `A${String(index).padStart(2, "0")}` })
  );
  const melange = [...constats].reverse();

  assert.equal(
    buildMemoryBriefing({ project: PROJET, assertions: constats, charBudget: 3400, generatedAt: "2026-09-01" }).texte,
    buildMemoryBriefing({ project: PROJET, assertions: melange, charBudget: 3400, generatedAt: "2026-09-01" }).texte
  );
});
