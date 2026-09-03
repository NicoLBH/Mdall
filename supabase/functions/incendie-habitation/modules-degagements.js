/**
 * Titre III — dégagements : escaliers, circulations horizontales, et les
 * dégagements protégés qui associent les deux.
 *
 * ## Ce qui change par rapport au titre II
 *
 * Le titre II se lit presque entièrement dans la famille. Le titre III, non :
 * il demande **ce qu'on a choisi de construire**. Un escalier peut être à l'air
 * libre ou à l'abri des fumées, une circulation à l'air libre ou protégée, et
 * la quatrième famille offre trois solutions dont « le choix appartient aux
 * constructeurs du bâtiment » (article 40). L'utilitaire ne choisit donc pas :
 * il demande, puis il dit ce que le choix entraîne.
 *
 * C'est aussi ce qui fait apparaître un genre de module qu'on n'avait pas
 * encore : celui qui **confronte** ce que le texte exige à ce qui est prévu.
 * L'article 26 exige un escalier protégé en troisième famille B ; savoir que
 * celui du projet ne l'est pas est plus utile que de rappeler l'exigence.
 *
 * ## Une même cote, trois seuils
 *
 * La distance entre la porte palière la plus éloignée et l'accès à l'escalier
 * vaut 10 m à l'article 3 (troisième famille A), 15 m à l'article 31
 * (circulation à l'abri des fumées) et 25 m à l'article 30 (circulation à l'air
 * libre). Une seule question, trois modules qui la lisent : la poser trois fois
 * ferait trois réponses, et deux d'entre elles finiraient par diverger.
 */

const ARR = "arrêté du 31 janvier 1986 modifié";
const reglement = (article, paragraphe, citation) => ({ nature: "reglement", texte: ARR, article, paragraphe, citation });
/**
 * Ce que l'article veut dire, quand ce n'est pas ce qu'il dit.
 *
 * Certaines règles ne citent pas : elles lisent. La portée d'un chapitre n'est
 * pas écrite dans chacun de ses articles — elle se lit de l'ensemble. Le dire
 * est plus honnête que de fabriquer une citation qui ne résisterait pas à
 * l'ouverture du texte.
 */
const lecture = (article, paragraphe, enonce) => ({ nature: "lecture", texte: ARR, article, paragraphe, citation: enonce });

const questionReponse = (article, origine, citation) => ({ nature: "commentaire", texte: origine, article, paragraphe: "question/réponse", citation });

/* ================================================================== *
 * CHAPITRE PREMIER — ESCALIERS
 * ================================================================== */

/**
 * Ce que le texte exige de l'escalier, avant de regarder ce qui est prévu.
 *
 * L'article 26 ne vise que la troisième famille B ; la quatrième relève des
 * articles 40 à 43, qui exigent des escaliers « protégés » conformes aux
 * articles 27 à 29. Les deux premières familles n'ont pas d'escalier protégé à
 * fournir — ce qui ne veut pas dire qu'elles n'ont aucune exigence : les
 * articles 18, 19, 23, 24 et 25 les visent.
 */
export const typeEscalierExige = {
  id: "type-escalier-exige",
  titre: "Type d'escalier exigé",
  repond: "Quel type d'escalier le texte exige-t-il ?",
  produit: "typeEscalierExige",
  source: { article: "26" },
  regles: [
    {
      si: { famille: "4" },
      alors: { valeur: "escalier protégé",
        mention: "Conforme aux articles 27 à 29. Le nombre d'escaliers et leur disposition dépendent de la solution retenue aux articles 41 à 43." },
      source: reglement("41", "a", "Deux escaliers protégés conformes aux dispositions des articles 27 à 29 ci-avant. Ces escaliers doivent être distants de 10 m au moins ;")
    },
    {
      si: { classement: "3e famille B" },
      alors: { valeur: "escalier protégé",
        mention: "Soit « à l'air libre » (article 28), soit « à l'abri des fumées » (article 29)." },
      source: reglement("26", null, "Dans les habitations de la 3ème famille B, l'escalier doit être un escalier « protégé » soit « à l'air libre », soit « à l'abri des fumées » répondant aux définitions ci-après.")
    },
    {
      si: { classement: "3e famille A" },
      alors: { valeur: "aucun escalier protégé exigé",
        mention: "L'article 26 ne vise que la troisième famille B. Les articles 18 à 25 restent applicables." },
      source: reglement("26", null, "Dans les habitations de la 3ème famille B, l'escalier doit être un escalier « protégé »…")
    },
    {
      si: { famille: ["1", "2"] },
      alors: { valeur: "aucun escalier protégé exigé",
        mention: "Les articles 18, 19, 23, 24 et 25 restent applicables aux habitations collectives." },
      source: reglement("26", null, "Dans les habitations de la 3ème famille B, l'escalier doit être un escalier « protégé »…")
    }
  ]
};

/**
 * Ce qui est prévu, confronté à ce qui est exigé.
 *
 * C'est le premier module du référentiel qui juge un projet au lieu de rappeler
 * une règle. Savoir qu'un escalier encloisonné ne satisfait pas l'article 26 en
 * troisième famille B est plus utile que de savoir que l'article 26 existe.
 */
export const conformiteEscalier = {
  id: "conformite-escalier",
  titre: "Escalier prévu et escalier exigé",
  repond: "L'escalier prévu satisfait-il ce que le texte exige ?",
  produit: "conformiteEscalier",
  source: { article: "26" },
  regles: [
    {
      si: { typeEscalierExige: "aucun escalier protégé exigé" },
      alors: { valeur: "sans objet", sansObjet: "Aucun escalier protégé n'est exigé pour ce classement." },
      source: reglement("26", null, "Dans les habitations de la 3ème famille B, l'escalier doit être un escalier « protégé » soit « à l'air libre », soit « à l'abri des fumées ».")
    },
    {
      si: { typeEscalierExige: "escalier protégé", typeEscalierRetenu: ["airLibre", "abriFumees"] },
      alors: { valeur: "conforme" },
      source: reglement("26", null, "…un escalier « protégé » soit « à l'air libre », soit « à l'abri des fumées » répondant aux définitions ci-après.")
    },
    {
      si: { typeEscalierExige: "escalier protégé", typeEscalierRetenu: ["encloisonne", "nonProtege", "exterieur"] },
      alors: { valeur: "non conforme",
        mention: "Un escalier encloisonné n'est pas un escalier protégé : le texte n'ouvre que deux formes, « à l'air libre » et « à l'abri des fumées »." },
      source: reglement("26", null, "…l'escalier doit être un escalier « protégé » soit « à l'air libre », soit « à l'abri des fumées » répondant aux définitions ci-après.")
    }
  ]
};

export const paroisEscalierFacade = {
  id: "parois-escalier-facade",
  titre: "Parois de cage d'escalier situées en façade",
  repond: "Quel degré pour les parois de la cage d'escalier situées en façade ?",
  produit: "paroisEscalierFacade",
  source: { article: "18" },
  regles: [
    {
      si: { natureHabitation: "individuelle" },
      alors: { valeur: "sans objet", sansObjet: "L'article 18 ne vise que les habitations collectives." },
      source: reglement("18", "premier alinéa", "Dans toutes les habitations collectives, en règle générale, les parois d'escalier doivent être pare-flammes de degré 1/2 heure.")
    },
    {
      // La question/réponse de 1997 lève une contradiction que le texte porte :
      // l'article 18 s'adresse à « toutes les habitations collectives », mais
      // l'escalier d'un collectif de 2ᵉ famille sous 8 m n'est pas encloisonné,
      // et l'on ne peut pas exiger une paroi d'une cage qui n'existe pas.
      si: { famille: "2", hauteurDernierPlancherDesserviParEscalier: { auPlus: 8 } },
      alors: { valeur: "non applicable",
        mention: "Compte tenu du non-encloisonnement de l'escalier. La même réponse vaut pour les escaliers à l'air libre de ces bâtiments." },
      source: questionReponse("18", "commission du règlement de construction, 25 juin 1997",
        "Compte tenu du non encloisonnement de l'escalier, l'article 18 ne s'applique pas aux bâtiments collectifs classés en 2ème Famille dont le dernier plancher desservi par l'escalier est à une hauteur inférieure ou égale à 8 mètres.")
    },
    {
      si: { natureHabitation: "collective" },
      alors: { valeur: "PF 1/2 h",
        mention: "S'applique aussi à l'ensemble des escaliers à l'air libre des bâtiments collectifs (article 28, deuxième alinéa)." },
      source: reglement("18", "premier alinéa", "Dans toutes les habitations collectives, en règle générale, les parois d'escalier doivent être pare-flammes de degré 1/2 heure.")
    }
  ]
};

/**
 * L'éloignement des parties de paroi qui ne tiennent pas le PF 1/2 h.
 *
 * Trois distances pour trois positions de façade, et le texte définit les
 * positions par l'angle du dièdre — plus de 135° pour « latéralement », entre
 * 90° et 135° bornes incluses pour « en retour », moins de 90° pour « en
 * vis-à-vis ». Les bornes comptent : à 135° exactement, on est en retour.
 */
export const eloignementBaiesEscalier = {
  id: "eloignement-baies-escalier",
  titre: "Éloignement des parties de paroi non pare-flammes",
  repond: "À quelle distance des fenêtres les parties de paroi non pare-flammes doivent-elles être ?",
  produit: "eloignementBaiesEscalier",
  source: { article: "18", paragraphe: "deuxième alinéa" },
  regles: [
    {
      si: { paroisEscalierFacade: ["sans objet", "non applicable"] },
      alors: { valeur: "sans objet", sansObjet: "L'article 18 ne s'applique pas à ce bâtiment." },
      source: reglement("18", "deuxième alinéa", "Les parties de paroi, baies ou fenêtres non pare-flammes de degré 1/2 heure doivent être situées : […]")
    },
    {
      si: { partiesParoiEscalierNonPareFlammes: false },
      alors: { valeur: "sans objet", sansObjet: "Toute la paroi tient le pare-flammes de degré 1/2 heure : aucun éloignement n'est exigé." },
      source: reglement("18", "deuxième alinéa", "Les parties de paroi, baies ou fenêtres non pare-flammes de degré 1/2 heure doivent être situées : […]")
    },
    {
      si: { partiesParoiEscalierNonPareFlammes: true, angleDiedreFacade: { plusDe: 135 } },
      alors: { valeur: "2 m au moins",
        mention: "Façade latérale : sur un même plan ou formant un dièdre d'angle supérieur à 135°." },
      source: reglement("18", "deuxième alinéa, premier tiret", "à 2 m au moins des fenêtres de la façade située dans un même plan ;")
    },
    {
      si: { partiesParoiEscalierNonPareFlammes: true, angleDiedreFacade: { auMoins: 90 } },
      alors: { valeur: "4 m au moins",
        mention: "Façade en retour : dièdre d'angle compris entre 90° et 135°, bornes incluses." },
      source: reglement("18", "deuxième alinéa, deuxième tiret", "à 4 m au moins des fenêtres d'une façade en retour ;")
    },
    {
      si: { partiesParoiEscalierNonPareFlammes: true, angleDiedreFacade: { moinsDe: 90 } },
      alors: { valeur: "8 m au moins",
        mention: "Façade en vis-à-vis : dièdre d'angle inférieur à 90°." },
      source: reglement("18", "deuxième alinéa, troisième tiret", "à 8 m au moins des fenêtres d'une façade en vis-à-vis.")
    }
  ]
};

export const paroisEscalierHorsFacade = {
  id: "parois-escalier-hors-facade",
  titre: "Parois de cage d'escalier non situées en façade",
  repond: "Quel degré pour les parois de la cage d'escalier qui ne sont pas en façade ?",
  produit: "paroisEscalierHorsFacade",
  source: { article: "19" },
  regles: [
    {
      si: { natureHabitation: "collective", famille: "2" },
      alors: { valeur: "CF 1/2 h" },
      source: reglement("19", "premier alinéa", "Les parois des cages d'escalier non situées en façade doivent être coupe-feu de degré 1/2 heure pour les habitations collectives de la 2ème famille.")
    },
    {
      si: { famille: "3" },
      alors: { valeur: "CF 1 h",
        mention: "À l'exception des impostes ou oculus, qui peuvent être pare-flammes de degré 1 heure. Aucun local ne doit s'ouvrir sur ces escaliers." },
      source: reglement("20", null, "Dans les habitations de 3ème famille, les escaliers doivent être établis dans une cage dont toutes les parois non situées en façade sont coupe-feu de degré 1 h, à l'exception des impostes ou oculus qui peuvent être pare-flammes de degré 1 heure.")
    },
    {
      si: { famille: "4" },
      alors: { valeur: "CF 1 h au moins",
        mention: "Parois communes avec le bâtiment desservi. À l'exception des impostes ou oculus, qui peuvent être pare-flammes de degré 1 heure." },
      source: reglement("21", null, "Dans les habitations de la 4ème famille, les parois de l'escalier protégé communes avec le bâtiment desservi doivent être coupe-feu de degré 1 heure au moins, à l'exception des impostes ou oculus qui peuvent être pare-flammes de degré 1 heure.")
    },
    {
      si: { famille: { renseigne: true } },
      alors: { valeur: "sans objet",
        sansObjet: "Ni la première famille, ni les habitations individuelles de la deuxième ne sont visées par les articles 19 à 21." },
      source: reglement("19", "premier alinéa", "Les parois des cages d'escalier non situées en façade doivent être coupe-feu de degré 1/2 heure pour les habitations collectives de la 2ème famille.")
    }
  ]
};

/**
 * La porte entre l'escalier et la circulation, en deuxième famille.
 *
 * Deuxième phrase de l'article 19, et c'est elle qui définit l'« escalier
 * encloisonné » dont l'article 3 parle sans le nommer ainsi. Le ministère
 * précise que le terme n'implique aucune qualité de résistance au feu : une
 * séparation physique suffit.
 */
export const porteEscalierCirculation = {
  id: "porte-escalier-circulation",
  titre: "Porte entre l'escalier et la circulation",
  repond: "Une porte séparant l'escalier des circulations horizontales est-elle exigée ?",
  produit: "porteEscalierCirculation",
  source: { article: "19", paragraphe: "deuxième alinéa" },
  regles: [
    {
      si: { natureHabitation: "collective", famille: "2", hauteurPlancherBasLogementLePlusHaut: { plusDe: 8 } },
      alors: { valeur: "exigée",
        mention: "« Encloisonné » implique une séparation physique, sans qu'il soit requis une qualité particulière de résistance au feu (ministère de l'Équipement, 14 avril 1987)." },
      source: reglement("19", "deuxième alinéa", "Il n'est pas exigé qu'il existe des portes séparant l'escalier des circulations horizontales, sauf pour les habitations dont le plancher bas du logement le plus haut est à plus de 8 m du sol.")
    },
    {
      si: { natureHabitation: "collective", famille: "2" },
      alors: { valeur: "non exigée" },
      source: reglement("19", "deuxième alinéa", "Il n'est pas exigé qu'il existe des portes séparant l'escalier des circulations horizontales, sauf pour les habitations dont le plancher bas du logement le plus haut est à plus de 8 m du sol.")
    },
    {
      si: { famille: ["3", "4"] },
      alors: { valeur: "bloc-porte exigé",
        mention: "En troisième famille, bloc-porte pare-flammes de degré 1/2 heure muni d'un ferme-porte, s'ouvrant dans le sens de la sortie en venant des logements (article 20)." },
      source: reglement("20", "deuxième alinéa", "Les blocs-portes aménagés dans ces parois doivent être pare-flammes de degré 1/2 heure, leur porte doit être munie d'un ferme-porte et s'ouvrir dans le sens de la sortie en venant des logements.")
    },
    {
      si: { famille: { renseigne: true } },
      alors: { valeur: "sans objet", sansObjet: "Cet alinéa ne vise que les habitations collectives." },
      source: reglement("19", "deuxième alinéa", "Il n'est pas exigé qu'il existe des portes séparant l'escalier des circulations horizontales…")
    }
  ]
};

export const escalierMateriaux = {
  id: "escalier-materiaux",
  titre: "Matériaux des marches, volées et paliers",
  repond: "En quels matériaux l'escalier doit-il être réalisé ?",
  produit: "escalierMateriaux",
  source: { article: "22" },
  regles: [
    {
      si: { famille: ["3", "4"] },
      alors: { valeur: "matériaux incombustibles" },
      source: reglement("22", null, "Les escaliers des habitations des 3ème et 4ème familles doivent être réalisés en matériaux incombustibles.")
    },
    {
      si: { famille: { renseigne: true } },
      alors: { valeur: "aucune exigence par cet article",
        sansObjet: "L'article 22 ne vise que les troisième et quatrième familles." },
      source: reglement("22", null, "Les escaliers des habitations des 3ème et 4ème familles doivent être réalisés en matériaux incombustibles.")
    }
  ]
};

export const revetementsCageEscalier = {
  id: "revetements-cage-escalier",
  titre: "Revêtements de la cage d'escalier",
  repond: "Quels classements pour les revêtements de la cage d'escalier ?",
  produit: "revetementsCageEscalier",
  source: { article: "23" },
  regles: [
    {
      si: { natureHabitation: "individuelle" },
      alors: { valeur: "sans objet", sansObjet: "L'article 23 ne vise que les habitations collectives." },
      source: reglement("23", "premier alinéa", "Dans les habitations collectives de la 2ème famille, les revêtements des parois verticales, du rampant et des plafonds de la cage d'escalier doivent être classés en catégorie M2.")
    },
    {
      si: { natureHabitation: "collective", famille: "2" },
      alors: { valeur: "M2 — parois verticales, rampant et plafonds", mention: MENTION_ART23() },
      source: reglement("23", "premier alinéa", "Dans les habitations collectives de la 2ème famille, les revêtements des parois verticales, du rampant et des plafonds de la cage d'escalier doivent être classés en catégorie M2.")
    },
    {
      si: { natureHabitation: "collective" },
      alors: { valeur: "M0 — parois verticales, rampant et plafonds", mention: MENTION_ART23() },
      source: reglement("23", "quatrième alinéa", "Dans les autres habitations collectives, les revêtements des parois verticales, du rampant et des plafonds de la cage d'escalier doivent être classés en catégorie M0.")
    }
  ]
};

function MENTION_ART23() {
  return "Marches et contremarches : M3. Aucune exigence pour les revêtements de sols, quel que soit leur mode "
    + "de pose, ni pour les revêtements collés ou tendus sur la face supérieure des marches. Si l'escalier est "
    + "à l'air libre, aucune prescription pour les revêtements collés à la face supérieure des marches. "
    + "L'emploi du bois est autorisé dans les halls d'entrée de la deuxième famille lorsque l'escalier "
    + "desservant les étages débouche directement à l'extérieur du bâtiment.";
}

export const communicationSousSol = {
  id: "communication-sous-sol",
  titre: "Communication de l'escalier avec le sous-sol",
  repond: "Que faut-il entre le sous-sol et le reste du bâtiment ?",
  produit: "communicationSousSol",
  source: { article: "24" },
  regles: [
    {
      si: { sousSol: "sans sous-sol" },
      alors: { valeur: "sans objet", sansObjet: "Le bâtiment ne comporte pas de sous-sol." },
      source: reglement("24", "premier alinéa", "Dans les habitations collectives des 2ème, 3ème et 4ème familles, les escaliers mettant en communication les sous-sols et le reste du bâtiment doivent comporter au moins un bloc-porte coupe-feu de degré 1/2 heure…")
    },
    {
      si: { natureHabitation: "collective", famille: ["2", "3", "4"] },
      alors: { valeur: "bloc-porte CF 1/2 h",
        mention: "Porte munie d'un ferme-porte et s'ouvrant dans le sens de la sortie en venant du sous-sol. "
          + "Ces escaliers doivent aboutir au rez-de-chaussée dans un hall ou une circulation horizontale, et non "
          + "dans les escaliers desservant les étages. Le bloc-porte peut être en bas de l'escalier ; un dispositif "
          + "au rez-de-chaussée (porte, grille, portillon) avec signalétique évite alors qu'on l'emprunte par inadvertance." },
      source: reglement("24", "premier alinéa", "Dans les habitations collectives des 2ème, 3ème et 4ème familles, les escaliers mettant en communication les sous-sols et le reste du bâtiment doivent comporter au moins un bloc-porte coupe-feu de degré 1/2 heure dont la porte est munie d'un ferme-porte et s'ouvre dans le sens de la sortie en venant du sous-sol.")
    },
    {
      si: { famille: { renseigne: true } },
      alors: { valeur: "sans objet", sansObjet: "L'article 24 ne vise que les habitations collectives des deuxième, troisième et quatrième familles." },
      source: reglement("24", "premier alinéa", "Dans les habitations collectives des 2ème, 3ème et 4ème familles, les escaliers mettant en communication les sous-sols et le reste du bâtiment…")
    }
  ]
};

/**
 * Le désenfumage de la cage d'escalier.
 *
 * L'article 25 ne vise que deux classements — collectifs de deuxième famille et
 * troisième famille A — et il s'efface devant l'escalier extérieur de l'article
 * 29 bis. Deux conditions à ne pas manquer : la seconde est écrite à la
 * dernière ligne de l'article, loin de la première.
 */
export const desenfumageCageEscalier = {
  id: "desenfumage-cage-escalier",
  titre: "Désenfumage de la cage d'escalier",
  repond: "Quel dispositif d'évacuation des fumées en partie haute de la cage ?",
  produit: "desenfumageCageEscalier",
  source: { article: "25" },
  regles: [
    // La portée d'abord, l'exception ensuite. L'exemption de l'escalier
    // extérieur ouvrait la liste : il fallait donc dire quel escalier on
    // retenait avant de savoir si l'article s'appliquait — et la question était
    // posée en quatrième famille, où il ne s'applique pas.
    {
      si: { classement: ["1re famille", "3e famille B", "4e famille"] },
      alors: { valeur: "sans objet",
        sansObjet: "L'article 25 ne vise que les habitations collectives de la deuxième famille et celles de la troisième famille A. Les troisième famille B et quatrième famille relèvent de l'article 29." },
      source: reglement("25", "premier alinéa", "Dans les habitations collectives de la 2ème famille et dans les habitations de la 3ème famille A, les dispositions suivantes doivent être appliquées : […]")
    },
    {
      si: { natureHabitation: "individuelle" },
      alors: { valeur: "sans objet",
        sansObjet: "L'article 25 ne vise que les habitations collectives de la deuxième famille et celles de la troisième famille A." },
      source: reglement("25", "premier alinéa", "Dans les habitations collectives de la 2ème famille et dans les habitations de la 3ème famille A, les dispositions suivantes doivent être appliquées : […]")
    },
    {
      si: { typeEscalierRetenu: "exterieur" },
      alors: { valeur: "sans objet",
        sansObjet: "Les dispositions de l'article 25 ne sont pas applicables dans le cas d'un escalier extérieur tel que défini à l'article 29 bis." },
      source: reglement("25", "dernier alinéa", "Les dispositions du présent article ne sont pas applicables dans le cas d'un escalier extérieur tel que défini à l'article 29 bis.")
    },
    {
      si: { classement: "3e famille A" },
      alors: { valeur: "ouverture de 1 m² au moins, asservie à un détecteur autonome déclencheur",
        mention: "Dispositif fermé en temps normal en partie haute de l'étage le plus élevé, commande au rez-de-chaussée à proximité de l'escalier, accès réservé aux services d'incendie et de secours et aux personnes habilitées." },
      source: reglement("25", "cinquième alinéa", "En outre, dans les habitations de la 3ème famille A, l'ouverture du dispositif doit être asservie à un détecteur autonome déclencheur.")
    },
    {
      si: { natureHabitation: "collective", famille: "2" },
      alors: { valeur: "ouverture de 1 m² au moins",
        mention: "Commande au rez-de-chaussée à proximité de l'escalier, par système électrique, pneumatique, hydraulique, électromagnétique, électropneumatique ou, en deuxième famille, par tringlerie. La commande peut être sur le demi-palier menant au premier étage si elle est visible depuis l'accès au rez-de-chaussée." },
      source: reglement("25", "premier et deuxième tirets", "en partie haute de l'étage le plus élevé, la cage d'escalier doit comporter un dispositif fermé en temps normal permettant, en cas d'incendie, une ouverture de 1 m² au moins assurant l'évacuation des fumées ; une commande située au rez-de-chaussée de l'immeuble, à proximité de l'escalier, doit permettre l'ouverture facile…")
    },
    {
      si: { famille: { renseigne: true } },
      alors: { valeur: "sans objet",
        sansObjet: "L'article 25 ne vise que les habitations collectives de la deuxième famille et celles de la troisième famille A. Les troisième famille B et quatrième famille relèvent de l'article 29." },
      source: reglement("25", "premier alinéa", "Dans les habitations collectives de la 2ème famille et dans les habitations de la 3ème famille A, les dispositions suivantes doivent être appliquées : […]")
    }
  ]
};

export const escalierAirLibre = {
  id: "escalier-air-libre",
  titre: "Escalier « à l'air libre »",
  repond: "L'escalier répond-il à la définition de l'escalier à l'air libre ?",
  produit: "escalierAirLibreConforme",
  source: { article: "28" },
  regles: [
    // Ce module ne pose ses questions qu'une fois la portée établie : sans ce
    // garde-fou, on demandait la solution retenue avant de savoir si le texte
    // en exigeait une.
    {
      si: { typeEscalierExige: "aucun escalier protégé exigé", escaliersAEncloisonner: "non exigé par cet alinéa" },
      alors: { valeur: "sans objet",
        sansObjet: "Aucun escalier protégé n'est exigé, et l'alinéa de l'article 3 sur l'encloisonnement en deuxième famille ne joue pas : le type d'escalier retenu ne se juge pas." },
      source: lecture("26", "portée du chapitre", "Les articles 27 à 29 bis décrivent les formes que peut prendre l'escalier protégé exigé par l'article 26. Là où l'article 26 n'en exige aucun — et où l'article 3 n'impose pas non plus l'encloisonnement en deuxième famille, dont il exempte les escaliers extérieurs de l'article 29 bis — ils n'ont pas d'objet.")
    },
    {
      si: { typeEscalierRetenu: { differentDe: "airLibre" } },
      alors: { valeur: "sans objet", sansObjet: "L'escalier prévu n'est pas un escalier à l'air libre." },
      source: reglement("28", "premier alinéa", "L'escalier « à l'air libre » est un escalier dont la paroi donnant sur l'extérieur est ouverte sur au moins la moitié de sa surface sur toute la longueur.")
    },
    {
      si: { typeEscalierRetenu: "airLibre", partVidesParoiEscalier: { auMoins: 50 } },
      alors: { valeur: "conforme",
        mention: "Il doit en outre répondre aux prescriptions de l'article 18. Si cet escalier comporte des portes desservant des circulations protégées, ces portes répondent aux dispositions prévues pour celles des escaliers « à l'abri des fumées »." },
      source: reglement("28", "premier alinéa", "L'escalier « à l'air libre » est un escalier dont la paroi donnant sur l'extérieur est ouverte sur au moins la moitié de sa surface sur toute la longueur.")
    },
    {
      si: { typeEscalierRetenu: "airLibre", partVidesParoiEscalier: { moinsDe: 50 } },
      alors: { valeur: "non conforme",
        mention: "La paroi donnant sur l'extérieur doit être ouverte sur au moins la moitié de sa surface, sur toute la longueur." },
      source: reglement("28", "premier alinéa", "L'escalier « à l'air libre » est un escalier dont la paroi donnant sur l'extérieur est ouverte sur au moins la moitié de sa surface sur toute la longueur.")
    }
  ]
};

export const escalierAbriFumees = {
  id: "escalier-abri-fumees",
  titre: "Escalier « à l'abri des fumées »",
  repond: "Que faut-il pour un escalier à l'abri des fumées ?",
  produit: "escalierAbriFumees",
  source: { article: "29" },
  regles: [
    // Ce module ne pose ses questions qu'une fois la portée établie : sans ce
    // garde-fou, on demandait la solution retenue avant de savoir si le texte
    // en exigeait une.
    {
      si: { typeEscalierExige: "aucun escalier protégé exigé", escaliersAEncloisonner: "non exigé par cet alinéa" },
      alors: { valeur: "sans objet",
        sansObjet: "Aucun escalier protégé n'est exigé, et l'alinéa de l'article 3 sur l'encloisonnement en deuxième famille ne joue pas : le type d'escalier retenu ne se juge pas." },
      source: lecture("26", "portée du chapitre", "Les articles 27 à 29 bis décrivent les formes que peut prendre l'escalier protégé exigé par l'article 26. Là où l'article 26 n'en exige aucun — et où l'article 3 n'impose pas non plus l'encloisonnement en deuxième famille, dont il exempte les escaliers extérieurs de l'article 29 bis — ils n'ont pas d'objet.")
    },
    {
      si: { typeEscalierRetenu: { differentDe: "abriFumees" } },
      alors: { valeur: "sans objet", sansObjet: "L'escalier prévu n'est pas un escalier à l'abri des fumées." },
      source: reglement("29", "premier alinéa", "L'escalier « à l'abri des fumées » est un escalier fermé sur toutes ses faces par des parois qui doivent être coupe-feu de degré 1 heure à l'exception des impostes et oculus qui doivent être pare-flammes de degré 1 heure.")
    },
    {
      si: { typeEscalierRetenu: "abriFumees" },
      alors: { valeur: "parois CF 1 h, bloc-porte PF 1/2 h",
        mention: "Impostes et oculus pare-flammes de degré 1 heure. Porte d'une largeur de 0,80 m au moins, munie d'un "
          + "ferme-porte, s'ouvrant dans le sens de la sortie en venant des logements, laissant un passage libre "
          + "minimal de 0,80 m dans l'escalier, et portant la mention « Porte coupe-feu à maintenir fermée ». "
          + "La cage est fermée en partie supérieure et inférieure, ce qui exclut toute ventilation, et comporte à "
          + "son extrémité supérieure une ouverture horizontale de 1 m² à l'air libre — ou, à défaut, une mise en "
          + "surpression. La partie basse de l'exutoire doit être au-dessus des linteaux des portes du dernier "
          + "niveau habité." },
      source: reglement("29", "premier à cinquième alinéas", "L'escalier « à l'abri des fumées » est un escalier fermé sur toutes ses faces par des parois qui doivent être coupe-feu de degré 1 heure […] Le bloc-porte séparant l'escalier de la circulation protégée doit être pare-flammes de degré 1/2 heure.")
    }
  ]
};

/**
 * L'escalier « extérieur » de l'article 29 bis.
 *
 * Trois distances, comme à l'article 18, mais mesurées d'une emprise
 * volumétrique à des baies, et non d'une paroi à des fenêtres. Le point de vue
 * SOCOTEC signale que la rédaction de 2015 est peu précise et que la différence
 * avec l'escalier à l'air libre tient à ce que celui-ci débouche, en théorie,
 * dans une circulation protégée.
 */
export const escalierExterieur = {
  id: "escalier-exterieur",
  titre: "Escalier « extérieur »",
  repond: "L'escalier répond-il à la définition de l'escalier extérieur ?",
  produit: "escalierExterieurConforme",
  source: { article: "29 bis" },
  regles: [
    // Ce module ne pose ses questions qu'une fois la portée établie : sans ce
    // garde-fou, on demandait la solution retenue avant de savoir si le texte
    // en exigeait une.
    {
      si: { typeEscalierExige: "aucun escalier protégé exigé", escaliersAEncloisonner: "non exigé par cet alinéa" },
      alors: { valeur: "sans objet",
        sansObjet: "Aucun escalier protégé n'est exigé, et l'alinéa de l'article 3 sur l'encloisonnement en deuxième famille ne joue pas : le type d'escalier retenu ne se juge pas." },
      source: lecture("26", "portée du chapitre", "Les articles 27 à 29 bis décrivent les formes que peut prendre l'escalier protégé exigé par l'article 26. Là où l'article 26 n'en exige aucun — et où l'article 3 n'impose pas non plus l'encloisonnement en deuxième famille, dont il exempte les escaliers extérieurs de l'article 29 bis — ils n'ont pas d'objet.")
    },
    {
      si: { typeEscalierRetenu: { differentDe: "exterieur" } },
      alors: { valeur: "sans objet", sansObjet: "L'escalier prévu n'est pas un escalier extérieur." },
      source: reglement("29 bis", null, "L'escalier « extérieur » est un escalier dont l'emprise volumétrique (paliers et volées de l'escalier) est située à plus de : deux mètres au moins des baies d'une façade située latéralement…")
    },
    {
      si: { typeEscalierRetenu: "exterieur", angleDiedreFacade: { plusDe: 135 }, distanceEscalierAuxBaies: { auMoins: 2 } },
      alors: { valeur: "conforme",
        mention: "Façade latérale : deux mètres au moins. Au rez-de-chaussée, l'escalier doit aboutir soit à l'extérieur, soit dans un hall ou une circulation horizontale largement ventilée." },
      source: reglement("29 bis", "premier tiret", "deux mètres au moins des baies d'une façade située latéralement ;")
    },
    {
      si: { typeEscalierRetenu: "exterieur", angleDiedreFacade: { auMoins: 90 }, distanceEscalierAuxBaies: { auMoins: 4 } },
      alors: { valeur: "conforme",
        mention: "Façade en retour : quatre mètres au moins. Au rez-de-chaussée, l'escalier doit aboutir soit à l'extérieur, soit dans un hall ou une circulation horizontale largement ventilée." },
      source: reglement("29 bis", "deuxième tiret", "quatre mètres au moins des baies d'une façade en retour ;")
    },
    {
      si: { typeEscalierRetenu: "exterieur", angleDiedreFacade: { moinsDe: 90 }, distanceEscalierAuxBaies: { auMoins: 8 } },
      alors: { valeur: "conforme",
        mention: "Façade en vis-à-vis : huit mètres au moins. Au rez-de-chaussée, l'escalier doit aboutir soit à l'extérieur, soit dans un hall ou une circulation horizontale largement ventilée." },
      source: reglement("29 bis", "troisième tiret", "huit mètres au moins des baies d'une façade en vis-à-vis.")
    },
    {
      si: { typeEscalierRetenu: "exterieur" },
      alors: { valeur: "non conforme",
        mention: "L'emprise volumétrique n'est pas assez éloignée des baies : deux mètres pour une façade latérale, quatre en retour, huit en vis-à-vis. La mesure s'effectue du nu extérieur au nu extérieur de l'emprise de l'escalier." },
      source: reglement("29 bis", null, "L'escalier « extérieur » est un escalier dont l'emprise volumétrique (paliers et volées de l'escalier) est située à plus de : deux mètres au moins des baies d'une façade située latéralement ; quatre mètres au moins des baies d'une façade en retour ; huit mètres au moins des baies d'une façade en vis-à-vis.")
    }
  ]
};

/* ================================================================== *
 * CHAPITRE II — CIRCULATIONS HORIZONTALES PROTÉGÉES
 * ================================================================== */

/**
 * Quelle circulation le texte exige.
 *
 * Les circulations horizontales protégées ne sont imposées qu'en troisième
 * famille B et en quatrième famille — le ministère l'a dit expressément, et
 * c'est ce qui répond à la question qu'on se pose devant un R+3.
 */
export const circulationExigee = {
  id: "circulation-exigee",
  titre: "Circulation horizontale protégée exigée",
  repond: "Une circulation horizontale protégée est-elle imposée ?",
  produit: "circulationProtegeeExigee",
  source: { article: "17" },
  regles: [
    {
      si: { classement: ["3e famille B", "4e famille"] },
      alors: { valeur: "exigée",
        mention: "Elle relie directement chaque logement à un escalier protégé, ou à l'extérieur pour les logements du rez-de-chaussée. Elle peut être « à l'air libre » (article 30) ou « à l'abri des fumées » (articles 31 à 38)." },
      source: questionReponse("17", "ministère de l'Équipement, 14 avril 1987",
        "Les circulations horizontales protégées ne sont imposées qu'en 3ème famille B et en 4ème famille.")
    },
    {
      si: { natureHabitation: "collective", famille: "2", hauteurPlancherBasLogementLePlusHaut: { plusDe: 8 } },
      alors: { valeur: "non exigée",
        mention: "Dans les deuxièmes familles dont le plancher bas du logement le plus haut est à plus de 8 m du sol, il est demandé une séparation physique entre l'escalier et la circulation : une porte. L'escalier est alors dit « encloisonné »." },
      source: questionReponse("17", "ministère de l'Équipement, 14 avril 1987",
        "Dans les 2ème familles dont le plancher bas du logement le plus haut est à plus de 8 m du sol, il est demandé une séparation physique entre l'escalier et la circulation (une porte).")
    },
    {
      si: { famille: { renseigne: true } },
      alors: { valeur: "non exigée",
        sansObjet: "Les circulations horizontales protégées ne sont imposées qu'en troisième famille B et en quatrième famille." },
      source: questionReponse("17", "ministère de l'Équipement, 14 avril 1987",
        "Les circulations horizontales protégées ne sont imposées qu'en 3ème famille B et en 4ème famille.")
    }
  ]
};

export const circulationAirLibre = {
  id: "circulation-air-libre",
  titre: "Circulation horizontale à l'air libre",
  repond: "La circulation répond-elle à la définition de la circulation à l'air libre ?",
  produit: "circulationAirLibreConforme",
  source: { article: "30" },
  regles: [
    // Ce module ne pose ses questions qu'une fois la portée établie : sans ce
    // garde-fou, on demandait la solution retenue avant de savoir si le texte
    // en exigeait une.
    {
      si: { circulationProtegeeExigee: "non exigée" },
      alors: { valeur: "sans objet", sansObjet: "Aucune circulation horizontale protégée n'est exigée : la forme retenue ne se juge pas." },
      source: lecture("30", "portée du chapitre", "Les articles 30 à 38 décrivent les circulations horizontales protégées. Là où les articles 30 et 31 n'en exigent aucune, ils n'ont pas d'objet.")
    },
    {
      si: { typeCirculationRetenue: { differentDe: "airLibre" } },
      alors: { valeur: "sans objet", sansObjet: "La circulation prévue n'est pas à l'air libre." },
      source: reglement("30", "premier alinéa", "Elles peuvent être constituées par des balcons, coursives ou terrasses praticables en permanence dont la paroi donnant sur l'extérieur comporte, sur toute sa longueur, des vides au moins égaux à la moitié de la surface totale de cette paroi.")
    },
    {
      si: { typeCirculationRetenue: "airLibre", partVidesParoiCirculation: { auMoins: 50 } },
      alors: { valeur: "conforme",
        mention: "Si des séparations la recoupent, celles-ci doivent être facilement amovibles ou destructibles. "
          + "Revêtements des parois verticales et des plafonds classés M2 ou réalisés en bois ; aucune prescription "
          + "pour les revêtements de sols. Les portions ne répondant pas à cette définition peuvent ne pas être "
          + "désenfumées lorsqu'elles mesurent moins de dix mètres et sont dans la continuité d'une circulation à l'air libre." },
      source: reglement("30", "premier alinéa", "…dont la paroi donnant sur l'extérieur comporte, sur toute sa longueur, des vides au moins égaux à la moitié de la surface totale de cette paroi.")
    },
    {
      si: { typeCirculationRetenue: "airLibre" },
      alors: { valeur: "non conforme",
        mention: "La paroi donnant sur l'extérieur doit comporter, sur toute sa longueur, des vides au moins égaux à la moitié de sa surface totale." },
      source: reglement("30", "premier alinéa", "Elles peuvent être constituées par des balcons, coursives ou terrasses praticables en permanence dont la paroi donnant sur l'extérieur comporte, sur toute sa longueur, des vides au moins égaux à la moitié de la surface totale de cette paroi.")
    }
  ]
};

/**
 * Les baies vitrées donnant sur une circulation à l'air libre.
 *
 * Une phrase, deux solutions, et un « sinon » qui bascule tout : allège d'au
 * moins un mètre au degré exigé, **ou** baie pare-flammes de degré une
 * demi-heure et fixe. Le mot « fixes » est la moitié de la seconde solution et
 * s'oublie facilement.
 */
export const allegeCirculationAirLibre = {
  id: "allege-circulation-air-libre",
  titre: "Baies vitrées donnant sur une circulation à l'air libre",
  repond: "Que faut-il des baies vitrées donnant sur la circulation à l'air libre ?",
  produit: "allegeBaieVitreeCirculation",
  source: { article: "30", paragraphe: "deuxième alinéa" },
  regles: [
    {
      si: { circulationAirLibreConforme: "sans objet" },
      alors: { valeur: "sans objet", sansObjet: "La circulation prévue n'est pas à l'air libre." },
      source: reglement("30", "deuxième alinéa", "Les baies vitrées donnant sur les circulations à l'air libre comportent une allège d'au moins un mètre de hauteur présentant un degré coupe-feu suivant : […]")
    },
    {
      si: { allegeBaieVitreeHauteur: { moinsDe: 1 } },
      alors: { valeur: "baies PF 1/2 h (E 30) et fixes",
        mention: "L'allège n'atteint pas un mètre : c'est la seconde branche du texte qui s'applique, et elle exige que les baies soient **fixes**." },
      source: reglement("30", "deuxième alinéa", "Sinon, ces baies vitrées sont pare-flammes de degré une demi-heure (de classement E30) et fixes.")
    },
    {
      si: { allegeBaieVitreeHauteur: { auMoins: 1 }, natureHabitation: "collective", famille: ["2", "3"] },
      alors: { valeur: "allège CF 1/2 h (EI 30)" },
      source: reglement("30", "deuxième alinéa, premier tiret", "une demi-heure (de classement EI 30) pour les habitations collectives de la deuxième et troisième famille ;")
    },
    {
      si: { allegeBaieVitreeHauteur: { auMoins: 1 }, famille: "3" },
      alors: { valeur: "allège CF 1/2 h (EI 30)" },
      source: reglement("30", "deuxième alinéa, premier tiret", "une demi-heure (de classement EI 30) pour les habitations collectives de la deuxième et troisième famille ;")
    },
    {
      si: { allegeBaieVitreeHauteur: { auMoins: 1 }, famille: "4" },
      alors: { valeur: "allège CF 1 h (EI 60)" },
      source: reglement("30", "deuxième alinéa, second tiret", "une heure (de classement EI 60) pour les habitations de la quatrième famille.")
    }
  ]
};

/**
 * La distance à parcourir, et ses trois seuils.
 *
 * La même cote — porte palière la plus éloignée jusqu'à l'accès à l'escalier —
 * vaut 25 m à l'air libre, 15 m à l'abri des fumées, et 10 m à l'article 3 pour
 * la troisième famille A. C'est le même fait, lu par trois articles : une seule
 * question, trois lectures.
 */
export const distanceCirculation = {
  id: "distance-circulation",
  titre: "Distance à parcourir jusqu'à l'escalier",
  repond: "La distance jusqu'à l'accès à l'escalier est-elle admissible ?",
  produit: "distanceCirculationVerdict",
  source: { article: "30 et 31" },
  regles: [
    // Ce module ne pose ses questions qu'une fois la portée établie : sans ce
    // garde-fou, on demandait la solution retenue avant de savoir si le texte
    // en exigeait une.
    {
      si: { circulationProtegeeExigee: "non exigée" },
      alors: { valeur: "sans objet", sansObjet: "Aucune circulation horizontale protégée n'est exigée." },
      source: lecture("30 et 31", "portée du chapitre", "Les articles 30 à 38 décrivent les circulations horizontales protégées. Là où les articles 30 et 31 n'en exigent aucune, ils n'ont pas d'objet.")
    },
    {
      si: { typeCirculationRetenue: "airLibre", classement: ["3e famille B", "4e famille"], distancePortePaliereEscalier: { auPlus: 25 } },
      alors: { valeur: "admissible — 25 m au plus" },
      source: reglement("30", "troisième alinéa", "Pour les circulations horizontales à l'air libre des bâtiments de troisième famille B et de quatrième famille, la distance maximale à parcourir entre la porte de logement la plus éloignée et l'accès à l'escalier doit être de 25 mètres.")
    },
    {
      si: { typeCirculationRetenue: "airLibre", classement: ["3e famille B", "4e famille"] },
      alors: { valeur: "dépassée — 25 m au plus exigés" },
      source: reglement("30", "troisième alinéa", "…la distance maximale à parcourir entre la porte de logement la plus éloignée et l'accès à l'escalier doit être de 25 mètres.")
    },
    {
      si: { typeCirculationRetenue: "abriFumees", distancePortePaliereEscalier: { auPlus: 15 } },
      alors: { valeur: "admissible — 15 m au plus",
        mention: "Pour un bâtiment de troisième famille B déclassé en troisième famille A, la commission du règlement de construction retient également 15 m dans le cas de circulations intérieures." },
      source: reglement("31", null, "La distance à parcourir entre la porte palière de chaque logement et la porte de l'escalier ou l'accès à l'air libre ne doit pas dépasser 15 m.")
    },
    {
      si: { typeCirculationRetenue: "abriFumees" },
      alors: { valeur: "dépassée — 15 m au plus exigés" },
      source: reglement("31", null, "La distance à parcourir entre la porte palière de chaque logement et la porte de l'escalier ou l'accès à l'air libre ne doit pas dépasser 15 m.")
    },
    {
      si: { typeCirculationRetenue: { renseigne: true } },
      alors: { valeur: "sans objet",
        sansObjet: "Ni l'article 30 ni l'article 31 ne fixe de distance pour ce cas. La distance de 10 m de l'article 3 reste, elle, un critère de classement en troisième famille A." },
      source: reglement("31", null, "La distance à parcourir entre la porte palière de chaque logement et la porte de l'escalier ou l'accès à l'air libre ne doit pas dépasser 15 m.")
    }
  ]
};

export const revetementsCirculation = {
  id: "revetements-circulation",
  titre: "Revêtements de la circulation",
  repond: "Quels classements pour les revêtements de la circulation ?",
  produit: "revetementsCirculation",
  source: { article: "32" },
  regles: [
    // Ce module ne pose ses questions qu'une fois la portée établie : sans ce
    // garde-fou, on demandait la solution retenue avant de savoir si le texte
    // en exigeait une.
    {
      si: { circulationProtegeeExigee: "non exigée" },
      alors: { valeur: "sans objet", sansObjet: "Aucune circulation horizontale protégée n'est exigée." },
      source: lecture("32", "portée du chapitre", "Les articles 30 à 38 décrivent les circulations horizontales protégées. Là où les articles 30 et 31 n'en exigent aucune, ils n'ont pas d'objet.")
    },
    {
      si: { typeCirculationRetenue: "airLibre" },
      alors: { valeur: "M2 ou bois — parois verticales et plafonds",
        mention: "Aucune prescription pour les revêtements de sols, quel que soit leur mode de pose." },
      source: reglement("30", "dernier alinéa", "Les revêtements éventuels des parois verticales et des plafonds doivent être classés en catégorie M2 ou réalisés en bois.")
    },
    {
      si: { typeCirculationRetenue: "abriFumees" },
      alors: { valeur: "M1 en plafond, M2 en parois verticales, M3 au sol",
        mention: "Pour les revêtements collés ou tendus. Lorsque l'escalier protégé aboutit directement à l'extérieur, en dehors du hall d'entrée, l'emploi du bois est autorisé dans ce hall." },
      source: reglement("32", null, "Les revêtements des parois de cette circulation doivent être classés en catégorie : M1 s'ils sont collés ou tendus en plafond ; M2 s'ils sont collés ou tendus sur les parois verticales ; M3 s'ils sont collés ou tendus sur le sol.")
    },
    {
      si: { typeCirculationRetenue: { renseigne: true } },
      alors: { valeur: "sans objet", sansObjet: "Aucune circulation horizontale protégée n'est prévue." },
      source: reglement("32", null, "Les revêtements des parois de cette circulation doivent être classés en catégorie : […]")
    }
  ]
};

export const conduitsDesenfumage = {
  id: "conduits-desenfumage",
  titre: "Conduits de désenfumage",
  repond: "Quel degré pour les conduits d'amenée d'air et d'évacuation des fumées ?",
  produit: "conduitsDesenfumageResistance",
  source: { article: "34" },
  regles: [
    // Ce module ne pose ses questions qu'une fois la portée établie : sans ce
    // garde-fou, on demandait la solution retenue avant de savoir si le texte
    // en exigeait une.
    {
      si: { circulationProtegeeExigee: "non exigée" },
      alors: { valeur: "sans objet", sansObjet: "Aucune circulation horizontale protégée n'est exigée : il n'y a rien à désenfumer." },
      source: lecture("33", "portée du chapitre", "Le désenfumage des articles 33 à 38 est celui des circulations horizontales protégées. Là où aucune n'est exigée, il n'a pas d'objet.")
    },
    {
      si: { typeCirculationRetenue: { differentDe: "abriFumees" } },
      alors: { valeur: "sans objet", sansObjet: "Le désenfumage des articles 33 à 38 ne vise que les circulations horizontales à l'abri des fumées." },
      source: reglement("33", null, "Le désenfumage, c'est-à-dire l'évacuation efficace de la fumée et de la chaleur, doit être réalisé dans les circulations horizontales à l'abri des fumées : soit par tirage naturel ; soit par extraction mécanique.")
    },
    {
      si: { typeCirculationRetenue: "abriFumees", famille: "3" },
      alors: { valeur: "incombustibles, CF 1/2 h", mention: MENTION_ART34() },
      source: reglement("34", "sixième alinéa", "Les conduits d'amenée d'air et les conduits d'évacuation doivent être réalisés en matériaux incombustibles et coupe-feu de degré 1/2 heure dans les habitations de 3ème famille et coupe-feu de degré 1 heure dans les habitations de 4ème famille.")
    },
    {
      si: { typeCirculationRetenue: "abriFumees", famille: "4" },
      alors: { valeur: "incombustibles, CF 1 h", mention: MENTION_ART34() },
      source: reglement("34", "sixième alinéa", "…coupe-feu de degré 1/2 heure dans les habitations de 3ème famille et coupe-feu de degré 1 heure dans les habitations de 4ème famille.")
    },
    {
      si: { typeCirculationRetenue: "abriFumees" },
      alors: { valeur: "sans objet",
        sansObjet: "L'article 34 ne fixe de degré que pour les troisième et quatrième familles." },
      source: reglement("34", "sixième alinéa", "Les conduits d'amenée d'air et les conduits d'évacuation doivent être réalisés en matériaux incombustibles…")
    }
  ]
};

function MENTION_ART34() {
  return "Section libre minimale de 20 dm² pour les conduits comme pour les raccordements d'étage ; le rapport de "
    + "la plus grande dimension de la section à la plus petite n'excède pas 2 ; les raccordements horizontaux "
    + "d'étage n'excèdent pas 2 m. Un conduit collecteur à bouches ouvertes en permanence ne dessert que cinq "
    + "niveaux au plus, et chaque bouche d'évacuation dispose d'une hauteur minimale de tirage de 4,25 m. Le "
    + "débouché à l'air libre est éloigné des obstacles plus élevés qu'eux d'au moins leur hauteur, sans excéder 8 m.";
}

export const bouchesDesenfumage = {
  id: "bouches-desenfumage",
  titre: "Bouches d'amenée d'air et d'évacuation",
  repond: "Comment les bouches de désenfumage doivent-elles être disposées ?",
  produit: "bouchesDesenfumage",
  source: { article: "35" },
  regles: [
    // Ce module ne pose ses questions qu'une fois la portée établie : sans ce
    // garde-fou, on demandait la solution retenue avant de savoir si le texte
    // en exigeait une.
    {
      si: { circulationProtegeeExigee: "non exigée" },
      alors: { valeur: "sans objet", sansObjet: "Aucune circulation horizontale protégée n'est exigée : il n'y a rien à désenfumer." },
      source: lecture("35", "portée du chapitre", "Le désenfumage des articles 33 à 38 est celui des circulations horizontales protégées. Là où aucune n'est exigée, il n'a pas d'objet.")
    },
    {
      si: { typeCirculationRetenue: { differentDe: "abriFumees" } },
      alors: { valeur: "sans objet", sansObjet: "L'article 35 ne vise que les circulations horizontales à l'abri des fumées." },
      source: reglement("35", "premier alinéa", "Les bouches d'amenée d'air et les bouches d'évacuation doivent avoir au moment de l'incendie et dans la circulation sinistrée une section libre minimale de 20 dm².")
    },
    {
      si: { typeCirculationRetenue: "abriFumees", parcoursCirculationRectiligne: true },
      alors: { valeur: "section 20 dm², alternées, 10 m au plus entre deux bouches",
        mention: MENTION_ART35() },
      source: reglement("35", "deuxième alinéa", "Les bouches d'amenée d'air et les bouches d'évacuation doivent être réparties de façon alternée dans la circulation horizontale, la distance horizontale entre deux bouches de nature différente ne devant pas excéder 10 m dans le cas d'un parcours rectiligne…")
    },
    {
      si: { typeCirculationRetenue: "abriFumees", parcoursCirculationRectiligne: false },
      alors: { valeur: "section 20 dm², alternées, 7 m au plus entre deux bouches",
        mention: MENTION_ART35() },
      source: reglement("35", "deuxième alinéa", "…et 7 m dans le cas d'un parcours non rectiligne.")
    }
  ]
};

function MENTION_ART35() {
  return "Toute porte palière non située entre une bouche d'amenée et une bouche d'évacuation est à 5 m au plus "
    + "d'une bouche. Les surfaces totales des deux catégories de bouches sont équivalentes, ou à défaut celle des "
    + "bouches d'évacuation est comprise entre 0,5 et 1 fois celle des bouches d'amenée d'air. La partie basse de "
    + "la bouche d'évacuation est à 1,80 m au moins au-dessus du plancher bas et entièrement dans le tiers "
    + "supérieur de la circulation ; la partie haute de la bouche d'amenée d'air est à 1 m au plus au-dessus du "
    + "plancher bas. Dans les halls d'entrée, l'amenée d'air peut se faire par la porte donnant sur l'extérieur.";
}

export const commandeDesenfumage = {
  id: "commande-desenfumage",
  titre: "Commande du désenfumage",
  repond: "Comment l'ouverture des bouches est-elle commandée ?",
  produit: "commandeDesenfumage",
  source: { article: "36" },
  regles: [
    // Ce module ne pose ses questions qu'une fois la portée établie : sans ce
    // garde-fou, on demandait la solution retenue avant de savoir si le texte
    // en exigeait une.
    {
      si: { circulationProtegeeExigee: "non exigée" },
      alors: { valeur: "sans objet", sansObjet: "Aucune circulation horizontale protégée n'est exigée : il n'y a rien à désenfumer." },
      source: lecture("36", "portée du chapitre", "Le désenfumage des articles 33 à 38 est celui des circulations horizontales protégées. Là où aucune n'est exigée, il n'a pas d'objet.")
    },
    {
      si: { typeCirculationRetenue: { differentDe: "abriFumees" } },
      alors: { valeur: "sans objet", sansObjet: "L'article 36 ne vise que les circulations horizontales à l'abri des fumées." },
      source: reglement("36", "premier alinéa", "La manœuvre des volets prévus à l'article 34 ci-dessus assurant l'ouverture des bouches d'amenée d'air et des bouches d'évacuation à l'étage sinistré est commandée par l'action de détecteurs sensibles aux fumées et gaz de combustion.")
    },
    {
      si: { typeCirculationRetenue: "abriFumees" },
      alors: { valeur: "détecteurs de fumées, un détecteur à 10 m au plus de chaque porte palière",
        mention: "Le fonctionnement d'un détecteur dans la circulation sinistrée entraîne simultanément le non-fonctionnement "
          + "automatique des volets des circulations non sinistrées — cette prescription ne s'applique pas aux shunts. "
          + "L'ouverture automatique est assurée en permanence, doublée d'une commande manuelle située dans l'escalier "
          + "à proximité de la porte palière. Les détecteurs sont dans l'axe de la circulation. La mise en œuvre d'un "
          + "système de sécurité incendie n'est pas obligatoire en habitation." },
      source: reglement("36", "quatrième alinéa", "Les détecteurs doivent être situés dans l'axe de la circulation et en nombre tel que la distance entre un détecteur et une porte palière d'appartement n'excède pas 10 m.")
    }
  ]
};

export const extractionMecanique = {
  id: "extraction-mecanique",
  titre: "Désenfumage par extraction mécanique",
  repond: "Quels débits pour un désenfumage mécanique ?",
  produit: "extractionMecanique",
  source: { article: "37" },
  regles: [
    // Ce module ne pose ses questions qu'une fois la portée établie : sans ce
    // garde-fou, on demandait la solution retenue avant de savoir si le texte
    // en exigeait une.
    {
      si: { circulationProtegeeExigee: "non exigée" },
      alors: { valeur: "sans objet", sansObjet: "Aucune circulation horizontale protégée n'est exigée : il n'y a rien à désenfumer." },
      source: lecture("37", "portée du chapitre", "Le désenfumage des articles 33 à 38 est celui des circulations horizontales protégées. Là où aucune n'est exigée, il n'a pas d'objet.")
    },
    {
      si: { modeDesenfumageRetenu: { differentDe: "extractionMecanique" } },
      alors: { valeur: "sans objet", sansObjet: "Le désenfumage retenu n'est pas mécanique." },
      source: reglement("37", "premier alinéa", "Le système mécanique de désenfumage doit assurer un débit minimal d'extraction de 1 m3/s par bouche d'extraction avec un débit total d'extraction au moins égal à n/2 m3 par seconde, n étant le nombre de bouches d'amenée d'air dans la circulation.")
    },
    {
      si: { modeDesenfumageRetenu: "extractionMecanique" },
      alors: { valeur: "1 m³/s par bouche, total ≥ n/2 m³/s",
        mention: "n étant le nombre de bouches d'amenée d'air dans la circulation. Le désenfumage doit en outre pouvoir "
          + "fonctionner par tirage naturel en cas de non-fonctionnement du ventilateur : les conduits d'extraction "
          + "comportent à leur extrémité supérieure un dispositif d'ouverture sur l'extérieur, commandé par un défaut "
          + "du ventilateur. Les ventilateurs assurent leur fonction pendant 1 h avec des fumées à 400 °C ; leur "
          + "alimentation électrique trouve son origine avant l'organe de coupure générale du bâtiment." },
      source: reglement("37", null, "Le système mécanique de désenfumage doit assurer un débit minimal d'extraction de 1 m3/s par bouche d'extraction… Les ventilateurs d'extraction doivent normalement assurer leur fonction pendant 1 h avec des fumées à 400 °C.")
    }
  ]
};

/* ================================================================== *
 * CHAPITRE III — DÉGAGEMENTS PROTÉGÉS
 * ================================================================== */

export const degagementsProteges3B = {
  id: "degagements-proteges-3b",
  titre: "Dégagements protégés en 3ᵉ famille B",
  repond: "Que doivent comporter les dégagements protégés en troisième famille B ?",
  produit: "degagementsProteges3B",
  source: { article: "39" },
  regles: [
    {
      si: { classement: { differentDe: "3e famille B" } },
      alors: { valeur: "sans objet", sansObjet: "L'article 39 ne vise que la troisième famille B." },
      source: reglement("39", null, "Dans les habitations de la 3ème famille B les dégagements protégés doivent comporter : […]")
    },
    {
      si: { classement: "3e famille B" },
      alors: { valeur: "un escalier protégé et une circulation reliant chaque logement",
        mention: "a) Un escalier conforme aux articles 18 à 29, « à l'air libre » ou « à l'abri des fumées » — s'il est "
          + "réalisé plusieurs escaliers, ils doivent tous être protégés. b) Une circulation horizontale reliant "
          + "directement chaque logement à un escalier protégé, ou à l'extérieur pour les logements du rez-de-chaussée, "
          + "soit désenfumée par deux ouvrants sur des façades opposées asservis à la détection (annexe I : ouvrants à "
          + "60° au moins, 2 m² au-dessus de 2 m pour l'évacuation, 4 m² en dessous de 2 m pour l'amenée d'air), soit "
          + "« protégée » conformément aux articles 30 à 38." },
      source: reglement("39", "a et b", "a) Un escalier conforme aux dispositions des articles 18 à 29 ci-dessus qui peut être soit « à l'air libre », soit « à l'abri des fumées ». S'il est réalisé plusieurs escaliers, ils doivent tous être protégés ; b) Une circulation horizontale reliant directement chaque logement à un escalier protégé ou à l'extérieur pour les logements du rez-de-chaussée…")
    }
  ]
};

/**
 * Les trois solutions de la quatrième famille.
 *
 * L'article 40 pose l'objectif — les fumées de la circulation sinistrée ne
 * doivent pas pénétrer dans l'escalier — et dit expressément que le choix entre
 * les trois solutions « appartient aux constructeurs du bâtiment ». L'utilitaire
 * ne choisit donc pas : il demande, et il dit ce que le choix entraîne.
 */
export const solutionDegagements4e = {
  id: "solution-degagements-4e",
  titre: "Solution retenue en 4ᵉ famille",
  repond: "Que doivent comporter les dégagements protégés de la quatrième famille ?",
  produit: "solutionDegagements4e",
  source: { article: "40" },
  regles: [
    {
      si: { famille: { differentDe: "4" } },
      alors: { valeur: "sans objet", sansObjet: "Les articles 40 à 43 ne visent que la quatrième famille." },
      source: reglement("40", null, "Les dégagements protégés des habitations de la 4ème famille doivent être tels que les fumées et les gaz de combustion produits dans la circulation sinistrée ne puissent pénétrer dans l'escalier desservant les logements concernés.")
    },
    {
      si: { famille: "4", solutionDegagementRetenue: "1" },
      alors: { valeur: "solution n° 1 — deux escaliers protégés distants de 10 m au moins",
        mention: "a) Deux escaliers protégés conformes aux articles 27 à 29, distants de 10 m au moins. b) Une circulation "
          + "horizontale protégée reliant directement chaque logement aux deux escaliers, ou à l'extérieur pour les "
          + "logements du rez-de-chaussée ; à l'air libre, elle est conforme à l'article 30 ; à l'abri des fumées, elle "
          + "est désenfumée par extraction mécanique et conforme aux articles 31 à 38." },
      source: reglement("41", "a et b", "a) Deux escaliers protégés conformes aux dispositions des articles 27 à 29 ci-avant. Ces escaliers doivent être distants de 10 m au moins ; b) Une circulation horizontale protégée qui relie directement chaque logement aux deux escaliers protégés ou à l'extérieur pour les logements du rez-de-chaussée.")
    },
    {
      si: { famille: "4", solutionDegagementRetenue: "2" },
      alors: { valeur: "solution n° 2 — un escalier protégé et un volume séparatif",
        mention: "c) Un volume séparant à chaque niveau la circulation horizontale protégée de l'escalier protégé, avec "
          + "une ouverture permanente à l'air libre d'au moins 2 m², sans vidoir à ordures ni dépôt. Blocs-portes "
          + "pare-flammes de degré 1/2 heure, munis de ferme-portes, s'ouvrant tous deux dans le sens de la sortie. "
          + "**Ce volume n'est pas nécessaire lorsque la circulation horizontale protégée ou l'escalier protégé est à l'air libre.**" },
      source: reglement("42", "c", "c) Un volume séparant à chaque niveau la circulation horizontale protégée de l'escalier protégé. Ce volume doit comporter une ouverture permanente à l'air libre d'une surface au moins égale à 2 m² ; il ne doit pas comporter de vidoir à ordures ni dépôt quelconque. […] Ce volume n'est pas nécessaire lorsque la circulation horizontale protégée ou l'escalier protégé est à l'air libre.")
    },
    {
      si: { famille: "4", solutionDegagementRetenue: "3" },
      alors: { valeur: "solution n° 3 — escalier mis en surpression et sas ventilé",
        mention: "a) Un escalier à l'abri des fumées conforme aux articles 27 et 29, pouvant être mis en surpression par "
          + "un ventilateur fixe assurant à chaque niveau un débit de passage de 0,8 m³/s entre l'escalier et le sas, "
          + "les deux portes du sas ouvertes et le désenfumage en fonctionnement. b) Une circulation à l'abri des fumées "
          + "désenfumée par extraction mécanique, sans conduits d'amenée d'air : l'amenée se fait par une ouverture d'au "
          + "moins 20 dm² dans la paroi séparant la circulation du sas, équipée d'un volet pare-flammes 1 heure fermé "
          + "par un déclencheur thermique à 70 °C ; le débit d'extraction est au moins 1,3 fois le débit de soufflage. "
          + "c) Un sas ventilé d'environ 3 m², blocs-portes pare-flammes de degré 1/2 heure avec ferme-porte." },
      source: reglement("43", "a, b et c", "a) Un escalier à l'abri des fumées conforme aux dispositions des articles 27 et 29 qui doit, en outre, pouvoir être mis en surpression par un ventilateur fixe de telle sorte qu'à chaque niveau pris séparément soit assuré un débit minimal de passage entre l'escalier et le sas visé en c), ci-après, de 0,8 m3/s…")
    }
  ]
};

/**
 * Les escaliers exigés par la solution retenue.
 *
 * La solution n° 1 en demande deux, distants de dix mètres au moins ; les deux
 * autres se contentent d'un. Confronter ce chiffre à ce qui est prévu est
 * exactement ce qu'on cherche à savoir.
 */
export const escaliers4eFamille = {
  id: "escaliers-4e-famille",
  titre: "Escaliers exigés par la solution retenue",
  repond: "Combien d'escaliers protégés, et à quelle distance ?",
  produit: "escaliers4eFamille",
  source: { article: "41" },
  regles: [
    {
      si: { solutionDegagements4e: "sans objet" },
      alors: { valeur: "sans objet", sansObjet: "Les articles 41 à 43 ne visent que la quatrième famille." },
      source: reglement("41", "a", "Deux escaliers protégés conformes aux dispositions des articles 27 à 29 ci-avant. Ces escaliers doivent être distants de 10 m au moins ;")
    },
    {
      si: { solutionDegagementRetenue: "1", nombreEscaliersProteges: { auMoins: 2 }, distanceEntreEscaliers: { auMoins: 10 } },
      alors: { valeur: "conforme — deux escaliers distants de 10 m au moins" },
      source: reglement("41", "a", "Deux escaliers protégés conformes aux dispositions des articles 27 à 29 ci-avant. Ces escaliers doivent être distants de 10 m au moins ;")
    },
    {
      si: { solutionDegagementRetenue: "1", nombreEscaliersProteges: { moinsDe: 2 } },
      alors: { valeur: "non conforme — deux escaliers protégés exigés" },
      source: reglement("41", "a", "Deux escaliers protégés conformes aux dispositions des articles 27 à 29 ci-avant. Ces escaliers doivent être distants de 10 m au moins ;")
    },
    {
      si: { solutionDegagementRetenue: "1" },
      alors: { valeur: "non conforme — 10 m au moins entre les deux escaliers" },
      source: reglement("41", "a", "Ces escaliers doivent être distants de 10 m au moins ;")
    },
    {
      si: { solutionDegagementRetenue: ["2", "3"], nombreEscaliersProteges: { auMoins: 1 } },
      alors: { valeur: "conforme — un escalier protégé" },
      source: reglement("42", "a", "a) Un escalier protégé conforme aux dispositions des articles 27 à 29 ci-avant ;")
    },
    {
      si: { solutionDegagementRetenue: ["2", "3"] },
      alors: { valeur: "non conforme — un escalier protégé exigé" },
      source: reglement("42", "a", "a) Un escalier protégé conforme aux dispositions des articles 27 à 29 ci-avant ;")
    }
  ]
};

export const MODULES_DEGAGEMENTS = [
  typeEscalierExige, conformiteEscalier,
  paroisEscalierFacade, eloignementBaiesEscalier, paroisEscalierHorsFacade, porteEscalierCirculation,
  escalierMateriaux, revetementsCageEscalier, communicationSousSol, desenfumageCageEscalier,
  escalierAirLibre, escalierAbriFumees, escalierExterieur,
  circulationExigee, circulationAirLibre, allegeCirculationAirLibre, distanceCirculation,
  revetementsCirculation, conduitsDesenfumage, bouchesDesenfumage, commandeDesenfumage, extractionMecanique,
  degagementsProteges3B, solutionDegagements4e, escaliers4eFamille
];
