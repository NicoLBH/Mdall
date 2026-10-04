/**
 * *Console › Utilisateurs › Les comptes* — qui est là, et ce que chacun a fait.
 *
 * ## Le premier vrai écran d'exploitation, et ce que cela change
 *
 * La console ne lisait jusqu'ici que des **agrégats anonymes** : des nombres,
 * deux dates, aucun identifiant. Même ouverte à tort, elle ne nommait personne.
 * Cet écran-ci nomme des gens. C'est un autre régime, et il s'accompagne de
 * deux choses qui n'existaient pas :
 *
 * 1. **un journal des accès** (`acces_administrateurs`) : qui, quelle page,
 *    quand, quel filtre. Écrit par la base, pas par cette page — une console qui
 *    pourrait choisir de ne pas se journaliser ne se journalise pas ;
 * 2. **la porte sur chacune des trois fonctions**, et pas sur l'écran. Un
 *    contrôle écrit ici se contourne en ouvrant les outils de développement.
 *
 * ## Ce qu'il montre, et ce qu'il ne montrera jamais
 *
 * > La forme et les comptes traversent ; le contenu reste.
 *
 * Un nom, une adresse, des noms de chantier, des nombres, des dates. **Jamais**
 * une conversation avec le copilote, un message de sujet, une affirmation, le
 * texte d'un document. Un administrateur n'est pas l'exception à la promesse du
 * produit : c'est le cas le plus dangereux.
 *
 * ## Il ne dessine rien pour lui
 *
 * Le tableau est `data-table-shell`, celui de partout. La pagination est celle
 * des projets. La recherche est la barre d'outils des tableaux. Les deux boutons
 * gris du détail sont ceux de *Factures et abonnement*, et la consommation s'y
 * met en euros par le **même** module pur — un second barème pour la console
 * aurait divergé de la facture au premier tarif relevé (règle 4), et c'est
 * précisément le chiffre qu'on vient vérifier.
 */

import { escapeHtml } from "../partage/js/utils/escape-html.js";
import { svgIcon } from "../partage/js/ui/icons.js";
import {
  COLONNE_DU_COMPTE, renderDataTableCount, renderDataTableEmptyState,
  renderDataTableHead, renderDataTableShell
} from "../partage/js/views/ui/data-table-shell.js";
import {
  normalizePaginationState, renderPaginationControls
} from "../partage/js/views/ui/pagination.js";
import {
  renderProjectTableToolbar, renderProjectTableToolbarSearch
} from "../partage/js/views/ui/project-table-toolbar.js";
import { renderSpinnerHtml } from "../partage/js/views/ui/spinner.js";
import { bindGhActionButtons } from "../partage/js/views/ui/gh-split-button.js";
import {
  ceQueLeMenuDemande, renderLeChoixDeLaPeriode
} from "../partage/js/views/ui/le-choix-de-la-periode.js";
import {
  renderConsommation
} from "../partage/js/views/consommation/ecran-de-consommation.js";
import {
  PAS, ceQueLaFenetreDit, enJetons, laCleDeLaFenetre, laFenetreDe, lePasValide, moisEnCours
} from "../partage/js/services/consommation-ia.js";
import {
  CE_QUE_DIT_LE_ROLE, PAR_PAGE, laConsommationALecran, leDetailDunCompte, lesComptesALecran
} from "../partage/js/services/les-comptes-de-mdall.js";
import {
  laConsommationDunCompte, leCompteDeMdall, lesComptesDeMdall
} from "../partage/js/services/les-comptes-de-mdall-supabase.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** L'attribut par lequel l'écran reconnaît un clic sur une ligne de compte. */
export const OUVRIR_UN_COMPTE = "data-compte-de-mdall";

/** Celui du retour au tableau. */
const FERMER_LE_COMPTE = "data-compte-fermer";

/** Le champ de recherche. */
const CHERCHER_UN_COMPTE = "comptesRecherche";

/** Ce qu'on regarde, et ce qu'on a lu. */
const etat = {
  /* ── La liste ── */
  page: 1,
  cherche: "",
  comptes: null,
  combienEnTout: 0,
  enCours: false,
  rate: false,

  /* ── Le compte ouvert ── */
  ouvert: "",
  detail: null,
  detailEnCours: false,
  detailRate: false,

  /* ── Sa consommation ── */
  mois: "",
  pas: PAS.JOUR,
  /** La fenêtre dont `appels` vient — le pas en fait partie (règle 5). */
  cleDeLaConso: "",
  appels: null,
  consoEnCours: false,
  consoRate: false
};

const moisRegarde = () => etat.mois || moisEnCours();
const pasRegarde = () => lePasValide(etat.pas);
const fenetreRegardee = () => laFenetreDe({ pas: pasRegarde(), mois: moisRegarde() });

/* ── Le rendu ─────────────────────────────────────────────────────────────── */

/** La rubrique entière : le tableau, ou le détail d'un compte. */
export function renderLesComptes() {
  return `<section class="comptes-de-mdall" data-comptes-hote>${
    etat.ouvert ? renderLeCompte() : renderLeTableau()
  }</section>`;
}

function renderLeTableau() {
  return `
    <header class="comptes-de-mdall__tete">
      <h2 class="comptes-de-mdall__titre">Les comptes</h2>
      <p class="comptes-de-mdall__mot">
        Qui est là, et ce que chacun a fait. ${escapeHtml(
          "Un nom, une adresse, ses chantiers, ses sujets comptés et ce que l'IA lui a coûté — "
          + "jamais ce qu'il a écrit."
        )}
      </p>
      ${/*
        **Chaque ouverture de cet écran laisse une ligne au journal des accès.**
        Le dire ici n'est pas une précaution de forme : c'est ce qui rend la
        console défendable, et ce qui rappelle que regarder un compte est un
        geste, pas une consultation anodine.
      */""}
      <p class="comptes-de-mdall__trace mono-small">${svgIcon("shield", {
        className: "octicon"
      })} Chaque consultation de cet écran est journalisée : qui, quand, quel filtre.</p>
    </header>

    ${renderProjectTableToolbar({
      leftHtml: renderProjectTableToolbarSearch({
        id: CHERCHER_UN_COMPTE,
        value: etat.cherche,
        placeholder: "Un nom, une adresse, une société…"
      })
    })}

    ${/*
      **La recherche vit hors du corps qu'on réécrit.** Réécrire le tableau
      entier à chaque lecture emporterait le champ avec le curseur dedans : on
      tapait « enduit », la première lecture partait, et les trois dernières
      lettres se perdaient. Seules les lignes et la pagination se relisent.
    */""}
    <div data-comptes-corps>${renderLesLignes()}</div>
  `;
}

function renderLesLignes() {
  if (etat.enCours) return renderAttente("Lecture des comptes");

  const pagination = normalizePaginationState({
    totalItems: etat.combienEnTout, pageSize: PAR_PAGE, currentPage: etat.page
  });

  if (etat.rate) {
    return `<p class="comptes-de-mdall__mot forme-manques">${escapeHtml(
      "Les comptes n'ont pas pu être lus. Ce n'est pas « aucun compte » : on ne sait pas quoi. "
      + "Il se peut aussi que cette porte ne soit pas la vôtre."
    )}</p>`;
  }

  const comptes = Array.isArray(etat.comptes) ? etat.comptes : [];

  return `
    ${renderDataTableShell({
      className: "comptes-de-mdall__table",
      gridTemplate: "minmax(220px,2fr) minmax(200px,1.6fr) 150px 120px",
      state: comptes.length ? "ready" : "empty",
      emptyHtml: renderDataTableEmptyState(etat.cherche
        ? {
          title: "Aucun compte ne répond à cette recherche",
          description: "Elle porte sur le nom, le prénom, l'adresse et la société."
        }
        : {
          title: "Aucun compte",
          description: "Personne n'est encore inscrit sur cette installation de Mdall."
        }),
      headHtml: renderDataTableHead({
        columns: [
          {
            html: renderDataTableCount({
              iconeHtml: svgIcon("people", { className: "octicon" }),
              dit: etat.combienEnTout === 1 ? "1 compte" : `${etat.combienEnTout} comptes`,
              titre: "Les comptes de cette installation"
            }),
            className: COLONNE_DU_COMPTE
          },
          "Adresse",
          "Entré le",
          "Chantiers"
        ]
      }),
      bodyHtml: comptes.map(renderUneLigne).join("")
    })}

    ${renderPaginationControls(pagination, { entity: "comptes" })}
  `;
}

/**
 * Une ligne de compte.
 *
 * Le gabarit de titre des Sujets, comme partout : une icône, un titre qui se
 * clique, et ce qu'on en dit dessous. L'identifiant court vit sous le nom — il
 * sert à parler d'un compte sans écrire son adresse quelque part.
 */
function renderUneLigne(compte) {
  return `
    <div class="data-table-shell__row comptes-de-mdall__ligne">
      <div class="data-table-shell__cell data-table-shell__cell--titre">
        <span class="issue-row-title-grid">
          <span class="issue-row-title-grid__status">${
            svgIcon("person", { className: "octicon" })}</span>
          <span class="issue-row-title-grid__title">
            <button type="button" class="row-title-trigger theme-text theme-text--pb"
              ${OUVRIR_UN_COMPTE}="${escapeHtml(compte.identifiant)}"
            >${escapeHtml(compte.commeOnLappelle)}</button>
          </span>
          <span class="issue-row-title-grid__meta issue-row-meta-text mono-small">${
            escapeHtml([
              compte.societe,
              `n° ${compte.court}`,
              compte.derniereTrace ? `vu le ${leJour(compte.derniereTrace)}` : "jamais revenu"
            ].filter(Boolean).join(" • "))}</span>
        </span>
      </div>
      <div class="data-table-shell__cell mono-small">${escapeHtml(compte.courriel || "—")}</div>
      <div class="data-table-shell__cell mono-small">${escapeHtml(leJour(compte.entreLe))}</div>
      ${/*
        **Possède et collabore se lisent séparément.** Un déclencheur inscrit le
        propriétaire comme collaborateur de son propre chantier : fondus, les
        deux nombres monteraient ensemble sans rien apprendre de plus.
      */""}
      <div class="data-table-shell__cell mono-small">${escapeHtml(
        `${compte.projetsPossedes} à lui · ${compte.projetsCollabores} avec`
      )}</div>
    </div>
  `;
}

/* ── Le détail d'un compte ───────────────────────────────────────────────── */

function renderLeCompte() {
  if (etat.detailEnCours) return renderAttente("Lecture de ce compte");

  if (etat.detailRate || !etat.detail) {
    return `
      ${renderLaLigneDuTitre("Ce compte")}
      <p class="comptes-de-mdall__mot forme-manques">${escapeHtml(
        "Ce compte n'a pas pu être lu. Ce n'est pas « il n'existe pas » : on ne sait pas quoi. "
        + "Un compte effacé ne se lit plus non plus — et c'est ce qu'on attend de lui."
      )}</p>
    `;
  }

  const compte = etat.detail;

  return `
    ${renderLaLigneDuTitre(compte.commeOnLappelle)}

    <section class="comptes-de-mdall__identite">
      <h3 class="comptes-de-mdall__sous-titre">Le compte</h3>
      <dl class="comptes-de-mdall__faits">
        ${renderUnFait("Adresse", compte.courriel || "—")}
        ${renderUnFait("Société", compte.societe || "—")}
        ${renderUnFait("Identifiant", compte.identifiant)}
        ${renderUnFait("Entré le", leJour(compte.entreLe))}
        ${renderUnFait("Dernière trace", compte.derniereTrace
          ? leJour(compte.derniereTrace)
          : "jamais revenu depuis son inscription")}
        ${renderUnFait("Sujets créés", String(compte.sujets))}
        ${renderUnFait("Appels de modèle", String(compte.appels))}
        ${renderUnFait("Jetons, en tout", enJetons(compte.jetons))}
        ${renderUnFait("Premier appel", compte.premierAppel ? leJour(compte.premierAppel) : "aucun")}
        ${renderUnFait("Dernier appel", compte.dernierAppel ? leJour(compte.dernierAppel) : "aucun")}
      </dl>
    </section>

    ${renderLesChantiers("Les chantiers qu'il possède", compte.possedes,
      "Il n'a créé aucun chantier.")}
    ${renderLesChantiers("Ceux où il collabore", compte.collabores,
      "Personne ne l'a invité sur un chantier qui n'est pas le sien.")}

    ${/*
      **Le bouton de période est DANS la région qu'on réécrit.** Laissé dehors,
      il gardait son libellé : on choisissait juillet, la carte disait « Sur
      juillet 2026 » et le bouton « Période : octobre 2026 — deux mois affichés
      en même temps pour un seul chiffre (règle 5).
    */""}
    <section class="comptes-de-mdall__conso">
      <div data-comptes-conso>${renderLeBlocDeLaConso()}</div>
    </section>
  `;
}

/** L'en-tête de la consommation **et** son corps : ils se relisent ensemble. */
function renderLeBlocDeLaConso() {
  return `
    <header class="comptes-de-mdall__conso-tete">
      <h3 class="comptes-de-mdall__sous-titre">Ce que l'IA lui a coûté</h3>
      ${renderLeChoixDeLaPeriode({ mois: moisRegarde(), id: "comptesPeriode" })}
    </header>
    ${renderLaConso()}
  `;
}

function renderLaConso() {
  if (etat.consoEnCours) return renderAttente("Lecture de sa consommation");

  return renderConsommation({
    appels: etat.consoRate ? null : (etat.appels ?? []),
    bornes: fenetreRegardee(),
    pas: pasRegarde(),
    // **Ni par chantier, ni par usage.** La fonction de base rend la
    // consommation groupée par pas et par modèle : elle ne porte ni la nature de
    // l'appel ni le chantier. Les dessiner quand même donnerait une seule barre
    // « inconnu — 100 % », qui n'apprend rien et se lit comme une panne.
    //
    // Ce qu'on vient voir ici est **le montant et son évolution**, et c'est ce
    // qui reste : la courbe, la carte, et ce que le tarif dit.
    parProjets: false,
    parUsages: false,
    // Le titre dit la fenêtre lue, et non le mois cliqué : « sur octobre »
    // devant un total de douze mois serait faux de onze mois.
    titreDuTotal: `Sur ${ceQueLaFenetreDit({ pas: pasRegarde(), mois: moisRegarde() })}`,
    detailDuTotal: "Ses appels uniquement, tous chantiers confondus."
  });
}

/**
 * La ligne du titre, avec la flèche de retour **à gauche et sur la même ligne**.
 *
 * C'est la règle de l'application, posée au tour de l'analyse de documents : une
 * sortie sur une ligne à elle fait deux gestes pour un.
 */
function renderLaLigneDuTitre(titre) {
  return `
    <header class="comptes-de-mdall__tete comptes-de-mdall__tete--detail">
      <button type="button" class="gh-btn gh-btn--sm comptes-de-mdall__retour"
        ${FERMER_LE_COMPTE} aria-label="Revenir aux comptes" title="Revenir aux comptes"
      >${svgIcon("arrow-left", { className: "octicon" })}</button>
      <h2 class="comptes-de-mdall__titre">${escapeHtml(titre)}</h2>
    </header>
  `;
}

function renderUnFait(quoi, valeur) {
  return `
    <div class="comptes-de-mdall__fait">
      <dt>${escapeHtml(quoi)}</dt>
      <dd class="mono-small">${escapeHtml(texte(valeur) || "—")}</dd>
    </div>
  `;
}

/**
 * Les chantiers d'un rôle.
 *
 * **Une liste vide dit laquelle, et ce que cela veut dire.** « Aucun » tout seul
 * laisserait se demander si la lecture a abouti.
 */
function renderLesChantiers(titre, chantiers, vide) {
  const liste = Array.isArray(chantiers) ? chantiers : [];

  return `
    <section class="comptes-de-mdall__chantiers">
      <h3 class="comptes-de-mdall__sous-titre">${escapeHtml(titre)}</h3>
      ${liste.length === 0
        ? `<p class="comptes-de-mdall__mot">${escapeHtml(vide)}</p>`
        : `<ul class="comptes-de-mdall__liste">
            ${liste.map((un) => `
              <li class="comptes-de-mdall__chantier${un.archiveLe ? " est-archive" : ""}">
                <span class="comptes-de-mdall__chantier-nom">${escapeHtml(un.nom)}</span>
                <span class="comptes-de-mdall__chantier-dit mono-small">${escapeHtml([
                  CE_QUE_DIT_LE_ROLE[un.role],
                  `${un.sujets} ${un.sujets === 1 ? "sujet" : "sujets"}`,
                  un.creeLe ? `ouvert le ${leJour(un.creeLe)}` : "",
                  // Un chantier rangé n'est pas un chantier mort : le dire évite
                  // de le compter comme en cours.
                  un.archiveLe ? `rangé le ${leJour(un.archiveLe)}` : ""
                ].filter(Boolean).join(" • "))}</span>
              </li>
            `).join("")}
          </ul>`}
    </section>
  `;
}

function renderAttente(mot) {
  return `
    <section class="conso-vide conso-vide--attente">
      ${renderSpinnerHtml({ label: mot, size: "md" })}
      <p>${escapeHtml(mot)}…</p>
    </section>
  `;
}

/** Un instant, en jour seul : l'heure n'apprend rien sur un compte. */
function leJour(quand) {
  const dit = texte(quand);
  return dit ? dit.slice(0, 10) : "—";
}

/* ── Le branchement ───────────────────────────────────────────────────────── */

/**
 * Monter la rubrique : brancher les clics, puis lire.
 *
 * **Une seule écoute**, posée sur l'hôte. Empilées, un clic lancerait trois
 * lectures de la même page — et le journal des accès porterait trois lignes pour
 * un seul regard, ce qui le rendrait illisible.
 */
export async function monterLesComptes(hote) {
  const ou = hote?.querySelector?.("[data-comptes-hote]");
  if (!ou) return;

  bindGhActionButtons();
  brancher(ou);

  // **On lit dans `ou`, et jamais dans l'hôte.** Passé l'hôte, le premier
  // redessin réécrivait tout `#app` : le rail disparaissait, et avec lui le nœud
  // qui porte l'écoute des clics — la recherche ne cherchait plus, et une ligne
  // ne s'ouvrait plus. L'écran avait l'air juste, et plus rien n'y répondait.
  if (etat.ouvert) {
    await lireLeCompte(ou);
    return;
  }
  await lireLesComptes(ou);
}

function brancher(ou) {
  if (ou.dataset.comptesBranche === "oui") return;
  ou.dataset.comptesBranche = "oui";

  ou.addEventListener("click", (evenement) => {
    const cible = evenement.target;

    const ligne = cible.closest?.(`[${OUVRIR_UN_COMPTE}]`);
    if (ligne) {
      ouvrirLeCompte(ou, texte(ligne.getAttribute(OUVRIR_UN_COMPTE)));
      return;
    }

    if (cible.closest?.(`[${FERMER_LE_COMPTE}]`)) {
      etat.ouvert = "";
      etat.detail = null;
      etat.detailRate = false;
      etat.appels = null;
      etat.cleDeLaConso = "";
      redessiner(ou);
      return;
    }

    const page = cible.closest?.("[data-pagination-entity='comptes']");
    if (page) {
      const voulue = Number(page.getAttribute("data-pagination-page"));
      if (Number.isFinite(voulue) && voulue >= 1 && voulue !== etat.page) {
        etat.page = voulue;
        void lireLesComptes(ou);
      }
    }
  });

  // **La recherche attend qu'on ait fini de taper.** Une lecture par frappe
  // ferait six appels pour « enduit », donc six lignes au journal des accès.
  let minuterie = null;
  ou.addEventListener("input", (evenement) => {
    if (evenement.target?.id !== CHERCHER_UN_COMPTE) return;
    const dit = texte(evenement.target.value);
    if (minuterie) clearTimeout(minuterie);
    minuterie = setTimeout(() => {
      if (dit === etat.cherche) return;
      etat.cherche = dit;
      etat.page = 1;
      void lireLesComptes(ou);
    }, 350);
  });

  // Les deux menus de la période, dans le détail d'un compte.
  ou.addEventListener("ghaction:action", (evenement) => {
    const demande = ceQueLeMenuDemande(evenement?.detail?.action);
    if (!demande || !etat.ouvert) return;

    if (demande.quoi === "mois") etat.mois = demande.valeur;
    else etat.pas = demande.valeur;

    void lireLaConso(ou);
  });
}

function ouvrirLeCompte(ou, identifiant) {
  if (!identifiant) return;
  etat.ouvert = identifiant;
  etat.detail = null;
  etat.detailRate = false;
  etat.appels = null;
  etat.cleDeLaConso = "";
  void lireLeCompte(ou);
}

async function lireLesComptes(ou) {
  etat.enCours = true;
  redessiner(ou);

  const lues = await lesComptesDeMdall({
    page: etat.page, parPage: PAR_PAGE, cherche: etat.cherche
  });
  const vues = lesComptesALecran(lues);

  etat.rate = vues === null;
  etat.comptes = vues?.comptes ?? null;
  etat.combienEnTout = vues?.combienEnTout ?? 0;
  etat.enCours = false;
  redessiner(ou);
}

async function lireLeCompte(ou) {
  etat.detailEnCours = true;
  redessiner(ou);

  const lu = await leCompteDeMdall(etat.ouvert);
  const vu = leDetailDunCompte(lu);

  etat.detailRate = vu === null;
  etat.detail = vu;
  etat.detailEnCours = false;
  redessiner(ou);

  if (vu) await lireLaConso(ou);
}

async function lireLaConso(ou) {
  const cle = laCleDeLaFenetre({ pas: pasRegarde(), mois: moisRegarde() });
  if (etat.cleDeLaConso === cle && (etat.appels !== null || etat.consoRate)) return;

  etat.consoEnCours = true;
  redessiner(ou);

  const fenetre = fenetreRegardee();
  const lues = await laConsommationDunCompte({
    identifiant: etat.ouvert, ...fenetre, pas: pasRegarde()
  });
  const vues = laConsommationALecran(lues);

  etat.cleDeLaConso = cle;
  etat.consoRate = vues === null;
  etat.appels = vues;
  etat.consoEnCours = false;
  redessiner(ou);
}

/**
 * Redessiner **le moins possible**, et toujours dans le même nœud.
 *
 * ## Trois niveaux, et chacun a sa raison
 *
 * Réécrire la page entière emporterait le rail, la barre d'onglets et l'écoute
 * des clics : on garde donc le nœud de la rubrique et l'on écrit dedans.
 *
 * Mais à l'intérieur aussi, il faut choisir. Réécrire le tableau entier à chaque
 * lecture emportait **le champ de recherche avec le curseur dedans** : on tapait
 * « enduit », la lecture du premier mot partait au bout de trois dixièmes de
 * seconde, et les trois dernières lettres tombaient dans le vide. Seules les
 * lignes se relisent.
 *
 * De même dans le détail : changer de période ne relit que la consommation, et
 * non l'identité ni les chantiers, qui n'en dépendent pas.
 */
function redessiner(ou) {
  if (!ou?.isConnected) return;
  const vue = etat.ouvert ? "compte" : "liste";

  // On change de vue : tout se réécrit, et il n'y a rien à préserver.
  if (ou.dataset.comptesVue !== vue) {
    ou.dataset.comptesVue = vue;
    ou.innerHTML = vue === "compte" ? renderLeCompte() : renderLeTableau();
    return;
  }

  if (vue === "liste") {
    const corps = ou.querySelector("[data-comptes-corps]");
    if (corps) corps.innerHTML = renderLesLignes();
    else ou.innerHTML = renderLeTableau();
    return;
  }

  // Le détail est là et ne bouge pas : seule sa consommation se relit.
  const conso = ou.querySelector("[data-comptes-conso]");
  if (conso && etat.detail && !etat.detailEnCours) conso.innerHTML = renderLeBlocDeLaConso();
  else ou.innerHTML = renderLeCompte();
}
