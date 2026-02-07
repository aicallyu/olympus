import { Hono } from 'hono';
import { supabase } from '../db/client.js';

export const projectRoutes = new Hono();

// GET /api/projects - List all projects
projectRoutes.get('/', async (c) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('name', { ascending: true });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ projects: data || [] });
});

// GET /api/projects/:id - Get specific project
projectRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return c.json({ error: error.message }, 404);
  return c.json({ project: data });
});
