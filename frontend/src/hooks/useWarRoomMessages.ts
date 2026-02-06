import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { WarRoomMessage } from '@/lib/war-room/types';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export function useWarRoomMessages(roomId: string) {
  const [messages, setMessages] = useState<WarRoomMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial messages
  useEffect(() => {
    async function loadMessages() {
      setIsLoading(true);
      const { data } = await supabase
        .from('war_room_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (data) setMessages(data);
      setIsLoading(false);
    }
    loadMessages();
  }, [roomId]);

  // Subscribe to new messages via Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`war-room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'war_room_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresChangesPayload<{[key: string]: any}>) => {
          setMessages((prev) => [...prev, payload.new as WarRoomMessage]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'war_room_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresChangesPayload<{[key: string]: any}>) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === (payload.new as any).id ? (payload.new as WarRoomMessage) : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Send a text message
  const sendMessage = useCallback(
    async (content: string, metadata?: Record<string, any>) => {
      const { error } = await supabase.from('war_room_messages').insert({
        room_id: roomId,
        sender_name: 'Juan', // TODO: get from auth context
        sender_type: 'human',
        content,
        content_type: 'text',
        metadata: metadata || {},
      });
      if (error) {
        console.error('Failed to send:', error);
        throw error;
      }
    },
    [roomId]
  );

  // Send a voice message
  const sendVoiceMessage = useCallback(
    async (audioBlob: Blob) => {
      const fileName = `voice/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('war-room-audio')
        .upload(fileName, audioBlob, { contentType: 'audio/webm' });

      if (uploadError) {
        console.error('Upload failed:', uploadError);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('war-room-audio')
        .getPublicUrl(fileName);

      const { error } = await supabase.from('war_room_messages').insert({
        room_id: roomId,
        sender_name: 'Juan',
        sender_type: 'human',
        content: '🎤 Voice message (transcribing...)',
        content_type: 'voice',
        audio_url: urlData.publicUrl,
        metadata: {},
      });
      if (error) console.error('Failed to send voice:', error);
    },
    [roomId]
  );

  return { messages, isLoading, sendMessage, sendVoiceMessage };
}
