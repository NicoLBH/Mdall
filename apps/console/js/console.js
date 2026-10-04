/**
 * La console d'administration : l'entrée.
 *
 * ## Ce que cette page est, et ce qu'elle a cessé d'être
 *
 * Un **autre site**, servi à côté de l'application (`console/`), construit par
 * `scripts/prepare-console.mjs`. Elle emporte la feuille de style de Mdall —
 * jamais recopiée — et n'a aucune classe à elle.
 *
 * Elle a porté pendant trois tours un versoir, une archive et un épisode :
 * ouvrir des `.msg`, en tirer des messages et des pièces, les ranger dans trois
 * tables à elle, et lire une chronologie de cet ensemble. C'était une **seconde
 * application**, et elle contredisait sa propre doctrine — un endroit d'où l'on
 * lit un contenu, pas un atelier parallèle.
 *
 * Tout cela est retourné dans l'application, où la chaîne existait déjà : le
 * dépouillement dans **Fichiers**, la chronologie aux **Indicateurs**
 * (`docs/nourrir-mdall.md`, § 8 quinquies). La console attend donc ce pour quoi
 * elle a été ouverte : des **comptes d'exploitation**, quand il y aura des
 * comptes à faire.
 *
 * ## Une page qui n'a rien à montrer doit le dire
 *
 * Elle pouvait rester vide, ou disparaître. Les deux auraient coûté plus :
 * quelqu'un qui a gardé l'adresse en favori arriverait sur une page blanche ou
 * sur une erreur, et croirait à une panne. Elle dit donc **où les écrans sont
 * partis**, avec le lien pour y aller. C'est la même raison que pour la porte
 * fermée, un peu plus bas.
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
 */

import { LA_CONSOLE } from "../partage/js/services/la-porte-de-la-console.js";
import { ONGLETS_DE_LA_CONSOLE } from "../partage/js/services/les-onglets-de-la-console.js";
import { svgIcon } from "../partage/js/ui/icons.js";
import { suisJeAdministrateur } from "../partage/js/services/la-porte-de-la-console-supabase.js";
import {
  LA_SANTE, LES_COMPTES, LES_CONSULTATIONS, LE_TRAFIC, LUSAGE, laPremiereRubriqueDe,
  laRubriqueValide, lesRubriquesDeLonglet, ongletDeLaRubrique
} from "../partage/js/services/les-rubriques-de-la-console.js";
import { renderProjectRail } from "../partage/js/views/ui/project-rail.js";
import {
  renderNavList, renderNavListGroup, renderNavListItem
} from "../partage/js/views/ui/nav-list.js";
import { leCourrielDuCompte, monterLavatar, renderLavatar } from "./lavatar.js";
import { monterLeCarburant, renderLeCarburant } from "./le-carburant.js";
import { monterLesComptes, renderLesComptes } from "./les-comptes.js";
import { monterLexploitation, renderLexploitation } from "./lexploitation.js";

const hote = document.getElementById("app");
const barre = document.getElementById("consoleHeaderHost");

/** Où ramène le nom de l'application, en haut à gauche. */
const LE_LIEN_VERS_MDALL = "../index.html";

/**
 * Où sont partis les écrans de la console.
 *
 * Nommés ici plutôt qu'écrits dans la page : le jour où l'un d'eux déménagera
 * encore, il n'y aura qu'un endroit à corriger (règle 10).
 */
const CE_QUI_A_DEMENAGE = [
  {
    quoi: "Le dépouillement des mails",
    ou: "l'onglet Fichiers d'un projet",
    pourquoi: "un .msg ou un .zip déposé s'y ouvre, et ce qu'il porte se range dans "
      + "le dossier privé des mails"
  },
  {
    quoi: "La chronologie de la correspondance",
    ou: "l'onglet Indicateurs d'un projet",
    pourquoi: "elle se lit à côté de la forme du chantier, qui répond à la même question"
  }
];

function renderLeDemenagement() {
  return `
    <section class="conso-usages">
      <h3 class="conso-usages__titre">Les écrans sont dans l'application</h3>
      <p class="conso-usages__mot">
        La console n'ouvre plus d'archive à elle. Ce qu'elle savait faire, Mdall
        le fait dans un projet — et un chantier commencé depuis des mois peut
        donc être nourri comme les autres.
      </p>
      ${/*
        **Un bloc par écran, et pas un tableau.** La troisième colonne d'un
        tableau porte un chiffre ou trois mots ; une phrase entière s'y replie
        en colonne étroite alignée à droite, et devient illisible. C'est le
        genre de défaut qu'aucun test ne voit et qu'un regard voit tout de
        suite.
      */""}
      ${CE_QUI_A_DEMENAGE.map((un) => `
        <div class="forme-suite">
          <h4 class="forme-suite__titre">${un.quoi}</h4>
          <p class="forme-suite__dit">${un.ou}</p>
          <p class="conso-usages__mot">${un.pourquoi}</p>
        </div>
      `).join("")}
      <p class="conso-usages__mot"><a href="${LE_LIEN_VERS_MDALL}">Aller à Mdall</a></p>
    </section>
  `;
}

/**
 * La barre d'onglets, dans les classes de Mdall.
 *
 * `project-tabs`, la même que celle d'un projet : la feuille de style connaît
 * déjà la grille, le soulignement de l'actif et le repli en petite largeur. Une
 * barre dessinée ici se verrait comme une greffe, et il faudrait la recalibrer
 * à chaque retouche de l'autre.
 *
 * ## L'onglet actif se déduit de l'adresse, et l'adresse nomme une rubrique
 *
 * Le fragment porte la rubrique — `#comptes`, `#sujets` —, jamais l'onglet : un
 * onglet n'a pas d'écran à lui. Chaque lien mène donc à **la première rubrique**
 * de son onglet, et l'onglet souligné est celui dont la rubrique ouverte relève.
 *
 * C'est ce qui garde **une adresse pour un écran** : un signet sur `#sujets`
 * ouvre l'onglet Carburant à la bonne rubrique, et il n'y a pas deux états à
 * accorder (règle 10).
 */
function renderLesOnglets(rubrique) {
  const actif = ongletDeLaRubrique(rubrique);

  return `
      <nav class="project-tabs project-tabs--console" aria-label="Console">
        ${ONGLETS_DE_LA_CONSOLE.map((un) => `
          <a
            href="#${laPremiereRubriqueDe(un.cle)}"
            class="${un.cle === actif ? "active" : ""}"
            data-console-onglet="${un.cle}"
          >
            <span class="project-tabs__item">
              <span class="project-tabs__icon" aria-hidden="true">${svgIcon(un.icone)}</span>
              <span class="project-tabs__label">${un.dit}</span>
            </span>
          </a>
        `).join("")}
      </nav>
  `;
}

function renderLaPorteFermee() {
  return `
    <section class="conso-usages">
      <h3 class="conso-usages__titre">${LA_CONSOLE.nom}</h3>
      <p class="conso-usages__mot">
        Cette porte n'est pas la vôtre. Ce n'est pas une panne : votre compte
        n'ouvre pas la console de Mdall.
      </p>
      <p class="conso-usages__mot"><a href="${LE_LIEN_VERS_MDALL}">Revenir à Mdall</a></p>
    </section>
  `;
}

/**
 * La barre du haut, dans les classes de Mdall.
 *
 * `gh-header gh-header--global`, comme tous les écrans de l'application qui ne
 * sont pas dans un projet : c'est la grille à trois colonnes que la feuille de
 * style connaît déjà, et `#app` est déjà décalé de la hauteur d'un en-tête —
 * la console laissait donc, depuis trois tours, un vide en haut de page.
 *
 * **L'avatar est dessiné même quand la porte est fermée**, et c'est voulu :
 * quelqu'un qui s'est trompé de compte doit pouvoir repartir sans chercher, et
 * savoir sous quelle adresse il est arrivé.
 */
function renderLaBarre(courriel) {
  return `
    <header class="gh-header gh-header--global">
      <div class="gh-header__left">
        <div class="gh-brand-wrap">
          <a class="gh-brand gh-brand--console" href="${LE_LIEN_VERS_MDALL}">
            <span class="gh-brand__name">Mdall</span>
            <span class="gh-brand__sep">/</span>
            <span class="gh-brand__repo">console</span>
          </a>
        </div>
      </div>

      <div class="gh-header__center"></div>

      <div class="gh-header__right">
        <div class="gh-header__actions">${renderLavatar(courriel)}</div>
      </div>
    </header>
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

  // Les deux ensemble : l'adresse ne dépend pas de la porte, et les demander
  // l'une après l'autre ferait attendre deux allers-retours pour une page qui
  // n'a qu'un paragraphe à écrire.
  const [ouverte, courriel] = await Promise.all([
    suisJeAdministrateur(),
    leCourrielDuCompte()
  ]);

  // **La barre d'onglets part avec l'en-tête**, hors de `#app`. Celui-ci est en
  // position fixe et décalé de leur hauteur à tous deux : dessinée dedans, la
  // barre flottait au milieu de la page, à la largeur du contenu, et défilait
  // avec lui.
  if (barre) {
    barre.innerHTML = renderLaBarre(courriel)
      + (ouverte
        ? renderLesOnglets(laRubriqueValide(location.hash.replace(/^#/, "")))
        : "");
  }
  if (!ouverte) {
    hote.innerHTML = `<div class="page-large">${renderLaPorteFermee()}</div>`;
    monterLavatar(barre ?? document);
    calerLaCoque();
    return;
  }

  dessinerLaRubrique(laRubriqueValide(location.hash.replace(/^#/, "")));
  monterLavatar(barre ?? document);
  calerLaCoque();

  // Le rail et la barre d'onglets changent tous deux `#carburant`, `#sujets`…
  // L'un comme l'autre passent par l'adresse : il n'y a donc qu'un chemin à
  // suivre, et un signet sur une rubrique ouvre cette rubrique (règle 10).
  window.addEventListener("hashchange", () => {
    const rubrique = laRubriqueValide(location.hash.replace(/^#/, ""));
    // **La barre du haut se resouligne.** Elle vit hors de `#app` : sans cela,
    // on passait aux comptes et « Carburant » restait souligné.
    const barreDesOnglets = barre?.querySelector(".project-tabs--console");
    if (barreDesOnglets) barreDesOnglets.outerHTML = renderLesOnglets(rubrique);
    dessinerLaRubrique(rubrique);
  });
}

/**
 * Cale le corps sous la barre du haut, **en la mesurant**.
 *
 * ## Le défaut que cela répare
 *
 * Le décalage était un calcul de constantes — la hauteur déclarée d'un en-tête
 * plus celle d'une barre d'onglets. Les deux sont déclarées pour l'application,
 * où le squelette est autre ; dans la console, l'en-tête ne fait pas cette
 * hauteur-là, et le haut de la page passait **sous** la barre d'onglets : le
 * premier titre arrivait tronqué.
 *
 * Deux valeurs écrites pour un même fait finissent par diverger (règle 4).
 * Celle-ci se mesure : il n'y en a plus qu'une, et c'est la vraie.
 */
function calerLaCoque() {
  if (!barre) return;
  const hauteur = Math.round(barre.getBoundingClientRect().height);
  if (hauteur > 0) document.body.style.setProperty("--app-top", `${hauteur}px`);
}

/**
 * Le rail des rubriques — **le même que celui des Sujets, de la Mémoire et des
 * Actions**.
 *
 * Une navigation dessinée ici aurait divergé au premier réglage : le haut qui
 * suit le défilement, le repli calé en bas, la poignée de largeur. Il y en a
 * assez pour que la seconde copie soit fausse avant d'être finie (règle 4).
 *
 * **Il ne montre que les rubriques de l'onglet ouvert.** Les montrer toutes
 * ferait de la barre d'onglets une décoration : on atteindrait les comptes
 * depuis le carburant, et l'on ne saurait plus où l'on est.
 */
function renderLeRail(actif) {
  return renderProjectRail({
    id: "consoleRail",
    label: "Les rubriques de la console",
    navHtml: renderNavList({
      label: "Les rubriques de la console",
      html: renderNavListGroup({
        items: lesRubriquesDeLonglet(ongletDeLaRubrique(actif)).map((une) => renderNavListItem({
          label: une.libelle,
          iconHtml: svgIcon(une.icone),
          isActive: une.cle === actif,
          title: une.question,
          as: "a",
          href: `#${une.cle}`
        }))
      })
    })
  });
}

/**
 * Une rubrique, dessinée dans la coque commune.
 *
 * **Chaque onglet a son écran**, et la barre d'onglets le désigne. Dessiner le
 * carburant sous l'onglet Utilisateurs aurait fait une barre qui ne commande
 * rien — ce qu'elle était, faute d'un second onglet.
 */
function dessinerLaRubrique(cle) {
  const lesComptes = cle === LES_COMPTES;
  /**
   * **Les trois rubriques de l'exploitation partagent un écran**, et il choisit
   * laquelle dessiner. Trois modules auraient recopié trois fois l'en-tête, la
   * phrase du journal des accès et la forme d'un échec — et c'est la troisième
   * copie qui aurait fini par ne plus dire la même chose (règle 4).
   */
  const lexploitation = [LA_SANTE, LUSAGE, LE_TRAFIC, LES_CONSULTATIONS].includes(cle);

  hote.innerHTML = `
    <div class="project-rail-layout">
      ${renderLeRail(cle)}
      <div class="project-rail-layout__content">
        <div class="page-large">
          ${lesComptes
            ? renderLesComptes()
            : lexploitation ? renderLexploitation() : renderLeCarburant()}
          ${/*
            **Où les écrans sont partis, sous « ce qui n'est pas fait ».** C'est
            la même question — qu'est-ce qui n'est pas ici — et la réponse n'est
            pas « rien » mais « ailleurs ». La laisser sur toutes les rubriques
            la faisait lire zéro fois.
          */""}
          ${cle === "manques" ? renderLeDemenagement() : ""}
        </div>
      </div>
    </div>
  `;

  if (lesComptes) {
    void monterLesComptes(hote);
    return;
  }

  if (lexploitation) {
    void monterLexploitation(hote, cle);
    return;
  }

  const ou = hote.querySelector("#carburantHote");
  // **Qui est en train d'être lu.** Deux clics rapides lançaient deux lectures,
  // et la plus lente écrasait la plus récente : on lisait les domaines sous le
  // titre des sujets.
  if (ou) ou.dataset.rubrique = cle;

  void monterLeCarburant(hote, cle);
}

main();
