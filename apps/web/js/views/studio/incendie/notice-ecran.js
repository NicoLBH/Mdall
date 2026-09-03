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

/**
 * La notice et ses compléments, sur une seule grille.
 *
 * ## Pourquoi une grille, et pas deux colonnes qui défilent
 *
 * Deux colonnes indépendantes se désynchronisent dès que l'une est plus haute
 * que l'autre — et elle l'est toujours : un formulaire prend trois fois la
 * place d'une phrase. On se retrouvait à choisir la nature de la couverture en
 * lisant, à gauche, le paragraphe des conduits et gaines.
 *
 * Une grille où **chaque phrase occupe une ligne** règle le problème une fois
 * pour toutes : la hauteur d'une ligne est celle de son plus haut occupant, et
 * la phrase est donc toujours en face de ce qui la complète. Rien à
 * synchroniser, rien à mesurer — la mise en page le fait.
 *
 * Le blanc qui reste sous une phrase courte n'est pas un défaut : c'est ce qui
 * distingue un document annoté d'un formulaire, et c'est là qu'on lit.
 */
function dessinerLeDocument(notice, complements, bibliotheque, departement) {
  const lignes = [];
  const ligne = (paragraphe) => {
    const champ = paragraphe.champ;
    lignes.push(`
      <p class="notice-paragraphe${champ ? " est-completable" : ""}"
         data-notice-paragraphe="${escapeHtml(paragraphe.cle)}">${escapeHtml(paragraphe.texte)}</p>
      <div class="notice-cellule">${champ ? dessinerChamp(paragraphe, complements, bibliotheque) : ""}</div>
    `);
  };

  for (const section of notice.sections ?? []) {
    lignes.push(`<h5 class="notice-titre">${section.numero}. ${escapeHtml(section.titre)}</h5>`);
    for (const p of section.paragraphes ?? []) ligne(p);
    (section.sousSections ?? []).forEach((sous, i) => {
      lignes.push(`<h6 class="notice-sous-titre">${section.numero}.${i + 1} ${escapeHtml(sous.titre)}</h6>`);
      for (const p of sous.paragraphes ?? []) ligne(p);
    });
  }

  const renseignes = (notice.entete ?? []).filter((c) => c.valeur);
  return `
    <div class="notice-document" data-notice-document>
      <header class="notice-document__tete">
        <h4>Notice descriptive de sécurité</h4>
        <p>Pour les bâtiments d'habitation — arrêté du 31 janvier 1986 modifié</p>
      </header>
      ${renseignes.length ? `
        <dl class="notice-entete">
          ${renseignes.map((c) => `<dt>${escapeHtml(c.libelle)}</dt><dd>${escapeHtml(c.valeur)}</dd>`).join("")}
        </dl>` : ""}
      ${lignes.length ? `
        <p class="notice-document__mot">
          ${svgIcon("comment", { className: "octicon" })}
          À droite de chaque phrase, ce que l'arrêté ne peut pas savoir : la matière, le procédé, le
          dispositif. Plusieurs réponses sont possibles — un bâtiment peut avoir un enduit au
          rez-de-chaussée et un bardage dans les étages.
          ${departement ? `Les propositions tiennent compte de ce qui se construit dans le département ${escapeHtml(departement)}.` : ""}
        </p>` : ""}
      ${lignes.join("")}
    </div>
  `;
}

/**
 * Un complément : ses propositions, et de quoi écrire autre chose.
 *
 * Les cases se cumulent — un bâtiment a rarement un seul système de façade —
 * et un second clic retire la sienne : une case qu'on ne peut pas décocher est
 * un piège. Ce qui est tapé à la main entre dans la bibliothèque du seul fait
 * qu'on l'a retenu.
 */
function dessinerChamp(paragraphe, complements, bibliotheque) {
  const champ = paragraphe.champ;
  const valeur = complements?.[paragraphe.cle]?.[champ.cle] ?? "";
  const propositions = propositionsDe(champ, bibliotheque);
  const retenues = champ.multiple
    ? String(valeur).split(" et ").map((v) => v.trim()).filter(Boolean)
    : [String(valeur).trim()].filter(Boolean);
  // Ce qui a été tapé à la main plutôt que coché : on le montre, sinon on ne
  // sait plus d'où vient la moitié de la phrase.
  const libres = retenues.filter((v) => !propositions.some((p) => p.libelle === v));

  return `
    <section class="notice-champ" data-notice-champ="${escapeHtml(paragraphe.cle)}">
      <h6>${escapeHtml(champ.libelle)}</h6>
      <div class="notice-champ__options" role="group" aria-label="${escapeHtml(champ.libelle)}">
        ${propositions.map((option) => {
          const coche = retenues.includes(option.libelle);
          return `
            <button type="button" role="checkbox" aria-checked="${coche}"
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
      ${libres.length ? `<p class="notice-champ__libres">Ajouté à la main : ${escapeHtml(libres.join(" et "))}</p>` : ""}
      <details class="notice-champ__autre"${libres.length ? " open" : ""}>
        <summary>Autre chose</summary>
        <textarea class="notice-champ__texte" rows="2"
                  data-notice-saisie="${escapeHtml(paragraphe.cle)}"
                  placeholder="Décrivez-le vous-même — les cases cochées s'y retrouvent, séparées par « et »"
        >${escapeHtml(valeur)}</textarea>
      </details>
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
      ${dessinerLeDocument(notice, complements, bibliotheque, departement)}
    </div>
  `;
}
