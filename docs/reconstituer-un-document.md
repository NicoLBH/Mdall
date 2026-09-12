# Reconstituer un document, et ce que d'autres savent déjà faire

**À quoi sert cette page.** Mdall relit des comptes rendus de chantier, des rapports de
bureau de contrôle et des CCTP. Avant d'en tirer quoi que ce soit, il faut savoir si le
document a été **lu**. Cette page dit comment on le regarde aujourd'hui, et ce que des
bibliothèques existantes font déjà mieux que ce qu'on écrirait nous-mêmes.

---

## 1. Le procédé

    PDF  →  restitution en Markdown  →  un seul appel au modèle  →  les points

**La restitution vient d'abord, et c'est elle que le modèle relit.** Les points ne sont
plus tirés du texte brut du PDF : ils sont tirés du document restitué, que l'on a sous les
yeux dans l'onglet *Restitution*. On sait donc exactement sur quoi le modèle s'est fondé —
et quand un relevé déçoit, on peut dire si le document a été mal lu, ou bien lu et mal
exploité. Sans cela, les deux causes sont indiscernables et l'on corrige à l'aveugle.

Les citations sont vérifiées contre **ces mêmes pages** : une citation se vérifie contre ce
que le modèle a eu sous les yeux, pas contre un autre texte.

Quand la restitution n'aboutit pas, le relevé se fait sur le texte brut **plutôt que de ne
pas se faire** — et l'écran l'écrit en toutes lettres, au-dessus du relevé. Se rabattre en
silence rendrait la source indevinable, c'est-à-dire exactement le défaut qu'on corrige.

### L'écran, en deux onglets

**Restitution** porte le document, **Analyse** porte ce qu'on en a tiré. C'est l'ordre du
procédé : ce qu'on relève n'a de sens que sur ce qui a été lu.

### Deux restitutions, côte à côte

| | À gauche | À droite |
| --- | --- | --- |
| Qui | le modèle | un outil, sans modèle |
| Ce que ça coûte | **un appel par document** | **rien** |
| Aujourd'hui | marche | à brancher (§4) |

**Pourquoi deux.** Un document refait par un modèle se lit très bien, même quand il est
faux : c'est tout le problème. Le seul juge fiable serait le PDF, mais le relire ligne à
ligne est exactement le travail qu'on cherche à éviter. Une seconde restitution, obtenue
autrement, donne un juge praticable : **là où les deux s'accordent, il n'y a rien à
vérifier ; là où elles divergent, l'une se trompe.** La comparaison ne dit pas laquelle a
raison — elle dit où regarder.

Et elle sert à décider quelque chose de précis : si l'outil vaut le modèle sur des documents
réels, la colonne de gauche disparaît, et **lire un compte rendu ne coûte plus qu'un seul
appel** — celui qui relève les points.

Les lignes sont alignées page par page. Une ligne que l'une porte et que l'autre n'a pas est
surlignée. Un même texte écrit autrement — un titre d'un côté, du gras de l'autre — n'est
pas compté comme une divergence : il noierait les vraies.

### Trois lectures, celles de la Mémoire

**Aperçu** (mis en page) · **Code** (le Markdown tel quel) · **Origine** (chaque ligne en
face de la page du PDF dont elle sort). Cette provenance est *calculée* à partir du
découpage page par page : une page déclarée par celui qu'on vérifie ne vérifierait rien.

### Deux chiffres par colonne

- **Les mots retrouvés** — ceux du PDF qui reparaissent dans la restitution. Ce qui manque
  est du texte perdu en route.
- **Les mots ajoutés** — ceux que la restitution porte et que le PDF ne portait pas. C'est
  le chiffre qui compte : un document reformulé se lit parfaitement.

Ni l'un ni l'autre ne dit rien de **l'ordre** ni de la forme des tableaux : deux colonnes
interverties gardent exactement les mêmes mots. Cela se juge à l'œil, et c'est pourquoi le
document s'affiche.

### Ce qui n'a pas été couvert se dit

Les pages qui n'ont pas tenu sous le plafond d'entrée, celles dont rien n'est revenu, une
réponse coupée en cours de route : tout cela s'affiche **au-dessus** du document, avant
qu'on se mette à le lire. Un document amputé se lit très bien, et rien dans ce qui reste ne
dit que le reste manque.

### Ce que ça coûte

La restitution par le modèle se dépose au compteur sous sa propre nature, « Document refait
en Markdown », visible dans *Factures et abonnements*. Elle n'est plus à la demande : elle
est le premier temps du procédé, et c'est sur elle que les points sont relevés
(fondamental 13).

La restitution par l'outil ne consomme rien, et ne dépose donc rien.

**Et le prix de la requête s'affiche sur la colonne**, en pastille, à côté de « un appel par
document ». Le compteur dit ce qu'un mois a coûté ; il ne dit pas ce que *cette* lecture a
coûté, au moment précis où l'on décide si elle valait la peine. Un prix qu'il faut aller
chercher dans un autre écran n'entre jamais dans la décision. Le survol donne le détail :
jetons d'entrée, jetons de sortie, modèle, date du tarif et du taux de change.

Trois réponses possibles, et elles ne se confondent pas : un montant ; « coût non annoncé »
quand le fournisseur n'a rien rendu ; « tarif inconnu » quand le modèle n'a pas de prix
relevé. Aucune ne devient zéro — un zéro se lirait « gratuit ».

## 2. Ce que d'autres font déjà

Relevé en septembre 2026. Les chiffres TEDS viennent des bancs cités ; ceux marqués
« mesuré » ont été essayés sur des PDF de test fabriqués pour ressembler aux nôtres —
compte rendu à tableau bordé, tableau à cellules fusionnées, CCTP à tableau sans bordures,
page en deux colonnes.

| Outil | Licence | Tourne où | Tableaux | Verdict |
| --- | --- | --- | --- | --- |
| [OpenDataLoader PDF](https://github.com/opendataloader-project/opendataloader-pdf) | Apache-2.0 | Java, 0,66 s/page, sans GPU | **Bordés : excellent (mesuré).** Sans bordures : TEDS 0,489 | **Le meilleur candidat** |
| [Docling](https://github.com/docling-project/docling) (IBM) | MIT | Python + PyTorch, ~3,1 s/page | TEDS 0,887 | Le plus sûr, mais lourd |
| [MinerU](https://github.com/opendatalab/MinerU) | maison (seuils commerciaux) | Python + GPU, 16 Go RAM | TEDS 0,873, **fusionne les tableaux à cheval sur deux pages** | Si les scans dominent |
| [Marker](https://github.com/datalab-to/marker) | Apache-2.0, poids non commerciaux | Python + GPU | TEDS 0,808 | Licence des poids à lire |
| [MuPDF WASM](https://github.com/ArtifexSoftware/mupdf.js) | **AGPL-3.0** | **Navigateur**, 24 ms/page | Bordés : bon (mesuré). Sans bordures : casse le tableau en deux | Le seul candidat navigateur |
| [pdf.js](https://github.com/mozilla/pdf.js) / [unpdf](https://github.com/unjs/unpdf) | Apache-2.0 / MIT | **Navigateur et Deno** | **Aucune** détection | Déjà employé ici pour le texte |
| [MarkItDown](https://github.com/microsoft/markitdown) (Microsoft) | MIT | Python | TEDS 0,273 | 180 k étoiles, et son README dit lui-même qu'il n'est pas fait pour la fidélité |
| [PyMuPDF4LLM](https://github.com/pymupdf/PyMuPDF4LLM) | AGPL-3.0 | Python | TEDS 0,401 | Non |
| [Unstructured](https://github.com/Unstructured-IO/unstructured) | Apache-2.0 | Python | TEDS 0,000 en mode standard | Non |
| [Nougat](https://github.com/facebookresearch/nougat) (Meta) | MIT + poids CC-BY-NC | Python | Conçu pour arXiv | Non maintenu |
| [Zerox](https://github.com/getomni-ai/zerox) | MIT | Node et Deno | Bon | **C'est un appel payant à un modèle** — exactement ce qu'on cherche à éviter |
| LlamaParse | SaaS payant | API | Bon | Hors contrainte |

### Ce qui ressort

**OpenDataLoader PDF** est le seul qui coche tout : Apache-2.0 franc, pas de Python, pas de
PyTorch, pas de GPU, pas de modèle à télécharger — un JRE et 24 Mo, 0,66 s par page,
démarrage à froid quasi nul. Il sait sortir `--markdown-page-separator "%page-number%"`
(les numéros de page, dont on a justement besoin pour la lecture *Origine*) et un JSON où
chaque élément porte sa page, sa boîte, son niveau de titre et ses `row span` /
`column span`.

**La nuance honnête** : son meilleur score (TEDS 0,928) n'est **pas** celui du mode Java
gratuit. Il vient du mode hybride, qui appelle Docling et redemande donc un service Python.
Le mode Java seul plafonne à 0,489 — très bon sur les comptes rendus à tableaux bordés,
insuffisant sur les CCTP à tableaux sans bordures.

**MuPDF WASM** est le seul qui tournerait dans le navigateur, sans que le PDF quitte le
poste. Deux réserves sérieuses : il est **AGPL-3.0** — ce qui contaminerait une application
servie publiquement — et il casse les tableaux sans bordures.

---

## 3. Ce qu'aucune de ces bibliothèques ne fait

1. **Les tableaux à cellules fusionnées, en Markdown : aucune, jamais.** Ce n'est pas un
   défaut d'implémentation, c'est le format : la syntaxe des tableaux Markdown n'a ni
   `rowspan` ni `colspan`. La seule voie est du HTML dans le Markdown, ou le JSON.
2. **Les tableaux sans bordures sont un échec général** en mode gratuit et rapide.
   Seuls les modèles de mise en page ou les modèles de vision y arrivent — et ce sont eux
   qui coûtent un GPU ou une clé.
3. **L'OCR de scans médiocres reste mauvais partout.** Sur le banc français
   [fr-bench-pdf2md](https://github.com/ld-lab-pulsia/benchpdf2md), catégorie manuscrits,
   les meilleurs modèles libres tombent sous 0,15.
4. **Les colonnes cassent en silence.** Ordre de lecture correct la plupart du temps, puis
   un paragraphe coupé en deux sans que rien ne le dise. On ne le sait qu'en regardant —
   ce qui est précisément la raison d'être de l'écran.
5. **La mise en page riche est perdue par construction** : encadrés, filigranes, tampons de
   visa, annotations manuscrites en marge, cases à cocher. Rien de tout cela n'a de
   représentation Markdown.
6. **Personne ne garantit l'absence d'invention** dès qu'un modèle de vision intervient.
   Sur des quantitatifs de CCTP ou des délais de levée de réserves, c'est un risque métier,
   pas théorique. C'est la raison du compteur de **mots ajoutés**.

---

## 4. Brancher l'outil

**Le service est écrit, dans [`services/opendataloader/`](../services/opendataloader/)**, et
son [mode d'emploi](../services/opendataloader/README.md) mène l'affaire pas à pas. Ce qui
suit dit seulement dans quel ordre, et pourquoi cet ordre.

### La visée : l'outil en piste principale, le modèle en secours

Ce n'est pas une colonne de comparaison qu'on ajoute par curiosité. **L'outil doit devenir
la lecture ordinaire, et le modèle le secours** — appelé quand l'outil échoue, sur un scan
ou une mise en page qu'il ne sait pas démêler.

Deux raisons, et la seconde pèse plus que la première :

- **le prix** : un document lu ne coûte plus rien, et la facture d'IA de Mdall cesse de
  croître avec le nombre de comptes rendus ;
- **la solidité** : un service dont la lecture ne dépend pas d'un fournisseur payant est un
  service qui tient. Une panne d'OpenAI, un changement de tarif, une clé révoquée — rien de
  tout cela n'arrête plus la lecture des documents.

L'écran, lui, ne change pas encore : il compare les deux. **C'est la comparaison qui dira si
le renversement est tenable**, document réel après document réel.

### L'ordre, et il n'est pas celui qu'on croit

**1. Juger la qualité, sans rien héberger.** `npm run essayer -- un-compte-rendu.pdf` rend
le `.md` à côté du PDF. On les met en regard, et l'on voit. C'est la seule question qui
décide, et elle ne demande ni serveur, ni compte, ni carte bancaire. Dans un **Codespace**,
elle ne demande même pas d'installer quoi que ce soit.

**2. Le voir en situation**, toujours depuis le Codespace : lancer le service, rendre le
port public, poser `OPENDATALOADER_URL` dans les secrets Supabase, redéployer
`reconstituer-par-loutil`. L'écran *Restitution* se remplit à droite, et les divergences se
surlignent.

**3. Héberger, seulement ensuite.** Quand l'outil aura fait ses preuves.

### Sur l'hébergement, deux choses apprises à mes dépens

**Hugging Face Spaces ne convient pas à un compte gratuit** : les Spaces Docker sont
réservés au plan PRO (9 $/mois) depuis 2026. L'entête du mode d'emploi reste prêt pour le
jour où — il ne gêne aucun autre hébergeur.

**Sur Cloud Run, pas de `--no-allow-unauthenticated`** : cette option exige un jeton
d'identité Google dans chaque appel, que le relais n'envoie pas. C'est le mot de passe
partagé qui tient la porte, pas la configuration de l'hébergeur.

### Le mot de passe partagé

`JETON_PARTAGE` côté service, `OPENDATALOADER_TOKEN` côté Supabase, identiques. L'obscurité
d'une adresse n'est pas une protection. Il dit « cet appel vient de Mdall » — il ne dit pas
*qui*, et n'a pas à le dire : la fonction Supabase a déjà vérifié l'utilisateur.

Le service n'en a **aucun par défaut**, et n'en aura pas : un mot de passe écrit dans le
dépôt n'en est pas un. Sans lui il accepte tout le monde, et le crie à chaque démarrage.

### Tant que rien n'est branché

L'écran l'écrit et affiche la marche à suivre. Il n'affiche pas « aucune différence » :
**« rien à comparer » n'est pas « les deux sont d'accord »**.

### Ce qui reste après

**Le `.md` en base.** Aujourd'hui la restitution vit le temps de l'écran : redéposer le même
PDF la refait, et la repaie. Elle a sa place à côté du document, dans la chaîne Documents —
c'est là qu'un identifiant de document existe, et l'utilitaire de l'Atelier n'en a pas. Ce
sera une migration additive, et une lecture qui ne recommence pas.

**Le renversement.** Le jour où la comparaison aura tranché : l'outil d'abord, le modèle en
secours, et la nature « Document refait en Markdown » disparaîtra de la plupart des
factures.

## 5. Ce qui n'a pas été vérifié

- Les scores de Docling, MinerU et Marker sont **rapportés, pas mesurés** : ni Python ni GPU
  ici pour les essayer.
- Le banc d'OpenDataLoader est **publié par son équipe** ; méthodologie ouverte, mais à lire
  avec la réserve d'usage.
- Les nombres d'étoiles sont approximatifs (l'API GitHub n'était pas joignable).
- Les tests « mesurés » portent sur des **PDF fabriqués**, pas sur de vrais documents du
  projet.
