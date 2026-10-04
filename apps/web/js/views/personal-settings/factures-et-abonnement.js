/**
 * *Profil › Factures et abonnement* — ce que j'ai consommé.
 *
 * ## Ce que cet onglet répond
 *
 * « Combien l'IA m'a-t-elle coûté ce mois-ci, et où ? » Trois choses dans cet
 * ordre : le total, la courbe jour par jour, la répartition par projet.
 *
 * **Ma consommation, pas celle de l'équipe.** La table rend aussi les appels de
 * mes collègues sur mes projets — il le faut, pour que le total d'un projet
 * s'explique — mais ici on filtre par propriétaire. Sans cela, « ma facture »
 * porterait le travail des autres.
 *
 * ## L'écran se dessine deux fois, et c'est voulu
 *
 * Une première fois en attendant, une seconde quand les lignes arrivent.
 * Attendre pour ne dessiner qu'une fois laisserait un écran blanc sans rien qui
 * dise qu'il travaille.
 */

import { store } from "../../store.js";
import { renderAttente, renderConsommation } from "../consommation/ecran-de-consommation.js";
import {
  PAS, ceQueLaFenetreDit, laCleDeLaFenetre, laFenetreDe, lePasValide, moisEnCours,
  moisEnFrancais
} from "../../services/consommation-ia.js";
import {
  ceQueLeMenuDemande, renderLeChoixDeLaPeriode
} from "../ui/le-choix-de-la-periode.js";
import { bindGhActionButtons } from "../ui/gh-split-button.js";

const PANNEAU = "personal-settings-facturation";

/**
 * Ce qu'on a lu, et **pour quelle fenêtre**. Gardé entre deux venues sur
 * l'onglet.
 *
 * `pas` en fait partie, et ce n'est pas qu'un réglage d'affichage : il décide
 * **ce qu'on va chercher en base**. « Par mois » lit les douze derniers mois,
 * « par an » les cinq dernières années. Changer de pas est donc une relecture,
 * pas un redessin — et le garder ici évite de redemander la même fenêtre deux
 * fois.
 */
const lecture = {
  /** Ce qu'on regarde — le choix courant, celui que l'écran dessine. */
  mois: "", pas: PAS.JOUR,
  /**
   * La fenêtre dont `appels` vient, ou `""` quand rien n'a été lu.
   *
   * **Elle se garde à part du choix.** Les confondre ferait croire la lecture
   * faite dès qu'on a cliqué sur un autre mois, et l'on afficherait les chiffres
   * du précédent sous le nom du nouveau (règle 5).
   */
  cle: "",
  appels: null, enCours: false, echec: false,
  // Le journal des pannes de la période. Son échec se garde à part : une lecture
  // ratée du compteur ne dit rien de celle du journal.
  refus: null, refusEchec: false
};

export function getFacturationPersonalSettingsTab() {
  return {
    id: PANNEAU,
    label: "Factures et abonnement",
    iconName: "credit-card",
    renderContent: renderPanneau,
    bind: brancher
  };
}

/** Le mois qu'on regarde — celui en cours, tant qu'on n'en choisit pas d'autre. */
function moisRegarde() {
  return lecture.mois || moisEnCours();
}

/** Le pas qu'on regarde — le jour, tant qu'on n'en choisit pas d'autre. */
function pasRegarde() {
  return lePasValide(lecture.pas);
}

/**
 * La fenêtre que ces deux choix désignent.
 *
 * **Une seule fonction, et les deux endroits l'appellent** — celui qui dessine
 * et celui qui lit. Calculée deux fois, elle finirait par diverger d'un jour, et
 * l'on afficherait les bornes d'un mois en lisant celles d'un autre (règle 10).
 */
function fenetreRegardee() {
  return laFenetreDe({ pas: pasRegarde(), mois: moisRegarde() });
}

/** Ce que l'on redemande à la base est désigné par les deux choix à la fois. */
function laCleDeLaLecture() {
  return laCleDeLaFenetre({ pas: pasRegarde(), mois: moisRegarde() });
}

function renderPanneau() {
  const mois = moisRegarde();

  return `
    <section class="settings-panel" data-side-nav-panel="${PANNEAU}" data-conso-panneau>
      ${/*
        **Le bouton de période est sur la ligne du titre.** C'est ce que l'écran
        entier regarde — le total, les usages, la courbe, les chantiers —, et le
        poser plus bas ferait croire qu'il ne commande que le bloc qui le suit.
      */""}
      <header class="settings-panel__head settings-panel__head--avec-action">
        <div>
          <h2 class="settings-panel__title">Factures et abonnement</h2>
          <p class="settings-panel__subtitle">
            Ce que l'IA a consommé pour vous, appel par appel, sur ${
              ceQueLaFenetreDit({ pas: pasRegarde(), mois })}.
          </p>
        </div>
        ${renderLeChoixDeLaPeriode({ mois })}
      </header>

      <div data-conso-corps>${renderLeCorps()}</div>
    </section>
  `;
}

/**
 * Le corps, écrit **à un seul endroit**.
 *
 * Il l'était à deux — le rendu du panneau et le redessin —, avec la même
 * douzaine d'arguments recopiée : le pas ajouté d'un côté et pas de l'autre
 * aurait donné une courbe qui change au premier affichage puis plus jamais
 * (règle 10).
 */
function renderLeCorps() {
  if (lecture.enCours) return renderAttente("Lecture de votre consommation");

  return renderConsommation({
    appels: lecture.echec ? null : (lecture.appels ?? []),
    bornes: fenetreRegardee(),
    pas: pasRegarde(),
    parProjets: true,
    nomDuProjet,
    // **Le titre dit la fenêtre, pas le mois cliqué.** Un total de douze mois
    // annoncé comme celui d'un seul est un montant faux de onze mois.
    titreDuTotal: `Ma consommation — ${ceQueLaFenetreDit({ pas: pasRegarde(), mois: moisRegarde() })}`,
    detailDuTotal: "Vos appels uniquement, tous projets confondus.",
    refus: lecture.refusEchec ? null : (lecture.refus ?? [])
  });
}



/**
 * Écouter les deux menus.
 *
 * ## Pourquoi sur le panneau, et une seule fois
 *
 * `ghaction:action` remonte par bulles jusqu'ici. Brancher l'écoute sur le
 * document ferait réagir cet onglet aux menus des autres écrans de réglages ;
 * la brancher à chaque venue en empilerait une par visite, et un clic lancerait
 * trois lectures de la même période.
 *
 * ## Les deux choix ne coûtent pas la même chose
 *
 * Changer de mois ou de pas change **la fenêtre à lire** : dans les deux cas il
 * faut redemander à la base. On ne sépare donc pas « ce qui redessine » de
 * « ce qui relit » — il n'y a qu'un chemin, et c'est ce qui évite d'afficher la
 * courbe d'une fenêtre sous le titre d'une autre.
 */
function ecouterLesChoix(panneau) {
  if (panneau.dataset.consoEcoute === "oui") return;
  panneau.dataset.consoEcoute = "oui";

  panneau.addEventListener("ghaction:action", (evenement) => {
    const demande = ceQueLeMenuDemande(evenement?.detail?.action);
    if (!demande) return;

    if (demande.quoi === "mois") lecture.mois = demande.valeur;
    else lecture.pas = demande.valeur;

    // On relit, et l'on n'efface pas ce qui est à l'écran avant : `brancher`
    // pose l'attente, qui dit que l'écran travaille.
    brancher(panneau);
  });
}

/**
 * Le nom d'un projet, quand l'écran le connaît.
 *
 * Quand il ne le connaît pas, le service garde l'identifiant plutôt qu'un
 * libellé inventé : on peut alors aller voir lequel c'est.
 */
function nomDuProjet(projetId) {
  const projets = Array.isArray(store.projects) ? store.projects : [];
  const trouve = projets.find((projet) => String(projet?.backendId ?? projet?.id ?? "") === projetId);
  return String(trouve?.name ?? trouve?.title ?? "").trim();
}

function brancher(panneau) {
  if (!panneau) return;

  // **Le contrôleur des boutons à menu**, branché une fois pour le document. Les
  // deux menus de cet écran sont ceux de Mdall : il n'y a pas d'ouverture à
  // écrire ici, et ils se referment comme tous les autres.
  bindGhActionButtons();
  ecouterLesChoix(panneau);

  const cle = laCleDeLaLecture();
  // Déjà lu pour cette fenêtre : on ne redemande pas à chaque venue sur l'onglet.
  if (lecture.cle === cle && (lecture.appels !== null || lecture.echec)) return;
  if (lecture.enCours) return;

  lecture.enCours = true;
  redessiner(panneau);

  (async () => {
    try {
      const [{ maConsommation }, { mesRefus }] = await Promise.all([
        import("../../services/consommation-ia-supabase.js"),
        import("../../services/journal-des-refus-supabase.js")
      ]);

      // L'identité vient du magasin, où la session l'a déjà posée : la
      // redemander à l'authentification ferait un aller-retour pour une valeur
      // qu'on a sous la main, et deux endroits où la lire (règle 10).
      const ownerId = String(store.user?.id ?? "").trim();
      // **Les deux lectures ensemble.** Ce qui a coûté et ce qui n'a pas abouti
      // se lisent d'un même mouvement ; en série, on attendrait deux fois pour
      // un seul écran. Et l'échec de l'une n'emporte pas l'autre : chacune dit
      // « je ne sais pas » pour elle-même.
      // **La fenêtre vient du pas**, et pas seulement du mois : demander « par
      // mois » en ne lisant qu'un mois donnerait un point unique — une courbe
      // qui ne monte ni ne descend, la réponse la plus trompeuse possible.
      const fenetre = fenetreRegardee();
      const [lues, pannes] = await Promise.all([
        ownerId ? maConsommation({ ...fenetre, ownerId }) : null,
        ownerId ? mesRefus({ ...fenetre, ownerId }) : null
      ]);

      lecture.cle = laCleDeLaLecture();
      lecture.refusEchec = pannes === null;
      lecture.refus = pannes;
      // `null` de la base : on ne sait pas. Le dire, plutôt que d'afficher zéro
      // euro, qui ferait croire à une facture nulle (règle 5).
      lecture.echec = lues === null;
      lecture.appels = lues;
    } catch {
      lecture.cle = laCleDeLaLecture();
      lecture.echec = true;
      lecture.appels = null;
      lecture.refusEchec = true;
      lecture.refus = null;
    } finally {
      lecture.enCours = false;
      redessiner(panneau);
    }
  })();
}

/**
 * Redessiner **le corps seul**, et dans le panneau qui est à l'écran.
 *
 * ## Le spinner qui ne s'arrêtait jamais
 *
 * Le panneau reçu au branchement peut être remplacé pendant la lecture : les
 * réglages se redessinent, et le nœud qu'on tenait quitte le document. La
 * lecture aboutissait, `redessiner` trouvait son panneau détaché, renonçait — et
 * le rond tournait indéfiniment sur un écran dont les données étaient pourtant
 * là. Partir et revenir les affichait, ce qui rendait le défaut incompréhensible
 * : les mêmes données, deux comportements.
 *
 * On cherche donc le panneau **vivant** d'abord. Réécrire le corps seul reste la
 * règle : remplacer le panneau entier détacherait à son tour le nœud que
 * l'appelant tient — et il emporterait l'écoute des menus avec lui.
 *
 * **Le bouton de période est hors du corps**, dans l'en-tête : son libellé doit
 * donc être remis à jour à la main. C'est le prix de ne pas réécrire le panneau,
 * et il est moins cher que le spinner éternel.
 */
function redessiner(panneau) {
  const vivant = typeof document !== "undefined"
    ? document.querySelector(`[data-side-nav-panel="${PANNEAU}"][data-conso-panneau]`)
    : null;

  const cible = vivant ?? (panneau?.isConnected ? panneau : null);
  if (!cible) return;

  const tete = cible.querySelector("[data-action-id='consoPeriode']");
  if (tete) tete.outerHTML = renderLeChoixDeLaPeriode({ mois: moisRegarde() });

  const corps = cible.querySelector("[data-conso-corps]");
  if (corps) corps.innerHTML = renderLeCorps();
}
