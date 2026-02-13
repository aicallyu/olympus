import { useEffect, useRef, useState, useCallback } from 'react';

interface Agent {
  id: string;
  name: string;
  status: 'working' | 'idle';
  color: string;
  deskItem: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  isWalking: boolean;
  walkFrame: number;
  isSitting: boolean;
}

const AGENTS: Agent[] = [
  { id: '1', name: 'ATLAS', status: 'idle', color: '#4169E1', deskItem: 'globe', x: 150, y: 250, targetX: 150, targetY: 250, isWalking: false, walkFrame: 0, isSitting: false },
  { id: '2', name: 'SCRIBE', status: 'idle', color: '#9370DB', deskItem: 'books', x: 350, y: 250, targetX: 350, targetY: 250, isWalking: false, walkFrame: 0, isSitting: false },
  { id: '3', name: 'CLAWD', status: 'working', color: '#FF8C00', deskItem: 'coffee', x: 550, y: 250, targetX: 550, targetY: 250, isWalking: false, walkFrame: 0, isSitting: true },
  { id: '4', name: 'PIXEL', status: 'idle', color: '#32CD32', deskItem: 'palette', x: 750, y: 250, targetX: 750, targetY: 250, isWalking: false, walkFrame: 0, isSitting: false },
  { id: '5', name: 'NOVA', status: 'idle', color: '#00CED1', deskItem: 'camera', x: 150, y: 450, targetX: 150, targetY: 450, isWalking: false, walkFrame: 0, isSitting: false },
  { id: '6', name: 'VIBE', status: 'working', color: '#FF1493', deskItem: 'waveform', x: 350, y: 450, targetX: 350, targetY: 450, isWalking: false, walkFrame: 0, isSitting: true },
  { id: '7', name: 'SENTINEL', status: 'idle', color: '#DC143C', deskItem: 'shield', x: 550, y: 450, targetX: 550, targetY: 450, isWalking: false, walkFrame: 0, isSitting: false },
  { id: '8', name: 'TRENDY', status: 'idle', color: '#FFD700', deskItem: 'fire', x: 750, y: 450, targetX: 750, targetY: 450, isWalking: false, walkFrame: 0, isSitting: false },
];

const CANVAS_WIDTH = 1100;
const CANVAS_HEIGHT = 720;

export function PixelOfficeNew() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [agents, setAgents] = useState<Agent[]>(AGENTS);
  const animationRef = useRef<number>();

  // Draw checkered floor
  const drawFloor = useCallback((ctx: CanvasRenderingContext2D) => {
    const tileSize = 40;
    for (let y = 0; y < CANVAS_HEIGHT; y += tileSize) {
      for (let x = 0; x < CANVAS_WIDTH; x += tileSize) {
        const isDark = ((x / tileSize) + (y / tileSize)) % 2 === 0;
        ctx.fillStyle = isDark ? '#0f172a' : '#1e293b';
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }
  }, []);

  // Draw conference room
  const drawConferenceRoom = useCallback((ctx: CanvasRenderingContext2D) => {
    // Room background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(20, 20, 280, 180);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 280, 180);

    // Label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText('Conference', 30, 40);

    // Round table
    ctx.fillStyle = '#5c4033';
    ctx.beginPath();
    ctx.ellipse(160, 110, 60, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8b4513';
    ctx.stroke();

    // Chairs around table
    const chairPositions = [[100, 70], [220, 70], [100, 150], [220, 150], [60, 110], [260, 110]];
    chairPositions.forEach(([cx, cy]) => {
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(cx - 12, cy - 8, 24, 16);
    });
  }, []);

  // Draw JARVIS Office
  const drawJarvisOffice = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(320, 20, 280, 180);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(320, 20, 280, 180);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText('JARVIS Office', 330, 40);

    // Executive desk
    ctx.fillStyle = '#4a3c28';
    ctx.fillRect(420, 100, 100, 50);
    ctx.strokeStyle = '#6b5637';
    ctx.strokeRect(420, 100, 100, 50);

    // Monitor
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(460, 70, 40, 25);
    ctx.fillStyle = '#00d9ff';
    ctx.fillRect(462, 72, 36, 21);

    // Couch
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(340, 130, 60, 30);
    ctx.fillStyle = '#a0522d';
    ctx.fillRect(340, 125, 60, 10);

    // Bookshelf
    ctx.fillStyle = '#3d2817';
    ctx.fillRect(520, 40, 60, 80);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#5c4033' : '#4a3728';
      ctx.fillRect(525, 45 + i * 25, 50, 20);
    }
  }, []);

  // Draw Kitchen
  const drawKitchen = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(620, 20, 280, 180);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(620, 20, 280, 180);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText('Kitchen', 630, 40);

    // White cabinets
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(640, 60, 120, 40);
    ctx.strokeStyle = '#d1d5db';
    ctx.strokeRect(640, 60, 120, 40);

    // Fridge
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(780, 50, 50, 100);
    ctx.strokeStyle = '#9ca3af';
    ctx.strokeRect(780, 50, 50, 100);
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(785, 60, 5, 5);

    // Coffee machine
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(850, 80, 30, 40);
    ctx.fillStyle = '#374151';
    ctx.fillRect(855, 85, 20, 15);
  }, []);

  // Draw cubicles
  const drawCubicles = useCallback((ctx: CanvasRenderingContext2D) => {
    const deskWidth = 140;
    const deskHeight = 80;
    const row1Y = 250;
    const row2Y = 420;
    const startX = 50;
    const gap = 30;

    const cubicles = [
      { x: startX, y: row1Y, name: 'ATLAS' },
      { x: startX + deskWidth + gap, y: row1Y, name: 'SCRIBE' },
      { x: startX + (deskWidth + gap) * 2, y: row1Y, name: 'CLAWD' },
      { x: startX + (deskWidth + gap) * 3, y: row1Y, name: 'PIXEL' },
      { x: startX, y: row2Y, name: 'NOVA' },
      { x: startX + deskWidth + gap, y: row2Y, name: 'VIBE' },
      { x: startX + (deskWidth + gap) * 2, y: row2Y, name: 'SENTINEL' },
      { x: startX + (deskWidth + gap) * 3, y: row2Y, name: 'TRENDY' },
    ];

    cubicles.forEach((cub, i) => {
      const agent = agents[i];
      
      // Cubicle walls
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(cub.x - 5, cub.y - 10, deskWidth + 10, 10);
      ctx.fillRect(cub.x - 5, cub.y, 5, deskHeight);
      ctx.fillRect(cub.x + deskWidth, cub.y, 5, deskHeight);

      // Desk
      ctx.fillStyle = '#4a3c28';
      ctx.fillRect(cub.x, cub.y + 20, deskWidth, 40);

      // Monitor (blue screen)
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(cub.x + 20, cub.y - 5, 40, 30);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(cub.x + 22, cub.y - 3, 36, 26);
      
      // Status dot
      ctx.fillStyle = agent.status === 'working' ? '#22c55e' : '#ef4444';
      ctx.beginPath();
      ctx.arc(cub.x + deskWidth - 15, cub.y + 10, 6, 0, Math.PI * 2);
      ctx.fill();

      // Name plate
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cub.x + 20, cub.y + deskHeight - 10, 80, 15);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(cub.name, cub.x + 25, cub.y + deskHeight);

      // Desk item
      ctx.fillStyle = agent.color;
      if (agent.deskItem === 'globe') {
        ctx.beginPath();
        ctx.arc(cub.x + deskWidth - 30, cub.y + 40, 8, 0, Math.PI * 2);
        ctx.fill();
      } else if (agent.deskItem === 'books') {
        ctx.fillRect(cub.x + deskWidth - 40, cub.y + 35, 8, 15);
        ctx.fillRect(cub.x + deskWidth - 30, cub.y + 33, 8, 17);
      } else if (agent.deskItem === 'coffee') {
        ctx.fillRect(cub.x + deskWidth - 35, cub.y + 32, 10, 12);
        ctx.fillStyle = '#6b7280';
        ctx.fillRect(cub.x + deskWidth - 33, cub.y + 30, 6, 2);
      }
    });
  }, [agents]);

  // Draw lounge
  const drawLounge = useCallback((ctx: CanvasRenderingContext2D) => {
    const loungeX = 920;
    const loungeY = 250;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(loungeX, loungeY, 160, 350);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(loungeX, loungeY, 160, 350);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText('Lounge', loungeX + 10, loungeY + 20);

    // Couch
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(loungeX + 20, loungeY + 50, 80, 30);
    ctx.fillStyle = '#a0522d';
    ctx.fillRect(loungeX + 20, loungeY + 45, 80, 8);

    // Coffee table
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(loungeX + 30, loungeY + 100, 60, 30);
    ctx.fillStyle = '#718096';
    ctx.fillRect(loungeX + 35, loungeY + 95, 50, 5);

    // Water cooler
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(loungeX + 110, loungeY + 50, 30, 50);
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(loungeX + 115, loungeY + 55, 20, 20);

    // Bean bags
    ctx.fillStyle = '#7c3aed';
    ctx.beginPath();
    ctx.ellipse(loungeX + 40, loungeY + 200, 25, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#059669';
    ctx.beginPath();
    ctx.ellipse(loungeX + 100, loungeY + 200, 25, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ping pong table
    ctx.fillStyle = '#166534';
    ctx.fillRect(loungeX + 20, loungeY + 260, 120, 60);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(loungeX + 80, loungeY + 260);
    ctx.lineTo(loungeX + 80, loungeY + 320);
    ctx.stroke();

    // Whiteboard
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(loungeX + 20, loungeY + 340, 120, 5);
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(loungeX + 20, loungeY + 330, 120, 10);
  }, []);

  // Draw plants
  const drawPlants = useCallback((ctx: CanvasRenderingContext2D) => {
    const plants = [
      { x: 10, y: 650 },
      { x: 600, y: 620 },
      { x: 1070, y: 200 },
      { x: 300, y: 620 },
    ];

    plants.forEach(plant => {
      // Pot
      ctx.fillStyle = '#8b4513';
      ctx.fillRect(plant.x, plant.y + 20, 20, 20);
      
      // Leaves
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(plant.x + 10, plant.y + 10, 12, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(plant.x + 5, plant.y + 15, 8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(plant.x + 15, plant.y + 15, 8, 0, Math.PI * 2);
      ctx.fill();
    });
  }, []);

  // Draw agent character
  const drawAgent = useCallback((ctx: CanvasRenderingContext2D, agent: Agent) => {
    const pixelSize = 2;
    
    ctx.save();
    ctx.translate(agent.x, agent.y);

    // Simple pixel art character
    // Head
    ctx.fillStyle = '#fca5a5';
    ctx.fillRect(4 * pixelSize, 0, 6 * pixelSize, 6 * pixelSize);
    
    // Hair
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(3 * pixelSize, -1 * pixelSize, 8 * pixelSize, 3 * pixelSize);
    
    // Eyes
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(5 * pixelSize, 2 * pixelSize, 1 * pixelSize, 1 * pixelSize);
    ctx.fillRect(8 * pixelSize, 2 * pixelSize, 1 * pixelSize, 1 * pixelSize);
    
    // Body (shirt)
    ctx.fillStyle = agent.color;
    if (agent.isSitting) {
      ctx.fillRect(3 * pixelSize, 6 * pixelSize, 8 * pixelSize, 8 * pixelSize);
      // Arms typing
      ctx.fillRect(1 * pixelSize, 9 * pixelSize, 3 * pixelSize, 2 * pixelSize);
      ctx.fillRect(10 * pixelSize, 9 * pixelSize, 3 * pixelSize, 2 * pixelSize);
    } else {
      ctx.fillRect(3 * pixelSize, 6 * pixelSize, 8 * pixelSize, 10 * pixelSize);
      
      // Arms
      if (agent.isWalking) {
        // Walking animation
        const armOffset = Math.sin(agent.walkFrame) * 2;
        ctx.fillRect(1 * pixelSize, 8 * pixelSize + armOffset, 2 * pixelSize, 6 * pixelSize);
        ctx.fillRect(11 * pixelSize, 8 * pixelSize - armOffset, 2 * pixelSize, 6 * pixelSize);
        
        // Legs
        const legOffset = Math.sin(agent.walkFrame) * 3;
        ctx.fillStyle = '#374151';
        ctx.fillRect(4 * pixelSize, 16 * pixelSize, 2 * pixelSize, 6 * pixelSize + legOffset);
        ctx.fillRect(8 * pixelSize, 16 * pixelSize, 2 * pixelSize, 6 * pixelSize - legOffset);
      } else {
        // Standing
        ctx.fillRect(1 * pixelSize, 8 * pixelSize, 2 * pixelSize, 8 * pixelSize);
        ctx.fillRect(11 * pixelSize, 8 * pixelSize, 2 * pixelSize, 8 * pixelSize);
        
        // Legs
        ctx.fillStyle = '#374151';
        ctx.fillRect(4 * pixelSize, 16 * pixelSize, 2 * pixelSize, 8 * pixelSize);
        ctx.fillRect(8 * pixelSize, 16 * pixelSize, 2 * pixelSize, 8 * pixelSize);
      }
    }
    
    ctx.restore();
  }, []);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      drawFloor(ctx);
      drawConferenceRoom(ctx);
      drawJarvisOffice(ctx);
      drawKitchen(ctx);
      drawCubicles(ctx);
      drawLounge(ctx);
      drawPlants(ctx);
      
      agents.forEach(agent => {
        drawAgent(ctx, agent);
      });

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [agents, drawFloor, drawConferenceRoom, drawJarvisOffice, drawKitchen, drawCubicles, drawLounge, drawPlants, drawAgent]);

  // Animation loop for walking
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents(prev => prev.map(agent => {
        if (agent.isWalking) {
          const dx = agent.targetX - agent.x;
          const dy = agent.targetY - agent.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 2) {
            const speed = 2;
            return {
              ...agent,
              x: agent.x + (dx / distance) * speed,
              y: agent.y + (dy / distance) * speed,
              walkFrame: agent.walkFrame + 0.3,
            };
          } else {
            return {
              ...agent,
              x: agent.targetX,
              y: agent.targetY,
              isWalking: false,
              isSitting: agent.status === 'working',
            };
          }
        }
        return agent;
      }));
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // Random movement for idle agents
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents(prev => prev.map(agent => {
        if (agent.status === 'idle' && !agent.isWalking && Math.random() < 0.3) {
          // Pick random target in office area
          const targets = [
            { x: 150, y: 250 }, { x: 350, y: 250 }, { x: 550, y: 250 }, { x: 750, y: 250 },
            { x: 150, y: 450 }, { x: 350, y: 450 }, { x: 550, y: 450 }, { x: 750, y: 450 },
            { x: 700, y: 100 }, // Kitchen area
            { x: 950, y: 300 }, // Lounge
          ];
          const target = targets[Math.floor(Math.random() * targets.length)];
          return {
            ...agent,
            targetX: target.x,
            targetY: target.y,
            isWalking: true,
            isSitting: false,
          };
        }
        return agent;
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center bg-[#0a0a12] min-h-screen p-4">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border border-gray-700 rounded-lg"
        style={{ imageRendering: 'pixelated' }}
      />
      
      {/* Bottom bar with agent badges */}
      <div className="mt-4 flex flex-wrap gap-3 justify-center max-w-[1100px]">
        {agents.map(agent => (
          <div
            key={agent.id}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700 bg-gray-900"
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: agent.color }}
            />
            <span className="text-sm font-mono text-gray-200">{agent.name}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                agent.status === 'working'
                  ? 'bg-green-900 text-green-300'
                  : 'bg-yellow-900 text-yellow-300'
              }`}
            >
              {agent.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
