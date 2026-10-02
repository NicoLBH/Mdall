/**
 * La vue d'un fil de mails rouvert.
 *
 * Les messages sont inventés. Aucun nom réel, aucune adresse réelle.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  ceQueDitLaNature, lesMesuresDites, renderLeDetailDunFil, renderLeFilReplie,
  renderLesIdeesDuFil, renderLesPrisesDuFil
} from "./le-detail-dun-fil.js";

const UNE_VUE = {
  fil: {
    objet: "Reprise des enduits", phrase: "7 messages du 12 février au 2 mars, 1 trou.",
    doublons: 1, trous: [{}],
    messages: [
      { de: { nom: "Ourdine Ferrand" }, quand: "le 12 février",
        propos: "Les enduits du pignon nord sont à reprendre." },
      { de: { nom: "BERTRAND" }, quand: "le 2 mars", propos: "Semaine 11." }
    ]
  },
  releve: {
    enCours: false,
    prises: [
      { nature: "constat", intitule: "Enduits à reprendre", citation: "sont à reprendre" },
      { nature: "engagement", intitule: "Intervention semaine 11",
        citation: "Semaine 11", pour_qui: "BERTRAND", echeance: "2026-03-09" }
    ]
  },
  idees: [{ dite: "reprise des enduits → avant la réception", lien: "but", combien: 2 }]
};

test("le détail dit ce que la lecture a valu", () => {
  const html = renderLeDetailDunFil(UNE_VUE);

  assert.match(html, /2 message\(s\)/);
  assert.match(html, /2 prise\(s\)/);
  assert.match(html, /1 idée\(s\)/);
  assert.match(html, /1 doublon\(s\)/);
  assert.match(html, /1 trou\(s\)/);
});

test("les prises sont groupées par nature, parce que c'est ainsi qu'on les lit", () => {
  const html = renderLesPrisesDuFil(UNE_VUE);

  assert.match(html, /Constat — 1/);
  assert.match(html, /Engagement — 1/);
  assert.match(html, /Intervention semaine 11/);
  // La citation est celle que le serveur a vérifiée contre le fil : c'est elle
  // qui permet d'y revenir.
  assert.match(html, /« Semaine 11 »/);
  assert.match(html, /pour le 2026-03-09/);
});

test("« non relevées » n'est pas « aucune »", () => {
  // `null` et `[]` mènent à des gestes opposés : relancer un relevé qui coûte un
  // appel, ou conclure que ce fil ne porte rien (règle 5).
  assert.match(renderLesPrisesDuFil({ ...UNE_VUE, releve: null }),
    /l'étape n'a pas eu lieu/);
  assert.match(renderLesPrisesDuFil({ ...UNE_VUE, releve: { prises: [] } }),
    /Aucune prise de position relevée/);

  assert.match(lesMesuresDites({ ...UNE_VUE, releve: null }), /prises non relevées/);
});

test("une nature inconnue garde son mot", () => {
  // La liste est fermée côté serveur ; une prise qu'on ne sait pas nommer reste
  // une prise, et la ranger ailleurs la ferait lire de travers.
  assert.equal(ceQueDitLaNature("engagement"), "Engagement");
  assert.equal(ceQueDitLaNature("autre-chose"), "autre-chose");

  const html = renderLesPrisesDuFil({
    releve: { prises: [{ nature: "autre-chose", intitule: "X" }] }
  });
  assert.match(html, /autre-chose/);
});

test("les idées sont celles du jour de la lecture", () => {
  const html = renderLesIdeesDuFil(UNE_VUE);
  assert.match(html, /reprise des enduits → avant la réception/);
  assert.match(html, /2×/);

  assert.match(renderLesIdeesDuFil({ idees: [] }), /Aucune idée relevée/);
});

test("le fil vient en dernier, et replié", () => {
  const html = renderLeFilReplie(UNE_VUE);

  assert.match(html, /<details/);
  assert.match(html, /Le fil déplié — 2 message\(s\)/);
  assert.match(html, /Ourdine Ferrand/);
  // **Le propos, et non le message entier** : ce qu'un message cite a déjà été
  // dit par celui qui l'a écrit.
  assert.match(html, /Les enduits du pignon nord sont à reprendre\./);
});

test("une lecture sans fil ne se dessine pas vide", () => {
  const html = renderLeDetailDunFil(null);
  assert.match(html, /ne s'ouvre pas/);
  assert.match(html, /on ne sait pas lequel des deux/);
});

test("l'ordre du détail suit ce qu'on vient y chercher", () => {
  const html = renderLeDetailDunFil(UNE_VUE);
  const prises = html.indexOf("Les prises de position");
  const idees = html.indexOf("Les idées énoncées");
  const fil = html.indexOf("Le fil déplié");

  assert.ok(prises > 0 && prises < idees, "les prises d'abord");
  assert.ok(idees < fil, "le fil en dernier, c'est le plus long");
});
