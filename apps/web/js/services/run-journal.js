/**
 * Le journal d'une étape d'exécution.
 *
 * ## Le problème qu'il règle
 *
 * Le graphe d'exécution dit *quelles* étapes ont eu lieu et *combien de temps*
 * elles ont pris. Il ne dit pas ce qui s'y est passé. Tant qu'on s'en tient là,
 * un utilisateur à qui l'on annonce « le corpus a été relu » n'a aucun moyen de
 * savoir ce qui a été lu, dans quel ordre, ni — quand ça casse — où ça s'est
 * arrêté. On lui demande de nous croire sur parole. Ce n'est pas une façon
 * acceptable de rendre compte d'un calcul dont il est responsable devant son
 * client.
 *
 * ## Ce que ce fichier définit
 *
 * Une **écriture** (`journal()`), utilisée pendant l'exécution pour consigner ce
 * qui se passe, et une **lecture** (`numeroter()`), utilisée par l'écran pour
 * l'afficher. Les deux se tiennent parce qu'elles partagent la même forme.
 *
 * Une ligne est soit un fait — `{ texte, niveau }` —, soit un groupe repliable
 * — `{ groupe, statut, lignes: [...] }`. Un seul niveau d'imbrication : c'est ce
 * que fait GitHub, et au-delà l'arborescence coûte plus à lire qu'elle
 * n'explique.
 *
 * ## La numérotation, et pourquoi elle saute
 *
 * Toutes les lignes sont numérotées, **y compris celles repliées**. Quand un
 * groupe est fermé, la numérotation visible saute — de 2 à 10 — et ce saut est
 * l'information : il dit qu'il y a huit lignes là-dessous, sans les montrer.
 * Renuméroter à l'affichage donnerait une suite continue et mensongère.
 *
 * ## Ce qui n'est jamais écrit
 *
 * Une étape qui n'a pas tenu de journal n'en reçoit pas un vide qui se lirait
 * « rien ne s'est passé » : elle n'a pas de journal, l'écran le dit, et c'est
 * une lacune de notre instrumentation, pas un fait sur l'exécution.
 */

/** Ce qu'une ligne de journal peut valoir. */
export const NIVEAU = {
  /** Un fait. */
  INFO: "info",
  /** Ce qui mérite un second regard, sans avoir empêché la suite. */
  AVERTISSEMENT: "avertissement",
  /** Ce qui a échoué. */
  ECHEC: "echec"
};

/** Ce qu'une étape peut valoir, une fois finie. */
export const STATUT = {
  /** Elle est allée au bout. */
  OK: "ok",
  /** Elle s'est arrêtée là. */
  ECHEC: "echec",
  /** Elle n'a pas été tentée, parce qu'une précédente s'est arrêtée. */
  NON_ATTEINTE: "non-atteinte"
};

/** Le plafond de lignes par étape. Au-delà, on tronque **en le disant**. */
export const LIGNES_MAX = 400;

function texteDe(valeur) {
  return String(valeur ?? "").trim();
}

/**
 * Un carnet où l'exécution consigne ce qu'elle fait.
 *
 * Il ne lance pas d'exception et n'interrompt rien : un journal qui ferait
 * échouer l'analyse qu'il observe serait pire que pas de journal du tout.
 */
export function journal() {
  const lignes = [];
  let tronque = false;

  const ajouter = (ligne) => {
    if (lignes.length >= LIGNES_MAX) { tronque = true; return; }
    lignes.push(ligne);
  };

  const carnet = {
    /** Consigne un fait. */
    dire(texte, niveau = NIVEAU.INFO) {
      const t = texteDe(texte);
      if (t) ajouter({ texte: t, niveau });
      return carnet;
    },
    /** Consigne quelque chose qui mérite un second regard. */
    avertir(texte) { return carnet.dire(texte, NIVEAU.AVERTISSEMENT); },
    /** Consigne un échec, sans décider ce qu'il advient de l'étape. */
    echouer(texte) { return carnet.dire(texte, NIVEAU.ECHEC); },
    /**
     * Ouvre un groupe repliable et le remplit.
     *
     * Le statut du groupe se déduit de ce qu'on y a écrit : un groupe qui
     * contient un échec est en échec, quoi qu'en dise l'appelant.
     */
    groupe(titre, remplir) {
      const interne = journal();
      try { remplir?.(interne); } catch { /* un journal ne casse pas ce qu'il observe */ }
      const contenu = interne.lignes();
      const statut = contenu.some((l) => l.niveau === NIVEAU.ECHEC) ? STATUT.ECHEC
        : contenu.some((l) => l.niveau === NIVEAU.AVERTISSEMENT) ? NIVEAU.AVERTISSEMENT
          : STATUT.OK;
      ajouter({ groupe: texteDe(titre) || "…", statut, lignes: contenu });
      return carnet;
    },
    /** Ce qui a été consigné, prêt à être conservé. */
    lignes() {
      if (!tronque) return lignes;
      return [...lignes, { texte: `Journal tronqué à ${LIGNES_MAX} lignes.`, niveau: NIVEAU.AVERTISSEMENT }];
    }
  };
  return carnet;
}

/** Vrai si la valeur est un groupe repliable et non un fait isolé. */
export function estGroupe(ligne) {
  return Boolean(ligne && typeof ligne === "object" && typeof ligne.groupe === "string");
}

/**
 * Les lignes, numérotées comme elles se sont produites.
 *
 * Les enfants d'un groupe portent les numéros qui suivent celui de leur
 * en-tête. Replié, le groupe laisse donc un trou dans la suite visible : c'est
 * exactement ce qu'on veut lire.
 */
export function numeroter(lignes = []) {
  let numero = 0;
  const suivant = () => { numero += 1; return numero; };

  return (Array.isArray(lignes) ? lignes : []).map((ligne) => {
    if (estGroupe(ligne)) {
      const tete = suivant();
      const enfants = (ligne.lignes ?? []).map((enfant) => ({
        numero: suivant(),
        texte: texteDe(enfant?.texte),
        niveau: enfant?.niveau || NIVEAU.INFO
      }));
      return { numero: tete, groupe: ligne.groupe, statut: ligne.statut || STATUT.OK, lignes: enfants };
    }
    return { numero: suivant(), texte: texteDe(ligne?.texte), niveau: ligne?.niveau || NIVEAU.INFO };
  });
}

/** Le nombre total de lignes, repliées comprises. */
export function compterLignes(lignes = []) {
  return (Array.isArray(lignes) ? lignes : []).reduce(
    (total, ligne) => total + 1 + (estGroupe(ligne) ? (ligne.lignes ?? []).length : 0),
    0
  );
}

/**
 * Les étapes conservées d'une exécution, mises en forme.
 *
 * Une étape sans identifiant est écartée : on ne saurait ni la relier au graphe,
 * ni y revenir.
 */
export function etapesDe(entry = {}) {
  const brutes = entry?.details?.corpus?.steps;
  return (Array.isArray(brutes) ? brutes : [])
    .map((step) => ({
      id: texteDe(step?.id),
      label: texteDe(step?.label),
      ms: step?.ms === null || step?.ms === undefined || step?.ms === "" ? null
        : Number.isFinite(Number(step.ms)) ? Number(step.ms) : null,
      statut: step?.statut || STATUT.OK,
      lignes: Array.isArray(step?.lignes) ? step.lignes : null
    }))
    .filter((step) => step.id);
}

/** Une étape par son identifiant, ou `null`. Rien n'est approché. */
export function etapeDe(entry, id) {
  const cle = texteDe(id);
  return etapesDe(entry).find((step) => step.id === cle) ?? null;
}

/**
 * Les étapes sur lesquelles il y a quelque chose à ouvrir.
 *
 * C'est cette liste qui décide quels titres du graphe sont cliquables : rendre
 * cliquable un titre qui n'ouvre rien serait promettre un détail qu'on n'a pas.
 */
export function etapesConsultables(entry) {
  return new Set(etapesDe(entry).filter((step) => Array.isArray(step.lignes) && step.lignes.length > 0).map((s) => s.id));
}

/** Ce qu'une étape a produit, en trois nombres. */
export function resumerEtape(step) {
  const lignes = Array.isArray(step?.lignes) ? step.lignes : [];
  const aplati = lignes.flatMap((ligne) => (estGroupe(ligne) ? ligne.lignes ?? [] : [ligne]));
  return {
    total: compterLignes(lignes),
    avertissements: aplati.filter((l) => l?.niveau === NIVEAU.AVERTISSEMENT).length,
    echecs: aplati.filter((l) => l?.niveau === NIVEAU.ECHEC).length
  };
}

/**
 * Les étapes que l'exécution n'a pas atteintes, marquées comme telles.
 *
 * Quand une étape s'arrête, celles qui la suivaient n'ont pas « réussi
 * silencieusement » : elles n'ont pas eu lieu. Sans cette distinction, un
 * échec se lit comme un trou et personne ne sait où reprendre.
 */
export function marquerNonAtteintes(etapes = []) {
  let rompu = false;
  return (Array.isArray(etapes) ? etapes : []).map((step) => {
    if (rompu) return { ...step, statut: STATUT.NON_ATTEINTE };
    if (step?.statut === STATUT.ECHEC) rompu = true;
    return step;
  });
}
