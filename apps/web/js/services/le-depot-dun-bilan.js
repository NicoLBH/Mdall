/**
 * Le dépôt d'un bilan : **ce que les outils envoient à la console, et rien de plus.**
 *
 * ## Le défaut que cela répare
 *
 * Les quatre outils tournaient dans quatre terminaux, et leur résultat mourait
 * avec la fenêtre. On ne pouvait donc pas répondre à « est-ce que cela
 * s'améliore ? » autrement qu'en relançant tout — et personne ne relance tout.
 *
 * ## Pourquoi un module, et non trois lignes dans chaque outil
 *
 * Parce que la **réduction est la partie dangereuse**, et qu'elle doit être
 * éprouvée une fois.
 *
 * Chaque outil rend un bilan riche, et plusieurs de ses champs portent un
 * contenu de chantier : `piegesTombes` est la liste des pièges tombés, en clair,
 * et c'est exactement ce que la console ne doit pas voir. Trois réductions
 * écrites à trois endroits auraient fini par en laisser passer une — et celle
 * qu'on ne relit jamais est celle qui l'aurait fait (règle 4).
 *
 * La base refuse déjà ces clés par sa structure (`bilan_sans_contenu`) et
 * `deposer_une_mesure` jette tout ce qui n'est pas un nombre. Ce module est la
 * **troisième serrure**, et la seule qui s'éprouve sans PostgreSQL : il dit, en
 * JavaScript, ce que chaque outil a le droit d'envoyer.
 *
 * ## Ce qui est pur, et ce qui ne l'est pas
 *
 * `leBilanAVerser` est pur : un bilan entre, des nombres sortent. Il s'éprouve
 * entièrement.
 *
 * `deposerUnBilan` fait un aller-retour HTTP. Comme `parLeReseau`, **il n'est
 * pas éprouvé contre un vrai serveur** et c'est dit plutôt que laissé croire :
 * il demande une URL Supabase et un jeton, que les épreuves n'ont pas. Son
 * câblage s'éprouve avec un appelant de carton ; le réseau lui-même, non.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Les quatre outils, nommés comme la base les nomme. */
export const MESURE = {
  PERTURBATIONS: "perturbations",
  DERIVE: "derive",
  JEU_DE_REFERENCE: "jeu_de_reference",
  INVARIANTS: "invariants"
};

/**
 * Un nombre fini, ou `null`.
 *
 * **Jamais zéro par défaut.** `Number(null)` vaut 0, et « 0 perturbation
 * tombée » se lit comme un succès là où c'est une absence de mesure. Une clé
 * absente doit rester absente jusqu'à l'écran, qui sait le dire (règle 5).
 */
function unNombre(valeur) {
  if (valeur === null || valeur === undefined || valeur === "") return null;
  const lu = Number(valeur);
  return Number.isFinite(lu) ? lu : null;
}

/** Ne garder que les clés dont on a un nombre : les autres n'entrent pas. */
function queLesNombres(entrees) {
  const propre = {};
  for (const [cle, valeur] of Object.entries(entrees)) {
    const lu = unNombre(valeur);
    if (lu !== null) propre[cle] = lu;
  }
  return propre;
}

/**
 * Le bilan d'un outil, réduit à ce que la console a le droit de voir.
 *
 * Rend `null` quand l'outil est inconnu ou le bilan illisible : un dépôt vide
 * poserait une ligne qui dit « mesuré, rien trouvé » là où rien n'a été mesuré.
 *
 * @param {string} quoi l'un des quatre `MESURE`
 * @param {object} bilan le bilan tel que l'outil le rend
 * @returns {{quoi: string, combien: number, bilan: object}|null}
 */
export function leBilanAVerser(quoi, bilan = null) {
  // **Un tableau est un objet**, et c'est le trou que l'épreuve a trouvé : un
  // `[]` passait pour un bilan, toutes ses clés étaient absentes, et le dépôt
  // posait une ligne de zéros — « mesuré, rien trouvé » là où rien n'a été
  // mesuré, qui est exactement le mensonge que la règle 5 nomme.
  if (!bilan || typeof bilan !== "object" || Array.isArray(bilan)) return null;

  if (texte(quoi) === MESURE.PERTURBATIONS) {
    // `eues` est l'assiette, et non `posees` : une épreuve sans objet n'a pas
    // eu lieu, et la compter au dénominateur ferait monter le taux de réussite
    // quand la batterie cesse de fonctionner.
    return {
      quoi: MESURE.PERTURBATIONS,
      combien: unNombre(bilan.eues) ?? 0,
      bilan: queLesNombres({
        epreuves: bilan.eues,
        tombees: bilan.tombees,
        // **Le chiffre le moins intuitif, et le plus important.** Une
        // perturbation sans objet n'a rien dérangé : l'épreuve qu'elle porte
        // rend vert sans avoir rien essayé.
        sansEffet: bilan.sansObjet,
        perturbations: bilan.posees
      })
    };
  }

  if (texte(quoi) === MESURE.DERIVE) {
    return {
      quoi: MESURE.DERIVE,
      combien: unNombre(bilan.franchis) ?? 0,
      bilan: queLesNombres({
        lectures: bilan.franchis,
        derives: bilan.derives,
        instabilites: bilan.instables,
        procedesInconnus: bilan.procedeInconnu,
        // **Ce qui échappe encore se dépose aussi.** Un chantier dont presque
        // tous les documents n'ont été lus qu'une fois n'a pas une dérive
        // nulle : il a une dérive qu'on n'a pas mesurée.
        sansProcede: (unNombre(bilan.luesUneFois) ?? 0) + (unNombre(bilan.sansCle) ?? 0)
      })
    };
  }

  if (texte(quoi) === MESURE.JEU_DE_REFERENCE) {
    // **`piegesTombes` ne traverse jamais.** C'est la liste des pièges tombés,
    // en clair — « la légende prise pour des avis » —, et la phrase la plus
    // utile que le jeu produise. Elle appartient à qui relance l'outil.
    const part = (quelle) => (quelle && typeof quelle === "object") ? quelle : {};
    const releve = part(bilan.rappel);
    const precision = part(bilan.precision);
    const pieges = part(bilan.pieges);

    return {
      quoi: MESURE.JEU_DE_REFERENCE,
      combien: unNombre(bilan.documents) ?? 0,
      bilan: {
        ...queLesNombres({
          attendus: releve.sur,
          trouves: releve.combien,
          rates: (unNombre(releve.sur) ?? 0) - (unNombre(releve.combien) ?? 0),
          // **Ce qui est inventé, séparément de ce qui manque.** Les deux
          // appellent des corrections opposées : l'un se corrige en lisant
          // mieux, l'autre en lisant moins.
          inventes: (unNombre(precision.sur) ?? 0) - (unNombre(precision.combien) ?? 0),
          pieges: pieges.sur,
          piegesEvites: pieges.combien
        }),
        // Une étape par étape, et jamais leur somme : une lecture juste sur la
        // forme et fausse sur les relevés n'est pas « à 93 % ».
        etapes: queLesNombres({
          structure: part(bilan.structure).part,
          legende: part(bilan.legendeRappel).part,
          releve: releve.part,
          precision: precision.part,
          marque: part(bilan.marque).part,
          pieges: pieges.part
        })
      }
    };
  }

  if (texte(quoi) === MESURE.INVARIANTS) {
    // Les invariants sont posés par les deux premiers outils, et leur compte
    // arrive dans leur bilan. On les dépose à part parce qu'ils répondent à une
    // autre question : non « la lecture est-elle juste » mais « est-elle
    // possible » — et une lecture impossible se corrige avant tout le reste.
    const poses = unNombre(bilan.lecturesEprouvees) ?? unNombre(bilan.invariants);
    if (poses === null) return null;

    return {
      quoi: MESURE.INVARIANTS,
      combien: poses,
      bilan: queLesNombres({
        invariants: poses,
        invariantsTombes: bilan.invariantsTombes
      })
    };
  }

  return null;
}

/**
 * Où déposer, lu dans l'environnement.
 *
 * `null` quand il manque quelque chose, **et le dépôt ne devient alors pas une
 * erreur** : lancer un outil sans vouloir rien déposer est le cas normal. Un
 * outil qui tomberait faute de jeton ferait qu'on cesse de le lancer.
 */
export function ouDeposer(environnement = {}) {
  const url = texte(environnement.SUPABASE_URL);
  const jeton = texte(environnement.SUPABASE_JETON);
  const cle = texte(environnement.SUPABASE_CLE_PUBLIQUE) || jeton;
  if (!url || !jeton) return null;
  return { url: url.replace(/\/+$/, ""), jeton, cle };
}

/**
 * Poser un bilan dans `mesures_de_justesse`, par la fonction de la base.
 *
 * **Par `deposer_une_mesure` et non par un `insert`**, pour que le bornage de la
 * base s'applique : c'est elle qui décide quelles clés existent, et un outil qui
 * veut montrer un chiffre neuf passe par une migration — donc par une relecture.
 *
 * `appeler` est injecté pour que le câblage s'éprouve sans réseau. Le réseau
 * lui-même reste non éprouvé, et c'est dit.
 *
 * @returns {Promise<{ok: boolean, id?: string, motif?: string}>}
 */
export async function deposerUnBilan({
  ou = null, quoi = "", procede = "", bilan = null, appeler = null
} = {}) {
  const verse = leBilanAVerser(quoi, bilan);
  if (!verse) return { ok: false, motif: "rien à déposer pour cet outil" };
  if (!ou?.url || !ou?.jeton) return { ok: false, motif: "ni URL ni jeton" };

  const envoyer = appeler ?? parLeReseauDeLaBase;
  try {
    const id = await envoyer(ou, {
      p_quoi: verse.quoi,
      p_procede: texte(procede),
      p_combien: verse.combien,
      p_bilan: verse.bilan
    });
    return { ok: true, id: texte(id) };
  } catch (erreur) {
    // **Un dépôt raté ne fait pas tomber l'outil.** La mesure a eu lieu, elle
    // s'est affichée, et c'est ce qui compte ; perdre la mesure parce que la
    // console n'était pas joignable serait le plus mauvais des échanges.
    return { ok: false, motif: texte(erreur?.message) || "dépôt refusé" };
  }
}

/** L'aller-retour, **non éprouvé contre un vrai serveur**. */
async function parLeReseauDeLaBase(ou, corps) {
  const rendu = await fetch(`${ou.url}/rest/v1/rpc/deposer_une_mesure`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Supabase demande les deux : la clé publique identifie le projet, le
      // jeton identifie la personne. C'est le jeton qui porte le courriel que
      // `est_administrateur()` regarde.
      apikey: ou.cle,
      Authorization: `Bearer ${ou.jeton}`
    },
    body: JSON.stringify(corps)
  });
  if (!rendu.ok) {
    throw new Error(`la base a répondu ${rendu.status} ${texte(await rendu.text()).slice(0, 200)}`);
  }
  return rendu.json();
}

/**
 * Ce qu'un outil dit dans son terminal après avoir déposé.
 *
 * **Un dépôt silencieux est pire qu'aucun dépôt** : on croirait la console à
 * jour alors qu'elle ne l'est pas, et l'on chercherait l'erreur à l'écran.
 */
export function direLeDepot(rendu = null, { ou = null } = {}) {
  if (!ou) {
    return "Rien n'a été déposé dans la console : SUPABASE_URL et SUPABASE_JETON "
      + "ne sont pas dans l'environnement. La mesure ci-dessus reste vraie ; elle "
      + "n'est simplement lue par personne d'autre.";
  }
  if (rendu?.ok) return `Bilan déposé dans la console (${rendu.id}).`;
  return `Le bilan n'a PAS été déposé : ${rendu?.motif ?? "motif inconnu"}. `
    + "La mesure ci-dessus reste vraie ; la console ne la verra pas.";
}
