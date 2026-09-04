/**
 * Exécuter un utilitaire de l'Atelier, sous l'identité de qui le demande.
 *
 * ## Pourquoi l'orchestration est ici, et plus dans le navigateur
 *
 * Elle y était : le catalogue des utilitaires, les phrases qui décident quand
 * le modèle appelle quoi, l'enchaînement d'un utilitaire à l'autre, la recherche
 * déterministe des cotes, la correspondance des cas de charge, la consigne de
 * lecture d'une note. Mille sept cents lignes servies telles quelles, lisibles
 * avec F12.
 *
 * Le moteur de calcul, lui, était déjà au serveur. C'est-à-dire qu'on protégeait
 * l'arithmétique et qu'on publiait la méthode — l'inverse de ce qui a de la
 * valeur. Un concurrent n'a pas besoin de nos 388 combinaisons : il a
 * l'Eurocode. Ce qu'il n'a pas, c'est la façon dont un utilitaire s'appelle, ce
 * qu'on refuse de laisser inventer au modèle, et l'ordre dans lequel on
 * rattrape ce qui manque.
 *
 * ## Ce que le navigateur garde, et pourquoi ce n'est pas un aveu
 *
 * Le formulaire qui demande une valeur manquante est construit depuis ce que
 * **cette réponse** contient — un intitulé, une unité, une aide, des choix. Ce
 * sont les mots qu'on lit à l'écran de toute façon. Le catalogue qui les
 * produit, lui, ne descend jamais.
 *
 * ## Rien n'est écrit
 *
 * Comme le copilote : un utilitaire explore, il ne décide pas. Cette fonction
 * n'a aucune table, aucun `insert`, aucun client de service. Les journaux
 * comptent, ils ne recopient pas.
 */

import { requireUser } from "../_shared/require-user.ts";
import { executerOutil, sansFigure } from "../_shared/utilitaires/catalogue.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, Authorization, x-client-info, apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin"
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const openAiApiKey = Deno.env.get("OPENAI_API_KEY") ?? "";

/**
 * Ce qu'un appel accepte de porter.
 *
 * Une note de calcul en base64 pèse quelques centaines de kilo-octets ; le
 * plafond laisse passer six mégaoctets de PDF et refuse le reste. Sans lui, un
 * envoi de deux cents pages occuperait la fonction pendant que les autres
 * attendent.
 */
const CORPS_MAX = 12 * 1024 * 1024;

function json(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status, headers: jsonHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);

  // Qui appelle ? Le portail ne le vérifie pas — il rejetterait le préflight du
  // navigateur, qui arrive sans autorisation. La porte est donc ici.
  const garde = await requireUser(req, corsHeaders);
  if ("response" in garde) return garde.response;

  const brut = await req.text().catch(() => "");
  if (brut.length > CORPS_MAX) {
    return json({ error: "La demande dépasse ce que l'utilitaire accepte." }, 413);
  }

  let charge: Record<string, unknown>;
  try {
    charge = JSON.parse(brut || "{}");
  } catch {
    return json({ error: "Corps de requête illisible." }, 400);
  }

  const id = String(charge?.id ?? "");
  console.log("executer-utilitaire:request", {
    outil: id,
    entrees: Object.keys((charge?.entrees as Record<string, unknown>) ?? {}).length,
    pieces: Array.isArray(charge?.piecesJointes) ? charge.piecesJointes.length : 0
  });

  const entrees = {
    id,
    entrees: charge?.entrees ?? {},
    assertions: charge?.assertions ?? [],
    question: String(charge?.question ?? ""),
    confirmees: charge?.confirmees ?? [],
    piecesJointes: charge?.piecesJointes ?? [],
    acquises: charge?.acquises ?? {},
    // La clé du modèle sert à lire une note de calcul jointe. Elle ne quitte
    // jamais le serveur — c'était déjà vrai, et c'est ce qui ne change pas.
    cleDuModele: openAiApiKey,
    // Les moteurs de calcul sont des fonctions voisines : ils s'appellent
    // sous **l'identité de qui demande**. L'orchestration n'a pas d'identité
    // propre et ne doit pas en avoir — un calcul lancé pour quelqu'un se fait
    // avec ses droits, pas avec les nôtres.
    autorisation: req.headers.get("Authorization") ?? ""
  };

  // ------------------------------------------------------------------ //
  // Deux formes de réponse, et l'appelant choisit.
  //
  // Une fonction se déploie en secondes, la page en minutes : pendant cet
  // écart, l'ancienne page parle à la nouvelle fonction. Une réponse en flux
  // servie à un navigateur qui attend un objet JSON entier, c'est un
  // « L'utilitaire a répondu, mais sans résultat » pour tout le monde, le temps
  // que la publication se termine. Le navigateur dit donc ce qu'il sait lire,
  // et l'ancien continue d'être servi comme avant.
  // ------------------------------------------------------------------ //
  const veutLeFlux = (req.headers.get("Accept") ?? "").includes("ndjson");

  if (!veutLeFlux) {
    try {
      const etapes: Array<{ texte: string; detail: string }> = [];
      const resultat = await executerOutil({
        ...entrees,
        onEtape: (dit: { texte: string; detail: string }) => etapes.push(dit)
      });
      console.log("executer-utilitaire:done", { outil: id, statut: resultat?.statut, etapes: etapes.length });
      return json({ resultat, etapes, pourLeModele: sansFigure(resultat) });
    } catch (erreur) {
      console.error("executer-utilitaire:failed", {
        outil: id,
        message: erreur instanceof Error ? erreur.message : "unknown"
      });
      return json({ error: "L'utilitaire n'a pas pu être exécuté." }, 502);
    }
  }

  // ------------------------------------------------------------------ //
  // La réponse part en flux : une ligne JSON par étape, puis le résultat.
  //
  // Elle partait entière, les étapes rassemblées dans un tableau, et l'écran
  // les rejouait à l'arrivée. Une recherche de semelles dure huit secondes :
  // treize lignes de travail apparaissaient alors en même temps que leur
  // conclusion, ce qui ne raconte plus le travail — cela le résume une fois
  // qu'il n'intéresse plus personne.
  //
  // Le prix de ce choix est qu'un échec survenu **après** la première ligne ne
  // peut plus prendre la forme d'un code HTTP : l'en-tête est parti. Il prend
  // donc la forme d'une ligne `{erreur}`, et l'appelant la traite comme un
  // refus. Ce qui échoue avant — le portail, un corps illisible, une demande
  // trop lourde — répond en JSON ordinaire, avec son code.
  // ------------------------------------------------------------------ //
  const encodeur = new TextEncoder();
  let comptees = 0;

  const flux = new ReadableStream({
    async start(controle) {
      const ecrire = (objet: unknown) => {
        try {
          controle.enqueue(encodeur.encode(`${JSON.stringify(objet)}\n`));
        } catch {
          // Le navigateur a coupé : le calcul finit, mais plus personne ne lit.
        }
      };

      try {
        const resultat = await executerOutil({
          ...entrees,
          onEtape: (dit: { texte: string; detail: string }) => { comptees += 1; ecrire({ etape: dit }); }
        });

        console.log("executer-utilitaire:done", { outil: id, statut: resultat?.statut, etapes: comptees });

        ecrire({
          fin: {
            resultat,
            // Ce que le modèle recevra : allégé des figures et du détail des massifs,
            // par la même fonction qui le fait depuis le début. Le navigateur ne
            // l'assemble plus — il ne connaît plus les utilitaires.
            pourLeModele: sansFigure(resultat)
          }
        });
      } catch (erreur) {
        console.error("executer-utilitaire:failed", {
          outil: id,
          message: erreur instanceof Error ? erreur.message : "unknown"
        });
        ecrire({ erreur: "L'utilitaire n'a pas pu être exécuté." });
      } finally {
        controle.close();
      }
    }
  });

  return new Response(flux, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      // Sans cela, un intermédiaire qui tamponne rendrait le flux d'un bloc :
      // on aurait payé le protocole sans gagner l'affichage.
      "X-Accel-Buffering": "no"
    }
  });
});
