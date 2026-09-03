/**
 * Le texte de l'arrêté, article par article — et ce que SOCOTEC en commente.
 *
 * ## Pourquoi le texte entier, et pas seulement la phrase qui décide
 *
 * Un module rend la phrase sur laquelle il s'est appuyé : c'est ce qu'il faut
 * pour défendre un résultat. Mais celui qui **répond** aux questions n'est pas
 * dans la même situation : on lui demande si les parois verticales de
 * l'enveloppe du logement sont prolongées jusqu'à la couverture, et il n'a
 * aucun moyen de savoir ce que l'arrêté entend par là. Une question dont
 * l'énoncé laisse deux lectures possibles produit deux réponses différentes
 * pour le même bâtiment, et tout le reste du raisonnement est faux sans que
 * rien ne le signale.
 *
 * L'article entier lève l'ambiguïté, parce qu'il porte son contexte : les
 * exceptions qui suivent l'alinéa, l'alinéa d'avant qui définit le mot, la
 * précision entre parenthèses. Le commentaire SOCOTEC, quand il existe, dit
 * l'usage — et l'usage est souvent la seule chose qui tranche.
 *
 * ## Ce que ce fichier n'est pas
 *
 * Il ne contient aucune règle. C'est du texte : ce qui décide reste dans les
 * modules, et n'en sort pas. Ouvrir l'arrêté sous la question ne dit pas
 * comment on s'en sert.
 *
 * ## D'où il vient
 *
 * Du fascicule SOCOTEC « Sécurité incendie en habitation », dépouillé
 * mécaniquement : l'appareil du fascicule — renvois de bibliothèque, appels de
 * figure, en-têtes de page — a été retiré, les paragraphes recollés, et les
 * glyphes que le PDF encode hors table rétablis. Un test vérifie que chaque
 * citation portée par un module se retrouve mot pour mot dans son article :
 * c'est ce qui garantit que le dépouillement n'a pas dérivé du texte.
 */

export const ARTICLES = {
  "1er": {
    texte: `Les dispositions du présent arrêté s’appliquent :

- aux bâtiments d’habitation y compris les logements-foyers dont le plancher bas du logement le plus haut est situé au plus à 50 m au-dessus du sol utilement accessible aux engins des services de secours et de lutte contre l’incendie ;

- aux parcs de stationnement couverts annexes des bâtiments ci-dessus, ayant une surface de plus de 100 mètres carrés, et destinés principalement dans leur conception et leur organisation, à l’usage de leurs résidents. En sont néanmoins exclus les parcs de stationnement couverts annexes des bâtiments ci-dessus, disposant de plus de dix places utilisées pour une durée inférieure à 30 jours consécutifs par des personnes non résidentes du bâtiment Les règles particulières concernant les immeubles d’habitation dont le plancher bas du logement le plus haut est situé à plus de 50 m au-dessus du sol font l’objet des articles R.122-1 à R 122-29 du Code de la construction et de l’habitation et de l’arrêté portant règlement de sécurité pour la construction des immeubles de grande hauteur et leur protection contre les risques d’incendie et de panique.`,
    commentaire: `Le 3ème alinéa de l’article 1er vise à limiter la généralisation de l’usage de courte durée des places des parcs de stationnement des immeubles d’habitation par des applications numériques dédiées. Le commentaire de l’administration publié en liminaire de l’arrêté précise « Sont exclus de ce décompte les emplacements utilisés par des résidents de l’immeuble en tant qu’accessoire d’un logement dans la mesure où les usagers se trouvent alors dans une situation distincte, à vocation essentiellement résidentielle, même de courte durée. » Ce commentaire confirme par exemple de conserver le classement habitation des parcs de stationnement des résidences de tourisme classée en habitation. Les IGH sont assujettis à l’arrêté du 30 décembre 2011 Par ailleurs, on se référera à l’article 3, § 4 ci-après, relatif à la 4ème famille.`
  },
  "2": {
    texte: `La classification des matériaux et des éléments de construction utilisés pour l’édification des bâtiments d’habitation par rapport au danger d’incendie est précisée par les arrêtés pris en application de l’article R.121-5 du Code de la construction et de l’habitation.`,
    commentaire: `Les arrêtés pris en application de l’article R.121-5 du Code de la construction et de l’habitation sont :

- Arrêté du 21 novembre 2002 relatif à la réaction au feu des produits de construction et d'aménagement,

- Arrêté du 22 mars 2004 relatif à la résistance au feu des produits, éléments de construction et d'ouvrages,

- Arrêté du 14 février 2003 relatif à la performance des toitures et couvertures de toiture exposées à un incendie extérieur.

Vérification Technique`
  },
  "3": {
    texte: `Les bâtiments d’habitation sont classés comme suit du point de vue de la sécurité incendie :

1°) Première famille :

- habitations individuelles isolées ou jumelées à un étage sur rez-de-chaussée, au plus ;

- habitations individuelles à rez-de-chaussée groupées en bande. Toutefois, sont également classées en première famille les habitations individuelles à un étage sur rez-de-chaussée, groupées en bande, lorsque les structures de chaque habitation concourant à la stabilité du bâtiment sont indépendantes de celles de l’habitation contiguë.

Sur ce dernier point, le CSTB a transmis au président du Syndicat des matières plastiques une lettre du 24 octobre 1984, dont le signataire est Joseph Mathez, qui précise le domaine d’emploi des entrevous en polystyrène expansé M1 dans le cadre du Guide d’emploi des isolants :

« ... la première famille d’habitation visée par l’avis du Cecmi doit être entendue au sens du nouveau règlement de sécurité dans les bâtiments d’habitation, c’est-à-dire que les maisons en bande à deux niveaux habitables, dont les structures sont indépendantes, y sont incluses. « En outre, il y a lieu de considérer qu’il s’agit d’une indépendance de fait, c’est-à-dire sans qu’il soit nécessaire de prévoir un joint de dilatation si la ruine d’une maison n’est pas susceptible de mettre en cause la stabilité des maisons voisines. »

2°) Deuxième famille :

- habitations individuelles isolées ou jumelées de plus d’un étage sur rez-de-chaussée ;

- habitations individuelles à un étage sur rez-de-chaussée seulement, groupées en bande, lorsque les structures de chaque habitation concourant à la stabilité du bâtiment ne sont pas indépendantes des structures de l’habitation contiguë ;

- habitations individuelles de plus d’un étage sur rez-de-chaussée groupées en bande ;

- habitations collectives comportant au plus trois étages sur rez-de-chaussée.

Pour l’application des 1°) et 2°) ci-dessus :

- sont considérés comme maisons individuelles au sens du présent arrêté les bâtiments d’habitation ne comportant pas de logements superposés ;

- les escaliers des bâtiments d’habitation collectifs de trois étages sur rez-de-chaussée dont le plancher bas du logement le plus haut est à plus de 8 m du sol doivent être encloisonnés sauf s’ils sont extérieurs tels que définis à l’article 29 bis.

3°) Troisième famille Habitations dont le plancher bas du logement le plus haut est situé à 28 m au plus du sol utilement accessible aux engins des services de secours et de lutte contre l’incendie, parmi lesquelles on distingue : Troisième famille A : habitations répondant à l’ensemble des prescriptions suivantes :

- comporter au plus sept étages sur rez-de-chaussée ;

- comporter des circulations horizontales telles que la distance entre la porte palière de logement la plus éloignée et l’accès de l’escalier soit au plus égale à 10 m ;

- être implantées de telle sorte qu’au rez-de-chaussée les accès aux escaliers soient atteints par la voie-échelles définie à l’article 4 ci-après.

QUESTIONS/REPONSES – MINISTERE CHARGE DU LOGEMENT, 23 NOVEMBRE 2007 (PUBLICATION 2016) Dans les bâtiments de la 3 ème famille A, quelle est la distance à respecter au rez-de-chaussée entre :

- la porte d’accès à l’escalier et la sortie du hall desservant les niveaux d’habitation,

- la porte palière des logements aux rez-de-chaussée et à l’extérieur Au rez-de-chaussée, la distance maximale à parcourir ne doit pas excéder :

- 20 m entre le débouché bas de l’escalier et l’extérieur,

- 20 m entre la porte palière de logement la plus éloignée et l’extérieur. Toutefois, aucune distance n’est imposée entre la porte palière du logement la plus éloignée et l’extérieur si tous les logements disposent d’un accès depuis l’extérieur (portes ou porte-fenêtres). Peut-on autoriser des logements en triplex ou plus, au dernier étage des bâtiments d’habitation des 2ème et 3ème famille

Les triplex aménagés dans les bâtiments d’habitation de la 2ème famille, 3ème Famille A & B sont autorisés si les conditions suivantes sont respectées :

- L’accès au logement par les services de secours se fait en partie basse du triplex ;

- La partie basse doit disposer d’au moins une pièce principale ;

- Tous les niveaux du triplex disposent d’au moins une baie accessible par l’extérieur au moyen des échelles ;

- La stabilité au feu des structures est de 1h. Cette tolérance n’est pas admise pour les quadruplex et plus.

4°) Quatrième famille : (arrêté du 7 août 2019) Habitations dont le plancher bas du niveau le plus haut est situé à 50 m au plus au dessus du niveau du sol utilement accessible aux engins des services publics de secours et de lutte contre l’incendie, et qui ne relèvent pas des trois autres familles d’habitation.

5°) Duplex et triplex. Pour le classement des bâtiments des trois premières familles, seul le niveau bas des duplex ou des triplex des logements situés à l’étage le plus élevé est pris en compte si ces logements disposent d’une pièce principale et d’une porte palière en partie basse et que les planchers des différents niveaux constituant ces logements répondent aux caractéristiques de l’article 6. Les quadruplex et plus ne sont pas admis dans les bâtiments d’habitation collectifs.

QUESTIONS/REPONSES - MINISTERE DE L’EQUIPEMENT, 14 AVRIL 1987 Quelles sont les conditions d’accès aux immeubles des première et 2ème familles

Aucune prescription particulière n’est imposée. Les locaux visés à l’article 3, 4°), 2, premier tiret peuvent-ils occuper une partie de plusieurs ou même de tous les niveaux des bâtiments de 4ème famille

Les locaux visés peuvent exister dans plusieurs niveaux d’un même bâtiment. La voie visée à l’article 3, 4°), 3, 2ème tiret est-elle une voie-engins ou une voie-échelle

La voie visée est une voie-engins. Comment doit-on traiter les circulations horizontales de 3ème famille A

Il n’est pas demandé de traiter les circulations horizontales de 3ème famille A en circulations horizontales protégées. Dans un but d’unité au plan départemental, voire national, doit-on orienter plutôt la décision des maires vers un classement de 3ème famille B en 3ème famille A ou non

Les conditions exigées par le texte pour un éventuel « déclassement » d’un bâtiment de 3ème famille B en 3ème famille A sont suffisamment précises pour que le maire puisse prendre un arrêté municipal en parfaite connaissance de cause. Les services spécialisés qui seraient consultés par les élus locaux doivent s’attacher à vérifier que chaque logement est d’accès facile par les échelles, directement ou par un parcours sûr. De plus, la lettre n° 51 du 10 février 1988, du MELATT, dont le signataire est J.-P. Bardy, précise que la décision du déclassement des immeubles d’habitation de 3ème famille B en 3ème famille A relève des autorités locales et non du ministère : « L’article 3 de l’arrêté susvisé prévoit la possibilité, par arrêté municipal, d’assujettir un bâtiment classé en 3ème famille B aux seules dispositions propres aux bâtiments de la 3ème famille A, sous réserve que le bâtiment se situe dans le secteur d’intervention d’échelles de hauteur suffisante. « Il ne serait pas judicieux d’imposer au plan national un périmètre par rapport au centre de secours à l’intérieur duquel le bâtiment à « déclasser » doive impérativement être implanté. « Les autorités locales (municipalité, service de secours, DDE) sont en mesure d’appréhender l’ensemble des paramètres, et donc les mieux placées pour instruire les demandes de « déclassement » d’un bâtiment de 3ème famille B en 3ème famille A, dans les limites imposées par le texte réglementaire ». A cette réponse est associée une lettre du 6 décembre 1989 du ministère de l’Équipement, du Logement, des Transports et de la Mer, dont le signataire est également J.-P. Bardy, qui précise certaines dispositions qu’il convient d’appliquer dans le cas d’un déclassement de 3ème famille B en 3ème famille A, notamment en ce qui concerne les distances admises entre les portes palières d’appartements et l’escalier le plus proche :

« ... Il paraît indispensable de rappeler la définition de classement en 3ème famille des bâtiments d’habitation : habitation dont le plancher bas du logement le plus haut est situé à 28 m au plus au-dessus du sol utilement accessible aux engins des services de secours. -3ème famille A : habitations répondant à l’ensemble des conditions suivantes : . comporter au plus sept étages sur rez-de-chaussée ; . comporter des circulations horizontales telles que la distance entre la porte palière du logement la plus éloignée et l’accès de l’escalier soit au plus égale à 7 m ; . être implantées de telle sorte qu’au rez-de-chaussée les accès aux escaliers soient atteints par la voie-échelles. -3ème famille B : habitations dont l’une des conditions de classement en 3ème famille A n’est pas satisfaite. Ces habitations doivent être implantées de telle sorte que les accès aux escaliers soient situés à moins de 50 m d’une voie ouverte à la circulation.

- Déclassement de 3ème famille B en 3ème famille A : dans les communes dont les services de secours et de lutte contre l’incendie sont dotés d’échelles aériennes de hauteur suffisante, le maire peut décider que les bâtiments classés en 3ème famille B, situés dans le secteur d’intervention desdites échelles, peuvent être soumis aux seules prescriptions fixées pour les bâtiments classés en 3ème famille A : . chaque logement doit pouvoir être atteint soit directement, soit par un parcours sûr ; . les bâtiments comportant plus de sept étages sur rez-de-chaussée doivent être équipés de colonnes sèches. « Par ailleurs, le texte ne précise pas de distance réglementaire entre la porte palière et l’escalier de secours dans le cas d’un déclassement. « Mais, par analogie avec ce qui est imposé en 3ème famille B où est prévu un désenfumage des circulations, il semble normal que la distance entre la porte palière du logement le plus éloigné et l’accès de l’escalier n’excède pas 15 m ».

QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 1ER JUILLET 1988 Bien souvent, en raison des dénivelées importantes rencontrées dans les départements montagneux, des bâtiments disposent d’un nombre de niveaux différents sur deux façades opposées, par exemple R + 3 en façade est et R + 3 – 3 en façade ouest :

a) Comment peuvent être classés ces immeubles ?

b) Peut-il être admis que des logements situés en dessous du niveau d’accès soient desservis par un escalier qui oblige de remonter au niveau du rez-de-chaussée ?

c) Cet escalier doit-il être séparé de celui desservant les étages et, dans ce cas, est-ce que les dispositions concernant le désenfumage lui sont applicables

Il est difficile de répondre d’une manière générale et systématique au problème du classement d’un bâtiment implanté sur un terrain à forte pente. Le classement par famille prévu par l’arrêté du 31 janvier 1986 a été élaboré selon le schéma classique d’implantation sur un terrain naturel non accidenté. Dans un environnement particulier, chaque construction est un cas d’espèce qui mérite d’être analysé en tant que tel. Mais, afin d’apporter quelque clarification en la matière, l’exemple choisi peut être repris et complété :

- description de l’opération : un bâtiment disposant d’un seul accès sur une seule façade constituée de trois étages sur rez-de-chaussée avec une façade opposée de sept niveaux (– 3, rez-de-chaussée, + 3) ;

- raisonnement et analyse du risque : la difficulté et le délai d’évacuation des occupants ont été les critères de base pour le classement des bâtiments en familles dans l’arrêté du 31 janvier 1986. Dans le cas présent, les paramètres aggravants sont les suivants :

- les services de secours n’ont aucune possibilité d’intervention par l’extérieur du bâtiment pour les niveaux inférieurs ;

- quel que soit le niveau inférieur sinistré, l’enfumage éventuel de la cage d’escalier obligerait l’ensemble des occupants à traverser les fumées pour évacuer. Par contre, les occupants du bâtiment ont au maximum trois niveaux à parcourir pour évacuer, comme dans le cas des bâtiments de 2ème famille. Prescriptions :

- afin d’éviter l’enfumage général de la cage d’escalier, l’escalier desservant les niveaux supérieurs ne doit pas communiquer avec l’escalier desservant les niveaux inférieurs ;

- afin de permettre une évacuation aisée des occupants des niveaux inférieurs, les dégagements de ces mêmes niveaux (horizontaux et verticaux) doivent être désenfumés ;

- les mesures particulières visées ci-dessus s’ajoutent aux prescriptions relatives aux bâtiments de 2ème famille. Il ne serait pas raisonnable d’extrapoler ces résultats à des cas a priori similaires. Les exigences mentionnées ci-dessus ne sauraient être interprétées comme une « recette » applicable systématiquement.

QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT Dans un bâtiment collectif de 2ème famille, peut-on utiliser des dispositifs extérieurs fixes permettant de rabaisser artificiellement le plancher bas du dernier niveau à une hauteur au plus égale à 8 m

L’utilisation de dispositifs extérieurs fixes est à exclure. Le risque de voir se multiplier des dispositifs peu fiables dans le temps est très grand.`,
    commentaire: `Ces questions réponses validées en 2007 n’avaient pas été officiellement diffusées, en prévision de la parution d’un nouvel arrêté habitation. Ces éléments n’ayant pas été pris en compte dans la rédaction de l’arrêté 19 juin 2015, ces questions réponses ont été mises en ligne sur le site du ministère postérieurement à la parution de l’arrêté.

A noter que le 5° de l’article 3, introduit par la parution de l’arrêté du 19 juin 2015, interdit les quadruplex (et plus) dans les bâtiments d’habitation collectifs. Ce point n’est pas indiqué clairement dans la question/réponse, dont la rédaction peut prêter à confusion. Troisième famille B : habitations ne satisfaisant pas à l’une des conditions précédentes. Ces habitations doivent être implantées de telle sorte que les accès aux escaliers soient situés à moins de 50 m d’une voie ouverte à la circulation répondant aux caractéristiques définies à l’article 4 ci-après (voie-engins). Toutefois, dans les communes dont les services de secours et de lutte contre l’incendie sont dotés d’échelles aériennes de hauteur suffisante, le maire peut décider que les bâtiments classés en 3ème famille B, situés dans le secteur d’intervention desdites échelles, peuvent être soumis aux seules prescriptions fixées pour les bâtiments classés en 3ème famille A. Dans ce cas, la hauteur du plancher bas du logement le plus haut du bâtiment projeté doit correspondre à la hauteur susceptible d’être atteinte par les échelles, et chaque logement doit pouvoir être atteint soit directement, soit par un parcours sûr. De plus, les bâtiments comportant plus de sept étages sur rez-de-chaussée doivent être équipés de colonnes sèches conformément aux dispositions de l’article 98.

Cette nouvelle définition (arrêté du6 août 2019) des immeubles de 4 ème famille interdit désormais le classement en habitation des bâtiments comportant un duplex en partie haute, dont le plancher bas serait situé à 50 m au plus , mais dont le niveau haut dépasserait cette hauteur de 50 m. Cette définition est maintenant en accord avec les termes de l’article R 122-2 du CCH établissant la définition d’un IGH. Le commentaire officiel du ministère attaché à l’arrêté précise parmi les objectifs du texte « de supprimer la possibilité contraire à la hiérarchie des normes de construire un duplex dont le plancher bas le plus haut est à plus de 50 m. » A noter que la définition des habitations de 4 ème famille est maintenue parallèlement à celle des IMH à l’article R 122-30 du CCH. Des projets de bâtiments d’habitation comportent au dernier niveau une terrasse accessibles aux habitants de

l’immeuble et peuvent recevoir des activités diverses telles par exemple des potagers urbains. La préfecture de police de Paris a publié un « guide de préconisation relatif aux dispositions prévues pour l’aménagement des toitures terrasses ». Ce guide précise en habitation « qu’une toiture terrasse ne constitue pas un niveau au sens de la réglementation incendie, dès lors qu’elle ne comporte pas de volume clos, autres que des serres sans étage à usage agricole, ou des locaux de rangement destinés au seul usage agricole, ou des locaux techniques, édicules , ascenseurs … de ce fait ,l’aménagement d’une toiture terrasse telle que visée au §1 , sur une construction n’entraine pas la modification du classement du bâtiment, même si le plancher de la toiture terrasse est situé à plus de 28 m du niveau d’accès des secours. Ces habitations doivent être implantées de telle sorte que les accès aux escaliers protégés prévus aux articles 26 à 29 ci-après soient situés à moins de 50 m d’une voie ouverte à la circulation répondant aux caractéristiques définies à l’article 4 ci-après (voie-engins).

Lorsqu’un immeuble de la 4ème famille doit contenir des locaux à usage autre que d’habitation, dans des conditions non prévues par l’article R.111-1 du Code de la construction et de l’habitation, cet immeuble doit être rangé dans la catégorie des immeubles de grande hauteur. Toutefois, le bâtiment demeure en 4ème famille lorsque les locaux contenus répondent à l’une des conditions suivantes : 1. Les locaux affectés à une activité professionnelle font partie du même ensemble de pièces que celles où se déroule la vie familiale ; 2. Les locaux affectés à une activité professionnelle, de bureaux ou constituant un établissement recevant du public et dépendant d’une même personne physique ou morale :

- forment un seul ensemble de locaux contigus d’une surface de 200 m² au plus, pouvant accueillir 20 personnes au plus à un même niveau ;

- sont isolés des autres parties du bâtiment par des parois coupe-feu de degré 1 heure et des blocs-portes pare-flammes de degré 1/2 heure ;

3. Les locaux affectés à des activités professionnelles, de bureaux ou constituant des établissements recevant du public de 5ème catégorie répondent à l’ensemble des conditions suivantes :

- le plancher bas du niveau le plus haut occupé par ces locaux est toujours situé à 8 m au plus au-dessus du niveau du sol extérieur accessible aux piétons ;

- chaque niveau occupé par ces locaux a au moins une façade en bordure d’une voie répondant aux caractéristiques définies à l’article 4 ci-après ;

- ces locaux et leurs dégagements sont isolés de la partie du bâtiment réservée à l’habitation par des parois coupe-feu de degré 2 heures sans aucune intercommunication ; 4. De même, l’aménagement d’un établissement recevant du public du type N sur les deux niveaux les plus élevés d’un immeuble à usage d’habitation de moins de 50 m de hauteur, au sens de l’article R.122-2 du Code de la construction et de l’habitation, n’a pas pour effet de classer cet immeuble dans la classe GHZ, si l’établissement considéré ne communique pas directement avec le reste de l’immeuble, est desservi par au moins deux escaliers protégés de deux unités de passage et ne peut recevoir plus de 500 personnes. Il s’agit de dispositifs tels que des plots en béton, des bacs à fleurs ou des parterres de fleurs permettant de rabaisser artificiellement le plancher bas du dernier niveau à une hauteur au plus égale à 8 m.`
  },
  "4": {
    texte: `(Arrêté du 18 août 1986) Pour l’application de l’article 3 ci-avant, les voies d’accès sont définies comme suit : A. Voie utilisable par les engins des services de secours et de lutte contre l’incendie (voie-engins) La voie-engins est une voie dont la chaussée répond aux caractéristiques suivantes quel que soit le sens de la circulation suivant lequel elle est abordée à partir de la voie publique :

- largeur : 3 m, bandes réservées au stationnement exclues ;

- force portante calculée pour un véhicule de 130 kN (dont 40 kN sur l’essieu avant et 90 kN sur l’essieu arrière, ceux-ci étant distants de 4,50 m) ;

- rayon intérieur minimum R : 11 m ;

- surlargeur S = 15/R dans les virages de rayon inférieur à 50 m (S et R étant exprimés en m) ;

- hauteur libre autorisant le passage d’un véhicule de 3,30 m de hauteur majorée d’une marge de sécurité de 0,20 m ;

- pente inférieure à 15 %. B. Voie utilisable pour la mise en station des échelles (voie-échelles), et La voie-échelles est une partie de la voie-engins dont les caractéristiques sont complétées et modifiées comme suit :

- la longueur minimale est de 10 m ;

- la largeur, bandes réservées au stationnement exclues, est portée à 4 m ;

- la pente maximum est ramenée à 10 % ;

- la résistance au poinçonnement est fixée à 100 kN sur une surface circulaire de 0,20 m de diamètre ;

- si cette section de voie n’est pas sur la voie publique, elle doit lui être raccordée par une voie utilisable par les engins de secours (voie-engins).

Les voies-échelles peuvent soit être parallèles, soit perpendiculaires à la façade desservie. Voies parallèles : leur bord le plus proche doit être à moins de8met à plus de1mde la projection horizontale de la partie la plus saillante de la façade pour l’emploi des échelles de 30 m. La distance est réduite à 6 m pour les échelles de 24 m et à 3 m pour les échelles de 18 m. Voies perpendiculaires : leur extrémité doit être à moins de 1 m de la façade et elles doivent avoir une longueur minimale de 10 m.

(Arrêté du 18 août 1986) En outre, dans le cas où le maire décide que les bâtiments classés en 3ème famille B peuvent être soumis aux seules prescriptions fixées pour les bâtiments classés en 3ème famille A (conformément au 3ème alinéa du 3° de l’article 3), ne sont considérés comme accessibles que les logements dont un point d’accès (bord de la fenêtre ou du châssis)est situé, en projection horizontale, à moins de 6 m du bord de la voie pour l’emploi des échelles de 30 m. Cette

distance est réduite à 2 m pour les échelles de 24 m et nulle pour les échelles de 18 m. Toutefois, sont également considérés comme accessibles les logements dont le point d’accès, bien que situé au-delà des distances fixées ci-dessus, permet néanmoins de les atteindre par un parcours sûr (balcon filant, passerelle, terrasse).`,
    commentaire: `1. Il est bon de rappeler que l’article R.111-4 du Code de l’urbanisme stipule que les problèmes rencontrés pour les accès des engins de lutte contre l’incendie peuvent être un motif de refus du permis de construire. 2. Bien que l’illustration de la voie-engins montre le seul cas d’une surlargeur en partie extérieure du rayon de giration, cette surlargeur peut être également envisagée sur la partie intérieure du virage.

ARRETE DU 31 JANVIER 1986 RELATIF AUX BATIMENTS D’HABITATION

- Date de diffusion : 7 août 2015`
  },
  "5": {
    texte: `Les éléments porteurs verticaux des habitations doivent présenter les degrés de stabilité au feu ci-après :

- habitations de la première famille : 1/4 heure ;

- habitations de la 2ème famille : 1/2 heure ;

- habitations de la 3ème famille : 1 heure ;

- habitations de la 4ème famille : 1 heure 30. (Arrêté du 18 août 1986) Les éléments porteurs verticaux situés en façade ou en pignon des bâtiments doivent présenter ces degrés de stabilité uniquement vis-à-vis d’un feu se développant

depuis l’intérieur du bâtiment dans les conditions d’un essai prévu par les arrêtés pris en application de l’article R.121-5 du Code de la construction et de l’habitation. Dans les bâtiments d’habitation collectifs de la deuxième, de la troisième et de la quatrième famille, les éléments porteurs verticaux des balcons à structures indépendantes, des coursives, passerelles extérieures et circulations à l’air libre sont stables au feu une demi-heure ou de classement R 30. Cette résistance au feu peut également être justifiée à partir des actions thermiques aux structures extérieures déterminées selon la méthode de la norme NF EN1991-1-2 et de son annexe nationale. Les dispositions de cet article ne s’appliquent pas aux éléments de charpente des toitures.`,
    commentaire: `Les arrêtés pris en application de l’article R.121-5 du Code de la construction et de l’habitation sont :

- Arrêté du 21 novembre 2002 relatif à la réaction au feu des produits de construction et d'aménagement,

- Arrêté du 22 mars 2004 relatif à la résistance au feu des produits, éléments de construction et d'ouvrages,

- Arrêté du 14 février 2003 relatif à la performance des toitures et couvertures de toiture exposées à un incendie extérieur.`
  },
  "6": {
    texte: `Les planchers, à l’exclusion de ceux établis à l’intérieur d’un même logement, doivent présenter les degrés coupe-feu ci-après :

- habitations de la première famille : 1/4 heure pour le plancher haut du sous-sol ;

- habitations de la 2ème famille : 1/2 heure ;

- habitations de la 3ème famille : 1 heure ;

- habitations de la 4ème famille : 1 heure 30. Cette prescription ne s’applique pas :

- aux planchers situés au-dessus d’un vide sanitaire non accessible ;

- (Arrêté du 18 août 1986) aux planchers hauts, aux faux planchers ou plafonds du dernier niveau habitable lorsque les parois verticales de l’enveloppe des logements, visées à l’article 8 ci-après, sont prolongées jusqu’à la couverture du bâtiment. Les planchers des coursives, passerelles extérieures et circulations à l’air libre, reliant les logements aux escaliers ou permettant de quitter l’immeuble, présentent les degrés de résistance au feu ou classement ci-après :

- bâtiments d’habitation de la première famille : pare-flammes un quart d’heure ou RE 15 ;

- bâtiments d’habitation de la deuxième, de la troisième et de la quatrième famille : pare-flammes une demi-heure ou RE 30. Cette résistance au feu peut également être justifiée à partir des actions thermiques aux structures extérieures déterminées selon la méthode de la norme NF EN1991-1-2 et de son annexe nationale.

On se reportera au commentaire de l’article U 24 relatif au comportement au feu des jonctions cloison/plafond réalisées en plaques de plâtre ou plaques silico-calcaires.

Mise en garde : La solution préconisée doit être étudiée avec précaution pour les bâtiments dont les exigences de résistance au feu des cloisons diffèrent de celles des planchers. Exemple : lors de la réalisation d’habitations de 3ème et 4ème famille, la différence d’exigence du degré de résistance au feu des planchers (1 h en 3éme famille et 1 ½ h en 4éme famille) par rapport aux parois des logements (½ h et 1 h) implique de réaliser des cloisons de degré coupe feu double de celui des plafonds, soit par exemple 2 h au lieu de 1 h en 3ème famille.

QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 25 JUIN 1990 Faut-il une protection résistant au feu pour les conduits métalliques situés en comble et faut-il un clapet au droit de la paroi de recoupement du comble (coupe-feu de degré 1/2 heure), si l’on tient compte que :

- les plafonds des logements sont le plus souvent coupe-feu (plaque de plâtre cartonnée avec isolant thermique à base minérale) ;

- les conduits horizontaux de VMC (traînasses) sont le plus souvent en acier galvanisé, mais peuvent être en aluminium ou exceptionnellement en acier inoxydable (VMC-gaz à condensation) ;

- le principe de sécurité pour la VMC le plus souvent retenu est le ventilateur maintenu en fonctionnement (de catégorie adaptée au taux de dilution), en 2ème et 3ème familles des bâtiments d’habitation

L’arrêté du 31 janvier 1986 relatif à la protection contre l’incendie des bâtiments d’habitation ne précise aucune exigence sur les traînasses horizontales dans les combles. Il est nécessaire de distinguer les combles continus sur plusieurs logements (dans ce cas, les plafonds de ces logements possèdent des caractéristiques de résistance au feu) et les combles qui sont recoupés au droit de chaque logement (dans ce cas, les parois verticales de ces logements sont prolongées jusqu’à la couverture). En cas de comble continu, compte tenu de la résistance au feu du plafond, des gaines de VMC et de la faible température pouvant être atteinte dans ces conduits en cas d’incendie, le risque de transmission du feu par la gaine est minime. Il convient néanmoins de s’assurer que l’écart de feu entre ces gaines et les fermettes formant la charpente du bâtiment est respecté.

CAS DES COMBLES CONTINUS SUR PLUSIEURS LOGEMENTS En cas de combles recoupés au droit de chaque logement, la propagation du feu d’un logement à l’autre ne semble pouvoir se faire que par le passage de la VMC à travers la paroi séparative. Là encore le risque semble faible, mais il convient de limiter au maximum le diamètre de passage. En cas de paroi séparative sous comble formant le recoupement obligatoire des « 45 m », défini à l’article 7 de l’arrêté du 31 janvier 1986, une installation judicieuse des ventilateurs peut éviter le passage du conduit à travers cette paroi : c’est la solution à préconiser.

CAS DE LA PAROI SEPARATIVE SOUS COMBLE

QUESTION/REPONSE - MINISTERE DE L’INTERIEUR, 31 JUILLET 1991 Compte tenu des divergences qui existent entre l’article 2.1 du Guide de l’isolation par l’intérieur des bâtiments d’habitation du point de vue des risques en cas d’incendie et les avis émis récemment par rapport au danger d’incendie (Cecmi) concernant les limites de mise en œuvre en apparent, en plafonds des sous-sols, des entrevous et plaques de polystyrène expansé ignifugé classé M1, peut-on employer du polystyrène expansé ignifugé de classe M1 en plafond des sous-sols des bâtiments d’habitation des première et 2ème familles

Désormais les entrevous et plaques de polystyrène expansé ignifugé classé M1 peuvent rester apparents en plafond des sous-sols des première et 2ème familles, y compris pour la 2ème famille collective : Le Cecmi avait émis un avis favorable, le 20 juin 1984, à l’utilisation apparente en plafond des sous-sols des maisons individuelles de première famille des entrevous et plaques de polystyrène expansé ignifugé (classés M1) ; le CSTB avait publié le premier modificatif, correspondant à cet avis, dans le Cahier n° 2118.

Le Cecmi a ensuite, sur proposition du CSTB, émis l’avis, le 18 avril 1986, d’étendre cette utilisation aux plafonds des sous-sols des premier et 2ème familles d’habitation, le ministère de l’Équipement étant favorable à cette extension. Le Cecmi avait donc demandé au CSTB, le 18 avril 1986, de modifier en ce sens le § 2.1 du Guide, mais cette modification n’a malheureusement pas été faite. Il en résulte que le premier modificatif au Guide, publié par le CSTB dans le cahier n° 2118, n’est plus d’actualité. Il s’ensuit que les entrevous et plaques de polystyrène expansé ignifugé (classés M1) peuvent rester apparents en plafond des sous-sols des première et 2ème familles d’habitation. Ce domaine d’utilisation recouvre, bien évidemment, toutes les habitations individuelles et collectives des premières et 2ème familles, telles que décrites exhaustivement dans l’article 3, § 1 et 2, de l’arrêté du 31 janvier 1986 modifié relatif à la protection contre l’incendie dans les bâtiments d’habitation. Une refonte complète du Guide, intégrant ces divers avis et modifications, sera publiée prochainement par le CSTB.

QUESTION/REPONSE - COMMISSION DU REGLEMENT DE CONSTRUCTION, 25 JUIN 1997 Quel degré de résistance ou feu doit-on imposer aux planchers des circulations horizontales à l'air libre

Les planchers des circulations horizontales à l'air libre doivent présenter les degrés coupe-feu requis pour les planchers, indiqués à l'article 6. S'il existe plusieurs cheminements possibles, cette exigence pourra être atténuée en accord avec le service instructeur local.

QUESTION/REPONSE - MINISTERE DE L’INTERIEUR, 06 JUILLET 1999 Peut-on utiliser le procédé d’élément coffrant ENTREVOUS EMS 2000 pour la réalisation de planchers à poutrelles dans les bâtiments d’habitation des 1ère et 2ème familles ? (lettre adressée à M. Jean-Paul PY - SARET France). Par courrier rappelé en référence, vous avez sollicité des précisions sur les possibilités d’emploi d’un nouveau procédé d’élément coffrant (entrevous EMS 2000) pour la réalisation de planchers à poutrelles dans les bâtiments d’habitation de 1ère et 2ème familles définies dans l’arrêté du 31 janvier 1986 modifié. Ainsi que vous l’avez sollicité, j’ai soumis cette question au groupe de travail chargé d’apporter des précisions sur l’application des règles de sécurité incendie dans les bâtiments d’habitation et constitué dans le cadre de la commission du règlement de construction prévue à l’article R.111-16-1 du code de la construction et de l’habitation. Les représentants de l’Association des Industriels des Matériaux Composants et produits de la Construction (AIMCC) ont exposé les caractéristiques de ce produit. A l’examen des dispositions réglementaires contenues dans l’arrêté précité, le groupe de travail a considéré que l’usage d’un tel procédé dans les bâtiments de 1ère et 2ème familles devait respecter les conditions suivantes :

- utilisation pour la réalisation de planchers hauts de vides sanitaires, de planchers hauts de sous-sols de locaux non destinés à un usage d’habitation.

- utilisation pour la réalisation de planchers d’étage courant sous réserve de la mise en œuvre de l’écran protecteur de type plaque de plâtre M2. Je vous précise également que l’arrêté du 31 janvier 1986 modifié n’a pas la vocation de décrire l’ensemble des procédés de construction. Il a pour principal objet celui d’édicter des mesures générales de prévention afin d’éviter la naissance du feu, sa propagation et de faciliter l’évacuation des personnes en cas de sinistre et l’intervention des services de secours. Aussi le caractère innovant de ce procédé m’amène à vous rappeler que la procédure d’avis technique permet de préciser l’aptitude à l’emploi de procédés, matériaux, éléments ou équipements utilisés dans la construction, lorsque leur nouveauté n’en permet pas encore la normalisation. De ce fait, les préconisations du groupe de travail ne préjugent en aucun cas des conclusions qui pourront être formulées dans le cadre d’évaluations techniques similaires.`,
    commentaire: `Suite aux conclusions du Ministère de l’Equipement, il convient de s’assurer de la réalisation des mesures complémentaires suivantes :

- interdire dans le plénum le passage de canalisations de gaz combustibles ;

- ne permettre dans le plénum que le cheminement de canalisations ne présentant pas de danger vis-à-vis du risque d’incendie (eau, chauffage, etc...) ; n’y admettre que des canalisations électriques desservant les niveaux, les logements et leurs circulations, à l’exclusion de toute connexion ;

- conférer aux planchers le degré de résistance au feu requis à l’article 6 de l’arrêté du 31 janvier 1986 ;

- porter une attention particulière à la mise en œuvre des écrans protecteurs (suspentes, rails, etc...) notamment au niveau des percements, de l’aspect jointif des plaques et de leur jointoiement en périphérie des différents volumes.

ARRÊTÉ DU 31 JANVIER 1986 RELATIF AUX BATIMENTS D'HABITATION Version 2 ET ENVELOPPE DES BATIMENTS D'HABITATION 24 juin 2015 Origine : Direction Développement Construction & GPI Auteur : J.P. Henry FD`
  },
  "7": {
    texte: `Les groupements en bande de maisons individuelles et les bâtiments de grande longueur doivent être recoupés au moins tous les 45 m par un mur coupe-feu de degré 1/2 heure pour les habitations de la première famille, de degré 1 heure pour les habitations de la 2ème famille et de degré 1 heure 30 pour celles des 3ème et 4ème familles. Ce mur peut comporter des ouvertures munies d’un bloc-porte avec ferme-porte ou de tout autre dispositif de franchissement, coupe-feu de degré 1 heure pour la 4ème famille, 1/2 heure dans les autres cas. Date de diffusion : 7 août 2015 Fascicule annulé : Version 1 d’avril 1998`
  },
  "8": {
    texte: `Les parois séparatives des habitations individuelles des première et 2ème familles jumelées ou réunies en bande doivent être coupe-feu de degré 1/4 heure. A l’exclusion des façades, les parois verticales de l’enveloppe du logement doivent être :

- coupe-feu de degré 1/2 heure pour les habitations collectives de la 2ème famille et pour les habitations de la 3ème famille ;

- coupe-feu de degré 1 heure pour les habitations de la 4ème famille. Les blocs-portes palières desservant les logements des habitations collectives de la 2ème famille et des habitations de la 3ème famille doivent être pare-flammes de degré 1/4 d’heure, les blocs-portes palières desservant les logements des habitations de la 4ème famille doivent être pare-flammes de degré 1/2 heure.`,
    commentaire: `Ces prescriptions peuvent concerner les celliers individuels d’étage, dans la mesure où ils ne sont pas regroupés (voir article 10 ci après).`
  },
  "9": {
    texte: `Les établissements recevant du public au sens de l’article R.123-2 du Code de la construction et de l’habitation auxquels sont assimilés les locaux collectifs résidentiels de plus de 50 m² établis dans les bâtiments d’habitation collectifs doivent respecter les conditions fixées par le règlement de sécurité contre l’incendie des établissements recevant du public, pris en application de l’article R.123-12 dudit code.`
  },
  "10": {
    texte: `Les ensembles regroupant des celliers ou caves indépendants des logements, aménagés en étage, rez-de-chaussée ou sous-sol, doivent être séparés des autres parties de l’immeuble par des parois coupe-feu de degré 1 heure en 3ème et 4ème familles. Les blocs-portes de ces ensembles doivent être coupe-feu de degré 1/2 heure, ouvrir dans le sens de la sortie en venant des celliers ou des caves, être munis d’un ferme-porte et ouvrables sans clé de l’intérieur. Ils peuvent s’ouvrir :

- sur l’extérieur ou en sous-sol, sur des locaux reliés à l’extérieur à l’exception des parcs de stationnement ;

- sur des circulations horizontales. Ces blocs-portes ne s’ouvrent sur le parc de stationnement que s’il existe un autre accès tel que défini ci-dessus et si cet accès sur le parc se fait par l’intermédiaire d’un sas. Ils ne peuvent pas s’ouvrir sur les escaliers encloisonnés desservant les logements des bâtiments collectifs. Le trajet à parcourir entre la porte du cellier ou de la cave la plus éloignée et la porte de sortie de l’ensemble doit être au plus égal à 20 m. Les celliers ou caves et leurs circulations ne doivent pas comporter d’aération donnant sur les autres circulations de l’immeuble. Les ensembles doivent être recoupés en autant de volumes qu’il y a de cages d’escalier les desservant, par des parois coupe-feu de degré 1 h dont les portes doivent être pare-flammes de degré 1/2 heure, être munies de ferme-porte et ne pas comporter de dispositif de condamnation. Dans toutes les habitations collectives, les portes d’accès aux sous-sols ne peuvent être munies de dispositifs de condamnation que si elles sont ouvrables sans clé depuis l’intérieur.

  QUESTION/RÉPONSE - MINISTERE DE L’ÉQUIPEMENT, 14 AVRIL 1987 Comment doit-on traiter les celliers individuels d’étage donnant sur les circulations horizontales communes ou les escaliers

Les celliers individuels d’étage, dans la mesure où ils ne sont pas regroupés, répondent aux exigences habituelles correspondant à chaque famille pour les parois verticales et horizontales.   QUESTION/RÉPONSE - MELATT, 11 MAI 1988 Peut-on considérer les sas admis entre des caves et un parc de stationnement mitoyen comme la sortie réglementaire desdites caves

L’existence d’un sas entre un ensemble de caves ou celliers et un parc de stationnement est une tolérance. En aucun cas cette communication ne peut être considérée comme un cheminement privilégié pour l’évacuation. Il en résulte qu’il est obligatoire de prévoir au moins une sortie donnant sur l’extérieur ou sur une circulation.

AUX BATIMENTS D'HABITATION Version 9 ET ENVELOPPE DES BATIMENTS D'HABITATION Article11 (arrêté du 7 août 2019, applicable au 1er janvier 2020) Les dispositions de la présente section ont pour objet de limiter la propagation du feu par les façades d’un niveau à un autre, que la source de l’incendie soit interne au bâtiment ou non, notamment lorsque la façade comporte une isolation extérieure. La conception de la façade limite la propagation latérale d’un incendie, ainsi que sa propagation dans la façade ou par la jonction entre le mur et le plancher. Les chutes d’objets sont prises en compte dans l’appréciation du risque, ainsi que les risques associés à l’environnement extérieur immédiat de la façade, qu’il soit bâti ou naturel, dans la limite de la zone d’influence caractéristique d’un incendie. Pour l’application de la présente section : -les couvertures formant avec la verticale un angle inférieur à 30° sont considérées comme des façades ; -une façade dite « sans ouverture » est comprise entre deux arrêtes verticales et ne comporte pas de baie ouvrante. Les orifices d’entrée d’air de ventilation dont la section est inférieure à 200 cm2 ne sont pas pris en compte. -les appréciations de laboratoires sont délivrées par un laboratoire ou par un groupe de laboratoires agréé en réaction et en résistance au feu par le ministre de l’intérieur. Le contenu et la forme de l’appréciation de laboratoire est défini en annexe 3 au présent arrêté.`,
    commentaire: `Une « note technique portant sur l‘arrêté du 7 août 2019 modifiant l’arrêté 31 janvier 1986 » a été rédigée par le CSTB et Efectis . Non datée et diffusée fin 2020, elle préconise de préciser dans chaque appréciation de laboratoire relative à la résistance au feu des façades la nature des éléments de façade chutant lors d’un essai LEPIR. A partir de ces éléments, il est indiqué que l’appréciation des risques « ne peut être menée qu’à l’échelle de l’ouvrage à construire « par les équipes de conception. La note précise également la non exploitation de la notion de « propagation latérale » de l’incendie lors d’un essai Lepir, ainsi que la nécessité de mentionner dans les appréciations de laboratoire le risque de feu couvant».

Revêtements des façades`
  },
  "12": {
    texte: `A -Première famille. Pour les habitations de la première famille, les parements extérieurs doivent être classés au moins D-s3, d0, ou en bois. Toutefois pour les habitations individuelles isolées de la première famille, il pourra être fait exception à cette règle lorsque la façade, dont les parties pleines sont revêtues d’un système de façade classé E, se trouve à plus de quatre mètres de la limite de propriété. B.-Deuxième famille. Pour les habitations de la deuxième famille, les parements extérieurs doivent être classés au moins D-s3, d0`
  },
  "13": {
    texte: `Pour l’application de cet article un système de façade comprend les couches successives de matériaux du nu extérieur jusqu’au nu intérieur de la façade, équipements, matériaux intermédiaires et structure porteuse compris. Lorsque le système de façade comporte une isolation par l’intérieur, les exigences relatives à cette isolation sont précisées à l’article 16. Ne sont pas soumis aux exigences de réaction au feu du présent article les éléments suivants des systèmes de façade : -les cadres de menuiseries en bois ; -les cadres de menuiseries classés M2 ou C-s3, d0 ; -les cadres de menuiseries avec leurs remplissages verriers minéraux (et leurs éventuels intercalaires) classés C-s3, d0 ; -les éléments verriers minéraux assemblés avec leurs intercalaires classés C-s3, d0 ; -les peintures et systèmes d’imperméabilisation classés M2 ou C-s3, d0 ; -les stores extérieurs ou intégrés classés M1 ou B-s3, d0 ; -les joints et garnitures de joints. A.-Troisième famille. Pour les habitations de la troisième famille, les systèmes de façade sont conformes à l’une des deux solutions suivantes : Solution 1 : Les systèmes de façade sont classés au moins A2-s3, d0 pour chacun de leurs éléments constitutifs et ne présentent pas de lame d’air. Lorsque le système de façade comprend des vides constructifs, le recoupement est assuré notamment par la mise en place de matériaux intumescents, de bavettes ou de bande de

recoupement incombustibles. Une appréciation de laboratoire permet de vérifier les solutions efficaces de recoupement selon le système de façade ventilé. Ces appréciations peuvent également apporter la preuve de performance des solutions sans recoupement des lames d’air. Solution 2 : L’efficacité globale des systèmes de façade vis-à-vis des objectifs généraux définis à l’article 11 est démontrée via une appréciation de laboratoire.`,
    commentaire: `Pour les 3ème familles, la solution 1 permet la mise en œuvre d’une isolation par l’extérieur composée uniquement de matériaux classés A2-s3, d0, sans lame d’air, mais sans autre exigence. Si une lame d’air est présente, une appréciation de laboratoires est alors nécessaire. Certains éléments de façades tels que les cadres de menuiserie en bois,certains stores classés B-s3, d0 etc. sont exclus de l’exigence A2-s3, d0. La solution 2 laisse cependant possibles d’autres solutions, mais accompagnée par une appréciation de laboratoire. B.-Quatrième famille. Pour les habitations de la quatrième famille, les systèmes de façade sont conformes à l’une des deux solutions suivantes : Solution 1 : Les systèmes de façade sont classés au moins A2-s3, d0 pour chacun de leurs éléments constitutifs et ne présentent pas de lame d’air. Lorsque le système de façade comprend des vides constructifs, le recoupement est assuré notamment par la mise en place de matériaux intumescents, de bavettes ou de bande de recoupement incombustibles. Une appréciation de laboratoire permet de vérifier les solutions efficaces de recoupement selon le système de façade ventilé. Ces appréciations peuvent également apporter la preuve de performance des solutions sans recoupement des lames d’air. Solution 2 : Les systèmes de façade sont classés au moins A2-s3, d0, néanmoins, un sous-ensemble du système peut ne pas être classé au moins A2-s3, d0, à la condition d’être protégée par un écran thermique, de telle sorte qu’il n’y a pas d’effets aggravants en comparaison d’un système de façade classé au moins A2-s3, d0. L’écran thermique a une performance de résistance au feu EI 30 et l’efficacité du système de façade est également démontrée par une appréciation de laboratoire. En 4ème comme en 3ème famille, la solution 1 permet la mise en œuvre d’une isolation par l’extérieur composée uniquement de matériaux classés A2-s3, d0, sans lame d’air, mais sans autre exigence. Si une lame d’air est présente, une appréciation de laboratoires est alors nécessaire. Pour les 4ème familles, la mise en œuvre de constituants moins bien classés au regard de leur réaction au feu reste possible à condition de les protéger par un écran thermique 1/2 heure, et par la production d’une appréciation de laboratoire réalisée par un laboratoire agréé. Cette rédaction remet en cause l’emploi de bardage bois en 4éme famille. Les appréciations de laboratoire devront expressément porter la mention de leur applicabilité en 4éme famille. Les travaux d’isolation par l’extérieur ou de rénovation des façades des 4 ème familles existantes, classées « IMH » par l’article R 122-30 du CCH, sont soumis à des exigences similaires à celles des 4èmes familles neuves, et sont précisées par l’arrêté du 7 août 2019 « relatif aux travaux de

modification des immeubles de moyenne hauteur et précisant les solutions constructives acceptables pour les rénovations de façade ».. ANNEXE III – APPRECIATION DE LABORATOIRE (arrêté du 7 août 2019, applicable au 1er janvier 2020) Une appréciation de laboratoire permet de vérifier le respect des objectifs de l’article R. 122-32 du code de la construction et de l’habitation. Cette appréciation est délivrée par un laboratoire, ou un groupe de laboratoires, agréé en réaction au feu et en résistance au feu par le ministre de l’Intérieur. Elle peut également prendre la forme d’un avis de façade lorsqu’elle concerne une construction particulière ou la forme d’un guide de préconisations lorsqu’elle est demandée par une organisation professionnelle ou par plusieurs entités. Cette appréciation de laboratoire est fondée sur l’une ou plusieurs des approches suivantes : A.-Analyse de résultats d’essais, notamment l’essai LEPIR II ; B.-Exploitation des connaissances acquises lors des incendies ; C.-Utilisation des résultats de calculs ; D.-Procédure mixte faisant appel à des résultats expérimentaux et numériques. L’utilisation de résultats d’essais dans le cadre d’une appréciation de laboratoire agréé ne peut se faire qu’avec l’accord du demandeur de ces essais. Toute appréciation de laboratoire agréé donne lieu à un argumentaire dont la traçabilité est assurée. Cette appréciation de laboratoire comporte une description du système de façade et de sa mise en œuvre. Concernant les façades en bardage bois, il est rappelé que la réaction au feu du bardage est attachée au marquage CE. Par ailleurs, la norme NF EN 14 915 « lambris et bardage bois » permet de déterminer des valeurs conventionnelles de réaction au feu des bardages bois, en euro-classe. Les bardages bois, produits de construction, sont soumis au marquage CE .`
  },
  "14": {
    texte: `A. Façades comportant des ouvertures

Règle dite du « C + D » : règle empirique qui permet de limiter le risque de propagation d’un niveau à un autre. Les valeurs C et D doivent être liées par une des relations ci-après en fonction de la masse combustible mobilisable : Valeur minimale de C + D en 3e famille B et 4e famille en cm 80 100 130 C et D, exprimés en centimètres sont définis soit dans l’arrêté relatif à la classification des façades vitrées par rapport au danger d’incendie (1), soit dans l’instruction technique relative aux façades (2) au chapitre 1 (1.1 et 1.2). Nota : (1) Arrêté du 10 septembre 1970 (2) Instruction technique n° 249 du 24 mai 2010 M, exprimé en MJ/m², est la masse combustible mobilisable de la façade rapportée au mètre carré de façade. Elle est définie dans l’instruction technique susvisée, au chapitre 4. Pour l’application de la règle du C + D, il n’est pas tenu compte des orifices de ventilation dont la section ne dépasse pas 200 cm². B. Façades sans ouvertures Lorsqu’une façade sans ouverture est contiguë à une façade comportant des ouvertures, les dispositions suivantes sont à respecter : -lorsque l’angle du dièdre formé par les deux façades est inférieur ou égal à 135°, la façade sans ouverture est traitée comme une façade avec ouverture ; -lorsque l’angle du dièdre formé par les deux façades est supérieur à 135°, les dispositions du A ne sont pas applicables. Cependant, la façade sans ouverture assure un degré coupe-feu réel face interne et face externe de trente minutes de l’intérieur vers l’extérieur, et de trente minutes de l’extérieur vers l’intérieur, soit EI i-> o 30 et EI o-> i 30 (REI si porteur). En cas de façade courbe, on considère les plans tangents pour la mesure de l’angle du dièdre. La performance de résistance au feu à prendre en considération pour chacune des faces exposées est la durée réelle constatée au cours des essais définis par l’arrêté du 22 mars 2004 relatif à la résistance au feu des produits, éléments de construction et d’ouvrages. Une façade avec ouvertures respectant les règles générales visées au paragraphe A et aménagée sans ouvertures satisfait aux règles du paragraphe B.

QUESTIONS/REPONSES – MINISTERE CHARGE DU LOGEMENT, 23 NOVEMBRE 2007 (PUBLICATION 2016)

Comment appliquer la règle du C+D dans le cas de loggias fermées

Les éléments de façades des loggias font partie intégrante de la façade du bâtiment. On leur applique donc la règle du C+D.

QUESTION/REPONSE - MELATT, 23 DECEMBRE 1986 Quelles sont les familles d’habitation concernées par la règle du coupe-feu 1 heure relative aux façades sans ouvertures

La règle du coupe-feu 1 heure, visée au § B, ne concerne que les 3ème et 4ème familles.

ARRÊTÉ DU 31 JANVIER 1986 RELATIF AUX BATIMENTS D'HABITATION Version 3 ET ENVELOPPE DES BATIMENTS D'HABITATION 26 août 2019 Origine : Direction du développement contrôle et vérifications techniques Auteur : J-P. Henry Mise en réseau : 4 septembre 2019 Fascicule annulé : Version 2 d’octobre 2013`
  },
  "15": {
    texte: `a) Les revêtements de couvertures classés en catégorie M1, M2 ou M3 peuvent être utilisés sans restriction s’ils sont établis sur un support continu en matériau incombustible ou en panneaux de bois, d’aggloméré de fibres de bois ou matériau reconnu équivalent par le Comité d’étude et de classification des matériaux et éléments de construction par rapport au danger d’incendie (Cecmi).. Les couvertures à revêtements classés M1, M2, M3 établis sur un support ne répondant pas à la définition de l’alinéa précédent doivent avoir la même classe de pénétration que celle fixée ci-dessous pour les couvertures à revêtements classés M4.

b) Les couvertures à revêtements classés en catégorie M4 doivent présenter les caractéristiques suivantes définies par l’essai de classe de pénétration et d’indice de propagation faisant l’objet d’un arrêté pris en application de l’article R.121-5 du Code de la construction et de l’habitation. La classe de pénétration de ces couvertures doit être :

- habitation de la première famille : T 5 ou T 15 ou T 30 ;

- habitation de la 2ème famille : T 15 ou T 30 ;

- habitation des 3ème et 4ème familles : T 30. L’indice de propagation de la couverture d’un immeuble se détermine selon le tableau (Cf.TAB.1) ci-après, en fonction :

- de la distance qui le sépare soit d’un immeuble voisin, soit de la limite de propriété ;

- de l’indice de propagation de la couverture de l’immeuble voisin. Indice Distance minimale De 0 à 4 m De 4 à 8 m De 8 à 12 m Indice de l’immeuble voisin 1 2 1 3 2 1 Indice minimal recherché 1 1 2 1 2 3 TAB.1

Au-delà de 12 m, toute couverture peut être utilisée sans restriction. Pour apprécier ces indices :

- les couvertures dont les revêtements sont classés en catégorie M0 à M3 sont assimilées à des couvertures d’indice 1 ;

- lorsque la distance minimale est mesurée par rapport à la limite de propriété, la couverture du bâtiment à implanter ultérieurement sur la parcelle voisine est considérée fictivement comme étant d’indice 1. Sont considérés comme constituant un bâtiment distinct :

- chaque habitation individuelle isolée ;

- chaque ensemble d’habitations individuelles jumelées ;

- chaque ensemble d’habitations individuelles réunies en bande ou d’immeubles collectifs, d’une longueur au plus égale à 45 m, mesurée suivant l’axe de la bande ou des immeubles et ne présentant pas plus d’un retour d’aile. Toutefois, les ensembles de maisons individuelles réunies en bande et les bâtiments collectifs visés ci-dessus ne seront pas considérés comme constitués d’immeubles distincts si les retours d’ailes qu’ils présentent dans la limite des 45 m sont successivement de sens opposé. Lorsque les ensembles de maisons individuelles en bande ou les bâtiments collectifs sont d’une longueur telle ou sont disposés de telle façon qu’ils constituent deux ou plusieurs immeubles distincts, la couverture de chacun des immeubles distincts doit être d’indice 1. (arrêté du 7 août 2019) c) Dans les habitations de première et 2ème familles et au dernier niveau des habitations de 3ème et 4ème familles, lorsque les couvertures forment avec la verticale un angle de 30 ° minimum, elles ne sont pas soumises aux prescriptions de l’article 12 relatives aux revêtements extérieurs des façades, mais doivent répondre aux prescriptions du présent article. Toutefois, cette dérogation ne peut concerner le niveau du rez-de-chaussée dont le parement extérieur doit être classé en catégorie M3 au moins, à l’exception des maisons individuelles isolées.`,
    commentaire: `La définition des façades au regard de l’inclinaison est précisée à l’article 11 de l’arrêté   QUESTION/RÉPONSE - MELATT, 23 DECEMBRE 1986 Dans quel arrêté est défini l’essai relatif aux classes de pénétration et aux indices de propagation des couvertures

L’essai de classe de pénétration et d’indice de propagation pour les couvertures est défini par l’arrêté du 10 septembre 1970 relatif à la classification des couvertures en matériaux combustible par rapport au danger d’incendie résultant d’un feu extérieur. Nota : Cet arrêté est publié dans la brochure n° 1540-II du JO. L’arrêté du 10 septembre 1970 a été remplacé par l’arrêté du 14 février 2003 « relatif à la performance des toitures exposées à un incendie ». Le classement T 30 correspond par exemple à un matériau classé B ROOF (t3) selon l’arrêté du 14 février 2003.

AUX BATIMENTS D’HABITATION Version 4 ET ENVELOPPE DES BATIMENTS D’HABITATION 10 septembre 2019 vérifications techniques

- Date de diffusion : 10 septembre 2019`
  },
  "16": {
    texte: `Les matériaux et produits d’isolation ne doivent pas constituer, compte tenu éventuellement des matériaux de protection dont ils sont revêtus, un risque inadmissible pour les occupants au regard des phénomènes suivants :

- délai d’embrasement généralisé du local ;

- émission de fumées hors du logement dans lequel le feu a pris naissance, après l’évacuation du logement sinistré. Afin de répondre à ces objectifs, les matériaux d’isolation et leur mise en œuvre doivent respecter l’une des deux dispositions suivantes :

a) Etre classés au moins : -A2-s2, d0 en paroi verticale, en plafond ou en toiture ; -A2 fl-s1 en plancher, au sol.

b) Etre protégés par un écran thermique disposé sur la ou les faces susceptibles d’être exposées à un feu intérieur au bâtiment. Cet écran doit jouer son rôle protecteur, vis-à-vis de l’action du programme thermique normalisé, durant au moins : -pour les bâtiments de 1re et 2e famille, 15 minutes pour toutes les orientations de parois ; -pour les bâtiments de 3e et 4e famille, 30 minutes pour les plafonds ou sous-face de planchers, et 15 minutes pour les parois verticales, les sols, et les plafonds situés au dernier niveau. Les matériaux d’isolation et leur mise en œuvre sont considérés comme répondant aux exigences ci-dessus s’ils sont conformes aux indications contenues dans le Guide de l’isolation par l’intérieur des bâtiments d’habitation du point de vue des risques en cas d’incendie version 2016.`,
    commentaire: `En l’attente de la diffusion effective du « Guide de l’isolation par l’intérieur des bâtiments d’habitation du point de vue des risques en cas d’incendie version 2016 », il convient de rappeler que le guide d´emploi des isolants combustibles dans les établissements recevant du public donne également des solutions d’écrans thermiques ¼ d’heure ou 1/2 heure, pour les ERP. A titre d’exemple en ERP une plaque de plâtre BA 13 constitue un écran thermique 15 minutes pour les parois verticales, une plaque de plâtre BA 18 constitue un écran thermique 30 minutes pour les sous faces de plancher.

L’article 16 permet la mise en place d’un écran thermique de seulement 15 minutes pour les plafonds au dernier étage des habitations de 3 ème et 4 ème famille. Aucune précaution particulière n’est nécessaire si un logement est isolé par l’intérieur quelle que soit la paroi avec un isolant minéral type laine de roche ou laine de verre, classé de fait A2-s2, d0. Si l’isolation par l’intérieur est réalisée par exemple avec un polystyrène, il sera nécessaire de protéger celui-ci avec un écran thermique. La plaque de plâtre couramment utilisée fera office d’écran thermique, selon les exigences décrite par le « Guide de l’isolation par l’intérieur des bâtiments d’habitation du point de vue des risques en cas d’incendie version 2016 ». Parmi les diverses solutions du guide, on peut retenir en tant que solution générique valable pour toutes les familles d’habitation : Murs : Complexes de doublage avec plaques de plâtre standard d’épaisseur nominale 12,5 mm au moins, et isolant collés sur mur. La plaque de plâtre de 12,5 mm est conforme à la norme EN 520 et a une masse surfacique supérieure ou égale à 8,5 kg/m2. Plafond : plafond suspendu constitué d’une plaque de plâtre, épaisseur 18 mm…fixation mécanique sur éléments d’ossature métallique à 0,50 m d'entraxe, masse surfacique supérieure ou égale à 13 kg/m². Sols : chape ou dalle flottante d’épaisseur minimale 35 mm. Le guide optimise ces solutions par exemple en préconisant pour les murs en 1ère ou 2 ème famille un complexe de doublage avec plaque de plâtre de 9,5 mm seulement.`
  },
  "17": {
    texte: `Afin de permettre aux occupants, en cas d’incendie, soit de quitter l’immeuble sans secours extérieur, soit de recevoir un tel secours, les dégagements des bâtiments d’habitation doivent répondre aux prescriptions des articles ci-après figurant :

- dans le chapitre premier, pour les escaliers ;

- dans le chapitre II, pour les circulations horizontales ;

- dans le chapitre III, pour les dégagements protégés, associant un escalier protégé et une circulation horizontale protégée. ◆ QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 14 AVRIL 1987 Le terme « associant » du dernier alinéa de l’article 17 doit-il être compris comme associant en tant qu’« obligation » ou associant en tant que « lorsqu’ils associent »

Un dégagement protégé est obligatoirement constitué d’au moins un escalier protégé et une circulation horizontale protégée.

ARRÊTÉ DU 31 JANVIER 1986 RELATIF AUX BATIMENTS D'HABITATION Version 2 ESCALIERS 24 juin 2015 Origine : Direction Développement Construction & GPI Auteur : J.P. Henry FD`
  },
  "18": {
    texte: `Dans toutes les habitations collectives, en règle générale, les parois d’escalier doivent être pare-flammes de degré 1/2 heure. Les parties de paroi, baies ou fenêtres non pare-flammes de degré 1/2 heure doivent être situées :

- à 2 m au moins des fenêtres de la façade située dans un même plan ;

- à 4 m au moins des fenêtres d’une façade en retour ;

- à 8 m au moins des fenêtres d’une façade en vis-à-vis. Pour l’application de cette disposition, sont considérées situées :

- latéralement, les façades sur un même plan ou formant un dièdre d’angle supérieur à 135° ;

- en retour, les façades formant un dièdre d’angle compris entre 90° et 135° bornes incluses ;

- en vis-à-vis, les façades formant un dièdre d’angle inférieur à 90°. Date de diffusion : 7 août 2015 Fascicule annulé : Version 1 d’Avril 1998

  QUESTIONS/REPONSES - COMMISSION DU REGLEMENT DE CONSTRUCTION, 25 JUIN 1997 L’article 18 s’applique-t-il aux bâtiments collectifs classés en 2ème famille pour lesquels l’encloisonnement de l’escalier n’est pas exigé

Compte tenu du non encloisonnement de l’escalier, l’article 18 ne s’applique pas aux bâtiments collectifs classés en 2ème Famille dont le dernier plancher desservi par l’escalier est à une hauteur inférieure ou égale à 8 mètres. L’article 18 (parois des cages d’escalier situées en façade) s’applique-t-il à tous les escaliers à l’air libre

En référence à l’article 28, les dispositions de l’article 18 sont applicables à l’ensemble des escaliers à l’air libre des bâtiments collectifs sauf pour ceux classés en 2ème famille dont la hauteur du dernier plancher desservi par l’escalier est inférieure ou égale à 8 mètres.`,
    commentaire: `dispositions architecturales particulières.`
  },
  "19": {
    texte: `Les parois des cages d’escalier non situées en façade doivent être coupe-feu de degré 1/2 heure pour les habitations collectives de la 2ème famille. Il n’est pas exigé qu’il existe des portes séparant l’escalier des circulations horizontales, sauf pour les habitations dont le plancher bas du logement le plus haut est à plus de 8 m du sol.

  QUESTIONS/RÉPONSES - MINISTERE DE L’ÉQUIPEMENT, 14 AVRIL 1987 Une circulation horizontale est-elle toujours nécessaire dans les bâtiments d’habitation R + 3

Les circulations horizontales protégées ne sont imposées qu’en 3ème famille B et en 4ème famille. Dans les 2ème familles dont le plancher bas du logement le plus haut est à plus de 8 m du sol, il est demandé une séparation physique entre l’escalier et la circulation (une porte). L’escalier est ainsi dénommé « escalier encloisonné ». Comment doit-on interpréter le terme « encloisonné » employé dans divers articles

Le terme « encloisonné » implique une séparation physique sans qu’il soit requis une qualité particulière de résistance au feu de la séparation.`
  },
  "20": {
    texte: `Dans les habitations de 3ème famille, les escaliers doivent être établis dans une cage dont toutes les parois non situées en façade sont coupe-feu de degré 1 h, à l’exception des impostes ou oculus qui peuvent être pare-flammes de degré 1 heure. Les blocs-portes aménagés dans ces parois doivent être pare-flammes de degré 1/2 heure, leur porte doit être munie d’un ferme-porte et s’ouvrir dans le sens de la sortie en venant des logements. Aucun local ne doit s’ouvrir sur ces escaliers.`
  },
  "21": {
    texte: `Dans les habitations de la 4ème famille, les parois de l’escalier protégé communes avec le bâtiment desservi doivent être coupe-feu de degré 1 heure au moins, à l’exception des impostes ou oculus qui peuvent être pare-flammes de degré 1 heure.

AUX BATIMENTS D'HABITATION Version 2 ESCALIERS 25 septembre 2016`
  },
  "22": {
    texte: `Les escaliers des habitations des 3ème et 4ème familles doivent être réalisés en matériaux incombustibles.`
  },
  "23": {
    texte: `Dans les habitations collectives de la 2ème famille, les revêtements des parois verticales, du rampant et des plafonds de la cage d’escalier doivent être classés en catégorie M2. Toutefois, l’emploi du bois est autorisé dans les halls d’entrée lorsque l’escalier desservant les étages débouche directement à l’extérieur du bâtiment.

Aucune exigence n’est prescrite pour les revêtements de sols quel que soit leur mode de pose, ainsi que pour les revêtements collés ou tendus sur la face supérieure des marches. Dans les autres habitations collectives, les revêtements des parois verticales, du rampant et des plafonds de la cage d’escalier doivent être classés en catégorie M0. Les revêtements éventuels des marches et contremarches doivent être classés en catégorie M3. Dans tous les cas, si l’escalier est à l’air libre, aucune prescription n’est imposée pour les revêtements collés à la face supérieure des marches.

QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 6 OCTOBRE 1987 Peut-on envisager l’isolation par l’intérieur dans les cages d’escalier en respectant les règles indiquées dans le Guide de l’isolation par l’intérieur, c’est-à-dire en utilisant des revêtements non classés M0

Il est interdit d’isoler par l’intérieur les cages d’escaliers de bâtiments des 3ème et 4ème familles en utilisant des revêtements non classés M0. L’arrêté du 31 janvier 1986 fait bien référence au Guide de l’isolation par l’intérieur, mais ce renvoi vaut pour l’isolation à l’intérieur des logements. Il n’est pas question de diminuer le niveau de sécurité dans les dégagements.


QUESTION/REPONSE - COMMISSION DU REGLEMENT DE CONSTRUCTION, 25 JUIN 1997 Quelles sont les prescriptions à respecter pour le classement de réaction au feu des revêtements des parois des halls d’entrée des immeubles classés en 2ème, 3ème familles A et B et 4ème famille

En l’absence de prescriptions particulières dans l’arrêté du 31 janvier 1986, le classement de réaction au feu des revêtements, bois compris, des parois des halls d’entrée, doit respecter les classements suivants : Familles Parois 2ème 3ème A/B 4ème Paroi verticale M2 M1 M0 Plafond M2 M1 M0 Sol libre M3 M3 En pose verticale, le vide éventuel entre support et revêtement ne doit pas dépasser 5 cm.`
  },
  "24": {
    texte: `Dans les habitations collectives des 2ème , 3ème et 4ème familles, les escaliers mettant en communication les sous-sols et le reste du bâtiment doivent comporter au moins un bloc-porte coupe-feu de degré 1/2 heure dont la porte est munie d’un ferme-porte et s’ouvre dans le sens de la sortie en venant du sous-sol. Ces escaliers doivent aboutir, au rez-de-chaussée, dans un hall ou une circulation horizontale et ne doivent pas aboutir dans les escaliers desservant les étages. Que doit-on prévoir au niveau du rez-de-chaussée, lorsque la porte isolant le sous-sol du reste du bâtiment est implantée au sous-sol

Afin d’éviter que les personnes évacuant les étages puissent emprunter par inadvertance l’escalier desservant le sous-sol, un dispositif approprié et efficace (par exemple, porte, grille, portillon,…) doit être installé au rez-de-chaussée ; ce dispositif répond au dernier alinéa de l’article 10, ouvre dans le sens de la sortie et est complété par une signalétique adaptée (par exemple, « accès sous-sol », « sans issue », …).


QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 1ER JUILLET 1988 Le bloc-porte coupe-feu de degré 1/2 heure peut-il se situer en bas de l’escalier desservant le sous-sol

Le bloc-porte coupe-feu de degré 1/2 heure peut se situer en bas de l’escalier desservant le sous-sol. Bien évidemment, une autre porte devrait être placée en partie haute s’il existait des logements aux niveaux inférieurs (cas des bâtiments comportant des niveaux différents sur deux façades opposées).

QUESTIONS/REPONSES – MINISTERE CHARGE DU LOGEMENT, 23 NOVEMBRE 2007 (PUBLICATION 2016) Que doit-on prévoir au niveau du rez-de-chaussée, lorsque la porte isolant le sous-sol du reste du bâtiment est implantée au sous-sol

Afin d’éviter que les personnes évacuant les étages puissent emprunter par inadvertance l’escalier desservant le sous-sol, un dispositif approprié et efficace (par exemple, porte, grille, portillon,…) doit être installé au rez-de-chaussée ; ce dispositif répond au dernier alinéa de l’article 10, ouvre dans le sens de la sortie et est complété par une signalétique adaptée (par exemple, « accès sous-sol », « sans issue », …).

AUX BATIMENTS D'HABITATION Version 4 ESCALIERS 20 juillet 2018 Origine : Direction du développement contrôle et vérification technique Auteur : J.P. Henry BK Mise en réseau : 25 juillet 2018 Fascicule annulé : Version 3 du 26 septembre 2016`
  },
  "25": {
    texte: `Dans les habitations collectives de la 2ème famille et dans les habitations de la 3ème famille A, les dispositions suivantes doivent être appliquées :

- en partie haute de l’étage le plus élevé, la cage d’escalier doit comporter un dispositif fermé en temps normal permettant, en cas d’incendie, une ouverture de 1 m² au moins assurant l’évacuation des fumées ;

- une commande située au rez-de-chaussée de l’immeuble, à proximité de l’escalier, doit permettre l’ouverture facile par un système électrique, pneumatique, hydraulique, électromagnétique ou électropneumatique (1). Nota : (1) Conforme à l’instruction technique n° 247 du ministre de l’Intérieur : Dans le cas des habitations collectives de la 2ème famille, cette commande peut également être réalisée par un système de tringlerie.

Dans tous les cas, l’accès à ce dispositif de commande doit être réservé aux services d’incendie et de secours et aux personnes habilitées. En outre, dans les habitations de la 3ème famille A, l’ouverture du dispositif doit être asservie à un détecteur autonome déclencheur. Nota : Conforme à la norme française le concernant (NF S 61-961) Les dispositions du présent article ne sont pas applicables dans le cas d’un escalier extérieur tel que défini à l’article 29 bis.

QUESTIONS/REPONSES - COMMISSION DU REGLEMENT DE CONSTRUCTION, 25 JUIN 1997 Quelles sont les conditions d’installation des commandes de désenfumage par câble d’acier, admises dans les bâtiments d’habitation

L’installation respectera les dispositions de l’article 6.3 de la norme NF S 61-932 : Systèmes de sécurité incendie (SSI - Règles d’installation). Il est admis que la longueur du câble peut aller jusqu’à 15 mètres si son parcours est visible depuis les volées de l’escalier. Par lettre du 6 juillet 1990 de la Direction de la construction, il est indiqué que le système de tringlerie mentionné à l’article 25 de l’arrêté du 31 janvier 1986 inclut la commande par câble d’acier sous fourreau dont la mesure où le câble a un parcours suffisamment rectiligne pour assurer le bon fonctionnement du mécanisme.

Peut-on installer au dernier niveau des immeubles classés en 3ème et 4ème familles un dispositif adaptateur de commande (DAC) à relâchement à câble d’acier (tel que treuil électromagnétique ou électropneumatique, la télécommande électrique ou pneumatique étant située en rez-de-chaussée)

Le dispositif de commande d’ouverture du désenfumage des cages d’escalier peut comporter un DAC sur le palier du dernier étage sous réserve que l’installation respecte les dispositions des normes les concernant, notamment les normes :

- NF S 61-932 : Systèmes de sécurité incendie - Règles d’installation ;

- NF S 61-937 : Systèmes de sécurité incendie Dispositifs actionnés de sécurité (DAS) ;

- NF S 61-938 : Systèmes de sécurité incendie - Dispositifs adaptateurs de commande (DAC).`,
    commentaire: `Pour l’emplacement de la commande de désenfumage de l’escalier demandée dans les bâtiments classés en 2ème famille, qu’entend-on par « rez-de-chaussée »

L’article 25, 3ème alinéa de l’arrêté du 31 janvier 1986 indique que la commande du dispositif de désenfumage en partie haute de l’escalier, est située au rez-de-chaussée de l’immeuble, à proximité de l’escalier. Cette commande pourra être située sur le demi-palier de l’escalier menant au premier étage à condition qu’elle soit visible depuis l’accès rez-de-chaussée à la cage d’escalier postale). Quelle largeur minimale doit subsister dans l’escalier pour ne pas constituer un obstacle à la circulation des personnes dans cet escalier, quand une porte d’accès à celui-ci est ouverte

La largeur minimale qui doit être retenue pour ne pas constituer un obstacle à la circulation des personnes dans l’escalier est de 0,80 m. Cette largeur minimale s’applique également aux autres bâtiments collectifs classés en 2ème famille et 3ème famille A. ponctuels.`
  },
  "26": {
    texte: `Dans les habitations de la 3ème famille B, l’escalier doit être un escalier « protégé » soit « à l’air libre », soit « à l’abri des fumées » répondant aux définitions ci-après.`
  },
  "27": {
    texte: `L’escalier doit :

- être desservi à chaque niveau par une circulation horizontale protégée, avec laquelle il ne communique que par une seule issue ;

- ne comporter aucune gaine, trémie, canalisation, vide-ordures, accès à des locaux divers, ascenseurs, à l’exception de ses propres canalisations électriques d’éclairage, des colonnes sèches, des canalisations d’eau et chutes d’eau métalliques, des canalisations de gaz visées à l’article 54 ;

- comporter un éclairage électrique constitué soit par une dérivation issue directement du tableau principal (sans traverser les sous-sols) et sélectivement protégée, soit par des blocs autonomes de type non permanent conformes aux normes françaises les concernant. L’installation des blocs autonomes visés ci-dessus est obligatoire dans les escaliers des habitations de la 4ème famille. Les conduits non encastrés doivent être classés en catégorie C2 (2). Nota : (2) Au sens de la norme NF C 32-070.


QUESTIONS/REPONSES - COMMISSION DU REGLEMENT DE CONSTRUCTION, 25 JUIN 1997 Dans les bâtiments classés en 2ème famille et 3ème famille A, le volume d’un escalier peut-il comporter la gaine d’un ascenseur desservant le sous-sol et les étages

Le volume de l’escalier peut comporter la gaine d’ascenseur si les deux conditions suivantes sont respectées :

- cette configuration ne peut être admise que pour les étages en superstructure, rez-de-chaussée compris, en application de l’article 24 qui prescrit que l’escalier desservant le sous-sol soit dissocié de celui desservant les étages ;

- dans le cas où la machinerie est en partie basse, sa ventilation doit être indépendante de la gaine d’ascenseur. La gaine d’ascenseur devra en outre respecter les prescriptions de l’article 97 de l’arrêté du 31 janvier 1986.

Peut-on admettre que l’accès à aa cage d’escalier dans un bâtiment, classé en 3ème famille A, comporte deux portes donnant sur la même circulation horizontale, notamment dans le but de ne pas dépasser la distance maximale de 7 mètres entre la porte palière la plus éloignée et l’accès à l’escalier

La présence de ces deux portes pour un bâtiment classé en 3ème famille A peut être admise, à condition, qu’à partir d’un logement le cheminement pour accéder à un équipement collectif (par exemple : ascenseur) ne franchisse qu’une seule de ces deux portes.`,
    commentaire: `sont essentiels, afin que la présence de deux issues ne soit pas un facteur aggravant de propagation des fumées, en cas de sinistre. Les blocs autonomes, obligatoires dans les escaliers protégés des bâtiments de la 4ème famille, doivent être conformes à la norme NF C 71-805, « Blocs autonomes d’éclairage à lampes à incandescence pour bâtiments d’habitation ».`
  },
  "28": {
    texte: `L’escalier « à l’air libre » est un escalier dont la paroi donnant sur l’extérieur est ouverte sur au moins la moitié de sa surface sur toute la longueur. Il doit, en outre, répondre aux prescriptions de l’article 18. Si cet escalier comporte des portes desservant des circulations protégées, ces portes doivent répondre aux dispositions prévues pour celles des escaliers « à l’abri des fumées ».


QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 14 AVRIL 1987 Le terme « si » employé à l’article 28, dernier alinéa, n’est-il pas contradictoire avec l’article 27, 1er tiret

Il se peut que des bâtiments de 2ème ou 3ème famille A comportent des escaliers à l’air libre (pour des raisons autres que la sécurité, par exemple pour le calcul du COS). En d’autres termes, un escalier à l’air libre ne communique pas systématiquement avec une circulation horizontale protégée.

QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 1ER JUILLET 1988 Doit-on mettre en place une porte pare-flammes de degré 1/2 heure entre un escalier à l’air libre et une circulation à l’air libre dans les bâtiments de la 3ème famille A

La présence d’une porte entre un escalier à l’air libre et une circulation à l’air libre ne présente aucun intérêt au plan de la sécurité incendie. Cette porte n’est donc pas imposée, que le bâtiment soit classé en 3ème famille A, 3ème famille B ou 4ème famille.

QUESTION/REPONSE - COMMISSION DU REGLEMENT DE CONSTRUCTION, 25 JUIN 1997 L’article 18 ci-avant (parois des cages d’escalier situées en façade) s’applique-t-il à tous les escaliers à l’air libre

En référence à l’article 28, les dispositions de l’article 18 sont applicables à l’ensemble des escaliers à l’air libre des bâtiments collectifs sauf pour ceux classés en 2ème famille dont la hauteur du dernier plancher desservi par l’escalier est inférieure ou égale à 8 mètres.`,
    commentaire: `dispositions architecturales particulières.`
  },
  "29": {
    texte: `L’escalier « à l’abri des fumées » est un escalier fermé sur toutes ses faces par des parois qui doivent être coupe-feu de degré 1 heure à l’exception des impostes et oculus qui doivent être pare-flammes de degré 1 heure. Le bloc-porte séparant l’escalier de la circulation protégée doit être pare-flammes de degré 1/2 heure. La porte, d’une largeur de 0,80 m au moins, doit être munie d’un ferme-porte et s’ouvrir dans le sens de la sortie en venant des logements. En position d’ouverture, elle ne doit pas constituer un obstacle à la circulation des personnes dans l’escalier et laisse un passage libre minimal de 0,80 m dans l’escalier. . Une inscription sur cette porte indiquera de façon très lisible la mention « Porte coupe-feu à maintenir fermée ». La cage d’escalier doit être, en temps normal, fermée à sa partie supérieure et à sa partie inférieure, ce qui exclut toute ventilation. Elle doit comporter à son extrémité supérieure un ensemble permettant de réaliser une ouverture horizontale de 1 m² à l’air libre. Dans le cas où cette ouverture n’est pas réalisable, l’escalier doit pouvoir être mis en surpression. Le dispositif de commande de l’ouverture réservée aux services d’incendie et de secours et aux personnes habilitées est identique à celui de l’article 25. Au rez-de-chaussée, l’escalier doit aboutir soit à l’extérieur, soit dans un hall ou une circulation horizontale largement ventilée.


QUESTION/RÉPONSE - Commission du règlement de construction, 25 juin 1997 Peut-on installer au dernier niveau des immeubles classés en 3ème et 4ème familles un dispositif adaptateur de commande (DAC) à relâchement à câble d’acier (tel que treuil électromagnétique ou électropneumatique, la télécommande électrique ou pneumatique étant située en rez-de-chaussée)

Le dispositif de commande d’ouverture du désenfumage des cages d’escalier peut comporter un DAC sur le palier du dernier étage sous réserve que l’installation respecte les dispositions des normes les concernant, notamment les normes :

- NF S 61-932 : Systèmes de sécurité incendie - Règles d’installation ;

- NF S 61-937 : Systèmes de sécurité incendie - Dispositifs actionnés de sécurité (DAS) ;

- NF S 61-938 : Systèmes de sécurité incendie - Dispositifs adaptateurs de commande (DAC).`,
    commentaire: `? QUESTIONS/REPONSES – MINISTERE CHARGE DU LOGEMENT, 23 NOVEMBRE 2007 (PUBLICATION 2016) Les articles 25 et 29 décrivent le désenfumage des cages d’escalier sans préciser de hauteur d’implantation de l’exutoire ou de l’ouvrant par rapport au dernier palier. Quelle est la hauteur minimale à respecter

La partie basse de l’exutoire ou de l’ouvrant doit être situé le plus haut possible et en tout état de cause au-dessus des linteaux des portes du dernier niveau habité.`
  },
  "29 bis": {
    texte: `L’escalier “extérieur” est un escalier dont l’emprise volumétrique (paliers et volées de l’escalier) est située à plus de :

- deux mètres au moins des baies d’une façade située latéralement ;

- quatre mètres au moins des baies d’une façade en retour ;

- huit mètres au moins des baies d’une façade en vis-à-vis. La mesure s’effectue du nu extérieur au nu extérieur de l’emprise de l’escalier. Pour l’application de cette disposition, est considérée située :

- latéralement, une façade sur un même plan ou formant un dièdre d’angle supérieur à 135° ;

- en retour, une façade formant un dièdre d’angle compris entre 90° et 135° bornes incluses ;

- en vis-à-vis, une façade formant un dièdre d’angle inférieur à 90°. Au rez-de-chaussée, l’escalier doit aboutir soit à l’extérieur, soit dans un hall ou une circulation horizontale largement ventilée.`,
    commentaire: `L’escalier extérieur est cité à l’article 3 pour les bâtiments de 2ème famille de 3 étages dont le plancher bas du logement le plus haut est à plus de 8 m.. La rédaction de l’article 29 bis (arrêté du 19 juin 2015) est peu précise, et son application est mal décrite. La différence essentielle entre l’escalier à l’air libre et l’escalier extérieur est que l’escalier à l’air libre débouche en théorie selon l’article 28 dans une circulation protégée. Il est compris que « l’escalier extérieur » est un escalier ouvert sur toutes ses faces, au-delà du simple escalier à l’air libre.

AUX BATIMENTS D'HABITATION Version 2 CIRCULATIONS HORIZONTALES PROTEGEES 24 juin 2015`
  },
  "30": {
    texte: `Elles peuvent être constituées par des balcons, coursives ou terrasses praticables en permanence dont la paroi donnant sur l’extérieur comporte, sur toute sa longueur, des vides au moins égaux à la moitié de la surface totale de cette paroi. Si des séparations la recoupent, celles-ci doivent être facilement amovibles ou destructibles. Les baies vitrées donnant sur les circulations à l’air libre comportent une allège d’au moins un mètre de hauteur présentant un degré coupe-feu suivant :

- une demi-heure (de classement EI 30) pour les habitations collectives de la deuxième et troisième famille ;

- une heure (de classement EI 60) pour les habitations de la quatrième famille. Sinon, ces baies vitrées sont pare-flammes de degré une demi-heure (de classement E30) et fixes. Pour les circulations horizontales à l’air libre des bâtiments de troisième famille B et de quatrième famille, la distance maximale à parcourir entre la porte de logement la plus éloignée et l’accès à l’escalier doit être de 25 mètres. Il est admis de ne pas désenfumer les portions de circulation ne répondant pas à la définition du premier paragraphe ci-dessus lorsqu’elles mesurent moins de dix mètres et qu’elles sont dans la continuité d’une circulation horizontale à l’air libre. Les revêtements éventuels des parois verticales et des plafonds doivent être classés en catégorie M2 ou réalisés en bois.

Aucune prescription n’est imposée pour les revêtements de sols quel que soit leur mode de pose.

QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 1ER JUILLET 1988 Doit-on mettre en place une porte pare-flammes de degré 1/2 heure entre un escalier à l’air libre et une circulation à l’air libre dans les bâtiments de la 3ème famille A

Se référer à la question/réponse de l’article 28.

QUESTIONS/REPONSES - COMMISSION DU REGLEMENT DE CONSTRUCTION, 25 JUIN 1997 Dans le cas d’une circulation horizontale à l’air libre, quelle est la distance maximale à parcourir entre la porte de logement la plus éloignée et l’accès à l’escalier

Pour les circulations horizontales à l’air libre concernant les 3ème famille B et 4ème famille, la distance maximale à parcourir entre la porte de logement la plus éloignée et l’accès à l’escalier doit être de 25 mètres. Quel degré de résistance ou feu doit-on imposer aux planchers des circulations horizontales à l’air libre

Les planchers des circulations horizontales à l’air libre doivent présenter les degrés coupe-feu requis pour les planchers, indiqués à l’article 6#Article6. S’il existe plusieurs cheminements possibles, cette exigence pourra être atténuée en accord avec le service instructeur local. Quelles dispositions doit-on appliquer aux baies vitrées de logements ouvrant sur une circulation horizontale à l’air libre quand elles ne sont pas concernées par les règles d’éloignements indiquées aux articles 18#Article18 et 28#Article28

Les baies vitrées donnant sur les circulations à l’air libre doivent être pare-flammes de degré une demi-heure et fixes ou comporter une allège d’au-moins 1 mètre de hauteur présentant un degré coupe-feu de :

- une demi-heure pour les habitations collectives de la 2ème famille et pour les habitations de la 3ème famille ;

- une heure pour les habitations de la 4’ famille.`,
    commentaire: `#Article8. Ces dispositions sont homogènes avec celles modifiant l’article CO 24 § 1 b#CO24Para1b du règlement de sécurité des établissements recevant du public des première à 4ème catégories (arrêté du 23 décembre 1996, JO du 10 janvier 1997).`
  },
  "31": {
    texte: `La distance à parcourir entre la porte palière de chaque logement et la porte de l’escalier ou l’accès à l’air libre ne doit pas dépasser 15 m.

QUESTION/REPONSE - COMMISSION DU REGLEMENT DE CONSTRUCTION, 25 JUIN 1997 Quelle doit être lu distance maximale à parcourir entre la porte potière la plus éloignée et l’accès à l’escalier pour un bâtiment de 3ème famille B soumis aux seules prescriptions fixées pour les bâtiments classés en 3ème famille A

Par analogie avec les prescriptions de l’article 3 1, il convient de retenir pour les bâtiments de 3ème famille B «déclassés» en 3ème famille A (article 3-3° de l’arrêté),une distance maximale de 15 mètres dans le cas de circulations intérieures.`
  },
  "32": {
    texte: `Les revêtements des parois de cette circulation doivent être classés en catégorie :

- M1 s’ils sont collés ou tendus en plafond ;

- M2 s’ils sont collés ou tendus sur les parois verticales ;

- M3 s’ils sont collés ou tendus sur le sol. Toutefois, lorsque l’escalier protégé aboutit directement à l’extérieur, en dehors du hall d’entrée, l’emploi du bois est autorisé dans ce hall.

QUESTION/REPONSE - COMMISSION DU REGLEMENT DE CONSTRUCTION, 25 JUIN 1997 Quelles sont les prescriptions à respecter pour le classement de réaction au feu des revêtements des parois des halls d’entrée des immeubles classés en 2ème, 3ème famille A et B et 4ème famille

En l’absence de prescriptions particulières dans l’arrêté du 31 janvier 1986, la réaction au feu des revêtements, bois compris, des parois des halls d’entrée, doit respecter les classements suivants : Familles Parois 2ème 3ème A/B 4ème Paroi verticale M2 M1 M0 Plafond M2 M1 M0 Sol libre M3 M3 En pose verticale, le vide éventuel entre support et revêtement ne doit pas dépasser 5 cm.`
  },
  "33": {
    texte: `Le désenfumage, c’est-à-dire l’évacuation efficace de la fumée et de la chaleur, doit être réalisé dans les circulations horizontales à l’abri des fumées :

- soit par tirage naturel ;

- soit par extraction mécanique. Ces deux systèmes comportent des dispositions communes prévues aux articles 34, 35 et 36 ci-après.`
  },
  "34": {
    texte: `Les conduits de désenfumage du réseau d’amenée d’air et du réseau d’évacuation des fumées sont :

- soit des conduits collectifs ayant éventuellement des raccordements horizontaux à chaque étage. Les bouches placées au départ de ces conduits doivent toujours être fermées en temps normal, sauf à mettre en œuvre les dispositions prévues en cas de ventilation permanente, par des volets réalisés en matériaux incombustibles et coupe-feu de degré 1 heure pour l’évacuation des fumées et pare-flammes de degré 1 heure pour l’amenée d’air ;

- (Arrêté du 18 août 1986) soit des conduits collecteurs et des raccordements de hauteur d’étage dits « shunts ». Les bouches placées sur ces conduits peuvent être en temps normal soit ouvertes, soit fermées par des volets incombustibles. Si elles sont ouvertes en permanence, un même conduit collecteur ne peut desservir que cinq niveaux au plus. Chaque bouche d’évacuation doit disposer d’une hauteur minimale de tirage de 4,25 m ; dans le cas contraire, elle doit être desservie par un conduit individuel jusqu’à son orifice extérieur. La distance du débouché à l’air libre des conduits de désenfumage par rapport aux obstacles plus élevés qu’eux doit être au moins égale à la hauteur de ces obstacles sans toutefois excéder 8 m. Les conduits et les raccordements d’étage doivent avoir une section libre minimale de 20 dm² tant pour l’amenée d’air que pour l’évacuation ; le rapport de la plus grande dimension de la section à la plus petite ne doit pas excéder 2. La longueur des raccordements horizontaux d’étage ne doit pas excéder 2 m.

Les conduits d’amenée d’air et les conduits d’évacuation doivent être réalisés en matériaux incombustibles et coupe-feu de degré 1/2 heure dans les habitations de 3ème famille et coupe-feu de degré 1 heure dans les habitations de 4ème famille. Leur construction doit satisfaire aux conditions d’étanchéité requises pour l’usage auquel ils sont destinés. En particulier, les débits de fuite des conduits d’extraction des fumées doivent être inférieurs à la demi-somme des débits exigés aux bouches d’extraction les plus défavorisées.

QUESTION/REPONSE - MELATT, 25 AOUT 1986 Quelles sont les conditions d’emploi, à titre transitoire, des grilles de désenfumage avec détecteur incorporé dans les bâtiments d’habitation

Par une lettre en date du 25 août 1986, dont le signataire est F. Godlewski, le MELATT précise : « J’ai l’honneur de vous confirmer l’accord de la direction de la Construction pour l’utilisation de grilles de désenfumage sur conduits shunts. « Il est entendu que ces matériels doivent répondre aux prescriptions de l’arrêté du 31 janvier 1986 relatif à la protection contre l’incendie des bâtiments d’habitation. « Dans la mesure où vous disposez actuellement de grilles de désenfumage avec détecteurs incorporés, accord est donné à titre transitoire à l’utilisation de tels matériels, pour les paliers de moins de 15 m² . Cette autorisation exceptionnelle est accordée afin que vous puissiez écouler votre stock en quelques mois. En effet, l’autorisation d’utiliser lesdites grilles, et ce quelle que soit la date du permis de construire, ne pourra être reconduite au-delà du mois de février 1987. »

QUESTION/REPONSE - MELATT, 15 JUILLET 1987 Quelles sont les hauteurs minimales de recouvrement des conduits « shunts » tant pour les bâtiments neufs que pour les bâtiments existants (1)

Au vu de l’ensemble de l’étude réalisée par le CSTB relative aux calculs d’orientation sur l’interaction incendie-ventilation par conduit « shunt », les hauteurs minimales de recouvrement admises après mise en œuvre sont les suivantes :

- dans les bâtiments neufs, la hauteur minimale de recouvrement après mise en œuvre doit être supérieure ou égale à 1,30 m ;

- dans les bâtiments existants, il est admis que cette hauteur soit limitée à 0,80 m sous réserve que le débouché à l’air libre respecte les prescriptions de l’article 18 de l’arrêté du 22 octobre 1969 relatif aux conduits de fumée desservant les logements (2). Si toutefois cette dernière prescription ne peut pas être respectée, les bouches d’arrivée et les bouches d’évacuation doivent être munies de volets tels que définis dans l’arrêté du 31 janvier 1986 relatif à la protection contre l’incendie des bâtiments d’habitation. Il est entendu que les mesures dérogatoires prévues ci-dessus ne valent que pour les installations existantes, et ce afin de clarifier la situation. En aucun cas, il ne sera admis une hauteur de recouvrement inférieure à 1,30 m pour les installations nouvelles. Nota : (1) Pour les bâtiments existants, les mesures indiquées doivent être mises en application dans le cadre de la circulaire du 13 décembre 1982 relative à la sécurité des personnes en cas de travaux de réhabilitation ou d’amélioration des bâtiments d’habitation existants (2) Arrêté du 22 octobre 1969, article 18 : « Les orifices extérieurs des conduits à tirages naturels, individuels ou collectifs doivent être situés à 0,40 m au moins au-dessous de toute partie de construction distante de moins de 8 m sauf si, du fait de la faible dimension de cette partie de construction, il n’y a pas de risque que l’orifice extérieur du conduit se trouve dans une zone de surpression. Par exception à cette règle, dans le cas d’une toiture à pente supérieure à 15 ° , s’il n’existe aucune partie de construction dépassant le faîtage et distante de moins de 8 m et si l’orifice du conduit est surmonté d’un dispositif antirefouleur, cet orifice peut être placé au niveau du faîtage. En outre, dans le cas de toitures-terrasses ou de toits à pente inférieure à 15 ° , ces orifices doivent être situés à 1,20 m au moins au-dessus du point de sortie sur la toiture et à 1 m au moins au-dessus de l’acrotère lorsque celui-ci a plus de 0,20 m ».


QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 19 AVRIL 1990 La commande automatique des volets de désenfumage doit-elle être « à rupture de courant » ou à « impulsion-émission »

L’arrêté relatif à la protection contre l’incendie dans les bâtiments d’habitation indique, dans son article 34, les différentes exigences imposées aux conduits et volets de désenfumage, sans préciser d’exigence concernant les commandes de ces volets. Les principes de sécurité concernant ces volets sont leur maintien en position fermée normalement, et, en cas d’incendie, l’ouverture de ces volets au niveau sinistré. Il est évident qu’une anomalie sur le réseau d’alimentation de ces volets ne doit en aucun cas provoquer l’ouverture intempestive de ceux-ci. Cette ouverture intempestive provoquerait, en cas d’emploi d’un conduit collectif, un risque grave, tous les niveaux supérieurs au niveau sinistré risquant alors d’être enfumés. A ce titre, l’emploi de commande de volets à « impulsion-émission » sur des conduits collectifs semble préférable car les volets restent fermés en cas de non-alimentation. Un projet de norme (3) relatif aux systèmes de sécurité incendie et aux dispositifs actionnés de sécurité va d’ailleurs dans ce sens, en interdisant notamment l’emploi de commande à « rupture de courant » pour commander les volets des conduits collectifs. Nota : (3) Depuis l’émission de cette réponse, la norme NF S 61-937, relative aux systèmes de sécurité incendie, dispositifs actionnés de sécurité, est parue en décembre 1990 ; elle définit l’ensemble des mesures visant à assurer l’aptitude à la fonction des dispositifs actionnés de sécurité (DAS). Parmi ces DAS, la norme précise les mesures concernant les équipements suivants : annexe A – fiche IV : volet pour conduit collectif ; annexe A – fiche V : volet pour conduit unitaire ou collecteur. A noter que la télécommande par rupture de courant ou par manque de pression est interdite sur les volets pour conduit collectif`
  },
  "35": {
    texte: `Les bouches d’amenée d’air et les bouches d’évacuation doivent avoir au moment de l’incendie et dans la circulation sinistrée une section libre minimale de 20 dm² . Les bouches d’amenée d’air et les bouches d’évacuation doivent être réparties de façon alternée dans la circulation horizontale, la distance horizontale entre deux bouches de nature différente ne devant pas excéder 10 m dans le cas d’un parcours rectiligne et 7 m dans le cas d’un parcours non rectiligne. Toute porte palière de logement non située entre une bouche d’amenée et une bouche d’évacuation doit être située à 5 m au plus d’une bouche. Lorsque les dispositions de la circulation conduisent à réaliser plusieurs bouches d’évacuation et d’amenée d’air, les surfaces totales de chacune de ces catégories de bouches doivent être équivalentes. S’il n’est pas possible d’obtenir une telle équivalence les bouches doivent être établies de manière que la surface totale des bouches d’évacuation soit comprise entre 0,5 et 1 fois celle des bouches d’amenée d’air. La partie basse de la bouche d’évacuation doit être située à 1,80 m au moins au-dessus du plancher bas de la circulation et être située en totalité dans le tiers supérieur de celle-ci ; la partie haute de la bouche d’amenée d’air doit être située à 1 m au plus au-dessus du niveau du plancher bas de la circulation. L’amenée d’air dans les halls d’entrée peut être réalisée par la porte donnant sur l’extérieur.`,
    commentaire: `Il est à noter que, bien que l’illustration ne le montre pas, les bouches sont normalement raccordées à des conduits conformes aux dispositions de l’article 34.`
  },
  "36": {
    texte: `La manœuvre des volets prévus à l’article 34 ci-dessus assurant l’ouverture des bouches d’amenée d’air et des bouches d’évacuation à l’étage sinistré est commandée par l’action de détecteurs sensibles aux fumées et gaz de combustion (4). Nota : (4) Conformes aux normes françaises les concernant Le fonctionnement d’un ou plusieurs détecteurs dans la circulation sinistrée doit entraîner simultanément le non fonctionnement automatique des volets placés dans les circulations non sinistrées des autres étages. Cette prescription ne s’applique pas au cas des shunts.

L’ouverture automatique des bouches doit pouvoir être assurée en permanence ; le dispositif doit être doublé par une commande manuelle située dans l’escalier à proximité de la porte palière. Les détecteurs doivent être situés dans l’axe de la circulation et en nombre tel que la distance entre un détecteur et une porte palière d’appartement n’excède pas 10 m.

QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 19 AVRIL 1990 La commande automatique des volets de désenfumage doit-elle être « à rupture de courant » ou à « impulsion-émission »

Se référer à la question/réponse de l’article 34, ci-avant.

QUESTION/REPONSE - COMMISSION DU REGLEMENT DE CONSTRUCTION, 25 JUIN 1997 Pour les bâtiments classés en 3ème famille B et en 4ème famille, le désenfumage doit-il être mis en oeuvre obligatoirement au moyen d’un système de sécurité incendie (SSI)

La mise en oeuvre d’un système de sécurité incendie pour les bâtiments d’habitation n’est pas obligatoire.`
  },
  "37": {
    texte: `Le système mécanique de désenfumage doit assurer un débit minimal d’extraction de 1 m3/s par bouche d’extraction avec un débit total d’extraction au moins égal à n/2 m3 par seconde, n étant le nombre de bouches d’amenée d’air dans la circulation. La mise en marche du ou des ventilateurs, ainsi que l’ouverture des volets, doit être commandée par l’action de détecteurs sensibles aux fumées et gaz de combustion placés comme indiqué à l’article 36. Le désenfumage doit, en outre, pouvoir fonctionner par tirage naturel en cas de non-fonctionnement du ventilateur. Pour répondre à cette disposition, les conduits d’extraction doivent comporter à leur

extrémité supérieure un dispositif permettant leur ouverture sur l’extérieur selon une section égale à la section du conduit. Cette ouverture doit être commandée par un défaut de fonctionnement du ventilateur. La distance du débouché à l’air libre des conduits de désenfumage par rapport aux obstacles plus élevés qu’eux doit être au moins égale à la hauteur de ces obstacles sans toutefois excéder 8 m. Les ventilateurs d’extraction doivent normalement assurer leur fonction pendant 1 h avec des fumées à 400 °C. L’alimentation électrique des ventilateurs doit trouver son origine avant l’organe de coupure générale du bâtiment et être protégée de façon à ne pas être affectée par un incident survenant sur les autres circuits ; elle ne doit pas traverser sans protection des locaux présentant des risques particuliers d’incendie.`
  },
  "38": {
    texte: `La ventilation permanente des circulations horizontales peut utiliser les installations de désenfumage visées ci-dessus lorsqu’elles sont munies de volets. Dans ce cas, des dispositions particulières doivent être prises de manière que le système ne permette pas la propagation des fumées vers d’autres étages.

PROTEGE ET UNE CIRCULATION HORIZONTALE PROTEGEE 3 EME FAMILLE B`
  },
  "39": {
    texte: `Dans les habitations de la 3ème famille B les dégagements protégés doivent comporter :

a) Un escalier conforme aux dispositions des articles 18 à 29 ci-dessus qui peut être soit « à l’air libre », soit « à l’abri des fumées ». S’il est réalisé plusieurs escaliers, ils doivent tous être protégés ;

b) Une circulation horizontale reliant directement chaque logement à un escalier protégé ou à l’extérieur pour les logements du rez-de-chaussée, circulation qui peut être :

- soit désenfumée par deux ouvrants sur des façades opposées asservis à la détection des fumées et permettant un balayage efficace des fumées ; la section minimale de ces ouvrants est précisée en annexe I au présent arrêté ;

- soit « protégée » conformément aux dispositions des articles 30 à 38 ci-dessus. ANNEXE I – DESENFUMAGE DES CIRCULATIONS HORIZONTALES PAR DEUX OUVRANTS SITUES SUR DES FAÅADES OPPOSEES L’exigence minimale de l’article 39 b est réputée satisfaite lorsque les ouvrants ouvrent à au moins 60 ° et libèrent pour l’évacuation des fumées une surface géométrique minimale de 2 m² située à plus de 2 m de hauteur et, pour l’amenée d’air, une surface géométrique minimale de 4 m² située en dessous de 2 m de hauteur. S’il peut être fait état pour l’ouvrant d’une détermination expérimentale du coefficient aéraulique ou si la hauteur de la circulation sous plafond excède 2,50 m, on peut utiliser les formules suivantes, où : hm : hauteur moyenne de l’ouvrant (en m) ; Couv : coefficient aéraulique de l’ouvrant (sans unité). Trois cas de surface géométrique de l’ouvrant comptant pour l’évacuation des fumées (en m²) : 1 hm − 2 FOR.1 1 Couv FOR.2 1 22 ××− Ch ouv m FOR.3 La surface géométrique de l’ouvrant comptant pour l’amenée d’air est, dans le cas de l’utilisation des formules précédentes, prise égale au double de celle calculée pour l’évacuation des fumées ; elle doit être située en dessous de 2 m de hauteur. (Arrêté du 18 août 1986) La formule (voir FOR.1) s’applique si hm est supérieur à 2,25 m et Couv n’est pas connu. La formule (voir FOR.2) s’applique si hm n’est pas connu et si Couv est supérieur à 0,5 (déterminé expérimentalement). La formule (voir FOR.3) s’applique si hm est supérieur à 2,25 m et si Couv est supérieur à 0,5 (déterminé expérimentalement).`
  },
  "40": {
    texte: `Les dégagements protégés des habitations de la 4ème famille doivent être tels que les fumées et les gaz de combustion produits dans la circulation sinistrée ne puissent pénétrer dans l’escalier desservant les logements concernés. Cette exigence peut être satisfaite par l’une des solutions décrites ci-après et dont le choix appartient aux constructeurs du bâtiment.`
  },
  "41": {
    texte: `Les dégagements protégés doivent comporter :

a) Deux escaliers protégés conformes aux dispositions des articles 27 à 29 ci-avant. Ces escaliers doivent être distants de 10 m au moins ;

b) Une circulation horizontale protégée qui relie directement chaque logement aux deux escaliers protégés ou à l’extérieur pour les logements du rez-de-chaussée. Cette circulation horizontale protégée peut être « à l’air libre » ou « à l’abri des fumées ». Si elle est à l’air libre, elle doit être conforme à l’article 30 ci-avant.

Si elle est à l’abri des fumées, elle doit être désenfumée par extraction mécanique et être conforme aux dispositions des articles 31 à 38 ci-avant.`
  },
  "42": {
    texte: `Les dégagements protégés doivent comporter :

a) Un escalier protégé conforme aux dispositions des articles 27 à 29 ci-avant ;

b) Une circulation horizontale protégée qui relie chaque logement à l’escalier protégé ou à l’extérieur pour les logements du rez-de-chaussée. Cette circulation horizontale protégée peut être soit à l’air libre, soit à l’abri des fumées. Si elle est à l’air libre, elle doit être conforme à l’article 30 ci-avant. Si elle est à l’abri des fumées, elle doit être désenfumée par extraction mécanique et être conforme aux dispositions des articles 31 à 38 ci-avant. Toutefois, l’amenée d’air peut également s’effectuer par l’intermédiaire d’une ouverture d’au moins 20 dm² de section dont le bord supérieur est situé au plus à 1 m du sol fini et qui est réalisée dans la paroi qui sépare la circulation horizontale du local à l’air libre visé en c) ci-après. Cette ouverture doit être fermée en temps normal par un volet pareflammes 1 heure dont le fonctionnement est assuré dans les mêmes conditions que celui des bouches d’amenée d’air (article 36).

c) Un volume séparant à chaque niveau la circulation horizontale protégée de l’escalier protégé. Ce volume doit comporter une ouverture permanente à l’air libre d’une surface au moins égale à 2 m² ; il ne doit pas comporter de vidoir à ordures ni dépôt quelconque. Les blocs-portes de ce volume doivent être pare-flammes de degré 1/2 heure, leurs portes doivent être munies de ferme-portes et s’ouvrir, toutes les deux, dans le sens de la sortie en venant des logements.

Ce volume n’est pas nécessaire lorsque la circulation horizontale protégée ou l’escalier protégé est à l’air libre. FIG 5 : ARTICLE 42`
  },
  "43": {
    texte: `Les dégagements protégés doivent comporter :

a) Un escalier à l’abri des fumées conforme aux dispositions des articles 27 et 29 qui doit, en outre, pouvoir être mis en surpression par un ventilateur fixe de telle sorte qu’à chaque niveau pris séparément soit assuré un débit minimal de passage entre l’escalier et le sas visé en c), ci-après, de 0,8 m3 /s, lorsqu’à ce niveau et à ce niveau seulement les deux portes du sas sont ouvertes et le système de désenfumage en fonctionnement ;

b) Une circulation horizontale à l’abri des fumées qui relie chaque logement à un escalier à l’abri des fumées ou à l’extérieur pour les logements du rez-de-chaussée. Elle doit être désenfumée par extraction mécanique et être conforme aux dispositions des articles 31 à 38. Toutefois, cette circulation ne doit pas comporter de conduits d’amenée d’air, cette dernière devant s’effectuer par l’intermédiaire d’une ouverture d’au moins 20 dm² de section dont le bord supérieur est situé au plus à 1 m du sol fini et qui est réalisée dans la paroi séparant la circulation horizontale du sas ventilé visé en c) ci-après ; cette section peut être augmentée pour respecter les dispositions de l’article 35, 4ème alinéa, dans le cas où il y a plusieurs bouches d’évacuation. (Arrêté du 18 août 1986) Cette ouverture doit être équipée d’un volet pare-flammes de degré 1 heure, ouvert en position normale et dont la fermeture est assurée par un déclencheur thermique fonctionnant à 70 °C. Ce déclencheur doit être situé à la partie supérieure du volet, côté circulation. De plus, le débit d’extraction dans la circulation doit être égal au moins à 1,3 fois le débit de soufflage venant du sas et de l’escalier lorsque les deux portes du sas sont ouvertes ;

c) Un sas ventilé d’une surface d’environ 3 m² séparant à chaque niveau la circulation horizontale protégée de l’escalier à l’abri des fumées. Les blocs-portes de ce sas doivent être pare-flammes de degré 1/2 heure, leurs portes doivent être munies d’un ferme-porte et s’ouvrir toutes les deux dans le sens de la sortie en venant des logements. Le sas doit comporter une amenée d’air frais réalisée dans les conditions définies ci-après. La pression à l’intérieur du sas doit être intermédiaire entre celle existant dans l’escalier et celle existant dans la circulation horizontale. (Arrêté du 18 août 1986) L’amenée d’air frais dans le sas doit être réalisée par soufflage mécanique et le réseau doit être constitué par un conduit collectif et, éventuellement, des raccordements horizontaux à chaque étage. Le conduit doit être réalisé en matériaux incombustibles, coupe-feu de degré 1 heure et satisfaire aux conditions d’étanchéité requises pour l’usage auquel il est destiné. Le conduit et les raccordements d’étage doivent avoir une section libre minimale de 20 dm² ; le rapport de la plus grande dimension de la section à la plus petite ne doit pas excéder 2. La longueur des raccordements horizontaux d’étage ne doit pas excéder 2 m. Les bouches placées sur ce conduit doivent toujours être fermées en temps normal, sauf à mettre en œuvre les dispositions prévues à l’article 38 ci-avant, par des volets réalisés en matériaux incombustibles et pare-flammes de degré 1 heure. La commande de ces volets doit se faire conformément à l’article 36 ci-avant. Les bouches d’amenée d’air doivent avoir au moment de l’incendie une section libre minimale de 20 dm2 ; la partie basse de la bouche doit être située à 1,80 m au moins au-dessus du plancher du sas et la bouche doit être située en totalité dans le tiers supérieur. La ventilation de soufflage doit réaliser un débit minimal de passage entre le sas et la circulation horizontale de 1,6 m3/s lorsque les deux portes du sas sont ouvertes et le système de désenfumage en fonctionnement.

◆ QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 14 AVRIL 1987 Le terme « protégé » employé à la première phrase de l’article 43 exclut-il le terme « à l’air libre » comme pourrait le faire penser la formulation des paragraphes a) et b)

Le terme « protégé » inclut les deux notions « à l’air libre » et « à l’abri des fumées ». Selon les solutions retenues, il est demandé des escaliers à l’air libre ou à l’abri des fumées.`
  },
  "44": {
    texte: `Pour l’application du présent arrêté, on appelle : Conduit : volume fermé servant au passage d’un fluide déterminé ; Gaine : volume fermé généralement accessible et renfermant un ou plusieurs conduits ; Volet : dispositif d’obturation placé à l’extrémité d’un conduit ; il peut être ouvert ou fermé en position d’attente ; il est à commande automatique ou manuelle ; Clapet : dispositif d’obturation placé à l’intérieur d’un conduit ; il est normalement en position d’ouverture ; Trappe : dispositif d’accès, fermé en position normale ; Coffrage : habillage utilisé pour dissimuler un ou plusieurs conduits, dont les parois ne présentent pas de qualité de résistance au feu et qui ne relient pas plusieurs locaux ou niveaux ; Coupe-feu de traversée d’une gaine ou d’un conduit : temps réel défini par les essais réglementaires pendant lequel une gaine ou un conduit traversant la paroi coupe-feu séparant deux locaux satisfait au critère coupe-feu exigé entre ces deux locaux, compte tenu de la présence éventuelle d’un clapet au sein du conduit (l’essai de clapet étant effectué sous pression de 500 Pa ou, pour les circuits d’extraction d’air, sous pression de service si celle-ci est supérieure à 500 Pa au droit du clapet). Ce critère doit être respecté jusqu’à la prochaine paroi coupe-feu franchie.`
  },
  "45": {
    texte: `Les conduits ou gaines traversant des murs ou des planchers peuvent altérer les caractéristiques de résistance au feu de ces parois. Il convient, en conséquence, de prendre les mesures nécessaires pour rétablir les caractéristiques convenables.

Pour les conduits et gaines aménagés dans les bâtiments individuels de première et 2ème familles, aucune prescription n’est imposée. Pour les conduits et gaines dans les bâtiments collectifs de 2ème famille et les bâtiments des 3ème et 4ème familles, les objectifs définis ci-dessus peuvent être atteints :

- soit par l’emploi de conduits et gaines assurant un « coupe-feu de traversée » d’une durée au moins égale au degré de résistance au feu de la paroi traversée avec un maximum de 60 minutes ;

- soit par l’utilisation de dispositifs d’obturation ayant obtenu un avis favorable du Comité d’étude et de classification des matériaux et éléments de construction par rapport au danger incendie (Cecmi) ;

- soit par le respect des dispositions fixées au présent titre. ◆ QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 23 DECEMBRE 1986 Existe-t-il des prescriptions concernant les traversées de parois par des conduits ou des gaines lorsque deux niveaux successifs appartiennent au même logement

Il n’y a pas de prescription quand deux niveaux successifs appartiennent au même logement.

AUX BATIMENTS D'HABITATION Version 2 Origine : Direction Développement Construction & GPI Auteur : J.P. Henry FD Date de diffusion : 10 août 2015 Fascicule annulé : Version 1 d’Avril 1998 DIFFERENTS`
  },
  "46": {
    texte: `Les conduits mettant en communication des niveaux différents ne sont pas nécessairement incorporés dans une gaine lorsqu’ils sont situés dans les logements ou des circulations horizontales communes et réalisés en matériaux incombustibles ou en PVC M1 avec renforcement, d’un diamètre au plus égal à 125 mm et à condition que l’espace libre autour des conduits à chaque niveau soit rebouché sur toute l’épaisseur du plancher par des matériaux incombustibles.`
  },
  "47": {
    texte: `Les conduits, y compris les calorifugeages éventuels, réalisés en matériaux de catégorie M1, les canalisations constamment en charge d’eau réalisées en matériaux M4, les canalisations à passage d’eau intermittent réalisées en matériaux de catégorie M1, d’un diamètre au plus égal à 125 mm peuvent être contenus dans un coffrage. Le recoupement du coffrage est obligatoire à tous les niveaux. Il doit être réalisé en matériaux incombustibles occupant sur toute l’épaisseur du plancher la totalité de l’espace restant libre autour des conduits.

QUESTION/REPONSE MINISTERE DE L’EQUIPEMENT, 23 DECEMBRE 1986 Les coffrages doivent-ils faire l’objet d’une protection particulière

Un coffrage répond à des préoccupations d’ordre esthétique. Ses parois ne doivent donc pas présenter de qualité de résistance au feu particulière.`
  },
  "48": {
    texte: `Les conduits, y compris les calorifugeages éventuels, réalisés en matériaux des catégories M2 à M4 doivent, sauf exception visée à l’article 49 ci-après, être contenus dans une gaine dont les parois sont coupe-feu de degré 1/2 heure dans les habitations collectives de la 2ème famille et dans les habitations des 3ème et 4ème familles, que le feu se situe à l’intérieur ou à l’extérieur de la gaine. Les trappes et portes de visites aménagées dans ces gaines doivent être coupe-feu de degré 1/4 d’heure si leur surface est inférieure à 0,25 m², 1/2 heure au-delà. Toutefois, lorsque le recoupement des gaines visées ci-dessus est réalisé tous les niveaux en matériaux incombustibles (de classement A1), les trappes et portes de visites aménagées dans ces gaines sont coupe-feu de degré un quart d’heure (de classement EI15).

Le recoupement de la gaine est obligatoire au niveau du plancher haut du sous-sol et au niveau du plancher haut des locaux techniques ; en outre, dans les habitations de la 4ème famille, il est obligatoire tous les deux niveaux au moins. Ce recoupement doit être réalisé en matériaux incombustibles.

Il n’y a pas d’atténuation des prescriptions pour les conduits classés M1 d’un diamètre supérieur à 125 mm par rapport aux conduits classés M2 à M4 . Nota : Ce commentaire est issu du ministère de l'Équipement et du Logement, en date du 23 décembre 1986.

QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 23 DECEMBRE 1986 Le paragraphe 5 de l’article 49 vise-t-il les conduits d’un diamètre inférieur à 125 mm classés M2 à M4

Le paragraphe 5 de l’article 49 vise bien les conduits classés M2 à M4 d’un diamètre inférieur à 125 mm.

QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 6 OCTOBRE 1987 Quelle est la résistance au feu exigée pour des gaines contenant des conduites de gaz et des canalisations électriques

Dans le cas de gaines communes (conduites électriques et gaz), le degré de résistance au feu des parois de la gaine doit être celui indiqué à l’article 48. Le degré de résistance au feu imposé aux articles 50 à 58 est moins sévère que celui requis par l’article 48 dans la mesure où une conduite gaz est constituée de matériaux incombustibles. Mais en cas de voisinage avec d’autres conduites de nature différente, cette souplesse n’a plus lieu d’être.`
  },
  "49": {
    texte: `SONT EXIGEES DES PROPRIETES DE RESISTANCE AU FEU

1°) Les conduits réalisés en matériaux classés en catégorie M4 doivent, sauf exceptions visées en

2° , 3° , 4° et 5° ci-après, être contenus dans des gaines. Ces gaines doivent avoir de part et d’autre des parois traversées une résistance au feu de degré moitié de la résistance au feu desdites parois, que le feu soit à l’extérieur ou à l’intérieur de la gaine.

2°) Les conduits non incorporés dans une gaine doivent être réalisés en matériaux :

- incombustibles si les murs traversés séparent un logement d’un local visé à l’article 9 ou d’un sous-sol ;

- incombustibles ou classés en catégorie M1 pour les diamètres au plus égaux à 125 mm si les murs traversés séparent deux logements.

3°) Les conduits d’aération des gaines, à l’exception de ceux visés à l’article 34, doivent être traités comme la gaine elle-même.

4°) Les conduits de ventilation des logements traversant des sous-sols, caves ou locaux visés à l’article 9 ci-avant doivent présenter les mêmes caractéristiques que les gaines visées en 1° ci-avant.

5°) Les conduits autres que ceux visés en 3° et 4° ci-dessus traversant les caves et sous-sols ne sont soumis à aucune prescription sauf en ce qui concerne les conduits de diamètre supérieur à 125 mm qui doivent être réalisés en matériaux incombustibles ou classés en catégorie M1 au moins.

6°) Lorsque les gaines sont placées entre logements ou entre logements et circulations, elles doivent également assurer les performances demandées aux parois séparatives en cause et fixées aux articles 7 à 9. ■ Il n’est pas imposé de gaines pour les conduits de ventilation de logements traversant des sous-sols, caves ou locaux des ERP dans la mesure où ces conduits répondent aux prescriptions de l’article 59. Nota : Ce commentaire est issu du ministère de l'Équipement et du Logement ◆ QUESTIONS/REPONSES - MINISTERE DE L’EQUIPEMENT, 23 DECEMBRE 1986 Que signifie le terme « sous-sol » au 2° de l’article 49

Il est effectivement évoqué la possibilité d’un mur séparant un logement d’un sous-sol. Le terme « sous-sol » recouvre ici les notions de cave ou cellier – par référence aux risques particuliers que présentent ces locaux – et n’implique donc pas la présence d’un logement en sous-sol. Le paragraphe 5 de l’article 49 vise-t-il les conduits d’un diamètre inférieur à 125 mm classés M2 à M4

Se référer à la question/réponse de l’article 48, ci-avant.

AUX BATIMENTS D'HABITATION Version 2 GAINES ET CONDUITES MONTANTES DE GAZ 24 juin 2015 Origine : Direction Développement Construction & GPI Auteur : J.P. Henry FD Date de diffusion : 10 août 2015 Fascicule annulé : Version 1 d’Avril 1998`
  },
  "50": {
    texte: `Les gaines pour conduites montantes de gaz doivent être établies de manière :

- à éviter que le gaz provenant d’une fuite éventuelle sur la conduite montante ou les appareillages raccordés puisse se répandre dans les circulations communes ;

- à rejeter vers l’extérieur le gaz provenant d’une telle fuite ;

- à limiter les effets d’une explosion éventuelle afin de ne pas empêcher l’utilisation de l’escalier protégé. Sont réputées satisfaire aux exigences du présent article les installations pour conduites montantes de gaz réalisées conformément aux dispositions du présent chapitre.


QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 14 AVRIL 1987 Que signifie le dernier alinéa de l’article 50, ci-avant

L’article 50 a un objectif pédagogique et précise les obligations de résultats. Les articles suivants donnent un ensemble de mesures descriptives permettant d’obtenir les résultats demandés initialement par l’article 50.`
  },
  "51": {
    texte: `Dans les habitations collectives de la 2ème famille, les gaines pour conduites montantes de gaz doivent être accessibles et visitables depuis les parties communes de l’immeuble. Les gaines contenant des tiges après compteur peuvent être placées en parties communes ou à l’intérieur du volume habitable. Elles ne sont soumises à aucune autre prescription particulière.

QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 23 DECEMBRE 1987 Existe-t-il des mesures concernant la ventilation de la gaine et les tiges après compteur

Les gaines contenant des tiges après compteur ne sont soumises à aucune prescription particulière. Il n’est pas demandé une ventilation particulière pour les gaines pour conduites montantes de gaz en 2ème famille.`
  },
  "52": {
    texte: `Dans les habitations des 3ème et 4ème familles les gaines et conduites montantes de gaz doivent répondre aux dispositions des articles 53 à 56 ci-après.`
  },
  "53": {
    texte: `1°) Les gaines pour conduites montantes doivent être accessibles et visitables depuis les parties communes de l’immeuble.

2°) Le recoupement de la gaine est obligatoire au niveau du plancher haut du sous-sol. Ce recoupement doit être réalisé en matériaux incombustibles. A chaque traversée de plancher, la gaine doit comporter un passage libre d’au moins 100 cm². Toutefois si la gaine est recoupée en plusieurs compartiments superposés, chacun d’entre eux doit être ventilé dans les conditions des articles 53, 5° ; 53, 6° , ou 55.

3°) A. La ventilation de la gaine peut être réalisée par tirage naturel ou par extraction mécanique directe.

1. Cas du tirage naturel :

a) A sa partie supérieure, la gaine est ouverte sur l’extérieur par un orifice d’au moins 150 cm² protégé contre l’introduction de la pluie ;

b) A sa partie basse, la gaine est en communication avec l’extérieur :

- soit directement par l’intermédiaire d’un orifice ou d’un conduit ;

- soit indirectement par l’intermédiaire d’un orifice ou d’un conduit débouchant en partie basse dans un volume ventilé (hall d’immeuble, local commun, circulation commune horizontale, vide sanitaire ventilé...).

La section de ces orifices et conduits ne peut être inférieure à 100 cm² . 2. Cas de l’extraction mécanique : Les sections minimales indiquées aux paragraphes 2° et 3° du présent article ne sont pas imposées dans ce cas. B. De plus, dans le cas d’une distribution de gaz plus lourds que l’air, la prise d’air se fait soit directement sur l’extérieur, soit sur un espace ventilé et situé au-dessus du sol extérieur. En aucun cas la prise ne doit se faire dans un sous-sol, même ventilé, ni en vide sanitaire.

4°) Lorsque l’amenée d’air à la gaine se fait par un conduit qui traverse un sous-sol ou un vide sanitaire, les parois de ce conduit doivent être coupe-feu de même degré que celui des planchers traversés.

5°) Lorsque l’installation de gaz contenue dans la gaine ne comporte aucun raccord mécanique, aucune prescription particulière n’est applicable aux parois de la gaine. De plus, la gaine peut être recoupée en plusieurs compartiments à la condition que chacun d’eux comporte un orifice de ventilation de 50 cm² environ pratiqué dans une paroi accessible depuis une partie commune de l’immeuble et situé en partie haute de cette paroi pour les gaz plus légers que l’air et en partie basse pour les gaz plus lourds que l’air.

6°) Si l’une des parois de la gaine donne directement sur l’extérieur, la gaine peut être recoupée en plusieurs compartiments comportant chacun en partie basse une amenée d’air de 50 cm² et en partie haute une sortie d’air de 50 cm² établies dans la paroi donnant sur l’extérieur.

7°) Une gaine commune aux conduites montantes de gaz et à d’autres conduits, gaines ou canalisations électriques, doit répondre aux prescriptions de la présente section. En outre, la partie de gaine réservée à la conduite montante de gaz doit être séparée du reste du volume de la gaine lorsque la conduite montante comporte des assemblages mécaniques. La paroi de séparation sera pare-flammes 1/4 d’heure et réalisée en matériaux incombustibles. La paroi peut ne pas utiliser toute la profondeur de la gaine commune si cette dernière dimension excède 30 cm.

Décision interministérielle n° 26919 du 7 juillet 1994, relative à l’installation de matériels faisant appel à une source d’énergie électrique dans des gaines ou locaux techniques gaz. Le ministère de l’Industrie, des Postes et Télécommunications et du Commerce extérieur et le ministre du Logement, Vu l’arrêté modifié du 2 août 1977 relatif aux règles techniques et de sécurité applicables aux installations de gaz combustible et d’hydrocarbures liquéfiés situées à l’intérieur des bâtiments d’habitation ou de leurs dépendances, notamment son article 7, 5° a ; Vu l’arrêté du 9 août 1978 modifié concernant les dispositions relatives à la construction du matériel électrique utilisable en atmosphère explosive dans les lieux autres que les mines grisouteuses ; Vu l’avis en date du 28 avril 1994 du Comité technique de la distribution du gaz ; Sur la proposition du directeur de l’Action régionale et de la Petite et Moyenne Industrie, Décident : Article 1 premier Par dérogation aux dispositions du 5° a de l’article 7 de l’arrêté du 2 août 1977 susvisé est autorisée l’installation de matériels faisant appel à une source d’énergie électrique dans des gaines ou locaux techniques gaz sous réserve que ceux-ci respectent les prescriptions figurant aux articles 2 à 4 ci-après. Article 2 Les matériels concernés par la présente décision sont :

- les compteurs de volume de gaz dotés d’éléments électroniques alimentés par une pile ou par une source d’énergie extérieure ;

- les équipements électroniques associés, implantés ou non en zone explosible, permettant la transmission ou le traitement d’informations stockées dans un compteur de volume de gaz ;

- les liaisons électriques entre les compteurs de gaz et les équipements électroniques associés.

Article 3 Le mode de protection des matériels visés à l’article 2 ci-dessus doit être de type « sécurité intrinsèque », tel que défini par les dispositions de l’article 2 de l’arrêté du 9 août 1978 susvisé. Les compteurs et équipements doivent avoir été certifiés conformément à leur destination et dans l’une ou l’autre des catégories « ia » ou « ib ». Nota : Les catégories « ia » et « ib » des matériels électriques sont définies aux § 5.2 et 5.3 de la norme NF EN 50020 (indice de classement : C 23-520), d’avril 1995. En outre, les agencements des matériels précités entre eux formant des systèmes électriques de sécurité intrinsèque doivent faire l’objet d’un « document descriptif système » conformément aux dispositions de la norme NF C 23-259, établi par le concepteur du système. Ces systèmes électriques doivent être certifiés comme étant de sécurité intrinsèque. Article 4 Les matériels et systèmes visés à l’article 3 ci-dessus doivent être certifiés conformément aux dispositions de l’arrêté du 9 août 1978 susvisé. Article 5 Le directeur de l’Action régionale et de la Petite et Moyenne Industrie, et le directeur de l’Habitat et de la Construction sont chargés, chacun en ce qui le concerne, de l’exécution de la présente décision qui sera publiée au Bulletin officiel du ministère de l’Industrie, des Postes et Télécommunications et du Commerce extérieur.`,
    commentaire: `La résistance au feu exigée pour des gaines contenant des conduites de gaz et des canalisations électriques est définie à la question/ réponse de l’article 48`
  },
  "54": {
    texte: `Les caractéristiques de résistance au feu des parois, des portes et trappes de visite de la gaine sont déterminées par le tableau ci-après. Situation de la gaine Famille En cage d’escalier En parties communes autres Parois Portes et trappes de visite (1) Parois Portes et trappes de visite (1) 3ème famille A PF 1/4 h PF 1/4 h PF 1/4 h PF 1/4 h 3ème famille B Solution interdite (2) Solution interdite (2) CF 1/4 h PF 1/4 h 4ème famille Solution interdite (2) Solution interdite (2) CF 1/2 h PF 1/2 h (1) Si le bloc-porte de la gaine donne dans une circulation horizontale protégée, le bloc-porte comportera une feuillure munie d’un joint destiné à lui assurer une étanchéité renforcée. (1) Les portes et trappes de visites peuvent comporter l’orifice indiqué à l’article 53 (3.A.1° b) (2) Cette solution est admise si l’escalier est « à l’air libre ». Dans ce cas, les prescriptions applicables sont celles des gaines en parties communes autres.`
  },
  "55": {
    texte: `Si la gaine est séparée des circulations communes par un local technique ou de service avec lequel elle communique et est ventilée par l’intermédiaire de ce local lui-même ventilé, elle doit répondre aux prescriptions ci-après :

1°) La gaine doit être recoupée à tous les niveaux.

2°) La ventilation du local communicant doit être assurée :

- soit par un conduit collecteur et des raccordements individuels de hauteur d’étage tant pour l’amenée que pour la sortie d’air ;

- soit par un système à extraction mécanique. Dans ce cas les raccordements individuels de hauteur d’étage ne sont pas exigés.

3°) La ventilation de chaque compartiment de la gaine recoupée doit se faire :

- par une amenée d’air provenant du local communicant, placée en partie basse de la cloison de séparation ;

- par une sortie d’air en partie haute, par conduit collecteur et raccordement individuel de hauteur d’étage. Ce conduit collecteur peut être confondu avec le conduit collecteur visé au 2° ci-dessus.

4°) Si les degrés pare-flammes ou coupe-feu des parois et du bloc-porte de l’ensemble gaine-local sont au moins équivalents à ceux que doivent posséder la gaine et sa porte selon l’article 54, la gaine et son bloc-porte pourront être pare-flammes de degré 1/4 d’heure.

QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 5 JANVIER 1987 Les prescriptions des articles 50 à 55 de l’arrêté du 31 janvier 1986 s’appliquent-elles aux tiges-cuisine

Les prescriptions des articles 50 à 55 de l’arrêté du 31 janvier 1986 ne s’appliquent pas aux tiges-cuisine. En effet, l’article 7 de l’arrêté du 2 août 1977 précise que la mise sous gaine des tiges-cuisine n’est pas obligatoire. Toutefois, ces mêmes tiges-cuisine doivent répondre aux prescriptions d’ordre général, et relatives aux conduits, de l’arrêté du 31 janvier 1986.`
  },
  "56": {
    texte: `1°) a) D’une manière générale, l’ensemble de l’installation de gaz sera réalisé conformément aux prescriptions de l’arrêté relatif aux règles techniques et de sécurité applicables aux installations de gaz combustible et d’hydrocarbures liquéfiés situées à l’intérieur des bâtiments d’habitation ou de leurs dépendances. Nota : Arrêté du 2 août 1977 (JO du 24 août 1977)

b) La conduite de gaz à usage collectif, depuis son entrée dans le bâtiment jusqu’à son débouché au pied de la gaine verticale, doit être placée dans une gaine ou protégée par un dispositif de protection

mécanique permettant l’aération, à moins qu’elle ne soit réalisée en tubes d’acier conformes à l’une des normes françaises citées dans l’arrêté visé au a) ci-dessus.

2°) La traversée par une installation de gaz à usage collectif d’un parc de stationnement couvert, annexe du bâtiment d’habitation, et tel qu’il est défini à l’article 78 du présent arrêté, est autorisée :

a) si les conduites sont placées sous une gaine ventilée, coupe-feu de degré 2 heures ;

b) si les conduites répondent aux prescriptions fixées par une instruction interministérielle l’instruction interministérielle du 24 juillet 1987, en l’absence de dispositions spécifiques de la réglementation portant sur la sécurité des installations intérieures de gaz

L’instruction ministérielle indiquée à la fin de cet article est l’instruction du 24 juillet 1987, modifiée par celle du 3 mai 1995 :.

D’APPAREILS A GAZ POUR LE CHAUFFAGE ET LA PRODUCTION D’EAU CHAUDE : ALVEOLES TECHNIQUES`
  },
  "57": {
    texte: `Les installations de gaz destinées au chauffage et à la production d’eau chaude sanitaire contenues dans les alvéoles techniques gaz doivent être conformes aux dispositions de l’arrêté du 2 août 1977 fixant les règles techniques et de sécurité applicables aux installations de gaz combustibles ou d’hydrocarbures liquéfiés à l’intérieur des bâtiments d’habitation ou de leurs dépendances. Nota : Les prescriptions de cet article s’appliquent aux bâtiments collectifs des 2ème , 3ème et 4ème familles

AUX BATIMENTS D'HABITATION Version 2 AUTRES GAINES 24 juin 2015 Origine : Direction Développement Construction & GPI Auteur : J.P. Henry FD Date de diffusion : 10 août 2015 Fascicule annulé : Version 1 d’Avril 1998`
  },
  "58": {
    texte: `Ces dispositions s’ajoutent aux dispositions générales prévues aux articles 44 à 49 relatifs aux conduits et gaines. Lorsque les colonnes montantes « électricité » sont mises en place dans les gaines contenant un ou plusieurs autres conduits, elles doivent être séparées de ces derniers par une paroi pare-flammes de degré 1/4 d’heure et réalisée en matériaux incombustibles. La paroi de séparation susvisée peut ne pas occuper toute la profondeur de la gaine commune si cette dernière dimension excède nettement la dimension de protection recherchée (30 cm).


QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 23 DECEMBRE 1986 Qu’applique-t-on si la colonne montante électrique est seule dans sa gaine

Que la colonne montante soit seule ou non dans sa gaine, l’ensemble des dispositions prévues aux articles 44 à 49 s’appliquent (voir premier alinéa de l’article ci-avant).

QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 25 JUIN 1990 Doit-on exiger, dans les bâtiments d’habitation, que les gaines des colonnes montantes « électricité » aient les mêmes caractéristiques que celles des colonnes montantes « gaz «

L’arrêté du 31 janvier 1986, dans ses articles 44 à 58, fixe les différentes exigences imposées aux gaines et conduits, notamment le degré de résistance au feu que doivent posséder ces différents éléments. Ces différentes exigences sont basées sur le classement de réaction au feu des différents conduits. Or il n’existe pas d’essai normalisé attestant du degré de réaction au feu des conduits électriques, d’où des problèmes d’interprétation de l’arrêté. Les conduits de gaz étant dans le même cas et le regroupement des conduits de gaz et des conduits électriques étant possible, comme le précise l’article 53, § 7 de l’arrêté du 31 janvier 1986, il semble logique d’exiger des gaines des colonnes montantes « électricité » qu’elles aient les mêmes caractéristiques que les gaines des colonnes montantes « gaz », fixées par l’article 54 du même arrêté.`
  },
  "59": {
    texte: `Dans les bâtiments collectifs, les installations de ventilation doivent être réalisées de manière à limiter la transmission des fumées et gaz de combustion d’un local en feu à un autre local et à limiter le refoulement de ces fumées et gaz par les bouches d’extraction. Dans tous les cas, tout conduit collectif de ventilation mécanique ou naturelle doit être réalisé en matériaux incombustibles ; l’ensemble de ce conduit et de son enveloppe éventuelle (calorifugeage et gaine) doit être coupe-feu de degré 1/4 d’heure dans les habitations collectives de la deuxième famille, coupe-feu de degré 1/2 heure dans les habitations de la troisième famille, coupe-feu de degré une heure dans les habitations de la quatrième famille.


Pour les traînasses horizontales de VMC sous combles, se reporter à l’article 6.`,
    commentaire: `Ventilation mécanique contrôlée dans l’habitat collectif : 1. Tout conduit collectif de ventilation doit être réalisé en matériaux incombustibles (voir article 59) : L’ensemble de ce conduit et de son enveloppe éventuelle (calorifugeage et gaine) doit être :

- CF 1/4 h dans les habitations collectives de la 2ème famille ;

- CF 1/2 h dans les habitations collectives de la 3ème famille ;

- CF 1 h dans les habitations collectives de la 4ème famille. 2. Le système de ventilation doit répondre à une des cinq solutions suivantes : Solution n° 1 (article 60 § 1) : Le fonctionnement du ventilateur est réputé assuré en permanence. L’alimentation électrique ne traversant pas des locaux à risque d’incendie, elle est protégée des incidents survenant sur les autres circuits ou elle est assurée par un groupe électrogène asservi aux coupures et vérifié tous les mois. La catégorie du ventilateur est définie selon l’annexe II de l’arrêté (article 60) Aucun clapet ne doit être placé dans les conduits. Solution n° 2 (article 60, § 2) : Chaque conduit de raccordement au conduit collectif est muni d’un clapet pare-flammes :

- 1/4 d’heure dans les habitations collectives des 2ème et 3ème familles ;

- 1/2 heure dans les habitations collectives de 4ème famille, actionné par un dispositif thermique à 70 °C. Les clapets sont contrôlables et remplaçables. Cette solution n’exclut pas la mise en place de clapets dans les conduits collectifs au droit des parois coupe-feu traversées, sauf pour une VMC inversée. Cette solution ne peut pas être mise en oeuvre dans le cas d’une VMC-gaz. Solution n 3 (article 61 § a, 61 § b1 et 61 § c) : Les bouches d’extraction sont stables au feu d’une durée équivalente à celle du conduit et leurs débits n’augmentent pas de plus de 25 % à 300 °C. La perte de charge d’une bouche et de son conduit de raccordement, pour chaque conduit collectif et à chaque niveau, est supérieure de 50 Pa à celle du réseau collectif, ventilateur à l’arrêt compris. La distance du débouché par rapport aux obstacles doit répondre aux conditions suivantes : D H, ou 8 m au minimum si H > 8 m. Aucun clapet ne doit être placé dans les conduits. Cette solution ne peut pas être mise en oeuvre dans le cas d’une VMC inversée. Solution n° 4 (voir article 61 § a; 61 § b2.1et 61 § c) : Les bouches d’extraction sont stables au feu d’une durée équivalente à celle du conduit et leurs débits n’augmentent pas de plus de 25 % à 300 °C. La perte de charge d’une bouche et de son conduit de raccordement, pour chaque conduit collectif et à chaque niveau, est supérieure de 50 Pa à celle du réseau collectif jusqu’à son débouché. L’exutoire sur l’extérieur, aménagé en partie haute de chaque conduit collectif, doit s’ouvrir à l’arrêt de la ventilation et se refermer à la remise en route. La surface libre de l’exutoire est égale à la section du conduit collectif.

La distance du débouché par rapport aux obstacles doit répondre aux conditions suivantes : D H, ou 8 m au minimum si H > 8 m. Aucun clapet ne doit être placé dans les conduits. Cette solution est compatible avec la mise en oeuvre d’une VMC inversée. Solution n° 5 (article 61 § a ; 61 § b2.2 et 61 § c) : Les bouches d’extraction sont stables au feu d’une durée équivalente à celle du conduit et leurs débits n’augmentent pas de plus de 25 % à 300 °C. La perte de charge d’une bouche et de son conduit de raccordement, pour chaque conduit collectif et à chaque niveau, est supérieure de 50 Pa à celle du réseau collectif jusqu’à son débouché. L’exutoire sur l’extérieur, aménagé sur le caisson en amont du ventilateur, doit s’ouvrir à l’arrêt de la ventilation et se refermer à la remise en route. La surface libre de l’exutoire est égale à la section totale d’aspiration. La distance du débouché par rapport aux obstacles doit répondre aux conditions suivantes : D H, ou 8 m au minimum si H > 8 m. Aucun clapet ne doit être placé dans les conduits. Cette solution ne peut pas être mise en oeuvre dans le cas d’une VMC inversée. 3. Cas d’une VMC inversée (article 62) L’air circule normalement de haut en bas dans des conduits collectifs. Le ventilateur doit être placé dans un local exclusivement réservé à cet usage. Le degré coupe-feu des parois du local doit être égal au degré de stabilité au feu du bâtiment. La porte doit être pare-flammes de degré 1/2 heure. Les systèmes compatibles avec la mise en oeuvre d’une VMC inversée sont les suivants :

- solution n° 1 : compatible ;

- solution n° 2 : compatible ;

- solution n° 3 : non compatible ;

- solution n° 4 : compatible ;

- solution n° 5 : non compatible. 4. Cas d’une ventilation « double flux » (voir article 62) Le réseau de soufflage est distinct du réseau d’extraction. La non-transmission des fumées aux autres niveaux peut être obtenue par le fonctionnement permanent du soufflage. Les systèmes compatibles avec la mise en oeuvre d’une ventilation « double flux « sont les suivants :

- solution n° 1 : compatible ;

- solution n° 2 : compatible ;

- solution n° 3 : non compatible ;

- solution n° 4 : non compatible ;

- solution n° 5 : non compatible. L’exigence de non-transmission des gaz et fumées est réputée satisfaite lorsque le système de ventilation utilise une des solutions regroupées dans le tableau) (voir TAB.1) les conduits verticaux devant respecter l’article 59.

Systèmes de ventilation mécanique contrôlée Identif- Exigences relatives aux matériels Utilisation ication de la solution Définition Ventilateur Bouches VMC simple flux VMC double flux VMC inversée VMC-gaz 1 Fonctionnement du ventilateur assuré en permanence Ventilateur de catégorie correspondant au taux de dilution Aucune Oui Oui Oui Oui 2 Bouche munie de volet pareflammes actionné par dispositif thermique à 70 °C Aucune exigence Aucune Oui Oui Oui Interdit 3 Règle des 50 Pa sans exutoire (article 61, § b1) Aucune exigence Bouches stables au feu Augmentation du débit limitée à + 25 % à 300 °C Oui Interdit Interdit Oui 4 Règle de 50 Pa avec exutoire en haut de chaque conduit (article 61, § b2.1) Aucune exigence Bouches stables au feu Augmentation du débit limitée à + 25 % à 300 °C Oui Interdit Oui Oui 5 Règle des 50 Pa avec exutoire sur caisson en amont du ventilateur (article 61, § b2.2) Aucune exigence Bouches stables au feu Augmentation du débit limitée à + 25 % à 300 °C Oui Interdit Interdit Oui TAB.1`
  },
  "60": {
    texte: `Si l’une des conditions suivantes est respectée, le système de ventilation est soumis aux seules prescriptions de l’article 59 relatives aux conduits.

1°) Le fonctionnement du ventilateur est réputé assuré en permanence. Cette condition est réalisée quand :

- l’alimentation électrique du ventilateur est protégée de façon à ne pas être affectée par un incident survenant sur les autres circuits et ne traverse pas de locaux présentant des risques particuliers d’incendie, ou assurée par un groupe électrogène de secours dont la mise en marche est asservie à la coupure de l’alimentation électrique normale ; le fonctionnement du groupe électrogène et du dispositif de mise en marche automatique doit être vérifié au moins une fois par mois ;

- le ventilateur est, au sens de l’annexe technique VMC (1) : . de catégorie 1 pour un taux de dilution R > 3,5 ; . de catégorie 2 pour 1,6 < R 3,5 ; . de catégorie 3 pour 1 < R 1,6 ; . de catégorie 4 pour R 1. Nota : (1) Document publié en annexe au présent arrêté. Toute solution technique permettant d’obtenir les taux de dilution susvisés (2) pourra être adoptée après l’agrément prévu à l’article 105. Nota : (2) Vis-à-vis de la VMC, les risques d’incendie sont essentiellement localisés dans les cuisines. La température des gaz à l’entrée du groupe motoventilateur dépend du taux de dilution des gaz provenant de la cuisine

2°) Chaque conduit de raccordement à un conduit collectif est muni d’un clapet pare-flammes de degré 1/4 d’heure dans les habitations collectives de la 2ème famille et dans les habitations de la 3ème famille, pare-flammes de degré 1/2 heure dans les habitations de la 4ème

famille, actionné par un dispositif thermique fonctionnant à 70 °C. Ces clapets doivent être contrôlables et remplaçables. Ils ne peuvent être utilisés lorsque le système de ventilation assure l’évacuation des gaz de combustion des appareils raccordés (VMC-gaz). FIG.4. : ARTICLE 60, § 2°

ANNEXE II – CONDUITS ET CIRCUITS DE VENTILATION (APPLICATION DE L’ARTICLE 60) Détermination du taux de la dilution Le taux de dilution R est défini comme le rapport du débit Q extrait par l’ensemble des bouches de VMC ou autres orifices d’extraction raccordés à la même « branche » du réseau d’extraction connectée directement au ventilateur au débit q susceptible d’être extrait par la bouche sinistrée (valeurs calculées en service normal à froid) Si la branche concernée est raccordée au ventilateur par l’intermédiaire d’un caisson collectant d’autres branches, le ventilateur étant extérieur à ce caisson, le débit Q à prendre en compte est alors la somme des débits arrivant au ventilateur. Si le ventilateur est placé à l’intérieur d’un caisson, sur lequel se raccordent plusieurs branches (groupe motoventilateur extracteur en caisson au sens de la norme NF E 51-705), le taux de dilution retenu sera le plus faible de l’ensemble des « branches » prises séparément. Les débits sont considérés à 20 °C, sous une dépression de 120 Pa. Si certaines bouches sont réglables par l’usager, elles seront considérées à leur position d’ouverture minimale. La bouche sinistrée est, par hypothèse, une bouche de cuisine. Si les bouches raccordées à la même branche sont de types différents, le débit q retenu sera le plus important parmi les différents types de bouches. Le débit q de la bouche sinistrée est déterminé par un laboratoire agréé ; il est mesuré à 20 °C après que ladite bouche ait évacué de l’air à 800 °C pendant 1/2 heure. Si durant l’essai la bouche disparaît totalement ou si le constructeur n’est pas en mesure de présenter le procès-verbal du laboratoire, le débit q sera pris forfaitairement en fonction du diamètre nominal de raccordement de la bouche, soit (3) :

- 260 m3 /h pour un diamètre de 100 mm ;

- 420 m3 /h pour un diamètre de 125 mm ;

- 650 m3 /h pour un diamètre de 160 mm. Nota : (3) Ces débits résultent de mesures sur installations Classification des ventilateurs Première catégorie : construction standard La température des gaz est inférieure à 120 °C. Il n’y a pas d’exigences particulières pour les ventilateurs construits en métal. Les ventilateurs dont certaines parties seraient faites d’un plastique susceptible d’être endommagé et d’altérer le bon fonctionnement du ventilateur devront justifier d’un avis ou d’un procès-verbal d’homologation délivré par un laboratoire agréé. 2ème catégorie : La température des gaz est comprise entre 120 et 200 °C. Les ventilateurs construits en acier peuvent être employés sous réserve des dispositions suivantes :

- Roue, arbre et volute en acier : . arbre monté sur palier à billes ou à aiguilles, . poulies en métal ;

- Moteur : carter moteur en métal ;

- Alimentation électrique :

. organe de protection et de coupure situé à l’extérieur du caisson, coffret sans contact direct avec le caisson, sauf fixations (par exemple lame d’air, matériau isolant), . fils électriques d’alimentation du moteur résistant à la température minimale de 250 °C ;

- Identification : le caisson comportera une étiquette signalétique indélébile de convenance à ces prescriptions. 3ème catégorie : La température est comprise entre 200 et 300 °C. Le caisson motoventilateur doit faire l’objet d’un essai d’homologation par un laboratoire agréé. PAR L’INTERMEDIAIRE D’UN CAISSON

4ème catégorie : La température est supérieure à 300 °C. Il s’agit de ventilateur de désenfumage. L’essai d’homologation est conforme à l’essai de ventilateur de désenfumage défini à l’annexe VII de l’arrêté du 21 avril 1983 relatif à la détermination du degré de résistance au feu des éléments de construction et conditions particulières d’essais des ventilateurs de désenfumage. (Arrêté du 18 août 1986) Pour les ventilateurs de la 3ème catégorie sont seulement applicables les dispositions suivantes :

- article premier ;

- article 2, la température est égale à 300 °C et la durée de fonctionnement limitée à 1/2 heure ;

- article 3, courant 3 x 380 V ou mono x 220V ;

- article 6, mais température 300 °C ;

- article 7 ;

- articles 8, 9 et 10 visant les extrapolations applicables ;

- article 11 ;

- articles 12, 13, 14, 15 et 16.

QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 1ER JUILLET 1988 L’alimentation électrique du ventilateur doit-elle être placée en amont ou en aval du disjoncteur général

La protection de l’alimentation électrique du ventilateur imposée à l’article 60, § 1 doit être réalisée comme suit : l’alimentation électrique des ventilateurs doit trouver son origine immédiatement sur les bornes de sortie du disjoncteur de branchement. Les appareils de coupure ou de protection se trouvant sur l’alimentation de ces équipements doivent être signalés par des étiquettes gravées indiquant « Maintenir impérativement sous tension-alimentation des ventilateurs de VMC ». La même disposition est à appliquer pour l’alimentation des ventilateurs de désenfumage (article 37) et des ascenseurs dans les logements-foyers pour handicapés physiques (article 76). En effet, ce type de raccordement s’impose dans la mesure où

l’organe de coupure générale (disjoncteur de branchement du réseau public à basse tension) est concédé au distributeur et réglé en fonction de la puissance stipulée sur le contrat d’abonnement.`
  },
  "61": {
    texte: `Lorsque le fonctionnement du ventilateur ne peut être assuré en permanence ou lorsque les conduits de raccordement au conduit collectif ne sont pas munis de clapets pare-flammes, le système de ventilation mécanique doit répondre aux prescriptions :

a) les bouches d’extraction mécanique ne doivent pas disparaître lorsqu’elles sont soumises au programme thermique normalisé en étant exposées au feu côté local, au bout des temps indiqués à l’article 59 ci-dessus. De plus, leur débit ne doit pas augmenter de plus de 25 % lorsqu’elles sont exposées à une température de 300 °C côté conduit ;

b) les systèmes de ventilation mécanique doivent satisfaire l’une des dispositions suivantes : 1. Pour chaque conduit collectif et à chaque niveau, la perte de charge d’une bouche d’extraction et de son conduit de raccordement au conduit collectif doit être supérieure de 50 Pa à la perte de charge de tout le réseau collectif compris entre le dernier niveau desservi et la sortie à l’air libre. Les pertes de charge sont calculées sur la base des débits maximaux pouvant exister en tout point du réseau collectif en fonctionnement normal. 2. Le système de ventilation est muni d’un dispositif mécanique modifiant automatiquement, en cas d’arrêt du fonctionnement de la ventilation, les caractéristiques du réseau d’extraction de façon qu’elles répondent à la condition définie ci-dessus. Ceci peut être réalisé de l’une des deux manières suivantes : 2.1. Dispositif mécanique aménagé en partie haute de chaque conduit collectif, permettant une ouverture à l’extérieur du bâtiment ayant une surface libre horizontale égale à la section du conduit. 2.2. Ventilateur muni d’un dispositif mécanique, permettant une ouverture à l’extérieur du bâtiment. Ces dispositifs doivent être étanches en position fermée. La remise en marche de la ventilation doit assurer la fermeture automatique des dispositifs.

c) Dans les cas visés en b1, b2.1, b2.2, la distance du débouché à l’air libre des conduits par rapport aux obstacles plus élevés qu’eux doit être au moins égale à la hauteur de ces obstacles sans toutefois excéder 8 m.

QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 23 DECEMBRE 1986 Que signifie la règle énoncée à l’article 61, § c

La règle énoncée à cet article veut dire que, h étant la hauteur de l’obstacle et l la distance entre l’obstacle et le débouché à l’air libre :

- si h 8 m, l = h ;

- si h > 8 m, l = 8.`
  },
  "62": {
    texte: `a) Si l’extraction mécanique est réalisée de telle manière que l’air circule normalement de haut en bas dans les conduits collectifs (VMC inversée), le ventilateur doit être placé dans un local exclusivement réservé à cet usage. Les parois de ce local doivent être coupe-feu de degré identique à celui de la stabilité du bâtiment et la porte doit être pare-flammes de degré 1/2 heure. Ces dispositions ne sont pas exigées si le local est situé à l’extérieur du bâtiment.

Les dispositions de l’article 61, § b1 et § b2.2 ne peuvent être réalisées en ventilation mécanique inversée. En outre, dans le cas de ventilation mécanique inversée, il est interdit de placer des clapets dans le conduit collectif.

b) Dans les bâtiments collectifs, lorsque le système de ventilation est du type « double flux », le réseau d’extraction doit répondre aux prescriptions des articles 59 et 60 ci-avant. De plus, toutes dispositions doivent être prises pour que, en cas d’incendie, le système ne favorise pas la transmission des fumées aux autres niveaux et qu’il n’y ait pas de communication entre les réseaux d’air extrait et d’air insufflé du système. Ces exigences sont réputées satisfaites dans les deux cas suivants :

- soit la centrale double flux répond aux exigences du 60 1) : le fonctionnement des ventilateurs de soufflage et d’extraction est réputé assuré en permanence ;

- soit, dans le cas où le point de fusion du matériau constituant l’échangeur thermique de la centrale double flux est supérieur à 400 °C ou si le taux de dilution R est tel que R > 1,6 alors les conduits d’extraction sont munis d’un clapet-bouche ou clapet terminal situé au droit du conduit

- de classement E 15 (o i) S dans les habitations collectives de la deuxième famille et dans les habitations de la troisième famille ;

- de classement E 30 (o i) S dans les habitations de la quatrième famille. Ce clapet est autocommandé par un dispositif thermique fonctionnant à 70 °C. Il est contrôlable et remplaçable. Dans le cas où les exigences du paragraphe ci-dessus ne sont pas satisfaites, les conduits de soufflage et d’extraction de ces systèmes de ventilation double flux sont munis d’un clapet-bouche ou clapet terminal situé au droit du conduit ;

- de classement E 15 (o i) S dans les bâtiments d’habitation collectifs de la deuxième famille et dans les bâtiments d’habitation collectifs de la troisième famille ;

- de classement E 30 (o i) S dans les bâtiments d’habitation collectifs de la quatrième famille. Ce clapet est autocommandé par un dispositif thermique fonctionnant à 70 °C. Il est contrôlable et remplaçable.

CE CLAPET EST AUTOCOMMANDE PAR UN DISPOSITIF THERMIQUE FONCTIONNANT A 70 °C. IL EST CONTROLABLE ET REMPLA-ABLE.`
  },
  "63": {
    texte: `Les conduits de ventilation desservant des locaux à usage d’habitation ne doivent, en aucun cas, desservir des locaux destinés à un autre usage, à l’exception des locaux collectifs résidentiels de moins de 50 m² et des locaux destinés à l’exercice d’une profession libérale.

QUESTION/REPONSE - MINISTERE DU LOGEMENT, 1ER AOUT 1995 Peut-on ventiler des celliers par l’intermédiaire d’un conduit qui dessert des locaux à usage d’habitation

La réglementation sécurité incendie pour les bâtiments d’habitation ne permet pas de ventiler des celliers par l’intermédiaire d’un conduit qui dessert des locaux à usage d’habitation (article 63 de l’arrêté du 31 janvier 1986). En aucun cas des celliers en sous-sol ne peuvent être assimilés à des locaux d’habitation. De plus, compte tenu du risque élevé d’incendie dans les celliers, ces conduits ne doivent pas avoir un extracteur commun.

AUX BATIMENTS D’HABITATION Version 2 AUTRES GAINES 1er septembre 2004

- Codes de diffusion : R34 – P34 • Date de diffusion : Septembre 2004`
  },
  "64": {
    texte: `Dans les habitations des 3ème et 4ème familles, les conduits de chute de vide-ordures doivent assurer un coupe-feu de traversée respectivement de degré 30 minutes et 60 minutes. Le vidoir en position fermée doit présenter, vis-à-vis d’un feu venant de l’intérieur du conduit, une caractéristique de résistance au feu pare-flammes respectivement de degré 1/4 d’heure et 1/2 heure. Si le local dans lequel est installé le vidoir est équipé d’une porte pare-flammes respectivement de degré 1/4 d’heure et 1/2 heure, aucune caractéristique pare-flammes n’est exigée pour le vidoir. Lorsque les vide-ordures sont situés à l’intérieur des logements, les conduits de chutes ou les gaines les contenant doivent être coupe-feu de degré 1/2 heure dans les habitations de la 3ème famille, coupe-feu de degré 1 heure dans les habitations de la 4ème famille. Les vidoirs doivent être pare-flammes de degré 1/2 heure. Dans les habitations des 3ème et 4ème familles, lorsque le local réceptacle des ordures est situé dans les parcs de stationnement tels que définis aux articles 77 et 78 ci-après, ses parois doivent être coupe-feu de degré 2 heures et le bloc-porte, équipé d’un ferme-porte, doit être coupe-feu de degré 1 heure. Si ce local est situé à tout autre emplacement, ses parois doivent être coupe-feu de degré 1 heure et le bloc-porte, équipé d’un ferme-porte, doit être coupe-feu de degré 1/2 heure ; ces exigences ne visent pas les portes situées en façade du bâtiment. ◆ QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 6 OCTOBRE 1987 L’article 64 traite des locaux « vide-ordures » mais non des simples locaux « à poubelles », qui se font de plus en plus d’ailleurs. Faut-il leur appliquer les mesures d’isolement prévues au dernier alinéa de l’article 64 pour le local réceptacle d’un vide-ordures ou peut-on considérer qu’ils sont moins dangereux puisqu’ils ne communiquent pas avec les étages et admettre un isolement moins rigoureux

Les locaux à poubelles doivent être assujettis aux mêmes règles que les locaux vide-ordures. Certes, dans le premier cas, il n’existe pas de conduit faisant communiquer entre eux les différents niveaux, mais le risque de propagation d’un sinistre est le même dans le sens local vers parc de stationnement.

AUX BATIMENTS D'HABITATION Version 4 AUX LOGEMENTS-FOYERS`
  },
  "65": {
    texte: `Les mesures particulières définies aux articles 66 à 76 ci-après sont applicables aux bâtiments renfermant des logements-foyers et s’ajoutent aux prescriptions générales des articles premier à 64 ci-avant et 77 à 106 ci-après. AGEES ET HANDICAPES PHYSIQUES`
  },
  "66": {
    texte: `Les bâtiments des logements-foyers sont constitués :

1°) Par des locaux assujettis aux seules dispositions du présent arrêté et comprenant :

- des logements ;

- des unités de vie assimilées à des logements, l’unité de vie étant l’ensemble des chambres et locaux directement liés à l’hébergement sur un même niveau ;

- des parties communes, constituées par les dégagements (couloirs, coursives et escaliers) et par des locaux autres que ceux abritant les services collectifs ;

- des locaux de service, tels que bagagerie, buanderie, lingerie, etc.

2°) Par des services collectifs, tels que salles de réunion, salles de jeux, restaurants et leurs dégagements, considérés comme locaux recevant du public et seuls assujettis à la réglementation des établissements recevant du public.`,
    commentaire: `L’article PE 2 §2 précise que sont classés ERP de 5éme catégorie « les locaux à usage collectif d’une surface unitaire supérieure à 50 m² des logements foyers…non assujettis aux dispositions du livre II (ERP du 1er groupe) »


QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 14 AVRIL 1987 Comment peut-on définir l’ « unité de vie »

L’unité de vie est un ensemble de chambres et locaux situés sur un même niveau et pouvant être assimilés à des parties privatives. En d’autres termes, une petite salle de repos réservée à quelques occupants des chambres voisines peut être incluse dans une unité de vie.

QUESTIONS/REPONSES – MINISTERE CHARGE DU LOGEMENT, 23 NOVEMBRE 2007 (PUBLICATION 2016) Les unités de vie peuvent elles être constituées d’un ensemble de logements de type 1bis (logements comportant 1 pièce principale, une cuisine, une salle d’eau et un WC.)

L’article 66 de l’arrêté du 31 janvier 1986 précise que les logements foyers sont constitués :

- de logements,

- d’unités de vie assimilées à des logements, regroupant chambres et locaux directement liés à l’hébergement. Une unité de vie ne peut donc pas regrouper plusieurs logements mais uniquement des chambres individuelles comportant éventuellement des espaces sanitaires ; leur regroupement forme ainsi un grand logement (comportant ou non un séjour ou une cuisine spécifique à l’unité de vie) dont la porte donnant sur la circulation commune est à considérer comme une porte palière.`
  },
  "67": {
    texte: `Les logements-foyers doivent comporter :

- un escalier au moins lorsqu’ils sont destinés à loger au plus 200 occupants ;

- deux escaliers lorsqu’ils sont destinés à loger de 201 à 400 occupants ;

- et un escalier supplémentaire par 200 occupants ou fraction de 200 occupants supplémentaires. Ces escaliers correspondant entre eux à chaque étage doivent être judicieusement répartis pour faciliter l’évacuation des occupants et être conformes aux dispositions de l’article R.111-5 du Code de la construction et de l’habitation.`
  },
  "68": {
    texte: `Si, au rez-de-chaussée, le hall dans lequel aboutit l’escalier dessert également des services collectifs tels que visés à l’article 66, il doit être séparé de l’escalier par des parois et par des blocs-portes pare-flammes de degré 1/2 heure dont la porte est munie d’un ferme-porte. En outre, les autres parois du hall contiguës aux locaux des services collectifs et les portes aménagées dans ces parois doivent être pare-flammes de degré 1/2 heure. Toutefois, si le hall comporte la possibilité d’ouverture sur l’extérieur, située dans le tiers supérieur de sa hauteur, d’une section minimale de 2 m² et pouvant être constituée par un haut de porte ou un châssis ouvrant, aucune caractéristique pare-flammes n’est imposée pour les parois du hall, si en outre le débouché de l’escalier est à moins de 7 m de la sortie du bâtiment.`
  },
  "69": {
    texte: `Un téléphone accessible en permanence et relié au réseau public doit permettre d’alerter les services publics de secours et de lutte contre l’incendie. Un moyen d’alarme sonore audible de tout point du niveau doit pouvoir être actionné à chaque niveau dans les circulations communes. Des dispositifs sonores doivent être placés à chaque niveau du bâtiment si les unités de vie reçoivent au plus 10 personnes, et dans chaque unité de vie si le nombre de leurs occupants est supérieur à 10.`
  },
  "70": {
    texte: `Les murs et cloisons constituant l’enceinte d’une unité de vie doivent être coupe-feu de degré 1/2 heure en 3ème famille et 1 heure en 4ème famille. L’accès à chaque unité de vie est équipé d’un bloc-porte pare-flammes de degré 1/2 heure muni d’un ferme-porte.

Dans les logements-foyers de 3ème famille A, si chaque unité de vie reçoit plus de 10 personnes et s’il y a plus de 20 personnes par niveau, les dégagements doivent respecter les dispositions prévues pour la 3ème famille B à l’article 39 ci-avant.`,
    commentaire: `Si l’unité de vie contient plus de 20 personnes en 3ème famille A, les circulations horizontales doivent être :

- soit « désenfumées » (voir article 39) ;

- soit « protégées » (voir articles 30 à 38).`
  },
  "71": {
    texte: `Si les services collectifs sont situés dans les étages, le ou les escaliers qui les desservent peuvent être communs avec ceux desservant les unités de vie à condition d’en être séparés par des parois coupe-feu de degré 1/2 heure dont les blocs-portes sont pare-flammes de degré 1/2 heure et munis de ferme-porte.

Les bagageries doivent être traitées comme des celliers visés à l’article 10.`
  },
  "72": {
    texte: `Les mesures particulières définies au chapitre II du présent titre sont applicables aux logements-foyers pour personnes âgées autonomes tels que définis à l’article 1er de l’arrêté du 14 avril 2011 relatif à l’application de l’article R. 111-1-1 du code de la construction et de l’habitation. Cependant, pour tenir compte des difficultés de déplacement des occupants, les niveaux affectés à l’installation de tels logements ne peuvent être situés au-delà du 6ème étage des bâtiments. Lorsque le bâtiment-foyer pour personnes âgées comporte plus de trois étages sur rez-de-chaussée, que ces foyers constituent des bâtiments indépendants ou qu’ils constituent les premiers niveaux d’un autre bâtiment d’habitation, les dispositions prévues pour la 3ème famille B à l’article 39, relatives aux dégagements, doivent être appliquées pour la construction de ces foyers indépendants ou de la partie du bâtiment contenant ces foyers.

QUESTION/REPONSE - MELATT, 18 MARS 1988 Peut-on installer des locaux collectifs dans les foyers pour personnes âgées autonomes au-dessus du 6ème étage des immeubles

L’article 72 de l’arrêté du 31 janvier 1986 précise que les niveaux affectés à l’installation de logements pour personnes âgées ne peuvent être situés au-delà du 6ème étage des bâtiments. Parallèlement, le texte renvoie à la réglementation relative aux ERP pour les services collectifs et ne donne pas de précision sur l’implantation de ces services. Cela étant, les obligations contenues dans le chapitre III du titre V relatives aux logements-foyers pour personnes âgées ont été rédigées pour tenir compte de la différence de déplacement des occupants de ces bâtiments. La logique impose donc de ne pas autoriser l’établissement de locaux collectifs (salles de réunion, restaurants...) destinés aux personnes âgées au-delà du 6ème étage.`,
    commentaire: `Les établissements ou services spécialisés pour recevoir des personnes âgées dépendantes ou nécessitant des soins de manière constante sont assujettis au règlement de sécurité contre les risques d’incendie et de panique dans les établissements recevant du public et sont classés en type J.

AUX BATIMENTS D'HABITATION Version 2 AUX LOGEMENTS-FOYERS 24 juin 2015 Origine : Direction Développement Construction & GPI Auteur : J.P. Henry FD Date de diffusion : 10 août 2015 Fascicule annulé : Version 1 d’Avril 1998 Les établissements ou services spécialisés pour recevoir des personnes en situation de handicap sont assujettis au règlement de sécurité contre les risques d’incendie et de panique dans les établissements recevant du public et sont classés en type J.`
  },
  "73": {
    texte: `Les mesures définies au chapitre II du présent titre sont applicables aux logements-foyers pour handicapés physiques pouvant se déplacer même en fauteuil roulant, sans l’aide d’une tierce personne et de ce fait ne concernent pas les handicapés physiques n’ayant pas leur autonomie.

Cependant, pour mieux assurer la mise en sécurité des occupants, l’installation de tels logements-foyers n’est permise que :

- au rez-de-chaussée si les logements ou unités de vie ont une sortie de plain-pied sur l’extérieur ;

- aux trois premiers étages des bâtiments si les dispositions des articles 74 à 76 ci-après sont respectées. En outre, dans ce cas, les services collectifs visés à l’article 66 ci-avant doivent être aménagés dans les locaux situés au niveau du sol extérieur.`,
    commentaire: `Les établissements pour handicapés moteurs ou mentaux ne disposant pas de leur autonomie et devant être surveillés par du personnel de manière permanente sont assujettis à la réglementation des établissements recevant du public et sont classés en type U.`
  },
  "74": {
    texte: `Chaque logement ou unité aménagé aux quatre niveaux visés à l’article 73 doit communiquer, par une porte-fenêtre permettant le passage d’un fauteuil roulant, avec un balcon, une coursive ou une terrasse, ouvert à l’air libre et pouvant, en cas d’incendie, servir de refuge à chaque occupant en attendant des secours. Les séparations recoupant éventuellement les balcons ou coursives doivent être facilement franchissables par les handicapés. Les services de secours doivent pouvoir atteindre un point de ces coursives ou balcons à chacun des quatre niveaux susvisés.`
  },
  "75": {
    texte: `Chacun des trois étages doit être desservi par au moins un escalier protégé répondant aux dispositions des articles 27 à 29 ci-dessus#Article27. A chacun de ces trois étages, l’accès à cet escalier à partir de la ou des circulations horizontales protégées doit se faire par l’intermédiaire d’un local d’attente, désenfumable dans ces conditions fixées aux articles 33 à 37 ci-avant#Article33. Au rez-de-chaussée, l’évacuation doit pouvoir se faire par un accès à l’air libre. En aggravation des dispositions de l’article 31 ci-avant#Article31, la distance maximale à parcourir entre toute porte palière de logement ou d’unité de vie et la porte d’accès au local d’attente ou d’accès à l’air libre ne doit pas dépasser 10 m. Le local d’attente doit avoir une surface telle qu’il puisse accueillir la totalité des occupants d’un étage. Toutefois, certaines dispositions des bâtiments permettent de limiter la capacité de ce local à une surface pouvant accueillir :

- la moitié des occupants du niveau considéré, dans le cas d’un bâtiment rectiligne ou en L, avec escalier central ;

- le tiers des occupants du niveau considéré, dans le cas d’un bâtiment en Y, avec escalier central ;

- le quart des occupants du niveau considéré, dans le cas d’un bâtiment en croix, avec escalier central. Il doit, en outre, présenter les caractéristiques suivantes :

- les parois ont le même degré coupe-feu que les planchers ;

- les portes, équipées de ferme-porte, ont un degré pareflammes égal à la moitié du degré coupe-feu des parois ;

- il comporte un éclairage de sécurité (par blocs autonomes par exemple) ;

- il doit être équipé d’un système permettant de communiquer avec le concierge, le gardien ou tout autre préposé ;

- les revêtements des parois verticales et du plafond doivent être M1 ; les revêtements de sol doivent être M3 au moins.`
  },
  "76": {
    texte: `Les logements-foyers pour handicapés physiques doivent disposer de deux ascenseurs au moins. Ces ascenseurs doivent déboucher, à chacun des trois étages du foyer, dans le local d’attente défini ci-dessus. Les machineries doivent être disposées à la partie supérieure du bâtiment et l’installation électrique servant au fonctionnement des appareils doit être conçue et réalisée de telle sorte qu’en cas de sinistre ceux-ci puissent être alimentés en énergie sans avoir recours nécessairement à un groupe électrogène de secours, par exemple par une dérivation ayant son origine avant l’organe de coupure générale du bâtiment et protégée de façon à ne pas être affectée par un incident survenant sur les autres circuits ; elle ne doit pas traverser, sans protection, des locaux présentant des risques particuliers d’incendie.

QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 14 AVRIL 1987 Les portes palières des ascenseurs aux niveaux autres que ceux possédant des locaux d’attente ne devraient-elles pas être pare-flammes

Les ouvertures dans les cages d’ascenseur donnant accès aux circulations horizontales doivent être pare-flammes de degré 1/2 heure dans les bâtiments des 3ème et 4ème familles.

AUX BATIMENTS D'HABITATION Version 2 Origine : Direction Développement Construction & GPI Auteur : J.P. Henry FD Date de diffusion : 10 août 2015 Fascicule annulé : Version 1 d’Avril 1998`
  },
  "77": {
    texte: `Les dispositions du présent titre sont applicables aux parcs de stationnement couverts lorsqu’ils ont plus de 100 m² et 6 000 m² au plus. Au-dessous de la capacité minimale définie ci-dessus, aucune prescription supplémentaire n’est imposée aux locaux du fait de la présence de véhicules.

QUESTION/REPONSE - MELATT, 26 NOVEMBRE 1986 Des boxes extérieurs à des bâtiments d’habitation doivent-ils être considérés comme constituant un parc de stationnement couvert assujetti au titre VI de l’arrêté du 31 janvier 1986 modifié

La juxtaposition de boxes fermés, indépendants et situés à l’extérieur, ne constituent pas un parc de stationnement au sens de l’arrêté du 31 janvier 1986 relatif à la protection des bâtiments d’habitation contre l’incendie. En effet, dans la mesure où les boxes sont fermés et séparés les uns des autres par des cloisons maçonnées, le risque de propagation du feu est très limité. En conclusion, il est admis de permettre la ventilation de la construction telle que décrite par vos soins, le long des façades des bâtiments d’habitation et à l’aplomb de la voie de circulation d’accès aux boxes . Nota : Cette réponse indique nettement que de tels boxes ne sont pas assujettis au titre VI du règlement. Toutefois, la lettre complémentaire du 16 octobre 1987, du même ministère, apporte les précisions suivantes concernant la résistance au feu de l’enveloppe des groupements de boxes extérieurs : « Il n’y a pas lieu d’appliquer un certain nombre de règles relatives aux parcs de stationnement (par exemple, le désenfumage) ; par contre, il est impératif d’imposer des qualités de résistance au feu de l’enveloppe de ces parcs » on peut donc estimer que la construction des groupements de boxes en parois et cloisons « maçonnées » est de nature à répondre à cet objectif.`
  },
  "78": {
    texte: `Au sens du présent arrêté : Un parc de stationnement est un emplacement couvert, annexe d’un ou de plusieurs bâtiments d’habitation, qui permet le remisage, en dehors de la voie publique, des véhicules automobiles et de leurs remorques à l’exclusion de toute autre activité. Il peut se trouver dans un bâtiment d’habitation, en superstructure ou en infrastructure ou sous un immeuble bâti. Un niveau est un espace vertical séparant les plates-formes de stationnement ; si le parc comprend des demi-niveaux, on considérera que deux demi-niveaux consécutifs constituent un seul niveau. Le niveau de référence est celui de la voirie desservant la construction et utilisable par les engins des services de secours et de lutte contre l’incendie ; s’il y a deux accès par des voies situées à des niveaux différents, le niveau de référence sera déterminé par la voie la plus basse pour un parc souterrain ou par la voie la plus haute pour un parc en superstructure. Si le parc est réalisé de telle manière que le stationnement s’effectue sur une ou plusieurs rampes hélicoïdales servant également à l’accès et à la circulation des véhicules, un niveau est constitué par l’espace vertical déterminé par une révolution de la rampe.

QUESTION/REPONSE - COMMISSION DU REGLEMENT DE CONSTRUCTION, 25 JUIN 1997 Un parc de stationnement couvert, ouvert ou non sur ses cotés, indépendant et annexe d’un bâtiment d’habitation, doit-il répondre aux règles de sécurité contre l’incendie définies dans le titre VI de l’arrêté du 31 janvier 1986

Un parc de stationnement de ce type répond à la définition donnée à l’article 78 et doit par conséquent répondre aux dispositions de l’arrêté en question.`
  },
  "79": {
    texte: `L’accès des parcs est interdit aux véhicules de plus de 3,5 t de poids total en charge.`
  },
  "80": {
    texte: `Tous les éléments verticaux concourant à la stabilité de la construction doivent être protégés contre les chocs éventuels des véhicules ou présenter une résistance permettant d’absorber de tels chocs sans modification de leurs caractéristiques mécaniques.

Les éléments de construction et leurs revêtements éventuels doivent être classés en catégorie M0 du point de vue de leur réaction au feu sauf exception visée à l’article 90 ci-après. Toutefois, est autorisée l’utilisation de matériaux et produits d’isolation conformes aux indications contenues dans le Guide de l’isolation par l’intérieur des bâtiments d’habitation du point de vue des risques en cas d’incendie visé à l’article 16.

QUESTION/REPONSE - CSTB, 17 AVRIL 1987 Les entrevous en polystyrène expansé ignifugé classés M1 peuvent-ils être utilisés en plancher haut des garages des immeubles d’habitation des première et 2ème familles

Cette question de l’emploi d’entrevous en polystyrène expansé ignifugé M1 en plancher haut d’un garage placé en rez-de-chaussée d’une maison individuelle est posée par rapport au modificatif au Guide de l’isolation par l’intérieur des bâtiments d’habitation du point qui admet cet emploi en plancher haut de sous-sol des habitations des première et 2ème familles. L’intention du Cecmi a été de ne pas retenir cet emploi dans le logement proprement dit, dans l’esprit de ce qui est prévu en résistance au feu à l’article 6 de l’arrêté du 31 janvier 1986. Les emplois en plancher haut de locaux annexes, tels les garages, sont en conséquence acceptables.`
  },
  "81": {
    texte: `Indépendamment des caractéristiques relatives aux mesures d’isolement définies à l’article 82 pour certains d’entre eux, les éléments porteurs du parc doivent être :

- stables au feu de degré 1/2 heure pour les parcs à simple rez-de-chaussée ou comportant un rez-de-chaussée surmonté d’un étage ;

- stables au feu de degré 1 heure pour les parcs ayant au plus deux niveaux au-dessus ou au-dessous du niveau de référence ; les planchers séparatifs devant être coupe-feu de degré 1 heure ;

- stables au feu de degré 1 heure 30 pour les parcs de plus de deux niveaux et dont le plancher bas du dernier niveau est au plus à 28 m au-dessus ou au-dessous du niveau de référence. Les planchers séparatifs doivent être coupe-feu de degré 1 heure 30. Toutefois, les dalles de ces planchers constituant des éléments secondaires de la structure peuvent être coupe-feu de degré 1 heure seulement.

AUX BATIMENTS D'HABITATION Version 3 Origine : Direction Développement Construction & GPI Auteur : J.P. Henry BK Date de diffusion : 17 octobre 2016 Fascicule annulé : Version 2 du 24 juin 2015`
  },
  "82": {
    texte: `1°) Lorsque le parc est contigu à un immeuble d’habitation, tel que défini à l’article R.111-1 du Code de la construction et de l’habitation, les murs, planchers séparatifs, sauf le plancher bas, ainsi que les éléments qui le constituent doivent être coupe-feu de degré 2 heures si l’immeuble contigu est classé en 3ème ou 4ème famille, coupe-feu de degré 1 heure si l’immeuble est classé en 2ème famille. Les communications éventuellement aménagées dans ces murs ou parois doivent être réalisées par un sas d’une surface de 3 m² minimum et muni de deux portes, chacune pare-flammes de degré 1/2 heure et équipées d’un ferme-porte, s’ouvrant toutes les deux vers l’intérieur du sas. Tout autre dispositif présentant les mêmes caractéristiques coupe-feu et agréé par le ministre de l’Urbanisme et du Logement et par le ministre de l’Intérieur et de la Décentralisation peut également être utilisé. Un sas comporte deux portes. Toutefois, un sas peut comporter trois portes dans les conditions suivantes :

- la première porte donne sur le parc (ou le volume des caves) ;

- la deuxième sur le palier de l’ascenseur ;

- la troisième sur l’escalier ou une circulation donnant directement sur l’extérieur. Les portes donnant accès aux issues doivent être identifiées. Cette configuration interdit formellement que le même sas distribue à la fois le parc de stationnement et le volume des caves.

2°) Lorsque le parc n’est pas contigu, mais se trouve à moins de 8 m d’un immeuble habité ou occupé, les murs ou parois verticales extérieurs du parc, compris dans cette zone de 8 m, doivent être pare-flammes de degré 1 heure. Les baies éventuelles doivent être fermées par des éléments pare-flammes de degré 1/2 heure.

QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 14 AVRIL 1987 Le terme « contigu » employé à l’article 82 inclut-il la notion de parc situé « en dessous »

Oui.


QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 1 ER JUILLET 1988 L’isolement des parcs doit être assuré par des sas. Est-ce que le sas peut donner directement accès dans la cage d’escalier commune aux logements, notamment si le parking est situé dans les étages en raison des dénivelées de terrain (cas des bâtiments en zone de montagne notamment)

Il est interdit que le sas faisant communiquer le parc de stationnement avec le reste du bâtiment débouche dans la cage d’escalier commune aux logements situés aux niveaux inférieurs`,
    commentaire: `Cette réponse concerne les bâtiments comportant des niveaux différents sur deux façades opposées, question/réponse du ministère de l’Équipement du 1er juillet 1988, relative à l’article 3`
  },
  "83": {
    texte: `Dans le cas où le parc comporte plus d’un niveau en superstructure, les dispositions de l’article 14 s’appliquent aux façades du parc, les valeurs C et D répondant aux définitions de l’article 14 sont liées par la relation ci-après quelle que soit la masse combustible des façades : C + D ≥ 1 m.`
  },
  "84": {
    texte: `1°) La superficie de chaque niveau doit être recoupée en compartiments inférieurs à 3 000 m² au-dessous du niveau de référence. Les murs de recoupement doivent être coupe-feu de degré 1 heure. Les ouvertures éventuelles dans ces murs doivent être munies de dispositifs d’obturation pare-flammes de degré 1/2 heure à fermeture automatique commandée par un détecteur autonome déclencheur et doublé d’une commande manuelle. Nota : Conforme à la norme française le concernant (NF S 61-961). Un détecteur de ce type doit être placé de chaque côté du dispositif d’obturation. Aucun dispositif d’obturation n’est imposé pour les rampes d’accès ainsi que pour les parcs de stationnement dans lesquels la rampe d’accès sert également au stationnement.

2°) Dans le cas où des boxes sont établis dans le parc, ils ne doivent pas comporter chacun plus de deux emplacements pour le stationnement. Le cloisonnement doit être réalisé par des parois pleines maçonnées. L’établissement de tels boxes ne doit pas perturber la ventilation du parc.

QUESTIONS/REPONSES – MINISTERE CHARGE DU LOGEMENT, 23 NOVEMBRE 2007 (PUBLICATION 2016) Peut-on prévoir des caves en fond de boxes de garages

Il n’est pas admis de prévoir des caves ou des espaces de rangements fermés en fond de boxe. Une telle solution peut apporter des modifications importantes des risques d’incendie avec l’entrepôt de matériaux divers et l’incitation à des activités domestiques multiples.`
  },
  "85": {
    texte: `Lorsque la couverture du parc est dominée par les façades vitrées ou ouvertes d’immeubles habités ou occupés, elle doit être pare-flammes de degré 1 heure sur une distance de 8 m, mesurée en projection horizontale, de l’ouverture la plus proche.

QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 23 DECEMBRE 1986 La règle du « pare-flammes de degré 1 heure » concerne-t-elle les rampes à l’aplomb des baies

La règle du « pare-flammes de degré 1 heure » ne concerne pas les rampes à l’aplomb des baies. Cette règle a été édictée dans le souci d’éviter toute transmission de feu du parc de stationnement aux logements surplombant ce même parc. Dans la mesure où rien n’est stocké dans les rampes, le risque de transmission est quasi nul.`,
    commentaire: `Lorsque la distance de débordement de la couverture du parc par rapport à la façade est inférieure à 8 m, il conviendra de rechercher une solution de ventilation (lorsqu’elle est naturelle) non pas par exutoire, mais par ouvrant au droit de la façade du parc située en extrémité dudit débordement.`
  },
  "86": {
    texte: `a) Les revêtements de couvertures classés en catégorie M0 peuvent être utilisés sans restriction. Les revêtements de couvertures classés en catégorie M3 peuvent être utilisés sans restriction s’ils sont établis sur un support continu en matériau incombustible ou en panneaux de bois, ou d’agglomérés de fibres de bois. Les couvertures à revêtements classés M3 établis sur un support ne répondant pas à la définition de l’alinéa précédent doivent avoir les mêmes caractéristiques que celles fixées ci-dessous pour les couvertures à revêtements classés M4.

b) Les couvertures à revêtements classés M4 doivent se situer à plus de 8 m du bâtiment voisin.`
  },
  "87": {
    texte: `A chaque niveau le ou les escaliers doivent être disposés de façon que les usagers n’aient pas à parcourir :

- plus de 40 m pour atteindre une issue ou un escalier s’ils ont le choix entre plusieurs ;

- (Arrêté du 18 août 1986) plus de 25 m pour atteindre l’escalier s’il n’y en a qu’un ou s’ils se trouvent dans une partie de l’établissement formant cul-de-sac. Les escaliers desservant les niveaux situés au-dessous du niveau de référence ne doivent pas aboutir dans les escaliers desservant les niveaux situés au-dessus du niveau de référence. Ils doivent être à volées droites si le parc comporte plus de quatre niveaux par rapport au niveau de référence. Les escaliers doivent avoir une largeur minimale de 0,80 m. Si, au niveau de sortie, le ou les escaliers aboutissent dans une allée de circulation commune réservée aux piétons, cette dernière doit avoir une largeur égale à autant de fois 0,60 m qu’il y a d’escaliers y aboutissant avec un minimum de 0,80 m. L’allée de circulation commune réservée aux piétons doit comporter au moins deux issues éloignées l’une de l’autre et disposées de manière à éviter les culs-de-sac. Elle doit être séparée du reste du parc par des cloisons coupe-feu de degré 1 heure. Les escaliers doivent être réalisés en matériaux incombustibles et doivent comporter des cloisons les séparant du reste du parc :

- coupe-feu de degré 1 heure dans le cas général ;

- coupe-feu de degré 1/2 heure si le parc ne comporte qu’un niveau sur rez-de-chaussée. Lorsqu’ils aboutissent dans les circulations de l’immeuble d’habitation, les escaliers doivent être protégés à chaque niveau par des sas réalisés dans les conditions définies à l’article 82 ci-avant. Dans les autres cas, ils doivent être protégés à chaque niveau par des portes pare-flammes de degré 1/2 heure, équipées d’un ferme-porte et s’ouvrant dans le sens de la sortie en venant du parc. Ces dispositions ne sont pas applicables aux portes donnant sur l’extérieur, qui doivent comporter une ouverture de 30 dm² en partie haute. Dans les parcs ne comportant qu’un seul niveau au-dessous du niveau de référence, un trottoir d’au moins 0,80 m de largeur aménagé le long de la rampe utilisée par les véhicules peut remplacer un escalier. Les issues réservées aux véhicules doivent être obligatoirement munies de portes condamnables (clé, cartes magnétiques, ultrasons...). Les portes ou dispositifs de franchissement à l’usage des piétons mettant en communication le parc soit avec l’extérieur, soit avec les circulations communes des bâtiments d’habitation qu’il dessert,

doivent comporter une fermeture à clé. Cependant, ces portes ou dispositifs de franchissement doivent être ouvrables sans clé de l’intérieur du parc.

◆ QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 23 DECEMBRE 1986 Les portes barreaudées sont-elles admises dans les issues des parcs

Les portes barreaudées peuvent être admises pour la condamnation des issues « véhicules ». ◆ QUESTION/REPONSE - COMMISSION DU REGLEMENT DE CONSTRUCTION, 25 JUIN 1997 Une chaufferie desservant un ou des bâtiments d’habitation peut-elle être implantée dans un parc de stationnement couvert annexe d’un de ces bâtiments

L’article 5.2 de l’arrêté du 23 juin 1978 (voir fiche 18.06) relatif aux installations fixes destinées ou chauffage et à l’alimentation en eau chaude des bâtiments d’habitation indique que la chaufferie située à l’intérieur d’un bâtiment d’habitation doit être d’un accès direct par l’extérieur du bâtiment ou par des parties communes du bâtiment. Parmi ces parties communes (hormis les places de stationnement elles-mêmes) figure le parc de stationnement couvert qui fait l’objet du titre VI de l’arrêté du 31 janvier 1986. Cet arrêté ne comporte aucune prescription particulière interdisant l’accès éventuel d’une chaufferie à partir du parc de stationnement.

Dans la mesure où la chaufferie respecte les prescriptions définies dans l’arrêté du 23 juin 1978 précité, ainsi que celles de l’arrêté spécifique au combustible utilisé (arrêté du 2 août 1977 modifié, pour le gaz combustible ; arrêté du 21 mars 1968 modifié, pour le Fuel), la chaufferie peut être implantée dans le parc de stationnement. Il convient de veiller à ce que la porte d’accès au local chaufferie débouche directement sur une circulation principale ou sur une circulation secondaire d’au moins 0,80 m de largeur comportant un dispositif anti-stationnement. Cette porte doit, en plus de l’identification du local, porter de manière très apparente, la mention «sans issue».`,
    commentaire: `liquide inflammable, tel que le fuel, doivent être placés dans une gaine coupe-feu de degré deux heures et réalisée en matériaux incombustibles. Le vide existant entre le ou les conduits et les parois de la gaine doit être comblé par des matériaux inertes pulvérulents. L’article 8 de l’arrêté du 2 août 1977 modifié décrit de façon précise les conditions de mise en oeuvre de l’alimentation gaz. La coupure de l’alimentation en combustible du local chaufferie est située à l’intérieur du local et manoeuvrable de l’extérieur du local (coup de poing, tringlerie). Les mini-chaufferies sont régies par le cahier des charges ATG C-321-4.`
  },
  "88": {
    texte: `Les conduits et gaines doivent être disposés de telle sorte qu’ils soient protégés des chocs éventuels de la part des véhicules. Les conduits servant au transport de liquides inflammables doivent être placés dans une gaine coupe-feu de degré 2 heures et réalisée en matériaux incombustibles. Le vide existant entre le ou les conduits et les parois de la gaine doit être comblé par des matériaux inertes pulvérulents. Les conduits de ventilation du parc et leur enveloppe éventuelle, quel que soit leur mode de fixation, doivent dans la traversée du parc être réalisés en matériaux incombustibles et être coupe-feu de degré 1/2 heure (1) ainsi que leurs trappes et portes de visites, sauf dans le niveau desservi, et coupe-feu de degré 2 heures s’ils traversent d’autres locaux. Nota : (1) Les mots « 30 minutes » sont supprimés par l’arrêté du 18 août 1986 Les autres conduits ou gaines mettant en communication le parc et des locaux ou logements voisins doivent être coupe-feu de traversée de degré 120 minutes au moins, à l’exception des conduits constamment en charge d’eau et des conduits dont le diamètre, au droit des traversées dans les parois coupe-feu d’isolement du parc, est inférieur ou égal à 125 mm. Les conduits de ventilation du parc tant pour l’amenée d’air que pour l’évacuation ne peuvent desservir chacun qu’un seul niveau ou un seul compartiment. Les conduits de vapeur sous une pression supérieure à 0,5 bar d’eau surchauffée à plus de 110 °C sont interdits dans le volume du parc, sauf s’ils sont contenus dans les gaines réalisées en matériaux incombustibles, coupe-feu de degré 2 heures, ouvertes sur l’extérieur aux extrémités et protégées du choc éventuel des véhicules. Les conduits de gaz combustible doivent répondre aux prescriptions de l’article 56, 2°`
  },
  "89": {
    texte: `Le système de ventilation doit être conçu et réalisé de telle manière que les débits obtenus et les emplacements des bouches d’évacuation et éventuellement de soufflage s’opposent efficacement à la stagnation, même locale, de gaz nocifs ou inflammables.

En cas d’incendie, le désenfumage du parc est assuré par les systèmes de ventilation visés au présent article. La ventilation du parc peut être naturelle ou mécanique. Lorsque le parc comporte plusieurs niveaux, la ventilation doit être réalisée mécaniquement dans les niveaux situés au-dessous du niveau de référence à l’exception des cas particuliers où le parc comporte à chaque niveau de larges ouvertures à l’air libre sur deux faces opposées. En cas de ventilation naturelle, les ouvertures de ventilation haute et basse doivent avoir chacune une section minimale de 6 dm² par véhicule. En cas de ventilation mécanique, l’exigence est réputée satisfaite si la ventilation ci-avant permet un renouvellement d’air de 600 m3 /h et par voiture. Ce système peut ne fonctionner que lorsque le parc est utilisé. Dans le cas de ventilation mécanique, les commandes manuelles prioritaires sélectives par niveau permettant l’arrêt et la remise en marche des ventilateurs doivent être installées à proximité des accès utilisables par les services de secours et de lutte contre l’incendie, leurs emplacements doivent être signalés de façon à être facilement repérables de jour comme de nuit. Les ventilateurs doivent normalement assurer leur fonction avec des fumées à 200 °C pendant 1 heure. L’alimentation électrique des ventilateurs doit être assurée par une dérivation issue directement du tableau principal et sélectivement protégée. ◆ QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT Peut-on utiliser la ventilation transversale

La notion de ventilation transversale peut être utilisée. Les mêmes valeurs que celles de VB et VH (2) peuvent être reprises. Les exutoires sont concernés par la « règle des 8 mètres » évoquée à l’article 85. Nota : (2) VB : ventilation basse ; VH : ventilation haute.`
  },
  "90": {
    texte: `Les sols doivent présenter une pente suffisante pour que les eaux et tout liquide, accidentellement répandus, s’écoulent facilement en direction d’une fosse munie d’un dispositif de séparation ou vers tout autre système capable de retenir la totalité des liquides inflammables. Pour éviter l’écoulement des liquides d’un niveau du parc vers les niveaux inférieurs, le sol de la rampe doit être surélevé de 3 cm par rapport au sol du niveau. Les allées de circulation des véhicules doivent être antidérapantes. Par dérogation aux dispositions de l’article 80, les revêtements des sols peuvent être classés en catégorie M3. ◆ QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT Quelle est la capacité requise pour les dispositifs de rétention

Les indications données dans la circulaire du 3 mars 1975 relative aux parcs de stationnement couverts peuvent être reprises, à savoir :

- 0,50 m3 pour une superficie inférieure à 1 000 m² ;

- 1m3 pour les autres parcs. Par souci de cohérence, il est souhaitable qu’une fosse de rétention des liquides inflammables soit prévue pour les toitures des parcs, elles mêmes à usage de parkings.`
  },
  "91": {
    texte: `Les rampes et allées de circulation des véhicules doivent être libres de tout obstacle sur toute leur largeur et sur une hauteur minimale de 2 m sauf pour des cas ponctuels en nombre limité et efficacement signalés.`
  },
  "92": {
    texte: `Aucun obstacle ne doit se trouver à moins de 2 m du sol dans toutes les parties du parc susceptibles d’être parcourues par des piétons sauf pour des cas ponctuels, en nombre limité et efficacement signalés. Les accès aux issues telles que les escaliers et les ascenseurs doivent être maintenus dégagés sur une largeur minimale de 0,90 m.

Des inscriptions ou signalisations visibles en toutes circonstances doivent être apposées de manière à faciliter la circulation dans le parc et le repérage commode des issues. Lorsque des portes ne donnent pas accès à une voie de circulation, un escalier ou une issue, elles doivent porter, de manière très apparente, la mention « Sans issue » .

AUX BATIMENTS D'HABITATION Version 3 Origine : Direction Développement Construction & GPI Auteur : J.P. Henry BK Date de diffusion : 17 octobre 2016 Fascicule annulé : Version 2 du 24 juin 2015`
  },
  "93": {
    texte: `Les installations électriques sont conçues de manière à :

- éviter que ces installations ne présentent un risque d’éclosion et de propagation d’un incendie ;

- permettre le fonctionnement permanent des installations qui font l’objet d’une telle exigence par le présent arrêté ;

- faciliter l’action des services de secours et permettre aux occupants, en cas d’incendie, de quitter l’immeuble. Les installations réalisées selon les normes NF C 14-100 (de 2008 et ses amendements A1 et A2) et NF C 15-100 (de 2002 et ses amendements A1 à A5) sont présumées satisfaire aux exigences énoncés au présent article. Les équipements situés à moins de quatre-vingt dix centimètres du sol sont de degré de résistance mécanique IK10 au sens de la norme NF EN 50102. ( FIGURE MODIFIEE SUITE A PARUTION DE L’ARRETE DU 19 JUIN 2015)`
  },
  "94": {
    texte: `Que l’éclairage soit naturel ou artificiel, l’éclairement doit être suffisant pour permettre aux personnes de se déplacer et de repérer aisément les issues. De plus, le parc de stationnement doit comporter un éclairage de sécurité permettant d’assurer un minimum d’éclairement pour repérer les issues en toutes circonstances et effectuer les opérations intéressant la sécurité. Pour ce faire, l’éclairage de sécurité doit être constitué par des couples de foyers lumineux, l’un en partie haute, l’autre en partie basse, assurant un éclairage d’une puissance d’au moins 0,5 W/m² de surface du local et un flux lumineux émis d’au moins 5 lm/m² . L’éclairage de sécurité doit permettre la visibilité des inscriptions ou signalisations visées à l’article 92 ci-dessus soit par éclairage direct, soit par des lampes conçues spécialement pour matérialiser de telles indications Les foyers lumineux visés au 2ème alinéa ci-dessus doivent être placés le long des allées de circulation utilisables par les piétons et près des issues. Les foyers lumineux placés en partie basse doivent être situés au plus à 0,50 m du sol

Les sources d’électricité destinées à alimenter les foyers lumineux susvisés doivent être autonomes ; elles peuvent être constituées soit par des blocs autonomes répondant aux dispositions de l’arrêté du 2 octobre 1978 du ministère de l’Intérieur, soit par un groupe électrogène. L’éclairage de sécurité doit pouvoir fonctionner pendant 1 heure.

QUESTIONS/REPONSES – MINISTERE CHARGE DU LOGEMENT, 23 NOVEMBRE 2007 (PUBLICATION 2016) L’éclairage de sécurité d’un parc de stationnement doit-il obligatoirement être réalisé par des couples de foyers lumineux

L’éclairage de sécurité d’un parc de stationnement doit obligatoirement être réalisé par des couples de foyers lumineux, et ce y compris à proximité des issues du parc. Cette mise en œuvre est une garantie de visibilité en toutes circonstances et notamment en cas d’enfumage du parc.

QUESTIONS/REPONSE - MELATT, 4 JUIN 1987 Quelle surface faut-il prendre en compte pour le calcul du flux lumineux concernant l’éclairage de sécurité dans les parcs de stationnement couverts, annexes des bâtiments d’habitation

Le MELATT a apporté les précisions suivantes, par la circulaire du 4 juin 1987 :

Circulaire n° 87-48 du 4 juin 1987 relative à l’éclairage de sécurité dans les parcs de stationnement couverts annexes des bâtiments d’habitation (non parue au JO, mais publiée au Bulletin officiel du ministère de l’Équipement n° 17 du 20 avril 1987 et au Moniteur du 17 juillet 1987). Le ministre de l’Équipement, du Logement, de l’Aménagement du territoire et des Transports à Madame et Messieurs les Préfets, commissaires de la République ; Madame et Messieurs les directeurs départementaux de l’Équipement ; Messieurs les directeurs départementaux de la Protection civile ; Messieurs les directeurs départementaux des Services d’incendie et de secours. L’article 94 de l’arrêté du 31 janvier 1986,relatif à la protection contre l’incendie des bâtiments d’habitation, définit les règles que doit respecter l’éclairage de sécurité dans les parcs de stationnement couverts annexes des bâtiments d’habitation, afin que les personnes puissent repérer les issues en toutes circonstances et effectuer les opérations intéressant la sécurité. Les prescriptions contenues dans cet article ayant nécessité une clarification, il est décidé, après accord de la direction de la Sécurité civile du ministère de l’Intérieur, d’apporter les informations complémentaires suivantes :

- l’éclairage, d’une puissance de 0,5 W/m² , est une valeur de référence correspondant à l’emploi de lampes à incandescence. Il est entendu que l’utilisation de lampes ayant un rendement lumineux supérieur à 10 lm/W (par exemple, lampes à fluorescence) peut permettre une diminution de la puissance électrique, dans la mesure où le flux lumineux émis reste supérieur à 5 lm/m² ;

- la surface à prendre en compte pour le calcul du flux lumineux est celle des circulations fictives réservées aux piétons. En d’autres termes, est prise en compte dans ce calcul la surface des circulations limitées à une largeur de 0,90 m, par référence à l’article 92, une allée de circulation étant affectée à chaque rangée de voitures. La figure 3 montre un exemple de solution.

QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 14 AVRIL 1987 Le groupe électrogène mentionné à l’article 94 doit-il alimenter obligatoirement ou non un circuit de sécurité

La présence d’un groupe électrogène peut être évitée par la mise en place de blocs autonomes conformément à l’arrêté du 2 octobre 1978, relatif aux blocs autonomes d’éclairage de sécurité utilisés dans les ERP.

DANS UN PARC DE STATIONNEMENT COUVERT`
  },
  "95": {
    texte: `Les moyens de détection et d’alarme doivent être constitués par :

1°) Un système de détection automatique d’incendie installé :

- à partir du troisième niveau si le parc comporte quatre ou cinq niveaux au-dessous du niveau de référence et s’il n’est pas équipé d’un système d’extinction automatique ;

- à tous les niveaux si le parc comporte au moins six niveaux au-dessous du niveau de référence. Ce système de détection doit être raccordé :

- soit à un poste de gardiennage propre au parc de stationnement ;

- soit à un local de gardien ou de concierge du ou des bâtiments d’habitation dont le parc constitue une annexe ;

- soit à un appareil de signalisation dans le hall de l’immeuble s’il n’y a ni local de gardiennage, ni concierge.

2°) Une liaison téléphonique pour appeler le service de secours incendie le plus proche depuis le local de gardiennage propre au parc ou depuis le local de gardien ou concierge visé ci-avant s’ils existent.

3°) Un système permettant de donner l’alarme aux usagers du parc si ce dernier comporte plus de quatre niveaux au-dessus du niveau de référence ou plus de deux niveaux au-dessous.

QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 14 AVRIL 1987 Lorsque le mot « niveau » est employé, inclut-il le niveau de référence

La réponse ne peut pas être générale, par exemple :

- article 95, 1°, « à partir du 3ème niveau... » : dans ce cas, le niveau de référence n’est pas pris en compte ;

- article96,1° , 2ème tiret, « à chaque niveau une caisse de 100 litres... » : dans ce cas, le niveau de référence est concerné.`
  },
  "96": {
    texte: `Des moyens de lutte contre l’incendie doivent être prévus et comprendre :

1°) Pour tous les parcs :

- des extincteurs portatifs répartis à raison de 1 appareil pour 15 véhicules. Ces extincteurs doivent être soit alternativement des types 13 A ou 21 B, soit polyvalents du type 13 A 21 B ; Nota : Conformes aux normes françaises les concernant

- à chaque niveau une caisse de 100 litres de sable meuble munie d’un seau à fond rond et placée près de la rampe de circulation.

2°) (Arrêté du 18 août 1986) Pour les parcs comportant plus de quatre niveaux au-dessus du niveau de référence ou plus de trois niveaux au-dessous, outre les moyens prévus au 3° ci-dessous : des colonnes sèches de 65 mm disposées dans les cages d’escalier ou dans les sas et comportant à chaque niveau une prise de 65 mm et deux prises de 40 mm. Ces colonnes sèches doivent être installées conformément aux dispositions de la norme en vigueur et leurs prises placées à l’intérieur des sas lorsqu’il en existe. Nota : Norme NF S 61-750 Le raccord d’alimentation de la colonne sèche doit être situé à 100 m au plus d’une prise d’eau normalisée accessible par un cheminement praticable, située le long d’une voie accessible aux engins des sapeurs-pompiers et répondant aux spécifications de l’article 4.

3°) Pour les parcs situés au-dessous du niveau de référence :

- à partir du 3ème niveau pour les parcs comprenant plus de trois niveaux et qui ne sont pas équipés, à partir du 3ème niveau, d’un système de détection automatique,

- à partir du 6ème niveau pour les parcs comprenant au moins six niveaux, l’installation, sur toutes les zones du parc affectées au stationnement, d’un réseau d’extinction automatique à eau pulvérisée à raison d’un diffuseur pour 12 m² de plancher au moins et assurant pendant 1 heure un débit de 3,5 litres par minute et par mètre carré sur une surface impliquée de 200 m² , l’alimentation étant assurée par une source unique telle que conduite de ville ou bac en pression. Toutes dispositions doivent être prises pour que le fonctionnement de cette installation ne soit pas perturbé par le gel. Ces dispositions s’ajoutent à celles prévues aux 1° et 2° ci-dessus.

QUESTIONS/REPONSES - MINISTERE DE L’EQUIPEMENT, 14 AVRIL 1987 Doit-il y avoir autant de colonnes sèches que de cages d’escaliers, telles que visées à l’article 96, § 2°

Oui. Lorsque le mot « niveau » est employé, inclut-il le niveau de référence

Se référer à la question/réponse de l’article 95, ci-avant.`,
    commentaire: `Lorsque le parc de stationnement est annexé à un bâtiment d’habitation lui-même doté de colonnes sèches, il convient de s’assurer que la répartition des prises d’eau normalisées (bouches ou poteaux d’incendie) permet d’obtenir simultanément une distance des raccords d’alimentation de colonnes sèches :

- inférieure à 100 m pour le parc de stationnement ;

- inférieure à 60 m pour le bâtiment d’habitation (voir article 98).`
  },
  "97": {
    texte: `Les ascenseurs (1) ne sont pas considérés comme des moyens d’évacuation sauf en ce qui concerne les foyers pour handicapés. Nota : (1) Les ascenseurs doivent être conformes aux normes en vigueur (NF P 82-210 notamment). Les parois des cages d’ascenseurs doivent être :

- coupe-feu de degré 1/2 heure pour les bâtiments de 2ème famille ;

- coupe-feu de degré 1 heure pour les bâtiments de 3ème famille A ;

- coupe-feu de degré 1 heure pour les bâtiments de 3ème famille B et de 4ème famille. A chaque niveau desservi, les ascenseurs doivent toujours être accessibles depuis les circulations communes. Si des aménagements particuliers permettent en outre d’accéder directement à certains logements sans utiliser les circulations communes, la porte des logements donnant accès directement à l’ascenseur doit avoir le même degré coupe-feu que la paroi dans laquelle elle est aménagée. S’ils desservent des sous-sols comportant des parcs de stationnement de véhicules automobiles, ou des volumes de caves, ils doivent être isolés de ces locaux par des sas d’une surface de 3 m² environ et munis de deux portes pare-flammes de degré 1/2 heure équipées d’un ferme-porte et s’ouvrant toutes les deux vers l’intérieur du sas. Dans les habitations de la 4ème famille, les ascenseurs doivent comporter un dispositif d’appel et de commande prioritaire d’une cabine au moins par batterie, destiné à mettre ces appareils à la disposition des sapeurs-pompiers dès leur arrivée sur les lieux. Ce dispositif doit être conforme à la norme en vigueur (2)et asservi à la détection ; la cabine ne doit pas pouvoir s’arrêter au niveau sinistré. Nota : (2) Norme NF P 82-207.`,
    commentaire: `La mise en place d’aménagements particuliers permettant d’accéder directement à certains logements n’exonère pas le constructeur de l’obligation d’accessibilité de la cage d’ascenseur depuis les circulations communes des niveaux considérés.`
  },
  "98": {
    texte: `Les habitations de la 3ème famille B et de la 4ème famille doivent comporter une colonne sèche de 65 mm par escalier. Toutefois, elle n’est pas obligatoire dans les bâtiments collectifs d’habitation de la troisième famille B comportant au plus sept étages sur rez-de-chaussée et implantés de telle sorte qu’au rez-de-chaussée les accès au(x) hall(s) d’entrée soient atteints par la voie échelles définies à l’article 4 ci-avant. Cette colonne sèche doit être munie d’une prise de 40 mm par niveau ou d’une prise double de 40 mm dans le cas de niveau desservant des logements en « duplex ou en triplex ». Les colonnes sèches doivent être conformes à la norme française en vigueur (3) et leurs prises placées à l’intérieur des sas lorsqu’il en existe. Nota : (3) Norme NF S 61-750 Le raccord d’alimentation de la colonne sèche doit être situé à 60 m au plus d’une prise d’eau normalisée accessible par un cheminement praticable, située le long d’une voie accessible aux engins des sapeurs-pompiers et répondant aux spécifications de l’article 4. Les emplacements des points d’eau doivent être situés à 5 m au plus du bord de la chaussée ou de l’aire de stationnement des engins d’incendie.

QUESTIONS/REPONSES - MINISTERE DE L’EQUIPEMENT Une colonne sèche peut-elle être remplacée par des robinets d’incendie armés (RIA)

L’arrêté du 31 janvier 1986 n’impose pas la présence de robinets d’incendie armés (RIA) (4). Certes, un maître d’ouvrage peut, s’il le souhaite, remplacer une colonne sèche par des RIA, mais cette possibilité ne doit en aucun cas être interprétée comme une obligation.

Nota : (4) Les RIA constituent, en prévention, un moyen de premier secours à disposition des services de sécurité en place dans les établissements. Par contre, les colonnes sèches sont un moyen d'extinction à disposition des sapeurs-pompiers et, en raison de l'éloignement des points d'eau et/ou du nombre de niveaux, leur permettent un gain de temps non négligeable dans la mise en place de leurs tuyaux en étages. Il convient donc de s'attacher au respect de l'obligation d'installation des colonnes sèches. Aussi leur remplacement par des RIA doit-il faire l'objet d'une demande motivée auprès du service instructeur du permis de construire.

QUESTION/REPONSE - COMMISSION DU REGLEMENT DE CONSTRUCTION, 25 JUIN 1997 Quand faut-il exiger l’installation d’une colonne sèche par escalier dans un bâtiment d’habitation classé en 3ème famille

La présence d’une colonne sèche par escalier est exigée dans les bâtiments d’habitation classés en 3ème famille B, comportant plus de sept étages sur rez-de-chaussée, comme il l’est déjà prescrit pour les bâtiments de 3ème famille B «déclassés» en 3ème famille A en application de l’article 3-3°, avant dernier paragraphe de l’arrêté du 31 janvier 1986 (bâtiments soumis aux seules prescriptions fixées pour ceux classés en 3ème famille A sur décision du maire). Cependant, dans le cas particulier d’un immeuble ne comportant pas plus de sept étages, mais présentant des difficultés d’accès (distance ou dénivelée importante entre l’entrée du bâtiment et la voie engins), il conviendra d’examiner la situation au cas par cas avec les services de secours. Récapitulation des cas Famille Colonne sèche 3ème B ² R + 7 3ème B > R + 7 3ème B « déclassés » en 3ème A ² R + 7 3ème B « déclassés » en 3ème A > R + 7 Non (sauf difficultés d’accès) Oui Non Oui`,
    commentaire: `doivent comporter une colonne sèche par escalier, sans notion de nombre d’étages. Pour la détermination de l’emplacement exact du raccord d’alimentation de la colonne sèche, il y a lieu de consulter les services de secours (norme NF S 61-750). Les difficultés d’accès des secours (immeuble en fond de cour, etc.) seront à juger en liaison avec les services d’incendie et de secours.`
  },
  "99": {
    texte: `Les aires réservées à la circulation des piétons entre la voirie générale et les accès principaux aux immeubles doivent être nettement distinctes de celles réservées à la circulation automobile.

AUX BATIMENTS D'HABITATION Version 3 OBLIGATIONS DES PROPRIETAIRES 4 janvier 2021 Origine : Direction technique Auteur : J.P. Henry Date de diffusion : 12 janvier 2021 Fascicule annulé : Version 2 de juin 2015`
  },
  "100": {
    texte: `Le propriétaire ou, le cas échéant, la personne responsable désignée par ses soins, est tenu d’afficher dans les halls d’entrée, près des accès aux escaliers et aux ascenseurs :

- les consignes à respecter en cas d’incendie ;

- les plans de sous-sols et du rez-de-chaussée. Les consignes particulières à chaque type d’immeuble à respecter en cas d’incendie doivent être également affichées dans les parcs de stationnement, s’il en existe, à proximité des accès aux escaliers et aux ascenseurs. A minima, les éléments suivants figurent sur les plans d’intervention :

- l’emplacement des cloisonnements principaux et des cheminements des sous-sols ;

- l’indication des dégagements, voies intérieures ou cours permettant d’atteindre l’extérieur du bâtiment ;

- l’emplacement des ascenseurs et monte-charge, avec leurs accès ;

- l’emplacement des locaux poubelles et réceptacle s’il existe un vide-ordures ;

- l’emplacement des moyens de secours, notamment les prises de colonnes sèches et les commandes de désenfumage.`
  },
  "101": {
    texte: `Le propriétaire ou, le cas échéant, la personne responsable désignée par ses soins, est tenu de faire effectuer, au moins une fois par an, les vérifications des installations de détection, de désenfumage, de ventilation, ainsi que de toutes les installations fonctionnant automatiquement et les colonnes sèches. Il doit s’assurer, en particulier, du bon fonctionnement des portes coupe-feu, des ferme-portes ainsi que des dispositifs de manoeuvre des ouvertures en partie haute des escaliers. Il doit également assurer l’entretien de toutes les installations concourant à la sécurité et doit pouvoir le justifier par la tenue d’un registre de sécurité.`
  },
  "102": {
    texte: `Le propriétaire doit s’assurer que les transformations apportées aux immeubles en ce qui concerne l’affectation des locaux, les matériaux constitutifs des revêtements des couvertures ou des façades, les revêtements de sols et des parois des circulations communes, des celliers ainsi que des parcs, la constitution de ces parois ne soient pas de nature à diminuer les caractéristiques de réaction et de résistance au feu exigées pour ces divers éléments par le présent arrêté.

Le propriétaire est tenu de s’assurer du respect des dispositions de l’article 1er, en identifiant les places de stationnement utilisées effectivement par des personnes non résidentes du bâtiment d’habitation pour une durée inférieure à 30 jours consécutifs.`
  },
  "103": {
    texte: `Les vérifications visées à l’article 101 ci-avant doivent être effectuées par des organismes ou techniciens compétents, choisis par le propriétaire. Le registre défini à l’article R. 111-13 du code de la construction et de l’habitation comprend a minima :

- les rapports des vérifications exigées à l’article 101 du présent arrêté ;

- les rapports d’intervention d’entretien ;

- les opérations de maintenance`
  },
  "104": {
    texte: `Le propriétaire est tenu de présenter toutes les justifications utiles concernant l’entretien et la vérification des installations sur demande des agents assermentés et commissionnés à cet effet.`,
    commentaire: `Cet article montre l’importance de la tenue à jour du registre de sécurité et de la possibilité, si nécessaire, de justification des actes techniques de vérification par des factures, notamment dans le cas d’investigations approfondies suite à un incendie ayant entraîné des pertes de vies humaines ou des conséquences graves.

AUX BATIMENTS D'HABITATION Version 2 AGREMENT DES DISPOSITIFS OU DISPOSITIONS CONSTRUCTIVES NON PREVUS PAR LA REGLEMENTATION`
  },
  "105": {
    texte: `Les dispositifs ou les dispositions constructives non décrits dans les articles ci-avant mais qui permettent de satisfaire aux exigences du présent arrêté doivent être agréés conjointement par le ministre en charge de la construction de l'Urbanisme, du Logement et des Transports et par le ministre de l'Intérieur et de la Décentralisation. La demande d’agrément est directement et conjointement adressée au ministre en charge de la construction et au ministre de l’intérieur, ainsi qu’à leurs administrations centrales. Le dossier nécessaire à la délivrance de l’agrément interministériel présente les mesures et les éléments techniques permettant d’assurer le respect des objectifs de sécurité du présent arrêté. Le dossier comporte :

- soit une appréciation de laboratoire basée sur un essai de résistance ou de réaction au feu et réalisée par un laboratoire agréé ;

- soit, selon les cas, une étude d’ingénierie de sécurité incendie en résistance au feu réalisée par un bureau d’étude et validée par un avis sur étude d’un laboratoire agréé, ou une étude d’ingénierie de sécurité incendie en réaction au feu réalisée par un laboratoire agréé et validée par un avis sur étude d’un laboratoire agréé, ou une étude d’ingénierie de sécurité incendie en désenfumage, réalisée par un organisme reconnu compétent. Avant la réalisation de l’étude d‘ingénierie, les objectifs à atteindre doivent être validés par les ministères chargés de délivrer l’agrément ;

- soit une combinaison des deux précédents points. A défaut de réponse par l’autorité compétente dans un délai de quatre mois à compter du dépôt du dossier complet, l’agrément est accordé.`,
    commentaire: `Le recours à l’article 105 permettant la réalisation de bâtiments d’habitation ne répondant pas aux exigences de la réglementation incendie est une solution lourde, inadaptée aux programmes de faible ampleur, ou pour lesquels un délai d’attente conséquent ne peut pas être respecté. L’accord conjoint des 2 ministères, la validation des objectifs à atteindre avant la réalisation de l’étude d’ingénierie impose des délais incompressibles.

APPLICATION DANS LE TEMPS`
  },
  "106": {
    texte: `Les dispositions du titre VIII du présent arrêté sont applicables aux projets de construction ayant fait l'objet d'une demande de permis de construire ou de prorogation de permis de construire déposée après la date de publication du présent arrêté au Journal officiel. Les autres dispositions du présent arrêté sont applicables aux projets de construction ayant fait l'objet d'une demande de permis de construire ou de prorogation de permis de construire déposée un an après la date de publication du présent arrêté au Journal officiel. (Arrêté du 18 août 1986) Les constructions qui feront l'objet d'une déclaration d'ouverture de chantier postérieurement à la date du 1er octobre 1988 devront être conformes aux prescriptions du présent arrêté et ce quelle que soit la date du dépôt de la demande de permis de construire.`
  },
  "107": {
    texte: `L'arrêté du 10 septembre 1970 relatif à la protection des bâtiments d'habitation contre l'incendie est abrogé à compter de la date d'entrée en vigueur du présent arrêté.`
  },
  "108": {
    texte: `Le directeur de la Construction, le directeur de l'Urbanisme et des paysages et le directeur de la défense et de la sécurité civile sont chargés, chacun en ce qui le concerne, de l'exécution du présent arrêté, qui sera publié au Journal officiel de la République française.

CONFORMITE AUX NORMES Lorsque, dans le présent arrêté, il est exigé pour des appareils ou équipements la conformité à une norme, les appareils ou équipements concernés doivent être soit conformes aux normes françaises, soit conformes aux normes harmonisées ou aux normes étrangères reconnues équivalentes qui figureront dans un avis à paraître au Journal officiel de la République française. Les essais pratiqués par les laboratoires d'autres États membres de la Communauté économique européenne appartenant à un système d'accréditation fondé sur les guides ISO/CEI ou les normes françaises équivalentes seront reconnus équivalents aux essais pratiqués par les laboratoires français agréés. Les essais partiels pratiqués par les laboratoires des autres États membres de la Communauté économique européenne répondant aux dispositions de l'alinéa ci-dessus ne seront pas répétés par les laboratoires français agréés, sauf s'il apparaît que leur validité est contestable.`,
    commentaire: `Cette partie du titre XI, ayant trait à l'application des normes, est parue dans l'arrêté du 19 décembre 1988 sans avoir fait l'objet d'une numérotation d'article.

TERMINOLOGIE ■ Pour cette fiche, nous avons préféré adopter l’ordre alphabétique, contrairement à ce qui figure dans la brochure n° 1603 du Journal officiel, « Bâtiments d’habitation – Texte réglementaire avec illustrations ». Cellier et cave Pour une bonne compréhension, il est convenu dans le présent arrêté de désigner par :

- cellier : une annexe privative non habitable à rez-de-chaussée ou en étage ;

- cave : une annexe privative non habitable en sous-sol. Clapet Dispositif d’obturation placé à l’intérieur d’un conduit. Il est normalement en position d’ouverture. Nota : Pour cette définition, se référer à l'article 45 Classe de pénétration Au sens du présent arrêté, cette classe de pénétration ne s’applique qu’à la couverture. Il s’agit du temps de passage du feu au travers de la couverture. Il s’exprime par classe :

- T 30 lorsque le temps de passage au feu est supérieur à 30 minutes ;

- T 15 lorsque le temps de passage au feu est compris entre 15 et 30 minutes ;

- T 5 lorsque le temps de passage au feu est compris entre 5 et 15 minutes. Coffrage Habillage utilisé pour dissimuler un ou plusieurs conduits dont les parois ne présentent pas de qualité de résistance au feu et qui ne relient pas plusieurs locaux ou niveaux Nota : Pour cette définition, se référer à l'article 45 Conduit Volume fermé servant au passage d’un fluide déterminé Nota : Pour cette définition, se référer à l'article 45 Coupe-feu de traversée Addition de deux valeurs coupe-feu

- celle de la paroi d’un conduit mesurée avant la traversée d’une paroi ;

- et celle mesurée après la traversée. La mesure est faite en minutes pour bien définir le temps réel. Nota : Pour cette définition, se référer à l'article 45 Dégagements Sont regroupés sous le vocable « dégagements » les circulations horizontales et les escaliers. Les dégagements peuvent être « protégés » ou « non protégés ». Les circulations horizontales protégées peuvent être « à l’air libre » ou « à l’abri des fumées ».

Les escaliers protégés peuvent être « à l’air libre » ou « à l’abri des fumées ». Degré coupe-feu (CF) Les éléments « coupe-feu » sont ceux pour lesquels sont requis les critères de résistance mécanique, d’étanchéité aux flammes, d’absence d’émission de gaz inflammable et d’isolation thermique. Le degré coupe-feu est exprimé en fonction du temps pendant lequel les éléments doivent conserver leur fonction. Degré pare-flammes (PF) Les éléments « pare-flammes » sont ceux pour lesquels sont requis les critères de résistance mécanique d’étanchéité aux flammes et d’absence d’émission de gaz inflammable. Le degré pare-flammes est exprimé en fonction du temps pendant lequel les éléments doivent conserver leur fonction. Degré de stabilité au feu (SF) Les éléments « stables au feu » sont les éléments pour lesquels le critère de résistance mécanique est seul requis. La stabilité est exprimée en degrés en fonction du temps pendant lequel les éléments doivent conserver leur fonction. Gaine Volume fermé généralement accessible et renfermant un ou plusieurs conduits L’autre appellation courante, par exemple « gaine de ventilation », est remplacée ici par « conduit de ventilation « . Nota : Pour cette définition, se référer à l'article 45 Habitations collectives Au sens du présent arrêté, il s’agit de bâtiment d’habitation comportant des logements superposés. Habitations individuelles Au sens du présent arrêté, il s’agit de bâtiment d’habitation ne comportant pas de logements superposés. Immeuble distinct Cette notion n’intervient qu’au stade de la couverture. Des exemples sont fournis à l’article 15 Indice de propagation Au sens du présent arrêté, il ne s’applique qu’à la couverture. Il s’agit de la vitesse de propagation du feu sur la surface de la couverture. L’indice dépend de la durée entre le temps T1 au début de la combustion et le temps T2 à la fin :

- indice 1, lorsque la valeur de T2 –T1 est supérieure à 30 minutes ;

- indice 2, lorsque la valeur de T2 –T1 est comprise entre 10 et 30 minutes ;

- indice 3, lorsque la valeur de T2 –T1 est inférieure à 10 minutes. Joule Unité de quantité de chaleur valant 10 -7 erg ou 0,102 kgm.

Le joule est l’énergie dépensée en 1 seconde par un courant de 1 ampère passant à travers une résistance de 1 ohm. Panneau de façade Cette notion insérée dans le texte de l’arrêté a la même signification que « façade « . Parois Ce sont les murs et les planchers. Plancher bas du logement le plus haut Il s’agit, dans le cas courant, du plancher bas du dernier niveau habitable. Dans le cas de logement duplex ou avec mezzanine, il s’agit du niveau le plus bas à la double condition :

- que la porte palière du duplex se situe à ce même niveau ;

- que celui-ci comporte au moins une pièce principale. Réaction et résistance au feu Ne pas confondre Concerne Classement Réaction au feu et Les matériaux en tant que combustibles M0

M1 M2 M3 M4 Combustible plus ou moins inflammable               Résistance au feu Les éléments de construction devant conserver leur fonction Stable au feu Pare flammes Coupe feu de h àh − −           9 14 6 degrés / Un matériau incombustible par nature devient M0 par essai. Une prescription prévoyant l’emploi de matériaux incombustibles est satisfaite par l’emploi de matériaux réputés incombustibles : béton, métal, etc. Une prescription M0 est satisfaite si l’on peut faire référence à un procès-verbal d’essai. Trappe Dispositif d’accès, fermé en position normale. Nota : Pour cette définition, se référer à l'article 45 Volet Dispositif d’obturation placé à l’extrémité d’un conduit. Il peut être ouvert ou fermé en position d’attente. Il est à commande automatique ou manuelle Nota : Pour cette définition, se référer à l'article 45

COMMENTAIRES NON SPECIFIQUES A UN ARTICLE DE L’ARRETE DU 31 JANVIER 1986 MODIFIE Génie Climatique ◆ QUESTION/REPONSE - MINISTERE DE L’EQUIPEMENT, 2 JANVIER 1997 Peut-on déroger à l’article 22 de l’arrêté du 23 juin 1978 qui prescrit deux ou un seul accès direct aux sous-stations de chauffage urbain depuis l’extérieur, suivant que leur puissance utile totale excède ou non 2 000 kW

Nota : Cette question a été adressée par l'Union des caisses nationales de sécurité sociale (UCANSS) au ministère de l'Équipement, du Logement, des Transports et du Tourisme, par lettre en date du 18 novembre 1996. L’article 22 de l’arrêté du 23 juin 1978 précise : « Tout local de sous-station alimentée par la vapeur haute pression ou de l’eau surchauffée à haute température doit offrir au personnel des moyens de retraite facile dans deux directions au moins dès que la puissance utile totale excède 2 000 kW. « Ce local doit comporter deux accès directs de l’extérieur si la puissance utile totale excède 2 000 kW ou au moins un accès direct de l’extérieur si la puissance utile totale n’excède pas 2 000 kW. Toute communication du local avec l’intérieur d’un bâtiment d’habitation, de bureaux ou d’une zone accessible au public est interdite. « Les portes interposées doivent s’ouvrir de l’intérieur vers l’extérieur et elles doivent pouvoir être ouvertes de l’intérieur même lorsqu’elles comportent un dispositif permettant le verrouillage depuis l’extérieur. » Les différentes règles contenues dans l’arrêté du 23 juin 1978 ne peuvent donner lieu à des dérogations que sous réserve de l’accompagnement de mesures compensatoires ; en particulier, l’article 40 prévoit ce type de procédure avec une décision conjointe des ministres chargés de l’Industrie et du Logement, en ce qui concerne les bâtiments d’habitation et de bureaux. A titre exceptionnel, l’avis émis en date du 21 janvier 1991 par la direction de l’Habitat et de la Construction ne constitue qu’une illustration indicative de la manière dont pouvait être traité un problème particulier et non une remise en cause au cas par cas de la procédure de dérogation. Dans le cas précédent, s’agissant d’une opération en phase initiale de conception, il est indispensable de maintenir des accès directs depuis l’extérieur aux locaux des sous-stations, conformément à l’article 22, afin de faciliter les différentes interventions de maintenance et de mieux garantir la sécurité des locaux attenants (habitations, bureaux, etc.), en cas de dysfonctionnement accidentel des installations.

◆ QUESTIONS/REPONSES - MINISTERE DE L’EQUIPEMENT, 3 JANVIER 1997 Peut-on accéder à une installation de production de chaleur centralisée au gaz d’un immeuble d’habitation, à partir de son parc de stationnement couvert ; cette installation pouvant être soit une chaufferie assujettie à l’arrêté du 23 juin 1978, soit deux mini-chaufferies conformes au Cahier des charges C 321-4 ? (1) Par ailleurs, quelles dispositions doit-on adopter pour la porte d’accès au local de la chaufferie ? (2) Nota : (1) Ce cahier des charges est publié par l'Association technique de l'industrie du gaz (ATG), 62, rue de Courcelles, 75008 Paris. (2) Ces deux questions ont été adressées par le bureau d'études « Ingénierie I 2C » au ministère de l'Équipement, du Logement, des Transports et du Tourisme, par lettre en date du 21 novembre 1996. L’article 78 de l’arrêté du 31 janvier 1986 définit la vocation principale d’un parc de stationnement qui est celle de permettre « le remisage, en dehors de la voie publique, des véhicules automobiles et de leur remorques à l’exclusion de toute autre activité ». A ce titre, les espaces et installations destinés à une autre affectation ne doivent pas être en communication avec les parcs de stationnement. De plus, les exigences réglementaires spécifiques à la conception de chaufferies ou de mini-chaufferies sont définies dans les arrêtés du 23 juin 1978 (installations de plus de 70 kW de puissance utile totale) et du 2 août 1977 modifié (installations de moins de 70 kW de puissance utile totale). En ce qui concerne les chaufferies, l’article 5.2 de l’arrêté du 23 juin 1978 relatif aux installations fixes destinées au chauffage et à l’alimentation en eau chaude des bâtiments d’habitation indique que la chaufferie située à l’intérieur d’un bâtiment d’habitation doit être d’un accès direct par l’extérieur du bâtiment ou par des parties communes du bâtiment. Parmi ces parties communes (hormis les places de stationnement elles-mêmes) figure le parc de stationnement couvert qui fait l’objet du titre VI de l’arrêté du 31 janvier 1986. Cet arrêté ne comporte aucune prescription particulière interdisant l’accès éventuel d’une chaufferie à partir du parc de stationnement. Dans la mesure où la chaufferie respecte l’ensemble des prescriptions définies à l’arrêté du 23 juin 1978, ainsi que celles de l’arrêté spécifique au combustible utilisé (arrêté du 2 août 1977 modifié pour le gaz combustible, arrêté du 21 mars 1968 modifié pour le fuel), la chaufferie peut être implantée dans le parc de stationnement. Il convient de veiller à ce que la porte d’accès au local de la chaufferie débouche directement sur une circulation principale ou une circulation secondaire d’au moins 0,80 m de largeur comportant un dispositif anti-stationnement. Sur cette porte doit figurer, en plus de l’identification du local, la mention « sans issue » de manière très apparente. S’agissant des mini-chaufferies définies à l’article 16 bis de l’arrêté du 2 août 1977 modifié, le cahier des charges C 321-4 a été rendu d’application obligatoire par décision ministérielle n° T/27519 du 28 avril 1995. En complément des dispositions réglementaires, différentes normes comportent des solutions pour la conception et la mise en œuvre d’équipements liés à la sécurité (prévention contre les risques d’incendie, contre les dysfonctionnements accidentels des équipements et des installations, etc.). Même si l’ensemble des solutions contenues dans les normes n’est pas systématiquement rendu d’application obligatoire par les pouvoirs publics, afin de laisser une marge d’initiative quant aux choix techniques envisageables, il est fortement recommandé d’utiliser ces normes. En effet, les polices d’assurance responsabilités des constructeurs n’accordent la garantie que pour des travaux dont la réalisation est prévue avec des matériaux et selon les procédés conformes à ces documents. Cette réponse a été confirmée par la Commission du construction, réunie le 25 juin 1997.`
  },
};

/**
 * Un article, par son numéro.
 *
 * Les modules écrivent parfois « 30 et 31 » ou « 73 à 76 » : une exigence qui
 * se lit dans deux articles à la fois. On rend alors le premier, qui porte la
 * règle, plutôt que rien.
 */
export function articleDe(numero) {
  const cle = String(numero ?? "").trim();
  if (!cle) return null;
  if (ARTICLES[cle]) return { numero: cle, ...ARTICLES[cle] };
  const premier = cle.match(/^(\d+\s*bis|\d+|1er|premier)/i)?.[1];
  const normalise = /^premier$/i.test(premier ?? "") ? "1er" : premier;
  return normalise && ARTICLES[normalise] ? { numero: normalise, ...ARTICLES[normalise] } : null;
}

/** Le nombre d'articles portés, pour l'affichage de la portée. */
export const ARTICLES_PORTES = Object.keys(ARTICLES).length;
