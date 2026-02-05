import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { metricsRoutes } from '../routes/metrics.js';

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

describe('Metrics Routes', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/', metricsRoutes);
    vi.clearAllMocks();
  });

  describe('GET /agents', () => {
    it('should return performance stats for all agents', async () => {
      const mockAgents = [
        { id: '1', name: 'ARGOS', role: 'Orchestrator', status: 'active', current_task_id: null, model_primary: 'openai/gpt-4' },
        { id: '2', name: 'ATLAS', role: 'Frontend Engineer', status: 'idle', current_task_id: null, model_primary: 'anthropic/claude-3' },
      ];

      const mockTasks = [
        { assignee_id: '1', status: 'done' },
        { assignee_id: '1', status: 'done' },
        { assignee_id: '1', status: 'in_progress' },
        { assignee_id: '2', status: 'blocked' },
      ];

      const mockMetrics = [
        { agent_id: '1', tasks_completed: 10, tasks_failed: 1, avg_completion_time: '2:30:00', total_cost: 15.50 },
        { agent_id: '2', tasks_completed: 5, tasks_failed: 2, avg_completion_time: '1:45:00', total_cost: 8.25 },
      ];

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({ data: mockMetrics, error: null }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({ data: mockAgents, error: null }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
        });

      const res = await app.request('/agents');
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.agents).toHaveLength(2);
      expect(json.agents[0].tasksCompleted).toBe(2);
      expect(json.agents[0].tasksInProgress).toBe(1);
      expect(json.agents[0].tasksFailed).toBe(0);
    });

    it('should handle missing metrics gracefully', async () => {
      const mockAgents = [
        { id: '1', name: 'ARGOS', role: 'Orchestrator', status: 'active', current_task_id: null, model_primary: 'openai/gpt-4' },
      ];

      const mockTasks: any[] = [];

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({ data: null, error: { message: 'Metrics table not found' } }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({ data: mockAgents, error: null }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
        });

      const res = await app.request('/agents');
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.agents).toHaveLength(1);
      expect(json.agents[0].avgCompletionTime).toBe('N/A');
      expect(json.agents[0].totalCost).toBe(0);
    });

    it('should calculate success rate correctly', async () => {
      const mockAgents = [
        { id: '1', name: 'ARGOS', role: 'Orchestrator', status: 'active', current_task_id: null, model_primary: 'openai/gpt-4' },
      ];

      const mockTasks = [
        { assignee_id: '1', status: 'done' },
        { assignee_id: '1', status: 'done' },
        { assignee_id: '1', status: 'done' },
        { assignee_id: '1', status: 'blocked' },
      ];

      const mockMetrics = [
        { agent_id: '1', tasks_completed: 3, tasks_failed: 1 },
      ];

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({ data: mockMetrics, error: null }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({ data: mockAgents, error: null }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
        });

      const res = await app.request('/agents');
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.agents[0].successRate).toBe('75%');
    });

    it('should handle agents database errors', async () => {
      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({ data: null, error: { message: 'Agents fetch failed' } }),
        });

      const res = await app.request('/agents');
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe('Agents fetch failed');
    });
  });

  describe('GET /agents/:id', () => {
    it('should return stats for a specific agent', async () => {
      const mockAgent = {
        id: '1',
        name: 'ARGOS',
        role: 'Orchestrator',
        status: 'active',
      };

      const mockTasks = [
        { status: 'done', completed_at: '2024-01-02T00:00:00Z', created_at: '2024-01-01T00:00:00Z' },
        { status: 'done', completed_at: '2024-01-03T12:00:00Z', created_at: '2024-01-03T00:00:00Z' },
        { status: 'in_progress', created_at: '2024-01-04T00:00:00Z' },
      ];

      const mockMetric = {
        agent_id: '1',
        tasks_completed: 2,
        tasks_failed: 0,
        total_cost: 25.50,
        last_updated: '2024-01-01T00:00:00Z',
      };

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockAgent, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockMetric, error: null }),
            }),
          }),
        });

      const res = await app.request('/agents/1');
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.agentId).toBe('1');
      expect(json.agentName).toBe('ARGOS');
      expect(json.tasksCompleted).toBe(2);
      expect(json.tasksInProgress).toBe(1);
      expect(json.totalCost).toBe(25.50);
    });

    it('should return 404 for non-existent agent', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Agent not found' } }),
          }),
        }),
      });

      const res = await app.request('/agents/999');
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe('Agent not found');
    });

    it('should handle missing metric data gracefully', async () => {
      const mockAgent = {
        id: '1',
        name: 'ARGOS',
        role: 'Orchestrator',
        status: 'active',
      };

      const mockTasks: any[] = [];

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockAgent, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'No metrics found' } }),
            }),
          }),
        });

      const res = await app.request('/agents/1');
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.totalCost).toBe(0);
      expect(json.successRate).toBe('N/A');
    });

    it('should calculate average completion time from task data', async () => {
      const mockAgent = {
        id: '1',
        name: 'ARGOS',
        role: 'Orchestrator',
        status: 'active',
      };

      // Tasks completed in 2 hours and 4 hours respectively
      const mockTasks = [
        { status: 'done', completed_at: '2024-01-01T02:00:00Z', created_at: '2024-01-01T00:00:00Z' },
        { status: 'done', completed_at: '2024-01-01T06:00:00Z', created_at: '2024-01-01T02:00:00Z' },
      ];

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockAgent, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        });

      const res = await app.request('/agents/1');
      const json = await res.json();

      expect(res.status).toBe(200);
      // Average of 2h and 4h = 3h
      expect(json.avgCompletionTime).toBe('3h 0m');
    });
  });
});
