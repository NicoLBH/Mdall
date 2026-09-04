# Recette manuelle — Incendie Habitation et Copilote

Ce qui suit se fait **à la main, dans l'application déployée**. Les tests
automatiques vérifient que les pièces fonctionnent ; ils ne vérifient pas
qu'elles s'assemblent en quelque chose qu'on a envie d'utiliser. C'est ce que
cette liste couvre.

Chaque étape dit **ce qu'on fait**, puis **ce qu'on doit voir**. Une case qui ne
coche pas est un défaut : le noter avec la version servie (voir §0) et, pour le
copilote, le compte rendu de la discussion (menu de la discussion dans le rail →
*Copier*).

---

## 0. Avant de commencer

- [ ] **La page servie est bien la nouvelle.** Menu de la discussion → *Copier* :
      la première ligne du collage porte `Version servie : <sha> — déployé le …`.
      Si le sha n'est pas celui du dernier commit sur `main`, la publication
      n'est pas finie : elle prend quelques minutes après la fusion. Tout ce qui
      suit serait mesuré sur l'ancienne page.
- [ ] **Un projet relié à la base.** L'onglet Incendie doit afficher la barre des
      études. S'il affiche « Ce projet n'est pas encore relié à la base », les
      réponses ne seront pas conservées et la recette n'a pas de sens.
- [ ] Prévoir la note de calcul PDF utilisée pour les fondations, si l'on
      enchaîne sur cette partie.

---

## 1. L'étude incendie se conserve

**Atelier › Incendie › Incendie Habitation.**

- [ ] **Répondre à trois ou quatre questions.** Sous la barre des études, une
      carte apparaît — « Étude du \<date\> » — et la mention « Enregistrée » se
      montre à droite après une seconde.
- [ ] **Recharger la page** (F5), revenir sur l'onglet. Les réponses sont là,
      la carte est sélectionnée, et la liste « N réponses données — cliquez pour
      revenir dessus » les montre **avec leur libellé**, pas avec des clés.
- [ ] **Cliquer une réponse dans cette liste.** On revient sur la question, on
      peut la changer.
- [ ] **Changer de projet, puis revenir.** L'étude du premier projet ne suit
      pas ; celle du second réapparaît.

### Plusieurs hypothèses

- [ ] **« + Nouvelle étude ».** Une seconde carte s'ouvre, vide. La première
      **garde ses réponses** — c'est le point : « et si c'était une 2e famille ? »
      ne doit pas écraser ce qu'on a saisi.
- [ ] Répondre différemment dans la seconde, puis **revenir sur la première** :
      ses réponses reviennent, et l'onglet Résultats reprend ses conclusions.
- [ ] **Renommer** une étude. Le nom tient au rechargement.
- [ ] **Supprimer** une étude. Une confirmation est demandée ; après
      suppression, l'autre étude s'ouvre.
- [ ] **Recharger.** C'est l'étude sur laquelle on travaillait qui se rouvre,
      pas forcément la dernière créée.

### Ce qui n'est pas conservé, et pourquoi

- [ ] **Onglet Résultats.** Les conclusions ne sont jamais enregistrées : elles
      se recalculent à l'ouverture. Rien à vérifier ici, sinon qu'elles
      s'affichent — mais c'est le sens de tout le reste : un degré coupe-feu
      gelé le jour où on l'a lu deviendrait faux sans le dire.

---

## 2. Le copilote reprend l'étude

**Atelier › Copilote**, sur le même projet, avec l'étude remplie du §1.

- [ ] **Poser une question incendie** — par exemple :
      *« quel est le degré coupe-feu des planchers ? »*
- [ ] **Aucun formulaire ne s'ouvre** si l'étude porte déjà de quoi classer le
      bâtiment. C'est le pré-remplissage : ce qui a été saisi dans l'Atelier ne
      se retape pas.
- [ ] Déplier **« Ce que le copilote a fait »** : une étape dit
      *« Étude du projet reprise — \<nom\> — N entrées pré-remplies »*.
- [ ] Dans le bloc de l'utilitaire, colonne **ENTRÉES** : chaque valeur porte
      « étude du projet » en petit à côté d'elle. La conclusion cite l'article
      et la phrase de l'arrêté.
- [ ] **Sortie « etude »** dans la colonne RÉSULTATS : elle nomme l'étude qui a
      servi. Avec deux hypothèses ouvertes, c'est ce qui permet de s'apercevoir
      qu'on raisonne sur celle qu'on croyait abandonnée.

### Ce que la discussion dit passe devant

- [ ] Demander *« et si le bâtiment n'avait qu'un étage sur rez-de-chaussée ? »*
- [ ] La réponse doit **changer de famille** et le bloc doit montrer
      `etagesSurRdc 1` avec la mention « dite ici », pas « étude du projet ».
      L'étude, elle, n'est pas modifiée.

### Une valeur que personne n'a dite

- [ ] Sur un projet **sans étude incendie**, poser la même question. Le copilote
      ouvre un formulaire ou des pastilles, et **ne calcule pas** avec des
      chiffres qu'il aurait choisis seul.
- [ ] Le cas échéant, la phrase « Le copilote allait retenir \<valeur\>, que
      personne n'a dit » apparaît au-dessus des choix.

---

## 3. Ouvrir dans l'Atelier

Depuis un résultat incendie **conclu** du copilote (§2).

- [ ] Un bouton **« Ouvrir dans l'Atelier — N réponses »** est présent sous le
      bloc de l'utilitaire.
- [ ] **Cliquer.** On arrive sur *Incendie Habitation*, onglet Questionnaire,
      avec un bandeau orange en haut : « N réponses réunies par le copilote »,
      la conclusion rappelée en dessous.
- [ ] Le bandeau annonce **trois tas** : ce qui s'ajoutera, ce qui dit déjà la
      même chose, et ce qui **diffère** — cette dernière liste montre la réponse
      de l'étude et celle de la discussion côte à côte.
- [ ] **« Compléter cette étude ».** Les réponses manquantes s'ajoutent ; celles
      qui différaient **ne sont pas remplacées** (vérifier une des lignes de la
      liste des écarts : l'étude garde sa valeur). Le bandeau disparaît, le
      compteur de réponses de la carte augmente.
- [ ] Refaire une remise, puis **« Ouvrir une étude neuve »** : une carte
      « Depuis une discussion — \<date\> » s'ouvre avec **toutes** les réponses
      de la discussion, et l'étude précédente n'a pas bougé.
- [ ] Refaire une remise, puis **« Écarter »** : le bandeau disparaît, rien
      n'est écrit.
- [ ] Après un **rechargement de page**, un bandeau non traité a disparu : une
      remise vit en mémoire vive, elle n'est pas une écriture.

---

## 4. Le référentiel a changé

Ce cas ne se provoque pas à la main : il se présente quand le dépouillement de
l'arrêté progresse entre deux passages sur la même étude.

- [ ] Quand il se présente, un bandeau orange le dit sous la barre des études :
      « le référentiel a changé … au moins une conclusion n'est plus la même ».
- [ ] **« J'ai vu »** fait disparaître le bandeau, et il ne revient pas au
      rechargement.

---

## 5. Le copilote pendant qu'il travaille

Sur une question qui demande un vrai calcul — les fondations avec une note de
calcul jointe conviennent bien, parce qu'elles durent.

- [ ] **Les étapes s'affichent une par une**, pas d'un bloc à la fin. On doit
      voir la liste s'allonger pendant l'attente : lecture de la note, cote hors
      gel, recherche des semelles, semelles retenues.
- [ ] **Quand le copilote pose une question**, son message ne porte **ni**
      l'icône de copie, **ni** le compteur de jetons, **ni** l'horodatage : la
      réponse n'est pas finie, c'est à nous de répondre.
- [ ] **Après avoir répondu au formulaire** : la demande à laquelle on vient de
      répondre disparaît immédiatement, le journal reprend son cours dans le
      **même message**, et l'on ne voit **jamais** réapparaître « le calcul n'a
      pas eu lieu, il manque … ».
- [ ] **Une seule bulle.** La question du copilote et le résultat qui la suit
      sont **un seul message**, pas deux. Le compte rendu copié doit montrer
      `## [2] Copilote` puis rien d'autre après la réponse de l'utilisateur.
- [ ] Une fois le résultat écrit, le journal se replie sous
      **« Ce que le copilote a fait (N étapes) »**, **sous** le tableau.
- [ ] Le rond qui tourne s'arrête **quand la réponse s'affiche**, pas quelques
      secondes après.

### Le dépôt d'une note

- [ ] **Glisser un PDF** sur la discussion : le voile couvre la zone, le texte
      dessous n'est plus lisible, le cadre est gris en pointillés.
- [ ] Le fichier part **avec le message suivant** : la pastille de la note
      apparaît au-dessus de la bulle de la question.
- [ ] La note reste jointe pour les questions suivantes (« et si le sol faisait
      2 bars ? ») sans qu'on la redépose.

---

## 6. Ce qui ne doit jamais arriver

À surveiller pendant toute la recette. Un seul de ces points suffit à arrêter.

- [ ] **Aucune conversation du copilote n'est visible par un collaborateur du
      projet.** Ouvrir la même page avec un second compte ayant accès au
      projet : le rail des discussions doit être vide.
- [ ] **Aucune étude incendie n'est visible par un autre compte**, même
      collaborateur du projet.
- [ ] **Aucun sujet Mdall n'est créé, fermé ni rouvert** par une action du
      copilote ou de l'Atelier.
- [ ] **Le catalogue des utilitaires n'apparaît pas dans le navigateur.** Dans
      les outils de développement, onglet Réseau : la réponse de
      `executer-utilitaire` contient un résultat et des champs de formulaire,
      **jamais** la liste des utilitaires ni les consignes qui décident quand les
      appeler. Aucun fichier servi ne contient le mot `fondations_predimensionnement`
      en dehors de ce que le serveur vient de rendre.
- [ ] **Aucune clé d'API** dans les fichiers servis ni dans les réponses.

---

## 7. Ce qui reste à faire

Pour mémoire, et pour ne pas le prendre pour un défaut :

- Le **versement en mémoire** des degrés retenus n'existe pas encore : le bloc
  de l'utilitaire le dit (« Ce résultat n'entre pas dans la mémoire du projet »).
- L'alerte du §4 dit **qu'**une conclusion a changé, pas **laquelle** : les
  conclusions ne sont pas conservées, seule leur empreinte l'est.
- Les **images et les PDF** de la notice sont un chantier à part, en attente.
