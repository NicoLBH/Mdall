import test from "node:test";
import assert from "node:assert/strict";

import {
  ETAPE, ETAPES, etapesDuRaisonnement, lacunesDuRaisonnement,
  phraseDesLacunesDuRaisonnement, raisonnementDuPoint, raisonnementRetenu,
  raisonnementVersable
} from "./raisonnement-du-point.js";
import { NATURE } from "./assertion-taxonomy.js";
import { cleDAffirmation, itemsDeProposition } from "./atelier-proposition.js";
import { decisionVersable } from "./decision-versement.js";
import { affirmationsDecideesDans, referenceDuPoint } from "./point-a-tranche.js";
import { ceQueCePointMetEnDebat, surQuoiCePointPorte } from "./point-porte-sur.js";
import { readFileSync } from "node:fs";

const LE_POINT = { id: "p-hors-gel", title: "Quelle profondeur de fondation retenir ?" };

/** Une affirmation de la mémoire, telle que la base la rend. */
function valeur(id, sujet, dite, charge = {}) {
  return {
    id,
    subject_key: sujet,
    payload: { subject: sujet, value: dite, ...charge },
    superseded_by: null
  };
}

/* ── La case se remplit ──────────────────────────────────────────────────── */

test("la nature déclarée depuis longtemps est enfin écrite", () => {
  // Elle était dans la taxonomie, avec sa définition, et personne ne l'écrivait.
  const [ligne] = raisonnementVersable({
    point: LE_POINT,
    question: "Quelle profondeur de fondation retenir ?",
    produites: [{ sujet: "Profondeur hors gel", valeur: "0,80 m" }]
  });

  assert.equal(ligne.nature, NATURE.RAISONNEMENT);
});

test("le graphe porte les cinq étapes, dans l'ordre", () => {
  const chemin = raisonnementDuPoint({
    point: LE_POINT,
    porteSur: [
      valeur("v-alt", "Altitude", "742,30"),
      valeur("v-sol", "Nature du sol", "moraine"),
      valeur("v-chauffe", "Bâtiment chauffé", "oui")
    ],
    examine: [
      { quoi: "étude géotechnique" },
      { quoi: "plan de niveau" },
      { quoi: "échange architecte / BC", ou: "12 mars" }
    ],
    produites: [
      { sujet: "Quelle profondeur de fondation retenir ?", valeur: "0,80 m", nature: NATURE.DECISION },
      { sujet: "Profondeur hors gel", valeur: "0,80 m" }
    ]
  });

  const lignes = etapesDuRaisonnement(chemin);

  assert.deepEqual(lignes.map((l) => l.etape), ETAPES);
  assert.deepEqual(lignes.map((l) => l.entrees), [
    ["Quelle profondeur de fondation retenir ?"],
    ["Altitude = 742,30", "Nature du sol = moraine", "Bâtiment chauffé = oui"],
    ["étude géotechnique", "plan de niveau", "échange architecte / BC (12 mars)"],
    ["Quelle profondeur de fondation retenir ? = 0,80 m"],
    ["Profondeur hors gel = 0,80 m"]
  ]);
  assert.deepEqual(lignes.filter((l) => l.manque), []);
});

test("la décision ne se lit pas deux fois", () => {
  // La ligne de décision porte la question ; celle qui la cite porte la valeur.
  // Les mettre toutes deux dans « PRODUIT » ferait lire deux fois la même chose,
  // et ferait croire que le débat a posé deux affirmations.
  const chemin = raisonnementDuPoint({
    point: LE_POINT,
    produites: [
      { sujet: "Quelle profondeur ?", valeur: "0,80 m", nature: NATURE.DECISION },
      { sujet: "Profondeur hors gel", valeur: "0,80 m" }
    ]
  });

  assert.deepEqual(chemin.decision, { sujet: "Quelle profondeur ?", valeur: "0,80 m" });
  assert.deepEqual(chemin.produit, [{ sujet: "Profondeur hors gel", valeur: "0,80 m" }]);
});

/* ── Ce qui manque se dit ────────────────────────────────────────────────── */

test("une étape vide porte son manque au lieu de disparaître", () => {
  // Un point dont personne n'a noté ce qu'il avait examiné n'est pas un point
  // qui n'a rien examiné (règle 5). Un graphe qui perd ses lignes creuses se lit
  // comme un raisonnement complet — et c'est ce qu'il n'est pas.
  const chemin = raisonnementDuPoint({
    point: LE_POINT,
    produites: [{ sujet: "Profondeur hors gel", valeur: "0,80 m" }]
  });

  const lignes = etapesDuRaisonnement(chemin);
  assert.equal(lignes.length, 5);

  assert.deepEqual(lacunesDuRaisonnement(chemin), [ETAPE.PORTE_SUR, ETAPE.EXAMINE, ETAPE.DECISION]);

  const creuse = lignes.find((l) => l.etape === ETAPE.EXAMINE);
  assert.equal(creuse.manque, true);
  assert.equal(creuse.parceQue, "on ne sait pas ce qui a été examiné");
});

test("les lacunes se disent en une phrase, et se taisent quand il n'y en a pas", () => {
  assert.equal(
    phraseDesLacunesDuRaisonnement([ETAPE.EXAMINE, ETAPE.PORTE_SUR]),
    "Ce raisonnement ne dit pas tout : on ne sait pas ce qui a été examiné, "
    + "on ne sait pas sur quelles valeurs il portait."
  );
  assert.equal(phraseDesLacunesDuRaisonnement([]), "");
});

test("sans question, il n'y a pas de raisonnement", () => {
  // Le pendant exact de la décision : une liste de choses regardées n'est pas un
  // raisonnement, et la traiter comme tel ferait entrer des lignes qui n'ont
  // rien à faire dans la mémoire.
  assert.equal(raisonnementDuPoint({ point: { id: "p-1" }, examine: [{ quoi: "un plan" }] }), null);
  assert.equal(raisonnementRetenu({ porteSur: [], produit: [] }), null);
  assert.deepEqual(raisonnementVersable({ point: { id: "p-1" } }), []);
  assert.deepEqual(etapesDuRaisonnement(null), []);
});

test("le titre du point sert de question quand personne n'en a écrit d'autre", () => {
  const chemin = raisonnementDuPoint({ point: LE_POINT });
  assert.equal(chemin.question, "Quelle profondeur de fondation retenir ?");
});

/* ── Il n'affirme rien ───────────────────────────────────────────────────── */

test("sa valeur est sa question, jamais le résultat", () => {
  // Rien ne le tranche : c'est sa définition dans la taxonomie. Recopier ici le
  // résultat en ferait deux vérités, et c'est celle qu'on ne regarde pas qui
  // finirait par avoir raison (règle 4). Le résultat vit sur la ligne produite.
  const [ligne] = raisonnementVersable({
    point: LE_POINT,
    produites: [{ sujet: "Profondeur hors gel", valeur: "0,80 m" }]
  });

  assert.equal(ligne.valeur, "Quelle profondeur de fondation retenir ?");
  assert.notEqual(ligne.valeur, "0,80 m");
});

test("une seule ligne : il n'a pas de conclusion à porter à côté de lui", () => {
  const lignes = raisonnementVersable({
    point: LE_POINT,
    produites: [{ sujet: "Profondeur hors gel", valeur: "0,80 m" }]
  });
  assert.equal(lignes.length, 1);
});

test("il signe comme la décision qu'il traverse, et cite le même point", () => {
  const [ligne] = raisonnementVersable({
    point: LE_POINT,
    par: "Ourdine Ferrand",
    quand: "12 mars 2026",
    produites: [{ sujet: "Profondeur hors gel", valeur: "0,80 m" }]
  });

  assert.equal(ligne.provenance.par, "Ourdine Ferrand");
  assert.equal(ligne.provenance.le, "12 mars 2026");
  assert.equal(
    ligne.provenance.quoi,
    "tranché dans le sujet « Quelle profondeur de fondation retenir ? » — Ourdine Ferrand, le 12 mars 2026"
  );
  // L'arête aval, et elle n'est pas écrite à la main ici.
  assert.equal(ligne.reference, referenceDuPoint(LE_POINT.id));
});

/* ── Il passe par la proposition, comme tout le reste ────────────────────── */

test("verser le raisonnement ne supprime ni la décision ni la valeur", () => {
  // Les trois portent le **même sujet** — c'est la question, et c'est ce qui les
  // relie par le nom. Sans préfixe, ils partageraient un `item_key`, et le
  // dernier versé effacerait les deux autres.
  const question = "Quelle profondeur de fondation retenir ?";

  const cles = [
    cleDAffirmation({ sujet: question, nature: NATURE.DECISION }),
    cleDAffirmation({ sujet: question, nature: NATURE.RAISONNEMENT }),
    cleDAffirmation({ sujet: question })
  ];

  assert.equal(new Set(cles).size, 3, `deux de ces clés se confondent : ${cles.join(" · ")}`);
  assert.match(cles[1], /^raisonnement:/);
});

test("la charge du raisonnement arrive entière dans la proposition", () => {
  // Sans ce transport, une ligne de nature « raisonnement » entrerait en mémoire
  // vide de ce qui la fait exister — et l'écran n'aurait rien à montrer.
  const [ligne] = raisonnementVersable({
    point: LE_POINT,
    porteSur: [valeur("v-alt", "Altitude", "742,30")],
    examine: [{ quoi: "étude géotechnique" }],
    produites: [{ sujet: "Profondeur hors gel", valeur: "0,80 m" }]
  });

  const [item] = itemsDeProposition([ligne]);

  assert.equal(item.payload.nature, NATURE.RAISONNEMENT);
  assert.equal(item.payload.raisonnement.question, "Quelle profondeur de fondation retenir ?");
  assert.deepEqual(item.payload.raisonnement.porteSur, [{ sujet: "Altitude", valeur: "742,30" }]);
  assert.deepEqual(item.payload.raisonnement.examine, [{ quoi: "étude géotechnique", ou: "" }]);
  assert.deepEqual(item.payload.raisonnement.produit, [{ sujet: "Profondeur hors gel", valeur: "0,80 m" }]);
  assert.equal(item.payload.raisonnement.point, LE_POINT.id);
});

test("ce qu'on n'a pas déclaré ne voyage pas", () => {
  const [item] = itemsDeProposition([{
    sujet: "Profondeur hors gel",
    valeur: "0,80 m",
    raisonnement: { porteSur: [{ sujet: "Altitude" }] }
  }]);

  assert.equal(item.payload.raisonnement, null);
});

/* ── Les deux arêtes se rejoignent ici, et seulement ici ─────────────────── */

test("le graphe se reconstruit du projet, par les deux arêtes", () => {
  // C'est ce que les étapes 2, 3 et 4 donnent ensemble : l'amont dit sur quoi le
  // débat portait, l'aval ce qu'il a posé, et chacune passe par son fichier.
  const memoire = [
    valeur("v-alt", "Altitude", "742,30"),
    valeur("v-sol", "Nature du sol", "moraine"),
    valeur("v-neige", "Zone de neige", "A2"),
    valeur("v-dec", "Quelle profondeur de fondation retenir ?", "0,80 m", {
      nature: NATURE.DECISION,
      reference: referenceDuPoint(LE_POINT.id)
    }),
    valeur("v-hg", "Profondeur hors gel", "0,80 m", { reference: referenceDuPoint(LE_POINT.id) })
  ];

  const liens = [
    { subject_id: LE_POINT.id, assertion_id: "v-alt" },
    { subject_id: LE_POINT.id, assertion_id: "v-sol" },
    // Une version que la lecture en cours ne porte pas — elle a pu être
    // filtrée, ou périmée hors du lot. On sait que le lien existe, on ne sait
    // pas ce qu'il vise : rendre un trou à sa place ferait compter une valeur
    // qu'on n'a pas, et l'écran dirait « porte sur » d'un nom vide.
    { subject_id: LE_POINT.id, assertion_id: "v-disparue" },
    { subject_id: "p-autre", assertion_id: "v-neige" }
  ];

  const chemin = raisonnementDuPoint({
    point: LE_POINT,
    porteSur: surQuoiCePointPorte(LE_POINT.id, { liens, assertions: memoire }),
    produites: affirmationsDecideesDans(LE_POINT.id, memoire)
  });

  assert.deepEqual(etapesDuRaisonnement(chemin).map((l) => l.entrees), [
    ["Quelle profondeur de fondation retenir ?"],
    ["Altitude = 742,30", "Nature du sol = moraine"],
    [],
    ["Quelle profondeur de fondation retenir ? = 0,80 m"],
    ["Profondeur hors gel = 0,80 m"]
  ]);
});

test("les lignes d'une décision qu'on vient de préparer se lisent aussi", () => {
  // Au moment où l'on ferme le point, rien n'est versé : le raisonnement doit
  // donc savoir lire les lignes **prêtes à proposer** autant que la mémoire.
  // Deux fonctions pour ces deux formes se seraient répondu de travers.
  const affirmations = decisionVersable({
    sujet: "Quelle profondeur de fondation retenir ?",
    retenu: "0,80 m",
    question: "Quelle profondeur de fondation retenir ?",
    ecartes: [{ quoi: "0,60 m", pourquoi: "sous la cote hors gel" }],
    motif: "étude géotechnique"
  });

  const chemin = raisonnementDuPoint({ point: LE_POINT, produites: affirmations });

  assert.deepEqual(chemin.decision, {
    sujet: "Quelle profondeur de fondation retenir ?",
    valeur: "0,80 m"
  });
  assert.deepEqual(chemin.produit, [{
    sujet: "Quelle profondeur de fondation retenir ?",
    valeur: "0,80 m"
  }]);
});


/* ── Ce sur quoi le débat portait, enfin écrit ───────────────────────────── */

test("un raisonnement porte les valeurs que le sujet mettait en débat", () => {
  // C'étaient ses **entrées**, et elles manquaient : le raisonnement s'écrivait
  // en disant « on ne sait pas sur quelles valeurs il portait » alors que les
  // arêtes étaient là, confirmées une par une.
  const memoire = [
    valeur("v-alt", "Altitude", "742,30"),
    valeur("v-sol", "Nature du sol", "moraine")
  ];
  const liens = [
    { subject_id: LE_POINT.id, assertion_id: "v-alt", declared_by: "u-1" },
    { subject_id: LE_POINT.id, assertion_id: "v-sol", declared_by: "u-1" }
  ];

  const [ligne] = raisonnementVersable({
    point: LE_POINT,
    question: LE_POINT.title,
    porteSur: ceQueCePointMetEnDebat(LE_POINT.id, { liens, assertions: memoire }),
    produites: decisionVersable({
      sujet: LE_POINT.title, retenu: "0,80 m", question: LE_POINT.title, motif: "étude géotechnique"
    })
  });

  assert.deepEqual(ligne.raisonnement.porteSur, [
    { sujet: "Altitude", valeur: "742,30" },
    { sujet: "Nature du sol", valeur: "moraine" }
  ]);
  assert.ok(!lacunesDuRaisonnement(ligne.raisonnement).includes(ETAPE.PORTE_SUR));
});

test("une arête que personne n'a confirmée n'entre pas dans le raisonnement", () => {
  // Elle n'a pas d'auteur : l'écrire enregistrerait, pour toujours, un
  // rapprochement de mots à la place d'un humain (règle 1). Le raisonnement dit
  // alors qu'il ne sait pas — ce qui est exact.
  const memoire = [valeur("v-alt", "Altitude", "742,30")];
  const liens = [{ subject_id: LE_POINT.id, assertion_id: "v-alt", declared_by: null }];

  const chemin = raisonnementDuPoint({
    point: LE_POINT,
    porteSur: ceQueCePointMetEnDebat(LE_POINT.id, { liens, assertions: memoire })
  });

  assert.deepEqual(chemin.porteSur, []);
  assert.ok(lacunesDuRaisonnement(chemin).includes(ETAPE.PORTE_SUR));
});

test("la fermeture d'un sujet passe bien ces entrées au raisonnement", () => {
  // Une garde sur le **texte** de la source, et c'est le seul cas où cela vaut :
  // un champ qu'on oublie de passer ne se voit nulle part. Le raisonnement
  // s'écrirait, la proposition partirait, et l'étape resterait creuse sans que
  // rien ne tombe.
  const source = readFileSync(
    new URL("../views/project-subjects/project-subjects-actions.js", import.meta.url), "utf8"
  );

  const appel = source.slice(source.indexOf("raisonnementVersable({"));
  assert.match(appel.slice(0, 400), /porteSur,/, "le raisonnement se verse sans ses entrées");

  // Et elles viennent des arêtes **confirmées**, pas de tout ce que l'écran
  // montre. Ce qu'on vérifie est donc l'absence de l'autre lecture : chercher la
  // présence du bon nom laisserait passer un alias, et c'est justement ainsi
  // qu'on se trompe de porte.
  assert.match(source, /\bceQueCePointMetEnDebat\b/, "la fermeture ne lit pas les arêtes confirmées");
  assert.doesNotMatch(source, /\bsurQuoiCePointPorte\b/,
    "la fermeture lit ce que l'écran montre, propositions comprises");
});
