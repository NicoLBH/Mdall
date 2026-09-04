/**
 * Lire une note de calcul de charpente, et n'en rendre que des nombres.
 *
 * ## Pourquoi un modèle, et pourquoi ici
 *
 * Deux notes de calcul ne se ressemblent pas : celle-ci met les descentes en
 * tonnes dans un tableau à deux colonnes par file, la suivante les mettra en
 * daN, en lignes, avec des noms de files différents. Écrire un analyseur par
 * bureau d'études est un travail sans fin ; un analyseur générique se
 * tromperait en silence sur la troisième note.
 *
 * Le modèle lit un tableau comme on le lit. C'est **la seule chose** qu'on lui
 * demande : recopier des nombres et les nommer. Il ne pondère pas, ne combine
 * pas, ne dimensionne pas — tout cela est du calcul, et le calcul appartient à
 * l'utilitaire fondations.
 *
 * ## Le PDF part tel quel, il n'est pas d'abord mis à plat
 *
 * Une extraction de texte rend les nombres dans l'ordre du flux, pas dans
 * l'ordre du tableau : « 0,228 1,709 0,416 4,078 » sans dire quelle valeur va
 * à quelle file. Le modèle, lui, voit les pages. Un tableau lu de travers
 * donnerait des semelles justes pour un poteau et fausses pour son voisin, sans
 * que rien ne le signale.
 *
 * ## Rien n'est écrit
 *
 * Comme le copilote, et pour la même raison : une note déposée pour un essai
 * n'est pas une pièce du projet. Cette fonction n'a aucune table, aucun
 * `insert`, aucun client de service. Le fichier arrive, il est lu, il repart en
 * nombres. Les journaux comptent des octets, ils ne recopient rien.
 *
 * ## Le schéma vient du navigateur, et c'est voulu
 *
 * La forme attendue est déclarée dans `note-de-calcul.js`, à côté de la
 * correspondance des cas de charge et des tests qui la relisent. L'envoyer avec
 * la demande évite de l'écrire deux fois — « une valeur écrite à deux endroits
 * finit par diverger », et un schéma qui diverge fait entrer dans le calcul des
 * champs que personne n'attend. La fonction vérifie qu'il a bien la forme d'un
 * schéma d'objet, et refuse le reste.
 */

import { requireUser } from "../_shared/require-user.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin"
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const openAiApiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
const MODEL = "gpt-4.1-mini";

/**
 * Ce qu'on accepte de lire.
 *
 * Huit mégaoctets en base64 font six mégaoctets de PDF : une note de calcul de
 * charpente en pèse quelques centaines de kilo-octets. Le plafond n'est pas une
 * politesse — sans lui, un fichier de deux cents pages occuperait la fonction
 * et le modèle pendant que les autres attendent.
 */
const TAILLE_MAX = 8 * 1024 * 1024;
const CONSIGNE_MAX = 8_000;

function json(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status, headers: jsonHeaders });
}

function texte(valeur: unknown) {
  return typeof valeur === "string" ? valeur.trim() : "";
}

/** Le schéma reçu a-t-il la forme d'un schéma d'objet fermé ? */
function schemaAcceptable(schema: unknown) {
  const s = schema as Record<string, unknown> | null;
  return Boolean(s) && s!.type === "object" && typeof s!.properties === "object";
}

/**
 * Le texte que le modèle a rendu, quelle que soit la forme de l'enveloppe.
 *
 * L'API des réponses range le contenu dans un tableau de messages ; les
 * anciennes formes restent acceptées pour qu'un changement de format ne rende
 * pas une extraction vide sans rien dire.
 */
function lireLeTexte(brut: unknown): string {
  const payload = brut as Record<string, unknown>;
  if (typeof payload?.output_text === "string") return payload.output_text;

  const morceaux: string[] = [];
  for (const item of (payload?.output as unknown[]) ?? []) {
    const contenu = (item as Record<string, unknown>)?.content as unknown[] | undefined;
    for (const part of contenu ?? []) {
      const t = (part as Record<string, unknown>)?.text;
      if (typeof t === "string") morceaux.push(t);
    }
  }
  return morceaux.join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);

  // Qui appelle ? Le portail ne le vérifie pas — il rejetterait le préflight du
  // navigateur, qui arrive sans autorisation. La porte est donc ici.
  const garde = await requireUser(req, corsHeaders);
  if ("response" in garde) return garde.response;

  if (!openAiApiKey) {
    console.error("extraire-note-de-calcul:no-key");
    return json({ error: "La lecture de notes n'est pas configurée sur ce serveur." }, 503);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Corps de requête illisible." }, 400);
  }

  const fichier = payload?.fichier as Record<string, unknown> | undefined;
  const donnees = texte(fichier?.donnees);
  const nom = texte(fichier?.nom) || "note.pdf";
  const mediaType = texte(fichier?.mediaType) || "application/pdf";

  if (!donnees) return json({ error: "Aucun fichier à lire." }, 400);
  if (donnees.length > TAILLE_MAX) {
    return json({ error: "Le fichier dépasse ce que la lecture accepte (6 Mo environ)." }, 413);
  }
  if (mediaType !== "application/pdf") {
    return json({ error: "Seuls les PDF se lisent pour le moment." }, 415);
  }

  const schema = payload?.schema;
  if (!schemaAcceptable(schema)) {
    return json({ error: "La forme attendue de l'extraction n'a pas été fournie." }, 400);
  }
  const consigne = texte(payload?.consigne).slice(0, CONSIGNE_MAX);
  if (!consigne) return json({ error: "La consigne de lecture n'a pas été fournie." }, 400);

  // On compte, on ne recopie pas : ni le nom de l'affaire, ni les valeurs.
  console.log("extraire-note-de-calcul:request", {
    model: MODEL,
    fichier_octets: Math.round(donnees.length * 0.75),
    consigne_chars: consigne.length
  });

  try {
    const reponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openAiApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        instructions: consigne,
        input: [{
          role: "user",
          content: [
            { type: "input_file", filename: nom, file_data: `data:${mediaType};base64,${donnees}` },
            { type: "input_text", text: "Extrais les descentes de charges aux appuis de cette note." }
          ]
        }],
        // Le format est imposé, pas suggéré : un modèle à qui l'on demande « du
        // JSON » rend du JSON différent à chaque fois, et ce qui n'entre pas
        // dans le schéma n'entre pas dans le calcul.
        text: { format: { type: "json_schema", name: "note_de_calcul", strict: true, schema } }
      })
    });

    if (!reponse.ok) {
      const details = await reponse.text().catch(() => "");
      console.error("extraire-note-de-calcul:model-error", { status: reponse.status, details_chars: details.length });
      return json({ error: `La lecture de la note a échoué (${reponse.status}).` }, 502);
    }

    const brut = await reponse.json();
    const contenu = lireLeTexte(brut).trim();
    if (!contenu) return json({ error: "La note a été lue, mais rien n'en est revenu." }, 502);

    let note: unknown;
    try {
      note = JSON.parse(contenu);
    } catch {
      console.error("extraire-note-de-calcul:bad-json", { chars: contenu.length });
      return json({ error: "La lecture n'a pas rendu une extraction exploitable." }, 502);
    }

    const usage = (brut as Record<string, unknown>)?.usage as Record<string, unknown> | undefined;
    console.log("extraire-note-de-calcul:done", {
      appuis: Array.isArray((note as Record<string, unknown>)?.appuis)
        ? ((note as Record<string, unknown>).appuis as unknown[]).length : 0,
      input_tokens: usage?.input_tokens ?? null,
      output_tokens: usage?.output_tokens ?? null
    });

    // Rien n'est enregistré : ni le fichier, ni ce qu'on y a lu.
    return json({ note, usage: usage ?? null });
  } catch (error) {
    console.error("extraire-note-de-calcul:failed", {
      message: error instanceof Error ? error.message : "unknown"
    });
    return json({ error: "La lecture de la note est momentanément indisponible." }, 502);
  }
});
