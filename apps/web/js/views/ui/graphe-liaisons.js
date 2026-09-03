/**
 * Un graphe de liaisons : des boîtes rangées par profondeur, et les traits
 * entre elles.
 *
 * ## Pourquoi il vit ici et non dans l'écran Incendie
 *
 * Il y est né — montrer que presque tout, dans l'arrêté de 1986, pend au
 * classement, et que le classement pend à une poignée de questions. Mais le
 * dessin ne sait rien du feu : il sait qu'une chose en décide une autre. C'est
 * exactement ce qu'il faudra montrer de la Mémoire — quelle décision s'appuie
 * sur quelle affirmation, et laquelle tomberait si l'on changeait celle-là.
 *
 * Ce fichier ne connaît donc ni article, ni famille, ni sujet, ni affirmation.
 * Il reçoit des nœuds, des liens, et de quoi les habiller.
 *
 * ## Ce qu'il montre, et pourquoi dans cet ordre
 *
 * Les colonnes se lisent de gauche à droite : ce qui est à gauche décide de ce
 * qui est à droite. Un graphe dessiné dans l'ordre de déclaration ne dit rien ;
 * rangé par profondeur, il montre la forme du raisonnement.
 *
 * Le nœud désigné allume **tout son amont**, pas seulement le premier rang :
 * c'est la chaîne complète qui explique une conclusion, et la voir d'un coup
 * vaut mieux que de la reconstituer boîte par boîte. L'intensité décroît avec
 * l'éloignement, sans quoi, sur cent vingt traits, on ne saurait plus par où
 * l'on est arrivé.
 *
 * ## Ce qu'il attend
 *
 * ```
 * graphe = {
 *   noeuds: [{ id, produit, demande: [clé], entete, titre, valeur, etat }],
 *   liens:  [{ de, vers, fait }]
 * }
 * ```
 *
 * `produit` est ce que le nœud établit, `demande` ce dont il a besoin : c'est
 * de là que se déduisent les colonnes. `etat` vaut « conclu », « sansObjet » ou
 * « attente », et ne sert qu'à la couleur.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";

/**
 * Les nœuds par profondeur : ceux qui ne dépendent de rien d'abord.
 *
 * La profondeur d'un nœud est un de plus que la plus grande de ses amonts. Un
 * cycle rendrait zéro plutôt que de boucler — le graphe est censé ne pas en
 * avoir, mais un dessin ne doit pas figer une page pour autant.
 */
export function rangerParProfondeur(graphe) {
  const produits = new Map((graphe?.noeuds ?? []).map((n) => [n.produit, n.id]));
  const parId = new Map((graphe?.noeuds ?? []).map((n) => [n.id, n]));
  const profondeur = new Map();

  const calculer = (id, vus = new Set()) => {
    if (profondeur.has(id)) return profondeur.get(id);
    if (vus.has(id)) return 0;
    vus.add(id);
    const amonts = (parId.get(id)?.demande ?? []).map((f) => produits.get(f)).filter(Boolean);
    const p = amonts.length === 0 ? 0 : 1 + Math.max(...amonts.map((a) => calculer(a, vus)));
    profondeur.set(id, p);
    return p;
  };
  for (const noeud of graphe?.noeuds ?? []) calculer(noeud.id);

  const colonnes = [];
  for (const noeud of graphe?.noeuds ?? []) (colonnes[profondeur.get(noeud.id) ?? 0] ??= []).push(noeud);
  return colonnes.filter(Boolean);
}

/**
 * Le nœud désigné et tout ce dont il dépend, avec la distance de chacun.
 *
 * Zéro pour lui-même, un pour ce qui le décide directement, deux pour ce qui
 * décide de cela. Un nœud atteint par deux chemins garde le plus court : c'est
 * celui qui décrit le mieux sa proximité avec ce qu'on regarde.
 */
export function cheminAmont(id, graphe) {
  const rangs = new Map();
  if (!id || !graphe) return rangs;
  const produitPar = new Map(graphe.noeuds.map((n) => [n.produit, n.id]));
  const parId = new Map(graphe.noeuds.map((n) => [n.id, n]));
  const aVoir = [[id, 0]];
  while (aVoir.length) {
    const [courant, rang] = aVoir.shift();
    if (rangs.has(courant) && rangs.get(courant) <= rang) continue;
    rangs.set(courant, rang);
    for (const fait of parId.get(courant)?.demande ?? []) {
      const parent = produitPar.get(fait);
      if (parent) aVoir.push([parent, rang + 1]);
    }
  }
  return rangs;
}

/**
 * Ce qui dépend du nœud désigné, de proche en proche.
 *
 * L'amont explique une conclusion ; l'aval dit ce qu'elle entraîne. Les deux
 * ensemble forment le chemin décisionnel complet : c'est ce qu'on veut voir
 * quand on désigne une carte, et rien d'autre — les cent vingt autres cartes ne
 * font qu'éloigner celles qui comptent.
 */
export function cheminAval(id, graphe) {
  const rangs = new Map();
  if (!id || !graphe) return rangs;
  const parId = new Map(graphe.noeuds.map((n) => [n.id, n]));
  const aVoir = [[id, 0]];
  while (aVoir.length) {
    const [courant, rang] = aVoir.shift();
    if (rangs.has(courant) && rangs.get(courant) <= rang) continue;
    rangs.set(courant, rang);
    const produit = parId.get(courant)?.produit;
    if (!produit) continue;
    for (const noeud of graphe.noeuds) {
      if ((noeud.demande ?? []).includes(produit)) aVoir.push([noeud.id, rang + 1]);
    }
  }
  return rangs;
}

/** Le chemin décisionnel complet : ce qui décide, et ce qui en dépend. */
export function cheminComplet(id, graphe) {
  const complet = new Set(cheminAmont(id, graphe).keys());
  for (const cle of cheminAval(id, graphe).keys()) complet.add(cle);
  return complet;
}

/**
 * Les nœuds qu'on montre, selon ce qu'on cherche à voir.
 *
 * Par défaut, seuls ceux qui **portent une réponse** : un schéma où les deux
 * tiers des cartes disent « sans objet » se lit mal, et ce n'est pas ce qu'on
 * vient y chercher. Ceux-là restent accessibles — la carte du référentiel
 * entier a sa valeur, notamment pour vérifier qu'on n'a rien oublié — mais sur
 * demande.
 *
 * Quand une carte est désignée, on resserre encore : son chemin complet, et lui
 * seul.
 */
export function noeudsVisibles(graphe, { montrerTout = false, chemin = null } = {}) {
  const tous = graphe?.noeuds ?? [];
  if (chemin) {
    const retenus = cheminComplet(chemin, graphe);
    return new Set(tous.filter((n) => retenus.has(n.id)).map((n) => n.id));
  }
  if (montrerTout) return new Set(tous.map((n) => n.id));
  return new Set(tous.filter((n) => n.etat !== "sansObjet").map((n) => n.id));
}

/**
 * Le graphe, en HTML.
 *
 * @param {object} options
 * @param {object} options.graphe les nœuds et les liens
 * @param {string|null} options.selection le nœud désigné
 * @param {number} options.zoom le grossissement
 * @param {boolean} options.pleinEcran
 * @param {string} options.legende la phrase d'en-tête, propre à l'écran
 * @param {string} options.rangNomme comment appeler une colonne — « Niveau »
 * @param {string} options.detail le panneau de droite, dessiné par l'appelant
 */
export function dessinerGrapheLiaisons({
  graphe, selection = null, zoom = 1, pleinEcran = false,
  legende = "", rangNomme = "Niveau", detail = "",
  montrerTout = false, peutToutMontrer = false, chemin = null
} = {}) {
  const visibles = noeudsVisibles(graphe, { montrerTout, chemin });
  const colonnes = rangerParProfondeur(graphe)
    .map((colonne) => colonne.filter((n) => visibles.has(n.id)))
    .filter((colonne) => colonne.length);
  const caches = (graphe?.noeuds?.length ?? 0) - visibles.size;

  return `
    <section class="graphe-bloc${pleinEcran ? " est-plein-ecran" : ""}${detail ? " est-detaille" : ""}" data-graphe-bloc>
      <div class="graphe__tete">
        <p class="graphe__legende">${legende}${caches > 0 ? `
          <span class="graphe__caches">${caches} carte${caches > 1 ? "s" : ""} masquée${caches > 1 ? "s" : ""}${
            chemin ? " — hors du chemin décisionnel" : " — sans objet dans ce cas"}.</span>` : ""}</p>
        <div class="graphe__outils">
          ${chemin ? `
            <button type="button" class="graphe__outil est-actif" data-graphe-chemin="sortir"
                    aria-label="Revoir tout le schéma" title="Revoir tout le schéma">
              ${svgIcon("x", { className: "octicon" })}
            </button>` : ""}
          ${peutToutMontrer ? `
            <button type="button" class="graphe__outil${montrerTout ? " est-actif" : ""}" data-graphe-tout
                    aria-pressed="${montrerTout}"
                    aria-label="${montrerTout ? "Ne montrer que ce qui décide" : "Tout afficher"}"
                    title="${montrerTout ? "Ne montrer que ce qui décide" : "Tout afficher, y compris ce qui est sans objet"}">
              ${svgIcon("stack", { className: "octicon" })}
            </button>` : ""}
          <button type="button" class="graphe__outil" data-graphe-zoom="out" aria-label="Réduire" title="Réduire">
            ${svgIcon("minus", { className: "octicon" })}
          </button>
          <span class="graphe__zoom" data-graphe-zoom-valeur>${Math.round(zoom * 100)} %</span>
          <button type="button" class="graphe__outil" data-graphe-zoom="in" aria-label="Agrandir" title="Agrandir">
            ${svgIcon("plus", { className: "octicon" })}
          </button>
          <button type="button" class="graphe__outil" data-graphe-plein-ecran
                  aria-label="${pleinEcran ? "Quitter le plein écran" : "Plein écran"}"
                  title="${pleinEcran ? "Quitter le plein écran" : "Plein écran"}">
            ${svgIcon("screen-full", { className: "octicon" })}
          </button>
        </div>
      </div>

      <div class="graphe__scene">
      <aside class="graphe-detail${detail ? " est-ouvert" : ""}" data-graphe-detail>${detail}</aside>
      <div class="graphe" data-graphe-vue>
        <div class="graphe__toile" data-graphe-toile style="--graphe-zoom:${zoom}">
          <svg class="graphe__liens" data-graphe-liens aria-hidden="true"></svg>
          ${colonnes.map((colonne, rang) => `
            <div class="graphe__colonne">
              <div class="graphe__rang">${escapeHtml(rangNomme)} ${rang + 1}</div>
              ${colonne.map((noeud) => {
                const classes = ["graphe-noeud", `est-${noeud.etat ?? "attente"}`];
                if (selection === noeud.id) classes.push("est-designe");
                return `
                  <button type="button" class="${classes.join(" ")}" data-graphe-noeud="${escapeHtml(noeud.id)}">
                    ${noeud.entete ? `<span class="graphe-noeud__entete">${escapeHtml(noeud.entete)}</span>` : ""}
                    <span class="graphe-noeud__titre">${escapeHtml(noeud.titre ?? noeud.id)}</span>
                    ${noeud.valeur ? `<span class="graphe-noeud__valeur">${escapeHtml(noeud.valeur)}</span>` : ""}
                  </button>
                `;
              }).join("")}
            </div>
          `).join("")}
        </div>
      </div>
      </div>
    </section>
  `;
}

/**
 * Les traits, tracés une fois la mise en page connue.
 *
 * On ne peut pas les écrire dans le HTML : leur départ et leur arrivée
 * dépendent de la hauteur réelle de chaque boîte, donc du texte qu'elle
 * contient, donc du navigateur. On les pose après coup, et on les repose à
 * chaque zoom et à chaque redimensionnement.
 */
export function tracerLesLiens(root, { graphe, selection = null, zoom = 1 } = {}) {
  const toile = root?.querySelector("[data-graphe-toile]");
  const svg = root?.querySelector("[data-graphe-liens]");
  if (!toile || !svg || !graphe) return;

  const cadre = toile.getBoundingClientRect();
  const grossissement = zoom || 1;
  const boites = new Map();
  for (const noeud of toile.querySelectorAll("[data-graphe-noeud]")) {
    const r = noeud.getBoundingClientRect();
    // Les coordonnées sont ramenées dans le repère non grossi de la toile : le
    // SVG est à l'intérieur, il subit le même agrandissement qu'elle.
    boites.set(noeud.dataset.grapheNoeud, {
      gauche: (r.left - cadre.left) / grossissement,
      droite: (r.right - cadre.left) / grossissement,
      milieu: (r.top + r.height / 2 - cadre.top) / grossissement
    });
  }

  const amont = cheminAmont(selection, graphe);
  const chemins = [];
  for (const lien of graphe.liens ?? []) {
    const de = boites.get(lien.de);
    const vers = boites.get(lien.vers);
    // Un lien dont une extrémité n'est pas affichée ne se trace pas : il
    // partirait du vide, et l'on croirait à une liaison vers rien.
    if (!de || !vers) continue;
    const x1 = de.droite, y1 = de.milieu, x2 = vers.gauche, y2 = vers.milieu;
    const courbe = Math.max(18, (x2 - x1) / 2);

    const rang = amont.has(lien.de) && amont.has(lien.vers) ? amont.get(lien.vers) : null;
    const aval = selection && lien.de === selection;
    const opacite = rang === null ? null : Math.max(0.28, 1 - rang * 0.22);
    const classe = rang !== null ? "graphe-lien est-marque" : aval ? "graphe-lien est-aval" : "graphe-lien";
    const style = opacite === null ? "" : ` style="opacity:${opacite};stroke-width:${Math.max(1.1, 2 - rang * 0.25)}"`;
    chemins.push(`<path d="M ${x1} ${y1} C ${x1 + courbe} ${y1}, ${x2 - courbe} ${y2}, ${x2} ${y2}"
      class="${classe}"${style}><title>${escapeHtml(lien.fait ?? "")}</title></path>`);
  }

  // Les boîtes du chemin s'allument aussi : un trait qui mène à un nœud éteint
  // se suit mal.
  for (const noeud of toile.querySelectorAll("[data-graphe-noeud]")) {
    const rang = amont.get(noeud.dataset.grapheNoeud);
    noeud.classList.toggle("est-en-amont", rang !== undefined && rang > 0);
    noeud.style.removeProperty("--graphe-amont");
    if (rang !== undefined && rang > 0) noeud.style.setProperty("--graphe-amont", String(Math.max(0.3, 1 - rang * 0.2)));
  }

  svg.setAttribute("width", String(toile.scrollWidth / grossissement));
  svg.setAttribute("height", String(toile.scrollHeight / grossissement));
  svg.innerHTML = chemins.join("");
}

/** Le grossissement, appliqué sans tout redessiner. */
export function appliquerZoom(root, zoom) {
  const toile = root?.querySelector("[data-graphe-toile]");
  if (toile) toile.style.setProperty("--graphe-zoom", String(zoom));
  const valeur = root?.querySelector("[data-graphe-zoom-valeur]");
  if (valeur) valeur.textContent = `${Math.round(zoom * 100)} %`;
}

/**
 * Les gestes du graphe, branchés une fois pour toutes.
 *
 * L'écran garde l'état — c'est lui qui sait ce qu'il redessine — et ne reçoit
 * ici que les intentions : on a désigné un nœud, on a zoomé, on veut la page
 * entière. Survol **et** clic désignent : le survol pour parcourir, le clic
 * pour s'arrêter dessus.
 */
export function brancherGrapheLiaisons(root, {
  onDesigner, onZoom, onPleinEcran, onSurvol, onToutMontrer, onSortirDuChemin
} = {}) {
  if (!root) return;

  root.addEventListener("click", (evenement) => {
    const noeud = evenement.target.closest("[data-graphe-noeud]");
    if (noeud) { onDesigner?.(noeud.dataset.grapheNoeud); return; }
    if (evenement.target.closest("[data-graphe-chemin]")) { onSortirDuChemin?.(); return; }
    if (evenement.target.closest("[data-graphe-tout]")) { onToutMontrer?.(); return; }
    const zoom = evenement.target.closest("[data-graphe-zoom]");
    if (zoom) { onZoom?.(zoom.dataset.grapheZoom); return; }
    if (evenement.target.closest("[data-graphe-plein-ecran]")) onPleinEcran?.();
  });

  root.addEventListener("pointerover", (evenement) => {
    const noeud = evenement.target.closest("[data-graphe-noeud]");
    if (noeud) onSurvol?.(noeud.dataset.grapheNoeud);
  });
}
