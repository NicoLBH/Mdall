/**
 * Qui travaille sur ce chantier, d'après ses comptes rendus.
 *
 * ## Le problème que ce fichier existe pour résoudre
 *
 * Suivre un point d'une réunion à l'autre est « très compliqué » — et la raison
 * est simple : **un sujet n'est assigné à personne**. Le compte rendu écrit
 * « Lot 02 — gros œuvre : reprendre l'étanchéité », Mdall ouvre un sujet, et le
 * texte « lot 02 » reste du texte. Personne ne le voit arriver, personne ne
 * filtre dessus, personne ne sait ce qui lui revient cette semaine.
 *
 * Pour assigner, il faut que les gens existent. Et ils sont écrits, tous, au
 * même endroit : le compte rendu ouvre par la liste des présents, des absents
 * et des excusés, et il découpe ses points par lot en nommant l'entreprise de
 * chacun. C'est la source la plus complète et la plus à jour qui existe sur un
 * chantier — elle se remet à jour toute seule à chaque réunion.
 *
 * ## Pourquoi il n'y a **pas** d'exception à faire
 *
 * Ajouter quelqu'un à un projet ne se fait pas par un dépôt de fichier : c'est
 * exactement ce que la règle 1 interdit, et ce serait pire ici qu'ailleurs —
 * on parle de personnes réelles, à qui du travail va être assigné.
 *
 * Mais **aucune exception n'est nécessaire** : le compte rendu arrive déjà par
 * une proposition. Les intervenants qu'il nomme y deviennent des lignes comme
 * les points à traiter, qu'on accepte ou qu'on refuse une par une, et qui
 * entrent à la fusion avec le reste. Le chemin existait ; il n'y avait qu'à
 * poser les intervenants dessus.
 *
 * ## La société est le repère, pas la personne
 *
 * Le conducteur de travaux change en cours de chantier, l'entreprise reste.
 * Reconnaître un intervenant par le nom de la personne ferait proposer deux
 * fois la même entreprise à la première réunion où elle envoie quelqu'un
 * d'autre. On reconnaît donc par la société ; le nom de la personne
 * l'accompagne quand le document le donne, et se met à jour quand il change.
 *
 * ## L'adresse se lit, elle ne se fabrique pas
 *
 * Un compte rendu porte presque toujours les adresses : la liste de diffusion
 * les aligne sous les noms. Les recopier n'est pas deviner, c'est lire — et
 * c'est ce qui permet de rattacher quelqu'un à son compte Mdall le jour où il
 * en ouvre un.
 *
 * Ce qui reste interdit est de la **fabriquer**. « M. A. » chez « SARL Alpha »
 * ne devient pas `a@alpha.fr` : une adresse inventée dans un annuaire de
 * personnes réelles finit par recevoir du courrier, ou par entrer en collision
 * avec une vraie. Une adresse qui n'a pas la forme d'une adresse est écartée
 * plutôt que corrigée.
 *
 * Sans adresse, la personne existe quand même : elle reçoit des points, et elle
 * ne peut simplement pas être invitée à se connecter.
 *
 * **Aucun rôle inventé.** Le rôle vient du document ou reste vide.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Un nom réduit à ce qui se compare.
 *
 * « SARL BÉTON DU SUD », « Sarl Beton du Sud » et « sarl  béton du sud » sont
 * la même entreprise, et les proposer trois fois ferait une liste de doublons
 * que personne ne nettoiera.
 */
export function aplati(valeur) {
  return texte(valeur)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Les mots de forme juridique, qui ne distinguent pas deux entreprises.
 *
 * « SARL Alpha » et « Alpha SAS » sont la même maison sous deux plumes. Les
 * garder ferait deux lignes dans la liste, et deux personnes à qui assigner le
 * même lot.
 */
const FORMES = new Set(["sarl", "sas", "sasu", "sa", "eurl", "sci", "snc", "scop", "ets", "etablissements", "entreprise", "ste", "societe"]);

/** La société, réduite à ce qui la nomme vraiment. */
export function societeAplatie(valeur) {
  const mots = aplati(valeur).split(" ").filter((mot) => mot && !FORMES.has(mot));
  return mots.join(" ") || aplati(valeur);
}

/**
 * L'adresse telle qu'elle est écrite, ou rien.
 *
 * On vérifie la **forme**, pas l'existence : une chaîne qui n'a pas la tête
 * d'une adresse n'en est pas une, et la corriger reviendrait à en inventer une.
 * Ce qui est douteux est écarté, pas rafistolé (règle 5).
 */
export function courrielLu(valeur) {
  const dit = texte(valeur).toLowerCase();
  if (!dit) return "";
  // Une adresse et rien d'autre : pas d'espace, un seul arobase, un point après.
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(dit) ? dit : "";
}

/** Pourquoi un intervenant lu n'est pas proposé. Nommé : l'écran doit le dire. */
export const CONNU = {
  /** Le projet compte déjà cette société parmi ses collaborateurs. */
  DEJA_AU_PROJET: "deja-au-projet",
  /** Deux comptes rendus du même dépôt la nomment. */
  DANS_LE_LOT: "dans-le-lot"
};

export const PHRASES_DU_CONNU = {
  [CONNU.DEJA_AU_PROJET]: "cette société est déjà au projet",
  [CONNU.DANS_LE_LOT]: "cette société figure deux fois dans ce dépôt"
};

export function phraseDuConnu(motif) {
  return PHRASES_DU_CONNU[texte(motif)] ?? "";
}

/**
 * Ce qu'un lot de comptes rendus propose d'ajouter au projet.
 *
 * @param {object} options
 * @param {object[]} [options.lus] les intervenants vérifiés, tels que le
 *   serveur les rend
 * @param {object[]} [options.collaborateurs] ceux que le projet porte déjà —
 *   `{company, firstName, lastName}`
 * @returns {{proposes: object[], deja: object[]}} les deux listes, toujours les
 *   deux : une liste courte sans ce qu'on lui a retiré ferait croire à un
 *   compte rendu maigre (règle 5)
 */
export function intervenantsDuCompteRendu({ lus = [], collaborateurs = [] } = {}) {
  const auProjet = new Map(
    (Array.isArray(collaborateurs) ? collaborateurs : [])
      .filter((personne) => texte(personne?.status || "Actif").toLowerCase() !== "retiré")
      .map((personne) => [societeAplatie(personne?.company), personne])
      .filter(([cle]) => cle)
  );

  const vus = new Map();
  const proposes = [];
  const deja = [];

  for (const lu of Array.isArray(lus) ? lus : []) {
    const societe = texte(lu?.societe);
    if (!societe) continue;

    const cle = societeAplatie(societe);
    if (!cle) continue;

    const connu = auProjet.get(cle);
    if (connu) {
      deja.push({ ...lu, motif: CONNU.DEJA_AU_PROJET, collaborateur: connu });
      continue;
    }

    const dejaVu = vus.get(cle);
    if (dejaVu) {
      // Le même dépôt la nomme deux fois : on garde **le nom de personne le
      // plus complet** des deux. Un compte rendu nomme parfois l'entreprise
      // seule dans un en-tête de lot, et la personne dans la liste des présents.
      if (texte(lu?.nom).length > texte(dejaVu.nom).length) dejaVu.nom = texte(lu.nom);
      if (!texte(dejaVu.role) && texte(lu?.role)) dejaVu.role = texte(lu.role);
      // L'adresse est ce qui manque le plus souvent : la première mention qui
      // en porte une la donne à la ligne, quelle que soit sa place.
      if (!dejaVu.courriel && courrielLu(lu?.courriel)) dejaVu.courriel = courrielLu(lu.courriel);
      deja.push({ ...lu, motif: CONNU.DANS_LE_LOT });
      continue;
    }

    const propose = {
      ...lu,
      key: texte(lu?.key) || `intervenant:${cle}`,
      societe,
      nom: texte(lu?.nom),
      role: texte(lu?.role),
      courriel: courrielLu(lu?.courriel)
    };
    vus.set(cle, propose);
    proposes.push(propose);
  }

  return { proposes, deja };
}

/**
 * Sous quel lot ranger une entreprise, et ce qu'il faut faire pour cela.
 *
 * ## Un collaborateur ne peut pas exister sans lot
 *
 * La base l'exige, et c'est juste : quelqu'un dont on ne sait pas ce qu'il fait
 * sur le chantier ne sert à rien dans une liste. Le compte rendu, lui, écrit le
 * lot à côté de l'entreprise — « Lot 02 — GROS ŒUVRE ». C'est exactement ce
 * qu'il faut.
 *
 * ## Le lot s'ouvre si besoin, parce que le chantier l'a déjà ouvert
 *
 * Un lot que le projet n'a pas activé et qu'un compte rendu nomme n'est pas une
 * hypothèse : **l'entreprise est sur le chantier, elle était à la réunion, et
 * ses points sont dans le document**. Refuser de l'activer laisserait la moitié
 * des sociétés dehors et les sujets sans destinataire, pour protéger des
 * paramètres que la réalité a déjà tranchés.
 *
 * Cela ne contourne rien : l'activation a lieu **à la fusion**, pour une ligne
 * que quelqu'un a cochée. C'est le même geste signé que le reste, pas un effet
 * de bord du dépôt.
 *
 * @param {string} role ce que le compte rendu écrit comme rôle, et son lot
 * @param {object[]} lots les lots du projet, activés ou non
 * @returns {{lot: object, aActiver: boolean}|{lot: null, aOuvrir: {label: string, groupCode: string}}}
 *   soit un lot du projet — avec ce qu'il reste à en faire —, soit de quoi en
 *   ouvrir un.
 */
export function lotDuProjetPour(role = "", lots = []) {
  const cherche = aplati(role);
  if (!cherche) return { lot: null, aOuvrir: null };

  const connus = Array.isArray(lots) ? lots : [];

  // Le libellé d'abord : « gros œuvre » est plus sûr qu'un « 02 » qui peut
  // désigner une page, une version ou un rang dans une liste.
  const parLibelle = connus.filter((lot) => {
    const libelle = aplati(lot?.label);
    return libelle && contientLeMot(cherche, libelle);
  });
  const parCode = connus.filter((lot) => {
    const code = aplati(lot?.code);
    return code && contientLeMot(cherche, code);
  });

  const trouves = parLibelle.length ? parLibelle : parCode;

  // Deux lots aussi plausibles n'en désignent aucun : ranger l'entreprise sous
  // le premier venu la ferait disparaître du bon lot.
  if (trouves.length === 1) {
    return { lot: trouves[0], aActiver: trouves[0]?.activated === false };
  }
  if (trouves.length > 1) return { lot: null, aOuvrir: null };

  return { lot: null, aOuvrir: { label: libelleDuLot(role), groupCode: groupeDuRole(role) } };
}

/**
 * Le libellé sous lequel ouvrir un lot que le projet n'a pas.
 *
 * On garde **les mots du document**, débarrassés de la seule numérotation :
 * « Lot 02 — GROS ŒUVRE » devient « Gros œuvre ». Le numéro appartient au
 * compte rendu, pas au projet — deux maîtres d'œuvre ne numérotent pas pareil,
 * et un lot nommé « 02 » ne se retrouverait plus au chantier suivant.
 */
export function libelleDuLot(role = "") {
  const dit = texte(role)
    .replace(/^\s*lots?\s*n?[°ºo]?\s*\d{1,3}\s*[-—–:.]*\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!dit) return texte(role);
  return dit.charAt(0).toUpperCase() + dit.slice(1).toLowerCase();
}

/**
 * À quelle famille un rôle appartient.
 *
 * Les quatre familles sont celles du projet, et la base n'en accepte pas
 * d'autres. Le doute va aux entreprises : c'est ce qu'un compte rendu de
 * chantier nomme le plus, et de loin.
 */
export function groupeDuRole(role = "") {
  const dit = aplati(role);

  if (/\bmaitr(e|ise) d ouvrage\b|\bmoa\b|\bmaitre d ouvrage\b/.test(dit)) return "groupe-maitrise-ouvrage";
  if (/\bmaitr(e|ise) d (?:oeuvre|uvre)\b|\bmoe\b|\barchitecte\b/.test(dit)) return "groupe-maitrise-oeuvre";
  if (/\bbureau de controle\b|\bcontroleur technique\b|\bsps\b|\bopc\b|\bgeotechnicien\b/.test(dit)) {
    return "groupe-divers";
  }

  return "groupe-entreprise";
}

/**
 * Comment une personne nommée dans un compte rendu s'écrit dans le répertoire.
 *
 * **Ce n'est pas un état civil.** Un compte rendu écrit « M. A. » ou
 * « A. Bêta », rarement un prénom et un nom séparés. Découper au premier espace
 * donnerait « M. » comme prénom sur la moitié des lignes, et ce prénom
 * s'afficherait partout.
 *
 * On met donc tout dans le nom, et rien dans le prénom, sauf quand le document
 * donne manifestement les deux. Ce qui compte est que la ligne se lise ; un
 * découpage inventé se lit plus mal qu'un nom entier.
 *
 * Sans personne nommée, c'est la société qui porte la ligne : une entreprise
 * dont on ne connaît personne existe quand même sur le chantier, et des points
 * lui reviennent.
 */
export function nomPourLeRepertoire({ nom = "", societe = "" } = {}) {
  const dit = texte(nom);
  if (!dit) return { firstName: "", lastName: texte(societe) };

  const civilite = /^(m|mr|mme|mlle|monsieur|madame)\b\.?/i;
  const sansCivilite = dit.replace(civilite, "").trim();

  return { firstName: "", lastName: sansCivilite || dit };
}

/**
 * À qui revient un point, parmi ceux que le projet connaît.
 *
 * Le compte rendu écrit « qui » dans ses mots : un lot (« lot 02 »), une
 * entreprise (« SARL Alpha »), un sigle (« MOE »). On cherche donc **dans les
 * deux sens** : la société d'un collaborateur citée dans le texte, ou son rôle.
 *
 * ## Ce qu'elle refuse de faire
 *
 * **Choisir entre deux.** Quand deux collaborateurs correspondent aussi bien,
 * elle ne rend personne : assigner au premier venu mettrait un travail sur le
 * dos de quelqu'un sans que personne l'ait décidé, et le vrai destinataire ne
 * verrait jamais le point. Un sujet sans assigné se voit et se corrige en un
 * clic ; un sujet assigné à la mauvaise entreprise se découvre trois semaines
 * plus tard.
 *
 * @param {object} point le point à traiter, avec son `qui` et son `lot`
 * @param {object[]} collaborateurs `{id, personId, company, projectLotLabel}`
 * @returns {object|null}
 */
export function aQuiRevientLePoint(point = null, collaborateurs = []) {
  const dit = `${texte(point?.qui)} ${texte(point?.lot)}`.trim();
  if (!dit) return null;

  const cherche = aplati(dit);
  if (!cherche) return null;

  const actifs = (Array.isArray(collaborateurs) ? collaborateurs : [])
    .filter((personne) => texte(personne?.status || "Actif").toLowerCase() !== "retiré");

  const trouves = actifs.filter((personne) => {
    const societe = societeAplatie(personne?.company);
    // Le rôle d'un collaborateur **est** son lot : son libellé (« gros œuvre »)
    // et son code (« 02 »). Un compte rendu écrit indifféremment l'un ou
    // l'autre, et ne chercher que le libellé perdrait la moitié des points.
    const libelle = aplati(personne?.projectLotLabel ?? personne?.role);
    const code = aplati(personne?.roleCode);

    // Le mot doit être **entier** : « SA » ne doit pas reconnaître « SANITAIRE ».
    return (societe && contientLeMot(cherche, societe))
      || (libelle && contientLeMot(cherche, libelle))
      || (code && contientLeMot(cherche, code));
  });

  return trouves.length === 1 ? trouves[0] : null;
}

/** Le groupe de mots, entier, dans une phrase aplatie. */
function contientLeMot(phrase, mot) {
  const avant = ` ${phrase} `;
  return avant.includes(` ${mot} `);
}
