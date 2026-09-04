/**
 * L'écran « Fondations — calcul » de l'Atelier.
 *
 * Il tient un rôle et un seul : recueillir les données, les faire calculer
 * ailleurs, et montrer ce qui revient. Aucune pondération, aucune combinaison,
 * aucun coefficient n'est écrit ici — c'est la fonction serveur qui les porte,
 * et c'est elle qui fait foi. Un jour où le règlement changera, il n'y aura
 * qu'un seul endroit à reprendre.
 *
 * Les zones de saisie ne sont pas écrites en dur non plus : elles se déduisent
 * de la déclaration de `fondations-service.js`, celle-là même qui valide les
 * valeurs avant l'envoi. « Une valeur écrite à deux endroits finit par
 * diverger » vaut aussi pour la description d'un champ.
 */

import { escapeHtml } from "../../../utils/escape-html.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";
import { renderGhActionButton } from "../../ui/gh-split-button.js";
import { svgIcon } from "../../../ui/icons.js";
import {
  ZONES, CHOIX, CAS_DE_CHARGE, COMPOSANTES, NAPPES, BARRES,
  entreesParDefaut, entreesInvalides, uniteAffichee, estPertinent
} from "../../../services/fondations-declaration.js";
import { calculerFondation, calculerLesSemelles } from "../../../services/fondations-service.js";
import { planDeLaRemise, REMISE_ANNONCEE } from "../../../services/fondations-remise.js";
import {
  synthese, volumeDe, designationDe, voisine, semelleNeuve,
  empreinteDe, entreesDe, resultatsScelles
} from "../../../services/fondations-etude.js";
import {
  listerSemelles, creerSemelle, enregistrerSemelle, supprimerSemelle
} from "../../../services/fondations-etude-supabase.js";
import { dessinerSchema } from "./fondations-schema.js";
import { rappelsDeLaMemoire, preremplir, alertesDeLaMemoire } from "../../../services/fondations-memoire.js";
import { listProjectAssertions } from "../../../services/project-memory-supabase.js";
import { resolveCurrentBackendProjectId } from "../../../services/project-supabase-sync.js";
import { store } from "../../../store.js";

const etat = {
  entrees: entreesParDefaut(),
  resultat: null,
  // L'empreinte des entrées qui ont produit `resultat`. Sans elle, l'écran
  // continuerait d'afficher des chiffres justes pour une saisie qui n'est plus
  // celle-là — et un résultat périmé se lit exactement comme un résultat frais.
  empreinteDuResultat: "",
  calculEnCours: false,
  // L'ajout des massifs remis par le copilote est en cours : le bouton se
  // désarme, sinon deux clics posent deux fois les mêmes semelles.
  remiseEnCours: false,
  erreur: "",
  invalides: [],
  // Ce que le projet sait déjà, et quels champs en viennent.
  rappels: {},
  venuesDeLaMemoire: {},

  /**
   * L'étude : la liste des semelles du projet, et celle qu'on regarde.
   *
   * `ouverte` vaut `null` quand on est sur le tableau de synthèse. C'est le
   * même écran à deux niveaux, comme le journal des actions : une ligne par
   * type de massif, et une page par type.
   */
  semelles: [],
  ouverte: null,
  etudeChargee: false,
  etudeErreur: "",
  /**
   * Vrai quand l'étude n'a pas pu s'ouvrir — pas de projet, table absente,
   * base muette. Le formulaire reste utilisable, et l'écran dit que ce calcul
   * ne sera pas conservé. Un utilitaire qui refuse de calculer parce qu'il ne
   * sait pas où ranger le résultat est pire qu'un utilitaire sans mémoire.
   */
  libre: false,
  syntheseEnCours: false,
  /**
   * Les résultats du tableau, un par semelle, chacun portant **l'empreinte des
   * entrées qui l'ont produit**. Sans cette empreinte, un résultat rangé au
   * rang 2 se lit comme le résultat de la semelle 2 alors qu'il peut être celui
   * qu'elle avait avant d'être modifiée — c'est exactement le défaut rapporté :
   * une semelle en défaut affichée verte, avec le chiffre de sa voisine.
   */
  resultats: [],
  /** La nappe dont on survole la ligne, mise en avant dans le schéma. */
  nappeSurvolee: null
};

/** Les valeurs que chaque liste déroulante propose, par champ. */
function listesDeChoix() {
  return Object.fromEntries(CHOIX.map((choix) => [choix.cle, choix.valeurs]));
}

/** Les entrées d'une semelle qu'on n'a pas encore touchée : défauts, plus mémoire. */
function entreesNeuves() {
  return preremplir(entreesParDefaut(), etat.rappels, listesDeChoix()).valeurs;
}

/**
 * Quels champs à l'écran portent encore ce que le projet tient.
 *
 * Recalculé à chaque semelle ouverte, et non une fois pour toutes à
 * l'ouverture de l'écran. Une marque posée au montage mentirait deux fois :
 * absente sur une semelle ajoutée ensuite — c'est ce qui a été observé —, et
 * présente sur un champ qu'on vient justement de changer pour essayer une
 * variante.
 */
function marquerVenuesDeLaMemoire() {
  const venues = {};
  for (const rappel of Object.values(etat.rappels ?? {})) {
    if (!rappel.champ) continue;
    if (String(etat.entrees[rappel.champ] ?? "") === String(rappel.valeur)) venues[rappel.champ] = rappel;
  }
  etat.venuesDeLaMemoire = venues;
}

/**
 * Tout oublier : on a changé de projet.
 *
 * L'état de cet écran vit au niveau du module, pas du DOM — c'est ce qui permet
 * de revenir dessus sans reperdre onze lignes de charges. Le revers est qu'il
 * survit aussi à un changement de projet, et les cotes d'un projet reparaissent
 * alors dans le suivant. Elles s'y liraient comme des valeurs saisies.
 */
function oublierLeProjet() {
  etat.entrees = entreesParDefaut();
  etat.resultat = null;
  etat.empreinteDuResultat = "";
  etat.erreur = "";
  etat.invalides = [];
  etat.rappels = {};
  etat.venuesDeLaMemoire = {};
  etat.semelles = [];
  etat.resultats = [];
  etat.ouverte = null;
  etat.etudeChargee = false;
  etat.etudeErreur = "";
  etat.libre = false;
  etat.calculEnCours = false;
  etat.syntheseEnCours = false;
  etat.nappeSurvolee = null;
  projetCourant = "";
}

/**
 * Ce que le projet sait, versé dans le formulaire vierge.
 *
 * La lecture est tentée une fois, à l'ouverture. Elle ne bloque rien : un écran
 * qui refuserait de s'afficher parce que la mémoire n'a pas répondu serait pire
 * que le même écran sans pré-remplissage.
 */
async function lireLaMemoire(root) {
  try {
    const projectId = await resolveCurrentBackendProjectId();
    if (!projectId) return;
    const assertions = await listProjectAssertions(projectId);
    if (!Array.isArray(assertions)) return;

    etat.rappels = rappelsDeLaMemoire(assertions);
    // On ne pré-remplit que le formulaire vierge : une semelle ouverte porte des
    // valeurs enregistrées, et la mémoire n'a pas à reprendre la main dessus.
    if (etat.ouverte === null) {
      etat.entrees = preremplir(etat.entrees, etat.rappels, listesDeChoix()).valeurs;
    }
    marquerVenuesDeLaMemoire();
    if (root?.isConnected) dessiner(root);
  } catch (erreur) {
    console.warn("[fondations] mémoire du projet illisible", erreur);
  }
}

/** Ce qui, dans la saisie, change le résultat. Tout, donc. */
function empreinte(entrees) {
  return empreinteDe(entrees);
}

function resultatPerime() {
  return Boolean(etat.resultat) && empreinte(etat.entrees) !== etat.empreinteDuResultat;
}

/**
 * L'écran ne se redessine pas quand on y revient — contrairement au Copilote,
 * dont la conversation a pu avancer ailleurs. Ici, tout ce qui est à l'écran a
 * été tapé à la main : le redessiner à chaque venue effacerait onze lignes de
 * charges pour ne rien montrer de nouveau.
 */
export function renderSolidityFondations(root, { force = false } = {}) {
  if (!root) return;

  // Le changement de projet se lit ici, avant le premier tracé : le lire dans
  // la réponse asynchrone de la base laisserait paraître, le temps d'un aller-
  // retour, les cotes du projet précédent — assez pour les croire saisies.
  const projet = clefDuProjetAffiche();
  const aChangeDeProjet = projet !== projetAffiche;
  if (aChangeDeProjet) { projetAffiche = projet; oublierLeProjet(); }

  if (!force && !aChangeDeProjet && root.dataset.fondationsMonte === "true") return;
  root.dataset.fondationsMonte = "true";

  dessiner(root);
  // Une seule fois par nœud : rebrancher sur un `force` doublerait chaque
  // écouteur, donc chaque enregistrement en base.
  if (root.dataset.fondationsBranche !== "true") {
    root.dataset.fondationsBranche = "true";
    brancher(root);
  }
  void lireLaMemoire(root);
  void chargerLEtude(root);
  registerProjectPrimaryScrollSource(root.closest("#projectStudioRouterScroll") || document.getElementById("projectStudioRouterScroll"));
}

/* ------------------------------------------------------------------ *
 * L'étude : la liste des semelles du projet
 *
 * Deux niveaux dans le même écran, comme le journal des actions : un tableau
 * qui récapitule, une page par semelle. Ce qui est enregistré, ce sont les
 * **entrées** — le résultat se recalcule à l'ouverture, sans quoi le tableau
 * décrirait le projet tel que le moteur le voyait il y a six mois.
 * ------------------------------------------------------------------ */

let projetCourant = "";
/** Le projet **du navigateur** pour lequel l'écran est dessiné, tel qu'il change. */
let projetAffiche = "";

function clefDuProjetAffiche() {
  return String(store.currentProjectId || store.currentProject?.id || "");
}

/** L'empreinte des entrées d'une semelle enregistrée, lue comme le formulaire la lira. */
function empreinteDeLaSemelle(semelle) {
  return empreinteDe(entreesDe(semelle, entreesParDefaut()));
}

/** Les résultats du tableau, réduits à ceux qui décrivent encore leur semelle. */
function resultatsAJour() {
  return resultatsScelles(etat.semelles, etat.resultats, entreesParDefaut());
}

async function chargerLEtude(root) {
  try {
    projetCourant = String(await resolveCurrentBackendProjectId() || "");
    if (!projetCourant) return travaillerSansEtude(root, "Aucun projet ouvert");
    const semelles = await listerSemelles(projetCourant);
    if (semelles === null) {
      // « Je n'ai pas pu lire » et « il n'y en a aucune » ne se ressemblent que
      // sur un écran vide, et l'un des deux mérite qu'on le dise.
      return travaillerSansEtude(root, "L'étude n'a pas pu être relue");
    }
    etat.semelles = semelles;
    etat.etudeChargee = true;
    if (root?.isConnected) dessiner(root);
    await recalculerLaSynthese(root);
  } catch (erreur) {
    travaillerSansEtude(root, erreur instanceof Error ? erreur.message : String(erreur));
  }
}

/**
 * Le repli : calculer sans rien conserver, et le dire.
 *
 * Un utilitaire qui refuse de calculer parce qu'il ne sait pas où ranger le
 * résultat serait inutilisable là où il sert le plus — un poste de passage, un
 * projet qui n'est pas encore en base. On calcule, et l'on annonce que rien ne
 * sera gardé, plutôt que de le laisser croire.
 */
function travaillerSansEtude(root, raison) {
  etat.libre = true;
  etat.ouverte = null;
  etat.etudeChargee = true;
  etat.etudeErreur = `${raison} : ce calcul ne sera pas conservé.`;
  if (root?.isConnected) dessiner(root);
}

/** Tout le tableau, en un aller-retour. */
async function recalculerLaSynthese(root) {
  if (etat.semelles.length === 0) { etat.resultats = []; return; }
  etat.syntheseEnCours = true;
  if (root?.isConnected) dessiner(root);
  try {
    const rendus = await calculerLesSemelles(etat.semelles);
    // Chaque résultat est scellé sur les entrées qui l'ont produit. C'est ce
    // scellé, et lui seul, qui autorise ensuite à l'afficher.
    etat.resultats = etat.semelles.map((semelle, rang) => {
      const rendu = rendus[rang];
      return rendu ? { ...rendu, empreinte: empreinteDeLaSemelle(semelle) } : null;
    });
  } catch (erreur) {
    etat.resultats = [];
    etat.etudeErreur = erreur instanceof Error ? erreur.message : String(erreur);
  } finally {
    etat.syntheseEnCours = false;
    if (root?.isConnected) dessiner(root);
  }
}

/** La semelle qu'on regarde, ou `null` si l'on est sur le tableau. */
function semelleOuverte() {
  if (etat.ouverte === null) return null;
  return etat.semelles[etat.ouverte] ?? null;
}

/**
 * Ouvrir une semelle, c'est charger ses entrées dans le formulaire.
 *
 * Le résultat affiché est celui que la synthèse a calculé **pour ces
 * entrées-là**. On compare les empreintes plutôt que de faire confiance au
 * rang : c'est le rang qui trompait — une semelle ajoutée par recopie d'une
 * autre gardait le résultat de son modèle, et l'ouvrir marquait ce résultat
 * comme frais. Le calcul disait alors « vérifié » d'une semelle qui ne l'est
 * pas, ce qui est le seul mensonge qu'un utilitaire de ce genre ne puisse pas
 * se permettre.
 */
function ouvrirSemelle(root, rang) {
  const semelle = etat.semelles[rang];
  if (!semelle) return;
  etat.ouverte = rang;
  etat.entrees = structuredClone(entreesDe(semelle, entreesParDefaut()));

  const garde = etat.resultats?.[rang];
  const scelle = garde && garde.empreinte === empreinte(etat.entrees) ? garde : null;
  etat.resultat = scelle?.resultat ?? null;
  etat.empreinteDuResultat = scelle ? scelle.empreinte : "";
  etat.erreur = scelle?.error ?? "";
  etat.invalides = [];
  etat.nappeSurvolee = null;
  marquerVenuesDeLaMemoire();
  dessiner(root);
  // Rien de scellé : la semelle n'a jamais été calculée, ou l'a été pour
  // d'autres cotes. On la recalcule, plutôt que de laisser un panneau de
  // résultats vide sans dire pourquoi — sauf si la saisie ne le permet pas :
  // ouvrir une semelle ne doit pas accueillir par un pavé de reproches qu'on
  // n'a pas demandés.
  if (!scelle && !etat.calculEnCours && entreesInvalides(etat.entrees).length === 0) void calculer(root);
}

function fermerLaSemelle(root) {
  etat.ouverte = null;
  etat.resultat = null;
  etat.empreinteDuResultat = "";
  etat.erreur = "";
  etat.nappeSurvolee = null;
  dessiner(root);
  // Le tableau ne montre que des résultats scellés : si l'un manque — parce
  // qu'on vient de modifier des cotes —, on le recalcule tout de suite plutôt
  // que d'afficher un tiret que rien ne viendrait remplir.
  if (!resultatsAJour().every(Boolean)) void recalculerLaSynthese(root);
}

/** Ce qui est à l'écran, écrit dans la semelle ouverte. */
async function enregistrerLaSemelleOuverte(root, changements = {}) {
  const semelle = semelleOuverte();
  if (!semelle?.id) return;
  const aEcrire = { entrees: etat.entrees, ...changements };
  Object.assign(semelle, { ...changements, entrees: structuredClone(etat.entrees) });
  try {
    await enregistrerSemelle(semelle.id, aEcrire);
    etat.etudeErreur = "";
  } catch (erreur) {
    etat.etudeErreur = erreur instanceof Error ? erreur.message : String(erreur);
    dessiner(root);
  }
}

async function ajouterUneSemelle(root) {
  const modele = semelleOuverte() ?? etat.semelles.at(-1) ?? null;
  // Sans modèle à recopier, la semelle neuve part de ce que le projet sait
  // déjà : zone sismique, catégorie d'importance, classe de sol.
  const neuve = semelleNeuve(modele, entreesNeuves());
  try {
    const creee = await creerSemelle(projetCourant, { ...neuve, rang: etat.semelles.length });
    etat.semelles.push(creee);
    etat.resultats.push(null);
    // L'ouverture calcule la semelle neuve et scelle son résultat : refaire tout
    // le lot ici ferait deux fois le même aller-retour.
    ouvrirSemelle(root, etat.semelles.length - 1);
  } catch (erreur) {
    etat.etudeErreur = erreur instanceof Error ? erreur.message : String(erreur);
    dessiner(root);
  }
}

async function retirerUneSemelle(root, rang) {
  const semelle = etat.semelles[rang];
  if (!semelle) return;
  try {
    await supprimerSemelle(semelle.id);
    etat.semelles.splice(rang, 1);
    etat.resultats.splice(rang, 1);
    if (etat.ouverte !== null) {
      if (etat.ouverte === rang) fermerLaSemelle(root);
      else if (etat.ouverte > rang) etat.ouverte -= 1;
    }
    dessiner(root);
  } catch (erreur) {
    etat.etudeErreur = erreur instanceof Error ? erreur.message : String(erreur);
    dessiner(root);
  }
}

function brancher(root) {
  // Une remise arrive après que le panneau a été dessiné : sans cette écoute,
  // elle n'apparaîtrait qu'au rechargement de la page.
  window.addEventListener(REMISE_ANNONCEE, () => {
    if (root.isConnected) dessiner(root);
  });

  // La saisie ne redessine rien : redessiner à chaque frappe ferait perdre le
  // curseur, et l'écran n'a rien de nouveau à dire tant qu'on tape.
  root.addEventListener("input", (evenement) => {
    const champ = evenement.target.closest("[data-fondation-champ]");
    const charge = champ ? null : evenement.target.closest("[data-fondation-charge]");
    const nappe = champ || charge ? null : evenement.target.closest("[data-fondation-nappe]");
    if (champ) etat.entrees[champ.dataset.fondationChamp] = champ.value;
    else if (charge) {
      const [cas, composante] = charge.dataset.fondationCharge.split(".");
      etat.entrees.charges[cas][composante] = charge.value;
    } else if (nappe) {
      etat.entrees.ferraillage[nappe.dataset.fondationNappe].nombre = nappe.value;
    } else return;

    // On ne redessine pas la page — le curseur serait perdu au milieu d'un
    // nombre. Seuls le schéma et la mention « périmé » se remettent à jour,
    // aux deux endroits où ça compte.
    marquerPerime(root);
    rafraichirSchema(root);
    rafraichirAlertes(root);
  });

  // On enregistre au `change` — quand le champ est quitté —, pas à la frappe :
  // écrire en base à chaque touche ferait vingt requêtes pour taper « 1,30 ».
  root.addEventListener("change", (evenement) => {
    if (evenement.target.closest("[data-fondation-champ], [data-fondation-charge], [data-fondation-nappe]")) {
      void enregistrerLaSemelleOuverte(root);
    }
    const identite = evenement.target.closest("[data-semelle-designation], [data-semelle-nombre]");
    if (identite) {
      const semelle = semelleOuverte();
      if (semelle) {
        const changement = identite.dataset.semelleDesignation !== undefined
          ? { designation: identite.value }
          : { nombre: Number(identite.value) || 0 };
        void enregistrerLaSemelleOuverte(root, changement).then(() => dessiner(root));
      }
      return;
    }
  });

  root.addEventListener("change", (evenement) => {
    const barre = evenement.target.closest("[data-fondation-barre]");
    if (barre) {
      etat.entrees.ferraillage[barre.dataset.fondationBarre].barre = barre.value;
      etat.invalides = entreesInvalides(etat.entrees);
      dessiner(root);
      return;
    }
    const choix = evenement.target.closest("[data-fondation-choix]");
    if (!choix) return;
    etat.entrees[choix.dataset.fondationChoix] = choix.value;
    // Un changement de règlement change ce qui est calculable : on redessine
    // pour que l'avertissement paraisse tout de suite, pas au clic suivant.
    etat.invalides = entreesInvalides(etat.entrees);
    // S'écarter de ce que le projet tient fait tomber l'astérisque : c'est tout
    // ce qu'elle sert à dire.
    marquerVenuesDeLaMemoire();
    dessiner(root);
  });

  /**
   * Survoler une nappe la situe dans le schéma.
   *
   * « AIX, ratio 1,42 » ne dit pas où sont ces barres. Le tableau et le dessin
   * parlent des mêmes quatre nappes : les relier d'un mouvement de souris coûte
   * moins qu'une légende, et se lit sans avoir à l'apprendre. Le focus fait la
   * même chose au clavier — un dessin qui ne répond qu'à la souris n'existe pas
   * pour qui n'en a pas.
   */
  const designer = (cle) => {
    if (etat.nappeSurvolee === cle) return;
    etat.nappeSurvolee = cle;
    rafraichirSchema(root);
    for (const ligne of root.querySelectorAll("[data-nappe]")) {
      ligne.classList.toggle("est-survolee", ligne.dataset.nappe === cle);
    }
  };
  for (const entrant of ["pointerover", "focusin"]) {
    root.addEventListener(entrant, (evenement) => {
      const ligne = evenement.target.closest?.("[data-nappe]");
      if (ligne) designer(ligne.dataset.nappe);
    });
  }
  for (const sortant of ["pointerout", "focusout"]) {
    root.addEventListener(sortant, (evenement) => {
      const ligne = evenement.target.closest?.("[data-nappe]");
      // Le pointeur qui passe d'une cellule à l'autre de la même ligne sort et
      // rentre : sans ce test, le dessin clignoterait.
      if (ligne && !ligne.contains(evenement.relatedTarget)) designer(null);
    });
  }

  root.addEventListener("click", async (evenement) => {
    const ouvrir = evenement.target.closest("[data-semelle-ouvrir]");
    if (ouvrir) {
      ouvrirSemelle(root, Number(ouvrir.dataset.semelleOuvrir));
      return;
    }
    const retirer = evenement.target.closest("[data-semelle-retirer]");
    if (retirer) {
      await retirerUneSemelle(root, Number(retirer.dataset.semelleRetirer));
      return;
    }
    if (evenement.target.closest('[data-action-id="fondationsAjouter"]')) {
      await ajouterUneSemelle(root);
      return;
    }
    if (evenement.target.closest("#fondationsRemiseAjouter")) {
      await ajouterLaRemise(root);
      return;
    }
    if (evenement.target.closest("#fondationsRemiseEcarter")) {
      // Écarter n'efface pas le calcul : il reste dans la discussion, avec son
      // bouton. On dit non à l'ajout, pas au résultat.
      if (store.ui.fondations) store.ui.fondations.remise = null;
      dessiner(root);
      return;
    }
    if (evenement.target.closest("[data-semelle-retour]")) {
      fermerLaSemelle(root);
      return;
    }
    const pas = evenement.target.closest("[data-semelle-pas]");
    if (pas) {
      const suivant = voisine(etat.semelles.length, etat.ouverte ?? 0, Number(pas.dataset.semellePas));
      if (suivant !== null) ouvrirSemelle(root, suivant);
      return;
    }

    if (evenement.target.closest('[data-action-id="fondationsCalculer"]')) {
      await calculer(root);
      return;
    }
    if (evenement.target.closest('[data-action-id="fondationsReinitialiser"]')) {
      etat.entrees = entreesNeuves();
      etat.resultat = null;
      etat.empreinteDuResultat = "";
      etat.erreur = "";
      etat.invalides = [];
      etat.nappeSurvolee = null;
      marquerVenuesDeLaMemoire();
      // Le résultat d'avant ne décrit plus rien : il sort du tableau aussi.
      if (etat.ouverte !== null) etat.resultats[etat.ouverte] = null;
      void enregistrerLaSemelleOuverte(root);
      dessiner(root);
    }
  });
}

async function calculer(root) {
  etat.calculEnCours = true;
  etat.erreur = "";
  etat.invalides = entreesInvalides(etat.entrees);
  dessiner(root);

  if (etat.invalides.length) {
    etat.calculEnCours = false;
    dessiner(root);
    return;
  }

  // Ce qui part au calcul, retenu **avant** l'aller-retour : la saisie peut
  // changer pendant, et sceller le résultat sur les entrées d'après le
  // rattacherait à une géométrie qui ne l'a pas produit. C'est la même
  // confusion que celle du tableau, à l'échelle d'une seule semelle.
  const entreesEnvoyees = structuredClone(etat.entrees);
  const marque = empreinte(entreesEnvoyees);
  const rang = etat.ouverte;

  let resultat = null;
  let erreurDite = "";
  try {
    resultat = await calculerFondation(entreesEnvoyees);
  } catch (erreur) {
    erreurDite = erreur instanceof Error ? erreur.message : String(erreur);
    etat.invalides = erreur?.invalides || [];
  }

  sceller(rang, marque, resultat, erreurDite);

  // Si l'on a changé de semelle entre-temps, le résultat est rangé pour la
  // sienne et rien ne s'affiche : ce qui est à l'écran n'est plus ce calcul-là.
  if (rang === etat.ouverte) {
    etat.resultat = resultat;
    etat.empreinteDuResultat = resultat ? marque : "";
    etat.erreur = erreurDite;
  }
  etat.calculEnCours = false;
  dessiner(root);
}

/**
 * Le résultat d'une semelle, rangé dans le tableau sous l'empreinte qui le tient.
 *
 * Sans cela, recalculer une semelle ne changeait rien au tableau : il gardait
 * ce que la synthèse avait trouvé, c'est-à-dire l'état d'avant. On y range
 * aussi les échecs : « non calculée » est un verdict, pas un trou.
 */
function sceller(rang, marque, resultat, erreurDite) {
  if (rang === null || rang === undefined) return;
  etat.resultats[rang] = resultat
    ? { resultat, empreinte: marque }
    : erreurDite
      ? { error: erreurDite, empreinte: marque }
      : null;
}

/**
 * Le tableau de synthèse : une ligne par type de massif, et les totaux.
 *
 * C'est ce qui est livré au client — combien de chaque, quelles cotes, quel
 * volume de béton en tout. Le détail d'une semelle s'ouvre en cliquant sa
 * ligne, et l'on passe de l'une à l'autre sans repasser par ici.
 */
function dessinerSynthese() {
  const table = synthese(etat.semelles, resultatsAJour());

  return `
    <section class="fondations-etude">
      <header class="fondations-etude__tete">
        <div>
          <h4>Étude de fondations</h4>
          <p class="fondations-etude__note">
            Vos semelles, sur ce projet. Elles ne sont visibles que par vous.
            Seules les entrées sont conservées : les résultats se recalculent à
            l'ouverture, pour décrire le projet tel que le calcul le voit aujourd'hui.
          </p>
        </div>
        ${renderGhActionButton({ id: "fondationsAjouter", label: "Ajouter une semelle", tone: "primary", size: "md", mainAction: "" })}
      </header>

      ${etat.etudeErreur ? `<p class="fondations-erreur">${escapeHtml(etat.etudeErreur)}</p>` : ""}
      ${dessinerLaRemise()}

      ${table.lignes.length === 0 ? `
        <p class="fondations-etude__vide">
          ${etat.etudeChargee
            ? "Aucune semelle. Ajoutez-en une pour commencer l'étude."
            : "Lecture de l'étude…"}
        </p>` : `
        <div class="fondations-charges-defilement">
          <table class="fondations-charges fondations-etude__table">
            <thead>
              <tr>
                <th scope="col">Désignation</th>
                <th scope="col">Nbr</th>
                <th scope="col">Lx<em class="fondations-charges__unite">m</em></th>
                <th scope="col">Ly<em class="fondations-charges__unite">m</em></th>
                <th scope="col">Lz<em class="fondations-charges__unite">m</em></th>
                <th scope="col">Volume unitaire<em class="fondations-charges__unite">m³</em></th>
                <th scope="col">Volume total<em class="fondations-charges__unite">m³</em></th>
                <th scope="col">Vérification</th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              ${table.lignes.map((ligne, rang) => `
                <tr class="fondations-etude__ligne${etat.ouverte === rang ? " est-ouverte" : ""}">
                  <th scope="row">
                    <button type="button" class="fondations-etude__lien" data-semelle-ouvrir="${rang}">
                      ${ligne.entrees?.provenance?.par === "copilote"
                        ? `<span class="fondations-etude__venue" title="${escapeHtml(
                            `Proposée par le copilote${ligne.entrees.provenance.note ? ` — ${ligne.entrees.provenance.note}` : ""}`)}"
                            aria-label="Proposée par le copilote">${svgIcon("copilot", { width: 14, height: 14 })}</span>`
                        : ""}
                      ${escapeHtml(ligne.designation)}
                    </button>
                  </th>
                  <td>${ligne.nombre}</td>
                  <td>${escapeHtml(nombreLisible(ligne.entrees.sectionLx, 2))}</td>
                  <td>${escapeHtml(nombreLisible(ligne.entrees.sectionLy, 2))}</td>
                  <td>${escapeHtml(nombreLisible(ligne.entrees.hauteurLz, 2))}</td>
                  <td>${escapeHtml(nombreLisible(ligne.volume.unitaire, 2))}</td>
                  <td>${escapeHtml(nombreLisible(ligne.volume.total, 2))}</td>
                  <td class="${ligne.ratio === null ? "" : ratioDepasse(ligne.ratio) ? "est-depasse" : "est-verifie"}">
                    ${ligne.erreur
                      ? `<span class="fondations-etude__erreur" title="${escapeHtml(ligne.erreur)}">non calculée</span>`
                      : ligne.ratio === null
                        ? (etat.syntheseEnCours ? "calcul…" : "—")
                        : `${signeDuVerdict(ligne.ratio)}${escapeHtml(ratioLisible(ligne.ratio))}`}
                  </td>
                  <td>
                    <button type="button" class="fondations-etude__retirer" data-semelle-retirer="${rang}"
                            aria-label="${escapeHtml(`Retirer ${ligne.designation}`)}" title="Retirer de l'étude">
                      ${svgIcon("trash", { className: "octicon" })}
                    </button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td>${table.totaux.massifs}</td>
                <td colspan="4"></td>
                <td>${escapeHtml(nombreLisible(table.totaux.volume, 2))}</td>
                <td colspan="2">
                  ${table.totaux.verifiees > 0 ? `<span class="est-verifie">${table.totaux.verifiees} vérifiée${table.totaux.verifiees > 1 ? "s" : ""}</span>` : ""}
                  ${table.totaux.enDefaut > 0 ? `<span class="est-depasse">${table.totaux.enDefaut} en défaut</span>` : ""}
                  ${table.totaux.inconnues > 0 ? `<span class="fondations-etude__inconnues">${table.totaux.inconnues} non calculée${table.totaux.inconnues > 1 ? "s" : ""}</span>` : ""}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>`}
    </section>
  `;
}

/** La remise en attente, s'il y en a une pour ce projet. */
function remiseEnAttente() {
  return store.ui?.fondations?.remise ?? null;
}

/**
 * Les massifs que le copilote propose, annoncés avant d'être ajoutés.
 *
 * Le bandeau dit exactement ce que le clic va faire : combien de lignes
 * s'ajoutent, à quoi elles s'ajoutent, et lesquelles seront renommées parce que
 * le nom était pris. Un ajout qui renomme en silence fait douter du tableau
 * entier la première fois qu'on s'en aperçoit.
 *
 * Rien ne remplace rien. Une semelle déjà là est la décision de quelqu'un ;
 * les massifs remis se posent **à la suite**, et l'on compare.
 */
function dessinerLaRemise() {
  const remise = remiseEnAttente();
  if (!remise?.semelles?.length) return "";

  const plan = planDeLaRemise(remise.semelles, etat.semelles);

  return `
    <div class="fondations-remise">
      <p class="fondations-remise__titre">
        ${svgIcon("copilot", { width: 16, height: 16 })}
        ${plan.ajoutees} massif${plan.ajoutees > 1 ? "s" : ""} proposé${plan.ajoutees > 1 ? "s" : ""} par le copilote
        ${remise.note ? `<span class="fondations-remise__source">${escapeHtml(remise.note)}</span>` : ""}
      </p>
      <p class="fondations-remise__note">
        ${plan.dejaLa > 0
          ? `Ils s'ajouteront à la suite des ${plan.dejaLa} semelle${plan.dejaLa > 1 ? "s" : ""} de l'étude — rien n'est remplacé.`
          : "Ils ouvriront l'étude."}
        ${plan.renommees > 0
          ? ` ${plan.renommees} nom${plan.renommees > 1 ? "s étaient déjà pris" : " était déjà pris"} : ${
              escapeHtml(plan.semelles.filter((ligne) => ligne.renommee).map((ligne) => ligne.designation).join(", "))}.`
          : ""}
      </p>
      <ul class="fondations-remise__liste">
        ${plan.semelles.map((ligne) => `
          <li>
            <span class="fondations-remise__nom">${escapeHtml(ligne.designation)}</span>
            <span class="mono">${escapeHtml(nombreLisible(ligne.entrees.sectionLx, 2))} × ${
              escapeHtml(nombreLisible(ligne.entrees.sectionLy, 2))} × ${
              escapeHtml(nombreLisible(ligne.entrees.hauteurLz, 2))} m</span>
            ${ligne.nombre > 1 ? `<span class="fondations-remise__nombre">× ${ligne.nombre}</span>` : ""}
          </li>`).join("")}
      </ul>
      <div class="fondations-remise__actions">
        <button type="button" class="gh-btn gh-btn--primary" id="fondationsRemiseAjouter"
          ${etat.remiseEnCours ? "disabled" : ""}>
          ${etat.remiseEnCours ? "Ajout en cours…" : `Ajouter au tableau`}
        </button>
        <button type="button" class="gh-btn" id="fondationsRemiseEcarter" ${etat.remiseEnCours ? "disabled" : ""}>
          Écarter
        </button>
      </div>
    </div>
  `;
}

/**
 * Ajouter les massifs remis, à la suite.
 *
 * Une semelle à la fois, dans l'ordre : la base pose le propriétaire et rend la
 * ligne écrite, et c'est elle qu'on garde. Un échec au milieu laisse ce qui est
 * déjà passé — on le dit plutôt que de faire croire que rien n'a été ajouté.
 */
async function ajouterLaRemise(root) {
  const remise = remiseEnAttente();
  if (!remise?.semelles?.length || etat.remiseEnCours) return;

  etat.remiseEnCours = true;
  etat.etudeErreur = "";
  dessiner(root);

  const plan = planDeLaRemise(remise.semelles, etat.semelles);
  let ajoutees = 0;

  try {
    for (const ligne of plan.semelles) {
      const creee = await creerSemelle(projetCourant, {
        designation: ligne.designation,
        nombre: ligne.nombre,
        entrees: ligne.entrees,
        rang: etat.semelles.length
      });
      etat.semelles.push(creee);
      etat.resultats.push(null);
      ajoutees += 1;
    }
    store.ui.fondations.remise = null;
  } catch (erreur) {
    etat.etudeErreur = `${ajoutees} massif${ajoutees > 1 ? "s ajoutés" : " ajouté"} sur ${plan.ajoutees}. `
      + (erreur instanceof Error ? erreur.message : String(erreur));
    // Ce qui reste à poser reste remis : on ne perd pas le travail parce que la
    // base a bronché au milieu.
    store.ui.fondations.remise = { ...remise, semelles: remise.semelles.slice(ajoutees) };
  } finally {
    etat.remiseEnCours = false;
  }

  dessiner(root);
  // Les semelles ajoutées se calculent comme les autres : sans cela le tableau
  // afficherait des cotes sans vérification, ce qui a l'air d'un doute alors
  // que c'est une absence.
  await recalculerLaSynthese(root);
}

/**
 * L'identité de la semelle ouverte, et par où passer à la suivante.
 *
 * Les flèches ne bouclent pas : arrivé au bout, le bouton s'éteint. Reboucler
 * ferait croire qu'on avance alors qu'on repasse sur ce qu'on vient de lire.
 */
function dessinerBarreDeSemelle() {
  const semelle = semelleOuverte();
  if (!semelle) return "";
  const rang = etat.ouverte;
  const total = etat.semelles.length;

  return `
    <div class="fondations-semelle-barre">
      <button type="button" class="fondations-semelle-barre__retour" data-semelle-retour>
        ${svgIcon("arrow-left", { className: "octicon" })} Tableau de l'étude
      </button>
      <label class="fondations-semelle-barre__nom">
        <span class="fondations-champ__libelle">Désignation</span>
        <input class="fondations-champ__saisie" type="text" data-semelle-designation
               placeholder="${escapeHtml(designationDe({}, rang))}"
               value="${escapeHtml(semelle.designation ?? "")}">
      </label>
      <label class="fondations-semelle-barre__nombre">
        <span class="fondations-champ__libelle">Nombre de massifs</span>
        <input class="fondations-champ__saisie" type="text" inputmode="numeric" data-semelle-nombre
               value="${escapeHtml(String(semelle.nombre ?? 1))}">
      </label>
      <span class="fondations-semelle-barre__volume">
        Volume ${escapeHtml(nombreLisible(volumeDe(etat.entrees, semelle.nombre ?? 0).total, 2))} m³
      </span>
      <span class="fondations-semelle-barre__pas">
        <button type="button" data-semelle-pas="-1"${voisine(total, rang, -1) === null ? " disabled" : ""}
                aria-label="Semelle précédente" title="Semelle précédente">‹</button>
        <span>${rang + 1} / ${total}</span>
        <button type="button" data-semelle-pas="1"${voisine(total, rang, 1) === null ? " disabled" : ""}
                aria-label="Semelle suivante" title="Semelle suivante">›</button>
      </span>
    </div>
  `;
}

function dessiner(root) {
  const dejaCalcule = Boolean(etat.resultat);
  const surLeTableau = etat.ouverte === null && !etat.libre;
  root.innerHTML = `
    <section class="settings-section is-active" data-solidity-tool-card="fondations">
      <div class="settings-card settings-card--param studio-tool-card">
        <div class="settings-card__head studio-tool-card__head">
          <div>
            <span class="settings-card__head-title">
              <h4>Fondations — calcul</h4>
              <div class="studio-tool-card__actions">
                ${surLeTableau ? "" : renderGhActionButton({ id: "fondationsReinitialiser", label: "Réinitialiser", tone: "default", size: "md", disabled: etat.calculEnCours, mainAction: "" })}
                ${surLeTableau ? "" : renderGhActionButton({ id: "fondationsCalculer", label: etat.calculEnCours ? "Calcul en cours…" : dejaCalcule ? "Recalculer" : "Calculer", tone: "primary", size: "md", disabled: etat.calculEnCours, mainAction: "" })}
              </div>
            </span>
          </div>
        </div>
        <div class="settings-card__body studio-tool-card__body">
          <p class="gh-text-muted">
            Fondation superficielle : glissement, basculement, contrainte de référence,
            surfaces comprimées et ferraillage de la semelle, sur 376 combinaisons d'actions.
            Le calcul est fait par le serveur, jamais par ce navigateur.
          </p>
          ${surLeTableau ? dessinerSynthese() : ""}
          ${etat.libre ? `<p class="fondations-erreur">${escapeHtml(etat.etudeErreur)}</p>` : ""}
          ${surLeTableau ? "" : dessinerBarreDeSemelle()}
          ${surLeTableau ? "" : (etat.erreur ? `<p class="fondations-erreur">${escapeHtml(etat.erreur)}</p>` : "")}
          ${surLeTableau ? "" : dessinerInvalides()}
          <div class="fondations-grille"${surLeTableau ? ' hidden' : ""}>
            <div class="fondations-colonne">
              ${dessinerRappels()}
              ${dessinerChoix()}
              <fieldset class="fondations-zone">
                <legend>Schéma</legend>
                <p class="fondations-zone__note">
                  Le schéma suit la saisie. La surface d'appui n'apparaît qu'une fois
                  le calcul fait, et seulement en répartition Meyerhoff — en répartition
                  constante, elle est un polygone que le calcul ne rend pas.
                </p>
                <div data-fondations-schema>${dessinerSchema(etat.entrees, resultatPerime() ? null : etat.resultat, { nappe: etat.nappeSurvolee })}</div>
              </fieldset>
              ${ZONES.map(dessinerZone).join("")}
              ${dessinerCharges()}
              ${dessinerFerraillage()}
            </div>
            <div class="fondations-colonne">
              ${surLeTableau ? "" : dessinerResultats()}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function dessinerInvalides() {
  if (!etat.invalides.length) return "";
  return `
    <div class="fondations-invalides">
      <p><strong>Le calcul n'a pas été lancé.</strong> Ce qui manque ou ne tient pas :</p>
      <ul>${etat.invalides.map((p) => `<li>${escapeHtml(p.raison)}</li>`).join("")}</ul>
    </div>
  `;
}

function dessinerChoix() {
  return `
    <fieldset class="fondations-zone">
      <legend>Hypothèses réglementaires</legend>
      <div class="fondations-champs">
        ${CHOIX.map((choix) => `
          <label class="fondations-champ${estPertinent(choix, etat.entrees) ? "" : " est-hors-sujet"}"
                 ${estPertinent(choix, etat.entrees) ? "" : `title="Ne sert qu'au règlement EC8-5 Annexe F."`}>
            <span class="fondations-champ__libelle">${escapeHtml(choix.libelle)}${marqueMemoire(choix.cle)}</span>
            <select class="fondations-champ__saisie" data-fondation-choix="${escapeHtml(choix.cle)}">
              ${choix.valeurs.map((valeur) => `
                <option value="${escapeHtml(valeur)}"${String(etat.entrees[choix.cle]) === valeur ? " selected" : ""}>${escapeHtml(valeur)}</option>
              `).join("")}
            </select>
          </label>
        `).join("")}
      </div>
    </fieldset>
  `;
}

/**
 * La marque d'une valeur venue de la mémoire du projet.
 *
 * Une astérisque, et l'infobulle dit l'énoncé et la date où il a été tranché.
 * Sans elle, une valeur pré-remplie ne se distingue pas d'une valeur saisie, et
 * l'on ne sait plus laquelle on a décidée.
 */
function marqueMemoire(cle) {
  const rappel = etat.venuesDeLaMemoire?.[cle];
  if (!rappel) return "";
  const date = rappel.trancheeLe ? ` (tranché le ${new Date(rappel.trancheeLe).toLocaleDateString("fr-FR")})` : "";
  const titre = `Valeur reprise de la mémoire du projet : ${rappel.enonce || rappel.libelle}${date}. Vous pouvez la modifier pour essayer une variante.`;
  return `<abbr class="fondations-memoire" title="${escapeHtml(titre)}" aria-label="${escapeHtml(titre)}">*</abbr>`;
}

/**
 * Ce que le projet rappelle, et ce qu'il reproche à cette géométrie.
 *
 * Le rappel est affiché même quand il ne remplit aucun champ : la profondeur
 * hors gel n'entre dans aucun calcul de cet écran, mais elle décide de la
 * validité de l'assise, et personne ne devrait avoir à s'en souvenir.
 */
function dessinerRappels() {
  const rappels = Object.values(etat.rappels ?? {});
  if (rappels.length === 0) return "";

  return `
    <fieldset class="fondations-zone">
      <legend>Ce que le projet sait déjà</legend>
      <ul class="fondations-rappels">
        ${rappels.map((rappel) => `
          <li>
            <span class="fondations-rappels__libelle">${escapeHtml(rappel.libelle)}</span>
            <strong>${escapeHtml(rappel.unite ? `${nombreLisible(rappel.valeur, 3)} ${rappel.unite}` : rappel.valeur)}</strong>
            ${rappel.champ ? `<em>repris dans la saisie</em>` : ""}
          </li>
        `).join("")}
      </ul>
      ${dessinerAlertes("fondations-alertes--memoire")}
    </fieldset>
  `;
}

function dessinerZone(zone) {
  const unites = String(etat.entrees.unites || "");
  if (!estPertinent(zone, etat.entrees)) return "";
  return `
    <fieldset class="fondations-zone">
      <legend>${escapeHtml(zone.titre)}</legend>
      <div class="fondations-champs">
        ${zone.champs.map((champ) => `
          <label class="fondations-champ"${champ.aide ? ` title="${escapeHtml(champ.aide)}"` : ""}>
            <span class="fondations-champ__libelle">${escapeHtml(champ.libelle)}${uniteAffichee(champ, unites) ? ` <em>[${escapeHtml(uniteAffichee(champ, unites))}]</em>` : ""}</span>
            <input class="fondations-champ__saisie" type="text" inputmode="decimal"
              data-fondation-champ="${escapeHtml(champ.cle)}"
              value="${escapeHtml(String(etat.entrees[champ.cle] ?? ""))}">
          </label>
        `).join("")}
      </div>
    </fieldset>
  `;
}

function dessinerCharges() {
  const unites = String(etat.entrees.unites || "");
  const uniteEffort = { "{ T ; Tm }": "T", "{ kN ; kNm }": "kN", "{ daN ; daNm }": "daN" }[unites] || "";
  const uniteMoment = { "{ T ; Tm }": "Tm", "{ kN ; kNm }": "kNm", "{ daN ; daNm }": "daNm" }[unites] || "";
  const uniteDe = (composante) => (composante.cle.startsWith("M") ? uniteMoment : uniteEffort);
  return `
    <fieldset class="fondations-zone">
      <legend>Charges appliquées</legend>
      <p class="fondations-zone__note">
        Un cas laissé à zéro n'est pas seulement neutre : il disparaît des
        combinaisons, comme dans la note de calcul d'origine.
      </p>
      <div class="fondations-charges-defilement">
        <table class="fondations-charges">
          <thead>
            <tr>
              <th scope="col">Cas</th>
              <th scope="col">Type</th>
              ${COMPOSANTES.map((c) => `
                <th scope="col">${escapeHtml(c.libelle)}<em class="fondations-charges__unite">${escapeHtml(uniteDe(c))}</em></th>
              `).join("")}
            </tr>
          </thead>
          <tbody>
            ${CAS_DE_CHARGE.map((cas) => `
              <tr>
                <th scope="row">${escapeHtml(cas.libelle)}</th>
                <td class="fondations-charges__nature">${escapeHtml(cas.nature)}</td>
                ${COMPOSANTES.map((comp) => `
                  <td>
                    <input class="fondations-champ__saisie fondations-champ__saisie--serre" type="text" inputmode="decimal"
                      aria-label="${escapeHtml(`${cas.libelle} ${comp.libelle}`)}"
                      data-fondation-charge="${escapeHtml(`${cas.cle}.${comp.cle}`)}"
                      value="${escapeHtml(String(etat.entrees.charges?.[cas.cle]?.[comp.cle] ?? ""))}">
                  </td>
                `).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </fieldset>
  `;
}

/**
 * Le ferraillage proposé.
 *
 * C'est une saisie, pas un résultat : l'utilitaire ne choisit pas les barres,
 * il dit ce que la proposition vaut face à ce que le calcul exige. Une nappe
 * laissée à zéro n'est pas une nappe nulle — c'est une nappe qu'on ne pose pas,
 * et rien ne sera exigé d'elle.
 */
function dessinerFerraillage() {
  return `
    <fieldset class="fondations-zone">
      <legend>Ferraillage de la semelle</legend>
      <p class="fondations-zone__note">
        Ce que vous proposez de poser. Le calcul dira ce qu'il faut, il ne le choisit pas.
      </p>
      <div class="fondations-charges-defilement">
        <table class="fondations-charges">
          <thead>
            <tr><th scope="col">Nappe</th><th scope="col">Nombre</th><th scope="col">Diamètre</th></tr>
          </thead>
          <tbody>
            ${NAPPES.map((nappe) => `
              <tr data-nappe="${escapeHtml(nappe.cle)}"
                  class="${etat.nappeSurvolee === nappe.cle ? "est-survolee" : ""}">
                <th scope="row" class="fondations-charges__nature">${escapeHtml(nappe.libelle)}</th>
                <td>
                  <input class="fondations-champ__saisie fondations-champ__saisie--serre" type="text" inputmode="numeric"
                    aria-label="${escapeHtml(`${nappe.libelle} — nombre de barres`)}"
                    data-fondation-nappe="${escapeHtml(nappe.cle)}"
                    value="${escapeHtml(String(etat.entrees.ferraillage?.[nappe.cle]?.nombre ?? ""))}">
                </td>
                <td>
                  <select class="fondations-champ__saisie" data-fondation-barre="${escapeHtml(nappe.cle)}"
                          aria-label="${escapeHtml(`${nappe.libelle} — diamètre`)}">
                    ${BARRES.map((barre) => `
                      <option value="${escapeHtml(barre)}"${String(etat.entrees.ferraillage?.[nappe.cle]?.barre) === barre ? " selected" : ""}>${escapeHtml(barre)}</option>
                    `).join("")}
                  </select>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </fieldset>
  `;
}

function nombreLisible(valeur, decimales = 2) {
  if (valeur === Infinity) return "∞";
  if (!Number.isFinite(Number(valeur))) return "—";
  return Number(valeur).toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

/**
 * Le ratio, dit honnêtement.
 *
 * Deux valeurs se lisent mal telles quelles. `10` est la sentinelle de l'outil
 * d'origine pour « pas vérifié du tout ». Et un ratio **négatif** ne veut pas
 * dire « largement vérifié » : il vient d'une combinaison qui soulève la
 * semelle, donc d'un effort résistant négatif — c'est le pire cas, pas le
 * meilleur. Un écran qui afficherait « -19,7 » à côté d'un seuil de 1 laisserait
 * croire l'inverse de ce qui se passe.
 */
function ratioLisible(ratio) {
  const n = Number(ratio);
  if (!Number.isFinite(n)) return "—";
  if (n >= 10) return "≥ 10";
  if (n < 0) return `${nombreLisible(n, 3)} (soulèvement)`;
  return nombreLisible(n, 3);
}

/**
 * Le schéma, redessiné à la frappe.
 *
 * C'est là tout son intérêt : une cote absurde — un fût plus large que sa
 * semelle, une tête de fût hors du sol — se voit avant de lancer le calcul, et
 * non dans un résultat qu'il faudrait ensuite interpréter.
 */
function rafraichirSchema(root) {
  const hote = root.querySelector("[data-fondations-schema]");
  if (!hote) return;
  hote.innerHTML = dessinerSchema(etat.entrees, resultatPerime() ? null : etat.resultat, { nappe: etat.nappeSurvolee });
}

/**
 * Ce que la mémoire du projet reproche à la géométrie, écrit là où on regarde.
 *
 * Deux endroits, et c'est voulu : sous « Ce que le projet sait déjà », à côté
 * de la valeur qui la déclenche, et **en tête des résultats**, parce qu'un
 * verdict « vérifié » sur une semelle posée au-dessus du hors gel est un
 * verdict qui trompe. Aucun des calculs de cet écran ne voit le gel : s'il
 * n'est pas dit ici, il n'est dit nulle part.
 */
function dessinerAlertes(classe) {
  const alertes = alertesDeLaMemoire(etat.entrees, etat.rappels);
  if (alertes.length === 0) return "";
  return `<ul class="fondations-schema__alertes ${classe}" data-fondations-alertes="${escapeHtml(classe)}">
    ${alertes.map((alerte) => `<li>${escapeHtml(alerte.texte)}</li>`).join("")}
  </ul>`;
}

/** Les reproches de la mémoire, remis à jour sans tout redessiner. */
function rafraichirAlertes(root) {
  const alertes = alertesDeLaMemoire(etat.entrees, etat.rappels);
  const html = alertes.map((alerte) => `<li>${escapeHtml(alerte.texte)}</li>`).join("");

  for (const [classe, hote] of [
    ["fondations-alertes--memoire", root.querySelector(".fondations-rappels")?.closest(".fondations-zone")],
    ["fondations-alertes--resultats", root.querySelector(".fondations-resultats")]
  ]) {
    if (!hote) continue;
    const existante = hote.querySelector(`[data-fondations-alertes="${classe}"]`);
    if (alertes.length === 0) { existante?.remove(); continue; }
    if (existante) { existante.innerHTML = html; continue; }
    const liste = `<ul class="fondations-schema__alertes ${classe}" data-fondations-alertes="${classe}">${html}</ul>`;
    if (classe === "fondations-alertes--resultats") hote.querySelector(".fondations-resultats__tete")?.insertAdjacentHTML("afterend", liste);
    else hote.insertAdjacentHTML("beforeend", liste);
  }
}

/** La mention « périmé », posée sans tout redessiner. */
function marquerPerime(root) {
  const resultats = root.querySelector(".fondations-resultats");
  if (!resultats) return;
  resultats.classList.toggle("est-perime", resultatPerime());
}

/** Un ratio est dépassé s'il excède 1 — ou s'il est négatif, cf. ci-dessus. */
function ratioDepasse(ratio) {
  const n = Number(ratio);
  return Number.isFinite(n) && (n > 1 || n < 0);
}

/**
 * Le signe d'un verdict, à côté de son chiffre.
 *
 * La couleur seule ne suffit pas : un daltonien lit le même gris des deux
 * côtés, et une capture d'écran en noir et blanc aussi. Le signe porte
 * l'information, la couleur la renforce.
 */
function signeDuVerdict(ratio) {
  if (!Number.isFinite(Number(ratio))) return "";
  const passe = !ratioDepasse(ratio);
  return `<span class="fondations-signe fondations-signe--${passe ? "ok" : "ko"}"
    aria-label="${passe ? "vérifié" : "non vérifié"}" title="${passe ? "Vérifié" : "Non vérifié"}">
    ${svgIcon(passe ? "check-circle-fill" : "x-circle-fill", { className: "octicon" })}
  </span>`;
}

/** Le ferraillage : ce qui est posé, ce qu'il faut, et l'écart. */
function dessinerInterne(r) {
  const interne = r.interne;
  if (!interne) return "";

  if (interne.ratio === null) {
    return `
      <section class="fondations-bloc">
        <header class="fondations-bloc__tete"><h5>Ferraillage de la semelle</h5></header>
        <p class="fondations-bloc__combinaison">
          ${r.bilan?.verifie
            ? "Aucune nappe n'est proposée : renseignez un nombre de barres pour que le calcul se prononce."
            : "La stabilité externe n'est pas vérifiée : sur une semelle qui glisse ou qui bascule, la question du ferraillage ne se pose pas encore."}
        </p>
      </section>
    `;
  }

  return `
    <section class="fondations-bloc">
      <header class="fondations-bloc__tete">
        <h5>Ferraillage de la semelle</h5>
        <span class="fondations-bloc__ratio${ratioDepasse(interne.ratio) ? " est-depasse" : " est-verifie"}">
          ${signeDuVerdict(interne.ratio)}${escapeHtml(ratioLisible(interne.ratio))}
        </span>
      </header>
      <div class="fondations-charges-defilement">
        <table class="fondations-charges fondations-nappes">
          <thead>
            <tr>
              <th scope="col">Nappe</th>
              <th scope="col">Posé</th>
              <th scope="col">es<em class="fondations-charges__unite">m</em></th>
              <th scope="col">As<em class="fondations-charges__unite">cm²</em></th>
              <th scope="col">As,min<em class="fondations-charges__unite">cm²</em></th>
              <th scope="col" title="Section exigée rapportée à la section posée. Au-delà de 1, l'acier posé ne suffit pas.">
                Ratio<em class="fondations-charges__unite">As,min / As</em>
              </th>
            </tr>
          </thead>
          <tbody>
            ${interne.nappes.map((nappe) => `
              <tr data-nappe="${escapeHtml(nappe.cle)}" tabindex="0"
                  class="${etat.nappeSurvolee === nappe.cle ? "est-survolee" : ""}">
                <th scope="row">${escapeHtml(nappe.cle)}</th>
                <td>${nappe.nombre > 0 ? escapeHtml(`${nappe.nombre} ${nappe.barre}`) : "—"}</td>
                <td>${nappe.espacement === null ? "—" : escapeHtml(nombreLisible(nappe.espacement, 2))}</td>
                <td>${nappe.fournie === null ? "—" : escapeHtml(nombreLisible(nappe.fournie, 1))}</td>
                <td>${nappe.requise === null ? "—"
                  : nappe.requise === Infinity ? "section insuffisante"
                    : escapeHtml(nombreLisible(nappe.requise, 2))}</td>
                <td class="${nappe.ratio === null ? "" : ratioDepasse(nappe.ratio) ? "est-depasse" : "est-verifie"}">
                  ${nappe.ratio === null ? "—" : `${signeDuVerdict(nappe.ratio)}${escapeHtml(ratioLisible(nappe.ratio))}`}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function dessinerResultats() {
  if (!etat.resultat) {
    return `
      <article class="fondations-resultats fondations-resultats--vide">
        <h4>Résultats</h4>
        ${dessinerAlertes("fondations-alertes--resultats")}
        <p class="gh-text-muted">Aucun calcul lancé. Rien n'est affiché tant que rien n'a été calculé.</p>
      </article>
    `;
  }

  const r = etat.resultat;
  const u = r.unites || {};
  const selon = r.bilan?.selon === "annexe F" ? "Capacité portante sismique" : "Stabilité externe";
  const verdict = r.bilan?.verifie
    ? `<span class="fondations-verdict fondations-verdict--ok">${escapeHtml(selon)} vérifiée</span>`
    : `<span class="fondations-verdict fondations-verdict--ko">${escapeHtml(selon)} non vérifiée</span>`;

  const bloc = (titre, ratio, combinaison, lignes) => `
    <section class="fondations-bloc">
      <header class="fondations-bloc__tete">
        <h5>${escapeHtml(titre)}</h5>
        <span class="fondations-bloc__ratio${ratioDepasse(ratio) ? " est-depasse" : " est-verifie"}">
          ${signeDuVerdict(ratio)}${escapeHtml(ratioLisible(ratio))}
        </span>
      </header>
      <p class="fondations-bloc__combinaison">${escapeHtml(combinaison || "—")}</p>
      <dl class="fondations-bloc__valeurs">
        ${lignes.map(([cle, valeur, unite]) => `
          <div><dt>${escapeHtml(cle)}</dt><dd>${escapeHtml(valeur)}${unite ? ` <em>${escapeHtml(unite)}</em>` : ""}</dd></div>
        `).join("")}
      </dl>
    </section>
  `;

  const surface = (titre, s) => `
    <div><dt>${escapeHtml(titre)}</dt>
      <dd>${escapeHtml(nombreLisible(s.obtenue, 1))} % <em>(minimum ${escapeHtml(nombreLisible(s.minimale, 1))} %)</em></dd></div>
  `;

  return `
    <article class="fondations-resultats${resultatPerime() ? " est-perime" : ""}">
      <header class="fondations-resultats__tete">
        <h4>Résultats</h4>
        ${verdict}
      </header>
      ${dessinerAlertes("fondations-alertes--resultats")}
      <p class="fondations-resultats__perime">
        La saisie a changé depuis ce calcul : ces chiffres ne décrivent plus ce
        qui est à l'écran. Relancez le calcul.
      </p>
      <p class="fondations-resultats__bilan">
        Ratio déterminant <strong class="${ratioDepasse(r.bilan?.ratio) ? "est-depasse" : "est-verifie"}">${escapeHtml(ratioLisible(r.bilan?.ratio))}</strong>
        sur ${escapeHtml(String(r.combinaisonsExaminees ?? "—"))} combinaisons examinées.
        Un ratio supérieur à 1 signifie que la sollicitation dépasse la résistance.
      </p>

      ${r.annexeF ? bloc("Capacité portante sismique — EN 1998-5 annexe F", r.annexeF.ratio, r.annexeF.combinaison, [
        ["Direction déterminante", `suivant ${r.annexeF.direction}`, ""],
        ["ag — accélération de calcul", nombreLisible(r.annexeF.parametres.ag, 3), "m/s²"],
        ["S — paramètre de sol", nombreLisible(r.annexeF.parametres.S, 2), ""],
        ["gRd — coefficient de modèle", nombreLisible(r.annexeF.parametres.gammaRd, 2), ""],
        ["N — effort normal réduit", nombreLisible(r.annexeF.directions.find((d) => d.direction === r.annexeF.direction)?.N, 4), ""],
        ["V — effort tranchant réduit", nombreLisible(r.annexeF.directions.find((d) => d.direction === r.annexeF.direction)?.V, 4), ""],
        ["M — moment réduit", nombreLisible(r.annexeF.directions.find((d) => d.direction === r.annexeF.direction)?.M, 4), ""]
      ]) : ""}
      ${r.annexeF ? `<p class="fondations-resultats__portee">
        Sous ce règlement, l'annexe F <strong>remplace</strong> les trois vérifications
        ci-dessous : elle tient le triplet (N, V, M) à l'intérieur d'une surface limite,
        au lieu de juger séparément le glissement, le basculement et la contrainte.
        Celles-ci restent affichées pour information.
        L'outil d'origine arrondit ce ratio à l'unité dans sa case de bilan
        (${escapeHtml(String(r.annexeF.arrondiDeLaSource))}) ; le nombre est donné ici tel quel.
      </p>` : ""}

      ${bloc("Glissement", r.glissement?.ratio, r.glissement?.combinaison, [
        ["HEd — effort horizontal total", nombreLisible(r.glissement?.HEd, 1), u.effort],
        ["Rh,d,1 — part de frottement", nombreLisible(r.glissement?.Rhd1, 1), u.effort],
        ["Rh,d,2 — part de cohésion", nombreLisible(r.glissement?.Rhd2, 1), u.effort],
        ["Rp,d — part de butée", nombreLisible(r.glissement?.Rpd, 1), u.effort],
        ["HRd — effort résistant", nombreLisible(r.glissement?.HRd, 1), u.effort]
      ])}

      ${bloc("Basculement", r.basculement?.ratio, r.basculement?.combinaison, [
        ["Sens sollicitant", String(r.basculement?.sens ?? "—"), ""],
        ["MEd — moment sollicitant", nombreLisible(r.basculement?.MEd, 1), u.moment],
        ["Mst,0 — part due aux charges", nombreLisible(r.basculement?.Mst0, 1), u.moment],
        ["Mst,b — part due à la butée", nombreLisible(r.basculement?.Mstb, 1), u.moment],
        ["MRd — moment stabilisant", nombreLisible(r.basculement?.MRd, 1), u.moment]
      ])}

      ${bloc("Contrainte", r.contrainte?.ratio, r.contrainte?.combinaison, [
        ["Vd — effort vertical", nombreLisible(r.contrainte?.Vd, 1), u.effort],
        ["Md,x — moment résiduel suivant x", nombreLisible(r.contrainte?.Mdx, 1), u.moment],
        ["Md,y — moment résiduel suivant y", nombreLisible(r.contrainte?.Mdy, 1), u.moment],
        ["sref — contrainte de référence", nombreLisible(r.contrainte?.sigmaRef, 3), u.contrainte],
        ["sLIM — contrainte limite", nombreLisible(r.contrainte?.sigmaLim, 3), u.contrainte],
        ["id — coefficient d'inclinaison", nombreLisible(r.contrainte?.id, 3), ""],
        ["sREF — contrainte admissible", nombreLisible(r.contrainte?.sigmaRefLim, 3), u.contrainte]
      ])}

      <section class="fondations-bloc">
        <header class="fondations-bloc__tete">
          <h5>Surfaces comprimées</h5>
          <span class="fondations-bloc__ratio${ratioDepasse(r.surfaces?.ratio) ? " est-depasse" : " est-verifie"}">
          ${signeDuVerdict(r.surfaces?.ratio)}${escapeHtml(ratioLisible(r.surfaces?.ratio))}
        </span>
        </header>
        <dl class="fondations-bloc__valeurs">
          ${surface("ELU / ELA", r.surfaces?.eluEla || {})}
          ${surface("ELS caractéristiques", r.surfaces?.elsRares || {})}
          ${surface("ELS quasi-permanents", r.surfaces?.elsQp || {})}
        </dl>
      </section>

      ${dessinerInterne(r)}

      <p class="fondations-resultats__portee">
        Cet écran porte la <strong>stabilité externe</strong>, le
        <strong>ferraillage de la semelle</strong> et la <strong>capacité portante
        sismique</strong> de l'annexe F. Ne sont pas calculés :
        ${escapeHtml((r.interne?.horsPortee ?? []).join(", ").toLowerCase())}.
        Ils ne sont donc pas vérifiés par ce résultat.
      </p>
    </article>
  `;
}
