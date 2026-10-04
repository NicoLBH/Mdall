/**
 * Les onglets de la console : ce qu'ils nomment, et ce qu'ils refusent de
 * laisser vide.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  ONGLET, ONGLETS_DE_LA_CONSOLE, ONGLET_PAR_DEFAUT, longletDit, ongletDeLaConsoleValide
} from "./les-onglets-de-la-console.js";

/**
 * **Les utilisateurs passent en premier, et c'est un ordre, pas un rangement.**
 *
 * La première question d'exploitation est « qui est là », et tout le reste —
 * combien de matière, ce qui se reconnaît, ce qui se prédit — porte sur ce que
 * ces gens ont versé. Un onglet de comptes placé après les comptes du carburant
 * se lirait comme une annexe.
 *
 * **L'exploitation s'est glissée au milieu**, et non en tête : on pourrait
 * défendre l'inverse — regarder d'abord si la machine tourne —, mais la place du
 * premier onglet a été posée explicitement, et la déplacer sans qu'on le demande
 * ferait bouger un repère sous la main de quelqu'un qui l'avait appris.
 */
test("les trois onglets, et les utilisateurs d'abord", () => {
  assert.deepEqual(ONGLETS_DE_LA_CONSOLE.map((un) => un.dit),
    ["Utilisateurs", "Exploitation", "Carburant"]);
  assert.equal(ONGLET_PAR_DEFAUT, ONGLET.UTILISATEURS);
});

/**
 * **Les clés sont nommées, pas écrites à la main.**
 *
 * Chaque rubrique déclare l'onglet dont elle relève : écrire la chaîne de
 * caractères à cet endroit-là ferait un onglet qui n'existe pas le jour où l'un
 * se renomme — et la rubrique disparaîtrait de tous les rails, sans erreur.
 */
test("chaque clé nommée désigne un onglet déclaré", () => {
  const declarees = ONGLETS_DE_LA_CONSOLE.map((un) => un.cle);
  assert.deepEqual(Object.values(ONGLET).sort(), [...declarees].sort());
});

test("un onglet entier se lit par sa clé", () => {
  assert.equal(longletDit(ONGLET.CARBURANT).dit, "Carburant");
  assert.equal(longletDit("ce-qui-nexiste-pas").cle, ONGLET_PAR_DEFAUT);
  assert.equal(longletDit().cle, ONGLET_PAR_DEFAUT);
});

test("chaque onglet porte une clé et une icône, et aucune clé ne se répète", () => {
  const cles = ONGLETS_DE_LA_CONSOLE.map((un) => un.cle);
  assert.equal(new Set(cles).size, cles.length);
  for (const un of ONGLETS_DE_LA_CONSOLE) {
    assert.equal(Boolean(un.cle && un.dit && un.icone), true, un.cle);
  }
});

/**
 * **Une adresse gardée en favori vers un onglet retiré doit mener quelque
 * part**, plutôt que sur un blanc qu'on prendrait pour une panne.
 */
test("une clé inconnue retombe sur le premier onglet", () => {
  assert.equal(ongletDeLaConsoleValide("carburant"), ONGLET.CARBURANT);
  assert.equal(ongletDeLaConsoleValide("utilisateurs"), ONGLET.UTILISATEURS);
  assert.equal(ongletDeLaConsoleValide("archive"), ONGLET_PAR_DEFAUT);
  assert.equal(ongletDeLaConsoleValide(""), ONGLET_PAR_DEFAUT);
  assert.equal(ongletDeLaConsoleValide(null), ONGLET_PAR_DEFAUT);
});

/**
 * **Chaque icône existe dans le jeu.** `svgIcon` rend une référence au sprite :
 * un nom absent ne lève pas, il dessine **une case vide**, et rien ne le signale
 * (règle 10).
 */
test("chaque onglet nomme une icône qui existe", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const sprite = readFileSync(
    fileURLToPath(new URL("../../assets/icons.svg", import.meta.url)), "utf8"
  );

  for (const un of ONGLETS_DE_LA_CONSOLE) {
    assert.ok(sprite.includes(`<symbol id="${un.icone}"`),
      `« ${un.icone} » n'est pas dans le jeu : l'onglet dessinerait une case vide`);
  }
});
