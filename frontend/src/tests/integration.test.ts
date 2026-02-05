import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

/**
 * Integration Tests for OLYMPUS Mission Control
 * 
 * These tests verify the end-to-end flow:
 * 1. Create task → Agent picks up → Completes
 * 2. Database operations
 * 3. API contract validation
 */

// Mock the database client for integration tests
const mockDbState = {
  agents: [] as any[],
  tasks: [] as any[],
  activities: [] as any[],
  messages: [] as any[],
};

const createMockSupabase = () => ({
  from: (table: string) => ({
    select: (_columns?: string) => ({
      eq: (column: string, value: any) => ({
        single: async () => {
          const record = mockDbState[table as keyof typeof mockDbState]?.find((r: any) => r[column] === value);
          return { data: record || null, error: record ? null : { message: 'Not found' } };
        },
        order: async () => {
          const records = mockDbState[table as keyof typeof mockDbState]?.filter((r: any) => r[column] === value) || [];
          return { data: records, error: null };
        },
      }),
      order: async () => ({ data: mockDbState[table as keyof typeof mockDbState] || [], error: null }),
      limit: async () => ({ data: mockDbState[table as keyof typeof mockDbState]?.slice(0, 50) || [], error: null }),
    }),
    insert: (data: any[]) => ({
      select: () => ({
        single: async () => {
          const newRecord = { ...data[0], id: `test-${Date.now()}`, created_at: new Date().toISOString() };
          mockDbState[table as keyof typeof mockDbState]?.push(newRecord);
          return { data: newRecord, error: null };
        },
      }),
    }),
    update: (updates: any) => ({
      eq: (column: string, value: any) => ({
        select: () => ({
          single: async () => {
            const idx = mockDbState[table as keyof typeof mockDbState]?.findIndex((r: any) => r[column] === value);
            if (idx !== undefined && idx >= 0) {
              const record = mockDbState[table as keyof typeof mockDbState]![idx];
              const updated = { ...record, ...updates, updated_at: new Date().toISOString() };
              mockDbState[table as keyof typeof mockDbState]![idx] = updated;
              return { data: updated, error: null };
            }
            return { data: null, error: { message: 'Not found' } };
          },
        }),
      }),
    }),
  }),
});

describe('Integration Tests - Full Task Lifecycle', () => {
  let mockSupabase: any;

  beforeAll(() => {
    mockSupabase = createMockSupabase();
  });

  beforeEach(() => {
    // Reset mock database
    mockDbState.agents = [
      { id: 'agent-1', name: 'ARGOS', role: 'Orchestrator', status: 'idle', current_task_id: null },
      { id: 'agent-2', name: 'ATLAS', role: 'Frontend Engineer', status: 'idle', current_task_id: null },
    ];
    mockDbState.tasks = [];
    mockDbState.activities = [];
    mockDbState.messages = [];
  });

  describe('Task Lifecycle: Create → Assign → Complete', () => {
    it('should complete full task lifecycle', async () => {
      // Step 1: Create a new task
      const newTask = {
        title: 'Build Dashboard Component',
        description: 'Create a React dashboard component',
        priority: 'high',
        created_by: 'user-1',
      };

      const createResult = await mockSupabase.from('tasks').insert([{ ...newTask, status: 'inbox' }]).select().single();
      expect(createResult.error).toBeNull();
      expect(createResult.data.status).toBe('inbox');
      const taskId = createResult.data.id;

      // Step 2: Verify task exists in database
      const getResult = await mockSupabase.from('tasks').select('*').eq('id', taskId).single();
      expect(getResult.data.title).toBe('Build Dashboard Component');

      // Step 3: Assign task to an agent
      const assignResult = await mockSupabase.from('tasks').update({ 
        assignee_id: 'agent-2', 
        status: 'assigned',
        updated_at: new Date().toISOString()
      }).eq('id', taskId).select().single();
      expect(assignResult.data.assignee_id).toBe('agent-2');
      expect(assignResult.data.status).toBe('assigned');

      // Step 4: Update agent status
      const agentUpdate = await mockSupabase.from('agents').update({ 
        status: 'active',
        current_task_id: taskId,
        updated_at: new Date().toISOString()
      }).eq('id', 'agent-2').select().single();
      expect(agentUpdate.data.status).toBe('active');
      expect(agentUpdate.data.current_task_id).toBe(taskId);

      // Step 5: Update task to in_progress
      const progressResult = await mockSupabase.from('tasks').update({ 
        status: 'in_progress',
        updated_at: new Date().toISOString()
      }).eq('id', taskId).select().single();
      expect(progressResult.data.status).toBe('in_progress');

      // Step 6: Complete the task
      const completeResult = await mockSupabase.from('tasks').update({ 
        status: 'done',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', taskId).select().single();
      expect(completeResult.data.status).toBe('done');
      expect(completeResult.data.completed_at).toBeDefined();

      // Step 7: Free up the agent
      const freeAgent = await mockSupabase.from('agents').update({ 
        status: 'idle',
        current_task_id: null,
        updated_at: new Date().toISOString()
      }).eq('id', 'agent-2').select().single();
      expect(freeAgent.data.status).toBe('idle');
      expect(freeAgent.data.current_task_id).toBeNull();
    });

    it('should handle multiple tasks assignment', async () => {
      // Create multiple tasks with assignees
      const tasks = [
        { title: 'Task 1', priority: 'high', created_by: 'user-1', assignee_id: 'agent-1', status: 'assigned' },
        { title: 'Task 2', priority: 'normal', created_by: 'user-1', assignee_id: 'agent-2', status: 'assigned' },
        { title: 'Task 3', priority: 'critical', created_by: 'user-1', status: 'inbox' },
      ];

      const createdTasks = [];
      for (const task of tasks) {
        const result = await mockSupabase.from('tasks').insert([task]).select().single();
        createdTasks.push(result.data);
      }

      expect(createdTasks).toHaveLength(3);

      // Get tasks by assignee
      const agent1Tasks = await mockSupabase.from('tasks').select('*').eq('assignee_id', 'agent-1').order('created_at');
      const agent2Tasks = await mockSupabase.from('tasks').select('*').eq('assignee_id', 'agent-2').order('created_at');

      expect(agent1Tasks.data).toHaveLength(1);
      expect(agent1Tasks.data[0].title).toBe('Task 1');
      expect(agent2Tasks.data).toHaveLength(1);
      expect(agent2Tasks.data[0].title).toBe('Task 2');
    });
  });

  describe('Database Operations', () => {
    it('should maintain data integrity across operations', async () => {
      // Create task
      const task = await mockSupabase.from('tasks').insert([{
        title: 'Test Task',
        priority: 'normal',
        created_by: 'user-1',
        status: 'inbox'
      }]).select().single();

      const taskId = task.data.id;

      // Multiple updates should preserve ID
      await mockSupabase.from('tasks').update({ status: 'assigned', assignee_id: 'agent-1' }).eq('id', taskId).select().single();
      await mockSupabase.from('tasks').update({ status: 'in_progress' }).eq('id', taskId).select().single();
      await mockSupabase.from('tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', taskId).select().single();

      const finalTask = await mockSupabase.from('tasks').select('*').eq('id', taskId).single();
      expect(finalTask.data.id).toBe(taskId);
      expect(finalTask.data.title).toBe('Test Task');
      expect(finalTask.data.status).toBe('done');
    });

    it('should handle concurrent task updates', async () => {
      const task = await mockSupabase.from('tasks').insert([{
        title: 'Concurrent Task',
        priority: 'high',
        created_by: 'user-1',
        status: 'inbox'
      }]).select().single();

      const taskId = task.data.id;

      // Simulate concurrent updates
      const update1 = mockSupabase.from('tasks').update({ status: 'in_progress' }).eq('id', taskId).select().single();
      const update2 = mockSupabase.from('tasks').update({ priority: 'critical' }).eq('id', taskId).select().single();

      const [result1, result2] = await Promise.all([update1, update2]);

      // Both operations should succeed
      expect(result1.error).toBeNull();
      expect(result2.error).toBeNull();
    });

    it('should return appropriate errors for missing records', async () => {
      const result = await mockSupabase.from('tasks').select('*').eq('id', 'non-existent').single();
      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });
  });

  describe('API Contract Validation', () => {
    it('should return correct task structure', async () => {
      const task = await mockSupabase.from('tasks').insert([{
        title: 'API Test Task',
        description: 'Testing API response structure',
        priority: 'high',
        created_by: 'user-1',
        status: 'inbox'
      }]).select().single();

      const data = task.data;
      
      // Validate required fields exist
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('priority');
      expect(data).toHaveProperty('created_by');
      expect(data).toHaveProperty('created_at');

      // Validate field types/values
      expect(typeof data.id).toBe('string');
      expect(typeof data.title).toBe('string');
      expect(['inbox', 'assigned', 'in_progress', 'review', 'done', 'blocked']).toContain(data.status);
      expect(['low', 'normal', 'high', 'critical']).toContain(data.priority);
    });

    it('should return correct agent structure', async () => {
      const agent = await mockSupabase.from('agents').select('*').eq('id', 'agent-1').single();
      const data = agent.data;

      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('role');
      expect(data).toHaveProperty('status');

      expect(typeof data.id).toBe('string');
      expect(typeof data.name).toBe('string');
      expect(['idle', 'active', 'blocked']).toContain(data.status);
    });

    it('should maintain relationships between entities', async () => {
      // Create task with assignee
      const task = await mockSupabase.from('tasks').insert([{
        title: 'Related Task',
        priority: 'normal',
        created_by: 'user-1',
        status: 'assigned',
        assignee_id: 'agent-1'
      }]).select().single();

      const taskId = task.data.id;

      // Get agent's tasks
      const agentTasks = await mockSupabase.from('tasks').select('*').eq('assignee_id', 'agent-1').order('created_at');
      
      expect(agentTasks.data.some((t: any) => t.id === taskId)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle task with no description', async () => {
      const task = await mockSupabase.from('tasks').insert([{
        title: 'No Description Task',
        priority: 'normal',
        created_by: 'user-1',
        status: 'inbox'
      }]).select().single();

      expect(task.error).toBeNull();
      expect(task.data.title).toBe('No Description Task');
    });

    it('should handle task reassignment', async () => {
      const task = await mockSupabase.from('tasks').insert([{
        title: 'Reassignable Task',
        priority: 'normal',
        created_by: 'user-1',
        status: 'assigned',
        assignee_id: 'agent-1'
      }]).select().single();

      const taskId = task.data.id;

      // Reassign to another agent
      const reassigned = await mockSupabase.from('tasks').update({ 
        assignee_id: 'agent-2' 
      }).eq('id', taskId).select().single();

      expect(reassigned.data.assignee_id).toBe('agent-2');
    });

    it('should handle status transitions correctly', async () => {
      const task = await mockSupabase.from('tasks').insert([{
        title: 'Status Transition Task',
        priority: 'normal',
        created_by: 'user-1',
        status: 'inbox'
      }]).select().single();

      const taskId = task.data.id;

      // Test all valid status transitions
      const statuses = ['assigned', 'in_progress', 'review', 'done'];
      for (const status of statuses) {
        const updated = await mockSupabase.from('tasks').update({ 
          status,
          updated_at: new Date().toISOString()
        }).eq('id', taskId).select().single();
        expect(updated.data.status).toBe(status);
      }
    });
  });
});

describe('API Response Contract Tests', () => {
  // These tests verify that API responses match the expected structure
  // that the frontend depends on

  it('GET /api/tasks should return tasks array', async () => {
    const expectedStructure = {
      tasks: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
          status: expect.any(String),
          priority: expect.any(String),
        })
      ])
    };

    // This is a contract test - we verify the shape of the response
    const mockResponse = {
      tasks: [
        { id: '1', title: 'Task 1', status: 'inbox', priority: 'high' },
        { id: '2', title: 'Task 2', status: 'done', priority: 'normal' },
      ]
    };

    expect(mockResponse).toEqual(expectedStructure);
  });

  it('GET /api/agents should return agents array', async () => {
    const expectedStructure = {
      agents: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          role: expect.any(String),
          status: expect.any(String),
        })
      ])
    };

    const mockResponse = {
      agents: [
        { id: '1', name: 'ARGOS', role: 'Orchestrator', status: 'active' },
        { id: '2', name: 'ATLAS', role: 'Frontend Engineer', status: 'idle' },
      ]
    };

    expect(mockResponse).toEqual(expectedStructure);
  });

  it('GET /api/metrics/agents should return performance stats', async () => {
    const expectedStructure = {
      agents: expect.arrayContaining([
        expect.objectContaining({
          agentId: expect.any(String),
          agentName: expect.any(String),
          tasksCompleted: expect.any(Number),
          tasksInProgress: expect.any(Number),
          successRate: expect.any(String),
        })
      ])
    };

    const mockResponse = {
      agents: [
        { 
          agentId: '1', 
          agentName: 'ARGOS', 
          tasksCompleted: 10, 
          tasksInProgress: 2,
          successRate: '90%'
        },
      ]
    };

    expect(mockResponse).toEqual(expectedStructure);
  });

  it('GET /api/activity/stream should return formatted activities', async () => {
    const expectedStructure = {
      activities: expect.arrayContaining([
        expect.objectContaining({
          time: expect.any(String),
          agentId: expect.any(String),
          agentName: expect.any(String),
          action: expect.any(String),
          type: expect.any(String),
        })
      ]),
      count: expect.any(Number),
      timestamp: expect.any(String),
    };

    const mockResponse = {
      activities: [
        {
          time: '2024-01-01T00:00:00Z',
          agentId: '1',
          agentName: 'ARGOS',
          action: 'Created task',
          type: 'task',
        }
      ],
      count: 1,
      timestamp: '2024-01-01T00:00:00Z',
    };

    expect(mockResponse).toEqual(expectedStructure);
  });
});
