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
  // Relevé de mémoire et non sur la page de tarifs : à confirmer au tableau de
  // bord OpenAI. Un prix affiché faux est pire qu'un prix absent — si le doute
  // subsiste, retirer la ligne fait dire « tarif inconnu », ce qui est vrai.
  "gpt-5": { entree: 1.25, sortie: 10.00, releveLe: "2026-09-13" },
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

/**
 * Le prix d'un appel, prêt à afficher — et ce qui manque quand il manque.
 *
 * ## Pourquoi à la requête, et pas seulement au mois
 *
 * Le compteur dit ce qu'un mois a coûté. Il ne dit pas ce que **cette
 * lecture-ci** a coûté, au moment précis où l'on décide si elle valait la
 * peine. Un prix qu'il faut aller chercher dans un autre écran n'entre jamais
 * dans la décision — et l'habitude se prend sans qu'on l'ait choisie
 * (fondamental 13).
 *
 * ## Trois réponses, et elles ne se confondent pas
 *
 * - un montant, quand on sait ;
 * - `manque: "decompte"` quand le fournisseur n'a rien annoncé ;
 * - `manque: "tarif"` quand le modèle n'a pas de prix relevé.
 *
 * Aucune des deux dernières ne devient zéro. Un zéro se lit « gratuit », et
 * c'est la seule chose que ce n'est certainement pas (règle 5).
 *
 * @param {object} options
 * @param {string} options.model le modèle, tel qu'il se nomme chez le fournisseur
 * @param {number|null} options.entree les jetons d'entrée annoncés
 * @param {number|null} options.sortie les jetons de sortie annoncés
 * @returns {{euros: number|null, dit: string, manque: null|"decompte"|"tarif"}}
 */
export function prixDeLAppel({ model = "", entree = null, sortie = null } = {}) {
  const sansDecompte = !Number.isFinite(entree) && !Number.isFinite(sortie);
  if (sansDecompte) return { euros: null, dit: "coût non annoncé", manque: "decompte" };

  const euros = coutDeLAppel({
    model,
    inputTokens: Number.isFinite(entree) ? entree : 0,
    outputTokens: Number.isFinite(sortie) ? sortie : 0
  });

  if (euros === null) return { euros: null, dit: "tarif inconnu", manque: "tarif" };

  return { euros, dit: enEuros(euros), manque: null };
}

/**
 * Le détail d'un appel, pour l'info-bulle du prix.
 *
 * Le montant seul ne se vérifie pas : c'est en voyant les jetons qu'on
 * comprend pourquoi un document coûte trois fois un autre.
 */
export function detailDeLAppel({ model = "", entree = null, sortie = null } = {}) {
  const morceaux = [];

  if (Number.isFinite(entree)) morceaux.push(`${enJetons(entree)} jetons d'entrée`);
  if (Number.isFinite(sortie)) morceaux.push(`${enJetons(sortie)} jetons de sortie`);
  if (texte(model)) morceaux.push(texte(model));

  const tarif = tarifDuModele(model);
  if (tarif) {
    morceaux.push(`tarif du ${tarif.releveLe}, ${CHANGE.taux} $/€ du ${CHANGE.releveLe}`);
  }

  return morceaux.join(" · ");
}

/* ── Ce que chaque appel servait à faire ─────────────────────────────────── */

/**
 * Les natures d'appel, telles que les fonctions les écrivent.
 *
 * **C'est la question à laquelle l'écran doit répondre** : « où va mon argent
 * d'IA ? ». Un total par projet dit *combien*, jamais *pour quoi faire* — et
 * c'est « pour quoi faire » qui permet de décider. On ne change pas ses
 * habitudes en apprenant qu'un chantier coûte douze euros ; on les change en
 * apprenant que dix de ces douze partent dans la lecture de PDF.
 *
 * Chaque entrée dit **ce que l'utilisateur fait**, pas quelle fonction s'exécute :
 * « Lecture des comptes rendus » et non « extract-sujets ». Le nom technique ne
 * lui apprend rien sur le geste qu'il pourrait faire autrement.
 *
 * ## Le code vit côté serveur, le nom vit ici
 *
 * Le code est écrit par la fonction qui dépose ; il ne peut pas être importé
 * d'ici — l'orchestration du serveur ne descend jamais dans le navigateur.
 * Un test relit donc les fonctions et vérifie que chaque code déposé a bien son
 * nom : sans lui, une fonction ajoutée demain afficherait son code brut dans la
 * répartition, et personne ne saurait de quoi il s'agit.
 */
export const NATURES = {
  "copilote": {
    nom: "Copilote",
    quoi: "Les questions posées au copilote sur un projet."
  },
  "extraction-sujets": {
    nom: "Lecture des comptes rendus",
    quoi: "Relever les points d'un compte rendu de chantier."
  },
  "structure-du-document": {
    nom: "Structure d'un document",
    quoi: "Reconnaître la forme d'un document avant de le transcrire : ses tableaux, leurs colonnes, ce qui se répète d'une page à l'autre."
  },
  "reconstitution-markdown": {
    nom: "Document refait en Markdown",
    quoi: "Restituer un document tel quel, avant d'en relever les points."
  },
  "extraction-avis": {
    nom: "Lecture des rapports de contrôle",
    quoi: "Relever les avis d'un rapport de bureau de contrôle."
  },
  "lecture-figure": {
    nom: "Lecture des figures",
    quoi: "Décrire une image d'un rapport pour pouvoir la citer."
  },
  "lecture-manuscrit": {
    nom: "Lecture d'écriture manuscrite",
    quoi: "Transcrire une note écrite à la main."
  },
  "lecture-note-de-calcul": {
    nom: "Lecture des notes de calcul",
    quoi: "Relever les valeurs d'une note de calcul jointe à un agent."
  },
  "observations": {
    nom: "Relevé d'observations",
    quoi: "Tirer les observations d'un document versé."
  },
  "levee-observations": {
    nom: "Levée d'observations",
    quoi: "Décider si une observation est levée par ce qui vient d'arriver."
  },
  "note-de-depot": {
    nom: "Note de dépôt",
    quoi: "Rédiger ce qu'un versement apporte."
  },
  "titre-de-proposition": {
    nom: "Titre de proposition",
    quoi: "Proposer un titre à partir de ce que la proposition contient."
  },
  "echange-sujet": {
    nom: "Échange dans un sujet",
    quoi: "Répondre dans la discussion d'un sujet."
  },
  "releve-dun-fil": {
    nom: "Relevé d'un fil de mails",
    quoi: "Relever ce que chacun constate, demande, engage ou décide dans un échange."
  },
  "brouillon-de-fermeture": {
    nom: "Brouillon de fermeture",
    quoi: "Relire le fil d'un sujet qu'on ferme, et écrire le brouillon de ce qui a été tranché."
  },
  "ecrire-en-mdall": {
    nom: "Écriture en Mdall",
    quoi: "Mettre en Mdall une intention écrite en français, dans le bac d'essai."
  }
};

/**
 * Le nom d'une nature.
 *
 * **Un code inconnu garde son code**, et ne devient pas « Autre ». Une fonction
 * ajoutée demain sans son nom doit se voir : rangée sous « Autre », sa
 * consommation serait invisible au milieu du reste, et l'on chercherait
 * longtemps pourquoi les totaux ne s'expliquent pas (règle 5).
 */
export function nomDeLaNature(code) {
  return NATURES[texte(code)]?.nom || texte(code) || "Sans nature";
}

export function quoiDeLaNature(code) {
  return NATURES[texte(code)]?.quoi ?? "";
}

/**
 * La répartition par nature, de la plus coûteuse à la moins.
 *
 * C'est **le classement qui sert à décider** : on lit la première ligne et l'on
 * sait où porter l'effort. Un ordre alphabétique obligerait à comparer onze
 * montants soi-même.
 */
export function parNature(appels = []) {
  const parCode = new Map();

  for (const appel of Array.isArray(appels) ? appels : []) {
    const code = texte(appel?.nature) || "inconnu";
    if (!parCode.has(code)) parCode.set(code, []);
    parCode.get(code).push(appel);
  }

  return [...parCode.entries()]
    .map(([code, liste]) => ({
      code,
      nom: nomDeLaNature(code),
      quoi: quoiDeLaNature(code),
      ...totalDesAppels(liste)
    }))
    .sort((gauche, droite) => (droite.euros - gauche.euros) || (droite.jetons - gauche.jetons));
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
 *
 * ## Une ligne peut en valoir plusieurs
 *
 * `combien` vaut 1 par défaut : un appel est un appel. Mais la console lit la
 * consommation d'un compte **déjà groupée en base** — par pas et par modèle,
 * parce que rendre dix mille lignes pour en faire douze points serait dix mille
 * lignes de trop. Une ligne groupée porte alors les jetons de ses `combien`
 * appels, et c'est ce nombre qui compte.
 *
 * **Le tarif, lui, ne se recopie pas pour autant.** Le coût est proportionnel
 * aux jetons : la somme des jetons de quarante appels d'un même modèle coûte
 * exactement ce que coûtent les quarante. C'est ce qui permet de grouper sans
 * écrire un second barème en SQL (règle 4) — et un second barème, c'est un
 * montant qui diverge de la facture le jour où l'on relève un tarif.
 */
export function totalDesAppels(appels = []) {
  const liste = Array.isArray(appels) ? appels : [];

  let appelsComptes = 0;
  let entree = 0;
  let sortie = 0;
  let euros = 0;
  let sansDecompte = 0;
  let sansTarif = 0;

  for (const appel of liste) {
    // **Zéro n'est pas « non précisé ».** Une ligne groupée qui porterait
    // `combien: 0` ne vaudrait aucun appel ; l'absence, elle, en vaut un.
    const combien = appel?.combien === null || appel?.combien === undefined
      ? 1
      : Math.max(0, Math.trunc(nombre(appel.combien)));
    appelsComptes += combien;

    if (appel?.entree === null && appel?.sortie === null) {
      sansDecompte += combien;
      continue;
    }

    entree += nombre(appel?.entree);
    sortie += nombre(appel?.sortie);

    const cout = coutDeLAppel({
      model: appel?.model,
      inputTokens: appel?.entree,
      outputTokens: appel?.sortie
    });

    if (cout === null) sansTarif += combien;
    else euros += cout;
  }

  return {
    appels: appelsComptes,
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

/* ── Le pas de lecture ──────────────────────────────────────── */

/**
 * À quel pas on regarde le temps.
 *
 * ## Le défaut que cela répare
 *
 * L'écran ne savait montrer qu'**un mois, jour par jour**. C'est la bonne vue
 * pour « combien ce mois-ci », et la mauvaise pour la seule question qui compte
 * ensuite : « est-ce que cela monte ? ». Un mois seul ne répond jamais à celle-là
 * — il faut les douze précédents à côté.
 */
export const PAS = {
  /** Les jours d'un mois. */
  JOUR: "jour",
  /** Les douze mois qui finissent à celui qu'on regarde. */
  MOIS: "mois",
  /** Les cinq années qui finissent à celle qu'on regarde. */
  ANNEE: "annee"
};

/**
 * Sur combien de pas la fenêtre remonte, quand ce n'est pas un mois.
 *
 * **Douze mois**, parce que c'est l'année glissante : on compare un mois à son
 * homologue de l'an passé, et un hiver à un hiver.
 *
 * **Cinq ans**, parce qu'au-delà l'axe porterait des années où Mdall n'existait
 * pas — des zéros qui se lisent comme une chute.
 */
export const COMBIEN_DE_MOIS = 12;
export const COMBIEN_DANNEES = 5;

/** Les mois, en trois lettres, pour un axe qui en porte douze. */
const MOIS_COURTS = [
  "jan", "fév", "mar", "avr", "mai", "jun",
  "jui", "aoû", "sep", "oct", "nov", "déc"
];

/**
 * Un mois décalé de tant de mois — « 2026-01 » reculant de deux donne
 * « 2025-11 ».
 *
 * Par un `Date` en UTC, et non par une arithmétique à la main sur le numéro :
 * c'est le passage de décembre à janvier qui se trompe, et il ne se trompe
 * qu'une fois par an.
 */
export function moisDecale(mois, de = 0) {
  const cle = texte(mois).slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(cle)) return "";

  const [annee, numero] = cle.split("-").map(Number);
  const quand = new Date(Date.UTC(annee, numero - 1 + Math.trunc(nombre(de)), 1));
  return quand.toISOString().slice(0, 7);
}

/**
 * Les derniers mois, du plus récent au plus ancien, pour le menu des périodes.
 *
 * **Du plus récent au plus ancien**, parce qu'on vient voir le mois en cours ou
 * le précédent neuf fois sur dix : les ranger à l'endroit obligerait à descendre
 * la liste pour atteindre le cas courant.
 */
export function lesMoisARemonter(combien = COMBIEN_DE_MOIS, depuis = "") {
  const fin = /^\d{4}-\d{2}/.test(texte(depuis)) ? texte(depuis).slice(0, 7) : moisEnCours();
  const combienDe = Math.max(1, Math.trunc(nombre(combien)) || COMBIEN_DE_MOIS);

  const mois = [];
  for (let recul = 0; recul < combienDe; recul += 1) {
    const cle = moisDecale(fin, -recul);
    if (!cle) break;
    mois.push({ cle, dit: moisEnFrancais(cle) });
  }
  return mois;
}

/**
 * Ce que chaque pas sait de lui-même.
 *
 * **Un registre, et non trois boucles.** Écrire « par jour », « par mois » et
 * « par an » l'une après l'autre aurait fait trois fois la même chose à une
 * troncature près — et la troisième aurait oublié les pas vides, que la
 * première avait appris à garder (règle 4).
 */
const LE_PAS = {
  [PAS.JOUR]: {
    nom: "Par jour",
    titre: "Consommation par jour",
    /** La fenêtre : le mois qu'on regarde. */
    fenetreDe: (mois) => bornesDuMois(mois),
    cleDe: (jour) => texte(jour).slice(0, 10),
    suivante: (cle) => {
      const quand = new Date(`${cle}T00:00:00Z`);
      quand.setUTCDate(quand.getUTCDate() + 1);
      return quand.toISOString().slice(0, 10);
    },
    // Le jour du mois seul : la date entière, répétée trente fois, ne tient pas
    // sous un axe et ne dit rien de plus.
    dit: (cle) => cle.slice(8),
    enClair: (cle) => cle
  },

  [PAS.MOIS]: {
    nom: "Par mois",
    titre: `Consommation par mois — ${COMBIEN_DE_MOIS} derniers mois`,
    fenetreDe: (mois) => ({
      du: `${moisDecale(mois, -(COMBIEN_DE_MOIS - 1))}-01`,
      au: bornesDuMois(mois).au
    }),
    cleDe: (jour) => texte(jour).slice(0, 7),
    suivante: (cle) => moisDecale(cle, 1),
    dit: (cle) => MOIS_COURTS[Number(cle.slice(5, 7)) - 1] ?? cle,
    enClair: (cle) => moisEnFrancais(cle)
  },

  [PAS.ANNEE]: {
    nom: "Par an",
    titre: "Consommation par an",
    fenetreDe: (mois) => {
      const annee = Number(texte(mois).slice(0, 4));
      if (!Number.isFinite(annee) || annee <= 0) return { du: "", au: "" };
      return { du: `${annee - (COMBIEN_DANNEES - 1)}-01-01`, au: `${annee}-12-31` };
    },
    cleDe: (jour) => texte(jour).slice(0, 4),
    suivante: (cle) => String(Number(cle) + 1),
    dit: (cle) => cle,
    enClair: (cle) => cle
  }
};

/** Les pas, pour le menu qui les propose. */
export const LES_PAS = Object.keys(LE_PAS).map((cle) => ({ cle, nom: LE_PAS[cle].nom }));

/** Le pas demandé, ramené à l'un de ceux qui existent. */
export function lePasValide(pas) {
  const voulu = texte(pas);
  return Object.hasOwn(LE_PAS, voulu) ? voulu : PAS.JOUR;
}

/** Ce que ce pas met en titre de courbe. */
export function leTitreDuPas(pas) {
  return LE_PAS[lePasValide(pas)].titre;
}

/**
 * La fenêtre à lire en base, pour un pas et un mois choisi.
 *
 * **Elle dépend du pas, et c'est tout le point.** Demander « par mois » en ne
 * lisant qu'un mois donnerait un point unique — une courbe qui ne monte ni ne
 * descend, ce qui est la réponse la plus trompeuse possible (règle 5).
 */
export function laFenetreDe({ pas = PAS.JOUR, mois = "" } = {}) {
  const cle = /^\d{4}-\d{2}/.test(texte(mois)) ? texte(mois).slice(0, 7) : moisEnCours();
  return LE_PAS[lePasValide(pas)].fenetreDe(cle);
}

/**
 * Ce qui désigne une lecture : **le pas autant que le mois**.
 *
 * ## Le défaut que cela évite
 *
 * Un écran qui garde ce qu'il a lu doit savoir quand ce qu'il garde ne vaut
 * plus. Si la clé ne portait que le mois, passer de « par jour » à « par mois »
 * ne relirait rien : on dessinerait douze mois à partir d'un seul mois d'appels.
 * La courbe s'arrêterait net à la fin du mois lu, et se lirait comme un
 * effondrement de la consommation — un chiffre faux, obtenu sans erreur
 * (règle 5).
 */
export function laCleDeLaFenetre({ pas = PAS.JOUR, mois = "" } = {}) {
  const cle = /^\d{4}-\d{2}/.test(texte(mois)) ? texte(mois).slice(0, 7) : moisEnCours();
  return `${lePasValide(pas)}@${cle}`;
}

/**
 * Ce que la fenêtre couvre, en toutes lettres.
 *
 * ## Le défaut que cela répare
 *
 * L'écran écrivait « Ma consommation — octobre 2026 » quelle que soit la
 * fenêtre. En passant « par mois », il lisait douze mois et continuait à dire
 * « octobre » : un total de douze mois annoncé comme celui d'un seul, c'est-à-dire
 * un montant faux de onze mois, affiché sans la moindre erreur (règle 5).
 *
 * **Le mois choisi reste nommé**, même quand la fenêtre est plus large : c'est
 * lui qu'on a cliqué, et c'est par lui qu'on comprend où la fenêtre s'arrête.
 */
export function ceQueLaFenetreDit({ pas = PAS.JOUR, mois = "" } = {}) {
  const cle = /^\d{4}-\d{2}/.test(texte(mois)) ? texte(mois).slice(0, 7) : moisEnCours();

  if (lePasValide(pas) === PAS.MOIS) {
    return `les ${COMBIEN_DE_MOIS} mois jusqu'à ${moisEnFrancais(cle)}`;
  }
  if (lePasValide(pas) === PAS.ANNEE) {
    return `les ${COMBIEN_DANNEES} années jusqu'à ${cle.slice(0, 4)}`;
  }
  return moisEnFrancais(cle);
}

/**
 * La consommation pas par pas, sur une fenêtre continue.
 *
 * **Tous les pas de la fenêtre, y compris les vides.** Une courbe qui saute les
 * pas sans appel rapproche visuellement deux dates éloignées : on lit une
 * activité continue là où il y a eu une semaine de silence.
 *
 * @param {object[]} appels
 * @param {object} options
 * @param {string} [options.pas] `jour`, `mois` ou `annee`
 * @param {string} options.du premier jour de la fenêtre, en ISO court
 * @param {string} options.au dernier jour, inclus
 */
export function parPas(appels = [], { pas = PAS.JOUR, du = "", au = "" } = {}) {
  const le = LE_PAS[lePasValide(pas)];
  const debut = texte(du).slice(0, 10);
  const fin = texte(au).slice(0, 10);
  if (!debut || !fin || debut > fin) return [];

  const parCle = new Map();
  for (const appel of Array.isArray(appels) ? appels : []) {
    const jour = jourDeLAppel(appel);
    if (!jour || jour < debut || jour > fin) continue;
    const cle = le.cleDe(jour);
    if (!parCle.has(cle)) parCle.set(cle, []);
    parCle.get(cle).push(appel);
  }

  // Les clés sont ISO à largeur fixe : leur ordre alphabétique **est** leur
  // ordre chronologique, et la fin du parcours se compare donc directement.
  const derniere = le.cleDe(fin);
  const points = [];
  for (let cle = le.cleDe(debut); cle && cle <= derniere; cle = le.suivante(cle)) {
    points.push({
      cle,
      dit: le.dit(cle),
      enClair: le.enClair(cle),
      ...totalDesAppels(parCle.get(cle) ?? [])
    });
  }

  return points;
}

/* ── L'évolution des postes ────────────────────────────────── */

/**
 * Combien de courbes au plus, dans une évolution.
 *
 * **Quatre, et c'est la feuille de style qui le dit** : elle déclare quatre
 * couleurs de série. Une cinquième prendrait la couleur du texte et se lirait
 * comme un défaut d'affichage.
 *
 * C'est aussi le bon nombre : douze courbes sur un même axe ne se distinguent
 * pas, et une évolution qu'on ne peut pas lire ne vaut pas mieux que pas
 * d'évolution du tout.
 */
export const COMBIEN_DE_COURBES = 4;

/**
 * L'évolution des plus gros postes, pas par pas.
 *
 * ## La question à laquelle la jauge ne répond pas
 *
 * « La lecture de PDF fait 60 % de la facture » dit où part l'argent, jamais si
 * cela monte. Or ce sont deux décisions différentes : un poste qui pèse et qui
 * baisse se laisse tranquille ; un poste qui pèse peu et qui triple tous les
 * mois est le prochain problème.
 *
 * ## Le classement porte sur la fenêtre entière, pas sur un pas
 *
 * Retenir les quatre plus gros **du dernier pas** ferait entrer et sortir des
 * courbes d'un mois à l'autre, et l'on comparerait des évolutions qui ne portent
 * pas sur les mêmes postes.
 *
 * @param {object[]} appels
 * @param {object} quoi
 * @param {string} [quoi.pas]
 * @param {string} quoi.du
 * @param {string} quoi.au
 * @param {(appel: object) => string} quoi.cleDuPoste ce qui groupe — la nature, le projet
 * @param {(cle: string) => string} [quoi.nomDuPoste] comment le poste s'écrit
 * @param {number} [quoi.combien] au plus tant de courbes
 */
export function lEvolutionDesPostes(appels = [], {
  pas = PAS.JOUR, du = "", au = "", cleDuPoste = null, nomDuPoste = null,
  combien = COMBIEN_DE_COURBES
} = {}) {
  if (typeof cleDuPoste !== "function") return [];

  const parPoste = new Map();
  for (const appel of Array.isArray(appels) ? appels : []) {
    const cle = texte(cleDuPoste(appel));
    if (!parPoste.has(cle)) parPoste.set(cle, []);
    parPoste.get(cle).push(appel);
  }

  const combienDe = Math.max(1, Math.trunc(nombre(combien)) || COMBIEN_DE_COURBES);

  return [...parPoste.entries()]
    .map(([cle, liste]) => ({ cle, liste, total: totalDesAppels(liste) }))
    .sort((gauche, droite) => (droite.total.euros - gauche.total.euros)
      || (droite.total.jetons - gauche.total.jetons))
    .slice(0, combienDe)
    .map(({ cle, liste, total }) => ({
      cle,
      nom: (typeof nomDuPoste === "function" ? texte(nomDuPoste(cle)) : "") || cle || "Hors poste",
      euros: total.euros,
      points: parPas(liste, { pas, du, au })
    }));
}
