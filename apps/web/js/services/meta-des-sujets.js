/**
 * Ce que chaque sujet porte, assemblé depuis ce que la base a réellement rendu.
 *
 * ## Pourquoi ce module existe
 *
 * Le filtre de la barre ne lit pas la base : on lui **donne** ce que chaque
 * sujet porte, et il décide. Cette table-là était jusqu'ici construite dans
 * l'écran, à la main, en nommant des clés du payload — et quatre de ces cinq
 * clés n'existaient pas. Rien ne le disait : un nom de clé absent rend
 * `undefined`, `undefined` devient une liste vide, une liste vide est un sujet
 * qui ne porte rien, et un sujet qui ne porte rien sort de tous les filtres.
 * « Assigné à moi » était donc vide, « créé par moi » aussi, « mentions »
 * aussi — trois lectures qui mentaient sans jamais échouer.
 *
 * Le remède n'est pas de corriger les noms sur place : c'est que cet assemblage
 * **s'exécute en test**, sur une charge utile de la forme que le chargeur
 * produit. Une clé qu'on renomme casse alors la suite, et non l'écran.
 *
 * ## Deux espaces d'identifiants, et ils ne se confondent pas
 *
 * Un **utilisateur** est un compte Mdall (`auth.uid()`, `subjects.created_by`).
 * Une **personne** est quelqu'un dans ce projet (`directory_people.id`, ce que
 * portent les assignations et les mentions). Les deux sont des UUID, ils se
 * ressemblent, et les comparer directement ne lève aucune erreur : la liste
 * sort vide, et l'on cherche le filtre.
 *
 * Tout ce qui sort d'ici est donc **en identifiants de personne**, l'auteur
 * compris : le trombinoscope du projet (`linked_user_id`) fait le pont, et
 * c'est le seul endroit où il se fait.
 *
 * ## Ce que ce module ne fait pas
 *
 * Il ne lit ni la base, ni le store. On lui passe la charge utile et le
 * trombinoscope ; il rend une table. Rien ici n'appelle quoi que ce soit.
 */

import { CLES_DE_LA_CHARGE } from "./charge-des-sujets.js";
import { normalizeAssigneeIds, resolveSubjectAssigneeIds } from "./subject-assignees-service.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Les identifiants d'une liste, qu'elle porte des objets ou des chaînes. */
function identifiants(valeurs) {
  return [...new Set((Array.isArray(valeurs) ? valeurs : [])
    .map((valeur) => texte(valeur?.id ?? valeur))
    .filter(Boolean))];
}

function objet(valeur) {
  return valeur && typeof valeur === "object" ? valeur : {};
}

/**
 * Le trombinoscope du projet, tel que l'écran le tient.
 *
 * On accepte les deux graphies — `personId`/`person_id`, `userId`/`linked_user_id` —
 * parce que ce trombinoscope est monté à deux endroits de l'application, et
 * qu'en exiger une seule ici ferait échouer l'autre en silence.
 *
 * @typedef {object} Collaborateur
 * @property {string} [personId] son identifiant de personne
 * @property {string} [userId] son compte Mdall, s'il en a un
 * @property {string} [projectLotId] le lot dans lequel le projet le range
 * @property {string} [name] son nom
 */
function personne(collaborateur = {}) {
  return {
    id: texte(collaborateur.personId ?? collaborateur.person_id ?? collaborateur.id),
    utilisateur: texte(collaborateur.userId ?? collaborateur.linkedUserId
      ?? collaborateur.linked_user_id ?? collaborateur.user_id),
    lot: texte(collaborateur.projectLotId ?? collaborateur.project_lot_id),
    nom: texte(collaborateur.name)
      || texte([collaborateur.firstName, collaborateur.lastName].filter(Boolean).join(" "))
      || texte(collaborateur.email)
  };
}

/**
 * Qui regarde, **dans ce projet**.
 *
 * `""` quand on ne sait pas — parce que le trombinoscope n'est pas encore
 * chargé, ou parce que celui qui regarde n'y figure pas. C'est une réponse, et
 * le filtre l'annonce au lieu de rendre une liste vide (règle 5).
 */
export function moiDansLeProjet({ collaborateurs = [], utilisateur = "" } = {}) {
  const compte = texte(utilisateur);
  if (!compte) return "";

  const trouve = (Array.isArray(collaborateurs) ? collaborateurs : [])
    .map(personne)
    .find((sien) => sien.id && sien.utilisateur === compte);

  return trouve ? trouve.id : "";
}

/**
 * Les personnes du projet, pour le vocabulaire de la barre.
 *
 * **Elles viennent du trombinoscope, et non des sujets.** Les tirer des
 * assignations ne déclarerait que ceux à qui l'on a déjà donné quelque chose :
 * on ne pourrait pas chercher les sujets de quelqu'un qui n'en a pas encore,
 * ce qui est précisément la question qu'on se pose en arrivant.
 */
export function personnesDuProjet(collaborateurs = []) {
  const vues = new Map();

  for (const collaborateur of Array.isArray(collaborateurs) ? collaborateurs : []) {
    const sien = personne(collaborateur);
    if (!sien.id || vues.has(sien.id)) continue;
    vues.set(sien.id, { id: sien.id, name: sien.nom || sien.id });
  }

  return [...vues.values()];
}

/** Le lot de chaque personne : la base range les personnes, pas les sujets. */
function lotsParPersonne(collaborateurs = []) {
  return new Map((Array.isArray(collaborateurs) ? collaborateurs : [])
    .map(personne)
    .filter((sien) => sien.id && sien.lot)
    .map((sien) => [sien.id, sien.lot]));
}

/** L'auteur de chaque sujet, en identifiant de personne. */
function auteursParUtilisateur(collaborateurs = []) {
  return new Map((Array.isArray(collaborateurs) ? collaborateurs : [])
    .map(personne)
    .filter((sien) => sien.id && sien.utilisateur)
    .map((sien) => [sien.utilisateur, sien.id]));
}

/**
 * Les situations de chaque sujet, **dans le sens où l'on interroge**.
 *
 * La charge utile range les sujets par situation ; le filtre demande l'inverse.
 * On retourne donc l'index une fois, ici, plutôt qu'à chaque sujet.
 */
function situationsParSujet(raw = {}) {
  const par = new Map();
  const poser = (sujet, situation) => {
    const cle = texte(sujet);
    const valeur = texte(situation);
    if (!cle || !valeur) return;
    if (!par.has(cle)) par.set(cle, new Set());
    par.get(cle).add(valeur);
  };

  for (const [situation, sujets] of Object.entries(objet(raw[CLES_DE_LA_CHARGE.sujetsParSituation]))) {
    for (const sujet of Array.isArray(sujets) ? sujets : []) poser(sujet, situation);
  }

  // `relationIdsBySubjectId` porte la colonne `situation_id` du sujet : la
  // situation qu'il tient de son versement, là où la table de liaison porte
  // celles qu'on lui a données à la main. Les deux comptent.
  for (const [sujet, situations] of Object.entries(objet(raw[CLES_DE_LA_CHARGE.situationsDuSujet]))) {
    for (const situation of identifiants(situations)) poser(sujet, situation);
  }

  return par;
}

/**
 * Les sujets qu'un lien `blocked_by` vise.
 *
 * **C'est `linksBySubjectId` qui les porte**, indexé dans les deux sens : un
 * même lien figure chez sa source et chez sa cible. On ne retient donc que
 * ceux dont le sujet regardé est la **source** — c'est lui qui attend.
 */
function sujetsBloques(raw = {}) {
  const bloques = new Set();

  for (const liens of Object.values(objet(raw[CLES_DE_LA_CHARGE.liens]))) {
    for (const lien of Array.isArray(liens) ? liens : []) {
      if (texte(lien?.link_type).toLowerCase() !== "blocked_by") continue;
      const source = texte(lien?.source_subject_id);
      if (source) bloques.add(source);
    }
  }

  return bloques;
}

/**
 * Ce que chaque sujet porte, par identifiant de sujet.
 *
 * @param {object} options
 * @param {object[]} options.sujets les sujets normalisés de l'écran
 * @param {object} options.raw la charge utile du chargeur des sujets
 * @param {Collaborateur[]} [options.collaborateurs] le trombinoscope du projet
 * @param {Record<string, string[]>} [options.assignesDeLAtelier] ce que l'Atelier
 *   a posé sans que la base l'ait encore : il prime, comme partout ailleurs
 * @returns {Record<string, import("./champs-des-sujets.js").MetaDuSujet>}
 */
export function metaDesSujets({
  sujets = [], raw = {}, collaborateurs = [], assignesDeLAtelier = {}
} = {}) {
  const charge = objet(raw);
  // **Les noms des index viennent de `charge-des-sujets.js`**, qui les produit :
  // c'est ce qui rend impossible la panne d'origine, où l'écran lisait quatre
  // clés que le chargeur n'écrivait pas.
  const labels = objet(charge[CLES_DE_LA_CHARGE.labels]);
  const objectifs = objet(charge[CLES_DE_LA_CHARGE.objectifs]);
  const assignes = objet(charge[CLES_DE_LA_CHARGE.assignes]);
  const mentions = objet(charge[CLES_DE_LA_CHARGE.mentions]);
  const enAtelier = objet(assignesDeLAtelier);

  const parLot = lotsParPersonne(collaborateurs);
  const parUtilisateur = auteursParUtilisateur(collaborateurs);
  const parSituation = situationsParSujet(charge);
  const bloques = sujetsBloques(charge);

  const meta = {};

  for (const sujet of Array.isArray(sujets) ? sujets : []) {
    const cle = texte(sujet?.id);
    if (!cle) continue;

    // **La même résolution que le tableau**, et non une seconde lecture des
    // mêmes colonnes : l'Atelier d'abord, la table de liaison ensuite, la
    // colonne du sujet à défaut. Deux résolutions divergeraient le jour où
    // l'une des trois sources change (règle 10).
    const siens = resolveSubjectAssigneeIds({
      subjectMetaAssignees: Array.isArray(enAtelier[cle]) ? enAtelier[cle] : undefined,
      assigneeMap: assignes,
      subjectId: cle,
      subject: sujet
    });

    const auteur = parUtilisateur.get(
      texte(sujet?.created_by ?? sujet?.createdBy ?? sujet?.raw?.created_by)
    ) ?? "";

    meta[cle] = {
      labels: identifiants(labels[cle]),
      objectifs: identifiants(objectifs[cle]),
      assignes: siens,
      mentions: normalizeAssigneeIds(mentions[cle]),
      // **L'auteur, et non l'assigné.** Les deux se confondent souvent et
      // divergent toujours au moment où ça compte : on cherche ce qu'on a
      // soi-même relevé, pas ce qu'on doit faire.
      auteurs: auteur ? [auteur] : [],
      situations: [...(parSituation.get(cle) ?? [])],
      // Le lot d'un sujet est celui de qui le porte : la base range les
      // **personnes** dans les lots, pas les sujets.
      lots: [...new Set(siens.map((qui) => parLot.get(qui)).filter(Boolean))],
      bloque: bloques.has(cle)
    };
  }

  return meta;
}
