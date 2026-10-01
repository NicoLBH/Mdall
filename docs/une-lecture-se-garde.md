# Une lecture de compte rendu se garde, et elle ne se recalcule pas

## Ce qui s'était perdu

L'écran de l'Atelier montrait tout : le document refait en Markdown, les points
relevés, la confrontation au projet, les lots, les labels, les fermetures
proposées. Puis la lecture est passée au serveur — pour que dix-neuf comptes
rendus ne bloquent plus l'écran une heure —, et **cet affichage a disparu avec
elle**. Le serveur lit, pose une proposition, et ne rend rien à regarder.

Il y avait déjà, avant, une perte plus discrète : une fois le compte rendu
transformé en proposition, son analyse n'existait plus nulle part. On ne pouvait
plus revenir voir ce que la lecture avait vu, ni pourquoi tel point avait été
rapproché de tel sujet.

## Ce qu'on garde

`cr_lectures` gardait ce qu'une lecture **valait** — ses nombres, pour la
comparer à la précédente. Elle garde maintenant ce qu'elle **a vu** : les points
relevés, la confrontation, les rubriques du document, et les sujets du projet
tels qu'ils étaient ce jour-là.

Une ligne par lecture, jamais mise à jour. Relire le même document est une
seconde lecture, avec sa propre ligne : c'est ce qu'on veut comparer quand on
ajuste une consigne (règle 6). L'accueil liste des **comptes rendus**, pas des
essais : il garde la dernière lecture de chacun, et dit combien de fois il a été
lu.

Elles restent **privées**, comme toute la table : une lecture d'Atelier
n'appartient qu'à qui l'a faite.

## La règle, et c'est elle qui répond aux sujets ouverts et fermés

> **Une lecture est une photographie. Elle ne se retouche pas.**
> Ce qu'elle a vu est gelé ; ce que le projet est devenu se lit à côté.

Un sujet rapproché en mars et fermé depuis **ne rend pas la lecture de mars
fausse** : elle a eu lieu, et ce qu'elle a vu reste vrai de mars (règle 6).

L'écran montre donc deux faits, à deux places, et aucun ne se fait passer pour
l'autre :

| ce que la lecture a vu | ce que c'est devenu |
| --- | --- |
| gelé dans `analyse` | lu en direct dans `subjects` |
| « #7 · open » | « aujourd'hui : closed » |

Et quand on n'a pas pu relire les sujets d'aujourd'hui, **on ne dit rien** : une
colonne vide ferait croire que rien n'a changé (règle 5).

### Pourquoi pas recalculer

Recalculer la confrontation à chaque ouverture aurait l'air plus juste. C'est
l'inverse :

- la lecture changerait toute seule, et l'on ne pourrait plus l'opposer à
  personne — « voilà ce que la lecture avait dit » n'aurait plus de sens ;
- elle coûterait un appel au modèle à chaque consultation ;
- et elle ferait croire que le modèle d'aujourd'hui aurait lu le compte rendu de
  mars comme ça, ce que personne n'a vérifié.

### Ce qu'on ne peut donc pas faire sur une lecture rouverte

**La transformer en proposition.** Ses rapprochements visent les sujets du jour
où elle a eu lieu : certains sont fermés, renommés ou fusionnés depuis. On relit
le compte rendu — c'est plus honnête, et cela coûte ce que cela coûte.

## L'ordre : celui des réunions, jamais celui des lectures

> « Si on ajoute un CR n° 12 après l'analyse des CR 15 et 16, il doit reprendre
> naturellement sa place dans le bon ordre. »

Il la reprend, et sans rien recalculer, parce que **rien ne dépend de l'ordre
dans lequel on a lu** : chaque lecture ne dit que ce qu'elle a vu.

La liste se range sur `tenue_le`, la date de la réunion — un compte rendu tenu
en mars et lu en septembre est de mars. Sans date, sur le numéro de réunion.
Sans numéro ni date, en dernier : on ne lui invente pas une place dans la
chronologie du chantier (règle 5).

## Où c'est écrit

- `apps/web/js/services/la-lecture-conservee.js` — ce qu'on gèle, ce qu'on
  rouvre, l'ordre. Pur, éprouvé, et **descendu au serveur** : le navigateur et
  la fonction de bord gardent la même chose par le même module (règle 4).
- `supabase/migrations/202611120001_une_lecture_de_cr_se_garde.sql` — les trois
  colonnes et l'index, strictement additifs.
- `apps/web/js/views/studio/dev/lecture-des-cr.js` — l'accueil et la réouverture.
