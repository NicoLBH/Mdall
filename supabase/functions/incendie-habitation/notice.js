/**
 * La notice descriptive de sécurité, rédigée à partir des réponses.
 *
 * ## Pourquoi elle se rédige, et ne se remplit pas
 *
 * Le questionnaire produit « CF 1/2 h ». La notice dit « Les planchers seront
 * CF 1/2 h ». C'est la même chose, et pourtant c'est tout le travail : on passe
 * d'un résultat à une phrase que l'on dépose en mairie. Ce passage se faisait à
 * la main, à chaque projet, avec le risque exact qu'on recopie le degré d'un
 * projet voisin.
 *
 * ## Ce que la notice ajoute, et que le référentiel ne sait pas
 *
 * L'arrêté dit « CF 1/2 h » ; il ne dit pas « en béton armé ». La matière, le
 * procédé, la marque de l'écran thermique ne sont pas des exigences : ce sont
 * des **choix de projet**, et personne d'autre que celui qui conçoit ne les
 * connaît. Chaque phrase porte donc, quand c'est utile, un emplacement à
 * remplir — et une liste de réponses fréquentes, pour que remplir soit un clic.
 *
 * ## Ce qui reste vrai partout ailleurs dans l'utilitaire
 *
 * La phrase est dérivée : elle se recalcule à chaque ouverture, à partir des
 * réponses. Ce qui est **conservé**, c'est ce que l'utilisateur a ajouté — la
 * description, les cases cochées, l'en-tête administratif. Le reste se refait,
 * et se refait juste, même si le référentiel progresse d'ici là.
 */

/**
 * Ce qu'une phrase demande au projet, en plus de ce que l'arrêté exige.
 *
 * `rubrique` est la clé sous laquelle les réponses se comptent, tous projets
 * confondus : c'est elle qui fait remonter « béton armé » en tête quand c'est
 * la réponse la plus fréquente. `options` n'est qu'une amorce — la liste vit et
 * se classe à l'usage, on ne construit pas une bibliothèque à l'avance.
 */
const champ = (cle, libelle, rubrique, options, { multiple = false } = {}) =>
  ({ cle, libelle, rubrique, options, multiple });

const oui = (valeur) => valeur === true || valeur === "oui";

/** Le degré tel qu'on l'écrit dans une notice : « CF 1/2 h », sans enrobage. */
const degre = (valeur) => String(valeur ?? "").split(" — ")[0].trim();

/**
 * La trame : les sections, dans l'ordre où on les lit, et ce qui les remplit.
 *
 * Chaque paragraphe nomme les faits dont il a besoin. S'ils manquent tous, il
 * ne s'écrit pas — une notice qui affirme sans savoir est pire qu'une notice
 * incomplète. S'ils sont là mais que le référentiel a conclu « sans objet », la
 * section le dit : « Sans objet » est une réponse, et le lecteur en mairie
 * l'attend.
 */
export const TRAME = [
  {
    cle: "descriptif",
    titre: "Descriptif synthétique du projet ou des travaux",
    paragraphes: [
      {
        cle: "descriptif.objet",
        faits: [],
        phrase: (f, c) => "La présente notice constitue l'analyse réglementaire incendie du projet, "
          + "conformément à l'arrêté du 31 janvier 1986 relatif aux bâtiments d'habitation"
          + (c.objet ? `, pour ${c.objet}` : "") + ".",
        champ: champ("objet", "Nature de l'opération", "operation.nature",
          ["la construction d'un bâtiment d'habitation collectif",
           "la construction d'une maison individuelle",
           "la réhabilitation d'un bâtiment d'habitation",
           "la surélévation d'un bâtiment existant"])
      },
      {
        cle: "descriptif.composition",
        faits: ["etagesSurRdcRetenu"],
        phrase: (f) => {
          const morceaux = [];
          if (f.sousSol === "avec sous-sol") morceaux.push("un ou plusieurs niveaux de sous-sol");
          morceaux.push(f.etagesSurRdcRetenu === 0
            ? "un rez-de-chaussée"
            : `un rez-de-chaussée et ${f.etagesSurRdcRetenu} étage${f.etagesSurRdcRetenu > 1 ? "s" : ""} de logements`);
          return `Le bâtiment comprend ${morceaux.join(", ")}.`;
        }
      }
    ]
  },
  {
    cle: "classement",
    titre: "Classement réglementaire proposé",
    paragraphes: [
      {
        cle: "classement.reference",
        faits: [],
        phrase: (f, c) => "Le niveau de référence est le niveau du sol utilement accessible aux engins des "
          + "services de secours et de lutte contre l'incendie"
          + (c.acces ? `, ${c.acces}` : "") + ".",
        champ: champ("acces", "Depuis quelle voie", "classement.acces",
          ["accessible depuis la voie publique", "accessible depuis la voie interne de la résidence"])
      },
      {
        cle: "classement.hauteur",
        faits: ["hauteurPlancherBasNiveauLePlusHaut"],
        phrase: (f) => `Le plancher bas du niveau le plus haut est situé à ${nombre(f.hauteurPlancherBasNiveauLePlusHaut)} m `
          + "au-dessus du niveau de référence."
      },
      {
        cle: "classement.famille",
        faits: ["classement"],
        phrase: (f) => `Le bâtiment est classé en ${f.classement}.`
      }
    ]
  },
  {
    cle: "structure",
    titre: "Structure et enveloppe",
    sousSections: [
      {
        titre: "Structure",
        paragraphes: [
          {
            cle: "structure.porteurs",
            faits: ["porteursVerticauxStabilite"],
            phrase: (f, c) => `Les éléments porteurs verticaux seront ${degre(f.porteursVerticauxStabilite)}`
              + (c.materiau ? `, réalisés en ${c.materiau}` : "") + ".",
            champ: champ("materiau", "Matériau de la structure", "structure.materiau",
              ["béton armé", "maçonnerie de blocs béton", "ossature bois", "ossature métallique", "mixte bois-béton"])
          },
          {
            cle: "structure.balcons",
            faits: ["porteursBalconsCoursives"],
            phrase: (f) => `Les éléments porteurs des balcons, coursives et circulations à l'air libre seront `
              + `${degre(f.porteursBalconsCoursives)}.`
          },
          {
            cle: "structure.planchers",
            faits: ["planchersCoupeFeu"],
            phrase: (f, c) => `Les planchers seront ${degre(f.planchersCoupeFeu)}`
              + (c.materiau ? `, réalisés en ${c.materiau}` : "") + ".",
            champ: champ("materiau", "Nature des planchers", "planchers.materiau",
              ["béton armé", "poutrelles-hourdis", "dalle bois massif (CLT)", "plancher mixte collaborant",
               "solivage bois"])
          },
          {
            cle: "structure.recoupement",
            faits: ["murRecoupementCoupeFeu"],
            phrase: (f) => f.murRecoupementCoupeFeu === "sans objet"
              ? "Le bâtiment n'atteint pas 45 m de long : aucun recoupement vertical n'est nécessaire."
              : `Les murs de recoupement, tous les 45 m au plus, seront ${degre(f.murRecoupementCoupeFeu)}.`
          },
          {
            cle: "structure.enveloppe",
            faits: ["paroisEnveloppeCoupeFeu", "blocPortePaliereResistance"],
            phrase: (f, c) => `Les parois verticales de l'enveloppe des logements seront ${degre(f.paroisEnveloppeCoupeFeu)}`
              + (c.materiau ? `, réalisées en ${c.materiau}` : "")
              + `, avec des blocs-portes palières ${degre(f.blocPortePaliereResistance)}.`,
            champ: champ("materiau", "Nature des parois d'enveloppe", "enveloppe.materiau",
              ["béton armé", "maçonnerie de blocs béton", "carreaux de plâtre", "cloison sèche sur ossature métallique",
               "ossature bois"])
          },
          {
            cle: "structure.celliers",
            faits: ["celliersParoisCoupeFeu"],
            phrase: (f, c) => f.celliersParoisCoupeFeu === "sans objet"
              ? "Le bâtiment ne comporte pas d'ensemble regroupant des celliers ou caves indépendants des logements."
              : `Les celliers et caves sont regroupés dans un ensemble isolé du reste du bâtiment par des parois `
                + `${degre(f.celliersParoisCoupeFeu)}${c.materiau ? ` en ${c.materiau}` : ""}, avec un bloc-porte muni `
                + "d'un ferme-porte, ouvrant dans le sens de l'évacuation, ouvrable sans clé de l'intérieur.",
            champ: champ("materiau", "Nature des parois des celliers", "celliers.materiau",
              ["béton armé", "maçonnerie de blocs béton", "carreaux de plâtre"])
          }
        ]
      },
      {
        titre: "Façades",
        paragraphes: [
          {
            cle: "facades.parement",
            faits: ["parementExterieurClasse"],
            phrase: (f, c) => (/voir article/i.test(String(f.parementExterieurClasse))
              ? "Les façades relèvent du système de façade défini à l'article 13"
              : `Les parements extérieurs seront ${f.parementExterieurClasse}`)
              + (c.systeme ? `, réalisés en ${c.systeme}` : "") + ".",
            champ: champ("systeme", "Système de façade", "facade.systeme",
              ["enduit mince sur isolation extérieure (ETICS – PSE)", "bardage bois ventilé",
               "bardage métallique", "enduit sur maçonnerie", "vêture minérale", "béton apparent"])
          },
          {
            cle: "facades.cd",
            faits: ["regleCPlusD"],
            phrase: (f) => f.regleCPlusD === "sans objet"
              ? "La règle du C + D n'est pas applicable au projet."
              : `La règle du C + D s'applique : ${f.regleCPlusD}.`
          }
        ]
      },
      {
        titre: "Couverture",
        paragraphes: [
          {
            cle: "couverture.classe",
            faits: ["couvertureClassePenetration"],
            phrase: (f, c) => `La couverture ${c.materiau ? `sera réalisée en ${c.materiau} et ` : ""}`
              + `répondra aux exigences suivantes : ${f.couvertureClassePenetration}.`,
            champ: champ("materiau", "Nature de la couverture", "couverture.materiau",
              ["bac acier sur support continu", "tuiles terre cuite", "ardoises", "zinc à joint debout",
               "étanchéité bitumineuse sur support béton", "bardeaux bitumés"])
          }
        ]
      },
      {
        titre: "Isolation des parois par l'intérieur",
        paragraphes: [
          {
            cle: "isolation.ecran",
            faits: [],
            phrase: (f, c) => c.ecran
              ? `Les produits isolants installés à l'intérieur seront protégés par un écran thermique ${c.ecran}.`
              : "Les produits isolants installés à l'intérieur seront protégés par un écran thermique conforme "
                + "au Guide de l'isolation par l'intérieur visé à l'article 16.",
            champ: champ("ecran", "Écran thermique retenu", "isolation.ecran",
              ["de type BA 13", "de type BA 18", "en plaque de plâtre sur ossature", "en béton"])
          }
        ]
      }
    ]
  },
  {
    cle: "degagements",
    titre: "Dégagements",
    sousSections: [
      {
        titre: "Escaliers",
        paragraphes: [
          {
            cle: "escaliers.type",
            faits: ["typeEscalierExige"],
            phrase: (f) => f.typeEscalierExige === "escalier protégé"
              ? "Un escalier protégé est exigé."
              : "Aucun escalier protégé n'est exigé par l'article 26."
          },
          {
            cle: "escaliers.encloisonnement",
            faits: ["escaliersAEncloisonner"],
            // L'alinéa de l'article 3 ne vise que les collectifs de deuxième
            // famille à trois étages sur rez-de-chaussée : écrire « le dernier
            // plancher est à moins de 8 m » partout ailleurs serait affirmer,
            // dans une notice, quelque chose que le référentiel n'a pas dit.
            phrase: (f) => f.escaliersAEncloisonner === "encloisonnement exigé"
              ? "Le bâtiment étant un collectif de deuxième famille de trois étages sur rez-de-chaussée dont le "
                + "plancher bas du logement le plus haut dépasse 8 m, l'escalier sera encloisonné, sauf s'il est "
                + "extérieur au sens de l'article 29 bis."
              : "L'alinéa de l'article 3 imposant l'encloisonnement des escaliers en deuxième famille ne "
                + "s'applique pas à ce bâtiment."
          },
          {
            cle: "escaliers.parois",
            faits: ["paroisEscalierHorsFacade"],
            phrase: (f) => `Les parois de la cage d'escalier non situées en façade seront ${degre(f.paroisEscalierHorsFacade)}.`
          },
          {
            cle: "escaliers.materiaux",
            faits: ["escalierMateriaux", "revetementsCageEscalier"],
            phrase: (f, c) => `L'escalier sera réalisé ${c.materiau ? `en ${c.materiau}` : "en matériaux incombustibles"}`
              + ` ; les revêtements des parois verticales, du rampant et des plafonds seront `
              + `${premierMot(f.revetementsCageEscalier)}.`,
            champ: champ("materiau", "Matériau de l'escalier", "escalier.materiau",
              ["béton armé", "métal", "bois", "métal avec marches bois"])
          },
          {
            cle: "escaliers.desenfumage",
            faits: ["desenfumageCageEscalier"],
            phrase: (f, c) => f.desenfumageCageEscalier === "sans objet"
              ? "Le désenfumage de la cage d'escalier n'est pas exigé par l'article 25."
              : `La cage d'escalier sera désenfumée en partie haute : ${minuscule(f.desenfumageCageEscalier)}`
                + (c.dispositif ? `, par ${c.dispositif}` : "") + ".",
            champ: champ("dispositif", "Dispositif de désenfumage", "escalier.desenfumage",
              ["un ouvrant en façade", "un exutoire en toiture", "un châssis à commande manuelle"])
          }
        ]
      },
      {
        titre: "Circulations horizontales protégées",
        paragraphes: [
          {
            cle: "circulations.exigee",
            faits: ["circulationProtegeeExigee"],
            phrase: (f) => f.circulationProtegeeExigee === "exigée"
              ? "Des circulations horizontales protégées sont exigées."
              : "Aucune circulation horizontale protégée n'est exigée."
          },
          {
            cle: "circulations.revetements",
            faits: ["revetementsCirculation"],
            phrase: (f) => sansObjet(f.revetementsCirculation)
              ? "Aucune circulation horizontale protégée n'étant exigée, l'article 32 est sans objet."
              : `Les revêtements des circulations seront : ${minuscule(f.revetementsCirculation)}.`
          }
        ]
      },
      {
        titre: "Dégagements protégés",
        paragraphes: [
          {
            cle: "degagements.solution",
            faits: ["solutionDegagements4e"],
            phrase: (f) => sansObjet(f.solutionDegagements4e)
              ? "Les dispositions de l'article 41 sur les dégagements de la quatrième famille sont sans objet."
              : `Solution retenue pour les dégagements : ${minuscule(f.solutionDegagements4e)}.`
          },
          {
            cle: "degagements.trois-b",
            faits: ["degagementsProteges3B"],
            phrase: (f) => sansObjet(f.degagementsProteges3B)
              ? "Les dispositions de l'article 39 sur les dégagements de la troisième famille B sont sans objet."
              : `Dégagements de la troisième famille B : ${minuscule(f.degagementsProteges3B)}.`
          }
        ]
      }
    ]
  },
  {
    cle: "conduits",
    titre: "Conduits et gaines",
    paragraphes: [
      {
        cle: "conduits.traversee",
        faits: ["traverseeDeParoi"],
        phrase: (f, c) => `Les conduits traversant les parois de l'enveloppe des logements présenteront `
          + `${minuscule(f.traverseeDeParoi)}`
          + (c.gaine ? `. Les gaines palières seront réalisées en ${c.gaine}` : "") + ".",
        champ: champ("gaine", "Nature des gaines", "gaines.materiau",
          ["carreaux de plâtre", "plaques de plâtre sur ossature", "béton armé", "maçonnerie"])
      },
      {
        cle: "conduits.ventilation",
        faits: ["conduitsVentilation"],
        phrase: (f) => sansObjet(f.conduitsVentilation)
          ? "Aucune prescription particulière n'est exigée pour les conduits de ventilation."
          : `Les conduits de ventilation seront : ${f.conduitsVentilation}.`
      },
      {
        cle: "conduits.gaz",
        faits: ["paroisGaineGaz"],
        phrase: (f) => f.paroisGaineGaz === "sans objet"
          ? "Le bâtiment ne comporte pas de conduite montante de gaz."
          : `Gaine de la conduite montante de gaz : ${minuscule(f.paroisGaineGaz)}.`
      },
      {
        cle: "conduits.vide-ordures",
        faits: ["videOrduresConduit"],
        phrase: (f) => f.videOrduresConduit === "sans objet"
          ? "Le bâtiment ne comporte pas de vide-ordures."
          : /aucune prescription/i.test(String(f.videOrduresConduit))
            ? "L'article 64 ne vise que les troisième et quatrième familles : aucune prescription pour les vide-ordures."
            : `Vide-ordures : ${f.videOrduresConduit}.`
      }
    ]
  },
  {
    cle: "foyers",
    titre: "Logements-foyers",
    paragraphes: [
      {
        cle: "foyers.regime",
        faits: ["regimeLogementFoyer"],
        phrase: (f) => f.regimeLogementFoyer === "sans objet"
          ? "Sans objet."
          : `Le bâtiment renferme un logement-foyer : ${minuscule(f.regimeLogementFoyer)}.`
      }
    ]
  },
  {
    cle: "parc",
    titre: "Parc de stationnement",
    sousSections: [
      {
        titre: "Généralités",
        paragraphes: [
          {
            cle: "parc.champ",
            faits: ["parcDansLeChamp"],
            phrase: (f, c) => f.parcDansLeChamp !== "dans le champ"
              ? "Sans objet."
              : "Le projet comporte un parc de stationnement couvert annexe relevant du titre VI de l'arrêté"
                + (c.surface ? ` (${c.surface})` : "") + ".",
            champ: champ("surface", "Précision sur le parc", "parc.precision",
              ["sur un niveau de sous-sol", "sur deux niveaux de sous-sol", "en rez-de-chaussée"])
          },
          {
            cle: "parc.acces",
            faits: ["accesVehiculesLourds"],
            phrase: (f) => `L'accès du parc est ${minuscule(f.accesVehiculesLourds)}.`
          },
          {
            cle: "parc.reaction",
            faits: ["reactionAuFeuParc"],
            phrase: (f) => `Les éléments de construction du parc et leurs revêtements seront ${degre(f.reactionAuFeuParc)}.`
          }
        ]
      },
      {
        titre: "Structures et isolement",
        paragraphes: [
          {
            cle: "parc.stabilite",
            faits: ["stabiliteParc"],
            phrase: (f, c) => `La structure du parc sera ${degre(f.stabiliteParc)}`
              + (c.materiau ? `, réalisée en ${c.materiau}` : "") + ".",
            champ: champ("materiau", "Matériau de la structure du parc", "parc.structure",
              ["béton armé", "béton précontraint", "ossature métallique protégée"])
          },
          {
            cle: "parc.isolement",
            faits: ["isolementParcContigu"],
            phrase: (f) => sansObjet(f.isolementParcContigu)
              ? "Aucun isolement n'est exigé par l'article 82 entre le parc et l'immeuble."
              : `Les murs et planchers séparant le parc de l'immeuble seront ${minuscule(f.isolementParcContigu)}.`
          },
          {
            cle: "parc.sas",
            faits: ["sasCommunicationParc"],
            phrase: (f) => f.sasCommunicationParc === "sans objet"
              ? "Aucune communication n'est aménagée entre le parc et le reste du bâtiment."
              : `La communication entre le parc et le reste du bâtiment sera réalisée par un ${minuscule(f.sasCommunicationParc)}.`
          },
          {
            cle: "parc.recoupement",
            faits: ["recoupementParc"],
            phrase: (f) => sansObjet(f.recoupementParc)
              ? "Le parc ne comporte pas de niveau au-dessous du niveau de référence : le recoupement de l'article 84 est sans objet."
              : `Recoupement des niveaux du parc : ${minuscule(f.recoupementParc)}.`
          }
        ]
      },
      {
        titre: "Communications intérieures et issues",
        paragraphes: [
          {
            cle: "parc.issues",
            faits: ["distanceIssuesParc"],
            phrase: (f) => `Distance à parcourir pour atteindre une issue : ${minuscule(f.distanceIssuesParc)}.`
          },
          {
            cle: "parc.escaliers",
            faits: ["escaliersParc", "protectionEscaliersParc"],
            phrase: (f) => `Les escaliers du parc seront ${minuscule(f.escaliersParc)}, protégés à chaque niveau par `
              + `${minuscule(f.protectionEscaliersParc)}.`
          }
        ]
      },
      {
        titre: "Ventilation et équipements",
        paragraphes: [
          {
            cle: "parc.ventilation",
            faits: ["ventilationParc"],
            phrase: (f) => `Ventilation et désenfumage du parc : ${minuscule(f.ventilationParc)}.`
          },
          {
            cle: "parc.detection",
            faits: ["detectionParc", "alarmeUsagersParc"],
            phrase: (f) => `Détection automatique : ${minuscule(f.detectionParc)}. Alarme aux usagers : `
              + `${minuscule(f.alarmeUsagersParc)}.`
          },
          {
            cle: "parc.moyens",
            faits: ["moyensDeLutteParc", "colonneSecheParc"],
            phrase: (f) => `Moyens de lutte contre l'incendie : ${minuscule(f.moyensDeLutteParc)}. Colonnes sèches : `
              + `${minuscule(f.colonneSecheParc)}.`
          }
        ]
      }
    ]
  },
  {
    cle: "diverses",
    titre: "Dispositions diverses",
    paragraphes: [
      {
        cle: "diverses.ascenseur",
        faits: ["paroisCageAscenseur"],
        phrase: (f, c) => f.paroisCageAscenseur === "sans objet"
          ? "Le bâtiment ne comporte pas d'ascenseur."
          : `La gaine d'ascenseur sera ${degre(f.paroisCageAscenseur)}`
            + (c.materiau ? `, réalisée en ${c.materiau}` : "") + ".",
        champ: champ("materiau", "Nature de la gaine d'ascenseur", "ascenseur.gaine",
          ["béton armé", "maçonnerie de blocs béton", "ossature métallique et plaques de plâtre"])
      },
      {
        cle: "diverses.sas-ascenseur",
        faits: ["sasAscenseurSousSol"],
        phrase: (f) => f.sasAscenseurSousSol === "sans objet"
          ? "L'ascenseur ne dessert pas de sous-sol comportant un parc de stationnement ou des caves."
          : `Au sous-sol, l'ascenseur sera isolé par ${minuscule(f.sasAscenseurSousSol)}.`
      },
      {
        cle: "diverses.colonne-seche",
        faits: ["colonneSeche"],
        phrase: (f) => sansObjet(f.colonneSeche) || /non obligatoire|non exigée/i.test(String(f.colonneSeche))
          ? "Aucune colonne sèche n'est exigée par l'article 98."
          : `Une colonne sèche est ${minuscule(f.colonneSeche)}.`
      },
      {
        cle: "diverses.pietons",
        faits: ["circulationPietons"],
        phrase: (f) => sansObjet(f.circulationPietons)
          ? "L'article 99 sur la circulation des piétons est sans objet."
          : `Circulation des piétons : ${minuscule(f.circulationPietons)}.`
      }
    ]
  }
];

/** Un nombre écrit comme on l'écrit en français, virgule comprise. */
function nombre(valeur) {
  return String(valeur ?? "").replace(".", ",");
}

/**
 * La première lettre en minuscule : la valeur devient un morceau de phrase.
 *
 * Sauf quand ce n'est pas un mot. « M2 », « CF 1/2 h », « PF », « D-s3 » sont
 * des classements, et « m2 — parois verticales » ne veut plus rien dire : une
 * notice qui écrit une classe de réaction au feu en minuscule se fait reprendre
 * en instruction, à juste titre.
 */
function minuscule(valeur) {
  const texte = String(valeur ?? "").trim();
  if (!texte) return texte;
  if (/^[A-Z]{1,3}[\s0-9-]/.test(texte) || /^[A-Z]{2,}/.test(texte)) return texte;
  return texte.charAt(0).toLowerCase() + texte.slice(1);
}

/**
 * Ce qu'on écrit quand le référentiel a conclu « sans objet ».
 *
 * « Les revêtements des circulations seront : sans objet » ne se dépose pas en
 * mairie. « Sans objet » est une réponse — le lecteur l'attend — mais elle
 * s'écrit comme une phrase, pas comme une valeur collée à un deux-points.
 */
const sansObjet = (valeur) => /^sans objet/i.test(String(valeur ?? "").trim());

/**
 * Le classement seul, avant le tiret qui l'explique.
 *
 * « M2 — parois verticales, rampant et plafonds » porte deux choses : la
 * classe, et ce à quoi elle s'applique. Quand la phrase dit déjà à quoi elle
 * s'applique, répéter la seconde moitié la rend illisible.
 */
const premierMot = (valeur) => String(valeur ?? "").split(" — ")[0].trim();

/**
 * La notice, rédigée pour ce cas-là.
 *
 * @param {object} vue la consultation — ses `faits` sont la matière
 * @param {object} complements ce que l'utilisateur a ajouté, par clé de paragraphe
 */
export function redigerLaNotice(vue, complements = {}) {
  const faits = vue?.faits ?? {};
  const sections = [];
  let numero = 0;

  const ecrire = (paragraphe) => {
    // Un paragraphe qui ne sait rien ne s'écrit pas : une notice qui affirme
    // sans savoir est pire qu'une notice incomplète.
    const manquants = (paragraphe.faits ?? []).filter((cle) => faits[cle] === undefined || faits[cle] === null);
    if (manquants.length) return null;
    const complement = complements[paragraphe.cle] ?? {};
    let texte;
    try {
      texte = paragraphe.phrase(faits, complement);
    } catch {
      return null;
    }
    return {
      cle: paragraphe.cle,
      texte: String(texte ?? "").trim(),
      champ: paragraphe.champ ?? null,
      valeurs: Object.fromEntries((paragraphe.faits ?? []).map((cle) => [cle, faits[cle]]))
    };
  };

  for (const section of TRAME) {
    const sousSections = [];
    if (section.sousSections) {
      for (const sous of section.sousSections) {
        const paragraphes = sous.paragraphes.map(ecrire).filter(Boolean);
        if (paragraphes.length) sousSections.push({ titre: sous.titre, paragraphes });
      }
    }
    const directs = (section.paragraphes ?? []).map(ecrire).filter(Boolean);
    if (!directs.length && !sousSections.length) continue;
    numero += 1;
    sections.push({ cle: section.cle, numero, titre: section.titre, paragraphes: directs, sousSections });
  }

  return { version: vue?.version ?? null, sections, rubriques: rubriquesDe() };
}

/** Toutes les rubriques de la trame : de quoi charger les fréquences en un appel. */
export function rubriquesDe() {
  const rubriques = new Set();
  const parcourir = (paragraphes = []) => {
    for (const p of paragraphes) if (p.champ) rubriques.add(p.champ.rubrique);
  };
  for (const section of TRAME) {
    parcourir(section.paragraphes);
    for (const sous of section.sousSections ?? []) parcourir(sous.paragraphes);
  }
  return [...rubriques];
}

/**
 * La notice en texte, pour le presse-papier.
 *
 * Ce qui part dans Word doit se relire tel quel : des titres numérotés, des
 * paragraphes, rien d'autre. Le markdown n'y survivrait pas au collage.
 */
export function noticeEnTexte(notice, entete = {}) {
  const lignes = ["NOTICE DESCRIPTIVE DE SÉCURITÉ", "Pour les bâtiments d'habitation (arrêté du 31 janvier 1986)", ""];

  for (const [libelle, valeur] of CHAMPS_ENTETE) {
    if (entete[libelle]) lignes.push(`${valeur} :`, entete[libelle], "");
  }

  for (const section of notice.sections) {
    lignes.push(`${section.numero}. ${section.titre.toUpperCase()}`);
    for (const p of section.paragraphes) lignes.push(p.texte);
    section.sousSections.forEach((sous, i) => {
      lignes.push("", `${section.numero}.${i + 1} ${sous.titre}`);
      for (const p of sous.paragraphes) lignes.push(p.texte);
    });
    lignes.push("");
  }
  return lignes.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** L'en-tête administratif, dans l'ordre où la notice le présente. */
export const CHAMPS_ENTETE = [
  ["denomination", "Dénomination du projet"],
  ["adresse", "Adresse principale"],
  ["maitriseOuvrage", "Maîtrise d'ouvrage (nom ou raison sociale)"],
  ["maitriseOeuvre", "Maîtrise d'œuvre (nom ou raison sociale de l'architecte)"],
  ["controle", "Organisme de contrôle et missions confiées"],
  ["contact", "Personne à contacter"]
];
