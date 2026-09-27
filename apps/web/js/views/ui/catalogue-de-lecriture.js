/**
 * Le catalogue qu'on parcourt en écrivant du Mdall.
 *
 * ## Pourquoi une fenêtre, et pas seulement une liste sous le curseur
 *
 * La complétion répond quand on a déjà commencé à taper, c'est-à-dire quand on
 * **sait déjà** ce qu'on cherche. Tout le verrou de la composition est avant :
 * on ne compose pas avec ce qu'on ne sait pas nommer, et rien à l'écran ne
 * disait ce que les autres fonctions du brouillon concluent, ni ce que l'établi
 * contient.
 *
 * Ce catalogue se **parcourt**, donc, rayon par rayon — et l'on y cherche par
 * un mot qu'on a en tête plutôt que par un nom qu'on aurait retenu.
 *
 * ## Un clic pose le nom, et referme
 *
 * On vient chercher un nom pour l'écrire : le rendre puis laisser refermer à la
 * main ferait deux gestes pour un. Le nom se pose **là où le curseur était**,
 * en remplaçant le mot en cours comme le fait la complétion — c'est la même
 * fonction, et une seconde façon de coller divergerait de la première (règle 4).
 *
 * ## Ce qu'il ne décide pas
 *
 * **Ce qu'il contient.** Le catalogue vit dans `services/catalogue-des-noms.js`,
 * et il est le même que celui de la liste sous le curseur. Cet écran le range et
 * le dessine ; il n'en sait pas plus que ce qui s'affiche.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { ouvrirLaFenetreDeDetails, majLaFenetreDeDetails, fermerLaFenetreDeDetails }
  from "./fenetre-de-details.js";
import {
  ORIGINE, chercherUnNom, phraseDuCatalogue, rayonsDesNoms
} from "../../services/catalogue-des-noms.js";
import { appliquerLaProposition, ouEstLeCurseur } from "../../services/mdall-completion.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Le pictogramme de chaque rayon : ce qu'il est, d'un coup d'œil. */
export const ICONE_DE_LORIGINE = {
  [ORIGINE.LOCALE]: "pencil",
  [ORIGINE.DECLARE]: "tag",
  [ORIGINE.CONCLU]: "git-branch",
  [ORIGINE.POSE]: "north-star",
  [ORIGINE.FONCTION]: "markdown-code",
  [ORIGINE.ETABLI]: "tools"
};

/** La marque d'un nom qu'on peut poser, et celle du corps de la fenêtre. */
export const MARQUE_DU_NOM = "data-catalogue-nom";
export const MARQUE_DU_CORPS = "catalogue-noms";
/** La marque du champ de recherche. */
export const MARQUE_DE_LA_RECHERCHE = "data-catalogue-cherche";

/**
 * Ce qu'une entrée dit sous son nom, en une ligne.
 *
 * **Ce qu'elle lit passe avant ce qu'elle dit** quand les deux existent : la
 * première question devant une fonction qu'on n'a pas écrite soi-même est « de
 * quoi a-t-elle besoin ? », et non « à quoi sert-elle ». On a déjà son nom sous
 * les yeux pour la seconde.
 */
export function ligneDuNom(une = {}) {
  const morceaux = [];

  if ((une?.lit ?? []).length) morceaux.push(`lit ${une.lit.join(", ")}`);
  if (texte(une?.dit)) morceaux.push(texte(une.dit));
  if ((une?.valeurs ?? []).length) morceaux.push(`vaut ${une.valeurs.join(", ")}`);
  if (texte(une?.comme)) morceaux.push(`s'écrit ${texte(une.comme)}`);

  return morceaux.join(" · ");
}

/** Le rendu d'un rayon : son titre, ce qu'il annonce, et ses noms. */
export function renderRayonDesNoms(rayon = {}) {
  return `
    <section class="catalogue-noms__rayon">
      <h3 class="catalogue-noms__titre">
        ${svgIcon(ICONE_DE_LORIGINE[rayon?.origine] ?? "tag", { className: "octicon" })}
        ${escapeHtml(texte(rayon?.titre))}
      </h3>
      <p class="catalogue-noms__dit">${escapeHtml(texte(rayon?.dit))}</p>
      ${/*
        **La liste de l'établi, et la même.** Un nom, une précision à côté, une
        phrase dessous : c'est la forme de sa fenêtre voisine, et deux familles
        de classes se seraient recalibrées l'une contre l'autre à chaque
        retouche.
      */""}
      <ul class="fiches">
        ${(rayon?.noms ?? []).map((une) => {
          const sous = ligneDuNom(une);
          return `
            <li>
              <button type="button" class="fiches__item"
                ${MARQUE_DU_NOM}="${escapeHtml(une.nom)}"
                title="${escapeHtml(une.ou ? `De ${une.ou}` : une.nom)}">
                <span class="fiches__nom">
                  ${escapeHtml(une.nom)}
                  ${une.unite ? `<span class="fiches__apart mono-small">${
                    escapeHtml(une.unite)}</span>` : ""}
                </span>
                ${sous ? `<span class="fiches__resume">${escapeHtml(sous)}</span>` : ""}
                ${une.ou ? `<span class="fiches__quoi mono-small">${
                  escapeHtml(une.ou)}</span>` : ""}
              </button>
            </li>
          `;
        }).join("")}
      </ul>
    </section>
  `;
}

/**
 * Où en est la lecture de l'établi, et ce que l'écran en dit.
 *
 * **Trois états, et non deux.** Un établi qu'on n'a pas pu lire n'est pas un
 * établi vide : le taire ferait croire qu'on n'a rien gardé, et l'on réécrirait
 * un utilitaire qu'on a déjà. Ne pas savoir n'autorise pas à prétendre qu'il
 * n'y a rien (règle 5).
 */
export const ETABLI = { ATTENTE: "attente", LU: "lu", REFUS: "refus" };

/** Ce que l'écran dit de l'établi, tant qu'il n'est pas simplement là. */
export const PHRASE_DE_LETABLI = {
  [ETABLI.ATTENTE]: "Lecture de votre établi…",
  [ETABLI.REFUS]: "Votre établi n'a pas pu être lu : ce qu'il contient manque à cette liste."
};

/**
 * Le catalogue entier : la recherche, puis les rayons.
 *
 * **Le champ de recherche reste quand rien ne répond.** Le retirer emporterait
 * ce qu'on vient de taper, et l'on ne pourrait plus corriger une faute de frappe
 * sans rouvrir la fenêtre.
 */
export function renderCatalogueDesNoms(catalogue = [], { recherche = "", etabli = ETABLI.LU } = {}) {
  const trouves = chercherUnNom(catalogue, recherche);
  const rayons = rayonsDesNoms(trouves);

  return `
    <div class="${MARQUE_DU_CORPS}">
      <div class="catalogue-noms__barre">
        <input type="search" class="gh-input catalogue-noms__cherche" ${MARQUE_DE_LA_RECHERCHE}
          value="${escapeHtml(recherche)}" autocomplete="off" spellcheck="false"
          placeholder="Un nom, ou un mot qu'il porte — « TVA », « portée »…">
        ${/*
          **Le compte, et non le total.** Il dit ce que la recherche a laissé :
          « 3 noms » après une frappe répond à « est-ce que j'ai trop filtré ? ».
        */""}
        <span class="catalogue-noms__compte">${escapeHtml(phraseDuCatalogue(trouves))}</span>
      </div>

      ${PHRASE_DE_LETABLI[etabli] ? `<p class="review-empty-note">${
        escapeHtml(PHRASE_DE_LETABLI[etabli])}</p>` : ""}

      ${rayons.length
        ? rayons.map(renderRayonDesNoms).join("")
        : `<p class="review-empty-note">${escapeHtml(recherche
          ? "Aucun nom ne répond à cela. Ce qui n'est écrit nulle part ne se propose pas."
          : "Rien à nommer pour l'instant : écrivez une déclaration ou une fonction.")}</p>`}
    </div>
  `;
}

/**
 * Poser un nom dans la zone, là où le curseur était.
 *
 * **C'est la pose de la complétion**, et pas une seconde : le mot en cours est
 * remplacé, jamais complété par la fin — on a pu taper « vent » pour trouver
 * « Zone de vent », et coller derrière aurait donné « ventZone de vent ».
 *
 * @returns {boolean} `true` si le nom a été posé
 */
export function poserLeNom(zone, nom = "") {
  const pose = texte(nom);
  if (!zone || !pose) return false;

  const ou = ouEstLeCurseur(zone.value, zone.selectionStart ?? 0);
  const lignes = String(zone.value ?? "").split("\n");
  const { ligne, colonne } = appliquerLaProposition(lignes[ou.rang] ?? "", ou.colonne, pose);

  lignes[ou.rang] = ligne;
  const avant = lignes.slice(0, ou.rang).join("\n");
  zone.value = lignes.join("\n");
  zone.selectionStart = (ou.rang ? avant.length + 1 : 0) + colonne;
  zone.selectionEnd = zone.selectionStart;

  // La gouttière et la couche colorée suivent l'événement, comme à la frappe :
  // les remettre à jour ici en ferait un second endroit qui décide (règle 10).
  zone.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}

/**
 * Ouvrir le catalogue, et le tenir jusqu'à ce qu'on en sorte.
 *
 * `catalogue` est demandé **à l'ouverture et à chaque frappe** plutôt que retenu
 * ici : on vient peut-être d'écrire la fonction qu'on veut voir, et une liste
 * prise au branchement daterait d'avant.
 *
 * @param {object} quoi
 * @param {() => object[]} quoi.catalogue ce qu'on peut nommer, maintenant
 * @param {() => HTMLTextAreaElement|null} quoi.zone où poser le nom choisi
 * @param {() => Promise<void>} [quoi.lireLetabli] ce qui va chercher l'établi
 */
export function ouvrirLeCatalogueDeLecriture({ catalogue, zone, lireLetabli = null } = {}) {
  let recherche = "";
  let etabli = lireLetabli ? ETABLI.ATTENTE : ETABLI.LU;

  const titreHtml = escapeHtml("Ce que vous pouvez nommer");
  const metaHtml = escapeHtml(
    "Ce brouillon, le langage, et votre établi. Un clic pose le nom où vous écriviez."
  );

  const corps = ouvrirLaFenetreDeDetails({
    titreHtml,
    metaHtml,
    corpsHtml: renderCatalogueDesNoms(catalogue?.() ?? [], { recherche, etabli })
  });
  if (!corps) return null;

  const redessiner = () => {
    const rendu = majLaFenetreDeDetails({
      titreHtml,
      metaHtml,
      corpsHtml: renderCatalogueDesNoms(catalogue?.() ?? [], { recherche, etabli })
    });
    // La fenêtre a pu être refermée pendant la lecture de l'établi.
    rendu?.querySelector(`[${MARQUE_DE_LA_RECHERCHE}]`)?.focus();
    return rendu;
  };

  corps.addEventListener("input", (evenement) => {
    const champ = evenement.target.closest?.(`[${MARQUE_DE_LA_RECHERCHE}]`);
    if (!champ) return;
    recherche = champ.value;
    redessiner();
  });

  corps.addEventListener("click", (evenement) => {
    const bouton = evenement.target.closest?.(`[${MARQUE_DU_NOM}]`);
    if (!bouton) return;
    if (poserLeNom(zone?.(), bouton.getAttribute(MARQUE_DU_NOM))) fermerLaFenetreDeDetails();
  });

  corps.querySelector(`[${MARQUE_DE_LA_RECHERCHE}]`)?.focus();

  /**
   * **L'établi se lit après l'ouverture.** L'attendre laisserait l'écran sans
   * réponse sur un clic, alors que tout ce qui vient du brouillon et du langage
   * est déjà là — et c'est ce qu'on cherche neuf fois sur dix.
   */
  if (lireLetabli) {
    /**
     * **Un refus ne s'échappe pas, et ne se tait pas non plus.** Laisser la
     * promesse rejetée remonter ferait une erreur non rattrapée dans la console
     * du navigateur ; l'avaler ferait un catalogue qui prétend que l'établi est
     * vide. On dit donc ce qui manque à la liste.
     */
    void Promise.resolve()
      .then(() => lireLetabli())
      .then(() => { etabli = ETABLI.LU; }, () => { etabli = ETABLI.REFUS; })
      .then(redessiner);
  }

  return corps;
}
