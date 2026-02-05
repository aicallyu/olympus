import { Hono } from 'hono';
import { z } from 'zod';
import { supabase } from '../db/client.js';
const taskSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional().nullable(),
    priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
    assignee: z.string().optional().nullable(),
    status: z.enum(['inbox', 'assigned', 'in_progress', 'review', 'done', 'blocked']).optional(),
    created_by: z.string().optional(),
});
const statusSchema = z.enum(['inbox', 'assigned', 'in_progress', 'review', 'done', 'blocked']);
const isUuid = (value) => z.string().uuid().safeParse(value).success;
const resolveAgent = async (agentInput) => {
    if (isUuid(agentInput)) {
        const { data: agent, error } = await supabase
            .from('agents')
            .select('id, name')
            .eq('id', agentInput)
            .single();
        if (error || !agent)
            return { error: 'Assignee not found' };
        return { id: agent.id, name: agent.name };
    }
    const { data: agent, error } = await supabase
        .from('agents')
        .select('id, name')
        .ilike('name', agentInput)
        .single();
    if (error || !agent)
        return { error: 'Assignee not found' };
    return { id: agent.id, name: agent.name };
};
const insertStatusHistory = async (taskId, status, notes) => {
    const timestamp = new Date().toISOString();
    // Check if status_history table exists by attempting a minimal query
    const { error: checkError } = await supabase
        .from('status_history')
        .select('id', { count: 'exact', head: true });
    if (checkError && checkError.message.includes('does not exist')) {
        console.warn('status_history table does not exist, skipping history logging');
        return { error: null, timestamp };
    }
    const { error } = await supabase
        .from('status_history')
        .insert([
        {
            task_id: taskId,
            status,
            timestamp,
            notes: notes || null,
        },
    ]);
    if (error) {
        console.warn('Failed to insert status history:', error.message);
    }
    return { error: null, timestamp };
};
export const taskRoutes = new Hono();
// GET /api/tasks - List tasks (with filters)
taskRoutes.get('/', async (c) => {
    const status = c.req.query('status');
    const assignee = c.req.query('assignee');
    const priority = c.req.query('priority');
    let query = supabase.from('tasks').select('*');
    if (status)
        query = query.eq('status', status);
    if (assignee)
        query = query.eq('assignee_id', assignee);
    if (priority)
        query = query.eq('priority', priority);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error)
        return c.json({ error: error.message }, 500);
    return c.json({ tasks: data });
});
// POST /api/tasks - Create new task
taskRoutes.post('/', async (c) => {
    const body = await c.req.json();
    const parsed = taskSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Invalid input', details: parsed.error }, 400);
    }
    const { title, description, priority, assignee, status, created_by } = parsed.data;
    const assigneeInput = typeof assignee === 'string' ? assignee : undefined;
    let assigneeId;
    if (assigneeInput) {
        const resolved = await resolveAgent(assigneeInput);
        if ('error' in resolved) {
            return c.json({ error: resolved.error }, 400);
        }
        assigneeId = resolved.id;
    }
    const finalStatus = status || (assigneeId ? 'assigned' : 'inbox');
    const completedAt = finalStatus === 'done' ? new Date().toISOString() : undefined;
    const { data, error } = await supabase
        .from('tasks')
        .insert([
        {
            title,
            description,
            priority,
            assignee_id: assigneeId,
            status: finalStatus,
            created_by: created_by || 'ARGOS',
            completed_at: completedAt,
        },
    ])
        .select()
        .single();
    if (error)
        return c.json({ error: error.message }, 500);
    return c.json({ task: data }, 201);
});
// GET /api/tasks/pending?agent=:id - Polling for assigned tasks
// Option B: Polling
// Returns tasks assigned to an agent that are still in 'assigned' status
taskRoutes.get('/pending', async (c) => {
    const agent = c.req.query('agent');
    if (!agent) {
        return c.json({ error: 'agent query param is required' }, 400);
    }
    let agentId = agent;
    if (!isUuid(agent)) {
        const resolved = await resolveAgent(agent);
        if ('error' in resolved) {
            return c.json({ error: resolved.error }, 400);
        }
        agentId = resolved.id;
    }
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assignee_id', agentId)
        .eq('status', 'assigned')
        .order('created_at', { ascending: false });
    if (error)
        return c.json({ error: error.message }, 500);
    return c.json({ tasks: data });
});
// GET /api/tasks/:id - Get specific task
taskRoutes.get('/:id', async (c) => {
    const id = c.req.param('id');
    const { data, error } = await supabase
        .from('tasks')
        .select('*, messages(*), activities(*)')
        .eq('id', id)
        .single();
    if (error)
        return c.json({ error: error.message }, 404);
    return c.json({ task: data });
});
// PATCH /api/tasks/:id - Update task
taskRoutes.patch('/:id', async (c) => {
    const id = c.req.param('id');
    const updates = await c.req.json();
    const { data, error } = await supabase
        .from('tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error)
        return c.json({ error: error.message }, 500);
    return c.json({ task: data });
});
// PATCH /api/tasks/:id/status - Update task status
// Validation: IN_PROGRESS → REVIEW → DONE only (cannot skip review)
taskRoutes.patch('/:id/status', async (c) => {
    const id = c.req.param('id');
    const { status } = await c.req.json();
    if (!status) {
        return c.json({ error: 'status is required' }, 400);
    }
    const parsedStatus = statusSchema.safeParse(status);
    if (!parsedStatus.success) {
        return c.json({ error: 'Invalid status' }, 400);
    }
    const nextStatus = parsedStatus.data;
    const { data: existing, error: existingError } = await supabase
        .from('tasks')
        .select('id, status')
        .eq('id', id)
        .single();
    if (existingError || !existing) {
        return c.json({ error: existingError?.message || 'Task not found' }, 404);
    }
    if (nextStatus === 'review' && existing.status !== 'in_progress') {
        return c.json({ error: 'Tasks can only move to Review from In Progress' }, 400);
    }
    if (nextStatus === 'done' && existing.status !== 'review') {
        return c.json({ error: 'Tasks must pass through Review (ATHENA)' }, 400);
    }
    const updates = { status: nextStatus, updated_at: new Date().toISOString() };
    if (nextStatus === 'done') {
        updates.completed_at = new Date().toISOString();
    }
    const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error)
        return c.json({ error: error.message }, 500);
    // Try to insert status history, but don't fail if table doesn't exist
    await insertStatusHistory(id, nextStatus, `Status changed to ${nextStatus}`);
    // Try to fetch history, but don't fail if table doesn't exist
    let history = [];
    try {
        const { data: historyData, error: historyFetchError } = await supabase
            .from('status_history')
            .select('*')
            .eq('task_id', id)
            .order('timestamp', { ascending: true });
        if (!historyFetchError && historyData) {
            history = historyData;
        }
    }
    catch (e) {
        // Gracefully handle missing table
        console.warn('status_history table not available for fetch');
    }
    return c.json({ task: data, history });
});
const assignTaskHandler = async (c) => {
    const id = c.req.param('id');
    const { agent_id, agent, assignee } = await c.req.json();
    const agentInput = agent_id || agent || assignee;
    if (!agentInput) {
        return c.json({ error: 'agent_id is required' }, 400);
    }
    const resolved = await resolveAgent(agentInput);
    if ('error' in resolved) {
        return c.json({ error: resolved.error }, 400);
    }
    const { data, error } = await supabase
        .from('tasks')
        .update({
        assignee_id: resolved.id,
        status: 'assigned',
        updated_at: new Date().toISOString(),
    })
        .eq('id', id)
        .select()
        .single();
    if (error)
        return c.json({ error: error.message }, 500);
    // Try to insert status history, but don't fail if table doesn't exist
    await insertStatusHistory(id, 'assigned', `Assigned to ${resolved.name}`);
    return c.json({ task: data });
};
// PATCH /api/tasks/:id/assign - Assign task to agent
// (POST also supported for backward compatibility)
taskRoutes.patch('/:id/assign', assignTaskHandler);
taskRoutes.post('/:id/assign', assignTaskHandler);
//# sourceMappingURL=tasks.js.map