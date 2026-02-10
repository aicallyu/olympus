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

// ============================================================
// TOOL DEFINITIONS — agents can commit code + update progress
// ============================================================

const AGENT_TOOLS = [
  {
    name: "commit_code",
    description: "Commit code files to the repository. Use this whenever you write code that should be saved. Do NOT paste code into the chat — always use this tool instead.",
    input_schema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          description: "Files to commit",
          items: {
            type: "object",
            properties: {
              path: { type: "string", description: "File path relative to repo root, e.g. frontend/src/components/FileUpload.tsx" },
              content: { type: "string", description: "Full file content" },
              action: { type: "string", enum: ["create", "update", "delete"], description: "What to do with this file" },
            },
            required: ["path", "content", "action"],
          },
        },
        branch: { type: "string", description: "Branch name, e.g. feature/file-upload" },
        commit_message: { type: "string", description: "Commit message, e.g. feat: add file upload endpoint" },
      },
      required: ["files", "branch", "commit_message"],
    },
  },
  {
    name: "update_progress",
    description: "Update your current task progress so the team knows where you are. Use this at each major step.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["planning", "coding", "testing", "committing", "done", "blocked"],
          description: "Current status",
        },
        percent: { type: "number", description: "Progress percentage 0-100" },
        message: { type: "string", description: "Short status message, e.g. 'Writing upload validation logic'" },
      },
      required: ["status", "percent", "message"],
    },
  },
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const {
      message_id, room_id, sender_name, content, content_type, audio_url,
      action, target_agents,
    } = body;

    if (action === "full_response") {
      return await handleFullResponse(room_id, content, target_agents || []);
    }

    let messageText = content;
    if (content_type === "voice" && audio_url) {
      messageText = await transcribeVoice(audio_url);
      await supabase
        .from("war_room_messages")
        .update({ content: messageText, metadata: { original_type: "voice" } })
        .eq("id", message_id);
    }

    const { data: participants } = await supabase
      .from("war_room_participants")
      .select("*")
      .eq("room_id", room_id)
      .eq("is_active", true);

    const agentParticipants = participants?.filter(p => p.participant_type === "agent") || [];

    if (agentParticipants.length === 0) {
      return json({ status: "no_agents" });
    }

    const mentioned = agentParticipants
      .filter(a => messageText.toLowerCase().includes(`@${a.participant_name.toLowerCase()}`))
      .map(a => a.participant_name);

    if (mentioned.length > 0) {
      return await handleFullResponse(room_id, messageText, mentioned);
    }

    // Hand-raise mode
    await supabase
      .from("war_room_participants")
      .update({ hand_raised: false, hand_reason: null })
      .eq("room_id", room_id)
      .eq("participant_type", "agent");

    const agentNames = agentParticipants.map(a => a.participant_name);

    const { data: agentRecords } = await supabase
      .from("agents")
      .select("name, role, session_key, api_endpoint, api_model, system_prompt, model_primary, model_escalation, voice_id")
      .in("name", agentNames);

    const agentMap = new Map<string, AgentRecord>();
    for (const rec of agentRecords || []) {
      agentMap.set(rec.name, rec);
    }

    const handRaiseResults = await Promise.all(
      agentNames.map(async (name) => {
        const rec = agentMap.get(name);
        if (!rec) return null;
        const result = await askHandRaise(rec, messageText, name);
        return { name, ...result };
      })
    );

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
// HANDLER: Full Response with Tool Use
// ============================================================

async function handleFullResponse(roomId: string, messageText: string, targetAgents: string[]) {
  if (targetAgents.length === 0) {
    return json({ status: "no_targets" });
  }

  let effectiveMessage = messageText;
  if (!effectiveMessage) {
    const { data: latestMsg } = await supabase
      .from("war_room_messages")
      .select("content")
      .eq("room_id", roomId)
      .eq("sender_type", "human")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    effectiveMessage = latestMsg?.content || "Please respond.";
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
      const response = await callAgentWithTools(agentRecord, participant, effectiveMessage, context, agentName, roomId);
      const responseTime = Date.now() - startTime;
      const modelUsed = agentRecord?.api_model || agentRecord?.model_primary || "unknown";

      // Only post the text response to chat (no code!)
      if (response.text && response.text.trim().length > 0) {
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
              tools_used: response.toolsUsed,
            },
          })
          .select()
          .single();

        if (agentRecord?.voice_id && insertedMsg) {
          try {
            await generateVoice(response.text, agentRecord.voice_id, insertedMsg.id);
          } catch (ttsErr) {
            console.error(`TTS failed for ${agentName}:`, ttsErr);
          }
        }
      }

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
// AGENT CALLER WITH TOOL USE (Anthropic only, others fallback)
// ============================================================

async function callAgentWithTools(
  agentRecord: AgentRecord | undefined,
  _participant: any,
  userMessage: string,
  context: string,
  agentName: string,
  roomId: string
): Promise<AgentResponseWithTools> {
  if (agentName === "ARGOS" && !agentRecord?.api_endpoint) {
    return {
      text: `🔱 ARGOS acknowledges your message. OpenClaw/Kimi integration is being configured.`,
      tokensUsed: 0,
      toolsUsed: [],
    };
  }

  if (!agentRecord) {
    throw new Error(`Agent "${agentName}" not found in agents table.`);
  }

  if (!agentRecord.api_endpoint) {
    throw new Error(`No API endpoint configured for ${agentName}.`);
  }

  const systemPrompt = agentRecord.system_prompt ||
    `You are ${agentName}, a ${agentRecord.role} in the OLYMP system.`;

  const fullPrompt = `${systemPrompt}\n\n${context}`;
  const endpoint = agentRecord.api_endpoint;

  // Only Anthropic supports tool use — others fall back to plain text
  if (endpoint.includes("anthropic.com")) {
    return callAnthropicWithTools(fullPrompt, userMessage, agentRecord.api_model || "claude-sonnet-4-5-20250929", agentName, roomId);
  } else if (endpoint.includes("moonshot.cn")) {
    const resp = await callKimi(fullPrompt, userMessage, agentRecord.api_model || "moonshot-v1-auto");
    return { ...resp, toolsUsed: [] };
  } else if (endpoint.includes("localhost") || endpoint.includes("172.") || endpoint.includes("ollama")) {
    const resp = await callOllama(fullPrompt, userMessage, agentRecord.api_model || "qwen2.5-coder:32b");
    return { ...resp, toolsUsed: [] };
  } else {
    const resp = await callOpenAICompatible(endpoint, fullPrompt, userMessage, agentRecord.api_model || "gpt-4");
    return { ...resp, toolsUsed: [] };
  }
}

// ============================================================
// ANTHROPIC WITH TOOL USE
// ============================================================

async function callAnthropicWithTools(
  systemPrompt: string,
  message: string,
  model: string,
  agentName: string,
  roomId: string
): Promise<AgentResponseWithTools> {
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
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
      tools: AGENT_TOOLS,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${errBody.substring(0, 200)}`);
  }

  const data = await res.json();
  const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

  // Process all content blocks
  let textParts: string[] = [];
  const toolsUsed: string[] = [];

  for (const block of data.content) {
    if (block.type === "text") {
      textParts.push(block.text);
    } else if (block.type === "tool_use") {
      toolsUsed.push(block.name);

      if (block.name === "commit_code") {
        await handleCommitCode(block.input, agentName, roomId);
      } else if (block.name === "update_progress") {
        await handleProgressUpdate(block.input, agentName, roomId);
      }
    }
  }

  // If the model wants to continue after tool use (stop_reason === "tool_use"),
  // we send back tool results and get the final text response
  if (data.stop_reason === "tool_use") {
    const toolResults = data.content
      .filter((b: any) => b.type === "tool_use")
      .map((b: any) => ({
        type: "tool_result",
        tool_use_id: b.id,
        content: b.name === "commit_code"
          ? "Code wurde in die Execution Queue eingetragen. Branch wird erstellt und deployed."
          : "Progress update gespeichert.",
      }));

    const followUp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          { role: "user", content: message },
          { role: "assistant", content: data.content },
          { role: "user", content: toolResults },
        ],
        tools: AGENT_TOOLS,
      }),
    });

    if (followUp.ok) {
      const followUpData = await followUp.json();
      for (const block of followUpData.content) {
        if (block.type === "text") {
          textParts.push(block.text);
        }
      }
    }
  }

  return {
    text: textParts.join("\n"),
    tokensUsed,
    toolsUsed,
  };
}

// ============================================================
// TOOL HANDLERS
// ============================================================

async function handleCommitCode(
  input: { files: Array<{ path: string; content: string; action: string }>; branch: string; commit_message: string },
  agentName: string,
  roomId: string
): Promise<void> {
  // Insert into execution_queue — the Bridge on GMK picks it up
  const { error } = await supabase.from("execution_queue").insert({
    room_id: roomId,
    requested_by: agentName,
    execution_type: "code_commit",
    payload: {
      files: input.files,
      branch: input.branch,
      commit_message: input.commit_message,
      base_branch: "main",
    },
    status: "pending",
  });

  if (error) {
    console.error("Failed to insert execution_queue:", error);
    throw new Error(`Failed to queue code commit: ${error.message}`);
  }

  // Post a progress message to the War Room
  await supabase.from("war_room_messages").insert({
    room_id: roomId,
    sender_name: "EXECUTION BRIDGE",
    sender_type: "system",
    content: `📦 **${agentName}** hat Code eingereicht:\n• Branch: \`${input.branch}\`\n• ${input.files.length} Datei(en)\n• Commit: "${input.commit_message}"\n\n⏳ Wird jetzt committed und deployed...`,
    metadata: { is_system_message: true, execution_pending: true },
  });
}

async function handleProgressUpdate(
  input: { status: string; percent: number; message: string },
  agentName: string,
  roomId: string
): Promise<void> {
  const statusEmoji: Record<string, string> = {
    planning: "📋",
    coding: "⌨️",
    testing: "🧪",
    committing: "📦",
    done: "✅",
    blocked: "🚫",
  };

  const emoji = statusEmoji[input.status] || "🔄";
  const progressBar = makeProgressBar(input.percent);

  await supabase.from("war_room_messages").insert({
    room_id: roomId,
    sender_name: agentName,
    sender_type: "agent",
    content: `${emoji} ${progressBar} ${input.percent}%\n${input.message}`,
    content_type: "text",
    metadata: {
      is_progress_update: true,
      progress_status: input.status,
      progress_percent: input.percent,
    },
  });
}

function makeProgressBar(percent: number): string {
  const filled = Math.round(percent / 10);
  const empty = 10 - filled;
  return "█".repeat(filled) + "░".repeat(empty);
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

interface AgentResponseWithTools extends AgentResponse {
  toolsUsed: string[];
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
// PLAIN API CALLERS (for non-Anthropic agents)
// ============================================================

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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
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
