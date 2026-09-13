/**
 * Refaire un document en Markdown, fidèlement.
 *
 * ## Ce que cette consigne demande, et ce qu'elle interdit
 *
 * Elle demande une **transcription structurée**, pas une lecture. Le modèle ne
 * doit rien choisir, rien résumer, rien conclure : il remet en forme ce qui est
 * écrit, dans l'ordre où c'est écrit, avec les tableaux en tableaux et les
 * titres en titres.
 *
 * ## Ce qu'elle autorise, et c'est nouveau
 *
 * La mise en page. Le modèle peut ajouter des titres, des listes, des niveaux
 * d'imbrication — **pas un mot**. Car un compte rendu de chantier est une
 * arborescence qui ne dit pas son nom : lot, entreprise, point, reprises des
 * semaines suivantes. Le document l'écrit à plat ; la rendre explicite ici
 * évite aux appels suivants de la deviner, et ils devinent moins bien.
 *
 * C'est un jugement, et donc un risque : la porte ouverte à la mise en page est
 * une porte par laquelle du texte peut entrer. Les mesures de
 * `degats-de-la-restitution.js` la surveillent — mots ajoutés, titres inventés,
 * blocs déplacés.
 *
 * ## Deux interdits ajoutés après mesure
 *
 * Sur un compte rendu réel de onze pages, la restitution était excellente — mais
 * elle a fait deux choses qu'on ne lui demandait pas :
 *
 * - **elle a inventé des titres** : « Rapport du : 30/03/2026 Page 1 » ne figure
 *   nulle part dans le document ;
 * - **elle a réordonné une page** : les tableaux d'intervenants sont passés
 *   avant le titre de la réunion, qui les précède dans le PDF.
 *
 * Aucune des deux n'est grave en soi. Les deux le deviennent quand on s'y fie :
 * un titre inventé devient une rubrique de sujet qui n'existe pas, et un ordre
 * changé fait perdre la trace de ce qui suit quoi. Les règles étaient
 * silencieuses là-dessus — elles ne le sont plus, et deux mesures vérifient
 * qu'elles sont tenues (`degats-de-la-restitution.js`).
 *
 * C'est l'inverse exact de la consigne d'extraction, qui elle demande de
 * juger. Les mélanger donnerait un document déjà interprété, dans lequel on ne
 * pourrait plus distinguer ce que le PDF disait de ce que le modèle en a
 * compris — et c'est précisément cette distinction qu'on vient voir.
 *
 * ## Pourquoi page par page
 *
 * Pour que chaque ligne du résultat puisse être mise en face de la page dont
 * elle sort. Un document rendu d'un bloc obligerait à **demander** au modèle de
 * quelle page vient chaque passage : une provenance déclarée par celui-là même
 * qu'on vérifie ne vérifie rien.
 *
 * Elle vit au serveur avec le reste : la consigne dit ce que Mdall sait lire
 * d'un document de chantier, et cela ne descend pas dans le navigateur.
 */

export const CONSIGNES_DE_RECONSTITUTION = `Tu reçois un document PDF de chantier (compte rendu de réunion, rapport de bureau de contrôle, CCTP, notice), page par page, découpé par des marqueurs "=== PAGE n ===".

Le texte de chaque page t'est donné REPOSÉ SUR SA GRILLE : les fragments sont placés aux colonnes que leurs coordonnées réelles dans le PDF leur donnent. Ce qui est aligné verticalement dans ce que tu reçois était aligné verticalement dans le document. Les espaces entre deux blocs d'une même ligne sont des SÉPARATIONS DE COLONNES, pas des espaces de texte. Une ligne décalée vers la droite était indentée.

Certaines pages peuvent arriver en texte simple, non reposé, quand la géométrie n'a pas pu être lue : elles se reconnaissent à l'absence d'alignement. Traite-les au mieux, sans inventer de colonnes.

Une page peut être suivie d'un bloc "--- MISES EN ÉVIDENCE DE CETTE PAGE ---" qui donne les passages en gras, en italique et en couleur. Ils ne sont pas du texte en plus : ce sont les mêmes passages, avec ce que la grille ne peut pas montrer.

Ta tâche : restituer ce document en Markdown, page par page, le plus fidèlement possible.

COMMENCE PAR IDENTIFIER LA STRUCTURE DE LA PAGE, AVANT DE TRANSCRIRE QUOI QUE CE SOIT.

Un compte rendu de chantier est presque toujours un tableau, déclaré ou déguisé. Il suit le plus souvent cet ordre : la référence du chantier, le tableau des intervenants, une série de généralités reprises de compte rendu en compte rendu (consignes pour le bon fonctionnement du chantier), puis les remarques regroupées par lot, sous forme d'un tableau plus ou moins formalisé.

Les colonnes étroites de droite portent des dates, et chacune a un sens différent :
- "Date" ou "Le" : la date à laquelle la remarque est entrée au compte rendu ;
- "Pour le", "Échéance", "Délai" : la date à laquelle elle doit être traitée ;
- "Fait le", "Levé le", "Soldé le" : la date à laquelle elle a été fermée.

C'est là qu'est le piège principal, et il est grave. Une cellule de gauche tient souvent sur plusieurs lignes, pendant que la cellule de droite n'en occupe qu'une. Si tu lis ligne à ligne au lieu de lire colonne par colonne, tu insères la date au milieu de la phrase de gauche : la phrase perd son sens, et la date perd la sienne — on ne sait plus à quelle remarque elle se rapporte. RECONSTITUE CHAQUE CELLULE ENTIÈRE AVANT DE PASSER À LA COLONNE SUIVANTE.

Règles impératives :
- Ne résume pas. Ne reformule pas. Ne complète pas. Ne corrige pas.
- Reprends les mots du document tels qu'ils sont écrits, y compris les fautes.
- N'AJOUTE AUCUN TITRE. N'écris que les titres qui figurent dans le document, mot pour mot. N'invente pas d'en-tête de page, de numéro de page, de date de rapport, ni de titre de section pour organiser ce que tu rends. Si un passage n'a pas de titre dans le document, il n'en a pas non plus dans ta restitution.
- GARDE L'ORDRE DU DOCUMENT, du haut de la page vers le bas. Ne déplace rien, même si un autre ordre te semble plus logique : ni un titre vers la fin, ni un tableau vers le début. Un bloc placé en haut d'une page se restitue en premier.
- Les nombres, dates, cotes, références, numéros de lot et noms propres se recopient caractère pour caractère.
- CE QUI EST UN TABLEAU RESTE UN TABLEAU. Restitue-le en tableau Markdown (format GitHub, avec la ligne de séparation), jamais en liste ni en paragraphe. C'est vrai en particulier du tableau des contacts et du tableau des présences : ce sont les seuls endroits où les coordonnées d'un intervenant sont réunies, et une colonne perdue est une information perdue. Si une cellule est fusionnée, répète sa valeur sur les lignes concernées plutôt que de laisser du vide. Si une cellule contient plusieurs informations (un nom, une entreprise, une adresse, un courriel, un téléphone), garde-les dans la même cellule, séparées par des retours à la ligne.
- Restitue les titres en titres (#, ##, ###), les listes en listes, les mentions en gras ou souligné du document en gras Markdown.
- TU PEUX CLARIFIER LA MISE EN PAGE, JAMAIS LES MOTS. Tu peux ajouter des titres Markdown, des listes, des niveaux d'imbrication et des tableaux pour rendre visible une structure que le document porte sans la montrer. Tu ne peux pas ajouter, retirer ni changer un seul mot, et tu ne peux pas changer l'ordre.
- FAIS ÉMERGER LA STRUCTURE IMPLICITE. Un compte rendu de chantier est une arborescence qui ne dit pas son nom : un lot, l'entreprise qui le tient, ses points à traiter, et sous chaque point les mises à jour des réunions suivantes. Quand un point daté est suivi de reprises datées plus récentes, imbrique les reprises sous le point. Quand des points appartiennent à un même lot, groupe-les sous le titre de ce lot. L'imbrication est un déplacement d'indentation, pas un déplacement de contenu : l'ordre de lecture reste celui du document.
- REGROUPE LES REMARQUES PAR LOT. Un compte rendu découpe le chantier en lots, et chaque lot porte sa liste de remarques. Le titre du lot tel qu'il est écrit devient un titre Markdown, et ses remarques se rangent dessous.
- LES LISTES CRANTÉES SONT DES LISTES. Une liste de chantier est rarement numérotée : elle se tient par un décalage d'alignement. Chaque niveau d'indentation que tu vois dans la grille devient un niveau de liste Markdown. Perdre ce décalage, c'est perdre le regroupement : une reprise indentée sous une remarque appartient à cette remarque, et remise à plat elle devient une remarque indépendante qui n'existe pas.
- LES FLÈCHES SONT DES LIENS, PAS DE LA PONCTUATION. "->", "→", "=>" marquent une dépendance ou un renvoi entre deux points. Recopie-les telles quelles, sur la même ligne que ce qu'elles relient. Ne les remplace pas par un tiret et ne les mets pas à la ligne.
- REPRODUIS LES COULEURS. Un passage en couleur est hiérarchisé par son auteur : "à faire" en bleu, "présence obligatoire au prochain rendez-vous" en rouge. Quand le bloc "MISES EN ÉVIDENCE" donne une couleur, rends le passage dans un encadré nommé par cette couleur, sur le modèle GitHub :
> [!ROUGE]
> Présence obligatoire au prochain rendez-vous
  Les noms admis sont ROUGE, BLEU, VERT, ORANGE, JAUNE, VIOLET, ROSE, GRIS. N'invente pas de couleur : n'en écris une que si le bloc des mises en évidence la donne. Ne traduis pas la couleur en gravité — écris la couleur, pas "important" ni "urgent" : ce serait une interprétation, et elle serait irréversible. Un passage seulement en gras ou en italique se rend en gras ou en italique Markdown, pas en encadré.
- SERS-TOI DE TOUTE LA MISE EN PAGE DU MARKDOWN : titres de niveaux 1 à 6, gras, italique, paragraphes, listes à puces, listes numérotées, listes imbriquées, tableaux, citations, encadrés. Un document de chantier est dense et hiérarchisé ; une transcription en paragraphes plats est illisible et perd la hiérarchie que le document portait.
- Les en-têtes et pieds de page répétés à chaque page se restituent une seule fois, sur la page où ils apparaissent.
- Si un passage est illisible ou incohérent dans le texte extrait, écris-le tel quel. N'invente pas ce qui manque, et ne signale rien : le document refait ne contient que le document.
- Une page sans contenu lisible rend une chaîne vide.
- Rends une entrée par page reçue, avec son numéro, et aucune page de plus.`;

/** Ce que le modèle doit rendre, et rien d'autre. */
export const SCHEMA_DU_DOCUMENT = {
  name: "document_en_markdown",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      pages: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            page: { type: "integer" },
            markdown: { type: "string" }
          },
          required: ["page", "markdown"]
        }
      }
    },
    required: ["pages"]
  }
};

/**
 * Les pages que le texte envoyé au modèle contient réellement.
 *
 * `pagesEnTexte` s'arrête à un plafond de caractères, **en silence** : un CCTP
 * de soixante pages part amputé, et le modèle rendrait alors très fidèlement un
 * document tronqué. On relit donc les marqueurs du texte qui part, plutôt que
 * de refaire le calcul de la coupe — deux calculs finiraient par diverger
 * (règle 4).
 */
export function pagesDuTexte(texte = "") {
  const pages = [];
  for (const trouve of String(texte ?? "").matchAll(/^=== PAGE (\d+) ===$/gm)) {
    pages.push(Number(trouve[1]));
  }
  return pages;
}

/**
 * Ce que le modèle a rendu, ramené à ce qu'on sait vérifier.
 *
 * Une page rendue sous un numéro qu'on n'a pas envoyé est écartée : elle ne
 * peut être confrontée à rien, et la laisser passer ferait afficher comme
 * « document » une page que le document ne contient pas.
 */
export function pagesRefaites(payload, envoyees = []) {
  const connues = new Set(envoyees.map((numero) => Number(numero)));
  const vues = new Set();
  const retenues = [];
  const inconnues = [];

  for (const page of Array.isArray(payload?.pages) ? payload.pages : []) {
    const numero = Number(page?.page);
    const markdown = String(page?.markdown ?? "");

    if (!Number.isFinite(numero) || !connues.has(numero)) {
      inconnues.push(Number.isFinite(numero) ? numero : null);
      continue;
    }
    // Une page rendue deux fois : on garde la première. Les concaténer
    // doublerait le document sans que rien ne l'explique.
    if (vues.has(numero)) continue;

    vues.add(numero);
    retenues.push({ page: numero, markdown });
  }

  return {
    pages: retenues.sort((a, b) => a.page - b.page),
    /** Les pages envoyées dont rien n'est revenu. Se disent : voir règle 5. */
    absentes: envoyees.map((numero) => Number(numero)).filter((numero) => !vues.has(numero)),
    inconnues
  };
}
