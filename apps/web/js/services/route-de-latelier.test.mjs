/**
 * L'adresse de l'Atelier : ce qu'elle ouvre, et ce qu'elle dit.
 *
 * ## Ce que ces gardes attrapent
 *
 * **Une adresse qui ment sur ce qu'on regarde.** Elle ne se mettait à jour qu'en
 * entrant par un lien : le Copilote dimensionnait des fondations, on cliquait
 * « Ouvrir dans l'Atelier », le panneau basculait — et la barre d'adresse
 * continuait de dire `…/atelier/copilote`. On cliquait alors l'icône Copilote de
 * la barre du haut : elle pointe sur cette adresse-là, **exactement celle qui y
 * est déjà**. Aucun `hashchange`, donc rien. Le même geste par l'onglet Atelier
 * puis le rail marchait, ce qui rendait le défaut incompréhensible.
 *
 * C'est la classe de défaut la plus coûteuse à trouver : rien ne tombe, rien ne
 * s'écrit dans la console, et le geste marche une fois sur deux selon le chemin
 * par lequel on est arrivé.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { ATELIER_COPILOTE, panneauDemandeParLaRoute, routeDuPanneau } from "./route-de-latelier.js";

/* ── Ce que la route ouvre ───────────────────────────────────────────────── */

test("le quatrième segment dit quel panneau ouvrir", () => {
  assert.equal(panneauDemandeParLaRoute("#project/p1/atelier/copilote"), "studio-copilote");
  assert.equal(panneauDemandeParLaRoute("project/p1/atelier/copilote"), "studio-copilote",
    "avec ou sans le dièse");
});

/**
 * **Un segment inconnu ne fait pas d'erreur.** Une adresse mal tapée, ou datée
 * d'une version d'avant, doit mener quelque part de valable — pas à un écran
 * vide qu'on ne sait pas expliquer.
 */
test("sans quatrième segment, ou avec un segment inconnu, c'est la vitrine", () => {
  assert.equal(panneauDemandeParLaRoute("#project/p1/atelier"), "");
  assert.equal(panneauDemandeParLaRoute("#project/p1/atelier/cerveau"), "");
  assert.equal(panneauDemandeParLaRoute(""), "");
});

/* ── Ce que la route dit ─────────────────────────────────────────────────── */

test("ouvrir le Copilote nomme le Copilote dans l'adresse", () => {
  assert.equal(
    routeDuPanneau("#project/p1/atelier", "studio-copilote"),
    `#project/p1/atelier/${ATELIER_COPILOTE}`
  );
});

/**
 * **Et en ouvrir un autre l'en retire.** C'est le défaut : l'adresse restait sur
 * le Copilote alors qu'on regardait les fondations, et le raccourci de la barre
 * du haut n'avait donc plus rien à changer.
 */
test("ouvrir un agent retire le Copilote de l'adresse", () => {
  assert.equal(
    routeDuPanneau("#project/p1/atelier/copilote", "solidity-fondations"),
    "#project/p1/atelier"
  );
  assert.equal(
    routeDuPanneau("#project/p1/atelier/copilote", "atelier-vitrine"),
    "#project/p1/atelier"
  );
});

/**
 * **Rien à changer se dit `""`.** L'appelant n'écrit alors pas d'entrée
 * d'historique pour rien — et surtout, il ne réécrit pas une adresse identique à
 * chaque bascule de panneau.
 */
test("quand l'adresse est déjà la bonne, il n'y a rien à écrire", () => {
  assert.equal(routeDuPanneau("#project/p1/atelier/copilote", "studio-copilote"), "");
  assert.equal(routeDuPanneau("#project/p1/atelier", "atelier-vitrine"), "");
  assert.equal(routeDuPanneau("#project/p1/atelier", "solidity-fondations"), "");
});

/**
 * **Hors de l'Atelier, on n'écrit rien.**
 *
 * Une adresse de projet ne suffit pas : composer `#project/<id>/sujets/copilote`
 * ferait une route qui n'existe pas, et le jour où quelqu'un la partagerait elle
 * mènerait à l'onglet Sujets — avec un segment de trop que personne ne saurait
 * expliquer.
 */
test("une adresse qui n'est pas celle de l'Atelier n'est pas touchée", () => {
  assert.equal(routeDuPanneau("#project/p1/sujets", "studio-copilote"), "");
  assert.equal(routeDuPanneau("#projects", "studio-copilote"), "");
  assert.equal(routeDuPanneau("#project/p1", "studio-copilote"), "");
  assert.equal(routeDuPanneau("", "studio-copilote"), "");
});

/**
 * **Les deux sens s'accordent.** Ce qu'on écrit doit se relire : une adresse
 * composée par `routeDuPanneau` et rendue à `panneauDemandeParLaRoute` doit
 * rouvrir le même panneau. Sans cela, partager le lien d'un écran mènerait
 * ailleurs — et c'est précisément ce qu'un lien promet de ne pas faire.
 */
test("ce que l'adresse écrit, l'adresse le relit", () => {
  const ecrite = routeDuPanneau("#project/p1/atelier", "studio-copilote");
  assert.equal(panneauDemandeParLaRoute(ecrite), "studio-copilote");

  const effacee = routeDuPanneau("#project/p1/atelier/copilote", "solidity-fondations");
  assert.equal(panneauDemandeParLaRoute(effacee), "", "et la vitrine s'ouvre");
});
