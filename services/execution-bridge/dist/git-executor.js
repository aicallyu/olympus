// ============================================================
// OLYMP Execution Bridge — Git Executor
// Handles: checkout branch, write files, commit, push
// ============================================================
import { simpleGit } from 'simple-git';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { dirname, join } from 'path';
import { config } from './config.js';
export class GitExecutor {
    git;
    repoPath;
    constructor() {
        this.repoPath = config.repoPath;
        this.git = simpleGit(this.repoPath);
    }
    /**
     * Ensure the repo is in a clean state and up to date
     */
    async prepareRepo() {
        // Fetch latest
        await this.git.fetch('origin');
        // Check for uncommitted changes
        const status = await this.git.status();
        if (status.files.length > 0) {
            // Stash any existing changes
            await this.git.stash();
            console.log('[GitExecutor] Stashed existing changes');
        }
    }
    /**
     * Execute a code_commit payload
     */
    async executeCodeCommit(payload) {
        const baseBranch = payload.base_branch || 'main';
        const startTime = new Date().toISOString();
        try {
            await this.prepareRepo();
            // Checkout base branch and pull latest
            await this.git.checkout(baseBranch);
            await this.git.pull('origin', baseBranch);
            // Create or checkout feature branch
            const branches = await this.git.branchLocal();
            if (branches.all.includes(payload.branch)) {
                await this.git.checkout(payload.branch);
                // Rebase onto latest base
                await this.git.rebase([baseBranch]);
            }
            else {
                await this.git.checkoutLocalBranch(payload.branch);
            }
            // Apply file changes
            for (const file of payload.files) {
                const fullPath = join(this.repoPath, file.path);
                switch (file.action) {
                    case 'create':
                    case 'update':
                        // Ensure directory exists
                        await mkdir(dirname(fullPath), { recursive: true });
                        await writeFile(fullPath, file.content, 'utf-8');
                        await this.git.add(file.path);
                        console.log(`[GitExecutor] ${file.action}: ${file.path}`);
                        break;
                    case 'delete':
                        try {
                            await unlink(fullPath);
                            await this.git.rm(file.path);
                            console.log(`[GitExecutor] delete: ${file.path}`);
                        }
                        catch {
                            console.warn(`[GitExecutor] File not found for deletion: ${file.path}`);
                        }
                        break;
                }
            }
            // Commit
            const commitResult = await this.git.commit(`${payload.commit_message}\n\n[OLYMP Execution Bridge] Auto-committed from War Room`);
            if (!commitResult.commit) {
                return {
                    success: false,
                    error: 'Nothing to commit — files may be identical to existing content',
                    executed_at: startTime,
                };
            }
            // Push
            await this.git.push('origin', payload.branch, ['--set-upstream']);
            console.log(`[GitExecutor] Pushed ${commitResult.commit} to ${payload.branch}`);
            return {
                success: true,
                commit_sha: commitResult.commit,
                branch: payload.branch,
                deploy_url: payload.branch === 'main' ? 'https://olymp.onioko.com' : undefined,
                executed_at: startTime,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[GitExecutor] Failed:`, errorMessage);
            // Try to clean up — go back to main
            try {
                await this.git.checkout(baseBranch);
            }
            catch {
                // If cleanup fails too, we have bigger problems
            }
            return {
                success: false,
                error: errorMessage,
                executed_at: startTime,
            };
        }
    }
}
//# sourceMappingURL=git-executor.js.map