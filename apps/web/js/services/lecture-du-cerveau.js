/**
 * Lire le cerveau d'un projet, et le dire en français.
 *
 * ## Le défaut que ça répare
 *
 * Le copilote savait décrire *l'application* — « elle utilise une mémoire de
 * projet », « elle intègre des agents spécialisés » —, et c'était juste et
 * creux : la même phrase vaut pour n'importe quel projet, y compris un projet
 * vide. Ce qu'on veut savoir, c'est **ce que ce projet-ci a dans la tête** :
 * combien de valeurs, combien de règles, et surtout combien de chaînes se
 * rejouent vraiment.
 *
 * Un modèle de langage ne peut pas le savoir. Il reçoit la mémoire en prose ;
 * il n'a ni le graphe, ni les liens, ni leur couleur. Le laisser en parler
 * revenait à lui faire dire du vraisemblable sur un dessin qu'il n'a jamais vu.
 *
 * Ce module compte, et rend deux choses :
 *
 *  - **une lecture** : des nombres, rien d'autre. C'est ce qui part au modèle ;
 *  - **un récit** : les mêmes nombres, en phrases, avec ce qu'ils veulent dire.
 *    Générique dans sa forme, exact dans son contenu — le texte change avec le
 *    projet parce que les nombres changent, jamais parce qu'on l'a inventé.
 *
 * ## Pourquoi le récit est écrit ici, et pas laissé au modèle
 *
 * Parce qu'il porte une **grammaire visuelle** — un rond est une valeur, un cube
 * est une règle, un lien bleu passe par une règle, un lien orange non — et
 * qu'une grammaire ne se paraphrase pas : elle se cite. Un modèle qui
 * reformulerait « orange » en « rougeâtre » ou « cube » en « carré » ferait
 * chercher à l'écran quelque chose qui n'y est pas. Le modèle reçoit donc le
 * récit **déjà écrit** et l'enchâsse ; il commente, il ne redécrit pas.
 *
 * ## Pourquoi c'est un fichier à part
 *
 * Le dessin du cerveau vit dans une toile et une boucle d'animation : il ne
 * s'importe pas dans un test. Le compte, lui, n'a besoin que du graphe —
 * séparé, il s'exécute, et l'on regarde ce qui sort.
 */

import { GENRE } from "./memoire-cerveau.js";
import { domainLabel } from "./assertion-taxonomy.js";

const texte = (valeur) => String(valeur ?? "").trim();
const accorde = (n, un, plusieurs) => (Math.abs(n) > 1 ? plusieurs : un);

/** Un pourcentage entier, ou `null` quand il n'y a rien à rapporter. */
function part(combien, total) {
  if (!Number.isFinite(combien) || !Number.isFinite(total) || total <= 0) return null;
  return Math.round((combien / total) * 100);
}

/**
 * Ce que le cerveau contient, en nombres.
 *
 * ## Un lien est bleu quand il touche une règle
 *
 * C'est la règle du dessin, reprise telle quelle : dans le graphe déplié, un
 * lien qui touche une règle n'a qu'une extrémité de chaque genre — il part
 * d'une entrée vers la règle, ou de la règle vers sa conclusion. Les autres,
 * ceux qui vont d'une valeur à une valeur, restent orange : le projet sait
 * qu'il y a dépendance, il ne sait pas la refaire.
 *
 * Écrire ce critère ici plutôt que de le relire du dessin serait le dire à deux
 * endroits (règle 4) — mais le dessin le calcule dans sa boucle d'animation,
 * pour une couleur, et n'en garde rien. Ce module le recompte donc, et le test
 * les compare.
 *
 * @param {object} cerveau ce que rend `cerveauDuProjet`
 * @param {object} [options]
 * @param {number} [options.signales] combien de nœuds l'audit signale
 * @param {number} [options.isoles] combien de nœuds ne touchent à rien
 * @param {string} [options.selection] ce que la requête retenait, en clair
 */
export function lireLeCerveau(cerveau = {}, { signales = 0, isoles = 0, selection = "" } = {}) {
  const noeuds = Array.isArray(cerveau?.noeuds) ? cerveau.noeuds : [];
  const liens = Array.isArray(cerveau?.liens) ? cerveau.liens : [];
  const compte = cerveau?.compte ?? {};

  const genreDe = new Map(noeuds.map((noeud) => [noeud.id, noeud.genre]));
  const parUneRegle = liens.filter((lien) =>
    genreDe.get(lien?.de) === GENRE.FONCTION || genreDe.get(lien?.vers) === GENRE.FONCTION).length;

  const valeurs = noeuds.filter((noeud) => noeud.genre !== GENRE.FONCTION);
  const regles = noeuds.filter((noeud) => noeud.genre === GENRE.FONCTION);

  // Les domaines, du plus fourni au moins fourni. C'est ce qui dit de quoi ce
  // projet est fait : un cerveau plein de sismique et un cerveau plein
  // d'incendie ne se regardent pas pareil, et ne se commentent pas pareil.
  const parDomaine = new Map();
  for (const noeud of noeuds) {
    // Le nom que l'écran affiche, pas la clé de la base : « géotechnique » et
    // non « geotechnique ». Ce texte part dans une réponse qu'on lit.
    // `domainLabel` répond « Non classé » pour le vide **comme** pour un domaine
    // qu'il ne connaît pas : les deux se comptent donc ensemble, et c'est juste —
    // dans les deux cas, le dessin ne sait pas ranger le nœud.
    const nom = domainLabel(texte(noeud.domaine));
    parDomaine.set(nom, (parDomaine.get(nom) ?? 0) + 1);
  }
  const domaines = [...parDomaine.entries()]
    .map(([nom, combien]) => ({ nom, combien, part: part(combien, noeuds.length) }))
    .sort((a, b) => b.combien - a.combien || a.nom.localeCompare(b.nom, "fr"));

  // **Le plus lourd, s'il a un nom.** Un nœud sans sujet ni titre existe — une
  // règle dont la conclusion n'a pas été versée —, et le citer rendrait « ce qui
  // pèse le plus est «  » ». Mieux vaut ne rien dire que dire un vide.
  const leLourd = noeuds
    .filter((noeud) => texte(noeud?.sujet) || texte(noeud?.titre))
    .reduce((max, noeud) => ((noeud?.poids ?? 0) > (max?.poids ?? -1) ? noeud : max), null);

  return {
    selection: texte(selection),
    noeuds: noeuds.length,
    valeurs: {
      total: valeurs.length,
      socle: compte.socle ?? 0,
      rejouables: compte.rejouables ?? 0,
      opaques: compte.opaques ?? 0,
      auServeur: compte.auServeur ?? 0,
      familles: compte.familles ?? 0
    },
    regles: regles.length,
    liens: {
      total: liens.length,
      parUneRegle,
      sansRegle: liens.length - parUneRegle,
      partParUneRegle: part(parUneRegle, liens.length)
    },
    domaines,
    profondeur: Number(cerveau?.profondeur ?? 0),
    pasDeRaisonnement: Number(cerveau?.pasDeRaisonnement ?? 0),
    cycles: Array.isArray(cerveau?.cycles) ? cerveau.cycles.length : 0,
    isoles: Number(isoles) || 0,
    signales: Number(signales) || 0,
    reglesSansEntree: compte.reglesSansEntree ?? 0,
    conclusionsSansValeur: compte.conclusionsSansValeur ?? 0,
    // Les liens viennent-ils de lectures enregistrées, ou d'un rapprochement de
    // noms ? Un graphe deviné se commente autrement qu'un graphe mesuré.
    enregistres: cerveau?.enregistres === true,
    leNoeudLePlusLourd: leLourd
      ? { titre: texte(leLourd.sujet) || texte(leLourd.titre), poids: leLourd.poids ?? 0 }
      : null
  };
}

/* ── Le récit ────────────────────────────────────────────────────────────── */

/** « le sol, la structure et le climat », proprement lié. */
function enumerer(mots = []) {
  const propres = mots.map(texte).filter(Boolean);
  if (propres.length <= 1) return propres[0] ?? "";
  return `${propres.slice(0, -1).join(", ")} et ${propres[propres.length - 1]}`;
}

/**
 * De quoi ce projet est fait, d'après ses domaines.
 *
 * On ne nomme que ce qui pèse : sous un dixième du dessin, un domaine est du
 * bruit, et l'énumérer tous ferait une liste qu'on ne lit pas.
 */
function deQuoiCestFait(lecture) {
  const sansDomaine = domainLabel("");
  const notables = lecture.domaines.filter((d) => d.nom !== sansDomaine && (d.part ?? 0) >= 10);
  if (!notables.length) return "";

  const gros = notables[0];
  const suite = notables.slice(1, 3).map((d) => d.nom);

  return suite.length
    ? `Ce projet-ci penche vers **${gros.nom}** — ${gros.part} % du dessin —, puis ${enumerer(suite)}.`
    : `Ce projet-ci est presque tout entier **${gros.nom}** : ${gros.part} % du dessin.`;
}

/**
 * Ce que disent les liens, et pourquoi le bleu vaut mieux que l'orange.
 *
 * C'est le passage qui compte. Un lien orange n'est pas une erreur : c'est une
 * dépendance que le projet connaît sans savoir la refaire — un agent l'a
 * déduite, ou elle vient d'un rapprochement de noms. La conséquence est
 * concrète et coûteuse : **changer l'amont ne recalcule pas l'aval**. Il faut
 * rouvrir l'agent, relancer, reverser. Un lien bleu, lui, passe par une règle
 * enregistrée : le projet sait la rejouer, donc une variante propage.
 */
function ceQueDisentLesLiens(lecture) {
  const { total, sansRegle, partParUneRegle } = lecture.liens;
  if (!total) {
    return "Aucun lien n'est dessiné : les affirmations de ce projet ne se tiennent pas "
      + "encore les unes aux autres. Rien ne se propage, donc rien ne se rejoue.";
  }

  const grammaire = "Un **lien bleu** passe par une règle du projet : il se rejoue, donc "
    + "une valeur qu'on change en amont recalcule ce qui en découle. Un **lien orange** ne "
    + "passe par aucune règle — un agent l'a déduit, ou il vient d'un rapprochement de noms. "
    + "La dépendance est connue, mais elle ne se refait pas toute seule : il faut rouvrir "
    + "l'agent, relancer, reverser. C'est pour cela qu'un dessin plus bleu vaut mieux : "
    + "ce n'est pas plus joli, c'est plus **rejouable**.";

  if (sansRegle === 0) {
    return `Les ${total} liens passent tous par une règle du projet : le dessin est entièrement `
      + `bleu. ${grammaire} Ici, tout ce qui dépend de quelque chose sait se recalculer.`;
  }

  if (partParUneRegle === 0) {
    return `Aucun des ${total} liens ne passe par une règle : le dessin est entièrement orange. `
      + `${grammaire} Ici, rien ne se rejoue encore — les dépendances sont connues, pas `
      + `automatisées.`;
  }

  return `Sur ${total} liens, ${lecture.liens.parUneRegle} passent par une règle du projet `
    + `(${partParUneRegle} %) et ${sansRegle} ${accorde(sansRegle, "reste orange", "restent orange")}. `
    + `${grammaire}`;
}

/** Ce que les formes veulent dire. La grammaire, citée, jamais paraphrasée. */
function laGrammaireDesFormes(lecture) {
  const formes = "Chaque **rond** est une affirmation : une valeur que ce projet tient pour "
    + "vraie. Sa taille dit son poids — combien de raisonnements passent par elle —, et sa "
    + "forme dit sa nature : plein pour le socle (on le change, rien ne se recalcule), cerclé "
    + "pour ce qui se rejoue, creux pour l'opaque (on sait qu'il dépend, pas le refaire). "
    + "Chaque **cube** est une règle appliquée, posée entre ses entrées et sa conclusion ; "
    + "ses crans disent sa complexité, qui n'est pas son poids — une règle compliquée dont "
    + "rien ne dépend est un coût, une règle simple dont tout dépend est un risque.";

  if (!lecture.regles) {
    return `${formes}\n\nCe projet ne dessine **aucun cube** : rien n'y est encore écrit `
      + `comme une règle rejouable. C'est ce qui manque pour que les chaînes deviennent bleues.`;
  }

  return formes;
}

/** Ce qui est rouge, et ce que le rouge ne dit pas. */
function ceQuiEstSignale(lecture) {
  if (!lecture.signales) return "";
  return `${lecture.signales} ${accorde(lecture.signales, "nœud est signalé", "nœuds sont signalés")} `
    + `en rouge. Le rouge est **hors de l'échelle de chaleur** : il ne dit pas que c'est chaud, `
    + `il dit que l'audit a relevé quelque chose — un doublon, une contradiction, une portée `
    + `douteuse.`;
}

/** Ce qui pend, et qu'il vaut mieux dire que taire (règle 5). */
function ceQuiPend(lecture) {
  const bouts = [];

  if (lecture.isoles) {
    bouts.push(`${lecture.isoles} ${accorde(lecture.isoles, "nœud ne touche", "nœuds ne touchent")} `
      + `à rien : ${accorde(lecture.isoles, "affirmation qui ne sert", "affirmations qui ne servent")} `
      + `à rien et dont rien ne dépend.`);
  }
  if (lecture.reglesSansEntree) {
    bouts.push(`${lecture.reglesSansEntree} ${accorde(lecture.reglesSansEntree, "règle pend", "règles pendent")} `
      + `sans entrée enregistrée : on voit ce qu'elles concluent, jamais ce qu'elles ont lu.`);
  }
  if (lecture.conclusionsSansValeur) {
    bouts.push(`${lecture.conclusionsSansValeur} ${accorde(lecture.conclusionsSansValeur, "conclusion n'a", "conclusions n'ont")} `
      + `aucune valeur en mémoire : elle n'existe que dans la règle qui l'établit, donc elle ne `
      + `se compare pas d'une version à l'autre.`);
  }
  if (lecture.cycles) {
    bouts.push(`${lecture.cycles} ${accorde(lecture.cycles, "chaîne se lit", "chaînes se lisent")} `
      + `en rond : la profondeur affichée les traverse une fois et s'arrête.`);
  }

  if (!bouts.length) return "";
  return `**Ce qui pend.** ${bouts.join(" ")}`;
}

/**
 * Le cerveau, raconté.
 *
 * Le texte est **générique dans sa forme et exact dans son contenu** : les
 * phrases sont écrites une fois, les nombres viennent du projet. Un projet de
 * sismique et un projet d'incendie ne lisent donc pas la même chose, sans qu'on
 * ait eu à écrire deux textes qui divergeraient.
 *
 * @param {object} lecture ce que rend `lireLeCerveau`
 * @returns {string} du markdown
 */
export function raconterLeCerveau(lecture = {}) {
  const lu = { ...lireLeCerveau({}), ...lecture };

  if (!lu.noeuds) {
    return lu.selection
      ? `Rien à dessiner : aucune affirmation ne répond à ${lu.selection}.`
      : "Ce projet ne porte encore aucune affirmation : il n'y a pas de raisonnement à montrer.";
  }

  const ouverture = lu.selection
    ? `Voici le raisonnement de ce projet, **restreint à ${lu.selection}**, tel que le cerveau le dessine.`
    : "Voici le raisonnement de ce projet, tel que le cerveau le dessine.";

  const volume = `Il porte **${lu.valeurs.total} ${accorde(lu.valeurs.total, "affirmation", "affirmations")}** `
    + `et **${lu.regles} ${accorde(lu.regles, "règle", "règles")}**, reliées par `
    + `${lu.liens.total} ${accorde(lu.liens.total, "lien", "liens")}. `
    + `La plus longue chaîne fait ${lu.profondeur} ${accorde(lu.profondeur, "pas", "pas")}`
    + `${lu.leNoeudLePlusLourd ? `, et ce qui pèse le plus est « ${lu.leNoeudLePlusLourd.titre} »` : ""}.`;

  const rejouable = lu.valeurs.opaques
    ? `${lu.valeurs.socle} ${accorde(lu.valeurs.socle, "valeur est", "valeurs sont")} du socle, `
      + `${lu.valeurs.rejouables} se ${accorde(lu.valeurs.rejouables, "rejoue", "rejouent")}, `
      + `${lu.valeurs.opaques} ${accorde(lu.valeurs.opaques, "reste opaque", "restent opaques")}`
      + `${lu.valeurs.auServeur ? ` — dont ${lu.valeurs.auServeur} que le serveur sait tout de même recalculer` : ""}.`
    : "";

  const provenance = lu.enregistres
    ? "Les liens viennent de **lectures enregistrées** : ce qui est dessiné a été mesuré, pas deviné."
    : "Les liens viennent d'un **rapprochement de noms**, faute de lectures enregistrées : la forme "
      + "générale est juste, le détail est à prendre avec précaution.";

  return [
    ouverture,
    volume,
    rejouable,
    deQuoiCestFait(lu),
    "",
    laGrammaireDesFormes(lu),
    "",
    ceQueDisentLesLiens(lu),
    ceQuiEstSignale(lu),
    provenance,
    ceQuiPend(lu)
  ].filter((bout) => texte(bout) !== "" || bout === "").join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}
