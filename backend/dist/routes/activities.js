import { Hono } from 'hono';
import { supabase } from '../db/client.js';
export const activityRoutes = new Hono();
// GET /api/activities - Get activity feed (with filters)
activityRoutes.get('/', async (c) => {
    const agentId = c.req.query('agent');
    const taskId = c.req.query('task');
    const limit = parseInt(c.req.query('limit') || '50');
    let query = supabase
        .from('activities')
        .select('*, agents:agent_id(name)')
        .order('created_at', { ascending: false })
        .limit(limit);
    if (agentId)
        query = query.eq('agent_id', agentId);
    if (taskId)
        query = query.eq('task_id', taskId);
    const { data, error } = await query;
    if (error)
        return c.json({ error: error.message }, 500);
    return c.json({ activities: data });
});
// GET /api/activity/stream - Recent activity feed for dashboard
activityRoutes.get('/stream', async (c) => {
    const limit = parseInt(c.req.query('limit') || '20');
    const since = c.req.query('since'); // ISO timestamp for polling
    try {
        // Build query for recent activities from both tables
        let query = supabase
            .from('activities')
            .select(`
        *,
        agents:agent_id(name, role)
      `)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (since) {
            query = query.gt('created_at', since);
        }
        const { data: activities, error: activitiesError } = await query;
        if (activitiesError) {
            console.error('Error fetching activities:', activitiesError);
            return c.json({ error: activitiesError.message }, 500);
        }
        // Also fetch from agent_activities if it exists
        let agentActivitiesQuery = supabase
            .from('agent_activities')
            .select(`
        *,
        agents:agent_id(name, role)
      `)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (since) {
            agentActivitiesQuery = agentActivitiesQuery.gt('created_at', since);
        }
        const { data: agentActivities, error: agentActivitiesError } = await agentActivitiesQuery;
        // Combine and format activities
        const formattedActivities = [];
        // Format regular activities
        if (activities) {
            for (const activity of activities) {
                formattedActivities.push({
                    time: activity.created_at,
                    agentId: activity.agent_id,
                    agentName: activity.agents?.name || 'Unknown',
                    agentRole: activity.agents?.role || '',
                    icon: getAgentIcon(activity.agents?.role),
                    action: activity.message,
                    type: mapActivityType(activity.type),
                    metadata: activity.metadata,
                });
            }
        }
        // Format agent_activities if available
        if (!agentActivitiesError && agentActivities) {
            for (const activity of agentActivities) {
                // Check if already added (avoid duplicates)
                const exists = formattedActivities.some(a => a.time === activity.created_at && a.agentId === activity.agent_id);
                if (!exists) {
                    formattedActivities.push({
                        time: activity.created_at,
                        agentId: activity.agent_id,
                        agentName: activity.agents?.name || 'Unknown',
                        agentRole: activity.agents?.role || '',
                        icon: getAgentIcon(activity.agents?.role),
                        action: activity.action,
                        type: activity.type,
                        taskId: activity.task_id,
                        metadata: activity.metadata,
                    });
                }
            }
        }
        // Sort by time descending
        formattedActivities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        // Limit to requested count
        const limitedActivities = formattedActivities.slice(0, limit);
        return c.json({
            activities: limitedActivities,
            count: limitedActivities.length,
            timestamp: new Date().toISOString(),
        });
    }
    catch (err) {
        console.error('Error in /activity/stream:', err);
        return c.json({ error: 'Internal Server Error' }, 500);
    }
});
// Helper function to get agent icon based on role
function getAgentIcon(role) {
    const icons = {
        'Orchestrator': '🏛️',
        'Frontend Engineer': '🎨',
        'QA & Strategy': '🔍',
        'Backend Engineer': '⚙️',
        'DevOps & Automation': '🚀',
        'Design & Visual Arts': '✨',
        'Documentation': '📚',
    };
    return icons[role || ''] || '🤖';
}
// Helper function to map activity types
function mapActivityType(type) {
    const typeMap = {
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
//# sourceMappingURL=activities.js.map