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
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { renderTitreDEcranHtml } from "../ui/titre-decran.js";
import { NOM_DU_CARNET } from "../../services/mon-carnet.js";
import { renderFormulaireDeVueHtml } from "../project-subjects/project-subjects-recherche.js";
import { champsDesSujets } from "../../services/champs-des-sujets.js";
import { situationAEcrire } from "../../services/situation-en-composition.js";

const ICI = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(ICI, "./project-situations-view.js"), "utf8");
const evenements = readFileSync(resolve(ICI, "./project-situations-events.js"), "utf8");
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

/* ── Le mode et le filtre ont quitté l'écran ─────────────────────────────── */

/**
 * **Trois tests sont morts avec le formulaire qu'ils gardaient.**
 *
 * Ils vérifiaient que « Manuelle » et « Automatique » étaient posés au bon
 * moment, en français, et que le choix partait bien vers la base. La question
 * n'existe plus : une situation dit ce qu'elle retient par sa requête, et le
 * panneau de réglages avec ses cases et ses « IDs séparés par des virgules » a
 * été retiré (étape 4). Ce qui les remplace est ci-dessous : plus rien n'écrit
 * ces deux colonnes, et plus rien ne les montre.
 */
test("le formulaire de réglages n'existe plus", () => {
  assert.equal(
    existsSync(resolve(ICI, "./project-situations-form.js")), false,
    "le fichier doit être supprimé, pas seulement débranché"
  );
  assert.ok(!source.includes("renderSituationForm"), "et l'écran ne le monte plus");
  assert.ok(!evenements.includes("data-situation-edit-field"), "ni ses champs");
  assert.ok(!evenements.includes("situationEditMode"), "ni son choix de mécanique");
});

/**
 * **Plus rien n'écrit `mode` ni `filter_definition`.**
 *
 * Ils restent en base — des situations d'avant y gardent ce qu'elles
 * retiennent, et un constat ne devient pas faux (règle 6) — mais une écriture
 * oubliée quelque part les ferait renaître à moitié : une situation neuve avec
 * un filtre vide et une requête, qui retiendrait l'intersection de deux règles
 * dont une seule est visible (règle 4).
 *
 * L'exception est nommée et elle va dans le bon sens : écrire une requête
 * **efface** l'ancien filtre, parce que la requête le reprend.
 */
test("la création n'écrit ni mode ni filtre", () => {
  const service = readFileSync(resolve(ICI, "../../services/project-situations-supabase.js"), "utf8");
  const depart = service.indexOf("export async function createSituation");
  const fin = service.indexOf("export async function updateSituation");
  const creation = service.slice(depart, fin);

  assert.ok(!/\n\s*mode:/.test(creation), "le mode part à sa valeur par défaut");
  assert.ok(!/\n\s*filter_definition:/.test(creation), "et aucun filtre n'est posé");
  assert.match(creation, /\n\s*requete:/, "c'est la requête qui dit ce qu'elle retient");
});

test("la modification n'écrit le mode que pour effacer l'ancien filtre", () => {
  const service = readFileSync(resolve(ICI, "../../services/project-situations-supabase.js"), "utf8");
  const depart = service.indexOf("export async function updateSituation");
  const fin = service.indexOf("export async function closeSituation");
  const modification = service.slice(depart, fin);

  assert.ok(!modification.includes('hasOwnProperty.call(patch, "mode")'), "on ne lui envoie plus de mode");
  assert.ok(
    !modification.includes('hasOwnProperty.call(patch, "filter_definition")'),
    "ni de filtre"
  );
  assert.match(modification, /body\.filter_definition = null/, "écrire une requête efface celui d'avant");
});

/* ── Le rail du carnet ───────────────────────────────────────────────────── */

/**
 * **Le rail ne se vérifie plus en lisant du texte.**
 *
 * Deux tests vivaient ici : « le carnet monte le rail des sujets » et « les
 * lectures et mes situations peuplent le même rail ». Ils lisaient le code
 * comme du texte, et le second **décrivait exactement le défaut** — les
 * lectures jointes aux épinglées, où elles n'ont rien à faire, et un appel dont
 * la forme de sortie n'était celle de personne.
 *
 * Le module est importable ; on l'avait cru inimportable sans vérifier. Le rail
 * se monte donc pour de vrai dans `project-situations-page.test.mjs`, et ce
 * qu'il porte s'y lit dans le HTML qui sort.
 */

/**
 * **Les personnes commandent trois lectures.** Sans elles, « Assigné à moi »,
 * « Créé par moi » et « Mentions » ne se déclarent pas : le rail n'aurait
 * qu'une entrée sur quatre, sans que rien ne dise pourquoi.
 */
test("le rail reçoit les personnes de tous mes chantiers", () => {
  const persistance = readFileSync(resolve(ICI, "./project-situations-persistence.js"), "utf8");

  const ecran = readFileSync(resolve(ICI, "../project-situations.js"), "utf8");

  assert.match(ecran, /personnes: store\.situationsView\?\.personnesDuCarnet/);
  assert.match(persistance, /chargerLesPersonnesDesChantiers\(chantiers\)/, "et on va les chercher");
});

/* ── Le rail tient ce qu'il promet ───────────────────────────────────────── */

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
 * **Et « Automatique » a quitté l'écran pour de bon** (étape 4).
 *
 * L'étape 3 l'avait caché sur les situations qui portent une requête ; il
 * restait sur les autres, où il ne disait pas mieux la vérité — le mode y est
 * celui de la création, et plus personne ne le modifie. C'est un mot de
 * mécanique là où l'on attend une intention.
 *
 * **Nulle part** : ni dans le tableau, ni sur le panneau de détail. Le laisser
 * d'un seul côté ferait deux réponses à la même question (règle 4).
 */
test("« Manuelle » et « Automatique » ne s'affichent plus nulle part", () => {
  for (const [nom, fichier] of [["l'écran", source], ["le tableau", tableau]]) {
    assert.ok(!fichier.includes('"Automatique"'), `${nom} ne dit plus « Automatique »`);
    assert.ok(!fichier.includes('"Manuelle"'), `${nom} ne dit plus « Manuelle »`);
    assert.ok(!fichier.includes("renderModePill"), `${nom} n'a plus de pastille de mécanique`);
  }
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
test("les deux écrans ouvrent le même formulaire", () => {
  assert.match(evenements, /openButton\.onclick = \(\) => ouvrirLaComposition\(root\)/);
  assert.ok(!evenements.includes("openCreateModal"), "plus de fenêtre à côté (étape 4)");
  assert.match(source, /renderCompositionDeLaSituation\(\)/, "et l'écran le rend");
  assert.match(source, /renderFormulaireDeVueHtml\(\{/, "en montant celui des Sujets, pas un second");
});

/**
 * **Le crayon ouvre le même formulaire, rempli.**
 *
 * Il ouvrait un panneau de réglages où l'on modifiait un filtre sans jamais
 * voir ce qu'il retenait. Deux formulaires pour une même chose, dont un seul
 * montrait le résultat (règle 10).
 */
test("le crayon rouvre la situation dans ce formulaire", () => {
  assert.match(evenements, /data-open-situation-edit[\s\S]{0,200}ouvrirLaCompositionDeLaSituation\(root, situationId\)/);
  assert.match(evenements, /compositionDepuisLaSituation\(situation, \{/);
  assert.ok(!evenements.includes("openEditPanel"), "l'ancien panneau n'est plus ouvert");
  assert.ok(!source.includes("renderEditSituationPanel"), "ni rendu");
});

/**
 * **L'état d'une situation, qui n'est pas une recherche.**
 *
 * Ouverte ou fermée : une situation fermée retiendrait les mêmes sujets, et
 * c'est pourtant par là qu'on la range. C'est la seule chose que le formulaire
 * demande en plus, et elle passe par la place que le formulaire partagé lui
 * laisse — un champ posé et jamais écouté ferait tourner deux boutons sans rien
 * changer.
 */
test("le statut se pose dans le formulaire et part vers la base", () => {
  assert.match(source, /champsEnPlusHtml: renderCeQueLaSituationAEnPlus\(forme\)/,
    "l'écran doit occuper la place que le formulaire lui laisse");
  assert.match(source, /name="situationStatut"/, "et y poser l'état");
  assert.match(evenements, /input\[name="situationStatut"\]/, "qui doit être écouté");
  assert.match(evenements, /poserDansLaComposition\("statut"/, "et atterrir dans la forme");
});

/**
 * **Une situation d'avant arrive avec sa requête reprise, ou vide.**
 *
 * Reprendre un `filter_definition` en requête est une affirmation qui peut
 * échouer : un champ que l'écran ne déclare pas, un label supprimé, une
 * priorité partielle. Préremplir quand même ferait enregistrer une requête qui
 * en dit moins — des sujets disparaîtraient d'une liste que quelqu'un regarde
 * tous les jours, et rien ne l'expliquerait (règle 5).
 */
test("une reprise incomplète ne préremplit rien, et se dit", () => {
  assert.match(evenements, /reprise && !reprise\.perdus\.length/);
  assert.match(evenements, /phraseDesPerdus\(reprise\?\.perdus \?\? \[\]\)/);
  assert.match(source, /situationEnCoursGarde/, "et l'écran la montre");
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

/* ── Épingler et effacer, de bout en bout ────────────────────────────────── */

/**
 * **Le menu est posé dans le tableau et écouté par l'écran.** Un attribut posé
 * d'un seul côté est la panne type : le kebab s'ouvre, l'entrée s'affiche, et
 * le clic ne fait rien.
 *
 * Le menu vient de celui des vues : ses entrées portent donc les attributs des
 * vues, et c'est l'écran des situations qui les reçoit.
 */
test("les gestes du kebab sont posés et écoutés", () => {
  assert.match(tableau, /data-situations-menu=/, "le kebab est posé");
  assert.match(evenements, /data-situations-menu/, "et il est écouté");
  assert.match(evenements, /data-sujets-vue-epingler[\s\S]{0,240}basculerLEpingle/);
  assert.match(evenements, /data-sujets-decrocher[\s\S]{0,240}effacerLaSituation/);
  // Le menu partagé compose l'attribut : `data-${geste.attribut}`. C'est donc
  // le nom qu'on compare, et c'est lui qui doit se retrouver dans l'écoute.
  assert.match(tableau, /attribut: "situations-reprendre"/, "la reprise est posée");
  assert.match(evenements, /data-situations-reprendre[\s\S]{0,240}reprendreLaSienne/,
    "et elle est écoutée — c'est le seul geste d'une situation d'avant");
});

/**
 * **Ce qu'on efface part vraiment en base**, et la colonne de l'épingle aussi.
 * Un champ absent d'un corps de requête ne lève nulle part : c'est le défaut
 * qu'aucun rendu ne montre.
 */
test("l'épingle et l'effacement atteignent la base", () => {
  const service = readFileSync(resolve(ICI, "../../services/project-situations-supabase.js"), "utf8");

  assert.match(service, /hasOwnProperty\.call\(patch, "au_rail"\)/, "l'épingle s'écrit");
  assert.match(service, /export async function deleteSituation/, "et l'effacement existe");
  assert.match(service, /method: "DELETE"/);

  const colonnes = readFileSync(resolve(ICI, "../../services/colonnes-dune-situation.js"), "utf8");
  assert.match(colonnes, /"au_rail"/, "et la colonne se relit, sans quoi le rail serait toujours vide");
});

/* ── Le rail obéit, et le menu ne se fait plus couper ────────────────────── */

/**
 * **Le rail était dessiné et personne ne l'écoutait.** Son bouton de repli et
 * sa poignée sont là depuis l'étape 2 ; rien ne les branchait. Un bouton
 * présent qui n'obéit pas est pire qu'un bouton absent : on croit avoir mal
 * cliqué, et l'on recommence.
 *
 * Tout vient du composant partagé, comme dans la Mémoire, l'Atelier et les
 * Sujets — une quatrième copie de ce calage aurait divergé au premier
 * changement.
 */
test("le carnet branche le repli et la poignée de son rail", () => {
  const ecranDuCarnet = readFileSync(resolve(ICI, "../project-situations.js"), "utf8");

  assert.match(ecranDuCarnet, /bindRailResizer\(\{/, "la poignée vient du composant partagé");
  assert.match(ecranDuCarnet, /followRailScroll\(/, "le calage au défilement aussi");
  assert.match(ecranDuCarnet, /data-project-rail-collapse[\s\S]{0,300}RAIL_REPLIE_CLE/,
    "et le bouton de repli retient son réglage");
  assert.match(ecranDuCarnet, /pageSelector: "\.project-simple-page--situations"/,
    "la poignée pose la largeur sur la page, que l'écran nomme");
});

/**
 * **La coquille de tableau coupe son débordement**, et le menu d'une ligne
 * s'ouvre vers le bas : il était tronqué net. L'écran des vues porte déjà cette
 * exception ; le tableau des situations la reçoit à sa classe.
 */
test("le menu du kebab n'est pas coupé par la coquille", () => {
  const css = readFileSync(resolve(ICI, "../../../style.css"), "utf8");

  assert.match(tableau, /className: "issues-table project-situations-table"/);
  assert.match(css, /\.project-situations-table\.data-table-shell,[\s\S]{0,120}overflow:visible/);
});

/**
 * **Le rail du carnet a un fond, et lui seul.** Il est fixé à la fenêtre, et la
 * boîte du carnet défile horizontalement : le contenu glissait dessous, et les
 * deux se lisaient l'un à travers l'autre. Écarter le contenu règle la position
 * de départ, pas ce qui passe derrière quand on fait défiler.
 *
 * Les écrans de projet le gardent transparent : le trait de l'onglet actif doit
 * rester lisible dessous.
 */
test("le rail du carnet a un fond, celui d'un projet non", () => {
  const css = readFileSync(resolve(ICI, "../../../style.css"), "utf8");

  assert.match(css, /\.project-simple-page--situations \.project-rail\{ background:/);
  assert.doesNotMatch(css, /^\.project-rail\{[^}]*background:/m);
});

/**
 * **Les menus de filtre se posent en ligne, pas en colonne.**
 *
 * `.issues-head-menu` fait `width:100%`, et c'est juste là où il est né : dans
 * le tableau des sujets d'un projet, chaque menu occupe **sa** colonne
 * d'en-tête et la remplit. Dans le formulaire d'une situation, cinq menus
 * partagent une seule cellule : chacun réclamait la largeur entière, et
 * `flex-wrap` les empilait — une colonne de cinq lignes au-dessus de la liste.
 *
 * Deux choses se vérifient ici, parce qu'aucune ne suffit : que la règle de
 * base soit bien celle qu'on croit — si elle changeait, cette exception
 * deviendrait du bruit —, et que le bandeau la lève.
 */
test("les filtres du formulaire d'une situation tiennent sur une ligne", () => {
  const css = readFileSync(resolve(ICI, "../../../style.css"), "utf8");

  assert.match(
    css, /^\.issues-head-menu\{[^}]*width:100%/m,
    "la règle de base est bien celle qui empilait"
  );
  assert.match(
    css, /\.situations-sujets-tete__filtres \.issues-head-menu\{[^}]*width:auto/,
    "et le bandeau des filtres la lève"
  );
});

/**
 * **Le rail passe devant le contenu, et la liste de ses épinglées avec lui.**
 *
 * `position:fixed` avec un `z-index` chiffré crée un **contexte
 * d'empilement** : tout ce qui est dedans y reste enfermé. La liste des
 * épinglées du rail replié porte `z-index:1000` et passait pourtant **sous** le
 * tableau — le rail était à `z-index:0`, le contenu vient après dans le
 * document, et il gagnait.
 *
 * Deux bornes, et il faut les deux : au-dessus de l'en-tête collé d'un tableau,
 * qui la recouvrait à son tour, et sous l'en-tête de l'application, que le rail
 * doit continuer de laisser passer.
 */
test("le rail passe devant les tableaux et derrière l'en-tête", () => {
  const css = readFileSync(resolve(ICI, "../../../style.css"), "utf8");

  const duRail = Number(css.match(/\.project-rail\{[\s\S]*?z-index:(\d+);/)?.[1] ?? 0);
  const deLaTete = Number(css.match(/\.data-table-shell__head\{[\s\S]*?z-index:(\d+);/)?.[1] ?? 0);
  const deLEnTete = Number(css.match(/--z-header:\s*(\d+);/)?.[1] ?? 0);

  assert.ok(deLaTete > 0 && deLEnTete > 0, "les deux bornes existent bien");
  assert.ok(duRail > deLaTete, `le rail (${duRail}) passe devant l'en-tête d'un tableau (${deLaTete})`);
  assert.ok(duRail < deLEnTete, `et derrière celui de l'application (${deLEnTete})`);
});

/**
 * **Les menus de filtre s'ouvrent vers le bas, et le tableau est en haut de la
 * page.** La liste dépassait le bas de la fenêtre et s'y coupait net : on ne
 * voyait que les trois premières valeurs, sans rien pour dire qu'il y en avait
 * vingt. La coupe vient de la boîte qui défile — ce qu'il faut, c'est qu'il y
 * ait où défiler.
 */
test("le formulaire d'une situation garde de la place sous lui", () => {
  const css = readFileSync(resolve(ICI, "../../../style.css"), "utf8");

  const dessous = Number(
    css.match(/\.project-simple-page--situations \.sujets-vue-forme\{[^}]*padding-bottom:(\d+)px/)?.[1] ?? 0
  );

  assert.ok(dessous >= 200, `il en reste ${dessous}px, et un menu ouvert en fait davantage`);
});
