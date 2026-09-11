/**
 * De la matière d'Atelier à une proposition.
 *
 * ## Ce que ce fichier est, et ce qu'il n'est pas
 *
 * Il **prépare**. Il n'écrit rien dans la mémoire du projet, et aucun chemin
 * d'ici n'y mène — voir `docs/fondamentaux.md`, règle 1. Il assemble ce qu'un
 * utilitaire a produit en une proposition **ouverte**, que quelqu'un relira,
 * confrontera à ce que le projet a déjà décidé, et signera. Ou pas.
 *
 * C'est cette étape qui donne à la mémoire ce qu'une écriture directe lui
 * enlèverait : une histoire, un signataire, des conflits arbitrés avant l'entrée
 * plutôt que découverts après, et — le jour où on le construira — un retour en
 * arrière qui défait un acte au lieu d'effacer une ligne.
 *
 * ## La forme d'un item
 *
 * `item_type` est un texte libre en base ; on y met la **provenance** de
 * l'affirmation, comme les autres chemins de la mémoire : `base-datum`. La
 * nature réelle — contrainte, donnée de base — voyage dans le `payload`, et
 * c'est elle qui prime à la lecture (`classifyAssertion`).
 *
 * `item_key` est l'identité métier : le sujet, jamais la valeur. C'est ce qui
 * fait qu'une valeur nouvelle **remplace** l'ancienne au lieu de coexister avec
 * elle. La portée en fait partie — le degré du bâtiment A ne périme pas celui
 * du bâtiment B.
 */

import { normalizeSubjectKey } from "./project-memory.js";
import { normalizeZoneKey } from "./project-zones.js";
import { BASE_DATUM_KIND, NATURE } from "./assertion-taxonomy.js";
import { decisionRetenue } from "./decision-versement.js";
import { OPERATEURS, PROVENANCES, STATUTS, AGENT, AGENTS } from "./memoire-en-texte.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Une affirmation prête à être proposée.
 *
 * @typedef {object} AffirmationDAtelier
 * @property {string} sujet     « Degré coupe-feu des planchers »
 * @property {string} valeur    « CF 1/2 h »
 * @property {string} [nature]  contrainte, donnée de base…
 * @property {string} [domaine] incendie, structure…
 * @property {string} [source]  « arrêté du 31 janvier 1986 modifié »
 * @property {string} [article] « article 6, premier alinéa »
 * @property {string} [citation] la phrase du texte qui décide
 * @property {string} [quoi]      ce que ce nom désigne, en une phrase
 * @property {string} [utilisation] ce à quoi il sert, et selon quel texte
 * @property {string} [reference] l'identifiant stable côté utilitaire
 * @property {string[]} [zones] la portée, vide pour l'ensemble
 */

/**
 * La provenance qu'on garde : son type, et ce qu'elle désigne.
 *
 * Un type inconnu n'entre pas. La liste des six est fermée — texte, document,
 * calcul, règle, décision, hypothèse — parce que c'est elle qui dit **comment**
 * la valeur a été obtenue : un septième type inventé ici ne se relirait nulle
 * part, et l'écriture le rendrait comme une provenance qu'aucun écran ne sait
 * colorer.
 */
export function provenanceRetenue(provenance) {
  if (!provenance || typeof provenance !== "object") return null;

  const type = texte(provenance.type);
  const quoi = texte(provenance.quoi);
  if (!PROVENANCES.includes(type) || !quoi) return null;

  // Qui, et quand. Le langage sait les écrire depuis toujours — `décision
  // humaine assumée (…, par: X, le: d)` — et rien ne les lui donnait : ils
  // étaient perdus ici, à deux lignes de la base. Sans eux, une valeur tranchée
  // à la main se relit six mois plus tard comme un fait établi, et surtout on
  // ne peut plus demander à personne si son choix tient encore.
  //
  // Facultatifs, et l'absence ne se comble pas : une provenance sans nom reste
  // une provenance, et inventer un auteur serait pire que n'en nommer aucun.
  const par = texte(provenance.par);
  const le = texte(provenance.le);

  return { type, quoi, ...(par ? { par } : {}), ...(le ? { le } : {}) };
}

/**
 * Ce qu'on garde de l'agent qu'une fonction appelle.
 *
 * Son nom, sa version, ce qu'elle a lu et ce qu'elle a posé — et rien d'autre,
 * parce qu'il n'y a rien d'autre : son corps ne s'écrit pas, c'est tout le
 * propos. Voir `docs/fondamentaux.md`, règle 9.
 *
 * Ce qu'elle a **posé** se conserve alors que la mémoire portera aussi chaque
 * cote comme une affirmation. Ce n'est pas la même chose deux fois : les
 * affirmations disent ce que le projet retient aujourd'hui, cette liste dit ce
 * que **cet appel-là** a rendu. Le jour où l'une des cotes est corrigée à la
 * main, l'écart entre les deux est précisément ce qu'on veut voir.
 */
export function agentRetenu(agent) {
  if (!agent || typeof agent !== "object") return null;

  const utilitaire = texte(agent.utilitaire);
  if (!utilitaire) return null;
  const native = agent;

  return {
    // Déterministe par défaut : c'est ce qu'étaient tous les appels avant qu'un
    // second genre existe, et le supposer ne change rien pour eux.
    genre: AGENTS.includes(texte(agent.genre)) ? texte(agent.genre) : AGENT.D,
    utilitaire,
    version: texte(native.version) || null,
    lit: (Array.isArray(native.lit) ? native.lit : []).map(texte).filter(Boolean),
    // Ce qu'elle range : le **nom** de sa sortie. Pas sa valeur — la valeur est
    // dans le fichier où elle est rangée, et une valeur écrite à deux endroits
    // finit par diverger.
    ecrit: (Array.isArray(native.ecrit) ? native.ecrit : [])
      .map((sortie) => ({ sujet: texte(sortie?.sujet) }))
      .filter((sortie) => sortie.sujet)
  };
}

/**
 * Ce qu'un utilitaire déclare avoir lu, avec la valeur lue.
 *
 * On l'enregistre à la date de l'appel plutôt que de renvoyer au catalogue : le
 * jour où une V2 lira autre chose, cette ligne-ci doit continuer de dire ce que
 * la V1 a lu. Une lecture reconstruite depuis le catalogue décrirait l'outil
 * d'aujourd'hui, pas le calcul d'hier.
 */
export function lecturesRetenues(lectures) {
  const dites = (Array.isArray(lectures) ? lectures : [])
    .map((lecture) => ({ sujet: texte(lecture?.sujet), valeur: texte(lecture?.valeur) }))
    .filter((lecture) => lecture.sujet);
  return dites.length ? dites : null;
}

/**
 * Ce qu'on garde d'une règle : ses conditions, ce qu'elle pose, ce qui la borne.
 *
 * On ne stocke que ce que l'écriture Mdall rend. Le reste dormirait dans la
 * base sans jamais s'afficher, et finirait par diverger de ce qui s'affiche.
 *
 * `alors` n'y est pas : c'est ce que la règle conclut, que `payload.value` porte
 * déjà. Une valeur écrite à deux endroits finit par diverger — l'écriture la
 * reconstruit à la lecture, comme elle le fait pour une affirmation.
 *
 * Les dépendances non plus : elles sont les sujets des conditions, et les
 * recopier les laisserait diverger le jour où quelqu'un modifie la règle.
 */
export function regleRetenue(regle) {
  if (!regle || typeof regle !== "object") return null;

  const conditions = (Array.isArray(regle.conditions) ? regle.conditions : [])
    .map(conditionRetenue).filter(Boolean);
  const sauf = (Array.isArray(regle.sauf) ? regle.sauf : []).map(conditionRetenue).filter(Boolean);
  const sinon = texte(regle.sinon);

  if (!conditions.length && !sauf.length && !sinon) return null;
  return { conditions, sinon, sauf };
}

/** Une condition : un sujet, un comparateur connu, ce à quoi il compare. */
function conditionRetenue(condition) {
  if (!condition || typeof condition !== "object") return null;

  const sujet = texte(condition.sujet);
  if (!sujet) return null;

  const operateur = OPERATEURS.includes(texte(condition.operateur)) ? texte(condition.operateur) : "=";
  const valeur = (Array.isArray(condition.valeur) ? condition.valeur : [condition.valeur])
    .map(texte).filter(Boolean);

  return {
    sujet,
    operateur,
    valeur,
    unite: texte(condition.unite),
    logique: condition.logique === true,
    ...(texte(condition.joint) ? { joint: texte(condition.joint) } : {})
  };
}

/** La clé métier d'une affirmation, portée comprise. */
export function cleDAffirmation(affirmation) {
  // Une **définition de zone** a sa clé à elle, et c'est celle que le projet
  // porte déjà : `zone:batiment-a`. Deux raisons, et la seconde est la vraie.
  //
  // Une zone se nomme comme n'importe quoi d'autre — « Rez-de-chaussée » est un
  // sujet possible ailleurs —, et sans préfixe une définition périmerait une
  // valeur de même nom. Et surtout : redéfinir une zone, ou la retirer, doit
  // **périmer sa définition précédente**. Sans cette clé, les deux vaudraient à
  // la fois et le projet aurait deux découpages.
  if (affirmation?.zoneDefinition === true) {
    return `zone:${normalizeZoneKey(affirmation?.zoneKey ?? affirmation?.sujet ?? "")}`;
  }

  const base = normalizeSubjectKey(affirmation?.sujet ?? "");
  const portees = [...new Set((affirmation?.zones ?? []).map(normalizeZoneKey).filter(Boolean))].sort();
  const cle = portees.length ? `${base}@${portees.join("+")}` : base;

  // Une règle et la contrainte qu'elle produit portent le même sujet. Sans
  // préfixe, elles partageraient la même clé, et verser l'une périmerait
  // l'autre — la règle effacerait sa propre conclusion.
  if (affirmation?.referentiel === true) return `regle:${cle}`;

  // Une décision porte **le même sujet** que la valeur qu'elle fixe — c'est ce
  // qui permet de les relier par le nom. Sans préfixe elles partageraient un
  // `item_key`, et verser l'une supprimerait l'autre.
  if (affirmation?.nature === NATURE.DECISION) return `decision:${cle}`;

  return cle;
}

/**
 * Un sujet, un item — et le premier gagne.
 *
 * ## Pourquoi cette fonction existe
 *
 * La base tient `(proposition_id, item_type, item_key)` pour unique, et
 * l'écriture est un seul `INSERT … ON CONFLICT`. Deux lignes de même clé dans
 * le même envoi ne produisent pas un doublon : PostgreSQL **refuse l'envoi
 * entier** (« ON CONFLICT DO UPDATE command cannot affect row a second time »).
 * La proposition s'ouvrait alors vide, et l'écran disait « Rien à comparer »
 * sans que rien ne dise pourquoi.
 *
 * Un utilitaire qui verse deux fois le même sujet a un problème de modèle, et
 * il faut le corriger là où il est. Mais perdre la proposition entière pour
 * cela est hors de proportion : on garde la première écriture, qui est celle
 * que l'appelant a mise en tête.
 */
export function sansDoublonDItems(items = []) {
  const vus = new Set();
  const gardes = [];

  for (const item of Array.isArray(items) ? items : []) {
    const cle = `${texte(item?.itemType)}|${texte(item?.itemKey)}`;
    if (vus.has(cle)) continue;
    vus.add(cle);
    gardes.push(item);
  }

  return gardes;
}

/**
 * Les items d'une proposition, à partir de ce que l'Atelier a produit.
 *
 * Une affirmation sans sujet ou sans valeur n'entre pas : elle n'affirmerait
 * rien, et une proposition qui porte des lignes vides ne se relit pas.
 */
/**
 * Sur quoi un avis porte, toujours sous forme de liste.
 *
 * Une chaîne pour les lignes écrites avant que la liste existe, une liste
 * ensuite. `null` quand il n'y a rien : une liste vide et « rien » se
 * ressemblent, mais `null` dit qu'aucune liaison n'a été proposée.
 */
function porteesDeLAvis(valeur) {
  const liste = (Array.isArray(valeur) ? valeur : [valeur]).map(texte).filter(Boolean);
  return liste.length ? liste : null;
}

export function itemsDeProposition(affirmations = []) {
  return sansDoublonDItems((Array.isArray(affirmations) ? affirmations : [])
    .filter((affirmation) => texte(affirmation?.sujet) && texte(affirmation?.valeur))
    .map((affirmation) => {
      // Deux formes de la même portée, et il faut les deux.
      //
      // La **clé** range et compare : « batiment-a » et « Bâtiment A » désignent
      // la même partie de l'ouvrage, et deux clés pour une zone donneraient deux
      // corpus là où il n'y en a qu'un. Le **libellé** se lit : un fichier de
      // mémoire qui affiche « batiment-a » se lit moins bien qu'« Bâtiment A »,
      // et c'est ce que la ligne montre.
      //
      // La clé va dans la colonne `zones`, le libellé dans le payload. Écrire la
      // clé des deux côtés perdait le libellé pour toujours : rien d'autre ne le
      // porte, et on ne le reconstruit pas — « batiment-a » ne dit pas si
      // l'auteur avait écrit « Bâtiment A » ou « bâtiment A ».
      const libelles = new Map();
      for (const zone of affirmation.zones ?? []) {
        const cle = normalizeZoneKey(zone);
        if (cle && !libelles.has(cle)) libelles.set(cle, texte(zone));
      }
      const portees = [...libelles.keys()].sort();
      const dits = portees.map((cle) => libelles.get(cle));

      return {
        itemType: BASE_DATUM_KIND,
        itemKey: cleDAffirmation(affirmation),
        payload: {
          subject: texte(affirmation.sujet),
          value: texte(affirmation.valeur),
          // La nature et le domaine ne se devinent pas : c'est l'utilitaire qui
          // sait de quoi il parle, et il le dit.
          nature: texte(affirmation.nature) || null,
          domain: texte(affirmation.domaine) || null,
          // Ce que ce nom désigne, et ce à quoi il sert. Ni l'un ni l'autre ne
          // se déduit d'une valeur : sans eux, un projet de douze mille noms
          // devient un projet où chacun recrée le sien plutôt que de chercher
          // celui qui existe. Voir `docs/langage-mdall.md`.
          quoi: texte(affirmation.quoi) || null,
          utilisation: texte(affirmation.utilisation) || null,
          zones: dits.length ? dits : null,
          // De quoi rouvrir le texte à la bonne ligne devant qui conteste.
          source: texte(affirmation.source) || null,
          article: texte(affirmation.article) || null,
          citation: texte(affirmation.citation) || null,
          reference: texte(affirmation.reference) || null,
          // D'où elle vient. Six mois plus tard, personne ne saura si une cote a
          // été dimensionnée à la main ou proposée par un calcul.
          atelier: texte(affirmation.atelier) || null,
          // Et si elle sort d'un calcul : lequel, et avec quelles entrées. La
          // ligne l'écrit derrière une double flèche — c'est ce qui permettra,
          // le jour où une entrée change, de savoir quoi refaire sans chercher.
          deduitDe: affirmation.deduitDe ?? null,
          // D'où elle vient, et donc comment elle a été obtenue : le type de
          // la provenance **est** l'origine. Une valeur qui renvoie à une règle
          // est déduite, une valeur qui renvoie à un plan est lue, une valeur
          // qui renvoie à un calcul est calculée.
          provenance: provenanceRetenue(affirmation.provenance),
          // Et l'état du raisonnement dans ce projet : retenu, supposé,
          // contesté. Ce n'est pas une propriété de la valeur, c'est ce que le
          // projet en fait — et les confondre fait qu'on ne sait plus ce qui
          // était acquis et ce qui restait à confirmer.
          statut: STATUTS.includes(texte(affirmation.statut)) ? texte(affirmation.statut) : null,
          // Une **règle appliquée**, quand c'en est une. Le projet en garde un
          // instantané : sans lui, « ← règle Classement du bâtiment » pointerait
          // vers rien, le graphe ne se reconstruirait pas, et un arrêté modifié
          // six mois plus tard réécrirait l'histoire en silence.
          referentiel: affirmation.referentiel === true ? true : null,
      // Ce qui fait la décision : la question, les écartés, le motif. Le pendant
      // de `regle` pour une règle — et, comme elle, filtré plutôt que recopié :
      // ce qu'on n'a pas déclaré ne voyage pas.
      decision: decisionRetenue(affirmation.decision),
          regle: regleRetenue(affirmation.regle),
          // L'**agent** qu'une fonction appelle, quand elle en appelle un : un
          // tiers dont la loi ne s'écrit pas. Ce qui se conserve est ce qui
          // permet de la relire et de la refaire — quel agent, quel utilitaire,
          // quelle version, ce qu'il a lu et ce qu'il a rangé. Voir
          // `docs/fondamentaux.md`, règle 9.
          agent: agentRetenu(affirmation.agent ?? affirmation.native),
          // La référence complète de l'utilitaire, version comprise, et ce qu'il
          // a lu au moment de l'appel. C'est ce qui reconstruit les liens du
          // raisonnement, et ce qui dit six mois plus tard avec quelle version
          // ces cotes ont été trouvées.
          utilitaire: texte(affirmation.utilitaire) || null,
          lectures: lecturesRetenues(affirmation.lectures),
          // Un **tableau**, quand la valeur en est un. Un calcul qui dimensionne
          // vingt massifs ne rend pas une valeur, et l'éclater en cent quarante
          // sujets ferait cent quarante lignes semblables là où le métier en
          // voit une. Voir `docs/fondamentaux.md`, règle 9.
          tableau: Array.isArray(affirmation.tableau) && affirmation.tableau.length
            ? affirmation.tableau
            : null,
          // Et sa forme, déclarée une fois : « type: tableau » n'apprend rien
          // tant qu'on ignore ce qu'il faut mettre dans une ligne.
          structure: Array.isArray(affirmation.structure) && affirmation.structure.length
            ? affirmation.structure
            : null,
          // Ce qui fait d'une donnée de base une **zone**, et son retrait quand
          // c'en est un. Rien ne se devine d'un libellé : « Zone A » n'est pas
          // une zone parce qu'il commence par ces deux mots — c'est cette marque
          // qui le dit, et elle seule.
          zoneDefinition: affirmation.zoneDefinition === true ? true : null,
          zoneKey: affirmation.zoneDefinition === true
            ? normalizeZoneKey(affirmation.zoneKey ?? affirmation.sujet ?? "")
            : null,
          retiree: affirmation.retiree === true ? true : null,

          // ── Ce qu'un avis de bureau de contrôle porte en plus ──────────────
          //
          // Quatre champs déclarés, comme le reste : ce qu'on ne déclare pas ne
          // voyage pas, et ces quatre-là ne se déduisent d'aucun autre.
          //
          // `emisPar` n'est **pas** `decided_by`. L'un est l'organisme qui
          // engage sa responsabilité, l'autre l'utilisateur Mdall qui a signé la
          // proposition. Les confondre ferait dire à la mémoire que celui qui a
          // cliqué a rendu l'avis.
          //
          // `porteSur` est la valeur que l'avis a examinée — **cette version-là**.
          // Il devient un engagement à la fusion, et pas avant : c'est la
          // signature qui confirme. Voir `services/avis-engagement.js`.
          emisPar: texte(affirmation.emisPar) || null,
          // Une **liste** : un avis porte souvent sur plusieurs parties de l'ouvrage.
    // Les anciennes lignes portent une chaîne ; les deux formes se lisent.
    porteSur: porteesDeLAvis(affirmation.porteSur),
          documentId: texte(affirmation.documentId) || null,
          page: Number.isFinite(Number(affirmation.page)) ? Number(affirmation.page) : null
        }
      };
    }));
}

/**
 * Le corps d'une proposition, écrit pour être relu.
 *
 * Une proposition dont la description dit « 12 affirmations » demande d'ouvrir
 * chaque ligne pour savoir de quoi il s'agit. Celle-ci les liste, avec leur
 * article : c'est ce qu'on lit avant de signer.
 */
export function descriptionDeLaProposition({ intro = "", affirmations = [], source = "" } = {}) {
  const lignes = [];
  if (texte(intro)) lignes.push(texte(intro), "");

  for (const affirmation of affirmations) {
    if (!texte(affirmation?.sujet) || !texte(affirmation?.valeur)) continue;
    const suite = [texte(affirmation.article), (affirmation.zones ?? []).join(", ")]
      .filter(Boolean).join(" · ");
    lignes.push(`- **${texte(affirmation.sujet)}** : ${texte(affirmation.valeur)}${suite ? ` — ${suite}` : ""}`);
  }

  if (texte(source)) lignes.push("", `_${texte(source)}_`);
  lignes.push("", "_Rien n'est encore entré dans la mémoire du projet : cette proposition attend d'être signée._");
  return lignes.join("\n");
}

/**
 * Ouvrir une proposition à partir d'un résultat d'Atelier — ou en enrichir une.
 *
 * **Elle reste ouverte.** Rien ici ne la fusionne, et c'est le point de tout ce
 * fichier : le système prépare, l'humain signe.
 *
 * `affirmations` accepte aussi des **items déjà formés** — c'est ce que fait un
 * retrait, qui ne décrit pas une valeur mais un document à sortir du corpus.
 *
 * ## Enrichir une proposition ouverte
 *
 * `propositionId` porte le lot dans une proposition qui existe déjà, au lieu
 * d'en ouvrir une de plus. C'est ce que `docs/a-traiter-plus-tard.md` § 17
 * appelle une branche : non pas une réalité parallèle, mais une proposition qui
 * n'est pas mono-action — on l'ouvre, on l'enrichit, et quand elle est complète
 * on la fusionne.
 *
 * La base l'acceptait déjà : `proposition_items` est unique sur
 * `(proposition_id, item_type, item_key)`, et le versement se fait en
 * `merge-duplicates`. Un deuxième lot ajoute ce qui est nouveau et remplace ce
 * qui porte la même clé. Rien à migrer.
 *
 * Deux refus, et ils comptent autant que le succès :
 *
 *  - **une proposition qui n'est plus ouverte** ne reçoit rien. Y porter un lot
 *    après la fusion écrirait dans une décision datée ;
 *  - **une clé déjà tranchée** n'est pas repoussée. Le versement remettrait
 *    l'item à « proposé » et effacerait qui avait décidé — et un refus effacé
 *    est un refus qu'on ne pourra pas contester. On la retient et on la rend
 *    dans `tranches`, à l'appelant de le dire.
 *
 * @returns {Promise<{ok: true, proposition: object, items: number, tranches: object[]}
 *   |{ok: false, raison: string, tranches?: object[]}>}
 */
export async function preparerUneProposition({
  projectId = "",
  titre = "",
  intro = "",
  source = "",
  affirmations = [],
  // La proposition ouverte à enrichir. Vide : on en ouvre une nouvelle.
  propositionId = "",
  // Une description écrite par l'appelant. Elle sert quand ce qu'il y a à dire
  // n'est pas une liste de valeurs — défaire une proposition raconte ce qu'on
  // remet, ce qu'on écarte et ce qu'on laisse.
  description = "",
  // À quelles parties de l'ouvrage tout ceci s'applique. Une liste vide veut
  // dire « partout » — c'est une portée, pas une absence de réponse.
  //
  // Elle ne s'impose qu'à ce qui n'a pas déjà la sienne : un utilitaire qui
  // sait où va chacune de ses conclusions garde le dernier mot.
  zones = null
} = {}) {
  const projet = texte(projectId);
  if (!projet) return { ok: false, raison: "Ce projet n'est pas relié à la base." };

  const portees = Array.isArray(zones) ? zones : null;
  const situees = portees === null
    ? affirmations
    : (Array.isArray(affirmations) ? affirmations : []).map((affirmation) => (
        Array.isArray(affirmation?.zones) && affirmation.zones.length
          ? affirmation
          : { ...affirmation, zones: portees }
      ));

  const items = Array.isArray(situees) && situees.length && situees[0]?.itemType
    ? sansDoublonDItems(situees)
    : itemsDeProposition(situees);
  if (!items.length) return { ok: false, raison: "Il n'y a rien à proposer." };

  const base = await import("./propositions-supabase.js");
  const vise = texte(propositionId);

  const { proposition, aPorter, tranches, raison } = vise
    ? await brancheVisee(base, vise, items)
    : await propositionNeuve(base, {
        projet, titre, intro, source, description, affirmations, items
      });

  if (raison) return { ok: false, raison, ...(tranches?.length ? { tranches } : {}) };

  // Tout le lot heurtait des décisions : il n'y a rien à porter, et ouvrir une
  // proposition de plus « pour ne pas perdre le travail » contournerait
  // exactement ce qu'on vient de refuser.
  if (!aPorter.length) {
    return {
      ok: false,
      raison: "Tout ce lot porte sur des lignes déjà tranchées dans cette proposition.",
      tranches
    };
  }

  const soumis = await base.soumettreDesItems({
    propositionId: proposition.id, projectId: projet, items: aPorter
  });
  if (!soumis) {
    // La proposition existe et elle n'a rien reçu : le dire vaut mieux que de
    // laisser croire qu'elle porte ce qu'on vient de préparer.
    return {
      ok: false,
      raison: vise
        ? "Les lignes n'ont pas pu être portées dans cette proposition."
        : "La proposition a été ouverte, mais ses lignes n'ont pas pu y être portées."
    };
  }

  return { ok: true, proposition, items: aPorter.length, tranches };
}

/**
 * Une proposition neuve : elle naît ouverte, et vide de décisions.
 *
 * Rien à retenir, donc : le lot entier y entre, et `tranches` est vide — il n'y
 * a personne à heurter dans une proposition qui vient de naître.
 */
async function propositionNeuve(base, { projet, titre, intro, source, description, affirmations, items }) {
  const proposition = await base.createProposition({
    projectId: projet,
    title: texte(titre) || "Proposition depuis l'Atelier",
    description: texte(description) || descriptionDeLaProposition({ intro, affirmations, source })
  });
  if (!proposition?.id) return { raison: "La proposition n'a pas pu être ouverte." };
  return { proposition, aPorter: items, tranches: [] };
}

/**
 * La proposition ouverte qu'on enrichit, et ce qu'on a le droit d'y porter.
 *
 * On lit ses items avant d'écrire. Une lecture ratée **arrête** : `null` veut
 * dire « je n'ai pas pu lire les réponses », et le confondre avec « il n'y en a
 * aucune » ferait repousser le lot par-dessus un refus qu'on n'avait pas vu
 * (règle 5).
 */
async function brancheVisee(base, propositionId, items) {
  const [{ PROPOSITION }, { itemsPortablesDansLaBranche }] = await Promise.all([
    import("./proposition-state.js"),
    import("./proposition-branche.js")
  ]);

  const proposition = await base.loadProposition(propositionId);
  if (!proposition?.id) return { raison: "Cette proposition n'a pas pu être lue." };
  if (proposition.status !== PROPOSITION.OPEN) {
    return { raison: "Cette proposition n'est plus ouverte : elle ne reçoit plus de lignes." };
  }

  const dejaLa = await base.listPropositionItems(propositionId);
  if (!Array.isArray(dejaLa)) {
    return { raison: "Ce que cette proposition porte déjà n'a pas pu être lu." };
  }

  const { portables, tranches } = itemsPortablesDansLaBranche(items, dejaLa);
  return { proposition, aPorter: portables, tranches };
}
