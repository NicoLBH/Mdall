import test from "node:test";
import assert from "node:assert/strict";

import {
  LACUNE_DE_LHISTOIRE, ORIGINE, entreesDeLaValeur, histoireDeLaValeur, lignesDeLHistoire,
  origineDeLaValeur, phraseDeLOrigine, phraseDesLacunesDeLHistoire
} from "./histoire-de-la-valeur.js";

const at = "2024-05-14T10:00:00Z";

/** Une valeur de la mémoire. Aucun nom réel nulle part. */
const valeur = (id, sujet, dite, charge = {}, plus = {}) => ({
  id, kind: "base-datum", subject_key: id, status: "assumed", superseded_by: null,
  decided_at: at, decided_by: "u-1", proposition_number: 14,
  statement: `${sujet} : ${dite}`,
  payload: { subject: sujet, value: dite, ...charge },
  ...plus
});

const NOMMER = (id) => (id === "u-1" ? "Ourdine Ferrand" : "");

/* ── D'où sort une valeur ────────────────────────────────────────────────── */

test("la provenance enregistrée l'emporte sur ce qu'on devinerait de la charge", () => {
  // Celui qui a versé en savait plus que nous. Relire la forme de la charge est
  // un recours, pas une source.
  //
  // La charge ci-dessous est celle qu'écrit l'étude incendie : une règle du
  // référentiel, appliquée, **et** la provenance que cette règle porte — le
  // texte réglementaire. Devinée depuis la forme, l'origine dirait « déduite
  // par la règle » et on perdrait l'arrêté ; enregistrée, elle dit le texte.
  const dite = valeur("v-1", "Classement du bâtiment", "3ᵉ famille B", {
    provenance: { type: "texte", quoi: "Arrêté du 31 janvier 1986", par: "", le: "" },
    regle: { conditions: [], sinon: "", sauf: [] }
  });

  assert.equal(origineDeLaValeur(dite).genre, ORIGINE.TEXTE);
  assert.equal(origineDeLaValeur(dite).quoi, "Arrêté du 31 janvier 1986");
});

test("à défaut, la forme de la charge le dit — et jamais une supposition", () => {
  const parUneRegle = valeur("v-1", "Hors gel", "0,80 m", { regle: { conditions: [] } });
  const parUnCalcul = valeur("v-2", "Zone de neige", "A2", { utilitaire: "climat_V1" });
  const parUnTexte = valeur("v-3", "Classe de sol", "C", { source: "etude.pdf" });
  const nue = valeur("v-4", "Altitude", "742,30");

  assert.equal(origineDeLaValeur(parUneRegle).genre, ORIGINE.REGLE);
  assert.equal(origineDeLaValeur(parUnCalcul).genre, ORIGINE.CALCUL);
  assert.equal(origineDeLaValeur(parUnTexte).genre, ORIGINE.DOCUMENT);
  assert.equal(origineDeLaValeur(nue).genre, ORIGINE.RIEN);
});

test("une origine qu'on ne connaît pas ne se dit pas", () => {
  // La phrase se tait, et la lacune parle à sa place. Écrire « origine
  // inconnue » n'aide personne ; « rien ne dit d'où vient cette valeur » se
  // répare.
  assert.equal(phraseDeLOrigine({ genre: ORIGINE.RIEN }), "");
  assert.equal(phraseDeLOrigine(null), "");
  assert.equal(phraseDeLOrigine({ genre: ORIGINE.REGLE, quoi: "Hors gel" }), "déduite par la règle Hors gel");
});

/* ── Ce qu'elle a lu ─────────────────────────────────────────────────────── */

test("les entrées d'une conclusion se lisent, avec ce qu'elles valaient", () => {
  // C'est le cœur du « comment on y est arrivé » : 0,466 m ne veut rien dire ;
  // « déduite d'une altitude de 742,30 » se discute.
  const conclusion = valeur("v-hg", "Profondeur hors gel", "0,466 m");
  const altitude = valeur("v-alt", "Altitude", "742,30");

  const histoire = histoireDeLaValeur(conclusion, {
    assertions: [conclusion, altitude],
    applications: [{ output_assertion_id: "v-hg", input_assertion_id: "v-alt", input_subject: "Altitude" }]
  });

  assert.deepEqual(histoire.entrees, [{ sujet: "Altitude", valeurId: "v-alt", valeur: "742,30" }]);
});

test("une entrée qu'on ne retrouve plus garde son nom", () => {
  // « Elle a lu l'altitude, et l'altitude n'est plus dans la mémoire » est
  // justement ce qu'il faut voir. Taire l'entrée ferait croire à un calcul sans
  // entrée (règle 5).
  const conclusion = valeur("v-hg", "Profondeur hors gel", "0,466 m");

  const histoire = histoireDeLaValeur(conclusion, {
    assertions: [conclusion],
    applications: [{ output_assertion_id: "v-hg", input_assertion_id: "v-disparue", input_subject: "Altitude" }]
  });

  assert.deepEqual(histoire.entrees, [{ sujet: "Altitude", valeurId: "v-disparue", valeur: "" }]);
});

test("une entrée que le projet n'a jamais versée garde son nom aussi", () => {
  // `input_assertion_id: null` n'est pas un oubli : c'est ce que le rejeu écrit
  // quand la règle a lu un nom auquel la mémoire ne répondait rien. Filtrer
  // là-dessus effacerait justement la lecture qu'il faut aller combler.
  const conclusion = valeur("v-hg", "Profondeur hors gel", "0,466 m");

  const histoire = histoireDeLaValeur(conclusion, {
    assertions: [conclusion],
    applications: [{ output_assertion_id: "v-hg", input_assertion_id: null, input_subject: "Classe de sol" }]
  });

  assert.deepEqual(histoire.entrees, [{ sujet: "Classe de sol", valeurId: "", valeur: "" }]);
});

test("les lectures d'une autre conclusion ne remontent pas ici", () => {
  const conclusion = valeur("v-hg", "Profondeur hors gel", "0,466 m");
  const applications = [
    { output_assertion_id: "v-hg", input_assertion_id: "v-alt", input_subject: "Altitude" },
    { output_assertion_id: "v-autre", input_assertion_id: "v-sol", input_subject: "Classe de sol" }
  ];

  assert.deepEqual(entreesDeLaValeur(conclusion, applications).map((e) => e.sujet), ["Altitude"]);
});

/* ── Ce que la mémoire ne dit pas ────────────────────────────────────────── */

test("une valeur nue dit ses quatre trous", () => {
  // Une valeur dont rien ne dit l'origine n'est pas une valeur dont l'origine va
  // de soi. C'est la seule façon d'aller l'écrire.
  const nue = valeur("v-1", "Profondeur hors gel", "0,47 m", {}, { decided_by: "", zones: [] });
  const autre = valeur("v-2", "Profondeur hors gel", "0,466 m");

  const histoire = histoireDeLaValeur(nue, { assertions: [nue, autre] });

  assert.deepEqual(histoire.lacunes, [
    LACUNE_DE_LHISTOIRE.ORIGINE,
    LACUNE_DE_LHISTOIRE.POURQUOI,
    LACUNE_DE_LHISTOIRE.AUTEUR,
    LACUNE_DE_LHISTOIRE.PORTEE
  ]);
});

test("une valeur seule de son nom n'a pas besoin de dire sa portée", () => {
  // Sans portée, elle vaut pour l'ouvrage entier : c'est une lecture complète.
  // Ce n'est un trou que dès qu'il y a plusieurs versions du même nom, parce
  // qu'alors on ne peut plus choisir.
  const seule = valeur("v-1", "Altitude", "742,30", { source: "plan.pdf" }, { zones: [] });

  const histoire = histoireDeLaValeur(seule, { assertions: [seule] });

  assert.equal(histoire.plusieursVersions, false);
  assert.ok(!histoire.lacunes.includes(LACUNE_DE_LHISTOIRE.PORTEE));
});

test("une histoire entière ne dit aucun trou", () => {
  const complete = valeur("v-1", "Profondeur hors gel", "0,466 m", {
    provenance: { type: "règle", quoi: "Hors gel" },
    citation: "Sol de type moraine"
  }, { zones: ["Bâtiment A"] });

  assert.deepEqual(histoireDeLaValeur(complete, { assertions: [complete] }).lacunes, []);
  assert.equal(phraseDesLacunesDeLHistoire([]), "");
});

/* ── L'histoire, en lignes ───────────────────────────────────────────────── */

test("chaque ligne porte son intitulé, et se lit en diagonale", () => {
  // Un paragraphe se survole ; des lignes intitulées se lisent d'un coup d'œil,
  // et c'est ainsi qu'on relit une valeur qu'on n'a pas posée.
  const conclusion = valeur("v-hg", "Profondeur hors gel", "0,466 m", {
    provenance: { type: "règle", quoi: "Hors gel" },
    citation: "Sol de type moraine", source: "etude-geotechnique.pdf", page: 12
  }, { zones: ["Bâtiment A"] });
  const altitude = valeur("v-alt", "Altitude", "742,30");

  const lignes = lignesDeLHistoire(
    histoireDeLaValeur(conclusion, {
      assertions: [conclusion, altitude],
      applications: [{ output_assertion_id: "v-hg", input_assertion_id: "v-alt", input_subject: "Altitude" }],
      nommer: NOMMER
    }),
    { dater: (quand) => String(quand).slice(0, 10) }
  );

  const dit = new Map(lignes.map((ligne) => [ligne.quoi, ligne.dit]));
  assert.equal(dit.get("Versée"), "le 2024-05-14 · par Ourdine Ferrand · #P14");
  assert.equal(dit.get("Porte sur"), "Bâtiment A");
  assert.equal(dit.get("Origine"), "déduite par la règle Hors gel");
  assert.equal(dit.get("Parce que"), "« Sol de type moraine » — etude-geotechnique.pdf, p. 12");
  assert.equal(dit.get("Elle a lu"), "Altitude = 742,30");
});

test("une décision dit sa question et ce qu'elle a écarté", () => {
  // C'est ce que personne ne retrouve six mois plus tard, et la seule raison
  // pour laquelle la ligne de décision existe.
  const tranchee = valeur("v-1", "Profondeur hors gel", "0,80 m", {
    decision: {
      question: "Quelle profondeur retenir ?",
      ecartes: [{ quoi: "0,60 m", pourquoi: "sous la cote hors gel" }],
      motif: "étude géotechnique"
    }
  });

  const dit = new Map(
    lignesDeLHistoire(histoireDeLaValeur(tranchee, { assertions: [tranchee] }))
      .map((ligne) => [ligne.quoi, ligne.dit])
  );

  assert.equal(dit.get("Question"), "Quelle profondeur retenir ?");
  assert.equal(dit.get("Écartés"), "0,60 m");
});

test("ce que la valeur valait avant se lit, du plus récent au plus ancien", () => {
  // Une valeur qui a bougé trois fois se relit autrement qu'une valeur posée une
  // fois et jamais touchée — et c'est souvent là qu'est l'histoire.
  const avant = valeur("v-vieille", "Profondeur hors gel", "0,60 m", {}, {
    superseded_by: "v-neuve", decided_at: "2023-01-10T09:00:00Z"
  });
  const neuve = valeur("v-neuve", "Profondeur hors gel", "0,80 m", {}, { supersedes: "v-vieille" });

  const histoire = histoireDeLaValeur(neuve, { assertions: [avant, neuve], nommer: NOMMER });

  assert.deepEqual(histoire.avant.map((version) => version.valeur), ["0,60 m"]);
  const dit = new Map(
    lignesDeLHistoire(histoire, { dater: (q) => String(q).slice(0, 10) })
      .map((ligne) => [ligne.quoi, ligne.dit])
  );
  assert.equal(dit.get("Elle valait"), "0,60 m jusqu'au 2023-01-10");
});

test("une ligne vide ne s'écrit pas", () => {
  // Un intitulé sans rien en face est pire que rien : on le lit, et il
  // n'apprend rien.
  const nue = valeur("v-1", "Altitude", "742,30", {}, { decided_by: "", proposition_number: null, decided_at: "" });

  const quoi = lignesDeLHistoire(histoireDeLaValeur(nue, { assertions: [nue] }))
    .map((ligne) => ligne.quoi);

  assert.deepEqual(quoi, []);
  assert.deepEqual(lignesDeLHistoire(null), []);
});

test("une décision se signe, elle ne se complète pas", () => {
  // Sa provenance porte déjà une signature entière ; l'accoler au mot générique
  // donnait « tranchée par un humain tranché ». Vu à l'écran.
  const signee = phraseDeLOrigine({
    genre: ORIGINE.DECISION, quoi: "Quelle profondeur ? — tranché par Ourdine Ferrand",
    par: "Ourdine Ferrand", le: "12 mars 2026"
  });

  assert.equal(signee, "tranchée par Ourdine Ferrand, le 12 mars 2026");
  assert.doesNotMatch(signee, /un humain/);
});

test("une décision sans signature retombe sur le mot seul", () => {
  // Inventer un auteur serait pire que n'en nommer aucun.
  assert.equal(
    phraseDeLOrigine({ genre: ORIGINE.DECISION, quoi: "Quelle profondeur ?" }),
    "tranchée par un humain"
  );
});

test("une hypothèse ne prend pas de complément", () => {
  assert.equal(
    phraseDeLOrigine({ genre: ORIGINE.HYPOTHESE, quoi: "en attendant le G2" }),
    "supposée, en attendant mieux"
  );
});
