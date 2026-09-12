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

La colonne de droite est en place et attend une adresse. Elle n'en a **aucune par défaut**,
et n'en aura pas : un défaut enverrait le PDF d'un chantier à une adresse que personne n'a
choisie.

### Le contrat

Un service qui accepte un **PDF** en `POST` (corps brut, `Content-Type: application/pdf`) et
rend ses pages en Markdown, sous l'une des deux formes :

```json
{ "pages": [ { "page": 1, "markdown": "# …" }, { "page": 2, "markdown": "…" } ] }
```

ou du Markdown découpé par des marqueurs de page — la même convention qu'à l'aller :

```
=== PAGE 1 ===
# …
```

**Un document rendu sans pages n'est pas accepté** : il ne pourrait pas être aligné contre
l'autre restitution, et l'écran afficherait « tout diverge » pour un document identique.

### Le branchement

**Le service est écrit, dans [`services/opendataloader/`](../services/opendataloader/) :
un serveur, un `Dockerfile`, et un pas-à-pas.** Il n'y a rien à écrire, seulement à
déployer — voir [son README](../services/opendataloader/README.md).

En résumé : `npm start` pour l'essayer en local, `docker build` pour l'empaqueter, puis
`OPENDATALOADER_URL` dans les secrets Supabase et `supabase functions deploy
reconstituer-par-loutil`.

**Le service n'authentifie personne** : c'est la fonction Supabase qui tient la porte
(`requireUser`), et l'adresse ne descend jamais dans le navigateur. Il ne doit donc jamais
être exposé sur l'internet public — ce serait une conversion de PDF gratuite offerte au
monde entier, sur votre facture.

Tant que la variable est vide, l'écran l'écrit et affiche la marche à suivre. Il n'affiche
pas « aucune différence » : **« rien à comparer » n'est pas « les deux sont d'accord »**.

### Ce qu'on comparera

Trois comptes rendus, un rapport de contrôle, un CCTP. Les chiffres du §2 viennent de PDF
fabriqués pour ressembler aux nôtres, pas des nôtres. La décision se prend sur des documents
réels, à l'écran, en regardant les lignes surlignées.

### Ce qui reste après

**Le `.md` en base.** Aujourd'hui la restitution vit le temps de l'écran : redéposer le même
PDF la refait, et la repaie. Elle a sa place à côté du document, dans la chaîne Documents —
c'est là qu'un identifiant de document existe, et l'utilitaire de l'Atelier n'en a pas. Ce
sera une migration additive, et une lecture qui ne recommence pas.

## 5. Ce qui n'a pas été vérifié

- Les scores de Docling, MinerU et Marker sont **rapportés, pas mesurés** : ni Python ni GPU
  ici pour les essayer.
- Le banc d'OpenDataLoader est **publié par son équipe** ; méthodologie ouverte, mais à lire
  avec la réserve d'usage.
- Les nombres d'étoiles sont approximatifs (l'API GitHub n'était pas joignable).
- Les tests « mesurés » portent sur des **PDF fabriqués**, pas sur de vrais documents du
  projet.
