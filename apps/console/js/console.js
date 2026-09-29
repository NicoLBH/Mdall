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
 * ## Le premier écran
 *
 * Le versoir. Pas un tableau de bord : les comptes d'exploitation viendront
 * quand il y aura des comptes à faire (`docs/la-console-de-ladministrateur.md`).
 * Ce qui presse, c'est de pouvoir ouvrir une archive et voir ce qu'elle porte.
 */

import { LA_CONSOLE } from "../partage/js/services/la-porte-de-la-console.js";
import { suisJeAdministrateur } from "../partage/js/services/la-porte-de-la-console-supabase.js";
import { monterLeVersoir, renderLeVersoir } from "./le-versoir.js";

const hote = document.getElementById("app");

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

  hote.innerHTML = renderLeVersoir();
  monterLeVersoir(hote);
}

main();
