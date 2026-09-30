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

4. **Le compartimentage par chantier** — § 8 ter. Sans lui, l'épisode mêle cent
   chantiers en un seul, et le chiffre serait **faux** plutôt qu'absent.

**Et ensuite, le chiffre.** Sur deux messages réels, il répond « trop peu de
points pour se prononcer » — et c'est la bonne réponse. Une fois les chantiers
séparés, ce qu'il faudra n'est plus du code : **ce sont les cent archives.**

## 8 ter. Le compartimentage : un chantier, pas un tas

> *« Ne faudrait-il pas que les paquets soient classés ou compartimentés en
> projets ? Sinon cela risque d'être un ensemble de 40 000 mails dans lequel il
> sera très difficile d'identifier des schémas de récurrence. »*

**Oui. Et c'est plus grave que « difficile à lire » : sans compartiment, le
chiffre serait faux.** Pas absent — faux, et d'apparence honnête.

### Ce qui casse, concrètement

Aujourd'hui, l'onglet **L'épisode** prend *tous* les messages de l'archive et en
fait **un seul épisode**. À deux messages c'est sans conséquence ; à quarante
mille, deux mécanismes se détraquent en silence.

**1. La suite apprend des enchaînements qui n'ont jamais eu lieu.**
`ceQuiSuitHabituellement` compte les **couples consécutifs** de domaines :
« après structure est venu incendie ». Entre deux chantiers sans rapport, ce
couple ne veut rien dire — c'est le hasard du calendrier. Sur cent chantiers
mêlés, l'immense majorité des couples enjambent une frontière, et le prédicteur
de séquence n'apprend plus que du bruit. Il rendrait tout de même un
pourcentage.

**2. Deux fils différents fusionnent.** La clé d'un fil est son objet
(`cleDuSujet(titre)`). Deux chantiers ont chacun leur « RE: Réunion de chantier
n° 4 » : aujourd'hui, c'est **un seul fil**. Leurs constats se confondent, leurs
dates s'entremêlent, et rien ne le dit.

### Le lot n'est pas une unité de sens, et c'était le piège

Les deux nombres qui traînent dans le code ne veulent rien dire du métier :
**cinquante** est la taille d'un lot de transport (`PAR_LOT`), **deux cents** le
plafond de ce qu'un écran affiche (`AU_PLUS`). Aucun des deux n'est une
frontière.

**Le chantier, lui, en est une.** C'est la seule unité dans laquelle « après
ceci vient cela » a un sens.

### La bonne nouvelle : le classement existe déjà, et on le stocke sans s'en servir

Le convoi nomme chaque message par **son chemin** — `webkitRelativePath` pour un
dossier, le chemin interne pour une entrée de `.zip` — et ce chemin est écrit
tel quel dans `messages_archives.fichier` :

```
Archives/2024/Taninges/EJA isolement.msg
```

C'est un classement **fait à la main, pendant des années, par quelqu'un qui
savait**. On ne fera jamais mieux en devinant, et surtout : **il n'y a rien à
re-ingérer.** L'information est déjà en base.

### La seule chose à décider : quel niveau de dossier est un chantier

`Archives/2024/Taninges/` — le chantier est-il `2024` ou `Taninges` ? Cela
dépend de la façon dont l'archive est rangée, et **cela ne se devine pas**.

Donc un **réglage à l'écran**, pas une règle : on montre les profondeurs
observées avec de vrais exemples, et l'on choisit. Le chemin brut reste stocké ;
la profondeur n'est qu'une **lecture**, qu'on change sans rien reverser — même
principe que partout ici, le fichier est la source, la table est la lecture.

Et ce qui n'a pas de dossier — un message déposé par le versoir, à l'unité —
**n'est rattaché à rien, et se compte à part** (règle 5). Le ranger d'office
dans un chantier inventé serait pire que de le laisser dehors.

### La mesure se fait par chantier, puis se met en commun

Et **la mise en commun n'est pas une moyenne de pourcentages.**

Un chantier qui donne trois points notés et un qui en donne trois cents ne
pèsent pas pareil ; en moyennant leurs taux, le petit compterait autant que le
grand, et une poignée de chantiers minuscules décideraient du chiffre.

La forme juste : **rejouer chaque chantier séparément, cumuler les points, puis
calculer les taux sur le cumul.** C'est déjà presque en place —
`rejouerLePasse` rend les points d'un épisode et `precisionA` les compte : il
manque le geste qui les additionne avant de compter.

### Compartimenter n'empêche pas les récurrences — c'est ce qui les rend possibles

C'est l'inverse de l'inquiétude, et il vaut la peine de le dire : **une
récurrence est une phrase qui a besoin d'une frontière pour avoir un sujet.**
« Dans quarante chantiers sur cent, après un sujet de sol est venu un sujet de
structure » ne se formule pas sur un tas. Sans compartiment, on ne peut même pas
compter sur combien de chantiers un enchaînement se répète.

Et le **nom commun** qui permet de comparer deux chantiers existe déjà : c'est le
**domaine**, et c'est pour cela que la ligne de base prédit un domaine et non un
sujet. Le jour où les sujets porteront une nomenclature, le même instrument
mesurera le même prédicteur sur les noms, sans rien changer d'autre.

### Ce que cela change à faire

1. **Le chantier d'un message** : `dirname(fichier)` tronqué à une profondeur
   choisie à l'écran. Aucune migration.
2. **La clé d'un fil devient `chantier · objet`** — c'est le correctif du second
   défaut, et il est d'une ligne.
3. **Un épisode par chantier**, et l'écran montre la liste des chantiers avant
   d'en ouvrir un.
4. **La mesure cumulée** sur les points de tous les chantiers, jamais sur la
   moyenne de leurs taux.
5. **Ce qui n'a pas de dossier se compte**, et se dit.

C'est le prochain pas, et il précède l'arrivée des cent archives : verser
d'abord et compartimenter ensuite marcherait aussi — rien n'est perdu, le chemin
est gardé —, mais on regarderait entre-temps un chiffre qui ne veut rien dire.

## 8 quater. Où cela doit vivre — et la réponse est : pas dans la console

> *« Est-ce vraiment le bon endroit ? Ne sommes-nous pas en train de refaire une
> deuxième application ? Si je verse les mails dans mon compte utilisateur, je
> peux déjà créer des projets ; il me faut juste la possibilité de verser 200
> mails d'un coup. »*

**Oui, et la vérification est plus dure que la question : le pipeline existe
déjà.**

### Ce qui est déjà là, côté application

| ce qu'il fallait | ce qui existe |
|---|---|
| un projet, créé et renommé par son propriétaire | `projects`, et l'écran qui va avec |
| ranger un mail dans un projet | `rangerLesMails(mails, {projectId})` — crée le dossier **« Mails »**, le rend **privé**, dédoublonne les noms, téléverse, écrit la ligne |
| la confidentialité de la correspondance | `project_document_folders.prive` — la garde est **dans la base**, pas dans l'écran |
| les pièces jointes dans *Fichiers* | `documents` + le casier, avec le lecteur de PDF |
| déposer plusieurs fichiers d'un coup | l'entrée de *Fichiers* est déjà `multiple`, et accepte déjà `.zip` |
| lire un fil et montrer ce qu'on en a tiré | `studio/dev/lecture-des-mails.js`, branché dans le Studio |

**Ce qui manque n'est donc pas un pipeline : c'est l'entrée en masse des
`.msg`.** Tout le reste a été écrit une seconde fois dans la console.

### Et la doctrine de la console disait de ne pas le faire

`docs/la-console-de-ladministrateur.md`, § 7 :

> *« Ce que cette console ne sera jamais : un endroit d'où l'on lit un
> contenu. »*

Le versoir lit des propos, l'archive ouvre des PDF, l'épisode affiche des
extraits de correspondance. C'est exactement ce que la page s'interdisait, et
personne n'a sonné — pas même la batterie de mutation, qui ne mesure pas les
frontières.

### Ce que le déplacement règle gratuitement

**Le compartimentage du § 8 ter disparaît.** Plus de profondeur de dossier à
régler, plus de chemin à découper, plus de « quel niveau est un chantier » : **le
projet *est* la frontière**, posée par celui qui dépose. La clé d'un fil devient
naturellement propre à son projet, et un épisode se calcule par projet sans
qu'on ait rien à deviner.

Un problème qui disparaît vaut mieux qu'un problème bien résolu.

### Et ce que cela débloque vaut plus que la prédiction

C'est le point le plus fort de la proposition, et il mérite d'être dit en
entier : **un chantier commencé il y a dix-huit mois devient utilisable
aujourd'hui.**

Sans cela, Mdall ne sert qu'aux projets qu'on démarre avec lui — et tous les
chantiers réels sont déjà en cours. « Je l'essaierai sur le prochain » devient
« je verse mes dix-huit mois de mails et je m'en sers cet après-midi ».

La prédiction, elle, se nourrit **par surcroît** : chaque projet ainsi
reconstitué est un épisode de plus. On cherchait comment nourrir le fonds
commun ; la réponse est de rendre le produit adoptable, et la matière vient
d'elle-même.

### Trois points à trancher, où l'accord n'est pas entier

**1. Copier-coller, ou déposer des fichiers ?** Coller le *texte* de 200 mails
perdrait les pièces jointes, les dates, les identifiants et la chaîne de
réponses — c'est-à-dire tout ce qui fait un épisode, et précisément ce qu'on
s'est donné du mal à garder. **Sélectionner 200 fichiers et les déposer** donne
tout cela gratuitement, et le convoi sait déjà le faire. C'est la voie à
prendre ; le collage de texte, s'il en faut un, restera une entrée dégradée qui
dit ce qu'elle perd.

**2. « En arrière-plan » veut dire deux choses.** *Ne pas bloquer l'écran* : le
convoi le fait déjà, par lots, en rendant la main entre chacun. *Continuer
l'onglet fermé* : cela demande un serveur, et deux cents messages de cinq
mégaoctets qui traversent une fonction de bord coûtent — là où le navigateur les
lit pour rien. Recommandation : garder la lecture dans le navigateur, et ne
payer un traitement serveur que le jour où quelqu'un demande vraiment à fermer
l'onglet.

**3. La confidentialité d'une lecture dérivée — le point qu'il ne faut pas
manquer.** Le dossier « Mails » est privé : seul le déposant y accède. Mais
l'épisode tiré de ces mails — les objets des fils, les références citées, les
dates — **serait visible de qui ?** S'il s'affiche dans un écran de projet, les
collaborateurs le voient, et la correspondance privée fuit par sa lecture sans
que personne n'ait ouvert un mail.

> **Une dérivation hérite de la confidentialité de sa source.** Tant que le
> dossier est privé, ce qu'on en tire l'est aussi. Ce qui devient partageable
> passe par une proposition signée — comme tout le reste (règle 1).

### L'inventaire honnête de ce qui a été écrit

**Ce qui sert et se déplace tel quel** — pur, sans lien avec la console :
`un-msg-deplie.js`, `un-zip-deplie.js`, `le-convoi.js`, `le-dedoublonnage.js`,
`les-references-citees.js`, `episode-dune-archive.js` (qui prend ses messages
d'un projet au lieu d'une archive), et le correctif des mille lignes.

**Ce qui était une seconde application** : les écrans *versoir*, *archive* et
*épisode* de la console, et les trois tables `messages_archives`,
`pieces_archivees`, `pieces_des_messages` avec le casier `archives`.

Les tables sont additives et ne gênent personne ; avant de les retirer il faudra
**vérifier qu'elles sont vides** — ce qui a été versé l'a été, et ne se jette
pas sans le regarder (règle 6).

**Ce qui reste et garde son sens** : la porte (`est_administrateur()`), la
coquille de la console, et sa raison d'être — les comptes d'exploitation, qui
n'existent toujours pas.

### La console redevient ce qu'elle devait être

Combien de comptes, qui revient, ce qui tombe en panne, ce que ça coûte, où en
est la prédiction. **Pas un second atelier.**

## 8 quinquies. Fichiers, ou un utilitaire ?

> *« Y a-t-il des fonctionnalités ou actions spécifiques au dépôt en masse de
> mails qui méritent d'en faire un utilitaire particulier ? »*

### Ce que Fichiers fait déjà, et qu'on n'avait pas regardé

Le dépôt de Fichiers n'est pas un simple téléversement. Il fait déjà, dans cet
ordre :

1. **dédoublonner** la sélection (par `nom|taille`) ;
2. **inspecter** chaque fichier (`inspectFile`) et **reconnaître** ce que c'est
   (`isExploitable`) ;
3. **rattacher le dépôt aux propositions ouvertes** du projet.

Autrement dit : **déposer → inspecter → reconnaître → proposer.** La signature
dont il est question existe donc déjà dans ce flux ; il n'y a rien à inventer
pour elle.

### La vraie question n'est donc pas « où », mais « qu'est-ce qui est neuf »

Six choses sont propres au versement en masse de mails. **Cinq sont des étapes
ou des services ; une seule touche à autre chose qu'au confort.**

**1. Un fichier déposé en devient plusieurs.** `inspectFile` *reconnaît*, il ne
**dépouille** pas : rien aujourd'hui ne transforme un fichier déposé en
plusieurs documents. Un `.msg` en vaut N+1, un `.zip` aussi. C'est la seule
nouveauté vraiment structurelle — et c'est **une étape**, pas un écran.

**2. Deux destinations, deux confidentialités — et c'est le point qui décide.**
Le message va dans « Mails », qui est **privé** ; la pièce jointe va dans
Fichiers, **partagé avec les collaborateurs**. Un dépôt qui franchit cette
frontière **en silence** n'est pas une commodité : c'est un défaut de
confidentialité. Le dépouillement doit donc **montrer ce qui ira où, avant de le
faire**.

C'est l'argument le plus fort pour une étape **visible** — et le seul qui ne
soit pas une question d'ergonomie.

**3. Le dédoublonnage par le contenu.** Fichiers dédoublonne par `nom|taille`,
et seulement dans la sélection courante. Le même plan attaché à quinze réponses
porte quinze noms possibles et **une seule empreinte**. C'est un service
(`le-dedoublonnage.js`), pas un écran.

**4. Le compte rendu remplace la liste.** À deux cents, on ne lit pas deux cents
lignes d'état : on lit « 196 versés, 3 déjà là, 1 illisible — *le voici* ». Une
façon de dessiner le même panneau, pas un autre panneau.

**5. La signature porte sur le versement, pas sur chaque mail.** Deux cents
signatures seraient absurdes — et fausses. Ce qu'on atteste, c'est *« je verse
ces deux cents messages dans ce projet, ce jour »*. C'est **une propriété de la
proposition**, et elle vaut d'être écrite maintenant : le réflexe serait une
proposition par fichier.

**6. Le temps.** Des minutes, pas des secondes : une progression, et la
possibilité de partir. C'est la question de l'arrière-plan, déjà posée au
§ 8 quater.

### Ce qui reste hors de Fichiers, et pourquoi ce n'en est pas une duplication

**`lecture-des-mails`** : un fil, ce qu'on en a compris, les trous. **On y va
pour comprendre, pas pour verser.** Deux gestes, deux endroits, et aucun des
deux ne fait le travail de l'autre.

**L'épisode** n'est pas un dépôt, c'est une **lecture**. Sa place est aux
Indicateurs, où `renderLaForme` dessine déjà l'épisode de la mémoire : **un
écran, deux sources** — avec la réserve du § 8 quater, puisqu'un épisode tiré de
correspondance privée hérite de sa confidentialité.

### Recommandation : dans Fichiers, avec une étape de dépouillement

Pas un second endroit où déposer. **Un utilisateur qui hésite entre deux zones
de dépôt se trompe une fois sur deux**, et la duplication d'interface qu'il faut
éviter serait exactement là — bien plus que dans le code.

### L'argument inverse, et pourquoi il ne tient qu'à moitié

Il y en a un, et il est honnête : un utilitaire **se cache**, se retire sans
toucher à Fichiers, et ne risque pas de casser le dépôt quotidien pendant qu'on
le met au point.

C'est un vrai argument — mais **pour un interrupteur, pas pour un écran**.
L'étape de dépouillement peut rester éteinte jusqu'à ce qu'on lui fasse
confiance ; cela coûte une condition, là où un second écran coûte un second
calibrage, un second jeu de classes et un second endroit à corriger (règle 4).

### Les deux autres décisions de ce tour

**Les trois tables de la console sont supprimées** — `messages_archives`,
`pieces_archivees`, `pieces_des_messages` — et le casier `archives` avec. La
migration **vérifiera d'abord qu'elles sont vides** : ce qui a été versé ne se
jette pas sans l'avoir regardé (règle 6). Partent avec elles les écrans
*versoir*, *archive* et *épisode* de la console.

**Le retour au compte utilisateur** : l'avatar en haut à droite de la console,
son menu, et un item « Profil utilisateur ».

> **Les classes, pas le module.** `global-header.js` traîne le magasin, les
> routes, le carnet et les raccourcis de la barre : l'emporter mettrait la
> navigation entière de l'application dans la console. On reprend
> `gh-user-menu__*` et `svgIcon`, comme on a repris le lecteur de PDF — le
> rendu est le même, la dépendance ne l'est pas.

## 8 sexies. Ranger les pièces jointes avec les mails — et ce qu'on a trouvé en vérifiant

> *« Les mails versés depuis Fichiers sont confidentiels, le reste de l'équipe
> ne peut les voir — et c'est exactement le comportement attendu. En revanche,
> il n'est pas possible de rendre les pièces jointes visibles par toute l'équipe.
> Il faut donc les ranger avec les mails et leur rendre le niveau de
> confidentialité attendu. Est-ce possible ? Comment ? »*

### Oui, et cela ne coûte rien

**La confidentialité est portée par le dossier, et tenue par la base.**
`documents_by_project` cache un document quand trois faits sont réunis :

```
son dossier est prive = true
et son deposant n'est pas vide
et son deposant n'est pas moi
```

Ranger les pièces jointes **dans** « Mails » leur donne donc le régime des mails
automatiquement. Pas de colonne `prive` sur les documents, pas de second jeu de
politiques, pas de niveau de confidentialité à gérer par fichier. Une pièce est
privée **parce qu'elle est là**.

Et le corollaire est le meilleur cadeau de cette forme : **partager, c'est
déplacer.** Sortir un plan de « Mails » vers Fichiers le rend visible à
l'équipe, par le bouton « Déplacer » qui existe déjà sur chaque ligne. Aucun
interrupteur de confidentialité à inventer, donc aucun à oublier de vérifier.

### Où exactement

`Mails/` pour les messages, `Mails/Pièces jointes/` pour les pièces, **à plat**.

Pas un dossier par fil : soixante dossiers pour deux cents mails, et surtout
**une pièce attachée à quinze réponses est un seul fichier**. Elle ne peut pas
être à quinze endroits. Un arbre est un lieu, pas un graphe ; la provenance
reste dans les données, où elle peut être multiple.

Les deux dossiers se créent **privés**, à chaque étage : un sous-dossier
ordinaire dans un dossier privé serait visible de l'équipe, parce que la
politique regarde le dossier du document, pas son grand-parent.

### Ce que cela simplifie

On avait prévu une étape qui **montre les deux destinations et les deux
régimes** — message privé, pièce partagée — parce qu'un dépôt qui franchit cette
frontière en silence est un défaut de confidentialité (§ 8 quinquies, point 2).

Les deux allant désormais dans le dossier privé, **le dépôt ne franchit plus
aucune frontière**. L'étape cesse d'être une demande de consentement et redevient
ce qu'elle doit être : un état des lieux. Le consentement se déplace là où il
vaut quelque chose — au moment de sortir une pièce, une à la fois, par un geste
délibéré. Deux cents mails d'un coup, personne ne lit l'avertissement ; un plan
qu'on sort de « Mails », on sait ce qu'on fait.

## 8 septies. Les trois défauts trouvés en vérifiant cette réponse

La question portait sur les pièces jointes. La vérification a trouvé autre
chose, et c'est la raison pour laquelle on ne répond pas de mémoire.

### 1. Le casier était ouvert à tout le monde

`202604030003_init_triggers_policies_and_indexes.sql`, à l'initialisation du
dépôt :

```sql
create policy "storage_documents_select_open" on storage.objects
for select to anon, authenticated using (bucket_id = 'documents');
```

`to anon`, sans condition. La clé anonyme est dans le navigateur — elle y est
par construction. **N'importe qui pouvait donc lister le casier et télécharger
tout ce qu'il contenait**, y compris les `.eml` déjà déposés. La ligne était
cachée, les octets étaient ouverts. `insert`, `update` et `delete` étaient
ouvertes de la même façon : on pouvait aussi bien effacer les fichiers d'un
chantier.

Ce n'était pas une conséquence du dépouillement : c'était vrai avant lui. Mais
le dépouillement multiplie l'exposition par deux cents et la fait porter sur de
la correspondance.

**Le remède existait déjà dans le dépôt**, appliqué à un autre casier, avec la
bonne phrase dans son en-tête : *« avoids inferring authorization from path
segments only »* (`202606150012_..._storage_select_via_attachment_table.sql`).
On aligne la lecture du casier sur la table qui fait foi : un objet n'est
lisible que si une ligne `documents` lisible le désigne.

Le point qui rend l'édifice juste est un détail de PostgreSQL : **la
sous-requête d'une politique subit les politiques de la table qu'elle
interroge.** Le `exists` passe donc par `documents_by_project`, donc par la règle
du dossier privé, **sans qu'elle soit réécrite**. Une seule décision, à un seul
endroit (règle 4) : le jour où la règle du dossier privé changera, le casier
suivra sans qu'on y pense.

### 2. Deux replis silencieux où l'absence ouvrait au lieu de fermer

- `deposer-un-mail-supabase.js` : `currentUserId().catch(() => null)`, puis
  `...(qui ? { deposant: qui } : {})`. Or un `deposant` vide fait tomber la
  troisième condition de la politique : **le document n'est plus caché**. Une
  panne d'authentification passagère publiait la correspondance, en silence, et
  le dépôt se disait réussi.
- `project-supabase-sync.js`, `createDocumentFolder` : le même motif sur
  `created_by`. Le commentaire au-dessus disait déjà que c'était dangereux ; le
  code le faisait quand même.

Dans les deux cas, la conduite juste est la même et elle est brutale : **sans
déposant connu, on ne range pas.** Un dépôt qui échoue se reprend ; un dépôt qui
réussit à découvert ne se reprend pas.

### 3. Le cadenas manquait sur les fichiers — et il aurait menti

Le cadenas existait, dessiné sur les **dossiers**, dans l'arbre et dans le
tableau, depuis un seul endroit (`laMarqueDuDossier`). Il manquait sur les
**fichiers**, et il le fallait : un fichier se montre hors de son dossier — une
recherche, une proposition, un récent —, et là plus rien ne dit de quel régime
il relève.

Mais un cadenas dessiné sur la seule appartenance au dossier **aurait menti**
pour un document sans déposant, que la base ne cache pas. Un marqueur sans
équivoque qui se trompe est pire que pas de marqueur : il fait déposer sans
regarder.

`laMarqueDunFichier` rend donc **trois réponses**, sur les trois mêmes faits que
la politique :

| ce qu'on sait | ce qui se dessine |
| --- | --- |
| dossier privé, déposant connu | 🛡 **Privé** — vous seul y avez accès |
| dossier privé, déposant franchement vide | 🛡 **Visible par l'équipe** — l'avertissement |
| `deposant` non demandé par la lecture | rien (règle 5) |

La troisième colonne n'est pas une subtilité de confort : sans elle, « je ne sais
pas » et « il n'y en a pas » rendaient la même chose, et la garde qui les sépare
ne pouvait pas tomber.

### L'empreinte des octets, et pourquoi une colonne de plus

`documents` portait déjà `sha256_hash` et `content_fingerprint`. Aucune des deux
ne convenait, et il a fallu les regarder pour le savoir :

- `sha256_hash` porte un index **unique global**. Deux chantiers qui reçoivent le
  même plan — le cas ordinaire d'un bureau d'études — ne pourraient pas le
  déposer tous les deux ;
- `content_fingerprint` est l'empreinte du **texte** d'un document, et c'est
  délibéré : un rapport ré-exporté n'a pas les mêmes octets et reste le même
  rapport. Y écrire un condensé d'octets ferait dire à cette colonne deux choses
  selon la ligne (règle 4).

Un mail et une pièce jointe, eux, s'identifient par leurs octets et rien d'autre.
D'où `empreinte_des_octets`, et un index **par projet**.

## 8 octies. Le dossier « Mails » : où il naît, et faut-il le créer d'avance ?

> *« Ne faudrait-il pas dès la racine de Fichiers un répertoire "Mails" avec un
> cadenas ? Comment est prévu le pipeline ? On téléverse des fichiers mails et
> si le répertoire n'existe pas, il est créé ? Il est créé où ? À la racine ? »*

### Le pipeline, tel qu'il est écrit

1. On dépose des fichiers dans *Fichiers*, comme n'importe quels autres.
2. `lePartageDuDepot` sépare ce qui porte des mails (`.msg`, `.eml`, `.zip`) du
   reste. Les deux gestes restent dans la même zone : un utilisateur qui hésite
   entre deux zones de dépôt se trompe une fois sur deux.
3. Le panneau de dépouillement **nomme les deux destinations avant d'agir** —
   « Mails » et « Mails / Pièces jointes » —, avec le cadenas et la phrase qui
   dit ce que le régime implique.
4. Au clic sur **Dépouiller**, et pas avant : `creuserLesDossiers` cherche
   « Mails » **à la racine de Documents** (`depuis: null`), le crée s'il manque,
   puis fait de même pour « Pièces jointes » **à l'intérieur**. Les deux naissent
   `prive = true` — un sous-dossier ordinaire dans un dossier privé serait
   visible de l'équipe, parce que la politique de lecture regarde le dossier du
   document, pas son grand-parent.
5. Les messages vont dans le premier, les pièces dans le second, dédoublonnés
   par l'empreinte de leurs octets.

**Donc : à la racine, à la demande, jamais avant.** Et jamais deux fois : si le
dossier est là, il est réemployé.

### Faut-il le créer d'avance ? Non, et pour trois raisons

**1. Un dossier vide est une promesse, pas un fait.** La plupart des projets ne
recevront jamais de mail. Leur poser un « Mails » vide à la racine leur apprend
qu'il y a là quelque chose à regarder, et il n'y a rien.

**2. Un dossier créé d'avance l'est par quelqu'un, et ce n'est pas celui qui
déposera.** C'est en tirant ce fil qu'on a trouvé la collision de la section
suivante, et qu'on a fini par changer la règle : le dossier est aujourd'hui un
contenant partagé, donc ce point-là ne bloque plus. Restent le 1 et le 3, qui
suffisent.

**3. Ce qu'il fallait vraiment, c'est le voir *avant* de déposer — et c'est
fait.** Le panneau de dépouillement montre les deux chemins, avec leur cadenas,
au moment où la question se pose : quand on s'apprête à lâcher les fichiers. Un
dossier vide à la racine ne le dirait pas mieux, et le dirait au mauvais moment.

### Ce qui devait être tranché avant que le partage n'existe

En vérifiant ce qui précède, une **collision** est apparue, et elle bloquerait
purement et simplement le dépôt :

```sql
constraint project_document_folders_unique_name_per_parent
  unique nulls not distinct (project_id, parent_folder_id, name)
```

Il ne peut donc y avoir **qu'un seul** dossier « Mails » à la racine d'un projet.
Or un dossier privé n'est rendu qu'à son créateur. Le jour du partage :

- A dépose ses mails → « Mails » est créé, privé, `created_by = A` ;
- B dépose les siens → la liste des dossiers ne lui montre rien → il tente de
  créer « Mails » → **la contrainte d'unicité refuse**, et B ne peut plus
  déposer un seul mail.

### La décision : un contenant partagé au contenu privé

Elle est prise, et elle est appliquée
(`202610240001_un_contenant_partage_au_contenu_prive.sql`).

**`prive` disait deux choses**, et c'est là qu'était la faute. Une seule colonne
portait deux règles, appliquées par deux politiques :

1. *« ce dossier n'est visible que de son créateur »* — politique des dossiers ;
2. *« les documents qu'il porte ne sont visibles que de leur déposant »* —
   politique des documents.

**C'est la seconde qu'on voulait.** La première est arrivée avec elle, sans
avoir été demandée, et c'est elle qui coince. Une valeur qui dit deux choses
finit par en imposer une qu'on n'a pas choisie (règle 4).

La politique des dossiers cesse donc de regarder `prive`. Celle des documents ne
bouge **pas d'une ligne** : c'est elle qui garde la correspondance, elle a été
éprouvée, et la réécrire pour la déplacer n'aurait ajouté qu'un risque.

| ce qu'on regarde | qui le voit |
| --- | --- |
| le dossier « Mails » | toute l'équipe du projet |
| les mails à l'intérieur | chacun les siens, et rien d'autre |

### Ce que cela ne coûte pas, et il a fallu le vérifier

**Aucun dossier privé n'a jamais été créé par un utilisateur.** `prive: true`
n'est posé qu'à deux endroits du code, tous deux dans le dépôt de mails ; la
création de dossier de l'écran ne le passe pas. La moitié de règle qu'on retire
n'a donc jamais protégé un dossier que quelqu'un aurait choisi de cacher : **on
ne retire pas une garde, on retire un effet de bord.**

Et rien n'est observable aujourd'hui — un projet n'a qu'un propriétaire. C'est
écrit **avant** le partage pour la même raison que la migration d'octobre : le
jour où il arrive, il est trop tard pour s'apercevoir que le second déposant ne
peut pas déposer.

### Ce qui change à l'écran, et ce qui ne change pas

Le cadenas d'un **dossier** change de sens, donc de mots : « Contenu privé :
chacun n'y voit que ce qu'il y a déposé lui-même ». Il disait « vous seul y avez
accès » — une promesse plus large que la garde est une promesse qu'on tiendra
mal.

Le cadenas d'un **fichier** ne change pas : un document n'est vu que de son
déposant, et « vous seul y avez accès » reste exact. Les deux marques ne disent
donc plus la même chose, et c'est délibéré : l'une porte sur un contenant,
l'autre sur une pièce.

`created_by` reste et se remplit toujours ; il ne décide plus d'aucun accès, il
dit qui a créé le dossier. Le refus posé au tour précédent — *un dossier privé ne
se crée pas sans créateur connu* — disparaît avec sa raison. **Ce qui protège la
correspondance reste entier et se tient ailleurs** : un mail ne se range pas
sans déposant connu.

### Deux conséquences qu'il vaut mieux avoir dites

**Le même mail déposé par deux personnes est stocké deux fois.** Le
dédoublonnage interroge les documents du projet, et la politique ne rend à
chacun que les siens : B ne voit pas la copie de A, et c'est bien ainsi — la
copie de A peut disparaître le jour où A la supprime.

**Deux fichiers peuvent porter le même nom dans « Mails ».** Aucune contrainte
ne s'y oppose, et chacun ne voit que le sien : l'homonymie est invisible à ceux
qu'elle concerne.

## 8 nonies. Le bénéfice immédiat : lire ses mails, et voir ses pièces

Le dépôt ne produit pour l'instant **que du carburant**. C'est assumé, mais un
utilisateur qui copie-colle sa messagerie dans Mdall doit y gagner quelque
chose tout de suite, même de peu de valeur.

### Ce qui est fait ce tour-ci

**L'écran de lecture accepte enfin ce qu'Outlook produit.** Il n'ouvrait que des
`.eml` et écartait les `.msg` en disant « ce n'est pas un mail » — alors que
c'en est un, et que Mdall sait les ouvrir depuis deux tours. Les `.zip` aussi.
La chaîne était complète partout sauf à l'endroit où l'on dépose.

Et c'est désormais **le service du dépouillement** qui range ce qu'on y lit : il
y avait deux rangements, l'un qui dédoublonne, nomme correctement et range aussi
les pièces jointes, l'autre non. C'est le plus pauvre qu'on aurait gardé, parce
que c'est celui qu'on relit le moins (règle 4).

### Ce qui reste à construire, et l'ordre que je propose

**1. La galerie des pièces jointes.** Toutes les pièces d'un dossier de mails
réunies, avec la date du message d'où elles viennent, sans avoir à rouvrir les
mails un à un. C'est la valeur la plus évidente et la moins chère : les pièces
sont déjà rangées à plat dans `Mails/Pièces jointes/`, et le lien avec leur
message est ce qui manque — il faudrait le garder au dépôt.

**2. Les photos à part.** Une pièce jointe image n'est pas un document : c'est
une photo de chantier, et une photo de chantier se regarde en grille, par date.
Le dépouillement sait déjà distinguer une image de signature d'un document
(`linventaire-du-versoir.js`) ; distinguer une photo d'un plan PDF est le même
genre de décision.

**3. La lecture d'un fil depuis le dossier**, et non depuis un dépôt à la main.
Aujourd'hui l'écran de lecture ne lit que ce qu'on lui donne ; il ne sait pas
ouvrir ce qui est déjà rangé. C'est le même chaînon manquant que pour les
propositions.

> **Ce qui décide de l'ordre** : la galerie ne demande aucune décision et se voit
> tout de suite. La lecture depuis le dossier demande de savoir comment on
> désigne un fil parmi deux cents mails — et cela, il faut le dessiner avant de
> l'écrire.

## 8 decies. Lire ses mails dans Mdall

### « Mails » n'est plus dans Documents

Le dossier était montré **sous Documents**, c'est-à-dire sous l'endroit du
partage — alors que c'est justement ce qu'il n'est pas. Un contenant au contenu
privé rangé là se lit comme une promesse contraire à la garde.

Il est désormais une **racine**, à côté de *Documents* et de *Mémoire*, dans
l'ordre alphabétique : Documents, Mails, Mémoire. **Rien n'a bougé en base** —
le dossier était déjà à la racine des dossiers (`parent_folder_id is null`),
c'est l'arbre qui le rangeait ailleurs.

Et c'est un dossier **comme un autre** : mêmes classes, mêmes icônes, même
survol. La racine n'apparaît que si le dossier existe — une racine vide dans
tous les projets qui n'ont jamais reçu de mail serait une promesse, pas un fait.

### Sortir un mail de « Mails » se demande

Déplacer ressemble à du rangement ; ici, c'est une **publication**. Le
déplacement vers un dossier partagé pose donc la question, **dans la fenêtre où
l'on choisit la destination** — pas dans une seconde fenêtre par-dessus, qu'on
ferme au réflexe. Le bouton lui-même change de nom : « Déplacer et partager ».

Dans l'autre sens, rien à demander : rentrer un document dans « Mails » le
**retire** à l'équipe, et le pire qui arrive est qu'on le ressorte.

### Une ligne de mail n'est pas une ligne de fichier

Un fichier se dit par son nom. Un mail se dit par **qui l'a écrit, de quoi il
parle, quand, et s'il portait quelque chose**. La ligne reprend les classes de
la liste des sujets — `issue-row-title-grid`, `row-title-trigger` — et rien de
plus : un dossier de mails n'est pas un écran à part.

> **Ce qui a dû changer pour cela.** La console disait, depuis un tour, « rien
> n'est extrait ». C'était tenable tant que la seule chose montrée d'un mail
> était son nom de fichier. Une liste à la manière d'une messagerie ne l'est
> plus : il faudrait rapatrier deux cents fichiers pour dessiner deux cents
> lignes. Cinq colonnes portent donc l'index — expéditeur, objet, date, nombre
> de pièces, fil (`202610260001_lindex_des_mails.sql`). C'est **un index de ses
> propres fichiers**, au même titre que `mime_type` : rien n'y est un constat,
> rien n'y est signé, rien n'entre dans ce que le chantier sait (règle 1).

### Ouvrir un mail ouvre l'échange

Comme dans une messagerie : celui qui ouvre une réponse a besoin de la question.
Les messages d'un même fil se retrouvent par `mail_fil` — l'objet débarrassé de
ses « RE : », écrit au dépôt — et se rapatrient **bornés à vingt**.

**Il n'y a pas de lecteur de mails.** Le fil devient un document en Markdown, et
c'est le lecteur de documents qui le montre : deux onglets, une barre, un arbre
— ceux qui existent déjà. Un écran de plus aurait fait un second jeu de classes
à recalibrer au premier correctif (règle 4).

> **Le crayon ne s'y dessine pas**, et la garde est posée deux fois. Ce qu'on
> lit n'est pas le fichier : c'est l'échange rendu. « Enregistrer » aurait écrit
> ce Markdown par-dessus le `.eml` — c'est-à-dire détruit la pièce d'origine.

### Ce qui reste, et dans quel ordre

**1. Les pièces jointes cliquables depuis le fil.** Elles sont nommées dans
l'en-tête de chaque message, et ne s'ouvrent pas : ce sont des documents
distincts, rangés dans `Mails/Pièces jointes/`, et les rapprocher demande de
décider sur quoi — le nom et la taille, faute d'avoir gardé le lien au dépôt.
C'est ce lien qui manque, et c'est le même que la galerie réclamera.

**2. La galerie des pièces**, puis **les photos à part** (§ 8 nonies).

**3. Le survol bleu** vaut désormais pour toute l'arborescence. Il n'était posé
que sur les fichiers de la Mémoire : un dossier survolé ne répondait pas, ce qui
le faisait passer pour inerte alors qu'il s'ouvre. Un oubli, pas une intention.

## 8 undecies. Le dépôt ne fait plus attendre, et la galerie

### Un bandeau est resté d'un projet à l'autre

Il nommait un mail d'un chantier, au-dessus des fichiers d'un autre. Rien n'avait
fui en base : c'est **l'état de l'écran**, gardé en mémoire du module, qui a
survécu au changement de projet.

Le réflexe aurait été d'effacer le bandeau au changement — puis la sélection,
puis le dépouillement. **Cette liste est exactement ce qu'on oublie de tenir** :
le champ suivant s'ajoutera sans elle, et le défaut reviendra sous une autre
forme.

On ne remet donc rien à zéro : **on reprend l'état neuf en entier**
(`letat-suit-le-projet.js`). Tout ce qu'un écran ajoutera à son état sera, par
construction, effacé avec le reste. Et les **deux** entrées du rendu le
vérifient, parce qu'il n'y a pas de troisième chemin et qu'un chemin oublié
suffirait.

> Le service n'appartient à aucun écran : n'importe lequel gardant quelque chose
> entre deux rendus peut s'en servir, et devrait.

### Deux minutes d'attente, et la cause n'était pas celle qu'on croyait

Vingt mails avec leurs pièces font **une centaine d'envois**. Ils partaient un à
un, chacun payant son aller-retour. Ils partent maintenant **quatre à la fois**
(`quatreALaFois`) : au-delà on ne gagne plus — la liaison montante est le goulot
— et l'on commence à se faire refuser par le stockage.

### Et pendant ce temps, une barre, puis le journal

C'est le mode opératoire du dépôt d'un rapport de bureau de contrôle, et c'est
volontairement **le même** : une seule façon d'informer pour la même sorte
d'action. Deux façons obligent à savoir laquelle regarder, et l'on regarde la
mauvaise.

1. une **barre** pendant l'envoi, qui balaie tant qu'aucun fichier n'a été
   ouvert — une barre à zéro ressemble à une barre bloquée ;
2. une **action au journal** dès le premier clic : « lecture et rangement en
   cours, vous pouvez continuer ailleurs » ;
3. la même ligne, **mise à jour** quand c'est fini, avec la phrase du convoi —
   celle qu'on lit déjà dans l'écran de dépôt (règle 4).

> **Et le panneau est passé au-dessus de la liste.** Vingt `.msg` déposés
> poussaient le bouton « Dépouiller » sous vingt lignes de fichiers : on ne
> voyait pas le geste à faire, et l'on croyait que le dépôt n'avait rien
> produit. La liste, elle, ne redit plus les porteurs — le panneau les nomme.

### Le lien d'une pièce et de son message

Il manquait, et il manquait **deux fois** : la lecture d'un échange ne pouvait
pas ouvrir les pièces qu'elle nomme, et la galerie ne pouvait pas les dater.

`piece_du_message` le porte (`202610270001`). **Une colonne, pas une table de
liaison** : une pièce est dédoublonnée par ses octets, donc le même plan attaché
à quinze réponses n'entre qu'une fois. La colonne ne dit que le premier message
— celui qui l'a fait entrer —, et c'est ce qu'on veut savoir : **quand elle est
arrivée et par qui**. La liste complète se reconstituerait en relisant les
messages ; rien n'est perdu, c'est seulement dans les fichiers.

`on delete set null` : supprimer un mail n'emporte pas le plan qu'il portait. La
pièce perd sa provenance, et l'écran le dit.

### La galerie

Au-dessus de la liste du dossier, **pas dans un onglet à elle** : c'est une
autre façon de regarder le même dossier, et un endroit de plus obligerait à
savoir lequel ouvrir.

Deux familles, et elles ne se regardent pas pareil : une **photo** est un relevé
de chantier, qui se regarde par date ; un **document** se lit par son nom. Les
mélanger ferait des rectangles gris au milieu des photos.

Les **images du corps** n'y entrent pas — signatures, bandeaux, logos : huit
exemplaires du même logo par message noieraient tout. Mais une pièce dont on
**ignore** la nature y entre : elle a été déposée avant qu'on garde cette
information, et l'écarter ferait disparaître des plans (règle 5).

> **Les vignettes ne montrent pas l'image, et c'est un compromis nommé.** Les
> octets sont dans un casier privé : les afficher demande une adresse signée par
> photo, donc trois cents appels au chargement d'un dossier de trois cents
> photos. La vignette montre ce qu'on sait sans rien rapatrier — le nom, la date,
> l'expéditeur —, et l'image s'ouvre au clic. Le jour où l'on voudra de vraies
> vignettes, il faudra les fabriquer **au dépôt**, pas au chargement de l'écran.

### Ce qui reste

**Les pièces cliquables depuis le fil.** Le lien existe désormais ; ce qui
manque est l'endroit où le poser. Le fil est rendu **en Markdown**, et du texte
ne porte pas de boutons : la liste des pièces devra vivre **à côté** du lecteur,
dans l'en-tête de l'écran, et non dans le texte du message.

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
