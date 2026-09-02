/**
 * Le schéma de la fondation, dessiné à partir de ce qui est saisi.
 *
 * ## Pourquoi il est ici et pas repris du classeur
 *
 * Le classeur réserve une case intitulée « Schéma » (Q9:W15, fusionnée) et la
 * laisse **vide** : l'archive ne contient ni image, ni graphique, ni forme.
 * Il n'y avait donc rien à reprendre — seulement une place réservée. Le dessin
 * est reconstruit à partir des cotes, qui, elles, sont toutes là.
 *
 * ## La géométrie, telle que le calcul la lit
 *
 * Le niveau 0 est le niveau extérieur fini. Les cotes descendent en négatif.
 *
 *     0            ─── niveau extérieur fini
 *                  terres
 *     L9 + L12     ─── tête du fût : c'est là que les charges s'appliquent
 *                  fût (I13 × L13), terres autour
 *     L9           ─── arase supérieure : dessus de la semelle
 *                  semelle (I11 × L11), hauteur L10
 *     L9 − L10     ─── assise
 *
 * Ce n'est pas une lecture libre : `BA150 = L10 + L12` sert de bras de levier
 * aux efforts horizontaux, donc ils s'appliquent à `L9 + L12` ; la butée
 * s'exerce entre `L9` et `L9 − L10` ; et le volume de terres se compose d'une
 * tranche pleine au-dessus du fût puis d'une tranche évidée autour de lui.
 *
 * ## Ce que le dessin dit de plus que les cases
 *
 * Une saisie peut être numériquement acceptable et géométriquement absurde :
 * un fût plus large que sa semelle, une tête de fût qui sort du terrain, une
 * butée mobilisée en dehors de la hauteur de semelle. Le calcul, lui, ne s'en
 * plaint pas — il pondère et il combine. Le schéma les nomme.
 */

const CAS_DE_CHARGE_DESSINES = ["G", "Q", "Sn", "W1", "W2", "W3", "W4", "Sx", "Sy", "Sz", "Fa"];

function nombre(valeur, defaut = 0) {
  const n = typeof valeur === "number" ? valeur : Number.parseFloat(String(valeur ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : defaut;
}

/**
 * Le modèle du schéma, en mètres : des formes, pas encore des pixels.
 *
 * Séparé du tracé pour être vérifiable — on peut affirmer que la semelle fait
 * bien 1,20 m de large sans rien savoir du SVG qui l'affichera.
 */
export function modeleSchema(entrees = {}) {
  const L9 = nombre(entrees.araseSuperieure);
  const L10 = nombre(entrees.hauteurLz);
  const I11 = nombre(entrees.sectionLx);
  const L11 = nombre(entrees.sectionLy);
  const L12 = nombre(entrees.hauteurFut);
  const I13 = nombre(entrees.futA);
  const L13 = nombre(entrees.futB);
  const I14 = nombre(entrees.excentrementChargeX);
  const L14 = nombre(entrees.excentrementChargeY);
  const I15 = nombre(entrees.excentrementFutX);
  const L15 = nombre(entrees.excentrementFutY);
  const zi = nombre(entrees.buteeZi);
  const zf = nombre(entrees.buteeZf);
  const buteeMobilisee = nombre(entrees.buteeMobilisee);

  const niveaux = {
    terrain: 0,
    teteFut: L9 + L12,
    arase: L9,
    assise: L9 - L10
  };

  // Le fût n'existe que s'il a une section et une hauteur : sans quoi la charge
  // descend directement sur la semelle, et le classeur le traite ainsi
  // (son poids propre et ses aciers sont annulés par `I13*L13*L12 = 0`).
  const futExiste = I13 > 0 && L13 > 0 && L12 > 0;

  const semelle = { x: -I11 / 2, y: L11 / 2, largeur: I11, profondeur: L11, hauteur: L10,
    haut: niveaux.arase, bas: niveaux.assise };
  const fut = futExiste
    ? { cx: I15, cy: L15, largeur: I13, profondeur: L13, hauteur: L12,
        haut: niveaux.teteFut, bas: niveaux.arase }
    : null;

  // Le point d'application des charges : le fût est décalé de la semelle, la
  // charge l'est encore du fût. C'est la somme qui crée le moment.
  const pointCharge = { x: I15 + I14, y: L15 + L14, z: futExiste ? niveaux.teteFut : niveaux.arase };

  // La butée est ramenée dans la hauteur de semelle, exactement comme le
  // classeur le fait en BJ79 et BJ80 : au-delà, elle ne s'appuie sur rien.
  const butee = buteeMobilisee > 0
    ? { haut: borner(zi, L9, L10), bas: borner(zf, L9, L10) }
    : null;
  if (butee) butee.hauteur = butee.haut - butee.bas;

  const alertes = [];
  if (I11 <= 0 || L11 <= 0) alertes.push("La semelle n'a pas de section : rien ne peut être dessiné.");
  if (L10 <= 0) alertes.push("La semelle n'a pas de hauteur.");
  if (L9 > 0) alertes.push("L'arase supérieure est au-dessus du terrain : la semelle sort du sol.");
  if (futExiste && niveaux.teteFut > 0) alertes.push("La tête du fût dépasse le niveau extérieur fini.");
  if (futExiste && (I13 > I11 || L13 > L11)) alertes.push("Le fût est plus large que sa semelle.");
  if (futExiste && (Math.abs(I15) + I13 / 2 > I11 / 2 || Math.abs(L15) + L13 / 2 > L11 / 2)) {
    alertes.push("Le fût déborde de la semelle.");
  }
  if (Math.abs(pointCharge.x) > I11 / 2 || Math.abs(pointCharge.y) > L11 / 2) {
    alertes.push("Le point d'application des charges tombe hors de la semelle.");
  }

  return { niveaux, semelle, fut, futExiste, pointCharge, butee, alertes,
    cotes: { L9, L10, I11, L11, L12, I13, L13, I14, L14, I15, L15 } };
}

/** Une cote de butée, ramenée dans la hauteur de semelle comme le fait BJ79/BJ80. */
function borner(z, L9, L10) {
  const profondeur = Math.abs(z);
  if (profondeur < Math.abs(L9)) return -Math.abs(L9);
  if (profondeur > Math.abs(L9) + L10) return -(Math.abs(L9) + L10);
  return -profondeur;
}

/**
 * La zone comprimée sous la semelle, telle que le calcul l'a trouvée.
 *
 * Meyerhoff ramène la semelle à un rectangle réduit, centré sur la résultante :
 * c'est la seule forme que le résultat permette de dessiner honnêtement. En
 * répartition constante, la zone comprimée est un polygone que le calcul ne
 * rend pas — on affiche alors le pourcentage sans prétendre le tracer.
 */
export function zoneComprimee(resultat, entrees = {}) {
  const excentrements = resultat?.contrainte?.excentrements;
  if (!excentrements) return null;
  const I11 = nombre(entrees.sectionLx);
  const L11 = nombre(entrees.sectionLy);
  const ex = Math.abs(nombre(excentrements.ex));
  const ey = Math.abs(nombre(excentrements.ey));
  const signeX = Math.sign(nombre(excentrements.ex)) || 1;
  const signeY = Math.sign(nombre(excentrements.ey)) || 1;
  if (!(I11 > 0 && L11 > 0)) return null;
  if (ex >= I11 / 2 || ey >= L11 / 2) return { rectangle: null, pourcentage: 0 };

  const largeur = I11 - 2 * ex;
  const profondeur = L11 - 2 * ey;
  return {
    rectangle: {
      cx: signeX * ex,
      cy: signeY * ey,
      largeur, profondeur
    },
    pourcentage: largeur * profondeur / I11 / L11 * 100
  };
}

export { CAS_DE_CHARGE_DESSINES };

/* ------------------------------------------------------------------ *
 * Le tracé
 *
 * Deux vues, comme sur une planche : une coupe et un plan. Elles sont à
 * l'échelle, la même pour les deux, et cette échelle est écrite — un schéma
 * qui déforme pour remplir son cadre ment sur ce qu'il montre.
 * ------------------------------------------------------------------ */

const MARGE = 34;
// La marge droite est plus large : c'est là que se lisent les cotes verticales
// (« Lz = 1,00 m »), et une cote coupée en deux ne vaut pas mieux qu'absente.
const MARGE_DROITE = 74;
const LARGEUR_VUE = 340;
const HAUTEUR_VUE = 240;
const LARGEUR_UTILE = LARGEUR_VUE - MARGE - MARGE_DROITE;
const CENTRE = MARGE + LARGEUR_UTILE / 2;

function echapper(valeur) {
  return String(valeur ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function cote(valeur, decimales = 2) {
  return Number(valeur).toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

/**
 * L'étendue à tenir dans le cadre, fût et point de charge compris.
 *
 * Ne mesurer que la semelle serait tentant — c'est la pièce principale — mais
 * alors un fût plus large qu'elle sortirait du cadre, c'est-à-dire que le seul
 * cas où le dessin sert vraiment serait celui où il ne montre rien.
 */
function etendue(m) {
  let demiLargeur = m.semelle.largeur / 2;
  let demiProfondeur = m.semelle.profondeur / 2;
  if (m.fut) {
    demiLargeur = Math.max(demiLargeur, Math.abs(m.fut.cx) + m.fut.largeur / 2);
    demiProfondeur = Math.max(demiProfondeur, Math.abs(m.fut.cy) + m.fut.profondeur / 2);
  }
  demiLargeur = Math.max(demiLargeur, Math.abs(m.pointCharge.x));
  demiProfondeur = Math.max(demiProfondeur, Math.abs(m.pointCharge.y));
  return {
    largeur: Math.max(2 * demiLargeur, 0.01),
    profondeur: Math.max(2 * demiProfondeur, 0.01),
    hauteur: Math.max(0.01, Math.max(m.niveaux.terrain, m.niveaux.teteFut) - m.niveaux.assise)
  };
}

/**
 * L'échelle commune aux deux vues.
 *
 * La même pour la coupe et le plan : sans quoi comparer une largeur de semelle
 * à sa profondeur deviendrait impossible à l'œil.
 */
function echelleCommune(m) {
  const e = etendue(m);
  return Math.min(
    LARGEUR_UTILE / Math.max(e.largeur, e.profondeur),
    (HAUTEUR_VUE - 2 * MARGE) / Math.max(e.hauteur, e.profondeur)
  );
}

/** Le schéma complet, en SVG. Rend une chaîne vide si rien n'est dessinable. */
export function dessinerSchema(entrees = {}, resultat = null) {
  const m = modeleSchema(entrees);
  if (m.semelle.largeur <= 0 || m.semelle.profondeur <= 0 || m.semelle.hauteur <= 0) {
    return `<p class="fondations-schema__vide">Le schéma demande une semelle : une largeur, une longueur et une hauteur.</p>`;
  }

  const k = echelleCommune(m);
  const zone = zoneComprimee(resultat, entrees);

  return `
    <div class="fondations-schema">
      <div class="fondations-schema__vues">
        ${coupe(m, k)}
        ${plan(m, k, zone)}
      </div>
      <p class="fondations-schema__echelle">
        Vues à l'échelle, 1 m ≈ ${cote(k, 0)} px.
        ${m.futExiste ? "Les charges s'appliquent en tête de fût." : "Les charges s'appliquent sur l'arase de la semelle."}
      </p>
      ${m.alertes.length ? `
        <ul class="fondations-schema__alertes">
          ${m.alertes.map((a) => `<li>${echapper(a)}</li>`).join("")}
        </ul>` : ""}
    </div>
  `;
}

/** La coupe suivant l'axe X : ce qui est enterré, et jusqu'où. */
function coupe(m, k) {
  const cx = CENTRE;
  // La vue se cale sur le point le plus haut — le terrain d'ordinaire, la tête
  // du fût quand une saisie la fait sortir du sol.
  const plafond = Math.max(m.niveaux.terrain, m.niveaux.teteFut);
  const z = (niveau) => MARGE + (plafond - niveau) * k;
  const x = (abscisse) => cx + abscisse * k;

  const semelle = {
    x: x(-m.semelle.largeur / 2), y: z(m.niveaux.arase),
    l: m.semelle.largeur * k, h: m.semelle.hauteur * k
  };
  const fut = m.fut ? {
    x: x(m.fut.cx - m.fut.largeur / 2), y: z(m.fut.haut),
    l: m.fut.largeur * k, h: m.fut.hauteur * k
  } : null;

  const basVue = z(m.niveaux.assise) + 18;
  const xCharge = x(m.pointCharge.x);
  const zCharge = z(m.pointCharge.z);

  return `
    <figure class="fondations-schema__vue">
      <figcaption>Coupe suivant l'axe X</figcaption>
      <svg viewBox="0 0 ${LARGEUR_VUE} ${Math.max(HAUTEUR_VUE, basVue + 26)}" role="img"
           aria-label="Coupe de la fondation suivant l'axe X">
        <defs>
          <pattern id="fondations-terres" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="7" class="fondations-schema__hachure"></line>
          </pattern>
          <marker id="fondations-fleche" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" class="fondations-schema__pointe"></path>
          </marker>
        </defs>

        <rect x="6" y="${z(0)}" width="${LARGEUR_VUE - 12}" height="${Math.max(0, basVue - z(0))}"
              fill="url(#fondations-terres)" class="fondations-schema__terres"></rect>
        <line x1="6" y1="${z(0)}" x2="${LARGEUR_VUE - 6}" y2="${z(0)}" class="fondations-schema__terrain"></line>
        <text x="10" y="${z(0) - 5}" class="fondations-schema__texte">Niveau extérieur fini</text>

        ${m.butee ? `
          <rect x="${x(-m.semelle.largeur / 2) - 12}" y="${z(m.butee.haut)}" width="12"
                height="${Math.max(0, (m.butee.haut - m.butee.bas) * k)}" class="fondations-schema__butee"></rect>
          <text x="${x(-m.semelle.largeur / 2) - 12}" y="${z(m.butee.haut) - 4}"
                class="fondations-schema__texte">butée</text>` : ""}

        <rect x="${semelle.x}" y="${semelle.y}" width="${semelle.l}" height="${semelle.h}"
              class="fondations-schema__beton"></rect>
        ${fut ? `<rect x="${fut.x}" y="${fut.y}" width="${fut.l}" height="${fut.h}" class="fondations-schema__beton"></rect>` : ""}

        <line x1="${xCharge}" y1="${zCharge - 30}" x2="${xCharge}" y2="${zCharge - 3}"
              class="fondations-schema__effort" marker-end="url(#fondations-fleche)"></line>
        <text x="${xCharge + 5}" y="${zCharge - 22}" class="fondations-schema__texte">V, H, M</text>

        <line x1="${semelle.x}" y1="${basVue}" x2="${semelle.x + semelle.l}" y2="${basVue}"
              class="fondations-schema__cote"></line>
        <text x="${cx}" y="${basVue + 13}" text-anchor="middle" class="fondations-schema__texte">
          Lx = ${cote(m.cotes.I11)} m
        </text>

        <line x1="${semelle.x + semelle.l + 10}" y1="${semelle.y}" x2="${semelle.x + semelle.l + 10}"
              y2="${semelle.y + semelle.h}" class="fondations-schema__cote"></line>
        <text x="${semelle.x + semelle.l + 14}" y="${semelle.y + semelle.h / 2}" class="fondations-schema__texte">
          Lz = ${cote(m.cotes.L10)} m
        </text>

        <text x="${LARGEUR_VUE - 8}" y="${z(m.niveaux.arase) - 4}" text-anchor="end" class="fondations-schema__texte">
          arase ${cote(m.cotes.L9)} m
        </text>
        ${m.fut ? `<text x="${LARGEUR_VUE - 8}" y="${z(m.fut.haut) - 4}" text-anchor="end" class="fondations-schema__texte">
          tête de fût ${cote(m.niveaux.teteFut)} m</text>` : ""}
      </svg>
    </figure>
  `;
}

/** La vue en plan : la semelle vue de dessus, et ce qui porte réellement. */
function plan(m, k, zone) {
  const cx = CENTRE;
  const cy = MARGE + m.semelle.profondeur * k / 2;
  const x = (abscisse) => cx + abscisse * k;
  const y = (ordonnee) => cy - ordonnee * k;

  const semelle = {
    x: x(-m.semelle.largeur / 2), y: y(m.semelle.profondeur / 2),
    l: m.semelle.largeur * k, h: m.semelle.profondeur * k
  };
  const bas = semelle.y + semelle.h;

  return `
    <figure class="fondations-schema__vue">
      <figcaption>Vue en plan${zone ? " — surface d'appui" : ""}</figcaption>
      <svg viewBox="0 0 ${LARGEUR_VUE} ${Math.max(HAUTEUR_VUE, bas + (zone ? 46 : 32))}" role="img"
           aria-label="Vue en plan de la fondation">
        <rect x="${semelle.x}" y="${semelle.y}" width="${semelle.l}" height="${semelle.h}"
              class="fondations-schema__beton"></rect>

        ${zone?.rectangle ? `
          <rect x="${x(zone.rectangle.cx - zone.rectangle.largeur / 2)}"
                y="${y(zone.rectangle.cy + zone.rectangle.profondeur / 2)}"
                width="${zone.rectangle.largeur * k}" height="${zone.rectangle.profondeur * k}"
                class="fondations-schema__comprime"></rect>` : ""}

        ${m.fut ? `
          <rect x="${x(m.fut.cx - m.fut.largeur / 2)}" y="${y(m.fut.cy + m.fut.profondeur / 2)}"
                width="${m.fut.largeur * k}" height="${m.fut.profondeur * k}"
                class="fondations-schema__fut-plan"></rect>` : ""}

        <line x1="${cx}" y1="${semelle.y}" x2="${cx}" y2="${bas}" class="fondations-schema__axe"></line>
        <line x1="${semelle.x}" y1="${cy}" x2="${semelle.x + semelle.l}" y2="${cy}" class="fondations-schema__axe"></line>

        <circle cx="${x(m.pointCharge.x)}" cy="${y(m.pointCharge.y)}" r="3.5" class="fondations-schema__point"></circle>

        <line x1="${semelle.x}" y1="${bas + 12}" x2="${semelle.x + semelle.l}" y2="${bas + 12}"
              class="fondations-schema__cote"></line>
        <text x="${cx}" y="${bas + 25}" text-anchor="middle" class="fondations-schema__texte">
          Lx = ${cote(m.cotes.I11)} m
        </text>
        <line x1="${semelle.x + semelle.l + 10}" y1="${semelle.y}" x2="${semelle.x + semelle.l + 10}" y2="${bas}"
              class="fondations-schema__cote"></line>
        <text x="${semelle.x + semelle.l + 14}" y="${cy}" class="fondations-schema__texte">
          Ly = ${cote(m.cotes.L11)} m
        </text>

        ${zone ? `<text x="${semelle.x}" y="${bas + 38}" class="fondations-schema__texte">
          ${zone.rectangle ? `surface d'appui ${cote(zone.pourcentage, 1)} %` : "semelle entièrement décomprimée"}
        </text>` : ""}
      </svg>
    </figure>
  `;
}
