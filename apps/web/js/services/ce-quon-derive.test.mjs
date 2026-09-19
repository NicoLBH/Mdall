import assert from "node:assert/strict";
import test from "node:test";

import {
  MARQUE, SUITE, ceQuonDerive, laMarqueDeContestation, laSuiteDuneDemande, lesContestations, memeSujet
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

// ── Une marque de contestation ─────────────────────────────────────────────

test("prendre position contre le dire de l'autre se reconnaît", () => {
  assert.equal(laMarqueDeContestation({ intitule: "je ne partage pas votre position" }),
    MARQUE.NE_PARTAGE_PAS);
  assert.equal(laMarqueDeContestation({ intitule: "votre appréciation est notée" }),
    MARQUE.VOTRE_POSITION);
  assert.equal(laMarqueDeContestation({ intitule: "hypothèse non conforme aux combinaisons" }),
    MARQUE.PAS_RECEVABLE);
  assert.equal(laMarqueDeContestation({ intitule: "le maintien de cet avis paraît disproportionné" }),
    MARQUE.DISPROPORTIONNE);
  assert.equal(laMarqueDeContestation({ intitule: "vous indiquiez vous-même le contraire" }),
    MARQUE.RETOURNE_CONTRE);
});

test("la marque se cherche aussi dans la citation, et pas seulement dans l'intitulé", () => {
  // L'intitulé est du modèle, la citation est de l'auteur : la marque peut
  // tomber d'un côté comme de l'autre, et n'en lire qu'un en perdrait la moitié.
  assert.equal(
    laMarqueDeContestation({
      intitule: "cote du seuil",
      citation: "Je ne partage pas votre position sur ce point."
    }),
    MARQUE.NE_PARTAGE_PAS
  );
});

test("nier un fait n'est pas contester ce que l'autre a dit", () => {
  // C'est tout l'écart avec la première version : « le support n'est pas sec »
  // nie un fait, et un fil réel a rendu quatre-vingt-seize désaccords sur ce
  // seul critère, dont pas un n'en était un.
  assert.equal(laMarqueDeContestation({ intitule: "le support n'est pas sec" }), "");
  assert.equal(laMarqueDeContestation({ intitule: "aucune reprise n'a été faite" }), "");
  assert.equal(laMarqueDeContestation({ intitule: "rien n'a été relevé au droit de l'acrotère" }), "");
});

test("les accents et la casse ne cachent pas une marque", () => {
  assert.equal(laMarqueDeContestation({ intitule: "VOTRE APPRÉCIATION" }), MARQUE.VOTRE_POSITION);
  assert.equal(laMarqueDeContestation({ intitule: "non-conformé" }), MARQUE.PAS_RECEVABLE);
});

test("une prise sans mot ne porte aucune marque", () => {
  assert.equal(laMarqueDeContestation({}), "");
  assert.equal(laMarqueDeContestation(null), "");
});

// ── Ce qu'une demande devient ──────────────────────────────────────────────

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

const CONTESTE = () => prise({
  qui: "Ourdine Ferrand", message: 2,
  intitule: "je ne partage pas votre position sur la cote",
  citation: "Je ne partage pas votre position sur la cote."
});
const ANTERIEUR = () => prise({ qui: "BERTRAND", message: 1 });

test("une prise qui prend position contre se signale", () => {
  const lues = lesContestations([ANTERIEUR(), CONTESTE()]);
  assert.equal(lues.length, 1);
  assert.equal(lues[0].marque, MARQUE.NE_PARTAGE_PAS);
  assert.equal(lues[0].prise.message, 2);
});

test("une prise qui n'en conteste aucune ne se signale pas", () => {
  // Le pendant : une règle qui trouve toujours quelque chose ne dit rien.
  assert.deepEqual(lesContestations([ANTERIEUR(), prise({ qui: "Ourdine Ferrand", message: 2 })]), []);
});

test("une contestation sans sujet ne se rend pas", () => {
  // Sans `porteSur`, on ne peut dire ni sur quoi elle porte ni qui s'était
  // exprimé avant : la rendre serait rendre une phrase sans son contexte.
  assert.deepEqual(lesContestations([{ ...CONTESTE(), porteSur: "" }]), []);
});

test("une demande peut contester autant qu'un constat", () => {
  // « Ne pas maintenir cet avis défavorable » est une demande, et c'est la
  // forme même du litige sur un fil réel.
  const lues = lesContestations([{ ...CONTESTE(), nature: NATURE.DEMANDE }]);
  assert.equal(lues.length, 1);
});

test("la contestation dit qui s'était exprimé avant elle sur le même sujet", () => {
  const [lue] = lesContestations([ANTERIEUR(), CONTESTE()]);
  assert.deepEqual(lue.avant, ["BERTRAND"]);
});

test("deux affichages d'une même personne ne la rapprochent pas d'elle-même", () => {
  // Le pendant de l'épreuve précédente : sans clé, deux affichages voisins
  // — « Ourdine Ferrand » et « ourdine ferrand » — passeraient pour deux
  // personnes, et l'on rendrait un désaccord de quelqu'un avec lui-même.
  const [lue] = lesContestations([
    { ...prise({ message: 1 }), qui: "ourdine ferrand", quiCle: "o.ferrand@novaclim.example" },
    { ...CONTESTE(), qui: "Ourdine Ferrand", quiCle: "autre@novaclim.example" }
  ]);
  assert.deepEqual(lue.avant, ["ourdine ferrand"],
    "deux clés différentes font deux personnes, quoi que dise l'affichage");
});

test("elle ne compte pas son propre auteur parmi ceux d'avant", () => {
  // On ne se contredit pas soi-même : c'est une précision, ou un changement
  // d'avis.
  const [lue] = lesContestations([prise({ qui: "Ourdine Ferrand", message: 1 }), CONTESTE()]);
  assert.deepEqual(lue.avant, []);
});

test("une même personne sous deux affichages ne fait pas deux personnes", () => {
  // Un fil réel a porté deux personnes sous quatre identités, et l'une s'est
  // retrouvée en désaccord avec elle-même.
  // Les deux affichages diffèrent vraiment — « O. Ferrand » n'est pas
  // « Ourdine Ferrand » : c'est la clé, et elle seule, qui les rapproche.
  const [lue] = lesContestations([
    { ...prise({ message: 1 }), qui: "O. Ferrand", quiCle: "o.ferrand@novaclim.example" },
    { ...CONTESTE(), qui: "Ourdine Ferrand", quiCle: "o.ferrand@novaclim.example" }
  ]);
  assert.deepEqual(lue.avant, []);
});

test("un auteur qui a parlé deux fois avant n'est nommé qu'une fois", () => {
  const [lue] = lesContestations([ANTERIEUR(), ANTERIEUR(), CONTESTE()]);
  assert.deepEqual(lue.avant, ["BERTRAND"]);
});

test("ce qui vient après la contestation n'est pas ce qu'elle conteste", () => {
  const [lue] = lesContestations([CONTESTE(), prise({ qui: "BERTRAND", message: 5 })]);
  assert.deepEqual(lue.avant, []);
});

test("un autre sujet n'est pas ce qu'elle conteste", () => {
  const [lue] = lesContestations([
    { ...ANTERIEUR(), porteSur: "cote du seuil" }, CONTESTE()
  ]);
  assert.deepEqual(lue.avant, []);
});

test("personne avant elle se dit, et ne s'invente pas", () => {
  // Une contestation peut viser un rapport plutôt qu'un message du fil : c'est
  // le cas réel, et nommer au jugé prêterait à quelqu'un un propos qu'il n'a
  // pas tenu (règle 5).
  const [lue] = lesContestations([CONTESTE()]);
  assert.deepEqual(lue.avant, []);
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

test("une prise qui conteste change de nature et ne se dédouble pas", () => {
  // La laisser aussi dans sa rubrique d'origine ferait lire deux fois la même
  // phrase, et l'on chercherait en quoi les deux diffèrent.
  const derive = ceQuonDerive([ANTERIEUR(), CONTESTE()]);
  assert.equal(derive.desaccords, 1);
  assert.equal(derive.prises.length, 2);
  assert.deepEqual(derive.prises.map((prise) => prise.nature),
    [NATURE.CONSTAT, NATURE.DESACCORD]);
});

test("un désaccord garde les mots de celui qui conteste", () => {
  const derive = ceQuonDerive([ANTERIEUR(), CONTESTE()]);
  const desaccord = derive.prises.find((prise) => prise.nature === NATURE.DESACCORD);
  assert.equal(desaccord.qui, "Ourdine Ferrand");
  assert.equal(desaccord.positions.length, 1);
  assert.equal(desaccord.positions[0].citation, "Je ne partage pas votre position sur la cote.");
  assert.deepEqual(desaccord.avant, ["BERTRAND"]);
});

test("un désaccord dit ce qu'il était et quelle marque a parlé", () => {
  // Rien n'est masqué : la nature a changé, pas le fait — et la règle se juge
  // sur pièce.
  const derive = ceQuonDerive([{ ...CONTESTE(), nature: NATURE.DEMANDE }]);
  const [desaccord] = derive.prises;
  assert.equal(desaccord.natureDeclaree, NATURE.DEMANDE);
  assert.equal(desaccord.marque, MARQUE.NE_PARTAGE_PAS);
});

test("une contestation l'emporte sur le jugement d'une demande", () => {
  // Une demande qui conteste n'est pas d'abord une demande sans réponse : ce
  // qu'elle porte, c'est le désaccord.
  const derive = ceQuonDerive([{ ...CONTESTE(), nature: NATURE.DEMANDE }], { dernierMessage: 9 });
  assert.equal(derive.sansReponse, 0);
  assert.equal(derive.desaccords, 1);
});

test("deux contestations portent des clés différentes", () => {
  const derive = ceQuonDerive([CONTESTE(), CONTESTE()]);
  const cles = derive.prises.filter((prise) => prise.nature === NATURE.DESACCORD).map((prise) => prise.key);
  assert.equal(new Set(cles).size, 2);
});

test("l'identité d'un auteur vient du fil, et non de son affichage", () => {
  // Le fil porte l'adresse ; le relevé ne porte qu'un affichage. Sans ce
  // recollement, la même personne se contredit elle-même.
  const derive = ceQuonDerive(
    [{ ...prise({ message: 1 }), qui: "Ourdine FERRAND" }, CONTESTE()],
    { messages: [
      { rang: 1, qui: { nom: "Ourdine FERRAND", adresse: "o.ferrand@novaclim.example" } },
      { rang: 2, qui: { nom: "Ourdine Ferrand", adresse: "O.Ferrand@novaclim.example" } }
    ] }
  );
  const desaccord = derive.prises.find((prise) => prise.nature === NATURE.DESACCORD);
  assert.deepEqual(desaccord.avant, [], "deux affichages d'une même adresse font une personne");
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
