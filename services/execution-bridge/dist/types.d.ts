export type ExecutionType = 'code_commit' | 'db_migration' | 'edge_function' | 'shell_command';
export type ExecutionStatus = 'pending' | 'processing' | 'success' | 'failed' | 'rejected';
export interface FileAction {
    path: string;
    content: string;
    action: 'create' | 'update' | 'delete';
}
export interface CodeCommitPayload {
    files: FileAction[];
    branch: string;
    commit_message: string;
    base_branch?: string;
}
export interface DbMigrationPayload {
    sql: string;
    description: string;
}
export interface EdgeFunctionPayload {
    function_name: string;
    files: {
        path: string;
        content: string;
    }[];
}
export interface ExecutionQueueItem {
    id: string;
    task_id: string | null;
    room_id: string;
    message_id: string | null;
    requested_by: string;
    execution_type: ExecutionType;
    payload: CodeCommitPayload | DbMigrationPayload | EdgeFunctionPayload;
    status: ExecutionStatus;
    result: Record<string, unknown>;
    attempts: number;
    max_attempts: number;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
}
export interface ExecutionResult {
    success: boolean;
    commit_sha?: string;
    branch?: string;
    deploy_url?: string;
    error?: string;
    stdout?: string;
    stderr?: string;
    executed_at: string;
}
export interface BridgeConfig {
    supabaseUrl: string;
    supabaseServiceKey: string;
    repoPath: string;
    pollIntervalMs: number;
    allowedExecutionTypes: ExecutionType[];
    maxFileSizeBytes: number;
    blockedPaths: string[];
}
