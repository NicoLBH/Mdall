/**
 * L'écran d'accueil.
 *
 * ## Ce qu'il répond
 *
 * On arrive le matin en se demandant ce qu'il y a à faire, pas sur quel
 * chantier le faire. L'accueil était une phrase de bienvenue : il ne répondait
 * à rien, et l'on repartait aussitôt vers la liste des projets.
 *
 * Il répond maintenant à trois questions, une par colonne — **où je travaille
 * en ce moment** (le rail), **ce que je veux demander** (le Copilote), **ce qui
 * vient de se passer** (les actualités). Le dessin est dans `accueil-page.js`,
 * qui s'exécute dans un test ; ce fichier lit la base et branche les gestes.
 *
 * ## Une seule lecture pour deux colonnes
 *
 * Le classement et les actualités sortent des **mêmes traces** : deux lectures
 * séparées auraient fini par ne plus dire la même chose du même projet
 * (règle 4), et coûté deux fois le voyage.
 *
 * ## Ce que l'accueil n'écrit pas
 *
 * Il n'ouvre aucune discussion. La question tapée ici part au Copilote et
 * l'écran bascule : la discussion se crée au premier message, là où elle se
 * crée déjà, et non à deux endroits qui finiraient par la créer différemment.
 */

import { mountProjectShellChrome, setProjectViewHeader } from "./project-shell-chrome.js";
import {
  AUCUN_PROJET, GESTES_DE_LACCUEIL, ouMeneLaQuestion, renderPageDAccueil
} from "./accueil-page.js";
import { brancherLeRail, reglagesDuRail } from "./ui/reglages-du-rail.js";
import { bindGhActionButtons, bindGhSelectMenus } from "./ui/gh-split-button.js";
import { fetchMesChantiers } from "../services/project-situations-supabase.js";
import { lireMesTraces } from "../services/projets-actifs-supabase.js";
import { actualitesRecentes, projetsLesPlusActifs } from "../services/projets-actifs.js";
import { monAnneeDeTravail } from "../services/mon-annee-de-travail.js";
import { store } from "../store.js";
import { deposerLaQuestion } from "../services/question-de-laccueil.js";

/**
 * Ce que l'écran sait, entre deux rendus.
 *
 * `projets` vaut `null` tant qu'on n'a pas lu : ce n'est pas « aucun projet »,
 * et l'écran le dit plutôt que de montrer une liste vide (règle 5).
 */
const vue = {
  projets: null, traces: [], erreur: "", cherche: "",
  projetChoisi: AUCUN_PROJET, brouillon: "",
  /**
   * Mes traces telles qu'elles ont été lues — `null` : pas lues.
   *
   * `traces` retombe sur `[]` pour que le classement et les actualités se
   * fassent avec ce qui reste. La carte de l'année, elle, ne peut pas : une
   * grille toute grise dirait « je n'ai rien fait de l'année », ce qui est une
   * information — et fausse (règle 5). Elle a donc besoin de la lecture brute.
   */
  tracesLues: null
};

/** Le repli et la largeur du rail : des réglages à cet écran. */
const reglages = reglagesDuRail("accueil");

/** De quoi débrancher : ses écoutes sont sur le document. */
let detacherLeRail = null;

export function renderGlobalDashboard(root) {
  if (!root) return;

  mountProjectShellChrome({ projectId: null, tab: "dashboard" });
  setProjectViewHeader({ contextLabel: "Accueil", variant: "accueil", hideBar: true });

  vue.projets = null;
  vue.traces = [];
  vue.tracesLues = null;
  vue.erreur = "";
  redessiner(root);
  charger(root).catch(() => undefined);
}

async function charger(root) {
  const [projets, traces] = await Promise.all([
    fetchMesChantiers().catch(() => null),
    lireMesTraces(store.user?.id || "").catch(() => null)
  ]);

  vue.projets = Array.isArray(projets) ? projets : [];
  // **Deux silences différents.** Ne pas avoir de projet et ne pas avoir pu les
  // lire se ressemblent à l'écran, et demandent des gestes opposés.
  vue.erreur = [
    Array.isArray(projets) ? "" : "Vos projets n'ont pas pu être lus.",
    traces === null ? "Votre activité récente n'a pas pu être lue." : ""
  ].filter(Boolean).join(" ");
  vue.traces = Array.isArray(traces) ? traces : [];
  vue.tracesLues = Array.isArray(traces) ? traces : null;

  redessiner(root);
}

function redessiner(root) {
  if (!root?.isConnected) return;

  const nomsDesProjets = Object.fromEntries(
    (vue.projets ?? []).map((projet) => [String(projet?.id ?? ""), String(projet?.name ?? "")])
  );

  root.innerHTML = renderPageDAccueil({
    projets: vue.projets,
    actifs: projetsLesPlusActifs({ traces: vue.traces, nomsDesProjets }),
    actualites: actualitesRecentes({ traces: vue.traces, nomsDesProjets }),
    cherche: vue.cherche,
    projetChoisi: vue.projetChoisi,
    brouillon: vue.brouillon,
    erreur: vue.erreur,
    railReplie: reglages.replie(),
    railLargeur: reglages.largeur(),
    // Les **mêmes** traces que le classement et les actualités : une seconde
    // lecture finirait par ne plus dire la même chose de la même semaine
    // (règle 4), et coûterait un second voyage.
    annee: monAnneeDeTravail({ traces: vue.tracesLues })
  });

  brancher(root);
}

/**
 * Ouvrir le Copilote, **en emportant ce qui est écrit**.
 *
 * La question passe par `services/question-de-laccueil.js`, qui dit au long
 * pourquoi ni l'adresse ni le brouillon du Copilote ne conviennent : la
 * première la mettrait dans l'historique du navigateur, le second serait effacé
 * par le changement de projet.
 */
function envoyer(question) {
  // **Une question vide n'ouvre rien.** Entrée sur un champ blanc changerait
  // d'écran sans rien emporter, et l'on se retrouverait ailleurs sans savoir
  // pourquoi.
  if (!String(question ?? "").trim()) return;

  vue.brouillon = "";
  deposerLaQuestion(question);
  window.location.hash = ouMeneLaQuestion(vue.projetChoisi);
}

function brancher(root) {
  // La poignée de largeur, le calage au défilement, le bouton de repli. On
  // débranche d'abord : `followRailScroll` écoute le document, et un rendu de
  // plus ajouterait une paire d'écouteurs qui mesurent un rail disparu.
  detacherLeRail?.();
  detacherLeRail = brancherLeRail({
    racine: root,
    id: "accueilRail",
    pageSelector: ".project-simple-page--accueil",
    reglages,
    redessiner: () => redessiner(root)
  });

  bindGhActionButtons();
  bindGhSelectMenus(root, {
    onChange: (id, valeur) => {
      if (id !== GESTES_DE_LACCUEIL.choixDuProjet) return;
      vue.projetChoisi = String(valeur ?? "");
      redessiner(root);
    }
  });

  const recherche = root.querySelector(`[${GESTES_DE_LACCUEIL.recherche}]`);
  recherche?.addEventListener("input", () => {
    vue.cherche = recherche.value;
    redessiner(root);
    // Redessiner remplace le champ : sans cela, on taperait la première lettre
    // et le curseur partirait.
    const repris = root.querySelector(`[${GESTES_DE_LACCUEIL.recherche}]`);
    repris?.focus();
    repris?.setSelectionRange(repris.value.length, repris.value.length);
  });

  /**
   * **Envoyer ici, c'est ouvrir le Copilote.**
   *
   * Entrée envoie, Maj+Entrée passe à la ligne : **exactement la convention du
   * Copilote**, et c'est ce qui la rend supportable. Basculer à la première
   * frappe changeait d'écran pendant qu'on écrit — on n'avait rien demandé, la
   * page sautait sous le curseur, et l'on ne pouvait plus se raviser.
   *
   * On ne redessine pas à chaque touche : l'écran remplacerait le champ, et le
   * curseur repartirait au début. Le brouillon se retient, il ne se réaffiche
   * qu'en revenant sur l'accueil.
   */
  const saisie = root.querySelector(`[${GESTES_DE_LACCUEIL.saisie}]`);
  saisie?.addEventListener("input", () => { vue.brouillon = saisie.value; });

  saisie?.addEventListener("keydown", (evenement) => {
    if (evenement.key !== "Enter" || evenement.shiftKey) return;
    evenement.preventDefault();
    envoyer(saisie.value);
  });

  root.querySelector(`[${GESTES_DE_LACCUEIL.envoi}]`)?.addEventListener("click", () => {
    envoyer(saisie?.value || "");
  });
}
