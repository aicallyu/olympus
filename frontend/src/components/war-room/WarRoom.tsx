import { useState, useEffect } from 'react';
import { useWarRoomMessages } from '@/hooks/useWarRoomMessages';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { MessageBubble } from './MessageBubble';
import { supabase } from '@/lib/supabase';
import { Users, Plus, X } from 'lucide-react';

interface Props {
  roomId: string;
}

interface Participant {
  id: string;
  participant_name: string;
  participant_type: 'human' | 'agent';
  is_active: boolean;
}

const AVAILABLE_AGENTS = [
  { name: 'ARGOS', expertise: ['Infrastructure', 'DevOps'], avatar: '🔱' },
  { name: 'ATLAS', expertise: ['Architecture', 'Frontend'], avatar: '🏛️' },
  { name: 'ATHENA', expertise: ['QA', 'Code Review'], avatar: '🦉' },
  { name: 'HERCULOS', expertise: ['Backend', 'API'], avatar: '⚙️' },
  { name: 'PROMETHEUS', expertise: ['Testing', 'Perception'], avatar: '🔥' },
  { name: 'APOLLO', expertise: ['Design', 'Visual Arts'], avatar: '🎨' },
  { name: 'HERMES', expertise: ['Comms', 'Notifications'], avatar: '📜' },
];

export function WarRoom({ roomId }: Props) {
  const { messages, isLoading, sendMessage, sendVoiceMessage } = useWarRoomMessages(roomId);
  const { isRecording, duration, startRecording, stopRecording } = useVoiceRecorder();
  const [inputText, setInputText] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [roomName, setRoomName] = useState('');
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [isIntervening, setIsIntervening] = useState(false);

  useEffect(() => {
    loadRoomInfo();
  }, [roomId]);

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

    const isQuestioning = inputText.match(/@(ARGOS|ATLAS|ATHENA|HERCULOS|PROMETHEUS|APOLLO|HERMES).*\?/i) ||
                         inputText.match(/(stimmt das|is that correct|really|sure)\??/i);

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
      const blob = await stopRecording();
      await sendVoiceMessage(blob);
    } else {
      await startRecording();
    }
  };

  async function addAgent(agentName: string) {
    const agent = AVAILABLE_AGENTS.find(a => a.name === agentName);
    if (!agent) return;

    const { data: newParticipant } = await supabase
      .from('war_room_participants')
      .insert({
        room_id: roomId,
        participant_type: 'agent',
        participant_name: agent.name,
        participant_config: {
          expertise: agent.expertise,
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
        content: `${agent.name} was added to the conversation.`,
        metadata: { event: 'agent_added', agent: agent.name },
      });

      await supabase.functions.invoke('route-message', {
        body: {
          room_id: roomId,
          sender_name: 'System',
          content: `[Context Catch-up] ${agent.name} has joined. Please review the conversation history and acknowledge.`,
          is_context_catchup: true,
          target_agent: agent.name,
        },
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
  const availableToAdd = AVAILABLE_AGENTS.filter(
    agent => !activeAgents.some(p => p.participant_name === agent.name)
  );

  return (
    <div className="flex h-[calc(100vh-200px)] rounded-xl border border-border overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-5 py-3 border-b border-border bg-[rgba(10,10,14,0.6)] backdrop-blur flex items-center justify-between">
          <div>
            <h2 className="text-sm font-mono uppercase tracking-[0.15em] text-text-primary">{roomName || 'Loading...'}</h2>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-muted">
              {activeAgents.length} agents · {participants.length} participants
            </p>
          </div>

          <button
            onClick={() => setShowAddAgent(true)}
            disabled={availableToAdd.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-[rgba(22,22,32,0.6)] text-text-secondary text-xs font-mono uppercase tracking-[0.1em] hover:border-primary/40 hover:text-primary disabled:opacity-50 transition-colors"
          >
            <Plus size={14} />
            Add Agent
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 bg-[rgba(8,8,12,0.4)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-xs font-mono text-text-muted animate-pulse">Loading messages...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-xs font-mono text-text-muted">No messages yet. Start the conversation.</span>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwnMessage={msg.sender_name === 'Juan'}
              />
            ))
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border bg-[rgba(10,10,14,0.6)] backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              onClick={handleVoiceToggle}
              className={`p-2.5 rounded-lg transition-colors ${
                isRecording
                  ? 'bg-error/20 text-error border border-error/30 animate-pulse'
                  : 'bg-[rgba(22,22,32,0.6)] text-text-muted border border-border hover:border-primary/40 hover:text-primary'
              }`}
            >
              {isRecording ? `⏹ ${formatDuration(duration)}` : '🎤'}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message... Use @Agent to mention"
              className="flex-1 bg-[rgba(22,22,32,0.6)] border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/60 font-mono"
            />

            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isIntervening}
              className="p-2.5 rounded-lg bg-[rgba(184,150,90,0.2)] border border-primary/30 text-primary hover:bg-[rgba(184,150,90,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isIntervening ? '...' : '➤'}
            </button>
          </div>

          <p className="text-[10px] font-mono text-text-muted mt-1.5">
            Tip: @AGENT is that correct? — to get second opinions
          </p>
        </div>
      </div>

      {/* Participants Sidebar */}
      <div className="w-60 border-l border-border bg-[rgba(12,12,18,0.6)] p-4 hidden lg:block">
        <div className="flex items-center gap-2 mb-4">
          <Users size={14} className="text-text-muted" />
          <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-text-muted">Participants</h3>
        </div>

        <div className="space-y-2">
          {participants.map((p) => {
            const agentInfo = AVAILABLE_AGENTS.find(a => a.name === p.participant_name);
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[rgba(22,22,32,0.6)] border border-border/50"
              >
                <div className="w-8 h-8 rounded-full bg-[rgba(184,150,90,0.15)] border border-primary/20 flex items-center justify-center text-sm">
                  {p.participant_type === 'human' ? '👤' : (agentInfo?.avatar || '🤖')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono uppercase tracking-[0.1em] text-text-primary truncate">{p.participant_name}</p>
                  <p className="text-[10px] font-mono text-text-muted">
                    {p.participant_type === 'human' ? 'You' : 'Agent'}
                  </p>
                </div>
                {p.participant_type === 'agent' && (
                  <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                )}
              </div>
            );
          })}
        </div>

        {availableToAdd.length > 0 && (
          <>
            <div className="border-t border-border/30 my-4" />
            <button
              onClick={() => setShowAddAgent(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/20 bg-[rgba(184,150,90,0.08)] text-primary text-xs font-mono uppercase tracking-[0.1em] hover:bg-[rgba(184,150,90,0.15)] transition-colors"
            >
              <Plus size={14} />
              Add Agent
            </button>
          </>
        )}
      </div>

      {/* Add Agent Modal */}
      {showAddAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel glow-border rounded-lg p-6 w-full max-w-md">
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
                  <div className="w-10 h-10 rounded-full bg-[rgba(184,150,90,0.15)] border border-primary/20 flex items-center justify-center text-lg">
                    {agent.avatar}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-mono uppercase tracking-[0.1em] text-text-primary">{agent.name}</p>
                    <p className="text-[10px] font-mono text-text-muted">{agent.expertise.join(', ')}</p>
                  </div>
                  <Plus size={16} className="text-primary" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
