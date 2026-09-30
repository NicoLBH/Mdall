import test from "node:test";
import assert from "node:assert/strict";

import { DOMAINS, normalizeDomain } from "./assertion-taxonomy.js";
import { GENRE, INDICES, leDomaineDuTexte, lesIndicesDuTexte } from "./les-references-citees.js";

/**
 * **Chaque ligne désigne un domaine que la taxonomie connaît.** Une faute de
 * frappe y ferait un domaine que `classifyAssertion` refuse, et le constat
 * sortirait sans domaine — silencieusement.
 */
test("chaque indice désigne un domaine connu et un genre connu", () => {
  for (const indice of INDICES) {
    assert.equal(normalizeDomain(indice.domaine), indice.domaine, indice.dit);
    assert.ok(DOMAINS.includes(indice.domaine), indice.dit);
    assert.ok(Object.values(GENRE).includes(indice.genre), indice.dit);
    assert.ok(indice.dit.length > 0);
    assert.ok(indice.marque instanceof RegExp, indice.dit);
  }
});

test("une référence citée donne son domaine", () => {
  const dit = "Merci de vérifier au regard de l'art. CO 24 et de l'IT 246.";
  const indices = lesIndicesDuTexte(dit);
  assert.ok(indices.every((un) => un.domaine === "incendie"));
  assert.equal(leDomaineDuTexte(dit), "incendie");
  // Et l'on garde ce qui a été trouvé : c'est ce que l'écran montrera pour
  // qu'on puisse le refuser.
  assert.ok(indices.some((un) => /CO\s*24/.test(un.trouve)));
});

test("une mission géotechnique désigne le sol, et pas la structure", () => {
  assert.equal(leDomaineDuTexte("La mission G2 AVP conclut à des fondations profondes."), "sol");
  assert.equal(leDomaineDuTexte("cf. DTU 13.2 pour les pieux"), "sol");
  assert.equal(leDomaineDuTexte("L'Eurocode 7 impose une vérification."), "sol");
});

/**
 * L'Eurocode 7 est géotechnique, les autres sont de structure. Les ranger tous
 * ensemble aurait fait passer un sujet de sol pour un sujet de structure — et
 * la mesure aurait compté juste sur un domaine faux.
 */
test("l'Eurocode 7 ne se range pas avec les autres Eurocodes", () => {
  assert.equal(leDomaineDuTexte("selon l'Eurocode 2"), "structure");
  assert.equal(leDomaineDuTexte("selon l'Eurocode 8"), "structure");
  assert.equal(leDomaineDuTexte("selon l'Eurocode 7"), "sol");
});

/**
 * **Deux lignes de la table peuvent dire la même chose** — « mission G2 » et
 * « G2 AVP ». Elles portent la même clé, et un seul indice en sort : deux en
 * feraient deux constats là où il n'y a qu'un sujet.
 */
test("deux lignes qui disent la même chose ne font qu'un indice", () => {
  const indices = lesIndicesDuTexte("La mission G2 AVP, dite aussi mission G 2, conclut.");
  assert.equal(indices.filter((un) => un.dit === "mission géotechnique").length, 1);
});

/**
 * **Un terme n'est pas une référence.** Il ne désigne qu'un domaine, mais c'est
 * un pas de plus vers l'interprétation : il est marqué, et l'on peut s'en
 * passer d'un seul argument.
 */
test("les termes se distinguent des références, et se retirent", () => {
  const dit = "Le désenfumage du hall reste à trancher.";
  const avec = lesIndicesDuTexte(dit);
  assert.deepEqual(avec.map((un) => un.genre), [GENRE.TERME]);
  assert.equal(leDomaineDuTexte(dit), "incendie");

  assert.deepEqual(lesIndicesDuTexte(dit, { sansLesTermes: true }), []);
  assert.equal(leDomaineDuTexte(dit, { sansLesTermes: true }), null);
});

test("retirer les termes ne retire pas les références", () => {
  const dit = "Désenfumage : voir IT 246.";
  assert.deepEqual(lesIndicesDuTexte(dit, { sansLesTermes: true }).map((un) => un.dit),
    ["instruction technique"]);
});

/**
 * **Deux domaines ne font pas un domaine.** Choisir le premier trouvé serait un
 * tirage au sort déguisé.
 */
test("un texte qui parle de deux domaines n'en désigne aucun", () => {
  const dit = "Le PLU impose 12 m, et le désenfumage reste à trancher.";
  assert.equal(lesIndicesDuTexte(dit).length, 2);
  assert.equal(leDomaineDuTexte(dit), null);
});

test("ce qui ne cite rien ne désigne rien", () => {
  assert.deepEqual(lesIndicesDuTexte("Bonjour, je vous renvoie les plans à jour."), []);
  assert.equal(leDomaineDuTexte("Bonjour, je vous renvoie les plans à jour."), null);
  assert.deepEqual(lesIndicesDuTexte(""), []);
  assert.deepEqual(lesIndicesDuTexte(null), []);
});

/**
 * **Un sigle n'est pas un mot.** « SSI » dans « SSI vous voulez » n'existe pas
 * en français, mais « PLU » se retrouve dans « plus » si la frontière de mot
 * est mal posée.
 */
test("un sigle ne se retrouve pas au milieu d'un mot", () => {
  assert.deepEqual(lesIndicesDuTexte("Il en faut plusieurs, et plus encore."), []);
  assert.deepEqual(lesIndicesDuTexte("le compresseur"), []);
  // **Et en capitales aussi** : un objet de mail est souvent tout en
  // majuscules, et « PLUSIEURS POINTS » y contient les trois lettres de PLU.
  assert.deepEqual(lesIndicesDuTexte("PLUSIEURS POINTS RESTENT OUVERTS"), []);
  assert.deepEqual(lesIndicesDuTexte("SURPLUS DE MATERIAU"), []);
  assert.deepEqual(lesIndicesDuTexte("Le PLU l'impose.").map((un) => un.domaine), ["urbanisme"]);
});

/**
 * Les articles du règlement ERP sont en majuscules. Les chercher sans tenir
 * compte de la casse ferait de « co 24 » — deux mots d'une phrase — un article
 * incendie.
 */
test("les articles du règlement ERP se lisent en majuscules", () => {
  assert.deepEqual(lesIndicesDuTexte("art. CO 24").map((un) => un.domaine), ["incendie"]);
  assert.deepEqual(lesIndicesDuTexte("nous avons co 24 heures de retard"), []);
});
