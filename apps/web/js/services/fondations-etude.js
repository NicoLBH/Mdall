/**
 * L'étude de fondations d'un projet : la liste des semelles, et son total.
 *
 * ## Pourquoi une liste
 *
 * On ne dimensionne pas une semelle isolée. Un bâtiment de neuf portiques en
 * compte vingt-sept, de huit types — courants sud, courants centre, pignons,
 * stabilités — et ce qui est livré au client, c'est le tableau qui les
 * récapitule : combien de chaque, quelles cotes, quel volume de béton en tout.
 * Vérifier une semelle en effaçant la précédente n'est pas un outil, c'est une
 * calculette.
 *
 * ## Ce qui est conservé, et ce qui se recalcule
 *
 * Les **entrées**, et rien d'autre. Le résultat est dérivé : le garder ferait
 * vivre côte à côte deux vérités qui divergeraient au premier progrès du
 * moteur, et l'on ne saurait plus laquelle fait foi. Il se recalcule à
 * l'ouverture — un aller-retour pour tout le tableau — et l'on est sûr qu'il
 * décrit le projet tel que le calcul le voit **aujourd'hui**.
 *
 * Ce fichier ne parle ni à la base ni au réseau : il tient les règles de la
 * liste. Les allers-retours sont dans `fondations-etude-supabase.js`.
 */

function nombre(valeur, defaut = 0) {
  const n = typeof valeur === "number" ? valeur : Number.parseFloat(String(valeur ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : defaut;
}

function texte(valeur) {
  return String(valeur ?? "").trim();
}

/**
 * Le volume de béton d'une semelle, et celui de toutes celles de son type.
 *
 * Le fût compte quand il existe. L'oublier sous-estimerait la commande de
 * béton, et c'est le genre d'erreur qu'on découvre à la livraison.
 */
export function volumeDe(entrees = {}, nombreDeMassifs = 0) {
  const lx = nombre(entrees.sectionLx);
  const ly = nombre(entrees.sectionLy);
  const lz = nombre(entrees.hauteurLz);
  const semelle = lx * ly * lz;

  const futA = nombre(entrees.futA);
  const futB = nombre(entrees.futB);
  const futH = nombre(entrees.hauteurFut);
  const fut = futA * futB * futH;

  const unitaire = semelle + fut;
  return { unitaire, total: unitaire * Math.max(0, nombreDeMassifs) };
}

/** Le nom d'une semelle, ou celui qu'on lui donne faute de mieux. */
export function designationDe(semelle = {}, rang = 0) {
  return texte(semelle.designation) || `Semelle ${rang + 1}`;
}

/**
 * L'empreinte d'une saisie : ce qui, changé, périme son résultat.
 *
 * Tout entre dedans, et c'est voulu. Il n'existe pas dans ce calcul de champ
 * décoratif : le poids volumique du sol pèse sur la butée, l'enrobage sur le
 * bras de levier des aciers. Chercher à distinguer ce qui compte de ce qui ne
 * compte pas reviendrait à réécrire le moteur ici, en moins fiable.
 */
export function empreinteDe(entrees = {}) {
  return JSON.stringify(entrees);
}

/**
 * Les entrées d'une semelle, lues comme le formulaire les lira.
 *
 * Une semelle enregistrée avant l'ajout d'un champ n'en porte pas la clé ; le
 * formulaire, lui, la complétera par le défaut. Comparer les deux sans les
 * mettre sur le même pied ferait périmer tous les résultats à chaque nouveau
 * champ, sans qu'aucune cote n'ait bougé.
 */
export function entreesDe(semelle = null, defauts = {}) {
  return { ...defauts, ...(semelle?.entrees ?? {}) };
}

/**
 * Les résultats qui décrivent encore leur semelle.
 *
 * ## Pourquoi sceller plutôt que se fier au rang
 *
 * Un résultat rangé au rang 2 se lit comme le résultat de la semelle 2. Il peut
 * n'être que le résultat qu'elle avait avant d'être modifiée — ou, si elle a été
 * créée par recopie, celui de son modèle. C'est le défaut qui a été observé :
 * une semelle en défaut affichée verte, avec le ratio de sa voisine, et le
 * détail de la voisine à l'ouverture. Rien dans la donnée ne permettait de s'en
 * apercevoir.
 *
 * Chaque résultat porte donc l'empreinte des entrées qui l'ont produit, et l'on
 * ne rend que ceux dont l'empreinte tient encore. Les autres deviennent `null` :
 * le tableau affiche « — » et recalcule. Une case vide se comprend ; un vert qui
 * ment ne se rattrape pas.
 */
export function resultatsScelles(semelles = [], resultats = [], defauts = {}) {
  return (Array.isArray(semelles) ? semelles : []).map((semelle, rang) => {
    const garde = resultats?.[rang];
    if (!garde) return null;
    return garde.empreinte === empreinteDe(entreesDe(semelle, defauts)) ? garde : null;
  });
}

/**
 * Le tableau de synthèse : une ligne par type, et les totaux.
 *
 * Le verdict de chaque ligne vient du calcul, jamais d'un cache : une ligne
 * dont le calcul a échoué porte son échec, elle n'emprunte pas le verdict de
 * la précédente ni ne disparaît.
 */
export function synthese(semelles = [], resultats = []) {
  const lignes = (Array.isArray(semelles) ? semelles : []).map((semelle, rang) => {
    const issue = resultats?.[rang] ?? null;
    const nombreDeMassifs = Math.max(0, Math.trunc(nombre(semelle.nombre, 0)));
    const volume = volumeDe(semelle.entrees, nombreDeMassifs);

    return {
      id: texte(semelle.id),
      designation: designationDe(semelle, rang),
      nombre: nombreDeMassifs,
      entrees: semelle.entrees ?? {},
      volume,
      resultat: issue?.resultat ?? null,
      erreur: texte(issue?.error) || null,
      ratio: Number.isFinite(Number(issue?.resultat?.bilan?.ratio)) ? Number(issue.resultat.bilan.ratio) : null,
      verifiee: issue?.resultat?.bilan?.verifie ?? null
    };
  });

  return {
    lignes,
    totaux: {
      massifs: lignes.reduce((total, ligne) => total + ligne.nombre, 0),
      volume: lignes.reduce((total, ligne) => total + ligne.volume.total, 0),
      // Ce qui n'a pas été calculé n'est ni vérifié ni en défaut : il est
      // inconnu, et le total doit le dire plutôt que de le compter du bon côté.
      verifiees: lignes.filter((ligne) => ligne.verifiee === true).length,
      enDefaut: lignes.filter((ligne) => ligne.verifiee === false).length,
      inconnues: lignes.filter((ligne) => ligne.verifiee === null).length
    }
  };
}

/**
 * Le rang d'une semelle voisine, pour les boutons « ‹ » et « › ».
 *
 * La liste ne boucle pas : arrivé au bout, le bouton s'éteint. Reboucler
 * silencieusement ferait croire qu'on avance alors qu'on repasse sur ce qu'on
 * vient de lire.
 */
export function voisine(rangs, rang, direction) {
  const suivant = rang + direction;
  return suivant >= 0 && suivant < rangs ? suivant : null;
}

/**
 * Une semelle neuve, copiée sur la précédente quand il y en a une.
 *
 * Deux semelles d'un même projet partagent le sol, le règlement, les unités et
 * le béton : recommencer de zéro à chaque ligne ferait ressaisir vingt fois ce
 * qui ne change pas, et une ressaisie est une occasion de se tromper. Ce qui
 * lui est propre — sa désignation, son nombre — ne se copie pas.
 */
export function semelleNeuve(modele = null, entreesParDefaut = {}) {
  return {
    id: null,
    designation: "",
    nombre: 1,
    entrees: structuredClone(modele?.entrees ?? entreesParDefaut)
  };
}
