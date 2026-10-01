# Où vivent les idées d'un projet, et comment elles entrent en mémoire

Le tour précédent a donné une forme à l'idée : **une fonction** — deux termes et
un lien nommé (`docs/une-idee-est-une-fonction.md`). Elle était mesurée sur
l'ensemble des chantiers, dans la console, et elle s'arrêtait là.

Celui-ci la fait entrer dans un projet. La question qui a tout décidé est
celle-ci :

> « Que faire et où afficher les idées, fonctions, raisonnements qui ont été
> analysés dans un projet mais qui doivent rester privés, car n'ayant pas été
> (encore) versés à la mémoire ? »

## Le chemin, en une ligne

    document → lecture gardée → affirmation de proposition → signature → mémoire

Chaque flèche est une étape qu'on peut regarder, et **aucune n'écrit dans la
mémoire sans la suivante**.

## 1. La lecture gardée : là où une idée vit avant d'exister

Les idées d'un compte rendu sont relevées **pendant la lecture**, au serveur, et
gelées avec le reste de l'analyse (`cr_lectures.analyse_gelee`). Elles
s'affichent dans l'Atelier, sous « Ce que ce document lie », à côté des points
et de la confrontation.

C'est la réponse à la question : **au même endroit que le reste de l'analyse, et
nulle part ailleurs**. Une lecture est une exécution personnelle ; elle n'est
pas partagée avec le projet, et la mémoire du projet n'en sait rien.

**Relevées à la lecture, et non à l'ouverture de l'écran.** La liste des mots de
liaison bougera. Une analyse datée qui changerait sous l'œil de celui qui la
relit ne serait plus une analyse (règle 6).

## 2. L'affirmation : ce qu'une idée affirme, et rien de plus

Une idée lue dans un compte rendu **ne dit pas** qu'un plancher sera repris. Elle
dit que ce document énonce un lien entre deux termes. C'est tout ce qu'on sait,
donc tout ce qui est écrit :

```
Terrain argileux → Plancher beton = "entraîne" {
   document: 1824_CR_12.pdf, page 3
      parce que: "Le terrain argileux est confirmé donc le plancher béton sera repris."
   statut: supposé
}
```

| ce qui est écrit | pourquoi |
|---|---|
| **sujet** = la relation | mettre « Plancher beton » en sujet aurait obligé à lui inventer une valeur, et « repris » n'est écrit nulle part dans ce que le découpage a lu |
| **valeur** = le verbe du lien | c'est exactement ce que le document affirme |
| **nature** : `constat` | ce qui est observé est ce que le document dit, à sa date, et cela ne devient jamais faux (règle 6). Un `raisonnement`, ici, traverse une décision humaine — ce n'est pas le cas |
| **provenance** : `document:` | le type de la provenance **est** l'origine de la valeur |
| **citation** : la phrase exacte | sans elle, une idée fausse ne se conteste pas : on ne saurait plus si c'est le document qui le dit ou le découpage qui s'est trompé |
| **statut** : `supposé` | le lien a été coupé mécaniquement. Signer dit « garde cette lecture », pas « c'est établi » |

## 3. Ce qu'il n'a pas fallu construire

**Une idée n'est pas une nouvelle sorte de ligne de proposition.** C'est une
affirmation de mémoire, exactement celle que l'Atelier propose depuis toujours.
Conséquence : la proposition l'écrit en mdall toute seule, la revue la coche, la
fusion l'applique. Rien de neuf sur ce chemin.

Inventer une nature « idée » aurait fait un second écran de revue, une seconde
fusion et une seconde écriture mdall — pour écrire la même chose (règle 4). Le
seul code ajouté est la traduction d'une idée en affirmation, et elle tient en
vingt lignes.

## 4. Ce que le découpage ne sait pas lire, et qui est dit

Seules les liaisons placées **entre** les deux membres d'une phrase sont lues.
« Si le sol est argileux, les fondations descendent » commence par son lien : à
gauche, il n'y a rien à couper.

Une lecture sans idée ne veut donc pas dire que le document n'en énonce aucune,
et l'écran le dit plutôt que de laisser croire au constat (règle 5).

## 5. La suite : les mails, et les avis du bureau de contrôle

La même forme vaut pour tout document. Ce qui manque est le **gardiennage des
analyses** ailleurs que sur les comptes rendus :

- **Atelier > lecture d'un fil de mails** : garder les analyses en base, lister
  les mails déjà analysés, afficher le détail de chacune. C'est exactement ce
  que `cr_lectures` fait pour les comptes rendus.
- **Le suivi des avis du bureau de contrôle** : idem.

Une fois les analyses gardées, les idées s'y affichent et s'y proposent sans
rien ajouter d'autre : la traduction en affirmation ne dépend pas du genre de
document.

## Où cela vit

| Quoi | Où |
|---|---|
| La forme d'une idée, les six sortes de liens | `apps/web/js/services/une-idee.js` |
| L'idée lue dans un document, et son affirmation | `apps/web/js/services/une-idee-relevee.js` |
| Le découpage, à un seul endroit | `supabase/migrations/202611140001_la_coupe_dun_texte.sql` |
| Le relevé pendant la lecture | `supabase/functions/lire-les-comptes-rendus/index.ts` |
| L'analyse gelée qui les garde | `apps/web/js/services/la-lecture-conservee.js` |
| L'écran | Atelier → lecture d'un compte rendu → « Ce que ce document lie » |
