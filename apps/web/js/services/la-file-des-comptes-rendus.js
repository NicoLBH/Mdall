/**
 * La file des comptes rendus — **où elle en est, et ce qu'elle a laissé**.
 *
 * ## Pourquoi une file, et pas une boucle
 *
 * Trente comptes rendus se lisent l'un après l'autre, et chacun peut échouer
 * seul : un PDF dont aucune page ne se déchiffre, un appel coupé, un document
 * dont le dépôt n'avait pas abouti. Une boucle qui s'arrête au premier échec
 * abandonnerait vingt-neuf lectures pour un document illisible, et une boucle
 * qui avale les échecs en silence rendrait « 30 lus » dont on ne saurait pas
 * que trois ont manqué.
 *
 * **Ce qui a échoué se nomme, document par document** (règle 5). C'est la seule
 * façon de reprendre : on sait lesquels relancer.
 *
 * ## Ce que la file ne décide pas
 *
 * Elle ne lit rien et n'appelle rien. L'écran lui demande « quel est le
 * suivant ? », fait le geste qu'il sait déjà faire, et lui dit comment cela
 * s'est passé. C'est ce qui permet de l'éprouver sans navigateur et sans un
 * seul appel au modèle.
 *
 * ## Une exécution qui a eu lieu ne devient pas fausse (règle 6)
 *
 * Un compte rendu lu reste lu, même si le suivant échoue, même si l'on ferme
 * l'écran. La file ne se réécrit pas en arrière : elle avance, et garde la
 * trace de chaque pas.
 *
 * ## Il est pur
 *
 * Des identifiants entrent, un état sort.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Où en est un document de la file. */
export const DANS_LA_FILE = {
  ATTEND: "attend",
  EN_COURS: "en-cours",
  PROPOSE: "propose",
  ECHOUE: "echoue"
};

/** Ce qu'on dit de chaque état. Écrit une fois (règle 10). */
export const DANS_LA_FILE_DIT = {
  [DANS_LA_FILE.ATTEND]: "en attente",
  [DANS_LA_FILE.EN_COURS]: "lecture en cours",
  [DANS_LA_FILE.PROPOSE]: "proposition prête",
  [DANS_LA_FILE.ECHOUE]: "n'a pas pu être lu"
};

/**
 * Une file neuve, à partir de ce qui a été choisi.
 *
 * L'ordre est celui des noms, et non celui des clics : on monte une sélection
 * en descendant plusieurs dossiers, et une file qui suivrait l'ordre des coches
 * se lirait au hasard.
 */
export function uneFileDeComptesRendus(choisis = null, connues = []) {
  const voulus = new Set(choisis ?? []);
  const parId = new Map(
    (Array.isArray(connues) ? connues : []).map((une) => [texte(une?.id), une])
  );

  return {
    pas: [...voulus]
      .map((id) => texte(id))
      .filter((id) => id && parId.has(id))
      .map((id) => ({
        id,
        nom: texte(parId.get(id)?.nom) || "Document",
        lecture: texte(parId.get(id)?.lecture),
        ou: DANS_LA_FILE.ATTEND,
        motif: ""
      }))
      .sort((gauche, droite) => gauche.nom.localeCompare(droite.nom, "fr")),
    // **Ce qui est arrêté le reste.** Sans cela, l'écran redemanderait un
    // suivant après que quelqu'un a cliqué « Arrêter », et la file repartirait.
    arretee: false
  };
}

/** Le prochain à lire, ou `null` quand il n'y en a plus. */
export function leProchainDeLaFile(file = null) {
  if (file?.arretee) return null;
  return (file?.pas ?? []).find((un) => un.ou === DANS_LA_FILE.ATTEND) ?? null;
}

/**
 * La file après un pas — **rendue neuve**, jamais modifiée sur place.
 *
 * `ou` dit comment cela s'est passé, `motif` pourquoi quand cela s'est mal
 * passé. Un échec sans motif serait une ligne rouge dont on ne saurait rien.
 */
export function apresUnPas(file = null, id = "", ou = DANS_LA_FILE.PROPOSE, motif = "") {
  const vise = texte(id);
  return {
    ...file,
    pas: (file?.pas ?? []).map((un) => (un.id === vise
      ? { ...un, ou, motif: texte(motif) }
      : un))
  };
}

/** La file arrêtée : ce qui attendait n'attend plus. */
export function laFileArretee(file = null) {
  return { ...file, arretee: true, pas: file?.pas ?? [] };
}

/** Combien dans chaque état. Les pastilles de l'écran se lisent là. */
export function lesComptesDeLaFile(file = null) {
  const pas = file?.pas ?? [];
  const compte = (ou) => pas.filter((un) => un.ou === ou).length;

  return {
    total: pas.length,
    attend: compte(DANS_LA_FILE.ATTEND),
    enCours: compte(DANS_LA_FILE.EN_COURS),
    proposes: compte(DANS_LA_FILE.PROPOSE),
    echoues: compte(DANS_LA_FILE.ECHOUE)
  };
}

/** La file a-t-elle fini ? Arrêtée compte comme fini : plus rien ne viendra. */
export function laFileEstFinie(file = null) {
  if (!file?.pas?.length) return false;
  return Boolean(file.arretee) || leProchainDeLaFile(file) === null;
}

/**
 * Où en est la file, en une phrase.
 *
 * **Les échecs ne se noient pas dans le total.** « 30 sur 30 » après trois
 * échecs serait faux ; « 27 propositions, 3 n'ont pas pu être lus » est ce qui
 * s'est passé, et c'est de là qu'on repart.
 */
export function phraseDeLaFile(file = null) {
  const { total, attend, enCours, proposes, echoues } = lesComptesDeLaFile(file);
  if (!total) return "";

  const dits = [];
  if (proposes) dits.push(`${proposes} ${proposes > 1 ? "propositions prêtes" : "proposition prête"}`);
  if (enCours) dits.push("1 en cours de lecture");
  if (attend) dits.push(`${attend} en attente`);
  // **Les échecs en dernier et toujours nommés** : ils ne disparaissent pas
  // parce que la file est finie.
  if (echoues) dits.push(`${echoues} ${echoues > 1 ? "n'ont pas pu être lus" : "n'a pas pu être lu"}`);

  const ou = file?.arretee && attend ? " — file arrêtée" : "";
  return `${dits.join(" · ")}${ou}`;
}

/**
 * Ce qu'il reste à faire, dit à la fin — et ce n'est pas « c'est fini ».
 *
 * Trente lectures laissent trente propositions **à signer**. Une file qui
 * annoncerait « terminé » laisserait croire que la mémoire du chantier est à
 * jour, alors que rien n'y est encore entré (règle 1). Vide tant que la file
 * n'a rien produit.
 */
export function phraseDeCeQuiResteASigner(file = null) {
  const { proposes } = lesComptesDeLaFile(file);
  if (!proposes) return "";

  return `${proposes} ${proposes > 1 ? "propositions attendent" : "proposition attend"} `
    + `votre relecture dans Propositions. Rien n'est entré dans la mémoire du chantier.`;
}

/** Les documents qui ont échoué, nommés : c'est par eux qu'on reprend. */
export function ceQuiNaPasPuEtreLu(file = null) {
  return (file?.pas ?? [])
    .filter((un) => un.ou === DANS_LA_FILE.ECHOUE)
    .map((un) => ({ id: un.id, nom: un.nom, motif: un.motif }));
}
