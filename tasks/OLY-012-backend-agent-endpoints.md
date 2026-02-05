# Task OLY-012: Backend Agent Activity Endpoints

**Agent:** HERCULOS (Backend Engineer)
**Priority:** HIGH
**Status:** ASSIGNED
**Blocked by:** None

## Objective
Create backend API endpoints that power the agent activity visualization in the dashboard. This is foundational — other agents need these endpoints to show their work.

## Endpoints to Create

### 1. GET /agents/:id/activity
Returns current status of a specific agent:
```json
{
  "agentId": "atlas",
  "name": "ATLAS",
  "status": "active",
  "currentTask": "OLY-009",
  "taskTitle": "Reskin OLYMPUS Dashboard",
  "model": "Kimi K2.5",
  "lastHeartbeat": "2026-02-04T14:30:00Z",
  "uptime": "4h 22m",
  "tasksCompleted": 3
}
```

### 2. GET /agents/:id/tasks
Returns all tasks assigned to a specific agent:
```json
{
  "agentId": "atlas",
  "tasks": [
    { "id": "OLY-001", "title": "...", "status": "done", "completedAt": "..." },
    { "id": "OLY-009", "title": "...", "status": "in_progress", "startedAt": "..." }
  ]
}
```

### 3. GET /metrics/agents
Returns performance metrics for all agents:
```json
{
  "agents": [
    {
      "agentId": "atlas",
      "tasksCompleted": 5,
      "tasksInProgress": 1,
      "avgCompletionTime": "2.5h",
      "successRate": "100%",
      "modelUsage": { "Kimi K2.5": 80, "Opus 4.5": 20 }
    }
  ]
}
```

### 4. GET /activity/stream
Returns recent activity across all agents (for the live feed):
```json
{
  "activities": [
    {
      "time": "2026-02-04T14:25:00Z",
      "agentId": "atlas",
      "agentName": "ATLAS",
      "icon": "🏛️",
      "action": "Started task OLY-009: Reskin Dashboard",
      "type": "task"
    }
  ]
}
```

## Database Schema

You'll need to track in Supabase:
- `agent_activities` table — Log of all agent actions
- `agent_metrics` table — Aggregated stats per agent
- `task_assignments` — Link tasks to agents (already exists)

## Implementation Notes

### Database Tables to Create
```sql
-- Agent activities log
CREATE TABLE IF NOT EXISTS agent_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  action TEXT NOT NULL,
  type TEXT NOT NULL, -- 'task', 'heartbeat', 'success', 'blocked', 'review'
  task_id UUID REFERENCES tasks(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent metrics cache
CREATE TABLE IF NOT EXISTS agent_metrics (
  agent_id TEXT PRIMARY KEY,
  tasks_completed INTEGER DEFAULT 0,
  tasks_failed INTEGER DEFAULT 0,
  avg_completion_time INTERVAL,
  total_cost DECIMAL(10,4),
  last_updated TIMESTAMPTZ DEFAULT now()
);
```

### Files to Modify
1. `backend/src/index.ts` — Add new routes
2. `backend/src/db/client.ts` — Add new table types
3. Create: `backend/src/routes/agents.ts`
4. Create: `backend/src/routes/metrics.ts`
5. Create: `backend/src/routes/activity.ts`

## Acceptance Criteria
- [ ] All 4 endpoints return correct data
- [ ] Database tables created and typed
- [ ] Endpoints tested with curl/Postman
- [ ] Activity log captures agent actions automatically
- [ ] Frontend can consume these endpoints

## Why This First?
Without these endpoints, ATLAS can't show agent activity in the dashboard. This is the foundation for multi-agent visibility.

Execute this backend work. Report back with:
1. Confirmation all endpoints work
2. Sample curl commands for testing
3. Any database migrations needed

This is your first task as HERCULOS. Make it solid. ⚙️
