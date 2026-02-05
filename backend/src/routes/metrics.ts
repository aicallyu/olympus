import { Hono } from 'hono';
import { supabase } from '../db/client.js';

export const metricsRoutes = new Hono();

// GET /api/metrics/agents - Performance stats for all agents
metricsRoutes.get('/agents', async (c) => {
  try {
    // Get agent metrics from agent_metrics table
    const { data: metrics, error: metricsError } = await supabase
      .from('agent_metrics')
      .select('*');

    if (metricsError) {
      console.error('Error fetching agent metrics:', metricsError);
    }

    // Get all agents with their task counts
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, name, role, status, current_task_id, model_primary');

    if (agentsError) {
      return c.json({ error: agentsError.message }, 500);
    }

    // Get task counts per agent
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('assignee_id, status');

    if (tasksError) {
      return c.json({ error: tasksError.message }, 500);
    }

    // Aggregate stats per agent
    const agentStats = agents.map(agent => {
      const agentTasks = tasks?.filter(t => t.assignee_id === agent.id) || [];
      const inProgress = agentTasks.filter(t => ['in_progress', 'assigned', 'review'].includes(t.status)).length;

      // Find metric for this agent
      const metric = metrics?.find(m => m.agent_id === agent.id);
      const tasksCompleted = metric?.tasks_completed || 0;
      const tasksFailed = metric?.tasks_failed || 0;

      // Calculate model usage (mock data for now - would come from actual usage logs)
      const modelUsage = agent.model_primary 
        ? { [agent.model_primary.split('/').pop() || 'unknown']: 100 }
        : {};

      // Calculate success rate
      const totalCompleted = tasksCompleted + tasksFailed;
      const successRate = totalCompleted > 0 
        ? `${Math.round((tasksCompleted / totalCompleted) * 100)}%`
        : 'N/A';

      return {
        agentId: agent.id,
        agentName: agent.name,
        agentRole: agent.role,
        status: agent.status,
        tasksCompleted,
        tasksInProgress: inProgress,
        tasksFailed,
        avgCompletionTime: metric?.avg_completion_time 
          ? formatDuration(metric.avg_completion_time)
          : 'N/A',
        successRate,
        modelUsage,
        totalCost: metric?.total_cost || 0,
      };
    });

    return c.json({ agents: agentStats });
  } catch (err) {
    console.error('Error in /metrics/agents:', err);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// GET /api/metrics/agents/:id - Performance stats for a specific agent
metricsRoutes.get('/agents/:id', async (c) => {
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

    // Get agent's tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('status, completed_at, created_at')
      .eq('assignee_id', id);

    if (tasksError) {
      return c.json({ error: tasksError.message }, 500);
    }

    // Get agent metrics
    const { data: metric, error: metricError } = await supabase
      .from('agent_metrics')
      .select('*')
      .eq('agent_id', id)
      .single();

    // Calculate stats
    const completed = tasks?.filter(t => t.status === 'done').length || 0;
    const inProgress = tasks?.filter(t => ['in_progress', 'assigned', 'review'].includes(t.status)).length || 0;
    const failed = tasks?.filter(t => t.status === 'blocked').length || 0;

    // Calculate average completion time from completed tasks
    const completedTasks = tasks?.filter(t => t.status === 'done' && t.completed_at);
    let avgCompletionTime = 'N/A';
    if (completedTasks && completedTasks.length > 0) {
      const totalMs = completedTasks.reduce((sum, t) => {
        const start = new Date(t.created_at).getTime();
        const end = new Date(t.completed_at!).getTime();
        return sum + (end - start);
      }, 0);
      avgCompletionTime = formatDurationMs(totalMs / completedTasks.length);
    }

    const totalCompleted = completed + failed;
    const successRate = totalCompleted > 0 
      ? `${Math.round((completed / totalCompleted) * 100)}%`
      : 'N/A';

    return c.json({
      agentId: agent.id,
      agentName: agent.name,
      agentRole: agent.role,
      status: agent.status,
      tasksCompleted: completed,
      tasksInProgress: inProgress,
      tasksFailed: failed,
      avgCompletionTime,
      successRate,
      totalCost: metric?.total_cost || 0,
      lastUpdated: metric?.last_updated || new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error in /metrics/agents/:id:', err);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// Helper function to format duration from ISO interval string
function formatDuration(interval: string): string {
  // PostgreSQL interval format: "2 days 04:30:00" or "04:30:00"
  const match = interval.match(/(\d+)\s*days?\s*(\d+):(\d+):(\d+)/);
  if (match) {
    const days = parseInt(match[1]);
    const hours = parseInt(match[2]);
    const minutes = parseInt(match[3]);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
  
  const timeMatch = interval.match(/(\d+):(\d+):(\d+)/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
  
  return interval;
}

// Helper function to format duration from milliseconds
function formatDurationMs(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
