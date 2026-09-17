/**
 * Ce qu'une règle a lu pour conclure — une ligne par lecture.
 *
 * ## Ce que ce module remplace
 *
 * Les liens de dépendance se reconstruisaient **par nom, à chaque lecture** :
 * `dependancesDeLaMemoire()` rapprochait « si Hauteur du plancher bas ≤ 28 m »
 * d'une affirmation dont le sujet s'écrit pareil. Trois choses en découlaient, et
 * la troisième bloquait tout le reste : un sujet renommé faisait disparaître le
 * lien en silence, on ne pouvait pas **compter** les emplois d'une donnée, et on
 * ne pouvait pas les **ordonner** — donc pas de plan de recalcul, donc pas de
 * rejeu. Voir `docs/rejouer-la-memoire.md`, étape 1.
 *
 * Ce module construit les lignes ; il n'écrit rien. Il est pur.
 *
 * ## Ce que « enregistré » veut dire, exactement
 *
 * Le moteur qui applique les règles ne travaille pas sur la mémoire : il
 * travaille sur un questionnaire, et il rend des conditions portant des **noms**.
 * Il n'a donc aucun identifiant à nous donner, et cette étape ne prétend pas le
 * contraire.
 *
 * Ce qu'elle change est ailleurs, et c'est l'essentiel : le nom est résolu **une
 * fois, au moment du versement**, contre la mémoire contemporaine de la règle —
 * les valeurs qu'elle a réellement vues —, puis conservé. Après quoi il ne bouge
 * plus. Une lecture faite en mars continue de désigner ce que mars affirmait,
 * même si le sujet est renommé en juin, même si la valeur est remplacée en
 * juillet. C'est la sémantique que `assertion_dependencies` documente déjà :
 * « la note repose sur la valeur A2 telle qu'elle était affirmée le 12 août ».
 *
 * Reconstruire après coup, pour la mémoire versée avant cette table, résout les
 * mêmes noms contre la mémoire d'**aujourd'hui**. C'est une approximation, elle
 * porte `reconstruit`, et l'écran doit le dire : confondre les deux ferait passer
 * pour établi un lien qui n'est qu'une ressemblance de noms.
 *
 * ## Deux producteurs de lectures, et le second n'était pas là
 *
 * Une **règle** dit ce qu'elle lit : ses conditions portent des sujets, et c'est
 * de là que viennent ses lectures. Un **utilitaire** ne le disait pas — il
 * calcule au serveur et ne rapporte qu'un nombre —, si bien qu'une donnée de base
 * employée uniquement par lui comptait « aucun emploi » et qu'une altitude
 * corrigée laissait la cote hors gel derrière elle, muette.
 *
 * Il le déclare maintenant, dans son fichier et sous sa version, et la contrainte
 * qu'il produit porte cette déclaration dans `payload.lectures`. Ce module la
 * résout **par le même chemin** que les conditions d'une règle : même résolution
 * de sujet, même zone, même rang, même figeage au versement. Il n'y a pas deux
 * mécanismes — il y a deux façons de déclarer, et une seule façon de résoudre.
 *
 * La différence tient en un champ : une lecture de règle porte
 * `rule_assertion_id`, une lecture d'utilitaire porte `utility`. La colonne
 * existait déjà, et l'`input_assertion_id` nullable aussi : elles ont été posées
 * pour ce jour-là.
 *
 * ## Un appel, c'est une règle et une zone
 *
 * Une règle **appliquée** dépend de la zone : l'escalier A classé en 3ᵉ famille B
 * et l'escalier B classé en 2ᵉ ne suivent pas les mêmes articles. La même règle
 * sur trois zones fait donc trois appels, et neuf lectures si elle lit trois
 * faits. Compter sans les zones ne voudrait rien dire.
 */

import { cleDuSujet } from "./memoire-identifiants.js";
import { zonesLisibles } from "./memoire-blame.js";
import { normalizeZoneKey } from "./project-zones.js";
import { sujetDe } from "./memoire-raisonnement.js";
import { utilitaireByReference } from "../utilitaires/catalogue.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** D'où vient le lien. Les deux ne se valent pas, et l'écran le dit. */
export const RESOLUTION = {
  /** Résolu au versement, contre la mémoire que la règle a vue. Conservé tel quel. */
  ENREGISTRE: "enregistre",
  /** Résolu après coup, contre la mémoire d'aujourd'hui. Une approximation. */
  RECONSTRUIT: "reconstruit"
};

/** Une règle appliquée se reconnaît à son instantané. */
const estUneRegle = (assertion) => assertion?.payload?.referentiel === true;

/** Ce qui vaut encore : une ligne remplacée ne décrit plus l'état. */
const enVigueur = (assertion) => !texte(assertion?.superseded_by);

/** Les zones d'une affirmation, en clés, ou `[]` pour « partout ». */
function porteesDe(assertion) {
  return [...new Set(zonesLisibles(assertion).map(normalizeZoneKey).filter(Boolean))];
}

/**
 * Cette affirmation vaut-elle dans cette zone ?
 *
 * Une affirmation sans portée vaut partout — c'est une portée, pas une
 * ignorance. Une affirmation portée ne vaut que là où elle est portée.
 */
function vautDans(assertion, zone) {
  const portees = porteesDe(assertion);
  if (!portees.length) return true;
  if (!zone) return false;
  return portees.includes(zone);
}

/**
 * L'agent qu'une fonction appelle, quand elle en appelle un.
 *
 * ## Pourquoi cette fonction plutôt qu'un champ lu partout
 *
 * Le champ a changé de nom : `payload.native` est devenu `payload.agent` quand
 * le langage a cessé de confondre « une fonction opaque » et « une fonction qui
 * appelle un agent ». Les projets versés avant portent l'ancien nom, et ce qui
 * a été décidé se conserve : on lit donc les deux, ici et nulle part ailleurs.
 *
 * Une migration qui réécrirait les anciennes lignes changerait ce que le projet
 * a signé. Une lecture qui accepte les deux formes ne change rien et suffit.
 */
export function agentDeLaFonction(assertion = {}) {
  const dit = assertion?.payload?.agent ?? assertion?.payload?.native ?? null;
  if (!dit || typeof dit !== "object") return null;
  // Les lignes d'avant ne nommaient pas leur agent : elles appelaient toutes un
  // utilitaire déterministe, et c'est ce qu'on écrit à leur place.
  return { genre: texte(dit.genre) || "agent-D", ...dit };
}

/**
 * Les noms qu'une règle a lus, dans l'ordre où elle les lit.
 *
 * Les conditions d'abord, les exceptions ensuite : c'est l'ordre du texte, et
 * c'est celui qu'on veut retrouver dans le rang. Un même nom lu deux fois fait
 * deux lectures — c'est précisément ce qu'on ne savait pas dire.
 */
export function lecturesDeLaRegle(regle = {}) {
  // Une fonction native n'a pas de conditions : son corps ne s'écrit pas. Ce
  // qu'elle lit est déclaré, et c'est la seule chose qui en tient lieu — sans
  // cette branche, la fonction n'aurait aucune entrée et la chaîne se couperait
  // juste avant elle, exactement là où on veut la voir passer.
  const native = agentDeLaFonction(regle);
  if (native) {
    const dites = (Array.isArray(native.lit) ? native.lit : []).map(texte).filter(Boolean);
    if (dites.length) return dites;
    // Rien de déclaré sur la ligne : le catalogue dit ce que cette version lit.
    return lecturesDeLUtilitaire(regle);
  }

  const bloc = regle?.payload?.regle ?? {};
  const toutes = [
    ...(Array.isArray(bloc.conditions) ? bloc.conditions : []),
    ...(Array.isArray(bloc.sauf) ? bloc.sauf : [])
  ];

  return toutes
    .map((condition) => texte(condition?.sujet))
    .filter(Boolean);
}

/**
 * Ce qu'une fonction produit : les sujets qu'elle pose, dans l'ordre.
 *
 * ## Pourquoi une règle en a un et une fonction native plusieurs
 *
 * Une règle conclut sur **son** sujet : « Classement du bâtiment » conclut le
 * classement, et c'est pour cela que la sortie se cherche sous le nom de la
 * règle. Un calcul qui dimensionne un tableau de vingt massifs en pose cent
 * quarante — sept par appui —, et aucun ne porte le nom de la fonction.
 *
 * Chercher la sortie sous le nom de la fonction ne rendait donc rien, et les
 * cent quarante cotes se retrouvaient sans producteur : une fonction sans aval,
 * un tableau de valeurs sans amont, et rien à l'écran pour dire qu'un lien
 * manquait. C'est la seule raison d'être de cette fonction-ci.
 */
export function sortiesDeLaFonction(regle = {}) {
  const native = agentDeLaFonction(regle);
  if (!native) return [texte(sujetDe(regle))].filter(Boolean);

  return (Array.isArray(native.ecrit) ? native.ecrit : [])
    .map((sortie) => texte(sortie?.sujet))
    .filter(Boolean);
}

/**
 * Les sujets qu'une contrainte déduite a lus, dans l'ordre.
 *
 * Deux sources, et l'ordre entre elles importe.
 *
 * **Ce que la contrainte porte**, d'abord : le versement y a recopié la
 * déclaration de l'agent, avec la valeur lue. C'est un enregistrement, daté
 * de la contrainte, et il vaut même si le catalogue change ensuite.
 *
 * **Ce que le catalogue déclare**, à défaut : une contrainte versée avant que les
 * utilitaires déclarent quoi que ce soit ne porte rien, et elle ne se reverse pas
 * pour si peu — reverser une valeur juste périmerait une ligne exacte et
 * marquerait à revérifier ce que rien n'a touché. Sa référence d'utilitaire, elle,
 * est là, version comprise, et le catalogue dit ce que cette version lit. Ce n'est
 * pas un rapprochement de noms : c'est la même déclaration, lue à sa source.
 *
 * Une contrainte dont l'utilitaire est inconnu du catalogue ne rend rien. Son
 * silence se lit dans le compte des opaques, jamais dans un lien inventé.
 */
export function lecturesDeLUtilitaire(assertion = {}) {
  const portees = assertion?.payload?.lectures;
  if (Array.isArray(portees) && portees.length) {
    return portees.map((lecture) => texte(lecture?.sujet)).filter(Boolean);
  }

  const outil = utilitaireByReference(texte(assertion?.payload?.utilitaire));
  return (Array.isArray(outil?.lit) ? outil.lit : []).map((entree) => texte(entree?.sujet)).filter(Boolean);
}

/**
 * Ce qu'un nom désignait, dans cette zone.
 *
 * Deux préférences, dans cet ordre. **La même proposition d'abord** : une règle
 * versée avec les valeurs qu'elle a produites a lu celles-là, pas celles
 * qu'elles remplacent. **La zone ensuite** : une valeur portée ici l'emporte sur
 * une valeur qui vaut partout, parce qu'elle est plus précise.
 *
 * On ne remonte jamais à une autre zone : emprunter la valeur du bâtiment voisin
 * serait le pire des mensonges — elle se lirait comme la valeur d'ici.
 */
function resoudre(nom, { parSujet, parRegle = null, zone, propositionId }) {
  const cle = cleDuSujet(nom);
  return choisir(parSujet.get(cle), { zone, propositionId })
    // À défaut, la **règle** qui conclut ce sujet.
    //
    // C'est le trou qui coupait les chaînes en deux. Un projet ne verse pas
    // toujours une valeur pour chaque conclusion : « Famille : 2 » peut n'exister
    // que dans la règle qui l'établit, sa valeur portée dans son propre bloc. Le
    // sujet est pourtant **déclaré** — `sujetsDeclares` le compte depuis
    // toujours —, et les soixante-huit règles qui le lisent le trouvent à
    // l'écran.
    //
    // Ne chercher que parmi les valeurs faisait donc deux dégâts à la fois : la
    // règle qui conclut ce sujet n'avait pas de sortie et **aucune** de ses
    // lectures n'était enregistrée ; et chaque règle qui le lisait perdait son
    // entrée. Une chaîne de six pas se retrouvait en morceaux de deux, sans que
    // rien ne le dise.
    //
    // On ne remonte à la règle qu'en dernier : une valeur versée est plus proche
    // de ce que le projet affirme aujourd'hui que le bloc qui l'a produite.
    ?? choisir(parRegle?.get(cle), { zone, propositionId });
}

/** Parmi des candidates du même sujet : le même versement d'abord, la zone ensuite. */
function choisir(candidates, { zone, propositionId }) {
  const dansLaZone = (Array.isArray(candidates) ? candidates : [])
    .filter((assertion) => vautDans(assertion, zone));
  if (!dansLaZone.length) return null;

  const memeVersement = propositionId
    ? dansLaZone.filter((assertion) => texte(assertion.proposition_id) === texte(propositionId))
    : [];
  const pool = memeVersement.length ? memeVersement : dansLaZone;

  const portees = pool.filter((assertion) => porteesDe(assertion).length);
  return (portees.length ? portees : pool)[0] ?? null;
}

/**
 * Les lectures de toute une mémoire, prêtes à écrire.
 *
 * @param {object[]} assertions la mémoire, telle qu'elle est après le versement
 * @param {object} [options]
 * @param {string} [options.projectId]
 * @param {string} [options.resolution] `RESOLUTION.ENREGISTRE` au versement,
 *   `RESOLUTION.RECONSTRUIT` pour rattraper l'existant
 * @param {string} [options.propositionId] le versement en cours, s'il y en a un
 * @param {Set<string>|string[]|null} [options.sorties] n'écrire que les appels
 *   qui produisent ces affirmations-là. Au versement, ce sont celles qu'on vient
 *   d'écrire : réécrire les appels de toute la mémoire à chaque fusion
 *   remplacerait des liens enregistrés par des liens reconstruits.
 * @returns {object[]} les lignes de `assertion_applications`
 */
export function applicationsDeLaMemoire(assertions = [], {
  projectId = "",
  resolution = RESOLUTION.RECONSTRUIT,
  propositionId = null,
  sorties = null
} = {}) {
  const toutes = (Array.isArray(assertions) ? assertions : []).filter(enVigueur);
  const retenues = sorties ? new Set([...sorties].map(texte).filter(Boolean)) : null;

  const parSujet = new Map();
  const regles = [];
  const deduites = [];
  /** Les règles par sujet conclu : le recours quand aucune valeur ne le porte. */
  const parRegle = new Map();

  for (const assertion of toutes) {
    const cle = cleDuSujet(sujetDe(assertion));
    if (!cle) continue;
    if (estUneRegle(assertion)) {
      regles.push(assertion);
      if (!parRegle.has(cle)) parRegle.set(cle, []);
      parRegle.get(cle).push(assertion);
      continue;
    }
    if (!parSujet.has(cle)) parSujet.set(cle, []);
    parSujet.get(cle).push(assertion);
    // Une contrainte qui déclare ce qu'elle a lu est une valeur **et** un
    // producteur de lectures. Les deux, pas l'un ou l'autre.
    if (lecturesDeLUtilitaire(assertion).length) deduites.push(assertion);
  }

  const lignes = [];
  const projet = texte(projectId);

  /**
   * Ce qu'une règle produit déjà, pour ne pas le produire deux fois.
   *
   * Une même affirmation conclue par une règle **et** déduite par un utilitaire
   * est un défaut de la mémoire, pas deux raisonnements. La règle l'emporte :
   * elle porte le texte, elle s'audite, elle se rejoue. Écrire les deux jeux de
   * lectures ferait en plus deux rangs 1 pour un même appel, ce que la clé de
   * `assertion_applications` refuse — et le versement entier échouerait pour un
   * lien de second rang.
   */
  const produitesParUneRegle = new Set();

  for (const regle of regles) {
    const noms = lecturesDeLaRegle(regle);
    if (!noms.length) continue;

    // Une règle sans portée a servi une fois, partout : `""` est cette portée-là.
    const zones = porteesDe(regle);
    const appels = zones.length ? zones : [""];

    // Une règle pose un sujet, une fonction native en pose autant qu'elle en a
    // écrit. Les lectures se rattachent à **chacun** : sans cela, cent quarante
    // cotes sortiraient d'un calcul dont rien ne dirait ce qu'il a lu.
    for (const zone of appels) {
      for (const nomDeLaSortie of sortiesDeLaFonction(regle)) {
        const sortie = resoudre(nomDeLaSortie, {
          parSujet, parRegle, zone, propositionId: texte(regle.proposition_id)
        });
        // Une règle qui n'a rien produit dans cette zone n'y a pas servi. On ne
        // rattache pas ses lectures à la valeur d'une autre zone.
        if (!sortie?.id) continue;
        produitesParUneRegle.add(texte(sortie.id));
        if (retenues && !retenues.has(texte(sortie.id))) continue;

        noms.forEach((nom, index) => {
          const entree = resoudre(nom, {
            parSujet, parRegle, zone, propositionId: texte(regle.proposition_id)
          });

          lignes.push({
            project_id: projet || texte(sortie.project_id),
            rule_assertion_id: texte(regle.id) || null,
            output_assertion_id: texte(sortie.id),
            // `null` n'est pas un oubli : le nom ne désignait rien que le projet
            // ait versé. C'est le trou du raisonnement, et il se compte.
            //
            // Une règle qui **est** sa propre conclusion ne se lit pas elle-même :
            // le lien tournerait en rond et l'onde y ferait un cycle qui n'existe
            // pas dans le raisonnement.
            input_assertion_id: texte(entree?.id) === texte(sortie.id)
              ? null
              : texte(entree?.id) || null,
            input_subject: nom,
            input_rank: index + 1,
            zone,
            utility: texte(regle.payload?.utilitaire) || null,
            proposition_id: texte(propositionId) || texte(regle.proposition_id) || null,
            resolution
          });
        });
      }
    }
  }

  // Les lectures qu'un utilitaire a déclarées. La contrainte **est** sa propre
  // sortie — il n'y a pas de sujet à résoudre pour la trouver —, et le reste
  // suit le chemin des règles : même résolution, même zone, même rang.
  for (const contrainte of deduites) {
    const sortie = texte(contrainte.id);
    if (!sortie || produitesParUneRegle.has(sortie)) continue;
    if (retenues && !retenues.has(sortie)) continue;

    const noms = lecturesDeLUtilitaire(contrainte);
    const zones = porteesDe(contrainte);

    for (const zone of zones.length ? zones : [""]) {
      noms.forEach((nom, index) => {
        const entree = resoudre(nom, {
          parSujet, parRegle, zone, propositionId: texte(contrainte.proposition_id)
        });

        lignes.push({
          project_id: projet || texte(contrainte.project_id),
          // Aucune règle du projet n'est en cause : c'est un utilitaire, et
          // c'est la colonne `utility` qui le nomme.
          rule_assertion_id: null,
          output_assertion_id: sortie,
          // Une contrainte ne se lit pas elle-même. Si le sujet déclaré se
          // résout sur elle, la déclaration est fautive : on la garde sans
          // entrée plutôt que de la taire, parce qu'un sujet déclaré qui ne
          // désigne rien est le trou du raisonnement, et il se compte.
          input_assertion_id: texte(entree?.id) === sortie ? null : texte(entree?.id) || null,
          input_subject: nom,
          input_rank: index + 1,
          zone,
          utility: texte(contrainte.payload?.utilitaire) || null,
          proposition_id: texte(propositionId) || texte(contrainte.proposition_id) || null,
          resolution
        });
      });
    }
  }

  return lignes;
}

/**
 * Ce qu'un versement ajoute au graphe.
 *
 * Les appels se résolvent contre la mémoire **d'après** le versement — une règle
 * versée avec les valeurs qu'elle produit a lu celles-là — mais on n'écrit que
 * les appels des lignes qu'on vient d'écrire. Le reste de la mémoire garde les
 * siens, résolus en leur temps.
 */
export function applicationsDuVersement({
  memoire = [], ecrites = [], projectId = "", propositionId = null
} = {}) {
  const nouvelles = Array.isArray(ecrites) ? ecrites : [];
  if (!nouvelles.length) return [];

  // La mémoire d'après, sans doublon : une ligne réécrite ne doit pas peser deux
  // fois dans la résolution.
  const parId = new Map();
  for (const assertion of [...(Array.isArray(memoire) ? memoire : []), ...nouvelles]) {
    const id = texte(assertion?.id);
    if (id) parId.set(id, assertion);
  }

  return applicationsDeLaMemoire([...parId.values()], {
    projectId,
    propositionId,
    resolution: RESOLUTION.ENREGISTRE,
    sorties: nouvelles.map((assertion) => texte(assertion?.id)).filter(Boolean)
  });
}

/**
 * Les liens de dépendance que ces lectures dessinent.
 *
 * Le format est celui de `assertion_dependencies`, pour que les lecteurs — le
 * drapeau « à revérifier », le compte des dépendants — n'aient pas à savoir d'où
 * le lien vient. Une lecture dont le nom ne désignait rien ne fait pas de lien :
 * on ne dépend pas de ce qui n'existe pas.
 *
 * Dédupliqué, parce qu'un lien dit « repose sur », pas « combien de fois » : le
 * compte se lit sur les lectures, qui le portent.
 */
export function dependancesDesApplications(applications = []) {
  const vus = new Set();
  const liens = [];

  for (const ligne of Array.isArray(applications) ? applications : []) {
    const cible = texte(ligne?.output_assertion_id);
    const socle = texte(ligne?.input_assertion_id);
    if (!cible || !socle || cible === socle) continue;

    const marque = `${cible}<-${socle}`;
    if (vus.has(marque)) continue;
    vus.add(marque);
    liens.push({ assertion_id: cible, depends_on_assertion_id: socle, declared_by: null });
  }

  return liens;
}

/**
 * Ce qui emploie chaque nom, avec le compte exact.
 *
 * C'est la question qu'on pose devant une donnée de base — « qui s'en sert ? » —
 * et c'est la même table lue par l'autre bout. Le compte porte sur les
 * **lectures**, pas sur les fonctions : une règle qui lit deux fois le même nom
 * s'en sert deux fois.
 *
 * @returns {Map<string, {sujet: string, lectures: number, sorties: Set<string>, zones: Set<string>}>}
 */
export function emploisParSujet(applications = []) {
  const emplois = new Map();

  for (const ligne of Array.isArray(applications) ? applications : []) {
    const nom = texte(ligne?.input_subject);
    const cle = cleDuSujet(nom);
    if (!cle) continue;

    if (!emplois.has(cle)) {
      emplois.set(cle, { sujet: nom, lectures: 0, sorties: new Set(), zones: new Set(), orphelines: 0 });
    }
    const emploi = emplois.get(cle);
    emploi.lectures += 1;
    if (texte(ligne.output_assertion_id)) emploi.sorties.add(texte(ligne.output_assertion_id));
    emploi.zones.add(texte(ligne.zone));
    // Une lecture dont le nom ne désigne rien : elle compte, et elle se signale.
    if (!texte(ligne.input_assertion_id)) emploi.orphelines += 1;
  }

  return emplois;
}

/**
 * Ce qui emploie chaque **affirmation**, et non chaque nom.
 *
 * `emploisParSujet` répond « ce nom sert quatre fois » ; celle-ci répond « cette
 * valeur-là, telle qu'elle a été affirmée, sert quatre fois ». C'est la question
 * qu'on pose devant une ligne d'un fichier : elle a un identifiant, pas
 * seulement un libellé, et deux valeurs successives d'un même sujet ne servent
 * pas les mêmes fonctions.
 *
 * @returns {Map<string, {lectures: number, sorties: Map<string, number>, zones: Set<string>}>}
 */
export function emploisParAffirmation(applications = []) {
  const emplois = new Map();

  for (const ligne of Array.isArray(applications) ? applications : []) {
    const entree = texte(ligne?.input_assertion_id);
    if (!entree) continue;

    if (!emplois.has(entree)) emplois.set(entree, { lectures: 0, sorties: new Map(), zones: new Set() });
    const emploi = emplois.get(entree);
    emploi.lectures += 1;
    emploi.zones.add(texte(ligne.zone));

    const sortie = texte(ligne.output_assertion_id);
    if (sortie) emploi.sorties.set(sortie, (emploi.sorties.get(sortie) ?? 0) + 1);
  }

  return emplois;
}

/**
 * Ce qui repose sur une valeur, de proche en proche.
 *
 * ## Pourquoi des strates, et pas une liste
 *
 * « 47 affirmations reposent dessus » ne se lit pas : on ne sait pas par quel
 * bout reprendre. Rangées par **distance** — ce qui la lit directement, puis ce
 * qui lit cela — la même réponse devient un chemin : « trois pas, et le premier
 * ne fait que deux lignes ».
 *
 * ## Les cycles se nomment, ils ne bouclent pas
 *
 * Un graphe écrit par des humains finira par en contenir un. Une affirmation
 * déjà atteinte n'est pas revisitée — la strate où on l'a vue la première fois
 * est la bonne, c'est le plus court chemin — et les arêtes qui rebouclent sont
 * rendues à part, pour être montrées plutôt que subies.
 *
 * @param {string} depart l'identifiant de l'affirmation qu'on fait bouger
 * @param {object[]} applications les lectures enregistrées
 * @returns {{strates: string[][], total: number, lectures: number, cycles: {de: string, vers: string}[]}}
 */
export function impactDe(depart, applications = []) {
  const racine = texte(depart);
  const aval = new Map();
  const compte = new Map();

  for (const ligne of Array.isArray(applications) ? applications : []) {
    const entree = texte(ligne?.input_assertion_id);
    const sortie = texte(ligne?.output_assertion_id);
    if (!entree || !sortie || entree === sortie) continue;
    if (!aval.has(entree)) aval.set(entree, new Set());
    aval.get(entree).add(sortie);
    compte.set(sortie, (compte.get(sortie) ?? 0) + 1);
  }

  const strates = [];
  const vus = new Set([racine]);
  const cycles = [];
  let front = [racine];

  while (front.length) {
    const suivante = [];

    for (const noeud of front) {
      for (const enfant of aval.get(noeud) ?? []) {
        if (vus.has(enfant)) {
          // Déjà atteint : soit par un chemin plus court — et c'est là qu'il
          // faut le lire —, soit en rebouclant vers la racine. Le second se dit.
          if (enfant === racine) cycles.push({ de: noeud, vers: enfant });
          continue;
        }
        vus.add(enfant);
        suivante.push(enfant);
      }
    }

    if (!suivante.length) break;
    strates.push(suivante);
    front = suivante;
  }

  return {
    strates,
    total: strates.reduce((somme, strate) => somme + strate.length, 0),
    // Le nombre de lectures qui touchent directement cette valeur : c'est
    // « employée n fois », et ce n'est pas le nombre d'affirmations touchées.
    lectures: (Array.isArray(applications) ? applications : [])
      .filter((ligne) => texte(ligne?.input_assertion_id) === racine).length,
    cycles
  };
}

/**
 * Ce qu'une lecture enregistrée vaut, en un mot.
 *
 * Un graphe où l'on ne distingue pas les liens figés en leur temps des liens
 * rapprochés aujourd'hui se lit comme s'il était tout entier sûr. Le compte des
 * deux se montre.
 */
export function couvertureDesApplications(applications = []) {
  const lignes = Array.isArray(applications) ? applications : [];
  const enregistrees = lignes.filter((ligne) => texte(ligne?.resolution) === RESOLUTION.ENREGISTRE).length;

  return {
    lectures: lignes.length,
    enregistrees,
    reconstruites: lignes.length - enregistrees,
    // Les lectures dont le nom ne désigne rien : le trou du raisonnement, compté.
    orphelines: lignes.filter((ligne) => !texte(ligne?.input_assertion_id)).length
  };
}
