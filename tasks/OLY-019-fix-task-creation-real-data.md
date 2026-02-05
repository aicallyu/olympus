# Task OLY-019: Fix Task Creation + Real Data Integration

**Agent:** ATLAS (Frontend) + HERCULOS (Backend)
**Priority:** CRITICAL
**Status:** ASSIGNED

## Issues to Fix

### 1. Task Creation Not Working on Mobile
**Problem:** "+ NEW TASK" button and "+" buttons don't actually create tasks
**Expected:** Modal opens → User fills form → Task created → Appears in board

### 2. Replace All Mock Data with Real API Data
**Problem:** Dashboard shows hardcoded mock data
**Expected:** 
- Stats from `/api/metrics/agents`
- Tasks from `/api/tasks`
- Agents from `/api/agents`
- Activities from `/api/activity/stream`

### 3. Agent Profile Cards Not Working
**Problem:** Clicking agent cards doesn't open profile
**Expected:** Click agent → Slide-in panel with full profile, stats, history

## Implementation

### Frontend (ATLAS)
1. Fix Task Creation Modal:
   - Ensure form submits to `POST /api/tasks`
   - Handle response and update local state
   - Show success/error feedback

2. Replace mock data:
   - Use `useEffect` to fetch real data on mount
   - Implement React Query or SWR for caching
   - Add loading states

3. Fix Agent Profile:
   - Wire click handler to open profile panel
   - Fetch agent details from `/api/agents/:id/profile`
   - Show: stats, task history, activities

### Backend (HERCULOS)
1. Ensure all endpoints work:
   - `GET /api/tasks` — return all tasks
   - `POST /api/tasks` — create new task
   - `GET /api/agents/:id/profile` — agent details
   - `GET /api/metrics/agents` — dashboard stats
   - `GET /api/activity/stream` — recent activities

2. Connect to real database (not mocks)

## Files to Modify
- `frontend/src/hooks/useOlympusStore.ts` — Real data fetching
- `frontend/src/components/tasks/CreateTaskModal.tsx` — Fix submission
- `frontend/src/components/agents/AgentProfileModal.tsx` — Complete implementation
- `frontend/src/pages/*.tsx` — Replace mock with real data
- `backend/src/routes/*.ts` — Ensure real DB queries

## Acceptance Criteria
- [ ] Create task button works on mobile
- [ ] All data comes from API (no hardcoded values)
- [ ] Agent profiles open and show real data
- [ ] Refresh page shows persisted data
