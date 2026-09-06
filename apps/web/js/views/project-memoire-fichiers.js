/**
 * La mémoire du projet, parcourue comme un dépôt.
 *
 * ## Pourquoi un navigateur de fichiers, et pas une liste
 *
 * La mémoire s'affichait en tableau : une ligne par affirmation, filtrable par
 * nature. Cela répond à « montre-moi toutes les hypothèses », et c'est une
 * question qu'on se pose. Mais ce n'est pas celle qu'on se pose en arrivant :
 * on arrive avec « qu'est-ce que le projet dit de l'incendie ? », et un tableau
 * de trois cents lignes filtrables demande de savoir quoi filtrer.
 *
 * Depuis que la mémoire s'écrit — voir `memoire-en-texte.js` —, elle a une
 * forme naturelle : des dossiers, des fichiers, des lignes. On la parcourt donc
 * comme l'onglet Documents, avec les mêmes gestes, parce que ce sont les mêmes
 * gestes.
 *
 * ## Code, ou Blame
 *
 * Deux lectures d'un même fichier, et ce sont deux questions différentes :
 * « qu'est-ce que le projet tient pour vrai ? » et « qui a décidé cela, et
 * quand ? ». La seconde est la raison d'être de cette mémoire — une valeur sans
 * son auteur ni sa date n'est qu'un chiffre dans un tableur. Voir
 * `memoire-blame.js` pour ce que chaque lecture montre, et ce qu'elle cache.
 */

import { escapeHtml } from "../utils/escape-html.js";
import { svgIcon } from "../ui/icons.js";
import { renderSideResizer } from "./ui/side-resizer.js";
import { ligneDAffirmation, cheminDeFichier, nomDeFichier } from "../services/memoire-en-texte.js";
import { phraseDuDossier, rangDuDossier } from "../services/memoire-rangement.js";
import {
  fichiersDeLaMemoire, dossiersDeLaMemoire, blameDeLaLigne, chaleurDeLaLigne, bornesDuFichier
} from "../services/memoire-blame.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Les deux lectures d'un fichier. */
export const LECTURE = { CODE: "code", BLAME: "blame" };

/** Une clé de chemin, utilisable comme identifiant HTML. */
const cleHtml = (valeur) => texte(valeur).replace(/[^\w-]+/g, "-");

/**
 * Ce que l'écran a sous la main.
 *
 * Une seule lecture de la mémoire, découpée une fois. Recalculer l'arborescence
 * à chaque rendu ferait trier trois cents affirmations à chaque frappe.
 */
export function preparerLaMemoire(assertions = []) {
  const dossiers = dossiersDeLaMemoire(assertions).sort(
    (gauche, droite) => rangDuDossier(gauche.nom) - rangDuDossier(droite.nom)
  );
  const fichiers = fichiersDeLaMemoire(assertions);

  return { dossiers, fichiers };
}

/** Le fichier d'un chemin, s'il existe. */
export function fichierDuChemin(memoire, chemin = []) {
  if (chemin.length < 2) return null;
  const cle = chemin.slice(0, 2).join(" / ");
  return (memoire.fichiers ?? []).find((fichier) => fichier.chemin.join(" / ") === cle) ?? null;
}

/* ────────────────────────────────────────────────────────────────────────────
 * L'arborescence
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Le rail : les dossiers, leurs fichiers.
 *
 * Les mêmes classes que l'arbre des Documents. Deux arborescences qui se
 * ressemblent à peu près donnent l'impression de deux applications.
 */
export function renderArbre(memoire, { chemin = [], replies = new Set(), ouverte = true } = {}) {
  const corps = (memoire.dossiers ?? [])
    .map((dossier) => {
      const replie = replies.has(dossier.nom);
      const actif = chemin[0] === dossier.nom;

      return `
        <div class="documents-tree__row${actif && chemin.length === 1 ? " is-active" : ""}">
          <button type="button" class="documents-tree__caret" data-memoire-plier="${escapeHtml(dossier.nom)}"
            aria-expanded="${replie ? "false" : "true"}">
            ${svgIcon(replie ? "chevron-right" : "chevron-down", { className: "octicon" })}
          </button>
          <button type="button" class="documents-tree__item${actif && chemin.length === 1 ? " is-active" : ""}"
            data-memoire-aller="${escapeHtml(dossier.nom)}">
            <span class="documents-tree__icon-slot">${svgIcon("file-directory", { className: "octicon" })}</span>
            <span class="documents-tree__label">${escapeHtml(dossier.nom)}</span>
            <span class="diff-tree__compte">${dossier.lignes}</span>
          </button>
        </div>
        ${
          replie
            ? ""
            : dossier.fichiers
                .map((fichier) => {
                  const ici = chemin.join(" / ") === fichier.chemin.join(" / ");
                  return `
                    <div class="documents-tree__row${ici ? " is-active" : ""}">
                      <span class="documents-tree__indent"><span class="documents-tree__divider is-expanded"></span></span>
                      <span class="documents-tree__caret-spacer"></span>
                      <button type="button" class="documents-tree__item${ici ? " is-active" : ""}"
                        data-memoire-aller="${escapeHtml(fichier.chemin.join("/"))}">
                        <span class="documents-tree__icon-slot">${svgIcon("file", { className: "octicon" })}</span>
                        <span class="documents-tree__label">${escapeHtml(nomDeFichier(fichier.chemin))}</span>
                        <span class="diff-tree__compte">${fichier.lignes.length}</span>
                      </button>
                    </div>
                  `;
                })
                .join("")
        }
      `;
    })
    .join("");

  return `
    <aside class="documents-tree memoire-tree${ouverte ? " is-open" : " is-collapsed"}" aria-label="Mémoire du projet">
      <div class="documents-tree__panel">
        ${corps || `<p class="diff-tree__vide">Le projet n'a encore rien versé.</p>`}
      </div>
      ${renderSideResizer({ id: "memoireTreeResize", className: "documents-tree__resize-handle" })}
    </aside>
  `;
}

/* ────────────────────────────────────────────────────────────────────────────
 * La barre : fil d'Ariane, et la recherche à droite
 * ──────────────────────────────────────────────────────────────────────────── */

export function renderBarre({ chemin = [], query = "", ouverte = true } = {}) {
  const miettes = [
    `<button type="button" class="documents-breadcrumb__link" data-memoire-aller="">Mémoire</button>`,
    ...chemin.map((morceau, rang) => {
      const cible = chemin.slice(0, rang + 1);
      const libelle = rang === 1 ? nomDeFichier(cible) : morceau;
      return `<span class="documents-breadcrumb__sep">/</span>`
        + `<button type="button" class="documents-breadcrumb__link" data-memoire-aller="${escapeHtml(cible.join("/"))}">${escapeHtml(libelle)}</button>`;
    })
  ].join("");

  return `
    <div class="documents-topbar memoire-barre">
      <div class="documents-topbar__left">
        <button type="button" class="documents-tree__toggle" data-memoire-replier
          aria-label="${escapeHtml(ouverte ? "Replier la barre latérale" : "Étendre la barre latérale")}"
          title="${escapeHtml(ouverte ? "Replier la barre latérale" : "Étendre la barre latérale")}">
          ${svgIcon(ouverte ? "sidebar-collapse" : "sidebar-expand", { className: "octicon" })}
        </button>
        <nav class="documents-breadcrumb" aria-label="Chemin">${miettes}</nav>
      </div>
      <div class="documents-topbar__right">
        <label class="memoire-recherche">
          ${svgIcon("search", { className: "octicon" })}
          <input type="search" class="gh-input" data-memoire-query value="${escapeHtml(query)}"
            placeholder="Chercher dans la mémoire">
        </label>
      </div>
    </div>
  `;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Les trois écrans
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * La racine : les dossiers, et ce qu'on y range.
 *
 * Chaque dossier porte sa phrase. « Contraintes » et « Données de base » se
 * ressemblent assez pour qu'on y range au hasard, et un dossier nommé sans être
 * expliqué se remplit de travers.
 */
export function renderDossiers(memoire) {
  if (!(memoire.dossiers ?? []).length) {
    return `<div class="propositions-empty"><b>La mémoire est vide</b>
      <p>Rien n'y entre directement : ce que le projet retient passe par une proposition, et quelqu'un la signe.</p></div>`;
  }

  return `
    <div class="memoire-liste">
      ${memoire.dossiers
        .map(
          (dossier) => `
            <button type="button" class="memoire-entree" data-memoire-aller="${escapeHtml(dossier.nom)}">
              <span class="memoire-entree__icone">${svgIcon("file-directory", { className: "octicon" })}</span>
              <span class="memoire-entree__corps">
                <span class="memoire-entree__nom">${escapeHtml(dossier.nom)}</span>
                <span class="memoire-entree__phrase">${escapeHtml(phraseDuDossier(dossier.nom))}</span>
              </span>
              <span class="memoire-entree__compte">${dossier.lignes} ligne${dossier.lignes > 1 ? "s" : ""}</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

/** Un dossier : ses fichiers. */
export function renderFichiers(memoire, dossier) {
  const entree = (memoire.dossiers ?? []).find((candidat) => candidat.nom === dossier);
  if (!entree) {
    return `<div class="propositions-empty"><b>Ce dossier est vide</b>
      <p>Aucune affirmation ne s'y range aujourd'hui.</p></div>`;
  }

  return `
    <div class="memoire-liste">
      ${entree.fichiers
        .map(
          (fichier) => `
            <button type="button" class="memoire-entree" data-memoire-aller="${escapeHtml(fichier.chemin.join("/"))}">
              <span class="memoire-entree__icone">${svgIcon("file", { className: "octicon" })}</span>
              <span class="memoire-entree__corps">
                <span class="memoire-entree__nom">${escapeHtml(nomDeFichier(fichier.chemin))}</span>
                <span class="memoire-entree__phrase">${escapeHtml(dernierVersement(fichier))}</span>
              </span>
              <span class="memoire-entree__compte">${fichier.lignes.length} ligne${fichier.lignes.length > 1 ? "s" : ""}${
                fichier.ecartees.length ? ` · ${fichier.ecartees.length} écartée${fichier.ecartees.length > 1 ? "s" : ""}` : ""
              }</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

/** Quand ce fichier a bougé pour la dernière fois. */
function dernierVersement(fichier) {
  const { plusRecent } = bornesDuFichier(fichier.lignes);
  if (!plusRecent) return "aucune date connue";
  return `dernier versement le ${new Date(plusRecent).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric"
  })}`;
}

/**
 * Un fichier : ce qu'il dit, ou qui l'a écrit.
 *
 * Le contenu est le même dans les deux lectures — c'est la marge qui change.
 * Deux rendus différents du même fichier finiraient par ne plus montrer la même
 * chose, et l'on ne saurait plus lequel croire.
 */
export function renderFichier(fichier, { lecture = LECTURE.CODE, auteurs = new Map() } = {}) {
  const bornes = bornesDuFichier(fichier.lignes);

  const ligne = (assertion, rang) => {
    const blame = blameDeLaLigne(assertion, auteurs);
    const jetons = jetonsDeLAssertion(assertion);

    return `
      <div class="memoire-ligne${lecture === LECTURE.BLAME ? " memoire-ligne--blame" : ""}">
        ${
          lecture === LECTURE.BLAME
            ? `<button type="button" class="memoire-blame memoire-blame--chaleur-${chaleurDeLaLigne(assertion, bornes)}"
                 ${blame.propositionId ? `data-memoire-proposition="${escapeHtml(blame.propositionId)}"` : "disabled"}
                 title="${escapeHtml([blame.qui, blame.quand ? formatDate(blame.quand) : ""].filter(Boolean).join(" · ") || "origine inconnue")}">
                 <span class="memoire-blame__ref">${escapeHtml(blame.intitule)}</span>
                 <span class="memoire-blame__date">${escapeHtml(blame.quand ? formatDate(blame.quand) : "—")}</span>
               </button>`
            : ""
        }
        <span class="memoire-ligne__num">${rang + 1}</span>
        <span class="memoire-ligne__code">${renderJetons(jetons)}</span>
      </div>
    `;
  };

  return `
    <section class="memoire-fichier">
      <header class="memoire-fichier__tete">
        <span class="memoire-fichier__nom">${escapeHtml(cheminDeFichier(fichier.chemin))}</span>
        <button type="button" class="memoire-fichier__copier" data-memoire-copier
          title="Copier le fichier dans le presse-papiers" aria-label="Copier le fichier dans le presse-papiers">
          ${svgIcon("copy", { className: "octicon" })}
        </button>
        <span class="memoire-fichier__lectures">
          ${[[LECTURE.CODE, "Code"], [LECTURE.BLAME, "Blame"]]
            .map(([cle, libelle]) => `
              <button type="button" class="memoire-lecture${lecture === cle ? " is-active" : ""}"
                data-memoire-lecture="${cle}" aria-pressed="${lecture === cle}">${libelle}</button>
            `)
            .join("")}
        </span>
      </header>
      <div class="memoire-fichier__corps">
        ${fichier.lignes.map(ligne).join("")
          || `<p class="review-empty-note">Ce fichier ne porte plus aucune valeur : tout ce qu'il contenait a été remplacé ou écarté.</p>`}
      </div>
      ${
        fichier.ecartees.length
          ? `<footer class="memoire-fichier__ecartees">
               <b>${fichier.ecartees.length} écartée${fichier.ecartees.length > 1 ? "s" : ""}</b>
               <p>Un refus est une information — mais ce n'est pas une valeur du projet.</p>
               ${fichier.ecartees.map((assertion, rang) => `
                 <div class="memoire-ligne memoire-ligne--ecartee">
                   <span class="memoire-ligne__num">${rang + 1}</span>
                   <span class="memoire-ligne__code">${renderJetons(jetonsDeLAssertion(assertion))}</span>
                 </div>`).join("")}
             </footer>`
          : ""
      }
    </section>
  `;
}

/** Le fichier, en clair — ce que le bouton met dans le presse-papiers. */
export function fichierEnClair(fichier, { enClair } = {}) {
  const lignes = [
    `§ ${cheminDeFichier(fichier.chemin)}`,
    "",
    ...fichier.lignes.map((assertion) => enClair(jetonsDeLAssertion(assertion)))
  ];

  if (fichier.ecartees.length) {
    lignes.push("", `¶ ${fichier.ecartees.length} écartée(s)`);
    lignes.push(...fichier.ecartees.map((assertion) => `— ${enClair(jetonsDeLAssertion(assertion))}`));
  }

  return lignes.join("\n");
}

/** Une affirmation de la mémoire, dans l'écriture du projet. */
export function jetonsDeLAssertion(assertion = {}) {
  const payload = assertion.payload ?? {};
  return ligneDAffirmation({
    sujet: texte(payload.subject) || texte(assertion.subject_key),
    valeur: texte(payload.value) || texte(assertion.statement),
    zones: Array.isArray(assertion.zones) ? assertion.zones : (payload.zones ?? []),
    deduitDe: payload.deduitDe ?? null,
    source: [texte(payload.source), texte(payload.article)].filter(Boolean).join(", ")
  });
}

function renderJetons(jetons = []) {
  return jetons
    .map((entree) => `<span class="mdall-${escapeHtml(entree.type)}">${escapeHtml(entree.texte)}</span>`)
    .join("");
}

function formatDate(valeur) {
  const date = new Date(valeur);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export { cleHtml };
