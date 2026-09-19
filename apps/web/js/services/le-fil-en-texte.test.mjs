import assert from "node:assert/strict";
import test from "node:test";

import { leFilEnTexte, nomDeLExport } from "./le-fil-en-texte.js";
import { leFilDesMails } from "./le-fil-des-mails.js";
import { NATURE } from "./prises-de-position.js";

// Aucun mail réel : les noms, les sociétés et les domaines sont inventés.
const mail = (...lignes) => lignes.join("\r\n");

const PREMIER = mail(
  "From: BERTRAND <contact@bertrand.example>",
  "To: Ourdine Ferrand <o.ferrand@novaclim.example>",
  "Cc: Bureau VERIFAS <controle@verifas.example>",
  "Date: Tue, 3 Mar 2026 08:30:00 +0100",
  "Subject: Étanchéité toiture",
  "Message-ID: <a1@bertrand.example>",
  "", "Rien n'a été relevé au droit de l'acrotère à ce jour.", ""
);

const SECOND = mail(
  "From: Ourdine Ferrand <o.ferrand@novaclim.example>",
  "To: BERTRAND <contact@bertrand.example>",
  "Date: Thu, 12 Mar 2026 09:14:00 +0100",
  "Subject: Re: Étanchéité toiture",
  "Message-ID: <b2@novaclim.example>",
  "In-Reply-To: <a1@bertrand.example>",
  "Content-Type: multipart/mixed; boundary=\"limite-1\"",
  "",
  "--limite-1",
  "Content-Type: text/plain; charset=utf-8",
  "Content-Transfer-Encoding: quoted-printable",
  "",
  "Le support est humide au droit de l'acrot=C3=A8re.",
  "",
  "Le 3 mars 2026 =C3=A0 08:30, BERTRAND a =C3=A9crit :",
  "> Rien n'a =C3=A9t=C3=A9 relev=C3=A9 au droit de l'acrot=C3=A8re =C3=A0 ce jour.",
  "--limite-1",
  "Content-Type: application/pdf",
  "Content-Disposition: attachment; filename=\"releve-humidite.pdf\"",
  "",
  "JVBERi0=",
  "--limite-1--",
  ""
);

const fil = () => leFilDesMails([PREMIER, SECOND]);

const RELEVE = {
  prises: [{
    key: "p1", nature: NATURE.CONSTAT, intitule: "le support est humide au droit de l'acrotère",
    citation: "Le support est humide au droit de l'acrotère.", message: 2,
    qui: "Ourdine Ferrand", quand: "12 mars 2026 à 09:14", porteSur: "humidité de l'acrotère",
    pourQui: null, echeance: null, messageVerifie: true
  }],
  ecartees: 2, messagesCorriges: 1, coupee: false,
  modele: "gpt-4.1-mini", entree: 4200, sortie: 800, dureeMs: 3400,
  derive: { sansReponse: 0, desaccords: 0, indecidables: 1 }
};

// ── Ce que l'export porte ──────────────────────────────────────────────────

test("l'export commence par l'identité du fil", () => {
  assert.ok(leFilEnTexte({ fil: fil() }).startsWith("# Étanchéité toiture · 2 messages"));
});

test("l'export dit ce qui a ordonné le fil", () => {
  // C'est la première chose à savoir pour juger : un fil ordonné par ses dates
  // n'a pas le même degré de certitude qu'un fil ordonné par sa chaîne.
  assert.ok(leFilEnTexte({ fil: fil() }).includes("ordonné par la chaîne des réponses"));
});

test("chaque message porte qui, quand, à qui, et ce qu'il ajoute", () => {
  const texte = leFilEnTexte({ fil: fil() });
  assert.ok(texte.includes("### Message 1 — BERTRAND"));
  assert.ok(texte.includes("3 mars 2026 à 08:30"));
  assert.ok(texte.includes("Bureau VERIFAS en copie"));
  assert.ok(texte.includes("Le support est humide au droit de l'acrotère."));
});

test("ce qu'un message recopie est là, mais replié", () => {
  // De quoi vérifier une coupure dont on doute, sans que le fil en soit
  // illisible.
  const texte = leFilEnTexte({ fil: fil() });
  assert.ok(texte.includes("<details><summary>Ce qu'il recopie</summary>"));
  assert.ok(texte.includes("> Rien n'a été relevé au droit de l'acrotère à ce jour."));
});

test("les pièces jointes sont nommées", () => {
  assert.ok(leFilEnTexte({ fil: fil() }).includes("releve-humidite.pdf"));
});

test("les noms des fichiers déposés y figurent quand on les donne", () => {
  const texte = leFilEnTexte({ fil: fil(), fichiers: ["a.eml", "b.eml"] });
  assert.ok(texte.includes("a.eml, b.eml"));
});

// ── Le relevé, quand il y en a un ──────────────────────────────────────────

test("sans relevé, l'export dit que rien n'a été payé", () => {
  // Ce n'est pas la même chose qu'un relevé vide : le premier se demande, le
  // second se répare.
  const texte = leFilEnTexte({ fil: fil() });
  assert.ok(texte.includes("Aucun relevé n'a été demandé"));
  assert.ok(texte.includes("sans un seul appel au modèle"));
});

test("avec relevé, l'export porte chaque prise et sa citation", () => {
  const texte = leFilEnTexte({ fil: fil(), releve: RELEVE });
  assert.ok(texte.includes("### Constat (1)"));
  assert.ok(texte.includes("#### le support est humide au droit de l'acrotère"));
  assert.ok(texte.includes("**Porte sur** : humidité de l'acrotère"));
  assert.ok(texte.includes("> Le support est humide au droit de l'acrotère."));
});

test("l'export porte ce que le relevé a coûté et ce qu'il a écarté", () => {
  // C'est la moitié du jugement : un relevé qui écarte la moitié de ce qu'il
  // rend ne vaut pas le même prix.
  const texte = leFilEnTexte({ fil: fil(), releve: RELEVE });
  assert.ok(texte.includes("**Modèle** : gpt-4.1-mini"));
  assert.ok(texte.includes("**Jetons d'entrée** : 4200"));
  assert.ok(texte.includes("**Écartées faute de citation** : 2"));
  assert.ok(texte.includes("**Rattachées à un autre message** : 1"));
});

test("l'export porte le compte des demandes qu'on n'a pas su juger", () => {
  // C'est le chiffre à regarder en premier : il dit combien du fil échappe à
  // la dérivation.
  assert.ok(leFilEnTexte({ fil: fil(), releve: RELEVE })
    .includes("**Demandes qu'on n'a pas su juger** : 1"));
});

const DESACCORD = {
  key: "d1", nature: NATURE.DESACCORD, porteSur: "humidité de l'acrotère",
  intitule: "je ne partage pas votre position sur l'humidité", message: 2,
  marque: "ne-partage-pas", avant: ["BERTRAND"],
  positions: [{
    qui: "Ourdine Ferrand", quand: "12 mars",
    intitule: "je ne partage pas votre position sur l'humidité",
    citation: "Je ne partage pas votre position sur l'humidité."
  }]
};

test("un désaccord sort avec les mots de celui qui conteste", () => {
  const texte = leFilEnTexte({ fil: fil(), releve: { ...RELEVE, prises: [DESACCORD] } });
  assert.ok(texte.includes("Une position est contestée."));
  assert.ok(texte.includes("Ourdine Ferrand"));
  assert.ok(texte.includes("> Je ne partage pas votre position sur l'humidité."));
});

test("un désaccord dit quelle marque l'a fait relever", () => {
  // De quoi juger la règle sur pièce plutôt que sur parole (règle 12).
  assert.ok(leFilEnTexte({ fil: fil(), releve: { ...RELEVE, prises: [DESACCORD] } })
    .includes("**Marque** : ne-partage-pas"));
});

test("un désaccord nomme qui s'était exprimé avant, sans désigner sa position", () => {
  const texte = leFilEnTexte({ fil: fil(), releve: { ...RELEVE, prises: [DESACCORD] } });
  assert.ok(texte.includes("Se sont exprimés avant sur ce sujet** : BERTRAND"));
});

test("une contestation que personne n'a précédée dit ce qu'on a cherché", () => {
  // **Et non « personne n'a parlé ».** Le rapprochement se fait sur le libellé
  // de sujet rendu par le modèle ; sur un fil réel, l'écran affirmait que la
  // position visée venait d'ailleurs alors qu'elle était deux messages plus
  // haut, sous un intitulé voisin (règle 5).
  const texte = leFilEnTexte({
    fil: fil(), releve: { ...RELEVE, prises: [{ ...DESACCORD, avant: [] }] }
  });
  assert.ok(texte.includes("aucune autre prise relevée sous ce sujet"));
  assert.ok(texte.includes("ou d'un intitulé voisin"));
  assert.ok(texte.includes("ce qui est contesté peut venir d'ailleurs"));
});

test("l'export dit la marque qui a fait dériver une prise", () => {
  // « contre-commande » n'est pas « sur-demande » : l'une a un prix.
  const offre = {
    key: "o1", nature: NATURE.OFFRE, natureDeclaree: NATURE.DEMANDE,
    marque: "contre-commande", intitule: "une étude spécifique sur commande",
    citation: "Cette prestation devra faire l'objet d'une commande complémentaire.",
    message: 2, qui: "Ourdine Ferrand", quand: "12 mars", porteSur: "étude spécifique"
  };
  const texte = leFilEnTexte({ fil: fil(), releve: { ...RELEVE, prises: [offre] } });
  assert.ok(texte.includes("**Marque** : contre-commande"));
  assert.ok(texte.includes("**Déclarée comme** : Demande"));
});

test("ce qu'on en a tiré s'affiche aussi sous le message d'où ça sort", () => {
  // De quoi refaire le jugement message par message, sans chercher.
  const texte = leFilEnTexte({ fil: fil(), releve: RELEVE });
  const message2 = texte.slice(texte.indexOf("### Message 2"), texte.indexOf("## Le relevé"));
  assert.ok(message2.includes("**Ce qu'on en a tiré :**"));
  assert.ok(message2.includes("**Constat** — le support est humide"));
});

test("les trous d'un message sont dans l'export", () => {
  const sansIdentite = PREMIER.replace("Message-ID: <a1@bertrand.example>\r\n", "");
  const texte = leFilEnTexte({ fil: leFilDesMails([sansIdentite]) });
  assert.ok(texte.includes("ce message n'a pas d'identifiant"));
});

// ── Les bords ──────────────────────────────────────────────────────────────

test("sans fil, il n'y a rien à emporter", () => {
  assert.equal(leFilEnTexte({}), "");
  assert.equal(leFilEnTexte({ fil: null }), "");
});

test("l'export ne laisse pas trois lignes vides de suite", () => {
  // Une rubrique suivie d'une prise, une prise suivie d'une autre : plusieurs
  // endroits empilent des lignes vides, et un seul cas d'épreuve n'en attrape
  // qu'un. Un Markdown troué de blancs se relit mal, et c'est pour être relu
  // qu'il existe.
  const nue = {
    ...RELEVE,
    prises: [
      { ...RELEVE.prises[0], porteSur: null, key: "p1" },
      { ...RELEVE.prises[0], key: "p2", nature: NATURE.DEMANDE, pourQui: "BERTRAND", echeance: "jeudi" }
    ]
  };
  for (const releve of [null, RELEVE, nue]) {
    assert.equal(/\n{3}/.test(leFilEnTexte({ fil: fil(), releve })), false, JSON.stringify(releve?.prises?.length));
  }
});

test("le nom du fichier vient de l'objet du fil", () => {
  assert.equal(nomDeLExport({ objet: "Étanchéité toiture" }), "Étanchéité toiture.md");
});

test("un objet qui ferait un chemin ne fait pas un chemin", () => {
  assert.equal(nomDeLExport({ objet: "Lot 3 / toiture" }), "Lot 3 toiture.md");
});

test("un fil sans objet garde un nom", () => {
  assert.equal(nomDeLExport({ objet: "" }), "fil de mails.md");
  assert.equal(nomDeLExport(null), "fil de mails.md");
});

// ── Ce qui a été écarté, et ce dont rien n'a été tiré ──────────────────────

const ECARTEE = {
  motif: "introuvable",
  phrase: "cette citation ne se retrouve dans aucun message du fil",
  nature: NATURE.CONSTAT,
  intitule: "le chantier est arrêté depuis mardi",
  citation: "Le chantier est arrêté depuis mardi.",
  message: 2
};

test("l'export dit ce qui a été écarté, et la phrase qui a été refusée", () => {
  // **Un compte ne suffit pas.** « 2 écartées » recouvre deux défauts opposés :
  // des inventions jetées — la porte a protégé — ou des phrases réelles mal
  // recopiées — la porte a jeté. Seule la citation permet de trancher.
  const texte = leFilEnTexte({
    fil: fil(), releve: { ...RELEVE, lesEcartees: [ECARTEE] }
  });
  assert.ok(texte.includes("### Ce qui a été écarté (1)"));
  assert.ok(texte.includes("le chantier est arrêté depuis mardi"));
  assert.ok(texte.includes("> Le chantier est arrêté depuis mardi."));
  assert.ok(texte.includes("cette citation ne se retrouve dans aucun message du fil"));
  assert.ok(texte.includes("(message 2)"));
});

test("une écartée sur plusieurs lignes ne casse pas la citation", () => {
  const texte = leFilEnTexte({
    fil: fil(),
    releve: { ...RELEVE, lesEcartees: [{ ...ECARTEE, citation: "Deux lignes\nd'un coup." }] }
  });
  assert.ok(texte.includes("> Deux lignes d'un coup."));
});

test("sans écartée, la rubrique ne s'ouvre pas", () => {
  // Une rubrique déserte fait chercher ce qui devrait s'y trouver.
  const texte = leFilEnTexte({ fil: fil(), releve: { ...RELEVE, lesEcartees: [] } });
  assert.equal(texte.includes("Ce qui a été écarté"), false);
});

test("l'export nomme les messages dont le modèle n'a rien dit", () => {
  const texte = leFilEnTexte({
    fil: fil(), releve: { ...RELEVE, muets: [1], oublies: [2] }
  });
  assert.ok(texte.includes("### Ce dont rien n'a été tiré"));
  assert.ok(texte.includes("1 message dont il déclare ne rien tirer (1)"));
  assert.ok(texte.includes("1 message dont il n'a rien dit du tout (2)"));
  assert.ok(texte.includes("c'est une omission"),
    "un message sauté ne se range pas à côté d'un message lu et vide");
});

test("un relevé complet n'ouvre pas la rubrique de ce qui manque", () => {
  const texte = leFilEnTexte({ fil: fil(), releve: { ...RELEVE, muets: [], oublies: [] } });
  assert.equal(texte.includes("Ce dont rien n'a été tiré"), false);
});

test("un relevé qui n'a pas compté message par message le dit", () => {
  // Zéro muet et zéro oublié affirmerait une lecture complète qui n'a pas eu
  // lieu (règle 5).
  const texte = leFilEnTexte({ fil: fil(), releve: RELEVE });
  assert.ok(texte.includes("n'a pas rendu sa lecture message par message"));
});
