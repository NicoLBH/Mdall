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
import {
  laPartReconnue, lesDomainesJamaisReconnus, lesDomainesRanges,
  phraseDeLaReconnaissance, phraseDunDomaineDuSysteme
} from "../partage/js/services/les-domaines-du-systeme.js";
import {
  lesDomainesDuSysteme
} from "../partage/js/services/les-domaines-du-systeme-supabase.js";
import { DOMAINS, domainLabel } from "../partage/js/services/assertion-taxonomy.js";

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

/**
 * Ce que le système reconnaît, domaine par domaine.
 *
 * ## Pourquoi c'est ici et pas dans un projet
 *
 * L'écran des Indicateurs montre la même chose **pour un chantier**. La
 * question de la console est autre : « le système progresse-t-il ? ». Elle ne
 * se lit pas sur un chantier — un seul chantier peut ne parler que de
 * structure sans que rien n'aille mal — mais sur l'ensemble.
 *
 * ## Et cela ne lit aucun contenu
 *
 * Un domaine est **un mot d'un vocabulaire fermé de huit**, écrit dans une
 * colonne. Il ne désigne ni chantier, ni personne, ni affirmation. La fonction
 * de base ne rend que ce mot et des nombres : par sa signature, elle ne peut
 * pas rendre autre chose.
 */
function renderLesDomaines(range) {
  const part = laPartReconnue(range);
  const jamais = lesDomainesJamaisReconnus(range, DOMAINS);

  return `
    <section class="conso-usages">
      <h3 class="conso-usages__titre">Ce que le système reconnaît</h3>
      <p class="conso-usages__mot">
        Un taux de précision dit qu'on se trompe ; il ne dit jamais sur quoi.
        Domaine par domaine : combien d'affirmations le portent, et sur combien
        de chantiers il se montre. Un domaine vu mille fois sur un seul chantier
        ne dit pas qu'une taxonomie marche.
      </p>
      <p class="conso-usages__mot"><b>${echapper(phraseDeLaReconnaissance(range))}</b></p>
      ${part === null ? "" : `
        <ul class="forme-reference">
          ${range.reconnus.map((une) => `
            <li class="forme-reference__ligne">
              <span class="forme-reference__quoi">${echapper(domainLabel(une.domaine))}</span>
              <span class="forme-reference__chiffres mono-small">${
                echapper(`${compteDit(une.affirmations)} ${une.affirmations > 1
                  ? "affirmations" : "affirmation"}`)}</span>
              <span class="forme-reference__sur mono-small">${
                echapper(phraseDunDomaineDuSysteme(une))}</span>
            </li>
          `).join("")}
        </ul>
        ${range.reconnus.length ? "" : `<p class="forme-manques">
          Aucune affirmation ne porte de domaine. La classification n'attrape
          rien — ce n'est pas que les chantiers n'en parlent pas.</p>`}
        ${jamais.length ? `<p class="conso-usages__mot">${echapper(
          `Jamais reconnus : ${jamais.map(domainLabel).join(", ")}. `
          + "Soit les chantiers n'en parlent pas, soit la classification ne les "
          + "voit pas — et c'est la question qu'il faut pouvoir se poser.")}</p>` : ""}
        ${range.nonClasse ? `<p class="conso-usages__mot">${echapper(
          `${compteDit(range.nonClasse.affirmations)} affirmations sans domaine, `
          + `sur ${range.nonClasse.chantiers} ${range.nonClasse.chantiers > 1
            ? "chantiers" : "chantier"}. Ce n'est pas une erreur : ce qu'on n'a `
          + "pas su classer s'écrit, plutôt que de se ranger au jugé.")}</p>` : ""}
      `}
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

    ${/*
      **Un hôte, rempli plus tard.** La lecture des domaines est une seconde
      requête ; l'attendre ici retarderait l'affichage des comptes, qui sont ce
      qu'on vient voir en premier.
    */""}
    <div id="carburantDomaines"></div>

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

  // **Après les comptes, et pas avec eux.** Les deux lectures sont
  // indépendantes : celle des domaines peut échouer sans emporter celle du
  // carburant, qui répond à la question la plus urgente.
  const lignes = await lesDomainesDuSysteme();
  const apres = ou.querySelector("#carburantDomaines");
  if (!apres) return;

  apres.innerHTML = lignes === null
    ? `<section class="conso-usages"><p class="forme-manques">
        Les domaines n'ont pas pu être lus. Ce n'est pas qu'il n'y en a aucun :
        on ne sait pas lesquels il y a.</p></section>`
    : renderLesDomaines(lesDomainesRanges(lignes));
}
