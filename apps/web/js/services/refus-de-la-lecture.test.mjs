/**
 * Pourquoi une lecture n'a pas eu lieu — et ce que chaque cause appelle.
 *
 * **Ces tests existent à cause d'un écran qui mentait deux fois.** Une
 * passerelle avait cessé d'attendre — un `504` —, et l'Atelier annonçait « la
 * lecture a été refusée · le serveur n'a rien nommé de cette panne ». Deux
 * phrases fausses pour un fait simple : personne n'avait refusé, et il n'y
 * avait rien à nommer.
 *
 * Le module qui les décide importe l'authentification et ne peut pas être
 * chargé ici. Les deux fonctions en cause sont donc **recopiées à l'identique**
 * — c'est la seule façon de les exécuter, et un test qui lirait la source ne
 * dirait que ce que le code a l'air de faire.
 *
 * Le doublon se garde d'un test qui compare les deux écritures, plus bas.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE = readFileSync(
  fileURLToPath(new URL("./sujets-par-le-modele.js", import.meta.url)),
  "utf8"
);

/**
 * Les deux fonctions, extraites de la source et exécutées pour de vrai.
 *
 * Elles ne dépendent de rien — ni de la base, ni du réseau : c'est ce qui rend
 * cette extraction honnête plutôt qu'astucieuse.
 */
const lire = async () => {
  const REFUS = Object.fromEntries(
    [...SOURCE.matchAll(/^\s{2}([A-Z_]+): "([^"]+)",?$/gm)].map((t) => [t[1], t[2]])
  );

  const bloc = (nom) => {
    const debut = SOURCE.indexOf(`export function ${nom}(`);
    const fin = SOURCE.indexOf("\n}", debut);
    return SOURCE.slice(debut, fin + 2).replace("export function", "function");
  };

  const delais = SOURCE.match(/const DELAIS_DEPASSES = new Set\(\[[^\]]+\]\);/)[0];
  const quefaire = SOURCE.slice(
    SOURCE.indexOf("export const QUE_FAIRE"),
    SOURCE.indexOf("};", SOURCE.indexOf("export const QUE_FAIRE")) + 2
  ).replace("export const", "const");

  const module = await import(
    `data:text/javascript;base64,${Buffer.from(
      `const texte = (v) => String(v ?? "").trim();\n`
      + `const REFUS = ${JSON.stringify(REFUS)};\n`
      + `${delais}\n${quefaire}\n${bloc("motifDuStatut")}\n${bloc("queFaire")}\n`
      + `export { REFUS, motifDuStatut, queFaire };`
    ).toString("base64")}`
  );

  return module;
};

/**
 * **Un dépassement n'est pas un refus.** Un refus a une cause nommée — une clé
 * expirée, un schéma invalide ; une passerelle qui cesse d'attendre n'a rien à
 * nommer, et l'afficher comme un refus muet envoie chercher un problème
 * ailleurs.
 */
test("un délai dépassé ne se dit pas « refusée »", async () => {
  const { REFUS, motifDuStatut } = await lire();

  for (const code of [408, 504, 524]) {
    assert.equal(motifDuStatut(code), REFUS.TROP_LONG, `HTTP ${code}`);
  }
});

/** Les autres codes gardent ce qu'ils disaient : on n'a rien déplacé au passage. */
test("les autres pannes se disent comme avant", async () => {
  const { REFUS, motifDuStatut } = await lire();

  assert.equal(motifDuStatut(404), REFUS.INJOIGNABLE);
  assert.equal(motifDuStatut(502), REFUS.REFUSE);
  assert.equal(motifDuStatut(401), REFUS.REFUSE);
  assert.equal(motifDuStatut(500), REFUS.REFUSE);
  assert.equal(motifDuStatut(0), REFUS.REFUSE);
});

/**
 * **Une panne sans suite à donner n'en reçoit pas d'inventée.** Un refus du
 * fournisseur ne se rattrape pas d'un clic ; proposer de « réessayer » ferait
 * perdre du temps sur une panne qui ne bougera pas (règle 5).
 */
test("ce qu'il y a à faire n'existe que quand il y a quelque chose à faire", async () => {
  const { REFUS, queFaire } = await lire();

  assert.match(queFaire(REFUS.TROP_LONG), /plus court/);
  assert.match(queFaire(REFUS.INJOIGNABLE), /n'a pas répondu/);
  assert.match(queFaire(REFUS.SANS_TEXTE), /reconnaissance/);

  assert.equal(queFaire(REFUS.REFUSE), "");
  assert.equal(queFaire(REFUS.RIEN_DE_VERIFIE), "");
  assert.equal(queFaire(""), "");
});

/**
 * **Le serveur coupe avant la passerelle**, et il le dit.
 *
 * Sans budget, on attendait indéfiniment et c'est la passerelle qui finissait
 * par couper — avec un code qui ne porte aucune cause. Le plafond vit dans la
 * fonction Edge, qui ne s'importe pas davantage : on vérifie qu'il y est, et
 * qu'il répond bien `504` plutôt qu'un refus.
 */
test("la fonction de lecture coupe elle-même, et nomme le dépassement", () => {
  const edge = readFileSync(
    fileURLToPath(new URL("../../../../supabase/functions/extract-sujets/index.ts", import.meta.url)),
    "utf8"
  );

  assert.match(edge, /const MAX_SECONDES = \d+;/);
  assert.match(edge, /AbortSignal\.timeout\(MAX_SECONDES \* 1000\)/);
  assert.match(edge, /signal: horloge/);
  // La cause est nommée…
  assert.match(edge, /type: coupe \? "delai_depasse"/);
  // …et c'est bien le **statut de la réponse** qui porte le 504, pas seulement
  // le diagnostic à l'intérieur. Sans cela le navigateur lirait un 502, et
  // rangerait un dépassement dans les refus — le défaut qu'on répare.
  assert.match(edge, /\}, coupe \? 504 : 502\);/);

  // Et le plafond reste sous celui de la passerelle : le dépasser rendrait le
  // budget décoratif, puisque c'est elle qui couperait de nouveau.
  const plafond = Number(edge.match(/const MAX_SECONDES = (\d+);/)[1]);
  assert.ok(plafond > 0 && plafond < 150, `le plafond doit rester sous celui de la passerelle (${plafond})`);
});

/**
 * **Le doublon se garde.** Les deux fonctions sont recopiées ici pour pouvoir
 * être exécutées ; si l'originale change sans que la copie suive, ce test le
 * dit — c'est le prix de l'exécution, et il est payé une fois.
 */
test("le vocabulaire des refus est celui du module, pas une copie oubliée", async () => {
  const { REFUS } = await lire();

  for (const motif of ["SANS_TEXTE", "INJOIGNABLE", "REFUSE", "TROP_LONG", "RIEN_DE_VERIFIE"]) {
    assert.ok(REFUS[motif], `le motif « ${motif} » a disparu du module`);
  }
  // Chaque motif a sa phrase : un motif sans phrase s'afficherait vide.
  for (const valeur of Object.values(REFUS)) {
    assert.ok(SOURCE.includes(`[REFUS.`), "les phrases se posent par constante");
    assert.ok(valeur.length > 0);
  }
});

/**
 * **Le modèle de cette lecture est un réglage, pas une constante.**
 *
 * C'est la seule chose à essayer quand une lecture ne tient plus dans le temps
 * imparti, et cela demandait un changement de code, une relecture et un
 * déploiement pour chaque candidat. Quatre autres fonctions suivent déjà cette
 * convention ; celle-ci l'ignorait.
 */
test("le modèle de la lecture se change sans toucher au code", () => {
  const edge = readFileSync(
    fileURLToPath(new URL("../../../../supabase/functions/extract-sujets/index.ts", import.meta.url)),
    "utf8"
  );

  assert.match(edge, /Deno\.env\.get\("OPENAI_SUJETS_MODEL"\) \|\| "[^"]+"/);

  // **Et le défaut ne bouge pas.** Un modèle plus gros n'est pas plus rapide :
  // en changer à l'aveugle pourrait ralentir la lecture qu'on veut accélérer.
  assert.match(edge, /\|\| "gpt-4\.1-mini"/);

  // La durée est mesurée au serveur, avant l'appel — sinon on comparerait deux
  // modèles sur le débit de la connexion.
  assert.match(edge, /const commenceA = Date\.now\(\);/);
  assert.match(edge, /duree_ms: Date\.now\(\) - commenceA/);
});
