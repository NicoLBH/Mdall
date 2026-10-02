/**
 * La zone de dépôt : ce qu'elle accepte, ce qu'elle allume, ce qu'elle laisse
 * passer.
 *
 * Les trois pièges du glisser-déposer se testent tous ici — ils se voyaient
 * mal à l'écran et se corrigeaient donc trois fois de suite, une par copie.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  DEPUIS_FICHIERS, LA_ZONE, UN_FICHIER_LOCAL, aDesFichiers, brancherLaZoneDeDepot,
  renderLaZoneDeDepot, trierLesFichiers
} from "./zone-de-depot.js";

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

/* ── Le dessin de la zone ─────────────────────────────────────────────────── */

test("la zone porte ses deux portes, et son attribut", () => {
  const html = renderLaZoneDeDepot({
    mot: "Déposez un rapport de contrôle, ou choisissez-le.",
    accepte: ".pdf", plusieurs: true
  });

  assert.match(html, new RegExp(LA_ZONE));
  assert.match(html, new RegExp(UN_FICHIER_LOCAL));
  assert.match(html, new RegExp(DEPUIS_FICHIERS));
  assert.match(html, /multiple/);
  assert.match(html, /accept="\.pdf"/);
  assert.match(html, /Déposez un rapport de contrôle/);
});

test("un seul document à la fois ne porte pas `multiple`", () => {
  assert.doesNotMatch(renderLaZoneDeDepot({ accepte: ".pdf" }), /multiple/);
});

test("la seconde porte se refuse quand elle n'est pas branchée", () => {
  // Un bouton qui ne fait rien est pire qu'un bouton absent : on clique, et l'on
  // croit que l'outil est cassé.
  const html = renderLaZoneDeDepot({ mot: "Déposez", depuisFichiers: false });
  assert.doesNotMatch(html, new RegExp(DEPUIS_FICHIERS));
  assert.match(html, new RegExp(UN_FICHIER_LOCAL));
});

test("occupée, la zone se tait mais garde son attribut", () => {
  const html = renderLaZoneDeDepot({ occupee: true, motOccupee: "Une lecture est en cours." });

  assert.match(html, /Une lecture est en cours\./);
  assert.doesNotMatch(html, new RegExp(UN_FICHIER_LOCAL));
  // **Et elle garde `LA_ZONE`.** Le branchement la cherche par cet attribut à
  // chaque redessin : la lui retirer ferait qu'au retour, plus rien ne serait
  // branché, et le dépôt par glisser cesserait sans que rien ne le dise.
  assert.match(html, new RegExp(LA_ZONE));
});

test("l'aide passe en HTML, le reste est échappé", () => {
  // L'aide porte des `<code>` dans les deux écrans ; le mot, lui, vient parfois
  // d'un nom de fichier.
  const html = renderLaZoneDeDepot({
    mot: "Déposez <b>ceci</b>", aide: "Un PDF, ou un <code>.md</code>."
  });
  assert.match(html, /<code>\.md<\/code>/);
  assert.match(html, /&lt;b&gt;ceci&lt;\/b&gt;/);
});

/* ── Dessinée et branchée, ou ni l'une ni l'autre ─────────────────────────── */

/**
 * **Le seul défaut qu'aucun rendu ne peut dire.**
 *
 * Une zone dessinée que personne ne branche se voit, s'ouvre au clic, et refuse
 * le glisser-déposer en silence : le navigateur ouvre le PDF dans un onglet, et
 * la page est perdue avec ce qui s'y écrivait. La batterie l'a montré — remplacer
 * l'attribut cherché par un ancien nom ne faisait tomber aucune épreuve.
 *
 * On lit donc le source des écrans, ce qu'on ne s'autorise que pour cela.
 */
const LES_ECRANS = [
  "../studio/dev/lecture-des-cr.js",
  "../studio/dev/ct-continuity-lab.js"
];

test("tout écran qui dessine la zone la branche, et par le même nom", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  let vus = 0;
  for (const ou of LES_ECRANS) {
    const source = readFileSync(fileURLToPath(new URL(ou, import.meta.url)), "utf8");
    if (!source.includes("renderLaZoneDeDepot(")) continue;
    vus += 1;

    // Cherchée **par la constante**, et non par une chaîne : c'est ce qui
    // garantit qu'on branche bien la zone que le composant pose (règle 10).
    assert.match(source, /querySelector\(`\[\$\{LA_ZONE\}\]`\)/, ou);
    assert.match(source, /brancherLaZoneDeDepot\(/, ou);
    // Le champ est cherché de deux façons selon l'écran — au redessin, ou par
    // délégation sur l'hôte. Ce qui compte est qu'il le soit par le même nom.
    assert.match(source, /`\[\$\{UN_FICHIER_LOCAL\}\]`/, ou);
  }

  // Sans ce compte, une liste d'écrans fautive rendrait l'épreuve verte en
  // n'ayant rien lu — ce qui est pire que de ne pas l'avoir écrite.
  assert.equal(vus, LES_ECRANS.length);
});

test("la porte de l'ordinateur se refuse là où elle ferait un doublon", () => {
  // Les familles qui relisent des documents déjà rangés dans le projet ne
  // l'offrent pas : les redéposer depuis le disque en ferait un second exemplaire.
  const sans = renderLaZoneDeDepot({ mot: "Choisissez", duDisque: false });
  assert.doesNotMatch(sans, new RegExp(UN_FICHIER_LOCAL));
  assert.match(sans, new RegExp(DEPUIS_FICHIERS));
  // La zone reste la même, avec son cadre et son attribut.
  assert.match(sans, /class="zone-de-depot"/);
  assert.match(sans, new RegExp(LA_ZONE));

  const avec = renderLaZoneDeDepot({ mot: "Déposez", duDisque: true });
  assert.match(avec, new RegExp(UN_FICHIER_LOCAL));
});
