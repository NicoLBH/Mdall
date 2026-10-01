# Ce que le corpus entier raconte

Le premier export était tronqué à mille lignes, et sa lecture figure dans
`ce-que-le-corpus-reel-raconte.md`. Celui-ci porte les **9 488 affirmations**,
et il dit autre chose. Trois des quatre conclusions du premier étaient fausses
parce qu'elles reposaient sur un neuvième du corpus, tiré d'un seul chantier.

Les chiffres sont ceux du fichier lu le 1ᵉʳ octobre 2026, par la porte du mode
développement. Aucune phrase de chantier n'est recopiée ici.

## Ce que le premier export faisait croire, et qui était faux

| Ce qu'on lisait sur mille lignes | Ce que disent les 9 488 |
|---|---|
| un seul chantier écrit | **cinq** chantiers (5 960 · 1 564 · 1 433 · 333 · 198) |
| 94 textes distincts, 10,6 copies chacun | **2 235** textes distincts, 4,2 copies |
| 964 lignes sur 1 000 sont des intitulés d'avis | **4 223 sur 9 488**, soit 44,5 % |
| 2 idées, toutes deux fausses | **41 lignes, 30 idées distinctes**, dont une tenait |

La seule conclusion qui résiste est la dernière, et elle résiste mal : il y a
quinze fois plus d'idées qu'annoncé, et elles sont presque toutes fausses pour
des raisons qu'on peut nommer. C'est ce que ce document fait.

## Le corpus, en trois espèces

| Espèce | Lignes | Part | Médiane | Lignes coupées | Idées |
|---|---|---|---|---|---|
| relevés de versement (« Document au corpus : … ») | 3 428 | 36,1 % | 9 mots | 23 | 6 |
| intitulés d'avis (« Avis — … ») | 4 223 | 44,5 % | 6 mots | 0 | 0 |
| le reste — de la prose | 1 837 | 19,4 % | 10 mots | 45 | 35 |

**Le dénominateur de la console comptait les trois.** « 0,7 % des affirmations
énoncent un lien » se calculait sur 9 488 ; sur la prose seule, c'est **2,4 %**.
Même mesure, trois fois et demie plus vraie. Et sur la prose, 6,2 % des lignes
portent un mot de liaison **quelque part** — la différence entre les deux est la
part que le découpage ne sait pas lire, parce que le mot n'est pas entre les deux
membres.

## Le défaut qui dominait tous les autres

**Un tiers de la mémoire était muet pour la console, et pour elle seule.**

3 428 affirmations portent un `statement` de la forme « Document au corpus :
<clé> ». Parmi elles, 3 273 — **34,5 % du corpus** — ne nomment aucun fichier :
la clé est un identifiant mdall, « acces-des-vehicules-lourds@batiment-a ».

Ce repli est connu et **déjà réparé à l'écran**. `titreDeLAffirmation` ne lit
plus la phrase versée : il lit le `payload`, qui porte le sujet et la valeur, et
affiche « Accès des véhicules lourds : interdit au-delà de 3,5 t ». Son
commentaire est sans ambiguïté : « Ce n'est pas une seconde vérité : c'est **la**
vérité, et la phrase n'en était qu'une mise en forme. »

Les huit lectures de la console, elles, lisaient la phrase. Donc :

- la console mesurait un corpus que personne ne voit ;
- un tiers de la mémoire n'offrait au découpage que des clés à tirets, où il n'y
  a ni verbe, ni liaison, ni rien à lire ;
- **six des quarante et une idées venaient de ces clés.** « Document au corpus :
  regle:type-d-escalier-exige@batiment-a » rendait
  `corpus règle —obligation→ bâtiment`. Pas une idée : un identifiant mal lu.

C'est la divergence que la règle 4 annonce, et elle était déjà consommée : l'écran
et la base disaient deux choses d'une même affirmation, et celle qui servait à
mesurer était la fausse. Les lectures lisent maintenant la même phrase que
l'écran. On ne réécrit pas les `statement` : une exécution qui a eu lieu ne
devient pas fausse (règle 6).

## Les trente idées, examinées une par une

Sur les trente, **une tenait** : « Type d'escalier exigé : escalier protégé » →
`escalier —impose→ escalier protégé`. Les vingt-neuf autres échouaient pour
quatre raisons, et chacune se nomme.

### 1. L'intitulé de lot devient le sujet

Presque toute affirmation de compte rendu commence par son lot : « 02 Démolition
Gros Œuvre — … », « Lot n° 1 : Démolition / Gros Œuvre — … ». `le_terme_de_tete`
prend le **premier** mot technique du membre, et c'est donc le nom du lot. Cinq
idées disaient `démolition gros —vise→ …`, le lot pour sujet.

**Ce défaut n'est pas réparé, et c'est mesuré.** Retirer l'intitulé avant de
couper remplace le nom du lot par un verbe à l'infinitif — `terrassements —vise→
accès` devient `mettre —vise→ accès`, et `vérification celui —entraîne→
démolition gros` devient `vérification —entraîne→ bien vouloir`. Un sujet faux
pour un autre. Et le lexique y perd : les intitulés de lot sont du vrai
vocabulaire de métier, partagé entre chantiers — « gros œuvre » sur trois
chantiers, « chauffage ventilation » sur trois, « électricité » sur quatre. Les
retirer fait tomber les termes partagés de **627 à 597**.

La bonne réponse n'est donc pas de les retirer, mais de les **lire comme ce
qu'ils sont** : une dimension de l'affirmation, à côté de sa phrase. Cela demande
une colonne, et c'est un autre travail.

### 2. La ligature « œ » coupait les mots en deux

`le_texte_normalise` remplace par une espace tout ce qui n'est pas une lettre
a-z, et « œ » n'était ni dans cette liste ni dans celle des accents. Donc :

    « manœuvre »       →  « man uvre »   →  terme « uvre »       (83 fois)
    « gros œuvre »     →  « gros uvre »                           (65 fois)
    « maître d'œuvre » →  « maitre d uvre »

Quarante et un termes distincts, 202 occurrences, tous abîmés de la même façon.
« Gros œuvre » est le lot le plus courant d'un chantier français et « manœuvre »
un mot de métier : le lexique de la console ne portait ni l'un ni l'autre. **Cinq
termes en « œuvre » passent le seuil des deux chantiers** dès que la ligature est
traduite.

Réparer `le_texte_normalise` ne suffisait pas : **la normalisation était recopiée
dans cinq fonctions**, chacune avec son propre `translate(lower(…))`. Le
correctif n'aurait touché qu'un chemin sur cinq. Les deux extractions qui
comptent — `les_sujets_dun_texte` et `le_terme_de_tete` — sont ramenées sur la
seule normalisation.

### 3. Une négation devenait son contraire

« Escalier prévu et escalier exigé : **non** conforme » rendait
`escalier prévu —impose→ conforme`. Le « non » fait trois lettres : il tombe sous
le seuil, et le sens de la phrase avec lui. L'idée affirme l'inverse du texte,
avec le même aplomb qu'une vraie.

Deux autres suivaient : « afin de **ne plus** perdre de temps » rendait
`perdre`, « afin de **ne pas** fragiliser » rendait `fragiliser`.

`le_terme_de_tete` refuse maintenant un terme que précède immédiatement une
négation, et une négation n'est plus elle-même candidate — « Aucune réservation »
rendait `aucune réservation`. La fenêtre est d'**un seul mot**, et c'est mesuré :
une fenêtre de trois refusait deux idées justes, parce que « Lot n°1 » laisse un
« n » derrière lui. Un refus de trop est une idée vraie qu'on ne verra jamais, et
cela ne se rattrape pas en regardant l'écran.

### 4. Quinze des vingt-cinq idées sont des intentions

Reste le plus profond, et il n'est pas un défaut de code.

| Sorte de lien | Idées distinctes |
|---|---|
| vise (`afin de`, `pour permettre`) | 15 |
| entraîne (`car`, `donc`) | 5 |
| empêche | 2 |
| impose · conditionne · permet | 1 chacune |

`LES_LIENS` dit depuis le début que « A afin de B » ne dit **que** ce qu'on vise.
Mais l'écran alignait les six sortes sans distinction : une liste de vingt-cinq
lignes faisait croire à vingt-cinq faits, là où il y a dix faits et quinze
intentions. La console les sépare maintenant, et dit ce qu'il faut en conclure.

Au fond, une liaison de but relie une **action** à son **but** — « Réaliser un
carottage afin de drainer » —, et non une chose à une chose. Ce n'est pas une
idée au sens de la mémoire : c'est une **tâche justifiée**. Faut-il en faire une
espèce à part, comme le constat l'est devenu
(`un-constat-nest-pas-une-idee.md`) ? La question est posée, pas tranchée : elle
demande une décision sur ce que la mémoire garde, pas un correctif.

## Et le seuil des deux chantiers ?

Il n'est pas ce qui bloque, et c'était la dernière hypothèse à écarter.

Aucune des trente idées n'apparaît sur deux chantiers. Mais ce n'est pas le seuil
qui est trop haut : c'est qu'il n'y a **que quarante-cinq lignes coupées dans
toute la prose**, chacune sur un seul chantier. Aucune amélioration du découpage
ne change cela. Les trois réparations de cette série font passer les idées de
trente à vingt-cinq distinctes — elles retirent du faux, elles n'ajoutent pas du
vrai, et c'est exactement ce qu'on leur demande.

## Ce qui reste, par ordre

1. **Le suivi des avis du bureau de contrôle.** 4 223 lignes sont des intitulés
   d'avis, et aucune ne porte de liaison. Le raisonnement est dans le texte écrit
   *sous* l'étiquette, et il n'est pas en mémoire. C'est la plus grande réserve de
   matière du produit.
2. **Le lot comme dimension, pas comme terme.** Mesuré ci-dessus : ni le garder
   dans la phrase ni le retirer ne convient. Il lui faut sa place.
3. **La tâche justifiée, espèce à part ?** Quinze des vingt-cinq idées en sont.
   Décision à prendre.
4. **65 lignes portent une lettre orpheline** (« INTERDIT C haque livraison ») :
   l'extraction PDF a coupé un mot sur un retour à la ligne. Une réparation
   mécanique recollerait aussi « n° 1 » et « m² » ; on le mesure et on ne le
   répare pas.
