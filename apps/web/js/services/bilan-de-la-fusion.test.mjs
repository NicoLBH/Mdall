/**
 * Promettre, faire, et dire l'écart.
 *
 * Une proposition annonçait trente-quatre sujets à fermer ; la fusion en a fermé
 * cinq. Les vingt-neuf autres avaient été écartés — c'était une décision, et
 * elle était juste —, mais rien ne l'a dit : ni avant de signer, ni après. Du
 * dehors, « on a décidé de ne pas le faire » et « ça n'a pas marché » se
 * ressemblent, et c'est la seconde qu'on croit.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  bilanDeLaFusion, cequiEstPorte, phraseDeCeQuOnEcarte, phraseDuBilan
} from "./bilan-de-la-fusion.js";
import { ITEM_TYPE } from "./proposition-review.js";
import { ITEM } from "./proposition-state.js";

const ligne = (itemType, status = ITEM.PROPOSED) => ({ itemType, itemKey: `k-${Math.random()}`, status });

const TRENTE_QUATRE = [
  ...Array.from({ length: 5 }, () => ligne(ITEM_TYPE.FERMETURE)),
  ...Array.from({ length: 29 }, () => ligne(ITEM_TYPE.FERMETURE, ITEM.REFUSED)),
  ligne(ITEM_TYPE.DOCUMENT)
];

test("ce qui est porté se compte par nature, retenu et écarté séparément", () => {
  const comptes = cequiEstPorte(TRENTE_QUATRE);
  const fermetures = comptes.find((compte) => compte.nature === ITEM_TYPE.FERMETURE);

  assert.equal(fermetures.portees, 34);
  assert.equal(fermetures.ecartees, 29);
  assert.equal(fermetures.retenues, 5);
});

/**
 * **Avant de signer, pendant que la question se pose encore.** C'est là qu'on
 * peut décocher, recocher, revenir en arrière. Le dire après ne sert qu'à
 * expliquer un écart qu'on ne peut plus corriger.
 */
test("ce qui ne sera pas appliqué se dit avant la signature", () => {
  const dite = phraseDeCeQuOnEcarte(TRENTE_QUATRE);

  assert.match(dite, /29 sujets à fermer sur 34/);
  assert.match(dite, /non appliqué/);
});

/** Le silence quand tout est retenu : une phrase à zéro finit par ne plus être lue. */
test("quand rien n'est écarté, il n'y a rien à dire", () => {
  assert.equal(phraseDeCeQuOnEcarte([ligne(ITEM_TYPE.FERMETURE), ligne(ITEM_TYPE.DOCUMENT)]), "");
  assert.equal(phraseDeCeQuOnEcarte([]), "");
});

/**
 * **Le rapprochement est tout.** « 5 sujets fermés » ne dit pas si c'est le
 * chiffre attendu ; « 5 sur 34 — 29 écartés » le dit.
 */
test("le bilan rapproche ce qui était porté de ce qui a été fait", () => {
  const bilan = bilanDeLaFusion({
    items: TRENTE_QUATRE,
    rapport: { fermetures: 5, relances: 0, manques: [] }
  });

  const fermetures = bilan.lignes.find((l) => l.nature === ITEM_TYPE.FERMETURE);
  assert.equal(fermetures.portees, 34);
  assert.equal(fermetures.faites, 5);
  assert.equal(bilan.ecartees, 29);

  const dite = phraseDuBilan(bilan);
  assert.match(dite, /5 sujets à fermer sur 34 — 29 écartés/);
  // **Écarté n'est pas raté.** Les confondre ferait chercher une panne là où il
  // y a eu une décision.
  assert.match(dite, /Écarté n'est pas raté/);
});

/**
 * **Ne pas savoir n'autorise pas à écrire zéro** (règle 5). Une nature que
 * l'application ne compte pas rend `null`, et la ligne montre alors ce qui était
 * retenu plutôt qu'un zéro qui ferait croire à un échec total.
 */
test("une nature que l'application ne compte pas ne s'annonce pas à zéro", () => {
  const bilan = bilanDeLaFusion({
    items: [ligne(ITEM_TYPE.DOCUMENT), ligne(ITEM_TYPE.DOCUMENT, ITEM.REFUSED)],
    rapport: { fermetures: 0, manques: [] }
  });

  assert.equal(bilan.lignes[0].faites, null);
});

/** Une fusion qui fait exactement ce qu'elle portait n'a rien à expliquer. */
test("sans écart, le bilan se tait", () => {
  const bilan = bilanDeLaFusion({
    items: [ligne(ITEM_TYPE.FERMETURE)],
    rapport: { fermetures: 1, manques: [] }
  });

  assert.equal(phraseDuBilan(bilan), "");
});

/** Un arbitrage n'est pas un geste sur le projet : il ne s'annonce pas. */
test("un arbitrage ne se compte pas parmi ce que la fusion ferait", () => {
  assert.deepEqual(cequiEstPorte([ligne(ITEM_TYPE.ARBITRAGE)]), []);
});
