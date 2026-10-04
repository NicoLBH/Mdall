/**
 * Les deux boutons gris de la consommation.
 *
 * Ce qui s'éprouve ici est **l'aller-retour** : ce que le menu écrit dans son
 * attribut, et ce que l'écran en relit. C'est écrit d'un côté et lu de l'autre,
 * et deux écritures d'un même préfixe se renomment un jour d'un seul côté, en
 * silence — le menu garderait son attribut, le clic ne le verrait plus.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  CHOISIR_UN_MOIS, CHOISIR_UN_PAS, ceQueLeMenuDemande,
  renderLeChoixDeLaPeriode, renderLeChoixDuPas
} from "./le-choix-de-la-periode.js";
import { COMBIEN_DE_MOIS, LES_PAS, PAS, moisEnFrancais } from "../../services/consommation-ia.js";

/* ── Ce que le menu dit, et ce que l'écran en lit ─────────────────────────── */

test("ce que le menu des périodes écrit, l'écran le relit", () => {
  const html = renderLeChoixDeLaPeriode({ mois: "2026-10" });
  const actions = [...html.matchAll(/data-menu-action="([^"]+)"/g)].map((un) => un[1]);

  assert.equal(actions.length, COMBIEN_DE_MOIS);
  for (const action of actions) {
    const demande = ceQueLeMenuDemande(action);
    assert.ok(demande, action);
    assert.equal(demande.quoi, "mois");
    assert.match(demande.valeur, /^\d{4}-\d{2}$/);
  }
  // Le premier est celui qu'on regarde : on vient voir le mois en cours ou le
  // précédent neuf fois sur dix.
  assert.equal(ceQueLeMenuDemande(actions[0]).valeur, "2026-10");
});

test("ce que le menu des pas écrit, l'écran le relit", () => {
  const html = renderLeChoixDuPas({ pas: PAS.MOIS });
  const actions = [...html.matchAll(/data-menu-action="([^"]+)"/g)].map((un) => un[1]);

  assert.deepEqual(actions.map((un) => ceQueLeMenuDemande(un).valeur), LES_PAS.map((un) => un.cle));
  for (const action of actions) assert.equal(ceQueLeMenuDemande(action).quoi, "pas");
});

test("une action qui n'est pas des nôtres ne demande rien", () => {
  // L'écran écoute un évènement que tous les boutons à menu de Mdall émettent :
  // sans ce tri, un clic sur « Transformer » changerait la période.
  assert.equal(ceQueLeMenuDemande("proposition:ouvrir"), null);
  assert.equal(ceQueLeMenuDemande(""), null);
  assert.equal(ceQueLeMenuDemande(null), null);
  // Le préfixe seul ne suffit pas : il faut une valeur lisible.
  assert.equal(ceQueLeMenuDemande(`${CHOISIR_UN_MOIS}:octobre`), null);
  assert.equal(ceQueLeMenuDemande(`${CHOISIR_UN_MOIS}:2026-13-99`), null);
});

test("un pas inconnu retombe sur le jour, et ne vide pas l'écran", () => {
  // Un menu dessiné par une version plus récente, un signet : l'écran doit
  // montrer quelque chose plutôt qu'une courbe vide, qui se lit « rien n'a été
  // consommé » (règle 5).
  assert.deepEqual(ceQueLeMenuDemande(`${CHOISIR_UN_PAS}:semaine`), { quoi: "pas", valeur: PAS.JOUR });
});

/* ── Ce que les boutons disent avant qu'on les ouvre ──────────────────────── */

test("le bouton de période porte le mois regardé, pas le mot « Période » seul", () => {
  // Un bouton qui dirait seulement « Période » obligerait à l'ouvrir pour savoir
  // ce qu'on voit — ce que l'écran existe précisément pour dire.
  const html = renderLeChoixDeLaPeriode({ mois: "2026-03" });
  assert.match(html, new RegExp(moisEnFrancais("2026-03")));
});

test("le bouton du pas porte le pas posé", () => {
  for (const un of LES_PAS) {
    assert.match(renderLeChoixDuPas({ pas: un.cle }), new RegExp(un.nom), un.cle);
  }
});

test("le menu ouvert rappelle ce qui est posé, par une coche", () => {
  // Sans elle, le menu ouvert ne dit pas ce qu'on regarde, et l'on recliquerait
  // sur l'entrée déjà active pour s'en assurer.
  // Une seule entrée est cochée, et c'est la seule qui porte une icône : les
  // autres n'en reçoivent aucune, et leur `span` n'est même pas dessiné.
  const periode = renderLeChoixDeLaPeriode({ mois: "2026-10" });
  assert.equal((periode.match(/gh-menu__item-icon/g) ?? []).length, 1);
  assert.match(periode, /data-menu-action="conso-mois:2026-10"[\s\S]{0,200}gh-menu__item-icon/);

  const pas = renderLeChoixDuPas({ pas: PAS.ANNEE });
  assert.equal((pas.match(/gh-menu__item-icon/g) ?? []).length, 1);
  assert.match(pas, /data-menu-action="conso-pas:annee"[\s\S]{0,200}gh-menu__item-icon/);
});

test("les deux boutons sont ceux de Mdall, et non un dessin pour cet écran", () => {
  // Un second bouton à menu divergerait du premier au premier réglage : un
  // chevron ici, un gris un peu autre là (règle 4).
  for (const html of [renderLeChoixDeLaPeriode({ mois: "2026-10" }), renderLeChoixDuPas({})]) {
    assert.match(html, /class="gh-action/);
    assert.match(html, /class="gh-menu"/);
    assert.match(html, /gh-btn/);
    assert.match(html, /aria-haspopup="menu"/);
  }
});
