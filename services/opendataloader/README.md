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
consommé**. C'est la colonne de droite de l'écran *Restitution*, celle qui sert à juger si
l'appel payant de gauche est encore nécessaire.

> L'entête ci-dessus est celui d'un **Space Hugging Face**. Il est sans effet ailleurs :
> gardez-le, il ne gêne aucun autre hébergeur.

---

## Mettre en service sur Hugging Face Spaces

Gratuit, sans carte bancaire, **entièrement au navigateur**. Rien à installer.

### 1. Créer le Space

Sur [huggingface.co](https://huggingface.co), créez un compte si vous n'en avez pas, puis
**New → Space**.

| Champ | Ce qu'il faut mettre |
| --- | --- |
| Space name | `mdall-opendataloader` |
| License | `apache-2.0` |
| Space SDK | **Docker** → *Blank* |
| Hardware | **CPU basic**, le gratuit |
| Visibilité | **Public** |

> **Public, et c'est voulu.** Un Space privé n'accepte que les appels porteurs d'un jeton
> Hugging Face, que Mdall n'envoie pas. La porte de ce service, c'est le mot de passe
> partagé de l'étape 3 — pas la visibilité du Space.

### 2. Y poser les quatre fichiers

Onglet **Files → Add file → Create a new file**, puis recopiez depuis
`services/opendataloader/` du dépôt Mdall :

- `Dockerfile`
- `package.json`
- `serveur.mjs`
- `README.md` — **celui-ci**, avec son entête `---` en tête. C'est lui qui dit à Hugging
  Face d'écouter sur le port 8080 ; sans lui, le Space cherchera le 7860 et ne répondra
  jamais.

Le Space se construit tout seul. Comptez quelques minutes la première fois : il installe un
JRE et la bibliothèque. L'onglet **Logs** montre l'avancement, et **App** l'état.

### 3. Poser le mot de passe partagé

Inventez une longue chaîne au hasard — quarante caractères, ni un mot ni une date.

Dans le Space : **Settings → Variables and secrets → New secret**

| | |
| --- | --- |
| Name | `JETON_PARTAGE` |
| Value | votre chaîne |

Le Space redémarre. Dans ses **Logs**, la ligne `AUCUN MOT DE PASSE` doit avoir disparu.

> Sans ce secret, le service **accepte tout le monde** — et le crie au démarrage. C'est
> délibéré : refuser dès le premier essai ferait passer une mise en service qui marche pour
> une mise en service qui échoue. Mais le laisser ainsi, c'est offrir de la conversion de
> PDF au monde entier.

### 4. Relever l'adresse

Elle se déduit de votre nom d'utilisateur et du nom du Space :

```
https://VOTRE-NOM-mdall-opendataloader.hf.space
```

Pour la vérifier, ouvrez `https://VOTRE-NOM-mdall-opendataloader.hf.space/sante` dans un
onglet. Vous devez voir `{"ok":true}`. **Si vous voyez ça, le service tourne.**

### 5. Donner l'adresse et le mot de passe à Mdall

Tableau de bord Supabase → votre projet → **Edge Functions → Secrets** (ou *Project
Settings → Edge Functions*) :

| Name | Value |
| --- | --- |
| `OPENDATALOADER_URL` | l'adresse de l'étape 4, **sans barre oblique finale** |
| `OPENDATALOADER_TOKEN` | **exactement** la même chaîne qu'à l'étape 3 |

Puis redéployez la fonction, pour qu'elle relise les secrets :

```
supabase functions deploy reconstituer-par-loutil
```

> C'est le piège le plus fréquent : on pose les secrets, on ne redéploie pas, et l'écran
> continue de dire « aucun outil n'est branché ».

### 6. Vérifier à l'écran

Atelier → **Lecture des comptes rendus** → déposez un PDF → onglet **Restitution**.

La colonne de droite doit se remplir.

---

## Si ça ne marche pas

| Ce que l'écran dit | Ce qui se passe |
| --- | --- |
| « Aucun outil de restitution n'est branché » | `OPENDATALOADER_URL` est vide, ou la fonction n'a pas été redéployée |
| « L'outil a refusé le mot de passe » | `OPENDATALOADER_TOKEN` et `JETON_PARTAGE` diffèrent — un espace de trop suffit |
| « L'outil n'a pas répondu » | l'adresse est mauvaise, ou le Space dormait : rouvrez sa page et réessayez |
| « L'outil a refusé le document » | le service a répondu en erreur — ses **Logs** disent quoi |
| « L'outil n'a rendu aucune page » | le Markdown est revenu sans marqueur de page |

Un Space gratuit s'endort après plusieurs jours sans appel. Le premier appel au réveil peut
dépasser les deux minutes que le relais accorde : ouvrez la page du Space, attendez qu'elle
affiche *Running*, et redéposez le PDF.

---

## Ailleurs qu'à Hugging Face

N'importe quel hébergeur d'images Docker fait l'affaire. Le service tient dans le plus
petit gabarit : ni GPU, ni mémoire particulière.

**Une mise en garde, apprise à mes dépens.** Sur Google Cloud Run, ne déployez pas avec
`--no-allow-unauthenticated` : cette option exige un jeton d'identité Google dans chaque
appel, et le relais de Mdall n'en envoie pas. Vous obtiendriez « l'outil a refusé le
document » sans comprendre pourquoi. Déployez en accès ouvert, et laissez le mot de passe
partagé tenir la porte.

### Pour un essai sans rien déployer

Si vous pouvez installer des choses sur votre machine :

```
cd services/opendataloader
npm install
npm start
curl -X POST --data-binary @CR_07.pdf -H "Content-Type: application/pdf" http://localhost:8080/
```

Il faut Java 11 ou plus (`java -version`). Supabase ne sait pas joindre votre machine : pour
l'y relier, il faut un tunnel qui fabrique une adresse publique temporaire.

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

- **Il ne connaît personne.** Le mot de passe dit « cet appel vient de Mdall » ; il ne dit
  pas *qui*. Savoir qui reste le métier de la fonction Supabase, qui a vérifié
  l'utilisateur avant d'appeler. Le service n'authentifie personne par lui-même.
- **Il ne garde rien.** Le dossier temporaire est effacé après chaque conversion, réussie ou
  non.
- **Il ne sait pas lire un scan.** Sans OCR, un PDF d'images rend un document vide.
- **Il ne restitue pas les cellules fusionnées en Markdown.** Le format n'a ni `rowspan` ni
  `colspan` — voir `docs/reconstituer-un-document.md` §3.
