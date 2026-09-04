/**
 * Ce que le calcul de fondation demande : les zones de saisie, déclarées une fois.
 *
 * Une seule déclaration, deux usages : elle **dessine** les zones de saisie de
 * l'écran, et elle **valide** ce qu'on y a tapé avant l'envoi. Écrire les champs
 * deux fois — une fois en HTML, une fois en contrôle — serait la garantie qu'un
 * jour l'un accepte ce que l'autre refuse.
 *
 * Rien ici ne calcule et rien ne parle au réseau : c'est de la description, et
 * c'est ce qui permet de la relire dans un test sans monter un navigateur.
 */

/** Les douze cas de charge, et le nom sous lequel le métier les appelle. */
export const CAS_DE_CHARGE = [
  { cle: "G", libelle: "G", nature: "Permanente" },
  { cle: "Q", libelle: "Q", nature: "Exploitation" },
  { cle: "Sn", libelle: "Sn", nature: "Neige" },
  { cle: "W1", libelle: "W1", nature: "Vent cas 1" },
  { cle: "W2", libelle: "W2", nature: "Vent cas 2" },
  { cle: "W3", libelle: "W3", nature: "Vent cas 3" },
  { cle: "W4", libelle: "W4", nature: "Vent cas 4" },
  { cle: "Sx", libelle: "Sx", nature: "Séisme X" },
  { cle: "Sy", libelle: "Sy", nature: "Séisme Y" },
  { cle: "Sz", libelle: "Sz", nature: "Séisme Z" },
  { cle: "Fa", libelle: "Fa", nature: "Accidentelle" }
];

/** Les quatre nappes d'armatures de la semelle, dans l'ordre de la note. */
export const NAPPES = [
  { cle: "AIX", libelle: "Nappe inférieure axe X", defautBarre: "HA10" },
  { cle: "AIY", libelle: "Nappe inférieure axe Y", defautBarre: "HA10" },
  { cle: "ASX", libelle: "Nappe supérieure axe X", defautBarre: "HA8" },
  { cle: "ASY", libelle: "Nappe supérieure axe Y", defautBarre: "HA8" }
];

/** Les diamètres de barres du catalogue. */
export const BARRES = [6, 8, 10, 12, 14, 16, 20, 25, 32, 40].map((d) => `HA${d}`);

/** Les cinq composantes d'un cas, au point où il est appliqué. */
export const COMPOSANTES = [
  { cle: "V", libelle: "V" },
  { cle: "Hx", libelle: "Hx" },
  { cle: "Hy", libelle: "Hy" },
  { cle: "Mx", libelle: "Mx" },
  { cle: "My", libelle: "My" }
];

/**
 * Les zones de saisie, groupées comme le métier les lit.
 *
 * `defaut` n'est pas une valeur devinée pour le projet : c'est la valeur que
 * porte l'outil de calcul dont celui-ci est repris. Elle est là pour qu'un
 * écran vide soit calculable, pas pour tenir lieu de donnée du projet — et
 * l'écran le dit.
 */
export const ZONES = [
  {
    cle: "geometrie",
    titre: "Géométrie",
    champs: [
      { cle: "araseSuperieure", libelle: "Arase supérieure", unite: "m", defaut: -0.1,
        aide: "Cote du dessus du massif par rapport au niveau extérieur fini. Négative si le massif est enterré." },
      { cle: "hauteurLz", libelle: "Hauteur Lz", unite: "m", defaut: 1, min: 0 },
      { cle: "sectionLx", libelle: "Section Lx", unite: "m", defaut: 1.2, min: 0 },
      { cle: "sectionLy", libelle: "Section Ly", unite: "m", defaut: 1.2, min: 0 },
      { cle: "hauteurFut", libelle: "Hauteur du fût", unite: "m", defaut: 0, min: 0 },
      { cle: "futA", libelle: "Fût a", unite: "m", defaut: 0, min: 0 },
      { cle: "futB", libelle: "Fût b", unite: "m", defaut: 0, min: 0 },
      { cle: "excentrementChargeX", libelle: "Excentrement charge/fût x", unite: "m", defaut: 0 },
      { cle: "excentrementChargeY", libelle: "Excentrement charge/fût y", unite: "m", defaut: 0 },
      { cle: "excentrementFutX", libelle: "Excentrement fût/semelle x", unite: "m", defaut: 0 },
      { cle: "excentrementFutY", libelle: "Excentrement fût/semelle y", unite: "m", defaut: 0 }
    ]
  },
  {
    cle: "sol",
    titre: "Sol et matériaux",
    champs: [
      { cle: "poidsVolumiqueSol", libelle: "Poids volumique du sol gR", unite: "force/m3", defaut: 2000, min: 0 },
      { cle: "contrainteLimite", libelle: "Contrainte limite sELS", unite: "contrainte", defaut: 1, min: 0 },
      { cle: "angleFrottement", libelle: "Angle de frottement jS", unite: "°", defaut: 30, min: 0, max: 60 },
      { cle: "cohesionNonDrainee", libelle: "Cohésion non drainée cu,k", unite: "force/m2", defaut: 30, min: 0 },
      { cle: "densiteSemelle", libelle: "Poids volumique du béton (semelle)", unite: "force/m3", defaut: 2500, min: 0 },
      { cle: "densiteFut", libelle: "Poids volumique du béton (fût)", unite: "force/m3", defaut: 2500, min: 0 }
    ]
  },
  {
    cle: "butee",
    titre: "Butée mobilisée",
    champs: [
      { cle: "buteeMobilisee", libelle: "Part mobilisée K'/Kp", unite: "%", defaut: 60, min: 0, max: 100,
        aide: "À zéro, aucune butée n'est comptée : ni effort ni moment stabilisant." },
      { cle: "angleButee", libelle: "Angle de frottement jB", unite: "°", defaut: 30, min: 0, max: 60 },
      { cle: "poidsVolumiqueButee", libelle: "Poids volumique gB", unite: "force/m3", defaut: 2000, min: 0 },
      { cle: "buteeZi", libelle: "Cote haute zi", unite: "m", defaut: -0.1 },
      { cle: "buteeZf", libelle: "Cote basse zf", unite: "m", defaut: -1.1 }
    ]
  },
  {
    cle: "beton",
    titre: "Béton armé",
    champs: [
      { cle: "enrobageSemelle", libelle: "Enrobage de la semelle", unite: "cm", defaut: 5, min: 0 },
      { cle: "enrobageFut", libelle: "Enrobage du fût", unite: "cm", defaut: 5, min: 0 },
      { cle: "resistanceBeton", libelle: "Résistance du béton fc", unite: "MPa", defaut: 25, min: 0 },
      { cle: "limiteAcier", libelle: "Limite d'élasticité de l'acier fe", unite: "MPa", defaut: 500, min: 0 }
    ]
  },
  {
    cle: "sismique",
    titre: "Capacité portante sismique (annexe F)",
    seulementSi: { reglement: "EC8-5 Annexe F" },
    champs: [
      { cle: "resistanceCisaillement", libelle: "Résistance au cisaillement", unite: "kPa", defaut: 50, min: 0,
        aide: "cu si le cisaillement est non drainé, tcy,u s'il est cyclique." }
    ]
  },
  {
    cle: "lest",
    titre: "Lest",
    champs: [
      { cle: "lestMin", libelle: "Lest minimal", unite: "force", defaut: 0 },
      { cle: "lestMax", libelle: "Lest maximal", unite: "force", defaut: 0 }
    ]
  }
];

/** Les choix fermés : rien n'y est libre, et rien n'y est deviné. */
export const CHOIX = [
  { cle: "reglement", libelle: "Règlement", defaut: "EC - NF P94-261",
    valeurs: ["Fascicule 62", "DTU 13.12", "EC - NF P94-261", "EC8-5 Annexe F"] },
  { cle: "repartition", libelle: "Répartition des contraintes", defaut: "Meyerhoff",
    valeurs: ["Meyerhoff", "Constante"] },
  { cle: "drainage", libelle: "Drainage", defaut: "Sol drainé",
    valeurs: ["Sol drainé", "Sol non drainé"] },
  { cle: "inclinaison", libelle: "Coefficient d'inclinaison", defaut: "Sans objet",
    valeurs: ["Sans objet", "Sol cohérent", "Sol frottant"] },
  { cle: "typeExploitation", libelle: "Nature de la charge d'exploitation", defaut: "Exploitation",
    valeurs: ["Exploitation", "Archives / stockage", "Température"] },
  { cle: "unites", libelle: "Unités", defaut: "{ daN ; daNm }",
    valeurs: ["{ T ; Tm }", "{ kN ; kNm }", "{ daN ; daNm }"] },
  { cle: "fissuration", libelle: "Fissuration admise", defaut: "Sans objet",
    valeurs: ["Sans objet", "wk ≤ 0,3mm", "wk ≤ 0,2mm"] },
  { cle: "armaturesMinimales", libelle: "Imposer la section minimale de tirant", defaut: "NON",
    valeurs: ["NON", "OUI"] },

  // Ce qui ne sert qu'à l'annexe F. Les champs restent visibles sous les autres
  // règlements : les masquer ferait disparaître une saisie déjà faite, et
  // rouvrir l'écran ne dirait plus pourquoi elle a disparu.
  { cle: "zoneSismique", libelle: "Zone sismique", defaut: "2", valeurs: ["2", "3", "4", "5"],
    seulementSi: { reglement: "EC8-5 Annexe F" } },
  { cle: "categorieImportance", libelle: "Catégorie d'importance", defaut: "II", valeurs: ["II", "III", "IV"],
    seulementSi: { reglement: "EC8-5 Annexe F" } },
  { cle: "typeSolEc8", libelle: "Type de sol (EC8)", defaut: "B", valeurs: ["A", "B", "C", "D", "E"],
    seulementSi: { reglement: "EC8-5 Annexe F" } },
  { cle: "categorieSol", libelle: "Catégorie de sol", defaut: "Sol frottant",
    valeurs: ["Sol cohérent", "Sol frottant"], seulementSi: { reglement: "EC8-5 Annexe F" } },
  { cle: "sousCategorieSol", libelle: "Sous-catégorie de sol", defaut: "Sable dense",
    valeurs: ["Sable dense", "Sable lâche sec", "Sable lâche saturé", "Argile non sensible", "Argile sensible"],
    seulementSi: { reglement: "EC8-5 Annexe F" } },
  { cle: "natureCisaillement", libelle: "Nature du cisaillement", defaut: "Cisaillement non drainé",
    valeurs: ["Cisaillement non drainé", "Cisaillement cyclique"], seulementSi: { reglement: "EC8-5 Annexe F" } }
];

/**
 * Ce qu'il faut montrer, selon le règlement retenu.
 *
 * Un champ conditionnel est **grisé, pas retiré** : le retirer ferait
 * disparaître une saisie qu'on a faite, et rouvrir l'écran ne dirait plus
 * pourquoi elle a disparu.
 */
export function estPertinent(element, entrees = {}) {
  const condition = element?.seulementSi;
  if (!condition) return true;
  return Object.entries(condition).every(([cle, valeur]) => String(entrees[cle]) === valeur);
}

/**
 * L'unité d'un champ, dans le système que l'écran a choisi.
 *
 * Écrire « unité de force » sur un formulaire, c'est demander au lecteur de
 * faire la conversion de tête — donc l'inviter à se tromper. Les unités
 * géométriques (`m`, `°`, `%`) ne dépendent de rien et sont écrites telles
 * quelles ; les autres se déduisent du système retenu.
 */
export function uniteAffichee(champ, unites) {
  const force = { "{ T ; Tm }": "T", "{ kN ; kNm }": "kN", "{ daN ; daNm }": "daN" }[unites] || "";
  const contrainte = unites === "{ kN ; kNm }" ? "MPa" : "bar";
  if (champ.unite === "force") return force;
  if (champ.unite === "force/m3") return force ? `${force}/m³` : "";
  if (champ.unite === "force/m2") return force ? `${force}/m²` : "";
  if (champ.unite === "contrainte") return contrainte;
  return champ.unite || "";
}

/** Tous les champs numériques, à plat — l'ordre des zones est conservé. */
export function champsNumeriques() {
  return ZONES.flatMap((zone) => zone.champs);
}

/**
 * Ce que vaut un daN dans chaque système.
 *
 * Les valeurs par défaut sont écrites en daN, parce que c'est le système que
 * l'écran propose. Prises telles quelles dans un autre système, elles sont
 * fausses d'un facteur mille : un béton à 2 500 T/m³ pèse plus que la semelle
 * qu'il remplit, et **aucune fondation ne passe jamais** — sans que rien ne
 * dise pourquoi, parce que le calcul, lui, est juste.
 */
export const FACTEUR_DEPUIS_DAN = {
  "{ daN ; daNm }": 1,
  "{ kN ; kNm }": 0.01,
  "{ T ; Tm }": 0.001
};

/** Les unités qui suivent le système retenu — les autres sont absolues. */
const UNITES_DE_FORCE = ["force", "force/m2", "force/m3"];

/**
 * Une contrainte exprimée en bars, dans le système retenu.
 *
 * Le bar est ce qu'un rapport de sol écrit, et ce qu'un ingénieur dit. Seul le
 * système kN travaille en MPa, et dix bars y font un mégapascal.
 */
export function contrainteDepuisBars(bars, unites) {
  if (!Number.isFinite(bars)) return null;
  return unites === "{ kN ; kNm }" ? bars / 10 : bars;
}

/**
 * Les valeurs de départ, exprimées dans le système demandé.
 *
 * Seules les grandeurs de force suivent le système : une résistance de béton
 * reste en MPa, un enrobage en centimètres, un angle en degrés.
 */
export function entreesParDefautDans(unites) {
  const facteur = FACTEUR_DEPUIS_DAN[unites];
  const entrees = entreesParDefaut();
  if (!facteur || facteur === 1) return { ...entrees, unites: unites || entrees.unites };

  for (const champ of champsNumeriques()) {
    if (!UNITES_DE_FORCE.includes(champ.unite)) continue;
    const valeur = Number(entrees[champ.cle]);
    if (Number.isFinite(valeur)) entrees[champ.cle] = Number((valeur * facteur).toPrecision(12));
  }
  entrees.unites = unites;
  return entrees;
}

/** Les valeurs de départ de l'écran : celles de l'outil, et rien d'autre. */
export function entreesParDefaut() {
  const entrees = {};
  for (const champ of champsNumeriques()) entrees[champ.cle] = champ.defaut;
  for (const choix of CHOIX) entrees[choix.cle] = choix.defaut;
  entrees.charges = Object.fromEntries(CAS_DE_CHARGE.map((cas) => [cas.cle,
    Object.fromEntries(COMPOSANTES.map((c) => [c.cle, 0]))]));
  // Aucune nappe n'est proposée d'office : le ferraillage est une décision de
  // l'ingénieur, pas une valeur par défaut. L'utilitaire dit ce qu'elle vaut,
  // il ne la choisit pas.
  entrees.ferraillage = Object.fromEntries(NAPPES.map((nappe) => [nappe.cle,
    { nombre: 0, barre: nappe.defautBarre }]));
  return entrees;
}

function nombre(valeur) {
  if (valeur === "" || valeur === null || valeur === undefined) return null;
  const n = Number.parseFloat(String(valeur).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Ce qui manque ou ne tient pas debout, avant d'aller déranger le serveur.
 *
 * On ne corrige rien au passage : une valeur illisible reste illisible, et
 * l'écran le dit à l'endroit où elle a été tapée.
 */
export function entreesInvalides(entrees = {}) {
  const problemes = [];
  for (const champ of champsNumeriques()) {
    const n = nombre(entrees[champ.cle]);
    if (n === null) { problemes.push({ cle: champ.cle, raison: `${champ.libelle} : valeur illisible.` }); continue; }
    if (champ.min !== undefined && n < champ.min) problemes.push({ cle: champ.cle, raison: `${champ.libelle} : ne peut pas être inférieur à ${champ.min}.` });
    if (champ.max !== undefined && n > champ.max) problemes.push({ cle: champ.cle, raison: `${champ.libelle} : ne peut pas dépasser ${champ.max}.` });
  }
  if (nombre(entrees.sectionLx) !== null && nombre(entrees.sectionLx) <= 0) problemes.push({ cle: "sectionLx", raison: "La semelle doit avoir une largeur." });
  if (nombre(entrees.sectionLy) !== null && nombre(entrees.sectionLy) <= 0) problemes.push({ cle: "sectionLy", raison: "La semelle doit avoir une longueur." });

  for (const choix of CHOIX) {
    if (!choix.valeurs.includes(String(entrees[choix.cle] ?? ""))) {
      problemes.push({ cle: choix.cle, raison: `${choix.libelle} : choix inconnu.` });
    }
  }


  for (const nappe of NAPPES) {
    const propose = entrees.ferraillage?.[nappe.cle] ?? {};
    const n = nombre(propose.nombre);
    if (propose.nombre !== "" && propose.nombre !== undefined && (n === null || n < 0 || !Number.isInteger(n))) {
      problemes.push({ cle: `nappe-${nappe.cle}`, raison: `${nappe.libelle} : le nombre de barres doit être un entier positif.` });
    }
    if (propose.barre && !BARRES.includes(String(propose.barre))) {
      problemes.push({ cle: `nappe-${nappe.cle}`, raison: `${nappe.libelle} : diamètre de barre inconnu.` });
    }
  }

  for (const cas of CAS_DE_CHARGE) {
    for (const comp of COMPOSANTES) {
      const brut = entrees.charges?.[cas.cle]?.[comp.cle];
      if (brut === "" || brut === null || brut === undefined) continue;
      if (nombre(brut) === null) problemes.push({ cle: `charge-${cas.cle}-${comp.cle}`, raison: `${cas.libelle} / ${comp.libelle} : valeur illisible.` });
    }
  }
  return problemes;
}

/**
 * La réponse du serveur pour **une** semelle, ouverte.
 *
 * Le lot rend une enveloppe par semelle — `{ resultat }` quand le calcul a eu
 * lieu, `{ error }` quand il a refusé —, parce qu'une semelle qui échoue ne doit
 * pas faire échouer les dix-neuf autres. Cette enveloppe se lisait à deux
 * endroits et de deux façons : l'écran des fondations l'ouvrait, le
 * pré-dimensionnement du copilote la prenait pour le résultat lui-même. Il n'y
 * trouvait donc jamais de bilan, et concluait — pour chaque appui, à chaque
 * cote — qu'aucune semelle ne vérifiait. Le sol n'y était pour rien.
 *
 * Une seule fonction ouvre l'enveloppe désormais, et c'est celle-ci.
 */
export function resultatDeLaSemelle(rendu) {
  if (!rendu || typeof rendu !== "object") return null;
  if (rendu.resultat) return rendu.resultat;
  // Le refus du serveur porte ses mots : les perdre ferait dire « le calcul n'a
  // pas conclu » là où il disait précisément pourquoi.
  if (rendu.error) return { erreur: String(rendu.error) };
  // Une réponse déjà ouverte reste lisible : mieux vaut comprendre les deux
  // formes que de rendre `null` sur celle qu'on n'attendait pas.
  return rendu.bilan ? rendu : null;
}
