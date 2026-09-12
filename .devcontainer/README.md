# L'environnement de développement, dans le navigateur

Ce dossier décrit la machine que **GitHub Codespaces** monte quand on ouvre Mdall
dans le navigateur : Node 22, et les dépendances déjà installées.

Rien ne touche l'ordinateur de celui qui l'ouvre — ce qui compte quand on
travaille sur un poste dont on n'est pas administrateur.

## S'en servir

Sur le dépôt : bouton **Code → Codespaces → Create codespace on main**. Un
VS Code complet s'ouvre dans un onglet ; tout tourne chez GitHub.

Ensuite, `npm test` et `npm run build:web` comme partout ailleurs.

## Ce qu'il ne faut pas y faire

**N'y déposez pas de documents de projet réels.** Un Codespace est jetable, mais
il tient un dépôt git : un PDF glissé dans l'arbre peut finir dans un commit. Un
compte rendu de chantier porte des noms d'entreprises et de personnes — il n'a
rien à faire dans Mdall.

## Ce qui n'y est plus

Java a été retiré. Il servait à un outil de restitution de PDF, essayé puis
abandonné : voir `docs/reconstituer-un-document.md`. Le jour où un morceau de
Mdall en redemandera, il se rajoute en une ligne.
