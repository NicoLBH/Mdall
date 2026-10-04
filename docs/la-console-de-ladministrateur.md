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

**Fait, sauf la durée** — voir *5 ter*. Les refus se lisent groupés par cause et
par fonction, sur deux fenêtres. La durée des appels n'est pas mesurée :
`ai_usages` garde ce qu'un appel a coûté, pas combien de temps il a pris.

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

**2. La date d'entrée et la dernière trace de chaque compte — *lues*.** Elles
étaient déjà en base, dans `auth.users` ; ce qui manquait était un endroit d'où
les regarder. *Utilisateurs › Les comptes* les montre (§ 7 quinquies). La cohorte
elle-même — « sur les dix inscrits de la semaine 3, combien ont versé quelque
chose en semaine 4 » — reste à faire : la matière est là, le calcul non.

**3. Le journal des accès administrateurs — *fait*.** Table
`acces_administrateurs`, posée **dans la même migration** que le premier écran
qui lit un compte. C'était la règle que cette page écrivait depuis des mois, et
elle a été tenue : qui, quelle page, quand, quel filtre.

Trois décisions qu'il faut dire :

- **la base écrit, pas la console.** Les trois fonctions de lecture appellent
  `la_porte_de_la_console()` avant de répondre ; une console qui pourrait choisir
  de ne pas se journaliser ne se journalise pas ;
- **un refus ne laisse pas de ligne.** La porte vérifie avant d'écrire : une
  tentative refusée n'est pas un accès, et un journal rempli de tentatives est un
  journal qu'on ne relit plus ;
- **personne ne le lit depuis un navigateur**, pas même un administrateur. La
  table n'a aucune politique — ni de lecture, ni d'écriture. Un journal que son
  sujet peut relire est un journal qu'il peut vérifier avant d'effacer.

Il couvre **les pages qui lisent des personnes**. Les pages déjà en place — le
carburant, les domaines, les sujets du système — ne rendent que des agrégats
anonymes, sans un identifiant qui désigne quiconque, et ne sont pas journalisées.
Ce n'est pas un oubli, c'est la ligne qu'on tient ; l'étendre demandera de passer
ces fonctions de `stable` à `volatile`, donc de les modifier.

**4. Un identifiant de compte distinct de l'identifiant de personne.** Aujourd'hui
un projet a des collaborateurs, et rien ne dit **qui paie**. L'ajouter plus tard
est une migration qui touche **toutes** les politiques de sécurité ; l'ajouter
maintenant est une colonne nullable.

Puis, dans la foulée : **une page unique** — cohorte · délai jusqu'au premier
versement signé · coût agrégé · refus des dernières 24 h. Une page. Dix pages
qui montent toujours sont dix pages qu'on cesse de regarder, et c'est
exactement le défaut qu'on vient de corriger sur « 380 constats ».

## 5 bis. *Utilisateurs › Les comptes* — le premier écran qui lit des personnes

### Ce qui change de régime

Jusqu'ici la console ne lisait que des **agrégats anonymes** : des nombres, deux
dates, aucun identifiant. Même ouverte à tort, elle ne nommait personne. Cet
écran nomme des gens — un nom, un prénom, une adresse. C'est un autre régime, et
il s'accompagne du journal ci-dessus, posé dans la même migration.

### Ce qu'il montre

| où | quoi |
| --- | --- |
| le tableau | une page de vingt-cinq comptes : nom, adresse, identifiant court, date d'entrée, dernière trace, combien de chantiers à lui et combien avec d'autres |
| la recherche | sur le nom, le prénom, l'adresse et la société ; elle attend qu'on ait fini de taper, pour ne pas faire six lignes de journal pour un mot |
| le détail | ses chantiers (possédés / où il collabore, avec leurs sujets comptés et ce qui est rangé), ses sujets créés, ses appels de modèle, ses jetons, ses premier et dernier appels |
| sa consommation | le même rendu que *Profil › Factures et abonnement*, avec les mêmes boutons gris — par jour, par mois, par an — et **le même barème** |

**Possédé n'est pas collaboré**, et les séparer est tout l'intérêt : un
déclencheur inscrit le propriétaire comme collaborateur de son propre chantier,
et les fondre ferait monter « collabore à » avec « possède » sans rien apprendre
de plus.

**Un compte effacé quitte la liste.** Le droit à l'effacement n'est pas « on ne
le montre plus à l'écran de l'utilisateur » : c'est aussi, et surtout, « la
console ne le liste plus ».

### Ce qu'il ne montre pas, et pourquoi la règle tient encore

Rien de ce que le § 3 interdit. Une épreuve lit **le texte de la migration**, les
deux modules que la console emporte pour elle, le parcours réel de ses imports et
le site construit, et refuse `copilot_conversations`, `copilot_messages`,
`subject_messages`, `project_assertions`, les trois tables de lectures
conservées et le dossier des mails.

C'est le cas précis où une épreuve sur la source vaut quelque chose : une console
qui lirait une conversation privée **marcherait parfaitement**. Aucun test de
comportement ne tomberait, aucune page ne s'afficherait de travers. Le seul
moment où l'on s'en apercevrait est le jour où quelqu'un le découvre — et ce
jour-là, le produit est discrédité.

**L'exception reste nommée.** `le_corpus_en_clair` est du contenu, et la console
le lit, derrière une porte de développement ouverte dix secondes, pour la mise au
point du découpage des idées. L'épreuve la nomme et vérifie qu'elle est **la
seule** : une deuxième qui s'ajouterait sans être écrite la ferait tomber.

### Où le jugement vit

Entièrement en base, comme pour le reste de la console :

```
le navigateur appelle   les_comptes_de_mdall(page, par_page, cherche)
la fonction vérifie     est_administrateur()        — sinon elle lève, sans journaliser
la fonction journalise  acces_administrateurs       — qui, quelle page, quel filtre
la fonction répond      des comptes, des dates, des noms de chantier
```

Un contrôle écrit dans la page serait une suggestion : il se contourne en ouvrant
les outils de développement. Et la porte du navigateur **ne garde rien** — elle
sert seulement à dire pourquoi l'écran est vide.

### Le barème n'est pas recopié

La fonction de base rend les jetons d'un compte **groupés par pas et par
modèle** : rendre dix mille appels pour en faire douze points serait dix mille
lignes de trop. Mais l'axe, les pas vides, les libellés et le tarif restent dans
`services/consommation-ia.js` — le même module que l'écran de l'utilisateur.

Un second barème en SQL aurait divergé de la facture au premier tarif relevé
(règle 4), et c'est précisément le chiffre qu'un administrateur vient vérifier.
Une épreuve branche les deux bouts l'un sur l'autre : ce que la base groupe et ce
que le JavaScript aurait compté appel par appel donnent le même total, le même
axe et le même montant.

**Ce que cet écran ne montre pas de la consommation** : ni la répartition par
usage, ni celle par chantier. La fonction groupée ne porte ni la nature de
l'appel ni le projet ; les dessiner quand même donnait une seule barre,
« inconnu — 100 % », qui n'apprend rien et se lit comme une panne (règle 12).

### La barre d'onglets commande enfin quelque chose

Elle existait avec **un** onglet, pour dire qu'il y en aurait d'autres.
« Utilisateurs » est le second, et il passe **en premier** : la première question
d'exploitation est « qui est là », et tout le reste porte sur ce que ces gens ont
versé. « Exploitation » est le troisième, et il se glisse **au milieu** : on
pourrait défendre l'inverse — regarder d'abord si la machine tourne —, mais la
place du premier onglet a été posée explicitement, et la déplacer sans qu'on le
demande ferait bouger un repère sous la main de quelqu'un qui l'avait appris.

**Chaque rubrique déclare son onglet**, et non l'inverse. L'adresse nomme la
rubrique — `#comptes`, `#sujets` — et l'onglet s'en déduit : un signet ouvre la
bonne rubrique dans le bon onglet, et il n'y a pas deux états à accorder entre la
barre du haut et le rail de gauche (règle 10).

## 5 ter. *Exploitation* — la santé, l'usage, et qui a regardé

Trois rubriques, dans l'ordre où l'on se pose les questions :

> est-ce que cela répond ? → qu'est-ce qu'il y a dedans ? → qui a regardé ?

La santé d'abord, parce que si rien ne répond, les chiffres d'usage de l'écran
suivant sont ceux d'une installation en panne — et on les lirait comme un creux
d'activité.

### La question posée, et la réponse qu'on ne donne pas

> « Est-ce qu'il y a un moyen de savoir si les systèmes sont opérationnels ?
> Supabase, OpenAI, GitHub… ? »

Il y en a un, et **ce n'est pas la page d'état du fournisseur**. Celle-ci dit si
le fournisseur va bien *dans le monde*. Elle ne dit rien de ce qui casse en
pratique : une clé révoquée, un quota épuisé, une fonction non déployée, une
migration non appliquée, un portail qui refuse notre requête. Dans **tous** ces
cas la page du fournisseur est verte et Mdall ne marche pas.

L'afficher serait un voyant qui rassure sans rien mesurer — exactement le genre
d'indicateur qu'on apprend à ignorer, et qui vaut moins que pas d'indicateur du
tout (règle 12).

On lit donc ce que Mdall a **lui-même observé** :

| Système | Ce qu'on regarde | Ce que sa trace prouve |
| --- | --- | --- |
| La base | la lecture elle-même est revenue | ce tableau s'affiche, donc elle a répondu à l'instant |
| Le stockage | le dernier document rangé | un casier qui accepte les octets |
| Le modèle | le dernier appel abouti | une fonction qui tourne, une clé qui vaut, un fournisseur qui a répondu |
| Les fonctions de bord | la dernière ligne de file prise | un serveur qui tourne et qui se réveille |

C'est moins universel et beaucoup plus utile : c'est vrai de notre installation
et d'aucune autre.

### La seule ligne qui compte vraiment

**Aucune trace ne veut pas dire que tout va bien.** C'est le piège exact de ce
genre de tableau : une installation neuve, une clé jamais utilisée, une fonction
jamais déployée ne laissent aucune trace — et un tableau qui compte les pannes y
trouverait zéro panne, et afficherait du vert.

Cinq verdicts, donc, et aucun « répond » sans preuve positive :

- **répond** — vu répondre récemment, et rien ne s'en plaint ;
- **répond, avec des refus** — vu répondre, *et* des refus récents le concernent ;
- **sans nouvelles** — vu répondre un jour, pas récemment. **Ce n'est pas « en
  panne »** : Mdall ne sait pas distinguer « personne ne s'en est servi » de « il
  ne répond plus », et une sonde qui appellerait le modèle toutes les cinq
  minutes pour le savoir serait une facture, pas une mesure (fondamental 13) ;
- **on ne sait pas** — aucune trace, jamais ;
- **bloqué** — le seul qui affirme une panne, et il ne vient jamais d'une
  absence : une file prise et jamais refermée.

« On ne sait pas » et « sans nouvelles » restent **neutres** à l'écran. Les
peindre en vert serait le mensonge que tout ce tableau existe pour empêcher ; en
rouge, ce serait affirmer une panne qu'on n'a pas constatée.

### Les refus, par cause, avec leur remède

Les huit genres de panne de `journal-des-refus.js` se rangent de trois côtés :
le fournisseur a répondu non (`quota`, `surcharge`, `refuse`), rien n'a répondu
ou la porte était fermée (`injoignable`, `non-autorise`), ou c'est un défaut de
Mdall (`mal-forme`, `trop-grand`, `trop-long`). C'est la première question qu'on
se pose devant un refus, et la seule dont la réponse change le geste.

Les remèdes viennent de `journal-des-refus.js`, qui les tient déjà pour l'écran
de l'utilisateur : deux listes auraient fini par conseiller deux gestes
différents pour la même panne (règle 4).

### La file : deux moitiés qu'on ne confond pas

Une ligne `en_cours` depuis une heure a été **abandonnée en route** ; une ligne
`en_attente` depuis une heure **n'a jamais été prise**. La première est un
travail perdu que la reprise reprendra ; la seconde dit que la fonction de bord
ne tourne pas du tout. Les dix minutes du seuil ne sont pas choisies là : c'est
`ABANDONNEE_APRES_MS` de `services/reveiller-la-file.js`.

### Ce qu'on ne sait pas d'ici, et qui est écrit à l'écran

Nommé, et non laissé en blanc : un tableau à quatre lignes qui ne dit pas qu'il y
a une cinquième chose se lit comme un tableau complet.

- **GitHub.** Mdall ne l'appelle jamais en marche : c'est par lui qu'il se
  déploie, pas par lui qu'il tourne. Un voyant vert ici ne dirait rien du
  produit, et un voyant rouge n'empêcherait personne de travailler.
- **Le quota du plan Supabase.** Il ne se déduit d'aucune table. Les octets
  rangés se comptent ; la limite au-delà de laquelle ils ne rentreront plus, non
  — et l'inventer ferait une jauge fausse.
- **Le temps de travail.** Le trafic, lui, se mesure — voir *5 quater*. Mais il
  compte le temps où l'application est au premier plan et touchée : lire un
  document à côté de l'écran n'y est pas, et un onglet oublié non plus. C'est de
  la présence, pas du travail.
- **L'état des fournisseurs dans le monde.** Voir plus haut.

### L'usage : pourquoi la médiane, et pas seulement la moyenne

« 14 documents par chantier » recouvre aussi bien cinquante chantiers à quatorze
que quarante-neuf à un et un à sept cents. Ce ne sont pas les mêmes clients, ce
n'est pas le même tarif, ce ne sont pas les mêmes limites. On rend donc la
moyenne, **la médiane, le minimum et le maximum** — et une phrase le dit quand la
moyenne vaut au moins le double de la médiane.

Les documents effacés **se comptent à part**, et c'est voulu : ils occupent
encore des octets tant que rien ne les a retirés du casier. Ne pas les afficher
ferait croire un effacement accompli alors que les octets sont toujours là — et
c'est exactement ce qu'un effacement RGPD doit pouvoir montrer comme fait.

### Le journal des consultations : lisible, et toujours ineffaçable

`acces_administrateurs` a été posée **sans aucune politique**, et la migration
qui la crée dit pourquoi : « un journal des accès que son sujet peut relire est
un journal qu'il peut vérifier avant d'effacer ».

La propriété à tenir n'était pas « illisible ». C'était **ineffaçable**, et elle
ne bouge pas : aucune politique d'écriture ni de suppression n'est ajoutée, la
table reste hors de portée de PostgREST, et une fonction gardée la rend en
lecture — **en journalisant sa propre lecture**. On peut donc voir qui a
regardé, et l'on ne peut ni ajouter une ligne, ni en retirer une, ni regarder
sans laisser la sienne.

### Un curseur, et non un numéro de page

Le banc des politiques a pris la première version en faute : **la fonction écrit
dans la table qu'elle pagine**. Chaque lecture y pose sa propre ligne en tête,
donc l'`offset 10` de la page 2 arrivait une ligne trop tard — la page 2
répétait la dernière ligne de la page 1, et plus on avançait, plus des lignes se
voyaient deux fois tandis que d'autres glissaient hors de portée sans jamais
être vues.

Un curseur ne décrit pas une position dans un ensemble qui bouge : il décrit une
ligne — « ce qui est plus vieux que celle-ci ». La clé est `(quand, id)` et non
`quand` seul, parce que deux lignes du même instant feraient sauter la seconde.

Dans un journal, c'est le défaut qui compte : **une consultation qu'on ne voit
jamais est une consultation qui n'a pas eu lieu** (règle 5).

### Ce que l'exploitation ne montre pas

Ni nom de fichier, ni objet de mail, ni texte de document, ni conversation. Des
octets sommés **par casier** — jamais « les dix plus gros documents », qui serait
utile et dont chaque ligne porterait le nom d'un fichier de chantier.
`la-cloison-de-la-console.test.mjs` lit la migration, les modules emportés et le
site construit, et refuse ces noms.

## 5 quater. *Exploitation › Le trafic* — combien de monde, combien de temps

### Ce qu'on disait ne pas savoir, et qu'on sait maintenant

La rubrique précédente écrivait, dans « ce qu'on ne sait pas d'ici » :

> **Le trafic, et le temps passé dans l'application.** Il n'y a pas de table de
> séances. La dernière venue de chaque compte se sait ; combien de temps il est
> resté, non.

C'était vrai, et c'était un manque, pas une position. Une table de venues existe
désormais : `venues`, quatre colonnes, et rien d'autre.

| | |
| --- | --- |
| `owner_id` | posé par la base, jamais par l'appelant |
| `commencee_le` | le début de la venue |
| `vue_le` | le dernier battement |
| `secondes_actives` | le temps **éveillé**, borné à chaque ajout |

**Ni écran, ni chantier, ni geste, ni document.** « Qui a passé combien de temps
sur quel chantier » serait utile, et ce serait un **journal de navigation** : on
saurait qui lit quoi sans jamais lire une ligne. La promesse du produit est que
le contenu ne traverse pas, et un journal de navigation la défait par la bande.
L'épreuve de la cloison vérifie la liste des colonnes, et refuse nommément
`project_id`, `page`, `route`, `document_id`.

### Le piège, et la seule façon de ne pas y tomber

Un onglet laissé ouvert toute la nuit, c'est huit heures. Compter le temps
pendant lequel la page existe donnerait un « temps moyen d'utilisation » de
plusieurs heures par jour — faux, et **flatteur** : le genre de chiffre qu'on
finit par montrer à quelqu'un (règle 12).

On ne compte donc que le temps **éveillé** :

- l'onglet est au premier plan, **et**
- il y a eu un geste — clic, frappe, défilement — dans les cinq dernières minutes.

C'est une minute de plus par minute où les deux sont vrais, et rien sinon. Les
seuils vivent dans `services/les-venues.js` : un battement par minute, cinq
minutes d'éveil par geste, et une venue close après trente minutes de silence —
revenir après le déjeuner n'est pas la même visite.

**Ce que cela mesure reste « l'application était ouverte et quelqu'un la
touchait »**, et non « quelqu'un travaillait ». L'écran l'écrit : un indicateur
dont on a oublié ce qu'il mesure est pire qu'un indicateur manquant. Six mois
plus tard, « temps moyen : 34 minutes » se lirait « ils travaillent 34 minutes
par jour » (règle 5).

### Le navigateur décide, la base borne

Le navigateur décide **quand** battre : c'est lui qui sait si l'onglet est au
premier plan. Il envoie donc un nombre de secondes, **donc il peut envoyer
n'importe lequel** — un onglet réveillé après une heure de veille déclarerait
une heure d'un coup.

`prolonger_une_venue` le borne à trois cents secondes, et l'ajout y est atomique
(deux onglets de la même personne feraient sinon deux lectures et deux écritures,
et une minute disparaîtrait). La même borne est écrite des deux côtés parce que
chacun doit tenir seul ; une épreuve lit la migration et vérifie que c'est le
même nombre (règle 4).

### Les venues ne sont pas les comptes

C'est la seule confusion qui change une décision. Un produit ouvert quinze fois
par jour par la même personne et un produit ouvert une fois par quinze personnes
n'appellent ni le même tarif, ni le même écran d'accueil, ni la même inquiétude.
`le_trafic_de_mdall` rend donc les deux, et l'écran les affiche côte à côte.

**Et les comptes ne s'additionnent pas d'un pas à l'autre** : quelqu'un venu
lundi et mardi compte une fois chaque jour, et deux si on somme. Le total de la
fenêtre ne se déduit pas des pas, et on ne le fabrique pas — on rend le plus haut
pas observé, nommé pour ce qu'il est.

### Qui voit quoi

| | |
| --- | --- |
| Chacun | écrit, lit, prolonge et **efface** ses propres venues |
| Un autre utilisateur | rien — savoir quand un collègue était devant son écran n'est une information de chantier pour personne |
| La clé publique | rien |
| La console | le trafic **agrégé**, derrière la porte, et journalisé comme toute consultation |

L'effacement par soi-même est le droit à l'effacement rendu réel plutôt qu'écrit
dans une politique de confidentialité. Le prix est que le chiffre du trafic est
diminuable par ceux qu'il compte, et c'est le bon prix : un indicateur
d'exploitation ne vaut pas qu'on retienne les données de quelqu'un qui demande
leur effacement.

### La conservation, et ce qui n'est pas fait

**Treize mois**, pour pouvoir comparer un mois à celui de l'an passé, et pas un
jour de plus. `effacer_les_vieilles_venues()` le fait, derrière la porte.

**Rien ne l'appelle encore**, et l'écran le dit plutôt que de laisser croire la
purge faite : une durée de conservation écrite et jamais appliquée est pire
qu'aucune, parce qu'elle se présente comme une garantie (règle 12). Il faudra un
déclencheur — `pg_cron`, ou un appel depuis la console.

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
> **C'est fait.** Les trois écrans sont partis, et leurs trois tables avec
> (`202610230001_larchive_quitte_la_console.sql`). Le dépouillement est dans
> *Fichiers*, la chronologie aux *Indicateurs*.
>
> **Le casier `archives`, lui, ne se supprime pas en SQL.** La migration a
> d'abord essayé, et le déploiement l'a refusée :
>
> ```
> ERROR: Direct deletion from storage tables is not allowed.
> Use the Storage API instead. (SQLSTATE 42501)
> ```
>
> Et la garde de Supabase a raison : un objet effacé par un `delete` laisse ses
> octets dans le stockage de fond, qui ne connaît que l'API — la ligne
> disparaîtrait, le fichier resterait. La migration retire donc les **politiques**
> du casier, ce qui le rend inatteignable, et s'arrête là. **Reste un geste à la
> main** : Studio → Storage → `archives` → tout supprimer, puis supprimer le
> casier. Tant qu'il n'est pas fait, les messages d'essai sont hors d'atteinte
> mais présents.
>
> Une garde empêche la prochaine réécriture du même `delete` :
> `scripts/lordre-des-migrations.test.mjs`, avec les autres défauts qu'on
> n'apprend qu'au déploiement.
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

## 7 ter. Le carburant : le premier écran qui lise quelque chose

> *« Je veux voir ce que le système fait des mails, et comprendre la valeur pour
> la prédiction. »*

### Ce qu'on peut répondre sans lire un seul mail

Beaucoup, en fait. Pour savoir si un prédicteur a une chance, il n'y a pas
besoin de lire une correspondance : il faut savoir **combien il y a de
messages, sur combien de chantiers, et sur quelle durée**.

`comptes_du_carburant()` rend donc des nombres et deux dates. Aucun objet,
aucune adresse, aucun nom de projet, aucun identifiant. `count(distinct …)` rend
un nombre, et un nombre ne se remonte pas.

`security definer`, et il faut dire pourquoi : les documents sont gardés par
`documents_by_project`, qui ne rend à chacun que ses projets — un administrateur
ne verrait rien. La fonction contourne cette politique, et **ne peut rendre que
des agrégats, par sa signature elle-même**. C'est la même forme de garde que
`est_administrateur()` : ce qui sort est un nombre, pas une ligne.

> `est_administrateur()` est recréée à cette occasion. Elle avait été supprimée
> avec l'archive parce qu'elle n'avait plus un seul appelant, et qu'une fonction
> `security definer` que rien n'appelle est le pire des deux mondes. Elle en a un
> de nouveau, et c'est celui pour lequel elle avait été écrite.

### Le total ne dit rien, la répartition dit tout

« 40 000 mails » est un chiffre de plaquette. Quarante mille répartis sur mille
chantiers sont **quarante mille fois rien** : la prédiction se nourrit de
*suites* — après tel domaine vient tel autre —, et une suite se lit dans un
chantier, pas en travers de mille (`docs/nourrir-mdall.md`, § 8 ter).

L'écran montre donc une répartition par tranches, et la ligne qui décide est
celle-ci : **combien de chantiers portent assez de matière**. Le seuil est de
cinquante messages, et c'est **une hypothèse déclarée, pas une mesure** : elle
vient de ce qu'en dessous de cinq points notés la mesure du passé refuse de se
prononcer (`ligne-de-base.js`), et qu'un chantier rend de l'ordre d'un point
pour dix messages. À corriger dès qu'on aura mesuré pour de vrai — un seuil faux
et dit vaut mieux qu'un seuil caché dans une condition (règle 12).

### Ce que le système n'en fait pas, nommément

La question portait aussi sur « l'avancement de leur traitement — anonymisation,
extraction du contenu, des domaines… ». La réponse honnête est qu'**aucun de ces
traitements n'existe**. Des barres de progression à zéro pour des étapes jamais
écrites auraient présenté une intention comme un chantier en cours (règle 12).

L'écran les nomme donc, avec ce qui se passe réellement aujourd'hui :

| | ce qui se passe | pourquoi |
| --- | --- | --- |
| l'extraction du contenu | **cinq valeurs** sont extraites au dépôt — expéditeur, objet, date, nombre de pièces, fil —, et rien d'autre | une liste de mails illisible sans elles ; au-delà, figer une forme avant de savoir ce qu'on en tirera |
| la reconnaissance des domaines | elle tourne **dans le navigateur**, à la lecture, et rien n'est gardé | sa table d'indices est un premier jet |
| l'anonymisation | rien n'est anonymisé, et rien n'a besoin de l'être | les mails ne quittent pas le projet de leur déposant |
| la mesure du prédicteur, agrégée | elle se calcule par chantier, chez son déposant | l'agréger demanderait de faire sortir un chiffre d'un projet |

**La dernière ligne est la plus intéressante**, et c'est le prochain vrai
chantier de cette console : la mesure existe déjà (`mesureDuPredicteur`), mais
elle se calcule là où le contenu vit. Pour la voir ici, il faudrait faire sortir
**un nombre** d'un projet — et donc le demander à celui qui l'a déposé. Ce n'est
pas un problème technique, c'est un consentement.

## 7 quater. Ce que je propose d'y mettre ensuite

Dans l'ordre où je les écrirais, et chacune répond à *« qu'est-ce que je fais
différemment si ce nombre bouge ? »*

**1. La mesure du prédicteur, agrégée — avec consentement.** Un bouton dans les
Indicateurs d'un projet : *« verser cette mesure au fonds commun »*, qui envoie
**quatre nombres** — précision au premier coup, dans les trois, jours d'avance,
taux de fausse alerte — et rien d'autre. La console montre alors la courbe de ce
que Mdall sait prédire, sur l'ensemble des chantiers qui ont accepté. *C'est le
seul indicateur qui dise si le produit marche.*

**2. Le mur des lectures manquées.** Combien de messages n'ont **rien cité qu'on
sache lire** — `sansIndice` existe déjà et se compte par chantier. Agrégé, c'est
la liste des choses que la table d'indices ignore, donc la prochaine ligne à
écrire. Un compte, jamais les textes.

**3. Ce qui tombe en panne.** `refus_des_fonctions` existe : fonction, genre,
code, instant, **jamais le message**. Une courbe par semaine et un palmarès des
trois fonctions qui échouent le plus. Si une fonction casse pour tout le monde,
on l'apprend ici avant qu'on ne l'écrive.

**4. Les cohortes.** Date d'entrée et dernière trace de chaque compte, deux
colonnes qui **n'existent pas encore** et qu'il faut écrire avant d'en avoir
besoin — un journal qui commence en mars ne dit rien de février (§ 5). Ensuite :
qui revient la deuxième semaine, et le troisième mois.

**5. Le coût, rapporté à ce qu'il produit.** La consommation existe par projet ;
agrégée, elle donne le coût d'un chantier nourri. C'est la moitié de la question
de l'unité de facturation, et la seule moitié qui soit mesurable.

**6. Le journal des accès administrateurs.** Toujours pas écrit, toujours
irrattrapable, et **maintenant urgent** : cette console lit désormais quelque
chose (§ 5).

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
