/**
 * L'espace de raisonnement : un poste de travail, pas un panneau.
 *
 * ## Ce qu'il remplace
 *
 * Deux fenêtres côte à côte — le code à gauche, les valeurs à droite — chacune
 * avec son ascenseur. Elles se lisaient ligne à ligne, ce qui est exactement ce
 * qu'il faut pour vérifier une condition, et **rien ne garantissait qu'elles
 * restent alignées** : une ligne qui repliait à droite et pas à gauche décalait
 * tout le reste, et l'on comparait la condition d'une ligne à la valeur d'une
 * autre sans le voir. Une erreur de lecture silencieuse, dans l'écran dont le
 * seul travail est de rendre le raisonnement vérifiable.
 *
 * Le code et les valeurs sont donc **une seule grille**. Le décalage n'est plus
 * improbable, il est impossible : c'est la même rangée.
 *
 * ## Sa forme
 *
 * ```
 * ┌───────────────────────────────────────────────┬──────────┐
 * │  le schéma des dépendances                    │          │
 * ├───────────────────────────────────────────────│ la       │
 * │  ce que le projet dit  │ n° │  le raisonnement │ discussion│
 * └───────────────────────────────────────────────┴──────────┘
 * ```
 *
 * Les valeurs sont **à gauche**, le code à droite : on lit d'abord ce que le
 * projet dit, puis pourquoi. L'inverse obligeait à traverser cent caractères de
 * code avant d'atteindre la valeur qu'on était venu vérifier.
 *
 * Les numéros de ligne sont **au milieu**. Ils séparent les deux lectures, et
 * ce sont eux qu'on saisit pour changer le partage : la frontière est là où
 * elle se voit.
 *
 * Les valeurs et les numéros restent **collés à gauche** pendant qu'on fait
 * défiler le code. Une citation d'arrêté fait mille pixels de large ; sans
 * cela, la lire emportait les valeurs hors de l'écran, et l'on se retrouvait
 * devant du code sans savoir ce qu'il vaut — c'est-à-dire devant la moitié de
 * ce qu'on était venu voir.
 *
 * La discussion prend toute la hauteur, schéma compris : elle porte un fil de
 * messages, et une colonne haute de la moitié de l'écran n'en montre que deux.
 *
 * Le schéma commande le code : cliquer une carte y fait défiler jusqu'à la
 * fonction. C'est le geste qu'on fait vingt fois — « et celle-là, elle a lu
 * quoi ? » — et le faire à la molette sur cent lignes fait perdre le fil.
 *
 * ## Pourquoi une colonne pour le copilote
 *
 * Parce que la question qu'on se pose devant une chaîne fausse — « pourquoi
 * l'arrêté dit-il ça ? », « qu'est-ce qui change si la hauteur passe à 28 ? » —
 * n'a pas de réponse dans l'écran. Elle en avait une deux onglets plus loin,
 * dans l'Atelier, ce qui voulait dire perdre la chaîne pour aller la poser.
 *
 * C'est **le composant de l'Atelier**, monté ici : même fil, mêmes
 * discussions, même modèle. Une seconde salle de discussion aurait deux
 * historiques et deux comportements, et l'on ne saurait plus où l'on a posé
 * quoi.
 */

import { escapeHtml } from "../utils/escape-html.js";
import { svgIcon } from "../ui/icons.js";
import { dessinerGrapheLiaisons } from "./ui/graphe-liaisons.js";
import { renderJetons } from "./ui/code-mdall.js";
import { profondeursDuRetrait, niveauxDesPaires } from "../services/mdall-retrait.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Les bornes des zones qu'on peut tirer. En deçà, elles ne montrent plus rien. */
export const BORNES = {
  schema: { min: 160, max: 720, defaut: 300 },
  etat: { min: 220, max: 760, defaut: 380 },
  copilote: { min: 280, max: 620, defaut: 360 }
};

/**
 * Ce que la colonne de gauche montre : les deux, ou l'un des deux.
 *
 * ## Pourquoi un seul bouton, et non deux
 *
 * Le schéma et le code se partagent la même colonne : ils ne se masquent pas
 * indépendamment, ils **se relaient**. Deux bascules séparées auraient permis
 * de fermer les deux, et l'écran serait devenu vide — ce qui n'arrive dans
 * aucun logiciel qu'on respecte.
 *
 * Le bouton tourne donc sur trois états, comme un sélecteur : les deux, le code
 * seul, le schéma seul, puis les deux à nouveau. Il ne peut pas produire le
 * vide, parce que le vide n'est pas dans la liste.
 *
 * L'icône dit l'état, pas le geste : la part pleine est le panneau affiché, et
 * le filet marque la place de celui qui ne l'est pas.
 */
export const VUES = [
  { cle: "les-deux", icone: "panneaux-les-deux", schema: true, code: true,
    nom: "le schéma et le code" },
  { cle: "code-seul", icone: "panneaux-code-seul", schema: false, code: true,
    nom: "le code seul" },
  { cle: "schema-seul", icone: "panneaux-schema-seul", schema: true, code: false,
    nom: "le schéma seul" }
];

/** La vue courante, d'après ce que l'état porte. */
export function vueCourante(etat = {}) {
  const schema = etat.schemaOuvert !== false;
  const code = etat.codeOuvert !== false;
  return VUES.find((vue) => vue.schema === schema && vue.code === code) ?? VUES[0];
}

/** Et la suivante, dans l'ordre du tour. */
export function vueSuivante(etat = {}) {
  const rang = VUES.indexOf(vueCourante(etat));
  return VUES[(rang + 1) % VUES.length];
}

/** Le sélecteur de la colonne de gauche, et la bascule de la discussion. */
function renderBasculesDesPanneaux(etat) {
  const vue = vueCourante(etat);
  const suivante = vueSuivante(etat);
  const discussion = etat.copiloteOuvert !== false;

  return `
    <button type="button" class="bouton-discret raison-espace__outil est-actif"
      data-raison-vue="${escapeHtml(suivante.cle)}"
      title="${escapeHtml(`Vous voyez ${vue.nom} — cliquez pour voir ${suivante.nom}`)}"
      aria-label="${escapeHtml(`Vous voyez ${vue.nom} — cliquez pour voir ${suivante.nom}`)}">
      ${svgIcon(vue.icone, { className: "octicon" })}
    </button>
    <button type="button" class="bouton-discret raison-espace__outil${discussion ? " est-actif" : ""}"
      data-raison-panneau="copiloteOuvert"
      aria-pressed="${discussion ? "true" : "false"}"
      title="${discussion ? "Masquer la discussion" : "Afficher la discussion"}"
      aria-label="${discussion ? "Masquer la discussion" : "Afficher la discussion"}">
      ${svgIcon(discussion ? "panneau-droite" : "panneau-droite-masque", { className: "octicon" })}
    </button>
  `;
}

/** L'état d'un espace, à sa première ouverture. */
export function espaceParDefaut() {
  return {
    carte: null,
    survol: null,
    zoom: 1,
    pleinEcran: false,
    // Le schéma et le code à l'ouverture, la discussion sur demande : elle
    // prendrait le tiers de l'écran à quelqu'un qui vient lire un raisonnement.
    schemaOuvert: true,
    codeOuvert: true,
    copiloteOuvert: false,
    /** La carte dont le code doit venir sous les yeux, au prochain rendu. */
    viser: null,
    hauteurSchema: BORNES.schema.defaut,
    largeurEtat: BORNES.etat.defaut,
    largeurCopilote: BORNES.copilote.defaut
  };
}

/** Ce que le projet dit d'une ligne, dit court. */
function renderEtat(entree) {
  if (!entree?.sujet) return "";
  if (entree.manquant) return `<span class="raison-grille__trou">personne ne l'a versée</span>`;

  return `<b>${escapeHtml(entree.valeur)}</b>${
    entree.zone ? `<span class="raison-grille__note">${escapeHtml(entree.zone)}</span>` : ""}${
    // Déduite, et non relevée : les confondre ferait prendre une conclusion de
    // règle pour un constat de terrain.
    entree.deduite ? `<span class="raison-grille__note">déduit</span>` : ""}`;
}

/**
 * Le code et les valeurs, en une grille.
 *
 * Trois cellules par rangée, dans l'ordre où l'œil les prend : le raisonnement,
 * son numéro, ce que le projet en dit. Un seul défilement horizontal pour les
 * trois — c'est le conteneur qui l'a, pas les colonnes.
 */
function renderGrille(lignes = [], trace = [], ancres = new Map()) {
  const paires = niveauxDesPaires(lignes);
  const retraits = profondeursDuRetrait(lignes);

  const rangees = lignes.map((ligne, rang) => {
    const dite = trace[rang] ?? {};
    const ancre = ancres.get(rang);

    // Les valeurs **à gauche**, le code à droite. On lit d'abord ce que le
    // projet dit, puis pourquoi : l'inverse obligeait à traverser cent
    // caractères de code avant d'atteindre la valeur qu'on était venu vérifier.
    return `
      <div class="raison-ligne${dite.manquant ? " raison-ligne--manquante" : ""}"
        ${ancre ? `data-raison-ancre="${escapeHtml(ancre)}"` : ""} data-raison-rang="${rang}">
        <span class="raison-ligne__etat">${renderEtat(dite)}</span>
        <span class="raison-ligne__num">${rang + 1}</span>
        <span class="raison-ligne__code code-retrait" style="--mdall-crans:${retraits[rang] ?? 0}">${
          renderJetons(ligne.jetons, { paires: paires.get(rang) })}</span>
      </div>
    `;
  }).join("");

  return `
    <div class="raison-grille">
      <div class="raison-ligne raison-ligne--tete">
        <span class="raison-ligne__etat">Ce que le projet dit aujourd'hui</span>
        <span class="raison-ligne__num raison-ligne__num--poignee" data-raison-poignee="etat"
          title="Tirez pour changer le partage" aria-label="Changer le partage entre les valeurs et le code">⋮</span>
        <span class="raison-ligne__code">Le raisonnement</span>
      </div>
      ${rangees}
    </div>
  `;
}

/**
 * L'espace entier.
 *
 * @param {object} options
 * @param {object} options.graphe les cartes et les liens
 * @param {object[]} options.lignes le code, ligne à ligne
 * @param {object[]} options.trace ce que le projet dit de chaque ligne
 * @param {Map<number,string>} options.ancres rang de ligne → carte du schéma
 * @param {string} options.resume la phrase de tête
 * @param {string} [options.titre] le constat dont on lit le raisonnement — en
 *   plein écran, sa barre de titre n'est plus là pour le dire
 * @param {string} [options.pastilles] ses caractéristiques, déjà rendues — pour
 *   la même raison
 * @param {object} options.etat ce que l'écran garde entre deux rendus
 */
export function renderEspaceDuRaisonnement({
  graphe = { noeuds: [], liens: [] }, lignes = [], trace = [], ancres = new Map(),
  resume = "", titre = "", pastilles = "", etat = espaceParDefaut()
} = {}) {
  const style = [
    `--raison-schema:${Math.round(etat.hauteurSchema)}px`,
    `--raison-etat:${Math.round(etat.largeurEtat)}px`,
    `--raison-copilote:${Math.round(etat.largeurCopilote)}px`
  ].join(";");

  return `
    <section class="raison-espace${etat.pleinEcran ? " est-plein-ecran" : ""}${
      etat.copiloteOuvert ? " est-accompagne" : ""}" style="${style}" data-raison-espace>
      <header class="raison-espace__barre">
        <b class="raison-espace__titre">Comment on en est arrivé là</b>
        ${/* En plein écran, la barre de titre du constat n'est plus là : sans
             son nom, on ne sait plus de quoi on lit le raisonnement. */""}
        ${titre ? `<span class="raison-espace__sujet">${escapeHtml(titre)}</span>` : ""}
        <span class="raison-espace__resume">${resume}</span>
        ${/* En plein écran, la barre de titre du constat n'est plus là : ses
             caractéristiques non plus, et l'on ne sait plus de quelle nature ni
             de quelle zone on lit le raisonnement. */""}
        ${pastilles ? `<span class="raison-espace__pastilles">${pastilles}</span>` : ""}
        <div class="raison-espace__outils">
          ${renderBasculesDesPanneaux(etat)}
          <span class="raison-espace__separateur" role="separator" aria-orientation="vertical"></span>
          <button type="button" class="bouton-discret raison-espace__outil${
            etat.pleinEcran ? " est-actif" : ""}" data-raison-plein-ecran
            aria-pressed="${etat.pleinEcran ? "true" : "false"}"
            title="${etat.pleinEcran ? "Quitter le plein écran" : "Plein écran"}"
            aria-label="${etat.pleinEcran ? "Quitter le plein écran" : "Plein écran"}">
            ${svgIcon("screen-full", { className: "octicon" })}
          </button>
        </div>
      </header>

      <div class="raison-espace__corps">
        <div class="raison-espace__principal">
          ${graphe.noeuds.length && etat.schemaOuvert !== false ? `
            <div class="raison-espace__schema" data-raison-schema>
              ${dessinerGrapheLiaisons({
                graphe,
                selection: etat.carte,
                zoom: etat.zoom,
                // Le mode d'emploi ne reste pas à l'écran : on le lit une fois, il
                // occupe deux lignes pour toujours, et il prenait la place des
                // boutons de zoom.
                legende: "<b>Le schéma des dépendances</b>",
                rangNomme: "Étape",
                // L'espace porte déjà le sien, dans sa barre : deux boutons pour
                // un même geste font douter qu'ils fassent la même chose.
                peutSAgrandir: false
              })}
            </div>
            <div class="raison-espace__poignee raison-espace__poignee--horizontale"
              data-raison-poignee="schema" role="separator" aria-orientation="horizontal"
              aria-label="Changer la hauteur du schéma"></div>` : ""}

          ${etat.codeOuvert === false ? "" : `
            <div class="raison-espace__code" data-raison-code>
              ${renderGrille(lignes, trace, ancres)}
            </div>`}
        </div>

        ${etat.copiloteOuvert ? `
          <div class="raison-espace__poignee raison-espace__poignee--verticale"
            data-raison-poignee="copilote" role="separator" aria-orientation="vertical"
            aria-label="Changer la largeur de la discussion"></div>
          <aside class="raison-espace__copilote" data-raison-discussion></aside>` : ""}
      </div>
    </section>
  `;
}

/**
 * Les rangées où chaque fonction commence.
 *
 * C'est ce qui permet au schéma de commander le code. Une carte de règle vise
 * la première ligne de sa fonction ; une carte de donnée de base n'a pas de
 * fonction à elle — elle vise la première ligne qui la cite, c'est-à-dire
 * l'`importe` de la règle qui la lit.
 *
 * @returns {{parRang: Map<number,string>, parCarte: Map<string,number>}}
 */
export function ancresDuCode(lignes = [], trace = [], graphe = { noeuds: [] }) {
  const parRang = new Map();
  const parCarte = new Map();

  const poser = (carte, rang) => {
    if (!carte || parCarte.has(carte)) return;
    parCarte.set(carte, rang);
    if (!parRang.has(rang)) parRang.set(rang, carte);
  };

  // Les règles d'abord : une tête de fonction est un repère plus sûr qu'une
  // citation au milieu d'un bloc.
  for (const noeud of graphe.noeuds ?? []) {
    if (!texte(noeud?.id).startsWith("regle:")) continue;
    const cherche = texte(noeud.titre);
    const rang = lignes.findIndex((ligne) => estUneTeteDeFonction(ligne, cherche));
    if (rang >= 0) poser(noeud.id, rang);
  }

  for (const noeud of graphe.noeuds ?? []) {
    if (!texte(noeud?.id).startsWith("donnee:")) continue;
    const cherche = texte(noeud.titre);
    const rang = trace.findIndex((entree) => texte(entree?.sujet) === cherche);
    if (rang >= 0) poser(noeud.id, rang);
  }

  return { parRang, parCarte };
}

/**
 * Une ligne qui ouvre la fonction d'un sujet donné.
 *
 * Le premier jeton n'est pas le mot : c'est le **retrait**, un jeton neutre que
 * l'écriture pose pour que le texte se colle tel quel. On cherche donc le
 * premier jeton qui dit quelque chose.
 */
function estUneTeteDeFonction(ligne, sujet) {
  const jetons = ligne?.jetons ?? [];
  const premier = jetons.find((jeton) => texte(jeton?.texte));
  if (premier?.type !== "mot-fonction") return false;
  return jetons.some((jeton) => jeton?.type === "sujet" && texte(jeton.texte) === sujet);
}
