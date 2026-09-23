import assert from "node:assert/strict";
import test from "node:test";

import {
  DATEE_PAR, cequiAEteRevuDepuis, laValeurQuiFaitFoi, leJourDuneValeur,
  phraseDeCeQuiAEteRevu, phraseDuneValeurRetrospective
} from "./le-temps-des-valeurs.js";

/** Une valeur versée, avec ou sans la date de son document. */
const valeur = (dessus = {}) => ({
  id: "v-1",
  decided_at: "2026-09-20T10:00:00.000Z",
  payload: { subject: "altitude du site", value: "742,30 m" },
  ...dessus
});

/** La même, lue dans un document daté. */
const duDocument = (jour, dessus = {}) => valeur({
  ...dessus,
  payload: {
    subject: "altitude du site", value: "742,30 m",
    provenance: { type: "document", quoi: "rapport de sol", le: jour },
    ...(dessus.payload ?? {})
  }
});

// ── Le jour d'une valeur, et d'où il vient ────────────────────────────────

test("la date du document l'emporte sur celle du versement", () => {
  // C'est celui qui a versé qui a écrit la date de son document, et il en
  // savait plus que nous.
  assert.deepEqual(leJourDuneValeur(duDocument("12 mars 2026")),
    { jour: "2026-03-12", par: DATEE_PAR.DOCUMENT });
});

test("à défaut, la date du versement sert — et se dit comme telle", () => {
  // Une valeur dont on ne connaît que la date de saisie n'est pas une valeur
  // datée de son document : les deux ne se relisent pas pareil (règle 5).
  assert.deepEqual(leJourDuneValeur(valeur()),
    { jour: "2026-09-20", par: DATEE_PAR.VERSEMENT });
});

test("une valeur qu'on ne sait pas situer le dit, plutôt que de se taire", () => {
  assert.deepEqual(leJourDuneValeur(valeur({ decided_at: "", created_at: "" })),
    { jour: "", par: DATEE_PAR.RIEN });
  assert.equal(leJourDuneValeur(null).par, DATEE_PAR.RIEN);
});

test("une date de document à la française se lit aussi", () => {
  assert.equal(leJourDuneValeur(duDocument("12/03/2026")).jour, "2026-03-12");
});

// ── Laquelle fait foi ──────────────────────────────────────────────────────

test("le document le plus récent fait foi, quel que soit l'ordre des versements", () => {
  // **Le défaut, tel quel.** La valeur de mars a été versée en septembre, après
  // celle de juin : elle l'écrasait.
  const juin = duDocument("2026-06-01", { id: "v-juin", decided_at: "2026-06-05T09:00:00.000Z" });
  const mars = duDocument("2026-03-12", { id: "v-mars", decided_at: "2026-09-20T10:00:00.000Z" });

  const { enVigueur, retrospectives, surLesDocuments } = laValeurQuiFaitFoi([mars, juin]);
  assert.equal(enVigueur.id, "v-juin");
  assert.deepEqual(retrospectives.map((une) => une.id), ["v-mars"]);
  assert.equal(surLesDocuments, true);
});

test("sans aucune date de document, l'ordre ne change pas", () => {
  // **La dégradation est choisie.** Presque rien en mémoire ne porte la date de
  // son document ; basculer l'ordre sur une information absente ferait changer
  // de sens toute la mémoire en silence — le défaut même qu'on répare.
  const vieux = valeur({ id: "v-1", decided_at: "2026-06-05T09:00:00.000Z" });
  const neuf = valeur({ id: "v-2", decided_at: "2026-09-20T10:00:00.000Z" });

  const { enVigueur, retrospectives, surLesDocuments } = laValeurQuiFaitFoi([vieux, neuf]);
  assert.equal(enVigueur.id, "v-2", "le dernier versé l'emporte, comme avant");
  assert.deepEqual(retrospectives, [], "et rien n'est dit rétrospectif");
  assert.equal(surLesDocuments, false);
});

test("deux valeurs du même document se départagent au versement", () => {
  // C'est une correction de saisie, pas un décalage de temps.
  const un = duDocument("2026-06-01", { id: "v-1", decided_at: "2026-06-05T09:00:00.000Z" });
  const deux = duDocument("2026-06-01", { id: "v-2", decided_at: "2026-06-06T09:00:00.000Z" });
  assert.equal(laValeurQuiFaitFoi([un, deux]).enVigueur.id, "v-2");
  assert.deepEqual(laValeurQuiFaitFoi([un, deux]).retrospectives, []);
});

test("l'ordre est total : deux lectures rendent la même réponse", () => {
  // Sans ordre total, deux lectures des mêmes affirmations garderaient deux
  // valeurs différentes, et le projet changerait d'avis sans que rien ne bouge.
  const un = duDocument("2026-06-01", { id: "v-a", decided_at: "2026-06-05T09:00:00.000Z" });
  const deux = duDocument("2026-06-01", { id: "v-b", decided_at: "2026-06-05T09:00:00.000Z" });
  assert.equal(laValeurQuiFaitFoi([un, deux]).enVigueur.id,
    laValeurQuiFaitFoi([deux, un]).enVigueur.id);
});

test("une valeur sans date de document ne devient pas rétrospective par défaut", () => {
  // **Seule une date de document autorise le mot.** Elle n'a pas de document
  // connu : on ne sait pas si elle vient d'avant ou d'après, et sa date de
  // versement ne dit rien du chantier. Ne pas savoir n'est pas « elle arrive
  // après coup » (règle 5).
  const datee = duDocument("2026-06-01", { id: "v-datee", decided_at: "2026-06-05T09:00:00.000Z" });
  const nue = valeur({ id: "v-nue", decided_at: "2026-01-02T09:00:00.000Z" });
  assert.deepEqual(laValeurQuiFaitFoi([datee, nue]).retrospectives, []);
});

test("aucun candidat ne rend aucune valeur en vigueur", () => {
  assert.deepEqual(laValeurQuiFaitFoi([]), { enVigueur: null, retrospectives: [], surLesDocuments: false });
  assert.equal(laValeurQuiFaitFoi(null).enVigueur, null);
});

// ── Ce qu'une conclusion a lu et qu'on a revu depuis ──────────────────────

const ALTITUDE_MARS = duDocument("2026-03-12", { id: "alt-mars", decided_at: "2026-03-15T09:00:00.000Z" });
const ALTITUDE_SEPT = duDocument("2026-09-03", { id: "alt-sept", decided_at: "2026-09-05T09:00:00.000Z" });
const ENTREE = [{ sujet: "altitude du site", valeurId: "alt-mars", valeur: "742,30 m" }];

test("une conclusion qui a lu une valeur revue depuis le dit", () => {
  // Elle a l'air d'être d'aujourd'hui, et elle repose sur une valeur d'hier.
  const revues = cequiAEteRevuDepuis(ENTREE, [ALTITUDE_MARS, ALTITUDE_SEPT]);
  assert.deepEqual(revues, [{ sujet: "altitude du site", luLe: "2026-03-12", revuLe: "2026-09-03" }]);
});

test("une conclusion qui a lu la valeur en vigueur ne dit rien", () => {
  const revues = cequiAEteRevuDepuis(
    [{ sujet: "altitude du site", valeurId: "alt-sept" }], [ALTITUDE_MARS, ALTITUDE_SEPT]);
  assert.deepEqual(revues, []);
});

test("une valeur remplacée par un document plus ancien n'est pas « revue »", () => {
  // C'est la valeur de mars qui arrive après coup : elle n'a rien revu.
  const revues = cequiAEteRevuDepuis(
    [{ sujet: "altitude du site", valeurId: "alt-sept" }], [ALTITUDE_SEPT, ALTITUDE_MARS]);
  assert.deepEqual(revues, []);
});

test("sans date de document, on ne conclut rien", () => {
  // Dire qu'une conclusion est périmée sur une comparaison qu'on ne sait pas
  // faire serait pire que de se taire.
  const nue = valeur({ id: "alt-nue", decided_at: "2026-03-15T09:00:00.000Z" });
  const autre = valeur({ id: "alt-autre", decided_at: "2026-09-05T09:00:00.000Z" });
  assert.deepEqual(
    cequiAEteRevuDepuis([{ sujet: "altitude du site", valeurId: "alt-nue" }], [nue, autre]), []);
});

test("une entrée qui n'est plus dans la mémoire ne dit rien", () => {
  // « elle a lu l'altitude, et l'altitude n'est plus là » est un autre défaut,
  // qui a déjà sa rubrique.
  assert.deepEqual(cequiAEteRevuDepuis([{ sujet: "x", valeurId: "parti" }], [ALTITUDE_SEPT]), []);
});

// ── Ce que l'écran en dit ──────────────────────────────────────────────────

test("la phrase d'une valeur rétrospective ne dit pas qu'elle est fausse", () => {
  const dit = phraseDuneValeurRetrospective(ALTITUDE_MARS, ALTITUDE_SEPT);
  assert.match(dit, /document du 2026-03-12/);
  assert.match(dit, /document du 2026-09-03/);
  assert.match(dit, /elle ne l'a pas remplacée/);
  assert.equal(/fausse/.test(dit), false, dit);
});

test("la phrase se tait quand l'une des deux n'est datée que par son versement", () => {
  // Écrire « un document du 20 septembre » sur une date de saisie ferait dire à
  // la phrase exactement ce que tout ce module sert à distinguer.
  assert.equal(phraseDuneValeurRetrospective(valeur(), ALTITUDE_SEPT), "");
  assert.equal(phraseDuneValeurRetrospective(ALTITUDE_MARS, valeur()), "");
  assert.equal(phraseDuneValeurRetrospective(null, null), "");
});

test("la phrase des valeurs revues nomme les sujets, et dit qu'on n'a rien refait", () => {
  // « repose sur une valeur revue » sans dire laquelle envoie tout relire.
  const dit = phraseDeCeQuiAEteRevu(
    [{ sujet: "altitude du site", luLe: "2026-03-12", revuLe: "2026-09-03" }]);
  assert.match(dit, /altitude du site \(lu au 2026-03-12, revu au 2026-09-03\)/);
  assert.match(dit, /n'a pas été refaite/);
});

test("rien à dire ne fait pas de rubrique", () => {
  assert.equal(phraseDeCeQuiAEteRevu([]), "");
  assert.equal(phraseDeCeQuiAEteRevu(null), "");
  assert.equal(phraseDeCeQuiAEteRevu([{ sujet: "" }]), "");
});

// ── Les cas que la batterie a trouvés muets ───────────────────────────────

test("une valeur que seul `created_at` date reste datée", () => {
  // La base écrit les deux ; une ligne importée n'a parfois que celle-là. La
  // laisser sans jour la ferait passer pour la plus ancienne de toutes, et elle
  // se ferait écraser par n'importe quoi.
  const importee = { id: "v-9", created_at: "2026-04-02T10:00:00.000Z", payload: { subject: "altitude du site" } };

  assert.deepEqual(leJourDuneValeur(importee), { jour: "2026-04-02", par: DATEE_PAR.VERSEMENT });
});

test("rien n'est rétrospectif tant que la valeur qui fait foi n'est pas datée d'un document", () => {
  // Le piège : la tête n'est datée que de son versement — un 20 septembre —, et
  // l'autre sort d'un document du 12 mars. Comparer les deux jours reviendrait à
  // comparer une date de saisie à une date de chantier, et à écrire
  // « arrivée après coup » sur ce qu'on ne sait pas situer (règle 5).
  const saisieTard = valeur({ id: "saisie", decided_at: "2026-09-20T10:00:00.000Z" });
  const deMars = duDocument("12 mars 2026", { id: "mars", decided_at: "2026-03-15T10:00:00.000Z" });

  const { enVigueur, retrospectives } = laValeurQuiFaitFoi([saisieTard, deMars]);

  assert.equal(enVigueur.id, "saisie");
  assert.deepEqual(retrospectives, []);
});

test("une conclusion dont on ignore d'où vient ce qu'elle a lu ne se dit pas dépassée", () => {
  // Ce qu'elle a lu n'est daté que de son versement. Même si ce qui fait foi
  // aujourd'hui vient d'un document du 12 juin, on ne sait pas si la valeur lue
  // est plus ancienne ou plus récente que lui : on se tait.
  // Et sa date de saisie tombe **avant** le document qui fait foi : sans le
  // garde, on écrirait « lu au 2026-02-01, revu au 2026-06-12 » en comparant une
  // date de bureau à une date de chantier.
  const lue = valeur({ id: "lue", decided_at: "2026-02-01T10:00:00.000Z" });
  const enVigueur = duDocument("12 juin 2026", { id: "juin", decided_at: "2026-09-25T10:00:00.000Z" });

  assert.deepEqual(
    cequiAEteRevuDepuis([{ sujet: "altitude du site", valeurId: "lue" }], [lue, enVigueur]),
    []
  );
});

test("un sujet que la mémoire ne porte pas ne fait rien dire", () => {
  // La lecture nomme un sujet dont il ne reste rien. Ne pas savoir n'autorise
  // pas à prétendre qu'il a été revu.
  const lue = duDocument("12 mars 2026", { id: "lue" });

  assert.deepEqual(cequiAEteRevuDepuis([{ sujet: "portance du sol", valeurId: "lue" }], [lue]), []);
});
