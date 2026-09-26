/**
 * Comment on en est arrivé là.
 *
 * ## La question
 *
 * On lit dans `incendie.ctr` : « Blocs-portes des ensembles celliers ou caves =
 * CF 1/2 h ». Très bien — **comment ?** La provenance dit d'où la valeur sort
 * (« règle : Blocs-portes… »), mais pas ce que cette règle a lu, ni ce qui a
 * mené aux valeurs qu'elle a lues. Il fallait ouvrir les fichiers un par un et
 * remonter le fil à la main.
 *
 * ```
 * données de base employées  →  enchaînement des fonctions  →  résultat
 * ```
 *
 * Ce fichier reconstruit cet enchaînement.
 *
 * ## Comment il le reconstruit
 *
 * Il n'y a rien à stocker : la chaîne est **entièrement contenue** dans ce que
 * la mémoire porte déjà. Une règle produit un sujet ; ses conditions citent
 * d'autres sujets ; chacun de ceux-là est produit par une autre règle, ou bien
 * relevé quelque part. On remonte donc de proche en proche, et l'on s'arrête
 * sur ce qui n'est produit par rien — c'est-à-dire sur les données de base.
 *
 * Le stocker en ferait une seconde vérité, qui divergerait au premier versement
 * (`docs/fondamentaux.md`, règle 4). Ce qui est dérivé se recalcule tant qu'il
 * sert à décider.
 *
 * ## La zone n'est pas un détail
 *
 * Une variable n'a pas *une* valeur, elle en a une par partie d'ouvrage. Une
 * chaîne se lit donc toujours **pour une zone** : celle de la contrainte qu'on
 * regarde. À défaut, la valeur qui vaut partout — et si aucune ne vaut ici, on
 * le dit plutôt que d'en emprunter une à la zone voisine.
 */

import { cleDuSujet } from "./memoire-identifiants.js";
import { TOUTES_ZONES } from "./memoire-en-texte.js";
import { zonesLisibles } from "./memoire-blame.js";
import { normalizeZoneKey } from "./project-zones.js";
import { versementQuiVaut } from "./memoire-valeurs.js";
import { lecturesDeLaRegle, sortiesDeLaFonction } from "./memoire-applications.js";
// Ce qu'une règle lit se dit dans le lecteur du langage, et nulle part ailleurs.
import { clausesDeLaRegle } from "./memoire-en-lecture.js";
import { estUneRegle } from "./assertion-taxonomy.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'une affirmation affirme, en clair. */
export function sujetDe(assertion) {
  return texte(assertion?.payload?.subject) || texte(assertion?.subject_key);
}


/** Ce qui vaut encore : une ligne remplacée ne décrit plus l'état. */
const enVigueur = (assertion) => !texte(assertion?.superseded_by);

/**
 * Les règles du projet, par le sujet qu'elles produisent.
 *
 * Une seule par sujet : deux règles qui produiraient le même nom seraient une
 * contradiction, pas une alternative — et c'est l'arbitrage d'une proposition
 * qui doit la trancher, pas cette lecture.
 */
export function reglesQuiProduisent(assertions = [], zone = "") {
  const regles = new Map();
  const voulue = normalizeZoneKey(zone);

  for (const assertion of Array.isArray(assertions) ? assertions : []) {
    if (!estUneRegle(assertion) || !enVigueur(assertion)) continue;
    const cle = cleDuSujet(sujetDe(assertion));
    if (!cle) continue;

    // Une règle **appliquée** dépend de la zone : l'escalier A classé en 3ᵉ
    // famille B et l'escalier B classé en 2ᵉ ne suivent pas les mêmes articles.
    // Celle de la zone qu'on lit l'emporte donc sur celle qui vaut partout, et
    // celle d'une autre zone n'entre pas — elle expliquerait le voisin.
    const portees = zonesLisibles(assertion).map(normalizeZoneKey).filter(Boolean);
    const ici = voulue ? portees.includes(voulue) : false;
    if (portees.length && !ici) continue;

    const deja = regles.get(cle);
    if (!deja) { regles.set(cle, assertion); continue; }
    // À égalité, la première versée reste : deux règles de même portée
    // produisant le même nom sont une contradiction, et c'est l'arbitrage d'une
    // proposition qui doit la trancher, pas cette lecture.
    if (ici && !zonesLisibles(deja).length) regles.set(cle, assertion);
  }

  return regles;
}

/**
 * Ce qu'un sujet vaut, dans cette zone.
 *
 * La zone d'abord, « Toutes zones » ensuite. Emprunter la valeur d'une autre
 * zone serait le pire des mensonges : elle se lirait comme la valeur d'ici.
 *
 * Le choix lui-même est délégué à `versementQuiVaut` : c'est le même juge que
 * pour le rejeu et pour ce que l'écran affiche. Cette fonction choisissait
 * auparavant **la première du tableau** — l'ordre où la base avait rendu ses
 * lignes —, et lisait donc « 13 m » quand le fichier montrait « 42 m ».
 *
 * @returns {{valeur: string, zone: string, assertion: object}|null}
 */
export function valeurDuSujet(sujet, assertions = [], zone = "") {
  const cherche = cleDuSujet(sujet);
  if (!cherche) return null;

  const dites = (Array.isArray(assertions) ? assertions : [])
    .filter((assertion) => enVigueur(assertion) && !estUneRegle(assertion))
    .filter((assertion) => cleDuSujet(sujetDe(assertion)) === cherche);

  // À défaut, ce que la **règle appliquée** a conclu.
  //
  // Un maillon intermédiaire — « Habitation individuelle ou collective » — ne
  // s'impose à personne : il n'entre donc ni dans les contraintes, ni dans les
  // données de base, et rien ne le portait comme valeur. La chaîne montrait
  // alors une étape sans résultat, et « personne ne l'a versée » d'une valeur
  // que le projet avait bel et bien conclue.
  //
  // L'instantané de la règle porte sa conclusion **pour ce projet-ci** : c'est
  // une valeur du projet, écrite sur la ligne de la règle plutôt que sur la
  // sienne. On la lit, et on dit qu'elle est déduite — pour ne pas la
  // confondre avec un relevé.
  if (!dites.length) return valeurConclue(cherche, assertions, zone);

  // La comparaison se fait sur la **clé**, des deux côtés.
  //
  // La base range « batiment-a », le `payload` garde « Bâtiment A », et les
  // deux désignent la même partie de l'ouvrage. Comparer la clé au libellé ne
  // trouvait jamais rien : chaque valeur retombait sur « Toutes zones », ou sur
  // rien du tout, et l'écran disait « personne ne l'a versée » d'une valeur que
  // le projet portait.
  //
  // Le libellé d'origine, lui, se garde : c'est celui qu'on affiche.
  const voulue = normalizeZoneKey(zone);
  const retenue = versementQuiVaut(dites, voulue);
  if (!retenue) return null;

  // Est-elle retenue parce qu'elle nomme cette zone, ou parce qu'elle vaut
  // partout ? La ligne de provenance le dit, et ce n'est pas la même chose.
  const dansLaZone = zonesLisibles(retenue).some((portee) => normalizeZoneKey(portee) === voulue)
    ? retenue
    : null;

  // Le libellé tel qu'il a été écrit, pas la clé : « Bâtiment A » se lit, pas
  // « batiment-a ». À défaut de libellé connu, la clé demandée fait l'affaire —
  // mieux vaut une clé qu'un vide.
  const portee = dansLaZone
    ? (zonesLisibles(dansLaZone).find((nom) => normalizeZoneKey(nom) === voulue) ?? texte(zone))
    : TOUTES_ZONES;

  return {
    valeur: texte(retenue?.payload?.value) || texte(retenue?.statement),
    zone: portee,
    cleDeZone: dansLaZone ? voulue : "",
    deduite: false,
    assertion: retenue
  };
}

/** Ce qu'une règle appliquée a conclu, quand rien d'autre ne porte la valeur. */
function valeurConclue(cle, assertions, zone) {
  const regle = reglesQuiProduisent(assertions, zone).get(cle);
  const valeur = texte(regle?.payload?.value);
  if (!valeur) return null;

  const portees = zonesLisibles(regle);
  return {
    valeur,
    zone: portees.length ? portees.join(", ") : TOUTES_ZONES,
    cleDeZone: normalizeZoneKey(portees[0] ?? ""),
    deduite: true,
    assertion: regle
  };
}

/**
 * La chaîne des fonctions qui mènent à un sujet.
 *
 * En **ordre de lecture** : ce dont une règle a besoin se lit avant elle, comme
 * on lit l'arrêté avant la note de synthèse. La règle demandée est donc la
 * dernière, et l'on descend depuis les données de base jusqu'à elle.
 *
 * Un cycle ne bloque pas : une règle déjà vue ne se réexplore pas. Un
 * référentiel mal versé ne doit pas figer l'écran — il doit se voir.
 *
 * @returns {{fonctions: object[], entrees: string[], manquants: string[]}}
 *   `entrees` : les noms sur lesquels la chaîne s'appuie sans qu'une règle les
 *   produise — les données de base. `manquants` : ceux que personne n'a versés.
 */
export function chaineDuRaisonnement(sujet, assertions = [], { zone = "" } = {}) {
  const regles = reglesQuiProduisent(assertions, zone);
  const fonctions = [];
  const vues = new Set();
  const entrees = new Set();
  const manquants = new Set();

  const descendre = (nom) => {
    const cle = cleDuSujet(nom);
    if (!cle || vues.has(cle)) return;
    vues.add(cle);

    const regle = regles.get(cle);
    if (!regle) {
      // Rien ne le produit : c'est une entrée. Reste à savoir si quelqu'un l'a
      // versée — et si non, c'est le trou du raisonnement.
      entrees.add(texte(nom));
      if (!valeurDuSujet(nom, assertions, zone)) manquants.add(texte(nom));
      return;
    }

    // Les branches enchaînées lisent, elles aussi : sans elles, un nom cité
    // seulement dans un `sinon si` n'aurait pas d'arête dans le graphe.
    const conditions = clausesDeLaRegle(regle.payload?.regle);
    for (const condition of conditions) descendre(texte(condition?.sujet));

    // Après ses entrées : on lit ce dont elle a besoin avant elle.
    fonctions.push(regle);
  };

  descendre(sujet);

  return { fonctions, entrees: [...entrees], manquants: [...manquants] };
}

/**
 * Ce que chaque ligne de code vaut, aujourd'hui, dans cette zone.
 *
 * ## Pourquoi des valeurs, et pas un verdict
 *
 * On pourrait afficher « vrai » ou « faux » en face de chaque condition. Ce
 * serait rejouer le référentiel dans le navigateur, avec ses unités, ses listes
 * et ses cas particuliers — et un verdict faux affiché avec aplomb est pire que
 * pas de verdict du tout. On montre donc **ce que le projet dit** de chaque nom
 * cité, et le lecteur compare : c'est lui qui décide, et il a la ligne sous les
 * yeux.
 *
 * @param {{jetons: object[]}[]} lignes les lignes affichées, à gauche
 * @returns {{sujet: string, valeur: string, zone: string, manquant: boolean}[]}
 *   une entrée par ligne, vide quand la ligne ne cite aucun nom
 */
export function traceDesLignes(lignes = [], { assertions = [], zone = "" } = {}) {
  return (Array.isArray(lignes) ? lignes : []).map((ligne) => {
    const jetons = ligne?.jetons ?? ligne ?? [];
    const nom = texte((jetons.find((jeton) => jeton?.type === "sujet") ?? {}).texte);
    if (!nom) return { sujet: "", valeur: "", zone: "", manquant: false, deduite: false };

    const dite = valeurDuSujet(nom, assertions, zone);
    return dite
      ? { sujet: nom, valeur: dite.valeur, zone: dite.zone, manquant: false, deduite: dite.deduite === true }
      : { sujet: nom, valeur: "", zone: "", manquant: true, deduite: false };
  });
}

/**
 * Le schéma des dépendances : une carte par étape, un trait par lien.
 *
 * ## Ce que la liste de code ne montre pas
 *
 * Les deux fenêtres — le code à gauche, les valeurs à droite — se lisent ligne
 * à ligne, et c'est ce qu'il faut pour vérifier une condition. Mais elles
 * n'exhibent pas la **forme** du raisonnement : combien d'étapes, laquelle
 * s'appuie sur laquelle, et où l'on est parti de rien. Sur douze fonctions,
 * reconstituer cette forme à la lecture demande une feuille de papier.
 *
 * Le schéma la donne d'un coup d'œil, et il se lit de gauche à droite : ce qui
 * est à gauche décide de ce qui est à droite. La colonne de gauche est donc,
 * nécessairement, les **données de base** — ce qu'aucune règle ne produit.
 * C'est aussi la condition d'arrêt de la chaîne : si l'on n'y arrive pas, c'est
 * qu'il manque quelque chose, et cela se voit.
 *
 * ## Chaque carte porte ses entrées
 *
 * Une carte qui ne dirait que son nom et sa valeur obligerait à suivre les
 * traits un par un pour savoir ce qu'elle a lu. Elle porte donc ses entrées
 * **avec leurs valeurs du jour** : c'est là qu'on voit qu'une valeur juste
 * repose sur une entrée fausse.
 *
 * @param {string} sujet ce qu'on cherche à expliquer
 * @param {object[]} assertions la mémoire du projet
 * @param {object} options
 * @param {string} [options.zone] la portée de la contrainte qu'on regarde
 * @param {Map<string,string>} [options.ouEcrit] sujet → fichier qui porte sa valeur
 * @param {Map<string,string>} [options.ouVivent] identifiant d'une règle → son fichier
 * @returns {{noeuds: object[], liens: object[]}} au format de `graphe-liaisons`
 */
export function grapheDuRaisonnement(sujet, assertions = [], { zone = "", ouEcrit = null, ouVivent = null } = {}) {
  const { fonctions } = chaineDuRaisonnement(sujet, assertions, { zone });
  if (!fonctions.length) return { noeuds: [], liens: [] };

  const regles = reglesQuiProduisent(assertions, zone);
  const produites = new Set(fonctions.map((regle) => cleDuSujet(sujetDe(regle))));
  const noeuds = [];
  const liens = [];
  const poses = new Set();

  /** Le fichier où un nom est écrit, dit court : `donnees-de-base.ddb`. */
  const court = (chemin) => (texte(chemin) ? texte(chemin).split("/").pop() : "");
  const fichierDe = (nom) => court(ouEcrit?.get?.(cleDuSujet(nom)) ?? "");

  /** Ce qu'un nom vaut aujourd'hui, dit comme la carte l'affiche. */
  const etatDe = (nom) => {
    const dite = valeurDuSujet(nom, assertions, zone);
    return dite
      ? { nom: texte(nom), valeur: dite.valeur, zone: dite.zone, manquant: false, deduite: dite.deduite === true }
      : { nom: texte(nom), valeur: "", zone: "", manquant: true, deduite: false };
  };

  // Les données de base d'abord : une carte par nom qu'aucune règle ne produit.
  //
  // Une carte par **fichier** aurait mieux dit d'où elles viennent, mais un
  // trait part d'une carte et arrive à une autre : deux entrées d'un même
  // fichier ne se distingueraient plus, et l'on ne saurait plus laquelle décide
  // de quoi. Le fichier reste en tête de carte — c'est là qu'on va les relire.
  const donnee = (nom) => {
    const cle = cleDuSujet(nom);
    if (!cle || poses.has(`donnee:${cle}`)) return `donnee:${cle}`;
    poses.add(`donnee:${cle}`);

    const etat = etatDe(nom);
    noeuds.push({
      id: `donnee:${cle}`,
      produit: cle,
      demande: [],
      entete: fichierDe(nom) || "donnée de base",
      titre: etat.nom,
      valeur: etat.manquant ? "personne ne l'a versée" : etat.valeur,
      etat: etat.manquant ? "attente" : "conclu"
    });
    return `donnee:${cle}`;
  };

  for (const regle of fonctions) {
    const cle = cleDuSujet(sujetDe(regle));
    if (!cle || poses.has(`regle:${cle}`)) continue;
    poses.add(`regle:${cle}`);

    // Les branches enchaînées lisent, elles aussi : sans elles, un nom cité
    // seulement dans un `sinon si` n'aurait pas d'arête dans le graphe.
    const conditions = clausesDeLaRegle(regle.payload?.regle);

    const entrees = [];
    const demande = [];
    for (const condition of conditions) {
      const nom = texte(condition?.sujet);
      const cleEntree = cleDuSujet(nom);
      if (!cleEntree) continue;
      if (!produites.has(cleEntree)) donnee(nom);
      if (!demande.includes(cleEntree)) demande.push(cleEntree);
      entrees.push(etatDe(nom));
      liens.push({
        de: produites.has(cleEntree) ? `regle:${cleEntree}` : `donnee:${cleEntree}`,
        vers: `regle:${cle}`,
        fait: nom
      });
    }

    const dite = valeurDuSujet(sujetDe(regle), assertions, zone);
    noeuds.push({
      id: `regle:${cle}`,
      produit: cle,
      demande,
      // Le fichier de la **règle**, pas celui de sa conclusion : une carte
      // d'étape se relit dans le `.ref` qui la porte, et c'est là qu'on va
      // corriger. Le fichier où la valeur s'écrit se lit sur la carte suivante.
      entete: court(ouVivent?.get?.(texte(regle?.id)) ?? "") || fichierDe(sujetDe(regle)) || "règle",
      titre: sujetDe(regle),
      // Ce que le projet en dit aujourd'hui d'abord : c'est la valeur qui
      // s'applique. À défaut, ce que la règle conclut — une règle versée dont
      // la conclusion n'a pas été retenue reste lisible.
      valeur: dite?.valeur || texte(regle?.payload?.value),
      etat: dite ? "conclu" : "attente",
      entrees
    });
  }

  // Un lien dont une extrémité n'existe pas partirait du vide : le dessin
  // montrerait une liaison vers rien, ce qui se lit comme une erreur.
  const connus = new Set(noeuds.map((noeud) => noeud.id));
  return { noeuds, liens: liens.filter((lien) => connus.has(lien.de) && connus.has(lien.vers)) };
}

/**
 * Les dépendances du projet, telles que ses règles les dessinent.
 *
 * ## Pourquoi elles se déduisent, et ne se déclarent plus
 *
 * Elles se déclaraient à la main : un panneau, des cases à cocher, « cette note
 * de calcul repose sur cette hypothèse ». Personne ne les cochait — et c'est
 * normal : au moment où l'on verse une conclusion, on n'a pas envie de
 * re-décrire ce que la règle vient d'énoncer.
 *
 * Or la règle **le dit déjà**. `si (Classement du bâtiment = "3e famille B")`
 * est un lien de dépendance, écrit une fois, à l'endroit où il compte. Le
 * redemander à quelqu'un, c'est demander d'écrire deux fois la même chose — et
 * une chose écrite à deux endroits finit par diverger (`docs/fondamentaux.md`,
 * règle 4).
 *
 * On les lit donc, plutôt que de les stocker. Le format est celui de la table :
 * les lecteurs — le drapeau « à revérifier », le compte des dépendants — n'ont
 * pas à savoir d'où le lien vient.
 *
 * ## Ce qu'un lien relie
 *
 * Des **lignes**, pas des noms : la valeur qui porte le résultat repose sur les
 * valeurs que la règle a lues. C'est ce qui permet de répondre à « la hauteur
 * change, qu'est-ce qui tombe ? » — et la réponse est une liste de lignes, pas
 * une liste de mots.
 *
 * @param {object[]} assertions la mémoire du projet
 * @returns {{assertion_id: string, depends_on_assertion_id: string, declared_by: null}[]}
 */
export function dependancesDeLaMemoire(assertions = []) {
  const toutes = Array.isArray(assertions) ? assertions : [];
  const regles = [];
  const valeurs = new Map();

  for (const assertion of toutes) {
    if (!enVigueur(assertion)) continue;
    const cle = cleDuSujet(sujetDe(assertion));
    if (!cle) continue;
    if (estUneRegle(assertion)) { regles.push(assertion); continue; }
    if (!valeurs.has(cle)) valeurs.set(cle, []);
    valeurs.get(cle).push(assertion);
  }

  const liens = [];
  const poses = new Set();

  for (const regle of regles) {
    const portees = zonesLisibles(regle).map(normalizeZoneKey).filter(Boolean);

    // Ce qu'elle produit, et ce qu'elle lit — demandés à qui le sait.
    //
    // Une fonction qui **appelle un agent** n'a ni conditions ni conclusion
    // portant son nom : elle déclare ce qu'elle lit et ce qu'elle range, sous
    // d'autres noms que le sien. Lire ici les seules conditions ne trouvait
    // donc rien — le graphe était vide, la profondeur hors gel n'avait aucun
    // aval, et une variante posée dessus annonçait « rien ne bouge » alors
    // qu'elle refait toutes les fondations.
    const produites = sortiesDeLaFonction(regle)
      .flatMap((nom) => valeurs.get(cleDuSujet(nom)) ?? []);

    for (const nomLu of lecturesDeLaRegle(regle)) {
      const lues = valeurs.get(cleDuSujet(nomLu)) ?? [];

      for (const produite of produites) {
        for (const lue of lues) {
          // À portée comparable, et seulement là : le degré du bâtiment A ne
          // dépend pas de la hauteur du bâtiment B. Ce qui vaut partout entre
          // dans toutes les lectures — c'est le sens d'une portée vide.
          if (!lesMemesZones(produite, lue, portees)) continue;
          const cible = texte(produite?.id);
          const socle = texte(lue?.id);
          if (!cible || !socle || cible === socle) continue;

          const marque = `${cible}<-${socle}`;
          if (poses.has(marque)) continue;
          poses.add(marque);
          liens.push({ assertion_id: cible, depends_on_assertion_id: socle, declared_by: null });
        }
      }
    }
  }

  return liens;
}

/** Deux lignes se rencontrent quand leurs portées se recoupent, ou qu'elles valent partout. */
function lesMemesZones(gauche, droite, portees = []) {
  const unes = zonesLisibles(gauche).map(normalizeZoneKey).filter(Boolean);
  const autres = zonesLisibles(droite).map(normalizeZoneKey).filter(Boolean);
  if (!unes.length || !autres.length) return true;
  if (unes.some((zone) => autres.includes(zone))) return true;
  // Et la portée de la règle tranche les cas où ni l'une ni l'autre ne la
  // porte explicitement : c'est elle qui dit pour quel ouvrage on a raisonné.
  return portees.length > 0 && portees.some((zone) => unes.includes(zone) && autres.includes(zone));
}
