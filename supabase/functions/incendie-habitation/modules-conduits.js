/**
 * Titre IV — conduits et gaines.
 *
 * ## Ce que ce titre a de particulier
 *
 * Il ne parle pas du bâtiment mais de ce qui le traverse, et il classe par
 * **matériau** autant que par famille. Un conduit M1 de 100 mm n'a pas les
 * mêmes obligations qu'un conduit M3 du même diamètre, ni qu'un conduit M1 de
 * 150 mm — et le commentaire du ministère précise expressément qu'il n'y a
 * « pas d'atténuation des prescriptions pour les conduits classés M1 d'un
 * diamètre supérieur à 125 mm par rapport aux conduits classés M2 à M4 ».
 * C'est le premier endroit du référentiel où deux caractéristiques d'un même
 * objet se croisent pour décider.
 *
 * ## Le tableau de l'article 54
 *
 * Deux entrées — la famille et la situation de la gaine — et deux cases qui ne
 * disent pas un degré mais « solution interdite ». Une interdiction n'est pas
 * un degré nul : elle se lit, se cite, et porte sa propre exception (elle est
 * admise si l'escalier est « à l'air libre »). Un tableau rendu en degrés
 * l'aurait perdue.
 */

const ARR = "arrêté du 31 janvier 1986 modifié";
const reglement = (article, paragraphe, citation) => ({ nature: "reglement", texte: ARR, article, paragraphe, citation });
/**
 * Ce que l'article veut dire, quand ce n'est pas ce qu'il dit.
 *
 * Certaines règles ne citent pas : elles lisent. « Le régime appliqué est celui
 * du classement, à défaut de décision municipale de déclassement » ne figure
 * nulle part dans l'article 3 — c'est ce qu'il faut en comprendre, et il n'y a
 * pas de phrase à mettre entre guillemets. Le dire est plus honnête que de
 * fabriquer une citation qui ne résisterait pas à l'ouverture du texte.
 */
const lecture = (article, paragraphe, enonce) => ({ nature: "lecture", texte: ARR, article, paragraphe, citation: enonce });
const questionReponse = (article, origine, citation) => ({ nature: "commentaire", texte: origine, article, paragraphe: "question/réponse", citation });

/* ================================================================== *
 * CHAPITRE PREMIER — PRESCRIPTIONS GÉNÉRALES (articles 44 à 49)
 * ================================================================== */

/**
 * Comment un conduit qui met en communication deux niveaux doit être tenu.
 *
 * Trois régimes, et c'est le croisement matériau × diamètre qui décide : nu
 * sous conditions (article 46), en coffrage (article 47), ou en gaine coupe-feu
 * (article 48). Les deux premiers sont des tolérances étroites ; le troisième
 * est la règle.
 */
export const conduitEntreNiveaux = {
  id: "conduit-entre-niveaux",
  titre: "Conduit mettant en communication des niveaux différents",
  repond: "Le conduit doit-il être en gaine, en coffrage, ou peut-il rester nu ?",
  produit: "conduitEntreNiveaux",
  source: { article: "46" },
  regles: [
    {
      si: { conduitsOuGainesTraversantDesParois: false },
      alors: { valeur: "sans objet", sansObjet: "Aucun conduit ni gaine déclaré." },
      source: reglement("46", null, "Les conduits mettant en communication des niveaux différents ne sont pas nécessairement incorporés dans une gaine lorsqu'ils sont situés dans les logements ou des circulations horizontales communes…")
    },
    {
      si: { natureHabitation: "individuelle", famille: ["1", "2"] },
      alors: { valeur: "aucune prescription",
        mention: "Il n'y a pas non plus de prescription quand deux niveaux successifs appartiennent au même logement (ministère de l'Équipement, 23 décembre 1986)." },
      source: reglement("45", null, "Pour les conduits et gaines aménagés dans les bâtiments individuels de première et 2ème familles, aucune prescription n'est imposée.")
    },
    {
      // L'article 46 ouvre la tolérance la plus large, et il l'enferme dans
      // quatre conditions cumulatives : l'emplacement, le matériau, le
      // diamètre, et le rebouchage sur toute l'épaisseur du plancher.
      si: {
        conduitDansLogementOuCirculationCommune: true,
        classeReactionConduit: ["incombustible", "M1"],
        diametreConduit: { auPlus: 125 }
      },
      alors: { valeur: "peut rester nu",
        mention: "À condition que l'espace libre autour des conduits soit rebouché à chaque niveau, sur toute l'épaisseur du plancher, par des matériaux incombustibles. Le PVC M1 doit être avec renforcement." },
      source: reglement("46", null, "Les conduits mettant en communication des niveaux différents ne sont pas nécessairement incorporés dans une gaine lorsqu'ils sont situés dans les logements ou des circulations horizontales communes et réalisés en matériaux incombustibles ou en PVC M1 avec renforcement, d'un diamètre au plus égal à 125 mm et à condition que l'espace libre autour des conduits à chaque niveau soit rebouché sur toute l'épaisseur du plancher par des matériaux incombustibles.")
    },
    {
      si: { classeReactionConduit: ["incombustible", "M1"], diametreConduit: { auPlus: 125 } },
      alors: { valeur: "coffrage admis",
        mention: "Un coffrage répond à des préoccupations d'ordre esthétique : ses parois ne présentent aucune qualité de résistance au feu. Son recoupement est obligatoire à tous les niveaux, en matériaux incombustibles occupant toute l'épaisseur du plancher autour des conduits." },
      source: reglement("47", null, "Les conduits, y compris les calorifugeages éventuels, réalisés en matériaux de catégorie M1, les canalisations constamment en charge d'eau réalisées en matériaux M4, les canalisations à passage d'eau intermittent réalisées en matériaux de catégorie M1, d'un diamètre au plus égal à 125 mm peuvent être contenus dans un coffrage.")
    },
    {
      si: { natureHabitation: "collective", famille: "2" },
      alors: { valeur: "gaine CF 1/2 h exigée", mention: MENTION_ART48() },
      source: reglement("48", "premier alinéa", "Les conduits, y compris les calorifugeages éventuels, réalisés en matériaux des catégories M2 à M4 doivent, sauf exception visée à l'article 49 ci-après, être contenus dans une gaine dont les parois sont coupe-feu de degré 1/2 heure dans les habitations collectives de la 2ème famille et dans les habitations des 3ème et 4ème familles, que le feu se situe à l'intérieur ou à l'extérieur de la gaine.")
    },
    {
      si: { famille: ["3", "4"] },
      alors: { valeur: "gaine CF 1/2 h exigée", mention: MENTION_ART48() },
      source: reglement("48", "premier alinéa", "…être contenus dans une gaine dont les parois sont coupe-feu de degré 1/2 heure dans les habitations collectives de la 2ème famille et dans les habitations des 3ème et 4ème familles, que le feu se situe à l'intérieur ou à l'extérieur de la gaine.")
    }
  ]
};

function MENTION_ART48() {
  return "Il n'y a pas d'atténuation pour les conduits classés M1 d'un diamètre supérieur à 125 mm par "
    + "rapport aux conduits M2 à M4 (ministère de l'Équipement et du Logement, 23 décembre 1986). "
    + "Le recoupement de la gaine est obligatoire au niveau du plancher haut du sous-sol et au niveau du "
    + "plancher haut des locaux techniques ; en quatrième famille, il l'est en outre tous les deux niveaux "
    + "au moins. Ce recoupement est réalisé en matériaux incombustibles.";
}

/**
 * Les trappes et portes de visite d'une gaine.
 *
 * Deux seuils que rien ne relie : la surface de la trappe, et le fait que la
 * gaine soit ou non recoupée à tous les niveaux en A1. Le second efface le
 * premier — c'est l'alinéa « Toutefois », et il vaut une demi-heure.
 */
export const trappesDeGaine = {
  id: "trappes-de-gaine",
  titre: "Trappes et portes de visite des gaines",
  repond: "Quel degré pour les trappes et portes de visite de la gaine ?",
  produit: "trappesDeGaine",
  source: { article: "48", paragraphe: "deuxième et troisième alinéas" },
  regles: [
    {
      si: { conduitEntreNiveaux: { differentDe: "gaine CF 1/2 h exigée" } },
      alors: { valeur: "sans objet", sansObjet: "Aucune gaine n'est exigée par l'article 48 dans ce cas." },
      source: reglement("48", "deuxième alinéa", "Les trappes et portes de visites aménagées dans ces gaines doivent être coupe-feu de degré 1/4 d'heure si leur surface est inférieure à 0,25 m², 1/2 heure au-delà.")
    },
    {
      si: { gaineRecoupeeTousNiveauxA1: true },
      alors: { valeur: "CF 1/4 h (EI 15)",
        mention: "Quelle que soit leur surface : le recoupement à tous les niveaux en matériaux incombustibles de classement A1 efface le seuil de 0,25 m²." },
      source: reglement("48", "troisième alinéa", "Toutefois, lorsque le recoupement des gaines visées ci-dessus est réalisé tous les niveaux en matériaux incombustibles (de classement A1), les trappes et portes de visites aménagées dans ces gaines sont coupe-feu de degré un quart d'heure (de classement EI15).")
    },
    {
      si: { surfaceTrappeDeGaine: { moinsDe: 0.25 } },
      alors: { valeur: "CF 1/4 h" },
      source: reglement("48", "deuxième alinéa", "Les trappes et portes de visites aménagées dans ces gaines doivent être coupe-feu de degré 1/4 d'heure si leur surface est inférieure à 0,25 m², 1/2 heure au-delà.")
    },
    {
      si: { surfaceTrappeDeGaine: { auMoins: 0.25 } },
      alors: { valeur: "CF 1/2 h" },
      source: reglement("48", "deuxième alinéa", "…coupe-feu de degré 1/4 d'heure si leur surface est inférieure à 0,25 m², 1/2 heure au-delà.")
    }
  ]
};

/**
 * La traversée d'un mur pour lequel une résistance au feu est exigée.
 *
 * L'article 49 pose une règle — gaine à demi-degré de part et d'autre — puis
 * quatre exceptions numérotées qui la vident dans des cas précis. Elles se
 * lisent dans l'ordre, et le 5°) affranchit de tout ce qui traverse caves et
 * sous-sols… sauf au-delà de 125 mm.
 */
export const traverseeDeParoi = {
  id: "traversee-de-paroi",
  titre: "Traversée d'une paroi résistante au feu",
  repond: "Que faut-il d'un conduit qui traverse un mur résistant au feu ?",
  produit: "traverseeDeParoi",
  source: { article: "49" },
  regles: [
    {
      si: { conduitsOuGainesTraversantDesParois: false },
      alors: { valeur: "sans objet", sansObjet: "Aucun conduit ni gaine déclaré." },
      source: reglement("49", "1°)", "Les conduits réalisés en matériaux classés en catégorie M4 doivent, sauf exceptions visées en 2°, 3°, 4° et 5° ci-après, être contenus dans des gaines.")
    },
    {
      si: { natureHabitation: "individuelle", famille: ["1", "2"] },
      alors: { valeur: "aucune prescription" },
      source: reglement("45", null, "Pour les conduits et gaines aménagés dans les bâtiments individuels de première et 2ème familles, aucune prescription n'est imposée.")
    },
    {
      // Le 5°) affranchit ce qui traverse caves et sous-sols, mais s'arrête net
      // au-delà de 125 mm — et ce reste-là redevient une exigence de matériau.
      si: { paroiTraversee: "caveOuSousSol", diametreConduit: { auPlus: 125 } },
      alors: { valeur: "aucune prescription",
        mention: "Sauf s'il s'agit d'un conduit d'aération de gaine (3°) ou d'un conduit de ventilation de logement traversant un sous-sol, une cave ou un local de l'article 9 (4°)." },
      source: reglement("49", "5°)", "Les conduits autres que ceux visés en 3° et 4° ci-dessus traversant les caves et sous-sols ne sont soumis à aucune prescription sauf en ce qui concerne les conduits de diamètre supérieur à 125 mm qui doivent être réalisés en matériaux incombustibles ou classés en catégorie M1 au moins.")
    },
    {
      si: { paroiTraversee: "caveOuSousSol" },
      alors: { valeur: "incombustible ou M1 au moins",
        mention: "Au-delà de 125 mm, l'affranchissement du 5°) tombe et redevient une exigence de matériau." },
      source: reglement("49", "5°)", "…sauf en ce qui concerne les conduits de diamètre supérieur à 125 mm qui doivent être réalisés en matériaux incombustibles ou classés en catégorie M1 au moins.")
    },
    {
      si: { paroiTraversee: "logementVersLocalArticle9", conduitIncorporeDansUneGaine: false },
      alors: { valeur: "conduit incombustible",
        mention: "Le mur traversé sépare un logement d'un établissement recevant du public au sens de l'article 9, ou d'un sous-sol." },
      source: reglement("49", "2°), premier tiret", "Les conduits non incorporés dans une gaine doivent être réalisés en matériaux : incombustibles si les murs traversés séparent un logement d'un local visé à l'article 9 ou d'un sous-sol ;")
    },
    {
      si: { paroiTraversee: "entreLogements", conduitIncorporeDansUneGaine: false, diametreConduit: { auPlus: 125 } },
      alors: { valeur: "incombustible ou M1" },
      source: reglement("49", "2°), second tiret", "incombustibles ou classés en catégorie M1 pour les diamètres au plus égaux à 125 mm si les murs traversés séparent deux logements.")
    },
    {
      si: { conduitIncorporeDansUneGaine: true },
      alors: { valeur: "gaine à demi-degré de la paroi",
        mention: "Résistance au feu de degré moitié de celle des parois traversées, de part et d'autre, que le feu soit à "
          + "l'extérieur ou à l'intérieur de la gaine. Lorsque les gaines sont placées entre logements ou entre logements "
          + "et circulations, elles assurent en outre les performances des parois séparatives fixées aux articles 7 à 9 (6°)." },
      source: reglement("49", "1°)", "Ces gaines doivent avoir de part et d'autre des parois traversées une résistance au feu de degré moitié de la résistance au feu desdites parois, que le feu soit à l'extérieur ou à l'intérieur de la gaine.")
    },
    {
      si: { conduitIncorporeDansUneGaine: false },
      alors: { valeur: "gaine exigée",
        mention: "Les conduits M4 doivent être contenus dans des gaines, sauf les exceptions des 2°) à 5°) — aucune ne vise ce cas." },
      source: reglement("49", "1°)", "Les conduits réalisés en matériaux classés en catégorie M4 doivent, sauf exceptions visées en 2°, 3°, 4° et 5° ci-après, être contenus dans des gaines.")
    }
  ]
};

/* ================================================================== *
 * CHAPITRE II — GAINES ET CONDUITES MONTANTES DE GAZ (articles 50 à 57)
 * ================================================================== */

export const gaineGazAccessibilite = {
  id: "gaine-gaz-accessibilite",
  titre: "Accessibilité des gaines pour conduites montantes de gaz",
  repond: "Que faut-il d'une gaine pour conduite montante de gaz ?",
  produit: "gaineGazAccessibilite",
  source: { article: "51" },
  regles: [
    {
      si: { conduiteMontanteDeGaz: false },
      alors: { valeur: "sans objet", sansObjet: "Aucune conduite montante de gaz déclarée." },
      source: reglement("50", null, "Les gaines pour conduites montantes de gaz doivent être établies de manière à éviter que le gaz provenant d'une fuite éventuelle […] puisse se répandre dans les circulations communes.")
    },
    {
      si: { natureHabitation: "collective", famille: "2" },
      alors: { valeur: "accessible et visitable depuis les parties communes",
        mention: "Les gaines contenant des tiges après compteur peuvent être placées en parties communes ou à l'intérieur "
          + "du volume habitable ; elles ne sont soumises à aucune autre prescription particulière, et aucune ventilation "
          + "particulière n'est demandée en deuxième famille." },
      source: reglement("51", null, "Dans les habitations collectives de la 2ème famille, les gaines pour conduites montantes de gaz doivent être accessibles et visitables depuis les parties communes de l'immeuble.")
    },
    {
      si: { famille: ["3", "4"] },
      alors: { valeur: "accessible et visitable, recoupée et ventilée",
        mention: "Recoupement obligatoire au niveau du plancher haut du sous-sol, en matériaux incombustibles ; passage "
          + "libre d'au moins 100 cm² à chaque traversée de plancher. En tirage naturel : orifice d'au moins 150 cm² en "
          + "partie haute, protégé de la pluie, et communication avec l'extérieur en partie basse par un orifice ou conduit "
          + "d'au moins 100 cm². Pour un gaz plus lourd que l'air, la prise d'air ne se fait jamais en sous-sol ni en vide "
          + "sanitaire, même ventilés. Une gaine commune avec d'autres conduits est séparée par une paroi pare-flammes "
          + "1/4 d'heure incombustible dès que la conduite montante comporte des assemblages mécaniques." },
      source: reglement("53", "1°) et 2°)", "Les gaines pour conduites montantes doivent être accessibles et visitables depuis les parties communes de l'immeuble. […] Le recoupement de la gaine est obligatoire au niveau du plancher haut du sous-sol. […] A chaque traversée de plancher, la gaine doit comporter un passage libre d'au moins 100 cm².")
    },
    {
      si: { famille: { renseigne: true } },
      alors: { valeur: "aucune prescription par ce chapitre",
        sansObjet: "Le chapitre II ne vise que les habitations collectives des deuxième, troisième et quatrième familles." },
      source: reglement("52", null, "Dans les habitations des 3ème et 4ème familles les gaines et conduites montantes de gaz doivent répondre aux dispositions des articles 53 à 56 ci-après.")
    }
  ]
};

/**
 * Le tableau de l'article 54.
 *
 * Deux entrées — la famille et la situation de la gaine — et deux cases qui ne
 * portent pas un degré mais une interdiction. Une interdiction n'est pas un
 * degré nul : elle se cite, et elle porte sa propre exception, admise si
 * l'escalier est « à l'air libre ».
 */
export const paroisGaineGaz = {
  id: "parois-gaine-gaz",
  titre: "Parois et portes de la gaine gaz",
  repond: "Quelles caractéristiques pour les parois et les trappes de la gaine gaz ?",
  produit: "paroisGaineGaz",
  source: { article: "54" },
  regles: [
    {
      si: { gaineGazAccessibilite: ["sans objet", "aucune prescription par ce chapitre"] },
      alors: { valeur: "sans objet", sansObjet: "Le tableau de l'article 54 ne vise que les troisième et quatrième familles." },
      source: reglement("54", null, "Les caractéristiques de résistance au feu des parois, des portes et trappes de visite de la gaine sont déterminées par le tableau ci-après.")
    },
    {
      si: { natureHabitation: "collective", famille: "2" },
      alors: { valeur: "aucune prescription par cet article",
        sansObjet: "L'article 54 ne vise que les troisième et quatrième familles ; la deuxième relève du seul article 51." },
      source: reglement("54", null, "Les caractéristiques de résistance au feu des parois, des portes et trappes de visite de la gaine sont déterminées par le tableau ci-après.")
    },
    {
      si: { classement: "3e famille A", situationGaineGaz: "cageEscalier" },
      alors: { valeur: "parois PF 1/4 h — portes et trappes PF 1/4 h", mention: MENTION_ART54() },
      source: lecture("54", "tableau, 3ᵉ famille A en cage d'escalier", "3ème famille A : en cage d'escalier, parois PF 1/4 h, portes et trappes de visite PF 1/4 h.")
    },
    {
      si: { classement: "3e famille A" },
      alors: { valeur: "parois PF 1/4 h — portes et trappes PF 1/4 h", mention: MENTION_ART54() },
      source: lecture("54", "tableau, 3ᵉ famille A en parties communes autres", "3ème famille A : en parties communes autres, parois PF 1/4 h, portes et trappes de visite PF 1/4 h.")
    },
    {
      si: { situationGaineGaz: "cageEscalier", typeEscalierRetenu: "airLibre" },
      alors: { valeur: "admise — prescriptions des gaines en parties communes",
        mention: "L'interdiction du tableau est levée lorsque l'escalier est « à l'air libre » ; ce sont alors les prescriptions applicables aux gaines des autres parties communes qui valent." },
      source: lecture("54", "tableau, note (2)", "Cette solution est admise si l'escalier est « à l'air libre ». Dans ce cas, les prescriptions applicables sont celles des gaines en parties communes autres.")
    },
    {
      si: { situationGaineGaz: "cageEscalier", classement: ["3e famille B", "4e famille"] },
      alors: { valeur: "solution interdite",
        mention: "Sauf si l'escalier est « à l'air libre » : la note (2) du tableau l'admet alors, sous les prescriptions des gaines en parties communes." },
      source: lecture("54", "tableau, note (2)", "3ème famille B et 4ème famille, en cage d'escalier : solution interdite (2). Cette solution est admise si l'escalier est « à l'air libre ».")
    },
    {
      si: { classement: "3e famille B" },
      alors: { valeur: "parois CF 1/4 h — portes et trappes PF 1/4 h", mention: MENTION_ART54() },
      source: lecture("54", "tableau, 3ᵉ famille B en parties communes autres", "3ème famille B : en parties communes autres, parois CF 1/4 h, portes et trappes de visite PF 1/4 h.")
    },
    {
      si: { famille: "4" },
      alors: { valeur: "parois CF 1/2 h — portes et trappes PF 1/2 h", mention: MENTION_ART54() },
      source: lecture("54", "tableau, 4ᵉ famille en parties communes autres", "4ème famille : en parties communes autres, parois CF 1/2 h, portes et trappes de visite PF 1/2 h.")
    }
  ]
};

function MENTION_ART54() {
  return "Si le bloc-porte de la gaine donne dans une circulation horizontale protégée, il comporte une feuillure "
    + "munie d'un joint assurant une étanchéité renforcée. Les portes et trappes peuvent comporter l'orifice de "
    + "ventilation de l'article 53. Dans une gaine commune aux conduites de gaz et aux canalisations électriques, "
    + "c'est le degré de l'article 48 qui s'applique aux parois (ministère de l'Équipement, 6 octobre 1987).";
}

export const traverseeGazParcStationnement = {
  id: "traversee-gaz-parc",
  titre: "Traversée d'un parc de stationnement par une installation de gaz",
  repond: "Une installation de gaz collective peut-elle traverser le parc de stationnement ?",
  produit: "traverseeGazParcStationnement",
  source: { article: "56", paragraphe: "2°)" },
  regles: [
    {
      si: { conduiteMontanteDeGaz: false },
      alors: { valeur: "sans objet", sansObjet: "Aucune installation de gaz déclarée." },
      source: reglement("56", "2°)", "La traversée par une installation de gaz à usage collectif d'un parc de stationnement couvert, annexe du bâtiment d'habitation, et tel qu'il est défini à l'article 78 du présent arrêté, est autorisée : […]")
    },
    {
      si: { gazTraversantUnParcDeStationnement: true },
      alors: { valeur: "autorisée sous gaine ventilée CF 2 h",
        mention: "Ou si les conduites répondent aux prescriptions de l'instruction interministérielle du 24 juillet 1987, modifiée par celle du 3 mai 1995, en l'absence de dispositions spécifiques sur la sécurité des installations intérieures de gaz." },
      source: reglement("56", "2°) a", "si les conduites sont placées sous une gaine ventilée, coupe-feu de degré 2 heures ;")
    },
    {
      si: { gazTraversantUnParcDeStationnement: false },
      alors: { valeur: "sans objet", sansObjet: "L'installation de gaz ne traverse pas de parc de stationnement." },
      source: reglement("56", "2°)", "La traversée par une installation de gaz à usage collectif d'un parc de stationnement couvert […] est autorisée : […]")
    }
  ]
};

/* ================================================================== *
 * CHAPITRE III — AUTRES GAINES (articles 58 à 64)
 * ================================================================== */

/**
 * Les gaines de colonnes montantes « électricité ».
 *
 * L'arrêté ne leur donne pas de degré propre : il n'existe pas d'essai
 * normalisé attestant la réaction au feu d'un conduit électrique, et le
 * ministère en a tiré, en 1990, qu'il fallait leur demander les mêmes
 * caractéristiques qu'aux gaines gaz de l'article 54. C'est une doctrine, pas
 * un texte, et le module le dit.
 */
export const colonneMontanteElectricite = {
  id: "colonne-montante-electricite",
  titre: "Gaine de colonne montante « électricité »",
  repond: "Que faut-il d'une gaine de colonne montante électrique ?",
  produit: "colonneMontanteElectricite",
  source: { article: "58" },
  regles: [
    {
      si: { colonneMontanteElectriqueEnGaine: false },
      alors: { valeur: "sans objet", sansObjet: "Aucune colonne montante électrique en gaine déclarée." },
      source: reglement("58", null, "Lorsque les colonnes montantes « électricité » sont mises en place dans les gaines contenant un ou plusieurs autres conduits, elles doivent être séparées de ces derniers par une paroi pare-flammes de degré 1/4 d'heure et réalisée en matériaux incombustibles.")
    },
    {
      si: { colonneMontanteElectriqueEnGaine: true },
      alors: { valeur: "mêmes caractéristiques que la gaine gaz (art. 54)",
        mention: "Les dispositions générales des articles 44 à 49 s'appliquent en outre, que la colonne soit seule ou non "
          + "dans sa gaine. Partagée avec d'autres conduits, elle en est séparée par une paroi pare-flammes 1/4 d'heure "
          + "en matériaux incombustibles, qui peut ne pas occuper toute la profondeur de la gaine au-delà de 30 cm." },
      source: questionReponse("58", "ministère de l'Équipement, 25 juin 1990",
        "Il semble logique d'exiger des gaines des colonnes montantes « électricité » qu'elles aient les mêmes caractéristiques que les gaines des colonnes montantes « gaz », fixées par l'article 54 du même arrêté.")
    }
  ]
};

export const conduitsVentilation = {
  id: "conduits-ventilation",
  titre: "Conduits collectifs de ventilation",
  repond: "Quel degré pour un conduit collectif de ventilation et son enveloppe ?",
  produit: "conduitsVentilation",
  source: { article: "59" },
  regles: [
    {
      si: { natureHabitation: "individuelle" },
      alors: { valeur: "sans objet", sansObjet: "L'article 59 ne vise que les bâtiments collectifs." },
      source: reglement("59", "premier alinéa", "Dans les bâtiments collectifs, les installations de ventilation doivent être réalisées de manière à limiter la transmission des fumées et gaz de combustion d'un local en feu à un autre local…")
    },
    {
      si: { natureHabitation: "collective", famille: "2" },
      alors: { valeur: "incombustible, CF 1/4 h", mention: MENTION_ART59() },
      source: reglement("59", "deuxième alinéa", "tout conduit collectif de ventilation mécanique ou naturelle doit être réalisé en matériaux incombustibles ; l'ensemble de ce conduit et de son enveloppe éventuelle (calorifugeage et gaine) doit être coupe-feu de degré 1/4 d'heure dans les habitations collectives de la deuxième famille…")
    },
    {
      si: { famille: "3" },
      alors: { valeur: "incombustible, CF 1/2 h", mention: MENTION_ART59() },
      source: reglement("59", "deuxième alinéa", "…coupe-feu de degré 1/2 heure dans les habitations de la troisième famille…")
    },
    {
      si: { famille: "4" },
      alors: { valeur: "incombustible, CF 1 h", mention: MENTION_ART59() },
      source: reglement("59", "deuxième alinéa", "…coupe-feu de degré une heure dans les habitations de la quatrième famille.")
    }
  ]
};

function MENTION_ART59() {
  return "Les conduits de ventilation desservant des locaux d'habitation ne desservent en aucun cas des locaux "
    + "d'un autre usage, sauf les locaux collectifs résidentiels de moins de 50 m² et ceux destinés à l'exercice "
    + "d'une profession libérale (article 63). Un cellier n'est pas un local d'habitation, et ces conduits ne "
    + "doivent pas avoir d'extracteur commun avec lui (ministère du Logement, 1er août 1995).";
}

/**
 * Les cinq solutions de ventilation mécanique.
 *
 * Le tableau annexé les croise avec le type d'installation, et il porte des
 * interdictions : la solution n° 2 est interdite en VMC-gaz, la n° 3 en double
 * flux et en VMC inversée, la n° 5 également. Un utilitaire qui rendrait le
 * degré du conduit sans dire que la solution retenue est interdite pour ce
 * système-là rendrait un résultat exact et inutilisable.
 */
export const solutionVentilation = {
  id: "solution-ventilation",
  titre: "Solution de ventilation mécanique",
  repond: "La solution de ventilation retenue est-elle admise pour ce système ?",
  produit: "solutionVentilation",
  source: { article: "60" },
  regles: [
    {
      si: { conduitsVentilation: "sans objet" },
      alors: { valeur: "sans objet", sansObjet: "L'article 59 ne vise que les bâtiments collectifs." },
      source: reglement("60", null, "Si l'une des conditions suivantes est respectée, le système de ventilation est soumis aux seules prescriptions de l'article 59 relatives aux conduits.")
    },
    {
      si: { solutionVentilationRetenue: "1" },
      alors: { valeur: "admise — fonctionnement du ventilateur assuré en permanence",
        mention: "L'alimentation électrique ne traverse pas de locaux à risque d'incendie et est protégée des incidents "
          + "survenant sur les autres circuits, ou assurée par un groupe électrogène asservi aux coupures et vérifié au "
          + "moins une fois par mois. Le ventilateur est de catégorie 1 pour un taux de dilution R > 3,5 ; 2 pour "
          + "1,6 < R ≤ 3,5 ; 3 pour 1 < R ≤ 1,6 ; 4 pour R ≤ 1. Aucun clapet dans les conduits. Admise en simple flux, "
          + "double flux, VMC inversée et VMC-gaz." },
      source: reglement("60", "1°)", "Le fonctionnement du ventilateur est réputé assuré en permanence. Cette condition est réalisée quand : l'alimentation électrique du ventilateur est protégée de façon à ne pas être affectée par un incident survenant sur les autres circuits et ne traverse pas de locaux présentant des risques particuliers d'incendie…")
    },
    {
      si: { solutionVentilationRetenue: "2", typeVentilation: "vmcGaz" },
      alors: { valeur: "interdite en VMC-gaz",
        mention: "Les clapets ne peuvent être utilisés lorsque le système de ventilation assure l'évacuation des gaz de combustion des appareils raccordés." },
      source: reglement("60", "2°)", "Ils ne peuvent être utilisés lorsque le système de ventilation assure l'évacuation des gaz de combustion des appareils raccordés (VMC-gaz).")
    },
    {
      si: { solutionVentilationRetenue: "2" },
      alors: { valeur: "admise — clapets pare-flammes sur les raccordements",
        mention: "Pare-flammes 1/4 d'heure en habitations collectives des deuxième et troisième familles, 1/2 heure en "
          + "quatrième famille, actionnés par un dispositif thermique fonctionnant à 70 °C. Les clapets doivent être "
          + "contrôlables et remplaçables." },
      source: reglement("60", "2°)", "Chaque conduit de raccordement à un conduit collectif est muni d'un clapet pare-flammes […] actionné par un dispositif thermique fonctionnant à 70 °C. Ces clapets doivent être contrôlables et remplaçables.")
    },
    {
      si: { solutionVentilationRetenue: ["3", "4", "5"], typeVentilation: "doubleFlux" },
      alors: { valeur: "interdite en double flux",
        mention: "Le réseau d'extraction d'un système double flux répond aux articles 59 et 60 ; les solutions de la règle des 50 Pa ne lui sont pas ouvertes." },
      source: reglement("62", "b", "Dans les bâtiments collectifs, lorsque le système de ventilation est du type « double flux », le réseau d'extraction doit répondre aux prescriptions des articles 59 et 60 ci-avant.")
    },
    {
      si: { solutionVentilationRetenue: ["3", "5"], typeVentilation: "vmcInversee" },
      alors: { valeur: "interdite en VMC inversée",
        mention: "Les dispositions de l'article 61, § b1 et § b2.2 ne peuvent être réalisées en ventilation mécanique inversée. Il est en outre interdit de placer des clapets dans le conduit collectif." },
      source: reglement("62", "a", "Les dispositions de l'article 61, § b1 et § b2.2 ne peuvent être réalisées en ventilation mécanique inversée. En outre, dans le cas de ventilation mécanique inversée, il est interdit de placer des clapets dans le conduit collectif.")
    },
    {
      si: { solutionVentilationRetenue: ["3", "4", "5"] },
      alors: { valeur: "admise — règle des 50 Pa",
        mention: "Les bouches d'extraction ne disparaissent pas sous le programme thermique normalisé au bout des temps de "
          + "l'article 59, et leur débit n'augmente pas de plus de 25 % à 300 °C. La perte de charge d'une bouche et de son "
          + "conduit de raccordement dépasse de 50 Pa celle de tout le réseau collectif entre le dernier niveau desservi et "
          + "la sortie à l'air libre — sans exutoire (n° 3), avec exutoire en haut de chaque conduit collectif (n° 4), ou "
          + "avec exutoire sur le caisson en amont du ventilateur (n° 5)." },
      source: reglement("61", "a et b", "les bouches d'extraction mécanique ne doivent pas disparaître lorsqu'elles sont soumises au programme thermique normalisé en étant exposées au feu côté local, au bout des temps indiqués à l'article 59 ci-dessus. De plus, leur débit ne doit pas augmenter de plus de 25 % lorsqu'elles sont exposées à une température de 300 °C côté conduit ;")
    }
  ]
};

export const localVentilateurInverse = {
  id: "local-ventilateur-inverse",
  titre: "Local du ventilateur en VMC inversée",
  repond: "Que faut-il du local abritant le ventilateur en VMC inversée ?",
  produit: "localVentilateurInverse",
  source: { article: "62", paragraphe: "a" },
  regles: [
    {
      si: { typeVentilation: { differentDe: "vmcInversee" } },
      alors: { valeur: "sans objet", sansObjet: "La ventilation retenue n'est pas une VMC inversée." },
      source: reglement("62", "a", "Si l'extraction mécanique est réalisée de telle manière que l'air circule normalement de haut en bas dans les conduits collectifs (VMC inversée), le ventilateur doit être placé dans un local exclusivement réservé à cet usage.")
    },
    {
      si: { typeVentilation: "vmcInversee", ventilateurDansUnLocalExterieur: true },
      alors: { valeur: "aucune exigence",
        mention: "Ces dispositions ne sont pas exigées si le local est situé à l'extérieur du bâtiment." },
      source: reglement("62", "a", "Ces dispositions ne sont pas exigées si le local est situé à l'extérieur du bâtiment.")
    },
    {
      si: { typeVentilation: "vmcInversee" },
      alors: { valeur: { fait: "porteursVerticauxStabilite" },
        mention: "Local exclusivement réservé au ventilateur, parois coupe-feu de degré identique à celui de la stabilité "
          + "du bâtiment — donc le degré ci-contre — et porte pare-flammes de degré 1/2 heure." },
      source: reglement("62", "a", "Les parois de ce local doivent être coupe-feu de degré identique à celui de la stabilité du bâtiment et la porte doit être pare-flammes de degré 1/2 heure.")
    }
  ]
};

/**
 * Le vide-ordures.
 *
 * Quatre exigences dans un seul article, et elles ne portent pas sur le même
 * objet : le conduit de chute, le vidoir, le cas du vide-ordures intérieur au
 * logement, et le local réceptacle. La troisième relève les degrés du conduit,
 * la quatrième les double quand le local est dans un parc de stationnement.
 */
export const videOrdures = {
  id: "vide-ordures",
  titre: "Vide-ordures",
  repond: "Quels degrés pour le conduit de chute et le vidoir du vide-ordures ?",
  // Le fait produit ne peut pas porter le nom de la question qui l'alimente :
  // le module se demanderait à lui-même, et le graphe boucle. C'est le moteur
  // qui l'a dit, plutôt qu'un écran qui aurait tourné en rond.
  produit: "videOrduresConduit",
  source: { article: "64" },
  regles: [
    {
      si: { videOrdures: false },
      alors: { valeur: "sans objet", sansObjet: "Le bâtiment ne comporte pas de vide-ordures." },
      source: reglement("64", "premier alinéa", "Dans les habitations des 3ème et 4ème familles, les conduits de chute de vide-ordures doivent assurer un coupe-feu de traversée respectivement de degré 30 minutes et 60 minutes.")
    },
    {
      si: { videOrdures: true, videOrduresDansLesLogements: true, famille: "3" },
      alors: { valeur: "conduit ou gaine CF 1/2 h — vidoir PF 1/2 h",
        mention: "Le vide-ordures est situé à l'intérieur des logements : les degrés sont relevés." },
      source: reglement("64", "quatrième alinéa", "Lorsque les vide-ordures sont situés à l'intérieur des logements, les conduits de chutes ou les gaines les contenant doivent être coupe-feu de degré 1/2 heure dans les habitations de la 3ème famille, coupe-feu de degré 1 heure dans les habitations de la 4ème famille. Les vidoirs doivent être pare-flammes de degré 1/2 heure.")
    },
    {
      si: { videOrdures: true, videOrduresDansLesLogements: true, famille: "4" },
      alors: { valeur: "conduit ou gaine CF 1 h — vidoir PF 1/2 h",
        mention: "Le vide-ordures est situé à l'intérieur des logements : les degrés sont relevés." },
      source: reglement("64", "quatrième alinéa", "…coupe-feu de degré 1 heure dans les habitations de la 4ème famille. Les vidoirs doivent être pare-flammes de degré 1/2 heure.")
    },
    {
      si: { videOrdures: true, famille: "3" },
      alors: { valeur: "coupe-feu de traversée 30 min — vidoir PF 1/4 h", mention: MENTION_ART64() },
      source: reglement("64", "premier et deuxième alinéas", "Dans les habitations des 3ème et 4ème familles, les conduits de chute de vide-ordures doivent assurer un coupe-feu de traversée respectivement de degré 30 minutes et 60 minutes. Le vidoir en position fermée doit présenter, vis-à-vis d'un feu venant de l'intérieur du conduit, une caractéristique de résistance au feu pare-flammes respectivement de degré 1/4 d'heure et 1/2 heure.")
    },
    {
      si: { videOrdures: true, famille: "4" },
      alors: { valeur: "coupe-feu de traversée 60 min — vidoir PF 1/2 h", mention: MENTION_ART64() },
      source: reglement("64", "premier et deuxième alinéas", "…un coupe-feu de traversée respectivement de degré 30 minutes et 60 minutes. Le vidoir […] pare-flammes respectivement de degré 1/4 d'heure et 1/2 heure.")
    },
    {
      si: { videOrdures: true },
      alors: { valeur: "aucune prescription par cet article",
        sansObjet: "L'article 64 ne vise que les troisième et quatrième familles." },
      source: reglement("64", "premier alinéa", "Dans les habitations des 3ème et 4ème familles, les conduits de chute de vide-ordures doivent assurer un coupe-feu de traversée respectivement de degré 30 minutes et 60 minutes.")
    }
  ]
};

function MENTION_ART64() {
  return "Si le local où est installé le vidoir a une porte pare-flammes du même degré, aucune caractéristique "
    + "pare-flammes n'est exigée du vidoir lui-même.";
}

export const localReceptacleOrdures = {
  id: "local-receptacle-ordures",
  titre: "Local réceptacle des ordures",
  repond: "Quels degrés pour le local réceptacle et son bloc-porte ?",
  produit: "localReceptacleOrdures",
  source: { article: "64", paragraphe: "dernier alinéa" },
  regles: [
    {
      si: { videOrdures: false },
      alors: { valeur: "sans objet", sansObjet: "Le bâtiment ne comporte pas de vide-ordures." },
      source: reglement("64", "dernier alinéa", "Dans les habitations des 3ème et 4ème familles, lorsque le local réceptacle des ordures est situé dans les parcs de stationnement […] ses parois doivent être coupe-feu de degré 2 heures…")
    },
    {
      si: { videOrdures: true, famille: ["3", "4"], localOrduresDansLeParcDeStationnement: true },
      alors: { valeur: "parois CF 2 h — bloc-porte CF 1 h",
        mention: "Bloc-porte équipé d'un ferme-porte." },
      source: reglement("64", "dernier alinéa", "…lorsque le local réceptacle des ordures est situé dans les parcs de stationnement tels que définis aux articles 77 et 78 ci-après, ses parois doivent être coupe-feu de degré 2 heures et le bloc-porte, équipé d'un ferme-porte, doit être coupe-feu de degré 1 heure.")
    },
    {
      si: { videOrdures: true, famille: ["3", "4"], localOrduresDansLeParcDeStationnement: false },
      alors: { valeur: "parois CF 1 h — bloc-porte CF 1/2 h",
        mention: "Bloc-porte équipé d'un ferme-porte. Ces exigences ne visent pas les portes situées en façade du bâtiment." },
      source: reglement("64", "dernier alinéa", "Si ce local est situé à tout autre emplacement, ses parois doivent être coupe-feu de degré 1 heure et le bloc-porte, équipé d'un ferme-porte, doit être coupe-feu de degré 1/2 heure ; ces exigences ne visent pas les portes situées en façade du bâtiment.")
    },
    {
      si: { videOrdures: true },
      alors: { valeur: "aucune prescription par cet alinéa",
        sansObjet: "Le dernier alinéa de l'article 64 ne vise que les troisième et quatrième familles." },
      source: reglement("64", "dernier alinéa", "Dans les habitations des 3ème et 4ème familles, lorsque le local réceptacle des ordures est situé dans les parcs de stationnement…")
    }
  ]
};

export const MODULES_CONDUITS = [
  conduitEntreNiveaux, trappesDeGaine, traverseeDeParoi,
  gaineGazAccessibilite, paroisGaineGaz, traverseeGazParcStationnement,
  colonneMontanteElectricite, conduitsVentilation, solutionVentilation, localVentilateurInverse,
  videOrdures, localReceptacleOrdures
];
