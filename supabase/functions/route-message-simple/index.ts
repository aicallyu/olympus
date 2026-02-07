import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req: Request) => {
  try {
    const { message_id, room_id, sender_name, content } = await req.json();

    // Check sender type
    const { data: senderAgent } = await supabase
      .from("agents")
      .select("type")
      .eq("name", sender_name)
      .maybeSingle();
    
    const isAgent = senderAgent?.type === 'ai';

    // Get participants
    const { data: participants } = await supabase
      .from("war_room_participants")
      .select("participant_name,participant_type")
      .eq("room_id", room_id)
      .eq("is_active", true);

    const agents = participants?.filter(p => p.participant_type === "agent") || [];
    const agentNames = agents.map(a => a.participant_name);

    // Get room mode
    const { data: room } = await supabase
      .from("war_rooms")
      .select("routing_mode")
      .eq("id", room_id)
      .single();

    // Simple routing logic
    let responding: string[] = [];

    if (isAgent) {
      // Agent sender: only respond if @mention found
      const mentions = content.match(/@([A-Za-z0-9_]+)/g) || [];
      const mentionedNames = mentions.map((m: string) => m.slice(1));
      responding = mentionedNames.filter((name: string) => 
        agentNames.includes(name) && name !== sender_name
      );
    } else {
      // Human sender: all agents respond
      if (room?.routing_mode === "all") {
        responding = agentNames;
      } else if (room?.routing_mode === "mentioned") {
        const mentions = content.match(/@([A-Za-z0-9_]+)/g) || [];
        const mentionedNames = mentions.map((m: string) => m.slice(1));
        responding = agentNames.filter(name => mentionedNames.includes(name));
      }
    }

    if (responding.length === 0) {
      return new Response(JSON.stringify({ 
        status: "no_response", 
        isAgent, 
        roomMode: room?.routing_mode,
        agents: agentNames 
      }), { status: 200 });
    }

    // Insert simple responses for testing
    for (const agentName of responding) {
      await supabase.from("war_room_messages").insert({
        room_id,
        sender_name: agentName,
        sender_type: "agent",
        content: `Test response from ${agentName}`,
        triggered_by: message_id,
      });
    }

    return new Response(JSON.stringify({ 
      status: "ok", 
      responded: responding 
    }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
