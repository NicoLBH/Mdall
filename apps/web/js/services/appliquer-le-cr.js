/**
 * Ce qu'une proposition de compte rendu **fait**, une fois signée.
 *
 * ## Le geste qui manquait
 *
 * La proposition savait porter ce qu'un compte rendu dit. La fusion savait en
 * faire entrer une partie : les documents, les sociétés, les sujets neufs. Tout
 * le reste — les lots nommés, les labels, les jalons datés, et les quarante
 * points que le compte rendu **reporte** — s'arrêtait à la signature.
 *
 * Ce que cela coûtait ne se voyait pas, et c'est ce qui le rendait grave. Les
 * sujets ouverts n'avaient ni label ni échéance : aucun filtre ne les
 * retrouvait, aucune situation ne les comptait. Et les sujets relancés
 * n'avaient **rien du tout** — pas une ligne dans leur fil pour dire que la
 * douzième réunion venait de les redire. Un sujet muet voulait alors dire
 * « rien n'a bougé » exactement comme « personne n'a rien lu », et c'est la
 * seule chose qu'un suivi de chantier ne doit jamais confondre.
 *
 * ## L'ordre, et pourquoi il y a deux portes d'entrée
 *
 * Les lots d'abord, puis les sociétés, puis les labels et les jalons, puis les
 * sujets. Un sujet ne porte un label qu'existant, ne s'accroche qu'à un jalon
 * existant, et une société ne s'ajoute qu'à **un lot ouvert** — la base l'exige,
 * et c'est juste : quelqu'un dont on ne sait pas ce qu'il fait sur le chantier
 * ne sert à rien dans une liste.
 *
 * Or les sociétés s'ajoutent ailleurs, et les sujets s'ouvrent ailleurs : ce
 * module s'intercale donc en deux temps — `ouvrirLesLotsRetenus` avant que la
 * fusion n'ajoute les sociétés, `appliquerLeCompteRendu` après qu'elle a ouvert
 * les sujets. Les fondre en un seul appel obligerait à lui passer l'ouverture
 * des sujets en paramètre, c'est-à-dire à faire remonter l'écran dans le
 * service.
 *
 * ## Rien ne s'applique qui n'ait été coché
 *
 * Chaque écriture vient d'une ligne retenue d'une proposition signée. Une ligne
 * refusée ne fait rien — ni en creux, ni « pour la cohérence ». C'est la
 * règle 1, et c'est aussi la seule façon dont ce module puisse être utile :
 * quelqu'un doit pouvoir refuser un label et le voir ne pas apparaître.
 *
 * ## Un échec ne défait pas une signature
 *
 * La fusion a eu lieu avant d'arriver ici : les documents sont entrés, la
 * mémoire est écrite. Une écriture qui échoue se **dit** et n'emporte pas les
 * suivantes — sur quarante relances, en perdre trente-neuf parce que la
 * deuxième a échoué serait le pire des deux mondes. Ce qui serait grave est de
 * se taire : on croirait le compte rendu traité.
 *
 * ## Les portes
 *
 * Rien ici n'importe la base. Les écritures passent par des fonctions reçues en
 * paramètre, et c'est ce qui permet de faire passer **tout ce chemin** dans un
 * test, avec des portes feintes — plutôt que de relire le code et d'espérer.
 */

import { dateEnFrancais, nomDeLObjectif } from "./echeances-du-cr.js";
import { libelleDuLot, groupeDuRole } from "./intervenants-du-cr.js";
import { COULEURS_DU_LABEL, LABEL_DU_CR, LABELS_DE_QUALIFICATION, memeLabel } from "./label-du-cr.js";
import { memeLot } from "./lots-du-cr.js";
import { FERMETURE } from "./fermeture-du-cr.js";
import { ITEM_TYPE } from "./proposition-review.js";
import { ITEM } from "./proposition-state.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les gestes qu'une reprise sait refaire.
 *
 * **Seulement ceux qui sont rejouables sans rien doubler.** Poser un label et
 * accrocher un jalon sont des écritures idempotentes — la base les fusionne sur
 * la clé. Écrire dans un fil ne l'est pas : rejouer une relance qui a réussi
 * ferait un second message disant la même réunion. C'est pour cela qu'une
 * reprise ne rejoue **que ce qui a échoué**, geste par geste, et jamais
 * l'application entière.
 */
export const GESTE = {
  LABEL: "label",
  OBJECTIF: "objectif",
  FERMETURE: "fermeture"
};

/**
 * Les lignes d'une nature que la signature a retenues.
 *
 * **Retenu, ce n'est pas « accepté ».** Une proposition se signe souvent sans
 * décider ligne à ligne : ce qui n'a pas été refusé est retenu. Exiger un
 * `ACCEPTED` explicite ferait qu'une fusion faite en un clic n'appliquerait
 * rien, ce que personne ne comprendrait. C'est la lecture que la fusion fait
 * déjà pour les documents et les sociétés.
 */
export function retenus(items = [], type = "") {
  return (Array.isArray(items) ? items : []).filter(
    (entree) => entree?.itemType === type && entree?.status !== ITEM.REFUSED
  );
}

/**
 * Les labels qu'un point fait porter à son sujet.
 *
 * « CR chantier » toujours : c'est la marque d'origine, et c'est elle qui rend
 * possibles le filtre et la situation. Les qualifications ensuite, et
 * **seulement celles que ce point-là porte** : « urgent » sur les quarante
 * points d'un compte rendu ne veut plus rien dire.
 *
 * La liste fermée décide : un label hors d'elle est écarté ici comme il l'est
 * au serveur — c'est la seconde porte, pas la première.
 */
export function labelsDuSujet(point = {}) {
  const dits = Array.isArray(point?.labels) ? point.labels : [];
  const qualifications = LABELS_DE_QUALIFICATION.filter((connu) =>
    dits.some((dit) => memeLabel(connu, dit))
  );

  return [LABEL_DU_CR, ...qualifications];
}

/**
 * Les sujets que ce compte rendu touche, neufs et relancés ensemble.
 *
 * **Les deux subissent le même traitement**, et c'est le point : un label posé
 * sur les sujets ouverts mais pas sur les relancés ferait qu'un filtre
 * « CR chantier » ne montrerait que les points neufs — c'est-à-dire trois
 * lignes sur quarante, et personne ne verrait qu'il en manque trente-sept.
 *
 * Ce qui les distingue est ce qu'on écrit dans leur fil : un sujet qui vient
 * d'être ouvert porte déjà sa provenance dans sa description, et un premier
 * message qui la répéterait serait un doublon qui finirait par diverger
 * (règle 4). Seule la relance écrit.
 */
export function sujetsTouches({ items = [], ouverts = [] } = {}) {
  const touches = (Array.isArray(ouverts) ? ouverts : [])
    .filter((ne) => texte(ne?.subjectId))
    .map((ne) => ({ subjectId: texte(ne.subjectId), point: ne.point ?? {}, relance: false }));

  const vus = new Set(touches.map((sujet) => sujet.subjectId));

  for (const entree of retenus(items, ITEM_TYPE.RELANCE)) {
    const subjectId = texte(entree?.payload?.sujetId) || texte(entree?.itemKey);
    // Un sujet qui vient d'être ouvert par cette même proposition ne se relance
    // pas : il n'avait pas d'histoire à reprendre.
    if (!subjectId || vus.has(subjectId)) continue;
    vus.add(subjectId);
    touches.push({ subjectId, point: entree.payload ?? {}, relance: true });
  }

  return touches;
}

/**
 * Les portes réelles, celles qui écrivent vraiment.
 *
 * Elles ne sont chargées qu'ici, et par import dynamique : un test qui donne
 * ses propres portes n'a jamais à faire venir la base — ce qui, en pratique,
 * est la différence entre un chemin qu'on exécute et un chemin qu'on relit.
 */
export async function portesParDefaut() {
  const [sujets, messages, projet] = await Promise.all([
    import("./project-subjects-supabase.js"),
    import("./subject-messages-supabase.js"),
    import("./project-supabase-sync.js")
  ]);

  const fil = messages.createSubjectMessagesSupabaseRepository();

  return {
    lireLesLots: () => projet.syncProjectLotsFromSupabase(),
    activerUnLot: (lotId) => projet.persistProjectLotActivationToSupabase(lotId, true),
    ouvrirUnLot: (lot) => projet.addCustomProjectLotToSupabase(lot),
    lireLesLabels: async (projectId) => (await sujets.loadLabelsForProject(projectId))?.labels ?? [],
    creerUnLabel: (projectId, label) => sujets.createLabel(projectId, label),
    poserUnLabel: (subjectId, labelId) => sujets.addLabelToSubject(subjectId, labelId),
    lireLesObjectifs: async (projectId) =>
      (await sujets.loadObjectivesForProject(projectId))?.objectives ?? [],
    creerUnObjectif: (projectId, objectif) => sujets.createObjective(projectId, objectif),
    poserUnObjectif: (objectifId, subjectId) => sujets.addSubjectToObjective(objectifId, subjectId),
    ecrireDansLeFil: (message) => fil.createMessage(message),
    fermerUnSujet: (fermeture) => sujets.closeSubject(fermeture)
  };
}

/**
 * Ce qu'on n'a pas su faire — nommé, expliqué, et **rejouable**.
 *
 * ## Trois fois la même phrase, et aucune information
 *
 * Le rapport ne portait que des phrases. Trois échecs identiques donnaient
 * « Un sujet n'a pas pu être rattaché à son échéance. » trois fois de suite,
 * sans dire **quels** sujets, ni **quelles** échéances, ni **pourquoi** — et
 * sans rien pour recommencer. On laissait quelqu'un devant un constat qu'il ne
 * pouvait ni comprendre ni corriger, avec pour seul conseil « reprenez à la
 * main » sur des points qu'on ne nommait pas.
 *
 * Un manque porte donc trois choses de plus :
 *
 * - **`sujet`** — ce dont il s'agit, en clair ;
 * - **`cause`** — ce que la base a répondu, mot pour mot. Une erreur qu'on
 *   remplace par une phrase polie ne se diagnostique plus (règle 5) ;
 * - **`reprise`** — de quoi refaire le geste, et lui seul. C'est ce qui rend le
 *   bouton « Reprendre » possible : rejouer toute l'application écrirait une
 *   seconde fois les relances déjà écrites.
 */
function manque(rapport, { quoi = "", sujet = "", cause = "", reprise = null } = {}) {
  if (!quoi) return;
  rapport.manques.push({
    quoi,
    sujet: texte(sujet),
    cause: texte(cause?.message ?? cause),
    reprise
  });
}

/**
 * Ouvre ou active les lots que ce compte rendu nomme.
 *
 * **Un lot qu'un compte rendu nomme n'est pas une hypothèse** : l'entreprise
 * est sur le chantier, elle était à la réunion, et ses points sont dans le
 * document. Cela reste une écriture, et elle a été signée.
 *
 * **C'est le premier geste de la fusion**, avant que les sociétés n'entrent :
 * une société sans lot est refusée par la base, et l'ordre inverse laisserait
 * dehors la moitié des entreprises du chantier.
 *
 * Le numéro du compte rendu ne devient pas le nom du lot : deux maîtres d'œuvre
 * ne numérotent pas pareil, et un lot nommé « 02 » ne se retrouverait plus au
 * chantier suivant.
 *
 * @returns {Promise<{ouverts: string[], actives: string[], manques: string[]}>}
 */
export async function ouvrirLesLotsRetenus({ items = [], portes = null } = {}) {
  const rapport = { lots: { ouverts: [], actives: [] }, manques: [] };
  const lignes = retenus(items, ITEM_TYPE.LOT);
  if (lignes.length === 0) return { ...rapport.lots, manques: rapport.manques };

  const ouvertes = portes ?? (await portesParDefaut());
  await appliquerLesLots(lignes, ouvertes, rapport);
  return { ...rapport.lots, manques: rapport.manques };
}

/** Le corps du geste, partagé par les deux portes d'entrée. */
async function appliquerLesLots(lignes, portes, rapport) {
  if (lignes.length === 0) return;

  const connus = (await portes.lireLesLots?.().catch(() => null)) ?? null;
  // **Sans les lots du projet, on n'en ouvre aucun.** En ouvrir un par ligne
  // doublerait ceux qui existent, et personne ne nettoiera (règle 5).
  if (!Array.isArray(connus)) {
    manque(rapport, {
      quoi: "Les lots du projet n'ont pas pu être lus : aucun lot n'a été ouvert.",
      sujet: lignes.map((ligne) => texte(ligne?.payload?.intitule)).filter(Boolean).join(", ")
    });
    return;
  }

  let lots = connus;

  for (const ligne of lignes) {
    const intitule = texte(ligne?.payload?.intitule);
    if (!intitule) continue;

    try {
      const trouve = lots.find(
        (lot) => memeLot(intitule, texte(lot?.label)) || memeLot(intitule, texte(lot?.code))
      ) ?? null;

      if (trouve && trouve.activated === false) {
        await portes.activerUnLot(trouve.id);
        rapport.lots.actives.push(intitule);
      } else if (!trouve) {
        const ouvert = await portes.ouvrirUnLot({
          label: libelleDuLot(intitule),
          groupCode: groupeDuRole(intitule)
        });
        if (ouvert?.id) lots = [...lots, ouvert];
        rapport.lots.ouverts.push(intitule);
      }
    } catch (erreur) {
      manque(rapport, { quoi: "Un lot n'a pas pu être ouvert", sujet: intitule, cause: erreur });
    }
  }
}

/**
 * Crée les labels que ce compte rendu pose, et rend de quoi les poser.
 *
 * Les couleurs viennent de `label-du-cr.js` : les choisir ici ferait exister
 * deux jeux de couleurs, et le label apparaîtrait d'une teinte dans l'analyse
 * et d'une autre dans le projet (règle 4).
 *
 * @returns {Map<string, string>} le nom du label → son identifiant
 */
async function appliquerLesLabels(projectId, items, portes, rapport) {
  const lignes = retenus(items, ITEM_TYPE.LABEL);
  const parNom = new Map();
  if (lignes.length === 0) return parNom;

  const connus = (await portes.lireLesLabels?.(projectId).catch(() => null)) ?? null;
  if (!Array.isArray(connus)) {
    manque(rapport, { quoi: "Les labels du projet n'ont pas pu être lus : aucun label n'a été posé." });
    return parNom;
  }

  for (const ligne of lignes) {
    const nom = texte(ligne?.payload?.nom);
    if (!nom) continue;

    const deja = connus.find((label) => memeLabel(label?.name, nom) || memeLabel(label?.label_key, nom));
    if (deja?.id) {
      parNom.set(nom, deja.id);
      continue;
    }

    try {
      const cree = await portes.creerUnLabel(projectId, {
        name: nom,
        hexColor: COULEURS_DU_LABEL[nom]?.texte ?? "#8b949e"
      });
      if (cree?.id) {
        parNom.set(nom, cree.id);
        rapport.labels.crees.push(nom);
      }
    } catch (erreur) {
      manque(rapport, { quoi: "Un label n'a pas pu être créé", sujet: nom, cause: erreur });
    }
  }

  return parNom;
}

/**
 * Crée les jalons datés que ce compte rendu appelle, et rend de quoi les poser.
 *
 * **La date est la clé, pas le nom.** Un objectif nommé autrement mais daté du
 * même jour est le même jalon : en créer un second le doublerait, et les sujets
 * se répartiraient entre les deux.
 *
 * @returns {Map<string, string>} la date `AAAA-MM-JJ` → l'identifiant du jalon
 */
async function appliquerLesObjectifs(projectId, items, portes, rapport) {
  const lignes = retenus(items, ITEM_TYPE.OBJECTIF);
  const parDate = new Map();
  if (lignes.length === 0) return parDate;

  const connus = (await portes.lireLesObjectifs?.(projectId).catch(() => null)) ?? null;
  if (!Array.isArray(connus)) {
    manque(rapport, { quoi: "Les objectifs du projet n'ont pas pu être lus : aucun jalon n'a été posé." });
    return parDate;
  }

  for (const connu of connus) {
    const date = texte(connu?.dueDate ?? connu?.due_date);
    if (date && connu?.id && !parDate.has(date)) parDate.set(date, connu.id);
  }

  for (const ligne of lignes) {
    const date = texte(ligne?.payload?.date);
    if (!date || parDate.has(date)) continue;

    try {
      const cree = await portes.creerUnObjectif(projectId, {
        title: texte(ligne?.payload?.nom) || nomDeLObjectif(date),
        dueDate: date
      });
      if (cree?.id) {
        parDate.set(date, cree.id);
        rapport.objectifs.crees.push(date);
      }
    } catch (erreur) {
      manque(rapport, {
        quoi: "Un jalon n'a pas pu être créé",
        sujet: dateEnFrancais(date) || date,
        cause: erreur
      });
    }
  }

  return parDate;
}

/**
 * Pose sur chaque sujet touché ce que le compte rendu en dit.
 *
 * Le label, le jalon, et — pour un sujet relancé — la ligne d'activité qui dit
 * que cette réunion l'a redit.
 *
 * **Trois écritures indépendantes.** Un label qui ne se pose pas n'empêche pas
 * la relance de s'écrire : ce serait perdre l'information qu'on cherche pour
 * une étiquette qui se remet en un clic.
 */
async function appliquerAuxSujets({ projectId, sujets, labels, objectifs, compteRendu, portes, rapport }) {
  for (const { subjectId, point, relance } of sujets) {
    // Le nom du sujet, pour tout ce qui pourrait échouer en dessous. Un échec
    // qui ne nomme pas ce qu'il a raté ne se reprend pas à la main : on ne sait
    // pas sur quoi revenir.
    const nomDuSujet = texte(point?.titre) || subjectId;

    for (const nom of labelsDuSujet(point)) {
      const labelId = labels.get(nom);
      if (!labelId) continue;

      try {
        await portes.poserUnLabel(subjectId, labelId);
        rapport.poses.labels += 1;
      } catch (erreur) {
        manque(rapport, {
          quoi: `Le label « ${nom} » n'a pas pu être posé`,
          sujet: nomDuSujet,
          cause: erreur,
          reprise: { geste: GESTE.LABEL, subjectId, labelId, nom, sujet: nomDuSujet }
        });
      }
    }

    const date = texte(point?.echeanceDate);
    const objectifId = objectifs.get(date);
    if (objectifId) {
      try {
        await portes.poserUnObjectif(objectifId, subjectId);
        rapport.poses.objectifs += 1;
      } catch (erreur) {
        manque(rapport, {
          quoi: `Un sujet n'a pas pu être rattaché à l'échéance du ${dateEnFrancais(date) || date}`,
          sujet: nomDuSujet,
          cause: erreur,
          reprise: { geste: GESTE.OBJECTIF, subjectId, objectifId, date, sujet: nomDuSujet }
        });
      }
    }

    // **Une relance n'écrit plus de commentaire.**
    //
    // Chaque reprise en écrivait un — « CR n° 11 du 06/08 reporte ce point » —,
    // puis le n° 13, puis le n° 15. Sur un point qui traîne depuis dix
    // réunions, la discussion devient un journal de machine où l'on ne retrouve
    // plus ce que les gens, eux, ont écrit.
    //
    // Un compte rendu qui reprend un point ne prend pas la parole : c'est un
    // **fait**, et un fait se dit dans la ligne d'activité. Il s'enregistre dans
    // `subject_cr_mentions` avec ce que le document en écrit, et le fil le lit
    // — dix reprises de la même phrase en une ligne au lieu de dix messages
    // identiques (`services/reprise-sans-changement.js`).
    if (relance) rapport.relances += 1;
  }
}

/**
 * Ce qu'on écrit dans le fil d'un sujet qu'on ferme.
 *
 * **Dite ou déduite, la phrase n'est pas la même — et c'est tout l'objet.** Un
 * sujet fermé parce que le document l'écrit se justifie par cette phrase ; un
 * sujet fermé parce qu'il n'y figure plus se justifie par une absence. Dire
 * « le compte rendu le dit » dans le second cas serait affirmer ce qu'on n'a
 * pas lu (règle 5) — et c'est exactement ce qu'on ne pourrait plus démêler six
 * mois après.
 */
export function motifDeLaFermeture({ payload = {}, compteRendu = "" } = {}) {
  const nom = texte(compteRendu) || "un compte rendu de chantier";
  const signe = texte(payload?.signe);

  if (payload?.motif === FERMETURE.DEDUITE) {
    return `Fermé d'après ${nom} : ce sujet n'y figure plus. La fermeture est déduite de son `
      + "absence, non d'une phrase du document — il se rouvrira s'il revient.";
  }

  return `Fermé d'après ${nom}${signe ? ` : « ${signe} »` : ""}.`;
}

/**
 * Ferme les sujets que ce compte rendu solde.
 *
 * **En dernier, et ce n'est pas cosmétique.** Un sujet reçoit d'abord ce que ce
 * compte rendu en dit — son label, sa relance —, et se ferme ensuite. L'ordre
 * inverse mettrait la dernière activité du sujet après sa fermeture, et l'on
 * lirait un fil qui continue sur un sujet clos.
 *
 * La justification s'écrit **dans le fil** avant la fermeture, pour la même
 * raison : c'est la dernière chose qu'on lira en ouvrant le sujet, et elle doit
 * dire pourquoi il s'est fermé. Si elle échoue, on ferme quand même — le motif
 * est aussi porté par `closure_reason`, et un sujet resté ouvert par excès de
 * prudence est un sujet que personne ne referme.
 */
async function fermerLesSujets({ projectId, items, compteRendu, portes, rapport }) {
  const lignes = retenus(items, ITEM_TYPE.FERMETURE);
  if (lignes.length === 0) return;

  for (const ligne of lignes) {
    const payload = ligne.payload ?? {};
    const subjectId = texte(payload?.sujetId) || texte(ligne?.itemKey);
    const nomDuSujet = texte(payload?.titre) || subjectId;
    if (!subjectId) continue;

    const dit = motifDeLaFermeture({ payload, compteRendu });

    // La justification d'abord, la fermeture ensuite : un sujet fermé dont le
    // fil ne dirait pas pourquoi se rouvrirait à la main, faute de savoir.
    await portes.ecrireDansLeFil({ projectId, subjectId, bodyMarkdown: dit }).catch(() => {});

    try {
      const ferme = await portes.fermerUnSujet({ subjectId, reason: dit });
      if (ferme?.dejaFerme !== true) rapport.fermetures += 1;
    } catch (erreur) {
      manque(rapport, {
        quoi: "Un sujet n'a pas pu être fermé",
        sujet: nomDuSujet,
        cause: erreur,
        reprise: { geste: GESTE.FERMETURE, subjectId, motif: dit, sujet: nomDuSujet }
      });
    }
  }
}

/**
 * Applique un compte rendu signé, en une fois.
 *
 * @param {object} options
 * @param {string} options.projectId le projet
 * @param {object[]} options.items les affirmations de la proposition, avec leur
 *   statut — les refusées ne font rien
 * @param {{subjectId: string, point: object}[]} [options.ouverts] les sujets que
 *   la fusion vient d'ouvrir : ils reçoivent label et jalon comme les autres
 * @param {string} [options.compteRendu] le nom du compte rendu, tel qu'il
 *   s'écrira dans le fil des sujets relancés
 * @param {object} [options.portes] les écritures, feintes dans les tests
 * @returns {Promise<object>} ce qui a été fait, et ce qui ne l'a pas été
 */
export async function appliquerLeCompteRendu({
  projectId = "",
  items = [],
  ouverts = [],
  compteRendu = "",
  portes = null
} = {}) {
  const rapport = {
    labels: { crees: [] },
    objectifs: { crees: [] },
    poses: { labels: 0, objectifs: 0 },
    relances: 0,
    fermetures: 0,
    manques: []
  };

  const ouvertes = portes ?? (await portesParDefaut());

  // **Les lots ne sont pas ici.** Ils ont été ouverts avant que les sociétés
  // n'entrent — voir `ouvrirLesLotsRetenus` — parce que la base refuse une
  // société sans lot. Les rejouer ici ne casserait rien, mais ferait exister
  // deux endroits qui les ouvrent (règle 4).
  const labels = await appliquerLesLabels(projectId, items, ouvertes, rapport);
  const objectifs = await appliquerLesObjectifs(projectId, items, ouvertes, rapport);

  await appliquerAuxSujets({
    projectId,
    sujets: sujetsTouches({ items, ouverts }),
    labels,
    objectifs,
    compteRendu,
    portes: ouvertes,
    rapport
  });

  // Les fermetures en dernier : un sujet reçoit ce que ce compte rendu en dit,
  // puis se ferme. L'inverse mettrait sa dernière activité après sa fermeture.
  await fermerLesSujets({ projectId, items, compteRendu, portes: ouvertes, rapport });

  return rapport;
}

/**
 * Ce qu'il faut dire de l'application, quand il y a quelque chose à en dire.
 *
 * ## Ce que disait la phrase d'avant
 *
 * « Un sujet n'a pas pu être rattaché à son échéance. Un sujet n'a pas pu être
 * rattaché à son échéance. Un sujet n'a pas pu être rattaché à son échéance. La
 * fusion est faite : ces points se reprennent à la main. »
 *
 * Trois fois la même phrase, aucun nom, aucune cause, et un conseil
 * inapplicable : **on ne peut pas reprendre à la main des points qu'on ne
 * nomme pas.** C'était pire que le silence, parce que cela donnait l'apparence
 * d'avoir informé.
 *
 * ## Ce qu'elle dit maintenant
 *
 * Les échecs se **regroupent par nature**, chacun nomme les sujets qu'il
 * touche, et la cause de la base est reprise mot pour mot — c'est elle qui
 * permet de diagnostiquer, et la remplacer par une phrase polie la perdrait
 * (règle 5).
 *
 * **Le silence reste la bonne réponse quand tout s'est fait.** Une notification
 * qui annonce le succès à chaque fusion finit par ne plus être lue, et celle
 * qui compte se perd avec elle.
 */
export function phraseDeLApplication(rapport = null) {
  const manques = Array.isArray(rapport?.manques) ? rapport.manques : [];
  if (manques.length === 0) return "";

  const parNature = new Map();
  for (const manque of manques) {
    const cle = `${manque.quoi}|${manque.cause}`;
    if (!parNature.has(cle)) parNature.set(cle, { ...manque, sujets: [] });
    if (manque.sujet) parNature.get(cle).sujets.push(manque.sujet);
  }

  const phrases = [...parNature.values()].map((groupe) => {
    const combien = groupe.sujets.length;
    // Trois noms suffisent à savoir de quoi on parle ; au-delà, on compte.
    const nommes = groupe.sujets.slice(0, 3).map((nom) => `« ${nom} »`).join(", ");
    const reste = combien > 3 ? ` et ${combien - 3} autre${combien - 3 > 1 ? "s" : ""}` : "";

    return [
      combien > 1 ? `${groupe.quoi} (${combien} fois)` : groupe.quoi,
      nommes ? ` : ${nommes}${reste}` : "",
      groupe.cause ? ` — ${groupe.cause}` : "",
      "."
    ].join("");
  });

  const rejouables = reprisesDuRapport(rapport).length;

  return [
    ...phrases,
    "La fusion est faite ; rien n'est perdu.",
    rejouables > 0
      ? `${rejouables} de ces gestes peuvent être rejoués tels quels : « Reprendre » les refait, et eux seuls.`
      : ""
  ].filter(Boolean).join(" ");
}

/** Les gestes qu'une reprise saurait refaire, dans l'ordre où ils ont échoué. */
export function reprisesDuRapport(rapport = null) {
  return (Array.isArray(rapport?.manques) ? rapport.manques : [])
    .map((manque) => manque?.reprise)
    .filter((reprise) => reprise && Object.values(GESTE).includes(reprise.geste));
}

/**
 * Refaire ce qui a échoué, et **rien d'autre**.
 *
 * ## Pourquoi ce n'est pas « rejouer l'application »
 *
 * Rejouer tout écrirait une seconde relance dans chaque fil où la première a
 * réussi : le sujet porterait deux fois la même réunion, et c'est précisément
 * ce que le suivi doit distinguer. Une reprise ne refait donc que les gestes
 * que le rapport a marqués comme ratés, un par un.
 *
 * Elle peut échouer de nouveau — la base peut refuser une seconde fois —, et
 * elle le dit de la même façon : un rapport, avec les mêmes noms et les mêmes
 * causes. On peut reprendre autant de fois qu'on veut ; ce qui a réussi ne se
 * rejoue pas.
 *
 * @returns {Promise<{repris: number, manques: object[]}>}
 */
export async function reprendreCeQuiAEchoue({ reprises = [], portes = null } = {}) {
  const rapport = { repris: 0, manques: [] };
  const aFaire = Array.isArray(reprises) ? reprises : [];
  if (aFaire.length === 0) return rapport;

  const ouvertes = portes ?? (await portesParDefaut());

  for (const reprise of aFaire) {
    try {
      if (reprise.geste === GESTE.LABEL) {
        await ouvertes.poserUnLabel(reprise.subjectId, reprise.labelId);
      } else if (reprise.geste === GESTE.OBJECTIF) {
        await ouvertes.poserUnObjectif(reprise.objectifId, reprise.subjectId);
      } else if (reprise.geste === GESTE.FERMETURE) {
        await ouvertes.fermerUnSujet({ subjectId: reprise.subjectId, reason: reprise.motif });
      } else {
        continue;
      }
      rapport.repris += 1;
    } catch (erreur) {
      manque(rapport, {
        quoi: "Le geste a de nouveau échoué",
        sujet: texte(reprise?.sujet) || texte(reprise?.subjectId),
        cause: erreur,
        // Il reste rejouable : la cause peut être passagère.
        reprise
      });
    }
  }

  return rapport;
}
