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
 * ## Trois noms de jour à gauche
 *
 * Sans eux, on voit un rythme sans savoir lequel : une bande sombre en bas peut
 * être le week-end ou deux jours de la semaine où l'on ne fait rien, et la carte
 * ne le dit pas. Trois suffisent — lundi, mercredi, vendredi — et une ligne sur
 * deux laissée vide se lit mieux que sept étiquettes serrées sur onze pixels.
 *
 * **Les sept lignes sont posées, y compris les muettes.** Ne rendre que les
 * trois nommées ferait remonter mercredi contre lundi, et les noms
 * désigneraient les mauvaises lignes — un repère faux est pire que pas de
 * repère.
 *
 * Le nom entier et sa forme courte sont **tous deux dans le balisage**, et c'est
 * la feuille qui choisit. Le mettre dans le CSS par `content:` ferait vivre un
 * nom de jour à deux endroits (règle 10), et le calculer en JavaScript
 * demanderait de mesurer à chaque redessin ce qu'une requête de média sait déjà.
 *
 * ## On arrive à droite, sur les mois récents
 *
 * Douze mois ne tiennent pas toujours dans la carte, et elle défile. Arriver à
 * gauche mettrait sous les yeux septembre dernier — c'est-à-dire le mois qu'on
 * regarde le moins. **Le défilement se pose donc à la fin**, sur les semaines
 * qui viennent de passer.
 *
 * Et il **se retient** : l'écran d'accueil se redessine à chaque frappe dans sa
 * recherche, et sauter à droite à chaque touche arracherait la carte des mains
 * de qui est en train de la parcourir. C'est le même défaut que le curseur qui
 * repart au début d'un champ, et il se corrige de la même façon.
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

/**
 * Les jours de la semaine qu'on nomme, et à quelle ligne.
 *
 * Un sur deux : sept étiquettes sur des lignes de onze pixels se touchent, et
 * l'on ne lit plus laquelle va où. Trois repères suffisent à situer les quatre
 * autres.
 */
export const JOURS_NOMMES = [
  { rang: 0, court: "lund.", entier: "lundi" },
  { rang: 2, court: "merc.", entier: "mercredi" },
  { rang: 4, court: "vend.", entier: "vendredi" }
];

/**
 * Où l'on regardait dans la carte, entre deux rendus.
 *
 * `null` : on n'a pas encore regardé, et la carte s'ouvre à droite. Le retenir
 * ici plutôt que dans l'écran évite qu'un second écran qui monterait la même
 * carte ait à savoir qu'elle défile.
 */
let ouLOnRegardait = null;

/**
 * Oublier où l'on regardait.
 *
 * L'écran l'appelle en se montant : revenir sur l'accueil, c'est y arriver, et
 * l'on y arrive sur les semaines récentes. Sans cela, une position gardée d'une
 * visite à l'autre ferait rouvrir l'accueil au milieu de février.
 */
export function oublierOuLOnRegardait() {
  ouLOnRegardait = null;
}

/**
 * Poser le défilement, et le suivre.
 *
 * À la fin la première fois, là où l'on était ensuite. Le rendu remplace le
 * cadre à chaque fois : la position ne survit pas toute seule, et c'est pour
 * cela qu'on la retient.
 */
export function brancherLaCarteDeLAnnee(racine) {
  const defilant = racine?.querySelector?.(".annee-carte__semaines");
  if (!defilant) return;

  const fin = Math.max(0, defilant.scrollWidth - defilant.clientWidth);
  defilant.scrollLeft = ouLOnRegardait === null ? fin : Math.min(ouLOnRegardait, fin);

  defilant.addEventListener("scroll", () => {
    ouLOnRegardait = defilant.scrollLeft;
  });
}

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

  // Les sept lignes, y compris les muettes : ne rendre que les trois nommées
  // ferait remonter mercredi contre lundi, et les noms désigneraient les
  // mauvaises lignes.
  const nomsDesJours = Array.from({ length: 7 }, (_, rang) => {
    const nomme = JOURS_NOMMES.find((jour) => jour.rang === rang);
    if (!nomme) return `<span class="annee-carte__nom"></span>`;

    return `
      <span class="annee-carte__nom">
        <span class="annee-carte__nom-court">${escapeHtml(nomme.court)}</span>
        <span class="annee-carte__nom-entier">${escapeHtml(nomme.entier)}</span>
      </span>
    `;
  }).join("");

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
      ${/*
        **La colonne des noms est hors du défilement.** Dans le cadre qui défile,
        elle partirait avec les semaines dès le premier geste de la souris — et
        l'on se retrouverait devant une grille anonyme, ce que les noms existent
        pour éviter.
      */""}
      <div class="annee-carte__grille">
        <div class="annee-carte__jours">${nomsDesJours}</div>
        <div class="annee-carte__semaines">${grille}</div>
      </div>
      <div class="annee-carte__pied">
        <span>La teinte dit où ce jour se place parmi vos niveaux de charge.</span>
        <span class="annee-carte__legende">Moins ${legende} Plus</span>
      </div>
    </div>
  `;
}
