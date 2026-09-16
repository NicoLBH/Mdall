/**
 * Écouter une barre de requête et les menus de son en-tête.
 *
 * ## Pourquoi c'est ici
 *
 * Trois écrans posent la même barre et les mêmes menus : tous les sujets,
 * toutes les propositions, et les propositions d'un projet. Les gestes sont
 * **exactement** les mêmes — on tape, on clique une valeur, on vide —, et les
 * deux détails qui les rendent utilisables se réapprennent à chaque copie :
 *
 *  - **le curseur revient là où il était.** Sans cela, le deuxième caractère le
 *    renvoie au début du champ et la saisie devient impossible. C'est le défaut
 *    qu'on répare une fois par écran qui redessine à la frappe ;
 *  - **le menu se rouvre après le rendu.** Il part avec le redessin, et l'on
 *    recliquerait le bouton entre deux valeurs d'un champ à choix multiple — où
 *    l'on en coche justement plusieurs d'affilée.
 *
 * Une troisième copie les aurait oubliés une fois de plus (règle 10).
 *
 * ## Un seul état filtrant, et c'est la requête
 *
 * La barre, les menus et le rail écrivent tous dans la même case. Un menu qui
 * tiendrait la sienne finirait par dire autre chose que la barre, et l'on ne
 * saurait plus lequel commande (règle 4). Ce module ne retient donc rien : il
 * écrit dans l'état qu'on lui donne, et redessine.
 */

import {
  BLOC_DES_FILTRES, basculerUnMenuDenTete, dansUnBlocDeFiltres,
  fermerLesMenusDenTete, ouvrirUnMenuDenTete
} from "./menus-den-tete.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Un nom d'écran utilisable dans un sélecteur d'attribut, et rien d'autre. */
const nomSain = (valeur) => (/^[a-z][a-z0-9-]*$/.test(texte(valeur)) ? texte(valeur) : "sujets");

/**
 * @param {Element} contenu la racine de l'écran, redessinée à chaque geste
 * @param {object} options
 * @param {string} [options.nom] celui qu'a reçu la barre (`sujets`, `propositions`)
 * @param {{requete: string, page: number, cherchesDesFiltres: object}} options.etat
 * @param {() => void} options.redessiner
 */
export function brancherLaRequete(contenu, { nom = "sujets", etat = null, redessiner = () => {} } = {}) {
  if (!contenu || !etat) return;
  const sien = nomSain(nom);

  const barre = contenu.querySelector(`[data-${sien}-recherche]`);
  if (barre) {
    barre.oninput = (event) => {
      const ou = event.target.selectionStart;
      etat.requete = String(event.target.value || "");
      // **Changer la requête ramène à la première page.** Rester à la page
      // douze d'une liste qui n'en fait plus trois montre un tableau vide, et
      // l'on croit que la recherche ne retient rien.
      etat.page = 1;
      redessiner();
      rendreLeCurseur(contenu, `[data-${sien}-recherche]`, ou);
    };
  }

  contenu.querySelector(`[data-${sien}-vider]`)?.addEventListener("click", (event) => {
    event.preventDefault();
    etat.requete = "";
    etat.page = 1;
    redessiner();
  });

  /**
   * **Un clic pose une requête, il ne navigue pas.**
   *
   * Le rail et les menus de l'en-tête écrivent le même attribut, et pour la
   * même raison : chaque entrée porte la **requête complète** qu'elle
   * produirait, on la recopie telle quelle, et la barre reste l'endroit où elle
   * se lit et se corrige au clavier.
   *
   * L'écoute est posée sur tout le contenu, et non dans le seul bloc des
   * filtres : le rail est ailleurs dans la page, et une seconde écoute pour lui
   * aurait fait deux gestes à corriger ensemble.
   */
  contenu.querySelectorAll("[data-sujets-lecture]").forEach((entree) => {
    entree.addEventListener("click", (event) => {
      event.preventDefault();
      const nomDuMenu = nomDuMenuDe(entree);
      etat.requete = String(entree.getAttribute("data-sujets-lecture") || "");
      etat.page = 1;
      redessiner();
      // Une entrée du rail n'est pas dans un menu : `nomDuMenuDe` rend `""`, et
      // il n'y a rien à rouvrir.
      ouvrirUnMenuDenTete(contenu, nomDuMenu);
    });
  });

  const bloc = contenu.querySelector(`[${BLOC_DES_FILTRES}]`);
  if (bloc) {
    bloc.querySelectorAll("[data-sujets-menu]").forEach((bouton) => {
      bouton.addEventListener("click", (event) => {
        event.preventDefault();
        basculerUnMenuDenTete(contenu, String(bouton.getAttribute("data-sujets-menu") || ""));
      });
    });

    bloc.querySelectorAll("[data-sujets-filtre-recherche]").forEach((champ) => {
      champ.addEventListener("input", (event) => {
        const cle = String(champ.getAttribute("data-sujets-filtre-recherche") || "");
        const nomDuMenu = nomDuMenuDe(champ);
        const debut = event.target.selectionStart;
        const fin = event.target.selectionEnd;

        etat.cherchesDesFiltres = {
          ...(etat.cherchesDesFiltres || {}), [cle]: String(event.target.value || "")
        };
        redessiner();
        ouvrirUnMenuDenTete(contenu, nomDuMenu);

        const remis = contenu.querySelector(`[data-sujets-filtre-recherche="${cle}"]`);
        if (!remis) return;
        remis.focus();
        if (Number.isFinite(debut) && Number.isFinite(fin)) remis.setSelectionRange(debut, fin);
      });
    });
  }

  // Un clic ailleurs referme ce qui était ouvert : un menu resté ouvert derrière
  // ce qu'on regarde se lit comme un défaut d'affichage.
  contenu.addEventListener("click", (event) => {
    if (!dansUnBlocDeFiltres(event.target)) fermerLesMenusDenTete(contenu);
  });
}

function nomDuMenuDe(noeud) {
  return String(
    noeud.closest("[data-sujets-menu-liste]")?.getAttribute("data-sujets-menu-liste") || ""
  );
}

/**
 * **Le curseur revient là où il était.** Sans cela, le deuxième caractère le
 * renverrait au début du champ et la saisie deviendrait impossible.
 */
function rendreLeCurseur(contenu, selecteur, ou) {
  const remis = contenu.querySelector(selecteur);
  if (!remis) return;
  remis.focus();
  const position = Number.isFinite(ou) ? ou : remis.value.length;
  remis.setSelectionRange(position, position);
}
