import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  MANQUE, NATURE, NATURES_DECLAREES, NATURES_DERIVEES, ceQueCaDevient, ceQuiManque,
  horsNomenclature, iconeDeLaNature, nomDeLaNature, parNature, phraseDuManque,
  ceQueLeModeleNaPasDit, laCleDeLAuteur, lesPrisesEtLeursAuteurs, partReleveeDuMessage,
  phraseDeLaPart, phraseDuReleve,
  prisesDuMessage, quoiDeLaNature
} from "./prises-de-position.js";

const prise = (dessus = {}) => ({
  nature: NATURE.CONSTAT, intitule: "le support est humide", message: 2,
  citation: "Le support est humide.", qui: "Ourdine Ferrand",
  quand: "2026-03-12T08:14:00.000Z", pourQui: null, echeance: null,
  messageVerifie: true, ...dessus
});

// ── Les sept natures ───────────────────────────────────────────────────────

test("cinq natures sont déclarées, trois se dérivent", () => {
  assert.equal(NATURES_DECLAREES.length, 5);
  assert.deepEqual([...NATURES_DERIVEES].sort(),
    [NATURE.DESACCORD, NATURE.OFFRE, NATURE.SANS_REPONSE].sort());
  assert.equal(NATURES_DECLAREES.includes(NATURE.OFFRE), false,
    "une offre se dérive : la demander au modèle en ferait inventer");
  assert.equal(
    [...NATURES_DECLAREES, ...NATURES_DERIVEES].length,
    new Set(Object.values(NATURE)).size
  );
});

test("les natures que le modèle déclare sont celles que le serveur lui demande", () => {
  // Deux listes tenues à part auraient divergé : une nature ajoutée d'un côté
  // serait arrivée à l'écran sans nom, ou demandée sans pouvoir s'afficher.
  const serveur = readFileSync(
    new URL("../../../../supabase/functions/_shared/prises-du-modele.js", import.meta.url), "utf8"
  );
  for (const nature of NATURES_DECLAREES) {
    assert.ok(serveur.includes(`: "${nature}"`), `absente du serveur : ${nature}`);
  }
});

test("les natures dérivées ne sont pas demandées au modèle", () => {
  // Les faire déclarer en ferait des inventions ; les calculer sur le fil en
  // fait des observations.
  const serveur = readFileSync(
    new URL("../../../../supabase/functions/_shared/prises-du-modele.js", import.meta.url), "utf8"
  );
  for (const nature of NATURES_DERIVEES) {
    assert.equal(serveur.includes(`: "${nature}"`), false, `demandée au modèle : ${nature}`);
  }
});

test("chaque nature porte un nom, ce qu'elle est, et ce qu'elle devient", () => {
  for (const nature of Object.values(NATURE)) {
    assert.notEqual(nomDeLaNature(nature), "Sans nature", nature);
    assert.ok(quoiDeLaNature(nature), nature);
    assert.ok(ceQueCaDevient(nature), nature);
  }
});

test("une nature inconnue garde son code, et ne devient pas « Autre »", () => {
  // Rangée sous « Autre », elle serait invisible au milieu du reste.
  assert.equal(nomDeLaNature("remarque"), "remarque");
  assert.equal(nomDeLaNature(""), "Sans nature");
});

test("chaque icône de nature existe dans la planche", () => {
  // Défaut précisément invisible : une icône absente ne lève rien et ne peint
  // rien. La rubrique paraît juste un peu nue.
  const planche = readFileSync(new URL("../../assets/icons.svg", import.meta.url), "utf8");
  for (const nature of Object.values(NATURE)) {
    assert.ok(planche.includes(`id="${iconeDeLaNature(nature)}"`), nature);
  }
});

// ── Ce qui manque ──────────────────────────────────────────────────────────

test("une prise complète ne manque de rien", () => {
  assert.deepEqual(ceQuiManque(prise()), []);
});

test("une prise sans auteur ni date le dit", () => {
  assert.deepEqual(ceQuiManque(prise({ qui: "", quand: "" })),
    [MANQUE.SANS_AUTEUR, MANQUE.SANS_DATE]);
});

test("une demande sans destinataire ni échéance le dit", () => {
  const manques = ceQuiManque(prise({ nature: NATURE.DEMANDE }));
  assert.deepEqual(manques, [MANQUE.SANS_DESTINATAIRE, MANQUE.SANS_ECHEANCE]);
});

test("un constat ne se voit pas réclamer un destinataire", () => {
  // Une source ou un constat n'en a pas : en réclamer un ferait un écran
  // couvert de reproches sans objet, qu'on cesserait de lire.
  assert.deepEqual(ceQuiManque(prise({ nature: NATURE.CONSTAT })), []);
  assert.deepEqual(ceQuiManque(prise({ nature: NATURE.SOURCE })), []);
});

test("un engagement sans échéance le dit, mais n'a pas de destinataire à donner", () => {
  assert.deepEqual(ceQuiManque(prise({ nature: NATURE.ENGAGEMENT })), [MANQUE.SANS_ECHEANCE]);
});

test("une prise rattachée à un autre message le dit", () => {
  // Son auteur a changé : « BERTRAND affirme » et « Ourdine Ferrand affirme »
  // ne sont pas la même information.
  assert.deepEqual(ceQuiManque(prise({ messageVerifie: false })), [MANQUE.MESSAGE_CORRIGE]);
});

test("un désaccord ne se voit réclamer ni auteur ni date", () => {
  // Il n'est de personne : il est entre deux personnes. Lui en réclamer un
  // ferait deux reproches sur chaque ligne, pour une chose qui n'en a par
  // nature ni l'un ni l'autre.
  assert.deepEqual(ceQuiManque({ nature: NATURE.DESACCORD, qui: null, quand: null }), []);
});

test("une question sans réponse réclame son destinataire et son échéance", () => {
  // C'est ce qui manquera le jour où elle deviendra un sujet : il faudra bien
  // que quelqu'un décide d'un qui et d'une date, et il vaut mieux qu'il sache
  // qu'ils n'étaient pas dans le fil.
  assert.deepEqual(ceQuiManque(prise({ nature: NATURE.SANS_REPONSE })),
    [MANQUE.SANS_DESTINATAIRE, MANQUE.SANS_ECHEANCE]);
  assert.deepEqual(
    ceQuiManque(prise({ nature: NATURE.SANS_REPONSE, pourQui: "BERTRAND", echeance: "jeudi" })), []
  );
});

test("une demande qu'on n'a pas su juger le dit", () => {
  // Ce n'est ni « répondue » ni « restée sans réponse », et le taire ferait
  // croire à la première.
  assert.deepEqual(
    ceQuiManque(prise({ nature: NATURE.DEMANDE, suite: "on-ne-sait-pas", pourQui: "A", echeance: "jeudi" })),
    [MANQUE.SUITE_INCONNUE]
  );
  assert.deepEqual(
    ceQuiManque(prise({ nature: NATURE.DEMANDE, suite: "repondue", pourQui: "A", echeance: "jeudi" })), []
  );
});

test("chaque manque porte sa phrase", () => {
  for (const manque of Object.values(MANQUE)) {
    assert.notEqual(phraseDuManque(manque), "quelque chose manque à cette prise", manque);
  }
  assert.equal(phraseDuManque("inconnu"), "quelque chose manque à cette prise");
});

// ── Le rangement ───────────────────────────────────────────────────────────

test("les prises se rangent par nature, dans l'ordre de l'écran", () => {
  const groupes = parNature([
    prise({ nature: NATURE.DEMANDE }), prise(), prise({ nature: NATURE.SOURCE }), prise()
  ]);
  assert.deepEqual(groupes.map((groupe) => groupe.nature),
    [NATURE.CONSTAT, NATURE.DEMANDE, NATURE.SOURCE]);
  assert.deepEqual(groupes.map((groupe) => groupe.prises.length), [2, 1, 1]);
});

test("une nature vide ne fait pas de rubrique", () => {
  // On chercherait ce qui devrait s'y trouver.
  assert.deepEqual(parNature([prise()]).map((groupe) => groupe.nature), [NATURE.CONSTAT]);
  assert.deepEqual(parNature([]), []);
});

test("une prise hors nomenclature se voit, plutôt que de disparaître", () => {
  const dehors = prise({ nature: "remarque" });
  assert.deepEqual(parNature([prise(), dehors]).map((groupe) => groupe.nature), [NATURE.CONSTAT]);
  assert.deepEqual(horsNomenclature([prise(), dehors]), [dehors]);
});

test("les prises d'un message se retrouvent par son rang", () => {
  const prises = [prise({ message: 1 }), prise({ message: 2 }), prise({ message: 2 })];
  assert.equal(prisesDuMessage(prises, 2).length, 2);
  assert.deepEqual(prisesDuMessage(prises, 9), []);
});

// ── Ce que le relevé a donné ───────────────────────────────────────────────

test("la phrase du relevé dit le compte", () => {
  assert.equal(phraseDuReleve({ prises: [prise(), prise()] }), "2 prises de position");
  assert.equal(phraseDuReleve({ prises: [prise()] }), "1 prise de position");
  assert.equal(phraseDuReleve({}), "0 prise de position");
});

test("ce qui a été écarté se dit à côté du résultat, pas au-dessous", () => {
  assert.equal(
    phraseDuReleve({ prises: [prise()], ecartees: 2 }),
    "1 prise de position · 2 écartées faute d'une citation qu'on retrouve"
  );
});

test("les prises rattachées ailleurs se comptent aussi", () => {
  assert.ok(phraseDuReleve({ prises: [prise()], messagesCorriges: 1 })
    .includes("1 rattachée à un autre message"));
});

test("une réponse coupée se dit, et ne se compte pas", () => {
  // On ne sait pas combien il en manque : l'écrire comme un chiffre serait
  // inventer.
  const phrase = phraseDuReleve({ prises: [prise()], coupee: true });
  assert.ok(phrase.includes("on ne sait pas combien"));
  assert.equal(/\d+ manquante/.test(phrase), false);
});

test("un relevé sans rien à signaler ne dit que son compte", () => {
  assert.equal(phraseDuReleve({ prises: [prise()], ecartees: 0, messagesCorriges: 0 }),
    "1 prise de position");
});

// ── Ce dont le modèle n'a rien dit ─────────────────────────────────────────

test("un message muet et un message oublié ne se disent pas du même mot", () => {
  // Déclarer qu'un message ne porte aucune prise est une lecture ; n'en rien
  // dire n'en est pas une. Les confondre fait passer un trou pour un constat
  // de vide (règle 5).
  const dit = ceQueLeModeleNaPasDit({ muets: [1, 4], oublies: [3] });
  assert.equal(dit.sait, true);
  assert.ok(dit.phrase.includes("2 messages dont il déclare ne rien tirer (1, 4)"));
  assert.ok(dit.phrase.includes("1 message dont il n'a rien dit du tout (3)"));
  assert.ok(dit.phrase.includes("c'est une omission"));
});

test("un relevé complet ne dit rien, plutôt que de dire zéro", () => {
  assert.equal(ceQueLeModeleNaPasDit({ muets: [], oublies: [] }).phrase, "");
});

test("ne pas savoir se dit, et ne se compte pas", () => {
  const dit = ceQueLeModeleNaPasDit({});
  assert.equal(dit.sait, false);
  assert.ok(dit.phrase.includes("message par message"));
  assert.deepEqual(dit.muets, []);
  assert.deepEqual(dit.oublies, []);
});

test("un seul des deux comptes suffit à ouvrir la phrase", () => {
  assert.ok(ceQueLeModeleNaPasDit({ muets: [2], oublies: [] }).phrase.includes("(2)"));
  assert.ok(ceQueLeModeleNaPasDit({ muets: [], oublies: [5] }).phrase.includes("(5)"));
});

// ── Une personne, une clé ──────────────────────────────────────────────────

test("l'adresse fait la clé, et la casse n'y change rien", () => {
  assert.equal(
    laCleDeLAuteur({ nom: "Ourdine FERRAND", adresse: "O.Ferrand@novaclim.example" }),
    "o.ferrand@novaclim.example"
  );
});

test("deux affichages d'une même adresse font une seule personne", () => {
  // Un fil réel a porté deux personnes sous quatre identités, et l'une s'est
  // retrouvée en désaccord avec elle-même.
  assert.equal(
    laCleDeLAuteur({ nom: "Ourdine Ferrand", adresse: "o.ferrand@novaclim.example" }),
    laCleDeLAuteur({ nom: "FERRAND Ourdine", adresse: "o.ferrand@novaclim.example" })
  );
});

test("faute d'adresse, le nom sert de clé, aplati", () => {
  assert.equal(laCleDeLAuteur({ nom: "Ourdine  FERRAND" }), "ourdine ferrand");
  assert.equal(laCleDeLAuteur("Ourdine FERRAND"), "ourdine ferrand");
});

test("deux noms écrits autrement restent deux personnes, et c'est dit", () => {
  // Le prix de l'absence d'adresse. On ne rapproche pas au jugé.
  assert.notEqual(laCleDeLAuteur({ nom: "Ourdine Ferrand" }), laCleDeLAuteur({ nom: "O. Ferrand" }));
});

test("chaque prise reçoit l'identité du message d'où elle sort", () => {
  const [une] = lesPrisesEtLeursAuteurs(
    [{ message: 2, qui: "Ourdine Ferrand" }],
    [{ rang: 2, qui: { nom: "Ourdine Ferrand", adresse: "o.ferrand@novaclim.example" } }]
  );
  assert.equal(une.quiCle, "o.ferrand@novaclim.example");
  assert.equal(une.qui, "Ourdine Ferrand", "l'affichage ne bouge pas");
});

test("une prise dont le message est introuvable retombe sur son affichage", () => {
  // Elle garde une clé plutôt que rien : sans clé, elle s'apparierait avec
  // tout le monde.
  const [une] = lesPrisesEtLeursAuteurs([{ message: 9, qui: "Ourdine FERRAND" }], []);
  assert.equal(une.quiCle, "ourdine ferrand");
});

// ── Ce qu'une citation a repris d'un message ───────────────────────────────

const COUVERTURE = [
  { message: 1, caracteres: 550, couverts: 279 },
  { message: 2, caracteres: 703, couverts: 219 },
  { message: 3, caracteres: 0, couverts: 0 }
];

test("la part se calcule sur le message demandé", () => {
  assert.deepEqual(partReleveeDuMessage(COUVERTURE, 1), { caracteres: 550, couverts: 279, part: 51 });
  assert.equal(partReleveeDuMessage(COUVERTURE, 2).part, 31);
});

test("un message inconnu n'a pas de part, et n'en reçoit pas une fausse", () => {
  assert.equal(partReleveeDuMessage(COUVERTURE, 9), null);
  assert.equal(partReleveeDuMessage([], 1), null);
});

test("un message sans texte n'a pas de part : une part sur rien n'existe pas", () => {
  assert.equal(partReleveeDuMessage(COUVERTURE, 3), null);
});

test("la phrase dit ce que le chiffre veut dire, et rien de plus", () => {
  // **Pas un taux à faire monter** : la politesse et la signature ne doivent
  // être reprises par personne. Aucun jugement n'est porté ici (règle 5).
  const phrase = phraseDeLaPart(partReleveeDuMessage(COUVERTURE, 2));
  assert.ok(phrase.includes("31 %"));
  assert.ok(phrase.includes("repris par une citation"));
  assert.equal(/faible|insuffisant|mauvais/.test(phrase), false);
});

test("sans part, pas de phrase", () => {
  assert.equal(phraseDeLaPart(null), "");
});
