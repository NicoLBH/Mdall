/**
 * L'écran « Fondations — calcul » de l'Atelier.
 *
 * Il tient un rôle et un seul : recueillir les données, les faire calculer
 * ailleurs, et montrer ce qui revient. Aucune pondération, aucune combinaison,
 * aucun coefficient n'est écrit ici — c'est la fonction serveur qui les porte,
 * et c'est elle qui fait foi. Un jour où le règlement changera, il n'y aura
 * qu'un seul endroit à reprendre.
 *
 * Les zones de saisie ne sont pas écrites en dur non plus : elles se déduisent
 * de la déclaration de `fondations-service.js`, celle-là même qui valide les
 * valeurs avant l'envoi. « Une valeur écrite à deux endroits finit par
 * diverger » vaut aussi pour la description d'un champ.
 */

import { escapeHtml } from "../../../utils/escape-html.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";
import { renderGhActionButton } from "../../ui/gh-split-button.js";
import { svgIcon } from "../../../ui/icons.js";
import {
  ZONES, CHOIX, CAS_DE_CHARGE, COMPOSANTES, NAPPES, BARRES,
  entreesParDefaut, entreesInvalides, uniteAffichee, estPertinent
} from "../../../services/fondations-declaration.js";
import { calculerFondation } from "../../../services/fondations-service.js";
import { dessinerSchema } from "./fondations-schema.js";
import { rappelsDeLaMemoire, preremplir, alertesDeLaMemoire } from "../../../services/fondations-memoire.js";
import { listProjectAssertions } from "../../../services/project-memory-supabase.js";
import { resolveCurrentBackendProjectId } from "../../../services/project-supabase-sync.js";

const etat = {
  entrees: entreesParDefaut(),
  resultat: null,
  // L'empreinte des entrées qui ont produit `resultat`. Sans elle, l'écran
  // continuerait d'afficher des chiffres justes pour une saisie qui n'est plus
  // celle-là — et un résultat périmé se lit exactement comme un résultat frais.
  empreinteDuResultat: "",
  calculEnCours: false,
  erreur: "",
  invalides: [],
  // Ce que le projet sait déjà, et quels champs en viennent.
  rappels: {},
  venuesDeLaMemoire: {}
};

/**
 * Ce que le projet sait, versé dans le formulaire vierge.
 *
 * La lecture est tentée une fois, à l'ouverture. Elle ne bloque rien : un écran
 * qui refuserait de s'afficher parce que la mémoire n'a pas répondu serait pire
 * que le même écran sans pré-remplissage.
 */
async function lireLaMemoire(root) {
  try {
    const projectId = await resolveCurrentBackendProjectId();
    if (!projectId) return;
    const assertions = await listProjectAssertions(projectId);
    if (!Array.isArray(assertions)) return;

    etat.rappels = rappelsDeLaMemoire(assertions);
    // On ne pré-remplit que ce qui n'a pas encore été touché : revenir sur
    // l'écran ne doit pas défaire une variante en cours.
    const listes = Object.fromEntries(CHOIX.map((choix) => [choix.cle, choix.valeurs]));
    const { valeurs, venuesDeLaMemoire } = preremplir(etat.entrees, etat.rappels, listes);
    etat.entrees = valeurs;
    etat.venuesDeLaMemoire = venuesDeLaMemoire;
    if (root?.isConnected) dessiner(root);
  } catch (erreur) {
    console.warn("[fondations] mémoire du projet illisible", erreur);
  }
}

/** Ce qui, dans la saisie, change le résultat. Tout, donc. */
function empreinte(entrees) {
  return JSON.stringify(entrees);
}

function resultatPerime() {
  return Boolean(etat.resultat) && empreinte(etat.entrees) !== etat.empreinteDuResultat;
}

/**
 * L'écran ne se redessine pas quand on y revient — contrairement au Copilote,
 * dont la conversation a pu avancer ailleurs. Ici, tout ce qui est à l'écran a
 * été tapé à la main : le redessiner à chaque venue effacerait onze lignes de
 * charges pour ne rien montrer de nouveau.
 */
export function renderSolidityFondations(root, { force = false } = {}) {
  if (!root) return;
  if (!force && root.dataset.fondationsMonte === "true") return;
  root.dataset.fondationsMonte = "true";

  dessiner(root);
  brancher(root);
  void lireLaMemoire(root);
  registerProjectPrimaryScrollSource(root.closest("#projectStudioRouterScroll") || document.getElementById("projectStudioRouterScroll"));
}

function brancher(root) {
  // La saisie ne redessine rien : redessiner à chaque frappe ferait perdre le
  // curseur, et l'écran n'a rien de nouveau à dire tant qu'on tape.
  root.addEventListener("input", (evenement) => {
    const champ = evenement.target.closest("[data-fondation-champ]");
    const charge = champ ? null : evenement.target.closest("[data-fondation-charge]");
    const nappe = champ || charge ? null : evenement.target.closest("[data-fondation-nappe]");
    if (champ) etat.entrees[champ.dataset.fondationChamp] = champ.value;
    else if (charge) {
      const [cas, composante] = charge.dataset.fondationCharge.split(".");
      etat.entrees.charges[cas][composante] = charge.value;
    } else if (nappe) {
      etat.entrees.ferraillage[nappe.dataset.fondationNappe].nombre = nappe.value;
    } else return;

    // On ne redessine pas la page — le curseur serait perdu au milieu d'un
    // nombre. Seuls le schéma et la mention « périmé » se remettent à jour,
    // aux deux endroits où ça compte.
    marquerPerime(root);
    rafraichirSchema(root);
    rafraichirAlertes(root);
  });

  root.addEventListener("change", (evenement) => {
    const barre = evenement.target.closest("[data-fondation-barre]");
    if (barre) {
      etat.entrees.ferraillage[barre.dataset.fondationBarre].barre = barre.value;
      etat.invalides = entreesInvalides(etat.entrees);
      dessiner(root);
      return;
    }
    const choix = evenement.target.closest("[data-fondation-choix]");
    if (!choix) return;
    etat.entrees[choix.dataset.fondationChoix] = choix.value;
    // Un changement de règlement change ce qui est calculable : on redessine
    // pour que l'avertissement paraisse tout de suite, pas au clic suivant.
    etat.invalides = entreesInvalides(etat.entrees);
    dessiner(root);
  });

  root.addEventListener("click", async (evenement) => {
    if (evenement.target.closest('[data-action-id="fondationsCalculer"]')) {
      await calculer(root);
      return;
    }
    if (evenement.target.closest('[data-action-id="fondationsReinitialiser"]')) {
      etat.entrees = entreesParDefaut();
      etat.resultat = null;
      etat.empreinteDuResultat = "";
      etat.erreur = "";
      etat.invalides = [];
      dessiner(root);
    }
  });
}

async function calculer(root) {
  etat.calculEnCours = true;
  etat.erreur = "";
  etat.invalides = entreesInvalides(etat.entrees);
  dessiner(root);

  if (etat.invalides.length) {
    etat.calculEnCours = false;
    dessiner(root);
    return;
  }

  try {
    etat.resultat = await calculerFondation(etat.entrees);
    etat.empreinteDuResultat = empreinte(etat.entrees);
  } catch (erreur) {
    etat.resultat = null;
    etat.empreinteDuResultat = "";
    etat.erreur = erreur instanceof Error ? erreur.message : String(erreur);
    etat.invalides = erreur?.invalides || [];
  } finally {
    etat.calculEnCours = false;
    dessiner(root);
  }
}

function dessiner(root) {
  const dejaCalcule = Boolean(etat.resultat);
  root.innerHTML = `
    <section class="settings-section is-active" data-solidity-tool-card="fondations">
      <div class="settings-card settings-card--param studio-tool-card">
        <div class="settings-card__head studio-tool-card__head">
          <div>
            <span class="settings-card__head-title">
              <h4>Fondations — calcul</h4>
              <div class="studio-tool-card__actions">
                ${renderGhActionButton({ id: "fondationsReinitialiser", label: "Réinitialiser", tone: "default", size: "md", disabled: etat.calculEnCours, mainAction: "" })}
                ${renderGhActionButton({ id: "fondationsCalculer", label: etat.calculEnCours ? "Calcul en cours…" : dejaCalcule ? "Recalculer" : "Calculer", tone: "primary", size: "md", disabled: etat.calculEnCours, mainAction: "" })}
              </div>
            </span>
          </div>
        </div>
        <div class="settings-card__body studio-tool-card__body">
          <p class="gh-text-muted">
            Fondation superficielle : glissement, basculement, contrainte de référence,
            surfaces comprimées et ferraillage de la semelle, sur 376 combinaisons d'actions.
            Le calcul est fait par le serveur, jamais par ce navigateur.
          </p>
          ${etat.erreur ? `<p class="fondations-erreur">${escapeHtml(etat.erreur)}</p>` : ""}
          ${dessinerInvalides()}
          <div class="fondations-grille">
            <div class="fondations-colonne">
              ${dessinerRappels()}
              ${dessinerChoix()}
              <fieldset class="fondations-zone">
                <legend>Schéma</legend>
                <p class="fondations-zone__note">
                  Le schéma suit la saisie. La surface d'appui n'apparaît qu'une fois
                  le calcul fait, et seulement en répartition Meyerhoff — en répartition
                  constante, elle est un polygone que le calcul ne rend pas.
                </p>
                <div data-fondations-schema>${dessinerSchema(etat.entrees, resultatPerime() ? null : etat.resultat)}</div>
              </fieldset>
              ${ZONES.map(dessinerZone).join("")}
              ${dessinerCharges()}
              ${dessinerFerraillage()}
            </div>
            <div class="fondations-colonne">
              ${dessinerResultats()}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function dessinerInvalides() {
  if (!etat.invalides.length) return "";
  return `
    <div class="fondations-invalides">
      <p><strong>Le calcul n'a pas été lancé.</strong> Ce qui manque ou ne tient pas :</p>
      <ul>${etat.invalides.map((p) => `<li>${escapeHtml(p.raison)}</li>`).join("")}</ul>
    </div>
  `;
}

function dessinerChoix() {
  return `
    <fieldset class="fondations-zone">
      <legend>Hypothèses réglementaires</legend>
      <div class="fondations-champs">
        ${CHOIX.map((choix) => `
          <label class="fondations-champ${estPertinent(choix, etat.entrees) ? "" : " est-hors-sujet"}"
                 ${estPertinent(choix, etat.entrees) ? "" : `title="Ne sert qu'au règlement EC8-5 Annexe F."`}>
            <span class="fondations-champ__libelle">${escapeHtml(choix.libelle)}${marqueMemoire(choix.cle)}</span>
            <select class="fondations-champ__saisie" data-fondation-choix="${escapeHtml(choix.cle)}">
              ${choix.valeurs.map((valeur) => `
                <option value="${escapeHtml(valeur)}"${String(etat.entrees[choix.cle]) === valeur ? " selected" : ""}>${escapeHtml(valeur)}</option>
              `).join("")}
            </select>
          </label>
        `).join("")}
      </div>
    </fieldset>
  `;
}

/**
 * La marque d'une valeur venue de la mémoire du projet.
 *
 * Une astérisque, et l'infobulle dit l'énoncé et la date où il a été tranché.
 * Sans elle, une valeur pré-remplie ne se distingue pas d'une valeur saisie, et
 * l'on ne sait plus laquelle on a décidée.
 */
function marqueMemoire(cle) {
  const rappel = etat.venuesDeLaMemoire?.[cle];
  if (!rappel) return "";
  const date = rappel.trancheeLe ? ` (tranché le ${new Date(rappel.trancheeLe).toLocaleDateString("fr-FR")})` : "";
  const titre = `Valeur reprise de la mémoire du projet : ${rappel.enonce || rappel.libelle}${date}. Vous pouvez la modifier pour essayer une variante.`;
  return `<abbr class="fondations-memoire" title="${escapeHtml(titre)}" aria-label="${escapeHtml(titre)}">*</abbr>`;
}

/**
 * Ce que le projet rappelle, et ce qu'il reproche à cette géométrie.
 *
 * Le rappel est affiché même quand il ne remplit aucun champ : la profondeur
 * hors gel n'entre dans aucun calcul de cet écran, mais elle décide de la
 * validité de l'assise, et personne ne devrait avoir à s'en souvenir.
 */
function dessinerRappels() {
  const rappels = Object.values(etat.rappels ?? {});
  if (rappels.length === 0) return "";
  const alertes = alertesDeLaMemoire(etat.entrees, etat.rappels);

  return `
    <fieldset class="fondations-zone">
      <legend>Ce que le projet sait déjà</legend>
      <ul class="fondations-rappels">
        ${rappels.map((rappel) => `
          <li>
            <span class="fondations-rappels__libelle">${escapeHtml(rappel.libelle)}</span>
            <strong>${escapeHtml(rappel.valeur)}${rappel.unite ? ` ${escapeHtml(rappel.unite)}` : ""}</strong>
            ${rappel.champ ? `<em>repris dans la saisie</em>` : ""}
          </li>
        `).join("")}
      </ul>
      ${alertes.length ? `
        <ul class="fondations-schema__alertes">
          ${alertes.map((alerte) => `<li>${escapeHtml(alerte.texte)}</li>`).join("")}
        </ul>` : ""}
    </fieldset>
  `;
}

function dessinerZone(zone) {
  const unites = String(etat.entrees.unites || "");
  if (!estPertinent(zone, etat.entrees)) return "";
  return `
    <fieldset class="fondations-zone">
      <legend>${escapeHtml(zone.titre)}</legend>
      <div class="fondations-champs">
        ${zone.champs.map((champ) => `
          <label class="fondations-champ"${champ.aide ? ` title="${escapeHtml(champ.aide)}"` : ""}>
            <span class="fondations-champ__libelle">${escapeHtml(champ.libelle)}${uniteAffichee(champ, unites) ? ` <em>[${escapeHtml(uniteAffichee(champ, unites))}]</em>` : ""}</span>
            <input class="fondations-champ__saisie" type="text" inputmode="decimal"
              data-fondation-champ="${escapeHtml(champ.cle)}"
              value="${escapeHtml(String(etat.entrees[champ.cle] ?? ""))}">
          </label>
        `).join("")}
      </div>
    </fieldset>
  `;
}

function dessinerCharges() {
  const unites = String(etat.entrees.unites || "");
  const uniteEffort = { "{ T ; Tm }": "T", "{ kN ; kNm }": "kN", "{ daN ; daNm }": "daN" }[unites] || "";
  const uniteMoment = { "{ T ; Tm }": "Tm", "{ kN ; kNm }": "kNm", "{ daN ; daNm }": "daNm" }[unites] || "";
  const uniteDe = (composante) => (composante.cle.startsWith("M") ? uniteMoment : uniteEffort);
  return `
    <fieldset class="fondations-zone">
      <legend>Charges appliquées</legend>
      <p class="fondations-zone__note">
        Un cas laissé à zéro n'est pas seulement neutre : il disparaît des
        combinaisons, comme dans la note de calcul d'origine.
      </p>
      <div class="fondations-charges-defilement">
        <table class="fondations-charges">
          <thead>
            <tr>
              <th scope="col">Cas</th>
              <th scope="col">Type</th>
              ${COMPOSANTES.map((c) => `
                <th scope="col">${escapeHtml(c.libelle)}<em class="fondations-charges__unite">${escapeHtml(uniteDe(c))}</em></th>
              `).join("")}
            </tr>
          </thead>
          <tbody>
            ${CAS_DE_CHARGE.map((cas) => `
              <tr>
                <th scope="row">${escapeHtml(cas.libelle)}</th>
                <td class="fondations-charges__nature">${escapeHtml(cas.nature)}</td>
                ${COMPOSANTES.map((comp) => `
                  <td>
                    <input class="fondations-champ__saisie fondations-champ__saisie--serre" type="text" inputmode="decimal"
                      aria-label="${escapeHtml(`${cas.libelle} ${comp.libelle}`)}"
                      data-fondation-charge="${escapeHtml(`${cas.cle}.${comp.cle}`)}"
                      value="${escapeHtml(String(etat.entrees.charges?.[cas.cle]?.[comp.cle] ?? ""))}">
                  </td>
                `).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </fieldset>
  `;
}

/**
 * Le ferraillage proposé.
 *
 * C'est une saisie, pas un résultat : l'utilitaire ne choisit pas les barres,
 * il dit ce que la proposition vaut face à ce que le calcul exige. Une nappe
 * laissée à zéro n'est pas une nappe nulle — c'est une nappe qu'on ne pose pas,
 * et rien ne sera exigé d'elle.
 */
function dessinerFerraillage() {
  return `
    <fieldset class="fondations-zone">
      <legend>Ferraillage de la semelle</legend>
      <p class="fondations-zone__note">
        Ce que vous proposez de poser. Le calcul dira ce qu'il faut, il ne le choisit pas.
      </p>
      <div class="fondations-charges-defilement">
        <table class="fondations-charges">
          <thead>
            <tr><th scope="col">Nappe</th><th scope="col">Nombre</th><th scope="col">Diamètre</th></tr>
          </thead>
          <tbody>
            ${NAPPES.map((nappe) => `
              <tr>
                <th scope="row" class="fondations-charges__nature">${escapeHtml(nappe.libelle)}</th>
                <td>
                  <input class="fondations-champ__saisie fondations-champ__saisie--serre" type="text" inputmode="numeric"
                    aria-label="${escapeHtml(`${nappe.libelle} — nombre de barres`)}"
                    data-fondation-nappe="${escapeHtml(nappe.cle)}"
                    value="${escapeHtml(String(etat.entrees.ferraillage?.[nappe.cle]?.nombre ?? ""))}">
                </td>
                <td>
                  <select class="fondations-champ__saisie" data-fondation-barre="${escapeHtml(nappe.cle)}"
                          aria-label="${escapeHtml(`${nappe.libelle} — diamètre`)}">
                    ${BARRES.map((barre) => `
                      <option value="${escapeHtml(barre)}"${String(etat.entrees.ferraillage?.[nappe.cle]?.barre) === barre ? " selected" : ""}>${escapeHtml(barre)}</option>
                    `).join("")}
                  </select>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </fieldset>
  `;
}

function nombreLisible(valeur, decimales = 2) {
  if (valeur === Infinity) return "∞";
  if (!Number.isFinite(Number(valeur))) return "—";
  return Number(valeur).toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

/**
 * Le ratio, dit honnêtement.
 *
 * Deux valeurs se lisent mal telles quelles. `10` est la sentinelle de l'outil
 * d'origine pour « pas vérifié du tout ». Et un ratio **négatif** ne veut pas
 * dire « largement vérifié » : il vient d'une combinaison qui soulève la
 * semelle, donc d'un effort résistant négatif — c'est le pire cas, pas le
 * meilleur. Un écran qui afficherait « -19,7 » à côté d'un seuil de 1 laisserait
 * croire l'inverse de ce qui se passe.
 */
function ratioLisible(ratio) {
  const n = Number(ratio);
  if (!Number.isFinite(n)) return "—";
  if (n >= 10) return "≥ 10";
  if (n < 0) return `${nombreLisible(n, 3)} (soulèvement)`;
  return nombreLisible(n, 3);
}

/**
 * Le schéma, redessiné à la frappe.
 *
 * C'est là tout son intérêt : une cote absurde — un fût plus large que sa
 * semelle, une tête de fût hors du sol — se voit avant de lancer le calcul, et
 * non dans un résultat qu'il faudrait ensuite interpréter.
 */
function rafraichirSchema(root) {
  const hote = root.querySelector("[data-fondations-schema]");
  if (!hote) return;
  hote.innerHTML = dessinerSchema(etat.entrees, resultatPerime() ? null : etat.resultat);
}

/** Les reproches de la mémoire, remis à jour sans tout redessiner. */
function rafraichirAlertes(root) {
  const zone = root.querySelector(".fondations-rappels")?.closest(".fondations-zone");
  if (!zone) return;
  const alertes = alertesDeLaMemoire(etat.entrees, etat.rappels);
  const existante = zone.querySelector(".fondations-schema__alertes");
  if (alertes.length === 0) { existante?.remove(); return; }
  const html = alertes.map((alerte) => `<li>${escapeHtml(alerte.texte)}</li>`).join("");
  if (existante) { existante.innerHTML = html; return; }
  zone.insertAdjacentHTML("beforeend", `<ul class="fondations-schema__alertes">${html}</ul>`);
}

/** La mention « périmé », posée sans tout redessiner. */
function marquerPerime(root) {
  const resultats = root.querySelector(".fondations-resultats");
  if (!resultats) return;
  resultats.classList.toggle("est-perime", resultatPerime());
}

/** Un ratio est dépassé s'il excède 1 — ou s'il est négatif, cf. ci-dessus. */
function ratioDepasse(ratio) {
  const n = Number(ratio);
  return Number.isFinite(n) && (n > 1 || n < 0);
}

/**
 * Le signe d'un verdict, à côté de son chiffre.
 *
 * La couleur seule ne suffit pas : un daltonien lit le même gris des deux
 * côtés, et une capture d'écran en noir et blanc aussi. Le signe porte
 * l'information, la couleur la renforce.
 */
function signeDuVerdict(ratio) {
  if (!Number.isFinite(Number(ratio))) return "";
  const passe = !ratioDepasse(ratio);
  return `<span class="fondations-signe fondations-signe--${passe ? "ok" : "ko"}"
    aria-label="${passe ? "vérifié" : "non vérifié"}" title="${passe ? "Vérifié" : "Non vérifié"}">
    ${svgIcon(passe ? "check-circle-fill" : "x-circle-fill", { className: "octicon" })}
  </span>`;
}

/** Le ferraillage : ce qui est posé, ce qu'il faut, et l'écart. */
function dessinerInterne(r) {
  const interne = r.interne;
  if (!interne) return "";

  if (interne.ratio === null) {
    return `
      <section class="fondations-bloc">
        <header class="fondations-bloc__tete"><h5>Ferraillage de la semelle</h5></header>
        <p class="fondations-bloc__combinaison">
          ${r.bilan?.verifie
            ? "Aucune nappe n'est proposée : renseignez un nombre de barres pour que le calcul se prononce."
            : "La stabilité externe n'est pas vérifiée : sur une semelle qui glisse ou qui bascule, la question du ferraillage ne se pose pas encore."}
        </p>
      </section>
    `;
  }

  return `
    <section class="fondations-bloc">
      <header class="fondations-bloc__tete">
        <h5>Ferraillage de la semelle</h5>
        <span class="fondations-bloc__ratio${ratioDepasse(interne.ratio) ? " est-depasse" : " est-verifie"}">
          ${signeDuVerdict(interne.ratio)}${escapeHtml(ratioLisible(interne.ratio))}
        </span>
      </header>
      <div class="fondations-charges-defilement">
        <table class="fondations-charges fondations-nappes">
          <thead>
            <tr>
              <th scope="col">Nappe</th>
              <th scope="col">Posé</th>
              <th scope="col">es<em class="fondations-charges__unite">m</em></th>
              <th scope="col">As<em class="fondations-charges__unite">cm²</em></th>
              <th scope="col">As,min<em class="fondations-charges__unite">cm²</em></th>
              <th scope="col" title="Section exigée rapportée à la section posée. Au-delà de 1, l'acier posé ne suffit pas.">
                Ratio<em class="fondations-charges__unite">As,min / As</em>
              </th>
            </tr>
          </thead>
          <tbody>
            ${interne.nappes.map((nappe) => `
              <tr>
                <th scope="row">${escapeHtml(nappe.cle)}</th>
                <td>${nappe.nombre > 0 ? escapeHtml(`${nappe.nombre} ${nappe.barre}`) : "—"}</td>
                <td>${nappe.espacement === null ? "—" : escapeHtml(nombreLisible(nappe.espacement, 2))}</td>
                <td>${nappe.fournie === null ? "—" : escapeHtml(nombreLisible(nappe.fournie, 1))}</td>
                <td>${nappe.requise === null ? "—"
                  : nappe.requise === Infinity ? "section insuffisante"
                    : escapeHtml(nombreLisible(nappe.requise, 2))}</td>
                <td class="${nappe.ratio === null ? "" : ratioDepasse(nappe.ratio) ? "est-depasse" : "est-verifie"}">
                  ${nappe.ratio === null ? "—" : `${signeDuVerdict(nappe.ratio)}${escapeHtml(ratioLisible(nappe.ratio))}`}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function dessinerResultats() {
  if (!etat.resultat) {
    return `
      <article class="fondations-resultats fondations-resultats--vide">
        <h4>Résultats</h4>
        <p class="gh-text-muted">Aucun calcul lancé. Rien n'est affiché tant que rien n'a été calculé.</p>
      </article>
    `;
  }

  const r = etat.resultat;
  const u = r.unites || {};
  const selon = r.bilan?.selon === "annexe F" ? "Capacité portante sismique" : "Stabilité externe";
  const verdict = r.bilan?.verifie
    ? `<span class="fondations-verdict fondations-verdict--ok">${escapeHtml(selon)} vérifiée</span>`
    : `<span class="fondations-verdict fondations-verdict--ko">${escapeHtml(selon)} non vérifiée</span>`;

  const bloc = (titre, ratio, combinaison, lignes) => `
    <section class="fondations-bloc">
      <header class="fondations-bloc__tete">
        <h5>${escapeHtml(titre)}</h5>
        <span class="fondations-bloc__ratio${ratioDepasse(ratio) ? " est-depasse" : " est-verifie"}">
          ${signeDuVerdict(ratio)}${escapeHtml(ratioLisible(ratio))}
        </span>
      </header>
      <p class="fondations-bloc__combinaison">${escapeHtml(combinaison || "—")}</p>
      <dl class="fondations-bloc__valeurs">
        ${lignes.map(([cle, valeur, unite]) => `
          <div><dt>${escapeHtml(cle)}</dt><dd>${escapeHtml(valeur)}${unite ? ` <em>${escapeHtml(unite)}</em>` : ""}</dd></div>
        `).join("")}
      </dl>
    </section>
  `;

  const surface = (titre, s) => `
    <div><dt>${escapeHtml(titre)}</dt>
      <dd>${escapeHtml(nombreLisible(s.obtenue, 1))} % <em>(minimum ${escapeHtml(nombreLisible(s.minimale, 1))} %)</em></dd></div>
  `;

  return `
    <article class="fondations-resultats${resultatPerime() ? " est-perime" : ""}">
      <header class="fondations-resultats__tete">
        <h4>Résultats</h4>
        ${verdict}
      </header>
      <p class="fondations-resultats__perime">
        La saisie a changé depuis ce calcul : ces chiffres ne décrivent plus ce
        qui est à l'écran. Relancez le calcul.
      </p>
      <p class="fondations-resultats__bilan">
        Ratio déterminant <strong class="${ratioDepasse(r.bilan?.ratio) ? "est-depasse" : "est-verifie"}">${escapeHtml(ratioLisible(r.bilan?.ratio))}</strong>
        sur ${escapeHtml(String(r.combinaisonsExaminees ?? "—"))} combinaisons examinées.
        Un ratio supérieur à 1 signifie que la sollicitation dépasse la résistance.
      </p>

      ${r.annexeF ? bloc("Capacité portante sismique — EN 1998-5 annexe F", r.annexeF.ratio, r.annexeF.combinaison, [
        ["Direction déterminante", `suivant ${r.annexeF.direction}`, ""],
        ["ag — accélération de calcul", nombreLisible(r.annexeF.parametres.ag, 3), "m/s²"],
        ["S — paramètre de sol", nombreLisible(r.annexeF.parametres.S, 2), ""],
        ["gRd — coefficient de modèle", nombreLisible(r.annexeF.parametres.gammaRd, 2), ""],
        ["N — effort normal réduit", nombreLisible(r.annexeF.directions.find((d) => d.direction === r.annexeF.direction)?.N, 4), ""],
        ["V — effort tranchant réduit", nombreLisible(r.annexeF.directions.find((d) => d.direction === r.annexeF.direction)?.V, 4), ""],
        ["M — moment réduit", nombreLisible(r.annexeF.directions.find((d) => d.direction === r.annexeF.direction)?.M, 4), ""]
      ]) : ""}
      ${r.annexeF ? `<p class="fondations-resultats__portee">
        Sous ce règlement, l'annexe F <strong>remplace</strong> les trois vérifications
        ci-dessous : elle tient le triplet (N, V, M) à l'intérieur d'une surface limite,
        au lieu de juger séparément le glissement, le basculement et la contrainte.
        Celles-ci restent affichées pour information.
        L'outil d'origine arrondit ce ratio à l'unité dans sa case de bilan
        (${escapeHtml(String(r.annexeF.arrondiDeLaSource))}) ; le nombre est donné ici tel quel.
      </p>` : ""}

      ${bloc("Glissement", r.glissement?.ratio, r.glissement?.combinaison, [
        ["HEd — effort horizontal total", nombreLisible(r.glissement?.HEd, 1), u.effort],
        ["Rh,d,1 — part de frottement", nombreLisible(r.glissement?.Rhd1, 1), u.effort],
        ["Rh,d,2 — part de cohésion", nombreLisible(r.glissement?.Rhd2, 1), u.effort],
        ["Rp,d — part de butée", nombreLisible(r.glissement?.Rpd, 1), u.effort],
        ["HRd — effort résistant", nombreLisible(r.glissement?.HRd, 1), u.effort]
      ])}

      ${bloc("Basculement", r.basculement?.ratio, r.basculement?.combinaison, [
        ["Sens sollicitant", String(r.basculement?.sens ?? "—"), ""],
        ["MEd — moment sollicitant", nombreLisible(r.basculement?.MEd, 1), u.moment],
        ["Mst,0 — part due aux charges", nombreLisible(r.basculement?.Mst0, 1), u.moment],
        ["Mst,b — part due à la butée", nombreLisible(r.basculement?.Mstb, 1), u.moment],
        ["MRd — moment stabilisant", nombreLisible(r.basculement?.MRd, 1), u.moment]
      ])}

      ${bloc("Contrainte", r.contrainte?.ratio, r.contrainte?.combinaison, [
        ["Vd — effort vertical", nombreLisible(r.contrainte?.Vd, 1), u.effort],
        ["Md,x — moment résiduel suivant x", nombreLisible(r.contrainte?.Mdx, 1), u.moment],
        ["Md,y — moment résiduel suivant y", nombreLisible(r.contrainte?.Mdy, 1), u.moment],
        ["sref — contrainte de référence", nombreLisible(r.contrainte?.sigmaRef, 3), u.contrainte],
        ["sLIM — contrainte limite", nombreLisible(r.contrainte?.sigmaLim, 3), u.contrainte],
        ["id — coefficient d'inclinaison", nombreLisible(r.contrainte?.id, 3), ""],
        ["sREF — contrainte admissible", nombreLisible(r.contrainte?.sigmaRefLim, 3), u.contrainte]
      ])}

      <section class="fondations-bloc">
        <header class="fondations-bloc__tete">
          <h5>Surfaces comprimées</h5>
          <span class="fondations-bloc__ratio${ratioDepasse(r.surfaces?.ratio) ? " est-depasse" : " est-verifie"}">
          ${signeDuVerdict(r.surfaces?.ratio)}${escapeHtml(ratioLisible(r.surfaces?.ratio))}
        </span>
        </header>
        <dl class="fondations-bloc__valeurs">
          ${surface("ELU / ELA", r.surfaces?.eluEla || {})}
          ${surface("ELS caractéristiques", r.surfaces?.elsRares || {})}
          ${surface("ELS quasi-permanents", r.surfaces?.elsQp || {})}
        </dl>
      </section>

      ${dessinerInterne(r)}

      <p class="fondations-resultats__portee">
        Cet écran porte la <strong>stabilité externe</strong>, le
        <strong>ferraillage de la semelle</strong> et la <strong>capacité portante
        sismique</strong> de l'annexe F. Ne sont pas calculés :
        ${escapeHtml((r.interne?.horsPortee ?? []).join(", ").toLowerCase())}.
        Ils ne sont donc pas vérifiés par ce résultat.
      </p>
    </article>
  `;
}
