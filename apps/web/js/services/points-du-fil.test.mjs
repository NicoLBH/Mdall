import assert from "node:assert/strict";
import test from "node:test";

import {
  LABEL_DU_FIL, NON_PORTEE, ORIGINE_PRIVEE, OUVRENT_UN_SUJET, ceQuiResteDehors,
  descriptionDuPoint, introDuFil, phraseDeLaNonPortee, pointsDuFil, pourquoiPasPortee,
  titreDeLaProposition
} from "./points-du-fil.js";
import { NATURE } from "./prises-de-position.js";
import { LABEL_DU_CR } from "./label-du-cr.js";

const prise = (dessus = {}) => ({
  key: "prise:1", nature: NATURE.DEMANDE, intitule: "confirmer la cote du relevé",
  citation: "Pouvez-vous confirmer la cote avant vendredi ?", message: 2,
  qui: "Ourdine Ferrand", quand: "12 mars 2026 à 09:14",
  pourQui: "BERTRAND", echeance: "avant vendredi", porteSur: "cote du seuil", ...dessus
});

const FIL = { objet: "Étanchéité toiture", phrase: "Étanchéité toiture · 3 messages du 3 au 12 mars 2026" };

// ── Le label et l'identité ─────────────────────────────────────────────────

test("un fil porte « Échange », là où un compte rendu porte « CR chantier »", () => {
  assert.equal(LABEL_DU_FIL, "Échange");
  assert.notEqual(LABEL_DU_FIL, LABEL_DU_CR);
});

test("le titre de la proposition est l'objet du fil et sa période", () => {
  // Un compte rendu s'appelle « n° 14 du 3 mars ». Un fil n'a pas de numéro.
  assert.equal(titreDeLaProposition(FIL),
    "Échange · Étanchéité toiture · 3 messages du 3 au 12 mars 2026");
});

test("un fil sans identité garde au moins son label", () => {
  assert.equal(titreDeLaProposition(null), "Échange");
});

// ── Cinq natures ouvrent un sujet, deux n'en ouvrent pas ───────────────────

test("les cinq natures du tableau ouvrent un sujet", () => {
  for (const nature of OUVRENT_UN_SUJET) assert.equal(pourquoiPasPortee(prise({ nature })), "");
  assert.equal(OUVRENT_UN_SUJET.length, 5);
});

test("un constat ne devient pas un sujet : il va en mémoire", () => {
  // La mémoire s'écrit par un autre chemin, et l'y forcer ferait un sujet par
  // phrase du fil.
  assert.equal(pourquoiPasPortee(prise({ nature: NATURE.CONSTAT })), NON_PORTEE.VA_EN_MEMOIRE);
});

test("une source ne devient pas un sujet : elle fonde un constat", () => {
  assert.equal(pourquoiPasPortee(prise({ nature: NATURE.SOURCE })), NON_PORTEE.FONDE_UN_CONSTAT);
});

test("seules les cinq sortent en points", () => {
  const prises = [
    prise({ nature: NATURE.CONSTAT }), prise({ nature: NATURE.SOURCE }),
    prise({ nature: NATURE.DEMANDE }), prise({ nature: NATURE.DESACCORD, positions: [] })
  ];
  assert.deepEqual(pointsDuFil(prises).map((point) => point.natureDuFil),
    [NATURE.DEMANDE, NATURE.DESACCORD]);
});

test("ce qui reste dehors se compte, par motif", () => {
  // Taire ce qu'on laisse serait promettre ce qu'on ne fait pas.
  const dehors = ceQuiResteDehors([
    prise({ nature: NATURE.CONSTAT }), prise({ nature: NATURE.CONSTAT }),
    prise({ nature: NATURE.SOURCE }), prise({ nature: NATURE.DEMANDE })
  ]);
  assert.deepEqual(dehors, [
    { motif: NON_PORTEE.VA_EN_MEMOIRE, combien: 2 },
    { motif: NON_PORTEE.FONDE_UN_CONSTAT, combien: 1 }
  ]);
});

test("chaque motif de non-portée porte sa phrase", () => {
  for (const motif of Object.values(NON_PORTEE)) assert.ok(phraseDeLaNonPortee(motif), motif);
  assert.equal(phraseDeLaNonPortee("inconnu"), "");
});

// ── La forme que la chaîne attend ──────────────────────────────────────────

test("un point porte ce que la confrontation et la proposition attendent", () => {
  const [point] = pointsDuFil([prise()]);
  assert.equal(point.titre, "confirmer la cote du relevé");
  assert.equal(point.qui, "BERTRAND");
  assert.equal(point.echeance, "avant vendredi");
  assert.equal(point.citation, "Pouvez-vous confirmer la cote avant vendredi ?");
  assert.equal(point.page, 2);
});

test("le rang du message tient lieu de page", () => {
  // C'est le même geste que pour un compte rendu : remonter à l'endroit exact
  // d'où la ligne sort.
  assert.equal(pointsDuFil([prise({ message: 7 })])[0].page, 7);
});

test("aucune référence n'est inventée", () => {
  // Un fil ne numérote pas ses prises : une référence fabriquée changerait à
  // chaque relevé, et le même fil reproposerait deux fois la même chose.
  assert.equal(pointsDuFil([prise()])[0].reference, null);
});

test("une prise sans intitulé ne fait pas un sujet sans titre", () => {
  assert.deepEqual(pointsDuFil([prise({ intitule: "  " })]), []);
});

// ── Le point dit d'où il sort, et qu'on n'ira pas plus loin ────────────────

test("la description porte la citation, son auteur et sa date", () => {
  const description = descriptionDuPoint(prise());
  assert.ok(description.includes("Ourdine Ferrand"));
  assert.ok(description.includes("12 mars 2026 à 09:14"));
  assert.ok(description.includes("Pouvez-vous confirmer la cote avant vendredi ?"));
});

test("chaque point porte « issu d'un échange privé »", () => {
  // Le dossier « Mails » n'est pas partagé : celui qui relit le sujet doit
  // savoir qu'il ne remontera pas à la source. C'est une asymétrie assumée,
  // pas un oubli.
  for (const nature of OUVRENT_UN_SUJET) {
    const [point] = pointsDuFil([prise({ nature, positions: [] })]);
    assert.ok(point.description.includes(ORIGINE_PRIVEE), nature);
  }
});

test("un désaccord porte les mots de celui qui conteste", () => {
  const desaccord = prise({
    nature: NATURE.DESACCORD, porteSur: "humidité de l'acrotère", avant: ["BERTRAND"],
    positions: [{
      qui: "Ourdine Ferrand", quand: "12 mars",
      citation: "Je ne partage pas votre position sur l'humidité."
    }]
  });
  const description = descriptionDuPoint(desaccord);
  assert.ok(description.includes("Je ne partage pas votre position sur l'humidité."));
  assert.ok(description.includes("Une position est contestée"));
  assert.ok(description.includes("Se sont exprimés avant sur le même sujet : BERTRAND."));
});

test("un désaccord que personne n'a précédé le dit", () => {
  // Nommer au jugé prêterait à quelqu'un un propos qu'il n'a pas tenu.
  const description = descriptionDuPoint(prise({
    nature: NATURE.DESACCORD, porteSur: "humidité de l'acrotère", avant: [],
    positions: [{ qui: "Ourdine Ferrand", citation: "Je ne partage pas votre position." }]
  }));
  assert.ok(description.includes("Personne d'autre ne s'est exprimé sur ce sujet"));
});

test("une question sans réponse dit combien de messages l'ont ignorée", () => {
  const description = descriptionDuPoint(prise({ nature: NATURE.SANS_REPONSE, apresElle: 3 }));
  assert.ok(description.includes("Aucun des 3 messages qui suivent ne la reprend."));
});

test("une question dans le dernier message dit que le fil s'arrête là", () => {
  // Elle n'a pas été ignorée : personne n'a eu le temps de l'ignorer, et c'est
  // une autre chose pour qui décide d'ouvrir un sujet.
  const description = descriptionDuPoint(prise({ nature: NATURE.SANS_REPONSE, apresElle: 0 }));
  assert.ok(description.includes("Aucun message ne la suit dans ce fil."));
});

// ── Ce que la proposition dit d'elle-même ──────────────────────────────────

test("l'intro dit ce que la proposition porte", () => {
  const intro = introDuFil({ fil: FIL, points: pointsDuFil([prise()]), prises: [prise()] });
  assert.ok(intro.includes("Étanchéité toiture"));
  assert.ok(intro.includes("1 sujet à ouvrir"));
  assert.ok(intro.includes(ORIGINE_PRIVEE));
});

test("l'intro dit aussi ce qu'elle laisse", () => {
  // Une introduction qui ne parlerait que des sujets ouverts ferait croire que
  // le fil n'a rien donné de plus.
  const prises = [prise(), prise({ nature: NATURE.CONSTAT }), prise({ nature: NATURE.CONSTAT })];
  const intro = introDuFil({ fil: FIL, points: pointsDuFil(prises), prises });
  assert.ok(intro.includes("2 prises de position ne sont pas portées ici"));
  assert.ok(intro.includes("la mémoire s'écrit par un autre chemin"));
});

test("un fil sans sujet à ouvrir le dit plutôt que de promettre", () => {
  const prises = [prise({ nature: NATURE.CONSTAT })];
  const intro = introDuFil({ fil: FIL, points: pointsDuFil(prises), prises });
  assert.ok(intro.includes("Aucun sujet à ouvrir"));
});
