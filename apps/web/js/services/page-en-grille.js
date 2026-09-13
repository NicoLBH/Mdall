/**
 * Rendre au modèle la page telle qu'elle est **posée**, et non telle qu'elle
 * se déroule.
 *
 * ## Le défaut que ce fichier corrige
 *
 * Un compte rendu de chantier est un tableau, déclaré ou non : une colonne de
 * remarques à gauche, et à droite des colonnes étroites — « Date » (quand la
 * remarque est entrée au compte rendu), « Pour le » (l'échéance), « Fait le »
 * (la fermeture).
 *
 * Le texte aplati d'un PDF ne dit rien de tout cela. Il rend les fragments dans
 * l'ordre du fichier, et une date de la colonne de droite tombe **au milieu**
 * de la phrase de gauche :
 *
 *     Reprise d'étanchéité en toiture, angle 12/03/2026 30/04/2026 nord-ouest,
 *     avant réception
 *
 * La phrase de gauche n'a plus de sens, et les deux dates ont perdu la leur —
 * on ne sait plus à quelle remarque elles se rapportent, ni laquelle est
 * l'échéance. Aucune consigne ne rattrape cela : on demanderait au modèle de
 * deviner ce que l'extraction a déjà détruit.
 *
 * ## Ce qu'il fait
 *
 * Il repose les fragments sur une grille de caractères, à partir de leurs
 * coordonnées réelles dans le PDF. Les colonnes redeviennent des colonnes,
 * l'indentation redevient de l'indentation :
 *
 *     Reprise d'étanchéité en toiture, angle        12/03/2026    30/04/2026
 *     nord-ouest, avant réception
 *
 * C'est ce que fait `pdftotext -layout` depuis vingt ans, et pour la même
 * raison : la géométrie **est** l'information.
 *
 * ## Les listes crantées
 *
 * Une liste de chantier est rarement numérotée. Elle se tient par un décalage
 * d'alignement : la reprise du 12 mars est indentée sous la remarque de
 * février, et c'est ce décalage seul qui dit qu'elle en dépend. Sur la grille,
 * le décalage se voit ; sur le texte aplati, il n'existe pas.
 *
 * ## Ce qu'il ne fait pas
 *
 * Il ne décide de rien. Il ne dit pas qu'il y a un tableau, ne nomme pas les
 * colonnes, ne regroupe rien : il **repose**, et le modèle lit. Ranger ici
 * reviendrait à interpréter avant de montrer, ce qui est exactement ce que
 * cette étape doit éviter.
 *
 * Rien ici n'appelle quoi que ce soit : des fragments entrent, du texte sort.
 */

import { nomDeLaCouleur } from "./couleurs-du-pdf.js";

const texte = (valeur) => String(valeur ?? "");
const nombre = (valeur) => (Number.isFinite(Number(valeur)) ? Number(valeur) : null);

/**
 * La largeur d'un caractère, sur cette page.
 *
 * **Mesurée, et non supposée.** C'est elle qui convertit une abscisse en
 * numéro de colonne : trop grande, deux colonnes se collent ; trop petite, une
 * ligne s'étale sur trois cents caractères et le tableau devient illisible.
 *
 * On prend la médiane plutôt que la moyenne : un titre de vingt-quatre points
 * au milieu d'un corps de dix fausserait la moyenne à lui seul.
 */
export function pasDeLaGrille(fragments = []) {
  const largeurs = [];

  for (const fragment of Array.isArray(fragments) ? fragments : []) {
    const contenu = texte(fragment?.text);
    const largeur = nombre(fragment?.width);
    if (!contenu.length || !largeur || largeur <= 0) continue;
    largeurs.push(largeur / contenu.length);
  }

  if (largeurs.length === 0) return 5;

  largeurs.sort((a, b) => a - b);
  const mediane = largeurs[Math.floor(largeurs.length / 2)];
  // Un pas dégénéré replierait toute la page sur la colonne 0.
  return mediane > 0.5 ? mediane : 5;
}

/**
 * Les lignes de la page, regroupées par ordonnée.
 *
 * La tolérance vient de la hauteur des caractères : deux fragments d'une même
 * ligne ne partagent pas exactement la même ordonnée dès qu'ils n'ont pas le
 * même corps. La fixer en points absolus casserait sur un document en petits
 * caractères, ou fusionnerait deux lignes d'un document en grands.
 *
 * L'ordonnée d'un PDF croît vers le haut : les lignes se rendent donc de la
 * plus haute à la plus basse.
 */
export function lignesDeLaPage(fragments = []) {
  const retenus = (Array.isArray(fragments) ? fragments : [])
    .map((fragment) => ({
      text: texte(fragment?.text),
      x: nombre(fragment?.x) ?? 0,
      y: nombre(fragment?.y) ?? 0,
      width: nombre(fragment?.width) ?? 0,
      height: nombre(fragment?.height) ?? 0,
      bold: fragment?.bold ?? null,
      italic: fragment?.italic ?? null,
      couleur: texte(fragment?.couleur)
    }))
    .filter((fragment) => fragment.text.trim() !== "");

  if (retenus.length === 0) return [];

  const hauteurs = retenus.map((fragment) => fragment.height).filter((hauteur) => hauteur > 0);
  const corps = hauteurs.length ? hauteurs.sort((a, b) => a - b)[Math.floor(hauteurs.length / 2)] : 10;
  const tolerance = Math.max(1.5, corps * 0.4);

  const lignes = [];
  for (const fragment of [...retenus].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const derniere = lignes[lignes.length - 1];
    if (derniere && Math.abs(derniere.y - fragment.y) <= tolerance) {
      derniere.fragments.push(fragment);
      continue;
    }
    lignes.push({ y: fragment.y, fragments: [fragment] });
  }

  for (const ligne of lignes) ligne.fragments.sort((a, b) => a.x - b.x);
  return lignes;
}

/**
 * La page reposée sur sa grille.
 *
 * Chaque fragment se place à la colonne que son abscisse lui donne. Quand deux
 * fragments se chevauchent — ce qui arrive sur un texte serré —, le second est
 * poussé d'un espace : un caractère perdu serait un mot faux, et l'on préfère
 * une colonne d'un cran à côté.
 */
export function pageEnGrille(fragments = [], { largeurMaximale = 240 } = {}) {
  const lignes = lignesDeLaPage(fragments);
  if (lignes.length === 0) return "";

  const pas = pasDeLaGrille(fragments);
  const origine = Math.min(...lignes.flatMap((ligne) => ligne.fragments.map((fragment) => fragment.x)));

  return lignes
    .map((ligne) => {
      let rendu = "";
      for (const fragment of ligne.fragments) {
        const colonne = Math.max(0, Math.round((fragment.x - origine) / pas));
        // Un fragment ne recule jamais : il se pose où il peut, à droite.
        const place = Math.min(colonne, largeurMaximale);
        if (place > rendu.length) rendu += " ".repeat(place - rendu.length);
        else if (rendu.length > 0 && !rendu.endsWith(" ")) rendu += " ";
        rendu += fragment.text;
      }
      return `${rendu.replace(/\s+$/, "")}${marqueDesCouleurs(ligne)}`;
    })
    .join("\n");
}

/**
 * La couleur d'une ligne, marquée **au bout de cette ligne**.
 *
 * ## Pourquoi au bout, et pas en légende
 *
 * La première version listait les passages colorés en bas de page, sous un
 * titre. Le modèle les a pris pour du contenu et les a recopiés là, à la fin,
 * hors de tout contexte — des encadrés entiers de fragments sans suite, et le
 * document doublé. C'était le pire défaut de la restitution, et il venait de
 * cette légende.
 *
 * Au bout de la ligne, la couleur reste **où elle est**. Elle ne peut plus être
 * déplacée sans que cela se voie, et la colonne n'a pas bougé : la marque est
 * posée après tout ce que la ligne portait.
 *
 * ## Pourquoi la couleur seule
 *
 * Le gras n'est pas relevé. Sur un compte rendu réel, il y en a quarante
 * fragments par page — des numéros, des tirets, des en-têtes — et pas un ne dit
 * rien de plus que ce que la grille montre déjà. Les mentions qui comptent
 * (« URGENT », « RETARD ») sont en capitales : elles se lisent telles quelles.
 */
function marqueDesCouleurs(ligne) {
  const noms = [];
  for (const fragment of ligne.fragments) {
    const nom = nomDeLaCouleur(fragment.couleur);
    if (nom && !noms.includes(nom)) noms.push(nom);
  }

  return noms.length > 0 ? `   ⟨${noms.join(" ")}⟩` : "";
}

/**
 * Ce que la page met en évidence, et que la grille ne peut pas porter.
 *
 * **En légende, et non dans le texte.** Entourer un fragment de `**` le
 * rallonge de quatre caractères et décale la colonne suivante : la mise en
 * évidence détruirait l'alignement qu'elle accompagne. Elle se dit donc à côté,
 * une fois, par nature.
 *
 * Le gras et l'italique ne se relèvent que quand la police a pu être résolue.
 * `null` — inconnu — ne devient pas « droit » : une police non résolue n'est
 * pas une police sans relief (règle 5).
 */
export function misesEnEvidence(fragments = []) {
  const relevees = { gras: [], italique: [], couleurs: new Map() };

  for (const fragment of Array.isArray(fragments) ? fragments : []) {
    const contenu = texte(fragment?.text).trim();
    if (!contenu) continue;

    if (fragment?.bold === true) relevees.gras.push(contenu);
    if (fragment?.italic === true) relevees.italique.push(contenu);

    const nom = nomDeLaCouleur(fragment?.couleur);
    if (!nom) continue;
    if (!relevees.couleurs.has(nom)) relevees.couleurs.set(nom, []);
    relevees.couleurs.get(nom).push(contenu);
  }

  return relevees;
}

/**
 * La page, telle qu'elle part au modèle.
 *
 * La grille, et rien d'autre : les couleurs sont marquées au bout de leur
 * propre ligne, où elles ne peuvent pas être déplacées sans que cela se voie.
 * Voir `marqueDesCouleurs` — la légende de bas de page qu'il y avait ici est
 * précisément ce qui doublait le document.
 */
export function pageEnMiseEnPage(fragments = [], { largeurMaximale = 240 } = {}) {
  return pageEnGrille(fragments, { largeurMaximale });
}

/**
 * Les pages d'un document, reposées — ou le texte aplati quand on ne peut pas.
 *
 * **Ne pas avoir la géométrie n'empêche pas de transcrire.** Une page dont
 * pdf.js n'a pas rendu les positions repart sur son texte aplati, comme avant,
 * et le compte de celles-là est rendu : l'écran doit pouvoir dire que les
 * colonnes ne sont pas garanties sur ce document (règle 5).
 *
 * @param {{page: number, text: string, items?: object[]|null}[]} pages
 * @returns {{pages: {page: number, text: string}[], posees: number[], aplaties: number[]}}
 */
export function pagesEnMiseEnPage(pages = [], options = {}) {
  const rendues = [];
  const posees = [];
  const aplaties = [];

  for (const page of Array.isArray(pages) ? pages : []) {
    const numero = nombre(page?.page);
    const grille = Array.isArray(page?.items) ? pageEnMiseEnPage(page.items, options) : "";

    if (grille) {
      posees.push(numero);
      rendues.push({ page: numero, text: grille });
      continue;
    }

    aplaties.push(numero);
    rendues.push({ page: numero, text: texte(page?.text) });
  }

  return { pages: rendues, posees, aplaties };
}
