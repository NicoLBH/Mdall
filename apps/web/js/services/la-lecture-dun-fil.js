/**
 * Ce qu'une lecture de fil de mails garde, et ce qu'on en rouvre.
 *
 * ## Ce qui se perdait
 *
 * Le lecteur de fils déplie gratuitement — un `.eml` est du texte structuré —
 * puis **relève par le modèle**, et cela coûte. Tout disparaissait en quittant
 * l'écran : on repayait le relevé pour revoir ce qu'il avait trouvé, et l'on
 * ne pouvait comparer deux lectures qu'en gardant deux captures d'écran.
 *
 * C'est exactement ce que `la-lecture-conservee.js` règle pour les comptes
 * rendus. Ce module fait la même chose pour les fils, et il est écrit à part
 * pour la même raison que la table l'est : un compte rendu a un numéro de
 * réunion et des rubriques, un fil a un objet et des prises de position. Les
 * coudre ensemble obligerait chacun à laisser vides les champs de l'autre.
 *
 * ## Une lecture est une photographie
 *
 * Elle gèle ce que la lecture a vu, et ne le recalcule jamais : le fil tel
 * qu'il a été déplié, les prises telles qu'elles ont été relevées, et les
 * idées telles qu'elles ont été coupées **ce jour-là**. Un fil relu six mois
 * plus tard, avec une liste de mots de liaison qui a bougé, ne rendrait pas les
 * mêmes idées — et une analyse qui change sous l'œil de celui qui la relit
 * n'est plus une analyse (règle 6).
 *
 * ## Ce qu'elle ne garde pas
 *
 * Rien de plus que ce que l'écran redessine. En particulier, elle ne recopie
 * pas les fichiers déposés : leur **nom** suffit à savoir ce qu'on a lu, et
 * garder des mégaoctets de messages pour les réafficher serait garder une
 * seconde fois ce que l'analyse porte déjà.
 *
 * ## Il est pur
 *
 * Un état d'écran entre, une ligne sort — et inversement.
 */

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/**
 * Le procédé de lecture d'un fil, et sa version.
 *
 * Il voyage avec chaque lecture conservée : sans lui, comparer deux lectures ne
 * dit pas si c'est le **fil** qui a changé ou la **façon de le lire**.
 */
export const LE_PROCEDE_DUN_FIL = "lecture d'un fil v1";

/** Par quoi un fil a été relevé : le modèle, et la version du procédé. */
export function leLecteurDunFil(modele = "") {
  return [texte(modele), LE_PROCEDE_DUN_FIL].filter(Boolean).join(" · ");
}

/** Les colonnes d'une lecture qu'on rouvre, écrites une fois (règle 10). */
export const LE_SELECT_DUN_FIL =
  "id,project_id,objet,fichiers,messages,commence_le,finit_le,mesures,lu_par,"
  + "analyse_gelee,proposition_id,created_at";

/**
 * Les colonnes qu'il suffit de lire pour **dresser la liste**.
 *
 * `analyse_gelee` n'en est pas : c'est la plus grosse, et la liste n'en montre
 * rien. La charger pour cinquante lignes afin d'en ouvrir une ferait passer
 * cinquante analyses sur le réseau pour en regarder une.
 */
export const LE_SELECT_DUNE_LIGNE_DE_FIL =
  "id,project_id,objet,fichiers,messages,commence_le,finit_le,mesures,lu_par,"
  + "proposition_id,created_at";

/**
 * Ce qu'on gèle d'une lecture de fil.
 *
 * `null` quand il n'y a rien à geler : un fil sans message n'est pas une
 * lecture, et en garder la coquille ferait une ligne qu'on ouvre pour rien.
 */
export function lanalyseDunFilAconserver(vue = null) {
  const fil = vue?.fil ?? null;
  if (!liste(fil?.messages).length) return null;

  return {
    // **Le fil tel qu'il a été déplié, entier.** C'est ce que l'écran
    // redessine : en retirer une part reviendrait à rouvrir une lecture
    // amputée, sans que rien ne dise de quoi.
    fil: {
      objet: texte(fil.objet),
      objetNu: texte(fil.objetNu),
      ordre: texte(fil.ordre),
      debut: texte(fil.debut),
      fin: texte(fil.fin),
      doublons: Number(fil.doublons) || 0,
      messages: liste(fil.messages),
      trous: liste(fil.trous),
      phrase: texte(fil.phrase)
    },

    /**
     * Le relevé, **tel qu'il est revenu**.
     *
     * `null` quand il n'a pas eu lieu — et c'est une information : un fil
     * déplié sans relevé est une lecture qui n'a rien coûté, pas une lecture
     * qui n'a rien trouvé (règle 5).
     */
    releve: vue?.releve && !vue.releve.enCours && !vue.releve.motif
      ? {
        prises: liste(vue.releve.prises),
        derive: vue.releve.derive ?? null,
        constateAu: texte(vue.releve.constateAu),
        modele: texte(vue.releve.modele),
        jetons: vue.releve.jetons ?? null
      }
      : null,

    /**
     * **Les idées que ce fil énonce, gelées avec le reste.**
     *
     * Relevées au moment de la lecture, et non à l'ouverture de l'écran : la
     * liste des mots de liaison bougera.
     */
    idees: liste(vue?.idees),

    /** La version de ce qu'on gèle. Elle dira, un jour, comment relire. */
    forme: 1
  };
}

/**
 * La ligne à écrire pour une lecture de fil.
 *
 * `null` quand il manque de quoi la retrouver : sans projet, personne ne la
 * reverra ; sans message, il n'y a rien à revoir.
 */
export function laLigneDunFil(vue = null, { projectId = "", propositionId = "" } = {}) {
  const analyse = lanalyseDunFilAconserver(vue);
  if (!texte(projectId) || !analyse) return null;

  const fil = analyse.fil;

  return {
    project_id: texte(projectId),
    objet: fil.objet,
    // Les **noms** des fichiers, pas les fichiers : savoir ce qu'on a déposé
    // suffit à ne pas le redéposer.
    fichiers: liste(vue?.fichiers).map((un) => texte(un?.name) || texte(un)).filter(Boolean),
    messages: fil.messages.length,
    commence_le: fil.debut,
    finit_le: fil.fin,
    mesures: lesMesuresDunFil(vue),
    lu_par: leLecteurDunFil(analyse.releve?.modele),
    analyse_gelee: analyse,
    // `null` et non `""` : la colonne est une clé étrangère, et une chaîne vide
    // n'est pas un identifiant absent — c'est un identifiant invalide.
    proposition_id: texte(propositionId) || null
  };
}

/**
 * Ce qu'une lecture de fil vaut, en nombres.
 *
 * **Ils n'ont de sens que comparés.** « 3 trous » ne dit rien ; « 3 trous là où
 * le fil précédent en donnait 1 » dit que la lecture a dérivé.
 */
export function lesMesuresDunFil(vue = null) {
  const fil = vue?.fil ?? null;

  return {
    messages: liste(fil?.messages).length,
    doublons: Number(fil?.doublons) || 0,
    trous: liste(fil?.trous).length,
    // **`null` et non `0` quand le relevé n'a pas eu lieu.** Zéro prise se lit
    // « le modèle n'a rien trouvé » ; on ne lui a rien demandé (règle 5).
    prises: vue?.releve?.prises ? liste(vue.releve.prises).length : null,
    idees: liste(vue?.idees).length
  };
}

/**
 * L'état d'écran d'une lecture de fil conservée.
 *
 * `null` quand la ligne ne porte pas d'analyse. L'écran le dit, plutôt que de
 * dessiner une lecture vide qui ferait croire que le fil ne portait rien
 * (règle 5).
 */
export function laVueDunFil(ligne = null) {
  const analyse = ligne?.analyse_gelee ?? null;
  if (!analyse?.fil) return null;

  return {
    phase: "lu",
    fil: analyse.fil,
    releve: analyse.releve ? { ...analyse.releve, enCours: false } : null,
    idees: liste(analyse.idees),
    fichiers: [],
    conservee: {
      id: texte(ligne?.id),
      propositionId: texte(ligne?.proposition_id),
      lueLe: texte(ligne?.created_at),
      luPar: texte(ligne?.lu_par)
    }
  };
}

/**
 * Les lectures rangées : la plus récente d'abord.
 *
 * Un fil n'a pas de numéro de réunion : ce qui le date est son **dernier
 * message**, et c'est par là qu'on le cherche. À égalité, la dernière lecture
 * passe devant — c'est celle qu'on vient de faire.
 */
export function lesLecturesDeFilsEnOrdre(lignes = []) {
  return [...liste(lignes)].sort((gauche, droite) => {
    const a = texte(gauche?.finit_le);
    const b = texte(droite?.finit_le);
    if (a !== b) return b.localeCompare(a, "fr");
    return (Date.parse(texte(droite?.created_at)) || 0) - (Date.parse(texte(gauche?.created_at)) || 0);
  });
}

/**
 * Une lecture par fil : **la plus récente**.
 *
 * Relever le même fil écrit une seconde ligne — c'est voulu, c'est ainsi qu'on
 * compare deux consignes (règle 6). Mais l'accueil liste des **fils**, pas des
 * essais : montrer trois lignes pour le même objet ferait croire à trois
 * échanges.
 */
export function lesFilsLus(lignes = []) {
  const parFil = new Map();

  for (const ligne of lesLecturesDeFilsEnOrdre(lignes)) {
    // L'identité d'un fil : son objet. Deux dépôts des mêmes messages sont deux
    // lectures du même fil, et c'est ce qu'on veut.
    const cle = texte(ligne?.objet).toLowerCase();
    if (!cle) continue;

    const deja = parFil.get(cle);
    if (deja) { deja.relectures += 1; continue; }
    parFil.set(cle, { ...ligne, relectures: 1 });
  }

  return [...parFil.values()];
}

/**
 * Ce qu'on donne à couper d'un fil : ses phrases.
 *
 * ## Pourquoi des phrases, et non des messages
 *
 * Le découpage retient le **premier** mot de liaison d'un texte. Un message de
 * vingt phrases ne rendrait donc qu'une idée — celle de sa première liaison —,
 * et les dix-neuf autres seraient perdues sans que rien ne le dise. Découpé en
 * phrases, le même message en rend autant qu'il en énonce.
 *
 * ## Pourquoi le propos, et non le message entier
 *
 * Un message porte ce qu'il **dit** et ce qu'il **cite**. Couper les citations
 * compterait deux fois la même idée — une fois chez celui qui l'a écrite, une
 * fois chez celui qui l'a recopiée — et la ferait paraître deux fois plus
 * solide qu'elle n'est.
 *
 * ## Quatre mots, et pas moins
 *
 * « Bien reçu. », « Merci. », « Cordialement. » ne portent rien à couper, et
 * elles sont la moitié d'un fil. Les donner au découpage ne rendrait rien et
 * ferait un dénominateur faux : « 2 idées sur 400 phrases » se lirait comme un
 * échec là où il n'y avait que 60 phrases à lire.
 */
export function lesPhrasesDunFil(fil = null) {
  return liste(fil?.messages)
    .flatMap((message) => texte(message?.propos)
      // Les fins de phrase, et les retours à la ligne : un mail s'écrit en
      // listes à puces autant qu'en phrases, et une puce est une phrase.
      .split(/[.!?\n]+/))
    .map((phrase) => phrase.replace(/\s+/g, " ").trim())
    .filter((phrase) => phrase.split(" ").filter(Boolean).length >= 4);
}
