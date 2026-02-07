import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Plus, Users } from 'lucide-react';

interface Agent {
  name: string;
  expertise: string[];
  avatar: string;
  selected: boolean;
}

const AVAILABLE_AGENTS: Agent[] = [
  { name: 'ARGOS', expertise: ['Infrastructure', 'DevOps', 'Local Tools'], avatar: '🔱', selected: false },
  { name: 'ATLAS', expertise: ['Architecture', 'Frontend', 'Strategy'], avatar: '🏛️', selected: false },
  { name: 'ATHENA', expertise: ['QA', 'Code Review', 'Testing'], avatar: '🦉', selected: false },
  { name: 'HERCULOS', expertise: ['Backend', 'API', 'Database'], avatar: '⚙️', selected: false },
  { name: 'PROMETHEUS', expertise: ['Perception', 'Browser Testing'], avatar: '🔥', selected: false },
  { name: 'APOLLO', expertise: ['Design', 'Visual Arts', 'UI/UX'], avatar: '🎨', selected: false },
  { name: 'HERMES', expertise: ['Comms', 'Notifications'], avatar: '📜', selected: false },
];

interface Room {
  id: string;
  name: string;
  description: string;
  participant_names: string[];
  message_count: number;
  last_message_at: string;
}

export function WarRoomLobby() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [roomName, setRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {
    const { data: roomsData } = await supabase
      .from('war_rooms')
      .select('id, name, description, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (roomsData) {
      const roomsWithDetails = await Promise.all(
        roomsData.map(async (room: {id: string, name: string, description: string | null, created_at: string}) => {
          const { data: participants } = await supabase
            .from('war_room_participants')
            .select('participant_name')
            .eq('room_id', room.id);

          const { count: messageCount } = await supabase
            .from('war_room_messages')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id);

          const { data: lastMessage } = await supabase
            .from('war_room_messages')
            .select('created_at')
            .eq('room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            id: room.id,
            name: room.name,
            description: room.description || '',
            participant_names: participants?.map((p: {participant_name: string}) => p.participant_name) || [],
            message_count: messageCount || 0,
            last_message_at: lastMessage?.created_at || room.created_at,
          };
        })
      );
      setRooms(roomsWithDetails);
    }
  }

  async function createRoom() {
    if (!roomName.trim() || selectedAgents.length === 0) return;

    setIsCreating(true);

    const { data: room } = await supabase
      .from('war_rooms')
      .insert({
        name: roomName,
        description: `Discussion with ${selectedAgents.join(', ')}`,
        routing_mode: 'moderated',
      })
      .select()
      .single();

    if (!room) {
      setIsCreating(false);
      return;
    }

    // Add both human founders
    await supabase.from('war_room_participants').insert([
      {
        room_id: room.id,
        participant_type: 'human',
        participant_name: 'Juan',
        participant_config: { role: 'CEO', avatar_url: '/avatars/juan.png' },
      },
      {
        room_id: room.id,
        participant_type: 'human',
        participant_name: 'Nathanael',
        participant_config: { role: 'CTO', avatar_url: '/avatars/nathanael.png' },
      },
    ]);

    // Add selected agents
    const agentInserts = selectedAgents
      .map((agentName) => {
        const agentConfig = AVAILABLE_AGENTS.find(a => a.name === agentName);
        if (!agentConfig) return null;
        return {
          room_id: room.id,
          participant_type: 'agent',
          participant_name: agentConfig.name,
          participant_config: {
            expertise: agentConfig.expertise,
            voice_enabled: true,
            system_prompt: `You are ${agentConfig.name}. ${agentConfig.expertise.join(', ')}.`,
          },
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (agentInserts.length > 0) {
      await supabase.from('war_room_participants').insert(agentInserts);
    }

    await supabase.from('war_room_messages').insert({
      room_id: room.id,
      sender_name: 'System',
      sender_type: 'system',
      content: `War Room "${roomName}" created. Participants: ${['Juan', 'Nathanael', ...selectedAgents].join(', ')}.`,
      content_type: 'text',
      metadata: { event: 'room_created' },
    });

    setIsCreating(false);
    setShowCreateModal(false);
    setRoomName('');
    setSelectedAgents([]);

    navigate(`/war-room/${room.id}`);
  }

  function toggleAgent(agentName: string) {
    setSelectedAgents(prev =>
      prev.includes(agentName)
        ? prev.filter(a => a !== agentName)
        : [...prev, agentName]
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-display text-xl uppercase tracking-[0.15em] text-primary">War Room</h1>
          <p className="text-xs text-text-muted font-mono uppercase tracking-[0.2em] mt-1">
            Multi-agent conversations
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/30 bg-[rgba(184,150,90,0.12)] text-primary text-xs font-mono uppercase tracking-[0.1em] hover:bg-[rgba(184,150,90,0.2)] transition-colors"
        >
          <Plus size={16} />
          New Room
        </button>
      </div>

      {/* Room List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map(room => (
          <button
            key={room.id}
            onClick={() => navigate(`/war-room/${room.id}`)}
            className="text-left rounded-xl border border-border bg-[rgba(22,22,32,0.88)] p-4 hover:border-primary/40 transition-colors animate-card-reveal"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[rgba(184,150,90,0.15)] border border-primary/20 flex items-center justify-center">
                <MessageCircle className="text-primary" size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-mono uppercase tracking-[0.1em] text-text-primary truncate">{room.name}</h3>
                <p className="text-[10px] font-mono text-text-muted truncate">{room.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted">
              <div className="flex items-center gap-1">
                <Users size={12} />
                <span>{room.participant_names.length}</span>
              </div>
              <div>{room.message_count} msgs</div>
              <div className="ml-auto">
                {new Date(room.last_message_at).toLocaleDateString()}
              </div>
            </div>

            <div className="flex gap-1.5 mt-3">
              {room.participant_names.slice(0, 5).map((name, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full bg-[rgba(184,150,90,0.12)] border border-border flex items-center justify-center text-[10px] font-mono text-text-secondary"
                >
                  {name[0]}
                </div>
              ))}
              {room.participant_names.length > 5 && (
                <div className="w-6 h-6 rounded-full bg-[rgba(184,150,90,0.12)] border border-border flex items-center justify-center text-[10px] font-mono text-text-muted">
                  +{room.participant_names.length - 5}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {rooms.length === 0 && (
        <div className="glass-panel p-12 flex flex-col items-center justify-center">
          <MessageCircle size={32} className="text-text-muted mb-3" />
          <p className="text-sm text-text-muted font-mono">No conversations yet</p>
          <p className="text-xs text-text-muted mt-1">Create your first War Room to get started</p>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel glow-border rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-primary mb-5">New War Room</h2>

            <div className="mb-4">
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted block mb-1.5">
                Room Name
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g., Architecture Review"
                className="w-full bg-[rgba(22,22,32,0.8)] border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/60 font-mono"
              />
            </div>

            <div className="mb-6">
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted block mb-2">
                Select Agents ({selectedAgents.length} selected)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_AGENTS.map(agent => (
                  <button
                    key={agent.name}
                    onClick={() => toggleAgent(agent.name)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedAgents.includes(agent.name)
                        ? 'bg-[rgba(184,150,90,0.12)] border-primary/40 text-text-primary'
                        : 'bg-[rgba(22,22,32,0.6)] border-border text-text-secondary hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{agent.avatar}</span>
                      <span className="font-mono text-xs uppercase tracking-[0.1em]">{agent.name}</span>
                    </div>
                    <p className="text-[10px] font-mono text-text-muted">
                      {agent.expertise.join(', ')}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-[rgba(22,22,32,0.6)] text-text-secondary text-xs font-mono uppercase tracking-[0.1em] hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createRoom}
                disabled={!roomName.trim() || selectedAgents.length === 0 || isCreating}
                className="flex-1 px-4 py-2.5 rounded-lg border border-primary/30 bg-[rgba(184,150,90,0.15)] text-primary text-xs font-mono uppercase tracking-[0.1em] hover:bg-[rgba(184,150,90,0.25)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? 'Creating...' : 'Create Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
