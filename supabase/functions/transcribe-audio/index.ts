import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
    });
  }

  try {
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }),
        { status: 500, headers: corsHeaders() }
      );
    }

    // Parse the multipart form data to get the audio blob
    const formData = await req.formData();
    const audioFile = formData.get("audio");

    if (!audioFile || !(audioFile instanceof File)) {
      return new Response(
        JSON.stringify({ error: "No audio file provided. Send as multipart/form-data with 'audio' field." }),
        { status: 400, headers: corsHeaders() }
      );
    }

    // Forward to ElevenLabs Speech-to-Text API
    const elevenLabsForm = new FormData();
    elevenLabsForm.append("audio", audioFile, audioFile.name || "recording.webm");
    elevenLabsForm.append("model_id", "scribe_v1");

    const sttResponse = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: elevenLabsForm,
    });

    if (!sttResponse.ok) {
      const errorText = await sttResponse.text();
      console.error("ElevenLabs STT error:", sttResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Transcription failed: ${sttResponse.status}`, details: errorText }),
        { status: 502, headers: corsHeaders() }
      );
    }

    const result = await sttResponse.json();

    return new Response(
      JSON.stringify({
        text: result.text || "",
        language: result.language_code || "unknown",
      }),
      { status: 200, headers: corsHeaders() }
    );
  } catch (err) {
    console.error("transcribe-audio error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: corsHeaders() }
    );
  }
});

function corsHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };
}
