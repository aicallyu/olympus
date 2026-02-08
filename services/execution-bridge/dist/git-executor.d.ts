import type { CodeCommitPayload, ExecutionResult } from './types.js';
export declare class GitExecutor {
    private git;
    private repoPath;
    constructor();
    /**
     * Ensure the repo is in a clean state and up to date
     */
    private prepareRepo;
    /**
     * Execute a code_commit payload
     */
    executeCodeCommit(payload: CodeCommitPayload): Promise<ExecutionResult>;
}
