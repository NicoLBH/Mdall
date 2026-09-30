/**
 * Ce que la prédiction a annoncé, et ce qui est arrivé — **point par point**.
 *
 * ## Pourquoi un chiffre ne suffit pas
 *
 * L'écran des Indicateurs affiche « précision à 3 : 44 % ». C'est la bonne
 * mesure, et elle ne dit pas si le système **travaille** : un prédicteur qui
 * annonce toujours `structure` sur un chantier qui parle surtout de structure
 * obtient un bon chiffre sans rien avoir compris. Un autre qui n'annonce jamais
 * rien obtient `null`, ce qui ressemble à une panne.
 *
 * Il faut donc pouvoir regarder : **quels domaines ont été annoncés, lesquels
 * sont arrivés, et lesquels ne se sont jamais rencontrés**.
 *
 * ## Ce que ce module rend, et ce qu'il ne calcule pas
 *
 * Il ne prédit rien et ne mesure rien : `rejouerLePasse` a déjà fait le travail
 * et rend, pour chaque moment, ce qui a été annoncé et ce qui est venu. Ici on
 * range, on compte, et on nomme les trois cas qui se lisent :
 *
 *   * **visé** — le domaine venu était dans les candidats ;
 *   * **manqué** — il est venu, personne ne l'avait annoncé ;
 *   * **annoncé pour rien** — il était candidat, rien de tel n'est venu.
 *
 * Le troisième n'est pas une faute : annoncer trois domaines quand un seul
 * arrive est le fonctionnement normal d'un classement. Il devient une
 * information quand **un domaine n'est jamais que dans cette colonne** : le
 * système le propose sans cesse et ne tombe jamais juste.
 *
 * ## Il est pur
 *
 * Des rendus entrent, des comptes sortent.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'on dit d'un domaine, face à face. */
export const SORT_DUN_DOMAINE = {
  VISE: "vise",
  MANQUE: "manque",
  POUR_RIEN: "pour-rien"
};

/**
 * Les points notables, mis à plat et lisibles.
 *
 * **Les points où rien n'est arrivé ne sont pas des points.** Ils ne notent
 * rien — un mois calme n'est pas une erreur du prédicteur — et les afficher
 * ferait une liste où l'on cherche les lignes qui comptent.
 *
 * @param {object[]} rendus ce que rend `rejouerLePasse`
 * @param {number} rang combien de candidats on regarde
 */
export function lesPointsDeLaPrediction(rendus = [], rang = 3) {
  const combien = Math.max(1, Number(rang) || 1);

  return (Array.isArray(rendus) ? rendus : [])
    .filter((un) => un?.notable)
    .map((un) => {
      const candidats = (un.predit ?? []).slice(0, combien).map(texte).filter(Boolean);
      const annonces = new Set(candidats);
      const venus = [...new Set((un.venu ?? []).map((une) => texte(une?.quoi)).filter(Boolean))];

      return {
        quand: texte(un.quand),
        candidats,
        // Ce qui a été annoncé au-delà du rang regardé : le prédicteur le
        // proposait, mais pas assez haut pour compter.
        pluLoin: (un.predit ?? []).slice(combien).map(texte).filter(Boolean),
        venus,
        vises: venus.filter((une) => annonces.has(une)),
        manques: venus.filter((une) => !annonces.has(une)),
        pourRien: candidats.filter((une) => !venus.includes(une)),
        juste: venus.some((une) => annonces.has(une))
      };
    });
}

/**
 * Le bilan par domaine : combien de fois annoncé, venu, visé.
 *
 * C'est le tableau qui répond à « le système fait-il son travail ». Un domaine
 * **venu souvent et jamais visé** dit que le prédicteur ne le voit pas ; un
 * domaine **annoncé souvent et jamais venu** dit qu'il le propose pour rien.
 *
 * Rangé du plus venu au moins venu : ce qui arrive souvent est ce qu'on aurait
 * le plus intérêt à prédire.
 */
export function leBilanParDomaine(points = []) {
  const parDomaine = new Map();
  const compter = (domaine, quoi) => {
    const nom = texte(domaine);
    if (!nom) return;
    if (!parDomaine.has(nom)) {
      parDomaine.set(nom, { domaine: nom, annonce: 0, venu: 0, vise: 0 });
    }
    parDomaine.get(nom)[quoi] += 1;
  };

  for (const point of Array.isArray(points) ? points : []) {
    for (const un of point.candidats ?? []) compter(un, "annonce");
    for (const un of point.venus ?? []) compter(un, "venu");
    for (const un of point.vises ?? []) compter(un, "vise");
  }

  return [...parDomaine.values()].sort((gauche, droite) =>
    droite.venu - gauche.venu
    || droite.annonce - gauche.annonce
    || gauche.domaine.localeCompare(droite.domaine, "fr"));
}

/**
 * Ce qu'on dit d'un domaine en une phrase.
 *
 * **Jamais « bon » ou « mauvais ».** Un domaine qui n'arrive qu'une fois et
 * qu'on rate n'accuse personne ; ce qui se lit, c'est le rapport entre ce qui
 * est venu et ce qui a été vu venir.
 */
export function phraseDunDomaine(ligne = null) {
  const venu = Number(ligne?.venu) || 0;
  const vise = Number(ligne?.vise) || 0;
  const annonce = Number(ligne?.annonce) || 0;

  if (!venu && annonce) return "annoncé, jamais venu";
  if (venu && !annonce) return "venu, jamais annoncé";
  if (venu && !vise) return "annoncé ailleurs, jamais quand il est venu";
  if (venu) return `${vise} fois sur ${venu}`;
  return "";
}

/**
 * Les domaines du vocabulaire que ce chantier n'a jamais vus.
 *
 * **C'est une information, pas un manque.** Un chantier qui ne parle jamais
 * d'acoustique n'a rien à prédire en acoustique ; le savoir évite de chercher
 * une panne là où il n'y a que le chantier.
 */
/**
 * La phrase qui dit lesquels, en un seul morceau.
 *
 * **Elle est ici et non dans le gabarit** : une phrase écrite dans un littéral
 * HTML se retrouve coupée par l'indentation du fichier, et « Jamais rencontrés
 * sur ce chantier :\n     sol » ne se lit pas comme une phrase — ni pour un
 * humain, ni pour ce qui la cherche (règle 10).
 */
export function laPhraseDesJamaisVus(jamais = []) {
  const noms = (Array.isArray(jamais) ? jamais : []).map(texte).filter(Boolean);
  if (!noms.length) return "";
  return `Jamais rencontrés sur ce chantier : ${noms.join(", ")}.`
    + " Ce n'est pas une panne du prédicteur — le chantier n'en parle pas.";
}

export function lesDomainesJamaisVus(points = [], vocabulaire = []) {
  const vus = new Set();
  for (const point of Array.isArray(points) ? points : []) {
    for (const un of point.candidats ?? []) vus.add(texte(un));
    for (const un of point.venus ?? []) vus.add(texte(un));
  }
  return (Array.isArray(vocabulaire) ? vocabulaire : [])
    .map(texte).filter(Boolean)
    .filter((un) => !vus.has(un));
}
