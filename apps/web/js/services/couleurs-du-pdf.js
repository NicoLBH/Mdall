/**
 * La couleur du texte d'un PDF, et à quelles conditions on peut s'y fier.
 *
 * ## Pourquoi la couleur compte dans un compte rendu de chantier
 *
 * « à faire » en bleu, « présence obligatoire au prochain rendez-vous » en
 * rouge : la couleur ne décore pas, elle **hiérarchise**. Elle dit ce qui est
 * urgent, ce qui est une consigne, ce qui n'est qu'un rappel. Un document
 * transcrit en noir uniforme a perdu cette couche-là, et rien ne signale
 * qu'elle a existé.
 *
 * ## Pourquoi il faut la recoller à la main
 *
 * `getTextContent()` rend le texte et sa géométrie, **pas sa couleur**. La
 * couleur ne vit que dans la liste d'opérations, où elle se pose (`rg`, `g`,
 * `k`) et vaut jusqu'à la suivante — ou jusqu'à ce qu'un `Q` restaure ce
 * qu'un `q` avait sauvegardé.
 *
 * Il faut donc lire deux fois le même contenu et faire correspondre les deux
 * lectures. Or elles ne découpent pas aux mêmes endroits : pdf.js regroupe et
 * scinde les fragments de texte selon ses propres règles.
 *
 * ## D'où la règle de prudence, qui est le cœur de ce fichier
 *
 * On ne compare pas fragment à fragment — cela échouerait presque toujours. On
 * compare les **deux flux de caractères**, espaces ôtés. S'ils sont identiques,
 * la correspondance est certaine et chaque fragment reçoit sa couleur. S'ils
 * diffèrent d'un seul caractère, **on rend `null` pour la page entière**.
 *
 * Ce refus est le point important. Une couleur mal recollée est bien pire que
 * pas de couleur du tout : un « fait » colorié en rouge inverse le sens de la
 * ligne, et rien à l'écran ne permettrait de s'en apercevoir (règle 5).
 */

const texte = (valeur) => String(valeur ?? "");

/** Le noir est la couleur par défaut : la dire n'apprendrait rien. */
const NOIR = /^#?0{6}$/;

const sansEspaces = (valeur) => texte(valeur).replace(/\s+/g, "");

/** Une couleur normalisée en `#rrggbb`, ou "" quand ce n'est pas une couleur. */
export function enHexadecimal(valeur) {
  if (typeof valeur === "string") {
    const propre = valeur.trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(propre)) return propre;
    if (/^[0-9a-f]{6}$/.test(propre)) return `#${propre}`;
    return "";
  }

  // Un gris rendu comme nombre, ou un triplet : pdf.js normalise la plupart du
  // temps, mais pas toutes les versions ni tous les opérateurs.
  const octet = (nombre) => {
    const valeur = Number(nombre);
    if (!Number.isFinite(valeur)) return null;
    const sur255 = valeur <= 1 ? Math.round(valeur * 255) : Math.round(valeur);
    return Math.max(0, Math.min(255, sur255));
  };

  if (Array.isArray(valeur) && valeur.length >= 3) {
    const [r, v, b] = valeur.map(octet);
    if ([r, v, b].some((composante) => composante === null)) return "";
    return `#${[r, v, b].map((composante) => composante.toString(16).padStart(2, "0")).join("")}`;
  }

  if (typeof valeur === "number") {
    const gris = octet(valeur);
    if (gris === null) return "";
    const part = gris.toString(16).padStart(2, "0");
    return `#${part}${part}${part}`;
  }

  return "";
}

/**
 * Le nom d'une couleur, tel qu'on l'écrirait.
 *
 * **Des noms, et non des codes.** `#c00000` ne dit rien à qui lit la
 * transcription ; « rouge » dit ce que l'auteur du compte rendu voulait dire.
 * On ne nomme que des familles — la nuance exacte n'a jamais de sens ici.
 *
 * Le noir et les gris très sombres rendent "" : c'est la couleur du texte
 * ordinaire, et l'annoncer noierait les trois mentions qui comptent.
 */
export function nomDeLaCouleur(valeur) {
  const hex = enHexadecimal(valeur);
  if (!hex || NOIR.test(hex)) return "";

  const r = parseInt(hex.slice(1, 3), 16);
  const v = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const max = Math.max(r, v, b);
  const min = Math.min(r, v, b);

  // Sans saturation, c'est un gris. Sombre : c'est du texte ordinaire.
  if (max - min < 40) {
    if (max < 90) return "";
    return max > 200 ? "gris clair" : "gris";
  }

  if (r === max && v > b && v - b > 40 && v > 110) return r - v > 60 ? "orange" : "jaune";
  if (r === max) return v > 110 && b > 110 ? "rose" : "rouge";
  if (v === max) return "vert";
  if (b === max) return r > 110 && v < 110 ? "violet" : "bleu";
  return "";
}

/**
 * Recolle les couleurs de la liste d'opérations aux fragments de texte.
 *
 * @param {{text: string, couleur: string}[]} peints ce que la liste
 *   d'opérations a montré, dans l'ordre
 * @param {{text: string}[]} fragments ce que `getTextContent()` a rendu
 * @returns {string[]|null} une couleur par fragment — ou `null` quand les deux
 *   lectures ne portent pas exactement le même texte. Voir l'en-tête : mieux
 *   vaut aucune couleur qu'une couleur fausse.
 */
export function accorderLesCouleurs(peints = [], fragments = []) {
  const gauche = (Array.isArray(peints) ? peints : []);
  const droite = (Array.isArray(fragments) ? fragments : []);

  const flux = sansEspaces(gauche.map((peint) => texte(peint?.text)).join(""));
  const lu = sansEspaces(droite.map((fragment) => texte(fragment?.text)).join(""));

  if (!flux || flux !== lu) return null;

  // Un caractère, une couleur. C'est ce qui permet de rendre sa couleur à un
  // fragment que pdf.js a scindé au milieu d'un mot.
  const couleurs = [];
  for (const peint of gauche) {
    const couleur = enHexadecimal(peint?.couleur);
    for (const caractere of texte(peint?.text)) {
      if (!/\s/.test(caractere)) couleurs.push(couleur);
    }
  }

  let curseur = 0;
  return droite.map((fragment) => {
    const combien = sansEspaces(fragment?.text).length;
    const tranche = couleurs.slice(curseur, curseur + combien);
    curseur += combien;
    return dominante(tranche);
  });
}

/** La couleur la plus présente d'une tranche. Une seule s'affiche. */
function dominante(couleurs = []) {
  const compte = new Map();
  for (const couleur of couleurs) {
    if (!couleur) continue;
    compte.set(couleur, (compte.get(couleur) ?? 0) + 1);
  }

  let gagnante = "";
  let meilleur = 0;
  for (const [couleur, combien] of compte) {
    if (combien > meilleur) {
      gagnante = couleur;
      meilleur = combien;
    }
  }
  return gagnante;
}
