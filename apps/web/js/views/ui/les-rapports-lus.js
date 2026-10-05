/**
 * Le tableau des rapports de contrôle déjà analysés, et le détail d'une lecture.
 *
 * ## Pourquoi un composant, et non du HTML dans l'écran
 *
 * L'utilitaire du bureau de contrôle est le plus gros de l'Atelier. Y écrire
 * trois cents lignes de rendu de plus en aurait fait un endroit où l'on ne
 * retrouve rien, et surtout : le tableau des rapports lus ne s'y serait éprouvé
 * qu'en ouvrant un navigateur.
 *
 * Ici, il entre des lignes et il sort du HTML. C'est ce qui permet de vérifier
 * qu'une lecture dont la légende est vide le **dit**, au lieu de l'afficher comme
 * une lecture réussie.
 *
 * ## La coquille commune, et non une liste à part
 *
 * Le tableau reprend `renderDataTableShell`, comme les Sujets, les Actions et les
 * comptes rendus lus. Un quatrième dessin de liste de documents aurait fait un
 * quatrième gris, un quatrième survol et un quatrième calibrage — ce qui est
 * précisément ce qu'on a passé des rounds à défaire (règle 4).
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { renderAttenteSpinner } from "./spinner.js";
import { renderMarkdownToHtml } from "../../utils/markdown-renderer.js";
import {
  COLONNE_DU_COMPTE, renderDataTableCount, renderDataTableHead, renderDataTableShell
} from "./data-table-shell.js";
import {
  laLegendeDuRapport, leSensDeLaMarque, lesMesuresDunRapport, lesRapportsLus,
  phraseDesRapportsLus
} from "../../services/la-lecture-dun-rapport.js";
import {
  ceQueFaitLetape, lEtapeQuiReste, phraseDesMarquesSansSens, phraseDuParcours
} from "../../services/le-parcours-dun-rapport.js";
import {
  CE_QUE_LE_RAPPORT_APPORTE, LA_VIE_DUN_AVIS, phraseDeLaSuite
} from "../../services/le-devenir-dun-avis.js";
import { renderLidentiteDunDocument } from "./lidentite-dun-document.js";
import { avisDuRapport } from "../../services/avis-versement.js";
import { blocsAProposer } from "./mdall-de-la-proposition.js";
import { SOUS_LE_TITRE, renderMdallAProposer } from "./mdall-a-proposer.js";
import { renderLesPreuvesDeLaLecture } from "./les-preuves-de-la-lecture.js";

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/** L'attribut par lequel l'écran reconnaît un clic sur une ligne du tableau. */
export const OUVRIR_UN_RAPPORT = "data-rapport-lu";

/**
 * Le tableau des rapports déjà analysés.
 *
 * ## « On n'a pas demandé » ne se dit pas comme « il n'y en a aucun »
 *
 * `lignes === null` veut dire qu'on n'a pas su lire la table. Afficher alors un
 * tableau vide ferait croire qu'aucun rapport n'a jamais été lu sur ce
 * chantier — et l'on recommencerait une lecture déjà faite (règle 5).
 *
 * @param {object} quoi
 * @param {object[]|null} quoi.lignes les lignes de `rapport_lectures`, ou `null`
 * @param {boolean} [quoi.enCours] la demande est partie, la réponse n'est pas là
 * @param {string} [quoi.ouverte] l'identifiant de la lecture ouverte, s'il y en a une
 */
export function renderLesRapportsLus({ lignes = null, enCours = false, ouverte = "" } = {}) {
  if (lignes === null) {
    return enCours
      ? `<p class="rapports-lus__mot mono-small">Lecture des rapports déjà analysés…</p>`
      : `<p class="rapports-lus__mot forme-manques">Les rapports déjà analysés n'ont pas pu
         être lus. Ce n'est pas « aucun rapport n'a été lu » : on ne sait pas lesquels.</p>`;
  }

  const rapports = lesRapportsLus(lignes);

  // **Aucun rapport lu se dit.** Rendre une chaîne vide faisait disparaître la
  // section entière : on ne pouvait pas distinguer « ce chantier n'a encore rien
  // de lu » de « cet écran ne sait pas lire les lectures », et surtout rien
  // n'invitait à en lire un. C'est ce qui a rendu tout un round invisible.
  if (!rapports.length) {
    return `<p class="rapports-lus__mot mono-small">${escapeHtml(
      phraseDesRapportsLus(lignes))}</p>`;
  }

  return `
    <section class="rapports-lus">
      <p class="rapports-lus__aide mono-small">${escapeHtml(phraseDesRapportsLus(lignes))}</p>
      ${renderDataTableShell({
        className: "rapports-lus__table",
        gridTemplate: "minmax(280px,2fr) 240px",
        headHtml: renderDataTableHead({
          columns: [{
            html: renderDataTableCount({
              iconeHtml: svgIcon("history", { className: "octicon" }),
              dit: `${rapports.length} rapport${rapports.length > 1 ? "s" : ""} déjà analysé${
                rapports.length > 1 ? "s" : ""}`,
              titre: "Les rapports de contrôle dont l'analyse est conservée"
            }),
            className: COLONNE_DU_COMPTE
          }]
        }),
        bodyHtml: rapports.map((un) => renderUnRapportLu(un, { ouverte })).join("")
      })}
    </section>
  `;
}

/**
 * Une ligne du tableau.
 *
 * Le gabarit de titre des Sujets : une icône, un titre qui se clique, et ce qu'on
 * en dit dessous. Ce qui est dit dessous est choisi pour une raison : le numéro de
 * rapport et la date disent **lequel**, le nombre de marques dit si la légende a
 * été lue, et le nombre de lectures dit qu'il y a de quoi comparer.
 */
function renderUnRapportLu(rapport, { ouverte = "" } = {}) {
  const ouvert = texte(ouverte) && texte(ouverte) === texte(rapport?.id);
  const avis = rapport?.mesures?.avis;

  return `
    <div class="data-table-shell__row rapports-lus__ligne${ouvert ? " est-ouverte" : ""}">
      <div class="data-table-shell__cell data-table-shell__cell--titre">
        <span class="issue-row-title-grid">
          <span class="issue-row-title-grid__status">${
            svgIcon("file", { className: "octicon" })}</span>
          <span class="issue-row-title-grid__title">
            <button type="button" class="row-title-trigger theme-text theme-text--pb"
              ${OUVRIR_UN_RAPPORT}="${escapeHtml(texte(rapport?.id))}"
            >${escapeHtml(texte(rapport?.document) || "Rapport de contrôle")}</button>
          </span>
          <span class="issue-row-title-grid__meta issue-row-meta-text mono-small">${
            escapeHtml([
              texte(rapport?.numero) ? `n° ${texte(rapport.numero)}` : "",
              texte(rapport?.etabliLe),
              texte(rapport?.nature),
              // **Relu n'est pas « lu deux fois le même jour ».** On relit en
              // ajustant une consigne, et c'est la dernière lecture qu'on ouvre.
              Number(rapport?.combien) > 1 ? `${rapport.combien} lectures` : ""
            ].filter(Boolean).join(" • "))}</span>
        </span>
      </div>
      <div class="data-table-shell__cell mono-small">${escapeHtml([
        // **`null` n'est pas zéro** : « on n'a pas relevé » et « aucun avis »
        // mènent à des gestes opposés, et zéro est fini (règle 5).
        avis === null || avis === undefined
          ? "avis non relevés"
          : `${avis} avis`,
        Number(rapport?.marques) > 0
          ? `${rapport.marques} marque${rapport.marques > 1 ? "s" : ""}`
          : "sans légende"
      ].filter(Boolean).join(" • "))}</div>
    </div>
  `;
}

/** L'attribut par lequel l'écran reconnaît la demande de lire les rapports déposés. */
export const LIRE_LES_RAPPORTS = "data-lire-les-rapports";

/**
 * Le geste qui lance la lecture, et ce qu'il coûte dit avant qu'on clique.
 *
 * ## Pourquoi il est offert, et non lancé d'office
 *
 * Trois appels par rapport, dont une transcription entière. Lancer cela au dépôt
 * ferait payer la lecture d'un lot qu'on a peut-être déposé pour voir.
 *
 * ## Pourquoi il est ici et non dans l'écran
 *
 * L'utilitaire du bureau de contrôle fait cinq mille lignes. Un bouton écrit
 * là-bas ne s'éprouverait qu'en ouvrant un navigateur, et c'est précisément ce
 * bouton qui manquait au round précédent sans que rien ne le dise.
 *
 * @param {object} quoi
 * @param {number} [quoi.deposes] combien de rapports **peuvent être lus**
 * @param {string} [quoi.muets] ce que l'écran dit de ceux qui ne le peuvent pas
 * @param {object|null} [quoi.parcours] l'état de la lecture en cours, s'il y en a une
 */
export function renderLinvitationALire({ deposes = 0, muets = "", parcours = null } = {}) {
  const combien = Math.max(0, Number(deposes) || 0);
  const sansTexte = texte(muets);

  if (parcours?.running) return renderLaLectureEnCours(parcours);

  const refus = liste(parcours?.refus);
  const dit = texte(parcours?.dit);

  /**
   * **Rien à dire, rien à l'écran.**
   *
   * Sans rapport déposé, cette section disait « Déposez un rapport de contrôle
   * pour le lire » — juste sous la zone de dépôt, qui dit déjà exactement cela.
   * Deux fois la même phrase à dix pixels l'une de l'autre fait douter qu'on ait
   * compris, et non le contraire.
   */
  if (!combien && !dit && !sansTexte && !refus.length && !texte(parcours?.error)) return "";

  return `
    <section class="rapports-lire">
      ${dit ? `<p class="rapports-lire__dit mono-small">${escapeHtml(dit)}</p>` : ""}
      ${/*
        **Ce qui ne sera pas lu se dit avant le clic, et non après.**
        Le bouton comptait les rapports déposés, la lecture n'en gardait que ceux
        qui portent du texte : un PDF scanné faisait un bouton « Lire 1 rapport »
        qui ne faisait rien, sans un mot (règle 5).
      */""}
      ${sansTexte ? `<p class="forme-manques">${escapeHtml(sansTexte)}</p>` : ""}
      ${texte(parcours?.error)
        ? `<p class="forme-manques">${escapeHtml(texte(parcours.error))}</p>`
        : ""}
      ${refus.length
        ? `<ul class="rapports-lire__refus">
            ${refus.map((un) => `<li class="forme-manques">${escapeHtml(
              `${texte(un?.nom) || "Un document"} — ${texte(un?.dit) || texte(un?.motif)}`
            )}</li>`).join("")}
          </ul>`
        : ""}
      ${combien
        ? `<p>
            <button type="button" class="gh-btn gh-btn--sm gh-btn--primary" ${LIRE_LES_RAPPORTS}>
              ${escapeHtml(`Lire ${combien} rapport${combien > 1 ? "s" : ""} : structure, Markdown, avis`)}
            </button>
          </p>
          <p class="rapports-lire__cout mono-small">${escapeHtml(
            "Trois appels par rapport, en série. La lecture est conservée : on ne "
            + "la repaye pas pour la revoir.")}</p>`
        : ""}
    </section>
  `;
}

/**
 * La lecture en cours : quel rapport, et à quelle étape.
 *
 * **L'étape est nommée, pas comptée.** « 2/3 » ne dit pas ce qu'on attend, et la
 * transcription peut durer une minute sur un rapport de soixante pages : sans son
 * nom, l'écran a l'air figé.
 */
export function renderLaLectureEnCours(parcours = null) {
  const ce = ceQueFaitLetape(texte(parcours?.quoi));
  const total = Math.max(0, Number(parcours?.total) || 0);
  const faits = Math.max(0, Number(parcours?.faits) || 0);

  return `
    <section class="rapports-lire rapports-lire--en-cours">
      <p class="rapports-lire__dit">
        ${/*
          **Le sablier commun, et non une icône qu'on ferait tourner ici.** Trois
          écrans attendent déjà de la même façon ; une quatrième animation aurait
          fait croire à une quatrième nature d'attente (règle 4).
        */""}
        ${renderAttenteSpinner({ label: "Lecture en cours" })}
        <b>${escapeHtml(texte(parcours?.courant) || "Lecture en cours")}</b>
        ${total > 1 ? escapeHtml(` — ${Math.min(faits + 1, total)} sur ${total}`) : ""}
      </p>
      <p class="rapports-lire__cout mono-small">${escapeHtml(
        ce ? `${ce.titre} — ${ce.cout}.` : "…")}</p>
    </section>
  `;
}

/**
 * Ce qui a coincé pendant la lecture — et **rien quand rien n'a coincé**.
 *
 * ## Ce que cette section était, et pourquoi elle part
 *
 * Elle dressait les trois étapes à chaque ouverture, cochées, avec leur coût et
 * leur raison d'être. L'intention était bonne — c'est le procédé qu'on juge, pas
 * seulement son résultat — mais le prix était un écran : trois paragraphes qu'on
 * relit la première fois et qu'on saute les cent suivantes, en haut de la page,
 * avant ce qu'on vient chercher.
 *
 * **Une lecture qui s'est bien passée n'a rien à raconter.** Ce qui mérite la
 * place est ce qui n'a pas marché : une structure non reconnue change la façon
 * de lire tout ce qui suit, et une étape manquante explique un vide plus bas.
 *
 * Ce que la section disait de juste reste donc, et seulement dans ce cas-là :
 * `phraseDuParcours` nomme exactement ce qui manque, et c'est elle qu'on montre.
 */
export function renderCeQuiACoince(lecture = null) {
  const reste = lEtapeQuiReste(lecture);
  const sansStructure = lecture?.sansStructure === true;

  // **Rien à dire, donc rien à l'écran.** Un encart vert « tout va bien » est la
  // forme la plus chère de silence (règle 12).
  if (!reste && !sansStructure) return "";

  return `
    <section class="rapport-accroc">
      <p class="rapport-accroc__mot">
        ${svgIcon("alert", { className: "octicon" })}
        <span>${escapeHtml(phraseDuParcours(lecture))}</span>
      </p>
    </section>
  `;
}

/**
 * La légende, telle qu'elle a été lue.
 *
 * ## C'est la pièce qui rend les avis lisibles
 *
 * Un rapport écrit « F », « D », « SO » et n'explique qu'une fois. Montrer la
 * table à côté des avis est ce qui permet de voir, d'un coup d'œil, qu'une marque
 * du corps n'y est pas — et donc que la légende a été mal lue.
 *
 * Une légende vide se dit, et ne s'affiche pas comme un tableau à zéro ligne :
 * « ce rapport n'en déclare pas » et « on ne l'a pas trouvée » sont deux choses,
 * et la seconde se corrige.
 */
export function renderLaLegendeLue(lecture = null) {
  const legende = laLegendeDuRapport(lecture?.legende);

  if (!legende.length) {
    return `
      <section class="rapport-legende rapport-cadre">
        <h4 class="rapport-legende__titre">La légende</h4>
        <p class="forme-manques">${escapeHtml(
          lecture?.sansStructure === true
            ? "La structure n'a pas été reconnue : la légende n'a donc pas été "
              + "cherchée. Les marques des avis restent telles quelles."
            : "Ce rapport ne déclare aucune légende. Les avis sont pris tels "
              + "qu'ils sont écrits, sans être résolus.")}</p>
      </section>
    `;
  }

  return `
    <section class="rapport-legende rapport-cadre">
      <h4 class="rapport-legende__titre">La légende</h4>
      <p class="rapport-legende__mot mono-small">${escapeHtml(
        phraseDesMarquesSansSens(lecture))}</p>
      <ul class="forme-reference">
        ${legende.map((une) => `
          <li class="forme-reference__ligne">
            <span class="forme-reference__quoi">
              <b>${escapeHtml(une.marque)}</b>
              <i>${escapeHtml(une.signification)}</i>
            </span>
            <span class="forme-reference__sur mono-small">${escapeHtml(une.ou)}</span>
          </li>
        `).join("")}
      </ul>
    </section>
  `;
}

/**
 * Les avis relevés, avec leur marque **et ce qu'elle veut dire ici**.
 *
 * Une marque que la légende ne déclare pas est dite telle quelle, et signalée :
 * la remplacer par une devinette rendrait un avis faux avec l'aplomb d'un vrai.
 */
export function renderLesAvisReleves(lecture = null, { auPlus = 60 } = {}) {
  const avis = liste(lecture?.avis);

  /**
   * **Ce que la porte a jeté se dit avant tout le reste.**
   *
   * Un rapport dont tous les avis ont été écartés — leur ligne ne se retrouvant
   * pas dans le texte extrait — s'affichait « Aucun avis relevé dans ce
   * rapport ». On prêtait le silence au document, alors que c'est la lecture qui
   * n'a pas su (règle 5). Et la conduite à tenir n'est pas la même : un rapport
   * muet se classe, un rapport mal lu se relit.
   */
  const ecartes = Number(lecture?.avisEcartes) || 0;
  const phraseDesEcartes = ecartes
    ? `${ecartes} avis ${ecartes > 1 ? "ont été relevés mais écartés" : "a été relevé mais écarté"} : `
      + "leur ligne ne s'est pas retrouvée dans le texte extrait du PDF. Ce n'est pas le "
      + "document qui se tait, c'est la lecture qui n'a pas su — relancer la lecture peut suffire."
    : "";

  if (!Array.isArray(lecture?.avis)) {
    return `<p class="forme-manques">Les avis n'ont pas été relevés. Ce n'est pas
      « ce rapport n'en porte aucun » : l'étape n'a pas eu lieu.${
        ecartes ? ` ${escapeHtml(phraseDesEcartes)}` : ""}</p>`;
  }

  if (!avis.length) {
    return `<p class="forme-manques">${escapeHtml(phraseDesEcartes
      || "Aucun avis relevé dans ce rapport.")}</p>`;
  }

  return `
    <section class="rapport-avis">
      <h4 class="rapport-legende__titre">Les avis relevés</h4>
      <ul class="forme-reference">
        ${avis.slice(0, auPlus).map((un) => {
          const marque = texte(un?.marque);
          const sens = leSensDeLaMarque(marque, lecture?.legende);
          return `
            <li class="forme-reference__ligne">
              <span class="forme-reference__quoi">
                <b>${escapeHtml([texte(un?.reference), texte(un?.intitule)]
                  .filter(Boolean).join(" — ") || "Avis sans intitulé")}</b>
                <i>${escapeHtml(texte(un?.ou))}</i>
                ${/*
                  **Le constat, sous l'intitulé.** C'est ce que le bureau a écrit
                  en plus du verdict — « Région A2, altitude 260 m » —, et c'est
                  précisément ce que la lecture par motifs perdait. Un avis sans
                  son constat ne se vérifie pas : on sait que le bureau a dit
                  « favorable », pas sur quoi.
                */""}
                ${texte(un?.constat)
                  ? `<small class="rapport-avis__constat">${escapeHtml(texte(un.constat))}</small>`
                  : ""}
              </span>
              <span class="forme-reference__chiffres mono-small">${
                escapeHtml(marque || "—")}</span>
              <span class="forme-reference__sur mono-small">${escapeHtml(
                marque
                  ? sens ?? "marque non déclarée dans la légende"
                  : "le rapport ne tranche pas")}</span>
            </li>
          `;
        }).join("")}
      </ul>
      ${avis.length > auPlus
        ? `<p class="rapport-avis__reste mono-small">${escapeHtml(
            `Les ${auPlus} premiers, sur ${avis.length}.`)}</p>`
        : ""}
      ${phraseDesEcartes
        ? `<p class="forme-manques">${escapeHtml(phraseDesEcartes)}</p>`
        : ""}
    </section>
  `;
}

/**
 * Le détail d'une lecture conservée : ce que le clic sur une ligne ouvre.
 *
 * L'ordre suit ce qu'on vient y chercher : ce que la lecture a valu, les étapes
 * qui l'ont produite, la légende, les avis, et la transcription en dernier — c'est
 * la plus longue, et celle qu'on déroule quand les quatre premières ne suffisent
 * pas.
 */
/**
 * Les lectures antérieures du même rapport.
 *
 * ## Pourquoi elles sont ici, et nulle part ailleurs
 *
 * Le tableau de l'accueil montre **une ligne par rapport** : montrer huit fois le
 * même rapport ferait perdre de vue combien de rapports du chantier ont été lus.
 * Le round qui a posé cette règle a écrit, en toutes lettres, que « le détail d'un
 * rapport montre ses lectures précédentes » — et ne l'a pas fait. Une déclaration
 * qu'on ne vérifie pas est une intention (règle 12) ; la voici tenue.
 *
 * ## À quoi elles servent
 *
 * À comparer. Relire en ajustant une consigne est le geste le plus fréquent ici, et
 * « 42 avis » ne dit rien tant qu'on ne sait pas que la lecture précédente en
 * donnait 11. Chaque ligne porte donc sa date, son lecteur et ses nombres.
 *
 * @param {object[]|null} lignes les lectures du même document, la courante comprise
 * @param {string} courante l'identifiant de celle qu'on regarde
 */
export function renderLesLecturesAnterieures(lignes = null, { courante = "" } = {}) {
  if (lignes === null) {
    return `<p class="rapport-anterieures forme-manques">Les lectures précédentes de ce
      rapport n'ont pas pu être listées. Ce n'est pas « il n'y en a pas ».</p>`;
  }

  const autres = liste(lignes).filter((une) => texte(une?.id) !== texte(courante));
  if (!autres.length) return "";

  return `
    <section class="rapport-anterieures">
      <h4 class="rapport-legende__titre">${escapeHtml(
        `${autres.length} lecture${autres.length > 1 ? "s" : ""} antérieure${
          autres.length > 1 ? "s" : ""} de ce rapport`)}</h4>
      <p class="rapport-legende__mot mono-small">${escapeHtml(
        "Elles ne sont pas remplacées : une relecture est une seconde lecture, et "
        + "c'est en les comparant qu'on voit si une consigne a fait mieux.")}</p>
      <ul class="forme-reference">
        ${autres.map((une) => {
          const mesures = une?.mesures ?? {};
          return `
            <li class="forme-reference__ligne">
              <span class="forme-reference__quoi">
                <b><button type="button" class="row-title-trigger theme-text theme-text--pb"
                  ${OUVRIR_UN_RAPPORT}="${escapeHtml(texte(une?.id))}"
                >${escapeHtml(texte(une?.created_at).slice(0, 10) || "lecture sans date")}</button></b>
                <i>${escapeHtml(texte(une?.lu_par))}</i>
              </span>
              <span class="forme-reference__chiffres mono-small">${escapeHtml(
                // **`null` n'est pas zéro** : une lecture dont le relevé a échoué
                // n'a pas trouvé « aucun avis » (règle 5).
                mesures.avis === null || mesures.avis === undefined
                  ? "avis non relevés"
                  : `${mesures.avis} avis`)}</span>
              <span class="forme-reference__sur mono-small">${escapeHtml([
                Number(mesures.illisibles) > 0
                  ? `${mesures.illisibles} illisible${mesures.illisibles > 1 ? "s" : ""}`
                  : "",
                laLegendeDuRapport(une?.legende).length
                  ? `${laLegendeDuRapport(une.legende).length} marques`
                  : "sans légende"
              ].filter(Boolean).join(" • "))}</span>
            </li>
          `;
        }).join("")}
      </ul>
    </section>
  `;
}

export function renderLeDetailDunRapport(vue = null, { onglet = "analyse" } = {}) {
  const lecture = vue?.lecture ?? null;
  if (!lecture) {
    return `<p class="forme-manques">Cette lecture ne s'ouvre pas. Soit elle a été
      faite avant que les analyses soient conservées, soit sa ligne n'existe plus —
      et l'on ne sait pas lequel des deux.</p>`;
  }

  // **La restitution d'un côté, ce qu'on en a tiré de l'autre.** Elle vivait
  // repliée tout en bas, sous un `<details>` ; c'est pourtant le document que le
  // modèle a relu pour relever les avis, et c'est à lui qu'on confronte un avis
  // qui surprend. Le compte rendu lui donne un onglet depuis le début.
  if (onglet === "restitution") {
    return `
      <div class="rapport-detail">
        <section class="rapport-detail__markdown">
          <div class="markdown-body">${renderMarkdownToHtml(texte(lecture.markdown))}</div>
        </section>
      </div>
    `;
  }

  /**
   * **Ce qu'un rapport se transcrit, et pourquoi il l'a si longtemps caché.**
   *
   * Le rapport n'avait aucune transcription visible : deux onglets, et le
   * commentaire disait pourquoi — « un rapport de contrôle ne relève pas
   * d'idées ». C'est vrai de ses *idées*, et faux de ses *avis* : un avis est un
   * constat, et un constat s'écrit en Mdall. On lisait donc un tableau d'avis
   * sans jamais voir ce que la mémoire en ferait, dans le seul écran où ça
   * compte — celui d'avant la proposition
   * (`docs/montrer-le-raisonnement.md`, D3).
   *
   * `avisDuRapport` fait déjà la transcription : c'est elle que la proposition
   * emploie, et c'est donc exactement ce qui serait versé — pas une
   * approximation (règle 4).
   *
   * **Sans la mémoire du projet**, et c'est assumé : `assertions` ne sert qu'à
   * proposer la liaison — sur quelles lignes l'avis porte —, et la liaison
   * n'entre pas dans le Mdall d'un constat. L'écran n'a donc pas besoin de la
   * charger pour montrer ce qu'il montre.
   */
  if (onglet === "mdall") {
    const { versables } = avisDuRapport({
      avis: liste(lecture.avis),
      assertions: [],
      emisPar: texte(lecture?.emisPar) || texte(lecture?.emetteur?.nom),
      rapport: texte(lecture?.nom) || texte(lecture?.titre),
      documentId: texte(vue?.conservee?.documentId),
      le: texte(lecture?.le)
    });

    const blocs = blocsAProposer(versables, {});
    if (!blocs.length) {
      return `<p class="review-empty-note">${escapeHtml(
        "Ce rapport n'a produit aucun avis transcriptible : il n'y a rien que la "
        + "mémoire écrirait. Ce n'est pas « le rapport est vide » — l'onglet "
        + "Analyse dit ce qui a été relevé, et ce que la porte a jeté."
      )}</p>`;
    }

    return `<div class="rapport-detail">${renderMdallAProposer(blocs, {
      titre: "Ce que nous avons compris de ce rapport",
      quoi: SOUS_LE_TITRE.A_PROPOSER
    })}</div>`;
  }

  return `
    <div class="rapport-detail">
      ${renderCeQuiACoince(lecture)}
      ${renderLaLegendeLue(lecture)}
      ${renderLesAvisReleves(lecture)}
      ${/*
        **Ce qu'on a vérifié, après ce qu'on a relevé.** Avant, la liste des
        contrôles se lirait sans savoir sur quoi ils portent ; tout en bas, on ne
        l'atteindrait pas. Elle vient donc juste après les avis, qui sont ce
        qu'elle vérifie.
      */""}
      ${renderLesPreuvesDeLaLecture(lecture)}
      ${/*
        **Ce que chaque avis est devenu, après les avis de ce rapport-ci.** On
        vient d'abord voir ce que ce rapport dit ; on regarde ensuite ce qu'il
        devient. L'inverse ferait lire une suite avant de savoir de quoi.
      */""}
      ${vue?.suite === undefined ? "" : renderLaSuiteDesAvis(vue.suite)}
      ${/*
        **Les lectures antérieures en dernier.** Elles ne parlent pas du dossier
        mais de la façon dont on l'a lu : c'est le geste d'ajustement d'une
        consigne, pas celui du suivi de chantier.
      */""}
      ${vue?.anterieures === undefined
        ? ""
        : renderLesLecturesAnterieures(vue.anterieures, {
          courante: texte(vue?.conservee?.id)
        })}
    </div>
  `;
}

/* ── Ce que devient un avis, d'un rapport au suivant ─────────────────────── */

/**
 * L'identité d'un rapport, dans l'encart commun aux familles.
 *
 * Le détail s'ouvrait sur une ligne de mesures en petites capitales — « 2 pages
 * • 2 607 caractères • 0 avis » — sans dire de quel fichier ni de quel jour il
 * parlait. Le compte rendu, lui, avait son encart depuis le début. Même geste,
 * deux présentations : c'est la coquille qui est commune, et les faits qui sont
 * propres à la famille.
 */
export function renderLidentiteDunRapport(vue = null, { analyseLe = "" } = {}) {
  const lecture = vue?.lecture ?? null;
  const conservee = vue?.conservee ?? null;
  const mesures = lesMesuresDunRapport(lecture);

  /**
   * **Le jour de l'analyse est un fait du document.**
   *
   * Il occupait trois lignes en bandeau au-dessus de l'écran — « cette analyse
   * ne se recalcule pas… ». Ce qu'il disait de juste tient dans un champ, à
   * côté du fichier et des pages : c'est là qu'on regarde pour savoir ce qu'on a
   * sous les yeux. Et il ne se confond pas avec « Émis le », qui est la date du
   * rapport et non celle de sa lecture — les deux sont dans l'encart, côte à
   * côte, ce qui est la seule façon de ne plus les mélanger.
   */
  const analysee = texte(analyseLe) || texte(conservee?.created_at);

  return renderLidentiteDunDocument({
    faits: [
      { quoi: "Fichier", valeur: texte(lecture?.nom) || texte(conservee?.document) || "—" },
      { quoi: "Référence", valeur: texte(lecture?.identite?.numero)
        || texte(conservee?.numero_de_rapport) || "non lue" },
      { quoi: "Émis le", valeur: texte(lecture?.identite?.etabliLe)
        || texte(conservee?.etabli_le) || "non lue" },
      { quoi: "Pages", valeur: String(mesures.pages) },
      { quoi: "Transcrit", valeur: `${mesures.caracteres} caractères` },
      {
        quoi: "Avis",
        // **`null` n'est pas zéro.** « 0 avis » dit que le rapport n'en porte
        // aucun ; « non relevés » dit que l'étape n'a pas eu lieu (règle 5).
        valeur: mesures.avis === null ? "non relevés" : String(mesures.avis)
      },
      { quoi: "Analysé le", valeur: analysee.slice(0, 10) }
    ],
    reserve: !texte(lecture?.identite?.etabliLe) && !texte(conservee?.etabli_le)
      ? "La date d'émission n'a pas été lue : sans elle, ce rapport ne se place pas "
        + "dans la suite du dossier, et ses avis ne s'y suivent pas."
      : ""
  });
}

/** Ce qu'un rapport apporte à un avis, dans les mots et la couleur qui vont avec. */
const CE_QUE_DIT_LETAPE = {
  [CE_QUE_LE_RAPPORT_APPORTE.NEUF]: { mot: "Soulevé", ton: "neuf" },
  [CE_QUE_LE_RAPPORT_APPORTE.RAPPEL]: { mot: "Redit", ton: "rappel" },
  [CE_QUE_LE_RAPPORT_APPORTE.LEVE]: { mot: "Levé", ton: "leve" },
  [CE_QUE_LE_RAPPORT_APPORTE.ROUVERT]: { mot: "Rouvert", ton: "rouvert" }
};

/** Le rapport d'une étape, nommé par sa référence quand elle a été lue. */
function leRapportDeLetape(etape) {
  const quand = texte(etape?.etabliLe);
  const numero = texte(etape?.numero);
  return [
    numero ? `Rapport n° ${numero}` : texte(etape?.document) || "Rapport",
    quand ? `du ${quand}` : ""
  ].filter(Boolean).join(" ");
}

/** La pastille de vie d'un avis : les couleurs des sujets, pour la même notion. */
function renderLaVieDunAvis(vie) {
  const ferme = vie?.tone === "closed";
  const icone = svgIcon(
    ferme ? "check-circle" : vie === LA_VIE_DUN_AVIS.ROUVERT ? "issue-reopened" : "issue-opened",
    { style: "color: #fff" }
  );

  return `<span class="gh-state ${ferme ? "gh-state--closed" : "gh-state--open"}">
    <span class="gh-state-dot" aria-hidden="true">${icone}</span>${
      escapeHtml(texte(vie?.label).replace(/^./, (une) => une.toLocaleUpperCase("fr")))}</span>`;
}

/** La frise d'un avis : chaque rapport qui en a parlé, dans l'ordre. */
function renderLaFriseDunAvis(avis) {
  return `
    <li class="suite-avis__un">
      <div class="suite-avis__tete">
        ${renderLaVieDunAvis(avis.vie)}
        <b class="suite-avis__reference">${escapeHtml(avis.reference)}</b>
        <span class="suite-avis__intitule">${escapeHtml(avis.intitule || "sans intitulé")}</span>
      </div>
      ${avis.sansNouvelles ? `
        <p class="suite-avis__perdu">
          ${svgIcon("alert", { className: "octicon" })}
          ${escapeHtml(`Sans nouvelles depuis le rapport du ${avis.depuis}. Aucun rapport
            postérieur ne le reprend — ce n'est pas une levée, personne ne l'a refermé.`
            .replace(/\s+/g, " "))}
        </p>` : ""}
      <ol class="suite-avis__frise">
        ${avis.etapes.map((etape) => {
          const dit = CE_QUE_DIT_LETAPE[etape.apporte] ?? CE_QUE_DIT_LETAPE.rappel;
          return `
            <li class="suite-avis__etape suite-avis__etape--${dit.ton}">
              <span class="suite-avis__quoi">${escapeHtml(dit.mot)}</span>
              <span class="suite-avis__appreciation suite-avis__appreciation--${
                escapeHtml(etape.vaut)}">${escapeHtml(
                  etape.sens || etape.marque || "le rapport ne tranche pas")}</span>
              <span class="suite-avis__ou mono-small">${escapeHtml([
                leRapportDeLetape(etape), texte(etape.ou)
              ].filter(Boolean).join(" · "))}</span>
              ${texte(etape.constat)
                ? `<small class="suite-avis__constat">${escapeHtml(etape.constat)}</small>`
                : ""}
            </li>
          `;
        }).join("")}
      </ol>
    </li>
  `;
}

/**
 * Ce que devient chaque avis du chantier, d'un rapport au suivant.
 *
 * ## Ce que cela rend
 *
 * Le détail d'un rapport montrait les avis **de ce rapport-là**, et s'arrêtait
 * là : « 23 suspendus » sans savoir si c'étaient les mêmes que le mois dernier,
 * ni lesquels avaient été levés depuis. C'est la question qu'on vient poser à un
 * dossier de bureau de contrôle, et elle ne vivait que dans l'utilitaire de
 * suivi, qui relit le corpus entier à chaque ouverture.
 *
 * ## Elle ne conclut pas à la place du dossier
 *
 * Un avis dont plus personne ne parle est **sans nouvelles**, et non levé. Un
 * rapport dont les avis n'ont pas été relevés ne fait taire personne : il n'a pas
 * été interrogé. Les deux se disent (règle 5), parce que les confondre donne un
 * dossier « 0 avis ouvert » obtenu par oubli.
 *
 * @param {object|null} suite ce que `laSuiteDesAvis` a rendu, ou `null`
 * @param {object} options
 * @param {number} [options.auPlus] combien d'avis au plus
 */
export function renderLaSuiteDesAvis(suite = null, { auPlus = 40 } = {}) {
  if (suite === null) {
    return `<p class="forme-manques">La suite des avis n'a pas pu être relue. Ce
      n'est pas « ce chantier n'en a aucun » : la demande n'a pas abouti.</p>`;
  }

  const avis = liste(suite?.avis);
  if (!avis.length) {
    return `<p class="forme-manques">Aucun avis numéroté ne se suit encore : il faut
      au moins un rapport dont les avis ont été relevés.</p>`;
  }

  const reserves = [
    suite.muets?.length
      ? `${suite.muets.length} rapport(s) lu(s) sans que leurs avis soient relevés : ils ne `
        + `disent rien d'aucune référence.`
      : "",
    suite.sansDate?.length
      ? `${suite.sansDate.length} rapport(s) sans date d'émission : ils ne se placent pas `
        + `dans la suite.`
      : "",
    suite.sansReference
      ? `${suite.sansReference} avis sans numéro : ils ne se suivent pas d'un rapport à `
        + `l'autre, et restent dans la liste de leur rapport.`
      : ""
  ].filter(Boolean);

  return `
    <section class="suite-avis">
      <div class="suite-avis__entete">
        <h4 class="rapport-legende__titre">Ce que chaque avis est devenu</h4>
        ${/*
          **Les deux écrans se renvoient l'un à l'autre.** Celui-ci suit les avis
          d'un rapport au suivant sur les lectures déjà conservées ; l'autre relit
          les PDF avec le moteur de continuité et rend la chronologie du dossier,
          le retour arrière à une date, les jalons, la complétude et les
          indicateurs. On passait de l'un à l'autre en se souvenant qu'il existe.
        */""}
        <button type="button" class="gh-btn gh-btn--sm" data-side-nav-target="dev-ct-continuity-lab">
          ${svgIcon("history", { className: "octicon" })} Le suivi complet du dossier
        </button>
      </div>
      <p class="suite-avis__compte mono-small">${escapeHtml(phraseDeLaSuite(suite))}</p>
      ${reserves.length
        ? `<ul class="suite-avis__reserves">${reserves
            .map((une) => `<li>${escapeHtml(une)}</li>`).join("")}</ul>`
        : ""}
      <ul class="suite-avis__liste">
        ${avis.slice(0, auPlus).map(renderLaFriseDunAvis).join("")}
      </ul>
      ${avis.length > auPlus
        ? `<p class="suite-avis__reste mono-small">${escapeHtml(
            `Les ${auPlus} premiers, sur ${avis.length}.`)}</p>`
        : ""}
    </section>
  `;
}
