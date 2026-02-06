# OLYMP War Room - Deployment Guide

## Backend Setup (Supabase)

### 1. Enable pg_net Extension
Go to Supabase Dashboard → Database → Extensions → Search "pg_net" → Enable

This allows database triggers to call Edge Functions.

### 2. Create Database Trigger
Execute this SQL to enable automatic AI routing:

```sql
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sender_type = 'human' THEN
    PERFORM net.http_post(
      url := 'https://mfpyyriilflviojnqhuv.supabase.co/functions/v1/route-message',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mcHl5cmlpbGZsdmlvam5xaHV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIxOTQ4NywiZXhwIjoyMDg1Nzk1NDg3fQ.7nN6dHI5kwQZDIPPxaMm49tbeof5j2ZXg889jffZK_A'
      ),
      body := jsonb_build_object(
        'message_id', NEW.id,
        'room_id', NEW.room_id,
        'sender_name', NEW.sender_name,
        'content', NEW.content,
        'content_type', NEW.content_type,
        'audio_url', NEW.audio_url
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_human_message
  AFTER INSERT ON war_room_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();
```

### 3. Deploy Edge Function

```bash
cd olymp-warroom

# Install Supabase CLI if not already installed
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref mfpyyriilflviojnqhuv

# Set secrets
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-...
supabase secrets set KIMI_API_KEY=sk-o6lon3XCe7SiUPXQBGAgjc1LfNaXKkA4JQp3G14XZhatRY0Y
supabase secrets set OPENAI_API_KEY=sk-proj-...
supabase secrets set ELEVENLABS_API_KEY=sk_65f82d3154c730929ab8feae994d3b43119614b2fc05eac8
supabase secrets set OLLAMA_BASE_URL=http://172.29.96.1:11434

# Deploy function
supabase functions deploy route-message
```

## Frontend Setup

### 1. Install Dependencies

```bash
cd olymp-warroom/frontend
npm install
```

### 2. Environment Variables

Create `.env.local`:

```env
VITE_SUPABASE_URL=https://mfpyyriilflviojnqhuv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Integrate with Existing OLYMP Frontend

Add to your existing React app:

```tsx
// In your router or App.tsx
import { WarRoom } from './components/war-room/WarRoom';

function App() {
  return (
    <div className="h-screen bg-gray-900">
      <WarRoom roomId="OLYM-HQ-ID" />
    </div>
  );
}
```

Or as a separate page:

```tsx
// pages/WarRoomPage.tsx
export function WarRoomPage() {
  return (
    <div className="h-screen">
      <WarRoom roomId="OLYM-HQ-ID" />
    </div>
  );
}
```

### 4. Run Development Server

```bash
npm run dev
```

## Testing

1. **Text Message**: Type "@ARGOS what's the status?" and press Enter
2. **AI Response**: Should see ARGOS respond within 5-10 seconds
3. **Voice Message**: Click 🎤, record, click again to send
4. **Multiple Agents**: Type "Can someone review the architecture?" (should route to Claude)

## Cost Estimate

| Component | Daily Cost | Monthly |
|-----------|-----------|---------|
| Kimi Moderator (~20 routing decisions) | ~$0.50 | ~$15 |
| ARGOS via Kimi (~50 msgs) | ~$2-4 | ~$60-120 |
| Claude via API (~20 msgs) | ~$1-3 | ~$30-90 |
| **Total** | **~$3.50-7.50** | **~$105-225** |

Note: Costs drop significantly when local Ollama is used for Moderator (Phase 2).

## Next Steps

1. **Phase 1**: Text chat working (current)
2. **Phase 2**: Add local Ollama Moderator via Tailscale
3. **Phase 3**: Voice integration (Whisper + ElevenLabs)
4. **Phase 4**: Threaded replies, file sharing, multiple rooms

## Troubleshooting

**AI not responding?**
- Check Edge Function logs: `supabase functions logs route-message`
- Verify pg_net extension is enabled
- Check if API keys are set correctly

**Realtime not working?**
- Verify Realtime is enabled on `war_room_messages` table
- Check browser console for connection errors

**Voice not uploading?**
- Verify Storage bucket `war-room-audio` exists and is public
- Check RLS policies allow uploads
