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
      })
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
  const rapport = { ouverts: [], retrouves: [], rattaches: 0, manques: [], lu: true };
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

  return dits.length > 0 ? `${dits.join(", ")}.` : "";
}
