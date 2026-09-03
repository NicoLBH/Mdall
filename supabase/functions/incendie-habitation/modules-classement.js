/**
 * Le classement des bâtiments d'habitation, et ce qui y mène.
 *
 * ## Pourquoi c'est ici que tout commence
 *
 * Presque toutes les exigences de l'arrêté se lisent « habitations de la
 * première famille : … ; de la deuxième famille : … ». Le classement est donc
 * la racine du graphe : une erreur ici se propage partout, et une erreur
 * ailleurs reste locale. C'est aussi pourquoi il est découpé aussi finement —
 * chaque tiret du texte est une règle, pas un morceau de phrase.
 *
 * ## L'ordre des règles est celui du texte
 *
 * Le 2°) ne s'applique qu'à ce que le 1°) n'a pas pris, le 4°) qu'à ce qui « ne
 * relève pas des trois autres familles ». Les règles se lisent donc dans
 * l'ordre, et le moteur ne conclut que lorsque toutes celles qui précèdent sont
 * écartées avec certitude.
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
const commentaire = (article, paragraphe, citation, origine) => ({ nature: "commentaire", texte: origine, article, paragraphe, citation });

/* ------------------------------------------------------------------ *
 * Ce que l'arrêté regarde
 * ------------------------------------------------------------------ */

export const natureHabitation = {
  id: "nature-habitation",
  titre: "Habitation individuelle ou collective",
  repond: "Le bâtiment est-il, au sens de l'arrêté, une habitation individuelle ou collective ?",
  produit: "natureHabitation",
  source: { article: "3", paragraphe: "application des 1°) et 2°)" },
  regles: [
    {
      si: { logementsSuperposes: false },
      alors: { valeur: "individuelle" },
      source: reglement("3", "application des 1°) et 2°), premier tiret",
        "Sont considérés comme maisons individuelles au sens du présent arrêté les bâtiments d'habitation ne comportant pas de logements superposés.")
    },
    {
      si: { logementsSuperposes: true },
      alors: { valeur: "collective" },
      source: commentaire("3", "vocabulaire",
        "Habitations collectives : au sens du présent arrêté, il s'agit de bâtiment d'habitation comportant des logements superposés.",
        "vocabulaire annexé — commentaire SOCOTEC")
    }
  ]
};

/* ------------------------------------------------------------------ *
 * Duplex et triplex : ce que l'on compte
 * ------------------------------------------------------------------ */

export const duplexNiveauBas = {
  id: "duplex-niveau-bas",
  titre: "Prise en compte du seul niveau bas des duplex et triplex",
  repond: "Pour le classement, ne compte-t-on que le niveau bas des duplex ou triplex du dernier étage ?",
  produit: "duplexNiveauBasSeulRetenu",
  source: { article: "3", paragraphe: "5°)" },
  regles: [
    {
      si: { duplexOuTriplexAuDernierEtage: false },
      alors: { valeur: false, sansObjet: "Aucun duplex ni triplex à l'étage le plus élevé." },
      source: reglement("3", "5°)", "Pour le classement des bâtiments des trois premières familles, seul le niveau bas des duplex ou des triplex des logements situés à l'étage le plus élevé est pris en compte…")
    },
    {
      // Trois conditions cumulatives, et le texte les énonce d'un seul tenant :
      // « … si ces logements disposent d'une pièce principale et d'une porte
      // palière en partie basse et que les planchers des différents niveaux
      // constituant ces logements répondent aux caractéristiques de l'article 6. »
      // Une seule qui manque, et le niveau haut recompte.
      si: {
        duplexOuTriplexAuDernierEtage: true,
        duplexPiecePrincipaleEtPortePaliereEnBas: true,
        duplexPlanchersConformesArticle6: true
      },
      alors: { valeur: true },
      source: reglement("3", "5°)", "… si ces logements disposent d'une pièce principale et d'une porte palière en partie basse et que les planchers des différents niveaux constituant ces logements répondent aux caractéristiques de l'article 6.")
    },
    {
      si: { duplexOuTriplexAuDernierEtage: true },
      alors: { valeur: false, mention: "Les trois conditions du 5°) ne sont pas toutes réunies : le niveau haut compte." },
      source: reglement("3", "5°)", "Pour le classement des bâtiments des trois premières familles, seul le niveau bas des duplex ou des triplex […] est pris en compte si […]")
    }
  ]
};

export const etagesRetenus = {
  id: "etages-retenus",
  titre: "Nombre d'étages retenu pour le classement",
  repond: "Combien d'étages sur rez-de-chaussée le classement retient-il ?",
  produit: "etagesSurRdcRetenu",
  source: { article: "3", paragraphe: "5°)" },
  regles: [
    {
      si: { duplexNiveauBasSeulRetenu: true },
      alors: { valeur: { fait: "etagesSurRdc", moins: 1 },
        mention: "Le niveau haut des duplex ou triplex du dernier étage n'est pas compté." },
      source: reglement("3", "5°)", "… seul le niveau bas des duplex ou des triplex des logements situés à l'étage le plus élevé est pris en compte…")
    },
    {
      si: { duplexNiveauBasSeulRetenu: false },
      alors: { valeur: { fait: "etagesSurRdc" } },
      source: lecture("3", "1°) à 4°)", "Le classement compte les étages sur rez-de-chaussée du bâtiment.")
    }
  ]
};

export const quadruplex = {
  id: "quadruplex",
  titre: "Quadruplex en habitation collective",
  repond: "Des logements de quatre niveaux ou plus sont-ils admis ?",
  produit: "quadruplexAdmis",
  source: { article: "3", paragraphe: "5°), dernier alinéa" },
  regles: [
    {
      si: { natureHabitation: "collective", quadruplexOuPlus: true },
      alors: { valeur: "non admis",
        mention: "Le bâtiment ne peut pas être classé en habitation dans cette configuration." },
      source: reglement("3", "5°), dernier alinéa", "Les quadruplex et plus ne sont pas admis dans les bâtiments d'habitation collectifs.")
    },
    {
      si: { quadruplexOuPlus: false },
      alors: { valeur: "sans objet", sansObjet: "Aucun logement de quatre niveaux ou plus." },
      source: reglement("3", "5°), dernier alinéa", "Les quadruplex et plus ne sont pas admis dans les bâtiments d'habitation collectifs.")
    },
    {
      si: { natureHabitation: "individuelle", quadruplexOuPlus: true },
      alors: { valeur: "admis",
        mention: "L'interdiction ne vise que les bâtiments d'habitation collectifs." },
      source: reglement("3", "5°), dernier alinéa", "Les quadruplex et plus ne sont pas admis dans les bâtiments d'habitation collectifs.")
    }
  ]
};

/* ------------------------------------------------------------------ *
 * Le champ d'application
 * ------------------------------------------------------------------ */

export const champApplication = {
  id: "champ-application",
  titre: "Champ d'application de l'arrêté",
  repond: "Le bâtiment relève-t-il de l'arrêté habitation, ou de la réglementation IGH ?",
  produit: "dansLeChampDeLArrete",
  source: { article: "1er" },
  regles: [
    {
      si: { hauteurPlancherBasNiveauLePlusHaut: { plusDe: 50 } },
      alors: { valeur: "hors champ — IGH",
        mention: "Relève des articles R.122-1 à R.122-29 du Code de la construction et de l'habitation et de l'arrêté du 30 décembre 2011." },
      source: commentaire("3", "4°)",
        "Cette définition (arrêté du 7 août 2019) interdit désormais le classement en habitation des bâtiments comportant un duplex en partie haute, dont le plancher bas serait situé à 50 m au plus, mais dont le niveau haut dépasserait cette hauteur de 50 m.",
        "commentaire SOCOTEC")
    },
    {
      si: { hauteurPlancherBasLogementLePlusHaut: { plusDe: 50 } },
      alors: { valeur: "hors champ — IGH",
        mention: "Le plancher bas du logement le plus haut dépasse 50 m au-dessus du sol utilement accessible aux engins." },
      source: reglement("1er", null, "Les dispositions du présent arrêté s'appliquent aux bâtiments d'habitation […] dont le plancher bas du logement le plus haut est situé au plus à 50 m au-dessus du sol utilement accessible aux engins des services de secours et de lutte contre l'incendie.")
    },
    {
      si: { hauteurPlancherBasLogementLePlusHaut: { auPlus: 50 }, hauteurPlancherBasNiveauLePlusHaut: { auPlus: 50 } },
      alors: { valeur: "dans le champ" },
      source: reglement("1er", null, "Les dispositions du présent arrêté s'appliquent aux bâtiments d'habitation […] au plus à 50 m au-dessus du sol utilement accessible aux engins…")
    }
  ]
};

/* ------------------------------------------------------------------ *
 * Le classement lui-même
 * ------------------------------------------------------------------ */

export const classement = {
  id: "classement",
  titre: "Classement du bâtiment",
  repond: "En quelle famille le bâtiment est-il classé ?",
  produit: "classement",
  source: { article: "3" },
  silence: "Aucune des quatre familles ne vise ce cas : à reprendre avec le service instructeur.",
  regles: [
    {
      si: { dansLeChampDeLArrete: "hors champ — IGH" },
      alors: { valeur: "hors champ — IGH",
        sansObjet: "Le bâtiment ne relève pas de l'arrêté habitation." },
      source: reglement("1er", null, "Les règles particulières concernant les immeubles d'habitation dont le plancher bas du logement le plus haut est situé à plus de 50 m au-dessus du sol font l'objet des articles R.122-1 à R.122-29 du Code de la construction et de l'habitation…")
    },

    /* 1°) Première famille — trois tirets, trois règles */
    {
      si: { natureHabitation: "individuelle", implantation: ["isolee", "jumelee"], etagesSurRdcRetenu: { auPlus: 1 } },
      alors: { valeur: "1re famille" },
      source: reglement("3", "1°), premier tiret", "habitations individuelles isolées ou jumelées à un étage sur rez-de-chaussée, au plus ;")
    },
    {
      si: { natureHabitation: "individuelle", implantation: "bande", etagesSurRdcRetenu: { auPlus: 0 } },
      alors: { valeur: "1re famille" },
      source: reglement("3", "1°), second tiret", "habitations individuelles à rez-de-chaussée groupées en bande.")
    },
    {
      si: { natureHabitation: "individuelle", implantation: "bande", etagesSurRdcRetenu: 1, structuresIndependantes: true },
      alors: { valeur: "1re famille",
        mention: "Indépendance de fait : le CSTB précise qu'un joint de dilatation n'est pas nécessaire si la ruine d'une maison ne met pas en cause la stabilité des voisines." },
      source: reglement("3", "1°), dernier alinéa", "Toutefois, sont également classées en première famille les habitations individuelles à un étage sur rez-de-chaussée, groupées en bande, lorsque les structures de chaque habitation concourant à la stabilité du bâtiment sont indépendantes de celles de l'habitation contiguë.")
    },

    /* 2°) Deuxième famille — quatre tirets, quatre règles */
    {
      si: { natureHabitation: "individuelle", implantation: ["isolee", "jumelee"], etagesSurRdcRetenu: { auMoins: 2 } },
      alors: { valeur: "2e famille" },
      source: reglement("3", "2°), premier tiret", "habitations individuelles isolées ou jumelées de plus d'un étage sur rez-de-chaussée ;")
    },
    {
      si: { natureHabitation: "individuelle", implantation: "bande", etagesSurRdcRetenu: 1, structuresIndependantes: false },
      alors: { valeur: "2e famille" },
      source: reglement("3", "2°), deuxième tiret", "habitations individuelles à un étage sur rez-de-chaussée seulement, groupées en bande, lorsque les structures de chaque habitation concourant à la stabilité du bâtiment ne sont pas indépendantes des structures de l'habitation contiguë ;")
    },
    {
      si: { natureHabitation: "individuelle", implantation: "bande", etagesSurRdcRetenu: { auMoins: 2 } },
      alors: { valeur: "2e famille" },
      source: reglement("3", "2°), troisième tiret", "habitations individuelles de plus d'un étage sur rez-de-chaussée groupées en bande ;")
    },
    {
      si: { natureHabitation: "collective", etagesSurRdcRetenu: { auPlus: 3 } },
      alors: { valeur: "2e famille" },
      source: reglement("3", "2°), quatrième tiret", "habitations collectives comportant au plus trois étages sur rez-de-chaussée.")
    },

    /* 3°) Troisième famille — A puis B, la B étant le reste de la 3e */
    {
      si: {
        hauteurPlancherBasLogementLePlusHaut: { auPlus: 28 },
        etagesSurRdcRetenu: { auPlus: 7 },
        distancePortePaliereEscalier: { auPlus: 10 },
        accesEscaliersAtteintsParVoieEchelles: true,
        voieEchellesConforme: "conforme"
      },
      alors: { valeur: "3e famille A" },
      source: reglement("3", "3°), troisième famille A", "habitations répondant à l'ensemble des prescriptions suivantes : comporter au plus sept étages sur rez-de-chaussée ; comporter des circulations horizontales telles que la distance entre la porte palière de logement la plus éloignée et l'accès de l'escalier soit au plus égale à 10 m ; être implantées de telle sorte qu'au rez-de-chaussée les accès aux escaliers soient atteints par la voie-échelles définie à l'article 4 ci-après.")
    },
    {
      si: { hauteurPlancherBasLogementLePlusHaut: { auPlus: 28 } },
      alors: { valeur: "3e famille B",
        mention: "Ces habitations doivent être implantées de telle sorte que les accès aux escaliers soient situés à moins de 50 m d'une voie-engins." },
      source: reglement("3", "3°), troisième famille B", "Troisième famille B : habitations ne satisfaisant pas à l'une des conditions précédentes. Ces habitations doivent être implantées de telle sorte que les accès aux escaliers soient situés à moins de 50 m d'une voie ouverte à la circulation répondant aux caractéristiques définies à l'article 4 ci-après (voie-engins).")
    },

    /* 4°) Quatrième famille — « et qui ne relèvent pas des trois autres » */
    {
      si: { hauteurPlancherBasNiveauLePlusHaut: { auPlus: 50 } },
      alors: { valeur: "4e famille",
        mention: "Ces habitations doivent être implantées de telle sorte que les accès aux escaliers protégés des articles 26 à 29 soient situés à moins de 50 m d'une voie-engins." },
      source: reglement("3", "4°)", "Habitations dont le plancher bas du niveau le plus haut est situé à 50 m au plus au-dessus du niveau du sol utilement accessible aux engins des services publics de secours et de lutte contre l'incendie, et qui ne relèvent pas des trois autres familles d'habitation.")
    }
  ]
};

/**
 * La famille seule, sans son sous-classement.
 *
 * Les articles 5, 6, 7 et la plupart des autres disent « habitations de la
 * troisième famille » sans distinguer A de B. Répéter les deux valeurs dans
 * chacune de leurs règles multiplierait les occasions d'en oublier une : on
 * dérive le chiffre une fois, ici, et tout le reste s'y adosse.
 */
export const famille = {
  id: "famille",
  titre: "Famille",
  repond: "De quelle famille relève le bâtiment, sans son sous-classement ?",
  produit: "famille",
  source: { article: "3" },
  regles: [
    { si: { classement: "1re famille" }, alors: { valeur: "1" }, source: lecture("3", "1°)", "1°) Première famille : les habitations que le 1°) de l'article 3 énumère.") },
    { si: { classement: "2e famille" }, alors: { valeur: "2" }, source: lecture("3", "2°)", "2°) Deuxième famille : les habitations que le 2°) de l'article 3 énumère.") },
    { si: { classement: ["3e famille A", "3e famille B"] }, alors: { valeur: "3" }, source: reglement("3", "3°)", "3°) Troisième famille : habitations dont le plancher bas du logement le plus haut est situé à 28 m au plus du sol utilement accessible aux engins des services de secours et de lutte contre l'incendie, parmi lesquelles on distingue […]") },
    { si: { classement: "4e famille" }, alors: { valeur: "4" }, source: reglement("3", "4°)", "4°) Quatrième famille : (arrêté du 7 août 2019) Habitations dont le plancher bas du niveau le plus haut est situé à 50 m au plus au dessus du niveau du sol utilement accessible aux engins des services publics de secours et de lutte contre l'incendie, et qui ne relèvent pas des trois autres familles d'habitation.") }
  ]
};

/* ------------------------------------------------------------------ *
 * Ce que le classement traîne avec lui
 * ------------------------------------------------------------------ */

export const declassement3B = {
  id: "declassement-3b",
  titre: "Déclassement de 3ᵉ famille B en 3ᵉ famille A",
  repond: "Le bâtiment peut-il être soumis aux seules prescriptions de la 3ᵉ famille A ?",
  produit: "regimeApplique",
  source: { article: "3", paragraphe: "3°), troisième alinéa" },
  regles: [
    {
      si: { classement: "3e famille B", arreteMunicipalDeclassement: true, logementsAtteignablesEchellesOuParcoursSur: true },
      alors: { valeur: "3e famille A",
        mention: "La hauteur du plancher bas du logement le plus haut doit correspondre à la hauteur susceptible d'être atteinte par les échelles." },
      source: reglement("3", "3°), troisième alinéa", "Toutefois, dans les communes dont les services de secours et de lutte contre l'incendie sont dotés d'échelles aériennes de hauteur suffisante, le maire peut décider que les bâtiments classés en 3ème famille B, situés dans le secteur d'intervention desdites échelles, peuvent être soumis aux seules prescriptions fixées pour les bâtiments classés en 3ème famille A.")
    },
    {
      si: { classement: "3e famille B", arreteMunicipalDeclassement: true, logementsAtteignablesEchellesOuParcoursSur: false },
      alors: { valeur: "3e famille B",
        mention: "Le déclassement suppose que chaque logement soit atteignable par les échelles, directement ou par un parcours sûr." },
      source: reglement("3", "3°), troisième alinéa", "…et chaque logement doit pouvoir être atteint soit directement, soit par un parcours sûr.")
    },
    {
      si: { classement: { renseigne: true } },
      alors: { valeur: { fait: "classement" } },
      source: lecture("3", null, "Le régime appliqué est celui du classement, à défaut de décision municipale de déclassement.")
    }
  ]
};

/**
 * L'obligation de colonnes sèches attachée au déclassement.
 *
 * Cet alinéa est écrit **dans le paragraphe du déclassement** : il ne vise que
 * les bâtiments de troisième famille B soumis, par décision du maire, aux
 * seules prescriptions de la troisième famille A. Le lire comme une règle
 * générale de la troisième famille B — ce que faisait la première version de
 * ce module — reviendrait à dispenser de colonne sèche les bâtiments de sept
 * étages au plus, alors que l'article 98 les vise. La règle générale est là-bas.
 */
export const colonnesSechesDeclassement = {
  id: "colonnes-seches-declassement",
  titre: "Colonnes sèches attachées au déclassement",
  repond: "Le déclassement en 3ᵉ famille A emporte-t-il l'obligation de colonnes sèches ?",
  produit: "colonnesSechesDeclassement",
  source: { article: "3", paragraphe: "3°), avant-dernier alinéa" },
  regles: [
    {
      si: { regimeApplique: "3e famille A", classement: "3e famille B", etagesSurRdcRetenu: { auMoins: 8 } },
      alors: { valeur: "exigées",
        mention: "Conformément aux dispositions de l'article 98, qui en fixe les caractéristiques." },
      source: reglement("3", "3°), avant-dernier alinéa", "De plus, les bâtiments comportant plus de sept étages sur rez-de-chaussée doivent être équipés de colonnes sèches conformément aux dispositions de l'article 98.")
    },
    {
      si: { regimeApplique: "3e famille A", classement: "3e famille B" },
      alors: { valeur: "non exigées par cet alinéa",
        mention: "Sept étages au plus sur rez-de-chaussée : cet alinéa ne les vise pas. L'article 98 reste à consulter." },
      source: reglement("3", "3°), avant-dernier alinéa", "De plus, les bâtiments comportant plus de sept étages sur rez-de-chaussée doivent être équipés de colonnes sèches conformément aux dispositions de l'article 98.")
    },
    {
      si: { classement: { renseigne: true } },
      alors: { valeur: "sans objet",
        sansObjet: "Cet alinéa ne vise que les bâtiments de troisième famille B déclassés en troisième famille A par décision du maire. L'obligation générale est à l'article 98." },
      source: reglement("3", "3°), avant-dernier alinéa", "De plus, les bâtiments comportant plus de sept étages sur rez-de-chaussée doivent être équipés de colonnes sèches conformément aux dispositions de l'article 98.")
    }
  ]
};

/**
 * L'encloisonnement des escaliers en 2ᵉ famille collective.
 *
 * Cette phrase-là est le type même de ce qu'un lecteur pressé rate : elle est
 * rangée dans un paragraphe intitulé « Pour l'application des 1°) et 2°) », qui
 * a tout l'air d'une note de vocabulaire, et elle pose pourtant une exigence de
 * construction. Trois étages sur rez-de-chaussée **et** plus de 8 m : les deux
 * ensemble, et l'escalier extérieur au sens de l'article 29 bis y échappe.
 */
export const escaliersEncloisonnes2e = {
  id: "escaliers-encloisonnes-2e",
  titre: "Encloisonnement des escaliers en 2ᵉ famille collective",
  repond: "Les escaliers doivent-ils être encloisonnés ?",
  produit: "escaliersAEncloisonner",
  source: { article: "3", paragraphe: "application des 1°) et 2°), second tiret" },
  regles: [
    {
      si: { natureHabitation: "collective", etagesSurRdcRetenu: 3, hauteurPlancherBasLogementLePlusHaut: { plusDe: 8 } },
      alors: { valeur: "encloisonnement exigé",
        mention: "Sauf si les escaliers sont extérieurs, tels que définis à l'article 29 bis." },
      source: reglement("3", "application des 1°) et 2°), second tiret", "les escaliers des bâtiments d'habitation collectifs de trois étages sur rez-de-chaussée dont le plancher bas du logement le plus haut est à plus de 8 m du sol doivent être encloisonnés sauf s'ils sont extérieurs tels que définis à l'article 29 bis.")
    },
    {
      si: { classement: { renseigne: true } },
      alors: { valeur: "non exigé par cet alinéa",
        sansObjet: "Cet alinéa ne vise que les collectifs de trois étages sur rez-de-chaussée dont le plancher bas du logement le plus haut dépasse 8 m." },
      source: reglement("3", "application des 1°) et 2°), second tiret", "les escaliers des bâtiments d'habitation collectifs de trois étages sur rez-de-chaussée dont le plancher bas du logement le plus haut est à plus de 8 m du sol doivent être encloisonnés…")
    }
  ]
};

/* ------------------------------------------------------------------ *
 * L'article 4 : ce qui fait qu'une voie en est une
 * ------------------------------------------------------------------ */

export const voieEngins = {
  id: "voie-engins",
  titre: "Voie-engins",
  repond: "La voie répond-elle aux caractéristiques de la voie-engins ?",
  produit: "voieEnginsConforme",
  source: { article: "4", paragraphe: "A" },
  regles: [
    {
      // L'article 4 s'ouvre par « Pour l'application de l'article 3 ci-avant » :
      // il ne vaut que si une voie est décrite. Sans cette porte, l'écran
      // ouvrirait sur la force portante d'une chaussée pour une maison de
      // plain-pied, et personne n'irait plus loin.
      si: { voieAccesDecrite: false },
      alors: { valeur: "non décrite",
        sansObjet: "Aucune voie d'accès n'est décrite. Les première et deuxième familles ne sont soumises à aucune prescription d'accès (question/réponse ministère de l'Équipement, 14 avril 1987)." },
      source: reglement("4", null, "(Arrêté du 18 août 1986) Pour l'application de l'article 3 ci-avant, les voies d'accès sont définies comme suit :")
    },
    { si: { voieLargeur: { moinsDe: 3 } }, alors: { valeur: "non conforme", mention: "Largeur inférieure à 3 m, bandes réservées au stationnement exclues." },
      source: reglement("4", "A", "largeur : 3 m, bandes réservées au stationnement exclues ;") },
    { si: { voieForcePortante: { moinsDe: 130 } }, alors: { valeur: "non conforme", mention: "Force portante inférieure à 130 kN." },
      source: reglement("4", "A", "force portante calculée pour un véhicule de 130 kN (dont 40 kN sur l'essieu avant et 90 kN sur l'essieu arrière, ceux-ci étant distants de 4,50 m) ;") },
    { si: { voieRayonInterieur: { moinsDe: 11 } }, alors: { valeur: "non conforme", mention: "Rayon intérieur inférieur à 11 m." },
      source: reglement("4", "A", "rayon intérieur minimum R : 11 m ;") },
    { si: { voieHauteurLibre: { moinsDe: 3.5 } }, alors: { valeur: "non conforme", mention: "Hauteur libre inférieure à 3,50 m (3,30 m majorés d'une marge de sécurité de 0,20 m)." },
      source: reglement("4", "A", "hauteur libre autorisant le passage d'un véhicule de 3,30 m de hauteur majorée d'une marge de sécurité de 0,20 m ;") },
    { si: { voiePente: { auMoins: 15 } }, alors: { valeur: "non conforme", mention: "Pente supérieure ou égale à 15 %." },
      source: reglement("4", "A", "pente inférieure à 15 %.") },
    {
      si: { voieAccesDecrite: true,
            voieLargeur: { auMoins: 3 }, voieForcePortante: { auMoins: 130 }, voieRayonInterieur: { auMoins: 11 },
            voieHauteurLibre: { auMoins: 3.5 }, voiePente: { moinsDe: 15 } },
      alors: { valeur: "conforme",
        mention: "Surlargeur S = 15/R à prévoir dans les virages de rayon inférieur à 50 m." },
      source: reglement("4", "A", "La voie-engins est une voie dont la chaussée répond aux caractéristiques suivantes quel que soit le sens de la circulation suivant lequel elle est abordée à partir de la voie publique…")
    }
  ]
};

export const voieEchelles = {
  id: "voie-echelles",
  titre: "Voie-échelles",
  repond: "La voie répond-elle aux caractéristiques de la voie-échelles ?",
  produit: "voieEchellesConforme",
  source: { article: "4", paragraphe: "B" },
  regles: [
    {
      // « La voie-échelles est une partie de la voie-engins dont les
      // caractéristiques sont complétées et modifiées comme suit » : ce qui
      // n'est pas une voie-engins n'a aucune chance d'être une voie-échelles.
      si: { voieEnginsConforme: ["non conforme", "non décrite"] },
      alors: { valeur: { fait: "voieEnginsConforme" },
        mention: "La voie-échelles est une partie de la voie-engins : elle en suppose les caractéristiques." },
      source: reglement("4", "B", "La voie-échelles est une partie de la voie-engins dont les caractéristiques sont complétées et modifiées comme suit…")
    },
    { si: { voieLongueur: { moinsDe: 10 } }, alors: { valeur: "non conforme", mention: "Longueur inférieure à 10 m." },
      source: reglement("4", "B", "la longueur minimale est de 10 m ;") },
    { si: { voieLargeur: { moinsDe: 4 } }, alors: { valeur: "non conforme", mention: "Largeur inférieure à 4 m, bandes réservées au stationnement exclues." },
      source: reglement("4", "B", "la largeur, bandes réservées au stationnement exclues, est portée à 4 m ;") },
    { si: { voiePente: { plusDe: 10 } }, alors: { valeur: "non conforme", mention: "Pente supérieure à 10 %." },
      source: reglement("4", "B", "la pente maximum est ramenée à 10 % ;") },
    { si: { voieResistancePoinconnement: { moinsDe: 100 } }, alors: { valeur: "non conforme", mention: "Résistance au poinçonnement inférieure à 100 kN." },
      source: reglement("4", "B", "la résistance au poinçonnement est fixée à 100 kN sur une surface circulaire de 0,20 m de diamètre ;") },
    { si: { voieRaccordeeAUneVoieEngins: "nonRaccordee" }, alors: { valeur: "non conforme", mention: "Section hors voie publique non raccordée à une voie-engins." },
      source: reglement("4", "B", "si cette section de voie n'est pas sur la voie publique, elle doit lui être raccordée par une voie utilisable par les engins de secours (voie-engins).") },
    {
      si: { voieEnginsConforme: "conforme", voieLongueur: { auMoins: 10 }, voieLargeur: { auMoins: 4 },
            voiePente: { auPlus: 10 }, voieResistancePoinconnement: { auMoins: 100 },
            voieRaccordeeAUneVoieEngins: ["surVoiePublique", "raccordee"] },
      alors: { valeur: "conforme",
        mention: "Voies parallèles : bord le plus proche à moins de 8 m et à plus de 1 m de la projection horizontale de la partie la plus saillante de la façade, pour les échelles de 30 m (6 m pour 24 m, 3 m pour 18 m). Voies perpendiculaires : extrémité à moins de 1 m de la façade, longueur minimale 10 m." },
      source: reglement("4", "B", "La voie-échelles est une partie de la voie-engins dont les caractéristiques sont complétées et modifiées comme suit…")
    }
  ]
};


/**
 * L'implantation par rapport à la voie-engins.
 *
 * La condition est écrite deux fois — au 3°) pour la troisième famille B, au
 * 4°) pour la quatrième — et dans les deux cas au détour d'une phrase, après le
 * classement lui-même. Elle ne change pas la famille : elle s'y ajoute, et un
 * bâtiment correctement classé peut parfaitement ne pas la respecter.
 */
export const implantationAccesEscaliers = {
  id: "implantation-acces-escaliers",
  titre: "Implantation des accès aux escaliers",
  repond: "L'implantation exigée par l'article 3 est-elle respectée ?",
  produit: "implantationAccesEscaliers",
  source: { article: "3", paragraphe: "3°) et 4°)" },
  regles: [
    {
      si: { classement: ["3e famille B", "4e famille"], accesEscaliersMoinsDe50mVoieEngins: true },
      alors: { valeur: "conforme" },
      source: reglement("3", "3°) troisième famille B et 4°)", "Ces habitations doivent être implantées de telle sorte que les accès aux escaliers soient situés à moins de 50 m d'une voie ouverte à la circulation répondant aux caractéristiques définies à l'article 4 ci-après (voie-engins).")
    },
    {
      si: { classement: ["3e famille B", "4e famille"], accesEscaliersMoinsDe50mVoieEngins: false },
      alors: { valeur: "non conforme",
        mention: "En quatrième famille, la condition porte sur les accès aux escaliers protégés prévus aux articles 26 à 29." },
      source: reglement("3", "3°) troisième famille B et 4°)", "…les accès aux escaliers soient situés à moins de 50 m d'une voie ouverte à la circulation répondant aux caractéristiques définies à l'article 4 ci-après (voie-engins).")
    },
    {
      si: { classement: { renseigne: true } },
      alors: { valeur: "sans objet",
        sansObjet: "Cette condition d'implantation ne vise que la troisième famille B et la quatrième famille. Les première et deuxième familles ne sont soumises à aucune prescription d'accès (question/réponse ministère de l'Équipement, 14 avril 1987)." },
      source: reglement("3", "3°) et 4°)", "Ces habitations doivent être implantées de telle sorte que les accès aux escaliers soient situés à moins de 50 m d'une voie ouverte à la circulation répondant aux caractéristiques définies à l'article 4 ci-après (voie-engins).")
    }
  ]
};

/**
 * La hauteur du plancher bas du logement le plus haut.
 *
 * ## Pourquoi elle se déduit plutôt que de se redemander
 *
 * L'arrêté mesure deux choses : la troisième famille au plancher bas du
 * **logement** le plus haut (28 m), la quatrième — depuis 2019 — au plancher
 * bas du **niveau** le plus haut (50 m). Les deux ne diffèrent que dans un cas,
 * et l'arrêté le nomme lui-même au 5°) : quand le logement le plus haut est un
 * duplex ou un triplex, son plancher bas est un niveau plus bas.
 *
 * On demandait les deux cotes, à plusieurs questions d'écart, et l'on obtenait
 * deux fois la même réponse — avec le risque qu'elles divergent par simple
 * fatigue. Une valeur écrite à deux endroits finit par diverger.
 */
export const hauteurLogementLePlusHaut = {
  id: "hauteur-logement-le-plus-haut",
  titre: "Hauteur du plancher bas du logement le plus haut",
  repond: "À quelle hauteur se trouve le plancher bas du logement le plus haut ?",
  produit: "hauteurPlancherBasLogementLePlusHaut",
  source: { article: "3", paragraphe: "3°) et 5°)" },
  regles: [
    {
      si: { duplexOuTriplexAuDernierEtage: false },
      alors: { valeur: { fait: "hauteurPlancherBasNiveauLePlusHaut" },
        mention: "Sans duplex ni triplex en partie haute, le logement le plus haut occupe le niveau le plus "
          + "haut : les deux cotes se confondent, et il n'y a pas lieu de les demander deux fois." },
      source: lecture("3", "3°) et 5°)", "Le plancher bas du logement le plus haut ne se distingue du plancher "
        + "bas du niveau le plus haut que lorsque le logement le plus haut occupe plusieurs niveaux.")
    },
    {
      si: { duplexOuTriplexAuDernierEtage: true },
      alors: { valeur: { fait: "hauteurPlancherBasLogementLePlusHautSiDuplex" },
        mention: "Le logement le plus haut occupe plusieurs niveaux : son plancher bas est plus bas que celui "
          + "du niveau le plus haut, et c'est lui que mesure la troisième famille." },
      source: reglement("3", "5°)", "Pour le classement des bâtiments des trois premières familles, seul le niveau bas des duplex ou des triplex des logements situés à l'étage le plus élevé est pris en compte […]")
    }
  ]
};

/**
 * Le sous-sol, compté plutôt que coché.
 *
 * Le parc de stationnement se compte en niveaux au-dessous du niveau de
 * référence ; le sous-sol se cochait. On répondait donc deux fois à ce qui est
 * le même sous-sol, et le schéma empilait un sous-sol au-dessus d'un parc qui
 * en était un. Un seul compte, et le parc en occupe une partie.
 */
export const sousSolDuBatiment = {
  id: "sous-sol",
  titre: "Sous-sol du bâtiment",
  repond: "Le bâtiment comporte-t-il un sous-sol ?",
  produit: "sousSol",
  source: { article: "6" },
  regles: [
    {
      si: { niveauxEnSousSol: { auMoins: 1 } },
      alors: { valeur: "avec sous-sol",
        mention: "Les niveaux occupés par un parc de stationnement en font partie : c'est le même sous-sol." },
      source: lecture("6", "premier tiret", "L'article 6 vise le plancher haut du sous-sol : il suffit qu'il en existe un.")
    },
    {
      si: { niveauxEnSousSol: { auPlus: 0 } },
      alors: { valeur: "sans sous-sol" },
      source: lecture("6", "premier tiret", "Sans niveau au-dessous du niveau de référence, il n'y a pas de plancher haut de sous-sol.")
    }
  ]
};

export const MODULES_CLASSEMENT = [
  hauteurLogementLePlusHaut, sousSolDuBatiment,
  natureHabitation, duplexNiveauBas, etagesRetenus, quadruplex,
  champApplication, voieEngins, voieEchelles,
  classement, famille, declassement3B, colonnesSechesDeclassement, escaliersEncloisonnes2e,
  implantationAccesEscaliers
];
