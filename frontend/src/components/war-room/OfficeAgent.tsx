import { useState, useEffect } from 'react';

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'working' | 'offline';
  type: 'ai' | 'human';
  position: { x: number; y: number };
  targetPosition: { x: number; y: number } | null;
  state: 'working' | 'break' | 'training' | 'meeting' | 'idle';
}

interface Theme {
  primary: string;
  secondary: string;
  accent: string;
}

interface Props {
  agent: Agent;
  theme: Theme;
  onClick: () => void;
}

// Olymp God Sprites - Each with unique visual identity
const GOD_SPRITES: Record<string, { 
  head: string; 
  body: string; 
  detail: string;
  crown?: boolean;
  helmet?: boolean;
  wings?: boolean;
  staff?: boolean;
}> = {
  ARGOS: { head: '#FFD700', body: '#B8860B', detail: '#FFA500', crown: true },
  ATLAS: { head: '#87CEEB', body: '#4682B4', detail: '#00CED1', helmet: true },
  HERCULOS: { head: '#CD5C5C', body: '#8B0000', detail: '#FF4500', helmet: true },
  ATHENA: { head: '#E6E6FA', body: '#C0C0C0', detail: '#D3D3D3', helmet: true },
  APOLLO: { head: '#FFB6C1', body: '#FF1493', detail: '#FF69B4', staff: true },
  PROMETHEUS: { head: '#90EE90', body: '#228B22', detail: '#32CD32' },
  HERMES: { head: '#F4A460', body: '#D2691E', detail: '#CD853F', wings: true },
  Claude: { head: '#DDA0DD', body: '#9370DB', detail: '#BA55D3', staff: true },
  Juan: { head: '#4169E1', body: '#0000CD', detail: '#1E90FF', crown: true },
  Nathanael: { head: '#20B2AA', body: '#008080', detail: '#48D1CC' },
};

export function OfficeAgent({ agent, theme, onClick }: Props) {
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [isWalking, setIsWalking] = useState(false);
  const sprite = GOD_SPRITES[agent.name] || { head: '#888', body: '#666', detail: '#aaa' };

  useEffect(() => {
    if (agent.targetPosition) {
      setIsWalking(true);
      const dx = agent.targetPosition.x - agent.position.x;
      if (dx > 0) setDirection('right');
      else if (dx < 0) setDirection('left');
    } else {
      setIsWalking(false);
    }
  }, [agent.targetPosition, agent.position]);

  const getStatusColor = () => {
    switch (agent.state) {
      case 'working': return '#e94560';
      case 'meeting': return '#00d9ff';
      case 'break': return '#ffd700';
      default: return '#22c55e';
    }
  };

  return (
    <div
      className="absolute cursor-pointer z-40 transition-transform hover:scale-110"
      style={{ left: agent.position.x - 16, top: agent.position.y - 32, width: 32, height: 64 }}
      onClick={onClick}
    >
      <div className="relative" style={{ transform: direction === 'left' ? 'scaleX(-1)' : 'scaleX(1)' }}>
        {/* Status Aura */}
        <div 
          className="absolute -top-4 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full animate-pulse"
          style={{ backgroundColor: getStatusColor(), boxShadow: `0 0 12px ${getStatusColor()}` }}
        />
        
        {/* Crown for Kings */}
        {sprite.crown && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-2">
            <div className="w-full h-full bg-[#FFD700]" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
          </div>
        )}

        {/* Wings for Hermes */}
        {sprite.wings && (
          <>
            <div className="absolute top-2 -left-2 w-3 h-4 bg-[#F4A460] rounded-full opacity-80" />
            <div className="absolute top-2 -right-2 w-3 h-4 bg-[#F4A460] rounded-full opacity-80" />
          </>
        )}

        {/* Helmet for Warriors */}
        {sprite.helmet && (
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-3 bg-[#C0C0C0] rounded-t-sm" />
        )}
        
        {/* Head */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-sm" style={{ backgroundColor: sprite.head }} />
        
        {/* Body - Toga for AI, Suit for Humans */}
        <div 
          className={`absolute top-4 left-1/2 -translate-x-1/2 ${agent.type === 'human' ? 'w-5 h-7' : 'w-4 h-6'} rounded-sm`}
          style={{ backgroundColor: sprite.body }}
        >
          {agent.type === 'human' && (
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-3 bg-[#4169E1] rounded-sm" />
          )}
        </div>
        
        {/* Arms */}
        <div className={`absolute top-5 w-2 h-4 rounded-sm ${isWalking ? 'animate-bounce' : ''}`}
          style={{ left: direction === 'right' ? '-3px' : 'auto', right: direction === 'left' ? '-3px' : 'auto', backgroundColor: sprite.detail }} />
        <div className={`absolute top-5 w-2 h-4 rounded-sm ${isWalking ? 'animate-bounce' : ''}`}
          style={{ right: direction === 'right' ? '-3px' : 'auto', left: direction === 'left' ? '-3px' : 'auto', backgroundColor: sprite.detail, animationDelay: '0.15s' }} />
        
        {/* Legs */}
        <div className={`absolute top-10 w-2 h-4 rounded-sm ${isWalking ? 'animate-pulse' : ''}`}
          style={{ left: '4px', backgroundColor: sprite.body }} />
        <div className={`absolute top-10 w-2 h-4 rounded-sm ${isWalking ? 'animate-pulse' : ''}`}
          style={{ right: '4px', backgroundColor: sprite.body, animationDelay: '0.1s' }} />

        {/* Staff for ARGOS and Claude */}
        {sprite.staff && (
          <div className="absolute top-6 -right-3 w-0.5 h-8 rounded-full" style={{ backgroundColor: sprite.detail }} />
        )}
      </div>
      
      {/* Moving label */}
      {agent.targetPosition && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-[9px] text-[#eaeaea] font-mono bg-[#0a0a0f]/90 px-2 py-0.5 rounded-full border"
            style={{ borderColor: theme.primary + '40' }}>
            {agent.name}
          </span>
        </div>
      )}
    </div>
  );
}
