# Task OLY-011: Dashboard Agent Activity Visualization

**Agent:** ATLAS (Frontend)
**Priority:** HIGH  
**Status:** WAITING (blocked by OLY-009 Reskin)

## Objective
Dashboard erweitern, sodass Agent-Aktivitäten in Echtzeit sichtbar sind.

## Features to Add

### 1. Agent Status Widget
- Live heartbeat indicator für jeden Agent
- Current task being worked on
- Model in use
- Uptime counter
- Last activity timestamp

### 2. Task Assignment Flow Visualization
- Task created → Assigned to Agent → In Progress → Completed
- Timeline/Flow-Darstellung
- Who did what when

### 3. Agent Performance Metrics
- Tasks completed per agent
- Average completion time
- Success rate
- Model usage stats (cost tracking)

### 4. Real-time Activity Feed
- Live updates when agents pick up tasks
- Completion notifications
- Heartbeat status changes

## Data Requirements
Backend needs endpoints:
- `GET /agents/:id/activity` — Current task, heartbeat, status
- `GET /tasks?agent=:id` — All tasks for specific agent
- `GET /metrics/agents` — Performance stats
- WebSocket or polling for real-time updates

## UI Components
1. **Agent Activity Card** — Shows current work + status
2. **Live Task Flow** — Visual pipeline of task states
3. **Performance Dashboard** — Stats per agent
4. **Activity Stream** — Real-time log

## Acceptance Criteria
- [ ] Agent statuses visible in real-time
- [ ] Task assignments show assigned agent
- [ ] Activity feed shows agent actions
- [ ] Metrics visible per agent

## Dependencies
- OLY-009 (Reskin) should be done first
- Backend endpoints need implementation
