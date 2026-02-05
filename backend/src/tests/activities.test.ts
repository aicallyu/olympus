import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { activityRoutes } from '../routes/activities.js';

// Mock Supabase client - must define inside vi.mock due to hoisting
vi.mock('../db/client.js', () => {
  const mockSupabaseFrom = vi.fn();
  return {
    supabase: {
      from: mockSupabaseFrom,
    },
  };
});

// Import the mocked module to access mock functions
import { supabase } from '../db/client.js';
const mockSupabaseFrom = supabase.from as ReturnType<typeof vi.fn>;

describe('Activity Routes', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/', activityRoutes);
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    it('should return activity feed', async () => {
      const mockActivities = [
        { 
          id: '1', 
          type: 'task_created', 
          agent_id: '1',
          message: 'Created new task',
          created_at: '2024-01-01T00:00:00Z',
          agents: { name: 'ARGOS' }
        },
        { 
          id: '2', 
          type: 'task_completed', 
          agent_id: '2',
          message: 'Completed task',
          created_at: '2024-01-01T01:00:00Z',
          agents: { name: 'ATLAS' }
        },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: mockActivities, error: null }),
          }),
        }),
      });

      const res = await app.request('/');
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.activities).toHaveLength(2);
    });

    it('should respect limit parameter', async () => {
      const mockActivities = Array(10).fill(null).map((_, i) => ({
        id: String(i),
        type: 'task_created',
        message: `Activity ${i}`,
        created_at: '2024-01-01T00:00:00Z',
      }));

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: mockActivities.slice(0, 5), error: null }),
          }),
        }),
      });

      const res = await app.request('/?limit=5');
      expect(res.status).toBe(200);
    });

    it('should handle database errors', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } }),
          }),
        }),
      });

      const res = await app.request('/');
      expect(res.status).toBe(500);
    });
  });

  describe('GET /stream', () => {
    it('should return formatted activity stream', async () => {
      const mockActivities = [
        { 
          id: '1', 
          type: 'task_created', 
          agent_id: '1',
          message: 'Created new task',
          created_at: '2024-01-01T00:00:00Z',
          metadata: { taskId: 'task-1' },
          agents: { name: 'ARGOS', role: 'Orchestrator' }
        },
      ];

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: mockActivities, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        });

      const res = await app.request('/stream');
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.activities).toHaveLength(1);
      expect(json.activities[0].agentName).toBe('ARGOS');
      expect(json.activities[0].icon).toBe('🏛️'); // Orchestrator icon
      expect(json.activities[0].type).toBe('task');
    });

    it('should include timestamp in response', async () => {
      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        });

      const res = await app.request('/stream');
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.timestamp).toBeDefined();
      expect(new Date(json.timestamp)).toBeInstanceOf(Date);
    });

    it('should handle agent_activities table errors gracefully', async () => {
      const mockActivities = [
        { 
          id: '1', 
          type: 'task_created', 
          agent_id: '1',
          message: 'Created',
          created_at: '2024-01-01T00:00:00Z',
          agents: { name: 'ARGOS', role: 'Orchestrator' }
        },
      ];

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: mockActivities, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'Table not found' } }),
            }),
          }),
        });

      const res = await app.request('/stream');
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.activities).toHaveLength(1);
    });

    it('should avoid duplicate activities from both tables', async () => {
      const mockActivities = [
        { 
          id: '1', 
          type: 'task_created', 
          agent_id: '1',
          message: 'Created',
          created_at: '2024-01-01T00:00:00Z',
          agents: { name: 'ARGOS', role: 'Orchestrator' }
        },
      ];

      const mockAgentActivities = [
        { 
          id: '1', 
          type: 'task', 
          agent_id: '1',
          action: 'Created',
          created_at: '2024-01-01T00:00:00Z', // Same timestamp - duplicate
          agents: { name: 'ARGOS', role: 'Orchestrator' }
        },
      ];

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: mockActivities, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: mockAgentActivities, error: null }),
            }),
          }),
        });

      const res = await app.request('/stream');
      const json = await res.json();

      expect(res.status).toBe(200);
      // Should only have 1 activity despite duplicate from second table
      expect(json.activities).toHaveLength(1);
    });

    it('should assign correct icons based on agent role', async () => {
      // Test the getAgentIcon function behavior through the API response
      const mockActivities = [
        { id: '1', type: 'task_created', agent_id: '1', message: 'Created', created_at: '2024-01-01T00:00:00Z', agents: { name: 'ARGOS', role: 'Orchestrator' } },
      ];

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: mockActivities, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        });

      const res = await app.request('/stream');
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.activities).toHaveLength(1);
      // Verify icon is assigned (either specific role icon or default)
      expect(json.activities[0].icon).toBeDefined();
    });
  });
});
