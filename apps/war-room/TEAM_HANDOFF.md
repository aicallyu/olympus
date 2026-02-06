# OLYMP War Room - Team Handoff

## ✅ Completed by ARGOS (Backend & Infrastructure)

### Database (Supabase)
- ✅ Tables created: `war_rooms`, `war_room_participants`, `war_room_messages`
- ✅ Indexes for performance
- ✅ Realtime enabled on messages
- ✅ Row Level Security policies configured
- ✅ Storage bucket `war-room-audio` created
- ✅ Database trigger `on_human_message` created
- ✅ Default War Room "OLYM HQ" with ARGOS and Claude as participants

### Edge Function
- ✅ `route-message` function code complete
- ✅ Moderator logic (Kimi-based routing)
- ✅ Agent callers (Kimi, Anthropic, Ollama)
- ✅ Context builder (last 20 messages)
- ✅ Voice transcription (Whisper) stub
- ✅ Voice generation (ElevenLabs) stub

### Files Location
```
/home/onioko/.openclaw/workspace/olymp-warroom/
├── schema.sql                    # Database schema
├── trigger.sql                   # DB trigger for AI routing
├── supabase/
│   └── functions/
│       └── route-message/
│           └── index.ts          # Edge Function
├── frontend/
│   └── src/
│       ├── lib/war-room/types.ts
│       ├── hooks/
│       │   ├── useWarRoomMessages.ts
│       │   └── useVoiceRecorder.ts
│       └── components/war-room/
│           ├── WarRoom.tsx
│           └── MessageBubble.tsx
└── DEPLOYMENT.md                 # Deployment instructions
```

---

## 🔄 Next Steps (Team)

### 1. Enable pg_net Extension (Juan - 2 minutes)
**Required for AI auto-routing to work**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/mfpyyriilflviojnqhuv)
2. Database → Extensions
3. Search "pg_net"
4. Click "Enable"

Without this, the database trigger cannot call the Edge Function.

### 2. Deploy Edge Function (Nathanael or ARGOS - 5 minutes)

```bash
cd /home/onioko/.openclaw/workspace/olymp-warroom

# Install Supabase CLI globally
npm install -g supabase

# Login (one-time)
supabase login

# Link to project
supabase link --project-ref mfpyyriilflviojnqhuv

# Set environment variables
supabase secrets set ANTHROPIC_API_KEY=YOUR_ANTHROPIC_KEY
supabase secrets set KIMI_API_KEY=YOUR_KIMI_KEY
supabase secrets set OPENAI_API_KEY=YOUR_OPENAI_KEY
supabase secrets set ELEVENLABS_API_KEY=YOUR_ELEVENLABS_KEY
supabase secrets set OLLAMA_BASE_URL=http://172.29.96.1:11434

# Deploy
supabase functions deploy route-message
```

**Verify deployment:**
```bash
supabase functions list
```

### 3. Frontend Integration (Nathanael - 1-2 hours)

**Option A: Standalone War Room Page**
Create new route `/war-room` and use the `WarRoom` component directly.

**Option B: Embed in Existing Layout**
Add as a sidebar or panel in current OLYMP dashboard.

**Required setup:**
```bash
# In your existing frontend project
npm install @supabase/supabase-js

# Copy these files:
cp /home/onioko/.openclaw/workspace/olymp-warroom/frontend/src/lib/war-room/types.ts src/lib/war-room/
cp /home/onioko/.openclaw/workspace/olymp-warroom/frontend/src/hooks/* src/hooks/
cp /home/onioko/.openclaw/workspace/olymp-warroom/frontend/src/components/war-room/* src/components/war-room/

# Add to your App.tsx or router:
import { WarRoom } from './components/war-room/WarRoom';

// Use room ID from database (check war_rooms table)
<WarRoom roomId="YOUR-ROOM-ID" />
```

### 4. Testing (Juan - 10 minutes)

After deployment, test the flow:

1. **Send text message**: "@ARGOS what's the status?"
2. **Expected**: ARGOS responds within 5-10 seconds
3. **Send without mention**: "Can someone review the architecture?"
4. **Expected**: Moderator routes to Claude (or both)
5. **Check logs**: `supabase functions logs route-message --tail`

---

## 🔧 Potential Blockers

### Blocker 1: pg_net Extension Not Enabled
**Symptom**: Messages sent but no AI response
**Solution**: Enable in Dashboard (see Step 1 above)

### Blocker 2: Edge Function Not Deployed
**Symptom**: Same as above
**Solution**: Deploy function (see Step 2 above)

### Blocker 3: Missing API Keys
**Symptom**: AI responds with error or doesn't respond
**Solution**: Verify secrets are set with `supabase secrets list`

### Blocker 4: CORS Issues (Frontend)
**Symptom**: Frontend can't connect to Supabase
**Solution**: Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend .env

### Blocker 5: IPv6 for Ollama (Phase 2)
**Symptom**: Moderator falls back to keyword routing
**Solution**: Currently using Kimi for Moderator (works fine, costs ~$0.50/day)

---

## 📊 Cost Projection

| Phase | Daily Cost | Monthly |
|-------|-----------|---------|
| Phase 1 (Text only, Kimi Moderator) | ~$3-5 | ~$90-150 |
| Phase 2 (Local Ollama Moderator) | ~$2-4 | ~$60-120 |
| Phase 3 (Voice enabled) | ~$4-7 | ~$120-210 |

---

## 🎯 Success Criteria

- [ ] Text messages appear in real-time
- [ ] @mentions route to correct agent
- [ ] Moderator routing works for general questions
- [ ] AI responses appear within 10 seconds
- [ ] Voice messages upload (even if not transcribed yet)

---

## 🚀 Future Enhancements (Phase 2-4)

1. **Local Ollama Moderator** - Switch from Kimi to local Qwen for $0 routing cost
2. **Voice Transcription** - Full Whisper integration
3. **Voice Synthesis** - ElevenLabs TTS for agent responses
4. **Threaded Replies** - Reply to specific messages
5. **File Sharing** - Upload documents to War Room
6. **Multiple Rooms** - Create different War Rooms for different projects

---

## 📞 Questions?

- **Database issues**: Check schema.sql, verify tables exist
- **Function issues**: Check `supabase functions logs route-message`
- **Frontend issues**: Check browser console for Supabase connection errors
- **AI not responding**: Check pg_net extension, verify trigger exists

**Ready to deploy!** 🎉
