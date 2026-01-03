import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
}

const MODEL_BASE_URL = 'https://alphacephei.com/vosk/models/';

// Supported models
const ALLOWED_MODELS = [
  'vosk-model-small-en-us-0.15.zip',
  'vosk-model-en-us-0.22.zip',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url);
    const modelParam = url.searchParams.get('model');
    
    // Default to large model if not specified
    const modelFile = modelParam || 'vosk-model-en-us-0.22.zip';
    
    // Validate model is in allowed list
    if (!ALLOWED_MODELS.includes(modelFile)) {
      return new Response(
        JSON.stringify({ error: 'Invalid model specified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const modelUrl = `${MODEL_BASE_URL}${modelFile}`;
    console.log(`Proxying model: ${modelUrl}`);

    // Forward range header for resumable downloads
    const rangeHeader = req.headers.get('range');
    const fetchHeaders: HeadersInit = {};
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const response = await fetch(modelUrl, {
      headers: fetchHeaders,
    });

    if (!response.ok && response.status !== 206) {
      throw new Error(`Failed to fetch model: ${response.status}`);
    }

    // Stream the response
    const headers = new Headers(corsHeaders);
    
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }
    
    headers.set('Content-Type', 'application/zip');
    
    const contentRange = response.headers.get('content-range');
    if (contentRange) {
      headers.set('Content-Range', contentRange);
    }

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Proxy error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
