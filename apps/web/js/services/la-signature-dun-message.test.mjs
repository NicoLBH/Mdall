import test from "node:test";
import assert from "node:assert/strict";

import { AU_PLUS_DE_LIGNES, laSignatureDunMessage } from "./la-signature-dun-message.js";

const unMessage = (...lignes) => lignes.join("\n");

test("une formule de politesse ouvre la signature", () => {
  const { propos, signature } = laSignatureDunMessage(unMessage(
    "Bonjour,", "", "Le chantier démarre en mai.", "",
    "Bien Cordialement", "", "Ourdine Ferrand", "Directrice d'agence"
  ));
  assert.match(propos, /démarre en mai/);
  assert.doesNotMatch(propos, /Cordialement/);
  assert.match(signature, /^Bien Cordialement/);
  assert.match(signature, /Directrice d'agence/);
});

test("le séparateur de la norme ouvre la signature", () => {
  const { propos, signature } = laSignatureDunMessage(unMessage(
    "Bonjour,", "", "Voici le plan.", "", "-- ", "Ourdine", "NOVACLIM"
  ));
  assert.equal(propos.trim().endsWith("Voici le plan."), true);
  assert.match(signature, /NOVACLIM/);
});

test("un bandeau de serveur n'a été écrit par personne", () => {
  const { propos, signature } = laSignatureDunMessage(unMessage(
    "Bonjour,", "", "Le rapport est joint.", "",
    "EXTERNAL SENDER: Do not click any links or open any attachments unless you trust the sender."
  ));
  assert.doesNotMatch(propos, /EXTERNAL/);
  assert.match(signature, /EXTERNAL SENDER/);
});

/**
 * **Replier du propos est le seul échec coûteux de ce module.** Une formule de
 * politesse au milieu d'un message est une formule, pas une fin.
 */
test("une formule suivie de tout le message ne replie rien", () => {
  const longue = Array.from({ length: 30 }, (_, rang) => `Point ${rang + 1} du compte rendu.`);
  const { propos, signature } = laSignatureDunMessage(unMessage(
    "Bonjour,", "", "Cordialement", "", ...longue
  ));
  assert.equal(signature, "", "trente lignes de propos ont été repliées");
  assert.match(propos, /Point 30/);
});

test("la signature ne dépasse pas ce qu'une signature peut compter", () => {
  const debut = Array.from({ length: 5 }, () => "Une ligne de propos.");
  const apres = Array.from({ length: AU_PLUS_DE_LIGNES + 6 }, () => "Encore du propos.");
  const { signature } = laSignatureDunMessage(unMessage(...debut, "Cordialement", ...apres));
  assert.equal(signature, "");
});

test("un message qui commence par sa formule garde tout", () => {
  // Replier tout ferait disparaître le message derrière un caret.
  const { propos, signature } = laSignatureDunMessage(unMessage(
    "Cordialement", "", "Ourdine", "NOVACLIM"
  ));
  assert.equal(signature, "");
  assert.match(propos, /Cordialement/);
});

test("un message court n'a pas de signature à chercher", () => {
  assert.deepEqual(laSignatureDunMessage("Bonjour, c'est noté."), {
    propos: "Bonjour, c'est noté.", signature: ""
  });
  assert.deepEqual(laSignatureDunMessage(""), { propos: "", signature: "" });
  assert.deepEqual(laSignatureDunMessage(null), { propos: "", signature: "" });
});

test("les accents et la casse ne font pas manquer une formule", () => {
  for (const formule of ["Cordialement", "CORDIALEMENT", "cordialement,", "Bien à vous", "Cdt"]) {
    const { signature } = laSignatureDunMessage(unMessage(
      "Bonjour,", "", "C'est noté.", "", formule, "", "Ourdine", "NOVACLIM"
    ));
    assert.notEqual(signature, "", `« ${formule} » n'a pas été reconnue`);
  }
});

test("une phrase qui commence par une formule reste du propos", () => {
  // « Cordialement, je vous confirme que… » est un message, pas une fin.
  const { signature } = laSignatureDunMessage(unMessage(
    "Bonjour,", "",
    "Cordialement, je vous confirme que le lot 3 démarre le 5 mai comme prévu.",
    "", "Merci de prévenir l'entreprise."
  ));
  assert.equal(signature, "");
});

test("rien n'est perdu : le propos et la signature redonnent le message", () => {
  const corps = unMessage(
    "Bonjour,", "", "Le plan est joint.", "", "Cordialement", "", "Ourdine",
    "", "PS : je serai en congés du 27/07 au 06/09."
  );
  const { propos, signature } = laSignatureDunMessage(corps);
  // La contrainte de planning est sous la signature : repliée, pas coupée.
  assert.match(signature, /congés du 27\/07/);
  assert.equal(`${propos}\n\n${signature}`.replace(/\s+/g, " "), corps.replace(/\s+/g, " "));
});
