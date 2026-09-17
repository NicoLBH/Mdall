/**
 * Ce qu'une étude incendie propose à la mémoire du projet.
 *
 * ## Elle ne verse rien
 *
 * Ce fichier s'appelait « versement » quand l'écran écrivait directement dans
 * la mémoire. Il ne le fait plus, et ne le fera plus : **rien n'entre jamais
 * directement dans la mémoire du projet** (voir `docs/fondamentaux.md`). Ce qui
 * sort d'un utilitaire passe par un sujet — pour en débattre — ou par une
 * proposition — que quelqu'un signe.
 *
 * Ce qui reste ici est le **choix** : quelles conclusions partiront, sur quelle
 * portée, et ce que la mémoire en dit déjà.
 *
 * ## Pourquoi montrer la mémoire avant de transformer
 *
 * Une proposition confronte de toute façon ses lignes à ce que le projet a
 * décidé — c'est son travail. Mais on n'a pas envie de le découvrir à la
 * signature : voir tout de suite qu'une conclusion contredit ce qui est en
 * mémoire, c'est souvent la raison d'ouvrir un sujet plutôt qu'une proposition.
 *
 * ## Ce qui ne part pas
 *
 * Un « sans objet » n'affirme rien sur l'ouvrage : « aucune circulation
 * horizontale protégée n'est exigée » n'est pas un degré à respecter, c'est
 * l'absence d'exigence.
 *
 * Les **reformulations du cas** non plus. Le référentiel conclut sur cent
 * quatre points, et « le bâtiment comporte un sous-sol » ou « le classement
 * retient trois étages » en font partie : il les écrit parce que la suite en
 * dépend, mais elles ne demandent rien à personne. C'est le référentiel qui
 * marque la différence, module par module — la deviner à la forme de la
 * question serait faux quelque part sans qu'on sache où.
 */
import { normalizeSubjectKey } from "./project-memory.js";
import { currentAssertions } from "./project-memory.js";
import { zonesOf } from "./project-zones.js";
import { DOMAIN, NATURE } from "./assertion-taxonomy.js";
import { sourceDuModule, regleDuModule } from "./incendie-en-texte.js";
import { PROVENANCE, STATUT } from "./memoire-en-texte.js";
import {
  DECLARATION_REGIME_INCENDIE, SUJET_REGIME_INCENDIE, regimeDuChampDeLArrete, regimeIncendieDe
} from "../../vendor/utilitaires/regime-incendie.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les conclusions qu'on peut verser.
 *
 * Celles qui ont conclu **et** qui disent quelque chose. Un module en attente
 * n'a pas de valeur ; un « sans objet » en a une qui n'affirme rien.
 */
export function conclusionsVersables(vue) {
  const modules = Array.isArray(vue?.modules) ? vue.modules : [];

  return modules
    .filter((module) => module?.statut === "conclu" && module.exigence === true && !module.sansObjet
      && module.valeur !== null && module.valeur !== undefined && texte(module.valeur) !== "")
    .map((module) => ({
      id: texte(module.id),
      sujet: texte(module.titre),
      valeur: texte(module.valeur),
      mention: texte(module.mention),
      article: texte(module.pourquoi?.article
        ? `article ${module.pourquoi.article}${module.pourquoi.paragraphe ? `, ${module.pourquoi.paragraphe}` : ""}`
        : module.article ? `article ${module.article}` : ""),
      citation: texte(module.pourquoi?.citation),
      // D'où la valeur sort : de la **règle** du référentiel, qui porte ses
      // conditions et son article. La ligne dit laquelle, et c'est par là qu'on
      // remonte au texte.
      provenance: {
        type: PROVENANCE.REGLE,
        quoi: [texte(module.titre), sourceDuModule(module, texte(vue?.texteDeReference?.source))]
          .filter(Boolean).join(" — ")
      },
      statut: STATUT.RETENU,
      // Et la règle elle-même, pour que la proposition l'emporte à côté de la
      // valeur. Voir `reglesVersables` : sans elle, le renvoi ci-dessus
      // pointerait vers rien.
      regle: regleDuModule(module, texte(vue?.texteDeReference?.source) || "arrêté du 31 janvier 1986 modifié")
    }))
    .filter((conclusion) => conclusion.sujet && conclusion.valeur);
}

/**
 * Les règles appliquées, prêtes à partir avec les valeurs qu'elles produisent.
 *
 * ## Pourquoi elles partent, alors qu'elles ne sont pas des faits du projet
 *
 * Une contrainte versée dit « ← règle Classement du bâtiment ». Si la règle
 * n'est nulle part dans le projet, trois choses cassent :
 *
 * - le renvoi pointe vers rien, et l'on ne peut plus relire ce qui a décidé ;
 * - le graphe des dépendances ne se reconstruit pas, donc « la hauteur change,
 *   qu'est-ce qui tombe ? » reste sans réponse ;
 * - six mois plus tard l'arrêté aura peut-être bougé. Un renvoi vers un corpus
 *   **vivant** réécrirait l'histoire en silence, alors que ce qui a été décidé
 *   se conserve.
 *
 * Le projet garde donc un **instantané** des règles qu'il a appliquées. Ce
 * n'est pas le corpus : les cent quatre modules, leur ordre, les branches non
 * prises et le catalogue des questions restent au serveur. C'est la quarantaine
 * de règles qui ont servi à ce bâtiment-ci, et c'est ce que le client a payé.
 *
 * Elles se rangent dans « Référentiels », jamais avec les contraintes : le
 * texte n'a pas été décidé ici.
 */
export function reglesVersables(conclusions = [], zone = "") {
  const portee = texte(zone) ? [texte(zone)] : [];

  return (Array.isArray(conclusions) ? conclusions : [])
    .filter((conclusion) => conclusion?.regle)
    .map((conclusion) => ({
      sujet: conclusion.regle.sujet,
      // Ce que la règle conclut. `payload.value` le porte, et l'écriture le
      // remet sur la ligne `alors` : une valeur écrite à deux endroits finit
      // par diverger.
      valeur: conclusion.regle.alors,
      referentiel: true,
      regle: { conditions: conclusion.regle.conditions, sinon: "", sauf: [] },
      nature: null,
      domaine: DOMAIN.INCENDIE,
      provenance: conclusion.regle.provenance,
      citation: conclusion.regle.preuve,
      reference: `regle:${conclusion.id}`,
      // Une règle **appliquée** dépend de la zone. Le texte de l'arrêté est
      // universel ; l'escalier A classé en 3ᵉ famille B et l'escalier B classé
      // en 2ᵉ famille ne suivent pas les mêmes articles. Sans la portée, les
      // règles des deux escaliers se mélangeraient dans un seul fichier, et la
      // seconde étude périmerait la première.
      zones: portee,
      atelier: "Incendie — Habitation"
    }));
}

/**
 * Le régime de sécurité incendie, versé depuis le champ d'application.
 *
 * ## Pourquoi c'est cette valeur-là, et pas le classement
 *
 * L'article 1er de l'arrêté tranche **avant** la famille : plancher bas du
 * logement le plus haut à 50 m au plus, l'arrêté s'applique ; au-delà, c'est un
 * immeuble de grande hauteur et ce sont d'autres textes. C'est une
 * qualification, elle est justifiée par un article, et elle est **en amont** du
 * classement.
 *
 * Le classement, lui, est la *sortie* du référentiel : il le présuppose.
 * L'employer pour choisir le référentiel reviendrait à demander à la conclusion
 * de désigner la prémisse.
 *
 * ## À quoi elle servira
 *
 * À ce que le Copilote n'ait plus à deviner quel agent incendie appeler. Tant
 * qu'il n'y en a qu'un, ce versement n'est qu'une ligne de plus en mémoire ;
 * c'est voulu — il enrichit le projet avant que le routage n'existe, et le jour
 * où l'agent ERP arrive, les projets déjà étudiés portent leur régime.
 *
 * @param {object} vue ce que le référentiel a conclu
 * @param {string} zone la portée retenue, vide pour l'ensemble
 * @returns {object[]} zéro ou une affirmation
 */
export function regimeVersable(vue, zone = "") {
  const champ = texte(vue?.faits?.dansLeChampDeLArrete);
  const regime = regimeDuChampDeLArrete(champ);
  // Un champ d'application qu'on n'a pas su lire ne se range pas au plus
  // proche : on ne sait pas, et le dire est la seule réponse honnête (règle 5).
  if (!regime) return [];

  const dit = regimeIncendieDe(regime);
  const source = texte(vue?.texteDeReference?.source) || "arrêté du 31 janvier 1986 modifié";

  return [{
    sujet: SUJET_REGIME_INCENDIE,
    valeur: regime,
    nature: NATURE.DONNEE_BASE,
    domaine: DOMAIN.INCENDIE,
    quoi: DECLARATION_REGIME_INCENDIE.quoi,
    utilisation: DECLARATION_REGIME_INCENDIE.utilisation,
    // Ce que l'article 1er a tranché, et le texte vers lequel il renvoie : sans
    // lui, « igh » serait un mot, et non une porte vers la bonne réglementation.
    source: dit?.texte ? `${source} — renvoie à ${dit.texte}` : source,
    article: "article 1er",
    provenance: { type: PROVENANCE.REGLE, quoi: `Champ d'application de l'arrêté — ${source}` },
    statut: STATUT.RETENU,
    reference: DECLARATION_REGIME_INCENDIE.reference,
    // **Par zone, comme le classement.** Un rez-de-chaussée commercial sous des
    // logements relève de deux régimes dans un seul ouvrage ; une variable posée
    // sans portée y répondrait faux la moitié du temps.
    zones: texte(zone) ? [texte(zone)] : [],
    atelier: "Incendie — Habitation"
  }];
}

/**
 * Le classement, versé comme la variable qu'il est.
 *
 * ## Ce qui manquait
 *
 * Une étude incendie sortait ses **exigences** — un degré coupe-feu, une
 * colonne sèche — et les règles qui les produisent. Le classement, lui, ne
 * sortait pas : il n'est pas une exigence, donc `conclusionsVersables` l'écarte.
 *
 * Or c'est **le** point sur lequel tout le reste pend. Trente contraintes
 * écrivaient « ← règle Classement du bâtiment » sans que le projet dise nulle
 * part en quelle famille ce bâtiment est classé. Le renvoi ne menait à rien, et
 * la seule façon de le savoir était de rouvrir l'agent — c'est-à-dire de
 * refaire l'étude.
 *
 * ## Pourquoi une donnée de base, et par zone
 *
 * C'est une **déclaration** : un nom posé une fois, cité partout ailleurs. Elle
 * se range donc avec les autres variables du projet, dans `Données de base`, et
 * non dans le dossier d'une discipline — la famille d'un bâtiment sert aussi à
 * l'accessibilité et à la notice, et la dupliquer par domaine la ferait
 * diverger (`docs/fondamentaux.md`, règle 4).
 *
 * La portée en fait partie : deux escaliers d'un même ouvrage peuvent être
 * classés différemment, et un classement posé sans zone périmerait l'autre.
 *
 * @param {object} vue ce que le référentiel a conclu
 * @param {string} zone la portée retenue, vide pour l'ensemble
 * @returns {object[]} zéro ou une affirmation
 */
export function donneesDeBaseVersables(vue, zone = "") {
  const classement = texte(vue?.faits?.classement);
  // Hors champ, le classement n'est pas une famille : « hors champ — IGH » dit
  // que ce référentiel ne s'applique pas. Le verser comme une valeur du projet
  // ferait entrer en mémoire une phrase qui n'affirme rien.
  // **Hors champ, le régime part quand même.** « Hors champ — IGH » ne dit rien
  // d'une famille, mais il dit tout d'un référentiel : c'est précisément le cas
  // où savoir de quel texte le bâtiment relève change la suite du travail.
  if (!classement || classement.toLowerCase().startsWith("hors champ")) {
    return regimeVersable(vue, zone);
  }

  const source = texte(vue?.texteDeReference?.source) || "arrêté du 31 janvier 1986 modifié";
  const portee = texte(zone) ? [texte(zone)] : [];

  return [...regimeVersable(vue, zone), {
    sujet: "Classement du bâtiment",
    valeur: classement,
    nature: NATURE.DONNEE_BASE,
    domaine: DOMAIN.INCENDIE,
    // Ce que le nom désigne, et ce à quoi il sert. Une variable qu'on ne sait
    // pas décrire se fait recréer plutôt que réutiliser — voir
    // `docs/langage-mdall.md`, « une déclaration doit être explicite ».
    quoi: "Famille de classement du bâtiment d'habitation au sens de l'article 3 de "
      + "l'arrêté du 31 janvier 1986 : 1re, 2e, 3e A, 3e B ou 4e famille.",
    utilisation: "Entrée de presque toutes les exigences de l'arrêté — degrés coupe-feu, "
      + "encloisonnement des escaliers, colonnes sèches, désenfumage. C'est le nom que le "
      + "reste du référentiel incendie cite.",
    source,
    article: "article 3",
    provenance: { type: PROVENANCE.REGLE, quoi: `Classement du bâtiment — ${source}` },
    statut: STATUT.RETENU,
    reference: "classement",
    zones: portee,
    atelier: "Incendie — Habitation"
  }];
}

/**
 * Les **déductions** du référentiel, versées comme des règles à part entière.
 *
 * ## Ce qui manquait
 *
 * « Blocs-portes des celliers = CF 1/2 h » dit d'où elle sort : de la règle du
 * même nom, qui commence par `importe (variable: Famille)`. Et là, le fil
 * s'arrêtait. **Comment la famille a-t-elle été calculée ?** Le projet ne le
 * disait nulle part : seules les règles qui posent une *exigence* partaient, et
 * le classement, la nature de l'habitation, le nombre d'étages retenu — tout
 * ce qui les produit — restait au serveur.
 *
 * On voyait donc la dernière fonction, jamais la chaîne. Or c'est la chaîne qui
 * sert : quand une valeur est fausse, ce qu'on cherche n'est pas *laquelle*,
 * c'est **à quelle étape** elle l'est devenue.
 *
 * ## Pourquoi ce ne sont pas des contraintes
 *
 * Une déduction n'exige rien de personne. « Le bâtiment est une habitation
 * collective » ne s'impose pas au projet : elle le décrit, et elle sert à
 * décider. Elle part donc dans le **référentiel**, avec les autres règles
 * appliquées, et non dans les contraintes — c'est exactement la distinction que
 * `EXIGENCES` porte, et elle ne bouge pas.
 *
 * Ce qui change est qu'on la **garde** au lieu de la jeter : sans elle, le
 * raisonnement s'arrête à sa première importation.
 *
 * @param {object} vue ce que le référentiel a conclu
 * @param {string} zone la portée retenue, vide pour l'ensemble
 */
export function deductionsVersables(vue, zone = "") {
  const modules = Array.isArray(vue?.modules) ? vue.modules : [];
  const source = texte(vue?.texteDeReference?.source) || "arrêté du 31 janvier 1986 modifié";
  const portee = texte(zone) ? [texte(zone)] : [];

  return modules
    // Les exigences partent déjà par `reglesVersables`, avec la valeur qu'elles
    // imposent. Les reprendre ici les verserait deux fois, et la base refuse
    // l'envoi entier sur un doublon de clé.
    .filter((module) => module?.exigence !== true)
    .filter((module) => texte(module?.statut) === "conclu" && !texte(module?.sansObjet))
    .filter((module) => texte(module?.valeur))
    // Sans condition, il n'y a pas de raisonnement à montrer : la valeur est
    // une lecture directe de la réponse, et la réponse part de son côté comme
    // donnée de base. Une carte « si rien alors x » n'apprendrait rien.
    .filter((module) => (module?.conditions ?? []).length > 0)
    .map((module) => ({
      sujet: texte(module.titre),
      valeur: texte(module.valeur),
      referentiel: true,
      regle: { conditions: module.conditions, sinon: "", sauf: [] },
      nature: null,
      domaine: DOMAIN.INCENDIE,
      provenance: { type: PROVENANCE.TEXTE, quoi: sourceDuModule(module, source) || source },
      citation: texte(module.pourquoi?.citation),
      reference: `regle:${texte(module.id)}`,
      zones: portee,
      atelier: "Incendie — Habitation"
    }))
    .filter((regle) => regle.sujet && regle.valeur);
}

/**
 * Ce que chaque déduction **conclut**, versé comme une valeur du projet.
 *
 * ## Ce qui manquait, et ce que ça coûtait
 *
 * Une déduction partait comme règle, et sa conclusion restait dans son bloc :
 * « Famille : 2 » n'existait nulle part ailleurs. Trois choses en découlaient,
 * toutes mauvaises.
 *
 * **L'audit ne la vérifiait pas.** Il relit les valeurs de la mémoire ; une
 * valeur qui n'y est pas ne se compare à rien, et une famille devenue fausse
 * parce que le nombre d'étages a changé passait sans un mot.
 *
 * **Rien ne s'y rattachait.** Pas de document source, pas de proposition, pas de
 * remplacement daté : on ne pouvait ni la contester, ni voir depuis quand elle
 * vaut ce qu'elle vaut.
 *
 * **Le raisonnement se coupait en deux.** Les quarante-neuf règles qui lisent
 * « Famille » ne trouvaient aucune affirmation de ce nom. `resoudre` sait
 * désormais remonter jusqu'à la règle, ce qui recolle le graphe — mais recoller
 * un graphe n'est pas la même chose qu'avoir la valeur. La valeur, elle, se lit,
 * se cite, se corrige et s'audite.
 *
 * ## Pourquoi la même valeur à deux endroits ne diverge pas ici
 *
 * La règle **et** sa conclusion sortent du même versement, du même module, au
 * même instant : `module.valeur` est lu une fois et écrit dans les deux lignes.
 * Ce n'est pas une copie qu'on entretient — c'est un instantané, comme la règle
 * elle-même en est un. Rejouer la règle plus tard produira une nouvelle valeur
 * qui remplacera celle-ci, datée, sans toucher à l'ancienne.
 *
 * ## Pourquoi une donnée de base
 *
 * Comme le classement, et pour la même raison : c'est un **nom posé une fois et
 * cité partout ailleurs**. Sa nature déduite se lit à ce qu'une règle du projet
 * la conclut — le cerveau la range en « rejouable » sans qu'on ait à l'écrire,
 * et l'écrire en dur ferait deux vérités pour une.
 *
 * @param {object} vue ce que le référentiel a conclu
 * @param {string} zone la portée retenue, vide pour l'ensemble
 */
export function conclusionsDesDeductions(vue, zone = "") {
  const source = texte(vue?.texteDeReference?.source) || "arrêté du 31 janvier 1986 modifié";
  const portee = texte(zone) ? [texte(zone)] : [];

  // Les mêmes déductions, exactement : une conclusion qui ne viendrait pas
  // d'une règle versée serait une valeur sans raisonnement, et l'on aurait
  // remplacé un trou par un autre.
  return deductionsVersables(vue, zone).map((regle) => ({
    sujet: regle.sujet,
    valeur: regle.valeur,
    nature: NATURE.DONNEE_BASE,
    domaine: DOMAIN.INCENDIE,
    quoi: `Conclusion de la règle « ${regle.sujet} », appliquée à cette étude.`,
    utilisation: "Citée par les règles qui la lisent en condition.",
    source,
    provenance: { type: PROVENANCE.REGLE, quoi: `${regle.sujet} — ${source}` },
    citation: regle.citation,
    statut: STATUT.RETENU,
    reference: regle.reference.replace(/^regle:/, ""),
    zones: portee,
    atelier: "Incendie — Habitation"
  }));
}

/**
 * Les réponses de l'étude, versées comme les données de base qu'elles sont.
 *
 * ## Là où la chaîne doit s'arrêter
 *
 * Une chaîne de raisonnement se remonte jusqu'à ce qu'il ne reste que des
 * données de base — c'est sa condition d'arrêt, et c'est ce qui la rend
 * vérifiable : au bout, on doit tomber sur des faits relevés, pas sur un trou.
 *
 * Les questions source sont exactement cela : ce qu'aucun module ne sait
 * déduire, ce que quelqu'un a constaté sur le terrain ou lu sur un plan. « Le
 * bâtiment comporte des logements superposés », « quatre étages sur
 * rez-de-chaussée ». Sans elles en mémoire, chaque chaîne finissait sur
 * « personne ne l'a versée » — ce qui est vrai, et c'est un défaut, pas une
 * fatalité.
 *
 * ## Le nom court, pas la question
 *
 * `sujet` quand la question en déclare un, `libelle` sinon : « Logements
 * superposés », et non « Le bâtiment comporte-t-il des logements superposés ? ».
 * C'est le nom que les règles citent — il doit se lire pareil des deux côtés,
 * sinon rien ne se raccorde.
 *
 * @param {object} vue ce que le référentiel a conclu
 * @param {string} zone la portée retenue, vide pour l'ensemble
 */
export function reponsesVersables(vue, zone = "") {
  const questions = Array.isArray(vue?.questionsRepondues) ? vue.questionsRepondues : [];
  const faits = vue?.faits ?? {};
  const portee = texte(zone) ? [texte(zone)] : [];

  return questions
    .map((question) => {
      const cle = texte(question?.cle);
      const sujet = texte(question?.sujet) || texte(question?.libelle);
      const valeur = valeurLisible(faits?.[cle], texte(question?.unite));
      if (!cle || !sujet || !valeur) return null;

      return {
        sujet,
        valeur,
        nature: NATURE.DONNEE_BASE,
        domaine: DOMAIN.INCENDIE,
        // Ce que le nom désigne : la question elle-même le dit mieux que nous.
        quoi: texte(question?.libelle) || sujet,
        utilisation: "Réponse d'étude : ce qu'aucune règle ne sait déduire, et sur quoi "
          + "le classement et les exigences de l'arrêté s'appuient.",
        // Quelqu'un a répondu : ce n'est ni un texte, ni un calcul, c'est un
        // constat assumé par celui qui a rempli l'étude. Le dire autrement
        // laisserait croire que l'arrêté en décide.
        provenance: { type: PROVENANCE.DECISION, quoi: "Étude incendie — habitation, réponse d'étude" },
        statut: STATUT.RETENU,
        reference: `reponse:${cle}`,
        zones: portee,
        atelier: "Incendie — Habitation"
      };
    })
    .filter(Boolean);
}

/**
 * Une réponse, telle qu'elle se relit.
 *
 * Oui / non plutôt que `true` / `false` — ce langage s'adresse à des
 * architectes, et c'est déjà la convention des conditions (`conditions.js`).
 * L'unité colle au nombre : « 4 » et « 4 m » ne se relisent pas pareil, et une
 * mesure sans unité oblige à rouvrir l'arrêté.
 */
function valeurLisible(brute, unite = "") {
  if (brute === true) return "oui";
  if (brute === false) return "non";
  if (brute === null || brute === undefined) return "";
  if (typeof brute === "number") return unite ? `${brute} ${unite}` : String(brute);

  const dit = texte(brute);
  if (!dit) return "";
  return unite && /^-?[0-9]+(?:[.,][0-9]+)?$/.test(dit) ? `${dit} ${unite}` : dit;
}

/** La clé sous laquelle une conclusion se range, portée comprise. */
export function cleDuVersement(conclusion, zone = "") {
  const base = normalizeSubjectKey(conclusion?.sujet ?? "");
  const portee = texte(zone);
  return portee ? `${base}@${portee}` : base;
}

/**
 * Ce que la mémoire dit déjà de chaque conclusion.
 *
 * Trois états, et ils n'appellent pas le même geste : `absente` s'ajoute,
 * `identique` ne sert à rien, `differente` mérite qu'on la regarde avant de
 * cliquer — c'est une correction, et corriger une contrainte veut dire qu'on a
 * calculé faux quelque part.
 */
export function etatDuVersement(conclusions = [], assertions = [], zone = "") {
  const enVigueur = currentAssertions(Array.isArray(assertions) ? assertions : []);
  const portee = texte(zone);

  // On compare **à portée égale** : le degré du bâtiment A ne dit rien de celui
  // du bâtiment B, et les confondre ferait périmer l'un par l'autre.
  const parCle = new Map();
  for (const assertion of enVigueur) {
    const cle = texte(assertion?.subject_key);
    if (!cle) continue;
    const portees = zonesOf(assertion);
    const sienne = portees.length ? portees.join("+") : "";
    if (sienne !== portee) continue;
    if (!parCle.has(cle)) parCle.set(cle, assertion);
  }

  return conclusions.map((conclusion) => {
    const cle = cleDuVersement(conclusion, portee);
    const deja = parCle.get(cle) ?? null;
    const valeurConnue = texte(deja?.payload?.value);

    return {
      ...conclusion,
      cle,
      deja,
      valeurConnue,
      etat: !deja ? "absente" : (valeurConnue === conclusion.valeur ? "identique" : "differente")
    };
  });
}

/**
 * Ce qui est coché quand le panneau s'ouvre.
 *
 * Ce que la mémoire ignore, et ce qu'elle dit autrement. Pas ce qu'elle porte
 * déjà à l'identique : proposer une ligne pour une valeur déjà décidée ferait
 * une proposition qui, une fois signée, remonterait à aujourd'hui une décision
 * d'il y a trois mois.
 */
export function retenuesParDefaut(lignes = []) {
  return new Set(lignes.filter((ligne) => ligne.etat !== "identique").map((ligne) => ligne.id));
}

/** Ce qu'une transformation emportera, en une phrase. */
export function phraseDuVersement(lignes = [], retenues = new Set()) {
  const prises = lignes.filter((ligne) => retenues.has(ligne.id));
  if (!prises.length) return "Rien à proposer : aucune conclusion retenue.";

  const neuves = prises.filter((ligne) => ligne.etat === "absente").length;
  const corrigees = prises.filter((ligne) => ligne.etat === "differente").length;
  const morceaux = [];
  if (neuves) morceaux.push(`${neuves} nouvelle${neuves > 1 ? "s" : ""}`);
  if (corrigees) morceaux.push(`${corrigees} qui corrige${corrigees > 1 ? "nt" : ""} la mémoire`);
  const reecrites = prises.length - neuves - corrigees;
  if (reecrites) morceaux.push(`${reecrites} réécrite${reecrites > 1 ? "s" : ""} à l'identique`);

  return `${prises.length} contrainte${prises.length > 1 ? "s" : ""} partiront — ${morceaux.join(", ")}.`;
}
