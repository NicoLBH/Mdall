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
import { renderFormulaireDeVueHtml } from "../project-subjects/project-subjects-recherche.js";
import { champsDesSujets } from "../../services/champs-des-sujets.js";
import { situationAEcrire } from "../../services/situation-en-composition.js";

const ICI = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(ICI, "./project-situations-view.js"), "utf8");
const tableau = readFileSync(resolve(ICI, "./project-situations-table.js"), "utf8");

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

/* ── Le rail tient ce qu'il promet ───────────────────────────────────────── */

const evenements = readFileSync(resolve(ICI, "./project-situations-events.js"), "utf8");

/**
 * **Le rail promettait sans tenir.** Ses entrées s'allumaient et rien ne
 * s'ouvrait. Chacune porte la requête de ce qu'elle ouvre — lecture ou
 * situation à moi — et le clic ouvre la situation qui la porte.
 */
test("cliquer une entrée du rail ouvre la situation qu'elle porte", () => {
  assert.match(evenements, /\[data-sujets-lecture\]/, "l'écoute du rail doit exister");
  assert.match(evenements, /situationQuiPorte\(requete\)/, "et mener à une situation");
  assert.match(evenements, /loadSituationSelection\(store\.situationsView\.selectedSituationId\)/,
    "dont on charge les sujets");
});

/**
 * **On la retrouve par sa requête, pas par son rang.** Le rail mêle les
 * lectures et mes situations ; compter les entrées ferait dépendre le clic de
 * l'ordre d'affichage (règle 4).
 */
test("la situation se retrouve par sa requête, pas par sa place", () => {
  assert.match(evenements, /requeteDeLaSituation\(situation\) === cherche/);
});

/**
 * **Une lecture ne se modifie pas.** Elle n'est pas en base : laisser le crayon
 * ouvrirait un formulaire qui n'aurait rien à enregistrer — un geste qui échoue
 * en silence, et l'on chercherait la panne ailleurs.
 */
test("une lecture n'offre pas de crayon", () => {
  assert.match(source, /estUneLecture\(selectedSituation\) \? "" : `/,
    "le crayon ne se rend que pour une situation écrite");
});

/**
 * **Et elle ne dit pas « Automatique ».** C'est un mot de mécanique ; sur une
 * situation qui porte une requête — une lecture du rail, ou l'une de celles
 * qu'on écrit au formulaire — il ne renseigne sur rien que le titre et la
 * requête ne disent déjà. Pire, il est faux : le mode reste en base à la valeur
 * qu'il avait à la création, si bien qu'une situation composée à l'étape 3
 * s'annonçait « Manuelle » sans tenir aucune liste à la main.
 *
 * **La même question, posée une seule fois** : le panneau de détail et le
 * tableau la posent à `seDitParUneRequete`. Deux formulations d'une même règle
 * finiraient par ne plus dire la même chose (règle 4), et l'on verrait la
 * pastille d'un côté et pas de l'autre.
 */
test("une situation qui porte une requête ne montre pas de pastille de mécanique", () => {
  assert.match(source, /const modeBadge = seDitParUneRequete\(selectedSituation\) \? ""/);
  assert.match(tableau, /if \(seDitParUneRequete\(situation\)\) return ""/,
    "le tableau pose la même question que le panneau de détail");
});

/* ── « Nouvelle situation » ouvre le formulaire d'une vue ────────────────── */

/**
 * **Le dessin est partagé, l'écoute doit suivre.**
 *
 * Le carnet monte `renderFormulaireDeVueHtml`, qui pose les attributs de
 * l'écran des Sujets. Un attribut écouté d'un seul côté est la panne type :
 * le formulaire porte tout ce qu'il faut, et rien ne l'entend — le bouton
 * « Enregistrer la situation » ne fait alors rien du tout, sans la moindre
 * erreur nulle part.
 *
 * On ne relit donc pas une liste écrite à la main : **on rend le formulaire**,
 * on en extrait les attributs qu'il porte réellement, et l'on vérifie que
 * l'écran des situations les nomme. Renommer un attribut dans le dessin casse
 * ce test, ce qui est exactement ce qu'on lui demande.
 */
test("tous les gestes du formulaire sont écoutés par le carnet", () => {
  const html = renderFormulaireDeVueHtml({
    champs: champsDesSujets({}), mot: "situation", habitOuvert: true
  });
  const poses = [...new Set([...html.matchAll(/data-sujets-vue[\w-]*/g)].map(([nom]) => nom))];

  assert.ok(poses.length >= 8, `le formulaire doit porter ses gestes (vu : ${poses.length})`);
  for (const attribut of poses) {
    assert.ok(evenements.includes(attribut), `${attribut} est posé mais personne ne l'écoute`);
  }
  // La barre de recherche du formulaire porte les attributs des Sujets : c'est
  // par elle qu'on écrit la requête, et par elle qu'on l'efface.
  assert.match(evenements, /data-sujets-recherche/);
  assert.match(evenements, /data-sujets-vider/);
});

/**
 * **Le bouton ouvre le formulaire dans le carnet, la fenêtre ailleurs.**
 *
 * Sur l'écran d'un projet, la requête n'a pas encore de vocabulaire — les
 * labels, les gens et les chantiers ne sont chargés que par le carnet —, et un
 * champ de recherche qui ne reconnaîtrait aucun mot ferait chercher la panne
 * dans la requête qu'on écrit (règle 5). L'étape 4 l'y amènera.
 */
test("le carnet ouvre le formulaire, le projet garde sa fenêtre", () => {
  assert.match(evenements, /estMonCarnet\(store\)\s*\n?\s*\?\s*ouvrirLaComposition\(root\)/);
  assert.match(evenements, /:\s*openCreateModal\(root\)/);
  assert.match(source, /renderCompositionDeLaSituation\(\)/, "et l'écran le rend");
  assert.match(source, /renderFormulaireDeVueHtml\(\{/, "en montant celui des Sujets, pas un second");
});

/**
 * **Ce qu'on compose doit arriver en base.**
 *
 * Les colonnes `icon`, `color` et `requete` existaient depuis l'étape 1 et
 * personne ne les écrivait : une situation créée au formulaire revenait grise,
 * sans icône, ne retenant rien — et l'on aurait cherché la panne dans la
 * requête. C'est le défaut qu'aucun rendu ne montre : un champ absent d'un
 * corps de requête ne lève nulle part.
 *
 * La liste n'est pas recopiée ici : elle vient de ce que `situationAEcrire`
 * produit vraiment. Ajouter une colonne au service sans l'écrire casse ce test.
 */
test("tout ce que le formulaire compose part vers la base", () => {
  const service = readFileSync(resolve(ICI, "../../services/project-situations-supabase.js"), "utf8");
  const depart = service.indexOf("export async function createSituation");
  const fin = service.indexOf("export async function updateSituation");
  assert.ok(depart > 0 && fin > depart, "la création doit se trouver dans le service");

  const creation = service.slice(depart, fin);
  const compose = situationAEcrire({
    nom: "Les urgences", description: "x", requete: "priorite:haute",
    icone: "alert", couleur: "rouge"
  });

  for (const colonne of Object.keys(compose)) {
    assert.match(creation, new RegExp(`\\n\\s*${colonne}:`),
      `${colonne} est composé au formulaire mais n'est pas écrit à la création`);
  }
});
