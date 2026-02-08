import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const OLLAMA_URL = Deno.env.get("OLLAMA_BASE_URL") || "http://172.29.96.1:11434";
const KIMI_KEY = Deno.env.get("KIMI_API_KEY") || "";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const {
      message_id, room_id, sender_name, content, content_type, audio_url,
      action, target_agents,
    } = body;

    // ---- ACTION: full_response (frontend requests specific agent responses) ----
    if (action === "full_response") {
      return await handleFullResponse(room_id, content, target_agents || []);
    }

    // ---- DEFAULT: triggered by DB webhook on human message ----

    // Step 1: If voice message, transcribe first
    let messageText = content;
    if (content_type === "voice" && audio_url) {
      messageText = await transcribeVoice(audio_url);
      await supabase
        .from("war_room_messages")
        .update({ content: messageText, metadata: { original_type: "voice" } })
        .eq("id", message_id);
    }

    // Step 2: Get room config and participants
    const { data: participants } = await supabase
      .from("war_room_participants")
      .select("*")
      .eq("room_id", room_id)
      .eq("is_active", true);

    const agentParticipants = participants?.filter(p => p.participant_type === "agent") || [];

    if (agentParticipants.length === 0) {
      return json({ status: "no_agents" });
    }

    // Step 3: Check for @mentions — direct response (skip hand-raise)
    const mentioned = agentParticipants
      .filter(a => messageText.toLowerCase().includes(`@${a.participant_name.toLowerCase()}`))
      .map(a => a.participant_name);

    if (mentioned.length > 0) {
      return await handleFullResponse(room_id, messageText, mentioned);
    }

    // Step 4: Hand-raise mode — ask all agents if they want to speak
    // First, reset all hands from previous message
    await supabase
      .from("war_room_participants")
      .update({ hand_raised: false, hand_reason: null })
      .eq("room_id", room_id)
      .eq("participant_type", "agent");

    // Look up agent records
    const agentNames = agentParticipants.map(a => a.participant_name);

    const { data: agentRecords } = await supabase
      .from("agents")
      .select("name, role, session_key, api_endpoint, api_model, system_prompt, model_primary, model_escalation, voice_id")
      .in("name", agentNames);

    const agentMap = new Map<string, AgentRecord>();
    for (const rec of agentRecords || []) {
      agentMap.set(rec.name, rec);
    }

    // Ask all agents in parallel if they want to speak
    const handRaiseResults = await Promise.all(
      agentNames.map(async (name) => {
        const rec = agentMap.get(name);
        if (!rec) return null;
        const result = await askHandRaise(rec, messageText, name);
        return { name, ...result };
      })
    );

    // Update participants with hand-raise results
    for (const result of handRaiseResults) {
      if (!result) continue;
      const participant = agentParticipants.find(a => a.participant_name === result.name);
      if (!participant) continue;

      await supabase
        .from("war_room_participants")
        .update({
          hand_raised: result.wants_to_speak,
          hand_reason: result.wants_to_speak ? result.reason : null,
        })
        .eq("id", participant.id);
    }

    const raisedHands = handRaiseResults.filter(r => r?.wants_to_speak).map(r => r!.name);
    return json({ status: "hands_raised", agents: raisedHands });

  } catch (err) {
    console.error("route-message error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }
});

// ============================================================
// EXECUTION PAYLOAD EXTRACTOR
// ============================================================

function extractExecutionPayload(agentResponse: string): Record<string, unknown> | null {
  const executionBlockRegex = /```execution\s*\n([\s\S]*?)\n```/;
  const match = agentResponse.match(executionBlockRegex);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (parsed.files && Array.isArray(parsed.files) && parsed.branch && parsed.commit_message) {
      return { type: "code_commit", payload: { files: parsed.files, branch: parsed.branch, commit_message: parsed.commit_message, base_branch: parsed.base_branch || "main" } };
    }
    if (parsed.type && parsed.payload) return parsed;
  } catch (e) { console.error("Failed to parse execution block:", e); }
  return null;
}

// ============================================================
// HANDLER: Full Response (used for hand-raise click + @mentions)
// ============================================================

async function handleFullResponse(roomId: string, messageText: string, targetAgents: string[]) {
  if (targetAgents.length === 0) {
    return json({ status: "no_targets" });
  }

  // If no content provided, fetch the latest human message from the room
  let effectiveMessage = messageText;
  let preferVoiceReply = false;
  
  if (!effectiveMessage) {
    const { data: latestMsg } = await supabase
      .from("war_room_messages")
      .select("content, metadata")
      .eq("room_id", roomId)
      .eq("sender_type", "human")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    effectiveMessage = latestMsg?.content || "Please respond.";
    preferVoiceReply = latestMsg?.metadata?.prefer_voice_reply ?? false;
  } else {
    // When triggered by @mention, get the triggering message's metadata
    const { data: latestMsg } = await supabase
      .from("war_room_messages")
      .select("metadata")
      .eq("room_id", roomId)
      .eq("sender_type", "human")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    preferVoiceReply = latestMsg?.metadata?.prefer_voice_reply ?? false;
  }

  const { data: participants } = await supabase
    .from("war_room_participants")
    .select("*")
    .eq("room_id", roomId)
    .eq("is_active", true);

  const { data: agentRecords } = await supabase
    .from("agents")
    .select("name, role, session_key, api_endpoint, api_model, system_prompt, model_primary, model_escalation, voice_id")
    .in("name", targetAgents);

  const agentMap = new Map<string, AgentRecord>();
  for (const rec of agentRecords || []) {
    agentMap.set(rec.name, rec);
  }

  const context = await buildContext(roomId, 20);

  const responsePromises = targetAgents.map(async (agentName) => {
    const participant = participants?.find(a => a.participant_name === agentName);
    const agentRecord = agentMap.get(agentName);

    if (!participant) return;
    if (participant.participant_type === "human") return;

    const startTime = Date.now();

    try {
      const response = await callAgentFromRecord(agentRecord, participant, effectiveMessage, context, agentName);
      const responseTime = Date.now() - startTime;
      const modelUsed = agentRecord?.api_model || agentRecord?.model_primary || "unknown";
      const executionPayload = extractExecutionPayload(response.text);

      const { data: insertedMsg } = await supabase
        .from("war_room_messages")
        .insert({
          room_id: roomId,
          sender_name: agentName,
          sender_type: "agent",
          content: response.text,
          content_type: "text",
          metadata: {
            model_used: modelUsed,
            tokens_used: response.tokensUsed,
            response_time_ms: responseTime,
            routing_reason: response.routingReason || "",
            ...(executionPayload ? { execution: executionPayload } : {}),
          },
        })
        .select()
        .single();

      // Voice TTS if user requested voice reply AND agent has voice_id
      if (preferVoiceReply && agentRecord?.voice_id && insertedMsg) {
        try {
          await generateVoice(response.text, agentRecord.voice_id, insertedMsg.id);
        } catch (ttsErr) {
          console.error(`TTS failed for ${agentName}:`, ttsErr);
        }
      }

      // Lower the agent's hand after responding
      await supabase
        .from("war_room_participants")
        .update({ hand_raised: false, hand_reason: null })
        .eq("id", participant.id);

    } catch (err) {
      console.error(`Agent ${agentName} failed:`, err);
      await supabase.from("war_room_messages").insert({
        room_id: roomId,
        sender_name: "System",
        sender_type: "system",
        content: `⚠️ ${agentName} could not respond: ${(err as Error).message}`,
        metadata: { error: true },
      });
    }
  });

  await Promise.all(responsePromises);
  return json({ status: "ok", responded: targetAgents });
}

// ============================================================
// TYPES
// ============================================================

interface AgentRecord {
  name: string;
  role: string;
  session_key: string;
  api_endpoint: string | null;
  api_model: string | null;
  system_prompt: string | null;
  model_primary: string | null;
  model_escalation: string | null;
  voice_id: string | null;
}

interface AgentResponse {
  text: string;
  tokensUsed: number;
  routingReason?: string;
}

interface HandRaiseResult {
  wants_to_speak: boolean;
  reason: string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// ============================================================
// HAND RAISE — Lightweight check per agent
// ============================================================

async function askHandRaise(
  agentRecord: AgentRecord | undefined,
  message: string,
  agentName: string
): Promise<HandRaiseResult> {
  if (!agentRecord?.api_endpoint) {
    return { wants_to_speak: false, reason: "" };
  }

  const systemPrompt = `You are ${agentName}, a ${agentRecord.role}. Based on the user's message, decide if you have relevant expertise to contribute. Respond ONLY with JSON: {"wants_to_speak": true or false, "reason": "max 5 words"}`;

  try {
    const text = await callAgentLightweight(agentRecord, systemPrompt, message, 60);
    const match = text.match(/\{[\s\S]*?\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        wants_to_speak: !!parsed.wants_to_speak,
        reason: String(parsed.reason || "").substring(0, 50),
      };
    }
    return { wants_to_speak: false, reason: "" };
  } catch {
    return { wants_to_speak: false, reason: "" };
  }
}

// ============================================================
// LIGHTWEIGHT AGENT CALL (low max_tokens, short timeout)
// ============================================================

async function callAgentLightweight(
  agentRecord: AgentRecord,
  systemPrompt: string,
  message: string,
  maxTokens: number
): Promise<string> {
  const endpoint = agentRecord.api_endpoint!;

  if (endpoint.includes("anthropic.com")) {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("No API key");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: agentRecord.api_model || "claude-sonnet-4-5-20250929",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: message }],
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    return data.content[0].text;

  } else if (endpoint.includes("moonshot.cn")) {
    if (!KIMI_KEY) throw new Error("No Kimi key");
    const res = await fetch("https://api.moonshot.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${KIMI_KEY}`,
      },
      body: JSON.stringify({
        model: agentRecord.api_model || "moonshot-v1-auto",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    return data.choices[0].message.content;

  } else if (endpoint.includes("localhost") || endpoint.includes("172.") || endpoint.includes("ollama")) {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: agentRecord.api_model || "qwen2.5-coder:32b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        stream: false,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    return data.message.content;

  } else {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: agentRecord.api_model || "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }
}

// ============================================================
// AI AGENT CALLER — reads config from agents table
// ============================================================

async function callAgentFromRecord(
  agentRecord: AgentRecord | undefined,
  _participant: any,
  userMessage: string,
  context: string,
  agentName: string
): Promise<AgentResponse> {
  // ARGOS: not yet connected (placeholder)
  if (agentName === "ARGOS" && !agentRecord?.api_endpoint) {
    return {
      text: `🔱 ARGOS acknowledges your message. I'm not yet connected to the War Room's live response system — my OpenClaw/Kimi integration is being configured. For now, other agents can assist. I'll be fully operational soon.`,
      tokensUsed: 0,
    };
  }

  if (!agentRecord) {
    throw new Error(`Agent "${agentName}" not found in agents table. Run OLY-018 migration.`);
  }

  if (!agentRecord.api_endpoint) {
    throw new Error(`No API endpoint configured for ${agentName}. Run OLY-018 migration.`);
  }

  const systemPrompt = agentRecord.system_prompt ||
    `You are ${agentName}, a ${agentRecord.role} in the OLYMPUS multi-agent system. Keep responses concise and helpful.`;

  const fullPrompt = `${systemPrompt}\n\n${context}`;
  const endpoint = agentRecord.api_endpoint;

  if (endpoint.includes("anthropic.com")) {
    return callAnthropic(fullPrompt, userMessage, agentRecord.api_model || "claude-sonnet-4-5-20250929");
  } else if (endpoint.includes("moonshot.cn")) {
    return callKimi(fullPrompt, userMessage, agentRecord.api_model || "moonshot-v1-auto");
  } else if (endpoint.includes("localhost") || endpoint.includes("172.") || endpoint.includes("ollama")) {
    return callOllama(fullPrompt, userMessage, agentRecord.api_model || "qwen2.5-coder:32b");
  } else {
    return callOpenAICompatible(endpoint, fullPrompt, userMessage, agentRecord.api_model || "gpt-4");
  }
}

// ============================================================
// API CALLERS
// ============================================================

async function callAnthropic(systemPrompt: string, message: string, model: string): Promise<AgentResponse> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: message + "\n\nREMINDER: Wrap ALL code output in ```execution blocks with JSON structure (files, branch, commit_message). Do NOT use ```typescript or ```javascript." }],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${errBody.substring(0, 200)}`);
  }

  const data = await res.json();
  return {
    text: data.content[0].text,
    tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
  };
}

async function callKimi(systemPrompt: string, message: string, model: string): Promise<AgentResponse> {
  if (!KIMI_KEY) throw new Error("KIMI_API_KEY not set");

  const res = await fetch("https://api.moonshot.cn/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${KIMI_KEY}`,
    },
    body: JSON.stringify({
      model: model || "moonshot-v1-auto",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_tokens: 4096,
    }),
  });

  if (!res.ok) throw new Error(`Kimi API error: ${res.status}`);

  const data = await res.json();
  return {
    text: data.choices[0].message.content,
    tokensUsed: (data.usage?.total_tokens) || 0,
  };
}

async function callOllama(systemPrompt: string, message: string, model: string): Promise<AgentResponse> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model || "qwen2.5-coder:32b",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message + "\n\nREMINDER: Wrap ALL code output in ```execution blocks with JSON structure (files, branch, commit_message). Do NOT use ```typescript or ```javascript." },
      ],
      stream: false,
      options: { num_predict: 4096 },
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);

  const data = await res.json();
  return {
    text: data.message.content,
    tokensUsed: (data.eval_count || 0) + (data.prompt_eval_count || 0),
  };
}

async function callOpenAICompatible(endpoint: string, systemPrompt: string, message: string, model: string): Promise<AgentResponse> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message + "\n\nREMINDER: Wrap ALL code output in ```execution blocks with JSON structure (files, branch, commit_message). Do NOT use ```typescript or ```javascript." },
      ],
      max_tokens: 4096,
    }),
  });

  if (!res.ok) throw new Error(`API error at ${endpoint}: ${res.status}`);

  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content || "No response",
    tokensUsed: data.usage?.total_tokens || 0,
  };
}

// ============================================================
// CONTEXT BUILDER
// ============================================================

async function buildContext(roomId: string, messageCount: number = 20): Promise<string> {
  const { data: messages } = await supabase
    .from("war_room_messages")
    .select("sender_name, sender_type, content, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(messageCount);

  if (!messages || messages.length === 0) return "No previous messages.";

  const { data: participants } = await supabase
    .from("war_room_participants")
    .select("participant_name, participant_type, participant_config")
    .eq("room_id", roomId);

  const participantList = (participants || [])
    .map(p => {
      const role = p.participant_type === "agent"
        ? (p.participant_config as any)?.expertise?.join(", ") || "AI Agent"
        : (p.participant_config as any)?.role || "Team Member";
      return `- ${p.participant_name} (${p.participant_type}, ${role})`;
    })
    .join("\n");

  const messageHistory = messages
    .reverse()
    .map(m => {
      const time = new Date(m.created_at).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `[${m.sender_name} ${time}] ${m.content}`;
    })
    .join("\n");

  return `PARTICIPANTS IN THIS WAR ROOM:
${participantList}

RECENT CONVERSATION:
${messageHistory}

Respond naturally. Be concise. Don't repeat what others said. Add your unique perspective.
If you have nothing meaningful to add, say so briefly.
Match the language of the conversation (German or English).`;
}

// ============================================================
// VOICE: Speech-to-Text (Whisper)
// ============================================================

async function transcribeVoice(audioUrl: string): Promise<string> {
  const audioRes = await fetch(audioUrl);
  const audioBlob = await audioRes.blob();

  const formData = new FormData();
  formData.append("file", audioBlob, "voice.webm");
  formData.append("model", "whisper-1");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
    },
    body: formData,
  });

  if (!res.ok) throw new Error(`Whisper API error: ${res.status}`);

  const data = await res.json();
  return data.text;
}

// ============================================================
// VOICE: Text-to-Speech (ElevenLabs)
// ============================================================

async function generateVoice(text: string, voiceId: string, messageId: string): Promise<void> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": Deno.env.get("ELEVENLABS_API_KEY")!,
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) {
    console.error("ElevenLabs TTS failed:", res.status);
    return;
  }

  const audioBuffer = await res.arrayBuffer();
  const fileName = `war-room-voice/${messageId}.mp3`;

  const { error: uploadError } = await supabase.storage
    .from("war-room-audio")
    .upload(fileName, audioBuffer, { contentType: "audio/mpeg" });

  if (uploadError) {
    console.error("Audio upload failed:", uploadError);
    return;
  }

  const { data: urlData } = supabase.storage
    .from("war-room-audio")
    .getPublicUrl(fileName);

  await supabase
    .from("war_room_messages")
    .update({ audio_url: urlData.publicUrl })
    .eq("id", messageId);
}
