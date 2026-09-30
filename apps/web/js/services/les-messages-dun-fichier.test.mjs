import test from "node:test";
import assert from "node:assert/strict";

import {
  CE_QUI_PORTE_DES_MAILS, estUnPorteurDeMails, lExtension
} from "./les-messages-dun-fichier.js";

test("un porteur de mails se reconnaît sans égard à la casse", () => {
  assert.equal(estUnPorteurDeMails("RE_ Étanchéité.MSG"), true);
  assert.equal(estUnPorteurDeMails("fil.eml"), true);
  assert.equal(estUnPorteurDeMails("Historique.ZIP"), true);
  assert.equal(estUnPorteurDeMails("PLAN-FONDATIONS.pdf"), false);
  assert.equal(estUnPorteurDeMails(""), false);
  assert.equal(estUnPorteurDeMails(null), false);
});

/**
 * **Un `.pst` n'est pas un porteur, et c'est écrit.** Le déclarer ferait échouer
 * le dépôt le plus important de tous sans rien expliquer : une boîte Outlook
 * entière ne se lit pas dans un navigateur (règle 12).
 */
test("une boîte Outlook entière n'est pas annoncée comme lisible", () => {
  assert.equal(estUnPorteurDeMails("archive.pst"), false);
  assert.equal(CE_QUI_PORTE_DES_MAILS.includes(".pst"), false);
});

/**
 * **Le nom d'un porteur n'est pas un préfixe.** « plan.msg.pdf » est un PDF ;
 * le compter comme un message le ferait compter « illisible », et le compte
 * rendu dirait qu'un message a résisté là où il n'y avait pas de message.
 */
test("l'extension se lit à la fin, pas n'importe où dans le nom", () => {
  assert.equal(estUnPorteurDeMails("plan.msg.pdf"), false);
  assert.equal(estUnPorteurDeMails("zip-des-lots.xlsx"), false);
});

/**
 * **Un `.msg` n'est pas du `message/rfc822`.** C'est un conteneur Outlook, et
 * le déclarer autrement ferait échouer son ouverture par tout ce qui croit le
 * type annoncé — alors qu'on garde bien ses octets d'origine.
 */
test("le type déclaré suit les octets qu'on garde, pas ce qu'on aimerait", async () => {
  const { LE_TYPE_DUN_MESSAGE } = await import("./les-messages-dun-fichier.js");
  assert.equal(LE_TYPE_DUN_MESSAGE[".msg"], "application/vnd.ms-outlook");
  assert.equal(LE_TYPE_DUN_MESSAGE[".eml"], "message/rfc822");
  assert.notEqual(LE_TYPE_DUN_MESSAGE[".msg"], LE_TYPE_DUN_MESSAGE[".eml"]);
});
