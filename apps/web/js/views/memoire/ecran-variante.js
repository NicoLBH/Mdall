/**
 * L'écran d'une variante.
 *
 * ## Pourquoi un écran, et non trois fenêtres
 *
 * Essayer une valeur se faisait dans une pile de fenêtres modales : choisir,
 * saisir, attendre, lire les conséquences. Chacune recouvrait la précédente, on
 * ne voyait jamais la question et la réponse ensemble, et rien de tout cela ne
 * survivait à un clic à côté. Une variante n'est pas une boîte de dialogue :
 * c'est **un état du projet qu'on regarde**, et cela demande un écran.
 *
 * Il tient en deux rangs :
 *
 * ```
 * Variante — quelle valeur essaie-t-on ?              [ Exporter ]
 * ┌──────────────────────────┬──────────────────────────────────┐
 * │ le socle, cherchable     │ aujourd'hui → dans la variante   │
 * │                          │                     [ Calculer ] │
 * ├──────────────────────────┴──────────────────────────────────┤
 * │ ce qui bouge, ce qui est à revérifier, ce qui ne bouge pas  │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## L'export
 *
 * Le bouton rend un JSON qui porte **tout ce qui a servi** : la valeur de
 * départ, celle qu'on essaie, les liens de dépendance qu'on a suivis, ce que le
 * rejeu a rendu, et ce qui est resté suspect. Une variante qui se comporte mal
 * ne se diagnostique pas sur une capture d'écran : il faut ce qu'elle a lu.
 *
 * ## Ce que cet écran ne fait pas
 *
 * Il n'écrit rien. Il ne parle à personne : il reçoit un état et rend du HTML.
 * Ce qui appelle le serveur — le rejeu des utilitaires — vit dans l'écran de la
 * mémoire, qui sait déjà attendre.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { ICONE_DE_LA_DECISION } from "../../services/assertion-taxonomy.js";
import { phraseDeReserve } from "../../utilitaires/reserves.js";
import { TOUTES_ZONES, mesureEnFrancais } from "../../services/memoire-en-texte.js";
import { uniteImposee } from "../../services/saisie-unite.js";
import { differencesDuTableau, resumeParColonne, structureDuTableau } from "../../services/memoire-variante.js";
import { colonneNommee, sensDeLaValeur, pireEcart, margeDeclaree } from "../../services/tableau-structure.js";
import { enchainementDeLaVariante } from "../../services/variante-enchainement.js";
import { renderEnchainement, SENS } from "../ui/enchainement.js";
import { renderSaisieAdresse } from "../ui/saisie-adresse.js";
import { estLaLocalisation } from "../../services/adresse-saisie.js";
import { ligneDeLEngagement, phraseDeLaCouverture } from "../../services/couverture.js";
import { ORDRE_DES_RANGS, RANG, rangDeLActe, rangLePlusHaut } from "../../services/ce-qui-couvre.js";
import { champDeLIdentifiant } from "../../services/tableau-structure.js";
import { valeursTrouvees } from "../../services/recherche-de-valeur.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Les quatre temps de l'écran. Un seul à la fois, et il se lit sur l'état. */
export const ETAPE = { CHOIX: "choix", SAISIE: "saisie", ATTENTE: "attente", RESULTAT: "resultat" };

/** L'accord d'un mot avec son nombre. Pas de « 1 recalculées » à l'écran. */
const accorde = (compte, singulier, pluriel) => (compte > 1 ? pluriel : singulier);

/** Le nom du champ d'adresse, quand la variante porte sur une localisation. */
export const SAISIE_DE_LA_VARIANTE = "variante";


/**
 * Une valeur qu'on peut essayer, avec ce qu'elle vaut, **où** elle vaut, et ce
 * qu'elle sert.
 *
 * La portée n'est pas un détail : un projet de quatre bâtiments pose quatre
 * « Altitude du site », qui ne diffèrent que par elle. Sans la lire, on en
 * choisissait une au hasard — et l'on faisait varier autre chose que ce qu'on
 * croyait.
 */
function renderChoixDUneValeur(valeur, choisie = null) {
  const zones = (valeur.zones ?? []).filter(Boolean);

  return `
    <button type="button" class="impact-choix${
      choisie?.id === valeur.id ? " is-active" : ""
    }" data-variante-choisir="${escapeHtml(valeur.id)}">
      <span class="impact-choix__titre">${
        // Le groupe que l'utilitaire a déclaré — « sol et matériaux » — devant le
        // champ : « contrainte limite à l'ELS » seul ne dit pas de quoi il parle,
        // et deux ateliers peuvent avoir chacun leur « drainage ».
        valeur.champ?.groupe ? `<i>${escapeHtml(valeur.champ.groupe)}</i> · ` : ""
      }${escapeHtml(valeur.sujet)} : ${
        // Un champ dont les lignes ne s'accordent pas le dit : montrer la
        // première vaudrait pour un massif et pour aucun autre.
        valeur.champ && !valeur.partagee
          ? `<span class="impact-choix__disperse">${valeur.lignes} valeurs différentes</span>`
          : escapeHtml(valeur.valeur || "—")
      }</span>
      <span class="impact-choix__portee">${
        // « Toutes zones » se dit : une valeur sans portée vaut partout, et
        // laisser la ligne muette la ferait passer pour une portée oubliée.
        escapeHtml(zones.length ? zones.join(", ") : TOUTES_ZONES)
      }</span>
      <span class="impact-choix__compte${valeur.lectures ? "" : " impact-choix__compte--vide"}">${
        valeur.lectures
          ? `${valeur.lectures} ${accorde(valeur.lectures, "emploi", "emplois")}`
          : "aucun emploi connu"
      }</span>
      ${
        // Ce que la valeur **est**. « Altitude du site » se comprend seul ;
        // « H0 retenu pour le département » ou « contrainte limite à l'ELS », non,
        // et l'on choisissait au jugé. Rien quand le projet ne le dit pas : une
        // phrase inventée ici serait indiscernable d'une phrase versée.
        texte(valeur.quoi)
          ? `<span class="impact-choix__quoi">${escapeHtml(valeur.quoi)}</span>`
          : ""
      }
    </button>
  `;
}


/**
 * La liste, ou la phrase qui dit pourquoi elle est vide.
 *
 * Un intertitre sépare ce que le projet **pose** de ce qui vit **dans** ses
 * tableaux : un seul tableau de fondations offre soixante-deux champs, et sans
 * la coupure on croirait que le socle du projet en compte autant.
 */
function renderListeDesValeurs(valeurs, { cherche = false, choisie = null } = {}) {
  if (valeurs.length) {
    const premierChamp = valeurs.findIndex((valeur) => Boolean(valeur.champ));
    return valeurs.map((valeur, rang) => `${
      rang === premierChamp && premierChamp > 0
        ? `<p class="impact-liste__titre">Dans les tableaux, tels que les utilitaires les déclarent</p>`
        : ""
    }${renderChoixDUneValeur(valeur, choisie)}`).join("");
  }
  return `<p class="variante-rang__vide">${
    cherche
      ? "Aucune valeur du socle ne porte ce mot."
      : "Ce projet ne pose aucune valeur qu'on puisse faire varier."
  }</p>`;
}


/** Les réserves d'une contrainte, dites en français, ou rien. */
function renderReserves(codes = []) {
  const phrases = codes.map(phraseDeReserve).filter(Boolean);
  if (!phrases.length) return "";
  return `<span class="variante-ligne__reserve">${escapeHtml(phrases.join(" · "))}</span>`;
}


/**
 * Une cellule qui change : ce qu'elle disait, ce qu'elle dit.
 *
 * La couleur vient de ce que l'utilitaire a **déclaré** du sens de ses valeurs,
 * jamais des mots eux-mêmes. Un utilitaire qui ne l'a pas déclaré rend une
 * cellule neutre — ce qui est exact, personne ne nous l'a dit. Voir
 * `services/tableau-structure.js`.
 */
function renderCellule({ colonne, avant, apres }, structure = null) {
  const declaree = structure ? colonneNommee(structure, colonne) : null;
  const sens = sensDeLaValeur(declaree, apres);

  return `
    <span class="variante-tableau__cellule">
      <i>${escapeHtml(colonne)}</i>
      <b class="variante-tableau__avant">${escapeHtml(avant || "—")}</b>
      ${svgIcon("arrow-right", { className: "octicon" })}
      <b class="variante-tableau__apres${sens ? ` variante-tableau__apres--${sens}` : ""}">${
        escapeHtml(apres || "—")
      }</b>
    </span>
  `;
}

/**
 * Ce qu'une colonne de marge dit de la pire de ses valeurs.
 *
 * « 16,050 » est un nombre sans échelle : seize fois trop, ou seize fois la
 * marge restante ? La limite le dit, et elle ne s'invente pas — un utilitaire
 * qui ne la déclare pas ne reçoit pas de phrase, ce qui vaut mieux qu'une phrase
 * fausse. Une seule valeur est citée, la plus éloignée : c'est celle qui décide,
 * et les onze autres ne se lisent pas.
 */
function renderMarge(differences, structure) {
  if (!structure) return "";

  const dites = [];
  for (const colonne of new Set(differences.flatMap((entree) => entree.cellules.map((cellule) => cellule.colonne)))) {
    const declaree = colonneNommee(structure, colonne);
    const marge = margeDeclaree(declaree);
    if (!marge) continue;

    const pire = pireEcart(declaree, differences.flatMap(
      (entree) => entree.cellules.filter((cellule) => cellule.colonne === colonne).map((cellule) => cellule.apres)
    ));
    if (!pire) continue;

    dites.push(`
      <p class="variante-tableau__marge${pire.depasse ? " variante-tableau__marge--depasse" : ""}">
        <i>${escapeHtml(colonne)}</i> — ${escapeHtml(marge.comparaison)} ${mesureEnFrancais(String(marge.limite))}.
        La valeur la plus forte atteint <b>${escapeHtml(pire.valeur)}</b>, soit
        <b>${mesureEnFrancais(pire.fois.toFixed(pire.fois >= 10 ? 0 : 2))} fois la limite</b>.
      </p>
    `);
  }

  return dites.join("");
}

/**
 * Le détail d'un tableau recalculé.
 *
 * ## Pourquoi il est ouvert
 *
 * Une fonction native ne rend pas une valeur mais douze massifs, et la phrase
 * qui les résume peut mentir par omission : « 12 vérifiées » avant comme après,
 * alors que dix arases ont bougé. Replié, ce détail se lisait comme une option ;
 * il est ce qu'on est venu voir. Il s'ouvre donc dès qu'une ligne a bougé, et
 * reste fermé quand il n'a rien à dire.
 *
 * ## Pourquoi la colonne passe avant la ligne
 *
 * Douze massifs qui descendent tous de six centimètres, ce n'est pas douze
 * informations : c'en est une. Écrite douze fois, elle noie les deux lignes qui
 * font autre chose — et c'est exactement ce qu'on regarde. Ce qui est **le même
 * partout** se dit donc une fois, en tête ; les lignes ne portent plus que ce
 * qui leur est propre, et celles qui n'ont plus rien à ajouter se comptent.
 */
function renderTableauRecalcule(ligne) {
  const apres = Array.isArray(ligne?.tableau) ? ligne.tableau : null;
  if (!apres?.length) return "";

  // Ce que l'utilitaire déclare de son propre tableau — celle d'aujourd'hui, pas
  // la copie figée au versement : une légende n'est pas une donnée. Voir
  // `structureDuTableau`.
  const structure = structureDuTableau(ligne);

  const differences = differencesDuTableau(ligne?.assertion?.payload?.tableau ?? [], apres);
  const bougees = differences.filter((entree) => entree.cellules.length);
  const immobiles = differences.filter((entree) => entree.connue && !entree.cellules.length);

  // Une colonne qui change à l'identique partout : dite une fois, en tête. Il
  // en faut deux lignes au moins — sur une seule, « en tête » et « dans la
  // ligne » sont le même endroit, et l'écrire deux fois serait un doublon.
  const colonnes = resumeParColonne(bougees);
  const partout = new Set(colonnes.filter((vue) => vue.uniforme && vue.lignes > 1).map((vue) => vue.colonne));

  const propres = bougees
    .map((entree) => ({ ...entree, cellules: entree.cellules.filter((cellule) => !partout.has(cellule.colonne)) }));
  const detaillees = propres.filter((entree) => entree.cellules.length);
  const commeLesAutres = propres.filter((entree) => !entree.cellules.length);

  return `
    <details class="variante-tableau"${bougees.length ? " open" : ""}>
      <summary>${
        bougees.length
          ? `<b>${bougees.length}</b> ${accorde(bougees.length, "ligne du tableau a bougé", "lignes du tableau ont bougé")} sur ${apres.length}`
          : `${apres.length} ${accorde(apres.length, "ligne", "lignes")} — aucune n'a bougé`
      }</summary>

      ${renderMarge(bougees, structure)}

      ${
        partout.size
          ? `<ul class="variante-tableau__partout">${
              colonnes.filter((vue) => partout.has(vue.colonne)).map((vue) => `
                <li>
                  ${renderCellule(vue, structure)}
                  <span class="variante-tableau__compte">sur ${vue.lignes} ${accorde(vue.lignes, "ligne", "lignes")}</span>
                </li>
              `).join("")
            }</ul>`
          : ""
      }

      <ul class="variante-tableau__lignes">${
        detaillees.map((entree) => `
          <li class="variante-tableau__ligne variante-tableau__ligne--bouge">
            <span class="variante-tableau__nom">${escapeHtml(entree.nom)}</span>
            <span class="variante-tableau__cellules">${
              entree.cellules.map((cellule) => renderCellule(cellule, structure)).join("")
            }</span>
          </li>
        `).join("")
      }</ul>

      ${
        // Nommées, jamais escamotées : « et 2 autres » sans dire lesquelles
        // laisserait chercher lesquelles.
        commeLesAutres.length
          ? `<p class="variante-tableau__reste">${
              commeLesAutres.length
            } ${accorde(commeLesAutres.length, "ligne ne change", "lignes ne changent")} que par ce qui précède : ${
              escapeHtml(commeLesAutres.map((entree) => entree.nom).join(", "))
            }.</p>`
          : ""
      }
      ${
        immobiles.length
          ? `<p class="variante-tableau__reste">${
              immobiles.length
            } ${accorde(immobiles.length, "ligne n'a pas bougé", "lignes n'ont pas bougé")} : ${
              escapeHtml(immobiles.map((entree) => entree.nom).join(", "))
            }.</p>`
          : ""
      }
    </details>
  `;
}

/**
 * Une valeur recalculée : ce qu'elle disait, ce qu'elle dirait.
 *
 * Une valeur identique dont la réserve apparaît n'est pas une valeur inchangée :
 * un doute vient de naître, et le taire ferait passer pour acquis ce qui ne
 * l'est plus.
 */
function renderRecalculee(ligne) {
  const bouge = ligne.valeurABouge;
  const nees = ligne.reservesApres.filter((code) => !ligne.reservesAvant.includes(code));
  const levees = ligne.reservesAvant.filter((code) => !ligne.reservesApres.includes(code));

  return `
    <li class="variante-ligne variante-ligne--${bouge ? "bouge" : "stable"}">
      <span class="variante-ligne__sujet">${escapeHtml(ligne.sujet)}</span>
      <span class="variante-ligne__valeurs">
        <b class="variante-ligne__avant">${escapeHtml(ligne.avant)}</b>
        ${
          bouge
            ? `${svgIcon("arrow-right", { className: "octicon" })}
               <b class="variante-ligne__apres">${escapeHtml(ligne.apres)}</b>`
            : `<span class="variante-ligne__egal">inchangée</span>`
        }
      </span>
      ${nees.length ? `<span class="variante-ligne__reserve variante-ligne__reserve--nee">Réserve : ${escapeHtml(nees.map(phraseDeReserve).filter(Boolean).join(" · "))}</span>` : ""}
      ${levees.length ? `<span class="variante-ligne__reserve variante-ligne__reserve--levee">Réserve levée : ${escapeHtml(levees.map(phraseDeReserve).filter(Boolean).join(" · "))}</span>` : ""}
      ${!nees.length && !levees.length ? renderReserves(ligne.reservesApres) : ""}
      ${
        // Qui a recalculé, et dans quelle version. Ce n'est pas une formalité :
        // c'est ce qui distingue un chiffre rendu par le référentiel d'un chiffre
        // qu'on aurait refait de son côté — et c'est bien le référentiel qui a
        // répondu, avec sa table, sans rien écrire.
        ligne.utilitaire
          ? `<span class="variante-ligne__pourquoi">recalculée par ${escapeHtml(ligne.utilitaire)}, au serveur</span>`
          : ""
      }
      ${renderTableauRecalcule(ligne)}
    </li>
  `;
}


/**
 * Une règle rejouée : la valeur que la règle du projet conclut avec les
 * nouvelles entrées, et ce qu'elle a lu pour y arriver.
 *
 * La trace n'est pas un détail : une valeur nouvelle sans elle est une
 * affirmation qu'il faut croire sur parole, et c'est exactement ce que Mdall
 * existe pour éviter.
 */
function renderRejouee(ligne) {
  const lues = (ligne.trace ?? [])
    .map((clause) => `${clause.sujet} ${clause.operateur} ${(clause.attendu ?? []).join(" ou ")} → ${clause.lu || "—"}`)
    .join("\n");

  return `
    <li class="variante-ligne variante-ligne--bouge">
      <span class="variante-ligne__sujet">${escapeHtml(ligne.sujet)}</span>
      <span class="variante-ligne__valeurs">
        <b class="variante-ligne__avant">${escapeHtml(ligne.avant || "—")}</b>
        ${svgIcon("arrow-right", { className: "octicon" })}
        <b class="variante-ligne__apres">${escapeHtml(ligne.apres)}</b>
      </span>
      <span class="variante-ligne__pourquoi" title="${escapeHtml(lues)}">
        règle rejouée${ligne.zone ? ` — ${escapeHtml(ligne.zone)}` : ""} · ${
          (ligne.trace ?? []).length
        } ${(ligne.trace ?? []).length > 1 ? "conditions relues" : "condition relue"}
      </span>
    </li>
  `;
}


/**
 * Un choix humain que la variante remet en question.
 *
 * Il ne se rejoue pas : il se **redemande**, à qui l'a fait. La ligne est donc
 * plus haute que les autres, et c'est voulu — elle porte une question adressée
 * à quelqu'un, là où les autres portent un doute technique.
 *
 * Les écartés se montrent **tels qu'ils étaient** : c'est la réponse à
 * « qu'est-ce qu'on avait envisagé ? », et c'est ce que personne ne retrouve
 * six mois plus tard. Sans eux, la question se poserait à l'aveugle.
 */
function renderDecisionARevoir(ligne) {
  const choix = ligne.decision;
  const ecartes = (choix.ecartes ?? []).filter((ecarte) => ecarte?.quoi);

  return `
    <li class="variante-ligne variante-ligne--decision">
      <span class="variante-ligne__sujet">
        ${svgIcon(ICONE_DE_LA_DECISION, { className: "octicon" })}
        ${escapeHtml(choix.question || ligne.sujet)}
      </span>
      <p class="variante-decision__phrase">${escapeHtml(choix.phrase)}</p>
      ${
        ecartes.length
          ? `<ul class="variante-decision__ecartes">${ecartes.map((ecarte) => `
              <li>
                <b>${escapeHtml(ecarte.quoi)}</b>${
                  ecarte.pourquoi ? ` — ${escapeHtml(ecarte.pourquoi)}` : ""
                }
              </li>`).join("")}</ul>`
          // Nommer le manque plutôt que de laisser un blanc : une décision dont
          // les écartés n'ont pas été notés n'est pas une décision sans écartés.
          : `<p class="variante-decision__lacune">Les possibles écartés n'avaient pas été notés.</p>`
      }
      ${choix.motif ? `<p class="variante-decision__motif">${escapeHtml(choix.motif)}</p>` : ""}
    </li>
  `;
}

/** Une ligne devenue suspecte : nommée, jamais devinée. */
function renderARevoir(ligne) {
  // Un choix humain a sa propre forme : la question, qui l'a tranchée, et ce
  // qu'il avait écarté. Le réduire à une phrase de motif perdrait exactement ce
  // pour quoi la décision a été enregistrée.
  if (ligne.decision) return renderDecisionARevoir(ligne);

  return `
    <li class="variante-ligne variante-ligne--suspecte">
      <span class="variante-ligne__sujet">${escapeHtml(ligne.sujet)}</span>
      <span class="variante-ligne__valeurs">
        <b class="variante-ligne__avant">${escapeHtml(ligne.valeur || "—")}</b>
        <span class="variante-ligne__egal">à revérifier</span>
      </span>
      <span class="variante-ligne__pourquoi">${
        // La raison précise plutôt que la phrase générale : « à revérifier »
        // sans motif est une inquiétude sans adresse, et l'on ne sait pas s'il
        // faut corriger la donnée ou l'outil.
        escapeHtml(ligne.pourquoi || (ligne.motif === "utilitaire"
          ? "un utilitaire l'a déduite, et nous ne savons pas rejouer son calcul ici"
          : ligne.motif === "sans-objet"
            ? "la règle qui la concluait ne s'applique plus"
            : "repose sur une valeur qui vient de bouger"))
      }${ligne.provenance ? ` — ${escapeHtml(ligne.provenance)}` : ""}</span>
    </li>
  `;
}


/* ────────────────────────────────────────────────────────────────────────────
 * Le premier rang : ce qu'on essaie
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Vrai quand cette entrée est une colonne repliée sous sa ligne.
 *
 * On ne la reconnaît pas à son nom : on regarde si une **ligne en bloc** de la
 * même affirmation est offerte à côté. Sans cette précaution, un tableau dont la
 * ligne entière n'aurait pas été proposée verrait ses colonnes disparaître, et
 * l'on ne pourrait plus rien y faire varier du tout.
 */
function colonneRepliee(valeur, toutes) {
  if (!valeur?.champ) return false;
  const porteuse = champDeLIdentifiant(texte(valeur.id)).id;
  return toutes.some((autre) => autre?.enBloc && texte(autre.id) === porteuse);
}

/** La colonne de gauche : le socle, cherchable. */
function renderQuelleValeur(valeurs, { cherche = "", choisie = null } = {}) {
  const filtre = texte(cherche);
  // Le nom de l'entrée, celui du tableau qui la porte, ses synonymes, puis sa
  // description — dans cet ordre. C'est ce qui fait que « localisation » ramène
  // les six colonnes d'un endroit dont aucune ne s'appelle ainsi, et que
  // « GPS » les ramène aussi. Voir `services/recherche-de-valeur.js`.
  // Les colonnes d'un tableau qui varie **en bloc** ne se proposent pas : c'est
  // la ligne entière qui se choisit. On offrait six valeurs pour la localisation
  // — commune, code INSEE, code postal, adresse, latitude, longitude —, dont
  // cinq n'ont aucun sens seules. Voir `services/memoire-variante.js`.
  const retenues = valeursTrouvees(valeurs, filtre).filter((valeur) => !colonneRepliee(valeur, valeurs));

  return `
    <section class="variante-colonne">
      <h4>${svgIcon("beaker", { className: "octicon" })} Quelle valeur essaie-t-on ?</h4>
      <p class="variante-lead">
        On ne fait varier que le <b>socle</b> : ce que le projet pose, suppose ou constate.
        Ce que ses règles en concluent se recalcule.
      </p>

      <label class="fichiers-saisie__champ">
        <span>Chercher une valeur</span>
        <input type="text" class="gh-input" data-variante-recherche value="${escapeHtml(cherche)}"
          placeholder="altitude, localisation, classement, hauteur…" autocomplete="off">
      </label>

      <div class="impact-liste" data-variante-liste>${
        renderListeDesValeurs(retenues, { cherche: Boolean(filtre), choisie })
      }</div>
    </section>
  `;
}

/**
 * Le champ « dans la variante » quand ce qu'on essaie est une localisation.
 *
 * On tape **une adresse** ; le service rend la commune, son code INSEE, son code
 * postal et ses coordonnées ; et l'on ne substitue que la **colonne choisie** —
 * celle sur laquelle on a cliqué à gauche. Substituer les quatre d'un coup
 * ferait une variante que personne n'a demandée, et le mécanisme de rejeu ne
 * porte qu'une valeur par identifiant.
 *
 * La valeur substituée reste dans un champ `data-variante-valeur`, comme
 * ailleurs : c'est ce que le bouton « Calculer » lit, et lui donner un second
 * chemin de lecture serait une deuxième vérité (règle 4).
 */
function renderSaisieAdresseDeVariante(choisie, { colonne = "", saisie = "", portees = [], calcule = false } = {}) {
  return `
    <div class="fichiers-saisie__champ variante-saisie__champ variante-saisie__champ--adresse">
      <span>dans la variante</span>
      ${renderSaisieAdresse({
        nom: SAISIE_DE_LA_VARIANTE,
        label: "",
        valeur: "",
        placeholder: "Une adresse, ou seulement la commune…",
        desactive: calcule
      })}
      <!-- Le même lien, la même fenêtre que dans Paramètres > Localisation :
           un terrain qui n'est pas construit n'a pas d'adresse, et c'est sur une
           vue satellite qu'on le reconnaît. -->
      <p class="settings-lien-approfondi settings-lien-approfondi--variante">
        <button type="button" class="gh-lien" data-variante-carte ${calcule ? "disabled" : ""}>
          ${svgIcon("location", { className: "octicon" })}
          <span>Ouvrir la recherche approfondie de localisation</span>
        </button>
      </p>
      <input type="hidden" data-variante-valeur value="${escapeHtml(saisie)}"
        data-variante-colonne="${escapeHtml(colonne)}">
      ${
        // Les six colonnes, telles qu'elles seront remplacées. Sans cette liste,
        // on choisit une adresse et l'on ne voit pas qu'elle change aussi le
        // code INSEE — c'est-à-dire tout ce qui se recalcule ensuite.
        portees.length
          ? `<ul class="variante-saisie__portees">${portees.map((portee) => `
              <li>
                <span class="variante-saisie__colonne">${escapeHtml(portee.nom)}</span>
                <b class="variante-saisie__essaye">${escapeHtml(portee.valeur)}</b>
              </li>
            `).join("")}</ul>`
          : ""
      }
      <small>
        ${
          portees.length
            ? `Le projet est <b>déplacé</b> : commune, code INSEE, code postal, adresse et point
               se remplacent ensemble. Un endroit ne se change pas par morceaux.`
            : `Choisissez une adresse, ou allez pointer le terrain sur la carte. C'est
               <b>l'endroit entier</b> qui se remplace — changer l'adresse d'un projet, c'est le
               déplacer.`
        }
      </small>
    </div>
  `;
}

/** La colonne de droite : l'ancienne valeur, la nouvelle, et le bouton. */
function renderTesterUneVariante(choisie, { saisie = "", echec = "", etape = ETAPE.CHOIX, portees = [] } = {}) {
  if (!choisie) {
    return `
      <section class="variante-colonne variante-colonne--vide">
        <h4>${svgIcon("arrow-right", { className: "octicon" })} Tester une variante</h4>
        <p class="variante-rang__vide">Choisissez d'abord une valeur, à gauche.</p>
      </section>
    `;
  }

  const calcule = etape === ETAPE.ATTENTE;
  // L'unité de la valeur d'aujourd'hui s'impose à celle qu'on essaie. Convertir
  // serait un autre métier — kN et tonnes, mètres et centimètres —, et une table
  // de conversion est une seconde vérité qui divergera.
  const unite = uniteImposee(choisie.valeur);
  // Vide dès que ce n'est pas une colonne de la localisation, c'est-à-dire
  // presque toujours : le champ ordinaire reste le champ ordinaire.
  const colonne = estLaLocalisation(choisie) ? "localisation" : "";

  return `
    <section class="variante-colonne">
      <h4>${svgIcon("arrow-right", { className: "octicon" })} Tester une variante</h4>
      <p class="variante-lead">
        Rien ne sera écrit. On substitue une valeur, on relit la mémoire, on regarde,
        et on ressort — la mémoire du projet ne bouge pas d'un octet.
      </p>

      <div class="variante-saisie${colonne ? " variante-saisie--adresse" : ""}">
        <label class="fichiers-saisie__champ variante-saisie__champ">
          <span>${escapeHtml(choisie.sujet)}, aujourd'hui</span>
          <input type="text" class="gh-input" value="${escapeHtml(choisie.valeur)}" readonly disabled>
          <small>${escapeHtml((choisie.zones ?? []).length ? choisie.zones.join(", ") : TOUTES_ZONES)}</small>
        </label>
        <span class="variante-saisie__fleche">${svgIcon("arrow-right", { className: "octicon" })}</span>
        ${
          // Une localisation ne se tape pas colonne par colonne. Elle se verse
          // comme un tableau d'une seule ligne — commune, code INSEE, code
          // postal, adresse —, si bien que l'écran en offre quatre entrées ; et
          // taper « 05023 » de mémoire, c'est essayer la neige d'une commune
          // homonyme. On donne donc **le champ d'adresse**, celui des Paramètres
          // et de l'atelier climatique, et l'on n'en substitue que la colonne
          // choisie. Voir `services/adresse-saisie.js`.
          colonne
            ? renderSaisieAdresseDeVariante(choisie, { colonne, saisie, portees, calcule })
            : `<label class="fichiers-saisie__champ variante-saisie__champ">
                <span>dans la variante</span>
                <input type="text" class="gh-input" data-variante-valeur value="${escapeHtml(saisie)}"
                  data-variante-unite="${escapeHtml(unite)}"
                  placeholder="${escapeHtml(choisie.valeur || "la valeur essayée")}" autocomplete="off"
                  ${calcule ? "disabled" : ""}>
                <small>${
                  // L'unité ne se tape pas, elle s'écrit toute seule : on la voit
                  // pendant qu'on frappe, seul moment où elle peut encore corriger
                  // une intention. Voir `services/saisie-unite.js`.
                  unite
                    ? `Seul le nombre se tape : l'unité du projet, <b>${escapeHtml(unite)}</b>, s'écrit avec.`
                    : "Écrite comme le projet l'écrit : c'est ainsi que les règles la reliront."
                }</small>
              </label>`
        }
      </div>

      ${echec ? `<p class="fichiers-saisie__echec">${escapeHtml(echec)}</p>` : ""}

      <footer class="variante-colonne__pied">
        <button type="button" class="gh-btn gh-btn--primary" data-variante-calculer ${calcule ? "disabled" : ""}>
          ${calcule ? "Calcul en cours…" : "Calculer"}
        </button>
      </footer>
    </section>
  `;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Le second rang : ce que cela change
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Ce que la variante ferait tomber.
 *
 * ## Pourquoi ce rang passe devant les autres
 *
 * Les chiffres se recalculent en une seconde ; un avis de bureau de contrôle se
 * redemande en six semaines. Sur les deux moitiés de la réponse — « la zone
 * passe de A1 à E » et « les trois avis ne couvrent plus » —, c'est la seconde
 * qui fait décider en réunion. Elle se lit donc en premier.
 *
 * ## Ce qu'on n'écrit jamais ici
 *
 * Ni « visa », ni « validé », ni « en attente » : Mdall n'est pas un outil de
 * gestion de visas et ne le sera jamais (`docs/fondamentaux.md`, règle 12). Un
 * engagement se dit par **ce qu'il a examiné, son auteur et sa date**, et rien
 * d'autre. Et il ne « devient pas faux » : il **cesse de couvrir**, parce qu'un
 * constat reste vrai à sa date.
 *
 * ## Le silence, quand il n'y a rien
 *
 * Aucun engagement lu, aucun engagement touché : la section n'existe pas. Même
 * raison que pour « À revérifier » — une alarme qui rassure apprend à ne plus la
 * regarder.
 */
/**
 * Ce que la variante coûterait, dit sans chiffre.
 *
 * Compter les examens ne dit pas ce qu'on casse : trois relectures internes et
 * trois avis de bureau de contrôle se comptent pareil et ne se paient pas
 * pareil. On nomme donc **le plus lourd** et combien en relèvent, et rien de
 * plus — aucune arithmétique de poids, aucun score (règle 12).
 */
function ceQuiEstEnJeu(tombees = []) {
  const haut = rangLePlusHaut(tombees.map((engagement) => rangDeLActe(engagement.acte)));
  if (haut === RANG.RIEN || haut === RANG.INTERNE) return "";

  const combien = tombees.filter(
    (engagement) => rangDeLActe(engagement.acte) === haut
  ).length;

  return `${combien === tombees.length ? "Tous" : combien} ${
    accorde(combien, "vient", "viennent")} d'un bureau de contrôle.`;
}

function renderCeQuiTombe(couverture = null) {
  const tombees = couverture?.tombees ?? [];
  const aRevoir = couverture?.aRevoir ?? [];
  if (!tombees.length && !aRevoir.length) return "";

  // Le plus coûteux d'abord. Ce qu'on veut voir en premier n'est pas le plus
  // récent : c'est ce qui fait le plus mal à casser — un avis de bureau de
  // contrôle avant une relecture interne.
  const parRang = (gauche, droite) =>
    ORDRE_DES_RANGS.indexOf(rangDeLActe(droite.acte)) - ORDRE_DES_RANGS.indexOf(rangDeLActe(gauche.acte));

  const ligne = (engagement) => `
    <li class="variante-ligne variante-ligne--${escapeHtml(rangDeLActe(engagement.acte))}">
      <span class="variante-ligne__sujet">${escapeHtml(ligneDeLEngagement(engagement))}</span>
      ${
        // Ce qui a été examiné, et ce que la variante en ferait. Montrer la
        // valeur d'aujourd'hui n'aurait rien dit : une variante n'écrit rien,
        // c'est encore celle qui a été examinée.
        engagement.deviendrait
          ? `<span class="variante-ligne__valeurs">${
              escapeHtml(engagement.examinee?.payload?.value ?? "")} → ${escapeHtml(engagement.deviendrait)}</span>`
          : ""
      }
      <span class="variante-ligne__note">${escapeHtml(phraseDeLaCouverture(engagement.etat))}</span>
    </li>`;

  return `
        <section class="variante-rang variante-rang--suspect">
          <h5>${svgIcon("alert", { className: "octicon" })} Ce qui ne couvre plus</h5>
          <p>
            ${tombees.length
              ? `${tombees.length} ${accorde(tombees.length, "examen portait", "examens portaient")}
                 sur ${accorde(tombees.length, "une valeur", "des valeurs")} que cette variante change.
                 ${escapeHtml(ceQuiEstEnJeu(tombees))}`
              : ""}
            ${aRevoir.length
              ? `${aRevoir.length} ${accorde(aRevoir.length, "autre est", "autres sont")} à revérifier :
                 ce qui a été examiné n'a pas bougé, mais une de ses entrées, si.`
              : ""}
          </p>
          <ul class="variante-lignes">
            ${[...tombees].sort(parRang).map(ligne).join("")}${[...aRevoir].sort(parRang).map(ligne).join("")}
          </ul>
        </section>`;
}

/**
 * Les trois rangs de ce qu'une variante change.
 *
 * Sortis du rendu principal parce qu'ils vivent maintenant dans une colonne, à
 * gauche de la chaîne. Une colonne se remplit, elle ne s'écrit pas au milieu
 * d'une mise en page.
 */
function renderRangs(rendu, couverture = null) {
  return `
        ${renderCeQuiTombe(couverture)}

        <section class="variante-rang variante-rang--sur">
          <h5>${svgIcon("check", { className: "octicon" })} Recalculé</h5>
          ${
            rendu.recalculees.length || rendu.rejouees.length
              ? `<ul class="variante-lignes">${
                  rendu.rejouees.map(renderRejouee).join("")
                }${rendu.recalculees.map(renderRecalculee).join("")}</ul>`
              : `<p class="variante-rang__vide">Aucune règle ni aucun utilitaire ne se rejoue sur cette valeur.</p>`
          }
          ${
            rendu.cycles?.length
              ? `<p class="variante-rang__note">${svgIcon("alert", { className: "octicon" })}
                  ${rendu.cycles.length} ${rendu.cycles.length > 1 ? "zones ne se stabilisent" : "zone ne se stabilise"} pas :
                  leurs règles se lisent en rond.</p>`
              : ""
          }
        </section>

        ${
          // L'alerte quand il y a de quoi alerter, et pas avant. Le rang portait
          // son ambre et son triangle même vide, au-dessus d'une phrase qui dit
          // que tout va bien : une alarme qui rassure apprend à ne plus la
          // regarder, et c'est celle-là qu'il faudra croire un jour.
          rendu.aRevoir.length
            ? `<section class="variante-rang variante-rang--suspect">
                <h5>${svgIcon("alert", { className: "octicon" })} À revérifier</h5>
                <p>
                  Ces valeurs reposent sur ce qui vient de bouger, et nous ne savons pas les rejouer ici.
                  Elles sont <b>nommées</b>, jamais devinées.${
                    // Un choix humain ne se rejoue pas : il se redemande. Le
                    // dire ici évite de lire la section entière comme une liste
                    // de pannes — il y a des questions dedans, pas des défauts.
                    rendu.aRevoir.some((ligne) => ligne.decision)
                      ? ` Certaines sont des <b>choix humains</b> : ceux-là ne se rejouent pas,
                          ils se redemandent à qui les a faits.`
                      : ""
                  }
                </p>
                <ul class="variante-lignes">${rendu.aRevoir.map(renderARevoir).join("")}</ul>
              </section>`
            : `<section class="variante-rang variante-rang--inchange">
                <h5>${svgIcon("check", { className: "octicon" })} Rien à revérifier</h5>
                <p>Tout ce qui dépend de cette valeur a pu être rejoué : rien n'est resté en suspens.</p>
              </section>`
        }

        <section class="variante-rang variante-rang--inchange">
          <h5>${svgIcon("dot-fill-pending", { className: "octicon" })} Inchangé</h5>
          <p>
            ${rendu.inchangees} ${accorde(rendu.inchangees, "affirmation n'a", "affirmations n'ont")}
            aucun lien avec cette donnée.
          </p>
        </section>
        `;
}

/**
 * Le tableau des résultats, dans ses trois états.
 *
 * Avant tout calcul, il dit ce qu'il attend plutôt que de rester blanc — un
 * cadre vide se lit comme un écran cassé. Pendant, il montre l'attente et dit
 * surtout ce qui **ne** se passe pas : rien ne s'écrit au serveur.
 */
function renderResultat(etat) {
  const { etape, choisie, saisie, rendu, couverture } = etat;

  if (etape === ETAPE.ATTENTE) {
    return `
      <section class="variante-resultat variante-resultat--attente">
        <p class="variante-lead variante-attente">
          ${svgIcon("sync", { className: "octicon" })}
          Les règles du projet se rejouent ici, et les utilitaires sont redemandés à leur
          référentiel avec cette valeur. <b>Rien n'y est écrit</b> : ils calculent et se taisent.
        </p>
      </section>
    `;
  }

  if (!rendu?.ok) {
    return `
      <section class="variante-resultat variante-resultat--vide">
        <p class="variante-rang__vide">
          ${choisie
            ? "Donnez une valeur à essayer, puis calculez : ce qui en découle s'affichera ici."
            : "Choisissez une valeur du socle : ce qui en découle s'affichera ici."}
        </p>
      </section>
    `;
  }

  const bougees = rendu.recalculees.filter((ligne) => ligne.valeurABouge || ligne.reservesOntBouge).length
    + rendu.rejouees.length;

  // La chaîne de ce qui a suivi, quand il y a une chaîne à montrer.
  const etapes = enchainementDeLaVariante(rendu, {
    sujet: choisie?.sujet, valeur: choisie?.valeur, essaye: saisie
  });

  const rangs = renderRangs(rendu, couverture);

  return `
    <section class="variante-resultat">
      <header class="variante-resultat__tete">
        <b>${svgIcon("beaker", { className: "octicon" })} ${escapeHtml(choisie?.sujet ?? "")} :
          ${escapeHtml(choisie?.valeur ?? "")} → ${escapeHtml(saisie)}</b>
        <span class="variante-resultat__compte">${
          bougees ? `${bougees} ${accorde(bougees, "valeur bouge", "valeurs bougent")}` : "aucune valeur ne bouge"
        }</span>
      </header>

      ${
        // La chaîne **au-dessus** du tableau, et à l'horizontale : c'est elle qui
        // dit que la troisième ligne découle de la deuxième, et c'est la seule
        // chose que cet écran a de plus qu'un tableur. On la lit donc avant les
        // valeurs, pas à côté.
        //
        // Le même dessin, dans le même sens, que « le chemin de cette exécution »
        // dans le détail d'une action. Tourné d'un quart de tour, il obligeait à
        // lire deux enchaînements de deux façons dans la même application — et il
        // occupait une bande étroite où les longs libellés se cassaient en trois.
        // Voir `ui/enchainement.js`.
        etapes.length
          ? `<aside class="variante-chaine">
              <h5>${svgIcon("git-branch", { className: "octicon" })} Ce qui a suivi</h5>
              <div class="variante-chaine__vue">
                ${renderEnchainement(etapes, { sens: SENS.HORIZONTAL })}
              </div>
            </aside>`
          : ""
      }

      <div class="variante-rangs">${rangs}</div>

      <footer class="variante-resultat__pied">
        <button type="button" class="gh-btn" data-variante-abandonner>Abandonner</button>
        <button type="button" class="gh-btn gh-btn--primary" data-variante-lire ${bougees ? "" : "disabled"}>
          ${svgIcon("book", { className: "octicon" })} Lire la mémoire avec cette variante
        </button>
      </footer>
    </section>
  `;
}

/* ────────────────────────────────────────────────────────────────────────────
 * L'écran
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Ce que l'export emporte.
 *
 * Tout ce qui a servi, et rien de décoratif : la valeur de départ avec sa
 * portée, celle qu'on essaie, et les trois rangs du résultat tels que le service
 * les a rendus. C'est de quoi refaire le raisonnement sans l'écran.
 */
export function varianteEnJson(etat = {}) {
  const { choisie = null, saisie = "", rendu = null, projet = "" } = etat;

  return {
    format: "mdall.variante/1",
    genereLe: new Date().toISOString(),
    projet: texte(projet) || null,
    depart: choisie
      ? {
          id: choisie.id, sujet: choisie.sujet, valeur: choisie.valeur,
          zones: choisie.zones ?? [], nature: choisie.nature ?? null,
          emplois: choisie.lectures ?? 0
        }
      : null,
    essaye: texte(saisie) || null,
    resultat: rendu?.ok
      ? {
          recalculees: rendu.recalculees ?? [],
          rejouees: rendu.rejouees ?? [],
          aRevoir: rendu.aRevoir ?? [],
          cycles: rendu.cycles ?? [],
          inchangees: rendu.inchangees ?? 0,
          confirmees: rendu.confirmees ?? 0,
          depart: rendu.depart ?? []
        }
      : null,
    refus: rendu && !rendu.ok ? texte(rendu.raison) : null
  };
}

/**
 * L'écran entier.
 *
 * **Pas de bandeau de tête.** Il en portait un — « Variante · Essayer une
 * valeur » et le bouton d'export — du temps où l'écran occupait toute la page de
 * la Mémoire et devait se nommer lui-même. Il vit maintenant dans un panneau de
 * l'Atelier, qui porte déjà son titre, sa phrase et ses actions : le redire ici
 * afficherait « variante » trois fois en trois centimètres, et deux boutons
 * « Exporter » côte à côte se liraient comme deux exports différents.
 *
 * @param {{valeurs: object[], etape: string, choisie: object|null,
 *          saisie: string, echec: string, cherche: string, rendu: object|null}} etat
 */
export function renderEcranDeVariante(etat = {}) {
  const {
    valeurs = [], etape = ETAPE.CHOIX, choisie = null, saisie = "", echec = "", cherche = "",
    // Les colonnes qu'une adresse choisie remplacera, quand la variante porte
    // une localisation. Vide partout ailleurs.
    portees = []
  } = etat;

  return `
    <div class="variante-ecran">

      <div class="variante-ecran__rang variante-ecran__rang--haut">
        ${renderQuelleValeur(valeurs, { cherche, choisie })}
        ${renderTesterUneVariante(choisie, { saisie, echec, etape, portees })}
      </div>

      <div class="variante-ecran__rang">
        ${renderResultat(etat)}
      </div>
    </div>
  `;
}
