import test from "node:test";
import assert from "node:assert/strict";

import { GESTE, ceQuiRecouvre, gesteDeLaTete, nomDuNoeud, renderBoutonDeTri } from "./tete-de-tableau.js";

/**
 * Un nœud qui sait seulement répondre à `closest`, comme le DOM.
 *
 * C'est tout ce dont la décision a besoin : ce qui l'a fait échouer quatre fois
 * n'était pas du dessin ni du style, c'était **où le clic était entendu**. On
 * vérifie donc la décision, et rien d'autre.
 */
function noeud(attributs = {}, ancetres = []) {
  const chaine = [{ attributs }, ...ancetres];
  return {
    closest(selecteur) {
      const parAttribut = /^\[data-([a-z0-9-]+)(?:="(.*)")?\]$/.exec(selecteur);
      for (const element of chaine) {
        if (parAttribut) {
          const [, nom, valeurAttendue] = parAttribut;
          const valeur = element.attributs?.[`data-${nom}`];
          if (valeur === undefined) continue;
          if (valeurAttendue !== undefined && valeur !== valeurAttendue) continue;
          return {
            getAttribute: (nomLu) => element.attributs?.[nomLu] ?? null,
            attributs: element.attributs
          };
        } else {
          // Le sélecteur des zones en liste une poignée : la tête du tableau et
          // la barre de commandes. `closest` accepte la liste ; la feinte aussi.
          const classes = selecteur.split(",").map((part) => part.trim().replace(/^\./, ""));
          if (classes.includes(element.attributs?.classe)) return element;
        }
      }
      return null;
    }
  };
}

const DANS_UNE_TETE = [{ attributs: { classe: "data-table-shell__head" } }];

/* ── Ce qui est écouté, et seulement cela ────────────────────────────────── */

test("un bouton déclaré est reconnu, avec ce qu'il demande", () => {
  const geste = gesteDeLaTete(
    noeud({ "data-subjects-status-filter": "closed" }, DANS_UNE_TETE),
    { attributs: ["subjects-status-filter"] }
  );

  assert.equal(geste.geste, GESTE.BOUTON);
  assert.equal(geste.attribut, "subjects-status-filter");
  assert.equal(geste.valeur, "closed");
});

test("le bouton de copie de la tête est reconnu", () => {
  const geste = gesteDeLaTete(
    noeud({ "data-copier": "sujets-liste" }, DANS_UNE_TETE),
    { copies: ["sujets-liste"] }
  );

  assert.equal(geste.geste, GESTE.COPIE);
  assert.equal(geste.cible, "sujets-liste");
});

/**
 * **Le garde-fou de l'écoute globale.** Un écouteur posé sur le document voit
 * tous les clics de l'application. S'il prenait la main sur ce qu'il ne connaît
 * pas, il casserait les écrans qu'il n'a jamais été censé servir — un remède
 * bien pire que le mal qu'il soigne.
 */
test("un bouton que personne n'a déclaré passe son chemin", () => {
  const geste = gesteDeLaTete(
    noeud({ "data-situations-status-filter": "closed" }, DANS_UNE_TETE),
    { attributs: ["subjects-status-filter"] }
  );

  assert.equal(geste.geste, GESTE.RIEN);
});

test("hors d'une tête de tableau, on ne se mêle de rien", () => {
  // Le même bouton, ailleurs dans la page : ce n'est pas notre affaire.
  const geste = gesteDeLaTete(
    noeud({ "data-subjects-status-filter": "closed" }),
    { attributs: ["subjects-status-filter"] }
  );

  assert.equal(geste.geste, GESTE.RIEN);
});

test("un clic sur le fond de la tête ne déclenche rien", () => {
  const geste = gesteDeLaTete(noeud({}, DANS_UNE_TETE), {
    attributs: ["subjects-status-filter"],
    copies: ["sujets-liste"]
  });

  assert.equal(geste.geste, GESTE.RIEN);
});

test("une copie déclarée ailleurs ne répond pas à celle-ci", () => {
  const geste = gesteDeLaTete(
    noeud({ "data-copier": "chemin-du-fichier" }, DANS_UNE_TETE),
    { copies: ["sujets-liste"] }
  );

  assert.equal(geste.geste, GESTE.RIEN);
});

/* ── Ce qui est cliqué est rarement le bouton lui-même ───────────────────── */

/**
 * On clique l'intitulé, la pastille du compteur ou le trait de l'icône, jamais
 * le rectangle du bouton. C'est précisément ce que `closest` remonte, et
 * l'oublier rendrait l'écoute vraie en test et fausse à l'écran.
 */
test("cliquer l'intérieur d'un bouton vaut cliquer le bouton", () => {
  const geste = gesteDeLaTete(
    noeud({}, [
      { attributs: { "data-subjects-status-filter": "open" } },
      ...DANS_UNE_TETE
    ]),
    { attributs: ["subjects-status-filter"] }
  );

  assert.equal(geste.geste, GESTE.BOUTON);
  assert.equal(geste.valeur, "open");
});

test("sans rien de cliquable, la décision reste muette", () => {
  assert.equal(gesteDeLaTete(null, { attributs: ["x"] }).geste, GESTE.RIEN);
  assert.equal(gesteDeLaTete({}, { attributs: ["x"] }).geste, GESTE.RIEN);
});

/* ── Le bouton de tri ────────────────────────────────────────────────────── */

test("le bouton de tri porte son attribut, son état et ce qu'il va faire", () => {
  const html = renderBoutonDeTri({
    attribut: "subjects-sort",
    valeur: "derniere-activite",
    actif: false,
    titre: "Trier par dernière activité"
  });

  assert.match(html, /data-subjects-sort="derniere-activite"/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /Trier par dernière activité/);
  assert.match(html, /sort-desc/);
});

test("le tri en place se voit", () => {
  const html = renderBoutonDeTri({ attribut: "subjects-sort", valeur: "", actif: true, titre: "Revenir" });
  assert.match(html, /class="table-head-sort is-active"/);
  assert.match(html, /aria-pressed="true"/);
});

test("un attribut douteux ne dessine rien plutôt qu'un sélecteur cassé", () => {
  assert.equal(renderBoutonDeTri({ attribut: "sujets sort\"", valeur: "x" }), "");
  assert.equal(renderBoutonDeTri(), "");
});

/* ── Ce qui ne doit pas revenir ──────────────────────────────────────────── */

/**
 * **Le garde-fou du tour.** Le filtre des sujets a été réparé trois fois sans
 * jamais revivre, parce que chaque réparation portait sur ce que le bouton fait
 * et jamais sur l'endroit d'où on l'écoute. Tant que l'écoute est reposée sur la
 * racine de l'onglet, le prochain rendu peut la reperdre — et les trois boutons
 * de la tête redeviendront muets ensemble.
 */
test("l'écran des sujets n'écoute plus sa tête depuis une racine", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const lis = (chemin) => readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), "utf8");

  const evenements = lis("../project-subjects/project-subjects-events.js");
  const vue = lis("../project-subjects/project-subjects-view.js");

  assert.doesNotMatch(
    evenements,
    /closest\("\[data-subjects-status-filter\]"\)/,
    "le filtre est redevenu un branchement délégué sur la racine"
  );
  assert.match(evenements, /quandOnClique\("subjects-status-filter"/);
  assert.match(evenements, /quandOnClique\("subjects-sort"/);

  assert.doesNotMatch(
    vue,
    /brancherLesBoutonsCopier\(panelHost/,
    "le bouton copier est redevenu un branchement sur un nœud redessiné"
  );
  assert.match(vue, /quandOnCopie\("sujets-liste"/);
});

/* ── Ce qui reçoit vraiment le geste ─────────────────────────────────────── */

const cadre = (left, top, width, height) => ({ left, top, width, height });

/**
 * **La mesure qui manquait.** Un bouton recouvert par un élément transparent
 * s'éclaire encore au survol — le survol remonte toute la chaîne des ancêtres —
 * mais l'appui part ailleurs. Rien à l'écran ne distingue ce cas d'un bouton
 * sans écoute, et c'est exactement la confusion qui a coûté cinq tours.
 */
test("un bouton recouvert est nommé, avec ce qui le recouvre", () => {
  const bouton = { contains: () => false, tagName: "BUTTON" };
  const voile = { tagName: "DIV", id: "", className: "voile-transparent" };

  const ennuis = ceQuiRecouvre(
    [{ cle: "button.table-head-sort", noeud: bouton, cadre: cadre(10, 10, 20, 20) }],
    { elementDuPoint: () => voile }
  );

  assert.equal(ennuis.length, 1);
  assert.equal(ennuis[0].cle, "button.table-head-sort");
  assert.equal(ennuis[0].recouvertPar, "div.voile-transparent");
});

test("un bouton qui reçoit le point ne dit rien", () => {
  const bouton = { contains: () => false, tagName: "BUTTON" };
  assert.deepEqual(
    ceQuiRecouvre([{ cle: "b", noeud: bouton, cadre: cadre(0, 0, 10, 10) }], { elementDuPoint: () => bouton }),
    []
  );
});

/**
 * On appuie presque toujours sur l'icône ou l'intitulé, jamais sur le rectangle
 * du bouton : un enfant sous le point est le cas **normal**, pas un ennui.
 */
test("un enfant du bouton sous le point n'est pas un recouvrement", () => {
  const icone = { tagName: "SVG" };
  const bouton = { tagName: "BUTTON", contains: (noeud) => noeud === icone };

  assert.deepEqual(
    ceQuiRecouvre([{ cle: "b", noeud: bouton, cadre: cadre(0, 0, 10, 10) }], { elementDuPoint: () => icone }),
    []
  );
});

/**
 * Un bouton sans surface n'est pas recouvert : il n'est pas dessiné. Le
 * signaler ferait du bruit sur chaque écran replié — et un diagnostic qui crie
 * tout le temps ne se lit plus.
 */
test("un bouton qui n'occupe aucune place ne se plaint pas", () => {
  const bouton = { tagName: "BUTTON", contains: () => false };
  assert.deepEqual(
    ceQuiRecouvre([{ cle: "b", noeud: bouton, cadre: cadre(0, 0, 0, 0) }], { elementDuPoint: () => ({ tagName: "DIV" }) }),
    []
  );
});

/**
 * Un bouton sorti de la fenêtre ne se vise pas : interroger ce point
 * accuserait ce qui s'y trouve d'un recouvrement qui n'existe pas.
 */
test("un bouton hors de la fenêtre ne fait accuser personne", () => {
  const bouton = { tagName: "BUTTON", contains: () => false };
  const ennuis = ceQuiRecouvre(
    [{ cle: "b", noeud: bouton, cadre: cadre(10, -400, 20, 20) }],
    { elementDuPoint: () => ({ tagName: "HEADER" }), fenetre: { largeur: 1200, hauteur: 800 } }
  );

  assert.deepEqual(ennuis, []);
});

/**
 * **Ne pas toucher à l'appui.** Empêcher son geste par défaut supprimerait le
 * clic qui devait suivre, la prise de focus et le `mousedown` que d'autres
 * écrans attendent — on remplacerait une panne par une autre. C'est le
 * garde-fou des gestes déjà faits qui évite le doublon, pas la suppression de
 * l'événement suivant.
 */
test("seul le clic voit son geste par défaut empêché", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const source = readFileSync(fileURLToPath(new URL("./tete-de-tableau.js", import.meta.url)), "utf8");

  assert.match(source, /if \(evenement\.type === "click"\) evenement\.preventDefault\(\);/);
  assert.equal(
    (source.match(/evenement\.preventDefault\(\)/g) || []).length, 1,
    "l'appui s'est remis à empêcher son geste par défaut"
  );
});

test("sans moyen d'interroger le point, on ne prétend pas savoir", () => {
  // Règle 5 : ne pas pouvoir mesurer ne se dit pas « tout va bien ».
  assert.deepEqual(ceQuiRecouvre([{ cle: "b", noeud: {}, cadre: cadre(0, 0, 10, 10) }]), []);
});

/**
 * Ce texte part dans un presse-papiers, puis dans un message : il ne porte que
 * de quoi reconnaître le nœud, jamais ce qui est écrit dedans.
 */
test("nommer un nœud n'emporte pas son contenu", () => {
  const nom = nomDuNoeud({
    tagName: "DIV",
    id: "projectShell",
    className: "project-shell is-open autre quatrieme",
    textContent: "Étanchéité toiture — M. Dupont"
  });

  assert.match(nom, /^div#projectShell/);
  assert.doesNotMatch(nom, /Dupont/);
  assert.doesNotMatch(nom, /Étanchéité/);
  assert.equal(nom.split(".").length - 1, 3, "au plus trois classes");
});

test("un nœud sans rien se nomme quand même", () => {
  assert.equal(nomDuNoeud(null), "rien");
  assert.equal(nomDuNoeud({ tagName: "SPAN" }), "span");
});

/* ── L'appui, et pas seulement le clic ───────────────────────────────────── */

/**
 * **Le constat du tour.** Un bouton de tri neuf, enregistré auprès d'un
 * écouteur posé sur le document, est né muet. Un écouteur de `click` en capture
 * sur le document voit tous les clics de la page — sauf ceux qui n'existent
 * pas. Or le navigateur ne produit un `click` que si l'appui et le
 * relâchement tombent sur le même élément ; tout ce qui remplace sous le doigt
 * ce qu'on presse le supprime sans rien dire, et le survol continue de
 * répondre.
 *
 * L'appui, lui, arrive toujours. C'est la seule famille de causes qu'un
 * écouteur de `click` ne peut pas atteindre, quel que soit l'endroit où on le
 * pose.
 */
test("la tête écoute l'appui, pas seulement le clic", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const source = readFileSync(fileURLToPath(new URL("./tete-de-tableau.js", import.meta.url)), "utf8");

  assert.match(source, /addEventListener\("pointerdown", auGeste, \{ capture: true \}\)/);
  assert.match(source, /addEventListener\("click", auGeste, \{ capture: true \}\)/);
});

/**
 * Le même geste ne doit pas partir deux fois : l'appui agit, le clic qui suit
 * se tait. Sans quoi la copie partirait en double.
 *
 * **Et le doublon ne se reconnaît pas à ce que le bouton demande.** Une bascule
 * change de demande dès qu'elle a agi : le tri passe à « revenir à l'ordre du
 * projet » au rendu qui suit l'appui. Un doublon repéré par la valeur ne
 * reconnaîtrait donc pas le clic de son propre appui, et déferait aussitôt ce
 * que l'appui venait de faire — le bouton paraîtrait mort une fois de plus,
 * pour une raison toute neuve.
 */
test("le clic d'un appui déjà traité se reconnaît sans comparer la valeur", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const source = readFileSync(fileURLToPath(new URL("./tete-de-tableau.js", import.meta.url)), "utf8");

  assert.match(source, /if \(evenement\.type === "click" && clicDuMemeAppui\(quand\)\) return;/);
  assert.match(source, /if \(evenement\.type === "pointerdown"\) APPUI\.traiteA = quand;/);
  // Le témoin est un instant, jamais une clé de geste : aucune valeur de bouton
  // ne doit entrer dans cette décision.
  assert.doesNotMatch(source, /clicDuMemeAppui\([^)]*cle/);
});

/**
 * L'écoute est posée à la construction de l'écran, pas au branchement d'une
 * racine : ce branchement peut ne pas avoir lieu, et c'est invérifiable depuis
 * le code.
 */
test("l'écran des sujets pose son écoute sans attendre une racine", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const evenements = readFileSync(
    fileURLToPath(new URL("../project-subjects/project-subjects-events.js", import.meta.url)), "utf8"
  );

  const bind = evenements.slice(evenements.indexOf("function bindSituationsEvents("));
  assert.doesNotMatch(
    bind.slice(0, 400),
    /ecouterLaTeteDesSujets\(\)/,
    "l'écoute est redevenue dépendante du branchement de la racine"
  );
  assert.match(evenements, /\n  ecouterLaTeteDesSujets\(\);\n\n  return \{/);
});

/* ── La barre de commandes est écoutée comme la tête ─────────────────────── */

const DANS_LA_BARRE = [{ attributs: { classe: "project-table-toolbar" } }];

/**
 * **Un outil de diagnostic ne peut pas dépendre de ce qu'il diagnostique.** Le
 * bouton qui copie l'état de la liste vivait dans la tête du tableau, contre le
 * filtre dont il devait expliquer le silence — et il s'est tu avec lui. Il vit
 * maintenant dans la barre de commandes, qui ne dépend pas du rendu du tableau.
 */
test("le bouton copier de la barre de commandes est entendu", () => {
  const geste = gesteDeLaTete(
    noeud({ "data-copier": "sujets-liste" }, DANS_LA_BARRE),
    { copies: ["sujets-liste"] }
  );

  assert.equal(geste.geste, GESTE.COPIE);
  assert.equal(geste.cible, "sujets-liste");
});

test("la barre de commandes reste une zone, pas la page entière", () => {
  const geste = gesteDeLaTete(
    noeud({ "data-copier": "sujets-liste" }, [{ attributs: { classe: "gh-panel" } }]),
    { copies: ["sujets-liste"] }
  );

  assert.equal(geste.geste, GESTE.RIEN);
});

/* ── Ce qu'aucun tour ne doit plus perdre ────────────────────────────────── */

/**
 * **Le constat qui a renversé cinq tours.** On clique « Fermés », rien ne
 * bouge ; on change d'onglet, on revient, la liste des fermés s'affiche. Donc
 * le geste arrive et l'état s'écrit : ce qui manque est le rendu qui devait
 * suivre.
 *
 * Une exception dans un écouteur ne fait rien tomber — elle s'écrit dans la
 * console et la page continue, l'air de rien. C'est ainsi qu'un rendu jamais
 * produit peut passer cinq tours durant pour un bouton sans écoute. Elle se
 * note désormais, et le geste dit qu'il a été fait.
 */
test("un geste qui échoue ne se perd pas en silence", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const source = readFileSync(fileURLToPath(new URL("./tete-de-tableau.js", import.meta.url)), "utf8");

  assert.match(source, /noter\("geste reçu"/);
  assert.match(source, /noter\("geste fait"/);
  assert.match(source, /noterLEchec\("geste · échec", erreur\)/);
});

/**
 * Le redessin qui suit un geste est le maillon suspect : il est encadré, et son
 * entrée comme sa sortie se notent. Ce qui manque entre les deux nomme la
 * rupture.
 */
test("le redessin des sujets est encadré, entrée et sortie", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const lis = (chemin) => readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), "utf8");

  const evenements = lis("../project-subjects/project-subjects-events.js");
  const vue = lis("../project-subjects/project-subjects-view.js");

  assert.match(evenements, /noter\("redessin · demandé"/);
  assert.match(evenements, /noterLEchec\("redessin · échec", erreur\)/);
  assert.match(vue, /noter\("redessin · entrée"/);
  assert.match(vue, /noter\("redessin · sortie"/);

  // Le nombre d'hôtes tranche la dernière famille de causes : un rendu qui a
  // bien lieu, mais ailleurs que sur l'écran qu'on regarde.
  assert.match(vue, /hotes: document\.querySelectorAll\("#situationsPanelHost"\)\.length/);
});

test("le bouton copier a quitté la tête pour la barre de commandes", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const vue = readFileSync(
    fileURLToPath(new URL("../project-subjects/project-subjects-view.js", import.meta.url)), "utf8"
  );

  assert.doesNotMatch(vue, /table-head-filter__copier/, "le bouton est retourné dans la tête");
  assert.match(vue, /project-table-toolbar__copier/);
});
