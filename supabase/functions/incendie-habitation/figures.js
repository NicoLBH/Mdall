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
 * Une bande : son intitulé à gauche, ses colonnes en tête, ses ronds en bas.
 *
 * Les ronds se posent sur les rails, pas dans les cases : c'est ainsi que le
 * fascicule les dessine, et c'est ce qui permet à la deuxième famille de tenir
 * à cheval sur « Indiv. » et « Collectifs » — deux rails, un seul chiffre.
 */
function bande({ x, y, largeur, hauteur, intitule, colonnes, marques, valeurs = null, groupes = true, motsEnTete = false }) {
  const pas = largeur / colonnes.length;
  const rail = (i) => x + pas * (i + 0.5);

  // L'en-tête se lit en trois bandeaux au plus : le regroupement, le surtitre
  // qui coiffe deux colonnes, le libellé de la colonne. Chacun a sa hauteur,
  // et l'en-tête vaut la somme de ceux qui servent.
  const hGroupe = groupes ? 24 : 0;
  const aSurtitre = colonnes.some((c) => c.surtitre);
  const hSurtitre = aSurtitre ? 22 : 0;
  const hLibelle = 26;
  const hEntete = hGroupe + hSurtitre + hLibelle;
  const yRonds = y + hEntete + (hauteur - hEntete) / 2;

  const t = [];
  t.push(`<rect x="${x}" y="${y}" width="${largeur}" height="${hauteur}" class="fig-cadre"/>`);
  t.push(`<line x1="${x}" y1="${y + hEntete}" x2="${x + largeur}" y2="${y + hEntete}" class="fig-cadre-trait"/>`);

  // Les regroupements — « Indiv. » et « Collectifs ».
  if (groupes) {
    let debut = 0;
    for (let i = 1; i <= colonnes.length; i += 1) {
      if (i < colonnes.length && colonnes[i].groupe === colonnes[debut].groupe) continue;
      const gauche = x + pas * debut;
      const droite = x + pas * i;
      t.push(`<text x="${(gauche + droite) / 2}" y="${y + 16}" class="fig-groupe">${echapper(colonnes[debut].groupe)}</text>`);
      if (i < colonnes.length) t.push(`<line x1="${droite}" y1="${y}" x2="${droite}" y2="${y + hGroupe}" class="fig-cadre-trait"/>`);
      debut = i;
    }
    t.push(`<line x1="${x}" y1="${y + hGroupe}" x2="${x + largeur}" y2="${y + hGroupe}" class="fig-cadre-trait"/>`);
  }

  // Le surtitre — le « 3 » qui coiffe A et B — et le trait qui l'en sépare.
  if (aSurtitre) {
    const groupesDeSurtitre = new Map();
    colonnes.forEach((c, i) => {
      if (!c.surtitre) return;
      groupesDeSurtitre.set(c.surtitre, [...(groupesDeSurtitre.get(c.surtitre) ?? []), i]);
    });
    for (const [surtitre, index] of groupesDeSurtitre) {
      const gauche = x + pas * index[0];
      const droite = x + pas * (index.at(-1) + 1);
      t.push(`<text x="${(gauche + droite) / 2}" y="${y + hGroupe + 17}" class="fig-colonne">${echapper(surtitre)}</text>`);
      t.push(`<line x1="${gauche}" y1="${y + hGroupe + hSurtitre}" x2="${droite}" y2="${y + hGroupe + hSurtitre}" class="fig-cadre-trait"/>`);
    }
  }

  // Les colonnes, et le rail que chacune descend jusqu'aux ronds.
  colonnes.forEach((c, i) => {
    const classe = motsEnTete || c.mot ? "fig-mot" : (c.surtitre ? "fig-sous-colonne" : "fig-colonne");
    // Une colonne sans surtitre monte son libellé dans la place laissée libre.
    const yTexte = c.surtitre
      ? y + hGroupe + hSurtitre + 19
      : y + hGroupe + (hSurtitre + hLibelle) / 2 + (motsEnTete || c.mot ? 4 : 7);
    t.push(`<text x="${rail(i)}" y="${yTexte}" class="${classe}">${echapper(c.libelle)}</text>`);
    if (!valeurs) t.push(`<line x1="${rail(i)}" y1="${y + hEntete}" x2="${rail(i)}" y2="${y + hauteur}" class="fig-rail"/>`);
    if (i > 0) {
      const yHaut = colonnes[i].surtitre && colonnes[i - 1].surtitre ? y + hGroupe + hSurtitre : y + hGroupe;
      t.push(`<line x1="${x + pas * i}" y1="${yHaut}" x2="${x + pas * i}" y2="${y + hEntete}" class="fig-cadre-trait"/>`);
    }
  });

  // Le trait d'appel, l'intitulé, et les ronds : ce que l'article concerne.
  // Le trait d'appel s'arrête au bord de la bande quand celle-ci porte des
  // valeurs : il barrerait les chiffres.
  t.push(`<line x1="${x - 48}" y1="${yRonds}" x2="${valeurs ? x : x + largeur}" y2="${yRonds}" class="fig-appel"/>`);
  t.push(`<text x="${x - 56}" y="${yRonds + 4}" class="fig-intitule">${echapper(intitule)}</text>`);
  colonnes.forEach((c, i) => {
    // Une bande porte des ronds — « l'article vise cette famille » — ou des
    // valeurs — « et voici le degré ». C'est le même dessin, et il se lit de la
    // même façon d'un article à l'autre.
    if (valeurs && valeurs[c.cle] !== undefined) {
      t.push(`<text x="${rail(i)}" y="${yRonds + 4}" class="fig-valeur">${echapper(valeurs[c.cle])}</text>`);
      return;
    }
    if (!marques.includes(c.cle)) return;
    t.push(`<circle cx="${rail(i)}" cy="${yRonds}" r="7" class="fig-rond"/>`);
  });

  return t.join("\n    ");
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
 * Trois bandes, une par objet visé, puis la même chose réunie : c'est la
 * quatrième bande qui sert de légende à tout le fascicule, et c'est elle qu'on
 * relit quand un article dit « les habitations » sans préciser lesquelles.
 */
function figureArticlePremier() {
  const x = 250;
  const largeur = 330;
  const toutes = ["1", "2i", "2c", "3A", "3B", "4"];
  return `<svg viewBox="0 0 720 610" role="img" xmlns="http://www.w3.org/2000/svg"
    aria-label="Domaine d'application de l'arrêté : bâtiments d'habitation des quatre familles, logements-foyers, parcs de stationnement annexes.">
    ${bande({ x, y: 16, largeur, hauteur: 118, intitule: "Bâtiments d'habitation",
      colonnes: COLONNES_FAMILLES, marques: toutes })}
    ${bande({ x: x + 40, y: 154, largeur: 250, hauteur: 84, intitule: "Logements-foyers",
      colonnes: COLONNES_FOYERS, marques: ["tout", "agees", "handicap"], groupes: false, motsEnTete: true })}
    ${bande({ x: x + 40, y: 258, largeur: 250, hauteur: 84, intitule: "Parcs de stationnement",
      colonnes: COLONNES_PARCS, marques: ["R", "1niv", "2niv", "plus"], groupes: false, motsEnTete: true })}
    ${bande({ x, y: 362, largeur: 450, hauteur: 118, intitule: "L'ensemble des trois",
      colonnes: [...COLONNES_FAMILLES,
        { cle: "foyers", libelle: "Foyers", groupe: "", mot: true },
        { cle: "parcs", libelle: "Parcs", groupe: "", mot: true }],
      marques: [...toutes, "foyers", "parcs"] })}

    <text x="14" y="516" class="fig-note">Au-delà de 50 m — plancher bas du logement le plus haut — l'immeuble est de</text>
    <text x="14" y="534" class="fig-note">grande hauteur : articles R.122-1 et suivants du Code de la construction.</text>
    <text x="14" y="562" class="fig-note">Un parc annexe entre dans l'arrêté au-dessus de 100 m², sauf s'il compte plus de</text>
    <text x="14" y="580" class="fig-note">dix places louées moins de trente jours à des personnes non résidentes.</text>
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
 * La bande des familles porte ici des **valeurs**, pas des ronds : c'est la
 * table de l'article, et elle se lit d'un coup.
 */
function figureArticle6() {
  // La table d'abord — c'est elle qu'on vient chercher —, la coupe ensuite.
  const bandeX = 176, bandeLargeur = 330;
  const gauche = 40, droite = 236, sol = 476, niveau = 46;

  const coupe = [];
  for (let n = 0; n < 4; n += 1) {
    const y = sol - (n + 1) * niveau;
    coupe.push(`<rect x="${gauche}" y="${y}" width="${droite - gauche}" height="${niveau}" class="fig-piece"/>`);
    coupe.push(`<line x1="${(gauche + droite) / 2}" y1="${y}" x2="${(gauche + droite) / 2}" y2="${y + niveau}" class="fig-cloison"/>`);
  }
  // Les trois planchers que l'article vise nommément — les trois cas où l'on
  // hésite, et les trois questions que l'utilitaire pose.
  const marques = [
    { y: sol - 4 * niveau, texte: "en plafond sous comble communicant" },
    { y: sol - 2 * niveau, texte: "entre logements" },
    { y: sol, texte: "sur vide sanitaire accessible" }
  ];
  for (const marque of marques) {
    coupe.push(`<line x1="${gauche}" y1="${marque.y}" x2="${droite}" y2="${marque.y}" class="fig-plancher"/>`);
    coupe.push(`<line x1="${droite}" y1="${marque.y}" x2="${droite + 16}" y2="${marque.y}" class="fig-appel"/>`);
    coupe.push(`<text x="${droite + 22}" y="${marque.y + 4}" class="fig-note">${echapper(marque.texte)}</text>`);
  }
  coupe.push(`<line x1="${gauche - 12}" y1="${sol + 20}" x2="${droite + 12}" y2="${sol + 20}" class="fig-terrain"/>`);
  coupe.push(`<text x="${gauche}" y="${sol - 4 * niveau - 12}" class="fig-note">comble</text>`);

  return `<svg viewBox="0 0 660 520" role="img" xmlns="http://www.w3.org/2000/svg"
    aria-label="Planchers visés par l'article 6 — plafond sous comble communicant, planchers entre logements, plancher sur vide sanitaire accessible — et le degré coupe-feu exigé par famille : un quart d'heure en première famille pour le seul plancher haut du sous-sol, une demi-heure en deuxième, une heure en troisième, une heure et demie en quatrième.">
    ${bande({ x: bandeX, y: 16, largeur: bandeLargeur, hauteur: 116, intitule: "Coupe-feu CF :",
      colonnes: COLONNES_FAMILLES, marques: [],
      valeurs: { "1": "1/4 h", "2i": "1/2 h", "2c": "1/2 h", "3A": "1 h", "3B": "1 h", "4": "1 h 30" } })}
    <text x="24" y="164" class="fig-note">En première famille, le quart d'heure ne vise que le plancher haut du sous-sol : ailleurs,</text>
    <text x="24" y="182" class="fig-note">l'article n'exige rien.</text>
    <text x="24" y="210" class="fig-note">Deux exceptions à toute la table : les planchers sur vide sanitaire NON accessible, et le</text>
    <text x="24" y="228" class="fig-note">plancher haut du dernier niveau lorsque les parois de l'enveloppe des logements sont</text>
    <text x="24" y="246" class="fig-note">prolongées jusqu'à la couverture.</text>
    ${coupe.join("\n    ")}
  </svg>`;
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
