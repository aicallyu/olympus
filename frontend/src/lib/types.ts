export interface WarRoom {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  is_active: boolean;
  routing_mode: 'moderated' | 'all' | 'mentioned';
  created_at: string;
  updated_at: string;
}

export interface WarRoomParticipant {
  id: string;
  room_id: string;
  participant_type: 'human' | 'agent';
  participant_name: string;
  participant_config: AgentConfig | HumanConfig;
  is_active: boolean;
  joined_at: string;
}

export interface AgentConfig {
  model: string;
  endpoint: 'kimi' | 'anthropic' | 'ollama';
  system_prompt: string;
  voice_enabled: boolean;
  voice_id?: string;
  expertise: string[];
  avatar_url: string;
}

export interface HumanConfig {
  avatar_url: string;
  role: string;
}

export interface WarRoomMessage {
  id: string;
  room_id: string;
  sender_name: string;
  sender_type: 'human' | 'agent' | 'system';
  content: string;
  content_type: 'text' | 'voice' | 'image' | 'file';
  audio_url: string | null;
  metadata: MessageMetadata;
  created_at: string;
}

export interface MessageMetadata {
  model_used?: string;
  tokens_used?: number;
  response_time_ms?: number;
  routing_reason?: string;
  reply_to?: string;
  original_type?: string;
  error?: boolean;
}
