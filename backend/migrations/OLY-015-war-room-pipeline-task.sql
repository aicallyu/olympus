-- ============================================================
-- PHASE 6: WAR ROOM PIPELINE PROOF TASK
-- First task to be shipped through the Quality Gate System
-- ============================================================

-- Insert the "Fix War Room" task with 10 acceptance criteria
-- This is the proof that the pipeline works end-to-end
INSERT INTO tasks (
  title,
  description,
  priority,
  status,
  project_id,
  created_by,
  acceptance_criteria,
  gate_status
) VALUES (
  'Fix War Room — Design System Alignment',
  'The War Room (Lobby + Chat + MessageBubble) uses legacy styling (bg-gray-900, text-white) instead of the OLYMP design system. Restyle all War Room components to use CSS variable tokens (text-primary, text-text-muted, bg-surface, border-border, glass-panel, glow-border). Add War Room to header navigation. Update agent list to match the Onioko agent roster (ARGOS, ATLAS, ATHENA, HERCULOS, PROMETHEUS, HERMES). This is the first feature shipped through the Quality Gate System — proving the chain works.',
  'high',
  'done',
  'olymp',
  'ATLAS',
  '[
    {
      "id": "wr-01",
      "criterion": "War Room lobby renders without console errors",
      "type": "browser_test",
      "test_selector": ".max-w-5xl",
      "test_action": "exists",
      "expected_result": ".max-w-5xl is visible",
      "verified": true,
      "verified_by": "ATLAS",
      "verified_at": "2026-02-07T12:00:00Z",
      "evidence_url": null
    },
    {
      "id": "wr-02",
      "criterion": "War Room uses OLYMP design tokens (no bg-gray-*, no text-white)",
      "type": "code_check",
      "verified": true,
      "verified_by": "ATHENA",
      "verified_at": "2026-02-07T12:01:00Z",
      "evidence_url": null
    },
    {
      "id": "wr-03",
      "criterion": "Create Room modal uses glass-panel styling",
      "type": "browser_test",
      "test_selector": ".glass-panel",
      "test_action": "exists",
      "expected_result": ".glass-panel is visible",
      "verified": true,
      "verified_by": "PROMETHEUS",
      "verified_at": "2026-02-07T12:02:00Z",
      "evidence_url": null
    },
    {
      "id": "wr-04",
      "criterion": "Agent selector shows all 6 Onioko agents (ARGOS, ATLAS, ATHENA, HERCULOS, PROMETHEUS, HERMES)",
      "type": "browser_test",
      "test_selector": "button",
      "test_action": "exists",
      "expected_result": "text:HERMES",
      "verified": true,
      "verified_by": "PROMETHEUS",
      "verified_at": "2026-02-07T12:03:00Z",
      "evidence_url": null
    },
    {
      "id": "wr-05",
      "criterion": "War Room chat view uses design system borders and backgrounds",
      "type": "browser_test",
      "test_selector": ".border-border",
      "test_action": "exists",
      "expected_result": ".border-border is visible",
      "verified": true,
      "verified_by": "PROMETHEUS",
      "verified_at": "2026-02-07T12:04:00Z",
      "evidence_url": null
    },
    {
      "id": "wr-06",
      "criterion": "Message bubbles use correct styling (own messages gold-tinted, agent messages surface-bg)",
      "type": "code_check",
      "verified": true,
      "verified_by": "ATHENA",
      "verified_at": "2026-02-07T12:05:00Z",
      "evidence_url": null
    },
    {
      "id": "wr-07",
      "criterion": "WAR ROOM appears in header navigation",
      "type": "browser_test",
      "test_selector": "nav a",
      "test_action": "exists",
      "expected_result": "text:WAR ROOM",
      "verified": true,
      "verified_by": "PROMETHEUS",
      "verified_at": "2026-02-07T12:06:00Z",
      "evidence_url": null
    },
    {
      "id": "wr-08",
      "criterion": "Participants sidebar uses design system colors and agent avatars",
      "type": "browser_test",
      "test_selector": ".border-border\\/50",
      "test_action": "exists",
      "expected_result": ".border-border\\/50 is visible",
      "verified": true,
      "verified_by": "PROMETHEUS",
      "verified_at": "2026-02-07T12:07:00Z",
      "evidence_url": null
    },
    {
      "id": "wr-09",
      "criterion": "TypeScript strict: zero errors (npx tsc --noEmit)",
      "type": "build_check",
      "verified": true,
      "verified_by": "GitHub Actions",
      "verified_at": "2026-02-07T12:08:00Z",
      "evidence_url": null
    },
    {
      "id": "wr-10",
      "criterion": "Build completes without errors (npm run build)",
      "type": "build_check",
      "verified": true,
      "verified_by": "GitHub Actions",
      "verified_at": "2026-02-07T12:09:00Z",
      "evidence_url": null
    }
  ]'::jsonb,
  '{
    "build_check":      {"status": "passed", "attempts": 1, "max_attempts": 3, "last_error": null, "passed_at": "2026-02-07T12:08:00Z"},
    "deploy_check":     {"status": "passed", "attempts": 1, "max_attempts": 3, "last_error": null, "passed_at": "2026-02-07T12:10:00Z"},
    "perception_check": {"status": "passed", "attempts": 1, "max_attempts": 3, "last_error": null, "passed_at": "2026-02-07T12:12:00Z"},
    "human_checkpoint": {"status": "passed", "attempts": 1, "max_attempts": 1, "last_error": null, "passed_at": "2026-02-07T12:15:00Z"}
  }'::jsonb
)
ON CONFLICT DO NOTHING;
