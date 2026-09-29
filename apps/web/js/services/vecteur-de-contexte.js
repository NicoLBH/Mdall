/**
 * La forme d'un chantier — **courte, structurée, et sans rien du projet**.
 *
 * ## À quoi cela sert
 *
 * C'est là que vit « la puissance du contexte »
 * (`docs/la-memoire-qui-predit.md`, § 3). Un moteur de prédiction ne demande
 * pas « voici deux cents pages, que va-t-il se passer ? » — il demande « les
 * projets dont la forme est à distance *d* ont fait quoi, ensuite ? ».
 *
 * Il faut donc un objet **structuré**, pour être calculable, et **court**, pour
 * être comparable. Un vecteur de vingt axes ne ressemble jamais à un autre.
 *
 * ## La règle, et comment elle tient
 *
 * > **Aucune valeur de projet n'entre dans un vecteur de contexte.**
 *
 * Elle ne tient pas par une relecture attentive : elle tient **par
 * construction**. Chaque axe a un **domaine fermé**, écrit ici, et une valeur
 * qui n'y figure pas n'entre pas — elle est écartée, et l'axe se dit inconnu.
 *
 * C'est le même mécanisme que les raisons d'un écarté (`RAISON`) et que les
 * genres de panne du journal des refus : un domaine fermé ne peut rien porter
 * que le domaine n'ait prévu. Et c'est nécessaire ici, parce que la source est
 * sale — un fait de contexte venu de Géorisques porte le **nom de la commune**
 * à côté de la zone sismique. En lire la zone est sûr ; recopier le fait ne le
 * serait pas.
 *
 * ## Les ordres de grandeur, jamais les cotes
 *
 * Un nombre d'étages se range dans une tranche. « 4 à 7 niveaux » se compare ;
 * « R+5 » identifie. La tranche est **irréversible** : on ne retrouve pas le
 * nombre, et c'est ce qu'on veut.
 *
 * ## Ce qui manque se nomme
 *
 * Un axe sans valeur n'est pas un axe à zéro : c'est un axe qu'on ne connaît
 * pas, et les deux ne se comparent pas pareil (règle 5). Le vecteur porte donc
 * ses **manques**, et la distance refuse de se prononcer quand il n'y a rien
 * de commun à comparer.
 *
 * ## Ce que ce fichier ne fait pas
 *
 * Il ne lit ni la base, ni le réseau, et **il ne fait rien traverser**. La
 * porte du fonds commun est une proposition signée, et elle viendra plus tard
 * (`docs/la-memoire-qui-predit.md`, § 6 et § 9). Ici, on construit la forme et
 * on la montre à celui dont c'est le chantier.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Les axes d'une forme de chantier. */
export const AXE = {
  /** On ne rencontre pas les mêmes problèmes en APS et en EXE. */
  PHASE: "phase",
  /** Le classement, jamais la commune. */
  SISME: "sisme",
  NEIGE: "neige",
  VENT: "vent",
  /** Par tranches. Un ordre de grandeur se compare, une cote identifie. */
  NIVEAUX: "niveaux",
  /** Qui est là change ce qui se dit — et non **qui**, exactement. */
  ROLES: "roles"
};

/** Ce qu'on lit d'un axe. */
export const MOT_DE_LAXE = {
  [AXE.PHASE]: "phase",
  [AXE.SISME]: "zone sismique",
  [AXE.NEIGE]: "zone de neige",
  [AXE.VENT]: "zone de vent",
  [AXE.NIVEAUX]: "niveaux",
  [AXE.ROLES]: "rôles présents"
};

/**
 * Les phases, telles que la base les tient.
 *
 * Le même domaine que la contrainte de `projects.current_phase_code` : une
 * seconde liste ici finirait par ne plus dire la même chose (règle 4), et une
 * phase valide passerait pour inconnue.
 */
export const PHASES = [
  "PC", "AT", "APS", "APD", "PRO", "DCE", "MARCHE", "EXE", "DOE", "GPA", "EXPLOIT"
];

/** Les cinq zones de sismicité. */
export const ZONES_DE_SISME = ["1", "2", "3", "4", "5"];

/** Les zones de neige de la carte française. */
export const ZONES_DE_NEIGE = ["A1", "A2", "B1", "B2", "C1", "C2", "D", "E"];

/** Les quatre régions de vent. */
export const ZONES_DE_VENT = ["1", "2", "3", "4"];

/**
 * Les tranches de niveaux.
 *
 * **Irréversibles, et c'est le but** : on ne retrouve pas le nombre. Les bornes
 * suivent ce qui change la nature du problème — un bâtiment de plain-pied, un
 * petit collectif, un immeuble, une tour.
 */
export const TRANCHES_DE_NIVEAUX = ["1", "2-3", "4-7", "8-15", "16 et plus"];

/**
 * Les rôles qui comptent pour la forme d'un chantier.
 *
 * ## Pourquoi une liste écrite ici, et pas le catalogue de la base
 *
 * Le catalogue des lots est une **donnée**, et il s'étend : un projet peut
 * créer son propre lot, et lui donner le nom qu'il veut. Un rôle sur mesure
 * pourrait donc porter le nom d'une entreprise ou d'une personne — exactement
 * ce qui ne doit jamais entrer dans une forme.
 *
 * La liste est donc **fermée et écrite ici**. Ce qui n'y figure pas ne compte
 * pas : mieux vaut une forme qui dit « je ne sais pas » qu'une forme qui porte
 * un nom propre.
 */
export const ROLES_QUI_COMPTENT = [
  "architecte-maitre-oeuvre",
  "controle-technique",
  "geotechnicien",
  "bet-structure",
  "bet-electricite",
  "bet-energie-fluide",
  "bet-acoustique",
  "economiste",
  "opc",
  "bim-manager",
  "coordinateur-ssi",
  "coordinateur-sps"
];

/** Ce qu'on lit d'un rôle. Le mot du métier, pas le code. */
export const MOT_DU_ROLE = {
  "architecte-maitre-oeuvre": "architecte",
  "controle-technique": "contrôle technique",
  "geotechnicien": "géotechnicien",
  "bet-structure": "BET structure",
  "bet-electricite": "BET électricité",
  "bet-energie-fluide": "BET fluides",
  "bet-acoustique": "BET acoustique",
  "economiste": "économiste",
  "opc": "OPC",
  "bim-manager": "BIM manager",
  "coordinateur-ssi": "coordinateur SSI",
  "coordinateur-sps": "coordinateur SPS"
};

/**
 * Ce qu'on ne garde jamais, nommé.
 *
 * **Une règle qui ne s'affiche pas ne rassure personne.** L'écran montre cette
 * liste à côté de la forme : c'est ainsi qu'on peut la vérifier sans lire le
 * code, et c'est ce qu'un client demandera.
 */
export const CE_QUI_NE_TRAVERSE_JAMAIS = [
  "le nom du projet",
  "la commune et l'adresse",
  "le maître d'ouvrage",
  "les intervenants nommés",
  "les cotes et les valeurs du projet",
  "les documents, les messages et les conversations avec le copilote"
];

/** La tranche d'un nombre de niveaux. Vide quand on ne sait pas. */
export function trancheDesNiveaux(combien) {
  const nombre = Number(combien);
  if (!Number.isFinite(nombre) || nombre < 1) return "";
  if (nombre <= 1) return TRANCHES_DE_NIVEAUX[0];
  if (nombre <= 3) return TRANCHES_DE_NIVEAUX[1];
  if (nombre <= 7) return TRANCHES_DE_NIVEAUX[2];
  if (nombre <= 15) return TRANCHES_DE_NIVEAUX[3];
  return TRANCHES_DE_NIVEAUX[4];
}

/**
 * Une valeur ramenée à son domaine, ou rien.
 *
 * **La comparaison est indulgente sur la graphie, jamais sur le fond** :
 * « a1 », « A1 » et « Zone A1 » sont la même zone, « Montholon » n'en est
 * aucune. Ce qui ne se reconnaît pas est écarté — c'est ce qui rend la règle
 * vraie par construction, quelle que soit la saleté de la source.
 */
function dansLeDomaine(valeur, domaine) {
  const brut = texte(valeur).toUpperCase().replace(/\s+/g, "");
  if (!brut) return "";
  return domaine.find((connue) => connue.toUpperCase() === brut) ?? "";
}

/**
 * La valeur utile d'un fait de contexte.
 *
 * Les faits viennent de plusieurs sources et n'ont pas tous la même forme : un
 * nombre, une chaîne, un objet qui porte la réponse brute d'un service. On
 * cherche donc **aux endroits connus**, et l'on rend ce qu'on trouve tel quel —
 * c'est le domaine, ensuite, qui décide si cela entre.
 *
 * **On ne cherche pas partout.** Descendre dans un objet inconnu jusqu'à
 * trouver quelque chose qui ressemble à une zone finirait par ramener un nom de
 * commune le jour où une source changerait de forme.
 */
export function valeurDuFait(fait = null) {
  if (fait === null || fait === undefined) return "";
  if (typeof fait === "string" || typeof fait === "number") return texte(fait);
  if (typeof fait !== "object") return "";

  for (const ou of ["zone", "code", "value", "valeur"]) {
    const dit = fait[ou];
    if (typeof dit === "string" || typeof dit === "number") return texte(dit);
  }

  // `data` porte la réponse d'un service, et elle est elle-même un objet : on
  // y regarde d'un cran, pas plus.
  const data = fait.data;
  if (data && typeof data === "object") {
    for (const ou of ["zone", "code", "value", "valeur"]) {
      const dit = data[ou];
      if (typeof dit === "string" || typeof dit === "number") return texte(dit);
    }
  }
  if (typeof data === "string" || typeof data === "number") return texte(data);

  return "";
}

/**
 * La forme d'un chantier.
 *
 * Chaque entrée est prise **telle que la source la donne** et ramenée au
 * domaine ; ce qui ne s'y ramène pas ne passe pas.
 *
 * @param {object} lu ce qu'on a pu lire du projet, brut
 * @param {string} [lu.phase] le code de phase courant
 * @param {*} [lu.sismique] le fait `seismic_zone`, sous n'importe quelle forme
 * @param {*} [lu.neige] le fait `snow_zone`
 * @param {*} [lu.vent] le fait `wind_zone`
 * @param {*} [lu.niveaux] le fait `floors_count`
 * @param {string[]} [lu.roles] les codes de rôle présents sur le projet
 * @returns {{axes: {axe: string, valeur: string, dit: string}[], manques: string[]}}
 */
export function vecteurDeContexte({
  phase = "", sismique = null, neige = null, vent = null, niveaux = null, roles = []
} = {}) {
  const axes = [];
  const manques = [];

  const poser = (axe, valeur) => {
    if (valeur) axes.push({ axe, valeur, dit: `${MOT_DE_LAXE[axe]} ${valeur}` });
    else manques.push(axe);
  };

  poser(AXE.PHASE, dansLeDomaine(phase, PHASES));
  poser(AXE.SISME, dansLeDomaine(valeurDuFait(sismique), ZONES_DE_SISME));
  poser(AXE.NEIGE, dansLeDomaine(valeurDuFait(neige), ZONES_DE_NEIGE));
  poser(AXE.VENT, dansLeDomaine(valeurDuFait(vent), ZONES_DE_VENT));
  poser(AXE.NIVEAUX, trancheDesNiveaux(valeurDuFait(niveaux)));

  // Les rôles présents, rangés comme la liste les range : deux projets qui ont
  // les mêmes rôles doivent porter la même chaîne, quel que soit l'ordre dans
  // lequel leurs collaborateurs ont été ajoutés.
  const presents = ROLES_QUI_COMPTENT.filter((role) =>
    (Array.isArray(roles) ? roles : []).some((dit) => texte(dit).toLowerCase() === role));
  poser(AXE.ROLES, presents.join("+"));

  return { axes, manques };
}

/** La forme, en une phrase. Vide quand on ne sait rien. */
export function phraseDuContexte(vecteur = null) {
  const axes = vecteur?.axes ?? [];
  if (!axes.length) return "";

  return axes
    .map(({ axe, valeur }) => (axe === AXE.ROLES
      ? valeur.split("+").map((role) => MOT_DU_ROLE[role] ?? role).join(", ")
      : `${MOT_DE_LAXE[axe]} ${valeur}`))
    .join(" · ");
}

/**
 * Ce qui sépare deux formes.
 *
 * ## Une distance qui se dit
 *
 * On ne rend pas un nombre opaque : on rend **ce qui diffère, nommé**. C'est la
 * différence entre un moteur qu'on subit et un moteur à qui l'on peut demander
 * « lesquels ? » — et c'est exactement ce que le plan promet
 * (`docs/la-memoire-qui-predit.md`, § 10).
 *
 * ## Ne pas savoir n'est pas être différent
 *
 * Un axe que l'un des deux ignore **ne compte ni pour ni contre** : le compter
 * comme un écart ferait passer un projet mal renseigné pour un projet
 * dissemblable, et l'on chercherait des voisins là où il n'y a qu'un formulaire
 * vide (règle 5).
 *
 * @returns {{distance: number|null, communs: string[], ecarts: string[], inconnus: string[]}}
 *   `distance` vaut `null` quand rien n'est comparable — et « on ne sait pas »
 *   ne s'écrit jamais `0`, qui voudrait dire « identiques ».
 */
export function distanceEntreContextes(gauche = null, droite = null) {
  const lu = (vecteur) => new Map((vecteur?.axes ?? []).map(({ axe, valeur }) => [axe, valeur]));
  const ici = lu(gauche);
  const la = lu(droite);

  const communs = [];
  const ecarts = [];
  const inconnus = [];

  for (const axe of Object.values(AXE)) {
    if (!ici.has(axe) || !la.has(axe)) {
      inconnus.push(axe);
      continue;
    }
    communs.push(axe);
    if (ici.get(axe) !== la.get(axe)) ecarts.push(axe);
  }

  return {
    distance: communs.length ? ecarts.length / communs.length : null,
    communs,
    ecarts,
    inconnus
  };
}

/** Ce qui diffère, en français. Vide quand rien ne diffère ou que rien ne se compare. */
export function ceQuiDiffere(gauche = null, droite = null) {
  const { ecarts } = distanceEntreContextes(gauche, droite);
  return ecarts.map((axe) => MOT_DE_LAXE[axe] ?? axe);
}
