import { Hono } from 'hono';
import { supabase } from '../db/client.js';

export const agentRoutes = new Hono();

// GET /api/agents - List all agents
agentRoutes.get('/', async (c) => {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .order('name');
  
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ agents: data });
});

// GET /api/agents/:id/profile - Get agent profile details
agentRoutes.get('/:id/profile', async (c) => {
  const id = c.req.param('id');

  try {
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (agentError || !agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }

    const { data: metrics, error: metricsError } = await supabase
      .from('agent_metrics')
      .select('*')
      .eq('agent_id', id)
      .maybeSingle();

    if (metricsError) {
      return c.json({ error: metricsError.message }, 500);
    }

    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('*, tasks:task_id(id, title), agents:agent_id(name, role)')
      .eq('agent_id', id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (activitiesError) {
      return c.json({ error: activitiesError.message }, 500);
    }

    let agentActivities: any[] | null = null;
    let agentActivitiesError: any = null;

    try {
      const result = await supabase
        .from('agent_activities')
        .select('*, agents:agent_id(name, role)')
        .eq('agent_id', id)
        .order('created_at', { ascending: false })
        .limit(100);
      agentActivities = result.data || null;
      agentActivitiesError = result.error;
    } catch (err) {
      agentActivitiesError = err;
    }

    if (agentActivitiesError) {
      // agent_activities table may not exist yet; ignore to keep profile usable
      agentActivities = agentActivities || [];
    }

    const formattedActivities: any[] = [];

    if (activities) {
      for (const activity of activities) {
        formattedActivities.push({
          time: activity.created_at,
          agentId: activity.agent_id,
          agentName: activity.agents?.name || agent.name,
          agentRole: activity.agents?.role || agent.role,
          action: activity.message,
          type: mapActivityType(activity.type),
          taskId: activity.task_id,
          taskTitle: activity.tasks?.title || null,
          metadata: activity.metadata,
        });
      }
    }

    if (agentActivities && agentActivities.length > 0) {
      for (const activity of agentActivities) {
        formattedActivities.push({
          time: activity.created_at,
          agentId: activity.agent_id,
          agentName: activity.agents?.name || agent.name,
          agentRole: activity.agents?.role || agent.role,
          action: activity.action,
          type: activity.type,
          taskId: activity.task_id,
          taskTitle: null,
          metadata: activity.metadata,
        });
      }
    }

    formattedActivities.sort((a, b) =>
      new Date(b.time).getTime() - new Date(a.time).getTime()
    );

    return c.json({
      agent,
      metrics: metrics || null,
      activities: formattedActivities,
    });
  } catch (err) {
    console.error('Error in /agents/:id/profile:', err);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// GET /api/agents/:id - Get specific agent
agentRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) return c.json({ error: error.message }, 404);
  return c.json({ agent: data });
});

// GET /api/agents/:id/tasks - Get agent's tasks
agentRoutes.get('/:id/tasks', async (c) => {
  const id = c.req.param('id');
  const status = c.req.query('status');
  
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('assignee_id', id);
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ tasks: data });
});

// GET /api/agents/:id/activity - Get current agent status and activity
agentRoutes.get('/:id/activity', async (c) => {
  const id = c.req.param('id');
  
  try {
    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (agentError) {
      return c.json({ error: 'Agent not found' }, 404);
    }
    
    // Get current task if assigned
    let currentTask = null;
    if (agent.current_task_id) {
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('id, title')
        .eq('id', agent.current_task_id)
        .single();
      if (!taskError && task) {
        currentTask = task;
      }
    }
    
    // Get task counts
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('status')
      .eq('assignee_id', id);
    
    if (tasksError) {
      return c.json({ error: tasksError.message }, 500);
    }
    
    const tasksCompleted = tasks?.filter(t => t.status === 'done').length || 0;
    const tasksInProgress = tasks?.filter(t => ['in_progress', 'assigned', 'review'].includes(t.status)).length || 0;
    
    // Get most recent agent activity (may not exist yet)
    let lastHeartbeat = agent.updated_at;
    try {
      const { data: recentActivity } = await supabase
        .from('agent_activities')
        .select('created_at')
        .eq('agent_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (recentActivity) {
        lastHeartbeat = recentActivity.created_at;
      }
    } catch {
      // Table may not exist yet, use agent.updated_at
    }
    
    // Calculate uptime (mock for now - would track actual session data)
    const uptime = '4h 22m'; // TODO: Calculate from actual session data
    
    return c.json({
      agentId: agent.id,
      name: agent.name,
      status: agent.status,
      currentTask: currentTask?.id || null,
      taskTitle: currentTask?.title || null,
      model: agent.model_primary?.split('/').pop() || 'Unknown',
      lastHeartbeat,
      uptime,
      tasksCompleted,
      tasksInProgress,
    });
  } catch (err) {
    console.error('Error in /agents/:id/activity:', err);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// PATCH /api/agents/:id/status - Update agent status
agentRoutes.patch('/:id/status', async (c) => {
  const id = c.req.param('id');
  const { status } = await c.req.json();
  
  const { data, error } = await supabase
    .from('agents')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ agent: data });
});

// Helper function to map activity types
function mapActivityType(type: string): 'task' | 'heartbeat' | 'success' | 'blocked' | 'review' | 'error' {
  const typeMap: Record<string, 'task' | 'heartbeat' | 'success' | 'blocked' | 'review' | 'error'> = {
    'task_created': 'task',
    'task_assigned': 'task',
    'task_started': 'task',
    'task_completed': 'success',
    'message_sent': 'task',
    'status_changed': 'task',
    'document_created': 'task',
  };
  return typeMap[type] || 'task';
}
