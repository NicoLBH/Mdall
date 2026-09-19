# Lire les mails d'un projet

**À quoi sert cette page :** le plan d'un second utilitaire de l'Atelier — « Lecture des
mails » —, bâti comme « Lecture d'un compte rendu » et pour la même raison : une matière
première qu'on relit, qu'on juge à l'œil, et dont on ne tire rien sans signature.

Ce qui est décidé, ce qui reste à trancher, et dans quel ordre.

---

## Pourquoi un utilitaire à part, et non le lecteur de CR

Un compte rendu est **déjà arbitré**. Quelqu'un a tenu la réunion, écouté, tranché, et
rédigé : les points y sont numérotés, rangés par lot, datés d'une échéance. Le lecteur de
CR fait du secrétariat sur une décision déjà prise.

Un fil de mails est l'inverse : c'est **l'arbitrage en train de se faire**, ou de ne pas se
faire. On y trouve ce qu'un compte rendu ne porte jamais —

- une question posée à laquelle **personne n'a répondu** ;
- deux messages qui **affirment le contraire** l'un de l'autre ;
- un engagement pris **entre deux réunions**, qui ne figure nulle part ;
- la **source** d'un chiffre qu'un compte rendu reprendra sans dire d'où il vient.

C'est cette matière-là qui vaut la peine, et aucune des trois ne se range dans un lot avec
une échéance. Faire entrer les mails dans le lecteur de CR obligerait à leur inventer une
structure qu'ils n'ont pas — et l'on retomberait sur des points « sans lot », « sans page »,
« sans échéance », c'est-à-dire sur un écran qui n'affiche que des trous.

## Ce qui ne change pas

**Rien n'entre directement dans la mémoire.** Le fil se lit, se juge, et sort par une
proposition que quelqu'un signe, ligne à ligne (règle 1).

**Ce que l'IA produit s'affiche avant d'être exploité**, et son coût se voit à la requête
près (fondamental 13).

**On doit pouvoir se passer du modèle.** Et ici, plus qu'ailleurs : voir ci-dessous.

---

## Deux portes, un seul procédé

Un mail entre par deux chemins, et il ne faut pas les confondre.

```
 PORTE 1  on glisse des .eml dans la zone de dépôt      ← d'abord, tout de suite
 PORTE 2  on envoie le fil à l'adresse du projet        ← ensuite, et c'est un morceau à part
                            │
                            ▼
                    LE MÊME DÉPLIAGE
```

**La seconde est la porte principale** — c'est ainsi qu'on s'en servira vraiment : on
transfère un fil à l'adresse du projet depuis sa messagerie, sans rien télécharger ni
glisser. Mais elle demande une boîte de réception, un domaine, une identification de
l'expéditeur : c'est de l'infrastructure, et elle a ses propres questions de sécurité
(plus bas).

La première se fait tout de suite et ne dépend de rien. Elle sert à écrire et à vérifier le
dépliage, le fil, le relevé — c'est-à-dire **tout ce que la seconde porte utilisera aussi**.
Commencer par elle n'est pas un repli : c'est l'ordre qui permet de brancher la boîte sur
quelque chose qui marche déjà.

## Le procédé, et ce qui le distingue du CR

```
 .eml ──►  1. DÉPLIER                     AUCUN APPEL      0 c.
           en-têtes, corps, citations, pièces jointes
              │
              ▼
           LE FIL RECONSTITUÉ  ──►  2. RELEVÉ    modèle bon marché
              (affiché, relu)         ce que chacun constate, demande,
                                      engage, décide — et ce qui reste sans réponse
                                         │
                                         ▼
                                      3. CONFRONTATION au projet   (existant)
                                         │
                                         ▼
                                      UNE PROPOSITION ──► la mémoire
```

**La première étape ne coûte rien, et c'est le point central de ce plan.**

Un PDF est une image de page : le transcrire demande un modèle, et tout le lecteur de CR est
construit autour de cette dépense — la restitution, sa mesure de fidélité, les mots ajoutés,
les titres inventés, le rangement pour ne pas repayer.

Un `.eml` est **du texte structuré** (RFC 5322). L'expéditeur, la date, l'objet, les
destinataires, le corps, le fil des citations : tout y est nommé. Le déplier est du
*parsing*, pas de la lecture.

Trois conséquences :

| Chez le CR | Ici |
|---|---|
| La restitution coûte un appel | Le dépliage est gratuit |
| On mesure la fidélité — mots retrouvés, mots ajoutés | **Rien à mesurer** : on n'a rien réécrit |
| On range la restitution pour ne pas la repayer | **Rien à ranger** : la refaire est gratuite |
| Une page fausse se voit mal | Un mail mal déplié se voit tout de suite |

Ce qui remplace la mesure de fidélité n'est donc pas un chiffre, mais une question :
**qu'est-ce qu'on n'a pas su placer ?** Un message dont la date ne se lit pas, un séparateur
de citation qu'on ne reconnaît pas, un corps en HTML qu'on n'a pas su réduire en texte. Ces
trous-là s'affichent (règle 5) — ils ne se comptent pas, ils se montrent.

---

## Étape 1 — Déplier un mail, sans modèle

### Ce qu'un `.eml` porte

```
From: ...                      qui écrit
To: ..., Cc: ...               à qui, en copie
Date: ...                      quand, avec son fuseau
Subject: ...                   l'objet — souvent « Re: Re: TR: … »
Message-ID: <...>              l'identité du message
In-Reply-To: <...>             à quel message il répond
References: <...> <...>        toute la chaîne au-dessus de lui
```

`In-Reply-To` et `References` sont **ce qui reconstitue le fil sans rien deviner**. Quand ils
sont là, l'arbre de la discussion est donné : on n'a pas à le reconstruire par les dates, qui
mentent (un message envoyé d'un téléphone mal réglé, un fuseau, un brouillon repris trois
jours plus tard).

Quand ils manquent — un mail transféré, un export d'une messagerie qui les perd — on retombe
sur l'ordre des dates, **et l'écran le dit** : « ce fil a été ordonné par ses dates, faute de
chaîne de réponses ». Deux façons de savoir, deux degrés de certitude, et on ne les confond
pas.

### Le corps, et ses trois formes

Un mail porte `text/plain`, `text/html`, ou les deux dans un `multipart/alternative`. Chacun
peut être encodé (`base64`, `quoted-printable`) et dans n'importe quel jeu de caractères.

**On prend `text/plain` quand il existe**, et l'on réduit le HTML en texte sinon. Prendre le
HTML par défaut ferait passer de la mise en forme pour du propos — et c'est exactement ce
qu'on reproche à une transcription infidèle.

Un corps qu'on n'a pas su décoder ne s'affiche pas vide : il se dit non décodé, avec son
encodage. « Ce message est vide » et « je n'ai pas su le lire » demandent deux gestes
différents (règle 5).

### La citation : le morceau difficile

Chaque message d'un fil porte **son propre texte, plus la copie de tout ce qui précède**.
Déposer huit mails d'une même discussion, c'est déposer huit fois le même texte, imbriqué de
huit façons.

Le dépliage doit séparer, dans chaque message, **ce que son auteur a écrit** de ce qu'il
recopie. Deux marques, et elles sont de nature différente :

- le préfixe `>` (et `>>`, `>>>`) — une convention, fiable ;
- les bandeaux des messageries — « Le 12 mars 2026 à 09:14, X a écrit : »,
  `De : … Envoyé : … À :`, `-----Message d'origine-----`, une ligne de tirets bas. Ceux-là
  dépendent de la langue et du logiciel, et **aucune liste n'est complète**.

D'où la règle : on reconnaît ce qu'on reconnaît, et **ce qu'on n'a pas su couper reste dans
le message, visiblement**. Couper trop perdrait du propos ; couper au jugé sans le dire
ferait croire qu'on a tout vu. Un message dont la coupure est incertaine porte une marque, et
l'écran la montre.

### Ce qui sort de l'étape 1

Une **discussion** : une suite de messages, chacun avec qui, quand, à qui, ce qu'il ajoute,
ce qu'il cite, et ses pièces jointes nommées. Plus la liste de ce qu'on n'a pas su placer.

C'est ce que l'onglet « Le fil » affiche, et c'est ce que le modèle relira — exactement comme
la restitution d'un CR : **on voit sur quoi il s'est fondé**.

---

## Où va le mail : un dossier privé

**Un compte rendu est un document contractuel qui circule. Un mail est de la
correspondance.** Il porte des adresses, des noms, parfois des propos qui ne regardent pas
le projet. Le déposer comme un CR le rendrait lisible par toute l'équipe.

Un mail déposé va donc dans un dossier **« Mails »**, à la racine de Fichiers, **qui n'est
pas partagé** : seul celui qui l'a déposé y a accès. Il porte un cadenas dans l'arbre et
dans le tableau — un dossier qui se comporte autrement que ses voisins doit se voir.

> C'est une décision provisoire, et elle est à rediscuter. Elle est écrite ici pour qu'on
> sache ce qui a été choisi, et pourquoi on pourrait en changer.

### La garde vit dans la base, pas dans l'écran

Un écran qui masque est un écran qu'on contourne : l'API est là, et elle répond. La règle
posée pour le Copilote vaut mot pour mot ici — *il faut mettre les garde-fous pour empêcher
que ça arrive, sinon le produit sera discrédité*.

Donc : une colonne sur le dossier (`prive`), et une **politique RLS** qui restreint la
lecture des documents d'un dossier privé à celui qui les a déposés. La migration est
strictement additive, et le défaut est « partagé » — un dossier existant ne change pas de
nature.

L'écran, lui, ne fait que montrer ce que la base autorise déjà. S'il oubliait le cadenas,
personne ne verrait rien de plus.

### L'asymétrie, et pourquoi il faut la dire

Ce qui sort du fil — les prises de position, avec qui l'a dite, quand, et la citation —
entre dans une proposition **visible de l'équipe**. C'est tout l'objet : *extraire le
contenu des mails sans dévoiler la correspondance*.

Mais alors la citation d'un point issu d'un mail **pointe vers un document que les autres ne
peuvent pas ouvrir**. Un collaborateur lit « d'après l'échange du 12 mars », et ne peut pas
aller voir.

Cela ne se tait pas. Le point porte **« issu d'un échange privé »**, et celui qui le relit
sait qu'il ne remontera pas à la source. C'est une asymétrie assumée, pas un oubli (règle 5)
— et c'est précisément ce qui devra être rediscuté : un constat qu'on ne peut pas vérifier
est plus fragile qu'un constat qu'on peut ouvrir.

---

## Étape 2 — Le relevé : ce qu'un fil porte

Un compte rendu donne des *points* : un lot, une référence, un destinataire, une échéance.
Un fil de mails n'a rien de tout cela. Ce qu'il porte, ce sont des **prises de position** —
chacune attribuée, datée, et citée mot pour mot.

| Nature | Ce que c'est | Ce que ça devient |
|---|---|---|
| **Constat** | un fait affirmé — « le support est humide au droit de l'acrotère » | une valeur en mémoire, si elle est signée |
| **Demande** | « pouvez-vous confirmer la cote avant vendredi ? » | un sujet à ouvrir |
| **Engagement** | « nous repassons jeudi avec le géomètre » | un sujet, avec un qui et une date |
| **Décision** | « on part sur la variante B » | un sujet, ou une relance de celui qui posait la question |
| **Source** | « d'après le DTU 43.1 § 5.2 » | ce qui fonde un constat — la provenance, pas le constat |
| **Question sans réponse** | posée, jamais reprise dans la suite du fil | **un sujet à ouvrir, et c'est l'apport principal** |
| **Désaccord** | deux messages affirment le contraire | un sujet, avec les deux positions citées |

Les deux dernières sont celles qu'un compte rendu ne porte jamais, et elles se **dérivent**,
elles ne se demandent pas au modèle : une question sans réponse est une demande qu'aucun
message postérieur ne reprend ; un désaccord est deux constats contraires sur la même chose.
Les faire déclarer par le modèle en ferait des inventions ; les calculer sur le fil déplié en
fait des observations.

**Chaque prise de position porte sa citation**, et la citation se vérifie contre le message
d'où elle sort — comme celle d'un point de CR se vérifie contre sa page. Une citation
introuvable écarte la prise de position : c'est le garde-fou existant, et il vaut ici sans
changement (règle 12).

---

## Étape 3 — La confrontation, et la sortie

Rien de neuf : c'est la chaîne du CR, et elle se réutilise telle quelle.

| Ce qu'on réutilise | Où |
|---|---|
| Confronter à ce que le projet suit déjà | `services/lecture-du-cr.js` — `confrontation` |
| Les lots que le fil nomme | `services/lots-du-cr.js` |
| Les échéances datées | `services/echeances-du-cr.js` |
| Les fermetures | `services/fermeture-du-cr.js` |
| Rédiger la proposition | `services/proposition-du-cr.js`, `atelier-proposition.js` |
| Adapter un fil à cette chaîne | `services/points-du-fil.js` — pur · *écrit* |
| Emporter ce que l'écran a produit | `services/le-fil-en-texte.js` — pur · *écrit* |
| L'appliquer à la fusion | `services/appliquer-le-cr.js` |

Ce qui change : le **label**. Un CR porte « CR chantier » ; un fil de mails porterait
« Échange ». Et l'identité du document n'est plus « compte rendu n° 14 du 3 mars » mais
**l'objet du fil et sa période** — « Étanchéité toiture · 12 messages du 3 au 19 mars ».

---

## Ce que l'écran montre

La même coquille que le lecteur de CR, et les mêmes classes — c'est la même nature d'écran, et
en dessiner un second jeu ferait deux calibrages à recaler ensemble.

```
┌─────────────────────────────────────────────────────────────┐
│ Lecture d'un fil de mails      [Un autre fil] [Transformer ▾]│
├─────────────────────────────────────────────────────────────┤
│  ⌜ déposez des .eml, ou choisissez-les ⌝                     │
├─────────────────────────────────────────────────────────────┤
│  Le fil : Étanchéité toiture · 12 messages du 3 au 19 mars   │
│  ⚠ 2 messages ordonnés par leur date, faute de chaîne        │
├──────────────┬──────────────────────────────────────────────┤
│  Le fil      │  Analyse                                      │
├──────────────┴──────────────────────────────────────────────┤
│  ▸ 3 mars 09:14 — A. (entreprise)  → B., C. en copie         │
│    « Le support est humide au droit de l'acrotère. »         │
│    ⎿ cite le message du 2 mars                               │
│    📎 releve-humidite.pdf                                     │
│  ▸ 3 mars 11:02 — B. (maître d'œuvre) → A.                   │
│    ...                                                       │
└─────────────────────────────────────────────────────────────┘
```

**Le fil d'abord, l'analyse ensuite** — c'est l'ordre du procédé, et c'est celui du lecteur de
CR pour la même raison : juger des points sans avoir vu ce dont ils sortent, c'est ce qui
rendait les déceptions inexplicables.

---

## Les étapes, dans l'ordre

Chacune ferme sur quelque chose qui marche, et chacune se vérifie en cassant une règle.

### 1 — Déplier un `.eml`, et rien d'autre · *fait*

Un service pur : du texte RFC 5322 entre, une discussion sort. Pas d'écran, pas de réseau.
Les en-têtes, le décodage (`base64`, `quoted-printable`, les jeux de caractères), le choix
`text/plain` / `text/html`, les pièces jointes nommées.

**Ce qui se vérifie en cassant** : un mail sans `Date` n'invente pas la date du jour ; un
corps non décodé ne s'affiche pas vide ; un `multipart` dont on prend le HTML alors que le
texte existe.

### 2 — Séparer ce qu'on écrit de ce qu'on cite · *fait*

Le préfixe `>`, puis les bandeaux des messageries. Ce qu'on n'a pas su couper reste, et se
marque.

**En cassant** : un bandeau reconnu ne doit pas emporter le message entier ; une ligne qui
commence par `>` dans un devis (`> 50 m²`) n'est pas une citation — il lui faut le contexte
d'un bloc.

> Écrit dans `services/ce-quon-cite.js`. Le doute penche toujours du même côté :
> **dans le doute, c'est du propos**, et un trou le dit. Une conséquence se paie
> à l'œil, et elle est assumée : dans une réponse point par point, chaque ligne
> citée seule reste dans le propos, avec sa marque.
>
> Deux marques de plus s'y jouent. La **signature** (`-- `) sort du propos :
> laisser un pied de page y entrer donnerait au relevé des numéros de téléphone
> à prendre pour des constats. Et les **chevrons referment la citation qu'un
> bandeau a ouverte** — sans quoi le « Merci, à jeudi » écrit sous la citation
> serait attribué à quelqu'un d'autre.
>
> Les vingt et une ruptures essayées tombent. Ce qui reste : § 48 de
> [`a-traiter-plus-tard.md`](a-traiter-plus-tard.md).

### 3 — Reconstituer le fil · *fait*

`In-Reply-To` et `References` d'abord, les dates ensuite, et l'écran dit lequel des deux. Les
doublons — le même message recopié dans huit citations — n'apparaissent **qu'une fois**, à sa
place.

**En cassant** : deux messages de même date mais de chaîne différente ; un fil où le dernier
message porte tout, déposé seul.

> Écrit dans `services/le-fil-des-mails.js`, qui enchaîne les étapes 1 et 2 : des
> `.eml` entrent, un fil sort. `ordre` porte laquelle des deux façons a fait le
> travail — `chaine`, `dates`, `melange`, ou `unique` pour un mail seul.
>
> **Quand deux exemplaires s'opposent, le déposé gagne** : il a sa vraie date,
> ses destinataires et ses pièces jointes, là où la citation n'a que ce que la
> messagerie a recopié. Un message reconstitué porte `certitude: "cite"`, une
> date qui n'est qu'un texte, et son trou.
>
> Une chose qui n'était pas dans le plan et qu'il a fallu trancher : **le rang
> vient de la chaîne, la période vient des dates**. Un message écrit d'un
> téléphone mal réglé se range après celui auquel il répond, mais sa date compte
> quand même dans « du 3 au 19 mars ». Confondre les deux ferait courir la
> période à l'envers.
>
> Les vingt-huit ruptures essayées tombent. Ce qui reste : § 49 de
> [`a-traiter-plus-tard.md`](a-traiter-plus-tard.md).

### 4 — L'écran, et le fil affiché · *fait*

La coquille du lecteur de CR, l'onglet « Le fil », les messages, les trous. Aucun appel
encore : à ce stade, l'utilitaire **déplie et montre**, gratuitement. C'est déjà utile.

Le dossier « Mails » et son cadenas arrivent ici, avec leur migration et leur politique de
lecture : le premier fil déposé doit atterrir au bon endroit, pas dans Documents.

> Écrit dans `views/studio/dev/lecture-des-mails.js`, avec la coquille du lecteur de
> CR — mêmes classes, un seul calibrage à tenir.
>
> **Ce que la migration ne prouve pas, et il faut le dire.** Aujourd'hui un projet
> n'a qu'un propriétaire : personne d'autre ne lit quoi que ce soit, donc la
> restriction ajoutée ne change rien d'observable et **aucune épreuve ne peut la
> faire tomber** (règle 12). Elle est écrite quand même, et maintenant, parce que
> l'ordre inverse est celui qui coûte : le jour où le partage arrive, la
> correspondance serait lisible par l'équipe pendant tout l'intervalle. C'est
> écrit dans la migration elle-même, pour qu'on ne la prenne pas pour une garde
> éprouvée.
>
> Ce qui **est** éprouvé : le cadenas vient d'un seul endroit, lu par l'arbre et
> par le tableau ; le nom d'un mail rangé n'invente pas de date ; et l'écran se
> dessine dans chacun de ses états. Les trente ruptures essayées tombent.
>
> Ce qui reste : § 50 de [`a-traiter-plus-tard.md`](a-traiter-plus-tard.md).

### 5 — Le relevé par le modèle · *fait*

Une fonction serveur, la consigne **côté serveur uniquement**, le garde-fou des citations, le
prix à la requête. Les prises de position s'affichent avec ce qui leur manque.

> `supabase/functions/relever-un-fil/`, sa consigne dans
> `_shared/prises-du-modele.js`. Le garde-fou des citations est **celui qui
> existe déjà** (`_shared/citation-verifiee.js`) : une prise dont la phrase ne
> se retrouve pas dans son message ne franchit pas la porte.
>
> **Ce qu'on ne demande pas au modèle, parce qu'on le sait déjà** : qui parle et
> quand. L'auteur d'une prise est l'auteur du message d'où elle sort, lu dans
> les en-têtes du `.eml`. Le lui demander en ferait une seconde source, qui
> finirait par contredire la première (règle 4).
>
> **Ce qui monte** : le propos de chaque message, une fois, sans les citations
> qu'il recopie, sans les destinataires, sans les pièces jointes. C'est ce que
> les étapes 2 et 3 ont gagné — et c'est aussi ce qui évite de faire monter huit
> fois la même correspondance privée.
>
> Deux défauts trouvés en chemin, écrits dans la PR : le rang du message n'était
> pas traduit en « page » pour le garde-fou commun, si bien que **toutes** les
> prises ressortaient « rattachées ailleurs » ; et la garde qui empêche une
> consigne d'être servie au navigateur ne regardait qu'une liste de fonctions
> tenue à la main — deux consignes lui échappaient. Les trente ruptures
> essayées tombent.

### 6 — Ce qui se dérive, et que le modèle ne déclare pas · *fait*

Les questions sans réponse, les désaccords. Sur le fil déplié, en pur, vérifiable.

> Écrit dans `services/ce-quon-derive.js`. **Aucun second appel** : les deux se
> calculent sur ce que le relevé a rendu et sur le fil, et chaque ligne dit de
> quelles prises elle sort.
>
> **Une question sans réponse** : une demande qu'aucun message postérieur ne
> reprend — un constat, une décision ou un engagement sur la même chose. Une
> autre demande est une relance, pas une réponse ; une source fonde, elle ne
> tranche pas. La demande **change de nature** et quitte la rubrique des
> demandes : une seule ligne, dans la rubrique qui compte.
>
> **Ce qu'on n'a pas su juger se dit.** Une demande sans `porteSur` ne se dérive
> pas : elle sort en « on ne sait pas », qui n'est ni « répondue » ni « restée
> sans réponse » (règle 5).
>
> **Un désaccord**, et la limite est écrite franchement : on rapproche deux
> constats de deux auteurs sur le même sujet dont **l'un nie ce que l'autre
> affirme**, la polarité se lisant sur les marques de négation du français. Un
> désaccord sans négation — « le support est sec » contre « le support est
> humide » — **ne se voit pas**. Et ce qu'on rend n'est pas un verdict : deux
> constats qui *semblent* se contredire, avec les deux citations, pour que le
> lecteur tranche.
>
> Les trente et une ruptures essayées tombent. Ce qui reste : § 52 de
> [`a-traiter-plus-tard.md`](a-traiter-plus-tard.md).

### 7 — La confrontation et la proposition · *fait*

Le branchement sur la chaîne existante. Le label « Échange », l'identité du fil. Le point
porte « issu d'un échange privé ».

> Écrit dans `services/points-du-fil.js` — **un adaptateur, et rien d'autre**.
> Confronter, rédiger, appliquer : tout cela existe et sert au lecteur de
> comptes rendus. En écrire un second jeu ferait deux chaînes à tenir d'accord.
>
> **Cinq natures ouvrent un sujet** — demande, engagement, décision, question
> sans réponse, désaccord —, et deux n'en ouvrent pas : un **constat** va en
> mémoire, par un autre chemin ; une **source** fonde un constat. C'est ce que
> le tableau des sept natures dit déjà, nature par nature. Ce qui n'est pas
> porté **se compte**, et l'introduction de la proposition le dit : taire ce
> qu'on laisse serait promettre ce qu'on ne fait pas.
>
> Chaque point porte sa citation, son auteur, sa date — et **« issu d'un échange
> privé : la source n'est pas ouvrable par les autres »**.
>
> Les trente-deux ruptures essayées tombent. Ce qui reste : § 53 de
> [`a-traiter-plus-tard.md`](a-traiter-plus-tard.md).

### 7 bis — Ce qu'un fil réel a coûté, et ce qu'on en a tiré · *fait*

Le bouton « Emporter » de l'étape 7 a servi tout de suite : un fil de six messages entre un
bureau d'études et un bureau de contrôle est passé dans le procédé, et le résultat a été
relu ligne à ligne. Trois défauts en sont sortis, et cette étape-ci les répare.

**Le propos était bruité à 41 %.** Trente-sept pour cent du texte envoyé au modèle était des
adresses de redirection — 587 caractères en médiane pour une adresse qui en vaut soixante —,
le reste des identifiants d'images collées et un bandeau de sécurité recopié à chaque
message. Le prix ne s'est pas payé qu'en jetons : **les deux messages les plus bruités — 33 %
et 42 % de texte utile — sont les deux seuls dont le modèle n'a rien tiré**, alors qu'ils
portaient la position de départ et le désaccord. Le message le plus propre, 87 % utile, a
produit plus de la moitié du relevé. Le bruit ne coûte pas : il aveugle.

> Écrit dans `services/nettoyer-le-propos.js` — pur, gratuit, sans appel. Une
> redirection **se déplie** vers sa cible, à travers les deux couches qui
> s'empilent en vrai ; une image en ligne devient `(image)` **et se compte** ;
> un bandeau de passerelle s'en va ; une ligne qui n'est qu'un numéro de
> téléphone ou qu'une adresse de site n'énonce rien.
>
> **On ne coupe pas la signature**, et c'est le même arbitrage qu'à l'étape 2 :
> sous celle du fil réel se trouvait « je serai en congés du 27/07 au 06/09 »,
> qui est une contrainte de planning — exactement ce qu'on cherche. Deux lignes
> courtes coûtent moins cher qu'une phrase perdue.
>
> Le nettoyage vit **dans `unMailDeplie`, une fois** : l'écran et le modèle
> lisent le même texte, et il n'y a pas deux versions du propos qui finiraient
> par diverger (règle 4). Les images repliées font un trou, parce que dans un
> échange technique une formule vit souvent dans l'image (règle 5).

**Le modèle pouvait sauter un message sans que rien ne le dise.** Il rendait une liste plate
de prises ; un message absent de cette liste et un message dont il n'avait rien à tirer se
ressemblaient trait pour trait. Sur le fil réel, ce sont les deux messages disputés qui
avaient disparu ainsi.

> Le schéma demande désormais **une entrée par message**, et la consigne exige
> qu'aucun ne soit sauté. Une liste vide devient une **déclaration** ; une
> entrée absente se voit. Le serveur redescend les deux listes — les **muets**
> et les **oubliés** —, que l'écran et l'export disent du même mot. Quand la
> réponse n'a pas cette forme, on le dit plutôt que de compter zéro (règle 5).

**On ne savait pas ce qui avait été écarté, seulement combien.** Or le même nombre recouvre
deux défauts opposés : des inventions jetées — la porte a protégé — ou des phrases réelles
mal recopiées — la porte a jeté. L'un se répare en resserrant la porte, l'autre en la
desserrant.

> Une écartée redescend maintenant avec son **intitulé**, la **citation
> refusée**, le message visé et le motif en clair. L'export les liste ; l'écran
> y renvoie. Le motif est dit pour un fil et non pour un document : il n'y a pas
> de PDF à aller chercher.

**Ce qui se vérifie en cassant** : une redirection à deux couches qui ne se déplie qu'une
fois ; « Bien cordialement » emporté avec la signature ; un compte d'images qui s'arrête à un ;
un message oublié qui passe pour un message muet ; un groupe sans numéro lisible qui devient
« le message 0 » ; une écartée sans sa citation.

> **Un quatrième défaut est sorti du fil lui-même, après coup.** Le garde-fou
> des bandeaux finissait par `.*$`, et le point d'une expression régulière ne
> s'applique pas au retour chariot : sur un courriel réel, qui finit ses lignes
> par `\r\n`, il ne franchissait jamais le `\r` et ne retirait **pas un seul**
> bandeau. Toutes ses épreuves passaient — elles étaient écrites en `\n`. C'est
> le piège du jeu d'essai qui recopie les hypothèses du code, et il ne s'est vu
> que sur un vrai fil : six bandeaux comptés là où le compteur disait zéro. Les
> épreuves se font désormais **aussi en `\r\n`**.
>
> Les soixante et une ruptures essayées tombent. Deux d'entre elles ont nommé du code
> mort — une forme de redirection que la suivante couvrait déjà, un rognage des
> lignes vides fait deux fois —, retiré avec la raison écrite à sa place. Une
> troisième a montré qu'un groupe dont le numéro ne se lit pas ne doit pas faire
> **perdre** ses prises : la porte sait les rattacher au message où leur
> citation se trouve. Ce qui reste : § 54 de
> [`a-traiter-plus-tard.md`](a-traiter-plus-tard.md).

### 7 ter — Lire n'était pas trier · *fait*

Le même fil, repassé après l'étape 7 bis. Le nettoyage a tenu ses promesses : **47 prises
déclarées contre 7, pour 5 601 jetons contre 11 944**, et les deux messages qui n'avaient rien
donné parlent enfin. Mais l'écran est devenu illisible pour une autre raison — **96 « désaccords
possibles »**, dont aucun n'en était un. Le procédé savait lire ; il ne savait pas trier.

**Ce que la messagerie colle derrière chaque lien.** Outlook écrit sa version texte en posant
l'adresse **derrière** son texte : `le guide<https://…>`,
`o.ferrand@x<mailto:o.ferrand@x>`. Personne ne l'a tapée, elle double chaque lien — 41 sur ce
seul fil — et elle coûte plus cher que des caractères : un en-tête cité ne se découpe plus, et
**la même personne prend une identité par forme d'affichage**.

> Écrit dans `services/nettoyer-le-propos.js`. Ce qui la distingue d'un en-tête
> ordinaire est le **schéma** — `<o.ferrand@x>` n'en a pas —, et une épreuve
> l'a appris : on avait d'abord cru que c'était l'espace. L'espace protège
> autre chose, la convention d'un courriel en texte brut où l'on encadre une
> adresse pour la donner à lire.

**Deux personnes, quatre identités.** Le bandeau d'un message cité porte l'adresse aussi souvent
que le nom, et les garder dans la même chaîne faisait comparer des affichages. Sur ce fil,
l'un des deux correspondants s'est retrouvé **en désaccord avec lui-même**.

> `quiDuneCitation` découpe le bandeau ; `laCleDeLAuteur` prend **l'adresse**,
> minuscule, et le nom aplati à défaut. La clé ne monte jamais au modèle —
> l'adresse d'un correspondant n'a rien à faire dans un appel qui n'en a pas
> besoin — : elle se recolle au navigateur, depuis le fil. Après quoi six
> messages portent deux identités.

**Un désaccord n'est pas deux constats qui divergent : c'est quelqu'un qui conteste.** L'ancien
critère — même sujet, auteurs différents, polarités opposées — a rendu 96 paires, et pas une
n'était un désaccord. Resserrer n'a pas sauvé : exiger du vocabulaire commun a fait tomber le
compte de 96 à 16 **sans en rendre un seul vrai**. Un mécanisme dont la précision est nulle ne
se règle pas, il se remplace.

> Ce qu'on cherche désormais est une **marque de contestation** : une phrase
> qui vise le dire de l'autre et non l'ouvrage — « je ne partage pas votre
> position », « non conforme », « nous paraît disproportionné ». Sur le même
> fil : **4 prises sur 46**, et ce sont les quatre du litige.
>
> **Ce qu'on ne prétend pas savoir : quelle position exacte est contestée.** On
> a essayé de la désigner, et le candidat le plus proche était faux à chaque
> fois — ce que conteste le bureau d'études est un avis inscrit dans un
> rapport, qui n'est dans aucun message. On rend donc la contestation avec ses
> mots, **et les auteurs qui s'étaient exprimés avant elle sur le même sujet**,
> sans désigner lequel (règle 5). Une contestation change de nature au lieu de
> se dédoubler, et dit quelle marque l'a fait relever.
>
> Le prix est assumé : **un désaccord exprimé sans aucune de ces marques ne se
> voit pas**. Une rubrique fausse aux 96/96 coûte plus cher qu'une rubrique qui
> en manque.

**Une puce ne fait plus échouer une citation.** Trois des quatre écartées du fil étaient de
vraies phrases légèrement retapées : le modèle avait recollé deux lignes d'une énumération en
sautant le tiret du milieu. `aplati` efface désormais les puces, **comme il effaçait déjà les
accents** — des deux côtés, donc sans rien desserrer sur le fond : un mot sauté reste écarté,
et c'est ce qui doit arriver.

**Ce qui se vérifie en cassant** : une queue de lien qui emporte le texte qui la précède ; un
en-tête cité dont l'adresse reste collée au nom ; la casse d'une adresse qui fait deux
personnes ; une négation ordinaire qui redevient une contestation ; une contestation qui
s'attribue ce que son propre auteur a dit avant ; un tiret dans « au-delà » pris pour une puce.

> Les trente-neuf ruptures essayées tombent. Quatre ont d'abord été muettes, et
> chacune a nommé une faiblesse : un commentaire qui donnait la mauvaise raison
> d'un garde-fou, une fonction juste qui pouvait n'être appelée nulle part, un
> seuil qu'aucun cas n'éprouvait, et deux affichages de fixture trop voisins
> pour prouver ce qu'ils prétendaient. Ce qui reste : § 55 de
> [`a-traiter-plus-tard.md`](a-traiter-plus-tard.md).

### 8 — La boîte de réception du projet

La porte principale, et le morceau le plus lourd. Elle vient en dernier parce qu'elle se
branche sur tout ce qui précède : ce qui arrive par mail passe par le **même dépliage** que
ce qu'on glisse.

---

## L'adresse du projet : ce qu'elle ouvre, et ce qu'elle expose

Envoyer un fil à `projet@mdall.com` est le geste le plus simple qui soit — et une adresse
qui reçoit est une porte que le monde entier peut pousser. Quatre points à trancher avant
d'ouvrir quoi que ce soit.

### Une adresse devinable est une porte ouverte

`projet@mdall.com` est une adresse unique : elle ne dit pas **quel** projet. Il en faut une
par projet, et si elle se devine — `74-scionzier@mdall.com` — n'importe qui peut déposer
n'importe quoi dans la mémoire d'un chantier.

Elle doit donc porter un **secret** : `p-7f3a9c2e@mdall.com`, tiré au hasard, affiché dans
les paramètres du projet, **révocable** en un clic. Le jour où elle fuite, on en change, et
l'ancienne cesse de répondre.

### Le `From` d'un mail ne prouve rien

Il se falsifie en trois lignes. SPF, DKIM et DMARC donnent un degré de confiance sur le
domaine expéditeur, jamais une identité.

La règle sûre, et elle découle du dossier privé : **seul un mail dont l'expéditeur est
l'adresse d'un compte Mdall membre du projet entre**. Tout autre est écarté, et l'écart se
dit — on ne jette pas en silence (règle 5). Un fil transféré par quelqu'un d'autre n'entre
pas : il n'aurait de toute façon nulle part où aller, puisque le dossier est celui de
l'expéditeur.

### Il atterrit chez l'expéditeur, pas dans un dossier commun

C'est la conséquence directe du dossier privé. Deux personnes qui transfèrent le même fil
le déposent chacune chez elle. C'est un doublon, et c'est le prix de la confidentialité —
le dire vaut mieux que de le découvrir.

### Ce qu'une boîte reçoit et qu'on n'a pas demandé

Du volume, des pièces jointes de vingt mégaoctets, des réponses automatiques, du spam. Il
faut un plafond par mail et par jour, un refus net au-delà, et une trace de ce qui a été
refusé. Une boîte sans plafond est une facture de stockage qu'on découvre à la fin du mois.

---

## Ce que ce plan refuse

**De lire les pièces jointes.** Un mail en porte, et souvent le vrai contenu y est. Elles sont
**nommées** dans le fil et rien de plus : les lire, c'est un autre procédé — et pour un PDF,
c'est le lecteur de CR, qui existe. Les enchaîner viendra après, et pas dans le même tour.

**De deviner un fil sans en avoir les pièces.** Si l'on dépose le dernier message d'une
discussion, on a son texte et les citations qu'il porte : c'est un fil **reconstitué à partir
de citations**, pas le fil lui-même. Les dates y sont celles que les bandeaux affichent, les
destinataires sont perdus. L'écran le dira — c'est moins sûr, ce n'est pas faux, et la
différence se voit.

**De mesurer une fidélité.** Il n'y a rien à mesurer : on n'a rien réécrit. Afficher « 100 %
du message retrouvé » serait une tautologie présentée comme un résultat.

**De faire entrer quoi que ce soit sans signature.** Comme partout.

---

## Ce qui est tranché

| Question | Réponse |
|---|---|
| Le format déposé | **`.eml`** d'abord — il se déplie gratuitement. `.msg` (Outlook) peut-être plus tard : format binaire propriétaire, il demanderait une bibliothèque de lecture. |
| La porte principale | **L'adresse du projet**, à quoi l'on transfère un fil depuis sa messagerie. Elle vient après, parce qu'elle se branche sur le dépliage écrit par la première porte. |
| Un mail, ou tout le fil | **Les deux**, et l'écran dit lequel — donc quel degré de certitude on a sur les dates et les destinataires. |
| Ce qu'on relève | **Les sept natures** du tableau ci-dessus, dont deux se dérivent du fil au lieu d'être demandées au modèle. |
| Où va le mail | Un dossier **« Mails »** à la racine de Fichiers, **non partagé**, avec un cadenas. Provisoire, et à rediscuter. |

## Ce qui reste à trancher

**La vérifiabilité d'un point issu d'un mail.** Le dossier privé rend la correspondance
invisible à l'équipe, donc la citation d'un point ne pointe vers rien qu'un collaborateur
puisse ouvrir. Le point le dit — « issu d'un échange privé » — mais un constat qu'on ne peut
pas vérifier est plus fragile qu'un constat qu'on peut ouvrir.

Trois issues possibles le jour où l'on en débattra : le laisser ainsi et l'assumer ; joindre
à la proposition **le seul message cité**, et non le fil ; ou permettre de rendre un fil
partagé après coup, quand on a vérifié qu'il ne contient rien de privé.

**Qui a le droit d'écrire à l'adresse du projet**, et ce qu'on fait des mails d'un
expéditeur inconnu. Voir la section ci-dessus.

---

## Où c'est écrit, quand ce sera écrit

| Ce que c'est | Où |
|---|---|
| Décoder ce qu'un mail transporte | `services/decoder-un-mail.js` — pur · *écrit* |
| Déplier un `.eml` | `services/un-mail-deplie.js` — pur · *écrit* |
| Retirer ce que l'auteur n'a pas écrit | `services/nettoyer-le-propos.js` — pur · *écrit* |
| Ce qu'on n'a pas su placer, et sa phrase | `services/trous-dun-mail.js` — pur · *écrit* |
| Séparer le propos de la citation | `services/ce-quon-cite.js` — pur · *écrit* |
| Reconstituer le fil | `services/le-fil-des-mails.js` — pur · *écrit* |
| Le relevé par le modèle | `supabase/functions/relever-un-fil/` — la consigne y vit seule · *écrit* |
| Ce qu'un fil porte | `services/prises-de-position.js` — pur · *écrit* |
| Ce qui se dérive du fil | `services/ce-quon-derive.js` — pur · *écrit* |
| Demander le relevé | `services/prises-par-le-modele.js` · *écrit* |
| L'écran | `views/studio/dev/lecture-des-mails.js` · *écrit* |
| Où va un mail, et le cadenas | `services/le-dossier-des-mails.js` — pur · *écrit* |
| Le dépôt dans le dossier privé | `services/deposer-un-mail-supabase.js` · *écrit* |
| Le dossier privé | `202610160001_le_dossier_des_mails_est_prive.sql` — `project_document_folders.prive`, `documents.deposant`, et les deux politiques · *écrit* |
| La boîte du projet | une fonction serveur qui reçoit, vérifie l'expéditeur, et dépose — à écrire en dernier |
