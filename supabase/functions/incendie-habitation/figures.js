/**
 * Les schémas du fascicule, redessinés — en traits, pas en pixels.
 *
 * ## Pourquoi les redessiner plutôt que les découper
 *
 * Les figures du fascicule portent ce que le texte ne dit pas. L'article
 * premier énumère trois choses — les bâtiments, les logements-foyers, les parcs
 * — et sa figure montre en un coup d'œil **à quelles familles** chacune
 * s'applique, y compris ce qu'aucune phrase n'écrit : que la deuxième famille
 * existe des deux côtés, en individuel et en collectif. Celui qui répond aux
 * questions n'a pas ce savoir-là ; la figure le lui donne en une seconde.
 *
 * Un extrait d'image ferait le même travail une fois. En traits, il se
 * redimensionne sans bouillie, se lit en thème clair comme en thème sombre —
 * les couleurs viennent de la page, pas du fichier —, se cherche au texte, et
 * pèse deux kilo-octets au lieu de cent. Surtout, il se **corrige** : un seuil
 * qui change en 2015 se change ici en un chiffre.
 *
 * ## Ce qu'un schéma n'est pas
 *
 * Il n'est pas la source. La règle reste dans le module, la phrase reste dans
 * l'arrêté ; le schéma aide à répondre, il ne décide de rien. Chacun porte donc
 * le renvoi au fascicule d'où il vient, pour qu'on puisse aller vérifier que le
 * trait dit bien ce que la figure disait.
 *
 * ## La bande « domaine d'application »
 *
 * C'est le même dessin d'un bout à l'autre du fascicule : une bande, des
 * colonnes — les familles —, et un rond noir sous chaque famille que l'article
 * concerne. Elle est donc écrite une fois et remplie article par article, plutôt
 * que redessinée à chaque figure.
 */

/** Les six colonnes du classement, telles que le fascicule les range. */
export const COLONNES_FAMILLES = [
  { cle: "1", libelle: "1", groupe: "Indiv." },
  { cle: "2i", libelle: "2", groupe: "Indiv." },
  { cle: "2c", libelle: "2", groupe: "Collectifs" },
  { cle: "3A", libelle: "A", surtitre: "3", groupe: "Collectifs" },
  { cle: "3B", libelle: "B", surtitre: "3", groupe: "Collectifs" },
  { cle: "4", libelle: "4", groupe: "Collectifs" }
];

const echapper = (t) => String(t ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * L'en-tête d'une bande, et les rails qui en descendent.
 *
 * « Indiv. | Collectifs », puis « 1 | 2 | 2 | 3(A|B) | 4 » : c'est le même
 * bandeau dans tout le fascicule, et il ne se dessine qu'ici. Les rails
 * descendent jusqu'au bas qu'on lui donne — c'est par eux qu'une ligne du
 * dessin va marquer la famille qu'elle concerne.
 */
function enTeteDeBande({ x, y, largeur, colonnes, bas }) {
  const pas = largeur / colonnes.length;
  const rail = (i) => x + pas * (i + 0.5);
  const hGroupe = colonnes.some((c) => c.groupe) ? 26 : 0;
  const hSurtitre = colonnes.some((c) => c.surtitre) ? 22 : 0;
  const hLibelle = 28;
  const hauteur = hGroupe + hSurtitre + hLibelle;

  const t = [`<rect x="${x}" y="${y}" width="${largeur}" height="${hauteur}" class="fig-cadre"/>`];

  if (hGroupe) {
    let debut = 0;
    for (let i = 1; i <= colonnes.length; i += 1) {
      if (i < colonnes.length && colonnes[i].groupe === colonnes[debut].groupe) continue;
      const g = x + pas * debut, d = x + pas * i;
      t.push(`<text x="${(g + d) / 2}" y="${y + 18}" class="fig-groupe">${echapper(colonnes[debut].groupe)}</text>`);
      if (i < colonnes.length) t.push(`<line x1="${d}" y1="${y}" x2="${d}" y2="${y + hGroupe}" class="fig-cadre-trait"/>`);
      debut = i;
    }
    t.push(`<line x1="${x}" y1="${y + hGroupe}" x2="${x + largeur}" y2="${y + hGroupe}" class="fig-cadre-trait"/>`);
  }

  const surtitres = new Map();
  colonnes.forEach((c, i) => {
    if (!c.surtitre) return;
    surtitres.set(c.surtitre, [...(surtitres.get(c.surtitre) ?? []), i]);
  });
  for (const [surtitre, index] of surtitres) {
    const g = x + pas * index[0], d = x + pas * (index.at(-1) + 1);
    t.push(`<text x="${(g + d) / 2}" y="${y + hGroupe + 18}" class="fig-colonne">${echapper(surtitre)}</text>`);
    t.push(`<line x1="${g}" y1="${y + hGroupe + hSurtitre}" x2="${d}" y2="${y + hGroupe + hSurtitre}" class="fig-cadre-trait"/>`);
  }

  colonnes.forEach((c, i) => {
    const yTexte = c.surtitre ? y + hauteur - 8 : y + hGroupe + (hSurtitre + hLibelle) / 2 + (c.mot ? 4 : 8);
    const classe = c.mot ? "fig-mot" : c.surtitre ? "fig-sous-colonne" : "fig-colonne";
    t.push(`<text x="${rail(i)}" y="${yTexte}" class="${classe}">${echapper(c.libelle)}</text>`);
    if (i > 0) {
      const haut = colonnes[i].surtitre && colonnes[i - 1].surtitre ? y + hGroupe + hSurtitre : y + hGroupe;
      t.push(`<line x1="${x + pas * i}" y1="${haut}" x2="${x + pas * i}" y2="${y + hauteur}" class="fig-cadre-trait"/>`);
    }
    t.push(`<line x1="${rail(i)}" y1="${y + hauteur}" x2="${rail(i)}" y2="${bas}" class="fig-rail"/>`);
  });
  t.push(`<line x1="${x}" y1="${y + hauteur}" x2="${x}" y2="${bas}" class="fig-cadre-trait"/>`);
  t.push(`<line x1="${x + largeur}" y1="${y + hauteur}" x2="${x + largeur}" y2="${bas}" class="fig-cadre-trait"/>`);

  return { svg: t.join("\n    "), hauteur, rail };
}

/**
 * La planche du fascicule : un dessin à gauche, la bande des familles à droite.
 *
 * ## Pourquoi une seule mécanique pour toutes les figures
 *
 * Les figures de l'arrêté ont toutes la même charpente. À gauche, un dessin —
 * une coupe, un plan, une axonométrie. À droite, une bande dont les colonnes
 * sont les familles, et dont les **rails descendent sur toute la hauteur**. Et
 * entre les deux, une ou plusieurs **lignes** : chacune part d'un endroit du
 * dessin, porte un libellé — « CF 1/2 h », « entre logements » — et va marquer,
 * sur les rails, les familles qu'elle concerne.
 *
 * La figure de l'article 6 a une seule ligne, celle des degrés coupe-feu ; celle
 * de l'article 7 en a cinq, une par cas de recoupement. C'est la même planche.
 * L'écrire une fois est ce qui rend la suivante abordable — le travail de
 * conception visuel est le coût réel, et il ne se paie qu'une fois.
 *
 * ## Pourquoi du SVG et pas un tableau HTML
 *
 * Parce que les lignes doivent tomber **en face** de ce qu'elles désignent dans
 * le dessin. Un tableau HTML alignerait ses propres lignes, pas celles du
 * dessin, et il faudrait ensuite faire coïncider les deux à la main à chaque
 * changement de texte. Ici, la ligne et le trait d'appel partent du même y.
 */
function planche({ largeur, hauteur, titre = null, sousTitre = null, dessin = "", lignes = [],
                   bande: reglages = {}, notes = [] }) {
  const { x: bx = largeur - 330, largeur: bl = 310, y: by = 16, colonnes = COLONNES_FAMILLES } = reglages;
  const pas = bl / colonnes.length;
  const rail = (i) => bx + pas * (i + 0.5);

  const basDesRails = hauteur - 24;
  const entete = enTeteDeBande({ x: bx, y: by, largeur: bl, colonnes, bas: basDesRails });
  const hEntete = entete.hauteur;

  const t = [];
  if (titre) t.push(`<rect x="20" y="${by}" width="${bx - 60}" height="30" class="fig-bandeau"/>
    <text x="${20 + (bx - 60) / 2}" y="${by + 21}" class="fig-titre">${echapper(titre)}</text>`);
  if (sousTitre) t.push(`<text x="${20 + (bx - 60) / 2}" y="${by + 54}" class="fig-sous-titre">${echapper(sousTitre)}</text>`);
  t.push(entete.svg);

  // Le dessin, posé tel quel.
  t.push(dessin);

  // Les lignes : d'un point du dessin vers son libellé, puis vers les rails.
  for (const ligne of lignes) {
    const y = ligne.y;
    if (ligne.depuis !== undefined) {
      t.push(`<line x1="${ligne.depuis}" y1="${y}" x2="${ligne.libelleX ?? bx - 100}" y2="${y}" class="fig-appel"/>`);
    }
    if (ligne.libelle) {
      t.push(`<text x="${ligne.libelleX ?? bx - 96}" y="${y + 4}" class="fig-libelle-ligne">${echapper(ligne.libelle)}</text>`);
    }
    if (ligne.versLaBande !== false) {
      t.push(`<line x1="${ligne.libelleFinX ?? bx - 22}" y1="${y}" x2="${bx}" y2="${y}" class="fig-appel"/>`);
    }
    colonnes.forEach((c, i) => {
      if (ligne.valeurs && ligne.valeurs[c.cle] !== undefined) {
        // Le rail passe derrière la valeur, comme dans le fascicule : un halo
        // l'efface juste sous le chiffre, sinon « 1 h » se lit « 1 |h ».
        const texte = String(ligne.valeurs[c.cle]);
        const large = Math.max(30, texte.length * 8);
        t.push(`<rect x="${rail(i) - large / 2}" y="${y - 10}" width="${large}" height="20" class="fig-halo"/>`);
        t.push(`<text x="${rail(i)}" y="${y + 4}" class="fig-valeur">${echapper(texte)}</text>`);
        return;
      }
      if (ligne.familles?.includes(c.cle)) t.push(`<circle cx="${rail(i)}" cy="${y}" r="6.5" class="fig-rond"/>`);
    });
  }

  notes.forEach((note, i) => {
    t.push(`<text x="20" y="${hauteur - 12 - (notes.length - 1 - i) * 16}" class="fig-note">${echapper(note)}</text>`);
  });

  return `<svg viewBox="0 0 ${largeur} ${hauteur}" role="img" xmlns="http://www.w3.org/2000/svg"
    aria-label="${echapper(reglages.enonce ?? "")}">
    ${t.join("\n    ")}
  </svg>`;
}

/** Les colonnes propres aux logements-foyers et aux parcs. */
const COLONNES_FOYERS = [
  { cle: "tout", libelle: "Tout foyer" },
  { cle: "agees", libelle: "Pers. âgées" },
  { cle: "handicap", libelle: "Hand. phys." }
];
const COLONNES_PARCS = [
  { cle: "R", libelle: "R" },
  { cle: "1niv", libelle: "+1 niv." },
  { cle: "2niv", libelle: "±2 niv." },
  { cle: "plus", libelle: "±>2 niv." }
];

/**
 * Figure 1 de l'article premier : à quoi l'arrêté s'applique.
 *
 * Quatre bandes empilées, une par objet visé, puis la même chose réunie : c'est
 * la quatrième qui sert de légende à tout le fascicule, et c'est elle qu'on
 * relit quand un article dit « les habitations » sans préciser lesquelles.
 *
 * Elle n'a pas de dessin — la bande **est** la figure — et c'est pour cela
 * qu'elle n'emprunte pas la planche : elle empile ce que la planche n'a qu'une
 * fois. L'en-tête, lui, est le même, et il n'est écrit qu'une fois.
 */
function figureArticlePremier() {
  const x = 250, largeur = 330;
  const toutes = ["1", "2i", "2c", "3A", "3B", "4"];
  const bandes = [
    { y: 16, x, largeur, colonnes: COLONNES_FAMILLES, intitule: "Bâtiments d'habitation", marques: toutes },
    { y: 150, x: x + 40, largeur: 250, colonnes: COLONNES_FOYERS, intitule: "Logements-foyers",
      marques: ["tout", "agees", "handicap"] },
    { y: 254, x: x + 40, largeur: 250, colonnes: COLONNES_PARCS, intitule: "Parcs de stationnement",
      marques: ["R", "1niv", "2niv", "plus"] },
    { y: 358, x, largeur: 450, intitule: "L'ensemble des trois",
      colonnes: [...COLONNES_FAMILLES,
        { cle: "foyers", libelle: "Foyers", groupe: "", mot: true },
        { cle: "parcs", libelle: "Parcs", groupe: "", mot: true }],
      marques: [...toutes, "foyers", "parcs"] }
  ];

  const t = [];
  for (const b of bandes) {
    const bas = b.y + 108;
    const entete = enTeteDeBande({ x: b.x, y: b.y, largeur: b.largeur, colonnes: b.colonnes, bas });
    const yRonds = b.y + entete.hauteur + (bas - b.y - entete.hauteur) / 2;
    t.push(entete.svg);
    t.push(`<line x1="${b.x - 48}" y1="${yRonds}" x2="${b.x + b.largeur}" y2="${yRonds}" class="fig-appel"/>`);
    t.push(`<text x="${b.x - 56}" y="${yRonds + 4}" class="fig-intitule">${echapper(b.intitule)}</text>`);
    b.colonnes.forEach((c, i) => {
      if (b.marques.includes(c.cle)) t.push(`<circle cx="${entete.rail(i)}" cy="${yRonds}" r="7" class="fig-rond"/>`);
    });
  }

  return `<svg viewBox="0 0 720 560" role="img" xmlns="http://www.w3.org/2000/svg"
    aria-label="Domaine d'application de l'arrêté : bâtiments d'habitation des quatre familles, logements-foyers, parcs de stationnement annexes.">
    ${t.join("\n    ")}
    <text x="14" y="504" class="fig-note">Au-delà de 50 m — plancher bas du logement le plus haut — l'immeuble est de</text>
    <text x="14" y="522" class="fig-note">grande hauteur : articles R.122-1 et suivants du Code de la construction.</text>
    <text x="14" y="546" class="fig-note">Un parc annexe entre dans l'arrêté au-dessus de 100 m², sauf s'il compte plus de dix places louées moins de trente jours.</text>
  </svg>`;
}

/**
 * Figure 2 de l'article 6 : quels planchers, et quel degré.
 *
 * L'article énumère quatre degrés puis deux exceptions, et la phrase des
 * exceptions arrive après la liste — on la lit rarement au bon moment. La
 * figure dit la même chose en trois flèches : le plancher haut sous comble
 * communicant, ceux entre logements, celui sur vide sanitaire accessible. Ce
 * sont exactement les trois cas où l'on hésite, et les trois questions que
 * l'utilitaire pose.
 *
 * La disposition est celle du fascicule, et elle n'est pas gratuite : le dessin
 * à gauche, la bande des familles à droite, la ligne des degrés qui traverse de
 * l'un à l'autre. On lit « ce plancher-là », puis « pour cette famille-ci »,
 * d'un seul mouvement de l'œil.
 */
function figureArticle6() {
  const gauche = 76, droite = 262, sol = 296, niveau = 44;
  const d = [];
  // Une coupe minuscule : quatre niveaux, deux logements par niveau.
  for (let n = 0; n < 4; n += 1) {
    const y = sol - (n + 1) * niveau;
    d.push(`<rect x="${gauche}" y="${y}" width="${droite - gauche}" height="${niveau}" class="fig-piece"/>`);
    d.push(`<line x1="${(gauche + droite) / 2}" y1="${y}" x2="${(gauche + droite) / 2}" y2="${y + niveau}" class="fig-cloison"/>`);
  }
  // Le comble au-dessus, le vide sanitaire en dessous : ce sont eux que les
  // deux flèches extrêmes désignent.
  const faite = sol - 4 * niveau;
  d.push(`<path d="M ${gauche - 8} ${faite} L ${(gauche + droite) / 2} ${faite - 32} L ${droite + 8} ${faite}" class="fig-toit"/>`);
  d.push(`<rect x="${gauche}" y="${sol}" width="${droite - gauche}" height="22" class="fig-vide"/>`);
  d.push(`<line x1="${gauche - 10}" y1="${sol + 22}" x2="${droite + 10}" y2="${sol + 22}" class="fig-terrain"/>`);
  d.push(`<text x="${(gauche + droite) / 2}" y="${sol + 16}" class="fig-mot">vide sanitaire</text>`);
  d.push(`<text x="${(gauche + droite) / 2}" y="${faite - 12}" class="fig-mot">comble</text>`);
  // Les trois planchers visés, en trait épais : c'est ce qu'on vient chercher.
  for (const y of [faite, sol - 2 * niveau, sol]) {
    d.push(`<line x1="${gauche}" y1="${y}" x2="${droite}" y2="${y}" class="fig-plancher"/>`);
  }

  return planche({
    largeur: 900, hauteur: 450,
    titre: "STRUCTURE", sousTitre: "Planchers",
    dessin: d.join("\n    "),
    bande: { x: 566, largeur: 314, y: 16,
      enonce: "Planchers visés par l'article 6 — plafond sous comble communicant, planchers entre logements, "
        + "plancher sur vide sanitaire accessible — et le degré coupe-feu exigé par famille : un quart d'heure en "
        + "première famille pour le seul plancher haut du sous-sol, une demi-heure en deuxième, une heure en "
        + "troisième, une heure et demie en quatrième." },
    lignes: [
      { y: faite, depuis: droite, libelle: "en plafond sous comble communicant", libelleX: 280, versLaBande: false },
      { y: sol - 2 * niveau, depuis: droite, libelle: "entre logements", libelleX: 280, versLaBande: false },
      { y: sol, depuis: droite, libelle: "sur vide sanitaire accessible", libelleX: 280, versLaBande: false },
      { y: 352, libelle: "Coupe-feu CF :", libelleX: 398, libelleFinX: 500,
        valeurs: { "1": "1/4 h", "2i": "1/2 h", "2c": "1/2 h", "3A": "1 h", "3B": "1 h", "4": "1 h 30" } }
    ],
    notes: [
      "En première famille, le 1/4 h ne vise que le plancher haut du sous-sol.",
      "Exceptions : vide sanitaire NON accessible ; parois d'enveloppe montant jusqu'à la couverture."
    ]
  });
}

export const FIGURES = {
  "6": [{
    id: "art6-planchers",
    titre: "Les planchers que l'article 6 vise, et à quel degré",
    legende: "L'article énumère quatre degrés, puis deux exceptions — et la phrase des exceptions arrive "
      + "après la liste. La figure les met côte à côte : le plafond sous comble communicant, les "
      + "planchers entre logements, celui sur vide sanitaire accessible. Ce sont les trois cas où l'on "
      + "hésite, et les trois questions que l'utilitaire pose.",
    source: "d'après la FIG.2 du fascicule SOCOTEC 34.13.02.01, article 6 modifié par l'arrêté du 19 juin 2015",
    svg: figureArticle6()
  }],
  "1er": [{
    id: "art1-domaine",
    titre: "Ce à quoi l'arrêté s'applique",
    legende: "Un rond marque ce que l'article concerne. La deuxième famille tient à cheval sur « Indiv. » "
      + "et « Collectifs » : une maison individuelle de plus d'un étage et un collectif de trois étages "
      + "au plus y sont l'un et l'autre — c'est le seul endroit où les deux colonnes se rejoignent, et "
      + "aucune phrase de l'arrêté ne le dit.",
    source: "d'après la FIG.1 du fascicule SOCOTEC 34.13.01.01, modifiée par l'arrêté du 19 juin 2015",
    svg: figureArticlePremier()
  }]
};

/** Les schémas d'un article, s'il en a. */
export function figuresDe(numero) {
  const cle = String(numero ?? "").trim();
  if (FIGURES[cle]) return FIGURES[cle];
  const premier = cle.match(/^(\d+\s*bis|\d+|1er|premier)/i)?.[1];
  const normalise = /^premier$/i.test(premier ?? "") ? "1er" : premier;
  return (normalise && FIGURES[normalise]) || [];
}
