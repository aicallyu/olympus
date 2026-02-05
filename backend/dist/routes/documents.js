import { Hono } from 'hono';
import { supabase } from '../db/client.js';
export const documentRoutes = new Hono();
// GET /api/documents?task_id=xxx - Get documents for a task
documentRoutes.get('/', async (c) => {
    const taskId = c.req.query('task_id');
    let query = supabase
        .from('documents')
        .select('*, agents:created_by(name)')
        .order('created_at', { ascending: false });
    if (taskId)
        query = query.eq('task_id', taskId);
    const { data, error } = await query;
    if (error)
        return c.json({ error: error.message }, 500);
    return c.json({ documents: data });
});
// POST /api/documents - Create new document
documentRoutes.post('/', async (c) => {
    const body = await c.req.json();
    const { title, content, type, task_id, created_by, file_path } = body;
    if (!title) {
        return c.json({ error: 'title required' }, 400);
    }
    const { data, error } = await supabase
        .from('documents')
        .insert([{ title, content, type, task_id, created_by, file_path }])
        .select()
        .single();
    if (error)
        return c.json({ error: error.message }, 500);
    return c.json({ document: data }, 201);
});
// GET /api/documents/:id - Get specific document
documentRoutes.get('/:id', async (c) => {
    const id = c.req.param('id');
    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();
    if (error)
        return c.json({ error: error.message }, 404);
    return c.json({ document: data });
});
//# sourceMappingURL=documents.js.map