/**
 * La carte de l'année : cinquante-trois colonnes de sept carrés.
 *
 * ## Pourquoi cette forme-là
 *
 * Une colonne par semaine, une ligne par jour de la semaine. C'est la seule
 * disposition où l'on **voit un rythme** : les lignes du haut et du bas sont le
 * week-end, et une bande sombre en bas dit d'un coup d'œil qu'on ne travaille
 * pas le dimanche. Un ruban de 365 carrés à la file ne dirait rien de cela.
 *
 * ## Lundi en haut
 *
 * La semaine ISO, celle du calendrier français — comme `activite-des-projets.js`
 * la découpe déjà. Commencer au dimanche décalerait toute la carte d'un cran, et
 * rien à l'écran ne le montrerait.
 *
 * ## Les teintes vivent dans la feuille de style
 *
 * Le dessin pose un `data-teinte`, la feuille donne la couleur. Un vert écrit
 * ici serait un second vert à retoucher le jour où celui de l'application change
 * (règle 4).
 *
 * ## Elle est pure
 *
 * On lui donne des jours, elle rend du balisage. C'est ce qui permet de vérifier
 * qu'un jour chargé n'a pas la teinte d'un jour calme — et qu'une année qu'on
 * n'a pas lue ne dessine pas une grille vide.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { CE_QUON_COMPTE, TEINTES, phraseDeLAnnee } from "../../services/mon-annee-de-travail.js";

const MOIS = [
  "janv.", "févr.", "mars", "avril", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc."
];

/** Ce qu'on dit quand on n'a pas pu lire. */
export const ANNEE_NON_LUE = "Votre année n'a pas pu être lue.";

/** Le jour de la semaine, lundi = 0. */
function rangDansLaSemaine(jour) {
  return (new Date(`${jour}T00:00:00Z`).getUTCDay() + 6) % 7;
}

/**
 * Les jours rangés en colonnes de semaine.
 *
 * La première colonne est **trouée en haut** quand la fenêtre ne commence pas un
 * lundi : la boucher en décalant les jours ferait passer un mercredi pour un
 * lundi, et la carte mentirait sur le rythme — ce qu'elle existe pour montrer.
 */
export function colonnesDeLAnnee(jours = []) {
  const colonnes = [];
  let courante = null;

  for (const jour of Array.isArray(jours) ? jours : []) {
    const rang = rangDansLaSemaine(jour.jour);
    if (!courante || rang === 0) {
      courante = Array.from({ length: 7 }, () => null);
      colonnes.push(courante);
    }
    courante[rang] = jour;
  }

  return colonnes;
}

/**
 * Où chaque mois commence, en numéro de colonne.
 *
 * Un mois dont la première semaine est déjà occupée par le précédent n'écrit pas
 * son nom : deux étiquettes sur la même colonne se chevauchent, et l'on ne sait
 * plus laquelle va où.
 */
export function etiquettesDesMois(colonnes = []) {
  const vues = new Set();
  const etiquettes = [];

  (Array.isArray(colonnes) ? colonnes : []).forEach((colonne, rang) => {
    const premier = colonne.find(Boolean);
    if (!premier) return;

    const mois = premier.jour.slice(0, 7);
    if (vues.has(mois)) return;
    vues.add(mois);

    // La première colonne porte souvent un mois déjà entamé : son étiquette
    // dirait « septembre » au-dessus de trois jours de septembre, et le vrai
    // septembre, onze mois plus loin, n'en aurait plus.
    if (rang === 0) return;

    etiquettes.push({ colonne: rang, dit: MOIS[Number(premier.jour.slice(5, 7)) - 1] ?? "" });
  });

  return etiquettes;
}

/** Ce qu'on lit au survol d'un carré. */
function auSurvol(jour) {
  const quand = new Date(`${jour.jour}T00:00:00Z`)
    .toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  if (!jour.combien) return `Aucun geste le ${quand}`;
  return `${jour.combien === 1 ? "1 geste" : `${jour.combien} gestes`} le ${quand}`;
}

/**
 * La carte entière.
 *
 * @param {object|null} annee ce que `monAnneeDeTravail` rend — `null` : pas lue
 * @returns {string}
 */
export function renderCarteDeLAnnee(annee = null) {
  if (!annee) {
    // Une grille vide dirait « je n'ai rien fait de l'année », ce qui est une
    // information — et fausse (règle 5).
    return `<div class="annee-carte annee-carte--muette">${escapeHtml(ANNEE_NON_LUE)}</div>`;
  }

  const colonnes = colonnesDeLAnnee(annee.jours);
  const etiquettes = new Map(etiquettesDesMois(colonnes).map(({ colonne, dit }) => [colonne, dit]));

  const grille = colonnes.map((colonne, rang) => `
    <div class="annee-carte__semaine">
      <span class="annee-carte__mois">${escapeHtml(etiquettes.get(rang) ?? "")}</span>
      ${colonne.map((jour) => (jour
        ? `<span class="annee-carte__jour" data-teinte="${jour.teinte}"
             title="${escapeHtml(auSurvol(jour))}"></span>`
        : `<span class="annee-carte__jour annee-carte__jour--hors"></span>`)).join("")}
    </div>
  `).join("");

  const legende = Array.from({ length: TEINTES + 1 }, (_, teinte) =>
    `<span class="annee-carte__jour" data-teinte="${teinte}"></span>`).join("");

  return `
    <div class="annee-carte">
      <div class="annee-carte__tete">
        <b>${escapeHtml(phraseDeLAnnee(annee))}</b>
        <span class="annee-carte__quoi">${escapeHtml(CE_QUON_COMPTE)}</span>
      </div>
      <div class="annee-carte__grille">${grille}</div>
      <div class="annee-carte__pied">
        <span>La teinte dit où ce jour se place parmi vos niveaux de charge.</span>
        <span class="annee-carte__legende">Moins ${legende} Plus</span>
      </div>
    </div>
  `;
}
