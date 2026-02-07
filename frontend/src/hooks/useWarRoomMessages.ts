import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { WarRoomMessage } from '@/lib/war-room/types';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

const PAGE_SIZE = 50;

export function useWarRoomMessages(roomId: string) {
  const [messages, setMessages] = useState<WarRoomMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadingMoreRef = useRef(false);

  // Load initial messages (most recent PAGE_SIZE, reversed to chronological)
  useEffect(() => {
    async function loadMessages() {
      setIsLoading(true);
      setHasMore(true);

      const { data } = await supabase
        .from('war_room_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (data) {
        setMessages(data.reverse());
        setHasMore(data.length === PAGE_SIZE);
      }
      setIsLoading(false);
    }
    loadMessages();
  }, [roomId]);

  // Load older messages (called when user scrolls to top)
  const loadOlderMessages = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);

    const oldest = messages[0];
    if (!oldest) {
      setIsLoadingMore(false);
      loadingMoreRef.current = false;
      return;
    }

    const { data } = await supabase
      .from('war_room_messages')
      .select('*')
      .eq('room_id', roomId)
      .lt('created_at', oldest.created_at)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (data && data.length > 0) {
      const older = data.reverse();
      setMessages(prev => {
        // Deduplicate in case realtime added one in between
        const existingIds = new Set(prev.map(m => m.id));
        const unique = older.filter(m => !existingIds.has(m.id));
        return [...unique, ...prev];
      });
      setHasMore(data.length === PAGE_SIZE);
    } else {
      setHasMore(false);
    }

    setIsLoadingMore(false);
    loadingMoreRef.current = false;
  }, [roomId, hasMore, messages]);

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
          setMessages((prev) => {
            const newMsg = payload.new as WarRoomMessage;
            // Avoid duplicates from initial load race
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
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

  return { messages, isLoading, isLoadingMore, hasMore, loadOlderMessages, sendMessage, sendVoiceMessage };
}
