/**
 * Reconnaître la structure d'un document **avant** de le transcrire.
 *
 * ## Pourquoi une lecture en deux temps
 *
 * Une transcription page par page décide page par page. Le même tableau y gagne
 * dix colonnes à la page 1, huit à la page 2 et des en-têtes différents à la
 * page 3 — non parce que le modèle lit mal, mais parce qu'on lui demande de
 * trancher douze fois une question qui n'a qu'une réponse.
 *
 * C'est exactement ce qu'on a observé sur un compte rendu de douze pages : le
 * tableau des présences rendu avec « Présent / Excusé / Absent / Représenté »
 * page 1, puis « R / E / Présent / Absent » page 2. Deux tableaux là où le
 * document n'en a qu'un, et plus rien d'alignable ensuite.
 *
 * ## Ce que fait cette lecture, et rien d'autre
 *
 * Elle **regarde** — elle ne transcrit pas une ligne. Elle rend le squelette :
 * la nature du document, comment son corps est découpé, ce qui se répète en
 * haut et en bas de chaque page, et les tableaux qui reviennent avec leurs
 * colonnes. Puis elle écrit deux à cinq consignes propres à ce document-là.
 *
 * Ce squelette entre dans la consigne de transcription. La question « quelles
 * colonnes ? » est alors tranchée **une fois**, et les douze pages obéissent à
 * la même réponse.
 *
 * ## Pourquoi elle sert au-delà des comptes rendus
 *
 * Un rapport de bureau de contrôle, un CCTP, une notice de sécurité ont tous le
 * même défaut : ce sont des tableaux déguisés, répétés sur des dizaines de
 * pages, dont la forme ne se devine qu'en voyant plusieurs pages à la fois.
 * Rien ici ne parle de chantier : la lecture rend ce qu'elle voit, quel que soit
 * le document.
 *
 * ## Ce qu'elle ne fait pas
 *
 * Elle ne corrige rien et n'invente rien. Un document sans tableau rend une
 * liste vide de tableaux — ce qui est une réponse, et non un échec.
 */

export const CONSIGNES_DE_STRUCTURE = `Tu reçois quelques pages d'un document technique de construction, reposées sur leur grille : les fragments sont placés aux colonnes que leurs coordonnées réelles dans le PDF leur donnent. Ce qui est aligné verticalement l'était dans le document.

Ta tâche : RECONNAÎTRE LA STRUCTURE DE CE DOCUMENT. Tu ne transcris rien. Tu regardes, et tu décris ce que tu vois.

On te donne un échantillon de pages, pas le document entier : décris ce qui se répète, pas ce qui n'arrive qu'une fois.

- \`nature\` : ce qu'est ce document, en quelques mots — « compte rendu de réunion de chantier », « rapport initial de contrôle technique », « CCTP », « notice de sécurité », « document technique non reconnu ».
- \`decoupage\` : comment le corps du document est découpé, en une phrase. Par lot ? par chapitre numéroté ? par intervenant ? par ouvrage ?
- \`entete_repete\` et \`pied_repete\` : les lignes qui reviennent en haut et en bas de CHAQUE page — nom de l'affaire, numéro de page, coordonnées du rédacteur. Recopie-les telles qu'elles sont écrites, sans le numéro de page variable. Vide si rien ne se répète.
- \`chapitres\` : LES TITRES QUI DÉCOUPENT LE DOCUMENT. C'est aussi important que les tableaux, et plus facile à manquer. Un compte rendu de chantier s'écrit souvent dans un unique tableau de quatre colonnes, page après page, et ses lots y sont posés comme des lignes sans date — « Lot 03 – Gros œuvre – LATHUILLE FRERES », « ARCHITECTES », « OPC ». Ce ne sont pas des lignes de tableau : ce sont les titres qui portent tout le découpage du document. Pour chacun :
  - \`motif\` : la forme du titre, en toutes lettres — « Lot XX – intitulé – ENTREPRISE », « ARTICLE X.Y – intitulé », « Chapitre N ».
  - \`niveau\` : sa profondeur, de 1 à 6. Le titre du document est 1 ; une grande partie, 2 ; un lot ou un chapitre, 3 ; ce qui se range dessous, 4.
  - \`exemple\` : un titre réel du document, recopié.
  - \`reconnaissance\` : à quoi on le reconnaît — « centré sur toute la largeur, sans date », « en gras, seul sur sa ligne ».
- \`tableaux\` : les tableaux qui reviennent. Pour chacun :
  - \`nom\` : comment l'appeler — « tableau des présences », « tableau des observations par lot ».
  - \`colonnes\` : ses en-têtes de colonne, DANS L'ORDRE, tels qu'ils sont écrits. C'est le champ qui compte le plus : c'est lui qui rendra les douze pages cohérentes. Si un en-tête n'est écrit qu'une fois, en tête du tableau, il vaut pour toutes les pages où le tableau se poursuit.
  - \`reconnaissance\` : à quoi on reconnaît ce tableau quand on tombe dessus, en une phrase.
- \`consignes\` : deux à cinq règles de transcription PROPRES À CE DOCUMENT, que tu écris pour celui qui va le transcrire. Ce sont les pièges que tu as vus : une colonne qui n'a pas d'en-tête, un tableau qui se poursuit d'une page à l'autre sans se redéclarer, un bloc qui ressemble à un titre et n'en est pas. N'y écris pas de généralités — elles sont déjà dans sa consigne.

N'invente aucun tableau ni aucun chapitre. Un document sans tableau rend une liste vide : c'est une réponse.
Ne recopie pas le contenu des cellules : on te demande la forme, pas le texte.`;

/** Le squelette, et rien de plus. */
export const SCHEMA_DE_LA_STRUCTURE = {
  name: "structure_du_document",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      nature: { type: "string" },
      decoupage: { type: "string" },
      entete_repete: { type: "string" },
      pied_repete: { type: "string" },
      /**
       * Les titres qui découpent le document.
       *
       * **Un tableau n'est pas le document.** Un compte rendu de chantier
       * s'écrit dans un unique tableau de quatre colonnes, page après page, et
       * ses lots y sont rangés comme des lignes sans date. Restitué tel quel,
       * c'est un tableau de deux cents lignes où plus rien ne se trouve : le
       * découpage qui portait toute l'information a disparu dans la forme.
       *
       * Reconnus, ces titres redeviennent des titres — et le document reprend
       * la forme qu'il avait sous les yeux de celui qui l'a écrit.
       */
      chapitres: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            motif: { type: "string" },
            niveau: { type: "integer" },
            exemple: { type: "string" },
            reconnaissance: { type: "string" }
          },
          required: ["motif", "niveau", "exemple", "reconnaissance"]
        }
      },
      tableaux: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            nom: { type: "string" },
            colonnes: { type: "array", items: { type: "string" } },
            reconnaissance: { type: "string" }
          },
          required: ["nom", "colonnes", "reconnaissance"]
        }
      },
      consignes: { type: "array", items: { type: "string" } }
    },
    required: [
      "nature", "decoupage", "entete_repete", "pied_repete", "chapitres", "tableaux", "consignes"
    ]
  }
};

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * La profondeur d'un titre, ramenée aux six niveaux de Markdown.
 *
 * **On ramène, on n'écarte pas.** Un titre au mauvais niveau reste un titre :
 * le jeter perdrait le découpage qu'il portait, pour une question de forme.
 */
function niveauDeTitre(valeur) {
  const lu = Number(valeur);
  if (!Number.isFinite(lu)) return 3;
  return Math.min(6, Math.max(1, Math.round(lu)));
}

/**
 * Les pages qu'on montre à la reconnaissance.
 *
 * **Un échantillon, et non le document.** Reconnaître une forme qui se répète
 * ne demande pas de tout lire : il faut la première page — qui porte l'en-tête
 * et souvent le premier tableau —, quelques pages du corps, et la dernière, où
 * les documents rangent leurs clauses. Envoyer les soixante pages d'un CCTP
 * pour apprendre qu'il a trois colonnes coûterait plus cher que la transcription
 * elle-même.
 *
 * Les pages sont prises **réparties**, pas en tête : un document dont on ne
 * verrait que le début rendrait la forme de son préambule.
 */
export function pagesPourLaStructure(pages = [], { combien = 6 } = {}) {
  const lisibles = (Array.isArray(pages) ? pages : []).filter((page) => texte(page?.text));
  if (lisibles.length <= combien) return lisibles;

  const prises = new Set([0, lisibles.length - 1]);
  // Le pas laisse les extrémités déjà prises de côté et répartit le reste.
  const reste = combien - prises.size;
  for (let rang = 1; rang <= reste; rang += 1) {
    prises.add(Math.round((rang * (lisibles.length - 1)) / (reste + 1)));
  }

  return [...prises].sort((a, b) => a - b).map((rang) => lisibles[rang]);
}

/**
 * Le squelette, tel qu'il entre dans la consigne de transcription.
 *
 * Rend "" quand il n'y a rien de reconnu : on n'ajoute pas un bloc vide à la
 * consigne, qui ferait croire au modèle que le document n'a ni forme ni
 * tableau — ce qui n'est pas la même chose que de ne pas le savoir (règle 5).
 */
export function structureEnTexte(structure = null) {
  if (!structure) return "";

  const morceaux = [];
  const nature = texte(structure?.nature);
  const decoupage = texte(structure?.decoupage);
  const entete = texte(structure?.entete_repete);
  const pied = texte(structure?.pied_repete);

  const tableaux = (Array.isArray(structure?.tableaux) ? structure.tableaux : [])
    .map((tableau) => ({
      nom: texte(tableau?.nom),
      colonnes: (Array.isArray(tableau?.colonnes) ? tableau.colonnes : []).map(texte).filter(Boolean),
      reconnaissance: texte(tableau?.reconnaissance)
    }))
    .filter((tableau) => tableau.nom && tableau.colonnes.length > 0);

  const chapitres = (Array.isArray(structure?.chapitres) ? structure.chapitres : [])
    .map((chapitre) => ({
      motif: texte(chapitre?.motif),
      niveau: niveauDeTitre(chapitre?.niveau),
      exemple: texte(chapitre?.exemple),
      reconnaissance: texte(chapitre?.reconnaissance)
    }))
    .filter((chapitre) => chapitre.motif);

  const consignes = (Array.isArray(structure?.consignes) ? structure.consignes : [])
    .map(texte).filter(Boolean);

  if (nature) morceaux.push(`Ce document est : ${nature}.`);
  if (decoupage) morceaux.push(`Son corps est découpé ainsi : ${decoupage}`);

  if (entete || pied) {
    morceaux.push(
      "CE QUI SUIT EST DU MOBILIER DE PAGE, ET NON LE DOCUMENT. NE LE RESTITUE NULLE PART —"
      + " ni une fois, ni au début, ni à la fin. Un Markdown n'a pas de pages : « Page 9 sur 12 »,"
      + " un rappel d'affaire en tête de chaque feuille et un bloc de coordonnées en pied ne sont"
      + " pas du contenu, ce sont les bords du papier."
      + (entete ? `\nEn-tête répété :\n${entete}` : "")
      + (pied ? `\nPied de page répété :\n${pied}` : "")
    );
  }

  if (chapitres.length > 0) {
    morceaux.push(
      "LES TITRES SUIVANTS DÉCOUPENT CE DOCUMENT. Rends-les en titres Markdown du niveau indiqué,"
      + " et non en lignes de tableau. QUAND UN DE CES TITRES APPARAÎT AU MILIEU D'UN TABLEAU, LE"
      + " TABLEAU S'INTERROMPT : tu le fermes, tu écris le titre, puis tu rouvres un tableau avec"
      + " EXACTEMENT les mêmes colonnes. Un titre laissé en ligne de tableau fait un tableau de"
      + " deux cents lignes où plus rien ne se trouve — et le découpage qui portait toute"
      + " l'information disparaît dans la forme :"
      + chapitres.map((chapitre) => (
        `\n- ${"#".repeat(chapitre.niveau)} ${chapitre.motif}`
        + (chapitre.exemple ? `  — par exemple : « ${chapitre.exemple} »` : "")
        + (chapitre.reconnaissance ? `\n  On le reconnaît à : ${chapitre.reconnaissance}` : "")
      )).join("")
    );

    // **Détachée, et non en fin de paragraphe.** Écrite à la suite de la règle
    // du tableau interrompu, elle n'a rien produit sur un document réel : douze
    // pages restituées sans un seul trait. Une consigne de forme noyée dans une
    // consigne de fond se lit comme un commentaire.
    if (chapitres.some((chapitre) => chapitre.niveau <= 3)) {
      morceaux.push(
        "ÉCRIS UNE LIGNE `---` SEULE, AVEC UNE LIGNE VIDE AVANT ET APRÈS, JUSTE AVANT CHAQUE TITRE"
        + " DE NIVEAU 1, 2 OU 3. Exemple exact de ce qui est attendu :\n"
        + "\n---\n\n### Lot 03 – Gros œuvre – ENTREPRISE\n"
        + "\nUn document de douze pages sans respiration se lit comme un seul bloc : le trait est"
        + " ce qui permet de voir où un lot finit et où le suivant commence. PAS de trait devant"
        + " les titres de niveau 4 ou plus, qui se rangent SOUS le lot et n'ont pas à le découper."
      );
    }
  }

  if (tableaux.length > 0) {
    morceaux.push(
      "LES TABLEAUX DE CE DOCUMENT ONT ÉTÉ RECONNUS. Emploie EXACTEMENT ces colonnes, dans cet ordre, sur TOUTES les pages où le tableau se poursuit — y compris quand la page ne redéclare pas ses en-têtes. Une page qui rendrait d'autres colonnes ferait deux tableaux là où le document n'en a qu'un, et plus rien ne s'alignerait :"
      + tableaux.map((tableau) => (
        `\n- ${tableau.nom} : | ${tableau.colonnes.join(" | ")} |`
        + (tableau.reconnaissance ? `\n  On le reconnaît à : ${tableau.reconnaissance}` : "")
      )).join("")
    );

    // Le défaut vu sur un vrai document : l'adresse postale d'une entreprise
    // atterrit dans la colonne « Tél. / Mail », parce qu'elle est écrite sous le
    // nom et que la ligne du tableau est haute. Une case mise dans la mauvaise
    // colonne ne se voit pas à la relecture — elle se lit comme une donnée.
    morceaux.push(
      "METS CHAQUE VALEUR DANS SA COLONNE, ET DANS ELLE SEULE. Une colonne de coordonnées"
      + " (« Tél. », « Mail », « Téléphone / Courriel ») ne porte QUE des numéros de téléphone et"
      + " des adresses électroniques. Une adresse postale — numéro de voie, rue, code postal,"
      + " commune — appartient à la colonne qui porte le nom de l'entreprise, sous ce nom, et"
      + " jamais à la colonne des coordonnées. Une valeur rangée dans la mauvaise colonne ne se"
      + " voit pas à la relecture : elle se lit comme une donnée."
      + " Quand une case porte plusieurs valeurs — un téléphone et une adresse électronique, un"
      + " nom et une adresse —, sépare-les par `<br>` À L'INTÉRIEUR de la case. N'ouvre JAMAIS une"
      + " ligne de tableau supplémentaire pour ça : la ligne se désalignerait de toutes les"
      + " autres."
    );
  }

  if (consignes.length > 0) {
    morceaux.push(`PIÈGES RELEVÉS DANS CE DOCUMENT :${consignes.map((consigne) => `\n- ${consigne}`).join("")}`);
  }

  if (morceaux.length === 0) return "";

  return `\n\n=== STRUCTURE RECONNUE DE CE DOCUMENT ===\n${morceaux.join("\n\n")}`;
}

/** Ce que le modèle a rendu, ramené à ce qu'on sait employer. */
export function structureLue(payload = null) {
  if (!payload || typeof payload !== "object") return null;

  return {
    nature: texte(payload?.nature),
    decoupage: texte(payload?.decoupage),
    entete_repete: texte(payload?.entete_repete),
    pied_repete: texte(payload?.pied_repete),
    chapitres: (Array.isArray(payload?.chapitres) ? payload.chapitres : [])
      .map((chapitre) => ({
        motif: texte(chapitre?.motif),
        // Hors des six niveaux de Markdown, un titre n'existe pas. On ramène
        // plutôt que d'écarter : un titre au mauvais niveau reste un titre.
        niveau: niveauDeTitre(chapitre?.niveau),
        exemple: texte(chapitre?.exemple),
        reconnaissance: texte(chapitre?.reconnaissance)
      }))
      .filter((chapitre) => chapitre.motif),
    tableaux: (Array.isArray(payload?.tableaux) ? payload.tableaux : [])
      .map((tableau) => ({
        nom: texte(tableau?.nom),
        colonnes: (Array.isArray(tableau?.colonnes) ? tableau.colonnes : []).map(texte).filter(Boolean),
        reconnaissance: texte(tableau?.reconnaissance)
      }))
      // Un tableau sans colonne n'apprend rien à la transcription, et lui
      // ferait croire qu'il y a là une forme à respecter.
      .filter((tableau) => tableau.nom && tableau.colonnes.length > 0),
    consignes: (Array.isArray(payload?.consignes) ? payload.consignes : []).map(texte).filter(Boolean)
  };
}
