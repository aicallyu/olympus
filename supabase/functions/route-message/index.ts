import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const OLLAMA_URL = Deno.env.get("OLLAMA_BASE_URL") || "http://172.29.96.1:11434";
const KIMI_KEY = Deno.env.get("KIMI_API_KEY") || "";

serve(async (req: Request) => {
  try {
    const { message_id, room_id, sender_name, content, content_type, audio_url } = await req.json();

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

    const { data: room } = await supabase
      .from("war_rooms")
      .select("routing_mode")
      .eq("id", room_id)
      .single();

    const agentParticipants = participants?.filter(p => p.participant_type === "agent") || [];

    if (agentParticipants.length === 0) {
      return new Response(JSON.stringify({ status: "no_agents" }), { status: 200 });
    }

    // Step 3: Determine which agent(s) should respond
    let respondingAgents: string[] = [];

    if (room?.routing_mode === "all") {
      respondingAgents = agentParticipants.map(a => a.participant_name);
    } else if (room?.routing_mode === "mentioned") {
      respondingAgents = agentParticipants
        .filter(a => messageText.includes(`@${a.participant_name}`))
        .map(a => a.participant_name);
    } else {
      // 'moderated' — ask the Moderator Agent (using Kimi for now)
      respondingAgents = await askModerator(messageText, agentParticipants, room_id);
    }

    if (respondingAgents.length === 0) {
      return new Response(JSON.stringify({ status: "no_response_needed" }), { status: 200 });
    }

    // Step 4: Look up agent records from the agents table
    const { data: agentRecords } = await supabase
      .from("agents")
      .select("name, role, session_key, api_endpoint, api_model, system_prompt, model_primary, model_escalation, voice_id")
      .in("name", respondingAgents);

    const agentMap = new Map<string, AgentRecord>();
    for (const rec of agentRecords || []) {
      agentMap.set(rec.name, rec);
    }

    // Step 5: Build conversation context
    const context = await buildContext(room_id, 20);

    // Step 6: Get responses from each selected agent (in parallel)
    const responsePromises = respondingAgents.map(async (agentName) => {
      const participant = agentParticipants.find(a => a.participant_name === agentName);
      const agentRecord = agentMap.get(agentName);

      if (!participant) return;

      // Skip human participants
      if (participant.participant_type === "human") return;
      if (agentRecord?.session_key?.startsWith("human:")) return;

      const startTime = Date.now();

      try {
        const response = await callAgentFromRecord(agentRecord, participant, messageText, context, agentName);
        const responseTime = Date.now() - startTime;

        const modelUsed = agentRecord?.api_model || agentRecord?.model_primary || "unknown";

        const { data: insertedMsg } = await supabase
          .from("war_room_messages")
          .insert({
            room_id,
            sender_name: agentName,
            sender_type: "agent",
            content: response.text,
            content_type: "text",
            metadata: {
              model_used: modelUsed,
              tokens_used: response.tokensUsed,
              response_time_ms: responseTime,
              routing_reason: response.routingReason || "",
            },
          })
          .select()
          .single();

        // Voice TTS if agent has a voice_id configured
        if (agentRecord?.voice_id && insertedMsg) {
          try {
            await generateVoice(response.text, agentRecord.voice_id, insertedMsg.id);
          } catch (ttsErr) {
            console.error(`TTS failed for ${agentName}:`, ttsErr);
            // Non-fatal — message was still sent as text
          }
        }
      } catch (err) {
        console.error(`Agent ${agentName} failed:`, err);
        await supabase.from("war_room_messages").insert({
          room_id,
          sender_name: "System",
          sender_type: "system",
          content: `⚠️ ${agentName} could not respond: ${(err as Error).message}`,
          metadata: { error: true },
        });
      }
    });

    await Promise.all(responsePromises);

    return new Response(JSON.stringify({ status: "ok", responded: respondingAgents }), {
      status: 200,
    });
  } catch (err) {
    console.error("route-message error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});

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

// ============================================================
// MODERATOR — Decides which agent(s) should respond
// Using Kimi K2.5 for routing (Phase 1)
// ============================================================

interface ModeratorResult {
  respond: string[];
  reason: string;
}

async function askModerator(
  message: string,
  agents: any[],
  _roomId: string
): Promise<string[]> {
  const agentList = agents
    .map(a => {
      const config = a.participant_config || {};
      return `- ${a.participant_name}: ${(config.expertise || []).join(", ") || a.participant_name}`;
    })
    .join("\n");

  const prompt = `You are a message router. Given a message and AI participants, decide who should respond.

PARTICIPANTS:
${agentList}

RULES:
1. @mentioned → route ONLY to them
2. Human-to-human message → route to NOBODY
3. Infrastructure/DevOps/tools/n8n → ARGOS
4. Architecture/code review/strategy/analysis → Claude
5. Frontend/UI/React/CSS → ATLAS
6. Backend/API/database → HERCULOS
7. Testing/QA/bugs → ATHENA
8. Design/visuals/aesthetics → APOLLO
9. Documentation/writing → HERMES
10. DevOps/deploy/CI/CD → PROMETHEUS
11. Broad discussion → ALL AI agents
12. Casual/greeting → most relevant agent
13. Unsure → Claude

MESSAGE: "${message}"

Respond JSON only:
{"respond": ["AgentName"], "reason": "brief reason"}`;

  try {
    if (!KIMI_KEY) {
      // No Kimi key — use keyword fallback
      return keywordFallbackRouter(message, agents);
    }

    const res = await fetch("https://api.moonshot.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${KIMI_KEY}`,
      },
      body: JSON.stringify({
        model: "moonshot-v1-auto",
        messages: [
          { role: "system", content: "You are a message router. Respond only with valid JSON." },
          { role: "user", content: prompt }
        ],
        max_tokens: 256,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) throw new Error(`Kimi returned ${res.status}`);

    const data = await res.json();
    const content = data.choices[0].message.content;
    const parsed: ModeratorResult = JSON.parse(content);
    return parsed.respond || [];
  } catch (err) {
    console.warn("Moderator (Kimi) failed, using keyword fallback:", err);
    return keywordFallbackRouter(message, agents);
  }
}

// Simple keyword-based routing when AI moderator is unavailable
function keywordFallbackRouter(message: string, agents: any[]): string[] {
  const lower = message.toLowerCase();
  const agentNames = agents.map(a => a.participant_name);

  // Check for @mentions first
  const mentioned = agentNames.filter(name => lower.includes(`@${name.toLowerCase()}`));
  if (mentioned.length > 0) return mentioned;

  // Keyword matching per agent specialty
  const routes: [string[], string][] = [
    [["frontend", "react", "css", "tailwind", "component", "ui", "layout", "responsive", "vite"], "ATLAS"],
    [["backend", "api", "database", "supabase", "sql", "server", "endpoint", "query", "schema"], "HERCULOS"],
    [["test", "qa", "bug", "quality", "regression", "coverage", "assert", "spec"], "ATHENA"],
    [["deploy", "ci", "cd", "docker", "pipeline", "infra", "devops", "monitor", "build", "netlify"], "PROMETHEUS"],
    [["design", "color", "font", "animation", "visual", "icon", "theme", "aesthetic", "figma"], "APOLLO"],
    [["doc", "readme", "comment", "write", "document", "changelog", "adr"], "HERMES"],
    [["architecture", "strategy", "review", "plan", "structure", "pattern", "decision"], "Claude"],
    [["server", "ollama", "n8n", "workflow", "orchestrat", "coordinate", "route"], "ARGOS"],
  ];

  const matches: string[] = [];
  for (const [keywords, agent] of routes) {
    if (keywords.some(k => lower.includes(k)) && agentNames.includes(agent)) {
      matches.push(agent);
    }
  }

  if (matches.length > 0) return [...new Set(matches)];

  // Default: route to Claude if present, else first agent
  if (agentNames.includes("Claude")) return ["Claude"];
  return [agentNames[0] || "ARGOS"];
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

  // No agent record found in DB — return helpful error
  if (!agentRecord) {
    throw new Error(`Agent "${agentName}" not found in agents table. Run OLY-018 migration.`);
  }

  // No endpoint configured
  if (!agentRecord.api_endpoint) {
    throw new Error(`No API endpoint configured for ${agentName}. Run OLY-018 migration.`);
  }

  const systemPrompt = agentRecord.system_prompt ||
    `You are ${agentName}, a ${agentRecord.role} in the OLYMPUS multi-agent system. Keep responses concise and helpful.`;

  const fullPrompt = `${systemPrompt}\n\n${context}`;

  // Determine provider from the endpoint URL
  const endpoint = agentRecord.api_endpoint;

  if (endpoint.includes("anthropic.com")) {
    return callAnthropic(fullPrompt, userMessage, agentRecord.api_model || "claude-sonnet-4-5-20250929");
  } else if (endpoint.includes("moonshot.cn")) {
    return callKimi(fullPrompt, userMessage, agentRecord.api_model || "moonshot-v1-auto");
  } else if (endpoint.includes("localhost") || endpoint.includes("172.") || endpoint.includes("ollama")) {
    return callOllama(fullPrompt, userMessage, agentRecord.api_model || "qwen2.5-coder:32b");
  } else {
    // Try as OpenAI-compatible endpoint
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
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
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
      max_tokens: 1024,
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
        { role: "user", content: message },
      ],
      stream: false,
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
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_tokens: 1024,
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
