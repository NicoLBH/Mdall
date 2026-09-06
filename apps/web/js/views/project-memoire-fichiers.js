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
import {
  ligneDAffirmation, blocDeRaisonnement, cheminDeFichier, nomDeFichier, GESTE
} from "../services/memoire-en-texte.js";
import { phraseDuDossier, rangDuDossier } from "../services/memoire-rangement.js";
import {
  fichiersDeLaMemoire, dossiersDeLaMemoire, blameDeLaLigne, chaleurDeLaLigne, bornesDuFichier,
  dernierVersementDe, versementsDeLaMemoire
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

export function renderBarre({ chemin = [], query = "", ouverte = true, racine = false } = {}) {
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
        ${racine ? "" : `<button type="button" class="documents-tree__toggle" data-memoire-replier
          aria-label="${escapeHtml(ouverte ? "Replier la barre latérale" : "Étendre la barre latérale")}"
          title="${escapeHtml(ouverte ? "Replier la barre latérale" : "Étendre la barre latérale")}">
          ${svgIcon(ouverte ? "sidebar-collapse" : "sidebar-expand", { className: "octicon" })}
        </button>`}
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
export function renderDossiers(memoire, { assertions = [] } = {}) {
  if (!(memoire.dossiers ?? []).length) {
    return `<div class="propositions-empty"><b>La mémoire est vide</b>
      <p>Rien n'y entre directement : ce que le projet retient passe par une proposition, et quelqu'un la signe.</p></div>`;
  }

  return `
    ${renderEnTeteDeMemoire(assertions)}
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
export function renderFichiers(memoire, dossier, { auteurs = new Map(), propositions = new Map() } = {}) {
  const entree = (memoire.dossiers ?? []).find((candidat) => candidat.nom === dossier);
  if (!entree) {
    return `<div class="propositions-empty"><b>Ce dossier est vide</b>
      <p>Aucune affirmation ne s'y range aujourd'hui.</p></div>`;
  }

  const toutes = entree.fichiers.flatMap((fichier) => fichier.lignes);

  return `
    ${renderDernierVersement(toutes, { auteurs, propositions })}
    <div class="memoire-liste memoire-liste--tableau">
      <div class="memoire-entete">
        <span class="memoire-entete__nom">Fichier</span>
        <span class="memoire-entete__message">Dernier versement</span>
        <span class="memoire-entete__date">Date</span>
      </div>
      ${entree.fichiers
        .map((fichier) => {
          const dernier = dernierVersementDe(fichier.lignes, { auteurs, propositions });
          return `
            <button type="button" class="memoire-entree memoire-entree--fichier" data-memoire-aller="${escapeHtml(fichier.chemin.join("/"))}">
              <span class="memoire-entree__nom">
                <span class="memoire-entree__icone">${svgIcon("file", { className: "octicon" })}</span>
                ${escapeHtml(nomDeFichier(fichier.chemin))}
              </span>
              <span class="memoire-entree__message">${escapeHtml(dernier?.message || "—")}</span>
              <span class="memoire-entree__date">${escapeHtml(dernier ? ilYA(dernier.quand) : "—")}</span>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

/**
 * Ce que la mémoire a reçu, en tête de sa racine.
 *
 * On compte des **versements**, pas des lignes : une proposition qui verse
 * trente contraintes est un acte, et c'est l'acte qui fait l'histoire du
 * projet.
 */
export function renderEnTeteDeMemoire(assertions = []) {
  const { versements, plusRecent } = versementsDeLaMemoire(assertions);
  if (!versements) return "";

  return `
    <div class="memoire-entete-racine">
      <span class="memoire-entete-racine__espace"></span>
      <span class="memoire-entete-racine__date">${escapeHtml(ilYA(plusRecent))}</span>
      <span class="memoire-entete-racine__sep">·</span>
      <span class="memoire-entete-racine__compte">
        ${svgIcon("history", { className: "octicon" })}
        <b>${versements}</b> versement${versements > 1 ? "s" : ""}
      </span>
    </div>
  `;
}

/**
 * L'encart du dernier versement, en tête d'un dossier ou d'un fichier.
 *
 * Qui, quoi, quand — dans cet ordre, parce que c'est l'ordre dans lequel on lit
 * un changement : on regarde de qui il vient avant de lire ce qu'il dit.
 */
export function renderDernierVersement(lignes, { auteurs = new Map(), propositions = new Map() } = {}) {
  const dernier = dernierVersementDe(lignes, { auteurs, propositions });
  if (!dernier) return "";

  const qui = dernier.qui || "auteur inconnu";
  return `
    <div class="memoire-versement">
      <span class="memoire-versement__avatar" aria-hidden="true">${escapeHtml(initialesDe(qui))}</span>
      <span class="memoire-versement__qui">${escapeHtml(qui)}</span>
      <span class="memoire-versement__message">${escapeHtml(dernier.message || "sans intitulé")}</span>
      <span class="memoire-versement__espace"></span>
      ${
        dernier.propositionId
          ? `<button type="button" class="memoire-versement__ref" data-memoire-proposition="${escapeHtml(dernier.propositionId)}">${escapeHtml(dernier.intitule)}</button>`
          : `<span class="memoire-versement__ref">${escapeHtml(dernier.intitule)}</span>`
      }
      <span class="memoire-versement__sep">·</span>
      <span class="memoire-versement__date">${escapeHtml(ilYA(dernier.quand))}</span>
    </div>
  `;
}

/** Les initiales d'un nom, faute d'une photo. */
function initialesDe(nom) {
  const mots = texte(nom).split(/\s+/).filter(Boolean);
  if (!mots.length) return "?";
  return (mots[0][0] + (mots.length > 1 ? mots[mots.length - 1][0] : "")).toUpperCase();
}

/**
 * Depuis combien de temps, en français.
 *
 * Une date absolue demande de compter ; « il y a 5 mois » se lit sans y penser.
 * La date exacte reste dans l'infobulle, pour qui en a besoin.
 */
export function ilYA(quand) {
  const date = Date.parse(texte(quand));
  if (!Number.isFinite(date)) return "date inconnue";

  const jours = Math.floor((Date.now() - date) / 86400000);
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return "hier";
  if (jours < 31) return `il y a ${jours} jours`;
  const mois = Math.round(jours / 30.44);
  if (mois < 12) return `il y a ${mois} mois`;
  const ans = Math.round(jours / 365.25);
  return `il y a ${ans} an${ans > 1 ? "s" : ""}`;
}

/**
 * Un fichier : ce qu'il dit, ou qui l'a écrit.
 *
 * Le contenu est le même dans les deux lectures — c'est la marge qui change.
 * Deux rendus différents du même fichier finiraient par ne plus montrer la même
 * chose, et l'on ne saurait plus lequel croire.
 *
 * ## Une affirmation, plusieurs lignes
 *
 * Depuis que la mémoire garde les raisonnements, une affirmation occupe un
 * bloc. La marge du Blame ne se répète pas sur chacune de ses lignes : elles
 * viennent toutes du même versement, et répéter le même numéro quatre fois
 * ferait croire à quatre décisions.
 */
export function renderFichier(fichier, {
  lecture = LECTURE.CODE, auteurs = new Map(), propositions = new Map()
} = {}) {
  const bornes = bornesDuFichier(fichier.lignes);
  const clair = fichierEnClair(fichier, { enClair: enClairDesJetons });

  let rang = 0;
  const bloc = (assertion) => {
    const blame = blameDeLaLigne(assertion, auteurs);
    const lignes = lignesDeLAssertion(assertion);

    return lignes
      .map((ligne, position) => {
        rang += 1;
        return `
      <div class="memoire-ligne${lecture === LECTURE.BLAME ? " memoire-ligne--blame" : ""}${
        ligne.nature === "raisonnement" ? " memoire-ligne--raisonnement" : ""
      }">
        ${
          lecture === LECTURE.BLAME
            ? position === 0
              ? `<button type="button" class="memoire-blame memoire-blame--chaleur-${chaleurDeLaLigne(assertion, bornes)}"
                   ${blame.propositionId ? `data-memoire-proposition="${escapeHtml(blame.propositionId)}"` : "disabled"}
                   title="${escapeHtml([blame.qui, blame.quand ? formatDate(blame.quand) : ""].filter(Boolean).join(" · ") || "origine inconnue")}">
                   <span class="memoire-blame__ref">${escapeHtml(blame.intitule)}</span>
                   <span class="memoire-blame__date">${escapeHtml(blame.quand ? formatDate(blame.quand) : "—")}</span>
                 </button>`
              : `<span class="memoire-blame memoire-blame--suite" aria-hidden="true"></span>`
            : ""
        }
        <span class="memoire-ligne__num">${rang}</span>
        <span class="memoire-ligne__code">${renderJetons(ligne.jetons)}</span>
      </div>
    `;
      })
      .join("");
  };

  const corps = fichier.lignes.map(bloc).join("");

  return `
    <section class="memoire-fichier">
      <header class="memoire-fichier__tete">
        <span class="memoire-fichier__lectures">
          ${[[LECTURE.CODE, "Code"], [LECTURE.BLAME, "Origine"]]
            .map(([cle, libelle]) => `
              <button type="button" class="memoire-lecture${lecture === cle ? " is-active" : ""}"
                data-memoire-lecture="${cle}" aria-pressed="${lecture === cle}">${libelle}</button>
            `)
            .join("")}
        </span>
        <span class="memoire-fichier__mesure">${rang} ligne${rang > 1 ? "s" : ""} · ${octets(clair)}</span>
        <span class="memoire-fichier__espace"></span>
        <button type="button" class="memoire-fichier__copier" data-memoire-copier
          title="Copier le fichier dans le presse-papiers" aria-label="Copier le fichier dans le presse-papiers">
          ${svgIcon("copy", { className: "octicon" })}
        </button>
      </header>
      ${renderDernierVersement(fichier.lignes, { auteurs, propositions })}
      <div class="memoire-fichier__corps">
        ${corps
          || `<p class="review-empty-note">Ce fichier ne porte plus aucune valeur : tout ce qu'il contenait a été remplacé ou écarté.</p>`}
      </div>
      ${
        fichier.ecartees.length
          ? `<footer class="memoire-fichier__ecartees">
               <b>${fichier.ecartees.length} écartée${fichier.ecartees.length > 1 ? "s" : ""}</b>
               <p>Un refus est une information — mais ce n'est pas une valeur du projet.</p>
               ${fichier.ecartees.map((assertion) => `
                 <div class="memoire-ligne memoire-ligne--ecartee">
                   <span class="memoire-ligne__code">${renderJetons(jetonsDeLAssertion(assertion))}</span>
                 </div>`).join("")}
             </footer>`
          : ""
      }
    </section>
  `;
}

/** Le poids d'un fichier, comme un dépôt l'affiche. */
export function octets(contenu) {
  const taille = typeof TextEncoder === "function"
    ? new TextEncoder().encode(String(contenu ?? "")).length
    : String(contenu ?? "").length;
  return taille < 1024 ? `${taille} octets` : `${(taille / 1024).toFixed(1)} Ko`;
}

/** Les jetons, remis à plat — ce que le presse-papiers reçoit. */
function enClairDesJetons(jetons = []) {
  return jetons.map((entree) => entree.texte).join("");
}

/** Le fichier, en clair — ce que le bouton met dans le presse-papiers. */
export function fichierEnClair(fichier, { enClair } = {}) {
  const lignes = [
    `§ ${cheminDeFichier(fichier.chemin)}`,
    "",
    ...fichier.lignes.flatMap((assertion) =>
      lignesDeLAssertion(assertion).map((ligne) => enClair(ligne.jetons)))
  ];

  if (fichier.ecartees.length) {
    lignes.push("", `¶ ${fichier.ecartees.length} écartée(s)`);
    lignes.push(...fichier.ecartees.map((assertion) => `— ${enClair(jetonsDeLAssertion(assertion))}`));
  }

  return lignes.join("\n");
}

/**
 * Une affirmation de la mémoire, en une ou plusieurs lignes.
 *
 * ## Pourquoi une affirmation n'est plus une ligne
 *
 * Une mémoire de projet ne garde pas que des valeurs. Elle garde ce qu'on a
 * **décidé**, ce qu'on **suppose**, le raisonnement qui a mené là, la raison
 * qui le fonde, ses exceptions, et ce dont il dépend. Écrit en une ligne, tout
 * cela se perd : il reste un chiffre, et six mois plus tard personne ne sait
 * plus si on pouvait en discuter.
 *
 * Le raisonnement s'écrit donc **avant** la valeur qu'il produit — du général
 * au particulier, comme on lit un texte, et à l'inverse d'un tableur.
 *
 * @returns {{jetons: object[], nature: string}[]}
 */
export function lignesDeLAssertion(assertion = {}) {
  const payload = assertion.payload ?? {};
  const valeur = texte(payload.value) || texte(assertion.statement);

  const affirmation = {
    nature: "affirmation",
    jetons: ligneDAffirmation({
      sujet: texte(payload.subject) || texte(assertion.subject_key),
      valeur,
      zones: Array.isArray(assertion.zones) ? assertion.zones : (payload.zones ?? []),
      deduitDe: payload.deduitDe ?? null,
      source: [texte(payload.source), texte(payload.article)].filter(Boolean).join(", "),
      geste: gesteDeLAssertion(assertion)
    })
  };

  const raisonnement = payload.raisonnement ?? null;
  if (!raisonnement) return [affirmation];

  // `alors` et `retenu` ne sont pas stockés : ils *sont* la valeur, et une
  // valeur écrite à deux endroits finit par diverger. On les reconstruit ici.
  const bloc = blocDeRaisonnement({
    condition: texte(raisonnement.condition),
    alors: texte(raisonnement.condition) ? valeur : "",
    sinon: texte(raisonnement.sinon),
    retenu: texte(raisonnement.condition) ? valeur : "",
    parceQue: texte(raisonnement.parceQue),
    saufSi: raisonnement.saufSi ?? [],
    dependDe: raisonnement.dependDe ?? []
  }).map((jetons) => ({ nature: "raisonnement", jetons }));

  return [...bloc, affirmation];
}

/**
 * Le geste : constaté, retenu, supposé.
 *
 * Il vient de l'utilitaire quand celui-ci le dit. Sinon il se lit sur la
 * nature : une hypothèse **se suppose**, et l'écrire comme un fait est
 * exactement l'erreur que cette mémoire existe pour éviter.
 */
export function gesteDeLAssertion(assertion = {}) {
  const dit = texte(assertion?.payload?.geste);
  if (dit) return dit;
  return texte(assertion?.nature) === "hypothese" ? GESTE.HYPOTHESE : GESTE.FAIT;
}

/** Une affirmation, sur sa seule ligne de valeur — sans son raisonnement. */
export function jetonsDeLAssertion(assertion = {}) {
  const lignes = lignesDeLAssertion(assertion);
  return lignes[lignes.length - 1].jetons;
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
