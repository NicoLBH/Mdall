/**
 * Les trois explorations de l'Atelier : variante, étude d'impact, audit.
 *
 * ## Pourquoi elles ne sont plus dans la Mémoire
 *
 * Elles y étaient nées, sous un bouton « Tester » posé dans la barre de titre.
 * C'était commode et c'était faux : la Mémoire **montre ce que le projet tient
 * pour vrai**, et rien d'autre. Essayer une valeur, mesurer ce qui repose sur
 * une autre, rejouer le raisonnement pour voir s'il a dérivé — ce sont des
 * questions qu'on pose *avant* de proposer quelque chose, pas des lectures de la
 * mémoire.
 *
 * Le critère est celui du § 14 de `docs/a-traiter-plus-tard.md` :
 *
 * > La Mémoire ne contient que des écrans de lecture. Tout ce qui prépare une
 * > proposition vit dans l'Atelier.
 *
 * Le cerveau du projet, lui, reste dans la Mémoire : il ne pose aucune question,
 * il dessine la forme de ce qui est là.
 *
 * ## Ce que ce module ajoute, et ce qu'il n'ajoute pas
 *
 * Rien n'est réécrit : les trois écrans existaient et sont **repris tels
 * quels**. Ce module leur donne un hôte dans l'Atelier et la lecture de la
 * mémoire qu'ils attendaient jusqu'ici de l'onglet Mémoire. Deux copies de
 * l'écran de variante — une par onglet — finiraient par diverger (règle 4) ; il
 * n'y en a donc qu'une, et elle a déménagé.
 *
 * ## Une seule lecture pour les trois
 *
 * Les trois interrogent la **même** mémoire. La relire trois fois à l'ouverture
 * de l'Atelier ferait trois allers-retours pour un seul état, et — pire — trois
 * états qui peuvent différer d'une seconde à l'autre : on comparerait alors un
 * impact mesuré sur une mémoire à une variante calculée sur une autre. La
 * lecture est donc unique, partagée, et se refait quand on revient sur un
 * panneau.
 */

import { escapeHtml } from "../../../utils/escape-html.js";
import { svgIcon } from "../../../ui/icons.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";
import { store } from "../../../store.js";
import { resolveCurrentBackendProjectId } from "../../../services/project-supabase-sync.js";
import { PROJECT_TAB_IDS } from "../../../constants.js";
import { renderEcranDeVariante, varianteEnJson, ETAPE, SAISIE_DE_LA_VARIANTE } from "../../memoire/ecran-variante.js";
import { brancherLaSaisieDAdresse } from "../../ui/saisie-adresse.js";
import { substitutionsDeLaLocalisation, adresseEnUneLigne } from "../../../services/adresse-saisie.js";
import { ligneDeLaLocalisation, phraseDeLaLocalisation } from "../../../services/localisation-versement.js";
import { STRUCTURE_DE_LA_LOCALISATION } from "../../../utilitaires/agents-climatiques.js";
import { ouvrirLEtudeDImpact } from "../../ui/fenetre-impact.js";
import { ouvrirLAudit } from "../../ui/fenetre-audit.js";
import { essayerLaVariante } from "../../../services/variante-en-cours.js";
import { consequencesDeLaVariante, valeursSubstituables, variantePourLEcran } from "../../../services/memoire-variante.js";
import { couvertureDeLaVariante, ligneDeLEngagement } from "../../../services/couverture.js";
import { emploisParAffirmation } from "../../../services/memoire-applications.js";
import { champDeLIdentifiant } from "../../../services/tableau-structure.js";

/** Ce que dit une valeur, débarrassée de ses blancs. */
const texte = (valeur) => String(valeur ?? "").trim();
import { frappeAvecUnite } from "../../../services/saisie-unite.js";
import { rejouerLesUtilitaires } from "../../../services/utilitaires-rejeu.js";

/* ────────────────────────────────────────────────────────────────────────────
 * La mémoire, lue une fois pour les trois
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * `assertions` à `null` veut dire « on n'a pas pu lire », `[]` veut dire « le
 * projet n'a rien versé ». Les confondre ferait passer une panne pour une page
 * blanche légitime — c'est la règle 5.
 */
const memoire = {
  chargement: null, projectId: "", assertions: null, applications: null,
  /** Ce que des gens ont engagé sur des valeurs. `null` quand on n'a pas pu lire. */
  actes: null,
  erreur: ""
};

/** Vrai tant que la lecture est en route. Les trois panneaux le disent pareil. */
let enLecture = false;

/**
 * Lire la mémoire du projet, et les lectures que les règles ont enregistrées.
 *
 * Les applications peuvent manquer sans que la mémoire manque : l'index n'est
 * pas la mémoire, et une variante se calcule sans lui — moins bien, mais elle se
 * calcule. Son échec est donc silencieux, alors que celui de la mémoire ne l'est
 * pas.
 */
async function lireLaMemoire({ force = false } = {}) {
  if (!force && memoire.assertions !== null) return memoire;
  if (memoire.chargement) return memoire.chargement;

  enLecture = true;
  memoire.erreur = "";

  memoire.chargement = (async () => {
    try {
      const projectId = await resolveCurrentBackendProjectId();
      if (!projectId) throw new Error("Projet introuvable.");
      const [{ listProjectAssertions }, { listerLesApplications }, { listHypothesisActs }] =
        await Promise.all([
          import("../../../services/project-memory-supabase.js"),
          import("../../../services/memoire-applications-supabase.js"),
          import("../../../services/memoire-actes-supabase.js")
        ]);
      memoire.projectId = projectId;
      memoire.assertions = await listProjectAssertions(projectId);
      memoire.applications = await listerLesApplications(projectId).catch(() => null);
      // Les actes non plus ne sont pas la mémoire : sans eux, une variante se
      // calcule — elle ne dit simplement pas ce qu'elle fait tomber.
      memoire.actes = await listHypothesisActs(projectId).catch(() => null);
    } catch (erreur) {
      memoire.erreur = erreur instanceof Error ? erreur.message : String(erreur);
      memoire.assertions = null;
      memoire.applications = null;
      memoire.actes = null;
    } finally {
      enLecture = false;
      memoire.chargement = null;
    }
    return memoire;
  })();

  return memoire.chargement;
}

/** La coque d'un panneau d'exploration : un titre, une phrase, un corps. */
function renderPanneau({ cle, titre, quoi, corps, actions = "" }) {
  return `
    <section class="settings-section is-active" data-exploration="${escapeHtml(cle)}">
      <div class="settings-card settings-card--param studio-tool-card">
        <div class="settings-card__head studio-tool-card__head">
          <div>
            <span class="settings-card__head-title">
              <h4>${escapeHtml(titre)}</h4>
              <div class="studio-tool-card__actions">
                ${actions}
                <button type="button" class="gh-btn" data-exploration-relire ${enLecture ? "disabled" : ""}>
                  ${svgIcon("sync", { className: "octicon" })} Relire la mémoire
                </button>
              </div>
            </span>
          </div>
        </div>
        <div class="settings-card__body studio-tool-card__body">
          <p class="gh-text-muted">${escapeHtml(quoi)}</p>
          ${corps}
        </div>
      </div>
    </section>
  `;
}

/**
 * Ce que la lecture dit d'elle-même quand elle n'a rien à montrer.
 *
 * `""` veut dire « la mémoire est là, montre l'écran ». Toute autre valeur est
 * un état qu'il faut afficher à la place.
 */
function empechement() {
  if (enLecture) return `<p class="gh-text-muted">Lecture de la mémoire…</p>`;
  if (memoire.erreur) {
    return `<p class="gh-text-muted" style="color:var(--danger);">${escapeHtml(memoire.erreur)}</p>`;
  }
  if (memoire.assertions === null) {
    return `<p class="gh-text-muted">La mémoire n'a pas pu être lue. Ce n'est pas qu'elle est vide : on ne sait pas.</p>`;
  }
  return "";
}

/** Le bouton « Relire », commun aux trois. */
function brancherLaRelecture(root, redessiner) {
  root.querySelector("[data-exploration-relire]")?.addEventListener("click", () => {
    void lireLaMemoire({ force: true }).then(() => redessiner());
    redessiner();
  });
}

/** Le panneau se place dans la colonne qui défile, comme les utilitaires. */
function suivreLeDefilement(root) {
  registerProjectPrimaryScrollSource(
    root.closest("#projectStudioRouterScroll") || document.getElementById("projectStudioRouterScroll")
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Tester une variante
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * L'état de l'écran de variante.
 *
 * Il vit au niveau du module, comme le panneau courant de l'Atelier : passer sur
 * le Copilote et revenir ne doit pas effacer une variante qu'on est en train de
 * lire. Il meurt au rechargement, comme la variante elle-même.
 */
let etatDeLaVariante = null;

/**
 * Les valeurs qu'on peut essayer, dans l'ordre où on les cherche.
 *
 * Ce que le projet **pose** d'abord, les champs des tableaux ensuite. Un seul
 * tableau de fondations en offre soixante-deux : mélangés, ils noieraient les
 * quelques valeurs qu'on vient chercher en premier.
 */
function valeursDuSocle() {
  const emplois = emploisParAffirmation(Array.isArray(memoire.applications) ? memoire.applications : []);

  return valeursSubstituables(memoire.assertions ?? [])
    // Les emplois se comptent sur l'**affirmation**, pas sur le champ : c'est
    // elle que les fonctions déclarent lire. Compter sur l'identifiant composite
    // rendrait zéro, et « aucun emploi connu » s'afficherait sur la valeur même
    // que le calcul consomme.
    .map((entree) => ({
      ...entree,
      lectures: emplois.get(champDeLIdentifiant(entree.id).id)?.lectures ?? 0
    }))
    .sort((gauche, droite) => {
      const dansUnTableau = Number(Boolean(gauche.champ)) - Number(Boolean(droite.champ));
      if (dansUnTableau) return dansUnTableau;
      // Les champs gardent l'ordre de leur déclaration : c'est celui dans lequel
      // un ingénieur lit une semelle — géométrie, sol, butée, béton, charges —,
      // et le trier par ordre alphabétique le perdrait.
      if (gauche.champ) return 0;
      return droite.lectures - gauche.lectures || gauche.sujet.localeCompare(droite.sujet, "fr");
    });
}

/** Repartir de la liste, sur la mémoire telle qu'elle vient d'être lue. */
function repartirDuChoix() {
  etatDeLaVariante = {
    valeurs: valeursDuSocle(), etape: ETAPE.CHOIX, choisie: null,
    saisie: "", echec: "", cherche: "", rendu: null,
    // Les colonnes qu'une adresse choisie remplacera, quand la variante porte
    // une localisation. Vides partout ailleurs.
    substitutions: [], portees: [],
    projet: memoire.projectId
  };
}

/** La valeur d'un champ, ou `""`. */
function texteDuChamp(root, selecteur) {
  return String(root.querySelector(selecteur)?.value ?? "").trim();
}

/**
 * Calculer, en laissant d'abord les utilitaires se rejouer.
 *
 * Le seul moment de tout l'écran qui attend le réseau. Il attend parce qu'il le
 * faut : le référentiel a la table, et lui demander sa réponse vaut mieux que de
 * refaire son calcul de notre côté — deux copies d'une même loi divergent
 * toujours. Rien n'est écrit là-bas : l'outil calcule et se tait.
 */
async function calculerLaVariante(root) {
  const etat = etatDeLaVariante;
  if (!etat?.choisie) return;

  const saisie = texteDuChamp(root, "[data-variante-valeur]") || etat.saisie;
  // Une localisation remplace **la ligne entière** : six colonnes d'un coup,
  // parce que changer l'adresse d'un projet, c'est le déplacer. Partout
  // ailleurs, une valeur, un identifiant. Voir `services/adresse-saisie.js`.
  const substitutions = etat.substitutions?.length
    ? new Map(etat.substitutions.map((entree) => [entree.id, entree.valeur]))
    : new Map([[etat.choisie.id, saisie]]);
  const assertions = memoire.assertions ?? [];

  // Refusé d'entrée — même valeur, valeur vide — : inutile de déranger le
  // serveur pour une variante qui n'en est pas une.
  const controle = consequencesDeLaVariante({ assertions, substitutions, applications: memoire.applications });
  if (!controle.ok) {
    etatDeLaVariante = { ...etat, saisie, echec: controle.raison, etape: ETAPE.SAISIE, rendu: null };
    dessinerLaVariante(root);
    return;
  }

  etatDeLaVariante = { ...etat, saisie, echec: "", etape: ETAPE.ATTENTE, rendu: null };
  dessinerLaVariante(root);

  const relectures = await rejouerLesUtilitaires({
    projectId: memoire.projectId, enVigueur: assertions, substitutions
  }).catch(() => null);

  const rendu = consequencesDeLaVariante({
    assertions, substitutions, applications: memoire.applications, relectures
  });

  // Ce que la variante ferait tomber. Calculé **à côté** : `consequencesDeLaVariante`
  // répond à « qu'est-ce qui change », et lui faire répondre aussi à « qu'est-ce
  // que ça coûte » ferait une fonction qui mêle deux questions.
  const couverture = couvertureDeLaVariante({
    rendu, assertions, actes: memoire.actes ?? [], applications: memoire.applications
  });

  etatDeLaVariante = {
    ...etatDeLaVariante,
    etape: rendu.ok ? ETAPE.RESULTAT : ETAPE.SAISIE,
    echec: rendu.ok ? "" : rendu.raison,
    rendu,
    couverture
  };
  dessinerLaVariante(root);
}

/** Emporter la variante en JSON — de quoi refaire le raisonnement sans l'écran. */
function emporterLaVariante() {
  const contenu = JSON.stringify(varianteEnJson(etatDeLaVariante ?? {}), null, 2);
  const lien = document.createElement("a");
  lien.href = URL.createObjectURL(new Blob([contenu], { type: "application/json" }));
  lien.download = `variante-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "")}.json`;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(lien.href), 0);
}

/**
 * Aller lire la mémoire sous la variante.
 *
 * La variante se pose dans le service partagé, puis on change d'onglet : c'est
 * la Mémoire qui la montre, et elle l'apprend en s'abonnant. Rien n'est écrit
 * nulle part — la variante meurt au rechargement, comme avant.
 */
function lireLaMemoireAvecLaVariante() {
  const rendu = etatDeLaVariante?.rendu;
  if (!rendu?.ok) return;
  essayerLaVariante(variantePourLEcran({ consequences: rendu }));
  // L'adresse d'un onglet porte l'identifiant **de l'écran**, pas celui de la
  // base : `memoire.projectId` est l'identifiant serveur, et le mettre là
  // ouvrirait un projet qui n'existe pour personne.
  const projet = String(store.currentProjectId || "");
  if (projet) window.location.hash = `#project/${projet}/${PROJECT_TAB_IDS.MEMOIRE}`;
}

/**
 * Le champ d'adresse, quand ce qu'on essaie est une colonne de la localisation.
 *
 * Ce qu'il rend ne devient pas quatre substitutions : **une seule**, celle de la
 * colonne choisie à gauche. Les autres colonnes de la localisation restent ce
 * que le projet dit, et le rejeu ne porte qu'une valeur par identifiant.
 *
 * Rien n'est écrit : la variante est une seconde lecture, et elle meurt au
 * rechargement comme le reste de cet écran.
 */
function brancherLAdresseDeLaVariante(root) {
  const cache = root.querySelector("[data-variante-valeur][data-variante-colonne]");
  if (!cache) return;

  brancherLaSaisieDAdresse(root, {
    nom: SAISIE_DE_LA_VARIANTE,
    quandChoisie: (localisation) => {
      const choisie = etatDeLaVariante?.choisie;
      const porteuse = champDeLIdentifiant(texte(choisie?.id)).id;

      // Toutes les colonnes que le projet offre, et elles seules : une colonne
      // que son tableau ne porte nulle part n'est pas une valeur qu'on peut
      // faire varier, et la lui imposer ferait refuser le lot entier.
      const offertes = (etatDeLaVariante?.valeurs ?? [])
        .map((valeur) => texte(valeur.id))
        .filter((id) => champDeLIdentifiant(id).id === porteuse);

      const substitutions = substitutionsDeLaLocalisation(localisation, {
        id: porteuse,
        ligne: choisie?.assertion?.payload?.tableau?.[0] ?? null,
        offertes
      });
      appliquerLaLocalisation(root, substitutions, localisation);
    },
    quandEchoue: (motif) => {
      etatDeLaVariante = { ...etatDeLaVariante, echec: motif };
      dessinerLaVariante(root);
    }
  });

  // La recherche approfondie : le champ ne suffit pas quand le projet n'a pas
  // d'adresse. C'est la **même** fenêtre que dans Paramètres > Localisation.
  root.querySelector("[data-variante-carte]")?.addEventListener("click", () => {
    void (async () => {
      const choisie = etatDeLaVariante?.choisie;
      const { chercherUneLocalisation } = await import("../../ui/recherche-de-localisation.js");
      const retenue = await chercherUneLocalisation({
        depart: departDeLaLocalisation(choisie)
      });
      if (!retenue) return;

      const porteuse = champDeLIdentifiant(texte(choisie?.id)).id;
      const offertes = (etatDeLaVariante?.valeurs ?? [])
        .map((valeur) => texte(valeur.id))
        .filter((id) => champDeLIdentifiant(id).id === porteuse);

      appliquerLaLocalisation(root, substitutionsDeLaLocalisation(retenue, {
        id: porteuse,
        ligne: choisie?.assertion?.payload?.tableau?.[0] ?? null,
        offertes
      }), retenue);
    })();
  });
}

/** Là où le projet se trouve aujourd'hui, pour que la fenêtre en parte. */
function departDeLaLocalisation(choisie) {
  const ligne = choisie?.assertion?.payload?.tableau?.[0] ?? null;
  if (!ligne) return null;
  return {
    address: ligne.adresse, city: ligne.commune,
    postalCode: ligne.codePostal, codeInsee: ligne.codeInsee,
    latitude: ligne.latitude, longitude: ligne.longitude
  };
}

/**
 * Poser ce qu'une localisation choisie remplace.
 *
 * Un seul chemin pour les deux façons de la choisir — le champ d'adresse et la
 * fenêtre de recherche : deux auraient fini par ne pas substituer les mêmes
 * colonnes.
 */
function appliquerLaLocalisation(root, substitutions, localisation) {
  const cache = root.querySelector("[data-variante-valeur][data-variante-colonne]");

  if (!substitutions.length) {
    etatDeLaVariante = {
      ...etatDeLaVariante, substitutions: [], portees: [], saisie: "",
      echec: "C'est déjà là que le projet se trouve : il n'y a pas de variante."
    };
    dessinerLaVariante(root);
    return;
  }

  const dite = phraseDeLaLocalisation(ligneDeLaLocalisation(localisation))
    || adresseEnUneLigne(localisation);
  if (cache) cache.value = dite;

  etatDeLaVariante = {
    ...etatDeLaVariante,
    substitutions,
    portees: substitutions.map((entree) => ({
      nom: nomDeLaColonne(entree.colonne),
      valeur: entree.valeur
    })),
    saisie: dite,
    echec: ""
  };
  dessinerLaVariante(root);
}

/** Le nom déclaré d'une colonne de la localisation, ou sa clé à défaut. */
function nomDeLaColonne(cle) {
  return STRUCTURE_DE_LA_LOCALISATION.find((colonne) => colonne.cle === cle)?.nom || cle;
}

/** Les gestes de l'écran de variante. */
function brancherLEcranDeVariante(root) {
  for (const bouton of root.querySelectorAll("[data-variante-choisir]")) {
    bouton.addEventListener("click", () => {
      const id = bouton.getAttribute("data-variante-choisir") || "";
      const choisie = (etatDeLaVariante?.valeurs ?? []).find((valeur) => valeur.id === id) ?? null;
      if (!choisie) return;
      etatDeLaVariante = {
        ...etatDeLaVariante, choisie, saisie: "", echec: "", etape: ETAPE.SAISIE, rendu: null,
        // Ce qu'une adresse avait porté ne vaut plus : on essaie autre chose.
        substitutions: [], portees: []
      };
      dessinerLaVariante(root);
      root.querySelector("[data-variante-valeur]")?.focus();
    });
  }

  const recherche = root.querySelector("[data-variante-recherche]");
  if (recherche) {
    recherche.addEventListener("input", (evenement) => {
      // La saisie en cours ne se perd pas parce qu'on cherche à côté : les deux
      // colonnes vivent ensemble, et c'est tout l'intérêt de l'écran.
      etatDeLaVariante = {
        ...etatDeLaVariante,
        cherche: evenement.target.value,
        saisie: texteDuChamp(root, "[data-variante-valeur]") || etatDeLaVariante?.saisie || ""
      };
      dessinerLaVariante(root);
      const champ = root.querySelector("[data-variante-recherche]");
      champ?.focus();
      champ?.setSelectionRange(champ.value.length, champ.value.length);
    });
  }

  root.querySelector("[data-variante-calculer]")?.addEventListener("click", () => {
    void calculerLaVariante(root);
  });
  root.querySelector("[data-variante-valeur]")?.addEventListener("keydown", (evenement) => {
    if (evenement.key === "Enter") { evenement.preventDefault(); void calculerLaVariante(root); }
  });

  brancherLAdresseDeLaVariante(root);

  // L'unité du projet s'écrit à mesure qu'on tape le nombre : « 8 » devient
  // « 8 m », « 80 » devient « 80 m ». Le champ ne peut donc jamais porter une
  // valeur dans une autre unité que celle qu'il remplace — ce qui vaut mieux que
  // de convertir, et bien mieux que de deviner. Voir `services/saisie-unite.js`.
  const champ = root.querySelector("[data-variante-valeur]");
  if (champ) {
    champ.addEventListener("input", () => {
      const { texte: ecrit, caret } = frappeAvecUnite(champ.value, champ.getAttribute("data-variante-unite") || "");
      if (ecrit === champ.value) return;
      champ.value = ecrit;
      // Le curseur revient devant l'unité : sans cela la frappe suivante
      // s'écrirait derrière le « m », et le champ se remplirait à l'envers.
      champ.setSelectionRange(caret, caret);
    });
  }

  // « Abandonner » ne ferme plus rien : le panneau *est* l'écran, et le quitter
  // reviendrait à quitter l'Atelier. Il repart donc de la liste, ce que le
  // bouton faisait déjà de fait — on revenait choisir une autre valeur.
  root.querySelector("[data-variante-abandonner]")?.addEventListener("click", () => {
    repartirDuChoix();
    dessinerLaVariante(root);
  });
  root.querySelector("[data-variante-exporter]")?.addEventListener("click", () => emporterLaVariante());
  root.querySelector("[data-variante-lire]")?.addEventListener("click", () => lireLaMemoireAvecLaVariante());
}

function dessinerLaVariante(root) {
  const bloque = empechement();
  const corps = bloque || renderEcranDeVariante(etatDeLaVariante ?? {});

  root.innerHTML = renderPanneau({
    cle: "variante",
    titre: "Tester une variante",
    quoi: "Changer n'importe quelle valeur du socle, rejouer ce qui en découle, et ne rien écrire. "
      + "La mémoire du projet n'est pas touchée : on regarde ce qu'elle dirait.",
    // L'export monte dans la barre du panneau, là où vivent les actions des
    // autres utilitaires. Il emporte tout ce qui a servi : une variante qui se
    // comporte mal ne se diagnostique pas sur une capture d'écran.
    actions: bloque ? "" : `
      <button type="button" class="gh-btn" data-variante-exporter>
        ${svgIcon("download", { className: "octicon" })} Exporter
      </button>
    `,
    corps
  });

  brancherLaRelecture(root, () => dessinerLaVariante(root));
  if (!bloque) brancherLEcranDeVariante(root);
}

export function renderPanneauVariante(root, { force = false } = {}) {
  if (!root) return;
  dessinerLaVariante(root);
  void lireLaMemoire({ force }).then(() => {
    // On ne rejette pas une variante en cours de lecture parce qu'on est revenu
    // sur le panneau : la relecture ne sert alors qu'à savoir si le socle a
    // bougé. Une exploration abandonnée pour un changement d'onglet serait la
    // pire façon de perdre un raisonnement.
    if (!etatDeLaVariante || etatDeLaVariante.projet !== memoire.projectId) repartirDuChoix();
    dessinerLaVariante(root);
  });
  suivreLeDefilement(root);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Étude d'impact
 * ────────────────────────────────────────────────────────────────────────── */

function dessinerLImpact(root) {
  const bloque = empechement();

  root.innerHTML = renderPanneau({
    cle: "impact",
    titre: "Étude d'impact",
    quoi: "Dire ce qui repose sur une valeur, avec le compte exact et les zones. "
      + "Seules les lectures enregistrées sont comptées — ce qui n'a pas été enregistré ne se devine pas.",
    corps: bloque || `<div data-impact-hote></div>`
  });

  brancherLaRelecture(root, () => dessinerLImpact(root));
  if (bloque) return;

  const hote = root.querySelector("[data-impact-hote]");
  if (hote) {
    ouvrirLEtudeDImpact({ assertions: memoire.assertions ?? [], applications: memoire.applications, hote });
  }
}

export function renderPanneauImpact(root, { force = false } = {}) {
  if (!root) return;
  dessinerLImpact(root);
  void lireLaMemoire({ force }).then(() => dessinerLImpact(root));
  suivreLeDefilement(root);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Auditer la mémoire
 * ────────────────────────────────────────────────────────────────────────── */

function dessinerLAudit(root) {
  const bloque = empechement();

  root.innerHTML = renderPanneau({
    cle: "audit",
    titre: "Auditer la mémoire",
    quoi: "Rejouer le raisonnement sur les valeurs d'aujourd'hui, et dire ce qui a dérivé. Rien n'est écrit.",
    corps: bloque || `<div data-audit-hote></div>`
  });

  brancherLaRelecture(root, () => dessinerLAudit(root));
  if (bloque) return;

  const hote = root.querySelector("[data-audit-hote]");
  // L'audit se fait sur la mémoire **lue en base**, jamais sur le calque d'une
  // variante : auditer une lecture qu'on sait fausse ne dirait rien de vrai.
  if (hote) ouvrirLAudit({ assertions: memoire.assertions ?? [], hote });
}

export function renderPanneauAudit(root, { force = false } = {}) {
  if (!root) return;
  dessinerLAudit(root);
  void lireLaMemoire({ force }).then(() => dessinerLAudit(root));
  suivreLeDefilement(root);
}
