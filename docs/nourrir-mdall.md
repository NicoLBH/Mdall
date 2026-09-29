# Nourrir Mdall — ébauche

**À quoi sert cette page :** décider **d'où vient la matière** — les mails, les
pièces d'un projet, les textes du métier, et les cent historiques de chantier
qu'on a sous la main — et comment la faire entrer **sans payer un modèle pour
chaque page**. Elle s'enrichit au fil des réflexions.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## 1. La règle qui gouverne cette page

> **Le modèle est le dernier recours, pas le premier geste.**

C'est le fondamental déjà posé — *« je dois pouvoir me passer de l'IA et du LLM,
qui ne sont là que pour me rendre la vie plus confortable »* — appliqué à
l'ingestion. Et ce n'est pas une position de principe : c'est une position de
coût. Cent historiques de chantier représentent des dizaines de milliers de
documents. Les faire lire à un modèle, page par page, coûte le prix d'un salaire
et ne rend, pour l'essentiel, rien qu'on ne puisse obtenir autrement.

Trois conséquences, dans cet ordre :

1. **Ce qui se déplie ne se lit pas.** Un `.eml` est du texte structuré ; un
   tableau est un tableau ; une date est une date. Du décorticage, pas de la
   compréhension.
2. **Ce qui se trie ne se lit pas non plus.** La grande majorité des pièces d'un
   chantier ne porte rien pour la mémoire — convocations, accusés de réception,
   « ok pour moi ». Les écarter est du filtrage, et c'est **auditable**, ce qu'un
   modèle n'est pas.
3. **Ce qui reste se lit une fois.** Et l'on garde ce qu'il a rendu, indexé sur
   l'empreinte du contenu. Relancer la chaîne ne doit **jamais** repayer.

## 2. Ce qui existe déjà, et qui est gratuit

C'est le point de départ, et il est plus avancé qu'il n'y paraît.

| ce qui existe | où | ce que ça coûte |
|---|---|---|
| déplier un `.eml` — en-têtes, dates, adresses, encodages, multipart | `services/un-mail-deplie.js`, `decoder-un-mail.js` | **rien** |
| reconstituer un fil, séparer le propos de la citation, repérer qui cite qui | `services/le-fil-des-mails.js` | **rien** |
| l'empreinte d'un texte et la comparaison de deux passages (`empreinteDuTexte`, `leMemeTexte`) | `le-fil-des-mails.js` | **rien** |
| montrer **ce qu'on n'a pas su placer** (règle 5) | `services/trous-dun-mail.js` | **rien** |
| le glissé-déposé d'un fil de mails, et son écran | `views/studio/dev/lecture-des-mails.js` | **rien**, et l'écran le dit |
| le dossier des mails d'un projet, **privé par construction** | `le-dossier-des-mails.js` + migration dédiée | — |
| la langue de la mémoire, et sa grammaire | `services/memoire-en-texte.js`, `mdall-en-ecriture.js` | **rien** |
| le référentiel des formes de raisonnement | `le_referentiel_des_formes` | — |

L'en-tête de l'écran des mails dit déjà la doctrine :

> « Un PDF est une image de page : le transcrire demande un modèle. Un `.eml`
> est du texte structuré — le déplier est du décorticage, et il se fait
> entièrement dans le navigateur. **Aucun appel, aucune dépense.** »

## 3. Les cent historiques : le vrai sujet

> *« J'ai en ma possession plus de 100 historiques de projet, avec toutes leurs
> phases (mails, plans, rapports de bureau de contrôle). Comment faire ingérer
> ça au système sans consommer du LLM à grande échelle ? »*

### D'abord : ce qu'on cherche là-dedans n'est pas le contenu

C'est le point qui change tout, et il est déjà écrit dans le plan de prédiction
(`docs/la-memoire-qui-predit.md`, § 3) : l'unité de capitalisation est
**l'épisode**.

```
épisode = (contexte, suite des sujets ouverts, constats rencontrés, issues)
```

Or **la séquence est presque entièrement dans les métadonnées** : les dates, les
objets de mails, les expéditeurs et leurs rôles, les noms de dossiers, les
indices de révision des plans, les en-têtes des rapports. *Après « profondeur
hors gel » vient « type de fondation », puis « reprise en sous-œuvre du
voisin »* — cette suite se lit dans **l'ordre et les intitulés**, pas dans les
corps de texte.

> **Ce qui fait la valeur de Mdall coûte presque rien à extraire.** Ce qui coûte
> cher à extraire — le détail technique de chaque pièce — est ce qu'un meilleur
> modèle saura faire aussi bien demain.

C'est l'inverse de l'intuition, et c'est une très bonne nouvelle.

### Ensuite : les cinq étages, du gratuit au payant

**Étage 0 — dédoublonner.** Une empreinte par pièce, une par passage. Dans une
boîte de messagerie, la citation représente couramment les deux tiers du texte :
le même paragraphe y est présent quinze fois. `empreinteDuTexte` et
`lesMessagesCites` existent. Gratuit, et c'est le plus gros gain.

> *Fait, pour le comptage* — `services/le-dedoublonnage.js`. Un message est
> reconnu par son **`Message-ID`** quand il en porte un : c'est une identité
> qu'il tient de la messagerie qui l'a émis, et qui survit aux transferts. En
> calculer une autre alors qu'elle est là reviendrait à en avoir deux
> (règle 10). Sans lui, une clé sur quatre choses — qui, quand, l'objet, le
> propos ramené à ce qui le distingue —, parce qu'aucune ne suffit seule.
>
> Une pièce jointe est reconnue **par ses octets, et rien d'autre**. Le nom ne
> vaut rien (« Plan.pdf » désigne quinze plans sur un chantier, et le même plan
> voyage sous trois noms) ; la taille non plus (deux révisions pèsent souvent
> le même nombre d'octets).
>
> Ce qu'on n'a pas su empreindre — `crypto.subtle` absent d'une page servie
> sans TLS — **n'est rapproché de rien**, ni pour dire que c'est le même, ni
> pour dire que ce ne l'est pas, et l'écran le dit (règle 5).
>
> **Rien n'est jeté** : cet étage *compte*. Ce qui se garde et ce qui s'écarte
> est une décision de l'étage suivant, et elle viendra avec un endroit où
> écrire.
>
> Ce qui reste de l'étage 0 : **retirer les citations** du propos avant de
> l'empreindre. `ceQuonCite` sait déjà les séparer ; aujourd'hui l'empreinte
> porte sur le corps entier, donc deux exemplaires d'un même message dont la
> citation a grossi comptent pour deux.

**Étage 1 — déplier.** `.eml`, **`.msg`**, tableurs, PDF **nés numériques** (le
texte y est déjà, il n'y a rien à reconnaître). Gratuit.

**Étage 2 — trier.** Un classement par règles : l'expéditeur, l'objet, la
présence d'une référence normative, d'une cote, d'une date d'échéance. Il jette
la majorité, et il **dit pourquoi** — c'est auditable, et une pièce jetée à tort
se retrouve. Gratuit, et c'est là qu'on gagne le second plus gros lot.

**Étage 3 — la grammaire.** Mdall a déjà une langue pour la mémoire, et un
analyseur : un nombre suivi d'une unité, une référence de DTU, un article, une
date, un niveau, une zone. Ce sont des **formes**, pas du sens. Gratuit, et
c'est ce qui remplit `porteSur` et les valeurs.

**Étage 4 — le petit modèle.** Sur ce qui reste, et pour des tâches courtes :
classer, nommer, rapprocher. C'est du travail de modèle **rapide et bon marché**,
pas du travail de modèle de tête.

**Étage 5 — le grand modèle.** Seulement sur ce que l'étage 4 a signalé comme
incertain. Et **le taux d'escalade est lui-même un chiffre qu'on mesure** : s'il
monte, c'est que les étages 2 et 3 ont un trou, pas qu'il faut payer davantage.

### Et l'OCR ?

Un rapport de bureau de contrôle scanné, un plan annoté à la main : là, il faut
reconnaître. `extract-pdf-text` et `recognize-handwritten-document` existent.
Mais c'est le **dernier** gisement à ouvrir, pas le premier : il est cher, et
l'épisode se reconstitue sans lui.

## 4. Comment on « entraîne » le modèle prédictif

**On ne l'entraîne pas.** C'est déjà tranché dans `docs/la-memoire-qui-predit.md`,
§ 4, et il faut le redire ici parce que la question revient naturellement :

- **le prédicteur 1** est une fréquence : du comptage ;
- **le prédicteur 2** est un voisinage sur des vecteurs de contexte courts : du
  comptage encore, **sans modèle du tout** ;
- **le modèle ne prédit rien — il rédige.**

Donc : pas d'entraînement, pas de réglage fin, pas de corpus à constituer pour
un apprentissage. Ce qu'il faut n'est pas un jeu de données : ce sont des
**épisodes datés**, et ils se remplissent rétroactivement.

> **Le LLM ne prédit jamais ; il phrase.**

Et la mesure ne demande aucun utilisateur : on **prédit dans le passé**. À la
date *T* du projet *P*, avec seulement ce qu'on savait alors, qu'aurait dit le
moteur ? Cent historiques de chantier, c'est exactement cela : **cent jeux
d'épreuve gratuits**, et de quoi savoir dès le premier mois si le moteur bat sa
ligne de base.

C'est, de loin, la meilleure utilisation de ces cent projets — meilleure que
d'en extraire le contenu.

## 5. Le contenu normatif : ce qu'on peut, et ce qu'on ne peut pas

> *« Ajout de contenus normatifs ? (Eurocodes, DTU, guides CSTB…) »*

### Ce qu'on ne fait pas

**On ne verse pas les textes.** Les Eurocodes, les DTU et les guides du CSTB
sont des œuvres **vendues** par leurs éditeurs. Les recopier dans le produit
serait une contrefaçon — et Mdall ne peut pas être « exemplaire dans le respect
des lois » et faire cela. Ce n'est pas une prudence excessive : c'est le genre de
chose qui arrête une entreprise.

### Ce qu'on fait à la place, et qui vaut mieux

**On cite.** Une référence, un numéro d'article, une courte citation avec sa
source : c'est exactement ce que la ligne `parce que:` fait déjà, et c'est
l'usage normal d'une norme dans une note de calcul.

**On encode la règle.** « La profondeur hors gel se déduit du département et de
l'altitude » est une **méthode**, pas une expression protégée. Et c'est
précisément la forme que Mdall sait porter : une ligne `regle:`, signée, qui cite
le texte dont elle vient. L'Établi des utilitaires et le référentiel des formes
sont déjà cela.

> **La règle encodée et citée vaut plus que le PDF.** Le PDF, tout le monde peut
> l'acheter. La règle vérifiée, signée par un homme de l'art, rejouée sur
> quarante chantiers et **dont on sait quand elle s'est trompée**, personne ne
> l'a.

**Et l'utilisateur qui possède la licence garde son exemplaire chez lui.** C'est
son droit, et cela reste dans son projet — pas dans un fonds commun.

### La question ouverte

Les tableaux et abaques d'une norme : une valeur isolée relevée dans un tableau
est un fait, une table entière recopiée est une reproduction. **La frontière est
à faire préciser par un conseil**, avant d'industrialiser quoi que ce soit. Mdall
sait déjà porter une nappe et une courbe ; c'est la **permission** qui manque,
pas l'outil.

## 6. La confidentialité, et les cent historiques

Ces archives contiennent des noms, des adresses, des avis de personnes réelles,
et elles appartiennent à d'anciens clients. Deux obligations distinctes, et il ne
faut pas confondre :

**Le RGPD.** Pour ses propres projets, l'utilisateur est responsable de
traitement et Mdall son sous-traitant. Pour alimenter un **fonds commun**
inter-projets, rien ne traverse qu'à la condition déjà posée
(`docs/la-memoire-qui-predit.md`, § 6) : **la forme traverse, le contenu reste.**
Pas de nom, pas de commune, pas de valeur, pas de document. Des formes et des
comptes.

**La confidentialité contractuelle.** Elle est distincte, et souvent plus
stricte : un marché privé interdit couramment de réutiliser les pièces, même
anonymisées. À regarder **avant** d'ingérer, projet par projet.

Et la règle absolue vaut ici comme partout : **les conversations avec le
copilote ne traversent jamais**, dans aucun sens, sous aucun prétexte.

## 6 bis. Les `.msg`, et les pièces qu'on garde

### Le format, et ce qu'il ne coûte pas

Les archives d'un cabinet français ne sont pas en `.eml` : elles sont en `.msg`,
parce que tout le monde travaille sous Outlook. Un lecteur qui ne sait pas ouvrir
un `.msg` ne sait pas ouvrir les archives.

Un `.msg` n'est pas une image de page : c'est un **conteneur composé**, le format
que Windows emploie depuis trente ans pour ranger plusieurs flux nommés dans un
seul fichier. L'ouvrir est du décorticage — de la lecture d'octets, pas de la
compréhension. **Aucun appel, aucune dépense.** C'est l'étage 1, et il est
gratuit comme le reste de l'étage 1.

### La bonne surprise : on ne redécouvre rien

Un message reçu par SMTP porte ses **en-têtes de cheminement** dans une propriété
(`PR_TRANSPORT_MESSAGE_HEADERS`) : `Date`, `From`, `To`, `Cc`, `Message-ID`,
`References`, `In-Reply-To` — tout ce dont un fil a besoin, dans la forme exacte
d'un `.eml`. Sur le message réel qui a servi de référence, seize mille caractères
d'en-têtes.

On les donne donc à `unMailDeplie`, qui sait déjà les lire, les dater et en tirer
une chaîne de réponses. Une seconde lecture des dates écrite à côté finirait par
ne plus dire la même chose que celle du `.eml` (règle 10).

Ce qu'on remplace, et rien d'autre : les en-têtes qui décrivent le **corps**
(`Content-Type`, `Content-Transfer-Encoding`) annoncent un assemblage MIME qui
n'existe plus dans le fichier — Outlook l'a démonté, le texte est dans une
propriété et les pièces dans des sous-dossiers. Les garder ferait chercher des
frontières introuvables.

Et quand ces en-têtes manquent — un brouillon, un message interne qui n'a jamais
transité —, on les reconstitue depuis les propriétés, **sans inventer de date**,
et **on le dit** : un message reconstitué ne se relit pas comme un message reçu
(règle 5).

> `services/un-msg-deplie.js`. Une épreuve grave un `.msg` synthétique, avec des
> noms inventés : aucun message réel n'entre dans le dépôt, et celui qui a servi
> de référence a été relu à la main, hors du dépôt.

### Les pièces jointes se gardent entières — changement de décision

Ce document proposait de ne retenir que les noms. **C'était une erreur, et elle
est corrigée :**

> *« Je veux que l'on extraie et que l'on conserve les PDF joints. Quand nous
> saurons comment en exploiter la valeur, nous n'aurons pas besoin de recommencer
> la distribution de carburant. »*

C'est exact, et c'est le même raisonnement que celui qui gouverne toute cette
page : **la partie irrattrapable se prend maintenant**. Une archive qu'on n'a pas
ouverte aujourd'hui, on ne l'aura plus dans trois ans ; refaire tourner cent
boîtes de messagerie dans deux ans coûtera beaucoup plus cher que de garder des
octets qu'on tient déjà.

Le lecteur garde donc **tous les octets** de chaque pièce, sans rien trier.

### Ce qui distingue un plan d'un logo de signature

Une précaution, et elle n'est pas du tri : un `.msg` ne fait aucune différence
entre « le plan du R+1 » et « l'image du logo dans la signature ». Sur le message
réel de référence, **les huit pièces jointes étaient des images de signature** —
deux mégaoctets et demi pour rien — et les plans dont parlait le corps n'étaient
pas dans le fichier du tout (ils voyageaient par un lien de transfert).

#### La règle qu'on avait écrite, et pourquoi elle était fausse

> « Une image collée dans le texte porte un identifiant de contenu
> (`PR_ATTACH_CONTENT_ID`) ; un document n'en a pas. »

Vrai du message Outlook de référence. **Faux dès le second essai** : Gmail pose
un identifiant de contenu sur *toutes* ses pièces jointes, y compris un plan
d'architecte de cinq mégaoctets. Ce plan s'est affiché « image de signature », et
l'écran a annoncé « aucun document joint » alors qu'il y en avait un.

La leçon vaut plus que le correctif : **un seul message réel ne fait pas une
règle**. Ce qui ressemblait à une distinction structurelle n'était qu'une
habitude d'un émetteur.

#### Ce qu'on lit à la place : ce que le message déclare

Trois signaux, du plus explicite au plus factuel :

| signal | ce qu'il dit | plan Gmail | signatures Outlook |
|---|---|---|---|
| `PR_ATTACHMENT_HIDDEN` | « ne la montre pas comme une pièce jointe » | absent | 1 |
| `ATT_MHTML_REF` (dans `PR_ATTACH_FLAGS`) | « le corps appelle celle-ci » | absent | 4 |
| le corps HTML cite-t-il son `cid:` ? | le fait lui-même | non | — |

Les deux premiers sont des **déclarations** du message ; le troisième est la
vérification de dernier recours, pour un émetteur qui ne déclare rien.

**Le doute penche du côté du document.** Sans aucun signal, c'est un document :
un logo affiché parmi les documents se voit et s'ignore ; un plan rangé parmi les
logos disparaît de l'écran.

L'inventaire compte les deux séparément et **dit le poids de chacun** : taire les
vignettes ferait croire à des archives trois fois plus lourdes qu'elles ne sont.
*(`services/linventaire-du-versoir.js`.)*

### Le versoir

Le premier écran de la console d'administration
(`docs/la-console-de-ladministrateur.md`) : **on dépose des `.msg`, on voit ce
qu'ils portent**. Combien de messages se lisent, combien résistent, combien de
pièces sont de vrais documents, quelle période l'archive couvre.

Rien ne quitte le poste : les fichiers sont lus par le navigateur, dépliés,
comptés, et oubliés à la fermeture de l'onglet. **Aucun dépôt, aucun appel,
aucune dépense.**

Ce n'est pas une précaution de prudence, c'est l'ordre des opérations : on
regarde cent archives avant de décider ce qu'on en verse, et ce qui se versera un
jour se versera par une proposition signée, comme tout le reste (règle 1).

C'est aussi ce qui dissout la difficulté soulevée plus haut : ce traitement vit
**à côté de l'interface des utilisateurs**, dans un autre site, et il ne nourrit
pas la mémoire d'un chantier — il prépare le fonds commun.

Le versoir dit aussi, en haut de l'inventaire, **ce qui se répète** : combien de
messages sont le même message, combien de pièces sont la même pièce, et le poids
qu'on ne relira pas. C'est l'étage 0, et c'est le premier chiffre à connaître.

### L'archive : où les pièces se gardent

**Supabase Storage, casier `archives`, et le nom d'une pièce est son empreinte.**
Chaque pièce est rangée sous `pieces/<empreinte SHA-256>`
(`services/larchive-des-pieces.js`, migration `202610210001`). Trois
conséquences, et les trois comptent :

1. **Le dédoublonnage devient définitif, et gratuit.** Le même plan attaché à
   quinze réponses d'un fil écrit quinze fois au même endroit le même contenu —
   donc une fois. Il n'y a plus de décision à prendre : c'est l'adresse qui
   décide.
2. **Le chemin ne porte rien.** Ni nom de fichier, ni chantier, ni personne :
   soixante-quatre caractères hexadécimaux.
3. **Deux versements du même fichier ne peuvent pas diverger** (règle 4).

Un **registre** (`pieces_archivees`) dit ce que ces octets sont — nom, type,
poids, date — pour qu'afficher une ligne ne coûte pas cinq mégaoctets.

Casier et registre sont **réservés aux administrateurs**, par la même porte que
la console (`est_administrateur()`). Ni l'un ni l'autre n'est connu d'une
politique de projet, et ils ne connaissent aucun projet : **ce n'est pas la
mémoire d'un chantier.**

**Verser est un geste explicite** : un bouton, après avoir vu. On ouvre cent
archives pour regarder ce qu'elles portent, et toutes ne méritent pas d'être
gardées.

**On verse tout, images de signature comprises.** Non par principe décoratif :
parce que notre classement peut se tromper — il s'est trompé une fois, sur un
plan de cinq mégaoctets —, et qu'une pièce écartée à tort par un classement
faux serait perdue pour de bon. Le coût est borné par l'adressage par contenu :
le même logo dans cinq cents messages est un seul objet.

### L'archive de fondement : les messages aussi

Un plan sans son message **n'a pas de provenance** : on ne sait plus qui l'a
envoyé, quand, en réponse à quoi, ni ce qu'il disait en l'envoyant. Or c'est la
matière même de l'épisode — et **c'est la partie qu'on ne reconstitue pas après
coup**. Les octets d'un plan, on les aura toujours ; l'ordre dans lequel les
choses se sont dites, non.

Les messages se gardent donc **de deux façons, et les deux servent** :

| | où | ce que c'est |
|---|---|---|
| le fichier `.msg` entier | casier, `messages/<empreinte de ses octets>` | **la source** — le jour où l'on saura lire mieux, on relit sans redistribuer le carburant |
| la forme lue | `messages_archives` | **la lecture** — qui, quand, l'objet, le propos, la chaîne : ce qui se cherche sans télécharger cent mille fichiers |

L'un n'est pas la copie de l'autre. Quand la lecture s'améliorera, on refera la
table depuis les fichiers — et c'est pour cela qu'on les garde.

**Deux empreintes par message, et ce ne sont pas deux noms d'une chose.** Celle
du message — son `Message-ID`, ou la clé calculée — dit que deux dépôts parlent
du même échange. Celle de ses octets dit où le fichier est rangé. Deux exports
du même message donnent deux fichiers différents et un seul message.

#### Le lien, qui est le point de tout l'effort

`pieces_des_messages` dit quel message portait quelle pièce, **et sous quel
nom** : le même fichier voyage sous trois noms selon qui le renvoie, et c'est
parfois le nom qui date la révision d'un plan. Le lien porte aussi ce que ce
message-là déclarait de la pièce — la même image est une signature ici et un
document ailleurs.

Sans cette table, l'archive est un tas de PDF. Avec elle, chaque plan sait de
quel message il venait, donc à quelle date, dans quel fil, et à la suite de
quoi.

#### Ce que la table ne porte pas, et pourquoi ce n'est pas une perte

**Les adresses des destinataires n'y sont pas** — seulement leur nombre.

Ce n'est pas de la pudeur mal placée : rien, aujourd'hui, ne sait s'en servir.
Le vecteur de contexte raisonne sur des **rôles** (`ROLES_QUI_COMPTENT`), pas
sur des personnes ; l'épisode sur des dates et des domaines. Une colonne
qu'aucun code ne lit est une colonne qui finit par fuir sans avoir jamais servi.

Et rien n'est perdu : **le fichier d'origine les porte toujours**. Le jour où
une raison précise de les lire apparaîtra, elles seront là — et ce jour-là on
écrira ce qu'on en fait avant d'écrire la colonne.

### Relire ce qui est gardé

L'écran **L'archive**, dans la console : les **messages** dans l'ordre du temps,
chacun avec les pièces qu'il portait, puis toutes les pièces à part. Un PDF
s'ouvre depuis l'un ou l'autre, **par le même chemin** — deux gestionnaires
auraient fini par ne plus ouvrir de la même façon.

Il ouvre les PDF **avec le lecteur de Mdall** — `services/ct-lab-pdf-view.js`,
celui de l'onglet Documents et du copilote, emporté tel quel par
`scripts/prepare-console.mjs` avec pdf.js. Rien n'a été réécrit : un second
lecteur aurait divergé du premier au premier correctif (règle 4), et il aurait
fallu recalibrer toutes ses classes.

Les octets ne descendent que pour la pièce qu'on ouvre, et les listes disent
quand elles sont tronquées — sur cent mille pièces, « voici l'archive » serait
faux.

### Ce qui reste, dans l'ordre

1. **Le pont vers l'épisode.** Détaillé au § 8 bis. `episodeDuProjet` mange des
   affirmations signées d'un projet, pas des mails : le pont n'existe pas.
   *(L'absorption à l'échelle — le convoi — est faite, défaut des mille lignes
   compris.)*
2. **Retirer les citations avant d'empreindre le propos** : `ceQuonCite` sait
   déjà les séparer. Aujourd'hui l'empreinte porte sur le corps entier, donc
   deux exemplaires d'un même message dont la citation a grossi comptent pour
   deux. C'est le reste de l'étage 0.
3. **Le tri par règles**, sur ce que l'inventaire aura montré.
4. **Les `.zip` et les dossiers Windows** : cent projets ne se glissent pas
   fichier par fichier. Le navigateur sait décompresser sans aucune dépendance
   (`DecompressionStream`), et sait lire un dossier déposé. *(Mis de côté : on
   y reviendra si le besoin se confirme.)*

## 7. Le glissé-déposé des mails : ce qui reste à faire

Le décorticage existe et il est gratuit. Ce qui manque :

1. **Déposer un dossier entier**, pas un fil à la fois : cent projets ne se
   glissent pas message par message. *(Le versoir de la console prend déjà
   plusieurs `.msg` d'un coup ; les `.zip` et les dossiers restent à faire.)*
2. **Rattacher un fil à un projet et à un sujet** — par les participants, les
   dates, l'objet. Des règles d'abord ; le modèle seulement sur ce qui reste
   ambigu, et il **propose**, il ne range pas.
3. **La sortie par une proposition signée.** L'écran s'arrête aujourd'hui à ce
   qu'il montre, et c'est délibéré : « Transformer » reste éteint. Règle 1, sans
   exception — cent mille mails ne versent pas une ligne tout seuls.
4. **L'épisode**, qui est la vraie sortie : la séquence des sujets, pas le texte
   des messages.

## 8. L'ordre que je propose

1. **L'épisode et son vecteur de contexte** — la structure, sans modèle. C'est
   l'étape 3 du plan de prédiction, et c'est ce que les cent historiques
   rempliront. *(fait — `services/vecteur-de-contexte.js`,
   `services/episode-du-projet.js`. Ce qui manque pour **comparer** deux suites
   est un nom commun aux sujets, et cette réflexion reste ouverte.)*
2. **Le dépôt en masse des mails**, jusqu'à l'épisode — étages 0 à 3, tout
   gratuit. *(En cours. Étages 0 et 1 faits, et **définitifs** : messages,
   pièces et le lien entre les deux sont gardés dans Supabase Storage sous
   l'empreinte de leurs octets. Restent les citations à retirer du propos, les
   étages 2 et 3, et le pas qui tire un épisode d'un fil.)*
3. **La mesure** — prédire dans le passé sur les cent projets, contre la ligne
   de base. Avant tout prédicteur. *(fait — `services/mesure-du-passe.js`,
   `services/ligne-de-base.js`. Elle attend maintenant de la matière : c'est
   exactement ce que le versoir prépare.)*
4. **Le tri par règles**, affiné avec ce que la mesure aura montré d'utile.
5. **Le petit modèle**, sur le reste seulement, avec son taux d'escalade mesuré.
6. **Les règles normatives signées** — l'Établi, pas l'ingestion.
7. **L'OCR des pièces scannées**, en dernier.

### Où l'on en est, en une ligne

Les étages gratuits sont ouverts (déplier, compter, dédoublonner), **les
messages et leurs pièces sont gardés** et relisibles, et la mesure attend. Rien
d'irrattrapable ne se perd plus à chaque dépôt : ce qui entre reste.

Le prochain pas n'est plus une question de conservation, c'est une question
d'exploitation — **tirer un épisode d'un fil d'archive**. C'est la première fois
que la mesure aura de la matière à se mettre sous la dent.

## 8 bis. Absorber, montrer, prédire — le prochain chantier

> *« Je croyais que le système savait déjà tirer un épisode d'un fil
> d'archive ? »*

Non, et l'écart mérite d'être nommé précisément, parce qu'il dicte tout ce qui
suit.

### Ce qui existe, et ce qui manque

`episodeDuProjet` **existe et marche** — mais il mange `{contexte, sujets,
assertions}` : les sujets d'un projet et les **affirmations signées** de sa
mémoire. Il n'a jamais vu un mail. L'archive, elle, porte des messages : un
objet, un propos, une date, des pièces. **Rien ne relie les deux.**

Et la doctrine dit d'avance quelle forme ce pont peut prendre. Dans
`assertion-taxonomy.js`, au-dessus du domaine :

> *« Jamais déduit. C'est toute la règle. »*

Un constat tiré d'un mail devra donc porter un domaine **lu**, jamais deviné.
C'est une contrainte, et c'est une chance : elle interdit d'emblée la boîte
noire qui chuchote « incendie » sans pouvoir dire pourquoi.

### A. Absorber — le convoi *(fait)*

> `services/le-convoi.js`, `services/un-zip-deplie.js`,
> `apps/console/js/le-convoi-ecran.js`.

#### Ce qui cassait en premier

`lesEmpreintesDejaLa` et `lesMessagesDejaLa` demandent **toutes** les empreintes
d'un coup. Or Supabase plafonne toute réponse à **mille lignes, en silence** :
au-delà, le dédoublonnage cesse de voir ce qui est déjà là et **reverse tout**.
Personne ne s'en apercevrait — le versement « réussirait » et coûterait deux
fois.

Le correctif est aussi la forme qui passe à l'échelle : ne jamais demander « que
contient l'archive ? », mais « parmi **ces cinquante-là**, lesquelles connais-tu
déjà ? ». Une question bornée **par nature** — on ne demande jamais plus que ce
qu'on s'apprête à verser —, donc qui tient à cent mille.

#### Les trois autres murs

**La mémoire.** Le versoir garde les octets de tout ce qu'on lui donne, dans
deux tableaux, jusqu'à la fermeture de l'onglet. Cent archives, c'est des
dizaines de gigaoctets : l'onglet meurt. Le remède n'est pas d'optimiser, c'est
de **travailler par lots et d'oublier** : lire cinquante messages, les empreindre,
les verser, **relâcher les octets**, recommencer. La mémoire reste plate quelle
que soit la taille du dépôt.

**Reprendre.** Un versement de six heures qui casse à la cinquième ne doit pas
recommencer. Rien à inventer : **l'archive est son propre registre d'avancement**
— ce qui est dedans n'y retourne pas. Une panne coûte un lot.

**Le journal du convoi.** Ce qui a été lu, versé, refusé, avec le nom du
fichier. Sans lui, « 3 refusées » sur cent mille est une information qu'on ne
peut pas exploiter. C'est de l'irrattrapable, comme le journal des refus.

**Et le dossier et le `.zip` reviennent au programme.** On les avait mis de côté
« si le besoin se confirme » : il se confirme. Cent archives ne se choisissent
pas fichier par fichier dans un sélecteur.

#### Le `.zip`, et pourquoi il ne coûte rien non plus

Un `.zip` n'est pas opaque : c'est un **annuaire à la fin du fichier** qui dit,
pour chaque entrée, son nom, sa taille et où ses octets commencent. Le seul
calcul est la décompression, et le navigateur la fait lui-même
(`DecompressionStream`). Aucune bibliothèque, aucun appel.

Et c'est ce qui rend le convoi possible sur une archive : **lire ce qu'elle
contient ne coûte presque rien** — quelques kilo-octets de la fin —, puis on
décompresse **un message à la fois**, à mesure qu'on verse. Décompresser deux
gigaoctets d'un coup referait le mur qu'on vient d'abattre.

Deux méthodes sont lues — stocké et dégonflé, ce que produisent Windows, 7-Zip
et macOS. Toute autre est **refusée et nommée**, jamais devinée — même quand ses
octets se laisseraient dégonfler : la méthode déclarée dit qu'un autre
traitement était attendu, et rendre des octets plausibles serait pire que de
n'en rendre aucun. Les archives Zip64 se refusent de même.

> **Ce que le format réel a appris, et qu'aucune épreuve n'aurait trouvé.**
> `zip(1)` écrit des noms en UTF-8 **sans poser le drapeau qui le dit**. S'y
> fier seul transformait « Réunion 04.msg » en « RÃ©union 04.msg » : le fichier
> paraissait absent du dépôt. On lit donc en UTF-8 **quand les octets
> l'acceptent** — « ces octets sont-ils de l'UTF-8 bien formé ? » est une
> question de fait, pas une intuition — et dans l'encodage du poste sinon.

#### Deux gestes, parce que ce sont deux besoins

Le **versoir** sert à *regarder* : une poignée de messages, dépliés, comptés, et
l'on décide. Il garde leurs octets, et c'est très bien pour dix fichiers.

Le **convoi** sert à *absorber* : mille quatre cents messages qu'on ne regardera
pas un par un. Ce qu'on regarde alors n'est plus la matière, **c'est le compte
rendu** — et il fallait le dire plutôt que de faire semblant. Mélanger les deux
dans une seule zone ferait choisir le mauvais mode sans le savoir.

#### Ce qu'il reste à faire de cet étage

- **Un journal durable.** Celui du convoi vit dans la page : il sert à
  diagnostiquer un convoi en cours, et c'est déjà l'essentiel. Un convoi de six
  heures relu le lendemain demanderait une table.
- **Plusieurs versements à la fois.** Aujourd'hui un message après l'autre. Un
  parallélisme borné — quatre, pas plus : un navigateur ne tient que six
  connexions par hôte — diviserait le temps d'autant.
- **Les archives de plus de quatre gigaoctets** (Zip64), qui se refusent
  proprement mais ne se lisent pas.

### B. Montrer — et le but de l'écran est de pouvoir refuser *(fait)*

> L'onglet **L'épisode** de la console (`apps/console/js/lepisode.js`).

Une liste de cent mille messages ne s'affiche pas et ne sert à rien. **Trois
questions, et l'ordre compte.**

**1. Que vaut ce qu'on sait déjà faire ?** La référence à battre, **en haut**.
C'est le chiffre qui décide de tout le reste ; le dessiner en bas de page
reviendrait à le traiter comme une curiosité. Et c'est **le tableau de Mdall**,
celui de la forme d'un chantier, partagé et non recopié (règle 4).

**2. Qu'est-ce qu'on n'a pas su lire ?** Juste après. La colonne des manques dit
où la lecture est aveugle, donc quelle ligne écrire ensuite (règle 5).

**3. Que s'est-il passé, et dans quel ordre ?** La suite des fils, avec leurs
domaines en pastilles. C'est la matière que personne d'autre n'a : les livres
donnent les réponses, jamais la séquence. Un fil s'ouvre, et montre ses messages
dans l'ordre et **ses constats avec ce qui les a déclenchés** — le texte trouvé,
le genre de l'indice, la date.

Le principe qui tient les trois : **l'extraction propose, elle n'affirme pas.**
Un constat qu'on ne peut pas justifier est un constat qu'on ne peut pas refuser.

> Reste à brancher le refus lui-même sur ce qui existe déjà
> (`services/ecarts-observes.js`, `RAISON`) : aujourd'hui on voit **pourquoi**
> un constat est là, on ne peut pas encore l'écarter d'un clic.

### C. Prédire — le pont, puis le chiffre *(fait)*

> `services/les-references-citees.js`, `services/episode-dune-archive.js`.

**1. `episodeDuneArchive({messages})` rend la même forme que
`episodeDuProjet`** : un contexte, des ouvertures, des constats datés portant un
domaine, et des comptes. Donc `mesureDuPredicteur` et `LIGNES_DE_BASE` tournent
dessus **sans une ligne de changement** (règle 10). Deux formes auraient voulu
dire deux mesures, et l'on n'aurait plus su laquelle comparer à l'autre.

- **Une ouverture, c'est un fil** : les messages qui partagent un objet, une
  fois retirés les « RE: » et « TR: » empilés.
- **Un fil ne se ferme pas.** Son dernier message dit où il s'est *arrêté* :
  écrire `fermeLe` ferait lire « tranché le 12 mai » là où il faut lire « plus
  rien après le 12 mai » (règle 5).
- **Un constat, c'est un indice rencontré dans un fil**, daté de sa **première**
  rencontre — il est recopié à chaque réponse avec la citation.
- **`leveLe` reste toujours vide** : un mail ne dit pas qu'un sujet est levé.

**2. Le domaine se lit, il ne se devine pas.** Une référence citée est un fait
du texte : « art. CO 24 » est là ou n'y est pas, et l'article CO 24 appartient
au règlement de sécurité incendie — ce n'est pas une opinion.

| genre | exemple | ce que ça vaut |
|---|---|---|
| **référence** | `IT 246`, `DTU 13.2`, `Eurocode 7`, `art. CO 24`, `SSI` | sa présence est vérifiable, son domaine ne se discute pas |
| **terme** | `désenfumage`, `parasismique`, `géotechnique` | un mot, pas une référence : un pas de plus vers l'interprétation |

Les termes sont **marqués comme tels** et se retirent d'un seul argument
(`sansLesTermes`) — ce qui permet de mesurer deux fois et de voir ce qu'ils
apportent vraiment. Et **deux domaines ne font pas un domaine** : choisir le
premier trouvé serait un tirage au sort déguisé.

> **La table est un premier jet, et elle demande à être relue par quelqu'un dont
> c'est le métier.** Ce n'est ni une nomenclature ni la vérité du bâtiment :
> c'est une **liste en clair** dont chaque ligne se lit, se corrige et se
> retire. C'est tout son intérêt, et c'est pourquoi ce n'est pas un modèle.

**Ce qui ne tire pas se compte.** Aucun indice ⇒ aucun domaine, et le message
entre dans la colonne des manques. C'est elle qui dira si le petit modèle vaut
d'être payé, et le taux d'escalade sera mesuré avant d'être dépensé.

**Ce n'est pas une mémoire.** Rien n'est signé, rien n'est versé, rien n'entre
dans un projet : c'est une lecture, refaite à chaque affichage, faite pour être
mesurée et pour être refusée (règle 1).

*(Ce que le pont ne tire pas encore : un rapport joint comme événement daté,
l'indice de révision d'un plan, la paire question/réponse d'un fil. Trois règles
gratuites, à écrire quand la matière dira lesquelles manquent.)*

**3. Le chiffre qui décide tout le reste.** La mesure existe déjà, avec sa coupe
stricte. Une fois le pont posé, on rejoue cent archives réelles contre les deux
lignes de base. Si *« ce qui suit habituellement »* bat *« le plus fréquent »*,
**la séquence porte du signal** et le moat est réel. Sinon, on le sait avant
d'avoir construit un moteur — et c'était tout l'objet de faire la mesure en
premier.

### L'ordre que je propose

1. ~~**Le convoi**~~ — *fait*. Le défaut des mille lignes, les lots qui
   relâchent, la reprise par l'archive elle-même, le journal, le dossier et le
   `.zip`.
2. ~~**Le pont** `episodeDuneArchive`~~ — *fait*, avec la table des références
   citées et **la mesure branchée dessus**.
3. ~~**Les écrans**~~ — *faits* : l'onglet **L'épisode**, où la référence à
   battre vient en premier, comme prévu.

**Et maintenant, le chiffre.** Tout est en place pour le produire ; il manque la
matière. Sur deux messages réels, il répond « trop peu de points pour se
prononcer » — et c'est la bonne réponse. Ce qu'il faut ensuite n'est plus du
code : **ce sont les cent archives.**

## 9. À enrichir

- Le déposant : navigateur ou fonction de bord ? (cent mille pièces ne passent
  pas par un onglet.) Le versoir tranche pour l'**inventaire** et pour le
  **versement** — le navigateur, parce qu'il ne coûte rien et qu'il tient déjà
  les octets. La question se reposera au volume : cent archives à la fois, dans
  un onglet, demanderont au moins de reprendre là où l'on s'est arrêté.
- ~~La durée de conservation de l'archive~~ — **tranchée** :
  `docs/la-console-de-ladministrateur.md`, § 6 ter. Deux corpus, deux horloges —
  le fonds commun anonyme se garde sans réserve, l'archive source garde une
  raison et une date de réexamen, avec dix ans après le dernier message d'un
  chantier comme plancher défendable (responsabilité décennale). Reste à
  construire : le journal des retraits, la date de réexamen, l'écran « ce qui
  dort », la fiche de registre.
- Le format d'un épisode, et jusqu'où il remonte dans le passé d'un projet.
- Ce qu'on fait des plans : un indice de révision est une séquence, et c'est
  peut-être le signal le moins cher et le plus riche de tous.
- Les rapports de bureau de contrôle : ils portent des **constats et leurs
  issues** — le seul gisement qui donne directement le couple problème/remède
  dont la prédiction a besoin.
- Un jeu d'épreuve public et inventé, pour que les épreuves de la chaîne
  d'ingestion ne dépendent jamais d'un projet réel.
