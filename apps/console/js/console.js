/**
 * La console d'administration : l'entrée.
 *
 * ## Ce que cette page est
 *
 * Un **autre site**, servi à côté de l'application (`console/`), construit par
 * `scripts/prepare-console.mjs`. Elle emporte la feuille de style et les
 * services de Mdall — jamais recopiés —, et ne partage aucun écran.
 *
 * ## La porte
 *
 * Elle ne se garde pas ici. Être servi n'est pas être autorisé : ce qui
 * protège, c'est que la base ne rend à personne autre chose que sa propre
 * ligne (`migrations/202610200001_qui_tient_la_console.sql`), et qu'aucune
 * donnée de projet n'est atteignable depuis cette page. Un test JavaScript qui
 * « refuserait l'accès » se contourne en ouvrant les outils de développement ;
 * une politique de base, non.
 *
 * On pose quand même la question, et pour une seule raison : **dire pourquoi
 * l'écran est vide**. Quelqu'un qui arrive ici par un lien et ne voit rien doit
 * lire que cette porte n'est pas la sienne, plutôt que de croire à une panne.
 *
 * Et on la pose **par le même service que la barre du haut** : deux façons de
 * demander « suis-je administrateur ? » finiraient par ne plus répondre la
 * même chose, et l'une des deux serait celle qu'on ne relit jamais (règle 10).
 *
 * ## Les écrans
 *
 * Le **versoir** — ouvrir des `.msg`, voir ce qu'ils portent, verser les pièces
 * — et **l'archive** — retrouver ce qui a été versé, et l'ouvrir. Pas encore de
 * tableau de bord : les comptes d'exploitation viendront quand il y aura des
 * comptes à faire (`docs/la-console-de-ladministrateur.md`).
 */

import { LA_CONSOLE } from "../partage/js/services/la-porte-de-la-console.js";
import { suisJeAdministrateur } from "../partage/js/services/la-porte-de-la-console-supabase.js";
import { monterLeVersoir, renderLeVersoir } from "./le-versoir.js";
import { monterLArchive, renderLArchive } from "./larchive.js";

const hote = document.getElementById("app");

/**
 * Les écrans de la console, et leur ordre.
 *
 * **Deux, et ils se suivent dans l'ordre du geste** : on dépose, puis on
 * retrouve. Une liste nommée ici plutôt que dessinée en dur, parce que le nom
 * d'un écran et l'adresse qui y mène ne doivent vivre qu'à un endroit
 * (règle 10).
 */
const LES_ECRANS = [
  { cle: "versoir", nom: "Le versoir", dessiner: renderLeVersoir, monter: monterLeVersoir },
  { cle: "archive", nom: "L'archive", dessiner: renderLArchive, monter: monterLArchive }
];

/** L'écran demandé par l'adresse, ou le premier. */
function lEcranDemande() {
  const demande = String(location.hash || "").replace(/^#/, "").trim();
  return LES_ECRANS.find((un) => un.cle === demande) ?? LES_ECRANS[0];
}

/**
 * La barre des écrans.
 *
 * Elle emprunte les classes de Mdall — aucune n'est recalibrée ici : un
 * interrupteur dessiné autrement se verrait comme une greffe.
 */
function renderLesOnglets(courant) {
  return `
    <div class="verdict-switch" role="tablist">
      ${LES_ECRANS.map((un) => `
        <span class="verdict-switch__item${un === courant ? " is-active" : ""}">
          <a class="gh-btn gh-btn--sm ${un === courant ? "gh-btn--primary" : "gh-btn--default"}"
             href="#${un.cle}" role="tab"
             aria-selected="${un === courant}">${un.nom}</a>
        </span>
      `).join("")}
    </div>
  `;
}

function renderLaPorteFermee() {
  return `
    <div class="page-large">
      <section class="conso-usages">
        <h3 class="conso-usages__titre">${LA_CONSOLE.nom}</h3>
        <p class="conso-usages__mot">
          Cette porte n'est pas la vôtre. Ce n'est pas une panne : votre compte
          n'ouvre pas la console de Mdall.
        </p>
        <p class="conso-usages__mot"><a href="../index.html">Revenir à Mdall</a></p>
      </section>
    </div>
  `;
}

async function main() {
  if (!hote) return;

  hote.innerHTML = `
    <div class="page-large">
      <section class="conso-usages">
        <p class="conso-usages__mot">Un instant…</p>
      </section>
    </div>
  `;

  if (!await suisJeAdministrateur()) {
    hote.innerHTML = renderLaPorteFermee();
    return;
  }

  // **La porte ne se redemande pas à chaque écran.** Elle a répondu une fois ;
  // la reposer à chaque changement d'onglet ajouterait un aller-retour et un
  // clignotement, sans rien protéger de plus — ce qui protège est la politique
  // de la base, pas ce test.
  const dessiner = () => {
    const ecran = lEcranDemande();
    hote.innerHTML = `
      <div class="page-large">${renderLesOnglets(ecran)}</div>
      ${ecran.dessiner()}
    `;
    ecran.monter(hote);
  };

  window.addEventListener("hashchange", dessiner);
  dessiner();
}

main();
