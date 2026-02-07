import type { WarRoomMessage } from '@/lib/war-room/types';

interface Props {
  message: WarRoomMessage;
  isOwnMessage: boolean;
}

const AVATARS: Record<string, { emoji: string; bg: string }> = {
  Juan: { emoji: '👤', bg: 'bg-[rgba(59,130,246,0.25)]' },
  Nathanael: { emoji: '👤', bg: 'bg-[rgba(34,197,94,0.25)]' },
  ARGOS: { emoji: '🔱', bg: 'bg-[rgba(184,150,90,0.25)]' },
  ATLAS: { emoji: '🏛️', bg: 'bg-[rgba(184,150,90,0.25)]' },
  ATHENA: { emoji: '🦉', bg: 'bg-[rgba(139,92,246,0.25)]' },
  HERCULOS: { emoji: '⚙️', bg: 'bg-[rgba(184,150,90,0.25)]' },
  PROMETHEUS: { emoji: '🔥', bg: 'bg-[rgba(245,158,11,0.25)]' },
  APOLLO: { emoji: '🎨', bg: 'bg-[rgba(236,72,153,0.25)]' },
  HERMES: { emoji: '📜', bg: 'bg-[rgba(184,150,90,0.25)]' },
  System: { emoji: '⚙️', bg: 'bg-[rgba(118,122,132,0.25)]' },
};

export function MessageBubble({ message, isOwnMessage }: Props) {
  const avatar = AVATARS[message.sender_name] ?? { emoji: '❓', bg: 'bg-[rgba(118,122,132,0.25)]' };
  const time = new Date(message.created_at).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex gap-3 px-4 py-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-10 h-10 rounded-full ${avatar.bg} border border-primary/20 flex items-center justify-center text-lg shrink-0`}
      >
        {avatar.emoji}
      </div>

      <div className={`max-w-[70%] flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono uppercase tracking-[0.1em] text-text-primary">{message.sender_name}</span>
          {message.metadata?.model_used && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(22,22,32,0.6)] border border-border text-text-muted font-mono">
              {message.metadata.model_used}
            </span>
          )}
          <span className="text-[10px] font-mono text-text-muted">{time}</span>
        </div>

        <div
          className={`rounded-xl px-4 py-2.5 ${
            message.sender_type === 'system'
              ? 'bg-[rgba(239,68,68,0.1)] text-error border border-error/20'
              : isOwnMessage
                ? 'bg-[rgba(184,150,90,0.15)] text-text-primary border border-primary/20'
                : message.sender_type === 'agent'
                  ? 'bg-[rgba(22,22,32,0.6)] text-text-primary border border-border/50'
                  : 'bg-[rgba(22,22,32,0.4)] text-text-primary'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono">{message.content}</p>

          {message.audio_url && (
            <audio controls className="mt-2 w-full max-w-xs" preload="none">
              <source src={message.audio_url} />
            </audio>
          )}
        </div>

        {message.metadata?.routing_reason && (
          <span className="text-[10px] font-mono text-text-muted mt-1">{message.metadata.routing_reason}</span>
        )}
      </div>
    </div>
  );
}
