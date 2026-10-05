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
  COLONNE_DU_COMPTE, POUSSE_A_DROITE, renderDataTableCount, renderDataTableEmptyState,
  renderDataTableHead, renderDataTableShell
} from "./data-table-shell.js";
import {
  CE_QUE_DIT_LETAT, LES_FAMILLES, OU_EN_EST, TOUTES, ceQueDitLaFamille,
  lesComptesParEtat, lesComptesParFamille, parEtat, parFamille
} from "../../services/les-documents-analyses.js";
import { leCompteDit } from "../../services/les-familles-de-document.js";
import { NOM_COUPABLE, leNomEntier, renderLesMorceauxDuNom } from "./un-nom-coupable.js";
import {
  LES_TRIS_DES_DOCUMENTS, SENS, ceQueLeTriDit, leTriDesDocumentsValide, leTriDit,
  trierLesDocuments
} from "../../services/le-tri-des-documents.js";
import {
  ceQuUneSeulePropositionPorterait, ceQueLeBoutonDuLotDit, lesFamillesDuLot
} from "../../services/ce-qui-attend-une-proposition.js";

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/** L'attribut par lequel l'écran reconnaît un clic sur une entrée du rail. */
export const CHOISIR_UNE_FAMILLE = "data-famille-analysee";

/** L'attribut par lequel il reconnaît un clic sur une ligne du tableau. */
export const OUVRIR_UN_DOCUMENT = "data-document-analyse";

/** Celui par lequel il reconnaît un clic sur une pastille du filtre. */
export const FILTRER_PAR_ETAT = "data-etat-analyse";

/** Celui par lequel il reconnaît un clic sur un ordre du menu de tri. */
export const TRIER_LES_DOCUMENTS = "data-tri-analyse";

/**
 * L'identifiant du menu de tri, pour `menus-den-tete.js`.
 *
 * Écrit ici et lu par l'écran : c'est le même nom des deux côtés, et deux
 * écritures d'un même nom se renomment un jour d'un seul côté — le menu
 * garderait son attribut, le clic ne le verrait plus (règle 10).
 */
export const LE_MENU_DU_TRI = "tri-des-documents";

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
  filtre = "", tri = ""
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
  /**
   * **Le tri vient après le filtre**, et c'est le seul ordre possible : trier
   * puis filtrer donnerait le même résultat mais aurait rangé des lignes qu'on
   * jette ensuite. Surtout, la phrase du tri compte les documents **montrés** —
   * « 3 sans date » doit parler de ce qu'on a sous les yeux.
   */
  const ordre = leTriDesDocumentsValide(tri);
  const ici = trierLesDocuments(parEtat(deLaFamille, filtre), ordre);
  const ceQueLeTri = ceQueLeTriDit(ici, ordre);

  /**
   * **Ce qui attend une proposition se compte sur la famille ouverte**, comme
   * les pastilles, et non sur le chantier entier : un bouton qui annoncerait
   * dix-huit documents sous l'onglet Mails en emporterait six.
   *
   * Il se compte sur `deLaFamille` et non sur `ici` : le filtre d'état et le tri
   * changent ce qu'on **regarde**, pas ce qui attend. Un filtre « En échec »
   * ferait sinon dire qu'aucun document n'attend, alors que douze attendent sous
   * le filtre voisin.
   */
  const porterait = ceQuUneSeulePropositionPorterait(deLaFamille, famille);

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
        /**
         * **Trois colonnes, et non deux.**
         *
         * L'état vivait en badge à côté du titre. Avec un nom de document de
         * quatre-vingts caractères, il se retrouvait poussé hors de la ligne :
         * on ne pouvait plus voir si le document avait été analysé, qui est la
         * seule question qu'on se pose en arrivant.
         *
         * Le titre perd donc quarante pixels, et l'état en gagne une colonne à
         * lui — toujours au même endroit, quelle que soit la longueur du nom.
         */
        gridTemplate: "minmax(240px,2fr) 128px 200px",
        state: ici.length ? "ready" : "empty",
        emptyHtml: renderDataTableEmptyState(filtre
          ? {
            title: `Aucun document ${CE_QUE_DIT_LETAT[filtre].toLocaleLowerCase("fr")}`,
            description: "Le filtre en haut du tableau en montre d'autres."
          }
          : { title: ce.vide.titre, description: ce.vide.quoi }),
        headHtml: renderDataTableHead({
          /**
           * **Une seule colonne d'en-tête, et aucun nom de colonne.**
           *
           * Il y en avait trois : le compte, puis « État », puis « Ce que la
           * lecture a valu ». La colonne du compte couvre la grille entière —
           * c'est ce qui la cale à gauche, au-dessus des titres qu'elle compte
           * —, et les deux noms tombaient donc sur une **seconde ligne**, sous
           * le compte et décalés des colonnes qu'ils prétendaient nommer. Une
           * en-tête qui désigne la mauvaise colonne est pire qu'une en-tête
           * muette.
           *
           * Et ils ne nommaient rien qu'on ne lise : un badge « Analysé » dit
           * son propre nom, « 20 points » aussi. C'est la règle qu'on a déjà
           * posée pour les Actions — l'en-tête ne nomme plus ses colonnes, elle
           * compte.
           *
           * Reste donc une barre : **ce qui décrit** à gauche — le compte et les
           * pastilles —, **ce qui agit** à droite — l'ordre.
           */
          columns: [
            {
              html: `${renderDataTableCount({
                iconeHtml: svgIcon(ce.icone, { className: "octicon" }),
                dit: leCompteDit(famille, deLaFamille.length),
                titre: "Les documents de cette famille"
              })}${renderLesPastillesDuFiltre(comptes, filtre)}${renderLeMenuDuTri(ordre)}`,
              className: COLONNE_DU_COMPTE
            }
          ]
        }),
        bodyHtml: ici.map((un) => renderUnDocumentAnalyse(un, { ouverte, famille })).join("")
      })}
      ${/*
        **Ce que le tri n'a pas pu ranger, sous le tableau.**

        Sans cette phrase, trier par date de document paraîtrait n'avoir rien
        trié : la moitié de la liste serait restée en place, et rien
        n'expliquerait pourquoi (règle 5).
      */""}
      ${ceQueLeTri
        ? `<p class="documents-analyses__mot mono-small">${escapeHtml(ceQueLeTri)}</p>`
        : ""}
      ${renderCeQuiAttendUneProposition(porterait)}
    </section>
  `;
}

/**
 * Ce qui attend une proposition, sous le tableau.
 *
 * ## Pourquoi en bas, et non dans l'en-tête
 *
 * L'en-tête répond à « où en sont mes documents ? » — combien, dans quel état,
 * dans quel ordre. Celui-ci répond à « et maintenant ? », qui est la question
 * d'après. La mettre dans l'en-tête l'aurait posée avant qu'on ait regardé ce
 * qu'il y avait à regarder, et aurait repoussé le tri sur une seconde ligne.
 *
 * ## Le bouton n'est pas branché, et le dit
 *
 * Composer une proposition sur douze documents demande de rassembler douze
 * matières et de les écrire en lignes : c'est le tour suivant. Ce qui est
 * livré ici est **le lot** — ce qui partirait, dans quel ordre, et ce qui en
 * est exclu —, parce que c'est lui qui décidait de tout le reste et qu'on ne
 * pouvait pas l'écrire sans le voir.
 *
 * Un bouton qui aurait l'air de marcher serait une intention présentée comme
 * une chose qui marche (règle 12). Il porte donc ce qu'il fera, et la phrase
 * dit qu'il ne le fait pas encore.
 */
function renderCeQuiAttendUneProposition(porterait) {
  const bouton = ceQueLeBoutonDuLotDit(porterait);
  const familles = lesFamillesDuLot(porterait);

  return `
    <div class="documents-attente">
      <div class="documents-attente__dit">
        <p class="documents-attente__phrase">${escapeHtml(porterait.dit)}</p>
        ${familles.length > 1
          ? `<p class="documents-attente__familles mono-small">${escapeHtml(
              familles.map((une) => `${une.combien} ${une.nom}`).join(" · "))}</p>`
          : ""}
        ${porterait.sansDate
          ? `<p class="documents-attente__familles mono-small">${escapeHtml(
              `${porterait.sansDate} ${porterait.sansDate > 1
                ? "n'ont pas de date de document : la période ne les couvre pas"
                : "n'a pas de date de document : la période ne le couvre pas"}`)}</p>`
          : ""}
      </div>
      <button type="button" class="gh-btn gh-btn--sm" disabled
        title="${escapeHtml([bouton.titre, PAS_ENCORE_BRANCHE].filter(Boolean).join(" "))}">
        ${svgIcon("git-pull-request", { className: "octicon" })} ${escapeHtml(bouton.libelle)}
      </button>
      ${bouton.ouvert
        ? `<p class="documents-attente__pas-branche mono-small">${
            escapeHtml(PAS_ENCORE_BRANCHE)}</p>`
        : ""}
    </div>
  `;
}

/**
 * Ce que l'écran dit du geste qui n'existe pas encore.
 *
 * **Écrit une fois**, parce qu'il est dit deux fois — dans l'infobulle et sous
 * le bouton — et que deux phrases auraient fini par ne plus promettre la même
 * chose (règle 10).
 */
export const PAS_ENCORE_BRANCHE = "Ce geste n'est pas encore branché : le lot est "
  + "constitué, la proposition qui le portera reste à écrire. En attendant, une "
  + "proposition se fait depuis un document ouvert.";

/**
 * Le menu de tri, dans l'en-tête du tableau.
 *
 * ## Il ne dessine rien de neuf
 *
 * `issues-head-menu` et `gh-menu` sont ceux de l'onglet Sujets, et l'ouverture
 * est celle de `menus-den-tete.js` — elle existe précisément pour ne pas être
 * recopiée. Un menu à nous aurait eu son gris, son décalage et son
 * `aria-expanded` oublié (règle 4).
 *
 * ## L'ordre courant est dans le bouton
 *
 * « Trier » seul obligerait à ouvrir le menu pour savoir comment la liste est
 * rangée. Le bouton porte donc le libellé de l'ordre en cours, qui est aussi la
 * réponse à « pourquoi ce document est-il en haut ? ».
 *
 * ## Et son icône dit le sens
 *
 * Deux ordres du même axe portent des libellés voisins — « Analysé en dernier »
 * et « Analysé en premier ». L'icône les sépare d'un coup d'œil : la flèche
 * descend quand le plus récent est en tête, elle monte quand c'est le plus
 * ancien.
 *
 * ## Quatre entrées, et non deux plus un geste caché
 *
 * On aurait pu faire basculer le sens en recliquant l'axe déjà choisi. C'est un
 * geste qu'aucun écran n'annonce, et qu'on ne trouve qu'en le heurtant par
 * hasard. Les quatre ordres sont donc écrits, chacun avec la question à
 * laquelle il répond.
 */
function renderLeMenuDuTri(ordre) {
  const ici = leTriDit(ordre);

  return `
    <div class="issues-head-menu sujets-head-menu ${POUSSE_A_DROITE}">
      <button class="issues-head-menu__btn" type="button"
        data-sujets-menu="${LE_MENU_DU_TRI}"
        aria-haspopup="true" aria-expanded="false"
        title="Changer l'ordre du tableau"
      >${svgIcon(ici.sens === SENS.ANCIEN ? "sort-asc" : "sort-desc", {
          className: "octicon"
        })}
        <span>${escapeHtml(ici.libelle)}</span>
        ${svgIcon("chevron-down", { className: "gh-chevron" })}
      </button>

      <div class="gh-menu subject-meta-dropdown issues-head-menu__dropdown sujets-head-menu__liste"
        data-sujets-menu-liste="${LE_MENU_DU_TRI}" role="dialog">
        <div class="subject-meta-dropdown__title">Ranger le tableau</div>
        <div class="subject-meta-dropdown__body">
          ${LES_TRIS_DES_DOCUMENTS.map((un) => `
            <button type="button" class="select-menu__item${
              un.cle === ici.cle ? " is-active" : ""}"
              ${TRIER_LES_DOCUMENTS}="${escapeHtml(un.cle)}"
              aria-pressed="${un.cle === ici.cle}">
              <span class="select-menu__item-mainrow">
                <span class="select-menu__item-content">
                  <span class="select-menu__item-title">${escapeHtml(un.libelle)}</span>
                  ${/*
                    **La question, sous le libellé.** « Date du document » et
                    « Analysé en dernier » se confondent tant qu'on ne dit pas
                    à quoi chacun répond — et c'est exactement la confusion
                    qu'on vient lever.
                  */""}
                  <span class="select-menu__item-meta">${escapeHtml(un.question)}</span>
                </span>
              </span>
            </button>
          `).join("")}
        </div>
      </div>
    </div>
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
      ${/*
        **Un échec a sa pastille**, et ne se cache plus derrière « en attente ».
        Les deux n'appellent pas le même geste : ce qui attend n'a besoin de
        rien, ce qui a échoué ne reviendra jamais tout seul. Fondus, on lisait
        « 3 en attente » en croyant que le serveur y travaillait (règle 5).
      */""}
      ${[OU_EN_EST.ECHOUE, OU_EN_EST.ATTENTE, OU_EN_EST.ANALYSE].map((ou) => {
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
  // **Attendre et avoir échoué se disent autrement, et s'ouvrent pareil :**
  // ni l'un ni l'autre n'a d'analyse à montrer.
  const ou = texte(document?.ou) || OU_EN_EST.ANALYSE;
  const attend = ou !== OU_EN_EST.ANALYSE;
  const nom = leNomEntier(document?.titre);

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
            ${/*
              **Un nom trop long se coupe par le milieu, après avoir pris toute
              la place disponible.**

              `text-overflow: ellipsis` coupait la fin — et la fin est ce qui
              distingue : deux rapports du même chantier ne diffèrent que par
              leur numéro, au début, et par leur indice, à la fin. Coupés par
              la fin, ils sont le même nom.

              Et la coupe n'est plus un compte de caractères : elle rendait un
              nom abrégé à côté de trente centimètres de vide dès que la colonne
              était large. Le début prend la place, la fin ne bouge pas, et
              c'est le navigateur qui décide s'il faut rogner (`un-nom-coupable.js`).
            */""}
            ${attend
              ? `<span class="documents-analyses__titre ${NOM_COUPABLE}"
                  title="${escapeHtml(nom)}">${renderLesMorceauxDuNom(document?.titre)}</span>`
              : `<button type="button"
                  class="row-title-trigger theme-text theme-text--pb ${NOM_COUPABLE}"
                  ${OUVRIR_UN_DOCUMENT}="${escapeHtml(`${document.famille}:${document.id}`)}"
                  title="${escapeHtml(nom)}"
                >${renderLesMorceauxDuNom(document?.titre)}</button>`}
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
      ${/*
        **L'état a sa colonne**, et c'est tout l'objet de ce changement : à côté
        du titre, il se perdait hors de la ligne dès qu'un nom était long, et
        l'on ne savait plus si le document avait été analysé.
      */""}
      <div class="data-table-shell__cell">${renderLeBadgeDeLetat(document)}</div>
      <div class="data-table-shell__cell mono-small">${escapeHtml(texte(document?.dit))}</div>
    </div>
  `;
}

/**
 * Le badge qui dit où en est un document.
 *
 * ## Il a fini par prendre une colonne, et voici pourquoi
 *
 * Il vivait à côté du titre, pour une raison qui tenait : l'état n'est pas une
 * mesure — c'est ce qui dit si la mesure existe —, et posé contre le titre il se
 * lisait avant d'avoir parcouru la ligne.
 *
 * **Un nom de quatre-vingts caractères a eu raison de ce raisonnement.** Le
 * badge se retrouvait poussé hors de la ligne, et l'on ne pouvait plus voir si
 * le document avait été analysé. Il garde donc sa forme de badge — l'état se lit
 * d'un coup d'œil, pas en lisant un mot — et prend une colonne, où il est
 * toujours au même endroit quelle que soit la longueur du nom.
 *
 * Il reprend la coque des badges de l'application — celle des Actions —, et sa
 * couleur dit l'action : bleu pour ce qui est fait et se rouvre, attention pour
 * ce qu'on attend encore.
 */
function renderLeBadgeDeLetat(document) {
  const ou = texte(document?.ou) || OU_EN_EST.ANALYSE;

  /**
   * **Trois tons, parce qu'il y a trois gestes.** Bleu pour ce qui est fait et
   * se rouvre, attention pour ce qu'on attend encore, danger pour ce qui s'est
   * arrêté — celui-là seul demande qu'on relance.
   */
  const ce = {
    [OU_EN_EST.ANALYSE]: {
      ton: "analyse", icone: "check-circle", dit: "Analysé",
      pourquoi: "L'analyse est conservée : cliquer sur le titre la rouvre"
    },
    [OU_EN_EST.ATTENTE]: {
      ton: "attente", icone: "history", dit: "En attente",
      pourquoi: "Cette lecture a été lancée et n'est pas revenue"
    },
    [OU_EN_EST.ECHOUE]: {
      ton: "echoue", icone: "alert", dit: "En échec",
      pourquoi: "Cette lecture s'est arrêtée : rien ne la reprendra sans un geste"
    }
  }[ou] ?? {
    ton: "analyse", icone: "check-circle", dit: "Analysé",
    pourquoi: "L'analyse est conservée"
  };

  return `<span class="documents-analyses__badge documents-analyses__badge--${ce.ton}"
    title="${escapeHtml(texte(document?.motif) || ce.pourquoi)}"
  >${svgIcon(ce.icone, { className: "octicon" })}${escapeHtml(ce.dit)}</span>`;
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
