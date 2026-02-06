import type { WarRoomMessage } from '@/lib/war-room/types';

interface Props {
  message: WarRoomMessage;
  isOwnMessage: boolean;
}

const AVATARS: Record<string, { emoji: string; bg: string }> = {
  Juan: { emoji: '👤', bg: 'bg-blue-600' },
  Nathanael: { emoji: '👤', bg: 'bg-green-600' },
  ARGOS: { emoji: '🤖', bg: 'bg-amber-600' },
  Claude: { emoji: '🧠', bg: 'bg-purple-600' },
  System: { emoji: '⚙️', bg: 'bg-gray-600' },
};

export function MessageBubble({ message, isOwnMessage }: Props) {
  const avatar = AVATARS[message.sender_name] ?? { emoji: '❓', bg: 'bg-gray-600' };
  const time = new Date(message.created_at).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex gap-3 px-4 py-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-10 h-10 rounded-full ${avatar.bg} flex items-center justify-center text-lg shrink-0`}
      >
        {avatar.emoji}
      </div>

      <div className={`max-w-[70%] flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-white">{message.sender_name}</span>
          {message.metadata?.model_used && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/50">
              {message.metadata.model_used}
            </span>
          )}
          <span className="text-xs text-white/30">{time}</span>
        </div>

        <div
          className={`rounded-2xl px-4 py-2.5 ${
            message.sender_type === 'system'
              ? 'bg-red-900/30 text-red-200 border border-red-800/30'
              : isOwnMessage
                ? 'bg-blue-600 text-white'
                : message.sender_type === 'agent'
                  ? 'bg-white/10 text-white border border-white/5'
                  : 'bg-white/5 text-white'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

          {message.audio_url && (
            <audio controls className="mt-2 w-full max-w-xs" preload="none">
              <source src={message.audio_url} />
            </audio>
          )}
        </div>

        {message.metadata?.routing_reason && (
          <span className="text-xs text-white/20 mt-1">{message.metadata.routing_reason}</span>
        )}
      </div>
    </div>
  );
}
