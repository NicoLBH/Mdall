/**
 * Ce qu'un brouillon de Mdall **propose** au projet.
 *
 * ## Rien n'entre directement, et c'est tout l'objet
 *
 * > « On ne doit RIEN verser DIRECTEMENT dans la mémoire, JAMAIS ! »
 *
 * Le bac d'essai n'écrit nulle part : un `enregistre` y dit « ceci irait dans
 * `vent.ctr` » et n'y va pas. Le seul chemin vers le projet est celui de tout
 * le monde — une **proposition**, relue ligne à ligne et signée
 * (`docs/fondamentaux.md`, règle 1). Ce module prépare ; quelqu'un signe.
 *
 * Il n'écrit rien, ne lit ni la base ni le store : du texte Mdall entre, des
 * affirmations sortent.
 *
 * ## C'est l'inverse exact de `memoire-en-texte.js`
 *
 * L'un écrit une affirmation en Mdall, l'autre relit du Mdall en affirmations.
 * Et il le fait avec **le lecteur du projet**, `lireUnFichier` : écrire un
 * second analyseur ici donnerait deux grammaires du même langage, et celle
 * qu'on ne relit pas aurait raison le jour où le brouillon propose autre chose
 * que ce que l'écran affiche (règle 4).
 *
 * ## Ce qui ne se propose pas se **nomme**
 *
 * Une ligne que la lecture refuse, un nom déclaré que rien ne renseigne, un
 * bloc sans valeur : rien de tout cela ne devient une affirmation. Les laisser
 * disparaître ferait croire que le brouillon entier est parti — et l'on ne s'en
 * apercevrait qu'en cherchant, six mois plus tard, une règle qu'on croyait
 * avoir posée. Chacun ressort donc dans `sansRetour`, avec sa raison (règle 5).
 */

import { NATURE } from "./assertion-taxonomy.js";
import { PROVENANCE, STATUT } from "./memoire-en-texte.js";
import { EXTENSIONS } from "./memoire-rangement.js";
import { lireUnFichier } from "./memoire-en-lecture.js";
import { extensionDuNom } from "./brouillon-mdall.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** D'où vient tout ce qu'un brouillon propose. Écrit une fois, lu partout. */
export const ATELIER = "Écrire en Mdall";

/** Ce qui empêche une ligne du brouillon de devenir une affirmation. */
export const ECARTE = {
  /** La lecture du projet n'a pas su lire cette ligne. */
  ILLISIBLE: "illisible",
  /** Un bloc qui nomme quelque chose sans rien en dire. */
  SANS_VALEUR: "sans-valeur",
  /** Un nom déclaré, que rien dans le brouillon ne renseigne. */
  NOM_SANS_VALEUR: "nom-sans-valeur"
};

export const PHRASES_DE_LECART = {
  [ECARTE.ILLISIBLE]: "cette ligne ne se lit pas : elle ne peut pas être proposée",
  [ECARTE.SANS_VALEUR]: "ce nom ne dit rien : une affirmation sans valeur n'affirme rien",
  [ECARTE.NOM_SANS_VALEUR]:
    "ce nom est déclaré et n'a pas de valeur ici : une déclaration explique, elle n'affirme rien"
};

/**
 * La nature que porte un fichier, d'après son extension.
 *
 * **Elle se déduit du rangement du projet, pas d'une seconde table.** Un
 * `.ddb` porte des données de base, un `.hyp` des hypothèses : c'est
 * `memoire-rangement.js` qui le dit, et le redire ici ferait deux réponses à la
 * même question (règle 4).
 *
 * `null` pour un `.ref` : aucune nature ne se range dans ce fichier-là, parce
 * qu'une règle n'a pas de nature — elle en produit une. **Le dire ici en plus
 * de la boucle ferait deux réponses à la même question** (règle 4) : le jour où
 * une nature se rangerait dans un `.ref`, la seconde réponse aurait tort sans
 * que rien ne le dise.
 */
export function natureDuFichier(nom) {
  // Pas de garde au-dessus : un nom hors du langage rend une extension vide,
  // qu'aucune nature ne porte, et la boucle répond `null` toute seule. Une
  // garde qu'aucun cas ne peut atteindre est une intention (règle 12).
  const extension = extensionDuNom(nom);

  for (const [nature, sienne] of Object.entries(EXTENSIONS)) {
    if (sienne === extension) return nature;
  }
  return null;
}

/** Les noms déclarés du brouillon, par nom, pour ce qu'ils expliquent. */
function declarationsParNom(fichiers = []) {
  const par = new Map();

  for (const fichier of Array.isArray(fichiers) ? fichiers : []) {
    for (const declaration of lireUnFichier(fichier?.contenu ?? "").declarations ?? []) {
      const nom = texte(declaration?.nom);
      // La première gagne : deux déclarations d'un même nom sont une erreur du
      // brouillon, et la vérification la dit déjà. En choisir une au hasard ici
      // ferait dépendre ce que le projet garde de l'ordre des onglets.
      if (nom && !par.has(nom)) par.set(nom, declaration);
    }
  }

  return par;
}

/**
 * L'état d'un raisonnement écrit dans un bac d'essai.
 *
 * **« Supposé » par défaut, et la même réponse pour une règle que pour une
 * valeur.** Ce qui sort du brouillon n'a été vérifié par personne : le donner
 * pour acquis ferait entrer au projet, sous le même mot que ce qui a été relu
 * et signé, ce que quelqu'un vient de taper pour essayer. Le brouillon qui
 * **écrit** son statut a le dernier mot — c'est lui qui sait, pas nous.
 */
function statutDuBloc(bloc) {
  const ecrit = texte(bloc?.statut);
  return ecrit || STATUT.SUPPOSE;
}

/**
 * Un bloc lu, devenu une affirmation.
 *
 * **La règle et la donnée ne se proposent pas pareil**, et la différence n'est
 * pas de présentation : une règle porte `referentiel: true`, ce qui lui donne
 * une clé à elle (`regle:…`). Sans cela, la règle et la valeur qu'elle conclut
 * partageraient la même clé, et verser l'une périmerait l'autre — la règle
 * effacerait sa propre conclusion.
 */
function affirmationDuBloc(bloc, { nature, declaration, marque = null }) {
  const conditions = Array.isArray(bloc?.conditions) ? bloc.conditions : [];
  const raisonne = conditions.length > 0 || Boolean(bloc?.agent);

  const commun = {
    sujet: texte(bloc?.sujet),
    // Ce que la déclaration explique du nom : à quoi il sert, ce qu'il désigne.
    // Sans eux, un projet de douze mille noms devient un projet où chacun
    // recrée le sien plutôt que de chercher celui qui existe.
    quoi: texte(declaration?.description),
    utilisation: texte(declaration?.utilisation),
    // La portée telle que le fichier la porte. Vide veut dire « partout » :
    // c'est une portée, pas une absence de réponse.
    zones: texte(bloc?.zone) ? [texte(bloc.zone)] : [],
    atelier: ATELIER,
    // `null` pour un brouillon anonyme, et pour une ligne reprise puis
    // modifiée : elle n'est plus celle de la version qu'elle nommerait.
    etabli: marque
  };

  if (raisonne) {
    return {
      ...commun,
      // Ce que la règle conclut. Elle le porte une fois : l'écriture le remet
      // sur la ligne `alors`, et une valeur écrite à deux endroits diverge.
      valeur: texte(bloc?.alors),
      referentiel: true,
      regle: { conditions, sinon: texte(bloc?.sinon), sauf: Array.isArray(bloc?.sauf) ? bloc.sauf : [] },
      ...(bloc?.agent ? { agent: { genre: texte(bloc.agent), utilitaire: texte(bloc.utilitaire) } } : {}),
      ...(texte(bloc?.utilitaire) ? { utilitaire: texte(bloc.utilitaire) } : {}),
      // Une règle n'a pas de nature : elle en produit une.
      nature: null,
      provenance: bloc?.provenance ?? { type: PROVENANCE.DECISION, quoi: ATELIER },
      citation: texte(bloc?.preuve),
      statut: statutDuBloc(bloc)
    };
  }

  return {
    ...commun,
    // L'unité colle à la valeur : « 890 » et « 890 m » ne se relisent pas
    // pareil, et c'est la seconde que la mémoire doit porter.
    valeur: texte(bloc?.unite) ? `${texte(bloc?.valeur)} ${texte(bloc.unite)}` : texte(bloc?.valeur),
    nature: nature || NATURE.DONNEE_BASE,
    /**
     * D'où elle vient.
     *
     * **Une provenance absente ne s'invente pas.** Le brouillon a été écrit à
     * la main, dans le bac d'essai : c'est une décision, et elle porte le nom
     * de l'écran plutôt qu'un document que personne n'a cité (règle 5).
     */
    provenance: bloc?.provenance ?? { type: PROVENANCE.DECISION, quoi: ATELIER },
    citation: texte(bloc?.preuve),
    statut: statutDuBloc(bloc)
  };
}

/**
 * Ce qu'un brouillon donne à proposer, et ce qu'il ne peut pas.
 *
 * @param {{nom: string, contenu: string}[]} fichiers
 * @returns {{affirmations: object[], sansRetour: {quoi: string, motif: string,
 *   dit: string, fichier: string, ligne: number}[]}}
 */
export function aProposerDuBrouillon(fichiers = [], { venue = null } = {}) {
  const declarations = declarationsParNom(fichiers);
  // **La marque de l'établi, posée sur chaque ligne.** Elle voyage avec elles :
  // la proposition passe, les lignes restent, et c'est dans la mémoire du
  // projet qu'on voudra savoir plus tard de quel outil elles venaient.
  const marque = marqueDeLetabli(venue);
  const affirmations = [];
  const sansRetour = [];
  const renseignes = new Set();

  for (const fichier of Array.isArray(fichiers) ? fichiers : []) {
    const nom = texte(fichier?.nom);
    const nature = natureDuFichier(nom);
    const lu = lireUnFichier(fichier?.contenu ?? "");

    for (const refus of lu.refus ?? []) {
      sansRetour.push({
        quoi: texte(refus?.texte),
        motif: ECARTE.ILLISIBLE,
        // **La raison du lecteur, pas la nôtre.** Il sait pourquoi il a refusé
        // — « ceci n'est pas une provenance connue » — et la remplacer par une
        // phrase générale ferait chercher longtemps ce qu'il avait déjà dit.
        dit: texte(refus?.raison),
        fichier: nom,
        ligne: Number(refus?.ligne) || 0
      });
    }

    for (const bloc of lu.blocs ?? []) {
      const sujet = texte(bloc?.sujet);
      if (!sujet) continue;

      const affirmation = affirmationDuBloc(bloc, {
        nature, declaration: declarations.get(sujet), marque
      });

      // Un bloc qui nomme sans rien dire n'entre pas : la proposition porterait
      // une ligne vide, que personne ne saurait relire ni refuser. C'est aussi
      // ce que devient une phrase en français qu'on a oublié de coder.
      if (!texte(affirmation.valeur)) {
        sansRetour.push({
          quoi: sujet, motif: ECARTE.SANS_VALEUR, dit: "",
          fichier: nom, ligne: Number(bloc?.ligne) || 0
        });
        continue;
      }

      renseignes.add(sujet);
      affirmations.push(affirmation);
    }
  }

  // Un nom déclaré que rien ne renseigne — et il peut très bien servir : une
  // condition le lit. Mais une déclaration **explique** un nom, elle n'affirme
  // rien sur le projet, et la proposer donnerait à ce nom une valeur qu'il n'a
  // pas. On le dit plutôt que de le taire.
  for (const nom of declarations.keys()) {
    if (!renseignes.has(nom)) {
      sansRetour.push({ quoi: nom, motif: ECARTE.NOM_SANS_VALEUR, dit: "", fichier: "", ligne: 0 });
    }
  }

  return { affirmations, sansRetour };
}

/** Ce qu'on dit d'une ligne restée dehors : la raison du lecteur, ou la nôtre. */
export function phraseDeLEcart(ecart) {
  return texte(ecart?.dit) || PHRASES_DE_LECART[texte(ecart?.motif)] || "";
}

/**
 * La marque que chaque ligne emporte, quand elle vient d'un outil de l'établi.
 *
 * **Rien si le texte a bougé.** Une ligne reprise d'une `v2` puis modifiée
 * n'est pas la `v2` : la marquer ainsi ferait croire, six mois plus tard, que
 * le projet tient cette version-là — et la comparer à celle de l'établi ne
 * dirait rien de juste. C'est la même règle que la phrase de provenance, et
 * elle se décide sur la même réponse (règle 10).
 */
export function marqueDeLetabli(venue = null) {
  const nom = texte(venue?.nom);
  if (!nom || !texte(venue?.id) || venue?.modifie) return null;

  return { id: texte(venue.id), version: texte(venue.version) || "1", nom };
}

/**
 * D'où vient ce qu'on propose — la ligne qu'on relit sous la proposition.
 *
 * ## Pourquoi elle compte
 *
 * Une proposition issue d'un compte rendu dit de quel compte rendu ; une
 * proposition issue d'un fil de mails dit lequel. Une règle écrite à la main ne
 * disait rien : six mois plus tard, on lit « Couleur du volet = violet » dans
 * la mémoire sans savoir si quelqu'un l'a tapée un jeudi soir ou si elle sort
 * d'un outil qu'on réemploie de projet en projet.
 *
 * ## Le piège qu'elle évite
 *
 * On reprend la `v2` d'un utilitaire, **on modifie le texte**, on propose. Dire
 * « v2 » serait faux : ce qui entre dans le projet n'est pas la `v2`, et la
 * comparer plus tard à celle de l'établi ne dirait rien de juste. On le dit
 * donc : repris de la `v2`, et modifié depuis.
 *
 * ## Ce qu'elle ne dit pas
 *
 * **Le reste de l'établi.** Proposer un outil, c'est partager cet outil-là ;
 * cela ne dit rien des autres, ni de ce qu'on garde pour soi.
 *
 * @param {{nom?: string, version?: string|number, modifie?: boolean}|null} utilitaire
 */
export function sourceDuBrouillon(utilitaire = null) {
  const nom = texte(utilitaire?.nom);
  if (!nom) return ATELIER;

  const version = texte(utilitaire?.version) || "1";
  const depuis = utilitaire?.modifie ? ", repris et modifié depuis" : "";
  return `${ATELIER} · utilitaire « ${nom} » v${version}${depuis}`;
}

/** Le titre de la proposition qu'un brouillon ouvre. */
export function titreDeLaProposition(affirmations = [], utilitaire = null) {
  const tous = Array.isArray(affirmations) ? affirmations : [];
  if (!tous.length) return "";

  // **Le nom de l'outil passe devant**, quand il y en a un : dans une liste de
  // propositions, « 3 lignes écrites en Mdall » ne distingue pas deux outils
  // proposés le même jour.
  const nom = texte(utilitaire?.nom);
  if (nom) return `« ${nom} », écrit en Mdall`;

  return tous.length === 1
    ? `« ${tous[0].sujet} », écrit en Mdall`
    : `${tous.length} lignes écrites en Mdall`;
}

/** Ce que la proposition dit d'elle-même, avant qu'on la lise. */
export function introDeLaProposition(affirmations = [], utilitaire = null) {
  const tous = Array.isArray(affirmations) ? affirmations : [];
  const regles = tous.filter((une) => une.referentiel === true).length;
  const valeurs = tous.length - regles;

  const dits = [];
  if (valeurs) dits.push(`${valeurs} ${valeurs > 1 ? "valeurs" : "valeur"}`);
  if (regles) dits.push(`${regles} ${regles > 1 ? "règles" : "règle"}`);

  const nom = texte(utilitaire?.nom);
  const venu = nom
    ? ` Elles viennent de l'utilitaire « ${nom} » (v${texte(utilitaire?.version) || "1"}${
      utilitaire?.modifie ? ", modifié depuis" : ""}), écrit à la main et gardé hors de tout projet.`
    : "";

  return `${dits.join(" et ")} écrites dans le bac d'essai « Écrire en Mdall ».${venu} `
    + "Rien n'est entré dans la mémoire du projet : cette proposition n'écrit que si elle est signée.";
}

/** Ce que le bouton « Proposer au projet » dit, à chaque instant. */
export function phraseDeLaProposition({ affirmations = [], sansRetour = [] } = {}) {
  const tous = Array.isArray(affirmations) ? affirmations : [];
  const ecartes = Array.isArray(sansRetour) ? sansRetour.length : 0;

  if (!tous.length) {
    return ecartes
      ? "Rien à proposer : aucune ligne du brouillon n'affirme quelque chose sur le projet."
      : "Rien à proposer : le brouillon est vide.";
  }

  const dit = tous.length === 1 ? "1 ligne à proposer" : `${tous.length} lignes à proposer`;
  // **Ce qui reste dehors se dit ici, pas après.** L'apprendre une fois la
  // proposition ouverte reviendrait à l'apprendre trop tard.
  if (!ecartes) return `${dit}. Rien n'entre sans signature.`;
  return ecartes > 1
    ? `${dit} — ${ecartes} restent dehors, et le brouillon les garde.`
    : `${dit} — 1 reste dehors, et le brouillon la garde.`;
}
