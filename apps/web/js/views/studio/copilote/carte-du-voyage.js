/**
 * Où le Copilote vient de vous emmener, dans le fil de la conversation.
 *
 * ## Pourquoi une carte alors qu'on est déjà parti
 *
 * Le déplacement a lieu : on demande « ouvre-moi le Copilote du Restaurant
 * scolaire » et l'on y arrive. La carte n'est donc pas un bouton à cliquer —
 * c'est la **trace** de ce qui a été fait, et elle a deux usages.
 *
 * Le premier : on revient sur la discussion des jours plus tard, et elle dit
 * où l'on était allé. Le second : on y retourne d'un clic, sans réécrire la
 * demande. Un fil qui ne garderait rien obligerait à reposer la question pour
 * refaire le chemin.
 *
 * ## Le libellé vient d'où il vit
 *
 * Le nom de l'onglet se lit dans `constants.js`, avec les onglets eux-mêmes ; le
 * nom du Copilote dans `services/ecrans-transversaux.js`, avec les autres écrans
 * qui se nomment. Les recopier ici en ferait la version qui reste fausse le jour
 * où l'un des deux change (`docs/fondamentaux.md`, règle 10).
 *
 * ## Pourquoi un fichier à part
 *
 * L'écran du Copilote parle à la base, et un module qui parle à la base ne
 * s'importe pas dans un test : l'import lève avant la première ligne. Cette
 * carte, elle, n'a besoin que d'un nom et d'une adresse.
 */

import { escapeHtml } from "../../../utils/escape-html.js";
import { svgIcon } from "../../../ui/icons.js";
import { PROJECT_TABS } from "../../../constants.js";
import { LE_COPILOTE } from "../../../services/ecrans-transversaux.js";
import { ecranDuProjet } from "../../../../vendor/utilitaires/ecrans-du-projet.js";

/**
 * Comment cet écran s'appelle à l'écran.
 *
 * L'onglet d'abord, le panneau ensuite quand il y en a un : « Atelier ·
 * Copilote » dit le chemin qu'on vient de faire, et c'est celui qu'on refera
 * à la main si l'on revient.
 *
 * @param {string} cle une clé de `ECRANS_DU_PROJET`
 * @returns {string} le libellé, ou `""` quand la clé n'en désigne aucun
 */
export function libelleDeLEcran(cle) {
  const ecran = ecranDuProjet(cle);
  if (!ecran) return "";

  const onglet = PROJECT_TABS.find((tab) => tab.id === ecran.onglet);
  // Un onglet déclaré ici mais absent de l'application est une destination qui
  // n'ouvre sur rien : on ne le nomme pas au hasard (règle 5). Un test tient
  // les deux listes ensemble, pour que ce cas ne se produise pas en silence.
  if (!onglet) return "";

  // Le seul panneau qu'une adresse désigne est celui du Copilote, et il porte
  // déjà son nom ailleurs.
  return ecran.panneau ? `${onglet.label} · ${LE_COPILOTE.nom}` : onglet.label;
}

/**
 * L'icône de l'écran où l'on va — **la sienne**, pas une flèche.
 *
 * C'est celle de l'onglet, telle que la barre du projet la dessine : on
 * reconnaît la destination avant d'avoir lu son nom. En choisir une autre ici
 * aurait fait deux images pour un même écran, et l'œil aurait cherché la
 * mauvaise en arrivant.
 *
 * @param {string} cle une clé de `ECRANS_DU_PROJET`
 * @returns {string} le balisage de l'icône, ou `""`
 */
export function iconeDeLEcran(cle) {
  const ecran = ecranDuProjet(cle);
  if (!ecran) return "";
  // Le Copilote n'est pas un onglet : son icône est celle de son entrée dans le
  // rail, et elle se lit là où l'écran se nomme.
  if (ecran.panneau) return svgIcon(LE_COPILOTE.icone);
  return PROJECT_TABS.find((tab) => tab.id === ecran.onglet)?.icon ?? "";
}

/**
 * La carte, telle qu'elle se pose dans le fil.
 *
 * @param {object} destination ce que rend `services/copilote-navigation.js`
 */
export function renderCarteDuVoyage(destination = null) {
  const route = String(destination?.route ?? "").trim();
  const projet = String(destination?.projet ?? "").trim();
  if (!route || !projet) return "";

  const ecran = libelleDeLEcran(destination?.ecran);

  return `
    <div class="copilote-outil">
      <p class="copilote-outil__titre">
        ${svgIcon("arrow-right")}
        ${escapeHtml("Vous êtes arrivé")}
      </p>
      ${/*
        **Un lien, et non un bouton.** On est déjà parti : ce qui reste sert à y
        retourner, et un lien se copie, s'ouvre dans un onglet, se survole en
        montrant où il mène. Un bouton n'aurait rien de tout cela.
      */""}
      <a class="copilote-ouvrir" href="${escapeHtml(route)}">
        ${iconeDeLEcran(destination?.ecran) || svgIcon("arrow-right")}
        <b>${escapeHtml(projet)}</b>
        ${ecran ? `<span class="copilote-ouvrir__ecran">${escapeHtml(ecran)}</span>` : ""}
      </a>
    </div>
  `;
}
