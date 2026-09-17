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
import { ceQuiSeDebat, phraseDeCeQuiSeDebat } from "../../services/ce-qui-se-debat.js";
import { etapesDuRaisonnement, lacunesDuRaisonnement, phraseDesLacunesDuRaisonnement }
  from "../../services/raisonnement-du-point.js";
import { lignesDeLHistoire, phraseDesLacunesDeLHistoire }
  from "../../services/histoire-de-la-valeur.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Une date, telle qu'on la lit.
 *
 * C'est **ici** que la locale se pose, et pas dans le service : un service qui
 * formate une date décide de l'affichage à la place de celui qui affiche. Ce
 * fichier est celui qui affiche.
 *
 * Une date illisible se rend telle quelle plutôt que de disparaître : « le
 * 2024-13-40 » se remarque et se corrige, une ligne sans date ne se remarque
 * pas.
 */
function dateEnFrancais(quand) {
  const lue = Date.parse(texte(quand));
  if (!Number.isFinite(lue)) return texte(quand);
  return new Date(lue).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

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
 * Ce que la recherche a donné la dernière fois qu'on l'a lancée.
 *
 * Quatre états, et ils ne se disent pas pareil — **« rien » est trois choses
 * différentes**, et les confondre ferait croire que la reconnaissance ne marche
 * pas (règle 5) :
 *
 * - `JAMAIS` : personne ne l'a lancée. L'écran ne dit rien, il propose.
 * - `RIEN` : aucun nom de la mémoire n'apparaît dans l'intitulé.
 * - `DEJA` : tout ce qu'elle reconnaît est déjà rattaché, ou a déjà été écarté.
 * - `TROUVE` : des rapprochements ont été proposés, et ils sont en dessous.
 */
export const RECHERCHE = { JAMAIS: "jamais", RIEN: "rien", DEJA: "deja", TROUVE: "trouve" };

const RECHERCHES_DITES = {
  [RECHERCHE.RIEN]: "Aucun nom de la mémoire n'apparaît dans l'intitulé de ce sujet.",
  [RECHERCHE.DEJA]: "Les noms reconnus sont déjà rattachés, ou ont déjà été écartés.",
  [RECHERCHE.TROUVE]: ""
};

/**
 * Ce sur quoi un sujet porte, dans son détail.
 *
 * L'autre bout de l'arête amont. On y confirme et on y écarte comme sur la
 * ligne de mémoire — les mêmes marques de données, donc **le même geste** : en
 * inventer un second pour le même acte ferait deux choses à apprendre là où il
 * n'y en a qu'une (règle 10).
 *
 * ## Le bloc s'affiche même vide, et ce n'est pas une contradiction
 *
 * Il portait jusqu'ici la règle « rien quand rien n'est accroché » : un sujet
 * sans arête ne porte pas sur rien, personne ne l'a dit, et l'écran ne
 * l'affirmait pas.
 *
 * Il porte maintenant un **geste** — chercher —, et un endroit où agir n'affirme
 * rien. Le titre et le bouton se lisent « voilà où cela se passe », pas « ce
 * sujet ne porte sur rien ». C'est d'ailleurs la seule façon d'atteindre les
 * sujets déjà ouverts aujourd'hui, qui n'auront jamais d'arête autrement.
 *
 * @param {object} options
 * @param {{assertion, lien, confirme, histoire}[]} [options.portages]
 * @param {{assertion, lien, histoire, quand, qui}[]} [options.ecartes] les refus, à lire
 * @param {boolean} [options.occupe] vrai pendant qu'une écriture est en vol
 * @param {string} [options.recherche] une valeur de `RECHERCHE`
 */
export function renderCeQuePorteLeSujet({
  portages = [], ecartes = [], occupe = false, recherche = RECHERCHE.JAMAIS
} = {}) {
  const lus = Array.isArray(portages) ? portages : [];
  const poses = lus.filter((portage) => portage.confirme);
  const proposes = lus.filter((portage) => !portage.confirme);
  const dit = RECHERCHES_DITES[texte(recherche)] ?? "";

  return `
    ${renderCeSurQuoiIlPorte(poses, occupe)}
    ${renderCeQuiPorteLeMemeNom(proposes, { occupe, dit })}
    ${renderCeQuiAEteEcarte(Array.isArray(ecartes) ? ecartes : [])}
  `;
}

/**
 * Ce que quelqu'un a déjà refusé de rattacher à ce sujet.
 *
 * ## Un refus qui ne se voit pas se rediscute
 *
 * Écarter retirait la valeur, et le refus disparaissait avec elle. Six mois
 * plus tard, personne ne sait que la question a été tranchée : on la rouvre en
 * réunion, et le travail de celui qui avait dit non est perdu. Un constat ne
 * devient pas faux (règle 6) — il se relit.
 *
 * ## Il se lit, il ne s'agit pas
 *
 * **Aucun bouton.** Il n'y a plus rien à décider : la pastille dit qui a
 * écarté et quand, et c'est tout ce dont on a besoin pour ne pas recommencer.
 * Un bouton ici redemanderait ce qui est déjà répondu.
 */
function renderCeQuiAEteEcarte(ecartes) {
  if (!ecartes.length) return "";

  const titre = "Ces valeurs ont été écartées";

  return `
    <section class="details-bloc portage-liste portage-liste--ecarte" aria-label="${escapeHtml(titre)}">
      <div class="details-bloc__label">${escapeHtml(titre)}</div>
      <p class="portage-liste__pourquoi">Quelqu'un a regardé ces rapprochements et a dit non.
        Elles ne seront plus reproposées.</p>
      <ul class="portage-liste__corps">
        ${ecartes.map((ecarte) => renderUneValeur(ecarte, { gestes: renderLaPastilleDuRefus(ecarte) })).join("")}
      </ul>
    </section>
  `;
}

/**
 * Le refus, dit au lieu d'être offert.
 *
 * Avec sa date et son auteur quand on les a : « écartée » tout court se lit
 * « quelqu'un, un jour », ce qui ne se vérifie auprès de personne (règle 5).
 */
function renderLaPastilleDuRefus(ecarte) {
  const quand = dateEnFrancais(texte(ecarte?.quand));
  const qui = texte(ecarte?.qui);

  const dit = ["Écartée", quand ? `le ${quand}` : "", qui ? `par ${qui}` : ""]
    .filter(Boolean).join(" ");

  return `<span class="portage-liste__pastille">${escapeHtml(dit)}</span>`;
}

/**
 * Ce qui est confirmé — c'est-à-dire **ce que ce sujet met en débat**.
 *
 * ## « Ça avance à quoi de faire tout ça ? »
 *
 * Le titre disait « Ce sujet porte sur », les lignes portaient un bouton
 * « Écarter », et rien ne disait ce qu'on venait de faire en confirmant. Vu à
 * l'écran d'un vrai projet : on clique « Oui, celle-ci », la ligne change de
 * bloc, et **on ne voit même pas qu'on a confirmé**.
 *
 * Ce que ça avance est pourtant tout l'intérêt du rapprochement : une valeur
 * qu'un sujet ouvert met en débat **cesse de se présenter comme acquise**, dans
 * la Mémoire et dans le cerveau. Le titre le dit maintenant, une pastille le
 * montre sur chaque ligne, et une phrase dit comment cela se termine.
 *
 * ## Le bouton s'appelle par son effet
 *
 * « Écarter » sur une ligne confirmée ne disait pas ce qu'il écartait. Il retire
 * la valeur du débat — c'est-à-dire qu'il défait la confirmation —, et c'est ce
 * qu'il s'appelle. « Non » reste au bloc d'en dessous : là on répond à une
 * question, ici on défait un geste.
 */
function renderCeSurQuoiIlPorte(poses, occupe) {
  if (!poses.length) return "";

  const titre = `Ce ${MOT_A_LECRAN.un} met ces valeurs en débat`;

  return `
    <section class="details-bloc portage-liste portage-liste--debat" aria-label="${escapeHtml(titre)}">
      <div class="details-bloc__label">${escapeHtml(titre)}</div>
      <p class="portage-liste__pourquoi">Tant que ce ${escapeHtml(MOT_A_LECRAN.un)} est ouvert,
        elles ne se présentent plus comme acquises : la Mémoire et le cerveau les montrent
        « en débat ».</p>
      ${renderCeQuiSeDebat(ceQuiSeDebat(poses))}
      <ul class="portage-liste__corps">
        ${poses.map((portage) => renderUneValeur(portage, {
          gestes: `<span class="portage-liste__pastille portage-liste__pastille--debat">en débat</span>
            <button type="button" class="gh-btn gh-btn--sm" data-portage-retire="${escapeHtml(texte(portage?.lien?.id))}" ${occupe ? "disabled" : ""}>Retirer du débat</button>`
        })).join("")}
      </ul>
      <p class="portage-liste__consequence">Fermer ce ${escapeHtml(MOT_A_LECRAN.un)} comme réalisé
        demandera ce qui a été tranché. La décision se propose, et une fois signée elle entre en
        mémoire : chacune de ces valeurs dira alors dans quel ${escapeHtml(MOT_A_LECRAN.un)} elle a
        été tranchée.</p>
    </section>
  `;
}

/**
 * Ce que ce débat a à trancher, côte à côte.
 *
 * ## Une liste ne montre pas une opposition
 *
 * Quatre lignes « Profondeur hors gel », deux valeurs différentes, dans l'ordre
 * où la base les rend : il faut lire les quatre et comparer de tête. Rangées par
 * nom, avec leurs valeurs distinctes en regard, **l'opposition se voit**.
 *
 * ## Il montre, il ne conclut pas
 *
 * La portée est là parce que c'est elle qui décide : « 0,466 m au Préau » et
 * « 0,69 m au Bâtiment A » peuvent être justes toutes les deux. L'écran met les
 * deux sous les yeux ; c'est le projet qui tranche.
 *
 * Rien quand aucun nom n'en porte plusieurs : un tableau qui répéterait la liste
 * d'en dessous ferait lire deux fois la même chose (règle 4).
 */
function renderCeQuiSeDebat(debat) {
  const partages = (debat?.noms ?? []).filter((entree) => entree.plusieursValeurs);
  if (!partages.length) return "";

  return `
    <div class="debat-valeurs">
      <p class="debat-valeurs__dit">${escapeHtml(phraseDeCeQuiSeDebat(debat))}</p>
      ${partages.map((entree) => `
        <div class="debat-valeurs__nom">${escapeHtml(entree.nom)}</div>
        <dl class="memory-facts">
          ${entree.versions.map((version) => `
            <dt>${escapeHtml(version.valeur)}</dt>
            <dd>${escapeHtml(version.portees.length
              ? version.portees.join(" · ")
              : "sur l'ouvrage entier")}</dd>
          `).join("")}
        </dl>
      `).join("")}
    </div>
  `;
}

/**
 * Ce que la reconnaissance propose, et **pourquoi elle le propose**.
 *
 * ## Le bloc pose une question, il ne constate pas
 *
 * Il portait le même titre que les arêtes confirmées — « Sur quoi ce sujet
 * porte » — sur une liste de valeurs que personne n'avait encore regardées. Le
 * titre affirmait ce que les boutons demandaient, et l'on cliquait « Confirmer »
 * sans savoir ce qu'on confirmait.
 *
 * Il dit maintenant **d'où sortent ces lignes** — le nom reconnu dans l'intitulé
 * —, **ce qu'on demande**, et **ce que ça fait**. Une question sans sa
 * conséquence n'est pas une question, c'est un piège.
 *
 * ## Le nom se lit sur les lignes qu'il annonce
 *
 * Il ne se reçoit pas d'ailleurs : une phrase qui nomme « Profondeur hors gel »
 * au-dessus d'une liste où figure autre chose fait chercher dans l'intitulé un
 * mot qui n'y est pas (règle 10). Elle le lit donc sur ses propres lignes, et
 * se tait dès qu'elles ne s'accordent pas — plusieurs noms de la mémoire
 * peuvent tenir dans un même titre.
 *
 * ## Les boutons disent l'acte, pas l'abstraction
 *
 * « Oui, celle-ci » et « Non, pas celle-là » se répondent sans rien apprendre.
 * « Confirmer » et « Écarter » demandent de savoir ce qu'on confirme dans un
 * mécanisme dont on ignore tout.
 */
function renderCeQuiPorteLeMemeNom(proposes, { occupe, dit }) {
  const titre = "Ces valeurs portent le même nom";

  const nom = nomCommun(proposes);
  const pourquoi = nom
    ? `Le nom « ${nom} » apparaît dans le titre de ce ${MOT_A_LECRAN.un}.`
    : `Un nom de la mémoire apparaît dans le titre de ce ${MOT_A_LECRAN.un}.`;

  return `
    <section class="details-bloc portage-liste portage-liste--propose" aria-label="${escapeHtml(titre)}">
      <div class="details-bloc__label portage-liste__tete">
        <span>${escapeHtml(titre)}</span>
        <button type="button" class="gh-btn gh-btn--sm" data-portage-cherche ${occupe ? "disabled" : ""}>
          ${occupe ? "Recherche…" : "Chercher dans la mémoire"}
        </button>
      </div>
      ${proposes.length
        ? `<p class="portage-liste__pourquoi">${escapeHtml(pourquoi)}
            Est-ce de celles-ci que ce ${escapeHtml(MOT_A_LECRAN.un)} parle ?</p>
           <ul class="portage-liste__corps">
             ${proposes.map((portage) => renderUneValeur(portage, {
               gestes: `
                 <button type="button" class="gh-btn gh-btn--sm" data-portage-confirme="${escapeHtml(texte(portage?.lien?.id))}" ${occupe ? "disabled" : ""}>Oui, celle-ci</button>
                 <button type="button" class="gh-btn gh-btn--sm" data-portage-retire="${escapeHtml(texte(portage?.lien?.id))}" ${occupe ? "disabled" : ""}>Non</button>`
             })).join("")}
           </ul>
           <p class="portage-liste__consequence">Confirmer une valeur la montre « en débat »
             dans la Mémoire et dans le cerveau, jusqu'à ce que ce ${escapeHtml(MOT_A_LECRAN.un)}
             soit fermé. Écarter la retire, et elle ne sera plus reproposée.</p>`
        : ""}
      ${dit ? `<div class="portage-liste__dit">${escapeHtml(dit)}</div>` : ""}
    </section>
  `;
}

/**
 * Une valeur, et **l'histoire qui permet d'en répondre**.
 *
 * ## Pourquoi le nom et la valeur ne suffisent pas
 *
 * « Profondeur hors gel = 0,466 m », trois fois de suite, sur trois lignes
 * identiques. Vu à l'écran d'un vrai projet : la même valeur existait pour
 * plusieurs parties de l'ouvrage, et rien ne les distinguait. **On ne peut pas
 * confirmer ce qu'on ne distingue pas.**
 *
 * Et même distinctes, trois valeurs ne se choisissent pas : il faut savoir
 * laquelle parle de quoi. D'où elle sort, ce qu'elle a lu, ce qui l'explique,
 * qui l'a posée et quand. C'est ce que la mémoire enregistre depuis toujours et
 * que cet écran ne montrait pas.
 *
 * ## Deux niveaux, et le premier suffit souvent
 *
 * La **ligne d'identité** est toujours là — la portée, la date, l'auteur,
 * l'origine en quatre mots. C'est ce qui permet de distinguer cinq lignes d'un
 * coup d'œil. Le **reste de l'histoire** se déplie : cinq histoires entières
 * dépliées feraient une page qu'on ne lit pas.
 *
 * Ce que la mémoire ne dit pas est **dans le dépli**, nommé. Une valeur dont
 * rien ne dit l'origine n'est pas une valeur dont l'origine va de soi.
 *
 * ## La liste des intitulés est celle de la Mémoire
 *
 * `memory-facts` porte déjà, dans l'onglet Mémoire, une liste « intitulé →
 * valeur ». Lui donner ici une seconde largeur de colonne ferait lire les mêmes
 * lignes à deux calibres selon l'écran ; c'est la même chose qu'on montre, elle
 * se montre pareil.
 */
function renderUneValeur(portage, { gestes }) {
  const { assertion, confirme, histoire = null } = portage ?? {};
  const lignes = lignesDeLHistoire(histoire, { dater: dateEnFrancais });
  const manques = phraseDesLacunesDeLHistoire(histoire?.lacunes);
  const identite = lignes.filter((ligne) => IDENTITE.includes(ligne.quoi));
  const reste = lignes.filter((ligne) => !IDENTITE.includes(ligne.quoi));

  return `
    <li class="portage-liste__ligne${confirme ? "" : " portage-liste__ligne--propose"}">
      <div class="portage-liste__haut">
        <span class="portage-liste__valeur">${escapeHtml(nomEtValeur(assertion))}</span>
        <span class="portage-liste__gestes">${gestes}</span>
      </div>
      ${identite.length
        ? `<div class="portage-liste__identite">${
          identite.map((ligne) => escapeHtml(ligne.dit)).join(" · ")
        }</div>`
        : ""}
      ${reste.length || manques
        ? `<details class="portage-liste__histoire">
            <summary>Pourquoi cette valeur ?</summary>
            <dl class="memory-facts">
              ${reste.map((ligne) => `
                <dt>${escapeHtml(ligne.quoi)}</dt>
                <dd>${escapeHtml(ligne.dit)}</dd>
              `).join("")}
            </dl>
            ${manques ? `<p class="histoire__manques">${escapeHtml(manques)}</p>` : ""}
          </details>`
        : ""}
    </li>
  `;
}

/**
 * Le nom que ces lignes ont en commun — vide dès qu'elles n'en ont pas un seul.
 *
 * C'est ce nom qui les a fait remonter. Mais un titre peut contenir plusieurs
 * noms de la mémoire, et la reconnaissance rapproche alors des valeurs qui ne
 * s'appellent pas pareil : en nommer une seule ferait chercher dans le titre un
 * mot qui explique la moitié de la liste (règle 5). La phrase générique reste
 * vraie, et c'est tout ce qu'on lui demande.
 */
function nomCommun(portages = []) {
  const noms = new Set(portages.map((portage) => texte(portage?.assertion?.payload?.subject)
    || texte(portage?.assertion?.subject_key)));

  return noms.size === 1 ? [...noms][0] : "";
}

/**
 * Ce qui distingue une valeur d'une autre, et qui reste donc toujours visible.
 *
 * Où elle porte, quand et par qui elle a été versée, d'où elle sort. Le reste —
 * ce qu'elle a lu, la citation, les écartés — explique ; ceux-ci **identifient**,
 * et sans eux cinq lignes se ressemblent.
 */
const IDENTITE = ["Porte sur", "Versée", "Origine"];

/** « Altitude = 742,30 », ou le seul nom quand la valeur manque. */
function nomEtValeur(assertion) {
  const nom = texte(assertion?.payload?.subject) || texte(assertion?.subject_key);
  const dite = texte(assertion?.payload?.value) || texte(assertion?.statement);
  return dite ? `${nom} = ${dite}` : nom;
}
