#!/bin/bash
# Send pending WhatsApp notifications from War Room

curl -s -X POST "https://mfpyyriilflviojnqhuv.supabase.co/functions/v1/send-notification" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mcHl5cmlpbGZsdmlvam5xaHV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIxOTQ0NywiZXhwIjoyMDg1Nzk1NDQ3fQ.7nN6dHI5kwQZDIPPxaMm49tbeof5j2ZXg889jffZK_A" \
  -H "Content-Type: application/json" \
  --max-time 30 2>&1 | logger -t olymp-notify
