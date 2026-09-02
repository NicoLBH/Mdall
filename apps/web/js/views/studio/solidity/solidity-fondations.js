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
import {
  ZONES, CHOIX, CAS_DE_CHARGE, COMPOSANTES,
  entreesParDefaut, entreesInvalides, uniteAffichee
} from "../../../services/fondations-declaration.js";
import { calculerFondation } from "../../../services/fondations-service.js";

const etat = {
  entrees: entreesParDefaut(),
  resultat: null,
  calculEnCours: false,
  erreur: "",
  invalides: []
};

export function renderSolidityFondations(root, { force = false } = {}) {
  if (!root) return;
  if (!force && root.dataset.fondationsMonte === "true") return;
  root.dataset.fondationsMonte = "true";

  dessiner(root);
  brancher(root);
  registerProjectPrimaryScrollSource(root.closest("#projectStudioRouterScroll") || document.getElementById("projectStudioRouterScroll"));
}

function brancher(root) {
  // La saisie ne redessine rien : redessiner à chaque frappe ferait perdre le
  // curseur, et l'écran n'a rien de nouveau à dire tant qu'on tape.
  root.addEventListener("input", (evenement) => {
    const champ = evenement.target.closest("[data-fondation-champ]");
    if (champ) { etat.entrees[champ.dataset.fondationChamp] = champ.value; return; }
    const charge = evenement.target.closest("[data-fondation-charge]");
    if (charge) {
      const [cas, composante] = charge.dataset.fondationCharge.split(".");
      etat.entrees.charges[cas][composante] = charge.value;
    }
  });

  root.addEventListener("change", (evenement) => {
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
  } catch (erreur) {
    etat.resultat = null;
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
            Stabilité externe d'une fondation superficielle : glissement, basculement,
            contrainte de référence et surfaces comprimées, sur 376 combinaisons d'actions.
            Le calcul est fait par le serveur, jamais par ce navigateur.
          </p>
          ${etat.erreur ? `<p class="fondations-erreur">${escapeHtml(etat.erreur)}</p>` : ""}
          ${dessinerInvalides()}
          <div class="fondations-grille">
            <div class="fondations-colonne">
              ${dessinerChoix()}
              ${ZONES.map(dessinerZone).join("")}
              ${dessinerCharges()}
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
          <label class="fondations-champ">
            <span class="fondations-champ__libelle">${escapeHtml(choix.libelle)}</span>
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

function dessinerZone(zone) {
  const unites = String(etat.entrees.unites || "");
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
              ${COMPOSANTES.map((c) => `<th scope="col">${escapeHtml(c.libelle)}</th>`).join("")}
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

/** Un ratio est dépassé s'il excède 1 — ou s'il est négatif, cf. ci-dessus. */
function ratioDepasse(ratio) {
  const n = Number(ratio);
  return Number.isFinite(n) && (n > 1 || n < 0);
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
  const verdict = r.bilan?.verifie
    ? `<span class="fondations-verdict fondations-verdict--ok">Stabilité externe vérifiée</span>`
    : `<span class="fondations-verdict fondations-verdict--ko">Stabilité externe non vérifiée</span>`;

  const bloc = (titre, ratio, combinaison, lignes) => `
    <section class="fondations-bloc">
      <header class="fondations-bloc__tete">
        <h5>${escapeHtml(titre)}</h5>
        <span class="fondations-bloc__ratio${ratioDepasse(ratio) ? " est-depasse" : ""}">${escapeHtml(ratioLisible(ratio))}</span>
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
    <article class="fondations-resultats">
      <header class="fondations-resultats__tete">
        <h4>Résultats</h4>
        ${verdict}
      </header>
      <p class="fondations-resultats__bilan">
        Ratio déterminant <strong>${escapeHtml(ratioLisible(r.bilan?.ratio))}</strong>
        sur ${escapeHtml(String(r.combinaisonsExaminees ?? "—"))} combinaisons examinées.
        Un ratio supérieur à 1 signifie que la sollicitation dépasse la résistance.
      </p>

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
          <span class="fondations-bloc__ratio${ratioDepasse(r.surfaces?.ratio) ? " est-depasse" : ""}">${escapeHtml(ratioLisible(r.surfaces?.ratio))}</span>
        </header>
        <dl class="fondations-bloc__valeurs">
          ${surface("ELU / ELA", r.surfaces?.eluEla || {})}
          ${surface("ELS caractéristiques", r.surfaces?.elsRares || {})}
          ${surface("ELS quasi-permanents", r.surfaces?.elsQp || {})}
        </dl>
      </section>

      <p class="fondations-resultats__portee">
        Cet écran porte la <strong>stabilité externe</strong>. La stabilité interne
        (ferraillage) et la capacité portante sismique de l'annexe F de l'EC8-5
        ne sont pas calculées ici, et ne sont donc pas vérifiées par ce résultat.
      </p>
    </article>
  `;
}
