import assert from "node:assert/strict";
import test from "node:test";

import {
  MARQUE, OFFRE, PAR, SUITE, ceQuonDerive, laMarqueDeContestation, laMarqueDuneOffre,
  laSuiteDuneDemande, lesContestations, memeSujet
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
  assert.equal(memeSujet("Humidité de l'Acrotère", "humidite de l acrotere"), true);
});

test("deux sujets voisins restent deux sujets", () => {
  assert.equal(memeSujet("humidité de l'acrotère", "cote du seuil"), false);
});

test("un sujet vide ne ressemble à rien, pas même à un autre sujet vide", () => {
  assert.equal(memeSujet("", ""), false);
  assert.equal(memeSujet(null, "humidité"), false);
});

test("un libellé qui se lit d'un tenant dans un autre désigne la même chose", () => {
  // **L'égalité exacte ne suffisait pas.** Sur un fil réel, 28 libellés pour
  // 39 prises : le désaccord portait « combinaison souffle et vent simultanée »
  // quand l'autre partie s'était exprimée sur « combinaison souffle et vent »,
  // et l'écran affirmait que personne n'avait parlé du sujet.
  assert.equal(memeSujet("combinaison souffle et vent",
    "combinaison souffle et vent simultanée"), true);
  assert.equal(memeSujet("fondations remise", "fondations remise sous charge sismique"), true);
  assert.equal(memeSujet("action du rotor", "pression de vent et action du rotor"), true,
    "au milieu comme au début");
});

test("deux libellés qui ne partagent qu'une locution vide restent distincts", () => {
  // C'est la maladie des quatre-vingt-seize désaccords : compter les mots
  // communs soude « prise en compte action souffle rotor » et « prise en
  // compte composante verticale sismique », qui sont deux points du rapport.
  assert.equal(memeSujet("prise en compte action souffle rotor",
    "prise en compte composante verticale sismique"), false);
  assert.equal(memeSujet("nature souffle rotor et vent",
    "pression vent comparée à souffle rotor"), false);
});

test("des mots présents mais dispersés ne font pas le même sujet", () => {
  // **Ils doivent se suivre.** « combinaison vent » ne dit pas ce que dit
  // « combinaison souffle et vent » : il en omet le souffle, qui est tout
  // l'objet du litige. Se contenter de retrouver les mots, où qu'ils soient,
  // soude deux sujets que rien ne rapproche.
  assert.equal(memeSujet("combinaison vent", "combinaison souffle et vent"), false);
  assert.equal(memeSujet("pression rotor", "pression de vent et action du rotor"), false);
});

test("deux mots de liaison différents ne font pas deux sujets", () => {
  // Le modèle écrit « de » une fois sur deux. Les compter ferait de
  // « fondations remise » et « fondations de la remise » deux choses.
  assert.equal(memeSujet("fondations remise", "fondations de la remise"), true);
  assert.equal(memeSujet("cote seuil", "la cote du seuil"), true);
});

test("une suite de mots de liaison ne désigne rien", () => {
  // Le pendant : si les liaisons comptaient comme des mots pleins, « de la »
  // atteindrait le plancher de deux mots et désignerait tout ce qui la porte.
  assert.equal(memeSujet("de la", "pression de la vanne"), false);
});

test("le rapprochement se fait sur les mots, pas sur les lettres", () => {
  // « vent » se lit dans « ventilation » : sur les lettres, la section de
  // ventilation rejoindrait le vent de calcul.
  assert.equal(memeSujet("section ventilation", "pression de vent"), false);
});

test("un libellé d'un seul mot ne désigne pas ce qui le contient", () => {
  // Sinon il désignerait tout : « vent » rejoindrait chaque libellé du fil.
  assert.equal(memeSujet("vent", "combinaison souffle et vent"), false);
  assert.equal(memeSujet("rotor", "action du rotor"), false);
});

test("deux mots pleins suffisent, et les mots de liaison ne comptent pas", () => {
  assert.equal(memeSujet("souffle rotor", "calcul du souffle rotor"), true);
  assert.equal(memeSujet("point 65", "point 57"), false);
});

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

// ── Une offre conditionnelle ───────────────────────────────────────────────

test("une prestation proposée contre commande se reconnaît", () => {
  // **C'est la marque qui a un prix**, et c'est ce qui a le plus de
  // conséquences dans tout le relevé.
  assert.equal(laMarqueDuneOffre({
    citation: "Cette prestation devra faire l'objet d'une commande complémentaire spécifique."
  }), OFFRE.CONTRE_COMMANDE);
});

test("une prestation proposée sur demande se reconnaît", () => {
  assert.equal(laMarqueDuneOffre({
    citation: "Une étude complémentaire pourra être réalisée à votre demande."
  }), OFFRE.SUR_DEMANDE);
});

test("une prestation proposée si l'autre le souhaite se reconnaît", () => {
  assert.equal(laMarqueDuneOffre({
    citation: "Si le bureau de contrôle souhaite une justification, nous sommes en mesure de la produire."
  }), OFFRE.SI_VOUS_SOUHAITEZ);
});

test("la marque qui engage une commande l'emporte sur la politesse qui l'entoure", () => {
  assert.equal(laMarqueDuneOffre({
    citation: "Si vous le souhaitez nous pouvons réaliser cette étude ; elle devra faire "
      + "l'objet d'une commande complémentaire."
  }), OFFRE.CONTRE_COMMANDE);
});

test("une demande ordinaire ne porte aucune marque d'offre", () => {
  // Le pendant : un lexique qui trouve toujours quelque chose ne dit rien.
  assert.equal(laMarqueDuneOffre({ citation: "Pouvez-vous confirmer la cote avant vendredi ?" }), "");
  assert.equal(laMarqueDuneOffre({ intitule: "produire une analyse modale spatiale" }), "");
  assert.equal(laMarqueDuneOffre({}), "");
});

test("une offre quitte les questions sans réponse", () => {
  // « Si vous le souhaitez, nous pouvons… » n'attend pas une relance, mais un
  // accord — et sur un fil réel, l'une exigeait une commande payante.
  const offre = demande({
    message: 1, citation: "Cette prestation devra faire l'objet d'une commande complémentaire."
  });
  const derive = ceQuonDerive([offre], { dernierMessage: 5 });
  assert.equal(derive.sansReponse, 0);
  assert.equal(derive.offres, 1);
  assert.deepEqual(derive.prises.map((prise) => prise.nature), [NATURE.OFFRE]);
});

test("une offre dit ce qu'elle était et quelle marque a parlé", () => {
  const derive = ceQuonDerive([demande({
    message: 1, citation: "Une étude pourra être réalisée à votre demande."
  })], { dernierMessage: 5 });
  const [rendue] = derive.prises;
  assert.equal(rendue.natureDeclaree, NATURE.DEMANDE);
  assert.equal(rendue.marque, OFFRE.SUR_DEMANDE);
  assert.notEqual(rendue.key, "");
});

test("une vraie demande reste jugée comme telle", () => {
  // Le pendant : si toute demande devenait une offre, l'apport principal du
  // procédé disparaîtrait.
  const derive = ceQuonDerive([demande({ message: 1 })], { dernierMessage: 5 });
  assert.equal(derive.offres, 0);
  assert.equal(derive.sansReponse, 1);
});

test("un constat qui porte une marque d'offre reste un constat", () => {
  // L'offre se dérive d'une demande : requalifier un constat ferait entrer
  // dans la rubrique des choses qui n'attendent rien.
  const derive = ceQuonDerive([prise({
    message: 1, citation: "Cette prestation devra faire l'objet d'une commande."
  })]);
  assert.equal(derive.offres, 0);
  assert.equal(derive.prises[0].nature, NATURE.CONSTAT);
});

// ── Contester en français parlé ────────────────────────────────────────────

test("viser le dire de l'autre nommément se reconnaît", () => {
  // Un second fil a montré une famille que les cinq premières marques ne
  // voyaient pas : on y conteste sans registre juridique.
  assert.equal(laMarqueDeContestation({
    citation: "Elle n'aurait donc rien à voir avec les creux dont vous parlez."
  }), MARQUE.REPRISE_DU_DIRE);
  assert.equal(laMarqueDeContestation({
    citation: "La fuite que vous évoquez vient d'ailleurs."
  }), MARQUE.REPRISE_DU_DIRE);
});

test("nier un lien que l'autre a établi se reconnaît, sans le nommer", () => {
  // « rien à voir » vise le raisonnement de l'autre sans dire « vous » : c'est
  // la même famille, et elle se relève seule.
  assert.equal(laMarqueDeContestation({
    citation: "Cela n'a rien à voir avec les creux constatés."
  }), MARQUE.REPRISE_DU_DIRE);
  assert.equal(laMarqueDeContestation({
    citation: "Cette fuite est sans rapport avec la pose des lès."
  }), MARQUE.REPRISE_DU_DIRE);
});

test("démentir ce qui vient d'être avancé se reconnaît", () => {
  assert.equal(laMarqueDeContestation({
    citation: "Le temps ne va pas la coller à la place du chalumeau."
  }), MARQUE.NE_VA_PAS);
});

test("maintenir malgré ce qui a été dit se reconnaît", () => {
  assert.equal(laMarqueDeContestation({
    citation: "Je comprends que les investigations se poursuivent. Pour autant, je demande des essais."
  }), MARQUE.POUR_AUTANT);
});

test("« toutefois » n'est pas une marque, et c'est mesuré", () => {
  // Il ouvre une phrase ordinaire dans un échange technique : « Toutefois, un
  // hélicoptère peut décoller en présence de vent » ne conteste rien. Il a été
  // essayé puis écarté pour cette raison.
  assert.equal(laMarqueDeContestation({
    citation: "Toutefois, une étude spécifique complémentaire pourra être réalisée."
  }), "");
  assert.equal(laMarqueDeContestation({ citation: "Néanmoins, la valeur reste inférieure." }), "");
});

// ── À quelle prise une demande a reçu réponse ──────────────────────────────

const reponse = (dessus = {}) => prise({ message: 2, ...dessus });

test("un renvoi vérifié suffit, même quand les sujets ne se ressemblent pas", () => {
  // **C'est tout l'apport.** Sur un fil réel, « rectification de la pose
  // d'étanchéité » a reçu pour réponse « reprise de la membrane » : les deux
  // désignent la même chose et ne partagent aucun mot.
  const question = demande({ message: 1, porteSur: "rectification de la pose d'étanchéité" });
  const engagement = reponse({
    nature: NATURE.ENGAGEMENT, porteSur: "reprise de la membrane", repondA: 1
  });
  const suite = laSuiteDuneDemande(question, [question, engagement], { dernierMessage: 3 });
  assert.equal(suite.parQuoi, engagement);
  assert.equal(suite.suite, SUITE.REPONDUE);
  assert.equal(suite.parQuel, PAR.RENVOI);
});

test("le sujet commun reste un signal, et se dit comme tel", () => {
  const question = demande({ message: 1 });
  const suite = laSuiteDuneDemande(question, [question, reponse()], { dernierMessage: 3 });
  assert.equal(suite.suite, SUITE.REPONDUE);
  assert.equal(suite.parQuel, PAR.SUJET);
});

test("un renvoi vers une autre demande ne la ferme pas", () => {
  // Le rang visé doit être celui de la demande, pas un autre.
  const question = demande({ message: 2 });
  const ailleurs = reponse({ message: 3, porteSur: "autre chose", repondA: 1 });
  const suite = laSuiteDuneDemande(question, [question, ailleurs], { dernierMessage: 3 });
  assert.equal(suite.suite, SUITE.SANS_REPONSE);
});

test("un renvoi porté par une prise qui ne répond de rien ne ferme rien", () => {
  // Une source fonde, elle ne tranche pas ; une autre demande est une relance.
  const question = demande({ message: 1 });
  const source = reponse({ nature: NATURE.SOURCE, porteSur: "autre chose", repondA: 1 });
  const relance = { ...demande({ message: 3, porteSur: "autre chose" }), repondA: 1 };
  const suite = laSuiteDuneDemande(question, [question, source, relance], { dernierMessage: 3 });
  assert.equal(suite.suite, SUITE.SANS_REPONSE);
});

test("une demande sans sujet peut être fermée par un renvoi", () => {
  // Sans renvoi elle sortait en « on ne sait pas » ; le renvoi, lui, se
  // vérifie, et il suffit.
  const question = demande({ message: 1, porteSur: null });
  const suite = laSuiteDuneDemande(question, [question, reponse({ repondA: 1 })], { dernierMessage: 3 });
  assert.equal(suite.suite, SUITE.REPONDUE);
  assert.equal(suite.parQuel, PAR.RENVOI);
});

test("une demande sans sujet ni renvoi reste indécidable", () => {
  const question = demande({ message: 1, porteSur: null });
  const suite = laSuiteDuneDemande(question, [question, reponse({ porteSur: "autre chose" })],
    { dernierMessage: 3 });
  assert.equal(suite.suite, SUITE.ON_NE_SAIT_PAS);
  assert.equal(suite.parQuel, null);
});

test("la dérivation dit par quel signal une demande a été fermée", () => {
  // Un modèle qui déclarerait des renvois à tort ferait taire des questions
  // restées sans réponse : cela doit se lire plutôt que se deviner.
  const question = demande({ message: 1, porteSur: "cote du seuil" });
  const derive = ceQuonDerive([question, reponse({ porteSur: "reprise du seuil", repondA: 1 })],
    { dernierMessage: 3 });
  assert.equal(derive.sansReponse, 0);
  assert.equal(derive.prises[0].repondueParQuel, PAR.RENVOI);
});
