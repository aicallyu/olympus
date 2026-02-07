-- Migration: OLY-014 Quality Gate System
-- Created: 2026-02-07
-- Description: Project registry, updated task statuses, gate tracking,
--              verification log, and status transition enforcement.
-- Source: docs/ONIOKO-QUALITY-GATE-SYSTEM.md

-- ============================================================
-- 1. Project registry
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY projects_read_all ON projects FOR SELECT USING (true);

-- ============================================================
-- 2. Link tasks to projects
-- ============================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id TEXT REFERENCES projects(id) DEFAULT 'olymp';

-- ============================================================
-- 3. Expand allowed task statuses
--    Keeps legacy 'review' and 'blocked' so existing rows don't
--    violate the constraint.  They can transition into the new
--    statuses via the trigger below.
-- ============================================================
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
    'rejected',
    -- legacy (kept for backward-compat with existing data)
    'review',
    'blocked'
  ));

-- ============================================================
-- 4. Acceptance criteria (required for every task beyond inbox)
-- ============================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS acceptance_criteria JSONB DEFAULT '[]';

-- ============================================================
-- 5. Gate tracking per task
-- ============================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS gate_status JSONB DEFAULT '{
  "build_check":      {"status": "pending", "attempts": 0, "max_attempts": 3, "last_error": null, "passed_at": null},
  "deploy_check":     {"status": "pending", "attempts": 0, "max_attempts": 3, "last_error": null, "passed_at": null},
  "perception_check": {"status": "pending", "attempts": 0, "max_attempts": 3, "last_error": null, "passed_at": null},
  "human_checkpoint": {"status": "pending", "attempts": 0, "max_attempts": 1, "last_error": null, "passed_at": null}
}'::jsonb;

-- ============================================================
-- 6. Verification log (immutable audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS task_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id),
  gate TEXT NOT NULL CHECK (gate IN ('build_check', 'deploy_check', 'perception_check', 'human_checkpoint')),
  attempt_number INT NOT NULL DEFAULT 1,
  verified_by TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pass', 'fail', 'auto_fix_attempted', 'escalated')),

  summary TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  criteria_results JSONB DEFAULT '[]',

  auto_fix_action TEXT,
  auto_fix_result TEXT,
  escalation_context TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verifications_task ON task_verifications(task_id, gate, created_at);
CREATE INDEX IF NOT EXISTS idx_verifications_project ON task_verifications(project_id, created_at);

ALTER TABLE task_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY task_verifications_read_all ON task_verifications FOR SELECT USING (true);

-- ============================================================
-- 7. Status transition enforcement
--    Includes legacy statuses so existing tasks can migrate
--    into the new pipeline.
-- ============================================================
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
    "done":               [],
    "review":             ["done", "in_progress", "build_check", "blocked"],
    "blocked":            ["inbox", "assigned", "in_progress"]
  }'::jsonb;
  allowed JSONB;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  allowed := allowed_transitions -> OLD.status;

  IF NOT allowed ? NEW.status THEN
    RAISE EXCEPTION 'Invalid transition: % -> %. Allowed: %', OLD.status, NEW.status, allowed;
  END IF;

  IF NEW.status = 'build_check' AND (
    NEW.acceptance_criteria IS NULL OR NEW.acceptance_criteria = '[]'::jsonb
  ) THEN
    RAISE EXCEPTION 'Cannot enter verification without acceptance criteria';
  END IF;

  IF NEW.status = 'done' THEN
    -- Only enforce gate checks for tasks that entered the new pipeline
    IF NEW.gate_status IS NOT NULL
       AND NEW.gate_status != '{}'::jsonb
       AND (NEW.gate_status->'build_check'->>'status') IS NOT NULL
    THEN
      IF (NEW.gate_status->'build_check'->>'status') != 'passed' OR
         (NEW.gate_status->'deploy_check'->>'status') != 'passed' OR
         (NEW.gate_status->'perception_check'->>'status') != 'passed' OR
         (NEW.gate_status->'human_checkpoint'->>'status') != 'passed'
      THEN
        RAISE EXCEPTION 'Cannot mark done - not all gates passed: %', NEW.gate_status;
      END IF;
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

-- ============================================================
-- 8. Seed project configs
-- ============================================================
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
    "platform": "vercel",
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
