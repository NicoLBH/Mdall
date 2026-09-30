import test from "node:test";
import assert from "node:assert/strict";

import {
  EXTRAIT_DUN_CORPS, leJour, renderLeGesteDeRelire, renderLepisodeDeLaCorrespondance,
  renderUnFil
} from "./episode-de-la-correspondance.js";
import { episodeDuneArchive } from "../../services/episode-dune-archive.js";
import { LIGNES_DE_BASE, lesDomainesVenus } from "../../services/ligne-de-base.js";
import { mesureDuPredicteur } from "../../services/mesure-du-passe.js";

/**
 * Une correspondance inventée de toutes pièces.
 *
 * Aucun nom réel, aucun chantier réel : BERTRAND et NOVACLIM n'existent pas, et
 * Montholon (89110) non plus. Un jeu d'essai copié d'un vrai dossier ne prouve
 * rien et expose quelqu'un.
 */
const LA_CORRESPONDANCE = [
  {
    objet: "Fondations bâtiment A",
    quand: "2026-02-03T09:12:00Z",
    qui: { adresse: "etudes@novaclim.example" },
    corps: "Bonjour, quelle profondeur hors gel retenez-vous sur ce terrain ? "
      + "Nous sommes en zone sismique 3 d'après la carte."
  },
  {
    objet: "RE: Fondations bâtiment A",
    quand: "2026-02-05T14:30:00Z",
    qui: { adresse: "bertrand@verifas.example" },
    corps: "Profondeur hors gel à 0,80 m. Voir l'Eurocode 7 pour la portance."
  },
  {
    objet: "Étanchéité toiture terrasse",
    quand: "2026-04-18T08:00:00Z",
    qui: { adresse: "etudes@novaclim.example" },
    corps: "Le DTU 43.1 impose un relevé d'étanchéité de 15 cm au-dessus de la protection."
  },
  {
    objet: "Sans date celui-là",
    quand: "",
    qui: { adresse: "bertrand@verifas.example" },
    corps: "Pour mémoire."
  }
];

const lEpisode = () => episodeDuneArchive({ messages: LA_CORRESPONDANCE });
const lesMesures = (episode) => LIGNES_DE_BASE.map((ligne) => ({
  ...ligne,
  mesure: mesureDuPredicteur(episode, { predire: ligne.predire, arrive: lesDomainesVenus })
}));

test("un jour se lit en français, et une date illisible ne s'invente pas", () => {
  assert.match(leJour("2026-02-03T09:12:00Z"), /03 févr\.? 2026/);
  assert.equal(leJour(""), "");
  assert.equal(leJour("pas une date"), "");
});

/**
 * **Rien ne part avant qu'on le demande.** Deux cents rapatriements ne peuvent
 * pas démarrer parce qu'on a ouvert les Indicateurs : le geste s'annonce.
 */
test("le geste de relire dit ce qu'il va faire, et qu'il ne verse rien", () => {
  const dessine = renderLeGesteDeRelire();
  assert.match(dessine, /Relire la correspondance/);
  assert.match(dessine, /Rien n'est versé/);
  assert.match(dessine, /id="insightsRelireBtn"/);
  assert.doesNotMatch(dessine, /disabled/);
});

test("pendant la lecture, le bouton ne se reclique pas", () => {
  const dessine = renderLeGesteDeRelire({ enCours: true });
  assert.match(dessine, /disabled/);
  assert.match(dessine, /Lecture…/);
});

/**
 * **Le chiffre d'abord.** C'est la référence à battre qui décide de tout le
 * reste ; la dessiner en bas de page reviendrait à la traiter comme une
 * curiosité. Elle vient donc avant la suite des fils.
 */
test("la référence à battre est dessinée avant la suite des fils", () => {
  const episode = lEpisode();
  const dessine = renderLepisodeDeLaCorrespondance(episode, lesMesures(episode));

  const ouLaReference = dessine.indexOf("La référence à battre");
  const ouLaSuite = dessine.indexOf("La suite</h3>");
  assert.ok(ouLaReference >= 0, "la référence à battre n'est pas dessinée");
  assert.ok(ouLaSuite >= 0, "la suite des fils n'est pas dessinée");
  assert.ok(ouLaReference < ouLaSuite, "la référence est dessinée après la suite");
});

/**
 * **La réserve est sérieuse, et elle doit être à l'écran.** Quelqu'un montrera
 * cette chronologie en réunion : il doit savoir qu'elle vient de ses mails
 * privés, et que rien de tout cela n'est entré dans la mémoire du chantier.
 */
test("l'épisode porte la réserve de confidentialité", () => {
  const episode = lEpisode();
  const dessine = renderLepisodeDeLaCorrespondance(episode, lesMesures(episode));
  assert.match(dessine, /privés/);
  assert.match(dessine, /personne d&#39;autre|personne d'autre/);
  assert.match(dessine, /mémoire du chantier/);
});

test("ce qu'on a relu se dit, avec le plafond quand il y en a un", () => {
  const episode = lEpisode();
  const dessine = renderLepisodeDeLaCorrespondance(episode, lesMesures(episode), {
    bilan: { lus: 200, tous: 1400, illisibles: 2 }
  });
  assert.match(dessine, /200 messages relus/);
  assert.match(dessine, /sur 1400 déposés/);
  assert.match(dessine, /2 ne se sont pas laissé relire/);
});

/**
 * **Ce qu'on n'a pas su lire est dit, pas tu.** C'est la colonne qui dit où la
 * lecture est aveugle, donc quelle ligne écrire ensuite (règle 5).
 */
test("le message sans date est compté, et ne disparaît pas de l'écran", () => {
  const episode = lEpisode();
  assert.equal(episode.combien.sansDate, 1);
  const dessine = renderLepisodeDeLaCorrespondance(episode, lesMesures(episode));
  assert.match(dessine, /n&#39;a pas de date|n'a pas de date/);
});

test("les fils sont dessinés dans l'ordre où ils se sont ouverts", () => {
  const episode = lEpisode();
  const dessine = renderLepisodeDeLaCorrespondance(episode, lesMesures(episode));
  const ouFondations = dessine.indexOf("Fondations bâtiment A");
  const ouEtancheite = dessine.indexOf("Étanchéité toiture terrasse");
  assert.ok(ouFondations >= 0 && ouEtancheite >= 0);
  assert.ok(ouFondations < ouEtancheite, "février est dessiné après avril");
});

/**
 * **Le fil replié se compte, et se rouvre.** Chaque fil porte le bouton qui
 * l'ouvre : sans lui, la chronologie serait une liste qu'on ne peut pas refuser.
 */
test("chaque fil porte le geste qui l'ouvre", () => {
  const episode = lEpisode();
  const dessine = renderLepisodeDeLaCorrespondance(episode, lesMesures(episode));
  for (const fil of episode.ouvertures) {
    assert.match(dessine, new RegExp(`data-episode-fil="${fil.cle}"`), fil.titre);
  }
});

/**
 * **Un constat qu'on ne peut pas justifier est un constat qu'on ne peut pas
 * refuser.** Chaque constat montre le texte qui l'a déclenché, tel quel.
 */
test("un fil ouvert montre le texte qui a déclenché chaque constat", () => {
  const episode = lEpisode();
  const fil = episode.ouvertures.find((un) => un.titre.includes("Fondations"));
  const dessine = renderUnFil(episode, fil.cle);

  const siens = episode.constats.filter((un) => un.dansLeFil === fil.cle);
  assert.ok(siens.length > 0, "ce fil ne cite rien : le jeu d'essai ne prouve rien");
  for (const constat of siens) {
    assert.ok(dessine.includes(constat.trouve),
      `le texte « ${constat.trouve} » n'est pas montré`);
  }
});

test("un fil qui n'existe pas ne dessine rien", () => {
  const episode = lEpisode();
  assert.equal(renderUnFil(episode, "un-fil-qui-n-existe-pas"), "");
  assert.equal(renderUnFil(null, "quoi"), "");
});

/**
 * **Le corps est un extrait, pas le fil.** Cet écran sert à juger une
 * chronologie ; la lecture d'un fil se fait dans `lecture-des-mails`.
 */
test("un corps trop long est coupé, et le dit", () => {
  const long = "a".repeat(EXTRAIT_DUN_CORPS + 50);
  const episode = episodeDuneArchive({
    messages: [{ objet: "Un fil", quand: "2026-02-03T09:12:00Z", qui: {}, corps: long }]
  });
  const dessine = renderUnFil(episode, episode.ouvertures[0].cle);
  assert.match(dessine, /…/);
  assert.equal(dessine.includes("a".repeat(EXTRAIT_DUN_CORPS + 1)), false);
});

/**
 * **Ce qui vient d'un mail se dessine échappé.** Un objet qui porte des chevrons
 * est le cas ordinaire d'une réponse automatique, et l'écrire tel quel ferait de
 * la correspondance déposée un vecteur d'injection.
 */
test("un objet qui ressemble à du HTML ne fait pas de HTML", () => {
  const episode = episodeDuneArchive({
    messages: [{
      objet: "<img src=x onerror=alert(1)> profondeur hors gel",
      quand: "2026-02-03T09:12:00Z",
      qui: { adresse: "a@b.example" },
      corps: "<script>alert(2)</script> Eurocode 7"
    }]
  });
  const dessine = renderLepisodeDeLaCorrespondance(episode, [])
    + renderUnFil(episode, episode.ouvertures[0].cle);

  assert.equal(dessine.includes("<img src=x"), false);
  assert.equal(dessine.includes("<script>"), false);
  assert.match(dessine, /&lt;img/);
});
