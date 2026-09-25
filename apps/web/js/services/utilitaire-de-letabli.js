/**
 * Un utilitaire de l'établi : ce qu'on garde d'un brouillon, et sous quelle forme.
 *
 * ## L'établi, en un mot
 *
 * L'écran « Écrire du Mdall » sait écrire, colorer, vérifier et lancer. Il ne
 * savait pas **garder** : on fermait l'onglet, et une demi-heure de travail
 * restait dans ce navigateur jusqu'à ce qu'on vide les données du site. Un
 * contrôleur technique ne réécrit pas au projet suivant la règle qu'il vient
 * d'écrire — il la recopie dans un fichier texte, et six mois plus tard
 * personne ne sait laquelle des trois copies fait foi (règle 4).
 *
 * L'établi est la table où l'on pose ses propres outils. Il **garde**, il ne
 * raisonne pas : rien n'en sort vers un projet sans une proposition signée.
 *
 * ## Il entre dans le catalogue, il n'en fabrique pas un second
 *
 * Un utilitaire de l'établi se lit sur les mêmes écrans que les autres : la
 * vitrine, la recherche, la fiche. Il rend donc **exactement la forme qu'une
 * entrée de `catalogue-de-latelier.js` porte**. Une seconde forme demanderait
 * une seconde grille, une seconde fiche et une seconde recherche, et les trois
 * divergeraient au premier réglage (règle 10).
 *
 * ## Ce qu'il prend et ce qu'il rend ne se saisissent pas
 *
 * Ils se **déduisent du code**, par le même graphe que le formulaire du bac :
 * ce qu'aucune règle ne conclut est une entrée, ce qu'une règle conclut est une
 * sortie. Recopiés à la main, ils divergeraient du code au premier ajout d'une
 * condition — et l'on lirait une fiche qui décrit l'outil d'avant.
 *
 * ## Il ne connaît aucun projet
 *
 * Ni ici, ni dans la table. C'est ce qui permettra d'ouvrir l'établi hors de
 * tout projet le jour où quelqu'un en aura besoin, sans rien reprendre — et une
 * épreuve garde cette porte ouverte (`brouillon-mdall.test.mjs`).
 */

import {
  brouillonNeuf, avecLeFichier, ouvertSur, fichiersRemplis, fichierOuvert
} from "./brouillon-mdall.js";
import { champsDuBrouillon } from "./formulaire-du-brouillon.js";
import { fonctionsDuBrouillon } from "./bac-dessai.js";
import { nomsConclusParLeBloc } from "./memoire-en-lecture.js";
import { RAYONS } from "./catalogue-de-latelier.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Ce qui manque avant de pouvoir enregistrer.
 *
 * **On le dit, on ne le devine pas.** Un bouton éteint sans un mot laisse
 * chercher ce qui cloche ; un nom inventé à la place de celui qu'on n'a pas
 * donné se retrouve six mois plus tard dans une liste de vingt outils.
 */
export const MANQUE = {
  /** Aucun nom : c'est sous celui-là qu'on le retrouvera. */
  NOM: "nom",
  /** Pas une ligne de Mdall : il n'y a rien à garder. */
  MDALL: "mdall",
  /** Aucune description : dans six mois, le nom seul ne dira plus rien. */
  RESUME: "resume",
  /** Un autre utilitaire de l'établi porte déjà ce nom. */
  NOM_PRIS: "nom-pris"
};

/** Ce que chaque manque dit à l'écran. */
export const PHRASE_DU_MANQUE = {
  [MANQUE.NOM]: "Donnez-lui un nom : c'est sous celui-là que vous le retrouverez.",
  [MANQUE.MDALL]: "Il n'y a pas une ligne de Mdall à garder.",
  [MANQUE.RESUME]: "Dites en une phrase ce qu'il fait : dans six mois, son nom seul ne le dira plus.",
  [MANQUE.NOM_PRIS]: "Vous avez déjà un utilitaire de ce nom sur votre établi. "
    + "Donnez-lui un autre nom — ou reprenez celui qui existe, et enregistrez : il montera d'une version."
};

/**
 * Ce que la base a refusé, et pourquoi.
 *
 * ## Le défaut que ça répare
 *
 * Enregistrer un second utilitaire du même nom rendait un `409` que le module
 * avalait : l'écran disait « il n'a pas pu être enregistré, réessayez », et
 * réessayer échouait exactement pareil. On cherchait une panne de réseau là
 * où il suffisait de changer trois lettres.
 *
 * ## Pourquoi on regarde la contrainte, et pas seulement le code
 *
 * `23505` dit « cette ligne existe déjà », sans dire laquelle. Deux unicités
 * existent sur l'établi : le nom, et le numéro d'une version. La seconde ne se
 * heurte qu'en cas de course — dire « ce nom est pris » dans ce cas-là
 * enverrait renommer un outil dont le nom n'a rien fait (règle 5).
 */
export const REFUS_DE_LETABLI = {
  /** Un utilitaire de ce nom est déjà sur cet établi. */
  NOM_PRIS: "nom-pris",
  /** Tout le reste : une panne, une session expirée, un refus qu'on ne sait pas lire. */
  PANNE: "panne"
};

export const PHRASE_DU_REFUS = {
  [REFUS_DE_LETABLI.NOM_PRIS]: PHRASE_DU_MANQUE[MANQUE.NOM_PRIS],
  [REFUS_DE_LETABLI.PANNE]: "Il n'a pas pu être enregistré. Rien n'est perdu : réessayez."
};

/**
 * Le refus que porte une réponse de la base.
 *
 * @param {{code?: string, details?: string, message?: string}|null} dit le corps
 *   d'erreur, tel que PostgREST le rend
 */
export function refusDeLaBase(dit = null) {
  if (texte(dit?.code) !== "23505") return REFUS_DE_LETABLI.PANNE;

  // La contrainte d'unicité du nom s'appelle `etabli_utilitaires_owner_id_nom_key`,
  // et le détail cite les colonnes heurtées. L'une ou l'autre suffit ; exiger
  // les deux ferait dépendre la phrase d'un format de message.
  const ou = `${texte(dit?.details)} ${texte(dit?.message)}`;
  return /owner_id,\s*nom|owner_id_nom_key/.test(ou)
    ? REFUS_DE_LETABLI.NOM_PRIS
    : REFUS_DE_LETABLI.PANNE;
}

/**
 * Ce nom est-il déjà pris sur cet établi ?
 *
 * **On ne bloque pas ce qu'on ne sait pas.** `etabli` à `null` veut dire « pas
 * encore lu » : refuser dans ce cas empêcherait d'enregistrer quand la lecture
 * a échoué, alors que la base, elle, aurait accepté (règle 5). Elle tranche de
 * toute façon — c'est elle qui porte la contrainte.
 *
 * La comparaison est celle de la base : le nom **rogné**, et la casse compte.
 * Ignorer la casse ici ferait refuser à l'écran un nom que la base accepte.
 */
export function nomDejaPris(nom = "", id = "", etabli = null) {
  if (!Array.isArray(etabli)) return false;

  const dit = texte(nom);
  if (!dit) return false;

  const sien = texte(id);
  return etabli.some((un) => texte(un?.nom) === dit && texte(un?.id) !== sien);
}

/**
 * Le préfixe des cibles de l'établi.
 *
 * Une cible est déjà l'identifiant d'un utilitaire partout ailleurs ; en
 * inventer un second ici ferait deux noms pour une chose. Le préfixe dit
 * seulement d'où l'entrée vient, pour que l'écran sache la rouvrir.
 */
export const PREFIXE_DE_LETABLI = "etabli:";

/** La cible d'un utilitaire de l'établi, d'après son identifiant. */
export function cibleDeLetabli(id = "") {
  const cle = texte(id);
  return cle ? `${PREFIXE_DE_LETABLI}${cle}` : "";
}

/** Cette cible est-elle celle d'un utilitaire de l'établi ? */
export function estDeLetabli(cible = "") {
  return texte(cible).startsWith(PREFIXE_DE_LETABLI);
}

/** L'identifiant porté par une cible de l'établi, ou une chaîne vide. */
export function idDeLaCible(cible = "") {
  return estDeLetabli(cible) ? texte(cible).slice(PREFIXE_DE_LETABLI.length) : "";
}

/**
 * Les fichiers d'un brouillon, sous la forme qu'on garde.
 *
 * **Triés par nom, et seulement ceux qui portent quelque chose.** La base
 * compare deux versions pour savoir si le texte a changé : deux enregistrements
 * du même travail dans un ordre différent compteraient pour deux versions, et
 * l'on monterait de version sans avoir rien écrit.
 */
export function fichiersDeLutilitaire(brouillon = null) {
  // Pas de garde sur le nom : les trois fichiers d'un brouillon sont nommés à
  // sa naissance, `avecLeFichier` ne touche que ceux qui existent, et ce qu'on
  // relit du navigateur se reconstruit sur eux. Une garde ici ne pourrait
  // tomber sur aucun cas (règle 12).
  return fichiersRemplis(brouillon)
    .map((fichier) => ({ nom: texte(fichier?.nom), contenu: String(fichier?.contenu ?? "") }))
    .sort((gauche, droite) => gauche.nom.localeCompare(droite.nom, "fr"));
}

/** Un brouillon reconstruit à partir des fichiers gardés. */
export function brouillonDesFichiers(fichiers = []) {
  const gardes = Array.isArray(fichiers) ? fichiers : [];
  let brouillon = gardes.reduce(
    (courant, fichier) => avecLeFichier(courant, texte(fichier?.nom), String(fichier?.contenu ?? "")),
    brouillonNeuf()
  );

  // **On rouvre sur les règles quand il y en a**, et sur le premier fichier
  // rempli sinon. Rouvrir sur un onglet vide donne l'impression d'avoir perdu
  // son travail ; rouvrir sur les déclarations fait chercher le raisonnement
  // qu'on venait relire.
  const ouvre = fichiersRemplis(brouillon);
  const regles = ouvre.find((fichier) => texte(fichier?.nom) === fichierOuvert(brouillonNeuf())?.nom);
  const premier = regles ?? ouvre[0];
  if (premier?.nom) brouillon = ouvertSur(brouillon, texte(premier.nom));

  return brouillon;
}

/**
 * Ce qu'un brouillon **prend** : les entrées de son formulaire.
 *
 * C'est la même question que celle du bac d'essai, posée au même endroit : ce
 * qu'aucune règle ne conclut. Une seconde réponse écrite ici dirait un jour
 * autre chose que la première (règle 10).
 */
export function entreesDeLutilitaire(fichiers = []) {
  return champsDuBrouillon(fichiers).map((champ) => {
    const nom = texte(champ?.nom);
    // L'unité fait partie de ce qu'on demande : « Prix HT » et « Prix HT (€) »
    // ne se remplissent pas de la même façon.
    return champ?.unite ? `${nom} (${texte(champ.unite)})` : nom;
  });
}

/** Ce qu'un brouillon **rend** : ce que ses fonctions concluent. */
export function sortiesDeLutilitaire(fichiers = []) {
  const sorties = [];
  const vues = new Set();

  for (const { bloc } of fonctionsDuBrouillon(fichiers)) {
    for (const nom of nomsConclusParLeBloc(bloc)) {
      const dit = texte(nom);
      if (!dit || vues.has(dit.toLowerCase())) continue;
      vues.add(dit.toLowerCase());
      sorties.push(dit);
    }
  }

  return sorties;
}

/**
 * Ce sous quoi on le retrouvera quand on aura oublié son nom.
 *
 * Ce qu'il lit et ce qu'il conclut : c'est ce qu'on tape dans la barre de
 * l'Atelier — « TVA », « volets » —, et cela se déduit comme le reste.
 */
export function motsDeLutilitaire(fichiers = []) {
  const mots = new Set();

  for (const dit of [...entreesDeLutilitaire(fichiers), ...sortiesDeLutilitaire(fichiers)]) {
    for (const mot of dit.replace(/\(.*?\)/g, " ").split(/[\s,;()]+/)) {
      const propre = texte(mot).toLowerCase();
      // Les mots d'un caractère ne cherchent rien, et « de », « du », « la »
      // rendraient l'établi entier à la moindre frappe.
      if (propre.length > 2) mots.add(propre);
    }
  }

  return [...mots];
}

/** Le rayon demandé, ramené à ceux qui existent. */
export function rayonDeLutilitaire(valeur = "") {
  const dit = texte(valeur).toLowerCase();
  return Object.values(RAYONS).includes(dit) ? dit : RAYONS.EXPLORATION;
}

/**
 * Ce qui manque pour enregistrer ce brouillon sous ce nom.
 *
 * @returns {string[]} les codes de `MANQUE`, dans l'ordre où on les corrige
 */
export function cequiManque(brouillon = null, { nom = "", resume = "", id = "", etabli = null } = {}) {
  const manques = [];
  if (!texte(nom)) manques.push(MANQUE.NOM);
  if (!texte(resume)) manques.push(MANQUE.RESUME);
  if (!fichiersDeLutilitaire(brouillon).length) manques.push(MANQUE.MDALL);
  // **Dit avant le clic, quand on le sait.** La base refuse de toute façon ;
  // l'apprendre après avoir cliqué fait chercher une panne là où il suffit de
  // changer trois lettres.
  if (nomDejaPris(nom, id, etabli)) manques.push(MANQUE.NOM_PRIS);
  return manques;
}

/**
 * La fiche d'un brouillon : ce qu'on va garder, avant de le garder.
 *
 * **On voit ce qu'on signe.** Le nom et la description se saisissent ; ce qu'il
 * prend, ce qu'il rend et ce sous quoi on le cherchera se déduisent, et se
 * montrent avant l'enregistrement plutôt que d'être découverts sur la fiche.
 */
export function ficheDuBrouillon(
  brouillon = null, { nom = "", resume = "", rayon = "", id = "", etabli = null } = {}
) {
  const fichiers = fichiersDeLutilitaire(brouillon);

  return {
    nom: texte(nom),
    resume: texte(resume),
    rayon: rayonDeLutilitaire(rayon),
    fichiers,
    entrees: entreesDeLutilitaire(fichiers),
    sorties: sortiesDeLutilitaire(fichiers),
    mots: motsDeLutilitaire(fichiers),
    manques: cequiManque(brouillon, { nom, resume, id, etabli })
  };
}

/**
 * Une ligne de l'établi, mise à la forme d'une entrée du catalogue.
 *
 * ## Les trois champs qui ne viennent pas de la base
 *
 *  - **`intelligence`** — `false` : le Mdall d'un brouillon compare et calcule,
 *    il n'appelle aucun modèle. Le jour où il appellera un agent, cela se lira
 *    dans son texte, et ce champ le dira — pas avant.
 *  - **`aussiALaMain`** — le code lui-même. C'est tout l'objet du langage :
 *    l'IA accélère, elle n'est jamais le seul chemin (fondamental 13).
 *  - **`entrees`, `sorties`, `mots`** — déduits du texte gardé, jamais de ce
 *    que quelqu'un a tapé dans un champ.
 */
export function utilitaireDeLetabli(ligne = null, fichiers = []) {
  const id = texte(ligne?.id);
  if (!id) return null;

  const gardes = Array.isArray(fichiers) ? fichiers : [];

  return {
    cible: cibleDeLetabli(id),
    nom: texte(ligne?.nom),
    rayon: rayonDeLutilitaire(ligne?.rayon),
    resume: texte(ligne?.resume),
    entrees: entreesDeLutilitaire(gardes),
    sorties: sortiesDeLutilitaire(gardes),
    version: String(Number(ligne?.version) || 1),
    intelligence: false,
    aussiALaMain: "Le lire : c'est du Mdall, il se lit ligne à ligne.",
    mots: motsDeLutilitaire(gardes),
    // La date du **premier** enregistrement : « Ajouté récemment » répond à
    // « qu'est-ce qui est nouveau », pas à « qu'est-ce qui a bougé ».
    ajouteLe: texte(ligne?.created_at).slice(0, 10),
    /** Ce qui le distingue d'une entrée du dépôt, et que seul l'établi porte. */
    deLetabli: true,
    id,
    fichiers: gardes,
    modifieLe: texte(ligne?.updated_at).slice(0, 10)
  };
}

/**
 * Ce que l'enregistrement va faire, dit avant de le faire.
 *
 * **Le numéro de version n'est pas calculé ici.** C'est la base qui le pose, et
 * elle seule : deux enregistrements simultanés lus puis écrits par le
 * navigateur produiraient deux fois le même numéro. On dit donc ce qui va se
 * passer — garder tel quel, ou monter d'une version — sans prétendre savoir
 * lequel sortira.
 */
export function ceQueLenregistrementFait(courant = null, fichiers = []) {
  if (!courant?.id) return { quoi: "neuf", version: 1 };

  const memes = JSON.stringify(courant.fichiers ?? []) === JSON.stringify(fichiers ?? []);
  const version = Number(courant.version) || 1;

  return memes
    ? { quoi: "inchange", version }
    : { quoi: "monte", version, versVersion: version + 1 };
}

/**
 * D'où vient un brouillon qu'on s'apprête à proposer.
 *
 * `null` pour un brouillon anonyme. Pour un utilitaire repris : son nom, sa
 * version, **et le fait que le texte ait bougé depuis**.
 *
 * ## Le piège
 *
 * On reprend la `v2`, on modifie deux lignes, on propose. Annoncer « v2 »
 * serait faux : ce qui entre dans le projet n'est pas la `v2`, et la comparer
 * plus tard à celle de l'établi ne dirait rien de juste. La question se pose
 * exactement comme à l'enregistrement — le texte a-t-il changé ? — et se
 * répond au même endroit (règle 10).
 */
export function provenanceDuBrouillon(utilitaire = null, brouillon = null) {
  if (!utilitaire?.id) return null;

  const quoi = ceQueLenregistrementFait(utilitaire, fichiersDeLutilitaire(brouillon));
  return {
    // L'identifiant voyage avec : c'est lui qui retrouvera l'outil le jour où
    // l'on voudra comparer ce que le projet tient à ce que l'établi est devenu.
    // Un nom ne suffit pas — il se renomme.
    id: texte(utilitaire.id),
    nom: texte(utilitaire.nom),
    version: texte(utilitaire.version) || "1",
    modifie: quoi.quoi === "monte"
  };
}

/**
 * Le numéro d'une version, pour comparer `v2` à `v10`.
 *
 * Comparer les textes rendrait `v10` antérieur à `v2`, et une montée de version
 * passerait pour un retour en arrière — silencieusement. C'est la même raison
 * qu'au catalogue du dépôt, où la fonction porte le même nom.
 */
export function numeroDeVersion(version = "") {
  const lu = Number.parseInt(texte(version).replace(/^v/i, ""), 10);
  return Number.isFinite(lu) && lu > 0 ? lu : 0;
}

/**
 * Une version plus récente existe-t-elle sur l'établi de celui qui regarde ?
 *
 * ## La question, et à qui elle se pose
 *
 * Le projet tient une règle venue de « Volets en bois » `v2`. L'établi est
 * passé en `v3` — on a corrigé l'outil sur un autre chantier. Rien ne le
 * disait : la règle restait à l'écran comme si elle était à jour, et son
 * auteur ne s'en apercevait qu'en rouvrant son outil.
 *
 * ## Elle ne met jamais rien à jour
 *
 * Ce qui est dans la mémoire d'un projet y est entré par une proposition
 * signée. Le remplacer parce qu'un numéro a bougé serait écrire dans la
 * mémoire sans que personne l'ait décidé (règle 1). On signale ; l'utilisateur
 * décide ; et ce qu'il décide repasse par le chemin de tout le monde.
 *
 * ## Elle rend `null` plutôt que « non » quand elle ne sait pas
 *
 * Un établi qu'on n'a pas pu lire, une marque sans version, un outil retiré de
 * l'établi : dans les trois cas on **ignore** où la lignée en est. Répondre
 * « non » ferait passer pour à jour ce qu'on n'a pas regardé (règle 5).
 *
 * @param {{id?: string, version?: string|number, nom?: string}|null} marque ce
 *   que la ligne porte, tel que la proposition l'a écrit
 * @param {object[]|null} etabli l'établi de celui qui regarde
 * @returns {{nom: string, tenue: number, derniere: number}|null}
 */
export function uneVersionPlusRecente(marque = null, etabli = null) {
  if (!Array.isArray(etabli)) return null;

  const id = texte(marque?.id);
  const tenue = numeroDeVersion(marque?.version);
  if (!id || !tenue) return null;

  const outil = etabli.find((un) => texte(un?.id) === id);
  // Retiré de l'établi, ou à quelqu'un d'autre : on ne sait pas où sa lignée
  // en est, et se taire vaut mieux que rassurer à tort.
  if (!outil) return null;

  const derniere = numeroDeVersion(outil.version);
  if (!derniere || derniere <= tenue) return null;

  return { nom: texte(outil.nom) || texte(marque?.nom), tenue, derniere };
}

/**
 * Ce que l'écran ajoute quand la lignée a avancé.
 *
 * **Elle dit que rien n'a bougé ici.** Sans cela, on lit « votre établi est en
 * v3 » et l'on se demande laquelle des deux le projet tient — alors que c'est
 * précisément ce que la ligne vient de dire.
 */
export function phraseDeLaVersion(avance = null) {
  if (!avance) return "";
  return `votre établi est en v${avance.derniere} — rien n'a été changé ici`;
}

/** Ce que l'écran dit de l'enregistrement à venir. */
export function phraseDeLenregistrement(quoi = null) {
  if (quoi?.quoi === "neuf") return "Il entrera sur votre établi en v1.";
  if (quoi?.quoi === "inchange") {
    return `Le texte n'a pas changé : il restera en v${quoi.version}, seule la fiche sera reprise.`;
  }
  if (quoi?.quoi === "monte") return `Le texte a changé : il passera de v${quoi.version} à v${quoi.versVersion}.`;
  return "";
}
