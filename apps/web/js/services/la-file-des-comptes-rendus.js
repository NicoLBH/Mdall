/**
 * La file des comptes rendus — **où elle en est, et ce qu'elle a laissé**.
 *
 * ## Elle a tourné dans l'onglet, et cela ne pouvait pas tenir
 *
 * Au premier jet, cette file tournait **dans l'écran de l'Atelier** : dix-neuf
 * comptes rendus bloquaient l'écran pendant une heure, et quitter la page
 * perdait tout. C'est exactement ce qu'on avait retiré du dépôt de messagerie
 * en octobre, et pour les mêmes raisons.
 *
 * Elle tourne désormais **au serveur**
 * (`supabase/functions/lire-les-comptes-rendus`). On lance, on rend la main, et
 * le journal des Actions porte la suite. Ce module, lui, n'a pas changé de
 * nature : il dit **où en est une file**, et c'est le serveur qui l'avance
 * maintenant, pendant que l'écran s'en sert pour montrer.
 *
 * ## Il vit des deux côtés, et c'est voulu
 *
 * Il descend au serveur avec les lecteurs de mails (`prepare-versement.mjs`).
 * Une seconde définition de « quel est le suivant » et de « qu'est-ce qui a
 * échoué » aurait fait un serveur qui avance d'une façon et un écran qui
 * raconte d'une autre, sans que rien ne le dise (règle 4).
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
 * ## Une exécution qui a eu lieu ne devient pas fausse (règle 6)
 *
 * Un compte rendu lu reste lu, même si le suivant échoue, même si la fonction
 * de bord expire en route. La file ne se réécrit pas en arrière : elle avance,
 * et garde la trace de chaque pas — c'est par là qu'une reprise sait où elle en
 * était.
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
  /**
   * **`LU`, et non `PROPOSE`.**
   *
   * L'état s'appelait « proposé », du temps où chaque compte rendu ouvrait sa
   * propre proposition. Il n'y en a plus qu'une, ouverte au premier et enrichie
   * ensuite : le journal annonçait « 7 propositions prêtes » là où il y en avait
   * une, et c'est à l'écran que cela s'est vu. Un nom qui ment est pire qu'un
   * nom absent (règle 10).
   */
  LU: "lu",
  ECHOUE: "echoue"
};

/** Ce qu'on dit de chaque état. Écrit une fois (règle 10). */
export const DANS_LA_FILE_DIT = {
  [DANS_LA_FILE.ATTEND]: "en attente",
  [DANS_LA_FILE.EN_COURS]: "lecture en cours",
  [DANS_LA_FILE.LU]: "lu",
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
 * Combien de comptes rendus se lisent **de front**.
 *
 * Chaque lecture est de l'attente pure : deux appels au modèle, pendant
 * lesquels la fonction de bord ne fait rien. Les mener à quatre divise le temps
 * d'une file de dix-neuf par trois.
 *
 * **Trois, et pas dix-neuf.** Le fournisseur du modèle refuse les appels
 * simultanés au-delà d'un certain nombre, et un refus coûte la lecture entière
 * — on aurait échangé une heure d'attente contre dix-neuf échecs. Trois est le
 * nombre qu'on sait tenir ; il se change ici, et à un seul endroit.
 */
export const EN_MEME_TEMPS = 3;

/**
 * Les prochains à lire, au plus `combien`.
 *
 * Dans l'ordre de la file : lire le douzième avant le premier ne changerait
 * rien au résultat, mais l'écran montrerait un chemin qui saute, et personne ne
 * saurait dire si c'est normal.
 */
export function lesProchainsDeLaFile(file = null, combien = EN_MEME_TEMPS) {
  if (file?.arretee) return [];
  const combienAuPlus = Math.max(1, Number(combien) || 1);
  return (file?.pas ?? [])
    .filter((un) => un.ou === DANS_LA_FILE.ATTEND)
    .slice(0, combienAuPlus);
}

/**
 * La file reprise après une coupure : **ce qui était en vol réattend**.
 *
 * ## Le défaut que cela répare
 *
 * Une fonction de bord coupée en plein travail laisse ses pas à `en-cours`. À
 * la reprise, on cherchait le prochain qui **attend** : les pas restés en vol
 * étaient sautés, pour toujours. Ils n'étaient ni lus, ni échoués, ni comptés —
 * la file se terminait « 18 lus sur 19 » sans que le dix-neuvième apparaisse
 * nulle part.
 *
 * Le défaut existait déjà à un pas à la fois ; en lire trois de front le rend
 * trois fois plus probable, et c'est ce qui l'a fait voir.
 *
 * ## Ce qui est perdu, et ce qui ne l'est pas
 *
 * Le début du pas est effacé avec son état : une durée comptée depuis un départ
 * d'avant la coupure dirait « depuis 40 minutes » pour une lecture qui vient de
 * repartir. Le motif d'un échec, lui, n'est pas touché : un pas qui a échoué a
 * échoué, et la reprise ne le rejoue pas (règle 6).
 */
export function laFileReprise(file = null) {
  return {
    ...file,
    pas: (file?.pas ?? []).map((un) => (un.ou === DANS_LA_FILE.EN_COURS
      ? { ...un, ou: DANS_LA_FILE.ATTEND, commenceLe: null, dureeMs: null }
      : un))
  };
}

/**
 * La file après un pas — **rendue neuve**, jamais modifiée sur place.
 *
 * `ou` dit comment cela s'est passé, `motif` pourquoi quand cela s'est mal
 * passé. Un échec sans motif serait une ligne rouge dont on ne saurait rien.
 */
export function apresUnPas(
  file = null, id = "", ou = DANS_LA_FILE.LU, motif = "", maintenant = Date.now()
) {
  const vise = texte(id);
  return {
    ...file,
    pas: (file?.pas ?? []).map((un) => (un.id === vise
      ? { ...un, ou, motif: texte(motif), ...leTempsDunPas(un, ou, maintenant) }
      : un))
  };
}

/**
 * Quand un pas a commencé, et combien il a duré.
 *
 * ## Le défaut, vu à l'écran
 *
 * « On est en "En cours", puis boom d'un coup c'est terminé et on affiche douze
 * étapes, que l'on n'a pas vu se réaliser au fur et à mesure. »
 *
 * Une file de dix-neuf comptes rendus tourne une heure, et l'écran n'en disait
 * rien : un seul bloc « Lecture en cours », sans début, sans durée, sans rang.
 * Rien ne distinguait une lecture qui avance d'une lecture bloquée — c'est
 * exactement la question qu'on se pose en regardant.
 *
 * ## Le temps est **écrit par qui travaille**
 *
 * Le serveur pose `commenceLe` quand il prend un compte rendu, et `dureeMs`
 * quand il le rend. L'écran, lui, ne fait que compter depuis. Le calculer à
 * l'affichage aurait mesuré le temps depuis la **dernière relecture de la
 * page**, c'est-à-dire remis le compteur à zéro à chaque battement.
 */
function leTempsDunPas(pas, ou, maintenant) {
  if (ou === DANS_LA_FILE.EN_COURS) return { commenceLe: maintenant, dureeMs: null };

  // Fini, d'une façon ou d'une autre : la durée se fige. Sans début connu, elle
  // reste nulle — l'écran affiche alors un tiret plutôt qu'un zéro qui mentirait.
  if (ou === DANS_LA_FILE.LU || ou === DANS_LA_FILE.ECHOUE) {
    const debut = Number(pas?.commenceLe);
    return { dureeMs: Number.isFinite(debut) ? Math.max(0, maintenant - debut) : null };
  }

  return {};
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
    lus: compte(DANS_LA_FILE.LU),
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
  const { total, attend, enCours, lus, echoues } = lesComptesDeLaFile(file);
  if (!total) return "";

  const dits = [];
  if (lus) dits.push(`${lus} ${lus > 1 ? "comptes rendus lus" : "compte rendu lu"}`);
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
 * ## Dix-neuf comptes rendus ne font pas dix-neuf signatures
 *
 * Au premier jet, chaque compte rendu ouvrait sa proposition : dix-neuf
 * relectures pour un seul geste, ce qui revenait à ne pas l'avoir fait. Celui
 * qui met son chantier à niveau veut **une** proposition — il la relit une
 * fois, il signe une fois, et tout entre ensemble.
 *
 * ## Mais elle attend toujours une signature
 *
 * Une file qui annoncerait « terminé » laisserait croire que la mémoire du
 * chantier est à jour, alors que rien n'y est encore entré (règle 1). Vide tant
 * que la file n'a rien produit.
 */
export function phraseDeCeQuiResteASigner(file = null) {
  const { lus } = lesComptesDeLaFile(file);
  if (!lus) return "";

  return `${lus} ${lus > 1 ? "comptes rendus lus" : "compte rendu lu"} : `
    + `une seule proposition à relire et à signer, dans Propositions. `
    + `Rien n'est entré dans la mémoire du chantier.`;
}

/** Les documents qui ont échoué, nommés : c'est par eux qu'on reprend. */
export function ceQuiNaPasPuEtreLu(file = null) {
  return (file?.pas ?? [])
    .filter((un) => un.ou === DANS_LA_FILE.ECHOUE)
    .map((un) => ({ id: un.id, nom: un.nom, motif: un.motif }));
}
