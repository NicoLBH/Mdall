# La console de l'administrateur — ébauche

**À quoi sert cette page :** décider ce qu'il faut pour **exploiter** Mdall
quand des gens s'en serviront, et ce qu'il ne faut surtout pas. Elle s'enrichit
au fil des réflexions ; elle n'est pas un plan figé.

Elle a été écrite en vérifiant le code, pas de mémoire. Ce qui existe est nommé
comme tel ; tout le reste est à faire.

> **Le principe qui gouverne cette page :** une console d'administration est
> l'endroit précis où l'on viole la promesse du produit, parce qu'y « tout voir
> pour aider » est la chose la plus naturelle à construire. Elle doit donc être
> **petite, côté serveur, et incapable de lire un contenu.**

---

## 1. Ce qui existe déjà

| ce qui existe | où | ce que ça donne |
|---|---|---|
| le coût de chaque appel de modèle — projet, personne, modèle, jetons, instant, **jamais le contenu** | table `ai_usages` | la dépense réelle |
| les tarifs publics, la conversion en euros, le total par jour / projet / personne | `services/consommation-ia.js` | une **estimation**, et l'écran le dit |
| deux écrans qui les assemblent | *Profil › Factures et abonnement*, *Projet › Indicateurs* | ce qu'une personne coûte, ce qu'un projet coûte |
| l'activité d'un projet, 52 semaines, comptée côté base | `activite_des_projets()` | « ce chantier vit-il ? » |
| les exécutions d'utilitaires | table `project_runs` | ce que l'Atelier a tourné |
| l'effacement d'un compte | fonction de bord `delete-account` | le droit à l'effacement, déjà outillé |

| le journal des pannes — fonction, genre, code, instant, **jamais le message** | table `refus_des_fonctions`, `services/journal-des-refus.js` | ce qui n'a pas abouti |

| la porte de la console — une adresse, et rien d'autre | table `administrateurs`, `services/la-porte-de-la-console.js` | « suis-je administrateur ? », et jamais « qui l'est ? » |
| le site de la console, construit à part | `apps/console`, `scripts/prepare-console.mjs`, `npm run build:console` | un autre bâtiment, servi sous `console/` |
| le retour au compte utilisateur | `apps/console/js/lavatar.js` | l'avatar, son menu, et « Profil utilisateur » — la sortie de cette page |

**Ce qui a quitté la console**, et qui vit maintenant dans l'application, par
projet (§ 7) :

| ce qui existait ici | où c'est maintenant |
| --- | --- |
| le versoir, le convoi | le **dépouillement**, dans *Fichiers* : `services/le-depouillement.js`, `views/ui/le-depouillement-ecran.js` |
| l'archive, son casier `archives` et ses trois tables | le **dossier privé des mails** du projet : `Mails/` et `Mails/Pièces jointes/` |
| l'épisode | la **chronologie de la correspondance**, aux *Indicateurs* : `views/ui/episode-de-la-correspondance.js` |

**Ce qui n'existe pas du tout :** aucune table `organisations`, `comptes`,
`plans` ni `abonnements`. **Aucun rôle** : il y a une porte, pas un rôle — voir
plus bas pourquoi la nuance décide.

> **Le journal des pannes existe depuis peu**, et c'est le premier des quatre
> indispensables de la section 5. Il est écrit **par le navigateur**, ce qui est
> l'inverse du compteur de consommation : les pannes les plus graves — le
> portail en panne, le réseau coupé — n'atteignent jamais une fonction de bord,
> et son silence ressemble alors à celui d'une journée sans incident.
>
> Ce que cela pourrait ouvrir est fermé par un **domaine fermé de huit genres**,
> vérifié par la base elle-même : aucun texte libre n'entre dans ce journal, donc
> rien du contenu d'un projet ne peut en sortir. Il reste à l'étendre aux
> fonctions que le premier lot n'a pas couvertes.

## 2. Où vivent ces écrans, et comment on y entre

### Le même dépôt, un déploiement séparé

**Le même dépôt.** Une console dans un second dépôt recopierait le vocabulaire,
les migrations et la doctrine — et les deux se mettraient à diverger au premier
renommage (règle 10). Une mémoire dont l'outil d'exploitation ne parle plus la
même langue est pire qu'une mémoire sans outil.

**Un déploiement séparé.** `apps/web` est servi à tout le monde : un écran
d'administration qui vivrait dans ce paquet enverrait **à chaque navigateur** le
nom de ses requêtes, de ses tables et de ses indicateurs. Un contrôle
`role === "admin"` en JavaScript n'est pas une serrure, c'est une suggestion :
il se contourne en modifiant une variable dans la console du navigateur.

Donc : `apps/console`, son propre `build`, son propre hôte, non référencé, et de
préférence **pas joignable publiquement** (liste d'adresses autorisées, ou accès
par le réseau privé). C'est aussi l'application directe du fondamental déjà posé
pour l'orchestration : *ce qui ne doit pas se voir ne descend pas dans le
navigateur.*

**La console ne porte aucune logique.** Tout ce qu'elle montre vient de
**fonctions de bord** qui s'exécutent avec la clé de service. La console est un
afficheur : même si son paquet fuitait, il ne révélerait que des noms de
colonnes. Le jugement — qui a le droit, sur quoi, jusqu'où — vit **entièrement**
côté serveur.

### Ce qui est construit à ce jour, et comment on y entre

**Le site.** `apps/console` : son propre `index.html`, son propre point d'entrée,
son propre build (`npm run build:console`). Il **emporte** depuis `apps/web` la
feuille de style et les quelques services dont il se sert — dix modules,
listés dans `partage/ce-qui-est-emporte.txt` à chaque build. Il ne les recopie
pas : une copie reste vraie un temps, puis diverge (règle 4). Rien de la console
n'est servi dans la page des utilisateurs, et rien de l'orchestration du
copilote n'entre dans la console — une épreuve le vérifie sur le parcours réel
des imports (`scripts/prepare-console.test.mjs`).

**L'adresse.** Le déploiement copie `apps/console` dans `console/`, à côté de
l'application. Donc : `…/console/`.

**L'entrée.** Depuis l'icône d'avatar, en haut à droite, **après « Réglages »** —
et seulement pour qui ouvre la porte. Elle n'est pas dessinée pour les autres :
non pas masquée, **absente du HTML**. C'est ce qui évite d'apprendre à tout le
monde qu'une console existe.

### Le lecteur de PDF n'a pas été réécrit

La console ouvre les PDF de l'archive avec `services/ct-lab-pdf-view.js` —
celui de l'onglet Documents et du copilote. Il ne dépend de rien (aucun
`import`), il charge pdf.js depuis le dossier vendu, et il dessine dans les
classes `documents-pdf-viewer__*` que la feuille de style porte déjà. Il est
donc **emporté tel quel**, avec pdf.js.

C'est la règle générale de cette console, et elle vaut d'être dite : *rien n'y
est réécrit pour elle*. Un second lecteur aurait divergé du premier au premier
correctif (règle 4), et il aurait fallu recalibrer toutes ses classes.

### La porte, et ce qu'elle n'est pas

Cette page prévoyait « une table que le navigateur ne lit jamais ». Ce qui est
construit est **un cran différent, et il faut le dire** : le navigateur lit la
table `administrateurs`, mais sa politique de lecture ne rend **que la ligne de
celui qui demande**. La question posable est « suis-je administrateur ? » ; la
question « qui sont-ils ? » n'a pas de réponse, pour personne — pas même pour un
administrateur.

Pourquoi ce choix plutôt qu'une fonction de bord : parce qu'une fonction de bord
qui répondrait « oui/non » aurait exactement la même surface de fuite (elle dit
oui à qui est dedans), en ajoutant un déploiement, un secret et un point de
panne. Ce qui protège ici, ce n'est pas l'endroit du jugement, c'est la **forme
de la table** : elle n'a pas de colonne par laquelle un annuaire pourrait sortir,
et sa politique n'a pas de clause qui rendrait la ligne d'un autre.

Deux points que cela ne règle pas, et qui restent au § 5 :

- **la porte ne garde rien.** Être servi n'est pas être autorisé. Ce qui protège
  les données, ce sont les politiques des tables de projet — la console ne
  connaît aucune d'elles, et n'en atteint aucune. Un test JavaScript
  « d'autorisation » se contourne en ouvrant les outils de développement ; on ne
  s'y fie donc pas, et la vérification ne sert qu'à **dire pourquoi l'écran est
  vide** ;
- **aucune écriture depuis l'application.** La table n'a ni politique
  d'insertion, ni de modification, ni de suppression : la porte s'ouvre dans la
  console Supabase, par quelqu'un qui tient déjà les clés. Une table de droits
  que son titulaire peut étendre ne protège rien.

Et deux choses prévues ici qui **ne sont pas faites** : la **deuxième preuve
récente** (`aal2`) et le **journal des accès administrateurs**. La seconde est
irrattrapable — elle reste au § 5, et elle doit précéder le premier vrai écran
d'exploitation. La console n'en a plus aucun : elle ne lit, aujourd'hui, que sa
propre porte.

### `admin@mdall` : non, et pour trois raisons

**Un compte partagé n'a pas d'auteur.** Toute la doctrine de Mdall tient dans
« qui a décidé cela, et quand ». Un compte partagé entre deux personnes rend
chaque geste d'administration inattribuable — c'est exactement le défaut qu'on
reproche à une valeur sans son auteur.

**Un compte partagé ne se révoque pas.** Quelqu'un s'en va ; on change le mot de
passe et on le redonne aux autres. Autrement dit : personne n'a jamais vraiment
perdu l'accès.

**La loi l'interdit en pratique.** Le RGPD exige que tout accès à des données
personnelles soit **attribuable** et **journalisé** (art. 5.2, art. 32). Un
compte partagé rend le journal des accès sans valeur — et c'est précisément le
document qu'un client, ou son délégué à la protection des données, demandera.

### Ce qu'on fait à la place

1. **Les mêmes comptes que tout le monde.** Une personne, une identité, un nom.
2. **Une table d'administrateurs qui ne rend que sa propre ligne** — donc
   aucune liste, pour personne. Être dedans n'est jamais un drapeau dans une
   session : c'est une question reposée à la base, dont la réponse par défaut
   est « non » (une lecture qui échoue **ferme** la porte).
3. **Une deuxième preuve, récente.** Un geste d'administration exige un second
   facteur (Supabase sait le faire : `aal2` dans le jeton). Lire des
   indicateurs sur cent projets n'est pas un geste ordinaire.
4. **Un journal des accès administrateurs** : qui, quelle page, quand, quel
   filtre. **Irrattrapable si on ne l'écrit pas dès le premier jour**, exactement
   comme les écartés et comme les refus. C'est aussi ce qui rend la console
   défendable devant un client.
5. **Jamais de « se connecter en tant que ».** C'est la seule fonctionnalité qui
   permettrait de lire une conversation privée avec le copilote. Si le support
   en a besoin un jour, il faudra un consentement explicite, borné dans le temps
   et journalisé — et il est moins cher de ne pas la construire.

### Ce que l'archive des pièces ne mélange pas

Le casier `archives` et son registre sont réservés aux administrateurs, par la
fonction `est_administrateur()` — la même porte, sous une forme qu'une politique
peut appeler. Elle est `security definer` et ne rend qu'un **booléen sur
l'appelant** : elle ne peut donc pas servir à obtenir la liste, qui reste hors
de portée de tout le monde.

**Ce casier n'est pas la mémoire d'un chantier.** Ce qu'il porte vient
d'archives que l'administrateur ouvre lui-même pour nourrir la prédiction, à
côté de l'interface des utilisateurs (`docs/nourrir-mdall.md`). Aucune politique
de projet ne le connaît, et il ne connaît aucun projet. La section suivante —
ce que la console ne lit jamais — n'en est pas entamée d'un pouce.

Cela vaut aussi de l'**archive de fondement**, qui garde désormais les messages
eux-mêmes : leur fichier d'origine, leur propos, et le lien vers les pièces
qu'ils portaient. C'est la matière la plus sensible que Mdall conserve, et elle
mérite qu'on redise ce qui la tient :

- **réservée aux administrateurs**, par `est_administrateur()` — un booléen sur
  l'appelant, jamais une liste ;
- **aucune politique de modification ni de suppression**, sur aucune des
  tables ;
- **les adresses des destinataires ne sont pas dans la table** : seulement leur
  nombre. Rien ne sait s'en servir aujourd'hui, et une colonne qu'aucun code ne
  lit finit par fuir sans avoir jamais servi. Le fichier d'origine les porte
  toujours, pour le jour où une raison précise de les lire apparaîtra ;
- **elle ne touche à aucun projet.** Les conversations avec le copilote, les
  messages des sujets et la mémoire des chantiers lui sont étrangers, dans les
  deux sens.

La durée de conservation et la réponse à une demande d'effacement restent à
décider (§ 6), et c'est maintenant qu'elles pèsent.

## 3. Ce que la console ne lit jamais

> **La forme et les comptes traversent ; le contenu reste.**

C'est la même règle que le fonds commun de la prédiction
(`docs/la-memoire-qui-predit.md`, § 6), et pour la même raison : une
anonymisation **par nettoyage** fuit toujours, sur du texte libre, et il suffit
d'une fois.

La console ne lit **jamais** :

- `copilot_conversations`, `copilot_messages` — la promesse absolue du produit :
  *interdiction totale de les partager avec les collaborateurs du projet*. Un
  administrateur n'est pas une exception, c'est le cas le plus dangereux ;
- `subject_messages` et leurs pièces jointes — les échanges entre collaborateurs ;
- le contenu des `documents`, les transcriptions, les pièces ;
- `project_assertions.statement`, `.detail`, `.payload` — le contenu de la mémoire ;
- le dossier des mails, privé par construction.

Elle lit des **comptes**, des **dates** et des **formes**. Et cela se vérifie par
une épreuve qui lit la source de la fonction de bord et **refuse ces noms de
tables**. C'est le cas précis où une épreuve sur le texte du code vaut quelque
chose : un défaut invisible, qu'aucun résultat ne trahit.

## 4. Les nécessaires — le champ complet

Ce qu'on voudra, une fois que ça tourne, et **la prédiction en service**. C'est
la carte ; la section 5 y découpe le minimum.

### A. Qui est là, et qui revient

- la liste des comptes : date d'entrée, dernière trace, projets ;
- **la cohorte de retour** : *sur les dix inscrits de la semaine 3, combien ont
  versé quelque chose en semaine 4 ?*

> **Le « taux de rebond » n'est pas la bonne mesure**, et il faut le dire : c'est
> une métrique de site web. Mdall s'ouvre un mardi pour répondre à une question,
> et se referme. Quelqu'un qui reste douze secondes et repart avec sa réponse a
> eu une excellente séance.

- **le délai jusqu'au premier versement signé.** Le seul chiffre qui dise si le
  produit marche : toute la thèse de Mdall est la règle 1. Quelqu'un qui n'a
  jamais signé de proposition n'a pas utilisé Mdall, quel que soit son nombre de
  clics.

### B. Ce que la mémoire devient

Pas des compteurs de vanité — *nombre de sujets, de situations, de constats* — :
ils montent quoi qu'il arrive et n'orientent rien. Ce qui oriente :

- **signé / ouvert** : la mémoire se remplit-elle, ou seule la liste de tâches
  s'allonge-t-elle ?
- **la part des décisions muettes**, et **combien Mdall en a constaté** — ce que
  la note du projet dit déjà (`docs/ce-quon-a-ecarte.md`) ;
- **les noms qu'une fonction lit et que personne n'a versés** : les trous, déjà
  comptés par `nomsQueRienNePorte`.

### C. La prédiction, en service

La page est le **carnet de bord du moteur**, et sa mesure est déjà définie
(`docs/la-memoire-qui-predit.md`, § 7) :

- **précision@3** sur le sujet suivant, **contre la ligne de base**. Un moteur
  qui ne bat pas « le sujet le plus fréquent » n'a rien appris ;
- **le délai d'avance** sur un constat, en jours ;
- **le taux de fausse alerte** — le vrai coût, et celui qu'on cache partout ;
- **sur combien de projets comparables** chaque prédiction repose ;
- **la part des ouvertures suggérées** dans les ouvertures totales : c'est le
  garde-fou contre la boucle de complaisance, et il ne se pose pas après coup.

### D. Ce que ça coûte, et ce que ça rapporte

- le total de consommation tous comptes confondus, et les dix premiers ;
- la marge par compte : consommation contre abonnement ;
- les jetons dont le fournisseur n'a pas rendu le décompte — `ai_usages` les
  garde à `null`, et un total honnête sait dire « trois appels n'ont pas rendu
  leur compte » plutôt que de mentir d'un chiffre rond.

### E. Quand ça casse

- le journal des refus des fonctions de bord : fonction, motif, projet, instant,
  **jamais la charge utile** ;
- les refus par fournisseur : Supabase indisponible, modèle en surcharge, clé
  expirée, quota atteint ;
- la durée des appels, et sa dérive.

### F. Les comptes et la facturation

- l'organisation, ses membres, son plan, ses factures ;
- l'entrée et la sortie d'un membre ;
- la suspension, la reprise, la clôture.

**Et c'est la partie qu'il ne faut pas construire maintenant** : il n'existe ni
organisation, ni plan, ni abonnement, et **l'unité de facturation n'est pas
décidée** (au projet ? au siège ? à la proposition signée ?). La construire
avant de savoir ce qu'on facture est l'erreur classique. A, B et D donnent la
réponse ; la facturation la suit.

## 5. Les indispensables — le minimum pour commencer

Quatre, et le critère de sélection est simple : **ce qui est irrattrapable si on
ne le fait pas maintenant.**

**1. Le journal des refus — *fait*.** `refus_des_fonctions`, le domaine fermé
des huit genres, et les six appels au modèle qui le nourrissent. C'est de
l'information qui **disparaît chaque jour où on ne l'écrit pas**.

Deux choses restent : **l'étendre** aux autres fonctions (l'Établi, le copilote,
les dépôts de pièces), et **décider sa durée de conservation** — un journal
utile six mois devient un passif ensuite (§ 6).

**2. La date d'entrée et la dernière trace de chaque compte.** Sans elles,
aucune cohorte ne se reconstitue — on ne saura jamais qui est parti la première
semaine, ni quand.

**3. Le journal des accès administrateurs.** Avant le premier accès
administrateur, pas après. Un journal qui commence en mars ne dit rien de
février, et c'est en février qu'on aura regardé.

La console existe désormais, et **elle ne lit rien** de la base sinon sa propre
porte : les écrans qui lisaient sont partis dans l'application (§ 7). Cela ne
rend pas ce journal moins urgent, cela dit seulement dans quel ordre : le journal
doit **précéder le premier écran qui lit un compte**, et non l'ouverture du site.

**4. Un identifiant de compte distinct de l'identifiant de personne.** Aujourd'hui
un projet a des collaborateurs, et rien ne dit **qui paie**. L'ajouter plus tard
est une migration qui touche **toutes** les politiques de sécurité ; l'ajouter
maintenant est une colonne nullable.

Puis, dans la foulée : **une page unique** — cohorte · délai jusqu'au premier
versement signé · coût agrégé · refus des dernières 24 h. Une page. Dix pages
qui montent toujours sont dix pages qu'on cesse de regarder, et c'est
exactement le défaut qu'on vient de corriger sur « 380 constats ».

## 6. Ce qu'il faut décider et écrire — la conformité

> *« Mdall se doit d'être exemplaire dans le respect des lois. »*

Ce qui suit n'est pas un avis juridique : c'est la **liste des décisions à
prendre et à écrire**, à faire relire par un conseil avant le premier client
payant.

**La minimisation, par construction.** La console lit des comptes et des formes.
Ce n'est pas une politique affichée, c'est ce que la fonction de bord
sélectionne — et une épreuve le vérifie (§ 3).

**La finalité, écrite.** « Exploiter le service » : la dire, la borner, et ne pas
s'en servir pour autre chose. Un indicateur ajouté « parce qu'on peut » sort de
la finalité déclarée.

**Le registre des traitements et le contrat de sous-traitance.** Mdall est
sous-traitant de ses clients pour les données de leurs chantiers. Il faut le
registre, le contrat type, et la **liste des sous-traitants ultérieurs** — dont
le fournisseur de modèle. Le fait qu'**aucun contenu de conversation ne
traverse** est déjà l'architecture ; il faut l'écrire.

**L'hébergement.** Vérifié, et écrit : voir § 6 bis. Reste à écrire où passent
les **appels de modèle** — ce n'est pas la même question, et la réponse n'est
pas la même région.

**Les durées de conservation.** Décidées au § 6 ter. Le journal des refus et le
journal des accès sont utiles quelques mois et deviennent un passif ensuite. Une
durée décidée, et **appliquée par une tâche**, pas par une intention (règle 12).

**L'effacement.** `delete-account` existe. Il faut décider ce qu'il advient des
indicateurs : un agrégat portant sur assez de personnes n'est plus une donnée
personnelle, mais il faut **un plancher**, écrit et appliqué — on n'affiche pas
une cohorte de deux personnes.

**Les cent historiques de projet.** Ils contiennent des noms, des adresses, des
avis de personnes réelles, et ils appartiennent à d'anciens clients. Au-delà du
RGPD, il y a une **confidentialité contractuelle**. Voir `docs/nourrir-mdall.md`
et le § 6 ter, où la question de leur durée est tranchée.

## 6 bis. La région : rester en Irlande

### Ce qui est, vérifié et non supposé

Le projet Supabase de Mdall est hébergé en **`eu-west-1`, Irlande**. Ce n'est
pas une supposition : `db.<projet>.supabase.co` résout vers `2a05:d018:…`, que
les plages publiées par AWS rattachent à `eu-west-1`.

La donnée est donc **déjà dans l'Union européenne**. La question n'est pas
« l'Europe ou non », elle est tranchée ; elle est « l'Irlande suffit-elle, ou
Paris vaut-il une migration ? ».

### Trois raisons de ne pas bouger

**1. Le droit ne fait pas la différence.** L'Irlande est dans l'EEE : le RGPD
s'y applique entièrement, et aucun mécanisme de transfert n'est requis. Paris
n'apporte rien de plus sur ce terrain.

**2. Paris n'achèterait pas la souveraineté, et c'est le point qu'on croit
souvent.** Supabase tourne sur AWS. Un fournisseur soumis au CLOUD Act ne peut
pas obtenir la qualification **SecNumCloud** de l'ANSSI — cela exclut AWS, Azure
et Google Cloud en l'état. Une région parisienne *chez AWS* reste du cloud
américain hébergé en France : elle gagne des millisecondes, pas de
l'indépendance juridique.

**3. Le changement est irréversible en place.** Supabase ne déplace pas un
projet : il faut en créer un neuf dans la région visée, migrer la base, **les
objets du casier**, les comptes d'authentification, redéployer les fonctions de
bord, et changer l'URL et la clé publique partout. C'est un risque réel pour un
gain nul — et il grossit à chaque gigaoctet d'archive versé.

> **Décision : on reste en `eu-west-1`, et on l'écrit.** Ce qui manquait n'était
> pas la bonne région, c'était de savoir laquelle on avait.

### Le seul événement qui rouvrirait la question

Un client qui **exige contractuellement** un hébergement souverain — une
collectivité, un marché public, un ouvrage sensible. Et ce jour-là, la réponse
ne serait pas « Paris » : ce serait **quitter AWS**, c'est-à-dire un Supabase
auto-hébergé chez un fournisseur qualifié (OVHcloud, Outscale…). C'est une autre
décision, d'un autre ordre de grandeur, et elle ne se prend que contre une
exigence signée — jamais par précaution.

### Ce qu'il faut dire, et ne pas taire

Supabase est une société américaine. Même hébergée en Irlande, la donnée reste
exposée au CLOUD Act **par le fournisseur**. C'est un risque accepté par la
quasi-totalité du logiciel en ligne, et il faut savoir le dire à un client qui
pose la question — plutôt que de laisser croire qu'« hébergé en Europe » règle
tout.

## 6 ter. La conservation : deux corpus, deux horloges

> *« Pour moi, jusqu'à nouvel ordre. »*

C'est tenable — à condition de ne pas traiter comme un seul objet deux choses
qui n'ont ni la même valeur ni le même risque.

### Ce qui se garde sans réserve : le fonds commun

Les formes anonymes — *entrées → conclusions*, un domaine, aucune colonne qui
puisse dire d'où elles viennent (`reasoning_forms`). **Il n'y a pas de donnée
personnelle à conserver**, donc pas de durée à justifier. L'anonymat y est une
propriété de la forme de la table, pas une promesse.

Et c'est **ce corpus-là qui nourrit la prédiction**. « Jusqu'à nouvel ordre »
s'y applique sans la moindre réserve.

### Ce qui demande une raison : l'archive source

Les messages et leurs pièces, avec des noms, des adresses et des propos. C'est
là qu'est l'exposition — et elle ne vient pas de vos données : elle vient de
**tiers qui n'ont jamais rien demandé à Mdall** (architectes, bureaux de
contrôle, maîtres d'ouvrage).

**Le plancher défendable : dix ans après le dernier message d'un chantier.** Ce
n'est pas un chiffre choisi : c'est la durée de la **responsabilité décennale**
(Code civil, art. 1792-4-1), pour laquelle un professionnel du bâtiment garde
ses dossiers. Une durée qu'on peut nommer et rattacher à une obligation est une
durée qui se défend.

Au-delà, la finalité change : ce n'est plus « garder la preuve », c'est
« constituer un corpus ». Or ce corpus-là, c'est le fonds commun qui le porte —
et il ne contient plus rien de personnel.

> **Décision : pas de suppression automatique, et pas de promesse d'éternité
> non plus.** Ce qui rend « jusqu'à nouvel ordre » défendable n'est pas la
> durée : c'est de pouvoir dire **pourquoi** on garde encore, et d'avoir
> regardé récemment.

### Les quatre choses à construire pour que ce soit vrai

**1. Un journal des retraits.** Aujourd'hui l'archive n'a **aucune voie de
suppression** — ni sur le casier, ni sur les tables. C'était un choix pour ne
rien perdre par accident ; c'est aussi l'impossibilité d'honorer une demande
d'effacement. Un retrait est un fait comme un autre : il s'écrit — l'empreinte,
la date, un motif pris dans un domaine fermé — et ce qui a eu lieu reste dit
(règle 6).

**2. Une date de dernier réexamen, par corpus.** C'est elle qui transforme
« indéfiniment » d'un passif en une décision datée. Sans elle, « jusqu'à nouvel
ordre » se lit comme « on n'y a jamais repensé ».

**3. Un écran « ce qui dort ».** Ce qui a dépassé sa date de réexamen, listé —
**jamais supprimé tout seul**. On ne détruit pas une archive par une tâche
planifiée ; on la met sous les yeux de quelqu'un.

**4. Une fiche de registre (art. 30).** C'est le premier document que réclamera
le délégué à la protection des données d'un client. L'écrire coûte une heure
maintenant, et beaucoup plus le jour où on la demande.

### Le point qu'un conseil doit trancher, et vite

Garder les messages de tiers suppose une **base légale** : l'intérêt légitime
(art. 6-1-f) avec sa mise en balance écrite, et l'obligation d'information de
l'**art. 14** — celle qui vaut quand la donnée n'a pas été collectée auprès de
la personne —, dont l'exception d'effort disproportionné (art. 14-5-b) est
précisément ce qu'il faut faire confirmer.

C'est le seul point de ce document qui ne se règle ni par l'architecture ni par
une décision interne. Il est **peu coûteux à faire valider maintenant**, et très
coûteux à découvrir après le premier client payant.

## 7. Ce que cette console ne sera jamais

**Un endroit d'où l'on modifie la mémoire d'un projet.** Règle 1 : rien n'entre
sans une proposition signée, et un administrateur n'est pas une exception. Une
console qui corrigerait une valeur « pour dépanner » détruirait la seule chose
que Mdall vend.

**Un endroit d'où l'on lit un contenu.** Voir § 3.

> **Et cette règle a été enfreinte.** Le versoir, l'archive et l'épisode lisent
> des propos, ouvrent des PDF et affichent des extraits de correspondance. Ils
> n'auraient jamais dû être ici : le dépôt de mails, leur rangement dans un
> dossier privé et leur lecture existaient **déjà côté application**, par projet
> (`rangerLesMails`, le dossier « Mails », *Fichiers*). Ce qui manquait était
> l'entrée en masse des `.msg`, et elle appartient à l'application.
>
> La décision et son inventaire : `docs/nourrir-mdall.md`, § 8 quater. Ce qui
> revient à la console : les comptes d'exploitation, et rien d'autre.
>
> **C'est fait.** Les trois écrans sont partis, leurs trois tables et leur casier
> avec (`202610230001_larchive_quitte_la_console.sql`). Le dépouillement est dans
> *Fichiers*, la chronologie aux *Indicateurs*.
>
> La mesure de ce qu'était devenue cette page tient en un chiffre : ce qu'elle
> emportait de l'application est passé de **quarante modules à cinq**. Elle
> portait le lecteur de `.msg`, celui des `.zip`, le convoi, l'inventaire, la
> chronologie, la ligne de base, la mesure du passé, le lecteur de PDF et pdf.js
> — la moitié des services de Mdall, dans une page dont tout l'intérêt est de ne
> rien pouvoir atteindre.
>
> Personne ne l'avait décidé : chaque ligne s'était ajoutée pour une bonne
> raison. C'est exactement ce que la liste de `prepare-console.mjs` devait rendre
> visible, et elle l'a rendu visible — un tour trop tard.

## 7 bis. Ce qu'elle garde, et comment on en sort

Il reste **la porte** et **la barre du haut**. La page dit qu'elle n'a encore
rien à montrer, et **où les écrans sont partis** : quelqu'un qui a gardé
l'adresse en favori doit lire une explication, pas une page blanche.

La barre porte l'avatar, son menu, et un seul item : **« Profil utilisateur »**,
qui ramène à Mdall. On y entrait par le menu de l'avatar de l'application, et on
n'en sortait que par le bouton « page précédente » du navigateur — c'est-à-dire
par un geste qui ne fait pas partie du produit.

> **Les classes, pas le module.** `global-header.js` dessine le même menu, et il
> aurait été tentant de l'emporter : il traîne le magasin, les routes, le carnet
> et les raccourcis. On reprend `gh-header`, `gh-user-menu__*`, `svgIcon` et
> l'avatar par défaut — le rendu est le même, la dépendance ne l'est pas. C'est
> la même décision que pour la feuille de style.

**Ni « Projets », ni « Réglages », ni la déconnexion.** La console n'est pas un
endroit d'où l'on pilote son compte ; c'est un endroit d'où l'on regarde des
comptes, et dont on sort.

**Un tableau de bord commercial.** Des chiffres qui montent toujours ne décident
rien. Chaque ligne de cette console doit pouvoir répondre à : *qu'est-ce que je
fais différemment si ce nombre double ?*

## 8. À enrichir

- Le support : que fait-on quand quelqu'un écrit « ma valeur a disparu » sans
  qu'on puisse regarder son projet ? (piste : un diagnostic **que l'utilisateur
  lance lui-même** et dont il choisit d'envoyer le résultat.)
- La sauvegarde et la restauration d'un projet, et qui a le droit de la demander.
- Le statut des fonctions de bord : une page publique d'état du service — le
  journal des pannes en donne désormais la matière.
- Le seuil qui fait une alerte : à partir de combien de pannes du même genre,
  dans quel délai, prévient-on quelqu'un ? (et par quel canal.)
- Les plafonds : que se passe-t-il quand un compte dépasse sa consommation ?
- La migration d'un projet d'une organisation à une autre.
