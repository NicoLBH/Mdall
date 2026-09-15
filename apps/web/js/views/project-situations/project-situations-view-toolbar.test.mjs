/**
 * La ligne de titre du carnet.
 *
 * Elle était écrite à la main dans l'écran, et ce test en relisait le balisage
 * pour vérifier qu'il ressemblait à celui des Sujets. **Se ressembler n'est pas
 * être le même** : c'est précisément ce que la ligne de titre partagée existe
 * pour éviter (`titre-decran.js`).
 *
 * Le test vérifie donc deux choses : que le composant partagé produit bien la
 * structure attendue — exécuté, pas relu — et que l'écran s'en sert.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { renderTitreDEcranHtml } from "../ui/titre-decran.js";
import { NOM_DU_CARNET } from "../../services/mon-carnet.js";

const ICI = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(ICI, "./project-situations-view.js"), "utf8");

test("la ligne de titre partagée porte la structure des autres écrans", () => {
  const html = renderTitreDEcranHtml({
    titre: NOM_DU_CARNET,
    className: "project-table-toolbar--situations",
    actionsHtml: '<button id="openCreateSituationButton">Nouvelle situation</button>'
  });

  assert.match(html, /project-table-toolbar/);
  assert.match(html, /project-table-toolbar--titre/);
  assert.match(html, /project-table-toolbar--situations/);
  assert.match(html, /project-table-toolbar__left/);
  assert.match(html, /project-table-toolbar__right/);
  assert.match(html, /project-table-toolbar__group/);
  assert.match(html, /project-table-toolbar__title/);
  assert.match(html, /Situations/, "l'écran se nomme, comme partout ailleurs");
  assert.match(html, /openCreateSituationButton/, "et son action reste à droite");
});

test("l'écran du carnet s'en sert, plutôt que de la réécrire", () => {
  assert.match(source, /project-situations__table-toolbar project-page-shell project-page-shell--toolbar/);
  assert.match(source, /renderTitreDEcranHtml\(\{[\s\S]{0,120}titre: NOM_DU_CARNET/);
  assert.match(source, /class="gh-btn gh-action__main gh-btn--primary gh-btn--md" id="openCreateSituationButton"/);
});

/**
 * **Le champ de recherche est celui des Sujets.** En dessiner un autre ici
 * obligerait à recalibrer les deux à chaque retouche, et l'un des deux finirait
 * en retard sur l'autre.
 */
test("la recherche du carnet reprend le champ des sujets", () => {
  assert.match(source, /class="memory-search situations-search gh-field-focus"/);
  assert.match(source, /class="gh-input memory-search__input"/);
  assert.match(source, /data-situations-recherche/);

  const css = readFileSync(resolve(ICI, "../../../style.css"), "utf8");
  assert.match(css, /\.sujets-search,\s*\.situations-search\{/, "un seul espacement pour les deux");
});

/* ── Ce qu'on demande à la création ──────────────────────────────────────── */

const formulaire = readFileSync(resolve(ICI, "./project-situations-form.js"), "utf8");

/**
 * **La création ne demande plus un « type ».**
 *
 * « Manuelle » ou « Automatique » était une question de mécanique posée avant
 * même qu'on ait écrit un titre — au moment où l'on a une intention, pas une
 * méthode. On sait qu'on veut « ma semaine » ; on ne sait pas encore si on la
 * remplira à la main.
 */
test("la fenêtre de création ne pose plus de question de mécanique", () => {
  // Le bloc du choix est désormais dans une branche réservée à la modification.
  assert.ok(!formulaire.includes("situation${resolvedMode}Mode\" value=\"manual\" ${automaticMode ? \"\" : \"checked\"} ${modeDisabledAttr}"));
  assert.ok(!formulaire.includes("modeDisabledAttr"), "plus de champ désactivé : il n'y a plus de champ");
  assert.ok(!formulaire.includes("Le mode n est pas modifiable"), "il l'est devenu");
});

/**
 * **Et il est dit en français, à sa place.** Le choix reste — sans lui, une
 * situation ne pourrait plus jamais suivre une recherche — mais dans la fenêtre
 * de modification, une fois qu'on sait ce qu'on veut en faire.
 */
test("le choix se pose à la modification, en français", () => {
  assert.match(formulaire, /Ce qu'elle retient/);
  assert.match(formulaire, /Les sujets que j'y mets/);
  assert.match(formulaire, /Ceux qui répondent à une recherche/);
  assert.ok(!formulaire.includes(">Manuelle<"), "plus de jargon à l'écran");
  assert.ok(!formulaire.includes(">Automatique<"));
});

/**
 * **Un choix qui ne mène nulle part n'est pas un choix.** Le mode restait celui
 * de la création : les boutons auraient tourné sans rien changer.
 */
test("le mode choisi part bien vers la base", () => {
  const evenements = readFileSync(resolve(ICI, "./project-situations-events.js"), "utf8");
  const service = readFileSync(resolve(ICI, "../../services/project-situations-supabase.js"), "utf8");

  assert.match(evenements, /input\[name="situationEditMode"\]/, "le choix doit être écouté");
  assert.match(evenements, /status: String\(form\.status[\s\S]{0,120}mode,/, "et voyager dans la modification");
  assert.match(service, /hasOwnProperty\.call\(patch, "mode"\)/, "et la base doit l'accepter");
});

/* ── Le rail du carnet ───────────────────────────────────────────────────── */

/**
 * **Rien n'est dessiné de neuf.** `renderRailDesSujetsHtml` produit déjà les
 * lectures, le trait et les épinglées ; en écrire un second pour cet écran,
 * c'est accepter qu'ils diffèrent d'un pixel, puis d'un comportement.
 *
 * Cette vérification lit du texte, et c'est assumé : le rail se monte dans un
 * document, et il n'y en a pas ici. Ce qu'elle garde est **une chose absente** —
 * un appel remplacé par un balisage écrit à la main ne lèverait nulle part.
 */
test("le carnet monte le rail des sujets, il n'en dessine pas un second", () => {
  assert.match(source, /renderRailDesSujetsHtml\(\{/, "le rail des sujets, appelé");
  assert.match(source, /project-rail-layout/, "dans la mise en page de la Mémoire et des Sujets");
  assert.match(source, /--project-rail-width:\$\{largeurDuRail\}px/, "et sa largeur par la même variable");
  assert.match(source, /railWidth\(/, "bornée par le même calcul, pas par un autre");
});

/**
 * **Les épinglées du carnet sont mes situations**, et les lectures sont des
 * situations aussi : cliquer l'une ou l'autre fait la même chose — ouvrir une
 * situation et voir ses sujets.
 */
test("les lectures et mes situations peuplent le même rail", () => {
  assert.match(source, /situationsDeLecture\(champs\)/);
  assert.match(source, /situationCommeUneEpingle\(situation, requete\)/);
  assert.match(source, /epingles/, "toutes passent par les épinglées du rail");
});

/**
 * **Les personnes commandent trois lectures.** Sans elles, « Assigné à moi »,
 * « Créé par moi » et « Mentions » ne se déclarent pas : le rail n'aurait
 * qu'une entrée sur quatre, sans que rien ne dise pourquoi.
 */
test("le rail reçoit les personnes de tous mes chantiers", () => {
  const persistance = readFileSync(resolve(ICI, "./project-situations-persistence.js"), "utf8");

  assert.match(source, /personnes: store\.situationsView\?\.personnesDuCarnet/);
  assert.match(persistance, /chargerLesPersonnesDesChantiers\(chantiers\)/, "et on va les chercher");
});
