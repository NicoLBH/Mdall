# Le carnet prend la forme de l'onglet Sujets

**À quoi sert cette page :** le plan pour que l'écran des situations cesse
d'être un écran à lui et devienne **le même écran que les Sujets**, avec son
rail à gauche, ses lectures, ses vues épinglées et son formulaire.

Il prolonge [`les-situations-traversent-les-projets.md`](les-situations-traversent-les-projets.md),
qui a sorti les situations du projet. Celui-ci leur donne la forme qu'elles
auraient dû avoir depuis le début.

---

## 1. Le constat

L'écran des situations a grandi seul. Il a son tableau, sa fenêtre de création,
son vocabulaire — « mode manuel », « mode automatique », un `filter_definition`
en jsonb — pendant que l'onglet Sujets se dotait d'un rail, de lectures
(« Assigné à moi », « Créé par moi », « Mentions », « Activité récente »), de
vues qu'on épingle avec une icône et une couleur, et d'une barre de recherche.

**Ce sont deux fois la même chose.** Une situation *est* une vue : un nom, une
icône, une requête. Le « mode automatique » est une requête qui n'ose pas dire
son nom, et le « mode manuel » une liste qu'on tient à la main.

Deux écrans qui font la même chose divergent : on l'a déjà vu à chaque étape du
plan précédent — un compte qui ment ici et pas là, un filtre réparé d'un côté.

---

## 2. Ce qu'on retient

**Une situation est une vue, et le carnet est un onglet Sujets.**

| Aujourd'hui | Demain |
| --- | --- |
| `mode` manuel / automatique | une **requête**, dans la grammaire des sujets |
| `filter_definition` jsonb | la même requête, lisible et modifiable au clavier |
| pas d'icône | une **icône** et une **couleur**, comme une vue |
| un écran à part | le rail des sujets, ses lectures, ses épinglées |

> **Rien n'est dessiné de neuf.** `railDesSujets`, `renderRailDesSujetsHtml`,
> `project-rail-layout`, le formulaire d'une vue, `champsDesSujets`,
> `sujetsFiltres` existent, sont purs et sont testés. Le carnet les appelle.
> Ce plan est un plan de **réemploi**, pas d'écriture.

### Ce que le rail portera

De haut en bas, exactement comme les Sujets :

1. **Situations** + son compte — le tableau d'aujourd'hui, avec « Nouvelle situation »
2. **Assigné à moi** — mes sujets, sur tous mes chantiers
3. **Créé par moi**
4. **Mentions**
5. **Activité récente**
6. — un trait —
7. **Épinglées**, puis mes situations

Les quatre lectures du milieu ne sont pas à écrire : `rail-des-sujets.js` les
produit déjà, filtres compris. Ce qui change est ce qu'on lui donne à lire —
les sujets de tous mes chantiers plutôt que ceux d'un projet, ce que l'étape
3 bis du plan précédent a rendu possible.

---

## 3. Les étapes, dans l'ordre

L'ordre suit une règle : **le modèle avant l'écran**. Poser le rail sur des
situations qui n'ont ni icône ni requête obligerait à en inventer à l'affichage,
et l'on aurait deux idées de ce qu'est une situation — celle de la base et celle
de l'écran (règle 4).

### Étape 1 — Une situation est une vue · *faite*

Elle porte une **icône**, une **couleur** et une **requête**, dans le même
vocabulaire qu'une vue des sujets : les mêmes icônes, les mêmes couleurs, la
même grammaire de requête.

C'est le geste qu'on a déjà fait pour les recherches épinglées, qui sont
devenues des vues de la même façon (`202609270001_pinned_searches_vues.sql`).

`mode` et `filter_definition` **restent** : un constat ne devient pas faux
(règle 6), et les situations d'aujourd'hui s'en servent. La requête les
remplacera quand elle saura tout dire ; d'ici là elle est ce qu'on lit en
premier, et le reste sert de repli.

### Étape 2 — Le rail, à gauche

`renderRailDesSujetsHtml` dans la coquille du carnet, avec `project-rail-layout`
— la même structure que la Mémoire et les Sujets, poignée et repliement
compris. Les lectures se calculent sur les sujets de tous mes chantiers ; mes
situations prennent la place des vues épinglées.

**Le piège :** une lecture du rail change ce que le tableau montre. Le carnet
n'a aujourd'hui qu'un tableau de situations ; il lui faut celui des sujets,
qui est le même composant (`renderIssuesTable`) nourri d'une autre liste.

### Étape 3 — Le formulaire d'une vue

« Nouvelle situation » ouvre le formulaire d'une vue : icône, couleur, titre,
description, requête, et le tableau des sujets dessous — celui qu'on est en
train de composer. C'est `project-subjects-recherche.js` qui le porte, et il ne
connaît rien des projets.

### Étape 4 — `mode` et `filter_definition` s'effacent

Quand la requête sait dire ce qu'ils disaient, on les retire. Pas avant : une
situation qui perdrait son filtre sans que sa requête le reprenne changerait de
contenu sans que personne l'ait demandé.

---

## 4. Ce que cet ordre refuse

**De dessiner un second rail.** Il en existe un, il est pur, il est testé. En
écrire un pour cet écran, c'est accepter qu'ils diffèrent d'un pixel, puis d'un
comportement.

**De poser l'écran avant le modèle.** Un rail sur des situations sans icône ni
requête obligerait à en inventer à l'affichage — et l'on aurait deux idées de ce
qu'est une situation.

**D'effacer `filter_definition` tout de suite.** Il porte ce que des situations
retiennent aujourd'hui. On le remplace, on ne le perd pas.
