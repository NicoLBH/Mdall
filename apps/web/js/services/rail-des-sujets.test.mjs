/**
 * Le rail des sujets : des lectures toutes faites, et leurs comptes.
 *
 * **Un compte qui diffère de ce qu'on voit après avoir cliqué est pire
 * qu'aucun compte.** C'est le principal souci de ces tests.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { champsDesSujets } from "./champs-des-sujets.js";
import { recherchePourLEcran } from "./recherche-epinglee.js";
import {
  LECTURE, NOMS_DE_LA_LECTURE, NOMS_DE_LECRAN, TITRE_QUELCONQUE, ecranApresUneLecture,
  epinglesDuRail, lectureDe, lectureQuOnRegarde, lecturesReservees, titreDeLaListe,
  railDesSujets, requeteDeLaLecture
} from "./rail-des-sujets.js";
import { sujetsFiltres } from "./champs-des-sujets.js";

const champs = champsDesSujets({
  labels: [{ key: "l-cr", name: "CR chantier" }, { key: "l-urg", name: "Urgent" }],
  personnes: [{ id: "p-1", name: "Moi-même" }]
});

const MAINTENANT = Date.parse("2026-02-01T00:00:00Z");

const SUJETS = [
  { id: "s1", title: "A", status: "open", updated_at: "2026-01-31T00:00:00Z" },
  { id: "s2", title: "B", status: "closed", updated_at: "2025-01-01T00:00:00Z" },
  { id: "s3", title: "C", status: "open", updated_at: "2025-06-01T00:00:00Z" },
  { id: "s4", title: "D", status: "open", updated_at: "2026-01-28T00:00:00Z" }
];

const META = {
  s1: { labels: ["l-cr"], assignes: ["p-1"], auteurs: ["p-1"], bloque: true },
  s2: { labels: ["l-cr"], mentions: ["p-1"] },
  s3: { labels: [] },
  s4: { labels: ["l-urg"], assignes: ["p-1"] }
};

const rail = (options = {}) => railDesSujets({
  sujets: SUJETS, champs, requete: "", meta: META, moi: "p-1", maintenant: MAINTENANT, ...options
});

const par = (lectures, cle) => lectures.find((lecture) => lecture.cle === cle);

/* ── Les comptes ─────────────────────────────────────────────────────────── */

/**
 * **Le compte est celui qu'on obtiendra**, parce qu'il est calculé en
 * appliquant la requête de la lecture — pas estimé autrement.
 */
test("chaque lecture compte ce que sa requête rendra", () => {
  const { lectures } = rail();

  for (const lecture of lectures) {
    if (lecture.combien === null) continue;
    const { sujets } = sujetsFiltres({
      sujets: SUJETS, requete: lecture.requete, champs, meta: META, moi: "p-1",
      maintenant: MAINTENANT
    });
    assert.equal(lecture.combien, sujets.length, `« ${lecture.nom} » annonce autre chose`);
  }
});

test("les comptes sont ceux du projet", () => {
  const { lectures } = rail();

  assert.equal(par(lectures, LECTURE.TOUS).combien, 4);
  assert.equal(par(lectures, LECTURE.MIENS).combien, 2);
  assert.equal(par(lectures, LECTURE.CREES).combien, 1);
  assert.equal(par(lectures, LECTURE.MENTIONS).combien, 1);
  assert.equal(par(lectures, LECTURE.RECENTS).combien, 2);
});

/**
 * **Zéro serait un mensonge.** « Les miens » sans savoir qui regarde ne compte
 * pas : il n'affiche aucun nombre (règle 5).
 */
test("un compte qu'on ne peut pas calculer ne s'affiche pas", () => {
  const { lectures } = rail({ moi: "" });

  assert.equal(par(lectures, LECTURE.MIENS).combien, null);
  assert.equal(par(lectures, LECTURE.CREES).combien, null);
  assert.equal(par(lectures, LECTURE.MENTIONS).combien, null);
  // Les autres comptent normalement : une inconnue n'en fait pas cinq.
  assert.equal(par(lectures, LECTURE.TOUS).combien, 4);
  assert.equal(par(lectures, LECTURE.RECENTS).combien, 2);
});

/* ── Ce qui se propose ───────────────────────────────────────────────────── */

/**
 * Sans collaborateur dans le projet, les trois lectures qui désignent quelqu'un
 * ne se proposent pas : leur champ n'est pas déclaré, et la requête écrite
 * perdrait son filtre en silence — « Assigné à moi » deviendrait « Tous ».
 */
test("une lecture sans vocabulaire ne se propose pas", () => {
  const nus = champsDesSujets({});
  const { lectures } = railDesSujets({
    sujets: SUJETS, champs: nus, meta: META, moi: "p-1", maintenant: MAINTENANT
  });

  for (const lecture of [LECTURE.MIENS, LECTURE.CREES, LECTURE.MENTIONS]) {
    assert.equal(par(lectures, lecture), undefined, `« ${lecture} » se propose sans personne`);
  }
  // « Tous » et « Activité récente » restent : elles n'ont besoin d'aucun
  // vocabulaire, elles se lisent sur le sujet lui-même.
  assert.ok(par(lectures, LECTURE.TOUS));
  assert.ok(par(lectures, LECTURE.RECENTS));
});

test("chaque lecture a un nom et une requête qui se lit", () => {
  const { lectures } = rail();

  for (const lecture of lectures) {
    assert.equal(lecture.nom, NOMS_DE_LA_LECTURE[lecture.cle]);
    assert.ok(lecture.icone, `« ${lecture.cle} » n'a pas d'icône`);
  }
  assert.equal(requeteDeLaLecture(LECTURE.MIENS, champs), "assigné:moi");
  assert.equal(requeteDeLaLecture(LECTURE.TOUS, champs), "");
});

/* ── La lecture active ───────────────────────────────────────────────────── */

/**
 * **Elle se déduit, elle ne se retient pas.** Une case retenue à côté de la
 * requête finirait par la contredire, et l'on ne saurait plus laquelle commande
 * (règle 4).
 */
test("la lecture active se reconnaît dans la requête", () => {
  assert.equal(rail({ requete: "assigné:moi" }).active, LECTURE.MIENS);
  assert.equal(rail({ requete: "auteur:moi" }).active, LECTURE.CREES);
  assert.equal(rail({ requete: "mention:moi" }).active, LECTURE.MENTIONS);
  assert.equal(rail({ requete: "activité:récente" }).active, LECTURE.RECENTS);
  assert.equal(rail({ requete: "" }).active, LECTURE.TOUS);
});

/**
 * **Un filtre ajouté à la main n'allume plus rien**, et c'est la suite du
 * raisonnement ci-dessous : on quittait « Assigné à moi » pour retomber sur
 * « Sujets », qui prétendait alors montrer la liste entière alors qu'on en
 * voyait deux lignes. Aucune allumée est une réponse : on est ailleurs, dans
 * quelque chose que le rail ne nomme pas (règle 5).
 *
 * `lectureDe` garde son défaut : elle répond « laquelle, au plus près », ce qui
 * convient pour poser une requête et non pour allumer une entrée.
 */
test("ajouter un filtre à la main n'allume plus aucune lecture", () => {
  assert.equal(rail({ requete: "assigné:moi priorité:haute" }).active, "");
  assert.equal(lectureQuOnRegarde("assigné:moi priorité:haute", champs), "");
  assert.equal(lectureDe("assigné:moi priorité:haute", champs), LECTURE.TOUS);
});

/**
 * **Le texte libre compte.** « Les miens » plus un mot cherché n'est plus « Les
 * miens » : allumer quand même ferait croire qu'on voit tous ses sujets alors
 * qu'on n'en voit qu'une partie.
 */
test("un mot cherché quitte la lecture aussi", () => {
  assert.equal(rail({ requete: "assigné:moi étanchéité" }).active, "");
  assert.equal(lectureDe("étanchéité", champs), LECTURE.TOUS);
});

/** La liste entière, elle, s'allume : c'est bien elle qu'on regarde. */
test("la requête vide allume « Sujets »", () => {
  assert.equal(lectureQuOnRegarde("", champs), LECTURE.TOUS);
  assert.equal(lectureQuOnRegarde("   ", champs), LECTURE.TOUS);
});

test("la lecture active est marquée, et une seule", () => {
  const { lectures } = rail({ requete: "mention:moi" });

  assert.deepEqual(lectures.filter((lecture) => lecture.active).map((lecture) => lecture.cle),
    [LECTURE.MENTIONS]);
});

/* ── Les recherches épinglées ────────────────────────────────────────────── */

/**
 * **Les épingles arrivent par la base**, et le décor les y fabrique — il ne les
 * écrit pas à la main. Une fixture qui recopierait la forme attendue par le
 * code testerait le décor, pas le raccord : c'est exactement ainsi que le nom
 * d'une vue est devenu sa requête, sans qu'aucun test ne bronche.
 */
const enBase = (ligne) => recherchePourLEcran(ligne);

test("une épingle porte son nom, ou sa requête à défaut", () => {
  const posees = epinglesDuRail([
    enBase({ id: "e1", query: "statut:ouvert label:cr-chantier", title: "Le chantier", rail: true }),
    enBase({ id: "e2", query: "priorité:critique", title: "", rail: true })
  ], "");

  assert.deepEqual(posees.map((epingle) => epingle.nom), ["Le chantier", "priorité:critique"]);
});

/**
 * **Enregistrée et épinglée sont deux choses.** Toutes les vues montaient au
 * rail : enregistrer une recherche coûtait donc une place dans la barre de
 * gauche, et l'on finissait par ne plus en enregistrer — l'inverse de ce qu'on
 * voulait.
 */
test("une vue enregistrée sans être épinglée ne monte pas au rail", () => {
  const posees = epinglesDuRail([
    enBase({ id: "e1", query: "priorité:critique", title: "Les urgences", rail: true }),
    enBase({ id: "e2", query: "label:cr-chantier", title: "Rangée seulement" })
  ], "");

  assert.deepEqual(posees.map((epingle) => epingle.id), ["e1"]);
});

/**
 * **Exactement.** Une épingle qui s'allumerait sur une requête voisine ferait
 * croire qu'on regarde ce qu'on a épinglé alors qu'on regarde autre chose.
 */
test("une épingle ne s'allume que sur sa requête exacte", () => {
  const requete = "statut:ouvert label:cr-chantier";
  const posee = enBase({ id: "e1", query: requete, rail: true });

  assert.equal(epinglesDuRail([posee], requete)[0].active, true);
  assert.equal(epinglesDuRail([posee], `${requete} étanchéité`)[0].active, false);
});

/** Une épingle sans requête ne se dessine pas : elle ne mènerait nulle part. */
test("une épingle vide est écartée", () => {
  assert.deepEqual(epinglesDuRail([
    enBase({ id: "e1", query: "", rail: true }), enBase({ id: "", query: "x", rail: true }), null
  ], ""), []);
  assert.deepEqual(epinglesDuRail(), []);
});

/**
 * **L'icône et la couleur traversent aussi.** Elles sont tout ce qui distingue
 * douze entrées de rail les unes des autres ; perdues au passage, la barre de
 * gauche devient une colonne de marque-pages gris identiques.
 */
test("l'habit d'une vue arrive jusqu'au rail", () => {
  const [epingle] = epinglesDuRail([enBase({
    id: "e1", query: "objectif:permis", title: "Les urgences du lot 03",
    icon: "milestone", color: "jaune", rail: true
  })], "");

  assert.equal(epingle.nom, "Les urgences du lot 03");
  assert.equal(epingle.icone, "milestone");
  assert.equal(epingle.couleur, "jaune");
});

/* ── Ce qu'une lecture change à l'écran ──────────────────────────────────── */

/**
 * **Le défaut que ce test existe pour empêcher.**
 *
 * Le rail reste affiché sur les Labels, les Objectifs et les Vues — c'est
 * voulu. Mais la requête qu'on y cliquait ne s'appliquait qu'à un tableau qu'on
 * ne voyait pas : on cliquait « Sujets » depuis l'écran des Labels, la requête
 * était bien posée, et l'écran ne bougeait pas. Rien ne le disait, et il ne
 * restait qu'à recharger la page.
 */
test("cliquer une lecture ramène à la liste des sujets", () => {
  const suivant = ecranApresUneLecture({ requete: "assigné:moi" });

  assert.equal(suivant.requete, "assigné:moi");
  assert.equal(suivant.sousVue, "subjects", "on reste sur l'écran des Labels");
  assert.equal(suivant.tableauSeul, true);
});

/**
 * Le formulaire d'une vue tient le tableau sous lui : le laisser ouvert ferait
 * poser la requête dans une vue qu'on est en train d'écrire.
 */
test("cliquer une lecture du rail ferme le formulaire d'une vue", () => {
  assert.equal(ecranApresUneLecture({ requete: "", formeOuverte: true }).fermerLaForme, true);
});

/**
 * **Le défaut que celui-là avait créé.** Les menus de filtre de l'en-tête
 * posent leur valeur par le même geste que le rail : cocher « CR chantier »
 * écrit `label:cr-chantier` dans la requête. Traité comme une lecture du rail,
 * il refermait le formulaire qu'on remplissait et renvoyait à la liste de tous
 * les sujets — au moment précis où l'on composait la requête de sa vue.
 */
test("un filtre posé sous le formulaire d'une vue l'y laisse", () => {
  const suivant = ecranApresUneLecture({
    requete: "label:cr-chantier", depuis: "tableau", sousVue: "vues", formeOuverte: true
  });

  assert.equal(suivant.requete, "label:cr-chantier");
  assert.equal(suivant.sousVue, "vues", "le formulaire d'une vue a été quitté");
  assert.equal(suivant.tableauSeul, false);
  assert.equal(suivant.fermerLaForme, false);
});

/**
 * Hors formulaire, un filtre de l'en-tête se pose sur la liste : c'est déjà là
 * qu'on est, et rien ne change d'écran.
 */
test("un filtre posé sans formulaire ouvert ne change pas d'écran", () => {
  const suivant = ecranApresUneLecture({ requete: "label:cr", depuis: "tableau" });

  assert.equal(suivant.sousVue, "subjects");
  assert.equal(suivant.tableauSeul, true);
  assert.equal(suivant.fermerLaForme, true);
});

/** « Sujets » pose la requête vide : c'est ce qui efface tous les filtres. */
test("« Sujets » remet la requête à zéro", () => {
  assert.equal(ecranApresUneLecture({}).requete, "");
  assert.equal(ecranApresUneLecture({ requete: "  " }).requete, "");
});

/* ── Ce qu'on écrit au-dessus du tableau ─────────────────────────────────── */

/**
 * **Le rail nomme des endroits, le titre dit ce qu'on regarde.** « Sujets »
 * au-dessus du tableau répéterait le nom de l'onglet, écrit deux fois plus
 * haut ; au long, il dit la chose.
 */
test("la liste entière s'annonce « Tous les sujets »", () => {
  assert.equal(titreDeLaListe({}), "Tous les sujets");
  assert.equal(titreDeLaListe({ requete: "   ", champs }), "Tous les sujets");
  assert.equal(NOMS_DE_LA_LECTURE[LECTURE.TOUS], "Sujets", "le rail, lui, garde le sien");
  assert.equal(NOMS_DE_LECRAN[LECTURE.TOUS], "Tous les sujets");
});

test("chaque lecture du rail porte son nom au-dessus du tableau", () => {
  for (const lecture of [LECTURE.MIENS, LECTURE.CREES, LECTURE.MENTIONS, LECTURE.RECENTS]) {
    assert.equal(
      titreDeLaListe({ requete: requeteDeLaLecture(lecture, champs), champs }),
      NOMS_DE_LA_LECTURE[lecture]
    );
  }
});

/**
 * **`lectureDe` retombe sur `TOUS` pour tout ce qu'elle ne reconnaît pas** —
 * le bon défaut pour allumer une entrée du rail, le mauvais pour titrer : une
 * liste filtrée par un label s'annoncerait comme la liste entière.
 */
test("une requête quelconque ne s'annonce pas comme la liste entière", () => {
  assert.equal(titreDeLaListe({ requete: "label:cr-chantier", champs }), TITRE_QUELCONQUE);
  assert.notEqual(TITRE_QUELCONQUE, "Tous les sujets");
});

/* ── Les lectures que le rail se réserve ─────────────────────────────────── */

/**
 * Une vue enregistrée sur `mention:moi` fabriquerait une seconde entrée qui
 * fait exactement ce que « Mentions » fait déjà — et comme une vue se reconnaît
 * à sa requête, l'écran affichait ensuite le nom de la vue quand on cliquait
 * « Mentions ».
 */
test("les lectures du rail se donnent avec leur requête", () => {
  const reservees = lecturesReservees(champs);

  assert.deepEqual(reservees.map((lecture) => lecture.cle), Object.values(LECTURE));
  assert.equal(reservees.find((lecture) => lecture.cle === LECTURE.MENTIONS).requete, "mention:moi");
  assert.equal(reservees.find((lecture) => lecture.cle === LECTURE.MENTIONS).nom, "Mentions");
  // « Sujets » n'a pas de requête : c'est la liste entière, pas un filtre.
  assert.equal(reservees.find((lecture) => lecture.cle === LECTURE.TOUS).requete, "");
});
