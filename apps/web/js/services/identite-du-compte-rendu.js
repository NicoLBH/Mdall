/**
 * Le numéro d'un compte rendu de chantier, et le jour où la réunion s'est
 * tenue.
 *
 * ## Pourquoi il fallait les lire
 *
 * « Pas de modification des comptes rendus n° 15 à 23 » est la ligne qui dit
 * qu'un point traîne. Elle ne peut pas s'écrire sans les numéros, et rien ne
 * les portait : le reconnaisseur rendait `declaredReference: null` et
 * `issuedAt: null`, ce qui était exact pour un numéro d'affaire de bureau de
 * contrôle — un compte rendu n'en a pas — mais faux pour ce que le document
 * dit de lui-même dès sa première ligne.
 *
 * Un compte rendu s'appelle **« COMPTE RENDU DE RÉUNION N° 14 »**, et il porte
 * la date de la réunion à quelques lignes de là. C'est son identité, elle est
 * écrite, et la taire obligeait à repérer les comptes rendus par leur nom de
 * fichier — qui n'est pas une donnée du projet.
 *
 * ## Ce qu'il refuse de deviner
 *
 * **Un numéro qui ne suit pas un mot qui l'annonce.** Un compte rendu est plein
 * de nombres : des lots, des articles, des cotes, des numéros de point. Prendre
 * le premier venu donnerait « compte rendu n° 3 » pour « Lot n° 3 ». On ne lit
 * donc un numéro que **collé à ce qui le nomme** — « compte rendu … n° », « CR
 * n° », « réunion n° », « PV n° ».
 *
 * **Une date isolée.** Un compte rendu en porte plusieurs : celle de la
 * réunion, celle de la diffusion, celle de la prochaine réunion, les échéances
 * de chaque point. Seule la première compte ici, et on ne la prend que si un
 * mot l'annonce.
 *
 * **Ce qui n'est pas écrit.** Pas de numéro : chaîne vide. Pas de date : chaîne
 * vide. Jamais la date du jour, jamais un numéro déduit d'un rang dans une
 * liste — ne pas savoir n'autorise pas à prétendre le contraire (règle 5), et
 * un numéro inventé ferait écrire « du n° 14 au n° 15 » sur deux comptes rendus
 * qui n'ont rien à voir.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Le numéro, et seulement collé à ce qui l'annonce.
 *
 * L'ordre compte : le plus explicite d'abord. « Compte rendu de réunion n° 14 »
 * se lit comme un compte rendu numéro 14, pas comme une réunion numéro 14 — et
 * quand les deux formes sont là, c'est la même réponse.
 */
const NUMEROS = [
  /\bcomptes?[\s-]*rendus?\b[^\n]{0,40}?n[°ºo]\s*[:.]?\s*(\d{1,4})/i,
  /\bproc[èe]s[\s-]*verbal\b[^\n]{0,40}?n[°ºo]\s*[:.]?\s*(\d{1,4})/i,
  /\br[ée]unions?\b[^\n]{0,40}?n[°ºo]\s*[:.]?\s*(\d{1,4})/i,
  /\bc\.?\s?r\.?\s*n[°ºo]\s*[:.]?\s*(\d{1,4})/i,
  /\bpv\s*n[°ºo]\s*[:.]?\s*(\d{1,4})/i
];

const MOIS = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12
};

const sansAccent = (valeur) =>
  texte(valeur).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Ce qui annonce la date de la réunion, et rien d'autre.
 *
 * « Prochaine réunion » est explicitement exclue : c'est une date **future**,
 * et la prendre daterait le compte rendu d'une réunion qui n'a pas eu lieu.
 */
const ANNONCE_LA_DATE = [
  /\br[ée]unions?\s+du\s+/i,
  /\bs[ée]ance\s+du\s+/i,
  /\bcomptes?[\s-]*rendus?\b[^\n]{0,60}?\bdu\s+/i,
  /^[\t ]*date\s*(?:de\s+(?:la\s+)?r[ée]union\s*)?[:.]\s*/im
];

const JJMMAAAA = /(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{4})/;
const JOUR_MOIS_AN = /(\d{1,2})\s*(?:er)?\s+([a-zéèêûôîç]+)\s+(\d{4})/i;

function isoDe(jour, mois, annee) {
  const j = Number(jour);
  const m = Number(mois);
  const a = Number(annee);
  if (!Number.isFinite(j) || !Number.isFinite(m) || !Number.isFinite(a)) return "";
  if (j < 1 || j > 31 || m < 1 || m > 12) return "";
  return `${a}-${String(m).padStart(2, "0")}-${String(j).padStart(2, "0")}`;
}

/**
 * Le numéro du compte rendu, ou `""`.
 *
 * @param {string} contenu le texte du document
 * @returns {string} le numéro tel qu'il est écrit, sans zéro ajouté ni retiré
 */
export function numeroDuCompteRendu(contenu = "") {
  const lu = texte(contenu);
  if (!lu) return "";

  for (const motif of NUMEROS) {
    const trouve = motif.exec(lu);
    if (trouve) return texte(trouve[1]);
  }

  return "";
}

/**
 * Le jour de la réunion, en ISO, ou `""`.
 *
 * On ne regarde que ce qui suit **immédiatement** une annonce : quelques
 * dizaines de caractères, pas la page entière. Au-delà, on retomberait sur la
 * première échéance venue, et une échéance n'est pas une date de réunion.
 */
export function tenueLeDuCompteRendu(contenu = "") {
  const lu = texte(contenu);
  if (!lu) return "";

  for (const annonce of ANNONCE_LA_DATE) {
    const trouve = annonce.exec(lu);
    if (!trouve) continue;

    const suite = lu.slice(trouve.index + trouve[0].length, trouve.index + trouve[0].length + 40);

    const chiffres = JJMMAAAA.exec(suite);
    if (chiffres) {
      const iso = isoDe(chiffres[1], chiffres[2], chiffres[3]);
      if (iso) return iso;
    }

    const enLettres = JOUR_MOIS_AN.exec(suite);
    if (enLettres) {
      const mois = MOIS[sansAccent(enLettres[2])];
      if (mois) {
        const iso = isoDe(enLettres[1], mois, enLettres[3]);
        if (iso) return iso;
      }
    }
  }

  return "";
}

/**
 * Ce qu'un compte rendu dit de lui-même.
 *
 * @returns {{numero: string, tenueLe: string}} deux chaînes vides quand il ne
 *   dit rien — ce qui est une réponse, pas un échec.
 */
export function identiteDuCompteRendu(contenu = "") {
  return {
    numero: numeroDuCompteRendu(contenu),
    tenueLe: tenueLeDuCompteRendu(contenu)
  };
}
