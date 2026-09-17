/**
 * Les deux arêtes d'un point, **dessinées** : rien que du balisage.
 *
 * Le branchement d'écran des étapes 2 à 5 de `docs/lobjet-de-la-connaissance.md`.
 *
 * ## Pourquoi c'est un fichier à part
 *
 * Les écrans qui montrent ces arêtes parlent à la base, et un module qui parle
 * à la base **ne s'importe pas dans un test** : l'authentification tire son
 * client d'un CDN et l'import lève avant la première ligne. Le dessin, lui, n'a
 * besoin de rien dès lors qu'on lui **donne** les portages plutôt qu'il n'aille
 * les chercher. Séparé, il s'exécute, et l'on regarde ce qui sort.
 *
 * ## La phrase est dans un élément à elle
 *
 * Une mention est une boîte flexible, et du texte posé nu à l'intérieur devient
 * un élément flexible **anonyme** : rien ne peut lui dire quelle place prendre,
 * et un parent étroit le réduit jusqu'à la largeur d'un mot. La phrase vit donc
 * dans son propre élément, à qui l'on dit de prendre la place qui reste — les
 * deux mentions d'à côté portent deux boutons et des intitulés longs, et
 * dépendre de la largeur du parent pour ne pas se casser serait tenir par
 * chance.
 *
 * ## Une mention, jamais une pastille
 *
 * C'est la règle de la ligne de mémoire, et elle vaut ici : une valeur sur
 * laquelle un débat porte **ne change pas d'état**. Une pastille se lirait comme
 * un statut, et un statut appelle un circuit — ce que Mdall ne sera jamais. La
 * valeur reste, et à côté d'elle ce qui la conteste.
 *
 * ## Le mot de l'écran
 *
 * « Sujet », toujours, et il n'est écrit nulle part ici : il vient de
 * `MOT_A_LECRAN`, où l'étape 0 l'a posé une fois pour toutes.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { MOT_A_LECRAN, intituleDuPoint, phraseDesPointsOuverts } from "../../services/point-porte-sur.js";
import { phraseDuDebat } from "../../services/point-a-tranche.js";
import { etapesDuRaisonnement, lacunesDuRaisonnement, phraseDesLacunesDuRaisonnement }
  from "../../services/raisonnement-du-point.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Les intitulés d'une liste de portages, un par ligne — c'est l'info-bulle. */
function intitules(portages) {
  return portages.map(({ point }) => intituleDuPoint(point) || texte(point?.id)).join("\n");
}

/**
 * Ce qui porte sur une valeur, sur sa ligne de mémoire.
 *
 * Deux mentions et pas une : **ce qui est confirmé** et **ce qui est proposé**
 * ne se lisent pas pareil. Les mêler ferait dire « un sujet porte sur cette
 * valeur » d'une reconnaissance que personne n'a encore relue, et une valeur
 * serait contestée sans que quiconque l'ait demandé.
 *
 * Le conditionnel n'est pas une coquetterie : « porterait » dit exactement ce
 * qu'on sait — un rapprochement de mots, pas un jugement.
 *
 * Rien du tout quand rien ne porte. L'absence de mention **est** l'absence de
 * débat, et la répéter sur chaque ligne donnerait à l'écran l'air de réclamer
 * quelque chose.
 *
 * @param {object} options
 * @param {{point: object, lien: object, confirme: boolean}[]} options.portages
 * @param {boolean} [options.occupe] vrai pendant qu'une écriture est en vol
 */
export function renderCeQuiPorteSurLaValeur({ portages = [], occupe = false } = {}) {
  const lus = Array.isArray(portages) ? portages : [];
  const confirmes = lus.filter((portage) => portage.confirme);
  const proposes = lus.filter((portage) => !portage.confirme);

  return [
    confirmes.length
      ? `<span class="memory-mention memory-portage" title="${escapeHtml(intitules(confirmes))}">
          ${svgIcon("comment-discussion", { className: "octicon" })}
          <span class="memory-mention__dit">${
            escapeHtml(phraseDesPointsOuverts(confirmes.map((portage) => portage.point)))
          }</span>
        </span>`
      : "",
    ...proposes.map((portage) => renderPortagePropose(portage, occupe))
  ].filter(Boolean).join("");
}

/**
 * Une arête reconnue, et les deux réponses qu'on peut lui faire.
 *
 * **Deux, et il faut les deux.** N'offrir que « confirmer » ferait de la seule
 * réponse possible un acquiescement : une reconnaissance qui s'est trompée
 * resterait affichée pour toujours, et l'on apprendrait à ne plus la lire.
 */
function renderPortagePropose(portage, occupe) {
  const nom = intituleDuPoint(portage?.point);
  const lien = escapeHtml(texte(portage?.lien?.id));

  return `
    <span class="memory-mention memory-portage memory-portage--propose"
      title="${escapeHtml(nom)}">
      ${svgIcon("question", { className: "octicon" })}
      <span class="memory-mention__dit">${
        escapeHtml(`le ${MOT_A_LECRAN.un} « ${nom} » porterait sur cette valeur`)
      }</span>
      <span class="memory-portage__gestes">
        <button type="button" class="gh-btn gh-btn--sm" data-portage-confirme="${lien}" ${occupe ? "disabled" : ""}>Confirmer</button>
        <button type="button" class="gh-btn gh-btn--sm" data-portage-retire="${lien}" ${occupe ? "disabled" : ""}>Écarter</button>
      </span>
    </span>
  `;
}

/**
 * Où la chaîne du raisonnement continue, sur la ligne d'une valeur.
 *
 * C'est la réponse complète à « pourquoi les fondations sont-elles à cette
 * profondeur ? » : la chaîne ne s'arrête plus à une règle, elle va jusqu'au
 * débat qui a tranché, avec sa date et ses noms.
 *
 * Rien quand aucun point ne l'a tranchée — la plupart des valeurs sortent d'un
 * calcul, et leur accrocher une mention vide n'apprendrait rien.
 */
export function renderLeDebatQuiATranche({ debat = null } = {}) {
  if (!debat) return "";

  return `
    <span class="memory-mention memory-portage memory-portage--tranche">
      ${svgIcon("git-compare", { className: "octicon" })}
      <span class="memory-mention__dit">${escapeHtml(phraseDuDebat(debat))}</span>
    </span>
  `;
}

/**
 * Le petit graphe du raisonnement humain, dans le détail d'un sujet.
 *
 * Les cinq étapes, **toujours les cinq**. Une étape que personne n'a remplie
 * porte son manque en toutes lettres : un graphe qui perd ses lignes creuses se
 * lit comme un raisonnement complet, et c'est ce qu'il n'est pas (règle 5).
 *
 * Rien quand il n'y a pas même une question — il n'y a alors aucun chemin, et
 * dessiner cinq lignes vides ferait croire à un travail qui n'a pas eu lieu.
 */
export function renderLeChemin({ raisonnement = null } = {}) {
  const etapes = etapesDuRaisonnement(raisonnement);
  if (!etapes.length) return "";

  const lignes = etapes.map((etape) => `
    <div class="chemin__etape${etape.manque ? " chemin__etape--manque" : ""}">
      <span class="chemin__quoi">${escapeHtml(etape.dit)}</span>
      <span class="chemin__quoi-dit">${
        etape.manque
          ? escapeHtml(etape.parceQue)
          : etape.entrees.map((entree) => `<span class="chemin__entree">${escapeHtml(entree)}</span>`).join("")
      }</span>
    </div>
  `).join("");

  const manques = phraseDesLacunesDuRaisonnement(lacunesDuRaisonnement(raisonnement));

  return `
    <section class="details-bloc chemin" aria-label="Par où l'on est passé">
      <div class="details-bloc__label">Par où l'on est passé</div>
      <div class="chemin__corps">${lignes}</div>
      ${manques ? `<div class="chemin__manques">${escapeHtml(manques)}</div>` : ""}
    </section>
  `;
}

/**
 * Ce sur quoi un sujet porte, dans son détail.
 *
 * L'autre bout de l'arête amont. On y confirme et on y écarte comme sur la
 * ligne de mémoire — les mêmes marques de données, donc **le même geste** : en
 * inventer un second pour le même acte ferait deux choses à apprendre là où il
 * n'y en a qu'une (règle 10).
 *
 * Rien quand rien n'est accroché. Ce n'est pas « ce sujet ne porte sur rien » :
 * c'est que personne ne l'a dit, et l'écran ne l'affirme pas.
 */
export function renderCeQuePorteLeSujet({ portages = [], occupe = false } = {}) {
  const lus = Array.isArray(portages) ? portages : [];
  if (!lus.length) return "";

  const lignes = lus.map(({ assertion, lien, confirme }) => `
    <li class="portage-liste__ligne${confirme ? "" : " portage-liste__ligne--propose"}">
      <span class="portage-liste__valeur">${escapeHtml(nomEtValeur(assertion))}</span>
      ${confirme
        ? `<button type="button" class="gh-btn gh-btn--sm" data-portage-retire="${escapeHtml(texte(lien?.id))}" ${occupe ? "disabled" : ""}>Retirer</button>`
        : `<button type="button" class="gh-btn gh-btn--sm" data-portage-confirme="${escapeHtml(texte(lien?.id))}" ${occupe ? "disabled" : ""}>Confirmer</button>
           <button type="button" class="gh-btn gh-btn--sm" data-portage-retire="${escapeHtml(texte(lien?.id))}" ${occupe ? "disabled" : ""}>Écarter</button>`}
    </li>
  `).join("");

  const titre = `Sur quoi ce ${MOT_A_LECRAN.un} porte`;

  return `
    <section class="details-bloc portage-liste" aria-label="${escapeHtml(titre)}">
      <div class="details-bloc__label">${escapeHtml(titre)}</div>
      <ul class="portage-liste__corps">${lignes}</ul>
    </section>
  `;
}

/** « Altitude = 742,30 », ou le seul nom quand la valeur manque. */
function nomEtValeur(assertion) {
  const nom = texte(assertion?.payload?.subject) || texte(assertion?.subject_key);
  const dite = texte(assertion?.payload?.value) || texte(assertion?.statement);
  return dite ? `${nom} = ${dite}` : nom;
}
