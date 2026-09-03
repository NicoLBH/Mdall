/**
 * L'onglet « Notice de sécurité ».
 *
 * ## Deux colonnes, et elles ne disent pas la même chose
 *
 * À gauche, **la notice** : les phrases telles qu'elles partiront en mairie.
 * Elles ne se tapent pas, elles se rédigent — le questionnaire a dit « CF 1/2 h »,
 * la notice dit « Les planchers seront CF 1/2 h ». Rien n'y est modifiable
 * directement : ce qui est dérivé se recalcule.
 *
 * À droite, **ce que le référentiel ne peut pas savoir** : la matière, le
 * procédé, le dispositif. L'arrêté exige un degré, il ne dit pas « en béton
 * armé ». Ces choix-là appartiennent à celui qui conçoit, et on les lui demande
 * là où ils manquent — jamais ailleurs.
 *
 * ## Pourquoi des cases, et pourquoi dans cet ordre
 *
 * Taper « béton armé » pour la centième fois n'apprend rien à personne. Les
 * réponses les plus fréquentes sont donc proposées, et leur ordre vient de
 * l'usage réel : ce qui a été retenu le plus souvent arrive en tête, et ce qui
 * a été retenu près d'ici pèse plus lourd. La bibliothèque ne se constitue pas
 * à l'avance — elle se construit à mesure, et une réponse tapée à la main entre
 * dedans du seul fait qu'on l'a retenue.
 *
 * Ce qui en sort est pesé : le libellé, et le département. Ni le projet, ni le
 * compte. On ne peut remonter d'une ligne ni à un chantier ni à quelqu'un.
 */

import { escapeHtml } from "../../../utils/escape-html.js";
import { renderMarkdownToHtml } from "../../../utils/markdown-renderer.js";
import { svgIcon } from "../../../ui/icons.js";

/**
 * Le département, tiré d'une adresse.
 *
 * « 43 Route du Pelloux, 74920 COMBLOUX » donne « 74 ». C'est la seule
 * granularité qui sort du projet vers la bibliothèque commune : une commune
 * serait déjà presque un chantier, et l'on saurait où. Un code corse — 2A, 2B —
 * se lit aussi, et rien d'autre ne sort.
 *
 * Il vit ici, avec le reste de ce qui se lit et s'écrit sans réseau : une
 * fonction qui n'a besoin que d'une chaîne se teste sans base de données.
 */
export function departementDe(adresse) {
  const code = String(adresse ?? "").match(/\b(\d{5}|2[AB]\d{3})\b/)?.[1];
  if (!code) return "";
  return /^\d/.test(code) ? code.slice(0, 2) : code.slice(0, 2).toUpperCase();
}

/** Les paragraphes de la notice, à plat : c'est l'ordre de lecture. */
export function paragraphesDe(notice) {
  const sortie = [];
  for (const section of notice?.sections ?? []) {
    for (const p of section.paragraphes ?? []) sortie.push(p);
    for (const sous of section.sousSections ?? []) for (const p of sous.paragraphes ?? []) sortie.push(p);
  }
  return sortie;
}

/**
 * Les propositions d'un champ, classées par l'usage.
 *
 * Les amorces de la trame passent en dernier si personne ne les a jamais
 * retenues : elles n'ont pas d'autorité particulière, elles évitent seulement
 * de partir d'une liste vide le premier jour.
 */
export function propositionsDe(champ, bibliotheque = {}) {
  const vues = bibliotheque[champ?.rubrique] ?? [];
  const connues = new Set(vues.map((v) => v.libelle));
  return [
    ...vues.map((v) => ({ libelle: v.libelle, poids: v.poids })),
    ...(champ?.options ?? []).filter((o) => !connues.has(o)).map((o) => ({ libelle: o, poids: 0 }))
  ].slice(0, 8);
}

/** La notice, à gauche : ce qui partira en mairie. */
function dessinerLeTexte(notice, entete) {
  const renseignes = (entete ?? []).filter((c) => c.valeur);
  return `
    <article class="notice-texte" data-notice-texte>
      <header class="notice-texte__tete">
        <h4>Notice descriptive de sécurité</h4>
        <p>Pour les bâtiments d'habitation — arrêté du 31 janvier 1986 modifié</p>
      </header>
      ${renseignes.length ? `
        <dl class="notice-entete">
          ${renseignes.map((c) => `
            <dt>${escapeHtml(c.libelle)}</dt>
            <dd>${escapeHtml(c.valeur)}</dd>
          `).join("")}
        </dl>` : ""}
      ${(notice.sections ?? []).map((section) => `
        <section class="notice-section">
          <h5>${section.numero}. ${escapeHtml(section.titre)}</h5>
          ${(section.paragraphes ?? []).map(dessinerParagraphe).join("")}
          ${(section.sousSections ?? []).map((sous, i) => `
            <div class="notice-sous-section">
              <h6>${section.numero}.${i + 1} ${escapeHtml(sous.titre)}</h6>
              ${(sous.paragraphes ?? []).map(dessinerParagraphe).join("")}
            </div>
          `).join("")}
        </section>
      `).join("")}
    </article>
  `;
}

function dessinerParagraphe(paragraphe) {
  return `<p class="notice-paragraphe" data-notice-paragraphe="${escapeHtml(paragraphe.cle)}">${
    escapeHtml(paragraphe.texte)}</p>`;
}

/**
 * Les compléments, à droite : un bloc par phrase qui en attend un.
 *
 * Le bloc porte l'extrait de la phrase concernée, pour qu'on sache ce qu'on
 * complète sans avoir à chercher à gauche.
 */
function dessinerLesChamps(notice, complements, bibliotheque, departement) {
  const avecChamp = paragraphesDe(notice).filter((p) => p.champ);
  if (avecChamp.length === 0) {
    return `<p class="gh-text-muted">Rien à préciser pour l'instant : répondez au questionnaire, les phrases
      qui attendent une description apparaîtront ici.</p>`;
  }

  return `
    <div class="notice-champs">
      <p class="notice-champs__mot">
        ${svgIcon("comment", { className: "octicon" })}
        L'arrêté exige un degré ; il ne dit pas en quoi c'est fait. Ces précisions-là vous appartiennent.
        ${departement ? `Les propositions tiennent compte de ce qui se construit dans le département ${escapeHtml(departement)}.` : ""}
      </p>
      ${avecChamp.map((paragraphe) => dessinerChamp(paragraphe, complements, bibliotheque)).join("")}
    </div>
  `;
}

function dessinerChamp(paragraphe, complements, bibliotheque) {
  const champ = paragraphe.champ;
  const valeur = complements?.[paragraphe.cle]?.[champ.cle] ?? "";
  const propositions = propositionsDe(champ, bibliotheque);
  const retenues = champ.multiple
    ? String(valeur).split(" et ").map((v) => v.trim()).filter(Boolean)
    : [String(valeur).trim()].filter(Boolean);

  return `
    <section class="notice-champ" data-notice-champ="${escapeHtml(paragraphe.cle)}">
      <h6>${escapeHtml(champ.libelle)}</h6>
      <p class="notice-champ__extrait">${escapeHtml(paragraphe.texte)}</p>
      <div class="notice-champ__options" role="${champ.multiple ? "group" : "radiogroup"}"
           aria-label="${escapeHtml(champ.libelle)}">
        ${propositions.map((option) => {
          const coche = retenues.includes(option.libelle);
          return `
            <button type="button" role="${champ.multiple ? "checkbox" : "radio"}" aria-checked="${coche}"
                    class="notice-option${coche ? " est-coche" : ""}"
                    data-notice-option="${escapeHtml(paragraphe.cle)}"
                    data-notice-valeur="${escapeHtml(option.libelle)}">
              <span class="notice-option__marque" aria-hidden="true"></span>
              ${escapeHtml(option.libelle)}
              ${option.poids ? `<em title="retenu ${option.poids} fois">${option.poids}</em>` : ""}
            </button>
          `;
        }).join("")}
      </div>
      <div class="notice-champ__saisie">
        <textarea class="notice-champ__texte" rows="2"
                  data-notice-saisie="${escapeHtml(paragraphe.cle)}"
                  placeholder="… ou décrivez-le vous-même (markdown accepté)">${escapeHtml(valeur)}</textarea>
        ${valeur ? `<div class="notice-champ__apercu md-body">${renderMarkdownToHtml(valeur)}</div>` : ""}
      </div>
    </section>
  `;
}

/** L'en-tête administratif : ce que le projet sait déjà, et ce qu'on complète. */
function dessinerLEntete(entete, venuesDeLaMemoire) {
  return `
    <details class="notice-entete-saisie">
      <summary>${svgIcon("pencil", { className: "octicon" })} En-tête de la notice — ${
        (entete ?? []).filter((c) => c.valeur).length} champ(s) renseigné(s)</summary>
      ${(entete ?? []).map((c) => `
        <label class="notice-entete-saisie__champ">
          <span>${escapeHtml(c.libelle)}
            ${venuesDeLaMemoire?.[c.cle] ? `<em title="Repris de la mémoire du projet">mémoire</em>` : ""}</span>
          <textarea rows="${c.cle === "maitriseOeuvre" || c.cle === "contact" ? 3 : 1}"
                    data-notice-entete="${escapeHtml(c.cle)}">${escapeHtml(c.valeur)}</textarea>
        </label>
      `).join("")}
    </details>
  `;
}

/** L'onglet entier. */
export function dessinerLaNotice({ notice, complements, bibliotheque, departement, venuesDeLaMemoire, enCours, erreur }) {
  if (erreur) return `<p class="fondations-erreur">${escapeHtml(erreur)}</p>`;
  if (!notice) return `<p class="gh-text-muted">${enCours ? "Rédaction de la notice…" : "La notice n'a pas pu être rédigée."}</p>`;

  return `
    <div class="notice">
      <div class="notice__barre">
        ${dessinerLEntete(notice.entete, venuesDeLaMemoire)}
        <button type="button" class="notice__copier" data-notice-copier>
          ${svgIcon("copy", { className: "octicon" })} Copier la notice
        </button>
      </div>
      <div class="notice__colonnes">
        ${dessinerLeTexte(notice, notice.entete)}
        <aside class="notice__complements">
          ${dessinerLesChamps(notice, complements, bibliotheque, departement)}
        </aside>
      </div>
    </div>
  `;
}
