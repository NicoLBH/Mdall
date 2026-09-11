import test from "node:test";
import assert from "node:assert/strict";

import { GESTE, gesteDeLaTete, renderBoutonDeTri } from "./tete-de-tableau.js";

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
        } else if (element.attributs?.classe === selecteur.replace(/^\./, "")) {
          return element;
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
