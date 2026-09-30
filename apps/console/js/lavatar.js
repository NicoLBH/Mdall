/**
 * L'avatar de la console, et **le chemin du retour**.
 *
 * ## Pourquoi il fallait le remettre
 *
 * La console n'avait aucune sortie. On y entrait par le menu de l'avatar de
 * Mdall, et on en repartait par le bouton « page précédente » du navigateur —
 * c'est-à-dire par un geste qui ne fait pas partie du produit. Un endroit dont
 * on ne sait pas sortir est un endroit où l'on n'entre pas volontiers.
 *
 * ## Les classes, pas le module
 *
 * `global-header.js` dessine le même menu, et il aurait été tentant de
 * l'emporter. Il traîne le magasin, les routes, le carnet et les raccourcis de
 * la barre : la console aurait embarqué la navigation entière de
 * l'application, et avec elle la moitié de ses services — dans une page dont
 * tout l'intérêt est de ne rien pouvoir atteindre.
 *
 * On reprend donc **les classes** — `gh-user-menu__*` — et `svgIcon`, comme on
 * a repris la feuille de style. Le rendu est le même, la dépendance ne l'est
 * pas. Le prix est un second petit passage qui ouvre et ferme un menu ; il est
 * connu, et il est plus faible que celui de l'autre côté.
 *
 * ## Ce qu'il n'y a pas dedans, et c'est délibéré
 *
 * Ni « Projets », ni « Réglages », ni la déconnexion. Un seul item :
 * **« Profil utilisateur »**, qui ramène à Mdall. La console n'est pas un
 * endroit d'où l'on pilote son compte ; c'est un endroit d'où l'on regarde des
 * comptes, et dont on sort.
 */

import { supabase } from "../partage/assets/js/auth.js";
import { svgIcon } from "../partage/js/ui/icons.js";

/**
 * L'avatar par défaut de Mdall, **le même fichier**.
 *
 * Une icône de silhouette à la place aurait suffi à « faire un avatar », et
 * aurait fait deux avatars par défaut dans le produit : celui de
 * l'application, et celui de la console. On emporte donc l'image, comme on
 * emporte la feuille de style (règle 4).
 */
const LAVATAR_PAR_DEFAUT = "assets/images/260093543.png";

const echapper = (valeur) => String(valeur ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

/**
 * Où ramène « Profil utilisateur ».
 *
 * L'adresse du profil dans Mdall, pas la racine : revenir à l'accueil
 * obligerait à re-cliquer pour arriver là où l'item promettait d'emmener.
 */
export const LE_RETOUR = { adresse: "../index.html#profile", nom: "Profil utilisateur" };

/**
 * Ce que le menu montre de celui qui regarde.
 *
 * **L'adresse, et rien d'autre.** La console n'a pas de magasin où le nom
 * d'usage serait déjà rangé, et aller le chercher demanderait une requête de
 * plus pour une ligne de texte. Une adresse suffit à savoir sous quel compte on
 * est — et c'est la seule chose qu'on vient vérifier ici avant de repartir.
 */
export function renderLavatar(courriel = "") {
  const dit = echapper(courriel || "Compte");

  return `
    <div class="gh-user-menu gh-action" id="consoleAvatar">
      <button
        id="consoleAvatarBtn"
        class="gh-user-menu__trigger gh-action__button"
        type="button"
        aria-haspopup="menu"
        aria-expanded="false"
        aria-label="Compte utilisateur"
      ><img src="${LAVATAR_PAR_DEFAUT}" alt="Avatar"
            class="documents-commit-shell__avatar-img gh-user-menu__avatar-img"></button>

      <div class="gh-user-menu__dropdown gh-menu" id="consoleAvatarMenu" role="menu">
        <div class="gh-user-menu__profile-head" role="presentation">
          <img src="${LAVATAR_PAR_DEFAUT}" alt="Avatar" class="gh-user-menu__profile-avatar">
          <span class="gh-user-menu__profile-meta">
            <span class="gh-user-menu__profile-name">${dit}</span>
            <span class="gh-user-menu__profile-email">Console de Mdall</span>
          </span>
        </div>

        <div class="gh-user-menu__divider" role="separator"></div>

        <a href="${LE_RETOUR.adresse}" class="gh-user-menu__item" role="menuitem">
          <span class="gh-user-menu__item-icon">${
            svgIcon("person", { className: "octicon octicon-person" })}</span>
          <span class="gh-user-menu__item-meta">
            <span class="gh-user-menu__item-name">${echapper(LE_RETOUR.nom)}</span>
          </span>
        </a>
      </div>
    </div>
  `;
}

/**
 * L'ouvrir, le fermer, et le fermer aussi quand on clique ailleurs.
 *
 * Le troisième cas est celui qu'on oublie, et c'est celui qui laisse un menu
 * ouvert par-dessus la page pendant qu'on lit autre chose.
 */
export function monterLavatar(hote) {
  const menu = hote?.querySelector?.("#consoleAvatar");
  if (!menu) return;

  const bouton = menu.querySelector("#consoleAvatarBtn");
  const liste = menu.querySelector("#consoleAvatarMenu");

  const montrer = (ouvert) => {
    menu.classList.toggle("is-open", ouvert);
    liste?.classList.toggle("gh-menu--open", ouvert);
    bouton?.setAttribute("aria-expanded", ouvert ? "true" : "false");
  };

  document.addEventListener("click", (evenement) => {
    // Le menu a pu être redessiné : on le retrouve par le document plutôt que
    // de garder une référence qui désignerait un nœud détaché.
    const vivant = document.getElementById("consoleAvatar");
    if (!vivant) return;
    if (evenement.target.closest?.("#consoleAvatarBtn")) {
      montrer(!vivant.classList.contains("is-open"));
      return;
    }
    if (!vivant.contains(evenement.target)) montrer(false);
  });
}

/** L'adresse du compte, ou rien. Une console sans session ne s'affiche pas. */
export async function leCourrielDuCompte() {
  try {
    const { data } = await supabase.auth.getUser();
    return String(data?.user?.email ?? "");
  } catch {
    return "";
  }
}
