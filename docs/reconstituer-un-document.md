# Reconstituer un document, et ce que d'autres savent déjà faire

**À quoi sert cette page.** Mdall relit des comptes rendus de chantier, des rapports de
bureau de contrôle et des CCTP. Avant d'en tirer quoi que ce soit, il faut savoir si le
document a été **lu**. Cette page dit comment on le regarde aujourd'hui, et ce que des
bibliothèques existantes font déjà mieux que ce qu'on écrirait nous-mêmes.

---

## 1. Ce qu'on fait aujourd'hui

Le bouton **« Afficher .md »** de l'utilitaire *Lecture des comptes rendus* demande au
modèle de refaire le document, page par page, en Markdown, et l'affiche en trois lectures
— **Aperçu**, **Code**, **Origine** — les mêmes que celles de l'onglet Mémoire.

C'est une **transcription**, pas une lecture : la consigne interdit de résumer, de
reformuler et de compléter. Elle vit au serveur
(`supabase/functions/reconstituer-en-markdown`), comme les autres.

Deux garde-fous s'affichent au-dessus du document :

- **Les mots retrouvés** — ceux du PDF qui reparaissent dans la reconstitution. Ce qui
  manque est du texte perdu en route.
- **Les mots ajoutés** — ceux que le modèle a écrits et que le document ne portait pas.
  C'est le chiffre qui compte : un document reformulé se lit parfaitement.

Ni l'un ni l'autre ne dit rien de **l'ordre** ni de la forme des tableaux : deux colonnes
interverties gardent exactement les mêmes mots. Cela se juge à l'œil, et c'est pourquoi le
document s'affiche.

**Ce que ça coûte.** Un second appel sur le même document, à peu près au prix du premier.
Il n'est donc jamais lancé au dépôt — seulement sur le bouton — et il se dépose au compteur
sous sa propre nature, « Document refait en Markdown », visible dans *Factures et
abonnements* (fondamental 13).

---

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

## 4. Ce qu'on ferait, si on décide de ne plus passer par le modèle

Rien n'est engagé. Écrit ici pour qu'on n'ait pas à refaire la recherche.

1. **Un conteneur OpenDataLoader-Java**, appelé par une fonction Deno qui ne fait que
   relayer. Sortie `--format markdown,json` : le Markdown pour l'affichage, le JSON pour la
   page, la boîte et les fusions. Le reste de l'écran ne bouge pas — il reçoit déjà
   `{page, markdown}`.
2. **Comparer sur de vrais documents** avant de trancher : trois comptes rendus, un rapport
   de contrôle, un CCTP. Les chiffres ci-dessus viennent de PDF fabriqués pour ressembler
   aux nôtres, pas des nôtres.
3. **Docling en renfort**, seulement si les CCTP à tableaux sans bordures posent
   effectivement problème : il est le moteur du mode hybride d'OpenDataLoader, et s'ajoute
   sans rien changer côté navigateur.

**Le gain attendu n'est pas la qualité, c'est le prix et la stabilité** : zéro appel payant
par reconstitution, et un résultat identique d'une fois sur l'autre — là où le modèle
reformule différemment à chaque passage.

---

## 5. Ce qui n'a pas été vérifié

- Les scores de Docling, MinerU et Marker sont **rapportés, pas mesurés** : ni Python ni GPU
  ici pour les essayer.
- Le banc d'OpenDataLoader est **publié par son équipe** ; méthodologie ouverte, mais à lire
  avec la réserve d'usage.
- Les nombres d'étoiles sont approximatifs (l'API GitHub n'était pas joignable).
- Les tests « mesurés » portent sur des **PDF fabriqués**, pas sur de vrais documents du
  projet.
