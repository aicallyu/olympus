import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { agentRoutes } from '../routes/agents.js';
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
const mockSupabaseFrom = supabase.from;
describe('Agent Routes', () => {
    let app;
    beforeEach(() => {
        app = new Hono();
        app.route('/', agentRoutes);
        vi.clearAllMocks();
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });
    describe('GET /', () => {
        it('should return list of all agents', async () => {
            const mockAgents = [
                { id: '1', name: 'ARGOS', role: 'Orchestrator', status: 'active' },
                { id: '2', name: 'ATLAS', role: 'Frontend Engineer', status: 'idle' },
            ];
            mockSupabaseFrom.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: mockAgents, error: null }),
                }),
            });
            const res = await app.request('/');
            const json = await res.json();
            expect(res.status).toBe(200);
            expect(json.agents).toHaveLength(2);
            expect(json.agents[0].name).toBe('ARGOS');
        });
        it('should handle database errors', async () => {
            mockSupabaseFrom.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } }),
                }),
            });
            const res = await app.request('/');
            const json = await res.json();
            expect(res.status).toBe(500);
            expect(json.error).toBe('DB Error');
        });
    });
    describe('GET /:id', () => {
        it('should return a specific agent', async () => {
            const mockAgent = { id: '1', name: 'ARGOS', role: 'Orchestrator', status: 'active' };
            mockSupabaseFrom.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: mockAgent, error: null }),
                    }),
                }),
            });
            const res = await app.request('/1');
            const json = await res.json();
            expect(res.status).toBe(200);
            expect(json.agent.name).toBe('ARGOS');
        });
        it('should return 404 for non-existent agent', async () => {
            mockSupabaseFrom.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
                    }),
                }),
            });
            const res = await app.request('/999');
            const json = await res.json();
            expect(res.status).toBe(404);
            expect(json.error).toBe('Not found');
        });
    });
    describe('GET /:id/tasks', () => {
        it('should return tasks for an agent', async () => {
            const mockTasks = [
                { id: '1', title: 'Task 1', status: 'in_progress', assignee_id: '1' },
                { id: '2', title: 'Task 2', status: 'done', assignee_id: '1' },
            ];
            mockSupabaseFrom.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        order: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
                    }),
                }),
            });
            const res = await app.request('/1/tasks');
            const json = await res.json();
            expect(res.status).toBe(200);
            expect(json.tasks).toHaveLength(2);
        });
        it('should filter tasks by status', async () => {
            const mockTasks = [{ id: '1', title: 'Task 1', status: 'done', assignee_id: '1' }];
            // Build proper mock chain: from().select().eq().eq().order()
            const mockOrder = vi.fn().mockResolvedValue({ data: mockTasks, error: null });
            const mockEq2 = vi.fn().mockReturnValue({ order: mockOrder });
            const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
            mockSupabaseFrom.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: mockEq1,
                }),
            });
            const res = await app.request('/1/tasks?status=done');
            const json = await res.json();
            expect(res.status).toBe(200);
            expect(json.tasks).toHaveLength(1);
        });
    });
    describe('GET /:id/activity', () => {
        it('should return agent activity details', async () => {
            const mockAgent = {
                id: '1',
                name: 'ARGOS',
                status: 'active',
                current_task_id: 'task-1',
                updated_at: '2024-01-01T00:00:00Z',
                model_primary: 'openai/gpt-4'
            };
            const mockTask = { id: 'task-1', title: 'Current Task' };
            const mockTasks = [
                { status: 'done' },
                { status: 'done' },
                { status: 'in_progress' },
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
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: mockTask, error: null }),
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
                        order: vi.fn().mockReturnValue({
                            limit: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({ data: null, error: null }),
                            }),
                        }),
                    }),
                }),
            });
            const res = await app.request('/1/activity');
            const json = await res.json();
            expect(res.status).toBe(200);
            expect(json.agentId).toBe('1');
            expect(json.name).toBe('ARGOS');
            expect(json.tasksCompleted).toBe(2);
            expect(json.tasksInProgress).toBe(1);
        });
        it('should return 404 for non-existent agent', async () => {
            mockSupabaseFrom.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
                    }),
                }),
            });
            const res = await app.request('/999/activity');
            const json = await res.json();
            expect(res.status).toBe(404);
            expect(json.error).toBe('Agent not found');
        });
    });
    describe('PATCH /:id/status', () => {
        it('should update agent status', async () => {
            const mockAgent = { id: '1', name: 'ARGOS', status: 'blocked' };
            mockSupabaseFrom.mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({ data: mockAgent, error: null }),
                        }),
                    }),
                }),
            });
            const res = await app.request('/1/status', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'blocked' }),
            });
            const json = await res.json();
            expect(res.status).toBe(200);
            expect(json.agent.status).toBe('blocked');
        });
        it('should handle update errors', async () => {
            mockSupabaseFrom.mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } }),
                        }),
                    }),
                }),
            });
            const res = await app.request('/1/status', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'idle' }),
            });
            const json = await res.json();
            expect(res.status).toBe(500);
            expect(json.error).toBe('Update failed');
        });
    });
});
//# sourceMappingURL=agents.test.js.map