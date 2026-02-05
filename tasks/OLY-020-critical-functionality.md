# Task OLY-020: Make Dashboard Fully Functional — CRITICAL

**Agents:** ATLAS (Frontend) + HERCULOS (Backend)  
**Priority:** CRITICAL  
**Status:** ASSIGNED  
**Deadline:** Tested and working

---

## The Problem
Dashboard looks great but nothing works. Every button is dead. This is unacceptable.

## Requirements (In Order)

### 1. CREATE TASK BUTTON — WORKING
**Current:** Button does nothing  
**Required:**
- Click → Modal opens (already done)
- Fill form → Click "Create Task" → INSERT into Supabase `tasks` table
- Validation: Title required, no empty tasks
- After success: Close modal, refresh task list, show toast confirmation
- Task appears immediately in board

**Files:**
- `CreateTaskModal.tsx` — wire submit button to actual INSERT
- Backend: Ensure `POST /api/tasks` works with Supabase

### 2. AGENT ASSIGNMENT — WORKING
**Current:** "Unassigned" not clickable  
**Required:**
- Click "Unassigned" → Dropdown with all agents from `agents` table
- Select agent → UPDATE `tasks.assigned_to` in Supabase
- INSERT into `status_history` table: "Task assigned to [AGENT]"
- **NOTIFY THE AGENT** (see #4)

**Files:**
- `TaskDetailModal.tsx` — make assignee clickable dropdown
- Backend: `PATCH /api/tasks/:id/assign`

### 3. STATUS TRANSITIONS — WORKING
**Current:** Status history is read-only  
**Required:**
- Each status (INBOX → ASSIGNED → IN PROGRESS → REVIEW → DONE) is clickable
- Click → UPDATE `tasks.status` in Supabase
- INSERT into `status_history` with timestamp
- **REVIEW GATE:** Cannot skip from IN_PROGRESS to DONE. Must go: IN_PROGRESS → REVIEW → DONE
- If trying to skip, show error: "Tasks must pass through Review (ATHENA)"

**Files:**
- `TaskDetailModal.tsx` — clickable status steps
- Backend: `PATCH /api/tasks/:id/status` with validation

### 4. AGENT NOTIFICATION SYSTEM — WORKING
**Current:** Agents have no way to know they have tasks  
**Required (Pick ONE):**

**Option A: Supabase Realtime (Recommended)**
- Frontend subscribes to `tasks` table changes
- When `assigned_to` changes to current agent, show notification
- ATLAS/HERCULOS/ATHENA etc. all get notified

**Option B: Polling (Simpler)**
- Each agent's heartbeat checks: `SELECT * FROM tasks WHERE assigned_to = ? AND status = 'assigned'`
- If found, agent picks up task

**Option C: Webhook**
- Supabase webhook on UPDATE → calls OpenClaw API → notifies agent

**Decision:** Implement Option A (Realtime) or B (Polling). Just pick one and make it work.

**Files:**
- Backend: Realtime subscription setup OR polling endpoint
- Frontend: Notification badge when task assigned

### 5. TESTING — MANDATORY
**Before marking complete:**
- [ ] Create task from UI → Verify in Supabase dashboard
- [ ] Assign to ATLAS → Verify ATLAS gets notification
- [ ] Click through status steps INBOX→ASSIGNED→IN_PROGRESS→REVIEW→DONE
- [ ] Try to skip REVIEW → Verify error message
- [ ] Check `status_history` table has all transitions with timestamps
- [ ] Screenshot proof of working buttons

**No exceptions. No "it's done" without proof.**

---

## Database Tables (Already Exist)
- `tasks` — id, title, description, status, priority, assigned_to, created_at, updated_at
- `agents` — id, name, role, status, model
- `status_history` — id, task_id, status, timestamp, notes

## API Endpoints Needed
1. `POST /api/tasks` — Create task (already exists, verify working)
2. `PATCH /api/tasks/:id/assign` — Assign agent
3. `PATCH /api/tasks/:id/status` — Change status with validation
4. `GET /api/tasks/:id/history` — Get status history

## Files to Modify
**Frontend:**
- `CreateTaskModal.tsx` — Make submit actually work
- `TaskDetailModal.tsx` — Status transitions, assignment dropdown
- `useOlympusStore.ts` — Realtime subscription or polling logic

**Backend:**
- `tasks.ts` routes — Verify all endpoints work with Supabase
- Add validation for status transitions

---

## Success Criteria
- Every button on dashboard does something
- Task creation → Supabase → UI refresh (within 1 second)
- Agent assignment → Notification → Agent sees task
- Status transitions → History tracked → No skipping REVIEW
- User can demonstrate full workflow end-to-end

**Make it a product, not a demo.** 🏛️⚡
