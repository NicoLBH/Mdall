/**
 * Une note de calcul de charpente, ramenée à ce qu'une fondation demande.
 *
 * ## Pourquoi un modèle de langage extrait, et rien d'autre
 *
 * Deux notes de calcul ne se ressemblent pas. Celle-ci met les descentes en
 * tonnes dans un tableau à deux colonnes par file ; la suivante les mettra en
 * daN, en lignes, avec un cas de vent de plus et des noms de files différents.
 * Écrire un analyseur par bureau d'études est un travail sans fin, et un
 * analyseur générique se tromperait en silence sur la troisième note.
 *
 * Le modèle, lui, lit un tableau comme on le lit. C'est **la seule chose**
 * qu'on lui demande : recopier des nombres et les nommer. Il ne pondère pas,
 * ne combine pas, ne dimensionne pas — tout cela est du calcul, et le calcul
 * appartient à l'utilitaire.
 *
 * ## Ce que ce fichier fait, et pourquoi il ne parle à personne
 *
 * Il tient le **contrat** : la forme attendue de l'extraction, la
 * correspondance entre les cas de charge d'une note et ceux de l'utilitaire
 * fondations, et le nettoyage de ce qui revient. Rien ici n'appelle le réseau,
 * donc tout se relit dans un test — et c'est précisément ce qu'il faut, parce
 * qu'une correspondance de cas fausse produit un résultat parfaitement
 * plausible et parfaitement faux.
 *
 * ## La correspondance des cas, et pourquoi elle est écrite ici
 *
 * L'utilitaire fondations connaît onze cas nommés — G, Q, Sn, W1…W4, Sx, Sy,
 * Sz, Fa. Une note de charpente parle de « CHARGE PERMANENTE », « NEIGE 2009
 * NORMAL », « VENT DROITE SURP. ». Le rapprochement est un acte métier, pas
 * une astuce d'affichage : le laisser au modèle reviendrait à lui faire décider
 * si la neige accidentelle est une neige ou une action accidentelle, ce qui
 * change les pondérations et donc la semelle.
 *
 * Il est donc ici, en clair, et il est **montré à l'écran avec le résultat** :
 * l'ingénieur qui relit doit pouvoir dire « non, chez nous VENT PIGNON va en
 * W3 » sans lire le code.
 */

/** Les cas de l'utilitaire fondations, et ce qu'ils veulent dire. */
export const CAS_UTILITAIRE = {
  G: "Permanente",
  Q: "Exploitation",
  Sn: "Neige",
  W1: "Vent cas 1",
  W2: "Vent cas 2",
  W3: "Vent cas 3",
  W4: "Vent cas 4",
  Sx: "Séisme X",
  Sy: "Séisme Y",
  Sz: "Séisme Z",
  Fa: "Accidentelle"
};

/**
 * Ce qu'on demande au modèle de reconnaître, et où il le range.
 *
 * L'ordre compte : le premier motif qui s'applique gagne. « NEIGE ACCIDENT »
 * doit être essayé avant « NEIGE », sans quoi une neige accidentelle irait en
 * Sn et serait pondérée comme une neige normale — c'est-à-dire majorée là où
 * elle ne doit pas l'être, et absente des combinaisons accidentelles où elle
 * doit être.
 */
export const CORRESPONDANCE_CAS = [
  { motif: /perman/i, cas: "G", dit: "charge permanente" },
  { motif: /exploit|charge\s*d.?exploitation/i, cas: "Q", dit: "exploitation" },
  { motif: /neige.*(accident|exception)|accident.*neige/i, cas: "Fa", dit: "neige accidentelle" },
  { motif: /neige/i, cas: "Sn", dit: "neige normale" },
  { motif: /s[ée]isme.*x|sismique.*x/i, cas: "Sx", dit: "séisme X" },
  { motif: /s[ée]isme.*y|sismique.*y/i, cas: "Sy", dit: "séisme Y" },
  { motif: /s[ée]isme.*z|sismique.*z/i, cas: "Sz", dit: "séisme Z" },
  { motif: /vent/i, cas: "vent", dit: "vent" },
  { motif: /accident/i, cas: "Fa", dit: "accidentelle" }
];

/** Les quatre logements de vent, dans l'ordre où on les remplit. */
const VENTS = ["W1", "W2", "W3", "W4"];

function nombre(valeur) {
  if (valeur === null || valeur === undefined || valeur === "") return null;
  const n = Number.parseFloat(String(valeur).replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : null;
}

function texte(valeur) {
  return String(valeur ?? "").trim();
}

/**
 * Le nom d'un cas, réduit à ce qui l'identifie.
 *
 * « VENT DROITE SURP. » et « Vent droite surp. — stabilité » désignent le même
 * vent : la ponctuation, la casse et ce qui suit un tiret cadratin ne changent
 * pas de quel cas on parle.
 */
function clefDeCas(libelle) {
  return texte(libelle)
    .split(/\s+[—–-]\s+/)[0]
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Le cas de l'utilitaire qui accueille une ligne de la note.
 *
 * Les cas de vent se numérotent à mesure qu'ils arrivent : une note en donne
 * trois, une autre quatre, et leurs noms ne sont pas normalisés. Ce qui compte
 * est qu'ils restent **distincts** — les fondre en un seul ferait disparaître
 * le vent qui soulève au profit de celui qui appuie.
 *
 * `ventsDejaPris` est le nombre de cas de vent **différents** déjà rangés, pas
 * le nombre de lignes de vent lues : deux lignes qui portent le même nom sont
 * le même vent, vu deux fois — c'est ce qui arrive quand des efforts de
 * stabilité viennent se superposer à ceux d'un portique.
 */
export function casUtilitairePour(libelle, ventsDejaPris = 0) {
  const dit = texte(libelle);
  if (!dit) return null;
  for (const regle of CORRESPONDANCE_CAS) {
    if (!regle.motif.test(dit)) continue;
    if (regle.cas !== "vent") return { cas: regle.cas, dit: regle.dit };
    const place = VENTS[ventsDejaPris];
    // Au-delà de quatre vents, l'utilitaire n'a plus de case. On le dit plutôt
    // que d'en écraser un : un cas de vent perdu ne se voit pas dans le
    // résultat, il s'y déguise en cas plus favorable.
    return place ? { cas: place, dit: regle.dit } : { cas: null, dit: regle.dit, deTrop: true };
  }
  return null;
}

/**
 * Les charges d'un appui, dans le vocabulaire de l'utilitaire.
 *
 * ## Les axes
 *
 * Une descente de portique donne deux réactions : l'une le long de la portée,
 * l'autre verticale. Elles arrivent sous les noms du logiciel de charpente —
 * `Rx3D`, `Ry3D` — et se rangent sous `Hx` et `V`. Le signe est repris **tel
 * quel** : un vent qui soulève donne un `V` négatif, et c'est exactement ce que
 * l'utilitaire attend.
 *
 * ## Ce qui n'est pas fourni reste à zéro
 *
 * Un moment absent vaut zéro, pas « inconnu » : l'utilitaire calcule avec les
 * cinq composantes, et lui rendre `null` ferait entrer un `NaN` qui se
 * propagerait jusqu'au ratio.
 */
export function chargesPourLUtilitaire(appui = {}) {
  const charges = {};
  const correspondances = [];
  // Un vent déjà rencontré reprend sa case : deux lignes qui portent le même
  // nom sont le même vent, vu deux fois. C'est exactement le cas d'une note qui
  // donne les efforts de stabilité « à superposer » avec ceux du portique.
  const ventsParNom = new Map();

  for (const ligne of appui.cas ?? []) {
    const nom = clefDeCas(ligne?.libelle);
    const dejaVu = ventsParNom.get(nom);
    const trouve = dejaVu ?? casUtilitairePour(ligne?.libelle, ventsParNom.size);
    if (!trouve) {
      correspondances.push({ libelle: texte(ligne?.libelle), cas: null, dit: "non reconnu" });
      continue;
    }
    if (trouve.deTrop) {
      correspondances.push({ libelle: texte(ligne?.libelle), cas: null, dit: trouve.dit, deTrop: true });
      continue;
    }
    if (VENTS.includes(trouve.cas) && !dejaVu) ventsParNom.set(nom, trouve);

    const composantes = {
      V: nombre(ligne?.V) ?? 0,
      Hx: nombre(ligne?.Hx) ?? 0,
      Hy: nombre(ligne?.Hy) ?? 0,
      Mx: nombre(ligne?.Mx) ?? 0,
      My: nombre(ligne?.My) ?? 0
    };
    // Deux lignes qui tombent dans le même cas s'additionnent : c'est ce que
    // demande une note qui donne les efforts de stabilité « à superposer avec
    // les descentes de charges sur portique ».
    const deja = charges[trouve.cas];
    charges[trouve.cas] = deja
      ? Object.fromEntries(Object.keys(composantes).map((k) => [k, deja[k] + composantes[k]]))
      : composantes;
    correspondances.push({ libelle: texte(ligne?.libelle), cas: trouve.cas, dit: trouve.dit });
  }

  return { charges, correspondances };
}

/**
 * L'extraction, nettoyée de ce qu'elle peut avoir de bancal.
 *
 * Un modèle rend parfois une chaîne là où l'on attend un nombre, un appui sans
 * nom, ou un tableau vide. On garde ce qui tient debout et l'on jette le reste
 * — mais on ne complète jamais : un appui sans charge ne s'invente pas une
 * charge permanente.
 */
export function normaliserLaNote(brut = {}) {
  const appuis = (Array.isArray(brut?.appuis) ? brut.appuis : [])
    .map((appui, rang) => ({
      nom: texte(appui?.nom) || `Appui ${rang + 1}`,
      quantite: Math.max(1, Math.round(nombre(appui?.quantite) ?? 1)),
      commentaire: texte(appui?.commentaire),
      cas: (Array.isArray(appui?.cas) ? appui.cas : [])
        .map((ligne) => ({
          libelle: texte(ligne?.libelle),
          V: nombre(ligne?.V), Hx: nombre(ligne?.Hx), Hy: nombre(ligne?.Hy),
          Mx: nombre(ligne?.Mx), My: nombre(ligne?.My)
        }))
        .filter((ligne) => ligne.libelle && [ligne.V, ligne.Hx, ligne.Hy, ligne.Mx, ligne.My].some((v) => v !== null))
    }))
    .filter((appui) => appui.cas.length > 0);

  return {
    affaire: texte(brut?.affaire),
    unites: UNITES_CONNUES.includes(texte(brut?.unites)) ? texte(brut.unites) : "",
    altitude: nombre(brut?.altitude),
    appuis
  };
}

/** Les systèmes d'unités que l'utilitaire fondations sait recevoir. */
export const UNITES_CONNUES = ["{ T ; Tm }", "{ kN ; kNm }", "{ daN ; daNm }"];

/**
 * Le système d'unités, tel que l'utilitaire le nomme.
 *
 * Une note en tonnes lue comme des daN donnerait des semelles mille fois trop
 * petites, et le ratio dirait que tout va bien. On ne devine donc pas : le
 * modèle rend l'unité qu'il a lue sur la note, et sans elle on refuse.
 */
export function unitesDeLaNote(note = {}) {
  return UNITES_CONNUES.includes(note?.unites) ? note.unites : null;
}

/**
 * Ce que le modèle doit rendre, décrit une fois.
 *
 * Le schéma part avec la demande : un modèle à qui l'on décrit la forme attendue
 * la rend, un modèle à qui l'on demande « du JSON » rend du JSON différent à
 * chaque fois. Et ce qui n'entre pas dans le schéma n'entre pas dans le calcul.
 */
export const SCHEMA_NOTE = {
  type: "object",
  additionalProperties: false,
  required: ["affaire", "unites", "altitude", "appuis"],
  properties: {
    affaire: { type: "string", description: "Le nom de l'affaire, tel qu'il figure sur la note. Vide si absent." },
    unites: {
      type: "string",
      enum: [...UNITES_CONNUES, ""],
      description: "Le système d'unités des descentes de charges, lu sur la note. « t » donne « { T ; Tm } », "
        + "« kg » ou « daN » donne « { daN ; daNm } », « kN » donne « { kN ; kNm } ». Vide si la note ne le dit pas."
    },
    altitude: {
      type: ["number", "null"],
      description: "L'altitude du site en mètres, si la note la donne (souvent dans les hypothèses de neige). Sinon null."
    },
    appuis: {
      type: "array",
      description: "Un élément par appui distinct à fonder : chaque file de chaque type de portique, "
        + "et chaque cas particulier (massif de contreventement, de stabilité). Deux appuis dont les "
        + "descentes sont identiques restent deux appuis s'ils portent des noms différents.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nom", "quantite", "commentaire", "cas"],
        properties: {
          nom: { type: "string", description: "Comment la note le désigne : « Portique courant — file A », « Massif de stabilité file A »." },
          quantite: { type: ["number", "null"], description: "Combien d'appuis identiques, si la note le dit. Sinon null." },
          commentaire: { type: "string", description: "Ce que la note précise sur cet appui, en une phrase. Vide sinon." },
          cas: {
            type: "array",
            description: "Une ligne par cas de charge non pondéré, dans les termes de la note.",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["libelle", "V", "Hx", "Hy", "Mx", "My"],
              properties: {
                libelle: { type: "string", description: "Le nom du cas tel qu'il est écrit : « CHARGE PERMANENTE », « NEIGE 2009 NORMAL », « VENT DROITE SURP. »." },
                V: { type: ["number", "null"], description: "Réaction verticale, positive vers le bas. Un soulèvement est négatif." },
                Hx: { type: ["number", "null"], description: "Réaction horizontale dans le plan du portique." },
                Hy: { type: ["number", "null"], description: "Réaction horizontale perpendiculaire, si la note la donne. Sinon null." },
                Mx: { type: ["number", "null"], description: "Moment autour de X, si la note le donne. Sinon null." },
                My: { type: ["number", "null"], description: "Moment autour de Y, si la note le donne. Sinon null." }
              }
            }
          }
        }
      }
    }
  }
};

/**
 * Ce qu'on dit au modèle avant de lui montrer la note.
 *
 * Trois interdits, parce que ce sont les trois façons dont une extraction
 * devient fausse sans se voir : compléter, convertir, et fondre deux appuis en
 * un.
 */
export const CONSIGNE_EXTRACTION = [
  "Tu lis une note de calcul de charpente et tu en extrais les descentes de charges aux appuis.",
  "",
  "Tu recopies, tu ne calcules pas :",
  "- Ne pondère rien, ne combine rien, n'additionne rien. Les valeurs partent telles qu'elles sont écrites, non pondérées.",
  "- Ne convertis aucune unité. Tu dis dans quelle unité la note est écrite, et tu laisses les nombres tels quels.",
  "- Ne complète rien. Une composante que la note ne donne pas vaut null, jamais zéro : zéro est une valeur, null est une absence.",
  "- Ne fonds pas deux appuis en un. Un portique courant et un portique de pignon sont deux appuis, même à charges voisines. Un massif de contreventement ou de stabilité est un appui de plus.",
  "- Respecte les signes : une réaction verticale vers le bas est positive, un soulèvement est négatif.",
  "",
  "Quand la note dit que des efforts sont « à superposer » avec ceux d'un portique, crée un appui distinct qui porte les deux séries de lignes : le cumul est fait ensuite, pas par toi.",
  "",
  "Si la note ne contient aucune descente de charges, rends une liste d'appuis vide. N'invente pas de valeurs plausibles : une semelle dimensionnée sur des nombres inventés se coule."
].join("\n");
