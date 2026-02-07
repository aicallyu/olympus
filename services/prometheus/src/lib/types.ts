export interface AcceptanceCriterion {
  id: string;
  criterion: string;
  type: string;
  test_selector?: string;
  test_action?: string;
  expected_result?: string;
}

export interface CriterionResult {
  id: string;
  criterion: string;
  passed: boolean;
  message: string;
  screenshot_before?: string;
  screenshot_after?: string;
  duration_ms: number;
}

export interface VerifyCriteriaRequest {
  project_id: string;
  url: string;
  criteria: AcceptanceCriterion[];
}

export interface VerifyCriteriaResponse {
  results: CriterionResult[];
  overall: "pass" | "fail";
  summary: string;
  console_errors: string[];
  network_errors: string[];
}

export interface HealthCheckRequest {
  project_id: string;
}

export interface HealthCheckResponse {
  project_id: string;
  url: string;
  status: "healthy" | "unhealthy";
  page_loaded: boolean;
  status_code: number | null;
  console_errors: string[];
  network_errors: string[];
  screenshot?: string;
  checked_at: string;
}

export interface DeployDiffRequest {
  project_id: string;
  expected_elements: string[];
  expected_routes: string[];
}

export interface DeployDiffResponse {
  project_id: string;
  url: string;
  missing_elements: string[];
  missing_routes: string[];
  found_elements: string[];
  found_routes: string[];
  console_errors: string[];
  screenshot?: string;
}

export interface ProjectConfig {
  repo: string;
  stack: {
    framework: string;
    build_command: string;
    typecheck_command: string;
    lint_command: string;
    node_version: string;
  };
  deployment: {
    platform: string;
    live_url: string;
    env_vars_required: string[];
    deploy_branch: string;
  };
  agents: Record<string, string>;
  notifications?: {
    escalation_channel?: string;
    escalation_contact?: string;
  };
}

export interface Project {
  id: string;
  name: string;
  config: ProjectConfig;
  is_active: boolean;
}
