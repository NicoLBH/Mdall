/**
 * Le bâtiment redessiné : ce qu'il montre, et ce qu'il se refuse à inventer.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { lireLeBatiment, dessinerLeBatiment, resumer } from "./batiment.js";

test("le rez-de-chaussée s'étiquette « R » : c'est là toute la leçon", () => {
  // On demande « nombre d'étages sur rez-de-chaussée » ; quelqu'un qui compte
  // trois niveaux habitables répond « 3 ». Le dessin montre alors quatre
  // planchers, et la faute saute aux yeux avant d'avoir contaminé le classement.
  const { svg } = dessinerLeBatiment({ logementsSuperposes: "oui", etagesSurRdc: "3" });
  const etiquettes = [...svg.matchAll(/class="bat-etage">([^<]+)</g)].map((m) => m[1]);
  assert.deepEqual(etiquettes, ["R", "1", "2", "3"]);
});

test("un plain-pied ne montre qu'un niveau", () => {
  const { svg } = dessinerLeBatiment({ logementsSuperposes: "non", etagesSurRdc: "0" });
  assert.deepEqual([...svg.matchAll(/class="bat-etage">([^<]+)</g)].map((m) => m[1]), ["R"]);
});

test("rien n'est dessiné de ce qui n'a pas été répondu", () => {
  // Un dessin qui inventerait un sous-sol pour faire joli ferait répondre
  // « oui » à quelqu'un qui n'a rien dit.
  const { svg } = dessinerLeBatiment({ logementsSuperposes: "oui", etagesSurRdc: "2" });
  assert.doesNotMatch(svg, /bat-enterre/);
  assert.doesNotMatch(svg, /bat-parc\b/);
  assert.doesNotMatch(svg, /bat-cote\b/);
  assert.doesNotMatch(svg, /bat-paroi/);
  assert.doesNotMatch(svg, /bat-voie/);
});

test("sans rien de répondu, il n'y a rien à dessiner", () => {
  const rendu = dessinerLeBatiment({});
  assert.equal(rendu.vide, true);
  assert.equal(rendu.svg, "");
});

test("le sous-sol et les niveaux de parc descendent sous le sol", () => {
  const { svg } = dessinerLeBatiment({ logementsSuperposes: "oui", etagesSurRdc: "1", sousSol: "oui",
    parcDeStationnement: "oui", niveauxParcAuDessous: "2" });
  assert.equal((svg.match(/class="bat-enterre"/g) ?? []).length, 1);
  assert.equal((svg.match(/class="bat-parc"/g) ?? []).length, 2);
  assert.match(svg, /parc −1/);
  assert.match(svg, /parc −2/);
});

test("les parois de l'enveloppe montent ou s'arrêtent, et cela se voit", () => {
  const base = { logementsSuperposes: "oui", etagesSurRdc: "2" };
  const prolongees = dessinerLeBatiment({ ...base, paroisLogementProlongeesJusquACouverture: "oui" });
  const arretees = dessinerLeBatiment({ ...base, paroisLogementProlongeesJusquACouverture: "non" });
  assert.match(prolongees.svg, /bat-paroi est-prolongee/);
  assert.doesNotMatch(arretees.svg, /est-prolongee/);
  assert.match(arretees.svg, /class="bat-paroi"/);
});

test("une maison en bande se dessine autant de fois qu'elle est groupée", () => {
  const bande = dessinerLeBatiment({ logementsSuperposes: "non", implantation: "bande", etagesSurRdc: "1" });
  const jumelee = dessinerLeBatiment({ logementsSuperposes: "non", implantation: "jumelee", etagesSurRdc: "1" });
  assert.equal((bande.svg.match(/class="bat-volume"/g) ?? []).length, 4);
  assert.equal((jumelee.svg.match(/class="bat-volume"/g) ?? []).length, 2);
});

test("le joint entre deux maisons dit s'il sépare les structures", () => {
  // C'est lui qui décide de la première ou de la deuxième famille, et il ne se
  // voit pas autrement.
  const independantes = dessinerLeBatiment({ logementsSuperposes: "non", implantation: "bande",
    etagesSurRdc: "1", structuresIndependantes: "oui" });
  assert.match(independantes.svg, /bat-joint est-independant/);
});

test("un duplex de dernier étage efface la dalle qui ne sépare rien", () => {
  // Le 5°) de l'article 3 ne compte que le niveau bas de ces logements.
  const { svg } = dessinerLeBatiment({ logementsSuperposes: "oui", etagesSurRdc: "4",
    duplexOuTriplexAuDernierEtage: "oui" });
  assert.match(svg, /bat-dalle est-effacee/);
  assert.match(svg, />duplex</);
});

test("le dessin se plafonne plutôt que de devenir illisible", () => {
  const { svg, batiment } = dessinerLeBatiment({ logementsSuperposes: "oui", etagesSurRdc: "40" });
  assert.equal(batiment.etages, 12);
  assert.equal(batiment.etagesReels, 40);
  assert.match(svg, /plafonné à 12 étages/);
});

test("la légende dit le bâtiment en une phrase, et rien de plus", () => {
  const batiment = lireLeBatiment({ logementsSuperposes: "oui", etagesSurRdc: "3", sousSol: "oui",
    hauteurPlancherBasLogementLePlusHaut: "7.5" });
  const phrase = resumer(batiment, "2e famille");
  assert.match(phrase, /bâtiment collectif/);
  assert.match(phrase, /rez-de-chaussée et 3 étages/);
  assert.match(phrase, /7,5 m/);
  assert.match(phrase, /2e famille/);
  // Une virgule décimale, comme partout ailleurs dans l'écran.
  assert.doesNotMatch(phrase, /7\.5/);
  assert.equal(resumer(lireLeBatiment({})), "Rien n'a encore été décrit.");
});

test("le cadre suit le cas, il ne l'écrase pas", () => {
  const petit = dessinerLeBatiment({ logementsSuperposes: "oui", etagesSurRdc: "0" });
  const grand = dessinerLeBatiment({ logementsSuperposes: "oui", etagesSurRdc: "8",
    sousSol: "oui", parcDeStationnement: "oui", niveauxParcAuDessous: "3" });
  const hauteur = (svg) => Number(svg.match(/viewBox="0 0 \d+ (\d+)"/)[1]);
  assert.ok(hauteur(grand.svg) > hauteur(petit.svg) + 200);
});
