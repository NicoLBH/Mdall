/**
 * Ce que l'IA a consommé, à l'écran.
 *
 * ## Un seul rendu pour deux endroits
 *
 * *Profil › Factures et abonnement* montre ce que la personne a consommé, tous
 * projets confondus. *Projet › Indicateurs* montre ce qu'un projet a consommé,
 * tous collaborateurs confondus, et la part de celui qui regarde.
 *
 * Ce sont **les mêmes chiffres présentés autour de deux questions** : les
 * dessiner deux fois les ferait diverger au premier ajustement (règle 4). Ce
 * fichier rend les briques ; chaque écran les assemble.
 *
 * ## La courbe est celle qui existe déjà
 *
 * `utils/svg-line-chart.js`, celle de l'évolution des sujets. Un second
 * composant de courbe se mettrait à ne pas ressembler au premier — axes,
 * grilles, survol — et l'on saurait, en regardant deux écrans, qu'ils n'ont pas
 * été faits ensemble.
 *
 * ## Ce que l'écran promet, et ce qu'il ne promet pas
 *
 * Le montant est **une estimation**, et l'écran le dit. Elle part de jetons
 * réels et d'un tarif public ; ce n'est pas la facture, qui peut porter des
 * remises, des paliers ou des taxes. Présenter une estimation comme un montant
 * dû serait la précision fausse que Mdall refuse partout ailleurs.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { renderSpinnerHtml } from "../ui/spinner.js";
import { getNiceChartTicks, renderSvgLineChart } from "../../utils/svg-line-chart.js";
import {
  CHANGE, COMBIEN_DE_COURBES, PAS, TARIFS, enEuros, enJetons, lEvolutionDesPostes,
  leTitreDuPas, nomDeLaNature, parNature, parPas, parProjet, tarifDuModele, totalDesAppels
} from "../../services/consommation-ia.js";
import { renderLeChoixDuPas } from "../ui/le-choix-de-la-periode.js";
import { phraseDesRefus, refusParMotif } from "../../services/journal-des-refus.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * La carte des jetons et du montant.
 *
 * Elle donne **les deux sens séparément** avant leur somme : ils ne coûtent pas
 * le même prix — la sortie vaut quatre fois l'entrée — et un total de jetons
 * seul ne laisse pas comprendre d'où vient le montant.
 */
export function renderCarteDeConsommation({ total, titre = "Consommation", detail = "" } = {}) {
  const compte = total ?? totalDesAppels([]);

  return `
    <section class="conso-carte">
      <header class="conso-carte__tete">
        <h3 class="conso-carte__titre">${escapeHtml(titre)}</h3>
        ${detail ? `<p class="conso-carte__detail">${escapeHtml(detail)}</p>` : ""}
      </header>

      <div class="conso-carte__chiffres">
        ${renderChiffre("Jetons entrés", enJetons(compte.entree))}
        ${renderChiffre("Jetons sortis", enJetons(compte.sortie))}
        ${renderChiffre("Total", enJetons(compte.jetons))}
        ${renderChiffre("Estimation", enEuros(compte.euros), "conso-chiffre--montant")}
      </div>

      <footer class="conso-carte__pied">
        <span class="conso-carte__appels">${escapeHtml(
          compte.appels === 1 ? "1 appel" : `${compte.appels} appels`
        )}</span>
        ${renderReserves(compte)}
      </footer>
    </section>
  `;
}

function renderChiffre(intitule, valeur, className = "") {
  return `
    <div class="conso-chiffre ${className}">
      <span class="conso-chiffre__intitule">${escapeHtml(intitule)}</span>
      <span class="conso-chiffre__valeur">${escapeHtml(valeur)}</span>
    </div>
  `;
}

/**
 * **De combien on se trompe, quand on se trompe.**
 *
 * Un appel dont le fournisseur n'a pas annoncé le décompte, ou dont le modèle
 * n'a pas de tarif connu, manque au total. Le taire donnerait un montant rond
 * qu'on ne peut pas défendre ; le dire, c'est nommer ce qu'on ignore (règle 5).
 */
function renderReserves(total) {
  const reserves = [];
  if (total.sansDecompte > 0) {
    reserves.push(`${total.sansDecompte} appel(s) sans décompte du fournisseur : non comptés.`);
  }
  if (total.sansTarif > 0) {
    reserves.push(`${total.sansTarif} appel(s) sur un modèle sans tarif connu : jetons comptés, montant non.`);
  }

  if (reserves.length === 0) return "";
  return `<span class="conso-carte__reserve">${escapeHtml(reserves.join(" "))}</span>`;
}

/**
 * La courbe de la période, au pas qu'on a choisi.
 *
 * **En euros, et non en jetons.** C'est la question qu'on se pose devant cet
 * écran ; la courbe des jetons y répondrait de travers, puisqu'un jeton de
 * sortie coûte quatre fois un jeton d'entrée.
 *
 * ## Le pas se choisit à côté de la courbe
 *
 * Le bouton gris est dans l'en-tête de ce bloc, et non dans la ligne du titre de
 * l'écran : c'est la courbe qu'il change, pas l'écran entier. Posé en haut, il se
 * lirait comme un second choix de période, et l'on ne saurait plus lequel agit
 * sur quoi.
 *
 * @param {object[]} points ce que `parPas` a rendu
 * @param {object} [quoi]
 * @param {string} [quoi.titre]
 * @param {string} [quoi.pas] pour que le bouton dise lequel est posé
 * @param {boolean} [quoi.avecLeChoix] dessiner le bouton du pas
 */
export function renderLaCourbe(points = [], {
  titre = "", pas = "", avecLeChoix = false
} = {}) {
  const liste = Array.isArray(points) ? points : [];
  const tete = `
    <header class="conso-courbe__tete">
      ${titre ? `<h3 class="conso-courbe__titre">${escapeHtml(titre)}</h3>` : ""}
      ${avecLeChoix ? renderLeChoixDuPas({ pas }) : ""}
    </header>`;

  if (liste.length === 0) {
    return `<section class="conso-courbe">${tete}${
      renderRienADire("Aucun appel sur cette période.")}</section>`;
  }

  const valeurs = liste.map((un) => Number(un?.euros) || 0);
  const maximum = Math.max(...valeurs, 0);
  // Une période sans le moindre appel donnerait un axe de 0 à 0 : la courbe se
  // plaquerait sur le bord et l'on ne saurait pas si elle est vide ou cassée.
  const yTicks = getNiceChartTicks(maximum > 0 ? maximum : 0.01, 4);

  return `
    <section class="conso-courbe">
      ${tete}
      ${renderSvgLineChart({
        width: 1012,
        height: 340,
        interactive: true,
        xDomain: [0, Math.max(1, liste.length - 1)],
        yDomain: [0, yTicks[yTicks.length - 1] || 1],
        xTicks: liste.map((_, rang) => rang),
        yTicks,
        // Ce que le pas sait écrire de lui-même : le jour du mois, le mois en
        // trois lettres, l'année. La date entière, répétée trente fois, ne
        // tient pas sous un axe et ne dit rien de plus.
        xTickFormatter: (tick) => texte(liste[Number(tick)]?.dit),
        yTickFormatter: (valeur) => enEuros(valeur),
        series: [{
          label: "Estimation par pas",
          points: valeurs.map((valeur, rang) => ({ x: rang, y: valeur })),
          fill: true
        }]
      })}
    </section>
  `;
}

/**
 * L'évolution de quelques postes sur la période — **l'affichage secondaire**.
 *
 * ## Ce que la jauge ne dit pas
 *
 * « La lecture de PDF fait 60 % de la facture » dit où part l'argent, jamais si
 * cela monte. Ce sont deux décisions différentes : un poste qui pèse et qui
 * baisse se laisse tranquille ; un poste qui pèse peu et qui triple tous les mois
 * est le prochain problème.
 *
 * ## Quatre courbes au plus, et on le dit
 *
 * La feuille de style déclare quatre couleurs de série ; une cinquième prendrait
 * celle du texte et se lirait comme un défaut d'affichage. C'est aussi le bon
 * nombre : douze courbes sur un même axe ne se distinguent pas, et une évolution
 * qu'on ne peut pas lire ne vaut pas mieux que pas d'évolution (règle 12).
 *
 * **Rien quand il n'y a qu'un pas.** Un point unique dessine une courbe qui ne
 * monte ni ne descend — la réponse la plus trompeuse possible (règle 5).
 */
export function renderLevolutionDesPostes(postes = [], { titre = "Leur évolution" } = {}) {
  const liste = (Array.isArray(postes) ? postes : []).filter((un) => un?.points?.length > 1);
  if (liste.length === 0) return "";

  const maximum = Math.max(...liste.flatMap((un) => un.points.map((pas) => Number(pas?.euros) || 0)), 0);
  const yTicks = getNiceChartTicks(maximum > 0 ? maximum : 0.01, 4);
  const pas = liste[0].points;

  return `
    <section class="conso-evolution">
      <h4 class="conso-evolution__titre">${escapeHtml(titre)}</h4>
      <p class="conso-evolution__mot mono-small">${escapeHtml(
        liste.length >= COMBIEN_DE_COURBES
          ? `Les ${COMBIEN_DE_COURBES} plus coûteux de la période. Ce qui monte coûtera plus cher au prochain pas.`
          : "Ce qui monte coûtera plus cher au prochain pas."
      )}</p>
      ${renderSvgLineChart({
        width: 1012,
        height: 260,
        interactive: true,
        xDomain: [0, Math.max(1, pas.length - 1)],
        yDomain: [0, yTicks[yTicks.length - 1] || 1],
        xTicks: pas.map((_, rang) => rang),
        yTicks,
        xTickFormatter: (tick) => texte(pas[Number(tick)]?.dit),
        yTickFormatter: (valeur) => enEuros(valeur),
        series: liste.map((un) => ({
          label: un.nom,
          points: un.points.map((etape, rang) => ({ x: rang, y: Number(etape?.euros) || 0 }))
        }))
      })}
    </section>
  `;
}

/**
 * La répartition par projet.
 *
 * Un tableau et non un camembert : on compare des montants, et **l'œil compare
 * mal des angles**. On veut aussi lire les nombres, ce qu'un camembert oblige à
 * poser en légende.
 */
export function renderRepartitionParProjet(lignes = [], {
  titre = "Par projet", evolution = []
} = {}) {
  const liste = Array.isArray(lignes) ? lignes : [];
  if (liste.length === 0) return renderRienADire("Aucun projet n'a encore consommé.");

  const total = liste.reduce((somme, ligne) => somme + (Number(ligne?.euros) || 0), 0);

  return `
    <section class="conso-repartition">
      <h3 class="conso-repartition__titre">${escapeHtml(titre)}</h3>
      <ul class="conso-repartition__liste">
        ${liste.map((ligne) => {
          const part = total > 0 ? (Number(ligne.euros) || 0) / total : 0;
          return `
            <li class="conso-repartition__ligne">
              <span class="conso-repartition__nom">${escapeHtml(ligne.nom)}</span>
              <span class="conso-repartition__jauge" aria-hidden="true">
                <span class="conso-repartition__part" style="width:${(part * 100).toFixed(1)}%"></span>
              </span>
              <span class="conso-repartition__jetons mono-small">${escapeHtml(enJetons(ligne.jetons))}</span>
              <span class="conso-repartition__euros mono-small">${escapeHtml(enEuros(ligne.euros))}</span>
            </li>
          `;
        }).join("")}
      </ul>
      ${renderLevolutionDesPostes(evolution, { titre: "L'évolution des chantiers" })}
    </section>
  `;
}

/**
 * La répartition **par nature d'appel** — ce qui permet de décider.
 *
 * Un total par projet dit *combien*, jamais *pour quoi faire*. Or on ne change
 * pas ses habitudes en apprenant qu'un chantier coûte douze euros ; on les
 * change en apprenant que dix de ces douze partent dans la lecture de PDF. Et
 * l'inverse vaut autant : voir que la rédaction des titres coûte trois centimes
 * dispense de s'en priver.
 *
 * C'est donc **le premier bloc de l'écran**, avant la courbe et avant les
 * projets : c'est la seule question dont la réponse change quelque chose.
 *
 * Chaque ligne dit ce que l'appel **faisait**, pas quelle fonction s'exécutait :
 * le nom technique n'apprend rien sur le geste qu'on pourrait faire autrement.
 */
export function renderRepartitionParNature(lignes = [], {
  titre = "Par usage", evolution = []
} = {}) {
  const liste = Array.isArray(lignes) ? lignes : [];
  if (liste.length === 0) return "";

  const total = liste.reduce((somme, ligne) => somme + (Number(ligne?.euros) || 0), 0);

  return `
    <section class="conso-usages">
      <h3 class="conso-usages__titre">${escapeHtml(titre)}</h3>
      <p class="conso-usages__mot">
        Du plus coûteux au moins. C'est ici qu'on voit quoi faire autrement — et quoi
        continuer sans s'en priver.
      </p>
      <ul class="conso-usages__liste">
        ${liste.map((ligne) => {
          const part = total > 0 ? (Number(ligne.euros) || 0) / total : 0;
          return `
            <li class="conso-usage">
              <div class="conso-usage__tete">
                <span class="conso-usage__nom">${escapeHtml(ligne.nom)}</span>
                <span class="conso-usage__euros mono-small">${escapeHtml(enEuros(ligne.euros))}</span>
                <span class="conso-usage__part mono-small">${escapeHtml(
                  total > 0 ? `${Math.round(part * 100)} %` : "—"
                )}</span>
              </div>
              <div class="conso-usage__jauge" aria-hidden="true">
                <span class="conso-usage__barre" style="width:${(part * 100).toFixed(1)}%"></span>
              </div>
              <div class="conso-usage__pied mono-small">
                <span>${escapeHtml(ligne.quoi || "")}</span>
                <span>${escapeHtml(
                  `${ligne.appels === 1 ? "1 appel" : `${ligne.appels} appels`} · ${enJetons(ligne.jetons)} jetons`
                )}</span>
              </div>
            </li>
          `;
        }).join("")}
      </ul>
      ${renderLevolutionDesPostes(evolution, { titre: "L'évolution des usages" })}
    </section>
  `;
}

/**
 * Ce qui n'a pas abouti — le pendant du compteur, et il manquait.
 *
 * ## Pourquoi c'est ici, à côté de ce qui a coûté
 *
 * Un écran qui ne montre que ce qui a réussi donne une vue fausse du mois :
 * trois lectures de rapport qui n'ont jamais abouti ne coûtent rien et ont
 * pourtant fait perdre une matinée. Et surtout, chacun voyait sa propre panne,
 * une seconde, dans son coin — personne ne savait qu'elle était arrivée dix
 * fois à quatre personnes le même matin.
 *
 * ## Le genre, jamais le texte
 *
 * Le journal ne garde que huit genres de panne, un nom de fonction et un
 * instant (`services/journal-des-refus.js`). Il n'y a donc rien à filtrer ici :
 * ce qu'on affiche est tout ce qui existe.
 *
 * ## Et le remède, sur la même ligne
 *
 * Un tableau de pannes sans geste à faire se subit. « Le fournisseur a demandé
 * de revenir plus tard » se répare en attendant ; « la session ne valait plus »
 * se répare en se reconnectant. Le dire là où on le lit évite de le chercher.
 *
 * **Zéro ne s'écrit pas**, et `null` non plus : une période sans panne et une
 * période qu'on n'a pas pu lire ne se disent pas pareil (règle 5).
 */
export function renderCeQuiNAPasAbouti(refus = null, { titre = "Ce qui n'a pas abouti" } = {}) {
  if (refus === null) {
    return `<section class="conso-refus conso-refus--muette">
      <h3 class="conso-refus__titre">${escapeHtml(titre)}</h3>
      <p class="conso-refus__mot">Le journal des pannes n'a pas pu être lu. Ce n'est pas
      « aucune panne » : c'est quelque chose qu'on ne sait pas.</p>
    </section>`;
  }

  const genres = refusParMotif(refus);
  if (!genres.length) return "";

  return `
    <section class="conso-refus">
      <h3 class="conso-refus__titre">${escapeHtml(titre)}</h3>
      <p class="conso-refus__mot">${escapeHtml(phraseDesRefus(refus))}. Rien du contenu
      n'est gardé : le journal note le genre de la panne, la fonction et l'instant.</p>
      <ul class="conso-refus__liste">
        ${genres.map((genre) => `
          <li class="conso-refus__ligne">
            <span class="conso-refus__combien mono-small">${escapeHtml(String(genre.combien))}</span>
            <span class="conso-refus__quoi">
              <b>${escapeHtml(genre.dit)}</b>
              <i>${escapeHtml(genre.remede)}</i>
            </span>
            <span class="conso-refus__ou mono-small">${escapeHtml(genre.fonctions.join(" · "))}</span>
          </li>
        `).join("")}
      </ul>
    </section>
  `;
}

/**
 * Le tarif retenu, en clair.
 *
 * **Un montant qu'on ne peut pas refaire est une rumeur** (c'est toute la
 * doctrine de la mémoire, et elle vaut ici). On donne donc le prix par million
 * de jetons, le change et la date du relevé : quelqu'un peut refaire le calcul.
 */
export function renderTarifApplique(modeles = []) {
  const liste = (Array.isArray(modeles) && modeles.length > 0 ? modeles : Object.keys(TARIFS))
    .map((model) => ({ model, tarif: tarifDuModele(model) }))
    .filter((entree) => entree.tarif);

  if (liste.length === 0) return "";

  return `
    <section class="conso-tarif">
      <h3 class="conso-tarif__titre">Le tarif appliqué</h3>
      <p class="conso-tarif__mot">
        Estimation à partir des jetons réellement consommés et du tarif public, par million de jetons.
        Ce n'est pas la facture : elle peut porter des remises, des paliers ou des taxes.
      </p>
      <ul class="conso-tarif__liste mono-small">
        ${liste.map(({ model, tarif }) => `
          <li>
            <span class="conso-tarif__modele">${escapeHtml(model)}</span>
            <span>entrée ${escapeHtml(tarif.entree.toFixed(2))} $ · sortie ${escapeHtml(tarif.sortie.toFixed(2))} $</span>
            <span class="conso-tarif__releve">relevé le ${escapeHtml(tarif.releveLe)}</span>
          </li>
        `).join("")}
      </ul>
      <p class="conso-tarif__change mono-small">
        Change retenu : 1 ${escapeHtml(CHANGE.depuis)} = ${escapeHtml(String(CHANGE.taux))} ${escapeHtml(CHANGE.vers)},
        relevé le ${escapeHtml(CHANGE.releveLe)}. Un taux figé : le coût d'un appel est celui qu'il avait
        quand il a eu lieu.
      </p>
    </section>
  `;
}

/**
 * Ce qu'on affiche quand la base n'a pas répondu.
 *
 * **Différent d'« aucun appel ».** Zéro euro sur un hoquet de réseau ferait
 * croire à une facture nulle, et l'on ne reviendrait pas vérifier (règle 5).
 */
export function renderLectureImpossible() {
  return `
    <section class="conso-vide conso-vide--echec">
      <p>La consommation n'a pas pu être lue.</p>
      <p class="conso-vide__aide">Ce n'est pas « aucune consommation » : on ne sait pas. Réessayez d'ici un instant.</p>
    </section>
  `;
}

/**
 * L'attente, avec **le spinner de l'application**.
 *
 * Une phrase seule — « Lecture en cours… » — ne bouge pas : on ne sait pas si
 * l'écran travaille ou s'il s'est arrêté là. Un rond qui tourne le dit sans
 * qu'on ait à l'écrire, et c'est celui que le reste de Mdall emploie déjà :
 * un second, dessiné pour cet écran, ne lui ressemblerait pas (règle 4).
 */
export function renderAttente(mot = "Lecture en cours") {
  return `
    <section class="conso-vide conso-vide--attente">
      ${renderSpinnerHtml({ label: mot, size: "md" })}
      <p>${escapeHtml(mot)}…</p>
    </section>
  `;
}

function renderRienADire(mot) {
  return `<section class="conso-vide"><p>${escapeHtml(mot)}</p></section>`;
}

/**
 * L'écran entier, tel que les deux endroits l'assemblent.
 *
 * **Le pas traverse tout.** La courbe, l'évolution des usages et celle des
 * chantiers se lisent au même pas : trois granularités sur un même écran se
 * compareraient de travers, et c'est le genre de faux rapprochement qu'on ne
 * voit pas en regardant.
 *
 * @param {object} options
 * @param {object[]|null} options.appels `null` quand la lecture a échoué
 * @param {object[]|null} [options.refus] le journal des pannes de la période,
 *   `null` quand on n'a pas pu le lire — ce qui n'est pas « aucune panne »
 * @param {{du: string, au: string}} options.bornes la fenêtre lue
 * @param {string} [options.pas] `jour`, `mois` ou `annee`
 * @param {boolean} [options.parProjets] montrer la répartition par projet
 * @param {boolean} [options.parUsages] montrer la répartition par usage
 * @param {(id: string) => string} [options.nomDuProjet]
 * @param {string} [options.enTeteHtml] une carte de plus, posée avant le total
 */
export function renderConsommation({
  appels = null, bornes = { du: "", au: "" }, pas = PAS.JOUR, parProjets = false,
  parUsages = true, nomDuProjet = null, titreDuTotal = "Ce mois-ci", detailDuTotal = "",
  enTeteHtml = "", refus = null
} = {}) {
  if (appels === null) return renderLectureImpossible();

  const fenetre = { pas, ...bornes };
  const total = totalDesAppels(appels);
  const points = parPas(appels, fenetre);
  const modeles = [...new Set(appels.map((appel) => texte(appel?.model)).filter(Boolean))];

  return `
    <div class="conso-ecran">
      ${enTeteHtml}
      ${renderCarteDeConsommation({ total, titre: titreDuTotal, detail: detailDuTotal })}
      ${/*
        **La répartition par usage n'est pas toujours possible.** La console lit
        la consommation d'un compte groupée par pas et par modèle : la nature de
        l'appel n'en fait pas partie, et la dessiner quand même donnait une seule
        barre, « inconnu — 100 % ». Une répartition sur une seule case inconnue
        n'apprend rien et se lit comme une panne (règle 12).
      */""}
      ${parUsages ? renderRepartitionParNature(parNature(appels), {
        evolution: lEvolutionDesPostes(appels, {
          ...fenetre,
          cleDuPoste: (appel) => texte(appel?.nature),
          nomDuPoste: nomDeLaNature
        })
      }) : ""}
      ${renderCeQuiNAPasAbouti(refus)}
      ${renderLaCourbe(points, { titre: leTitreDuPas(pas), pas, avecLeChoix: true })}
      ${parProjets ? renderRepartitionParProjet(parProjet(appels, nomDuProjet), {
        evolution: lEvolutionDesPostes(appels, {
          ...fenetre,
          cleDuPoste: (appel) => texte(appel?.projetId),
          nomDuPoste: (cle) => (cle
            ? (typeof nomDuProjet === "function" ? texte(nomDuProjet(cle)) : "") || cle
            : "Hors projet")
        })
      }) : ""}
      ${renderTarifApplique(modeles)}
    </div>
  `;
}
