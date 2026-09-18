import test from "node:test";
import assert from "node:assert/strict";

import {
  ANNEE_NON_LUE, JOURS_NOMMES, brancherLaCarteDeLAnnee, colonnesDeLAnnee, etiquettesDesMois,
  oublierOuLOnRegardait, renderCarteDeLAnnee
} from "./carte-de-lannee.js";
import { monAnneeDeTravail } from "../../services/mon-annee-de-travail.js";

const MAINTENANT = Date.parse("2026-09-18T11:00:00Z");

const trace = (quand) => ({ genre: "proposition", quand });
const leMemeJour = (jour, combien) =>
  Array.from({ length: combien }, () => trace(`${jour}T09:00:00Z`));

const ANNEE = monAnneeDeTravail({
  traces: [...leMemeJour("2026-09-18", 9), ...leMemeJour("2026-09-14", 3), ...leMemeJour("2026-04-02", 1)],
  maintenant: MAINTENANT
});

/* ── La forme : des semaines, et le rythme qu'elles montrent ─────────────── */

test("une colonne par semaine, sept lignes, lundi en haut", () => {
  // C'est la seule disposition où l'on voit un rythme : une bande sombre en bas
  // dit d'un coup d'œil qu'on ne travaille pas le dimanche. Un ruban de 365
  // carrés à la file ne dirait rien de cela.
  const colonnes = colonnesDeLAnnee(ANNEE.jours);

  assert.ok(colonnes.length >= 52 && colonnes.length <= 54, `${colonnes.length} colonnes`);
  assert.ok(colonnes.every((colonne) => colonne.length === 7));

  // 2026-09-14 est un lundi : il est en haut de sa colonne.
  const lundi = colonnes.find((colonne) => colonne[0]?.jour === "2026-09-14");
  assert.ok(lundi, "le lundi 14 septembre n'est pas en tête de colonne");
});

test("la première colonne se troue plutôt que de décaler les jours", () => {
  // La boucher en décalant ferait passer un mercredi pour un lundi, et la carte
  // mentirait sur le rythme — ce qu'elle existe pour montrer.
  const colonnes = colonnesDeLAnnee(ANNEE.jours);
  const premiere = colonnes[0];

  // 2025-09-19 est un vendredi : les quatre premières cases sont vides.
  assert.deepEqual(premiere.slice(0, 4), [null, null, null, null]);
  assert.equal(premiere[4].jour, "2025-09-19");
});

test("un mois n'écrit son nom qu'une fois", () => {
  const etiquettes = etiquettesDesMois(colonnesDeLAnnee(ANNEE.jours));
  const colonnes = etiquettes.map((e) => e.colonne);

  assert.deepEqual(colonnes, [...new Set(colonnes)]);
  assert.equal(etiquettes.length, 12, "les douze mois ne sont pas nommés une fois chacun");
});

test("le mois déjà entamé de la première colonne ne s'étiquette pas", () => {
  // Son étiquette dirait « septembre » au-dessus de trois jours de septembre, et
  // le vrai septembre, onze mois plus loin, n'en aurait plus.
  const etiquettes = etiquettesDesMois(colonnesDeLAnnee(ANNEE.jours));

  assert.equal(etiquettes.some((e) => e.colonne === 0), false);
  assert.equal(etiquettes.at(-1).dit, "sept.");
});

/* ── Les teintes ─────────────────────────────────────────────────────────── */

test("un jour chargé n'a pas la teinte d'un jour calme", () => {
  const html = renderCarteDeLAnnee(ANNEE);

  // Trois niveaux de charge — 1, 3, 9 — donc trois teintes distinctes, et la
  // plus claire pour le plus chargé.
  assert.match(html, /data-teinte="4"[^>]*title="9 gestes le 18 septembre 2026"/);
  assert.match(html, /data-teinte="1"[^>]*title="1 geste le 2 avril 2026"/);
});

test("un jour vide se dit vide au survol, et ne se tait pas", () => {
  // Un carré sans infobulle laisse croire à un trou dans la carte plutôt qu'à
  // une journée sans geste.
  assert.match(renderCarteDeLAnnee(ANNEE), /title="Aucun geste le 17 septembre 2026"/);
});

test("la légende montre les cinq teintes, la grise comprise", () => {
  // Sans la grise, « Moins » commencerait au premier vert et l'on ne saurait pas
  // ce que veut dire un carré sombre.
  const pied = renderCarteDeLAnnee(ANNEE).split("annee-carte__legende")[1];

  for (const teinte of [0, 1, 2, 3, 4]) {
    assert.ok(pied.includes(`data-teinte="${teinte}"`), `la teinte ${teinte} manque à la légende`);
  }
});

test("aucune couleur n'est écrite dans le dessin", () => {
  // Un vert écrit ici serait un second vert à retoucher le jour où celui de
  // l'application change (règle 4). Le dessin pose un rang, la feuille donne la
  // couleur.
  const html = renderCarteDeLAnnee(ANNEE);

  assert.equal(/#[0-9a-f]{3,6}\b|rgb\(|hsl\(/i.test(html), false);
});

/* ── Ce qu'elle dit d'elle-même ──────────────────────────────────────────── */

test("la tête dit le total, les jours, et ce qu'on a compté", () => {
  // « 13 gestes » ne dit pas si c'est trois jours ou trois cents. Et une mesure
  // qu'on ne peut pas vérifier est une mesure qu'on finit par ne plus croire :
  // la carte dit donc ce qu'elle compte.
  const html = renderCarteDeLAnnee(ANNEE);

  assert.match(html, /13 gestes sur 3 jours, ces douze derniers mois/);
  assert.match(html, /une proposition ouverte, une affirmation signée/);
});

test("une année qu'on n'a pas lue ne dessine pas de grille", () => {
  // Une grille toute grise dirait « je n'ai rien fait de l'année », ce qui est
  // une information — et fausse (règle 5).
  const html = renderCarteDeLAnnee(null);

  assert.match(html, new RegExp(ANNEE_NON_LUE.replace(/'/g, "&#39;")));
  assert.equal(html.includes("annee-carte__grille"), false);
});

test("une année vide dessine sa grille, et la dit vide", () => {
  // Elle est lue : « rien fait » est alors la vérité, et elle se montre.
  const rien = monAnneeDeTravail({ traces: [], maintenant: MAINTENANT });
  const html = renderCarteDeLAnnee(rien);

  assert.match(html, /annee-carte__grille/);
  assert.match(html, /0 gestes sur 0 jours/);

  // Dans la **grille** — la légende, elle, montre toujours ses cinq teintes,
  // sans quoi on ne saurait pas lire la carte le jour où elle se remplit.
  const grille = html.slice(html.indexOf("annee-carte__grille"), html.indexOf("annee-carte__pied"));
  assert.equal(/data-teinte="[1-4]"/.test(grille), false, "une teinte est dessinée sans geste");
});

/* ── Les noms de jour, à gauche ──────────────────────────────────────────── */

test("trois jours sont nommés, un sur deux", () => {
  // Sans eux, on voit un rythme sans savoir lequel : une bande sombre en bas
  // peut être le week-end ou deux jours de la semaine où l'on ne fait rien.
  // Sept étiquettes sur des lignes de onze pixels se touchent, et l'on ne lit
  // plus laquelle va où.
  assert.deepEqual(JOURS_NOMMES.map((jour) => jour.rang), [0, 2, 4]);
  assert.deepEqual(JOURS_NOMMES.map((jour) => jour.entier), ["lundi", "mercredi", "vendredi"]);
  assert.deepEqual(JOURS_NOMMES.map((jour) => jour.court), ["lund.", "merc.", "vend."]);
});

test("les sept lignes sont posées, y compris les muettes", () => {
  // Ne rendre que les trois nommées ferait remonter mercredi contre lundi, et
  // les noms désigneraient les mauvaises lignes — un repère faux est pire que
  // pas de repère.
  const colonne = renderCarteDeLAnnee(ANNEE)
    .match(/<div class="annee-carte__jours">([\s\S]*?)<\/div>/)[1];

  assert.equal((colonne.match(/class="annee-carte__nom"/g) ?? []).length, 7);
});

test("chaque nom est là en entier et en abrégé", () => {
  // La feuille choisit lequel s'affiche. L'écrire dans le CSS par `content:`
  // ferait vivre un nom de jour à deux endroits (règle 10).
  const html = renderCarteDeLAnnee(ANNEE);

  for (const { court, entier } of JOURS_NOMMES) {
    assert.ok(html.includes(`>${court}<`), `« ${court} » manque`);
    assert.ok(html.includes(`>${entier}<`), `« ${entier} » manque`);
  }
});

test("les noms sont hors du cadre qui défile", () => {
  // Dedans, ils partiraient avec les semaines au premier geste de la souris, et
  // l'on se retrouverait devant une grille anonyme — ce qu'ils existent pour
  // éviter.
  const html = renderCarteDeLAnnee(ANNEE);
  const semaines = html.slice(html.indexOf('class="annee-carte__semaines"'));

  assert.equal(semaines.includes("annee-carte__jours"), false,
    "la colonne des noms est dans le cadre qui défile");
  assert.ok(html.indexOf("annee-carte__jours") < html.indexOf("annee-carte__semaines"),
    "la colonne des noms ne précède pas les semaines");
});

test("une année non lue n'a pas de noms de jour à montrer", () => {
  assert.equal(renderCarteDeLAnnee(null).includes("annee-carte__jours"), false);
});

test("le défilement se pose à droite, puis se retient", () => {
  // Arriver à gauche mettrait sous les yeux le mois qu'on regarde le moins. Et
  // sauter à droite à chaque rendu arracherait la carte des mains de qui est en
  // train de la parcourir — l'accueil se redessine à chaque frappe dans sa
  // recherche.
  const defilant = {
    scrollWidth: 900, clientWidth: 400, scrollLeft: 0,
    ecoutes: {},
    addEventListener(quoi, quand) { this.ecoutes[quoi] = quand; }
  };
  const racine = { querySelector: () => defilant };

  oublierOuLOnRegardait();
  brancherLaCarteDeLAnnee(racine);
  assert.equal(defilant.scrollLeft, 500, "la carte ne s'ouvre pas sur les semaines récentes");

  // On parcourt, puis l'écran se redessine : on revient où l'on était.
  defilant.scrollLeft = 120;
  defilant.ecoutes.scroll();
  defilant.scrollLeft = 0;
  brancherLaCarteDeLAnnee(racine);
  assert.equal(defilant.scrollLeft, 120, "le redessin arrache la carte à qui la parcourt");

  // Et revenir sur l'écran, c'est y arriver de nouveau.
  oublierOuLOnRegardait();
  defilant.scrollLeft = 0;
  brancherLaCarteDeLAnnee(racine);
  assert.equal(defilant.scrollLeft, 500);
});

test("une position retenue ne dépasse pas la fin", () => {
  // La fenêtre peut avoir grandi entre deux rendus, ou le rail s'être déplié :
  // poser un défilement plus large que le cadre laisserait une bande vide à
  // droite de la carte.
  const large = {
    scrollWidth: 900, clientWidth: 400, scrollLeft: 0,
    ecoutes: {}, addEventListener(quoi, quand) { this.ecoutes[quoi] = quand; }
  };

  oublierOuLOnRegardait();
  brancherLaCarteDeLAnnee({ querySelector: () => large });
  // **On retient une position pour de vrai** : sans ce défilement, la seconde
  // pose repasserait par le chemin « jamais regardé », et la garde ne dirait
  // rien du plafonnement.
  large.scrollLeft = 480;
  large.ecoutes.scroll();

  const etroit = { scrollWidth: 500, clientWidth: 400, scrollLeft: 0, addEventListener() {} };
  brancherLaCarteDeLAnnee({ querySelector: () => etroit });

  assert.equal(etroit.scrollLeft, 100);
});

test("sans carte à l'écran, le branchement ne casse rien", () => {
  // Une année non lue ne dessine pas de grille : il n'y a rien à défiler.
  assert.doesNotThrow(() => brancherLaCarteDeLAnnee({ querySelector: () => null }));
  assert.doesNotThrow(() => brancherLaCarteDeLAnnee(null));
});
