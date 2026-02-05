# OLYMPUS Agent Control System

**Purpose:** Prevent session failures from going undetected

## Components

### 1. Session Health Monitor (5 min intervals)
Checks if agents with "in_progress" tasks have active sessions

### 2. Task Timeout Watchdog (30 min threshold)
Escalates tasks that stall without progress

### 3. Agent Heartbeat Ping (10 min intervals)
Agents must ping or session is marked dead

## Implementation

### Database Schema
```sql
-- Agent session tracking
CREATE TABLE IF NOT EXISTS agent_sessions (
  session_id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  task_id UUID REFERENCES tasks(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  last_ping TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'active', -- active, stalled, dead
  model TEXT,
  CHECK (status IN ('active', 'stalled', 'dead'))
);

-- Task progress tracking
CREATE TABLE IF NOT EXISTS task_progress (
  task_id UUID PRIMARY KEY REFERENCES tasks(id),
  agent_id TEXT NOT NULL,
  last_update TIMESTAMPTZ DEFAULT now(),
  progress_percent INTEGER DEFAULT 0,
  status_message TEXT,
  CHECK (progress_percent >= 0 AND progress_percent <= 100)
);

-- Control system logs
CREATE TABLE IF NOT EXISTS control_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL, -- 'session_health', 'task_timeout', 'heartbeat'
  agent_id TEXT,
  task_id UUID,
  severity TEXT, -- 'info', 'warning', 'critical'
  message TEXT NOT NULL,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Control Functions

```typescript
// Check 1: Session Health (every 5 min)
async function checkSessionHealth() {
  // Find agents with 'in_progress' tasks
  // Check if they have active sessions in agent_sessions
  // If no session or last_ping > 15 min ago → mark dead, escalate to ARGOS
}

// Check 2: Task Timeout (every 5 min)
async function checkTaskTimeouts() {
  // Find tasks with status 'in_progress'
  // If last_update > 30 min ago → escalate to ARGOS
  // Update task status to 'stalled'
}

// Check 3: Agent Heartbeat (agents ping every 10 min)
async function recordAgentPing(agentId: string, taskId: string) {
  // Update last_ping in agent_sessions
  // If ping missed for > 15 min → mark session dead
}
```

### Cron Schedule
- Every 5 min: Session Health Check
- Every 5 min: Task Timeout Check
- Every 10 min: Agents send heartbeat

## Alerts
- **Warning:** Session stall detected (15 min no ping)
- **Critical:** Session dead, task reassigned (30 min no progress)
- **Info:** Normal operation logs

## Pre-Flight Check (Mandatory)
Before assigning ANY task:
1. Verify sub-agent session starts successfully
2. Confirm agent responds to initial ping within 60 seconds
3. Only THEN mark task as "assigned"
4. Log control_log entry confirming pre-flight passed
