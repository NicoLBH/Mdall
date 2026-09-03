/**
 * Le bâtiment redessiné : ce qu'il montre, et ce qu'il se refuse à inventer.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { lireLeBatiment, dessinerLaCoupe as dessinerLeBatiment, dessinerLePlan, plansDisponibles,
  niveauxDuBatiment, terrainEnPente, hauteurDeNiveau, resumer, resumerLePlan } from "./batiment.js";

test("le rez-de-chaussée s'étiquette « R » : c'est là toute la leçon", () => {
  // On demande « nombre d'étages sur rez-de-chaussée » ; quelqu'un qui compte
  // trois niveaux habitables répond « 3 ». Le dessin montre alors quatre
  // planchers, et la faute saute aux yeux avant d'avoir contaminé le classement.
  const { svg } = dessinerLeBatiment({ logementsSuperposes: "oui", etagesSurRdc: "3" });
  const etiquettes = [...svg.matchAll(/class="bat-etage">([^<]+)</g)].map((m) => m[1]);
  assert.deepEqual(etiquettes, ["3", "2", "1", "R"]);
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

test("le sous-sol et le parc sont le même sous-sol, pas deux empilés", () => {
  // On cochait un sous-sol et l'on comptait des niveaux de parc : le dessin
  // empilait un sous-sol au-dessus d'un parc qui en était un. Un seul compte,
  // et le parc en occupe une partie.
  const { svg } = dessinerLeBatiment({ logementsSuperposes: "oui", etagesSurRdc: "1",
    niveauxEnSousSol: "3", parcDeStationnement: "oui", niveauxParcAuDessous: "2" });
  assert.equal((svg.match(/class="bat-parc"/g) ?? []).length, 2);
  assert.equal((svg.match(/class="bat-enterre"/g) ?? []).length, 1);
  assert.match(svg, /−1/);
  assert.match(svg, /−3/);
});

test("un parc peut être à la fois enterré et en superstructure", () => {
  // Le cas que le dessin ne savait pas tenir : deux niveaux sous le niveau de
  // référence et un au-dessus. Les niveaux se recoupent alors par destination.
  const batiment = lireLeBatiment({ logementsSuperposes: "oui", etagesSurRdc: "5",
    niveauxEnSousSol: "3", parcDeStationnement: "oui", niveauxParcAuDessous: "2", niveauxParcAuDessus: "1" });
  const niveaux = niveauxDuBatiment(batiment);
  assert.equal(niveaux.filter((n) => n.destination === "parc").length, 3);
  // Le parc en superstructure occupe le bas du bâti, l'enterré le haut du sous-sol.
  assert.equal(niveaux.find((n) => n.nom === "R").destination, "parc");
  assert.equal(niveaux.find((n) => n.nom === "1").destination, "habitation");
  assert.equal(niveaux.find((n) => n.nom === "−1").destination, "parc");
  assert.equal(niveaux.find((n) => n.nom === "−3").destination, "sous-sol");
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
  // Deux niveaux par volume — le rez-de-chaussée et l'étage — donc huit et quatre.
  assert.equal((bande.svg.match(/class="bat-volume"/g) ?? []).length, 8);
  assert.equal((jumelee.svg.match(/class="bat-volume"/g) ?? []).length, 4);
});

test("le joint entre deux maisons dit s'il sépare les structures", () => {
  // C'est lui qui décide de la première ou de la deuxième famille, et il ne se
  // voit pas autrement.
  const independantes = dessinerLeBatiment({ logementsSuperposes: "non", implantation: "bande",
    etagesSurRdc: "1", structuresIndependantes: "oui" });
  assert.match(independantes.svg, /bat-joint est-independant/);
});

test("un duplex de dernier étage montre un plancher qui ne traverse pas", () => {
  // Le 5°) de l'article 3 ne compte que le niveau bas de ces logements. Un
  // plancher court se comprend d'un coup d'œil ; un trait pointillé sur toute
  // la largeur se prenait pour une convention de dessin.
  const { svg } = dessinerLeBatiment({ logementsSuperposes: "oui", etagesSurRdc: "4",
    duplexOuTriplexAuDernierEtage: "oui" });
  assert.match(svg, /bat-dalle est-partielle/);
  assert.match(svg, /duplex/);
});

test("le dessin se plafonne plutôt que de devenir illisible", () => {
  const { svg, batiment } = dessinerLeBatiment({ logementsSuperposes: "oui", etagesSurRdc: "40" });
  assert.equal(batiment.etages, 12);
  assert.equal(batiment.etagesReels, 40);
  assert.match(svg, /plafonné à 12 étages/);
});

test("la légende dit le bâtiment en une phrase, et rien de plus", () => {
  const batiment = lireLeBatiment({ logementsSuperposes: "oui", etagesSurRdc: "3", niveauxEnSousSol: "1",
    hauteurPlancherBasNiveauLePlusHaut: "7.5" });
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

/* ── La vue en plan ──────────────────────────────────────────────────────── */

test("le plan ne se dessine que lorsqu'il a quelque chose à montrer", () => {
  assert.equal(dessinerLePlan({}).vide, true);
  assert.equal(dessinerLePlan({ logementsSuperposes: "oui", etagesSurRdc: "3" }).vide, true);
  assert.equal(dessinerLePlan({ typeEscalierRetenu: "abriFumees" }).vide, false);
});

test("le plan porte ce que la coupe ne peut pas montrer", () => {
  // La distance de la porte palière la plus éloignée à l'escalier sépare la
  // troisième famille A de la troisième famille B : elle ne se voit qu'à plat.
  const { svg, batiment } = dessinerLePlan({ typeEscalierRetenu: "abriFumees",
    typeCirculationRetenue: "abriFumees", distancePortePaliereEscalier: "14",
    voieAccesDecrite: "oui", accesEscaliersAtteintsParVoieEchelles: "non" });
  assert.match(svg, /14 m — porte palière la plus éloignée/);
  assert.match(svg, /est-la-plus-eloignee/);
  // Les apostrophes sont échappées dans le SVG : on cherche ce qui compte.
  assert.match(svg, /escalier à l&#39;abri des fumées/);
  assert.match(svg, /circulation à l&#39;abri des fumées/);
  assert.match(resumerLePlan(batiment), /14 m de l'escalier/);
});

test("un escalier encloisonné se voit à l'épaisseur de sa cage", () => {
  const encloisonne = dessinerLePlan({ typeEscalierRetenu: "encloisonne" });
  const exterieur = dessinerLePlan({ typeEscalierRetenu: "exterieur" });
  assert.match(encloisonne.svg, /plan-cage est-encloisonnee/);
  assert.match(exterieur.svg, /plan-cage est-exterieure/);
});

test("deux niveaux de parc enterrés font au moins deux niveaux enterrés", () => {
  // Les deux questions peuvent se contredire — on répond « un sous-sol » puis
  // « deux niveaux de parc au-dessous ». Le dessin ne tranche pas contre le
  // parc : il en compte au moins autant.
  const batiment = lireLeBatiment({ logementsSuperposes: "oui", etagesSurRdc: "2",
    niveauxEnSousSol: "1", parcDeStationnement: "oui", niveauxParcAuDessous: "2" });
  assert.equal(batiment.enterres, 2);
  assert.match(resumer(batiment), /2 niveaux au-dessous du niveau de référence, dont 2 de parc/);
});

/* ── Ce que la coupe a appris à montrer ──────────────────────────────────── */

const COLLECTIF = { logementsSuperposes: "oui", etagesSurRdc: "3" };

test("le terrain en pente recoupe le niveau que les deux comptes revendiquent", () => {
  // « 1 niveau au-dessous du niveau de référence » et « 2 niveaux de parc
  // au-dessous » ne se contredisent pas : c'est la pente. Ce qui est enterré
  // côté habitation débouche à l'air libre côté parc.
  const batiment = lireLeBatiment({ ...COLLECTIF, niveauxEnSousSol: "1",
    parcDeStationnement: "oui", niveauxParcAuDessous: "2" });
  assert.equal(terrainEnPente(batiment), true);
  const niveaux = niveauxDuBatiment(batiment);
  assert.equal(niveaux.find((n) => n.nom === "−1").destination, "mixte");
  assert.equal(niveaux.find((n) => n.nom === "−2").destination, "parc");
});

test("sans désaccord entre les deux comptes, aucune pente n'est inventée", () => {
  // Trois niveaux déclarés dont deux de parc : rien à recouper, le terrain est
  // plat, et le dessin ne doit pas suggérer le contraire.
  const batiment = lireLeBatiment({ ...COLLECTIF, niveauxEnSousSol: "3",
    parcDeStationnement: "oui", niveauxParcAuDessous: "2" });
  assert.equal(terrainEnPente(batiment), false);
  const { svg } = dessinerLeBatiment({ ...COLLECTIF, niveauxEnSousSol: "3",
    parcDeStationnement: "oui", niveauxParcAuDessous: "2" });
  assert.doesNotMatch(svg, /terrain en pente/);
});

test("la pente se dessine, et le niveau recoupé se nomme", () => {
  const { svg } = dessinerLeBatiment({ ...COLLECTIF, niveauxEnSousSol: "1",
    parcDeStationnement: "oui", niveauxParcAuDessous: "2" });
  assert.match(svg, /terrain en pente/);
  assert.match(svg, /bat-refend/);
  assert.match(svg, />habitation</);
});

test("deux cotes de même valeur pointent le même plancher", () => {
  // Deux « 9 m » tracés à deux hauteurs différentes font douter du dessin
  // entier, alors qu'ils disent la même chose.
  const { svg } = dessinerLeBatiment({ ...COLLECTIF,
    hauteurPlancherBasNiveauLePlusHaut: "9",
    duplexOuTriplexAuDernierEtage: "oui", hauteurPlancherBasLogementLePlusHautSiDuplex: "9" });
  assert.equal((svg.match(/class="bat-cote"/g) ?? []).length, 1);
  // Les libellés s'empilent sous la valeur : trois mots à la suite sortaient du
  // cadre par la gauche.
  const quoi = [...svg.matchAll(/class="bat-cote-quoi">([^<]+)</g)].map((m) => m[1]);
  assert.deepEqual(quoi, ["niveau", "logement"]);
});

test("deux cotes de valeurs différentes restent deux cotes", () => {
  const { svg } = dessinerLeBatiment({ ...COLLECTIF,
    hauteurPlancherBasNiveauLePlusHaut: "9",
    duplexOuTriplexAuDernierEtage: "oui", hauteurPlancherBasLogementLePlusHautSiDuplex: "6" });
  assert.equal((svg.match(/class="bat-cote"/g) ?? []).length, 2);
});

test("la hauteur d'un niveau se déduit, et se dit", () => {
  // « 9 m sur R+3 » fait trois mètres par niveau ; « 9 m sur R+1 » en fait
  // quatre et demi, et l'une des deux réponses est à revoir.
  assert.equal(hauteurDeNiveau(lireLeBatiment({ ...COLLECTIF, hauteurPlancherBasNiveauLePlusHaut: "9" })), 3);
  assert.equal(hauteurDeNiveau(lireLeBatiment({ logementsSuperposes: "oui", etagesSurRdc: "1",
    hauteurPlancherBasNiveauLePlusHaut: "9" })), 9);
  // Sans cote, on ne suppose rien.
  assert.equal(hauteurDeNiveau(lireLeBatiment(COLLECTIF)), null);
});

test("les altitudes se lisent niveau par niveau", () => {
  const { svg } = dessinerLeBatiment({ ...COLLECTIF, hauteurPlancherBasNiveauLePlusHaut: "9" });
  const lues = [...svg.matchAll(/class="bat-altitude">([^<]+)</g)].map((m) => m[1]);
  assert.deepEqual(lues, ["+9 m", "+6 m", "+3 m", "±0 m"]);
  // Le pas se dit une fois, dans la légende du bas : à côté des altitudes, il
  // heurtait les parois et le comble.
  assert.match(svg, /3 m par niveau/);
});

test("l'ascenseur se dessine, et descend quand il dessert le sous-sol", () => {
  const sans = dessinerLeBatiment({ ...COLLECTIF, niveauxEnSousSol: "2", ascenseur: "non" });
  assert.doesNotMatch(sans.svg, /bat-gaine-ascenseur/);

  const arrete = dessinerLeBatiment({ ...COLLECTIF, niveauxEnSousSol: "2",
    ascenseur: "oui", ascenseurDessertSousSolParcOuCaves: "non" });
  const descendu = dessinerLeBatiment({ ...COLLECTIF, niveauxEnSousSol: "2",
    ascenseur: "oui", ascenseurDessertSousSolParcOuCaves: "oui" });
  const gaine = (svg) => Number(svg.match(/<rect[^>]*class="bat-gaine-ascenseur"[^>]*>/)[0]
    .match(/height="([\d.]+)"/)[1]);
  assert.ok(gaine(descendu.svg) > gaine(arrete.svg) + 60);
  assert.match(descendu.svg, /bat-cabine/);
  assert.match(descendu.svg, /bat-cable/);
});

test("le gaz est jaune, l'électricité rouge, et la légende les nomme", () => {
  const { svg } = dessinerLeBatiment({ ...COLLECTIF,
    conduiteMontanteDeGaz: "oui", colonneMontanteElectriqueEnGaine: "oui" });
  assert.match(svg, /class="bat-gaz"/);
  assert.match(svg, /class="bat-elec"/);
  assert.match(svg, /colonne montante de gaz/);
  assert.match(svg, /colonne montante électrique/);
});

test("le gaz qui traverse le parc ressort en terre", () => {
  const { svg } = dessinerLeBatiment({ ...COLLECTIF, niveauxEnSousSol: "2",
    parcDeStationnement: "oui", niveauxParcAuDessous: "2",
    conduiteMontanteDeGaz: "oui", gazTraversantUnParcDeStationnement: "oui" });
  assert.match(svg, /bat-gaz est-en-terre/);
  // Et pas de tracé en terre quand le gaz ne traverse rien.
  const sans = dessinerLeBatiment({ ...COLLECTIF, niveauxEnSousSol: "2",
    parcDeStationnement: "oui", niveauxParcAuDessous: "2",
    conduiteMontanteDeGaz: "oui", gazTraversantUnParcDeStationnement: "non" });
  assert.doesNotMatch(sans.svg, /est-en-terre/);
});

test("les celliers regroupés prennent un bloc, et l'on voit lequel", () => {
  const { svg } = dessinerLeBatiment({ ...COLLECTIF, niveauxEnSousSol: "1",
    celliersOuCavesRegroupes: "oui" });
  assert.match(svg, /bat-celliers/);
  assert.match(svg, />celliers</);
  assert.doesNotMatch(dessinerLeBatiment({ ...COLLECTIF, celliersOuCavesRegroupes: "non" }).svg, /bat-celliers/);
});

test("plusieurs issues au choix en font dessiner deux, pas une", () => {
  const base = { ...COLLECTIF, niveauxEnSousSol: "2",
    parcDeStationnement: "oui", niveauxParcAuDessous: "2", communicationParcImmeuble: "oui" };
  const une = dessinerLeBatiment({ ...base, plusieursIssuesAuChoix: "non" });
  const deux = dessinerLeBatiment({ ...base, plusieursIssuesAuChoix: "oui" });
  assert.equal((une.svg.match(/class="bat-sas-note"/g) ?? []).length, 1);
  assert.equal((deux.svg.match(/class="bat-sas-note"/g) ?? []).length, 2);
});

test("le camion dit d'où la hauteur se mesure", () => {
  const { svg } = dessinerLeBatiment({ ...COLLECTIF, voieAccesDecrite: "oui" });
  assert.match(svg, /bat-camion/);
  assert.match(svg, /voie d'accès/);
  // Sans réponse sur la voie, aucun camion : on n'invente pas un accès.
  assert.doesNotMatch(dessinerLeBatiment(COLLECTIF).svg, /bat-camion/);
});

test("le toit à deux versants porte le comble, et les parois le traversent", () => {
  const { svg } = dessinerLeBatiment({ ...COLLECTIF, paroisLogementProlongeesJusquACouverture: "oui" });
  assert.match(svg, /class="bat-toit"/);
  assert.match(svg, />comble</);
  assert.match(svg, /bat-paroi est-prolongee/);
});

test("chaque niveau d'habitation montre deux logements et un couloir", () => {
  const { svg } = dessinerLeBatiment(COLLECTIF);
  // Quatre niveaux, deux logements chacun.
  assert.equal((svg.match(/class="bat-logement"/g) ?? []).length, 8);
  assert.equal((svg.match(/class="bat-couloir"/g) ?? []).length, 4);
});

test("une maison individuelle n'a ni couloir commun ni cage", () => {
  const { svg } = dessinerLeBatiment({ logementsSuperposes: "non", etagesSurRdc: "1" });
  assert.doesNotMatch(svg, /bat-couloir/);
  assert.doesNotMatch(svg, /bat-cage/);
});

/* ── Le parc voisin, collé à la façade ───────────────────────────────────── */

test("le parc contigu se colle à la façade", () => {
  // Un écart en faisait un autre parc, isolé par une aire libre — ce n'est pas
  // de cela que parle l'article 87.
  const { svg } = dessinerLeBatiment({ ...COLLECTIF, parcDeStationnement: "oui",
    niveauxParcAuDessus: "1", parcContiguAImmeuble: "oui" });
  const rects = [...svg.matchAll(/<rect x="([\d.]+)"[^>]*class="bat-parc"/g)].map((m) => Number(m[1]));
  const mur = [...svg.matchAll(/<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)"[^>]*class="bat-volume"/g)]
    .map((m) => Number(m[1]) + Number(m[2]))[0];
  // Le bloc voisin commence exactement au mur : aucune aire libre entre les deux.
  assert.ok(rects.includes(mur));
});

test("un parc non contigu s'écarte, et l'écart porte la distance", () => {
  const { svg } = dessinerLeBatiment({ ...COLLECTIF, parcDeStationnement: "oui",
    niveauxParcAuDessus: "1", parcContiguAImmeuble: "non", distanceParcAImmeubleHabite: "6" });
  const rects = [...svg.matchAll(/<rect x="([\d.]+)"[^>]*class="bat-parc"/g)].map((m) => Number(m[1]));
  const mur = [...svg.matchAll(/<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)"[^>]*class="bat-volume"/g)]
    .map((m) => Number(m[1]) + Number(m[2]))[0];
  // Aucun bloc ne démarre au mur, et le plus à droite s'en éloigne franchement.
  assert.ok(rects.every((x) => x !== mur));
  assert.ok(Math.max(...rects) > mur + 20);
  assert.match(svg, /6 m/);
});

/* ── Les trois plans ─────────────────────────────────────────────────────── */

test("chaque plan ne se propose que s'il a quelque chose à montrer", () => {
  assert.deepEqual(plansDisponibles({}).map(([cle]) => cle), []);
  assert.deepEqual(plansDisponibles({ typeEscalierRetenu: "encloisonne" }).map(([cle]) => cle), ["etage"]);
  assert.deepEqual(plansDisponibles({ voieAccesDecrite: "oui" }).map(([cle]) => cle), ["rdc"]);
  // Un parc sans sous-sol ne fait pas un plan de sous-sol.
  assert.deepEqual(plansDisponibles({ parcDeStationnement: "oui", surfaceParc: "2000",
    superficieCompartimentParc: "2500" }).map(([cle]) => cle), []);
  assert.deepEqual(plansDisponibles({ niveauxEnSousSol: "2", parcDeStationnement: "oui",
    niveauxParcAuDessous: "2", superficieCompartimentParc: "2500", surfaceParc: "2000" })
    .map(([cle]) => cle), ["sousSol"]);
});

test("l'étage porte ce que la coupe ne peut pas montrer", () => {
  const { svg } = dessinerLePlan({ typeEscalierRetenu: "abriFumees",
    typeCirculationRetenue: "abriFumees", distancePortePaliereEscalier: "14",
    distanceEscalierAuxBaies: "3", nombreEscaliersProteges: "2", distanceEntreEscaliers: "12",
    ascenseur: "oui", coursivesPasserellesOuCirculationsAAirLibre: "oui" }, { niveau: "etage" });
  assert.match(svg, /Niveau courant/);
  assert.match(svg, /14 m — porte palière la plus éloignée/);
  assert.match(svg, /3 m aux baies/);
  assert.match(svg, /12 m entre escaliers/);
  assert.equal((svg.match(/class="plan-cage/g) ?? []).length, 2);
  assert.match(svg, /plan-ascenseur/);
  assert.match(svg, /plan-coursive/);
});

test("le rez-de-chaussée porte ce qui se mesure depuis l'extérieur", () => {
  const { svg } = dessinerLePlan({ voieAccesDecrite: "oui", accesEscaliersAtteintsParVoieEchelles: "oui",
    distanceDebouchEscalierSortie: "5", distanceLimiteDePropriete: "8", longueurDuBatiment: "42",
    hallDessertServicesCollectifs: "oui" }, { niveau: "rdc" });
  assert.match(svg, /Rez-de-chaussée/);
  assert.match(svg, /hall \+ services/);
  assert.match(svg, /5 m au débouché/);
  assert.match(svg, /8 m/);
  assert.match(svg, /42 m de longueur/);
  assert.match(svg, /plan-limite/);
  assert.match(svg, /voie-échelles/);
});

test("une maison en bande montre ses voisines au rez-de-chaussée", () => {
  const { svg } = dessinerLePlan({ logementsSuperposes: "non", implantation: "bande",
    structuresIndependantes: "oui", voieAccesDecrite: "oui" }, { niveau: "rdc" });
  assert.equal((svg.match(/class="plan-voisin"/g) ?? []).length, 2);
  assert.match(svg, /bat-joint est-independant/);
});

test("le sous-sol compte les compartiments et suit le chemin vers l'issue", () => {
  const sousSol = { niveauxEnSousSol: "2", parcDeStationnement: "oui", niveauxParcAuDessous: "2",
    surfaceParc: "9000", superficieCompartimentParc: "3000", boxesDansLeParc: "oui",
    emplacementsParBox: "2", plusieursIssuesAuChoix: "oui", distanceAParcourirVersIssueParc: "30",
    typeEscalierRetenu: "encloisonne", celliersOuCavesRegroupes: "oui" };
  const { svg } = dessinerLePlan(sousSol, { niveau: "sousSol" });
  assert.match(svg, /3 compartiments/);
  assert.equal((svg.match(/class="plan-compartiment"/g) ?? []).length, 2);
  assert.match(svg, /box — 2 emplacement/);
  // Deux issues au choix, donc deux sas et deux escaliers.
  assert.equal((svg.match(/class="plan-sas"/g) ?? []).length, 2);
  assert.match(svg, /30 m à parcourir/);
  assert.match(svg, /bat-celliers/);
});

test("les larges ouvertures sur deux faces se voient, et écartent la ventilation", () => {
  const base = { niveauxEnSousSol: "1", parcDeStationnement: "oui", niveauxParcAuDessous: "1",
    ventilationParcRetenue: "mecanique" };
  const mecanique = dessinerLePlan(base, { niveau: "sousSol" });
  assert.match(mecanique.svg, /ventilation mécanique/);
  const ouvertes = dessinerLePlan({ ...base, largesOuverturesDeuxFacesOpposees: "oui" }, { niveau: "sousSol" });
  assert.equal((ouvertes.svg.match(/class="plan-ouverture"/g) ?? []).length, 2);
  assert.doesNotMatch(ouvertes.svg, /ventilation mécanique/);
});

test("chaque plan se résume dans ses propres termes", () => {
  const batiment = lireLeBatiment({ typeEscalierRetenu: "encloisonne", voieAccesDecrite: "oui",
    longueurDuBatiment: "42", niveauxEnSousSol: "2", parcDeStationnement: "oui",
    niveauxParcAuDessous: "2", superficieCompartimentParc: "3000", plusieursIssuesAuChoix: "oui" });
  assert.match(resumerLePlan(batiment, "etage"), /^Niveau courant : escalier encloisonné/);
  assert.match(resumerLePlan(batiment, "rdc"), /^Rez-de-chaussée : .*42 m de longueur/);
  assert.match(resumerLePlan(batiment, "sousSol"), /^Sous-sol : .*plusieurs issues au choix/);
  assert.equal(resumerLePlan(lireLeBatiment({}), "sousSol"), "Rien n'a encore été décrit au sous-sol.");
});
