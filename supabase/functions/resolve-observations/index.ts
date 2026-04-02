import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openAiApiKey = Deno.env.get("OPENAI_API_KEY")!;
const defaultSubjectType = "missing_or_inconsistency";

console.log("Env check", {
  hasSupabaseUrl: !!supabaseUrl,
  hasServiceKey: !!supabaseServiceKey,
  hasOpenAiApiKey: !!openAiApiKey
});

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const body = await req.json().catch(() => null);

    if (!body?.analysis_run_id) {
      return json({ error: "analysis_run_id required" }, 400);
    }

    const analysisRunId = body.analysis_run_id;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: observations, error: observationsError } = await supabase
      .from("subject_observations")
      .select("*")
      .eq("analysis_run_id", analysisRunId)
      .eq("resolution_status", "pending");

    if (observationsError) {
      return json(
        { error: "Failed to load observations", details: observationsError.message },
        500
      );
    }

    if (!observations || observations.length === 0) {
      return json({
        success: true,
        message: "no observations",
        resolved: 0
      });
    }

    let resolvedCount = 0;
    const errors: Array<{ observation_id: string; error: string }> = [];

    for (const obs of observations) {
      try {
        const openCandidates = await callRPC(supabase, "find_open_subject_candidates", {
          p_project_id: obs.project_id,
          p_query_title: obs.title,
          p_limit: 5
        });

        const closedCandidates = await callRPC(supabase, "find_closed_subject_candidates", {
          p_project_id: obs.project_id,
          p_query_title: obs.title,
          p_limit: 5
        });

        const parentCandidates = await callRPC(supabase, "find_parent_subject_candidates", {
          p_project_id: obs.project_id,
          p_query_title: obs.title,
          p_limit: 5
        });

        const situations = await callRPC(supabase, "find_situation_candidates", {
          p_project_id: obs.project_id,
          p_query_text: `${obs.title ?? ""}\n${obs.description ?? ""}`,
          p_limit: 5
        });

        const prompt = buildPrompt(
          obs,
          openCandidates,
          closedCandidates,
          parentCandidates,
          situations
        );

        const decision = await callLLM(prompt);

        if (!decision) {
          errors.push({
            observation_id: obs.id,
            error: "LLM returned null or invalid JSON"
          });
          continue;
        }

        const validationError = validateDecision(decision);
        if (validationError) {
          errors.push({
            observation_id: obs.id,
            error: validationError
          });
          continue;
        }

        console.log("LLM decision", {
          observation_id: obs.id,
          decision
        });

        await applyDecision(supabase, obs, decision);

        resolvedCount++;
      } catch (e) {
        console.error("resolve-observations item error", {
          observation_id: obs.id,
          error: serializeError(e)
        });

        errors.push({
          observation_id: obs.id,
          error: serializeError(e)
        });
      }
    }

    return json({
      success: true,
      resolved: resolvedCount,
      total: observations.length,
      errors
    });
  } catch (e) {
    console.error("resolve-observations fatal error", serializeError(e));
    return json({ error: serializeError(e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

async function callRPC(supabase: any, name: string, params: any) {
  const { data, error } = await supabase.rpc(name, params);

  if (error) {
    console.error(`RPC ${name} failed:`, error.message);
    return [];
  }

  return data ?? [];
}

async function callLLM(prompt: string) {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: prompt
    })
  });

  const rawText = await res.text();

  if (!res.ok) {
    throw new Error(`OpenAI error ${res.status}: ${rawText}`);
  }

  let payload: any;
  try {
    payload = JSON.parse(rawText);
  } catch {
    throw new Error(`OpenAI returned non-JSON response: ${rawText}`);
  }

  const text =
    payload?.output?.[0]?.content?.[0]?.text ??
    payload?.output_text ??
    null;

  if (!text) {
    console.error("LLM payload without text", payload);
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    console.error("LLM returned invalid decision JSON", { text, payload });
    return null;
  }
}

function validateDecision(decision: any): string | null {
  const allowed = [
    "attach_to_open_subject",
    "reopen_closed_subject",
    "create_child_subject",
    "mark_duplicate_of_existing_subject",
    "create_new_subject"
  ];

  if (!decision?.decision || !allowed.includes(decision.decision)) {
    return "Invalid decision";
  }

  if (
    ["attach_to_open_subject", "reopen_closed_subject", "mark_duplicate_of_existing_subject"].includes(
      decision.decision
    ) &&
    !decision.target_subject_id
  ) {
    return "target_subject_id required for this decision";
  }

  if (decision.decision === "create_child_subject" && !decision.parent_subject_id) {
    return "parent_subject_id required for create_child_subject";
  }

  if (decision.decision !== "create_new_subject" && !decision.evidence_role) {
    return "evidence_role required unless create_new_subject";
  }

  return null;
}

function buildPrompt(
  obs: any,
  openCandidates: any[],
  closedCandidates: any[],
  parentCandidates: any[],
  situations: any[]
) {
  return `
Tu es un moteur de résolution d'observations projet.

Ta mission :
Pour cette observation, tu dois décider UNE SEULE action.

Ordre de priorité OBLIGATOIRE :
1. attach_to_open_subject
2. reopen_closed_subject
3. create_child_subject
4. mark_duplicate_of_existing_subject
5. create_new_subject

Observation :
${JSON.stringify(
  {
    id: obs.id,
    project_id: obs.project_id,
    document_id: obs.document_id,
    title: obs.title,
    description: obs.description,
    priority: obs.priority
  },
  null,
  2
)}

Sujets ouverts candidats :
${JSON.stringify(openCandidates, null, 2)}

Sujets fermés candidats :
${JSON.stringify(closedCandidates, null, 2)}

Parents possibles :
${JSON.stringify(parentCandidates, null, 2)}

Situations candidates :
${JSON.stringify(situations, null, 2)}

Tu dois répondre STRICTEMENT dans ce format JSON :
{
  "decision": "attach_to_open_subject",
  "target_subject_id": "uuid ou null",
  "parent_subject_id": "uuid ou null",
  "situation_id": "uuid ou null",
  "links": [
    {
      "target_subject_id": "uuid",
      "link_type": "blocked_by"
    }
  ],
  "evidence_role": "confirming",
  "explanation": "texte explicatif",
  "confidence": 0.87
}

Contraintes :
- decision obligatoire
- target_subject_id obligatoire si attach / reopen / duplicate
- parent_subject_id seulement si create_child_subject
- links optionnel
- evidence_role obligatoire sauf si create_new_subject
- réponse JSON uniquement
- aucun markdown
- aucune explication hors JSON
`;
}

function getObservationCurrentTitle(obs: any): string {
  return String(obs?.title ?? "").trim();
}

function getObservationCurrentDescription(obs: any): string | null {
  const value = String(obs?.description ?? "").trim();
  return value.length > 0 ? value : null;
}

async function applyDecision(supabase: any, obs: any, decision: any) {
  console.log("Applying decision", {
    observation_id: obs.id,
    decision_type: decision.decision,
    target_subject_id: decision.target_subject_id ?? null,
    parent_subject_id: decision.parent_subject_id ?? null
  });

  switch (decision.decision) {
    case "attach_to_open_subject": {
      await attachEvidence(supabase, obs, decision.target_subject_id, decision);

      await insertSubjectHistory(supabase, {
        project_id: obs.project_id,
        subject_id: decision.target_subject_id,
        analysis_run_id: obs.analysis_run_id ?? null,
        document_id: obs.document_id ?? null,
        subject_observation_id: obs.id,
        event_type: "subject_enriched",
        actor_type: "workflow",
        actor_label: "resolve-observations",
        title: "Sujet enrichi par une nouvelle observation",
        description:
          "Une nouvelle observation a été rattachée à un sujet existant jugé suffisamment proche.",
        event_payload: {
          decision: decision.decision,
          observation_id: obs.id,
          observation_title: obs.title,
          observation_description: obs.description ?? null,
          matched_subject_id: decision.target_subject_id,
          evidence_role: decision.evidence_role ?? "confirming",
          explanation: decision.explanation ?? null,
          confidence: decision.confidence ?? null
        }
      });

      await insertLinksIfAny(supabase, obs, decision, decision.target_subject_id);
      await markObservationResolved(supabase, obs.id, decision.target_subject_id);
      return;
    }

    case "reopen_closed_subject": {
      const { error } = await supabase
        .from("subjects")
        .update({
          status: "open",
          closed_at: null
        })
        .eq("id", decision.target_subject_id);

      if (error) throw error;

      await attachEvidence(supabase, obs, decision.target_subject_id, {
        ...decision,
        evidence_role: "reopen_signal"
      });

      await insertSubjectHistory(supabase, {
        project_id: obs.project_id,
        subject_id: decision.target_subject_id,
        analysis_run_id: obs.analysis_run_id ?? null,
        document_id: obs.document_id ?? null,
        subject_observation_id: obs.id,
        event_type: "subject_reopened",
        actor_type: "workflow",
        actor_label: "resolve-observations",
        title: "Sujet rouvert",
        description:
          "Le sujet existant a été rouvert car une nouvelle observation indique qu’il redevient actif.",
        event_payload: {
          decision: decision.decision,
          observation_id: obs.id,
          observation_title: obs.title,
          target_subject_id: decision.target_subject_id,
          previous_status: "closed",
          new_status: "open",
          evidence_role: "reopen_signal",
          explanation: decision.explanation ?? null,
          confidence: decision.confidence ?? null
        }
      });

      await insertLinksIfAny(supabase, obs, decision, decision.target_subject_id);
      await markObservationResolved(supabase, obs.id, decision.target_subject_id);
      return;
    }

    case "create_new_subject": {
      if (!obs.document_id) {
        throw new Error(`Observation ${obs.id} has no document_id`);
      }

      if (!obs.analysis_run_id) {
        throw new Error(`Observation ${obs.id} has no analysis_run_id`);
      }

      const subjectCurrentTitle = getObservationCurrentTitle(obs);
      const subjectCurrentDescription = getObservationCurrentDescription(obs);

      const { data: newSubject, error } = await supabase
        .from("subjects")
        .insert({
          project_id: obs.project_id,
          document_id: obs.document_id,
          analysis_run_id: obs.analysis_run_id,
          subject_type: defaultSubjectType,
      
          // Compatibilité temporaire uniquement
          title: subjectCurrentTitle,
          description: subjectCurrentDescription,
      
          // Champs métier officiels
          current_title: subjectCurrentTitle,
          current_description: subjectCurrentDescription,
      
          status: "open",
          priority: obs.priority ?? "medium",
          situation_id: decision.situation_id ?? null
        })
        .select()
        .single();

      if (error) throw error;

      await attachEvidence(supabase, obs, newSubject.id, {
        ...decision,
        evidence_role: "origin"
      });

      await insertSubjectHistory(supabase, {
        project_id: obs.project_id,
        subject_id: newSubject.id,
        analysis_run_id: obs.analysis_run_id,
        document_id: obs.document_id,
        subject_observation_id: obs.id,
        event_type: "subject_created",
        actor_type: "workflow",
        actor_label: "resolve-observations",
        title: "Sujet créé",
        description:
          "Le système a créé un nouveau sujet à partir de l’observation détectée dans le document analysé.",
        event_payload: {
          decision: decision.decision,
          observation_id: obs.id,
          observation_title: obs.title,
          observation_description: obs.description ?? null,
          created_subject_id: newSubject.id,
          initial_status: "open",
          initial_priority: obs.priority ?? "medium",
          initial_subject_type: defaultSubjectType,
          situation_id: decision.situation_id ?? null,
          explanation: decision.explanation ?? null,
          confidence: decision.confidence ?? null
        }
      });

      await insertLinksIfAny(supabase, obs, decision, newSubject.id);
      await markObservationResolved(supabase, obs.id, newSubject.id);
      return;
    }

    case "create_child_subject": {
      if (!obs.document_id) {
        throw new Error(`Observation ${obs.id} has no document_id`);
      }

      if (!obs.analysis_run_id) {
        throw new Error(`Observation ${obs.id} has no analysis_run_id`);
      }

      const childCurrentTitle = getObservationCurrentTitle(obs);
      const childCurrentDescription = getObservationCurrentDescription(obs);
      
      const { data: childSubject, error } = await supabase
        .from("subjects")
        .insert({
          project_id: obs.project_id,
          document_id: obs.document_id,
          analysis_run_id: obs.analysis_run_id,
          subject_type: defaultSubjectType,
      
          // Compatibilité temporaire uniquement
          title: childCurrentTitle,
          description: childCurrentDescription,
      
          // Champs métier officiels
          current_title: childCurrentTitle,
          current_description: childCurrentDescription,
      
          parent_subject_id: decision.parent_subject_id,
          situation_id: decision.situation_id ?? null,
          status: "open",
          priority: obs.priority ?? "medium"
        })
        .select()
        .single();

      if (error) throw error;

      await attachEvidence(supabase, obs, childSubject.id, {
        ...decision,
        evidence_role: decision.evidence_role ?? "origin"
      });

      await insertSubjectHistory(supabase, {
        project_id: obs.project_id,
        subject_id: childSubject.id,
        analysis_run_id: obs.analysis_run_id,
        document_id: obs.document_id,
        subject_observation_id: obs.id,
        event_type: "subject_child_created",
        actor_type: "workflow",
        actor_label: "resolve-observations",
        title: "Sous-sujet créé",
        description:
          "Un sous-sujet a été créé et rattaché à un sujet parent existant.",
        event_payload: {
          decision: decision.decision,
          observation_id: obs.id,
          observation_title: obs.title,
          created_subject_id: childSubject.id,
          parent_subject_id: decision.parent_subject_id,
          situation_id: decision.situation_id ?? null,
          initial_status: "open",
          initial_priority: obs.priority ?? "medium",
          initial_subject_type: defaultSubjectType,
          evidence_role: decision.evidence_role ?? "origin",
          explanation: decision.explanation ?? null,
          confidence: decision.confidence ?? null
        }
      });

      await insertLinksIfAny(supabase, obs, decision, childSubject.id);
      await markObservationResolved(supabase, obs.id, childSubject.id);
      return;
    }

    case "mark_duplicate_of_existing_subject": {
      await attachEvidence(supabase, obs, decision.target_subject_id, {
        ...decision,
        evidence_role: decision.evidence_role ?? "duplicate_signal"
      });

      await insertSubjectHistory(supabase, {
        project_id: obs.project_id,
        subject_id: decision.target_subject_id,
        analysis_run_id: obs.analysis_run_id ?? null,
        document_id: obs.document_id ?? null,
        subject_observation_id: obs.id,
        event_type: "subject_marked_duplicate",
        actor_type: "workflow",
        actor_label: "resolve-observations",
        title: "Observation rattachée à un sujet existant considéré comme principal",
        description:
          "L’observation a été considérée comme un doublon logique et rattachée à un sujet principal existant.",
        event_payload: {
          decision: decision.decision,
          observation_id: obs.id,
          observation_title: obs.title,
          canonical_subject_id: decision.target_subject_id,
          evidence_role: decision.evidence_role ?? "duplicate_signal",
          explanation: decision.explanation ?? null,
          confidence: decision.confidence ?? null
        }
      });

      await markObservationResolved(supabase, obs.id, decision.target_subject_id);
      return;
    }

    default:
      throw new Error(`Unsupported decision: ${decision.decision}`);
  }
}

async function attachEvidence(supabase: any, obs: any, subjectId: string, decision: any) {
  const { error } = await supabase.from("subject_evidence").insert({
    project_id: obs.project_id,
    subject_id: subjectId,
    subject_observation_id: obs.id,
    evidence_role: decision.evidence_role ?? "confirming",
    summary: decision.explanation ?? null
  });

  if (error) throw error;
}

async function insertSubjectHistory(
  supabase: any,
  input: {
    project_id: string;
    subject_id: string;
    analysis_run_id?: string | null;
    document_id?: string | null;
    subject_observation_id?: string | null;
    event_type: string;
    actor_type?: string;
    actor_label?: string | null;
    title: string;
    description?: string | null;
    event_payload?: any;
  }
) {
  const row = {
    project_id: input.project_id,
    subject_id: input.subject_id,
    analysis_run_id: input.analysis_run_id ?? null,
    document_id: input.document_id ?? null,
    subject_observation_id: input.subject_observation_id ?? null,
    event_type: input.event_type,
    actor_type: input.actor_type ?? "workflow",
    actor_label: input.actor_label ?? "resolve-observations",
    title: input.title,
    description: input.description ?? null,
    event_payload: input.event_payload ?? {}
  };

  const { error } = await supabase.from("subject_history").insert(row);

  if (error) throw error;
}

async function markObservationResolved(
  supabase: any,
  observationId: string,
  subjectId: string | null
) {
  const { error } = await supabase
    .from("subject_observations")
    .update({
      resolution_status: "resolved",
      resolved_subject_id: subjectId
    })
    .eq("id", observationId);

  if (error) throw error;
}

async function insertLinksIfAny(
  supabase: any,
  obs: any,
  decision: any,
  sourceSubjectId: string
) {
  if (!Array.isArray(decision.links) || decision.links.length === 0) {
    return;
  }

  for (const link of decision.links) {
    if (!link?.target_subject_id || !link?.link_type) continue;

    await insertSubjectLink(supabase, {
      project_id: obs.project_id,
      source_subject_id: sourceSubjectId,
      target_subject_id: link.target_subject_id,
      link_type: link.link_type
    });

    await insertLinkHistory(supabase, obs, sourceSubjectId, link);
  }
}

async function insertLinkHistory(
  supabase: any,
  obs: any,
  sourceSubjectId: string,
  link: any
) {
  await insertSubjectHistory(supabase, {
    project_id: obs.project_id,
    subject_id: sourceSubjectId,
    analysis_run_id: obs.analysis_run_id ?? null,
    document_id: obs.document_id ?? null,
    subject_observation_id: obs.id,
    event_type: "subject_link_created",
    actor_type: "workflow",
    actor_label: "resolve-observations",
    title: "Lien entre sujets créé",
    description: "Un lien métier a été créé entre ce sujet et un autre sujet.",
    event_payload: {
      link_type: link.link_type,
      source_subject_id: sourceSubjectId,
      target_subject_id: link.target_subject_id,
      observation_id: obs.id
    }
  });
}

async function insertSubjectLink(supabase: any, row: any) {
  const { error } = await supabase.from("subject_links").insert(row);
  if (error) throw error;
}

function serializeError(e: any): string {
  if (!e) return "Unknown error";

  if (typeof e === "string") return e;

  if (e instanceof Error) {
    return `${e.name}: ${e.message}${e.stack ? "\n" + e.stack : ""}`;
  }

  if (typeof e === "object") {
    try {
      return JSON.stringify(e, null, 2);
    } catch {
      return Object.prototype.toString.call(e);
    }
  }

  return String(e);
}
