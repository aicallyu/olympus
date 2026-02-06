import { useState, useEffect } from 'react';
import { useWarRoomMessages } from '@/hooks/useWarRoomMessages';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { MessageBubble } from './MessageBubble';
import { supabase } from '@/lib/supabase';
import { Users, Plus, X, MoreVertical } from 'lucide-react';

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
  { name: 'ARGOS', expertise: ['Infrastructure', 'DevOps'], avatar: '🤖' },
  { name: 'Claude', expertise: ['Architecture', 'Strategy'], avatar: '🧠' },
  { name: 'Opus', expertise: ['Coding', 'Refactoring'], avatar: '💻' },
  { name: 'Athena', expertise: ['Frontend', 'UI/UX'], avatar: '🎨' },
];

export function WarRoom({ roomId }: Props) {
  const { messages, isLoading, sendMessage, sendVoiceMessage } = useWarRoomMessages(roomId);
  const { isRecording, duration, startRecording, stopRecording } = useVoiceRecorder();
  const [inputText, setInputText] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [roomName, setRoomName] = useState('');
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [isIntervening, setIsIntervening] = useState(false);

  // Load room info and participants
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
    
    // Check if this is an intervention (questioning another agent)
    const isQuestioning = inputText.match(/@(ARGOS|Claude|Opus|Athena).*\?/i) ||
                         inputText.match(/(stimmt das|is that correct|really|sure)\??/i);
    
    if (isQuestioning) {
      setIsIntervening(true);
      // Mark message as requiring verification
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

    // Add to database
    const { data: newParticipant } = await supabase
      .from('war_room_participants')
      .insert({
        room_id: roomId,
        participant_type: 'agent',
        participant_name: agent.name,
        participant_config: {
          expertise: agent.expertise,
          voice_enabled: true,
          voice_id: agent.name === 'ARGOS' ? 'XB0fDUnXU5powFXDhCwa' : 
                     agent.name === 'Claude' ? 'Xb7hH8MSUJpSbSDYk0k2' : null,
        },
      })
      .select()
      .single();

    if (newParticipant) {
      setParticipants(prev => [...prev, newParticipant]);
      
      // System message about new agent
      await supabase.from('war_room_messages').insert({
        room_id: roomId,
        sender_name: 'System',
        sender_type: 'system',
        content: `${agent.name} was added to the conversation.`,
        metadata: { event: 'agent_added', agent: agent.name },
      });

      // Trigger immediate context catch-up for new agent
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
    <div className="flex h-full bg-gray-900">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 bg-gray-900/50 backdrop-blur flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{roomName || 'Loading...'}</h2>
            <p className="text-xs text-white/50">
              {activeAgents.length} AI agents • {participants.length} total participants
            </p>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddAgent(true)}
              disabled={availableToAdd.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20 disabled:opacity-50 transition-colors"
            >
              <Plus size={16} />
              Add Agent
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-white/50">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-white/30">
              No messages yet. Start the conversation!
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
        <div className="px-4 py-3 border-t border-white/10 bg-gray-900/50 backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              onClick={handleVoiceToggle}
              className={`p-3 rounded-full transition-colors ${
                isRecording
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {isRecording ? `⏹ ${formatDuration(duration)}` : '🎤'}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message... Use @Agent to mention. Ask 'Is that correct?' to challenge."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
            />

            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isIntervening}
              className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isIntervening ? '...' : '➤'}
            </button>
          </div>
          
          {/* Hint */}
          <p className="text-xs text-white/30 mt-2">
            Tip: Type "@ARGOS is that correct?" or "@Claude what do you think?" to get second opinions
          </p>
        </div>
      </div>

      {/* Participants Sidebar */}
      <div className="w-64 border-l border-white/10 bg-gray-900/30 p-4 hidden lg:block">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-white/50" />
          <h3 className="text-sm font-semibold text-white">Participants</h3>
        </div>

        <div className="space-y-2">
          {participants.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-sm">
                {p.participant_type === 'human' ? '👤' : 
                 p.participant_name === 'ARGOS' ? '🤖' :
                 p.participant_name === 'Claude' ? '🧠' :
                 p.participant_name === 'Opus' ? '💻' :
                 p.participant_name === 'Athena' ? '🎨' : '🤖'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{p.participant_name}</p>
                <p className="text-xs text-white/40">
                  {p.participant_type === 'human' ? 'You' : 'AI Agent'}
                </p>
              </div>
              {p.participant_type === 'agent' && (
                <div className="w-2 h-2 rounded-full bg-green-500" title="Online" />
              )}
            </div>
          ))}
        </div>

        {availableToAdd.length > 0 && (
          <>
            <div className="border-t border-white/10 my-4" />
            <button
              onClick={() => setShowAddAgent(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors text-sm"
            >
              <Plus size={16} />
              Add Agent
            </button>
          </>
        )}
      </div>

      {/* Add Agent Modal */}
      {showAddAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/10 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Add Agent to Conversation</h3>
              <button
                onClick={() => setShowAddAgent(false)}
                className="text-white/50 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-white/50 mb-4">
              The new agent will receive the full conversation history and can participate immediately.
            </p>

            <div className="space-y-2">
              {availableToAdd.map(agent => (
                <button
                  key={agent.name}
                  onClick={() => addAgent(agent.name)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
                >
                  <span className="text-2xl">{agent.avatar}</span>
                  <div className="flex-1">
                    <p className="font-medium text-white">{agent.name}</p>
                    <p className="text-xs text-white/50">{agent.expertise.join(', ')}</p>
                  </div>
                  <Plus size={20} className="text-blue-500" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
