/**
 * L'étude : le tableau, ses totaux, et ce qu'il refuse de compter du bon côté.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { volumeDe, designationDe, synthese, voisine, semelleNeuve } from "./fondations-etude.js";

const COURANTS_SUD = { sectionLx: 1.3, sectionLy: 1.3, hauteurLz: 0.8 };

test("le volume d'un massif est celui de sa semelle, fût compris", () => {
  const sansFut = volumeDe(COURANTS_SUD, 5);
  assert.ok(Math.abs(sansFut.unitaire - 1.352) < 1e-9);
  assert.ok(Math.abs(sansFut.total - 6.76) < 1e-9);

  // Oublier le fût sous-estimerait la commande de béton, et c'est le genre
  // d'erreur qu'on découvre à la livraison.
  const avecFut = volumeDe({ ...COURANTS_SUD, futA: 0.4, futB: 0.4, hauteurFut: 0.6 }, 1);
  assert.ok(Math.abs(avecFut.unitaire - (1.352 + 0.096)) < 1e-9);
});

test("les volumes tombent sur ceux d'un métré réel", () => {
  // Relevés sur le tableau de quantités d'une affaire livrée.
  const cas = [
    [{ sectionLx: 1.3, sectionLy: 1.3, hauteurLz: 0.8 }, 5, 1.35, 6.76],
    [{ sectionLx: 1.3, sectionLy: 1.3, hauteurLz: 1.3 }, 7, 2.20, 15.38],
    [{ sectionLx: 1.2, sectionLy: 1.3, hauteurLz: 0.8 }, 5, 1.25, 6.24],
    [{ sectionLx: 1.4, sectionLy: 1.4, hauteurLz: 1.4 }, 2, 2.74, 5.49],
    [{ sectionLx: 0.9, sectionLy: 0.9, hauteurLz: 0.8 }, 2, 0.65, 1.30],
    [{ sectionLx: 1.3, sectionLy: 1.4, hauteurLz: 0.8 }, 2, 1.46, 2.91]
  ];
  for (const [entrees, nombre, unitaire, total] of cas) {
    const volume = volumeDe(entrees, nombre);
    assert.ok(Math.abs(volume.unitaire - unitaire) < 0.006, `unitaire ${volume.unitaire} vs ${unitaire}`);
    assert.ok(Math.abs(volume.total - total) < 0.006, `total ${volume.total} vs ${total}`);
  }
});

test("une semelle sans nom en reçoit un plutôt que de rester vide", () => {
  assert.equal(designationDe({ designation: "Courants Sud" }, 0), "Courants Sud");
  assert.equal(designationDe({}, 2), "Semelle 3");
  assert.equal(designationDe({ designation: "   " }, 0), "Semelle 1");
});

test("le tableau totalise les massifs et le béton", () => {
  const table = synthese(
    [{ id: "a", designation: "Sud", nombre: 5, entrees: COURANTS_SUD },
     { id: "b", designation: "Centre", nombre: 7, entrees: { ...COURANTS_SUD, hauteurLz: 1.3 } }],
    [{ resultat: { bilan: { ratio: 0.9, verifie: true } } }, { resultat: { bilan: { ratio: 1.4, verifie: false } } }]
  );
  assert.equal(table.totaux.massifs, 12);
  assert.ok(Math.abs(table.totaux.volume - 22.139) < 1e-6);
  assert.equal(table.totaux.verifiees, 1);
  assert.equal(table.totaux.enDefaut, 1);
});

test("une semelle dont le calcul a échoué porte son échec, elle ne disparaît pas", () => {
  const table = synthese(
    [{ id: "a", nombre: 3, entrees: COURANTS_SUD }],
    [{ error: "Annexe F : seules les zones sismiques 2 à 5 sont couvertes." }]
  );
  assert.equal(table.lignes.length, 1);
  assert.match(table.lignes[0].erreur, /zones sismiques/);
  assert.equal(table.lignes[0].ratio, null);
  assert.equal(table.lignes[0].verifiee, null);
  // Elle compte quand même dans le béton : le massif existe, qu'on sache le
  // vérifier ou non.
  assert.ok(table.totaux.volume > 0);
});

test("ce qui n'a pas été calculé n'est compté ni vérifié ni en défaut", () => {
  const table = synthese([{ id: "a", nombre: 1, entrees: COURANTS_SUD }], []);
  assert.deepEqual(
    { v: table.totaux.verifiees, d: table.totaux.enDefaut, i: table.totaux.inconnues },
    { v: 0, d: 0, i: 1 }
  );
});

test("un nombre de massifs négatif ou illisible ne fabrique pas de béton", () => {
  assert.equal(volumeDe(COURANTS_SUD, -3).total, 0);
  const table = synthese([{ id: "a", nombre: "beaucoup", entrees: COURANTS_SUD }], []);
  assert.equal(table.lignes[0].nombre, 0);
  assert.equal(table.totaux.volume, 0);
});

test("la navigation entre semelles ne boucle pas", () => {
  // Reboucler ferait croire qu'on avance alors qu'on repasse sur ce qu'on
  // vient de lire.
  assert.equal(voisine(3, 0, -1), null);
  assert.equal(voisine(3, 0, 1), 1);
  assert.equal(voisine(3, 2, 1), null);
  assert.equal(voisine(3, 2, -1), 1);
});

test("une semelle neuve reprend le contexte de la précédente, pas son identité", () => {
  const modele = { id: "a", designation: "Sud", nombre: 5, entrees: { ...COURANTS_SUD, reglement: "DTU 13.12" } };
  const neuve = semelleNeuve(modele, { sectionLx: 1.2 });
  assert.equal(neuve.entrees.reglement, "DTU 13.12", "le sol et le règlement se partagent");
  assert.equal(neuve.designation, "", "le nom lui est propre");
  assert.equal(neuve.nombre, 1);
  assert.equal(neuve.id, null);
  // La copie est profonde : modifier la neuve ne doit pas toucher le modèle.
  neuve.entrees.sectionLx = 9;
  assert.equal(modele.entrees.sectionLx, 1.3);
});

test("sans modèle, la semelle neuve part des valeurs par défaut", () => {
  const neuve = semelleNeuve(null, { sectionLx: 1.2, sectionLy: 1.2 });
  assert.equal(neuve.entrees.sectionLx, 1.2);
});
