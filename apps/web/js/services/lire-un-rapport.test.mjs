/**
 * Ce que la lecture d'un rapport fait, et ce qu'elle laisse quand une étape tombe.
 *
 * Les trois appels sont passés : c'est ce qui permet de faire échouer **chaque**
 * étape et de vérifier ce qui survit. Un test qui ne sait pas faire tomber la
 * transcription ne vérifie pas qu'une lecture sans Markdown est refusée.
 *
 * Les rapports sont inventés. Aucun nom réel, aucune commune réelle.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  PHRASES_DU_REFUS_DE_LECTURE, REFUS_DE_LECTURE, laLegendeDuReleve, lesAvisReleves,
  lireLesRapports, lireUnRapport, phraseDuLotLu, phraseDuRefusDeLecture, unAvisReleve
} from "./lire-un-rapport.js";
import { ETAPE } from "./le-parcours-dun-rapport.js";
import { lEtapeQuiReste } from "./le-parcours-dun-rapport.js";

const UN_RAPPORT = {
  nom: "RICT-03-NOVACLIM.pdf",
  sourceId: "doc-1",
  pages: [
    { page: 1, text: "Rapport initial de contrôle technique — NOVACLIM" },
    { page: 2, text: "Légende : F favorable, S suspendu" }
  ]
};

const LA_STRUCTURE = {
  nature: "rapport de contrôle technique",
  legende: [
    { marque: "F", signification: "Avis favorable", ou: "page 2" },
    { marque: "S", signification: "Avis suspendu", ou: "page 2" }
  ]
};

/** Les trois appels qui réussissent. Chaque test en remplace un pour le faire tomber. */
function lesOutils(remplacements = {}) {
  return {
    reconnaitreLaStructure: async () => ({
      ok: true, structure: LA_STRUCTURE, modele: "gpt-5"
    }),
    refaireLeDocument: async () => ({
      ok: true,
      pages: [
        { page: 1, markdown: "# Rapport initial" },
        { page: 2, markdown: "| Avis | Teneur |\n|---|---|\n| Fondations | F |" }
      ],
      modele: "gpt-5"
    }),
    relireLesAvis: async () => ({
      ok: true,
      avis: [
        {
          reference: "A12", intitule: "Fondations superficielles", teneur: "F",
          constat: "Taux de travail de 1 bar aux ELS", page: 2, citation: "Fondations | F"
        },
        {
          reference: "A13", intitule: "Escalier protégé", teneur: "Z",
          constat: "", page: 3, citation: "Escalier | Z"
        }
      ],
      legende: [{ code: "SO", libelle: "Sans objet" }],
      organisme: "VERIFAS",
      referenceDuRapport: "RICT-03",
      emisLe: "2026-04-18",
      modele: "gpt-5"
    }),
    ...remplacements
  };
}

test("les trois étapes se font dans l'ordre, et la lecture les porte toutes", async () => {
  const vues = [];
  const lu = await lireUnRapport(UN_RAPPORT, lesOutils({
    onEtape: ({ quoi }) => { vues.push(quoi); }
  }));

  assert.equal(lu.ok, true);
  assert.deepEqual(vues, [ETAPE.STRUCTURE, ETAPE.MARKDOWN, ETAPE.AVIS]);

  const lecture = lu.vue.lecture;
  assert.equal(lecture.nom, "RICT-03-NOVACLIM.pdf");
  assert.equal(lecture.sansStructure, false);
  assert.match(lecture.markdown, /# Rapport initial/);
  assert.match(lecture.markdown, /Fondations \| F/);
  assert.equal(lecture.avis.length, 2);
  // **Les trois étapes sont faites** : c'est le parcours qui le dit, et c'est lui
  // que l'écran lit. Une lecture que le parcours croit inachevée se redessinerait
  // avec une étape « qui reste » alors qu'elle a eu lieu.
  assert.equal(lEtapeQuiReste(lecture), null);
});

test("l'identité du rapport vient du relevé, qui lit la première page", async () => {
  const lu = await lireUnRapport(UN_RAPPORT, lesOutils());

  assert.equal(lu.vue.lecture.identite.numero, "RICT-03");
  assert.equal(lu.vue.lecture.identite.etabliLe, "2026-04-18");
  assert.equal(lu.vue.lecture.lueSur, "VERIFAS");
});

test("la légende de la structure gagne, et celle du relevé la complète", async () => {
  const lu = await lireUnRapport(UN_RAPPORT, lesOutils({
    relireLesAvis: async () => ({
      ok: true,
      avis: [{ reference: "A1", intitule: "Neige", teneur: "F", page: 1, citation: "Neige F" }],
      // « F » est déjà déclarée par la structure, et le relevé la dit autrement.
      // C'est la structure qui tranche : elle est allée chercher la table exprès.
      legende: [{ code: "F", libelle: "Favorable sous réserve" }, { code: "D", libelle: "Défavorable" }]
    })
  }));

  const legende = lu.vue.lecture.legende;
  assert.deepEqual(legende.map((une) => une.marque), ["F", "S", "D"]);
  assert.equal(legende[0].signification, "Avis favorable");
});

test("une structure refusée ne bloque rien, et se dit", async () => {
  const lu = await lireUnRapport(UN_RAPPORT, lesOutils({
    reconnaitreLaStructure: async () => ({ ok: false, panne: "HTTP 503" })
  }));

  assert.equal(lu.ok, true);
  assert.equal(lu.vue.lecture.sansStructure, true);
  assert.equal(lu.vue.lecture.structure, null);
  // Sans structure, pas de légende lue — donc aucune marque ne se résout. C'est
  // ce que l'écran doit pouvoir dire, et non le taire.
  assert.deepEqual(lu.vue.lecture.legende.map((une) => une.marque), ["SO"]);
  assert.match(lu.vue.lecture.markdown, /# Rapport initial/);
});

test("une transcription refusée ne laisse aucune lecture : il n'y a rien à rouvrir", async () => {
  const lu = await lireUnRapport(UN_RAPPORT, lesOutils({
    refaireLeDocument: async () => ({ ok: false, motif: "refuse" })
  }));

  assert.equal(lu.ok, false);
  assert.equal(lu.motif, REFUS_DE_LECTURE.SANS_MARKDOWN);
  assert.equal(lu.etape, ETAPE.MARKDOWN);
});

test("une transcription vide est un refus, pas une lecture vide", async () => {
  const lu = await lireUnRapport(UN_RAPPORT, lesOutils({
    // Le serveur a répondu, et n'a rendu que du blanc. Le garder ferait une ligne
    // qu'on ouvre pour lire une page blanche.
    refaireLeDocument: async () => ({ ok: true, pages: [{ page: 1, markdown: "   " }] })
  }));

  assert.equal(lu.ok, false);
  assert.equal(lu.motif, REFUS_DE_LECTURE.SANS_MARKDOWN);
});

test("un relevé refusé laisse la transcription, et `avis` vaut null et non []", async () => {
  const lu = await lireUnRapport(UN_RAPPORT, lesOutils({
    relireLesAvis: async () => ({ ok: false, motif: "rien-de-verifie" })
  }));

  assert.equal(lu.ok, true);
  // **`null`, jamais `[]`.** L'écran dit « les avis n'ont pas été relevés » sur
  // `null`, et « aucun avis dans ce rapport » sur `[]` — deux phrases opposées.
  assert.equal(lu.vue.lecture.avis, null);
  assert.equal(lu.vue.lecture.mesure.avis, null);
  assert.equal(lEtapeQuiReste(lu.vue.lecture), ETAPE.AVIS);
});

test("un document sans texte est refusé avant le premier appel", async () => {
  let appele = false;
  const lu = await lireUnRapport(
    { nom: "scan.pdf", pages: [{ page: 1, text: "   " }] },
    lesOutils({ reconnaitreLaStructure: async () => { appele = true; return { ok: true }; } })
  );

  assert.equal(lu.ok, false);
  assert.equal(lu.motif, REFUS_DE_LECTURE.SANS_TEXTE);
  // Ne pas payer trois appels pour un PDF scanné dont on sait d'avance qu'il ne
  // porte rien.
  assert.equal(appele, false);
});

test("la mesure est gelée avec la lecture, et compte ce que la légende résout", async () => {
  const lu = await lireUnRapport(UN_RAPPORT, lesOutils());
  const mesure = lu.vue.lecture.mesure;

  assert.equal(mesure.avis, 2);
  assert.equal(mesure.marques, 3);
  // « F » se résout, « Z » ne se résout pas : c'est le chiffre qui dit si la
  // légende a été bien lue.
  assert.equal(mesure.lisibles, 1);
  assert.equal(mesure.illisibles, 1);
  assert.equal(mesure.pages, 2);
});

test("le procédé voyage avec la lecture", async () => {
  const lu = await lireUnRapport(UN_RAPPORT, lesOutils());
  assert.equal(lu.vue.lecture.luPar, "gpt-5 · lecture d'un rapport v1");
});

/* ── Les traductions ─────────────────────────────────────────────────────── */

test("`teneur` devient `marque`, et la page devient un « où »", () => {
  const un = unAvisReleve({
    reference: "A7", intitule: "Désenfumage", teneur: "D",
    constat: "Absence de commande manuelle", page: 4, citation: "Désenfumage D"
  });

  assert.equal(un.marque, "D");
  assert.equal(un.ou, "page 4");
  assert.equal(un.page, 4);
  assert.equal(un.constat, "Absence de commande manuelle");
});

test("un avis sans intitulé ni référence n'est pas un avis", () => {
  assert.equal(unAvisReleve({ teneur: "F", page: 2 }), null);
  assert.deepEqual(lesAvisReleves([{ teneur: "F" }, { intitule: "Neige" }]).length, 1);
});

test("une page absente ne devient pas « page 0 »", () => {
  // `Number(null)` vaut zéro, qui est fini : sans garde, un avis dont la page
  // manque s'afficherait « page 0 », qui n'existe pas.
  assert.equal(unAvisReleve({ intitule: "Neige", page: null }).ou, "");
  assert.equal(unAvisReleve({ intitule: "Neige", page: null }).page, null);
  assert.equal(unAvisReleve({ intitule: "Neige", page: "" }).ou, "");
});

test("la légende du relevé se lit dans les deux vocabulaires", () => {
  assert.deepEqual(
    laLegendeDuReleve([{ code: "F", libelle: "Favorable" }]),
    [{ marque: "F", signification: "Favorable", ou: "" }]
  );
  assert.deepEqual(
    laLegendeDuReleve([{ marque: "S", signification: "Suspendu", ou: "page 2" }]),
    [{ marque: "S", signification: "Suspendu", ou: "page 2" }]
  );
  // Une moitié de ligne n'explique rien : elle est écartée, pas gardée à trous.
  assert.deepEqual(laLegendeDuReleve([{ code: "F" }]), []);
});

/* ── Le lot ──────────────────────────────────────────────────────────────── */

test("un rapport qui échoue n'arrête pas les suivants", async () => {
  const outils = lesOutils({
    refaireLeDocument: async ({ pages }) => (
      pages[0].text.includes("muet")
        ? { ok: false, motif: "refuse" }
        : { ok: true, pages: [{ page: 1, markdown: "# Lu" }], modele: "gpt-5" }
    )
  });

  const { vues, refus } = await lireLesRapports([
    { nom: "un.pdf", pages: [{ page: 1, text: "rapport muet" }] },
    { nom: "deux.pdf", pages: [{ page: 1, text: "rapport lisible" }] }
  ], outils);

  assert.equal(vues.length, 1);
  assert.equal(vues[0].lecture.nom, "deux.pdf");
  assert.deepEqual(refus, [
    { nom: "un.pdf", motif: REFUS_DE_LECTURE.SANS_MARKDOWN, etape: ETAPE.MARKDOWN }
  ]);
});

test("les rapports se lisent en série, jamais tous à la fois", async () => {
  let enVol = 0;
  let pointe = 0;

  const outils = lesOutils({
    refaireLeDocument: async () => {
      enVol += 1;
      pointe = Math.max(pointe, enVol);
      await new Promise((suite) => setTimeout(suite, 1));
      enVol -= 1;
      return { ok: true, pages: [{ page: 1, markdown: "# Lu" }], modele: "gpt-5" };
    }
  });

  await lireLesRapports(
    [1, 2, 3].map((rang) => ({ nom: `${rang}.pdf`, pages: [{ page: 1, text: "du texte" }] })),
    outils
  );

  // Trois appels par rapport : un lot lancé d'un coup se ferait limiter, et l'on
  // perdrait tout le lot pour avoir voulu aller vite.
  assert.equal(pointe, 1);
});

test("la phrase du lot dit ce qui n'a pas été lu", () => {
  assert.equal(phraseDuLotLu({ vues: [{}, {}], refus: [] }), "2 rapports lus et conservés.");
  assert.match(phraseDuLotLu({ vues: [{}], refus: [{}] }), /1 rapport lu et conservé — 1 non lu/);
  assert.match(phraseDuLotLu({ vues: [], refus: [{}, {}] }), /Aucun rapport n'a pu être lu : 2/);
  assert.equal(phraseDuLotLu(), "Aucun rapport à lire.");
});

test("chaque refus porte une phrase, et un motif inconnu n'en invente pas", () => {
  for (const motif of Object.values(REFUS_DE_LECTURE)) {
    assert.ok(phraseDuRefusDeLecture(motif).length > 20, motif);
  }
  assert.equal(Object.keys(PHRASES_DU_REFUS_DE_LECTURE).length, Object.values(REFUS_DE_LECTURE).length);
  assert.equal(phraseDuRefusDeLecture("autre-chose"), "");
});
