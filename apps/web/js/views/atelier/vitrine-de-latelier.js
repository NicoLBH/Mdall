/**
 * L'Atelier vu comme une vitrine, et non comme une liste.
 *
 * ## Ce que la barre latérale interdisait
 *
 * L'Atelier rangeait ses utilitaires dans un rail à gauche. À treize, cela
 * tenait. À deux cents, trois choses cassent :
 *
 *  - **il n'existe pas deux cents icônes distinctes** — au-delà de quelques
 *    dizaines, deux outils sans rapport portent le même pictogramme et l'icône
 *    cesse d'aider ;
 *  - **une liste de deux cents entrées ne se parcourt pas** — on ne trouve que
 *    ce qu'on savait déjà chercher ;
 *  - et surtout, **le rail occupe la gauche de l'écran**. Aucun utilitaire ne
 *    peut donc avoir sa propre barre latérale. Ce n'est pas une gêne de mise en
 *    page : c'est un plafond posé sur ce que chaque utilitaire pourra devenir.
 *
 * La vitrine lève les trois. Un utilitaire ouvert occupe **toute la largeur**
 * et fait ce qu'il veut de sa gauche.
 *
 * ## Ce qu'on cherche, et comment
 *
 * On cherche rarement par le nom. On cherche par un domaine (« incendie »),
 * par une donnée qu'on a (« altitude »), par une variable qu'on veut. La
 * recherche interroge donc tout ce que le catalogue sait d'une entrée, et pas
 * seulement son intitulé.
 *
 * ## Ce que la vitrine ne décide pas
 *
 * **Ce que contient le catalogue.** Il vit dans
 * `services/catalogue-de-latelier.js`, comme une donnée. Cet écran le lit, le
 * range et le dessine ; il n'en sait pas plus que ce qui s'affiche.
 *
 * **Comment on se rend sur un utilitaire.** Les fiches portent
 * `data-side-nav-target`, l'attribut que le routeur de panneaux de l'Atelier
 * lit déjà. Inventer ici un second chemin de navigation ferait deux mécaniques
 * pour un seul geste, et la seconde divergerait de la première (règle 4).
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { renderLightTabs } from "../ui/light-tabs.js";
import { renderSideNavGroup, renderSideNavItem } from "../ui/side-nav-layout.js";
import {
  ICONE_DU_RAYON, NOM_DU_RAYON, ajoutsRecents, chercherDansLatelier,
  rayonsDuCatalogue, vedettesDeLatelier
} from "../../services/catalogue-de-latelier.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Les deux façons de ranger ce qu'on n'a pas cherché. */
export const RANGEMENT = { RECOMMANDE: "recommande", RECENT: "recent" };

/**
 * L'initiale qui tient lieu d'icône.
 *
 * **Une lettre plutôt qu'un pictogramme**, et c'est un choix, pas un pis-aller :
 * on peut en produire deux cents qui se distinguent, ce qui n'est vrai d'aucun
 * jeu d'icônes. La couleur vient du nom, donc elle ne bouge jamais pour un même
 * utilitaire — c'est ce qui la rend reconnaissable.
 */
export function vignetteDeLUtilitaire(utilitaire = {}) {
  const nom = texte(utilitaire?.nom);
  const lettre = nom.slice(0, 1).toUpperCase() || "·";

  let somme = 0;
  for (const caractere of nom) somme = (somme * 31 + caractere.codePointAt(0)) % 360;

  return { lettre, teinte: somme };
}

/** Un utilitaire, en fiche. */
function renderFiche(utilitaire) {
  const { lettre, teinte } = vignetteDeLUtilitaire(utilitaire);
  const entrees = Array.isArray(utilitaire?.entrees) ? utilitaire.entrees : [];
  const sorties = Array.isArray(utilitaire?.sorties) ? utilitaire.sorties : [];

  return `
    <button type="button" class="atelier-fiche" data-side-nav-target="${escapeHtml(utilitaire.cible)}">
      <span class="atelier-fiche__vignette" aria-hidden="true"
        style="--atelier-teinte:${teinte};">${escapeHtml(lettre)}</span>

      <span class="atelier-fiche__corps">
        <span class="atelier-fiche__entete">
          <span class="atelier-fiche__nom">${escapeHtml(utilitaire.nom)}</span>
          <span class="atelier-fiche__version mono-small">v${escapeHtml(utilitaire.version ?? "—")}</span>
        </span>

        <span class="atelier-fiche__resume">${escapeHtml(utilitaire.resume ?? "")}</span>

        <span class="atelier-fiche__flux mono-small">
          <span class="atelier-fiche__flux-part">
            <span class="atelier-fiche__flux-mot">entre</span>
            ${escapeHtml(entrees.join(" · ") || "rien")}
          </span>
          <span class="atelier-fiche__flux-part">
            <span class="atelier-fiche__flux-mot">sort</span>
            ${escapeHtml(sorties.join(" · ") || "rien")}
          </span>
        </span>

        ${renderMarqueDIntelligence(utilitaire)}
      </span>
    </button>
  `;
}

/**
 * Qu'un utilitaire appelle un modèle **se dit avant de cliquer**.
 *
 * Une requête coûte, et un résultat produit par un modèle ne se lit pas comme
 * un calcul déterministe. La marque porte aussi le chemin qu'un humain prend
 * pour obtenir la même chose sans elle : l'IA accélère, elle n'est jamais le
 * seul chemin. Quand ce chemin manque, cela se voit — et c'est le but.
 */
function renderMarqueDIntelligence(utilitaire = {}) {
  if (utilitaire?.intelligence !== true) return "";

  const aLaMain = texte(utilitaire?.aussiALaMain);

  return `
    <span class="atelier-fiche__ia" title="${escapeHtml(
      aLaMain ? `Sans l'IA : ${aLaMain}` : "Aucun chemin manuel n'est écrit pour cet utilitaire."
    )}">
      ${svgIcon("copilot", { className: "octicon" })}
      <span>${escapeHtml(aLaMain ? "IA · aussi à la main" : "IA · chemin manuel à écrire")}</span>
    </span>
  `;
}

/**
 * Un utilitaire mis en avant, en carte.
 *
 * Elle porte son nom et ce qu'il fait, rien de plus : la rangée sert à
 * reconnaître d'un coup d'œil, pas à comparer. Les entrées, les sorties et la
 * version sont deux sections plus bas, sur la fiche — les redire ici ferait
 * deux endroits où les lire, et l'un des deux finirait par mentir (règle 4).
 */
function renderVedette(utilitaire) {
  const { lettre, teinte } = vignetteDeLUtilitaire(utilitaire);

  return `
    <button type="button" class="atelier-vedette" data-side-nav-target="${escapeHtml(utilitaire.cible)}">
      <span class="atelier-vedette__tete">
        <span class="atelier-vedette__vignette" aria-hidden="true"
          style="--atelier-teinte:${teinte};">${escapeHtml(lettre)}</span>
        <span class="atelier-vedette__nom">${escapeHtml(utilitaire.nom)}</span>
      </span>
      <span class="atelier-vedette__resume">${escapeHtml(utilitaire.resume ?? "")}</span>
    </button>
  `;
}

/**
 * La vitrine entière.
 *
 * @param {object} etat
 * @param {string} [etat.recherche] ce qui est tapé
 * @param {string} [etat.rayon] le rayon retenu, vide pour tous
 * @param {string} [etat.rangement] `RANGEMENT.*`
 */
export function renderVitrineDeLatelier({
  recherche = "", rayon = "", rangement = RANGEMENT.RECOMMANDE, ouvertures = null
} = {}) {
  const cherche = texte(recherche);
  const trouves = chercherDansLatelier(cherche);
  const retenus = rayon ? trouves.filter((utilitaire) => utilitaire.rayon === rayon) : trouves;
  const ranges = rangement === RANGEMENT.RECENT ? ajoutsRecents(retenus) : retenus;

  return `
    <div class="atelier-vitrine">
      ${renderBandeau(cherche)}

      <div class="atelier-corps">
        <aside class="atelier-rayons settings-nav" aria-label="Rayons de l'Atelier">
          ${renderRayons(rayon)}
        </aside>

        <div class="atelier-etals">
          ${cherche || rayon ? "" : renderVedettes(ouvertures)}
          ${renderRangement(rangement)}
          ${renderGrille(ranges, cherche)}
        </div>
      </div>
    </div>
  `;
}

/**
 * Le bandeau d'accueil.
 *
 * Il dit **sous quoi on peut chercher**. Un champ de recherche nu laisse
 * essayer le nom, échouer, et conclure que l'outil n'existe pas — alors qu'on
 * pouvait le trouver par la donnée qu'on avait en main.
 */
function renderBandeau(recherche) {
  return `
    <section class="atelier-bandeau">
      <h1 class="atelier-bandeau__titre">Les utilitaires de l'Atelier</h1>
      <p class="atelier-bandeau__sous-titre">
        Cherchez par domaine, par nom, par donnée d'entrée ou par variable produite.
      </p>
      <div class="atelier-bandeau__recherche">
        ${svgIcon("search", { className: "octicon octicon-search" })}
        <input type="search" id="atelierRecherche" class="atelier-bandeau__champ"
          value="${escapeHtml(recherche)}" autocomplete="off"
          placeholder="incendie · altitude · portance · spectre…"
          aria-label="Chercher un utilitaire">
      </div>
    </section>
  `;
}

/**
 * Les rayons, en navigation verticale.
 *
 * **Comme dans Paramètres, et par le même composant.** Une seconde manière de
 * ranger des sections verticalement se mettrait à diverger de la première au
 * premier ajustement (règle 4) — et surtout, une liste verticale tient
 * trente rayons là où une rangée d'onglets en tient six avant de déborder.
 *
 * Les entrées ne portent **pas** `data-side-nav-target` : dans l'Atelier, cet
 * attribut veut dire « ouvre ce panneau ». Un rayon ne se rend nulle part, il
 * restreint ce qu'on voit ; lui donner le même attribut ferait chercher un
 * panneau qui n'existe pas.
 */
function renderRayons(rayonRetenu) {
  const retenu = texte(rayonRetenu);

  const entree = (valeur, label, iconName) => renderSideNavItem({
    label,
    iconHtml: svgIcon(iconName, { className: "octicon" }),
    isActive: valeur === retenu,
    dataAttributes: { "data-atelier-rayon": valeur }
  });

  return renderSideNavGroup({
    className: "settings-nav__group atelier-rayons__group",
    items: [
      entree("", "Tout", "grid-apps"),
      ...rayonsDuCatalogue().map((rayon) => entree(
        rayon,
        NOM_DU_RAYON[rayon] ?? rayon,
        ICONE_DU_RAYON[rayon] ?? "gear"
      ))
    ]
  });
}

/**
 * Les plus employés.
 *
 * **Ils se comptent, ils ne se déclarent pas** : ce que la profession ouvre le
 * plus, sur tous les projets et tous les utilisateurs. Une liste écrite à la
 * main vieillit sans que personne ne s'en aperçoive.
 *
 * **Ils s'effacent dès qu'on cherche ou qu'on choisit un rayon.** Ils répondent
 * à « que contient l'Atelier ? », pas à la question qu'on vient de poser : les
 * garder au-dessus des résultats mettrait en avant ce qu'on n'a pas demandé —
 * et sur un rayon, ils montreraient des utilitaires d'un autre rayon, ce qui se
 * lit comme un filtre qui ne marche pas.
 */
function renderVedettes(ouvertures) {
  const vedettes = vedettesDeLatelier(undefined, ouvertures);
  if (vedettes.length === 0) return "";

  return `
    <section class="atelier-vedettes" aria-label="Les plus employés">
      ${vedettes.map(renderVedette).join("")}
    </section>
  `;
}

function renderRangement(rangement) {
  return renderLightTabs({
    tabs: [
      { id: RANGEMENT.RECOMMANDE, label: "Recommandé" },
      { id: RANGEMENT.RECENT, label: "Ajouté récemment" }
    ],
    activeTabId: texte(rangement) || RANGEMENT.RECOMMANDE,
    ariaLabel: "Comment ranger les utilitaires",
    className: "atelier-rangement"
  });
}

/**
 * **Une recherche sans résultat le dit, et dit quoi faire.** Une grille vide
 * laisse croire que l'Atelier est vide, ou que la recherche est cassée
 * (règle 5).
 */
function renderGrille(utilitaires, recherche) {
  if (utilitaires.length === 0) {
    return `
      <section class="atelier-grille atelier-grille--vide">
        <p>Aucun utilitaire ne répond à « ${escapeHtml(recherche)} ».</p>
        <p class="atelier-grille__vide-aide">
          On cherche aussi par domaine, par donnée d'entrée ou par variable produite —
          « altitude », « portance », « famille ».
        </p>
      </section>
    `;
  }

  return `
    <section class="atelier-grille" aria-label="Utilitaires">
      ${utilitaires.map(renderFiche).join("")}
    </section>
  `;
}
