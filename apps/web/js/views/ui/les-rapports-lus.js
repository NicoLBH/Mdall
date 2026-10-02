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
  ceQueFaitLetape, lEtatDuParcours, phraseDesMarquesSansSens, phraseDuParcours
} from "../../services/le-parcours-dun-rapport.js";

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
 * @param {number} [quoi.deposes] combien de rapports sont dans l'Atelier
 * @param {object|null} [quoi.parcours] l'état de la lecture en cours, s'il y en a une
 */
export function renderLinvitationALire({ deposes = 0, parcours = null } = {}) {
  const combien = Math.max(0, Number(deposes) || 0);

  if (parcours?.running) return renderLaLectureEnCours(parcours);

  const refus = liste(parcours?.refus);
  const dit = texte(parcours?.dit);

  return `
    <section class="rapports-lire">
      ${dit ? `<p class="rapports-lire__dit mono-small">${escapeHtml(dit)}</p>` : ""}
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
        : `<p class="rapports-lire__cout mono-small">${escapeHtml(
            "Déposez un rapport de contrôle pour le lire.")}</p>`}
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
 * Les trois étapes, et où l'on en est.
 *
 * ## Pourquoi elles s'affichent même quand tout est fait
 *
 * C'est le procédé qu'on vient juger ici, pas seulement son résultat. Une lecture
 * dont la structure n'a pas été reconnue rend quand même du Markdown : sans cette
 * ligne, on relirait une transcription faite sans squelette en croyant lire une
 * transcription faite avec (règle 5).
 */
export function renderLesEtapesDuRapport(lecture = null, { enCours = "" } = {}) {
  const etapes = lEtatDuParcours(lecture, { enCours });

  return `
    <section class="rapport-etapes">
      <p class="rapport-etapes__mot"><b>${escapeHtml(phraseDuParcours(lecture))}</b></p>
      <ol class="rapport-etapes__liste">
        ${etapes.map((une, rang) => `
          <li class="rapport-etapes__pas${une.faite ? " est-faite" : ""}${
            une.enCours ? " est-en-cours" : ""}${une.sautee ? " est-sautee" : ""}">
            <span class="rapport-etapes__rang mono-small">${rang + 1}</span>
            <span class="rapport-etapes__quoi">
              <b>${escapeHtml(texte(une.titre))}</b>
              <i>${escapeHtml(texte(une.ceQuelleFait))}</i>
              <i class="rapport-etapes__pourquoi">${escapeHtml(texte(une.pourquoi))}</i>
            </span>
            <span class="rapport-etapes__etat mono-small">${escapeHtml(
              une.sautee ? "non reconnue — la suite s'est faite sans elle"
                : une.enCours ? "en cours…"
                : une.faite ? "faite"
                : texte(une.cout))}</span>
          </li>
        `).join("")}
      </ol>
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
      <section class="rapport-legende">
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
    <section class="rapport-legende">
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

  if (!Array.isArray(lecture?.avis)) {
    return `<p class="forme-manques">Les avis n'ont pas été relevés. Ce n'est pas
      « ce rapport n'en porte aucun » : l'étape n'a pas eu lieu.</p>`;
  }

  if (!avis.length) {
    return `<p class="forme-manques">Aucun avis relevé dans ce rapport.</p>`;
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

export function renderLeDetailDunRapport(vue = null) {
  const lecture = vue?.lecture ?? null;
  if (!lecture) {
    return `<p class="forme-manques">Cette lecture ne s'ouvre pas. Soit elle a été
      faite avant que les analyses soient conservées, soit sa ligne n'existe plus —
      et l'on ne sait pas lequel des deux.</p>`;
  }

  const mesures = lesMesuresDunRapport(lecture);

  return `
    <div class="rapport-detail">
      <p class="rapport-detail__mesures mono-small">${escapeHtml([
        `${mesures.pages} page${mesures.pages > 1 ? "s" : ""}`,
        `${mesures.caracteres} caractères transcrits`,
        mesures.avis === null ? "avis non relevés" : `${mesures.avis} avis`,
        mesures.illisibles ? `${mesures.illisibles} marque(s) illisible(s)` : "",
        mesures.sansMarque ? `${mesures.sansMarque} sans marque` : ""
      ].filter(Boolean).join(" • "))}</p>

      ${renderLesEtapesDuRapport(lecture)}
      ${renderLaLegendeLue(lecture)}
      ${renderLesAvisReleves(lecture)}
      ${/*
        **Les lectures antérieures, après les avis.** On vient d'abord voir ce que
        cette lecture-ci a trouvé ; on compare ensuite. L'inverse ferait lire un
        historique avant de savoir de quoi.
      */""}
      ${vue?.anterieures === undefined
        ? ""
        : renderLesLecturesAnterieures(vue.anterieures, {
          courante: texte(vue?.conservee?.id)
        })}

      <details class="rapport-detail__markdown">
        <summary class="rapport-detail__markdown-titre">La transcription en Markdown</summary>
        ${/*
          **Rendu en Markdown, et non en texte brut.** C'est ce que la deuxième
          étape a produit, et c'est sous cette forme qu'on juge si la structure
          reconnue tenait : un tableau mal fermé se voit rendu, pas en source.
        */""}
        <div class="markdown-body">${renderMarkdownToHtml(texte(lecture.markdown))}</div>
      </details>
    </div>
  `;
}
