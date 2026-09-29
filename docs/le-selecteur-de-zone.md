# Le sélecteur de zone, et ce qu'un essai lit du projet

**À quoi sert cette page :** la dernière case du carnet sur l'appel. Elle
demandait une décision d'écran — « un sélecteur de plus, et la question de ce
qu'il vaut par défaut » —, et la décision est prise.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## Ce qui manquait

Le bac d'essai n'avait pas de zone, et c'était cohérent : **on y essaie une
fonction, pas un ouvrage**. Mais depuis qu'une fonction s'appelle avec une
portée, la moitié de ce qu'elle sait faire ne pouvait pas s'y montrer. « La même
fonction, deux bâtiments, deux réponses » ne se voyait que dans le rejeu de la
mémoire — c'est-à-dire **après** avoir versé.

On ne peut pas demander de signer pour voir si ça marche.

## Ce que le sélecteur change

Il donne au bac le **fond** : ce que le projet tient pour cette partie
d'ouvrage. `valeursDeLaPortee` décide laquelle vaut — la sienne d'abord, celle
qui vaut partout à défaut, jamais celle d'une autre zone. On ne redécide rien
(règle 10).

Trois sources, et l'ordre compte :

1. **le projet**, pour la zone choisie — c'est le fond, et c'est ce que la zone
   change ;
2. **le brouillon**, quand il pose une valeur — il est ce qu'on essaie, et une
   ligne qu'on vient d'écrire l'emporte sur ce qui est versé ;
3. **ce qu'on a tapé** — la main sur le volant, et elle gagne partout, y compris
   pour un appel qui nomme une autre zone.

Chaque champ dit ce qu'il tient du projet — « du projet : alu » —, et le rappel
s'efface dès qu'on a tapé. **Un essai qui répond sur une valeur venue de nulle
part ne se relit pas** (règle 5).

## Pourquoi « toutes zones » par défaut

Parce que c'est ce que le bac faisait hier. Partir sur un bâtiment ferait
changer de réponse tous les essais en cours sans que personne l'ait demandé.

Et « toutes zones » est une **portée à part entière**, pas une absence : ce qui
vaut partout s'y lit, et rien de ce qui ne vaut que pour un bâtiment. Ce n'est
pas la réunion des autres.

Le sélecteur ne paraît pas quand le projet n'a défini aucune zone : un sélecteur
à un seul choix fait douter de son propre écran.

---

## Trois défauts trouvés en le branchant

**La fenêtre du bac n'avait jamais reçu la mémoire.** `redessinerLesResultats`
la passait ; le premier rendu, non. Le formulaire demandait donc à la main un
nom qu'une fonction versée conclut — c'est-à-dire de répondre soi-même la
question qu'on avait signée — puis le champ disparaissait à la première frappe.
Son formulaire et ses résultats disaient deux choses différentes.

**Une définition de zone se lisait comme une valeur.** « Bâtiment A : le corps
principal » a la forme d'un sujet et d'une valeur, et n'en est pas une : c'est
du **vocabulaire**, l'endroit lui-même. Le bac l'offrait donc à remplir, avec sa
description pour réponse. Corrigé là où « porte une valeur » se décide, pas dans
le bac : la même erreur traversait aussi les valeurs corrigées et les versements
éclipsés.

**`zones` était pris pour un lieu nommé « zones ».** Le premier argument d'un
appel s'écrit de deux façons — le mot de la langue, ou le nom d'une partie
d'ouvrage — et les confondre faisait chercher une zone qu'aucun projet ne
définit. Tous les `F(zones, …)` se taisaient d'un coup. C'est le prix d'avoir
fait voyager les arguments comme des **noms** : il fallait dire lequel de ces
noms désigne un endroit.

---

## Une question, une réponse

« Cette zone existe-t-elle ? » se posait à deux endroits — le bac et le rejeu —
et chacun allait répondre à sa façon : l'un sur les zones **définies**, l'autre
sur celles que des valeurs **portent**. L'un se serait mis à taire ce que
l'autre lisait (règle 4).

`zonesConnuesDuProjet` répond pour les deux, et prend les deux sources. Ce n'est
pas la même question que « quelles zones proposer » — celle-là ne retient que
les définies, parce qu'une zone sans définition ne se vérifie pas et que
l'offrir ferait choisir un découpage que personne n'a écrit.

---

## Ce que la ronde a appris

**Une garde qui ne se laisse pas casser ne défend rien.** Deux lignes ont
survécu à la batterie parce que le chemin qu'elles protégeaient donnait la même
réponse sans elles. L'une était vraiment morte — la portée rangée dans les
valeurs, alors que la table était déjà celle de cette zone — et elle est partie.
L'autre ne manquait que d'un cas : une valeur qui vaut **partout**. Sans elle,
une zone inconnue ne lit rien de toute façon, et l'on ne voit pas si c'est la
garde qui se tait ou le vide.

**Un sélecteur qui ne descend nulle part rend exactement l'écran d'avant.** On
change de bâtiment, rien ne bouge, et il n'y a pas un caractère de différence à
voir. La garde qui relit le source pour vérifier que la mémoire atteint les deux
moteurs a été étendue à la zone, pour la même raison qu'elle existait.

**Une garde trop large se contourne mal.** `brancherLeBac` ne doit jamais
redessiner — le doigt est posé sur un champ. La zone, elle, doit tout redessiner.
Elle a donc son propre branchement : la garde garde ses dents là où elles
servent, et la nouvelle dit l'inverse pour le sien.
