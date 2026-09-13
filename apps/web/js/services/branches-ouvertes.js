/**
 * Les propositions ouvertes d'un projet, telles que les écrans de l'Atelier les
 * proposent dans « Transformer ».
 *
 * ## Pourquoi un magasin, et pas quatre chargements
 *
 * Quatre écrans posent le bouton — climat, fondations, spectre, incendie — et il
 * en viendra d'autres. Quatre chargements écrits quatre fois auraient quatre
 * moments de rafraîchissement au bout de six mois, et l'un des quatre finirait
 * par montrer une proposition fusionnée la veille. Une valeur lue à quatre
 * endroits finit par diverger (règle 4).
 *
 * ## Ce qu'un écran a le droit de dire, et quand
 *
 * Trois réponses, et elles ne se confondent pas :
 *
 * | ce qu'on rend | ce que l'écran en fait |
 * | --- | --- |
 * | `[]` avant toute lecture | il n'offre rien, et ne prétend rien |
 * | `[]` après lecture | ce projet n'a aucune proposition ouverte |
 * | `null` | la base n'a pas répondu, et le menu le dit |
 *
 * Les deux `[]` se ressemblent à l'écran, et c'est voulu : un menu qui n'offre
 * pas encore et un menu qui n'a rien à offrir affichent la même chose — deux
 * issues. Ce qu'il ne faut jamais afficher, c'est « aucune proposition ouverte »
 * alors qu'on n'a pas pu regarder : on en ouvrirait une deuxième à côté de celle
 * qu'on ne voyait pas (règle 5). D'où le `null`, qui est une réponse à part.
 *
 * ## La lecture part de la première demande
 *
 * L'écran ne l'ordonne pas : il lit, et la lecture se déclenche si elle n'a pas
 * eu lieu. C'est ce qui garde le raccordement à **une ligne** dans chaque écran,
 * là où un chargement explicite aurait demandé de trouver, dans chacun, le
 * moment où le projet est connu et celui où l'on peut redessiner.
 *
 * ## Le projet ne se passe pas : il se résout ici
 *
 * L'identifiant qu'attend la base est celui du **serveur**, et il ne se résout
 * qu'en attendant. Trois écrans sur quatre en ont un sous la main au moment du
 * dessin ; le quatrième — le spectre — ne l'obtient qu'au moment de proposer.
 * Le demander aux écrans aurait donc ajouté une attente à chaque dessin, pour
 * une réponse que ce fichier peut aller chercher lui-même.
 *
 * Le cache, lui, se range sous la clé **de l'écran** (`store.currentProjectId`),
 * qui est immédiate : c'est elle qui dit qu'on a changé de projet, et il faut le
 * savoir avant d'avoir résolu quoi que ce soit — sinon le menu du projet suivant
 * proposerait les propositions du précédent.
 */

import { store } from "../store.js";
import { branchesQuiAccueillent } from "./proposition-branche.js";
import { TRANSFORMER } from "../views/ui/transformer.js";
import { enGardantLeMenuOuvert } from "../views/ui/gh-split-button.js";

const texte = (valeur) => String(valeur ?? "").trim();

const projetAffiche = () => texte(store.currentProjectId);

/** Ce qu'on sait, pour un projet à la fois. Changer de projet oublie tout. */
let su = { projet: "", branches: [], lue: false };
let enCours = null;

/**
 * Les propositions ouvertes du projet affiché, et la lecture si elle n'a pas eu lieu.
 *
 * @param {Function} [quandCharge] rappelé **une fois**, après la lecture, pour
 *   que l'écran se redessine. Jamais appelé pendant l'appel : un rappel
 *   synchrone redessinerait pendant le dessin.
 * @returns {object[]|null}
 */
export function branchesOuvertes(quandCharge = null) {
  const projet = projetAffiche();
  if (!projet) return [];

  ecouterLOuvertureDesMenus();
  // Le dernier rappel connu : c'est lui qu'on rappellera quand un menu s'ouvre
  // et qu'on aura relu. Sans lui, la relecture aurait lieu et personne ne
  // redessinerait.
  if (typeof quandCharge === "function") dernierRappel = quandCharge;

  if (su.projet !== projet) {
    su = { projet, branches: [], lue: false };
    enCours = null;
  }

  if (!su.lue && !enCours) enCours = lire(projet, quandCharge);
  return su.branches;
}

/**
 * Relire à **chaque ouverture** du menu « Transformer ».
 *
 * Le magasin gardait sa liste pour la vie de la page. Sur un projet où deux
 * personnes travaillent en même temps, cela veut dire proposer d'ajouter un lot
 * à une proposition qu'un collègue vient de fusionner — et le lot part dans une
 * branche fermée. Un cache qui ne se rafraîchit qu'au rechargement de la page
 * n'est pas un cache : c'est une photo.
 *
 * On relit donc au moment où quelqu'un **regarde** : l'ouverture du menu est le
 * seul instant où la fraîcheur compte, et c'est un appel par clic, pas un par
 * rendu.
 */
let ecoute = false;
let dernierRappel = null;

function ecouterLOuvertureDesMenus() {
  if (ecoute || typeof document === "undefined") return;
  ecoute = true;

  document.addEventListener("ghaction:menu-ouvert", (evenement) => {
    // Seulement les menus qui proposent des branches. Les autres n'ont rien à
    // relire, et les relire ferait un appel par clic sur n'importe quel menu.
    const racine = evenement.target;
    const propose = typeof racine?.querySelector === "function"
      && racine.querySelector(`[data-menu-action^="${TRANSFORMER.AJOUTER}"], [data-menu-action="${TRANSFORMER.PROPOSITION}"]`);
    if (!propose) return;

    void relireLesBranches();
  });
}

/** Oublier, relire, et redessiner. Rendue pour les écrans qui veulent forcer. */
export async function relireLesBranches() {
  const projet = projetAffiche();
  if (!projet) return;

  su = { projet, branches: su.projet === projet ? su.branches : [], lue: false };
  enCours = null;
  await lire(projet, dernierRappel);
}

/**
 * Oublier ce qu'on sait, pour que la prochaine lecture reparte de la base.
 *
 * À appeler quand on vient d'ouvrir une proposition ou d'en enrichir une : la
 * liste d'il y a trente secondes ne porte pas celle qu'on vient de créer, et un
 * menu qui ne la propose pas ferait en ouvrir une troisième.
 */
export function oublierLesBranches() {
  su = { projet: "", branches: [], lue: false };
  enCours = null;
}

/**
 * Relire les propositions ouvertes, **et en reposer le compte** de la barre.
 *
 * ## Pourquoi ici
 *
 * Le compteur « Propositions » de la barre d'onglets était posé par l'écran des
 * propositions, en effet de bord : les gestes qui en ouvraient une y
 * emmenaient. Depuis qu'ils **restent sur l'écran d'origine**, plus personne ne
 * le pose — on ouvrait une proposition et la barre continuait d'en annoncer
 * trois.
 *
 * Ce fichier est le seul qui sait déjà lire les propositions ouvertes d'un
 * projet. Le compte se pose donc d'où il se lit : une deuxième lecture ailleurs
 * finirait par ne plus donner le même nombre (règle 4).
 *
 * Une base muette ne remet **rien** : afficher zéro après une lecture ratée
 * dirait qu'il n'y a plus rien à signer, ce qu'on ne sait pas (règle 5).
 *
 * @returns {Promise<number|null>} le compte, ou `null` si la base s'est tue
 */
export async function rafraichirLesBranches() {
  oublierLesBranches();

  const projet = projetAffiche();
  if (!projet) return null;

  await lire(projet, null);
  const branches = su.projet === projet && su.lue ? su.branches : null;
  if (branches === null) return null;

  store.projectPropositionsView = { openCount: branches.length };

  try {
    const { rafraichirLesOngletsDuProjet } = await import("../views/project-header.js");
    rafraichirLesOngletsDuProjet();
  } catch {
    // La barre n'est pas dessinée — on est hors d'un projet. Le compte est
    // posé quand même : le prochain dessin le lira.
  }

  return branches.length;
}

async function lire(projet, quandCharge) {
  let branches = null;

  try {
    const [{ resolveCurrentBackendProjectId }, { listPropositions }] = await Promise.all([
      import("./project-supabase-sync.js"),
      import("./propositions-supabase.js")
    ]);
    const backend = texte(await resolveCurrentBackendProjectId());
    // Pas de projet en base : il n'y a pas de proposition à y avoir, et ce n'est
    // pas une lecture ratée. `[]` est la bonne réponse.
    // `null` traverse, lui : la base n'a pas répondu, et le menu doit le dire.
    branches = backend ? branchesQuiAccueillent(await listPropositions(backend, { status: "open" })) : [];
  } catch {
    branches = null;
  } finally {
    enCours = null;
  }

  // Le projet a pu changer pendant l'attente : la réponse porte alors sur un
  // projet qu'on n'affiche plus, et l'écrire ferait proposer les propositions du
  // précédent.
  if (projetAffiche() !== projet) return;

  const avant = su.branches;
  su = { projet, branches, lue: true };

  // **On ne redessine que si la réponse a changé quelque chose.** La relecture
  // a lieu à chaque ouverture du menu « Transformer » ; redessiner à chaque
  // fois remplaçait le bouton — et le menu qui venait de s'ouvrir avec lui. Il
  // se refermait donc à l'instant où on le déployait, et l'on ne pouvait plus
  // rien proposer.
  if (typeof quandCharge !== "function" || !lesBranchesOntChange(avant, branches)) return;

  // Et quand elle a changé, le menu doit **survivre** au redessin : sa liste
  // est précisément ce qui vient d'être corrigé, et la refermer au nez de qui
  // la regardait ferait recliquer pour voir.
  enGardantLeMenuOuvert(quandCharge);
}

/**
 * Cette lecture change-t-elle ce que le menu montre ?
 *
 * Deux listes disent la même chose quand elles portent les mêmes propositions,
 * dans le même ordre, sous les mêmes noms — c'est tout ce que le menu affiche.
 * `null` — la base s'est tue — n'est **pas** la même chose qu'une liste vide :
 * l'un dit « on ne sait pas », l'autre « il n'y en a aucune » (règle 5).
 */
export function lesBranchesOntChange(avant, apres) {
  if (avant === null || apres === null) return avant !== apres;

  const dit = (liste) => (Array.isArray(liste) ? liste : [])
    .map((branche) => `${texte(branche?.id)}|${texte(branche?.title ?? branche?.titre)}`)
    .join("\n");

  return dit(avant) !== dit(apres);
}
