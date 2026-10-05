/**
 * Le Mdall qu'on s'apprête à écrire, montré avant de signer.
 *
 * ## Quatre écrans, un seul panneau
 *
 * L'onglet Changements d'une proposition, le Copilote, la lecture des comptes
 * rendus, la lecture des mails : tous les quatre posent la même question — **ce
 * que la mémoire écrira, dans la langue du projet** — et l'écrivaient chacun à
 * sa façon. Quatre panneaux qui disent la même chose finissent par la dire de
 * quatre façons, et l'on recalibre tout à chaque écran (règle 10).
 *
 * Ce module n'apporte aucune classe neuve : `mdall-bloc`, `review-block`,
 * `review-panel` existent, et c'est exactement pour cela qu'on les prend.
 *
 * ## Replié, sauf ce qu'on ne voit nulle part ailleurs
 *
 * Quarante blocs dépliés d'office feraient une page qu'on fait défiler sans la
 * lire, c'est-à-dire le défaut qu'on répare. **Les règles s'ouvrent** — une
 * valeur se lit déjà ailleurs, un raisonnement ne se lit nulle part.
 *
 * `<details>` plutôt qu'un pliage à nous : le navigateur le donne, il survit au
 * redessin, et aucun état d'écran n'a besoin d'exister pour lui.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { itemsAPorter } from "../../services/atelier-proposition.js";
import { affirmationsDUneProposition } from "../../services/proposition-avant-apres.js";
import { motDeLaNature } from "../../services/proposition-review.js";
import { renderLignesDeCode } from "./code-mdall.js";
import { PHRASES_SANS_BLOC, blocsAOuvrir } from "./mdall-de-la-proposition.js";
import {
  CRAN, ceQueLaTraductionDit, leCranDit, lesBlocsParCran, lesCheminsEntreBlocs
} from "../../services/les-crans-de-la-traduction.js";
import {
  CE_QUE_LES_PREUVES_NE_DISENT_PAS, PREUVE, ceQueLeDocumentDit, ceQueLesPreuvesDisent,
  lesPreuvesDuBloc
} from "../../services/les-preuves-du-code.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'on dit sous le titre, selon qu'une proposition existe ou non. */
export const SOUS_LE_TITRE = {
  /** Une proposition ouverte : ces lignes attendent une signature. */
  PROPOSEE: "Le raisonnement, dans la langue du projet — rien n'est encore écrit.",
  /** Rien n'est encore proposé : c'est un aperçu de ce qu'on demanderait. */
  A_PROPOSER: "Ce que la proposition écrira, si elle est signée. Rien n'est demandé tant qu'on n'a pas cliqué."
};

/**
 * Les blocs seuls, sans cadre — **rangés par cran de la traduction**.
 *
 * ## Le défaut que cela répare
 *
 * Les blocs arrivaient à la suite, dans l'ordre du tableau. On voyait donc le
 * PDF, puis du Mdall, et les quatre crans entre les deux n'étaient nommés
 * nulle part : la transcription avait l'air d'un tour de magie, et un tour de
 * magie n'est pas rassurant — il est inquiétant
 * (`docs/montrer-le-raisonnement.md`, D2).
 *
 * ## Groupé ici, donc partout d'un coup
 *
 * Ce panneau est **le seul** : l'onglet Changements d'une proposition, le
 * Copilote, la lecture des comptes rendus et celle des fils de mails l'emploient
 * tous les quatre. Les quatre gagnent les crans par ce seul changement, et
 * aucun n'a eu à être retouché (règle 4).
 *
 * ## Un cran vide se nomme
 *
 * C'est la règle qui fait tout l'intérêt du groupement : sans elle, grouper ne
 * déplacerait que des cartes. « Aucune contrainte dans ce document » est une
 * information sur le document ; un groupe absent se lit « cela va de soi »
 * (règle 12).
 */
export function renderBlocsMdall(blocs = []) {
  const tous = Array.isArray(blocs) ? blocs : [];
  if (!tous.length) return "";

  const ouverts = blocsAOuvrir(tous);
  const { groupes, sansCran } = lesBlocsParCran(tous);
  const chemins = lesCheminsEntreBlocs(tous);
  // **Ce que le document dit, calculé une fois pour tous les blocs.** Chaque
  // fonction s'éprouve sur les valeurs des autres lignes du même dépôt, et les
  // recalculer par bloc ferait N fois le même travail.
  const dit = ceQueLeDocumentDit(tous);

  return `
    <p class="synthese__mot">${escapeHtml(ceQueLaTraductionDit(tous))}</p>
    ${groupes.map((cran) => renderUnCran(cran, ouverts, dit)).join("")}
    ${renderLesChemins(chemins)}
    ${sansCran.length ? renderUnCran({
      rang: 0,
      libelle: "Le reste",
      question: "Qu'est-ce que la lecture n'a pas su ranger ?",
      // **Ils sortent à part, et on dit pourquoi.** Les fondre dans un cran les
      // ferait compter dans un groupe qui annonce autre chose qu'eux.
      dou: "Des lignes de suivi — un document qui entre au corpus, un lot — et "
        + "celles dont la nature ne dit pas ce qu'elles sont. Elles n'affirment "
        + "rien sur l'ouvrage.",
      blocs: sansCran,
      estVide: false,
      vide: ""
    }, ouverts, dit) : ""}
    ${renderCeQueLesPreuvesNeDisentPas(tous, dit)}
  `;
}

/**
 * Ce que ces preuves ne prouvent pas — **une fois, et seulement s'il y en a.**
 *
 * En bas du panneau et non sous chaque fonction : répété dix fois, on cesse de
 * le lire, et c'est précisément le paragraphe qu'il faut avoir lu. Absent quand
 * aucune fonction n'a été éprouvée, parce qu'il parlerait alors de rien.
 *
 * Le premier non-dit est le plus désagréable, et il est en premier : une
 * fonction fausse recopiée fidèlement d'un document faux passe tous ces cas.
 */
function renderCeQueLesPreuvesNeDisentPas(blocs, dit) {
  const eprouvee = blocs.some((bloc) =>
    !bloc.sansBloc && lesPreuvesDuBloc(bloc, { dit }).cas.length);
  if (!eprouvee) return "";

  return `
    <section class="conso-usages">
      <h3 class="conso-usages__titre">Ce que ces essais ne prouvent pas</h3>
      ${CE_QUE_LES_PREUVES_NE_DISENT_PAS.map((un) => `
        <div class="forme-suite">
          <h4 class="forme-suite__titre">${escapeHtml(un.quoi)}</h4>
          <p class="conso-usages__mot">${escapeHtml(un.pourquoi)}</p>
        </div>
      `).join("")}
    </section>
  `;
}

/**
 * Un cran : son nom, sa question, ses blocs, et d'où il vient.
 *
 * ## Aucune classe neuve, et ce n'est pas une contrainte subie
 *
 * `forme-suite` donne déjà exactement cette forme — une colonne, un filet en
 * haut, un titre —, et c'est celle des bilans de la console. Un `mdall-cran`
 * à nous aurait été un sixième jeu de marges à recalibrer au premier réglage
 * de l'autre.
 *
 * ## La question est dans le titre, et non en bas
 *
 * En bas, elle se lit après le code — donc trop tard : on a déjà cherché à
 * comprendre sans savoir ce qu'on regardait. Ce qui vient en bas est `dou`, qui
 * explique le cran et n'est pas nécessaire pour lire le code.
 */
function renderUnCran(cran, ouverts, dit) {
  return `
    <section class="forme-suite">
      <h4 class="forme-suite__titre">${cran.rang ? `${cran.rang}. ` : ""}${
        escapeHtml(cran.libelle)}${cran.blocs.length
          ? ` <span class="review-block__count">${cran.blocs.length}</span>`
          : ""}</h4>
      <p class="conso-usages__mot">${escapeHtml(cran.question)}</p>
      ${cran.estVide
        ? `<p class="review-empty-note">${escapeHtml(cran.vide)}</p>`
        : `<div class="mdall-blocs">${cran.blocs.map((bloc) => renderUnBloc(bloc, ouverts, dit))
            .join("")}</div>`}
      <p class="conso-usages__mot">${escapeHtml(cran.dou)}</p>
    </section>
  `;
}

function renderUnBloc(bloc, ouverts, dit) {
  return `
    <details class="mdall-bloc"${ouverts.has(bloc.cle) ? " open" : ""}>
      <summary class="mdall-bloc__tete">
        <span class="mdall-bloc__sujet">${escapeHtml(bloc.sujet)}</span>
        ${bloc.fichier ? `<span class="mdall-bloc__fichier">${escapeHtml(bloc.fichier)}</span>` : ""}
      </summary>
      ${
        bloc.sansBloc
          ? `<p class="review-empty-note">${escapeHtml(PHRASES_SANS_BLOC[bloc.sansBloc] ?? "")}</p>`
          : renderLignesDeCode(bloc.lignes)
      }
      ${bloc.sansBloc ? "" : renderLesPreuves(bloc, dit)}
    </details>
  `;
}

/**
 * Les preuves d'une fonction, **sous son code et dans le même bloc.**
 *
 * > « Voici le code ET voici les tests que nous avons réalisés sur le code…
 * >   vous pouvez signer, tout est bien fait. »
 *
 * Sous le code, parce que c'est l'ordre de la phrase : on lit la fonction, puis
 * ce qu'elle a rendu. Dans le même `<details>`, parce qu'une liste de cas posée
 * ailleurs demanderait de retrouver de quelle fonction elle parle.
 *
 * Elles ne s'affichent que pour une fonction : une valeur n'a rien à rejouer, et
 * une section vide sous chaque valeur ferait chercher ce qui manque (règle 5).
 */
function renderLesPreuves(bloc, dit) {
  const { cas, assiette, pourquoiRien } = lesPreuvesDuBloc(bloc, { dit });

  if (pourquoiRien) {
    return `<p class="review-empty-note">${escapeHtml(pourquoiRien)}</p>`;
  }
  if (!cas.length) return "";

  return `
    <section class="forme-suite">
      <h4 class="forme-suite__titre">Ce que nous avons essayé</h4>
      <p class="conso-usages__mot">${escapeHtml(ceQueLesPreuvesDisent(assiette))}</p>
      <ul class="forme-reference">
        ${cas.map(renderUnCas).join("")}
      </ul>
    </section>
  `;
}

/**
 * Un cas : ce qu'on a donné, ce que la fonction a rendu, et le verdict.
 *
 * **Un seuil se rend autrement**, parce qu'il dit autre chose : deux côtés, ce
 * qui se passe de part et d'autre, et la question posée au lecteur. Le forcer
 * dans la forme d'un cas jugé lui donnerait une marque de réussite qu'il n'a pas.
 */
function renderUnCas(un) {
  if (un.verdict === PREUVE.MONTRE && Array.isArray(un.cotes)) {
    return `
      <li class="forme-reference__ligne">
        <span class="forme-reference__quoi">
          <b>${escapeHtml(un.seuil)}</b>
          <i>${escapeHtml(un.question)}</i>
        </span>
        <span class="forme-reference__chiffres mono-small">${un.cotes.map((cote) => `
          ${escapeHtml(cote.essaye)} → ${escapeHtml(cote.rendu)}
        `).join("<br>")}</span>
        <span class="forme-reference__sur">${escapeHtml(
          un.bascule ? "bascule ici" : "ne décide pas seul")}</span>
      </li>
    `;
  }

  return `
    <li class="forme-reference__ligne">
      <span class="forme-reference__quoi">
        <b>${escapeHtml(un.dit)}</b>
        <i>${escapeHtml(lesEntreesDites(un))}</i>
      </span>
      <span class="forme-reference__chiffres mono-small">${escapeHtml(
        un.rendu || "rien")}</span>
      <span class="forme-reference__sur">${escapeHtml(LA_MARQUE_DU_VERDICT[un.verdict] ?? "")}</span>
    </li>
  `;
}

/**
 * Ce qu'on a donné à la fonction, nommément.
 *
 * **Sans les entrées, un écart ne se diagnostique pas** : « la fonction rend
 * autre chose » envoie chercher, et ce qu'on cherche est ce qu'elle a lu.
 */
function lesEntreesDites(un) {
  if (un.verdict === PREUVE.INDECIDABLE && un.manquants?.length) {
    // Les noms qui manquent, et non « indécidable » tout court.
    return `il manque : ${un.manquants.join(", ")}`;
  }

  const entrees = Array.isArray(un.entrees) ? un.entrees : [];
  if (!entrees.length) return "aucune entrée lue";

  const avec = entrees.map((une) => `${une.sujet} = ${une.valeur}`).join(" · ");
  return un.attendu ? `${avec} — le document conclut « ${un.attendu} »` : avec;
}

/** La marque d'un verdict. Un écart se lit au premier coup d'œil. */
const LA_MARQUE_DU_VERDICT = {
  [PREUVE.CONFORME]: "conforme",
  [PREUVE.ECART]: "écart",
  [PREUVE.INDECIDABLE]: "indécidable",
  [PREUVE.MONTRE]: "montre"
};

/**
 * Le quatrième cran : **les chemins entre fonctions, en liste.**
 *
 * En liste et non en graphe, et c'est un choix : une liste se lit sans avoir
 * appris à lire un graphe, et c'est le lecteur qu'on vise — quelqu'un qui n'a
 * jamais codé et qui n'en a pas envie. Le graphe viendra si la liste ne suffit
 * pas.
 *
 * C'est la seule chose de cet écran qu'**aucun document n'écrit** : elle naît
 * de la rencontre de deux fonctions, et c'est exactement ce que la mémoire
 * existe pour produire.
 */
function renderLesChemins(chemins) {
  const cran = leCranDit(CRAN.CHEMIN);

  return `
    <section class="forme-suite">
      <h4 class="forme-suite__titre">${cran.rang}. ${escapeHtml(cran.libelle)}${
        chemins.length ? ` <span class="review-block__count">${chemins.length}</span>` : ""}</h4>
      <p class="conso-usages__mot">${escapeHtml(cran.question)}</p>
      ${chemins.length
        ? `<ul class="conso-usages__liste">${chemins.map((un) => `
            <li><p class="forme-suite__dit">${escapeHtml(un.dit)}</p></li>
          `).join("")}</ul>`
        : `<p class="review-empty-note">${escapeHtml(cran.vide)}</p>`}
      <p class="conso-usages__mot">${escapeHtml(cran.dou)}</p>
    </section>
  `;
}

/**
 * Le panneau entier : un titre, un compte, et les blocs.
 *
 * `""` quand il n'y a aucun bloc — un cadre vide sous un titre « ce que la
 * mémoire écrira » laisserait croire qu'elle n'écrira rien, alors qu'on n'a
 * simplement rien à montrer.
 */
export function renderMdallAProposer(blocs = [], {
  titre = "Ce que la mémoire écrira",
  quoi = SOUS_LE_TITRE.A_PROPOSER
} = {}) {
  const corps = renderBlocsMdall(blocs);
  if (!corps) return "";

  return `
    <section class="review-block">
      <div class="review-panel">
        <div class="review-block__head review-block__head--plain">
          <div class="review-block__headbody">
            <h3 class="review-block__title">
              ${escapeHtml(titre)}
              <span class="review-block__count">${(Array.isArray(blocs) ? blocs : []).length}</span>
            </h3>
            <span class="review-block__state">${escapeHtml(texte(quoi))}</span>
          </div>
        </div>
        ${corps}
      </div>
    </section>
  `;
}


/* ────────────────────────────────────────────────────────────────────────────
 * Ce qu'une proposition portera : la mémoire d'un côté, le suivi de l'autre
 *
 * **Tout ce qui se propose ne s'écrit pas en Mdall, et c'est une découverte du
 * lot.** Une lecture de compte rendu ne rend que de l'intendance : un document
 * qui entre au corpus, des sujets à ouvrir, des lots, des labels, des jalons.
 * Aucune valeur du projet, donc **aucun bloc Mdall** — jamais, pas seulement
 * quand le compte rendu est pauvre.
 *
 * Laisser l'écran muet là-dessus serait le pire des deux mondes : celui qui
 * vient de voir le Copilote écrire du Mdall croirait que le compte rendu en
 * écrit aussi, et chercherait longtemps où. On le dit donc (règle 5) — et la
 * distinction est vraie et utile : un compte rendu fait du secrétariat, il ne
 * touche pas à la mémoire.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Ce qu'on dit d'un dépôt qui ne touche pas à la mémoire.
 *
 * **Écrit une fois, et lu par tous ceux qui ont à le dire.** La lecture d'un
 * compte rendu et celle d'un fil de mails le disent toutes les deux ; deux
 * formulations pour le même fait finiraient par ne plus dire la même chose, et
 * l'une des deux aurait tort sans qu'on sache laquelle (règle 10).
 */
export const RIEN_DANS_LA_MEMOIRE =
  "Rien n'entre dans la mémoire du projet : ce dépôt ne porte que du suivi.";

/**
 * Ce qu'une proposition portera, partagé en deux.
 *
 * `memoire` : les lignes qui affirment quelque chose sur le projet — celles qui
 * s'écrivent en Mdall. `suivi` : le reste, compté par nature.
 *
 * **Il part de `itemsAPorter`**, l'appel même que le clic fera : compter depuis
 * une autre liste ferait promettre une chose et en proposer une autre (règle 4).
 * C'est le défaut que ce lot répare, et les deux écrans qui proposaient
 * l'annonçaient déjà dans leurs commentaires sans pouvoir l'éviter.
 */
export function partDeLaProposition(recues = []) {
  const items = itemsAPorter(recues);
  const memoire = affirmationsDUneProposition(items);
  const cles = new Set(memoire.map((item) => item));

  const parNature = new Map();
  for (const item of items) {
    if (cles.has(item)) continue;
    const nature = texte(item?.itemType ?? item?.item_type);
    if (!nature) continue;
    parNature.set(nature, (parNature.get(nature) ?? 0) + 1);
  }

  return {
    memoire,
    suivi: [...parNature].map(([nature, combien]) => ({ nature, combien }))
  };
}

/**
 * Ce que la proposition portera, en une phrase.
 *
 * `""` quand elle ne porte rien : une phrase qui compte zéro de tout se lit
 * comme une panne, alors qu'il n'y a simplement rien à proposer.
 */
export function phraseDeLaPart({ memoire = [], suivi = [] } = {}) {
  const valeurs = Array.isArray(memoire) ? memoire.length : 0;
  // Pas de filtre sur le compte : `partDeLaProposition` ne range une nature
  // qu'en la comptant, et une nature à zéro n'existe donc pas. La retirer
  // serait une consigne qu'aucun cas ne peut faire tomber (règle 12).
  const dits = (Array.isArray(suivi) ? suivi : [])
    .map((un) => `${un.combien} ${motDeLaNature(un.nature, un.combien)}`);

  if (!valeurs && !dits.length) return "";

  const suite = dits.length ? `${dits.join(" · ")}. ` : "";

  // **Zéro valeur se dit, et ne se tait pas.** C'est l'information : ce dépôt
  // ne touche pas à la mémoire du projet, et rien d'autre ne le dirait.
  return valeurs
    ? `${suite}${valeurs} ${valeurs > 1 ? "lignes entreront" : "ligne entrera"} dans la mémoire du projet.`
    : `${suite}${RIEN_DANS_LA_MEMOIRE}`;
}
