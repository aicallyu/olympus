import { Hono } from 'hono';
import { supabase } from '../db/client.js';

export const messageRoutes = new Hono();

// GET /api/messages?task_id=xxx - Get messages for a task
messageRoutes.get('/', async (c) => {
  const taskId = c.req.query('task_id');
  
  if (!taskId) {
    return c.json({ error: 'task_id required' }, 400);
  }
  
  const { data, error } = await supabase
    .from('messages')
    .select('*, agents:from_agent_id(name)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
  
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ messages: data });
});

// POST /api/messages - Create new message
messageRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const { task_id, from_agent_id, content, attachments = [] } = body;
  
  if (!task_id || !content) {
    return c.json({ error: 'task_id and content required' }, 400);
  }
  
  const { data, error } = await supabase
    .from('messages')
    .insert([{ task_id, from_agent_id, content, attachments }])
    .select()
    .single();
  
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ message: data }, 201);
});
