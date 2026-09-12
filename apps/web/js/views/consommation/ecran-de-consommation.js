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
import { getNiceChartTicks, renderSvgLineChart } from "../../utils/svg-line-chart.js";
import {
  CHANGE, TARIFS, enEuros, enJetons, parJour, parNature, parProjet, tarifDuModele, totalDesAppels
} from "../../services/consommation-ia.js";

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
 * La courbe des jours du mois.
 *
 * **En euros, et non en jetons.** C'est la question qu'on se pose devant cet
 * écran ; la courbe des jetons y répondrait de travers, puisqu'un jeton de
 * sortie coûte quatre fois un jeton d'entrée.
 */
export function renderCourbeDesJours(jours = [], { titre = "" } = {}) {
  const liste = Array.isArray(jours) ? jours : [];
  if (liste.length === 0) return renderRienADire("Aucun appel sur cette période.");

  const valeurs = liste.map((jour) => Number(jour?.euros) || 0);
  const maximum = Math.max(...valeurs, 0);
  // Un mois sans le moindre appel donnerait un axe de 0 à 0 : la courbe se
  // plaquerait sur le bord et l'on ne saurait pas si elle est vide ou cassée.
  const yTicks = getNiceChartTicks(maximum > 0 ? maximum : 0.01, 4);

  return `
    <section class="conso-courbe">
      ${titre ? `<h3 class="conso-courbe__titre">${escapeHtml(titre)}</h3>` : ""}
      ${renderSvgLineChart({
        width: 1012,
        height: 340,
        interactive: true,
        xDomain: [0, Math.max(1, liste.length - 1)],
        yDomain: [0, yTicks[yTicks.length - 1] || 1],
        xTicks: liste.map((_, rang) => rang),
        yTicks,
        // Le jour du mois seul : la date entière, répétée trente fois, ne tient
        // pas sous un axe et ne dit rien de plus.
        xTickFormatter: (tick) => texte(liste[Number(tick)]?.jour).slice(8),
        yTickFormatter: (valeur) => enEuros(valeur),
        series: [{
          label: "Estimation par jour",
          points: valeurs.map((valeur, rang) => ({ x: rang, y: valeur })),
          fill: true
        }]
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
export function renderRepartitionParProjet(lignes = [], { titre = "Par projet" } = {}) {
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
export function renderRepartitionParNature(lignes = [], { titre = "Par usage" } = {}) {
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

function renderRienADire(mot) {
  return `<section class="conso-vide"><p>${escapeHtml(mot)}</p></section>`;
}

/**
 * L'écran entier, tel que les deux endroits l'assemblent.
 *
 * @param {object} options
 * @param {object[]|null} options.appels `null` quand la lecture a échoué
 * @param {string} options.mois `AAAA-MM`
 * @param {{du: string, au: string}} options.bornes
 * @param {boolean} [options.parProjets] montrer la répartition par projet
 * @param {(id: string) => string} [options.nomDuProjet]
 * @param {object} [options.enTete] une carte de plus, posée avant le total
 */
export function renderConsommation({
  appels = null, bornes = { du: "", au: "" }, parProjets = false, nomDuProjet = null,
  titreDuTotal = "Ce mois-ci", detailDuTotal = "", enTeteHtml = ""
} = {}) {
  if (appels === null) return renderLectureImpossible();

  const total = totalDesAppels(appels);
  const jours = parJour(appels, bornes);
  const modeles = [...new Set(appels.map((appel) => texte(appel?.model)).filter(Boolean))];

  return `
    <div class="conso-ecran">
      ${enTeteHtml}
      ${renderCarteDeConsommation({ total, titre: titreDuTotal, detail: detailDuTotal })}
      ${renderRepartitionParNature(parNature(appels))}
      ${renderCourbeDesJours(jours, { titre: "Consommation par jour" })}
      ${parProjets ? renderRepartitionParProjet(parProjet(appels, nomDuProjet)) : ""}
      ${renderTarifApplique(modeles)}
    </div>
  `;
}
