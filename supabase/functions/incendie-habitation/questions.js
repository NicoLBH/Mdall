/**
 * Les questions source : ce qu'aucun module ne sait déduire.
 *
 * ## Pourquoi elles sont déclarées ici et pas dans les modules
 *
 * Un fait est une question source quand aucun module ne le produit. Ce n'est
 * donc pas une propriété qu'on décide, c'est une propriété qu'on **constate**
 * sur le graphe — et un test le vérifie dans les deux sens : toute question
 * déclarée ici doit être réellement demandée par un module, et tout fait
 * demandé par un module sans producteur doit avoir sa question ici. Une
 * question orpheline reste à l'écran sans servir ; un fait sans question rend
 * un module définitivement muet.
 *
 * ## Pourquoi elles ne descendent pas dans le navigateur
 *
 * Elles y descendent — mais une par une, au fur et à mesure que le moteur les
 * réclame, et jamais la liste entière. Le catalogue complet dirait déjà quels
 * paramètres comptent et dans quel ordre ils s'enchaînent, c'est-à-dire une
 * bonne part du travail. L'écran affiche ce qu'il faut répondre maintenant ;
 * le reste reste au serveur.
 *
 * ## L'énoncé porte la règle
 *
 * « Nombre d'étages sur rez-de-chaussée » ne suffit pas : le texte compte les
 * étages d'une certaine façon, et l'aide le dit avec son article. Une question
 * dont l'énoncé laisse deux lectures possibles produit deux réponses
 * différentes pour le même bâtiment, et le reste du raisonnement est faux sans
 * que rien ne le signale.
 */

export const QUESTIONS = [
  /* ── Le bâtiment, tel que l'article 3 le regarde ───────────────────────── */
  {
    cle: "logementsSuperposes",
    libelle: "Le bâtiment comporte-t-il des logements superposés ?",
    type: "booleen",
    article: "3",
    paragraphe: "application des 1°) et 2°)",
    aide: "« Sont considérés comme maisons individuelles au sens du présent arrêté les bâtiments "
      + "d'habitation ne comportant pas de logements superposés. » C'est le seul critère : ni la "
      + "surface, ni le mode de propriété, ni le nombre de logements n'entrent en compte."
  },
  {
    cle: "implantation",
    libelle: "Comment l'habitation est-elle implantée ?",
    type: "choix",
    valeurs: [
      { valeur: "isolee", libelle: "Isolée" },
      { valeur: "jumelee", libelle: "Jumelée" },
      { valeur: "bande", libelle: "Groupée en bande" }
    ],
    article: "3",
    paragraphe: "1°) et 2°)",
    aide: "Ne concerne que les habitations individuelles : le 1°) et le 2°) distinguent l'isolée "
      + "ou jumelée du groupement en bande, et n'en tirent pas les mêmes conséquences."
  },
  {
    cle: "etagesSurRdc",
    libelle: "Nombre d'étages sur rez-de-chaussée",
    type: "nombre",
    unite: "étages",
    article: "3",
    aide: "Le rez-de-chaussée n'est pas compté : une maison de plain-pied vaut 0, un R+1 vaut 1. "
      + "Le 5°) fait exception pour les duplex et triplex du dernier étage — la question suivante "
      + "s'en charge, ne retranchez rien vous-même."
  },
  {
    cle: "structuresIndependantes",
    libelle: "Les structures de chaque habitation concourant à la stabilité du bâtiment sont-elles "
      + "indépendantes de celles de l'habitation contiguë ?",
    type: "booleen",
    article: "3",
    paragraphe: "1°), dernier alinéa",
    aide: "C'est ce seul point qui sépare la première famille de la deuxième pour une maison en "
      + "bande à un étage. Le CSTB précise qu'il s'agit d'une indépendance de fait : sans joint de "
      + "dilatation nécessaire, si la ruine d'une maison ne met pas en cause la stabilité des voisines."
  },

  /* ── Duplex et triplex : ce qu'on compte vraiment ──────────────────────── */
  {
    cle: "duplexOuTriplexAuDernierEtage",
    libelle: "Les logements de l'étage le plus élevé sont-ils des duplex ou des triplex ?",
    type: "booleen",
    article: "3",
    paragraphe: "5°)",
    aide: "Le 5°) ne compte alors que le niveau bas de ces logements pour le classement des trois "
      + "premières familles, sous trois conditions cumulatives — les questions qui suivent."
  },
  {
    cle: "duplexPiecePrincipaleEtPortePaliereEnBas",
    libelle: "Ces logements disposent-ils d'une pièce principale et d'une porte palière en partie basse ?",
    type: "booleen",
    article: "3",
    paragraphe: "5°)"
  },
  {
    cle: "duplexPlanchersConformesArticle6",
    libelle: "Les planchers des différents niveaux de ces logements répondent-ils aux caractéristiques "
      + "de l'article 6 ?",
    type: "booleen",
    article: "3",
    paragraphe: "5°)"
  },
  {
    cle: "quadruplexOuPlus",
    libelle: "Le bâtiment comporte-t-il des logements de quatre niveaux ou plus ?",
    type: "booleen",
    article: "3",
    paragraphe: "5°), dernier alinéa",
    aide: "« Les quadruplex et plus ne sont pas admis dans les bâtiments d'habitation collectifs. » "
      + "C'est une interdiction, pas un critère de classement."
  },

  /* ── Les hauteurs : deux mesures, et elles ne sont pas la même ─────────── */
  {
    cle: "hauteurPlancherBasLogementLePlusHaut",
    libelle: "Hauteur du plancher bas du logement le plus haut, au-dessus du sol utilement "
      + "accessible aux engins de secours",
    type: "nombre",
    unite: "m",
    article: "3",
    paragraphe: "3°)",
    aide: "C'est la mesure du champ d'application (article 1er, 50 m) et de la troisième famille "
      + "(28 m). Le sol de référence n'est pas le terrain naturel : c'est celui qui est utilement "
      + "accessible aux engins des services de secours."
  },
  {
    cle: "hauteurPlancherBasNiveauLePlusHaut",
    libelle: "Hauteur du plancher bas du niveau le plus haut, au-dessus du même sol",
    type: "nombre",
    unite: "m",
    article: "3",
    paragraphe: "4°)",
    aide: "Depuis l'arrêté du 7 août 2019, la quatrième famille se mesure au plancher bas du "
      + "**niveau** le plus haut, et non du logement : un duplex de dernier étage dont le niveau "
      + "haut dépasse 50 m relève désormais de l'IGH. Sans duplex en partie haute, cette hauteur "
      + "est celle de la question précédente."
  },

  /* ── Ce qui sépare la 3e famille A de la 3e famille B ──────────────────── */
  {
    cle: "distancePortePaliereEscalier",
    libelle: "Distance entre la porte palière de logement la plus éloignée et l'accès de l'escalier",
    type: "nombre",
    unite: "m",
    article: "3",
    paragraphe: "3°), troisième famille A",
    aide: "Mesurée dans les circulations horizontales. Au-delà de 10 m, le bâtiment bascule en "
      + "troisième famille B."
  },
  {
    cle: "accesEscaliersAtteintsParVoieEchelles",
    libelle: "Au rez-de-chaussée, les accès aux escaliers sont-ils atteints par la voie-échelles ?",
    type: "booleen",
    article: "3",
    paragraphe: "3°), troisième famille A",
    aide: "La voie doit en outre répondre aux caractéristiques de l'article 4 : c'est vérifié "
      + "séparément, et les deux conditions sont exigées ensemble."
  },
  {
    cle: "accesEscaliersMoinsDe50mVoieEngins",
    libelle: "Les accès aux escaliers sont-ils situés à moins de 50 m d'une voie-engins ?",
    type: "booleen",
    article: "3",
    paragraphe: "3°) troisième famille B et 4°)",
    aide: "Condition d'implantation exigée en troisième famille B comme en quatrième famille."
  },
  {
    cle: "arreteMunicipalDeclassement",
    libelle: "Le maire a-t-il décidé que ce bâtiment de 3ᵉ famille B peut être soumis aux seules "
      + "prescriptions de la 3ᵉ famille A ?",
    type: "booleen",
    article: "3",
    paragraphe: "3°), troisième alinéa",
    aide: "Possible dans les communes dont les services de secours disposent d'échelles aériennes "
      + "de hauteur suffisante, et si le bâtiment est dans leur secteur d'intervention. La décision "
      + "appartient aux autorités locales, jamais à l'utilitaire."
  },
  {
    cle: "logementsAtteignablesEchellesOuParcoursSur",
    libelle: "Chaque logement peut-il être atteint par les échelles, soit directement, soit par un "
      + "parcours sûr ?",
    type: "booleen",
    article: "3",
    paragraphe: "3°), troisième alinéa",
    aide: "Condition du déclassement. L'article 4 § B précise les distances admises et ce qu'est "
      + "un parcours sûr : balcon filant, passerelle, terrasse."
  },

  /* ── L'article 4 : ce qui fait qu'une voie en est une ──────────────────── */
  {
    cle: "voieAccesDecrite",
    libelle: "Décrit-on une voie d'accès pour les services de secours ?",
    type: "booleen",
    article: "4",
    aide: "L'article 4 ne définit les voies que « pour l'application de l'article 3 ». Les première "
      + "et deuxième familles ne sont soumises à aucune prescription d'accès ; la troisième famille A "
      + "suppose une voie-échelles, la troisième famille B et la quatrième une voie-engins à moins de 50 m."
  },
  {
    cle: "voieLargeur",
    libelle: "Largeur de la chaussée, bandes de stationnement exclues",
    type: "nombre", unite: "m", article: "4", paragraphe: "A"
  },
  {
    cle: "voieForcePortante",
    libelle: "Force portante de la chaussée",
    type: "nombre", unite: "kN", article: "4", paragraphe: "A",
    aide: "Calculée pour un véhicule de 130 kN : 40 kN sur l'essieu avant, 90 kN sur l'essieu "
      + "arrière, distants de 4,50 m."
  },
  {
    cle: "voieRayonInterieur",
    libelle: "Rayon intérieur minimum des virages",
    type: "nombre", unite: "m", article: "4", paragraphe: "A"
  },
  {
    cle: "voieHauteurLibre",
    libelle: "Hauteur libre de passage",
    type: "nombre", unite: "m", article: "4", paragraphe: "A",
    aide: "3,30 m pour le véhicule, majorés d'une marge de sécurité de 0,20 m — soit 3,50 m."
  },
  {
    cle: "voiePente",
    libelle: "Pente de la voie",
    type: "nombre", unite: "%", article: "4", paragraphe: "A"
  },
  {
    cle: "voieLongueur",
    libelle: "Longueur de la section de voie",
    type: "nombre", unite: "m", article: "4", paragraphe: "B",
    aide: "Ne compte que pour la voie-échelles, dont la longueur minimale est de 10 m."
  },
  {
    cle: "voieResistancePoinconnement",
    libelle: "Résistance au poinçonnement",
    type: "nombre", unite: "kN", article: "4", paragraphe: "B",
    aide: "100 kN sur une surface circulaire de 0,20 m de diamètre. Ne compte que pour la voie-échelles."
  },
  {
    cle: "voieRaccordeeAUneVoieEngins",
    libelle: "Si la section n'est pas sur la voie publique, est-elle raccordée à une voie-engins ?",
    type: "choix",
    valeurs: [
      { valeur: "surVoiePublique", libelle: "Elle est sur la voie publique" },
      { valeur: "raccordee", libelle: "Raccordée à une voie-engins" },
      { valeur: "nonRaccordee", libelle: "Non raccordée" }
    ],
    article: "4", paragraphe: "B"
  },

  /* ── Ce que la structure et l'enveloppe demandent ──────────────────────── */
  {
    cle: "sousSol",
    libelle: "Le bâtiment comporte-t-il un sous-sol ?",
    type: "booleen",
    article: "6",
    aide: "En première famille, l'article 6 n'exige un degré coupe-feu que pour le plancher haut "
      + "du sous-sol. Sans sous-sol, l'exigence de l'article 6 est sans objet."
  },
  {
    cle: "planchersSurVideSanitaireNonAccessible",
    libelle: "Le plancher considéré est-il situé au-dessus d'un vide sanitaire non accessible ?",
    type: "booleen",
    article: "6",
    paragraphe: "exclusions"
  },
  {
    cle: "paroisLogementProlongeesJusquACouverture",
    libelle: "Les parois verticales de l'enveloppe des logements sont-elles prolongées jusqu'à la "
      + "couverture du bâtiment ?",
    type: "booleen",
    article: "6",
    paragraphe: "exclusions",
    aide: "Si elles le sont, le plancher haut, le faux plancher ou le plafond du dernier niveau "
      + "habitable échappent à l'exigence de l'article 6."
  },
  {
    cle: "coursivesPasserellesOuCirculationsAAirLibre",
    libelle: "Le bâtiment comporte-t-il des coursives, passerelles extérieures ou circulations à "
      + "l'air libre reliant les logements aux escaliers ?",
    type: "booleen",
    article: "6",
    paragraphe: "avant-dernier alinéa"
  },
  {
    cle: "groupementEnBandeOuGrandeLongueur",
    libelle: "S'agit-il d'un groupement en bande de maisons individuelles, ou d'un bâtiment de "
      + "grande longueur ?",
    type: "booleen",
    article: "7"
  },
  {
    cle: "longueurDuBatiment",
    libelle: "Longueur du bâtiment ou du groupement",
    type: "nombre", unite: "m", article: "7",
    aide: "Le recoupement est exigé au moins tous les 45 m : en deçà, aucun mur de recoupement "
      + "n'est imposé par cet article."
  },
  {
    cle: "celliersOuCavesRegroupes",
    libelle: "Le bâtiment comporte-t-il un ensemble regroupant des celliers ou caves indépendants "
      + "des logements ?",
    type: "booleen",
    article: "10",
    aide: "Aménagés en étage, en rez-de-chaussée ou en sous-sol. Un cellier individuel attenant au "
      + "logement n'en est pas un."
  },
  {
    cle: "facadePartiesPleinesSystemeClasseE",
    libelle: "Les parties pleines de la façade sont-elles revêtues d'un système de façade classé E ?",
    type: "booleen",
    article: "12", paragraphe: "A, deuxième alinéa"
  },
  {
    cle: "distanceLimiteDePropriete",
    libelle: "Distance de la façade à la limite de propriété",
    type: "nombre", unite: "m", article: "12", paragraphe: "A, deuxième alinéa",
    aide: "L'exception du deuxième alinéa n'est ouverte qu'au-delà de quatre mètres."
  },
  {
    cle: "revetementCouvertureClasse",
    libelle: "Classement de réaction au feu du revêtement de couverture",
    type: "choix",
    valeurs: [
      { valeur: "M1", libelle: "M1" }, { valeur: "M2", libelle: "M2" },
      { valeur: "M3", libelle: "M3" }, { valeur: "M4", libelle: "M4" }
    ],
    article: "15"
  },
  {
    cle: "supportCouvertureContinuIncombustible",
    libelle: "Le revêtement est-il établi sur un support continu en matériau incombustible, en "
      + "panneaux de bois, d'aggloméré de fibres de bois ou équivalent reconnu par le Cecmi ?",
    type: "booleen",
    article: "15", paragraphe: "a",
    aide: "C'est ce support qui libère les revêtements M1, M2 et M3 de toute restriction. À défaut, "
      + "ils doivent tenir la classe de pénétration exigée des revêtements M4."
  },
  /* ── Titre III : ce qu'on a choisi de construire ───────────────────────── */
  {
    cle: "typeEscalierRetenu",
    libelle: "Quel escalier le projet prévoit-il ?",
    type: "choix",
    valeurs: [
      { valeur: "airLibre", libelle: "À l'air libre (art. 28)" },
      { valeur: "abriFumees", libelle: "À l'abri des fumées (art. 29)" },
      { valeur: "exterieur", libelle: "Extérieur (art. 29 bis)" },
      { valeur: "encloisonne", libelle: "Encloisonné" },
      { valeur: "nonProtege", libelle: "Ni encloisonné ni protégé" }
    ],
    article: "26",
    aide: "Le texte n'ouvre que deux formes d'escalier « protégé » : à l'air libre et à l'abri des "
      + "fumées. Un escalier encloisonné est une séparation physique, sans qualité de résistance au feu "
      + "requise ; l'escalier extérieur du 29 bis est autre chose encore."
  },
  {
    cle: "hauteurDernierPlancherDesserviParEscalier",
    libelle: "Hauteur du dernier plancher desservi par l'escalier",
    type: "nombre", unite: "m", article: "18",
    aide: "Ce n'est pas la hauteur du plancher bas du logement le plus haut : c'est celle du dernier "
      + "plancher que l'escalier dessert. En deuxième famille collective, au-delà de 8 m, l'escalier "
      + "est encloisonné et l'article 18 s'applique ; en deçà, il ne s'applique pas."
  },
  {
    cle: "partiesParoiEscalierNonPareFlammes",
    libelle: "La paroi de la cage comporte-t-elle des parties, baies ou fenêtres non pare-flammes "
      + "de degré 1/2 heure ?",
    type: "booleen", article: "18", paragraphe: "deuxième alinéa",
    aide: "Ce sont elles, et elles seules, que le texte oblige à éloigner des fenêtres voisines."
  },
  {
    cle: "angleDiedreFacade",
    libelle: "Angle du dièdre formé par la façade voisine",
    type: "nombre", unite: "°", article: "18",
    aide: "Le texte définit les positions par l'angle : au-delà de 135°, la façade est latérale ; "
      + "entre 90° et 135° bornes incluses, elle est en retour ; en deçà de 90°, elle est en vis-à-vis. "
      + "Une façade dans le même plan vaut 180°."
  },
  {
    cle: "distanceEscalierAuxBaies",
    libelle: "Distance de l'emprise de l'escalier extérieur aux baies de la façade",
    type: "nombre", unite: "m", article: "29 bis",
    aide: "Mesurée du nu extérieur au nu extérieur de l'emprise volumétrique de l'escalier — paliers "
      + "et volées compris."
  },
  {
    cle: "partVidesParoiEscalier",
    libelle: "Part de vides de la paroi de l'escalier donnant sur l'extérieur",
    type: "nombre", unite: "%", article: "28",
    aide: "L'escalier « à l'air libre » suppose une paroi ouverte sur au moins la moitié de sa "
      + "surface, sur toute la longueur."
  },
  {
    cle: "typeCirculationRetenue",
    libelle: "Quelle circulation horizontale le projet prévoit-il ?",
    type: "choix",
    valeurs: [
      { valeur: "airLibre", libelle: "À l'air libre (art. 30)" },
      { valeur: "abriFumees", libelle: "À l'abri des fumées (art. 31 à 38)" },
      { valeur: "aucune", libelle: "Aucune circulation protégée" }
    ],
    article: "30",
    aide: "Les circulations horizontales protégées ne sont imposées qu'en troisième famille B et en "
      + "quatrième famille, mais elles peuvent exister ailleurs."
  },
  {
    cle: "partVidesParoiCirculation",
    libelle: "Part de vides de la paroi de la circulation donnant sur l'extérieur",
    type: "nombre", unite: "%", article: "30",
    aide: "Sur toute la longueur de la paroi, et au moins égale à la moitié de sa surface totale."
  },
  {
    cle: "allegeBaieVitreeHauteur",
    libelle: "Hauteur de l'allège des baies vitrées donnant sur la circulation",
    type: "nombre", unite: "m", article: "30", paragraphe: "deuxième alinéa",
    aide: "En deçà d'un mètre, c'est l'autre branche du texte qui s'applique : les baies doivent être "
      + "pare-flammes de degré une demi-heure **et fixes**."
  },
  {
    cle: "modeDesenfumageRetenu",
    libelle: "Comment la circulation est-elle désenfumée ?",
    type: "choix",
    valeurs: [
      { valeur: "tirageNaturel", libelle: "Tirage naturel" },
      { valeur: "extractionMecanique", libelle: "Extraction mécanique" }
    ],
    article: "33"
  },
  {
    cle: "parcoursCirculationRectiligne",
    libelle: "Le parcours de la circulation est-il rectiligne ?",
    type: "booleen", article: "35", paragraphe: "deuxième alinéa",
    aide: "La distance admise entre deux bouches de nature différente passe de 10 m à 7 m dès que le "
      + "parcours ne l'est plus."
  },
  {
    cle: "solutionDegagementRetenue",
    libelle: "Quelle solution de dégagements protégés est retenue ?",
    type: "choix",
    valeurs: [
      { valeur: "1", libelle: "N° 1 — deux escaliers (art. 41)" },
      { valeur: "2", libelle: "N° 2 — volume séparatif (art. 42)" },
      { valeur: "3", libelle: "N° 3 — sas et surpression (art. 43)" }
    ],
    article: "40",
    aide: "L'article 40 pose l'objectif — les fumées de la circulation sinistrée ne doivent pas "
      + "pénétrer dans l'escalier — et dit que le choix entre les trois solutions appartient aux "
      + "constructeurs du bâtiment."
  },
  {
    cle: "nombreEscaliersProteges",
    libelle: "Nombre d'escaliers protégés prévus",
    type: "nombre", unite: "escaliers", article: "41", paragraphe: "a"
  },
  {
    cle: "distanceEntreEscaliers",
    libelle: "Distance entre les deux escaliers protégés",
    type: "nombre", unite: "m", article: "41", paragraphe: "a",
    aide: "La solution n° 1 les veut distants de 10 m au moins."
  },
  /* ── Titre IV : ce qui traverse le bâtiment ───────────────────────────── */
  {
    cle: "conduitDansLogementOuCirculationCommune",
    libelle: "Le conduit est-il situé dans un logement ou dans une circulation horizontale commune ?",
    type: "booleen", article: "46",
    aide: "C'est la première des quatre conditions cumulatives qui permettent à un conduit de rester "
      + "hors d'une gaine. Ailleurs — en cage d'escalier, en local technique — la tolérance ne joue pas."
  },
  {
    cle: "classeReactionConduit",
    libelle: "Classement de réaction au feu du conduit, calorifugeage compris",
    type: "choix",
    valeurs: [
      { valeur: "incombustible", libelle: "Incombustible" },
      { valeur: "M1", libelle: "M1" }, { valeur: "M2", libelle: "M2" },
      { valeur: "M3", libelle: "M3" }, { valeur: "M4", libelle: "M4" }
    ],
    article: "46",
    aide: "Le calorifugeage éventuel compte. Attention : un conduit M1 de plus de 125 mm ne bénéficie "
      + "d'aucune atténuation par rapport aux conduits M2 à M4 (ministère, 23 décembre 1986)."
  },
  {
    cle: "diametreConduit",
    libelle: "Diamètre du conduit",
    type: "nombre", unite: "mm", article: "46",
    aide: "125 mm est le seuil qui revient partout : au-delà, les tolérances des articles 46, 47 et "
      + "49 § 5 tombent l'une après l'autre."
  },
  {
    cle: "gaineRecoupeeTousNiveauxA1",
    libelle: "La gaine est-elle recoupée à tous les niveaux en matériaux incombustibles de classement A1 ?",
    type: "booleen", article: "48", paragraphe: "troisième alinéa",
    aide: "Si oui, les trappes et portes de visite tiennent le coupe-feu 1/4 d'heure (EI 15) quelle "
      + "que soit leur surface : le seuil de 0,25 m² ne joue plus."
  },
  {
    cle: "surfaceTrappeDeGaine",
    libelle: "Surface de la trappe ou porte de visite",
    type: "nombre", unite: "m²", article: "48", paragraphe: "deuxième alinéa"
  },
  {
    cle: "paroiTraversee",
    libelle: "Que sépare la paroi traversée ?",
    type: "choix",
    valeurs: [
      { valeur: "entreLogements", libelle: "Deux logements" },
      { valeur: "logementVersLocalArticle9", libelle: "Un logement d'un ERP (art. 9) ou d'un sous-sol" },
      { valeur: "caveOuSousSol", libelle: "Une cave ou un sous-sol traversés" },
      { valeur: "autre", libelle: "Autre" }
    ],
    article: "49",
    aide: "L'article 49 pose une règle puis quatre exceptions numérotées ; c'est ce que sépare la "
      + "paroi qui décide laquelle s'applique."
  },
  {
    cle: "conduitIncorporeDansUneGaine",
    libelle: "Le conduit est-il incorporé dans une gaine ?",
    type: "booleen", article: "49", paragraphe: "1°) et 2°)"
  },
  {
    cle: "conduiteMontanteDeGaz",
    libelle: "Le bâtiment comporte-t-il une conduite montante de gaz ?",
    type: "booleen", article: "50"
  },
  {
    cle: "situationGaineGaz",
    libelle: "Où la gaine gaz est-elle située ?",
    type: "choix",
    valeurs: [
      { valeur: "cageEscalier", libelle: "En cage d'escalier" },
      { valeur: "partiesCommunesAutres", libelle: "En parties communes autres" }
    ],
    article: "54",
    aide: "C'est la seconde entrée du tableau de l'article 54. En cage d'escalier, la solution est "
      + "interdite en 3ᵉ famille B et en 4ᵉ famille — sauf si l'escalier est « à l'air libre »."
  },
  {
    cle: "gazTraversantUnParcDeStationnement",
    libelle: "L'installation de gaz traverse-t-elle un parc de stationnement couvert annexe ?",
    type: "booleen", article: "56", paragraphe: "2°)"
  },
  {
    cle: "colonneMontanteElectriqueEnGaine",
    libelle: "Le bâtiment comporte-t-il une colonne montante « électricité » en gaine ?",
    type: "booleen", article: "58"
  },
  {
    cle: "typeVentilation",
    libelle: "Quel système de ventilation mécanique ?",
    type: "choix",
    valeurs: [
      { valeur: "simpleFlux", libelle: "VMC simple flux" },
      { valeur: "doubleFlux", libelle: "VMC double flux" },
      { valeur: "vmcInversee", libelle: "VMC inversée" },
      { valeur: "vmcGaz", libelle: "VMC-gaz" },
      { valeur: "aucune", libelle: "Aucune ventilation mécanique" }
    ],
    article: "60",
    aide: "Le tableau annexé croise les cinq solutions avec le type d'installation, et il porte des "
      + "interdictions : la n° 2 est interdite en VMC-gaz, les n° 3 et 5 en VMC inversée."
  },
  {
    cle: "solutionVentilationRetenue",
    libelle: "Quelle solution de ventilation mécanique est retenue ?",
    type: "choix",
    valeurs: [
      { valeur: "1", libelle: "N° 1 — ventilateur permanent (art. 60 § 1)" },
      { valeur: "2", libelle: "N° 2 — clapets à 70 °C (art. 60 § 2)" },
      { valeur: "3", libelle: "N° 3 — 50 Pa sans exutoire (art. 61 § b1)" },
      { valeur: "4", libelle: "N° 4 — 50 Pa, exutoire par conduit (art. 61 § b2.1)" },
      { valeur: "5", libelle: "N° 5 — 50 Pa, exutoire sur caisson (art. 61 § b2.2)" }
    ],
    article: "60"
  },
  {
    cle: "ventilateurDansUnLocalExterieur",
    libelle: "Le ventilateur est-il dans un local situé à l'extérieur du bâtiment ?",
    type: "booleen", article: "62", paragraphe: "a",
    aide: "À l'extérieur, les exigences sur les parois du local ne sont pas exigées."
  },
  {
    cle: "videOrdures",
    libelle: "Le bâtiment comporte-t-il un vide-ordures ?",
    type: "booleen", article: "64"
  },
  {
    cle: "videOrduresDansLesLogements",
    libelle: "Les vide-ordures sont-ils situés à l'intérieur des logements ?",
    type: "booleen", article: "64", paragraphe: "quatrième alinéa",
    aide: "À l'intérieur des logements, les degrés du conduit et du vidoir sont relevés."
  },
  {
    cle: "localOrduresDansLeParcDeStationnement",
    libelle: "Le local réceptacle des ordures est-il situé dans le parc de stationnement ?",
    type: "booleen", article: "64", paragraphe: "dernier alinéa",
    aide: "Dans le parc, les parois passent à CF 2 h et le bloc-porte à CF 1 h."
  },
  /* ── Titre V : logements-foyers ───────────────────────────────────────── */
  {
    cle: "logementFoyer",
    libelle: "Le bâtiment renferme-t-il un logement-foyer ?",
    type: "booleen", article: "65",
    aide: "Les mesures des articles 66 à 76 **s'ajoutent** aux prescriptions générales : le classement "
      + "en famille et tout ce qui en découle restent applicables."
  },
  {
    cle: "typeLogementFoyer",
    libelle: "Quel type de logement-foyer ?",
    type: "choix",
    valeurs: [
      { valeur: "autres", libelle: "Autres personnes (chapitre II)" },
      { valeur: "personnesAgees", libelle: "Personnes âgées autonomes (chapitre III)" },
      { valeur: "handicapesPhysiques", libelle: "Handicapés physiques autonomes" }
    ],
    article: "66",
    aide: "Les articles 73 à 76, qui régissaient les logements-foyers pour handicapés physiques "
      + "autonomes, ont été supprimés par l'arrêté du 19 juin 2015."
  },
  {
    cle: "nombreOccupantsLogementFoyer",
    libelle: "Nombre d'occupants que le logement-foyer est destiné à loger",
    type: "nombre", unite: "occupants", article: "67",
    aide: "Un escalier jusqu'à 200, deux de 201 à 400, puis un de plus par tranche de 200 entamée — "
      + "le texte dit « ou fraction de 200 »."
  },
  {
    cle: "occupantsParUniteDeVie",
    libelle: "Nombre de personnes reçues par unité de vie",
    type: "nombre", unite: "personnes", article: "69",
    aide: "Au-delà de dix, les dispositifs sonores se placent dans chaque unité de vie et non plus à "
      + "chaque niveau. L'unité de vie est l'ensemble des chambres et locaux liés à l'hébergement sur "
      + "un même niveau."
  },
  {
    cle: "occupantsParNiveau",
    libelle: "Nombre de personnes par niveau",
    type: "nombre", unite: "personnes", article: "70", paragraphe: "deuxième alinéa",
    aide: "En troisième famille A, au-delà de vingt par niveau **et** de dix par unité de vie, les "
      + "dégagements passent au régime de la troisième famille B."
  },
  {
    cle: "hallDessertServicesCollectifs",
    libelle: "Au rez-de-chaussée, le hall où aboutit l'escalier dessert-il des services collectifs ?",
    type: "booleen", article: "68",
    aide: "Salles de réunion, salles de jeux, restaurants et leurs dégagements au sens de l'article 66."
  },
  {
    cle: "hallOuvertureExterieureDeDeuxMetresCarres",
    libelle: "Le hall comporte-t-il une ouverture sur l'extérieur d'au moins 2 m², dans le tiers "
      + "supérieur de sa hauteur ?",
    type: "booleen", article: "68", paragraphe: "dernier alinéa",
    aide: "Un haut de porte ou un châssis ouvrant y suffit. C'est la première des deux conditions de "
      + "l'exception ; l'autre est la distance du débouché de l'escalier à la sortie."
  },
  {
    cle: "distanceDebouchEscalierSortie",
    libelle: "Distance du débouché de l'escalier à la sortie du bâtiment",
    type: "nombre", unite: "m", article: "68", paragraphe: "dernier alinéa",
    aide: "Seconde condition de l'exception : moins de 7 m."
  },
  {
    cle: "servicesCollectifsEnEtage",
    libelle: "Les services collectifs sont-ils situés dans les étages ?",
    type: "booleen", article: "71"
  },
  {
    cle: "etageLePlusHautDuFoyer",
    libelle: "Étage le plus haut affecté au logement-foyer",
    type: "nombre", unite: "étage", article: "72", paragraphe: "deuxième alinéa",
    aide: "Un foyer pour personnes âgées autonomes ne peut être installé au-delà du 6ᵉ étage."
  },

  /* ── Titre VII : dispositions diverses ────────────────────────────────── */
  {
    cle: "ascenseur",
    libelle: "Le bâtiment comporte-t-il un ascenseur ?",
    type: "booleen", article: "97"
  },
  {
    cle: "ascenseurDessertSousSolParcOuCaves",
    libelle: "L'ascenseur dessert-il un sous-sol comportant un parc de stationnement ou des caves ?",
    type: "booleen", article: "97", paragraphe: "cinquième alinéa"
  },
  {
    cle: "accesHallsAtteintsParVoieEchelles",
    libelle: "Au rez-de-chaussée, les accès aux halls d'entrée sont-ils atteints par la voie-échelles ?",
    type: "booleen", article: "98", paragraphe: "deuxième alinéa",
    aide: "Seconde condition de l'exception qui dispense de colonne sèche un collectif de troisième "
      + "famille B de sept étages au plus. La récapitulation de 1997 ne la mentionne pas : elle est "
      + "antérieure à la rédaction de 2015."
  },
  {
    cle: "conduitsOuGainesTraversantDesParois",
    libelle: "Des conduits ou gaines sont-ils aménagés dans le bâtiment ?",
    type: "booleen",
    article: "45"
  }
];

/** Une question, par sa clé. */
export function questionDe(cle) {
  return QUESTIONS.find((q) => q.cle === cle) ?? null;
}
