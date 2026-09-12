/**
 * Ce que l'IA a consommé, et ce que cela représente en euros.
 *
 * ## Ce qui vit ici
 *
 * De l'arithmétique, et rien d'autre : le tarif de chaque modèle, la conversion
 * en euros, le total par jour, la répartition par projet, la part de chacun.
 * Aucun réseau, aucun DOM — donc tout se vérifie.
 *
 * ## Le tarif vit à un seul endroit
 *
 * Recopié dans l'écran et dans le calcul, il finirait par diverger de lui-même
 * (règle 4), et l'on ne saurait plus lequel des deux la facture suit. Il est
 * donc ici, une fois, avec ce qu'il faut pour l'expliquer : le prix public, la
 * devise d'origine, et la date à laquelle il a été relevé.
 *
 * ## Ce qu'on affiche est une **estimation**, et cela se dit
 *
 * Elle part de jetons réels et d'un tarif public. Ce n'est pas la facture, qui
 * peut porter des remises, des paliers, des taxes ou un taux de change du jour.
 * Présenter une estimation comme un montant dû serait exactement la précision
 * fausse que Mdall refuse partout ailleurs.
 */

const texte = (valeur) => String(valeur ?? "").trim();
const nombre = (valeur) => (Number.isFinite(Number(valeur)) ? Number(valeur) : 0);

/**
 * Le change retenu pour convertir les tarifs, qui sont publiés en dollars.
 *
 * **Un taux figé, et daté.** Un taux du jour ferait changer le coût d'hier
 * chaque matin : on regarderait deux fois le même mois et l'on verrait deux
 * montants, sans qu'aucun appel n'ait eu lieu. Un constat ne devient jamais
 * faux (règle 6) — le coût d'un appel est celui qu'il avait quand il a eu lieu.
 */
export const CHANGE = { depuis: "USD", vers: "EUR", taux: 0.92, releveLe: "2026-09-01" };

/**
 * Le tarif public de chaque modèle, **par million de jetons**, en dollars.
 *
 * C'est l'unité dans laquelle les fournisseurs publient : la convertir ici en
 * prix au jeton ferait un nombre à sept zéros que personne ne peut relire ni
 * comparer à la page de tarifs.
 */
export const TARIFS = {
  "gpt-4.1-mini": { entree: 0.40, sortie: 1.60, releveLe: "2026-09-01" },
  "gpt-4.1": { entree: 2.00, sortie: 8.00, releveLe: "2026-09-01" },
  "gpt-4o-mini": { entree: 0.15, sortie: 0.60, releveLe: "2026-09-01" },
  "gpt-4o": { entree: 2.50, sortie: 10.00, releveLe: "2026-09-01" }
};

/**
 * Le tarif d'un modèle, ou `null`.
 *
 * **`null` et non un tarif par défaut.** Un modèle dont on ne connaît pas le
 * prix doit se voir comme tel : lui en prêter un ferait un montant inventé, au
 * milieu de montants réels, sans rien qui les distingue (règle 5).
 */
export function tarifDuModele(model) {
  return TARIFS[texte(model)] ?? null;
}

/** Le coût d'un appel, en euros — ou `null` quand le modèle n'a pas de tarif. */
export function coutDeLAppel({ model = "", inputTokens = 0, outputTokens = 0 } = {}) {
  const tarif = tarifDuModele(model);
  if (!tarif) return null;

  const dollars = (nombre(inputTokens) * tarif.entree + nombre(outputTokens) * tarif.sortie) / 1_000_000;
  return dollars * CHANGE.taux;
}

/* ── Ce qu'une ligne de la base devient ──────────────────────────────────── */

export function appelPourLEcran(ligne = {}) {
  return {
    id: texte(ligne.id),
    projetId: texte(ligne.project_id),
    ownerId: texte(ligne.owner_id),
    model: texte(ligne.model),
    nature: texte(ligne.usage_kind) || "inconnu",
    // Les jetons manquants restent `null` : ils ne valent pas zéro, on ne les
    // connaît pas, et un total doit pouvoir le dire.
    entree: ligne.input_tokens === null || ligne.input_tokens === undefined ? null : nombre(ligne.input_tokens),
    sortie: ligne.output_tokens === null || ligne.output_tokens === undefined ? null : nombre(ligne.output_tokens),
    le: texte(ligne.created_at)
  };
}

/* ── Les totaux ──────────────────────────────────────────────────────────── */

/**
 * Le total d'une liste d'appels.
 *
 * `sansDecompte` compte les appels dont le fournisseur n'a rien annoncé : un
 * total qui les tairait serait faux d'un montant qu'on ne peut pas nommer.
 * Les afficher, c'est dire de combien on se trompe.
 */
export function totalDesAppels(appels = []) {
  const liste = Array.isArray(appels) ? appels : [];

  let entree = 0;
  let sortie = 0;
  let euros = 0;
  let sansDecompte = 0;
  let sansTarif = 0;

  for (const appel of liste) {
    if (appel?.entree === null && appel?.sortie === null) {
      sansDecompte += 1;
      continue;
    }

    entree += nombre(appel?.entree);
    sortie += nombre(appel?.sortie);

    const cout = coutDeLAppel({
      model: appel?.model,
      inputTokens: appel?.entree,
      outputTokens: appel?.sortie
    });

    if (cout === null) sansTarif += 1;
    else euros += cout;
  }

  return {
    appels: liste.length,
    entree,
    sortie,
    jetons: entree + sortie,
    euros,
    sansDecompte,
    sansTarif
  };
}

/** Le jour d'un appel, en ISO court. */
export function jourDeLAppel(appel = {}) {
  return texte(appel?.le).slice(0, 10);
}

/**
 * La consommation jour par jour, sur une fenêtre continue.
 *
 * **Tous les jours de la fenêtre, y compris les vides.** Une courbe qui saute
 * les jours sans appel rapproche visuellement deux dates éloignées : on lit une
 * activité continue là où il y a eu une semaine de silence.
 *
 * @param {object[]} appels
 * @param {object} options
 * @param {string} options.du premier jour, en ISO court
 * @param {string} options.au dernier jour, inclus
 */
export function parJour(appels = [], { du = "", au = "" } = {}) {
  const debut = texte(du).slice(0, 10);
  const fin = texte(au).slice(0, 10);
  if (!debut || !fin || debut > fin) return [];

  const parDate = new Map();
  for (const appel of Array.isArray(appels) ? appels : []) {
    const jour = jourDeLAppel(appel);
    if (!jour || jour < debut || jour > fin) continue;
    if (!parDate.has(jour)) parDate.set(jour, []);
    parDate.get(jour).push(appel);
  }

  const jours = [];
  for (let curseur = new Date(`${debut}T00:00:00Z`); ; curseur.setUTCDate(curseur.getUTCDate() + 1)) {
    const jour = curseur.toISOString().slice(0, 10);
    if (jour > fin) break;
    jours.push({ jour, ...totalDesAppels(parDate.get(jour) ?? []) });
  }

  return jours;
}

/**
 * La répartition par projet, du plus consommateur au moins.
 *
 * Les appels sans projet sont rendus **à part**, sous une entrée sans
 * identifiant : les fondre dans un projet quelconque ferait porter à celui-ci
 * une consommation qui n'est pas la sienne.
 */
export function parProjet(appels = [], nomDuProjet = null) {
  const parId = new Map();

  for (const appel of Array.isArray(appels) ? appels : []) {
    const cle = texte(appel?.projetId);
    if (!parId.has(cle)) parId.set(cle, []);
    parId.get(cle).push(appel);
  }

  const nommer = (cle) => {
    if (!cle) return "Hors projet";
    const nom = typeof nomDuProjet === "function" ? texte(nomDuProjet(cle)) : "";
    // Un projet qu'on ne sait pas nommer garde son identifiant plutôt qu'un
    // libellé inventé : on peut alors aller voir lequel c'est.
    return nom || cle;
  };

  return [...parId.entries()]
    .map(([projetId, liste]) => ({ projetId, nom: nommer(projetId), ...totalDesAppels(liste) }))
    .sort((gauche, droite) => (droite.euros - gauche.euros) || (droite.jetons - gauche.jetons));
}

/** Ce qu'une personne a consommé dans cette liste. */
export function partDeLaPersonne(appels = [], ownerId = "") {
  const cle = texte(ownerId);
  if (!cle) return totalDesAppels([]);

  return totalDesAppels(
    (Array.isArray(appels) ? appels : []).filter((appel) => texte(appel?.ownerId) === cle)
  );
}

/* ── Ce qui s'écrit à l'écran ────────────────────────────────────────────── */

/**
 * Un montant en euros.
 *
 * **Quatre décimales sous un centime**, et non deux : la plupart des appels
 * coûtent moins d'un centime, et « 0,00 € » sur un écran qui existe pour
 * montrer un coût donnerait l'impression que rien n'est compté.
 */
export function enEuros(montant) {
  const valeur = nombre(montant);
  const decimales = valeur > 0 && valeur < 0.01 ? 4 : 2;
  return `${valeur.toFixed(decimales).replace(".", ",")} €`;
}

/** Un nombre de jetons, groupé par milliers. */
export function enJetons(combien) {
  return nombre(combien).toLocaleString("fr-FR");
}

/** Le mois d'une date, en ISO court — `2026-09`. */
export function moisDe(iso) {
  return texte(iso).slice(0, 7);
}

/**
 * Un mois en toutes lettres — « septembre 2026 ».
 *
 * Ici, et non dans chacun des écrans qui l'affichent : deux tables de mois
 * finiraient par ne pas dire la même chose (règle 10).
 */
const MOIS_EN_FRANCAIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"
];

export function moisEnFrancais(mois) {
  const [annee, numero] = texte(mois).split("-");
  const nom = MOIS_EN_FRANCAIS[Number(numero) - 1];
  return nom && annee ? `${nom} ${annee}` : texte(mois);
}

/** Le mois en cours, en ISO court. */
export function moisEnCours() {
  return new Date().toISOString().slice(0, 7);
}

/** Le premier et le dernier jour d'un mois. */
export function bornesDuMois(mois) {
  const cle = texte(mois).slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(cle)) return { du: "", au: "" };

  const [annee, numero] = cle.split("-").map(Number);
  const dernier = new Date(Date.UTC(annee, numero, 0)).getUTCDate();
  return { du: `${cle}-01`, au: `${cle}-${String(dernier).padStart(2, "0")}` };
}
