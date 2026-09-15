/**
 * Les sujets pères qu'une fusion ouvre, et les fils qu'elle y rattache.
 *
 * ## Ce que ça répare
 *
 * Un compte rendu de chantier range ses cinquante points sous des titres : sept
 * rubriques administratives, un titre par lot, une section par intervenant. La
 * lecture sait les relever depuis l'étape 2, la proposition les porte depuis
 * l'étape 3 — et la fusion n'en faisait rien. Les cinquante points arrivaient
 * côte à côte dans une liste qui en comptait déjà quatre-vingt-treize, et le
 * rangement du document restait à l'écran de l'Atelier, sans jamais atteindre
 * le projet.
 *
 * ## Un père est un contenant, pas une tâche
 *
 * « Lot n° 1 : Démolition / Gros Œuvre » n'est demandé à personne. C'est le
 * titre sous lequel une douzaine de demandes se rangent. On ne lui met donc ni
 * échéance, ni assigné : il porte son intitulé, son label, et ses fils.
 *
 * ## L'identité, et pourquoi elle ne se lit pas ailleurs
 *
 * Un père doit se retrouver d'un compte rendu au suivant, sans quoi la
 * quatorzième réunion créerait un quatorzième « Lot n° 1 ». Son identité est
 * celle de la rubrique — le numéro du lot, l'intitulé aplati sinon — et elle se
 * **relit de son titre** : c'est ce qui permet de le retrouver sans colonne
 * supplémentaire, et sans migration.
 *
 * C'est aussi pourquoi le nom de l'entreprise n'en fait pas partie. Deux
 * orthographes de la même société feraient deux lots n° 1, donc deux pères, avec
 * des fils des deux côtés et aucun moyen de les réunir.
 *
 * ## Ne pas savoir ce que le projet suit arrête tout
 *
 * Si la liste des sujets n'a pas pu être lue, **aucun père ne s'ouvre**. Ouvrir
 * sans pouvoir vérifier ce qui existe déjà créerait des doublons que personne
 * ne nettoiera — et un doublon de père est pire qu'un père manquant : le second
 * se rattrape au compte rendu suivant, le premier reste (règle 5).
 *
 * ## Un échec ne défait pas la fusion
 *
 * Un fils qui ne se rattache pas reste un sujet racine. Il existe, son contenu
 * est juste, il est mal rangé — et cela se dit. Refuser la fusion pour un
 * rangement ferait payer l'essentiel par l'accessoire.
 *
 * ## Les portes
 *
 * Rien ici n'importe la base : les écritures entrent par des fonctions qu'on
 * donne. C'est ce qui permet d'exécuter tout le chemin en test — avec de vraies
 * rubriques, de vrais points, de faux appels — plutôt que de le relire.
 */

import { ITEM } from "./proposition-state.js";
import { ITEM_TYPE } from "./proposition-review.js";
import { identiteDeLaRubrique } from "./rubriques-du-cr.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'un père a coûté, geste par geste. Un seul endroit les nomme. */
export const GESTE = {
  /** Le sujet père lui-même. */
  PERE: "pere",
  /** Le lien d'un fils vers son père. */
  RATTACHEMENT: "rattachement",
  /** Le label que le père porte. */
  LABEL: "label"
};

/**
 * Les pères que cette signature a retenus.
 *
 * Une rubrique refusée n'en fait pas : ses points resteront des sujets racines,
 * et c'est exactement ce que refuser voulait dire.
 */
export function peresRetenus(items = []) {
  return (Array.isArray(items) ? items : [])
    .filter((entree) => entree?.itemType === ITEM_TYPE.RUBRIQUE && entree?.status !== ITEM.REFUSED)
    .map((entree) => ({
      cle: texte(entree.itemKey),
      intitule: texte(entree.payload?.intitule),
      label: texte(entree.payload?.label),
      ordres: (Array.isArray(entree.payload?.ordres) ? entree.payload.ordres : [])
        .map(Number)
        .filter(Number.isFinite)
    }))
    .filter((pere) => pere.cle && pere.intitule);
}

/**
 * Les fils de chaque père : ce que cette fusion a ouvert, et ce qu'elle relance.
 *
 * **Les deux, et c'est le point.** Un compte rendu reporte : la douzième réunion
 * redit trente-sept points déjà ouverts. Ne rattacher que les sujets neufs
 * laisserait les trente-sept à plat, et le rangement ne se verrait qu'au premier
 * compte rendu d'un chantier.
 *
 * **Le point pointe son père par le rang de la rubrique**, pas par son intitulé :
 * une rubrique écrite deux fois dans le même document en porte deux, et les deux
 * mènent au même père.
 *
 * @param {object} options
 * @param {object[]} options.items les lignes de la proposition, tranchées
 * @param {{subjectId: string, point: object}[]} options.nes les sujets ouverts
 * @returns {{cle: string, subjectId: string}[]}
 */
export function filsDesPeres({ items = [], nes = [] } = {}) {
  const peres = peresRetenus(items);

  const parOrdre = new Map();
  for (const pere of peres) {
    for (const ordre of pere.ordres) parOrdre.set(ordre, pere.cle);
  }

  const rang = (point) => {
    const vise = point?.rubrique;
    // `Number(null)` vaut zéro, et zéro est un rang comme un autre : sans ce
    // filtre, un point sans rubrique se rangerait sous la rubrique n° 0.
    if (vise === null || vise === undefined || vise === "") return null;
    const nombre = Number(vise);
    return Number.isFinite(nombre) ? nombre : null;
  };

  const fils = [];
  const vus = new Set();

  const ajouter = (subjectId, point) => {
    const cle = parOrdre.get(rang(point));
    if (!cle || !subjectId || vus.has(subjectId)) return;
    vus.add(subjectId);
    fils.push({ cle, subjectId });
  };

  for (const ne of Array.isArray(nes) ? nes : []) {
    ajouter(texte(ne?.subjectId), ne?.point ?? {});
  }

  // Un sujet relancé porte déjà son identifiant : c'est la clé de sa ligne.
  for (const entree of Array.isArray(items) ? items : []) {
    if (entree?.itemType !== ITEM_TYPE.RELANCE || entree?.status === ITEM.REFUSED) continue;
    ajouter(texte(entree.itemKey), entree.payload ?? {});
  }

  return fils;
}

/**
 * L'entreprise que nomme le titre du père de chaque point, par rang de rubrique.
 *
 * **Lue dans un titre, pas devinée d'une phrase.** « Lot n° 1 : Gros Œuvre :
 * Entreprise BERTRAND » nomme l'entreprise du lot ; c'est elle qui reçoit les
 * points que le document n'adresse à personne en particulier — et c'est ce qui
 * remplace la devinette sur le champ `lot`, qui vaut parfois « 1 ».
 *
 * @returns {Map<number, string>} le rang de la rubrique → la société
 */
export function societesDesPeres(items = []) {
  const parOrdre = new Map();

  for (const entree of Array.isArray(items) ? items : []) {
    if (entree?.itemType !== ITEM_TYPE.RUBRIQUE || entree?.status === ITEM.REFUSED) continue;

    const societe = texte(entree.payload?.societe);
    if (!societe) continue;

    for (const ordre of Array.isArray(entree.payload?.ordres) ? entree.payload.ordres : []) {
      const rang = Number(ordre);
      if (Number.isFinite(rang)) parOrdre.set(rang, societe);
    }
  }

  return parOrdre;
}

/**
 * L'entreprise du père d'un point, ou "".
 *
 * `Number(null)` vaut zéro, et zéro est un rang comme un autre : un point sans
 * rubrique hériterait de l'entreprise de la rubrique n° 0.
 */
export function societeDuPereDuPoint(point = null, societes = null) {
  const vise = point?.rubrique;
  if (vise === null || vise === undefined || vise === "") return "";

  const rang = Number(vise);
  if (!Number.isFinite(rang)) return "";

  return texte(societes instanceof Map ? societes.get(rang) : null);
}

/**
 * Le sujet du projet qui **est déjà** ce père, ou `null`.
 *
 * L'identité se relit du titre : « Lot n° 1 : Gros Œuvre : Entreprise BERTRAND »
 * et « Lot n°01 : GROS OEUVRE : Entreprise BERTAND » donnent tous deux `lot:1`.
 * C'est ce qui permet de retrouver un père sans colonne de plus.
 */
export function pereDejaLa(cle = "", sujetsDuProjet = []) {
  const cherche = texte(cle);
  if (!cherche) return null;

  return (Array.isArray(sujetsDuProjet) ? sujetsDuProjet : []).find(
    (sujet) => identiteDeLaRubrique({ intitule: texte(sujet?.title ?? sujet?.titre) }) === cherche
  ) ?? null;
}

/** L'état d'un sujet, dans le vocabulaire de la base. */
export const ETAT = { OUVERT: "open", FERME: "closed" };

/**
 * L'état d'un père, déduit de ses fils.
 *
 * ## Pourquoi c'est une exception, et la seule
 *
 * Fermer un sujet est une décision : quelqu'un dit que c'est fait, et cela se
 * signe. Un père n'est pas un sujet comme les autres — c'est un **contenant**.
 * « Lot n° 1 : Gros Œuvre » n'est demandé à personne, et il n'y a donc personne
 * pour décider qu'il est réglé. Ce qui le décide est ce qu'il contient.
 *
 * C'est aussi ce qui fait qu'un lot dont un compte rendu ne dit rien — son
 * contenu se réduit à « / » — se ferme, et **rouvre tout seul** à la réunion où
 * il reçoit un point. Personne n'a à y penser, et c'est naturel.
 *
 * ## Ne pas savoir n'est pas « aucun fils »
 *
 * Une liste qu'on n'a pas pu lire rend `null`, et l'appelant ne touche à rien :
 * fermer un lot parce qu'on n'a pas su lire ses sous-sujets ferait disparaître
 * quinze points d'un chantier sans que personne l'ait demandé (règle 5).
 *
 * @param {object[]|null} fils `{status}` — `null` quand on n'a pas pu les lire
 * @returns {"open"|"closed"|null}
 */
export function etatDuPere(fils = null) {
  if (!Array.isArray(fils)) return null;

  const ouvert = fils.some(
    (enfant) => texte(enfant?.status).toLowerCase() !== ETAT.FERME
  );
  return ouvert ? ETAT.OUVERT : ETAT.FERME;
}

/**
 * Met l'état d'un père d'accord avec ses fils.
 *
 * **Une seule implémentation, appelée à trois moments** : à la fusion, quand un
 * fils se ferme, quand un fils s'ouvre. Trois copies de ce calcul finiraient
 * par ne plus dire la même chose, et c'est celle qu'on ne regarde pas qui
 * aurait raison (règle 4).
 *
 * Rien n'est écrit quand l'état ne change pas : rejouer une fusion ne doit pas
 * refermer un lot qu'on venait de rouvrir à la main, ni écrire une ligne
 * d'activité pour un état qui était déjà le bon.
 *
 * @returns {Promise<{change: boolean, etat: string|null}>}
 */
export async function accorderLePereAuxFils({ parentSubjectId = "", portes = null } = {}) {
  const pere = texte(parentSubjectId);
  if (!pere) return { change: false, etat: null };

  const p = portes ?? (await portesParDefaut());

  let fils = null;
  try {
    fils = await p.lireLesFils(pere);
  } catch {
    fils = null;
  }

  const voulu = etatDuPere(fils);
  // Ne pas savoir ce qu'il contient n'autorise pas à le fermer.
  if (voulu === null) return { change: false, etat: null };

  let actuel = null;
  try {
    actuel = texte(await p.lireLEtat(pere)).toLowerCase() || null;
  } catch {
    actuel = null;
  }
  // Ne pas savoir où il en est n'autorise pas à le déplacer : on écrirait une
  // fermeture là où il y en avait déjà une, avec sa date et son auteur.
  if (actuel === null || actuel === voulu) return { change: false, etat: voulu };

  await p.changerLEtat({ subjectId: pere, ouvrir: voulu === ETAT.OUVERT });
  return { change: true, etat: voulu };
}

/**
 * Ce qu'on n'a pas su faire — nommé, et avec ce que la base a répondu.
 *
 * Une erreur remplacée par une phrase polie ne se diagnostique plus (règle 5).
 */
function manque(rapport, { quoi = "", sujet = "", cause = "" } = {}) {
  if (!quoi) return;
  rapport.manques.push({ quoi, sujet: texte(sujet), cause: texte(cause?.message ?? cause) });
}

/**
 * Les portes réelles, celles qui écrivent vraiment.
 *
 * Chargées ici et par import dynamique : un test qui donne ses propres portes
 * n'a jamais à faire venir la base.
 */
export async function portesParDefaut() {
  const [sujets, parents, propositions] = await Promise.all([
    import("./project-subjects-supabase.js"),
    import("./subject-parent-relation-service.js"),
    import("./propositions-supabase.js")
  ]);

  return {
    lireLesSujets: (projectId) => propositions.listProjectSubjectTitles(projectId),
    creerUnSujet: ({ projectId, titre }) =>
      sujets.createManualSubject({ projectId, title: titre }),
    decrire: ({ subjectId, description }) =>
      sujets.updateSubjectDescription({ subjectId, description }),
    lireLesLabels: async (projectId) => (await sujets.loadLabelsForProject(projectId))?.labels ?? [],
    poserUnLabel: ({ subjectId, labelId }) => sujets.addLabelToSubject(subjectId, labelId),
    /**
     * Le rattachement passe par le service qui écrit l'histoire : sans lui, le
     * lien existerait dans la base et nulle part dans la chronologie du sujet.
     *
     * La hiérarchie qu'on lui donne est celle du projet, telle qu'on vient de
     * la lire, augmentée du père qu'on vient d'ouvrir. C'est ce qui rend la
     * vérification de boucle réelle plutôt que décorative.
     */
    rattacher: ({ subjectId, parentSubjectId, hierarchie }) =>
      parents.setSubjectParentRelationInSupabase({
        subjectId,
        parentSubjectId,
        rawSubjectsResult: { subjectsById: hierarchie }
      }),
    lireLesFils: (parentSubjectId) => sujets.listSubjectChildren(parentSubjectId),
    lireLEtat: (subjectId) => sujets.lireLeStatutDUnSujet(subjectId),
    /**
     * Par la même porte que le bouton « Close » : la ligne d'activité « a fermé
     * le sujet » naît de cette procédure, et écrire la colonne à la main
     * laisserait un lot clos dans une chronologie où il ne s'est rien passé.
     */
    changerLEtat: ({ subjectId, ouvrir }) =>
      sujets.changerLEtatDUnSujet({ subjectId, ouvrir })
  };
}

/**
 * Ouvre les pères retenus, et y rattache ce que cette fusion a ouvert ou relancé.
 *
 * @returns {Promise<{ouverts: string[], retrouves: string[], rattaches: number,
 *   manques: object[], lu: boolean}>} `lu` dit si l'on a pu lire les sujets du
 *   projet : faute de quoi rien n'a été tenté, et c'est une information.
 */
export async function ouvrirLesPeresRetenus({
  projectId = "",
  items = [],
  nes = [],
  portes = null
} = {}) {
  const rapport = { ouverts: [], retrouves: [], rattaches: 0, accordes: 0, manques: [], lu: true };
  const peres = peresRetenus(items);
  if (peres.length === 0) return rapport;

  const p = portes ?? (await portesParDefaut());

  const sujetsDuProjet = await p.lireLesSujets(texte(projectId));
  // **Ne pas savoir ce que le projet suit arrête tout.** Ouvrir sans pouvoir
  // vérifier ce qui existe déjà créerait des doublons de pères, et un doublon
  // de père reste — là où un père manquant se rattrape au compte rendu suivant.
  if (sujetsDuProjet === null || sujetsDuProjet === undefined) {
    rapport.lu = false;
    manque(rapport, {
      quoi: "Les sujets du projet n'ont pas pu être lus : aucun sujet père n'a été ouvert, "
        + "pour ne pas en créer un second là où il y en a déjà un."
    });
    return rapport;
  }

  // La hiérarchie du projet, telle qu'on vient de la lire. Les pères ouverts
  // s'y ajoutent au fur et à mesure, sans quoi le rattachement d'un fils à un
  // père né il y a une seconde serait refusé comme visant un sujet inconnu.
  const hierarchie = {};
  for (const sujet of Array.isArray(sujetsDuProjet) ? sujetsDuProjet : []) {
    const id = texte(sujet?.id);
    if (!id) continue;
    hierarchie[id] = {
      id,
      project_id: texte(projectId),
      parent_subject_id: texte(sujet?.parent_subject_id) || null
    };
  }

  const labels = await lireLesLabelsSansCasser(p, texte(projectId));

  const parCle = new Map();

  for (const pere of peres) {
    const deja = pereDejaLa(pere.cle, sujetsDuProjet);
    if (deja?.id) {
      parCle.set(pere.cle, texte(deja.id));
      rapport.retrouves.push(pere.intitule);
      continue;
    }

    try {
      const ouvert = await p.creerUnSujet({ projectId: texte(projectId), titre: pere.intitule });
      if (!ouvert?.id) {
        manque(rapport, { quoi: "Un sujet père n'a pas pu être ouvert.", sujet: pere.intitule });
        continue;
      }

      parCle.set(pere.cle, texte(ouvert.id));
      hierarchie[texte(ouvert.id)] = {
        id: texte(ouvert.id), project_id: texte(projectId), parent_subject_id: null
      };
      rapport.ouverts.push(pere.intitule);

      // La description dit ce qu'est ce sujet : sans elle, un père ouvert par
      // une fusion ressemble à un point qu'on aurait oublié de remplir.
      await p.decrire({
        subjectId: texte(ouvert.id),
        description: descriptionDuPere(pere)
      }).catch(() => {});

      const labelId = labels.get(aplati(pere.label));
      if (labelId) {
        await p.poserUnLabel({ subjectId: texte(ouvert.id), labelId }).catch((erreur) => {
          manque(rapport, {
            quoi: "Le label d'un sujet père n'a pas pu être posé.",
            sujet: pere.intitule, cause: erreur
          });
        });
      } else if (pere.label) {
        // Le label est proposé avec la rubrique : s'il n'existe pas, c'est qu'il
        // a été refusé, ou que sa création a échoué. On le dit plutôt que de
        // laisser une vue vide sans explication.
        manque(rapport, {
          quoi: `Le label « ${pere.label} » n'existe pas au projet : le sujet père ne le porte pas.`,
          sujet: pere.intitule
        });
      }
    } catch (erreur) {
      manque(rapport, {
        quoi: "Un sujet père n'a pas pu être ouvert.", sujet: pere.intitule, cause: erreur
      });
    }
  }

  for (const fils of filsDesPeres({ items, nes })) {
    const parentSubjectId = parCle.get(fils.cle);
    if (!parentSubjectId || parentSubjectId === fils.subjectId) continue;

    try {
      await p.rattacher({ subjectId: fils.subjectId, parentSubjectId, hierarchie });
      hierarchie[fils.subjectId] = {
        id: fils.subjectId, project_id: texte(projectId), parent_subject_id: parentSubjectId
      };
      rapport.rattaches += 1;
    } catch (erreur) {
      // **Un fils qui ne se rattache pas reste un sujet racine.** Il existe, son
      // contenu est juste, il est mal rangé — et cela se dit.
      manque(rapport, {
        quoi: "Un sujet n'a pas pu être rattaché à son lot : il reste à la racine.",
        sujet: fils.subjectId, cause: erreur
      });
    }
  }

  // **Le père se met d'accord avec ses fils.** Un lot dont ce compte rendu ne
  // dit rien se ferme ; celui qui reçoit un point rouvre. C'est ce qui rend le
  // rangement vivant plutôt qu'une photographie du premier compte rendu.
  for (const parentSubjectId of new Set(parCle.values())) {
    try {
      const accord = await accorderLePereAuxFils({ parentSubjectId, portes: p });
      if (accord.change) rapport.accordes += 1;
    } catch (erreur) {
      manque(rapport, {
        quoi: "L'état d'un lot n'a pas pu être mis d'accord avec ses sous-sujets.",
        sujet: parentSubjectId, cause: erreur
      });
    }
  }

  return rapport;
}

/** Un nom réduit à ce qui se compare. */
function aplati(valeur) {
  return texte(valeur)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Les labels du projet, par nom aplati. Un échec de lecture n'arrête rien. */
async function lireLesLabelsSansCasser(portes, projectId) {
  try {
    const lus = await portes.lireLesLabels(projectId);
    return new Map(
      (Array.isArray(lus) ? lus : [])
        .map((label) => [aplati(label?.name ?? label?.label_key), texte(label?.id)])
        .filter(([nom, id]) => nom && id)
    );
  } catch {
    return new Map();
  }
}

/**
 * Ce qu'un sujet père dit de lui-même.
 *
 * **Court, et sans rien inventer.** Il n'a pas d'observation à porter : ce qu'il
 * y a à traiter est dans ses fils. Il dit ce qu'il est, et d'où il vient.
 */
export function descriptionDuPere(pere = {}) {
  const intitule = texte(pere?.intitule);
  const quoi = intitule ? `« ${intitule} » est une rubrique` : "Rubrique";

  return `${quoi} du compte rendu de chantier. Ce qu'il y a à traiter est dans ses sous-sujets ; `
    + "ce sujet-ci n'est demandé à personne.";
}

/**
 * Ce qu'il y a à dire de ce que la fusion a rangé.
 *
 * **Rien à dire se dit aussi** : un compte rendu qui n'a ouvert aucun père n'est
 * pas un compte rendu dont on ignore ce qu'il a rangé.
 */
export function phraseDesPeres(rapport = null) {
  if (!rapport) return "";
  if (rapport.lu === false) {
    return "Les sujets du projet n'ont pas pu être lus : aucun lot n'a été ouvert. "
      + "Le prochain compte rendu les rangera.";
  }

  const dits = [];
  if (rapport.ouverts?.length) dits.push(`${rapport.ouverts.length} lot(s) ouverts`);
  if (rapport.retrouves?.length) dits.push(`${rapport.retrouves.length} déjà au projet`);
  if (rapport.rattaches) dits.push(`${rapport.rattaches} sujet(s) rangés`);
  if (rapport.accordes) dits.push(`${rapport.accordes} lot(s) ouverts ou fermés d'après leurs sujets`);

  return dits.length > 0 ? `${dits.join(", ")}.` : "";
}
