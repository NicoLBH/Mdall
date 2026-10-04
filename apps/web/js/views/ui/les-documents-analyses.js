/**
 * Le rail des familles, et le tableau des documents déjà analysés.
 *
 * ## Pourquoi un composant, et non du HTML dans l'écran
 *
 * Trois écrans dressaient la même liste, chacun à sa façon : les fils de mails,
 * les comptes rendus, les rapports de contrôle. Ils n'ont jamais tout à fait
 * convergé — un gris ici, un survol là —, et surtout aucun ne pouvait répondre à
 * la question qu'on se pose en arrivant : **qu'est-ce qui a déjà été analysé sur
 * ce chantier ?**
 *
 * Ici, il entre des lignes normalisées et il sort du HTML. C'est ce qui permet de
 * vérifier qu'une famille vide dit **laquelle** et **quoi faire**, au lieu de
 * disparaître.
 *
 * ## Les coques communes, et rien d'inventé
 *
 * Le rail est `renderProjectRail` + `nav-list`, ceux des Actions, de la Mémoire,
 * des Sujets et de l'Accueil. Le tableau est `renderDataTableShell`, celui de
 * partout. Un quatrième dessin de liste de documents aurait fait un quatrième gris
 * et un quatrième calibrage — ce qu'on a passé des rounds à défaire (règle 4).
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { renderNavList, renderNavListGroup, renderNavListItem } from "./nav-list.js";
import { renderProjectRail } from "./project-rail.js";
import {
  COLONNE_DU_COMPTE, renderDataTableCount, renderDataTableEmptyState,
  renderDataTableHead, renderDataTableShell
} from "./data-table-shell.js";
import {
  CE_QUE_DIT_LETAT, LES_FAMILLES, OU_EN_EST, TOUTES, ceQueDitLaFamille,
  lesComptesParEtat, lesComptesParFamille, parEtat, parFamille
} from "../../services/les-documents-analyses.js";
import { leCompteDit } from "../../services/les-familles-de-document.js";

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/** L'attribut par lequel l'écran reconnaît un clic sur une entrée du rail. */
export const CHOISIR_UNE_FAMILLE = "data-famille-analysee";

/** L'attribut par lequel il reconnaît un clic sur une ligne du tableau. */
export const OUVRIR_UN_DOCUMENT = "data-document-analyse";

/** Celui par lequel il reconnaît un clic sur une pastille du filtre. */
export const FILTRER_PAR_ETAT = "data-etat-analyse";

/**
 * Le rail des familles.
 *
 * ## Pourquoi « Tous les documents » est en tête, et séparé
 *
 * C'est la vue d'ensemble, et c'est celle sur laquelle on atterrit : elle répond
 * seule à « qu'est-ce qui a été analysé ici ? ». Les trois familles viennent en
 * dessous, dans l'ordre par lequel les documents arrivent sur un chantier — les
 * mails d'abord.
 *
 * Le compte va avec le nom : « Mails 0 » dit, **avant** le clic, qu'il n'y a rien
 * à y voir. C'est la règle du rail des Actions, et elle vaut ici pour la même
 * raison.
 *
 * @param {object} quoi
 * @param {string} [quoi.actif] la famille ouverte
 * @param {object[]} [quoi.documents] les lignes normalisées, pour les comptes
 * @param {boolean} [quoi.replie] le rail est-il replié
 */
export function renderLeRailDesFamilles({
  actif = TOUTES, documents = [], replie = false
} = {}) {
  const comptes = lesComptesParFamille(documents);

  const uneEntree = (famille) => {
    const ce = ceQueDitLaFamille(famille);
    return renderNavListItem({
      label: ce.nom,
      iconHtml: svgIcon(ce.icone, { className: "octicon" }),
      isActive: texte(actif) === famille,
      trailing: String(comptes[famille] ?? 0),
      // Le libellé est tronqué dans un rail étroit : l'infobulle le rend.
      title: ce.nom,
      dataAttributes: { [CHOISIR_UNE_FAMILLE]: famille }
    });
  };

  return renderProjectRail({
    id: "documentsAnalysesRail",
    label: "Les familles de documents",
    collapsed: replie === true,
    navHtml: renderNavList({
      label: "Les familles de documents",
      html: [
        renderNavListGroup({ items: [uneEntree(TOUTES)] }),
        renderNavListGroup({ items: LES_FAMILLES.map(uneEntree) })
      ].join("")
    })
  });
}

/**
 * Le tableau des documents analysés de la famille ouverte.
 *
 * ## « On n'a pas demandé » ne se dit pas comme « il n'y en a aucun »
 *
 * `documents === null` veut dire qu'on n'a pas su lire les lectures. Afficher
 * alors un tableau vide ferait croire que rien n'a jamais été analysé sur ce
 * chantier — et l'on recommencerait une lecture déjà faite, et déjà payée
 * (règle 5).
 *
 * @param {object} quoi
 * @param {object[]|null} quoi.documents les lignes normalisées, ou `null`
 * @param {string} [quoi.famille] la famille ouverte
 * @param {boolean} [quoi.enCours] la demande est partie, la réponse n'est pas là
 * @param {string} [quoi.ouverte] l'identifiant du document ouvert, s'il y en a un
 */
export function renderLeTableauDesDocuments({
  documents = null, famille = TOUTES, enCours = false, rate = false, ouverte = "",
  filtre = ""
} = {}) {
  const ce = ceQueDitLaFamille(famille) ?? ceQueDitLaFamille(TOUTES);

  /**
   * **Trois états, et non deux.**
   *
   * « On n'a pas encore demandé », « on attend la réponse » et « on n'a pas su
   * lire » ne se disent pas pareil. Rendre l'échec par défaut ferait clignoter une
   * panne à chaque ouverture d'écran, avant même que la demande parte ; rendre un
   * tableau vide ferait croire que rien n'a jamais été analysé, et l'on
   * recommencerait une lecture déjà payée (règle 5).
   */
  if (documents === null) {
    if (enCours) {
      return `<section class="documents-analyses">
        <p class="documents-analyses__mot mono-small">Lecture de ce qui a déjà été analysé…</p>
      </section>`;
    }
    if (!rate) return "";
    return `<section class="documents-analyses">
      <p class="documents-analyses__mot forme-manques">Ce qui a déjà été analysé n'a pas pu
      être lu. Ce n'est pas « rien n'a été analysé » : on ne sait pas quoi.</p>
    </section>`;
  }

  const deLaFamille = parFamille(documents, famille);
  /**
   * **Les pastilles comptent la famille ouverte, et non le chantier entier.**
   * « En attente (5) » sous Mails doit dire cinq mails, sinon cliquer dessus en
   * rendrait trois.
   */
  const comptes = lesComptesParEtat(deLaFamille);
  const ici = parEtat(deLaFamille, filtre);

  return `
    <section class="documents-analyses">
      ${/*
        **La phrase d'aide s'en va.** « 19 documents analysés. Cliquer sur une
        ligne rouvre son analyse » redisait le compte que l'en-tête porte déjà,
        et expliquait un geste qu'on fait sans qu'on le dise. Ce qui comptait —
        combien, et dans quel état — est passé dans les pastilles.
      */""}
      ${renderDataTableShell({
        className: "documents-analyses__table",
        gridTemplate: "minmax(280px,2fr) 240px",
        state: ici.length ? "ready" : "empty",
        emptyHtml: renderDataTableEmptyState(filtre
          ? {
            title: `Aucun document ${CE_QUE_DIT_LETAT[filtre].toLocaleLowerCase("fr")}`,
            description: "Le filtre en haut du tableau en montre d'autres."
          }
          : { title: ce.vide.titre, description: ce.vide.quoi }),
        headHtml: renderDataTableHead({
          columns: [{
            html: `${renderDataTableCount({
              iconeHtml: svgIcon(ce.icone, { className: "octicon" }),
              dit: leCompteDit(famille, deLaFamille.length),
              titre: "Les documents de cette famille"
            })}${renderLesPastillesDuFiltre(comptes, filtre)}`,
            className: COLONNE_DU_COMPTE
          }]
        }),
        bodyHtml: ici.map((un) => renderUnDocumentAnalyse(un, { ouverte, famille })).join("")
      })}
    </section>
  `;
}

/**
 * Les pastilles de comptage, qui filtrent le tableau.
 *
 * ## Pourquoi deux pastilles et non trois
 *
 * « Tous » n'en est pas une : c'est l'état de repos, celui où aucune pastille
 * n'est allumée. Une troisième aurait demandé de choisir entre trois boutons
 * pour revenir à ce qu'on voyait en arrivant.
 *
 * **Une pastille allumée se rééteint au clic.** Sans cela, il n'y aurait aucun
 * chemin de retour vers la liste entière, et l'on chercherait un bouton qui
 * n'existe pas.
 *
 * ## Un état sans document garde sa pastille
 *
 * « En attente (0) » est une réponse : rien n'est en cours. La faire disparaître
 * obligerait à se demander si le filtre existe encore (règle 5).
 */
function renderLesPastillesDuFiltre(comptes, filtre = "") {
  return `
    <span class="documents-analyses__filtre" role="group" aria-label="Filtrer par état">
      ${[OU_EN_EST.ATTENTE, OU_EN_EST.ANALYSE].map((ou) => {
        const actif = texte(filtre) === ou;
        return `
          <button type="button"
            class="documents-analyses__pastille${actif ? " est-active" : ""}"
            ${FILTRER_PAR_ETAT}="${escapeHtml(actif ? "" : ou)}"
            aria-pressed="${actif}"
            title="${escapeHtml(actif
              ? "Montrer de nouveau tous les documents"
              : `Ne montrer que ce qui est ${CE_QUE_DIT_LETAT[ou].toLocaleLowerCase("fr")}`)}"
          >${escapeHtml(CE_QUE_DIT_LETAT[ou])}
            <span class="documents-analyses__compte">${Number(comptes?.[ou]) || 0}</span>
          </button>
        `;
      }).join("")}
    </span>
  `;
}

/**
 * Une ligne du tableau.
 *
 * Le gabarit de titre des Sujets, comme partout ailleurs : une icône, un titre
 * qui se clique, et ce qu'on en dit dessous.
 *
 * **L'icône dit la famille**, et elle n'est montrée que dans la vue d'ensemble :
 * sous « Mails », une colonne d'enveloppes identiques ne distingue rien et prend
 * la place du titre.
 */
function renderUnDocumentAnalyse(document, { ouverte = "", famille = TOUTES } = {}) {
  const ouvert = texte(ouverte) && texte(ouverte) === texte(document?.id);
  const ce = ceQueDitLaFamille(document?.famille);
  const melange = texte(famille) === TOUTES;
  const attend = (document?.ou ?? OU_EN_EST.ANALYSE) === OU_EN_EST.ATTENTE;

  return `
    <div class="data-table-shell__row documents-analyses__ligne${ouvert ? " est-ouverte" : ""}${
      attend ? " est-en-attente" : ""}">
      <div class="data-table-shell__cell data-table-shell__cell--titre">
        <span class="issue-row-title-grid">
          <span class="issue-row-title-grid__status" ${
            melange ? `title="${escapeHtml(ce.nom)}"` : ""}>${
            svgIcon(ce.icone, { className: "octicon" })}</span>
          <span class="issue-row-title-grid__title">
            ${/*
              **L'identifiant porte la famille.** Deux tables différentes peuvent
              rendre le même identifiant, et l'écran doit savoir où aller le
              rechercher — comme il doit savoir quel détail dessiner.

              **Un document qui attend ne s'ouvre pas** : il n'a pas d'analyse à
              montrer. Un titre qui se clique pour ne rien ouvrir se lit comme un
              écran en panne (règle 5) — il reste donc du texte, et le badge dit
              pourquoi.
            */""}
            ${attend
              ? `<span class="documents-analyses__titre">${escapeHtml(document.titre)}</span>`
              : `<button type="button" class="row-title-trigger theme-text theme-text--pb"
                  ${OUVRIR_UN_DOCUMENT}="${escapeHtml(`${document.famille}:${document.id}`)}"
                >${escapeHtml(document.titre)}</button>`}
            ${renderLeBadgeDeLetat(document)}
          </span>
          <span class="issue-row-title-grid__meta issue-row-meta-text mono-small">${
            escapeHtml([
              melange ? ce.nom : "",
              texte(document?.repere),
              texte(document?.quand),
              // **Relu n'est pas « lu deux fois le même jour ».** On relit en
              // ajustant une consigne, et c'est la dernière lecture qu'on ouvre.
              Number(document?.combien) > 1 ? `${document.combien} lectures` : ""
            ].filter(Boolean).join(" • "))}</span>
        </span>
      </div>
      <div class="data-table-shell__cell mono-small">${escapeHtml(texte(document?.dit))}</div>
    </div>
  `;
}

/**
 * Le badge qui dit où en est un document.
 *
 * ## Pourquoi un badge, et non une colonne
 *
 * Le tableau en a déjà une, à droite, qui dit ce que la lecture a valu — « 12
 * avis », « 7 messages ». L'état n'est pas une mesure : c'est ce qui dit si la
 * mesure existe. Posé à côté du titre, il se lit **avant** d'avoir parcouru la
 * ligne, qui est le moment où l'on décide de cliquer ou non.
 *
 * Il reprend la coque des badges de l'application — celle des Actions —, et sa
 * couleur dit l'action : bleu pour ce qui est fait et se rouvre, attention pour
 * ce qu'on attend encore.
 */
function renderLeBadgeDeLetat(document) {
  const attend = (document?.ou ?? OU_EN_EST.ANALYSE) === OU_EN_EST.ATTENTE;

  return `<span class="documents-analyses__badge documents-analyses__badge--${
    attend ? "attente" : "analyse"}" title="${escapeHtml(attend
      ? texte(document?.motif) || "Cette lecture a été lancée et n'est pas revenue"
      : "L'analyse est conservée : cliquer sur le titre la rouvre")}"
  >${svgIcon(attend ? "history" : "check-circle", { className: "octicon" })}${
    escapeHtml(attend ? "En attente" : "Analysé")}</span>`;
}

/**
 * Ce qu'un clic sur une ligne désigne.
 *
 * `null` quand la marque ne porte pas les deux moitiés : sans famille on ne sait
 * pas quelle table lire, et sans identifiant il n'y a rien à lire. Deviner l'une
 * des deux ouvrirait le mauvais document avec l'aplomb du bon (règle 5).
 */
export function leDocumentDesigne(marque = "") {
  const [famille, ...reste] = texte(marque).split(":");
  const id = reste.join(":").trim();
  if (!id || !ceQueDitLaFamille(famille) || famille === TOUTES) return null;
  return { famille, id };
}

/** La famille désignée par une entrée du rail, ou `null`. */
export function laFamilleDesignee(marque = "") {
  const voulue = texte(marque);
  return ceQueDitLaFamille(voulue) ? voulue : null;
}
