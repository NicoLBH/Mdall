/**
 * Un poids en octets, écrit comme on le lit.
 *
 * Il vivait dans l'inventaire du versoir, parce que c'est là qu'il avait servi
 * d'abord. Quatre endroits l'emploient aujourd'hui, dont la console — qui ne
 * doit emporter ni lecteur de mails, ni inventaire, ni rien qui ressemble à un
 * contenu. Un formatage de nombre n'a aucune raison de traîner tout cela
 * derrière lui.
 */

/**
 * Un poids, écrit comme on le lit.
 *
 * **En base mille, et non mille vingt-quatre.** C'est ce que l'explorateur de
 * Windows affiche, et celui qui dépose ses archives compare avec ce qu'il voit
 * chez lui : un écart de sept pour cent sans explication ferait douter du
 * reste.
 *
 * **Et avec une virgule**, comme tout le reste de Mdall. « 6.4 ko » sur un écran
 * français se lit une fois de trop.
 */
export function poidsDit(octets = 0) {
  const combien = Number(octets);
  if (!Number.isFinite(combien) || combien < 0) return "";
  const virgule = (valeur, apres) => valeur.toFixed(apres).replace(".", ",");
  if (combien < 1000) return `${Math.round(combien)} o`;
  if (combien < 1e6) return `${virgule(combien / 1e3, combien < 1e4 ? 1 : 0)} ko`;
  if (combien < 1e9) return `${virgule(combien / 1e6, combien < 1e7 ? 1 : 0)} Mo`;
  // **Le gigaoctet manquait, et cela se voyait.** Les comptes de la console
  // affichaient « 41200 Mo » pour quarante et un gigaoctets : un nombre qu'on
  // ne lit pas, et qu'on relit deux fois pour compter les chiffres.
  if (combien < 1e12) return `${virgule(combien / 1e9, combien < 1e10 ? 1 : 0)} Go`;
  return `${virgule(combien / 1e12, combien < 1e13 ? 1 : 0)} To`;
}
