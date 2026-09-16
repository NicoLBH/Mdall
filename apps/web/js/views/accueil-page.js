/**
 * Ce que l'écran d'accueil dessine.
 *
 * ## Pourquoi c'est un fichier à part
 *
 * L'écran parle à la base, et un module qui parle à la base **ne s'importe pas
 * dans un test** : l'authentification tire son client d'un CDN, et l'import
 * lève avant la première ligne. Le dessin, lui, n'a besoin de rien — séparé, il
 * s'exécute, et l'on regarde ce qui sort. C'est la forme prise par les autres
 * écrans transverses, pour la même raison.
 *
 * ## Ce que l'accueil répond
 *
 * Trois questions, et une par colonne :
 *
 *  - **où je travaille en ce moment** — le rail, et son classement par jours
 *    travaillés (`services/projets-actifs.js`) ;
 *  - **ce que je veux demander** — le Copilote, au centre, avec le choix du
 *    projet ; par défaut aucun, et la discussion porte alors sur la façon de
 *    travailler plutôt que sur un chantier ;
 *  - **ce qui vient de se passer** — quatre lignes à droite, chacune nommant
 *    son projet.
 *
 * ## Il n'invente aucune largeur
 *
 * Le rail est celui de tous les rails, le bouton vert est `gh-btn--primary`, le
 * champ de recherche est `gh-input`, le choix du projet est le menu de sélection
 * de `ui/gh-split-button.js`, et la saisie reprend les classes du Copilote. Ce
 * qui est propre à cet écran tient en une grille de trois colonnes — le reste
 * serait à recalibrer à chaque retouche, et finirait en retard sur l'original.
 */

import { escapeHtml } from "../utils/escape-html.js";
import { svgIcon } from "../ui/icons.js";
import { renderProjectRail, railWidth } from "./ui/project-rail.js";
import { renderNavList, renderNavListGroup, renderNavListItem } from "./ui/nav-list.js";
import { renderGhSelectMenu } from "./ui/gh-split-button.js";
import { renderActionsAVenirHtml } from "./ui/actions-du-copilote.js";
import { renderTitreDEcranHtml } from "./ui/titre-decran.js";
import { GENRE, phraseDesJours } from "../services/projets-actifs.js";
import { LE_COPILOTE } from "../services/ecrans-transversaux.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les repères que l'écran pose et que son écoute cherche.
 *
 * Écrits à deux endroits — le rendu les pose, le branchement les lit — deux
 * écritures d'un même nom se renomment un jour d'un seul côté, en silence
 * (règle 10).
 */
export const GESTES_DE_LACCUEIL = {
  recherche: "data-accueil-recherche",
  saisie: "data-accueil-saisie",
  envoi: "data-accueil-envoi",
  choixDuProjet: "accueilProjet"
};

/**
 * La valeur du choix « Tous les projets ».
 *
 * C'est **le vide**, et volontairement : c'est déjà ce que `currentProjectId`
 * nul veut dire partout ailleurs dans l'application. Une valeur sentinelle de
 * plus — `"tous"`, `"*"` — serait un second mot pour la même chose (règle 4).
 */
export const AUCUN_PROJET = "";

/** Combien de projets le rail montre quand on ne cherche rien. */
export const TOP_PROJETS = 5;

/** Combien de lignes d'actualité. */
export const ACTUALITES = 4;

/** Où mène chaque genre de trace. */
const GENRES = {
  [GENRE.DISCUSSION]: { onglet: "atelier/copilote" },
  [GENRE.PROPOSITION]: { onglet: "propositions" },
  [GENRE.ETUDE]: { onglet: "atelier" }
};

const JOUR = 24 * 60 * 60 * 1000;

/**
 * Depuis quand, en une poignée de mots.
 *
 * On dit le délai plutôt que la date : « il y a deux jours » se compare d'un
 * coup d'œil aux trois lignes voisines, là où trois dates obligent à compter.
 * Au-delà d'un mois, la date reprend sa place — « il y a 214 jours » ne se
 * rapporte plus à rien.
 */
export function depuisQuand(quand = "", maintenant = Date.now()) {
  const lu = Date.parse(texte(quand));
  if (!Number.isFinite(lu)) return "";

  const jours = Math.floor((maintenant - lu) / JOUR);
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return "hier";
  if (jours < 30) return `il y a ${jours} jours`;

  return new Date(lu).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Ce que le rail montre : le classement, ou le résultat de la recherche.
 *
 * **Le champ ne filtre pas le classement, il le remplace.** Chercher « nova »
 * dans les cinq projets les plus actifs ne rendrait rien dès que le projet
 * cherché n'est pas de ceux-là — c'est-à-dire précisément quand on le cherche.
 *
 * @param {object} options
 * @param {{id: string, name?: string}[]|null} options.projets tous les miens,
 *   `null` tant qu'on n'a pas lu
 * @param {{id: string, nom: string, jours: number}[]} options.actifs
 * @param {string} options.cherche ce qui est tapé
 * @returns {{id: string, nom: string, detail: string}[]}
 */
export function projetsDuRail({
  projets = null, actifs = [], cherche = "", combien = TOP_PROJETS
} = {}) {
  const demande = texte(cherche).toLowerCase();

  if (!demande) {
    // **Le plus travaillé en bas.** Le rail se lit en montant depuis la zone de
    // saisie, qui est ce qu'on regarde en arrivant : le projet qu'on a le plus
    // dans les mains est donc le plus près d'elle, et non tout en haut contre le
    // titre. Le classement, lui, ne change pas — c'est l'ordre d'affichage.
    return (Array.isArray(actifs) ? actifs : []).slice(0, combien).reverse().map((projet) => ({
      id: texte(projet?.id),
      nom: texte(projet?.nom) || texte(projet?.id),
      // Le compte s'affiche avec son unité : un score sans unité ne se vérifie
      // pas, et l'on soupçonne un classement qu'on ne sait pas expliquer.
      detail: phraseDesJours(projet?.jours)
    }));
  }

  return (Array.isArray(projets) ? projets : [])
    .filter((projet) => texte(projet?.name).toLowerCase().includes(demande))
    .map((projet) => ({ id: texte(projet?.id), nom: texte(projet?.name), detail: "" }));
}

/** Le rail : le titre, le bouton vert, la recherche, et les projets. */
function renderRailHtml({ projets, actifs, cherche, replie, lu }) {
  const retenus = projetsDuRail({ projets, actifs, cherche });

  return renderProjectRail({
    id: "accueilRail",
    label: "Top projets",
    collapsed: replie,
    navHtml: renderNavList({
      label: "Top projets",
      // **Cette liste-là n'a pas de gouttière à gauche.** Ailleurs, le retrait
      // fait la place du trait bleu de l'entrée courante ; ici aucune entrée
      // n'est « celle qu'on regarde » — ce sont des destinations —, et le
      // retrait ne faisait que décaler la liste du titre qui la surmonte.
      className: "nav-list--accueil",
      html: `
        ${/*
          **Le titre et le bouton sur une ligne.** Le bouton vert est le geste
          qu'on vient faire quand la liste ne contient pas ce qu'on cherche : le
          poser sous le titre lui donnait une ligne à lui, dans un rail où
          chaque ligne compte.
        */""}
        <div class="accueil-rail__tete">
          <h3 class="nav-list__group-label">Top projets</h3>
          <a href="#projects/new" class="gh-btn gh-btn--primary accueil-rail__nouveau"
            title="Créer un projet">
            ${svgIcon("repo", { className: "octicon octicon-repo" })}
            <span>Nouveau</span>
          </a>
        </div>
        <div class="accueil-rail__recherche">
          <input type="search" class="gh-input gh-input--sm" ${GESTES_DE_LACCUEIL.recherche}
            value="${escapeHtml(cherche)}" placeholder="Chercher un projet"
            aria-label="Chercher un projet">
        </div>
        ${renderNavListGroup({
          id: "accueilProjets",
          className: "nav-list__list--sub",
          items: retenus.map((projet) => renderNavListItem({
            // Une entrée qui mène quelque part est un lien : elle s'ouvre dans
            // un onglet, et le clic du milieu marche.
            as: "a",
            href: `#project/${encodeURIComponent(projet.id)}/documents`,
            label: projet.nom,
            title: projet.nom,
            className: "nav-list__item--sub",
            trailing: projet.detail,
            iconHtml: svgIcon("repo", { className: "octicon octicon-repo" })
          }))
        })}
        ${retenus.length ? "" : `<p class="accueil-rail__vide">${
          // **On dit lequel des deux.** « Rien » quand la lecture n'a pas encore
          // eu lieu et « rien » quand il n'y a rien sont deux phrases
          // différentes, et la première n'est pas vraie (règle 5).
          !lu ? "Lecture en cours…"
            : texte(cherche) ? "Aucun projet de ce nom."
              : "Aucun travail enregistré ces trois derniers mois."
        }</p>`}
      `
    })
  });
}

/**
 * Le Copilote au centre : le choix du projet, et la saisie.
 *
 * **Sans invite au-dessus.** Le Copilote d'un projet en porte une parce qu'il
 * doit dire d'où il parle — quelle mémoire il lit. Ici, l'écran entier est
 * l'accueil : la phrase répétait ce que le titre et le choix du projet disent
 * déjà, et elle poussait la saisie hors du premier regard.
 *
 * Ce qui est en dessous est **celui du Copilote, sans une ligne de plus**
 * (`ui/actions-du-copilote.js`) : c'est ce qui dit que c'est le même outil.
 */
function renderCopiloteHtml({ projets, projetChoisi, brouillon }) {
  const tous = Array.isArray(projets) ? projets : [];
  const choisi = tous.find((projet) => texte(projet?.id) === texte(projetChoisi));

  return `
    <div class="accueil-copilote">
      <div class="copilote-compose gh-field-focus accueil-copilote__compose">
        <textarea class="copilote-input" rows="3" ${GESTES_DE_LACCUEIL.saisie}
          aria-label="Poser une question au copilote"
          placeholder="${choisi
            ? "Posez une question sur ce projet…"
            : "Posez une question, tous projets confondus…"}">${escapeHtml(brouillon)}</textarea>

        <div class="copilote-compose__bar">
          <div class="copilote-compose__left">
            ${renderGhSelectMenu({
              id: GESTES_DE_LACCUEIL.choixDuProjet,
              value: texte(projetChoisi),
              size: "sm",
              icon: svgIcon("repo", { className: "octicon octicon-repo" }),
              options: [
                // **Le premier, et c'est le défaut.** L'accueil n'est d'aucun
                // projet : en préélire un reviendrait à répondre à sa place.
                { value: AUCUN_PROJET, label: "Tous les projets" },
                ...tous.map((projet) => ({
                  value: texte(projet?.id), label: texte(projet?.name) || texte(projet?.id)
                }))
              ]
            })}
          </div>
          <div class="copilote-compose__tools">
            ${/*
              **Les mêmes outils que dans le Copilote, et éteints.** Ils disent
              que la saisie est bien la sienne — la place est prise, et la suite
              ne sera pas une surprise. Joindre une note et compter les crédits
              demandent une discussion ouverte : elle n'existe qu'une fois la
              question posée, et un bouton qui ferait semblant coûterait plus
              cher qu'un bouton éteint.
            */""}
            <button type="button" class="copilote-tool" disabled
              aria-label="Joindre une note de calcul — dans la discussion"
              title="La note se joint une fois la discussion ouverte">${svgIcon("paperclip")}</button>
            <button type="button" class="copilote-tool" disabled
              aria-label="Crédits inclus — dans la discussion"
              title="Les crédits se comptent une fois la discussion ouverte">${svgIcon("meter")}</button>

            <span class="copilote-compose__divider" role="separator" aria-orientation="vertical"></span>

            <button type="button" class="copilote-send" ${GESTES_DE_LACCUEIL.envoi}
              aria-label="Ouvrir le copilote" title="Ouvrir le copilote">${svgIcon("paper-airplane")}</button>
          </div>
        </div>
      </div>

      ${renderActionsAVenirHtml()}
    </div>
  `;
}

/** Les actualités : quatre lignes, chacune nommant son projet. */
function renderActualitesHtml({ actualites, maintenant, lu }) {
  const dernieres = (Array.isArray(actualites) ? actualites : []).slice(0, ACTUALITES);

  return `
    <aside class="accueil-actualites" aria-label="Activité récente">
      <h2 class="accueil-actualites__titre">Activité récente</h2>
      ${dernieres.length ? `
        <ol class="accueil-actualites__liste">
          ${dernieres.map((trace) => {
            // Le genre ne se dessine plus : il dit seulement **où mène** la ligne.
            const genre = GENRES[texte(trace?.genre)] ?? GENRES[GENRE.DISCUSSION];
            const projet = texte(trace?.projet);
            return `
              <li class="accueil-actualite">
                ${/*
                  **Un rond, et le filet qui les relie.** Il ne porte aucune
                  information — le genre est dit par le lien et par où il mène.
                  Sa seule fonction est de faire une colonne : quatre lignes
                  alignées sur un filet se lisent comme une suite, quatre lignes
                  posées l'une sous l'autre se lisent comme une liste.
                */""}
                <span class="accueil-actualite__jalon" aria-hidden="true"></span>
                <div class="accueil-actualite__corps">
                  ${/*
                    **Chaque ligne mène là où la chose est.** Une actualité qui ne
                    mène nulle part n'est qu'une phrase : c'est justement ce que
                    l'accueil a de plus qu'un écran de projet.
                  */""}
                  <a class="accueil-actualite__quoi"
                    href="#project/${encodeURIComponent(projet)}/${genre.onglet}"
                    title="${escapeHtml(texte(trace?.quoi))}">${escapeHtml(texte(trace?.quoi))}</a>
                  <p class="accueil-actualite__ou">
                    <span class="accueil-actualite__projet">${escapeHtml(texte(trace?.nomDuProjet) || projet)}</span>
                    <span class="accueil-actualite__quand">${escapeHtml(depuisQuand(trace?.quand, maintenant))}</span>
                  </p>
                </div>
              </li>
            `;
          }).join("")}
        </ol>
      ` : `<p class="accueil-actualites__vide">${
        lu ? "Rien depuis un an." : "Lecture en cours…"
      }</p>`}
    </aside>
  `;
}

/**
 * La page entière.
 *
 * @param {object} options
 * @param {{id: string, name?: string}[]|null} [options.projets] `null` tant
 *   qu'on n'a pas lu — ce n'est pas « aucun projet », et l'écran le dit plutôt
 *   que d'afficher une liste vide comme si c'était la vérité (règle 5).
 * @param {object[]} [options.actifs] ce que rend `projetsLesPlusActifs`
 * @param {object[]} [options.actualites] ce que rend `actualitesRecentes`
 * @param {string} [options.cherche] ce qui est tapé dans le rail
 * @param {string} [options.projetChoisi] le projet de la future discussion
 * @param {string} [options.brouillon] ce qui est tapé dans la saisie
 * @param {string} [options.erreur] ce qu'on n'a pas su lire
 */
export function renderPageDAccueil({
  projets = null, actifs = [], actualites = [], cherche = "", projetChoisi = AUCUN_PROJET,
  brouillon = "", erreur = "", maintenant = Date.now(),
  railReplie = false, railLargeur = 248
} = {}) {
  const lu = Array.isArray(projets);

  return `
    <section class="project-simple-page project-simple-page--settings project-simple-page--accueil"
      style="--project-rail-width:${railWidth(railLargeur, railReplie)}px">
      <div class="project-simple-scroll">
        <div class="page-large">
        ${/*
          **La structure du rail est celle de tous les autres écrans.** Le rail
          est en position fixe, le contenu s'écarte par une marge, et la largeur
          passe par une variable CSS — c'est elle que la poignée fait bouger sans
          rien redessiner. Une grille écrite ici compterait la largeur deux fois.
        */""}
        <div class="project-rail-layout${railReplie ? " project-rail-layout--collapsed" : ""}">
          ${renderRailHtml({ projets, actifs, cherche, replie: railReplie, lu })}
          <div class="project-rail-layout__content settings-content project-page-shell project-page-shell--content">
            ${erreur ? `<div class="settings-inline-error">${escapeHtml(erreur)}</div>` : ""}
            <div class="accueil-colonnes">
              ${/*
                **Le titre est dans la colonne centrale, et non au-dessus des
                deux.** Il annonce ce qu'on vient faire ici ; posé en travers de
                l'écran, il aurait aussi annoncé les actualités, qui ont déjà le
                leur. Et c'est la ligne de titre de tous les écrans — une taille
                ou un espacement écrits ici seraient à recalibrer à chaque
                retouche (règle 10).
              */""}
              <div class="accueil-colonnes__centre">
                ${renderTitreDEcranHtml({ titre: "Accueil" })}
                ${renderCopiloteHtml({ projets, projetChoisi, brouillon })}
              </div>
              ${renderActualitesHtml({ actualites, maintenant, lu })}
            </div>
          </div>
        </div>
        </div>
      </div>
    </section>
  `;
}

/**
 * Où mène la question qu'on vient d'écrire.
 *
 * **Deux destinations, une seule règle** : sans projet, l'écran transverse ;
 * avec, le Copilote de ce projet-là. L'adresse est composée ici plutôt qu'à
 * l'endroit du clic, parce que c'est du raisonnement pur — on peut donc la
 * vérifier sans monter l'écran.
 */
export function ouMeneLaQuestion(projetChoisi = AUCUN_PROJET) {
  const projet = texte(projetChoisi);
  return projet
    ? `#project/${encodeURIComponent(projet)}/atelier/copilote`
    : LE_COPILOTE.route;
}
