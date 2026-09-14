import test from "node:test";
import assert from "node:assert/strict";

import { ITEM } from "./proposition-state.js";
import {
  ITEM_TYPE,
  applyDecisions,
  appreciationMoved,
  attachmentItems,
  avisItems,
  describeAvisChange,
  diffAvis,
  documentItems,
  motDeLaNature,
  nomDeLaLigne,
  summarizeReview
} from "./proposition-review.js";

test("un document soumis porte l'identifiant comme clé, jamais son rang", () => {
  // La clé doit survivre à tout : c'est par elle qu'une décision se retrouvera
  // quand un recalcul la contredira, dans six mois et dans un autre ordre.
  const [item] = documentItems([
    { id: "u-1", original_filename: "RICT.pdf", detected_kind_label: "Rapport initial (RICT)", detected_author: "socotec" }
  ]);

  assert.equal(item.itemType, ITEM_TYPE.DOCUMENT);
  assert.equal(item.itemKey, "u-1");
  assert.equal(item.payload.name, "RICT.pdf");
  assert.equal(item.status, ITEM.PROPOSED);
});

test("une affaire déjà certaine n'ouvre aucune question", () => {
  // Ne rien demander est la meilleure façon de ne pas lasser celui qui répond.
  const items = attachmentItems([
    { verdict: "BELONGS", declared: [{ type: "chrono_affaire", value: "13860", label: "13860" }] },
    { verdict: "FOREIGN", declared: [{ type: "chrono_affaire", value: "99999", label: "99999" }], reason: "…" }
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].payload.label, "99999");
});

test("la clé d'un rattachement est l'affaire, pas le document", () => {
  // C'est ce qui fait qu'accepter « l'affaire 13861 » aujourd'hui vaudra encore
  // pour des livrables qu'on n'a pas reçus.
  const [item] = attachmentItems([
    {
      verdict: "FOREIGN",
      declared: [
        { type: "chrono_affaire", value: "13861", label: "13861" },
        { type: "affaire", value: "230113861000042", label: "230113861000042" }
      ],
      reason: "…"
    }
  ]);

  assert.equal(item.itemKey, "chrono_affaire:13861|affaire:230113861000042");
});

test("un rattachement sans affaire déclarée n'ouvre rien : il n'y aurait rien à retenir", () => {
  assert.deepEqual(attachmentItems([{ verdict: "UNCERTAIN", declared: [] }]), []);
});

test("l'écart des avis distingue ce qui naît de ce qui change", () => {
  const known = [
    { external_reference: "234", status: "OPEN", opinion_raw: "S" },
    { external_reference: "249", status: "OPEN", opinion_raw: "D" }
  ];
  const computed = [
    { reference: "234", status: "OPEN", opinion_raw: "S" },
    { reference: "249", status: "CLOSED", opinion_raw: "F" },
    { reference: "301", status: "OPEN", opinion_raw: "S" }
  ];

  const diff = diffAvis(known, computed);

  assert.deepEqual(diff.added.map((avis) => avis.reference), ["301"]);
  assert.deepEqual(diff.changed.map((avis) => avis.reference), ["249"]);
  assert.equal(diff.changed[0].previousStatus, "OPEN");
  assert.equal(diff.unchanged, 1);
});

test("un intitulé reformulé n'est pas un changement", () => {
  // Les documents reformulent tout le temps. En faire une question ferait
  // crouler la revue sous des changements qui n'en sont pas.
  const diff = diffAvis(
    [{ external_reference: "234", status: "OPEN", opinion_raw: "S", title: "Couche de fondation" }],
    [{ reference: "234", status: "OPEN", opinion_raw: "S", title: "Couche de fondation du dallage" }]
  );

  assert.deepEqual(diff.changed, []);
  assert.equal(diff.unchanged, 1);
});

test("sans état conservé, tous les avis sont nouveaux", () => {
  const diff = diffAvis([], [{ reference: "234" }, { reference: "249" }]);

  assert.equal(diff.added.length, 2);
  assert.deepEqual(diff.changed, []);
});

test("seuls les avis qui bougent ouvrent une question", () => {
  const items = avisItems({
    added: [{ reference: "301", status: "OPEN" }],
    changed: [{ reference: "249", status: "CLOSED", previousStatus: "OPEN" }],
    unchanged: 12
  });

  assert.equal(items.length, 2);
  assert.deepEqual(items.map((entry) => entry.payload.change), ["added", "changed"]);
  assert.deepEqual(items.map((entry) => entry.itemKey), ["301", "249"]);
});

test("les décisions déjà prises sont rendues aux affirmations recalculées", () => {
  // L'analyse se refait à chaque ouverture ; les réponses, elles, se conservent.
  // Les perdre à chaque rechargement rendrait la revue impraticable.
  const items = documentItems([{ id: "u-1" }, { id: "u-2" }]);
  const stored = [{ item_type: ITEM_TYPE.DOCUMENT, item_key: "u-2", status: ITEM.REFUSED, reason: "autre chantier" }];

  const rendus = applyDecisions(items, stored);

  assert.equal(rendus[0].status, ITEM.PROPOSED);
  assert.equal(rendus[1].status, ITEM.REFUSED);
  assert.equal(rendus[1].reason, "autre chantier");
});

test("une décision portant sur un autre type ne déteint pas", () => {
  // Un document et un avis peuvent porter la même clé sans être la même chose.
  const items = documentItems([{ id: "234" }]);
  const stored = [{ item_type: ITEM_TYPE.AVIS, item_key: "234", status: ITEM.REFUSED, reason: "…" }];

  assert.equal(applyDecisions(items, stored)[0].status, ITEM.PROPOSED);
});

test("le compte par nature sert les intitulés, et dit ce qui reste à trancher", () => {
  const items = [
    ...documentItems([{ id: "u-1" }, { id: "u-2" }]),
    ...avisItems({ added: [{ reference: "301" }] })
  ];
  items[0].status = ITEM.REFUSED;

  const bilan = summarizeReview(items);

  assert.deepEqual(bilan, { documents: 2, attachments: 0, avis: 1, refused: 1, undecided: 2 });
});

test("« OPEN → OPEN » n'existe plus : on nomme ce qui a changé", () => {
  // Le statut n'avait pas bougé, c'est l'appréciation qui avait changé. Nommer
  // un changement, c'est nommer CE QUI a changé — sans quoi le lecteur cherche
  // une différence là où il n'y en a pas.
  const appreciation = describeAvisChange({
    change: "changed",
    status: "OPEN",
    previousStatus: "OPEN",
    opinion: "F",
    previousOpinion: "S"
  });

  assert.equal(appreciation.label, "Appréciation modifiée");
  assert.equal(appreciation.detail, "avis S → F");
  assert.doesNotMatch(appreciation.detail, /OPEN/);
});

test("un changement de statut se dit en français", () => {
  const statut = describeAvisChange({
    change: "changed",
    status: "RESOLVED",
    previousStatus: "OPEN",
    opinion: "F",
    previousOpinion: "F"
  });

  assert.equal(statut.label, "Change d'état");
  assert.equal(statut.detail, "Ouvert → Levé");
});

test("quand les deux bougent, les deux se disent", () => {
  const deux = describeAvisChange({
    change: "changed",
    status: "RESOLVED",
    previousStatus: "NO_NEWS",
    opinion: "F",
    previousOpinion: "S"
  });

  assert.equal(deux.label, "Change d'état");
  assert.equal(deux.detail, "Sans nouvelles → Levé · avis S → F");
});

test("un nouvel avis annonce son état, pas une transition", () => {
  const neuf = describeAvisChange({ change: "added", status: "OPEN", opinion: "S" });

  assert.equal(neuf.label, "Nouvel avis");
  assert.equal(neuf.detail, "Ouvert · avis S");
  assert.doesNotMatch(neuf.detail, /→/);
});

test("un avis que le lot ne reprend pas n'est pas un mouvement", () => {
  // Un rapport de visite ne rappelle pas tout ce qui existe : il porte ce qui a
  // été créé ou modifié depuis le précédent. Compter les autres comme des
  // mouvements demandait de confirmer soixante-douze fois ce que personne
  // n'avait dit.
  const diff = diffAvis(
    [
      { external_reference: "166", status: "OPEN", opinion_raw: "à lever" },
      { external_reference: "167", status: "RESOLVED", opinion_raw: "levé" }
    ],
    [
      { reference: "166", status: "NO_NEWS", opinion_raw: "à lever" },
      { reference: "167", status: "RESOLVED", opinion_raw: "levé" }
    ]
  );

  assert.equal(diff.changed.length, 0, "passer sans nouvelles n'est pas un changement");
  assert.equal(diff.silent.length, 1);
  assert.equal(diff.silent[0].reference, "166");
  assert.equal(diff.silent[0].previousStatus, "OPEN", "il reste dans l'état où le dernier document l'a laissé");
  assert.equal(diff.unchanged, 1);
});

test("un avis déjà sans nouvelles qui bouge reste un mouvement", () => {
  // Le silence n'excuse pas tout : si le lot en reparle, c'est un fait.
  const diff = diffAvis(
    [{ external_reference: "166", status: "NO_NEWS", opinion_raw: "à lever" }],
    [{ reference: "166", status: "RESOLVED", opinion_raw: "levé" }]
  );

  assert.equal(diff.silent.length, 0);
  assert.equal(diff.changed.length, 1);
});

test("un avis qui apparaît reste un avis qui apparaît", () => {
  const diff = diffAvis([], [{ reference: "200", status: "NO_NEWS" }]);

  assert.equal(diff.added.length, 1, "on ne l'a jamais vu : c'est une apparition, pas un silence");
  assert.equal(diff.silent.length, 0);
});

/* ── Une appréciation absente n'est pas une appréciation changée ──────────
   Relevé sur un lot réel de deux fiches d'avis travaux : le moteur n'y lisait
   aucune lettre, et les soixante-et-onze avis que le projet connaissait
   passaient tous en « avis S → — ». Soixante-et-onze questions, dont pas une
   ne portait sur un fait. */

test("un avis dont la nouvelle lecture ne rend aucune appréciation est inchangé", () => {
  const diff = diffAvis(
    [{ external_reference: "166", status: "OPEN", opinion_raw: "S" }],
    [{ reference: "166", status: "OPEN", opinion_raw: null }]
  );

  assert.equal(diff.changed.length, 0, "ne pas savoir n'est pas savoir qu'il n'y a rien");
  assert.equal(diff.unchanged, 1);
});

test("une appréciation qui apparaît là où il n'y en avait pas est un changement", () => {
  const diff = diffAvis(
    [{ external_reference: "166", status: "OPEN", opinion_raw: null }],
    [{ reference: "166", status: "OPEN", opinion_raw: "S" }]
  );

  assert.equal(diff.changed.length, 1, "une information gagnée se lit");
});

test("deux appréciations connues qui diffèrent restent un changement", () => {
  const diff = diffAvis(
    [{ external_reference: "166", status: "OPEN", opinion_raw: "S" }],
    [{ reference: "166", status: "OPEN", opinion_raw: "D" }]
  );

  assert.equal(diff.changed.length, 1);
  assert.equal(diff.changed[0].previousOpinion, "S");
});

test("un statut qui bouge reste un changement, même sans appréciation lue", () => {
  const diff = diffAvis(
    [{ external_reference: "166", status: "OPEN", opinion_raw: "S" }],
    [{ reference: "166", status: "RESOLVED", opinion_raw: null }]
  );

  assert.equal(diff.changed.length, 1);
  assert.equal(diff.changed[0].previousStatus, "OPEN");
});

test("l'appréciation connue se conserve quand le lot n'en dit rien", () => {
  // Sans quoi chaque lot reversait trois cents affirmations pour en perdre
  // l'appréciation : la mémoire du projet se vidait de ce qu'elle savait.
  const diff = diffAvis(
    [{ external_reference: "166", status: "OPEN", opinion_raw: "S" }],
    [{ reference: "166", status: "RESOLVED", opinion_raw: null }]
  );

  assert.equal(diff.changed[0].opinion_raw, "S");
  assert.equal(diff.changed[0].opinionCarriedOver, true);
});

test("l'écran ne dit plus « avis S → — »", () => {
  const { label, detail } = describeAvisChange({
    change: "changed",
    status: "OPEN",
    previousStatus: "OPEN",
    opinion: null,
    previousOpinion: "S"
  });

  assert.equal(label, "Appréciation modifiée", "l'étiquette reste celle du mouvement demandé");
  assert.ok(!detail.includes("→ —"), `un tiret n'est pas une appréciation : ${detail}`);
});

test("appreciationMoved ne compare que ce qui est connu des deux côtés", () => {
  assert.equal(appreciationMoved("S", null), false);
  assert.equal(appreciationMoved("S", ""), false);
  assert.equal(appreciationMoved("S", "  "), false);
  assert.equal(appreciationMoved(null, "S"), true);
  assert.equal(appreciationMoved("S", "D"), true);
  assert.equal(appreciationMoved("S", "S"), false);
});


/**
 * **« fermeture c0700a98-c591-4bff-8809-3eaaa4ee3961 ».**
 *
 * Le nom d'une ligne se cherchait sous `payload.subject` chez les uns, sous
 * `payload.name` chez les autres : la moitié des natures n'en avaient donc
 * aucun, et l'écran d'arbitrage demandait de trancher sur un identifiant. Un
 * nom vit à un seul endroit (règle 10), et il connaît les clés que chaque
 * nature emploie réellement.
 */
test("chaque nature se nomme en clair, jamais par sa clé", () => {
  const nom = (itemType, itemKey, payload) => nomDeLaLigne({ itemType, itemKey, payload });

  assert.equal(nom(ITEM_TYPE.FERMETURE, "c0700a98", { titre: "Reprise du carrelage" }), "Reprise du carrelage");
  assert.equal(nom(ITEM_TYPE.SUJET, "cr12-4", { titre: "Étanchéité toiture" }), "Étanchéité toiture");
  assert.equal(nom(ITEM_TYPE.DOCUMENT, "d1", { name: "1824_CR_10.pdf" }), "1824_CR_10.pdf");
  assert.equal(nom(ITEM_TYPE.LABEL, "urgent", { nom: "urgent" }), "urgent");
  assert.equal(nom(ITEM_TYPE.ATTACHMENT, "affaire:13861", { label: "Affaire 13861" }), "Affaire 13861");
  assert.equal(nom(ITEM_TYPE.INTERVENANT, "gil", { societe: "Entreprise du lot 3" }), "Entreprise du lot 3");
  // Un lot se retrouve sur le chantier par son numéro ; le nom le précise.
  assert.equal(nom(ITEM_TYPE.LOT, "3", { numero: "3", nom: "Gros œuvre" }), "Lot 3 — Gros œuvre");
  assert.equal(nom(ITEM_TYPE.LOT, "3", { numero: "3" }), "Lot 3");
  // Un avis se désigne par le numéro que le bureau de contrôle lui a donné.
  assert.equal(nom(ITEM_TYPE.AVIS, "abc", { reference: "S12" }), "Avis n° S12");

  // **Jamais un blanc.** Faute de nom, la clé : un identifiant se cherche, un
  // vide ne dit rien du tout.
  assert.equal(nom(ITEM_TYPE.FERMETURE, "c0700a98", {}), "c0700a98");
  assert.equal(nomDeLaLigne(), "");
});

/** Les mots accordés, lus par le bilan comme par les lignes d'arbitrage. */
test("une nature se dit en français, et s'accorde", () => {
  assert.equal(motDeLaNature(ITEM_TYPE.FERMETURE, 1), "sujet à fermer");
  assert.equal(motDeLaNature(ITEM_TYPE.FERMETURE, 3), "sujets à fermer");
  // Une nature qu'on ne connaît pas se dit telle quelle plutôt que de disparaître.
  assert.equal(motDeLaNature("base-datum", 1), "base-datum");
});
