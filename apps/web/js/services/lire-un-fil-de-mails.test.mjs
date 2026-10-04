/**
 * La lecture d'un fil, **échecs compris**.
 *
 * Ce qui s'éprouve ici est ce qu'aucun essai en ligne ne reproduit : un
 * document sur trois qui ne descend pas, une archive vide, un relevé refusé.
 * Les deux allers-retours sont passés au module ; on les fait échouer à la
 * demande.
 *
 * Les mails sont inventés : des adresses en `.example`, des noms qui ne
 * désignent personne.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  ETAPE_DU_FIL, PHRASES_DES_ETAPES_DU_FIL, REFUS_DU_FIL, leMotDuFilALire, leMotDuFilLu,
  lireUnFilDeMails, phraseDuRefusDuFil
} from "./lire-un-fil-de-mails.js";

/** Un `.eml` minimal, tel qu'une messagerie l'exporte. */
function unMail({ de = "ourdine@verifas.example", objet = "Reprise des enduits",
  quand = "Mon, 2 Mar 2026 09:00:00 +0100", propos = "Le support est humide." } = {}) {
  const lignes = [
    `From: ${de}`,
    "To: bertrand@novaclim.example",
    `Subject: ${objet}`,
    `Date: ${quand}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    propos,
    ""
  ];
  return new TextEncoder().encode(lignes.join("\r\n"));
}

/** Les outils, tous réussis par défaut — chaque épreuve en casse un. */
function desOutils({ octetsDu, messagesDe, releverLeFil } = {}) {
  const etapes = [];
  return {
    etapes,
    outils: {
      /**
       * **Des mails réellement distincts**, et pas seulement de nom.
       *
       * Le fil déduplique — c'est ce pour quoi il a été écrit : trois copies du
       * même message ne font pas trois messages. Un jeu d'essai où les trois
       * mails ne diffèrent que par leur objet rendait donc un fil à **un**
       * message, et toute épreuve qui aurait compté les messages l'aurait trouvé
       * à un sans que ce soit un défaut du code (règle 10).
       */
      octetsDu: octetsDu ?? (async (document, rang = 0) => ({
        octets: unMail({
          objet: `Objet de ${document.nom}`,
          quand: `Mon, ${2 + Number(document.nom.match(/\d+/)?.[0] ?? rang)} Mar 2026 09:00:00 +0100`,
          propos: `Le support est humide, voir ${document.nom}.`
        }),
        nom: document.nom
      })),
      messagesDe: messagesDe ?? (async (octets, nom) => ({ messages: [{ octets, nom }] })),
      releverLeFil: releverLeFil ?? (async ({ messages }) => ({
        ok: true, modele: "gpt-4.1-mini",
        prises: messages.map((un, rang) => ({ nature: "constat", intitule: `Prise ${rang}` }))
      })),
      onEtape: (quoi) => etapes.push(quoi)
    }
  };
}

const desMails = (combien) => Array.from({ length: combien },
  (rien, rang) => ({ id: `m-${rang}`, nom: `mail-${rang}.eml` }));

/* ── Le parcours entier ───────────────────────────────────────────────────── */

test("les trois étapes se font dans l'ordre, et la lecture se garde", async () => {
  const { etapes, outils } = desOutils();
  const lu = await lireUnFilDeMails(desMails(3), outils);

  assert.equal(lu.ok, true, lu.motif);
  assert.deepEqual(etapes.map((une) => une.quoi),
    [ETAPE_DU_FIL.OCTETS, ETAPE_DU_FIL.FIL, ETAPE_DU_FIL.RELEVE]);
  assert.equal(etapes[0].combien, 3, "la première étape dit combien de mails descendent");

  // Ce qui sort est la forme de la vue du lecteur de mails : celle que
  // `laLigneDunFil` sait écrire et que `laVueDunFil` sait rouvrir.
  assert.ok(lu.vue.fil, "un fil");
  assert.ok(Array.isArray(lu.vue.fil.messages), "des messages");
  assert.ok(lu.vue.releve.ok, "un relevé");
  assert.deepEqual(lu.vue.idees, []);
  assert.deepEqual(lu.perdus, []);
});

test("un fichier qui en porte plusieurs les donne tous au fil", async () => {
  // Un `.zip` porte tout un dossier de messages : les donner un à un, c'est ce
  // qui fait qu'un export d'Outlook se lit ici comme ailleurs.
  const { outils } = desOutils({
    messagesDe: async (octets, nom) => ({ messages: [
      { octets, nom: `${nom}#1` },
      { octets: unMail({ objet: "Reprise des enduits", quand: "Tue, 3 Mar 2026 09:00:00 +0100" }),
        nom: `${nom}#2` }
    ] })
  });

  const lu = await lireUnFilDeMails([{ id: "z", nom: "export.zip" }], outils);
  assert.equal(lu.ok, true, lu.motif);
  assert.equal(lu.vue.fichiers.length, 2);
});

/* ── Ce qu'un échec laisse passer ─────────────────────────────────────────── */

test("un mail qui ne descend pas ne fait pas tomber le fil, et se compte", async () => {
  // Trois mails sur quatre valent mieux qu'aucun. Mais un fil troué qui se
  // présenterait comme complet ferait lire une correspondance à laquelle il
  // manque une réponse, sans que rien ne le signale (règle 5).
  const { outils } = desOutils({
    octetsDu: async (document) => (document.nom === "mail-1.eml"
      ? null
      : { octets: unMail({ objet: document.nom }), nom: document.nom })
  });

  const lu = await lireUnFilDeMails(desMails(3), outils);

  assert.equal(lu.ok, true, lu.motif);
  assert.deepEqual(lu.perdus, ["mail-1.eml"]);
  assert.match(leMotDuFilLu(lu), /le fil est incomplet/);
  assert.match(leMotDuFilLu(lu), /1 mail n&#x27;a pas pu|1 mail n'a pas pu/);
});

/**
 * **Le compte rendu à l'écran est celui du fil, et il se vérifie.**
 *
 * Il ne l'était pas : la phrase lisait `lu.fil`, que rien de ce module ne rend —
 * le fil vit sous `lu.vue`. Chaque lecture réussie annonçait donc « 0 message
 * lu », ce qui se lit « il ne s'est rien passé », et c'est ce qu'on a cru.
 *
 * L'épreuve d'à côté passait pourtant le vrai objet ; elle ne regardait que la
 * phrase des manquants. **Un compte qu'aucune épreuve ne lit peut valoir
 * n'importe quoi** (règle 5), et celui-ci valait zéro depuis le premier jour.
 */
test("la phrase de fin compte les messages du fil, et nomme son objet", async () => {
  const { outils } = desOutils();
  const lu = await lireUnFilDeMails(desMails(3), outils);

  assert.equal(lu.ok, true, lu.motif);

  // Trois mails, trois messages dans le fil. Le chiffre vient de `lu.vue.fil`.
  assert.equal(lu.vue.fil.messages.length, 3,
    "le fil ne porte pas les trois messages : l'épreuve suivante ne prouverait rien");

  const dit = leMotDuFilLu(lu);
  assert.match(dit, /^3 messages lus/,
    `la phrase ne compte pas les messages lus : « ${dit} »`);
  assert.doesNotMatch(dit, /^0 message/,
    "la phrase annonce zéro sur une lecture qui a abouti : elle se lit « rien ne s'est passé »");

  // L'objet du fil est nommé : deux lectures de suite rendraient sinon la même
  // phrase, et l'on ne saurait pas laquelle vient d'aboutir.
  assert.match(dit, new RegExp(lu.vue.fil.objet.slice(0, 12)),
    `la phrase ne nomme pas le fil : « ${dit} »`);

  // Et elle dit où la lecture est allée : chercher une proposition qui n'existe
  // pas, puis douter du reste, est le défaut qu'on ferme (règle 1).
  assert.match(dit, /rien n'entre en mémoire|rien n&#x27;entre en mémoire/, dit);
});

/** Un seul message s'accorde au singulier, et aucun ne ment sur le reste. */
test("la phrase de fin s'accorde, et tient sur une lecture vide", async () => {
  const { outils } = desOutils();
  const un = await lireUnFilDeMails(desMails(1), outils);
  assert.match(leMotDuFilLu(un), /^1 message lu /, leMotDuFilLu(un));

  // **Et elle ne tombe pas sur rien.** La phrase sert aussi quand l'écran n'a
  // pas d'objet à lui donner ; lever ici effacerait la trace du geste.
  for (const rien of [null, undefined, {}, { vue: null }, { vue: { fil: null } }]) {
    assert.match(leMotDuFilLu(rien), /^0 message lu/);
  }
});

test("aucun mail choisi ne lance rien", async () => {
  const { etapes, outils } = desOutils();
  const lu = await lireUnFilDeMails([], outils);

  assert.equal(lu.ok, false);
  assert.equal(lu.motif, REFUS_DU_FIL.SANS_MAIL);
  // Et surtout : **rien n'est descendu, rien n'est relevé**. Un appel payé pour
  // une liste vide est un appel payé pour rien.
  assert.deepEqual(etapes, []);
});

test("des fichiers qui ne portent aucun message s'arrêtent avant le relevé", async () => {
  // C'est le cas de l'archive vide, et celui du dépôt qui ne s'est pas terminé.
  let demande = 0;
  const { outils } = desOutils({
    messagesDe: async () => ({ messages: [] }),
    releverLeFil: async () => { demande += 1; return { ok: true }; }
  });

  const lu = await lireUnFilDeMails(desMails(2), outils);

  assert.equal(lu.ok, false);
  assert.equal(lu.motif, REFUS_DU_FIL.SANS_MESSAGE);
  assert.equal(demande, 0, "le modèle a été appelé sur un fil vide");
});

test("un relevé refusé ne garde pas la lecture, et dit pourquoi", async () => {
  // Un fil déplié sans relevé se redéplie gratuitement : en garder une ligne
  // ferait une liste d'essais au lieu d'une liste de fils lus (règle 6).
  const { outils } = desOutils({
    releverLeFil: async () => ({ ok: false, motif: "injoignable" })
  });

  const lu = await lireUnFilDeMails(desMails(2), outils);

  assert.equal(lu.ok, false);
  assert.equal(lu.motif, REFUS_DU_FIL.SANS_RELEVE);
  assert.equal(lu.refus, "injoignable",
    "une session expirée et un fournisseur en panne se réparent autrement");
  // Le fil déplié revient quand même : l'écran peut le montrer sans le garder.
  assert.ok(lu.fil);
});

test("chaque refus se dit, et aucun ne dit la même chose qu'un autre", async () => {
  const dits = Object.values(REFUS_DU_FIL).map(phraseDuRefusDuFil);
  for (const dit of dits) assert.ok(dit.length > 20, dit);
  assert.equal(new Set(dits).size, dits.length);
  assert.equal(phraseDuRefusDuFil("inconnu"), "");
});

test("chaque étape se dit, pour que l'écran nomme où l'on en est", () => {
  for (const quoi of Object.values(ETAPE_DU_FIL)) {
    assert.ok(PHRASES_DES_ETAPES_DU_FIL[quoi]?.length > 0, quoi);
  }
});

/* ── Ce qu'on annonce avant de lire ───────────────────────────────────────── */

test("le bouton dit que les mails choisis n'en font qu'un fil", () => {
  // « Lire 7 mails » laisserait croire à sept lectures, donc à sept appels.
  assert.equal(leMotDuFilALire(1), "Lire 1 mail");
  assert.match(leMotDuFilALire(7), /7 mails en un fil/);
  assert.equal(leMotDuFilALire(0), "");
});
