import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PredictionRequest {
  videoUrl: string;
}

interface PredictionResponse {
  prediction_score: number;
  confidence: number;
  features_detected: {
    eye_contact_frequency?: number;
    movement_variance?: number;
    repetitive_motion_score?: number;
    social_engagement?: number;
    body_movement_patterns?: number;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { videoUrl }: PredictionRequest = await req.json();

    if (!videoUrl) {
      return new Response(
        JSON.stringify({ error: 'videoUrl is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Processing video prediction for URL: ${videoUrl}`);

    const PYTHON_ML_ENDPOINT = Deno.env.get("PYTHON_ML_ENDPOINT");

    if (!PYTHON_ML_ENDPOINT) {
      console.warn("PYTHON_ML_ENDPOINT environment variable not configured!");
      console.warn("Please set PYTHON_ML_ENDPOINT in Supabase Edge Function environment variables");
      console.warn("Deploy the Python ML service (see python-ml-service/README.md) and set the URL");

      return new Response(
        JSON.stringify({
          error: 'ML service not configured. Please deploy Python backend service.',
          instructions: 'See python-ml-service/README.md for deployment instructions'
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Calling Python ML service at: ${PYTHON_ML_ENDPOINT}`);

    const mlResponse = await fetch(PYTHON_ML_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ video_url: videoUrl }),
      signal: AbortSignal.timeout(120000),
    });

    if (!mlResponse.ok) {
      const errorText = await mlResponse.text();
      console.error(`Python ML service error (${mlResponse.status}): ${errorText}`);
      throw new Error(`ML service returned ${mlResponse.status}: ${errorText}`);
    }

    const prediction: PredictionResponse = await mlResponse.json();

    console.log(`Prediction received: Score=${prediction.prediction_score}, Confidence=${prediction.confidence}`);

    if (typeof prediction.prediction_score !== 'number' ||
        prediction.prediction_score < 0 ||
        prediction.prediction_score > 100) {
      throw new Error('Invalid prediction score received from ML service');
    }

    return new Response(
      JSON.stringify({
        prediction_score: prediction.prediction_score,
        confidence: prediction.confidence || 0.75,
        features_detected: prediction.features_detected || {},
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Error in predict-video function:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('aborted');

    return new Response(
      JSON.stringify({
        error: errorMessage,
        type: isTimeout ? 'timeout' : 'processing_error',
        suggestion: isTimeout
          ? 'Video processing timed out. Try with a shorter video (< 2 minutes)'
          : 'Error processing video. Please try again or contact support.'
      }),
      {
        status: isTimeout ? 504 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
