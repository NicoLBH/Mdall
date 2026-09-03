/**
 * Titre V — logements-foyers, et titre VII — dispositions diverses.
 *
 * ## Ce que le titre V ajoute, il ne le remplace pas
 *
 * L'article 65 est explicite : les mesures des articles 66 à 76 « s'ajoutent
 * aux prescriptions générales des articles premier à 64 ci-avant et 77 à 106
 * ci-après ». Un logement-foyer reste donc classé en famille, et tout ce que
 * les titres II à IV en tirent continue de valoir. Ce titre-ci ne fait
 * qu'empiler des exigences supplémentaires — et c'est pourquoi ses modules ne
 * remplacent aucun de ceux déjà portés.
 *
 * ## Quatre articles qui n'existent plus
 *
 * Les articles 73 à 76, sur les logements-foyers pour handicapés physiques,
 * ont été **supprimés par l'arrêté du 19 juin 2015**. Ils figurent encore dans
 * le fascicule, barrés, et c'est exactement le piège : un lecteur pressé les
 * applique. Le module les nomme et dit qu'ils ne s'appliquent plus, plutôt que
 * de se taire — un silence se lirait comme un oubli.
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
 * TITRE V — LOGEMENTS-FOYERS (articles 65 à 76)
 * ================================================================== */

export const regimeLogementFoyer = {
  id: "regime-logement-foyer",
  titre: "Régime applicable au logement-foyer",
  repond: "Quelles dispositions particulières s'ajoutent pour ce logement-foyer ?",
  produit: "regimeLogementFoyer",
  source: { article: "65" },
  regles: [
    {
      si: { logementFoyer: false },
      alors: { valeur: "sans objet", sansObjet: "Le bâtiment ne renferme pas de logement-foyer." },
      source: reglement("65", null, "Les mesures particulières définies aux articles 66 à 76 ci-après sont applicables aux bâtiments renfermant des logements-foyers et s'ajoutent aux prescriptions générales des articles premier à 64 ci-avant et 77 à 106 ci-après.")
    },
    {
      // Les articles 73 à 76 ont été supprimés. Les nommer et dire qu'ils ne
      // s'appliquent plus vaut mieux que de se taire : ils figurent encore dans
      // le fascicule, et un silence se lirait comme un oubli.
      si: { logementFoyer: true, typeLogementFoyer: "handicapesPhysiques" },
      alors: { valeur: "chapitre II — les articles 73 à 76 sont supprimés",
        mention: "L'arrêté du 19 juin 2015 a supprimé les articles 73 à 76, qui régissaient les logements-foyers "
          + "pour handicapés physiques autonomes. Les établissements ou services spécialisés pour recevoir des "
          + "personnes en situation de handicap relèvent du règlement de sécurité des établissements recevant du "
          + "public, en type J — ou en type U pour ceux dont les occupants n'ont pas leur autonomie et doivent "
          + "être surveillés en permanence (point de vue SOCOTEC)." },
      source: lecture("73 à 76", "articles supprimés", "Article 73 — article supprimé (arrêté du 19 juin 2015). Les mesures définies au chapitre II du présent titre sont applicables aux logements-foyers pour handicapés physiques pouvant se déplacer même en fauteuil roulant, sans l'aide d'une tierce personne.")
    },
    {
      si: { logementFoyer: true, typeLogementFoyer: "personnesAgees" },
      alors: { valeur: "chapitre II, plus les restrictions du chapitre III",
        mention: "Les mesures du chapitre II s'appliquent aux logements-foyers pour personnes âgées autonomes au sens "
          + "de l'arrêté du 14 avril 2011. Les établissements recevant des personnes âgées dépendantes ou nécessitant "
          + "des soins constants relèvent du règlement des établissements recevant du public, en type J." },
      source: reglement("72", "premier alinéa", "Les mesures particulières définies au chapitre II du présent titre sont applicables aux logements-foyers pour personnes âgées autonomes tels que définis à l'article 1er de l'arrêté du 14 avril 2011 relatif à l'application de l'article R. 111-1-1 du code de la construction et de l'habitation.")
    },
    {
      si: { logementFoyer: true },
      alors: { valeur: "chapitre II",
        mention: "Ces mesures s'ajoutent aux prescriptions générales des articles 1er à 64 et 77 à 106 : le classement "
          + "en famille et tout ce qui en découle restent applicables. Les services collectifs — salles de réunion, "
          + "salles de jeux, restaurants et leurs dégagements — sont considérés comme locaux recevant du public et "
          + "relèvent seuls de la réglementation des ERP." },
      source: reglement("66", "1°) et 2°)", "Les bâtiments des logements-foyers sont constitués : 1°) Par des locaux assujettis aux seules dispositions du présent arrêté […] 2°) Par des services collectifs, tels que salles de réunion, salles de jeux, restaurants et leurs dégagements, considérés comme locaux recevant du public et seuls assujettis à la réglementation des établissements recevant du public.")
    }
  ]
};

/**
 * Le nombre d'escaliers d'un logement-foyer.
 *
 * Un escalier jusqu'à 200 occupants, deux de 201 à 400, puis un de plus par
 * tranche de 200 entamée. Le texte dit « ou fraction de 200 » : 401 occupants
 * en demandent trois, pas deux et demi.
 */
export const escaliersLogementFoyer = {
  id: "escaliers-logement-foyer",
  titre: "Nombre d'escaliers du logement-foyer",
  repond: "Combien d'escaliers le logement-foyer doit-il comporter ?",
  produit: "escaliersLogementFoyer",
  source: { article: "67" },
  regles: [
    {
      si: { logementFoyer: false },
      alors: { valeur: "sans objet", sansObjet: "Le bâtiment ne renferme pas de logement-foyer." },
      source: reglement("67", null, "Les logements-foyers doivent comporter : un escalier au moins lorsqu'ils sont destinés à loger au plus 200 occupants ; deux escaliers lorsqu'ils sont destinés à loger de 201 à 400 occupants ; et un escalier supplémentaire par 200 occupants ou fraction de 200 occupants supplémentaires.")
    },
    {
      si: { nombreOccupantsLogementFoyer: { auPlus: 200 } },
      alors: { valeur: "1 escalier au moins", mention: MENTION_ART67() },
      source: reglement("67", "premier tiret", "un escalier au moins lorsqu'ils sont destinés à loger au plus 200 occupants ;")
    },
    {
      si: { nombreOccupantsLogementFoyer: { auPlus: 400 } },
      alors: { valeur: "2 escaliers", mention: MENTION_ART67() },
      source: reglement("67", "deuxième tiret", "deux escaliers lorsqu'ils sont destinés à loger de 201 à 400 occupants ;")
    },
    {
      si: { nombreOccupantsLogementFoyer: { auPlus: 600 } },
      alors: { valeur: "3 escaliers", mention: MENTION_ART67() },
      source: reglement("67", "troisième tiret", "et un escalier supplémentaire par 200 occupants ou fraction de 200 occupants supplémentaires.")
    },
    {
      si: { nombreOccupantsLogementFoyer: { auPlus: 800 } },
      alors: { valeur: "4 escaliers", mention: MENTION_ART67() },
      source: reglement("67", "troisième tiret", "et un escalier supplémentaire par 200 occupants ou fraction de 200 occupants supplémentaires.")
    },
    {
      si: { nombreOccupantsLogementFoyer: { plusDe: 800 } },
      alors: { valeur: "5 escaliers au moins",
        mention: "Au-delà de 800 occupants, comptez un escalier de plus par tranche de 200 entamée. " + MENTION_ART67() },
      source: reglement("67", "troisième tiret", "et un escalier supplémentaire par 200 occupants ou fraction de 200 occupants supplémentaires.")
    }
  ]
};

function MENTION_ART67() {
  return "Ces escaliers, correspondant entre eux à chaque étage, doivent être judicieusement répartis pour "
    + "faciliter l'évacuation et être conformes à l'article R.111-5 du Code de la construction et de l'habitation.";
}

/**
 * Le hall où débouche l'escalier.
 *
 * L'exception du dernier alinéa a deux conditions, et la seconde est facile à
 * manquer : une ouverture de 2 m² dans le tiers supérieur **et** un débouché
 * d'escalier à moins de 7 m de la sortie. L'une sans l'autre ne libère rien.
 */
export const hallLogementFoyer = {
  id: "hall-logement-foyer",
  titre: "Séparation du hall et de l'escalier",
  repond: "Que faut-il entre l'escalier et le hall desservant les services collectifs ?",
  produit: "hallLogementFoyer",
  source: { article: "68" },
  regles: [
    {
      si: { logementFoyer: false },
      alors: { valeur: "sans objet", sansObjet: "Le bâtiment ne renferme pas de logement-foyer." },
      source: reglement("68", "premier alinéa", "Si, au rez-de-chaussée, le hall dans lequel aboutit l'escalier dessert également des services collectifs tels que visés à l'article 66, il doit être séparé de l'escalier par des parois et par des blocs-portes pare-flammes de degré 1/2 heure dont la porte est munie d'un ferme-porte.")
    },
    {
      si: { hallDessertServicesCollectifs: false },
      alors: { valeur: "sans objet",
        sansObjet: "Le hall où aboutit l'escalier ne dessert pas de services collectifs : l'article 68 ne le vise pas." },
      source: reglement("68", "premier alinéa", "Si, au rez-de-chaussée, le hall dans lequel aboutit l'escalier dessert également des services collectifs tels que visés à l'article 66…")
    },
    {
      si: { hallDessertServicesCollectifs: true, hallOuvertureExterieureDeDeuxMetresCarres: true, distanceDebouchEscalierSortie: { moinsDe: 7 } },
      alors: { valeur: "aucune caractéristique pare-flammes exigée pour les parois du hall",
        mention: "Les deux conditions du dernier alinéa sont réunies : une ouverture sur l'extérieur de 2 m² au moins "
          + "dans le tiers supérieur de la hauteur du hall — un haut de porte ou un châssis ouvrant y suffit — et un "
          + "débouché d'escalier à moins de 7 m de la sortie du bâtiment. L'une sans l'autre ne libère rien." },
      source: reglement("68", "dernier alinéa", "Toutefois, si le hall comporte la possibilité d'ouverture sur l'extérieur, située dans le tiers supérieur de sa hauteur, d'une section minimale de 2 m² et pouvant être constituée par un haut de porte ou un châssis ouvrant, aucune caractéristique pare-flammes n'est imposée pour les parois du hall, si en outre le débouché de l'escalier est à moins de 7 m de la sortie du bâtiment.")
    },
    {
      si: { hallDessertServicesCollectifs: true },
      alors: { valeur: "parois et blocs-portes PF 1/2 h",
        mention: "Porte munie d'un ferme-porte. Les autres parois du hall contiguës aux locaux de services collectifs, "
          + "et les portes qui y sont aménagées, sont également pare-flammes de degré 1/2 heure." },
      source: reglement("68", "premier et deuxième alinéas", "…il doit être séparé de l'escalier par des parois et par des blocs-portes pare-flammes de degré 1/2 heure dont la porte est munie d'un ferme-porte. En outre, les autres parois du hall contiguës aux locaux des services collectifs et les portes aménagées dans ces parois doivent être pare-flammes de degré 1/2 heure.")
    }
  ]
};

/**
 * L'alerte et l'alarme.
 *
 * Le seuil de dix personnes ne change pas la nature du dispositif mais son
 * emplacement : à chaque niveau en deçà, dans chaque unité de vie au-delà. Une
 * lecture rapide inverse volontiers les deux.
 */
export const alarmeLogementFoyer = {
  id: "alarme-logement-foyer",
  titre: "Alerte et alarme du logement-foyer",
  repond: "Quels moyens d'alerte et d'alarme, et où ?",
  produit: "alarmeLogementFoyer",
  source: { article: "69" },
  regles: [
    {
      si: { logementFoyer: false },
      alors: { valeur: "sans objet", sansObjet: "Le bâtiment ne renferme pas de logement-foyer." },
      source: reglement("69", null, "Un téléphone accessible en permanence et relié au réseau public doit permettre d'alerter les services publics de secours et de lutte contre l'incendie.")
    },
    {
      si: { occupantsParUniteDeVie: { auPlus: 10 } },
      alors: { valeur: "dispositifs sonores à chaque niveau", mention: MENTION_ART69() },
      source: reglement("69", "troisième alinéa", "Des dispositifs sonores doivent être placés à chaque niveau du bâtiment si les unités de vie reçoivent au plus 10 personnes, et dans chaque unité de vie si le nombre de leurs occupants est supérieur à 10.")
    },
    {
      si: { occupantsParUniteDeVie: { plusDe: 10 } },
      alors: { valeur: "dispositifs sonores dans chaque unité de vie", mention: MENTION_ART69() },
      source: reglement("69", "troisième alinéa", "…et dans chaque unité de vie si le nombre de leurs occupants est supérieur à 10.")
    }
  ]
};

function MENTION_ART69() {
  return "S'y ajoutent, dans tous les cas : un téléphone accessible en permanence et relié au réseau public pour "
    + "alerter les services publics de secours, et un moyen d'alarme sonore audible de tout point du niveau, "
    + "actionnable à chaque niveau dans les circulations communes.";
}

export const enceinteUniteDeVie = {
  id: "enceinte-unite-de-vie",
  titre: "Enceinte d'une unité de vie",
  repond: "Quel degré pour les murs et cloisons délimitant une unité de vie ?",
  produit: "enceinteUniteDeVie",
  source: { article: "70" },
  regles: [
    {
      si: { logementFoyer: false },
      alors: { valeur: "sans objet", sansObjet: "Le bâtiment ne renferme pas de logement-foyer." },
      source: reglement("70", "premier alinéa", "Les murs et cloisons constituant l'enceinte d'une unité de vie doivent être coupe-feu de degré 1/2 heure en 3ème famille et 1 heure en 4ème famille.")
    },
    {
      si: { famille: "3" },
      alors: { valeur: "CF 1/2 h", mention: MENTION_ART70() },
      source: reglement("70", "premier alinéa", "Les murs et cloisons constituant l'enceinte d'une unité de vie doivent être coupe-feu de degré 1/2 heure en 3ème famille et 1 heure en 4ème famille.")
    },
    {
      si: { famille: "4" },
      alors: { valeur: "CF 1 h", mention: MENTION_ART70() },
      source: reglement("70", "premier alinéa", "…coupe-feu de degré 1/2 heure en 3ème famille et 1 heure en 4ème famille.")
    },
    {
      si: { famille: { renseigne: true } },
      alors: { valeur: "aucun degré fixé par cet article",
        sansObjet: "L'article 70 ne fixe de degré que pour les troisième et quatrième familles. Le bloc-porte reste exigé." },
      source: reglement("70", "premier alinéa", "Les murs et cloisons constituant l'enceinte d'une unité de vie doivent être coupe-feu de degré 1/2 heure en 3ème famille et 1 heure en 4ème famille.")
    }
  ]
};

function MENTION_ART70() {
  return "L'accès à chaque unité de vie est équipé d'un bloc-porte pare-flammes de degré 1/2 heure muni d'un "
    + "ferme-porte. L'unité de vie est l'ensemble des chambres et locaux directement liés à l'hébergement sur un "
    + "même niveau ; elle ne peut regrouper plusieurs logements, mais seulement des chambres individuelles "
    + "comportant éventuellement des espaces sanitaires — la porte donnant sur la circulation commune est alors "
    + "à considérer comme une porte palière (ministère chargé du logement, 23 novembre 2007).";
}

/**
 * Quand une troisième famille A doit suivre les dégagements de la B.
 *
 * Deux conditions cumulatives, et un renvoi. Plus de dix personnes par unité de
 * vie **et** plus de vingt par niveau : les dégagements passent au régime de
 * l'article 39, c'est-à-dire circulation désenfumée par deux ouvrants opposés
 * ou circulation protégée.
 */
export const degagementsUniteDeVie = {
  id: "degagements-unite-de-vie",
  titre: "Dégagements renforcés en 3ᵉ famille A",
  repond: "Les dégagements doivent-ils suivre le régime de la troisième famille B ?",
  produit: "degagementsUniteDeVie",
  source: { article: "70", paragraphe: "deuxième alinéa" },
  regles: [
    {
      si: { logementFoyer: false },
      alors: { valeur: "sans objet", sansObjet: "Le bâtiment ne renferme pas de logement-foyer." },
      source: reglement("70", "deuxième alinéa", "Dans les logements-foyers de 3ème famille A, si chaque unité de vie reçoit plus de 10 personnes et s'il y a plus de 20 personnes par niveau, les dégagements doivent respecter les dispositions prévues pour la 3ème famille B à l'article 39 ci-avant.")
    },
    {
      si: { classement: "3e famille A", occupantsParUniteDeVie: { plusDe: 10 }, occupantsParNiveau: { plusDe: 20 } },
      alors: { valeur: "régime de la 3ᵉ famille B (article 39)",
        mention: "Les circulations horizontales doivent alors être soit désenfumées par deux ouvrants sur des façades "
          + "opposées asservis à la détection, soit « protégées » au sens des articles 30 à 38 (point de vue SOCOTEC)." },
      source: reglement("70", "deuxième alinéa", "Dans les logements-foyers de 3ème famille A, si chaque unité de vie reçoit plus de 10 personnes et s'il y a plus de 20 personnes par niveau, les dégagements doivent respecter les dispositions prévues pour la 3ème famille B à l'article 39 ci-avant.")
    },
    {
      si: { typeLogementFoyer: "personnesAgees", etagesSurRdcRetenu: { auMoins: 4 } },
      alors: { valeur: "régime de la 3ᵉ famille B (article 39)",
        mention: "Un foyer pour personnes âgées de plus de trois étages sur rez-de-chaussée suit les dégagements de la "
          + "troisième famille B, qu'il constitue un bâtiment indépendant ou les premiers niveaux d'un autre bâtiment." },
      source: reglement("72", "troisième alinéa", "Lorsque le bâtiment-foyer pour personnes âgées comporte plus de trois étages sur rez-de-chaussée, que ces foyers constituent des bâtiments indépendants ou qu'ils constituent les premiers niveaux d'un autre bâtiment d'habitation, les dispositions prévues pour la 3ème famille B à l'article 39, relatives aux dégagements, doivent être appliquées.")
    },
    {
      si: { logementFoyer: true },
      alors: { valeur: "régime du classement",
        sansObjet: "Les conditions de renvoi à l'article 39 ne sont pas réunies : les dégagements suivent le régime de la famille." },
      source: reglement("70", "deuxième alinéa", "Dans les logements-foyers de 3ème famille A, si chaque unité de vie reçoit plus de 10 personnes et s'il y a plus de 20 personnes par niveau…")
    }
  ]
};

export const escaliersServicesCollectifs = {
  id: "escaliers-services-collectifs",
  titre: "Escaliers desservant les services collectifs",
  repond: "Les escaliers des services collectifs peuvent-ils être communs avec ceux des unités de vie ?",
  produit: "escaliersServicesCollectifs",
  source: { article: "71" },
  regles: [
    {
      si: { logementFoyer: false },
      alors: { valeur: "sans objet", sansObjet: "Le bâtiment ne renferme pas de logement-foyer." },
      source: reglement("71", null, "Si les services collectifs sont situés dans les étages, le ou les escaliers qui les desservent peuvent être communs avec ceux desservant les unités de vie à condition d'en être séparés par des parois coupe-feu de degré 1/2 heure dont les blocs-portes sont pare-flammes de degré 1/2 heure et munis de ferme-porte.")
    },
    {
      si: { servicesCollectifsEnEtage: true },
      alors: { valeur: "communs admis, séparés par parois CF 1/2 h et blocs-portes PF 1/2 h",
        mention: "Blocs-portes munis de ferme-porte. Les bagageries doivent être traitées comme des celliers au sens de l'article 10." },
      source: reglement("71", null, "…à condition d'en être séparés par des parois coupe-feu de degré 1/2 heure dont les blocs-portes sont pare-flammes de degré 1/2 heure et munis de ferme-porte.")
    },
    {
      si: { servicesCollectifsEnEtage: false },
      alors: { valeur: "sans objet",
        sansObjet: "Les services collectifs ne sont pas situés dans les étages.",
        mention: "Les bagageries doivent néanmoins être traitées comme des celliers au sens de l'article 10." },
      source: reglement("71", null, "Si les services collectifs sont situés dans les étages, le ou les escaliers qui les desservent peuvent être communs avec ceux desservant les unités de vie…")
    }
  ]
};

/**
 * Le plafond de six étages des foyers pour personnes âgées.
 *
 * Le texte le justifie : « pour tenir compte des difficultés de déplacement des
 * occupants ». Le ministère en a tiré, en 1988, qu'on n'installe pas non plus
 * les locaux collectifs qui leur sont destinés au-delà — le texte ne le dit
 * pas, la logique l'impose, et c'est une doctrine.
 */
export const niveauMaximalFoyerPersonnesAgees = {
  id: "niveau-maximal-foyer-personnes-agees",
  titre: "Niveau le plus haut d'un foyer pour personnes âgées",
  repond: "Jusqu'à quel étage un logement-foyer pour personnes âgées peut-il être installé ?",
  produit: "niveauMaximalFoyerPersonnesAgees",
  source: { article: "72", paragraphe: "deuxième alinéa" },
  regles: [
    // Ce module ne pose ses questions qu'une fois la portée établie : sans ce
    // garde-fou, on demandait la solution retenue avant de savoir si le texte
    // en exigeait une.
    {
      si: { regimeLogementFoyer: "sans objet" },
      alors: { valeur: "sans objet", sansObjet: "Le bâtiment ne renferme pas de logement-foyer." },
      source: lecture("65", "portée du titre V", "Le titre V ne vise que les logements-foyers. Sans logement-foyer, aucun de ses articles n'a d'objet.")
    },
    {
      si: { typeLogementFoyer: { differentDe: "personnesAgees" } },
      alors: { valeur: "sans objet", sansObjet: "Le chapitre III ne vise que les logements-foyers pour personnes âgées autonomes." },
      source: reglement("72", "deuxième alinéa", "Cependant, pour tenir compte des difficultés de déplacement des occupants, les niveaux affectés à l'installation de tels logements ne peuvent être situés au-delà du 6ème étage des bâtiments.")
    },
    {
      si: { etageLePlusHautDuFoyer: { auPlus: 6 } },
      alors: { valeur: "admis — 6ᵉ étage au plus", mention: MENTION_ART72() },
      source: reglement("72", "deuxième alinéa", "…les niveaux affectés à l'installation de tels logements ne peuvent être situés au-delà du 6ème étage des bâtiments.")
    },
    {
      si: { etageLePlusHautDuFoyer: { plusDe: 6 } },
      alors: { valeur: "interdit au-delà du 6ᵉ étage", mention: MENTION_ART72() },
      source: reglement("72", "deuxième alinéa", "Cependant, pour tenir compte des difficultés de déplacement des occupants, les niveaux affectés à l'installation de tels logements ne peuvent être situés au-delà du 6ème étage des bâtiments.")
    }
  ]
};

function MENTION_ART72() {
  return "Le ministère en tire que les locaux collectifs destinés aux personnes âgées — salles de réunion, "
    + "restaurants — ne doivent pas davantage être établis au-delà du 6ᵉ étage : le texte ne le dit pas, la "
    + "logique l'impose (MELATT, 18 mars 1988).";
}

/* ================================================================== *
 * TITRE VII — DISPOSITIONS DIVERSES (articles 97 à 99)
 * ================================================================== */

export const paroisCageAscenseur = {
  id: "parois-cage-ascenseur",
  titre: "Parois des cages d'ascenseur",
  repond: "Quel degré pour les parois de la cage d'ascenseur ?",
  produit: "paroisCageAscenseur",
  source: { article: "97" },
  regles: [
    {
      si: { ascenseur: false },
      alors: { valeur: "sans objet", sansObjet: "Le bâtiment ne comporte pas d'ascenseur." },
      source: reglement("97", "deuxième alinéa", "Les parois des cages d'ascenseurs doivent être : coupe-feu de degré 1/2 heure pour les bâtiments de 2ème famille…")
    },
    {
      si: { famille: "2" },
      alors: { valeur: "CF 1/2 h", mention: MENTION_ART97() },
      source: reglement("97", "deuxième alinéa, premier tiret", "coupe-feu de degré 1/2 heure pour les bâtiments de 2ème famille ;")
    },
    {
      si: { classement: "3e famille A" },
      alors: { valeur: "CF 1 h", mention: MENTION_ART97() },
      source: reglement("97", "deuxième alinéa, deuxième tiret", "coupe-feu de degré 1 heure pour les bâtiments de 3ème famille A ;")
    },
    {
      si: { classement: ["3e famille B", "4e famille"] },
      alors: { valeur: "CF 1 h", mention: MENTION_ART97() },
      source: reglement("97", "deuxième alinéa, troisième tiret", "coupe-feu de degré 1 heure pour les bâtiments de 3ème famille B et de 4ème famille.")
    },
    {
      si: { famille: { renseigne: true } },
      alors: { valeur: "aucun degré fixé par cet article",
        sansObjet: "L'article 97 ne fixe de degré qu'à partir de la deuxième famille." },
      source: reglement("97", "deuxième alinéa", "Les parois des cages d'ascenseurs doivent être : coupe-feu de degré 1/2 heure pour les bâtiments de 2ème famille…")
    }
  ]
};

function MENTION_ART97() {
  return "Les ascenseurs ne sont pas considérés comme des moyens d'évacuation, sauf dans les foyers pour "
    + "handicapés. À chaque niveau desservi, ils doivent toujours être accessibles depuis les circulations "
    + "communes — un accès direct à certains logements n'exonère pas de cette obligation (point de vue SOCOTEC) ; "
    + "la porte d'un logement donnant directement sur l'ascenseur a le même degré coupe-feu que la paroi qui la porte.";
}

export const sasAscenseurSousSol = {
  id: "sas-ascenseur-sous-sol",
  titre: "Isolement de l'ascenseur desservant un sous-sol",
  repond: "Que faut-il entre l'ascenseur et un parc de stationnement ou des caves ?",
  produit: "sasAscenseurSousSol",
  source: { article: "97", paragraphe: "cinquième alinéa" },
  regles: [
    {
      si: { ascenseur: false },
      alors: { valeur: "sans objet", sansObjet: "Le bâtiment ne comporte pas d'ascenseur." },
      source: reglement("97", "cinquième alinéa", "S'ils desservent des sous-sols comportant des parcs de stationnement de véhicules automobiles, ou des volumes de caves, ils doivent être isolés de ces locaux par des sas d'une surface de 3 m² environ…")
    },
    {
      si: { ascenseurDessertSousSolParcOuCaves: true },
      alors: { valeur: "sas de 3 m² environ, deux portes PF 1/2 h",
        mention: "Portes équipées d'un ferme-porte et s'ouvrant toutes les deux vers l'intérieur du sas." },
      source: reglement("97", "cinquième alinéa", "…ils doivent être isolés de ces locaux par des sas d'une surface de 3 m² environ et munis de deux portes pare-flammes de degré 1/2 heure équipées d'un ferme-porte et s'ouvrant toutes les deux vers l'intérieur du sas.")
    },
    {
      si: { ascenseurDessertSousSolParcOuCaves: false },
      alors: { valeur: "sans objet", sansObjet: "L'ascenseur ne dessert ni parc de stationnement, ni volume de caves en sous-sol." },
      source: reglement("97", "cinquième alinéa", "S'ils desservent des sous-sols comportant des parcs de stationnement de véhicules automobiles, ou des volumes de caves…")
    }
  ]
};

export const appelPrioritairePompiers = {
  id: "appel-prioritaire-pompiers",
  titre: "Appel prioritaire des sapeurs-pompiers",
  repond: "Un dispositif d'appel prioritaire est-il exigé ?",
  produit: "appelPrioritairePompiers",
  source: { article: "97", paragraphe: "dernier alinéa" },
  regles: [
    {
      si: { ascenseur: false },
      alors: { valeur: "sans objet", sansObjet: "Le bâtiment ne comporte pas d'ascenseur." },
      source: reglement("97", "dernier alinéa", "Dans les habitations de la 4ème famille, les ascenseurs doivent comporter un dispositif d'appel et de commande prioritaire d'une cabine au moins par batterie…")
    },
    {
      si: { famille: "4" },
      alors: { valeur: "exigé — une cabine au moins par batterie",
        mention: "Conforme à la norme NF P 82-207 et asservi à la détection ; la cabine ne doit pas pouvoir s'arrêter au niveau sinistré." },
      source: reglement("97", "dernier alinéa", "Dans les habitations de la 4ème famille, les ascenseurs doivent comporter un dispositif d'appel et de commande prioritaire d'une cabine au moins par batterie, destiné à mettre ces appareils à la disposition des sapeurs-pompiers dès leur arrivée sur les lieux.")
    },
    {
      si: { famille: { renseigne: true } },
      alors: { valeur: "non exigé", sansObjet: "Ce dispositif n'est exigé que dans les habitations de la quatrième famille." },
      source: reglement("97", "dernier alinéa", "Dans les habitations de la 4ème famille, les ascenseurs doivent comporter un dispositif d'appel et de commande prioritaire…")
    }
  ]
};

/**
 * La colonne sèche, telle que l'article 98 la commande.
 *
 * ## Ce que l'article 3 dit, et ce qu'il ne dit pas
 *
 * L'article 3, 3°), avant-dernier alinéa, exige des colonnes sèches au-delà de
 * sept étages — mais il est écrit **dans le paragraphe du déclassement**, et il
 * ne vise donc que les bâtiments de troisième famille B soumis, par décision du
 * maire, aux seules prescriptions de la troisième famille A. La règle générale
 * est ici, à l'article 98, et elle est plus large : toute troisième famille B et
 * toute quatrième famille, sauf une exception à deux conditions.
 *
 * ## L'exception, et ses deux conditions
 *
 * Elle ne joue que pour un bâtiment **collectif** de troisième famille B, à
 * sept étages au plus sur rez-de-chaussée, **et** dont les accès aux halls
 * d'entrée sont atteints par la voie-échelles. La récapitulation de 1997 ne
 * mentionne que le nombre d'étages : elle est antérieure à la rédaction de 2015,
 * qui a ajouté la condition d'implantation.
 */
export const colonneSeche = {
  id: "colonne-seche",
  titre: "Colonne sèche",
  repond: "Une colonne sèche est-elle exigée, et laquelle ?",
  produit: "colonneSeche",
  source: { article: "98" },
  regles: [
    {
      si: { famille: "4" },
      alors: { valeur: "exigée — une colonne sèche de 65 mm par escalier", mention: MENTION_ART98() },
      source: reglement("98", "premier alinéa", "Les habitations de la 3ème famille B et de la 4ème famille doivent comporter une colonne sèche de 65 mm par escalier.")
    },
    {
      si: {
        classement: "3e famille B", natureHabitation: "collective",
        etagesSurRdcRetenu: { auPlus: 7 }, accesHallsAtteintsParVoieEchelles: true
      },
      alors: { valeur: "non obligatoire",
        mention: "Les deux conditions de l'exception sont réunies : sept étages au plus sur rez-de-chaussée et accès aux "
          + "halls d'entrée atteints par la voie-échelles de l'article 4. En cas de difficultés d'accès — immeuble en fond "
          + "de cour, dénivelée importante — la situation s'examine au cas par cas avec les services de secours." },
      source: reglement("98", "deuxième alinéa", "Toutefois, elle n'est pas obligatoire dans les bâtiments collectifs d'habitation de la troisième famille B comportant au plus sept étages sur rez-de-chaussée et implantés de telle sorte qu'au rez-de-chaussée les accès au(x) hall(s) d'entrée soient atteints par la voie échelles définies à l'article 4 ci-avant.")
    },
    {
      si: { classement: "3e famille B" },
      alors: { valeur: "exigée — une colonne sèche de 65 mm par escalier", mention: MENTION_ART98() },
      source: reglement("98", "premier alinéa", "Les habitations de la 3ème famille B et de la 4ème famille doivent comporter une colonne sèche de 65 mm par escalier.")
    },
    {
      si: { regimeApplique: "3e famille A", etagesSurRdcRetenu: { auMoins: 8 } },
      alors: { valeur: "exigée — une colonne sèche de 65 mm par escalier",
        mention: "Bâtiment de troisième famille B soumis, par décision du maire, aux seules prescriptions de la troisième "
          + "famille A : l'article 3 maintient l'exigence au-delà de sept étages sur rez-de-chaussée. " + MENTION_ART98() },
      source: reglement("3", "3°), avant-dernier alinéa", "De plus, les bâtiments comportant plus de sept étages sur rez-de-chaussée doivent être équipés de colonnes sèches conformément aux dispositions de l'article 98.")
    },
    {
      si: { famille: { renseigne: true } },
      alors: { valeur: "non exigée",
        sansObjet: "L'article 98 ne vise que la troisième famille B et la quatrième famille." },
      source: reglement("98", "premier alinéa", "Les habitations de la 3ème famille B et de la 4ème famille doivent comporter une colonne sèche de 65 mm par escalier.")
    }
  ]
};

function MENTION_ART98() {
  return "Munie d'une prise de 40 mm par niveau, ou d'une prise double de 40 mm aux niveaux desservant des "
    + "logements en duplex ou en triplex. Conforme à la norme NF S 61-750, prises placées à l'intérieur des sas "
    + "lorsqu'il en existe. Le raccord d'alimentation doit être à 60 m au plus d'une prise d'eau normalisée "
    + "accessible par un cheminement praticable, le long d'une voie répondant à l'article 4 ; les points d'eau "
    + "sont à 5 m au plus du bord de la chaussée ou de l'aire de stationnement des engins. L'arrêté n'impose pas "
    + "de robinets d'incendie armés, et leur substitution à une colonne sèche suppose une demande motivée auprès "
    + "du service instructeur.";
}

export const circulationPietons = {
  id: "circulation-pietons",
  titre: "Circulation des piétons",
  repond: "Que faut-il des cheminements piétons vers les accès aux immeubles ?",
  produit: "circulationPietons",
  source: { article: "99" },
  regles: [
    {
      si: { classement: { renseigne: true } },
      alors: { valeur: "aires distinctes de la circulation automobile",
        mention: "Entre la voirie générale et les accès principaux aux immeubles." },
      source: reglement("99", null, "Les aires réservées à la circulation des piétons entre la voirie générale et les accès principaux aux immeubles doivent être nettement distinctes de celles réservées à la circulation automobile.")
    }
  ]
};

export const MODULES_FOYERS = [
  regimeLogementFoyer, escaliersLogementFoyer, hallLogementFoyer, alarmeLogementFoyer,
  enceinteUniteDeVie, degagementsUniteDeVie, escaliersServicesCollectifs,
  niveauMaximalFoyerPersonnesAgees,
  paroisCageAscenseur, sasAscenseurSousSol, appelPrioritairePompiers,
  colonneSeche, circulationPietons
];
