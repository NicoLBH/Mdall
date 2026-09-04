/**
 * La recherche de cotes : ce qu'elle essaie, ce qu'elle retient, ce qu'elle coûte.
 *
 * Le calcul est donné en paramètre, donc tout se relit ici sans réseau. C'est
 * voulu : une recherche fausse rendrait des semelles fausses sans qu'aucun
 * ratio ne le dise.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  echelleLarge, echelleFine, hauteurMinimale, essaisPourUnAppui, premiereQuiPasse,
  verificationGouvernante, predimensionner, volumeTotal, motDeLErreur, COTE_MIN, COTE_MAX
} from "./predimensionnement-fondations.js";
import { resultatDeLaSemelle } from "./fondations-declaration.js";

test("l'échelle large monte du minimum au maximum, par crans de 40 cm", () => {
  const cotes = echelleLarge();
  assert.equal(cotes[0], COTE_MIN);
  assert.ok(cotes[cotes.length - 1] <= COTE_MAX);
  assert.ok(Math.abs(cotes[1] - cotes[0] - 0.4) < 1e-9);
  // Six essais suffisent à situer le palier d'une semelle de hangar.
  assert.ok(cotes.length <= 9, `${cotes.length} essais par appui, c'est trop`);
});

test("l'échelle fine ne réessaie pas ce qui a déjà échoué", () => {
  // La cote précédente de la passe large a échoué : la reprendre ne dirait rien
  // de neuf et coûterait un aller-retour.
  assert.deepEqual(echelleFine(1.6), [1.3, 1.4, 1.5]);
  // Sous la plus petite cote, il n'y a rien à affiner.
  assert.deepEqual(echelleFine(COTE_MIN), []);
});

test("la hauteur ne remonte jamais au-dessus du hors gel", () => {
  // Une semelle dont le dessous remonte au-dessus de la cote hors gel n'est pas
  // moins chère : elle gonfle en hiver.
  assert.equal(hauteurMinimale(-0.1, 0.75), 0.65);
  assert.equal(hauteurMinimale(-0.5, 0.9), 0.5);
  // Sans hors gel connu, on garde le plancher, on n'invente pas de profondeur.
  assert.equal(hauteurMinimale(-0.1, null), 0.5);
});

test("chaque essai est une semelle carrée", () => {
  // Un pré-dimensionnement ne connaît pas encore l'orientation du moment
  // dominant : une semelle rectangulaire choisie au hasard perd plus en surface
  // qu'elle ne fait gagner.
  const essais = essaisPourUnAppui({ araseSuperieure: -0.1 }, [0.8, 1.2], 0.7);
  assert.equal(essais.length, 2);
  assert.equal(essais[0].entrees.sectionLx, 0.8);
  assert.equal(essais[0].entrees.sectionLy, 0.8);
  assert.equal(essais[0].entrees.hauteurLz, 0.7);
  assert.equal(essais[0].entrees.araseSuperieure, -0.1);
});

test("on retient la première qui passe, pas la meilleure", () => {
  const essais = [{ cote: 0.8 }, { cote: 1.2 }, { cote: 1.6 }];
  const resultats = [
    { bilan: { verifie: false } }, { bilan: { verifie: true } }, { bilan: { verifie: true } }
  ];
  assert.equal(premiereQuiPasse(essais, resultats).cote, 1.2);
  assert.equal(premiereQuiPasse(essais, resultats.map(() => ({ bilan: { verifie: false } }))), null);
});

test("on dit ce qui gouverne, pas seulement le ratio", () => {
  // Une semelle que la contrainte gouverne s'élargit ; une semelle que le
  // glissement gouverne s'enterre. Le ratio seul oblige à rouvrir le calcul.
  const gouverne = verificationGouvernante({
    contrainte: { ratio: 0.62 }, glissement: { ratio: 0.94 },
    basculement: { ratio: 0.31 }, surfaces: { ratio: 0.5 }
  });
  assert.equal(gouverne.quoi, "glissement");
  assert.equal(gouverne.ratio, 0.94);
  assert.equal(verificationGouvernante({}), null);
});

/* ── La recherche entière, avec un calcul de fiction ─────────────────────── */

/** Un calcul de fiction : passe dès que la surface dépasse un seuil. */
function calculDeFiction(seuilParAppui) {
  const vols = [];
  return {
    vols,
    async calculer(entrees) {
      vols.push(entrees.length);
      return entrees.map((e) => {
        const surface = e.sectionLx * e.sectionLy;
        const seuil = seuilParAppui[e.charges?.G?.V] ?? 1;
        const ratio = seuil / surface;
        return {
          bilan: { ratio, verifie: ratio <= 1 },
          contrainte: { ratio, combinaison: "ELS : G + Sn" },
          glissement: { ratio: ratio / 2 }, basculement: { ratio: ratio / 3 }, surfaces: { ratio: ratio / 4 }
        };
      });
    }
  };
}

const APPUIS = [
  { nom: "Portique courant — file A", quantite: 5, charges: { G: { V: 10 } } },
  { nom: "Portique courant — file B", quantite: 5, charges: { G: { V: 20 } } },
  { nom: "Massif de stabilité", quantite: 2, charges: { G: { V: 30 } } }
];

test("chaque appui reçoit sa propre semelle, la plus petite qui tient", () => {
  // Retenir une semelle unique qui passerait partout serait surdimensionner
  // deux fois pour dimensionner une fois : c'est du béton coulé pour rien.
  const fiction = calculDeFiction({ 10: 0.9, 20: 1.6, 30: 3.2 });
  return predimensionner(APPUIS, { base: { araseSuperieure: -0.1 }, horsGel: 0.75, calculer: fiction.calculer })
    .then((sortie) => {
      assert.deepEqual(sortie.appuis.map((a) => a.sectionLx), [1, 1.3, 1.8]);
      assert.deepEqual(sortie.appuis.map((a) => a.tenue), [true, true, true]);
      assert.equal(sortie.hauteur, 0.65);
      assert.equal(sortie.appuis[0].hauteurLz, 0.65);
      assert.equal(sortie.appuis[0].gouverne, "contrainte");
      assert.equal(sortie.appuis[0].quantite, 5);
    });
});

test("la recherche tient en deux allers-retours, quel que soit le nombre d'appuis", () => {
  // Un essai par cote et par appui envoyé un par un ferait deux cents appels ;
  // le calcul parcourt 388 combinaisons à chaque fois.
  const fiction = calculDeFiction({ 10: 0.9, 20: 1.6, 30: 3.2 });
  return predimensionner(APPUIS, { base: {}, horsGel: 0.75, calculer: fiction.calculer })
    .then(() => {
      assert.equal(fiction.vols.length, 2);
    });
});

test("un appui qu'aucune cote ne vérifie se dit, il ne se retient pas", () => {
  const fiction = calculDeFiction({ 10: 999 });
  return predimensionner([APPUIS[0]], { base: {}, horsGel: null, calculer: fiction.calculer })
    .then((sortie) => {
      assert.equal(sortie.appuis[0].tenue, false);
      assert.match(sortie.appuis[0].message, /Aucune semelle carrée/);
      assert.equal(volumeTotal(sortie.appuis), 0);
    });
});

test("sans passe fine à faire, la passe large suffit", () => {
  // La plus petite cote passe déjà : il n'y a rien à affiner en dessous, et le
  // second aller-retour n'a pas lieu d'être.
  const fiction = calculDeFiction({ 10: 0.1 });
  return predimensionner([APPUIS[0]], { base: {}, horsGel: null, calculer: fiction.calculer })
    .then((sortie) => {
      assert.equal(sortie.appuis[0].sectionLx, COTE_MIN);
      assert.equal(fiction.vols.length, 1);
    });
});

test("le volume total compte les massifs, pas les types", () => {
  // C'est ce qu'on commande à la centrale : cinq semelles de 1 m³ font 5 m³.
  const appuis = [
    { tenue: true, volume: 0.65, quantite: 5 },
    { tenue: true, volume: 1.1, quantite: 2 },
    { tenue: false, quantite: 3 }
  ];
  assert.equal(volumeTotal(appuis), 5.45);
});

test("sans appui, rien à chercher — et rien à demander au serveur", () => {
  const fiction = calculDeFiction({});
  return predimensionner([], { base: {}, calculer: fiction.calculer }).then((sortie) => {
    assert.deepEqual(sortie.appuis, []);
    assert.equal(fiction.vols.length, 0);
  });
});


/* ── L'enveloppe du serveur ──────────────────────────────────────────────── */

test("le lot rend une enveloppe par semelle, et une seule fonction l'ouvre", () => {
  // Le serveur répond `{ resultat }` quand le calcul a eu lieu et `{ error }`
  // quand il a refusé : une semelle qui échoue ne doit pas faire échouer les
  // dix-neuf autres. L'enveloppe se lisait à deux endroits et de deux façons —
  // l'écran des fondations l'ouvrait, le pré-dimensionnement la prenait pour le
  // résultat. Il n'y trouvait donc jamais de bilan.
  assert.deepEqual(resultatDeLaSemelle({ resultat: { bilan: { verifie: true, ratio: 0.4 } } }),
    { bilan: { verifie: true, ratio: 0.4 } });
  // Le refus garde ses mots : « le calcul n'a pas conclu » n'aide personne.
  assert.deepEqual(resultatDeLaSemelle({ error: "contrainteLimite manquante" }),
    { erreur: "contrainteLimite manquante" });
  // Une réponse déjà ouverte reste lisible plutôt que perdue.
  assert.deepEqual(resultatDeLaSemelle({ bilan: { verifie: false } }), { bilan: { verifie: false } });
  assert.equal(resultatDeLaSemelle(null), null);
  assert.equal(resultatDeLaSemelle({ autre: 1 }), null);
});

test("une enveloppe non ouverte fait échouer tous les appuis — et le dit", async () => {
  // Le défaut exact, reproduit : la recherche reçoit `{ resultat: … }` au lieu
  // du résultat. Aucun essai n'a de bilan, donc aucun ne passe, et l'on
  // annonçait « aucune semelle jusqu'à 4 m ne vérifie cet appui » — une phrase
  // qui accuse le sol pour une réponse qu'on n'avait pas ouverte.
  const enveloppe = { resultat: { bilan: { verifie: true, ratio: 0.3 } } };
  const sortie = await predimensionner(
    [{ nom: "Appui A", charges: { G: { V: 5, Hx: 0.5 } } }],
    { base: { araseSuperieure: -0.1 }, horsGel: 0.99, calculer: async (liste) => liste.map(() => enveloppe) }
  );

  const appui = sortie.appuis[0];
  assert.equal(appui.tenue, false);
  assert.match(appui.message, /n'a rendu aucun bilan/);
  assert.doesNotMatch(appui.message, /ne vérifie cet appui/);

  // Ouverte, la même réponse fait tenir l'appui du premier coup.
  const ouverte = await predimensionner(
    [{ nom: "Appui A", charges: { G: { V: 5, Hx: 0.5 } } }],
    { base: { araseSuperieure: -0.1 }, horsGel: 0.99,
      calculer: async (liste) => liste.map(() => resultatDeLaSemelle(enveloppe)) }
  );
  assert.equal(ouverte.appuis[0].tenue, true);
});

test("le refus du serveur se rapporte avec ses mots", async () => {
  const sortie = await predimensionner(
    [{ nom: "Appui A", charges: { G: { V: 5, Hx: 0.5 } } }],
    { base: { araseSuperieure: -0.1 }, horsGel: 0.99,
      calculer: async (liste) => liste.map(() => resultatDeLaSemelle({ error: "contrainteLimite manquante" })) }
  );

  assert.equal(sortie.appuis[0].tenue, false);
  assert.match(sortie.appuis[0].message, /contrainteLimite manquante/);
  assert.equal(sortie.appuis[0].erreur, "contrainteLimite manquante.");
});

test("faute de mots, on nomme au moins ce qui est revenu", () => {
  assert.equal(motDeLErreur({ statut: "ok", donnees: [] }), "réponse sans bilan (statut, donnees).");
  assert.equal(motDeLErreur(null), "réponse vide.");
  assert.equal(motDeLErreur({ erreur: "sol absent" }), "sol absent.");
});
