# Spike 3 — Email Continuity

**Statut : non implémenté.** Ce dossier est réservé.

À n'ouvrir qu'après évaluation du Spike 2.

## Question expérimentale

Un email sélectionné volontairement peut-il enrichir la mémoire d'un sujet
existant sans introduire de faux faits ni de rattachements silencieusement
erronés ?

## Principe produit non négociable

Mdall ne lit pas la boîte mail d'un utilisateur. Chaque utilisateur choisit
explicitement, au cas par cas, quel échange entre dans la mémoire du projet.

Ce spike n'implémentera donc **aucune** connexion Gmail, Outlook ou IMAP, et
aucun parcours de mailbox. Il travaille sur des messages fournis comme fixtures.

## Règles à tenir

- Deux capacités distinctes, deux confiances distinctes : interprétation du
  contenu d'une part, rattachement à un sujet d'autre part.
- Une proposition, une condition ou une réserve ne devient jamais une décision
  ferme.
- Le threading ne se déduit pas d'une simple ressemblance de sujet : sans
  `Message-ID` / `In-Reply-To` / `References` exploitables, marquer
  `THREAD_METADATA_INCOMPLETE`.
- Ne pas présumer qu'un transfert conserve les en-têtes du fil original : le
  spike doit mesurer ce qui survit réellement selon le mode de transmission.
- Chaque pièce jointe est une source à part entière, reliée au message.
- Aucun sujet n'est créé automatiquement ; `NO_MATCH` et `AMBIGUOUS` sont des
  réponses valides.

## Production legal prerequisite

Aucune mise en production d'une ingestion email sans validation spécialisée
RGPD / droit du numérique : base légale, données personnelles professionnelles
des tiers présents dans le fil, information des participants, durée de
conservation, accès, pièces jointes, valeur probatoire.

Cette validation est un prérequis de **mise en production**. Elle n'est pas
requise pour construire un spike local sur des données de test autorisées.
Ce spike ne tire aucune conclusion juridique.
