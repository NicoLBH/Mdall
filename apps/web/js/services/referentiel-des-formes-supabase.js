/**
 * Les allers-retours du référentiel des formes.
 *
 * Lire les formes, lire les signatures de ce projet, verser une forme, retirer
 * sa signature. Ce qui décide **quoi** écrire vit dans
 * `referentiel-des-formes.js`, qui est pur et testé ; ici il n'y a que le
 * transport.
 *
 * ## Deux lectures qui ne se mélangent pas
 *
 * Les **formes** se lisent par tout le monde : elles ne contiennent rien qui
 * appartienne à quiconque. Les **signatures** ne se lisent que par les membres
 * du projet, et c'est la politique de la table qui le garantit, pas ce fichier.
 * Une lecture d'écran qui se croirait responsable de la confidentialité
 * mélangerait deux choses, et l'une des deux finirait par ne plus protéger.
 *
 * ## On verse, on ne reprend pas
 *
 * Il n'y a **pas de fonction qui supprime une forme**, et ce n'est pas un oubli.
 * Une forme versée a pu être lue la seconde d'après ; la retirer ne la
 * retirerait de la tête de personne. Ce qui se retire est la **signature** —
 * « ce projet-ci l'a versée » —, qui est privée.
 *
 * ## Verser deux fois la même forme ne fait rien
 *
 * La base a une unicité sur l'empreinte, et l'insertion part en
 * `ignore-duplicates` : deux projets qui versent le même raisonnement le même
 * jour tombent sur la même ligne. C'est la bonne réponse, et c'est ce qui fait
 * qu'un référentiel se remplit sans doublonner.
 *
 * ## `null` n'est pas `[]`
 *
 * `null` quand la lecture a échoué — la table peut ne pas exister encore —, `[]`
 * quand le référentiel ne connaît rien. Les confondre ferait dire « personne ne
 * fait autrement » à une panne de réseau (règle 5).
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

const SUPABASE_URL = getSupabaseUrl();

/** Ce qu'une forme dit d'elle. Aucune colonne ne dit d'où elle vient : il n'y en a pas. */
const COLONNES_FORME = "id,entrees,conclusions,domaine,empreinte,created_at";

const COLONNES_SIGNATURE = "id,form_id,project_id,assertion_id,signed_by,signed_at,retire_le,retire_par";

async function requete(chemin, { method = "GET", body = null, headers = {}, params = {} } = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${chemin}`);
  for (const [clef, valeur] of Object.entries(params)) url.searchParams.set(clef, valeur);

  const reponse = await fetch(url.toString(), {
    method,
    headers: await buildSupabaseAuthHeaders({
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers
    }),
    cache: "no-store",
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  if (!reponse.ok) throw new Error(`${chemin} (${reponse.status})`);
  return reponse.status === 204 ? null : reponse.json().catch(() => null);
}

/**
 * Le référentiel entier.
 *
 * Il est petit par nature — une forme par manière de raisonner, pas une par
 * raisonnement —, et le charger d'un coup évite d'interroger la base à chaque
 * ligne de mémoire affichée.
 *
 * @returns {Promise<object[]|null>} `null` si la lecture a échoué.
 */
export async function listerLesFormes() {
  try {
    return (await requete("reasoning_forms", {
      params: { select: COLONNES_FORME, order: "empreinte.asc" }
    })) ?? [];
  } catch {
    return null;
  }
}

/**
 * Les signatures de ce projet — y compris celles qu'on a retirées.
 *
 * Les retirées viennent aussi : elles occupent la place, et l'unicité
 * `(project_id, form_id)` empêche de reverser la même forme. Les filtrer ici
 * ferait proposer un versement que la base refuserait.
 *
 * @returns {Promise<object[]|null>} `null` si la lecture a échoué.
 */
export async function listerMesVersements(projectId) {
  if (!projectId) return null;

  try {
    return (await requete("reasoning_form_contributions", {
      params: { select: COLONNES_SIGNATURE, project_id: `eq.${projectId}`, order: "signed_at.asc" }
    })) ?? [];
  } catch {
    return null;
  }
}

/**
 * Verser une forme, et la signer.
 *
 * Deux écritures, dans cet ordre : la forme — qui peut exister déjà —, puis la
 * signature. L'ordre n'est pas indifférent : une signature qui pointerait une
 * forme non écrite serait refusée par la clé étrangère, et l'on aurait signé
 * pour rien.
 *
 * @param {object} versement ce que `leVersementDuneForme` a préparé
 * @returns {Promise<object|null>} la signature écrite, `null` si rien n'a pris
 */
export async function verserUneForme(versement = null) {
  if (!versement?.forme || !versement?.signature) return null;

  try {
    // `ignore-duplicates` : la forme existe peut-être déjà, versée par un autre
    // projet. C'est le cas normal d'un référentiel qui sert, pas une erreur.
    await requete("reasoning_forms", {
      method: "POST",
      body: [versement.forme],
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }
    });

    // On relit pour avoir son identifiant : celui qu'on vient d'écrire, ou celui
    // qui était déjà là. L'insertion ne le rend pas quand elle ignore.
    const empreinte =
      `${versement.forme.entrees.join(" + ")} > ${versement.forme.conclusions.join(" + ")}`;
    const trouvees = await requete("reasoning_forms", {
      params: { select: "id", empreinte: `eq.${empreinte}`, limit: "1" }
    });

    const formeId = trouvees?.[0]?.id;
    if (!formeId) return null;

    const ecrites = await requete("reasoning_form_contributions", {
      method: "POST",
      body: [{ ...versement.signature, form_id: formeId }],
      headers: { Prefer: "return=representation" }
    });

    return ecrites?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Retirer sa signature — la forme, elle, reste versée.
 *
 * On marque, on ne supprime pas : la ligne garde la place, et l'unicité continue
 * d'empêcher un second versement. Un constat ne devient pas faux (règle 6) — ce
 * projet a bien versé cette forme, un jour, et l'a retirée un autre jour.
 */
export async function retirerMaSignature(signatureId, parQui = "") {
  const id = String(signatureId ?? "").trim();
  if (!id) return false;

  try {
    await requete("reasoning_form_contributions", {
      method: "PATCH",
      params: { id: `eq.${id}` },
      body: { retire_le: new Date().toISOString(), retire_par: String(parQui ?? "").trim() || null },
      headers: { Prefer: "return=minimal" }
    });
    return true;
  } catch {
    return false;
  }
}
