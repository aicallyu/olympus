import { Hono } from 'hono';
import { supabase } from '../db/client.js';

export const notificationRoutes = new Hono();

// GET /api/notifications?agent=xxx - Get notifications for agent
notificationRoutes.get('/', async (c) => {
  const agentId = c.req.query('agent');
  const undeliveredOnly = c.req.query('undelivered') === 'true';
  
  if (!agentId) {
    return c.json({ error: 'agent parameter required' }, 400);
  }
  
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('mentioned_agent_id', agentId);
  
  if (undeliveredOnly) {
    query = query.eq('delivered', false);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ notifications: data });
});

// PATCH /api/notifications/:id/deliver - Mark as delivered
notificationRoutes.patch('/:id/deliver', async (c) => {
  const id = c.req.param('id');
  
  const { data, error } = await supabase
    .from('notifications')
    .update({ delivered: true })
    .eq('id', id)
    .select()
    .single();
  
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ notification: data });
});
