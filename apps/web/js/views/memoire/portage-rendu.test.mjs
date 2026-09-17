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

const VALEUR = (sujet, valeur) => ({ payload: { subject: sujet, value: valeur } });
const POSE = { assertion: VALEUR("Altitude", "742,30"), lien: { id: "l-1" }, confirme: true };
const PROPOSE = { assertion: VALEUR("Classe de sol", "C"), lien: { id: "l-2" }, confirme: false };

test("ce qui est confirmé et ce qui est proposé sont deux blocs, deux titres", () => {
  // Un seul titre — « Sur quoi ce sujet porte » — coiffait les deux. Il
  // **affirmait** ce que les boutons **demandaient**, et l'on cliquait
  // « Confirmer » sans savoir ce qu'on confirmait. Vu à l'écran d'un vrai projet.
  const dit = renderCeQuePorteLeSujet({ portages: [POSE, PROPOSE] });

  assert.match(dit, /Ce sujet porte sur/);
  assert.match(dit, /Ces valeurs portent le même nom/);
  assert.match(dit, /data-portage-retire="l-1"/);
  assert.match(dit, /data-portage-confirme="l-2"/);
});

test("le bloc des propositions dit d'où elles sortent, et ce qu'on demande", () => {
  // Trois manques, et chacun suffisait à rendre l'écran incompréhensible : d'où
  // sortent ces lignes, ce qu'on demande, et ce que ça fait.
  const dit = renderCeQuePorteLeSujet({ portages: [PROPOSE] });

  assert.match(dit, /Le nom « Classe de sol » apparaît dans le titre de ce sujet/);
  assert.match(dit, /Est-ce de celles-ci que ce sujet parle \?/);
  assert.match(dit, /Confirmer une valeur la montre « en débat »/);
  assert.match(dit, /Écarter la retire, et elle ne sera plus reproposée/);
});

test("le nom annoncé est celui des lignes annoncées, pas celui d'à côté", () => {
  // La ligne confirmée au-dessus peut s'appeler tout autrement — elle n'a pas
  // été rapprochée, quelqu'un l'a posée. La lire ici nommerait un mot que la
  // reconnaissance n'a jamais trouvé dans le titre.
  const dit = renderCeQuePorteLeSujet({ portages: [POSE, PROPOSE] });

  assert.match(dit, /Le nom « Classe de sol » apparaît/);
  assert.doesNotMatch(dit, /Le nom « Altitude » apparaît/);
});

test("deux noms rapprochés par un même titre ne s'annoncent pas comme un seul", () => {
  // « Profondeur hors gel au Bâtiment A » contient deux noms de la mémoire, et
  // la reconnaissance remonte les deux. En nommer un seul ferait chercher un mot
  // qui n'explique que la moitié de la liste (règle 5) ; la phrase générique,
  // elle, reste vraie.
  const autre = { assertion: VALEUR("Altitude", "742,30"), lien: { id: "l-3" }, confirme: false };
  const dit = renderCeQuePorteLeSujet({ portages: [PROPOSE, autre] });

  assert.match(dit, /Un nom de la mémoire apparaît dans le titre de ce sujet/);
  assert.doesNotMatch(dit, /Le nom «/);
});

test("une valeur sans nom lisible ne fait pas annoncer un nom vide", () => {
  const anonyme = { assertion: { payload: {} }, lien: { id: "l-4" }, confirme: false };
  const dit = renderCeQuePorteLeSujet({ portages: [anonyme] });

  assert.match(dit, /Un nom de la mémoire apparaît dans le titre de ce sujet/);
  assert.doesNotMatch(dit, /Le nom «/);
});

test("les boutons répondent à la question posée juste au-dessus", () => {
  // « Confirmer » et « Écarter » demandent de connaître le mécanisme. Sous une
  // question — « est-ce de celles-ci que ce sujet parle ? » —, la réponse est
  // oui ou non, et elle ne s'apprend pas.
  //
  // Sur une arête **déjà confirmée**, il n'y a plus de question : le geste est
  // de défaire, et il s'appelle « Écarter ». Deux mots, parce que ce sont deux
  // actes — et un seul mécanisme derrière, la même marque de données.
  const propose = renderCeQuePorteLeSujet({ portages: [PROPOSE] });
  const pose = renderCeQuePorteLeSujet({ portages: [POSE] });

  assert.match(propose, />Oui, celle-ci</);
  assert.match(propose, />Non</);
  assert.match(pose, />Écarter</);
  assert.doesNotMatch(pose, />Oui, celle-ci</);
});

test("un sujet sans arête offre le geste, et n'affirme toujours rien", () => {
  // Le bloc des propositions s'affiche même vide, parce qu'il porte un **geste**
  // : un endroit où agir n'affirme rien. Celui des confirmées, lui, disparaît —
  // il affirme, et il n'a rien à affirmer.
  const dit = renderCeQuePorteLeSujet({ portages: [] });

  assert.match(dit, /Ces valeurs portent le même nom/);
  assert.match(dit, /data-portage-cherche/);
  assert.doesNotMatch(dit, /Ce sujet porte sur/);
  assert.doesNotMatch(dit, /portage-liste__corps/);
  assert.doesNotMatch(dit, /ne porte sur rien|aucune valeur/i);
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

/* ── L'histoire d'une valeur, sous la valeur ─────────────────────────────── */

const AVEC_HISTOIRE = {
  assertion: VALEUR("Profondeur hors gel", "0,466 m"),
  lien: { id: "l-9" },
  confirme: false,
  histoire: {
    quoi: { sujet: "Profondeur hors gel", valeur: "0,466 m" },
    ou: ["Bâtiment A"],
    quand: "2024-05-14T10:00:00Z",
    qui: "Ourdine Ferrand",
    proposition: 14,
    origine: { genre: "regle", quoi: "Profondeur hors gel", par: "", le: "" },
    parceQue: { source: "etude-geotechnique.pdf", article: "", citation: "Sol de type moraine", page: 12 },
    entrees: [{ sujet: "Altitude", valeur: "742,30" }],
    regle: null, decision: null, debat: null, examens: null, avant: [],
    lacunes: []
  }
};

test("ce qui distingue deux valeurs est lisible sans rien ouvrir", () => {
  // Trois lignes « Profondeur hors gel = 0,466 m » ne se choisissent pas. La
  // portée, la date et l'origine sont ce qui les sépare, et les lire ne doit
  // pas coûter cinq dépliants ouverts et comparés de mémoire.
  //
  // On lit donc **ce qui précède le dépliant**, et rien d'autre : qu'une portée
  // soit quelque part dans le rendu ne dit pas qu'on la voit.
  const dit = renderCeQuePorteLeSujet({ portages: [AVEC_HISTOIRE] });
  const visible = dit.split("<details")[0];

  assert.match(visible, /portage-liste__identite/);
  assert.match(visible, /Bâtiment A/);
  assert.match(visible, /Ourdine Ferrand/);
  assert.match(visible, /déduite par la règle Profondeur hors gel/);
});

test("ce qui identifie ne se répète pas dans le dépliant", () => {
  // La même portée écrite deux fois sur la même ligne fait douter qu'il s'agisse
  // de la même (règle 4). Le dépliant explique ; il ne redit pas.
  const dit = renderCeQuePorteLeSujet({ portages: [AVEC_HISTOIRE] });
  const [visible, replie = ""] = dit.split("<details");

  assert.match(visible, /Bâtiment A/);
  assert.doesNotMatch(replie, /Bâtiment A/);
  assert.doesNotMatch(replie, /Ourdine Ferrand/);
  assert.doesNotMatch(replie, /déduite par la règle/);
});

test("le reste de l'histoire se déplie, et il est là", () => {
  // Cinq histoires entières dépliées feraient une page qu'on ne lit pas ; mais
  // ce qui explique la valeur doit être à un clic, pas ailleurs.
  const dit = renderCeQuePorteLeSujet({ portages: [AVEC_HISTOIRE] });

  assert.match(dit, /<summary>Pourquoi cette valeur \?<\/summary>/);
  assert.match(dit, /Parce que/);
  assert.match(dit, /Sol de type moraine/);
  assert.match(dit, /etude-geotechnique\.pdf, p\. 12/);
  assert.match(dit, /Elle a lu/);
  assert.match(dit, /Altitude = 742,30/);
});

test("ce que la mémoire ne dit pas est écrit, pas comblé", () => {
  // Une valeur dont rien ne dit l'origine n'est pas une valeur dont l'origine va
  // de soi. La nommer est ce qui permet d'aller l'écrire (règle 5).
  const nue = {
    assertion: VALEUR("Profondeur hors gel", "0,47 m"),
    lien: { id: "l-8" },
    confirme: false,
    histoire: {
      quoi: { sujet: "Profondeur hors gel", valeur: "0,47 m" },
      ou: [], quand: "", qui: "", proposition: null,
      origine: { genre: "rien", quoi: "", par: "", le: "" },
      parceQue: { source: "", article: "", citation: "", page: null },
      entrees: [], regle: null, decision: null, debat: null, examens: null, avant: [],
      lacunes: ["origine", "pourquoi", "auteur", "portee"]
    }
  };

  const dit = renderCeQuePorteLeSujet({ portages: [nue] });

  // Les apostrophes sont échappées — on lit le rendu, pas la phrase.
  assert.match(dit, /Ce que la mémoire ne dit pas/);
  assert.match(dit, /rien ne dit d&#39;où vient cette valeur/);
  assert.match(dit, /on ne sait pas qui l&#39;a versée/);
  assert.match(dit, /rien ne dit sur quelle partie de l&#39;ouvrage elle porte/);
});

test("une écriture en vol désarme tous les gestes du bloc, et le dit", () => {
  // Deux clics sur « Oui, celle-ci » pendant que le premier vole poseraient deux
  // fois la même arête. Le bouton de recherche le dit en plus, parce que lui
  // seul met du temps sans rien changer à l'écran.
  const dit = renderCeQuePorteLeSujet({ portages: [POSE, PROPOSE], occupe: true });

  assert.match(dit, /data-portage-cherche disabled/);
  assert.match(dit, /Recherche…/);
  assert.equal((dit.match(/disabled/g) ?? []).length, 4);
});

test("l'histoire se lit dans la liste d'intitulés de la Mémoire, pas une autre", () => {
  // La même chose — un intitulé, une valeur — se montre pareil sur les deux
  // écrans. Une seconde grille ici et les colonnes ne s'alignent plus d'un
  // écran à l'autre, sans que personne ne voie pourquoi.
  const dit = renderCeQuePorteLeSujet({ portages: [AVEC_HISTOIRE] });

  assert.match(dit, /<dl class="memory-facts">/);
});

test("une valeur sans histoire ne fabrique pas de dépliant vide", () => {
  const dit = renderCeQuePorteLeSujet({ portages: [PROPOSE] });
  assert.doesNotMatch(dit, /<summary>/);
  assert.doesNotMatch(dit, /portage-liste__identite/);
});

/* ── Ce qui a été écarté ─────────────────────────────────────────────────── */

const ECARTE = {
  assertion: VALEUR("Profondeur hors gel", "0,80 m"),
  lien: { id: "l-7" },
  quand: "2026-03-12T10:00:00Z",
  qui: "Ourdine Ferrand"
};

test("un refus se relit, avec qui a dit non et quand", () => {
  // Écarter retirait la valeur, et le refus disparaissait avec elle. Six mois
  // plus tard, personne ne sait que la question a été tranchée, et on la rouvre
  // en réunion (règle 6).
  const dit = renderCeQuePorteLeSujet({ portages: [], ecartes: [ECARTE] });

  assert.match(dit, /Ces valeurs ont été écartées/);
  assert.match(dit, /Profondeur hors gel = 0,80 m/);
  assert.match(dit, /Écartée le 12 mars 2026 par Ourdine Ferrand/);
});

test("un refus ne s'offre pas : aucun bouton sur sa ligne", () => {
  // Il n'y a plus rien à décider. Un bouton ici redemanderait ce qui est déjà
  // répondu, et « Confirmer » sur une valeur écartée est un piège.
  const dit = renderCeQuePorteLeSujet({ portages: [], ecartes: [ECARTE] });
  const bloc = dit.slice(dit.indexOf("portage-liste--ecarte"));

  assert.doesNotMatch(bloc, /<button/);
  assert.doesNotMatch(bloc, /data-portage-confirme|data-portage-retire/);
});

test("un refus dont on ignore la date ou l'auteur le dit quand même", () => {
  // « Écartée » tout court se lit « quelqu'un, un jour » — c'est peu, mais
  // c'est vrai, et cela suffit à ne pas recommencer. Inventer serait pire.
  const dit = renderCeQuePorteLeSujet({
    portages: [],
    ecartes: [{ assertion: VALEUR("Altitude", "742,30"), lien: { id: "l-6" }, quand: "", qui: "" }]
  });

  assert.match(dit, /Ces valeurs ont été écartées/);
  assert.match(dit, /portage-liste__pastille">Écartée</);
  assert.doesNotMatch(dit, /le  par|par <\/span>/);
});

test("sans refus, le bloc des écartées ne s'écrit pas", () => {
  // Il constate ; sans rien à constater il n'a rien à dire, et un bloc vide
  // ferait chercher ce qu'il annonce.
  const dit = renderCeQuePorteLeSujet({ portages: [PROPOSE] });

  assert.doesNotMatch(dit, /Ces valeurs ont été écartées/);
  assert.doesNotMatch(dit, /portage-liste--ecarte/);
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
