/**
 * Titre VI — parcs de stationnement couverts, annexes d'un bâtiment d'habitation.
 *
 * ## Une seconde racine
 *
 * Jusqu'ici tout pendait au classement : la famille décidait, et les modules en
 * tiraient un degré. Le parc, lui, se juge sur ses propres axes — sa surface,
 * son nombre de niveaux au-dessus et au-dessous du niveau de référence, la
 * hauteur de son plancher bas, sa contiguïté. Le graphe cesse donc d'avoir une
 * seule racine, et c'est visible à l'écran : une colonne entière de modules ne
 * dépend plus de la famille.
 *
 * Le classement reparaît à un seul endroit, et c'est l'endroit qui compte :
 * l'isolement d'un parc contigu vaut 2 heures si l'immeuble est de troisième ou
 * quatrième famille, 1 heure s'il est de deuxième. C'est la seule liaison entre
 * les deux moitiés du référentiel, et elle porte le mur qui les sépare.
 *
 * ## « Niveau » ne veut pas toujours dire la même chose
 *
 * Le ministère a été interrogé là-dessus en 1987 et a refusé de répondre en
 * général : à l'article 95, 1°, « à partir du 3ème niveau » exclut le niveau de
 * référence ; à l'article 96, 1°, deuxième tiret, « à chaque niveau une caisse
 * de 100 litres » l'inclut. Deux articles voisins, deux comptes différents. Les
 * modules le disent chacun pour soi plutôt que d'imposer une convention.
 */

const ARR = "arrêté du 31 janvier 1986 modifié";
const reglement = (article, paragraphe, citation) => ({ nature: "reglement", texte: ARR, article, paragraphe, citation });

/* ================================================================== *
 * CHAPITRE PREMIER — GÉNÉRALITÉS (articles 77 à 80)
 * ================================================================== */

export const champParc = {
  id: "champ-parc",
  titre: "Champ d'application du titre VI",
  repond: "Le parc relève-t-il des dispositions du titre VI ?",
  produit: "parcDansLeChamp",
  source: { article: "77" },
  regles: [
    {
      si: { parcDeStationnement: false },
      alors: { valeur: "sans objet", sansObjet: "Aucun parc de stationnement couvert annexe n'est déclaré." },
      source: reglement("77", "premier alinéa", "Les dispositions du présent titre sont applicables aux parcs de stationnement couverts lorsqu'ils ont plus de 100 m² et 6 000 m² au plus.")
    },
    {
      si: { surfaceParc: { auPlus: 100 } },
      alors: { valeur: "hors champ — au plus 100 m²",
        mention: "Au-dessous de cette capacité, aucune prescription supplémentaire n'est imposée aux locaux du fait "
          + "de la présence de véhicules. La juxtaposition de boxes fermés, indépendants et situés à l'extérieur, "
          + "séparés par des cloisons maçonnées, ne constitue pas non plus un parc au sens de l'arrêté — mais des "
          + "qualités de résistance au feu de l'enveloppe restent à imposer (MELATT, 26 novembre 1986 et 16 octobre 1987)." },
      source: reglement("77", "deuxième alinéa", "Au-dessous de la capacité minimale définie ci-dessus, aucune prescription supplémentaire n'est imposée aux locaux du fait de la présence de véhicules.")
    },
    {
      si: { surfaceParc: { plusDe: 6000 } },
      alors: { valeur: "hors champ — plus de 6 000 m²",
        mention: "Le titre VI ne va pas au-delà. Un parc plus vaste relève d'une autre réglementation, qui n'est pas portée par cet utilitaire." },
      source: reglement("77", "premier alinéa", "Les dispositions du présent titre sont applicables aux parcs de stationnement couverts lorsqu'ils ont plus de 100 m² et 6 000 m² au plus.")
    },
    {
      si: { surfaceParc: { plusDe: 100 } },
      alors: { valeur: "dans le champ",
        mention: "Un parc de stationnement est un emplacement couvert, annexe d'un ou plusieurs bâtiments d'habitation, "
          + "qui permet le remisage des véhicules à l'exclusion de toute autre activité. Un parc ouvert sur ses côtés, "
          + "indépendant et annexe, y répond aussi (commission du règlement de construction, 25 juin 1997)." },
      source: reglement("78", null, "Un parc de stationnement est un emplacement couvert, annexe d'un ou de plusieurs bâtiments d'habitation, qui permet le remisage, en dehors de la voie publique, des véhicules automobiles et de leurs remorques à l'exclusion de toute autre activité.")
    }
  ]
};

export const accesVehiculesLourds = {
  id: "acces-vehicules-lourds",
  titre: "Accès des véhicules lourds",
  repond: "Quels véhicules peuvent accéder au parc ?",
  produit: "accesVehiculesLourds",
  source: { article: "79" },
  regles: [
    {
      si: { parcDansLeChamp: "dans le champ" },
      alors: { valeur: "interdit au-delà de 3,5 t",
        mention: "Poids total en charge. Tous les éléments verticaux concourant à la stabilité doivent en outre être "
          + "protégés des chocs de véhicules, ou résister à de tels chocs sans modification de leurs caractéristiques "
          + "mécaniques (article 80)." },
      source: reglement("79", null, "L'accès des parcs est interdit aux véhicules de plus de 3,5 t de poids total en charge.")
    },
    {
      si: { parcDeStationnement: { renseigne: true } },
      alors: { valeur: "sans objet", sansObjet: "Le titre VI ne s'applique pas à ce parc." },
      source: reglement("79", null, "L'accès des parcs est interdit aux véhicules de plus de 3,5 t de poids total en charge.")
    }
  ]
};

export const reactionAuFeuParc = {
  id: "reaction-au-feu-parc",
  titre: "Réaction au feu des éléments du parc",
  repond: "Quel classement de réaction au feu pour les éléments de construction du parc ?",
  produit: "reactionAuFeuParc",
  source: { article: "80" },
  regles: [
    {
      si: { parcDansLeChamp: "dans le champ" },
      alors: { valeur: "M0 — éléments de construction et revêtements",
        mention: "Deux exceptions expresses : les revêtements de sol peuvent être classés M3 (article 90, dernier "
          + "alinéa), et les matériaux et produits d'isolation conformes au Guide de l'isolation par l'intérieur visé "
          + "à l'article 16 sont autorisés." },
      source: reglement("80", "deuxième alinéa", "Les éléments de construction et leurs revêtements éventuels doivent être classés en catégorie M0 du point de vue de leur réaction au feu sauf exception visée à l'article 90 ci-après.")
    },
    {
      si: { parcDeStationnement: { renseigne: true } },
      alors: { valeur: "sans objet", sansObjet: "Le titre VI ne s'applique pas à ce parc." },
      source: reglement("80", "deuxième alinéa", "Les éléments de construction et leurs revêtements éventuels doivent être classés en catégorie M0…")
    }
  ]
};

/* ================================================================== *
 * CHAPITRE II — STRUCTURES (article 81)
 * ================================================================== */

/**
 * La stabilité au feu du parc.
 *
 * Trois tranches, et elles ne se comptent pas de la même façon : la première
 * parle d'un rez-de-chaussée éventuellement surmonté d'un étage, les deux
 * suivantes de niveaux « au-dessus **ou** au-dessous du niveau de référence ».
 * C'est le plus grand des deux comptes qui commande, et non leur somme.
 */
export const stabiliteParc = {
  id: "stabilite-parc",
  titre: "Stabilité au feu des éléments porteurs du parc",
  repond: "Quel degré de stabilité au feu pour les porteurs du parc ?",
  produit: "stabiliteParc",
  source: { article: "81" },
  regles: [
    {
      si: { parcDansLeChamp: { differentDe: "dans le champ" } },
      alors: { valeur: "sans objet", sansObjet: "Le titre VI ne s'applique pas à ce parc." },
      source: reglement("81", null, "Indépendamment des caractéristiques relatives aux mesures d'isolement définies à l'article 82 pour certains d'entre eux, les éléments porteurs du parc doivent être : […]")
    },
    {
      si: { niveauxParcAuDessous: { auPlus: 0 }, niveauxParcAuDessus: { auPlus: 1 } },
      alors: { valeur: "SF 1/2 h",
        mention: "Parc à simple rez-de-chaussée, ou rez-de-chaussée surmonté d'un étage." },
      source: reglement("81", "premier tiret", "stables au feu de degré 1/2 heure pour les parcs à simple rez-de-chaussée ou comportant un rez-de-chaussée surmonté d'un étage ;")
    },
    {
      si: { niveauxParcAuDessus: { auPlus: 2 }, niveauxParcAuDessous: { auPlus: 2 } },
      alors: { valeur: "SF 1 h — planchers séparatifs CF 1 h" },
      source: reglement("81", "deuxième tiret", "stables au feu de degré 1 heure pour les parcs ayant au plus deux niveaux au-dessus ou au-dessous du niveau de référence ; les planchers séparatifs devant être coupe-feu de degré 1 heure ;")
    },
    {
      si: { hauteurPlancherBasDernierNiveauParc: { auPlus: 28 } },
      alors: { valeur: "SF 1 h 30 — planchers séparatifs CF 1 h 30",
        mention: "Toutefois, les dalles de ces planchers constituant des éléments secondaires de la structure peuvent "
          + "être coupe-feu de degré 1 heure seulement." },
      source: reglement("81", "troisième tiret", "stables au feu de degré 1 heure 30 pour les parcs de plus de deux niveaux et dont le plancher bas du dernier niveau est au plus à 28 m au-dessus ou au-dessous du niveau de référence.")
    },
    {
      si: { hauteurPlancherBasDernierNiveauParc: { plusDe: 28 } },
      alors: { valeur: "au-delà de la portée de l'article 81",
        sansObjet: "L'article 81 s'arrête à 28 m au-dessus ou au-dessous du niveau de référence. Au-delà, le parc relève d'une autre réglementation." },
      source: reglement("81", "troisième tiret", "…et dont le plancher bas du dernier niveau est au plus à 28 m au-dessus ou au-dessous du niveau de référence.")
    }
  ]
};

/* ================================================================== *
 * CHAPITRE III — ENVELOPPE (articles 82 à 86)
 * ================================================================== */

/**
 * L'isolement d'un parc contigu — la seule liaison avec le classement.
 *
 * Deux heures si l'immeuble contigu est de troisième ou quatrième famille, une
 * heure s'il est de deuxième. Le plancher bas est expressément exclu, et
 * « contigu » inclut le parc situé **en dessous** — le ministère l'a confirmé
 * d'un mot en 1987.
 */
export const isolementParcContigu = {
  id: "isolement-parc-contigu",
  titre: "Isolement d'un parc contigu à un immeuble d'habitation",
  repond: "Quel degré pour les murs et planchers séparant le parc de l'immeuble ?",
  produit: "isolementParcContigu",
  source: { article: "82", paragraphe: "1°)" },
  regles: [
    {
      si: { parcDansLeChamp: { differentDe: "dans le champ" } },
      alors: { valeur: "sans objet", sansObjet: "Le titre VI ne s'applique pas à ce parc." },
      source: reglement("82", "1°)", "Lorsque le parc est contigu à un immeuble d'habitation […] les murs, planchers séparatifs, sauf le plancher bas, ainsi que les éléments qui le constituent doivent être coupe-feu de degré 2 heures si l'immeuble contigu est classé en 3ème ou 4ème famille, coupe-feu de degré 1 heure si l'immeuble est classé en 2ème famille.")
    },
    {
      si: { parcContiguAImmeuble: true, famille: ["3", "4"] },
      alors: { valeur: "CF 2 h", mention: MENTION_ART82() },
      source: reglement("82", "1°)", "…doivent être coupe-feu de degré 2 heures si l'immeuble contigu est classé en 3ème ou 4ème famille…")
    },
    {
      si: { parcContiguAImmeuble: true, famille: "2" },
      alors: { valeur: "CF 1 h", mention: MENTION_ART82() },
      source: reglement("82", "1°)", "…coupe-feu de degré 1 heure si l'immeuble est classé en 2ème famille.")
    },
    {
      si: { parcContiguAImmeuble: true },
      alors: { valeur: "aucun degré fixé par cet article",
        sansObjet: "L'article 82, 1°), ne vise que les immeubles contigus classés en deuxième, troisième ou quatrième famille." },
      source: reglement("82", "1°)", "…coupe-feu de degré 2 heures si l'immeuble contigu est classé en 3ème ou 4ème famille, coupe-feu de degré 1 heure si l'immeuble est classé en 2ème famille.")
    },
    {
      si: { parcContiguAImmeuble: false, distanceParcAImmeubleHabite: { moinsDe: 8 } },
      alors: { valeur: "murs extérieurs PF 1 h dans la zone de 8 m",
        mention: "Les baies éventuelles doivent être fermées par des éléments pare-flammes de degré 1/2 heure." },
      source: reglement("82", "2°)", "Lorsque le parc n'est pas contigu, mais se trouve à moins de 8 m d'un immeuble habité ou occupé, les murs ou parois verticales extérieurs du parc, compris dans cette zone de 8 m, doivent être pare-flammes de degré 1 heure. Les baies éventuelles doivent être fermées par des éléments pare-flammes de degré 1/2 heure.")
    },
    {
      si: { parcContiguAImmeuble: false },
      alors: { valeur: "aucun isolement exigé par cet article",
        sansObjet: "Le parc n'est ni contigu, ni à moins de 8 m d'un immeuble habité ou occupé." },
      source: reglement("82", "2°)", "Lorsque le parc n'est pas contigu, mais se trouve à moins de 8 m d'un immeuble habité ou occupé…")
    }
  ]
};

function MENTION_ART82() {
  return "Le plancher bas est expressément exclu. « Contigu » inclut le parc situé en dessous (ministère de "
    + "l'Équipement, 14 avril 1987).";
}

/**
 * Le sas de communication entre le parc et le reste du bâtiment.
 *
 * Trois interdictions accompagnent la règle, et elles sont plus utiles que
 * l'exigence elle-même : un sas ne dessert jamais à la fois le parc et le
 * volume des caves ; il ne débouche pas dans la cage d'escalier commune aux
 * logements des niveaux inférieurs ; et s'il comporte trois portes, l'ordre en
 * est fixé.
 */
export const sasCommunicationParc = {
  id: "sas-communication-parc",
  titre: "Sas de communication entre le parc et le bâtiment",
  repond: "Que faut-il des communications aménagées entre le parc et le bâtiment ?",
  produit: "sasCommunicationParc",
  source: { article: "82", paragraphe: "1°), deuxième alinéa" },
  regles: [
    {
      si: { parcDansLeChamp: { differentDe: "dans le champ" } },
      alors: { valeur: "sans objet", sansObjet: "Le titre VI ne s'applique pas à ce parc." },
      source: reglement("82", "1°), deuxième alinéa", "Les communications éventuellement aménagées dans ces murs ou parois doivent être réalisées par un sas d'une surface de 3 m² minimum et muni de deux portes, chacune pare-flammes de degré 1/2 heure et équipées d'un ferme-porte, s'ouvrant toutes les deux vers l'intérieur du sas.")
    },
    {
      si: { communicationParcImmeuble: false },
      alors: { valeur: "sans objet", sansObjet: "Aucune communication n'est aménagée entre le parc et le bâtiment." },
      source: reglement("82", "1°), deuxième alinéa", "Les communications éventuellement aménagées dans ces murs ou parois doivent être réalisées par un sas…")
    },
    {
      si: { communicationParcImmeuble: true },
      alors: { valeur: "sas de 3 m² minimum, deux portes PF 1/2 h",
        mention: "Portes équipées d'un ferme-porte et s'ouvrant toutes les deux vers l'intérieur du sas. Un sas peut "
          + "comporter trois portes — la première sur le parc ou le volume des caves, la deuxième sur le palier de "
          + "l'ascenseur, la troisième sur l'escalier ou une circulation donnant directement sur l'extérieur, les "
          + "portes d'accès aux issues étant identifiées. **Un même sas ne dessert jamais à la fois le parc et le "
          + "volume des caves**, et il ne débouche pas dans la cage d'escalier commune aux logements des niveaux "
          + "inférieurs (ministère de l'Équipement, 1er juillet 1988). Tout autre dispositif de mêmes caractéristiques "
          + "coupe-feu, agréé par les ministres, peut également être utilisé." },
      source: reglement("82", "1°), deuxième alinéa", "Les communications éventuellement aménagées dans ces murs ou parois doivent être réalisées par un sas d'une surface de 3 m² minimum et muni de deux portes, chacune pare-flammes de degré 1/2 heure et équipées d'un ferme-porte, s'ouvrant toutes les deux vers l'intérieur du sas.")
    }
  ]
};

export const facadesParc = {
  id: "facades-parc",
  titre: "Façades d'un parc en superstructure",
  repond: "Quelle règle de façade pour un parc en superstructure ?",
  produit: "facadesParc",
  source: { article: "83" },
  regles: [
    {
      si: { parcDansLeChamp: { differentDe: "dans le champ" } },
      alors: { valeur: "sans objet", sansObjet: "Le titre VI ne s'applique pas à ce parc." },
      source: reglement("83", null, "Dans le cas où le parc comporte plus d'un niveau en superstructure, les dispositions de l'article 14 s'appliquent aux façades du parc, les valeurs C et D répondant aux définitions de l'article 14 sont liées par la relation ci-après quelle que soit la masse combustible des façades : C + D ≥ 1 m.")
    },
    {
      si: { niveauxParcAuDessus: { auMoins: 2 } },
      alors: { valeur: "C + D ≥ 1 m",
        mention: "Les dispositions de l'article 14 s'appliquent aux façades du parc, la relation valant quelle que soit "
          + "la masse combustible des façades." },
      source: reglement("83", null, "…les valeurs C et D répondant aux définitions de l'article 14 sont liées par la relation ci-après quelle que soit la masse combustible des façades : C + D ≥ 1 m.")
    },
    {
      si: { niveauxParcAuDessus: { auPlus: 1 } },
      alors: { valeur: "sans objet",
        sansObjet: "L'article 83 ne vise que les parcs comportant plus d'un niveau en superstructure." },
      source: reglement("83", null, "Dans le cas où le parc comporte plus d'un niveau en superstructure, les dispositions de l'article 14 s'appliquent aux façades du parc…")
    }
  ]
};

export const recoupementParc = {
  id: "recoupement-parc",
  titre: "Recoupement des niveaux du parc",
  repond: "Le niveau doit-il être recoupé en compartiments ?",
  produit: "recoupementParc",
  source: { article: "84", paragraphe: "1°)" },
  regles: [
    {
      si: { parcDansLeChamp: { differentDe: "dans le champ" } },
      alors: { valeur: "sans objet", sansObjet: "Le titre VI ne s'applique pas à ce parc." },
      source: reglement("84", "1°)", "La superficie de chaque niveau doit être recoupée en compartiments inférieurs à 3 000 m² au-dessous du niveau de référence. Les murs de recoupement doivent être coupe-feu de degré 1 heure.")
    },
    {
      si: { niveauxParcAuDessous: { auPlus: 0 } },
      alors: { valeur: "sans objet",
        sansObjet: "Le recoupement n'est exigé qu'au-dessous du niveau de référence." },
      source: reglement("84", "1°)", "La superficie de chaque niveau doit être recoupée en compartiments inférieurs à 3 000 m² au-dessous du niveau de référence.")
    },
    {
      si: { superficieCompartimentParc: { moinsDe: 3000 } },
      alors: { valeur: "compartiments conformes — moins de 3 000 m²", mention: MENTION_ART84() },
      source: reglement("84", "1°)", "La superficie de chaque niveau doit être recoupée en compartiments inférieurs à 3 000 m² au-dessous du niveau de référence.")
    },
    {
      si: { superficieCompartimentParc: { auMoins: 3000 } },
      alors: { valeur: "recoupement exigé — compartiments de moins de 3 000 m²", mention: MENTION_ART84() },
      source: reglement("84", "1°)", "La superficie de chaque niveau doit être recoupée en compartiments inférieurs à 3 000 m² au-dessous du niveau de référence. Les murs de recoupement doivent être coupe-feu de degré 1 heure.")
    }
  ]
};

function MENTION_ART84() {
  return "Murs de recoupement coupe-feu de degré 1 heure. Les ouvertures y sont munies de dispositifs d'obturation "
    + "pare-flammes de degré 1/2 heure à fermeture automatique commandée par un détecteur autonome déclencheur "
    + "conforme à la norme NF S 61-961, doublé d'une commande manuelle, avec un détecteur de chaque côté du "
    + "dispositif. Aucun dispositif d'obturation n'est imposé pour les rampes d'accès, ni pour les parcs où la "
    + "rampe sert également au stationnement.";
}

export const boxesDansLeParc = {
  id: "boxes-dans-le-parc",
  titre: "Boxes établis dans le parc",
  repond: "Que faut-il des boxes établis dans le parc ?",
  produit: "boxesDansLeParcVerdict",
  source: { article: "84", paragraphe: "2°)" },
  regles: [
    // La question des boxes ne se pose qu'une fois le parc reconnu : demander
    // « des boxes sont-ils établis dans le parc ? » à quelqu'un qui n'a pas de
    // parc, c'est lui faire douter de ce qu'on lui demande.
    {
      si: { parcDansLeChamp: { differentDe: "dans le champ" } },
      alors: { valeur: "sans objet", sansObjet: "Le titre VI ne s'applique pas à ce parc." },
      source: reglement("84", "2°)", "Dans le cas où des boxes sont établis dans le parc, ils ne doivent pas comporter chacun plus de deux emplacements pour le stationnement.")
    },
    {
      si: { boxesDansLeParc: false },
      alors: { valeur: "sans objet", sansObjet: "Aucun box n'est établi dans le parc." },
      source: reglement("84", "2°)", "Dans le cas où des boxes sont établis dans le parc, ils ne doivent pas comporter chacun plus de deux emplacements pour le stationnement.")
    },
    {
      si: { boxesDansLeParc: true, emplacementsParBox: { auPlus: 2 } },
      alors: { valeur: "conformes — deux emplacements au plus", mention: MENTION_ART84_2() },
      source: reglement("84", "2°)", "…ils ne doivent pas comporter chacun plus de deux emplacements pour le stationnement. Le cloisonnement doit être réalisé par des parois pleines maçonnées.")
    },
    {
      si: { boxesDansLeParc: true },
      alors: { valeur: "non conformes — deux emplacements au plus par box", mention: MENTION_ART84_2() },
      source: reglement("84", "2°)", "Dans le cas où des boxes sont établis dans le parc, ils ne doivent pas comporter chacun plus de deux emplacements pour le stationnement.")
    }
  ]
};

function MENTION_ART84_2() {
  return "Cloisonnement par parois pleines maçonnées ; l'établissement de ces boxes ne doit pas perturber la "
    + "ventilation du parc. Il n'est pas admis de prévoir des caves ou des espaces de rangement fermés en fond de "
    + "box : une telle solution modifierait sensiblement les risques (ministère chargé du logement, 23 novembre 2007).";
}

export const couvertureParc = {
  id: "couverture-parc",
  titre: "Couverture du parc",
  repond: "Que faut-il de la couverture du parc ?",
  produit: "couvertureParc",
  source: { article: "85" },
  regles: [
    {
      si: { parcDansLeChamp: { differentDe: "dans le champ" } },
      alors: { valeur: "sans objet", sansObjet: "Le titre VI ne s'applique pas à ce parc." },
      source: reglement("85", null, "Lorsque la couverture du parc est dominée par les façades vitrées ou ouvertes d'immeubles habités ou occupés, elle doit être pare-flammes de degré 1 heure sur une distance de 8 m, mesurée en projection horizontale, de l'ouverture la plus proche.")
    },
    {
      si: { couvertureParcDomineeParFacadesVitrees: true },
      alors: { valeur: "PF 1 h sur 8 m depuis l'ouverture la plus proche",
        mention: "Distance mesurée en projection horizontale. La règle ne concerne pas les rampes à l'aplomb des baies : "
          + "rien n'y étant stocké, le risque de transmission est quasi nul (ministère de l'Équipement, 23 décembre 1986). "
          + "Lorsque le débordement de la couverture est inférieur à 8 m, il convient de chercher une ventilation "
          + "naturelle par ouvrant au droit de la façade plutôt que par exutoire (point de vue SOCOTEC)." },
      source: reglement("85", null, "Lorsque la couverture du parc est dominée par les façades vitrées ou ouvertes d'immeubles habités ou occupés, elle doit être pare-flammes de degré 1 heure sur une distance de 8 m, mesurée en projection horizontale, de l'ouverture la plus proche.")
    },
    {
      si: { couvertureParcDomineeParFacadesVitrees: false },
      alors: { valeur: "aucune exigence par cet article",
        sansObjet: "La couverture n'est pas dominée par des façades vitrées ou ouvertes d'immeubles habités ou occupés." },
      source: reglement("85", null, "Lorsque la couverture du parc est dominée par les façades vitrées ou ouvertes d'immeubles habités ou occupés…")
    }
  ]
};

export const revetementCouvertureParc = {
  id: "revetement-couverture-parc",
  titre: "Revêtement de couverture du parc",
  repond: "Le revêtement de couverture retenu est-il admis ?",
  produit: "revetementCouvertureParc",
  source: { article: "86" },
  regles: [
    {
      si: { parcDansLeChamp: { differentDe: "dans le champ" } },
      alors: { valeur: "sans objet", sansObjet: "Le titre VI ne s'applique pas à ce parc." },
      source: reglement("86", "a", "Les revêtements de couvertures classés en catégorie M0 peuvent être utilisés sans restriction.")
    },
    {
      si: { revetementCouvertureParcClasse: "M0" },
      alors: { valeur: "admis sans restriction" },
      source: reglement("86", "a", "Les revêtements de couvertures classés en catégorie M0 peuvent être utilisés sans restriction.")
    },
    {
      si: { revetementCouvertureParcClasse: "M3", supportCouvertureParcContinu: true },
      alors: { valeur: "admis sans restriction",
        mention: "Support continu en matériau incombustible, en panneaux de bois ou d'agglomérés de fibres de bois." },
      source: reglement("86", "a", "Les revêtements de couvertures classés en catégorie M3 peuvent être utilisés sans restriction s'ils sont établis sur un support continu en matériau incombustible ou en panneaux de bois, ou d'agglomérés de fibres de bois.")
    },
    {
      si: { distanceCouvertureParcAuBatimentVoisin: { plusDe: 8 } },
      alors: { valeur: "admis — plus de 8 m du bâtiment voisin",
        mention: "Un revêtement M3 sur un support quelconque suit la règle des M4 : il doit se situer à plus de 8 m du bâtiment voisin." },
      source: reglement("86", "b", "Les couvertures à revêtements classés M4 doivent se situer à plus de 8 m du bâtiment voisin.")
    },
    {
      si: { distanceCouvertureParcAuBatimentVoisin: { auPlus: 8 } },
      alors: { valeur: "non admis — 8 m au plus du bâtiment voisin",
        mention: "Les couvertures à revêtements M4 — et les M3 sur un support ne répondant pas à la définition de l'alinéa précédent — doivent se situer à plus de 8 m du bâtiment voisin." },
      source: reglement("86", "b", "Les couvertures à revêtements classés M4 doivent se situer à plus de 8 m du bâtiment voisin.")
    }
  ]
};

/* ================================================================== *
 * CHAPITRE IV — COMMUNICATIONS INTÉRIEURES ET ISSUES (article 87)
 * ================================================================== */

export const distanceIssuesParc = {
  id: "distance-issues-parc",
  titre: "Distance à parcourir vers une issue",
  repond: "Quelle distance maximale jusqu'à une issue ou un escalier ?",
  produit: "distanceIssuesParc",
  source: { article: "87", paragraphe: "premier alinéa" },
  regles: [
    {
      si: { parcDansLeChamp: { differentDe: "dans le champ" } },
      alors: { valeur: "sans objet", sansObjet: "Le titre VI ne s'applique pas à ce parc." },
      source: reglement("87", "premier alinéa", "A chaque niveau le ou les escaliers doivent être disposés de façon que les usagers n'aient pas à parcourir : plus de 40 m pour atteindre une issue ou un escalier s'ils ont le choix entre plusieurs ;")
    },
    {
      si: { plusieursIssuesAuChoix: true, distanceAParcourirVersIssueParc: { auPlus: 40 } },
      alors: { valeur: "admissible — 40 m au plus" },
      source: reglement("87", "premier tiret", "plus de 40 m pour atteindre une issue ou un escalier s'ils ont le choix entre plusieurs ;")
    },
    {
      si: { plusieursIssuesAuChoix: true },
      alors: { valeur: "dépassée — 40 m au plus admis" },
      source: reglement("87", "premier tiret", "plus de 40 m pour atteindre une issue ou un escalier s'ils ont le choix entre plusieurs ;")
    },
    {
      si: { plusieursIssuesAuChoix: false, distanceAParcourirVersIssueParc: { auPlus: 25 } },
      alors: { valeur: "admissible — 25 m au plus",
        mention: "Un seul escalier, ou une partie du parc formant cul-de-sac." },
      source: reglement("87", "second tiret", "(Arrêté du 18 août 1986) plus de 25 m pour atteindre l'escalier s'il n'y en a qu'un ou s'ils se trouvent dans une partie de l'établissement formant cul-de-sac.")
    },
    {
      si: { plusieursIssuesAuChoix: false },
      alors: { valeur: "dépassée — 25 m au plus admis",
        mention: "Un seul escalier, ou une partie du parc formant cul-de-sac : le seuil tombe de 40 m à 25 m." },
      source: reglement("87", "second tiret", "plus de 25 m pour atteindre l'escalier s'il n'y en a qu'un ou s'ils se trouvent dans une partie de l'établissement formant cul-de-sac.")
    }
  ]
};

export const escaliersParc = {
  id: "escaliers-parc",
  titre: "Escaliers du parc",
  repond: "Quelles caractéristiques pour les escaliers du parc ?",
  produit: "escaliersParc",
  source: { article: "87" },
  regles: [
    {
      si: { parcDansLeChamp: { differentDe: "dans le champ" } },
      alors: { valeur: "sans objet", sansObjet: "Le titre VI ne s'applique pas à ce parc." },
      source: reglement("87", "sixième alinéa", "Les escaliers doivent être réalisés en matériaux incombustibles et doivent comporter des cloisons les séparant du reste du parc : coupe-feu de degré 1 heure dans le cas général ; coupe-feu de degré 1/2 heure si le parc ne comporte qu'un niveau sur rez-de-chaussée.")
    },
    {
      si: { niveauxParcAuDessous: { auPlus: 0 }, niveauxParcAuDessus: { auPlus: 1 } },
      alors: { valeur: "incombustibles — cloisons CF 1/2 h", mention: MENTION_ART87() },
      source: reglement("87", "sixième alinéa, second tiret", "coupe-feu de degré 1/2 heure si le parc ne comporte qu'un niveau sur rez-de-chaussée.")
    },
    {
      si: { parcDansLeChamp: "dans le champ" },
      alors: { valeur: "incombustibles — cloisons CF 1 h", mention: MENTION_ART87() },
      source: reglement("87", "sixième alinéa, premier tiret", "coupe-feu de degré 1 heure dans le cas général ;")
    }
  ]
};

function MENTION_ART87() {
  return "Largeur minimale 0,80 m ; volées droites si le parc comporte plus de quatre niveaux par rapport au niveau "
    + "de référence. Les escaliers desservant les niveaux situés au-dessous du niveau de référence ne doivent pas "
    + "aboutir dans ceux desservant les niveaux situés au-dessus. Si, au niveau de sortie, ils aboutissent dans une "
    + "allée piétonne commune, celle-ci fait 0,60 m par escalier avec un minimum de 0,80 m, comporte au moins deux "
    + "issues éloignées l'une de l'autre sans cul-de-sac, et est séparée du reste du parc par des cloisons "
    + "coupe-feu de degré 1 heure. Dans un parc à un seul niveau au-dessous du niveau de référence, un trottoir "
    + "d'au moins 0,80 m le long de la rampe peut remplacer un escalier.";
}

export const protectionEscaliersParc = {
  id: "protection-escaliers-parc",
  titre: "Protection des escaliers du parc à chaque niveau",
  repond: "Comment les escaliers du parc sont-ils protégés à chaque niveau ?",
  produit: "protectionEscaliersParc",
  source: { article: "87", paragraphe: "septième alinéa" },
  regles: [
    {
      si: { parcDansLeChamp: { differentDe: "dans le champ" } },
      alors: { valeur: "sans objet", sansObjet: "Le titre VI ne s'applique pas à ce parc." },
      source: reglement("87", "septième alinéa", "Lorsqu'ils aboutissent dans les circulations de l'immeuble d'habitation, les escaliers doivent être protégés à chaque niveau par des sas réalisés dans les conditions définies à l'article 82 ci-avant.")
    },
    {
      si: { escaliersParcAboutissentDansImmeuble: true },
      alors: { valeur: "sas à chaque niveau, dans les conditions de l'article 82", mention: MENTION_ART87_7() },
      source: reglement("87", "septième alinéa", "Lorsqu'ils aboutissent dans les circulations de l'immeuble d'habitation, les escaliers doivent être protégés à chaque niveau par des sas réalisés dans les conditions définies à l'article 82 ci-avant.")
    },
    {
      si: { escaliersParcAboutissentDansImmeuble: false },
      alors: { valeur: "portes PF 1/2 h à chaque niveau", mention: MENTION_ART87_7() },
      source: reglement("87", "huitième alinéa", "Dans les autres cas, ils doivent être protégés à chaque niveau par des portes pare-flammes de degré 1/2 heure, équipées d'un ferme-porte et s'ouvrant dans le sens de la sortie en venant du parc.")
    }
  ]
};

function MENTION_ART87_7() {
  return "Ces dispositions ne s'appliquent pas aux portes donnant sur l'extérieur, qui doivent comporter une "
    + "ouverture de 30 dm² en partie haute. Les issues réservées aux véhicules sont munies de portes condamnables. "
    + "Les portes à l'usage des piétons mettant le parc en communication avec l'extérieur ou les circulations "
    + "communes comportent une fermeture à clé, mais doivent être ouvrables sans clé depuis l'intérieur du parc.";
}

/* ================================================================== *
 * CHAPITRE V — AMÉNAGEMENTS ET ÉQUIPEMENTS (articles 88 à 96)
 * ================================================================== */

export const conduitsParc = {
  id: "conduits-parc",
  titre: "Conduits et gaines du parc",
  repond: "Quels degrés pour les conduits traversant le parc ?",
  produit: "conduitsParc",
  source: { article: "88" },
  regles: [
    {
      si: { parcDansLeChamp: { differentDe: "dans le champ" } },
      alors: { valeur: "sans objet", sansObjet: "Le titre VI ne s'applique pas à ce parc." },
      source: reglement("88", null, "Les conduits et gaines doivent être disposés de telle sorte qu'ils soient protégés des chocs éventuels de la part des véhicules.")
    },
    {
      si: { parcDansLeChamp: "dans le champ" },
      alors: { valeur: "ventilation CF 1/2 h dans la traversée, CF 2 h ailleurs",
        mention: "Les conduits de ventilation du parc et leur enveloppe, quel que soit leur mode de fixation, sont "
          + "incombustibles et coupe-feu de degré 1/2 heure dans la traversée du parc — trappes et portes de visite "
          + "comprises, sauf dans le niveau desservi — et coupe-feu de degré 2 heures s'ils traversent d'autres "
          + "locaux ; chacun ne dessert qu'un seul niveau ou un seul compartiment. Les conduits de liquides "
          + "inflammables sont placés dans une gaine coupe-feu 2 heures incombustible, le vide comblé par des "
          + "matériaux inertes pulvérulents. Les autres conduits mettant le parc en communication avec des locaux "
          + "voisins assurent un coupe-feu de traversée de 120 minutes au moins, sauf les conduits constamment en "
          + "charge d'eau et ceux de diamètre inférieur ou égal à 125 mm au droit des traversées. Les conduits de "
          + "vapeur à plus de 0,5 bar ou d'eau surchauffée à plus de 110 °C sont interdits, sauf en gaine "
          + "incombustible coupe-feu 2 heures ouverte sur l'extérieur. Les conduits de gaz combustible relèvent de "
          + "l'article 56, 2°." },
      source: reglement("88", "quatrième alinéa", "Les conduits de ventilation du parc et leur enveloppe éventuelle, quel que soit leur mode de fixation, doivent dans la traversée du parc être réalisés en matériaux incombustibles et être coupe-feu de degré 1/2 heure […] ainsi que leurs trappes et portes de visites, sauf dans le niveau desservi, et coupe-feu de degré 2 heures s'ils traversent d'autres locaux.")
    }
  ]
};

/**
 * La ventilation du parc, qui est aussi son désenfumage.
 *
 * « En cas d'incendie, le désenfumage du parc est assuré par les systèmes de
 * ventilation visés au présent article » : il n'y a pas deux installations, il
 * y en a une. Et la mécanique s'impose sous le niveau de référence dès qu'il y
 * a plusieurs niveaux — sauf larges ouvertures à l'air libre sur deux faces
 * opposées à chaque niveau, ce qui est le cas particulier qu'on oublie.
 */
export const ventilationParc = {
  id: "ventilation-parc",
  titre: "Ventilation et désenfumage du parc",
  repond: "Quelle ventilation le parc doit-il avoir ?",
  produit: "ventilationParc",
  source: { article: "89" },
  regles: [
    {
      si: { parcDansLeChamp: { differentDe: "dans le champ" } },
      alors: { valeur: "sans objet", sansObjet: "Le titre VI ne s'applique pas à ce parc." },
      source: reglement("89", null, "En cas d'incendie, le désenfumage du parc est assuré par les systèmes de ventilation visés au présent article. La ventilation du parc peut être naturelle ou mécanique.")
    },
    {
      si: { niveauxParcAuDessous: { auMoins: 2 }, largesOuverturesDeuxFacesOpposees: false, ventilationParcRetenue: "naturelle" },
      alors: { valeur: "non conforme — ventilation mécanique exigée",
        mention: "Lorsque le parc comporte plusieurs niveaux, la ventilation doit être mécanique dans les niveaux situés "
          + "au-dessous du niveau de référence, sauf s'il comporte à chaque niveau de larges ouvertures à l'air libre "
          + "sur deux faces opposées." },
      source: reglement("89", "quatrième alinéa", "Lorsque le parc comporte plusieurs niveaux, la ventilation doit être réalisée mécaniquement dans les niveaux situés au-dessous du niveau de référence à l'exception des cas particuliers où le parc comporte à chaque niveau de larges ouvertures à l'air libre sur deux faces opposées.")
    },
    {
      si: { ventilationParcRetenue: "naturelle" },
      alors: { valeur: "ouvertures haute et basse de 6 dm² par véhicule",
        mention: "Chacune. Le désenfumage du parc est assuré par ce même système : il n'y a pas deux installations." },
      source: reglement("89", "cinquième alinéa", "En cas de ventilation naturelle, les ouvertures de ventilation haute et basse doivent avoir chacune une section minimale de 6 dm² par véhicule.")
    },
    {
      si: { ventilationParcRetenue: "mecanique" },
      alors: { valeur: "renouvellement de 600 m³/h par voiture", mention: MENTION_ART89() },
      source: reglement("89", "sixième alinéa", "En cas de ventilation mécanique, l'exigence est réputée satisfaite si la ventilation ci-avant permet un renouvellement d'air de 600 m3/h et par voiture. Ce système peut ne fonctionner que lorsque le parc est utilisé.")
    }
  ]
};

function MENTION_ART89() {
  return "Le système peut ne fonctionner que lorsque le parc est utilisé. Des commandes manuelles prioritaires "
    + "sélectives par niveau, permettant l'arrêt et la remise en marche des ventilateurs, sont installées à "
    + "proximité des accès utilisables par les services de secours, leurs emplacements signalés de façon à être "
    + "repérables de jour comme de nuit. Les ventilateurs assurent leur fonction avec des fumées à 200 °C pendant "
    + "1 heure, et leur alimentation électrique vient d'une dérivation issue directement du tableau principal et "
    + "sélectivement protégée.";
}

export const solsParc = {
  id: "sols-parc",
  titre: "Sols du parc",
  repond: "Que faut-il des sols du parc ?",
  produit: "solsParc",
  source: { article: "90" },
  regles: [
    {
      si: { parcDansLeChamp: "dans le champ" },
      alors: { valeur: "pente vers une fosse de rétention, rampe surélevée de 3 cm",
        mention: "Les sols présentent une pente suffisante pour que les liquides accidentellement répandus s'écoulent "
          + "vers une fosse munie d'un dispositif de séparation, ou vers tout autre système capable de retenir la "
          + "totalité des liquides inflammables. Le sol de la rampe est surélevé de 3 cm par rapport au sol du niveau, "
          + "pour éviter l'écoulement vers les niveaux inférieurs. Les allées de circulation sont antidérapantes. "
          + "Par dérogation à l'article 80, les revêtements de sol peuvent être classés M3." },
      source: reglement("90", null, "Les sols doivent présenter une pente suffisante pour que les eaux et tout liquide, accidentellement répandus, s'écoulent facilement en direction d'une fosse munie d'un dispositif de séparation ou vers tout autre système capable de retenir la totalité des liquides inflammables.")
    },
    {
      si: { parcDeStationnement: { renseigne: true } },
      alors: { valeur: "sans objet", sansObjet: "Le titre VI ne s'applique pas à ce parc." },
      source: reglement("90", null, "Les sols doivent présenter une pente suffisante…")
    }
  ]
};

export const circulationsParc = {
  id: "circulations-parc",
  titre: "Circulations et signalisation du parc",
  repond: "Que faut-il des circulations et de la signalisation ?",
  produit: "circulationsParc",
  source: { article: "91" },
  regles: [
    {
      si: { parcDansLeChamp: "dans le champ" },
      alors: { valeur: "2 m de hauteur libre, accès aux issues dégagés sur 0,90 m",
        mention: "Les rampes et allées de circulation des véhicules sont libres de tout obstacle sur toute leur largeur "
          + "et sur 2 m de hauteur, sauf cas ponctuels en nombre limité et efficacement signalés ; il en va de même de "
          + "toutes les parties susceptibles d'être parcourues par des piétons. Des inscriptions ou signalisations "
          + "visibles en toutes circonstances facilitent la circulation et le repérage des issues, et les portes qui "
          + "ne donnent accès ni à une voie de circulation, ni à un escalier, ni à une issue portent de manière très "
          + "apparente la mention « Sans issue »." },
      source: reglement("92", null, "Aucun obstacle ne doit se trouver à moins de 2 m du sol dans toutes les parties du parc susceptibles d'être parcourues par des piétons sauf pour des cas ponctuels, en nombre limité et efficacement signalés. Les accès aux issues telles que les escaliers et les ascenseurs doivent être maintenus dégagés sur une largeur minimale de 0,90 m.")
    },
    {
      si: { parcDeStationnement: { renseigne: true } },
      alors: { valeur: "sans objet", sansObjet: "Le titre VI ne s'applique pas à ce parc." },
      source: reglement("91", null, "Les rampes et allées de circulation des véhicules doivent être libres de tout obstacle sur toute leur largeur et sur une hauteur minimale de 2 m…")
    }
  ]
};

export const eclairageSecuriteParc = {
  id: "eclairage-securite-parc",
  titre: "Éclairage de sécurité du parc",
  repond: "Quel éclairage de sécurité le parc doit-il comporter ?",
  produit: "eclairageSecuriteParc",
  source: { article: "94" },
  regles: [
    {
      si: { parcDansLeChamp: "dans le champ" },
      alors: { valeur: "couples de foyers lumineux, 0,5 W/m² et 5 lm/m², 1 heure",
        mention: "Un foyer en partie haute, l'autre en partie basse — l'éclairage de sécurité **doit** être réalisé par "
          + "couples, y compris à proximité des issues : c'est une garantie de visibilité en cas d'enfumage (ministère "
          + "chargé du logement, 23 novembre 2007). Les foyers sont placés le long des allées piétonnes et près des "
          + "issues, ceux du bas à 0,50 m du sol au plus. Les sources sont autonomes — blocs autonomes de l'arrêté du "
          + "2 octobre 1978, ou groupe électrogène. L'éclairage doit permettre la visibilité des signalisations de "
          + "l'article 92." },
      source: reglement("94", "troisième alinéa", "Pour ce faire, l'éclairage de sécurité doit être constitué par des couples de foyers lumineux, l'un en partie haute, l'autre en partie basse, assurant un éclairage d'une puissance d'au moins 0,5 W/m² de surface du local et un flux lumineux émis d'au moins 5 lm/m².")
    },
    {
      si: { parcDeStationnement: { renseigne: true } },
      alors: { valeur: "sans objet", sansObjet: "Le titre VI ne s'applique pas à ce parc." },
      source: reglement("94", null, "De plus, le parc de stationnement doit comporter un éclairage de sécurité permettant d'assurer un minimum d'éclairement pour repérer les issues en toutes circonstances…")
    }
  ]
};

/**
 * La détection automatique.
 *
 * Le compte des niveaux se fait ici **sans** le niveau de référence : le
 * ministère l'a précisé en 1987, en refusant expressément de donner une règle
 * générale — à l'article 96, 1°, deuxième tiret, le même mot inclut au
 * contraire le niveau de référence. Deux articles voisins, deux comptes.
 */
export const detectionParc = {
  id: "detection-parc",
  titre: "Détection automatique d'incendie",
  repond: "Un système de détection automatique est-il exigé, et à partir de quel niveau ?",
  produit: "detectionParc",
  source: { article: "95", paragraphe: "1°)" },
  regles: [
    {
      si: { parcDansLeChamp: { differentDe: "dans le champ" } },
      alors: { valeur: "sans objet", sansObjet: "Le titre VI ne s'applique pas à ce parc." },
      source: reglement("95", "1°)", "Un système de détection automatique d'incendie installé : à partir du troisième niveau si le parc comporte quatre ou cinq niveaux au-dessous du niveau de référence et s'il n'est pas équipé d'un système d'extinction automatique ;")
    },
    {
      si: { niveauxParcAuDessous: { auMoins: 6 } },
      alors: { valeur: "exigée à tous les niveaux", mention: MENTION_ART95() },
      source: reglement("95", "1°), second tiret", "à tous les niveaux si le parc comporte au moins six niveaux au-dessous du niveau de référence.")
    },
    {
      si: { niveauxParcAuDessous: { auMoins: 4 }, extinctionAutomatiqueInstallee: false },
      alors: { valeur: "exigée à partir du 3ᵉ niveau", mention: MENTION_ART95() },
      source: reglement("95", "1°), premier tiret", "à partir du troisième niveau si le parc comporte quatre ou cinq niveaux au-dessous du niveau de référence et s'il n'est pas équipé d'un système d'extinction automatique ;")
    },
    {
      si: { niveauxParcAuDessous: { auMoins: 4 } },
      alors: { valeur: "non exigée — extinction automatique installée",
        mention: "L'exigence du premier tiret est levée par la présence d'un système d'extinction automatique. " + MENTION_ART95() },
      source: reglement("95", "1°), premier tiret", "…et s'il n'est pas équipé d'un système d'extinction automatique ;")
    },
    {
      si: { parcDansLeChamp: "dans le champ" },
      alors: { valeur: "non exigée",
        sansObjet: "L'article 95, 1°), ne vise que les parcs comportant au moins quatre niveaux au-dessous du niveau de référence." },
      source: reglement("95", "1°)", "Un système de détection automatique d'incendie installé : à partir du troisième niveau si le parc comporte quatre ou cinq niveaux au-dessous du niveau de référence…")
    }
  ]
};

function MENTION_ART95() {
  return "Ici, « niveau » ne compte pas le niveau de référence — le ministère l'a précisé en 1987 en refusant "
    + "expressément de donner une règle générale : à l'article 96, 1°, deuxième tiret, le même mot l'inclut au "
    + "contraire. Le système est raccordé soit à un poste de gardiennage propre au parc, soit au local du gardien "
    + "ou du concierge de l'immeuble, soit, à défaut, à un appareil de signalisation dans le hall. Une liaison "
    + "téléphonique permet d'appeler le service de secours le plus proche depuis ce local.";
}

export const alarmeUsagersParc = {
  id: "alarme-usagers-parc",
  titre: "Alarme aux usagers du parc",
  repond: "Un système d'alarme aux usagers est-il exigé ?",
  produit: "alarmeUsagersParc",
  source: { article: "95", paragraphe: "3°)" },
  regles: [
    {
      si: { parcDansLeChamp: { differentDe: "dans le champ" } },
      alors: { valeur: "sans objet", sansObjet: "Le titre VI ne s'applique pas à ce parc." },
      source: reglement("95", "3°)", "Un système permettant de donner l'alarme aux usagers du parc si ce dernier comporte plus de quatre niveaux au-dessus du niveau de référence ou plus de deux niveaux au-dessous.")
    },
    {
      si: { niveauxParcAuDessus: { auMoins: 5 } },
      alors: { valeur: "exigé" },
      source: reglement("95", "3°)", "Un système permettant de donner l'alarme aux usagers du parc si ce dernier comporte plus de quatre niveaux au-dessus du niveau de référence ou plus de deux niveaux au-dessous.")
    },
    {
      si: { niveauxParcAuDessous: { auMoins: 3 } },
      alors: { valeur: "exigé" },
      source: reglement("95", "3°)", "…si ce dernier comporte plus de quatre niveaux au-dessus du niveau de référence ou plus de deux niveaux au-dessous.")
    },
    {
      si: { parcDansLeChamp: "dans le champ" },
      alors: { valeur: "non exigé",
        sansObjet: "Le parc ne dépasse ni quatre niveaux au-dessus, ni deux niveaux au-dessous du niveau de référence." },
      source: reglement("95", "3°)", "Un système permettant de donner l'alarme aux usagers du parc si ce dernier comporte plus de quatre niveaux au-dessus du niveau de référence ou plus de deux niveaux au-dessous.")
    }
  ]
};

export const moyensDeLutteParc = {
  id: "moyens-de-lutte-parc",
  titre: "Moyens de lutte contre l'incendie",
  repond: "Quels moyens de lutte contre l'incendie pour tous les parcs ?",
  produit: "moyensDeLutteParc",
  source: { article: "96", paragraphe: "1°)" },
  regles: [
    {
      si: { parcDansLeChamp: "dans le champ" },
      alors: { valeur: "1 extincteur pour 15 véhicules, 1 caisse de sable par niveau",
        mention: "Extincteurs portatifs, alternativement de type 13 A ou 21 B, ou polyvalents 13 A 21 B. Une caisse de "
          + "100 litres de sable meuble munie d'un seau à fond rond, placée près de la rampe de circulation, à chaque "
          + "niveau — et ici « niveau » **inclut** le niveau de référence (ministère de l'Équipement, 14 avril 1987)." },
      source: reglement("96", "1°)", "des extincteurs portatifs répartis à raison de 1 appareil pour 15 véhicules. Ces extincteurs doivent être soit alternativement des types 13 A ou 21 B, soit polyvalents du type 13 A 21 B […] ; à chaque niveau une caisse de 100 litres de sable meuble munie d'un seau à fond rond et placée près de la rampe de circulation.")
    },
    {
      si: { parcDeStationnement: { renseigne: true } },
      alors: { valeur: "sans objet", sansObjet: "Le titre VI ne s'applique pas à ce parc." },
      source: reglement("96", "1°)", "Des moyens de lutte contre l'incendie doivent être prévus et comprendre : […]")
    }
  ]
};

export const colonneSecheParc = {
  id: "colonne-seche-parc",
  titre: "Colonnes sèches du parc",
  repond: "Des colonnes sèches sont-elles exigées dans le parc ?",
  produit: "colonneSecheParc",
  source: { article: "96", paragraphe: "2°)" },
  regles: [
    {
      si: { parcDansLeChamp: { differentDe: "dans le champ" } },
      alors: { valeur: "sans objet", sansObjet: "Le titre VI ne s'applique pas à ce parc." },
      source: reglement("96", "2°)", "Pour les parcs comportant plus de quatre niveaux au-dessus du niveau de référence ou plus de trois niveaux au-dessous […] : des colonnes sèches de 65 mm disposées dans les cages d'escalier ou dans les sas…")
    },
    {
      si: { niveauxParcAuDessus: { auMoins: 5 } },
      alors: { valeur: "exigées — colonnes sèches de 65 mm", mention: MENTION_ART96_2() },
      source: reglement("96", "2°)", "(Arrêté du 18 août 1986) Pour les parcs comportant plus de quatre niveaux au-dessus du niveau de référence ou plus de trois niveaux au-dessous […] des colonnes sèches de 65 mm disposées dans les cages d'escalier ou dans les sas.")
    },
    {
      si: { niveauxParcAuDessous: { auMoins: 4 } },
      alors: { valeur: "exigées — colonnes sèches de 65 mm", mention: MENTION_ART96_2() },
      source: reglement("96", "2°)", "…ou plus de trois niveaux au-dessous […] : des colonnes sèches de 65 mm disposées dans les cages d'escalier ou dans les sas.")
    },
    {
      si: { parcDansLeChamp: "dans le champ" },
      alors: { valeur: "non exigées",
        sansObjet: "Le parc ne dépasse ni quatre niveaux au-dessus, ni trois niveaux au-dessous du niveau de référence." },
      source: reglement("96", "2°)", "Pour les parcs comportant plus de quatre niveaux au-dessus du niveau de référence ou plus de trois niveaux au-dessous…")
    }
  ]
};

function MENTION_ART96_2() {
  return "Disposées dans les cages d'escalier ou dans les sas, avec à chaque niveau une prise de 65 mm et deux "
    + "prises de 40 mm, installées conformément à la norme NF S 61-750, prises placées à l'intérieur des sas "
    + "lorsqu'il en existe. Le raccord d'alimentation doit être à 100 m au plus d'une prise d'eau normalisée "
    + "accessible par un cheminement praticable, le long d'une voie répondant à l'article 4 — 100 m ici, contre "
    + "60 m à l'article 98 pour les bâtiments d'habitation.";
}

export const extinctionAutomatiqueParc = {
  id: "extinction-automatique-parc",
  titre: "Extinction automatique à eau pulvérisée",
  repond: "Un réseau d'extinction automatique est-il exigé ?",
  produit: "extinctionAutomatiqueParc",
  source: { article: "96", paragraphe: "3°)" },
  regles: [
    {
      si: { parcDansLeChamp: { differentDe: "dans le champ" } },
      alors: { valeur: "sans objet", sansObjet: "Le titre VI ne s'applique pas à ce parc." },
      source: reglement("96", "3°)", "Pour les parcs situés au-dessous du niveau de référence : à partir du 3ème niveau pour les parcs comprenant plus de trois niveaux et qui ne sont pas équipés, à partir du 3ème niveau, d'un système de détection automatique…")
    },
    {
      si: { niveauxParcAuDessous: { auMoins: 6 } },
      alors: { valeur: "exigée à partir du 6ᵉ niveau", mention: MENTION_ART96_3() },
      source: reglement("96", "3°), second tiret", "à partir du 6ème niveau pour les parcs comprenant au moins six niveaux, l'installation, sur toutes les zones du parc affectées au stationnement, d'un réseau d'extinction automatique à eau pulvérisée…")
    },
    {
      si: { niveauxParcAuDessous: { auMoins: 4 }, detectionParc: "non exigée — extinction automatique installée" },
      alors: { valeur: "exigée à partir du 3ᵉ niveau",
        mention: "Le parc n'est pas équipé de détection automatique à partir du troisième niveau. " + MENTION_ART96_3() },
      source: reglement("96", "3°), premier tiret", "à partir du 3ème niveau pour les parcs comprenant plus de trois niveaux et qui ne sont pas équipés, à partir du 3ème niveau, d'un système de détection automatique,")
    },
    {
      si: { niveauxParcAuDessous: { auMoins: 4 } },
      alors: { valeur: "non exigée — détection automatique installée",
        mention: "La détection automatique exigée par l'article 95 à partir du troisième niveau dispense du réseau d'extinction. " + MENTION_ART96_3() },
      source: reglement("96", "3°), premier tiret", "à partir du 3ème niveau pour les parcs comprenant plus de trois niveaux et qui ne sont pas équipés, à partir du 3ème niveau, d'un système de détection automatique,")
    },
    {
      si: { parcDansLeChamp: "dans le champ" },
      alors: { valeur: "non exigée",
        sansObjet: "L'article 96, 3°), ne vise que les parcs de plus de trois niveaux au-dessous du niveau de référence." },
      source: reglement("96", "3°)", "Pour les parcs situés au-dessous du niveau de référence : à partir du 3ème niveau pour les parcs comprenant plus de trois niveaux…")
    }
  ]
};

function MENTION_ART96_3() {
  return "Sur toutes les zones affectées au stationnement, un diffuseur pour 12 m² de plancher au moins, assurant "
    + "pendant 1 heure un débit de 3,5 litres par minute et par mètre carré sur une surface impliquée de 200 m², "
    + "l'alimentation étant assurée par une source unique — conduite de ville ou bac en pression. Toutes "
    + "dispositions doivent être prises pour que le gel ne perturbe pas l'installation. Ces dispositions s'ajoutent "
    + "à celles des 1°) et 2°).";
}

export const MODULES_PARCS = [
  champParc, accesVehiculesLourds, reactionAuFeuParc, stabiliteParc,
  isolementParcContigu, sasCommunicationParc, facadesParc, recoupementParc, boxesDansLeParc,
  couvertureParc, revetementCouvertureParc,
  distanceIssuesParc, escaliersParc, protectionEscaliersParc,
  conduitsParc, ventilationParc, solsParc, circulationsParc,
  eclairageSecuriteParc, detectionParc, alarmeUsagersParc,
  moyensDeLutteParc, colonneSecheParc, extinctionAutomatiqueParc
];
