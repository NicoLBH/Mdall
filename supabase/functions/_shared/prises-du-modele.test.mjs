import assert from "node:assert/strict";
import test from "node:test";

import {
  CONSIGNES, ECART, ECART_DE_NATURE, NATURE, PHRASES_DE_LECART_DUNE_PRISE, SCHEMA_DES_PRISES,
  ecarteesAuFormatDuMoteur, filEnTexte, laPartRelevee, leRenvoiVerifie, lesMessagesRendus,
  messagesEnPages, prisesAuFormatDuMoteur, verifierLesPrises
} from "./prises-du-modele.js";

// Aucun mail réel : les noms, les sociétés et les domaines sont inventés.
const MESSAGES = [
  {
    rang: 1, qui: "BERTRAND", quand: "2026-03-03T07:30:00.000Z",
    propos: "Rien n'a été relevé au droit de l'acrotère à ce jour."
  },
  {
    rang: 2, qui: "Ourdine Ferrand", quand: "2026-03-12T08:14:00.000Z",
    propos: "Le support est humide au droit de l'acrotère. Pouvez-vous confirmer la cote avant vendredi ?"
  },
  { rang: 3, qui: "Bureau VERIFAS", quand: "", propos: "" }
];

const prise = (dessus = {}) => ({
  nature: NATURE.CONSTAT,
  intitule: "le support est humide au droit de l'acrotère",
  message: 2,
  citation: "Le support est humide au droit de l'acrotère.",
  porte_sur: "humidité de l'acrotère",
  pour_qui: null,
  echeance: null,
  ...dessus
});

// ── Le fil tel qu'on le donne à lire ───────────────────────────────────────

test("chaque message porte son numéro, son auteur et sa date", () => {
  const lu = filEnTexte(MESSAGES);
  assert.ok(lu.includes("=== MESSAGE 1 — BERTRAND — 2026-03-03T07:30:00.000Z ==="));
  assert.ok(lu.includes("=== MESSAGE 2 — Ourdine Ferrand —"));
});

test("un message sans propos ne monte pas", () => {
  // Il n'a rien à relever, et l'envoyer ferait payer un jeton pour un en-tête.
  assert.equal(filEnTexte(MESSAGES).includes("MESSAGE 3"), false);
});

test("un message sans auteur ni date le dit, plutôt que de laisser un blanc", () => {
  const lu = filEnTexte([{ rang: 1, propos: "Le support est humide." }]);
  assert.ok(lu.includes("auteur inconnu"));
  assert.ok(lu.includes("date inconnue"));
});

test("le fil s'arrête au plafond de caractères", () => {
  const long = Array.from({ length: 50 }, (rien, rang) => ({
    rang: rang + 1, qui: "A", quand: "", propos: "x".repeat(100)
  }));
  assert.ok(filEnTexte(long, { maxCaracteres: 500 }).length < 700);
});

test("le fil devient des pages numérotées par le rang des messages", () => {
  assert.deepEqual(messagesEnPages(MESSAGES).map((page) => page.page), [1, 2]);
});

// ── La consigne ────────────────────────────────────────────────────────────

test("la consigne dit les cinq natures, et pas les deux qui se dérivent", () => {
  for (const nature of Object.values(NATURE)) assert.ok(CONSIGNES.includes(nature), nature);
  // Les faire déclarer par le modèle en ferait des inventions ; elles se
  // calculent sur le fil déplié, à l'étape 6.
  assert.equal(CONSIGNES.includes("sans-reponse"), false);
  assert.equal(CONSIGNES.includes("désaccord"), false);
});

test("la consigne interdit d'inventer l'auteur et la date", () => {
  // Ils sont lus dans les en-têtes du .eml. Une seconde source finirait par
  // contredire la première, et l'on croirait la mauvaise.
  assert.ok(CONSIGNES.includes("N'invente JAMAIS l'auteur ni la date"));
});

test("la consigne dit que la citation sera vérifiée", () => {
  assert.ok(CONSIGNES.includes("RECOPIÉE MOT POUR MOT"));
  assert.ok(CONSIGNES.includes("sera écartée"));
});

const UN_MESSAGE = SCHEMA_DES_PRISES.schema.properties.messages.items;
const UNE_PRISE = UN_MESSAGE.properties.prises.items;

test("le schéma demande des messages, qui portent des prises", () => {
  // **C'est la forme qui fait parler l'omission.** Une liste plate de prises
  // ne distingue pas « ce message ne porte rien » de « je n'ai rien dit de ce
  // message » ; ici, la première est une entrée à liste vide, et la seconde
  // est une entrée qui manque.
  assert.deepEqual([...Object.keys(UN_MESSAGE.properties)].sort(), ["message", "prises"]);
  assert.deepEqual([...UN_MESSAGE.required].sort(), ["message", "prises"]);
  assert.equal(SCHEMA_DES_PRISES.schema.properties.prises, undefined,
    "la liste plate ne doit plus exister : deux formes qui coexistent divergent");
});

test("le schéma ne demande ni l'auteur ni la date", () => {
  const champs = Object.keys(UNE_PRISE.properties);
  assert.equal(champs.includes("qui"), false);
  assert.equal(champs.includes("quand"), false);
  assert.deepEqual([...champs].sort(),
    ["citation", "echeance", "intitule", "nature", "porte_sur", "pour_qui", "repond_a"]);
});

test("le schéma demande à quel message une prise répond", () => {
  // **Le seul rapprochement vérifiable.** Le libellé de sujet, lui, est un mot
  // que le modèle écrit librement : deux fils réels ont montré que « rectification
  // de la pose d'étanchéité » et « reprise de la membrane » désignent la même
  // chose sans partager un mot.
  assert.deepEqual(UNE_PRISE.properties.repond_a.anyOf,
    [{ type: "integer" }, { type: "null" }]);
  assert.ok(UNE_PRISE.required.includes("repond_a"),
    "facultatif, il ne serait rendu que quand le modèle y pense");
});

test("le numéro du message ne se demande plus à la prise", () => {
  // Il vit sur le groupe, et une seule fois : le demander aussi à la prise
  // laisserait le modèle en annoncer deux différents, et il faudrait choisir
  // sans savoir (règle 10).
  assert.equal(UNE_PRISE.properties.message, undefined);
  assert.equal(UN_MESSAGE.properties.message.type, "integer");
});

test("le schéma ferme la liste des natures", () => {
  assert.deepEqual([...UNE_PRISE.properties.nature.enum].sort(),
    [...Object.values(NATURE)].sort());
});

// ── La porte : la nature ───────────────────────────────────────────────────

test("une nature hors de la liste n'entre pas", () => {
  // Une nature inventée est une colonne de plus à l'écran, sous laquelle des
  // prises réelles iraient se ranger sans qu'on sache d'où elle sort.
  const lu = verifierLesPrises({ prises: [prise({ nature: "remarque" })], messages: MESSAGES });
  assert.deepEqual(lu.retenues, []);
  assert.equal(lu.ecartees[0].motif, ECART_DE_NATURE);
});

test("les cinq natures entrent", () => {
  for (const nature of Object.values(NATURE)) {
    const lu = verifierLesPrises({ prises: [prise({ nature })], messages: MESSAGES });
    assert.equal(lu.retenues.length, 1, nature);
  }
});

// ── La porte : la citation ─────────────────────────────────────────────────

test("une citation qu'on retrouve dans son message passe", () => {
  const lu = verifierLesPrises({ prises: [prise()], messages: MESSAGES });
  assert.equal(lu.retenues.length, 1);
  assert.equal(lu.retenues[0].pageVerifiee, true);
  assert.deepEqual(lu.ecartees, []);
});

test("une citation inventée ne passe pas", () => {
  // Une prise inventée est plausible : « il faut reprendre le relevé » pourrait
  // figurer dans n'importe quel fil. Ce qui l'en distingue, c'est le message.
  const lu = verifierLesPrises({
    prises: [prise({ citation: "Il faut reprendre le relevé sur toute la longueur." })],
    messages: MESSAGES
  });
  assert.deepEqual(lu.retenues, []);
  assert.equal(lu.ecartees[0].motif, ECART.INTROUVABLE);
});

test("une prise sans citation ne passe pas non plus", () => {
  const lu = verifierLesPrises({ prises: [prise({ citation: "" })], messages: MESSAGES });
  assert.equal(lu.ecartees[0].motif, ECART.SANS_CITATION);
});

test("une prise sans intitulé ne porte rien à lire", () => {
  const lu = verifierLesPrises({ prises: [prise({ intitule: "  " })], messages: MESSAGES });
  assert.equal(lu.ecartees[0].motif, ECART.VIDE);
});

test("la typographie ne fait pas jeter une vraie citation", () => {
  // Une apostrophe courbe, une espace insécable, un accent : la citation est
  // exacte, et la rejeter ferait perdre une lecture juste.
  const lu = verifierLesPrises({
    prises: [prise({ citation: "Le support est humide au droit de l’acrotere." })],
    messages: MESSAGES
  });
  assert.equal(lu.retenues.length, 1);
});

test("une prise attribuée au mauvais message se rattache, et ça se compte", () => {
  // La prise est réelle — mais son auteur change, et c'est ce qui compte ici :
  // « BERTRAND affirme » et « Ourdine Ferrand affirme » ne sont pas la même
  // information.
  const lu = verifierLesPrises({ prises: [prise({ message: 1 })], messages: MESSAGES });
  assert.equal(lu.retenues.length, 1);
  assert.equal(lu.retenues[0].pageVerifiee, false);
  assert.equal(lu.retenues[0].page, 2);
  assert.equal(lu.messagesCorriges, 1);
});

test("un fil sans message ne retient rien", () => {
  assert.deepEqual(verifierLesPrises({ prises: [prise()], messages: [] }).retenues, []);
  assert.deepEqual(verifierLesPrises({}).retenues, []);
});

// ── La forme que l'écran attend ────────────────────────────────────────────

test("l'auteur et la date viennent du message, pas du modèle", () => {
  const { retenues } = verifierLesPrises({ prises: [prise()], messages: MESSAGES });
  const [rendue] = prisesAuFormatDuMoteur(retenues, { filId: "toiture", messages: MESSAGES });
  assert.equal(rendue.qui, "Ourdine Ferrand");
  assert.equal(rendue.quand, "2026-03-12T08:14:00.000Z");
});

test("une prise rattachée ailleurs prend l'auteur du message où elle est vraiment", () => {
  const { retenues } = verifierLesPrises({ prises: [prise({ message: 1 })], messages: MESSAGES });
  const [rendue] = prisesAuFormatDuMoteur(retenues, { messages: MESSAGES });
  assert.equal(rendue.qui, "Ourdine Ferrand");
  assert.equal(rendue.messageVerifie, false);
});

test("un message sans date rend une prise sans date, et non une date inventée", () => {
  const sansDate = [{ rang: 1, qui: "BERTRAND", quand: "", propos: "Le support est humide." }];
  const { retenues } = verifierLesPrises({
    prises: [prise({ message: 1, citation: "Le support est humide." })], messages: sansDate
  });
  const [rendue] = prisesAuFormatDuMoteur(retenues, { messages: sansDate });
  assert.equal(rendue.quand, null);
});

test("la clé distingue deux prises d'un même message, et se refait à l'identique", () => {
  const deux = [prise(), prise({ nature: NATURE.DEMANDE, intitule: "confirmer la cote" })];
  const { retenues } = verifierLesPrises({ prises: deux, messages: MESSAGES });
  const cles = prisesAuFormatDuMoteur(retenues, { filId: "toiture", messages: MESSAGES })
    .map((rendue) => rendue.key);
  assert.equal(new Set(cles).size, 2);
  assert.deepEqual(
    prisesAuFormatDuMoteur(retenues, { filId: "toiture", messages: MESSAGES }).map((r) => r.key),
    cles
  );
});

test("deux prises identiques d'un même message portent la même empreinte", () => {
  const { retenues } = verifierLesPrises({ prises: [prise(), prise()], messages: MESSAGES });
  const rendues = prisesAuFormatDuMoteur(retenues, { messages: MESSAGES });
  assert.equal(rendues[0].empreinte, rendues[1].empreinte);
  assert.notEqual(rendues[0].key, rendues[1].key);
});

test("les champs vides sortent à null, et non en chaîne vide", () => {
  const { retenues } = verifierLesPrises({ prises: [prise()], messages: MESSAGES });
  const [rendue] = prisesAuFormatDuMoteur(retenues, { messages: MESSAGES });
  assert.equal(rendue.pourQui, null);
  assert.equal(rendue.echeance, null);
  assert.equal(rendue.porteSur, "humidité de l'acrotère");
});

// ── Le compte, message par message ─────────────────────────────────────────

test("la consigne réclame une entrée par message, y compris vide", () => {
  assert.ok(CONSIGNES.includes("une entrée PAR MESSAGE"));
  assert.ok(CONSIGNES.includes("tu n'en sautes AUCUN"));
  assert.ok(CONSIGNES.includes("liste de prises vide"));
});

test("le rang du groupe descend dans chacune de ses prises", () => {
  // La prise ne porte plus son numéro : si le groupe ne le lui donne pas, la
  // porte ne saura pas dans quel message chercher, et tout ressortira
  // « rattaché ailleurs ».
  const { prises } = lesMessagesRendus({
    messages: [{ message: 2, prises: [prise({ message: undefined })] }]
  }, MESSAGES);
  assert.equal(prises.length, 1);
  assert.equal(prises[0].message, 2);
});

test("un message déclaré sans prise est muet, et se nomme", () => {
  const compte = lesMessagesRendus({
    messages: [{ message: 1, prises: [] }, { message: 2, prises: [prise()] }]
  }, MESSAGES);
  assert.deepEqual(compte.muets, [1]);
  assert.deepEqual(compte.oublies, []);
  assert.equal(compte.parMessage, true);
});

test("un message dont le modèle n'a rien dit est oublié, et ce n'est pas la même chose", () => {
  // C'est ce que l'étape achète : sur une liste plate, ce message-ci et un
  // message muet se ressemblaient trait pour trait.
  const compte = lesMessagesRendus({
    messages: [{ message: 2, prises: [prise()] }]
  }, MESSAGES);
  assert.deepEqual(compte.muets, []);
  assert.deepEqual(compte.oublies, [1], "le message 1 n'a pas été rendu");
});

test("un message sans propos n'est pas attendu, et ne manque donc pas", () => {
  // Le troisième message du fil ne porte rien : on ne l'a pas donné à lire, et
  // reprocher au modèle de n'en rien dire serait lui reprocher notre silence.
  const compte = lesMessagesRendus({ messages: [{ message: 1, prises: [] }] }, MESSAGES);
  assert.equal(compte.oublies.includes(3), false);
  assert.deepEqual(compte.oublies, [2]);
});

test("une réponse qui n'a pas cette forme est lue, mais on ne prétend pas savoir", () => {
  // La jeter perdrait des prises réelles ; compter zéro muet et zéro oublié
  // affirmerait une lecture complète qui n'a pas eu lieu (règle 5).
  const compte = lesMessagesRendus({ prises: [prise()] }, MESSAGES);
  assert.equal(compte.prises.length, 1);
  assert.equal(compte.parMessage, false);
  assert.equal(compte.muets, null);
  assert.equal(compte.oublies, null);
});

test("un groupe sans numéro lisible ne compte pour aucun message", () => {
  const compte = lesMessagesRendus({
    messages: [{ message: "deux", prises: [prise()] }, { message: 1, prises: [] }]
  }, MESSAGES);
  assert.deepEqual(compte.muets, [1]);
  assert.deepEqual(compte.oublies, [2], "le message 2 reste sans réponse");
});

test("un groupe sans numéro lisible ne fait pas perdre ses prises", () => {
  // Jeter une prise réelle parce que l'en-tête de son groupe est abîmé
  // coûterait plus cher que de la replacer : la porte sait chercher sa
  // citation dans tout le fil.
  const { prises } = lesMessagesRendus({
    messages: [{ message: null, prises: [prise({ message: undefined })] }]
  }, MESSAGES);
  assert.equal(prises.length, 1);
  assert.equal(prises[0].message, null);

  const { retenues } = verifierLesPrises({ prises, messages: MESSAGES });
  const [rendue] = prisesAuFormatDuMoteur(retenues, { messages: MESSAGES });
  assert.equal(rendue.message, 2, "la citation a dit où elle vivait");
  assert.equal(rendue.qui, "Ourdine Ferrand");
  assert.equal(rendue.messageVerifie, false, "et cela ne se tait pas");
});

test("un groupe sans numéro lisible ne déclare aucun message muet", () => {
  // Il n'a pas dit qu'un message ne portait rien : il n'a pas dit de quel
  // message il parlait. Ce n'est pas une lecture (règle 5).
  const compte = lesMessagesRendus({ messages: [{ message: "deux", prises: [] }] }, MESSAGES);
  assert.deepEqual(compte.muets, []);
  assert.deepEqual(compte.oublies, [1, 2]);
});

// ── Ce qui a été écarté, dit en clair ──────────────────────────────────────

test("une écartée ressort avec son intitulé et la citation refusée", () => {
  // Un compte seul ne dit pas si la porte a protégé ou si elle a jeté.
  const inventee = prise({ citation: "Le chantier est arrêté depuis mardi." });
  const { ecartees } = verifierLesPrises({ prises: [inventee], messages: MESSAGES });
  const [dite] = ecarteesAuFormatDuMoteur(ecartees);

  assert.equal(dite.motif, ECART.INTROUVABLE);
  assert.equal(dite.intitule, "le support est humide au droit de l'acrotère");
  assert.equal(dite.citation, "Le chantier est arrêté depuis mardi.");
  assert.equal(dite.nature, NATURE.CONSTAT);
  assert.equal(dite.message, 2);
});

test("le motif descend en clair, et parle de messages, pas d'un document", () => {
  // Les phrases du garde-fou commun parlent d'un « document » : ici il n'y en
  // a pas, et l'envoyer chercher un PDF est une fausse piste.
  const { ecartees } = verifierLesPrises({
    prises: [prise({ nature: "plainte" })], messages: MESSAGES
  });
  const [dite] = ecarteesAuFormatDuMoteur(ecartees);
  assert.equal(dite.motif, ECART_DE_NATURE);
  assert.equal(dite.phrase, PHRASES_DE_LECART_DUNE_PRISE[ECART_DE_NATURE]);
  assert.equal(dite.phrase.includes("document"), false);
});

test("chaque motif possible a sa phrase, et aucune ne parle d'un document", () => {
  // Une écartée sans phrase ne dit plus rien de pourquoi elle l'a été. Et une
  // phrase qui parle d'un « document » — celle du garde-fou commun — enverrait
  // chercher un PDF là où il n'y a que des messages.
  for (const motif of [...Object.values(ECART), ECART_DE_NATURE]) {
    const phrase = PHRASES_DE_LECART_DUNE_PRISE[motif];
    assert.ok(phrase, `pas de phrase pour ${motif}`);
    assert.equal(phrase.includes("document"), false, `${motif} parle d'un document`);
  }
  assert.ok(PHRASES_DE_LECART_DUNE_PRISE[ECART.INTROUVABLE].includes("message"));
  assert.ok(PHRASES_DE_LECART_DUNE_PRISE[ECART.SANS_CITATION].includes("message"));
});

test("une écartée sans intitulé ne perd pas sa citation", () => {
  const { ecartees } = verifierLesPrises({
    prises: [prise({ intitule: "" })], messages: MESSAGES
  });
  const [dite] = ecarteesAuFormatDuMoteur(ecartees);
  assert.equal(dite.motif, ECART.VIDE);
  assert.equal(dite.citation, "Le support est humide au droit de l'acrotère.");
});

// ── Le renvoi, confronté au fil ────────────────────────────────────────────

const RANGS = new Set([1, 2]);

test("un renvoi vers un message antérieur du fil tient", () => {
  assert.equal(leRenvoiVerifie({ repond_a: 1, message: 2 }, RANGS), 1);
});

test("un renvoi vers un message qui n'existe pas ne tient pas", () => {
  // On ne sait pas ce qu'il visait : le corriger serait deviner.
  assert.equal(leRenvoiVerifie({ repond_a: 9, message: 2 }, RANGS), null);
});

test("un renvoi vers un trou du fil ne tient pas non plus", () => {
  // **Le cas qui échappe à la seule vérification de l'ordre.** Un message sans
  // propos n'est pas donné à lire : son rang manque au milieu du fil, et un
  // renvoi qui le vise est antérieur sans exister pour autant.
  const avecUnTrou = new Set([1, 3]);
  assert.equal(leRenvoiVerifie({ repond_a: 2, message: 3 }, avecUnTrou), null);
  assert.equal(leRenvoiVerifie({ repond_a: 0, message: 3 }, avecUnTrou), null);
  assert.equal(leRenvoiVerifie({ repond_a: 1, message: 3 }, avecUnTrou), 1);
});

test("une réponse ne précède pas sa question", () => {
  assert.equal(leRenvoiVerifie({ repond_a: 2, message: 1 }, RANGS), null);
  assert.equal(leRenvoiVerifie({ repond_a: 2, message: 2 }, RANGS), null,
    "ni ne se répond à elle-même");
});

test("une prise sans renvoi n'en reçoit pas", () => {
  assert.equal(leRenvoiVerifie({ repond_a: null, message: 2 }, RANGS), null);
  assert.equal(leRenvoiVerifie({ repond_a: "un", message: 2 }, RANGS), null);
  assert.equal(leRenvoiVerifie({}, RANGS), null);
});

test("un renvoi qui tient descend avec la prise, et se compte s'il tombe", () => {
  const bonne = prise({ repond_a: 1 });
  const mauvaise = prise({ repond_a: 7, intitule: "le support a été repris" });
  const lu = verifierLesPrises({ prises: [bonne, mauvaise], messages: MESSAGES });
  assert.equal(lu.renvoisEcartes, 1);

  const rendues = prisesAuFormatDuMoteur(lu.retenues, { messages: MESSAGES });
  assert.deepEqual(rendues.map((une) => une.repondA), [1, null]);
});

test("la consigne dit que le renvoi sera vérifié, et ce qu'un renvoi inventé coûte", () => {
  assert.ok(CONSIGNES.includes("`repond_a`"));
  assert.ok(CONSIGNES.includes("STRICTEMENT INFÉRIEUR"));
  assert.ok(CONSIGNES.includes("question restée sans réponse"));
});

// ── Ce qu'une citation reprend d'un message ────────────────────────────────

test("la part relevée se compte sur ce qui se retrouve vraiment", () => {
  const part = laPartRelevee(MESSAGES, [
    { message: 2, citation: "Le support est humide au droit de l'acrotère." },
    { message: 2, citation: "Le chantier est arrêté." }
  ]);
  const deux = part.find((une) => une.message === 2);
  assert.equal(deux.couverts, 45, "la citation inventée ne couvre rien");
  assert.ok(deux.caracteres > deux.couverts);
});

test("deux prises tirées de la même phrase ne la comptent qu'une fois", () => {
  // Sinon un message court et deux prises jumelles afficheraient plus de cent
  // pour cent, et le chiffre cesserait de vouloir dire quelque chose.
  const citation = "Le support est humide au droit de l'acrotère.";
  const [deux] = laPartRelevee(MESSAGES, [
    { message: 2, citation }, { message: 2, citation }
  ]).filter((une) => une.message === 2);
  assert.equal(deux.couverts, 45);
});

test("un message sans propos ne se compte pas", () => {
  // Le troisième message du fil ne porte rien : une part sur zéro n'existe pas.
  assert.equal(laPartRelevee(MESSAGES, []).some((une) => une.message === 3), false);
});

test("un message dont rien n'a été tiré se compte à zéro, et non pas du tout", () => {
  // C'est l'écart qu'on veut voir : un message présent, et couvert à rien.
  const un = laPartRelevee(MESSAGES, []).find((une) => une.message === 1);
  assert.equal(un.couverts, 0);
  assert.ok(un.caracteres > 0);
});
