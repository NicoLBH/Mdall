import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { colonnesDuBandeau, renderSujetsEpinglesHtml } from "./project-subjects-table.js";

const lis = (chemin) => readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), "utf8");

/** Ce qu'une carte demande pour se dessiner, et rien de plus. */
const DEPS = {
  escapeHtml: (valeur) => String(valeur ?? ""),
  svgIcon: () => "",
  issueIcon: () => "",
  getEffectiveSujetStatus: () => "open",
  getEntityReviewMeta: () => ({}),
  getReviewTitleStateClass: () => "",
  getEntityDisplayRef: (_type, sujet) => `#${sujet?.id ?? ""}`,
  firstNonEmpty: (...valeurs) => valeurs.find(Boolean) ?? ""
};

/* ── Le bandeau ──────────────────────────────────────────────────────────── */

/**
 * Le bandeau **ne dessine rien quand il n'y a rien** : un cadre vide au-dessus
 * du tableau ferait croire à une liste qui n'a pas fini de charger.
 */
test("sans sujet épinglé, le bandeau n'existe pas dans la page", () => {
  assert.equal(renderSujetsEpinglesHtml({ sujets: [], deps: DEPS }), "");
  assert.equal(renderSujetsEpinglesHtml(), "");
});

/**
 * **Une carte seule fait la moitié de la largeur, pas la largeur entière.**
 * Pleine largeur au-dessus d'un tableau pleine largeur, elle ne se distinguerait
 * plus de lui : elle deviendrait sa première ligne, et cesserait d'être un
 * repère.
 */
test("une épingle occupe la moitié, deux la moitié chacune, trois un tiers", () => {
  assert.equal(colonnesDuBandeau(1), 2);
  assert.equal(colonnesDuBandeau(2), 2);
  assert.equal(colonnesDuBandeau(3), 3);
});

test("le nombre de colonnes ne descend jamais sous deux", () => {
  assert.equal(colonnesDuBandeau(0), 2);
  assert.equal(colonnesDuBandeau(-4), 2);
  assert.equal(colonnesDuBandeau(), 2);
});

test("le bandeau porte ses colonnes, et une carte par épingle", () => {
  const html = renderSujetsEpinglesHtml({
    sujets: [{ id: "s-1", title: "Étanchéité" }, { id: "s-2", title: "Garde-corps" }],
    deps: DEPS
  });

  assert.match(html, /--subjects-pinned-colonnes:2/);
  assert.equal(html.split("subject-pinned-card\"").length - 1, 2);
});

/**
 * Le titre ouvre le sujet **par le même déclencheur que le tableau**. Deux
 * chemins vers le même sujet doivent se comporter pareil, et ils le font parce
 * que c'est le même bouton (règle 10).
 */
test("le titre d'une carte ouvre le sujet comme une ligne du tableau", () => {
  const html = renderSujetsEpinglesHtml({ sujets: [{ id: "s-1", title: "Étanchéité" }], deps: DEPS });

  assert.match(html, /js-row-title-trigger/);
  assert.match(html, /data-row-entity-type="sujet"/);
  assert.match(html, /data-row-entity-id="s-1"/);
});

/**
 * Et la croix retire l'épingle par **le même attribut** que le bouton du
 * panneau de droite : un seul geste, une seule écoute, une seule décision.
 */
test("la croix d'une carte retire l'épingle par le geste commun", () => {
  const html = renderSujetsEpinglesHtml({ sujets: [{ id: "s-1", title: "Étanchéité" }], deps: DEPS });
  assert.match(html, /data-subject-pin="s-1"/);
});

/**
 * Une carte ne redit pas tout du sujet : ni labels, ni assignés, ni compteur de
 * messages. Elle porte de quoi le reconnaître et y retourner — le reste en
 * ferait une seconde ligne de tableau, en plus encombrante.
 */
test("une carte porte l'état, le titre et la référence, et rien de plus", () => {
  const html = renderSujetsEpinglesHtml({ sujets: [{ id: "s-1", title: "Étanchéité" }], deps: DEPS });

  assert.match(html, /subject-pinned-card__ref/);
  assert.doesNotMatch(html, /cell-assignees-value/);
  assert.doesNotMatch(html, /cell-messages-value/);
});

/**
 * Sans de quoi échapper le texte, on ne dessine rien plutôt qu'une carte dont
 * le titre pourrait porter du balisage.
 */
test("sans de quoi échapper, la carte ne se dessine pas", () => {
  assert.equal(renderSujetsEpinglesHtml({ sujets: [{ id: "s-1" }], deps: {} }), "");
});

/* ── Ce que le défaut des six tours a appris ─────────────────────────────── */

/**
 * **Les aides de l'épingle vivent dans leur fabrique.**
 *
 * `resetSubjectsPaginationPage` vivait après l'accolade fermante de la sienne,
 * là où `store` n'existe pas : chaque clic levait un `ReferenceError`, tu par
 * l'écouteur, et le redessin n'arrivait jamais. Le bouton paraissait sourd
 * alors qu'il entendait très bien.
 *
 * `basculerLEpingle` lit `store` et appelle `rerenderPanels` : le même piège
 * l'attend, et il coûterait les mêmes tours à trouver.
 */
test("les aides de l'épingle sont dans la fabrique qui leur donne store", () => {
  const vue = lis("./project-subjects-view.js");

  const debut = vue.indexOf("export function createProjectSubjectsView(deps) {");
  assert.ok(debut >= 0, "la fabrique a changé de nom");

  for (const nom of ["function basculerLEpingle", "function assurerLesEpingles", "function ecouterLEpingle"]) {
    const ou = vue.indexOf(nom);
    assert.ok(ou > debut, `${nom} a été sortie de sa fabrique`);
  }

  // **L'écoute se pose au montage**, pas au premier rendu du bouton : un bouton
  // dessiné avant elle resterait muet jusqu'au rendu suivant. On vérifie donc
  // qu'elle est appelée dans le corps de la fabrique, après la fin de la
  // dernière fonction et avant que la fabrique ne rende ses outils — sans
  // exiger qu'elle en soit la voisine immédiate, ce qui casserait au premier
  // appel ajouté à côté.
  const appel = vue.indexOf("\n  ecouterLEpingle();");
  assert.ok(appel > debut, "l'écoute n'est plus posée par la fabrique");
  assert.ok(appel < vue.lastIndexOf("\n  return {"), "l'écoute est posée après le rendu des outils");
});

/**
 * Le bandeau ne se dessine que si la vue le reçoit. Un rendu importé mais
 * jamais passé à la fabrique laisserait le code juste et l'écran vide — c'est
 * exactement le genre de silence qui coûte des tours.
 */
test("le bandeau est branché de bout en bout", () => {
  const racine = lis("../project-subjects.js");
  const vue = lis("./project-subjects-view.js");

  // Importé, puis passé à la fabrique : deux occurrences, pas une.
  assert.ok(
    racine.split("renderSujetsEpinglesHtml").length - 1 >= 2,
    "le rendu du bandeau est importé mais jamais passé à la vue"
  );
  assert.match(vue, /renderSujetsEpinglesHtml\(\{/);
});

/**
 * **Un nom qu'on attend et que personne ne donne.**
 *
 * `getFlatSubjects` était déjà déstructuré des dépendances de la vue, et
 * personne ne le fournissait : il valait `undefined`, sans bruit, tant que rien
 * ne l'appelait. Le bandeau a été le premier à l'appeler — et le tableau des
 * sujets a disparu de l'écran, sur un `TypeError` levé au premier rendu.
 *
 * C'est la même famille que le défaut des six tours : un nom qui ne désigne
 * rien, qui ne se plaint qu'au moment où quelqu'un s'en sert, et dont la panne
 * ressemble à tout autre chose. Ici la vérification est possible sans exécuter
 * l'écran, alors on la fait.
 */
test("tout ce que la vue attend, la racine le fournit", () => {
  const vue = lis("./project-subjects-view.js");
  const racine = lis("../project-subjects.js");

  const debut = vue.indexOf("export function createProjectSubjectsView(deps) {");
  assert.ok(debut >= 0, "la fabrique a changé de nom");
  const bloc = vue.slice(debut, vue.indexOf("} = deps;", debut));
  const attendus = [...bloc.matchAll(/^ {4}([A-Za-z_$][\w$]*),?\s*$/gm)].map((trouve) => trouve[1]);

  assert.ok(attendus.length > 20, "la liste des dépendances n'a pas été relue");

  const ouvre = racine.indexOf("createProjectSubjectsView({");
  assert.ok(ouvre >= 0, "la fabrique n'est plus appelée avec un objet littéral");
  const config = racine.slice(ouvre, racine.indexOf("\n});", ouvre));

  const manquants = attendus.filter(
    (nom) => !new RegExp(`(^|[\\s{,])${nom}\\s*[:,]`, "m").test(config)
  );

  assert.deepEqual(manquants, [], `la vue attend des dépendances que personne ne lui donne : ${manquants.join(", ")}`);
});
