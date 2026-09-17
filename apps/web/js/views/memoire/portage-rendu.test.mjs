import test from "node:test";
import assert from "node:assert/strict";

import {
  RECHERCHE, renderCeQuePorteLeSujet, renderCeQuiPorteSurLaValeur, renderLeChemin,
  renderLeDebatQuiATranche
} from "./portage-rendu.js";
import { NATURE } from "../../services/assertion-taxonomy.js";
import { raisonnementDuPoint } from "../../services/raisonnement-du-point.js";

const OUVERT = { id: "p-1", title: "0,80 m tient-il en zone gélive ?", status: "open" };
const AUTRE = { id: "p-2", title: "La classe C est-elle confirmée ?", status: "open" };

const pose = (point, id) => ({ point, lien: { id, declared_by: "u-1" }, confirme: true });
const propose = (point, id) => ({ point, lien: { id, declared_by: null }, confirme: false });

/* ── Ce qui porte sur une valeur ─────────────────────────────────────────── */

test("une valeur en débat cesse de se présenter comme acquise", () => {
  const dit = renderCeQuiPorteSurLaValeur({ portages: [pose(OUVERT, "l-1")] });

  assert.match(dit, /un sujet ouvert porte sur cette valeur/);
  assert.match(dit, /memory-mention memory-portage/);
});

test("deux sujets se comptent, et leurs intitulés sont dans l'info-bulle", () => {
  const dit = renderCeQuiPorteSurLaValeur({ portages: [pose(OUVERT, "l-1"), pose(AUTRE, "l-2")] });

  assert.match(dit, /2 sujets ouverts portent sur cette valeur/);
  assert.match(dit, /0,80 m tient-il en zone gélive \?/);
  assert.match(dit, /La classe C est-elle confirmée \?/);
});

test("rien ne s'écrit quand rien ne porte", () => {
  // L'absence de mention **est** l'absence de débat. La répéter sur chaque ligne
  // donnerait à l'écran l'air de réclamer quelque chose.
  assert.equal(renderCeQuiPorteSurLaValeur({ portages: [] }), "");
  assert.equal(renderCeQuiPorteSurLaValeur({}), "");
});

/* ── Proposé et confirmé ne se lisent pas pareil ─────────────────────────── */

test("une arête proposée se dit au conditionnel, et porte ses deux réponses", () => {
  // La mêler aux confirmées ferait contester une valeur que personne n'a mise en
  // doute. « Porterait » dit exactement ce qu'on sait : un rapprochement de
  // mots, pas un jugement.
  const dit = renderCeQuiPorteSurLaValeur({ portages: [propose(OUVERT, "l-9")] });

  assert.match(dit, /porterait sur cette valeur/);
  assert.doesNotMatch(dit, /porte sur cette valeur/);
  assert.match(dit, /memory-portage--propose/);
  assert.match(dit, /data-portage-confirme="l-9"/);
  assert.match(dit, /data-portage-retire="l-9"/);
});

test("une reconnaissance qui s'est trompée peut être écartée", () => {
  // N'offrir que « confirmer » ferait de la seule réponse possible un
  // acquiescement, et l'on apprendrait à ne plus lire la mention.
  const dit = renderCeQuiPorteSurLaValeur({ portages: [propose(OUVERT, "l-9")] });
  assert.match(dit, /Écarter/);
  assert.match(dit, /Confirmer/);
});

test("les deux mentions coexistent sans se confondre", () => {
  const dit = renderCeQuiPorteSurLaValeur({
    portages: [pose(OUVERT, "l-1"), propose(AUTRE, "l-9")]
  });

  assert.match(dit, /un sujet ouvert porte sur cette valeur/);
  assert.match(dit, /porterait sur cette valeur/);
  // Le compte ne prend que les confirmées : « 2 sujets » dirait d'une
  // reconnaissance qu'elle conteste déjà.
  assert.doesNotMatch(dit, /2 sujets/);
});

test("une écriture en vol désarme les gestes", () => {
  const dit = renderCeQuiPorteSurLaValeur({ portages: [propose(OUVERT, "l-9")], occupe: true });
  assert.equal((dit.match(/disabled/g) ?? []).length, 2);
});

/* ── Le mot de l'écran ───────────────────────────────────────────────────── */

test("l'écran écrit « sujet », jamais « point »", () => {
  const tout = [
    renderCeQuiPorteSurLaValeur({ portages: [pose(OUVERT, "l-1"), propose(AUTRE, "l-9")] }),
    renderLeDebatQuiATranche({ debat: { intitule: "Quelle profondeur ?", par: "Ourdine Ferrand", quand: "12 mars" } }),
    renderCeQuePorteLeSujet({ portages: [{ assertion: { payload: { subject: "Altitude", value: "742,30" } }, lien: { id: "l-1" }, confirme: true }] })
  ].join(" ");

  // Hors des marques de données, qui portent le mot du code : c'est la frontière
  // de l'étape 0, et elle passe exactement là.
  const lisible = tout.replace(/data-[a-z-]+="[^"]*"/g, "").replace(/class="[^"]*"/g, "");
  assert.doesNotMatch(lisible, /\bpoints?\b/i);
  assert.match(lisible, /sujet/);
});

/* ── Où la chaîne continue ───────────────────────────────────────────────── */

test("la chaîne va jusqu'au débat, avec sa date et ses noms", () => {
  const dit = renderLeDebatQuiATranche({
    debat: { intitule: "Quelle profondeur de fondation retenir ?", par: "Ourdine Ferrand", quand: "12 mars 2026" }
  });

  assert.match(dit, /tranché dans le sujet « Quelle profondeur de fondation retenir \? » — Ourdine Ferrand, le 12 mars 2026/);
});

test("une valeur que personne n'a tranchée ne porte pas de mention", () => {
  // La plupart sortent d'un calcul : leur accrocher une mention vide
  // n'apprendrait rien.
  assert.equal(renderLeDebatQuiATranche({ debat: null }), "");
  assert.equal(renderLeDebatQuiATranche({}), "");
});

/* ── Le chemin ───────────────────────────────────────────────────────────── */

test("les cinq étapes sont dessinées, dans l'ordre", () => {
  const chemin = raisonnementDuPoint({
    point: { id: "p-hg", title: "Quelle profondeur de fondation retenir ?" },
    porteSur: [{ sujet: "Altitude", valeur: "742,30" }],
    examine: [{ quoi: "étude géotechnique" }],
    produites: [
      { sujet: "Quelle profondeur de fondation retenir ?", valeur: "0,80 m", nature: NATURE.DECISION },
      { sujet: "Profondeur hors gel", valeur: "0,80 m" }
    ]
  });

  const dit = renderLeChemin({ raisonnement: chemin });

  assert.equal((dit.match(/class="chemin__etape/g) ?? []).length, 5);
  assert.match(dit, /Sujet/);
  assert.match(dit, /Porte sur/);
  assert.match(dit, /Altitude = 742,30/);
  assert.match(dit, /étude géotechnique/);
  assert.match(dit, /Profondeur hors gel = 0,80 m/);
  assert.doesNotMatch(dit, /chemin__etape--manque/);
});

test("une étape vide porte son manque au lieu de disparaître", () => {
  // Un graphe qui perd ses lignes creuses se lit comme un raisonnement complet,
  // et c'est ce qu'il n'est pas.
  const chemin = raisonnementDuPoint({
    point: { id: "p-hg", title: "Quelle profondeur ?" },
    produites: [{ sujet: "Profondeur hors gel", valeur: "0,80 m" }]
  });

  const dit = renderLeChemin({ raisonnement: chemin });

  assert.equal((dit.match(/class="chemin__etape/g) ?? []).length, 5);
  assert.equal((dit.match(/chemin__etape--manque/g) ?? []).length, 3);
  assert.match(dit, /on ne sait pas ce qui a été examiné/);
  assert.match(dit, /Ce raisonnement ne dit pas tout/);
});

test("sans question, aucun chemin ne se dessine", () => {
  // Dessiner cinq lignes vides ferait croire à un travail qui n'a pas eu lieu.
  assert.equal(renderLeChemin({ raisonnement: null }), "");
  assert.equal(renderLeChemin({ raisonnement: { porteSur: [{ sujet: "Altitude" }] } }), "");
});

/* ── L'autre bout, dans le détail d'un sujet ─────────────────────────────── */

test("le détail d'un sujet dit sur quoi il porte, et porte les mêmes gestes", () => {
  // Les mêmes marques de données que sur la ligne de mémoire : inventer un
  // second geste pour le même acte ferait deux choses à apprendre (règle 10).
  const dit = renderCeQuePorteLeSujet({
    portages: [
      { assertion: { payload: { subject: "Altitude", value: "742,30" } }, lien: { id: "l-1" }, confirme: true },
      { assertion: { payload: { subject: "Classe de sol", value: "C" } }, lien: { id: "l-2" }, confirme: false }
    ]
  });

  assert.match(dit, /Altitude = 742,30/);
  assert.match(dit, /Classe de sol = C/);
  assert.match(dit, /data-portage-retire="l-1"/);
  assert.match(dit, /data-portage-confirme="l-2"/);
  assert.match(dit, /portage-liste__ligne--propose/);
  assert.match(dit, /Sur quoi ce sujet porte/);
});

test("un sujet sans arête offre le geste, et n'affirme toujours rien", () => {
  // Le bloc s'affiche maintenant même vide, parce qu'il porte un **geste** : un
  // endroit où agir n'affirme rien. Ce qu'il ne dit toujours pas, c'est « ce
  // sujet ne porte sur rien » — personne ne l'a dit, et l'écran ne l'invente pas.
  const dit = renderCeQuePorteLeSujet({ portages: [] });

  assert.match(dit, /Sur quoi ce sujet porte/);
  assert.match(dit, /data-portage-cherche/);
  assert.doesNotMatch(dit, /portage-liste__corps/);
  assert.doesNotMatch(dit, /ne porte sur rien|aucune valeur|rien/i);
});

test("« rien » se dit de trois façons, et elles ne se confondent pas", () => {
  // Confondre « la reconnaissance n'a rien trouvé » avec « tout est déjà là »
  // ferait croire qu'elle ne marche pas, et l'on cesserait de s'en servir.
  const jamais = renderCeQuePorteLeSujet({ portages: [] });
  const rien = renderCeQuePorteLeSujet({ portages: [], recherche: RECHERCHE.RIEN });
  const deja = renderCeQuePorteLeSujet({ portages: [], recherche: RECHERCHE.DEJA });

  assert.doesNotMatch(jamais, /portage-liste__dit/);
  // Les apostrophes sont échappées — c'est le rendu, pas la phrase, qu'on lit.
  assert.match(rien, /Aucun nom de la mémoire/);
  assert.match(deja, /déjà rattachés, ou ont déjà été écartés/);
  assert.notEqual(rien, deja);
});

test("le même mot pour le même acte, qu'il soit confirmé ou proposé", () => {
  // « Retirer » et « Écarter » auraient fait deux gestes à apprendre pour une
  // seule intention : je ne veux pas de cette arête (règle 10).
  const dit = renderCeQuePorteLeSujet({
    portages: [
      { assertion: { payload: { subject: "Altitude" } }, lien: { id: "l-1" }, confirme: true },
      { assertion: { payload: { subject: "Classe de sol" } }, lien: { id: "l-2" }, confirme: false }
    ]
  });

  assert.equal((dit.match(/>Écarter</g) ?? []).length, 2);
  assert.doesNotMatch(dit, /Retirer/);
});

test("une recherche en vol désarme son propre bouton et le dit", () => {
  const dit = renderCeQuePorteLeSujet({ portages: [], occupe: true });
  assert.match(dit, /data-portage-cherche disabled/);
  assert.match(dit, /Recherche…/);
});

test("une valeur sans valeur se dit par son seul nom", () => {
  const dit = renderCeQuePorteLeSujet({
    portages: [{ assertion: { subject_key: "Altitude" }, lien: { id: "l-1" }, confirme: true }]
  });
  assert.match(dit, />Altitude</);
});

/* ── Rien ne passe en clair ──────────────────────────────────────────────── */

test("un intitulé qui porte du balisage ne s'exécute pas", () => {
  const mechant = { id: "p-x", title: '<img src=x onerror="alert(1)">', status: "open" };
  const dit = renderCeQuiPorteSurLaValeur({ portages: [propose(mechant, "l-9")] });

  assert.doesNotMatch(dit, /<img/);
  assert.match(dit, /&lt;img/);
});

test("chaque phrase a son propre élément dans la mention", () => {
  // Du texte posé nu dans une boîte flexible est un élément anonyme : rien ne
  // peut lui dire quelle place prendre, et un parent étroit le réduit jusqu'au
  // mot le plus long. Vérifié au navigateur à 1440, 900 et 640 px.
  const tout = [
    renderCeQuiPorteSurLaValeur({ portages: [pose(OUVERT, "l-1"), propose(AUTRE, "l-9")] }),
    renderLeDebatQuiATranche({ debat: { intitule: "Quelle profondeur ?", par: "Ourdine Ferrand" } })
  ].join("");

  assert.equal((tout.match(/memory-mention__dit/g) ?? []).length, 3);
  assert.match(tout, /<span class="memory-mention__dit">un sujet ouvert porte sur cette valeur<\/span>/);
});
