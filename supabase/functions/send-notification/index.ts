import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// OpenClaw Gateway for WhatsApp
const OPENCLAW_URL = Deno.env.get("OPENCLAW_URL") || "http://100.82.20.112:8080";
const OPENCLAW_TOKEN = Deno.env.get("OPENCLAW_TOKEN") || "";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    // Fetch pending notifications (not yet sent)
    const { data: notifications, error } = await supabase
      .from("notification_queue")
      .select("*")
      .is("sent_at", null)
      .order("created_at", { ascending: true })
      .limit(10);

    if (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    if (!notifications || notifications.length === 0) {
      return json({ status: "ok", sent: 0, message: "No pending notifications" });
    }

    const results = [];

    for (const notif of notifications) {
      try {
        // Send WhatsApp via OpenClaw gateway
        const sent = await sendWhatsApp(notif.recipient_phone, notif.message_preview, notif.sender_name);

        if (sent) {
          // Mark as sent
          const { error: updateError } = await supabase
            .from("notification_queue")
            .update({ sent_at: new Date().toISOString() })
            .eq("id", notif.id);

          if (updateError) {
            console.error(`Failed to mark notification ${notif.id} as sent:`, updateError);
          }

          results.push({ id: notif.id, status: "sent", recipient: notif.recipient_phone });
        } else {
          results.push({ id: notif.id, status: "failed", recipient: notif.recipient_phone });
        }
      } catch (err) {
        console.error(`Error sending notification ${notif.id}:`, err);
        results.push({ id: notif.id, status: "error", error: (err as Error).message });
      }
    }

    return json({ status: "ok", sent: results.filter(r => r.status === "sent").length, results });

  } catch (err) {
    console.error("send-notification error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }
});

async function sendWhatsApp(phone: string, message: string, senderName: string): Promise<boolean> {
  // Format: prepend sender name to message
  const fullMessage = `🔔 *${senderName}* (War Room):\n${message.substring(0, 500)}${message.length > 500 ? "..." : ""}`;

  // Skip if no gateway URL configured
  if (!OPENCLAW_URL || OPENCLAW_URL === "http://100.82.20.112:8080") {
    console.log("No OpenClaw gateway configured, using direct fallback only");
    return await sendWhatsAppDirect(phone, fullMessage);
  }

  try {
    // Try OpenClaw gateway first with short timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(`${OPENCLAW_URL}/v1/whatsapp/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(OPENCLAW_TOKEN ? { "Authorization": `Bearer ${OPENCLAW_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        to: phone,
        message: fullMessage,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return true;
    }

    // Fallback: try direct WhatsApp webhook
    console.log("OpenClaw gateway failed, trying direct method...");
    return await sendWhatsAppDirect(phone, fullMessage);

  } catch (err) {
    console.error("WhatsApp send error:", err);
    return await sendWhatsAppDirect(phone, fullMessage);
  }
}

async function sendWhatsAppDirect(phone: string, message: string): Promise<boolean> {
  // Alternative: use n8n webhook or other configured endpoint
  const n8nWebhook = Deno.env.get("N8N_WHATSAPP_WEBHOOK");
  
  if (!n8nWebhook) {
    console.log("No fallback WhatsApp webhook configured");
    return false;
  }

  try {
    const res = await fetch(n8nWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        message,
        source: "olymp_notification",
      }),
      signal: AbortSignal.timeout(30000),
    });

    return res.ok;
  } catch (err) {
    console.error("Direct WhatsApp send failed:", err);
    return false;
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
