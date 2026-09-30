/**
 * Le carburant : **ce que Mdall a reçu, et ce que cela permet**.
 *
 * ## Le premier écran de la console qui lise vraiment quelque chose
 *
 * Et il ne lit aucun contenu. La fonction de base ne rend que des nombres et
 * deux dates : pas un objet, pas une adresse, pas un nom de chantier
 * (`docs/la-console-de-ladministrateur.md`, § 3).
 *
 * ## Ce qu'il montre, dans cet ordre, et l'ordre est le sujet
 *
 * **Ce que cela permet**, d'abord. C'est la seule ligne qui décide de quelque
 * chose, et elle doit pouvoir dire non. Un tableau de bord qui répond toujours
 * « ça progresse » n'aide à décider de rien.
 *
 * **La répartition**, ensuite. « 40 000 mails » est un chiffre de plaquette ;
 * quarante mille répartis sur mille chantiers sont quarante mille fois rien.
 *
 * **Ce qui n'est pas fait**, enfin, et nommément. La question posée était
 * l'avancement de l'anonymisation et de l'extraction : aucune n'existe. Des
 * barres à zéro auraient présenté une intention comme un chantier en cours
 * (règle 12).
 */

import {
  ASSEZ_DE_MATIERE, CE_QUI_NEST_PAS_FAIT, compteDit, laRepartition, motDeLaTranche,
  phraseDeCeQueCaPermet, phraseDuGisement
} from "../partage/js/services/les-comptes-du-carburant.js";
import {
  lesComptesDuCarburant
} from "../partage/js/services/les-comptes-du-carburant-supabase.js";

const echapper = (valeur) => String(valeur ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

/** Le jour d'un instant, écrit en français. */
function leJour(quand) {
  const lu = Date.parse(String(quand ?? ""));
  if (!Number.isFinite(lu)) return "";
  return new Date(lu).toLocaleDateString("fr-FR",
    { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export function renderLeCarburant() {
  return `<div id="carburantHote"><section class="conso-usages">
    <p class="conso-usages__mot">Lecture des comptes…</p>
  </section></div>`;
}

function renderLaRepartition(comptes) {
  const lignes = laRepartition(comptes);
  if (!lignes.some((une) => une.combien)) return "";

  return `
    <ul class="forme-reference">
      ${lignes.map((une) => `
        <li class="forme-reference__ligne">
          <span class="forme-reference__quoi">${echapper(une.dit)}</span>
          <span class="forme-reference__chiffres mono-small">${
            echapper(`${compteDit(une.combien)} ${une.combien > 1 ? "chantiers" : "chantier"}`)}</span>
          <span class="forme-reference__sur mono-small">${
            echapper(motDeLaTranche(une))}</span>
        </li>
      `).join("")}
    </ul>
  `;
}

function renderCeQuiNestPasFait() {
  return `
    <section class="conso-usages">
      <h3 class="conso-usages__titre">Ce que le système n'en fait pas encore</h3>
      <p class="conso-usages__mot">
        Nommé plutôt que dessiné en barres de progression : une étape qui n'a pas
        été écrite n'avance pas de zéro pour cent, elle n'existe pas.
      </p>
      ${CE_QUI_NEST_PAS_FAIT.map((un) => `
        <div class="forme-suite">
          <h4 class="forme-suite__titre">${echapper(un.quoi)}</h4>
          <p class="forme-suite__dit">${echapper(un.ou)}</p>
          <p class="conso-usages__mot">${echapper(un.pourquoi)}</p>
        </div>
      `).join("")}
    </section>
  `;
}

function renderTout(comptes) {
  const dit = phraseDuGisement(comptes);
  const depuis = leJour(comptes?.depuis);
  const jusqua = leJour(comptes?.jusqua);

  return `
    <section class="conso-usages">
      <h3 class="conso-usages__titre">Le carburant</h3>
      ${dit ? `<p class="conso-usages__mot">${echapper(dit)}</p>` : ""}
      ${depuis && jusqua
        ? `<p class="conso-usages__mot">${depuis === jusqua
            ? `Déposés le ${echapper(depuis)}.`
            : `Déposés du ${echapper(depuis)} au ${echapper(jusqua)}.`}</p>`
        : ""}
      <p class="conso-usages__mot"><b>${echapper(phraseDeCeQueCaPermet(comptes))}</b></p>
      ${comptes?.deposants
        ? `<p class="conso-usages__mot">${echapper(
            `${compteDit(comptes.deposants)} ${comptes.deposants > 1
              ? "personnes ont déposé" : "personne a déposé"}.`)}</p>`
        : ""}
    </section>

    <section class="conso-usages">
      <h3 class="conso-usages__titre">Combien de chantiers portent assez de matière</h3>
      <p class="conso-usages__mot">
        Le total ne dit rien : la prédiction se nourrit de <b>suites</b>, et une
        suite se lit dans un chantier, pas en travers de mille. Le seuil de
        ${ASSEZ_DE_MATIERE} messages est une hypothèse déclarée, pas une mesure —
        elle vient de ce qu'en dessous, on n'aurait même pas de quoi vérifier si
        l'on prédit bien.
      </p>
      ${renderLaRepartition(comptes) || `<p class="forme-manques">Aucun chantier ne porte de mail.</p>`}
    </section>

    ${renderCeQuiNestPasFait()}
  `;
}

export async function monterLeCarburant(hote) {
  const ou = hote?.querySelector?.("#carburantHote");
  if (!ou) return;

  const comptes = await lesComptesDuCarburant();

  // **Ne pas savoir n'est pas savoir qu'il n'y a rien** (règle 5). « Aucun mail
  // déposé » et « la base n'a pas répondu » mènent à des décisions opposées.
  if (comptes === null) {
    ou.innerHTML = `<section class="conso-usages"><p class="forme-manques">
      Les comptes n'ont pas pu être lus. Ce n'est pas qu'il n'y a rien : on ne
      sait pas ce qu'il y a.</p></section>`;
    return;
  }

  ou.innerHTML = renderTout(comptes);
}
