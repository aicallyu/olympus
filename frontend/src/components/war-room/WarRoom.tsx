import { useState, useEffect, useRef, useCallback } from 'react';
import { useWarRoomMessages } from '@/hooks/useWarRoomMessages';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useOlympusStore } from '@/hooks/useOlympusStore';
import { MessageBubble } from './MessageBubble';
import { supabase, supabaseUrl, supabaseAnonKey } from '@/lib/supabase';
import { Users, Plus, X, Mic, Square, Send, Loader2 } from 'lucide-react';

interface Props {
  roomId: string;
}

interface Participant {
  id: string;
  participant_name: string;
  participant_type: 'human' | 'agent';
  is_active: boolean;
}

interface DbAgent {
  id: string;
  name: string;
  role: string;
}

const AGENT_AVATARS: Record<string, string> = {
  ARGOS: '🔱',
  ATLAS: '🏛️',
  ATHENA: '🦉',
  HERCULOS: '⚙️',
  PROMETHEUS: '🔥',
  APOLLO: '🎨',
  HERMES: '📜',
  Claude: '🧠',
};

export function WarRoom({ roomId }: Props) {
  const { messages, isLoading, isLoadingMore, hasMore, loadOlderMessages, sendMessage } = useWarRoomMessages(roomId);
  const { isRecording, duration, startRecording, stopRecording } = useVoiceRecorder();
  const [inputText, setInputText] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [roomName, setRoomName] = useState('');
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [isIntervening, setIsIntervening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [dbAgents, setDbAgents] = useState<DbAgent[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevScrollHeightRef = useRef(0);
  const showToast = useOlympusStore((state) => state.showToast);

  useEffect(() => {
    loadRoomInfo();
    loadAgents();
  }, [roomId]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!isLoading) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
      isNearBottomRef.current = true;
    }
  }, [isLoading]);

  // Smart auto-scroll: only if user is near bottom
  useEffect(() => {
    if (isNearBottomRef.current && !isLoading) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Preserve scroll position after loading older messages
  useEffect(() => {
    if (!isLoadingMore && prevScrollHeightRef.current > 0) {
      const el = scrollContainerRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight - prevScrollHeightRef.current;
      }
      prevScrollHeightRef.current = 0;
    }
  }, [isLoadingMore]);

  // Handle scroll events: detect near-bottom + trigger infinite scroll at top
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    // Track if user is near the bottom (within 100px)
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceFromBottom < 100;

    // Infinite scroll: load older messages when scrolled near the top
    if (el.scrollTop < 50 && hasMore && !isLoadingMore) {
      prevScrollHeightRef.current = el.scrollHeight;
      loadOlderMessages();
    }
  }, [hasMore, isLoadingMore, loadOlderMessages]);

  async function loadAgents() {
    const { data } = await supabase
      .from('agents')
      .select('id, name, role')
      .order('name');
    if (data) setDbAgents(data);
  }

  async function loadRoomInfo() {
    const { data: room } = await supabase
      .from('war_rooms')
      .select('name')
      .eq('id', roomId)
      .single();

    if (room) setRoomName(room.name);

    const { data: parts } = await supabase
      .from('war_room_participants')
      .select('id, participant_name, participant_type, is_active')
      .eq('room_id', roomId);

    if (parts) setParticipants(parts);
  }

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const agentNames = dbAgents.map(a => a.name).join('|');
    const mentionPattern = new RegExp(`@(${agentNames}).*\\?`, 'i');
    const isQuestioning = mentionPattern.test(inputText) ||
                         /\b(stimmt das|is that correct|really|sure)\??/i.test(inputText);

    if (isQuestioning) {
      setIsIntervening(true);
      await sendMessage(inputText, { requires_verification: true, intervention: true });
      setIsIntervening(false);
    } else {
      await sendMessage(inputText);
    }

    setInputText('');
  };

  const handleVoiceToggle = async () => {
    if (isRecording) {
      try {
        const blob = await stopRecording();
        setIsTranscribing(true);
        const text = await transcribeAudio(blob);
        if (text && text.trim()) {
          await sendMessage(text, { voice_transcribed: true });
        } else {
          showToast('No speech detected in the recording', 'error');
        }
      } catch (err) {
        console.error('Transcription failed:', err);
        showToast(`Voice transcription failed: ${(err as Error).message}`, 'error');
      } finally {
        setIsTranscribing(false);
      }
    } else {
      try {
        await startRecording();
      } catch (err) {
        showToast((err as Error).message || 'Could not start recording', 'error');
      }
    }
  };

  const handleCancelRecording = async () => {
    if (isRecording) {
      try {
        await stopRecording();
      } catch {
        // discard errors on cancel
      }
    }
  };

  async function transcribeAudio(blob: Blob): Promise<string> {
    const ext = (blob as any)._ext || 'webm';
    const formData = new FormData();
    formData.append('audio', blob, `recording.${ext}`);

    const res = await fetch(`${supabaseUrl}/functions/v1/transcribe-audio`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: formData,
    });

    if (!res.ok) {
      let errDetail = '';
      try {
        const errJson = await res.json();
        errDetail = errJson.error || errJson.details || res.statusText;
      } catch {
        errDetail = await res.text().catch(() => res.statusText);
      }
      throw new Error(errDetail || `HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.text || '';
  }

  async function addAgent(agentName: string) {
    const { data: newParticipant } = await supabase
      .from('war_room_participants')
      .insert({
        room_id: roomId,
        participant_type: 'agent',
        participant_name: agentName,
        participant_config: {
          voice_enabled: true,
        },
      })
      .select()
      .single();

    if (newParticipant) {
      setParticipants(prev => [...prev, newParticipant]);

      await supabase.from('war_room_messages').insert({
        room_id: roomId,
        sender_name: 'System',
        sender_type: 'system',
        content: `${agentName} was added to the conversation.`,
        metadata: { event: 'agent_added', agent: agentName },
      });
    }

    setShowAddAgent(false);
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const activeAgents = participants.filter(p => p.participant_type === 'agent');
  const availableToAdd = dbAgents.filter(
    agent => !activeAgents.some(p => p.participant_name === agent.name)
  );

  return (
    <div className="flex flex-col md:flex-row h-[calc(100dvh-160px)] md:h-[calc(100dvh-200px)] rounded-xl border border-border overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Header */}
        <div className="px-3 py-2.5 md:px-5 md:py-3 border-b border-border bg-[rgba(10,10,14,0.6)] backdrop-blur flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <h2 className="text-xs md:text-sm font-mono uppercase tracking-[0.15em] text-text-primary truncate">{roomName || 'Loading...'}</h2>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-muted">
              {activeAgents.length} agents · {participants.length} total
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Mobile: Participants button */}
            <button
              onClick={() => setShowParticipants(true)}
              className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-[rgba(22,22,32,0.6)] text-text-secondary text-xs font-mono hover:border-primary/40 hover:text-primary transition-colors"
            >
              <Users size={14} />
              <span className="hidden sm:inline">{participants.length}</span>
            </button>

            <button
              onClick={() => setShowAddAgent(true)}
              disabled={availableToAdd.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-[rgba(22,22,32,0.6)] text-text-secondary text-xs font-mono uppercase tracking-[0.1em] hover:border-primary/40 hover:text-primary disabled:opacity-50 transition-colors"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Add Agent</span>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto py-3 md:py-4 bg-[rgba(8,8,12,0.4)] min-h-0"
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-xs font-mono text-text-muted animate-pulse">Loading messages...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-xs font-mono text-text-muted">No messages yet. Start the conversation.</span>
            </div>
          ) : (
            <>
              {/* Loading older messages indicator */}
              {isLoadingMore && (
                <div className="flex items-center justify-center py-3">
                  <Loader2 size={14} className="animate-spin text-primary mr-2" />
                  <span className="text-[10px] font-mono text-text-muted uppercase tracking-[0.15em]">Loading older messages...</span>
                </div>
              )}
              {!hasMore && messages.length > 0 && (
                <div className="flex items-center justify-center py-3">
                  <span className="text-[10px] font-mono text-text-muted uppercase tracking-[0.15em]">Beginning of conversation</span>
                </div>
              )}
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwnMessage={msg.sender_name === 'Juan'}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div
          className="px-3 py-2.5 md:px-4 md:py-3 border-t border-border bg-[rgba(10,10,14,0.6)] backdrop-blur shrink-0"
          style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom, 0px))' }}
        >
          {/* Transcribing indicator */}
          {isTranscribing && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <Loader2 size={12} className="animate-spin text-primary" />
              <span className="text-[10px] font-mono text-primary uppercase tracking-[0.15em]">Transcribing voice...</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 md:gap-2">
            {/* Voice record / cancel */}
            {isRecording ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCancelRecording}
                  className="p-2 md:p-2.5 rounded-lg border border-border bg-[rgba(22,22,32,0.6)] text-text-muted hover:text-error transition-colors"
                  title="Cancel recording"
                >
                  <X size={16} />
                </button>
                <button
                  onClick={handleVoiceToggle}
                  className="flex items-center gap-1.5 px-3 py-2 md:py-2.5 rounded-lg bg-error/20 text-error border border-error/30 animate-pulse transition-colors"
                  title="Stop and transcribe"
                >
                  <Square size={14} fill="currentColor" />
                  <span className="text-xs font-mono">{formatDuration(duration)}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleVoiceToggle}
                disabled={isTranscribing}
                className="p-2 md:p-2.5 rounded-lg bg-[rgba(22,22,32,0.6)] text-text-muted border border-border hover:border-primary/40 hover:text-primary disabled:opacity-50 transition-colors"
                title="Record voice message"
              >
                <Mic size={16} />
              </button>
            )}

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isRecording ? 'Recording...' : 'Type a message...'}
              disabled={isRecording || isTranscribing}
              className="flex-1 min-w-0 bg-[rgba(22,22,32,0.6)] border border-border rounded-lg px-3 py-2 md:px-4 md:py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/60 font-mono disabled:opacity-50"
            />

            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isIntervening || isRecording || isTranscribing}
              className="p-2 md:p-2.5 rounded-lg bg-[rgba(184,150,90,0.2)] border border-primary/30 text-primary hover:bg-[rgba(184,150,90,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Send message"
            >
              {isIntervening ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>

          <p className="text-[10px] font-mono text-text-muted mt-1 hidden md:block">
            Tip: @AGENT is that correct? — to get second opinions
          </p>
        </div>
      </div>

      {/* Participants Sidebar — desktop */}
      <div className="w-60 border-l border-border bg-[rgba(12,12,18,0.6)] p-4 hidden lg:block shrink-0">
        <ParticipantsList
          participants={participants}
          availableToAdd={availableToAdd}
          onAddAgent={() => setShowAddAgent(true)}
        />
      </div>

      {/* Participants Drawer — mobile/tablet */}
      {showParticipants && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowParticipants(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 max-w-[85vw] bg-[rgba(12,12,18,0.98)] border-l border-border p-4 overflow-y-auto animate-slide-in-right">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-text-muted" />
                <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-text-muted">Participants</h3>
              </div>
              <button
                onClick={() => setShowParticipants(false)}
                className="text-text-muted hover:text-text-primary transition-colors p-1"
              >
                <X size={18} />
              </button>
            </div>
            <ParticipantsList
              participants={participants}
              availableToAdd={availableToAdd}
              onAddAgent={() => { setShowParticipants(false); setShowAddAgent(true); }}
            />
          </div>
        </div>
      )}

      {/* Add Agent Modal */}
      {showAddAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel glow-border rounded-lg p-4 md:p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-text-primary">Add Agent</h3>
              <button
                onClick={() => setShowAddAgent(false)}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-text-secondary mb-4">
              The agent will receive full conversation context and participate immediately.
            </p>

            <div className="space-y-2">
              {availableToAdd.map(agent => (
                <button
                  key={agent.name}
                  onClick={() => addAgent(agent.name)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-[rgba(22,22,32,0.6)] hover:border-primary/40 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-[rgba(184,150,90,0.15)] border border-primary/20 flex items-center justify-center text-lg shrink-0">
                    {AGENT_AVATARS[agent.name] || '🤖'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono uppercase tracking-[0.1em] text-text-primary">{agent.name}</p>
                    <p className="text-[10px] font-mono text-text-muted">{agent.role}</p>
                  </div>
                  <Plus size={16} className="text-primary shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Shared participants list used in sidebar and drawer
function ParticipantsList({
  participants,
  availableToAdd,
  onAddAgent,
}: {
  participants: Participant[];
  availableToAdd: DbAgent[];
  onAddAgent: () => void;
}) {
  return (
    <>
      <div className="space-y-2">
        {participants.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[rgba(22,22,32,0.6)] border border-border/50"
          >
            <div className="w-8 h-8 rounded-full bg-[rgba(184,150,90,0.15)] border border-primary/20 flex items-center justify-center text-sm shrink-0">
              {p.participant_type === 'human' ? '👤' : (AGENT_AVATARS[p.participant_name] || '🤖')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono uppercase tracking-[0.1em] text-text-primary truncate">{p.participant_name}</p>
              <p className="text-[10px] font-mono text-text-muted">
                {p.participant_type === 'human' ? 'Human' : 'Agent'}
              </p>
            </div>
            {p.participant_type === 'agent' && (
              <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_6px_rgba(34,197,94,0.6)] shrink-0" />
            )}
          </div>
        ))}
      </div>

      {availableToAdd.length > 0 && (
        <>
          <div className="border-t border-border/30 my-4" />
          <button
            onClick={onAddAgent}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/20 bg-[rgba(184,150,90,0.08)] text-primary text-xs font-mono uppercase tracking-[0.1em] hover:bg-[rgba(184,150,90,0.15)] transition-colors"
          >
            <Plus size={14} />
            Add Agent
          </button>
        </>
      )}
    </>
  );
}
