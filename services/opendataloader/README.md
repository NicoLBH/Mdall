# Mettre l'outil de restitution en service

Ce dossier contient **tout ce qu'il faut** : un serveur de cent cinquante lignes et un
conteneur. Il n'y a rien à écrire, seulement à déployer.

---

## Ce que ça fait, en une phrase

Un PDF entre, ses pages en Markdown sortent — **sans modèle, sans clé, sans jeton
consommé**. C'est la colonne de droite de l'écran *Restitution*, celle qui sert à juger si
l'appel payant de gauche est encore nécessaire.

---

## Pourquoi un conteneur, et pas une fonction Supabase

[OpenDataLoader PDF](https://github.com/opendataloader-project/opendataloader-pdf) est écrit
en **Java**. Le paquet npm `@opendataloader/pdf` n'est qu'une enveloppe autour de son
exécutable : il lui faut donc un JRE. Deno — le moteur des fonctions Supabase — n'en a pas,
et GitHub Pages encore moins.

C'est le seul morceau de Mdall qui demande un conteneur. Il est petit : un JRE, Node, et
24 Mo de bibliothèque. Pas de Python, pas de PyTorch, pas de GPU, **aucun modèle à
télécharger** — c'est pour cela qu'il démarre à froid en une seconde et peut dormir entre
deux comptes rendus.

---

## Pas à pas

### 1. Essayer en local, avant tout déploiement

Vérifiez d'abord que Java est là :

```bash
java -version      # il faut 11 ou plus
```

Puis :

```bash
cd services/opendataloader
npm install
npm start
```

Le serveur écoute sur le port 8080. Dans un autre terminal, envoyez-lui un vrai compte
rendu :

```bash
curl -X POST --data-binary @CR_07.pdf \
     -H "Content-Type: application/pdf" \
     http://localhost:8080/ | head -c 600
```

Vous devez voir revenir :

```json
{"markdown":"=== PAGE 1 ===\n\n# COMPTE RENDU DE REUNION DE CHANTIER N 12\n\n|N|Lot|…"}
```

**Si vous voyez ça, tout le reste n'est que du déploiement.** Si vous ne voyez rien,
regardez la sortie du serveur : elle dit ce qui a manqué.

### 2. Construire le conteneur

```bash
cd services/opendataloader
docker build -t mdall-opendataloader .
docker run --rm -p 8080:8080 mdall-opendataloader
```

Refaites le `curl` de l'étape 1 pour vérifier que le conteneur répond comme le local.

### 3. Le déployer quelque part

N'importe quel hébergeur qui sait faire tourner une image Docker fait l'affaire. Le service
tient dans le plus petit gabarit proposé : il n'a besoin ni de GPU, ni de mémoire
particulière.

Un exemple, avec Google Cloud Run :

```bash
gcloud run deploy mdall-opendataloader \
  --source services/opendataloader \
  --region europe-west1 \
  --no-allow-unauthenticated \
  --memory 1Gi \
  --timeout 120
```

> **`--no-allow-unauthenticated`, ou son équivalent chez votre hébergeur.**
> Le service **n'authentifie personne** : c'est la fonction Supabase qui tient la porte.
> Exposé sur l'internet public, il serait une conversion de PDF gratuite offerte au monde
> entier, sur votre facture.
>
> Si votre hébergeur ne sait pas restreindre l'accès, mettez au minimum un jeton partagé
> devant, et faites-le porter par la fonction Supabase.

Notez l'adresse que l'hébergeur vous rend — quelque chose comme
`https://mdall-opendataloader-xxxx.run.app`.

### 4. Donner l'adresse à Mdall

```bash
supabase secrets set OPENDATALOADER_URL="https://mdall-opendataloader-xxxx.run.app"
```

Ou, dans l'interface Supabase : **Project Settings → Edge Functions → Secrets**.

### 5. Déployer la fonction relais

```bash
supabase functions deploy reconstituer-par-loutil
```

### 6. Vérifier à l'écran

Atelier → **Lecture des comptes rendus** → déposez un PDF → onglet **Restitution**.

La colonne de droite doit se remplir. Si elle affiche encore « Aucun outil de restitution
n'est branché », c'est que `OPENDATALOADER_URL` n'est pas arrivée : redéployez la fonction
après avoir posé le secret.

---

## Ce que l'écran vous dira

| Ce qui s'affiche | Ce qui se passe |
| --- | --- |
| « Aucun outil de restitution n'est branché » | `OPENDATALOADER_URL` est vide |
| « L'outil n'a pas répondu » | l'adresse est mauvaise, le service dort, ou il a dépassé 60 s |
| « L'outil a refusé le document » | le service a répondu en erreur — regardez ses journaux |
| « L'outil n'a rendu aucune page » | le Markdown est revenu sans marqueur de page |

---

## Le contrat, si vous voulez brancher autre chose

Le service peut être remplacé par n'importe quoi qui respecte ceci :

```
POST /     Content-Type: application/pdf     →  { "markdown": "=== PAGE 1 ===\n…" }
                                             ou  { "pages": [ { "page": 1, "markdown": "…" } ] }
GET  /sante                                  →  { "ok": true }
```

**Les pages sont obligatoires.** Un document rendu d'un seul bloc ne peut pas être aligné
contre la restitution du modèle, et l'écran afficherait « tout diverge » pour un document
identique.

Le découpage des marqueurs se fait dans `supabase/functions/_shared/markdown-de-loutil.js`,
et nulle part ailleurs : deux analyseurs pour une même convention finiraient par ne plus
dire la même chose.

---

## Les réglages, et pourquoi ceux-là

Dans `serveur.mjs` :

| Réglage | Pourquoi |
| --- | --- |
| `markdownPageSeparator: "=== PAGE %page-number% ==="` | la convention de Mdall, celle que le module partagé sait relire |
| `tableMethod: "cluster"` | rattrape les tableaux sans bordures — imparfaitement, mais mieux qu'en liste à puces |
| `headingHierarchy: true` | les titres gardent leur niveau, sans quoi tout devient du texte plat |
| `imageOutput: "off"` | on compare du texte ; écrire les images remplirait le dossier temporaire pour rien |

Le mode **hybride** (`--hybrid docling-fast`) améliore nettement les tableaux sans bordures,
mais il demande un serveur Python à côté. Il n'est pas activé ici : on regarde d'abord ce
que le mode libre donne sur de vrais CCTP.

---

## Ce qu'il ne fait pas

- **Il n'authentifie personne.** Voir l'étape 3.
- **Il ne garde rien.** Le dossier temporaire est effacé après chaque conversion, réussie ou
  non.
- **Il ne sait pas lire un scan.** Sans OCR, un PDF d'images rend un document vide.
- **Il ne restitue pas les cellules fusionnées en Markdown.** Le format n'a ni `rowspan` ni
  `colspan` — voir `docs/reconstituer-un-document.md` §3.
