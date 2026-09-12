# L'environnement de développement, dans le navigateur

Ce dossier décrit la machine que **GitHub Codespaces** monte quand on ouvre Mdall
dans le navigateur : Node 22 pour l'application, **Java 21** pour l'outil de
restitution, et les dépendances déjà installées.

## Pourquoi Java est là

Mdall n'en a pas besoin. `services/opendataloader/` si : la bibliothèque qui
restitue un PDF en Markdown est écrite en Java, et le paquet npm n'est qu'une
enveloppe autour de son exécutable.

C'est ce qui permet d'essayer l'outil **sans rien installer sur sa propre
machine** — ce qui compte quand on travaille sur un poste dont on n'est pas
administrateur.

## S'en servir

Sur le dépôt : bouton **Code → Codespaces → Create codespace on main**. Un
VS Code complet s'ouvre dans un onglet ; tout tourne chez GitHub.

Ensuite, voir [`services/opendataloader/README.md`](../services/opendataloader/README.md) :
essayer la restitution sur un document, ou lancer le service et le brancher à
Mdall.

## Ce qu'il ne faut pas y faire

**N'y déposez pas de documents de projet réels destinés à être versés.** Un
Codespace est jetable, mais il tient un dépôt git : un PDF glissé dans l'arbre
peut finir dans un commit. Pour un essai, posez-le dans `/tmp`, ou supprimez-le
une fois la restitution lue.
