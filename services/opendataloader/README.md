---
title: Mdall OpenDataLoader
emoji: 📄
colorFrom: blue
colorTo: gray
sdk: docker
app_port: 8080
pinned: false
short_description: Un PDF entre, ses pages en Markdown sortent.
---

# L'outil de restitution

Un PDF entre, ses pages en Markdown sortent — **sans modèle, sans clé, sans jeton
consommé**.

Ce n'est pas un accessoire : c'est la **piste principale** visée pour la lecture des
documents. Le modèle devient le secours, appelé quand l'outil échoue. Un service dont la
lecture ne dépend pas d'un fournisseur payant est un service qui tient.

---

## 1. D'abord : est-il assez bon sur **vos** documents ?

C'est la seule question qui décide, et elle n'a besoin **ni d'hébergeur, ni de compte, ni
de serveur**. Un PDF et deux minutes.

### Dans le navigateur, sans rien installer

Sur le dépôt Mdall : bouton **Code → Codespaces → Create codespace on main**. GitHub ouvre
un VS Code complet dans un onglet, sur une machine à eux — Java et Node y sont déjà, et les
dépendances s'installent toutes seules. **Rien ne touche votre ordinateur.**

Glissez un compte rendu dans l'explorateur de fichiers, puis, dans le terminal :

```
cd services/opendataloader
npm run essayer -- ../../mon-compte-rendu.pdf
```

Vous obtenez un `.md` à côté du PDF, et quelques nombres :

```
Écrit dans /workspaces/Mdall/mon-compte-rendu.md
  12 pages
  31 titres
  4 tableaux
  18 402 caractères
```

**Ouvrez le `.md` en regard du PDF.** Les tableaux tiennent-ils ? L'ordre est-il le bon ?
Les numéros de lot et les dates sont-ils intacts ? C'est à l'œil que ça se juge, et c'est là
que se décide la suite.

> Le document ne bouge pas : aucun réseau, aucun modèle, aucune clé. Un compte rendu réel
> peut donc passer ici. **Ne le laissez pas dans l'arbre du dépôt** pour autant — un
> Codespace tient un dépôt git, et un PDF glissé dedans peut finir dans un commit.
> Supprimez-le une fois la restitution lue.

Les comptes personnels ont un quota gratuit de Codespaces, sans carte bancaire. Le
Codespace s'arrête tout seul après une demi-heure d'inactivité et se rouvre à l'identique.

### Sur votre machine, si vous pouvez y installer des choses

Il faut Java 11 ou plus (`java -version`), puis :

```
cd services/opendataloader
npm install
npm run essayer -- mon-compte-rendu.pdf
```

---

## 2. Ensuite : le brancher à Mdall pour le voir en situation

Toujours depuis le Codespace, sans rien déployer.

### Lancer le service

```
cd services/opendataloader
npm start
```

VS Code affiche un onglet **Ports** avec le 8080. Clic droit dessus → **Port Visibility →
Public**. GitHub vous donne alors une adresse publique :

```
https://quelque-chose-8080.app.github.dev
```

Pour la vérifier, ouvrez-la avec `/sante` au bout : vous devez voir `{"ok":true}`.

> Cette adresse est **publique et sans mot de passe** tant que vous n'en posez pas. Pour un
> essai de quelques heures, avec une adresse tirée au hasard, c'est acceptable. Pour tenir
> plus longtemps, posez le mot de passe partagé — voir §3.

### Donner l'adresse à Mdall

Tableau de bord Supabase → votre projet → **Edge Functions → Secrets** :

| Name | Value |
| --- | --- |
| `OPENDATALOADER_URL` | l'adresse, **sans barre oblique finale** |

Puis redéployez la fonction, pour qu'elle relise les secrets :

```
supabase functions deploy reconstituer-par-loutil
```

> C'est le piège le plus fréquent : on pose le secret, on ne redéploie pas, et l'écran
> continue de dire « aucun outil n'est branché ».

Enfin : Atelier → **Lecture des comptes rendus** → déposez un PDF → onglet **Restitution**.
La colonne de droite doit se remplir, et les divergences avec le modèle se surligner.

---

## 3. Le mot de passe partagé

Dès que l'adresse vit plus de quelques heures, il en faut un : l'obscurité d'une adresse
n'est pas une protection.

Inventez une longue chaîne au hasard, puis posez-la **des deux côtés** :

| Où | Nom |
| --- | --- |
| Le service (variable d'environnement) | `JETON_PARTAGE` |
| Supabase (secret) | `OPENDATALOADER_TOKEN` |

Elles doivent être **identiques** — un espace de trop suffit à les séparer.

Sans `JETON_PARTAGE`, le service accepte tout le monde, et le crie à chaque démarrage :

```
[opendataloader] AUCUN MOT DE PASSE : ce service accepte tout le monde.
```

C'est délibéré : refuser dès le premier essai ferait passer une mise en service qui marche
pour une mise en service qui échoue, et l'on chercherait la panne pendant une heure.

**Il ne connaît personne pour autant.** Le mot de passe dit « cet appel vient de Mdall », il
ne dit pas *qui* — savoir qui reste le métier de la fonction Supabase, qui a vérifié
l'utilisateur avant d'appeler. Le service n'authentifie personne par lui-même.

---

## 4. Plus tard : un hébergement qui tient

Quand l'outil aura fait ses preuves et qu'un service permanent aura du sens.

| Hébergeur | Ce qu'il faut savoir |
| --- | --- |
| **Google Cloud Run** | Gratuit jusqu'à 2 millions de requêtes par mois, s'endort à zéro. Demande une carte bancaire à l'inscription, mais ne facture rien à ce volume. |
| **Hugging Face Spaces** | L'entête de ce fichier est prêt pour un Space Docker — mais **ils sont réservés au plan PRO** (9 $/mois) depuis 2026. Un compte gratuit ne peut pas en faire tourner. |
| N'importe quel autre | Le service tient dans le plus petit gabarit : ni GPU, ni mémoire particulière. |

**Une mise en garde, apprise à mes dépens.** Sur Cloud Run, ne déployez pas avec
`--no-allow-unauthenticated` : cette option exige un jeton d'identité Google dans chaque
appel, et le relais de Mdall n'en envoie pas. Vous obtiendriez « l'outil a refusé le
document » sans comprendre pourquoi. Déployez en accès ouvert, et laissez le mot de passe
partagé tenir la porte.

---

## Si ça ne marche pas

| Ce que l'écran dit | Ce qui se passe |
| --- | --- |
| « Aucun outil de restitution n'est branché » | `OPENDATALOADER_URL` est vide, ou la fonction n'a pas été redéployée |
| « L'outil a refusé le mot de passe » | `OPENDATALOADER_TOKEN` et `JETON_PARTAGE` diffèrent |
| « L'outil n'a pas répondu » | l'adresse est mauvaise, le port n'est pas public, ou le Codespace s'est arrêté |
| « L'outil a refusé le document » | le service a répondu en erreur — ses journaux disent quoi |
| « L'outil n'a rendu aucune page » | le Markdown est revenu sans marqueur de page |

Et `npm run essayer` qui ne produit rien : le PDF est probablement un **scan**. Sans OCR, il
ne porte aucun texte à restituer.

---

## Le contrat, si vous voulez brancher autre chose

```
POST /     Content-Type: application/pdf     →  { "markdown": "=== PAGE 1 ===\n…" }
           X-Mdall-Jeton: <le mot de passe>   ou  { "pages": [ { "page": 1, "markdown": "…" } ] }
GET  /sante                                  →  { "ok": true }
```

**Les pages sont obligatoires.** Un document rendu d'un seul bloc ne peut pas être aligné
contre la restitution du modèle, et l'écran afficherait « tout diverge » pour un document
identique.

Le découpage des marqueurs se fait dans `supabase/functions/_shared/markdown-de-loutil.js`,
et nulle part ailleurs : deux analyseurs pour une même convention finiraient par ne plus
dire la même chose.

---

## Les réglages

Ils vivent dans [`reglages.mjs`](reglages.mjs), **à un seul endroit** : l'essai en local et
le service en ligne les partagent. Juger la qualité sur d'autres réglages que ceux du
service reviendrait à décider de garder ou de jeter l'outil sur un résultat qui n'est pas le
sien.

Ce fichier dit ce que chacun fait et pourquoi celui-là.

---

## Ce qu'il ne fait pas

- **Il n'authentifie personne par lui-même.** Voir §3.
- **Il ne garde rien.** Le dossier temporaire est effacé après chaque conversion, réussie ou
  non.
- **Il ne sait pas lire un scan.** Sans OCR, un PDF d'images rend un document vide.
- **Il ne restitue pas les cellules fusionnées en Markdown.** Le format n'a ni `rowspan` ni
  `colspan` — voir `docs/reconstituer-un-document.md` §3.
