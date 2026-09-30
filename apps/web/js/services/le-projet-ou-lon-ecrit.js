/**
 * Dans quel projet écrit-on ?
 *
 * ## Le défaut que ce module répare, et ce qu'il coûtait
 *
 * Un dépôt de vingt-quatre mails s'est arrêté sur ceci, à l'écran :
 *
 *     project_document_folders insert failed (403) : {"code":"42501",
 *     "message":"new row violates row-level security policy …"}
 *
 * La base refusait d'écrire dans ce projet-là. Elle avait raison : l'identifiant
 * qu'on lui envoyait ne désignait **aucun projet que cette session peut lire**.
 * Il venait d'une concordance tenue dans le navigateur — une correspondance entre
 * l'identifiant d'écran d'un projet et son identifiant en base —, et cette concordance
 * était cru sur parole.
 *
 * Trois façons d'y trouver un identifiant périmé, toutes ordinaires :
 *
 *   * le projet a été supprimé en base et recréé : la concordance garde l'ancien ;
 *   * on s'est connecté avec un autre compte : la concordance, elle, est commune au
 *     navigateur, et il répond pour le compte précédent ;
 *   * le projet n'a pas de propriétaire en base (`projects.owner_id` vide) :
 *     `projects_owner_only` ne le rend à personne, pas même à celui qui l'a
 *     créé.
 *
 * Dans les trois cas, **la lecture ne dit rien** : une requête filtrée sur un
 * projet qu'on ne peut pas lire rend zéro ligne, sans erreur. C'est l'écriture
 * qui parle, et elle parle en SQL. D'où l'enchaînement qu'on a vu : aucun
 * dossier « Mails » à l'accueil de Fichiers (la lecture n'a rien rendu), puis un
 * 403 brut (l'écriture a refusé). Ne pas savoir n'autorise pas à prétendre qu'il
 * n'y a rien (règle 5) — et une concordance qu'on ne vérifie pas est une intention
 * (règle 12).
 *
 * ## La garantie, et elle tient en une phrase
 *
 * **On ne rend un identifiant de projet qu'après l'avoir relu dans la base sous
 * la session en cours.** Relu, c'est-à-dire : la base a rendu cette ligne, donc
 * la politique de lecture l'accorde, donc l'écriture l'accordera aussi — les
 * deux se décident sur le même fait, `owner_id = auth.uid()`.
 *
 * Et ce qui est refusé est **oublié** : une concordance qui garde une réponse fausse
 * la redonnera demain.
 *
 * ## Pourquoi ce module est pur, et pourquoi il a des portes
 *
 * La résolution vivait à deux endroits, écrite deux fois mot pour mot
 * (`project-supabase-sync.js`, `profile-supabase-sync.js`), dans deux modules
 * qui importent le SDK Supabase au premier niveau — donc que rien n'exerçait
 * hors navigateur. Deux copies d'une décision finissent par en prendre deux
 * différentes (règle 4), et celle-ci décide dans quel chantier on écrit.
 *
 * Elle vit donc ici, une fois, et les allers-retours avec la base entrent par
 * `portes` : en épreuve on les remplace, et le parcours s'exécute pour de bon.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Un identifiant de projet en base est un UUID, et rien d'autre.
 *
 * Ce n'est pas une coquetterie de forme : l'identifiant d'écran d'un projet
 * n'en est pas un, et il a été envoyé à la base à la place du bon
 * (`lecture-des-mails.js`). Le distinguer est la seule façon de refuser tôt,
 * avec une phrase, plutôt que tard, avec un code SQL.
 */
export function cestUnIdDeProjet(valeur) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(texte(valeur));
}

/** Ce que la concordance dit de ce projet — une piste, pas une réponse. */
export function leProjetDeLaConcordance(concordance, frontendId) {
  const cle = texte(frontendId);
  if (!cle) return "";
  const dit = texte(concordance?.[cle]);
  return cestUnIdDeProjet(dit) ? dit : "";
}

/**
 * La concordance sans cette entrée-là.
 *
 * Rend une concordance neuve plutôt que de raturer celle qu'on a reçue : deux écrans
 * partagent le même objet, et l'un modifierait ce que l'autre est en train de
 * lire.
 */
export function laConcordanceSansCeProjet(concordance, frontendId) {
  const cle = texte(frontendId);
  const suite = { ...(concordance && typeof concordance === "object" ? concordance : {}) };
  if (cle) delete suite[cle];
  return suite;
}

/**
 * Le projet où l'on écrit, relu dans la base.
 *
 * ## L'ordre des pistes, et pourquoi il est celui-là
 *
 * Du moins coûteux au plus coûteux, mais **aucune piste n'est crue** : chacune
 * passe par `relire`, qui ne rend l'identifiant que si la base l'a rendu.
 *
 *   1. la concordance du navigateur — gratuite, et la plus susceptible d'être périmée ;
 *   2. ce que l'écran porte déjà — l'identifiant de base annoncé par le store ;
 *   3. le nom du projet — une recherche, et la base ne rend que ce qu'on lit.
 *
 * La troisième n'a pas besoin de `relire` : ce qu'une recherche rend est déjà
 * passé par la politique de lecture. Elle est quand même relue — non pour
 * vérifier, mais parce qu'un seul chemin de sortie vaut mieux que deux, dont un
 * qu'aucune épreuve ne suit.
 *
 * ## « Refusé » et « pas de réponse » ne sont pas la même chose
 *
 * `relire` rend trois choses, et c'est délibéré : l'identifiant quand la base
 * l'accorde, `""` quand elle le refuse, **`null` quand elle n'a pas répondu**.
 *
 * Les confondre coûterait précisément ce qu'on essaie de réparer, mais dans
 * l'autre sens : un instant sans réseau effacerait une concordance juste, et le
 * lendemain il faudrait retrouver le projet par son nom — en admettant qu'il en
 * ait un. On ne dit `aOublier` que d'un refus, jamais d'un silence (règle 5).
 *
 * ## Ce qu'on rend quand on ne sait pas
 *
 * `{ id: "", ... }`, et surtout pas le dernier identifiant vu. Écrire dans un
 * projet qu'on croit être le bon est la seule issue pire que ne pas écrire.
 *
 * @param {object} options
 * @param {string} [options.frontendId] l'identifiant d'écran du projet courant
 * @param {object} [options.concordance] la correspondance tenue par le navigateur
 * @param {string[]} [options.pistes] les identifiants de base que l'écran porte
 * @param {string} [options.nom] le nom du projet, pour la dernière piste
 * @param {{relire: Function, parLeNom?: Function}} options.portes
 * @returns {Promise<{id: string, source: string, aOublier: boolean, injoignable: boolean}>}
 */
export async function leProjetOuLonEcrit({
  frontendId = "", concordance = {}, pistes = [], nom = "", portes = null
} = {}) {
  const rien = { id: "", source: "", aOublier: false, injoignable: false };
  if (typeof portes?.relire !== "function") return rien;

  /** `null` : la base n'a pas répondu. `""` : elle a refusé. */
  const relu = async (candidat) => {
    if (!cestUnIdDeProjet(candidat)) return "";
    const rendu = await portes.relire(candidat);
    if (rendu === null || rendu === undefined) return null;
    const dit = texte(rendu);
    return cestUnIdDeProjet(dit) ? dit : "";
  };

  const deLaConcordance = leProjetDeLaConcordance(concordance, frontendId);
  if (deLaConcordance) {
    const confirme = await relu(deLaConcordance);
    if (confirme === null) return { ...rien, injoignable: true };
    if (confirme) return { id: confirme, source: "concordance", aOublier: false, injoignable: false };
    // **La concordance s'est trompée, et c'est ici que cela se sait.** On continue à
    // chercher, et l'appelant oubliera cette entrée : la garder ferait revenir
    // le même refus au prochain dépôt.
    rien.aOublier = true;
  }

  for (const piste of (Array.isArray(pistes) ? pistes : [])) {
    const confirme = await relu(piste);
    if (confirme === null) return { ...rien, injoignable: true };
    if (confirme) return { id: confirme, source: "ecran", aOublier: rien.aOublier, injoignable: false };
  }

  if (texte(nom) && typeof portes.parLeNom === "function") {
    const trouve = texte(await portes.parLeNom(texte(nom)));
    const confirme = await relu(trouve);
    if (confirme === null) return { ...rien, injoignable: true };
    if (confirme) return { id: confirme, source: "nom", aOublier: rien.aOublier, injoignable: false };
  }

  return rien;
}

/**
 * Ce qu'on dit d'un refus de la base, en français.
 *
 * ## Pourquoi le traduire, plutôt que le montrer
 *
 * L'écran a montré ceci, tel quel, à quelqu'un qui déposait ses mails :
 *
 *     project_document_folders insert failed (403) : {"code":"42501", …}
 *
 * Ce n'est pas une information, c'est un constat d'impuissance. Le lecteur ne
 * peut rien en faire, et surtout il ne peut pas savoir que **rien n'a été
 * rangé** — ce qui est la seule chose qui le concerne.
 *
 * ## Ce qu'on ne fait pas ici
 *
 * On ne devine pas. Un refus qu'on ne reconnaît pas garde son texte : une
 * phrase rassurante posée sur une cause inconnue empêcherait de la trouver
 * (règle 5). Seuls les deux refus dont on connaît la cause sont traduits.
 */
export function leMotDunRefus(erreur) {
  const brut = texte(erreur?.message ?? erreur);
  if (!brut) return "cause inconnue";

  const dit = brut.toLowerCase();
  const droitRefuse = dit.includes("42501")
    || dit.includes("row-level security")
    || dit.includes("violates row-level security policy");

  if (droitRefuse) {
    return "ce projet n'accepte pas d'écriture depuis votre session : rien n'a été rangé";
  }

  if (dit.includes("22p02") || dit.includes("invalid input syntax for type uuid")) {
    return "ce projet n'a pas été reconnu par la base : rien n'a été rangé";
  }

  return brut;
}
