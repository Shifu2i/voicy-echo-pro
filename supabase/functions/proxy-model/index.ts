import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with the user's auth context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validate the JWT token and get user claims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('JWT validation failed:', claimsError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log('Authenticated user for model proxy:', userId);

    const url = new URL(req.url);
    const modelParam = url.searchParams.get('model');
    
    // Default to large model if not specified
    const modelFile = modelParam || 'vosk-model-en-us-0.22.zip';
    
    // Validate model is in allowed list
    if (!ALLOWED_MODELS.includes(modelFile)) {
      console.error('Invalid model requested:', modelFile);
      return new Response(
        JSON.stringify({ error: 'Invalid model specified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const modelUrl = `${MODEL_BASE_URL}${modelFile}`;
    console.log(`Proxying model for user ${userId}: ${modelUrl}`);

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
