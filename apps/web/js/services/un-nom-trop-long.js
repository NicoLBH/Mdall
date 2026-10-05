/**
 * Un nom trop long, coupé **par le milieu** — et seulement s'il déborde.
 *
 * ## Le défaut que cela répare
 *
 * > « Quand les noms de documents sont très longs, il faut un système avec le
 * >   début du nom + "…" + la fin du nom. »
 *
 * Un nom de document de cent trente caractères poussait tout le reste de la
 * ligne hors de l'écran : la pastille d'état se retrouvait invisible, et l'on ne
 * pouvait plus savoir si le document avait été analysé.
 *
 * ## Pourquoi par le milieu, et non par la fin
 *
 * C'est le cœur de la chose. `text-overflow: ellipsis` coupe la fin, et **la fin
 * est ce qui distingue** :
 *
 *     1824_RICT_03_VERIFAS_Montholon_Mediatheque_phase_EXE_indice_C.pdf
 *     1824_RICT_04_VERIFAS_Montholon_Mediatheque_phase_EXE_indice_C.pdf
 *
 * Coupés par la fin, ces deux-là sont le même nom. Le numéro est au début,
 * l'indice et l'extension sont à la fin, et le milieu — le nom du chantier,
 * répété sur chaque fichier — est précisément ce qu'on peut perdre.
 *
 * ## Pourquoi il ne compte plus les caractères
 *
 * > « La troncature doit d'abord occuper toute la largeur disponible, sinon on
 * >   se retrouve avec des noms tronqués et des espaces vides ! »
 *
 * La première version coupait à soixante caractères, toujours. Dans une colonne
 * large, elle rendait donc un nom coupé **à côté de trente centimètres de
 * vide** : on perdait de l'information pour rien, et l'écran avait l'air cassé.
 *
 * Aucun nombre de caractères ne peut avoir raison : la colonne fait la largeur
 * que la fenêtre lui laisse, et un `M` majuscule ne fait pas la largeur d'un
 * `l`. **La seule chose qui sait où couper est le navigateur**, au moment du
 * rendu.
 *
 * ## Ce que ce module fait à la place : il découpe, il ne coupe pas
 *
 * Il rend **deux morceaux** — un début qu'on a le droit de rogner, une fin qu'on
 * garde entière — et la feuille de style fait le reste :
 *
 *     .nom-coupable__debut { overflow:hidden; text-overflow:ellipsis; min-width:0 }
 *     .nom-coupable__fin   { flex:0 0 auto }
 *
 * Le début prend toute la place disponible et ne s'abrège **que** s'il déborde ;
 * la fin ne bouge jamais. Un nom qui tient s'affiche entier, sans points de
 * suspension, et sans un pixel perdu. C'est le découpage qui est ici — donc
 * éprouvable sans DOM —, et la mesure qui est au navigateur, qui est le seul à
 * pouvoir la faire.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Combien de caractères de **fin** ne se rognent jamais.
 *
 * Douze : de quoi porter une extension et le numéro qui précède —
 * `…-0216.pdf`, `…indice_C.pdf`. C'est ce qui distingue deux documents du même
 * chantier, et c'est pour cela qu'on le protège.
 *
 * Plus long mangerait la place du début sur une colonne étroite — et le début
 * porte le numéro de rapport, qu'on cherche en premier. Plus court laisserait
 * tomber l'indice, qui est tout l'objet.
 */
export const LA_FIN_QUON_GARDE = 12;

/**
 * Un nom découpé en deux : ce qu'on peut rogner, ce qu'on garde.
 *
 * **`titre` porte toujours le nom entier**, et c'est un changement assumé. La
 * version qui comptait les caractères savait si elle avait coupé, et taisait
 * l'infobulle quand elle n'avait rien coupé. Celle-ci ne peut pas le savoir :
 * c'est le navigateur qui coupe, à la largeur qu'il a. Entre une infobulle
 * parfois redondante et un nom qu'on ne peut plus retrouver, on garde
 * l'infobulle — la première est un bruit, la seconde une impasse.
 *
 * @returns {{debut: string, fin: string, titre: string}}
 */
export function ceQuUnNomMontre(nom, laFin = LA_FIN_QUON_GARDE) {
  const entier = texte(nom);
  const garde = Math.max(0, Math.trunc(Number(laFin)) || 0);

  /**
   * **Un nom plus court que la fin qu'on garde passe entier dans la fin.**
   *
   * Le découper donnerait un début vide et une fin qui est tout le nom — ce qui
   * marcherait, mais rendrait un morceau vide dans le balisage de chaque ligne
   * courte. Autant le dire une fois ici.
   */
  if (entier.length <= garde) return { debut: "", fin: entier, titre: entier };

  return {
    debut: entier.slice(0, entier.length - garde),
    fin: entier.slice(-garde),
    titre: entier
  };
}
