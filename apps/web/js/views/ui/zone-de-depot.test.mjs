/**
 * La zone de dépôt : ce qu'elle accepte, ce qu'elle allume, ce qu'elle laisse
 * passer.
 *
 * Les trois pièges du glisser-déposer se testent tous ici — ils se voyaient
 * mal à l'écran et se corrigeaient donc trois fois de suite, une par copie.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { brancherLaZoneDeDepot, aDesFichiers, trierLesFichiers } from "./zone-de-depot.js";

/** Une zone de fiction : elle retient ses classes et ses écouteurs. */
function zoneDeFiction() {
  const ecouteurs = new Map();
  const classes = new Set();
  return {
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c)
    },
    addEventListener: (nom, fn) => {
      if (!ecouteurs.has(nom)) ecouteurs.set(nom, []);
      ecouteurs.get(nom).push(fn);
    },
    removeEventListener: (nom, fn) => {
      ecouteurs.set(nom, (ecouteurs.get(nom) ?? []).filter((f) => f !== fn));
    },
    lancer(nom, evenement = {}) {
      const complet = {
        dataTransfer: { types: ["Files"], files: [] },
        preventDefault() { complet.empeche = true; },
        stopPropagation() { complet.arrete = true; },
        ...evenement
      };
      for (const fn of ecouteurs.get(nom) ?? []) fn(complet);
      return complet;
    },
    combienDEcouteurs: () => [...ecouteurs.values()].reduce((t, l) => t + l.length, 0),
    allumee: () => classes.has("is-dragover")
  };
}

const FICHIER = { name: "note.pdf", type: "application/pdf", size: 1000 };

test("le survol demande le dépôt au navigateur", () => {
  // Sans `preventDefault`, le navigateur refuse le dépôt : il ouvre le PDF dans
  // un onglet, et l'on perd la page avec ce qui s'y écrivait.
  const zone = zoneDeFiction();
  brancherLaZoneDeDepot(zone, { onFichiers() {} });
  const survol = zone.lancer("dragover");
  assert.equal(survol.empeche, true);
  assert.equal(survol.dataTransfer.dropEffect, "copy");
});

test("survoler un enfant ne fait pas clignoter le cadre", () => {
  // `dragleave` part aussi quand le pointeur passe sur un enfant : se fier au
  // dernier événement reçu éteignait le cadre à chaque mot survolé.
  const zone = zoneDeFiction();
  brancherLaZoneDeDepot(zone, { onFichiers() {} });
  zone.lancer("dragenter");
  assert.equal(zone.allumee(), true);
  zone.lancer("dragenter");            // on entre dans un enfant
  zone.lancer("dragleave");            // on quitte le parent, pas la zone
  assert.equal(zone.allumee(), true);
  zone.lancer("dragleave");            // on quitte vraiment
  assert.equal(zone.allumee(), false);
});

test("un glisser abandonné éteint le cadre", () => {
  const zone = zoneDeFiction();
  brancherLaZoneDeDepot(zone, { onFichiers() {} });
  zone.lancer("dragenter");
  zone.lancer("dragend");
  assert.equal(zone.allumee(), false);
});

test("le dépôt rend les fichiers, et éteint", () => {
  const zone = zoneDeFiction();
  let recus = null;
  brancherLaZoneDeDepot(zone, { onFichiers: (f) => { recus = f; } });
  zone.lancer("dragenter");
  const depot = zone.lancer("drop", { dataTransfer: { types: ["Files"], files: [FICHIER] } });
  assert.deepEqual(recus, [FICHIER]);
  assert.equal(zone.allumee(), false);
  assert.equal(depot.empeche, true);
});

test("une zone inactive n'allume rien et ne reçoit rien", () => {
  // Refuser le dépôt sans retirer la zone : pendant un envoi, on ne veut pas
  // que la zone disparaisse sous le pointeur.
  const zone = zoneDeFiction();
  let recus = null;
  brancherLaZoneDeDepot(zone, { onFichiers: (f) => { recus = f; }, actif: () => false });
  zone.lancer("dragenter");
  assert.equal(zone.allumee(), false);
  const survol = zone.lancer("dragover");
  assert.equal(survol.dataTransfer.dropEffect, "none");
  zone.lancer("drop", { dataTransfer: { types: ["Files"], files: [FICHIER] } });
  assert.equal(recus, null);
});

test("un glisser qui ne porte pas de fichiers passe son chemin", () => {
  // Une carte de kanban qu'on déplace déclenche les mêmes événements : allumer
  // le cadre ferait croire qu'on peut la déposer là, et arrêter la propagation
  // empêcherait son vrai destinataire de la recevoir.
  const zone = zoneDeFiction();
  brancherLaZoneDeDepot(zone, { onFichiers() {} });
  const carte = zone.lancer("dragenter", { dataTransfer: { types: ["text/plain"], items: [] } });
  assert.equal(zone.allumee(), false);
  assert.equal(carte.empeche, undefined);
  assert.equal(carte.arrete, undefined);
});

test("un navigateur qui ne dit les types qu'au dépôt reste compris", () => {
  assert.equal(aDesFichiers({ dataTransfer: { types: [], items: [{ kind: "file" }] } }), true);
  assert.equal(aDesFichiers({ dataTransfer: { types: [], items: [{ kind: "string" }] } }), false);
  assert.equal(aDesFichiers({}), false);
});

test("débrancher retire tout, et éteint", () => {
  const zone = zoneDeFiction();
  const arreter = brancherLaZoneDeDepot(zone, { onFichiers() {} });
  zone.lancer("dragenter");
  assert.ok(zone.combienDEcouteurs() > 0);
  arreter();
  assert.equal(zone.combienDEcouteurs(), 0);
  assert.equal(zone.allumee(), false);
});

test("sans zone ou sans destinataire, rien ne se branche", () => {
  assert.equal(typeof brancherLaZoneDeDepot(null, { onFichiers() {} }), "function");
  const zone = zoneDeFiction();
  brancherLaZoneDeDepot(zone, {});
  assert.equal(zone.combienDEcouteurs(), 0);
});

test("ce qui est refusé se dit, il ne disparaît pas", () => {
  // Un fichier écarté sans un mot laisse croire que le dépôt n'a pas
  // fonctionné, et l'on recommence.
  const image = { name: "photo.png", type: "image/png" };
  const { retenus, ecartes } = trierLesFichiers([FICHIER, image], (f) => f.type === "application/pdf");
  assert.deepEqual(retenus, [FICHIER]);
  assert.deepEqual(ecartes, [image]);
});
