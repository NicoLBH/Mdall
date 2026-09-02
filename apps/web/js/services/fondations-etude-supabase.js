/**
 * Les semelles d'une étude, en base.
 *
 * Ce fichier est **la seule porte**. Il n'expose aucune lecture « par projet »
 * ni « par équipe » : la seule question qu'on peut lui poser est « les miennes,
 * sur ce projet ». La base refuserait les autres — la politique est propriétaire
 * seul dans les deux sens — mais elles n'auraient rien à faire ici non plus.
 *
 * ## Une écriture qui échoue se dit
 *
 * L'appelant reçoit un refus et l'écran le signale. Une sauvegarde
 * silencieusement perdue est pire qu'une sauvegarde refusée : on découvre
 * l'absence le lendemain, après avoir travaillé dessus.
 */

import { supabase } from "../../assets/js/auth.js";

const TABLE = "fondation_semelles";
const COLONNES = "id,project_id,designation,nombre,rang,entrees,created_at,updated_at";

function texte(valeur) {
  return String(valeur ?? "").trim();
}

/** Ce que la base rend, dans la forme que l'écran attend. */
function versSemelle(ligne) {
  return {
    id: texte(ligne?.id),
    projectId: texte(ligne?.project_id),
    designation: texte(ligne?.designation),
    nombre: Number.isFinite(Number(ligne?.nombre)) ? Number(ligne.nombre) : 1,
    rang: Number.isFinite(Number(ligne?.rang)) ? Number(ligne.rang) : 0,
    entrees: ligne?.entrees && typeof ligne.entrees === "object" ? ligne.entrees : {},
    creeeLe: texte(ligne?.created_at),
    modifieeLe: texte(ligne?.updated_at) || texte(ligne?.created_at)
  };
}

/**
 * Les semelles du projet qui m'appartiennent, dans l'ordre du tableau.
 *
 * Rend `null` — et non `[]` — quand la lecture échoue : « je n'ai pas pu lire »
 * et « il n'y en a aucune » ne se ressemblent que sur un écran vide, et l'un des
 * deux mérite qu'on le dise.
 */
export async function listerSemelles(projectId) {
  const projet = texte(projectId);
  if (!projet) return [];

  const { data, error } = await supabase
    .from(TABLE)
    .select(COLONNES)
    .eq("project_id", projet)
    .order("rang", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[fondations] étude illisible", error);
    return null;
  }
  return (data ?? []).map(versSemelle);
}

/** Une semelle neuve. Le propriétaire est posé par la base, jamais par nous. */
export async function creerSemelle(projectId, semelle = {}) {
  const projet = texte(projectId);
  if (!projet) throw new Error("Aucun projet ouvert : la semelle n'a pas été enregistrée.");

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      project_id: projet,
      designation: texte(semelle.designation),
      nombre: Math.max(0, Math.trunc(Number(semelle.nombre) || 0)),
      rang: Math.trunc(Number(semelle.rang) || 0),
      entrees: semelle.entrees ?? {}
    })
    .select(COLONNES)
    .single();

  if (error || !data) throw new Error("La semelle n'a pas pu être enregistrée.");
  return versSemelle(data);
}

/** Ce qui a changé sur une semelle. Le projet et le propriétaire ne bougent pas. */
export async function enregistrerSemelle(id, changements = {}) {
  const cle = texte(id);
  if (!cle) throw new Error("Semelle inconnue : rien n'a été enregistré.");

  const champs = {};
  if (changements.designation !== undefined) champs.designation = texte(changements.designation);
  if (changements.nombre !== undefined) champs.nombre = Math.max(0, Math.trunc(Number(changements.nombre) || 0));
  if (changements.rang !== undefined) champs.rang = Math.trunc(Number(changements.rang) || 0);
  if (changements.entrees !== undefined) champs.entrees = changements.entrees ?? {};
  if (Object.keys(champs).length === 0) return null;

  const { data, error } = await supabase.from(TABLE).update(champs).eq("id", cle).select(COLONNES).single();
  if (error || !data) throw new Error("La modification n'a pas pu être enregistrée.");
  return versSemelle(data);
}

/** Une semelle qu'on retire de l'étude. */
export async function supprimerSemelle(id) {
  const cle = texte(id);
  if (!cle) return;
  const { error } = await supabase.from(TABLE).delete().eq("id", cle);
  if (error) throw new Error("La semelle n'a pas pu être supprimée.");
}

/**
 * Le nouvel ordre du tableau.
 *
 * Une écriture par ligne : la base n'accepte pas de mise à jour groupée sur des
 * valeurs différentes, et faire semblant avec un `upsert` réécrirait des
 * colonnes qu'on ne voulait pas toucher.
 */
export async function reordonner(semelles = []) {
  await Promise.all(
    semelles.map((semelle, rang) =>
      semelle.rang === rang ? null : enregistrerSemelle(semelle.id, { rang })
    )
  );
}
