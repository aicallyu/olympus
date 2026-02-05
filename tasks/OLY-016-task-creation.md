# Task OLY-016: Task Creation Functionality

**Agent:** ATLAS (Frontend) + HERCULOS (Backend API)
**Priority:** HIGH
**Status:** READY

## Objective
Make "+ NEW TASK" button and "+" buttons between Kanban columns functional.

## Features

### 1. Create Task Modal
- Trigger: Click "+ NEW TASK" or column "+" buttons
- Form fields:
  - Title (required)
  - Description (textarea)
  - Priority (High/Normal/Low — dropdown)
  - Assignee (ARGOS / ATLAS / HERCULOS / ATHENA / PROMETHEUS / APOLLO / HERMES — dropdown)
  - Initial Status (defaults to INBOX, or column where "+" clicked)

### 2. API Endpoint
```
POST /api/tasks
Body: { title, description, priority, assignee, status }
```

### 3. Assignment Logic
- If assignee = "ARGOS" → Task goes to orchestrator (me)
- If assignee = specific agent → Task assigned to that agent
- If no assignee → Unassigned (INBOX)

### 4. Real-time Update
- After creation, task appears immediately in board
- Activity feed shows: "ARGOS created task OLY-XXX"

## UI/UX
- Modal: Glass-morphism overlay (matches OLYMPUS theme)
- Form: Gold-accented inputs, JetBrains Mono labels
- Submit button: "SUMMON TASK" (theatrical)
- Cancel: ESC key or click outside

## Files
- Frontend: `src/components/tasks/CreateTaskModal.tsx`
- Backend: `POST /api/tasks` endpoint
- Store: Update Zustand store to handle creation

## Acceptance
- [ ] Modal opens on all "+" buttons
- [ ] Task creates successfully via API
- [ ] Appears immediately in correct column
- [ ] Activity feed logs creation
- [ ] Can assign to any agent or ARGOS
