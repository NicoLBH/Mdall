/**
 * Le wiki du langage Mdall, en pleine fenêtre.
 *
 * ## Il ne sait rien du langage
 *
 * Il met en page une **donnée** — `contenus/wiki-du-langage-mdall.js` —, et
 * rien d'autre. Corriger une phrase du wiki ne touche donc pas cet écran, et
 * ajouter une section ne demande pas de le relire. C'est la seule façon pour
 * qu'une documentation vive : elle se corrige là où on la lit, pas dans le code
 * qui l'affiche.
 *
 * ## Les exemples sont colorés par le peintre de la saisie
 *
 * `jetonsEcrits`, celui de la zone de code — et non celui de la mémoire, qui
 * **recompose** les lignes dans leur forme canonique. Un exemple du wiki doit
 * se lire exactement comme la même ligne tapée à la main : mêmes caractères,
 * mêmes couleurs. Autrement on recopie un exemple, on le voit changer d'aspect
 * sous ses doigts, et l'on croit s'être trompé.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { renderJetons } from "./code-mdall.js";
import { jetonsEcrits } from "../../services/mdall-en-ecriture.js";
import { WIKI_DU_LANGAGE, sommaireDuWiki } from "../../contenus/wiki-du-langage-mdall.js";
import { ouvrirLaFenetreDeDetails } from "./fenetre-de-details.js";

/**
 * Le gras d'un paragraphe, et lui seul.
 *
 * Le texte est **échappé d'abord** : `**` ne se pose qu'ensuite, sur du HTML
 * déjà sûr. Une balise écrite dans le contenu ne peut donc pas en sortir, et
 * l'on n'a pas besoin d'un rendu Markdown pour deux astérisques.
 */
export function renderTexteDuWiki(texte = "") {
  return escapeHtml(String(texte ?? ""))
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/`([^`]+)`/g, '<code class="wiki-mdall__mot">$1</code>');
}

/** Un exemple de Mdall, numéroté et coloré comme dans l'éditeur. */
export function renderExempleDuWiki(code = "") {
  const lignes = String(code ?? "").split("\n");

  return `
    <div class="fichier-code wiki-mdall__code">
      ${lignes.map((ligne, rang) => `
        <div class="memoire-ligne">
          <span class="memoire-ligne__num">${rang + 1}</span>
          <span class="memoire-ligne__code">${renderJetons(jetonsEcrits(ligne)) || "&nbsp;"}</span>
        </div>
      `).join("")}
    </div>
  `;
}

/** Un bloc, quel qu'il soit. Un bloc d'un genre inconnu ne rend rien. */
export function renderBlocDuWiki(bloc = null) {
  if (bloc?.quoi === "texte") return `<p class="wiki-mdall__dit">${renderTexteDuWiki(bloc.texte)}</p>`;
  if (bloc?.quoi === "code") return renderExempleDuWiki(bloc.code);

  if (bloc?.quoi === "liste") {
    return `<ul class="wiki-mdall__liste">${(bloc.points ?? [])
      .map((point) => `<li>${renderTexteDuWiki(point)}</li>`).join("")}</ul>`;
  }

  if (bloc?.quoi === "table") {
    return `
      <table class="wiki-mdall__table">
        <thead><tr>${(bloc.entetes ?? [])
          .map((entete) => `<th>${renderTexteDuWiki(entete)}</th>`).join("")}</tr></thead>
        <tbody>${(bloc.lignes ?? []).map((ligne) => `
          <tr>${ligne.map((case_) => `<td>${renderTexteDuWiki(case_)}</td>`).join("")}</tr>
        `).join("")}</tbody>
      </table>
    `;
  }

  return "";
}

/** Le sommaire : une entrée par section, et elle emmène. */
export function renderSommaireDuWiki() {
  return `
    <nav class="wiki-mdall__sommaire" aria-label="Sections du wiki">
      ${sommaireDuWiki().map(({ id, titre }) => `
        <a class="wiki-mdall__lien" href="#wiki-${escapeHtml(id)}"
          data-wiki-vers="${escapeHtml(id)}">${escapeHtml(titre)}</a>
      `).join("")}
    </nav>
  `;
}

/** Le wiki entier : le sommaire à gauche, les sections à droite. */
export function renderWikiMdall() {
  return `
    <div class="wiki-mdall">
      ${renderSommaireDuWiki()}
      <article class="wiki-mdall__corps">
        ${WIKI_DU_LANGAGE.map((une) => `
          <section class="wiki-mdall__section" id="wiki-${escapeHtml(une.id)}">
            <h3 class="wiki-mdall__titre">${escapeHtml(une.titre)}</h3>
            ${une.blocs.map(renderBlocDuWiki).join("")}
          </section>
        `).join("")}
      </article>
    </div>
  `;
}

/**
 * Ouvrir le wiki dans la fenêtre de l'application.
 *
 * `#detailsModal` attend dans le document depuis toujours : son voile, sa
 * croix, sa fermeture au clavier et son ombre sont déjà réglés. En dessiner une
 * seconde reviendrait à recalibrer tout cela contre la première, et à les faire
 * diverger au premier réglage (règle 10).
 */
export function ouvrirLeWikiMdall() {
  const corps = ouvrirLaFenetreDeDetails({
    titreHtml: escapeHtml("Le langage Mdall"),
    metaHtml: escapeHtml("Ce qu'il fait, à quoi il sert, et comment il s'écrit."),
    corpsHtml: renderWikiMdall(),
    className: "details-modal--plein"
  });

  if (!corps) return null;

  // Le sommaire fait défiler le corps, il ne change pas l'adresse de la page :
  // une ancre poserait un `#` dans l'URL de l'application et casserait le
  // retour arrière.
  corps.addEventListener("click", (evenement) => {
    const lien = evenement.target.closest?.("[data-wiki-vers]");
    if (!lien) return;
    evenement.preventDefault();
    corps.querySelector(`#wiki-${CSS.escape(lien.dataset.wikiVers)}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  return corps;
}
