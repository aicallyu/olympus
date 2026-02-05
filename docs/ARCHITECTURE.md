# OLYMP - Architecture

## Overview
AI Agent Orchestration Dashboard for coordinating specialized AI agents working on tasks in parallel.

---

## Agent Squad

### 🔱 ARGOS (Master Orchestrator)
- **Role:** Coordinates all agents, assigns tasks, reviews quality
- **Session:** `agent:main:main` (you - always active)
- **Workspace:** `~/.openclaw/workspace`

### 🏛️ ATLAS (Frontend Specialist)
- **Role:** React, TypeScript, Tailwind, UI/UX
- **Expertise:** Vite stack, component architecture, premium aesthetics
- **Workspace:** `~/agents/atlas`
- **Session:** `agent:main:atlas`

### ⚙️ VULCAN (Backend Specialist)
- **Role:** APIs, databases, n8n workflows, FastAPI
- **Expertise:** MongoDB, SQLite, REST design, webhooks
- **Workspace:** `~/agents/vulcan`
- **Session:** `agent:main:vulcan`

### 🔥 PROMETHEUS (DevOps Specialist)
- **Role:** CI/CD, Docker, deployment automation
- **Expertise:** GitHub Actions, Cloudflare, infrastructure
- **Workspace:** `~/agents/prometheus`
- **Session:** `agent:main:prometheus`

### 🦉 ATHENA (QA Specialist)
- **Role:** Testing, bug hunting, quality assurance
- **Expertise:** Cross-browser testing, edge cases, verification
- **Workspace:** `~/agents/athena`
- **Session:** `agent:main:athena`

### 🎨 APOLLO (Design Specialist)
- **Role:** UI/UX design, animations, visual polish
- **Expertise:** Premium aesthetics, Three.js, gsap, transitions
- **Workspace:** `~/agents/apollo`
- **Session:** `agent:main:apollo`

### 📜 HERMES (Documentation Specialist)
- **Role:** READMEs, guides, API docs, copy-paste instructions
- **Expertise:** Clear communication, technical writing
- **Workspace:** `~/agents/hermes`
- **Session:** `agent:main:hermes`

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         OLYMP                                │
│                     (Frontend Dashboard)                     │
├─────────────────────────────────────────────────────────────┤
│  - Kanban Board (INBOX → ASSIGNED → IN PROGRESS → REVIEW → DONE)
│  - Agent Sidebar (status, active tasks, health)            │
│  - Chat Panel (agent-to-agent + ARGOS-to-agent)           │
│  - Live Feed (real-time event stream)                      │
│  - Task Modal (create, edit, assign, priority)             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Backend API                             │
│                  (Next.js App Router / n8n)                  │
├─────────────────────────────────────────────────────────────┤
│  /api/agents       - CRUD for agents                        │
│  /api/tasks        - CRUD for tasks + filters               │
│  /api/conversations - Agent chat messages                   │
│  /api/events       - Live feed events                       │
│  /api/openclaw     - Gateway integration                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    SQLite Database                           │
├─────────────────────────────────────────────────────────────┤
│  agents          - Agent configs + personalities            │
│  tasks           - Task data + status + assignments         │
│  conversations   - Agent-to-agent messages                  │
│  messages        - Chat history                             │
│  events          - Activity log                             │
│  deliverables    - Task outputs                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  OpenClaw Gateway                            │
│                (WebSocket: ws://localhost:18789)             │
├─────────────────────────────────────────────────────────────┤
│  - sessions.list   - List all agent sessions                │
│  - sessions.send   - Send message to agent                  │
│  - sessions.patch  - Update session metadata                │
│  - sessions.history - Get agent conversation history        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Agent Sessions                            │
│         (Individual OpenClaw sessions per agent)             │
├─────────────────────────────────────────────────────────────┤
│  ATLAS     → Session: agent:main:atlas                      │
│  VULCAN    → Session: agent:main:vulcan                     │
│  PROMETHEUS→ Session: agent:main:prometheus                 │
│  ATHENA    → Session: agent:main:athena                     │
│  APOLLO    → Session: agent:main:apollo                     │
│  HERMES    → Session: agent:main:hermes                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### `agents`
```sql
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  emoji TEXT,
  status TEXT DEFAULT 'standby', -- standby | working | offline
  session_key TEXT,
  workspace_path TEXT,
  soul_md TEXT,
  user_md TEXT,
  agents_md TEXT,
  created_at INTEGER,
  updated_at INTEGER
);
```

### `tasks`
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'MEDIUM', -- LOW | MEDIUM | HIGH | URGENT
  status TEXT DEFAULT 'inbox', -- inbox | assigned | in_progress | review | done
  assigned_to TEXT, -- agent.id
  created_by TEXT DEFAULT 'ARGOS',
  started_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (assigned_to) REFERENCES agents(id)
);
```

### `conversations`
```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  participant_ids TEXT, -- JSON array of agent IDs
  created_at INTEGER,
  updated_at INTEGER
);
```

### `messages`
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  from_agent_id TEXT,
  to_agent_id TEXT,
  content TEXT NOT NULL,
  created_at INTEGER,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (from_agent_id) REFERENCES agents(id),
  FOREIGN KEY (to_agent_id) REFERENCES agents(id)
);
```

### `events`
```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- task_created | task_assigned | task_completed | agent_chat | etc
  agent_id TEXT,
  task_id TEXT,
  data TEXT, -- JSON blob
  created_at INTEGER,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);
```

### `deliverables`
```sql
CREATE TABLE deliverables (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  type TEXT NOT NULL, -- file | url | text
  title TEXT,
  path TEXT,
  url TEXT,
  content TEXT,
  created_at INTEGER,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);
```

---

## Task Dispatch Protocol

### 1. User Assigns Task
```javascript
// Via UI: Drag task to ATLAS in ASSIGNED column
PATCH /api/tasks/{taskId}
{
  "assigned_to": "atlas",
  "status": "assigned"
}
```

### 2. System Auto-Dispatches
```javascript
// Backend sends message to agent session
POST /api/openclaw/sessions/agent:main:atlas
{
  "message": `
🔵 NEW TASK ASSIGNED

**Title:** Build login component
**Priority:** HIGH
**Task ID:** abc-123

Please work on this task. When complete, reply with:
TASK_COMPLETE: [brief summary of what you did]
  `
}
```

### 3. Agent Works
- Task moves to IN_PROGRESS automatically
- Agent status: "working"
- Agent uses tools, writes code, tests

### 4. Agent Completes
Agent replies:
```
TASK_COMPLETE: Built LoginForm.tsx with email/password validation, 
integrated with /api/auth/login, tested across Chrome/Firefox/Safari.
```

### 5. System Detects Completion
```javascript
// Backend polls agent session history
// Regex: /TASK_COMPLETE:\s*(.+)/
// Auto-moves task to REVIEW
// Agent status: "standby"
```

### 6. ARGOS Reviews
- Only ARGOS can move from REVIEW → DONE
- Reviews quality, deliverables
- Approves or requests changes

---

## Agent Personality Structure

Each agent has 3 files in their workspace:

### SOUL.md
```markdown
# SOUL.md - Who You Are

You're ATLAS, the Frontend Specialist.

**Core Identity:**
- React/TypeScript expert
- Think in components & hooks
- Obsessed with performance & UX
- Premium aesthetics only

**Your Stack:**
- Vite + React + TypeScript (strict)
- Tailwind CSS
- NO Next.js (critical)
- Path aliases: @/components, @/lib

**Your Style:**
- Clean, composable code
- Copy-paste ready deliverables
- Always include TypeScript types
- Match existing patterns in codebase
```

### USER.md
```markdown
# USER.md - Who You're Helping

**Juan's Stack (MUST FOLLOW):**
- Vite (NOT Next.js)
- React + TypeScript strict
- Tailwind CSS
- @/ path aliases

**Quality Standards:**
- Premium aesthetics (CIA command center vibe)
- No lazy TypeScript (no `any`, no `@ts-ignore`)
- Copy-paste ready
- Manifest for multi-file deliveries

**Team:**
- Gloria: n8n backend (junior)
- Nathanael: React frontend
```

### AGENTS.md
```markdown
# AGENTS.md - Your Team

**Master:**
- ARGOS: Coordinates everything, assigns tasks

**Specialists:**
- VULCAN (Backend): APIs, databases, n8n
- PROMETHEUS (DevOps): CI/CD, Docker
- ATHENA (QA): Tests your work
- APOLLO (Design): Visual polish
- HERMES (Docs): Writes guides

**Collaboration:**
- Ask VULCAN for API endpoints
- Hand off to ATHENA for testing
- Work with APOLLO on animations
```

---

## Tech Stack

**Frontend:**
- Vite 5
- React 18
- TypeScript 5 (strict)
- Tailwind CSS 3
- @hello-pangea/dnd (drag & drop)
- Lucide React (icons)
- Zustand (state)

**Backend:**
- Next.js 14 App Router
- better-sqlite3 (database)
- WebSocket client (for OpenClaw)

**Integration:**
- OpenClaw Gateway (ws://localhost:18789)
- RequestFrame protocol (not JSON-RPC)

---

## File Structure

```
mission-control/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/
│   │       ├── agents/
│   │       ├── tasks/
│   │       ├── conversations/
│   │       ├── events/
│   │       └── openclaw/
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── AgentsSidebar.tsx
│   │   ├── AgentModal.tsx
│   │   ├── MissionQueue.tsx
│   │   ├── TaskModal.tsx
│   │   ├── ChatPanel.tsx
│   │   └── LiveFeed.tsx
│   └── lib/
│       ├── db/
│       │   ├── index.ts
│       │   └── schema.sql
│       ├── openclaw/
│       │   ├── client.ts
│       │   └── protocol.ts
│       ├── store.ts
│       └── types.ts
├── public/
├── mission-control.db
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

---

## Next Steps

1. Create Vite frontend project
2. Build database schema + migrations
3. Implement OpenClaw WebSocket client
4. Build Kanban board UI
5. Create task dispatch logic
6. Write agent personality files
7. Test with real agents

---

**Timeline:** 1-2 days  
**Dependencies:** OpenClaw Gateway running, agent workspaces created
