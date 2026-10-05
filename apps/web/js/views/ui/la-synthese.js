/**
 * La synthèse d'un document : ce qu'il **lie**, et ce qui s'en compose.
 *
 * ## Pourquoi un composant, et non un bout d'écran
 *
 * Un compte rendu de chantier, un fil de mails, un rapport de bureau de
 * contrôle : trois documents, trois façons de les lire, et **une seule façon
 * de dire ce qu'ils enchaînent**. En dessiner un par écran donnerait trois
 * listes d'idées qui divergeraient de forme, puis de contenu — et c'est
 * toujours celle qu'on regarde le moins qui finirait fausse (règle 4).
 *
 * ## Les quatre choses qu'elle montre, dans cet ordre
 *
 * 1. **Les liaisons employées.** C'est la première explication d'un relevé
 *    maigre, et la seule qui dise où regarder : un mot porté dix fois et
 *    jamais coupé ne se corrige pas comme un document qui n'en emploie aucun.
 * 2. **Les idées**, chacune avec la phrase dont elle sort. Sans la phrase, une
 *    idée fausse ne se conteste pas.
 * 3. **Ce que la mémoire en écrirait**, en mdall — les blocs exacts qu'une
 *    proposition porterait, pas une approximation.
 * 4. **Ce qui s'enchaîne.** Une conséquence obtenue, écrite dans aucun
 *    document, et qui porte toujours les idées dont elle sort.
 *
 * ## Rien n'entre dans la mémoire ici
 *
 * C'est une lecture, pas une vérité. Les blocs mdall montrent ce qui serait
 * écrit **si** on signait ; ils n'écrivent rien (règle 1).
 *
 * ## Elle ne décide de rien
 *
 * Le regroupement, le compte et la composition vivent dans
 * `services/la-synthese-dun-document.js`, qui est pur. Ici, du HTML.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import {
  POURQUOI_PAS_DE_FONCTION, laSyntheseDunDocument, phraseDeLaSynthese
} from "../../services/la-synthese-dun-document.js";
import {
  laProvenanceDuneIdee, lesAffirmationsDesIdees, phraseDuneIdeeRelevee
} from "../../services/une-idee-relevee.js";
import { phraseDunRaisonnement } from "../../services/un-raisonnement.js";
import { itemsDeProposition } from "../../services/atelier-proposition.js";
import { blocsAProposer } from "./mdall-de-la-proposition.js";
import { SOUS_LE_TITRE, renderMdallAProposer } from "./mdall-a-proposer.js";

/**
 * La synthèse entière.
 *
 * @param {object[]} brutes les idées relevées, telles que la lecture les garde
 * @param {object} [options]
 * @param {string} [options.quoi] ce qu'on a lu, nommé dans le titre
 * @param {string} [options.sur] ce que l'écran appelant sait du relevé et que
 *   la synthèse ignore — sur combien de points, sur combien de prises. Elle ne
 *   l'invente pas : un compte rendu compte des points, un fil de mails des
 *   prises, et la synthèse ne connaît ni l'un ni l'autre.
 */
export function renderLaSyntheseDunDocument(brutes = [], { quoi = "Ce document", sur = "" } = {}) {
  const synthese = laSyntheseDunDocument(brutes);

  return `
    <section class="synthese">
      ${sur ? `<p class="synthese__mot">${escapeHtml(sur)}</p>` : ""}
      <p class="synthese__mot">${escapeHtml(phraseDeLaSynthese(synthese))}</p>
      ${/*
        **La transcription passe en tête**, et c'est le même ordre que celui de
        l'onglet Changements.

        Elle était l'item 3 de 4 : on lisait les liaisons employées, puis les
        idées, puis — plus bas — le Mdall qui est *la* réponse à « qu'avez-vous
        compris de mon document ». L'ordre dit ce qui compte, et il mettait en
        premier le diagnostic du relevé (`docs/montrer-le-raisonnement.md`, D3).

        Les liaisons et les idées restent, en dessous : elles expliquent
        **pourquoi** le relevé est ce qu'il est, et c'est ce qu'on lit quand il
        déçoit.
      */""}
      ${renderLeMdall(synthese.idees)}
      ${renderLesLiaisons(synthese.liaisons)}
      ${renderLesIdees(synthese.idees, quoi)}
      ${renderLesRaisonnements(synthese.raisonnements)}
    </section>
  `;
}

/**
 * Les mots de liaison employés, du plus fréquent au plus rare.
 *
 * **Le mot, et le verbe qu'il porte.** « donc » et « car » disent tous deux une
 * cause et ne vont pas dans le même sens ; ne montrer que la sorte ferait
 * croire que le document emploie deux fois le même tour.
 */
function renderLesLiaisons(liaisons = []) {
  if (!liaisons.length) {
    return `<p class="synthese__manque">Aucun mot de liaison n'a servi à couper une phrase
      de ce document. Ce n'est pas « il n'enchaîne rien » : c'est « le découpage n'a rien
      trouvé à couper ».</p>`;
  }

  return `
    <div class="synthese__bloc">
      <h4 class="synthese__titre">Les liaisons employées</h4>
      <ul class="synthese__liaisons">
        ${liaisons.map((une) => `
          <li class="synthese__liaison">
            <b>${escapeHtml(`« ${une.mot} »`)}</b>
            <i>${escapeHtml(une.libelle)}</i>
            <span class="mono-small">${une.combien} idée${une.combien > 1 ? "s" : ""}</span>
          </li>
        `).join("")}
      </ul>
    </div>
  `;
}

/** Les idées, chacune avec la phrase dont elle sort. */
function renderLesIdees(idees = [], quoi = "Ce document") {
  if (!idees.length) return "";

  return `
    <div class="synthese__bloc">
      <h4 class="synthese__titre">${escapeHtml(`${quoi} lie`)}</h4>
      <ul class="synthese__idees">
        ${idees.map((une) => `
          <li class="synthese__idee">
            <span class="synthese__idee-fonction">${escapeHtml(phraseDuneIdeeRelevee(une))}</span>
            <span class="synthese__idee-ou mono-small">${
              escapeHtml(laProvenanceDuneIdee(une))}</span>
            <q class="synthese__idee-phrase">${escapeHtml(une.phrase)}</q>
          </li>
        `).join("")}
      </ul>
    </div>
  `;
}

/**
 * Ce que la mémoire écrirait, en mdall.
 *
 * **Les blocs exacts qu'une proposition porterait**, composés par l'écrivain
 * commun : une seconde écriture, approchante, ferait lire ici autre chose que
 * ce qu'on signerait là (règle 4).
 *
 * ## Le cadre et sa phrase, et non des blocs nus
 *
 * Les blocs étaient posés sous un titre de section — « Ce que la mémoire en
 * écrirait » — et rien ne disait que **rien n'est encore écrit**. C'est la
 * contrepartie de tout montrer : plus on montre, plus on risque de laisser
 * croire que c'est déjà fait.
 *
 * `renderMdallAProposer` porte ce cadre, son compte et cette phrase — les mêmes
 * que partout ailleurs. Un titre à nous aurait dit la même chose d'une autre
 * façon, et c'est celle qu'on ne relit jamais qui aurait fini par ne plus la
 * dire (règle 10).
 */
function renderLeMdall(idees = []) {
  if (!idees.length) return "";

  const blocs = blocsAProposer(itemsDeProposition(lesAffirmationsDesIdees(idees)));
  if (!blocs.length) return "";

  return `
    ${renderMdallAProposer(blocs, {
      titre: "Ce que nous avons compris de ce document",
      quoi: SOUS_LE_TITRE.A_PROPOSER
    })}
    <p class="synthese__aide">${escapeHtml(POURQUOI_PAS_DE_FONCTION)}</p>
  `;
}

/**
 * Ce qui s'enchaîne.
 *
 * **Chaque raisonnement porte les idées dont il sort.** Ce qu'il conclut n'est
 * écrit dans aucun document : c'est une conséquence obtenue, pas relevée, et
 * l'afficher sans ses maillons en ferait une affirmation qu'on ne peut pas
 * contester.
 */
function renderLesRaisonnements(chaines = []) {
  if (!chaines.length) return "";

  return `
    <div class="synthese__bloc">
      <h4 class="synthese__titre">Ce qui s'enchaîne</h4>
      <p class="synthese__aide">Ce qui sort d'une composition n'est écrit dans aucun
        document : c'est une conséquence obtenue, pas relevée.</p>
      <ul class="synthese__chaines">
        ${chaines.map((chaine) => `
          <li class="synthese__chaine">
            <span class="synthese__chaine-dit">${escapeHtml(phraseDunRaisonnement(chaine))}</span>
            <span class="synthese__chaine-pas mono-small">${
              escapeHtml(`${chaine.pas} idées`)}${
              chaine.boucle ? " · revient sur elle-même" : ""}${
              chaine.tronquee ? " · coupée" : ""}</span>
            <ol class="synthese__maillons">
              ${chaine.idees.map((une) => `
                <li>${svgIcon("arrow-right", { className: "octicon" })}
                  ${escapeHtml(phraseDuneIdeeRelevee(une))}</li>
              `).join("")}
            </ol>
          </li>
        `).join("")}
      </ul>
    </div>
  `;
}
