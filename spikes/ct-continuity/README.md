# Spike 1 — CT Continuity

**Statut : non implémenté.** Ce dossier est réservé.

## Question expérimentale

Mdall peut-il reconstruire correctement l'évolution d'un même avis de bureau de
contrôle à travers plusieurs rapports successifs ?

## Ce que ce spike ne fera pas

- aucun contrôle réglementaire : le bureau de contrôle reste l'auteur de l'avis ;
- aucune réinterprétation technique de l'avis ;
- aucune modification d'un sujet Mdall réel ;
- aucun mapping automatique « avis favorable = sujet fermé ».

## Règles à tenir

- `NOT_FOUND` ne signifie jamais `CLOSED` : l'absence d'un avis dans le rapport
  suivant ne vaut pas levée.
- États de continuité minimaux : `MATCHED`, `NEW`, `NOT_FOUND`, `AMBIGUOUS`.
- Priorité de rapprochement : référence identique, puis référence normalisable
  sans ambiguïté, sinon `AMBIGUOUS` ou `UNMATCHED`. Pas de rapprochement
  sémantique agressif en première version.
- `opinion_raw` n'est jamais remplacé par une catégorie inventée ; toute
  normalisation conserve la valeur brute à côté.
- Aucune nomenclature d'organisme n'est présumée : le format de fixture doit
  accueillir plusieurs bureaux de contrôle et plusieurs mises en page.

## Harness

Ce spike consommera `../lib/` : `runSpikeCase`, `commonGuards`, les métriques
communes, plus ses métriques propres (false merge count, false closure count,
reference exact match rate, opinion fidelity).
