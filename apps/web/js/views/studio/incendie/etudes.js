/**
 * Les études incendie d'un projet : les nommer, les reconnaître, les comparer.
 *
 * ## Ce qui se conserve
 *
 * Les **réponses**, et elles seules. Un degré coupe-feu enregistré serait une
 * vérité gelée le jour où on l'a lue : le référentiel progresse — une règle
 * mieux dépouillée, un commentaire ajouté — et l'écran afficherait encore
 * l'ancienne conclusion sans que rien ne le dise. Ce qui a été décidé, ce sont
 * les réponses ; le verdict se refait à chaque ouverture.
 *
 * ## Ce que l'empreinte sert à savoir
 *
 * Recalculer sans rien garder laisse passer le seul cas qui compte : le
 * référentiel a changé, et **cette étude-ci** ne conclut plus la même chose. On
 * garde donc une empreinte des conclusions — une chaîne courte, dérivée
 * d'elles, dont on ne peut pas les relire. Elle ne fait jamais foi ; elle
 * permet seulement de dire « quelque chose a changé depuis votre dernier
 * passage », ce qu'un ingénieur a le droit de savoir avant de signer.
 *
 * Elle ne dit pas **quoi** a changé, et c'est volontaire pour ce tour : il
 * faudrait pour cela garder les conclusions, c'est-à-dire exactement ce qu'on a
 * décidé de ne pas conserver.
 */

import { escapeHtml } from "../../../utils/escape-html.js";
import { svgIcon } from "../../../ui/icons.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Ce qu'une conclusion vaut, réduit à ce qui se compare.
 *
 * Le titre du module, sa phrase de justification, l'article : tout cela peut
 * être réécrit sans que la conclusion change. Ne comptent que l'identité du
 * module, son statut, et ce qu'il produit.
 */
function traitDUnModule(module) {
  const valeur = module?.valeur;
  const dit = valeur && typeof valeur === "object" ? JSON.stringify(valeur) : String(valeur ?? "");
  return `${texte(module?.id)}${texte(module?.statut)}${dit}${module?.sansObjet ? "1" : "0"}`;
}

/**
 * L'empreinte des conclusions d'une étude.
 *
 * FNV-1a sur les traits, triés : deux lectures du même cas donnent la même
 * chaîne, et l'ordre dans lequel le serveur a rendu les modules n'y entre pas.
 * Ce n'est pas une signature — rien ici ne cherche à résister à quelqu'un ;
 * c'est un témoin de changement, et il tient en huit caractères.
 */
export function empreinteDesConclusions(modules = []) {
  const traits = (Array.isArray(modules) ? modules : [])
    .filter((module) => texte(module?.id))
    .map(traitDUnModule)
    .sort();
  if (!traits.length) return "";

  let empreinte = 0x811c9dc5;
  for (const caractere of traits.join("")) {
    empreinte ^= caractere.codePointAt(0);
    empreinte = Math.imul(empreinte, 0x01000193) >>> 0;
  }
  return empreinte.toString(16).padStart(8, "0");
}

/**
 * Ce qui a bougé depuis le dernier enregistrement.
 *
 * Une étude enregistrée avant que l'empreinte n'existe n'en porte pas : on ne
 * dit alors rien plutôt que d'annoncer un changement qu'on n'a pas constaté.
 */
export function ceQuiAChange(etude, modules = [], referentiel = "") {
  const avant = texte(etude?.empreinte);
  if (!avant) return { conclusions: false, referentiel: false };

  return {
    conclusions: avant !== empreinteDesConclusions(modules),
    referentiel: Boolean(texte(etude?.referentiel)) && texte(etude?.referentiel) !== texte(referentiel)
  };
}

/**
 * Un nom qui n'est pas déjà pris.
 *
 * « Étude du 4 septembre 2026 », puis « (2) » si l'on en ouvre une seconde le
 * même jour. Nommer par la date plutôt que « Étude 1 » dit quelque chose :
 * c'est ce qu'on cherche quand on revient trois semaines plus tard.
 */
export function titreParDefaut(etudes = [], le = new Date()) {
  const jour = le.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const base = `Étude du ${jour}`;
  const pris = new Set((Array.isArray(etudes) ? etudes : []).map((etude) => texte(etude?.titre)));

  if (!pris.has(base)) return base;
  for (let rang = 2; rang < 100; rang += 1) {
    const essai = `${base} (${rang})`;
    if (!pris.has(essai)) return essai;
  }
  return base;
}

/** Le rang d'une étude qu'on ajoute : après les autres. */
export function rangSuivant(etudes = []) {
  return (Array.isArray(etudes) ? etudes : [])
    .reduce((haut, etude) => Math.max(haut, Number(etude?.rang) || 0), 0) + 1;
}

/**
 * Laquelle ouvrir quand on arrive sur l'écran.
 *
 * La dernière touchée : c'est celle sur laquelle on travaillait, et c'est ce
 * qu'on vient reprendre. Aucune quand il n'y en a aucune — l'écran s'ouvre
 * alors sur un questionnaire vierge, comme avant.
 */
export function etudeAOuvrir(etudes = []) {
  const liste = (Array.isArray(etudes) ? etudes : []).filter((etude) => texte(etude?.id));
  if (!liste.length) return null;
  return [...liste].sort((a, b) =>
    String(b?.updated_at ?? "").localeCompare(String(a?.updated_at ?? "")))[0];
}

/** Combien de réponses une étude porte. C'est ce qui la décrit le mieux d'un coup d'oeil. */
export function compterLesReponses(etude) {
  const reponses = etude?.reponses;
  return reponses && typeof reponses === "object" ? Object.keys(reponses).length : 0;
}

/**
 * La barre des études.
 *
 * Elle ne s'affiche que sous le questionnaire : c'est là qu'on répond, donc là
 * qu'on change d'hypothèse. La mettre au-dessus des onglets la ferait suivre
 * jusque dans la notice, où elle ne veut plus rien dire.
 */
export function dessinerLesEtudes({
  etudes = [], courante = "", enregistrement = "", change = null, reliee = true
} = {}) {
  if (!reliee) {
    return `
      <div class="incendie-etudes incendie-etudes--hors-base">
        <p class="gh-text-muted">Ce projet n'est pas encore relié à la base : les réponses restent
        dans cette page et ne seront pas retrouvées à la prochaine ouverture.</p>
      </div>
    `;
  }

  const lignes = etudes.map((etude) => {
    const active = texte(etude.id) === texte(courante);
    const nombre = compterLesReponses(etude);
    return `
      <button type="button" class="incendie-etude${active ? " est-active" : ""}"
              data-incendie-etude="${escapeHtml(texte(etude.id))}"
              aria-pressed="${active}" title="${escapeHtml(texte(etude.titre) || "Étude sans nom")}">
        <span class="incendie-etude__nom">${escapeHtml(texte(etude.titre) || "Étude sans nom")}</span>
        <span class="incendie-etude__compte">${nombre} réponse${nombre > 1 ? "s" : ""}</span>
      </button>
    `;
  }).join("");

  return `
    <div class="incendie-etudes">
      <div class="incendie-etudes__liste">
        ${lignes || `<p class="gh-text-muted">Aucune étude enregistrée : la première réponse en ouvrira une.</p>`}
        <button type="button" class="incendie-etude incendie-etude--neuve" data-incendie-etude-neuve="1"
                title="Ouvrir une autre hypothèse, sans toucher à celle-ci">
          ${svgIcon("plus", { width: 12, height: 12 })}<span>Nouvelle étude</span>
        </button>
      </div>
      <div class="incendie-etudes__barre">
        ${courante ? `
          <button type="button" class="incendie-etude__geste" data-incendie-etude-renommer="1">Renommer</button>
          <button type="button" class="incendie-etude__geste incendie-etude__geste--danger"
                  data-incendie-etude-supprimer="1">Supprimer</button>
        ` : ""}
        <span class="incendie-etudes__etat">${escapeHtml(enregistrement)}</span>
      </div>
      ${change?.conclusions ? `
        <p class="incendie-etudes__alerte">
          Le référentiel a changé depuis le dernier enregistrement de cette étude : au moins une
          conclusion n'est plus la même. Ce qui s'affiche vient d'être recalculé — c'est lui qui fait foi.
          <button type="button" class="incendie-etude__geste" data-incendie-etude-vu="1">J'ai vu</button>
        </p>` : ""}
    </div>
  `;
}
