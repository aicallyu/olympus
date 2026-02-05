# Task OLY-017: Agent Profile Cards

**Agent:** ATLAS (Frontend) + HERCULOS (Backend API)
**Priority:** HIGH
**Status:** READY

## Objective
Click on any agent card → opens detailed profile view with full history and stats.

## Profile View Components

### 1. Agent Header
- Large agent icon (emoji)
- Name (Cinzel, large)
- Role subtitle
- Status badge (Active/Idle/Blocked with pulse)
- Current model in use

### 2. Stats Section
- Total tasks completed (lifetime)
- Success rate %
- Average completion time
- Current session uptime
- Cost consumed this week
- Performance sparkline (7-day activity)

### 3. Task History
- List of all tasks ever assigned
- Columns: Task ID | Title | Status | Completed At
- Filter: All | Completed | In Progress | Failed
- Sort by date

### 4. Activity Log
- Timeline of agent actions
- Task assignments, completions, failures
- Model escalations
- Heartbeat status changes

### 5. Settings/Controls
- "Restart Session" button
- "Escalate Model" button (manual upgrade to Codex/Opus)
- "Reassign Current Task" dropdown

## UI/UX
- Opens as modal or slide-in panel (right side)
- Glass-morphism background
- Gold accents matching agent's activity color
- Animated entry (slide from right)

## API Endpoints Needed
```
GET /api/agents/:id/profile → Full agent details + stats
GET /api/agents/:id/history → All tasks with pagination
GET /api/agents/:id/activities → Activity log
POST /api/agents/:id/restart → Restart session
POST /api/agents/:id/escalate → Upgrade model
```

## Files
- Frontend: `src/components/agents/AgentProfileModal.tsx`
- Frontend: `src/components/agents/AgentStats.tsx`
- Frontend: `src/components/agents/TaskHistory.tsx`
- Backend: Extend agent routes with profile endpoints

## Acceptance
- [ ] Click agent card opens profile
- [ ] Shows complete task history
- [ ] Shows performance stats
- [ ] Shows activity timeline
- [ ] Restart/Escalate buttons work
- [ ] Matches OLYMPUS premium design
