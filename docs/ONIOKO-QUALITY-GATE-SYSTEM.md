# ONIOKO Quality Gate System — Verification & Collaboration Guardrails

## What This Is

A project-independent quality system that enforces verification standards across every project in the Onioko ecosystem. It guarantees that no work — from any agent or human — reaches production without passing through a chain of automated checks, perception tests, and human approval.

This is not a product feature. It's the operating system for how the team works.

> "If you're building with AI agents and you don't have a verification loop — you don't have an agent. You have a very expensive intern who lies about being done."

---

## Design Principles

1. **Project-agnostic.** The same gates, the same chain, the same standards apply to OLYMP, DevStackX, Onioko, and any future project. Only the config changes.

2. **Self-driving.** Nothing dead-blocks. Every failure triggers diagnosis → fix attempt → re-test. After 3 failed attempts, escalation with full context. Never a silent "blocked" status.

3. **Perception over logs.** Agents can't mark work as done based on what they think happened. Verification is based on what PROMETHEUS actually sees on the live URL — screenshots, DOM state, network requests.

4. **Human at the gate, not in the loop.** Agents work autonomously through the chain. The human only appears at the final checkpoint — but that checkpoint is mandatory and cannot be skipped.

---

## Project Registry

Every project registers with a config. The verification engine uses this config to know what to build, where to test, who to notify.

### Config Format

```json
{
  "project_id": "olymp",
  "project_name": "OLYMP",
  "repo": "aicallyu/olympus",
  "stack": {
    "framework": "vite-react-ts",
    "build_command": "npm run build",
    "typecheck_command": "npx tsc --noEmit",
    "lint_command": "npx eslint src/ --quiet",
    "node_version": "22"
  },
  "deployment": {
    "platform": "netlify",
    "live_url": "https://olymp.onioko.com",
    "env_vars_required": ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"],
    "deploy_branch": "main"
  },
  "backend": {
    "platform": "supabase",
    "project_ref": "mfpyyriilflviojnqhuv",
    "edge_functions": true
  },
  "agents": {
    "primary_dev": "ATLAS",
    "backend_dev": "HERCULOS",
    "infra": "ARGOS",
    "qa": "ATHENA",
    "perception": "PROMETHEUS",
    "comms": "HERMES"
  },
  "notifications": {
    "escalation_channel": "whatsapp",
    "escalation_contact": "Juan",
    "dashboard_url": "https://olymp.onioko.com/tasks"
  }
}
```

### Registered Projects

```json
[
  {
    "project_id": "olymp",
    "project_name": "OLYMP",
    "repo": "aicallyu/olympus",
    "live_url": "https://olymp.onioko.com",
    "stack": "vite-react-ts",
    "deployment": "netlify",
    "backend": "supabase"
  },
  {
    "project_id": "devstackx",
    "project_name": "DevStackX",
    "repo": "aicallyu/devstackx",
    "live_url": "https://devstackx.onioko.com",
    "stack": "vite-react-ts",
    "deployment": "netlify",
    "backend": "supabase"
  },
  {
    "project_id": "onioko-app",
    "project_name": "Onioko / Silent Oculus",
    "repo": "aicallyu/onioko",
    "live_url": "https://app.onioko.com",
    "stack": "vite-react-ts",
    "deployment": "netlify",
    "backend": "supabase"
  }
]
```

Adding a new project = adding a config. No code changes. Same gates, same chain, same standards.

---

## The Verification Chain

```
Agent completes work
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ GATE 1: BUILD GUARD                                          │
│                                                              │
│ Runs: typecheck → build → lint (from project config)         │
│                                                              │
│ Pass → Gate 2                                                │
│ Fail → Diagnose error → assign agent → auto-fix → re-test   │
│         (max 3 attempts, then escalate with full error log)  │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ GATE 2: DEPLOY VERIFICATION                                  │
│                                                              │
│ Triggered by: Netlify/Vercel deploy webhook                  │
│ Checks: URL loads? env vars set? correct branch deployed?    │
│ Runs: deploy-diff (expected elements vs actual DOM)          │
│                                                              │
│ Pass → Gate 3                                                │
│ Fail → Diagnose → auto-fix (set env vars, trigger redeploy) │
│         (max 3 attempts, then escalate with deploy logs)     │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ GATE 3: PERCEPTION CHECK                                     │
│                                                              │
│ PROMETHEUS opens live URL in real browser (Playwright)        │
│ Tests EVERY acceptance criterion:                            │
│   - Click buttons → verify modals open                       │
│   - Check data loads → verify correct count/content          │
│   - Submit forms → verify DB entry created                   │
│   - Navigate routes → verify no 404s                         │
│ Screenshots before + after each action as evidence           │
│ Records console errors + network failures                    │
│                                                              │
│ All pass → Gate 4                                            │
│ Any fail → send failing criteria + screenshots to agent      │
│            → auto-fix → re-test                              │
│            (max 3 attempts, then escalate with full evidence)│
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ GATE 4: HUMAN CHECKPOINT                                     │
│                                                              │
│ Juan sees:                                                   │
│   - Task summary                                             │
│   - All acceptance criteria with pass/fail status            │
│   - All screenshots from PROMETHEUS                          │
│   - Full verification history (attempts, auto-fixes)         │
│   - Git diff of changes                                      │
│   - Time elapsed, agents involved                            │
│                                                              │
│ Approve → DONE                                               │
│ Reject → back to agent with notes → re-enters chain at      │
│          Gate 1                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## The Auto-Fix Loop

Every gate failure triggers this loop. It never silently blocks.

```
Gate fails
    │
    ▼
┌─────────────────────────────────────────────┐
│ 1. DIAGNOSE                                  │
│    Parse error output                        │
│    Classify: build error? missing env var?   │
│    missing data? UI bug? backend issue?      │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ 2. ROUTE TO AGENT                            │
│    Build errors      → project.agents.       │
│                        primary_dev (ATLAS)   │
│    Deploy issues     → project.agents.       │
│                        infra (ARGOS)         │
│    UI/perception     → project.agents.       │
│                        primary_dev (ATLAS)   │
│    Backend/API       → project.agents.       │
│                        backend_dev (HERCULOS)│
│    Unknown           → project.agents.       │
│                        qa (ATHENA) to triage │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ 3. AGENT RECEIVES FIX PACKAGE               │
│    Contains:                                 │
│    - Original task + acceptance criteria     │
│    - Which gate failed                       │
│    - Exact error message / screenshot        │
│    - What was expected vs what happened      │
│    - Previous fix attempts (if any)          │
│    - Suggested fix approach                  │
│                                              │
│    Agent has 10 min to push a fix.           │
│    Timeout = attempt counted as failed.      │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ 4. RE-TEST                                   │
│    Same gate runs again with same criteria.  │
│                                              │
│    Pass? → next gate                         │
│    Fail + attempts < 3? → back to step 1    │
│    Fail + attempts >= 3? → ESCALATE          │
└──────────────────┬──────────────────────────┘
                   │ (if escalated)
                   ▼
┌─────────────────────────────────────────────┐
│ 5. ESCALATION                                │
│    Notification sent to Juan via:            │
│    - WhatsApp (HERMES)                       │
│    - OLYMP dashboard banner                  │
│                                              │
│    Contains:                                 │
│    - What failed (with evidence)             │
│    - What was tried (all 3 attempts)         │
│    - What still fails (remaining issues)     │
│    - Suggested actions (concrete options)    │
│                                              │
│    Juan can:                                 │
│    A) Send back with specific instructions   │
│    B) Reassign to different agent            │
│    C) Adjust acceptance criteria             │
│    D) Fix it himself                         │
│    E) Accept partial and ship               │
│                                              │
│    Any choice re-enters the chain.           │
│    Nothing stays in "escalated" forever.     │
└─────────────────────────────────────────────┘
```

---

## Database Schema

This lives in OLYMP's Supabase (the central hub) but tracks tasks across all projects.

### SQL Migration

```sql
-- ============================================================
-- ONIOKO QUALITY GATE SYSTEM
-- Project-agnostic verification chain
-- ============================================================

-- 1. Project registry
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,                          -- 'olymp', 'devstackx', 'onioko-app'
  name TEXT NOT NULL,
  config JSONB NOT NULL,                        -- Full project config (repo, stack, deployment, agents)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Update tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id TEXT REFERENCES projects(id) DEFAULT 'olymp';

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN (
    'inbox',
    'assigned',
    'in_progress',
    'build_check',
    'deploy_check',
    'perception_check',
    'human_checkpoint',
    'done',
    'auto_fix',
    'escalated',
    'rejected'
  ));

-- 3. Acceptance criteria (required for every task beyond inbox)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS acceptance_criteria JSONB DEFAULT '[]';
-- Format: [
--   {
--     "id": "ac-001",
--     "criterion": "Button X opens Modal Y",
--     "type": "browser_test",
--     "test_selector": "#start-btn",
--     "test_action": "click",
--     "expected_result": "Modal .war-room-modal is visible",
--     "verified": false,
--     "verified_by": null,
--     "verified_at": null,
--     "evidence_url": null
--   }
-- ]

-- 4. Gate tracking per task
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS gate_status JSONB DEFAULT '{
  "build_check":      {"status": "pending", "attempts": 0, "max_attempts": 3, "last_error": null, "passed_at": null},
  "deploy_check":     {"status": "pending", "attempts": 0, "max_attempts": 3, "last_error": null, "passed_at": null},
  "perception_check": {"status": "pending", "attempts": 0, "max_attempts": 3, "last_error": null, "passed_at": null},
  "human_checkpoint": {"status": "pending", "attempts": 0, "max_attempts": 1, "last_error": null, "passed_at": null}
}'::jsonb;

-- 5. Verification log (immutable audit trail — works across all projects)
CREATE TABLE IF NOT EXISTS task_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id),
  gate TEXT NOT NULL CHECK (gate IN ('build_check', 'deploy_check', 'perception_check', 'human_checkpoint')),
  attempt_number INT NOT NULL DEFAULT 1,
  verified_by TEXT NOT NULL,                    -- 'ATHENA', 'PROMETHEUS', 'Juan', 'GitHub Actions'
  status TEXT NOT NULL CHECK (status IN ('pass', 'fail', 'auto_fix_attempted', 'escalated')),
  
  summary TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  criteria_results JSONB DEFAULT '[]',
  
  auto_fix_action TEXT,
  auto_fix_result TEXT,
  escalation_context TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_verifications_task ON task_verifications(task_id, gate, created_at);
CREATE INDEX idx_verifications_project ON task_verifications(project_id, created_at);

-- 6. Enforce valid status transitions
CREATE OR REPLACE FUNCTION enforce_task_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  allowed_transitions JSONB := '{
    "inbox":              ["assigned"],
    "assigned":           ["in_progress", "inbox"],
    "in_progress":        ["build_check"],
    "build_check":        ["deploy_check", "auto_fix", "escalated"],
    "deploy_check":       ["perception_check", "auto_fix", "escalated"],
    "perception_check":   ["human_checkpoint", "auto_fix", "escalated"],
    "human_checkpoint":   ["done", "rejected"],
    "auto_fix":           ["build_check", "deploy_check", "perception_check", "escalated"],
    "escalated":          ["in_progress", "assigned"],
    "rejected":           ["in_progress"],
    "done":               []
  }'::jsonb;
  allowed JSONB;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  
  allowed := allowed_transitions -> OLD.status;
  
  IF NOT allowed ? NEW.status THEN
    RAISE EXCEPTION 'Invalid transition: % → %. Allowed: %', OLD.status, NEW.status, allowed;
  END IF;
  
  IF NEW.status = 'build_check' AND (
    NEW.acceptance_criteria IS NULL OR NEW.acceptance_criteria = '[]'::jsonb
  ) THEN
    RAISE EXCEPTION 'Cannot enter verification without acceptance criteria';
  END IF;
  
  IF NEW.status = 'done' THEN
    IF (NEW.gate_status->'build_check'->>'status') != 'passed' OR
       (NEW.gate_status->'deploy_check'->>'status') != 'passed' OR
       (NEW.gate_status->'perception_check'->>'status') != 'passed' OR
       (NEW.gate_status->'human_checkpoint'->>'status') != 'passed'
    THEN
      RAISE EXCEPTION 'Cannot mark done — not all gates passed: %', NEW.gate_status;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_status_transition ON tasks;
CREATE TRIGGER enforce_status_transition
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION enforce_task_status_transition();

-- 7. Auto-trigger verification engine on gate entry
CREATE OR REPLACE FUNCTION trigger_verification_gate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('build_check', 'deploy_check', 'perception_check') 
     AND OLD.status != NEW.status THEN
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/run-verification-gate',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'task_id', NEW.id,
        'project_id', NEW.project_id,
        'gate', NEW.status,
        'attempt', (NEW.gate_status->NEW.status->>'attempts')::int + 1,
        'acceptance_criteria', NEW.acceptance_criteria
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_gate ON tasks;
CREATE TRIGGER trigger_gate
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_verification_gate();

-- 8. Seed project configs
INSERT INTO projects (id, name, config) VALUES
('olymp', 'OLYMP', '{
  "repo": "aicallyu/olympus",
  "stack": {
    "framework": "vite-react-ts",
    "build_command": "npm run build",
    "typecheck_command": "npx tsc --noEmit",
    "lint_command": "npx eslint src/ --quiet",
    "node_version": "22"
  },
  "deployment": {
    "platform": "netlify",
    "live_url": "https://olymp.onioko.com",
    "env_vars_required": ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"],
    "deploy_branch": "main"
  },
  "backend": {
    "platform": "supabase",
    "project_ref": "mfpyyriilflviojnqhuv",
    "edge_functions": true
  },
  "agents": {
    "primary_dev": "ATLAS",
    "backend_dev": "HERCULOS",
    "infra": "ARGOS",
    "qa": "ATHENA",
    "perception": "PROMETHEUS",
    "comms": "HERMES"
  },
  "notifications": {
    "escalation_channel": "whatsapp",
    "escalation_contact": "Juan"
  }
}'::jsonb)
ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config;

INSERT INTO projects (id, name, config) VALUES
('devstackx', 'DevStackX', '{
  "repo": "aicallyu/devstackx",
  "stack": {
    "framework": "vite-react-ts",
    "build_command": "npm run build",
    "typecheck_command": "npx tsc --noEmit",
    "lint_command": "npx eslint src/ --quiet",
    "node_version": "22"
  },
  "deployment": {
    "platform": "netlify",
    "live_url": "https://devstackx.onioko.com",
    "env_vars_required": ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"],
    "deploy_branch": "main"
  },
  "agents": {
    "primary_dev": "ATLAS",
    "backend_dev": "HERCULOS",
    "infra": "ARGOS",
    "qa": "ATHENA",
    "perception": "PROMETHEUS",
    "comms": "HERMES"
  }
}'::jsonb)
ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config;

INSERT INTO projects (id, name, config) VALUES
('onioko-app', 'Onioko / Silent Oculus', '{
  "repo": "aicallyu/onioko",
  "stack": {
    "framework": "vite-react-ts",
    "build_command": "npm run build",
    "typecheck_command": "npx tsc --noEmit",
    "lint_command": "npx eslint src/ --quiet",
    "node_version": "22"
  },
  "deployment": {
    "platform": "netlify",
    "live_url": "https://app.onioko.com",
    "env_vars_required": ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"],
    "deploy_branch": "main"
  },
  "agents": {
    "primary_dev": "ATLAS",
    "backend_dev": "HERCULOS",
    "infra": "ARGOS",
    "qa": "ATHENA",
    "perception": "PROMETHEUS",
    "comms": "HERMES"
  }
}'::jsonb)
ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config;
```

---

## PROMETHEUS — The Perception Service

Runs on Elestio VPS. Project-agnostic — receives a URL and criteria, returns evidence.

### Service Setup

```
Technology: Node.js + Playwright + Hono (lightweight HTTP framework)
Port: 3033
Location: Elestio VPS
Process manager: pm2 (survives restart)
```

### Endpoints

```
POST /verify-criteria
  Input: {
    project_id: "olymp",
    url: "https://olymp.onioko.com/war-room",
    criteria: [
      {
        id: "ac-001",
        criterion: "Start button opens participant modal",
        test_selector: "#start-war-room-btn",
        test_action: "click",
        expected_result: ".participant-modal is visible"
      }
    ]
  }
  Output: {
    results: [...],         // per-criterion pass/fail with screenshots
    overall: "pass" | "fail",
    summary: "5/6 passed. Failing: #ac-003 — no element found for selector",
    console_errors: [...],
    network_errors: [...]
  }

POST /health-check
  Input: { project_id: "olymp" }
  Uses project config to get URL, checks page loads, captures errors.
  
POST /deploy-diff
  Input: { 
    project_id: "olymp",
    expected_elements: ["#war-room-nav", ".task-list"],
    expected_routes: ["/", "/tasks", "/war-room"]
  }
  Navigates all routes, checks all elements exist, reports missing.
```

### Scheduled Health Checks

Every 30 minutes per active project:
1. Load project config → get live URL
2. Navigate, capture screenshot, check for console errors
3. If errors found → create alert task in OLYMP automatically
4. Alert includes: what broke, when it last worked, screenshot, console log

This catches regressions nobody triggered — bad merge, expired API key, Supabase downtime.

---

## Build Guard — Git Hooks & CI

Same hooks, configured per project from the project config.

### Pre-Push Hook (per repo)

File: `.githooks/pre-push` (installed via `npm run prepare`)

```bash
#!/bin/bash
set -e

echo "🔒 Quality Gate: Pre-push checks..."

# Read commands from package.json or use defaults
BUILD_CMD="${QUALITY_GATE_BUILD_CMD:-npm run build}"
TYPECHECK_CMD="${QUALITY_GATE_TYPECHECK_CMD:-npx tsc --noEmit}"

echo "→ TypeScript..."
eval $TYPECHECK_CMD || { echo "❌ TypeScript errors. Push blocked."; exit 1; }

echo "→ Build..."
eval $BUILD_CMD || { echo "❌ Build failed. Push blocked."; exit 1; }

echo "✅ All checks passed."
```

### GitHub Action (per repo)

File: `.github/workflows/quality-gate.yml`

```yaml
name: Quality Gate

on:
  push:
    branches: [main, 'feature/**']
  pull_request:
    branches: [main]

jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run build
      
      - name: Notify Verification Engine
        if: github.ref == 'refs/heads/main' && success()
        run: |
          curl -X POST "${{ secrets.SUPABASE_URL }}/functions/v1/post-deploy-check" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"project_id": "${{ vars.PROJECT_ID }}", "commit": "${{ github.sha }}"}'
```

`PROJECT_ID` is set as a GitHub repo variable — `olymp`, `devstackx`, or `onioko-app`. Same workflow file, different project.

---

## Notification Chain

Every event produces a notification. Nothing happens silently.

```
INFO       → Dashboard log only
             "Task X entered build_check."

WARNING    → Dashboard + badge
             "Build failed (attempt 1/3). ATLAS auto-fixing."

ESCALATION → Dashboard banner + WhatsApp
             "Task X failed 3 times. Needs your decision."
             Includes: what failed, what was tried, screenshots, options.

PROD ALERT → WhatsApp immediately + dashboard alert
             "olymp.onioko.com throwing errors. Screenshot attached."
```

Notifications include the project name, so Juan always knows which project is talking.

---

## Acceptance Criteria Templates

Pre-populated per task type. Same templates apply to all projects.

### Frontend Feature
```json
[
  {"id": "fe-01", "criterion": "Component renders without console errors", "type": "browser_test"},
  {"id": "fe-02", "criterion": "All interactive elements have working handlers", "type": "browser_test"},
  {"id": "fe-03", "criterion": "Database queries execute successfully", "type": "browser_test"},
  {"id": "fe-04", "criterion": "UI matches spec/mockup", "type": "browser_test"},
  {"id": "fe-05", "criterion": "TypeScript strict: zero errors", "type": "build_check"},
  {"id": "fe-06", "criterion": "Build completes without warnings", "type": "build_check"}
]
```

### Backend / Edge Function
```json
[
  {"id": "be-01", "criterion": "Function deploys without errors", "type": "code_check"},
  {"id": "be-02", "criterion": "Function responds correctly to test request", "type": "browser_test"},
  {"id": "be-03", "criterion": "Error cases return proper messages", "type": "code_check"},
  {"id": "be-04", "criterion": "All secrets/env vars configured", "type": "code_check"},
  {"id": "be-05", "criterion": "Database trigger fires on relevant event", "type": "browser_test"}
]
```

### Deployment
```json
[
  {"id": "dep-01", "criterion": "Build succeeds locally", "type": "build_check"},
  {"id": "dep-02", "criterion": "Live URL loads without errors", "type": "browser_test"},
  {"id": "dep-03", "criterion": "Environment variables set on platform", "type": "code_check"},
  {"id": "dep-04", "criterion": "All routes accessible (no 404s)", "type": "browser_test"},
  {"id": "dep-05", "criterion": "No broken assets or missing resources", "type": "browser_test"},
  {"id": "dep-06", "criterion": "Live state matches expected state", "type": "browser_test"}
]
```

---

## Frontend Components (in OLYMP)

### Task Pipeline View
Visual representation of where a task is in the chain. Shows all 4 gates with status, attempt count, and evidence. Clickable for details.

### Verification History Timeline
Chronological log of every verification event. Shows: what happened, who did it, pass/fail, screenshots, auto-fix attempts.

### Human Checkpoint Panel
Full decision panel when a task reaches Gate 4. Shows all criteria results, all screenshots, git diff, verification history. Two actions: Approve → Done, Reject → back with notes.

### Escalation Panel
When auto-fix exhausts. Shows: what failed, what was tried (all attempts), what still fails, suggested actions. Multiple resolution paths — never a dead end.

### Project Switcher
Top-level selector: which project's tasks are you viewing? Same UI, different project config. Tasks from all projects can also be viewed in a unified feed.

---

## Implementation Order

### Phase 1: Database & Core (Week 1)
1. Read existing OLYMP codebase — understand current models
2. Run SQL migration — projects table, updated task statuses, gate_status, verifications
3. Seed project configs (OLYMP, DevStackX, Onioko)
4. Fix existing Task Creation button (current blocker)
5. Add acceptance criteria to task form (required field with templates)

### Phase 2: Build Guard (Week 1)
6. Create `.githooks/pre-push` for OLYMP repo
7. Create `.github/workflows/quality-gate.yml`
8. Add `npm run prepare` hook for auto-setup on clone
9. Copy same hooks to DevStackX and Onioko repos

### Phase 3: Verification Engine (Week 2)
10. Create Edge Function: `run-verification-gate` (chain brain)
11. Create Edge Function: `post-deploy-check` (webhook handler)
12. Create Edge Function: `send-notification` (notification router)
13. Configure Netlify deploy webhook → post-deploy-check

### Phase 4: PROMETHEUS (Week 2)
14. Set up Playwright service on Elestio VPS
15. Implement `/verify-criteria` endpoint
16. Implement `/health-check` endpoint
17. Implement `/deploy-diff` endpoint
18. Set up 30-min scheduled health check cron for all active projects

### Phase 5: Frontend (Week 3)
19. TaskPipelineView component
20. VerificationHistory component
21. HumanCheckpointPanel component
22. EscalationPanel component
23. ProjectSwitcher component

### Phase 6: Proof — War Room Through The Pipeline (Week 3)
24. Create "Fix War Room" task with 10 acceptance criteria
25. Run it through the entire chain
26. Verify: build gate catches errors, auto-fix works, PROMETHEUS tests live URL
27. Juan approves at human checkpoint
28. War Room is live — AND the system is proven

---

## What "Done" Looks Like

- Every project (OLYMP, DevStackX, Onioko) is registered with a config
- No code reaches `main` without passing build + typecheck
- No deploy goes live without automated verification
- No feature is "done" without PROMETHEUS testing the live URL
- No task reaches "done" without Juan's approval
- Failed gates trigger auto-fix (up to 3x) before escalating
- Escalations arrive with full context and concrete action options
- Nothing silently blocks — every state change notifies
- PROMETHEUS monitors all live URLs every 30 minutes
- The War Room is the first feature shipped through this system
- Adding a new project = adding a JSON config. Same standards, same chain.
