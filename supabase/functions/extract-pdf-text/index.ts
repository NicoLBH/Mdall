import { createClient } from 'npm:@supabase/supabase-js@2'
import { extractText, getDocumentProxy } from 'npm:unpdf'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, Authorization, x-client-info, apikey, content-type, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
}

const jsonHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  let runId: string | null = null

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        {
          status: 405,
          headers: jsonHeaders,
        }
      )
    }

    const body = await req.json()
    runId = body?.run_id ?? null

    if (!runId) {
      return new Response(
        JSON.stringify({ error: 'Missing run_id' }),
        {
          status: 400,
          headers: jsonHeaders,
        }
      )
    }

    // 1) Charger le run
    const { data: run, error: runError } = await supabase
      .from('analysis_runs')
      .select('id, project_id, document_id, status')
      .eq('id', runId)
      .single()

    if (runError || !run) {
      return new Response(
        JSON.stringify({ error: 'Run not found', details: runError }),
        {
          status: 404,
          headers: jsonHeaders,
        }
      )
    }

    // 2) Passer le run à running
    const { error: updateRunningError } = await supabase
      .from('analysis_runs')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        finished_at: null,
        error_message: null,
      })
      .eq('id', runId)

    if (updateRunningError) {
      throw updateRunningError
    }

    // 3) Charger le document
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('id, filename, original_filename, storage_bucket, storage_path, mime_type')
      .eq('id', run.document_id)
      .single()

    if (documentError || !document) {
      throw new Error('Document not found for this run')
    }

    // 4) Télécharger le PDF
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from(document.storage_bucket)
      .download(document.storage_path)

    if (downloadError || !fileData) {
      throw new Error(`Storage download failed: ${downloadError?.message ?? 'unknown error'}`)
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const pdfBytes = new Uint8Array(arrayBuffer)

    // 5) Extraire le texte
    const pdf = await getDocumentProxy(pdfBytes)
    const { totalPages, text } = await extractText(pdf, { mergePages: true })

    const extractedText = (text || '').trim()

    if (!extractedText) {
      throw new Error('PDF parsed but no text was extracted')
    }

    // 6) Mettre à jour le document
    const { error: documentUpdateError } = await supabase
      .from('documents')
      .update({
        page_count: totalPages,
        updated_at: new Date().toISOString(),
      })
      .eq('id', document.id)

    if (documentUpdateError) {
      throw documentUpdateError
    }

    // 7) Mettre à jour le run
    const { error: runUpdateError } = await supabase
      .from('analysis_runs')
      .update({
        status: 'running',
        finished_at: null,
        raw_text: extractedText,
        normalized_text_json: {
          stage: 'pdf_text_extraction',
          document_id: document.id,
          page_count: totalPages,
          extracted_char_count: extractedText.length,
        },
        structured_output_json: {
          result: 'ok',
          stage: 'pdf_text_extraction',
          page_count: totalPages,
          extracted_char_count: extractedText.length,
          next_step: 'generate_observations',
        },
      })
      .eq('id', runId)

    if (runUpdateError) {
      throw runUpdateError
    }

    return new Response(
      JSON.stringify({
        ok: true,
        run_id: runId,
        page_count: totalPages,
        extracted_char_count: extractedText.length,
      }),
      {
        status: 200,
        headers: jsonHeaders,
      }
    )
  } catch (error) {
    if (runId) {
      await supabase
        .from('analysis_runs')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : String(error),
        })
        .eq('id', runId)
    }

    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: jsonHeaders,
      }
    )
  }
})
