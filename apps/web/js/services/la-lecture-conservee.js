/**
 * Ce qu'une lecture de compte rendu garde, et ce qu'on en rouvre.
 *
 * ## Ce qui s'est perdu, et il faut le retrouver
 *
 * L'écran de l'Atelier montrait tout : le document refait, les points relevés,
 * la confrontation au projet, les lots, les labels, les fermetures proposées.
 * La lecture est passée au serveur — pour que dix-neuf comptes rendus ne
 * bloquent plus l'écran une heure —, et **cet affichage a disparu avec elle**.
 *
 * Il y avait déjà, avant, une perte plus discrète : une fois le compte rendu
 * transformé en proposition, son analyse n'existait plus nulle part. On ne
 * pouvait plus revenir voir ce que la lecture avait vu.
 *
 * ## Une lecture est une photographie
 *
 * Ce module gèle ce que la lecture a vu, et ne le recalcule jamais. Les points
 * tels qu'ils ont été relevés, et la confrontation telle qu'elle s'est faite
 * **ce jour-là**, contre les sujets qui existaient **ce jour-là**.
 *
 * C'est ce qui répond à la question des sujets ouverts et fermés :
 *
 *   un sujet rapproché en mars et fermé depuis ne rend pas la lecture de mars
 *   fausse — elle a eu lieu, et ce qu'elle a vu reste vrai de mars (règle 6).
 *
 * L'écran lit l'état d'aujourd'hui **à côté**, en direct, dans `subjects`. Deux
 * colonnes, et aucune confusion : « vu le 12/03 » et « aujourd'hui ».
 * Recalculer la photographie à l'ouverture aurait fait l'inverse — une lecture
 * qui change toute seule, et qu'on ne peut plus opposer à personne.
 *
 * ## L'ordre est celui des réunions, pas celui des lectures
 *
 * « Si on ajoute un CR n° 12 après l'analyse des CR 15 et 16, il doit reprendre
 * naturellement sa place. » Il la reprend, parce que **rien ne dépend de
 * l'ordre dans lequel on a lu** : chaque lecture ne dit que ce qu'elle a vu, et
 * la liste se range sur la date du compte rendu, jamais sur celle de son
 * analyse.
 *
 * ## Il est pur, et il descend au serveur
 *
 * Le navigateur et la fonction de bord gardent la **même** chose, par le même
 * module. Deux versions auraient gardé deux analyses différentes du même écran,
 * et la seconde serait fausse avant d'être finie (règle 4).
 */

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/**
 * Le procédé de lecture, et sa version.
 *
 * Il voyage avec chaque lecture conservée : sans lui, comparer deux lectures ne
 * dit pas si c'est le **document** qui a changé ou la **façon de le lire**.
 *
 * Il vivait dans l'écran de l'Atelier, et le serveur — qui lit par les mêmes
 * services — ne l'écrivait pas. Deux lectures du même procédé se disaient donc
 * faites par deux procédés différents (règle 10).
 */
export const LE_PROCEDE_DE_LECTURE = "lecture de CR v1";

/** Par quoi un compte rendu a été lu : le modèle, et la version du procédé. */
export function leLecteur(modele = "") {
  return [texte(modele), LE_PROCEDE_DE_LECTURE].filter(Boolean).join(" · ");
}

/** Les colonnes d'une lecture qu'on relit, écrites une fois (règle 10). */
export const LE_SELECT_DUNE_LECTURE =
  "id,project_id,document,document_id,proposition_id,numero_de_reunion,tenue_le,"
  + "mesures,analyse_gelee,lu_par,created_at";

/**
 * Les colonnes qu'il suffit de lire pour **dresser la liste**.
 *
 * `analyse_gelee` n'en est pas : c'est la plus grosse, et la liste n'en montre
 * rien.
 * La charger pour cinquante lignes afin d'en ouvrir une ferait passer cinquante
 * analyses sur le réseau pour en regarder une.
 */
export const LE_SELECT_DUNE_LIGNE =
  "id,project_id,document,document_id,proposition_id,numero_de_reunion,tenue_le,"
  + "mesures,lu_par,created_at";

/**
 * Ce qu'on gèle d'une lecture.
 *
 * `null` quand il n'y a rien à geler : une lecture sans points n'est pas une
 * lecture, et en garder la coquille ferait une ligne qu'on ouvre pour rien.
 *
 * @param {object} vue l'état de l'écran, ou ce que la fonction de bord a assemblé
 */
export function lanalyseAConserver(vue = null) {
  const lecture = vue?.lecture ?? null;
  if (!liste(lecture?.points).length) return null;

  return {
    // **Ce que la lecture a rendu, tel quel.** C'est ce que l'écran redessine :
    // en retirer une part ici reviendrait à ouvrir demain une analyse amputée,
    // sans que rien ne dise de quoi.
    lecture: {
      nom: texte(lecture.nom),
      identite: {
        numero: texte(lecture?.identite?.numero),
        tenueLe: texte(lecture?.identite?.tenueLe)
      },
      pages: liste(lecture.pages),
      rubriques: liste(lecture.rubriques),
      groupesParLot: liste(lecture.groupesParLot),
      points: liste(lecture.points),
      ecartes: Number(lecture.ecartes) || 0,
      mesure: lecture.mesure ?? null,
      lueSur: texte(lecture.lueSur),
      luPar: texte(lecture.luPar),
      liensEcartes: liste(lecture.liensEcartes),
      coupee: lecture.coupee === true
    },

    /**
     * La confrontation **telle qu'elle s'est faite**.
     *
     * `null` est gardé pour ce qu'il dit : on n'a pas pu lire les sujets du
     * projet. Le remplacer par `[]` ferait rouvrir, dans six mois, une lecture
     * qui prétendrait que le chantier ne suivait rien (règle 5).
     */
    confrontes: vue?.confrontes === null || vue?.confrontes === undefined
      ? null
      : liste(vue.confrontes),

    /**
     * Les sujets du projet **au jour de la lecture**.
     *
     * Ce sont eux qui disent, à la relecture, ce que la confrontation avait
     * sous les yeux. Sans eux, un rapprochement vers un sujet depuis renommé
     * n'afficherait plus qu'un identifiant.
     */
    sujetsDuProjet: vue?.sujetsDuProjet === null || vue?.sujetsDuProjet === undefined
      ? null
      : liste(vue.sujetsDuProjet).map((sujet) => ({
          id: texte(sujet?.id),
          subject_number: sujet?.subject_number ?? null,
          title: texte(sujet?.title),
          status: texte(sujet?.status),
          parent_subject_id: texte(sujet?.parent_subject_id) || null
        })),

    /** La version de ce qu'on gèle. Elle dira, un jour, comment relire d'anciennes lignes. */
    forme: 1
  };
}

/**
 * La ligne à écrire pour une lecture.
 *
 * `null` quand il manque de quoi la retrouver : sans projet, personne ne la
 * reverra.
 */
export function laLigneDuneLecture(vue = null, {
  projectId = "", documentId = "", propositionId = ""
} = {}) {
  const lecture = vue?.lecture ?? null;
  if (!texte(projectId) || !lecture?.mesure) return null;

  return {
    project_id: texte(projectId),
    document: texte(lecture?.nom),
    // `null` et non `""` : la colonne est une clé étrangère, et une chaîne vide
    // n'est pas un identifiant absent — c'est un identifiant invalide.
    document_id: texte(documentId) || null,
    proposition_id: texte(propositionId) || null,
    numero_de_reunion: texte(lecture?.identite?.numero),
    tenue_le: texte(lecture?.identite?.tenueLe),
    mesures: lecture.mesure,
    // **`analyse_gelee`, et non `analyse`** : `ANALYSE` est un mot réservé de
    // PostgreSQL, et la migration qui l'employait a été refusée au déploiement.
    analyse_gelee: lanalyseAConserver(vue),
    lu_par: texte(lecture?.luPar)
  };
}

/**
 * L'état d'écran d'une lecture conservée.
 *
 * `null` quand la ligne ne porte pas d'analyse — les lectures d'avant la
 * migration n'en ont pas. L'écran le dit, plutôt que de dessiner une lecture
 * vide qui ferait croire que le compte rendu ne portait rien (règle 5).
 *
 * @param {object} ligne une ligne de `cr_lectures`
 * @param {object} [aujourdhui] ce qu'on sait **maintenant** : `{sujetsDuProjet}`
 */
export function laVueDuneLecture(ligne = null, aujourdhui = {}) {
  const analyse = ligne?.analyse_gelee ?? null;
  if (!analyse?.lecture) return null;

  return {
    phase: "lue",
    etape: "",
    conservee: {
      id: texte(ligne?.id),
      documentId: texte(ligne?.document_id),
      propositionId: texte(ligne?.proposition_id),
      lueLe: texte(ligne?.created_at)
    },
    lecture: analyse.lecture,
    confrontes: analyse.confrontes ?? null,
    /** Ce que la lecture avait sous les yeux — figé. */
    sujetsDuProjet: analyse.sujetsDuProjet ?? null,
    /**
     * Ce que le projet suit **aujourd'hui** — lu en direct, et jamais mêlé au
     * gelé. C'est la deuxième colonne : « vu le 12/03 » et « aujourd'hui ».
     */
    sujetsAujourdhui: aujourdhui?.sujetsDuProjet ?? null,
    // Rien de ce qui suit n'est gelé : ce sont des états du projet, et les
    // inventer à la relecture ferait dire à l'écran ce qu'il ne sait pas.
    labels: null,
    lots: null,
    objectifs: null,
    situations: null,
    suivi: null,
    fichier: null,
    choix: null,
    pagesLues: []
  };
}

/**
 * Ce qu'un sujet vu par la lecture est devenu.
 *
 * @returns {{connu: boolean, statut: string, titre: string}} `connu: false`
 *   quand on n'a pas pu lire les sujets d'aujourd'hui, ou quand le sujet n'y est
 *   plus. Les deux ne se disent pas pareil, et l'appelant le sait par
 *   `sujetsAujourdhui === null`.
 */
export function ceQueLeSujetEstDevenu(id = "", sujetsAujourdhui = null) {
  if (!Array.isArray(sujetsAujourdhui)) return { connu: false, statut: "", titre: "" };

  const trouve = sujetsAujourdhui.find((sujet) => texte(sujet?.id) === texte(id));
  if (!trouve) return { connu: false, statut: "", titre: "" };

  return {
    connu: true,
    statut: texte(trouve.status) || "open",
    titre: texte(trouve.title)
  };
}

/**
 * Le rang d'une lecture dans la liste : **la date de la réunion d'abord**.
 *
 * Un compte rendu tenu en mars et lu en septembre est de mars. Trier sur la
 * date de lecture rangerait le n° 12, lu après les n° 15 et 16, devant eux.
 *
 * Une lecture sans date se range sur son numéro, et une lecture sans numéro
 * passe en dernier, sur la date de sa lecture : on ne lui invente pas une place
 * dans la chronologie du chantier (règle 5).
 */
function leRang(ligne) {
  const jour = texte(ligne?.tenue_le);
  const quand = Date.parse(jour);
  if (Number.isFinite(quand)) return { rang: 0, cle: quand };

  const numero = Number(texte(ligne?.numero_de_reunion).replace(/[^\d]/g, ""));
  if (Number.isFinite(numero) && numero > 0) return { rang: 1, cle: numero };

  return { rang: 2, cle: Date.parse(texte(ligne?.created_at)) || 0 };
}

/**
 * Les lectures d'un projet, **la réunion la plus récente d'abord**.
 *
 * Le même sens que partout ailleurs dans Mdall : ce qui vient de se passer est
 * en haut. Et comme le rang ne dépend que du compte rendu lui-même, en ajouter
 * un plus ancien le pose à sa place sans rien déplacer d'autre.
 */
export function lesLecturesEnOrdre(lignes = []) {
  return [...liste(lignes)].sort((gauche, droite) => {
    const a = leRang(gauche);
    const b = leRang(droite);
    if (a.rang !== b.rang) return a.rang - b.rang;
    if (a.cle !== b.cle) return b.cle - a.cle;
    // À égalité parfaite, la dernière lecture passe devant : c'est celle qu'on
    // vient de faire, et c'est elle qu'on vient regarder.
    return (Date.parse(texte(droite?.created_at)) || 0) - (Date.parse(texte(gauche?.created_at)) || 0);
  });
}

/**
 * Une lecture par compte rendu : **la plus récente**.
 *
 * Relire le même document écrit une seconde ligne — c'est voulu, c'est ainsi
 * qu'on compare deux consignes (règle 6). Mais l'accueil liste des **comptes
 * rendus**, pas des essais : montrer trois lignes pour le même document ferait
 * croire à trois réunions.
 *
 * On garde donc la dernière de chaque document, et l'on dit combien de fois il
 * a été lu. Les autres ne sont pas perdues : elles sont en base, et le suivi
 * s'en sert toujours.
 */
export function lesComptesRendusLus(lignes = []) {
  const parDocument = new Map();

  for (const ligne of lesLecturesEnOrdre(lignes)) {
    // L'identité d'un compte rendu : sa ligne dans Fichiers quand il en a une,
    // son nom de fichier sinon. Deux dépôts du même PDF depuis le disque sont
    // bien deux lectures du même compte rendu.
    const cle = texte(ligne?.document_id) || texte(ligne?.document).toLowerCase();
    if (!cle) continue;

    const deja = parDocument.get(cle);
    if (deja) { deja.relectures += 1; continue; }
    parDocument.set(cle, { ...ligne, relectures: 1 });
  }

  return [...parDocument.values()];
}
