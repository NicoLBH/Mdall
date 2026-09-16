/**
 * La barre où la requête se lit, s'écrit et se corrige.
 *
 * ## Pourquoi elle vit ici
 *
 * Elle est née dans l'onglet Sujets d'un projet, et les propositions la
 * demandent maintenant à leur tour — dans un projet comme à travers tous. Une
 * seconde barre aurait sa propre grammaire, son propre miroir et son propre
 * bouton d'effacement, et deux barres de recherche se ressemblent assez pour
 * qu'on ne remarque leurs différences qu'en se trompant (règle 10).
 *
 * ## Ce qu'elle porte
 *
 * Le **miroir**, sous le champ, colore les jetons reconnus : c'est ce qui
 * distingue d'un coup d'œil `label:cr-chantier`, qui filtre, de `label:zoiseau`,
 * qui cherche le mot. Rien d'autre à l'écran ne dit cette différence.
 *
 * La **phrase des ignorés** dit ce qu'un champ déclaré n'a pas pu appliquer.
 * Un filtre silencieusement sans effet est pire qu'une erreur : la liste a
 * l'air filtrée, et elle ne l'est pas.
 *
 * ## Le nom de l'écran entre dans les attributs
 *
 * `data-sujets-recherche`, `data-propositions-recherche` : deux écrans montés
 * ensemble — un détail de sujet au-dessus d'une liste — écouteraient sinon le
 * champ l'un de l'autre. Le nom se donne, il ne se devine pas.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { renderQueryMirror } from "../../services/query-bar.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Un nom d'écran utilisable dans un attribut de données, et rien d'autre. */
const nomSain = (valeur) => (/^[a-z][a-z0-9-]*$/.test(texte(valeur)) ? texte(valeur) : "sujets");

/**
 * @param {object} options
 * @param {string} [options.nom] le nom de l'écran, dans les attributs
 * @param {string} options.requete ce qui est écrit
 * @param {object[]} options.champs ceux que la grammaire déclare
 * @param {string[]} [options.ignores] ce qu'on n'a pas pu appliquer
 * @param {boolean} [options.epingler] le bouton d'épingle
 * @param {boolean} [options.suggestions] l'hôte des suggestions au curseur —
 *   **il ne se pose que là où quelqu'un les remplit** : un panneau qui ne
 *   s'ouvre jamais est une promesse qu'on ne tient pas.
 * @param {string} [options.placeholder]
 * @param {string} [options.etiquette] ce que le lecteur d'écran annonce
 * @param {string} [options.phraseDesIgnores] déjà écrite par la grammaire
 */
export function renderBarreDeRequeteHtml({
  nom = "sujets", requete = "", champs = [], ignores = [], epingler = true,
  suggestions = true,
  placeholder = "Chercher — un mot du titre, statut:ouvert, label:…",
  etiquette = "Chercher",
  phraseDesIgnores = ""
} = {}) {
  const sien = nomSain(nom);
  const dite = texte(phraseDesIgnores);
  const remplie = Boolean(texte(requete));
  void ignores;

  return `
    <div class="memory-search sujets-search gh-field-focus">
      <div class="memory-search__field">
        <div class="memory-search__mirror" aria-hidden="true">${renderQueryMirror(requete, champs)}</div>
        <input
          type="search"
          class="gh-input memory-search__input"
          placeholder="${escapeHtml(placeholder)}"
          value="${escapeHtml(texte(requete))}"
          aria-label="${escapeHtml(etiquette)}"
          data-${escapeHtml(sien)}-recherche
        >
        <div class="memory-search__gestes">
          ${/*
            **L'épingle disparaît dans le formulaire.** Épingler une recherche
            et enregistrer la vue qu'on est en train d'écrire, ce sont deux
            gestes pour une seule chose — et celui du haut ne garderait ni le
            nom ni l'habit qu'on vient de choisir (règle 10).
          */""}
          ${epingler ? `
          <button type="button" class="bouton-discret memory-search__geste" data-${escapeHtml(sien)}-epingler
            title="Épingler cette recherche" aria-label="Épingler cette recherche"
            ${remplie ? "" : "disabled"}>
            ${svgIcon("pin", { className: "octicon" })}
          </button>
          ` : ""}
          <button type="button" class="bouton-discret memory-search__geste" data-${escapeHtml(sien)}-vider
            title="Effacer la recherche" aria-label="Effacer la recherche"
            ${remplie ? "" : "disabled"}>
            ${svgIcon("x", { className: "octicon" })}
          </button>
        </div>
      </div>
      <span class="memory-search__icon" aria-hidden="true">${svgIcon("search", { className: "octicon" })}</span>
      ${suggestions ? `<div class="memory-search__suggestions" data-${escapeHtml(sien)}-suggestions hidden
        role="listbox" aria-label="Compléter la recherche"></div>` : ""}
    </div>
    ${dite ? `<p class="sujets-search__reserve mono-small">${escapeHtml(dite)}</p>` : ""}
  `;
}
