import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { taskRoutes } from '../routes/tasks.js';
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
describe('Task Routes', () => {
    let app;
    beforeEach(() => {
        app = new Hono();
        app.route('/', taskRoutes);
        vi.clearAllMocks();
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });
    describe('GET /', () => {
        it('should return list of all tasks', async () => {
            const mockTasks = [
                { id: '1', title: 'Task 1', status: 'inbox', priority: 'high' },
                { id: '2', title: 'Task 2', status: 'in_progress', priority: 'normal' },
            ];
            mockSupabaseFrom.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
                }),
            });
            const res = await app.request('/');
            const json = await res.json();
            expect(res.status).toBe(200);
            expect(json.tasks).toHaveLength(2);
        });
        it('should filter tasks by status', async () => {
            const mockTasks = [{ id: '1', title: 'Task 1', status: 'done' }];
            const queryChain = {
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
            };
            mockSupabaseFrom.mockReturnValue({
                select: vi.fn().mockReturnValue(queryChain),
            });
            const res = await app.request('/?status=done');
            const json = await res.json();
            expect(res.status).toBe(200);
            expect(json.tasks).toHaveLength(1);
        });
        it('should filter tasks by assignee', async () => {
            const mockTasks = [{ id: '1', title: 'Task 1', assignee_id: 'agent-1' }];
            const queryChain = {
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
            };
            mockSupabaseFrom.mockReturnValue({
                select: vi.fn().mockReturnValue(queryChain),
            });
            const res = await app.request('/?assignee=agent-1');
            expect(res.status).toBe(200);
        });
        it('should filter tasks by priority', async () => {
            const mockTasks = [{ id: '1', title: 'Task 1', priority: 'critical' }];
            const queryChain = {
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
            };
            mockSupabaseFrom.mockReturnValue({
                select: vi.fn().mockReturnValue(queryChain),
            });
            const res = await app.request('/?priority=critical');
            expect(res.status).toBe(200);
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
    describe('POST /', () => {
        it('should create a new task', async () => {
            const newTask = {
                title: 'New Task',
                description: 'Task description',
                priority: 'high',
                created_by: 'user-1',
            };
            const mockCreatedTask = { ...newTask, id: '1', status: 'inbox' };
            mockSupabaseFrom.mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: mockCreatedTask, error: null }),
                    }),
                }),
            });
            const res = await app.request('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTask),
            });
            const json = await res.json();
            expect(res.status).toBe(201);
            expect(json.task.title).toBe('New Task');
            expect(json.task.status).toBe('inbox');
        });
        it('should reject invalid task data', async () => {
            const invalidTask = {
                description: 'Missing title',
                created_by: 'user-1',
            };
            const res = await app.request('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invalidTask),
            });
            const json = await res.json();
            expect(res.status).toBe(400);
            expect(json.error).toBe('Invalid input');
        });
        it('should reject invalid priority', async () => {
            const invalidTask = {
                title: 'New Task',
                priority: 'invalid-priority',
                created_by: 'user-1',
            };
            const res = await app.request('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invalidTask),
            });
            const json = await res.json();
            expect(res.status).toBe(400);
            expect(json.error).toBe('Invalid input');
        });
        it('should use default priority when not specified', async () => {
            const newTask = {
                title: 'New Task',
                created_by: 'user-1',
            };
            const mockCreatedTask = { ...newTask, id: '1', status: 'inbox', priority: 'normal' };
            mockSupabaseFrom.mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: mockCreatedTask, error: null }),
                    }),
                }),
            });
            const res = await app.request('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTask),
            });
            const json = await res.json();
            expect(res.status).toBe(201);
            expect(json.task.priority).toBe('normal');
        });
    });
    describe('GET /:id', () => {
        it('should return a specific task with related data', async () => {
            const mockTask = {
                id: '1',
                title: 'Task 1',
                status: 'in_progress',
                messages: [{ id: 'm1', content: 'Message 1' }],
                activities: [{ id: 'a1', type: 'task_created' }],
            };
            mockSupabaseFrom.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: mockTask, error: null }),
                    }),
                }),
            });
            const res = await app.request('/1');
            const json = await res.json();
            expect(res.status).toBe(200);
            expect(json.task.title).toBe('Task 1');
            expect(json.task.messages).toHaveLength(1);
        });
        it('should return 404 for non-existent task', async () => {
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
    describe('PATCH /:id', () => {
        it('should update a task', async () => {
            const updates = { title: 'Updated Task', description: 'Updated description' };
            const mockUpdatedTask = { id: '1', ...updates };
            mockSupabaseFrom.mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({ data: mockUpdatedTask, error: null }),
                        }),
                    }),
                }),
            });
            const res = await app.request('/1', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            const json = await res.json();
            expect(res.status).toBe(200);
            expect(json.task.title).toBe('Updated Task');
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
            const res = await app.request('/1', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'Updated' }),
            });
            const json = await res.json();
            expect(res.status).toBe(500);
            expect(json.error).toBe('Update failed');
        });
    });
    describe('PATCH /:id/status', () => {
        it('should update task status', async () => {
            const mockUpdatedTask = { id: '1', status: 'in_progress' };
            mockSupabaseFrom.mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({ data: mockUpdatedTask, error: null }),
                        }),
                    }),
                }),
            });
            const res = await app.request('/1/status', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'in_progress' }),
            });
            const json = await res.json();
            expect(res.status).toBe(200);
            expect(json.task.status).toBe('in_progress');
        });
        it('should set completed_at when status is done', async () => {
            const mockUpdatedTask = {
                id: '1',
                status: 'done',
                completed_at: '2024-01-01T00:00:00Z'
            };
            mockSupabaseFrom.mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({ data: mockUpdatedTask, error: null }),
                        }),
                    }),
                }),
            });
            const res = await app.request('/1/status', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'done' }),
            });
            const json = await res.json();
            expect(res.status).toBe(200);
            expect(json.task.status).toBe('done');
            expect(json.task.completed_at).toBeDefined();
        });
    });
    describe('POST /:id/assign', () => {
        it('should assign task to an agent', async () => {
            const mockUpdatedTask = {
                id: '1',
                assignee_id: 'agent-1',
                status: 'assigned'
            };
            mockSupabaseFrom.mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({ data: mockUpdatedTask, error: null }),
                        }),
                    }),
                }),
            });
            const res = await app.request('/1/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agent_id: 'agent-1' }),
            });
            const json = await res.json();
            expect(res.status).toBe(200);
            expect(json.task.assignee_id).toBe('agent-1');
            expect(json.task.status).toBe('assigned');
        });
        it('should handle assignment errors', async () => {
            mockSupabaseFrom.mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Assignment failed' } }),
                        }),
                    }),
                }),
            });
            const res = await app.request('/1/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agent_id: 'agent-1' }),
            });
            const json = await res.json();
            expect(res.status).toBe(500);
            expect(json.error).toBe('Assignment failed');
        });
    });
});
//# sourceMappingURL=tasks.test.js.map