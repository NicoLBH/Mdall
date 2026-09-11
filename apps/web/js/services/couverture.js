/**
 * Ce qui couvre une valeur, et ce qu'un changement fait tomber.
 *
 * ## Ce que ce fichier répond
 *
 * Mdall sait dire qu'un déplacement du projet fait passer la zone de neige de
 * A1 à E. Il ne savait pas dire que **l'avis favorable du bureau de contrôle ne
 * couvre plus rien** — et c'est pourtant la seule phrase qui décide de quelque
 * chose en réunion. Les chiffres se recalculent en une seconde ; un avis se
 * redemande en six semaines.
 *
 * Un projet ne se rend unique ni par ses calculs ni par ses valeurs : n'importe
 * quel projet de la même commune trouvera la même zone. Il se rend unique par
 * **ce que des gens ont engagé dessus**.
 *
 * ## Rien n'est stocké, tout se lit
 *
 * Aucune colonne « caduc », aucun drapeau, aucune tâche de fond. La couverture
 * se **calcule** à partir de deux choses qui existent déjà :
 *
 * - un acte porte l'identifiant d'une affirmation, donc d'une **version**
 *   (`services/memoire-actes.js`) ;
 * - une affirmation remplacée porte `superseded_by`.
 *
 * La chaîne des remplacements *est* donc le mécanisme de péremption. Il n'y en
 * a pas d'autre à écrire, et un drapeau stocké serait faux le jour où quelqu'un
 * verserait sans que la tâche passe.
 *
 * ## Un avis ne devient jamais faux
 *
 * Un constat reste vrai à sa date (`docs/fondamentaux.md`, règle 6) : le 12
 * mars, le bureau de contrôle **a** rendu son avis sur « A1 ». Ce fait est
 * acquis. Ce qui tombe est sa **couverture**, pas lui — d'où le vocabulaire de
 * ce fichier, qui ne dit jamais « invalide » ni « périmé ».
 *
 * ## On dit ce qui tombe, jamais ce qui tient
 *
 * Il serait tentant de juger qu'un changement est favorable et de garder l'avis
 * — « la cote hors gel descend, donc la note tient toujours ». C'est un
 * jugement d'ingénieur, et se tromper garderait en vie un avis mort, qu'on
 * citerait en réunion. On dit que la valeur examinée a changé ; quelqu'un
 * tranche (règle 5).
 *
 * Le mot « visa » ne paraît jamais à l'écran — règle 12.
 */

import { acteQuiCouvre } from "./memoire-actes.js";
import { engagementsDerivesDesAvis } from "./avis-engagement.js";
import { organismeNomme } from "./ce-qui-couvre.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les trois états d'une couverture.
 *
 * **Trois, et non deux.** La chaîne des remplacements ne distingue pas « la
 * valeur a changé » de « la ligne a été réécrite » : quelqu'un qui reverse une
 * affirmation pour corriger une faute dans sa description ne doit pas faire
 * tomber un avis de bureau de contrôle.
 */
export const COUVERTURE = {
  /** L'affirmation examinée est celle qui vaut aujourd'hui. */
  COUVRE: "couvre",
  /** Remplacée, mais par la **même valeur**. L'engagement peut se reporter. */
  A_REPORTER: "a-reporter",
  /** Remplacée par une autre valeur. L'engagement ne porte plus sur rien. */
  NE_COUVRE_PLUS: "ne-couvre-plus",
  /**
   * Ce qui a été examiné n'a pas bougé, mais **ce qu'il avait lu**, si.
   *
   * Un avis sur une note de calcul dont une entrée change n'est pas caduc : la
   * note peut ne pas bouger. Crier « caduc » à chaque variante ferait ignorer
   * l'alerte au bout de trois fois.
   */
  A_REVERIFIER: "a-reverifier"
};

/** Ce que chaque état veut dire, en français, sans jamais nommer le mécanisme. */
const PHRASES = {
  [COUVERTURE.COUVRE]: "porte sur la valeur d'aujourd'hui",
  [COUVERTURE.A_REPORTER]: "portait sur une ligne remplacée, mais la valeur n'a pas changé",
  [COUVERTURE.NE_COUVRE_PLUS]: "ne couvre plus : la valeur examinée a changé",
  [COUVERTURE.A_REVERIFIER]: "à revérifier : une valeur lue par ce qui a été examiné a changé"
};

/** La phrase d'un état. Un état sans phrase se lit comme un code d'erreur. */
export function phraseDeLaCouverture(etat) {
  return PHRASES[texte(etat)] ?? "";
}

/** La valeur d'une affirmation, telle qu'on la compare. */
function valeurDe(assertion) {
  return texte(assertion?.payload?.value ?? assertion?.payload?.valeur);
}

/**
 * Ce qu'un acte a examiné, et ce que le projet en dit aujourd'hui.
 *
 * @param {object} acte l'acte qui couvre
 * @param {Map<string, object>} parId la mémoire, indexée par identifiant
 * @returns {{examinee: object|null, courante: object|null, etat: string}}
 */
function suivreLaChaine(acte, parId) {
  const examinee = parId.get(texte(acte?.assertion_id)) ?? null;
  if (!examinee) {
    // On ne trouve pas ce qui a été examiné. Ce n'est pas « ça couvre » : c'est
    // « on ne sait pas », et le taire vaudrait affirmation (règle 5).
    return { examinee: null, courante: null, etat: "" };
  }

  if (!texte(examinee.superseded_by)) {
    return { examinee, courante: examinee, etat: COUVERTURE.COUVRE };
  }

  // On suit les remplacements jusqu'à la ligne qui vaut aujourd'hui. Comparer
  // avec le remplaçant immédiat suffirait à dire qu'elle a bougé, mais pas à
  // dire **vers quoi** — et c'est ce qu'on veut montrer.
  const vus = new Set();
  let courante = examinee;
  while (texte(courante?.superseded_by) && !vus.has(texte(courante.id))) {
    vus.add(texte(courante.id));
    const suivante = parId.get(texte(courante.superseded_by));
    if (!suivante) break;
    courante = suivante;
  }

  const etat = valeurDe(courante) === valeurDe(examinee)
    ? COUVERTURE.A_REPORTER
    : COUVERTURE.NE_COUVRE_PLUS;

  return { examinee, courante, etat };
}

/**
 * Tous les engagements du projet, avec leur état.
 *
 * Pure : elle ne parle à personne. L'appelant lit la mémoire et les actes, et
 * les lui passe.
 *
 * @param {object} options
 * @param {object[]} options.assertions la mémoire, telle qu'elle est lue —
 *   **y compris les lignes remplacées**, sans quoi on ne saurait pas ce qui a
 *   été examiné
 * @param {object[]} options.actes les actes du projet
 * @returns {{acte: object, examinee: object, courante: object, etat: string}[]}
 */
export function engagementsDuProjet({ assertions = [], actes = [] } = {}) {
  const parId = new Map(
    (Array.isArray(assertions) ? assertions : []).map((a) => [texte(a?.id), a])
  );

  // Les avis déjà en mémoire engagent, eux aussi. Le suivi des avis BC les
  // écrivait bien avant que les engagements existent, et ils portent dans leur
  // intitulé exactement le nom du sujet qu'ils couvrent. On les **dérive** —
  // rien n'est écrit, rien n'est à migrer (`services/avis-engagement.js`).
  const tous = [...(Array.isArray(actes) ? actes : []), ...engagementsDerivesDesAvis({ assertions, actes })];

  const engagements = [];
  for (const acte of tous) {
    if (!acteQuiCouvre(acte)) continue;

    const { examinee, courante, etat } = suivreLaChaine(acte, parId);
    if (!examinee || !etat) continue;

    engagements.push({ acte, examinee, courante, etat });
  }

  return engagements;
}

/**
 * Ce qu'une variante fait tomber, et ce qu'elle rend suspect.
 *
 * ## Deux façons de couvrir, et elles ne se disent pas pareil
 *
 * - **Directement** : l'engagement porte sur une valeur que la variante change.
 *   Il ne couvre plus, et c'est sans appel — le bureau de contrôle a examiné
 *   « A1 », la valeur serait « E ».
 * - **Indirectement** : l'engagement porte sur une conclusion qui **a lu** une
 *   valeur que la variante change. La conclusion peut ne pas bouger ; on dit
 *   « à revérifier », pas « caduc ».
 *
 * La distinction n'est pas cosmétique : confondre les deux ferait crier au loup
 * à chaque essai, et l'alerte cesserait d'être lue.
 *
 * ## Ce qu'on lui passe
 *
 * Le rendu d'une variante, tel que `consequencesDeLaVariante` le rend. On ne
 * touche pas à cette fonction : elle sait déjà marcher dans le graphe, et lui
 * ajouter les engagements ferait d'une fonction qui répond à une question une
 * fonction qui en mêle deux.
 *
 * @param {object} options
 * @param {object} options.rendu ce que la variante a conclu
 * @param {object[]} options.assertions la mémoire lue
 * @param {object[]} options.actes les actes du projet
 * @param {object[]|null} [options.applications] les lectures **enregistrées** :
 *   c'est par elles qu'on sait qu'une conclusion examinée a lu une valeur qui
 *   bouge. Sans elles, la couverture indirecte ne se voit pas — et on le dit
 *   plutôt que de conclure qu'il n'y en a pas (règle 5)
 * @returns {{tombees: object[], aRevoir: object[], engagements: number, lecturesLues: boolean}}
 */
export function couvertureDeLaVariante({
  rendu = null, assertions = [], actes = [], applications = null
} = {}) {
  const engagements = engagementsDuProjet({ assertions, actes })
    .filter((engagement) => engagement.etat === COUVERTURE.COUVRE);

  const lecturesLues = Array.isArray(applications);
  if (!rendu) {
    return { tombees: [], aRevoir: [], engagements: engagements.length, lecturesLues };
  }

  // Ce que la variante touche, par identifiant : ce qu'elle remplace, ce qu'elle
  // a recalculé, et ce qu'elle range à revérifier.
  const changees = new Set();
  const suspectes = new Set();
  const deviendrait = new Map();

  for (const ligne of rendu.depart ?? []) {
    const id = texte(ligne?.assertion?.id ?? ligne?.id).split("#")[0];
    if (!id) continue;
    changees.add(id);
    if (texte(ligne?.vers)) deviendrait.set(id, texte(ligne.vers));
  }
  // Ce que la variante ferait de chaque valeur. Une variante n'écrit rien : ce
  // qui a été examiné est **toujours** en vigueur, et dire « aujourd'hui : A1 »
  // à côté de « ne couvre plus » se lisait comme une contradiction. Ce qu'on
  // montre est ce qu'elle **deviendrait**.
  for (const ligne of [...(rendu.recalculees ?? []), ...(rendu.rejouees ?? [])]) {
    const id = texte(ligne?.assertion?.id);
    // Recalculée **et identique** n'est pas un changement : l'avis tient.
    if (id && texte(ligne?.avant) !== texte(ligne?.apres)) {
      changees.add(id);
      deviendrait.set(id, texte(ligne?.apres));
    }
  }
  for (const ligne of rendu.aRevoir ?? []) {
    const id = texte(ligne?.assertion?.id);
    if (id) suspectes.add(id);
  }

  // Ce que chaque conclusion a lu, par identifiant de sortie.
  const entreesLues = new Map();
  for (const ligne of Array.isArray(applications) ? applications : []) {
    const sortie = texte(ligne?.output_assertion_id);
    const entree = texte(ligne?.input_assertion_id);
    if (!sortie || !entree) continue;
    if (!entreesLues.has(sortie)) entreesLues.set(sortie, []);
    entreesLues.get(sortie).push(entree);
  }

  const tombees = [];
  const aRevoir = [];

  for (const engagement of engagements) {
    const id = texte(engagement.examinee?.id);

    if (changees.has(id)) {
      tombees.push({
        ...engagement,
        etat: COUVERTURE.NE_COUVRE_PLUS,
        pourquoi: "directe",
        deviendrait: deviendrait.get(id) ?? ""
      });
      continue;
    }
    if (suspectes.has(id)) {
      aRevoir.push({ ...engagement, etat: COUVERTURE.A_REVERIFIER, pourquoi: "directe" });
      continue;
    }

    // Indirect : ce qui a été examiné a **lu** une valeur qui bouge. On le sait
    // par les lectures enregistrées, pas par la déclaration : celle-ci dit ce
    // qu'une règle lit en général, celles-là disent ce que ce calcul-ci a lu.
    if (entreesLues.get(id)?.some((entree) => changees.has(entree))) {
      aRevoir.push({ ...engagement, etat: COUVERTURE.A_REVERIFIER, pourquoi: "indirecte" });
    }
  }

  return { tombees, aRevoir, engagements: engagements.length, lecturesLues };
}

/**
 * Ce qu'un engagement se dit, en une ligne.
 *
 * Par son auteur et sa date, jamais par le nom du mécanisme : c'est la règle 12,
 * et c'est aussi ce qui se lit le mieux. « Avis du bureau de contrôle, 12 mars »
 * dit tout ; « visa n° 4 » ne dit rien.
 */
export function ligneDeLEngagement(engagement = null) {
  const acte = engagement?.acte ?? null;
  if (!acte) return "";

  const quand = texte(acte.created_at).slice(0, 10);
  const quoi = texte(engagement.examinee?.payload?.subject)
    || texte(engagement.examinee?.statement);
  const note = texte(acte.note);

  return [quoi, note, quand].filter(Boolean).join(" — ");
}

/**
 * « avis F » et non « avis avis F ». La note d'un engagement commence parfois
 * par le mot que la phrase met déjà devant elle.
 */
function sansLeMotAvis(valeur = "") {
  return texte(valeur).replace(/^avis\s+/i, "");
}

/**
 * Ce qu'un engagement dit, **en français**.
 *
 * ## Pourquoi une phrase, et pas la même ligne
 *
 * `ligneDeLEngagement` juxtapose des morceaux : « Zone de vent — F — Région 2 —
 * 2026-09-11 ». C'est exact et c'est illisible : il faut connaître l'ordre des
 * champs pour comprendre, et rien ne dit qui a rendu cet avis ni ce que « F »
 * veut dire. Devant une décision qui coûte six semaines, on ne fait pas décoder
 * une ligne à celui qui lit.
 *
 * On écrit donc :
 *
 * > **SOCOTEC — 11/09/2026 : avis F sur Zone de vent = Région 2.**
 * > Cet avis ne couvre plus : la valeur passerait à 1.
 *
 * Deux phrases : **qui a dit quoi**, puis **ce qu'il advient**. Courtes, parce
 * qu'on en lit dix d'affilée.
 *
 * ## Ce qu'elle ne fait pas
 *
 * Elle ne traduit pas le code. Si le rapport dit « F », la phrase dit « F » —
 * la légende du document est la seule chose qui sache ce que « F » veut dire
 * chez cet émetteur-là, et deviner « favorable » serait faux chez le suivant.
 * Le libellé s'écrit **entre parenthèses** quand on le connaît, jamais à la
 * place du code.
 *
 * Et elle ne juge pas : elle dit que la valeur change, jamais si c'est grave.
 *
 * @param {object} engagement ce que `couvertureDeLaVariante` a rendu
 * @param {object} [options]
 * @param {(iso: string) => string} [options.dater] la date en français — le
 *   service ne connaît pas la locale de celui qui lit
 * @returns {{quoi: string, alors: string}} deux phrases, jamais un paragraphe
 */
export function phraseDeLEngagement(engagement = null, { dater = null } = {}) {
  const acte = engagement?.acte ?? null;
  if (!acte) return { quoi: "", alors: "" };

  const sujet = texte(engagement.examinee?.payload?.subject)
    || texte(engagement.examinee?.statement);
  const examinee = texte(engagement.examinee?.payload?.value);

  const brut = texte(acte.created_at).slice(0, 10);
  const quand = brut ? (dater ? texte(dater(brut)) : brut) : "";

  // La note porte « <organisme> — <teneur> » ou « <appréciation> — <extrait> »,
  // selon le chemin par lequel l'avis est entré. On la découpe pour placer
  // chaque morceau à sa place ; ce qui n'y est pas ne s'invente pas — un
  // engagement sans organisme se dit sans organisme, pas sous un nom supposé.
  const nomme = organismeNomme(acte.note);
  const organisme = nomme?.label ?? "";
  const teneur = sansLeMotAvis(
    texte(acte.note)
      .split("—")
      .map((morceau) => morceau.trim())
      .filter(Boolean)
      // Le morceau qui *est* l'organisme s'enlève quel qu'en soit la casse :
      // c'est le texte du rapport, pas le libellé de la liste.
      .filter((morceau) => !nomme || organismeNomme(morceau) !== nomme)
      .join(" — ")
  );

  const qui = [organisme, quand].filter(Boolean).join(" — ");
  const dit = [
    teneur ? `avis ${teneur}` : "examen",
    sujet ? ` sur ${sujet}` : "",
    // Pas deux fois la même chose : quand la note *est* déjà ce qui a été
    // examiné, la répéter derrière un « = » ne dirait rien de plus.
    examinee && examinee !== teneur ? ` = ${examinee}` : ""
  ].join("");

  const quoi = `${qui ? `${qui} : ` : ""}${dit}.`;

  const deviendrait = texte(engagement.deviendrait);
  const alors = engagement.etat === COUVERTURE.A_REVERIFIER
    ? "À revérifier : une valeur dont cet examen dépend change."
    : `Cet avis ne couvre plus${deviendrait ? ` : la valeur passerait à ${deviendrait}` : " : la valeur change"}.`;

  return { quoi, alors };
}
