# Les trois axes d'une affirmation

**À quoi sert cette page :** le même objet portait trois noms selon l'endroit où
on le regardait. Cette page dit pourquoi, ce qu'on a gardé, ce qu'on a retiré, et
le partage qui vaut désormais pour tout l'écran.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## Le contact

Devant une règle versée, l'écran disait trois choses à la fois :

| où | ce que l'écran disait | la question à laquelle il répondait |
| --- | --- | --- |
| le rail, filtre « Règles » | règle | **d'où ça tient son autorité** |
| la puce de la ligne | Donnée de base | **d'où vient l'information** |
| le panneau de détail | Le raisonnement | **quelle forme ça a** |

Les trois étaient vraies. Aucune ne contredisait les autres. Mais comme elles
s'affichaient dans le même costume graphique, le lecteur croyait qu'elles se
disputaient la même case — et il avait raison de le croire : la colonne `nature`
mélangeait effectivement des choses qui ne sont pas du même ordre.
`donnee-de-base` est une **provenance**. `raisonnement` est une **forme**. Elles
n'auraient jamais dû être deux valeurs d'un même champ.

## Ce qu'on a tranché

Il y a trois axes, pas sept natures.

**L'autorité** — qui tranche. L'ouvrage, un texte, un humain, une mesure, le
projet. C'est ce qui ne se voit pas en lisant la ligne : **c'est donc l'unique
puce de l'écran**.

**La forme** — combien de conditions, combien de branches, combien de niveaux.
Zéro condition : une valeur posée. Des conditions : une valeur déduite. Des
niveaux qui se déduisent les uns des autres : c'est le seul vrai axe de
complexité — un niveau est moins complexe que six. Et il **se voit** : personne
n'a besoin qu'on lui écrive « ceci est une fonction » sous une fonction qu'il est
en train de lire.

**La rejouabilité** — est-ce que ça se recalcule tout seul, ou est-ce que ça
s'arrête et redemande à quelqu'un. C'est la seule chose vraiment opératoire de
tout ce vocabulaire, et **elle était cachée à l'intérieur d'un mot** : la nature
« raisonnement » portait, dans sa définition, *« un raisonnement qui traverse une
décision ne se rejoue pas tout seul »*. Or cela ne se déclare pas, cela se
**déduit** de la chaîne. Ce n'est pas une catégorie, c'est un diagnostic — et un
diagnostic s'affiche.

En une phrase : **on a cessé de nommer ce qui se voit, et on affiche ce qui ne se
voit pas.** L'écran faisait l'inverse.

## Une décision est une fonction

« Si nature des volets = bois alors couleur des volets = violet » est une
fonction. « Je décide que les volets seront violets » en est une aussi, sans
condition. La décision n'est pas une autre espèce : c'est une fonction d'arité
zéro, avec un auteur et une date.

Une nuance, et elle est utile. Deux formulations, deux fonctions différentes :

- « **quelque soit** ce qui s'est dit avant, je décide que » → aucune condition.
  Rien ne peut la contredire.
- « **compte tenu de** ce qui s'est dit avant, je décide que » → il y a des
  conditions, mais elles sont **citées, pas évaluées**. Ce sont des motifs, pas
  des tests.

C'est la ligne de fracture qui compte : une règle laisse ses conditions la
recalculer, une décision les mentionne et garde la main. Même grammaire,
autorité opposée.

## Ce qui a changé à l'écran

| avant | après |
| --- | --- |
| une puce « Nature » : Contrainte, Donnée de base, Raisonnement… | une puce **d'autorité** : *D'un texte · Décidé · Constaté · Supposé · Du projet* |
| le menu du tableau offrait la nature | il offre **l'autorité** et **la forme** — l'axe que la ligne affiche |
| la lecture du rail s'appelait « Règles » | elle s'appelle **« Fonctions »** — le mot du langage |
| `regle:oui` se tapait dans la barre | `fonction:oui`, plus `autorite:` et `forme:` |
| la colonne de code s'intitulait « Le raisonnement » | **« Les fonctions »** — la vue garde son nom, « Comment on en est arrivé là » |
| rien ne disait ce que recalculer coûtait | une pastille **« Rejeu »** : *se recalcule seule — 3 niveaux*, ou *s'arrête sur une décision d'Ourdine Ferrand, le 12/03* |

**Rien n'a changé en base.** `nature` reste la colonne, `estUneRegle` reste le
test, `nature:raisonnement` reste interrogeable au clavier. Les trois axes se
déduisent à la lecture : reprendre trois cents lignes pour y réécrire ce qu'on
sait déjà dire serait une occasion de se tromper sans retour (règle 4).

**Et dans le code on continue de dire « règle ».** C'est le mot du langage, il
est dans les `.ref`, `READER.RULES` et `estUneRegle` ne bougent pas. C'est le
même partage qu'à l'étape 0 de `docs/lobjet-de-la-connaissance.md` : *à l'écran
on garde sujet, dans le code on peut parler de point.*

## L'ordre dans lequel on l'a fait, et pourquoi

Le badge de rejeu **d'abord**, le retrait des mots ensuite. Le risque, en
aplatissant tout en « fonction », est de brouiller la frontière du rejeu : c'est
précisément pourquoi la rejouabilité devait devenir visible **avant** qu'on
retire le mot qui la portait. Dans cet ordre, pas l'inverse.

## Trois défauts trouvés en chemin, et ils se ressemblent

Tous les trois ont la même cause : **la colonne `nature` sous-dit ce que le
`payload` sait**, parce qu'elle est souvent déduite du `kind` par lequel la ligne
est entrée en mémoire.

1. **Une fonction versée se lisait « Donnée de base ».** Son `kind` est celui
   d'une donnée de base — c'est par là qu'elle entre —, et elle n'a pas de
   nature. C'est le défaut vu à l'écran.
2. **Une valeur tranchée par un humain se lisait « Du projet ».** Elle porte la
   nature de la valeur produite, `donnee-de-base` par défaut. Or quelqu'un l'a
   choisie entre des possibles : c'est exactement ce que Mdall existe pour
   garder, et le mot l'effaçait. Trouvé par une épreuve, pas à l'œil.
3. **Les deux portaient l'étoile des données de base.** Le dessin suivait la même
   colonne que le mot. Il suit maintenant la même échelle : la fonction, puis le
   choix humain, puis la nature.

Et un quatrième, d'un autre ordre : **la lecture « Fonctions » était née avec une
icône `code` qui n'est pas dans la planche.** Un `<use>` qui ne résout pas ne
lève rien et ne peint rien — le rail affichait un carré vide depuis sa mise en
service, et rien ne pouvait le voir.

## Ce qu'on a appris à éprouver

`project-memory.js` importe `assets/js/auth.js`, qui importe Supabase depuis un
CDN. **Soixante-six modules sont dans ce cas, et aucune épreuve ne pouvait les
charger** — au mieux elles les relisaient comme du texte. Tout ce que cet écran
écrit y échappait.

On l'a mesuré : neuf mutations posées dans le rendu de cet écran, **six
passaient** la suite entière sans faire tomber un seul cas. C'est la leçon déjà
écrite ailleurs — *une fonction pure s'éprouve par son résultat ; un câblage ne
s'éprouve que par le code qui le porte* — et il manquait le moyen de porter
celui-ci.

`vm.SourceTextModule` sait lier un graphe de modules soi-même. On résout donc les
chemins relatifs sur le disque, **tout ce qui vient d'un CDN devient un module
muet**, et le navigateur est un mandataire qui répond à tout sans rien faire. Les
modules se chargent ; ce qu'on vérifie ensuite est une chaîne de HTML, et une
chaîne n'a pas besoin de DOM. Les six mutations tombent maintenant.

Cela n'éprouve **aucun geste** : rien n'est cliqué, rien n'est branché. Ce qui se
passe après un clic continue de se vérifier au clavier, dans un vrai navigateur.

## Où ça vit

| ce qu'on cherche | où |
| --- | --- |
| les trois axes, et lequel parle | `apps/web/js/services/axes-de-la-memoire.js` |
| ce qui tranche chaque nature | `apps/web/js/services/assertion-taxonomy.js` — `SETTLED_BY` |
| la décision que porte une ligne | `apps/web/js/services/decision-remise-en-question.js` |
| la chaîne dont le rejeu se déduit | `apps/web/js/services/memoire-raisonnement.js` |
| la puce, le menu, la pastille de rejeu | `apps/web/js/views/project-memory.js` |
| les lectures du rail | `apps/web/js/services/memory-readers.js` |
| l'écran chargé pour de vrai | `apps/web/js/views/project-memory-au-chargement.test.mjs` |
| le mot de l'écran et le mot du code | `docs/lobjet-de-la-connaissance.md` — étape 0 |
