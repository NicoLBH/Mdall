/**
 * Titre II — structures et enveloppe des bâtiments d'habitation.
 *
 * ## Ce que ces modules ont en commun
 *
 * Presque tous se réduisent à un tableau « famille → degré », et c'est
 * exactement ce que le texte fait. Ils ne demandent donc rien d'autre que la
 * famille — qui, elle, a coûté douze questions. C'est la forme du référentiel :
 * une racine chère, des branches bon marché.
 *
 * ## Sauf là où une phrase cache une condition
 *
 * L'article 6 n'exige rien de la première famille sinon du plancher haut du
 * sous-sol : sans sous-sol, l'exigence est sans objet, et rendre « 1/4 h » sans
 * le dire ferait ferrailler un plancher que le texte ne vise pas. L'article 12
 * ouvre une exception à trois conditions dans une seule phrase. L'article 15
 * fait dépendre le sort des revêtements M1 à M3 de la nature de leur support.
 * Ce sont ces phrases-là qui font la valeur de l'utilitaire : les tableaux, on
 * les connaît par cœur.
 */

const ARR = "arrêté du 31 janvier 1986 modifié";
const reglement = (article, paragraphe, citation) => ({ nature: "reglement", texte: ARR, article, paragraphe, citation });

/* ------------------------------------------------------------------ *
 * Article 5 — éléments porteurs verticaux
 * ------------------------------------------------------------------ */

export const porteursVerticaux = {
  id: "porteurs-verticaux",
  titre: "Stabilité au feu des éléments porteurs verticaux",
  repond: "Quel degré de stabilité au feu les éléments porteurs verticaux doivent-ils présenter ?",
  produit: "porteursVerticauxStabilite",
  source: { article: "5" },
  regles: [
    { si: { famille: "1" }, alors: { valeur: "SF 1/4 h", mention: MENTION_ART5() },
      source: reglement("5", "premier alinéa", "habitations de la première famille : 1/4 heure ;") },
    { si: { famille: "2" }, alors: { valeur: "SF 1/2 h", mention: MENTION_ART5() },
      source: reglement("5", "premier alinéa", "habitations de la 2ème famille : 1/2 heure ;") },
    { si: { famille: "3" }, alors: { valeur: "SF 1 h", mention: MENTION_ART5() },
      source: reglement("5", "premier alinéa", "habitations de la 3ème famille : 1 heure ;") },
    { si: { famille: "4" }, alors: { valeur: "SF 1 h 30", mention: MENTION_ART5() },
      source: reglement("5", "premier alinéa", "habitations de la 4ème famille : 1 heure 30.") }
  ]
};

/**
 * Les deux réserves de l'article 5, portées sur chaque degré.
 *
 * Elles ne changent pas le chiffre, elles changent ce à quoi il s'applique :
 * une charpente de toiture n'est pas concernée, et un porteur de façade ne
 * l'est que vis-à-vis d'un feu intérieur. Les taire ferait exiger un degré là
 * où le texte n'en demande aucun.
 */
function MENTION_ART5() {
  return "En façade ou en pignon, ce degré n'est exigé que vis-à-vis d'un feu se développant depuis "
    + "l'intérieur du bâtiment (article 5, deuxième alinéa). L'article ne s'applique pas aux éléments "
    + "de charpente des toitures (dernier alinéa).";
}

export const porteursBalconsCoursives = {
  id: "porteurs-balcons-coursives",
  titre: "Porteurs des balcons, coursives et circulations à l'air libre",
  repond: "Quel degré pour les porteurs des balcons à structures indépendantes, coursives, passerelles et circulations à l'air libre ?",
  produit: "porteursExterieursStabilite",
  source: { article: "5", paragraphe: "troisième alinéa" },
  regles: [
    {
      si: { natureHabitation: "collective", famille: ["2", "3", "4"] },
      alors: { valeur: "SF 1/2 h ou R 30",
        mention: "Cette résistance au feu peut également être justifiée à partir des actions thermiques aux structures extérieures déterminées selon la méthode de la norme NF EN 1991-1-2 et de son annexe nationale." },
      source: reglement("5", "troisième alinéa", "Dans les bâtiments d'habitation collectifs de la deuxième, de la troisième et de la quatrième famille, les éléments porteurs verticaux des balcons à structures indépendantes, des coursives, passerelles extérieures et circulations à l'air libre sont stables au feu une demi-heure ou de classement R 30.")
    },
    {
      si: { famille: { renseigne: true } },
      alors: { valeur: "sans objet",
        sansObjet: "Cet alinéa ne vise que les bâtiments d'habitation collectifs des deuxième, troisième et quatrième familles." },
      source: reglement("5", "troisième alinéa", "Dans les bâtiments d'habitation collectifs de la deuxième, de la troisième et de la quatrième famille…")
    }
  ]
};

/* ------------------------------------------------------------------ *
 * Article 6 — planchers
 * ------------------------------------------------------------------ */

export const planchers = {
  id: "planchers",
  titre: "Degré coupe-feu des planchers",
  repond: "Quel degré coupe-feu les planchers doivent-ils présenter ?",
  produit: "planchersCoupeFeu",
  source: { article: "6" },
  regles: [
    {
      // La phrase de la première famille ne dit pas « les planchers » : elle dit
      // « 1/4 heure pour le plancher haut du sous-sol ». Sans sous-sol, l'article
      // n'exige rien — et c'est une conclusion, pas une lacune.
      si: { famille: "1", sousSol: false },
      alors: { valeur: null,
        sansObjet: "En première famille, l'article 6 ne vise que le plancher haut du sous-sol. Le bâtiment n'en comporte pas : cet article n'exige aucun degré." },
      source: reglement("6", "premier alinéa, premier tiret", "habitations de la première famille : 1/4 heure pour le plancher haut du sous-sol ;")
    },
    {
      si: { famille: "1", sousSol: true },
      alors: { valeur: "CF 1/4 h",
        mention: "Exigé du seul plancher haut du sous-sol. Les autres planchers ne sont pas visés par cet article en première famille." },
      source: reglement("6", "premier alinéa, premier tiret", "habitations de la première famille : 1/4 heure pour le plancher haut du sous-sol ;")
    },
    { si: { famille: "2" }, alors: { valeur: "CF 1/2 h", mention: MENTION_ART6() },
      source: reglement("6", "premier alinéa, deuxième tiret", "habitations de la 2ème famille : 1/2 heure ;") },
    { si: { famille: "3" }, alors: { valeur: "CF 1 h", mention: MENTION_ART6() },
      source: reglement("6", "premier alinéa, troisième tiret", "habitations de la 3ème famille : 1 heure ;") },
    { si: { famille: "4" }, alors: { valeur: "CF 1 h 30", mention: MENTION_ART6() },
      source: reglement("6", "premier alinéa, quatrième tiret", "habitations de la 4ème famille : 1 heure 30.") }
  ]
};

function MENTION_ART6() {
  return "Les planchers établis à l'intérieur d'un même logement ne sont pas visés (article 6, premier alinéa).";
}

export const planchersExclus = {
  id: "planchers-exclus",
  titre: "Planchers exclus de l'exigence de l'article 6",
  repond: "Ce plancher échappe-t-il à l'exigence de l'article 6 ?",
  produit: "plancherExclu",
  source: { article: "6", paragraphe: "deuxième alinéa" },
  regles: [
    {
      si: { planchersSurVideSanitaireNonAccessible: true },
      alors: { valeur: "exclu", mention: "Plancher situé au-dessus d'un vide sanitaire non accessible." },
      source: reglement("6", "deuxième alinéa, premier tiret", "Cette prescription ne s'applique pas : aux planchers situés au-dessus d'un vide sanitaire non accessible ;")
    },
    {
      si: { paroisLogementProlongeesJusquACouverture: true },
      alors: { valeur: "exclu au dernier niveau habitable",
        mention: "Sont exclus les planchers hauts, faux planchers ou plafonds du dernier niveau habitable, les parois verticales de l'enveloppe des logements visées à l'article 8 étant prolongées jusqu'à la couverture." },
      source: reglement("6", "deuxième alinéa, second tiret", "(Arrêté du 18 août 1986) aux planchers hauts, aux faux planchers ou plafonds du dernier niveau habitable lorsque les parois verticales de l'enveloppe des logements, visées à l'article 8 ci-après, sont prolongées jusqu'à la couverture du bâtiment.")
    },
    {
      si: { planchersSurVideSanitaireNonAccessible: false, paroisLogementProlongeesJusquACouverture: false },
      alors: { valeur: "non exclu" },
      source: reglement("6", "deuxième alinéa", "Cette prescription ne s'applique pas : […]")
    }
  ]
};

export const planchersCirculationsExterieures = {
  id: "planchers-circulations-exterieures",
  titre: "Planchers des coursives, passerelles et circulations à l'air libre",
  repond: "Quel degré pour les planchers des coursives, passerelles extérieures et circulations à l'air libre ?",
  produit: "planchersExterieursResistance",
  source: { article: "6", paragraphe: "avant-dernier alinéa" },
  regles: [
    {
      si: { coursivesPasserellesOuCirculationsAAirLibre: false },
      alors: { valeur: "sans objet", sansObjet: "Le bâtiment n'en comporte pas." },
      source: reglement("6", "avant-dernier alinéa", "Les planchers des coursives, passerelles extérieures et circulations à l'air libre, reliant les logements aux escaliers ou permettant de quitter l'immeuble, présentent les degrés de résistance au feu ou classement ci-après :")
    },
    {
      si: { coursivesPasserellesOuCirculationsAAirLibre: true, famille: "1" },
      alors: { valeur: "PF 1/4 h ou RE 15", mention: MENTION_EN1991() },
      source: reglement("6", "avant-dernier alinéa, premier tiret", "bâtiments d'habitation de la première famille : pare-flammes un quart d'heure ou RE 15 ;")
    },
    {
      si: { coursivesPasserellesOuCirculationsAAirLibre: true, famille: ["2", "3", "4"] },
      alors: { valeur: "PF 1/2 h ou RE 30", mention: MENTION_EN1991() },
      source: reglement("6", "avant-dernier alinéa, second tiret", "bâtiments d'habitation de la deuxième, de la troisième et de la quatrième famille : pare-flammes une demi-heure ou RE 30.")
    }
  ]
};

function MENTION_EN1991() {
  return "Cette résistance au feu peut également être justifiée à partir des actions thermiques aux "
    + "structures extérieures déterminées selon la méthode de la norme NF EN 1991-1-2 et de son annexe nationale.";
}

/* ------------------------------------------------------------------ *
 * Article 7 — recoupement des bâtiments de grande longueur
 * ------------------------------------------------------------------ */

export const recoupement45m = {
  id: "recoupement-45m",
  titre: "Mur de recoupement tous les 45 m",
  repond: "Quel degré coupe-feu pour le mur de recoupement, et est-il exigé ?",
  produit: "murRecoupementCoupeFeu",
  source: { article: "7" },
  regles: [
    {
      si: { groupementEnBandeOuGrandeLongueur: false },
      alors: { valeur: "sans objet",
        sansObjet: "L'article 7 ne vise que les groupements en bande de maisons individuelles et les bâtiments de grande longueur." },
      source: reglement("7", "premier alinéa", "Les groupements en bande de maisons individuelles et les bâtiments de grande longueur doivent être recoupés au moins tous les 45 m…")
    },
    {
      si: { groupementEnBandeOuGrandeLongueur: true, longueurDuBatiment: { auPlus: 45 } },
      alors: { valeur: "aucun recoupement exigé",
        sansObjet: "Le recoupement est exigé au moins tous les 45 m : la longueur du bâtiment n'atteint pas cette valeur." },
      source: reglement("7", "premier alinéa", "…doivent être recoupés au moins tous les 45 m par un mur coupe-feu…")
    },
    { si: { groupementEnBandeOuGrandeLongueur: true, famille: "1" }, alors: { valeur: "CF 1/2 h" },
      source: reglement("7", "premier alinéa", "…par un mur coupe-feu de degré 1/2 heure pour les habitations de la première famille…") },
    { si: { groupementEnBandeOuGrandeLongueur: true, famille: "2" }, alors: { valeur: "CF 1 h" },
      source: reglement("7", "premier alinéa", "…de degré 1 heure pour les habitations de la 2ème famille…") },
    { si: { groupementEnBandeOuGrandeLongueur: true, famille: ["3", "4"] }, alors: { valeur: "CF 1 h 30" },
      source: reglement("7", "premier alinéa", "…et de degré 1 heure 30 pour celles des 3ème et 4ème familles.") }
  ]
};

export const franchissementRecoupement = {
  id: "franchissement-recoupement",
  titre: "Franchissement du mur de recoupement",
  repond: "Quel degré pour le bloc-porte ou le dispositif de franchissement du mur de recoupement ?",
  produit: "franchissementRecoupementCoupeFeu",
  source: { article: "7", paragraphe: "deuxième alinéa" },
  regles: [
    {
      si: { murRecoupementCoupeFeu: ["sans objet", "aucun recoupement exigé"] },
      alors: { valeur: "sans objet", sansObjet: "Aucun mur de recoupement n'est exigé par l'article 7." },
      source: reglement("7", "deuxième alinéa", "Ce mur peut comporter des ouvertures munies d'un bloc-porte avec ferme-porte ou de tout autre dispositif de franchissement…")
    },
    { si: { famille: "4" }, alors: { valeur: "CF 1 h", mention: "Bloc-porte avec ferme-porte, ou tout autre dispositif de franchissement." },
      source: reglement("7", "deuxième alinéa", "…coupe-feu de degré 1 heure pour la 4ème famille, 1/2 heure dans les autres cas.") },
    { si: { famille: ["1", "2", "3"] }, alors: { valeur: "CF 1/2 h", mention: "Bloc-porte avec ferme-porte, ou tout autre dispositif de franchissement." },
      source: reglement("7", "deuxième alinéa", "…coupe-feu de degré 1 heure pour la 4ème famille, 1/2 heure dans les autres cas.") }
  ]
};

/* ------------------------------------------------------------------ *
 * Article 8 — parois
 * ------------------------------------------------------------------ */

export const paroisSeparatives = {
  id: "parois-separatives",
  titre: "Parois séparatives des habitations individuelles",
  repond: "Quel degré coupe-feu pour la paroi séparant deux habitations individuelles ?",
  produit: "paroisSeparativesCoupeFeu",
  source: { article: "8", paragraphe: "premier alinéa" },
  regles: [
    {
      si: { natureHabitation: "individuelle", famille: ["1", "2"], implantation: ["jumelee", "bande"] },
      alors: { valeur: "CF 1/4 h" },
      source: reglement("8", "premier alinéa", "Les parois séparatives des habitations individuelles des première et 2ème familles jumelées ou réunies en bande doivent être coupe-feu de degré 1/4 heure.")
    },
    {
      si: { famille: { renseigne: true } },
      alors: { valeur: "sans objet",
        sansObjet: "Cet alinéa ne vise que les habitations individuelles des première et deuxième familles, jumelées ou réunies en bande." },
      source: reglement("8", "premier alinéa", "Les parois séparatives des habitations individuelles des première et 2ème familles jumelées ou réunies en bande…")
    }
  ]
};

export const paroisEnveloppeLogement = {
  id: "parois-enveloppe-logement",
  titre: "Parois verticales de l'enveloppe du logement",
  repond: "Quel degré coupe-feu pour les parois verticales de l'enveloppe du logement ?",
  produit: "paroisEnveloppeCoupeFeu",
  source: { article: "8", paragraphe: "deuxième alinéa" },
  regles: [
    {
      si: { natureHabitation: "collective", famille: "2" },
      alors: { valeur: "CF 1/2 h", mention: MENTION_ART8() },
      source: reglement("8", "deuxième alinéa, premier tiret", "À l'exclusion des façades, les parois verticales de l'enveloppe du logement doivent être : coupe-feu de degré 1/2 heure pour les habitations collectives de la 2ème famille et pour les habitations de la 3ème famille ;")
    },
    {
      si: { famille: "3" },
      alors: { valeur: "CF 1/2 h", mention: MENTION_ART8() },
      source: reglement("8", "deuxième alinéa, premier tiret", "…coupe-feu de degré 1/2 heure pour les habitations collectives de la 2ème famille et pour les habitations de la 3ème famille ;")
    },
    {
      si: { famille: "4" },
      alors: { valeur: "CF 1 h", mention: MENTION_ART8() },
      source: reglement("8", "deuxième alinéa, second tiret", "coupe-feu de degré 1 heure pour les habitations de la 4ème famille.")
    },
    {
      si: { famille: { renseigne: true } },
      alors: { valeur: "sans objet",
        sansObjet: "Cet alinéa ne vise ni la première famille, ni les habitations individuelles de la deuxième famille." },
      source: reglement("8", "deuxième alinéa", "À l'exclusion des façades, les parois verticales de l'enveloppe du logement doivent être : […]")
    }
  ]
};

function MENTION_ART8() {
  return "Les façades sont exclues de cette exigence. Ces prescriptions peuvent concerner les celliers "
    + "individuels d'étage dans la mesure où ils ne sont pas regroupés — point de vue SOCOTEC, article 8.";
}

export const blocsPortesPalieres = {
  id: "blocs-portes-palieres",
  titre: "Blocs-portes palières",
  repond: "Quel degré pour les blocs-portes palières desservant les logements ?",
  produit: "blocPortePaliereResistance",
  source: { article: "8", paragraphe: "troisième alinéa" },
  regles: [
    {
      si: { natureHabitation: "collective", famille: "2" },
      alors: { valeur: "PF 1/4 h" },
      source: reglement("8", "troisième alinéa", "Les blocs-portes palières desservant les logements des habitations collectives de la 2ème famille et des habitations de la 3ème famille doivent être pare-flammes de degré 1/4 d'heure…")
    },
    {
      si: { famille: "3" },
      alors: { valeur: "PF 1/4 h" },
      source: reglement("8", "troisième alinéa", "…des habitations collectives de la 2ème famille et des habitations de la 3ème famille doivent être pare-flammes de degré 1/4 d'heure…")
    },
    {
      si: { famille: "4" },
      alors: { valeur: "PF 1/2 h" },
      source: reglement("8", "troisième alinéa", "…les blocs-portes palières desservant les logements des habitations de la 4ème famille doivent être pare-flammes de degré 1/2 heure.")
    },
    {
      si: { famille: { renseigne: true } },
      alors: { valeur: "sans objet",
        sansObjet: "Cet alinéa ne vise ni la première famille, ni les habitations individuelles de la deuxième famille : elles n'ont pas de porte palière au sens de cet article." },
      source: reglement("8", "troisième alinéa", "Les blocs-portes palières desservant les logements des habitations collectives de la 2ème famille…")
    }
  ]
};

/* ------------------------------------------------------------------ *
 * Article 10 — celliers et caves regroupés
 * ------------------------------------------------------------------ */

export const celliersParois = {
  id: "celliers-parois",
  titre: "Parois séparant les ensembles de celliers ou caves",
  repond: "Quel degré coupe-feu pour les parois séparant l'ensemble de celliers du reste de l'immeuble ?",
  produit: "celliersParoisCoupeFeu",
  source: { article: "10", paragraphe: "premier alinéa" },
  regles: [
    {
      si: { celliersOuCavesRegroupes: false },
      alors: { valeur: "sans objet", sansObjet: "Le bâtiment ne comporte pas d'ensemble regroupant des celliers ou caves indépendants des logements." },
      source: reglement("10", "premier alinéa", "Les ensembles regroupant des celliers ou caves indépendants des logements, aménagés en étage, rez-de-chaussée ou sous-sol, doivent être séparés des autres parties de l'immeuble par des parois coupe-feu de degré 1 heure en 3ème et 4ème familles.")
    },
    {
      si: { celliersOuCavesRegroupes: true, famille: ["3", "4"] },
      alors: { valeur: "CF 1 h" },
      source: reglement("10", "premier alinéa", "…doivent être séparés des autres parties de l'immeuble par des parois coupe-feu de degré 1 heure en 3ème et 4ème familles.")
    },
    {
      si: { celliersOuCavesRegroupes: true, famille: ["1", "2"] },
      alors: { valeur: "aucun degré exigé par cet alinéa",
        mention: "Le degré coupe-feu de 1 heure n'est exigé qu'en troisième et quatrième familles. Les exigences de bloc-porte, de trajet et de recoupement de l'article 10 restent applicables." },
      source: reglement("10", "premier alinéa", "…par des parois coupe-feu de degré 1 heure en 3ème et 4ème familles.")
    }
  ]
};

/**
 * Les blocs-portes de l'article 10.
 *
 * Deux phrases se suivent : la première réserve son exigence aux 3ᵉ et 4ᵉ
 * familles, la seconde n'en réserve aucune. Lire la seconde à la lumière de la
 * première serait une facilité : le texte dit « les blocs-portes de ces
 * ensembles doivent être coupe-feu de degré 1/2 heure », sans famille. On le
 * rend tel quel, et l'écran cite la phrase pour qu'on puisse en juger.
 */
export const celliersBlocsPortes = {
  id: "celliers-blocs-portes",
  titre: "Blocs-portes des ensembles de celliers ou caves",
  repond: "Quel degré pour les blocs-portes de l'ensemble de celliers ou caves ?",
  produit: "celliersBlocPorteCoupeFeu",
  source: { article: "10", paragraphe: "deuxième alinéa" },
  regles: [
    {
      si: { celliersOuCavesRegroupes: false },
      alors: { valeur: "sans objet", sansObjet: "Le bâtiment ne comporte pas d'ensemble regroupant des celliers ou caves." },
      source: reglement("10", "deuxième alinéa", "Les blocs-portes de ces ensembles doivent être coupe-feu de degré 1/2 heure…")
    },
    {
      si: { celliersOuCavesRegroupes: true },
      alors: { valeur: "CF 1/2 h",
        mention: "Ouvrant dans le sens de la sortie en venant des celliers ou des caves, munis d'un ferme-porte et ouvrables sans clé de l'intérieur. Le trajet entre la porte du cellier la plus éloignée et la porte de sortie de l'ensemble est au plus de 20 m. L'ensemble est recoupé en autant de volumes qu'il y a de cages d'escalier le desservant, par des parois CF 1 h à portes PF 1/2 h munies de ferme-porte." },
      source: reglement("10", "deuxième alinéa", "Les blocs-portes de ces ensembles doivent être coupe-feu de degré 1/2 heure, ouvrir dans le sens de la sortie en venant des celliers ou des caves, être munis d'un ferme-porte et ouvrables sans clé de l'intérieur.")
    }
  ]
};

/* ------------------------------------------------------------------ *
 * Article 12 — revêtements des façades
 * ------------------------------------------------------------------ */

export const parementsFacade = {
  id: "parements-facade",
  titre: "Parements extérieurs des façades",
  repond: "Quel classement de réaction au feu les parements extérieurs doivent-ils présenter ?",
  produit: "parementExterieurClasse",
  source: { article: "12" },
  regles: [
    {
      // L'exception du deuxième alinéa tient dans une phrase, et elle porte
      // trois conditions : isolée, système classé E sur les parties pleines, et
      // plus de quatre mètres jusqu'à la limite de propriété. Les trois.
      si: {
        famille: "1", natureHabitation: "individuelle", implantation: "isolee",
        facadePartiesPleinesSystemeClasseE: true,
        distanceLimiteDePropriete: { plusDe: 4 }
      },
      alors: { valeur: "exception ouverte — système de façade classé E admis",
        mention: "Exception réservée aux habitations individuelles isolées de la première famille, pour la façade concernée." },
      source: reglement("12", "A, deuxième alinéa", "Toutefois pour les habitations individuelles isolées de la première famille, il pourra être fait exception à cette règle lorsque la façade, dont les parties pleines sont revêtues d'un système de façade classé E, se trouve à plus de quatre mètres de la limite de propriété.")
    },
    {
      si: { famille: "1" },
      alors: { valeur: "au moins D-s3, d0, ou en bois" },
      source: reglement("12", "A, premier alinéa", "Pour les habitations de la première famille, les parements extérieurs doivent être classés au moins D-s3, d0, ou en bois.")
    },
    {
      si: { famille: "2" },
      alors: { valeur: "au moins D-s3, d0" },
      source: reglement("12", "B", "Pour les habitations de la deuxième famille, les parements extérieurs doivent être classés au moins D-s3, d0.")
    },
    {
      si: { famille: ["3", "4"] },
      alors: { valeur: "voir article 13",
        mention: "Les systèmes de façade des troisième et quatrième familles relèvent de l'article 13, qui ouvre plusieurs solutions et n'est pas porté dans cette version de l'utilitaire." },
      source: reglement("13", "A et B", "Pour l'application de cet article un système de façade comprend les couches successives de matériaux du nu extérieur jusqu'au nu intérieur de la façade…")
    }
  ]
};

/* ------------------------------------------------------------------ *
 * Article 15 — couvertures
 * ------------------------------------------------------------------ */

export const couverture = {
  id: "couverture",
  titre: "Couverture — classe de pénétration",
  repond: "Quelle classe de pénétration la couverture doit-elle présenter ?",
  produit: "couvertureClassePenetration",
  source: { article: "15" },
  regles: [
    {
      // Le a) affranchit M1, M2 et M3 de toute restriction — mais seulement sur
      // un support continu incombustible ou en bois. Sur un autre support, ces
      // revêtements retombent sur la règle des M4 : c'est ce renvoi, en fin
      // d'alinéa, qui décide.
      si: { revetementCouvertureClasse: ["M1", "M2", "M3"], supportCouvertureContinuIncombustible: true },
      alors: { valeur: "aucune restriction",
        mention: "Support continu en matériau incombustible, en panneaux de bois, d'aggloméré de fibres de bois ou matériau reconnu équivalent par le Comité d'étude et de classification des matériaux et éléments de construction par rapport au danger d'incendie (Cecmi)." },
      source: reglement("15", "a", "Les revêtements de couvertures classés en catégorie M1, M2 ou M3 peuvent être utilisés sans restriction s'ils sont établis sur un support continu en matériau incombustible ou en panneaux de bois, d'aggloméré de fibres de bois ou matériau reconnu équivalent par le Comité d'étude et de classification des matériaux et éléments de construction par rapport au danger d'incendie (Cecmi).")
    },
    {
      si: { famille: "1" },
      alors: { valeur: "T 5, T 15 ou T 30", mention: MENTION_ART15() },
      source: reglement("15", "b", "La classe de pénétration de ces couvertures doit être : habitation de la première famille : T 5 ou T 15 ou T 30 ;")
    },
    {
      si: { famille: "2" },
      alors: { valeur: "T 15 ou T 30", mention: MENTION_ART15() },
      source: reglement("15", "b", "habitation de la 2ème famille : T 15 ou T 30 ;")
    },
    {
      si: { famille: ["3", "4"] },
      alors: { valeur: "T 30", mention: MENTION_ART15() },
      source: reglement("15", "b", "habitation des 3ème et 4ème familles : T 30.")
    }
  ]
};

function MENTION_ART15() {
  return "S'ajoute un indice de propagation, déterminé selon le tableau de l'article 15 en fonction de "
    + "la distance à l'immeuble voisin ou à la limite de propriété et de l'indice de la couverture voisine "
    + "— non porté dans cette version de l'utilitaire.";
}

/* ------------------------------------------------------------------ *
 * Article 45 — conduits et gaines
 * ------------------------------------------------------------------ */

export const conduitsEtGaines = {
  id: "conduits-et-gaines",
  titre: "Conduits et gaines",
  repond: "Quelles exigences pèsent sur les conduits et gaines ?",
  produit: "conduitsExigence",
  source: { article: "45" },
  regles: [
    {
      si: { conduitsOuGainesTraversantDesParois: false },
      alors: { valeur: "sans objet", sansObjet: "Aucun conduit ni gaine déclaré." },
      source: reglement("45", null, "Pour les conduits et gaines aménagés dans les bâtiments individuels de première et 2ème familles, aucune prescription n'est imposée.")
    },
    {
      si: { natureHabitation: "individuelle", famille: ["1", "2"] },
      alors: { valeur: "aucune prescription" },
      source: reglement("45", null, "Pour les conduits et gaines aménagés dans les bâtiments individuels de première et 2ème familles, aucune prescription n'est imposée.")
    },
    {
      si: { famille: { renseigne: true } },
      alors: { valeur: "coupe-feu de traversée",
        mention: "Soit par l'emploi de conduits et gaines assurant un « coupe-feu de traversée » d'une durée au moins égale au degré de résistance au feu de la paroi traversée, avec un maximum de 60 minutes, soit par les autres moyens de l'article 45 — non détaillés dans cette version de l'utilitaire." },
      source: reglement("45", null, "Pour les conduits et gaines dans les bâtiments collectifs de 2ème famille et les bâtiments des 3ème et 4ème familles, les objectifs définis ci-dessus peuvent être atteints : soit par l'emploi de conduits et gaines assurant un « coupe-feu de traversée » d'une durée au moins égale au degré de résistance au feu de la paroi traversée avec un maximum de 60 minutes ; […]")
    }
  ]
};

export const MODULES_STRUCTURES = [
  porteursVerticaux, porteursBalconsCoursives,
  planchers, planchersExclus, planchersCirculationsExterieures,
  recoupement45m, franchissementRecoupement,
  paroisSeparatives, paroisEnveloppeLogement, blocsPortesPalieres,
  celliersParois, celliersBlocsPortes,
  parementsFacade, couverture, conduitsEtGaines
];
