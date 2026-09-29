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

**Étage 1 — déplier.** `.eml`, tableurs, PDF **nés numériques** (le texte y est
déjà, il n'y a rien à reconnaître). Gratuit.

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

## 7. Le glissé-déposé des mails : ce qui reste à faire

Le décorticage existe et il est gratuit. Ce qui manque :

1. **Déposer un dossier entier**, pas un fil à la fois : cent projets ne se
   glissent pas message par message.
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
   rempliront.
2. **Le dépôt en masse des mails**, jusqu'à l'épisode — étages 0 à 3, tout
   gratuit.
3. **La mesure** — prédire dans le passé sur les cent projets, contre la ligne
   de base. Avant tout prédicteur.
4. **Le tri par règles**, affiné avec ce que la mesure aura montré d'utile.
5. **Le petit modèle**, sur le reste seulement, avec son taux d'escalade mesuré.
6. **Les règles normatives signées** — l'Établi, pas l'ingestion.
7. **L'OCR des pièces scannées**, en dernier.

## 9. À enrichir

- Le déposant : navigateur ou fonction de bord ? (cent mille pièces ne passent
  pas par un onglet.)
- Le format d'un épisode, et jusqu'où il remonte dans le passé d'un projet.
- Ce qu'on fait des plans : un indice de révision est une séquence, et c'est
  peut-être le signal le moins cher et le plus riche de tous.
- Les rapports de bureau de contrôle : ils portent des **constats et leurs
  issues** — le seul gisement qui donne directement le couple problème/remède
  dont la prédiction a besoin.
- Un jeu d'épreuve public et inventé, pour que les épreuves de la chaîne
  d'ingestion ne dépendent jamais d'un projet réel.
