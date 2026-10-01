# Le lot, la tâche, et ce qui ne se lit toujours pas

Troisième lecture du corpus entier, après deux séries de réparations. Elle répond
à deux questions laissées ouvertes — le lot, la tâche — et en ouvre une qui pèse
plus que les deux.

Chiffres du fichier lu le 1ᵉʳ octobre 2026. Aucune phrase de chantier n'est
recopiée ici.

## Où en était le corpus

| | avant les réparations | après |
|---|---|---|
| lignes coupées | 68 | **101** |
| idées distinctes | 30 | **26** |
| phrases de repli « Document au corpus : … » | 3 428 | **2 429** |

Les réparations ont fait ce qu'on attendait d'elles : elles ont retiré du faux
(`escalier prévu —impose→ conforme`, tiré de « non conforme », a disparu) et
rendu du vrai (33 lignes coupées de plus, grâce à la ligature et au payload).

## Mais la réparation du repli n'avait pris qu'un tiers

**2 274 affirmations — 24 % de la mémoire — se relisent encore ainsi :**

    Document au corpus : 02b81e88-8a77-4dd0-96a2-d25a78127665

Mille cent quatre-vingt-cinq ne portent qu'un identifiant technique ; les autres
une clé à préfixe.

La cause est la même que la fois précédente, d'un cran plus profond. La lecture
ne regardait que `payload->>'subject'` : c'est la branche de **l'affirmation**, et
il y en a cinq. Un avis se nomme par son numéro et sa rubrique, un rattachement
par son intitulé, un point de chantier par son lot et son titre, un document par
son nom. L'écrivain a les cinq ; le lecteur en avait une.

Il a fallu deux rounds pour voir les deux moitiés du même défaut : « la base ne
lit pas le payload », puis « la base n'en lit qu'un cinquième ». C'est ce que la
règle 4 décrit, et c'est aussi pourquoi les deux constructions passent maintenant
par une seule fonction de chaque côté, avec un seul jeu de cas pour les deux
épreuves.

### Et une reconstruction ne doit jamais appauvrir

Le banc a attrapé un piège que la correction aurait introduit. Un avis sans
numéro ni rubrique se reconstruit « Avis relevé sur une fiche ». Appliqué aux
1 185 lignes qui ne portent qu'un identifiant, cela les aurait rendues
**identiques à la lecture** — on aurait cru à une seule, là où il y en a mille.

Un identifiant illisible reste au moins distinct, et leur nombre est la mesure
honnête de ce que la mémoire ne sait pas dire (règle 5). La reconstruction ne
remplace donc la phrase versée que lorsqu'elle porte quelque chose de la ligne.
À l'écriture, où il n'y a rien à garder, la phrase vaut.

## Le lot : séparer les deux lectures, et non choisir

C'était la question posée. La mesure disait : le garder donne
`démolition gros —vise→ …`, le lot pour sujet ; le retirer partout fait tomber
les termes partagés par deux chantiers de **627 à 597**, parce que les noms de
lots sont du vocabulaire de métier partagé — « gros œuvre » sur trois chantiers,
« chauffage ventilation » sur trois, « électricité » sur quatre.

Il n'y avait donc pas à choisir, mais à **séparer les deux lectures** :

- le **lexique** lit l'affirmation entière, intitulé compris. Les 627 restent 627.
- la **coupe** ne lit que la phrase. Le lot cesse d'être un sujet d'idée.

### Deux marqueurs, et l'un n'était pas prévu

Un intitulé, c'est ce qui précède le premier tiret cadratin quand l'affirmation
commence par **un numéro de lot** — ou par **« Avis »**.

Le second marqueur n'était pas dans le plan : le banc l'a imposé. Dès que les
avis ont retrouvé leur phrase, « Avis A12 — le garde-corps permet de protéger la
circulation » a donné `avis —permet→ protéger`. « Avis » fait quatre lettres et
n'est pas un mot-outil : il devenait le sujet. Et c'est bâti exactement comme un
lot — une étiquette, un tiret, le contenu.

Mesuré : **5 475 affirmations (57,7 %)**, 217 intitulés distincts. 677 pour les
lots, le reste pour les avis.

### La règle large, essayée et rejetée

« Tout ce qui précède le premier tiret, au plus huit mots » attrape les mêmes
5 635 lignes — et, parmi elles, « Revêtements de la cage d'escalier : M2 — avis
favorable ». Là, ce qui précède le tiret **est le sujet**, et le détacher jetterait
précisément ce qu'on cherche. Une règle qui attrape huit fois plus de lignes n'est
pas huit fois meilleure ; celle-ci ne garde que les deux marqueurs que le
versement a écrits lui-même.

## La tâche : une espèce, et seulement `but`

Quinze des vingt-six idées distinctes venaient d'une liaison de but — « afin
de », « pour permettre ». Aucune ne tenait comme idée, et pour une raison de
forme : leur membre de gauche est un verbe à l'infinitif, parce que c'est une
instruction. « Réaliser un carottage afin de drainer la nappe » dit **quoi faire
et pourquoi** ; ce n'est pas « A entraîne B ».

Elles sont donc comptées et montrées à part, et écrites autrement — « faire A,
pour B », jamais « A vise B ». La forme est la raison pour laquelle ce n'en est
pas une ; l'écrire comme une idée déferait la distinction.

**`permet` n'y est pas**, et c'est délibéré. « Le garde-corps permet de protéger
la circulation » relie bien deux choses : c'est l'exemple de référence de la
doctrine, et le ranger parmi les tâches l'aurait perdu.

Reste : **onze idées et quinze tâches**, au lieu de vingt-six idées.

## « aucun degré exigé » n'est pas une obligation

Un avis rendu lisible a immédiatement produit ceci :

    « Parois séparant les ensembles de celliers ou caves :
      aucun degré exigé par cet alinéa »

    →  parois séparant  —impose→  alinéa

Deux choses fausses. Le terme de droite est un renvoi de règlement ; et surtout
**l'obligation n'existe pas** — la phrase dit qu'aucun degré n'est exigé. La règle
du round précédent ne pouvait pas l'attraper : « aucun » ne précède aucun des deux
termes, il précède **le mot de liaison**.

Une négation dans les **deux mots** qui précèdent la liaison la nie donc, et rien
n'est rendu. Deux mots : une fenêtre d'un seul n'attrape qu'une ligne sur dix
(« degré » est entre « aucun » et « exigé ») ; trois donne le même résultat que
deux, et à égalité la règle la plus étroite est celle qu'on saura corriger.

Dix lignes, deux idées distinctes, et les deux disaient le contraire de leur
phrase.

### Et « alinéa » n'a pas été ajouté aux mots-outils

C'était la correction évidente, et elle est inutile : la seule idée qui tirait ce
terme est celle que la règle ci-dessus refuse déjà. Mesuré, l'ajout ne change
aucun chiffre. Une liste de mots qu'on allonge sans effet est une liste qu'on ne
relira plus.

## Ce qui a été envisagé et écarté, par la mesure

**Écarter les verbes d'instruction des termes** (« mettre », « réaliser »,
« revenir »). C'était la suite apparente du lot : une fois l'intitulé détaché, le
sujet devient un infinitif. Mais la liste n'a aucune base mécanique, et surtout
elle tuerait le terme de droite des vraies idées — « protéger » est le membre de
droite de l'exemple de référence. Le besoin disparaît de lui-même : une fois
`but` devenu une tâche, un infinitif à gauche est **correct**, c'est l'action à
faire.

## Ce qui reste, et dans quel ordre

1. **Le suivi des avis du bureau de contrôle.** Il devient plus clair encore : les
   avis sont désormais lisibles, et ce qu'ils portent est une étiquette plus un
   verdict. Le raisonnement est dans le texte écrit *sous* l'étiquette, et il
   n'est toujours pas en mémoire.
2. **Les 1 185 lignes qui ne portent qu'un identifiant.** Leur charge n'a ni
   numéro ni rubrique. Ou bien la lecture du rapport ne les a pas relevés, ou bien
   ils n'y étaient pas : c'est une question à poser au lecteur de rapports, pas au
   découpage.
3. **L'arbitrage histoire / présent** dans les dénominateurs de la console. La
   mesure existe depuis deux rounds ; le choix reste à faire.
4. **65 lignes portent une lettre orpheline** (« INTERDIT C haque livraison ») :
   l'extraction PDF a coupé un mot sur un retour à la ligne. Une réparation
   mécanique recollerait aussi « n° 1 » et « m² » ; on le mesure et on ne le
   répare pas.
