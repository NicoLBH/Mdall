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
import { renderConsommation } from "../consommation/ecran-de-consommation.js";
import { bornesDuMois, moisEnCours, moisEnFrancais } from "../../services/consommation-ia.js";

const PANNEAU = "personal-settings-facturation";

/** Ce qu'on a lu, et pour quel mois. Gardé entre deux venues sur l'onglet. */
const lecture = { mois: "", appels: null, enCours: false, echec: false };

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

function renderPanneau() {
  const mois = moisRegarde();
  const bornes = bornesDuMois(mois);

  return `
    <section class="settings-panel" data-side-nav-panel="${PANNEAU}" data-conso-panneau>
      <header class="settings-panel__head">
        <h2 class="settings-panel__title">Factures et abonnement</h2>
        <p class="settings-panel__subtitle">
          Ce que l'IA a consommé pour vous, appel par appel, sur ${moisEnFrancais(mois)}.
        </p>
      </header>

      <div data-conso-corps>
        ${lecture.enCours ? renderEnCours() : renderConsommation({
          appels: lecture.echec ? null : (lecture.appels ?? []),
          bornes,
          parProjets: true,
          nomDuProjet: nomDuProjet,
          titreDuTotal: `Ma consommation — ${moisEnFrancais(mois)}`,
          detailDuTotal: "Vos appels uniquement, tous projets confondus."
        })}
      </div>
    </section>
  `;
}

function renderEnCours() {
  return `<section class="conso-vide"><p>Lecture de votre consommation…</p></section>`;
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

  const mois = moisRegarde();
  // Déjà lu pour ce mois : on ne redemande pas à chaque venue sur l'onglet.
  if (lecture.mois === mois && (lecture.appels !== null || lecture.echec)) return;
  if (lecture.enCours) return;

  lecture.enCours = true;
  redessiner(panneau);

  (async () => {
    try {
      const { maConsommation } = await import("../../services/consommation-ia-supabase.js");

      // L'identité vient du magasin, où la session l'a déjà posée : la
      // redemander à l'authentification ferait un aller-retour pour une valeur
      // qu'on a sous la main, et deux endroits où la lire (règle 10).
      const ownerId = String(store.user?.id ?? "").trim();
      const lues = ownerId ? await maConsommation({ ...bornesDuMois(mois), ownerId }) : null;

      lecture.mois = mois;
      // `null` de la base : on ne sait pas. Le dire, plutôt que d'afficher zéro
      // euro, qui ferait croire à une facture nulle (règle 5).
      lecture.echec = lues === null;
      lecture.appels = lues;
    } catch {
      lecture.mois = mois;
      lecture.echec = true;
      lecture.appels = null;
    } finally {
      lecture.enCours = false;
      redessiner(panneau);
    }
  })();
}

/**
 * Redessiner **le corps seul**, pas le panneau entier.
 *
 * Réécrire le panneau remplacerait le nœud que l'appelant nous a passé, et le
 * second redessin écrirait dans un élément détaché du document — sans erreur, et
 * sans rien à l'écran.
 */
function redessiner(panneau) {
  const corps = panneau?.isConnected ? panneau.querySelector("[data-conso-corps]") : null;
  if (!corps) return;

  const mois = moisRegarde();
  corps.innerHTML = lecture.enCours ? renderEnCours() : renderConsommation({
    appels: lecture.echec ? null : (lecture.appels ?? []),
    bornes: bornesDuMois(mois),
    parProjets: true,
    nomDuProjet,
    titreDuTotal: `Ma consommation — ${moisEnFrancais(mois)}`,
    detailDuTotal: "Vos appels uniquement, tous projets confondus."
  });
}
