/**
 * Ce qui décide de la forme d'un dessin, et rien d'autre.
 *
 * ## Pourquoi ça vit seul
 *
 * Deux objets du langage se dessinent : l'**abaque** d'une courbe, et le
 * **tableau** qu'une boucle déroule. Ce sont deux choses différentes à l'écrit
 * — l'un est une loi, l'autre un travail —, et exactement la même à l'écran :
 * des séries de points à poser sur une grille.
 *
 * Écrites deux fois, les deux géométries auraient divergé au premier réglage,
 * et l'on aurait deux cadres à recalibrer l'un contre l'autre à chaque retouche
 * (règle 10). Elles vivent donc ici, une fois, et les deux écrans s'en servent.
 *
 * ## Ce que ce fichier ne fait pas
 *
 * **Il ne dessine pas.** Aucun SVG, aucune classe, aucune couleur : il rend des
 * coordonnées entre 0 et 1, et c'est la vue qui les pose sur son cadre. C'est ce
 * qui rend la forme éprouvable sans navigateur.
 *
 * **Il ne choisit pas les bornes.** Elles sortent des points qu'on lui donne, et
 * de rien d'autre : un axe qui partirait de zéro « pour bien faire » écraserait
 * une courbe qui varie de 0,78 à 0,80, et c'est justement cette variation-là
 * qu'on regarde.
 */

const nombres = (valeurs) => valeurs.filter((un) => Number.isFinite(un));

/**
 * Les points de plusieurs séries, ramenés entre 0 et 1 sur une grille commune.
 *
 * **Une seule grille pour toutes les séries**, et c'est le point : deux courbes
 * dessinées chacune à son échelle se croisent là où elles ne se croisent pas, et
 * l'on lit un rapport qui n'existe pas. Elles partagent donc leurs bornes, ce
 * qui est aussi la raison pour laquelle une colonne d'une autre grandeur ne se
 * dessine pas avec les autres.
 *
 * Une série **plate** — toutes les ordonnées égales — se dessine au milieu
 * plutôt que sur un bord : divisée par une hauteur nulle, elle sortirait du
 * cadre ou n'apparaîtrait pas.
 *
 * @param {{nom: string, points: {x: number, y: number, dit: string, vaut: string}[]}[]} series
 * @param {object} [comment]
 * @param {{x: number, y: number}} [comment.marque] un point à poser sur la grille
 * @param {boolean} [comment.depuisZero] l'ordonnée part de zéro — voir plus bas
 * @param {number[]} [comment.bornesX] une abscisse imposée, pour empiler
 *   plusieurs cadres sur la même — voir `traceDesGroupes`
 * @returns {{series: object[], marque: {x: number, y: number}|null,
 *   bornes: {x: number[], y: number[]}}}
 */
export function traceDesSeries(series = [], { marque = null, depuisZero = false, bornesX = null } = {}) {
  const toutes = (Array.isArray(series) ? series : [])
    .map((une) => ({
      nom: String(une?.nom ?? ""),
      points: (Array.isArray(une?.points) ? une.points : [])
        .filter((un) => Number.isFinite(un?.x) && Number.isFinite(un?.y))
    }))
    .filter((une) => une.points.length);

  const vide = { series: [], marque: null, bornes: { x: [0, 0], y: [0, 0] } };
  if (!toutes.length) return vide;

  const xs = nombres([...toutes.flatMap((une) => une.points.map((un) => un.x)), marque?.x]);
  const ys = nombres([...toutes.flatMap((une) => une.points.map((un) => un.y)), marque?.y]);
  if (!xs.length || !ys.length) return vide;

  /**
   * **Une barre part de zéro, une ligne part de ses valeurs.**
   *
   * C'est la faute classique du graphique, et la seule que la forme elle-même
   * impose d'éviter : une barre dit une **quantité**, et la tronquer à la base
   * fait lire un rapport de trois pour un là où il est de un pour un virgule
   * un. Douze kilonewtons sur une échelle qui commence à douze se dessinent
   * d'une hauteur nulle, et la première barre disparaît.
   *
   * Une ligne, elle, dit une **variation** : lui imposer de partir de zéro
   * écraserait une courbe qui va de 0,78 à 0,80, et c'est justement cette
   * variation-là qu'on regarde.
   *
   * Une série qui descend sous zéro garde son minimum : une barre négative part
   * de zéro vers le bas, et couper à zéro la ferait disparaître.
   */
  const bas = Math.min(...ys);
  const bornes = {
    /**
     * **L'abscisse peut être imposée**, et c'est ce qui autorise à empiler
     * plusieurs cadres. Chacun garde son échelle d'ordonnée — c'est justement
     * pour cela qu'ils sont séparés —, mais un point d'un cadre et le point de
     * même abscisse du cadre d'en dessous doivent tomber l'un sous l'autre. Des
     * abscisses calculées séparément ne le feraient pas dès qu'une colonne
     * manque une ligne.
     */
    x: Array.isArray(bornesX) && bornesX.length === 2 && nombres(bornesX).length === 2
      ? [bornesX[0], bornesX[1]]
      : [Math.min(...xs), Math.max(...xs)],
    y: [depuisZero ? Math.min(0, bas) : bas, Math.max(...ys)]
  };

  const sur = (valeur, [bas, haut]) => (haut === bas ? 0.5 : (valeur - bas) / (haut - bas));

  return {
    series: toutes.map((une) => ({
      nom: une.nom,
      points: une.points.map((un) => ({
        x: sur(un.x, bornes.x),
        y: sur(un.y, bornes.y),
        dit: String(un.dit ?? ""),
        vaut: String(un.vaut ?? "")
      }))
    })),
    marque: Number.isFinite(marque?.x) && Number.isFinite(marque?.y)
      ? { x: sur(marque.x, bornes.x), y: sur(marque.y, bornes.y) }
      : null,
    bornes
  };
}

/**
 * Plusieurs cadres empilés, sur **une seule abscisse**.
 *
 * ## Pourquoi empiler plutôt qu'un second axe
 *
 * Une colonne en mètres cubes et une en tonnes ne tiennent pas sur une grille :
 * elles se croiseraient là où elles ne se croisent pas. La réponse habituelle
 * est un **second axe à droite** — et c'est la façon la plus commune de faire
 * lire une corrélation qui n'existe pas, parce que deux échelles choisies
 * séparément placent le croisement exactement où l'on veut. Il n'y a rien à
 * vérifier dans un tel dessin : il dit ce que son auteur a décidé.
 *
 * Empilés, les deux cadres ne se croisent jamais. Ce qu'on compare est ce qui
 * se compare vraiment : **la forme**, à la même abscisse, ce qui monte pendant
 * que l'autre descend. Et chaque cadre garde une échelle qu'on peut lire seule.
 *
 * L'abscisse est commune, et calculée sur **tous** les groupes : une colonne
 * qui manque une ligne ne doit pas décaler son cadre d'un cran par rapport à
 * celui d'en dessous.
 *
 * @param {{unite: string, dit: string, series: object[]}[]} groupes
 * @returns {{groupes: object[], bornes: {x: number[]}}}
 */
export function traceDesGroupes(groupes = [], { depuisZero = false } = {}) {
  const tous = (Array.isArray(groupes) ? groupes : [])
    .filter((un) => Array.isArray(un?.series) && un.series.length);

  const xs = nombres(tous.flatMap((un) => un.series
    .flatMap((une) => (Array.isArray(une?.points) ? une.points : []).map((point) => point?.x))));

  if (!xs.length) return { groupes: [], bornes: { x: [0, 0] } };
  const bornesX = [Math.min(...xs), Math.max(...xs)];

  const dessines = tous
    .map((un) => {
      const trace = traceDesSeries(un.series, { depuisZero, bornesX });
      return { unite: String(un?.unite ?? ""), dit: String(un?.dit ?? ""), ...trace };
    })
    .filter((un) => un.series.length);

  return { groupes: dessines, bornes: { x: bornesX } };
}
