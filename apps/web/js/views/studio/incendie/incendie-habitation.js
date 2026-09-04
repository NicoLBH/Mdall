/**
 * L'écran « Incendie — Habitation » de l'Atelier.
 *
 * ## Un questionnaire, pas un formulaire
 *
 * L'écran ne sait pas quelles questions existent. Il en reçoit une vague, la
 * pose, renvoie les réponses, en reçoit une autre. C'est ce qui permet de ne
 * demander que ce qui décide encore de quelque chose — une maison de plain-pied
 * ne se voit jamais demander la force portante d'une chaussée — et c'est aussi
 * ce qui garde le raisonnement au serveur : le catalogue complet des questions
 * dirait déjà quels paramètres comptent et dans quel ordre ils s'enchaînent.
 *
 * ## Ce qui est montré d'un résultat
 *
 * La valeur, l'article, le paragraphe et **la phrase du texte qui a décidé**.
 * Un degré coupe-feu sans sa phrase ne se défend pas en réunion : il faut
 * pouvoir ouvrir l'arrêté à la bonne ligne devant la personne qui conteste. Ce
 * qui reste au serveur, ce sont les branches non prises — la table entière des
 * conditions, c'est-à-dire le dépouillement du texte.
 *
 * ## Et le schéma décisionnel
 *
 * Le graphe se lit en entier : quels modules existent, ce que chacun produit,
 * qui dépend de qui, quel article. C'est la carte, pas le trésor. Le module
 * qu'on désigne y montre ce qu'il a conclu et pourquoi.
 */

import { escapeHtml } from "../../../utils/escape-html.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";
import { renderGhActionButton } from "../../ui/gh-split-button.js";
import { svgIcon } from "../../../ui/icons.js";
import {
  consulterIncendie, lireArticleIncendie, inspecterIncendie, ecrireLaNoticeIncendie
} from "../../../services/incendie-service.js";
import {
  lireLaNotice, enregistrerLaNotice, lireLesChoix, retenirLeChoix
} from "../../../services/incendie-notice-supabase.js";
import { dessinerLaNotice, paragraphesDe, departementDe, noticeEnHtml } from "./notice-ecran.js";
import { brancherChampRedige } from "../../ui/champ-redige.js";
import { collerLesTitres } from "../../ui/titres-colles.js";
import { fermerQuandSorti } from "../../ui/fermer-hors-ecran.js";
import { renderMarkdownToHtml } from "../../../utils/markdown-renderer.js";
import {
  dessinerGrapheLiaisons, brancherGrapheLiaisons, tracerLesLiens as tracerLesLiensDuGraphe,
  appliquerZoom as appliquerZoomAuGraphe, noeudsVisibles
} from "../../ui/graphe-liaisons.js";
import { reagencer, marquerLesPartants } from "../../ui/transition-flip.js";
import { dessinerLaCoupe, plansDisponibles, resumer, resumerLePlan } from "./batiment.js";
import {
  dessinerLesEtudes, empreinteDesConclusions, ceQuiAChange, titreParDefaut, rangSuivant, etudeAOuvrir
} from "./etudes.js";
import {
  lireLesEtudes, ouvrirUneEtude, enregistrerLEtude, supprimerLEtude
} from "../../../services/incendie-etude-supabase.js";
import {
  REMISE_INCENDIE_ANNONCEE, planDeLaRemiseIncendie, etudeCompletee, nomDeLEtudeVenueDuCopilote
} from "../../../services/incendie-remise.js";
import { store } from "../../../store.js";
import { resolveCurrentBackendProjectId } from "../../../services/project-supabase-sync.js";

const etat = {
  reponses: {},
  vue: null,
  enCours: false,
  erreur: "",
  onglet: "questionnaire",
  /** Le module dont on regarde le détail dans le schéma. */
  survole: null,

  /**
   * Le parcours : les questions dans l'ordre où elles se sont présentées.
   *
   * Il n'est pas la liste des questions restantes — celle-là change à chaque
   * réponse. C'est un chemin, et on peut y revenir en arrière : sans quoi une
   * réponse donnée trop vite se paie par un « Recommencer », c'est-à-dire par
   * tout reprendre.
   */
  parcours: [],
  position: 0,
  /**
   * Vrai quand c'est la personne qui s'est déplacée, pas le questionnaire.
   *
   * Sans ce drapeau, revenir sur une question laissée sans réponse serait
   * aussitôt annulé : la consultation suivante ramènerait sur « la première
   * question qui attend », c'est-à-dire ailleurs, et le retour en arrière
   * n'existerait pas.
   */
  deplacementManuel: false,

  /** Le schéma : son grossissement, et s'il occupe la page. */
  zoom: 1,
  pleinEcran: false,

  /**
   * Ce que le schéma montre.
   *
   * Par défaut, seulement ce qui porte une réponse : un schéma où les deux
   * tiers des cartes disent « sans objet » se lit mal, et ce n'est pas ce qu'on
   * vient y chercher. `montrerTout` rouvre la carte entière — utile pour
   * vérifier qu'on n'a rien oublié, et réservé à qui a le droit de vérifier.
   * `chemin` resserre encore : la carte désignée, ce qui la décide, ce qui en
   * dépend, et rien d'autre.
   */
  montrerTout: false,
  chemin: null,
  peutToutMontrer: false,

  /**
   * Les questions telles que le serveur les a décrites, retenues au passage.
   *
   * Une question répondue disparaît de la vague suivante — c'est normal, elle
   * n'a plus à être posée. Mais revenir dessus suppose de savoir encore son
   * libellé et ses réponses possibles, et les redemander au serveur pour
   * afficher une case à cocher serait un aller-retour pour rien.
   */
  questionsVues: {},

  /**
   * Les articles déjà lus, gardés au passage.
   *
   * L'arrêté entier pèse deux cent cinquante kilo-octets : il ne descend pas
   * avec chaque vague de questions, on va chercher celui qu'on ouvre. Le garder
   * évite de le redemander à chaque aller-retour dans le questionnaire.
   */
  articles: {},
  /** L'article ouvert sous la question courante, s'il l'est. */
  articleOuvert: false,

  /**
   * Les études du projet, et celle qu'on remplit.
   *
   * Le questionnaire vivait dans la page : fermer l'onglet perdait quarante
   * réponses. Elles vont désormais en base — les **réponses**, jamais les
   * conclusions, qui se recalculent à l'ouverture. Plusieurs études par projet,
   * parce qu'un même bâtiment se regarde en 3e famille B puis en 2e famille
   * avec un escalier de plus, et que ce sont deux hypothèses, pas deux
   * versions.
   */
  etudes: [],
  etudeId: "",
  etudesChargees: false,
  /** Ce que la barre dit de l'enregistrement : « enregistrée », « en cours »… */
  enregistrement: "",
  /**
   * Ce qui a bougé depuis le dernier enregistrement de l'étude ouverte.
   *
   * Les conclusions ne sont pas conservées ; leur **empreinte** l'est. On ne
   * peut donc pas dire laquelle a changé, mais on peut dire qu'il y en a une —
   * et se taire là-dessus serait laisser signer sur une lecture périmée.
   */
  changeDepuis: null,

  /**
   * Le dépouillement du module désigné, quand on l'a demandé.
   *
   * Il ne s'ouvre que pour les comptes inscrits côté serveur. Un refus n'est
   * pas une panne : c'est la règle du produit, et l'écran le dit ainsi.
   */
  inspection: null
};

let projetAffiche = "";

/**
 * L'identifiant du projet **en base**.
 *
 * Ce n'est pas celui de la route. Ils coïncident souvent, et « souvent » ne
 * suffit pas : l'utilitaire du copilote va chercher l'étude sous l'identifiant
 * que `resolveCurrentBackendProjectId` rend, et une étude écrite sous un autre
 * ne serait jamais retrouvée — le pré-remplissage marcherait chez l'un et pas
 * chez l'autre, sans rien dire. L'écran des fondations résout déjà ainsi ; on
 * s'aligne plutôt que d'espérer que les deux clés soient la même.
 */
let projetEnBase = "";

function clefDuProjetAffiche() {
  return String(store.currentProjectId || store.currentProject?.id || "");
}

/**
 * Tout oublier : on a changé de projet.
 *
 * Comme pour les fondations, l'état vit au niveau du module — c'est ce qui
 * permet de revenir sur l'écran sans reperdre vingt réponses. Le revers est
 * qu'il survivrait au changement de projet, et le classement d'un bâtiment
 * réapparaîtrait sur un autre.
 */
function oublierLeProjet() {
  etat.reponses = {};
  etat.vue = null;
  etat.enCours = false;
  etat.erreur = "";
  etat.onglet = "questionnaire";
  etat.survole = null;
  etat.parcours = [];
  etat.position = 0;
  etat.questionsVues = {};
  etat.zoom = 1;
  etat.pleinEcran = false;
  figerLeDocument();
  etat.montrerTout = false;
  etat.chemin = null;
  etat.articleOuvert = false;
  etat.inspection = null;
  etat.vueDuBatiment = "coupe";
  etat.notice = null;
  etat.complements = {};
  etat.entete = {};
  etat.bibliotheque = {};
  etat.noticeChargee = false;
  etat.noticeErreur = "";
  etat.venuesDeLaMemoire = {};
  etat.etudes = [];
  etat.etudeId = "";
  etat.etudesChargees = false;
  etat.enregistrement = "";
  etat.changeDepuis = null;
  projetEnBase = "";
  annulerLEnregistrement();
  fermerLaPhrase();
  // Les articles, eux, restent : le texte de l'arrêté ne dépend pas du projet.
}

export function renderIncendieHabitation(root, { force = false } = {}) {
  if (!root) return;

  const projet = clefDuProjetAffiche();
  const aChange = projet !== projetAffiche;
  if (aChange) { projetAffiche = projet; oublierLeProjet(); }

  if (!force && !aChange && root.dataset.incendieMonte === "true") return;
  root.dataset.incendieMonte = "true";

  dessiner(root);
  if (root.dataset.incendieBranche !== "true") {
    root.dataset.incendieBranche = "true";
    brancher(root);
    // Ce qui tenait à l'ouverture peut ne plus tenir après un redimensionnement,
    // et les traits partiraient alors du vide.
    window.addEventListener("resize", () => { if (root.isConnected) tracerLesLiens(root); }, { passive: true });
  }
  if (!etat.vue) void consulter(root);
  if (!etat.etudesChargees) void reprendreLesEtudes(root);
  registerProjectPrimaryScrollSource(root.closest("#projectStudioRouterScroll") || document.getElementById("projectStudioRouterScroll"));
}

async function consulter(root) {
  etat.enCours = true;
  etat.erreur = "";
  dessiner(root);
  try {
    etat.vue = await consulterIncendie(etat.reponses);
    // Le serveur dit s'il ouvrira le dépouillement : le bouton « tout
    // afficher » ne doit pas paraître puis disparaître au premier clic.
    etat.peutToutMontrer = etat.vue?.inspecteur === true;
    tenirLeParcours();
    // Les conclusions viennent d'être recalculées : c'est le moment de dire si
    // elles ne sont plus celles du dernier enregistrement.
    comparerALEnregistrement();
    planifierLEnregistrement(root);
  } catch (erreur) {
    etat.erreur = erreur instanceof Error ? erreur.message : String(erreur);
  } finally {
    etat.enCours = false;
    if (root?.isConnected) dessiner(root);
  }
}

/* ------------------------------------------------------------------ *
 * Les études, en base
 * ------------------------------------------------------------------ */

/**
 * Reprendre le travail là où il a été laissé.
 *
 * On ouvre la dernière étude touchée : c'est celle sur laquelle on travaillait,
 * et c'est ce qu'on vient reprendre. Aucune étude enregistrée ouvre un
 * questionnaire vierge, comme avant — la première réponse en créera une.
 */
async function reprendreLesEtudes(root) {
  etat.etudesChargees = true;
  projetEnBase = String(await resolveCurrentBackendProjectId().catch(() => "") || "");
  const projet = projetEnBase;
  if (!projet) { if (root?.isConnected) dessiner(root); return; }

  etat.etudes = await lireLesEtudes(projet);
  // Celle qu'on regardait, sinon la dernière touchée. Ouvrir une étude ne
  // l'écrit pas — sans quoi une simple consultation en ferait « la plus
  // récente » et rafraîchirait l'empreinte avant qu'on ait lu l'alerte —, donc
  // la date d'écriture ne dit pas ce qu'on regardait. Le navigateur, lui, le
  // sait, et c'est une préférence de poste, pas une donnée du projet.
  const derniere = etat.etudes.find((etude) => String(etude.id) === derniereOuverte());
  const reprise = derniere ?? etudeAOuvrir(etat.etudes);
  // Ne rien écraser : quelqu'un a pu commencer à répondre pendant la lecture,
  // et ses réponses valent mieux que celles d'hier.
  if (reprise && Object.keys(etat.reponses).length === 0) {
    etat.etudeId = String(reprise.id);
    retenirLOuverte(etat.etudeId);
    etat.reponses = { ...reprise.reponses };
    etat.parcours = [];
    etat.position = 0;
    etat.deplacementManuel = false;
    await consulter(root);
    return;
  }
  if (reprise && !etat.etudeId) { etat.etudeId = String(reprise.id); retenirLOuverte(etat.etudeId); }
  if (root?.isConnected) dessiner(root);
}

/**
 * Quelle étude était ouverte, sur ce poste.
 *
 * Une préférence d'écran : elle n'appartient pas au projet, elle n'a pas à
 * partir en base, et elle ne vaut que pour ce navigateur — deux personnes
 * n'ouvrent pas la même hypothèse.
 */
const CLE_DERNIERE = "mdall.incendie.etude";

function derniereOuverte() {
  try {
    return String(window.localStorage.getItem(`${CLE_DERNIERE}.${clefDuProjetAffiche()}`) ?? "");
  } catch {
    return "";
  }
}

function retenirLOuverte(id) {
  try {
    const cle = `${CLE_DERNIERE}.${clefDuProjetAffiche()}`;
    if (id) window.localStorage.setItem(cle, String(id));
    else window.localStorage.removeItem(cle);
  } catch {
    // Un navigateur qui refuse le stockage local ne doit pas empêcher de
    // travailler : on rouvrira la dernière écrite, ce qui est déjà une réponse.
  }
}

/** L'étude ouverte, telle qu'on l'a lue. */
function etudeCourante() {
  return etat.etudes.find((etude) => String(etude.id) === String(etat.etudeId)) ?? null;
}

/**
 * Ce que le référentiel dit aujourd'hui, comparé à ce qu'il disait.
 *
 * On ne garde pas les conclusions : on garde leur empreinte. On sait donc
 * qu'une chose a changé, pas laquelle — et le dire ainsi vaut mieux que de se
 * taire, ou que de prétendre en savoir plus.
 */
function comparerALEnregistrement() {
  const etude = etudeCourante();
  etat.changeDepuis = etude
    ? ceQuiAChange(etude, etat.vue?.modules ?? [], etat.vue?.version ?? "")
    : null;
}

let enregistrementDiffere = null;

function annulerLEnregistrement() {
  if (enregistrementDiffere) clearTimeout(enregistrementDiffere);
  enregistrementDiffere = null;
}

/**
 * Enregistrer, mais pas à chaque frappe.
 *
 * Une réponse relance le raisonnement, et l'on répond vite : trois cases
 * cochées de suite feraient trois écritures pour un seul état utile. Un délai
 * court suffit à n'en faire qu'une, et reste assez bref pour qu'une fermeture
 * d'onglet ne perde rien de ce qu'on vient de dire.
 */
function planifierLEnregistrement(root) {
  annulerLEnregistrement();
  if (!projetEnBase || !lesReponsesOntChange()) return;
  enregistrementDiffere = setTimeout(() => { void enregistrerMaintenant(root); }, 700);
}

/**
 * Y a-t-il quelque chose à écrire ?
 *
 * Rouvrir une étude la relit et la recalcule ; cela ne la modifie pas. Écrire
 * quand même aurait deux effets, tous deux mauvais : la date de dernière
 * touche remonterait à chaque simple consultation — l'étude « sur laquelle on
 * travaillait » ne serait plus la bonne —, et l'empreinte serait rafraîchie
 * avant que personne n'ait lu qu'une conclusion avait changé.
 */
function lesReponsesOntChange() {
  const etude = etudeCourante();
  if (!etude) return Object.keys(etat.reponses).length > 0;
  return memeJeu(etude.reponses, etat.reponses) === false;
}

/** Deux jeux de réponses identiques, quel que soit l'ordre des clés. */
function memeJeu(gauche = {}, droite = {}) {
  const a = Object.keys(gauche ?? {}).sort();
  const b = Object.keys(droite ?? {}).sort();
  if (a.length !== b.length) return false;
  return a.every((cle, rang) => cle === b[rang]
    && JSON.stringify(gauche[cle]) === JSON.stringify(droite[cle]));
}

async function enregistrerMaintenant(root, { force = false } = {}) {
  annulerLEnregistrement();
  const projet = projetEnBase;
  if (!projet) return;
  // Une étude vide n'a rien à conserver : la créer à l'ouverture de l'écran
  // remplirait la liste de lignes que personne n'a demandées.
  if (!etat.etudeId && Object.keys(etat.reponses).length === 0) return;
  if (!force && !lesReponsesOntChange()) return;

  etat.enregistrement = "Enregistrement…";
  if (root?.isConnected && etat.onglet === "questionnaire") rafraichirLaBarre(root);

  if (!etat.etudeId) {
    const neuve = await ouvrirUneEtude(projet, {
      titre: titreParDefaut(etat.etudes), rang: rangSuivant(etat.etudes)
    });
    if (!neuve) {
      etat.enregistrement = "Non enregistrée";
      if (root?.isConnected && etat.onglet === "questionnaire") rafraichirLaBarre(root);
      return;
    }
    etat.etudes = [...etat.etudes, neuve];
    etat.etudeId = String(neuve.id);
    retenirLOuverte(etat.etudeId);
  }

  const empreinte = empreinteDesConclusions(etat.vue?.modules ?? []);
  const referentiel = String(etat.vue?.version ?? "");
  const fait = await enregistrerLEtude(etat.etudeId, { reponses: etat.reponses, referentiel, empreinte });

  const etude = etudeCourante();
  if (etude && fait) {
    etude.reponses = { ...etat.reponses };
    etude.referentiel = referentiel;
    etude.empreinte = empreinte;
    etude.updated_at = new Date().toISOString();
  }
  // Ce qui vient d'être enregistré est, par construction, ce qui s'affiche :
  // l'alerte de changement n'a plus lieu d'être.
  if (fait) etat.changeDepuis = null;
  etat.enregistrement = fait ? "Enregistrée" : "Non enregistrée";
  if (root?.isConnected && etat.onglet === "questionnaire") rafraichirLaBarre(root);
}

/** La barre seule : redessiner l'écran entier ferait perdre le focus du champ. */
function rafraichirLaBarre(root) {
  const hote = root?.querySelector("[data-incendie-etudes]");
  if (hote) hote.innerHTML = dessinerLesEtudes(pourLaBarre());
}

function pourLaBarre() {
  return {
    etudes: etat.etudes, courante: etat.etudeId, enregistrement: etat.enregistrement,
    change: etat.changeDepuis, reliee: Boolean(projetEnBase || !etat.etudesChargees)
  };
}

/** Ouvrir une autre étude : ses réponses remplacent celles de l'écran. */
async function ouvrirLEtude(root, id) {
  if (String(id) === String(etat.etudeId)) return;
  // Ce qui est en cours part en base avant qu'on change de page : sans cela,
  // les dernières secondes de travail resteraient dans la page qu'on quitte.
  await enregistrerMaintenant(root);

  const etude = etat.etudes.find((candidate) => String(candidate.id) === String(id));
  if (!etude) return;
  etat.etudeId = String(etude.id);
  retenirLOuverte(etat.etudeId);
  etat.reponses = { ...etude.reponses };
  etat.parcours = [];
  etat.position = 0;
  etat.deplacementManuel = false;
  etat.enregistrement = "";
  await consulter(root);
}

/**
 * Ouvrir une hypothèse neuve, sans toucher à celle qu'on quitte.
 *
 * C'est le geste qui manquait : « et si c'était une 2e famille ? » se répondait
 * en écrasant l'étude en cours, donc en la perdant.
 */
async function ouvrirUneEtudeNeuve(root, { titre = "", reponses = null } = {}) {
  const projet = projetEnBase;
  if (!projet) return;
  await enregistrerMaintenant(root);

  const neuve = await ouvrirUneEtude(projet, {
    titre: titre || titreParDefaut(etat.etudes), rang: rangSuivant(etat.etudes)
  });
  if (!neuve) { etat.enregistrement = "Non enregistrée"; dessiner(root); return; }

  etat.etudes = [...etat.etudes, neuve];
  etat.etudeId = String(neuve.id);
  retenirLOuverte(etat.etudeId);
  etat.reponses = reponses ? { ...reponses } : {};
  etat.parcours = [];
  etat.position = 0;
  etat.deplacementManuel = false;
  etat.enregistrement = "";
  etat.changeDepuis = null;
  await consulter(root);
}


/* ------------------------------------------------------------------ *
 * Ce que le copilote remet
 * ------------------------------------------------------------------ */

/** La remise qui attend, s'il y en a une. Elle vit en mémoire vive, et nulle part ailleurs. */
function remiseEnAttente() {
  const remise = store.ui?.incendie?.remise;
  return remise?.reponses && Object.keys(remise.reponses).length ? remise : null;
}

/** Le libellé d'une question, quand on le connaît. Sa clé sinon — jamais rien. */
function libelleDeQuestion(cle) {
  return etat.questionsVues[cle]?.libelle || cle;
}

/** Une réponse, dite comme on la lit. */
function reponseLisible(valeur) {
  if (valeur === true) return "oui";
  if (valeur === false) return "non";
  return String(valeur ?? "");
}

/**
 * La remise, affichée avant d'être acceptée.
 *
 * Trois tas, trois sorts, et on les montre : ce que l'étude ignore s'ajoutera,
 * ce qu'elle dit déjà ne bougera pas, ce qu'elle dit **autrement** ne bougera
 * pas non plus mais se lit ici. Le copilote n'arbitre pas entre deux réponses
 * qui ont chacune un auteur ; il montre l'écart, et l'on répond à l'écran si
 * l'on change d'avis.
 */
function dessinerLaRemiseIncendie() {
  const remise = remiseEnAttente();
  if (!remise) return "";

  const plan = planDeLaRemiseIncendie(remise.reponses, etat.reponses);
  const combien = Object.keys(remise.reponses).length;

  return `
    <div class="incendie-remise">
      <p class="incendie-remise__titre">
        ${svgIcon("copilot", { width: 16, height: 16 })}
        ${combien} réponse${combien > 1 ? "s" : ""} réunie${combien > 1 ? "s" : ""} par le copilote
      </p>
      ${remise.conclusion
        ? `<p class="incendie-remise__conclusion">${escapeHtml(remise.conclusion)}</p>` : ""}
      <p class="incendie-remise__note">
        ${plan.combienNeuves > 0
          ? `<strong>${plan.combienNeuves}</strong> que cette étude ne portait pas s'ajouteront.`
          : "L'étude porte déjà tout ce que la discussion a réuni."}
        ${plan.identiques > 0 ? ` ${plan.identiques} disent déjà la même chose.` : ""}
      </p>
      ${plan.differentes.length ? `
        <p class="incendie-remise__note">
          ${plan.differentes.length} réponse${plan.differentes.length > 1 ? "s diffèrent" : " diffère"} de
          l'étude et ${plan.differentes.length > 1 ? "ne seront pas remplacées" : "ne sera pas remplacée"} —
          répondez à l'écran si vous changez d'avis :
        </p>
        <ul class="incendie-remise__ecarts">
          ${plan.differentes.map((ecart) => `
            <li>
              <span>${escapeHtml(libelleDeQuestion(ecart.cle))}</span>
              <span class="mono">étude ${escapeHtml(reponseLisible(ecart.dansLEtude))}</span>
              <span class="mono">discussion ${escapeHtml(reponseLisible(ecart.dansLaDiscussion))}</span>
            </li>`).join("")}
        </ul>` : ""}
      <div class="incendie-remise__actions">
        <button type="button" class="gh-btn gh-btn--primary" data-incendie-remise="completer"
          ${plan.rienAFaire ? "disabled" : ""}>Compléter cette étude</button>
        <button type="button" class="gh-btn" data-incendie-remise="neuve">Ouvrir une étude neuve</button>
        <button type="button" class="gh-btn" data-incendie-remise="ecarter">Écarter</button>
      </div>
    </div>
  `;
}

/** Oublier la remise : elle n'a jamais été qu'en mémoire vive. */
function ecarterLaRemise(root) {
  if (store.ui?.incendie) store.ui.incendie.remise = null;
  dessiner(root);
}

/**
 * Compléter l'étude ouverte avec ce que la discussion a réuni.
 *
 * Ce que l'étude dit déjà n'est pas touché — « ce qui a été décidé se
 * conserve ». Seul s'ajoute ce qu'elle ignorait.
 */
async function completerAvecLaRemise(root) {
  const remise = remiseEnAttente();
  if (!remise) return;

  const plan = planDeLaRemiseIncendie(remise.reponses, etat.reponses);
  if (plan.rienAFaire) { ecarterLaRemise(root); return; }

  etat.reponses = etudeCompletee(etat.reponses, plan);
  etat.deplacementManuel = false;
  if (store.ui?.incendie) store.ui.incendie.remise = null;
  await consulter(root);
}

/**
 * Ouvrir une étude neuve avec tout ce que la discussion a réuni.
 *
 * C'est ce qu'on veut quand la conversation explorait une autre hypothèse :
 * « et si c'était une 2e famille ? » n'est pas une correction de l'étude en
 * cours, c'est une seconde étude.
 */
async function etudeNeuveDepuisLaRemise(root) {
  const remise = remiseEnAttente();
  if (!remise) return;

  if (store.ui?.incendie) store.ui.incendie.remise = null;
  await ouvrirUneEtudeNeuve(root, {
    titre: nomDeLEtudeVenueDuCopilote(), reponses: remise.reponses
  });
}

/** Renommer : le nom est ce par quoi on reconnaît une hypothèse trois semaines après. */
async function renommerLEtude(root) {
  const etude = etudeCourante();
  if (!etude) return;
  const propose = window.prompt("Nom de cette étude", etude.titre || "");
  if (propose === null) return;

  etude.titre = String(propose).trim();
  dessiner(root);
  const fait = await enregistrerLEtude(etat.etudeId, { titre: etude.titre });
  etat.enregistrement = fait ? "Enregistrée" : "Non enregistrée";
  if (root?.isConnected && etat.onglet === "questionnaire") rafraichirLaBarre(root);
}

/** Supprimer : ce qui est effacé ne se retrouve pas, donc on demande. */
async function supprimerLEtudeCourante(root) {
  const etude = etudeCourante();
  if (!etude) return;
  if (!window.confirm(`Supprimer « ${etude.titre || "cette étude"} » et ses réponses ?`)) return;

  annulerLEnregistrement();
  const fait = await supprimerLEtude(etat.etudeId);
  if (!fait) { etat.enregistrement = "Non supprimée"; dessiner(root); return; }

  etat.etudes = etat.etudes.filter((candidate) => String(candidate.id) !== String(etat.etudeId));
  const reprise = etudeAOuvrir(etat.etudes);
  etat.etudeId = reprise ? String(reprise.id) : "";
  retenirLOuverte(etat.etudeId);
  etat.reponses = reprise ? { ...reprise.reponses } : {};
  etat.parcours = [];
  etat.position = 0;
  etat.deplacementManuel = false;
  etat.enregistrement = "";
  etat.changeDepuis = null;
  await consulter(root);
}

/**
 * Le parcours, tenu à jour après chaque consultation.
 *
 * On y ajoute les questions de la vague nouvelle, on en retire celles qui ne
 * sont plus demandées et auxquelles personne n'a répondu — une question qui a
 * cessé d'avoir un sens ne doit pas rester sur le chemin —, et l'on garde
 * toujours celles qui portent une réponse : c'est par elles qu'on revient en
 * arrière.
 */
function tenirLeParcours() {
  // Ce à quoi il a déjà été répondu revient décrit du serveur : une étude
  // reprise en base porte ses réponses et pas leur libellé, et une liste de
  // clés ne se relit pas.
  for (const question of etat.vue?.questionsRepondues ?? []) etat.questionsVues[question.cle] = question;

  const demandees = (etat.vue?.questions ?? []).map((q) => q.cle);
  const repondues = Object.keys(etat.reponses);
  etat.parcours = etat.parcours.filter((cle) => repondues.includes(cle) || demandees.includes(cle));
  // Le chemin se reconstitue : sans lui, on lirait les conclusions d'une étude
  // sans pouvoir revenir sur une seule des réponses qui les ont produites.
  const retrouvees = repondues.filter((cle) => !etat.parcours.includes(cle) && etat.questionsVues[cle]);
  if (retrouvees.length) etat.parcours = [...retrouvees, ...etat.parcours];
  for (const cle of demandees) if (!etat.parcours.includes(cle)) etat.parcours.push(cle);
  if (etat.deplacementManuel) {
    etat.position = Math.min(Math.max(0, etat.position), Math.max(0, etat.parcours.length - 1));
    return;
  }
  // Après une réponse, on se pose sur la première question qui attend encore.
  const premiereEnAttente = etat.parcours.findIndex((cle) => !(cle in etat.reponses));
  etat.position = premiereEnAttente === -1 ? Math.max(0, etat.parcours.length - 1) : premiereEnAttente;
}

/** La question qu'on regarde, avec tout ce que le serveur en a dit. */
function questionCourante() {
  const cle = etat.parcours[etat.position];
  if (!cle) return null;
  const vive = (etat.vue?.questions ?? []).find((q) => q.cle === cle);
  // Une question déjà répondue ne figure plus dans la vague : on garde la
  // dernière description reçue pour pouvoir y revenir sans la reperdre.
  if (vive) { etat.questionsVues[cle] = vive; return vive; }
  return etat.questionsVues[cle] ?? null;
}

function brancher(root) {
  // Une remise arrive après que le panneau a été dessiné : sans cette écoute,
  // elle n'apparaîtrait qu'au rechargement de la page — c'est-à-dire jamais.
  window.addEventListener(REMISE_INCENDIE_ANNONCEE, () => {
    if (root.isConnected) {
      // On arrive sur le questionnaire : c'est là que la remise se lit, et
      // c'est là qu'on répond.
      etat.onglet = "questionnaire";
      dessiner(root);
    }
  });

  // Le champ rédigé de la notice — titre, cases, éditeur — est un composant :
  // il ne connaît ni la notice ni la base, il signale des gestes.
  brancherChampRedige(root, {
    onOption: (cle, libelle) => { void choisir(root, cle, libelle); },
    onTexte: (cle, texte) => { void reprendreLaPhrase(root, cle, texte); },
    onOnglet: (cle, apercu) => { etat.noticeApercu = apercu ? cle : null; dessiner(root); },
    onRendreLaMain: (cle) => { void reprendreLaPhrase(root, cle, ""); }
  });

  // Une phrase se prend aussi au clavier : elle porte `role="button"`, et une
  // chose qui s'annonce comme un bouton doit répondre à la barre d'espace.
  root.addEventListener("keydown", (evenement) => {
    if (evenement.key !== "Enter" && evenement.key !== " ") return;
    const phrase = evenement.target.closest?.("[data-notice-paragraphe]");
    if (!phrase) return;
    evenement.preventDefault();
    ouvrirLaPhrase(root, phrase.dataset.noticeParagraphe);
  });

  // Une réponse relance le raisonnement : c'est lui qui décide de la question
  // suivante, et il n'y a pas de bouton « valider » parce qu'il n'y a pas de page.
  root.addEventListener("change", (evenement) => {
    const entete = evenement.target.closest("[data-notice-entete]");
    if (entete) {
      etat.entete = { ...etat.entete, [entete.dataset.noticeEntete]: entete.value.trim() };
      void rediger(root, { enregistrer: true });
      return;
    }

    const champ = evenement.target.closest("[data-incendie-question]");
    if (!champ) return;
    const cle = champ.dataset.incendieQuestion;
    const brut = champ.value;
    if (brut === "" || brut === null) delete etat.reponses[cle];
    else etat.reponses[cle] = brut === "oui" ? true : brut === "non" ? false : brut;
    etat.deplacementManuel = false;
    void consulter(root);
  });

  // Les cases à cocher répondent au clic, pas au « change » d'un champ quitté :
  // une réponse cochée doit faire avancer tout de suite, sans second geste.
  root.addEventListener("click", (evenement) => {
    const choix = evenement.target.closest("[data-incendie-choix]");
    if (!choix) return;
    const cle = choix.dataset.incendieChoix;
    const brut = choix.dataset.incendieValeur;
    etat.reponses[cle] = brut === "oui" ? true : brut === "non" ? false : brut;
    etat.deplacementManuel = false;
    void consulter(root);
  });

  root.addEventListener("click", (evenement) => {
    const onglet = evenement.target.closest("[data-incendie-onglet]");
    if (onglet) {
      etat.onglet = onglet.dataset.incendieOnglet;
      dessiner(root);
      if (etat.onglet === "notice") void rediger(root);
      return;
    }
    const remise = evenement.target.closest("[data-incendie-remise]");
    if (remise) {
      const geste = remise.dataset.incendieRemise;
      if (geste === "completer") void completerAvecLaRemise(root);
      else if (geste === "neuve") void etudeNeuveDepuisLaRemise(root);
      else ecarterLaRemise(root);
      return;
    }

    const etude = evenement.target.closest("[data-incendie-etude]");
    if (etude) { void ouvrirLEtude(root, etude.dataset.incendieEtude); return; }
    if (evenement.target.closest("[data-incendie-etude-neuve]")) { void ouvrirUneEtudeNeuve(root); return; }
    if (evenement.target.closest("[data-incendie-etude-renommer]")) { void renommerLEtude(root); return; }
    if (evenement.target.closest("[data-incendie-etude-supprimer]")) { void supprimerLEtudeCourante(root); return; }
    // Prendre acte d'un changement du référentiel : l'alerte a été lue, et
    // l'étude retient désormais ce que le référentiel dit aujourd'hui. Sans ce
    // geste, l'avertissement resterait tant qu'on ne répond pas à une question
    // de plus — c'est-à-dire souvent pour toujours.
    if (evenement.target.closest("[data-incendie-etude-vu]")) {
      void enregistrerMaintenant(root, { force: true }).then(() => dessiner(root));
      return;
    }

    const oublier = evenement.target.closest("[data-incendie-oublier]");
    if (oublier) {
      delete etat.reponses[oublier.dataset.incendieOublier];
      etat.deplacementManuel = false;
      void consulter(root);
      return;
    }
    const pas = evenement.target.closest("[data-incendie-pas]");
    if (pas) {
      etat.position = Math.min(Math.max(0, etat.position + Number(pas.dataset.incendiePas)), etat.parcours.length - 1);
      etat.deplacementManuel = true;
      dessiner(root);
      return;
    }
    const aller = evenement.target.closest("[data-incendie-aller]");
    if (aller) {
      const rang = etat.parcours.indexOf(aller.dataset.incendieAller);
      if (rang >= 0) { etat.position = rang; etat.deplacementManuel = true; etat.onglet = "questionnaire"; dessiner(root); }
      return;
    }
    // Ouvrir l'arrêté sous la question : le texte entier, avec son commentaire
    // et son schéma. Il n'arrive pas avec la vague — on va le chercher, et on
    // le garde.
    const article = evenement.target.closest("[data-incendie-article]");
    if (article) {
      etat.articleOuvert = !etat.articleOuvert;
      dessiner(root);
      return;
    }
    const phrase = evenement.target.closest("[data-notice-paragraphe]");
    if (phrase) { ouvrirLaPhrase(root, phrase.dataset.noticeParagraphe); return; }
    if (evenement.target.closest("[data-notice-copier]")) { void copierLaNotice(root); return; }

    const vueBatiment = evenement.target.closest("[data-incendie-vue-batiment]");
    if (vueBatiment) {
      etat.vueDuBatiment = vueBatiment.dataset.incendieVueBatiment;
      dessiner(root);
      return;
    }
    const inspecter = evenement.target.closest("[data-incendie-inspecter]");
    if (inspecter) { void inspecter_(root, inspecter.dataset.incendieInspecter); return; }
    const versModule = evenement.target.closest("[data-incendie-aller-module]");
    if (versModule?.dataset.incendieAllerModule) {
      designer(root, versModule.dataset.incendieAllerModule);
      void inspecter_(root, versModule.dataset.incendieAllerModule);
      return;
    }
    if (evenement.target.closest('[data-action-id="incendieRecommencer"]')) {
      etat.reponses = {};
      etat.survole = null;
      etat.parcours = [];
      etat.position = 0;
      etat.deplacementManuel = false;
      void consulter(root);
    }
  });

  // Un plein écran dont on ne sort qu'en retrouvant un bouton parmi cinquante
  // boîtes est un piège : la touche d'échappement en sort toujours.
  document.addEventListener("keydown", (evenement) => {
    if (evenement.key !== "Escape" || !etat.pleinEcran || !root.isConnected) return;
    etat.pleinEcran = false;
    figerLeDocument();
    dessiner(root);
  });

  // Le graphe a ses propres gestes, et ils vivent dans le composant : survoler
  // pour parcourir, cliquer pour s'arrêter dessus et ouvrir son détail.
  brancherGrapheLiaisons(root, {
    onSurvol: (id) => designer(root, id),
    onDesigner: (id) => {
      designer(root, id);
      void inspecter_(root, id);
      // Désigner une carte, c'est demander à voir son raisonnement : les cent
      // vingt autres n'y aident pas, elles éloignent celles qui comptent.
      void changerLAffichage(root, { chemin: id });
    },
    /* eslint-disable-next-line no-unused-vars */
    onZoom: (sens) => {
      const delta = sens === "in" ? 0.15 : -0.15;
      etat.zoom = Math.min(2, Math.max(0.4, Math.round((etat.zoom + delta) * 100) / 100));
      appliquerZoomAuGraphe(root, etat.zoom);
      tracerLesLiens(root);
    },
    onPleinEcran: () => { etat.pleinEcran = !etat.pleinEcran; figerLeDocument(); dessiner(root); },
    onToutMontrer: () => void changerLAffichage(root, { montrerTout: !etat.montrerTout }),
    onSortirDuChemin: () => { etat.survole = null; etat.inspection = null; void changerLAffichage(root, { chemin: null }); }
  });

  // Les résultats désignent aussi : une conclusion qu'on lit dans l'onglet
  // voisin doit pouvoir s'ouvrir sans repasser par le schéma.
  root.addEventListener("focusin", (evenement) => {
    const noeud = evenement.target.closest?.("[data-graphe-noeud]");
    if (noeud) designer(root, noeud.dataset.grapheNoeud);
  });
}

/**
 * L'article demandé, puis affiché.
 *
 * On marque l'attente avant de partir : sans cela, deux ouvertures rapprochées
 * lanceraient deux appels pour le même texte.
 */
async function ouvrirLArticle(root, numero) {
  const cle = String(numero ?? "");
  if (!cle || etat.articles[cle]) return;
  etat.articles[cle] = "chargement";
  try {
    const rendu = await lireArticleIncendie(cle);
    etat.articles[cle] = rendu?.ok ? rendu : null;
  } catch {
    etat.articles[cle] = null;
  }
  if (root?.isConnected && etat.articleOuvert && etat.onglet === "questionnaire") dessiner(root);
}

/**
 * Le dépouillement d'un module, demandé au serveur.
 *
 * Le refus est une réponse comme une autre : la porte est fermée par défaut, et
 * l'écran le dit sans faire croire à une panne.
 */
async function inspecter_(root, id) {
  if (!id) return;
  etat.inspection = { id, etat: "chargement" };
  rafraichirLeDetail(root);
  try {
    const rendu = await inspecterIncendie(id, etat.reponses);
    if (rendu?.ok) etat.inspection = { id, etat: "ok", donnees: rendu };
    else etat.inspection = { id, etat: "erreur", raison: rendu?.raison ?? "Le référentiel n'a pas répondu." };
  } catch (erreur) {
    etat.inspection = { id, etat: "erreur", raison: erreur instanceof Error ? erreur.message : String(erreur) };
  }
  rafraichirLeDetail(root);
}

/**
 * La notice, rédigée puis affichée.
 *
 * Les phrases se refont à chaque fois : ce qui est dérivé se recalcule. Ce qui
 * se conserve — la matière, le procédé, l'en-tête — voyage dans `complements`
 * et revient de la base à la première ouverture.
 */
async function rediger(root, { enregistrer = false } = {}) {
  if (!etat.noticeChargee) {
    etat.noticeChargee = true;
    const projet = clefDuProjetAffiche();
    const gardee = await lireLaNotice(projet);
    if (gardee) {
      etat.complements = gardee.complements;
      // L'en-tête part de ce que le projet sait déjà : redemander une adresse
      // que la mémoire porte, c'est inviter à la retaper de mémoire, donc faux.
      etat.entete = { ...depuisLaMemoire(), ...gardee.entete };
    }
  }

  try {
    etat.notice = await ecrireLaNoticeIncendie(etat.reponses, etat.complements, etat.entete);
    etat.noticeErreur = "";
    // La bibliothèque se relit avec la notice : les rubriques dépendent des
    // phrases écrites, et les phrases dépendent des réponses.
    etat.bibliotheque = await lireLesChoix(etat.notice.rubriques ?? [], departementDe(etat.entete.adresse));
  } catch (erreur) {
    etat.noticeErreur = erreur instanceof Error ? erreur.message : String(erreur);
  }

  if (enregistrer) await enregistrerLaNotice(clefDuProjetAffiche(), { complements: etat.complements, entete: etat.entete });
  if (root?.isConnected && etat.onglet === "notice") dessiner(root);
}

/**
 * Ce que la mémoire du projet sait de l'en-tête.
 *
 * Le nom et l'adresse sont là ; les intervenants, pas encore. On prend ce qui
 * existe et on laisse le reste vide plutôt que d'inventer un libellé qui aurait
 * l'air d'une réponse.
 */
function depuisLaMemoire() {
  const projet = store.currentProject ?? {};
  etat.venuesDeLaMemoire = {};
  const trouve = {};
  const poser = (cle, valeur) => {
    const texte = String(valeur ?? "").trim();
    if (!texte) return;
    trouve[cle] = texte;
    etat.venuesDeLaMemoire[cle] = true;
  };
  poser("denomination", projet.name || projet.title);
  poser("adresse", projet.address);
  return trouve;
}

/**
 * Retenir une proposition — et la retenir aussi dans la bibliothèque.
 *
 * Ce qui en sort est pesé : le libellé, et le département. Ni le projet, ni le
 * compte. Un second clic sur la même case l'enlève : une case qu'on ne peut pas
 * décocher est un piège.
 */
async function choisir(root, cle, libelle) {
  const paragraphe = paragraphesDe(etat.notice).find((p) => p.cle === cle);
  if (!paragraphe?.champ) return;
  const champ = paragraphe.champ;
  const actuelle = etat.complements[cle]?.[champ.cle] ?? "";

  let valeur;
  if (champ.multiple) {
    const retenues = String(actuelle).split(" et ").map((v) => v.trim()).filter(Boolean);
    valeur = retenues.includes(libelle)
      ? retenues.filter((v) => v !== libelle).join(" et ")
      : [...retenues, libelle].join(" et ");
  } else {
    valeur = actuelle === libelle ? "" : libelle;
  }

  etat.complements[cle] = { ...(etat.complements[cle] ?? {}), [champ.cle]: valeur };
  if (valeur) await retenirLeChoix(champ.rubrique, libelle, departementDe(etat.entete.adresse));
  await rediger(root, { enregistrer: true });
}

/* ------------------------------------------------------------------ *
 * La phrase qu'on reprend
 * ------------------------------------------------------------------ */

/** Le bas de l'en-tête flottant : au-dessus, on ne lit plus. */
function hautDeLApplication() {
  if (typeof document === "undefined") return 0;
  const declare = getComputedStyle(document.documentElement).getPropertyValue("--app-top");
  return Number.parseFloat(declare) || 0;
}

/** Ce qui referme l'éditeur quand il sort de l'écran, à oublier ensuite. */
let surveillanceDeLaPhrase = null;
/** Le bandeau des titres collés, à débrancher quand on quitte l'onglet. */
let titresDeLaNotice = null;

/**
 * Ouvrir — ou refermer — l'éditeur d'une phrase.
 *
 * Une seule phrase à la fois : deux éditeurs ouverts dans un document long, ce
 * sont deux endroits où le curseur peut être, et l'on tape dans le mauvais.
 */
function ouvrirLaPhrase(root, cle) {
  const memePhrase = etat.noticeOuverte === cle;
  fermerLaPhrase();
  etat.noticeOuverte = memePhrase ? null : cle;
  dessiner(root);
}

/** Refermer, et cesser de surveiller. */
function fermerLaPhrase() {
  surveillanceDeLaPhrase?.();
  surveillanceDeLaPhrase = null;
  etat.noticeOuverte = null;
  etat.noticeApercu = null;
}

/**
 * Le texte repris, tel qu'il partira en mairie.
 *
 * Ce qui est écrit à la main l'emporte sur ce que la trame propose, et se garde
 * avec les compléments : le serveur relit `texte` et rend la phrase telle
 * quelle. Une reprise vide rend la main à la phrase proposée — c'est le geste
 * inverse, et il doit exister, sinon on ne peut plus revenir.
 */
async function reprendreLaPhrase(root, cle, texte) {
  const paragraphe = paragraphesDe(etat.notice).find((p) => p.cle === cle);
  if (!paragraphe) return;
  const propre = String(texte ?? "").trim();
  const complement = { ...(etat.complements[cle] ?? {}) };
  // Une reprise identique à la proposition n'est pas une reprise : la garder
  // figerait la phrase, et elle cesserait de suivre les réponses.
  if (!propre || propre === String(paragraphe.propose ?? "").trim()) delete complement.texte;
  else complement.texte = propre;
  etat.complements[cle] = complement;
  await rediger(root, { enregistrer: true });
}

/**
 * Ce qui vit après le tracé de la notice : les titres collés, et la fermeture.
 *
 * Les deux sont des composants qui ne savent rien du feu — ils serviront au
 * CCTP, aux notes sur un plan — et l'écran ne fait ici que les brancher sur ce
 * qu'il vient de dessiner.
 */
function apresLaNotice(root) {
  titresDeLaNotice?.arreter();
  titresDeLaNotice = null;
  surveillanceDeLaPhrase?.();
  surveillanceDeLaPhrase = null;

  const document_ = root.querySelector("[data-notice-document]");
  if (!document_) return;
  titresDeLaNotice = collerLesTitres(document_, {
    niveau1: ".notice-titre",
    niveau2: ".notice-sous-titre",
    // L'en-tête de l'application flotte au-dessus de la page : ce qui passe
    // dessous n'est plus lu, même si la fenêtre dit le contraire. Le composant
    // n'a pas à connaître cette hauteur — on la lui donne.
    hautDeLecture: () => hautDeLApplication(),
    // La ligne de lecture passe sous le bandeau lui-même : sinon le titre
    // changerait au moment où il disparaît derrière, c'est-à-dire trop tard.
    marge: 44
  });

  if (!etat.noticeOuverte) return;
  const editeur = root.querySelector("[data-champ-editeur]");
  if (!editeur) return;
  // Sans cadre nommé : l'observateur tient déjà compte des panneaux qui
  // rognent, et lui désigner un conteneur reviendrait à écrire ici la mise en
  // page de l'application.
  surveillanceDeLaPhrase = fermerQuandSorti(editeur, {
    onSortie: () => {
      if (!root.isConnected || etat.onglet !== "notice") return;
      fermerLaPhrase();
      dessiner(root);
    }
  });
}

/**
 * La notice dans le presse-papier, en texte.
 *
 * Ce qui part dans Word doit se relire tel quel : des titres numérotés et des
 * paragraphes. Le markdown n'y survivrait pas au collage.
 */
async function copierLaNotice(root) {
  const texte = etat.notice?.texte;
  if (!texte) return;
  try {
    // Le HTML d'abord, pour que Word garde les titres et le gras ; le texte à
    // côté, pour tout ce qui ne sait pas lire du HTML. Un navigateur sans
    // `ClipboardItem` retombe simplement sur le texte.
    if (typeof ClipboardItem === "function" && navigator.clipboard?.write) {
      await navigator.clipboard.write([new ClipboardItem({
        "text/html": new Blob([noticeEnHtml(etat.notice)], { type: "text/html" }),
        "text/plain": new Blob([texte], { type: "text/plain" })
      })]);
    } else {
      await navigator.clipboard.writeText(texte);
    }
    etat.noticeCopiee = true;
  } catch {
    try {
      await navigator.clipboard.writeText(texte);
      etat.noticeCopiee = true;
    } catch {
      etat.noticeCopiee = false;
    }
  }
  const bouton = root.querySelector("[data-notice-copier]");
  if (bouton) {
    bouton.classList.add("est-copiee");
    bouton.setAttribute("aria-live", "polite");
    const ancien = bouton.textContent;
    bouton.textContent = etat.noticeCopiee ? " Copiée" : " La copie a échoué";
    setTimeout(() => {
      if (!bouton.isConnected) return;
      bouton.classList.remove("est-copiee");
      bouton.textContent = ancien;
    }, 1800);
  }
}

/**
 * Changer ce que le schéma montre — et le montrer, plutôt que de le remplacer.
 *
 * Un rafraîchissement donnerait un autre schéma : on ne saurait pas ce qui a
 * disparu ni où est passé ce qu'on regardait, et il faudrait relire. Le même
 * changement joué — les cartes écartées s'effacent, les autres remontent
 * combler les trous — se comprend sans relire, parce qu'on a suivi le
 * mouvement.
 *
 * Le procédé est dans `transition-flip.js`, et il ne sait rien du feu : c'est
 * le même geste qui montrera, dans la Mémoire, une affirmation qui s'écarte et
 * les autres qui se resserrent.
 */
async function changerLAffichage(root, changements) {
  if (etat.onglet !== "schema" || !etat.vue) {
    Object.assign(etat, changements);
    return;
  }
  const scene = root.querySelector("[data-graphe-bloc]");
  if (!scene) { Object.assign(etat, changements); dessiner(root); return; }

  const suivant = { ...etat, ...changements };
  const parId = new Map(etat.vue.modules.map((m) => [m.id, m]));
  const graphe = grapheAffichable(etat.vue, parId);
  const restantes = noeudsVisibles(graphe, { montrerTout: suivant.montrerTout, chemin: suivant.chemin });

  marquerLesPartants(scene, "[data-graphe-noeud]", "data-graphe-noeud", restantes);
  // On mesure depuis `root`, pas depuis la scène : le redessin remplace la
  // scène, et un élément détaché ne se mesure plus. `root`, lui, survit.
  await reagencer(root, {
    selecteur: "[data-graphe-noeud]",
    attribut: "data-graphe-noeud",
    appliquer: () => { Object.assign(etat, changements); dessiner(root); },
    apres: () => tracerLesLiens(root)
  });
}

/** Le panneau de détail seul : redessiner le schéma entier perdrait le zoom. */
function rafraichirLeDetail(root) {
  const hote = root?.querySelector("[data-graphe-detail]");
  if (hote) hote.innerHTML = dessinerDetail();
}

/**
 * Le plein écran fige la page derrière lui.
 *
 * Deux ascenseurs verticaux superposés se disputent la molette : on croit
 * faire défiler le schéma et c'est la page qui bouge, ou l'inverse. Le plein
 * écran couvre la page — elle n'a donc plus à défiler.
 */
function figerLeDocument() {
  if (typeof document === "undefined") return;
  // Sur les deux : selon la page, c'est `html` ou `body` qui porte le
  // défilement, et n'en figer qu'un laissait la seconde barre de défilement.
  document.body.classList.toggle("est-fige-par-le-graphe", etat.pleinEcran);
  document.documentElement.classList.toggle("est-fige-par-le-graphe", etat.pleinEcran);
}

function designer(root, id) {
  if (etat.survole === id) return;
  etat.survole = id;
  rafraichirLeDetail(root);
  // Le détail public — la question, les liaisons, l'article — s'ouvre dès qu'on
  // désigne. Le demander sur un second geste faisait croire, quand on cliquait,
  // qu'il ne se passait rien.
  void inspecter_(root, id);
  for (const noeud of root.querySelectorAll("[data-graphe-noeud]")) {
    noeud.classList.toggle("est-designe", noeud.dataset.grapheNoeud === id);
  }
  // Sur trente-cinq liaisons, mettre en avant celles du module désigné est ce
  // qui permet de suivre la sienne.
  tracerLesLiens(root);
}

/* ------------------------------------------------------------------ *
 * Le tracé
 * ------------------------------------------------------------------ */

function dessiner(root) {
  const vue = etat.vue;
  root.innerHTML = `
    <section class="settings-section is-active" data-incendie-tool-card="habitation">
      <div class="settings-card settings-card--param studio-tool-card">
        <div class="settings-card__head studio-tool-card__head">
          <div>
            <span class="settings-card__head-title">
              <h4>Incendie — Habitation</h4>
              <div class="studio-tool-card__actions">
                ${renderGhActionButton({ id: "incendieRecommencer", label: "Recommencer", tone: "default", size: "md", disabled: etat.enCours, mainAction: "" })}
              </div>
            </span>
          </div>
        </div>
        <div class="settings-card__body studio-tool-card__body">
          <p class="gh-text-muted">
            Arrêté du 31 janvier 1986 modifié, complété des commentaires SOCOTEC.
            Répondez à ce qui vous est demandé : le raisonnement décide de la question
            suivante, et n'en pose aucune qui ne change rien. Le raisonnement est fait
            par le serveur, jamais par ce navigateur.
          </p>

          ${etat.erreur ? `<p class="fondations-erreur">${escapeHtml(etat.erreur)}</p>` : ""}
          ${vue?.avancement ? dessinerAvancement(vue.avancement) : ""}

          <div class="incendie-onglets" role="tablist">
            ${[["questionnaire", "Questionnaire"], ["resultats", "Résultats"], ["schema", "Schéma décisionnel"],
               ["notice", "Notice de sécurité"], ["portee", "Portée"]]
              .map(([cle, libelle]) => `
                <button type="button" role="tab" class="incendie-onglet${etat.onglet === cle ? " est-actif" : ""}"
                        aria-selected="${etat.onglet === cle}" data-incendie-onglet="${cle}">${escapeHtml(libelle)}</button>
              `).join("")}
          </div>

          ${!vue ? `<p class="gh-text-muted">${etat.enCours ? "Lecture du référentiel…" : "Le référentiel n'a pas répondu."}</p>` : ""}
          ${vue && etat.onglet === "questionnaire"
            ? `${dessinerLaRemiseIncendie()}<div data-incendie-etudes>${
                dessinerLesEtudes(pourLaBarre())}</div>${dessinerQuestionnaire(vue)}`
            : ""}
          ${vue && etat.onglet === "resultats" ? dessinerResultats(vue) : ""}
          ${vue && etat.onglet === "schema" ? dessinerSchema(vue) : ""}
          ${vue && etat.onglet === "notice" ? dessinerLaNotice({
            notice: etat.notice, complements: etat.complements, bibliotheque: etat.bibliotheque,
            departement: departementDe(etat.entete.adresse), venuesDeLaMemoire: etat.venuesDeLaMemoire,
            ouvert: etat.noticeOuverte, apercu: etat.noticeApercu,
            enCours: etat.enCours, erreur: etat.noticeErreur }) : ""}
          ${vue && etat.onglet === "portee" ? dessinerPortee(vue) : ""}
        </div>
      </div>
    </section>
  `;

  // Les traits du schéma ne peuvent se poser qu'une fois les boîtes mesurées :
  // leur départ dépend de la hauteur réelle de chacune, donc du rendu.
  if (etat.onglet === "schema") requestAnimationFrame(() => { if (root.isConnected) tracerLesLiens(root); });

  // Les titres collés se mesurent, eux aussi, sur ce qui est déjà en page.
  if (etat.onglet === "notice") requestAnimationFrame(() => { if (root.isConnected) apresLaNotice(root); });
  else { titresDeLaNotice?.arreter(); titresDeLaNotice = null; }

  // Le panneau de l'arrêté reste ouvert d'une question à l'autre — c'est ce
  // qu'on veut quand on travaille avec le texte sous les yeux. Encore faut-il
  // qu'il montre l'article de la question **courante** : il gardait celui de la
  // précédente, ou affichait « article non porté » pour un article qu'on
  // n'était simplement pas encore allé chercher.
  if (etat.articleOuvert && etat.onglet === "questionnaire") {
    for (const numero of articlesDeLaQuestion(questionCourante())) void ouvrirLArticle(root, numero);
  }
}

function dessinerAvancement(a) {
  const part = a.modules === 0 ? 0 : Math.round(a.conclus / a.modules * 100);
  return `
    <div class="incendie-avancement">
      <div class="incendie-avancement__barre"><span style="width:${part}%"></span></div>
      <p>
        <strong>${a.conclus}</strong> module${a.conclus > 1 ? "s" : ""} conclu${a.conclus > 1 ? "s" : ""}
        sur ${a.modules} — <strong>${a.questionsPosees}</strong> réponse${a.questionsPosees > 1 ? "s" : ""}
        donnée${a.questionsPosees > 1 ? "s" : ""} sur ${a.questionsSourceEnTout} questions possibles.
      </p>
    </div>
  `;
}

/**
 * La vague de questions en cours.
 *
 * Chacune dit à quel module elle sert et de quel article elle sort : une
 * question dont on ne voit pas à quoi elle mène se répond au hasard.
 */
/**
 * Le questionnaire : une question à la fois, et le chemin pour y revenir.
 *
 * ## Pourquoi une seule
 *
 * Une vague de onze questions à l'écran se lit comme un formulaire, et un
 * formulaire se remplit en diagonale. Une question seule, avec ses réponses en
 * ligne et ce à quoi elle sert, se lit vraiment — et c'est là tout l'intérêt :
 * chacune de ces réponses décide d'un article.
 *
 * ## Pourquoi des cases plutôt qu'une liste déroulante
 *
 * Une liste déroulante cache ses réponses derrière un clic, et l'on ne sait
 * pas, avant de l'ouvrir, si le choix est binaire ou s'il compte cinq entrées.
 * En ligne, on voit d'un coup ce qui est en jeu, et l'on répond d'un geste.
 *
 * ## Pourquoi « ‹ » et « › »
 *
 * Parce qu'on se trompe. Sans retour en arrière, une réponse donnée trop vite
 * se paie par un « Recommencer », c'est-à-dire par tout reprendre — et personne
 * ne recommence : on garde la réponse fausse.
 */
function dessinerQuestionnaire(vue) {
  const question = questionCourante();
  const repondues = etat.parcours.filter((cle) => cle in etat.reponses);

  if (!question) {
    return `
      <p class="incendie-fini">
        ${svgIcon("check-circle-fill", { className: "octicon" })}
        Plus rien à demander : le référentiel a conclu tout ce qu'il pouvait conclure.
        Les résultats sont dans l'onglet voisin.
      </p>
      ${dessinerBatiment(vue)}
      ${dessinerRepondues(repondues)}
    `;
  }

  const reste = etat.parcours.filter((cle) => !(cle in etat.reponses)).length;

  return `
    <div class="incendie-parcours">
      <button type="button" class="incendie-pas" data-incendie-pas="-1"
              ${etat.position === 0 ? "disabled" : ""} aria-label="Question précédente" title="Question précédente">‹</button>
      <span class="incendie-parcours__rang">
        Question ${etat.position + 1} / ${etat.parcours.length}
        ${reste > 0 ? `<em>— ${reste} sans réponse</em>` : `<em>— toutes répondues</em>`}
      </span>
      <button type="button" class="incendie-pas" data-incendie-pas="1"
              ${etat.position >= etat.parcours.length - 1 ? "disabled" : ""} aria-label="Question suivante" title="Question suivante">›</button>
    </div>

    <div class="incendie-atelier">
      ${dessinerQuestion(question)}
      ${dessinerBatiment(vue)}
    </div>
    ${vue.questions.length === 0 && reste === 0 ? `
      <p class="incendie-fini">
        ${svgIcon("check-circle-fill", { className: "octicon" })}
        Plus rien à demander : le référentiel a conclu tout ce qu'il pouvait conclure.
      </p>` : ""}
    ${dessinerRepondues(repondues)}
  `;
}

/**
 * Les réponses déjà données, et le chemin pour revenir sur chacune.
 *
 * C'est le second retour en arrière, celui qui ne suppose pas de recompter les
 * « ‹ » : on clique sur la réponse qu'on veut reprendre.
 */
function dessinerRepondues(repondues) {
  if (repondues.length === 0) return "";
  return `
    <details class="incendie-repondues" open>
      <summary>${repondues.length} réponse${repondues.length > 1 ? "s" : ""} donnée${repondues.length > 1 ? "s" : ""} — cliquez pour revenir dessus</summary>
      <ul>
        ${repondues.map((cle) => {
          const question = etat.questionsVues[cle];
          const courante = etat.parcours[etat.position] === cle;
          return `
            <li${courante ? ' class="est-courante"' : ""}>
              <button type="button" class="incendie-revenir" data-incendie-aller="${escapeHtml(cle)}">
                <span>${escapeHtml(question?.libelle ?? cle)}</span>
                <strong>${escapeHtml(lisible(etat.reponses[cle], question))}</strong>
              </button>
              <button type="button" class="incendie-oublier" data-incendie-oublier="${escapeHtml(cle)}"
                      title="Effacer cette réponse" aria-label="Effacer cette réponse">${svgIcon("x", { className: "octicon" })}</button>
            </li>
          `;
        }).join("")}
      </ul>
    </details>
  `;
}

/**
 * Une question, ses réponses en ligne, et ce à quoi elle sert.
 *
 * Les nombres gardent un champ de saisie : proposer des cases pour une hauteur
 * en mètres supposerait de deviner les valeurs, et l'on devinerait mal.
 */
function dessinerQuestion(question) {
  const donnee = etat.reponses[question.cle];
  // Une question qui nomme deux lieux ne se répond pas par « oui » : on lit
  // l'énoncé, on regarde les deux boutons, et l'on ne sait pas lequel dit quoi.
  // La question peut donc nommer elle-même ses deux réponses.
  const dits = question.libellesBooleens ?? {};
  const choix = question.type === "booleen"
    ? [{ valeur: "oui", libelle: dits.oui ?? "Oui" }, { valeur: "non", libelle: dits.non ?? "Non" }]
    : question.type === "choix" ? (question.valeurs ?? []) : null;

  const coche = (valeur) => {
    if (donnee === undefined) return false;
    if (question.type === "booleen") return (valeur === "oui") === (donnee === true);
    return String(donnee) === String(valeur);
  };

  return `
    <div class="incendie-question">
      <p class="incendie-question__libelle">
        ${escapeHtml(question.libelle)}${question.unite ? ` <em>[${escapeHtml(question.unite)}]</em>` : ""}
      </p>
      ${choix ? `
        <div class="incendie-choix" role="radiogroup" aria-label="${escapeHtml(question.libelle)}">
          ${choix.map((v) => `
            <button type="button" role="radio" aria-checked="${coche(v.valeur)}"
                    class="incendie-choix__option${coche(v.valeur) ? " est-coche" : ""}"
                    data-incendie-choix="${escapeHtml(question.cle)}"
                    data-incendie-valeur="${escapeHtml(v.valeur)}">
              <span class="incendie-choix__marque" aria-hidden="true"></span>
              ${escapeHtml(v.libelle)}
            </button>
          `).join("")}
        </div>` : `
        <input class="fondations-champ__saisie incendie-question__nombre" type="text" inputmode="decimal"
               data-incendie-question="${escapeHtml(question.cle)}"
               value="${escapeHtml(donnee === undefined ? "" : String(donnee))}"
               placeholder="${escapeHtml(question.unite ?? "")}"
               aria-label="${escapeHtml(question.libelle)}">`}
      <p class="incendie-question__pour">
        ${svgIcon("issue-tracked-by", { className: "octicon" })}
        Sert à : ${escapeHtml(question.pourTitre ?? "—")} — ${escapeHtml(referenceLisible(question))}
      </p>
      ${question.aide ? `<p class="incendie-question__aide">${escapeHtml(question.aide)}</p>` : ""}
      <div class="incendie-question__texte">
        <button type="button" class="incendie-ouvrir-article" data-incendie-article="${escapeHtml(question.article ?? "")}"
                aria-expanded="${etat.articleOuvert}">
          ${svgIcon("book", { className: "octicon" })}
          ${etat.articleOuvert ? "Masquer le texte" : `Lire ${escapeHtml(nommerLesArticles(question))} en entier`}
        </button>
        ${etat.articleOuvert ? articlesDeLaQuestion(question).map(dessinerArticleLu).join("") : ""}
      </div>
    </div>
  `;
}

/**
 * Les articles qu'une question met en jeu — parfois deux.
 *
 * « Les planchers de ces logements répondent-ils aux caractéristiques de
 * l'article 6 ? » est une condition de l'article 3, 5°) : c'est bien de
 * l'article 3 qu'elle sort. Mais celui qui répond a besoin de l'article 6, que
 * la question nomme. Ouvrir l'un sans l'autre était déroutant à juste titre.
 */
function articlesDeLaQuestion(question) {
  if (!question) return [];
  return [question.article, question.articleAussi].filter(Boolean).map(String);
}

/** Comment annoncer le bouton : un article, ou deux. */
function nommerLesArticles(question) {
  const articles = articlesDeLaQuestion(question);
  if (articles.length <= 1) return `l'article ${articles[0] ?? ""}`;
  return `les articles ${articles.join(" et ")}`;
}

/** Un article déjà lu, ou l'attente de sa lecture. */
function dessinerArticleLu(numero) {
  const article = etat.articles[String(numero)];
  if (article === "chargement" || article === undefined) return `<p class="gh-text-muted">Ouverture de l'article ${escapeHtml(numero)}…</p>`;
  if (!article) return `<p class="gh-text-muted">L'article ${escapeHtml(numero)} n'est pas porté par cette version.</p>`;
  return dessinerArticle(article);
}

/**
 * Ce que le référentiel a conclu, module par module.
 *
 * Les conclusions d'abord, ce qui se tait ensuite, ce qui attend en dernier :
 * un écran qui mélange les trois laisse croire qu'il manque des réponses là où
 * le texte n'exige rien.
 */
function dessinerResultats(vue) {
  const conclus = vue.modules.filter((m) => m.statut === "conclu");
  const attente = vue.modules.filter((m) => m.statut !== "conclu");
  const dit = conclus.filter((m) => m.valeur !== null && !m.sansObjet);
  const muets = conclus.filter((m) => m.valeur === null || m.sansObjet);

  return `
    ${dit.length === 0 ? `<p class="gh-text-muted">Rien de conclu pour l'instant : répondez au questionnaire.</p>` : ""}
    ${dit.map(dessinerConclusion).join("")}

    ${muets.length ? `
      <details class="incendie-muets">
        <summary>${muets.length} point${muets.length > 1 ? "s" : ""} sans objet dans ce cas</summary>
        ${muets.map(dessinerConclusion).join("")}
      </details>` : ""}

    ${attente.length ? `
      <details class="incendie-muets">
        <summary>${attente.length} point${attente.length > 1 ? "s" : ""} en attente de réponse</summary>
        <ul class="incendie-attente">
          ${attente.map((m) => `
            <li><strong>${escapeHtml(m.titre)}</strong> — article ${escapeHtml(m.article ?? "?")} :
              il manque ${escapeHtml(m.manque.join(", ")) || "des éléments"}.</li>
          `).join("")}
        </ul>
      </details>` : ""}
  `;
}

function dessinerConclusion(module) {
  return `
    <section class="incendie-conclusion${module.sansObjet ? " est-sans-objet" : ""}" data-incendie-module="${escapeHtml(module.id)}">
      <header class="incendie-conclusion__tete">
        <h5>${escapeHtml(module.titre)}</h5>
        ${module.valeur !== null
          ? `<span class="incendie-conclusion__valeur">${escapeHtml(String(module.valeur))}</span>`
          : `<span class="incendie-conclusion__valeur est-sans-objet">sans objet</span>`}
      </header>
      ${module.repond ? `<p class="incendie-conclusion__repond">${escapeHtml(module.repond)}</p>` : ""}
      ${module.sansObjet ? `<p class="incendie-conclusion__mention">${escapeHtml(module.sansObjet)}</p>` : ""}
      ${module.mention ? `<p class="incendie-conclusion__mention">${escapeHtml(module.mention)}</p>` : ""}
      ${dessinerSource(module.pourquoi)}
      ${module.convergent ? `
        <p class="incendie-conclusion__convergent">
          Plusieurs branches du texte mènent ici : la réponse ne dépend pas des questions non posées.
        </p>` : ""}
    </section>
  `;
}

/**
 * L'article, et la phrase qui décide.
 *
 * La citation n'est pas un ornement : c'est ce qui permet d'ouvrir l'arrêté à
 * la bonne ligne devant la personne qui conteste. Et la nature de la source est
 * dite — texte réglementaire ou commentaire SOCOTEC —, parce qu'on ne défend
 * pas de la même façon un article et une doctrine maison.
 */
function dessinerSource(source) {
  if (!source) return "";
  const doctrine = source.nature === "commentaire";
  // Une lecture n'est pas une citation : « Le régime appliqué est celui du
  // classement, à défaut de décision municipale de déclassement » ne figure
  // nulle part dans l'article 3 — c'est ce qu'il faut en comprendre. La mettre
  // entre guillemets la ferait citer en réunion comme si c'était la loi ; un
  // test vérifie d'ailleurs que tout ce qui se donne pour une citation se
  // retrouve mot pour mot dans le texte.
  const lecture = source.nature === "lecture";
  const entete = doctrine ? "Commentaire" : lecture ? "Lecture de l'article" : "Article";
  return `
    <blockquote class="incendie-source${doctrine ? " est-doctrine" : ""}${lecture ? " est-lecture" : ""}">
      <p class="incendie-source__reference">
        ${doctrine ? svgIcon("comment", { className: "octicon" }) : svgIcon("book", { className: "octicon" })}
        ${escapeHtml(entete)} ${escapeHtml(source.article ?? "?")}${source.paragraphe ? `, ${escapeHtml(source.paragraphe)}` : ""}
        ${source.texte && !lecture ? ` — ${escapeHtml(source.texte)}` : ""}
      </p>
      ${source.citation ? `<p class="incendie-source__citation">${
        lecture ? escapeHtml(source.citation) : `« ${escapeHtml(source.citation)} »`}</p>` : ""}
    </blockquote>
  `;
}

/**
 * L'article, en entier, avec ce que SOCOTEC en commente et ce que la figure en
 * montre.
 *
 * ## Pourquoi le texte entier sous une question
 *
 * L'énoncé d'une question suppose qu'on sache déjà ce que l'arrêté entend par
 * « parois verticales de l'enveloppe du logement » ou par « niveau de
 * référence ». Celui qui répond ne le sait pas, et il répondra quand même :
 * c'est ainsi qu'on obtient un classement faux sans que rien ne le signale.
 * L'article porte son contexte — l'exception qui suit l'alinéa, la définition
 * qui le précède —, le commentaire dit l'usage, et l'usage tranche souvent seul.
 *
 * ## Pourquoi le commentaire est à part
 *
 * Parce qu'on ne défend pas de la même façon un article et une doctrine. Les
 * mélanger dans un même bloc de texte ferait citer en réunion, comme de la loi,
 * la lecture d'un bureau de contrôle.
 */
function dessinerArticle(documentation) {
  if (!documentation) return "";
  return `
    <div class="incendie-article">
      <h6>${svgIcon("book", { className: "octicon" })} Article ${escapeHtml(documentation.numero)} — texte intégral</h6>
      <div class="incendie-article__texte md-body">${renderMarkdownToHtml(documentation.texte)}</div>
      ${(documentation.figures ?? []).map((figure) => `
        <figure class="incendie-figure">
          <div class="incendie-figure__dessin">${figure.svg}</div>
          <figcaption>
            <strong>${escapeHtml(figure.titre)}</strong>
            <span>${escapeHtml(figure.legende)}</span>
            <em>${escapeHtml(figure.source)}</em>
          </figcaption>
        </figure>
      `).join("")}
      ${documentation.commentaire ? `
        <div class="incendie-article__commentaire">
          <h6>${svgIcon("comment", { className: "octicon" })} Commentaire SOCOTEC</h6>
          <div class="md-body">${renderMarkdownToHtml(documentation.commentaire)}</div>
        </div>` : ""}
    </div>
  `;
}

/**
 * Le bâtiment que les réponses décrivent, redessiné à chaque réponse.
 *
 * On demande « nombre d'étages sur rez-de-chaussée » ; quelqu'un qui compte
 * trois niveaux habitables répond « 3 ». Le dessin montre alors quatre
 * planchers — R, 1, 2, 3 — et la faute saute aux yeux avant d'avoir contaminé
 * le classement, puis les planchers, puis tout ce qui en découle. Aucun message
 * d'erreur ne ferait ce travail : il faudrait savoir d'avance qu'il y a erreur.
 */
function dessinerBatiment(vue) {
  const classement = vue?.faits?.classement ?? null;
  const coupe = dessinerLaCoupe(etat.reponses, { classement });
  // Un niveau courant, un rez-de-chaussée et un sous-sol ne posent pas les mêmes
  // questions : superposer les trois donnait un plan qu'aucun étage réel ne
  // ressemble. Chacun ne se propose que s'il a quelque chose à montrer.
  const plans = plansDisponibles(etat.reponses);
  const vues = [
    ...(coupe.vide ? [] : [["coupe", "Coupe", coupe]]),
    ...plans
  ];
  if (!vues.length) {
    return `
      <aside class="incendie-batiment est-vide">
        <p class="gh-text-muted">Le bâtiment se dessinera ici à mesure des réponses — il montre ce que
        le référentiel a compris, pas le projet.</p>
      </aside>`;
  }

  const choisie = vues.find(([cle]) => cle === etat.vueDuBatiment) ?? vues[0];
  const [cle, , dessin] = choisie;

  return `
    <aside class="incendie-batiment">
      ${vues.length > 1 ? `
        <div class="incendie-batiment__vues" role="tablist">
          ${vues.map(([c, libelle]) => `
            <button type="button" role="tab" aria-selected="${cle === c}"
                    class="incendie-batiment__vue${cle === c ? " est-actif" : ""}"
                    data-incendie-vue-batiment="${c}">${escapeHtml(libelle)}</button>
          `).join("")}
        </div>` : ""}
      <div class="incendie-batiment__dessin">${dessin.svg}</div>
      <p class="incendie-batiment__legende">${escapeHtml(cle === "coupe"
        ? resumer(dessin.batiment, classement) : resumerLePlan(dessin.batiment, cle))}</p>
      <p class="incendie-batiment__avertissement">Schéma de relecture : ni proportions, ni géométrie réelle.</p>
    </aside>
  `;
}

/**
 * Le schéma décisionnel.
 *
 * ## Les liaisons se tracent, elles ne se racontent pas
 *
 * Chaque nœud disait « ← Classement du bâtiment ». C'était exact et illisible :
 * on relisait un nom au lieu de suivre un trait. Les liaisons sont donc
 * dessinées, en SVG, après la mise en page — c'est la seule façon de les faire
 * partir du bord droit d'un nœud pour arriver au bord gauche d'un autre, quelle
 * que soit la hauteur de chacun.
 *
 * ## Zoom et plein écran, dès maintenant
 *
 * Vingt-huit modules tiennent déjà mal ; le titre III en ajoute autant, et il
 * en reste plus de la moitié à porter. Un dessin qui ne se réduit pas devient
 * inutilisable au moment précis où il commencerait à servir. Les commandes sont
 * celles du journal des actions — mêmes icônes, même geste : deux graphes qui
 * se manipulent différemment dans le même produit sont deux choses à apprendre.
 */
function dessinerSchema(vue) {
  const parId = new Map(vue.modules.map((m) => [m.id, m]));
  return dessinerGrapheLiaisons({
    graphe: grapheAffichable(vue, parId),
    selection: etat.survole,
    zoom: etat.zoom,
    pleinEcran: etat.pleinEcran,
    montrerTout: etat.montrerTout,
    peutToutMontrer: etat.peutToutMontrer,
    chemin: etat.chemin,
    rangNomme: "Niveau",
    legende: `${vue.graphe.noeuds.length} modules, ${vue.graphe.liens.length} liaisons,
      <strong>${vue.graphe.questionsSource.length} questions à la source</strong>`,
    detail: dessinerDetail()
  });
}

/**
 * Le graphe du référentiel, traduit dans la langue du composant.
 *
 * Le composant ne connaît ni article ni famille : il connaît des nœuds qui ont
 * un en-tête, un titre, une valeur et un état. C'est ici, et seulement ici, que
 * l'un devient l'autre — ce qui permettra au même dessin de montrer un jour les
 * liaisons de la Mémoire sans rien savoir du feu.
 */
function grapheAffichable(vue, parId) {
  return {
    liens: vue.graphe.liens,
    noeuds: vue.graphe.noeuds.map((noeud) => {
      const module = parId.get(noeud.id);
      const conclu = module?.statut === "conclu";
      const sansObjet = conclu && (module.valeur === null || module.sansObjet);
      return {
        id: noeud.id,
        produit: noeud.produit,
        demande: noeud.demande,
        entete: `art. ${noeud.article ?? "?"}`,
        titre: noeud.titre,
        valeur: conclu && module.valeur !== null ? String(module.valeur) : conclu ? "sans objet" : "en attente",
        etat: conclu ? (sansObjet ? "sansObjet" : "conclu") : "attente"
      };
    })
  };
}

/** Les traits du schéma, reposés par le composant. */
function tracerLesLiens(root) {
  if (!etat.vue) return;
  const parId = new Map(etat.vue.modules.map((m) => [m.id, m]));
  tracerLesLiensDuGraphe(root, {
    graphe: grapheAffichable(etat.vue, parId),
    selection: etat.survole,
    zoom: etat.zoom
  });
}

/**
 * Le module désigné : ce qu'il a conclu, l'article dont il sort, et — sous
 * serrure — les règles qui l'ont décidé.
 *
 * ## Pourquoi les règles ne sont pas là par défaut
 *
 * Tout le dispositif tient sur un point : la table des conditions ne descend
 * pas dans le navigateur. Elle doit pourtant pouvoir être **relue en face de
 * l'article**, sinon rien ne garantit que le dépouillement dit ce que le texte
 * dit. Le serveur ne l'ouvre donc que pour les comptes qu'il connaît, et un
 * refus s'affiche comme une règle du produit, pas comme une panne.
 */
function dessinerDetail() {
  const module = etat.vue?.modules.find((m) => m.id === etat.survole);
  if (!module) return "";
  return `
    <header class="graphe-detail__tete">
      <h5>${escapeHtml(module.titre)}</h5>
      <button type="button" class="graphe-detail__fermer" data-graphe-chemin="sortir"
              aria-label="Fermer le détail" title="Fermer le détail et revoir tout le schéma">
        ${svgIcon("x", { className: "octicon" })}
      </button>
    </header>
    <div class="graphe-detail__corps">
      ${dessinerConclusion(module)}
      ${dessinerInspection(module)}
    </div>
  `;
}

/** Ce que l'inspection a rapporté : les liaisons, l'article, et les règles. */
function dessinerInspection(module) {
  const inspection = etat.inspection;
  if (!inspection || inspection.id !== module.id) return `<p class="gh-text-muted">Lecture du détail…</p>`;
  if (inspection.etat === "chargement") return `<p class="gh-text-muted">Lecture du détail…</p>`;
  if (inspection.etat === "erreur") return `<p class="fondations-erreur">${escapeHtml(inspection.raison)}</p>`;

  const d = inspection.donnees;
  return `
    <div class="incendie-inspection">
      ${d.repond ? `<p class="incendie-inspection__repond">${svgIcon("issue-tracked-by", { className: "octicon" })} ${escapeHtml(d.repond)}</p>` : ""}
      ${dessinerLiaisons(d.liaisons)}
      ${d.reglesFermees ? `
        <div class="incendie-ferme">
          ${svgIcon("shield-lock", { className: "octicon" })}
          <p>Les règles codées de ce module ne s'ouvrent que pour les comptes inscrits dans
          « INCENDIE_INSPECTEURS ». C'est volontaire : la table des conditions est le travail de
          dépouillement, et elle ne se partage pas avec un projet.</p>
        </div>` : dessinerRegles(d.regles)}
      ${dessinerArticle(d.documentation)}
    </div>
  `;
}

/** Ce qui entre dans le module, et ce qui en sort. */
function dessinerLiaisons(liaisons) {
  if (!liaisons) return "";
  const ligne = (lien, sens) => {
    const autre = etat.vue?.graphe.noeuds.find((n) => n.id === (sens === "amont" ? lien.de : lien.vers));
    return `<li><button type="button" class="incendie-lien-vers" data-incendie-aller-module="${escapeHtml(autre?.id ?? "")}">
      <code>${escapeHtml(lien.fait)}</code> ${escapeHtml(autre?.titre ?? "")}</button></li>`;
  };
  return `
    <div class="incendie-liaisons">
      <section>
        <h6>Ce qui entre (${liaisons.amont.length})</h6>
        ${liaisons.amont.length ? `<ul>${liaisons.amont.map((l) => ligne(l, "amont")).join("")}</ul>`
          : `<p class="gh-text-muted">Rien : ce module part des réponses.</p>`}
      </section>
      <section>
        <h6>Ce qui en dépend (${liaisons.aval.length})</h6>
        ${liaisons.aval.length ? `<ul>${liaisons.aval.map((l) => ligne(l, "aval")).join("")}</ul>`
          : `<p class="gh-text-muted">Rien : ce module est un aboutissement.</p>`}
      </section>
    </div>
  `;
}

/**
 * Les règles, dans leur ordre — et l'ordre est la moitié du sens.
 *
 * La première qui mord l'emporte. Une règle relue hors de son rang se juge
 * fausse alors qu'elle est simplement précédée d'une autre, et c'est la faute
 * la plus facile à commettre en relisant un dépouillement.
 */
function dessinerRegles(regles) {
  if (!Array.isArray(regles) || regles.length === 0) return "";
  return `
    <section class="incendie-regles">
      <h6>${regles.length} règle${regles.length > 1 ? "s" : ""}, dans l'ordre — la première qui mord l'emporte</h6>
      <ol>
        ${regles.map((regle) => `
          <li class="incendie-regle${regle.retenue ? " est-retenue" : ""}">
            <div class="incendie-regle__si">
              ${regle.conditions.length
                ? regle.conditions.map((c) => `<span class="incendie-condition">${escapeHtml(c.libelle)}</span>`).join('<span class="incendie-et">et</span>')
                : `<span class="incendie-condition">sans condition</span>`}
            </div>
            <div class="incendie-regle__alors">
              <span class="incendie-fleche" aria-hidden="true">→</span>
              <strong>${escapeHtml(regle.alors.valeur)}</strong>
              ${regle.alors.sansObjet ? `<em>${escapeHtml(regle.alors.sansObjet)}</em>` : ""}
            </div>
            ${dessinerSource(regle.source)}
          </li>
        `).join("")}
      </ol>
    </section>
  `;
}

function dessinerPortee(vue) {
  return `
    <div class="incendie-portee">
      <section>
        <h5>${svgIcon("check-circle-fill", { className: "octicon" })} Ce que cette version porte</h5>
        <ul>${vue.portee.couvert.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>
      </section>
      <section>
        <h5>${svgIcon("alert", { className: "octicon" })} Ce qu'elle ne porte pas</h5>
        <ul>${vue.portee.nonCouvert.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>
        <p class="incendie-portee__note">
          Ce qui n'est pas porté n'est pas vérifié. Un utilitaire qui laisse croire
          qu'il a tout lu est plus dangereux qu'un utilitaire qui n'existe pas : on
          cesse de vérifier.
        </p>
      </section>
    </div>
  `;
}

/** Une réponse, dite comme elle a été cochée — pas comme elle est rangée. */
function lisible(valeur, question = null) {
  if (valeur === true) return "oui";
  if (valeur === false) return "non";
  const propose = (question?.valeurs ?? []).find((v) => String(v.valeur) === String(valeur));
  return propose?.libelle ?? String(valeur);
}

function referenceLisible(question) {
  const article = question.article ? `article ${question.article}` : "arrêté";
  return question.paragraphe ? `${article}, ${question.paragraphe}` : article;
}
