import test from "node:test";
import assert from "node:assert/strict";

import {
  EMETTEUR, ORGANISMES, SIGNAL, candidatsDuDocument, emetteurDuDocument, organismeCertain
} from "./emetteur-du-document.js";

/**
 * Un rapport de contrôle technique, dans la forme où un PDF le rend.
 *
 * Aucun nom de personne réel, aucune adresse réelle : seuls les noms
 * d'organismes sont vrais, et ils sont déjà dans le code.
 */
const RAPPORT = [
  {
    page: 1,
    text: [
      "RAPPORT INITIAL",
      "CONTROLE TECHNIQUE",
      "SOCIETE CLIENTE",
      "Email : contact@societe-cliente.example",
      "VOTRE RESPONSABLE D'AFFAIRE",
      "Email : responsable@socotec.com",
      "SOCOTEC Construction - S.A.S. au capital de 9 116 700 euros - 834 157 513 RCS Versailles"
    ].join("\n")
  },
  { page: 2, text: "Les vérifications de SOCOTEC sont effectuées par rapport aux textes de référence." }
];

/* ── Ce qu'on reconnaît, et par quoi ─────────────────────────────────────── */

test("l'organisme se lit dans le rapport, personne n'a à le taper", () => {
  const { organisme, certitude } = emetteurDuDocument({ pages: RAPPORT });

  assert.equal(organisme.label, "SOCOTEC");
  assert.equal(certitude, EMETTEUR.CERTAIN);
});

test("la preuve se lit, avec sa page", () => {
  // Une reconnaissance qu'on ne peut pas vérifier ne vaut pas mieux qu'une
  // devinette : quelqu'un doit voir la ligne que le système a lue.
  const { preuves } = emetteurDuDocument({ pages: RAPPORT });

  assert.equal(preuves[0].signal, SIGNAL.DOMAINE, "le signal le plus fort d'abord");
  assert.match(preuves[0].extrait, /@socotec\.com/);
  assert.equal(preuves[0].page, 1);
  assert.deepEqual(preuves.map((preuve) => preuve.signal),
    [SIGNAL.DOMAINE, SIGNAL.RAISON_SOCIALE, SIGNAL.NOMME]);
});

test("le domaine du destinataire n'est pas celui de l'auteur", () => {
  // Le piège : un rapport porte l'adresse de son destinataire autant que celle
  // de son auteur. Prendre le premier domaine venu accrocherait le client.
  const { organisme } = emetteurDuDocument({ pages: RAPPORT });
  assert.equal(organisme.id, "socotec", "et non la société cliente");
});

test("un document sans pages se lit comme un autre", () => {
  // Demain, un courriel ou un compte rendu collé : il n'y aura pas de pages.
  const { organisme, certitude } = emetteurDuDocument({
    texte: "Bonjour,\nLe bureau de contrôle APAVE a rendu son avis.\nCordialement."
  });

  assert.equal(organisme.label, "APAVE");
  assert.equal(certitude, EMETTEUR.PROBABLE, "nommé, mais rien ne dit qu'il l'a écrit");
});

test("la casse et les accents ne changent rien", () => {
  const { organisme } = emetteurDuDocument({ texte: "Rapport du Bureau Véritas, transmis ce jour." });
  assert.equal(organisme.id, "bureau-veritas");
});

/* ── Ce qu'on refuse de décider ──────────────────────────────────────────── */

test("deux organismes qui signent ne se départagent pas", () => {
  // Un rapport qui reprend celui d'un confrère. En choisir un accrocherait
  // tous ses avis au mauvais nom, et rien ne le dirait.
  const { organisme, certitude, candidats } = emetteurDuDocument({
    pages: [
      { page: 1, text: "Contact : a@socotec.com" },
      { page: 2, text: "Reprise du rapport APAVE — voir b@apave.fr" }
    ]
  });

  assert.equal(organisme, null);
  assert.equal(certitude, EMETTEUR.PLUSIEURS);
  assert.deepEqual(candidats.map((candidat) => candidat.id).sort(), ["apave", "socotec"]);
});

test("un signal fort l'emporte sur un nom simplement cité", () => {
  // Un rapport SOCOTEC qui mentionne APAVE en passant reste un rapport
  // SOCOTEC : le domaine prouve, la citation non.
  const { organisme, certitude } = emetteurDuDocument({
    pages: [{ page: 1, text: "Contact : a@socotec.com\nLe rapport APAVE antérieur a été consulté." }]
  });

  assert.equal(organisme.id, "socotec");
  assert.equal(certitude, EMETTEUR.CERTAIN);
});

test("deux organismes seulement cités ne se départagent pas non plus", () => {
  const { certitude } = emetteurDuDocument({
    texte: "Étaient présents : le bureau de contrôle SOCOTEC et le bureau APAVE."
  });
  assert.equal(certitude, EMETTEUR.PLUSIEURS);
});

test("un document sans organisme connu le dit", () => {
  const { organisme, certitude } = emetteurDuDocument({ texte: "Compte rendu de réunion de chantier n° 4." });

  assert.equal(organisme, null);
  assert.equal(certitude, EMETTEUR.INCONNU);
});

/* ── Ce qu'on propose quand on ne sait pas ───────────────────────────────── */

/**
 * La liste est courte et le restera. Ce qui la sauve, c'est qu'un émetteur
 * qu'elle ignore se **propose** au lieu de se taire (règle 5).
 */
test("un émetteur inconnu se propose par sa mention légale", () => {
  const { certitude, candidats } = emetteurDuDocument({
    pages: [{
      page: 3,
      text: "CONTROLE TECHNIQUE DU SUD - S.A.R.L. au capital de 40 000 euros - 123 456 789 RCS Nîmes"
    }]
  });

  assert.equal(certitude, EMETTEUR.INCONNU);
  assert.equal(candidats.length, 1);
  assert.match(candidats[0].label, /CONTROLE TECHNIQUE DU SUD/);
  assert.equal(candidats[0].page, 3);
});

test("les candidats ne sortent jamais des adresses électroniques", () => {
  // C'est la même erreur que plus haut, et elle serait invisible : le premier
  // domaine venu est le client une fois sur deux.
  const candidats = candidatsDuDocument({ texte: "Envoyé à contact@societe-cliente.example" });
  assert.deepEqual(candidats, []);
});

/* ── Ce qui entre en mémoire ─────────────────────────────────────────────── */

test("seul un organisme certain entre dans la mémoire", () => {
  // « Probablement SOCOTEC » n'est pas une signature : un avis porte la
  // responsabilité de qui l'a rendu.
  assert.equal(organismeCertain(emetteurDuDocument({ pages: RAPPORT })), "SOCOTEC");
  assert.equal(organismeCertain(emetteurDuDocument({ texte: "Avis rendu par APAVE." })), "");
  assert.equal(organismeCertain(null), "");
});

/* ── La liste elle-même ──────────────────────────────────────────────────── */

test("aucun organisme ne porte deux fois le même nom", () => {
  // Deux entrées sur le même nom rendraient la reconnaissance dépendante de
  // l'ordre de la liste, et donc silencieusement instable.
  const noms = ORGANISMES.flatMap((organisme) => organisme.noms);
  assert.equal(new Set(noms).size, noms.length);

  const domaines = ORGANISMES.flatMap((organisme) => organisme.domaines ?? []);
  assert.equal(new Set(domaines).size, domaines.length);
});
