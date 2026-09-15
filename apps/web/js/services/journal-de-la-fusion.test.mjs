/**
 * Ce qu'une fusion fait, étape par étape.
 *
 * Fusionner une proposition prend une douzaine de gestes et une minute et
 * demie. Pendant ce temps l'écran montrait une roue ; après, plus rien. Ces
 * tests portent sur ce qui est conservé : les étapes dans leur ordre, ce que
 * chacune a pris, et ce qu'on lit quand l'une n'a pas tenu.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  ETAPES_DE_LA_FUSION, GESTE, chronoDeLaFusion, nomDeLaFusion, resumeDeLaFusion, statutDeLaFusion
} from "./journal-de-la-fusion.js";
import { NIVEAU, STATUT } from "./run-journal.js";

/** Une horloge qu'on avance à la main : mesurer en dormant mesure le sommeil. */
function horlogeFeinte(depart = 1_000) {
  let maintenant = depart;
  return {
    horloge: () => maintenant,
    avancer: (ms) => { maintenant += ms; }
  };
}

test("chaque étape porte sa durée, mesurée entre son début et sa fin", () => {
  const { horloge, avancer } = horlogeFeinte();
  const chrono = chronoDeLaFusion({ horloge });

  const gel = chrono.etape("gel");
  avancer(120);
  gel.fini();

  const corpus = chrono.etape("corpus");
  avancer(4_300);
  corpus.fini();

  const etapes = chrono.etapes();
  assert.deepEqual(etapes.map((etape) => [etape.id, etape.ms]), [["gel", 120], ["corpus", 4_300]]);
  // Et le total, qui n'est pas la somme : il court aussi entre les étapes.
  assert.equal(chrono.ms(), 4_420);
});

/**
 * **Une étape ouverte figure déjà au journal.** Une fusion interrompue doit
 * laisser voir où elle en était ; un journal qui s'arrête sans dire qu'il
 * s'arrête ne se distingue pas d'un journal qui n'a rien vu.
 */
test("une étape en cours figure au journal, sans durée", () => {
  const chrono = chronoDeLaFusion({ horloge: horlogeFeinte().horloge });
  chrono.etape("memoire");

  const [etape] = chrono.etapes();
  assert.equal(etape.id, "memoire");
  // `null` n'est pas zéro : elle n'a pas duré « 0 ms », elle n'est pas finie.
  assert.equal(etape.ms, null);
  assert.equal(etape.lignes, null);
});

/** Les libellés viennent de la liste nommée : un seul endroit les décide. */
test("une étape connue se nomme toute seule", () => {
  const chrono = chronoDeLaFusion({ horloge: horlogeFeinte().horloge });
  chrono.etape("sujets").fini();
  chrono.etape("inconnue").fini();
  chrono.etape("lots", "Lots du chantier").fini();

  assert.deepEqual(chrono.etapes().map((etape) => etape.label), [
    "Sujets ouverts",
    // Une étape qu'on n'a pas nommée se dit par sa clé plutôt que par un vide.
    "inconnue",
    // Et un libellé donné sur place l'emporte.
    "Lots du chantier"
  ]);
});

/**
 * **Le statut se déduit de ce qui a été écrit.** Une étape qui a consigné un
 * échec est en échec, quoi qu'en dise l'appelant : l'inverse laisserait passer
 * une étape verte au journal rouge.
 */
test("une étape qui consigne un échec est en échec", () => {
  const chrono = chronoDeLaFusion({ horloge: horlogeFeinte().horloge });

  const memoire = chrono.etape("memoire");
  memoire.dire("48 affirmations à verser");
  memoire.echouer("La base n'a pas répondu.");
  memoire.fini(STATUT.OK);

  const [etape] = chrono.etapes();
  assert.equal(etape.statut, STATUT.ECHEC);
  assert.equal(etape.lignes.length, 2);
  assert.equal(etape.lignes[1].niveau, NIVEAU.ECHEC);
});

/** Un avertissement n'est pas un échec : la fusion a tenu, et quelque chose se dit. */
test("un avertissement laisse l'étape debout", () => {
  const chrono = chronoDeLaFusion({ horloge: horlogeFeinte().horloge });
  const etape = chrono.etape("corpus");
  etape.avertir("2 livrables n'ont pas été rapatriés");
  etape.fini();

  assert.equal(chrono.etapes()[0].statut, STATUT.OK);
});

/** Une étape qui jette écrit son message, puis tombe. */
test("une étape ratée dit pourquoi", () => {
  const chrono = chronoDeLaFusion({ horloge: horlogeFeinte().horloge });
  chrono.etape("lots").rate(new Error("lots: 409 duplicate key"));

  const [etape] = chrono.etapes();
  assert.equal(etape.statut, STATUT.ECHEC);
  assert.match(etape.lignes[0].texte, /409 duplicate key/);

  // Sans message, on dit qu'on ne sait pas plutôt que de laisser un blanc.
  const muette = chronoDeLaFusion({ horloge: horlogeFeinte().horloge });
  muette.etape("suivi").rate(null);
  assert.match(muette.etapes()[0].lignes[0].texte, /n'a pas répondu/);
});

/**
 * **Une étape qui échoue n'arrête pas le chronomètre**, parce qu'une fusion ne
 * s'arrête pas non plus : les documents sont entrés, le reste se rattrape.
 * Marquer « non atteinte » ce qui a bel et bien eu lieu serait un mensonge.
 */
test("ce qui suit un échec continue de se mesurer", () => {
  const { horloge, avancer } = horlogeFeinte();
  const chrono = chronoDeLaFusion({ horloge });

  chrono.etape("memoire").rate(new Error("coupé"));
  const sujets = chrono.etape("sujets");
  avancer(900);
  sujets.fini();

  assert.deepEqual(chrono.etapes().map((etape) => [etape.statut, etape.ms]), [
    [STATUT.ECHEC, 0],
    [STATUT.OK, 900]
  ]);
});

/* ── Ce qu'on lit avant d'ouvrir le détail ───────────────────────────────── */

test("le résumé dit le résultat, et nomme ce qui n'a pas abouti", () => {
  assert.equal(
    resumeDeLaFusion([{ statut: STATUT.OK }, { statut: STATUT.OK }]),
    "2 étapes, toutes abouties."
  );

  assert.match(
    resumeDeLaFusion([
      { statut: STATUT.OK, label: "Documents entrés au corpus" },
      { statut: STATUT.ECHEC, label: "Mémoire du projet écrite" }
    ]),
    /1 étape sur 2 n'a pas abouti : Mémoire du projet écrite\./
  );

  // Rien d'enregistré se dit aussi : un résumé vide se lirait comme un succès.
  assert.equal(resumeDeLaFusion([]), "Aucune étape enregistrée.");
});

test("une seule étape ratée fait tomber la fusion entière", () => {
  assert.equal(statutDeLaFusion([{ statut: STATUT.OK }, { statut: STATUT.ECHEC }]), STATUT.ECHEC);
  assert.equal(statutDeLaFusion([{ statut: STATUT.OK }]), STATUT.OK);
  assert.equal(statutDeLaFusion(), STATUT.OK);
});

/** Le nom porte le numéro : c'est par lui qu'on remonte à la décision. */
test("l'exécution se nomme par la proposition qui l'a causée", () => {
  assert.equal(nomDeLaFusion({ number: 16 }), "Fusion de la proposition #16");
  assert.equal(nomDeLaFusion({ number: 0 }), "Fusion d'une proposition");
  assert.equal(nomDeLaFusion(), "Fusion d'une proposition");
});

/** Les identifiants d'étape ne bougent plus : un journal déjà écrit les porte. */
test("les étapes de la fusion sont nommées à un seul endroit", () => {
  assert.equal(GESTE.FUSION, "fusion");
  const ids = ETAPES_DE_LA_FUSION.map(([id]) => id);
  assert.equal(new Set(ids).size, ids.length, "deux étapes ne partagent pas une clé");
  assert.ok(ids.includes("gel") && ids.includes("suivi"));
});


/**
 * **Les clés d'étape doivent exister des deux côtés.**
 *
 * La fusion vit dans un écran qu'aucun test ne peut importer — il charge
 * l'authentification —, et une clé mal tapée n'y casserait rien : l'étape
 * s'écrirait quand même, et le graphe afficherait `secretaria` en guise de nom
 * pour toujours, dans un journal qu'on ne réécrit pas. C'est exactement le cas
 * où lire la source vaut mieux que de ne rien vérifier.
 */
test("la fusion n'ouvre que des étapes nommées", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const source = readFileSync(
    fileURLToPath(new URL("../views/project-propositions.js", import.meta.url)),
    "utf8"
  );

  const connues = new Set(ETAPES_DE_LA_FUSION.map(([id]) => id));
  const ouvertes = [...source.matchAll(/chrono\.etape\("([^"]+)"/g)].map((trouve) => trouve[1]);

  assert.ok(ouvertes.length >= 8, `la fusion doit journaliser son chemin (${ouvertes.length} étapes)`);
  for (const id of ouvertes) {
    // « fusion » est l'étape de secours : celle qu'on ouvre quand tout s'est
    // arrêté avant d'avoir pu en nommer une autre.
    if (id === "fusion") continue;
    assert.ok(connues.has(id), `étape inconnue ouverte par la fusion : ${id}`);
  }

  // Et le journal se ferme, quoi qu'il arrive : s'arrêter d'écrire au premier
  // échec ne garderait que les fusions dont on n'a pas besoin.
  assert.match(source, /await fermerLaCourseDeFusion\(enCours, proposition, chrono\)/);
});

/**
 * **Les lots se rangent après le secrétariat, et l'ordre est une correction.**
 *
 * Un sujet père a besoin de deux choses qui n'arrivent pas en même temps : ses
 * fils, ouverts à l'étape des sujets, et son label, créé par le secrétariat.
 * Ouvert entre les deux, il cherchait « LOT » dans un projet qui ne l'avait pas
 * encore : il naissait sans, la vue `label:LOT` ne rendait rien, et la seule
 * trace était un avertissement au fond du journal.
 *
 * Cet ordre ne se relit nulle part ailleurs : si quelqu'un remonte l'étape des
 * pères un jour, ce test est ce qui le dira.
 */
test("les lots se rangent après les sujets et après le secrétariat", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const source = readFileSync(
    fileURLToPath(new URL("../views/project-propositions.js", import.meta.url)),
    "utf8"
  );

  const rang = (id) => source.indexOf(`chrono.etape("${id}")`);

  assert.ok(rang("sujets") > 0 && rang("secretariat") > 0 && rang("peres") > 0);
  assert.ok(rang("peres") > rang("sujets"), "un lot se remplit de ce qui vient d'être ouvert");
  assert.ok(rang("peres") > rang("secretariat"), "un lot porte un label que le secrétariat crée");

  // Et la liste nommée dit la même chose : deux ordres finiraient par ne plus
  // s'accorder, et c'est celui qu'on ne regarde pas qui aurait raison.
  const ids = ETAPES_DE_LA_FUSION.map(([id]) => id);
  assert.ok(ids.indexOf("peres") > ids.indexOf("secretariat"));
});
