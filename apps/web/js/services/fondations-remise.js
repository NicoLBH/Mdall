/**
 * Ce que le copilote propose à l'Atelier des fondations.
 *
 * ## Une remise, pas un versement
 *
 * Le copilote a calculé des massifs ; l'Atelier tient l'étude. Entre les deux il
 * n'y a pas d'écriture directe : « L'Atelier propose, la Mémoire enregistre —
 * une seule porte ». Un pré-dimensionnement est un avis, pas une décision, et
 * une décision se prend devant le tableau, par quelqu'un.
 *
 * Cette remise est donc **en attente** : elle vit en mémoire vive, elle est
 * perdue au rechargement, et elle ne devient des semelles que si l'on clique.
 *
 * ## Ce qu'on ne fait jamais : remplacer
 *
 * L'étude contient peut-être déjà des semelles. Chacune est une décision de
 * quelqu'un — « ce qui a été décidé se conserve ». Les massifs remis
 * s'**ajoutent à la suite**, jamais à la place ; un nom déjà pris est suffixé
 * plutôt que fusionné. Deux lignes visibles qu'on compare valent mieux qu'une
 * ligne écrasée qu'on ne compare plus.
 *
 * ## Et l'on sait d'où elles viennent
 *
 * Chaque semelle ajoutée porte sa provenance — l'utilitaire, sa version, la note
 * lue, la date. Le tableau le montre d'une pastille. Une semelle dont on ignore
 * l'origine ne se conteste pas, elle se subit ; et six mois plus tard, personne
 * ne saura si elle a été dimensionnée à la main ou proposée par un calcul.
 */

function texte(valeur) {
  return String(valeur ?? "").trim();
}

/** La marque qu'une semelle porte quand elle vient d'un pré-dimensionnement. */
export const VENUE_DU_COPILOTE = "copilote";

/**
 * Le signal qu'une remise attend.
 *
 * Les panneaux de l'Atelier sont dessinés une fois, à l'ouverture, et le rail ne
 * fait ensuite que les montrer. Une remise qui arrive après ce dessin ne se
 * verrait donc qu'au rechargement de la page — c'est-à-dire jamais. L'écran des
 * fondations écoute, et se redessine.
 */
export const REMISE_ANNONCEE = "mdall:fondations-remise";

/** Annoncer la remise à qui l'attend. */
export function annoncerLaRemise() {
  if (typeof window?.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent(REMISE_ANNONCEE));
  }
}

/**
 * Les semelles à ajouter, d'après un résultat de pré-dimensionnement.
 *
 * Les appuis qui n'ont pas tenu n'en font pas partie : proposer une semelle
 * dont on vient de dire qu'elle ne vérifie pas serait proposer une erreur.
 */
export function semellesDeLaRemise(execution) {
  const appuis = execution?.valeurs?.appuis;
  if (!Array.isArray(appuis)) return [];

  return appuis
    .filter((appui) => appui?.tenue && appui?.entrees)
    .map((appui) => ({
      designation: texte(appui.nom),
      nombre: Math.max(1, Math.trunc(Number(appui.quantite) || 1)),
      entrees: {
        ...appui.entrees,
        provenance: {
          par: VENUE_DU_COPILOTE,
          outil: texte(execution.outil),
          note: texte(execution.valeurs?.affaire),
          le: new Date().toISOString()
        }
      }
    }));
}

/**
 * Un nom libre, sachant ceux qui sont pris.
 *
 * Le suffixe dit d'où vient le doublon plutôt que de compter : « File A
 * (copilote) » se comprend, « File A (2) » demande d'aller voir.
 */
export function nomLibre(souhaite, pris = []) {
  const occupes = new Set(pris.map((nom) => texte(nom).toLowerCase()));
  const base = texte(souhaite) || "Massif";
  if (!occupes.has(base.toLowerCase())) return base;

  const avecMarque = `${base} (copilote)`;
  if (!occupes.has(avecMarque.toLowerCase())) return avecMarque;

  for (let rang = 2; rang < 100; rang += 1) {
    const essai = `${base} (copilote ${rang})`;
    if (!occupes.has(essai.toLowerCase())) return essai;
  }
  return `${base} (copilote ${Date.now()})`;
}

/**
 * Ce que l'ajout va faire, dit avant de le faire.
 *
 * On annonce combien de lignes s'ajoutent, combien de noms étaient déjà pris et
 * ce qu'ils deviennent. Un ajout qui renomme en silence fait douter du tableau
 * entier la première fois qu'on s'en aperçoit.
 */
export function planDeLaRemise(semelles = [], dejaLa = []) {
  const pris = dejaLa.map((semelle) => texte(semelle?.designation));
  const plan = [];

  for (const semelle of semelles) {
    const nom = nomLibre(semelle.designation, [...pris, ...plan.map((ligne) => ligne.designation)]);
    plan.push({ ...semelle, designation: nom, renommee: nom !== texte(semelle.designation) });
  }

  return {
    semelles: plan,
    ajoutees: plan.length,
    renommees: plan.filter((ligne) => ligne.renommee).length,
    dejaLa: dejaLa.length
  };
}

/** Cette semelle vient-elle d'un pré-dimensionnement ? */
export function vientDuCopilote(semelle) {
  return semelle?.entrees?.provenance?.par === VENUE_DU_COPILOTE;
}
