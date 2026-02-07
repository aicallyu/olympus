import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const KIMI_KEY = Deno.env.get("KIMI_API_KEY") || "";
const OLLAMA_URL = Deno.env.get("OLLAMA_BASE_URL") || "http://172.29.96.1:11434";
const MAX_TOKENS_PER_AGENT = 500;
const MAX_TOTAL_TOKENS = 5000;
const DISCUSSION_TIMEOUT_MS = 120_000; // 2 minutes

interface AgentRecord {
  name: string;
  role: string;
  session_key: string;
  api_endpoint: string | null;
  api_model: string | null;
  system_prompt: string | null;
}

serve(async (req: Request) => {
  const startTime = Date.now();

  try {
    const { room_id, topic, deliverable, agents } = await req.json();
    const discussionId = crypto.randomUUID();
    const agentNames: string[] = agents || [];

    // Step 1: Post the discussion header message
    await supabase.from("war_room_messages").insert({
      room_id,
      sender_name: "System",
      sender_type: "system",
      content: `🔄 Team Discussion: ${topic}`,
      metadata: {
        discussion_topic: topic,
        discussion_id: discussionId,
        discussion_deliverable: deliverable,
        discussion_agent_count: agentNames.length,
      },
    });

    // Step 2: Look up agent records
    const { data: agentRecords } = await supabase
      .from("agents")
      .select("name, role, session_key, api_endpoint, api_model, system_prompt")
      .in("name", agentNames);

    const agentMap = new Map<string, AgentRecord>();
    for (const rec of agentRecords || []) {
      agentMap.set(rec.name, rec);
    }

    // Filter to agents that have endpoints (skip humans and unconfigured)
    const validAgents = agentNames.filter(name => {
      const rec = agentMap.get(name);
      return rec && rec.api_endpoint && !rec.session_key?.startsWith("human:");
    });

    // Step 3: Get recent context
    const { data: recentMsgs } = await supabase
      .from("war_room_messages")
      .select("sender_name, content")
      .eq("room_id", room_id)
      .order("created_at", { ascending: false })
      .limit(10);

    const recentContext = (recentMsgs || [])
      .reverse()
      .map(m => `[${m.sender_name}] ${m.content}`)
      .join("\n");

    // Step 4: Round-robin — each agent gets one turn
    const contributions: { agent: string; text: string }[] = [];
    let totalTokens = 0;

    for (const agentName of validAgents) {
      // Check timeout
      if (Date.now() - startTime > DISCUSSION_TIMEOUT_MS) {
        await supabase.from("war_room_messages").insert({
          room_id,
          sender_name: "System",
          sender_type: "system",
          content: "⏱️ Discussion time limit reached. Moving to summary.",
          metadata: { discussion: true, discussion_id: discussionId },
        });
        break;
      }

      // Check token budget
      if (totalTokens >= MAX_TOTAL_TOKENS) {
        await supabase.from("war_room_messages").insert({
          room_id,
          sender_name: "System",
          sender_type: "system",
          content: "📊 Token budget reached. Moving to summary.",
          metadata: { discussion: true, discussion_id: discussionId },
        });
        break;
      }

      const rec = agentMap.get(agentName)!;

      const previousContributions = contributions.length > 0
        ? "\n\nOther agents have already said:\n" + contributions.map(c => `[${c.agent}]: ${c.text}`).join("\n")
        : "";

      const systemPrompt = `You are ${agentName}, a ${rec.role} in the OLYMPUS team. You are in a focused team discussion.

TOPIC: ${topic}
DELIVERABLE: ${deliverable}

Recent conversation context:
${recentContext}
${previousContributions}

Share your perspective concisely. Stay on topic. Don't repeat what others said. Focus on your area of expertise. Max 3-4 sentences.`;

      try {
        const response = await callAgent(rec, systemPrompt, `Discuss: ${topic}`);
        totalTokens += response.tokensUsed;

        contributions.push({ agent: agentName, text: response.text });

        // Insert discussion message
        await supabase.from("war_room_messages").insert({
          room_id,
          sender_name: agentName,
          sender_type: "agent",
          content: response.text,
          content_type: "text",
          metadata: {
            discussion: true,
            discussion_id: discussionId,
            tokens_used: response.tokensUsed,
          },
        });

      } catch (err) {
        console.error(`Discussion: ${agentName} failed:`, err);
        // Skip this agent, continue with others
      }
    }

    // Step 5: Claude summarizes (always use Anthropic for summary)
    if (contributions.length > 0) {
      const summaryPrompt = `You are Claude, the team moderator. Summarize this team discussion and provide the deliverable.

TOPIC: ${topic}
DELIVERABLE REQUESTED: ${deliverable}

CONTRIBUTIONS:
${contributions.map(c => `[${c.agent}]: ${c.text}`).join("\n\n")}

Write a concise summary (2-3 paragraphs max) that:
1. Captures the key points from each contributor
2. Identifies areas of agreement and disagreement
3. Provides the requested deliverable: ${deliverable}

Address the human directly. Start with: "Here's what we discussed:"`;

      try {
        const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
        if (apiKey) {
          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-5-20250929",
              max_tokens: 1024,
              system: "You are Claude, a thoughtful team moderator who synthesizes discussions into actionable summaries.",
              messages: [{ role: "user", content: summaryPrompt }],
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const summaryText = data.content[0].text;

            await supabase.from("war_room_messages").insert({
              room_id,
              sender_name: "Claude",
              sender_type: "agent",
              content: summaryText,
              content_type: "text",
              metadata: {
                discussion_summary: true,
                discussion_id: discussionId,
                model_used: "claude-sonnet-4-5-20250929",
                tokens_used: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
              },
            });
          }
        }
      } catch (err) {
        console.error("Summary generation failed:", err);
      }
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        discussion_id: discussionId,
        agents_participated: contributions.length,
        total_tokens: totalTokens,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("autonomous-discuss error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// ============================================================
// Agent caller (reusable across providers)
// ============================================================

interface AgentResponse {
  text: string;
  tokensUsed: number;
}

async function callAgent(rec: AgentRecord, systemPrompt: string, message: string): Promise<AgentResponse> {
  const endpoint = rec.api_endpoint!;

  if (endpoint.includes("anthropic.com")) {
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
        model: rec.api_model || "claude-sonnet-4-5-20250929",
        max_tokens: MAX_TOKENS_PER_AGENT,
        system: systemPrompt,
        messages: [{ role: "user", content: message }],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) throw new Error(`Anthropic error ${res.status}`);
    const data = await res.json();
    return {
      text: data.content[0].text,
      tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    };

  } else if (endpoint.includes("moonshot.cn")) {
    const key = KIMI_KEY;
    if (!key) throw new Error("KIMI_API_KEY not set");

    const res = await fetch("https://api.moonshot.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: rec.api_model || "moonshot-v1-auto",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: MAX_TOKENS_PER_AGENT,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) throw new Error(`Kimi error ${res.status}`);
    const data = await res.json();
    return {
      text: data.choices[0].message.content,
      tokensUsed: data.usage?.total_tokens || 0,
    };

  } else if (endpoint.includes("localhost") || endpoint.includes("172.") || endpoint.includes("ollama")) {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: rec.api_model || "qwen2.5-coder:32b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        stream: false,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) throw new Error(`Ollama error ${res.status}`);
    const data = await res.json();
    return {
      text: data.message.content,
      tokensUsed: (data.eval_count || 0) + (data.prompt_eval_count || 0),
    };

  } else {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: rec.api_model || "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: MAX_TOKENS_PER_AGENT,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    return {
      text: data.choices?.[0]?.message?.content || "No response",
      tokensUsed: data.usage?.total_tokens || 0,
    };
  }
}
