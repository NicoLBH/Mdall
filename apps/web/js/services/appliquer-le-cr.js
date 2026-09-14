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
import { ITEM_TYPE } from "./proposition-review.js";
import { ITEM } from "./proposition-state.js";

const texte = (valeur) => String(valeur ?? "").trim();

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
 * Ce qu'on écrit dans le fil d'un sujet que ce compte rendu relance.
 *
 * ## Pourquoi un message, et pas un champ
 *
 * Un sujet relancé n'a pas changé d'état : il était ouvert, il le reste. Ce qui
 * a changé est qu'une réunion de plus l'a redit — et cela est une **activité**,
 * datée, citée, qui se lit dans le fil à côté de ce que les gens en ont dit.
 * L'écrire dans un champ le remplacerait à chaque compte rendu, et l'on
 * perdrait justement ce qu'on cherche : depuis combien de réunions ce point
 * est-il redit sans bouger.
 *
 * ## Ce que le message porte, et pourquoi
 *
 * Le compte rendu qui le redit ; ce qu'il en écrit, mot pour mot ; sa page.
 * Sans la citation et la page, la ligne se conteste sans pouvoir se vérifier —
 * et une ligne qu'on ne peut pas remonter à son document finit par n'être plus
 * crue du tout.
 *
 * Puis ce que le compte rendu remet à jour : l'échéance, à qui il revient, ce
 * qu'il en dit. Seulement ce qui est écrit : une ligne « échéance : — » ferait
 * lire une absence comme une décision.
 */
export function messageDeRelance({ point = {}, compteRendu = "" } = {}) {
  const nom = texte(compteRendu) || "Un compte rendu de chantier";
  const lignes = [`**${nom}** reporte ce point.`];

  const citation = texte(point?.evidence);
  if (citation) lignes.push("", `> ${citation.replace(/\n+/g, " ")}`);

  const dit = texte(point?.description);
  // La description n'est reprise que si elle apporte autre chose que la
  // citation : les redire toutes les deux ferait un message deux fois long qui
  // dit une fois la même chose.
  if (dit && dit !== citation) lignes.push("", dit);

  const precisions = [];
  const reference = texte(point?.reference);
  if (reference) precisions.push(`Point ${reference}`);
  const lot = texte(point?.lot);
  if (lot) precisions.push(lot);
  if (Number.isFinite(Number(point?.page)) && Number(point.page) > 0) {
    precisions.push(`page ${Number(point.page)}`);
  }

  const etat = texte(point?.etat);
  if (etat) precisions.push(`état : ${etat}`);
  const qui = texte(point?.qui);
  if (qui) precisions.push(`revient à : ${qui}`);

  const echeance = texte(point?.echeance);
  const date = dateEnFrancais(texte(point?.echeanceDate));
  if (echeance) precisions.push(`échéance : ${echeance}${date && date !== echeance ? ` (${date})` : ""}`);

  if (precisions.length > 0) lignes.push("", `*${precisions.join(" · ")}*`);

  return lignes.join("\n");
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
    ecrireDansLeFil: (message) => fil.createMessage(message)
  };
}

/** Ce qu'on n'a pas su faire, dit une fois, sans faire tomber le reste. */
function manque(rapport, phrase) {
  if (phrase) rapport.manques.push(phrase);
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
    manque(rapport, `${lignes.length} lot(s) n'ont pas pu être ouverts : les lots du projet n'ont pas pu être lus.`);
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
    } catch {
      manque(rapport, `Le lot « ${intitule} » n'a pas pu être ouvert.`);
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
    manque(rapport, "Les labels du projet n'ont pas pu être lus : aucun label n'a été posé.");
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
    } catch {
      manque(rapport, `Le label « ${nom} » n'a pas pu être créé.`);
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
    manque(rapport, "Les objectifs du projet n'ont pas pu être lus : aucun jalon n'a été posé.");
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
    } catch {
      manque(rapport, `L'objectif du ${dateEnFrancais(date) || date} n'a pas pu être créé.`);
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
    for (const nom of labelsDuSujet(point)) {
      const labelId = labels.get(nom);
      if (!labelId) continue;

      try {
        await portes.poserUnLabel(subjectId, labelId);
        rapport.poses.labels += 1;
      } catch {
        manque(rapport, `Le label « ${nom} » n'a pas pu être posé sur un sujet.`);
      }
    }

    const objectifId = objectifs.get(texte(point?.echeanceDate));
    if (objectifId) {
      try {
        await portes.poserUnObjectif(objectifId, subjectId);
        rapport.poses.objectifs += 1;
      } catch {
        manque(rapport, "Un sujet n'a pas pu être rattaché à son échéance.");
      }
    }

    if (!relance) continue;

    try {
      await portes.ecrireDansLeFil({
        projectId,
        subjectId,
        bodyMarkdown: messageDeRelance({ point, compteRendu })
      });
      rapport.relances += 1;
    } catch {
      manque(rapport, `La relance de « ${texte(point?.titre) || "un sujet"} » n'a pas pu être écrite.`);
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

  return rapport;
}

/**
 * Ce qu'il faut dire de l'application, quand il y a quelque chose à en dire.
 *
 * **Le silence est la bonne réponse quand tout s'est fait.** Une notification
 * qui annonce le succès à chaque fusion finit par ne plus être lue, et celle
 * qui compte — celle qui dit qu'il manque quelque chose — se perd avec elle.
 */
export function phraseDeLApplication(rapport = null) {
  const manques = Array.isArray(rapport?.manques) ? rapport.manques : [];
  if (manques.length === 0) return "";

  return [
    ...manques.slice(0, 3),
    manques.length > 3 ? `Et ${manques.length - 3} autre(s).` : "",
    "La fusion est faite : ces points se reprennent à la main."
  ].filter(Boolean).join(" ");
}
