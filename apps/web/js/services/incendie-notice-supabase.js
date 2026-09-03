/**
 * La notice d'un projet, et la bibliothèque de choix qui se construit à l'usage.
 *
 * ## Deux régimes, et ce n'est pas un détail
 *
 * La **notice** est un document de projet : l'adresse, la maîtrise d'ouvrage,
 * les choix de conception. Propriétaire seulement, comme le reste de l'atelier.
 *
 * La **bibliothèque** est l'inverse : elle ne sert que si l'on compte à travers
 * les projets. Ce qui en sort a été pesé et réduit à deux choses — le libellé
 * du choix, et le département. Ni le projet, ni l'adresse, ni le compte, ni la
 * date. On ne peut donc pas remonter d'une ligne à un chantier ni à quelqu'un.
 * L'écriture passe par une fonction en base qui n'accepte que ces valeurs :
 * c'est ce qui empêche la promesse de s'éroder au fil des versions.
 */

import { supabase } from "../../assets/js/auth.js";

const TABLE = "incendie_notices";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Une lecture qui ne fait pas tomber l'écran.
 *
 * La table peut ne pas exister encore, le réseau peut manquer : dans les deux
 * cas l'onglet doit s'ouvrir quand même, avec ce qu'il a. Un écran qui refuse
 * de se dessiner parce qu'une bibliothèque optionnelle est absente est pire
 * qu'un écran sans bibliothèque.
 */
async function lire(requete) {
  try {
    return await requete();
  } catch (erreur) {
    return { data: null, error: erreur };
  }
}

/**
 * La notice du projet qui m'appartient.
 *
 * Rend `null` quand la lecture échoue : « je n'ai pas pu lire » et « il n'y en
 * a pas » ne se ressemblent que sur un écran vide, et l'un des deux mérite
 * qu'on le dise.
 */
export async function lireLaNotice(projectId) {
  const projet = texte(projectId);
  if (!projet) return { complements: {}, entete: {} };

  const { data, error } = await lire(() => supabase
    .from(TABLE)
    .select("complements,entete")
    .eq("project_id", projet)
    .maybeSingle());

  if (error) {
    console.warn("[incendie] notice illisible", error);
    return null;
  }
  return {
    complements: data?.complements && typeof data.complements === "object" ? data.complements : {},
    entete: data?.entete && typeof data.entete === "object" ? data.entete : {}
  };
}

/** Ce que l'utilisateur a ajouté, conservé. Les phrases, elles, se recalculent. */
export async function enregistrerLaNotice(projectId, { complements = {}, entete = {} } = {}) {
  const projet = texte(projectId);
  if (!projet) return false;

  const { error } = await supabase
    .from(TABLE)
    .upsert({ project_id: projet, complements, entete }, { onConflict: "project_id,owner_id" });

  if (error) {
    console.warn("[incendie] notice non enregistrée", error);
    return false;
  }
  return true;
}

/**
 * Les choix les plus fréquents, par rubrique.
 *
 * Le classement se fait ici, pas en base : le poids national et le poids du
 * département ne se comparent pas directement — sur un territoire, dix
 * réponses valent mieux que mille ailleurs, parce qu'elles décrivent ce qui s'y
 * construit. Le local pèse donc plus lourd, sans effacer le général.
 */
export async function lireLesChoix(rubriques = [], departement = "") {
  const liste = rubriques.map(texte).filter(Boolean);
  if (liste.length === 0) return {};

  const { data, error } = await lire(() => supabase
    .from("incendie_choix")
    .select("rubrique,libelle,territoire,poids")
    .in("rubrique", liste)
    .order("poids", { ascending: false })
    .limit(600));

  if (error) {
    console.warn("[incendie] bibliothèque illisible", error);
    return {};
  }

  const parRubrique = {};
  for (const ligne of data ?? []) {
    const rubrique = texte(ligne.rubrique);
    const libelle = texte(ligne.libelle);
    if (!rubrique || !libelle) continue;
    const local = departement && texte(ligne.territoire) === departement;
    // Le poids local compte triple : « en montagne c'est du bardage bois » ne
    // se voit pas dans une moyenne nationale.
    const poids = Number(ligne.poids || 0) * (local ? 3 : 1);
    (parRubrique[rubrique] ??= new Map());
    parRubrique[rubrique].set(libelle, (parRubrique[rubrique].get(libelle) ?? 0) + poids);
  }

  return Object.fromEntries(Object.entries(parRubrique).map(([rubrique, compte]) => [
    rubrique,
    [...compte.entries()].sort((a, b) => b[1] - a[1]).map(([libelle, poids]) => ({ libelle, poids }))
  ]));
}

/**
 * Retenir un choix : c'est ce geste, et lui seul, qui nourrit la bibliothèque.
 *
 * Il passe par une fonction en base plutôt que par une écriture directe. Sans
 * elle, il aurait suffi d'ajouter une colonne un jour — l'identifiant du projet,
 * « juste pour déboguer » — pour que la promesse tombe sans que personne ne
 * s'en aperçoive.
 */
export async function retenirLeChoix(rubrique, libelle, departement = "") {
  if (!texte(rubrique) || !texte(libelle)) return false;
  // Nourrir la bibliothèque commune est un bénéfice, jamais une condition : si
  // l'appel échoue, la notice de celui qui travaille ne doit pas s'en trouver
  // bloquée. On le note, et on continue.
  try {
    const { error } = await supabase.rpc("incendie_retenir_choix", {
      p_rubrique: texte(rubrique),
      p_libelle: texte(libelle),
      p_territoire: texte(departement)
    });
    if (error) {
      console.warn("[incendie] choix non retenu", error);
      return false;
    }
    return true;
  } catch (erreur) {
    console.warn("[incendie] choix non retenu", erreur);
    return false;
  }
}
