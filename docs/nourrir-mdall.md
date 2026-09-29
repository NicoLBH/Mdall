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

### Relire ce qui est gardé

L'écran **L'archive**, dans la console. Il ouvre les PDF **avec le lecteur de
Mdall** — `services/ct-lab-pdf-view.js`, celui de l'onglet Documents et du
copilote, emporté tel quel par `scripts/prepare-console.mjs` avec pdf.js. Rien
n'a été réécrit : un second lecteur aurait divergé du premier au premier
correctif (règle 4), et il aurait fallu recalibrer toutes ses classes.

Les octets ne descendent que pour la pièce qu'on ouvre, et la liste dit quand
elle est tronquée — sur cent mille pièces, « voici l'archive » serait faux.

### Ce qui reste, dans l'ordre

1. **Le lien entre une pièce et le message qui la portait.** C'est le prochain
   irrattrapable : aujourd'hui l'archive est un tas de PDF sans provenance. Il
   demande de garder aussi les **messages** — leur forme, leurs dates, leur
   chaîne de réponses —, et c'est ce qui fera les épisodes.
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
   gratuit. *(En cours. Étage 1 — déplier — fait pour les `.msg`, avec les
   pièces jointes entières. Étage 0 — dédoublonner — fait, et désormais
   **définitif** : les pièces sont gardées dans Supabase Storage sous
   l'empreinte de leurs octets. Restent les citations à retirer du propos, le
   lien pièce ↔ message, et les étages 2 et 3.)*
3. **La mesure** — prédire dans le passé sur les cent projets, contre la ligne
   de base. Avant tout prédicteur. *(fait — `services/mesure-du-passe.js`,
   `services/ligne-de-base.js`. Elle attend maintenant de la matière : c'est
   exactement ce que le versoir prépare.)*
4. **Le tri par règles**, affiné avec ce que la mesure aura montré d'utile.
5. **Le petit modèle**, sur le reste seulement, avec son taux d'escalade mesuré.
6. **Les règles normatives signées** — l'Établi, pas l'ingestion.
7. **L'OCR des pièces scannées**, en dernier.

### Où l'on en est, en une ligne

Les étages gratuits sont ouverts (déplier, compter, dédoublonner), **les pièces
sont gardées** et relisibles, et la mesure attend. Le prochain pas qui débloque
le reste : **garder aussi les messages**, pour que chaque pièce sache d'où elle
vient. C'est cela qui fera les épisodes, et c'est la partie qu'on ne pourra pas
reconstituer plus tard.

## 9. À enrichir

- Le déposant : navigateur ou fonction de bord ? (cent mille pièces ne passent
  pas par un onglet.) Le versoir tranche pour l'**inventaire** et pour le
  **versement** — le navigateur, parce qu'il ne coûte rien et qu'il tient déjà
  les octets. La question se reposera au volume : cent archives à la fois, dans
  un onglet, demanderont au moins de reprendre là où l'on s'est arrêté.
- La durée de conservation de l'archive, et ce qu'on répond à qui demande
  l'effacement d'une pièce (§ 6). Le casier n'a aujourd'hui **aucune politique
  de suppression** — c'est un choix, pas un oubli, et il devra être rediscuté
  avant le premier client.
- Le format d'un épisode, et jusqu'où il remonte dans le passé d'un projet.
- Ce qu'on fait des plans : un indice de révision est une séquence, et c'est
  peut-être le signal le moins cher et le plus riche de tous.
- Les rapports de bureau de contrôle : ils portent des **constats et leurs
  issues** — le seul gisement qui donne directement le couple problème/remède
  dont la prédiction a besoin.
- Un jeu d'épreuve public et inventé, pour que les épreuves de la chaîne
  d'ingestion ne dépendent jamais d'un projet réel.
