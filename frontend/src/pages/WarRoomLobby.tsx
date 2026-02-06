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
  { 
    name: 'ARGOS', 
    expertise: ['Infrastructure', 'DevOps', 'Local Tools'], 
    avatar: '🤖',
    selected: false 
  },
  { 
    name: 'Claude', 
    expertise: ['Architecture', 'Strategy', 'Code Review'], 
    avatar: '🧠',
    selected: false 
  },
  { 
    name: 'Opus', 
    expertise: ['Coding', 'Refactoring', 'Debugging'], 
    avatar: '💻',
    selected: false 
  },
  { 
    name: 'Athena', 
    expertise: ['Frontend', 'UI/UX', 'Design'], 
    avatar: '🎨',
    selected: false 
  },
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

  // Load existing rooms
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
        roomsData.map(async (room) => {
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
            participant_names: participants?.map(p => p.participant_name) || [],
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

    // Create room
    const { data: room } = await supabase
      .from('war_rooms')
      .insert({
        name: roomName,
        description: `Discussion with ${selectedAgents.join(', ')}`,
        routing_mode: 'moderated',
        context_mode: 'full',
      })
      .select()
      .single();

    if (!room) {
      setIsCreating(false);
      return;
    }

    // Add Juan (you)
    await supabase.from('war_room_participants').insert({
      room_id: room.id,
      participant_type: 'human',
      participant_name: 'Juan',
      participant_config: { role: 'CEO', avatar_url: '/avatars/juan.png' },
    });

    // Add selected agents
    for (const agentName of selectedAgents) {
      const agentConfig = AVAILABLE_AGENTS.find(a => a.name === agentName);
      if (agentConfig) {
        await supabase.from('war_room_participants').insert({
          room_id: room.id,
          participant_type: 'agent',
          participant_name: agentConfig.name,
          participant_config: {
            expertise: agentConfig.expertise,
            voice_enabled: true,
            voice_id: agentConfig.name === 'ARGOS' ? 'XB0fDUnXU5powFXDhCwa' : 
                       agentConfig.name === 'Claude' ? 'Xb7hH8MSUJpSbSDYk0k2' : null,
            system_prompt: `You are ${agentConfig.name}. ${agentConfig.expertise.join(', ')}.`,
          },
        });
      }
    }

    // Add system welcome message
    await supabase.from('war_room_messages').insert({
      room_id: room.id,
      sender_name: 'System',
      sender_type: 'system',
      content: `War Room "${roomName}" created. Participants: ${['Juan', ...selectedAgents].join(', ')}.`,
      content_type: 'text',
      metadata: { event: 'room_created' },
    });

    setIsCreating(false);
    setShowCreateModal(false);
    setRoomName('');
    setSelectedAgents([]);
    
    // Navigate to the new room
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">War Rooms</h1>
          <p className="text-white/50">Create conversations with AI agents</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          New Conversation
        </button>
      </div>

      {/* Room List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map(room => (
          <div
            key={room.id}
            onClick={() => navigate(`/war-room/${room.id}`)}
            className="bg-white/5 border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-white/10 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                  <MessageCircle className="text-blue-500" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{room.name}</h3>
                  <p className="text-xs text-white/40">{room.description}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-white/50">
              <div className="flex items-center gap-1">
                <Users size={14} />
                <span>{room.participant_names.length}</span>
              </div>
              <div>{room.message_count} messages</div>
              <div className="ml-auto">
                {new Date(room.last_message_at).toLocaleDateString()}
              </div>
            </div>

            <div className="flex gap-1 mt-3">
              {room.participant_names.slice(0, 4).map((name, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs"
                >
                  {name[0]}
                </div>
              ))}
              {room.participant_names.length > 4 && (
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">
                  +{room.participant_names.length - 4}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {rooms.length === 0 && (
        <div className="text-center py-12 text-white/30">
          <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
          <p>No conversations yet.</p>
          <p className="text-sm">Create your first War Room to get started.</p>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/10 rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-white mb-4">Create New Conversation</h2>
            
            <div className="mb-4">
              <label className="block text-sm text-white/70 mb-2">Room Name</label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g., Architecture Review"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm text-white/70 mb-2">
                Select Agents ({selectedAgents.length} selected)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_AGENTS.map(agent => (
                  <button
                    key={agent.name}
                    onClick={() => toggleAgent(agent.name)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedAgents.includes(agent.name)
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{agent.avatar}</span>
                      <span className="font-medium">{agent.name}</span>
                    </div>
                    <p className="text-xs text-white/50">
                      {agent.expertise.join(', ')}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createRoom}
                disabled={!roomName.trim() || selectedAgents.length === 0 || isCreating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
