import test from "node:test";
import assert from "node:assert/strict";

import { renderLeVersement } from "./le-versement-ecran.js";
import { LES_DESTINATIONS, cheminDit } from "../../services/le-depouillement.js";

const unFichier = (name, size = 1024) => ({ name, size });

test("sans porteur ni envoi, rien n'est dessiné", () => {
  assert.equal(renderLeVersement(), "");
  assert.equal(renderLeVersement({ porteurs: [] }), "");
});

/**
 * **Les deux destinations, par leur nom, avant d'agir.** C'est toute la raison
 * d'être de cette étape : un dépôt ne doit pas décider seul où va de la
 * correspondance.
 */
test("les deux destinations sont nommées, chemin compris", () => {
  const dessine = renderLeVersement({ porteurs: [unFichier("un.msg")] });
  for (const destination of LES_DESTINATIONS) {
    assert.match(dessine, new RegExp(destination.quoi.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(dessine, new RegExp(cheminDit(destination.chemin)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("le cadenas et son mot accompagnent chaque destination", () => {
  const dessine = renderLeVersement({ porteurs: [unFichier("un.msg")] });
  assert.match(dessine, /shield-lock/);
  assert.match(dessine, /Contenu privé/);
});

test("les fichiers déposés sont nommés avec leur poids", () => {
  const dessine = renderLeVersement({ porteurs: [unFichier("a.msg", 2048), unFichier("b.zip", 5_000_000)] });
  assert.match(dessine, /a\.msg/);
  assert.match(dessine, /b\.zip/);
  assert.match(dessine, /5,0 Mo/);
  assert.match(dessine, /2,0 ko/);
});

test("le bouton dit qu'on envoie, et non qu'on dépouille", () => {
  // Le dépouillement ne se fait plus ici : le mot le disait, et il promettait
  // une attente qui n'a plus lieu à l'écran.
  const dessine = renderLeVersement({ porteurs: [unFichier("un.msg")] });
  assert.match(dessine, /id="documentsVerserBtn"/);
  assert.match(dessine, /Envoyer les mails/);
  assert.doesNotMatch(dessine, /Dépouiller/);
});

test("pendant l'envoi, le bouton se tait et la barre compte les octets", () => {
  const dessine = renderLeVersement({
    porteurs: [unFichier("a.msg"), unFichier("b.msg")],
    envoi: { envoi: true, montes: 1, parti: false, motif: "", combien: 0 }
  });
  assert.match(dessine, /disabled/);
  assert.match(dessine, /Envoi…/);
  assert.match(dessine, /1 sur 2 fichiers envoyés/);
});

/**
 * **La barre mesure ce qui se passe ici.** Le rangement se fait au serveur, et
 * cet écran n'en a pas de nouvelles : une barre qui prétendrait le suivre
 * mentirait.
 */
test("rien n'annonce un rangement terminé au moment du départ", () => {
  const dessine = renderLeVersement({
    porteurs: [],
    envoi: { envoi: false, montes: 3, parti: true, motif: "", combien: 3 }
  });
  assert.match(dessine, /3 fichiers envoyés/);
  assert.match(dessine, /Actions/);
  assert.doesNotMatch(dessine, /messages versés/);
  assert.doesNotMatch(dessine, /rangés/);
});

test("le départ fait place à où regarder", () => {
  const dessine = renderLeVersement({
    porteurs: [], envoi: { envoi: false, montes: 2, parti: true, motif: "", combien: 2 }
  });
  assert.match(dessine, /id="documentsVoirLesActionsBtn"/);
  assert.match(dessine, /Suivre dans Actions/);
  // Un bouton qui ne fait rien apprend à ne plus lire les boutons.
  assert.doesNotMatch(dessine, /documentsVerserBtn/);
});

test("un envoi qui n'est pas parti dit pourquoi", () => {
  const dessine = renderLeVersement({
    porteurs: [],
    envoi: { envoi: false, montes: 0, parti: false, combien: 0, motif: "aucun fichier n'a pu être envoyé" }
  });
  // L'apostrophe part échappée : c'est du HTML, et le motif vient d'un message
  // d'erreur qu'on n'écrit pas soi-même.
  assert.match(dessine, /aucun fichier n&#39;a pu être envoyé/);
  assert.match(dessine, /forme-manques/);
});
