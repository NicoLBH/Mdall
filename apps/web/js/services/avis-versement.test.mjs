import test from "node:test";
import assert from "node:assert/strict";

import { avisDuRapport, avisVersable, sujetDeLAvis } from "./avis-versement.js";
import { engagementsDeLaFusion } from "./avis-engagement.js";
import { ACT } from "./memoire-actes.js";
import { LIAISON } from "./avis-liaison.js";
import { EMETTEUR } from "./emetteur-du-document.js";

const MEMOIRE = [
  { id: "neige", superseded_by: null, payload: { subject: "Zone de neige", value: "A1" } },
  { id: "vent", superseded_by: null, payload: { subject: "Zone de vent", value: "3" } }
];

/** Un avis lu dans un rapport, dans la forme que le moteur d'extraction rend. */
const avis = (reference, titre, opinion = "Favorable") => ({
  title_raw: titre,
  value: { external_reference_raw: reference, external_reference_normalized: reference, opinion_raw: opinion },
  opinion_label: opinion,
  provenance: { source_id: "doc-1", page: 12 }
});

/* ── Ce qu'un avis devient ───────────────────────────────────────────────── */

test("un avis se verse comme un constat, et le reste", () => {
  // Un constat ne devient jamais faux : il reste vrai à sa date (règle 6).
  // C'est sa couverture qui tombe, pas lui.
  const versable = avisVersable({
    avis: avis("2.1.3", "Zone de neige"), emisPar: "Organisme de contrôle",
    rapport: "rapport-4.pdf", documentId: "doc-1", le: "2026-03-12"
  });

  assert.equal(versable.sujet, "Avis de contrôle technique n° 2.1.3");
  assert.equal(versable.nature, "constat");
  assert.match(versable.valeur, /Favorable — Zone de neige/);
});

/**
 * Le piège que le plan avait nommé. Une affirmation porte `decided_by` :
 * l'utilisateur Mdall qui a signé. S'en contenter ferait dire à la mémoire que
 * le stagiaire a rendu un avis favorable.
 */
test("qui a émis l'avis ne se confond pas avec qui l'a saisi", () => {
  const versable = avisVersable({
    avis: avis("2.1.3", "Zone de neige"), emisPar: "Organisme de contrôle",
    rapport: "rapport-4.pdf", documentId: "doc-1", le: "2026-03-12"
  });

  assert.equal(versable.emisPar, "Organisme de contrôle");
  // Et l'organisme se relit dans la provenance, avec le rapport et la page.
  assert.match(versable.provenance.quoi, /Organisme de contrôle/);
  assert.match(versable.provenance.quoi, /rapport-4\.pdf/);
  assert.match(versable.provenance.quoi, /page 12/);
});

test("un avis sans numéro ne se verse pas", () => {
  // Sans identité, deux avis anonymes du même rapport se périmeraient l'un
  // l'autre à la fusion.
  assert.equal(sujetDeLAvis({ title_raw: "Zone de neige" }), "");
  assert.equal(avisVersable({ avis: { title_raw: "Zone de neige" } }), null);
});

test("la teneur se verse telle qu'elle est écrite, quelle qu'elle soit", () => {
  const suspendu = avisVersable({
    avis: avis("2.1.4", "Zone de vent", "Suspendu"), emisPar: "Organisme de contrôle"
  });
  assert.match(suspendu.valeur, /^Suspendu/);
});

/* ── Le lot d'un rapport ─────────────────────────────────────────────────── */

test("tout le rapport entre, accroché ou non", () => {
  const { versables, sansLiaison } = avisDuRapport({
    avis: [avis("2.1.3", "Zone de neige"), avis("2.1.4", "Dispositions constructives")],
    assertions: MEMOIRE, emisPar: "Organisme de contrôle", rapport: "rapport-4.pdf", documentId: "doc-1"
  });

  assert.equal(versables.length, 2, "un avis non accroché entre quand même");
  assert.deepEqual(versables.map((v) => v.porteSur), ["neige", ""]);
  assert.equal(versables[1].liaison, LIAISON.SANS_SUJET);
  // Ce qui n'a pas été reconnu se **compte** : c'est la mesure de ce que
  // l'extraction n'a pas su faire, et elle ne se cache pas.
  assert.equal(sansLiaison, 1);
});

/* ── L'organisme, lu dans le rapport ────────────────────────────── */

/**
 * L'étape précédente réclamait ce nom à l'utilisateur. Il est imprimé en pied de
 * chaque page : le réclamer serait demander de retaper ce qui est sous les yeux.
 */
test("le rapport dit lui-même qui l'a émis", () => {
  const pages = [{
    page: 1,
    text: "Email : responsable@socotec.com\n"
      + "SOCOTEC Construction - S.A.S. au capital de 9 116 700 euros - 834 157 513 RCS Versailles"
  }];

  const { versables, emetteur } = avisDuRapport({
    avis: [avis("2.1.3", "Zone de neige")], assertions: MEMOIRE, rapport: "rapport-4.pdf", pages
  });

  assert.equal(emetteur.certitude, EMETTEUR.CERTAIN);
  assert.equal(versables[0].emisPar, "SOCOTEC");
  assert.match(versables[0].provenance.quoi, /SOCOTEC/);
});

test("ce que l'appelant sait déjà l'emporte sur ce qu'on lit", () => {
  const { versables } = avisDuRapport({
    avis: [avis("2.1.3", "Zone de neige")], assertions: MEMOIRE,
    emisPar: "Organisme de contrôle", pages: [{ page: 1, text: "contact@socotec.com" }]
  });

  assert.equal(versables[0].emisPar, "Organisme de contrôle");
});

test("un organisme seulement vraisemblable n'entre pas dans la mémoire", () => {
  // Il se dira à l'écran, avec ses preuves, et quelqu'un signera (règle 1).
  const { versables, emetteur } = avisDuRapport({
    avis: [avis("2.1.3", "Zone de neige")], assertions: MEMOIRE,
    texte: "Compte rendu de réunion — le bureau de contrôle APAVE a rendu son avis."
  });

  assert.equal(emetteur.certitude, EMETTEUR.PROBABLE);
  assert.equal(emetteur.organisme.label, "APAVE");
  assert.equal(versables[0].emisPar, "", "rien ne s'écrit qu'on ne puisse signer");
});

/* ── Ce que la fusion en fait ────────────────────────────────────────────── */

/**
 * La confirmation, c'est la signature. Pas de second geste, pas de file
 * d'attente, pas d'écran de validation (règle 12) : quelqu'un lit la liste
 * avant de signer, et ce qu'il signe entre.
 */
test("un avis accroché devient un engagement à la fusion", () => {
  const ecrites = [{
    id: "avis-1", project_id: "p1", status: "assumed",
    payload: {
      subject: "Avis de contrôle technique n° 2.1.3",
      value: "Favorable — Zone de neige",
      porteSur: "neige", emisPar: "Organisme de contrôle", documentId: "doc-1", page: 12
    }
  }];

  const [acte] = engagementsDeLaFusion({ ecrites, par: "u-signataire", le: "2026-03-12T09:00:00Z" });

  assert.equal(acte.verdict, ACT.COUVRE);
  // Sur **cette version-là** de la valeur : c'est ce qui fait que l'engagement
  // tombe tout seul quand elle est remplacée.
  assert.equal(acte.assertion_id, "neige");
  // Et l'avis reste la source : c'est par lui qu'on remonte au rapport.
  assert.equal(acte.source_assertion_id, "avis-1");
  assert.equal(acte.source_document_id, "doc-1");
  assert.equal(acte.source_page, 12);
  assert.equal(acte.declared_by, "u-signataire", "qui a signé");
  assert.match(acte.note, /Organisme de contrôle/, "et qui a rendu l'avis");
});

test("un avis non accroché n'engage rien", () => {
  const ecrites = [{
    id: "avis-2", project_id: "p1", status: "assumed",
    payload: { subject: "Avis de contrôle technique n° 2.1.4", value: "Favorable", porteSur: "" }
  }];

  assert.deepEqual(engagementsDeLaFusion({ ecrites }), []);
});

test("un avis écarté à la revue n'engage rien non plus", () => {
  // Ce que quelqu'un a refusé ne peut pas couvrir une valeur.
  const ecrites = [{
    id: "avis-3", project_id: "p1", status: "rejected",
    payload: { subject: "Avis de contrôle technique n° 2.1.5", value: "Favorable", porteSur: "neige" }
  }];

  assert.deepEqual(engagementsDeLaFusion({ ecrites }), []);
});

test("ce qui n'est pas un avis traverse la fusion sans rien écrire", () => {
  const ecrites = [{ id: "zone", project_id: "p1", status: "assumed", payload: { subject: "Zone de neige" } }];
  assert.deepEqual(engagementsDeLaFusion({ ecrites }), []);
});

/* ── La chaîne entière, du rapport à l'engagement ────────────────────────── */

/**
 * Le seul test qui prouve que l'étape tient : un avis lu dans un rapport
 * traverse tout le chemin — versable, item de proposition, affirmation écrite,
 * engagement — sans qu'aucun maillon ne perde ce qu'il porte.
 *
 * Le maillon fragile est l'item : sa charge est une **liste blanche**, et
 * `porteSur` s'y perdait sans un mot. L'engagement n'aurait alors jamais été
 * écrit, et rien ne l'aurait dit.
 */
test("un avis traverse le rapport, la proposition et la fusion sans rien perdre", async () => {
  const { itemsDeProposition } = await import("./atelier-proposition.js");
  const { assertionsFromProposition } = await import("./project-memory.js");

  // 1. Le rapport.
  const { versables } = avisDuRapport({
    avis: [avis("2.1.3", "Zone de neige")],
    assertions: MEMOIRE,
    emisPar: "Organisme de contrôle", rapport: "rapport-4.pdf", documentId: "doc-1", le: "2026-03-12"
  });

  // 2. La proposition. C'est ici que la liste blanche pouvait tout perdre.
  const items = itemsDeProposition(versables);
  assert.equal(items[0].payload.porteSur, "neige", "la liaison doit survivre à l'item");
  assert.equal(items[0].payload.emisPar, "Organisme de contrôle");
  assert.equal(items[0].payload.page, 12);

  // 3. Ce que la fusion écrit dans la mémoire.
  const ecrites = assertionsFromProposition({
    proposition: { id: "prop-1", project_id: "p1", number: 7, merged_at: "2026-03-12T09:00:00Z" },
    items
  }).map((ligne, rang) => ({ ...ligne, id: `ecrite-${rang}` }));

  assert.equal(ecrites[0].nature, "constat", "un avis est un constat");
  assert.equal(ecrites[0].payload.porteSur, "neige");

  // 4. L'engagement, écrit parce que quelqu'un a signé.
  const [acte] = engagementsDeLaFusion({ ecrites, par: "u-signataire", le: "2026-03-12T09:00:00Z" });

  assert.equal(acte.verdict, ACT.COUVRE);
  assert.equal(acte.assertion_id, "neige");
  assert.equal(acte.source_assertion_id, "ecrite-0");
  assert.match(acte.note, /Organisme de contrôle/);
});

/**
 * Et la boucle se referme : ce que l'engagement couvre, une variante le fait
 * tomber. C'est l'étape 1 qui le lit, et elle n'a rien eu à apprendre.
 */
test("l'engagement ainsi écrit tombe quand la variante change la valeur", async () => {
  const { couvertureDeLaVariante } = await import("./couverture.js");

  const zone = MEMOIRE[0];
  const ecrites = [{
    id: "avis-1", project_id: "p1", status: "assumed",
    payload: { subject: "Avis de contrôle technique n° 2.1.3", value: "Favorable — Zone de neige",
      porteSur: "neige", emisPar: "Organisme de contrôle" }
  }];
  const [acte] = engagementsDeLaFusion({ ecrites, par: "u1", le: "2026-03-12T09:00:00Z" });

  const { tombees } = couvertureDeLaVariante({
    rendu: {
      ok: true, depart: [], rejouees: [], aRevoir: [],
      recalculees: [{ assertion: zone, sujet: "Zone de neige", avant: "A1", apres: "E" }]
    },
    assertions: [zone],
    actes: [{ ...acte, id: "acte-1" }],
    applications: []
  });

  assert.equal(tombees.length, 1);
  assert.equal(tombees[0].examinee.id, "neige");
  assert.equal(tombees[0].deviendrait, "E");
});
