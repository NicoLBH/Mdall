/**
 * Le carburant : **ce que Mdall a reçu, et ce que cela permet**.
 *
 * ## Le premier écran de la console qui lise vraiment quelque chose
 *
 * Et il ne lit aucun contenu. La fonction de base ne rend que des nombres et
 * deux dates : pas un objet, pas une adresse, pas un nom de chantier
 * (`docs/la-console-de-ladministrateur.md`, § 3).
 *
 * ## Ce qu'il montre, dans cet ordre, et l'ordre est le sujet
 *
 * **Ce que cela permet**, d'abord. C'est la seule ligne qui décide de quelque
 * chose, et elle doit pouvoir dire non. Un tableau de bord qui répond toujours
 * « ça progresse » n'aide à décider de rien.
 *
 * **La répartition**, ensuite. « 40 000 mails » est un chiffre de plaquette ;
 * quarante mille répartis sur mille chantiers sont quarante mille fois rien.
 *
 * **Ce qui n'est pas fait**, enfin, et nommément. La question posée était
 * l'avancement de l'anonymisation et de l'extraction : aucune n'existe. Des
 * barres à zéro auraient présenté une intention comme un chantier en cours
 * (règle 12).
 */

import {
  ASSEZ_DE_MATIERE, CE_QUI_NEST_PAS_FAIT, compteDit, laRepartition, motDeLaTranche,
  phraseDeCeQueCaPermet, phraseDuGisement
} from "../partage/js/services/les-comptes-du-carburant.js";
import {
  lesComptesDuCarburant
} from "../partage/js/services/les-comptes-du-carburant-supabase.js";
import {
  laPartReconnue, lesDomainesJamaisReconnus, lesDomainesRanges,
  phraseDeLaReconnaissance, phraseDunDomaineDuSysteme
} from "../partage/js/services/les-domaines-du-systeme.js";
import {
  lesDomainesDuSysteme
} from "../partage/js/services/les-domaines-du-systeme-supabase.js";
import { DOMAINS, domainLabel } from "../partage/js/services/assertion-taxonomy.js";
import {
  ASSEZ_VU, laPartDuRedoublement, lesEnchainements, lesEnchainementsQuiPortent,
  phraseDeLaPrediction, phraseDunEnchainement
} from "../partage/js/services/les-enchainements-du-systeme.js";
import {
  lesEnchainementsDuSysteme
} from "../partage/js/services/les-enchainements-du-systeme-supabase.js";
import {
  CE_QUI_MANQUE_ENCORE, lesSujetsRanges, phraseDeCeQueCeNestPas, phraseDeCeQuiEstCache,
  phraseDesFormes, phraseDeLaGranulometrie, phraseDuRegroupement, phraseDunSujet
} from "../partage/js/services/les-sujets-du-systeme.js";
import {
  laMesureDesSujets, lesEnchainementsDesSujets, lesSujetsDuSysteme
} from "../partage/js/services/les-sujets-du-systeme-supabase.js";
import {
  laFonctionDite, leLienDit, lesIdeesRangees, phraseDeCeQueLesIdeesValent
} from "../partage/js/services/une-idee.js";
import {
  lesRaisonnements, phraseDesRaisonnements, phraseDunRaisonnement
} from "../partage/js/services/un-raisonnement.js";
import {
  laFormeDesAffirmations, laMesureDesIdees, leDetailDesLiaisons, lesIdeesDuSysteme
} from "../partage/js/services/les-idees-du-systeme-supabase.js";
import {
  leNomDuFichier, lexportEnJson, phraseDeLexport
} from "../partage/js/services/lexport-des-idees.js";
import {
  brancherLesBoutonsCopier, renderBoutonCopier
} from "../partage/js/views/ui/bouton-copier.js";
import { LE_CARBURANT, laRubriqueDite } from "../partage/js/services/les-rubriques-de-la-console.js";
import { renderTitreDEcranHtml } from "../partage/js/views/ui/titre-decran.js";

const echapper = (valeur) => String(valeur ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

/** Le jour d'un instant, écrit en français. */
function leJour(quand) {
  const lu = Date.parse(String(quand ?? ""));
  if (!Number.isFinite(lu)) return "";
  return new Date(lu).toLocaleDateString("fr-FR",
    { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export function renderLeCarburant() {
  return `<div id="carburantHote"><section class="conso-usages">
    <p class="conso-usages__mot">Lecture des comptes…</p>
  </section></div>`;
}

function renderLaRepartition(comptes) {
  const lignes = laRepartition(comptes);
  if (!lignes.some((une) => une.combien)) return "";

  return `
    <ul class="forme-reference">
      ${lignes.map((une) => `
        <li class="forme-reference__ligne">
          <span class="forme-reference__quoi">${echapper(une.dit)}</span>
          <span class="forme-reference__chiffres mono-small">${
            echapper(`${compteDit(une.combien)} ${une.combien > 1 ? "chantiers" : "chantier"}`)}</span>
          <span class="forme-reference__sur mono-small">${
            echapper(motDeLaTranche(une))}</span>
        </li>
      `).join("")}
    </ul>
  `;
}

function renderCeQuiNestPasFait() {
  return `
    <section class="conso-usages">
      <h3 class="conso-usages__titre">Ce que le système n'en fait pas encore</h3>
      <p class="conso-usages__mot">
        Nommé plutôt que dessiné en barres de progression : une étape qui n'a pas
        été écrite n'avance pas de zéro pour cent, elle n'existe pas.
      </p>
      ${CE_QUI_NEST_PAS_FAIT.map((un) => `
        <div class="forme-suite">
          <h4 class="forme-suite__titre">${echapper(un.quoi)}</h4>
          <p class="forme-suite__dit">${echapper(un.ou)}</p>
          <p class="conso-usages__mot">${echapper(un.pourquoi)}</p>
        </div>
      `).join("")}
    </section>
  `;
}

/**
 * Ce que le système reconnaît, domaine par domaine.
 *
 * ## Pourquoi c'est ici et pas dans un projet
 *
 * L'écran des Indicateurs montre la même chose **pour un chantier**. La
 * question de la console est autre : « le système progresse-t-il ? ». Elle ne
 * se lit pas sur un chantier — un seul chantier peut ne parler que de
 * structure sans que rien n'aille mal — mais sur l'ensemble.
 *
 * ## Et cela ne lit aucun contenu
 *
 * Un domaine est **un mot d'un vocabulaire fermé de huit**, écrit dans une
 * colonne. Il ne désigne ni chantier, ni personne, ni affirmation. La fonction
 * de base ne rend que ce mot et des nombres : par sa signature, elle ne peut
 * pas rendre autre chose.
 */
function renderLesDomaines(range) {
  const part = laPartReconnue(range);
  const jamais = lesDomainesJamaisReconnus(range, DOMAINS);

  return `
    <section class="conso-usages">
      <h3 class="conso-usages__titre">Ce que le système reconnaît</h3>
      <p class="conso-usages__mot">
        Un taux de précision dit qu'on se trompe ; il ne dit jamais sur quoi.
        Domaine par domaine : combien d'affirmations le portent, et sur combien
        de chantiers il se montre. Un domaine vu mille fois sur un seul chantier
        ne dit pas qu'une taxonomie marche.
      </p>
      <p class="conso-usages__mot"><b>${echapper(phraseDeLaReconnaissance(range))}</b></p>
      ${part === null ? "" : `
        <ul class="forme-reference">
          ${range.reconnus.map((une) => `
            <li class="forme-reference__ligne">
              <span class="forme-reference__quoi">${echapper(domainLabel(une.domaine))}</span>
              <span class="forme-reference__chiffres mono-small">${
                echapper(`${compteDit(une.affirmations)} ${une.affirmations > 1
                  ? "affirmations" : "affirmation"}`)}</span>
              <span class="forme-reference__sur mono-small">${
                echapper(phraseDunDomaineDuSysteme(une))}</span>
            </li>
          `).join("")}
        </ul>
        ${range.reconnus.length ? "" : `<p class="forme-manques">
          Aucune affirmation ne porte de domaine. La classification n'attrape
          rien — ce n'est pas que les chantiers n'en parlent pas.</p>`}
        ${jamais.length ? `<p class="conso-usages__mot">${echapper(
          `Jamais reconnus : ${jamais.map(domainLabel).join(", ")}. `
          + "Soit les chantiers n'en parlent pas, soit la classification ne les "
          + "voit pas — et c'est la question qu'il faut pouvoir se poser.")}</p>` : ""}
        ${range.nonClasse ? `<p class="conso-usages__mot">${echapper(
          `${compteDit(range.nonClasse.affirmations)} affirmations sans domaine, `
          + `sur ${range.nonClasse.chantiers} ${range.nonClasse.chantiers > 1
            ? "chantiers" : "chantier"}. Ce n'est pas une erreur : ce qu'on n'a `
          + "pas su classer s'écrit, plutôt que de se ranger au jugé.")}</p>` : ""}
      `}
    </section>
  `;
}

/**
 * Ce que fait la prédiction, montré en clair.
 *
 * ## Le mécanisme tient en une phrase
 *
 * Le prédicteur forme les couples « après ceci, il est venu cela » à
 * l'intérieur d'un chantier, les compte, et propose les plus fréquents. Rien de
 * plus. Ce tableau montre ces couples, comptés sur **l'ensemble des
 * chantiers** — ce qu'aucun écran de projet ne peut faire, puisqu'un chantier
 * ne voit que lui-même.
 *
 * ## L'ordre des trois choses n'est pas décoratif
 *
 * **Ce que cela vaut**, d'abord : le meilleur enchaînement comparé au hasard.
 * C'est la seule ligne qui décide quelque chose, et elle doit pouvoir dire non.
 *
 * **Les enchaînements**, ensuite, avec leur taux *et* leur assiette.
 *
 * **Ce qui n'en est pas un**, enfin : la part des suites où un domaine se
 * répète. Si l'essentiel est là, « ce qui suit habituellement » se réduit à
 * « ce qui vient de venir », et il faut pouvoir s'en apercevoir.
 */
function renderLesEnchainements(tous, {
  titre = "Ce que fait la prédiction",
  mot = "Elle forme les couples « après ceci, il est venu cela » à l'intérieur"
    + " d'un chantier, les compte, et propose les plus fréquents. Rien de plus."
    + " Voici ces couples, sur l'ensemble des chantiers — un chantier seul ne"
    + " peut pas les voir.",
  /*
    **Plus de « hasard parmi N ».** La comparaison se faisait à un tirage
    uniforme : une chance sur huit pour les domaines, sur six cent vingt-huit
    pour les sujets. Elle annonçait « 614 fois mieux que le hasard » de règles
    qui n'apprenaient rien — « avis » suit presque tout, et le prédire sans
    rien regarder tombe juste la plupart du temps.

    La référence est maintenant la fréquence du terme qui suit, et elle se
    calcule dans le service, à partir des couples eux-mêmes : il n'y a plus de
    nombre à passer ici, donc plus de nombre à se tromper.
  */
  // Comment on écrit un côté du couple. Les domaines ont un libellé de
  // taxonomie ; un sujet s'écrit tel que les chantiers l'écrivent.
  nommer = domainLabel
} = {}) {
  const porteurs = lesEnchainementsQuiPortent(tous);
  const redoublement = laPartDuRedoublement(tous);

  return `
    <section class="conso-usages">
      <h3 class="conso-usages__titre">${echapper(titre)}</h3>
      <p class="conso-usages__mot">${echapper(mot)}</p>
      <p class="conso-usages__mot"><b>${echapper(phraseDeLaPrediction(tous))}</b></p>

      ${/*
        **Le classement prend la borne basse, la ligne garde son taux observé.**
        Six coups sur six ne valent pas trente sur quarante, et un classement
        par le taux brut met toujours les petits échantillons en tête — c'est
        mécanique, et c'est faux. Ce qui s'est passé reste affiché tel quel.
      */""}
      ${porteurs.length ? `
        <ul class="forme-reference">
          ${porteurs.slice(0, 12).map((une) => `
            <li class="forme-reference__ligne">
              <span class="forme-reference__quoi">${echapper(
                `${nommer(une.avant)} → ${nommer(une.apres)}`)}</span>
              <span class="forme-reference__chiffres mono-small">${
                echapper(phraseDunEnchainement(une))}</span>
              ${/*
                **Le nombre de chantiers tranche.** Un enchaînement qui revient
                partout est une régularité du bâtiment ; vu sur un seul
                chantier, c'est l'habitude de ce chantier-là, et l'apprendre ne
                servirait qu'à lui.
              */""}
              <span class="forme-reference__sur mono-small">${echapper(
                `${une.chantiers} ${une.chantiers > 1 ? "chantiers" : "chantier"}`)}</span>
            </li>
          `).join("")}
        </ul>
      ` : `<p class="forme-manques">
        Aucun enchaînement n'a encore été vu ${ASSEZ_VU} fois. Ce n'est pas que
        le prédicteur se trompe : il n'a pas encore de quoi se prononcer.</p>`}

      ${redoublement === null ? "" : `<p class="conso-usages__mot">${echapper(
        `${Math.round(redoublement * 100)} % des suites sont un domaine qui se répète.`
        + " Ce n'est pas un enchaînement — c'est le même sujet qui continue —, et"
        + " plus cette part est haute, moins « ce qui suit » dit autre chose que"
        + " « ce qui vient de venir ».")}</p>`}
    </section>
  `;
}

/**
 * Les sujets techniques, et ce qu'il leur manque encore.
 *
 * ## Ce que cet écran répond
 *
 * « Trois domaines pour 7 857 affirmations, c'est très largement insuffisant.
 * Quoi en sol, quoi en structure ? » — voici quoi. Les termes que les chantiers
 * écrivent réellement, comptés sur l'ensemble, et non huit cases décidées
 * d'avance.
 *
 * ## Ce qu'il ne prétend pas être
 *
 * Ce n'est pas de l'apprentissage, et c'est écrit à l'écran. Un tableau de bord
 * qui laisse croire qu'un modèle tourne derrière ferait prendre un comptage de
 * mots pour une intelligence — et l'on s'en apercevrait au pire moment.
 */
function renderLesSujets(sujets, mesure) {
  const ranges = lesSujetsRanges(sujets);
  const cache = phraseDeCeQuiEstCache(mesure);

  return `
    <section class="conso-usages">
      <h3 class="conso-usages__titre">Les sujets que les chantiers emploient</h3>
      <p class="conso-usages__mot">
        Huit cases ne décrivent pas un chantier, elles décrivent un sommaire :
        « après le sol, la structure » est une évidence de métier. Voici les
        termes qu'on trouve dans les affirmations, comptés sur l'ensemble des
        chantiers. Ils ne sont pas déclarés, ils sont trouvés.
      </p>
      ${/*
        **Ce que ce comptage n'est pas, dit avant qu'on le prenne pour autre
        chose.** L'écran annonçait « voici ce que les affirmations disent
        réellement » et déroulait : plafonds, dispositions, passage, portes.
        Un terme n'est ni une idée, ni une fonction, ni un raisonnement — et une
        couche présentée pour ce qu'elle n'est pas fait croire la question
        réglée (règle 12).
      */""}
      <p class="conso-usages__mot">${echapper(phraseDeCeQueCeNestPas(ranges))}</p>
      <p class="conso-usages__mot"><b>${
        echapper(phraseDeLaGranulometrie(ranges, DOMAINS.length))}</b></p>
      ${/*
        **Ce que le regroupement a valu, et non ce qu'il promet.** « Pluriels,
        ordre des mots, mots-outils intercalés » est vérifiable : le nombre de
        formes rangées sous ces sujets le dit.
      */""}
      ${phraseDuRegroupement(ranges, mesure)
        ? `<p class="conso-usages__mot">${echapper(phraseDuRegroupement(ranges, mesure))}</p>`
        : ""}

      ${ranges.length ? `
        <ul class="forme-reference">
          ${ranges.slice(0, 40).map((une) => `
            <li class="forme-reference__ligne">
              <span class="forme-reference__quoi">${echapper(une.sujet)}${
                phraseDesFormes(une)
                  ? ` <i class="mono-small">${echapper(phraseDesFormes(une))}</i>`
                  : ""}</span>
              <span class="forme-reference__chiffres mono-small">${
                echapper(`${compteDit(une.affirmations)} ${une.affirmations > 1
                  ? "affirmations" : "affirmation"}`)}</span>
              <span class="forme-reference__sur mono-small">${
                echapper(phraseDunSujet(une))}</span>
            </li>
          `).join("")}
        </ul>
        ${ranges.length > 40
          ? `<p class="conso-usages__mot">${echapper(
              `Les 40 premiers, sur ${compteDit(ranges.length)}.`)}</p>`
          : ""}
      ` : `<p class="forme-manques">
        Aucun terme n'est encore partagé par deux chantiers. Ce n'est pas que le
        vocabulaire est pauvre : c'est qu'il n'y a pas encore de quoi le
        comparer.</p>`}

      ${cache ? `<p class="conso-usages__mot">${echapper(cache)}</p>` : ""}
    </section>

    <section class="conso-usages">
      <h3 class="conso-usages__titre">Ce qui manque pour que cela prédise</h3>
      <p class="conso-usages__mot">
        Ce tableau est un <b>comptage de termes</b>, pas un apprentissage : il ne
        dépend d'aucun modèle et se vérifie ligne à ligne. C'est la couche qui
        manquait — et celle sans laquelle un modèle n'aurait rien sur quoi
        s'entraîner, ni rien à quoi se comparer. Voici ce qu'il reste, nommé
        plutôt que dessiné en barres de progression.
      </p>
      ${CE_QUI_MANQUE_ENCORE.map((un) => `
        <div class="forme-suite">
          <h4 class="forme-suite__titre">${echapper(un.quoi)}</h4>
          <p class="forme-suite__dit">${echapper(un.ou)}</p>
          <p class="conso-usages__mot">${echapper(un.pourquoi)}</p>
        </div>
      `).join("")}
    </section>
  `;
}

/**
 * Les idées que les chantiers énoncent, et ce qu'elles composent.
 *
 * ## Le cran au-dessus des termes
 *
 * > « Plafonds, dispositions, passage, portes… et alors ? Où sont les idées,
 * > les raisonnements, les fonctions ? Comment est-ce que ça s'enchaîne ? »
 *
 * Et alors rien, en effet. Un terme nomme une chose ; il ne dit pas ce qu'elle
 * entraîne, ce qu'elle impose, ni ce qu'elle interdit. Voici l'autre question :
 * **qu'est-ce qui fait quoi**.
 *
 * ## Deux listes, et la seconde est la seule qui raisonne
 *
 * Les idées sont trouvées, une par affirmation, par le mot de liaison que la
 * phrase écrit elle-même. Les **enchaînements** ne sont trouvés nulle part :
 * ils se calculent en composant deux idées qui se touchent, souvent venues de
 * deux documents qui ne se connaissent pas. C'est la seule chose de tout cet
 * écran que personne n'a écrite.
 *
 * ## Ce que cela n'est pas, dit avant qu'on le prenne pour autre chose
 *
 * Aucun modèle ne tourne derrière. Le découpage se fait sur « donc », « car »,
 * « à condition que » : cela se vérifie à la main, et cela ne lit pas les
 * phrases qui ne portent aucun de ces mots. La part qui en porte un est
 * annoncée, parce qu'elle est la mesure de ce qu'on ne voit pas (règle 5).
 */
/**
 * **Où le découpage casse, mot par mot.**
 *
 * « 1 % des affirmations énoncent un lien » peut vouloir dire deux choses
 * opposées : le corpus n'énonce rien, ou le découpage ne sait pas le lire. Un
 * chiffre qu'on ne sait pas expliquer ne sert à rien (règle 12).
 *
 * Un mot que beaucoup d'affirmations portent et qui ne rend aucune idée est un
 * mot qui promet et ne tient pas : c'est là qu'il faut regarder.
 */
function renderLeDetailDesLiaisons(liaisons, forme) {
  const portees = (Array.isArray(liaisons) ? liaisons : [])
    .filter((une) => Number(une?.contenues) > 0);

  return `
    <section class="conso-usages">
      <h3 class="conso-usages__titre">Où le découpage casse</h3>
      ${forme ? `<p class="conso-usages__mot">${echapper(
        `Les affirmations font ${forme.mots_moyens} mots en moyenne, et ${
          compteDit(forme.au_moins_dix_mots)} en portent au moins dix sur ${
          compteDit(forme.affirmations)}. ${compteDit(forme.sans_liaison)} n'en portent `
        + "aucun mot de liaison.")}</p>
      <p class="conso-usages__mot">
        <b>C'est la première chose à regarder.</b> Un corpus fait d'intitulés —
        « Menuiseries extérieures », « Plancher haut du R+1 » — ne porte aucun
        lien, et ce n'est alors pas le découpage qu'il faut corriger.
      </p>` : `<p class="forme-manques">
        La forme des affirmations n'a pas pu être lue. Ce n'est pas qu'elles
        n'en ont pas : on ne sait pas laquelle.</p>`}

      ${portees.length ? `
        <ul class="forme-reference">
          ${portees.map((une) => `
            <li class="forme-reference__ligne">
              <span class="forme-reference__quoi">
                <b>${echapper(`« ${une.mot} »`)}</b>
                <i>${echapper(`${une.lien} · ${compteDit(une.contenues)} affirmation${
                  une.contenues > 1 ? "s" : ""} le portent`)}</i>
              </span>
              <span class="forme-reference__chiffres mono-small">${
                echapper(`${compteDit(une.entieres)} idée${une.entieres > 1 ? "s" : ""}`)}</span>
              ${/*
                **Pourquoi les autres échouent**, et non seulement combien. Un
                mot coupé cent fois qui ne rend rien faute de terme à droite
                n'appelle pas le même travail qu'un mot qui n'est jamais coupé.
              */""}
              <span class="forme-reference__sur mono-small">${echapper(
                une.premieres
                  ? `coupé ${compteDit(une.premieres)} fois · ${
                      compteDit(une.sans_terme)} sans terme · ${
                      compteDit(une.tautologies)} tautologie${
                      une.tautologies > 1 ? "s" : ""}`
                  : "jamais le premier de sa phrase")}</span>
            </li>
          `).join("")}
        </ul>
      ` : `<p class="forme-manques">
        Aucun mot de liaison n'apparaît dans le corpus. Ce n'est pas une panne du
        découpage : il n'y a rien à découper.</p>`}
    </section>
  `;
}

function renderLesIdees(lignes, mesure, liaisons, forme, chaines) {
  const idees = lesIdeesRangees(lignes);

  return `
    <section class="conso-usages">
      <h3 class="conso-usages__titre">Ce que les chantiers énoncent</h3>
      <p class="conso-usages__mot">
        Un terme nomme une chose ; il ne dit pas ce qu'elle fait. Voici le cran
        au-dessus : <b>ce qui entraîne quoi</b>, lu dans les mots de liaison que
        les affirmations écrivent elles-mêmes — « donc », « car »,
        « à condition que ». Chaque idée est une fonction : quelque chose entre,
        quelque chose sort.
      </p>
      <p class="conso-usages__mot"><b>${
        echapper(phraseDeCeQueLesIdeesValent(idees, mesure))}</b></p>
      ${/*
        **Ce que le découpage ne sait pas lire.** « Si le sol est argileux, les
        fondations descendent » commence par son lien : à gauche, il n'y a rien.
        Le taire ferait prendre une limite de méthode pour une absence dans le
        corpus (règle 5).
      */""}
      <p class="conso-usages__mot">
        Seules les liaisons placées <b>entre</b> les deux membres sont lues :
        « si… » commence par son lien, et n'a rien à sa gauche. Deviner la
        coupure sur une virgule rendrait des idées fausses avec l'aplomb des
        vraies.
      </p>

      ${idees.length ? `
        <ul class="forme-reference">
          ${idees.slice(0, 40).map((une) => `
            <li class="forme-reference__ligne">
              <span class="forme-reference__quoi">
                <b>${echapper(laFonctionDite(une))}</b>
                <i>${echapper(leLienDit(une.lien)?.libelle ?? "")}</i>
              </span>
              <span class="forme-reference__chiffres mono-small">${
                echapper(`${compteDit(une.affirmations)} ${une.affirmations > 1
                  ? "affirmations" : "affirmation"}`)}</span>
              <span class="forme-reference__sur mono-small">${
                echapper(`sur ${compteDit(une.chantiers)} chantier${
                  une.chantiers > 1 ? "s" : ""}`)}</span>
            </li>
          `).join("")}
        </ul>
        ${idees.length > 40
          ? `<p class="conso-usages__mot">${echapper(
              `Les 40 premières, sur ${compteDit(idees.length)}.`)}</p>`
          : ""}
      ` : ""}
    </section>

    <section class="conso-usages">
      <h3 class="conso-usages__titre">Ce qui s'enchaîne — un raisonnement</h3>
      <p class="conso-usages__mot">
        Deux idées composent quand ce que l'une produit est ce que l'autre
        demande. Ce qui sort de la composition n'est écrit dans aucun document :
        c'est une conséquence obtenue, pas relevée. C'est la seule ligne de cette
        console qui ressemble à du raisonnement.
      </p>
      <p class="conso-usages__mot"><b>${
        echapper(phraseDesRaisonnements(chaines, idees))}</b></p>

      ${chaines.length ? `
        <ul class="forme-reference">
          ${chaines.slice(0, 20).map((une) => `
            <li class="forme-reference__ligne">
              <span class="forme-reference__quoi">
                <b>${echapper(phraseDunRaisonnement(une))}</b>
                <i>${echapper(`${une.pas} maillons`)}</i>
              </span>
              <span class="forme-reference__chiffres mono-small">${
                echapper(`${compteDit(une.affirmations)} affirmations`)}</span>
              ${/*
                **Le maillon le plus faible, et on le dit.** Une chaîne n'est pas
                mieux attestée que le lien qui l'est le moins ; annoncer le
                meilleur donnerait une assise qu'elle n'a pas (règle 12).
              */""}
              <span class="forme-reference__sur mono-small">${
                echapper(`au plus faible : ${compteDit(une.chantiers)} chantier${
                  une.chantiers > 1 ? "s" : ""}`)}</span>
            </li>
          `).join("")}
        </ul>
      ` : ""}
    </section>

    ${renderLeDetailDesLiaisons(liaisons, forme)}

    ${/*
      **De quoi emporter ce que l'écran montre.** Soixante lignes ne se
      comparent pas à l'œil, et l'on ne corrige pas un découpage qu'on ne peut
      pas étaler côte à côte. L'export passe par une porte fermée par défaut :
      des comptes, des mots de liaison et des termes partagés par au moins deux
      chantiers — jamais une phrase de chantier.
    */""}
    <section class="conso-usages">
      <h3 class="conso-usages__titre">Emporter ce qui est mesuré</h3>
      <p class="conso-usages__mot">${echapper(phraseDeLexport({
        idees, mesure, forme, liaisons, raisonnements: chaines }))}</p>
      <div class="conso-export">
        ${renderBoutonCopier({ cible: "les-idees", className: "conso-export__copier",
          titre: "Copier le JSON dans le presse-papiers" })}
        <a class="gh-btn conso-export__fichier" href="#" data-export-idees
          download="${echapper(leNomDuFichier())}">Exporter en JSON</a>
      </div>
    </section>
  `;
}

/**
 * La tête d'une rubrique : son nom, et la question à laquelle elle répond.
 *
 * **La question, pas le nom de la table.** La console posait sept blocs à la
 * suite sans rien pour dire lequel répondait à quoi — on faisait défiler
 * jusqu'à trouver, et l'on finissait par ne plus regarder.
 */
function renderLaTeteDeLaRubrique(cle) {
  const rubrique = laRubriqueDite(cle);

  return `
    ${renderTitreDEcranHtml({ titre: rubrique.libelle, className: "conso-rubrique__tete" })}
    <p class="conso-rubrique__question">${echapper(rubrique.question)}</p>
    <p class="conso-rubrique__dit">${echapper(rubrique.explication)}</p>
  `;
}

function renderTout(comptes) {
  const dit = phraseDuGisement(comptes);
  const depuis = leJour(comptes?.depuis);
  const jusqua = leJour(comptes?.jusqua);

  return `
    <section class="conso-usages">
      ${dit ? `<p class="conso-usages__mot">${echapper(dit)}</p>` : ""}
      ${depuis && jusqua
        ? `<p class="conso-usages__mot">${depuis === jusqua
            ? `Déposés le ${echapper(depuis)}.`
            : `Déposés du ${echapper(depuis)} au ${echapper(jusqua)}.`}</p>`
        : ""}
      <p class="conso-usages__mot"><b>${echapper(phraseDeCeQueCaPermet(comptes))}</b></p>
      ${comptes?.deposants
        ? `<p class="conso-usages__mot">${echapper(
            `${compteDit(comptes.deposants)} ${comptes.deposants > 1
              ? "personnes ont déposé" : "personne a déposé"}.`)}</p>`
        : ""}
    </section>

    <section class="conso-usages">
      <h3 class="conso-usages__titre">Combien de chantiers portent assez de matière</h3>
      <p class="conso-usages__mot">
        Le total ne dit rien : la prédiction se nourrit de <b>suites</b>, et une
        suite se lit dans un chantier, pas en travers de mille. Le seuil de
        ${ASSEZ_DE_MATIERE} messages est une hypothèse déclarée, pas une mesure —
        elle vient de ce qu'en dessous, on n'aurait même pas de quoi vérifier si
        l'on prédit bien.
      </p>
      ${renderLaRepartition(comptes) || `<p class="forme-manques">Aucun chantier ne porte de mail.</p>`}
    </section>

  `;
}

/** Ce qu'on dit quand une lecture n'a pas répondu. Jamais « il n'y a rien » (règle 5). */
function renderPasLu(quoi, lesquels) {
  return `<section class="conso-usages"><p class="forme-manques">
    ${echapper(quoi)} n'${echapper(lesquels)} pas pu être lus. Ce n'est pas qu'il n'y
    en a aucun : on ne sait pas lesquels il y a.</p></section>`;
}

/**
 * La console, **une rubrique à la fois**.
 *
 * ## Le défaut que cela répare
 *
 * Elle posait sept blocs à la suite sur une seule page : les comptes, la
 * répartition, la reconnaissance, deux tables d'enchaînements, les sujets, et
 * ce qui n'est pas fait.
 *
 * > « L'affichage est laborieux, trop d'informations sur la même page. »
 *
 * On ne lit pas sept blocs : on fait défiler jusqu'à trouver, et l'on finit par
 * ne plus regarder du tout.
 *
 * ## Et on ne demande que ce qu'on montre
 *
 * Chaque rubrique a sa lecture. Les cinq partaient ensemble à l'ouverture —
 * cinq requêtes lourdes dont quatre pour des blocs qu'on ne regarderait pas.
 *
 * @param {HTMLElement} hote où dessiner
 * @param {string} cle la rubrique à montrer (`les-rubriques-de-la-console.js`)
 */
export async function monterLeCarburant(hote, cle = LE_CARBURANT) {
  const ou = hote?.querySelector?.("#carburantHote");
  if (!ou) return;

  const rubrique = laRubriqueDite(cle);
  ou.innerHTML = `${renderLaTeteDeLaRubrique(rubrique.cle)}
    <section class="conso-usages"><p class="conso-usages__mot">Lecture…</p></section>`;

  const corps = await leCorpsDeLaRubrique(rubrique.cle);

  // **Une rubrique qu'on a quittée pendant la lecture ne s'écrit pas.** Deux
  // clics rapides lançaient deux lectures, et la plus lente écrasait la plus
  // récente : on lisait les domaines sous le titre des sujets.
  if (ou.dataset.rubrique && ou.dataset.rubrique !== rubrique.cle) return;

  ou.innerHTML = `${renderLaTeteDeLaRubrique(rubrique.cle)}${corps}`;
  brancherLexport(ou);
}

/**
 * Ce que l'export emportera, composé au moment du rendu.
 *
 * Il vit ici, et non dans le DOM : un JSON de deux cents lignes dans un
 * attribut `data-` serait écrit dans la page, échappé, puis relu — trois
 * occasions de ne plus dire la même chose que l'écran (règle 4).
 */
let cequOnEmporte = null;

/**
 * Le bouton de copie et le lien de téléchargement.
 *
 * **Le fichier se fabrique au clic**, pas au rendu : une adresse `blob:` créée
 * à chaque affichage de la rubrique resterait en mémoire du navigateur sans que
 * personne ne la demande jamais.
 */
function brancherLexport(ou) {
  brancherLesBoutonsCopier(ou, {
    texteDe: () => cequOnEmporte ? lexportEnJson(cequOnEmporte) : ""
  });

  const lien = ou.querySelector("[data-export-idees]");
  if (!lien) return;

  lien.addEventListener("click", (evenement) => {
    if (!cequOnEmporte) return;
    evenement.preventDefault();

    const fichier = new Blob([lexportEnJson(cequOnEmporte)], { type: "application/json" });
    const adresse = URL.createObjectURL(fichier);
    const emporte = document.createElement("a");
    emporte.href = adresse;
    emporte.download = leNomDuFichier();
    emporte.click();
    // Rendue tout de suite : le navigateur a déjà le contenu, et une adresse
    // gardée retient le fichier entier en mémoire jusqu'à la fermeture.
    URL.revokeObjectURL(adresse);
  });
}

/** Ce qu'une rubrique lit, et ce qu'elle en dessine. */
async function leCorpsDeLaRubrique(cle) {
  if (cle === "manques") return renderCeQuiNestPasFait();

  if (cle === "reconnaissance") {
    const lignes = await lesDomainesDuSysteme();
    return lignes === null
      ? renderPasLu("Les domaines", "ont")
      : renderLesDomaines(lesDomainesRanges(lignes));
  }

  if (cle === "idees") {
    const [lignes, mesure, liaisons, forme] = await Promise.all([
      lesIdeesDuSysteme(), laMesureDesIdees(), leDetailDesLiaisons(), laFormeDesAffirmations()
    ]);
    if (lignes === null) return renderPasLu("Les idées", "ont");

    const idees = lesIdeesRangees(lignes);
    // Ce que l'export emportera, composé une seule fois : le recomposer au
    // clic aurait pu emporter autre chose que ce qui est à l'écran (règle 4).
    cequOnEmporte = { idees, mesure, forme, liaisons, raisonnements: lesRaisonnements(idees) };
    return renderLesIdees(lignes, mesure, liaisons, forme, cequOnEmporte.raisonnements);
  }

  if (cle === "sujets") {
    const [sujets, mesure] = await Promise.all([lesSujetsDuSysteme(), laMesureDesSujets()]);
    return sujets === null ? renderPasLu("Les sujets", "ont") : renderLesSujets(sujets, mesure);
  }

  if (cle === "prediction") {
    const [couples, couplesDeSujets, sujets] = await Promise.all([
      lesEnchainementsDuSysteme(), lesEnchainementsDesSujets(), lesSujetsDuSysteme()
    ]);

    const desDomaines = couples === null
      ? renderPasLu("Les enchaînements", "ont")
      : renderLesEnchainements(lesEnchainements(couples));

    const desSujets = couplesDeSujets === null
      ? renderPasLu("Les enchaînements de sujets", "ont")
      // **Le même module de lecture que pour les domaines.** Le classement, la
      // borne basse et la phrase de bilan ne se refont pas ici : une seconde
      // façon de pondérer finirait par ne pas dire la même chose (règle 4).
      : renderLesEnchainements(lesEnchainements(couplesDeSujets), {
        titre: "La prédiction, portée sur les sujets",
        mot: "Le même calcul, sur les sujets au lieu des huit domaines. C'est ici"
          + " que se lit « après une question de nappe, une question de"
          + " cuvelage » — là où les domaines ne savent dire que « après le sol,"
          + " la structure », ce que tout le monde sait déjà."
          + " Ce qui est montré gagne quelque chose sur la simple fréquence du"
          + " terme qui suit : une règle à 100 % dont le terme arrive de toute"
          + " façon n'apprend rien, et n'est plus comptée.",
        // Un sujet s'écrit comme les chantiers l'écrivent : aucun libellé de
        // taxonomie ne lui correspond.
        nommer: (un) => String(un ?? "")
      });

    return `${desSujets}${desDomaines}`;
  }

  const comptes = await lesComptesDuCarburant();
  // **Ne pas savoir n'est pas savoir qu'il n'y a rien** (règle 5). « Aucun mail
  // déposé » et « la base n'a pas répondu » mènent à des décisions opposées.
  return comptes === null
    ? `<section class="conso-usages"><p class="forme-manques">
        Les comptes n'ont pas pu être lus. Ce n'est pas qu'il n'y a rien : on ne
        sait pas ce qu'il y a.</p></section>`
    : renderTout(comptes);
}
