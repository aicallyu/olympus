import type { AcceptanceCriterion, TaskType } from '@/hooks/useOlympusStore'

const frontendTemplate: AcceptanceCriterion[] = [
  { id: 'fe-01', criterion: 'Component renders without console errors', type: 'browser_test', verified: false, verified_by: null, verified_at: null, evidence_url: null },
  { id: 'fe-02', criterion: 'All interactive elements have working handlers', type: 'browser_test', verified: false, verified_by: null, verified_at: null, evidence_url: null },
  { id: 'fe-03', criterion: 'Database queries execute successfully', type: 'browser_test', verified: false, verified_by: null, verified_at: null, evidence_url: null },
  { id: 'fe-04', criterion: 'UI matches spec/mockup', type: 'browser_test', verified: false, verified_by: null, verified_at: null, evidence_url: null },
  { id: 'fe-05', criterion: 'TypeScript strict: zero errors', type: 'build_check', verified: false, verified_by: null, verified_at: null, evidence_url: null },
  { id: 'fe-06', criterion: 'Build completes without warnings', type: 'build_check', verified: false, verified_by: null, verified_at: null, evidence_url: null },
]

const backendTemplate: AcceptanceCriterion[] = [
  { id: 'be-01', criterion: 'Function deploys without errors', type: 'code_check', verified: false, verified_by: null, verified_at: null, evidence_url: null },
  { id: 'be-02', criterion: 'Function responds correctly to test request', type: 'browser_test', verified: false, verified_by: null, verified_at: null, evidence_url: null },
  { id: 'be-03', criterion: 'Error cases return proper messages', type: 'code_check', verified: false, verified_by: null, verified_at: null, evidence_url: null },
  { id: 'be-04', criterion: 'All secrets/env vars configured', type: 'code_check', verified: false, verified_by: null, verified_at: null, evidence_url: null },
  { id: 'be-05', criterion: 'Database trigger fires on relevant event', type: 'browser_test', verified: false, verified_by: null, verified_at: null, evidence_url: null },
]

const deploymentTemplate: AcceptanceCriterion[] = [
  { id: 'dep-01', criterion: 'Build succeeds locally', type: 'build_check', verified: false, verified_by: null, verified_at: null, evidence_url: null },
  { id: 'dep-02', criterion: 'Live URL loads without errors', type: 'browser_test', verified: false, verified_by: null, verified_at: null, evidence_url: null },
  { id: 'dep-03', criterion: 'Environment variables set on platform', type: 'code_check', verified: false, verified_by: null, verified_at: null, evidence_url: null },
  { id: 'dep-04', criterion: 'All routes accessible (no 404s)', type: 'browser_test', verified: false, verified_by: null, verified_at: null, evidence_url: null },
  { id: 'dep-05', criterion: 'No broken assets or missing resources', type: 'browser_test', verified: false, verified_by: null, verified_at: null, evidence_url: null },
  { id: 'dep-06', criterion: 'Live state matches expected state', type: 'browser_test', verified: false, verified_by: null, verified_at: null, evidence_url: null },
]

export const ACCEPTANCE_TEMPLATES: Record<TaskType, AcceptanceCriterion[]> = {
  frontend: frontendTemplate,
  backend: backendTemplate,
  deployment: deploymentTemplate,
}

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  frontend: 'Frontend Feature',
  backend: 'Backend / Edge Function',
  deployment: 'Deployment',
}
