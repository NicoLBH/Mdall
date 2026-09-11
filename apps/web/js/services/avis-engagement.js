/**
 * Ce qu'une fusion transforme en engagement.
 *
 * ## Où la confirmation a lieu
 *
 * `services/avis-liaison.js` **propose** qu'un avis porte sur une valeur. Ce
 * fichier dit ce qu'il advient de cette proposition : elle ne devient un
 * engagement qu'après la fusion, c'est-à-dire **après qu'un humain a signé la
 * proposition qui la portait**.
 *
 * La signature est donc la confirmation, et il n'y a pas de second geste : ni
 * file d'attente, ni écran de validation, ni relance (`docs/fondamentaux.md`,
 * règle 12). Quelqu'un lit la liste avant de signer, et ce qu'il signe entre.
 *
 * ## Ce qui n'entre pas
 *
 * Un avis qu'on n'a pas su accrocher entre **quand même** en mémoire — c'est un
 * fait du projet —, mais il n'écrit aucun engagement. On le voit alors dans la
 * mémoire sans qu'il couvre quoi que ce soit, ce qui est la vérité.
 *
 * Un avis **refusé** à la revue n'écrit rien non plus : ce que quelqu'un a
 * écarté ne couvre rien.
 */

import { ACT, acteQuiCouvre } from "./memoire-actes.js";
import { liaisonDeLAvis } from "./avis-liaison.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce que le suivi des avis écrit en mémoire : `kind: "avis"`. */
const AVIS = "avis";

/**
 * Les actes à écrire après une fusion, d'après ce qu'elle vient d'écrire.
 *
 * Pure : elle ne parle à personne. On lui passe les lignes écrites, elle rend
 * les actes.
 *
 * @param {object} options
 * @param {object[]} options.ecrites les affirmations que la fusion a écrites
 * @param {string} [options.par] qui a signé la proposition — **pas** qui a émis
 *   l'avis : l'un a cliqué, l'autre engage sa responsabilité
 * @param {string} [options.le] la date de la fusion
 * @returns {object[]} les actes, prêts à être écrits
 */
export function engagementsDeLaFusion({ ecrites = [], par = "", le = "" } = {}) {
  const quand = texte(le) || new Date().toISOString();

  return (Array.isArray(ecrites) ? ecrites : [])
    .flatMap((ligne) => {
      // Une ligne écartée ne couvre rien : ce que quelqu'un a refusé ne peut pas
      // engager qui que ce soit.
      if (texte(ligne?.status) === "rejected") return [];

      // Un avis porte souvent sur **plusieurs** parties de l'ouvrage : un
      // engagement par portée. Les lignes écrites avant que la liste existe
      // portent une chaîne, et se lisent pareil.
      const portees = (Array.isArray(ligne?.payload?.porteSur)
        ? ligne.payload.porteSur
        : [ligne?.payload?.porteSur]).map(texte).filter(Boolean);

      return portees.map((porteSur) => ({
        project_id: texte(ligne?.project_id) || null,
        // La valeur examinée — donc **cette version-là** de la valeur. C'est ce
        // qui fait qu'un engagement tombe tout seul quand elle est remplacée.
        assertion_id: porteSur,
        verdict: ACT.COUVRE,
        proposed_value: null,
        // Ce qu'on lit dans la liste des engagements : la teneur de l'avis et
        // l'organisme qui l'a rendu. Jamais « visa n° 4 », qui ne dit rien.
        note: noteDeLAvis(ligne),
        // L'avis lui-même : c'est par lui qu'on remonte au rapport et à sa page.
        source_assertion_id: texte(ligne?.id) || null,
        source_document_id: texte(ligne?.payload?.documentId) || null,
        source_page: Number.isFinite(Number(ligne?.payload?.page)) ? Number(ligne.payload.page) : null,
        declared_by: texte(par) || null,
        created_at: quand
      }));
    });
}

/**
 * Ce qu'un engagement dit de lui-même, en une ligne.
 *
 * L'organisme d'abord : c'est lui qui engage sa responsabilité, et c'est la
 * première chose qu'on cherche en relisant. `emisPar` n'est **pas**
 * `declared_by` — l'un a rendu l'avis, l'autre a cliqué.
 */
function noteDeLAvis(ligne) {
  const organisme = texte(ligne?.payload?.emisPar);
  const teneur = texte(ligne?.payload?.value ?? ligne?.payload?.valeur);
  return [organisme, teneur].filter(Boolean).join(" — ") || null;
}

/**
 * Les engagements que portent les avis **déjà en mémoire**.
 *
 * ## Le trou que ceci ferme, et c'était le vrai
 *
 * Il y a deux chemins par lesquels un avis entre en mémoire, et ils ne se
 * ressemblent pas :
 *
 *  - le **suivi des avis BC**, qui existait bien avant tout ceci et qui écrit
 *    des lignes `kind: "avis"` — « Avis — Zone de neige », appréciation « F »,
 *    extrait « Région A2, altitude 109 m ». C'est celui qu'on utilise ;
 *  - le versement construit pour les engagements, qui écrit un `constat` et
 *    porte `porteSur`.
 *
 * Seul le second écrivait des engagements. Le premier, qui porte pourtant dans
 * `payload.title` **exactement le nom du sujet** — « Zone de neige » —,
 * n'accrochait rien. Résultat : des avis en mémoire, une variante qui change la
 * valeur, et aucun jalon. C'était la quatrième cause du silence, indépendante
 * des trois autres, et la seule qui restait.
 *
 * ## Pourquoi on **dérive** au lieu d'écrire
 *
 * Écrire des actes pour ces avis demanderait de les reverser tous : ceux qui
 * sont en mémoire ont été fusionnés par du code qui ne connaissait pas les
 * engagements, et aucune écriture rétroactive ne les rattraperait.
 *
 * On ne stocke donc rien. C'est la doctrine du projet, celle de l'état d'une
 * hypothèse comme celle du rang : **déduit, jamais stocké**. Un avis en mémoire
 * qui nomme un sujet couvre ce sujet, et cela se recalcule à chaque lecture —
 * pour ce qui est déjà là comme pour ce qui entrera.
 *
 * ## Ce qui l'empêche de compter deux fois
 *
 * Un avis pour lequel un acte a **déjà** été écrit ne dérive rien : l'acte
 * explicite fait foi, et les deux se compteraient comme deux examens.
 *
 * ## Ce que le rang y perd, et pourquoi on ne triche pas
 *
 * Ces lignes ne portent pas le nom du bureau — le suivi ne l'écrivait pas. Le
 * rang reste donc « examinée dans le projet » plutôt que « par un bureau de
 * contrôle » : un rang qui reposerait sur une pièce qu'on n'a pas su attribuer
 * dirait « bureau de contrôle » sans pouvoir nommer lequel
 * (`services/ce-qui-couvre.js`). Il montera de lui-même pour les avis relus par
 * le modèle, qui, eux, nomment l'organisme.
 *
 * @returns {object[]} des actes **dérivés**, jamais écrits en base
 */
export function engagementsDerivesDesAvis({ assertions = [], actes = [] } = {}) {
  const enVigueur = (Array.isArray(assertions) ? assertions : [])
    .filter((assertion) => !texte(assertion?.superseded_by));

  // Les avis pour lesquels quelqu'un a déjà écrit un acte : on ne double pas.
  const dejaEcrits = new Set(
    (Array.isArray(actes) ? actes : [])
      .filter(acteQuiCouvre)
      .map((acte) => texte(acte?.source_assertion_id))
      .filter(Boolean)
  );

  const derives = [];

  for (const avis of enVigueur) {
    if (texte(avis?.kind) !== AVIS) continue;
    if (dejaEcrits.has(texte(avis?.id))) continue;

    const intitule = texte(avis?.payload?.title);
    if (!intitule) continue;

    // La même reconnaissance que pour un avis qu'on verse : l'intitulé contre
    // les sujets de la mémoire, dans les deux sens, et toutes les portées.
    const { assertions: portees } = liaisonDeLAvis({
      avis: { title_raw: intitule },
      assertions: enVigueur
    });

    for (const portee of portees) {
      derives.push({
        project_id: texte(avis?.project_id) || null,
        assertion_id: texte(portee?.id),
        verdict: ACT.COUVRE,
        proposed_value: null,
        note: noteDeLAvisEnMemoire(avis),
        source_assertion_id: texte(avis?.id) || null,
        source_document_id: texte(avis?.payload?.sourceId) || null,
        source_page: Number.isFinite(Number(avis?.payload?.page)) ? Number(avis.payload.page) : null,
        declared_by: texte(avis?.decided_by) || null,
        created_at: texte(avis?.decided_at) || texte(avis?.created_at) || null,
        /** Dérivé d'un avis en mémoire, pas écrit : rien à migrer, rien à nettoyer. */
        derive: true
      });
    }
  }

  return derives;
}

/**
 * Ce qu'un avis du suivi dit, en une ligne.
 *
 * L'appréciation et **l'extrait** : « F — Région A2, altitude 109 m ». C'est
 * l'extrait qui dit ce que le bureau a examiné, et sans lui l'engagement ne se
 * vérifie pas.
 */
function noteDeLAvisEnMemoire(avis) {
  const evidence = avis?.payload?.evidence;
  const extrait = typeof evidence === "string" ? evidence : texte(evidence?.text);

  return [texte(avis?.payload?.opinion), extrait].filter(Boolean).join(" — ") || null;
}
