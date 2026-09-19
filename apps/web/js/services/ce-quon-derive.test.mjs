import assert from "node:assert/strict";
import test from "node:test";

import {
  POLARITE, SUITE, ceQuonDerive, laSuiteDuneDemande, lesOppositions, memeSujet, polariteDe
} from "./ce-quon-derive.js";
import { NATURE } from "./prises-de-position.js";

// Aucun mail réel : les noms et les sociétés sont inventés.
let compteur = 0;
const prise = (dessus = {}) => {
  compteur += 1;
  return {
    key: `prise:${compteur}`, nature: NATURE.CONSTAT, intitule: "le support est humide",
    porteSur: "humidité de l'acrotère", message: 1, citation: "Le support est humide.",
    qui: "Ourdine Ferrand", quand: "2026-03-12T08:14:00.000Z",
    pourQui: null, echeance: null, messageVerifie: true, ...dessus
  };
};

const demande = (dessus = {}) => prise({ nature: NATURE.DEMANDE, intitule: "confirmer la cote", ...dessus });

// ── Le même sujet ──────────────────────────────────────────────────────────

test("les accents, la casse et les espaces ne font pas deux sujets", () => {
  assert.equal(memeSujet("Humidité de l'acrotère", "humidite  de l'acrotere"), true);
});

test("deux sujets voisins restent deux sujets", () => {
  // Chercher des synonymes rapprocherait des sujets voisins, et rendrait des
  // désaccords qui n'en sont pas.
  assert.equal(memeSujet("humidité de l'acrotère", "humidité du seuil"), false);
});

test("un sujet vide ne ressemble à rien, pas même à un autre sujet vide", () => {
  assert.equal(memeSujet("", ""), false);
  assert.equal(memeSujet(null, null), false);
});

// ── Affirmer ou nier ───────────────────────────────────────────────────────

test("une négation en deux morceaux se reconnaît", () => {
  assert.equal(polariteDe("Rien n'a été relevé au droit de l'acrotère."), POLARITE.NIE);
  assert.equal(polariteDe("Nous n'avons pas constaté d'humidité."), POLARITE.NIE);
  assert.equal(polariteDe("Le support n'est jamais resté humide."), POLARITE.NIE);
});

test("un mot qui nie à lui seul suffit", () => {
  assert.equal(polariteDe("Aucune trace d'humidité au droit de l'acrotère."), POLARITE.NIE);
  assert.equal(polariteDe("Reprise sans réserve."), POLARITE.NIE);
});

test("« pas » tout seul n'est pas une négation", () => {
  // « le pas de vis », « un pas de plus » : la première moitié de la négation
  // lève le doute, et l'exiger évite d'inventer un désaccord.
  assert.equal(polariteDe("Le pas de vis est conforme."), POLARITE.AFFIRME);
});

test("une affirmation reste une affirmation", () => {
  assert.equal(polariteDe("Le support est humide au droit de l'acrotère."), POLARITE.AFFIRME);
  assert.equal(polariteDe(""), POLARITE.AFFIRME);
});

// ── Une demande, et ce qu'elle devient ─────────────────────────────────────

test("un constat postérieur sur la même chose répond à la demande", () => {
  const question = demande({ message: 1 });
  const reponse = prise({ message: 2, qui: "BERTRAND" });
  const lue = laSuiteDuneDemande(question, [question, reponse], { dernierMessage: 2 });
  assert.equal(lue.suite, SUITE.REPONDUE);
  assert.equal(lue.parQuoi, reponse);
});

test("une décision ou un engagement répondent aussi", () => {
  for (const nature of [NATURE.DECISION, NATURE.ENGAGEMENT]) {
    const question = demande({ message: 1 });
    const reponse = prise({ nature, message: 2 });
    assert.equal(laSuiteDuneDemande(question, [question, reponse]).suite, SUITE.REPONDUE, nature);
  }
});

test("une autre demande sur la même chose est une relance, pas une réponse", () => {
  // Elle prouve plutôt le contraire.
  const question = demande({ message: 1 });
  const relance = demande({ message: 3 });
  assert.equal(laSuiteDuneDemande(question, [question, relance]).suite, SUITE.SANS_REPONSE);
});

test("une source ne répond pas : elle fonde, elle ne tranche pas", () => {
  const question = demande({ message: 1 });
  const source = prise({ nature: NATURE.SOURCE, message: 2 });
  assert.equal(laSuiteDuneDemande(question, [question, source]).suite, SUITE.SANS_REPONSE);
});

test("un constat antérieur ne répond pas à une demande postérieure", () => {
  // Le temps ne remonte pas : répondre avant d'avoir été interrogé n'est pas
  // répondre.
  const reponse = prise({ message: 1 });
  const question = demande({ message: 3 });
  assert.equal(laSuiteDuneDemande(question, [reponse, question]).suite, SUITE.SANS_REPONSE);
});

test("un constat sur autre chose ne répond pas", () => {
  const question = demande({ message: 1 });
  const ailleurs = prise({ message: 2, porteSur: "cote du seuil" });
  assert.equal(laSuiteDuneDemande(question, [question, ailleurs]).suite, SUITE.SANS_REPONSE);
});

test("une demande sans sujet ne se juge pas, et ne se déclare pas sans réponse", () => {
  // Ne pas savoir n'autorise pas à prétendre qu'il n'y a rien.
  const question = demande({ message: 1, porteSur: null });
  const lue = laSuiteDuneDemande(question, [question, prise({ message: 2 })]);
  assert.equal(lue.suite, SUITE.ON_NE_SAIT_PAS);
  assert.notEqual(lue.suite, SUITE.SANS_REPONSE);
});

test("une demande dans le dernier message dit que le fil s'arrête là", () => {
  // Elle n'a pas été ignorée : personne n'a encore eu le temps de l'ignorer.
  const question = demande({ message: 4 });
  const lue = laSuiteDuneDemande(question, [question], { dernierMessage: 4 });
  assert.equal(lue.suite, SUITE.SANS_REPONSE);
  assert.equal(lue.apresElle, 0);
});

test("une demande suivie de trois messages le dit aussi", () => {
  const question = demande({ message: 1 });
  assert.equal(laSuiteDuneDemande(question, [question], { dernierMessage: 4 }).apresElle, 3);
});

// ── Deux constats qui semblent se contredire ───────────────────────────────

const AFFIRME = () => prise({
  qui: "Ourdine Ferrand", message: 2, intitule: "le support est humide au droit de l'acrotère"
});
const NIE = () => prise({
  qui: "BERTRAND", message: 1, intitule: "rien n'a été relevé au droit de l'acrotère"
});

test("deux constats opposés sur la même chose se signalent", () => {
  const lues = lesOppositions([AFFIRME(), NIE()]);
  assert.equal(lues.length, 1);
  assert.equal(lues[0].porteSur, "humidité de l'acrotère");
  assert.equal(lues[0].positions.length, 2);
});

test("deux constats du même auteur ne font pas un désaccord", () => {
  // C'est une précision, ou un changement d'avis. Ce n'est pas la même chose.
  const lues = lesOppositions([AFFIRME(), { ...NIE(), qui: "Ourdine Ferrand" }]);
  assert.deepEqual(lues, []);
});

test("deux constats qui affirment la même chose ne se contredisent pas", () => {
  assert.deepEqual(lesOppositions([AFFIRME(), { ...AFFIRME(), qui: "BERTRAND" }]), []);
});

test("deux constats sur des sujets différents ne se contredisent pas", () => {
  assert.deepEqual(lesOppositions([AFFIRME(), { ...NIE(), porteSur: "cote du seuil" }]), []);
});

test("une demande et un constat opposés ne font pas un désaccord", () => {
  // Le désaccord est entre deux constats : une demande n'affirme rien.
  assert.deepEqual(lesOppositions([AFFIRME(), { ...NIE(), nature: NATURE.DEMANDE }]), []);
});

test("un constat sans sujet ne peut se contredire avec rien", () => {
  assert.deepEqual(lesOppositions([AFFIRME(), { ...NIE(), porteSur: "" }]), []);
});

test("une même paire ne sort qu'une fois", () => {
  const lues = lesOppositions([AFFIRME(), NIE(), { ...NIE(), qui: "Bureau VERIFAS" }]);
  // Deux négations contre une affirmation : deux paires, pas quatre.
  assert.equal(lues.length, 2);
});

// ── Tout ensemble ──────────────────────────────────────────────────────────

test("une demande sans réponse change de nature et quitte les demandes", () => {
  // Une seule ligne, dans la rubrique qui compte : la montrer deux fois ferait
  // lire deux fois le même fait.
  const question = demande({ message: 1 });
  const derive = ceQuonDerive([question], { dernierMessage: 3 });
  assert.equal(derive.sansReponse, 1);
  assert.deepEqual(derive.prises.map((prise) => prise.nature), [NATURE.SANS_REPONSE]);
  assert.equal(derive.prises[0].natureDeclaree, NATURE.DEMANDE);
});

test("une demande répondue reste une demande, et dit par quoi", () => {
  const question = demande({ message: 1 });
  const reponse = prise({ message: 2 });
  const derive = ceQuonDerive([question, reponse]);
  assert.equal(derive.sansReponse, 0);
  assert.equal(derive.prises[0].nature, NATURE.DEMANDE);
  assert.equal(derive.prises[0].suite, SUITE.REPONDUE);
  assert.equal(derive.prises[0].repondueParLaCle, reponse.key);
});

test("une demande qu'on ne sait pas juger se compte à part", () => {
  const derive = ceQuonDerive([demande({ porteSur: null })]);
  assert.equal(derive.indecidables, 1);
  assert.equal(derive.sansReponse, 0);
  assert.equal(derive.prises[0].nature, NATURE.DEMANDE);
  assert.equal(derive.prises[0].suite, SUITE.ON_NE_SAIT_PAS);
});

test("un désaccord s'ajoute sans retirer les constats dont il sort", () => {
  // Un constat reste vrai pour son auteur ; le désaccord est une observation
  // sur la paire, pas un remplacement.
  const derive = ceQuonDerive([AFFIRME(), NIE()]);
  assert.equal(derive.desaccords, 1);
  assert.equal(derive.prises.length, 3);
  assert.equal(derive.prises.filter((prise) => prise.nature === NATURE.CONSTAT).length, 2);
});

test("un désaccord porte les deux positions et leurs citations", () => {
  const derive = ceQuonDerive([AFFIRME(), NIE()]);
  const desaccord = derive.prises.find((prise) => prise.nature === NATURE.DESACCORD);
  assert.equal(desaccord.intitule, "humidité de l'acrotère");
  assert.deepEqual(desaccord.positions.map((position) => position.qui),
    ["Ourdine Ferrand", "BERTRAND"]);
  assert.ok(desaccord.positions.every((position) => position.citation));
});

test("un désaccord se date du plus tardif des deux : c'est là qu'il apparaît", () => {
  const derive = ceQuonDerive([AFFIRME(), NIE()]);
  const desaccord = derive.prises.find((prise) => prise.nature === NATURE.DESACCORD);
  assert.equal(desaccord.message, 2);
});

test("un désaccord ne s'attribue à personne", () => {
  // Il n'est de personne : il est entre deux personnes.
  const derive = ceQuonDerive([AFFIRME(), NIE()]);
  const desaccord = derive.prises.find((prise) => prise.nature === NATURE.DESACCORD);
  assert.equal(desaccord.qui, null);
});

test("deux désaccords sur le même sujet portent des clés différentes", () => {
  const derive = ceQuonDerive([AFFIRME(), NIE(), { ...NIE(), qui: "Bureau VERIFAS" }]);
  const cles = derive.prises.filter((prise) => prise.nature === NATURE.DESACCORD).map((prise) => prise.key);
  assert.equal(new Set(cles).size, 2);
});

test("un fil sans rien à dériver ne dérive rien", () => {
  // Une dérivation qui trouve toujours quelque chose vaut autant qu'une
  // dérivation qui ne trouve jamais rien.
  const derive = ceQuonDerive([prise(), prise({ nature: NATURE.SOURCE })]);
  assert.equal(derive.sansReponse, 0);
  assert.equal(derive.desaccords, 0);
  assert.equal(derive.indecidables, 0);
  assert.equal(derive.prises.length, 2);
});

test("rien à dériver sur rien", () => {
  assert.deepEqual(ceQuonDerive([]).prises, []);
  assert.deepEqual(ceQuonDerive(null).prises, []);
});

test("le dernier message se déduit des prises quand on ne le dit pas", () => {
  // Une demande au message 1, une prise au message 5 : le fil va jusqu'à 5,
  // et quatre messages suivent la demande sans la reprendre. Sans la
  // déduction, on dirait qu'aucun ne la suit — ce qui est faux.
  const question = demande({ message: 1 });
  const ailleurs = prise({ message: 5, porteSur: "cote du seuil" });
  const derive = ceQuonDerive([question, ailleurs]);
  assert.equal(derive.prises[0].apresElle, 4);
});

test("la dérivation ne touche pas aux prises qu'elle laisse passer", () => {
  const constat = prise();
  assert.deepEqual(ceQuonDerive([constat]).prises[0], constat);
});
