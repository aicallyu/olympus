import { useState, useEffect } from 'react';

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'working' | 'offline';
  current_task_id: string | null;
  type: 'ai' | 'human';
  position: { x: number; y: number };
  targetPosition: { x: number; y: number } | null;
  activity: string;
}

interface Props {
  agent: Agent;
  onClick: () => void;
}

// Pixel art colors for each agent
const AGENT_COLORS: Record<string, { body: string; head: string; accent: string }> = {
  ARGOS: { body: '#b8965a', head: '#d4a85a', accent: '#ffd700' },
  ATLAS: { body: '#5a7c8a', head: '#7a9caa', accent: '#00d9ff' },
  ATHENA: { body: '#8a5a8a', head: '#aa7aaa', accent: '#ff6bff' },
  HERCULOS: { body: '#5a8a5a', head: '#7aaa7a', accent: '#6bff6b' },
  APOLLO: { body: '#ff6b9d', head: '#ff8aad', accent: '#ffb8d1' },
  PROMETHEUS: { body: '#ff8c42', head: '#ffaa6b', accent: '#ffc494' },
  HERMES: { body: '#6b6bff', head: '#8a8aff', accent: '#adadff' },
  Claude: { body: '#9b59b6', head: '#b07cc6', accent: '#d4a5e3' },
  Juan: { body: '#3b82f6', head: '#60a5fa', accent: '#93c5fd' },
  Nathanael: { body: '#22c55e', head: '#4ade80', accent: '#86efac' },
};

export function OfficeAgent({ agent, onClick }: Props) {
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [isWalking, setIsWalking] = useState(false);
  const colors = AGENT_COLORS[agent.name] || { body: '#666', head: '#888', accent: '#aaa' };

  // Determine facing direction based on movement
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

  // Status indicator color
  const getStatusColor = () => {
    switch (agent.status) {
      case 'working': return '#e94560';
      case 'idle': return '#ffd700';
      case 'offline': return '#666';
      default: return '#666';
    }
  };

  return (
    <div
      className="absolute cursor-pointer transition-transform hover:scale-110 z-10"
      style={{
        left: agent.position.x - 12,
        top: agent.position.y - 20,
        width: 24,
        height: 40,
      }}
      onClick={onClick}
    >
      {/* Pixel Character */}
      <div className="relative" style={{ transform: direction === 'left' ? 'scaleX(-1)' : 'scaleX(1)' }}>
        {/* Status indicator above head */}
        <div 
          className="absolute -top-3 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: getStatusColor() }}
        />
        
        {/* Head */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-sm"
          style={{ backgroundColor: colors.head }}
        />
        
        {/* Body */}
        <div 
          className="absolute top-3 left-1/2 -translate-x-1/2 w-4 h-5 rounded-sm"
          style={{ backgroundColor: colors.body }}
        />
        
        {/* Arms */}
        <div 
          className={`absolute top-4 ${isWalking ? 'animate-bounce' : ''} w-1.5 h-3 rounded-sm`}
          style={{ 
            left: direction === 'right' ? '-2px' : 'auto',
            right: direction === 'left' ? '-2px' : 'auto',
            backgroundColor: colors.accent 
          }}
        />
        <div 
          className={`absolute top-4 ${isWalking ? 'animate-bounce' : ''} w-1.5 h-3 rounded-sm`}
          style={{ 
            right: direction === 'right' ? '-2px' : 'auto',
            left: direction === 'left' ? '-2px' : 'auto',
            backgroundColor: colors.accent,
            animationDelay: '0.1s'
          }}
        />
        
        {/* Legs */}
        <div 
          className={`absolute top-8 ${isWalking ? 'animate-pulse' : ''} w-1.5 h-3 rounded-sm`}
          style={{ 
            left: '3px',
            backgroundColor: colors.body 
          }}
        />
        <div 
          className={`absolute top-8 ${isWalking ? 'animate-pulse' : ''} w-1.5 h-3 rounded-sm`}
          style={{ 
            right: '3px',
            backgroundColor: colors.body,
            animationDelay: '0.1s'
          }}
        />
        
        {/* AI indicator (small chip) */}
        {agent.type === 'ai' && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#00d9ff] rounded-full animate-pulse" />
        )}
        
        {/* Human indicator */}
        {agent.type === 'human' && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#ff6b9d] rounded-full" />
        )}
      </div>
      
      {/* Name label */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className="text-[8px] text-[#eaeaea] font-mono bg-[#16213e]/80 px-1 rounded">
          {agent.name}
        </span>
      </div>
    </div>
  );
}
